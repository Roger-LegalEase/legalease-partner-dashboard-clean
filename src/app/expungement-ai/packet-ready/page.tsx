import Link from "next/link";
import { Download, ListChecks, MessageCircle, Save } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { ConsumerPacketGenerationError, generatePaidConsumerPacket, getConsumerPacketStatus } from "@/lib/expungement-ai/packet-generation";
import { getConsumerCheckoutStatus, recordConsumerPaymentConfirmation } from "@/lib/expungement-ai/payment-adapter";

export default async function PacketReadyPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireConsumerBriefcaseSession();
  const params = (await searchParams) ?? {};
  const briefcaseItemId = value(params.briefcaseItemId);
  const checkoutSessionId = value(params.session_id);
  const item = briefcaseItemId ? await getBriefcaseItem(auth.userId, briefcaseItemId) : null;
  const checkoutStatus = item && checkoutSessionId ? await getConsumerCheckoutStatus({ item, checkoutSessionId }) : null;
  const paid = checkoutStatus?.paid === true;
  const confirmed = item && checkoutStatus ? await recordConsumerPaymentConfirmation({ userId: auth.userId, item, status: checkoutStatus }) : null;
  let packet = confirmed ? await getConsumerPacketStatus({ userId: auth.userId, briefcaseItemId: confirmed.id }) : null;
  let generationFailed = false;

  if (paid && confirmed && packet?.packetStatus !== "ready") {
    try {
      packet = await generatePaidConsumerPacket({
        userId: auth.userId,
        briefcaseItemId: confirmed.id,
        dryRunMode: checkoutStatus?.mode === "dry_run"
      });
    } catch (error) {
      generationFailed = error instanceof ConsumerPacketGenerationError;
      packet = await getConsumerPacketStatus({ userId: auth.userId, briefcaseItemId: confirmed.id });
    }
  }

  const packetReady = packet?.packetStatus === "ready" && Boolean(packet.artifactRefs);
  const checkoutMode = checkoutStatus?.mode;

  return (
    <ConsumerPageShell wilmaContext="packet-ready">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          {packetReady && confirmed && packet?.artifactRefs ? (
            <>
              <p className="text-xs font-bold uppercase text-[#00A99D]">Payment confirmed {checkoutMode === "dry_run" ? "(dry-run)" : ""}</p>
              <h1 className="mt-3 text-4xl font-extrabold">Your packet is ready</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">Payment status and packet artifact are saved to Briefcase item {confirmed.id}.</p>
              <div className="mt-5 rounded-md bg-[#F7F3EC] p-4 text-sm leading-6 text-[#5A6275]">
                <p className="font-bold text-[#0B1320]">{packet.artifactRefs.fileName}</p>
                <p>Jurisdiction: {confirmed.state}</p>
                <p>Pathway: {confirmed.pathwayLabel ?? confirmed.resultCode}</p>
                <p>Generated: {new Date(packet.artifactRefs.generatedAt).toLocaleString()}</p>
                {confirmed.receiptUrl ? <p>Receipt: {confirmed.receiptUrl}</p> : null}
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href={packet.artifactRefs.downloadPath}><Download className="h-4 w-4" aria-hidden="true" /> Download packet</Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase"><ListChecks className="h-4 w-4" aria-hidden="true" /> View filing checklist</Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase/documents"><Save className="h-4 w-4" aria-hidden="true" /> Save to Briefcase</Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(confirmed.id)}`}><MessageCircle className="h-4 w-4" aria-hidden="true" /> Technical support</Link>
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" type="button"><MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma about next steps</button>
              </div>
              <div className="mt-6">
                <h2 className="text-lg font-extrabold">Filing checklist</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5A6275]">
                  {confirmed.nextSteps.map((step) => <li key={step}>{step}</li>)}
                </ul>
              </div>
            </>
          ) : paid && generationFailed ? (
            <>
              <p className="text-xs font-bold uppercase text-[#E0A93B]">Packet regeneration needed</p>
              <h1 className="mt-3 text-4xl font-extrabold">Packet is not ready yet</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">Your payment was confirmed, but we need to regenerate your packet. Try again or contact support.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/expungement-ai/packet-ready?briefcaseItemId=${briefcaseItemId ?? ""}&session_id=${checkoutSessionId ?? ""}`}>Try again</Link>
                <Link className="inline-flex min-h-11 items-center rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase">Open Briefcase</Link>
                <Link className="inline-flex min-h-11 items-center rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href={`/expungement-ai/support?briefcaseItemId=${briefcaseItemId ?? ""}`}>Contact support</Link>
              </div>
            </>
          ) : paid && packet?.packetStatus === "generating" ? (
            <>
              <p className="text-xs font-bold uppercase text-[#00A99D]">Generating packet</p>
              <h1 className="mt-3 text-4xl font-extrabold">Preparing your packet</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">Payment is confirmed. Your packet is generating and will appear here when ready.</p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href={`/expungement-ai/support?briefcaseItemId=${briefcaseItemId ?? ""}`}>Contact support</Link>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase text-[#E0A93B]">Payment confirmation required</p>
              <h1 className="mt-3 text-4xl font-extrabold">Packet is not ready yet</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">Return to checkout from your packet-ready Briefcase result. This page only shows “Your packet is ready” after payment confirmation or explicit dry-run confirmation.</p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase">Open Briefcase</Link>
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
