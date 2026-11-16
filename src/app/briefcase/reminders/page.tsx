import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { RemindersView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { buildFilingChecklist, collectBriefcaseReminders, matterHasFilingChecklist } from "@/lib/expungement-ai/filing-checklist";

export const dynamic = "force-dynamic";

export default async function BriefcaseRemindersPage() {
  const auth = await requireConsumerBriefcaseSession("/briefcase/reminders");
  const items = await listBriefcaseItems(auth.userId);
  const reminders = collectBriefcaseReminders(items);
  const checklistProgress = items
    .filter(matterHasFilingChecklist)
    .map((item) => {
      const checklist = buildFilingChecklist(item);
      return { itemId: item.id, title: item.title, state: item.state, done: checklist.done, total: checklist.total };
    })
    .filter((matter) => matter.total > 0);

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="reminders" breadcrumb={<b className="text-[#1A1D26]">Reminders</b>}>
      <RemindersView reminders={reminders} checklistProgress={checklistProgress} />
    </BriefcaseShell>
  );
}
