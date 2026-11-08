import { useState } from "react";
import { useLocation, useParams } from "react-router";
import { useAccount } from "wagmi";
import { Address } from "../components/Address";
import { HashText } from "../components/HashText";
import { OnChainProof } from "../components/OnChainProof";
import { Receipt, type ReceiptData } from "../components/Receipt";
import { Results } from "../components/Results";
import { ShareButton } from "../components/ShareButton";
import { Skeleton } from "../components/Skeleton";
import { ErrorState, NotFound } from "../components/States";
import { StatusPill } from "../components/StatusPill";
import { TxStatus } from "../components/TxStatus";
import type { Poll } from "../contract/contract";
import { useChainEvents } from "../hooks/useActivity";
import { useChainClock } from "../hooks/useChainClock";
import { usePoll, useVotedOptions, useVoteProof } from "../hooks/usePolls";
import { useTx } from "../hooks/useTx";
import { useWriteGate } from "../hooks/useWriteGate";
import { formatCountdown, formatDateTime, shortHash } from "../lib/format";
import { pollStatus } from "../lib/status";

/** Only canonical positive integers are poll ids ("01", "1e3", "-1", "abc" are not). */
function parseId(raw: string | undefined): bigint | null {
  return raw && /^[1-9]\d{0,30}$/.test(raw) ? BigInt(raw) : null;
}

export function PollDetail() {
  const id = parseId(useParams().id);
  const query = usePoll(id);

  if (id === null) return <NotFound what="poll" />;
  if (query.isPending) return <DetailSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data === null) return <NotFound what="poll" />;
  return <PollView poll={query.data} />;
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading poll" className="mx-auto max-w-2xl">
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-8 h-24 w-full" />
    </div>
  );
}

