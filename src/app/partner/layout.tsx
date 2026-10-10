import type { ReactNode } from "react";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { isRcap2Enabled,isRcapOnboardingLaunchPrepEnabled } from "@/lib/partners/onboarding/feature";
import { getPartnerSupportContact } from "@/lib/partners/onboarding/support-contact";
import { getProgramConfiguration } from "@/lib/partners/onboarding/program-configuration-service";
import { PartnerWorkspaceNav } from "@/components/partners/PartnerWorkspaceNav";

export const dynamic = "force-dynamic";
export default async function PartnerLayout({children}: {children: ReactNode}) {
  // Activation routes have their own token lifecycle and must remain reachable
  // before membership exists. The workspace pages already enforce their own
  // canonical session/role guards; this layout only supplies navigation.
  let member = false;
  let canManage = false;
  let codesEnabled = false;
  try { const actor = await resolveSessionPartner(); member = actor.kind === "partner"; canManage = actor.kind === "partner" && actor.role === "partner_admin";
    if (actor.kind === "partner" && actor.role === "partner_admin" && isRcap2Enabled()) {
      const configuration = await getProgramConfiguration({ ...actor, workEmail: null }).catch(() => null);
      codesEnabled = ["optional_code", "required_code", "invite_only"].includes(configuration?.data.access_sponsorship_capacity?.participant_access_model ?? "");
    } }
  catch(error) { if (!(error instanceof SessionPartnerError)) throw error; }
  return <>{member ? <PartnerWorkspaceNav canManage={canManage} codesEnabled={codesEnabled} programMode={isRcap2Enabled()} launchPrepEnabled={isRcapOnboardingLaunchPrepEnabled()} helpHref={getPartnerSupportContact().mailtoHref} /> : null}{children}</>;
}
