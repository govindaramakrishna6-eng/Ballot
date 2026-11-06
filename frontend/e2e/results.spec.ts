import { chain, expect, test } from "./fixtures";

test.describe("Results", () => {
  test("zero votes, then a live tie, then a winner once closed — no reloads", async ({ page }) => {
    const id = await chain.createPoll({ title: "Live results", durationSec: 600n });
    await page.goto(`/poll/${id}`);
    await expect(page.getByTestId("total-votes")).toHaveText("No votes yet");
    await expect(page.getByTestId("result-count").first()).toHaveText("0 · —"); // no NaN

    await chain.vote(id, 0, 10);
    await chain.vote(id, 1, 11);
    await expect(page.getByTestId("tied")).toBeVisible(); // arrived via event watcher
    await expect(page.getByTestId("winner")).toHaveCount(0);

    await chain.vote(id, 1, 12);
    await expect(page.getByTestId("tied")).toHaveCount(0);
    await expect(page.getByTestId("winner")).toHaveCount(0); // still open: no Winner yet

    await chain.timeTravel(700);
    await expect(page.getByTestId("status-pill")).toHaveText("Closed");
    await expect(page.getByTestId("winner")).toBeVisible();
    await expect(page.getByTestId("result-row").nth(1)).toContainText("Winner");
    await expect(page.getByTestId("result-count").nth(1)).toHaveText("2 · 67%");
  });

  test("a poll expiring while open flips to Closed without a refresh", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "About to close", durationSec: 400n });
    await wallet.install({ as: 2 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await expect(page.getByTestId("status-pill")).toHaveText("Open");
    await expect(page.getByRole("button", { name: "Cast vote" })).toBeVisible();

    await chain.timeTravel(500);
    await expect(page.getByTestId("status-pill")).toHaveText("Closed");
    await expect(page.getByRole("button", { name: "Cast vote" })).toHaveCount(0);
    await expect(page.getByTestId("voting-closed")).toBeVisible();
  });
});
