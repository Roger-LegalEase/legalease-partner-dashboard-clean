export type PartnerActivationFacts = {
  paymentStatus: string | null;
  qualificationStatus: string | null;
  provisioningStatus: string | null;
};

export type PartnerPublicationFacts = {
  status: string | null;
  landingPageReady: boolean;
  internalApprovedAt: string | null;
  launchedAt: string | null;
};

export type PublicPartnerEligibilityFacts = {
  activation: PartnerActivationFacts | null;
  publication: PartnerPublicationFacts | null;
};

/**
 * The existing participant-benefit activation contract. Publication is a
 * separate decision and must never be inferred from these fields.
 */
export function isPartnerActivationAuthorized(facts: PartnerActivationFacts | null) {
  return Boolean(
    facts &&
      (facts.paymentStatus === "paid" || facts.paymentStatus === "demo_paid") &&
      facts.qualificationStatus === "qualified" &&
      (facts.provisioningStatus === "provisioned" || facts.provisioningStatus === "active")
  );
}

/**
 * A reviewed preview is not publication. The canonical onboarding record has
 * to be live, internally approved, and launched before the public route opens.
 */
export function isPartnerPublicationAuthorized(facts: PartnerPublicationFacts | null) {
  return Boolean(
    facts &&
      facts.status === "live" &&
      facts.landingPageReady &&
      facts.internalApprovedAt &&
      facts.launchedAt
  );
}

export function isPublicPartnerEligible(facts: PublicPartnerEligibilityFacts) {
  return (
    isPartnerPublicationAuthorized(facts.publication) &&
    isPartnerActivationAuthorized(facts.activation)
  );
}
