// Not a test: renders the real app into docs/screenshots (run: npm run screenshots).
import { chain, expect, test } from "./fixtures";

const OUT = "../docs/screenshots";

test.skip(!process.env.SCREENSHOTS, "only when SCREENSHOTS=1");

for (const scheme of ["light", "dark"] as const) {
  test(`screenshots (${scheme})`, async ({ page, wallet }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1100, height: 900 });
    const id = await chain.createPoll({
      title: "Should the community garden add a second compost bay?",
      options: ["Yes, this season", "Yes, next spring", "No"],
    });
    for (const [voter, option] of [[10, 0], [11, 0], [12, 1], [13, 2], [14, 0]] as const) await chain.vote(id, option, voter);
    await chain.createPoll({ title: "Which day works for the monthly clean-up?", options: ["Saturday", "Sunday"] });

    await wallet.install({ as: 2 });
    await page.goto("/");
    await wallet.connect();
    await page.screenshot({ path: `${OUT}/list-${scheme}.png`, fullPage: true });

    await page.goto(`/poll/${id}`);
    await page.getByRole("radio", { name: "Yes, this season" }).check();
    await page.getByRole("button", { name: "Cast vote" }).click();
    await expect(page.getByTestId("receipt")).toBeVisible();
    await page.waitForTimeout(600); // let the stamp animation settle
    await page.screenshot({ path: `${OUT}/poll-${scheme}.png`, fullPage: true });

    await page.goto("/create");
    await page.getByLabel("Question").fill("Where should the new bench go?");
    await page.getByPlaceholder("Option 1").fill("By the pond");
    await page.getByPlaceholder("Option 2").fill("by the pond");
    await page.screenshot({ path: `${OUT}/create-${scheme}.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/poll/${id}`);
    await expect(page.getByTestId("receipt")).toBeVisible();
    await page.screenshot({ path: `${OUT}/poll-mobile-${scheme}.png`, fullPage: true });
  });
}
