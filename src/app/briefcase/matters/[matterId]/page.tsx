import BriefcaseMatterDetailPage from "../../[packetId]/page";

/**
 * The canonical exact-matter destination.
 *
 * Contract §15: a successful claim always lands on the exact matter. The claim
 * service returns `/briefcase/matters/{matter_id}` and nothing else -- never a
 * generic dashboard, never an empty Briefcase.
 *
 * The older `/briefcase/{id}` route stays a working alias because links inside
 * the matter (packet information, review, downloads) are built from it and are
 * exercised by the existing browser suites. Rather than duplicate that page or
 * move it and break those links mid-phase, this route renders the same server
 * component under the canonical path. Consolidating the two lives in Phase 3,
 * where the Briefcase is normalized around the matter.
 */

export const dynamic = "force-dynamic";

export default async function BriefcaseMatterPage({
  params
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  return BriefcaseMatterDetailPage({ params: Promise.resolve({ packetId: matterId }) });
}
