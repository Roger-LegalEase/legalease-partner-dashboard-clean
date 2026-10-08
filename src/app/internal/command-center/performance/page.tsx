import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { listInternalProvisioningRecords } from "@/lib/partners/partner-repository";

export const dynamic = "force-dynamic";
export default async function PerformancePage() {
  const access = await resolveInternalAdminPageAccess("/internal/command-center/performance");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const asOf = new Date().toISOString();
  const partners = await listInternalProvisioningRecords().catch(() => null);
  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
    <h1 className="text-3xl font-black">Performance and source status</h1>
    <p className="text-sm text-grayWilma-700">As of {asOf}. These are read-only records and connection states.</p>
    <section id="partners" className="rounded-xl border border-grayWilma-200 bg-white p-6">
      <h2 className="text-xl font-bold">Partner operating records</h2>
      <p className="mt-3">{partners ? `${partners.length} recorded partner organizations; ${partners.filter(p=>p.payment_status === "paid").length} records marked paid.` : "Partner records are unavailable. Retry loading this page."}</p>
      <p className="mt-3 text-sm">Source: partner_records and partner_onboarding. Payment labels are recorded status, not independently verified transaction totals. Program outcomes and aggregate conversion: data unavailable.</p>
    </section>
    <section id="dtc" className="rounded-xl border border-grayWilma-200 bg-white p-6"><h2 className="text-xl font-bold">DTC performance</h2><p className="mt-3">Data unavailable. Verified consumer starts, completions, orders, packet delivery and Briefcase activity have not been connected to this view.</p><p className="mt-3 text-sm">Website traffic does not measure completed consumer journeys.</p></section>
    <section id="health" className="rounded-xl border border-grayWilma-200 bg-white p-6"><h2 className="text-xl font-bold">Platform health</h2><p className="mt-3">Not connected: public-host probes, deployment identity, Supabase health, packet worker/queue health and payment delivery status.</p><p className="mt-3 text-sm">No live health verdict is available. The release readiness checklist is a separate reference.</p></section>
  </main>;
}
