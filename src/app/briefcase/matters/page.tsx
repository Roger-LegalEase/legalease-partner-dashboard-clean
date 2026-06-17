import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MattersView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

export default async function BriefcaseMattersPage() {
  const auth = await requireConsumerBriefcaseSession();
  const items = await listBriefcaseItems(auth.userId);

  return (
    <BriefcaseShell userEmail={auth.userEmail}>
      <MattersView items={items} />
    </BriefcaseShell>
  );
}
