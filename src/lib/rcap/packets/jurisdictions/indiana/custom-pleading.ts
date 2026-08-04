// Indiana custom pleadings — follow-on relief after an expungement is granted.
//
// Three routes were assigned. Two are implemented: the collateral-action
// request under I.C. 35-38-9-9.5 and the supplemental petition under
// I.C. 35-38-9-9(l). The third, `in_conviction_serious_felony`, is registered
// as an explicit typed stop — see IN_BLOCKED_TRACKS.
//
// Both implemented routes are follow-ons. Neither seeks a first expungement;
// each one asks a court to extend relief that has already been granted, and
// each depends on a certified copy of that original order which the participant
// obtains and attaches. That is a required-before-filing item rather than a
// generation blocker: the packet is produced, and the packet says the order
// must be attached before it is filed.
//
// Vocabulary, and the one thing Indiana copy most often gets wrong. Indiana
// expungement does NOT destroy anything. Under I.C. 35-38-9-1(k) the records
// are sealed or restricted, and the Office of Judicial Administration states
// plainly that court records are not deleted or destroyed under I.C. 35-38-9.
// Every document here says so on its face, and the verifier fails the build if
// the word "destroy" ever appears applied to a record.
//
// The second thing Indiana copy gets wrong is silence about the filing itself:
// the expungement case file is public until the order is granted. A participant
// who does not know that can be surprised by their own petition appearing in a
// search. Both documents disclose it.
//
// What these templates never do:
//
//   - say or imply that a record is destroyed, deleted or erased;
//   - carry an official-form label. Both routes are custom pleadings with a
//     local-form override, and the design is explicit that no official-form
//     label may be carried forward unless the current statewide form for the
//     mechanism is acquired and verified. It has not been;
//   - decide which amendment gives greater relief on the supplemental route.
//     That is a legal judgment the design reserves, so the amendment relied on
//     and the relief sought are the participant's own words, and the petition
//     says LegalEase did not choose them;
//   - claim LegalEase obtains consent, negotiates with a prosecutor, appears in
//     court, or makes any individualized legal finding. It prepares documents;
//   - prefill a judge, clerk, prosecuting attorney, agency, notary or attorney
//     field. Every one is blank;
//   - print a fee figure. The collateral-action route has none by statute; the
//     supplemental route's fee is unresolved and no figure is quoted.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Indiana is
// not an enabled jurisdiction and this job does not enable one. Indiana's
// official-form conviction-expungement routes are a separate matter and are
// untouched here.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PETITIONER — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** No component here is visually or legally approved. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

// ---------------------------------------------------------------------------
// The typed stop
// ---------------------------------------------------------------------------

/**
 * Raised when an assigned Indiana track cannot produce a complete packet.
 *
 * Typed rather than absent from the registry, so a caller cannot read a
 * deliberately blocked route as an unknown one and ship what was drafted.
 */
export class IndianaTrackUnavailableError extends Error {
  constructor(
    readonly trackId: string,
    readonly reason: string,
    readonly missingComponents: readonly string[]
  ) {
    super(reason);
    this.name = "IndianaTrackUnavailableError";
  }
}

/**
 * `in_conviction_serious_felony` is assigned, partly drafted and deliberately
 * not shipped.
 *
 * Its packet has seven components. Four are custom pleadings with drafted
 * specifications. The other three are official-form attachments, and two of
 * those are REQUIRED: the Form ACR notice of exclusion of confidential
 * information (CCA-XP-0120-7002) and the Confidential Information Form. An
 * official-form component must be filled against the binary the renderer
 * actually reads and hash-matched to it, and this repository holds no Indiana
 * form binary — every artifact path is under an uninstantiated private corpus.
 *
 * Four components out of seven is not a packet, and a conviction-expungement
 * filing that omits the confidential-information forms the court requires is
 * worse than no packet at all. Fabricating field maps against an absent binary
 * is the one thing the official-form architecture forbids.
 */
