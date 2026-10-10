import Link from "next/link";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { resolveInternalAdminPageAccess, InternalAdminDenied } from "@/lib/partners/internal-admin-gate";
import { getProgramExperience } from "@/lib/partners/onboarding/program-experience-service";
import { getPartnerAccessCodeAnalytics } from "@/lib/partners/partner-access-codes";
import { PartnerAccessCodesManager } from "@/app/partner/access-codes/PartnerAccessCodesManager";

export const dynamic = "force-dynamic";
export default async function ProgramAccessCodes({ params }: { params: Promise<{ partnerSlug: string }> }) {
  const { partnerSlug } = await params;
  const workspace = `/internal/partners/onboarding/${encodeURIComponent(partnerSlug)}`;
  const access = await resolveInternalAdminPageAccess(`${workspace}/access-codes`);
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body}/>;
  const program = await getProgramExperience(await requireInternalOnboardingContext(partnerSlug));
  const analytics = await getPartnerAccessCodeAnalytics(partnerSlug).catch(() => null);
  return <main className="mx-auto max-w-6xl px-4 py-8"><Link className="inline-flex min-h-11 items-center underline" href={workspace}>Back to program</Link><h1 className="mt-4 text-3xl font-bold">{program.organizationName} · Access codes</h1><p className="my-4">Manage entry codes for this program. Each participant still needs actual program authorization; a code does not grant packet funding.</p><PartnerAccessCodesManager partnerSlug={partnerSlug} initialAnalytics={analytics} program={{ accessMode: program.data.access_sponsorship_capacity?.participant_access_model ?? "open", live: program.decision.live, settingsHref: `${workspace}#program-field-participant_access_model` }}/></main>;
}
