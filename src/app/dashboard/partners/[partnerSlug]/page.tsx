import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getOnboardingStatusLabel, getPaymentStatusLabel, getProvisioningStatusLabel } from "@/lib/partners/partner-service";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";

export default async function PartnerSpecificDashboardPlaceholder({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const partner = await getPartnerRecordBySlug(partnerSlug);

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
          <Badge tone="blue">Partner profile</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">{partner.organizationName ?? partner.partnerName}</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            {partner.programDescription ?? partner.programGoal}
          </p>
          <div className="mt-6 grid gap-3 text-left md:grid-cols-2">
            <StatusCard label="Payment" value={getPaymentStatusLabel(partner.paymentStatus)} />
            <StatusCard label="Provisioning" value={getProvisioningStatusLabel(partner.provisioningStatus)} />
            <StatusCard label="Onboarding" value={getOnboardingStatusLabel(partner.onboardingStatus)} />
            <StatusCard label="Primary contact" value={`${partner.primaryContactName ?? partner.contactName} · ${partner.primaryContactEmail ?? partner.contactEmail}`} />
            <StatusCard label="Target geography" value={`${partner.serviceArea ?? partner.region}, ${partner.targetState ?? partner.state}`} />
            <StatusCard label="Expected launch" value={partner.expectedLaunchDate ?? partner.launchDateTarget} />
          </div>
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

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-3">
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black text-navy">{value}</p>
    </div>
  );
}
