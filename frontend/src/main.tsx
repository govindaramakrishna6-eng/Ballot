import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { WagmiProvider } from "wagmi";
import App from "./App";
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
          <RainbowKitProvider initialChain={targetChain}>
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
