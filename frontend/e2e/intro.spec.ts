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

  test("sound: no button — when the browser blocks autoplay, it plays on the first keypress/click", async ({ page }) => {
    await page.addInitScript(() => {
      (window as never as { __snd: number }).__snd = 0;
      const osc = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        (window as never as { __snd: number }).__snd++;
        return osc.call(this);
      };
    });
    await page.goto("/");
    await expect(page.getByTestId("intro")).toBeVisible();
    await expect(page.getByTestId("intro-sound")).toHaveCount(0); // no "Tap for sound" button any more
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as never as { __snd: number }).__snd)).toBe(0); // blocked until a gesture
    await page.keyboard.press("Space");
    await expect.poll(() => page.evaluate(() => (window as never as { __snd: number }).__snd)).toBeGreaterThan(0);
  });

  test("sound can be switched off in the footer and the choice is remembered", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("ballot:intro-seen", "1"));
    await page.goto("/");
    const toggle = page.getByTestId("sound-toggle");
    await expect(toggle).toHaveText("Sound: On");
    await toggle.click();
    await expect(toggle).toHaveText("Sound: Off");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(page.getByTestId("sound-toggle")).toHaveText("Sound: Off");
  });
});
