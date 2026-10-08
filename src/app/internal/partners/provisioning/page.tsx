import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Building2, CheckCircle2, CreditCard, Plus, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  InternalAdminDenied,
  resolveInternalAdminPageAccess
} from "@/lib/partners/internal-admin-gate";
import {
  getPaymentStatusLabel,
  getProvisioningStatusLabel
} from "@/lib/partners/partner-service";
import {
  internalProvisioningDetail,
  internalProvisioningNew
} from "@/lib/partners/routes";
import { listInternalProvisioningRecords, type InternalProvisioningRecord } from "@/lib/partners/partner-repository";
import type { PartnerPaymentStatus, PartnerProvisioningStatus } from "@/lib/partners/types";
import { workspaceStatusLabel } from "@/lib/partners/onboarding/partner-labels";

// Authenticated internal surface: the access gate resolves the session from request
// cookies, so this page is request-bound and must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function InternalPartnerProvisioningPage() {
  const access = await resolveInternalAdminPageAccess(
    "/internal/partners/provisioning"
  );
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }
  let partners: InternalProvisioningRecord[];
  try {
    partners = await listInternalProvisioningRecords();
  } catch {
    return <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-black text-navy">Partner Provisioning</h1>
      <Card className="mt-6 p-5" role="alert">
        <p>Partner records could not be loaded. Please retry.</p>
        <Link className="mt-3 inline-flex min-h-11 items-center font-bold text-teal focus-visible:outline focus-visible:outline-2" href="/internal/partners/provisioning">Retry loading partners</Link>
      </Card>
    </main>;
  }
  const totalPartners = partners.length;
  const paymentComplete = partners.filter(record => record.payment_status === "paid").length;
  const inProvisioning = partners.filter(record => ["provisioning_in_progress", "provisioning"].includes(record.provisioning_status ?? "")).length;
  const provisioned = partners.filter(record => record.provisioning_status === "provisioned").length;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Badge tone="orange">Internal LegalEase operations</Badge>
        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-navy">Partner Provisioning</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Review current partner records, invoice payment, commercial clearance, and onboarding progress.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              href={internalProvisioningNew()}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Provision a new partner
            </Link>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Provisioning scope</p>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Records come from the partner database. Invoice payment, commercial clearance, and onboarding are separate facts; provisioning does not publish or activate a program.
            </p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard icon={<Building2 className="h-5 w-5" />} label="Total partners" value={totalPartners} />
          <SummaryCard icon={<CreditCard className="h-5 w-5" />} label="Payment complete" value={paymentComplete} />
          <SummaryCard icon={<Settings2 className="h-5 w-5" />} label="In provisioning" value={inProvisioning} />
          <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Provisioned" value={provisioned} />
        </section>

        <section className="mt-8 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm">
          <div className="border-b border-grayWilma-200 px-5 py-4">
            <h2 className="text-lg font-black text-navy">Provisioning records</h2>
          </div>
          <div className="divide-y divide-grayWilma-200">
            {partners.length === 0 ? <p className="px-5 py-5 text-sm text-grayWilma-700">No partner records yet. Provision a new partner to begin.</p> : null}
            {partners.map((record) => (
              <ProvisioningRow key={record.id} record={record} />
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

function ProvisioningRow({ record }: { record: InternalProvisioningRecord }) {
  const commercialLabels: Record<string, string> = {
    blocked: "Not cleared",
    cleared_by_paid_invoice: "Cleared by paid invoice",
    cleared_by_approved_purchase_order: "Cleared by approved purchase order",
    cleared_by_authorized_internal_override: "Cleared by authorized override"
  };
  return (
    <div data-partner-slug={record.partner_slug} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:items-start">
      <div>
        <p className="font-black text-navy">{record.organization_name || record.partner_name}</p>
        <p className="mt-1 text-xs text-grayWilma-600">{record.partner_slug}</p>
        <p className="mt-2 text-sm text-grayWilma-700">Package: {record.selected_package_name || "Not recorded"}</p>
      </div>
      <div className="grid gap-2 text-sm text-grayWilma-700">
        <p>Invoice: {getPaymentStatusLabel(record.payment_status as PartnerPaymentStatus) || "Not recorded"}</p>
        <p>Commercial clearance: {commercialLabels[record.commercial_gate_status ?? ""] || "Not recorded"}</p>
      </div>
      <div className="grid gap-2 text-sm text-grayWilma-700">
        <p>Onboarding: {record.workspace_status ? workspaceStatusLabel(record.workspace_status) : "No workspace"}</p>
        <p>Historical provisioning: {getProvisioningStatusLabel(record.provisioning_status as PartnerProvisioningStatus) || "Not recorded"}</p>
        <p>Owner: {record.assigned_owner || "Not assigned"}</p>
        <p>Launch target: {record.launch_date_target || "Not recorded"}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={internalProvisioningDetail(record.partner_slug)} className="inline-flex min-h-11 items-center gap-2 font-bold text-teal focus-visible:outline focus-visible:outline-2">Provisioning detail <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        {record.workspace_status ? <Link href={`/internal/partners/onboarding/${encodeURIComponent(record.partner_slug)}`} className="inline-flex min-h-11 items-center font-bold text-teal focus-visible:outline focus-visible:outline-2">Onboarding detail</Link> : null}
      </div>
    </div>
  );
}
