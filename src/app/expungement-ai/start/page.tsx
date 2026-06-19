import Link from "next/link";
import { Briefcase, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { FlowButton } from "@/components/expungement-ai/ConsumerFlowCard";

export default function StartPage() {
  return (
    <ConsumerPageShell wilmaContext="start">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 pb-16 pt-28 font-sans md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D] shadow-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Attorney-built record clearing
          </span>
          <h1 className="mt-5 text-[42px] font-extrabold leading-[1.04] text-[#0B1320] md:text-[64px]">Check for a possible record-clearing path.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-[#5A6275]">
            Answer a few plain questions for free. Your answers and result save privately to Briefcase. You only see payment when the engine returns a packet-ready path.
          </p>
          <div className="mx-auto mt-7 max-w-sm">
            <FlowButton href="/expungement-ai/check">Start free &rarr;</FlowButton>
          </div>
          <p className="mt-3 text-[13px] font-semibold">
            <Link className="text-[#0E9C8E] underline underline-offset-4" href="/expungement-ai/screening">
              Or try the new guided all-51 check
            </Link>
          </p>
          <p className="mt-4 text-[12.5px] leading-6 text-[#8A93A6]">Takes about 3 minutes. No card to check. This is legal information, not legal advice.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StartCard icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} title="State-specific check" body="The live engine reviews the answers for the state you choose." />
          <StartCard icon={<Briefcase className="h-5 w-5" aria-hidden="true" />} title="Your Briefcase" body="Answers, results, packets, receipts, and reminders stay in one private place." />
          <StartCard icon={<FileText className="h-5 w-5" aria-hidden="true" />} title="Self-help packets" body="When available, we prepare documents and filing steps for you to review and file yourself." />
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function StartCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-[20px] border border-[#ECEFF4] bg-white p-5 shadow-sm">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">{icon}</div>
      <h2 className="mt-4 text-base font-extrabold text-[#0B1320]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5A6275]">{body}</p>
    </article>
  );
}
