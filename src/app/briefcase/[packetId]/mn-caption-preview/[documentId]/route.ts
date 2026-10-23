import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";
import { readProtectedPacketVerification } from "@/lib/expungement-ai/verification-cas";
import { requireConsumerBriefcaseApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { mnHeldCaptionPreparationFor } from "@/lib/rcap/render/mn-held-caption-consumer";
import { MN_CAPTION_SOURCE_FILES, renderMnPetitionCaptionPreview } from "../../../../../../scripts/rcap-official-forms/mn-petition-caption-preview.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "cache-control": "private, no-store, max-age=0", pragma: "no-cache", "x-content-type-options": "nosniff" };
const unavailable = () => NextResponse.json({ error: "Draft preview unavailable." }, { status: 404, headers: privateHeaders });

export async function GET(request: NextRequest, context: { params: Promise<{ packetId: string; documentId: string }> }) {
  const session = await requireConsumerBriefcaseApiSession();
  if (!session.ok) return session.response;
  const { packetId, documentId } = await context.params;
  if (!Object.hasOwn(MN_CAPTION_SOURCE_FILES, documentId)
    || documentId === "FEE102" && request.nextUrl.searchParams.get("feeWaiver") !== "requested") return unavailable();
  try {
    const item = await getBriefcaseItem(session.userId, packetId);
    if (!item) return unavailable();
    const read = await readProtectedPacketVerification({ consumerAuthUserId: session.userId, briefcaseItemId: item.id });
    const preparation = read.ok ? mnHeldCaptionPreparationFor(read.value) : null;
    if (!preparation) return unavailable();
    const file = MN_CAPTION_SOURCE_FILES[documentId as keyof typeof MN_CAPTION_SOURCE_FILES];
    const sourceBytes = await readFile(path.join(process.cwd(), file));
    const result = await renderMnPetitionCaptionPreview({ documentId, sourceBytes, preparation, includeFeeWaiver: documentId === "FEE102" });
    return new NextResponse(new Uint8Array(result.bytes), { headers: {
      ...privateHeaders, "content-type": "application/pdf", "content-disposition": `inline; filename="MN-${documentId}-held-caption.pdf"`,
      "x-legalease-output-status": "held_preview"
    } });
  } catch { return unavailable(); }
}
