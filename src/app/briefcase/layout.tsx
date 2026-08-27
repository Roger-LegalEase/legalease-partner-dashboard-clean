import type { ReactNode } from "react";

import { ClinicPrivacyBoundary } from "@/components/clinic-mode/ClinicPrivacyBoundary";
import { getActiveClinicParticipantContext } from "@/lib/clinic-mode/participant-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BriefcaseLayout({ children }: { children: ReactNode }) {
  const clinic = await getActiveClinicParticipantContext();

  return clinic
    ? <ClinicPrivacyBoundary cleanEntryPath={`/clinic/${clinic.eventSlug}`}>{children}</ClinicPrivacyBoundary>
    : children;
}
