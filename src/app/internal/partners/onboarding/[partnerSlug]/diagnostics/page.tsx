import { resolveInternalAdminPageAccess, InternalAdminDenied } from "@/lib/partners/internal-admin-gate";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { getProgramOperations } from "@/lib/partners/onboarding/program-operations-service";
import { getInternalOnboardingSnapshot } from "@/lib/partners/onboarding/service";
import { ProgramDiagnostics } from "./ProgramDiagnostics";
export const dynamic="force-dynamic";
export default async function Diagnostics({params}:{params:Promise<{partnerSlug:string}>}){
 const {partnerSlug}=await params;const access=await resolveInternalAdminPageAccess(`/internal/partners/onboarding/${partnerSlug}/diagnostics`);
 if(access.kind==="denied")return <InternalAdminDenied title={access.title} body={access.body}/>;
 const context=await requireInternalOnboardingContext(partnerSlug);
 const [operations,documents]=await Promise.all([getProgramOperations(context),getInternalOnboardingSnapshot(context)]);
 return <main className="mx-auto max-w-5xl px-4 py-10"><ProgramDiagnostics initial={operations} documents={documents}/></main>;
}
