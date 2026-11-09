import { chain, expect, test } from "./fixtures";

test.describe("Header navigation", () => {
  test("Home and Results links are in the header and go to their pages", async ({ page }) => {
    await page.goto("/polls");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText(["Home", "Polls", "Results", "Create", "My votes"]);
    await nav.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(nav.getByRole("link", { name: "Home" })).toHaveClass(/nav-link-active/);
    await nav.getByRole("link", { name: "Results" }).click();
    await expect(page).toHaveURL(/\/results$/);
    await expect(page.getByRole("heading", { level: 1, name: "Results" })).toBeVisible();
  });

  for (const [w, h] of [[375, 560], [390, 664], [360, 640], [390, 844]] as const) {
    test(`mobile ${w}×${h}: nothing overlaps the header line, no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await page.waitForTimeout(800);
      const headerBottom = (await page.locator(".site-header").boundingBox())!;
      const title = (await page.locator(".hero-title").boundingBox())!;
      expect(title.y).toBeGreaterThan(headerBottom.y + headerBottom.height);
      const ribbon = (await page.locator(".ribbon").boundingBox())!;
      const next = (await page.getByRole("heading", { name: "How it works" }).boundingBox())!;
      expect(next.y).toBeGreaterThan(ribbon.y + ribbon.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(w);
      await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Results" })).toBeVisible();
    });
  }
});

test.describe("Results page", () => {
  test("final results: winner, tie and no-votes verdicts; live tab shows open polls leading", async ({ page }) => {
    const stamp = Date.now();
    const won = await chain.createPoll({ title: `Winner poll ${stamp}`, durationSec: 400n });
    await chain.vote(won, 1, 4);
    await chain.vote(won, 1, 5);
    await chain.vote(won, 0, 6);
    const tied = await chain.createPoll({ title: `Tied poll ${stamp}`, durationSec: 400n });
    await chain.vote(tied, 0, 4);
    await chain.vote(tied, 2, 5);
    const empty = await chain.createPoll({ title: `Empty poll ${stamp}`, durationSec: 400n });
    const open = await chain.createPoll({ title: `Still open ${stamp}` });
    await chain.vote(open, 2, 7);
    await chain.timeTravel(500);

    await page.goto("/results");
    const card = (id: bigint) => page.locator(`[data-testid="result-card"][data-poll-id="${id}"]`);
    await expect(card(won).getByTestId("result-verdict")).toContainText("Winner");
    await expect(card(won).getByTestId("result-verdict")).toContainText("Beta");
    await expect(card(won).getByTestId("result-verdict")).toContainText("67%");
    await expect(card(tied).getByTestId("result-verdict")).toContainText("Tied");
    await expect(card(tied).getByTestId("result-verdict")).toContainText("Alpha · Gamma");
    await expect(card(empty).getByTestId("result-verdict")).toHaveText("No votes were cast");
    await expect(card(open)).toHaveCount(0);
    await expect(page.getByTestId("results-summary")).toContainText(/\d+ decided · \d+ votes counted/);

    // Most recently closed first: the three just-closed polls lead the list.
    const firstIds = await page.getByTestId("result-card").evaluateAll((els) => els.slice(0, 3).map((e) => e.getAttribute("data-poll-id")));
    expect(firstIds.sort()).toEqual([won, tied, empty].map(String).sort());

    await page.getByRole("tab", { name: /Live results/ }).click();
    await expect(page).toHaveURL(/tab=live/);
    await expect(card(open).getByTestId("result-verdict")).toContainText("Leading");
    await expect(card(open).getByTestId("result-verdict")).toContainText("Gamma");
    await expect(card(won)).toHaveCount(0);

    await card(open).getByRole("link", { name: /Full results/ }).click();
    await expect(page).toHaveURL(new RegExp(`/poll/${open}$`));
  });
});
