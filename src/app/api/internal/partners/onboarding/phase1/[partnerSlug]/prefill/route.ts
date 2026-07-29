import type { NextRequest } from "next/server";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import {
  addStructuredPrefillSuggestion,
  applyOnboardingPrefill,
  getInternalPrefillSnapshot,
  importKnownPartnerData,
  reviewPrefillSuggestion
} from "@/lib/partners/onboarding/prefill-service";
import {
  assertSameOrigin,
  readBoundedJson,
  requireRequestId
} from "@/lib/partners/onboarding/request-security";
import { ONBOARDING_SECTION_ORDER } from "@/lib/partners/onboarding/schema";
import type { OnboardingSectionKey } from "@/lib/partners/onboarding/types";
import {
  isPrefillSourceType,
  type PrefillSourceType
} from "@/lib/partners/onboarding/prefill-domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    const { partnerSlug } = await params;
    const context = await requireInternalOnboardingContext(partnerSlug);
    return onboardingJson({
      success: true,
      snapshot: await getInternalPrefillSnapshot(context)
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ partnerSlug: string }> }
) {
  try {
    assertSameOrigin(request);
    const { partnerSlug } = await params;
    const context = await requireInternalOnboardingContext(partnerSlug);
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    const action = requiredString(body.action, 40);
    const payload = objectValue(body.payload);
    let result: unknown;

    if (action === "import_known") {
      result = await importKnownPartnerData(context, { requestId });
    } else if (action === "add") {
      result = await addStructuredPrefillSuggestion(context, {
        requestId,
        sectionKey: sectionKey(payload.sectionKey),
        fieldKey: requiredString(payload.fieldKey, 120),
        proposedValue: payload.proposedValue,
        sourceType: sourceType(payload.sourceType),
        sourceLabel: requiredString(payload.sourceLabel, 200),
        sourceReferenceId: optionalString(payload.sourceReferenceId, 200),
        confidence: optionalConfidence(payload.confidence)
      });
    } else if (
      action === "approve" ||
      action === "reject" ||
      action === "supersede"
    ) {
      result = await reviewPrefillSuggestion(context, {
        requestId,
        workspaceId: requiredUuid(body.workspaceId),
        valueId: requiredUuid(payload.valueId),
        expectedBatchVersion: requiredVersion(payload.expectedBatchVersion),
        action
      });
    } else if (action === "apply") {
      result = await applyOnboardingPrefill(context, {
        requestId,
        workspaceId: requiredUuid(body.workspaceId),
        expectedWorkspaceVersion: requiredVersion(
          body.expectedWorkspaceVersion
        ),
        selectedValueIds: uuidArray(payload.selectedValueIds)
      });
    } else {
      throw new Phase1OnboardingError(
        "invalid_input",
        "Choose a supported prefill action."
      );
    }

    return onboardingJson({
      success: true,
      result,
      snapshot: await getInternalPrefillSnapshot(context)
    });
  } catch (error) {
    return onboardingHttpError(error);
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "A typed prefill operation is required."
    );
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Phase1OnboardingError("invalid_input", "A required value is missing.");
  }
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (
    normalized.length < 1 ||
    normalized.length > maxLength ||
    /[\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    throw new Phase1OnboardingError("invalid_input", "A required value is invalid.");
  }
  return normalized;
}

function optionalString(value: unknown, maxLength: number): string | null {
  return value === null || value === undefined || value === ""
    ? null
    : requiredString(value, maxLength);
}

function requiredUuid(value: unknown): string {
  const normalized = requiredString(value, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      normalized
    )
  ) {
    throw new Phase1OnboardingError(
      "workspace_not_found",
      "Onboarding prefill record not found."
    );
  }
  return normalized.toLowerCase();
}

function requiredVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "A current record version is required."
    );
  }
  return Number(value);
}

function uuidArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Choose one or more approved suggestions."
    );
  }
  return [...new Set(value.map(requiredUuid))];
}

function sectionKey(value: unknown): OnboardingSectionKey {
  const key = requiredString(value, 100);
  if (!(ONBOARDING_SECTION_ORDER as readonly string[]).includes(key)) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Choose a valid onboarding section."
    );
  }
  return key as OnboardingSectionKey;
}

function sourceType(value: unknown): PrefillSourceType {
  if (!isPrefillSourceType(value)) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Choose a supported source type."
    );
  }
  return value;
}

function optionalConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const confidence = Number(value);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Phase1OnboardingError(
      "invalid_input",
      "Confidence must be between 0 and 1."
    );
  }
  return confidence;
}
