"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PartnerFacingOnboarding } from "@/lib/partners/partner-onboarding";

export function PartnerOnboardingChecklist({ initial }: { initial: PartnerFacingOnboarding }) {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partnerTasks = onboarding.tasks.filter((t) => t.owner === "partner");
  const legaleaseTasks = onboarding.tasks.filter((t) => t.owner === "legalease");

  async function toggle(taskKey: string, done: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/onboarding/checklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskKey, status: done ? "complete" : "not_started" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the task.");
      setOnboarding(data.onboarding);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-md bg-[#FDF1E8] px-4 py-3 text-sm text-[#9A3412]">{error}</p> : null}

      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black">Your program</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Status" value={onboarding.statusLabel} />
          <Stat label="Packet Cap" value={String(onboarding.packetCap)} />
          <Stat label="Packets Used" value={String(onboarding.packetsUsed)} />
          <Stat label="Remaining Packets" value={String(onboarding.remainingPackets)} />
        </div>
      </section>

      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black">Your tasks</h2>
        {partnerTasks.length === 0 ? (
          <p className="mt-2 text-sm text-[#8A8278]">No tasks assigned to you right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {partnerTasks.map((t) => (
              <li key={t.taskKey} className="flex items-start gap-3 rounded-md border border-[#F3EEE5] px-3 py-2.5">
                <input type="checkbox" disabled={busy} checked={t.status === "complete"} onChange={(e) => toggle(t.taskKey, e.target.checked)} className="mt-1" />
                <div>
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="text-xs text-[#8A8278]">{t.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="/partner/access-codes" className="font-bold text-[#1D9E75]">Manage access codes</a>
          <a href="/partner/team" className="font-bold text-[#1D9E75]">Invite staff</a>
        </div>
      </section>

      <section className="rounded-lg border border-[#EEE6DB] bg-white p-6">
        <h2 className="text-lg font-black">LegalEase is handling</h2>
        <ul className="mt-3 space-y-1.5">
          {legaleaseTasks.map((t) => (
            <li key={t.taskKey} className="flex items-center justify-between text-sm">
              <span>{t.title}</span>
              <span className="text-xs font-bold uppercase text-[#8A8278]">{t.status.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#F0ECE3] bg-[#FBF7F2] px-3 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#9A9288]">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}
