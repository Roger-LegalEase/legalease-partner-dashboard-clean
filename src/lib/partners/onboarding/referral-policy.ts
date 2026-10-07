import type { SupportReferralsReportingSectionData } from "./types";

export const REFERRAL_ARRANGEMENTS = ["established_organization", "general_resources", "no_referrals"] as const;
export const REFERRAL_ARRANGEMENT_LABELS = {
  established_organization: "Established referral organization",
  general_resources: "General legal-resource information only",
  no_referrals: "No referrals; stop and notify the participant"
} as const;

// Missing policy preserves the legacy contract. No inference from free text.
export function isReferralFieldActive(data: SupportReferralsReportingSectionData | undefined, key: string): boolean {
  const mode = data?.referral_arrangement;
  if (!mode || mode === "established_organization") return true;
  if (["legal_services_referral_organization", "referral_response_expectation"].includes(key)) return false;
  if (["referral_intake_method", "referral_intake_details"].includes(key)) return mode === "general_resources";
  return true;
}

export function referralPolicyExplanation(data: SupportReferralsReportingSectionData | undefined): string | null {
  switch (data?.referral_arrangement) {
    case "general_resources":
      return "Provide the reviewed legal-resource information recorded here. There is no standing referral relationship, guaranteed acceptance, or automatic transfer of participant information. Stop the self-help path for prosecutor opposition, contested hearings, or individualized advocacy and follow the recorded internal escalation procedure; LegalEase does not provide representation.";
    case "no_referrals":
      return "This program makes no outside legal referrals. Stop the self-help path and notify the participant through the recorded internal escalation procedure when a prosecutor objects, a contested hearing is scheduled, or individualized advocacy is needed. LegalEase does not provide representation.";
    default: return null;
  }
}
