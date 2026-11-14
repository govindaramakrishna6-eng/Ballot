import { chromium } from "@playwright/test";
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

  test("sound blocked by the browser (first visit): the intro stays silent, never a late out-of-sync sound", async ({ page }) => {
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
    await expect(page.getByTestId("intro-sound")).toHaveCount(0); // no "Tap for sound" button
    await page.waitForTimeout(400);
    await page.keyboard.press("Space"); // the first gesture skips the intro…
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as never as { __snd: number }).__snd)).toBe(0); // …without a stray thunk
  });

  test("sound allowed: the drop sound lands exactly when the ballot hits the box", async () => {
    // A browser that permits sound without a gesture (like a returning visitor Chrome trusts).
    const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
    const page = await browser.newPage({ baseURL: "http://localhost:5190" });
    await page.addInitScript(() => {
      // Record when each oscillator is scheduled, converted to the page's animation clock (ms).
      const w = window as never as { __starts: { ms: number; anim: number | null }[] };
      w.__starts = [];
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        const osc = create.call(this);
        const ctx = this as AudioContext;
        const start = osc.start.bind(osc);
        osc.start = (when = 0) => {
          const ms = (document.timeline.currentTime as number) + (when - ctx.currentTime) * 1000;
          const anim = document
            .getAnimations()
            .find((a) => (a as CSSAnimation).animationName === "lm-cube-in" && typeof a.startTime === "number");
          w.__starts.push({ ms, anim: (anim?.startTime as number) ?? null });
          start(when);
        };
        return osc;
      };
    });
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => (window as never as { __starts: unknown[] }).__starts.length)).toBeGreaterThan(0);
    // The drop "thunk" is the first tone the intro schedules (slide and ticks are noise, the chime comes after).
    const first = await page.evaluate(() => (window as never as { __starts: { ms: number; anim: number | null }[] }).__starts[0]);
    const thunkMs = first.ms;
    const animStart = first.anim ?? NaN;
    // The ballot reaches the slot at 400ms + 82% of 1150ms ≈ 1343ms into the animation.
    expect(Math.abs(thunkMs - (animStart + 1343))).toBeLessThan(40);
    await browser.close();
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
