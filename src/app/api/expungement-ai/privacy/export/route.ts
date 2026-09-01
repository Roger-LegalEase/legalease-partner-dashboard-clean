import { NextRequest, NextResponse } from "next/server";

import { requireParticipantPrivacyApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { PRIVACY_RATE_LIMIT_POLICIES } from "@/lib/expungement-ai/privacy/contract";
import { buildParticipantExportPackage } from "@/lib/expungement-ai/privacy/export-package";
import { participantSubjectPseudonym } from "@/lib/expungement-ai/privacy/pseudonym";
import {
  assertSameOrigin,
  PrivacyOriginError,
  PrivacyRequestError,
  PRIVACY_RESPONSE_HEADERS,
  privacyJson,
  readPrivacyJsonBody,
  requireIdempotencyKey
} from "@/lib/expungement-ai/privacy/request-security";
import {
  completePrivacyRequest,
  openPrivacyRequest,
  PrivacyStoreUnavailableError,
  recordPrivacyStep,
  requirePrivacyAdminClient
} from "@/lib/expungement-ai/privacy/store";
import { checkResumeRateLimit } from "@/lib/expungement-ai/screening-resume-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download a copy of my data.
 *
 * POST, not GET, and same-origin checked, for one reason: a GET that returns a
 * participant's whole record can be triggered by an <img> tag on someone else's
 * page. It is not destructive, so it needs no recent-auth proof — but it is
 * still recorded as a privacy request, because "when did you last give me a
 * copy of my data?" is a question a participant is entitled to an answer to.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof PrivacyOriginError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  const session = await requireParticipantPrivacyApiSession();
  if (!session.ok) return session.response;

  let body: Record<string, unknown> = {};
  try {
    body = await readPrivacyJsonBody(request);
  } catch (error) {
    if (error instanceof PrivacyRequestError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  let idempotencyKey: string;
  try {
    idempotencyKey = requireIdempotencyKey(body.idempotencyKey);
  } catch (error) {
    if (error instanceof PrivacyRequestError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  let supabase;
  try {
    supabase = requirePrivacyAdminClient();
  } catch (error) {
    if (error instanceof PrivacyStoreUnavailableError) {
      return privacyJson({ error: "Data exports are not available in this environment.", code: error.code }, 503);
    }
    throw error;
  }

  const limit = await checkResumeRateLimit({
    supabase,
    scope: PRIVACY_RATE_LIMIT_POLICIES.exportUser.scope,
    keyParts: [session.userId],
    maxAttempts: PRIVACY_RATE_LIMIT_POLICIES.exportUser.maxAttempts,
    windowMs: PRIVACY_RATE_LIMIT_POLICIES.exportUser.windowMs
  });
  if (!limit.ok) {
    return privacyJson(
      { error: "You have requested several copies recently. Try again a little later.", code: "rate_limited" },
      429
    );
  }

  const privacyRequest = await openPrivacyRequest({
    supabase,
    userId: session.userId,
    requestType: "export",
    idempotencyKey,
    subjectPseudonym: participantSubjectPseudonym(session.userId),
    recentAuthVerifiedAt: null,
    recentAuthMethod: null,
    recentAuthProofHash: null,
    targetMatterItemId: null
  });

  const packageBody = await buildParticipantExportPackage({
    supabase,
    userId: session.userId,
    userEmail: session.userEmail
  });

  await recordPrivacyStep({
    supabase,
    requestId: privacyRequest.id,
    stepKey: "collect_export",
    status: "completed",
    detail: {
      matters: packageBody.matters.length,
      screenings: packageBody.screenings.length,
      packets: packageBody.packets.length,
      uploads: packageBody.uploads.length
    }
  });

  const receiptCode = `EXP-${privacyRequest.id.toUpperCase()}`;
  await recordPrivacyStep({
    supabase,
    requestId: privacyRequest.id,
    stepKey: "issue_receipt",
    status: "completed",
    detail: { receiptCode }
  });

  if (privacyRequest.status !== "completed") {
    await completePrivacyRequest({
      supabase,
      requestId: privacyRequest.id,
      receipt: {
        receiptCode,
        requestType: "export",
        completedAt: packageBody.generatedAt,
        note: "A copy of your data was prepared and downloaded. Nothing was deleted."
      },
      receiptCode,
      retentionTreatment: {}
    });
  }

  const fileName = `expungement-ai-my-data-${packageBody.generatedAt.slice(0, 10)}.json`;
  return new NextResponse(`${JSON.stringify({ ...packageBody, receiptCode }, null, 2)}\n`, {
    status: 200,
    headers: {
      ...PRIVACY_RESPONSE_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}
