import "server-only";

import { cookies } from "next/headers";
import { getActiveClinicParticipantContext, hasClinicDeviceRecoveryContext } from "@/lib/clinic-mode/participant-service";

// Recovery presence never grants Legal Aid access. The ordinary participant
// and event-permission checks still run after this device gate.
export async function getLegalAidDeviceContext(): Promise<{ recovery: boolean; cleanEntryPath: string } | null> {
  if (!await hasClinicDeviceRecoveryContext()) return null;
  const locked = { recovery: true, cleanEntryPath: "/clinic" };
  if ((await cookies()).get("clinic_reset_pending")?.value) return locked;
  try {
    const clinic = await getActiveClinicParticipantContext();
    return clinic ? { recovery: false, cleanEntryPath: `/clinic/${clinic.eventSlug}` } : locked;
  } catch {
    return locked;
  }
}
