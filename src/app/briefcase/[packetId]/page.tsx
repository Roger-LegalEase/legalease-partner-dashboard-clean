import Link from "next/link";
import { Download, MessageCircle } from "lucide-react";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import {
  MatterStatusBadge,
  MatterStepper,
  packetArtifactFor
} from "@/components/expungement-ai/BriefcaseViews";
import { PacketGenerateButton } from "@/components/expungement-ai/PacketGenerateButton";
import { LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import { humanMatterState } from "@/lib/expungement-ai/frontend/briefcase-presentation";
import { expectedPacketComponents, packetInformationAvailability, PACKET_INFORMATION_UNAVAILABLE_COPY } from "@/lib/expungement-ai/packet-information";

export const dynamic = "force-dynamic";

export default async function BriefcasePacketPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession();
  const item = await getBriefcaseItem(auth.userId, packetId);
  const sponsored = item ? await isPartnerSponsoredPacketItem(item) : false;
  const artifact = item ? packetArtifactFor(item) : null;
  const packetMatter = item?.resultCode === "packet_ready" || item?.resultCode === "packet_ready_with_caution";
  // UX-GLOBAL-001. The forward CTA is decided by the SAME predicate the
  // destination enforces, so it can no longer send a participant to a page that
  // refuses them and offers only a link back here.
  const availability = packetInformationAvailability(item, { sponsored });
  const model = availability.available ? availability.model : null;

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.state}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters" className="hover:text-[#1A1D26]">My matters</Link> / <b className="text-[#1A1D26]">{item.title}</b></> : <b className="text-[#1A1D26]">Matter</b>}
    >
      {item ? (
        <section data-briefcase-matter-id={item.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">{item.state}</p>
              <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.02em] text-[#0B1320]">{item.title}</h1>
              <p className="mt-2 text-[13px] leading-6 text-[#5A6275]">{item.summary}</p>
            </div>
            <MatterStatusBadge item={item} />
          </div>

          {packetMatter ? <MatterStepper item={item} className="mt-6 max-w-[680px]" sponsored={sponsored} /> : null}

          {!packetMatter ? (
            <SavedResultValue item={item} />
          ) : (
            <>
              <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
                <h2 className="text-lg font-extrabold text-[#0B1320]">{humanMatterState(item)}</h2>
                {sponsored ? (
                  <p className="mt-2 text-sm leading-6 text-[#5A6275]">Your packet is covered through your partner program. Complete the packet information and review it before generation.</p>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-[#5A6275]">Your Briefcase is free. Complete your packet information and pay only when you&apos;re ready to generate your packet.</p>
                    {item.paymentStatus !== "paid" ? <p className="mt-3 text-sm font-bold text-[#0B1320]">$50 one time when you are ready to generate this packet</p> : null}
                  </>
                )}

                <ul className="mt-5 grid gap-2 text-sm leading-6 text-[#475A6E]">
                  {expectedPacketComponents(model?.packetPlan ?? null).map((component) => <li key={component}>• {component}</li>)}
                </ul>

                {!availability.available ? (
                  <div className="mt-5 rounded-[12px] border border-[#F0D9A8] bg-[#FFFBF2] p-4">
                    <h3 className="text-sm font-extrabold text-[#0B1320]">{PACKET_INFORMATION_UNAVAILABLE_COPY[availability.reason].title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#5A6275]">{PACKET_INFORMATION_UNAVAILABLE_COPY[availability.reason].body}</p>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  {availability.available && !artifact && model?.stage !== "ready_to_generate" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/packet-information`}>
                      {model?.stage === "in_progress" ? "Resume packet information" : "Complete packet information"}
                    </Link>
                  ) : null}
                  {availability.available && !artifact && model?.stage === "ready_to_generate" ? (
                    <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${item.id}/review`}>Review for accuracy</Link>
                  ) : null}
                  {item.paymentStatus === "paid" && item.packetStatus === "failed" ? <PacketGenerateButton briefcaseItemId={item.id} mode="paid_durable" /> : null}
                  <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}`}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma about next steps
                  </Link>
                </div>
              </div>

              {artifact ? <ReadyPacket itemId={item.id} artifact={artifact} nextSteps={item.nextSteps} /> : null}
            </>
          )}
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

function SavedResultValue({ item }: { item: NonNullable<Awaited<ReturnType<typeof getBriefcaseItem>>> }) {
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
  nextSteps
}: {
  itemId: string;
  artifact: { generatedAt: string; downloadPath: string; fileName: string };
  nextSteps: string[];
}) {
  return (
    <>
      <div className="mt-6 rounded-[16px] border border-[#ECEFF4] bg-white p-6" data-packet-ready="true">
        <h2 className="text-lg font-extrabold text-[#0B1320]">Packet ready</h2>
        <p className="mt-2 text-sm leading-6 text-[#5A6275]">Your private PDF is ready to download and reopen from this matter.</p>
        <Link href={artifact.downloadPath} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white">
          <Download className="h-4 w-4" aria-hidden="true" /> Download {artifact.fileName}
        </Link>
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
