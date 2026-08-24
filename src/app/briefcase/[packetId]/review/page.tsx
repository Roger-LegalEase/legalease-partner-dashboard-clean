import Link from "next/link";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { ConsumerCheckoutButton } from "@/app/expungement-ai/pay/ConsumerCheckoutButton";
import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge } from "@/components/expungement-ai/BriefcaseViews";
import { PacketGenerateButton } from "@/components/expungement-ai/PacketGenerateButton";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import {
  answerLabel,
  humanAnswerValue,
  expectedPacketComponents,
  packetInformationModelFor,
  packetInformationReviewSafety
} from "@/lib/expungement-ai/packet-information";
import { CONTACT_PARTS } from "@/lib/expungement-ai/contact-fields";
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

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.state}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters">My matters</Link> / <Link href={`/briefcase/${item.id}`}>{item.title}</Link> / <b>Accuracy review</b></> : <b>Accuracy review</b>}
    >
      {item && model ? (
        <section data-accuracy-review="true">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">Packet review</p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320]">Review your packet information</h1>
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">Check each answer before you pay. You can edit anything below.</p>
              <p className="mt-2 text-sm font-semibold text-[#475A6E]">{model.stateName}: {model.pathwayLabel}</p>
            </div>
            <MatterStatusBadge item={item} />
          </div>

          <div className="mt-6 grid gap-5">
            <AnswerSection title="Your information" itemId={item.id} rows={[
              row("Full legal name", "participant_full_legal_name", model.initialAnswers),
              // UX-GLOBAL-005 — three facts, three rows, three edit targets.
              // One row for "contact information" could only ever offer one
              // edit link into one unvalidated string.
              ...CONTACT_PARTS.map((part) => row(part.reviewLabel, part.id, model.initialAnswers))
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
              row("Asking about", "ownership_scope", model.initialAnswers),
              row("Case jurisdiction", "jurisdiction_scope", model.initialAnswers),
              row("How long ago the case ended", "resolved_timing_bucket", model.initialAnswers),
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
              <SummaryLine label="Result" value={reviewSafety.safe ? "A packet path remains available based on these answers." : "These answers need review before payment is available."} />
              <SummaryLine label="Price" value="$50 one time for this matter. No discount or promo codes." />
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

          <div className="mt-5 rounded-[16px] bg-[#0B1320] p-6 text-white">
            {sponsored ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7FE9DE]">Covered by your partner program</p>
                <h2 className="mt-2 text-xl font-extrabold">Generate this covered packet when the information is complete.</h2>
                {model.missingInputIds.length === 0 && reviewSafety.safe ? (
                  <div className="mt-5 [&_button]:bg-[#FF3B00]"><PacketGenerateButton briefcaseItemId={item.id} mode="sponsored_sync" /></div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/75">Complete the missing information before packet generation.</p>
                )}
              </>
            ) : item.paymentStatus === "paid" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7FE9DE]">Payment confirmed</p>
                <h2 className="mt-2 text-xl font-extrabold">This matter is already paid.</h2>
                <p className="mt-2 text-sm leading-6 text-white/75">You will not be charged again for a reasonable correction, retry, or download for this same matter.</p>
                {model.missingInputIds.length === 0 && reviewSafety.safe ? (
                  <div className="mt-5 [&_button]:bg-[#FF3B00]"><PacketGenerateButton briefcaseItemId={item.id} mode="paid_durable" label="Prepare updated packet" /></div>
                ) : null}
                {item.packetStatus === "ready" ? (
                  <Link className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}`}>Open my packet</Link>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7FE9DE]">$50 one time for this matter.</p>
                <h2 className="mt-2 text-xl font-extrabold">Pay only when you are ready to generate this packet.</h2>
                <p className="mt-2 text-sm leading-6 text-white/75">Your payment covers this packet for this case. Your Briefcase remains free.</p>
                {model.missingInputIds.length === 0 && reviewSafety.safe ? (
                  <div className="mt-5"><ConsumerCheckoutButton briefcaseItemId={item.id} label="Pay $50 and generate my packet" /></div>
                ) : (
                  <p className="mt-4 rounded-[10px] bg-white/10 px-4 py-3 text-sm font-semibold">Complete the missing information before payment.</p>
                )}
                {/* UX-GLOBAL-009 — the product accepts no discount or promo
                    code, and the one code-shaped thing it does have is a
                    partner access code that grants a covered packet on the
                    partner surface. Before this, a participant holding either
                    one found no field and no explanation, which reads as a
                    missing feature rather than a deliberate answer. */}
                <div className="mt-5 rounded-[12px] bg-white/10 px-4 py-4" data-code-policy="true">
                  <h3 className="text-sm font-bold">Have a code?</h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    We don&apos;t take discount or promo codes for packets. It is $50 for this matter, the same for everyone.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    A partner or program code works differently: it covers your packet in full, and it is applied through the link your program gave you before you ever reach this step. A covered matter says so here and is never asked to pay.
                  </p>
                  <Link className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-[#7FE9DE] underline" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
                    Told your packet is covered? Ask Wilma to check before you pay
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
          <h1 className="text-2xl font-extrabold text-[#0B1320]">Accuracy review is not available for this matter.</h1>
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

// UX-GLOBAL-008 — one formatter, shared with the questionnaire's own option
// labels. The three-entry map this replaced let every other snake_case option
// the profiles serve reach the participant unformatted.
function displayAnswer(value: AnswerValue | undefined) {
  return humanAnswerValue(value);
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
