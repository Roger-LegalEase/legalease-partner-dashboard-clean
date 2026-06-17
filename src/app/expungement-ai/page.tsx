import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, ShieldCheck } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";

export default function ExpungementAiLandingPage() {
  return (
    <ConsumerPageShell wilmaContext="landing">
      <section className="relative min-h-[92vh] overflow-hidden pt-20">
        <Image
          src="/expungement-ai/hero-1500.webp"
          alt="Person reviewing record-clearing paperwork at a desk"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#0B1320]/70" />
        <div className="relative mx-auto flex min-h-[calc(92vh-80px)] max-w-7xl items-center px-4 py-16 md:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A99D]">Self-help record clearing</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">Expungement.ai</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">Check your path, save every result to Briefcase, and generate a self-help packet when the RCAP engine says a paid packet is available.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-extrabold text-white" href="/expungement-ai/start">
                Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/25 px-5 text-sm font-extrabold text-white" href="/expungement-ai/how-it-works">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-3 md:px-8">
        {[
          ["Every check saves", "Your account includes Briefcase from the first screening answer."],
          ["Engine-led results", "The frontend renders the RCAP result object and does not decide eligibility."],
          ["$50 only when allowed", "The pay gate appears only for packet-ready engine outcomes."]
        ].map(([title, body]) => (
          <div key={title} className="rounded-md border border-[#ECEFF4] bg-white p-5">
            <ShieldCheck className="h-5 w-5 text-[#00A99D]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#5A6275]">{body}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
        <div className="flex flex-col gap-4 rounded-md bg-[#0B1320] p-6 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Your Briefcase is included</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">My Checks, My Packets, Filing Checklist, Reminders, Payment History, and Wilma Conversations stay available across the product.</p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#00A99D] px-5 text-sm font-extrabold text-white" href="/briefcase">
            <Briefcase className="h-4 w-4" aria-hidden="true" /> Open Briefcase
          </Link>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
