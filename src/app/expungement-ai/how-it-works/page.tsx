import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";

export default function HowItWorksPage() {
  return (
    <ConsumerPageShell wilmaContext="landing">
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-32 md:px-8">
        <p className="text-xs font-bold uppercase text-[#00A99D]">How it works</p>
        <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">Three steps. No legal maze.</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["See which paths may be available", "Answer plain-English questions about your state, case, and outcome. No account or payment is required to begin."],
            ["Review before you pay", "If a supported self-help packet is available, review the information for your case before deciding whether to pay $50."],
            ["File it yourself with clear steps", "Download the available documents and filing instructions, then use your free Briefcase to track what comes next."]
          ].map(([title, body]) => (
            <article key={title} className="rounded-md border border-[#ECEFF4] bg-white p-5">
              <CheckCircle2 className="h-5 w-5 text-[#00A99D]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5A6275]">{body}</p>
            </article>
          ))}
        </div>
        <Link className="mt-8 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/start">Start free</Link>
      </section>
    </ConsumerPageShell>
  );
}
