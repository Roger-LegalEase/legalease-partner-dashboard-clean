export const organizationTypeOptions = [
  "Community nonprofit",
  "Workforce / reentry organization",
  "City / county agency",
  "Legal clinic",
  "Funder / foundation",
  "National organization",
  "Other"
] as const;

export const interestedWorkflowOptions = [
  "Mississippi record clearing / RCAP",
  "Illinois expungement and sealing",
  "Washington, DC expungement and sealing",
  "Pennsylvania expungement",
  "Harris County, Texas expunction / nondisclosure",
  "Multi-state record relief program",
  "Partner dashboard only",
  "Not sure yet",
  "Other"
] as const;

export const pilotRequestFieldLimits = {
  contact_name: 120,
  organization_name: 180,
  email: 254,
  phone: 40,
  role_title: 120,
  organization_type: 80,
  state_or_jurisdiction: 120,
  community_served: 500,
  estimated_people_served: 80,
  interested_workflow: 120,
  message: 2000,
  user_agent: 500,
  referrer: 500,
  company_website: 200,
  website: 200
} as const;

export type PartnerPilotRequestRecord = {
  contact_name: string;
  organization_name: string;
  email: string;
  phone?: string;
  role_title?: string;
  organization_type: string;
  state_or_jurisdiction: string;
  community_served: string;
  estimated_people_served?: string;
  interested_workflow?: string;
  message?: string;
  consent_to_contact: true;
};

export type PilotRequestValidationResult =
  | { ok: true; data: PartnerPilotRequestRecord; honeypot: false }
  | { ok: true; honeypot: true }
  | { ok: false; error: string };

const requiredFields = [
  "contact_name",
  "organization_name",
  "email",
  "organization_type",
  "state_or_jurisdiction",
  "community_served"
] as const;

const optionalFields = [
  "phone",
  "role_title",
  "estimated_people_served",
  "interested_workflow",
  "message"
] as const;

export function validatePilotRequestPayload(payload: unknown): PilotRequestValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Invalid request." };
  }

  const source = payload as Record<string, unknown>;
  const companyWebsite = normalizeString(source.company_website);
  const website = normalizeString(source.website);
  if (companyWebsite.length > 0 || website.length > 0) {
    return { ok: true, honeypot: true };
  }

  const values: Record<string, string> = {};
  for (const field of [...requiredFields, ...optionalFields]) {
    const value = normalizeString(source[field]);
    const limit = pilotRequestFieldLimits[field];
    if (value.length > limit) {
      return { ok: false, error: "Please shorten your response and try again." };
    }
    values[field] = value;
  }

  for (const field of requiredFields) {
    if (!values[field]) {
      return { ok: false, error: "Please complete the required fields." };
    }
  }

  const email = values.email.toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (source.consent_to_contact !== true) {
    return { ok: false, error: "Consent to contact is required." };
  }

  if (!organizationTypeOptions.includes(values.organization_type as (typeof organizationTypeOptions)[number])) {
    return { ok: false, error: "Please choose a supported organization type." };
  }

  if (
    values.interested_workflow &&
    !interestedWorkflowOptions.includes(values.interested_workflow as (typeof interestedWorkflowOptions)[number])
  ) {
    return { ok: false, error: "Please choose a supported workflow." };
  }

  return {
    ok: true,
    honeypot: false,
    data: {
      contact_name: values.contact_name,
      organization_name: values.organization_name,
      email,
      phone: optionalValue(values.phone),
      role_title: optionalValue(values.role_title),
      organization_type: values.organization_type,
      state_or_jurisdiction: values.state_or_jurisdiction,
      community_served: values.community_served,
      estimated_people_served: optionalValue(values.estimated_people_served),
      interested_workflow: optionalValue(values.interested_workflow),
      message: optionalValue(values.message),
      consent_to_contact: true
    }
  };
}

export function capRequestMetadata(value: string | null, key: "user_agent" | "referrer") {
  return normalizeString(value).slice(0, pilotRequestFieldLimits[key]);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalValue(value: string) {
  return value ? value : undefined;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= pilotRequestFieldLimits.email;
}
