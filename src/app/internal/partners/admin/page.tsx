import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Building2, CheckCircle2, CreditCard, Settings2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getPaymentStatusLabel,
  getProgramTier,
  getOnboardingStatusLabel,
  getProvisioningStatusLabel,
  getQualificationStatusLabel
} from "@/lib/partners/partner-service";
import { getAllPartnerRecords } from "@/lib/partners/partner-repository";
import { internalAdminDetail } from "@/lib/partners/routes";
import type { PartnerRecord } from "@/lib/partners/types";
import { getPartnerDocumentActivitySummary } from "@/lib/rcap/documents/mississippi/repository";

export default async function InternalPartnerAdminPage() {
  const partners = await getAllPartnerRecords();
  const qualifiedPartners = partners.filter((record) => record.qualificationStatus === "qualified").length;
  const paymentComplete = partners.filter((record) => record.paymentStatus === "paid").length;
  const inProvisioning = partners.filter((record) => record.provisioningStatus === "provisioning_in_progress").length;
  const activePartners = partners.filter((record) => record.provisioningStatus === "provisioned").length;
  const documentSummaries = await Promise.all(partners.map((record) => getPartnerDocumentActivitySummary(record.partnerSlug)));
  const documentPacketsStarted = documentSummaries.reduce((total, summary) => total + summary.totalPackets, 0);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Badge tone="orange">Mock-only admin activation layer. Auth and persistent writes are not enabled yet.</Badge>

        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-navy">Partner Admin</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Internal LegalEase operations view for reviewing, activating, and managing Record-Clearing Access Program
              partners. Auth and persistent write actions will be added before production.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Phase 7 operating mode</p>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Admin actions are mock-only. The pages use the partner repository boundary and preserve local seeded data
              fallback until Supabase writes are enabled.
            </p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <SummaryCard icon={<Building2 className="h-5 w-5" />} label="Total partners" value={partners.length} />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Qualified partners" value={qualifiedPartners} />
          <SummaryCard icon={<CreditCard className="h-5 w-5" />} label="Payment complete/demo-paid" value={paymentComplete} />
          <SummaryCard icon={<Settings2 className="h-5 w-5" />} label="In provisioning" value={inProvisioning} />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active partners" value={activePartners} />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="MS/IL document packets" value={documentPacketsStarted} />
        </section>

        <section className="mt-8 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm">
          <div className="border-b border-grayWilma-200 px-5 py-4">
            <h2 className="text-lg font-black text-navy">Partner activation records</h2>
            <p className="mt-1 text-sm text-grayWilma-700">Manual operations queue for pre-Stripe partner activation.</p>
          </div>
          <div className="hidden border-b border-grayWilma-200 bg-[#f7f8f6] px-5 py-3 text-xs font-black uppercase tracking-wide text-grayWilma-600 lg:grid lg:grid-cols-[1.2fr_0.75fr_0.9fr_0.8fr_0.8fr_0.9fr_0.85fr_0.8fr_0.85fr_0.7fr] lg:items-center">
            <span>Partner</span>
            <span>Tier</span>
            <span>Region</span>
            <span>Qualification</span>
            <span>Payment</span>
            <span>Provisioning</span>
            <span>Onboarding</span>
            <span>Launch</span>
            <span>Owner</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-grayWilma-200">
            {partners.map((record) => (
              <PartnerAdminRow key={record.partnerId} record={record} />
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

function PartnerAdminRow({ record }: { record: PartnerRecord }) {
  const tier = getProgramTier(record.programTier);

  return (
    <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_0.75fr_0.9fr_0.8fr_0.8fr_0.9fr_0.85fr_0.8fr_0.85fr_0.7fr] lg:items-center">
      <div>
        <p className="font-black text-navy">{record.organizationName ?? record.partnerName}</p>
        <p className="mt-1 text-xs text-grayWilma-600">{record.partnerSlug}</p>
      </div>
      <p className="text-sm font-semibold text-grayWilma-800">{tier.name}</p>
      <p className="text-sm text-grayWilma-700">{record.serviceArea ?? record.region}</p>
      <Badge tone={record.qualificationStatus === "qualified" ? "teal" : "orange"}>
        {getQualificationStatusLabel(record.qualificationStatus)}
      </Badge>
      <Badge tone={record.paymentStatus === "paid" ? "teal" : "orange"}>
        {getPaymentStatusLabel(record.paymentStatus)}
      </Badge>
      <Badge tone={record.provisioningStatus === "provisioned" ? "teal" : "blue"}>
        {getProvisioningStatusLabel(record.provisioningStatus)}
      </Badge>
      <Badge tone={record.onboardingStatus === "submitted" || record.onboardingStatus === "approved" ? "teal" : "blue"}>
        {getOnboardingStatusLabel(record.onboardingStatus)}
      </Badge>
      <p className="text-sm text-grayWilma-700">{record.expectedLaunchDate ?? record.launchDateTarget}</p>
      <p className="text-sm text-grayWilma-700">{record.assignedOwner}</p>
      <Link
        href={internalAdminDetail(record.partnerSlug)}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
      >
        Admin
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
