import type { ReactNode } from "react";
import { ClinicPrivacyBoundary } from "@/components/clinic-mode/ClinicPrivacyBoundary";
import { getLegalAidDeviceContext } from "@/lib/legal-aid/device-context";

// Invoke the page only after the device gate: an expired handoff must not
// render, serialize or query confidential participant content.
export async function withLegalAidDeviceBoundary(render: () => Promise<ReactNode>) {
  const device = await getLegalAidDeviceContext();
  if (device?.recovery) return <ClinicPrivacyBoundary {...device} />;
  const content = await render();
  return device ? <ClinicPrivacyBoundary {...device}>{content}</ClinicPrivacyBoundary> : content;
}
