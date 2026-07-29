import "server-only";

import { NextResponse } from "next/server";
import { Phase1OnboardingError, onboardingErrorStatus } from "./errors";
import {
  ONBOARDING_PRIVATE_RESPONSE_HEADERS,
  OnboardingRequestError
} from "./request-security";

export function onboardingJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: ONBOARDING_PRIVATE_RESPONSE_HEADERS
  });
}

export function onboardingHttpError(error: unknown): NextResponse {
  if (error instanceof Phase1OnboardingError) {
    const details =
      error.code === "invalid_input" || error.code === "revision_conflict"
        ? error.details
        : undefined;
    return onboardingJson(
      {
        success: false,
        code: error.code,
        error: error.message,
        ...(details ?? {})
      },
      onboardingErrorStatus(error.code)
    );
  }

  if (error instanceof OnboardingRequestError) {
    return onboardingJson(
      { success: false, code: error.code, error: error.message },
      error.status
    );
  }

  return onboardingJson(
    {
      success: false,
      code: "persistence_failed",
      error: "Program setup could not be updated. Try again."
    },
    503
  );
}
