import type { NextRequest } from "next/server";

import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError } from "@/lib/partners/onboarding/http";
import {
  approvedSnapshotFilename,
  loadApprovedSnapshot
} from "@/lib/partners/onboarding/artifact-service";
import { renderApprovedSnapshotPdf } from "@/lib/partners/onboarding/artifact-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const { partnerSlug } = await params;
    const context = await requireInternalOnboardingContext(partnerSlug);
    const versionId = request.nextUrl.searchParams.get("versionId");
    if (!versionId || versionId.length > 40) {
      throw new Phase1OnboardingError("invalid_input", "A version is required.");
    }

    const snapshot = await loadApprovedSnapshot(context, {
      artifactVersionId: versionId,
      audience: "internal"
    });
    const bytes = await renderApprovedSnapshotPdf(snapshot);

    // A bounded private response. No public URL is minted, and the body is
    // always a PDF: an unauthenticated caller is rejected above and never
    // receives login HTML with a document content type.
    return new Response(bytes as BodyInit, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-length": String(bytes.byteLength),
        "content-disposition": `attachment; filename="${approvedSnapshotFilename(snapshot)}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer"
      }
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}
