import Link from "next/link";
import { Download, ListChecks, MessageCircle, Save } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, isPartnerSponsoredPacketItem } from "@/lib/expungement-ai/briefcase";
import { ConsumerPacketGenerationError, generatePaidConsumerPacket, getConsumerPacketStatus } from "@/lib/expungement-ai/packet-generation";
import { getConsumerCheckoutStatus, recordConsumerPaymentConfirmation } from "@/lib/expungement-ai/payment-adapter";
import { LocalizedRuntimeText, LocalizedText } from "@/components/expungement-ai/LocalizationProvider";

export default async function PacketReadyPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const auth = await requireConsumerBriefcaseSession(`/expungement-ai/packet-ready${queryString(params)}`);
  const briefcaseItemId = value(params.briefcaseItemId);
  const checkoutSessionId = value(params.session_id);
  const item = briefcaseItemId ? await getBriefcaseItem(auth.userId, briefcaseItemId) : null;
  const partnerSponsored = item ? await isPartnerSponsoredPacketItem(item) : false;
  const checkoutStatus = !partnerSponsored && item && checkoutSessionId ? await getConsumerCheckoutStatus({ item, checkoutSessionId }) : null;
  const paid = checkoutStatus?.paid === true;
  const confirmed = !partnerSponsored && item && checkoutStatus ? await recordConsumerPaymentConfirmation({ userId: auth.userId, item, status: checkoutStatus }) : null;
  const packetItem = partnerSponsored ? item : confirmed;
  let packet = packetItem ? await getConsumerPacketStatus({ userId: auth.userId, briefcaseItemId: packetItem.id }) : null;
  const needsPacketInformation = packet?.artifactRefs?.source === "mississippi_petition_information_required";
  let generationFailed = false;

  if ((partnerSponsored || paid) && packetItem && packet?.packetStatus !== "ready" && !needsPacketInformation) {
    try {
      packet = await generatePaidConsumerPacket({
        userId: auth.userId,
        briefcaseItemId: packetItem.id,
        dryRunMode: checkoutStatus?.mode === "dry_run"
      });
    } catch (error) {
      generationFailed = error instanceof ConsumerPacketGenerationError;
      packet = await getConsumerPacketStatus({ userId: auth.userId, briefcaseItemId: packetItem.id });
    }
  }

  const packetReady = packet?.packetStatus === "ready" && Boolean(packet.artifactRefs && "downloadPath" in packet.artifactRefs);
  const checkoutMode = checkoutStatus?.mode;

  return (
    <ConsumerPageShell wilmaContext="packet-ready" headerVariant="app">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          {packetReady && packetItem && packet?.artifactRefs && "downloadPath" in packet.artifactRefs ? (
            <>
              <p className="text-xs font-bold uppercase text-[#00A99D]">{partnerSponsored ? <LocalizedText k="packet.partner_sponsored" fallback="Partner-sponsored packet" /> : <><LocalizedText k="packet.payment_confirmed" fallback="Payment confirmed" /> {checkoutMode === "dry_run" ? "(dry-run)" : ""}</>}</p>
              <h1 className="mt-3 text-4xl font-extrabold"><LocalizedText k="packet.ready_title" fallback="Your packet is ready" /></h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">{partnerSponsored ? <LocalizedText k="packet.partner_saved" fallback="Your RCAP partner covered this screening. The packet artifact is saved to your Briefcase." /> : <LocalizedText k="packet.payment_saved" fallback="Payment status and packet artifact are saved to your Briefcase." />}</p>
              <div className="mt-5 rounded-md bg-[#F7F3EC] p-4 text-sm leading-6 text-[#5A6275]">
                <p className="font-bold text-[#0B1320]">{packet.artifactRefs.fileName}</p>
                <p><LocalizedText k="packet.jurisdiction" fallback="Jurisdiction" />: {packetItem.state}</p>
                <p><LocalizedText k="packet.pathway" fallback="Pathway" />: {packetItem.pathwayLabel ?? <LocalizedText k="packet.record_clearing_packet" fallback="Record clearing packet" />}</p>
                <p><LocalizedText k="packet.generated" fallback="Generated" />: {new Date(packet.artifactRefs.generatedAt).toLocaleString()}</p>
                {!partnerSponsored && packetItem.receiptUrl ? <p><LocalizedText k="packet.receipt" fallback="Receipt" />: {packetItem.receiptUrl}</p> : null}
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href={packet.artifactRefs.downloadPath}><Download className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="packet.download" fallback="Download packet" /></Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase"><ListChecks className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="packet.view_checklist" fallback="View filing checklist" /></Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase/documents"><Save className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="packet.save_briefcase" fallback="Save to Briefcase" /></Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(packetItem.id)}`}><MessageCircle className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="packet.technical_support" fallback="Technical support" /></Link>
                <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="#ask-wilma"><MessageCircle className="h-4 w-4" aria-hidden="true" /> <LocalizedText k="packet.ask_wilma_next" fallback="Ask Wilma about next steps" /></a>
              </div>
              <div className="mt-6">
                <h2 className="text-lg font-extrabold"><LocalizedText k="packet.filing_checklist" fallback="Filing checklist" /></h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5A6275]">
                  {packetItem.nextSteps.map((step) => <li key={step}><LocalizedRuntimeText text={step} /></li>)}
                </ul>
              </div>
            </>
          ) : partnerSponsored && needsPacketInformation && packet?.artifactRefs?.source === "mississippi_petition_information_required" ? (
            <>
              <p className="text-xs font-bold uppercase text-[#00A99D]"><LocalizedText k="packet.partner_sponsored" fallback="Partner-sponsored packet" /></p>
              <h1 className="mt-3 text-4xl font-extrabold"><LocalizedText k="briefcase.complete_packet_information" fallback="Complete packet information" /></h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]"><LocalizedText k="packet.need_ms_info" fallback="We need Mississippi court and case details before preparing your petition packet. No payment is required for this sponsored matter." /></p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#0B1320] px-5 text-sm font-bold text-white" href={packet.artifactRefs.actionPath}><LocalizedText k="briefcase.complete_packet_information" fallback="Complete packet information" /></Link>
            </>
          ) : (partnerSponsored || paid) && generationFailed ? (
            <>
              <p className="text-xs font-bold uppercase text-[#E0A93B]"><LocalizedText k="packet.regeneration_needed" fallback="Packet regeneration needed" /></p>
              <h1 className="mt-3 text-4xl font-extrabold"><LocalizedText k="packet.not_ready" fallback="Packet is not ready yet" /></h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">{partnerSponsored ? <LocalizedText k="packet.partner_regenerate" fallback="Your partner-sponsored packet needs to be regenerated. Try again or contact support." /> : <LocalizedText k="packet.payment_regenerate" fallback="Your payment was confirmed, but we need to regenerate your packet. Try again or contact support." />}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/expungement-ai/packet-ready?briefcaseItemId=${briefcaseItemId ?? ""}&session_id=${checkoutSessionId ?? ""}`}><LocalizedText k="packet.try_again" fallback="Try again" /></Link>
                <Link className="inline-flex min-h-11 items-center rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase"><LocalizedText k="briefcase.open" fallback="Open Briefcase" /></Link>
                <Link className="inline-flex min-h-11 items-center rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href={`/expungement-ai/support?briefcaseItemId=${briefcaseItemId ?? ""}`}><LocalizedText k="briefcase.contact_support" fallback="Contact support" /></Link>
              </div>
            </>
          ) : paid && packet?.packetStatus === "generating" ? (
            <>
              <p className="text-xs font-bold uppercase text-[#00A99D]"><LocalizedText k="packet.generating" fallback="Generating packet" /></p>
              <h1 className="mt-3 text-4xl font-extrabold"><LocalizedText k="packet.preparing" fallback="Preparing your packet" /></h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]"><LocalizedText k="packet.generating_body" fallback="Payment is confirmed. Your packet is generating and will appear here when ready." /></p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href={`/expungement-ai/support?briefcaseItemId=${briefcaseItemId ?? ""}`}><LocalizedText k="briefcase.contact_support" fallback="Contact support" /></Link>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase text-[#E0A93B]"><LocalizedText k="packet.payment_confirmation_required" fallback="Payment confirmation required" /></p>
              <h1 className="mt-3 text-4xl font-extrabold"><LocalizedText k="packet.not_ready" fallback="Packet is not ready yet" /></h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]"><LocalizedText k="packet.return_checkout" fallback={'Return to checkout from your packet-ready Briefcase result. This page only shows "Your packet is ready" after payment confirmation or explicit dry-run confirmation.'} /></p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase"><LocalizedText k="briefcase.open" fallback="Open Briefcase" /></Link>
            </>
          )}
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function queryString(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const item = value(input);
    if (item) search.set(key, item);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
