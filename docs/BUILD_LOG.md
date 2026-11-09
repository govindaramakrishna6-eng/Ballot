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

---

## Phase 5 — Design ("civic paper")

### What I took from /design-refs
- **/design-refs is empty** — no screenshots were ever added, so there was nothing to take patterns from. The direction comes from CLAUDE.md section 7 alone.

### Two variations (static poll page, `docs/design/variation-{a,b}.html`, screenshots `variation-{a,b}-{light,dark}.png`)
- **A — "Registry ink"**: warm paper #f4efe4, ink #1c1b18, ballot-green accent #1d5a3c (dark: #5fae84). Upright Fraunces titles, Plex Sans UI, Plex Mono numbers. Results are thick black ink bars; status labels are boxed mono caps; receipt has punched perforations and a double-ruled rotated "RECORDED" rubber stamp.
- **B — "Civic notice"**: brighter paper, vermilion accent #b8381a, italic soft Fraunces titles, ruled-notebook page background, vermilion result bars with tick marks, solid-tag stamp.

### Critique and choice — **A chosen**
- Section 7 asks for "results as thick ink bars" and "one accent used sparingly for stamped moments". A does both literally; **B paints every bar vermilion**, so the accent stops meaning "stamped".
- B's ruled background bleeds past the content and reads as a school notebook, not a polling station; in dark mode its bars are loud.
- B's italic display serif is harder to read for long, untrusted poll titles; A's upright serif truncates and wraps cleanly.
- B's stamp looks like a price sticker; A's double-ruled rotated stamp reads as an official mark.
- Neither uses anything on the banned list (no gradients, glows, glass, blobs, particles, emoji icons). B's single framed panel was the closest to "card with shadow".
- Contrast (computed, WCAG): every text pair ≥ 5.6:1 in both themes (ink 15.0/14.0, muted 6.3/6.6, accent 7.1/6.5, danger 6.6/7.1, warning 6.2/8.9). Form-control borders use the muted ink (≥ 5:1) rather than the decorative hairline (1.5:1).

### Applied
- Tokens + both themes via `prefers-color-scheme`; self-hosted fonts (@fontsource, no Google Fonts request); tabular numerals for counts.
- Poll list as a ruled ledger (no wall of identical shadowed cards); printed status labels; strike-through "Cancelled".
- Receipt with perforated edges and a 420ms stamp "thunk" + slide-in when a vote confirms; skeleton pulse and all transitions disabled under `prefers-reduced-motion`.
- RainbowKit themed to paper/ink: square corners, no blur, no soft shadows, account chip as an inked outline.
- Visible 3px accent focus ring; skip link; option rows show selection by border + fill, not colour alone.

### Still looks generic (honest list)
- RainbowKit's modal layout (wallet list, "What is a wallet?") is themed but structurally RainbowKit's.
- The native `datetime-local` picker looks like the browser's, not like a form.
- No favicon/brand mark yet (intentionally — no logo was asked for).
- Mobile header packs brand, nav and account chip in one row; it works at 390px but is tight.

```
STATUS REPORT
Done: two variations built + screenshotted light/dark, critiqued, A applied across the app incl. stamp animation,
  dark mode, reduced motion, AA contrast; final screenshots in docs/screenshots.
Files created/changed (paths): frontend/src/index.css, frontend/src/main.tsx, components/PollCard.tsx, pages/PollList.tsx,
  frontend/e2e/screenshots.spec.ts, frontend/package.json, docs/design/*, docs/screenshots/*
How to run or verify: cd frontend && npm run screenshots (writes docs/screenshots); npm run e2e
Test/build results (actually observed): tsc + vite build OK; E2E 20 passed (33.8s) after the restyle; screenshots 2 passed.
Not done / known issues: see "Still looks generic".
Assumptions I made: system-preference dark mode only (no manual toggle — not requested).
What the next phase needs from this one: class names (.label, .ledger, .receipt…) for the /me page.
Commit made: feat(design): apply "civic paper" variation A with dark mode and stamp animation
```

---

## Phase 6 — Extras: /me, share link, ENS

