import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { BaseError, decodeErrorResult, type Hash, type Hex, type TransactionReceipt } from "viem";
import { useAccount, useConfig } from "wagmi";
import { call, getTransaction, simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { targetChain } from "../config/chains";
import { deployment, votingAbi } from "../contract/contract";
import { useAnnounce } from "./useAnnouncer";
import { describeError, revertSentence, type DescribedError } from "../lib/errors";
import { clearPending, loadPending, savePending } from "../lib/pendingTx";

/** Every write in the app is one of these — typed against the ABI. */
export type TxRequest =
  | { functionName: "vote"; args: readonly [bigint, bigint] }
  | { functionName: "cancelPoll"; args: readonly [bigint] }
  | { functionName: "createPoll"; args: readonly [string, string, readonly string[], bigint] };

export type TxState =
  | { status: "idle" }
  | { status: "simulating" }
  | { status: "awaiting-wallet" }
  | { status: "pending"; hash: Hash }
  | { status: "confirmed"; hash: Hash; receipt: TransactionReceipt }
  | { status: "rejected"; message: string } // neutral: the user chose not to send
  | { status: "failed"; hash?: Hash; error: DescribedError };

type Options = {
  /** Unique per action and target, e.g. "vote:3". Used for the localStorage pending marker. */
  action: string;
  /** Used in neutral messages: "Vote not sent." */
  noun: string;
  pendingMessage: string;
  confirmedMessage: string;
  onConfirmed?: (receipt: TransactionReceipt) => void;
};

const BUSY: TxState["status"][] = ["simulating", "awaiting-wallet", "pending"];

/**
 * The single write path: simulate → wallet prompt → pending → confirmed / failed.
 * Simulating first surfaces contract reverts as readable sentences before the wallet pops up.
 */
export function useTx({ action, noun, pendingMessage, confirmedMessage, onConfirmed }: Options) {
  const config = useConfig();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const { address } = useAccount();
  const chainId = targetChain.id;

  // A hash saved before a refresh resumes here instead of the vote silently disappearing.
  const [state, setState] = useState<TxState>(() => {
    const hash = loadPending(chainId, action);
    return hash ? { status: "pending", hash } : { status: "idle" };
  });

  // Keep the latest callbacks without re-running the receipt watcher when they change identity.
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  const messagesRef = useRef({ confirmedMessage, noun });
  messagesRef.current = { confirmedMessage, noun };

  const pendingHash = state.status === "pending" ? state.hash : null;

  useEffect(() => {
    if (!pendingHash) return;
    let cancelled = false;
    (async () => {
      try {
        const receipt = await waitForTransactionReceipt(config, { hash: pendingHash, chainId, timeout: 10 * 60_000 });
        if (cancelled) return;
        clearPending(chainId, action);
        // Refetch everything from the chain rather than patching counts locally (no double counts).
        await queryClient.invalidateQueries({ queryKey: ["ballot", chainId] });
        if (receipt.status === "success") {
          setState({ status: "confirmed", hash: pendingHash, receipt });
          announce(messagesRef.current.confirmedMessage);
          onConfirmedRef.current?.(receipt);
        } else {
          const error = await explainMinedRevert(pendingHash, receipt);
          setState({ status: "failed", hash: pendingHash, error });
          announce(error.message);
        }
      } catch (err) {
        if (cancelled) return;
        const error = describeError(err, messagesRef.current.noun);
        setState({ status: "failed", hash: pendingHash, error });
        announce(error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new hash should restart the watcher
  }, [pendingHash]);

  /** Re-runs a reverted tx as a call at its block to recover the custom error for the user. */
  async function explainMinedRevert(hash: Hash, receipt: TransactionReceipt): Promise<DescribedError> {
    const fallback: DescribedError = { kind: "revert", message: "The transaction was mined but reverted. Nothing changed." };
    try {
      const tx = await getTransaction(config, { hash, chainId });
      await call(config, { account: tx.from, to: tx.to!, data: tx.input, blockNumber: receipt.blockNumber, chainId });
      return fallback;
    } catch (err) {
      const data =
        err instanceof BaseError ? (err.walk((e) => typeof (e as { data?: unknown }).data === "string") as { data?: Hex } | null)?.data : undefined;
      if (!data) return { ...fallback, details: describeError(err).details };
      try {
        const decoded = decodeErrorResult({ abi: votingAbi, data });
        return { kind: "revert", message: revertSentence(decoded.errorName, decoded.args) ?? fallback.message, details: decoded.errorName };
      } catch {
        return fallback;
      }
    }
  }

  const run = useCallback(
    async (request: TxRequest) => {
      if (!deployment || !address) return;
      setState({ status: "simulating" });
      try {
        const { request: prepared } = await simulateContract(config, {
          address: deployment.address,
          abi: votingAbi,
          account: address,
          chainId,
          // The union above is checked against the ABI at each call site; the cast only
          // collapses it for this one generic call.
          ...(request as { functionName: "vote"; args: readonly [bigint, bigint] }),
        });
        setState({ status: "awaiting-wallet" });
        announce("Confirm in your wallet.");
        const hash = await writeContract(config, prepared);
        savePending(chainId, action, hash);
        setState({ status: "pending", hash });
        announce(pendingMessage);
      } catch (err) {
        const error = describeError(err, noun);
        setState(
          error.kind === "rejected" || error.kind === "disconnected"
            ? { status: "rejected", message: error.message }
            : { status: "failed", error },
        );
        announce(error.message);
      }
    },
    [config, address, chainId, action, noun, pendingMessage, announce],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, reset, busy: BUSY.includes(state.status) };
}
