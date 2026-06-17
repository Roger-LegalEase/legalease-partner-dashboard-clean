import Link from "next/link";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { createConsumerPaymentPlaceholder } from "@/lib/expungement-ai/payment-adapter";
import { runExpungementAiEligibilityCheck } from "@/lib/expungement-ai/eligibility-adapter";

export default function PayPage() {
  const result = runExpungementAiEligibilityCheck({
    state: "PA",
    pathType: "packet",
    hasRequiredFacts: true,
    timing: "eligible_window",
    packetAvailable: true
  });
  const payment = createConsumerPaymentPlaceholder(result);

  return (
    <ConsumerPageShell wilmaContext="pay">
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6" data-consumer-payment-adapter="isolated">
          <p className="text-xs font-bold uppercase text-[#00A99D]">Consumer payment adapter</p>
          <h1 className="mt-3 text-4xl font-extrabold">$50 one-time payment</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">{payment.label}. This payment adapter is isolated from existing Stripe live-mode behavior.</p>
          {payment.enabled ? (
            <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/packet-ready">Continue to packet</Link>
          ) : (
            <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#0B1320] px-5 text-sm font-bold text-white" href="/expungement-ai/results">Back to results</Link>
          )}
        </div>
      </section>
    </ConsumerPageShell>
  );
}
