import {
  ndDisqualifyingOffenseNotes,
  ndEligibilityRules,
  ndFilingInstructions,
  ndPlainLanguage
} from "../rcap/state-packs/north-dakota/index";
import type {
  PleadingPresentation,
  PleadingTrackConfig
} from "./renderers/custom-pleading-renderer";
import {
  ND_NONCONVICTION_FILING,
  ND_NONCONVICTION_SOURCE_SILENCES
} from "./north-dakota-nonconviction-spec";

/**
 * Pleading configuration for the North Dakota Petition to Close Nonconviction
 * Records (N.D.C.C. § 12-60.1-05, pre-August 1, 2025 branch).
 *
 * This is a sibling of `ndConvictionSealingConfig`, not a replacement for it.
 * The two routes differ in three ways that the pleading body has to reflect:
 *
 *   1. The relief is CLOSING a court record, not SEALING court and prosecution
 *      records. The relief term, the order verb, and the records-scope phrase
 *      all change.
 *   2. The order reaches only records controlled by the North Dakota court
 *      system. The default requested-relief clause (b) directs every criminal
 *      justice agency holding the record to act; on this route that would be
 *      relief the statute does not grant, so exact clauses are supplied.
 *   3. Service on the prosecuting attorney is conditional here ("the judge may
 *      require service"), where it is expected on the Chapter 12-60.1 sealing
 *      petition. The proof of service is composed and shipped as a conditional
 *      component with that condition stated.
 */

// The petition is filed in the existing criminal case, so it carries the
// criminal caption: State of North Dakota, Plaintiff, v. the defendant. The
// filer is the defendant, styled Petitioner on the petition itself.
const ndNonconvictionPresentation: PleadingPresentation = {
  sovereignPartyName: "STATE OF NORTH DAKOTA",
  sovereignPartyProper: "the State of North Dakota",
  sovereignRole: "Plaintiff",
  movantRole: "Petitioner",
  filingNoun: "Petition",
  divisionLine: "",
  usesCounty: false,
  courtName: "District Court of {county} County, North Dakota",
  venueDescriptor: "{county} County, North Dakota",
  // The closing order reaches the court's own record, so the clerk of the
  // district court is the custodian named. No prosecutor or law-enforcement
  // custodian is named, because the order does not reach their records.
  recordCustodianLead: "The Clerk of the District Court",
  verificationVerb: "declare",
  // No committed source ties a verification statute to this petition, so the
  // penalty recital is suppressed (the renderer prints it only when the config
  // carries a citation) and the silence is carried as a counsel flag.
  verificationPenaltyLabel: null,
  serviceRecipientLabel: "the prosecuting attorney",
  serviceRecipientAddressLabel: "[PROSECUTING ATTORNEY ADDRESS — CONFIRM WITH CLERK OF COURT]",
  reliefActionVerb: "close",
  orderActionVerb: "close",
  recordsScopePhrase: "the court record in the above-captioned criminal case",
  reliefClauses: [
    "(a) Find that the above-captioned criminal case ended in a nonconviction because all criminal charges in the case were dismissed or the Petitioner was acquitted of all criminal charges;",
    "(b) Order that the court record in the above-captioned criminal case be closed under N.D.C.C. § 12-60.1-05; and",
    "(c) Grant such other and further relief as this Court deems just and appropriate."
  ],
  proposedOrderClauses: [
    "The court record in the above-captioned criminal case is CLOSED under N.D.C.C. § 12-60.1-05.",
    ND_NONCONVICTION_FILING.accessAfterClosingRule,
    ND_NONCONVICTION_FILING.reliefScopeRule
  ]
};

/**
 * The service note carries the exact condition rather than an unconditional
 * instruction: on this route service on the prosecutor is what the judge may
 * require, not what the statute commands.
 */
export const ndNonconvictionServiceNote =
  "Service on the prosecuting attorney is conditional on this route: on a Petition to Close Nonconviction Records the judge may require service on the prosecutor. Complete and file this proof of service if the judge requires service; it is not required unless the judge requires it.";

export const ndNonconvictionClosingConfig: PleadingTrackConfig = {
  jurisdictionCode: "ND",
  trackId: "nd_nonconviction_closing_petition",
  templateGrade: "legal_ops_custom_pleading",
  templateLifecycle: "replacement_candidate",
  primaryReliefTerm: "closing",
  documentTitleFull: "PETITION TO CLOSE NONCONVICTION RECORDS PURSUANT TO N.D.C.C. § 12-60.1-05",
  courtCaption: "IN THE DISTRICT COURT OF THE STATE OF NORTH DAKOTA",
  primaryStatutoryAuthority: [
    {
      citation: "N.D.C.C. § 12-60.1-05",
      description: ndEligibilityRules[2]
    },
    {
      citation: "N.D.C.C. § 12-60.1-05",
      description: ndFilingInstructions[7]
    }
  ],
  verificationStatute: {
    citation: null,
    description: ND_NONCONVICTION_SOURCE_SILENCES[0].counselFlag
  },
  includeProposedOrder: true,
  includeCertificateOfService: true,
  serviceNote: ndNonconvictionServiceNote,
  presentation: ndNonconvictionPresentation,
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
  ]
};

