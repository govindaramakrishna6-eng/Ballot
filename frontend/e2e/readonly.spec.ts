import { chain, expect, test } from "./fixtures";

test.describe("No wallet installed (read-only mode)", () => {
  test("browsing works: list, poll page and results, with an install hint", async ({ page }) => {
    const id = await chain.createPoll({ title: "Read-only check" });
    await chain.vote(id, 1, 4);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Open polls" })).toBeVisible();
    await expect(page.getByTestId("open-poll-card").first()).toBeVisible();
    await page.goto("/polls");
    await expect(page.locator(`[data-poll-id="${id}"]`)).toContainText("Read-only check");

    await page.goto(`/poll/${id}`);
    await expect(page.getByTestId("no-wallet")).toContainText("No wallet detected");
    await expect(page.getByTestId("no-wallet").getByRole("link", { name: "MetaMask" })).toHaveAttribute("href", /metamask\.io/);
    await expect(page.getByTestId("poll-title")).toHaveText("Read-only check");
    await expect(page.getByTestId("total-votes")).toHaveText("1 vote total");
    await expect(page.getByTestId("write-disabled")).toHaveText("Connect a wallet to continue.");
    await expect(page.getByRole("button", { name: "Cast vote" })).toBeDisabled();
  });
});
