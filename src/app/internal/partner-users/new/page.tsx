import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { getAllPartnerRecords } from "@/lib/partners/partner-repository";
import { AddPartnerUserForm } from "./AddPartnerUserForm";

export const dynamic = "force-dynamic";

export default async function NewPartnerUserPage() {
  const access = await resolveInternalAdminPageAccess("/internal/partner-users/new");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const partners = (await getAllPartnerRecords())
    .map((partner) => ({
      partnerSlug: partner.partnerSlug,
      label: partner.organizationName ?? partner.partnerName
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <Link href="/internal/command-center/readiness" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Command Center
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy">Add Partner User</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Send a Supabase invite and create the partner dashboard identity in one controlled operation.
              This flow can grant partner_admin or partner_staff access only.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Write path</p>
                <p className="text-xs text-grayWilma-600">Proxy token + internal_admin session required</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              The server validates the partner, role, and email before sending an invite. Service-role access never runs in the browser.
            </p>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <Card className="rounded-md p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange/10 text-orange">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-navy">Invite and map access</h2>
                <p className="text-sm text-grayWilma-700">Use the approved partner contact email.</p>
              </div>
            </div>
            <AddPartnerUserForm partners={partners} />
          </Card>

          <Card className="rounded-md p-6">
            <h2 className="text-lg font-black text-navy">What happens next</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-grayWilma-700">
              <p>1. Supabase sends the invite email.</p>
              <p>2. The auth user is mapped to the selected partner as partner_admin or partner_staff.</p>
              <p>3. The user sets a password from the invite flow.</p>
              <p>4. They sign in at /sign-in and land on /partner/dashboard.</p>
            </div>
            <div className="mt-5 rounded-md border border-grayWilma-200 bg-[#f7f8f6] px-4 py-3 text-xs font-semibold leading-5 text-grayWilma-700">
              This flow cannot create internal_admin users and does not expose service-role credentials to client code.
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
