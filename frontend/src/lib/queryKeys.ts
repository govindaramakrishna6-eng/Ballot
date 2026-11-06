import { targetChain } from "../config/chains";

// Every key starts with the chain id so cached data from another chain can never leak in.
const base = ["ballot", targetChain.id] as const;

export const pollKeys = {
  list: () => [...base, "polls"] as const,
  poll: (id: bigint) => [...base, "poll", id.toString()] as const,
  votedAll: () => [...base, "voted"] as const,
  voted: (account: string | undefined, ids: readonly bigint[]) =>
    [...base, "voted", account ?? "none", ids.map(String).join(",")] as const,
  receipt: (id: bigint, account: string | undefined) => [...base, "voted", "receipt", id.toString(), account ?? "none"] as const,
};
