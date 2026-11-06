import { expect, test } from "./fixtures";

for (const path of ["/definitely-not-a-page", "/poll/999999", "/poll/abc", "/poll/0", "/poll/01"]) {
  test(`not-found state for ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByTestId("not-found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to all polls" })).toBeVisible();
  });
}
