import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getAllPartnerRecords,
  getPartnerRepositoryMode
} from "@/lib/partners/partner-repository";
import {
  internalAdmin,
  internalAdminDetail,
  internalProvisioning,
  internalProvisioningDetail
} from "@/lib/partners/routes";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function InternalPartnerDataPage() {
  const partners = await getAllPartnerRecords();
  const repositoryMode = await getPartnerRepositoryMode();
  const paidPartners = partners.filter((partner) => partner.paymentStatus === "paid" || partner.paymentStatus === "demo_paid");
  const activePartners = partners.filter((partner) => partner.provisioningStatus === "active");
  const provisioningPartners = partners.filter((partner) => partner.provisioningStatus === "provisioning");
  const supabasePartnerDataEnabled = process.env.ENABLE_SUPABASE_PARTNER_DATA === "true";

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Badge tone="orange">Internal LegalEase operations view. Auth will be added before production.</Badge>
        <section className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h1 className="text-4xl font-black leading-tight text-navy">Partner Data Layer</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Read-only diagnostic view for the local seeded partner data service boundary.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Data source</p>
            <div className="mt-4 grid gap-2">
              <Badge tone={repositoryMode === "supabase" ? "teal" : "blue"}>Repository mode: {repositoryMode}</Badge>
              <Badge tone={isSupabaseConfigured() ? "teal" : "neutral"}>
                Supabase configured: {isSupabaseConfigured() ? "yes" : "no"}
              </Badge>
              <Badge tone={supabasePartnerDataEnabled ? "teal" : "neutral"}>
                Supabase partner data enabled: {supabasePartnerDataEnabled ? "yes" : "no"}
              </Badge>
              <Badge tone="blue">Supabase-ready service boundary</Badge>
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total partners" value={partners.length} />
          <MetricCard label="Paid/demo-paid partners" value={paidPartners.length} />
          <MetricCard label="Active partners" value={activePartners.length} />
          <MetricCard label="In provisioning partners" value={provisioningPartners.length} />
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 text-sm leading-6 text-grayWilma-700 shadow-sm">
          This page verifies the partner data service boundary. It does not expose secrets.
        </section>

        <section className="mt-8 rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black text-navy">Partner slugs</h2>
            <div className="flex flex-wrap gap-3">
              <Link href={internalAdmin()} className="text-sm font-semibold text-teal hover:text-navy">
                View admin activation
              </Link>
              <Link href={internalProvisioning()} className="text-sm font-semibold text-teal hover:text-navy">
                View provisioning
              </Link>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {partners.map((partner) => (
              <div key={partner.partnerSlug} className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-3 py-3">
                <p className="text-sm font-black text-navy">{partner.partnerSlug}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link
                    href={internalAdminDetail(partner.partnerSlug)}
                    className="text-xs font-semibold text-teal hover:text-navy"
                  >
                    Admin
                  </Link>
                  <Link
                    href={internalProvisioningDetail(partner.partnerSlug)}
                    className="text-xs font-semibold text-teal hover:text-navy"
                  >
                    Provisioning
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-md p-5">
      <p className="text-3xl font-black text-navy">{value}</p>
      <p className="mt-3 text-sm font-semibold text-grayWilma-700">{label}</p>
    </Card>
  );
}
