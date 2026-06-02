import Link from "next/link";
import { CalendarDays, ExternalLink, ShieldCheck, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getAssetStatusLabel,
  getPartnerBySlug,
  getPaymentStatusLabel,
  getProgramTier,
  getProvisioningStatusLabel,
  getQualificationStatusLabel
} from "@/lib/partners/partner-service";
import { internalAdminDetail, internalProvisioning } from "@/lib/partners/routes";
import type { PartnerAsset, PartnerAssetStatus } from "@/lib/partners/types";

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
  const record = getPartnerBySlug(partnerSlug);

  if (!record) {
    return <PartnerNotFound />;
  }

  const tier = getProgramTier(record.programTier);
  const assets = Object.values(record.assets);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={internalProvisioning()} className="text-sm font-semibold text-teal hover:text-navy">
            Back to provisioning records
          </Link>
          <Link
            href={internalAdminDetail(record.partnerSlug)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Open Admin Activation
          </Link>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-md p-6">
            <Badge tone="orange">Internal activation checklist</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy">{record.partnerName}</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Internal LegalEase operations view. Auth will be added before production.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Meta label="Tier" value={tier.name} />
              <Meta label="Region" value={record.region} />
              <Meta label="Assigned owner" value={record.assignedOwner} />
              <Meta label="Target launch" value={record.launchDateTarget} />
            </div>
          </Card>

          <Card className="rounded-md p-6">
            <h2 className="text-lg font-black text-navy">Payment and qualification status</h2>
            <div className="mt-4 grid gap-3">
              <StatusLine
                label="Payment"
                value={getPaymentStatusLabel(record.paymentStatus)}
                tone={record.paymentStatus === "paid" ? "teal" : "orange"}
              />
              <StatusLine label="Provisioning" value={getProvisioningStatusLabel(record.provisioningStatus)} tone="blue" />
              <StatusLine label="Qualification" value={getQualificationStatusLabel(record.qualificationStatus)} tone="teal" />
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-md p-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-teal" aria-hidden="true" />
              <h2 className="text-lg font-black text-navy">Provisioning timeline</h2>
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
              <h2 className="text-lg font-black text-navy">Launch readiness checklist</h2>
            </div>
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {readinessChecklist.map((item) => (
                <div key={item} className="rounded-md bg-[#f7f8f6] px-3 py-2 text-sm font-semibold text-grayWilma-800">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-navy">Asset activation checklist</h2>
            <p className="mt-2 text-sm text-grayWilma-700">All generated partner journey assets for activation review.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {assets.map((asset) => (
              <AssetCard key={asset.key} asset={asset} />
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-navy">Internal next actions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <p className="rounded-md bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">Confirm partner launch owner and stakeholder approval path.</p>
            <p className="rounded-md bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">Review generating assets for jurisdiction and scope accuracy.</p>
            <p className="rounded-md bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">Prepare launch readiness review before target date.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-grayWilma-600">{label}</p>
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
          <h3 className="text-lg font-black text-navy">{asset.label}</h3>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">{asset.description}</p>
        </div>
        <Badge tone={assetTone(asset.status)}>{getAssetStatusLabel(asset.status)}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-grayWilma-700">
        <p><span className="font-bold text-navy">Owner:</span> {asset.owner}</p>
        <p><span className="font-bold text-navy">Next action:</span> {asset.nextAction}</p>
        {asset.route ? <p><span className="font-bold text-navy">Route:</span> {asset.route}</p> : null}
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button type="button" disabled className="min-h-10">Mark Ready</Button>
        <Button type="button" variant="secondary" disabled className="min-h-10">Preview</Button>
        {asset.route ? (
          <Link
            href={asset.route}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100"
          >
            Open Route
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <Button type="button" variant="secondary" disabled className="min-h-10">
            Open Route
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-grayWilma-600">Mock action only. State changes are not persisted.</p>
    </Card>
  );
}

function PartnerNotFound() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <h1 className="text-3xl font-black text-navy">Partner not found</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            This provisioning record does not exist in the local seeded data layer.
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

function assetTone(status: PartnerAssetStatus): "teal" | "blue" | "orange" | "neutral" {
  if (status === "active" || status === "ready") {
    return "teal";
  }

  if (status === "generating") {
    return "blue";
  }

  if (status === "pending") {
    return "orange";
  }

  return "neutral";
}
