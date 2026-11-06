import { defineConfig, devices } from "@playwright/test";

const PORT = 5190;

/**
 * End-to-end tests against a fresh local Hardhat node and the dev server in localhost mode.
 * One worker: every test shares one chain, and some tests move chain time forward.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      // Fresh chain every run, so the deploy lands on the address committed in deployments.json.
      command: "npx hardhat node",
      cwd: "../contracts",
      url: "http://127.0.0.1:8545",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      env: { VITE_CHAIN: "localhost", VITE_WALLETCONNECT_PROJECT_ID: "" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
