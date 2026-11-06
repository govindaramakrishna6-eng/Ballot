import { useLocation } from "react-router";
import { useAccount } from "wagmi";

/**
 * With no browser wallet installed, RainbowKit's injected-only list is empty, so we say plainly
 * that browsing works and where to get a wallet. Hidden once any wallet is present or connected.
 */
export function NoWalletHint() {
  const { isConnected } = useAccount();
  // Kept off the homepage so the hero stays clean; it appears wherever voting or creating happens.
  const onHome = useLocation().pathname === "/";
  const hasInjected = typeof window !== "undefined" && "ethereum" in window;
  if (isConnected || hasInjected || onHome) return null;
  return (
    <p className="hint" data-testid="no-wallet">
      No wallet detected — you can browse and read results. To vote, install{" "}
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="link">
        MetaMask
      </a>{" "}
      or open this page in your wallet's in-app browser.
    </p>
  );
}
