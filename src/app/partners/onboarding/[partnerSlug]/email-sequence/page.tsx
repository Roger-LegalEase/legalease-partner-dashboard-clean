import Link from "next/link";
import { Mail, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { canAccessOnboarding, getPartnerBySlug } from "@/lib/partners/partner-service";
import { partnerCheckout, partnerOnboarding } from "@/lib/partners/routes";
import { partnerComplianceCopy } from "@/lib/partners/types";

const emails = [
  {
    subject: "Welcome to your LegalEase Record-Clearing Access Program",
    audience: "Partner implementation stakeholders",
    purpose: "Introduce the 90-day implementation model and confirm next steps.",
    body: "Your Record-Clearing Access Program is moving into setup. LegalEase will coordinate the co-branded access page, Wilma intake, routing, launch resources, dashboard activation, and reporting schedule with your team."
  },
  {
    subject: "Launch prep: access page, intake, and staff talking points",
    audience: "Partner launch and communications leads",
    purpose: "Prepare partner teams for community launch.",
    body: "Before launch, review the access page, staff talking points, intake expectations, and escalation boundaries. Please confirm partner-approved scope and any jurisdiction-specific considerations."
  },
  {
    subject: "Your record-clearing intake is live",
    audience: "Partner staff and outreach teams",
    purpose: "Announce that the community intake link is ready to share.",
    body: "The LegalEase intake path is live for your community. Participants can begin with Wilma and receive routing support based on their location, record-clearing need, user-provided facts, and program scope."
  },
  {
    subject: "Week 1 progress: early intake and routing signals",
    audience: "Partner implementation stakeholders",
    purpose: "Share initial program activity after launch.",
    body: "LegalEase is monitoring intake starts, routing signals, support needs, and early bottlenecks. Your team will receive a structured weekly report once the reporting window closes."
  },
  {
    subject: "Weekly report ready for review",
    audience: "Partner program owners",
    purpose: "Notify the partner that weekly implementation reporting is available.",
    body: "Your weekly implementation report is ready. It summarizes participant activity, record-clearing needs, routing status, drop-off points, and operational recommendations for the next week."
  },
  {
    subject: "Final impact report: 90-day implementation summary",
    audience: "Partner executives and program owners",
    purpose: "Preview the final reporting handoff.",
    body: "At the end of the 90-day implementation window, LegalEase will prepare a final impact report covering participation, support activity, outcome signals, implementation learnings, and recommended next steps."
  }
];

export default async function EmailSequencePage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { partnerSlug } = await params;
  const partner = getPartnerBySlug(partnerSlug);

  if (!partner) {
    return <PartnerNotFound />;
  }

  const paid = canAccessOnboarding(partner.partnerSlug, await searchParams);

  if (!paid) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <LockedState
          title="Email sequence locked"
          body="Complete the demo payment step to unlock the partner onboarding email sequence preview."
          href={partnerCheckout(partner.partnerId)}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Link href={partnerOnboarding(partner.partnerSlug, true)} className="text-sm font-semibold text-teal hover:text-navy">
          Back to onboarding hub
        </Link>

        <section className="mt-6">
          <Badge tone="teal">Email Sequence</Badge>
          <h1 className="mt-4 text-4xl font-black leading-tight text-navy">{partner.partnerName} onboarding email sequence</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
            Partner-facing preview of onboarding, launch, weekly reporting, and final impact report emails. This route
            does not send email or connect to a CRM.
          </p>
        </section>

        <section className="mt-8 grid gap-4">
          {emails.map((email) => (
            <Card key={email.subject} className="rounded-md p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Mail className="h-5 w-5 text-teal" aria-hidden="true" />
                  <h2 className="mt-3 text-xl font-black text-navy">{email.subject}</h2>
                </div>
                <Badge tone="blue">{email.audience}</Badge>
              </div>
              <p className="mt-4 text-sm font-bold text-navy">Purpose: {email.purpose}</p>
              <p className="mt-3 text-sm leading-6 text-grayWilma-700">{email.body}</p>
            </Card>
          ))}
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 text-xs leading-5 text-grayWilma-600 shadow-sm">
          {partnerComplianceCopy}
        </section>
      </div>
    </main>
  );
}

function PartnerNotFound() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <h1 className="text-3xl font-black text-navy">Partner not found</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            This email sequence link does not match a seeded LegalEase partner record.
          </p>
          <Link
            href="/partners"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            Back to Partner Program
          </Link>
        </Card>
      </div>
    </main>
  );
}

function LockedState({ title, body, href }: { title: string; body: string; href: string }) {
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
          Return to Demo Checkout
        </Link>
      </Card>
    </div>
  );
}
