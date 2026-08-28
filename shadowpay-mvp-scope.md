# ShadowPay — Wave 1 MVP Scope
Privacy-first BNPL on Midnight

---

## 1. Product Summary

ShadowPay lets a user get Buy Now, Pay Later financing where the loan exists on-chain, but the purchase amount, merchant identity, and repayment history stay private. The chain only ever sees pass/fail proofs: "eligible," "on-time," "agreement fulfilled." A rules-based risk engine scores eligibility in Wave 1, with an ML-based scorer planned as the Wave 2/3 iteration story.

**What's public:** agreement exists, pool liquidity, aggregate on-time/late boolean, merchant is verified
**What's private:** purchase amount, item/merchant detail, user income/balance signals, full repayment history, risk score inputs

---

## 2. Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   User Frontend   │────▶│   Backend (API)   │────▶│  Compact Contract   │
│   Next.js         │     │   Django           │     │  (Midnight testnet) │
└─────────────────┘     └──────────────────┘     └────────────────────┘
        │                        │                          │
        │                        ▼                          │
        │              ┌──────────────────┐                 │
        │              │  Risk Engine       │                 │
        │              │  (rules-based v1)  │                 │
        │              └──────────────────┘                 │
        │                                                     │
        ▼                                                     ▼
┌─────────────────┐                              ┌────────────────────┐
│  Lace Wallet      │                              │   Merchant/Admin    │
│  Connect           │                              │   Dashboard         │
└─────────────────┘                              └────────────────────┘
```

Stack: Next.js frontend, Django backend, Compact smart contracts on Midnight testnet, Lace wallet integration, Postgres for off-chain merchant/session data.

---

## 3. Smart Contract Scope (Compact)

### Public ledger state
- `merchantRegistry`: mapping of verified merchant IDs (boolean flags only)
- `poolLiquidity`: total pool balance available for lending
- `agreementExists`: mapping of agreement ID → boolean
- `onTimeStatus`: mapping of agreement ID → boolean (last payment status)

### Private state (per-user witness data)
- Purchase amount
- Installment schedule (amounts + due dates)
- Merchant identity for this specific purchase
- User's eligibility score inputs (income signal, past repayment record)

### Circuits (the actual ZK logic)
1. **`checkEligibility`** — takes private score inputs, proves `score ≥ threshold` without revealing the score or inputs. Returns a boolean commitment on-chain.
2. **`createAgreement`** — commits a private purchase (amount, schedule, merchant) to a hash, publishes only `agreementExists = true` and the pool debit. Scopes visibility so purchase detail decrypts only for the parties to that agreement (the user and that specific merchant) — never for other merchants, never for the vendor/platform layer, never globally.
3. **`recordPayment`** — proves an installment was paid on time against the private schedule, publishes only `onTimeStatus` boolean, updates private repayment history commitment.
4. **`closeAgreement`** — proves all installments fulfilled, releases any collateral/credit line, publishes `agreementExists = false`.

### Visibility matrix

| Data | User | Merchant (own agreements) | Vendor (platform) | Admin | Public chain |
|---|---|---|---|---|---|
| Purchase amount | ✅ | ✅ (own only) | ❌ | ❌ | ❌ |
| Eligibility score/inputs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Repayment history detail | ✅ | ❌ | ❌ | ❌ | ❌ |
| Agreement exists (boolean) | ✅ | ✅ (own only) | ✅ (aggregate) | ✅ (aggregate) | ✅ |
| On-time status (boolean) | ✅ | ✅ (own only) | ✅ (aggregate) | ✅ (aggregate) | ✅ |
| Pool liquidity | ✅ | ✅ | ✅ | ✅ | ✅ |

No role except the user themselves ever sees the score or purchase detail across merchants. This is worth stating explicitly in the demo, since it's the strongest privacy claim in the product.

### Technical gate requirement
At least one circuit (recommend `checkEligibility`, since it's the core privacy claim) must compile cleanly and be demoable end-to-end. Build this first, everything else is secondary.

---

## 4. Backend Scope (Django)

- **Auth:** wallet-based session auth via Lace connect (signature challenge, JWT issuance — matches your existing JWT/Privy pattern)
- **Merchant service:** CRUD for merchant onboarding, verification status, product catalog stub
- **Risk engine service:** rules-based scorer (v1) — takes signals like wallet age, past on-chain repayment commitments, self-reported income bracket; outputs a score fed into the `checkEligibility` circuit as a private witness
- **Agreement service:** orchestrates contract calls (create, record payment, close), stores off-chain metadata (item description, merchant display info) encrypted, keyed to the user
- **Notification service:** repayment reminders (email via Resend, matching your existing stack)
- **Admin API:** endpoints for merchant approval, pool liquidity monitoring, dispute flags

---

## 5. Frontend Scope (User-facing, Next.js)

### Core flows
1. **Connect wallet** (Lace) → session established
2. **Checkout/BNPL request** — mock merchant checkout screen, user selects "Pay in 4" or similar
3. **Eligibility check** — triggers `checkEligibility` proof generation, shows loading state, then pass/fail result (never shows the score)
4. **Agreement confirmation** — installment schedule shown privately to the user only, confirm to commit on-chain
5. **Repayment dashboard** — user's own view of upcoming installments, pay button, history (private to them, decrypted client-side)
6. **Proof receipts** — after each payment, a shareable "proof of good standing" the user could show a third party without exposing amounts

### Pages
- `/` — landing/marketing (uses Acctual-style design system, see Section 7)
- `/connect` — wallet connect
- `/checkout/[merchantId]` — BNPL request flow
- `/dashboard` — user's active agreements + repayment schedule
- `/agreement/[id]` — single agreement detail + pay installment

---

## 6. Merchant, Vendor, and Admin Views

Three separate roles, three separate route-gated dashboards. (Assuming "vendor" = the platform/aggregator layer that onboards and manages multiple merchants, distinct from an individual merchant's own storefront view — flag if you meant something else.)

### Merchant view — `/merchant`
The individual business accepting ShadowPay at checkout.
- Own agreements list: status, payout state — scoped to that merchant's own agreements only, per the visibility matrix above
- Payout tracking (confirmed/pending, tied to pool disbursement)
- Own aggregate stats: volume through their store, on-time rate for their own customers
- No visibility into other merchants, no visibility into a customer's activity elsewhere, no eligibility scores
- Merchant-scoped API key, enforced at the circuit level so a merchant literally cannot decrypt another merchant's agreement data

### Vendor view — `/vendor`
The platform/aggregator layer managing multiple merchants under one umbrella (e.g. a marketplace or POS provider integrating ShadowPay across many stores).
- Roster of onboarded merchants under this vendor, verification status
- Aggregate volume and on-time rate across the vendor's whole merchant roster — aggregate only, never drills into a specific user's purchase or score
- Payout reconciliation across merchants
- Useful for the Business Development & Viability judging criterion — shows a realistic B2B distribution path (integrate once with a vendor, inherit many merchants) rather than one-merchant-at-a-time growth

### Admin view — `/admin`
Platform-level operator (you, in Wave 1).
- Merchant and vendor onboarding queue — approve/reject, set verification flag on-chain
- Pool monitoring — liquidity in/out, aggregate on-time rate (public data only, no PII)
- Dispute queue — flagged agreements needing manual review
- Risk engine config — adjustable threshold for `checkEligibility` (tune without redeploying contract)
- Platform-wide analytics — aggregate metrics only (total agreements, default rate, pool utilization) — deliberately cannot drill into individual user, merchant-level, or vendor-level purchase data, which is itself a strong demo point for judges ("even the platform admin can't see your purchase history")

---

## 7. Design System (applying Acctual reference)

The Acctual reference ("paper invoice on frosted glass") maps well to ShadowPay conceptually — paper-white surfaces read as clean/trustworthy fintech, and the restrained accent color can double as your "privacy signal" color.

**Adaptation notes:**
- Keep Paper (`#ffffff`) canvas and Snow (`#fafafa`) alternating bands as-is
- Swap Electric Blue (`#0098f2`) role: use it specifically for privacy/proof indicators — checkmarks on "proof verified," eligibility pass states, the shield/lock iconography. This gives the accent color a semantic job (privacy confirmed) rather than pure branding
- Use Iris (`#6c56fc`) for the merchant-side elements and Leaf (`#5d9c06`) for user-side elements in the two-party agreement views (mirrors the FROM/TO invoice pattern already in the reference)
- Midnight (`#0d111b`) stays the primary button fill — thematically apt given the network name
- Keep pill buttons (100px radius), 16px card radius, 32px large panel radius exactly as specified
- Invoice Mockup Card component repurposes directly into an "Agreement Card" — same layered/rotated stacking effect works well showing multiple active BNPL agreements
- Payment Rate Badge component repurposes into "Proof Status Badge" (checkmark + "Eligibility Verified" instead of "Cards 2.7%")

