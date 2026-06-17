import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { BriefcaseAuthGate, SettingsView } from "@/components/expungement-ai/BriefcaseViews";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";

export const dynamic = "force-dynamic";

export default async function BriefcaseSettingsPage() {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated) return <BriefcaseAuthGate />;

  return (
    <BriefcaseShell userEmail={auth.userEmail}>
      <SettingsView />
    </BriefcaseShell>
  );
}
