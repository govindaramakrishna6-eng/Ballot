import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { isLocalChain } from "../config/chains";
import { env } from "../config/env";

// ENS names live on Ethereum mainnet even though polls live on Sepolia, so this is a separate,
// read-only client. It never signs anything and never touches the wallet.
const mainnetClient = createPublicClient({ chain: mainnet, transport: http(env.mainnetRpcUrl, { timeout: 8_000 }) });

/**
 * Reverse-resolves an address to its primary ENS name (viem checks the forward record too,
 * so a spoofed reverse record is ignored). Any failure just means "show the address".
 * Off on the local chain: Hardhat's test accounts have no names and tests stay offline.
 */
export function useEnsName(address: Address | undefined) {
  return useQuery({
    queryKey: ["ens", address],
    enabled: Boolean(address) && !isLocalChain,
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: async () => {
      try {
        return await mainnetClient.getEnsName({ address: address! });
      } catch {
        return null;
      }
    },
  });
}
