"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, Check } from "lucide-react";

import { DueChip, useLocalToday } from "@/components/expungement-ai/FilingChecklist";
import { LocalizedRuntimeText, LocalizedText, useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { dueStatus, type BriefcaseReminder } from "@/lib/expungement-ai/filing-checklist";

type Bucket = "overdue" | "upcoming" | "later";

const BUCKETS: Array<{ key: Bucket; copyKey: string; fallback: string }> = [
  { key: "overdue", copyKey: "briefcase.reminders.overdue", fallback: "Overdue" },
  { key: "upcoming", copyKey: "briefcase.reminders.upcoming", fallback: "Today and the next 7 days" },
  { key: "later", copyKey: "briefcase.reminders.later", fallback: "Later" }
];

function bucketFor(date: string, today: string | null): Bucket {
  if (!today) return "later";
  const status = dueStatus(date, today);
  if (status === "overdue") return "overdue";
  if (status === "today" || status === "soon") return "upcoming";
  return "later";
}

export function ReminderList({ reminders: initial }: { reminders: BriefcaseReminder[] }) {
  const [reminders, setReminders] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = useLocalToday();
  const { t } = useLocalization();

  async function markDone(reminder: BriefcaseReminder) {
    if (!reminder.stepId) return;
    setPending(reminder.key);
    setError(null);
    try {
      const response = await fetch(`/api/expungement-ai/briefcase/${encodeURIComponent(reminder.itemId)}/checklist`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ type: "set_step", stepId: reminder.stepId, done: true })
      });
      if (!response.ok) throw new Error(String(response.status));
      setReminders((current) => current.filter((candidate) => candidate.key !== reminder.key));
    } catch {
      setError(t("briefcase.checklist.save_failed", "We couldn't save that change. Check your connection and try again."));
    } finally {
      setPending(null);
    }
  }

  if (!reminders.length) {
    return (
      <div className="mt-5 rounded-[14px] border border-dashed border-[#D9DEE8] px-5 py-8 text-center" data-reminders-empty="true">
        <BellRing className="mx-auto h-6 w-6 text-[#8A93A6]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-bold text-[#0B1320]"><LocalizedText k="briefcase.reminders.empty_title" fallback="No reminders yet" /></p>
        <p className="mx-auto mt-1 max-w-[420px] text-[13px] leading-6 text-[#5A6275]">
          <LocalizedText k="briefcase.reminders.empty_body" fallback="Open a matter and add a date to any checklist step, like your filing day or a hearing. It will show up here." />
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-6">
      {error ? <p className="rounded-[10px] bg-[#FDECEA] px-3 py-2 text-[13px] font-semibold text-[#B42318]" role="alert">{error}</p> : null}
      {BUCKETS.map(({ key, copyKey, fallback }) => {
        const rows = reminders.filter((reminder) => bucketFor(reminder.date, today) === key);
        if (!rows.length) return null;
        return (
          <div key={key} data-reminder-bucket={key}>
            <h2 className={`text-[11px] font-bold uppercase tracking-[0.08em] ${key === "overdue" ? "text-[#B42318]" : "text-[#8A93A6]"}`}>
              <LocalizedText k={copyKey} fallback={fallback} /> · {rows.length}
            </h2>
            <ul className="mt-2 divide-y divide-[#F1F3F7] rounded-[14px] border border-[#ECEFF4] bg-white">
              {rows.map((reminder) => (
                <li key={reminder.key} className={`flex items-start gap-3 px-4 py-3 ${pending === reminder.key ? "opacity-60" : ""}`} data-reminder={reminder.key}>
                  {reminder.stepId ? (
                    <button
                      type="button"
                      onClick={() => void markDone(reminder)}
                      disabled={pending === reminder.key}
                      aria-label={t("briefcase.checklist.mark_done", "Mark as done")}
                      className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border-2 border-[#D9DEE8] bg-white text-transparent hover:border-[#00A99D] hover:text-[#00A99D]"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </button>
                  ) : (
                    <BellRing className="mt-0.5 h-[22px] w-[22px] shrink-0 p-0.5 text-[#E0A93B]" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-6 text-[#0B1320]">
                      {reminder.copyKey ? <LocalizedText k={reminder.copyKey} fallback={reminder.text} /> : <LocalizedRuntimeText text={reminder.text} />}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="sm:hidden"><DueChip date={reminder.date} today={today} /></span>
                      <Link href={`/briefcase/matters/${encodeURIComponent(reminder.itemId)}`} className="text-[12px] font-semibold text-[#5A6275] hover:text-[#0B1320] hover:underline">
                        {reminder.state} · {reminder.matterTitle}
                      </Link>
                    </div>
                  </div>
                  <span className="hidden shrink-0 sm:block"><DueChip date={reminder.date} today={today} /></span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
