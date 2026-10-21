import { createHash } from "node:crypto";

import {
  ndDisqualifyingOffenseNotes,
  ndEligibilityRules,
  ndFeeNotes,
  ndFilingInstructions,
  ndPlainLanguage,
  ndRequiredFields,
  ndSafetyDisclaimer,
  ndWaitingPeriodNotes,
  northDakotaAll50BuildMetadata
} from "../rcap/state-packs/north-dakota/index";

/**
 * North Dakota nonconviction court-record closing — versioned packet
 * specification and date-split route resolver.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * N.D.C.C. § 12-60.1-05 is the one North Dakota route whose treatment
 * splits on a date. The split is not a waiting period and it is not a
 * discretionary factor: it decides whether the participant files anything at
 * all.
 *
 *   * Order of nonconviction entered ON OR AFTER August 1, 2025 — the court
 *     closes the court record 61 days after the order. Nothing is filed. A
 *     composed pleading for this branch would be a filing the statute does not
 *     ask for, so this module refuses to produce one.
 *   * Order of nonconviction entered BEFORE August 1, 2025 — the defendant may
 *     file a Petition to Close Nonconviction Records. If the requirements are
 *     met the court must enter the closing order within 10 days, and no filing
 *     fee may be charged. This is the branch the composed packet serves.
 *
 * Every operative sentence below is carried verbatim from committed North
 * Dakota authority in this repository (the ND state pack, which is compiled
 * from the Nationwide inventory, and the compiled ND engine profile). Nothing
 * here is new legal research and nothing is inferred: where the source is
 * silent the silence is recorded in `sourceSilences` rather than filled.
 */

// ---------------------------------------------------------------------------
// The date split
// ---------------------------------------------------------------------------

/**
 * The controlling effective date, as an ISO calendar date.
 *
 * Source: ndEligibilityRules[2] / ndFilingInstructions[7] / the compiled ND
 * profile decision tree, all of which state August 1, 2025 as the boundary and
 * place the boundary date itself on the automatic side ("on or after").
 */
export const ND_NONCONVICTION_DATE_SPLIT = "2025-08-01";

export type NdNonconvictionBranch =
  | "automatic_close_61_day"
  | "petition_to_close_nonconviction_records";

/**
 * Exclusions from § 12-60.1-05, verbatim from ndDisqualifyingOffenseNotes[3].
 * They apply to BOTH branches: an excluded case is not a § 12-60.1-05
 * matter at all, so it neither closes automatically nor supports the petition.
 */
export const ND_NONCONVICTION_EXCLUSIONS = [
  {
    id: "dismissal_part_of_plea_agreement",
    text: "The dismissal was part of a plea agreement involving conviction on another offense."
  },
  {
    id: "not_fit_to_proceed",
    text: "The dismissal was due to a finding that the person was not fit to proceed."
  },
  {
    id: "lack_of_criminal_responsibility",
    text: "The not-guilty verdict was due to lack of criminal responsibility."
  },
  { id: "case_appealed", text: "The case was appealed." }
] as const;

export type NdNonconvictionExclusionId = (typeof ND_NONCONVICTION_EXCLUSIONS)[number]["id"];

/** Facts the resolver reads. Every one of them is a governed matter fact. */
export interface NdNonconvictionRouteInput {
  /** ISO calendar date (YYYY-MM-DD) of the order of nonconviction. */
  nonconvictionOrderDate?: string | null;
  /**
   * True only when every criminal charge in the case was dismissed or the
   * person was acquitted of every criminal charge (ndEligibilityRules[2]).
   * Undefined means the fact was never established and the route is not
   * resolvable.
   */
  allChargesDismissedOrAcquitted?: boolean | null;
  /** Exclusion ids the screening established as present. */
  exclusions?: readonly NdNonconvictionExclusionId[] | null;
}

