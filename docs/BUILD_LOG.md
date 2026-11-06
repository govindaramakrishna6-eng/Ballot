# Build log

Each phase appends its STATUS REPORT here. Decisions made without asking are listed at the top.

## Decisions

- **wagmi 2.19.5, not 3.x** — RainbowKit 2.2.11 (latest) declares `wagmi ^2.9.0`; its docs install `viem@2.x`. Upgrade when RainbowKit supports v3.
- **TypeScript 6.0.3 in /contracts, 7.0.2 in /frontend** — each matches its official template (Hardhat viem template / create-vite react-ts).
- **.env loaded with Node's `process.loadEnvFile`** — Hardhat 3 does not read .env itself; avoids a dotenv dependency.
- **Single root .gitignore** — one place to audit that every `.env` is ignored.
- **Autonomous mode adopted (Phase 0 → 1 transition)** — user changed the plan: no stops between phases, one Sepolia funding checkpoint. CLAUDE.md updated (sections 1–2a, 3, 6, 7, 8, 9).

---

## Phase 0 — Setup

```
STATUS REPORT
Done: Scaffolded /contracts (Hardhat 3.21.2 + toolbox-viem 5.0.7, solc 0.8.38) and /frontend
  (Vite 8.3.6, React 19.3.1, wagmi 2.19.5, viem 2.57.16, RainbowKit 2.2.11, TanStack Query 5.106.1,
  React Router 8.5.1, Tailwind 4.3.4). /design-refs, root .gitignore, .env.example files.
Files created/changed (paths): .gitignore, CLAUDE.md, design-refs/.gitkeep, contracts/*, frontend/*
How to run or verify: cd contracts && npm i && npm run compile; cd frontend && npm i && npm run dev / build
Test/build results (actually observed): compile exit 0 (smoke contract compiled with 0.8.38, then removed);
  frontend build OK; wallet stack type-checks and bundles; dev server served <title>Ballot</title>;
  git check-ignore confirmed .env files ignored.
Not done / known issues: npm audit: 30 transitive advisories via wallet-connector SDKs (ws, zod,
  decode-uri-component, uuid, deepmerge); not fixable without breaking pins.
Assumptions I made: env var names SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY,
  VITE_SEPOLIA_RPC_URL, VITE_WALLETCONNECT_PROJECT_ID.
What the next phase needs from this one: empty contracts/ and test/ dirs; npm test wired.
Commit made: chore: scaffold Hardhat 3 contracts and Vite React frontend
```

---

## Phase 1 — Contract and tests

### Decisions
- **getPollsPage(0, n) treats startId 0 as 1; limit 0 returns empty** — ids start at 1; a caller asking "from the beginning" with 0 should not get an empty page.
- **getVotedOption does not revert for unknown poll ids (returns 0)** — lets the frontend batch it over any id list without one bad id failing the whole multicall.
- **getPoll reverts PollNotFound for unknown ids** — the frontend maps that to its "not found" state.
- **cancelPoll check order: exists → NotCreator → PollIsCancelled → PollEnded → PollHasVotes** — cheapest/most-specific first; cancelling twice gives a clear error.
- **Duration bounds are inclusive** (exactly 5 min and exactly 30 days are OK), matching the section 5 boundary tests.
- **Exact per-case gas printed from the gas test** — `--gas-stats` only shows aggregates across all calls.

### Gas (default profile, no optimizer; production profile in brackets)
createPoll 2 options: 239,716 [237,190] · createPoll 10 options: 450,852 [443,506] · vote: 102,200 [101,244] · deploy: 2,030,711 · bytecode 9,176 bytes

```
STATUS REPORT
Done: VotingDApp.sol per section 4 (NatSpec on every public item, WHY comments); 45 tests covering every section 5 item; gas report.
Files created/changed (paths): contracts/contracts/VotingDApp.sol, contracts/test/VotingDApp.ts
How to run or verify: cd contracts && npx hardhat test --gas-stats
Test/build results (actually observed): 45 passing (45 nodejs), 0 failing. Gas table + exact per-case gas printed (see above).
Not done / known issues: none.
Assumptions I made: see Decisions above.
What the next phase needs from this one: artifacts/contracts/VotingDApp.sol/VotingDApp.json (ABI) after compile.
Commit made: feat(contracts): VotingDApp with full test suite and gas report
```

---

## Phase 2 — Deploy (local part; Sepolia waiting on funding checkpoint)