### Decisions
- **ENS via a separate read-only mainnet client** (`VITE_MAINNET_RPC_URL`, default publicnode) — names live on mainnet, polls on Sepolia; the wallet is never involved. viem's `getEnsName` verifies the forward record, so a spoofed reverse record is ignored.
- **ENS lookups disabled on the local chain** — Hardhat test accounts have no names and E2E stays offline. Verified live instead: 0xd8dA…6045 → `vitalik.eth`; the deployer → null (address shown).
- **The copy button always copies the address, never the name** — the address is the identity; the name is a convenience.
- **Share uses the native share sheet only on touch devices, clipboard elsewhere** — desktop share sheets are inconsistent; a copied link is predictable.
- **/me reuses the poll list + one batched getVotedOption read** — exactly the spec ("batched getVotedOption calls over loaded polls"); no new contract reads or indexer.

```
STATUS REPORT
Done: /me page (connect prompt, skeletons, error/RPC-down, empty invitation, list with "Your choice"); share link on
  poll page; ENS names wherever an address is shown (with copy of the raw address).
Files created/changed (paths): frontend/src/pages/MyVotes.tsx, hooks/useEnsName.ts, components/{Address,ShareButton,
  PollCard,Layout}.tsx, App.tsx, pages/PollDetail.tsx, e2e/extras.spec.ts
How to run or verify: npm run e2e (extras.spec.ts); /me in the app
Test/build results (actually observed): E2E 22 passed (36.3s); vitest 21 passed; build OK; live ENS check printed vitalik.eth.
Not done / known issues: none.
Assumptions I made: see Decisions.
What the next phase needs from this one: nothing.
Commit made: feat(frontend): my-votes page, share link and ENS names
```

---

## Phase 7 — Ship

