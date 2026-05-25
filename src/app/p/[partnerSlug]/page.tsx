import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ClipboardCheck, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getMockPartner, isMockPaid } from "@/lib/partner-program-data";

export default async function CoBrandedPartnerPage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { partnerSlug } = await params;
  const partner = getMockPartner(partnerSlug);
  const paid = isMockPaid(await searchParams);

  if (!paid) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
          <Card className="w-full rounded-md p-6 text-center">
            <LockKeyhole className="mx-auto h-10 w-10 text-orange" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-black text-navy">This partner access page has not been activated yet.</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              The co-branded Record-Clearing Access Program page is locked until the demo payment state is present.
            </p>
            <Link
              href={`/partners/checkout/${partner.id}`}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
            >
              Return to Demo Checkout
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <section className="border-b border-grayWilma-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <Badge tone="teal">Record-Clearing Access Program</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">
              In partnership with {partner.name}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-grayWilma-700">
              This access page helps community members begin record-clearing intake for expungement, sealing,
              record restriction, or Clean Slate support where available under program scope.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#intake"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
              >
                Start Intake with Wilma
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#expect"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-5 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100"
              >
                Learn What to Expect
              </Link>
            </div>
          </div>

          <Card className="rounded-md p-6">
            <p className="text-sm font-black text-navy">Partner support</p>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              LegalEase coordinates intake, screening, routing, document support, and implementation reporting with
              the partner organization.
            </p>
            <div className="mt-5 grid gap-3">
              {["Wilma intake", "Expungement.ai routing", "Court-ready support"].map((item) => (
                <div key={item} className="rounded-md bg-[#f7f8f6] px-3 py-2 text-sm font-semibold text-grayWilma-800">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-6">
        <section id="expect" className="grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={<ClipboardCheck className="h-5 w-5 text-teal" aria-hidden="true" />}
            title="How this works"
            body="Wilma collects intake information, LegalEase screens against program scope, and users are routed to the next available support path."
          />
          <InfoCard
            icon={<ShieldCheck className="h-5 w-5 text-teal" aria-hidden="true" />}
            title="What LegalEase helps with"
            body="LegalEase supports record-clearing intake, eligibility screening, document preparation workflows, routing, and partner reporting."
          />
          <InfoCard
            icon={<UsersRound className="h-5 w-5 text-teal" aria-hidden="true" />}
            title="Partner support"
            body={`${partner.name} helps connect community members to this program and may review participation or referral needs under the program model.`}
          />
        </section>

        <section id="intake" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-md p-6">
            <h2 className="text-2xl font-black text-navy">Start Intake with Wilma</h2>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Intake begins with basic information about location, record-clearing goals, and available case details.
              This demo page does not collect live participant data.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md bg-grayWilma-600 px-5 py-2 text-sm font-semibold text-white opacity-75"
              disabled
            >
              Wilma Intake Demo Placeholder
            </button>
          </Card>

          <Card className="rounded-md p-6">
            <h2 className="text-2xl font-black text-navy">What this does not guarantee</h2>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              LegalEase does not provide legal advice and does not guarantee eligibility, filing approval, court
              acceptance, or record-clearing outcomes. This access page helps collect information, route users, and
              support preparation based on available program scope and jurisdiction-specific requirements.
            </p>
          </Card>
        </section>

        <section className="rounded-md border border-grayWilma-200 bg-white p-5 text-xs leading-5 text-grayWilma-600 shadow-sm">
          Privacy and compliance note: information collected through live intake should be handled according to
          applicable partner agreements, program scope, jurisdiction requirements, and LegalEase privacy controls.
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  body
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="rounded-md p-5">
      {icon}
      <h2 className="mt-3 text-lg font-black text-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-grayWilma-700">{body}</p>
    </Card>
  );
}
