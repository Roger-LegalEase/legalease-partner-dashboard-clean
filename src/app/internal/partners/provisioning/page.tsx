import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Building2, CheckCircle2, CreditCard, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getAllPartners,
  getProgramTier,
  getPaymentStatusLabel,
  getProvisioningStatusLabel
} from "@/lib/partners/partner-service";
import { internalProvisioningDetail } from "@/lib/partners/routes";
import type { PartnerRecord } from "@/lib/partners/types";

export default function InternalPartnerProvisioningPage() {
  const partners = getAllPartners();
  const totalPartners = partners.length;
  const paymentComplete = partners.filter((record) => record.paymentStatus === "paid").length;
  const inProvisioning = partners.filter((record) => record.provisioningStatus === "provisioning_in_progress").length;
  const active = partners.filter((record) => record.provisioningStatus === "provisioned").length;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Badge tone="orange">Internal LegalEase operations view. Auth will be added before production.</Badge>
        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-navy">Partner Provisioning</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Track which partner assets are locked, pending, generating, ready, or active after mock payment and before
              production activation.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Provisioning scope</p>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              This mock operations layer is structured to become database-backed partner provisioning records later.
            </p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard icon={<Building2 className="h-5 w-5" />} label="Total partners" value={totalPartners} />
          <SummaryCard icon={<CreditCard className="h-5 w-5" />} label="Payment complete" value={paymentComplete} />
          <SummaryCard icon={<Settings2 className="h-5 w-5" />} label="In provisioning" value={inProvisioning} />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active" value={active} />
        </section>

        <section className="mt-8 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm">
          <div className="border-b border-grayWilma-200 px-5 py-4">
            <h2 className="text-lg font-black text-navy">Provisioning records</h2>
          </div>
          <div className="divide-y divide-grayWilma-200">
            {partners.map((record) => (
              <ProvisioningRow key={record.partnerId} record={record} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">{icon}</span>
        <p className="text-3xl font-black text-navy">{value}</p>
      </div>
      <p className="mt-4 text-sm font-semibold text-grayWilma-700">{label}</p>
    </Card>
  );
}

function ProvisioningRow({ record }: { record: PartnerRecord }) {
  const tier = getProgramTier(record.programTier);
  const nextAsset = Object.values(record.assets).find((asset) => asset.status !== "active");

  return (
    <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_0.8fr_0.8fr_0.7fr_0.9fr_0.8fr_0.9fr_1.2fr_0.45fr] lg:items-center">
      <div>
        <p className="font-black text-navy">{record.partnerName}</p>
        <p className="mt-1 text-xs text-grayWilma-600">{record.partnerSlug}</p>
      </div>
      <p className="text-sm font-semibold text-grayWilma-800">{tier.name}</p>
      <p className="text-sm text-grayWilma-700">{record.region}</p>
      <Badge tone={record.paymentStatus === "paid" ? "teal" : "orange"}>
        {getPaymentStatusLabel(record.paymentStatus)}
      </Badge>
      <Badge tone={record.provisioningStatus === "provisioned" ? "teal" : "blue"}>
        {getProvisioningStatusLabel(record.provisioningStatus)}
      </Badge>
      <p className="text-sm text-grayWilma-700">{record.launchDateTarget}</p>
      <p className="text-sm text-grayWilma-700">{record.assignedOwner}</p>
      <p className="text-sm leading-6 text-grayWilma-700">{nextAsset?.nextAction ?? "Monitor active program."}</p>
      <Link
        href={internalProvisioningDetail(record.partnerSlug)}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
      >
        Detail
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
