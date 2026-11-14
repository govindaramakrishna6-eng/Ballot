// Not a test: records a ~45 s explainer video of the real app on a local chain (run: npm run video).
// The raw recording lands in test-results/; scripts/make-video.sh turns it into docs/ballot-explainer.mp4.
import type { Locator, Page } from "@playwright/test";
import { chain, expect, test } from "./fixtures";

test.skip(!process.env.VIDEO, "only when VIDEO=1");
test.use({ viewport: { width: 1280, height: 720 }, video: { mode: "on", size: { width: 1280, height: 720 } } });
test.setTimeout(180_000);

/** A visible pointer (headless recordings have none) plus a caption bar. Our own fixed text, set via textContent. */
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

    const cap = document.createElement("div");
    cap.id = "vid-caption";
    cap.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483646;pointer-events:none;" +
      "background:#1D2B2A;color:#FFFDF8;font:600 22px/1.35 'Figtree Variable',Figtree,system-ui,sans-serif;" +
      "padding:12px 22px;border-radius:12px;box-shadow:4px 4px 0 #1D7F5C;max-width:1060px;text-align:center;" +
      "opacity:0;transition:opacity 250ms";
    document.body.appendChild(cap);
    const saved = sessionStorage.getItem("vid-caption");
    if (saved) {
      cap.textContent = saved;
      cap.style.opacity = "1";
    }
  };
  if (document.body) ready();
  else addEventListener("DOMContentLoaded", ready);
}

async function caption(page: Page, text: string) {
  await page.evaluate((t) => {
    sessionStorage.setItem("vid-caption", t);
    const cap = document.getElementById("vid-caption");
    if (!cap) return;
    cap.style.opacity = t ? "1" : "0";
    cap.textContent = t;
  }, text);
}

/** Glide the pointer to an element, pause like a person would, then click. */
async function press(page: Page, target: Locator, pause = 250) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
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
      "justify-content:center;gap:18px;color:#1D2B2A;opacity:0;transition:opacity 500ms";
    const title = document.createElement("div");
    title.textContent = "Ballot";
    title.style.cssText = "font:700 96px/1 'Fraunces Variable',Fraunces,serif;letter-spacing:-0.02em";
    const line = document.createElement("div");
    line.textContent = "Every vote is provable — and you get the receipt.";
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
  // Make the chain look lived-in: a couple of polls with votes from other wallets.
  const featured = await chain.createPoll({
    from: 3,
    title: "Which day works for the monthly clean-up?",
    options: ["Saturday", "Sunday"],
  });
  for (const [v, o] of [[10, 0], [11, 1], [12, 0], [13, 0]] as const) await chain.vote(featured, o, v);
  const garden = await chain.createPoll({
    from: 4,
    title: "Should the community garden add a second compost bay?",
    options: ["Yes, this season", "Yes, next spring", "No"],
  });
  for (const [v, o] of [[10, 0], [11, 0], [12, 1], [13, 2], [14, 0]] as const) await chain.vote(garden, o, v);

  // Let the brand intro play this time (the fixture marks it "seen" for normal tests).
  await page.addInitScript(() => sessionStorage.removeItem("ballot:intro-seen"));
  await page.addInitScript(installOverlay);
  await wallet.install({ as: 2 });

  // 1 · Intro + what it is
  await page.goto("/");
  await page.waitForTimeout(2600);
  await caption(page, "Ballot: polls on Ethereum where every vote is provable.");
  await page.waitForTimeout(2600);
  await caption(page, "Anyone can create a poll. Each wallet votes once. Everyone can see the results.");
  await page.mouse.move(400, 560, { steps: 20 });
  const ballotTile = page.locator(".tile-ballot").last();
  if (await ballotTile.count()) {
    const b = (await ballotTile.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
  }
  await page.waitForTimeout(2400);

  // 2 · Connect
  await caption(page, "1  Connect your wallet: MetaMask or any browser wallet.");
  await press(page, page.getByRole("button", { name: "Connect Wallet" }), 400);
  await press(page, page.getByRole("button", { name: /Browser Wallet|Injected/i }), 300);
  await expect(page.getByRole("button", { name: "Connect Wallet" })).toHaveCount(0);
  await page.waitForTimeout(900);

  // 3 · Create
  await caption(page, "2  Create a poll: a question, 2 to 10 options and a deadline.");
  await press(page, page.locator("nav[aria-label='Main']").getByRole("link", { name: "Create" }));
  const title = page.getByLabel("Question");
  await press(page, title, 100);
  await title.pressSequentially("Where should the club go for the year-end trip?", { delay: 28 });
  await press(page, page.getByPlaceholder("Option 1"), 80);
  await page.getByPlaceholder("Option 1").pressSequentially("Hills", { delay: 40 });
  await press(page, page.getByPlaceholder("Option 2"), 80);
  await page.getByPlaceholder("Option 2").pressSequentially("Beach", { delay: 40 });
  await press(page, page.getByRole("button", { name: "Add option" }), 120);
  await page.getByPlaceholder("Option 3").pressSequentially("Heritage town", { delay: 35 });
  await press(page, page.getByRole("button", { name: "7 days" }), 150);
  await press(page, page.getByRole("button", { name: "Review" }), 200);
  await caption(page, "The contract enforces every rule. Once it's signed, nobody can edit it, not even us.");
  await expect(page.getByTestId("review")).toBeVisible();
  await page.waitForTimeout(1300);
  await press(page, page.getByRole("button", { name: "Sign and create poll" }), 250);
  await expect(page).toHaveURL(/\/poll\/\d+$/);
  const id = BigInt(page.url().split("/").pop()!);
  // Other club members vote too, so the results have something to show.
  for (const [v, o] of [[10, 1], [11, 0], [12, 1]] as const) await chain.vote(id, o, v);
  await page.waitForTimeout(800);

  // 4 · Vote + receipt
  await caption(page, "3  Vote once. The app checks the vote before your wallet even opens.");
  await press(page, page.getByRole("radio", { name: "Beach" }), 250);
  await press(page, page.getByRole("button", { name: "Cast vote" }), 250);
  await expect(page.getByTestId("receipt")).toBeVisible();
  await caption(page, "You get a ballot receipt: transaction, block and time, read back from the blockchain.");
  await page.getByTestId("receipt").scrollIntoViewIfNeeded();
  const r = (await page.getByTestId("receipt").boundingBox())!;
  await page.mouse.move(r.x + r.width * 0.6, r.y + r.height * 0.55, { steps: 25 });
  await page.waitForTimeout(4600);
  await caption(page, "Anyone can check it on Etherscan. No need to trust this website.");
  await page.waitForTimeout(3200);

  // 5 · Results
  await caption(page, "4  Results update live, for everyone, even without a wallet.");
  await press(page, page.locator("nav[aria-label='Main']").getByRole("link", { name: "Results" }));
  await page.waitForTimeout(1200);
  const most = page.getByText("Most voted").first();
  const m = (await most.boundingBox())!;
  await page.mouse.move(m.x + 160, m.y + 60, { steps: 25 });
  await page.waitForTimeout(3600);

  await endCard(page);
  await page.waitForTimeout(3600);
});
