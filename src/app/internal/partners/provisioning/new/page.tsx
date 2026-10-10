import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  InternalAdminDenied,
  resolveInternalAdminPageAccess
} from "@/lib/partners/internal-admin-gate";
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
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#08786F] hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          href="/internal/partners/onboarding"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All programs
        </Link>
        <div className="mt-5">
          <Badge tone="orange" className="text-[#AC320E]">Internal LegalEase operations</Badge>
          <h1 className="mt-4 text-4xl font-black leading-tight text-navy">
            Create program
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-grayWilma-700">
            Choose the actual operator and starting scope. Create the private
            program once, then configure, preview, confirm, and start it in the same workspace.
          </p>
        </div>
        <div className="mt-8">
          <ProvisionPartnerForm />
        </div>
      </div>
    </main>
  );
}
