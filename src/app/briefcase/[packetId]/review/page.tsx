import Link from "next/link";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge } from "@/components/expungement-ai/BriefcaseViews";
import { PacketVerificationAction } from "@/components/expungement-ai/PacketVerificationAction";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import {
  answerLabel,
  expectedPacketComponents,
  packetInformationModelFor,
  packetInformationReviewSafety
} from "@/lib/expungement-ai/packet-information";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export const dynamic = "force-dynamic";

export default async function PacketAccuracyReviewPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession(`/briefcase/${packetId}/review`);
  const item = await getBriefcaseItem(auth.userId, packetId);
  const sponsored = item ? await isPartnerSponsoredPacketItem(item) : false;
  const model = item ? packetInformationModelFor(item) : null;
  const reviewSafety = item ? packetInformationReviewSafety(item) : { safe: false, reason: "matter_missing" };
  const packetInformationStage = model?.stage as string | undefined;
  const initiallyVerified = packetInformationStage === "ready_to_generate" && reviewSafety.safe;

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.state}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters">My matters</Link> / <Link href={`/briefcase/${item.id}`}>{item.title}</Link> / <b>Final verification</b></> : <b>Final verification</b>}
    >
      {item && model ? (
        <section data-accuracy-review="true">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">Packet facts</p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320]">Review and verify your packet facts</h1>
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">
                {sponsored
                  ? "Check each answer before covered generation. You can edit anything below."
                  : item.paymentStatus === "paid"
                    ? "Check each answer before preparing the packet. You can edit anything below."
                    : "Check each answer before final verification. You can edit anything below."}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#475A6E]">{model.stateName}: {model.pathwayLabel}</p>
            </div>
            <MatterStatusBadge item={item} />
          </div>

          <div className="mt-6 grid gap-5">
            <AnswerSection title="Your information" itemId={item.id} rows={[
              row("Full legal name", "participant_full_legal_name", model.initialAnswers),
              row("Contact information", "contact_information", model.initialAnswers)
            ]} />
            <AnswerSection title="Case information" itemId={item.id} rows={[
              row("Charge or offense shown on the court record", "charge", model.initialAnswers),
              row("Charge level or classification", "offense_level", model.initialAnswers),
              row("Case outcome", "case_outcome", model.initialAnswers),
              row("Resolution date", "disposition_date", model.initialAnswers),
              row("Record type", "record_type", model.initialAnswers),
              row("County", "county", model.initialAnswers),
              row("Court", "court", model.initialAnswers),
              row("Current city", "residency_or_location", model.initialAnswers)
            ]} />
            <AnswerSection title="Important confirmations" itemId={item.id} rows={[
              row("Asking about", "ownership_scope", model.screeningAnswers, "ownership_scope"),
              row("Case jurisdiction", "jurisdiction_scope", model.screeningAnswers, "jurisdiction_scope"),
              row("How long ago the case ended", "resolved_timing_bucket", model.screeningAnswers, "resolved_timing_bucket"),
              row("Age when this happened", "age_at_offense", model.initialAnswers),
              row("Court-ordered requirements completed", "court_requirements_completed", model.initialAnswers),
              row("Financial obligations satisfied", "financial_obligations", model.initialAnswers),
              row("Pending criminal charges", "pending_cases", model.initialAnswers),
              row("Prior expungement, sealing, or similar relief", "prior_relief", model.initialAnswers),
              row("Trafficking-related circumstances", "trafficking_status", model.initialAnswers)
            ]} />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ReviewCard title="Expected packet components" icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
              <ul className="space-y-2">
                {expectedPacketComponents(model.packetPlan).map((component) => (
                  <li className="flex gap-2 text-sm leading-6 text-[#475A6E]" key={component}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#00A99D]" aria-hidden="true" /> {component}
                  </li>
                ))}
              </ul>
            </ReviewCard>

            <ReviewCard title="Filing limitations" icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#475A6E]">
                <li>Expungement.ai prepares self-help documents. It does not file them for you.</li>
                <li>Court, agency, service, record, and filing fees are separate.</li>
                <li>The court or agency makes the final decision. Approval is not guaranteed.</li>
                <li>Review names, dates, court information, and charges against your records before filing.</li>
              </ul>
            </ReviewCard>
          </div>

          <ReviewCard title="Your packet" icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
            <dl className="grid gap-3 text-sm">
              <SummaryLine label="State" value={model.stateName} />
              <SummaryLine label="Record-clearing option" value={model.pathwayLabel} />
              <SummaryLine label="Result" value={reviewSafety.safe ? "A packet path remains available based on these answers." : "These answers need review before final verification."} />
              <SummaryLine label="Coverage" value={sponsored ? "Covered by your partner program" : "This packet belongs to your private Briefcase matter."} />
              <SummaryLine label="Cost" value={sponsored ? "No consumer payment" : item.paymentStatus === "paid" ? "Already paid for this matter" : "$50 one time after final verification"} />
            </dl>
          </ReviewCard>

          <div className="mt-5 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
            <h2 className="text-base font-bold text-[#0B1320]">Details to check</h2>
            {model.missingInputIds.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm text-[#B42318]">
                {model.missingInputIds.map((id) => <li key={id}>{answerLabel(id)}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">All required information is here. Review the saved answers one more time before continuing.</p>
            )}
            <Link className="mt-4 inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]" href={`/briefcase/${item.id}/packet-information`}>
              Edit packet information
            </Link>
          </div>

          <PacketVerificationAction
            itemId={item.id}
            initiallyVerified={initiallyVerified}
            canVerify={model.missingInputIds.length === 0 && reviewSafety.safe}
            packetReady={item.packetStatus === "ready"}
            mode={sponsored ? "sponsored" : item.paymentStatus === "paid" ? "paid" : "consumer"}
          />
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
          <h1 className="text-2xl font-extrabold text-[#0B1320]">Final verification is not available for this matter.</h1>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href={item ? `/briefcase/${item.id}` : "/briefcase"}>Open matter</Link>
        </section>
      )}
    </BriefcaseShell>
  );
}

function ReviewCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-[#0B1320]">{icon}{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

type ReviewRow = { label: string; fieldId: string; value: string };

function row(label: string, fieldId: string, answers: Record<string, AnswerValue>, editId = fieldId): ReviewRow {
  return { label, fieldId: editId, value: displayAnswer(answers[fieldId]) };
}

function displayAnswer(value: AnswerValue | undefined) {
  if (value === undefined || value === null || value === "") return "Missing";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return value.unknown ? "I’m not sure" : String(value.value ?? "Missing");
  const labels: Record<string, string> = {
    gt_10_years: "More than 10 years ago",
    yes: "Yes",
    no: "No"
  };
  return labels[String(value)] ?? String(value);
}

function AnswerSection({ title, itemId, rows }: { title: string; itemId: string; rows: ReviewRow[] }) {
  return (
    <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="text-lg font-extrabold text-[#0B1320]">{title}</h2>
      <dl className="mt-4 divide-y divide-[#ECEFF4]">
        {rows.map((entry) => (
          <div className="grid gap-2 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center" key={`${title}-${entry.label}`}>
            <dt className="text-sm font-bold text-[#334155]">{entry.label}</dt>
            <dd className={entry.value === "Missing" ? "text-sm font-semibold text-[#B42318]" : "text-sm text-[#475A6E]"}>{entry.value}</dd>
            <dd><Link className="inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]" href={`/briefcase/${itemId}/packet-information?edit=${encodeURIComponent(entry.fieldId)}`}>Edit</Link></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 sm:grid-cols-[8rem_1fr]"><dt className="font-bold text-[#334155]">{label}</dt><dd className="text-[#475A6E]">{value}</dd></div>;
}