export type NdNonconvictionRouteResolution =
  | {
    status: "unresolved";
    branch: null;
    specId: null;
    reasonCode: "missing_nonconviction_status" | "missing_or_invalid_order_date";
    reason: string;
  }
  | {
    status: "excluded";
    branch: null;
    specId: null;
    reasonCode: "statutory_exclusion";
    exclusionIds: NdNonconvictionExclusionId[];
    reason: string;
  }
  | {
    status: "no_filing_required";
    branch: "automatic_close_61_day";
    specId: null;
    reasonCode: "automatic_close_branch";
    reason: string;
  }
  | {
    status: "composed_packet";
    branch: "petition_to_close_nonconviction_records";
    specId: string;
    specVersion: string;
    reasonCode: "petition_branch";
    reason: string;
  };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map((part) => Number(part));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/**
 * The single authority on which side of the August 1, 2025 split a North Dakota
 * nonconviction matter falls, and therefore on whether a composed packet exists
 * for it at all.
 *
 * The comparison is a lexicographic compare of two ISO calendar dates, which is
 * exact for YYYY-MM-DD and carries no timezone. The boundary date itself
 * resolves to the automatic branch, because the source says "on or after
 * August 1, 2025".
 *
 * Fails closed in both directions: an unestablished nonconviction status or an
 * absent, malformed, or impossible order date returns `unresolved` rather than
 * guessing a branch.
 */
export function resolveNdNonconvictionRoute(
  input: NdNonconvictionRouteInput
): NdNonconvictionRouteResolution {
  const exclusionIds = [...new Set(input.exclusions ?? [])].filter((id) =>
    ND_NONCONVICTION_EXCLUSIONS.some((exclusion) => exclusion.id === id)
  );
  if (exclusionIds.length > 0) {
    return {
      status: "excluded",
      branch: null,
      specId: null,
      reasonCode: "statutory_exclusion",
      exclusionIds,
      reason: `Nonconviction closing under N.D.C.C. § 12-60.1-05 does not apply: ${exclusionIds
        .map((id) => ND_NONCONVICTION_EXCLUSIONS.find((e) => e.id === id)?.text ?? id)
        .join(" ")}`
    };
  }

  if (input.allChargesDismissedOrAcquitted !== true) {
    return {
      status: "unresolved",
      branch: null,
      specId: null,
      reasonCode: "missing_nonconviction_status",
      reason:
        "A nonconviction means all criminal charges in the case were dismissed or the person was acquitted of all criminal charges; that fact is not established for this matter."
    };
  }

  const orderDate = String(input.nonconvictionOrderDate ?? "").trim();
  if (!orderDate || !isRealIsoDate(orderDate)) {
    return {
      status: "unresolved",
      branch: null,
      specId: null,
      reasonCode: "missing_or_invalid_order_date",
      reason:
        "The date of the order of nonconviction decides the N.D.C.C. § 12-60.1-05 treatment and is absent or not a calendar date (YYYY-MM-DD)."
    };
  }

  if (orderDate >= ND_NONCONVICTION_DATE_SPLIT) {
    return {
      status: "no_filing_required",
      branch: "automatic_close_61_day",
      specId: null,
      reasonCode: "automatic_close_branch",
      reason: ndWaitingPeriodNotes.nonconvictionAutomaticClose
    };
  }

  return {
    status: "composed_packet",
    branch: "petition_to_close_nonconviction_records",
    specId: ND_NONCONVICTION_PETITION_SPEC.specId,
    specVersion: ND_NONCONVICTION_PETITION_SPEC.specVersion,
    reasonCode: "petition_branch",
    reason: ndWaitingPeriodNotes.nonconvictionPetitionClose
  };
}

// ---------------------------------------------------------------------------
// Source identities
// ---------------------------------------------------------------------------

const officialForm = northDakotaAll50BuildMetadata.officialFormInventory.find(
  (entry) => entry.fileName === "Close-Nonconviction-Records.pdf"
);
const wilmaReference = northDakotaAll50BuildMetadata.resourcePacketInventory.find(
  (entry) => entry.fileName.startsWith("North Dakota Expungement")
);

