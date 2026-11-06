import { chain, expect, test } from "./fixtures";

test.describe("Wallet edge cases", () => {
  test("wrong network: banner, writes disabled with a reason, one-click switch", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Network check" });
    await wallet.install({ as: 2 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    // The user switches networks inside their wallet (RainbowKit already asks for the right chain on connect).
    await wallet.setChain(11155111);
    await expect(page.getByTestId("wrong-network")).toBeVisible();
    await page.getByRole("radio", { name: "Alpha" }).check();
    await expect(page.getByRole("button", { name: "Cast vote" })).toBeDisabled();
    await expect(page.getByTestId("write-disabled")).toContainText("Switch your wallet to Hardhat Local");

    await page.getByRole("button", { name: "Switch to Hardhat Local" }).click();
    await expect(page.getByTestId("wrong-network")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cast vote" })).toBeEnabled();
  });

  test("switching accounts re-checks the vote for the new account immediately", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Two accounts" });
    await chain.vote(id, 2, 13);
    await wallet.install({ as: 13 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await expect(page.getByTestId("already-voted")).toContainText("Gamma");

    await wallet.setAccount(14);
    await expect(page.getByTestId("already-voted")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cast vote" })).toBeVisible();

    await wallet.setAccount(13);
    await expect(page.getByTestId("already-voted")).toContainText("Gamma");
  });

  test("disconnecting mid-flow returns to read-only without crashing", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Disconnect me" });
    await wallet.install({ as: 2 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await page.getByRole("radio", { name: "Beta" }).check();
    await expect(page.getByRole("button", { name: "Cast vote" })).toBeEnabled();

    await wallet.disconnect();
    await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible();
    await expect(page.getByTestId("write-disabled")).toHaveText("Connect a wallet to continue.");
    await expect(page.getByTestId("poll-title")).toHaveText("Disconnect me");
    await expect(page.getByTestId("crash")).toHaveCount(0);
  });
});