**New components needed (not in Acctual reference):**
- Proof-loading state (spinner/progress while ZK proof generates client-side — this can take a few seconds, needs honest loading language: "Generating privacy proof…")
- Private/Public data toggle indicator — small lock icon pattern to mark which fields on any screen are private vs on-chain-visible, so users trust what's exposed
- Installment timeline component (horizontal stepper, paid/upcoming/due states)

**Icon library:** Use Hugeicons for all iconography (lock/shield for privacy indicators, checkmarks for proof-verified states, stepper icons for the installment timeline) — keep to the Acctual system's flat, single-color-per-icon treatment rather than duo-tone or filled variants, so icons sit quietly alongside the Electric Blue accent rather than competing with it.

---

## 8. UX Flow Priorities

Order of what must feel polished for the demo video, since Communication is 10% of judging and UX is 15%:

1. Wallet connect → eligibility check → pass proof (this is the "wow" moment, make the privacy explanation clear on-screen, not just in narration)
2. Agreement creation with visible private/public data split (label fields explicitly)
3. Repayment with proof receipt generation

Everything else (admin dashboard, merchant onboarding) can be functional but doesn't need the same design polish for Wave 1.

---

## 9. Prompts

### Design prompt (for frontend-design work)
> Build the ShadowPay landing and checkout flow using the Acctual design tokens: Paper (#ffffff) canvas, Open Runde typeface at weight 600 for headings with -0.03em tracking, pill-shaped buttons in Midnight (#0d111b), 16px card radius. Use Hugeicons for all iconography, flat single-color style, no duo-tone or filled variants. Repurpose the Electric Blue (#0098f2) checkmark pattern as a "privacy proof verified" indicator rather than a payment rate badge. Every screen showing purchase or repayment data must visually distinguish private fields (small lock icon, muted Fog #8d8d8d label) from public on-chain fields (Electric Blue label). Use the Invoice Mockup Card's layered/rotated stacking pattern for the active agreements list on the user dashboard.

### Engineering prompt (for contract + backend work)
> Implement a Compact contract with four circuits: checkEligibility (proves a private score meets a public threshold without revealing score or inputs), createAgreement (commits private purchase amount/schedule/merchant to a hash, publishes only agreementExists boolean and pool debit), recordPayment (proves an installment was paid on time against private schedule, publishes only onTimeStatus boolean), closeAgreement (proves all installments fulfilled). Public ledger state should never contain purchase amounts, merchant identity for a specific purchase, or the eligibility score itself — only booleans and aggregate pool figures. Wire the Django backend to orchestrate these calls and store any off-chain metadata encrypted per-user.

### UX copy prompt
> Write microcopy for the eligibility check loading state and result screen that plainly explains what stays private (exact score, income signals, purchase amount) versus what becomes visible on-chain (pass/fail only). Avoid jargon like "zero-knowledge proof" in primary copy — use "privacy proof" or "verified without sharing your details," and offer a "how this works" expandable for technical users.

---

## 10. Wave 1 Build Order (3 weeks)

1. **Week 1:** Compact contract — get `checkEligibility` compiling end-to-end on testnet. This is the technical gate, do it first.
2. **Week 1–2:** Backend risk engine (rules-based) + agreement orchestration service
3. **Week 2:** Frontend — wallet connect, checkout flow, eligibility check UI with Acctual-derived design system
4. **Week 2–3:** `createAgreement` + `recordPayment` circuits, repayment dashboard
5. **Week 3:** Merchant view (own agreements + payout), admin view (minimal — onboarding + pool monitoring), demo video, slide deck, README

Cut list if time runs short: vendor view can be a stub with hardcoded roster data for the demo (it's the weakest priority of the three dashboards for Wave 1); admin dashboard can also be minimal/hardcoded; `closeAgreement` circuit can be described in the README as "designed, implementation in Wave 2" if needed — but `checkEligibility`, `createAgreement`, and the merchant-scoped visibility must work live, since that's the core privacy claim.

---

## Appendix: Acctual Style Reference (source design doc)

> Paper invoice on frosted glass

**Theme:** light

Acctual runs a white-canvas invoicing product on a near-monochrome foundation: paper-white surfaces, dense near-black text, and a single electric blue (#0098f2) used as functional punctuation for checkmarks, rates, and inline highlights. The brand voice is geometric and confident — pill-shaped controls, generous 16px card radii, and rounded invoice mockups floating against pure white. Color is deployed sparingly: most screens stay achromatic so the blue, violet, and pink decorative chips read as deliberate accents rather than noise. Typography is built on Open Runde at weight 600, with tight -0.03em tracking on display sizes that gives headlines a compressed, almost monolinear feel, paired with handwritten Caveat signatures for testimonial contrast.

### Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Ink | `#1e1e1e` | `--color-ink` | Headings and primary body text |
| Carbon | `#0f0f0f` | `--color-carbon` | Body text and secondary headings, max contrast |
| Midnight | `#0d111b` | `--color-midnight` | Primary action buttons (filled) |
| Smoke | `#666666` | `--color-smoke` | Secondary body text, helper copy |
| Fog | `#8d8d8d` | `--color-fog` | Tertiary text, nav links, subdued metadata |
| Ash | `#999999` | `--color-ash` | Disabled state text, placeholder text |
| Mist | `#ccd1da` | `--color-mist` | Hairline borders, input outlines, dividers |
| Paper | `#ffffff` | `--color-paper` | Page canvas, card surfaces, hero background |
| Snow | `#f7fafc` | `--color-snow` | Subtle section backgrounds, alternating bands |
| Concrete | `#afb0b1` | `--color-concrete` | Muted surface fills, inactive chip backgrounds |
| Electric Blue | `#0098f2` | `--color-electric-blue` | Brand accent — checkmarks, rate callouts, highlights |
| Iris | `#6c56fc` | `--color-iris` | Decorative accent, violet chip |
| Magenta | `#f200ca` | `--color-magenta` | Decorative accent, pink chip |
| Leaf | `#5d9c06` | `--color-leaf` | Green text accent for links, tags, emphasis |
| Coral | `#ff6363` | `--color-coral` | Red decorative accent for icons/marks |
| Ice | `#cfeafa` | `--color-ice` | Tinted surface wash, light blue backgrounds |
| Lavender | `#e1e0fc` | `--color-lavender` | Tinted surface wash, light violet backgrounds |
| Blush | `#f6d2f4` | `--color-blush` | Tinted surface wash, light pink backgrounds |

### Tokens — Typography

**Open Runde** — primary typeface for all headings and body text. Weight 600 at display sizes (64/48/40/32/24/20px) with -0.03em tracking; weight 500 for body (22/16/14px) with -0.02em tracking; 11px uppercase eyebrow labels at weight 600 with +0.02em tracking. Substitute: Inter, DM Sans, or Outfit.

**Caveat** — handwritten signature font for testimonial attributions only, weight 600 at 16/24px. Substitute: Dancing Script or Kalam.

**SF Pro Text** — secondary system font for small uppercase labels, weight 600 at 11px, used sparingly.

#### Type Scale

| Role | Size | Line Height | Letter Spacing |
|------|------|-------------|----------------|
| eyebrow | 11px | 1.62 | 0.22px |
| body-sm | 14px | 1.43 | -0.28px |
| body | 16px | 1.5 | -0.32px |
| body-lg | 22px | 1.29 | — |
| subheading | 24px | 1.33 | -0.72px |
| heading-sm | 32px | 1.25 | -0.96px |
| heading | 40px | 1.2 | -1.2px |
| heading-lg | 48px | 1.17 | -1.44px |
| display | 64px | 1.13 | -1.92px |

### Tokens — Spacing & Shapes

Base unit: 4px. Density: comfortable. Scale: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64, 80, 96px.

**Border radius:** tags/buttons 100px (pill), cards 16px, icons 888px (circle), images 20px, largeCards 32px. No radius below 10px on interactive elements.

**Shadows:** subtle `rgba(10,13,20,0.03) 0px 1px 2px 0px`; subtle-2 (buttons) `rgb(36,38,40) 0px 0px 0px 1px, rgba(27,28,29,0.48) 0px 1px 2px 0px`; subtle-3 `rgba(0,0,0,0.06) 0px 2px 3px -1px`.

**Layout:** page max-width 1200px, section gap 96px, card padding 24px, element gap 12px.

### Components

- **Filled Action Button** — primary CTA. Background #0d111b, text #ffffff, 100px radius, pill padding, button shadow.
- **Secondary Dark Button** — compact dark action, background #0f0f0f, same shadow stack, denser padding.
- **Outline Link Button** — nav links, background #ffffff, text #1e1e1e, 100px radius, no shadow.
- **Feature Card** — background #fafafa, 16px radius, 24px padding, no shadow, 24px/600 heading, 16px/500 body in #666666.
- **Elevated Card** — background #ffffff, 20px radius, elevated-card shadow, no padding, content fills card.
- **Large Feature Panel** — background #fafafa, 32px radius, 96px/48px padding, no shadow.
- **Tinted Accent Card** — background Ice at 16% opacity, 16px radius, no padding/shadow.
- **Invoice Mockup Card** — background #ffffff, 16px radius, subtle shadow. FROM/TO blocks with Iris/Leaf circular icons, line-item table, layered with rotation/offset for depth.
- **Star Rating Block** — five solid amber stars, 24px/600 quote text, Caveat 16px/600 attribution.
- **Payment Rate Badge** — inline row: Electric Blue circular checkmark + label + bold rate value, no background/border/padding.
- **FAQ Accordion Item** — full-width row, 1px #ccd1da bottom border, 16px/500 question text, plus icon right, 16px vertical padding.
- **Pill-Shaped Header Container** — background #ffffff, 100px radius, wraps logo + nav + CTA inline with 8–12px gaps, floats with subtle shadow.
- **Logo Mark** — stacked chevron/arrow glyph in #1e1e1e, paired with wordmark 16px/500.
- **Eyebrow Label** — 11px/600 uppercase, +0.02em tracking, color #0098f2, no background/border.

### Do's and Don'ts

**Do:** Open Runde 600 with -0.03em tracking for headings 20px+; primary buttons #0d111b filled with white text, 100px pill; Electric Blue #0098f2 only for inline icons/callouts/eyebrow labels; 16px radius on content cards, 32px on large panels; page canvas pure #ffffff with #fafafa/#f7fafc only for alternating bands; Caveat only for testimonial attributions; stack invoice mockups with slight rotation/offset.

**Don't:** don't use #0098f2, #6c56fc, or #f200ca as button backgrounds; don't use pure #000000 for text or buttons; don't apply box-shadow to feature cards; don't use radius below 10px on interactive elements; don't use gradients; don't set body text lighter than #666666; don't use more than two chromatic accents on one screen.

### Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper | `#ffffff` | Page canvas |
| 1 | Snow | `#fafafa` | Alternating section bands, card backgrounds |
| 2 | Ice | `#cfeafa` | Tinted highlight blocks |
| 3 | Lavender | `#e1e0fc` | Secondary feature block backgrounds |

### Imagery

Minimal, product-focused: flat-lay photography of office objects cropped at the edges as atmospheric decoration. Dominant asset is the layered invoice mockup stack rendered as real UI, not illustration. Icons are simple flat geometric shapes (circles, rounded squares) in Electric Blue — no illustrations, no 3D renders, no lifestyle photography. Aesthetic: "desktop overhead shot meets UI artifact."

### Similar Brands

Stripe (flat white-canvas, pill buttons, restrained color), Linear (compressed geometric headlines, dark CTAs, near-monochrome), FreshBooks (invoicing category, paper mockup photography), Plausible Analytics (single vivid accent sparingly used), Vercel (near-black primary buttons, tight-tracking type).

### Quick Start — CSS Custom Properties

```css
:root {
  /* Colors */
  --color-ink: #1e1e1e;
  --color-carbon: #0f0f0f;
  --color-midnight: #0d111b;
  --color-smoke: #666666;
  --color-fog: #8d8d8d;
  --color-ash: #999999;
  --color-mist: #ccd1da;
  --color-paper: #ffffff;
  --color-snow: #f7fafc;
  --color-concrete: #afb0b1;
  --color-electric-blue: #0098f2;
  --color-iris: #6c56fc;
  --color-magenta: #f200ca;
  --color-leaf: #5d9c06;
  --color-coral: #ff6363;
  --color-ice: #cfeafa;
  --color-lavender: #e1e0fc;
  --color-blush: #f6d2f4;

  /* Typography */
  --font-open-runde: 'Open Runde', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-caveat: 'Caveat', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sf-pro-text: 'SF Pro Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Spacing */
  --spacing-4: 4px; --spacing-8: 8px; --spacing-12: 12px; --spacing-16: 16px;
  --spacing-20: 20px; --spacing-24: 24px; --spacing-32: 32px; --spacing-48: 48px;
  --spacing-64: 64px; --spacing-80: 80px; --spacing-96: 96px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 96px;
  --card-padding: 24px;
  --element-gap: 12px;

  /* Border Radius */
  --radius-cards: 16px;
  --radius-icons: 888px;
  --radius-images: 20px;
  --radius-buttons: 100px;
  --radius-largecards: 32px;

  /* Shadows */
  --shadow-subtle: rgba(10, 13, 20, 0.03) 0px 1px 2px 0px;
  --shadow-subtle-2: rgb(36, 38, 40) 0px 0px 0px 1px, rgba(27, 28, 29, 0.48) 0px 1px 2px 0px;
  --shadow-subtle-3: rgba(0, 0, 0, 0.06) 0px 2px 3px -1px;
}
```
