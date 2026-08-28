"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth-context";
import { getMyAgreements, type AgreementDetail } from "@/lib/api";
import { AgreementCard } from "@/components/AgreementCard";
import { Button } from "@/components/Button";

const ROTATIONS = [-2, 1.5, -1, 2, 0];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [agreements, setAgreements] = useState<AgreementDetail[] | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/connect");
      return;
    }
    getMyAgreements().then(setAgreements);
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="py-12">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-eyebrow text-fog">Your agreements</span>
          <h1 className="text-heading-sm text-ink mt-1">Dashboard</h1>
        </div>
        <Link href="/checkout/demo-merchant">
          <Button variant="secondary">
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
            New checkout
          </Button>
        </Link>
      </div>

      {agreements === null && <p className="text-body-sm text-smoke mt-8">Loading…</p>}

      {agreements && agreements.length === 0 && (
        <div className="mt-8 rounded-largecard bg-snow p-12 text-center">
          <p className="text-body text-smoke">No agreements yet. Start a checkout to create your first one.</p>
        </div>
      )}

      {agreements && agreements.length > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agreements.map((agreement, i) => (
            <AgreementCard key={agreement.id} agreement={agreement} rotate={ROTATIONS[i % ROTATIONS.length]} />
          ))}
        </div>
      )}
    </div>
  );
}
