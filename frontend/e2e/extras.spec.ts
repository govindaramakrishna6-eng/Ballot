import { chain, expect, test } from "./fixtures";

test.describe("Phase 6 extras", () => {
  test("/me lists exactly the polls this wallet voted in, with the choice", async ({ page, wallet }) => {
    const voted = await chain.createPoll({ title: `Voted in ${Date.now()}` });
    const skipped = await chain.createPoll({ title: `Not voted ${Date.now()}` });
    await chain.vote(voted, 2, 15);

    await wallet.install({ as: 15 });
    await page.goto("/me");
    await expect(page.getByTestId("empty-state")).toContainText("Connect a wallet");
    await wallet.connect();
    await expect(page.locator(`[data-poll-id="${voted}"]`).getByTestId("my-choice")).toHaveText("Your choice: Gamma");
    await expect(page.locator(`[data-poll-id="${skipped}"]`)).toHaveCount(0);

    await wallet.setAccount(16); // a wallet with no votes at all
    await expect(page.getByTestId("empty-state")).toContainText("hasn't voted");
  });

  test("share link copies the poll URL", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const id = await chain.createPoll({ title: "Share me" });
    await page.goto(`/poll/${id}`);
    await page.getByTestId("share").click();
    await expect(page.getByTestId("share-status")).toHaveText("Link copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:5190/poll/${id}`);
  });
});
