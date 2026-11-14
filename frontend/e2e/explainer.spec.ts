// Not a test: records the explainer video of the real app on a local chain (run: npm run video).
// Each narration line ("beat") from explainer-script.json is shown as a subtitle while its on-screen actions run,
// and the next beat waits until the spoken line (durations from VO_DURS) has finished, so voice and picture stay in step.
// Writes test-results/explainer-marks.json (when each beat started) for the audio mix.
import { readFileSync, writeFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { chain, expect, test } from "./fixtures";
import script from "./explainer-script.json" with { type: "json" };

test.skip(!process.env.VIDEO, "only when VIDEO=1");
test.use({ viewport: { width: 1280, height: 720 }, video: { mode: "on", size: { width: 1280, height: 720 } } });
test.setTimeout(400_000);

const GAP_MS = 550; // breathing room after each spoken line
const durations: number[] = process.env.VO_DURS
  ? JSON.parse(readFileSync(process.env.VO_DURS, "utf8"))
  : script.map((l) => l.text.split(" ").length / 2.4); // rough reading pace when no audio is supplied

/** A visible pointer (headless recordings have none), a chapter chip and a subtitle bar. Our own text, set via textContent. */
function installOverlay() {
  const ready = () => {
    if (document.getElementById("vid-cursor")) return;
    const svgNs = "http://www.w3.org/2000/svg";
    const cursor = document.createElementNS(svgNs, "svg");
    cursor.id = "vid-cursor";
    cursor.setAttribute("width", "26");
    cursor.setAttribute("height", "26");
    cursor.setAttribute("viewBox", "0 0 24 24");
    cursor.style.cssText =
      "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transition:transform 60ms linear;transform:translate(640px,500px)";
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", "M3 2l7 19 2.6-7.4L20 11z");
    path.setAttribute("fill", "#1D2B2A");
    path.setAttribute("stroke", "#FFFDF8");
    path.setAttribute("stroke-width", "1.6");
    path.setAttribute("stroke-linejoin", "round");
    cursor.appendChild(path);
    document.body.appendChild(cursor);
    addEventListener("mousemove", (e) => (cursor.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`), true);

    const box = document.createElement("div");
    box.id = "vid-caption";
    box.style.cssText =
      "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483646;pointer-events:none;" +
      "display:flex;flex-direction:column;align-items:center;gap:8px;width:max-content;max-width:1040px;" +
      "opacity:0;transition:opacity 250ms";
    const chip = document.createElement("div");
    chip.id = "vid-chapter";
    chip.style.cssText =
      "font:600 13px/1 'JetBrains Mono Variable',monospace;letter-spacing:.08em;text-transform:uppercase;" +
      "background:#1D7F5C;color:#FFFDF8;padding:7px 12px;border:2px solid #1D2B2A;border-radius:8px";
    const sub = document.createElement("div");
    sub.id = "vid-sub";
    sub.style.cssText =
      "background:rgba(29,43,42,.94);color:#FFFDF8;font:500 20px/1.4 'Figtree Variable',Figtree,system-ui,sans-serif;" +
      "padding:10px 20px;border-radius:12px;text-align:center";
    box.append(chip, sub);
    document.body.appendChild(box);
    const saved = sessionStorage.getItem("vid-caption");
    if (saved) {
      const { chapter, text } = JSON.parse(saved);
      chip.textContent = chapter;
      chip.style.display = chapter ? "" : "none";
      sub.textContent = text;
      box.style.opacity = "1";
    }
  };
  if (document.body) ready();
  else addEventListener("DOMContentLoaded", ready);
}

async function caption(page: Page, chapter: string, text: string) {
  await page.evaluate(
    ({ chapter, text }) => {
      sessionStorage.setItem("vid-caption", JSON.stringify({ chapter, text }));
      const box = document.getElementById("vid-caption");
      const chip = document.getElementById("vid-chapter");
      const sub = document.getElementById("vid-sub");
      if (!box || !chip || !sub) return;
      chip.textContent = chapter;
      chip.style.display = chapter ? "" : "none";
      sub.textContent = text;
      box.style.opacity = "1";
    },
    { chapter, text },
  );
}

async function glide(page: Page, target: Locator, steps = 28) {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
}

/** Scroll an element into view the way a person would (smoothly), then let it settle. */
async function smoothTo(page: Page, target: Locator, block: ScrollLogicalPosition = "center") {
  await target.evaluate((el, b) => el.scrollIntoView({ behavior: "smooth", block: b }), block);
  await page.waitForTimeout(900);
}

/** Glide the pointer to an element, pause like a person would, then click. */
async function press(page: Page, target: Locator, pause = 350) {
  await target.scrollIntoViewIfNeeded();
  await glide(page, target, 24);
  await page.waitForTimeout(pause);
  await target.click();
}

async function endCard(page: Page) {
  await page.evaluate(() => {
    document.getElementById("vid-caption")?.remove();
    document.getElementById("vid-cursor")?.remove();
    const card = document.createElement("div");
    card.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:#FAF6EE;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:18px;color:#1D2B2A;opacity:0;transition:opacity 600ms";
    const title = document.createElement("div");
    title.textContent = "Ballot";
    title.style.cssText = "font:700 104px/1 'Fraunces Variable',Fraunces,serif;letter-spacing:-0.02em";
    const line = document.createElement("div");
    line.textContent = "Every vote is provable, and you get the receipt.";
    line.style.cssText = "font:500 28px/1.3 'Figtree Variable',Figtree,sans-serif;color:#4B5A58";
    const url = document.createElement("div");
    url.textContent = "ballot-omega.vercel.app  ·  Ethereum Sepolia";
    url.style.cssText =
      "margin-top:14px;font:600 24px/1 'JetBrains Mono Variable',monospace;background:#1D7F5C;color:#FFFDF8;" +
      "padding:14px 24px;border:2px solid #1D2B2A;border-radius:12px;box-shadow:4px 4px 0 #1D2B2A";
    card.append(title, line, url);
    document.body.appendChild(card);
    requestAnimationFrame(() => (card.style.opacity = "1"));
  });
}

test("explainer video", async ({ page, wallet }) => {
  const bodyStart = Date.now(); // ≈ when the recording began (the page already exists)

  // A lived-in chain: polls with votes from other wallets. One closes within days so "final" results exist later.
  const cleanup = await chain.createPoll({
    from: 3,
    title: "Which day works for the monthly clean-up?",
    options: ["Saturday", "Sunday"],
    durationSec: 3n * 86_400n,
  });
  for (const [v, o] of [[10, 0], [11, 1], [12, 0], [13, 0]] as const) await chain.vote(cleanup, o, v);
  const garden = await chain.createPoll({
    from: 4,
    title: "Should the community garden add a second compost bay?",
    options: ["Yes, this season", "Yes, next spring", "No"],
    durationSec: 30n * 86_400n,
  });
  for (const [v, o] of [[10, 0], [11, 0], [12, 1], [13, 2], [14, 0]] as const) await chain.vote(garden, o, v);

  await page.addInitScript(() => sessionStorage.removeItem("ballot:intro-seen")); // let the brand intro play
  await page.addInitScript(installOverlay);
  await wallet.install({ as: 2 });
  const nav = page.locator("nav[aria-label='Main']");

  let t0 = 0;
  const marks: number[] = [];
  let n = 0;
  /** Show the next narration line and run its actions; move on only when both the line and the actions are done. */
  const beat = async (act?: () => Promise<unknown>) => {
    const i = n++;
    marks.push(Date.now() - t0);
    await caption(page, script[i].chapter, script[i].text);
    await Promise.all([act?.(), page.waitForTimeout(durations[i] * 1000 + GAP_MS)]);
  };

  await page.goto("/");
  t0 = Date.now();

  // The problem / meet Ballot
  await beat(async () => {
    await page.waitForTimeout(3200); // intro animation
    await page.mouse.move(640, 300, { steps: 30 });
  });
  await beat(async () => {
    const chips = page.locator(".hero-ctas").first();
    await glide(page, chips, 30);
    await page.mouse.move(460, 470, { steps: 40 });
    await page.mouse.move(820, 470, { steps: 60 });
  });
  await beat(async () => {
    const tile = page.locator(".tile-ballot").last();
    if (await tile.count()) await glide(page, tile, 34);
  });
  await beat(() => smoothTo(page, page.locator("#how-it-works"), "start"));

  // Step 1 · Connect
  await beat(async () => {
    await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(900);
    await press(page, page.getByRole("button", { name: "Connect Wallet" }), 500);
    await page.waitForTimeout(900);
    await press(page, page.getByRole("button", { name: /Browser Wallet|Injected/i }), 400);
    await expect(page.getByRole("button", { name: "Connect Wallet" })).toHaveCount(0);
  });

  // Step 2 · Create
  const title = page.getByLabel("Question");
  await beat(async () => {
    await press(page, nav.getByRole("link", { name: "Create" }));
    await press(page, title, 150);
    await title.pressSequentially("Where should the club go for the year-end trip?", { delay: 32 });
  });
  await beat(async () => {
    await press(page, page.getByPlaceholder("Option 1"), 100);
    await page.getByPlaceholder("Option 1").pressSequentially("Hills", { delay: 45 });
    await press(page, page.getByPlaceholder("Option 2"), 100);
    await page.getByPlaceholder("Option 2").pressSequentially("Beach", { delay: 45 });
    await press(page, page.getByRole("button", { name: "Add option" }), 150);
    await page.getByPlaceholder("Option 3").pressSequentially("Heritage town", { delay: 40 });
  });
  await beat(() => press(page, page.getByRole("button", { name: "7 days" }), 300));
  await beat(async () => {
    await glide(page, page.getByText(/\/60 bytes/).nth(2), 30);
    await page.waitForTimeout(1200);
    await glide(page, page.getByText(/\/120 bytes/).first(), 30);
  });
  await beat(async () => {
    await press(page, page.getByRole("button", { name: "Review" }), 300);
    await expect(page.getByTestId("review")).toBeVisible();
    const notice = page.getByText("This is permanent and can't be edited.");
    await smoothTo(page, notice);
    await glide(page, notice, 30);
  });
  let id = 0n;
  await beat(async () => {
    await press(page, page.getByRole("button", { name: "Sign and create poll" }), 300);
    await expect(page).toHaveURL(/\/poll\/\d+$/);
    id = BigInt(page.url().split("/").pop()!);
  });

  // Step 3 · Vote
  await beat(async () => {
    for (const [v, o] of [[10, 1], [11, 0], [12, 1]] as const) {
      await chain.vote(id, o, v);
      await page.waitForTimeout(500);
    }
    await smoothTo(page, page.getByRole("radio", { name: "Beach" }));
  });
  await beat(async () => {
    await press(page, page.getByRole("radio", { name: "Beach" }), 400);
    await page.waitForTimeout(500);
    await press(page, page.getByRole("button", { name: "Cast vote" }), 500);
  });

  // Step 4 · Receipt
  const receipt = page.getByTestId("receipt");
  await beat(async () => {
    await expect(receipt).toBeVisible();
    await page.waitForTimeout(1200); // seal + stamp
    await smoothTo(page, receipt);
  });
  await beat(async () => {
    const r = (await receipt.boundingBox())!;
    await page.mouse.move(r.x + r.width * 0.45, r.y + r.height * 0.5, { steps: 30 });
    await page.waitForTimeout(1500);
    await page.mouse.move(r.x + r.width * 0.45, r.y + r.height * 0.62, { steps: 30 });
    await page.waitForTimeout(1500);
    await glide(page, page.getByTestId("receipt-hash"), 30);
  });
  await beat(async () => {
    const note = page.getByTestId("already-voted");
    await smoothTo(page, note);
    await glide(page, note, 30);
  });

  // Step 5 · Results
  await beat(() => smoothTo(page, page.getByTestId("results"), "start"));
  await beat(async () => {
    await chain.timeTravel(8 * 86_400); // jump past the 7-day deadline
    await expect(page.getByTestId("winner")).toBeVisible({ timeout: 30_000 });
    await glide(page, page.getByTestId("winner"), 30);
  });
  await beat(async () => {
    await press(page, nav.getByRole("link", { name: "Results" }));
    await page.waitForTimeout(800);
    await page.mouse.move(400, 520, { steps: 40 });
    await page.mouse.move(900, 520, { steps: 50 });
  });
  await beat(async () => {
    await press(page, nav.getByRole("link", { name: "My votes" }));
    await page.mouse.move(500, 380, { steps: 40 });
  });

  // Why trust it
  await beat(async () => {
    await press(page, nav.getByRole("link", { name: "Home" }));
    await page.waitForTimeout(600);
    await smoothTo(page, page.getByTestId("trust-points"));
  });

  // End card
  await page.evaluate(() => document.getElementById("vid-caption")?.remove());
  await endCard(page);
  await beat();
  await page.waitForTimeout(1200);

  writeFileSync(
    "test-results/explainer-marks.json",
    JSON.stringify({ trimStartMs: t0 - bodyStart, marksMs: marks, endMs: Date.now() - t0 }),
  );
});
