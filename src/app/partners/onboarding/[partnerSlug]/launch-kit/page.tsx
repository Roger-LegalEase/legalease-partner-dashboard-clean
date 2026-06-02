import Link from "next/link";
import { Copy, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { canAccessOnboarding, getPaymentGateMessage, getPartnerBySlug } from "@/lib/partners/partner-service";
import {
  partnerComplianceCopy
} from "@/lib/partners/types";
import { partnerCheckout, partnerOnboarding, partnerPublicPage } from "@/lib/partners/routes";

const launchSections = [
  {
    title: "Partner announcement copy",
    body: "We are partnering with LegalEase to expand record-clearing access for community members seeking expungement, sealing, record restriction, or Clean Slate support. The 90-day Record-Clearing Access Program helps participants begin intake, understand available routing paths, and receive structured preparation support under approved program scope."
  },
  {
    title: "Email copy for partner list",
    body: "Our LegalEase Record-Clearing Access Program is now available. Community members can begin guided intake with Wilma, share record-clearing goals, and receive routing support based on jurisdiction, user-provided facts, and program scope."
  },
  {
    title: "Social post copy",
    body: "Record-clearing access is live through our LegalEase partnership. Start with guided intake and learn what support may be available for expungement, sealing, record restriction, or Clean Slate relief."
  },
  {
    title: "Staff talking points",
    body: "This program helps people begin record-clearing intake, does not provide legal advice, and does not guarantee outcomes. Staff should direct participants to the intake link and avoid making eligibility or filing promises."
  }
];

export default async function LaunchKitPage({
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
    const gateMessage = getPaymentGateMessage(partner);

    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <LockedState
          title="Launch kit locked"
          body={gateMessage.body}
          href={partnerCheckout(partner.partnerId)}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Link href={partnerOnboarding(partner.partnerSlug)} className="text-sm font-semibold text-teal hover:text-navy">
          Back to onboarding hub
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Badge tone="teal">Launch Kit</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy">{partner.partnerName} launch kit preview</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Partner-facing launch materials for the LegalEase Record-Clearing Access Program. This page previews copy
              only and does not send emails or publish content.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Reporting schedule</p>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Weekly implementation reports begin after launch week closes. Final impact reporting is prepared at the
              end of the 90-day implementation window.
            </p>
            <p className="mt-4 text-sm font-semibold text-grayWilma-800">Target launch: {partner.launchDateTarget}</p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {launchSections.map((section) => (
            <CopyCard key={section.title} title={section.title} body={section.body} />
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-md p-6">
            <h2 className="text-2xl font-black text-navy">Intake link</h2>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Share this access page when the partner launch is approved:
            </p>
            <Link
              href={partnerPublicPage(partner.partnerSlug)}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
            >
              Open partner access page
            </Link>
          </Card>

          <Card className="rounded-md p-6">
            <h2 className="text-2xl font-black text-navy">Compliance language</h2>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">{partnerComplianceCopy}</p>
          </Card>
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
            This launch kit link does not match a seeded LegalEase partner record.
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

function CopyCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="rounded-md p-5">
      <Copy className="h-5 w-5 text-teal" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-black text-navy">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-grayWilma-700">{body}</p>
    </Card>
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
          Go to checkout
        </Link>
      </Card>
    </div>
  );
}
