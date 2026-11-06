// Tests for VotingDApp. Each `it` title starts with the CLAUDE.md section 5 checklist item it covers.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

const MIN = 60n;
const DAY = 24n * 60n * MIN;

describe("VotingDApp", async function () {
  const { viem, networkHelpers } = await network.create();
  const { time, loadFixture } = networkHelpers;
  const publicClient = await viem.getPublicClient();

  // A fresh contract per test (loadFixture snapshots and reverts the chain, so it's fast).
  async function deployFixture() {
    const [creator, alice, bob] = await viem.getWalletClients();
    const ballot = await viem.deployContract("VotingDApp");
    const asAlice = await viem.getContractAt("VotingDApp", ballot.address, { client: { wallet: alice } });
    const asBob = await viem.getContractAt("VotingDApp", ballot.address, { client: { wallet: bob } });
    return { ballot, asAlice, asBob, creator, alice, bob };
  }

  // endTime 1 day from the latest block — comfortably inside the 5 min–30 day window.
  async function inOneDay(): Promise<bigint> {
    return BigInt(await time.latest()) + DAY;
  }

  // Deploys and creates one 3-option poll (id 1) ending in one day.
  async function withPollFixture() {
    const f = await deployFixture();
    const endTime = await inOneDay();
    await f.ballot.write.createPoll(["Lunch?", "Pick one", ["Dosa", "Idli", "Vada"], endTime]);
    return { ...f, endTime };
  }

  describe("Creation", function () {
    it("valid poll: stores every field", async function () {
      const { ballot, creator } = await loadFixture(deployFixture);
      const endTime = await inOneDay();
      await ballot.write.createPoll(["Lunch?", "Line 1\nLine 2", ["Dosa", "Idli"], endTime]);
      const poll = await ballot.read.getPoll([1n]);
      assert.equal(poll.id, 1n);
      assert.equal(poll.creator, getAddress(creator.account.address));
      assert.equal(poll.title, "Lunch?");
      assert.equal(poll.description, "Line 1\nLine 2");
      assert.deepEqual(poll.options, ["Dosa", "Idli"]);
      assert.deepEqual(poll.voteCounts, [0n, 0n]);
      assert.equal(poll.endTime, endTime);
      assert.equal(poll.createdAt, BigInt(await time.latest()));
      assert.equal(poll.totalVotes, 0n);
      assert.equal(poll.cancelled, false);
    });

    it("pollCount increments and ids start at 1", async function () {
      const { ballot } = await loadFixture(deployFixture);
      assert.equal(await ballot.read.pollCount(), 0n);
      await ballot.write.createPoll(["A", "", ["x", "y"], await inOneDay()]);
      assert.equal(await ballot.read.pollCount(), 1n);
      await ballot.write.createPoll(["B", "", ["x", "y"], await inOneDay()]);
      assert.equal(await ballot.read.pollCount(), 2n);
      assert.equal((await ballot.read.getPoll([1n])).title, "A");
      assert.equal((await ballot.read.getPoll([2n])).title, "B");
    });

    it("event args correct: PollCreated(id, creator, endTime)", async function () {
      const { ballot, creator } = await loadFixture(deployFixture);
      const endTime = await inOneDay();
      await viem.assertions.emitWithArgs(
        ballot.write.createPoll(["A", "", ["x", "y"], endTime]),
        ballot,
        "PollCreated",
        [1n, getAddress(creator.account.address), endTime],
      );
    });

    it("exactly 2 options OK", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await ballot.write.createPoll(["A", "", ["x", "y"], await inOneDay()]);
      assert.equal((await ballot.read.getPoll([1n])).options.length, 2);
    });

    it("exactly 10 options OK", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const ten = Array.from({ length: 10 }, (_, i) => `opt ${i}`);
      await ballot.write.createPoll(["A", "", ten, await inOneDay()]);
      assert.equal((await ballot.read.getPoll([1n])).options.length, 10);
    });

    it("1 option reverts InvalidOptionCount", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["A", "", ["only"], await inOneDay()]),
        ballot,
        "InvalidOptionCount",
      );
    });

    it("11 options revert InvalidOptionCount", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const eleven = Array.from({ length: 11 }, (_, i) => `opt ${i}`);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["A", "", eleven, await inOneDay()]),
        ballot,
        "InvalidOptionCount",
      );
    });

    it("empty title reverts InvalidTitle", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["", "", ["x", "y"], await inOneDay()]),
        ballot,
        "InvalidTitle",
      );
    });

    it("title of 121 bytes reverts InvalidTitle (120 OK)", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await ballot.write.createPoll(["a".repeat(120), "", ["x", "y"], await inOneDay()]);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["a".repeat(121), "", ["x", "y"], await inOneDay()]),
        ballot,
        "InvalidTitle",
      );
    });

    it("empty option reverts EmptyOption(index)", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await viem.assertions.revertWithCustomErrorWithArgs(
        ballot.write.createPoll(["A", "", ["x", "", "z"], await inOneDay()]),
        ballot,
        "EmptyOption",
        [1n],
      );
    });

    it("61-byte option reverts OptionTooLong(index) (60 OK)", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await ballot.write.createPoll(["A", "", ["x", "b".repeat(60)], await inOneDay()]);
      await viem.assertions.revertWithCustomErrorWithArgs(
        ballot.write.createPoll(["A", "", ["x", "b".repeat(61)], await inOneDay()]),
        ballot,
        "OptionTooLong",
        [1n],
      );
    });

    it("duplicate options revert DuplicateOption(indexA, indexB)", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await viem.assertions.revertWithCustomErrorWithArgs(
        ballot.write.createPoll(["A", "", ["Yes", "No", "Yes"], await inOneDay()]),
        ballot,
        "DuplicateOption",
        [0n, 2n],
      );
    });

    it("case-different options are NOT duplicates (exact byte comparison)", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await ballot.write.createPoll(["A", "", ["Yes", "yes"], await inOneDay()]);
      assert.equal(await ballot.read.pollCount(), 1n);
    });

    it("description of 501 bytes reverts InvalidDescription (500 OK)", async function () {
      const { ballot } = await loadFixture(deployFixture);
      await ballot.write.createPoll(["A", "d".repeat(500), ["x", "y"], await inOneDay()]);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["A", "d".repeat(501), ["x", "y"], await inOneDay()]),
        ballot,
        "InvalidDescription",
      );
    });

    it("endTime in the past reverts InvalidEndTime", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const past = BigInt(await time.latest()) - 1n;
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["A", "", ["x", "y"], past]),
        ballot,
        "InvalidEndTime",
      );
    });

    it("endTime < 5 min ahead reverts InvalidEndTime", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const t = BigInt(await time.latest()) + 100n;
      await time.setNextBlockTimestamp(t);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["A", "", ["x", "y"], t + 5n * MIN - 1n]),
        ballot,
        "InvalidEndTime",
      );
    });

    it("endTime > 30 days ahead reverts InvalidEndTime", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const t = BigInt(await time.latest()) + 100n;
      await time.setNextBlockTimestamp(t);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll(["A", "", ["x", "y"], t + 30n * DAY + 1n]),
        ballot,
        "InvalidEndTime",
      );
    });

    it("exact boundary: endTime exactly 5 min ahead OK", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const t = BigInt(await time.latest()) + 100n;
      await time.setNextBlockTimestamp(t);
      await ballot.write.createPoll(["A", "", ["x", "y"], t + 5n * MIN]);
      assert.equal((await ballot.read.getPoll([1n])).endTime, t + 5n * MIN);
    });

    it("exact boundary: endTime exactly 30 days ahead OK", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const t = BigInt(await time.latest()) + 100n;
      await time.setNextBlockTimestamp(t);
      await ballot.write.createPoll(["A", "", ["x", "y"], t + 30n * DAY]);
      assert.equal((await ballot.read.getPoll([1n])).endTime, t + 30n * DAY);
    });

    it("multi-byte: Tamil title under the char limit but over the byte limit reverts", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const tamil = "த".repeat(41); // 41 characters, 3 bytes each = 123 bytes > 120
      assert.ok(tamil.length < 120);
      assert.equal(new TextEncoder().encode(tamil).length, 123);
      await viem.assertions.revertWithCustomError(
        ballot.write.createPoll([tamil, "", ["x", "y"], await inOneDay()]),
        ballot,
        "InvalidTitle",
      );
    });

    it("multi-byte: emoji option under the char limit but over the byte limit reverts", async function () {
      const { ballot } = await loadFixture(deployFixture);
      const emoji = "🗳".repeat(16); // 16 characters, 4 bytes each = 64 bytes > 60
      assert.equal(new TextEncoder().encode(emoji).length, 64);
      await viem.assertions.revertWithCustomErrorWithArgs(
        ballot.write.createPoll(["A", "", ["x", emoji], await inOneDay()]),
        ballot,
        "OptionTooLong",
        [1n],
      );
    });
  });

  describe("Voting", function () {
    it("valid vote increments the right count and totalVotes, emits Voted", async function () {
      const { ballot, asAlice, alice } = await loadFixture(withPollFixture);
      await viem.assertions.emitWithArgs(asAlice.write.vote([1n, 2n]), ballot, "Voted", [
        1n,
        getAddress(alice.account.address),
        2n,
      ]);
      const poll = await ballot.read.getPoll([1n]);
      assert.deepEqual(poll.voteCounts, [0n, 0n, 1n]);
      assert.equal(poll.totalVotes, 1n);
    });

    it("getVotedOption returns index+1 (0 before voting)", async function () {
      const { ballot, asAlice, alice } = await loadFixture(withPollFixture);
      assert.equal(await ballot.read.getVotedOption([1n, alice.account.address]), 0n);
      await asAlice.write.vote([1n, 0n]);
      assert.equal(await ballot.read.getVotedOption([1n, alice.account.address]), 1n);
    });

    it("two different voters both counted", async function () {
      const { ballot, asAlice, asBob } = await loadFixture(withPollFixture);
      await asAlice.write.vote([1n, 1n]);
      await asBob.write.vote([1n, 1n]);
      const poll = await ballot.read.getPoll([1n]);
      assert.deepEqual(poll.voteCounts, [0n, 2n, 0n]);
      assert.equal(poll.totalVotes, 2n);
    });

    it("same voter twice reverts AlreadyVoted", async function () {
      const { ballot, asAlice, alice } = await loadFixture(withPollFixture);
      await asAlice.write.vote([1n, 0n]);
      await viem.assertions.revertWithCustomErrorWithArgs(asAlice.write.vote([1n, 1n]), ballot, "AlreadyVoted", [
        1n,
        getAddress(alice.account.address),
      ]);
    });

    it("option index == length reverts InvalidOption", async function () {
      const { ballot, asAlice } = await loadFixture(withPollFixture);
      await viem.assertions.revertWithCustomErrorWithArgs(asAlice.write.vote([1n, 3n]), ballot, "InvalidOption", [
        1n,
        3n,
      ]);
    });

    it("pollId 0 reverts PollNotFound", async function () {
      const { ballot, asAlice } = await loadFixture(withPollFixture);
      await viem.assertions.revertWithCustomErrorWithArgs(asAlice.write.vote([0n, 0n]), ballot, "PollNotFound", [0n]);
    });

    it("pollId > pollCount reverts PollNotFound", async function () {
      const { ballot, asAlice } = await loadFixture(withPollFixture);
      await viem.assertions.revertWithCustomErrorWithArgs(asAlice.write.vote([2n, 0n]), ballot, "PollNotFound", [2n]);
    });

    it("voting 1 second before endTime works", async function () {
      const { ballot, asAlice, endTime } = await loadFixture(withPollFixture);
      await time.setNextBlockTimestamp(endTime - 1n);
      await asAlice.write.vote([1n, 0n]);
      assert.equal((await ballot.read.getPoll([1n])).totalVotes, 1n);
    });

    it("voting at exactly endTime reverts PollEnded", async function () {
      const { ballot, asAlice, endTime } = await loadFixture(withPollFixture);
      await time.setNextBlockTimestamp(endTime);
      await viem.assertions.revertWithCustomErrorWithArgs(asAlice.write.vote([1n, 0n]), ballot, "PollEnded", [1n]);
    });

    it("voting after endTime reverts PollEnded", async function () {
      const { ballot, asAlice, endTime } = await loadFixture(withPollFixture);
      await time.increaseTo(endTime + 60n);
      await viem.assertions.revertWithCustomErrorWithArgs(asAlice.write.vote([1n, 0n]), ballot, "PollEnded", [1n]);
    });

    it("creator can vote in their own poll", async function () {
      const { ballot, creator } = await loadFixture(withPollFixture);
      await ballot.write.vote([1n, 1n]);
      assert.equal(await ballot.read.getVotedOption([1n, creator.account.address]), 2n);
    });
  });

  describe("Cancel", function () {
    it("creator cancels poll with 0 votes (emits PollCancelled)", async function () {
      const { ballot } = await loadFixture(withPollFixture);
      await viem.assertions.emitWithArgs(ballot.write.cancelPoll([1n]), ballot, "PollCancelled", [1n]);
      assert.equal((await ballot.read.getPoll([1n])).cancelled, true);
    });

    it("non-creator reverts NotCreator", async function () {
      const { ballot, asAlice } = await loadFixture(withPollFixture);
      await viem.assertions.revertWithCustomError(asAlice.write.cancelPoll([1n]), ballot, "NotCreator");
    });

    it("cancel after a vote reverts PollHasVotes", async function () {
      const { ballot, asAlice } = await loadFixture(withPollFixture);
      await asAlice.write.vote([1n, 0n]);
      await viem.assertions.revertWithCustomError(ballot.write.cancelPoll([1n]), ballot, "PollHasVotes");
    });

    it("cancel after end reverts PollEnded", async function () {
      const { ballot, endTime } = await loadFixture(withPollFixture);
      await time.increaseTo(endTime);
      await viem.assertions.revertWithCustomErrorWithArgs(ballot.write.cancelPoll([1n]), ballot, "PollEnded", [1n]);
    });

    it("cancel twice reverts PollIsCancelled; unknown id reverts PollNotFound", async function () {
      const { ballot } = await loadFixture(withPollFixture);
      await ballot.write.cancelPoll([1n]);
      await viem.assertions.revertWithCustomErrorWithArgs(ballot.write.cancelPoll([1n]), ballot, "PollIsCancelled", [
        1n,
      ]);
      await viem.assertions.revertWithCustomErrorWithArgs(ballot.write.cancelPoll([9n]), ballot, "PollNotFound", [9n]);
    });

    it("vote on cancelled poll reverts PollIsCancelled", async function () {
      const { ballot, asAlice } = await loadFixture(withPollFixture);
      await ballot.write.cancelPoll([1n]);
      await viem.assertions.revertWithCustomErrorWithArgs(asAlice.write.vote([1n, 0n]), ballot, "PollIsCancelled", [
        1n,
      ]);
    });
  });

  describe("Reads", function () {
    async function threePollsFixture() {
      const f = await deployFixture();
      for (const t of ["P1", "P2", "P3"]) {
        await f.ballot.write.createPoll([t, "", ["x", "y"], await inOneDay()]);
      }
      return f;
    }

    it("getPoll for unknown id reverts PollNotFound", async function () {
      const { ballot } = await loadFixture(threePollsFixture);
      await viem.assertions.revertWithCustomErrorWithArgs(ballot.read.getPoll([4n]), ballot, "PollNotFound", [4n]);
    });

    it("getPollsPage with startId beyond count returns empty", async function () {
      const { ballot } = await loadFixture(threePollsFixture);
      assert.equal((await ballot.read.getPollsPage([4n, 10n])).length, 0);
    });

    it("getPollsPage partial last page is clipped", async function () {
      const { ballot } = await loadFixture(threePollsFixture);
      const page = await ballot.read.getPollsPage([2n, 10n]);
      assert.deepEqual(
        page.map((p) => p.title),
        ["P2", "P3"],
      );
    });

    it("getPollsPage startId 0 is treated as 1; limit 0 returns empty", async function () {
      const { ballot } = await loadFixture(threePollsFixture);
      assert.deepEqual(
        (await ballot.read.getPollsPage([0n, 2n])).map((p) => p.id),
        [1n, 2n],
      );
      assert.equal((await ballot.read.getPollsPage([1n, 0n])).length, 0);
    });

    it("getPollsPage limit above 50 is capped at 50", async function () {
      const { ballot } = await loadFixture(deployFixture);
      for (let i = 0; i < 51; i++) {
        await ballot.write.createPoll([`P${i + 1}`, "", ["x", "y"], await inOneDay()]);
      }
      const page = await ballot.read.getPollsPage([1n, 1000n]);
      assert.equal(page.length, 50);
      assert.equal(page[49].id, 50n);
    });

    it("sending ETH to the contract reverts", async function () {
      const { ballot, alice } = await loadFixture(deployFixture);
      await viem.assertions.revert(alice.sendTransaction({ to: ballot.address, value: parseEther("0.01") }));
      assert.equal(await publicClient.getBalance({ address: ballot.address }), 0n);
    });
  });

  describe("Gas (for the report)", function () {
    it("createPoll with 2 options, createPoll with 10 options, vote", async function () {
      const { ballot, asAlice } = await loadFixture(deployFixture);
      const gasOf = async (hash: `0x${string}`) => (await publicClient.waitForTransactionReceipt({ hash })).gasUsed;
      const two = await gasOf(await ballot.write.createPoll(["Two", "", ["Yes", "No"], await inOneDay()]));
      const ten = Array.from({ length: 10 }, (_, i) => `Option number ${i + 1}`);
      const tenGas = await gasOf(await ballot.write.createPoll(["Ten", "", ten, await inOneDay()]));
      const voteGas = await gasOf(await asAlice.write.vote([1n, 0n]));
      // Printed so the exact per-case numbers appear next to the aggregate --gas-stats table.
      console.log(`      gas: createPoll(2 options)=${two} createPoll(10 options)=${tenGas} vote(first in poll)=${voteGas}`);
    });
  });
});
