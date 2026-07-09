import Link from "next/link";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { NewPartnerForm } from "./NewPartnerForm";

export const dynamic = "force-dynamic";

export default async function NewPartnerOnboardingPage() {
  const access = await resolveInternalAdminPageAccess("/internal/partners/onboarding/new");
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#0F1E3D]">
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <Link href="/internal/partners/onboarding" className="text-sm font-semibold text-[#1D9E75] hover:text-[#0F1E3D]">
          Back to onboarding
        </Link>
        <h1 className="mb-2 mt-4 text-3xl font-black">Start a new partner</h1>
        <p className="mb-6 max-w-2xl text-sm text-[#5C5750]">
          Create the partner and its standardized onboarding checklist. You can configure billing, access codes,
          branding, admins, and launch materials on the next screen.
        </p>
        <NewPartnerForm />
      </div>
    </main>
  );
}