if (!officialForm || !wilmaReference) {
  throw new Error(
    "North Dakota nonconviction spec: the committed ND source inventory no longer carries Close-Nonconviction-Records.pdf or the Wilma reference; the spec cannot bind a source identity it cannot see."
  );
}

export interface NdPacketSourceIdentity {
  sourceId: string;
  fileName: string;
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  role: string;
}

export const ND_NONCONVICTION_SOURCES: NdPacketSourceIdentity[] = [
  {
    sourceId: "nd-close-nonconviction-records-form",
    fileName: officialForm.fileName,
    relativePath: officialForm.relativePath,
    sha256: officialForm.sha256,
    sizeBytes: officialForm.sizeBytes,
    role: "official_form_and_instructions"
  },
  {
    sourceId: "nd-wilma-sealing-reference",
    fileName: wilmaReference.fileName,
    relativePath: wilmaReference.relativePath,
    sha256: wilmaReference.sha256,
    sizeBytes: wilmaReference.sizeBytes,
    role: "jurisdiction_reference"
  }
];

/**
 * The compiled ND engine profile the route treatment was read from. Pinned so a
 * profile revision invalidates this specification instead of silently changing
 * what the packet asserts.
 */
export const ND_PROVIDER_BINDING = {
  profileId: "ND-north-dakota",
  profileVersion: "2026-06-19-source-conversion-1",
  sourceCorpusSha256: "c205813b263764fe44648ba577d91e8fadb52b55974b7fe154495bbff1b8ede7",
  statePackModule: "src/lib/rcap/state-packs/north-dakota",
  composerModule: "src/lib/record-clearing/composers/nd-composed-packet-composer.ts",
  rendererModule: "src/lib/record-clearing/renderers/custom-pleading-renderer.ts",
  composerVersion: "1.0.0"
} as const;

// ---------------------------------------------------------------------------
// Required facts
// ---------------------------------------------------------------------------

export interface NdRequiredFact {
  factId: string;
  label: string;
  provenance: string;
  optional?: boolean;
}

/**
 * Required facts for the petition branch.
 *
 * The first six are exactly `ndRequiredFields.nonconviction_closing_petition`
 * from the state pack; the remaining three are the facts the date-split
 * resolver itself consumes. Nothing else is required, because nothing else is
 * rendered.
 */
export const ND_NONCONVICTION_REQUIRED_FACTS: NdRequiredFact[] = [
  {
    factId: "petitionerName",
    label: "Petitioner full legal name",
    provenance: "ndRequiredFields.nonconviction_closing_petition"
  },
  {
    factId: "courtName",
    label: "North Dakota court holding the criminal case (municipal or district)",
    provenance: "ndRequiredFields.nonconviction_closing_petition"
  },
  {
    factId: "countyName",
    label: "County of the criminal case",
    provenance: "ndRequiredFields.nonconviction_closing_petition"
  },
  {
    factId: "judicialDistrict",
    label: "Judicial district of the criminal case",
    provenance: "ndRequiredFields.nonconviction_closing_petition"
  },
  {
    factId: "caseNumber",
    label: "Case number of the criminal case",
    provenance: "ndRequiredFields.nonconviction_closing_petition"
  },
  {
    factId: "charge",
    label: "Charge or charges in the criminal case",
    provenance: "ndRequiredFields.nonconviction_closing_petition"
  },
  {
    factId: "nonconvictionOrderDate",
    label: "Date of the order of nonconviction (dismissal of all charges or acquittal)",
    provenance: "N.D.C.C. § 12-60.1-05 date split (ndEligibilityRules[2])"
  },
  {
    factId: "allChargesDismissedOrAcquitted",
    label: "All criminal charges dismissed, or acquitted of all criminal charges",
    provenance: "Definition of nonconviction (ndEligibilityRules[2])"
  },
  {
    factId: "clerkOfCourtDestination",
    label: "Clerk of court office where the criminal case is filed",
    provenance:
      "Filing destination (ndFilingInstructions[7]; ND profile filing note) — governed local configuration, never defaulted"
  },
  {
    factId: "otherNamesUsed",
    label: "Other legal names or aliases",
    provenance: "Optional; rendered only when supplied",
    optional: true
  },
  {
    factId: "petitionerAddress",
    label: "Petitioner mailing address",
    provenance: "Optional; rendered only when supplied",
    optional: true
  },
  {
    factId: "prosecutorOffice",
    label: "Prosecuting attorney office, for service if the judge requires it",
    provenance:
      "Optional; conditional service component (ndFilingInstructions[7]: the judge may require service on the prosecutor)",
    optional: true
  }
];

