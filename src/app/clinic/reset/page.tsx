import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClinicPrivacyBoundary } from "@/components/clinic-mode/ClinicPrivacyBoundary";

export const dynamic = "force-dynamic";
export default async function ClinicResetRecoveryPage() {
  const jar = await cookies();
  // An anonymous device with no handoff, receipt or pending reset is genuinely
  // clean. Missing Clinic cookies with authentication or a pending marker are
  // explicitly NOT this case. No marker can grant closure or unlock authority.
  if (!jar.getAll().some(c => /^(sb-|clinic_)/.test(c.name))) redirect("/clinic");
  return <ClinicPrivacyBoundary cleanEntryPath="/clinic" recovery />;
}
