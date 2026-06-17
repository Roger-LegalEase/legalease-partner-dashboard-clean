import Link from "next/link";
import { Download, ListChecks, MessageCircle, Save } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem, saveGeneratedPacketToBriefcase } from "@/lib/expungement-ai/briefcase";
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
  const packet = confirmed?.resultCode ? saveGeneratedPacketToBriefcase({
    resultCode: confirmed.resultCode,
    userLabel: confirmed.summary,
    state: confirmed.state,
    pathwayLabel: confirmed.pathwayLabel,
    confidence: "high",
    paymentAllowed: false,
    packetType: confirmed.packetType,
    reasons: ["Payment confirmation completed."],
    nextSteps: confirmed.nextSteps,
    emailCaptureRecommended: false,
    disclaimer: "Expungement.ai is self-help software, not a law firm. Court approval is not guaranteed. Review all documents before filing."
  }, auth.userId) : null;

  return (
    <ConsumerPageShell wilmaContext="packet-ready">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          {paid ? (
            <>
              <p className="text-xs font-bold uppercase text-[#00A99D]">Payment confirmed {checkoutStatus.mode === "dry_run" ? "(dry-run)" : ""}</p>
              <h1 className="mt-3 text-4xl font-extrabold">Your packet is ready</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">Payment status saved to Briefcase item {packet?.id ?? briefcaseItemId}.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/briefcase/documents"><Download className="h-4 w-4" aria-hidden="true" /> Download packet</Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase"><ListChecks className="h-4 w-4" aria-hidden="true" /> View filing checklist</Link>
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" href="/briefcase/documents"><Save className="h-4 w-4" aria-hidden="true" /> Save to Briefcase</Link>
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] px-5 text-sm font-bold" type="button"><MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask Wilma about next steps</button>
              </div>
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
