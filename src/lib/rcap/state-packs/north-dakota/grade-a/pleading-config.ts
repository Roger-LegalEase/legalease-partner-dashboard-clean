import type {
  PleadingPresentation,
  PleadingTrackConfig
} from "../../../../record-clearing/renderers/custom-pleading-renderer";
import { ndDisqualifyingOffenseNotes, ndEligibilityRules } from "../index";
import {
  ND_CHAPTER_12_60_1_FILING,
  ND_CHAPTER_12_60_1_SEALING_SPEC,
  ND_CHAPTER_12_60_1_SOURCE_SILENCES,
  ND_SEALING_GROUNDS,
  type NdSealingGroundId
} from "./packet-spec";

/**
 * Pleading configuration for the North Dakota Chapter 12-60.1 sealing petition.
 *
 * This is a Grade-A sibling of the pre-existing `ndConvictionSealingConfig` in
 * `src/lib/record-clearing/north-dakota-config.ts`, not a replacement for it and
 * not a fork of it. That configuration stays exactly as it is, and the verifier
 * that pins it keeps passing.
 *
 * One thing is deliberately different. The shared renderer's default
 * requested-relief clause (b) directs *all criminal justice agencies* holding
 * the record to act, and its default order paragraph sweeps in "all other
 * criminal justice agencies". North Dakota Chapter 12-60.1 sealing does not
 * reach that far — `ndFilingInstructions[8]` and `ndDisqualifyingOffenseNotes[4]`
 * both say so — so this configuration supplies its own clauses through the two
 * optional presentation fields Lane D asked the captain to accept. A Grade-A
 * packet may not ask a court for relief the statute does not authorize.
 */

// North Dakota criminal cases caption "State of North Dakota, Plaintiff, v.
// [Name], Defendant"; the petition is filed in that existing criminal case and
// the source calls the filer the petitioner.
const ndSealingPresentation: PleadingPresentation = {
  sovereignPartyName: "STATE OF NORTH DAKOTA",
  sovereignPartyProper: "the State of North Dakota",
  sovereignRole: "Plaintiff",
  movantRole: "Petitioner",
  filingNoun: "Petition",
  divisionLine: "",
  usesCounty: false,
  courtName: "District Court of {county} County, North Dakota",
  venueDescriptor: "{county} County, North Dakota",
  // Court and prosecution records are the custodians Chapter 12-60.1 reaches.
  // BCI and CJDISS are deliberately not named, because the order does not reach
  // them.
  recordCustodianLead: "The Clerk of the District Court and the prosecuting attorney",
  verificationVerb: "declare",
  // No committed source ties a verification statute to this petition, so the
  // penalty recital is suppressed rather than attributed to a statute no source
  // attaches to this filing.
  verificationPenaltyLabel: null,
  serviceRecipientLabel: "the prosecuting attorney",
  serviceRecipientAddressLabel: "[PROSECUTING ATTORNEY ADDRESS — CONFIRM WITH CLERK OF COURT]",
  reliefActionVerb: "seal",
  orderActionVerb: "seal",
  recordsScopePhrase: "the criminal record (court and prosecution records)",
  reliefClauses: [
    "(a) Find that the Petitioner has shown, by clear and convincing evidence, good cause to seal, that the benefit to the Petitioner outweighs the presumption of openness of court records, that all terms of imprisonment and probation are complete, that all restitution has been paid, and that the Petitioner's reformation and rehabilitation warrant sealing;",
    "(b) Order that the court and prosecution records in the above-captioned criminal case be sealed under N.D.C.C. Chapter 12-60.1; and",
    "(c) Grant such other and further relief as this Court deems just and appropriate."
  ],
  proposedOrderClauses: [
    "The court and prosecution records in the above-captioned criminal case are SEALED under N.D.C.C. Chapter 12-60.1.",
    "Sealing prohibits disclosure of the existence or the contents of the sealed court and prosecution records except as authorized by order of this Court.",
    ND_CHAPTER_12_60_1_FILING.agencyScopeRule
  ]
};

/**
 * The petition body differs between grounds only in its statutory-authority
 * block and its eligibility allegations, both of which the composer supplies.
 * The configuration is therefore built per ground rather than duplicated.
 */
export function ndSealingConfigForGround(groundId: NdSealingGroundId): PleadingTrackConfig {
  const ground = ND_SEALING_GROUNDS.find((candidate) => candidate.groundId === groundId);
  if (!ground) {
    throw new Error(`North Dakota Grade-A pleading config: unknown sealing ground "${groundId}".`);
  }
  return {
    jurisdictionCode: "ND",
    trackId: `nd_chapter_12_60_1_${groundId}`,
    templateGrade: "legal_ops_custom_pleading",
    templateLifecycle: "replacement_candidate",
    primaryReliefTerm: "sealing",
    documentTitleFull: "PETITION TO SEAL CRIMINAL RECORDS PURSUANT TO N.D.C.C. CHAPTER 12-60.1",
    courtCaption: "IN THE DISTRICT COURT OF THE STATE OF NORTH DAKOTA",
    primaryStatutoryAuthority: [
      { citation: ground.citation, description: ground.cleanPeriodRule },
      { citation: "N.D.C.C. § 12-60.1-02", description: ndEligibilityRules[1] },
      { citation: "N.D.C.C. § 12-60.1-04", description: ndEligibilityRules[8] }
    ],
    verificationStatute: {
      citation: null,
      description: ND_CHAPTER_12_60_1_SOURCE_SILENCES[0].counselFlag
    },
    includeProposedOrder: true,
    includeCertificateOfService: true,
    // A court document, so the note states the rule the service was made under
    // rather than instructing the participant. The prosecutor's own canvassing
    // duty under § 12-60.1-04(4) belongs in the participant guide, and stays
    // there.
    serviceNote:
      "Service of this Petition and the proposed Order on the prosecuting attorney is made under N.D.C.C. § 12-60.1-03(4), by the means permitted by N.D.R.Crim.P. 49 and N.D.R.Civ.P. 5(b). Service precedes filing, and this proof of service is filed with the Petition.",
    presentation: ndSealingPresentation,
    counselFlags: [...ND_CHAPTER_12_60_1_SEALING_SPEC.counselFlags]
  };
}

/** Every ground's configuration, keyed by ground id. */
export const ndSealingConfigs: Record<NdSealingGroundId, PleadingTrackConfig> = {
  misdemeanor_conviction: ndSealingConfigForGround("misdemeanor_conviction"),
  felony_conviction: ndSealingConfigForGround("felony_conviction"),
  unconditional_pardon: ndSealingConfigForGround("unconditional_pardon")
};

/** Exported for the review record: the exclusions a reader should see named. */
export const ndSealingExcludedOffenceNotes = [
  ndDisqualifyingOffenseNotes[0],
  ndDisqualifyingOffenseNotes[1],
  ndDisqualifyingOffenseNotes[2]
];