export const IN_BLOCKED_TRACKS: Readonly<
  Record<string, { reason: string; missingComponents: readonly string[]; unblockedBy: string }>
> = Object.freeze({
  in_conviction_serious_felony: {
    reason:
      "in_conviction_serious_felony cannot produce a complete packet: two required official-form attachments have no binary in this checkout, so their fields cannot be mapped or hash-matched, and no packet may be assembled without them.",
    missingComponents: [
      "in_conviction_serious_felony-attachment-5 (CCA-XP-0120-7002 Form ACR, notice of exclusion of confidential information) — required",
      "in_conviction_serious_felony-attachment-6 (Confidential Information Form) — required",
      "in_conviction_serious_felony-attachment-4 (CCA-GF-0120-3016) — conditional, required for a self-represented filer"
    ],
    unblockedBy:
      "Materialized Indiana official-form binaries, hash-matched to the source-artifact registry, and an acroform mapping job for them."
  }
});

export const INDIANA_BLOCKED_TRACK_IDS: readonly string[] = Object.freeze(Object.keys(IN_BLOCKED_TRACKS));

/** Fails closed for an assigned-but-blocked track. */
export function assertIndianaTrackImplemented(trackId: string): void {
  const blocked = IN_BLOCKED_TRACKS[trackId];
  if (blocked) {
    throw new IndianaTrackUnavailableError(trackId, blocked.reason, blocked.missingComponents);
  }
}

// ---------------------------------------------------------------------------
// Self-help stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer takes the participant outside self-help.
 *
 * Both Indiana routes carry the same long list of stops, and every one of them
 * is a place where the adopted design says LegalEase's document preparation
 * ends. None is softened into a warning printed on a filing.
 */
export class IndianaSelfHelpStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "IndianaSelfHelpStopError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class IndianaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "IndianaBranchError";
  }
}

export const IN_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Which section granted the original expungement. Classification is not inferred. */
export const IN_EXPUNGEMENT_SECTIONS: Readonly<Record<string, string>> = {
  section_1: "Section 1, I.C. 35-38-9-1",
  section_2: "Section 2, I.C. 35-38-9-2",
  section_3: "Section 3, I.C. 35-38-9-3",
  section_4: "Section 4, I.C. 35-38-9-4",
  section_5: "Section 5, I.C. 35-38-9-5",
  unclear: "unclear"
};

