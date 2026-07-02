import Link from "next/link";
import { Download, MessageCircle } from "lucide-react";
import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge, MatterStepper, packetCompletionActionFor } from "@/components/expungement-ai/BriefcaseViews";
import { PacketGenerateButton } from "@/components/expungement-ai/PacketGenerateButton";
import { LocalizedRuntimeText, LocalizedText } from "@/components/expungement-ai/LocalizationProvider";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

// Generic, state-neutral self-file flow used only when the engine returned no filing steps for this
// matter. These are plain actions, not invented state-specific facts (no addresses, hours, or fees).
const GENERIC_FILING_STEPS: Array<{ title: string; detail: string }> = [
  { title: "Print your packet", detail: "Print every document below, single-sided. Bring the originals with you." },
  { title: "Take it to the clerk or court", detail: "Go to the clerk's office for the court that handled your case." },
  { title: "Ask to file your expungement petition", detail: "Hand the clerk your packet. If you cannot afford the fee, ask about a fee waiver." },
  { title: "Keep your stamped copy", detail: "The clerk will stamp your copies. Keep one safe, then come back here." }
];

export default async function BriefcasePacketPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession();
  const item = await getBriefcaseItem(auth.userId, packetId);
  const artifact = packetArtifactFor(item?.artifactRefs);
  const completionAction = item ? packetCompletionActionFor(item) : null;
  const isGuidanceOnly = item?.status === "guidance_saved" || item?.resultCode === "guidance_only" || item?.packetType === "guidance_packet";

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.state}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters" className="hover:text-[#1A1D26]">My matters</Link> / <b className="text-[#1A1D26]">{item.title}</b></> : <b className="text-[#1A1D26]">Matter</b>}
    >
      {item ? (
        <section data-briefcase-guidance-state={isGuidanceOnly ? "Guidance saved" : undefined}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]">{item.title}</h1>
              <p className="mt-1 text-[13px] text-[#8A93A6]">{[item.state, item.pathwayLabel].filter(Boolean).join(", ") || item.summary}</p>
            </div>
            <span className="mt-1"><MatterStatusBadge item={item} /></span>
          </div>

          {!isGuidanceOnly ? <MatterStepper item={item} className="mt-6 max-w-[520px]" /> : null}

          {isGuidanceOnly ? (
            <>
              {/* Guidance matter: next steps are the deliverable. No filing stepper, no pay/generate. */}
              <p className="mt-5 rounded-[12px] bg-[#F7F3EC] px-4 py-3 text-[13px] leading-6 text-[#5A6275]">
                <LocalizedText k="briefcase.guidance_detail" fallback="What we can do here: we saved real, state-specific next steps for this record. There is no court packet to buy for this path." />
              </p>
              <div className="mt-5 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
                <h2 className="text-[16px] font-bold text-[#0B1320]"><LocalizedText k="common.next_steps" fallback="Next steps" /></h2>
                <ol className="mt-4 space-y-4">
                  {item.nextSteps.map((step, i) => (
                    <li key={step} className="flex gap-3.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#00A99D] bg-[#F7F3EC] text-[12px] font-bold text-[#00A99D]">{i + 1}</span>
                      <p className="pt-0.5 text-[13.5px] leading-6 text-[#5A6275]"><LocalizedRuntimeText text={step} /></p>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 border-t border-[#ECEFF4] pt-4 text-[12.5px] leading-6 text-[#8A93A6]">
                  <LocalizedText k="briefcase.packet_later" fallback="A self-help packet may become available for this path later. We will save it here if it does." />
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="briefcase.ask_wilma_explain" fallback="Ask Wilma to explain this" />
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* How to file: the highest-care block, above the documents. */}
              <h2 className="mb-3 mt-7 text-[15px] font-bold text-[#0B1320]"><LocalizedText k="briefcase.how_to_file" fallback="How to file" /></h2>
              <div className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
                <h3 className="text-[16px] font-bold text-[#0B1320]"><LocalizedText k="briefcase.ready_exactly" fallback="You're ready. Here's exactly what to do." /></h3>
                <p className="mb-5 mt-1 text-[13px] leading-6 text-[#5A6275]"><LocalizedText k="briefcase.file_yourself" fallback="You file the paperwork yourself. We prepared everything and will walk you through each step." /></p>
                {filingSteps(item.nextSteps).map((step, i, all) => (
                  <div key={step.title} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {i < all.length - 1 ? <span className="absolute left-[13px] top-[30px] bottom-0 w-0.5 bg-[#ECEFF4]" aria-hidden="true" /> : null}
                    <span className="z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#00A99D] bg-[#F7F3EC] text-[12px] font-bold text-[#00A99D]">{i + 1}</span>
                    <div className="pt-0.5">
                      <p className="text-[14px] font-semibold text-[#1A1D26]"><LocalizedRuntimeText text={step.title} /></p>
                      {step.detail ? <p className="mt-0.5 text-[13px] leading-6 text-[#5A6275]"><LocalizedRuntimeText text={step.detail} /></p> : null}
                    </div>
                  </div>
                ))}
                <button type="button" className="mt-2 rounded-[8px] bg-[#0B1320] px-5 py-3 text-[13px] font-bold text-white">
                  <LocalizedText k="briefcase.mark_submitted" fallback="I've filed this, mark as submitted" />
                </button>
              </div>

              {/* Your documents (nested in the matter) */}
              <div className="mb-3 mt-7 flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-[#0B1320]"><LocalizedText k="briefcase.your_documents" fallback="Your documents" /></h2>
                {artifact && !isGuidanceOnly ? (
                  <Link href={artifact.downloadPath} className="text-[13px] font-semibold text-[#00A99D]"><LocalizedText k="briefcase.download_all" fallback="Download all" /></Link>
                ) : null}
              </div>
              {artifact && !isGuidanceOnly ? (
                <div className="overflow-hidden rounded-[16px] border border-[#ECEFF4] bg-white">
                  <div className="flex items-center gap-3.5 px-5 py-4">
                    <span className="grid h-[46px] w-[38px] shrink-0 place-items-center rounded-md border border-[#E2E6EE] bg-[#EEF1F6] text-[10px] font-bold text-[#8A93A6]">PDF</span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1D26]">{artifact.fileName}</p>
                      <p className="mt-0.5 text-[11px] text-[#8A93A6]"><LocalizedText k="briefcase.prepared_ready" fallback="Prepared, ready to print." /> Generated {new Date(artifact.generatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Link href={artifact.downloadPath} className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#0B1320] px-3.5 py-2 text-[12px] font-semibold text-white">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> <LocalizedText k="common.download" fallback="Download" />
                      </Link>
                    </div>
                  </div>
                </div>
              ) : completionAction && !isGuidanceOnly ? (
                <div className="rounded-[16px] border border-[#ECEFF4] bg-white px-5 py-5">
                  <p className="text-[14px] font-semibold text-[#1A1D26]">{completionAction.fileName}</p>
                  <p className="mt-1 text-[13px] leading-6 text-[#5A6275]">
                    We need Mississippi court and case details before preparing a petition packet.
                  </p>
                  <Link href={completionAction.actionPath} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white">
                    Complete packet information
                  </Link>
                </div>
              ) : (
                <div className="rounded-[16px] border border-[#ECEFF4] bg-white px-5 py-5">
                  {item.paymentAllowed && item.paymentStatus !== "paid" ? (
                    <>
                      <p className="text-[14px] font-semibold text-[#1A1D26]">A path may be available.</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#5A6275]">Continue to payment before packet generation.</p>
                      <Link href={`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(item.id)}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white">
                        Continue to payment
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-[14px] font-semibold text-[#1A1D26]">Your packet is almost ready.</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#5A6275]">
                        We need any remaining packet information before we generate your documents and next-step instructions.
                      </p>
                      <PacketGenerateButton briefcaseItemId={item.id} />
                    </>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma about next steps
                </Link>
              </div>
            </>
          )}

          {item.receiptUrl ? <p className="mt-6 text-[11px] text-[#8A93A6]">Receipt: {item.receiptUrl}</p> : null}
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

function filingSteps(nextSteps: string[]) {
  if (nextSteps.length === 0) return GENERIC_FILING_STEPS;
  return nextSteps.map((step) => ({ title: step, detail: "" }));
}

function packetArtifactFor(refs: Record<string, unknown> | undefined) {
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
