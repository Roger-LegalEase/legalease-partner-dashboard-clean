"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function SyntheticSetupPage() {
  const search = useSearchParams();
  const [saving, setSaving] = useState(false);
  const revoked = search.get("state") === "revoked";
  const destination = search.get("destination") === "dashboard" ? "dashboard" : "onboarding";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    window.location.assign(`/__first-admin-harness/landing?destination=${destination}`);
  }
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6">
          <div className="text-center">
            <Badge tone="blue">LegalEase account setup</Badge>
            <h1 className="mt-5 text-3xl font-black">Set your LegalEase password</h1>
          </div>
          {revoked ? (
            <p className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              This invite link is no longer active. Please request a new invitation.
            </p>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={submit}>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">New password</span>
                <input className="min-h-11 rounded-md border border-grayWilma-200 px-3" minLength={12} required type="password" value="LocalReview2026!" readOnly />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">Confirm password</span>
                <input className="min-h-11 rounded-md border border-grayWilma-200 px-3" minLength={12} required type="password" value="LocalReview2026!" readOnly />
              </label>
              <button className="min-h-11 rounded-md bg-navy px-5 py-2 font-semibold text-white" disabled={saving} type="submit">
                {saving ? "Saving…" : "Set password"}
              </button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
