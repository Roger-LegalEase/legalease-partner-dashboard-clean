// Pure provisioning domain. No server imports, no crypto, no database: the
// internal operator's preview is rendered from this in the browser, and the
// verifier exercises it without a Supabase stack.
//
// The one job here is to say exactly what provisioning will and will not do, in
// the operator's language, so "provisioned" can never be read as "launched".

export const PARTNER_PROVISIONING_SCHEMA_VERSION =
  "rcap-partner-provisioning-v1";

export type PartnerProvisioningInput = {
  organizationName?: unknown;
  legalOrganizationName?: unknown;
  partnerSlug?: unknown;
  programName?: unknown;
  programPurpose?: unknown;
  administratorName?: unknown;
  administratorEmail?: unknown;
  clearanceReason?: unknown;
  idempotencyKey?: unknown;
};

export type ValidPartnerProvisioningInput = {
  organizationName: string;
  legalOrganizationName: string;
  partnerSlug: string;
  programName: string;
  programPurpose: string;
  administratorName: string;
  administratorEmail: string;
  clearanceReason: string;
  idempotencyKey: string;
};

const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validatePartnerProvisioningInput(
  input: PartnerProvisioningInput
):
  | { ok: true; value: ValidPartnerProvisioningInput }
  | { ok: false; error: string } {
  const organizationName = collapse(input.organizationName);
  const legalOrganizationName = collapse(input.legalOrganizationName);
  const partnerSlug = text(input.partnerSlug).toLowerCase();
  const programName = collapse(input.programName);
  const programPurpose = text(input.programPurpose);
  const administratorName = collapse(input.administratorName);
  const administratorEmail = text(input.administratorEmail).toLowerCase();
  const clearanceReason = text(input.clearanceReason);
  const idempotencyKey = text(input.idempotencyKey).toLowerCase();

  if (organizationName.length < 2 || organizationName.length > 200) {
    return { ok: false, error: "Enter the public organization name." };
  }
  if (legalOrganizationName.length < 2 || legalOrganizationName.length > 200) {
    return { ok: false, error: "Enter the legal organization name." };
  }
  if (!slugPattern.test(partnerSlug)) {
    return {
      ok: false,
      error:
        "Enter a partner page address using lowercase letters, numbers, and interior hyphens."
    };
  }
  if (programName.length < 2 || programName.length > 200) {
    return { ok: false, error: "Enter the program name." };
  }
  if (programPurpose.length < 10 || programPurpose.length > 2000) {
    return {
      ok: false,
      error: "Describe the program purpose in at least a sentence."
    };
  }
  if (administratorName.length < 2 || administratorName.length > 120) {
    return { ok: false, error: "Enter the administrator’s full name." };
  }
  if (
    !administratorEmail ||
    administratorEmail.length > 254 ||
    !emailPattern.test(administratorEmail)
  ) {
    return { ok: false, error: "Enter a valid administrator work email address." };
  }
  if (clearanceReason.length < 10 || clearanceReason.length > 2000) {
    return {
      ok: false,
      error:
        "Record the authorized internal clearance reason for provisioning this partner."
    };
  }
  if (!uuidPattern.test(idempotencyKey)) {
    return { ok: false, error: "Refresh the page and try again." };
  }

  return {
    ok: true,
    value: {
      organizationName,
      legalOrganizationName,
      partnerSlug,
      programName,
      programPurpose,
      administratorName,
      administratorEmail,
      clearanceReason,
      idempotencyKey
    }
  };
}

export type ProvisioningPreviewRecord = {
  key: string;
  label: string;
  detail: string;
};

export type ProvisioningPreviewState = {
  key: string;
  label: string;
  value: string;
};

export type PartnerProvisioningPreview = {
  partnerSlug: string;
  organizationName: string;
  legalOrganizationName: string;
  programName: string;
  administratorName: string;
  administratorEmail: string;
  recordsCreated: ProvisioningPreviewRecord[];
  recordsNotCreated: ProvisioningPreviewRecord[];
  initialStates: ProvisioningPreviewState[];
};

/**
 * The records provisioning creates, in one logical transaction. Ordered the way
 * the operator reads them, not the way they are written.
 */
