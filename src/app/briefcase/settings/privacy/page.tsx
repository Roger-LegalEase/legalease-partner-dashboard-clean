import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { PrivacyDataView } from "@/components/expungement-ai/PrivacyDataView";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { listParticipantPrivacyRequestSummaries } from "@/lib/expungement-ai/privacy/summaries";

export const dynamic = "force-dynamic";

export default async function BriefcasePrivacyPage() {
  const auth = await requireConsumerBriefcaseSession("/briefcase/settings/privacy");
  const items = await listBriefcaseItems(auth.userId);
  const requests = await listParticipantPrivacyRequestSummaries(auth.userId);

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      activeNav="settings"
      breadcrumb={<b className="text-[#1A1D26]">Privacy and data</b>}
    >
      <PrivacyDataView items={items} requests={requests} />
    </BriefcaseShell>
  );
}
