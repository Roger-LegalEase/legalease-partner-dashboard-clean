import { ClinicPrivacyBoundary } from "@/components/clinic-mode/ClinicPrivacyBoundary";

export const dynamic = "force-dynamic";
export default function ClinicResetRecoveryPage() {
  return <ClinicPrivacyBoundary cleanEntryPath="/clinic" recovery />;
}
