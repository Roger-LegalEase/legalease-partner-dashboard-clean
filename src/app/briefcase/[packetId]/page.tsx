import Link from "next/link";
import { Download, MessageCircle } from "lucide-react";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge, MatterStepper } from "@/components/expungement-ai/BriefcaseViews";
import { LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import {
  type BriefcasePresentationArtifact,
  type BriefcasePresentationItem
} from "@/lib/expungement-ai/briefcase-presentation-authority";
import { decorateConsumerBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-consumer-presentation";
import { humanMatterState } from "@/lib/expungement-ai/frontend/briefcase-presentation";

export const dynamic = "force-dynamic";

export default async function BriefcasePacketPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession();
  const storedItem = await getBriefcaseItem(auth.userId, packetId);
  const item = storedItem ? await decorateConsumerBriefcaseItemForPresentation({
    consumerAuthUserId: auth.userId,
    item: storedItem
  }) : null;
  const available = item?.authorityStatus !== "unavailable";
  const sponsored = item?.paymentState === "sponsored";
  const packetMatter = available && (item?.resultCode === "packet_ready" || item?.resultCode === "packet_ready_with_caution");
  const factsVerified = item?.verificationStatus === "verified";
  const packetDraftAvailable = item?.packetDraft.status === "available";
  const artifact = item?.artifact.status === "ready" ? item.artifact : null;
  const mississippiClinicPacket = sponsored
    && item?.jurisdiction === "MS"
    && item.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  const packetComponents = item?.packetDraft.status === "available"
    ? item.packetDraft.expectedComponents
    : item?.checklist ?? [];

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.jurisdiction ?? undefined}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters" className="hover:text-[#1A1D26]">My matters</Link> / <b className="text-[#1A1D26]">{item.title}</b></> : <b className="text-[#1A1D26]">Matter</b>}
    >
      {item && item.authorityStatus !== "unavailable" ? (
        <section data-briefcase-matter-id={item.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">{item.jurisdiction}</p>
              <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]">{item.title}</h1>
              <p className="mt-2 text-[13px] leading-6 text-[#5A6275]">{item.summary}</p>
            </div>
            <MatterStatusBadge item={item} />
          </div>

          {packetMatter ? <MatterStepper item={item} className="mt-6 max-w-[680px]" /> : null}

          {!packetMatter ? (
            <SavedResultValue item={item} />
          ) : (
            <>
              <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
                <h2 className="text-lg font-extrabold text-[#0B1320]">
                  {mississippiClinicPacket ? "Your Mississippi clinic packet" : humanMatterState(item)}
                </h2>
                {sponsored ? (
                  <p className="mt-2 text-sm leading-6 text-[#5A6275]">Your packet is covered through your partner program. Complete the packet information and review it before generation.</p>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-[#5A6275]">Your Briefcase is free. Complete your packet information and pay only when you&apos;re ready to generate your packet.</p>
                    {item.paymentState !== "paid" ? <p className="mt-3 text-sm font-bold text-[#0B1320]">$50 one time when you are ready to generate this packet</p> : null}
                    {item.paymentReceipt ? (
                      <a
                        className="mt-3 inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]"
                        href={item.paymentReceipt.actionPath}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View payment receipt<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : null}
                  </>
                )}

                <ul className="mt-5 grid gap-2 text-sm leading-6 text-[#475A6E]">
                  {packetComponents.map((component, index) => <li key={`${component}-${index}`}>• {component}</li>)}
                </ul>

                {!artifact && !packetDraftAvailable ? (
                  <p className="mt-5 rounded-[10px] bg-[#F7F3EC] px-4 py-3 text-sm text-[#5A6275]" role="status" aria-live="polite">
                    Packet information is temporarily unavailable. Refresh this matter before continuing.
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  {!artifact && packetDraftAvailable && item.packetProgress === "not_started" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/packet-information`}>
                      {mississippiClinicPacket ? "Continue my Mississippi clinic packet" : "Complete packet information"}
                    </Link>
                  ) : null}
                  {!artifact && packetDraftAvailable && item.packetProgress === "in_progress" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/packet-information`}>
                      {mississippiClinicPacket ? "Continue my Mississippi clinic packet" : "Resume packet information"}
                    </Link>
                  ) : null}
                  {!artifact && packetDraftAvailable && item.packetProgress === "facts_complete" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/review`}>
                      Review packet facts
                    </Link>
                  ) : null}
                  {!artifact && packetDraftAvailable && item.packetProgress === "verified" && factsVerified ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/review`}>
                      Review verified facts
                    </Link>
                  ) : null}
                  <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma about next steps
                  </Link>
                </div>
              </div>

              {artifact ? <ReadyPacket itemId={item.id} artifact={artifact} nextSteps={item.nextSteps} mississippiClinicPacket={mississippiClinicPacket} /> : null}
            </>
          )}
        </section>
      ) : item ? (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6" role="status" aria-live="polite">
          <p className="text-xs font-bold uppercase text-[#8A93A6]">Details unavailable</p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#0B1320]">We could not verify this matter&apos;s saved details.</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">Refresh the page to try again. No packet, payment, or filing status is shown until the saved authority can be verified.</p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase">Back to Briefcase</Link>
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
          <p className="text-xs font-bold uppercase text-[#E0A93B]">Not found</p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#0B1320]">We couldn&apos;t find that matter</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">This matter is not in your Briefcase.</p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase">Open Briefcase</Link>
        </section>
      )}
    </BriefcaseShell>
  );
}

