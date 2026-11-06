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

---

## Phases 3 + 4 — Wallet/data layer and core features

### Decisions
- **Phases 3 and 4 committed together** — the data layer was built against the real pages to avoid throwaway screens; both reports are combined below.
- **One target chain per build (`VITE_CHAIN`: sepolia default, localhost for dev/E2E)** — "wrong network" is simply "wallet chain ≠ target chain".
- **All env vars optional with public defaults; malformed values stop the app on a startup screen naming the variable** — the user asked for zero-signup defaults, so "missing" can no longer be an error but "broken" still is.
- **Injected wallets only unless `VITE_WALLETCONNECT_PROJECT_ID` is set**; with no wallet installed we show a plain hint + MetaMask download link (RainbowKit's injected-only list would otherwise be empty).
- **Simulation is done imperatively (`simulateContract` action) at click time** instead of the `useSimulateContract` hook — the args (chosen option, form values) are only final on click, and it keeps every write in one code path (`useTx`).
- **Chain clock = max of (block timestamp − time seen) over new blocks; on the local node never below 0** — Hardhat mines only on demand, so an old block there says nothing about "now".
- **Receipt is rebuilt from the on-chain `Voted` log**, not localStorage — the proof survives cleared storage and other devices.
- **Reads use TanStack Query + viem with our own keys (`["ballot", chainId, …]`)** so event-driven invalidation can target exactly one poll; http transport `batch: true` folds parallel reads into one request.
- **Create form keeps a 60s safety margin inside the 5 min / 30 day bounds** (shown as "6 minutes") so a deadline valid at click time doesn't revert by inclusion time.
- **Cancelled polls are listed under the Closed tab.**
- **`deployedAt` dropped from deployments.json** — local deploys on a fresh node are now byte-identical (same address, same tx hash), so tests don't churn a tracked file.
- **3 oxlint "only-export-components" warnings left** — provider + hook live together on purpose; it only affects hot reload.

```
STATUS REPORT
Done: env validation + startup error screen; not-deployed screen; wagmi/RainbowKit (injected by default, WalletConnect optional);
  chain-time clock; live updates (Voted/PollCreated/PollCancelled watchers, dedupe by tx+logIndex, 12s polling fallback);
  shared useTx (simulate → wallet → pending in localStorage → confirmed/failed with decoded reason; neutral rejection;
  faucet link on insufficient funds; aria-live announcements); wrong-network banner + switch; write gate with reasons;
  pages /, /create (byte counters, add/remove rows, dup block, near-dup warning, presets, review step, navigate by event),
  /poll/:id (vote, results, Tied/Winner, cancelled state, cancel for creator, ballot receipt), not-found routes; error boundary.
Files created/changed (paths): frontend/src/{App,main}.tsx, index.css, config/*, contract/contract.ts, hooks/*, lib/*,
  components/*, pages/*, lib/__tests__/*; contracts/scripts/deploy.ts, scripts/lib/deployments.ts
How to run or verify: npm run node + npm run deploy:local (contracts); VITE_CHAIN=localhost npm run dev (frontend); npm test; npm run build
Test/build results (actually observed): vitest 21/21 passed; tsc -b clean; vite build OK; Chromium render check of /, /poll/1,
  /poll/999, /create on the local node AND live Sepolia (read-only, public RPC) — all rendered with data, no console errors
  after fixing an Intl.DateTimeFormat option clash found by that check.
Not done / known issues: full wallet flows verified by the Playwright suite (next).
Assumptions I made: see Decisions.
What the next phase needs from this one: data-testid hooks on key elements for E2E.
Commit made: feat(frontend): wallet + data layer and core poll features
```

---

## E2E — Playwright suite (gate before Phase 7)

### Decisions
- **Fake injected wallet (EIP-1193) instead of wagmi's `mock` connector** — tests then exercise the real production path (RainbowKit "Browser Wallet" → wagmi injected connector) and can script what users do in MetaMask: reject, switch network/account, disconnect. It forwards to the Hardhat node's unlocked accounts, so no keys exist in tests. Connection state is kept in sessionStorage so it survives reloads like a real wallet.
- **Hardhat's "doesn't have enough funds" is normalised to "insufficient funds…" in the fake wallet** — that is what geth/MetaMask return, which is what the app must understand.
- **Wrong network is simulated by switching inside the wallet after connecting** — RainbowKit asks the wallet for the app's chain at connect time, as MetaMask would.
- **Double-vote-by-simulation test mutes event-filter results for that page** — otherwise the live update hides the form before the click (good UX, but then the simulation path isn't exercised).
- **@playwright/test pinned to 1.63.0** (latest is 1.65.0) — matches the Chromium build pre-installed in this environment; newer versions would need a browser download.
- **Bug found by E2E and fixed:** wagmi `useBlock({ watch: true })` never re-polled the latest block here, so polls didn't flip to Closed after time travel. The chain clock now polls `getBlock()` with TanStack Query every 1s (local) / 4s (Sepolia).

```
STATUS REPORT
Done: 20 Playwright E2E tests covering every section 6 edge case the user listed: create poll (incl. byte counter with Tamil,
  duplicate blocked, near-duplicate warning, review step, navigate via PollCreated), vote + receipt, double vote blocked
  (UI + simulation sentence), wrong network (banner, disabled with reason, switch), user rejection (neutral), insufficient
  funds, refresh during pending tx (resumes, button disabled, then receipt), poll expiring while open (time travel → Closed
  without refresh), zero votes ("No votes yet", no NaN), live tie then Winner only when closed, cancelled poll (no bars,
  listed under Closed), non-creator can't cancel, not-found routes (5 variants), no-wallet read-only mode, account switch
  re-check, disconnect mid-flow, Mine tab, my-vote mark.
Files created/changed (paths): frontend/playwright.config.ts, frontend/vitest.config.ts, frontend/e2e/*.ts,
  frontend/src/hooks/useChainClock.tsx, .gitignore
How to run or verify: cd frontend && npm run e2e   (starts a fresh Hardhat node + dev server itself)
Test/build results (actually observed): 20 passed (31.7s). First run: 12 passed / 8 failed (locator ambiguity in tests,
  connect-time chain switch, and the real chain-clock bug above) — all fixed.
Not done / known issues: none.
Assumptions I made: see Decisions.
What the next phase needs from this one: data-testid hooks must survive the restyle; rerun npm run e2e after Phase 5.
Commit made: test(e2e): Playwright suite with scriptable injected wallet on a local Hardhat node
```
