import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck, FileText, LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { programComponents, programTiers } from "@/lib/partner-program-data";

const audiences = [
  "Public agencies expanding Clean Slate awareness and record-clearing access",
  "Nonprofits and legal aid networks coordinating intake and referral operations",
  "Workforce, reentry, housing, and education partners supporting justice-impacted communities"
];

const implementationSteps = [
  "Align partner goals, geography, participant volume, and record-clearing needs.",
  "Configure Wilma intake, RecordShield access, Expungement.ai routing, and partner reporting.",
  "Launch the co-branded access page and monitor implementation through weekly reports.",
  "Deliver a final impact report with participation, routing, support, and outcome signals."
];

const componentIcons = [Building2, ClipboardCheck, ShieldCheck, Route, LockKeyhole, FileText];

export default function PartnersLandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <section className="border-b border-grayWilma-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <Badge tone="teal">LegalEase Record-Clearing Access Program</Badge>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-normal text-navy md:text-6xl">
              A 90-day implementation program for record-clearing access.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-grayWilma-700">
              LegalEase helps partners reach, screen, route, and support people seeking expungement, sealing,
              record restriction, or Clean Slate relief, with the implementation reporting to prove it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/partners/start"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
              >
                Start Partner Request
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#components"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-5 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100"
              >
                View Program Components
              </Link>
            </div>
          </div>

          <Card className="rounded-md p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-teal">Built for implementation</p>
            <div className="mt-5 grid gap-4">
              {[
                ["Program window", "90 days"],
                ["Operating model", "Intake, routing, dashboard, reporting"],
                ["Support layer", "Court-ready support and partner review paths"],
                ["Proof points", "Weekly reports and final impact report"]
              ].map(([label, value]) => (
                <div key={label} className="border-l-4 border-teal bg-[#f7f8f6] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-grayWilma-600">{label}</p>
                  <p className="mt-1 text-base font-black text-navy">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 md:px-6">
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Badge tone="blue">Who it is for</Badge>
            <h2 className="mt-3 text-3xl font-black text-navy">Partner-facing infrastructure for justice access.</h2>
          </div>
          <div className="grid gap-3">
            {audiences.map((audience) => (
              <div key={audience} className="rounded-md border border-grayWilma-200 bg-white p-4 text-sm font-semibold text-grayWilma-800 shadow-sm">
                {audience}
              </div>
            ))}
          </div>
        </section>

        <section id="components" className="space-y-5">
          <div className="max-w-3xl">
            <Badge tone="teal">Six components</Badge>
            <h2 className="mt-3 text-3xl font-black text-navy">The operating layer partners need to launch.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {programComponents.map((component, index) => {
              const Icon = componentIcons[index];
              return (
                <Card key={component.name} className="rounded-md p-5">
                  <Icon className="h-6 w-6 text-teal" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-black text-navy">{component.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-grayWilma-700">{component.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-md p-6">
            <Badge tone="orange">90-day model</Badge>
            <h2 className="mt-3 text-3xl font-black text-navy">A structured implementation path, not a loose referral page.</h2>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              LegalEase pairs record-clearing intake, routing, partner dashboard activation, implementation reporting,
              and court-ready support workflows into one enterprise-ready access program.
            </p>
          </Card>
          <div className="grid gap-3">
            {implementationSteps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-md border border-grayWilma-200 bg-white p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal/10 text-sm font-black text-teal">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-grayWilma-800">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl">
            <Badge tone="blue">Program tiers</Badge>
            <h2 className="mt-3 text-3xl font-black text-navy">Scaled by scope, volume, and implementation complexity.</h2>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Tiers frame the expected implementation range without turning justice access into a generic SaaS pricing table.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {programTiers.map((tier) => (
              <Card key={tier.id} className="rounded-md p-5">
                <h3 className="text-xl font-black text-navy">{tier.name}</h3>
                <p className="mt-2 text-sm font-bold text-teal">{tier.investmentRange}</p>
                <p className="mt-1 text-sm font-semibold text-grayWilma-700">{tier.userVolume}</p>
                <p className="mt-4 text-sm leading-6 text-grayWilma-700">{tier.bestFor}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-grayWilma-200 bg-white p-5 text-xs leading-5 text-grayWilma-600 shadow-sm">
          LegalEase does not provide legal advice. Eligibility screening, routing, and document support depend on
          jurisdiction, user-provided facts, and applicable program scope. Final filing decisions may require court,
          agency, attorney, or partner review.
        </section>
      </div>
    </main>
  );
}
