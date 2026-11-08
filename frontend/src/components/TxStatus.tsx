import { isLocalChain } from "../config/chains";
import type { TxState } from "../hooks/useTx";
import { SEPOLIA_FAUCET_URL } from "../lib/errors";
import { Details } from "./Details";
import { TxHash } from "./TxHash";

const STEPS = ["Checked", "Signed", "Broadcast", "Recorded"] as const;
type StepState = "todo" | "active" | "done" | "stopped";

/** Where each step stands for a given transaction state. */
function stepStates(state: TxState): StepState[] {
  const s = (done: number, active: number | null, stopped: number | null): StepState[] =>
    STEPS.map((_, i) => (i === stopped ? "stopped" : i < done ? "done" : i === active ? "active" : "todo"));
  switch (state.status) {
    case "simulating":
      return s(0, 0, null);
    case "awaiting-wallet":
      return s(1, 1, null);
    case "pending":
      return s(2, 2, null); // signed + broadcast; waiting for a block
    case "confirmed":
      return s(4, null, null);
    case "rejected":
      return s(1, null, 1);
    case "failed":
      // Reverted after mining → it reached a block; contract refusal at simulation → stopped at the check.
      return state.hash ? s(3, null, 3) : state.error.kind === "revert" ? s(0, null, 0) : s(1, null, 1);
    default:
      return s(0, null, null);
  }
}

function StepIcon({ state, index }: { state: StepState; index: number }) {
  if (state === "done")
    return (
      <svg viewBox="0 0 20 20" className="jcheck" aria-hidden="true">
        <path d="M5 10.5 8.5 14 15 6.5" />
      </svg>
    );
  if (state === "stopped")
    return (
      <svg viewBox="0 0 20 20" className="jstop" aria-hidden="true">
        <path d="M6 6l8 8M14 6l-8 8" />
      </svg>
    );
  return <span className="jnum">{index + 1}</span>;
}

/** The "it's on-chain" moment: a seal draws itself and two rings pulse out once. */
function Seal({ block }: { block: bigint }) {
  return (
    <div className="seal-wrap" data-testid="tx-sealed">
      <div className="seal" aria-hidden="true">
        <span className="seal-ring" />
        <span className="seal-ring seal-ring-2" />
        <svg viewBox="0 0 52 52" className="seal-svg">
          <circle cx="26" cy="26" r="23" className="seal-circle" />
          <path d="M15 27l7 7 15-16" className="seal-tick" />
        </svg>
      </div>
      <div>
        <p className="seal-title">Recorded on-chain</p>
        <p className="mono muted text-sm" data-testid="tx-block">
          Block #{block.toLocaleString()} · permanent and publicly verifiable
        </p>
      </div>
    </div>
  );
}

/**
 * The transaction journey shown for every write: Checked → Signed → Broadcast → Recorded.
 * Visual only — the same words go to screen readers through the app's aria-live announcer.
 */
export function TxStatus({ state, pendingLabel }: { state: TxState; pendingLabel: string }) {
  if (state.status === "idle") return null;
  const steps = stepStates(state);

  return (
    <div className={`journey journey-${state.status}`}>
      <ol className="journey-steps" aria-hidden="true">
        {STEPS.map((label, i) => (
          <li key={label} className={`jstep jstep-${steps[i]}`}>
            <span className="jnode">
              <StepIcon state={steps[i]} index={i} />
            </span>
            <span className="jlabel">{label}</span>
            {i < STEPS.length - 1 && (
              <span className={`jline ${steps[i] === "done" && steps[i + 1] !== "todo" ? "jline-done" : ""}`}>
                {state.status === "pending" && i === 2 && <span className="jpacket" />}
              </span>
            )}
          </li>
        ))}
      </ol>

      {state.status === "simulating" && <p className="tx-line" data-testid="tx-status">Checking with the contract…</p>}
      {state.status === "awaiting-wallet" && <p className="tx-line" data-testid="tx-status">Confirm in your wallet…</p>}
      {state.status === "pending" && (
        <div className="tx-line">
          <p data-testid="tx-status">{pendingLabel}</p>
          <TxHash hash={state.hash} />
        </div>
      )}
      {state.status === "rejected" && (
        // Neutral, not an error: the user simply chose not to send.
        <p className="tx-line" data-testid="tx-status">
          {state.message}
        </p>
      )}
      {state.status === "confirmed" && (
        <>
          <Seal block={state.receipt.blockNumber} />
          <TxHash hash={state.hash} />
        </>
      )}
      {state.status === "failed" && (
        <div role="alert" className="notice notice-error mt-3" data-testid="tx-error">
          <p>{state.error.message}</p>
          {state.error.kind === "funds" && !isLocalChain && (
            <p className="mt-1 text-sm">
              <a href={SEPOLIA_FAUCET_URL} target="_blank" rel="noreferrer" className="link">
                Open a Sepolia faucet
              </a>
            </p>
          )}
          {state.hash && <TxHash hash={state.hash} />}
          <Details text={state.error.details} />
        </div>
      )}
    </div>
  );
}
