import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Store01Icon } from "@hugeicons/core-free-icons";
import clsx from "clsx";

import type { AgreementDetail } from "@/lib/api";
import { DataRow } from "./PrivacyField";
import { ProofStatusBadge } from "./ProofStatusBadge";

const STATUS_LABEL: Record<AgreementDetail["status"], string> = {
  pending: "Confirming on-chain…",
  active: "Active",
  completed: "Completed",
};

/**
 * Repurposes the Acctual "Invoice Mockup Card" — white surface, 16px
 * radius, subtle shadow, optional rotation/offset for a stacked-cards
 * effect on the dashboard list (section 7).
 */
export function AgreementCard({
  agreement,
  rotate = 0,
}: {
  agreement: AgreementDetail;
  rotate?: number;
}) {
  return (
    <Link
      href={`/agreement/${agreement.id}`}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
      className="block rounded-card bg-paper p-6 shadow-[var(--shadow-subtle)] border border-mist/60 hover:shadow-[var(--shadow-subtle-3)] transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-body-sm text-smoke">
          <span className="flex h-8 w-8 items-center justify-center rounded-icon bg-leaf/10 text-leaf">
            <HugeiconsIcon icon={Store01Icon} size={16} strokeWidth={2} />
          </span>
          {agreement.merchant_display_name}
        </div>
        <span
          className={clsx(
            "text-eyebrow px-2 py-1 rounded-button",
            agreement.status === "active" && "bg-electric-blue/10 text-electric-blue",
            agreement.status === "completed" && "bg-leaf/10 text-leaf",
            agreement.status === "pending" && "bg-snow text-fog"
          )}
        >
          {STATUS_LABEL[agreement.status]}
        </span>
      </div>

      <DataRow kind="private" label="Item" value={agreement.item_description} />
      <DataRow kind="private" label="Amount" value={`$${agreement.amount.toLocaleString()}`} />
      <DataRow kind="public" label="Agreement exists" value="true" />

      <div className="mt-4 pt-4 border-t border-mist/60">
        <ProofStatusBadge status="verified" label="Agreement committed" />
      </div>
    </Link>
  );
}
