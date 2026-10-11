import { redirect } from "next/navigation";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
export const dynamic = "force-dynamic";
/** Historical bookmarks resolve to the same authenticated program workspace. */
export default async function NewPartnerOnboardingPage({ searchParams }: { searchParams: Promise<{ partnerSlug?: string | string[] }> }) {
  const access = await resolveInternalAdminPageAccess("/internal/partners/onboarding/new");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} />;
  const raw = (await searchParams).partnerSlug;
  const slug = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (/^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(slug)) redirect(`/internal/partners/onboarding/${encodeURIComponent(slug)}`);
  redirect("/internal/partners/provisioning/new");
}