/** What kind of related action § 35-38-9-9.5 is being asked to reach. */
export const IN_COLLATERAL_ACTION_TYPES: Readonly<Record<string, string>> = {
  seizure: "a seizure",
  civil_forfeiture: "a civil forfeiture",
  specialized_driving_privileges: "a petition for specialized driving privileges",
  administrative_proceeding: "an administrative proceeding"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new IndianaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

function stop(trackId: string, stopId: string, reason: string, routeTo: string): never {
  throw new IndianaSelfHelpStopError(trackId, stopId, reason, routeTo);
}

const COUNSEL = "a lawyer, or an Indiana expungement clinic";

/**
 * The stops both Indiana routes share.
 *
 * Each corresponds to a recorded self-help stop condition. They are checked
 * before any document is produced, because every one of them describes a
 * situation where a prepared document is the wrong output.
 */
function applySharedStops(trackId: string, facts: Record<string, unknown>): void {
  const checks: readonly [string, string, string, string][] = [
    [
      "prosecutorOpposition",
      "prosecutor_or_victim_opposition",
      "The prosecuting attorney has objected or filed a notice in opposition, or a victim has submitted a statement in opposition. An opposed matter is argued, not prepared.",
      COUNSEL
    ],
    [
      "hearingSet",
      "hearing_set",
      "The court has set a hearing. LegalEase does not appear in court and does not prepare a participant to argue one.",
      COUNSEL
    ],
    [
      "multiCountyWindowPartlyUsed",
      "multi_county_365_day_window",
      "Convictions in more than one county, with the 365-day window already partly consumed, turns the sequence of filings into a legal judgment about timing.",
      COUNSEL
    ],
    [
      "wantsToFileBeforeEligible",
      "chastain_trap",
      "Filing before a conviction is eligible spends the one petition the chapter allows. This is the Chastain trap, and it is not recoverable by filing again later.",
      COUNSEL
    ],
    [
      "alreadyFiledSections2To5",
      "already_filed_sections_2_to_5",
      "A Sections 2 through 5 petition has already been filed, which changes what remains available.",
      COUNSEL
    ],
    [
      "sexOrViolentOffender",
      "sex_or_violent_offender",
      "A person who is a sex or violent offender, or who is subject to registration, is outside what this route prepares.",
      COUNSEL
    ],
    [
      "financialObligationsOutstanding",
      "fines_fees_or_restitution_outstanding",
      "Unpaid or disputed fines, fees, costs or restitution are a bar the court applies, and whether an amount is disputed is not a question a document can settle.",
      "the clerk of the sentencing court, then " + COUNSEL
    ],
    [
      "pendingChargesOrDiversion",
      "pending_charges_or_diversion",
      "Charges pending anywhere, or participation in a pretrial diversion programme, put the matter outside this route.",
      COUNSEL
    ],
    [
      "commercialDriversLicence",
      "commercial_drivers_licence",
      "A record involving a commercial driver's licence engages 49 C.F.R. 384.226, which limits what a state may mask and is not addressed by this filing.",
      COUNSEL
    ],
    [
      "collateralConsequencesInPlay",
      "collateral_consequences_in_play",
      "Immigration, firearm, licensing or commercial driver's licence consequences turn on facts this route does not reach, and getting them wrong is not recoverable.",
      COUNSEL
    ],
    [
      "wantsToAttackConviction",
      "attacking_the_underlying_conviction",
      "Attacking the underlying conviction is post-conviction litigation, not expungement, and nothing here reaches it.",
      COUNSEL
    ]
  ];

  for (const [key, stopId, reason, routeTo] of checks) {
    if (branch(trackId, key, IN_YES_NO, facts[key]).resolved) stop(trackId, stopId, reason, routeTo);
  }

  // Classification between Sections 2 to 5, including whether an offence caused
  // serious bodily injury, is a legal judgment the design reserves.
  const section = branch(
    trackId,
    "originalExpungementSection",
    IN_EXPUNGEMENT_SECTIONS,
    facts.originalExpungementSection
  );
  if (section.value === "unclear") {
    stop(
      trackId,
      "section_classification_unclear",
      "Which section granted the original expungement decides what follow-on relief is available, and classification between Sections 2 through 5 — including whether an offence caused serious bodily injury — is a legal judgment.",
      "the certified original expungement order, then " + COUNSEL
    );
  }
}

/**
 * Derives caption forms and approved allegation sentences, after applying every
 * shared self-help stop.
 *
 * Fails closed. Nothing here decides eligibility or classification; it decides
 * whether a document may be produced at all, and which approved sentence
 * describes an answer the participant gave.
 */
export function deriveIndianaFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  assertIndianaTrackImplemented(trackId);
  applySharedStops(trackId, facts);

  const upper = (value: unknown) => String(value ?? "").trim().toUpperCase();
  const derived: Record<string, unknown> = {
    ...facts,
    courtNameUpper: upper(facts.courtName),
    countyNameUpper: upper(facts.countyName),
    originalExpungementSectionName:
      IN_EXPUNGEMENT_SECTIONS[String(facts.originalExpungementSection ?? "").trim()]
  };

  if (trackId === "in_collateral_action") {
    derived.collateralActionDescription = branch(
      trackId,
      "collateralActionType",
      IN_COLLATERAL_ACTION_TYPES,
      facts.collateralActionType
    ).resolved;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared pleading blocks
// ---------------------------------------------------------------------------

/**
 * The court line is copied from the participant's own papers.
 *
 * Indiana captions differ between circuit and superior courts and between
 * counties, and deriving one would produce a wrong caption somewhere.
 */
const COURT_LINE = "IN THE {{courtNameUpper}}";

function caption(documentTitle: string) {
  return {
    courtLine: COURT_LINE,
    partyBlockLeft: [
      "STATE OF INDIANA",
      "",
      "COUNTY OF {{countyNameUpper}}",
      "",
      "IN RE THE EXPUNGEMENT PETITION OF",
      "",
      "{{petitionerName}},",
      "",
      "Petitioner."
    ],
    partyBlockRight: ["Cause No. {{causeNumber}}", "", documentTitle]
  };
}

const SIGNATURE_BLOCK: readonly string[] = [
  "{{petitionerName}}, Petitioner, pro se",
  "{{mailingAddress}}",
  "{{contactPhone}}",
  "{{contactEmail}}",
  "Date: ______________________"
];

/** The court signs. Three lines, so a page break cannot split it. */
const ORDER_SIGNATURE_BLOCK: readonly string[] = [
  "_____________________________________",
  "JUDGE, {{courtName}}",
  "Date: ______________________"
];

const PARTICIPANT_STATEMENT_PREFIX = "Petitioner states, in Petitioner's own words:";

const PARTICIPANT_STATEMENT_ATTRIBUTION =
  "The paragraph above is Petitioner's own statement. It was written by Petitioner and is reproduced without change. LegalEase did not compose it and does not characterise it.";

/**
 * The two disclosures the adopted design requires on every Indiana document.
 *
 * Carried as one constant so that a future edit cannot soften them on one
 * document and leave the other correct.
 */
const WHAT_EXPUNGEMENT_DOES =
  "Expungement in Indiana does not destroy anything. Under I.C. 35-38-9-1(k) the records are sealed or restricted, and the Office of Judicial Administration states that court records are not deleted or removed under I.C. 35-38-9. Nobody should tell you, and you should not tell anyone, that the record no longer exists.";

const CASE_FILE_IS_PUBLIC =
  "This filing itself is public until the court grants the order. Anyone searching the court's records can see that it was filed, so file it when you are ready for that to be visible.";

const NO_INDIVIDUALIZED_FINDING =
  "LegalEase prepared this document from the answers Petitioner gave. LegalEase does not obtain anyone's consent, does not negotiate with the prosecuting attorney, does not appear in court, and makes no judgment about whether Petitioner is entitled to the relief requested.";

function effectSection() {
  return {
    heading: "WHAT THIS RELIEF DOES, AND WHAT IT DOES NOT DO",
    numbered: false,
    paragraphs: [WHAT_EXPUNGEMENT_DOES, CASE_FILE_IS_PUBLIC, NO_INDIVIDUALIZED_FINDING]
  };
}

function exhibitCoverSheet(input: {
  templateId: string;
  documentTitle: string;
  whyItMatters: string;
}): PleadingTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("EXHIBIT A"),
    title: "EXHIBIT A — CERTIFIED COPY OF THE ORIGINAL EXPUNGEMENT ORDER",
    sections: [
      {
        numbered: false,
        paragraphs: [
          `This cover sheet identifies Exhibit A to the ${input.documentTitle} in cause number {{causeNumber}}: a certified copy of the order granting Petitioner's original expungement.`,
          "Where to obtain it: ask the clerk of the court that granted the expungement for a certified copy of the order. A plain copy is not enough; it must be certified by the clerk.",
          `Why the filing refers to it: ${input.whyItMatters}`,
          "Place the certified order immediately behind this cover sheet before filing. The filing is not complete without it.",
          "LegalEase has not seen this document. LegalEase does not collect, inspect or authenticate a participant's records, and makes no representation about what this exhibit contains."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: []
  };
}

export const INDIANA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  // =========================================================================
  // in_collateral_action — I.C. 35-38-9-9.5
  // =========================================================================
  "in-collateral-action-request": {
    templateId: "in-collateral-action-request",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("REQUEST TO EXPUNGE A COLLATERAL ACTION"),
    title: "REQUEST TO EXPUNGE A COLLATERAL ACTION",
    preamble:
      "Petitioner, appearing without a lawyer, requests under I.C. 35-38-9-9.5 that the Court expunge the records of an action related to a matter already expunged, and states:",
    sections: [
      {
        heading: "I.  PETITIONER AND THE ORIGINAL EXPUNGEMENT",
        numbered: true,
        paragraphs: [
          "Petitioner is {{petitionerName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}.",
          "An order expunging Petitioner's records was granted by the {{originalExpungementCourt}} in {{originalExpungementCounty}} County, Indiana, on {{originalExpungementDate}}, under {{originalExpungementSectionName}}.",
          "A certified copy of that order is attached to this request as Exhibit A."
        ]
      },
      {
        heading: "II.  THE RELATED ACTION",
        numbered: true,
        paragraphs: [
          "This request concerns {{collateralActionDescription}} in {{collateralActionCounty}} County, Indiana, under cause number {{causeNumber}}.",
          "I.C. 35-38-9-9.5 permits a person whose records have been expunged to request expungement of an action or proceeding, including an administrative proceeding, that is factually or legally related to the arrest, charge, allegation, conviction or adjudication that was expunged. That expressly includes a seizure, a civil forfeiture and a petition for specialized driving privileges."
        ]
      },
      {
        heading: "III.  HOW THE MATTERS ARE RELATED",
        numbered: false,
        paragraphs: [
          PARTICIPANT_STATEMENT_PREFIX,
          "{{relationshipToExpungedMatter}}",
          PARTICIPANT_STATEMENT_ATTRIBUTION
        ]
      },
      {
        heading: "IV.  NOTICE",
        numbered: true,
        paragraphs: [
          "I.C. 35-38-9-9.5 provides that the Court notifies the prosecuting attorney of this county, and either sets a hearing or grants the request without one where the record conclusively establishes that Petitioner is entitled to the relief.",
          "Petitioner asks the Court to determine whether the record conclusively establishes that entitlement. Petitioner makes no representation as to how the Court should resolve that question."
        ]
      },
      effectSection()
    ],
    prayer: [
      "WHEREFORE, Petitioner asks the Court to order the records of the related action identified above expunged, as I.C. 35-38-9-9.5 provides, and to enter the proposed order submitted with this request.",
      "There is no filing fee for this request."
    ],
    verification:
      "Petitioner affirms under penalty of perjury that the statements in this request are true to the best of Petitioner's knowledge and belief.",
    signatureLabel: "Signature",
    signatureBlock: SIGNATURE_BLOCK
  },

  "in-collateral-action-proposed-order": {
    templateId: "in-collateral-action-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("ORDER EXPUNGING A COLLATERAL ACTION"),
    title: "ORDER EXPUNGING A COLLATERAL ACTION",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "This matter came before the Court on the request of {{petitionerName}} under I.C. 35-38-9-9.5 to expunge the records of an action related to a matter previously expunged, in cause number {{causeNumber}}, the prosecuting attorney of {{collateralActionCounty}} County having been notified.",
          "The Court finds:",
          "(   ) that the request should be GRANTED.",
          "(   ) that the request should be DENIED.",
          ""
        ]
      },
      {
        heading: "IT IS HEREBY ORDERED",
        numbered: true,
        paragraphs: [
          "The records of the related action in cause number {{causeNumber}} are expunged as I.C. 35-38-9-9.5 provides.",
          "The Clerk of this Court shall mark, seal or restrict those records as I.C. 35-38-9-1(k) requires, and shall notify the agencies holding records of the related action to do the same.",
          "Access to the expunged records shall be limited to the persons and purposes that I.C. 35-38-9 permits, and to no other person or purpose."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "in-collateral-action-exhibit": exhibitCoverSheet({
    templateId: "in-collateral-action-exhibit",
    documentTitle: "Request to Expunge a Collateral Action",
    whyItMatters:
      "I.C. 35-38-9-9.5 is available only to a person whose records have already been expunged, so the certified original order is what establishes that the request may be made at all."
  }),

  // =========================================================================
  // in_supplemental_order — I.C. 35-38-9-9(l)
  // =========================================================================
  "in-supplemental-petition": {
    templateId: "in-supplemental-petition",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("SUPPLEMENTAL PETITION"),
    title: "SUPPLEMENTAL PETITION FOR RELIEF UNDER AN AMENDMENT",
    preamble:
      "Petitioner, appearing without a lawyer, petitions the Court under I.C. 35-38-9-9(l) for relief provided by an amendment enacted after Petitioner's expungement was granted, and states:",
    sections: [
      {
        heading: "I.  PETITIONER AND THE ORIGINAL EXPUNGEMENT",
        numbered: true,
        paragraphs: [
          "Petitioner is {{petitionerName}}, date of birth {{dateOfBirth}}, who resides at {{mailingAddress}}.",
          "This Court granted Petitioner's expungement in cause number {{causeNumber}} on {{originalExpungementDate}}, under {{originalExpungementSectionName}}.",
          "A certified copy of that order is attached to this petition as Exhibit A.",
          "This petition is filed in the court that granted the original expungement, as I.C. 35-38-9-9(l) requires."
        ]
      },
      {
        heading: "II.  STATUTORY BASIS",
        numbered: true,
        paragraphs: [
          "I.C. 35-38-9-9(l) provides that where the chapter is amended after a person's expungement was granted, in a way that provides greater relief, the person may petition the court that granted the expungement, succinctly setting forth the relief sought.",
          "It further provides that if the court finds the petitioner was granted relief before the amendment and is otherwise entitled to the relief the amendment provides, the court shall grant the supplemental petition consistent with the amendment.",
          "Petitioner was granted relief before the amendment identified below."
        ]
      },
      {
        heading: "III.  THE AMENDMENT RELIED ON AND THE RELIEF SOUGHT",
        numbered: false,
        paragraphs: [
          "Petitioner identifies the amendment relied on, and states the relief sought, in Petitioner's own words:",
          "Amendment relied on: {{amendmentReliedOn}}",
          "Relief sought: {{reliefSought}}",
          "Both paragraphs above are Petitioner's own. LegalEase did not select the amendment and did not determine whether it provides greater relief; those are legal judgments, and Petitioner asks the Court to make them."
        ]
      },
      {
        heading: "IV.  NOTICE",
        numbered: true,
        paragraphs: [
          "A copy of this petition is served on the prosecuting attorney under the Indiana Trial Rules. Petitioner confirms local service practice with the clerk before filing."
        ]
      },
      effectSection()
    ],
    prayer: [
      "WHEREFORE, Petitioner asks the Court to find that Petitioner was granted relief before the amendment identified above and is otherwise entitled to the relief that amendment provides, and to grant this supplemental petition consistent with that amendment.",
      "Petitioner asks the Court to enter the proposed order submitted with this petition."
    ],
    verification:
      "Petitioner affirms under penalty of perjury that the statements in this petition are true to the best of Petitioner's knowledge and belief.",
    signatureLabel: "Signature",
    signatureBlock: SIGNATURE_BLOCK
  },

  "in-supplemental-proposed-order": {
    templateId: "in-supplemental-proposed-order",
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: caption("ORDER ON SUPPLEMENTAL PETITION"),
    title: "ORDER ON SUPPLEMENTAL PETITION",
    preamble:
      "This proposed order is submitted for the Court's consideration. Every finding, signature and date below is left blank for the Court.",
    sections: [
      {
        numbered: false,
        paragraphs: [
          "This matter came before the Court on the supplemental petition of {{petitionerName}} under I.C. 35-38-9-9(l) in cause number {{causeNumber}}, the prosecuting attorney having been served.",
          "The Court finds:",
          "(   ) that the petition should be GRANTED.",
          "(   ) that the petition should be DENIED.",
          ""
        ]
      },
      {
        heading: "IT IS HEREBY ORDERED",
        numbered: true,
        paragraphs: [
          "The relief granted to {{petitionerName}} in this cause is supplemented consistent with the amendment identified in the petition, as I.C. 35-38-9-9(l) provides.",
          "The Clerk of this Court shall mark, seal or restrict the records as I.C. 35-38-9-1(k) requires, and shall notify the agencies holding those records of this Order.",
          "Access to the expunged records shall be limited to the persons and purposes that I.C. 35-38-9 permits, and to no other person or purpose."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: ORDER_SIGNATURE_BLOCK
  },

  "in-supplemental-exhibit": exhibitCoverSheet({
    templateId: "in-supplemental-exhibit",
    documentTitle: "Supplemental Petition",
    whyItMatters:
      "I.C. 35-38-9-9(l) requires the court to find that Petitioner was granted relief before the amendment, and the certified original order is what shows when that relief was granted."
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

type ComponentSpec = {
  componentId: string;
  role: PacketSet["components"][number]["role"];
  templateId: string;
  order: number;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!INDIANA_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(`${spec.componentId}: no Indiana template ${spec.templateId} is registered.`);
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: spec.role,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/** The shared self-help stop answers, asked on both routes. */
const STOP_INPUTS: readonly RequiredInput[] = [
  { key: "prosecutorOpposition", label: "Has the prosecuting attorney or a victim opposed this?", required: true },
  { key: "hearingSet", label: "Has the court set a hearing?", required: true },
  {
    key: "multiCountyWindowPartlyUsed",
    label: "Do you have convictions in more than one county, with the 365-day window already partly used?",
    required: true
  },
  {
    key: "wantsToFileBeforeEligible",
    label: "Do you want to file before a conviction is eligible?",
    required: true
  },
  {
    key: "alreadyFiledSections2To5",
    label: "Have you already filed a petition under Sections 2 through 5?",
    required: true
  },
  {
    key: "sexOrViolentOffender",
    label: "Are you a sex or violent offender, or subject to registration?",
    required: true
  },
  {
    key: "financialObligationsOutstanding",
    label: "Are any fines, fees, costs or restitution unpaid or disputed?",
    required: true
  },
  {
    key: "pendingChargesOrDiversion",
    label: "Do you have charges pending anywhere, or are you in a pretrial diversion programme?",
    required: true
  },
  {
    key: "commercialDriversLicence",
    label: "Does this record involve a commercial driver's licence?",
    required: true
  },
  {
    key: "collateralConsequencesInPlay",
    label: "Are immigration, firearm, licensing or commercial driver's licence consequences in play?",
    required: true
  },
  {
    key: "wantsToAttackConviction",
    label: "Do you want to challenge the conviction itself, rather than expunge it?",
    required: true
  }
];

const COMMON_INPUTS: readonly RequiredInput[] = [
  { key: "petitionerName", label: "Full legal name", required: true },
  { key: "dateOfBirth", label: "Date of birth", required: true },
  { key: "mailingAddress", label: "Mailing address", required: true },
  { key: "courtName", label: "Court name exactly as it appears on your papers", required: true },
  { key: "countyName", label: "County", required: true },
  { key: "causeNumber", label: "Cause number", required: true },
  { key: "originalExpungementDate", label: "Date your original expungement was granted", required: true },
  {
    key: "originalExpungementSection",
    label: "Under which section was your original expungement granted?",
    required: true
  },
  { key: "contactPhone", label: "Telephone number", required: false },
  { key: "contactEmail", label: "Email address", required: false }
];

function indianaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  packetSet: PacketSet;
  extraInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "not_submitted"
  } as const;

  return {
    jurisdiction: "IN",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "circuit_or_superior_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: [...COMMON_INPUTS, ...STOP_INPUTS, ...input.extraInputs],
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: input.assembledPacketName,
    assembledPacketTitle: input.assembledPacketTitle,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

export const INDIANA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  indianaTrack({
    trackId: "in_collateral_action",
    publicName: "Clearing a related case, forfeiture or driving-privileges matter after your expungement",
    mechanism: "collateral_action_expungement",
    authority: "I.C. 35-38-9-9.5",
    recordTypes: ["collateral_action_record", "civil_forfeiture_record", "administrative_proceeding_record"],
    dispositions: ["collateral_action_related_to_expunged_matter"],
    packetSet: packetSet("in_collateral_action", [
      {
        componentId: "in_collateral_action-primary-filing-1",
        role: "primary_filing",
        templateId: "in-collateral-action-request",
        order: 1
      },
      {
        componentId: "in_collateral_action-proposed-order-2",
        role: "proposed_order",
        templateId: "in-collateral-action-proposed-order",
        order: 2
      },
      {
        componentId: "in_collateral_action-attachment-3",
        role: "attachment",
        templateId: "in-collateral-action-exhibit",
        order: 3
      }
    ]),
    extraInputs: [
      { key: "originalExpungementCourt", label: "Which court granted your original expungement?", required: true },
      {
        key: "originalExpungementCounty",
        label: "Which county granted your original expungement?",
        required: true
      },
      { key: "collateralActionCounty", label: "In which county did the related action happen?", required: true },
      {
        key: "collateralActionType",
        label: "What kind of related action is it — a seizure, a civil forfeiture, a specialized driving privileges petition, or an administrative proceeding?",
        required: true
      },
      {
        key: "relationshipToExpungedMatter",
        label: "In your own words, how is the related action connected to the case that was expunged?",
        required: true
      }
    ],
    assembledPacketName: "Collateral-Action-Expungement",
    assembledPacketTitle: "Request to Expunge a Collateral Action",
    customerDeliverableDescription:
      "A request to expunge an action related to a matter already expunged — a seizure, a civil forfeiture, a specialized driving privileges petition or an administrative proceeding — with a proposed order and a cover sheet for the certified original expungement order the participant attaches.",
    notes:
      "A free follow-on to a granted expungement: I.C. 35-38-9-9.5 imposes no fee, and the request says so. Filed under the collateral action's cause number where possible, in the county where that action happened, which may not be the county that granted the original expungement. The certified original order is a required-before-filing item the participant obtains, not a generation blocker."
  }),

  indianaTrack({
    trackId: "in_supplemental_order",
    publicName: "Asking for more relief after the law changed in your favour",
    mechanism: "supplemental_petition_after_favourable_amendment",
    authority: "I.C. 35-38-9-9(l)",
    recordTypes: ["previously_expunged_record"],
    dispositions: ["expungement_granted_before_favorable_amendment"],
    packetSet: packetSet("in_supplemental_order", [
      {
        componentId: "in_supplemental_order-primary-filing-1",
        role: "primary_filing",
        templateId: "in-supplemental-petition",
        order: 1
      },
      {
        componentId: "in_supplemental_order-proposed-order-2",
        role: "proposed_order",
        templateId: "in-supplemental-proposed-order",
        order: 2
      },
      {
        componentId: "in_supplemental_order-attachment-3",
        role: "attachment",
        templateId: "in-supplemental-exhibit",
        order: 3
      }
    ]),
    extraInputs: [
      {
        key: "amendmentReliedOn",
        label: "Which change in the law do you believe gives you greater relief?",
        required: true
      },
      {
        key: "reliefSought",
        label: "In your own words, what additional relief are you asking the court for?",
        required: true
      }
    ],
    assembledPacketName: "Supplemental-Petition-After-Amendment",
    assembledPacketTitle: "Supplemental Petition for Relief Under an Amendment",
    customerDeliverableDescription:
      "A supplemental petition asking the court that granted an expungement to extend it consistent with a later amendment, with a proposed order and a cover sheet for the certified original expungement order the participant attaches.",
    notes:
      "Filed in the court that granted the original expungement. Which amendment provides greater relief is a legal judgment the adopted design reserves, so the amendment and the relief sought are the participant's own words and the petition says LegalEase chose neither. The design records this as a periodic sweep of past participants after each legislative session rather than an on-demand route, and the fee is unresolved, so no figure is printed."
  })
];
