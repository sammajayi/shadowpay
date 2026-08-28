"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";

import { AdminGate } from "@/components/AdminGate";
import { Button } from "@/components/Button";
import {
  approveMerchant,
  approveVendor,
  createMerchant,
  createVendor,
  listMerchants,
  listVendors,
  rejectMerchant,
  type AdminMerchant,
  type AdminVendor,
} from "@/lib/api";

function OnboardingContent() {
  const [merchants, setMerchants] = useState<AdminMerchant[] | null>(null);
  const [vendors, setVendors] = useState<AdminVendor[] | null>(null);

  const [newMerchantName, setNewMerchantName] = useState("");
  const [newMerchantEmail, setNewMerchantEmail] = useState("");
  const [newMerchantVendorId, setNewMerchantVendorId] = useState("");
  const [newMerchantKey, setNewMerchantKey] = useState<string | null>(null);

  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorKey, setNewVendorKey] = useState<string | null>(null);

  function refresh() {
    listMerchants().then(setMerchants);
    listVendors().then(setVendors);
  }

  useEffect(refresh, []);

  async function handleCreateMerchant(e: React.FormEvent) {
    e.preventDefault();
    const merchant = await createMerchant({
      name: newMerchantName,
      contact_email: newMerchantEmail,
      vendor_id: newMerchantVendorId || undefined,
    });
    setNewMerchantKey(merchant.api_key);
    setNewMerchantName("");
    setNewMerchantEmail("");
    setNewMerchantVendorId("");
    refresh();
  }

  async function handleCreateVendor(e: React.FormEvent) {
    e.preventDefault();
    const vendor = await createVendor({ name: newVendorName, contact_email: newVendorEmail });
    setNewVendorKey(vendor.api_key);
    setNewVendorName("");
    setNewVendorEmail("");
    refresh();
  }

  return (
    <div className="py-12">
      <span className="text-eyebrow text-fog">Onboarding queue</span>
      <h1 className="text-heading-sm text-ink mt-1">Merchants &amp; vendors</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-subheading text-ink mb-4">Merchants</h2>

          <form onSubmit={handleCreateMerchant} className="rounded-card bg-snow p-5 mb-4 space-y-2">
            <input
              value={newMerchantName}
              onChange={(e) => setNewMerchantName(e.target.value)}
              placeholder="Name"
              required
              className="w-full rounded-button border border-mist px-4 py-2 text-body-sm"
            />
            <input
              value={newMerchantEmail}
              onChange={(e) => setNewMerchantEmail(e.target.value)}
              placeholder="Contact email"
              type="email"
              required
              className="w-full rounded-button border border-mist px-4 py-2 text-body-sm"
            />
            <input
              value={newMerchantVendorId}
              onChange={(e) => setNewMerchantVendorId(e.target.value)}
              placeholder="Vendor id (optional)"
              className="w-full rounded-button border border-mist px-4 py-2 text-body-sm"
            />
            <Button type="submit" variant="secondary">
              Create merchant
            </Button>
            {newMerchantKey && (
              <p className="text-body-sm text-coral break-all">
                API key (shown once): <code>{newMerchantKey}</code>
              </p>
            )}
          </form>

          <div className="space-y-2">
            {merchants?.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-card bg-paper border border-mist/60 px-4 py-3"
              >
                <div>
                  <p className="text-body-sm text-ink">{m.name}</p>
                  <p className="text-eyebrow text-fog">{m.contact_email}</p>
                </div>
                {m.verified ? (
                  <span className="inline-flex items-center gap-1 text-eyebrow text-electric-blue">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} />
                    Verified
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await approveMerchant(m.id);
                        refresh();
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await rejectMerchant(m.id);
                        refresh();
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-subheading text-ink mb-4">Vendors</h2>

          <form onSubmit={handleCreateVendor} className="rounded-card bg-snow p-5 mb-4 space-y-2">
            <input
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="Name"
              required
              className="w-full rounded-button border border-mist px-4 py-2 text-body-sm"
            />
            <input
              value={newVendorEmail}
              onChange={(e) => setNewVendorEmail(e.target.value)}
              placeholder="Contact email"
              type="email"
              required
              className="w-full rounded-button border border-mist px-4 py-2 text-body-sm"
            />
            <Button type="submit" variant="secondary">
              Create vendor
            </Button>
            {newVendorKey && (
              <p className="text-body-sm text-coral break-all">
                API key (shown once): <code>{newVendorKey}</code>
              </p>
            )}
          </form>

          <div className="space-y-2">
            {vendors?.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-card bg-paper border border-mist/60 px-4 py-3"
              >
                <div>
                  <p className="text-body-sm text-ink">{v.name}</p>
                  <p className="text-eyebrow text-fog">{v.contact_email}</p>
                </div>
                {v.verified ? (
                  <span className="inline-flex items-center gap-1 text-eyebrow text-electric-blue">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} />
                    Verified
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await approveVendor(v.id);
                      refresh();
                    }}
                  >
                    <HugeiconsIcon icon={AlertCircleIcon} size={14} strokeWidth={2} />
                    Approve
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AdminGate>
      <OnboardingContent />
    </AdminGate>
  );
}
