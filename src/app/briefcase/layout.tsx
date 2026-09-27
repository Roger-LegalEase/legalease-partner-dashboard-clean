import type { ReactNode } from "react";

import { ClinicPrivacyBoundary } from "@/components/clinic-mode/ClinicPrivacyBoundary";
import { getActiveClinicParticipantContext, hasClinicDeviceRecoveryContext } from "@/lib/clinic-mode/participant-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BriefcaseLayout({ children }: { children: ReactNode }) {
  const recovery = await hasClinicDeviceRecoveryContext();
  let clinic;
  try { clinic = await getActiveClinicParticipantContext(); }
  catch (error) {
    if (!recovery) throw error;
    // A failed context lookup cannot hide recovery or expose the children.
    return <ClinicPrivacyBoundary cleanEntryPath="/clinic" recovery />;
  }

  return clinic
    ? <ClinicPrivacyBoundary cleanEntryPath={`/clinic/${clinic.eventSlug}`}>{children}</ClinicPrivacyBoundary>
    : recovery ? <ClinicPrivacyBoundary cleanEntryPath="/clinic" recovery /> : children;
}
