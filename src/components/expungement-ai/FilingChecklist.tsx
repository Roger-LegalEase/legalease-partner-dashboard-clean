"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { CalendarDays, Check, Plus, X } from "lucide-react";

import { LocalizedRuntimeText, LocalizedText, useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import {
  MAX_CUSTOM_STEP_LENGTH,
  dueStatus,
  localIsoDate,
  type DueStatus,
  type FilingChecklist as FilingChecklistModel,
  type FilingChecklistStep
} from "@/lib/expungement-ai/filing-checklist";

type Action =
  | { type: "set_step"; stepId: string; done?: boolean; dueDate?: string | null }
  | { type: "add_step"; text: string; dueDate?: string | null }
  | { type: "remove_step"; stepId: string };

const noopSubscribe = () => () => {};

/** The viewer's local date, only after hydration so server and client markup agree. */
export function useLocalToday(): string | null {
  return useSyncExternalStore(noopSubscribe, () => localIsoDate(), () => null);
}

export function formatDueDate(date: string, locale: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export const dueTone: Record<DueStatus, string> = {
  overdue: "bg-[#FDECEA] text-[#B42318]",
  today: "bg-[#FFF1E8] text-[#C2410C]",
  soon: "bg-[#FBF3E0] text-[#9A6B00]",
  later: "bg-[#F1F3F7] text-[#5A6275]"
};

export function DueChip({ date, today, done = false }: { date: string; today: string | null; done?: boolean }) {
  const { locale, t } = useLocalization();
  const status = today && !done ? dueStatus(date, today) : "later";
  const label = formatDueDate(date, locale);
  const prefix =
    status === "overdue" ? t("briefcase.checklist.overdue", "Overdue") :
    status === "today" ? t("briefcase.checklist.due_today", "Due today") :
    t("briefcase.checklist.due", "Due");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${dueTone[status]}`} data-due-status={status}>
      <CalendarDays className="h-3 w-3" aria-hidden="true" />
      {status === "today" ? prefix : `${prefix} ${label}`}
    </span>
  );
}

export function FilingChecklist({ initial }: { initial: FilingChecklistModel }) {
  const [checklist, setChecklist] = useState(initial);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [editingDateFor, setEditingDateFor] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState("");
  const today = useLocalToday();
  const { t } = useLocalization();

  const pct = checklist.total ? Math.round((checklist.done / checklist.total) * 100) : 0;

  async function send(action: Action, key: string, optimistic?: (current: FilingChecklistModel) => FilingChecklistModel) {
    const previous = checklist;
    setError(null);
    setPending((current) => new Set(current).add(key));
    if (optimistic) setChecklist(optimistic(checklist));
    try {
      const response = await fetch(`/api/expungement-ai/briefcase/${encodeURIComponent(checklist.itemId)}/checklist`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(action)
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; checklist?: FilingChecklistModel } | null;
      if (!response.ok || !data?.ok || !data.checklist) throw new Error(String(response.status));
      setChecklist(data.checklist);
      return true;
    } catch {
      setChecklist(previous);
      setError(t("briefcase.checklist.save_failed", "We couldn't save that change. Check your connection and try again."));
      return false;
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function patchStep(stepId: string, change: Partial<FilingChecklistStep>) {
    return (current: FilingChecklistModel): FilingChecklistModel => {
      let doneDelta = 0;
      const groups = current.groups.map((group) => ({
        ...group,
        steps: group.steps.map((step) => {
          if (step.id !== stepId) return step;
          if (change.done !== undefined && change.done !== step.done) doneDelta = change.done ? 1 : -1;
          return { ...step, ...change };
        })
      }));
      return { ...current, groups, done: current.done + doneDelta };
    };
  }

  function toggle(step: FilingChecklistStep) {
    void send({ type: "set_step", stepId: step.id, done: !step.done }, step.id, patchStep(step.id, { done: !step.done }));
  }

  function setDue(step: FilingChecklistStep, dueDate: string | null) {
    setEditingDateFor(null);
    if (dueDate === step.dueDate) return;
    void send({ type: "set_step", stepId: step.id, dueDate }, step.id, patchStep(step.id, { dueDate }));
  }

  function remove(step: FilingChecklistStep) {
    void send({ type: "remove_step", stepId: step.id }, step.id, (current) => ({
      ...current,
      total: current.total - 1,
      done: current.done - (step.done ? 1 : 0),
      groups: current.groups.map((group) => ({ ...group, steps: group.steps.filter((candidate) => candidate.id !== step.id) }))
    }));
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const text = newText.trim();
    if (!text) return;
    const ok = await send({ type: "add_step", text, dueDate: newDate || null }, "new-step");
    if (ok) {
      setNewText("");
      setNewDate("");
    }
  }

  return (
    <section className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6" data-filing-checklist={checklist.itemId}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#0B1320]">
            <LocalizedText k="briefcase.checklist.title" fallback="Your filing checklist" />
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-[#5A6275]">
            {checklist.packetGenerated ? (
              <LocalizedText k="briefcase.checklist.body_packet" fallback="Check off each step as you go and add dates so they show up in your reminders. Your packet's filing instructions come first if anything here differs." />
            ) : (
              <LocalizedText k="briefcase.checklist.body_guidance" fallback="Check off each step as you go and add dates so they show up in your reminders. Filing steps are added here once your packet is generated." />
            )}
          </p>
        </div>
        <p className="text-[13px] font-bold text-[#0B1320]" aria-live="polite">
          <LocalizedText k="briefcase.checklist.progress" fallback="{done} of {total} done" vars={{ done: checklist.done, total: checklist.total }} />
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEFF4]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("briefcase.checklist.progress_label", "Checklist progress")}>
        <div className="h-full rounded-full bg-[#00A99D] transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      {error ? <p className="mt-4 rounded-[10px] bg-[#FDECEA] px-3 py-2 text-[13px] font-semibold text-[#B42318]" role="alert">{error}</p> : null}

      <div className="mt-5 space-y-6">
        {checklist.groups.map((group) => (
          <div key={group.key} data-checklist-group={group.key}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A93A6]">
              <LocalizedText k={group.copyKey} fallback={group.label} />
            </h3>
            {group.steps.length ? (
              <ul className="mt-2 divide-y divide-[#F1F3F7]">
                {group.steps.map((step) => (
                  <li key={step.id} className={`flex items-start gap-3 py-3 ${pending.has(step.id) ? "opacity-60" : ""}`} data-checklist-step={step.id} data-done={step.done ? "true" : "false"}>
                    <button
                      type="button"
                      onClick={() => toggle(step)}
                      disabled={pending.has(step.id)}
                      aria-pressed={step.done}
                      aria-label={step.done ? t("briefcase.checklist.mark_not_done", "Mark as not done") : t("briefcase.checklist.mark_done", "Mark as done")}
                      className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border-2 transition-colors ${
                        step.done ? "border-[#00A99D] bg-[#00A99D] text-white" : "border-[#D9DEE8] bg-white text-transparent hover:border-[#00A99D]"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14px] leading-6 ${step.done ? "text-[#8A93A6] line-through" : "text-[#0B1320]"}`}>
                        {step.copyKey ? <LocalizedText k={step.copyKey} fallback={step.text} /> : <LocalizedRuntimeText text={step.text} />}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {editingDateFor === step.id ? (
                          <span className="inline-flex items-center gap-2">
                            <input
                              type="date"
                              autoFocus
                              defaultValue={step.dueDate ?? ""}
                              min="2000-01-01"
                              max="2100-12-31"
                              aria-label={t("briefcase.checklist.due_date", "Due date")}
                              className="rounded-[8px] border border-[#D9DEE8] px-2 py-1 text-[13px] text-[#0B1320]"
                              onKeyDown={(event) => {
                                if (event.key === "Escape") setEditingDateFor(null);
                                if (event.key === "Enter") setDue(step, event.currentTarget.value || null);
                              }}
                              onBlur={(event) => setDue(step, event.currentTarget.value || null)}
                            />
                          </span>
                        ) : step.dueDate ? (
                          <button type="button" onClick={() => setEditingDateFor(step.id)} className="rounded-full focus-visible:outline-2" aria-label={t("briefcase.checklist.change_date", "Change date")}>
                            <DueChip date={step.dueDate} today={today} done={step.done} />
                          </button>
                        ) : !step.done ? (
                          <button type="button" onClick={() => setEditingDateFor(step.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8A93A6] hover:text-[#0B1320]">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> <LocalizedText k="briefcase.checklist.add_date" fallback="Add date" />
                          </button>
                        ) : null}
                        {step.dueDate && editingDateFor !== step.id && !step.done ? (
                          <button type="button" onClick={() => setDue(step, null)} className="text-[12px] font-semibold text-[#8A93A6] hover:text-[#0B1320]">
                            <LocalizedText k="briefcase.checklist.clear_date" fallback="Clear date" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {step.source === "custom" ? (
                      <button
                        type="button"
                        onClick={() => remove(step)}
                        disabled={pending.has(step.id)}
                        aria-label={t("briefcase.checklist.remove", "Remove step")}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[#8A93A6] hover:bg-[#F1F3F7] hover:text-[#B42318]"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-[#8A93A6]">
                <LocalizedText k="briefcase.checklist.custom_empty" fallback="Add anything else you need to remember, like calling the clerk or a hearing date." />
              </p>
            )}
            {group.key === "custom" && checklist.canAddSteps ? (
              <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newText}
                  onChange={(event) => setNewText(event.target.value)}
                  maxLength={MAX_CUSTOM_STEP_LENGTH}
                  placeholder={t("briefcase.checklist.add_placeholder", "Add a step")}
                  aria-label={t("briefcase.checklist.add_placeholder", "Add a step")}
                  className="min-h-10 min-w-0 flex-[1_1_220px] rounded-[10px] border border-[#D9DEE8] px-3 text-[14px] text-[#0B1320] placeholder:text-[#8A93A6]"
                />
                <input
                  type="date"
                  value={newDate}
                  onChange={(event) => setNewDate(event.target.value)}
                  min="2000-01-01"
                  max="2100-12-31"
                  aria-label={t("briefcase.checklist.due_date_optional", "Due date (optional)")}
                  className="min-h-10 rounded-[10px] border border-[#D9DEE8] px-3 text-[14px] text-[#0B1320]"
                />
                <button
                  type="submit"
                  disabled={!newText.trim() || pending.has("new-step")}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="briefcase.checklist.add" fallback="Add" />
                </button>
              </form>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-[#F1F3F7] pt-4 text-[12px] leading-5 text-[#8A93A6]">
        <LocalizedText k="briefcase.checklist.disclaimer" fallback="This checklist helps you keep track. It is not legal advice, and court approval is not guaranteed. Follow your packet's filing instructions and your court's rules." />
      </p>
    </section>
  );
}
