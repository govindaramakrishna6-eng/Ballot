// Generates a throwaway Sepolia-only deployer wallet and writes its key straight into
// contracts/.env (gitignored). Only the ADDRESS is ever printed.
// Refuses to overwrite an existing key so funded wallets are never lost; pass --force to replace.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ENV_PATH } from "./lib/config.ts";

const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
const current = existing.match(/^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m)?.[1];

if (current && !process.argv.includes("--force")) {
  console.log("A deployer key already exists in contracts/.env (not replaced).");
  console.log(`Deployer address: ${privateKeyToAccount(current as `0x${string}`).address}`);
  process.exit(0);
}

const key = generatePrivateKey();
const line = `DEPLOYER_PRIVATE_KEY=${key}`;
const updated = /^DEPLOYER_PRIVATE_KEY=.*$/m.test(existing)
  ? existing.replace(/^DEPLOYER_PRIVATE_KEY=.*$/m, line)
  : `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${line}\n`;
// 0o600: readable only by the current OS user.
writeFileSync(ENV_PATH, updated, { mode: 0o600 });

console.log("New Sepolia-only deployer wallet written to contracts/.env (key not shown).");
console.log(`Deployer address: ${privateKeyToAccount(key).address}`);
console.log("Never send mainnet funds to this address.");
