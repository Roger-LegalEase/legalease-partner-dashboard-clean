import Link from "next/link";
import { ArrowLeft, CalendarDays, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getFirstAdminAccessView,
  getFirstAdminPartnerSummary
} from "@/lib/partners/first-admin-service";
import {
  InternalAdminDenied,
  resolveInternalAdminPageAccess
} from "@/lib/partners/internal-admin-gate";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { internalProvisioning } from "@/lib/partners/routes";
import { FirstAdminAccessPanel } from "./FirstAdminAccessPanel";

export const dynamic = "force-dynamic";

export default async function InternalPartnerProvisioningDetailPage({
  params
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const access = await resolveInternalAdminPageAccess(
    `/internal/partners/provisioning/${partnerSlug}`
  );
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  let partner: Awaited<ReturnType<typeof getFirstAdminPartnerSummary>>;
  let administratorAccess: Awaited<ReturnType<typeof getFirstAdminAccessView>>;
  try {
    [partner, administratorAccess] = await Promise.all([
      getFirstAdminPartnerSummary(partnerSlug),
      getFirstAdminAccessView(partnerSlug)
    ]);
  } catch {
    return <PartnerUnavailable />;
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={internalProvisioning()}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to provisioning records
          </Link>
          <Link
            href={`/internal/partners/onboarding/${encodeURIComponent(
              partner.partnerSlug
            )}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Open onboarding workspace
          </Link>
        </div>

        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <Card className="rounded-md p-5 md:p-6">
            <Badge tone="orange">Internal LegalEase operations</Badge>
            <h1 className="mt-4 text-3xl font-black leading-tight text-navy md:text-4xl">
              {partner.publicName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Review the organization and onboarding controls before creating
              its first Partner Administrator invitation.
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <OrganizationDetail
                label="Public organization name"
                value={partner.publicName}
              />
              <OrganizationDetail
                label="Legal organization name"
                value={partner.legalName}
              />
              <OrganizationDetail
                label="Jurisdiction"
                value={partner.jurisdiction}
              />
              <OrganizationDetail
                label="Selected package"
                value={partner.selectedPackage}
              />
            </dl>
          </Card>

          <Card className="rounded-md p-5 md:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">
                  Secure provisioning boundary
                </p>
                <p className="text-xs text-grayWilma-600">
                  Internal administrator session required
                </p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-grayWilma-700">
              <li>Organization and role are fixed on the server.</li>
              <li>Only a token hash is stored.</li>
              <li>Membership is created after secure account setup.</li>
              <li>Commercial and launch controls remain unchanged.</li>
            </ul>
          </Card>
        </section>

        <FirstAdminAccessPanel
          initialAccess={administratorAccess}
          onboardingEnabled={isRcapPartnerOnboardingEnabled()}
          partner={partner}
        />
      </div>
    </main>
  );
}

function OrganizationDetail({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-4 py-3">
      <dt className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-navy">
        {value}
      </dd>
    </div>
  );
}

function PartnerUnavailable() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <h1 className="text-3xl font-black">Partner unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            This partner record or its secure access data could not be loaded.
          </p>
          <Link
            href={internalProvisioning()}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white"
          >
            Back to provisioning records
          </Link>
        </Card>
      </div>
    </main>
  );
}
