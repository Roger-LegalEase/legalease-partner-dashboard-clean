import type { ReactNode } from "react";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { isRcap2Enabled,isRcapOnboardingLaunchPrepEnabled } from "@/lib/partners/onboarding/feature";
import { getPartnerSupportContact } from "@/lib/partners/onboarding/support-contact";
import { PartnerWorkspaceNav } from "@/components/partners/PartnerWorkspaceNav";

export const dynamic = "force-dynamic";
export default async function PartnerLayout({children}: {children: ReactNode}) {
  // Activation routes have their own token lifecycle and must remain reachable
  // before membership exists. The workspace pages already enforce their own
  // canonical session/role guards; this layout only supplies navigation.
  let member = false;
  try { member = (await resolveSessionPartner()).kind === "partner"; }
  catch(error) { if (!(error instanceof SessionPartnerError)) throw error; }
  return <>{member ? <PartnerWorkspaceNav programMode={isRcap2Enabled()} launchPrepEnabled={isRcapOnboardingLaunchPrepEnabled()} helpHref={getPartnerSupportContact().mailtoHref} /> : null}{children}</>;
}
