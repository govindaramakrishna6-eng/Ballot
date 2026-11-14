import { test as base, expect, type Page } from "@playwright/test";
import { createPublicClient, createTestClient, createWalletClient, http, parseEventLogs, type Address } from "viem";
import { hardhat } from "viem/chains";
import { votingAbi } from "../src/contract/abi";
import deployments from "../src/contract/deployments.json" with { type: "json" };
import { installFakeWallet } from "./fake-wallet";

const RPC = "http://127.0.0.1:8545";
const CONTRACT = deployments["31337"].address as Address;
const transport = http(RPC);
const publicClient = createPublicClient({ chain: hardhat, transport });
const testClient = createTestClient({ chain: hardhat, mode: "hardhat", transport });

/** Hardhat's well-known dev accounts (unlocked on the node; no keys needed here). */
export const ACCOUNTS = (await publicClient.request({ method: "eth_accounts" })) as Address[];

/** Direct chain access for arranging state the test is not about (other voters, time travel…). */
export const chain = {
  async now(): Promise<bigint> {
    return (await publicClient.getBlock()).timestamp;
  },
  async createPoll(opts: { from?: number; title?: string; options?: string[]; durationSec?: bigint } = {}): Promise<bigint> {
    const account = ACCOUNTS[opts.from ?? 0];
    const wallet = createWalletClient({ chain: hardhat, transport, account });
    const endTime = (await this.now()) + (opts.durationSec ?? 86_400n);
    const hash = await wallet.writeContract({
      address: CONTRACT,
      abi: votingAbi,
      functionName: "createPoll",
      args: [opts.title ?? `E2E poll ${Date.now()}`, "", opts.options ?? ["Alpha", "Beta", "Gamma"], endTime],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const [event] = parseEventLogs({ abi: votingAbi, logs: receipt.logs, eventName: "PollCreated" });
    return event.args.pollId;
  },
  async vote(pollId: bigint, option: number, from: number) {
    const wallet = createWalletClient({ chain: hardhat, transport, account: ACCOUNTS[from] });
    const hash = await wallet.writeContract({ address: CONTRACT, abi: votingAbi, functionName: "vote", args: [pollId, BigInt(option)] });
    await publicClient.waitForTransactionReceipt({ hash });
  },
  async getPollCount() {
    return publicClient.readContract({ address: CONTRACT, abi: votingAbi, functionName: "pollCount" });
  },
  async getPoll(pollId: bigint) {
    return publicClient.readContract({ address: CONTRACT, abi: votingAbi, functionName: "getPoll", args: [pollId] });
  },
  async timeTravel(seconds: number) {
    await testClient.increaseTime({ seconds });
    await testClient.mine({ blocks: 1 });
  },
  setAutomine: (on: boolean) => testClient.setAutomine(on),
  mine: () => testClient.mine({ blocks: 1 }),
  setBalance: (account: Address, value: bigint) => testClient.setBalance({ address: account, value }),
};

type WalletControls = {
  /** Installs the fake wallet (before any page script runs) as account index `as`. */
  install: (opts?: { as?: number; chainId?: number }) => Promise<void>;
  connect: () => Promise<void>;
  rejectNext: () => Promise<void>;
  setChain: (id: number) => Promise<void>;
  setAccount: (index: number) => Promise<void>;
  disconnect: () => Promise<void>;
};

export const test = base.extend<{ wallet: WalletControls; skipIntro: void }>({
  // Every test starts with the brand intro already "seen" this session, so it never covers the page.
  // e2e/intro.spec.ts opts out of this to test the intro itself.
  skipIntro: [
    async ({ page }, provide, testInfo) => {
      if (!testInfo.file.endsWith("intro.spec.ts")) {
        await page.addInitScript(() => sessionStorage.setItem("ballot:intro-seen", "1"));
      }
      await provide();
    },
    { auto: true },
  ],
  wallet: async ({ page }, provide) => {
    await provide({
      install: async ({ as = 1, chainId = 31337 } = {}) => {
        await page.addInitScript(installFakeWallet, { rpcUrl: RPC, account: ACCOUNTS[as], chainId });
      },
      connect: () => connectViaUi(page),
      rejectNext: () => page.evaluate(() => (window as never as { __wallet: { rejectNext(): void } }).__wallet.rejectNext()),
      setChain: (id) => page.evaluate((i) => (window as never as { __wallet: { setChain(i: number): void } }).__wallet.setChain(i), id),
      setAccount: (index) =>
        page.evaluate((a) => (window as never as { __wallet: { setAccount(a: string): void } }).__wallet.setAccount(a), ACCOUNTS[index]),
      disconnect: () => page.evaluate(() => (window as never as { __wallet: { disconnect(): void } }).__wallet.disconnect()),
    });
  },
});

/** Clicks through RainbowKit exactly like a user: Connect Wallet → Browser Wallet. */
async function connectViaUi(page: Page) {
  await page.getByRole("button", { name: "Connect Wallet" }).click();
  await page.getByRole("button", { name: /Browser Wallet|Injected/i }).click();
  await expect(page.getByRole("button", { name: "Connect Wallet" })).toHaveCount(0);
}

export { expect };
