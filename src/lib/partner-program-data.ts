export {
  programComponents,
  programTiers,
  partnerComplianceCopy,
  type PartnerAsset,
  type PartnerAsset as PartnerProvisioningAsset,
  type PartnerAssetKey,
  type PartnerAssetStatus,
  type PartnerMetrics,
  type PartnerPaymentStatus,
  type PartnerProvisioningStatus,
  type PartnerRecord,
  type PartnerRecord as PartnerProvisioningRecord,
  type ProgramTier,
  type ProgramTier as ProgramTierId,
  type ProgramTierDefinition
} from "@/lib/partners/types";
export {
  finalReportApi,
  internalProvisioning,
  internalProvisioningDetail,
  partnerCheckout,
  partnerDashboard,
  partnerEmailSequence,
  partnerLaunchKit,
  partnerOnboarding,
  partnerPublicPage,
  partnerUrlSet,
  weeklyReportApi
} from "@/lib/partners/routes";
export {
  canAccessOnboarding,
  canAccessPartnerPage,
  getActivePartners,
  getAllPartners,
  getAssetStatusLabel,
  getInternalProvisioningUrl,
  getPaidPartners,
  getPartnerAccessUrl,
  getPartnerAssets,
  getPartnerById,
  getPartnerBySlug,
  getPartnerCheckoutUrl,
  getPartnerMetrics,
  getPartnerOnboardingUrl,
  getPartnerRoutes,
  getPaymentStatusLabel,
  getProgramTier,
  getProvisioningPartners,
  getProvisioningStatusLabel,
  getQualificationStatusLabel,
  isPartnerActive,
  isPartnerPaid
} from "@/lib/partners/partner-service";
export { seedPartners as partnerProvisioningRecords } from "@/lib/partners/seed-partners";
export { seedPartners } from "@/lib/partners/seed-partners";

import { getPartnerById, getPartnerBySlug } from "@/lib/partners/partner-service";
import { seedPartners } from "@/lib/partners/seed-partners";

export type PartnerActivationStatus =
  | "Complete"
  | "In Setup"
  | "Draft Ready"
  | "Pending Activation"
  | "Generating"
  | "Scheduled";

export type Partner = {
  id: string;
  slug: string;
  name: string;
  organizationType: string;
  regionServed: string;
  selectedTierId: "starter" | "implementation" | "strategic";
  activationStatuses: {
    payment: PartnerActivationStatus;
    partnerProfile: PartnerActivationStatus;
    coBrandedPage: PartnerActivationStatus;
    dashboard: PartnerActivationStatus;
    launchKit: PartnerActivationStatus;
    reports: PartnerActivationStatus;
  };
};

export const demoPartner = toLegacyPartner(seedPartners[0]);
export const demoPartnerProvisioningRecord = seedPartners[0];

export function getMockPartner(identifier: string): Partner {
  const partner = getPartnerById(identifier) ?? getPartnerBySlug(identifier) ?? seedPartners[0];
  return toLegacyPartner(partner);
}

export function getPartnerProvisioningRecord(identifier: string) {
  return getPartnerById(identifier) ?? getPartnerBySlug(identifier);
}

function toLegacyPartner(partner: typeof seedPartners[number]): Partner {
  return {
    id: partner.partnerId,
    slug: partner.partnerSlug,
    name: partner.partnerName,
    organizationType: partner.organizationType,
    regionServed: partner.region,
    selectedTierId: partner.programTier,
    activationStatuses: {
      payment: partner.paymentStatus === "paid" ? "Complete" : "Pending Activation",
      partnerProfile: partner.qualificationStatus === "qualified" ? "In Setup" : "Pending Activation",
      coBrandedPage: partner.assets.partnerLandingPage.status === "active" ? "Complete" : "Draft Ready",
      dashboard: partner.assets.dashboard.status === "active" ? "Complete" : "Pending Activation",
      launchKit: partner.assets.launchKit.status === "ready" || partner.assets.launchKit.status === "active" ? "Draft Ready" : "Generating",
      reports: partner.assets.weeklyReports.status === "active" ? "Scheduled" : "Pending Activation"
    }
  };
}
