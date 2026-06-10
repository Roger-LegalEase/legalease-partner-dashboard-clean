import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Request a Partner Program Pilot | LegalEase",
  description:
    "Start a LegalEase Partner Program pilot conversation for civic, workforce, reentry, clinic, funder, and record-clearing organizations."
};

const mailtoHref = "mailto:roger@pushcm.com?subject=LegalEase%20Partner%20Program%20Pilot%20Request";

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

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-[1fr_0.9fr] lg:py-20">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c84f2b]">Pilot conversations now open</p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl font-black leading-[0.97] tracking-normal text-[#102d4a] md:text-7xl">
            Request a Partner Program pilot
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-[#526173]">
            LegalEase is opening pilot conversations with civic, workforce, reentry, clinic, funder, and
            record-clearing partners that want to launch guided workflows, document automation, partner dashboards,
            and impact reporting.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#526173]">
            A full pilot request form is coming soon. For now, email us with your organization, geography, audience,
            and the record-clearing support workflow you want to explore.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={mailtoHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#d96c3b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c84f2b]"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email about a pilot
            </a>
            <Link
              href="/partners#programs"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#d8c9b7] bg-white px-5 py-3 text-sm font-black text-[#102d4a] transition hover:bg-[#f4eadc]"
            >
              Review campaign models
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-[#e0d4c4] bg-white p-5 shadow-sm">
          <Image
            src="/assets/partner-program/partners/friendly_consultation_with_a_roadmap_of_guidance.png"
            alt="Illustration of a guided partner consultation"
            width={1400}
            height={1400}
            className="aspect-square w-full rounded-md object-cover"
          />
          <div className="mt-5 grid gap-3">
            <InfoRow
              icon={Sparkles}
              title="What to include"
              body="Organization name, role, state or jurisdiction, community served, estimated pilot audience, and the workflow you want to explore."
            />
            <InfoRow
              icon={ShieldCheck}
              title="Program boundaries"
              body="LegalEase supports general legal information, possible eligibility workflows, document automation, and reporting. It does not promise legal outcomes."
            />
          </div>
        </aside>
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
