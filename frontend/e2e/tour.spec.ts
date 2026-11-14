import { chain, expect, test } from "./fixtures";

test.describe("First-visit guided tour", () => {
  test("starts after the intro, points at each feature, and remembers it's done", async ({ page }) => {
    await chain.createPoll({ title: `Tour poll ${Date.now()}` });
    await page.addInitScript(() => sessionStorage.setItem("ballot:intro-seen", "1"));
    await page.goto("/");

    const tour = page.getByTestId("tour");
    await expect(tour).toBeVisible({ timeout: 5000 });
    await expect(tour.getByRole("dialog")).toContainText("Step 1 of 5");
    await expect(tour.getByRole("heading")).toHaveText("Connect your wallet");

    // The spotlight surrounds the wallet button and the pointer sits over it.
    const target = (await page.locator(".header-wallet").boundingBox())!;
    const spot = (await tour.locator(".tour-spot").boundingBox())!;
    expect(spot.x).toBeLessThanOrEqual(target.x);
    expect(spot.x + spot.width).toBeGreaterThanOrEqual(target.x + target.width);
    await expect(page.getByTestId("tour-next")).toBeFocused();

    await page.getByTestId("tour-next").click();
    await expect(tour.getByRole("heading")).toHaveText("Create a poll");
    await page.getByTestId("tour-next").click();
    await expect(tour.getByRole("heading")).toHaveText("Vote");
    await tour.getByRole("button", { name: "Back" }).click();
    await expect(tour.getByRole("heading")).toHaveText("Create a poll");

    await page.keyboard.press("Escape");
    await expect(tour).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("tour")).toHaveCount(0); // remembered

    await page.getByTestId("take-tour").click(); // replay from the footer
    await expect(page.getByTestId("tour").getByRole("heading")).toHaveText("Connect your wallet");
  });

  test("walks all five steps to the end", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("ballot:intro-seen", "1"));
    await page.goto("/");
    const tour = page.getByTestId("tour");
    await expect(tour).toBeVisible({ timeout: 5000 });
    for (const title of ["Connect your wallet", "Create a poll", "Vote", "Watch the results", "The live blockchain"]) {
      await expect(tour.getByRole("heading")).toHaveText(title);
      await page.getByTestId("tour-next").click();
    }
    await expect(tour).toHaveCount(0);
  });
});

test.describe("Live block boxes", () => {
  test("blocks render as boxes; Ballot blocks are green; hover shows what's inside", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("ballot:intro-seen", "1");
      localStorage.setItem("ballot:tour-done", "1");
    });
    await chain.createPoll({ title: `Ribbon ${Date.now()}` });
    await page.goto("/");
    const ribbon = page.getByTestId("block-ribbon");
    await expect(ribbon.locator(".tile").first()).toBeVisible();
    const ballotTile = ribbon.locator(".tile-ballot").last();
    await expect(ballotTile).toBeVisible();
    await ballotTile.locator("> span, > a").hover();
    await expect(ballotTile.locator(".tile-tip")).toBeVisible();
    await expect(ballotTile.locator(".tile-tip")).toContainText(/Block [\d,]+/);
    await expect(ballotTile.locator(".tile-tip")).toContainText(/new poll|Ballot vote/);
  });
});