### Decisions
- **Ops scripts are plain viem run by Node's type stripping, not `hardhat run`/Ignition** — lets us use viem's `fallback` transport across several RPCs and keeps the key in memory only.
- **Public Sepolia RPCs: publicnode (primary) → Tenderly gateway (fallback)** — tested live; drpc's free tier no longer serves Sepolia and 1rpc returned a usage-limit error. `SEPOLIA_RPC_URL` (comma-separated) overrides.
- **Local deploys use the Hardhat node's unlocked account #0** — no key handling for 31337 at all.
- **Deploy and verify both use the `production` build profile (optimizer, 200 runs)** — deploy gas 1,261,558 vs 2,030,711 unoptimized; verification must match the deployed bytecode.
- **Sepolia deploy waits 2 confirmations before verifying** — Sourcify/Etherscan must see the creation tx.
- **Balance requirement: max(3× current gas price × 1.8M gas, 0.02 ETH)** — Sepolia gas spikes; 0.02 is a safe floor.
- **new-wallet refuses to overwrite an existing key (unless --force)** — never orphan a funded wallet.
- **Sandbox note:** Node's fetch ignores HTTPS_PROXY here, so Sepolia scripts were run with `NODE_USE_ENV_PROXY=1`. Not needed on a normal machine.

```
STATUS REPORT (partial — stopped at the funding checkpoint)
Done: wallet generator, balance check, deploy (local+Sepolia, writes deployments.json + typed abi.ts,
  Sourcify verify + optional Etherscan), verify retry script, smoke test script. Local deploy + smoke run.
Files created/changed (paths): contracts/scripts/{new-wallet,balance,deploy,verify,smoke}.ts,
  contracts/scripts/lib/{config,deployments}.ts, contracts/hardhat.config.ts, contracts/tsconfig.json,
  contracts/package.json, contracts/.env.example, frontend/src/contract/{deployments.json,abi.ts}
How to run or verify: npm run node (terminal 1); npm run deploy:local && npm run smoke:local (terminal 2)
Test/build results (actually observed): local deploy OK (block 1, gas 1,261,558); smoke: createPoll success,
  poll id 1 from PollCreated, vote success, Yes=1 No=0, getVotedOption=1, "Smoke test PASSED."
  tsc --noEmit OK. Sepolia balance check: 0 SepoliaETH → TOO LOW.
Not done / known issues: Sepolia deploy, verify, smoke — waiting for funds.
Assumptions I made: see Decisions.
What the next phase needs from this one: deployments.json["11155111"] after Sepolia deploy.
Commit made: feat(contracts): deploy, verify, wallet and smoke-test scripts
```

### Phase 2 — Sepolia completion (after "funded")

- **Sepolia deploy gas is ~7× the local figure (8,849,248 vs 1,261,558)** — same 5,588-byte runtime code (Sourcify bytecode match confirms it). Sepolia's current fork prices new state/code far higher than Hardhat's local EDR simulation (block gas limit is now ~200M). At 19 wei/gas it cost 0.00000000017 ETH, so no action; local gas numbers from Phase 1 are relative, not absolute, on Sepolia.
- Sepolia poll #1 is the smoke-test poll ("Smoke test: does the ballot box work?"), left on-chain as a real example.

```
STATUS REPORT
Done: Sepolia deploy, Sourcify verification, Sepolia smoke test.
Files created/changed (paths): frontend/src/contract/deployments.json (11155111 entry)
How to run or verify: https://sepolia.etherscan.io/address/0x5dD2Dd61c5615E027b1E3FA5c915Aef473c0D844 ;
  https://sourcify.dev/server/repo-ui/11155111/0x5dD2Dd61c5615E027b1E3FA5c915Aef473c0D844 ; npm run smoke:sepolia
Test/build results (actually observed): balance 0.05 SepoliaETH → OK. Deployed 0x5dD2Dd61c5615E027b1E3FA5c915Aef473c0D844
  in block 12077541 (tx 0x4775f425…de0e). "Contract verified successfully on Sourcify!".
  Smoke: createPoll success block 12077545, poll id 1, vote success block 12077546, Yes=1 No=0, PASSED.
Not done / known issues: Etherscan verification skipped (no ETHERSCAN_API_KEY) — Sourcify verified source is
  readable through Etherscan's "similar match"/Sourcify integration or the Sourcify link.
Assumptions I made: none new.
What the next phase needs from this one: deployments.json with 31337 and 11155111; abi.ts.
Commit made: chore(deploy): VotingDApp deployed and verified on Sepolia
```
