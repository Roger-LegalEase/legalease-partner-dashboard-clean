export type Phase1OnboardingErrorCode =
  | "feature_disabled"
  | "unauthenticated"
  | "forbidden"
  | "workspace_not_found"
  | "commercially_blocked"
  | "invalid_input"
  | "revision_conflict"
  | "request_in_progress"
  | "duplicate_request"
  | "invalid_transition"
  | "required_asset_missing"
  | "persistence_failed"
  | "storage_failed";

export class Phase1OnboardingError extends Error {
  constructor(
    readonly code: Phase1OnboardingErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = "Phase1OnboardingError";
  }
}

export function onboardingErrorStatus(code: Phase1OnboardingErrorCode): number {
  switch (code) {
    case "feature_disabled":
    case "workspace_not_found":
      return 404;
    case "unauthenticated":
      return 401;
    case "forbidden":
      return 403;
    case "invalid_input":
      return 400;
    case "revision_conflict":
    case "request_in_progress":
    case "duplicate_request":
    case "invalid_transition":
    case "commercially_blocked":
    case "required_asset_missing":
      return 409;
    case "storage_failed":
    case "persistence_failed":
      return 503;
  }
}
