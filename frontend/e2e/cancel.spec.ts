import { chain, expect, test } from "./fixtures";

test.describe("Cancel", () => {
  test("creator cancels a poll with no votes; it shows Cancelled with no result bars", async ({ page, wallet }) => {
    const id = await chain.createPoll({ from: 7, title: "Cancel me" });
    await wallet.install({ as: 7 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await page.getByRole("button", { name: "Cancel poll" }).click();
    await expect(page.getByTestId("status-pill")).toHaveText("Cancelled");
    await expect(page.getByTestId("cancelled-notice")).toBeVisible();
    await expect(page.getByTestId("results-cancelled")).toBeVisible();
    await expect(page.locator(".bar-track")).toHaveCount(0);

    await page.goto("/?tab=closed");
    await expect(page.locator(`[data-poll-id="${id}"]`)).toContainText("Cancelled");
  });

  test("non-creators never see the cancel button", async ({ page, wallet }) => {
    const id = await chain.createPoll({ from: 7, title: "Not yours" });
    await wallet.install({ as: 2 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await expect(page.getByTestId("poll-title")).toHaveText("Not yours");
    await expect(page.getByRole("button", { name: "Cancel poll" })).toHaveCount(0);
  });
});
