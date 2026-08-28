"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { getMerchantAgreementDetail, type AgreementDetail } from "@/lib/api";
import { DataRow } from "@/components/PrivacyField";
import { ProofStatusBadge } from "@/components/ProofStatusBadge";
import { InstallmentTimeline } from "@/components/InstallmentTimeline";

export default function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { merchant, isLoading } = useAuth();
  const router = useRouter();
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!merchant) {
      router.push("/login");
      return;
    }
    getMerchantAgreementDetail(id)
      .then(setAgreement)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load agreement"));
  }, [id, merchant, isLoading, router]);

  if (!merchant) return null;
  if (error) return <p className="text-body-sm text-coral py-12">{error}</p>;
  if (!agreement) return <p className="text-body-sm text-smoke py-12">Loading…</p>;

  return (
    <div className="max-w-lg mx-auto py-12">
      <span className="text-eyebrow text-fog">Agreement</span>
      <h1 className="text-heading-sm text-ink mt-1">{agreement.item_description}</h1>

      <div className="mt-6">
        <ProofStatusBadge status="verified" label="Agreement committed on-chain" />
      </div>

      <div className="mt-6 rounded-card bg-paper border border-mist/60 shadow-[var(--shadow-subtle)] p-6">
        <DataRow kind="private" label="Amount" value={`$${agreement.amount.toLocaleString()}`} />
        <DataRow kind="public" label="Agreement exists" value="true" />
        <DataRow
          kind="public"
          label="Agreement id"
          value={agreement.onchain_agreement_id ? `${agreement.onchain_agreement_id.slice(0, 10)}…` : "pending"}
        />

        <p className="text-eyebrow text-fog mt-6 mb-2">Installment schedule</p>
        <InstallmentTimeline installments={agreement.installments} payments={agreement.payments} />
      </div>
    </div>
  );
}
