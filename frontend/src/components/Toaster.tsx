import { useState } from "react";
import { useAccountEffect } from "wagmi";
import { targetChain } from "../config/chains";
import { shortAddress } from "../lib/format";
import { Identicon } from "./Identicon";

type Toast = { id: number; address?: string; title: string; body: string };

/**
 * Small, non-interactive confirmations for wallet connect/disconnect. pointer-events: none so it can
 * never cover a button; it is aria-hidden because the header already changes visibly and the
 * app's aria-live region announces transaction status.
 */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now();
    setToasts((all) => [...all.slice(-1), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3200);
  };

  useAccountEffect({
    onConnect: ({ address, isReconnected }) => {
      if (!isReconnected) push({ address, title: "Wallet connected", body: `${shortAddress(address)} · ${targetChain.name}` });
    },
    onDisconnect: () => push({ title: "Wallet disconnected", body: "You can still browse polls and results." }),
  });

  return (
    <div className="toaster" aria-hidden="true">
      {toasts.map((t) => (
        <div key={t.id} className="toast" data-testid="toast">
          {t.address ? <Identicon address={t.address} size={28} /> : <span className="toast-dot" />}
          <div>
            <p className="font-semibold">{t.title}</p>
            <p className="mono muted text-xs">{t.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
