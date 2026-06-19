import Link from "next/link";
import { CalendarDays, CheckCircle2, CreditCard, Download, FileText, ListChecks, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { matterCarePresentation, type MatterTone } from "@/lib/expungement-ai/frontend/briefcase-presentation";

const TONE_BADGE: Record<MatterTone, string> = {
  positive: "bg-[#00A99D]/10 text-[#007A72]",
  info: "bg-[#EEF2F7] text-[#334155]",
  wait: "bg-[#EEF2F7] text-[#334155]",
  attention: "bg-[#FDF1E8] text-[#9A3412]",
  care: "bg-[#F3ECFB] text-[#5B3FA0]",
  neutral: "bg-[#EEF2F7] text-[#334155]"
};

const TONE_CALLOUT: Record<MatterTone, string> = {
  positive: "border-[#CFEAE6] bg-[#F4FBFA] text-[#0B5C54]",
  info: "border-[#E4E8EF] bg-[#FBFCFE] text-[#475A6E]",
  wait: "border-[#E4E8EF] bg-[#FBFCFE] text-[#475A6E]",
  attention: "border-[#F4D9C7] bg-[#FDF1E8] text-[#9A3412]",
  care: "border-[#E4D7F5] bg-[#F7F2FD] text-[#4C3585]",
  neutral: "border-[#E4E8EF] bg-[#FBFCFE] text-[#475A6E]"
};

export function BriefcaseAuthGate() {
  return (
    <main className="min-h-screen bg-[#F7F3EC] px-4 py-20 text-[#0B1320]">
      <section className="mx-auto max-w-xl rounded-md border border-[#ECEFF4] bg-white p-6">
        <p className="text-xs font-bold uppercase text-[#00A99D]">Account required</p>
        <h1 className="mt-3 text-3xl font-extrabold">Sign in to open your Briefcase</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">Every Expungement.ai user has an account, and every check, result, packet, reminder, payment, and Wilma conversation is saved to Briefcase.</p>
        <a className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/sign-in">
          Sign in
        </a>
      </section>
      <WilmaBubble context="briefcase" />
    </main>
  );
}

export function BriefcaseOverview({ items }: { items: ConsumerBriefcaseItem[] }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase text-[#00A99D]">Your private workspace</p>
        <h1 className="mt-2 text-4xl font-extrabold">Your record-clearing Briefcase</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5A6275]">Checks, results, generated packets, filing checklists, reminders, payments, and Wilma conversations stay together so you can return without restarting.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="My Checks" value={String(items.filter((item) => item.type === "result" || item.type === "eligibility_check").length)} />
        <Metric label="My Packets" value={String(items.filter((item) => item.packetReady).length)} />
        <Metric label="Wilma Conversations" value={String(items.filter((item) => item.type === "wilma_conversation").length)} />
      </div>
      <BriefcaseSection title="My Checks" icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />} items={items.filter((item) => item.type !== "wilma_conversation")} />
      <Checklist />
      <BriefcaseSection title="Wilma Conversations" icon={<MessageCircle className="h-5 w-5" aria-hidden="true" />} items={items.filter((item) => item.type === "wilma_conversation")} id="wilma-conversations" />
    </section>
  );
}

export function MattersView({ items }: { items: ConsumerBriefcaseItem[] }) {
  return <BriefcaseSection title="My Checks" icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />} items={items.filter((item) => item.type === "result" || item.type === "eligibility_check")} />;
}

export function DocumentsView({ items }: { items: ConsumerBriefcaseItem[] }) {
  return <BriefcaseSection title="My Packets" icon={<FileText className="h-5 w-5" aria-hidden="true" />} items={items.filter((item) => item.packetReady)} empty="Generated packets will appear here after payment." />;
}

export function RemindersView() {
  return (
    <section className="rounded-md border border-[#ECEFF4] bg-white p-5">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold"><CalendarDays className="h-5 w-5" aria-hidden="true" /> Reminders</h1>
      <p className="mt-3 text-sm leading-6 text-[#5A6275]">Waiting-period reminders and filing follow-ups will be saved here when the engine recommends them.</p>
    </section>
  );
}

