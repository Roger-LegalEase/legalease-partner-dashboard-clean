import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { PartnerDashboardClient } from "./PartnerDashboardClient";

export default async function PartnerDashboardPage() {
  const access = await resolveInternalAdminPageAccess("/dashboard/partners");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  return <PartnerDashboardClient />;
}
