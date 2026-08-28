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

All Wave 1 build-order items are complete. Known gaps, tracked rather than hidden,
each with a note at the point they matter: wallet-signature verification and the
frontend's message-signing call are both placeholders pending real Lace integration
(`backend/accounts/signature.py`, `frontend/src/lib/wallet.ts`); no circuit calls are
wired to a real deployed contract yet, so `checkEligibility`/`createAgreement`/
`recordPayment` proof generation is simulated client-side pending a testnet
deployment (`frontend/src/lib/contract.ts`); merchant/vendor verification is tracked
off-chain only, since there's no `registerMerchant` circuit (not one of the 4 in
scope doc section 3) — see `backend/README.md`.

## Wave 2 (not built in Wave 1)

- **`closeAgreement` circuit** — proves all installments fulfilled, releases
  collateral/credit line, publishes `agreementExists = false`. Deliberately deferred
  per the scope doc's cut list; `checkEligibility`, `createAgreement`, and
  merchant-scoped visibility are the load-bearing pieces for the Wave 1 demo.
- ML-based risk scoring (Wave 1 ships a rules-based risk engine only).

## Stack

- **Contracts:** Compact, Midnight testnet (compiler v0.34.0 / language v0.26.0)
- **Backend:** Django, Postgres, JWT auth tied to a Lace wallet signature challenge
- **Frontend:** Next.js, Tailwind, Hugeicons
- **Hosting:** Vercel (frontend apps) + Railway/Render (backend)

## Privacy model (non-negotiable)

Public chain state is booleans and aggregates only — never a purchase amount,
merchant identity for a specific purchase, or an eligibility score. See the
visibility matrix in `shadowpay-mvp-scope.md` section 3.
