// Mirrors the public constants in contracts/contracts/VotingDApp.sol exactly.
// If the contract changes, these must change too (the contract is the real enforcer).
export const MAX_TITLE_BYTES = 120;
export const MAX_DESCRIPTION_BYTES = 500;
export const MAX_OPTION_BYTES = 60;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
export const MIN_DURATION_SEC = 5 * 60;
export const MAX_DURATION_SEC = 30 * 24 * 60 * 60;
export const PAGE_SIZE = 50;

/**
 * The deadline is checked against the block that includes the tx, which can be a minute after
 * the user clicks. The form keeps this margin inside both bounds so a valid-looking deadline
 * does not revert with InvalidEndTime by the time it is mined.
 */
export const DEADLINE_SAFETY_SEC = 60;
