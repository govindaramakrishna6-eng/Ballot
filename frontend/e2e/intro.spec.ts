import { expect, test } from "./fixtures";

test.describe("Brand intro", () => {
  test("plays once per session, then the app; the logo stays in the header", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByTestId("intro");
    await expect(intro).toBeVisible();
    await expect(intro).toContainText("Ballot");
    await expect(intro.locator(".logo-mark")).toBeVisible();
    await expect(intro).toBeHidden({ timeout: 5000 }); // ~2.3s play + fade
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Verifiable, tamper‑proof voting");

    // Same session: no intro on reload or on other pages.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(intro).toHaveCount(0);

    const brand = page.getByRole("link", { name: "Ballot — home" }).first();
    await expect(brand.locator(".logo-mark")).toBeVisible();
  });

  test("any click or key skips it immediately", async ({ page }) => {
    await page.goto("/polls");
    const intro = page.getByTestId("intro");
    await expect(intro).toBeVisible();
    await page.keyboard.press("Space");
    await expect(intro).toBeHidden({ timeout: 1000 });
    await expect(page.getByRole("heading", { name: "All polls" })).toBeVisible();
  });

  test("reduced motion: a brief still logo, no animation", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", baseURL: "http://localhost:5190" });
    const page = await context.newPage();
    await page.goto("/");
    const intro = page.getByTestId("intro");
    await expect(intro).toHaveClass(/intro-still/);
    expect(await page.evaluate(() => document.getAnimations().filter((a) => (a as CSSAnimation).animationName?.startsWith("lm-")).length)).toBe(0);
    await expect(intro).toBeHidden({ timeout: 2000 });
    await context.close();
  });

  test("favicon and page title are set", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Ballot — verifiable, tamper-proof voting/);
    const icon = await page.locator('link[rel="icon"]').getAttribute("href");
    expect(icon).toBe("/favicon.svg");
    const res = await page.request.get(icon!);
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain("<svg");
  });
});
