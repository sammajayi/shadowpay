"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building03Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth-context";
import { Button } from "./Button";

export function Header() {
  const { vendor, logout } = useAuth();

  return (
    <header className="sticky top-4 z-10 mx-auto mt-4 w-full max-w-[1200px] px-4">
      <div className="flex items-center justify-between gap-3 rounded-button bg-paper px-4 py-3 shadow-[var(--shadow-subtle)] border border-mist/60">
        <Link href="/" className="flex items-center gap-2 text-body font-medium text-ink">
          <HugeiconsIcon icon={Building03Icon} size={22} strokeWidth={2} />
          ShadowPay Vendor
        </Link>

        {vendor && (
          <div className="flex items-center gap-3">
            <span className="text-body-sm text-smoke">{vendor.name}</span>
            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
