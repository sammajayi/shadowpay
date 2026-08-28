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
- [ ] Merchant view
- [ ] Vendor view
- [ ] Admin view

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
