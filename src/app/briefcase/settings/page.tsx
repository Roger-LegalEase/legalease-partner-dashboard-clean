import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { SettingsView } from "@/components/expungement-ai/BriefcaseViews";
import { participantPrivacyReadiness } from "@/lib/expungement-ai/privacy/readiness";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { decorateConsumerBriefcaseItemsForPresentation } from "@/lib/expungement-ai/briefcase-consumer-presentation";
import { participantPrivacyActorEligible } from "@/lib/expungement-ai/privacy/api-session";

export const dynamic = "force-dynamic";

export default async function BriefcaseSettingsPage() {
  const auth = await requireConsumerBriefcaseSession();
  const storedItems = await listBriefcaseItems(auth.userId);
  const items = await decorateConsumerBriefcaseItemsForPresentation({
    consumerAuthUserId: auth.userId,
    items: storedItems.filter((item) => item.type !== "wilma_conversation")
  });
  // The link appears only where the deployment can actually honour it.
  const { ready: privacyDeploymentReady } = await participantPrivacyReadiness();
  const privacyReady = privacyDeploymentReady && (await participantPrivacyActorEligible(auth.userId));

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="settings" breadcrumb={<b className="text-[#1A1D26]">Settings</b>}>
      <SettingsView items={items} privacyReady={privacyReady} />
    </BriefcaseShell>
  );
}
