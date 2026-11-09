import { describe, expect, it } from "vitest";
import { DEFAULT_SEPOLIA_RPCS, readEnv } from "../../config/env";

describe("readEnv", () => {
  it("works with nothing set (public defaults, WalletConnect off)", () => {
    const { env, problems } = readEnv({});
    expect(problems).toEqual([]);
    expect(env.chain).toBe("sepolia");
    expect(env.sepoliaRpcUrls).toEqual(DEFAULT_SEPOLIA_RPCS);
    expect(env.walletConnectProjectId).toBeNull();
  });

  it("names each malformed variable", () => {
    const { problems } = readEnv({ VITE_CHAIN: "mainnet", VITE_SEPOLIA_RPC_URL: "not a url", VITE_WALLETCONNECT_PROJECT_ID: "abc" });
    expect(problems.map((p) => p.name)).toEqual(["VITE_CHAIN", "VITE_SEPOLIA_RPC_URL", "VITE_WALLETCONNECT_PROJECT_ID"]);
  });

  it("accepts a comma-separated RPC list", () => {
    const { env } = readEnv({ VITE_SEPOLIA_RPC_URL: "https://a.example, https://b.example" });
    expect(env.sepoliaRpcUrls).toEqual(["https://a.example", "https://b.example"]);
  });

  it("optional footer links: unset is fine, malformed is named, mailto allowed only for support", () => {
    expect(readEnv({}).env.sourceUrl).toBeNull();
    const ok = readEnv({ VITE_SOURCE_URL: "https://github.com/x/ballot", VITE_SUPPORT_URL: "mailto:help@example.com" });
    expect(ok.problems).toEqual([]);
    expect(ok.env.supportUrl).toBe("mailto:help@example.com");
    const bad = readEnv({ VITE_DOCS_URL: "docs", VITE_SOURCE_URL: "mailto:a@b.c" });
    expect(bad.problems.map((p) => p.name)).toEqual(["VITE_SOURCE_URL", "VITE_DOCS_URL"]);
  });
});