function PollView({ poll }: { poll: Poll }) {
  const { nowSec } = useChainClock();
  const { address } = useAccount();
  const gate = useWriteGate();
  const status = pollStatus(poll, nowSec);
  const voted = useVotedOptions([poll.id]);
  const myVote = voted.data?.get(poll.id.toString()) ?? 0;
  const proof = useVoteProof(poll.id, myVote > 0);
  // The selection belongs to the account that made it: after an account switch it resets,
  // because the new account may already have voted (getVotedOption is re-read for it).
  const [picked, setPicked] = useState<{ account: string | undefined; index: number } | null>(null);
  const choice = picked && picked.account === address ? picked.index : null;
  const setChoice = (index: number) => setPicked({ account: address, index });
  const chain = useChainEvents();
  const voters = (chain.data?.events ?? []).filter((e) => e.kind === "vote" && e.pollId === poll.id && e.actor).map((e) => e.actor!);
  // Set by the create page after confirmation, so the creator lands on a "your poll is live" moment.
  const created = (useLocation().state as { created?: { block: string; hash: string } } | null)?.created;
  const isCreator = address !== undefined && address.toLowerCase() === poll.creator.toLowerCase();

  const voteTx = useTx({
    action: `vote:${poll.id}`,
    noun: "Vote",
    pendingMessage: "Vote sent — waiting for the network to record it.",
    confirmedMessage: "Your vote is recorded on-chain. Your ballot receipt is below.",
  });
  const cancelTx = useTx({
    action: `cancel:${poll.id}`,
    noun: "Cancellation",
    pendingMessage: "Cancelling the poll…",
    confirmedMessage: "Poll cancelled.",
  });

  const justVoted = voteTx.state.status === "confirmed";
  const receipt: ReceiptData | null = proof.data
    ? {
        pollId: poll.id,
        pollTitle: poll.title,
        choice: poll.options[proof.data.optionIndex] ?? "",
        voter: proof.data.voter,
        txHash: proof.data.txHash,
        blockNumber: proof.data.blockNumber,
        timestamp: proof.data.timestamp,
      }
    : null;

  const canVote = status === "open" && myVote === 0;

  return (
    <article className="mx-auto max-w-2xl" aria-labelledby="poll-title">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        <span className="mono muted text-sm">Poll #{poll.id.toString()}</span>
      </div>
      <h1 id="poll-title" className="display mt-2 text-3xl break-words" data-testid="poll-title">
        {poll.title}
      </h1>
      {poll.description && <p className="mt-3 whitespace-pre-wrap break-words">{poll.description}</p>}
      {created && (
        <div className="live-notice" data-testid="poll-live-notice">
          <span className="pulse-dot" aria-hidden="true" />
          <div>
            <p className="font-semibold">Your poll is live on-chain</p>
            <p className="mono muted text-xs">
              Block #{BigInt(created.block).toLocaleString()} · <HashText value={shortHash(created.hash)} full={created.hash} />
            </p>
          </div>
        </div>
      )}
      <div className="mt-4">
        <ShareButton path={`/poll/${poll.id}`} title={poll.title} />
      </div>

      <dl className="meta mt-4 text-sm">
        <dt>Created by</dt>
        <dd>
          <Address address={poll.creator} />
        </dd>
        <dt>Opened</dt>
        <dd>{formatDateTime(poll.createdAt)}</dd>
        <dt>{status === "open" ? "Closes" : "Closed"}</dt>
        <dd data-testid="poll-deadline">
          {formatDateTime(poll.endTime)}
          {status === "open" && (
            <span className="mono ml-2" data-testid="countdown">
              ({formatCountdown(Number(poll.endTime) - nowSec)} left)
            </span>
          )}
        </dd>
      </dl>

      {status === "cancelled" && (
        <p className="notice mt-5" data-testid="cancelled-notice">
          Cancelled by its creator before anyone voted.
        </p>
      )}

      {canVote && (
        <form
          className="card mt-6"
          aria-labelledby="vote-heading"
          onSubmit={(e) => {
            e.preventDefault();
            if (choice !== null) void voteTx.run({ functionName: "vote", args: [poll.id, BigInt(choice)] });
          }}
        >
          <fieldset disabled={voteTx.busy}>
            <legend id="vote-heading" className="section-title">
              Cast your vote
            </legend>
            <div className="mt-3 space-y-2">
              {poll.options.map((opt, i) => (
                <label key={i} className="option-row">
                  <input type="radio" name="choice" value={i} checked={choice === i} onChange={() => setChoice(i)} />
                  <span className="break-words">{opt}</span>
                </label>
              ))}
            </div>
            <button type="submit" className="btn btn-primary mt-4" disabled={!gate.ok || choice === null || voteTx.busy}>
              {voteTx.busy ? "Working…" : "Cast vote"}
            </button>
          </fieldset>
          {!gate.ok && (
            <p className="hint mt-2" data-testid="write-disabled">
              {gate.reason}
            </p>
          )}
          {gate.ok && choice === null && <p className="hint mt-2">Choose one option. You can vote once, and it can't be changed.</p>}
        </form>
      )}

      {/* Outside the form so the "recorded" seal stays visible after the form gives way to the receipt. */}
      <div className="mt-4">
        <TxStatus state={voteTx.state} pendingLabel="Vote sent — waiting for confirmation." />
      </div>

      {myVote > 0 && (
        <p className="notice mt-6" data-testid="already-voted">
          You voted for <strong className="break-words">{poll.options[myVote - 1]}</strong>. Each wallet votes once.
        </p>
      )}
      {status === "closed" && myVote === 0 && (
        <p className="notice mt-6" data-testid="voting-closed">
          Voting has closed.
        </p>
      )}

      {receipt && <div className="mt-6"><Receipt data={receipt} fresh={justVoted} /></div>}
      {myVote > 0 && proof.isPending && <Skeleton className="mt-6 h-40 w-full" />}
      {myVote > 0 && proof.isError && (
        <p className="hint mt-6">Couldn't load your receipt from the network right now. Your vote is still counted.</p>
      )}

      <div className="mt-8">
        <Results poll={poll} status={status} myVote={myVote} voters={voters} />
      </div>

      <div className="mt-10">
        <OnChainProof totalVotes={poll.totalVotes} />
      </div>

      {isCreator && status === "open" && poll.totalVotes === 0n && (
        <div className="mt-8 border-t pt-4">
          <p className="text-sm">You created this poll. You can cancel it while it has no votes.</p>
          <button
            type="button"
            className="btn btn-danger mt-2"
            disabled={!gate.ok || cancelTx.busy}
            onClick={() => void cancelTx.run({ functionName: "cancelPoll", args: [poll.id] })}
          >
            {cancelTx.busy ? "Working…" : "Cancel poll"}
          </button>
          <div className="mt-2">
            <TxStatus state={cancelTx.state} pendingLabel="Cancelling…" />
          </div>
        </div>
      )}
    </article>
  );
}