/**
 * Fidelity to the state pack, enforced at module load rather than only by a
 * test: every field the ND state pack requires for this pathway must be a
 * required fact here. A pack revision that adds a field breaks the build
 * instead of quietly shipping a packet that no longer collects it.
 */
for (const field of ndRequiredFields.nonconviction_closing_petition) {
  const fact = ND_NONCONVICTION_REQUIRED_FACTS.find((entry) => entry.factId === field);
  if (!fact || fact.optional) {
    throw new Error(
      `North Dakota nonconviction spec: ndRequiredFields.nonconviction_closing_petition requires "${field}", which this specification does not require.`
    );
  }
}

// ---------------------------------------------------------------------------
// Document sequence
// ---------------------------------------------------------------------------

export type NdPacketDocumentRequirement = "required" | "conditional";

export interface NdPacketDocumentSpec {
  documentId: string;
  sequence: number;
  title: string;
  audience: "court" | "participant";
  requirement: NdPacketDocumentRequirement;
  basis: string;
}

export const ND_NONCONVICTION_DOCUMENTS: NdPacketDocumentSpec[] = [
  {
    documentId: "nd_nonconviction_filing_instructions",
    sequence: 1,
    title: "How to File This Packet — North Dakota Petition to Close Nonconviction Records",
    audience: "participant",
    requirement: "required",
    basis:
      "Participant filing guide. Not filed with the court. Filing destination, fee, copies, and post-filing timing are carried from ndFilingInstructions[7], ndFeeNotes[0], and ndWaitingPeriodNotes.nonconvictionPetitionClose."
  },
  {
    documentId: "nd_petition_to_close_nonconviction_records",
    sequence: 2,
    title: "Petition to Close Nonconviction Records",
    audience: "court",
    requirement: "required",
    basis:
      "N.D.C.C. § 12-60.1-05, pre-August 1, 2025 branch: the defendant may file a Petition to Close Nonconviction Records (ndEligibilityRules[2], ndFilingInstructions[7]). Document type nd_petition_to_close_nonconviction_records in the ND state pack."
  },
  {
    documentId: "nd_proposed_order_closing_nonconviction_records",
    sequence: 3,
    title: "[Proposed] Order Closing Nonconviction Records",
    audience: "court",
    requirement: "required",
    basis:
      "The court must enter an order closing the court record within 10 days if the requirements are met (ndWaitingPeriodNotes.nonconvictionPetitionClose); the packet supplies the order for the court to sign. Access limits and the court-system-only scope are stated verbatim from the ND profile filing note."
  },
  {
    documentId: "nd_proof_of_service_prosecutor",
    sequence: 4,
    title: "Proof of Service on the Prosecuting Attorney",
    audience: "court",
    requirement: "conditional",
    basis:
      "Conditional by source: on this route the judge MAY require service on the prosecutor (ndFilingInstructions[7]). The component is composed and included so it is available when required, and is labelled conditional rather than asserted as mandatory."
  }
];

// ---------------------------------------------------------------------------
// Filing destination, fee, copies, post-filing
// ---------------------------------------------------------------------------

