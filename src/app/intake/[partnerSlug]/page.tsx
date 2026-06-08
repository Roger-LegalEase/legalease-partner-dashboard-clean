import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { buildPartnerLandingPageData } from "@/lib/partners/landing-page";
import { partnerPublicPage } from "@/lib/partners/routes";
import { rcapIntakeDisclaimer } from "@/lib/rcap-intake/types";
import { RcapWilmaIntakeChat } from "./RcapWilmaIntakeChat";

const intakeDisclaimerCopy = "This tool does not provide legal advice and does not guarantee eligibility or outcomes.";

export default async function RcapWilmaIntakePage({
  params,
  searchParams
}: {
  params: Promise<{ partnerSlug: string }>;
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const [{ partnerSlug }, search] = await Promise.all([params, searchParams]);
  const partner = await getPartnerRecordBySlug(partnerSlug);

  if (!partner) {
    return <PartnerNotFound partnerSlug={partnerSlug} />;
  }

  const landingContext = buildPartnerLandingPageData(partner);
  const initialSessionId = typeof search.session === "string" ? search.session : undefined;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <Link href={partnerPublicPage(partner.partnerSlug)} className="inline-flex items-center gap-2 text-sm font-semibold text-teal hover:text-navy">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to partner page
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <aside className="rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
            <Badge tone="blue">{partner.partnerSlug === "we-must-vote" ? "We Must Vote + LegalEase" : "Record review intake"}</Badge>
            <h1 className="mt-4 text-3xl font-black leading-tight text-navy">{landingContext.organizationName}</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              {partner.partnerSlug === "we-must-vote"
                ? "Clear your Mississippi record with We Must Vote + LegalEase. Start with a guided record review, then continue to the Mississippi packet workflow when your answers fit the launch scope."
                : `LegalEase record-clearing access intake for ${landingContext.serviceArea}.`}
            </p>
            <div className="mt-5 grid gap-3">
              <Meta label="Partner" value={landingContext.partnerName} />
              <Meta label="Service area" value={landingContext.serviceArea} />
              <Meta label="Program" value={landingContext.programName} />
            </div>
            <div className="mt-5 rounded-md border border-orange/30 bg-orange/10 p-4">
              <p className="text-sm font-black text-navy">Important</p>
              <p className="mt-2 text-sm leading-6 text-grayWilma-800">{intakeDisclaimerCopy}</p>
            </div>
          </aside>

          <RcapWilmaIntakeChat
            partnerSlug={partner.partnerSlug}
            partnerName={landingContext.organizationName}
            defaultState={partner.partnerSlug === "we-must-vote" ? "MS" : partner.targetState ?? partner.state}
            defaultCounty={partner.partnerSlug === "we-must-vote" ? undefined : partner.targetCounty}
            disclaimer={rcapIntakeDisclaimer}
            initialSessionId={initialSessionId}
          />
        </section>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-2">
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black text-navy">{value || "Not provided"}</p>
    </div>
  );
}

function PartnerNotFound({ partnerSlug }: { partnerSlug: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <Badge tone="orange">RCAP Wilma Intake</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">Partner not found</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            This intake page does not match an active LegalEase partner record.
          </p>
          <Link
            href="/partners"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            Back to Partner Program
          </Link>
          <p className="mt-5 text-xs text-grayWilma-600">Requested partner slug: {partnerSlug}</p>
        </Card>
      </div>
    </main>
  );
}
