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