function SavedResultValue({ item }: { item: BriefcasePresentationItem }) {
  return (
    <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6" data-briefcase-guidance-state={humanMatterState(item)}>
      <h2 className="text-lg font-extrabold text-[#0B1320]">{humanMatterState(item)}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5A6275]">We saved this result and its state-specific next steps in your free Briefcase. You can return anytime as you gather information or follow the guidance below.</p>
      <h3 className="mt-5 text-sm font-bold text-[#0B1320]">Your next steps</h3>
      <ol className="mt-3 space-y-3">
        {item.nextSteps.map((step, index) => (
          <li className="flex gap-3 text-sm leading-6 text-[#5A6275]" key={`${step}-${index}`}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[#00A99D] text-xs font-bold text-[#00A99D]">{index + 1}</span>
            <LocalizedRuntimeText text={step} />
          </li>
        ))}
      </ol>
      <Link className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma to explain this
      </Link>
    </div>
  );
}

function ReadyPacket({
  itemId,
  artifact,
  nextSteps,
  mississippiClinicPacket
}: {
  itemId: string;
  artifact: Extract<BriefcasePresentationArtifact, { status: "ready" }>;
  nextSteps: string[];
  mississippiClinicPacket: boolean;
}) {
  return (
    <>
      <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6" data-packet-ready="true">
        <h2 className="text-lg font-extrabold text-[#0B1320]">Packet ready</h2>
        <p className="mt-2 text-sm leading-6 text-[#5A6275]">
          Your private PDF is ready to download and reopen from this matter.
          {artifact.pageCount ? ` ${artifact.pageCount} pages.` : ""}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {artifact.documents.map((document) => (
            <Link href={document.downloadPath} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" key={`${document.kind}:${document.downloadPath}`}>
              <Download className="h-4 w-4" aria-hidden="true" /> {mississippiClinicPacket ? "Download Mississippi non-conviction expungement packet" : `Download ${document.fileName}`}
            </Link>
          ))}
        </div>
        <Link href={`/briefcase/${itemId}/review`} className="ml-3 mt-5 inline-flex min-h-11 items-center rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]">Review packet information</Link>
      </div>
      {nextSteps.length > 0 ? (
        <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
          <h2 className="text-lg font-extrabold text-[#0B1320]">Filing next steps</h2>
          <ol className="mt-4 space-y-3">
            {nextSteps.map((step, index) => <li className="text-sm leading-6 text-[#5A6275]" key={`${step}-${index}`}>{index + 1}. <LocalizedRuntimeText text={step} /></li>)}
          </ol>
        </div>
      ) : null}
    </>
  );
}
