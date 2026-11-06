import { useAccount, useSwitchChain } from "wagmi";
import { targetChain } from "../config/chains";

/** Shown whenever a connected wallet is on any chain other than the app's chain. */
export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();
  if (!isConnected || chainId === targetChain.id) return null;
  return (
    <div role="alert" className="banner" data-testid="wrong-network">
      <p>
        Your wallet is on the wrong network. Voting and creating polls are disabled until you switch to{" "}
        <strong>{targetChain.name}</strong>.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={isPending}
        onClick={() => switchChain({ chainId: targetChain.id })}
      >
        {isPending ? "Switching…" : `Switch to ${targetChain.name}`}
      </button>
      {error && <p className="text-sm">Couldn't switch automatically. Switch networks in your wallet.</p>}
    </div>
  );
}
