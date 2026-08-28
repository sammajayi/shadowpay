"use client";

import { useEffect, useState } from "react";

import { AdminGate } from "@/components/AdminGate";
import { Button } from "@/components/Button";
import {
  getDisputeQueue,
  getPoolMonitoring,
  getRiskConfig,
  updateRiskConfig,
  type DisputeRow,
  type PoolMonitoring,
  type RiskConfig,
} from "@/lib/api";

function DashboardContent() {
  const [pool, setPool] = useState<PoolMonitoring | null>(null);
  const [disputes, setDisputes] = useState<DisputeRow[] | null>(null);
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);
  const [thresholdInput, setThresholdInput] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);

  useEffect(() => {
    getPoolMonitoring().then(setPool);
    getDisputeQueue().then(setDisputes);
    getRiskConfig().then((config) => {
      setRiskConfig(config);
      setThresholdInput(String(config.threshold));
    });
  }, []);

  async function handleSaveThreshold() {
    const value = Number(thresholdInput);
    if (!Number.isFinite(value) || value < 0) return;
    setSavingThreshold(true);
    try {
      const updated = await updateRiskConfig(value);
      setRiskConfig(updated);
    } finally {
      setSavingThreshold(false);
    }
  }

  return (
    <div className="py-12">
      <span className="text-eyebrow text-fog">Platform aggregates only — never individual purchase data</span>
      <h1 className="text-heading-sm text-ink mt-1">Pool monitoring</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Total agreements</span>
          <p className="text-heading-sm text-ink mt-1">{pool?.total_agreements ?? "—"}</p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Active</span>
          <p className="text-heading-sm text-ink mt-1">{pool?.active_agreements ?? "—"}</p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Completed</span>
          <p className="text-heading-sm text-ink mt-1">{pool?.completed_agreements ?? "—"}</p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Volume disbursed</span>
          <p className="text-heading-sm text-ink mt-1">
            {pool ? `$${pool.total_volume_disbursed.toLocaleString()}` : "—"}
          </p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Aggregate on-time rate</span>
          <p className="text-heading-sm text-ink mt-1">
            {pool?.aggregate_on_time_rate != null ? `${Math.round(pool.aggregate_on_time_rate * 100)}%` : "—"}
          </p>
        </div>
        <div className="rounded-card bg-snow p-6">
          <span className="text-eyebrow text-fog">Disputed</span>
          <p className="text-heading-sm text-ink mt-1">{pool?.disputed_agreements ?? "—"}</p>
        </div>
      </div>

      <h2 className="text-subheading text-ink mt-10 mb-4">Risk engine config</h2>
      <div className="rounded-card bg-paper border border-mist/60 p-6 max-w-sm">
        <label className="text-eyebrow text-fog block mb-1">Eligibility threshold</label>
        <p className="text-body-sm text-smoke mb-3">
          Mirrors the contract&apos;s public eligibilityThreshold. Retuning here changes what the risk engine
          hands the frontend — it does not itself write the on-chain ledger value.
        </p>
        <div className="flex gap-2">
          <input
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            type="number"
            min={0}
            className="flex-1 rounded-button border border-mist px-4 py-2 text-body-sm"
          />
          <Button variant="secondary" onClick={handleSaveThreshold} disabled={savingThreshold}>
            {savingThreshold ? "Saving…" : "Save"}
          </Button>
        </div>
        {riskConfig && (
          <p className="text-eyebrow text-fog mt-2">
            Last updated {new Date(riskConfig.updated_at).toLocaleString()}
          </p>
        )}
      </div>

      <h2 className="text-subheading text-ink mt-10 mb-4">Dispute queue</h2>
      {disputes && disputes.length === 0 && (
        <div className="rounded-largecard bg-snow p-12 text-center">
          <p className="text-body text-smoke">No agreements currently flagged for review.</p>
        </div>
      )}
      <div className="space-y-2">
        {disputes?.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-card bg-paper border border-mist/60 px-5 py-3"
          >
            <span className="text-body-sm text-ink">Agreement {d.id.slice(0, 8)}…</span>
            <span className="text-eyebrow text-coral">{d.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminGate>
      <DashboardContent />
    </AdminGate>
  );
}
