import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Clock01Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import clsx from "clsx";
import type { Installment, Payment } from "@/lib/api";

type InstallmentState = "paid-on-time" | "paid-late" | "upcoming" | "due";

function stateFor(installment: Installment, index: number, payments: Payment[]): InstallmentState {
  const payment = payments.find((p) => p.installment_index === index);
  if (payment?.paid_at) {
    return payment.on_time ? "paid-on-time" : "paid-late";
  }
  const due = new Date(installment.due_date);
  return due.getTime() < Date.now() ? "due" : "upcoming";
}

export function InstallmentTimeline({
  installments,
  payments = [],
}: {
  installments: Installment[];
  payments?: Payment[];
}) {
  return (
    <div className="flex items-center gap-2">
      {installments.map((installment, index) => {
        const state = stateFor(installment, index, payments);
        return (
          <div key={index} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-icon border text-body-sm font-medium",
                  state === "paid-on-time" && "bg-electric-blue border-electric-blue text-white",
                  state === "paid-late" && "bg-coral/10 border-coral text-coral",
                  state === "due" && "bg-coral/10 border-coral text-coral",
                  state === "upcoming" && "bg-snow border-mist text-fog"
                )}
                title={state === "paid-late" ? "Paid late" : undefined}
              >
                {state === "paid-on-time" || state === "paid-late" ? (
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />
                ) : state === "due" ? (
                  <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} />
                ) : (
                  <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={2} />
                )}
              </div>
              <span className="text-eyebrow text-fog">{installment.due_date}</span>
            </div>
            {index < installments.length - 1 && <div className="h-px flex-1 bg-mist -mt-6" />}
          </div>
        );
      })}
    </div>
  );
}
