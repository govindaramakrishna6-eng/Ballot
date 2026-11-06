import { chain, expect, test } from "./fixtures";

test.describe("Voting", () => {
  test("vote → receipt; double vote blocked; survives reload; my-vote mark on the list", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Vote flow" });
    await wallet.install({ as: 2 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();

    await page.getByRole("radio", { name: "Beta" }).check();
    await page.getByRole("button", { name: "Cast vote" }).click();

    const receipt = page.getByTestId("receipt");
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText("Beta");
    await expect(page.getByTestId("receipt-hash")).toContainText(/0x[0-9a-f]{64}/);
    await expect(page.getByTestId("announcer")).toContainText("Your vote is recorded on-chain");

    // Double vote: the form is gone and the page says why.
    await expect(page.getByRole("button", { name: "Cast vote" })).toHaveCount(0);
    await expect(page.getByTestId("already-voted")).toContainText("You voted for Beta");

    await page.reload();
    await expect(page.getByTestId("receipt")).toContainText("Beta");
    expect((await chain.getPoll(id)).voteCounts).toEqual([0n, 1n, 0n]);

    await page.goto("/");
    await expect(page.locator(`[data-poll-id="${id}"]`).getByTestId("my-vote-mark")).toBeVisible();
  });

  test("a second vote from the same wallet is refused by simulation with a plain sentence", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Sneaky double vote" });
    await wallet.install({ as: 3 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await page.getByRole("radio", { name: "Alpha" }).check();

    // Mute live updates for this page so it keeps showing the form (as a stale tab would):
    // forward every RPC call but blank out event-filter results.
    await page.route("http://127.0.0.1:8545/**", async (route) => {
      const sent = JSON.parse(route.request().postData() ?? "null");
      const response = await route.fetch();
      const body = await response.json();
      const calls = Array.isArray(sent) ? sent : [sent];
      const results = Array.isArray(body) ? body : [body];
      results.forEach((r, i) => {
        if (calls[i]?.method === "eth_getFilterChanges" || calls[i]?.method === "eth_getLogs") r.result = [];
      });
      await route.fulfill({ response, json: Array.isArray(body) ? results : results[0] });
    });

    // The same wallet votes from another tab/device.
    await chain.vote(id, 0, 3);
    await page.getByRole("button", { name: "Cast vote" }).click();
    await expect(page.getByTestId("tx-error")).toContainText("This wallet has already voted in this poll.");
    await expect(page.getByTestId("tx-error").getByText("Details")).toBeVisible(); // raw text hidden behind a toggle
    expect((await chain.getPoll(id)).totalVotes).toBe(1n);
  });

  test("user rejection in the wallet is neutral and nothing changes", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Reject me" });
    await wallet.install({ as: 2 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await wallet.rejectNext();
    await page.getByRole("radio", { name: "Gamma" }).check();
    await page.getByRole("button", { name: "Cast vote" }).click();
    await expect(page.getByTestId("tx-status")).toHaveText("Vote not sent.");
    await expect(page.getByTestId("tx-error")).toHaveCount(0); // not shown as a red error
    await expect(page.getByRole("button", { name: "Cast vote" })).toBeEnabled();
    expect((await chain.getPoll(id)).totalVotes).toBe(0n);
  });

  test("insufficient funds explains the problem", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Broke voter" });
    const { ACCOUNTS } = await import("./fixtures");
    await chain.setBalance(ACCOUNTS[9], 0n);
    await wallet.install({ as: 9 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await page.getByRole("radio", { name: "Alpha" }).check();
    await page.getByRole("button", { name: "Cast vote" }).click();
    await expect(page.getByTestId("tx-error")).toContainText("doesn't have enough");
    expect((await chain.getPoll(id)).totalVotes).toBe(0n);
  });

  test("refresh while the vote is pending resumes watching it", async ({ page, wallet }) => {
    const id = await chain.createPoll({ title: "Pending refresh" });
    await wallet.install({ as: 5 });
    await page.goto(`/poll/${id}`);
    await wallet.connect();
    await chain.setAutomine(false);
    try {
      await page.getByRole("radio", { name: "Alpha" }).check();
      await page.getByRole("button", { name: "Cast vote" }).click();
      await expect(page.getByTestId("tx-status")).toContainText("Vote sent");
      const hash = await page.getByTestId("tx-hash").getAttribute("title");

      await page.reload();
      await expect(page.getByTestId("tx-status")).toContainText("Vote sent");
      await expect(page.getByTestId("tx-hash")).toHaveAttribute("title", hash!);
      await expect(page.getByRole("button", { name: /Working/ })).toBeDisabled(); // no double submit

      await chain.mine();
      await expect(page.getByTestId("receipt")).toBeVisible();
      await expect(page.getByTestId("receipt-hash")).toContainText(hash!);
    } finally {
      await chain.setAutomine(true);
    }
  });
});
