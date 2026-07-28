import Link from "next/link";
import { redirect } from "next/navigation";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { NewPartnerForm } from "./NewPartnerForm";

export const dynamic = "force-dynamic";

export default async function NewPartnerOnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ partnerSlug?: string | string[] }>;
}) {
  const access = await resolveInternalAdminPageAccess("/internal/partners/onboarding/new");
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }
  if (isRcapPartnerOnboardingEnabled()) {
    const rawPartnerSlug = (await searchParams).partnerSlug;
    const partnerSlug =
      typeof rawPartnerSlug === "string"
        ? rawPartnerSlug.trim().toLowerCase()
        : "";
    const invalidPartnerSlug =
      partnerSlug.length > 0 &&
      !/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(partnerSlug);
    if (partnerSlug && !invalidPartnerSlug) {
      redirect(
        `/internal/partners/onboarding/${encodeURIComponent(partnerSlug)}`
      );
    }

    return (
      <main className="min-h-screen bg-[#f7f8f6] text-navy">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
          <section className="w-full rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-orange">
              RCAP Partner Onboarding · Phase 1
            </p>
            <h1 className="mt-3 text-3xl font-black">
              Open an existing partner
            </h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Phase 1 creates an onboarding workspace only for an existing
              partner record. Enter its exact partner slug to open the
              idempotent workspace control. No partner, invitation,
              publication, or activation is created by this lookup.
            </p>
            <form className="mt-6 grid gap-3" method="get">
              <label
                className="text-sm font-black text-navy"
                htmlFor="phase1-existing-partner-slug"
              >
                Existing partner slug
              </label>
              <input
                aria-describedby={
                  invalidPartnerSlug
                    ? "phase1-existing-partner-slug-error"
                    : "phase1-existing-partner-slug-help"
                }
                aria-invalid={invalidPartnerSlug || undefined}
                autoComplete="off"
                className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 py-2 font-mono text-sm text-navy shadow-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/25"
                defaultValue={partnerSlug}
                id="phase1-existing-partner-slug"
                maxLength={120}
                name="partnerSlug"
                pattern="[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?"
                required
              />
              {invalidPartnerSlug ? (
                <p
                  className="text-sm font-semibold text-orange"
                  id="phase1-existing-partner-slug-error"
                  role="alert"
                >
                  Enter a lowercase partner slug using letters, numbers, and
                  interior hyphens.
                </p>
              ) : (
                <p
                  className="text-xs leading-5 text-grayWilma-700"
                  id="phase1-existing-partner-slug-help"
                >
                  The detail route verifies the internal session, then the
                  workspace operation verifies that this partner exists.
                </p>
              )}
              <button
                className="mt-1 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                type="submit"
              >
                Open Phase 1 workspace
              </button>
            </form>
            <Link
              href="/internal/partners/onboarding"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal hover:text-navy"
            >
              Return to partner onboarding
            </Link>
          </section>
        </div>
      </main>
    );
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