/**
 * County-to-judicial-district map — EMPTY BY DESIGN.
 *
 * No committed North Dakota source in this repository maps counties to judicial
 * districts. A row is added only from committed evidence. Until then a matter
 * must carry its own judicial district as a governed fact, and a matter that
 * does not fails closed instead of being filed into a guessed district.
 */
export const ND_JUDICIAL_DISTRICT_BY_COUNTY: ReadonlyMap<string, string> = new Map<string, string>();

export const ND_NONCONVICTION_FILING = {
  destinationRule: ndFilingInstructions[7],
  destinationBasis:
    "The petition is filed with the clerk of court where the criminal case is filed. The exact clerk office is a governed matter fact (clerkOfCourtDestination); this specification supplies no default and no address.",
  feeRule: ndFeeNotes[0],
  feeWaiverRule:
    "No filing fee may be charged on a Petition to Close Nonconviction Records, so no fee waiver application is part of this packet.",
  copiesRule:
    "File the petition and the proposed order with the clerk of court, and keep a copy of everything filed. If the judge requires service on the prosecuting attorney, serve a copy of the petition and the proposed order and file the proof of service.",
  postFilingRule: ndWaitingPeriodNotes.nonconvictionPetitionClose,
  hearingOrObjectionRule:
    "The source for this route states no hearing requirement and no objection period for a Petition to Close Nonconviction Records; it states only that the court must enter the closing order within 10 days if the requirements are met. No hearing date, objection window, or appearance instruction is asserted.",
  reliefScopeRule:
    "The North Dakota petition form says the order closes only records controlled by the North Dakota court system; it does not close records controlled by the prosecutor or law-enforcement entities.",
  accessAfterClosingRule:
    "Access to closed nonconviction court records is limited to the clerk, judge, juvenile commission, criminal justice agency, defendant, defendant's lawyer, state's attorney, or a person with a written judge's order."
} as const;

// ---------------------------------------------------------------------------
// Source silences
// ---------------------------------------------------------------------------

export const ND_NONCONVICTION_SOURCE_SILENCES = [
  {
    field: "verificationStatute.citation",
    statement:
      "No committed North Dakota source ties a verification or notarization statute to a Petition to Close Nonconviction Records. The citation is held null and the signature block carries a plain declaration rather than a penalty recital under a statute no source attaches to this filing.",
    counselFlag:
      "North Dakota petition verification: confirm the required verification/notarization form and any applicable statute with counsel; the source does not specify one."
  },
  {
    field: "statutorySubsection",
    statement:
      "The committed sources cite N.D.C.C. § 12-60.1-05 as a whole for the petition branch and identify a subsection only for the automatic-closing branch. No subsection is attributed to the petition branch.",
    counselFlag:
      "Confirm the exact N.D.C.C. § 12-60.1-05 subsection for the petition branch before release."
  },
  {
    field: "judicialDistrictByCounty",
    statement:
      "No committed source maps North Dakota counties to judicial districts. ND_JUDICIAL_DISTRICT_BY_COUNTY is empty by design and the judicial district must arrive as a governed matter fact.",
    counselFlag:
      "Filing destination is a governed matter fact; a matter without a judicial district and clerk destination fails closed rather than filing into a defaulted district."
  },
  {
    field: "hearingAndObjection",
    statement:
      "The source states no hearing requirement and no objection period for this route. Neither is asserted in the packet.",
    counselFlag:
      "Confirm with the clerk whether the assigned judge sets a hearing or an objection period on a Petition to Close Nonconviction Records."
  }
] as const;

// ---------------------------------------------------------------------------
// The specification
// ---------------------------------------------------------------------------

