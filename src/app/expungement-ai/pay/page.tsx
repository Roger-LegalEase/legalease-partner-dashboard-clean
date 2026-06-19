import { CheckCircle2, Lock } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerCheckoutButton } from "@/app/expungement-ai/pay/ConsumerCheckoutButton";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { assertCheckoutAllowed, consumerPacketPriceCents } from "@/lib/expungement-ai/payment-adapter";

export default async function PayPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireConsumerBriefcaseSession();
  const params = (await searchParams) ?? {};
  const briefcaseItemId = value(params.briefcaseItemId);
  const item = briefcaseItemId ? await getBriefcaseItem(auth.userId, briefcaseItemId) : null;
  const checkoutAllowed = Boolean(item);

  if (item) {
    try {
      assertCheckoutAllowed(item);
    } catch {
      return (
        <ConsumerPageShell wilmaContext="pay">
          <section className="mx-auto flex min-h-screen max-w-3xl items-center px-4 pb-16 pt-28 font-sans md:px-8">
            <div className="w-full rounded-[24px] border border-[#ECEFF4] bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">Payment unavailable</p>
              <h1 className="mt-3 text-[32px] font-extrabold leading-tight text-[#0B1320]">This result does not include a paid packet.</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">The engine did not return a payment-allowed packet path for this Briefcase item. Your result stays saved.</p>
            </div>
          </section>
        </ConsumerPageShell>
      );
    }
  }

  return (
    <ConsumerPageShell wilmaContext="pay">
      <section className="mx-auto flex min-h-screen max-w-3xl items-center px-4 pb-16 pt-28 font-sans md:px-8">
        <div className="w-full rounded-[24px] border border-[#ECEFF4] bg-white p-6 shadow-sm md:p-8" data-consumer-payment-adapter="isolated">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">Step 2 of 2</p>
          <h1 className="mt-3 text-[32px] font-extrabold leading-tight text-[#0B1320]">Generate your record-clearing packet.</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">Based on the saved result, checkout can continue only for packet-ready Briefcase items.</p>

          <div className="mt-6 rounded-2xl bg-[#F7F3EC] p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[52px] font-extrabold leading-none text-[#0B1320]">${consumerPacketPriceCents / 100}</p>
                <p className="mt-1 text-xs font-bold text-[#5A6275]">one-time</p>
              </div>
              <p className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#0B1320]">{item?.state ?? "Saved matter"}</p>
            </div>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-[#0B1320]">
              {[
                "Your state-specific self-help packet, filled from your answers",
                "Step-by-step filing instructions for your court",
                "Filing checklist for signatures, copies, service, and filing",
                "Clerk filing guidance and fee-waiver notes where available"
              ].map((entry) => (
                <li key={entry} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00A99D]" aria-hidden />
                  {entry}
                </li>
              ))}
            </ul>
          </div>

          {checkoutAllowed && item && briefcaseItemId ? (
            <ConsumerCheckoutButton briefcaseItemId={briefcaseItemId} />
          ) : (
            <p className="mt-6 rounded-xl bg-[#FBFCFE] p-4 text-sm font-semibold text-[#5A6275]">
              Open this page from a packet-ready Briefcase result to start checkout.
            </p>
          )}

          <p className="mt-5 flex gap-2 text-xs leading-5 text-[#5A6275]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            You are paying for packet preparation and filing instructions. Court approval is not promised. Expungement.ai is not a law firm and does not provide legal advice.
          </p>
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}
