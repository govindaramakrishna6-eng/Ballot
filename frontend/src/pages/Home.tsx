import { useMemo } from "react";
import { Hero } from "../components/home/Hero";
import { NetworkStats } from "../components/home/NetworkStats";
import { OpenPolls } from "../components/home/OpenPolls";
import { RecentActivity } from "../components/home/RecentActivity";
import { useChainEvents } from "../hooks/useActivity";
import { usePollList, useVotedOptions } from "../hooks/usePolls";

/** Land → understand → see open polls → take part → see activity → see that it's alive. */
export function Home() {
  const polls = usePollList();
  const ids = useMemo(() => (polls.data ?? []).map((p) => p.id), [polls.data]);
  const voted = useVotedOptions(ids);
  const chain = useChainEvents();

  return (
    <>
      <Hero />
      <OpenPolls
        polls={polls.data}
        loading={polls.isPending}
        error={polls.isError ? polls.error : null}
        onRetry={() => void polls.refetch()}
        voted={voted.data}
      />
      <RecentActivity chain={chain.data} polls={polls.data} loading={chain.isPending || polls.isPending} failed={chain.isError} />
      <NetworkStats polls={polls.data} chain={chain.data} />
    </>
  );
}
