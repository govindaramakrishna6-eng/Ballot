import { Link } from "react-router";
import { targetChain } from "../config/chains";
import { describeError, isNetworkError } from "../lib/errors";
import { Details } from "./Details";

/** Error with retry. Unreachable RPCs get their own wording: the user did nothing wrong. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const down = isNetworkError(error);
  return (
    <div role="alert" className="notice notice-error" data-testid={down ? "rpc-down" : "error-state"}>
      <p className="font-semibold">{down ? `Can't reach the ${targetChain.name} network` : "Couldn't load this"}</p>
      <p className="mt-1 text-sm">
        {down
          ? "The public blockchain endpoint isn't responding. Your votes are safe on-chain — try again in a moment."
          : describeError(error).message}
      </p>
      <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>
        Try again
      </button>
      <Details text={describeError(error).details} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="notice" data-testid="empty-state">
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function NotFound({ what = "page" }: { what?: string }) {
  return (
    <section className="py-10" data-testid="not-found">
      <h1 className="display text-3xl">Not found</h1>
      <p className="mt-2">This {what} doesn't exist.</p>
      <Link to="/" className="btn btn-secondary mt-4 inline-block">
        Back to all polls
      </Link>
    </section>
  );
}
