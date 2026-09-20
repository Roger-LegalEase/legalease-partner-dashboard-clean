import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { PaymentsView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { decorateBriefcaseItemsForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";

export const dynamic = "force-dynamic";

export default async function BriefcasePaymentsPage() {
  const auth = await requireConsumerBriefcaseSession();
  const storedItems = await listBriefcaseItems(auth.userId);
  const items = await decorateBriefcaseItemsForPresentation({
    consumerAuthUserId: auth.userId,
    items: storedItems.filter((item) => item.type !== "wilma_conversation")
  });

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="settings" breadcrumb={<b className="text-[#1A1D26]">Payments</b>}>
      <PaymentsView items={items} />
    </BriefcaseShell>
  );
}
