import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { PrivacyDataView } from "@/components/expungement-ai/PrivacyDataView";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { listParticipantPrivacyRequestSummaries } from "@/lib/expungement-ai/privacy/summaries";
import { participantPrivacyReadiness } from "@/lib/expungement-ai/privacy/readiness";
import { participantPrivacyActorEligible } from "@/lib/expungement-ai/privacy/api-session";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BriefcasePrivacyPage() {
  const auth = await requireConsumerBriefcaseSession("/briefcase/settings/privacy");
  if (!(await participantPrivacyActorEligible(auth.userId))) notFound();
  // Export and single-matter deletion use the base privacy contract. Account
  // deletion has stricter processor and resumable-ledger requirements and is
  // disabled independently below when that superset is unavailable.
  const readiness = await participantPrivacyReadiness();
  if (!readiness.baseReady) notFound();
  const items = await listBriefcaseItems(auth.userId);
  const requests = await listParticipantPrivacyRequestSummaries(auth.userId);

  return (
    <BriefcaseShell
      userEmail={auth.userEmail}
      activeNav="settings"
      breadcrumb={<b className="text-[#1A1D26]">Privacy and data</b>}
    >
      <PrivacyDataView
        accountDeletionReady={readiness.accountDeletionReady}
        items={items}
        requests={requests}
      />
    </BriefcaseShell>
  );
}
