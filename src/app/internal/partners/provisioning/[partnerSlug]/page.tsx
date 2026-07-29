import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Settings2,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
import {
  getAssetStatusLabel,
  getPartnerBySlug,
  getPaymentStatusLabel,
  getProgramTier,
  getProvisioningStatusLabel,
  getQualificationStatusLabel
} from "@/lib/partners/partner-service";
import {
  internalAdminDetail,
  internalProvisioning
} from "@/lib/partners/routes";
import type {
  PartnerAsset,
  PartnerAssetStatus,
  PartnerRecord
} from "@/lib/partners/types";
import { FirstAdminAccessPanel } from "./FirstAdminAccessPanel";

export const dynamic = "force-dynamic";

const timeline = [
  "Partner request received and qualification notes captured.",
  "Program tier selected and mock payment completed.",
  "Provisioning assets generated for launch review.",
  "Partner launch readiness review and activation."
];

const readinessChecklist = [
  "Partner scope approved",
  "Record-clearing needs mapped",
  "Co-branded access page reviewed",
  "Launch kit ready for communications lead",
  "Weekly reporting schedule confirmed",
  "Final impact report window documented"
];

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
  const legacyRecord = getPartnerBySlug(partnerSlug);

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
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/internal/partners/onboarding/${encodeURIComponent(
                partner.partnerSlug
              )}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Open onboarding workspace
            </Link>
            {legacyRecord ? (
              <Link
                href={internalAdminDetail(legacyRecord.partnerSlug)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Open Admin Activation
              </Link>
            ) : null}
          </div>
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

        {legacyRecord ? (
          <LegacyProvisioningSections record={legacyRecord} />
        ) : null}
      </div>
    </main>
  );
}

function LegacyProvisioningSections({ record }: { record: PartnerRecord }) {
  const tier = getProgramTier(record.programTier);
  const assets = Object.values(record.assets);
  return (
    <section className="mt-8 border-t border-grayWilma-200 pt-8">
      <div className="mb-5">
        <Badge tone="blue">Existing provisioning controls</Badge>
        <h2 className="mt-3 text-2xl font-black text-navy">
          Legacy activation and asset workflow
        </h2>
        <p className="mt-2 text-sm leading-6 text-grayWilma-700">
          First-administrator access is additive. Payment, qualification,
          launch readiness, and generated asset controls remain available
          below.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card className="rounded-md p-6">
          <h3 className="text-lg font-black text-navy">
            Internal activation checklist
          </h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Meta label="Tier" value={tier.name} />
            <Meta label="Region" value={record.region} />
            <Meta label="Assigned owner" value={record.assignedOwner} />
            <Meta label="Target launch" value={record.launchDateTarget} />
          </div>
        </Card>

        <Card className="rounded-md p-6">
          <h3 className="text-lg font-black text-navy">
            Payment and qualification status
          </h3>
          <div className="mt-4 grid gap-3">
            <StatusLine
              label="Payment"
              value={getPaymentStatusLabel(record.paymentStatus)}
              tone={record.paymentStatus === "paid" ? "teal" : "orange"}
            />
            <StatusLine
              label="Provisioning"
              value={getProvisioningStatusLabel(record.provisioningStatus)}
              tone="blue"
            />
            <StatusLine
              label="Qualification"
              value={getQualificationStatusLabel(record.qualificationStatus)}
              tone="teal"
            />
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-md p-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-teal" aria-hidden="true" />
            <h3 className="text-lg font-black text-navy">
              Provisioning timeline
            </h3>
          </div>
          <div className="mt-5 grid gap-3">
            {timeline.map((item, index) => (
              <div key={item} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal/10 text-xs font-black text-teal">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-grayWilma-700">{item}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-md p-6">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-teal" aria-hidden="true" />
            <h3 className="text-lg font-black text-navy">
              Launch readiness checklist
            </h3>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {readinessChecklist.map((item) => (
              <div
                key={item}
                className="rounded-md bg-[#f7f8f6] px-3 py-2 text-sm font-semibold text-grayWilma-800"
              >
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <h3 className="text-2xl font-black text-navy">
            Asset activation checklist
          </h3>
          <p className="mt-2 text-sm text-grayWilma-700">
            All generated partner journey assets for activation review.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard key={asset.key} asset={asset} />
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-navy">Internal next actions</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <p className="rounded-md bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
            Confirm partner launch owner and stakeholder approval path.
          </p>
          <p className="rounded-md bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
            Review generating assets for jurisdiction and scope accuracy.
          </p>
          <p className="rounded-md bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
            Prepare launch readiness review before target date.
          </p>
        </div>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-grayWilma-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-navy">{value}</p>
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "teal" | "blue" | "orange" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#f7f8f6] px-3 py-2">
      <span className="text-sm font-semibold text-grayWilma-700">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function AssetCard({ asset }: { asset: PartnerAsset }) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-lg font-black text-navy">{asset.label}</h4>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            {asset.description}
          </p>
        </div>
        <Badge tone={assetTone(asset.status)}>
          {getAssetStatusLabel(asset.status)}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-grayWilma-700">
        <p>
          <span className="font-bold text-navy">Owner:</span> {asset.owner}
        </p>
        <p>
          <span className="font-bold text-navy">Next action:</span>{" "}
          {asset.nextAction}
        </p>
        {asset.route ? (
          <p>
            <span className="font-bold text-navy">Route:</span> {asset.route}
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button type="button" disabled className="min-h-10">
          Mark Ready
        </Button>
        <Button type="button" variant="secondary" disabled className="min-h-10">
          Preview
        </Button>
        {asset.route ? (
          <Link
            href={asset.route}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100"
          >
            Open Route
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled
            className="min-h-10"
          >
            Open Route
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-grayWilma-600">
        Mock action only. State changes are not persisted.
      </p>
    </Card>
  );
}

function assetTone(
  status: PartnerAssetStatus
): "teal" | "blue" | "orange" | "neutral" {
  if (status === "active" || status === "ready") return "teal";
  if (status === "generating") return "blue";
  if (status === "pending") return "orange";
  return "neutral";
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
