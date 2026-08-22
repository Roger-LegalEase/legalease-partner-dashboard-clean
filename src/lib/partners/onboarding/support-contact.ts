// The single source for how a partner reaches LegalEase for help.
//
// Before this, the onboarding home told partners to use "the support channel already
// provided to your organization" and gave no destination, and every other failure state
// offered no route at all. Components must not read process.env directly for this: the
// override belongs in one place so the address cannot drift between surfaces.
//
// Configure RCAP_PARTNER_SUPPORT_EMAIL to override. The fallback is deliberate and
// documented in .env.example.

export const DEFAULT_RCAP_PARTNER_SUPPORT_EMAIL = "partners@legalease.com";

export const RCAP_PARTNER_SUPPORT_EMAIL_ENV_KEY = "RCAP_PARTNER_SUPPORT_EMAIL";

export type PartnerSupportContact = {
  email: string;
  /** href for an anchor. Always a real mailto, never a dead label. */
  mailtoHref: string;
  /** Visible link text. The address itself, so the partner can copy it or use it elsewhere. */
  label: string;
  /** Accessible name, for when the visible text is short or contextual. */
  accessibleName: string;
  /** True when the address came from configuration rather than the built-in fallback. */
  configured: boolean;
};

function readEnv(env: Record<string, string | undefined>): string | null {
  const raw = env[RCAP_PARTNER_SUPPORT_EMAIL_ENV_KEY];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // A malformed override must not become a broken mailto link. Fall back instead.
  if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export function getPartnerSupportContact(
  env: Record<string, string | undefined> = process.env
): PartnerSupportContact {
  const override = readEnv(env);
  const email = override ?? DEFAULT_RCAP_PARTNER_SUPPORT_EMAIL;
  return {
    email,
    mailtoHref: `mailto:${email}`,
    label: email,
    accessibleName: `Email LegalEase partner support at ${email}`,
    configured: override !== null
  };
}

/**
 * A mailto that arrives with context already in the subject, so the partner does not have
 * to explain which organization and which step they are stuck on.
 */
export function partnerSupportMailto(
  context: { organizationName?: string | null; subject?: string | null } = {},
  env: Record<string, string | undefined> = process.env
): string {
  const { mailtoHref, email } = getPartnerSupportContact(env);
  const parts: string[] = [];
  if (context.subject) parts.push(context.subject);
  if (context.organizationName) parts.push(context.organizationName);
  if (!parts.length) return mailtoHref;
  const subject = `RCAP setup: ${parts.join(", ")}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