export interface NdComposedPacketSpec {
  schemaVersion: string;
  specId: string;
  specVersion: string;
  jurisdictionCode: "ND";
  routeId: string;
  statePackPathway: "nonconviction_closing_petition";
  branch: NdNonconvictionBranch;
  dateSplit: { effectiveDate: string; boundaryBelongsTo: NdNonconvictionBranch };
  legalName: string;
  publicName: string;
  primaryReliefTerm: string;
  authority: string[];
  provider: typeof ND_PROVIDER_BINDING;
  sources: NdPacketSourceIdentity[];
  requiredFacts: NdRequiredFact[];
  documents: NdPacketDocumentSpec[];
  filing: typeof ND_NONCONVICTION_FILING;
  exclusions: typeof ND_NONCONVICTION_EXCLUSIONS;
  sourceSilences: typeof ND_NONCONVICTION_SOURCE_SILENCES;
  counselFlags: string[];
  safetyDisclaimer: string;
}

export const ND_NONCONVICTION_PETITION_SPEC: NdComposedPacketSpec = {
  schemaVersion: "rcap-lane-d-composed-packet-spec/v1",
  specId: "nd-nonconviction-closing-petition",
  specVersion: "1.0.0",
  jurisdictionCode: "ND",
  routeId: "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05",
  statePackPathway: "nonconviction_closing_petition",
  branch: "petition_to_close_nonconviction_records",
  dateSplit: {
    effectiveDate: ND_NONCONVICTION_DATE_SPLIT,
    boundaryBelongsTo: "automatic_close_61_day"
  },
  legalName:
    "Petition to Close Nonconviction Records (N.D.C.C. § 12-60.1-05, order of nonconviction entered before August 1, 2025)",
  publicName: "Ask a North Dakota court to close the court record in a case that ended without a conviction",
  primaryReliefTerm: "closing",
  authority: ["N.D.C.C. § 12-60.1-05", "N.D.C.C. Chapter 12-60.1"],
  provider: ND_PROVIDER_BINDING,
  sources: ND_NONCONVICTION_SOURCES,
  requiredFacts: ND_NONCONVICTION_REQUIRED_FACTS,
  documents: ND_NONCONVICTION_DOCUMENTS,
  filing: ND_NONCONVICTION_FILING,
  exclusions: ND_NONCONVICTION_EXCLUSIONS,
  sourceSilences: ND_NONCONVICTION_SOURCE_SILENCES,
  counselFlags: [
    `Sealing is not expungement: ${ndPlainLanguage.sealingNotExpungement}`,
    `Agency scope: ${ndDisqualifyingOffenseNotes[4]}`,
    `Route scope: ${ND_NONCONVICTION_FILING.reliefScopeRule}`,
    `Exclusions: ${ndDisqualifyingOffenseNotes[3]}`,
    `Date split: ${ndEligibilityRules[2]}`,
    ND_NONCONVICTION_SOURCE_SILENCES[0].counselFlag,
    ND_NONCONVICTION_SOURCE_SILENCES[1].counselFlag,
    ND_NONCONVICTION_SOURCE_SILENCES[2].counselFlag,
    ND_NONCONVICTION_SOURCE_SILENCES[3].counselFlag,
    `Attorney review: ${ndDisqualifyingOffenseNotes[5]}`
  ],
  safetyDisclaimer: ndSafetyDisclaimer
};

// ---------------------------------------------------------------------------
// Specification hash
// ---------------------------------------------------------------------------

/** Key-ordered JSON, so the hash depends on values and not on property order. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalize((value as Record<string, unknown>)[key])])
    );
  }
  return value;
}

/** SHA-256 of the canonical specification bytes. Stable across property order. */
export function ndComposedPacketSpecHash(spec: NdComposedPacketSpec = ND_NONCONVICTION_PETITION_SPEC): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(spec))).digest("hex");
}

/** The specification, serialized exactly as it is hashed. */
export function ndComposedPacketSpecCanonicalJson(
  spec: NdComposedPacketSpec = ND_NONCONVICTION_PETITION_SPEC
): string {
  return `${JSON.stringify(canonicalize(spec), null, 2)}\n`;
}
