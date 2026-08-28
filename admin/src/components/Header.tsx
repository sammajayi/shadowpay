"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth-context";
import { Button } from "./Button";

function truncateAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function Header() {
  const { user, isConnecting, connect, disconnect } = useAuth();

  return (
    <header className="sticky top-4 z-10 mx-auto mt-4 w-full max-w-[1200px] px-4">
      <div className="flex items-center justify-between gap-3 rounded-button bg-paper px-4 py-3 shadow-[var(--shadow-subtle)] border border-mist/60">
        <Link href="/" className="flex items-center gap-2 text-body font-medium text-ink">
          <HugeiconsIcon icon={Settings01Icon} size={22} strokeWidth={2} />
          ShadowPay Admin
        </Link>

        <nav className="hidden sm:flex items-center gap-1 text-body-sm">
          <Link href="/dashboard" className="rounded-button px-3 py-1.5 hover:bg-snow text-ink">
            Dashboard
          </Link>
          <Link href="/onboarding" className="rounded-button px-3 py-1.5 hover:bg-snow text-ink">
            Onboarding
          </Link>
        </nav>

        {user ? (
          <button
            onClick={disconnect}
            className="inline-flex items-center gap-2 rounded-button bg-snow px-4 py-2 text-body-sm text-ink hover:bg-mist/40"
          >
            <HugeiconsIcon icon={Wallet01Icon} size={16} strokeWidth={2} />
            {truncateAddress(user.wallet_address)}
          </button>
        ) : (
          <Button variant="primary" onClick={() => connect().catch(() => {})} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : "Connect wallet"}
          </Button>
        )}
      </div>
    </header>
  );
}
