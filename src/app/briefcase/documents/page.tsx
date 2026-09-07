import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { DocumentsView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";
import { decorateConsumerBriefcaseItemsForPresentation } from "@/lib/expungement-ai/briefcase-consumer-presentation";

export const dynamic = "force-dynamic";

export default async function BriefcaseDocumentsPage() {
  const auth = await requireConsumerBriefcaseSession();
  const storedItems = await listBriefcaseItems(auth.userId);
  const items = await decorateConsumerBriefcaseItemsForPresentation({
    consumerAuthUserId: auth.userId,
    items: storedItems.filter((item) => item.type !== "wilma_conversation")
  });

  return (
    <BriefcaseShell userEmail={auth.userEmail} activeNav="documents" breadcrumb={<b className="text-[#1A1D26]">Documents</b>}>
      <DocumentsView items={items} />
    </BriefcaseShell>
  );
}
