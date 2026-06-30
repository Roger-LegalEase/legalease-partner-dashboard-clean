import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { SettingsView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";

export const dynamic = "force-dynamic";

export default async function BriefcaseSettingsPage() {
  const auth = await requireConsumerBriefcaseSession();

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="settings" breadcrumb={<b className="text-[#1A1D26]">Settings</b>}>
      <SettingsView />
    </BriefcaseShell>
  );
}
