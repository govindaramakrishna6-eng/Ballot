# Wallet-connection security review (MetaMask "Continue at your own risk" warning)

**Date:** 2026-11-09 · **Site:** https://ballot-omega.vercel.app · **Contract (Sepolia):** `0x5dD2Dd61c5615E027b1E3FA5c915Aef473c0D844`

## Verdict

The warning is a **domain-reputation flag, not something the app does**. MetaMask shows
"This site shows signs of phishing or wallet-draining activity" *at connect time*, before any transaction exists,
based on the website's domain. The app's code, the live deployment and every wallet request were checked and are safe.
The most likely trigger is the hosting domain: brand-new `*.vercel.app` sites are heavily abused by wallet drainers.

## What was checked (all actually run)

| Check | Result |
|---|---|
| Every wallet-facing call in `frontend/src` | One write path (`hooks/useTx.ts`), target = our contract address fixed at build time; only `vote`, `createPoll`, `cancelPoll`. |
| Token approvals / permits / signatures | None: no `approve`, `permit`, `setApprovalForAll`, `transferFrom`, `eth_sign`, `personal_sign`, `signTypedData` anywhere in app code. |
| ETH value sent | Never. The contract has no payable function, so it can't receive ETH. |
| Recorded wallet requests during a real vote (production build, production headers) | `wallet_requestPermissions` → `eth_requestAccounts` → one `eth_sendTransaction` to the Ballot contract, no value, selector `0xb384abef` = `vote(uint256,uint256)`. Nothing else. |
| Live site vs audited build | Same files. `index.html` + 8 of 9 assets byte-identical; the main chunk differs only by Vercel's injected build metadata, and 3 lazy chunks only by the resulting file-name hashes (normalised diff: identical). No external or injected scripts. |
| MetaMask public blocklist (`MetaMask/eth-phishing-detect`, 118,441 entries, fetched today) | `ballot-omega.vercel.app` **not listed**. 2,001 other `*.vercel.app` subdomains *are* listed, which is why new vercel.app sites start with poor reputation. |
| Secrets in the deployment | No `.env` uploaded; no secrets in the bundle. |

## Changes made in this review

1. **Content-Security-Policy** (`frontend/vercel.json`): only our own scripts can run (`script-src 'self'`, no inline scripts, no `eval`), no plugins, the site cannot be framed (`frame-ancestors 'none'`), forms post only to itself. Plus `Permissions-Policy` (camera, mic, payment, USB… off) and `Cross-Origin-Opener-Policy`. Tested before deploying: production build served with the exact headers → all pages load live Sepolia data, wallet modal opens, a full vote completes — **0 CSP violations, 0 console errors**.
2. **Host build metadata no longer bundled**: the app now reads only the 8 `VITE_*` variables it uses, so Vercel's ~20 injected variables (project/deployment IDs, analytics config) stop appearing in public JS.

## What clears the warning (needs the owner — these are outside the code)

1. **Use your own domain** (e.g. `ballot.yourname.xyz`) in Vercel → Project → Settings → Domains. A domain you own avoids the shared `vercel.app` reputation; it is the most effective fix.
2. **Report the false positive** (from your GitHub account):
   - MetaMask: https://github.com/MetaMask/eth-phishing-detect/issues/new?template=02-blocklist-removal.yaml — paste the text below.
   - MetaMask's live site scanning is powered by Blockaid; they also accept false-positive reports via their website (blockaid.io → report a mistake / false positive). Use the same text.
3. Make the site public (Vercel → Deployment Protection → Vercel Authentication off) so reviewers can actually open it.

### Pre-filled report

**Legitimate domains:**
```
https://ballot-omega.vercel.app
```

**Why this content is legitimate:**
```
Ballot is an open-source voting dApp on the Sepolia TEST network (no real funds involved).
It only ever asks the wallet for: (1) the account address on connect, and (2) a single
transaction to its own verified voting contract with zero ETH value — vote(uint256,uint256),
createPoll(...) or cancelPoll(uint256). It never requests token approvals, permits, or any
signatures, and the contract has no payable functions, no owner and no admin controls.

Contract (Sepolia, source verified on Sourcify):
0x5dD2Dd61c5615E027b1E3FA5c915Aef473c0D844
https://sepolia.etherscan.io/address/0x5dD2Dd61c5615E027b1E3FA5c915Aef473c0D844
https://sourcify.dev/server/repo-ui/11155111/0x5dD2Dd61c5615E027b1E3FA5c915Aef473c0D844

The site serves only first-party scripts under a strict Content-Security-Policy
(script-src 'self', frame-ancestors 'none'). We believe the flag comes from the shared
vercel.app hosting domain rather than the site's behaviour.
```

## How to re-run the checks
- App code: `grep -rnE "writeContract|sendTransaction|signMessage|signTypedData|eth_sign|approve|permit|setApprovalForAll" frontend/src`
- Tests: `cd frontend && npm test && npm run e2e` (46 E2E tests incl. every wallet edge case).
- Headers on the live site: `curl -sI https://ballot-omega.vercel.app | grep -i -E "content-security|permissions-policy|x-frame"`
