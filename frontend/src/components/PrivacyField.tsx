import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon, GlobalIcon } from "@hugeicons/core-free-icons";
import clsx from "clsx";

/**
 * Every screen showing purchase or repayment data must visually
 * distinguish private fields from public on-chain fields
 * (shadowpay-mvp-scope.md section 7): a small lock icon + muted Fog
 * (#8d8d8d) label for private data, an Electric Blue (#0098f2) label
 * for anything that's actually public on-chain. This component is
 * THE enforcement point for that rule — every field row on checkout,
 * agreement, and dashboard screens should render through it rather
 * than a bespoke label, so the private/public distinction can't
 * silently drift screen to screen.
 */
export function FieldLabel({ kind, children }: { kind: "private" | "public"; children: React.ReactNode }) {
  if (kind === "private") {
    return (
      <span className="inline-flex items-center gap-1 text-eyebrow text-fog">
        <HugeiconsIcon icon={LockIcon} size={12} strokeWidth={2} />
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-eyebrow text-electric-blue">
      <HugeiconsIcon icon={GlobalIcon} size={12} strokeWidth={2} />
      {children}
    </span>
  );
}

export function DataRow({
  label,
  value,
  kind,
  className,
}: {
  label: string;
  value: React.ReactNode;
  kind: "private" | "public";
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center justify-between gap-4 py-2", className)}>
      <FieldLabel kind={kind}>{label}</FieldLabel>
      <span className={clsx("text-body-sm", kind === "private" ? "text-ink" : "text-ink font-medium")}>
        {value}
      </span>
    </div>
  );
}
