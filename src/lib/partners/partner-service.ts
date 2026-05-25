import {
  finalReportApi,
  internalProvisioningDetail,
  partnerCheckout,
  partnerOnboarding,
  partnerPublicPage,
  weeklyReportApi
} from "./routes";
import { seedPartners } from "./seed-partners";
import {
  programTiers,
  type PartnerAsset,
  type PartnerPaymentStatus,
  type PartnerRecord,
  type PartnerUrlOptions,
  type ProgramTier,
  type SearchParamsRecord
} from "./types";

export function getAllPartners(): PartnerRecord[] {
  return seedPartners;
}

export function getPartnerBySlug(slug: string): PartnerRecord | undefined {
  return seedPartners.find((partner) => partner.partnerSlug === slug);
}

export function getPartnerById(partnerId: string): PartnerRecord | undefined {
  return seedPartners.find((partner) => partner.partnerId === partnerId);
}

export function getActivePartners(): PartnerRecord[] {
  return seedPartners.filter((partner) => partner.provisioningStatus === "active");
}

export function getPaidPartners(): PartnerRecord[] {
  return seedPartners.filter((partner) => isPaidStatus(partner.paymentStatus));
}

export function getProvisioningPartners(): PartnerRecord[] {
  return seedPartners.filter((partner) => partner.provisioningStatus === "provisioning");
}

export function getPartnerAssets(slug: string): PartnerAsset[] {
  const partner = getPartnerBySlug(slug);
  return partner ? Object.values(partner.assets) : [];
}

export function getPartnerMetrics(slug: string) {
  return getPartnerBySlug(slug)?.metrics;
}

export function isPartnerPaid(slug: string): boolean {
  const partner = getPartnerBySlug(slug);
  return partner ? isPaidStatus(partner.paymentStatus) : false;
}

export function isPartnerActive(slug: string): boolean {
  return getPartnerBySlug(slug)?.provisioningStatus === "active";
}

export function isDemoPaid(searchParams: SearchParamsRecord): boolean {
  return searchParams.paid === "true";
}

export function canAccessPartnerPage(slug: string, searchParams: SearchParamsRecord): boolean {
  return isDemoPaid(searchParams) || isPartnerPaid(slug) || isPartnerActive(slug);
}

export function canAccessOnboarding(slug: string, searchParams: SearchParamsRecord): boolean {
  return isDemoPaid(searchParams) || isPartnerPaid(slug);
}

export function getPartnerAccessUrl(slug: string, options: PartnerUrlOptions = {}): string {
  return partnerPublicPage(slug, options.paid);
}

export function getPartnerOnboardingUrl(slug: string, options: PartnerUrlOptions = {}): string {
  return partnerOnboarding(slug, options.paid);
}

export function getPartnerCheckoutUrl(partnerId: string): string {
  return partnerCheckout(partnerId);
}

export function getInternalProvisioningUrl(slug: string): string {
  return internalProvisioningDetail(slug);
}

export function getProgramTier(tier: ProgramTier) {
  return programTiers.find((programTier) => programTier.id === tier) ?? programTiers[1];
}

export function getPaymentStatusLabel(status: PartnerPaymentStatus): string {
  const labels: Record<PartnerPaymentStatus, string> = {
    not_started: "Not started",
    pending: "Pending",
    demo_paid: "Demo paid",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded"
  };

  return labels[status];
}

export function getProvisioningStatusLabel(status: PartnerRecord["provisioningStatus"]): string {
  const labels: Record<PartnerRecord["provisioningStatus"], string> = {
    request_received: "Request received",
    qualified: "Qualified",
    payment_pending: "Payment pending",
    payment_complete: "Payment complete",
    provisioning: "Provisioning",
    active: "Active",
    paused: "Paused"
  };

  return labels[status];
}

export function getQualificationStatusLabel(status: PartnerRecord["qualificationStatus"]): string {
  const labels: Record<PartnerRecord["qualificationStatus"], string> = {
    request_received: "Request received",
    under_review: "Under review",
    qualified: "Qualified",
    declined: "Declined"
  };

  return labels[status];
}

export function getAssetStatusLabel(status: PartnerAsset["status"]): string {
  const labels: Record<PartnerAsset["status"], string> = {
    locked: "Locked",
    pending: "Pending",
    generating: "Generating",
    ready: "Ready",
    active: "Active"
  };

  return labels[status];
}

export function getPartnerRoutes(slug: string) {
  return {
    checkout: getPartnerCheckoutUrl(slug),
    onboarding: getPartnerOnboardingUrl(slug, { paid: true }),
    coBrandedPage: getPartnerAccessUrl(slug, { paid: true }),
    dashboard: "/dashboard/partners",
    launchKit: `/partners/onboarding/${slug}/launch-kit?paid=true`,
    emailSequence: `/partners/onboarding/${slug}/email-sequence?paid=true`,
    internalProvisioning: getInternalProvisioningUrl(slug),
    weeklyReport: weeklyReportApi(),
    finalReport: finalReportApi()
  };
}

function isPaidStatus(status: PartnerPaymentStatus) {
  return status === "demo_paid" || status === "paid";
}
