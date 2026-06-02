import type { PartnerUrlOptions } from "./types";

export function partnerPublicPage(slug: string, paid?: boolean) {
  void paid;
  return `/p/${slug}`;
}

export function partnerOnboarding(slug: string, paid?: boolean) {
  void paid;
  return `/partners/onboarding/${slug}`;
}

export function partnerCheckout(partnerId: string) {
  return `/partners/checkout/${partnerId}`;
}

export function partnerLaunchKit(slug: string, paid?: boolean) {
  void paid;
  return `/partners/onboarding/${slug}/launch-kit`;
}

export function partnerEmailSequence(slug: string, paid?: boolean) {
  void paid;
  return `/partners/onboarding/${slug}/email-sequence`;
}

export function partnerDashboard(slug?: string) {
  return slug ? `/dashboard/partners/${slug}` : "/dashboard/partners";
}

export function internalProvisioning() {
  return "/internal/partners/provisioning";
}

export function internalProvisioningDetail(slug: string) {
  return `/internal/partners/provisioning/${slug}`;
}

export function internalAdmin() {
  return "/internal/partners/admin";
}

export function internalAdminDetail(slug: string) {
  return `/internal/partners/admin/${slug}`;
}

export function internalAdminActionApi() {
  return "/api/internal/partners/admin-action";
}

export function internalAdminEmails(slug: string) {
  return `/internal/partners/admin/${slug}/emails`;
}

export function internalAdminEmailPreview(slug: string, emailType: string) {
  return `/internal/partners/admin/${slug}/emails/${emailType}`;
}

export function internalSendPartnerEmailApi() {
  return "/api/internal/partners/send-email";
}

export function internalSupabaseCheck() {
  return "/internal/partners/supabase-check";
}

export function weeklyReportApi() {
  return "/api/partner-reports/weekly";
}

export function finalReportApi() {
  return "/api/partner-reports/final";
}

export function partnerUrlSet(slug: string, options: PartnerUrlOptions = {}) {
  return {
    checkout: partnerCheckout(slug),
    onboarding: partnerOnboarding(slug, options.paid),
    coBrandedPage: partnerPublicPage(slug, options.paid),
    dashboard: partnerDashboard(),
    launchKit: partnerLaunchKit(slug, options.paid),
    emailSequence: partnerEmailSequence(slug, options.paid),
    internalProvisioning: internalProvisioningDetail(slug),
    internalAdmin: internalAdminDetail(slug),
    internalAdminEmails: internalAdminEmails(slug)
  };
}
