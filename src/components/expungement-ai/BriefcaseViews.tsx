import Link from "next/link";
import { ArrowRight, Check, CreditCard, Download, LifeBuoy } from "lucide-react";
import type { ReactNode } from "react";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { matterCareState, type MatterCareState } from "@/lib/expungement-ai/frontend/briefcase-presentation";

/* ------------------------------------------------------------------ */
/* Status + stepper model (presentation only; reads engine status)     */
/* ------------------------------------------------------------------ */

// The filing stepper is always the same five steps. It applies to packet matters only; guidance
// matters never show it (the spec: a stalled stepper would read as failure).
const STAGES = ["Reviewed", "Prepared", "File it", "Court", "Decision"] as const;

type PillTone = "teal" | "amber" | "gray" | "green" | "red" | "care";

const PILL_TONE: Record<PillTone, string> = {
  teal: "text-[#00A99D] bg-[#00A99D]/[0.12]",
  amber: "text-[#B97C12] bg-[#E0A93B]/[0.16]",
  gray: "text-[#8A93A6] bg-[#F0F2F6]",
  green: "text-[#1F9D6B] bg-[#3DD598]/[0.16]",
  red: "text-[#B23036] bg-[#E5484D]/[0.12]",
  care: "text-[#5B3FA0] bg-[#F3ECFB]"
};

type MatterStatus = {
  careState: MatterCareState;
  isGuidance: boolean;
  pillLabel: string;
  pillTone: PillTone;
  // Null when no filing stepper applies (guidance matters). Otherwise done = completed stages,
  // current = the index (0-4) of the active stage, or -1 when nothing is active.
  stepper: { done: number; current: number } | null;
};

const CARE_TO_STATUS: Record<MatterCareState, Omit<MatterStatus, "careState" | "isGuidance">> = {
  guidance_only: { pillLabel: "Guidance saved", pillTone: "teal", stepper: null },
  saved: { pillLabel: "Reviewing eligibility", pillTone: "gray", stepper: { done: 0, current: 0 } },
  needs_attention: { pillLabel: "Needs your attention", pillTone: "red", stepper: { done: 0, current: 0 } },
  packet_ready: { pillLabel: "Ready to file", pillTone: "teal", stepper: { done: 2, current: 2 } },
  completed: { pillLabel: "Ready to file", pillTone: "teal", stepper: { done: 2, current: 2 } },
  waiting: { pillLabel: "With the court", pillTone: "amber", stepper: { done: 3, current: 3 } },
  denied: { pillLabel: "Needs a closer look", pillTone: "care", stepper: { done: 1, current: -1 } }
};

export function matterStatus(item: ConsumerBriefcaseItem): MatterStatus {
  const careState = matterCareState(item);
  const isGuidance = careState === "guidance_only";
  return { careState, isGuidance, ...CARE_TO_STATUS[careState] };
}

const IN_PROGRESS_STATES = new Set<MatterCareState>(["saved", "packet_ready", "completed", "waiting", "needs_attention"]);

function isMatter(item: ConsumerBriefcaseItem) {
  return item.type !== "wilma_conversation";
}

function firstName(email?: string) {
  if (!email) return "";
  const token = (email.split("@")[0] ?? "").split(/[._+\-]/).filter(Boolean)[0];
  return token ? token.charAt(0).toUpperCase() + token.slice(1) : "";
}

function matterSubtitle(item: ConsumerBriefcaseItem) {
  const year = (() => {
    const d = new Date(item.createdAt);
    return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
  })();
  return [item.state, item.pathwayLabel, year].filter(Boolean).join(", ");
}

