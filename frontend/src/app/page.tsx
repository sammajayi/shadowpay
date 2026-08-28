"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon, Shield01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/Button";
import { ProofStatusBadge } from "@/components/ProofStatusBadge";
import { useAuth } from "@/lib/auth-context";

const FEATURES = [
  {
    icon: LockIcon,
    title: "Your purchase stays yours",
    body: "Amount, item, and merchant are private witnesses in a ZK proof — never written to any public ledger field.",
  },
  {
    icon: Shield01Icon,
    title: "Eligibility without exposure",
    body: "checkEligibility proves your score clears the bar without ever revealing the score or the signals behind it.",
  },
  {
    icon: CheckmarkCircle02Icon,
    title: "Merchant-scoped, always",
    body: "Only you and the merchant you bought from can ever see that purchase — not other merchants, not the platform.",
  },
];

export default function Home() {
  const { user, isConnecting, connect } = useAuth();

  return (
    <div className="py-16">
      <section className="text-center max-w-2xl mx-auto">
        <span className="text-eyebrow text-electric-blue">Privacy-first BNPL on Midnight</span>
        <h1 className="text-heading-lg mt-4 text-ink">Buy now. Pay later. Prove nothing you don&apos;t want to.</h1>
        <p className="text-body-lg text-smoke mt-4">
          ShadowPay puts your installment plan on-chain without putting your purchase, income, or repayment
          history on-chain. The network only ever sees pass/fail.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button variant="primary">Go to dashboard</Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={() => connect().catch(() => {})} disabled={isConnecting}>
              {isConnecting ? "Connecting…" : "Connect Lace wallet"}
            </Button>
          )}
          <ProofStatusBadge status="verified" label="ZK-verified checkout" />
        </div>
      </section>

      <section className="mt-24 grid gap-6 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-card bg-snow p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-icon bg-paper text-electric-blue mb-4">
              <HugeiconsIcon icon={feature.icon} size={20} strokeWidth={2} />
            </span>
            <h3 className="text-subheading text-ink">{feature.title}</h3>
            <p className="text-body-sm text-smoke mt-2">{feature.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
