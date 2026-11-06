import { isLocalChain } from "../config/chains";
import { SEPOLIA_FAUCET_URL } from "../lib/errors";
import type { TxState } from "../hooks/useTx";
import { Details } from "./Details";
import { TxHash } from "./TxHash";

/** Visible status for one action. Screen readers get the same messages via the app's aria-live region. */
export function TxStatus({ state, pendingLabel }: { state: TxState; pendingLabel: string }) {
  switch (state.status) {
    case "idle":
    case "confirmed":
      return null;
    case "simulating":
      return <p className="tx-line" data-testid="tx-status">Checking with the contract…</p>;
    case "awaiting-wallet":
      return <p className="tx-line" data-testid="tx-status">Confirm in your wallet…</p>;
    case "pending":
      return (
        <div className="tx-line" data-testid="tx-status">
          <p>{pendingLabel}</p>
          <TxHash hash={state.hash} />
        </div>
      );
    case "rejected":
      // Neutral, not an error: the user simply chose not to send.
      return <p className="tx-line" data-testid="tx-status">{state.message}</p>;
    case "failed":
      return (
        <div role="alert" className="notice notice-error" data-testid="tx-error">
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
      );
  }
}

