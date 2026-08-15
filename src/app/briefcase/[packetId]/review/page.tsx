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
  expectedPacketComponents,
  packetInformationModelFor
} from "@/lib/expungement-ai/packet-information";

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
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">Accuracy review</p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320]">Review this matter before generation</h1>
              <p className="mt-2 text-sm font-semibold text-[#475A6E]">{model.stateName}: {model.pathwayLabel}</p>
            </div>
            <MatterStatusBadge item={item} />
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

          <div className="mt-5 rounded-[16px] border border-[#ECEFF4] bg-white p-6">
            <h2 className="text-base font-bold text-[#0B1320]">Information still missing</h2>
            {model.missingInputIds.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm text-[#B42318]">
                {model.missingInputIds.map((id) => <li key={id}>{answerLabel(id)}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">No required packet fields are missing. Review the saved answers one more time before continuing.</p>
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
                {model.missingInputIds.length === 0 ? (
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
                {model.missingInputIds.length === 0 ? (
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
                <p className="mt-2 text-sm leading-6 text-white/75">Payment applies only to this exact Briefcase matter. It does not purchase the Briefcase or another matter.</p>
                {model.missingInputIds.length === 0 ? (
                  <div className="mt-5"><ConsumerCheckoutButton briefcaseItemId={item.id} label="Pay $50 and generate my packet" /></div>
                ) : (
                  <p className="mt-4 rounded-[10px] bg-white/10 px-4 py-3 text-sm font-semibold">Complete the missing information before payment.</p>
                )}
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
