import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { BriefcaseOverview } from "@/components/expungement-ai/BriefcaseViews";
import { BriefcaseSaveIntent } from "@/components/expungement-ai/BriefcaseSaveIntent";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

export default async function BriefcasePage() {
  const auth = await requireConsumerBriefcaseSession();
  const items = await listBriefcaseItems(auth.userId);

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="briefcase" showNewCheck breadcrumb={<b className="text-[#1A1D26]">Briefcase</b>}>
      <BriefcaseSaveIntent />
      <BriefcaseOverview items={items} userEmail={auth.userEmail} />
    </BriefcaseShell>
  );
}
