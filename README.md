# ShadowPay

Privacy-first Buy Now Pay Later on Midnight. Full product/architecture spec: `shadowpay-mvp-scope.md`.

## Monorepo layout

```
/contracts   Compact smart contract (Midnight testnet)
/backend     Django API — wallet auth, risk engine, agreement orchestration
/frontend    Next.js — user-facing checkout + repayment dashboard
/merchant    Next.js — merchant view (own agreements/payouts only)
/vendor      Next.js — vendor/aggregator view (roster-level aggregates only)
/admin       Next.js — platform admin (aggregates, onboarding, risk config)
```

Each of `frontend`, `merchant`, `vendor`, `admin` is its own Next.js app rather than
route groups in one app, so that role-based access is enforced at the deployment
boundary (separate Vercel projects, separate auth scopes) and not just in-app routing.

## Status

- [x] Monorepo scaffolded
- [x] `checkEligibility` circuit — compiles end-to-end with real prover/verifier keys (`contracts/`)
- [x] `createAgreement` circuit — compiles end-to-end with real prover/verifier keys
- [x] Django backend (wallet auth, risk engine v1, agreement orchestration, merchant/vendor onboarding, admin API) — smoke-tested end-to-end against Postgres
- [x] Frontend: wallet connect → checkout → eligibility check UI, Acctual design tokens, Hugeicons, private/public field labeling — builds clean, routes verified serving 200s
- [x] `recordPayment` circuit — compiles end-to-end with real prover/verifier keys
- [x] `recordPayment` backend orchestration + repayment dashboard UI — smoke-tested (sequencing, on-time/late, agreement auto-completion)
- [x] Merchant view (`/merchant`) — API-key auth, own stats + agreements + installment timeline, builds clean, backend endpoints verified with a real key
- [x] Vendor view (`/vendor`) — API-key auth, roster + aggregate stats + payout reconciliation, all four endpoints verified with a real key
- [x] Admin view (`/admin`) — wallet-connect + role gate, pool monitoring, risk config, dispute queue, merchant/vendor onboarding, builds clean, endpoints verified (403 confirmed for a non-admin JWT)
- [x] `closeAgreement` circuit — compiles end-to-end with real prover/verifier keys, all 4 spec §3 circuits now built
- [x] `closeAgreement` backend orchestration + frontend close flow — smoke-tested (early-close rejected, double-close rejected, status/on-chain-closed transitions correct)

All 4 circuits from the scope doc's section 3 are built, and every app in the
original build order is in place. Known gaps, tracked rather than hidden, each with
a note at the point they matter: wallet-signature verification and the frontend's
message-signing call are both placeholders pending real Lace integration
(`backend/accounts/signature.py`, `frontend/src/lib/wallet.ts`); no circuit calls are
wired to a real deployed contract yet, so proof generation for all 4 circuits is
simulated client-side pending a testnet deployment (`frontend/src/lib/contract.ts`);
merchant/vendor verification is tracked off-chain only, since there's no
`registerMerchant` circuit (never part of scope doc section 3's 4-circuit list) —
see `backend/README.md`.

These three gaps are the ones that can't be closed inside this environment — real
Lace signing and a real testnet deployment need external resources (a browser
wallet extension, network access, a funded deployer key) this sandbox doesn't have.
Everything else the scope doc describes is built and verified.

## Wave 2 (genuinely out of scope)

- ML-based risk scoring (Wave 1 ships a rules-based risk engine only, per section 4).

## Stack

- **Contracts:** Compact, Midnight testnet (compiler v0.34.0 / language v0.26.0)
- **Backend:** Django, Postgres, JWT auth tied to a Lace wallet signature challenge
- **Frontend:** Next.js, Tailwind, Hugeicons
- **Hosting:** Vercel (frontend apps) + Railway/Render (backend)

## Privacy model (non-negotiable)

Public chain state is booleans and aggregates only — never a purchase amount,
merchant identity for a specific purchase, or an eligibility score. See the
visibility matrix in `shadowpay-mvp-scope.md` section 3.
