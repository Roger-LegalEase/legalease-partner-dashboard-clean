import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getPartnerBySlug } from "@/lib/partners/partner-service";

export default async function PartnerSpecificDashboardPlaceholder({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = getPartnerBySlug(partnerSlug);

  if (!partner) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
          <Card className="w-full rounded-md p-6 text-center">
            <h1 className="text-3xl font-black text-navy">Partner not found</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              This dashboard placeholder does not match a seeded LegalEase partner record.
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

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <h1 className="text-3xl font-black text-navy">Partner-specific dashboard view coming next.</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            The current shared partner dashboard remains available while this route is reserved for future partner-specific reporting for {partner.partnerName}.
          </p>
          <Link
            href="/dashboard/partners"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            Back to Partner Dashboard
          </Link>
        </Card>
      </div>
    </main>
  );
}