export function PaymentsView({ items }: { items: ConsumerBriefcaseItem[] }) {
  return (
    <section className="rounded-md border border-[#ECEFF4] bg-white p-5">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold"><CreditCard className="h-5 w-5" aria-hidden="true" /> Payment History</h1>
      <div className="mt-4 space-y-3">
        {items.filter((item) => item.packetReady).map((item) => (
          <div key={item.id} className="rounded-md bg-[#F7F3EC] p-4 text-sm">
            <p className="font-bold">$50 one-time packet payment: {item.paymentStatus ?? "not_applicable"}</p>
            <p className="mt-1 text-[#5A6275]">{item.title}</p>
            <p className="mt-1 text-[#5A6275]">Packet: {item.packetStatus ?? "not_started"}</p>
            {item.receiptUrl ? <p className="mt-1 text-[#5A6275]">Receipt: {item.receiptUrl}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SettingsView() {
  return (
    <section className="rounded-md border border-[#ECEFF4] bg-white p-5">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <p className="mt-3 text-sm leading-6 text-[#5A6275]">Consumer account preferences live here. This pass does not change partner auth, RLS, sessions, or billing.</p>
      <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/expungement-ai/support">
        Get technical support
      </Link>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#ECEFF4] bg-white p-4">
      <p className="text-sm font-bold text-[#5A6275]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Checklist() {
  return (
    <section className="rounded-md border border-[#ECEFF4] bg-white p-5">
      <h2 className="flex items-center gap-2 text-xl font-extrabold"><ListChecks className="h-5 w-5" aria-hidden="true" /> Filing Checklist</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {["Review every document", "Print and sign where required", "File with the correct court"].map((step) => (
          <div key={step} className="rounded-md bg-[#F7F3EC] p-4 text-sm font-bold">{step}</div>
        ))}
      </div>
    </section>
  );
}

function BriefcaseSection({
  title,
  icon,
  items,
  empty = "No saved items yet.",
  id
}: {
  title: string;
  icon: ReactNode;
  items: ConsumerBriefcaseItem[];
  empty?: string;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-md border border-[#ECEFF4] bg-white p-5">
      <h2 className="flex items-center gap-2 text-xl font-extrabold">{icon} {title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => <BriefcaseItemCard key={item.id} item={item} />) : <p className="text-sm text-[#5A6275]">{empty}</p>}
      </div>
    </section>
  );
}

export function BriefcaseItemCard({ item }: { item: ConsumerBriefcaseItem }) {
  const artifact = packetArtifactFor(item);
  const isGuidanceOnly = item.status === "guidance_saved" || item.resultCode === "guidance_only" || item.packetType === "guidance_packet";
  const care = matterCarePresentation(item);
  // Guidance-only keeps its established "Guidance saved" badge/marker; other matters use the
  // status-forward care presentation. The frontend renders the engine's status; it never decides.
  const badgeLabel = isGuidanceOnly ? "Guidance saved" : care.badge;

  return (
    <article className="rounded-[18px] border border-[#ECEFF4] bg-[#FBFCFE] p-4" data-briefcase-guidance-state={isGuidanceOnly ? "Guidance saved" : undefined} data-briefcase-care-state={care.careState}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-extrabold">{item.title}</p>
          <p className="mt-1 text-sm leading-6 text-[#5A6275]">{item.summary}</p>
          <div className="mt-3 grid gap-2 text-xs font-semibold text-[#5A6275] md:grid-cols-2">
            <p>Jurisdiction: {item.state}</p>
            <p>Pathway: {item.pathwayLabel ?? "Saved matter"}</p>
            {isGuidanceOnly ? (
              <p>Documents: Guidance only</p>
            ) : (
              <>
                <p>Payment: {item.paymentStatus ?? "not_applicable"}</p>
                <p>Packet: {item.packetStatus ?? "not_started"}</p>
              </>
            )}
            {artifact ? <p>Generated: {new Date(artifact.generatedAt).toLocaleString()}</p> : null}
            {item.receiptUrl ? <p>Receipt: {item.receiptUrl}</p> : null}
          </div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${TONE_BADGE[care.tone]}`}>{badgeLabel}</span>
      </div>
      {!isGuidanceOnly && care.showCallout ? (
        <p className={`mt-4 rounded-xl border px-3 py-2 text-sm leading-6 ${TONE_CALLOUT[care.tone]}`}>{care.blurb}</p>
      ) : null}
      {item.nextSteps.length ? <h3 className="mt-4 text-sm font-extrabold text-[#0B1320]">Next steps</h3> : null}
      <ul className="mt-3 space-y-1 text-sm leading-6 text-[#5A6275]">
        {item.nextSteps.map((step) => <li key={step}>{step}</li>)}
      </ul>
      {care.careState === "waiting" ? (
        <Link className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-4 text-sm font-bold" href="/briefcase/reminders">
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> Set a reminder
        </Link>
      ) : null}
      {artifact && !isGuidanceOnly ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-4 text-sm font-bold text-white" href={artifact.downloadPath}>
            <Download className="h-4 w-4" aria-hidden="true" /> Download
          </Link>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#D9DEE8] px-4 text-sm font-bold" href={`/briefcase/${item.id}`}>
            Open packet
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function packetArtifactFor(item: ConsumerBriefcaseItem) {
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