### Decisions
- **Vercel deploy skipped** — the Vercel CLI is not logged in on this machine (no `~/.vercel` / CLI auth). Single command for later: `cd frontend && npx vercel@65.12.1 deploy --prod`.
- **No Vercel env vars are required** — all `VITE_*` are optional with public defaults.
- **`vercel.json` lives in `frontend/`** with the SPA rewrite plus three basic security headers (nosniff, referrer policy, no framing). The rewrite was not exercised on Vercel itself (no deploy); the production bundle was checked with `vite preview` deep-linking to `/poll/1`.
- **`.nvmrc` = 22, `engines.node` = ">=22.13.0"** in both packages (Hardhat 3's minimum; also satisfies Vite 8).
- **Audit numbers recorded in README:** frontend 30 (2 low, 12 moderate, 16 high) in wallet-connector SDKs; contracts 12 high, all the `zod` advisory inside Hardhat dev tooling.

### Secret audit (actually run)
- Real deployer key searched (value never printed) in: working tree incl. untracked files → 0; full `git log --all -p` → 0; session scratch logs → 0.
- Tracked `.env*` files: only the two `.env.example` templates (empty values).
- Secret-like assignments in history: only the wallet script's code (no values). "seed phrase": only the CLAUDE.md rule.
- 64-hex strings in tracked files: three public transaction hashes only.
- `console.log/debug/info` in frontend/src: 0. `dangerouslySetInnerHTML`: 0.

```
STATUS REPORT
Done: beginner README (how it works, architecture diagram, repo tour, run steps, tests, contract address + links, Vercel
  steps + env table, design decisions, known limitations incl. npm audit), vercel.json with SPA rewrite, .nvmrc, engines,
  complete frontend .env.example, secret audit.
Files created/changed (paths): README.md, .nvmrc, .gitignore, frontend/vercel.json, frontend/.env.example,
  frontend/package.json, contracts/package.json, docs/BUILD_LOG.md
How to run or verify: see README "Tests"; cd frontend && npx vercel@65.12.1 deploy --prod
Test/build results (actually observed): contracts 45 passing; contracts tsc OK; frontend unit 21 passed; frontend tsc OK;
  vite build OK; E2E 22 passed (35.6s); production preview /poll/1 rendered live Sepolia data with 0 page errors.
Not done / known issues: Vercel deploy (CLI not logged in). Bundle has >500 kB chunks from wallet SDKs (works; could be
  code-split later).
Assumptions I made: see Decisions.
What the next phase needs from this one: n/a — final phase.
Commit made: docs: beginner README, Vercel config, engines and final audit
```

---

## Post-ship — Vercel deploy

- Deployed with a Vercel token saved by the user through the environment's secure credential form (value never seen).
- Production URL: https://ballot-omega.vercel.app (project `ballot`, remote build on Vercel, framework Vite).
- **Open item for the owner:** Vercel's default "Deployment Protection" (Vercel Authentication, `all_except_custom_domains`) is on, so visitors to the `*.vercel.app` URL see a Vercel login wall. Turning it off is the owner's decision: Vercel dashboard → project `ballot` → Settings → Deployment Protection → Vercel Authentication → off. Vercel also defaulted the build to Node 26.x; tests ran on Node 22 (Settings → Build → Node.js Version → 22.x to match).

---

## Front page redesign ("wow factor", user request)

### Decisions
- **Front page set as a civic gazette, not a crypto landing page** — stays inside section 7 (no gradients, glows, blobs, hype copy). The wow comes from *real chain data* presented beautifully: the product idea (provable votes) becomes the hero.
- **Masthead with a live dateline** ("<chain> edition · ● Block N · date/time"), driven by the chain clock, which now also exposes the latest block number.
- **Headline "Every vote leaves a receipt."** in Fraunces at optical size 144 with a true soft/"wonky" italic — switched to `@fontsource-variable/fraunces/full.css` + `full-italic.css`; the previous default import was weight-only, so `opsz` and italics had silently been faked. Cost: ~270 KB of fonts instead of 37 KB.
- **Hero illustration = the newest real vote on-chain**, printed as a tilted receipt that drops in and gets stamped (marked "Specimen" before any vote exists).
- **Front-page figures** (polls / open now / votes) in large serif numerals with a 700ms count-up.
- **Featured poll** = the most-voted open poll with live ink bars.
- **"On the record" column**: live feed of Voted/PollCreated/PollCancelled logs; rows arriving while you watch get a brief ink-wash highlight. Window = last 20,000 blocks (≈2.8 days) because publicnode prunes older logs ("pruned history unavailable" at 50k — tested live); new events keep it current.
- **Subtle SVG paper grain** on the page background.
- **All new motion respects prefers-reduced-motion** (count-up jumps, no drop/stamp/wash/pulse).
- **Layout widened to 72rem with a two-column newspaper grid**; poll, create and My votes pages stay narrow and centred.

```
STATUS REPORT
Done: new front page (masthead + live dateline, headline, live hero receipt, tally, featured poll, live activity column, grain).
Files created/changed (paths): frontend/src/components/home/*, hooks/useActivity.ts, hooks/useCountUp.ts, lib/relativeTime.ts,
  hooks/useChainClock.tsx, hooks/useLiveUpdates.tsx, lib/queryKeys.ts, pages/PollList.tsx, index.css, main.tsx,
  pages/{PollDetail,CreatePoll,MyVotes}.tsx, e2e/screenshots.spec.ts, e2e/fixtures.ts, docs/screenshots/*
How to run or verify: npm run dev; npm run screenshots
Test/build results (actually observed): tsc OK; oxlint 0 issues (excluding the 3 known fast-refresh notes); vitest 21 passed;
  build OK; E2E 22 passed (35.3s); mobile 390px scrollWidth = 390 (no sideways scroll).
Not done / known issues: activity feed only reaches ~2.8 days back on the free public RPC.
Commit made: feat(frontend): gazette-style front page with live on-chain receipt and activity
```

---

## Homepage restructure (user brief: hero → open polls → recent activity → live stats)

### Decisions
- **Gazette masthead, "Every vote leaves a receipt", "Sepolia edition", hero receipt, featured poll removed** — per brief.
- **Hero copy exactly as given**; "tamper‑proof" uses a non-breaking hyphen so it never splits across lines.
- **Exact centring is measured, not guessed**: hero block centre = viewport centre to the pixel at 1440×900, 1280×720 and 390×844 (E2E asserts < 4–6px). `--chrome` = measured header + main padding (5.625rem desktop, 8.6rem mobile).
- **"No large gap" vs "exact centre"** — reconciled by shortening the hero by `--peek` (5.5rem) and offsetting the block so it stays centred: the "Open polls" heading is visible above the fold on landing (asserted in E2E).
- **Full list with Open/Closed/Mine tabs moved to `/polls`** (header "Polls" links there) — the homepage shows only open polls, so filters would be clutter; nothing was removed.
- **Ranking: closing soon (< 3 h, soonest first) → most votes → newest**; homepage shows up to 9 with "See all N open polls". "Closing soon" is a printed label in the warning ink.
- **Card action = "Vote" when you can still vote, otherwise "View poll"**; creator shows ENS name when available, else 0x1234…abcd.
- **Recent activity as sentences** ("A wallet voted in ‘…’", "A new poll was created: ‘…’", "‘…’ closed with N votes.", "‘…’ was cancelled by its creator."). Deadlines emit no event, so "closed" items come from the poll list (last 7 days, timed at endTime). Whole note links to the poll; wallets masked; new notes slide in once.
- **Unique wallets = poll creators (complete, from contract reads) ∪ voters in the readable log window**; shown with a "+" if the contract is older than the public RPC's ~2.8-day log window, so it's never presented as exact when it isn't.
- **Network/time indicator moved to a quiet footer** ("● Sepolia • 11:19 PM IST • block N" + contract link); the "no wallet" hint is hidden on the homepage only, so the hero stays clean (it still shows on poll/create pages).
- **Stats numbers in Plex Sans semibold** for a cleaner product feel; serif stays for headings.

```
STATUS REPORT
Done: homepage rebuilt in the requested order and copy; /polls page; footer network indicator.
Files created/changed (paths): frontend/src/pages/{Home,PollList}.tsx, components/home/{Hero,OpenPolls,OpenPollCard,
  RecentActivity,NetworkStats}.tsx, components/{Footer,Layout,NoWalletHint,StatusPill}.tsx, hooks/useActivity.ts,
  lib/{activity,rank,status}.ts, lib/__tests__/home.test.ts, App.tsx, index.css, e2e/{home,readonly,create,cancel,vote,
  screenshots}.spec.ts, e2e/fixtures.ts, README.md, docs/screenshots/*
How to run or verify: npm run dev → /; npm test; npm run e2e
Test/build results (actually observed): vitest 26 passed; tsc OK; oxlint 0 new issues; build OK; E2E 27 passed (44.4s);
  measured hero centre 450/450 (1440×900), 360/360 (1280×720), 422.35/422 (390×844); no horizontal scroll at 390px.
Not done / known issues: none new. No backend, contract or wallet-flow code changed.
Commit made: feat(frontend): product homepage — centred hero, open polls grid, activity feed, live stats
```

---

## Homepage tweaks: wordmark typeface for the headline, latest-ballot receipt back

### Decisions
- **Headline set exactly like the "Ballot" wordmark** — same family and weight (Fraunces 700) and the wordmark's optical cut (`opsz` 23, measured from its computed style) and -0.01em tracking, instead of the high-contrast `opsz` 144 display cut. The wider letterforms needed a wider hero block (76rem) to keep two lines on desktop.
- **Latest-ballot receipt returned inside "Recent activity"** (left column on desktop, above the notes on mobile) so the requested section order is unchanged. It shows the newest real vote: poll title links to the poll, footer links to the transaction on Etherscan (on the local chain: "Open this poll"); a "Specimen" receipt shows before any vote exists. Tilted, perforated, stamped "Recorded"; straightens on hover; stamp animation off under reduced motion.

```
STATUS REPORT
Done: headline typeface matches the wordmark; latest-ballot receipt with links on the homepage.
Files created/changed (paths): frontend/src/index.css, components/home/{LatestReceipt,RecentActivity}.tsx, hooks/useActivity.ts,
  lib/__tests__/home.test.ts, e2e/home.spec.ts, README.md, docs/screenshots/*
How to run or verify: npm run dev → /; npm run e2e
Test/build results (actually observed): vitest 26 passed; tsc OK; oxlint 0 new; build OK; E2E 29 passed (46.7s);
  hero centre 450/450 at 1440×900 and 422.35/422 at 390×844; headline 2 lines on desktop; no sideways scroll at 390px.
Commit made: feat(frontend): wordmark typeface for the headline; latest-ballot receipt on the homepage
```

---

## On-chain experience ("make the D in DApp felt")

### Decisions
- **Web3 feel from chain-native visuals, not crypto clichés** — the user asked for a Web3 touch and GPay-level delight without confetti. Section 7 still bans neon/glows/gradients/glass/particles, so the "decentralised" feeling comes from things only a blockchain app has: wallets as identicons, blocks you can watch, hashes, a transaction you can follow into a block, and on-chain guarantees.
- **Identicons** (own 5×5 mirrored generator, muted OKLCH colours from the address) everywhere a wallet appears, and as RainbowKit's avatar (replacing its emoji avatar).
- **Live block ribbon** in the hero: last 9 blocks slide in as produced; blocks with Ballot events are stamped; each links to Etherscan (Sepolia).
- **Transaction journey** for every write: Checked → Signed → Broadcast (travelling packet) → Recorded, then a self-drawing seal with a one-time ring pulse and the block number — the "GPay moment". Placed outside the vote form so it stays after the receipt appears. Same test ids as before, so every existing edge-case test still applies.
- **Hashes "decode" into place** (hex scramble → real value in ~700ms); screen readers and tooltips always get the real value.
- **Live results**: bars grow in; a vote arriving while you watch shows a "+1" on that option; voter identicon stack; "Verified on-chain" proof panel (immutable, no admin, one wallet one vote, publicly verifiable + contract and verified-source links).
- **Create**: live preview card, "what happens on-chain" steps, real network-fee estimate on review (`estimateContractGas × gasPrice`, read-only), seal plays ~1.4s then lands on the poll with "Your poll is live on-chain · Block #N".
- **Wallet toasts** on connect/disconnect — non-interactive (pointer-events: none) so they can never block a click.
- **All new motion is disabled under prefers-reduced-motion.** No contract, backend or wallet-flow logic changed.

```
STATUS REPORT
Done: identicons, block ribbon, tx journey + seal, hash decode, live +1 and voter stack, proof panel, create preview + fee
  estimate + live notice, trust chips, wallet toasts.
Files created/changed (paths): frontend/src/components/{Identicon,HashText,Toaster,TxStatus,TxHash,VoterStack,OnChainProof,
  PollPreview,Results,Address,Receipt,Layout}.tsx, components/home/{BlockRibbon,Hero,OpenPollCard,RecentActivity,
  LatestReceipt}.tsx, hooks/{useReducedMotion,useFeeEstimate}.ts, lib/identicon.ts, pages/{PollDetail,CreatePoll,Home}.tsx,
  main.tsx, index.css, e2e/{experience,screenshots}.spec.ts, lib/__tests__/identicon.test.ts, docs/screenshots/*
How to run or verify: npm run dev; npm run e2e; npm run screenshots
Test/build results (actually observed): vitest 29 passed; tsc OK; oxlint 0 new; build OK; E2E 34 passed (1.1m).
Not done / known issues: voter stack shows wallets from the readable log window (~2.8 days on public RPC); the count is always exact.
Commit made: feat(frontend): on-chain experience — identicons, live block ribbon, tx journey seal, live results, create preview
```

---

## Header: Home + Results; mobile overlap fix

### Decisions
- **Header links: Home · Polls · Results · Create · My votes** (the "Ballot" wordmark still goes home too).
- **New `/results` page**: "Final results" (closed polls, most recently closed first — these can never change) and "Live results" (open polls, most votes first). Each card states the verdict in words — Winner / Tied (with the tied options) / Leading / "No votes were cast" — then the top 3 options as ink bars and a "Full results" link. Cancelled polls are left out (they have no result; still listed under Polls → Closed). Summary: "N decided · N votes counted".
- **Mobile overlap root cause**: the hero was centred with a negative top margin sized for a tall screen. On real phones (browser bars make the visible height ~560–660px) the content was taller than the hero, so the margin pulled the headline up across the line under the header. Reproduced at 375×560, 390×664, 360×640.
- **Fix**: centre with extra bottom padding instead (padding can't move content above its box), and measure the header + banner height live (ResizeObserver → `--chrome`) instead of hard-coded rem values. Exact centring kept wherever it fits (1440×900 → 450/450, 900×800 → 400/400, 390×844 → 422/422); on shorter screens the hero sits below the header with a 56px gap.
- **Mobile header** is now two rows: wordmark + wallet, then the five links on their own swipeable row (no unpredictable wrapping). Desktop stays one row.

```
STATUS REPORT
Done: Home + Results header links; Results page; mobile overlap fixed; mobile header redesigned.
Files created/changed (paths): frontend/src/components/{Layout,ResultCard}.tsx, pages/ResultsPage.tsx, App.tsx, index.css,
  e2e/{navigation-results,screenshots}.spec.ts, README.md, docs/screenshots/*
How to run or verify: npm run dev → /results; resize to a phone; npm run e2e
Test/build results (actually observed): vitest 29 passed; tsc OK; oxlint 0 new; build OK; E2E 40 passed (1.0m) incl. 4 phone
  sizes asserting the headline is below the header line and no sideways scroll; measured at 7 viewport sizes — no overlap.
Commit made: feat(frontend): Home and Results in the header, results page, fix mobile hero overlap
```
