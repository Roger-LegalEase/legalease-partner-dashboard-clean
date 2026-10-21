import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { PrivacyDataView } from "@/components/expungement-ai/PrivacyDataView";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { listParticipantPrivacyRequestSummaries } from "@/lib/expungement-ai/privacy/summaries";
import { participantPrivacyReadiness } from "@/lib/expungement-ai/privacy/readiness";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BriefcasePrivacyPage() {
  const auth = await requireConsumerBriefcaseSession("/briefcase/settings/privacy");
  // A control that cannot do what it says is worse than an absent one. If the
  // migration or either secret is missing in THIS deployment, the page is not
  // served at all rather than offering a deletion that would fail partway.
  const readiness = await participantPrivacyReadiness();
  if (!readiness.ready) notFound();
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
