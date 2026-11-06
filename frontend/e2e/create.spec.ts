import { chain, expect, test } from "./fixtures";

test.describe("Create poll", () => {
  test("validates like the contract, reviews, signs, then opens the new poll", async ({ page, wallet }) => {
    await wallet.install({ as: 1 });
    await page.goto("/create");
    await wallet.connect();

    const title = page.getByLabel("Question");
    // Tamil letters are 3 bytes each: the counter must count bytes, not characters.
    await title.fill("த".repeat(41));
    await expect(page.getByText("123/120 bytes")).toBeVisible();
    const unique = `Tea or coffee? ${Date.now()}`;
    await title.fill(unique);

    await page.getByLabel("Description (optional)").fill("Line one\nLine two");
    await page.getByPlaceholder("Option 1").fill("Tea");
    await page.getByPlaceholder("Option 2").fill("tea");
    await expect(page.getByTestId("option-msg-1")).toContainText("different capitalisation");

    await page.getByRole("button", { name: "Add option" }).click();
    await page.getByPlaceholder("Option 3").fill("Tea");
    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByTestId("option-msg-2")).toHaveText("Same as option 1.");

    await page.getByPlaceholder("Option 3").fill("Coffee");
    await page.getByRole("button", { name: "1 day" }).click();
    await page.getByRole("button", { name: "Review" }).click();

    await expect(page.getByText("This is permanent and can't be edited.")).toBeVisible();
    await expect(page.getByTestId("review")).toContainText(unique);
    await page.getByRole("button", { name: "Sign and create poll" }).click();

    await expect(page).toHaveURL(/\/poll\/\d+$/);
    await expect(page.getByTestId("poll-title")).toHaveText(unique);
    await expect(page.getByText("Line one\nLine two")).toBeVisible();
    await expect(page.getByTestId("total-votes")).toHaveText("No votes yet");

    const id = BigInt(page.url().split("/").pop()!);
    const onChain = await chain.getPoll(id);
    expect(onChain.options).toEqual(["Tea", "tea", "Coffee"]);
  });

  test("Mine tab lists polls created by the connected wallet", async ({ page, wallet }) => {
    const mine = await chain.createPoll({ from: 6, title: `Mine ${Date.now()}` });
    await wallet.install({ as: 6 });
    await page.goto("/?tab=mine");
    await expect(page.getByTestId("empty-state")).toContainText("Connect a wallet");
    await wallet.connect();
    await expect(page.locator(`[data-poll-id="${mine}"]`)).toBeVisible();
    await expect(page.getByTestId("poll-card")).toHaveCount(1);
  });
});
