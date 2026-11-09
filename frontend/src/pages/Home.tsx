import { useMemo, useState } from "react";
import { Link } from "react-router";
import { FeaturedPoll } from "../components/home/FeaturedPoll";
import { Faq } from "../components/home/Faq";
import { Hero } from "../components/home/Hero";
import { HowItWorks } from "../components/home/HowItWorks";
import { NetworkStats } from "../components/home/NetworkStats";
import { RecentActivity } from "../components/home/RecentActivity";
import { SectionHead } from "../components/home/SectionHead";
import { TrustSection } from "../components/home/TrustSection";
import { PollBrowser } from "../components/PollBrowser";
import { useChainEvents } from "../hooks/useActivity";
import { usePollList, useVotedOptions } from "../hooks/usePolls";
import type { PollFilter } from "../lib/rank";

const TITLES: Record<PollFilter, string> = { all: "All polls", open: "Open polls", closing: "Closing soon", closed: "Closed polls", mine: "My polls" };
const HOME_LIMIT = 6; // two even rows of three

/**
 * Land → understand (hero, how it works) → see the featured poll and browse → watch activity →
 * trust (security, stats) → questions (FAQ). Every section shares one 3-column grid so edges align.
 */
export function Home() {
  const polls = usePollList();
  const ids = useMemo(() => (polls.data ?? []).map((p) => p.id), [polls.data]);
  const voted = useVotedOptions(ids);
  const chain = useChainEvents();
  const [filter, setFilter] = useState<PollFilter>("open");
  const [query, setQuery] = useState("");
  const params = new URLSearchParams({ ...(filter !== "all" ? { tab: filter } : {}), ...(query ? { q: query } : {}) }).toString();

  return (
    <>
      <Hero chain={chain.data} />
      <HowItWorks />
      <FeaturedPoll polls={polls.data} chain={chain.data} loading={polls.isPending} />
      <section className="home-section" aria-labelledby="polls-title" id="polls">
        <SectionHead
          id="polls-title"
          kicker="Browse"
          title={TITLES[filter]}
          action={
            <Link to={`/polls${params ? `?${params}` : ""}`} className="link text-sm" data-testid="see-all-polls">
              See all polls
            </Link>
          }
        />
        <PollBrowser
          polls={polls.data}
          voted={voted.data}
          loading={polls.isPending}
          error={polls.isError ? polls.error : null}
          onRetry={() => void polls.refetch()}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          limit={HOME_LIMIT}
        />
      </section>
      <RecentActivity chain={chain.data} polls={polls.data} loading={chain.isPending || polls.isPending} failed={chain.isError} />
      <TrustSection />
      <NetworkStats polls={polls.data} chain={chain.data} />
      <Faq />
    </>
  );
}
