import { useAccount } from "wagmi";
import { targetChain } from "../config/chains";
import { deployment } from "../contract/contract";

/** One answer to "may this user send a transaction right now, and if not, why?" */
export function useWriteGate(): { ok: boolean; reason: string | null } {
  const { isConnected, chainId } = useAccount();
  if (!deployment) return { ok: false, reason: `The contract isn't deployed on ${targetChain.name}.` };
  if (!isConnected) return { ok: false, reason: "Connect a wallet to continue." };
  if (chainId !== targetChain.id) return { ok: false, reason: `Switch your wallet to ${targetChain.name} to continue.` };
  return { ok: true, reason: null };
}
