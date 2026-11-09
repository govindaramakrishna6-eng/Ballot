import { useMemo } from "react";
import { Link } from "react-router";
import { useAccount } from "wagmi";
import { BallotIcon, WalletIcon } from "../components/icons";
import { PollCard } from "../components/PollCard";
import { Skeleton } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/States";
import { usePollList, useVotedOptions } from "../hooks/usePolls";

/** Polls this wallet voted in: one batched getVotedOption read over every loaded poll. */
export function MyVotes() {
  const { address } = useAccount();
  const polls = usePollList();
  const ids = useMemo(() => (polls.data ?? []).map((p) => p.id), [polls.data]);
  const voted = useVotedOptions(ids);
  const mine = (polls.data ?? []).filter((p) => (voted.data?.get(p.id.toString()) ?? 0) > 0);

  let body: React.ReactNode;
  if (!address) {
    body = <EmptyState title="Connect a wallet to see the polls you voted in." icon={<WalletIcon />} />;
  } else if (polls.isPending || (ids.length > 0 && voted.isPending)) {
    body = (
      <ul className="ledger" aria-label="Loading your votes">
        {[0, 1].map((i) => (
          <li key={i} className="ledger-row">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/3" />
          </li>
        ))}
      </ul>
    );
  } else if (polls.isError || voted.isError) {
    body = (
      <ErrorState
        error={polls.error ?? voted.error}
        onRetry={() => {
          void polls.refetch();
          void voted.refetch();
        }}
      />
    );
  } else if (mine.length === 0) {
    body = (
      <EmptyState title="This wallet hasn't voted in any poll yet." icon={<BallotIcon />}>
        <Link to="/polls?tab=open" className="btn btn-primary">
          Browse open polls
        </Link>
      </EmptyState>
    );
  } else {
    body = (
      <ul className="ledger" data-testid="my-votes">
        {mine.map((p) => {
          const choice = voted.data!.get(p.id.toString())!;
          return <PollCard key={p.id.toString()} poll={p} myVote={choice} myChoice={p.options[choice - 1]} />;
        })}
      </ul>
    );
  }

  return (
    <section aria-labelledby="me-heading" className="mx-auto max-w-3xl">
      <h1 id="me-heading" className="display text-3xl">
        My votes
      </h1>
      <p className="muted mt-1 text-sm">Every vote here is public on-chain. Open a poll to see its ballot receipt.</p>
      <div className="mt-5">{body}</div>
    </section>
  );
}
