"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Wallet01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useWalletAvailable } from "@/lib/wallet";

export default function ConnectPage() {
  const { user, isConnecting, error, connect } = useAuth();
  const router = useRouter();
  const walletAvailable = useWalletAvailable();

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  return (
    <div className="max-w-md mx-auto py-24 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-icon bg-snow text-midnight mb-6">
        <HugeiconsIcon icon={Wallet01Icon} size={26} strokeWidth={2} />
      </span>
      <h1 className="text-heading-sm text-ink">Admin sign-in</h1>
      <p className="text-body-sm text-smoke mt-3">
        Connect the wallet whose account has been granted the admin role.
      </p>

      <div className="mt-8">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => connect().catch(() => {})}
          disabled={isConnecting}
        >
          {isConnecting ? "Waiting for signature…" : "Connect wallet"}
        </Button>
      </div>

      {!walletAvailable && (
        <p className="text-body-sm text-coral mt-4">No Midnight wallet extension detected.</p>
      )}
      {error && <p className="text-body-sm text-coral mt-4">{error}</p>}
    </div>
  );
}
