import { useState } from "react";

/** Native share sheet on phones; copy-to-clipboard everywhere else. */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const url = `${window.location.origin}${path}`;

  async function share() {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch (err) {
      // Closing the share sheet is not an error worth showing.
      if ((err as Error).name !== "AbortError") setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn btn-secondary" onClick={share} data-testid="share">
        Share link
      </button>
      <span role="status" className="hint" data-testid="share-status">
        {status === "copied" ? "Link copied" : status === "failed" ? url : ""}
      </span>
    </span>
  );
}
