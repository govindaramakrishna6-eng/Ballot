/** Technical error text, hidden by default — never a raw dump in the main message. */
export function Details({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer">Details</summary>
      <pre className="mono mt-1 whitespace-pre-wrap break-all">{text}</pre>
    </details>
  );
}
