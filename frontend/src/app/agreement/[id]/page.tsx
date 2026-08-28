"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Share01Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth-context";
import { confirmPayment, getMyAgreementDetail, initiatePayment, type AgreementDetail } from "@/lib/api";
import { runRecordPaymentCircuit } from "@/lib/contract";
import { toEpochDay, todayEpochDay } from "@/lib/date";
import { DataRow } from "@/components/PrivacyField";
import { ProofStatusBadge } from "@/components/ProofStatusBadge";
import { InstallmentTimeline } from "@/components/InstallmentTimeline";
import { Button } from "@/components/Button";

export default function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  function load() {
    getMyAgreementDetail(id)
      .then(setAgreement)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load agreement"));
  }

  useEffect(() => {
    if (!user) {
      router.push("/connect");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, router]);

  async function handlePayNext() {
    if (!agreement) return;
    setError(null);
    setIsPaying(true);
    try {
      const witness = await initiatePayment(agreement.id);
      const dueDate = witness.installments[witness.installment_index].due_date;
      const result = await runRecordPaymentCircuit({
        dueDateEpochDay: toEpochDay(dueDate),
        paymentDateEpochDay: witness.payment_date_epoch_day ?? todayEpochDay(),
      });
      const updated = await confirmPayment(agreement.id, witness.payment_id, result.onTime, result.txHash);
      setAgreement(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setIsPaying(false);
    }
  }

  if (!user) return null;
  if (error && !agreement) return <p className="text-body-sm text-coral py-12">{error}</p>;
  if (!agreement) return <p className="text-body-sm text-smoke py-12">Loading…</p>;

  const paidCount = agreement.payments.filter((p) => p.paid_at).length;
  const canPayNext = agreement.status === "active" && paidCount < agreement.installments.length;

  return (
    <div className="max-w-lg mx-auto py-12">
      <span className="text-eyebrow text-fog">Agreement</span>
      <h1 className="text-heading-sm text-ink mt-1">{agreement.merchant_display_name}</h1>

      <div className="mt-6">
        <ProofStatusBadge
          status="verified"
          label={agreement.status === "completed" ? "Agreement completed" : "Agreement committed on-chain"}
        />
      </div>

      <div className="mt-6 rounded-card bg-paper border border-mist/60 shadow-[var(--shadow-subtle)] p-6">
        <DataRow kind="private" label="Item" value={agreement.item_description} />
        <DataRow kind="private" label="Amount" value={`$${agreement.amount.toLocaleString()}`} />
        <DataRow kind="public" label="Agreement exists" value="true" />
        <DataRow
          kind="public"
          label="Agreement id"
          value={
            agreement.onchain_agreement_id
              ? `${agreement.onchain_agreement_id.slice(0, 10)}…`
              : "pending"
          }
        />

        <p className="text-eyebrow text-fog mt-6 mb-2">Installment schedule</p>
        <InstallmentTimeline installments={agreement.installments} payments={agreement.payments} />

        {canPayNext && (
          <div className="mt-6">
            <Button variant="primary" className="w-full" onClick={handlePayNext} disabled={isPaying}>
              {isPaying ? "Generating privacy proof…" : `Pay installment ${paidCount + 1} of ${agreement.installments.length}`}
            </Button>
            <p className="text-body-sm text-fog text-center mt-2">
              Only whether this payment was on time becomes public — never the amount.
            </p>
          </div>
        )}

        {error && <p className="text-body-sm text-coral mt-4">{error}</p>}

        <div className="mt-6 pt-4 border-t border-mist/60 flex justify-between items-center">
          <span className="text-body-sm text-smoke">Proof receipt</span>
          <Button variant="outline">
            <HugeiconsIcon icon={Share01Icon} size={16} strokeWidth={2} />
            Share proof of good standing
          </Button>
        </div>
      </div>
    </div>
  );
}
