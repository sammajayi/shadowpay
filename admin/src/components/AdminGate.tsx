"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.push("/connect");
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <h1 className="text-heading-sm text-ink">Not an admin</h1>
        <p className="text-body-sm text-smoke mt-3">
          {user.wallet_address} is signed in but doesn&apos;t have the admin role. Ask a platform operator to
          grant it.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
