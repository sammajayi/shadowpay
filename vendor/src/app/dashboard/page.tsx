"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Clock01Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth-context";
import {
  getVendorPayouts,
  getVendorRoster,
  getVendorStats,
  type PayoutRow,
  type RosterMerchant,
  type VendorStats,
} from "@/lib/api";

export default function DashboardPage() {
  const { vendor, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [roster, setRoster] = useState<RosterMerchant[] | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!vendor) {
      router.push("/login");
      return;
    }
    getVendorStats().then(setStats);
    getVendorRoster().then(setRoster);
    getVendorPayouts().then(setPayouts);
  }, [vendor, isLoading, router]);

  if (!vendor) return null;

  return (
    <div className="py-12">
      <span className="text-eyebrow text-fog">Aggregate only — no drill-down into any merchant&apos;s customers</span>
      <h1 className="text-heading-sm text-ink mt-1">{vendor.name}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Merchants</span>
          <p className="text-heading-sm text-ink mt-1">{stats?.merchant_count ?? "—"}</p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Agreements</span>
          <p className="text-heading-sm text-ink mt-1">{stats?.agreement_count ?? "—"}</p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Volume</span>
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

      <h2 className="text-subheading text-ink mt-10 mb-4">Merchant roster</h2>
      {roster === null && <p className="text-body-sm text-smoke">Loading…</p>}
      {roster && roster.length === 0 && (
        <div className="rounded-largecard bg-snow p-12 text-center">
          <p className="text-body text-smoke">No merchants onboarded yet.</p>
        </div>
      )}
      <div className="space-y-2">
        {roster?.map((merchant) => (
          <div
            key={merchant.id}
            className="flex items-center justify-between rounded-card bg-paper border border-mist/60 px-5 py-3"
          >
            <span className="text-body-sm text-ink">{merchant.name}</span>
            <span
              className={`inline-flex items-center gap-1 text-eyebrow ${
                merchant.verified ? "text-electric-blue" : "text-fog"
              }`}
            >
              <HugeiconsIcon icon={merchant.verified ? CheckmarkCircle02Icon : Clock01Icon} size={14} strokeWidth={2} />
              {merchant.verified ? "Verified" : "Pending"}
            </span>
          </div>
        ))}
      </div>

      <h2 className="text-subheading text-ink mt-10 mb-4">Payout reconciliation</h2>
      <div className="overflow-x-auto rounded-card border border-mist/60">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="bg-snow text-eyebrow text-fog">
              <th className="text-left px-4 py-3">Merchant</th>
              <th className="text-right px-4 py-3">Agreements</th>
              <th className="text-right px-4 py-3">Volume</th>
            </tr>
          </thead>
          <tbody>
            {payouts?.map((row) => (
              <tr key={row.merchant_id} className="border-t border-mist/60">
                <td className="px-4 py-3 text-ink">{row.merchant_name}</td>
                <td className="px-4 py-3 text-right text-ink">{row.agreement_count}</td>
                <td className="px-4 py-3 text-right text-ink">${row.total_volume.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
