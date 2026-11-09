import { readFileSync } from "node:fs";
import { chain, expect, test } from "./fixtures";

test.describe("Homepage v2", () => {
  test("featured poll: the busiest open poll with bars, total, countdown, status, Vote now and share", async ({ page }) => {
    const title = `Should Chennai adopt more EV buses? ${Date.now()}`;
    const id = await chain.createPoll({ title, options: ["Yes", "No", "Only electric"] });
    for (const [voter, option] of [[10, 0], [11, 0], [12, 2], [13, 0], [14, 1], [15, 0], [16, 2], [17, 0]] as const) await chain.vote(id, option, voter);

    await page.goto("/");
    const featured = page.getByTestId("featured-poll");
    await expect(featured).toHaveAttribute("data-poll-id", id.toString());
    await expect(featured).toContainText(title);
    await expect(featured.getByTestId("featured-total")).toHaveText("8");
    await expect(featured).toContainText("5 · 63%");
    await expect(featured.getByTestId("featured-countdown")).toHaveText(/\d+h \d+m|\d+m \d\ds/);
    await expect(featured.getByTestId("status-pill")).toHaveText(/Open|Closing soon/);
    await expect(featured.getByTestId("share-x")).toHaveAttribute("href", new RegExp(`x\\.com/intent/post\\?text=.*url=.*poll%2F${id}`));
    await featured.getByTestId("featured-cta").click();
    await expect(page).toHaveURL(new RegExp(`/poll/${id}$`));
  });

  test("how it works, trust & security, FAQ accordion", async ({ page }) => {
    await page.goto("/");
    const how = page.locator("#how-it-works");
    for (const t of ["Connect your wallet", "Create or vote in a poll", "Verify results on Etherscan"]) await expect(how.getByRole("heading", { name: t })).toBeVisible();

    const trust = page.getByTestId("trust-points");
    for (const t of ["Votes are recorded on-chain", "Independently verifiable", "Immutable, no admin controls", "You keep custody"]) await expect(trust).toContainText(t);

    const faq = page.getByTestId("faq");
    await expect(faq.locator("summary")).toHaveCount(7);
    const q = faq.locator("details").filter({ hasText: "Are there gas fees?" });
    await expect(q.locator("p")).toBeHidden();
    await q.locator("summary").click();
    await expect(q.locator("p")).toContainText("free test ETH");
  });

  test("search and filters (All / Open / Closing soon / Closed) with an empty state", async ({ page }) => {
    const stamp = Date.now();
    const soon = await chain.createPoll({ title: `Filter soon f${stamp}`, durationSec: 1800n });
    const later = await chain.createPoll({ title: `Filter later f${stamp}` });
    await page.goto("/");
    const polls = page.locator("#polls");
    const card = (id: bigint) => polls.locator(`[data-testid="open-poll-card"][data-poll-id="${id}"]`);

    await polls.getByTestId("poll-search").fill(`f${stamp}`);
    await expect(card(soon)).toBeVisible();
    await expect(card(later)).toBeVisible();
    await expect(card(soon).getByTestId("countdown-badge")).toHaveClass(/countdown-soon/);

    await polls.getByTestId("filter-closing").click();
    await expect(page.getByRole("heading", { name: "Closing soon" })).toBeVisible();
    await expect(card(soon)).toBeVisible();
    await expect(card(later)).toHaveCount(0);

    await polls.getByTestId("filter-closed").click();
    await expect(polls.getByTestId("no-results")).toContainText(`No polls match “f${stamp}”`);
    await polls.getByRole("button", { name: "Clear search" }).click();
    await expect(polls.getByTestId("poll-search")).toHaveValue("");

    await polls.getByTestId("filter-all").click();
    await polls.getByTestId("poll-search").fill(`#${later}`);
    await expect(card(later)).toBeVisible();
    await expect(polls.getByTestId("open-poll-card")).toHaveCount(1);
  });

  test("poll page: copy link, share on X, export CSV and JSON", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const id = await chain.createPoll({ title: `Export "me", please ${Date.now()}`, options: ["Tea", "Coffee"] });
    await chain.vote(id, 1, 4);
    await page.goto(`/poll/${id}`);
    await page.getByTestId("copy-link").click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:5190/poll/${id}`);
    await expect(page.getByTestId("share-x")).toHaveAttribute("target", "_blank");

    const [csv] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
    expect(csv.suggestedFilename()).toBe(`ballot-poll-${id}.csv`);
    const text = readFileSync((await csv.path())!, "utf8");
    expect(text).toContain('"Coffee","1","100","1"');
    expect(text).toContain('""me""'); // quotes inside a title are escaped

    const [json] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
    const data = JSON.parse(readFileSync((await json.path())!, "utf8"));
    expect(data.polls[0]).toMatchObject({ id: id.toString(), totalVotes: "1" });
  });

  test("footer: brand statement, product + verify links, network status", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator(".site-footer");
    await expect(footer).toContainText("can't change results");
    for (const name of ["All polls", "Results", "Create a poll", "Documentation", "Support & FAQ", "How results are secured"]) {
      await expect(footer.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(footer.getByTestId("network-indicator")).toContainText(/block \d+/);
  });

  test("symmetry: every section's columns share the same left edges on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await chain.createPoll({ title: `Grid ${Date.now()}` });
    await page.goto("/");
    await expect(page.getByTestId("open-poll-card").first()).toBeVisible();
    await expect(page.getByTestId("activity")).toBeVisible();
    const lefts = (sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    const grid = await lefts("#how-it-works .step-card");
    expect(grid).toHaveLength(3);
    expect(await lefts("#polls [data-testid=open-poll-card]").then((l) => l.slice(0, 3))).toEqual(grid);
    expect(await lefts(".featured-card > *")).toEqual([grid[0], grid[2]]);
    expect(await lefts("#security .split > *")).toEqual([grid[0], grid[1]]);
    expect(await lefts("#faq .split > *")).toEqual([grid[0], grid[1]]);
    expect(await lefts(".footer-grid > *")).toEqual(grid);
  });
});
