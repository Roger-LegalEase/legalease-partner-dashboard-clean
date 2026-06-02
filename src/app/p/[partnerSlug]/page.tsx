import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PartnerLandingPageTemplate } from "@/components/partners/PartnerLandingPageTemplate";
import { buildPartnerLandingPageData } from "@/lib/partners/landing-page";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";

export default async function CoBrandedPartnerPage({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await getPartnerRecordBySlug(partnerSlug);

  if (!partner) {
    return <PartnerNotFound />;
  }

  return <PartnerLandingPageTemplate {...buildPartnerLandingPageData(partner)} />;
}

function PartnerNotFound() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <h1 className="text-3xl font-black text-navy">Partner not found</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            This access page does not match an active LegalEase partner record.
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
