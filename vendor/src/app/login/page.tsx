"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Key01Icon } from "@hugeicons/core-free-icons";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const { vendor, login } = useAuth();
  const router = useRouter();
  const [apiKey, setApiKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendor) router.push("/dashboard");
  }, [vendor, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(apiKey.trim());
      router.push("/dashboard");
    } catch {
      setError("Invalid API key");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-24 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-icon bg-snow text-midnight mb-6">
        <HugeiconsIcon icon={Key01Icon} size={26} strokeWidth={2} />
      </span>
      <h1 className="text-heading-sm text-ink">Vendor sign-in</h1>
      <p className="text-body-sm text-smoke mt-3">
        Enter your vendor-scoped API key. This unlocks aggregate stats across your merchant roster only —
        never a drill-down into any one merchant&apos;s or customer&apos;s data.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 text-left">
        <label className="text-eyebrow text-fog block mb-1">API key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="sp_…"
          className="w-full rounded-button border border-mist px-4 py-2 text-body-sm mb-4"
        />
        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting || !apiKey}>
          {isSubmitting ? "Checking…" : "Sign in"}
        </Button>
        {error && <p className="text-body-sm text-coral mt-3 text-center">{error}</p>}
      </form>
    </div>
  );
}
