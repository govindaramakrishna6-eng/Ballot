import { chain, expect, test } from "./fixtures";

test.describe("Homepage", () => {
  test("hero: exact copy, centred in the viewport, two CTAs; old copy gone", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const hero = page.locator(".hero-inner");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Verifiable, tamper‑proof voting");
    await expect(hero).toContainText("Create polls, vote with your wallet, and see transparent on-chain results.");
    await expect(page.getByText("Every vote leaves a receipt")).toHaveCount(0);
    await expect(page.getByText(/edition/i)).toHaveCount(0);

    await page.waitForTimeout(800); // entrance animation
    const box = (await hero.boundingBox())!;
    expect(Math.abs(box.y + box.height / 2 - 450)).toBeLessThan(4);

    // Open polls start right after the hero: their heading is visible without scrolling.
    await expect(page.getByRole("heading", { name: "Open polls" })).toBeInViewport();

    await hero.getByRole("link", { name: "Browse polls" }).click();
    await expect(page.getByRole("heading", { name: "Open polls" })).toBeInViewport();
    await hero.getByRole("link", { name: "Create a poll" }).click();
    await expect(page).toHaveURL(/\/create$/);
  });

  test("hero stays centred on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForTimeout(800);
    const box = (await page.locator(".hero-inner").boundingBox())!;
    expect(Math.abs(box.y + box.height / 2 - 422)).toBeLessThan(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });

  test("open poll cards: question, creator, time left, votes, status and action; closing-soon ranks first", async ({ page }) => {
    const soon = await chain.createPoll({ title: `Closing soon ${Date.now()}`, durationSec: 3600n });
    await page.goto("/");
    const card = page.locator(`[data-testid="open-poll-card"][data-poll-id="${soon}"]`);
    await expect(page.getByTestId("open-poll-card").first()).toHaveAttribute("data-poll-id", soon.toString());
    await expect(card.getByTestId("status-pill")).toHaveText("Closing soon");
    await expect(card).toContainText(/by 0x[0-9a-fA-F]{4}…[0-9a-fA-F]{4}/);
    await expect(card).toContainText(/\dm \d\ds left|\dh \d+m left/);
    await expect(card).toContainText("0 votes");
    await card.getByRole("link", { name: /^Vote:/ }).click();
    await expect(page).toHaveURL(new RegExp(`/poll/${soon}$`));
  });

  test("recent activity reads like sentences and links to the poll; closed polls appear", async ({ page }) => {
    const title = `Weekend plans? ${Date.now()}`;
    const id = await chain.createPoll({ title, durationSec: 400n });
    await chain.vote(id, 0, 17);
    await page.goto("/");
    const activity = page.getByTestId("activity");
    await expect(activity.getByTestId("activity-vote").filter({ hasText: title }).first()).toContainText(`A wallet voted in ‘${title}’`);
    await expect(activity.getByTestId("activity-created").filter({ hasText: title })).toContainText(`A new poll was created: ‘${title}’`);
    await expect(activity.getByTestId("activity-vote").filter({ hasText: title }).first()).toContainText(/0x[0-9a-fA-F]{4}…[0-9a-fA-F]{4}/);

    await chain.timeTravel(500);
    await expect(activity.getByTestId("activity-closed").filter({ hasText: title })).toContainText(`‘${title}’ closed with 1 vote.`);
    await activity.getByTestId("activity-created").filter({ hasText: title }).click();
    await expect(page).toHaveURL(new RegExp(`/poll/${id}$`));
  });

  test("live stats show four figures that match the chain; network indicator is in the footer", async ({ page }) => {
    await page.goto("/");
    const stats = page.getByTestId("stats");
    for (const label of ["Active open polls", "Total votes cast", "Total polls created", "Unique wallets participating"]) {
      await expect(stats.getByText(label)).toBeVisible();
    }
    const count = (await chain.getPollCount()).toString();
    await expect(stats.locator(".stat").filter({ hasText: "Total polls created" }).locator(".stat-number")).toHaveText(count);
    await expect(page.getByTestId("network-indicator")).toContainText(/Hardhat • \d/);
  });
});

test.describe("Homepage — latest ballot receipt", () => {
  test("shows the newest real vote as a stamped receipt that links to its poll", async ({ page }) => {
    const title = `Receipt link ${Date.now()}`;
    const id = await chain.createPoll({ title, options: ["Filter coffee", "Tea"] });
    await chain.vote(id, 0, 18);
    await page.goto("/");
    const receipt = page.getByTestId("latest-receipt");
    await expect(receipt).toContainText("Recorded");
    await expect(receipt).toContainText(title);
    await expect(receipt).toContainText("Filter coffee");
    await expect(receipt).toContainText(/0x[0-9a-f]{8}…[0-9a-f]{6}/);
    await receipt.getByTestId("latest-receipt-poll").click();
    await expect(page).toHaveURL(new RegExp(`/poll/${id}$`));
  });

  test("headline uses the wordmark's typeface settings", async ({ page }) => {
    await page.goto("/");
    const style = (sel: string) =>
      page.$eval(sel, (e) => {
        const c = getComputedStyle(e);
        return { family: c.fontFamily, weight: c.fontWeight };
      });
    expect(await style(".hero-title")).toEqual(await style(".brand"));
    expect(await page.$eval(".hero-title", (e) => getComputedStyle(e).fontVariationSettings)).toContain('"opsz" 23');
  });
});
