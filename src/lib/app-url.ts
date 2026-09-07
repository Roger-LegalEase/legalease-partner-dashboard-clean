import {
  consumerAuthCallbackPath,
  type ConsumerAuthContinuation
} from "@/lib/expungement-ai/auth-continuation";

export const productionPartnerAppUrl = "https://legaleasepartner.com";
export const productionExpungementAiUrl = "https://expungement.ai";
export const productionLegalEaseUrl = "https://legalease.com";
export const productionAppUrl = productionPartnerAppUrl;
export const localAppUrl = "http://localhost:3000";

export function getPublicBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return process.env.NODE_ENV === "production" ? productionAppUrl : localAppUrl;
}

export function absoluteAppUrl(path: string) {
  return absoluteUrl(getPublicBaseUrl(), path);
}

export function getPartnerAppBaseUrl() {
  return configuredBaseUrl("NEXT_PUBLIC_LEGALEASE_PARTNER_URL") ??
    configuredBaseUrl("NEXT_PUBLIC_PARTNER_APP_URL") ??
    configuredBaseUrl("NEXT_PUBLIC_APP_URL") ??
    (process.env.NODE_ENV === "production" ? productionPartnerAppUrl : localAppUrl);
}

export function absolutePartnerAppUrl(path: string) {
  return absoluteUrl(getPartnerAppBaseUrl(), path);
}

export function getExpungementAiBaseUrl() {
  return configuredBaseUrl("NEXT_PUBLIC_EXPUNGEMENT_AI_URL") ??
    (process.env.NODE_ENV === "production" ? productionExpungementAiUrl : localAppUrl);
}

export function absoluteExpungementAiUrl(path: string) {
  return absoluteUrl(getExpungementAiBaseUrl(), path);
}

export function getLegalEaseBaseUrl() {
  return configuredBaseUrl("NEXT_PUBLIC_LEGALEASE_URL") ??
    (process.env.NODE_ENV === "production" ? productionLegalEaseUrl : localAppUrl);
}

export function absoluteLegalEaseUrl(path: string) {
  return absoluteUrl(getLegalEaseBaseUrl(), path);
}

export function absoluteUrl(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimTrailingSlash(baseUrl)}${normalizedPath}`;
}

const expungementAiHostnames = new Set(["expungement.ai", "www.expungement.ai"]);

export function isExpungementAiHostname(hostname: string | null | undefined) {
  if (!hostname) return false;
  return expungementAiHostnames.has(hostname.toLowerCase());
}

// Context-aware password-reset target. The /auth/forgot-password route is shared
// by both products, so the reset email must return the user to the domain they
// came from: Expungement.ai consumers back to expungement.ai/briefcase, partner
// staff back to legaleasepartner.com/partner/dashboard. Prefer an explicit
// `product` hint (passed by the consumer sign-in link), then fall back to the
// current hostname, then default to the partner app (the historical behavior).
export function passwordResetRedirectUrl(context: {
  product?: string | null;
  hostname?: string | null;
  continuation?: ConsumerAuthContinuation | null;
}) {
  const isExpungement = context.product === "expungement" || isExpungementAiHostname(context.hostname);
  if (isExpungement) {
    return absoluteExpungementAiUrl(
      context.continuation
        ? consumerAuthCallbackPath(context.continuation, "password_recovery")
        : "/auth/set-password?next=/briefcase"
    );
  }
  return absolutePartnerAppUrl("/auth/set-password?next=/partner/dashboard");
}

export function partnerLandingPageUrl(partnerSlug: string) {
  return absolutePartnerAppUrl(`/p/${partnerSlug}`);
}

export function partnerOnboardingUrl(partnerSlug: string) {
  return absolutePartnerAppUrl(`/partners/onboarding/${partnerSlug}`);
}

export function partnerDashboardUrl(partnerSlug: string) {
  return absolutePartnerAppUrl(`/dashboard/partners/${partnerSlug}`);
}

export function emailPreviewUrl(partnerSlug: string, emailType: string) {
  return absolutePartnerAppUrl(`/internal/partners/admin/${partnerSlug}/emails/${emailType}`);
}

function configuredBaseUrl(envName: string) {
  const value = process.env[envName]?.trim();
  return value ? trimTrailingSlash(value) : null;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
