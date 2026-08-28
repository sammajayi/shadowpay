"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { getMerchantAgreements, getMerchantStats, type AgreementDetail, type MerchantStats } from "@/lib/api";
import { DataRow } from "@/components/PrivacyField";

const STATUS_LABEL: Record<AgreementDetail["status"], string> = {
  pending: "Confirming…",
  active: "Active",
  completed: "Completed",
};

export default function DashboardPage() {
  const { merchant, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [agreements, setAgreements] = useState<AgreementDetail[] | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!merchant) {
      router.push("/login");
      return;
    }
    getMerchantStats().then(setStats);
    getMerchantAgreements().then(setAgreements);
  }, [merchant, isLoading, router]);

  if (!merchant) return null;

  return (
    <div className="py-12">
      <span className="text-eyebrow text-fog">Own store only — never other merchants</span>
      <h1 className="text-heading-sm text-ink mt-1">{merchant.name}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Agreements</span>
          <p className="text-heading-sm text-ink mt-1">{stats?.agreement_count ?? "—"}</p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Volume disbursed</span>
          <p className="text-heading-sm text-ink mt-1">
            {stats ? `$${stats.total_volume.toLocaleString()}` : "—"}
          </p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">On-time rate</span>
          <p className="text-heading-sm text-ink mt-1">
            {stats?.on_time_rate != null ? `${Math.round(stats.on_time_rate * 100)}%` : "—"}
          </p>
        </div>
      </div>

      <h2 className="text-subheading text-ink mt-10 mb-4">Agreements</h2>

      {agreements === null && <p className="text-body-sm text-smoke">Loading…</p>}
      {agreements && agreements.length === 0 && (
        <div className="rounded-largecard bg-snow p-12 text-center">
          <p className="text-body text-smoke">No agreements yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {agreements?.map((agreement) => (
          <Link
            key={agreement.id}
            href={`/agreements/${agreement.id}`}
            className="block rounded-card bg-paper border border-mist/60 shadow-[var(--shadow-subtle)] p-5 hover:shadow-[var(--shadow-subtle-3)] transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-body-sm font-medium text-ink">{agreement.item_description}</span>
              <span className="text-eyebrow text-fog">{STATUS_LABEL[agreement.status]}</span>
            </div>
            <DataRow kind="private" label="Amount" value={`$${agreement.amount.toLocaleString()}`} />
            <DataRow kind="public" label="Agreement exists" value="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
