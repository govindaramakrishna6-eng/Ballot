// Every VITE_* value is bundled into public JS. Nothing secret may live here.
// All variables are optional (public defaults exist); a value that IS set but malformed
// stops the app on a startup screen that names the variable, instead of failing later.

export const DEFAULT_SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
];
export const DEFAULT_MAINNET_RPC = "https://ethereum-rpc.publicnode.com";
const DEFAULT_LOCAL_RPC = "http://127.0.0.1:8545";

export type AppEnv = {
  chain: "sepolia" | "localhost";
  sepoliaRpcUrls: string[];
  localRpcUrl: string;
  mainnetRpcUrl: string;
  walletConnectProjectId: string | null;
  /** Optional footer links; unset → sensible real fallbacks (verified source on Sourcify, in-page FAQ). */
  sourceUrl: string | null;
  docsUrl: string | null;
  supportUrl: string | null;
};

export type EnvProblem = { name: string; problem: string };

function urlList(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function isHttpUrl(s: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}

/**
 * Only the variables the app uses, named one by one. Passing `import.meta.env` whole would make Vite
 * bundle every VITE_* variable the host defines (Vercel injects ~20 of its own) into public JS.
 */
const BUILD_ENV: Record<string, string | undefined> = {
  VITE_CHAIN: import.meta.env.VITE_CHAIN,
  VITE_SEPOLIA_RPC_URL: import.meta.env.VITE_SEPOLIA_RPC_URL,
  VITE_LOCAL_RPC_URL: import.meta.env.VITE_LOCAL_RPC_URL,
  VITE_MAINNET_RPC_URL: import.meta.env.VITE_MAINNET_RPC_URL,
  VITE_WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  VITE_SOURCE_URL: import.meta.env.VITE_SOURCE_URL,
  VITE_DOCS_URL: import.meta.env.VITE_DOCS_URL,
  VITE_SUPPORT_URL: import.meta.env.VITE_SUPPORT_URL,
};

export function readEnv(source: Record<string, string | undefined> = BUILD_ENV): { env: AppEnv; problems: EnvProblem[] } {
  const problems: EnvProblem[] = [];

  const chainRaw = source.VITE_CHAIN?.trim() || "sepolia";
  if (chainRaw !== "sepolia" && chainRaw !== "localhost") {
    problems.push({ name: "VITE_CHAIN", problem: 'must be "sepolia" or "localhost".' });
  }

  const sepolia = urlList(source.VITE_SEPOLIA_RPC_URL);
  if (sepolia.some((u) => !isHttpUrl(u))) {
    problems.push({ name: "VITE_SEPOLIA_RPC_URL", problem: "must be an http(s) URL (comma-separate several for fallback)." });
  }

  const local = source.VITE_LOCAL_RPC_URL?.trim() || DEFAULT_LOCAL_RPC;
  if (!isHttpUrl(local)) problems.push({ name: "VITE_LOCAL_RPC_URL", problem: "must be an http(s) URL." });

  const mainnet = source.VITE_MAINNET_RPC_URL?.trim() || DEFAULT_MAINNET_RPC;
  if (!isHttpUrl(mainnet)) problems.push({ name: "VITE_MAINNET_RPC_URL", problem: "must be an http(s) URL." });

  const wc = source.VITE_WALLETCONNECT_PROJECT_ID?.trim() || null;
  if (wc && !/^[0-9a-f]{32}$/i.test(wc)) {
    problems.push({ name: "VITE_WALLETCONNECT_PROJECT_ID", problem: "must be the 32-character id from cloud.reown.com, or left empty." });
  }

  const optionalLink = (name: string, allowMailto = false): string | null => {
    const v = source[name]?.trim();
    if (!v) return null;
    if (isHttpUrl(v) || (allowMailto && /^mailto:[^\s@]+@[^\s@]+$/.test(v))) return v;
    problems.push({ name, problem: allowMailto ? "must be an http(s) URL or a mailto: address." : "must be an http(s) URL." });
    return null;
  };
  const sourceUrl = optionalLink("VITE_SOURCE_URL");
  const docsUrl = optionalLink("VITE_DOCS_URL");
  const supportUrl = optionalLink("VITE_SUPPORT_URL", true);

  return {
    env: {
      chain: chainRaw === "localhost" ? "localhost" : "sepolia",
      sepoliaRpcUrls: sepolia.length ? sepolia : DEFAULT_SEPOLIA_RPCS,
      localRpcUrl: local,
      mainnetRpcUrl: mainnet,
      walletConnectProjectId: wc,
      sourceUrl,
      docsUrl,
      supportUrl,
    },
    problems,
  };
}

const result = readEnv();
export const env = result.env;
export const envProblems = result.problems;
