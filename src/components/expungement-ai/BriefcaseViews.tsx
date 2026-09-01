import Link from "next/link";
import { ArrowRight, Check, CreditCard, Download, LifeBuoy, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";
import type { BriefcasePresentationItem } from "@/lib/expungement-ai/briefcase-presentation-authority";
import { humanMatterState, matterCareState, type MatterCareState } from "@/lib/expungement-ai/frontend/briefcase-presentation";
import { LocalizedRuntimeText, LocalizedText } from "@/components/expungement-ai/LocalizationProvider";

/* ------------------------------------------------------------------ */
/* Status + stepper model (presentation only; reads engine status)     */
/* ------------------------------------------------------------------ */

const DTC_STAGES = [
  { label: "Free screening", key: "briefcase.stage.free_screening" },
  { label: "Packet information", key: "briefcase.stage.packet_information" },
  { label: "Final verification", key: "briefcase.stage.accuracy_review" },
  { label: "Payment", key: "briefcase.stage.payment" },
  { label: "Preparing packet", key: "briefcase.stage.preparing_packet" },
  { label: "Packet ready", key: "briefcase.stage.packet_generated" },
  { label: "Filing next steps", key: "briefcase.stage.filing_next_steps" }
] as const;

const SPONSORED_STAGES = DTC_STAGES.filter((stage) => stage.label !== "Payment");

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

export function matterStatus(item: BriefcasePresentationItem): MatterStatus {
  const careState = matterCareState(item);
  const isGuidance = careState === "guidance_only";
  const label = humanMatterState(item);
  const tone: PillTone = label === "Matter details unavailable" ? "gray"
    : label === "We need a little more information" ? "red"
    : label === "You may need to wait before taking the next step" || label === "Waiting on the court" ? "amber"
      : label === "Decision received" ? "green"
        : label === "Matter saved" ? "gray"
          : "teal";
  return { careState, isGuidance, pillLabel: label, pillTone: tone, stepper: stepperForHumanState(label) };
}

function stepperForHumanState(label: ReturnType<typeof humanMatterState>) {
  const stateLabel = label as string;
  if (label === "Matter details unavailable" || label === "Next steps saved" || label === "We need a little more information" || label === "You may need to wait before taking the next step") return null;
  if (label === "Matter saved") return { done: 1, current: -1 };
  if (label === "A self-help packet may be available") return { done: 1, current: 1 };
  if (label === "Packet details in progress") return { done: 1, current: 1 };
  if (stateLabel === "Packet facts complete") return { done: 2, current: 2 };
  if (label === "Ready to generate") return { done: 3, current: 3 };
  if (label === "Payment confirmed") return { done: 4, current: 4 };
  if (label === "Preparing packet") return { done: 4, current: 4 };
  if (label === "Packet ready") return { done: 6, current: 6 };
  return { done: DTC_STAGES.length, current: DTC_STAGES.length - 1 };
}

const IN_PROGRESS_STATES = new Set<MatterCareState>(["saved", "packet_ready", "waiting", "needs_attention"]);

function isPartnerPresentation(item: BriefcasePresentationItem) {
  return item.paymentState === "sponsored";
}

function firstName(email?: string) {
  if (!email) return "";
  const token = (email.split("@")[0] ?? "").split(/[._+\-]/).filter(Boolean)[0];
  return token ? token.charAt(0).toUpperCase() + token.slice(1) : "";
}

function matterSubtitle(item: BriefcasePresentationItem) {
  const year = (() => {
    const d = new Date(item.createdAt);
    return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
  })();
  return [item.jurisdiction, item.pathwayLabel, year].filter(Boolean).join(", ");
}

/* ------------------------------------------------------------------ */
/* Shared UI primitives                                                */
/* ------------------------------------------------------------------ */

function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${PILL_TONE[tone]}`}><LocalizedRuntimeText text={label} /></span>;
}

function Stepper({ done, current, className = "", sponsored = false }: { done: number; current: number; className?: string; sponsored?: boolean }) {
  const stages = sponsored ? SPONSORED_STAGES : DTC_STAGES;
  const visibleDone = sponsored && done > 3 ? done - 1 : done;
  const visibleCurrent = sponsored && current > 3 ? current - 1 : current;
  const progressIndex = visibleCurrent >= 0 ? visibleCurrent : Math.max(0, Math.min(visibleDone, stages.length - 1));
  return (
    <div className={className}>
      <div
        className="sr-only"
        role="progressbar"
        aria-label="Matter progress"
        aria-valuemin={1}
        aria-valuemax={stages.length}
        aria-valuenow={progressIndex + 1}
        aria-valuetext={stages[progressIndex]?.label}
      ></div>
      <ol className="flex items-start" role="list">
        {stages.map(({ label, key }, i) => {
          const isDone = i < visibleDone;
          const isCurrent = i === visibleCurrent;
          const node = isDone
            ? "border-[#3DD598] bg-[#3DD598] text-white"
            : isCurrent
              ? "border-[#FF3B00] bg-white text-[#FF3B00]"
              : "border-[#D4DAE4] bg-white text-[#8A93A6]";
          return (
            <li key={label} className="relative flex flex-1 flex-col items-center">
              {i < stages.length - 1 ? (
                <span className={`absolute left-1/2 top-[9px] h-0.5 w-full ${isDone ? "bg-[#3DD598]" : "bg-[#ECEFF4]"}`} aria-hidden="true" />
              ) : null}
              <span aria-current={isCurrent ? "step" : undefined} className={`relative z-[1] grid h-[19px] w-[19px] place-items-center rounded-full border-2 text-[9px] font-bold ${node}`}>
                {isDone ? <><Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /><span className="sr-only">Completed</span></> : i + 1}
              </span>
              <span className={`mt-1.5 text-center text-[9.5px] ${isDone || isCurrent ? "font-semibold text-[#1A1D26]" : "font-medium text-[#8A93A6]"}`}>
                <LocalizedText k={key} fallback={label} />
                {isCurrent ? <span className="sr-only">, current step</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Shared pill + stepper for the matter-detail page, so card and detail never drift. */
export function MatterStatusBadge({ item }: { item: BriefcasePresentationItem }) {
  const status = matterStatus(item);
  return <StatusPill label={status.pillLabel} tone={status.pillTone} />;
}

export function MatterStepper({ item, className = "" }: { item: BriefcasePresentationItem; className?: string }) {
  const status = matterStatus(item);
  if (!status.stepper) return null;
  return <Stepper done={status.stepper.done} current={status.stepper.current} className={className} sponsored={isPartnerPresentation(item)} />;
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3.5 mt-7 flex items-center justify-between first:mt-0">
      <h2 className="text-[15px] font-bold text-[#0B1320]"><LocalizedRuntimeText text={title} /></h2>
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
        <p className="text-xs font-bold uppercase text-[#00A99D]"><LocalizedText k="briefcase.account_required" fallback="Account required" /></p>
        <h1 className="mt-3 text-3xl font-extrabold"><LocalizedText k="briefcase.sign_in_title" fallback="Sign in to open your Briefcase" /></h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]"><LocalizedText k="briefcase.sign_in_body" fallback="Sign in to see the cases, results, available packets, reminders, payments, and Wilma conversations you chose to save in your Briefcase." /></p>
        <a className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/sign-in?mode=create&next=/briefcase">
          <LocalizedText k="signin.create_submit" fallback="Create account and continue" />
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
      <h2 className="mt-5 text-[20px] font-bold text-[#0B1320]"><LocalizedText k="briefcase.empty_title" fallback="Start a free screening" /></h2>
      <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-6 text-[#5A6275]">
        <LocalizedText k="briefcase.empty_body" fallback="Answer a few plain questions about your record. It's free, and you'll see possible next steps before paying anything." />
      </p>
      <Link href="/expungement-ai/check" className="mt-6 inline-flex min-h-12 items-center rounded-[11px] bg-[#FF3B00] px-7 text-[14px] font-bold text-white">
        <LocalizedText k="briefcase.empty_cta" fallback="Start a free screening" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Briefcase home                                                      */
/* ------------------------------------------------------------------ */

type NextStep = { headline: string; body: string; ctaLabel: string; href: string };

function pickNextStep(matters: BriefcasePresentationItem[]): NextStep | null {
  const order: MatterCareState[] = ["needs_attention", "packet_ready", "completed", "waiting", "guidance_only", "saved"];
  for (const target of order) {
    const item = matters.find((m) => matterCareState(m) === target);
    if (!item) continue;
    const href = `/briefcase/${item.id}`;
    const where = matterSubtitle(item) || item.jurisdiction || "saved matter";
    switch (target) {
      case "needs_attention":
        return { headline: `Finish your ${item.title} check`, body: "We need one more thing before this can move forward. Open it to see what to add.", ctaLabel: "See what we need", href };
      case "packet_ready":
        if (item.packetDraft.status === "unavailable") {
          return { headline: "Packet details unavailable", body: "We could not verify the saved packet details right now. Open the matter to try again.", ctaLabel: "Open matter", href };
        }
        if (item.packetProgress === "verified") {
          return { headline: humanMatterState(item), body: "Reopen the verified facts for this matter before generation.", ctaLabel: "Review verified facts", href: `/briefcase/${item.id}/review` };
        }
        if (item.packetProgress === "facts_complete") {
          return { headline: "Packet facts complete", body: "Review every saved packet fact and complete final verification before generation.", ctaLabel: "Review packet facts", href: `/briefcase/${item.id}/review` };
        }
        if (item.packetProgress === "in_progress") {
          return { headline: "Packet details in progress", body: "Your saved packet details are waiting in this matter.", ctaLabel: "Resume packet information", href: `/briefcase/${item.id}/packet-information` };
        }
        if (isPartnerPresentation(item)) {
          return { headline: "Your record-clearing packet is covered through your partner.", body: "We need a few more details before we can generate your documents and next-step instructions.", ctaLabel: "Finish my packet information", href };
        }
        if (item.paymentState === "paid") {
          return { headline: humanMatterState(item), body: "Your payment applies to this matter only. Open it to see packet preparation progress.", ctaLabel: "Open matter", href };
        }
        return { headline: humanMatterState(item), body: "Your Briefcase is free. Complete the packet information before deciding whether to generate it.", ctaLabel: "Complete packet information", href: `/briefcase/${item.id}/packet-information` };
      case "completed":
        return { headline: "Packet ready", body: `Your packet for ${item.title} is ready with filing next steps.`, ctaLabel: "Download my packet", href };
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8A93A6]"><LocalizedRuntimeText text={label} /></p>
      <p className={`mt-1.5 text-[28px] font-extrabold leading-none ${teal ? "text-[#00A99D]" : "text-[#0B1320]"}`}>{value}</p>
      <p className="mt-1.5 text-[11px] text-[#8A93A6]"><LocalizedRuntimeText text={sub} /></p>
    </div>
  );
}

export function BriefcaseOverview({ items, userEmail }: { items: BriefcasePresentationItem[]; userEmail?: string }) {
  const matters = items;
  if (matters.length === 0) return <EmptyBriefcase />;

  const name = firstName(userEmail);
  const inProgress = matters.filter((m) => IN_PROGRESS_STATES.has(matterCareState(m)));
  const readyToFile = matters.filter((m) => ["packet_ready", "completed"].includes(matterCareState(m)));
  const documents = matters.filter((m) => m.artifact.status === "ready" && m.artifact.canDownload);
  const unavailableCount = matters.filter((m) => m.authorityStatus === "unavailable").length;
  const next = pickNextStep(matters);
  const recordWord = inProgress.length === 1 ? "record" : "records";

  return (
    <section>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]">
        <LocalizedText k="briefcase.welcome_back" fallback="Welcome back" />{name ? `, ${name}` : ""}
      </h1>
      <p className="mt-1 text-[13px] text-[#8A93A6]">
        {inProgress.length > 0
          ? <LocalizedText k="briefcase.progress_body" fallback="You have {count} {recordWord} in progress. Here's where things stand." vars={{ count: inProgress.length, recordWord }} />
          : <LocalizedText k="briefcase.stand_body" fallback="Here's where your records stand." />}
      </p>

      {next ? (
        <div className="mt-5 flex flex-col items-start gap-4 rounded-[16px] bg-gradient-to-br from-[#0B1320] to-[#1B2B40] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7FE9DE]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#00A99D] shadow-[0_0_8px_#00A99D]" aria-hidden="true" /> <LocalizedText k="briefcase.your_next_step" fallback="Your next step" />
            </p>
            <h3 className="text-[20px] font-bold"><LocalizedRuntimeText text={next.headline} /></h3>
            <p className="mt-1.5 max-w-[52ch] text-[13px] leading-6 text-white/70"><LocalizedRuntimeText text={next.body} /></p>
          </div>
          <Link href={next.href} className="inline-flex shrink-0 items-center gap-2 rounded-[11px] bg-[#FF3B00] px-5 py-3 text-[14px] font-bold text-white">
            <LocalizedRuntimeText text={next.ctaLabel} /> <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      {unavailableCount > 0 ? (
        <p className="mt-4 rounded-[14px] border border-[#ECEFF4] bg-white px-5 py-4 text-[13px] text-[#5A6275]" role="status" aria-live="polite">
          Some saved matter details could not be verified, so the summary counts below omit {unavailableCount === 1 ? "one matter" : `${unavailableCount} matters`}.
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="In progress" value={inProgress.length} sub="Active records" />
        <StatCard label="Ready to file" value={readyToFile.length} sub="Action needed" teal />
        <StatCard label="Documents" value={documents.length} sub="Prepared for you" />
        <StatCard label="Cleared" value={0} sub="So far" />
      </div>

      <SectionHeader title="Your matters" action={<Link href="/briefcase/matters" className="text-[13px] font-semibold text-[#00A99D]"><LocalizedText k="briefcase.view_all" fallback="View all" /></Link>} />
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

function MatterCard({ item }: { item: BriefcasePresentationItem }) {
  const status = matterStatus(item);
  const subtitle = matterSubtitle(item) || item.summary;
  if (item.authorityStatus === "unavailable") {
    return <UnavailableMatterCard item={item} />;
  }
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
        <Stepper done={status.stepper.done} current={status.stepper.current} className="mt-1.5" sponsored={isPartnerPresentation(item)} />
      ) : (
        <p className="rounded-[10px] bg-[#F7F3EC] px-3.5 py-2.5 text-[12.5px] leading-5 text-[#5A6275]">
          <LocalizedText k="briefcase.guidance_card" fallback="What we can do here: we saved your state-specific next steps. Open this matter to read them." />
        </p>
      )}
    </Link>
  );
}

function UnavailableMatterCard({ item }: { item: BriefcasePresentationItem }) {
  return (
    <Link
      href={`/briefcase/${item.id}`}
      className="block rounded-[16px] border border-[#ECEFF4] bg-white p-5 shadow-[0_1px_3px_rgba(11,19,32,0.04)] transition hover:border-[#D7DEE8]"
    >
      <div role="status" aria-live="polite">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[16px] font-bold text-[#0B1320]">Saved matter</p>
          <StatusPill label="Details unavailable" tone="gray" />
        </div>
        <p className="mt-3 text-[12.5px] leading-5 text-[#5A6275]">We could not verify this matter&apos;s saved details right now. Open it to try again.</p>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* My matters / Documents / Payments / Settings / Reminders            */
/* ------------------------------------------------------------------ */

export function MattersView({ items }: { items: BriefcasePresentationItem[] }) {
  const matters = items;
  if (matters.length === 0) return <EmptyBriefcase />;
  return (
    <section>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]"><LocalizedText k="briefcase.my_matters" fallback="My matters" /></h1>
      <p className="mt-1 text-[13px] text-[#8A93A6]"><LocalizedText k="briefcase.my_matters_body" fallback="Each record you check is saved here as its own matter. Open one to see its documents and next steps." /></p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {matters.map((item) => (
          <MatterCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function DocumentsView({ items }: { items: BriefcasePresentationItem[] }) {
  const withDocs = items.filter((item) => item.artifact.status === "ready" && item.artifact.canDownload);
  const unavailableCount = items.filter((item) => item.authorityStatus === "unavailable").length;
  return (
    <section>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]"><LocalizedText k="briefcase.documents" fallback="Documents" /></h1>
      <p className="mt-1 text-[13px] text-[#8A93A6]"><LocalizedText k="briefcase.documents_body" fallback="Your documents live inside the matter they belong to. Here is every matter that has documents ready." /></p>
      <div className="mt-5 space-y-4">
        {unavailableCount > 0 ? (
          <p className="rounded-[14px] border border-[#ECEFF4] bg-white px-5 py-4 text-[13px] text-[#5A6275]" role="status" aria-live="polite">
            We could not verify document availability for {unavailableCount === 1 ? "one saved matter" : `${unavailableCount} saved matters`} right now.
          </p>
        ) : null}
        {withDocs.length ? (
          withDocs.map((item) => <BriefcaseItemCard key={item.id} item={item} />)
        ) : unavailableCount === 0 ? (
          <p className="rounded-[14px] border border-[#ECEFF4] bg-white px-5 py-6 text-[13px] text-[#5A6275]">
            <LocalizedText k="briefcase.documents_empty" fallback="Your documents will appear here after you generate a packet for one of your matters." />
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function RemindersView() {
  return (
    <section className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h1 className="text-[22px] font-extrabold text-[#0B1320]"><LocalizedText k="briefcase.reminders" fallback="Reminders" /></h1>
      <p className="mt-3 text-[14px] leading-6 text-[#5A6275]"><LocalizedText k="briefcase.reminders_body" fallback="Waiting-period reminders and filing follow-ups are saved here when the engine recommends them. You will never miss a window without a heads-up." /></p>
    </section>
  );
}

export function PaymentsView({ items }: { items: BriefcasePresentationItem[] }) {
  const transactions = items.filter((item) => item.paymentState === "paid" || item.paymentState === "refunded");
  const unavailableCount = items.filter((item) => item.paymentState === "unavailable").length;
  const hasConsumerMatter = items.some((item) => ["paid", "refunded", "unpaid"].includes(item.paymentState));
  return (
    <section className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h1 className="flex items-center gap-2 text-[22px] font-extrabold text-[#0B1320]"><CreditCard className="h-5 w-5" aria-hidden="true" /> <LocalizedText k="briefcase.payment_history" fallback="Payment history" /></h1>
      <div className="mt-4 space-y-3">
        {unavailableCount > 0 ? (
          <p className="rounded-[12px] bg-[#F7F3EC] p-4 text-[13px] text-[#5A6275]" role="status" aria-live="polite">
            We could not verify payment details for {unavailableCount === 1 ? "one saved matter" : `${unavailableCount} saved matters`} right now.
          </p>
        ) : null}
        {transactions.length ? (
          transactions.map((item) => (
            <div key={item.id} className="rounded-[12px] bg-[#F7F3EC] p-4 text-sm">
              <p className="font-bold text-[#0B1320]">
                $50 <LocalizedText k="payment.one_time" fallback="one-time" />:{" "}
                {item.paymentState === "refunded"
                  ? <LocalizedText k="payment.refunded" fallback="refunded" />
                  : <LocalizedText k="payment.paid" fallback="paid" />}
              </p>
              <p className="mt-1 text-[#5A6275]">{item.title}</p>
              <p className="mt-1 text-[#5A6275]"><LocalizedText k="briefcase.packet_label" fallback="Packet" />: {item.artifact.status === "ready" ? "ready" : "not ready"}</p>
              {item.paymentReceipt ? (
                <a
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#D9DEE8] bg-white px-4 text-[13px] font-bold text-[#0B1320]"
                  href={item.paymentReceipt.actionPath}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  <LocalizedText k="briefcase.view_receipt" fallback="View receipt" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <p className="mt-3 text-[13px] text-[#5A6275]" role="status">Receipt temporarily unavailable.</p>
              )}
            </div>
          ))
        ) : hasConsumerMatter ? (
          <p className="text-[13px] text-[#5A6275]">
            <LocalizedText k="briefcase.no_payments" fallback="No consumer packet payments yet. Payment appears only on a ready-to-generate consumer matter." />
          </p>
        ) : unavailableCount === 0 ? (
          <p className="text-[13px] text-[#5A6275]">Your partner-covered matters do not use consumer payment.</p>
        ) : null}
      </div>
    </section>
  );
}

export function SettingsView({ items = [], privacyReady = false }: { items?: BriefcasePresentationItem[]; privacyReady?: boolean }) {
  const showConsumerPayments = items.length === 0 || items.some((item) => item.paymentState !== "sponsored");
  return (
    <section id="profile" className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h1 className="text-[22px] font-extrabold text-[#0B1320]"><LocalizedText k="briefcase.profile_settings" fallback="Profile and settings" /></h1>
      <p className="mt-3 text-[14px] leading-6 text-[#5A6275]"><LocalizedText k="briefcase.settings_body" fallback="Your account preferences live here. This pass does not change partner auth, sessions, or billing." /></p>
      <div className="mt-5 flex flex-wrap gap-3">
        {showConsumerPayments ? (
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href="/briefcase/payments">
            <CreditCard className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="briefcase.payment_history" fallback="Payment history" />
          </Link>
        ) : null}
        {privacyReady ? (
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href="/briefcase/settings/privacy">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="briefcase.privacy_and_data" fallback="Privacy and data" />
          </Link>
        ) : null}
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href="/expungement-ai/support">
          <LifeBuoy className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="briefcase.technical_support" fallback="Get technical support" />
        </Link>
      </div>
      {privacyReady ? (
        <p className="mt-4 text-[13px] leading-6 text-[#5A6275]">
          <LocalizedText
            k="briefcase.privacy_and_data_body"
            fallback="Under Privacy and data you can download a copy of your information, delete one matter, or delete your account and personal data permanently."
          />
        </p>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Detailed matter row (used in Documents view): next steps + files    */
/* ------------------------------------------------------------------ */

export function BriefcaseItemCard({ item }: { item: BriefcasePresentationItem }) {
  if (item.authorityStatus === "unavailable") return <UnavailableMatterCard item={item} />;
  const artifact = item.artifact.status === "ready" && item.artifact.canDownload ? item.artifact : null;
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

      {item.summary ? <p className="mt-3 text-[13px] leading-6 text-[#5A6275]">{item.summary}</p> : null}

      {item.nextSteps.length ? <h3 className="mt-4 text-[13px] font-bold text-[#0B1320]"><LocalizedText k="common.next_steps" fallback="Next steps" /></h3> : null}
      <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#5A6275]">
        {item.nextSteps.map((step, index) => (
          <li key={`${step}-${index}`}><LocalizedRuntimeText text={step} /></li>
        ))}
      </ul>

      {artifact && !isGuidanceOnly ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {artifact.documents.map((document) => (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white" href={document.downloadPath} key={`${document.kind}:${document.downloadPath}`}>
              <Download className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="common.download" fallback="Download" /> {document.fileName}
            </Link>
          ))}
          <Link className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[#D9DEE8] px-4 text-[13px] font-bold text-[#0B1320]" href={`/briefcase/${item.id}`}>
            <LocalizedText k="common.open_matter" fallback="Open matter" />
          </Link>
        </div>
      ) : (
        <Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[#D9DEE8] px-4 text-[13px] font-bold text-[#0B1320]" href={`/briefcase/${item.id}`}>
          <LocalizedText k="common.open_matter" fallback="Open matter" />
        </Link>
      )}
    </article>
  );
}
