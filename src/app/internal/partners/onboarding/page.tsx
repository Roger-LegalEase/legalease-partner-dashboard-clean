import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { listInternalProvisioningRecords } from "@/lib/partners/partner-repository";
import { ProgramsIndex, type ProgramFilters } from "./ProgramsIndex";
export const dynamic = "force-dynamic";
export default async function ProgramsPage({searchParams}:{searchParams:Promise<ProgramFilters>}) {
  const access = await resolveInternalAdminPageAccess("/internal/partners/onboarding");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const [records, filters] = await Promise.all([listInternalProvisioningRecords().catch(() => null), searchParams]);
  return <ProgramsIndex records={records} filters={filters}/>;
}