export function packetArtifactFor(item: ConsumerBriefcaseItem) {
  const refs = item.artifactRefs;
  if (
    refs &&
    typeof refs.generatedAt === "string" &&
    typeof refs.downloadPath === "string" &&
    typeof refs.fileName === "string"
  ) {
    return refs as { generatedAt: string; downloadPath: string; fileName: string };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Shared UI primitives                                                */
/* ------------------------------------------------------------------ */

function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${PILL_TONE[tone]}`}>{label}</span>;
}

function Stepper({ done, current, className = "" }: { done: number; current: number; className?: string }) {
  return (
    <div className={`flex items-start ${className}`}>
      {STAGES.map((label, i) => {
        const isDone = i < done;
        const isCurrent = i === current;
        const node = isDone
          ? "border-[#3DD598] bg-[#3DD598] text-white"
          : isCurrent
            ? "border-[#FF3B00] bg-white text-[#FF3B00]"
            : "border-[#D4DAE4] bg-white text-[#8A93A6]";
        return (
          <div key={label} className="relative flex flex-1 flex-col items-center">
            {i < STAGES.length - 1 ? (
              <span className={`absolute left-1/2 top-[9px] h-0.5 w-full ${isDone ? "bg-[#3DD598]" : "bg-[#ECEFF4]"}`} aria-hidden="true" />
            ) : null}
            <span className={`relative z-[1] grid h-[19px] w-[19px] place-items-center rounded-full border-2 text-[9px] font-bold ${node}`}>
              {isDone ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span className={`mt-1.5 text-center text-[9.5px] ${isDone || isCurrent ? "font-semibold text-[#1A1D26]" : "font-medium text-[#8A93A6]"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Shared pill + stepper for the matter-detail page, so card and detail never drift. */
export function MatterStatusBadge({ item }: { item: ConsumerBriefcaseItem }) {
  const status = matterStatus(item);
  return <StatusPill label={status.pillLabel} tone={status.pillTone} />;
}

export function MatterStepper({ item, className = "" }: { item: ConsumerBriefcaseItem; className?: string }) {
  const status = matterStatus(item);
  if (!status.stepper) return null;
  return <Stepper done={status.stepper.done} current={status.stepper.current} className={className} />;
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3.5 mt-7 flex items-center justify-between first:mt-0">
      <h2 className="text-[15px] font-bold text-[#0B1320]">{title}</h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Auth gate + empty state                                             */
/* ------------------------------------------------------------------ */

export function BriefcaseAuthGate() {
  return (
    <main className="min-h-screen bg-[#F7F3EC] px-4 py-20 text-[#0B1320]">
      <section className="mx-auto max-w-xl rounded-2xl border border-[#ECEFF4] bg-white p-6">
        <p className="text-xs font-bold uppercase text-[#00A99D]">Account required</p>
        <h1 className="mt-3 text-3xl font-extrabold">Sign in to open your Briefcase</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">Every Expungement.ai user has an account, and every check, result, packet, reminder, payment, and Wilma conversation is saved to Briefcase.</p>
        <a className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/sign-in">
          Sign in
        </a>
      </section>
      <WilmaBubble context="briefcase" />
    </main>
  );
}

function EmptyBriefcase() {
  return (
    <div className="grid place-items-center px-5 py-16 text-center">
      <span className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#F7F3EC] text-[#00A99D]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-10 w-10" aria-hidden="true">
          <path d="M3 7h18v13H3zM8 7V4h8v3" />
        </svg>
      </span>
      <h2 className="mt-5 text-[20px] font-bold text-[#0B1320]">Let&apos;s find out what you can clear</h2>
      <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-6 text-[#5A6275]">
        Answer a few plain questions about your record. It takes about 3 minutes, it&apos;s free, and you&apos;ll see exactly where you stand before paying anything.
      </p>
      <Link href="/expungement-ai/check" className="mt-6 inline-flex min-h-12 items-center rounded-[11px] bg-[#FF3B00] px-7 text-[14px] font-bold text-white">
        Check if I qualify
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Briefcase home                                                      */
/* ------------------------------------------------------------------ */

type NextStep = { headline: string; body: string; ctaLabel: string; href: string };

function pickNextStep(matters: ConsumerBriefcaseItem[]): NextStep | null {
  const order: MatterCareState[] = ["needs_attention", "packet_ready", "completed", "waiting", "guidance_only", "saved"];
  for (const target of order) {
    const item = matters.find((m) => matterCareState(m) === target);
    if (!item) continue;
    const href = `/briefcase/${item.id}`;
    const where = matterSubtitle(item) || item.state;
    switch (target) {
      case "needs_attention":
        return { headline: `Finish your ${item.title} check`, body: "We need one more thing before this can move forward. Open it to see what to add.", ctaLabel: "See what we need", href };
      case "packet_ready":
      case "completed":
        return { headline: "You're ready to file", body: `Your packet for ${item.title} is ready. We'll show you exactly where to take it and what to expect.`, ctaLabel: "Show me how to file", href };
      case "waiting":
        return { headline: "Your case is with the court", body: `${item.title} is filed and waiting on a decision. There's nothing to do right now. We'll help you keep track.`, ctaLabel: "See your matter", href };
      case "guidance_only":
        return { headline: "Your next steps are saved", body: `We saved step-by-step guidance for ${item.title}. Open it whenever you're ready.`, ctaLabel: "View next steps", href };
      case "saved":
        return { headline: "See where your check stands", body: `Open ${item.title} (${where}) to review what we found and what you can do next.`, ctaLabel: "Open matter", href };
      default:
        break;
    }
  }
  return null;
}

function StatCard({ label, value, sub, teal = false }: { label: string; value: number; sub: string; teal?: boolean }) {
  return (
    <div className="rounded-[14px] border border-[#ECEFF4] bg-white px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8A93A6]">{label}</p>
      <p className={`mt-1.5 text-[28px] font-extrabold leading-none ${teal ? "text-[#00A99D]" : "text-[#0B1320]"}`}>{value}</p>
      <p className="mt-1.5 text-[11px] text-[#8A93A6]">{sub}</p>
    </div>
  );
}

export function BriefcaseOverview({ items, userEmail }: { items: ConsumerBriefcaseItem[]; userEmail?: string }) {
  const matters = items.filter(isMatter);
  if (matters.length === 0) return <EmptyBriefcase />;

  const name = firstName(userEmail);
  const inProgress = matters.filter((m) => IN_PROGRESS_STATES.has(matterCareState(m)));
  const readyToFile = matters.filter((m) => ["packet_ready", "completed"].includes(matterCareState(m)));
  const documents = matters.filter((m) => packetArtifactFor(m) !== null);
  const next = pickNextStep(matters);

  return (
    <section>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]">{name ? `Welcome back, ${name}` : "Welcome back"}</h1>
      <p className="mt-1 text-[13px] text-[#8A93A6]">
        {inProgress.length > 0
          ? `You have ${inProgress.length} ${inProgress.length === 1 ? "record" : "records"} in progress. Here's where things stand.`
          : "Here's where your records stand."}
      </p>

      {next ? (
        <div className="mt-5 flex flex-col items-start gap-4 rounded-[16px] bg-gradient-to-br from-[#0B1320] to-[#1B2B40] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7FE9DE]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#00A99D] shadow-[0_0_8px_#00A99D]" aria-hidden="true" /> Your next step
            </p>
            <h3 className="text-[20px] font-bold">{next.headline}</h3>
            <p className="mt-1.5 max-w-[52ch] text-[13px] leading-6 text-white/70">{next.body}</p>
          </div>
          <Link href={next.href} className="inline-flex shrink-0 items-center gap-2 rounded-[11px] bg-[#FF3B00] px-5 py-3 text-[14px] font-bold text-white">
            {next.ctaLabel} <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="In progress" value={inProgress.length} sub="Active records" />
        <StatCard label="Ready to file" value={readyToFile.length} sub="Action needed" teal />
        <StatCard label="Documents" value={documents.length} sub="Prepared for you" />
        <StatCard label="Cleared" value={0} sub="So far" />
      </div>

      <SectionHeader title="Your matters" action={<Link href="/briefcase/matters" className="text-[13px] font-semibold text-[#00A99D]">View all</Link>} />
      <div className="grid gap-4 md:grid-cols-2">
        {matters.map((item) => (
          <MatterCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Matter card (grid)                                                  */
/* ------------------------------------------------------------------ */

function MatterCard({ item }: { item: ConsumerBriefcaseItem }) {
  const status = matterStatus(item);
  const subtitle = matterSubtitle(item) || item.summary;
  return (
    <Link
      href={`/briefcase/${item.id}`}
      data-briefcase-guidance-state={status.isGuidance ? "Guidance saved" : undefined}
      data-briefcase-care-state={status.careState}
      className="block rounded-[16px] border border-[#ECEFF4] bg-white p-5 shadow-[0_1px_3px_rgba(11,19,32,0.04)] transition hover:border-[#D7DEE8]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold text-[#0B1320]">{item.title}</p>
          {subtitle ? <p className="mt-0.5 truncate text-[12px] text-[#8A93A6]">{subtitle}</p> : null}
        </div>
        <StatusPill label={status.pillLabel} tone={status.pillTone} />
      </div>
      {status.stepper ? (
        <Stepper done={status.stepper.done} current={status.stepper.current} className="mt-1.5" />
      ) : (
        <p className="rounded-[10px] bg-[#F7F3EC] px-3.5 py-2.5 text-[12.5px] leading-5 text-[#5A6275]">
          What we can do here: we saved your state-specific next steps. Open this matter to read them.
        </p>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* My matters / Documents / Payments / Settings / Reminders            */
/* ------------------------------------------------------------------ */

export function MattersView({ items }: { items: ConsumerBriefcaseItem[] }) {
  const matters = items.filter(isMatter);
  if (matters.length === 0) return <EmptyBriefcase />;
  return (
    <section>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]">My matters</h1>
      <p className="mt-1 text-[13px] text-[#8A93A6]">Each record you check is saved here as its own matter. Open one to see its documents and next steps.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {matters.map((item) => (
          <MatterCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function DocumentsView({ items }: { items: ConsumerBriefcaseItem[] }) {
  const withDocs = items.filter((item) => isMatter(item) && packetArtifactFor(item) !== null);
  return (
    <section>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]">Documents</h1>
      <p className="mt-1 text-[13px] text-[#8A93A6]">Your documents live inside the matter they belong to. Here is every matter that has documents ready.</p>
      <div className="mt-5 space-y-4">
        {withDocs.length ? (
          withDocs.map((item) => <BriefcaseItemCard key={item.id} item={item} />)
        ) : (
          <p className="rounded-[14px] border border-[#ECEFF4] bg-white px-5 py-6 text-[13px] text-[#5A6275]">
            Your documents will appear here after you generate a packet for one of your matters.
          </p>
        )}
      </div>
    </section>
  );
}

export function RemindersView() {
  return (
    <section className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h1 className="text-[22px] font-extrabold text-[#0B1320]">Reminders</h1>
      <p className="mt-3 text-[14px] leading-6 text-[#5A6275]">Waiting-period reminders and filing follow-ups are saved here when the engine recommends them. You will never miss a window without a heads-up.</p>
    </section>
  );
}

export function PaymentsView({ items }: { items: ConsumerBriefcaseItem[] }) {
  const paid = items.filter((item) => item.packetReady);
  return (
    <section className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h1 className="flex items-center gap-2 text-[22px] font-extrabold text-[#0B1320]"><CreditCard className="h-5 w-5" aria-hidden="true" /> Payment history</h1>
      <div className="mt-4 space-y-3">
        {paid.length ? (
          paid.map((item) => (
            <div key={item.id} className="rounded-[12px] bg-[#F7F3EC] p-4 text-sm">
              <p className="font-bold text-[#0B1320]">$50 one-time packet payment: {item.paymentStatus ?? "not_applicable"}</p>
              <p className="mt-1 text-[#5A6275]">{item.title}</p>
              <p className="mt-1 text-[#5A6275]">Packet: {item.packetStatus ?? "not_started"}</p>
              {item.receiptUrl ? <p className="mt-1 text-[#5A6275]">Receipt: {item.receiptUrl}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-[13px] text-[#5A6275]">No payments yet. You only pay when a packet is ready, and you will see the price first.</p>
        )}
      </div>
    </section>
  );
}

export function SettingsView() {
  return (
    <section id="profile" className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h1 className="text-[22px] font-extrabold text-[#0B1320]">Profile and settings</h1>
      <p className="mt-3 text-[14px] leading-6 text-[#5A6275]">Your account preferences live here. This pass does not change partner auth, sessions, or billing.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href="/briefcase/payments">
          <CreditCard className="h-4 w-4" aria-hidden="true" /> Payment history
        </Link>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href="/expungement-ai/support">
          <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Get technical support
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Detailed matter row (used in Documents view): next steps + files    */
/* ------------------------------------------------------------------ */

export function BriefcaseItemCard({ item }: { item: ConsumerBriefcaseItem }) {
  const artifact = packetArtifactFor(item);
  const status = matterStatus(item);
  const isGuidanceOnly = status.isGuidance;

  return (
    <article
      className="rounded-[16px] border border-[#ECEFF4] bg-white p-5"
      data-briefcase-guidance-state={isGuidanceOnly ? "Guidance saved" : undefined}
      data-briefcase-care-state={status.careState}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-[#0B1320]">{item.title}</p>
          <p className="mt-0.5 text-[12px] text-[#8A93A6]">{matterSubtitle(item) || item.summary}</p>
        </div>
        <StatusPill label={status.pillLabel} tone={status.pillTone} />
      </div>

      {item.nextSteps.length ? <h3 className="mt-4 text-[13px] font-bold text-[#0B1320]">Next steps</h3> : null}
      <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#5A6275]">
        {item.nextSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>

      {artifact && !isGuidanceOnly ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white" href={artifact.downloadPath}>
            <Download className="h-4 w-4" aria-hidden="true" /> Download
          </Link>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[#D9DEE8] px-4 text-[13px] font-bold text-[#0B1320]" href={`/briefcase/${item.id}`}>
            Open matter
          </Link>
        </div>
      ) : (
        <Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[#D9DEE8] px-4 text-[13px] font-bold text-[#0B1320]" href={`/briefcase/${item.id}`}>
          Open matter
        </Link>
      )}
    </article>
  );
}
