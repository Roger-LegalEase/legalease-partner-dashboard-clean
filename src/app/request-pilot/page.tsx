import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { RequestPilotForm } from "./RequestPilotForm";

export const metadata: Metadata = {
  title: "Request a Partner Program Pilot | LegalEase",
  description:
    "Start a LegalEase Partner Program pilot conversation for civic, workforce, reentry, clinic, funder, and record-clearing organizations."
};

export default function RequestPilotPage() {
  return (
    <main className="min-h-screen bg-[#fbf6ee] text-[#102033]">
      <header className="border-b border-[#e3d8c8] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/partners" className="flex items-center gap-3" aria-label="LegalEase Partner Program">
            <Image
              src="/assets/partner-program/brand/legalease-logo.png"
              alt="LegalEase"
              width={1920}
              height={1080}
              className="h-9 w-auto"
            />
            <span className="hidden border-l border-[#d6c7b5] pl-3 text-xs font-black uppercase tracking-wide text-[#526173] sm:inline">
              Partner Program
            </span>
          </Link>
          <Link href="/partners" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Program overview
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">Pilot conversations now open</p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl font-black leading-[0.97] tracking-normal text-[#102d4a] md:text-7xl">
            Request a Partner Program pilot
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-[#526173]">
            LegalEase is opening pilot conversations with civic, workforce, reentry, clinic, funder, and record-clearing
            partners that want to launch guided workflows, document automation, partner dashboards, and impact reporting.
          </p>

          <div className="mt-6 overflow-hidden rounded-md border border-[#e0d4c4] bg-white p-4 shadow-sm">
            <Image
              src="/assets/partner-program/partners/friendly_consultation_with_a_roadmap_of_guidance.png"
              alt="Illustration of a guided partner consultation"
              width={1400}
              height={1400}
              className="aspect-[4/3] w-full rounded-md object-cover"
            />
            <div className="mt-5 grid gap-3">
              <InfoRow
                icon={Sparkles}
                title="What we will review"
                body="Your audience, geography, partner capacity, record-clearing support goals, and the guided workflow that may fit."
              />
              <InfoRow
                icon={ShieldCheck}
                title="Program boundaries"
                body="LegalEase supports general legal information, possible eligibility workflows, document automation, and reporting. It does not promise legal outcomes."
              />
            </div>
          </div>
        </div>

        <RequestPilotForm />
      </section>
    </main>
  );
}

function InfoRow({
  icon: Icon,
  title,
  body
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-[#e0d4c4] bg-[#fbf6ee] p-4">
      <Icon className="h-5 w-5 text-[#0f7f80]" aria-hidden="true" />
      <h2 className="mt-3 text-base font-black text-[#102d4a]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#526173]">{body}</p>
    </div>
  );
}
