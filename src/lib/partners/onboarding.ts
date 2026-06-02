import type { PartnerOnboardingStatus, PartnerOrganizationType } from "./types";

export type PartnerOnboardingSaveMode = "draft" | "submit";

export type PartnerOnboardingInput = {
  partnerSlug: string;
  mode: PartnerOnboardingSaveMode;
  organizationName?: string;
  legalName?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  website?: string;
  organizationType?: PartnerOrganizationType;
  programName?: string;
  programDescription?: string;
  targetState?: string;
  targetCounty?: string;
  targetCity?: string;
  serviceArea?: string;
  expectedMonthlyParticipants?: number;
  expectedLaunchDate?: string;
  referralSources?: string;
  audienceDescription?: string;
  brandingNotes?: string;
  logoUrl?: string;
};

export type PartnerOnboardingValidationResult =
  | {
      success: true;
      data: PartnerOnboardingInput;
      onboardingStatus: PartnerOnboardingStatus;
    }
  | {
      success: false;
      errors: string[];
    };

const organizationTypes = new Set<PartnerOrganizationType>([
  "nonprofit",
  "workforce",
  "reentry",
  "city",
  "county",
  "court",
  "clinic",
  "funder",
  "national_partner",
  "other"
]);

export function validatePartnerOnboardingPayload(payload: unknown): PartnerOnboardingValidationResult {
  if (!payload || typeof payload !== "object") {
    return { success: false, errors: ["Invalid onboarding request."] };
  }

  const source = payload as Record<string, unknown>;
  const partnerSlug = readString(source.partnerSlug);
  const mode = readString(source.mode);
  const errors: string[] = [];

  if (!partnerSlug || !/^[a-zA-Z0-9_-]+$/.test(partnerSlug)) {
    errors.push("A valid partner is required.");
  }

  if (mode !== "draft" && mode !== "submit") {
    errors.push("Choose save draft or submit.");
  }

  const organizationType = readString(source.organizationType);
  if (organizationType && !organizationTypes.has(organizationType as PartnerOrganizationType)) {
    errors.push("Choose a valid organization type.");
  }

  const primaryContactEmail = readString(source.primaryContactEmail);
  if (primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryContactEmail)) {
    errors.push("Enter a valid contact email.");
  }

  const expectedMonthlyParticipants = readOptionalNumber(source.expectedMonthlyParticipants);
  if (expectedMonthlyParticipants !== undefined && expectedMonthlyParticipants < 0) {
    errors.push("Expected monthly participants must be zero or greater.");
  }

  const data: PartnerOnboardingInput = {
    partnerSlug,
    mode: mode as PartnerOnboardingSaveMode,
    organizationName: readString(source.organizationName),
    legalName: readString(source.legalName),
    primaryContactName: readString(source.primaryContactName),
    primaryContactTitle: readString(source.primaryContactTitle),
    primaryContactEmail,
    primaryContactPhone: readString(source.primaryContactPhone),
    website: readString(source.website),
    organizationType: organizationType ? (organizationType as PartnerOrganizationType) : undefined,
    programName: readString(source.programName),
    programDescription: readString(source.programDescription),
    targetState: readString(source.targetState),
    targetCounty: readString(source.targetCounty),
    targetCity: readString(source.targetCity),
    serviceArea: readString(source.serviceArea),
    expectedMonthlyParticipants,
    expectedLaunchDate: readString(source.expectedLaunchDate),
    referralSources: readString(source.referralSources),
    audienceDescription: readString(source.audienceDescription),
    brandingNotes: readString(source.brandingNotes),
    logoUrl: readString(source.logoUrl)
  };

  if (mode === "submit") {
    if (!data.organizationName) {
      errors.push("Organization name is required.");
    }

    if (!data.primaryContactName) {
      errors.push("Primary contact name is required.");
    }

    if (!data.primaryContactEmail) {
      errors.push("Primary contact email is required.");
    }

    if (!data.targetState && !data.serviceArea) {
      errors.push("Target state or service area is required.");
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data,
    onboardingStatus: mode === "submit" ? "submitted" : "in_progress"
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
