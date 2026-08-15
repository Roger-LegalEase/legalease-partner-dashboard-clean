import Link from "next/link";
import { Briefcase, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { FlowButton } from "@/components/expungement-ai/ConsumerFlowCard";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";

export default function StartPage() {
  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="app">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 pb-16 pt-28 font-sans md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D] shadow-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <LocalizedText k="start.eyebrow" fallback="Free guided check" />
          </span>
          <h1 className="mt-5 text-[42px] font-extrabold leading-[1.04] text-[#0B1320] md:text-[64px]">
            <LocalizedText k="start.heading" fallback="Start with what happened. See what may be available." />
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-[#5A6275]">
            <LocalizedText
              k="start.body"
              fallback="Answer plain-English questions about your state, case, and outcome. No account or payment is required to begin. If a supported self-help packet is available, review your information before paying $50 to generate it."
            />
          </p>
          <div className="mx-auto mt-7 max-w-sm">
            <FlowButton href="/expungement-ai/screening"><LocalizedText k="nav.start_free" fallback="Start free" /></FlowButton>
          </div>
          <p className="mt-3 text-[13px] font-semibold">
            <Link className="text-[#0E9C8E] underline underline-offset-4" href="/briefcase">
              <LocalizedText k="start.resume" fallback="Already started? Open Briefcase" />
            </Link>
          </p>
          <p className="mt-4 text-[12.5px] leading-6 text-[#8A93A6]">
            <LocalizedText
              k="start.boundary"
              fallback="No account to begin. No payment to start. Self-help information, not legal advice."
            />
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StartCard
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title={<LocalizedText k="start.card_check_title" fallback="Free guided check" />}
            body={<LocalizedText k="start.card_check_body" fallback="Answer questions that reflect the record-clearing rules in the state you choose." />}
          />
          <StartCard
            icon={<Briefcase className="h-5 w-5" aria-hidden="true" />}
            title={<LocalizedText k="start.card_briefcase_title" fallback="Your free Briefcase" />}
            body={<LocalizedText k="start.card_briefcase_body" fallback="Create an account when you want to save cases, available documents, receipts, and next steps." />}
          />
          <StartCard
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            title={<LocalizedText k="start.card_packet_title" fallback="Supported self-help packets" />}
            body={<LocalizedText k="start.card_packet_body" fallback="When one is available, review your information before paying $50 for documents and filing steps you use yourself." />}
          />
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function StartCard({ icon, title, body }: { icon: ReactNode; title: ReactNode; body: ReactNode }) {
  return (
    <article className="rounded-[20px] border border-[#ECEFF4] bg-white p-5 shadow-sm">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">{icon}</div>
      <h2 className="mt-4 text-base font-extrabold text-[#0B1320]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5A6275]">{body}</p>
    </article>
  );
}
