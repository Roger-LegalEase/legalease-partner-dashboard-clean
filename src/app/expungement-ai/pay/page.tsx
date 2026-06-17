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
          <section className="mx-auto max-w-3xl px-4 pb-16 pt-32 md:px-8">
            <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
              <p className="text-xs font-bold uppercase text-[#00A99D]">Consumer payment adapter</p>
              <h1 className="mt-3 text-4xl font-extrabold">Payment is not available</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">This Briefcase item is not packet-ready, so the $50 checkout is blocked.</p>
            </div>
          </section>
        </ConsumerPageShell>
      );
    }
  }

  return (
    <ConsumerPageShell wilmaContext="pay">
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6" data-consumer-payment-adapter="isolated">
          <p className="text-xs font-bold uppercase text-[#00A99D]">Consumer payment adapter</p>
          <h1 className="mt-3 text-4xl font-extrabold">$50 one-time payment</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">
            Checkout is isolated to Expungement.ai consumer packets and does not touch partner invoice billing. Amount: ${consumerPacketPriceCents / 100}.
          </p>
          {checkoutAllowed && item && briefcaseItemId ? (
            <ConsumerCheckoutButton briefcaseItemId={briefcaseItemId} />
          ) : (
            <p className="mt-6 rounded-md bg-[#F7F3EC] p-4 text-sm font-semibold text-[#5A6275]">
              Open this page from a packet-ready Briefcase result to start checkout.
            </p>
          )}
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}
