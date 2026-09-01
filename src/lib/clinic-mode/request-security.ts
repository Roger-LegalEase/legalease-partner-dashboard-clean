import { ClinicServiceError } from "@/lib/clinic-mode/errors";

export function isSameOriginClinicMutation(request: Request) {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === expected;

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

export function assertClinicMutationRequest(request: Request) {
  if (!isSameOriginClinicMutation(request)) {
    throw new ClinicServiceError("forbidden", "Invalid request origin.");
  }
}
