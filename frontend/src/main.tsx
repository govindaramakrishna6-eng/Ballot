// Full axis set (weight, optical size, softness, "wonk") plus true italics for the headline.
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

import { darkTheme, lightTheme, RainbowKitProvider, type AvatarComponent } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { WagmiProvider } from "wagmi";
import App from "./App";
import { Identicon } from "./components/Identicon";
import { NotDeployed, StartupError } from "./components/StartupScreens";
import { targetChain } from "./config/chains";
import { envProblems } from "./config/env";
import { wagmiConfig } from "./config/wagmi";
import { deployment } from "./contract/contract";
import { AnnouncerProvider } from "./hooks/useAnnouncer";
import { ChainClockProvider } from "./hooks/useChainClock";
import { LiveUpdatesProvider } from "./hooks/useLiveUpdates";

const queryClient = new QueryClient({
  defaultOptions: {
    // Blockchain reads are cheap but rate-limited on public RPCs: retry twice, don't refetch on every focus.
    queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 5_000 },
  },
});

// RainbowKit follows the same paper/ink palette: square corners, no blur, no soft shadows —
// the account chip becomes an inked outline like the rest of the controls.
function paperTheme(base: ReturnType<typeof lightTheme>, paper: string, ink: string) {
  return {
    ...base,
    colors: { ...base.colors, connectButtonBackground: paper, connectButtonText: ink, connectButtonInnerBackground: paper },
    shadows: { ...base.shadows, connectButton: `0 0 0 2px ${ink}`, dialog: "none", profileDetailsAction: "none", selectedOption: "none", selectedWallet: "none", walletLogo: "none" },
  };
}
const walletTheme = {
  lightMode: paperTheme(
    lightTheme({ accentColor: "#1c1b18", accentColorForeground: "#f4efe4", borderRadius: "none", fontStack: "system", overlayBlur: "none" }),
    "#f4efe4",
    "#1c1b18",
  ),
  darkMode: paperTheme(
    darkTheme({ accentColor: "#ece6d8", accentColorForeground: "#1b1a17", borderRadius: "none", fontStack: "system", overlayBlur: "none" }),
    "#1b1a17",
    "#ece6d8",
  ),
};

// RainbowKit's default avatar is an emoji; ours is the same identicon used everywhere else in the app.
const WalletAvatar: AvatarComponent = ({ address, size }) => <Identicon address={address} size={size} />;

const root = createRoot(document.getElementById("root")!);

if (envProblems.length > 0) {
  root.render(<StartupError problems={envProblems} />);
} else if (!deployment) {
  root.render(<NotDeployed chainName={targetChain.name} chainId={targetChain.id} />);
} else {
  root.render(
    <StrictMode>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider initialChain={targetChain} theme={walletTheme} avatar={WalletAvatar}>
            <BrowserRouter>
              <AnnouncerProvider>
                <ChainClockProvider>
                  <LiveUpdatesProvider>
                    <App />
                  </LiveUpdatesProvider>
                </ChainClockProvider>
              </AnnouncerProvider>
            </BrowserRouter>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>,
  );
}
