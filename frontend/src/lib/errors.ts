import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  TimeoutError,
  UserRejectedRequestError,
} from "viem";

export type ErrorKind = "rejected" | "funds" | "revert" | "network" | "disconnected" | "unknown";
export type DescribedError = { kind: ErrorKind; message: string; details?: string };

export const SEPOLIA_FAUCET_URL = "https://cloud.google.com/application/web3/faucet/ethereum/sepolia";

type Args = readonly unknown[] | undefined;

/** One human sentence per custom error in VotingDApp.sol. Indexes are shown 1-based to people. */
const REVERT_SENTENCES: Record<string, (args: Args) => string> = {
  PollNotFound: () => "This poll does not exist.",
  PollIsCancelled: () => "This poll was cancelled by its creator.",
  PollEnded: () => "Voting has closed for this poll.",
  InvalidOption: () => "That option is not part of this poll.",
  AlreadyVoted: () => "This wallet has already voted in this poll.",
  InvalidTitle: () => "The title must be between 1 and 120 bytes.",
  InvalidDescription: () => "The description must be 500 bytes or less.",
  InvalidOptionCount: () => "A poll needs between 2 and 10 options.",
  EmptyOption: (a) => `Option ${Number(a?.[0]) + 1} is empty.`,
  OptionTooLong: (a) => `Option ${Number(a?.[0]) + 1} is longer than 60 bytes.`,
  DuplicateOption: (a) => `Options ${Number(a?.[0]) + 1} and ${Number(a?.[1]) + 1} are identical.`,
  InvalidEndTime: () => "The deadline must be between 5 minutes and 30 days from now (by blockchain time).",
  NotCreator: () => "Only the person who created this poll can cancel it.",
  PollHasVotes: () => "This poll already has votes, so it can no longer be cancelled.",
};

/** Plain-language sentence for a decoded custom error name, if we know it. */
export function revertSentence(errorName: string, args?: Args): string | undefined {
  return REVERT_SENTENCES[errorName]?.(args);
}

function technicalDetails(err: unknown): string | undefined {
  if (err instanceof BaseError) return [err.shortMessage, err.details].filter(Boolean).join("\n");
  if (err instanceof Error) return err.message;
  return undefined;
}

/**
 * Turns any wallet/RPC/contract error into something a person can read.
 * `noun` names the action for the neutral rejection message ("Vote not sent.").
 */
export function describeError(err: unknown, noun = "Transaction"): DescribedError {
  const details = technicalDetails(err);
  const walk = (fn: (e: unknown) => boolean) => (err instanceof BaseError ? err.walk(fn) : null);
  const raw = (err as { code?: number; message?: string } | null) ?? {};

  // 4001 is the EIP-1193 "user rejected" code; some wallets throw it un-wrapped.
  if (walk((e) => e instanceof UserRejectedRequestError) || raw.code === 4001) {
    return { kind: "rejected", message: `${noun} not sent.` };
  }

  const reverted = walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
  if (reverted) {
    const name = reverted.data?.errorName;
    const sentence = name ? revertSentence(name, reverted.data?.args) : undefined;
    return { kind: "revert", message: sentence ?? "The contract rejected this transaction.", details };
  }

  const text = `${details ?? ""} ${raw.message ?? ""}`;
  if (walk((e) => e instanceof InsufficientFundsError) || /insufficient funds/i.test(text)) {
    return {
      kind: "funds",
      message: "This wallet doesn't have enough Sepolia ETH to pay the network fee. Get free test ETH from a faucet, then try again.",
      details,
    };
  }

  if (/connector not connected|disconnected/i.test(text)) {
    return { kind: "disconnected", message: "The wallet disconnected. Nothing was sent." };
  }

  if (walk((e) => e instanceof HttpRequestError || e instanceof TimeoutError)) {
    return { kind: "network", message: "Couldn't reach the blockchain network. Check your connection and try again.", details };
  }

  return { kind: "unknown", message: "Something went wrong. Nothing was changed on-chain.", details };
}

/** True for errors that mean "the RPC endpoint is down/unreachable" rather than a bad request. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof BaseError) return Boolean(err.walk((e) => e instanceof HttpRequestError || e instanceof TimeoutError));
  return err instanceof TypeError && /fetch/i.test(err.message);
}

/** True when a read reverted with PollNotFound — drives the "not found" page. */
export function isPollNotFound(err: unknown): boolean {
  if (!(err instanceof BaseError)) return false;
  const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
  return reverted?.data?.errorName === "PollNotFound";
}
