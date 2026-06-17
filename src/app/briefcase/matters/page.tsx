import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { BriefcaseAuthGate, MattersView } from "@/components/expungement-ai/BriefcaseViews";
import { getConsumerBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";

export const dynamic = "force-dynamic";

export default async function BriefcaseMattersPage() {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated) return <BriefcaseAuthGate />;

  return (
    <BriefcaseShell userEmail={auth.userEmail}>
      <MattersView items={getConsumerBriefcaseItems()} />
    </BriefcaseShell>
  );
}
