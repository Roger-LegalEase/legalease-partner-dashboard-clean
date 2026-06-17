import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";

export default function HowItWorksPage() {
  return (
    <ConsumerPageShell wilmaContext="landing">
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-32 md:px-8">
        <p className="text-xs font-bold uppercase text-[#00A99D]">How it works</p>
        <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">A consumer path on top of the RCAP engine</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Answer questions", "Choose any U.S. state or DC and enter the facts the engine needs."],
            ["Review the result", "The result saves to Briefcase whether it is packet-ready, guidance-only, or another outcome."],
            ["Generate if allowed", "If paymentAllowed is true for a packet-ready result, pay $50 once and generate instantly."]
          ].map(([title, body]) => (
            <article key={title} className="rounded-md border border-[#ECEFF4] bg-white p-5">
              <CheckCircle2 className="h-5 w-5 text-[#00A99D]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5A6275]">{body}</p>
            </article>
          ))}
        </div>
        <Link className="mt-8 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/check">Start a check</Link>
      </section>
    </ConsumerPageShell>
  );
}
