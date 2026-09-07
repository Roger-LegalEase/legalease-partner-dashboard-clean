import Link from "next/link";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge } from "@/components/expungement-ai/BriefcaseViews";
import { PacketInformationBuilder } from "@/components/expungement-ai/PacketInformationBuilder";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { decorateConsumerBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-consumer-presentation";

export const dynamic = "force-dynamic";

export default async function PacketInformationPage({
  params,
  searchParams
}: {
  params: Promise<{ packetId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { packetId } = await params;
  const auth = await requireConsumerBriefcaseSession(`/briefcase/${packetId}/packet-information`);
  const storedItem = await getBriefcaseItem(auth.userId, packetId);
  const item = storedItem ? await decorateConsumerBriefcaseItemForPresentation({
    consumerAuthUserId: auth.userId,
    item: storedItem
  }) : null;
  const sponsored = item?.paymentState === "sponsored";
  const packetResult = item?.authorityStatus !== "unavailable"
    && (item?.resultCode === "packet_ready" || item?.resultCode === "packet_ready_with_caution");
  const model = packetResult && item?.paymentState !== "unavailable" && item?.packetDraft.status === "available"
    ? item.packetDraft
    : null;
  const editId = (await searchParams).edit?.trim();
  const displayedQuestions = model
    ? editId ? model.questions.filter((question) => question.id === editId) : model.builderQuestions
    : [];

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.jurisdiction ?? undefined}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters">My matters</Link> / <Link href={`/briefcase/${item.id}`}>{item.title}</Link> / <b>Packet information</b></> : <b>Packet information</b>}
    >
      {item && item.jurisdiction && model ? (
        <section>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">{item.jurisdiction}</p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320]">Complete packet information</h1>
              {item.pathwayLabel ? <p className="mt-2 text-sm font-semibold text-[#475A6E]">{item.pathwayLabel}</p> : null}
            </div>
            <MatterStatusBadge item={item} />
          </div>

          <div className="my-6 rounded-[14px] bg-[#F7F3EC] px-5 py-4 text-sm leading-6 text-[#5A6275]">
            {sponsored ? (
              <p>Your packet is covered through your partner program. Complete the information below without a consumer payment.</p>
            ) : (
              <p>Your Briefcase is free. Complete your packet information and pay only when you&apos;re ready to generate your packet.</p>
            )}
            <p className="mt-2">Complete the remaining details for this packet. Review what&apos;s already here, add anything that is missing, and save your progress anytime.</p>
          </div>

          <PacketInformationBuilder
            itemId={item.id}
            stateCode={item.jurisdiction}
            questions={displayedQuestions}
            initialAnswers={model.initialAnswers}
            initiallyMissing={model.missingInputIds}
            editingFromReview={Boolean(editId)}
          />
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6" role="status" aria-live="polite">
          <h1 className="text-2xl font-extrabold text-[#0B1320]">Packet information is not available for this matter.</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">Open the saved matter to review its result and next steps.</p>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href={item ? `/briefcase/${item.id}` : "/briefcase"}>Open matter</Link>
        </section>
      )}
    </BriefcaseShell>
  );
}
