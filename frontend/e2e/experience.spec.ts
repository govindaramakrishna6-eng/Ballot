import { chain, expect, test } from "./fixtures";

test.describe("On-chain experience", () => {
  test("voting walks through Checked → Signed → Broadcast → Recorded and ends on a sealed block", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Journey check" });
    await wallet.install({ as: 19 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await expect(page.getByTestId("toast")).toContainText("Wallet connected");

    await page.getByRole("radio", { name: "Alpha" }).check();
    await page.getByRole("button", { name: "Cast vote" }).click();
    const sealed = page.getByTestId("tx-sealed");
    await expect(sealed).toContainText("Recorded on-chain");
    await expect(page.getByTestId("tx-block")).toContainText(/Block #\d+/);
    for (const step of ["Checked", "Signed", "Broadcast", "Recorded"]) await expect(page.locator(".jstep-done", { hasText: step })).toHaveCount(1);
    await expect(page.getByTestId("receipt")).toBeVisible();
    await expect(page.getByTestId("voter-stack")).toContainText("1 wallet has voted");
    await expect(page.getByTestId("onchain-proof")).toContainText("No admin");
  });

  test("a vote arriving while you watch bumps the bar with +1", async ({ page }) => {
    const id = await chain.createPoll({ title: "Live bump" });
    await page.goto(`/poll/${id}`);
    await expect(page.getByTestId("total-votes")).toHaveText("No votes yet");
    await chain.vote(id, 1, 4);
    await expect(page.getByTestId("result-row").nth(1).locator(".bump")).toHaveText("+1");
    await expect(page.getByTestId("result-count").nth(1)).toHaveText("1 · 100%");
  });

  test("create: live preview, real fee estimate, then lands on the poll with its block", async ({ page, wallet }) => {
    await wallet.install({ as: 1 });
    await page.goto("/create");
    await wallet.connect();
    const title = `Best filter coffee in Chennai? ${Date.now()}`;
    await page.getByLabel("Question").fill(title);
    await page.getByPlaceholder("Option 1").fill("Saravana Bhavan");
    await page.getByPlaceholder("Option 2").fill("Murugan Idli");
    const preview = page.getByTestId("poll-preview");
    await expect(preview).toContainText(title);
    await expect(preview).toContainText("Murugan Idli");

    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByTestId("fee-estimate")).toContainText(/≈ .* ETH \([\d,]+ gas/);
    await page.getByRole("button", { name: "Sign and create poll" }).click();
    await expect(page.getByTestId("tx-sealed")).toBeVisible();
    await expect(page).toHaveURL(/\/poll\/\d+$/);
    await expect(page.getByTestId("poll-live-notice")).toContainText(/Your poll is live on-chain/);
    await expect(page.getByTestId("poll-live-notice")).toContainText(/Block #\d+/);
  });

  test("live ticker scrolls right → left, pauses on hover, and shows new blocks and polls", async ({ page }) => {
    const id = await chain.createPoll({ title: `Ticker poll ${Date.now()}` });
    await chain.vote(id, 0, 4);
    await page.goto("/");
    const ticker = page.getByTestId("live-ticker");
    await expect(ticker.locator(`a[href="/poll/${id}"]`).first()).toBeVisible();
    await expect(ticker).toContainText(/Block\s*#\d+/);
    const x = () => page.locator(".tk-track").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const a = await x();
    await page.waitForTimeout(600);
    expect(await x()).toBeLessThan(a); // moving left
    await ticker.hover();
    const b = await x();
    await page.waitForTimeout(600);
    expect(await x()).toBeCloseTo(b, 0); // paused under the pointer
  });

  test("hero shows the four trust badges", async ({ page }) => {
    await page.goto("/");
    for (const t of ["Built on a local chain", "Verified contract", "On-chain results", "No admin controls"]) {
      await expect(page.locator(".trust-chip", { hasText: t })).toBeVisible();
    }
  });
});
