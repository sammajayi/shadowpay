# ShadowPay Backend (Django)

Wallet auth, rules-based risk engine v1, agreement orchestration, merchant/vendor
onboarding, and the admin API. See `shadowpay-mvp-scope.md` section 4.

## Apps

- **accounts** — wallet-signature challenge/verify auth, issues JWTs. `wallet_address`
  is the user's identity, no password. See `accounts/signature.py` for an important
  note: signature verification is currently raw Ed25519 over the challenge message as
  a placeholder — swap in real Lace COSE_Sign1 verification once the frontend wallet
  connect flow (build order item 3) is built and we know exactly what it sends.
- **risk** — rules-based scorer (`risk/engine.py`) producing the three signals the
  `checkEligibility` circuit's `eligibilityScoreInputs()` witness expects. The score
  never leaves the backend except back to the same authenticated user, as a private
  witness payload for client-side proof generation.
- **merchants** — Merchant/Vendor models, merchant-scoped and vendor-scoped API key
  auth (`Authorization: ApiKey <key>`).
- **agreements** — orchestrates the createAgreement, recordPayment, and
  closeAgreement flows. Proof generation happens client-side (the buyer's local
  secret key never reaches this backend), so this app's job is: validate the
  purchase/payment/close, persist encrypted off-chain metadata, hand back the
  witness payload, then record the on-chain result once the frontend confirms it.
  `initiate_payment()` enforces installments are paid in order (mirrors the same
  check the `recordPayment` circuit makes on-chain) and marks the agreement
  `completed` once all 4 are confirmed; `initiate_close()` refuses to hand out a
  closeAgreement witness payload until then, and refuses again once
  `onchain_closed_at` is set (mirrors closeAgreement's own on-chain assertions).
  See `agreements/services.py` for the full rationale.
- **notifications** — repayment reminders via Resend.
- **adminapi** — merchant/vendor onboarding queue, pool monitoring (aggregates only),
  dispute queue, risk-threshold config.

## Known gap

Nothing here writes to the contract's `merchantRegistry` ledger map yet — there's no
`registerMerchant`/`setMerchantVerified` circuit in `contracts/src/shadowpay.compact`
(not one of the 4 circuits in scope doc section 3). `Merchant.verified` and
`onchain_registered_at` in `merchants/models.py` track this off-chain for now;
wiring the actual on-chain write is a follow-up once the admin view (build order
item 7) needs it.

## Local setup

```
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then set AGREEMENT_ENCRYPTION_KEY (see comment in .env.example)
# create a Postgres role/db matching .env, then:
python manage.py migrate
python manage.py runserver
```
