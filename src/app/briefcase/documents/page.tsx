import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";
import { DocumentsView } from "@/components/expungement-ai/BriefcaseViews";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";
import { listBriefcaseItems } from "@/lib/expungement-ai/briefcase";

export const dynamic = "force-dynamic";

export default async function BriefcaseDocumentsPage() {
  const auth = await requireConsumerBriefcaseSession();
  const items = await listBriefcaseItems(auth.userId);

  return (
    <BriefcaseShell userEmail={auth.userEmail}>
      <DocumentsView items={items} />
    </BriefcaseShell>
  );
}
