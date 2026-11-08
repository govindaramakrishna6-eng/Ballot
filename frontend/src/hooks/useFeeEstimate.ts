import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { targetChain } from "../config/chains";
import { deployment, votingAbi } from "../contract/contract";

/**
 * Real network fee for creating this exact poll: the node's gas estimate × current gas price.
 * Read-only (nothing is sent). Only runs on the review step, when the arguments are final.
 */
export function useCreateFeeEstimate(args: readonly [string, string, readonly string[], bigint] | null) {
  const client = usePublicClient({ chainId: targetChain.id });
  const { address } = useAccount();
  return useQuery({
    queryKey: ["ballot", targetChain.id, "fee", address, args ? JSON.stringify(args, (_, v) => (typeof v === "bigint" ? v.toString() : v)) : null],
    enabled: Boolean(client && deployment && address && args),
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const [gas, price] = await Promise.all([
        client!.estimateContractGas({ address: deployment!.address, abi: votingAbi, functionName: "createPoll", args: args!, account: address! }),
        client!.getGasPrice(),
      ]);
      return { gas, eth: formatEther(gas * price) };
    },
  });
}
