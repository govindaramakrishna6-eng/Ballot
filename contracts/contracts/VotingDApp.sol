// SPDX-License-Identifier: MIT
pragma solidity ^0.8.38;

/// @title VotingDApp — on-chain polls where every vote is publicly provable
/// @notice Anyone can create a poll; each wallet can vote once per poll before its deadline.
/// @dev This contract makes NO external calls (no token transfers, no callbacks, no ETH sends),
///      so there is no reentrancy surface. It has no receive/fallback and nothing is payable,
///      so plain ETH transfers are rejected by the EVM.
contract VotingDApp {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// @notice Everything stored about one poll.
    /// @dev Returned whole by the view functions so the frontend needs one call per poll.
    struct Poll {
        uint256 id;
        address creator;
        string title;
        string description;
        string[] options;
        uint256[] voteCounts;
        uint64 createdAt;
        uint64 endTime;
        uint256 totalVotes;
        bool cancelled;
    }

    // ---------------------------------------------------------------------
    // Limits (bytes, not characters — UTF-8 text like Tamil or emoji uses several bytes per char)
    // ---------------------------------------------------------------------

    /// @notice Maximum title length in bytes.
    uint256 public constant MAX_TITLE_BYTES = 120;
    /// @notice Maximum description length in bytes (description may be empty).
    uint256 public constant MAX_DESCRIPTION_BYTES = 500;
    /// @notice Maximum length of each option in bytes.
    uint256 public constant MAX_OPTION_BYTES = 60;
    /// @notice Minimum number of options in a poll.
    uint256 public constant MIN_OPTIONS = 2;
    /// @notice Maximum number of options in a poll (keeps duplicate checks and gas bounded).
    uint256 public constant MAX_OPTIONS = 10;
    /// @notice Shortest allowed poll: endTime must be at least this far after creation.
    uint256 public constant MIN_DURATION = 5 minutes;
    /// @notice Longest allowed poll: endTime must be at most this far after creation.
    uint256 public constant MAX_DURATION = 30 days;
    /// @notice Most polls returned by one getPollsPage call (keeps view calls under RPC limits).
    uint256 public constant MAX_PAGE_SIZE = 50;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @notice Number of polls ever created; also the id of the newest poll.
    /// @dev Ids start at 1, so a poll id of 0 is never valid (avoids default-value bugs).
    uint256 public pollCount;

    /// @dev pollId => Poll. Private because the auto-generated getter cannot return arrays;
    ///      use getPoll / getPollsPage instead.
    mapping(uint256 => Poll) private polls;

    /// @dev pollId => voter => (optionIndex + 1). Storing +1 lets the mapping's default 0 mean
    ///      "has not voted", so a vote for option 0 is distinguishable from no vote.
    mapping(uint256 => mapping(address => uint256)) private votedOption;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    /// @notice A new poll was created.
    /// @param pollId The new poll's id.
    /// @param creator The address that created it.
    /// @param endTime Unix time (seconds) after which voting is closed.
    event PollCreated(uint256 indexed pollId, address indexed creator, uint64 endTime);

    /// @notice A vote was cast. This log is the public, permanent proof of the vote.
    /// @param pollId The poll voted in.
    /// @param voter The voting address.
    /// @param optionIndex Zero-based index of the chosen option.
    event Voted(uint256 indexed pollId, address indexed voter, uint256 optionIndex);

    /// @notice A poll was cancelled by its creator before receiving any votes.
    /// @param pollId The cancelled poll's id.
    event PollCancelled(uint256 indexed pollId);

    // ---------------------------------------------------------------------
    // Errors (custom errors are cheaper than strings and decodable by the frontend)
    // ---------------------------------------------------------------------

    /// @notice No poll exists with this id (0, or greater than pollCount).
    error PollNotFound(uint256 pollId);
    /// @notice The poll was cancelled by its creator.
    error PollIsCancelled(uint256 pollId);
    /// @notice The poll's deadline has passed.
    error PollEnded(uint256 pollId);
    /// @notice optionIndex is not one of the poll's options.
    error InvalidOption(uint256 pollId, uint256 optionIndex);
    /// @notice This address has already voted in this poll.
    error AlreadyVoted(uint256 pollId, address voter);
    /// @notice Title is empty or longer than MAX_TITLE_BYTES.
    error InvalidTitle();
    /// @notice Description is longer than MAX_DESCRIPTION_BYTES.
    error InvalidDescription();
    /// @notice Fewer than MIN_OPTIONS or more than MAX_OPTIONS options.
    error InvalidOptionCount();
    /// @notice The option at `index` is an empty string.
    error EmptyOption(uint256 index);
    /// @notice The option at `index` is longer than MAX_OPTION_BYTES.
    error OptionTooLong(uint256 index);
    /// @notice Options at `indexA` and `indexB` are byte-for-byte identical.
    error DuplicateOption(uint256 indexA, uint256 indexB);
    /// @notice endTime is not between MIN_DURATION and MAX_DURATION from now.
    error InvalidEndTime();
    /// @notice Only the poll's creator may do this.
    error NotCreator();
    /// @notice The poll already has votes, so it can no longer be cancelled.
    error PollHasVotes();

    // ---------------------------------------------------------------------
    // Writes
    // ---------------------------------------------------------------------

    /// @notice Create a new poll. The caller becomes its creator.
    /// @param title 1–120 bytes.
    /// @param description 0–500 bytes.
    /// @param options 2–10 unique, non-empty options of at most 60 bytes each.
    /// @param endTime Unix seconds; must be 5 minutes to 30 days after the current block time.
    /// @return pollId The id of the new poll (ids start at 1).
    function createPoll(
        string calldata title,
        string calldata description,
        string[] calldata options,
        uint64 endTime
    ) external returns (uint256 pollId) {
        uint256 titleLength = bytes(title).length;
        if (titleLength == 0 || titleLength > MAX_TITLE_BYTES) revert InvalidTitle();
        if (bytes(description).length > MAX_DESCRIPTION_BYTES) revert InvalidDescription();

        uint256 optionCount = options.length;
        if (optionCount < MIN_OPTIONS || optionCount > MAX_OPTIONS) revert InvalidOptionCount();

        // Hash each option once so the duplicate check compares 32-byte words, not strings.
        bytes32[] memory hashes = new bytes32[](optionCount);
        for (uint256 i = 0; i < optionCount; i++) {
            uint256 len = bytes(options[i]).length;
            if (len == 0) revert EmptyOption(i);
            if (len > MAX_OPTION_BYTES) revert OptionTooLong(i);
            hashes[i] = keccak256(bytes(options[i]));
            // O(n^2) is fine: n is capped at 10, so at most 45 comparisons.
            for (uint256 j = 0; j < i; j++) {
                if (hashes[j] == hashes[i]) revert DuplicateOption(j, i);
            }
        }

        // Bounds are inclusive so "exactly 5 minutes" and "exactly 30 days" are both allowed.
        if (endTime < block.timestamp + MIN_DURATION || endTime > block.timestamp + MAX_DURATION) {
            revert InvalidEndTime();
        }

        pollId = ++pollCount; // pre-increment: the first poll gets id 1

        Poll storage poll = polls[pollId];
        poll.id = pollId;
        poll.creator = msg.sender;
        poll.title = title;
        poll.description = description;
        poll.createdAt = uint64(block.timestamp);
        poll.endTime = endTime;
        for (uint256 i = 0; i < optionCount; i++) {
            poll.options.push(options[i]);
            poll.voteCounts.push(0);
        }

        emit PollCreated(pollId, msg.sender, endTime);
    }

    /// @notice Cast the caller's single vote in a poll.
    /// @dev The voter is always msg.sender, never a parameter, so nobody can vote for someone else.
    /// @param pollId The poll to vote in.
    /// @param optionIndex Zero-based index of the chosen option.
    function vote(uint256 pollId, uint256 optionIndex) external {
        Poll storage poll = _existingPoll(pollId);
        if (poll.cancelled) revert PollIsCancelled(pollId);
        // Strictly less-than: at exactly endTime the poll is already closed.
        if (block.timestamp >= poll.endTime) revert PollEnded(pollId);
        if (optionIndex >= poll.options.length) revert InvalidOption(pollId, optionIndex);
        if (votedOption[pollId][msg.sender] != 0) revert AlreadyVoted(pollId, msg.sender);

        // Effects only (no external calls follow), recorded before the event for clarity.
        votedOption[pollId][msg.sender] = optionIndex + 1;
        poll.voteCounts[optionIndex] += 1;
        poll.totalVotes += 1;

        emit Voted(pollId, msg.sender, optionIndex);
    }

    /// @notice Cancel a poll. Only its creator, only while open, and only before any vote.
    /// @dev The zero-votes rule stops a creator from erasing a poll that is going against them.
    /// @param pollId The poll to cancel.
    function cancelPoll(uint256 pollId) external {
        Poll storage poll = _existingPoll(pollId);
        if (msg.sender != poll.creator) revert NotCreator();
        if (poll.cancelled) revert PollIsCancelled(pollId);
        if (block.timestamp >= poll.endTime) revert PollEnded(pollId);
        if (poll.totalVotes != 0) revert PollHasVotes();

        poll.cancelled = true;
        emit PollCancelled(pollId);
    }

    // ---------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------

    /// @notice Read one poll, including options and live vote counts.
    /// @param pollId The poll id (1..pollCount).
    /// @return The full Poll struct. Reverts with PollNotFound for an unknown id.
    function getPoll(uint256 pollId) external view returns (Poll memory) {
        return _existingPoll(pollId);
    }

    /// @notice Read a page of polls with ids startId..startId+limit-1, clipped to pollCount.
    /// @dev Paginated because returning every poll at once eventually exceeds RPC response limits.
    ///      startId 0 is treated as 1 (ids start at 1). limit is capped at MAX_PAGE_SIZE.
    /// @param startId First poll id to include.
    /// @param limit Maximum number of polls to return.
    /// @return page The polls, in ascending id order; empty if startId > pollCount or limit is 0.
    function getPollsPage(uint256 startId, uint256 limit) external view returns (Poll[] memory page) {
        if (startId == 0) startId = 1;
        if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
        if (startId > pollCount || limit == 0) return new Poll[](0);

        uint256 endId = startId + limit - 1;
        if (endId > pollCount) endId = pollCount;

        page = new Poll[](endId - startId + 1);
        for (uint256 id = startId; id <= endId; id++) {
            page[id - startId] = polls[id];
        }
    }

    /// @notice Which option a voter chose in a poll.
    /// @dev Does not revert for unknown polls (returns 0) so the frontend can batch it freely.
    /// @param pollId The poll id.
    /// @param voter The address to look up.
    /// @return 0 if the address has not voted, otherwise optionIndex + 1.
    function getVotedOption(uint256 pollId, address voter) external view returns (uint256) {
        return votedOption[pollId][voter];
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Single place that enforces "poll exists", so every entry point uses the same rule.
    function _existingPoll(uint256 pollId) private view returns (Poll storage) {
        if (pollId == 0 || pollId > pollCount) revert PollNotFound(pollId);
        return polls[pollId];
    }
}
