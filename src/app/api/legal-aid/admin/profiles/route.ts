import type { NextRequest } from "next/server";
import { ClinicValidationError } from "@/lib/clinic-mode/validation";
import { loadProfileTemplate, preparePolicyProfile, requireLegalAidAdministrator } from "@/lib/legal-aid/admin-service";
import { legalAidErrorResponse, legalAidJson, readJson, str } from "@/lib/legal-aid/api";
import { INTAKE_SCHEMA_VERSION } from "@/lib/legal-aid/intake-schema";
import { assertSameOrigin } from "@/lib/expungement-ai/privacy/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prepares a policy profile draft from the partner's template (or a supplied
// document). A different administrator approves it; preparation alone
// authorises nothing.
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireLegalAidAdministrator();
    const body = await readJson(request, 64 * 1024);
    const partnerSlug = actor.kind === "partner" ? actor.partnerSlug : str(body, "partnerSlug", 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(partnerSlug)) throw new ClinicValidationError("Choose the organization.");
    const supplied = body.profile && typeof body.profile === "object" && !Array.isArray(body.profile) ? (body.profile as Record<string, unknown>) : null;
    const profile = supplied ?? loadProfileTemplate(partnerSlug);
    if (!profile) throw new ClinicValidationError("No policy profile template exists for this organization.");
    const profileId = await preparePolicyProfile({ actorUserId: actor.authUserId, partnerSlug, intakeSchemaVersion: INTAKE_SCHEMA_VERSION, profile });
    return legalAidJson({ success: true, profileId }, 201);
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