export const PROVISIONED_RECORDS: readonly ProvisioningPreviewRecord[] = [
  {
    key: "partner_record",
    label: "Partner tenant record",
    detail: "The canonical partner record holding the organization identity."
  },
  {
    key: "partner_program",
    label: "Partner program",
    detail: "The program name and purpose recorded on the partner tenant."
  },
  {
    key: "onboarding_workspace",
    label: "Onboarding workspace",
    detail: "The implementation workspace the administrator will work in."
  },
  {
    key: "onboarding_sections",
    label: "Initial onboarding sections",
    detail: "Eight program setup sections, each not started."
  },
  {
    key: "page_configuration",
    label: "Participant page configuration",
    detail: "Private. The public participant page is not created or published."
  },
  {
    key: "implementation_milestones",
    label: "Implementation milestone state",
    detail: "The implementation checklist, with every milestone not started."
  },
  {
    key: "audit_event",
    label: "Audit event",
    detail: "One provisioning record naming the operator and clearance reason."
  },
  {
    key: "idempotency_record",
    label: "Idempotency record",
    detail: "Prevents a retry from creating a second tenant."
  }
] as const;

/**
 * What provisioning deliberately does not create. This list is the reason the
 * operation is safe to run before anyone has agreed to launch, so it is shown
 * next to the records above rather than buried in documentation.
 */
export const RECORDS_NOT_CREATED: readonly ProvisioningPreviewRecord[] = [
  {
    key: "auth_user",
    label: "No account is created",
    detail: "Provisioning never creates or changes a sign-in account."
  },
  {
    key: "membership",
    label: "No partner membership is created",
    detail: "Administrator access is a separate, invited step."
  },
  {
    key: "invitation",
    label: "No invitation is sent",
    detail: "You send the first administrator invitation from the next panel."
  },
  {
    key: "access_code",
    label: "No access code is created",
    detail: "Participant access codes stay absent until intake is configured."
  },
  {
    key: "allocation",
    label: "No packet or participant allocation",
    detail: "Capacity is set later, under its own controls."
  },
  {
    key: "billing",
    label: "No billing state",
    detail:
      "No invoice, purchase order, payment, checkout, or sponsorship claim is created."
  },
  {
    key: "publication",
    label: "Nothing is published",
    detail: "The public partner page, sitemap, and navigation stay absent."
  }
] as const;

export const INITIAL_PROVISIONED_STATES: readonly ProvisioningPreviewState[] = [
  { key: "setup_information", label: "Setup information", value: "Not started" },
  { key: "legalease_review", label: "LegalEase review", value: "Not submitted" },
  { key: "launch_readiness", label: "Launch readiness", value: "Not ready" },
  { key: "publication", label: "Publication", value: "Private" },
  { key: "program_activation", label: "Program activation", value: "Inactive" },
  { key: "participant_intake", label: "Participant intake", value: "Inactive" },
  { key: "launched_at", label: "Launched", value: "Not launched" },
  { key: "access_code", label: "Access code", value: "Absent" },
  { key: "allocation", label: "Packet or participant allocation", value: "Absent" },
  { key: "billing", label: "Billing", value: "None" },
  { key: "public_page", label: "Public page", value: "Not found" },
  { key: "sitemap_navigation", label: "Sitemap and navigation", value: "Absent" }
] as const;

export function buildPartnerProvisioningPreview(
  value: ValidPartnerProvisioningInput
): PartnerProvisioningPreview {
  return {
    partnerSlug: value.partnerSlug,
    organizationName: value.organizationName,
    legalOrganizationName: value.legalOrganizationName,
    programName: value.programName,
    administratorName: value.administratorName,
    administratorEmail: value.administratorEmail,
    recordsCreated: [...PROVISIONED_RECORDS],
    recordsNotCreated: [...RECORDS_NOT_CREATED],
    initialStates: [...INITIAL_PROVISIONED_STATES]
  };
}

/**
 * The operator-facing message for every provisioning failure. Nothing here
 * names a table, a column, a UUID, a Supabase error, or whether some other
 * tenant exists: a denied operator and a wrong-tenant operator read the same
 * words.
 */
export function provisioningFailureCopy(code: string): string {
  switch (code) {
    case "invalid_input":
      return "Check the highlighted fields and try again.";
    case "forbidden":
      return "This operation is not available for your account.";
    case "slug_conflict":
      return "That partner page address is already in use. Choose another.";
    case "ambiguous_existing_records":
      return "Records already exist for that page address. Provisioning stopped without changing anything. Ask the RCAP platform lead to review before retrying.";
    case "idempotency_conflict":
      return "That retry does not match the original request. Start a new provisioning request.";
    case "not_configured":
      return "Partner provisioning is not configured in this environment.";
    default:
      return "Provisioning did not complete. Nothing was created. Try again, or contact the RCAP platform lead.";
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collapse(value: unknown): string {
  return text(value).replace(/\s+/g, " ");
}
