import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { BriefcaseOverview } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

export default async function BriefcasePage() {
  const auth = await requireConsumerBriefcaseSession();
  const items = await listBriefcaseItems(auth.userId);

  return (
    <BriefcaseShell userEmail={auth.userEmail}>
      <BriefcaseOverview items={items} />
    </BriefcaseShell>
  );
}
