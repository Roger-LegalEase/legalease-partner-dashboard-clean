import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { ClinicValidationError } from "@/lib/clinic-mode/validation";
import { requireConsumerBriefcaseApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { assertSameOrigin, PrivacyOriginError, PrivacyRequestError, readPrivacyJsonBody, PRIVACY_RESPONSE_HEADERS } from "@/lib/expungement-ai/privacy/request-security";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { RegistrationInputError } from "./registration-service";
import { RestrictedFieldError } from "./restricted-fields";

// Shared plumbing for the legal-aid API routes. Every response is private and
// uncacheable; every mutation is same-origin; participants and staff are
// resolved through the existing session helpers, never from the body.

export function legalAidJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVACY_RESPONSE_HEADERS });
}

export function legalAidErrorResponse(error: unknown): NextResponse {
  if (error instanceof ClinicValidationError || error instanceof RegistrationInputError) return legalAidJson({ success: false, error: error.message }, 400);
  if (error instanceof PrivacyOriginError || error instanceof PrivacyRequestError) return legalAidJson({ success: false, error: error.message }, error.status);
  if (error instanceof RestrictedFieldError) return legalAidJson({ success: false, error: "Protected storage is not configured in this environment." }, 503);
  if (error instanceof ClinicServiceError) {
    const status = error.code === "unauthenticated" ? 401 : error.code === "forbidden" ? 403 : error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 503;
    return legalAidJson({ success: false, error: error.message }, status);
  }
  // An unexpected failure is logged by message and stack only; request bodies
  // and answers are never logged here, so a protected value cannot leak.
  console.error("legal-aid route failure:", error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error));
  return legalAidJson({ success: false, error: "The request could not be completed." }, 500);
}

export type ParticipantActor = { ok: true; userId: string; userEmail: string | null } | { ok: false; response: NextResponse };

export async function participantActor(request: NextRequest, { mutation = true }: { mutation?: boolean } = {}): Promise<ParticipantActor> {
  if (mutation) assertSameOrigin(request);
  const session = await requireConsumerBriefcaseApiSession();
  if (!session.ok) return { ok: false, response: session.response };
  return { ok: true, userId: session.userId, userEmail: session.userEmail ?? null };
}

export type StaffActor = { authUserId: string; kind: "partner" | "internal_admin"; partnerSlug: string | null; role: string };

/** An authenticated partner_users identity (partner admin, partner staff, or internal admin). Event-level authority is decided by the legal-aid predicates, not here. */
export async function staffActor(request: NextRequest, { mutation = true }: { mutation?: boolean } = {}): Promise<StaffActor> {
  if (mutation) assertSameOrigin(request);
  try {
    const actor = await resolveSessionPartner();
    return actor.kind === "partner"
      ? { authUserId: actor.authUserId, kind: "partner", partnerSlug: actor.partnerSlug, role: actor.role }
      : { authUserId: actor.authUserId, kind: "internal_admin", partnerSlug: null, role: actor.role };
  } catch (error) {
    if (error instanceof SessionPartnerError) throw new ClinicServiceError(error.code === "unauthenticated" ? "unauthenticated" : "forbidden", "Staff sign-in is required.");
    throw error;
  }
}

/** Either a participant or a staff member; used by the shared document download route. */
export async function anyActor(request: NextRequest, options: { mutation?: boolean } = {}): Promise<{ userId: string; kind: "participant" | "staff" } | { response: NextResponse }> {
  if (options.mutation) assertSameOrigin(request);
  const session = await requireConsumerBriefcaseApiSession();
  if (session.ok) return { userId: session.userId, kind: "participant" };
  try {
    const staff = await resolveSessionPartner();
    return { userId: staff.authUserId, kind: "staff" };
  } catch {
    return { response: session.response };
  }
}

/** JSON body reader with a route-chosen limit; the intake draft and a drawn signature are larger than the privacy routes' 8 KiB. */
export async function readJson(request: NextRequest, limitBytes = 8 * 1024): Promise<Record<string, unknown>> {
  if (limitBytes <= 8 * 1024) return readPrivacyJsonBody(request);
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) throw new PrivacyRequestError("invalid_content_type", "Send this request as JSON.", 415);
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > limitBytes) throw new PrivacyRequestError("payload_too_large", "This request is too large.", 413);
  if (!request.body) throw new PrivacyRequestError("invalid_json", "This request had no body.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limitBytes) { await reader.cancel().catch(() => null); throw new PrivacyRequestError("payload_too_large", "This request is too large.", 413); }
    chunks.push(value);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new PrivacyRequestError("invalid_json", "This request was not valid JSON.", 400); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new PrivacyRequestError("invalid_json", "This request was not a JSON object.", 400);
  return parsed as Record<string, unknown>;
}

export function str(body: Record<string, unknown>, key: string, max = 4000): string {
  const value = body[key];
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function nullableStr(body: Record<string, unknown>, key: string, max = 4000): string | null {
  const value = str(body, key, max);
  return value ? value : null;
}

export function uuidOrThrow(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ClinicValidationError(`${label} is invalid.`);
  return value.toLowerCase();
}

export function nullableIso(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new ClinicValidationError(`${label} must be a valid date.`);
  return new Date(value).toISOString();
}

export function privateFileHeaders(filename: string, contentType: string, length: number): Record<string, string> {
  return {
    ...PRIVACY_RESPONSE_HEADERS,
    "Content-Type": contentType,
    "Content-Length": String(length),
    "Content-Disposition": `inline; filename="${filename.replace(/["\r\n]/g, "_")}"`
  };
}
