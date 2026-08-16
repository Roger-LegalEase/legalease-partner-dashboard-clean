import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { PartnerDashboardClient } from "./PartnerDashboardClient";

// Authenticated internal surface: the access gate resolves the session from request
// cookies, so this page is request-bound and must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage() {
  const access = await resolveInternalAdminPageAccess("/dashboard/partners");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  return <PartnerDashboardClient />;
}
