"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Wallet01Icon, LockIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { isWalletAvailable } from "@/lib/wallet";

export default function ConnectPage() {
  const { user, isConnecting, error, connect } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  return (
    <div className="max-w-md mx-auto py-24 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-icon bg-snow text-midnight mb-6">
        <HugeiconsIcon icon={Wallet01Icon} size={26} strokeWidth={2} />
      </span>
      <h1 className="text-heading-sm text-ink">Connect your wallet</h1>
      <p className="text-body-sm text-smoke mt-3">
        ShadowPay authenticates by asking Lace to sign a one-time message — no password, and your keys never
        leave the wallet.
      </p>

      <div className="mt-8">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => connect().catch(() => {})}
          disabled={isConnecting}
        >
          {isConnecting ? "Waiting for signature…" : "Connect Lace"}
        </Button>
      </div>

      {!isWalletAvailable() && (
        <p className="text-body-sm text-coral mt-4">
          No Midnight wallet extension detected. Install Lace to continue.
        </p>
      )}
      {error && <p className="text-body-sm text-coral mt-4">{error}</p>}

      <div className="mt-10 flex items-center justify-center gap-2 text-eyebrow text-fog">
        <HugeiconsIcon icon={LockIcon} size={12} strokeWidth={2} />
        Signature only proves wallet ownership — no funds move
      </div>
    </div>
  );
}
