# ShadowPay Merchant View (Next.js)

A separate Next.js app (not a route group in `/frontend`) so merchant access is a
different deployment/auth boundary entirely — merchant-scoped API key, not a wallet
JWT. See `shadowpay-mvp-scope.md` section 6.

## Pages

- `/login` — paste the merchant API key from admin onboarding
- `/dashboard` — own aggregate stats (volume, on-time rate) + own agreements list
- `/agreements/[id]` — own agreement detail + installment timeline

## Scoping

Every request carries `Authorization: ApiKey <key>`. The backend
(`merchants/authentication.py`) resolves that key to exactly one `Merchant` row and
every agreements endpoint filters on it server-side — there is no client-supplied
merchant id anywhere in this app, so there's nothing to tamper with to see another
merchant's data.

## Local setup

```
npm install
cp .env.example .env.local
npm run dev
```
