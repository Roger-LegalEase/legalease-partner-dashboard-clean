import Link from "next/link";
import { CheckCircle2, CircleDashed, ExternalLink, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getMockPartner, isMockPaid } from "@/lib/partner-program-data";
import { ReportDownloadButton } from "./ReportDownloadButton";

const setupSections = [
  "Program setup checklist",
  "Co-branded page setup",
  "Wilma intake setup",
  "RecordShield access setup",
  "Expungement.ai routing setup",
  "Dashboard activation",
  "Launch kit",
  "Weekly reporting schedule",
  "Final impact report"
];

export default async function PartnerOnboardingPage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { partnerSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const partner = getMockPartner(partnerSlug);
  const paid = isMockPaid(resolvedSearchParams);

  if (!paid) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <LockedState
          title="Onboarding hub locked"
          body="Complete the demo payment step to activate the Record-Clearing Access Program onboarding hub."
          href={`/partners/checkout/${partner.id}`}
          label="Return to Demo Checkout"
        />
      </main>
    );
  }

  const statuses = [
    ["Payment", partner.activationStatuses.payment],
    ["Partner Profile", partner.activationStatuses.partnerProfile],
    ["Co-Branded Page", partner.activationStatuses.coBrandedPage],
    ["Dashboard", partner.activationStatuses.dashboard],
    ["Launch Kit", partner.activationStatuses.launchKit],
    ["Reports", partner.activationStatuses.reports]
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Badge tone="teal">Paid onboarding</Badge>
        <section className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-navy">Welcome to the Record-Clearing Access Program.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
              {partner.name} is now in setup for co-branded access, Wilma intake, RecordShield support,
              Expungement.ai routing, dashboard activation, launch materials, and implementation reporting.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Activation status</p>
            <div className="mt-4 grid gap-2">
              {statuses.map(([label, status]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-[#f7f8f6] px-3 py-2">
                  <span className="text-sm font-semibold text-grayWilma-700">{label}</span>
                  <Badge tone={status === "Complete" ? "teal" : "blue"}>{status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {setupSections.map((section, index) => (
            <Card key={section} className="rounded-md p-5">
              {index === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-teal" aria-hidden="true" />
              ) : (
                <CircleDashed className="h-5 w-5 text-wilmaBlue" aria-hidden="true" />
              )}
              <h2 className="mt-3 text-lg font-black text-navy">{section}</h2>
              <p className="mt-2 text-sm leading-6 text-grayWilma-700">
                Implementation workspace prepared for partner review and LegalEase setup coordination.
              </p>
            </Card>
          ))}
        </section>

        <section className="mt-8 grid gap-3 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-4">
          <ActionLink href={`/p/${partner.slug}?paid=true`} label="View co-branded page" />
          <ActionLink href="/dashboard/partners" label="View dashboard" />
          <ReportDownloadButton
            endpoint="/api/partner-reports/weekly"
            filename="legalease-weekly-report.pdf"
            label="Generate weekly report"
            partnerId={partner.id}
            partnerName={partner.name}
          />
          <ReportDownloadButton
            endpoint="/api/partner-reports/final"
            filename="legalease-final-impact-report.pdf"
            label="Generate final report"
            partnerId={partner.id}
            partnerName={partner.name}
          />
        </section>
      </div>
    </main>
  );
}

function LockedState({
  title,
  body,
  href,
  label
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
      <Card className="w-full rounded-md p-6 text-center">
        <LockKeyhole className="mx-auto h-10 w-10 text-orange" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-black text-navy">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-grayWilma-700">{body}</p>
        <Link
          href={href}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
        >
          {label}
        </Link>
      </Card>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-4 py-2 text-sm font-semibold text-navy transition hover:border-teal hover:bg-teal/10"
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
