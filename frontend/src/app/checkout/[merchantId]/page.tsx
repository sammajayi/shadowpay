"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CancelCircleIcon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth-context";
import {
  confirmAgreement,
  confirmEligibility,
  initiateAgreement,
  postEligibilityWitness,
  type EligibilityWitness,
  type Installment,
} from "@/lib/api";
import { runCheckEligibilityCircuit, runCreateAgreementCircuit } from "@/lib/contract";
import { Button } from "@/components/Button";
import { DataRow } from "@/components/PrivacyField";
import { ProofStatusBadge } from "@/components/ProofStatusBadge";
import { InstallmentTimeline } from "@/components/InstallmentTimeline";

type Step = "plan" | "checking-eligibility" | "ineligible" | "confirm-agreement" | "creating-agreement";

const DEMO_ITEM = { description: "Wireless headphones", merchantDisplayName: "Demo Storefront", amount: 400 };

function fourInstallments(total: number): Installment[] {
  const per = Math.round(total / 4);
  const today = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const due = new Date(today);
    due.setMonth(due.getMonth() + i + 1);
    return { amount: per, due_date: due.toISOString().slice(0, 10) };
  });
}

export default function CheckoutPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId: merchantIdParam } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [merchantId, setMerchantId] = useState(
    merchantIdParam === "demo-merchant" ? "" : merchantIdParam
  );
  const [step, setStep] = useState<Step>("plan");
  const [eligibility, setEligibility] = useState<EligibilityWitness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const installments = fourInstallments(DEMO_ITEM.amount);

  useEffect(() => {
    if (!user) router.push("/connect");
  }, [user, router]);

  async function handleCheckEligibility() {
    setError(null);
    setStep("checking-eligibility");
    try {
      const witness = await postEligibilityWitness();
      setEligibility(witness);
      const result = await runCheckEligibilityCircuit({
        walletAgeSignal: witness.wallet_age_signal,
        repaymentSignal: witness.repayment_signal,
        incomeSignal: witness.income_signal,
        threshold: witness.threshold,
      });
      await confirmEligibility(witness.check_id, result.passed, result.onchainUserKey);
      setStep(result.passed ? "confirm-agreement" : "ineligible");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("plan");
    }
  }

  async function handleCreateAgreement() {
    if (!merchantId) {
      setError("Enter a merchant id to continue.");
      return;
    }
    setError(null);
    setStep("creating-agreement");
    try {
      const payload = await initiateAgreement({
        merchant_id: merchantId,
        amount: DEMO_ITEM.amount,
        installments,
        item_description: DEMO_ITEM.description,
        merchant_display_name: DEMO_ITEM.merchantDisplayName,
      });
      const result = await runCreateAgreementCircuit();
      await confirmAgreement(payload.agreement_id, result.onchainAgreementId, result.txHash);
      router.push(`/agreement/${payload.agreement_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create agreement");
      setStep("confirm-agreement");
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto py-12">
      <span className="text-eyebrow text-fog">Checkout</span>
      <h1 className="text-heading-sm text-ink mt-1">{DEMO_ITEM.merchantDisplayName}</h1>

      <div className="mt-8 rounded-card bg-paper border border-mist/60 shadow-[var(--shadow-subtle)] p-6">
        <DataRow kind="private" label="Item" value={DEMO_ITEM.description} />
        <DataRow kind="private" label="Amount" value={`$${DEMO_ITEM.amount}`} />
        <DataRow kind="private" label="Plan" value="Pay in 4" />

        {step === "plan" && (
          <div className="mt-4">
            <label className="text-eyebrow text-fog block mb-1">Merchant ID (from admin onboarding)</label>
            <input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="paste merchant UUID"
              className="w-full rounded-button border border-mist px-4 py-2 text-body-sm mb-4"
            />
            <Button variant="primary" className="w-full" onClick={handleCheckEligibility}>
              Check eligibility
            </Button>
          </div>
        )}

        {step === "checking-eligibility" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6">
            <ProofStatusBadge status="generating" />
            <p className="text-body-sm text-fog text-center max-w-xs">
              Verified without sharing your details — your score and its inputs never leave your device.
            </p>
          </div>
        )}

        {step === "ineligible" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6">
            <HugeiconsIcon icon={CancelCircleIcon} size={28} strokeWidth={2} className="text-coral" />
            <p className="text-body text-ink">Not eligible right now</p>
            <p className="text-body-sm text-fog text-center max-w-xs">
              Only pass/fail is ever recorded on-chain — no reason, score, or signal is shared with anyone.
            </p>
            <Button variant="outline" onClick={() => setStep("plan")}>
              Back
            </Button>
          </div>
        )}

        {step === "confirm-agreement" && eligibility && (
          <div className="mt-6">
            <div className="flex flex-col items-center gap-2 py-4">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} strokeWidth={2} className="text-electric-blue" />
              <ProofStatusBadge status="verified" label="Eligibility verified" />
            </div>
            <label className="text-eyebrow text-fog block mb-1 mt-4">Merchant ID</label>
            <input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="paste merchant UUID"
              className="w-full rounded-button border border-mist px-4 py-2 text-body-sm mb-4"
            />
            <p className="text-eyebrow text-fog mb-2 mt-2">Installment schedule</p>
            <InstallmentTimeline installments={installments} />
            <Button variant="primary" className="w-full mt-6" onClick={handleCreateAgreement}>
              Confirm agreement
            </Button>
          </div>
        )}

        {step === "creating-agreement" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6">
            <ProofStatusBadge status="generating" label="Committing agreement…" />
            <p className="text-body-sm text-fog text-center max-w-xs">
              Only that this agreement exists, and the pool debit, become public. The amount, schedule, and
              merchant stay private to you and {DEMO_ITEM.merchantDisplayName}.
            </p>
          </div>
        )}

        {error && <p className="text-body-sm text-coral mt-4">{error}</p>}
      </div>
    </div>
  );
}
