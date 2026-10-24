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

// Literal read paths keep the tracer from expanding a dynamic read to the project root.
async function readCaptionSource(documentId: keyof typeof MN_CAPTION_SOURCE_FILES) {
  switch (documentId) {
    case "EXP102": return readFile(path.join(process.cwd(), "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Minnesota/EXP102_Current-2.pdf"));
    case "EXP104": return readFile(path.join(process.cwd(), "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Minnesota/EXP104_Current.pdf"));
    case "EXP105": return readFile(path.join(process.cwd(), "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Minnesota/EXP105_Current.pdf"));
    case "FEE102": return readFile(path.join(process.cwd(), "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/MN/04_SUPPORTING_PROCESS/MN__SUPPORT__FEE102__affidavit-to-request-fee-waiver__REV-2024-07__EN.pdf"));
  }
}

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
    const sourceBytes = await readCaptionSource(documentId as keyof typeof MN_CAPTION_SOURCE_FILES);
    const result = await renderMnPetitionCaptionPreview({ documentId, sourceBytes, preparation, includeFeeWaiver: documentId === "FEE102" });
    return new NextResponse(new Uint8Array(result.bytes), { headers: {
      ...privateHeaders, "content-type": "application/pdf", "content-disposition": `inline; filename="MN-${documentId}-held-caption.pdf"`,
      "x-legalease-output-status": "held_preview"
    } });
  } catch { return unavailable(); }
}
