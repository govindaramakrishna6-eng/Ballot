import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig } from "wagmi";
import { env } from "./env";
import { targetChain, targetTransport } from "./chains";

// Without a WalletConnect project id, only injected wallets (MetaMask extension, MetaMask's in-app
// browser, Rabby, Brave…) are offered. QR/mobile wallets need WalletConnect, so they are added
// only when the id exists. EIP-6963 discovery still lists each installed extension by name.
const groups = env.walletConnectProjectId
  ? [{ groupName: "Wallets", wallets: [metaMaskWallet, injectedWallet, rainbowWallet, coinbaseWallet, walletConnectWallet] }]
  : [{ groupName: "Browser wallets", wallets: [injectedWallet] }];

const connectors = connectorsForWallets(groups, {
  appName: "Ballot",
  // Required by the type; not used by the injected-only setup.
  projectId: env.walletConnectProjectId ?? "walletconnect-disabled",
});

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors,
  transports: { [targetChain.id]: targetTransport },
  multiInjectedProviderDiscovery: true,
  // Local blocks are instant; Sepolia makes one every ~12s.
  pollingInterval: targetChain.id === 31337 ? 1_000 : 4_000,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
