# ShadowPay Admin View (Next.js)

Platform-level operator console. Wallet-connect auth like `/frontend`, but gated on
the connected wallet's account having `role="admin"` — no self-serve promotion, and
`AdminGate` explicitly shows "Not an admin" rather than silently degrading if the
role check fails. See `shadowpay-mvp-scope.md` section 6.

## Pages

- `/connect` — wallet connect
- `/dashboard` — pool monitoring (aggregates only), risk-engine threshold config,
  dispute queue
- `/onboarding` — merchant + vendor create/approve/reject, API keys shown once at
  creation

## What this deliberately cannot do

Every number on `/dashboard` is a count or a sum — there is no endpoint anywhere in
this app that returns a single agreement's amount, a specific user's score, or a
specific merchant's customer list. That's not a missing feature; it's the point
("even the platform admin can't see your purchase history").

## Known gap

Retuning the risk threshold here (`/api/admin/risk-config/`) changes what the Django
risk engine hands the frontend as a witness input — it does not itself submit the
on-chain transaction that updates the contract's `eligibilityThreshold` ledger value.
Same open item as merchant registration (see `backend/README.md`).

## Local setup

```
npm install
cp .env.example .env.local
npm run dev
```

Then grant your wallet's account the admin role from the Django shell:

```
python manage.py shell -c "
from accounts.models import User
User.objects.filter(wallet_address='<your address>').update(role=User.Role.ADMIN)
"
```
