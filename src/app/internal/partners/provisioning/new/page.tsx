import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  InternalAdminDenied,
  resolveInternalAdminPageAccess
} from "@/lib/partners/internal-admin-gate";
import { internalProvisioning } from "@/lib/partners/routes";
import { ProvisionPartnerForm } from "./ProvisionPartnerForm";

export const dynamic = "force-dynamic";

export default async function NewPartnerProvisioningPage() {
  const access = await resolveInternalAdminPageAccess(
    "/internal/partners/provisioning/new"
  );
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          href={internalProvisioning()}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to provisioning records
        </Link>
        <div className="mt-5">
          <Badge tone="orange">Internal LegalEase operations</Badge>
          <h1 className="mt-4 text-4xl font-black leading-tight text-navy">
            New partner provisioning
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
            Provisioning creates the partner tenant and its private
            implementation workspace as one operation. Administrator access,
            program configuration, publication, and program activation each stay
            separate steps afterwards.
          </p>
        </div>
        <div className="mt-8">
          <ProvisionPartnerForm />
        </div>
      </div>
    </main>
  );
}
