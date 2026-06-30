import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { MattersView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

export default async function BriefcaseMattersPage() {
  const auth = await requireConsumerBriefcaseSession();
  const items = await listBriefcaseItems(auth.userId);

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="matters" breadcrumb={<b className="text-[#1A1D26]">My matters</b>}>
      <MattersView items={items} />
    </BriefcaseShell>
  );
}
