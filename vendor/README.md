# ShadowPay Vendor View (Next.js)

The platform/aggregator layer managing multiple merchants under one umbrella (e.g. a
marketplace or POS provider integrating ShadowPay across many stores). Separate app,
vendor-scoped API key auth. See `shadowpay-mvp-scope.md` section 6.

## Pages

- `/login` — paste the vendor API key from admin onboarding
- `/dashboard` — merchant roster (verification status only), aggregate volume/on-time
  rate across the whole roster, and payout reconciliation (per-merchant agreement
  counts + volume — no purchase-level breakdown)

## Scoping

`backend/agreements/views.py`'s `VendorStatsView` and `VendorPayoutReconciliationView`
filter every query on `merchant__vendor=request.auth.vendor` — a vendor never sees
another vendor's merchants, and even within its own roster only ever sees counts and
sums, never an individual agreement.

## Local setup

```
npm install
cp .env.example .env.local
npm run dev
```
