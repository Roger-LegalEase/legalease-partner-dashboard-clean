import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { RemindersView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";

export const dynamic = "force-dynamic";

export default async function BriefcaseRemindersPage() {
  const auth = await requireConsumerBriefcaseSession();

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="settings" breadcrumb={<b className="text-[#1A1D26]">Reminders</b>}>
      <RemindersView />
    </BriefcaseShell>
  );
}
