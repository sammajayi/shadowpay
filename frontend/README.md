# ShadowPay Frontend (Next.js)

Wallet connect → checkout → eligibility check → agreement confirmation → repayment
dashboard. Design tokens from `shadowpay-mvp-scope.md` section 7 / Appendix
(Acctual-derived), icons from `@hugeicons/react` + `@hugeicons/core-free-icons`.

## Pages

- `/` — landing
- `/connect` — wallet connect (Lace)
- `/checkout/[merchantId]` — BNPL request flow: plan → eligibility check → agreement
  confirmation, with the private/public field split visible at every step
- `/dashboard` — active agreements (stacked "Invoice Mockup Card" style)
- `/agreement/[id]` — single agreement detail + installment timeline + proof receipt

## Known gaps (flagged, not silently glossed over)

- **`lib/wallet.ts`** — wallet discovery (`Object.values(window.midnight)`) and
  `.connect(networkId)` match the documented Midnight DApp connector API, but the
  arbitrary-message-signing method name (`signMessage`) is a best-effort placeholder
  pending verification against a real Lace install and the `@midnight-ntwrk/dapp-connector-api`
  types. Same seam as `backend/accounts/signature.py` — firm up both together.
- **`lib/contract.ts`** — none of the 4 circuits (`checkEligibility`,
  `createAgreement`, `recordPayment`, `closeAgreement`) are wired to the real
  deployed contract yet (no testnet deployment exists). They simulate proof
  generation (delay + plausible result shape) so every screen can be built and
  reviewed against the real response shape now. Swapping in real
  `@midnight-ntwrk/midnight-js-contracts` calls is separate, non-trivial work.
- Checkout currently takes a merchant UUID pasted from admin onboarding — there's no
  merchant catalog/browse UI yet (out of scope for the MVP's core flow).

## Local setup

```
npm install
cp .env.example .env.local   # points at the Django backend
npm run dev
```
