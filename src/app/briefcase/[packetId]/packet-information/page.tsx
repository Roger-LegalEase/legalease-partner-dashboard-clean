import Link from "next/link";

import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MatterStatusBadge } from "@/components/expungement-ai/BriefcaseViews";
import { PacketInformationBuilder } from "@/components/expungement-ai/PacketInformationBuilder";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import { humanAnswerValue, packetInformationAvailability, PACKET_INFORMATION_UNAVAILABLE_COPY } from "@/lib/expungement-ai/packet-information";

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
  const item = await getBriefcaseItem(auth.userId, packetId);
  const sponsored = item ? await isPartnerSponsoredPacketItem(item) : false;
  // UX-GLOBAL-001 — one predicate, shared with the matter page.
  const availability = packetInformationAvailability(item, { sponsored });
  const model = availability.available ? availability.model : null;
  const editId = (await searchParams).edit?.trim();
  const displayedQuestions = model
    ? editId ? model.editableQuestions.filter((question) => question.id === editId) : model.builderQuestions
    : [];

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      caseState={item?.state}
      briefcaseItemId={item?.id}
      activeNav="matters"
      breadcrumb={item ? <><Link href="/briefcase/matters">My matters</Link> / <Link href={`/briefcase/${item.id}`}>{item.title}</Link> / <b>Packet information</b></> : <b>Packet information</b>}
    >
      {item && model ? (
        <section>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">{model.stateName}</p>
              <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-[#0B1320]">Complete packet information</h1>
              <p className="mt-2 text-sm font-semibold text-[#475A6E]">{model.pathwayLabel}</p>
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

          {/* UX-GLOBAL-004 — facts the free record check already collected are
              not put to the participant a second time. They are shown here with
              their value and a working edit link, so nothing is hidden and
              nothing has to be retyped. */}
          {!editId && model.carriedForwardQuestions.length > 0 ? (
            <section className="mb-6 rounded-[16px] border border-[#ECEFF4] bg-white p-5 md:p-6" data-carried-forward-facts="true">
              <h2 className="text-base font-bold text-[#0B1320]">Carried over from your free record check</h2>
              <p className="mt-2 text-sm leading-6 text-[#5A6275]">We are not asking for these again. Check them and edit anything that is wrong.</p>
              <dl className="mt-4 divide-y divide-[#ECEFF4]">
                {model.carriedForwardQuestions.map((question) => (
                  <div className="grid gap-2 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center" key={question.id}>
                    <dt className="text-sm font-bold text-[#334155]">{question.prompt}</dt>
                    <dd className="text-sm text-[#475A6E]">{humanAnswerValue(model.initialAnswers[question.id])}</dd>
                    <dd>
                      <Link
                        className="inline-flex min-h-10 items-center rounded-[10px] border border-[#D9DEE8] px-4 text-sm font-bold text-[#0B1320]"
                        href={`/briefcase/${item.id}/packet-information?edit=${encodeURIComponent(question.id)}`}
                      >
                        Edit
                      </Link>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <PacketInformationBuilder
            itemId={item.id}
            stateCode={model.stateCode}
            questions={displayedQuestions}
            initialAnswers={model.initialAnswers}
            initiallyMissing={model.missingInputIds}
            editingFromReview={Boolean(editId)}
          />
        </section>
      ) : (
        <section className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
          {/* UX-GLOBAL-001. This page is now only reachable in this state by a
              direct URL: the matter page no longer offers a CTA that lands here.
              It still explains WHICH condition refused and offers a real next
              action rather than a link straight back to the CTA that sent the
              participant here. */}
          <h1 className="text-2xl font-extrabold text-[#0B1320]">
            {availability.available ? "Packet information is not available for this matter." : PACKET_INFORMATION_UNAVAILABLE_COPY[availability.reason].title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">
            {availability.available ? "Open the saved matter to review its result and next steps." : PACKET_INFORMATION_UNAVAILABLE_COPY[availability.reason].body}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href={item ? `/briefcase/${item.id}` : "/briefcase"}>Open matter</Link>
            <Link className="inline-flex min-h-11 items-center rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320]" href={item ? `/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item.id)}` : "/expungement-ai/support"}>Ask Wilma what to do next</Link>
          </div>
        </section>
      )}
    </BriefcaseShell>
  );
}
