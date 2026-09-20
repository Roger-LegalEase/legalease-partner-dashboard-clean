import type { NextRequest } from "next/server";
import { approvePolicyProfile, requireLegalAidAdministrator } from "@/lib/legal-aid/admin-service";
import { legalAidErrorResponse, legalAidJson, nullableStr, readJson, uuidOrThrow } from "@/lib/legal-aid/api";
import { assertSameOrigin } from "@/lib/expungement-ai/privacy/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Approves a draft profile. The database refuses the preparer approving their
// own draft and retires the previously approved version.
export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireLegalAidAdministrator();
    const { profileId } = await params;
    const body = await readJson(request);
    const outcome = await approvePolicyProfile({ actorUserId: actor.authUserId, profileId: uuidOrThrow(profileId, "Policy profile"), note: nullableStr(body, "note", 600) });
    return legalAidJson({ success: true, outcome });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
