import type { NextRequest } from "next/server";

export const ONBOARDING_JSON_BODY_LIMIT_BYTES = 64 * 1024;
export const ONBOARDING_PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff"
} as const;

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class OnboardingRequestError extends Error {
  constructor(
    readonly code:
      | "invalid_content_type"
      | "payload_too_large"
      | "invalid_json"
      | "invalid_origin"
      | "invalid_request_id",
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "OnboardingRequestError";
  }
}

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin || !host) {
    throw new OnboardingRequestError(
      "invalid_origin",
      "This request could not be verified. Refresh the page and try again.",
      403
    );
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new OnboardingRequestError(
      "invalid_origin",
      "This request could not be verified. Refresh the page and try again.",
      403
    );
  }

  const expectedProtocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(":", "");
  const normalizedExpectedProtocol = `${expectedProtocol}:`;

  if (originUrl.host.toLowerCase() !== host.toLowerCase() || originUrl.protocol !== normalizedExpectedProtocol) {
    throw new OnboardingRequestError(
      "invalid_origin",
      "This request could not be verified. Refresh the page and try again.",
      403
    );
  }
}

export async function readBoundedJson(
  request: NextRequest,
  limitBytes = ONBOARDING_JSON_BODY_LIMIT_BYTES
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new OnboardingRequestError(
      "invalid_content_type",
      "Send onboarding updates as JSON.",
      415
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
    throw new OnboardingRequestError(
      "payload_too_large",
      "This section is too large to save. Remove extra content and try again.",
      413
    );
  }

  const bytes = await readBoundedRequestBytes(
    request,
    limitBytes,
    "This section is too large to save. Remove extra content and try again."
  );
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new OnboardingRequestError(
      "invalid_json",
      "The onboarding update was not valid UTF-8 JSON.",
      400
    );
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("object required");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new OnboardingRequestError(
      "invalid_json",
      "The onboarding update was not valid JSON.",
      400
    );
  }
}

export async function readBoundedMultipartFormData(
  request: NextRequest,
  limitBytes: number
): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  const normalizedContentType = contentType.toLowerCase();
  if (
    !normalizedContentType.startsWith("multipart/form-data;") ||
    !normalizedContentType.includes("boundary=")
  ) {
    throw new OnboardingRequestError(
      "invalid_content_type",
      "Upload organizational assets as multipart form data.",
      415
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
    throw new OnboardingRequestError(
      "payload_too_large",
      "The organizational asset upload is too large.",
      413
    );
  }
  const bytes = await readBoundedRequestBytes(
    request,
    limitBytes,
    "The organizational asset upload is too large."
  );

  try {
    const responseBody = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(responseBody).set(bytes);
    return await new Response(responseBody, {
      headers: { "content-type": contentType }
    }).formData();
  } catch {
    throw new OnboardingRequestError(
      "invalid_json",
      "The organizational asset upload could not be read.",
      400
    );
  }
}

async function readBoundedRequestBytes(
  request: NextRequest,
  limitBytes: number,
  tooLargeMessage: string
): Promise<Uint8Array> {
  if (!request.body) {
    throw new OnboardingRequestError(
      "invalid_json",
      "The request body was empty.",
      400
    );
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > limitBytes) {
        await reader.cancel();
        throw new OnboardingRequestError(
          "payload_too_large",
          tooLargeMessage,
          413
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function requireRequestId(value: unknown): string {
  if (typeof value !== "string" || !REQUEST_ID_PATTERN.test(value)) {
    throw new OnboardingRequestError(
      "invalid_request_id",
      "A valid request ID is required.",
      400
    );
  }
  return value.toLowerCase();
}
