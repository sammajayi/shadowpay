import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Loading03Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import clsx from "clsx";

/**
 * Repurposes the Acctual "Payment Rate Badge" pattern (Electric Blue
 * checkmark + label) as a "privacy proof verified" indicator — the
 * scope doc's explicit reassignment of that accent color's semantic
 * job (section 7). This is the one place Electric Blue means
 * something specific: a ZK proof actually checked out.
 */
export function ProofStatusBadge({
  status,
  label,
}: {
  status: "generating" | "verified" | "failed";
  label?: string;
}) {
  if (status === "generating") {
    return (
      <span className="inline-flex items-center gap-2 text-body-sm text-smoke">
        <HugeiconsIcon icon={Loading03Icon} size={18} strokeWidth={2} className="animate-spin" />
        {label ?? "Generating privacy proof…"}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-2 text-body-sm text-coral">
        <HugeiconsIcon icon={Shield01Icon} size={18} strokeWidth={2} />
        {label ?? "Proof failed"}
      </span>
    );
  }
  return (
    <span className={clsx("inline-flex items-center gap-2 text-body-sm font-medium text-electric-blue")}>
      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />
      {label ?? "Privacy proof verified"}
    </span>
  );
}
