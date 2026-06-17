import Link from "next/link";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";

export default function PricingPage() {
  return (
    <ConsumerPageShell wilmaContext="pricing">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-32 md:px-8">
        <p className="text-xs font-bold uppercase text-[#00A99D]">Pricing</p>
        <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">$50 when a packet is available</h1>
        <div className="mt-8 rounded-md border border-[#ECEFF4] bg-white p-6">
          <p className="text-5xl font-black">$50</p>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">One-time self-help packet payment. Guidance-only and other non-packet results do not show a pay gate.</p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/check">Check my path</Link>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
