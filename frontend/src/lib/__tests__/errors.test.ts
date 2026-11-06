import { describe, expect, it } from "vitest";
import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  getAddress,
  HttpRequestError,
  InsufficientFundsError,
  UserRejectedRequestError,
} from "viem";
import { votingAbi } from "../../contract/abi";
import { describeError, isNetworkError, isPollNotFound } from "../errors";

const ADDR = getAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3");

function revert(errorName: string, args: readonly unknown[]) {
  const data = encodeErrorResult({ abi: votingAbi, errorName: errorName as never, args: args as never });
  const cause = new ContractFunctionRevertedError({ abi: votingAbi, data, functionName: "vote" });
  return new ContractFunctionExecutionError(cause, { abi: votingAbi, functionName: "vote", args: [1n, 0n], contractAddress: ADDR });
}

describe("describeError", () => {
  it("decodes AlreadyVoted into a sentence", () => {
    const d = describeError(revert("AlreadyVoted", [1n, ADDR]), "Vote");
    expect(d).toMatchObject({ kind: "revert", message: "This wallet has already voted in this poll." });
  });

  it("decodes indexed errors 1-based for people", () => {
    expect(describeError(revert("DuplicateOption", [0n, 2n])).message).toBe("Options 1 and 3 are identical.");
  });

  it("user rejection is neutral", () => {
    const err = new UserRejectedRequestError(new Error("User denied"));
    expect(describeError(err, "Vote")).toEqual({ kind: "rejected", message: "Vote not sent." });
    expect(describeError({ code: 4001, message: "rejected" }, "Vote").kind).toBe("rejected");
  });

  it("insufficient funds", () => {
    expect(describeError(new InsufficientFundsError()).kind).toBe("funds");
    expect(describeError(new BaseError("insufficient funds for gas * price + value")).kind).toBe("funds");
  });

  it("network errors are recognised as RPC-down", () => {
    const err = new HttpRequestError({ url: "https://rpc.example" });
    expect(describeError(err).kind).toBe("network");
    expect(isNetworkError(err)).toBe(true);
  });

  it("PollNotFound on reads is detected for the not-found page", () => {
    expect(isPollNotFound(revert("PollNotFound", [9n]))).toBe(true);
    expect(isPollNotFound(revert("PollEnded", [9n]))).toBe(false);
  });

  it("never returns a raw dump as the message", () => {
    const d = describeError(new Error("weird internal thing 0xdeadbeef"));
    expect(d.message).not.toContain("0xdeadbeef");
    expect(d.details).toContain("0xdeadbeef");
  });
});
