export const productionAppUrl = "https://www.legaleasepartner.com";
export const localAppUrl = "http://localhost:3000";

export function getPublicBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return process.env.NODE_ENV === "production" ? productionAppUrl : localAppUrl;
}

export function absoluteAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicBaseUrl()}${normalizedPath}`;
}

export function partnerLandingPageUrl(partnerSlug: string) {
  return absoluteAppUrl(`/p/${partnerSlug}`);
}

export function partnerOnboardingUrl(partnerSlug: string) {
  return absoluteAppUrl(`/partners/onboarding/${partnerSlug}`);
}

export function partnerDashboardUrl(partnerSlug: string) {
  return absoluteAppUrl(`/dashboard/partners/${partnerSlug}`);
}

export function emailPreviewUrl(partnerSlug: string, emailType: string) {
  return absoluteAppUrl(`/internal/partners/admin/${partnerSlug}/emails/${emailType}`);
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
