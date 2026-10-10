import Link from "next/link";
import { getProgramActivity } from "@/lib/partners/onboarding/program-activity";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { isRcap2Enabled } from "@/lib/partners/onboarding/feature";
import { getProgramWorkspaceIdentity } from "@/lib/partners/onboarding/program-workspace";
import { getProgramConfiguration } from "@/lib/partners/onboarding/program-configuration-service";
import { recoverWorkspaceLoad, requireWorkspaceLoad } from "@/lib/partners/onboarding/workspace-loading";
import { getProgramOperations } from "@/lib/partners/onboarding/program-operations-service";
import { getFirstAdminPartnerSummary, getFirstAdminAccessView } from "@/lib/partners/first-admin-service";
import { listPartnerTeamMembersForResolvedSession } from "@/lib/partners/partner-team";
import { AddPartnerUserForm } from "../../../partner-users/new/AddPartnerUserForm";
import { FirstAdminAccessPanel } from "../../provisioning/[partnerSlug]/FirstAdminAccessPanel";
import { ManagedProgramEditor } from "@/components/partners/onboarding/ManagedProgramEditor";
import { ProgramOperations } from "./ProgramOperations";

export const dynamic = "force-dynamic";
export default async function OnboardingDetailPage({ params }: { params: Promise<{ partnerSlug: string }> }) {
  const { partnerSlug } = await params;
  const access = await resolveInternalAdminPageAccess(`/internal/partners/onboarding/${partnerSlug}`);
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} />;
  if (!isRcap2Enabled()) return <main className="p-8">Program operations are unavailable for this application release.</main>;
  const context = await requireInternalOnboardingContext(partnerSlug);
  await requireWorkspaceLoad("page.identity", "getProgramWorkspaceIdentity", () => getProgramWorkspaceIdentity(context));
  const partner = await requireWorkspaceLoad("page.partner", "getFirstAdminPartnerSummary", () => getFirstAdminPartnerSummary(partnerSlug));
  const [configuration, operations, activity, members] = await Promise.all([
    recoverWorkspaceLoad("page.configuration", "getProgramConfiguration", "Program configuration is unavailable. Reload to retry.", () => getProgramConfiguration(context)),
    recoverWorkspaceLoad("page.operations", "getProgramOperations", "Program operations are unavailable. Reload to check launch readiness.", () => getProgramOperations(context)),
    recoverWorkspaceLoad("page.activity", "getProgramActivity", "Program activity is unavailable. Reload to retry.", () => getProgramActivity(context)),
    listPartnerTeamMembersForResolvedSession(context)
  ]);
  const issues = [configuration.issue, operations.issue, activity.issue].filter(issue => issue !== null);
  const administratorAccess = configuration.value?.operatingModel === "partner_managed"
    ? await recoverWorkspaceLoad("page.administratorAccess", "getFirstAdminAccessView", "Administrator access could not be loaded. Reload to retry.", () => getFirstAdminAccessView(partnerSlug)) : null;
  return <main className="mx-auto max-w-6xl px-4 py-10 text-navy">
    <Link className="inline-flex min-h-11 items-center underline" href="/internal/partners/onboarding">All partner programs</Link>
    <h1 className="mt-4 text-3xl font-black">{partner.publicName}</h1>
    <p className="mt-3">Configure → Save → Preview → Confirm → Start Program</p>
    {issues.length ? <div role="alert" className="mt-6 rounded border border-orange/40 bg-orange/10 p-4"><ul>{issues.map(issue => <li key={issue.loader}>{issue.message}</li>)}</ul><a className="inline-flex min-h-11 items-center underline" href={`/internal/partners/onboarding/${encodeURIComponent(partnerSlug)}`}>Reload workspace</a></div> : null}
    {operations.value ? <ProgramOperations key={partnerSlug} initial={operations.value} configuration={configuration.value ?? undefined} /> : configuration.value ? <ManagedProgramEditor key={`configuration-${partnerSlug}`} configuration={configuration.value} /> : null}
    <details id="program-team" tabIndex={-1} className="mt-6 scroll-mt-32 rounded-xl border bg-white p-5"><summary className="min-h-11 cursor-pointer py-3 text-xl font-bold">Team &amp; access</summary>{administratorAccess ? <><p className="my-3">Invite the partner’s actual administrator when their review is needed. Invitation and acceptance establish account access; they do not sign agreements or fund packets.</p>{administratorAccess.value ? <FirstAdminAccessPanel partner={partner} initialAccess={administratorAccess.value} onboardingEnabled accessOnly/> : <p role="alert">{administratorAccess.issue?.message}</p>}</> : <p className="my-3">LegalEase operates this program. Add program staff only when needed; no external administrator is required.</p>}<section className="mt-4"><h2 className="font-bold">Program members</h2>{members===null?<p role="alert">Team members could not be loaded. Reload this workspace to retry.</p>:members.length?<ul className="mt-3 divide-y">{members.map(member=><li key={member.id} className="flex flex-wrap gap-x-6 gap-y-1 py-3"><span className="break-all font-semibold">{member.email??"Email unavailable"}</span><span>{member.role==="partner_admin"?"Partner administrator":"Program staff"}</span><span>{member.status.replaceAll("_"," ")}</span></li>)}</ul>:<p className="mt-3">No program members have been invited.</p>}<p className="mt-2 text-sm">Membership does not grant participant case access. Assign specific Clinic permissions within each event.</p></section><details className="mt-5"><summary className="min-h-11 cursor-pointer py-3 font-bold">Invite program staff</summary><div className="mt-3 max-w-xl"><AddPartnerUserForm partners={[{partnerSlug,label:partner.publicName}]} fixedPartner={partnerSlug} staffOnly/></div></details></details>
    {operations.value?.view?.decision.live ? <section id="program-activity" className="mt-6 rounded-xl border bg-white p-6"><h2 className="text-2xl font-bold">Program activity</h2>{activity.value ? <dl className="mt-4 flex gap-8"><div><dt>Screening sessions started</dt><dd className="text-2xl font-bold">{activity.value.screenings}</dd></div><div><dt>Published clinics</dt><dd className="text-2xl font-bold">{activity.value.publishedClinics}</dd></div></dl> : <p>Activity counts are unavailable. Reload to retry.</p>}<p className="mt-3 text-sm">Recorded activity across all program jurisdictions. These counts do not indicate legal eligibility or packet funding.</p></section> : null}
    <Link className="mt-6 inline-flex min-h-11 items-center rounded border px-5 font-bold" href={`/internal/clinic?partner=${encodeURIComponent(partnerSlug)}`}>Manage program clinics</Link>
  </main>;
}
