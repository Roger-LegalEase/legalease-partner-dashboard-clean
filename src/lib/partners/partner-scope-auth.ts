import "server-only";

import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";

// Resolves the partner slug the caller is authorized to act on. Partner
// admins/staff are locked to their own slug (a mismatched requested slug is a
// hard failure, never a silent switch). Internal admins may act on any slug but
// must name one. This is the app-layer guard against cross-partner access.
export async function resolveAuthorizedPartnerSlug(
  requestedSlug?: string | null
): Promise<{ partnerSlug: string; isInternalAdmin: boolean }> {
  const session = await resolveSessionPartner();
  const requested = (requestedSlug ?? "").trim();

  if (session.kind === "internal_admin") {
    if (!requested) {
      throw new SessionPartnerError("partner_identity_invalid", "partnerSlug is required for internal admin actions.");
    }
    return { partnerSlug: requested, isInternalAdmin: true };
  }

  if (requested && requested !== session.partnerSlug) {
    throw new SessionPartnerError("partner_identity_invalid", "You cannot manage another organization's access codes.");
  }
  return { partnerSlug: session.partnerSlug, isInternalAdmin: false };
}

// Translates a SessionPartnerError to an HTTP status the way the existing
// partner routes do (401 for unauthenticated, 403 for everything else).
export function partnerAuthStatus(error: SessionPartnerError): number {
  return error.code === "unauthenticated" ? 401 : 403;
}
