// Indiana record clearing — custom-pleading implementation.
//
// Three assigned routes and ten assigned custom-pleading components. All three
// are court filings under I.C. 35-38-9, and all three are `localFormOverride`
// routes: the Coalition for Court Access publishes conviction inserts for
// Sections 2, 3 and 4 only, and the adopted design resolves each of these three
// mechanisms to a controlled statutory custom pleading rather than an official
// form.
//
//   in_collateral_action        I.C. 35-38-9-9.5   request, order, exhibit cover
//   in_conviction_serious_felony I.C. 35-38-9-5    petition, order, consent
//                                                  exhibit cover, instructions
//   in_supplemental_order       I.C. 35-38-9-9(l)  petition, order, exhibit cover
//
// **The three official-form attachments on the Section 5 route are not this
// job's.** The design assigns `in_conviction_serious_felony-attachment-4`
// (CCA-GF-0120-3016, Appearance by Unrepresented Person),
// `-attachment-5` (CCA-XP-0120-7002 Form ACR, Notice of Exclusion of
// Confidential Information from Public Access) and `-attachment-6`
// (Confidential Information Form) to `official_pdf_fill`. No binary for any of
// them exists in this checkout and none is assigned to this lane, so this module
// does not produce them, does not relabel them as custom pleadings, and does not
// pretend the packet is complete without them. It names them, says where they
// come from and refuses to file without them — see
// `IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS` and the instruction sheet.
//
// **The design declares no identity inputs for Indiana.** Not a name, not a date
// of birth, not an address, not a Social Security number, not a driver's licence
// number — and I.C. 35-38-9-8(b) requires all of them in a conviction petition.
// That is deliberate on the Social Security number, which the design confines to
// the Confidential Information Form and forbids persisting, and it is the state
// of the normalized memo on the rest. So every § 35-38-9-8(b) identity item is
// printed as a labelled rule the petitioner completes by hand, under a section
// that says in terms that LegalEase never asked for it. Declaring an input the
// design does not ask for would be inventing design; printing a populated field
// LegalEase never collected would be worse.
//
// **Which court is a blank on two of the three routes.** The design's venue is
// "a circuit or superior court" in a named county, and there is no declared
// input for which one. The caption therefore carries a rule for the court's own
// name and the packet tells the petitioner to confirm it with the clerk. On
// `in_supplemental_order` the participant does name the court, because the
// design asks which court granted the original expungement.
//
// Boundaries that shape every document here, each the design's own:
//
//   - **Expungement is sealing, never destruction.** I.C. 35-38-9-1(k), and the
//     Office of Judicial Administration says plainly that court records are not
//     deleted or destroyed. No document here says a record is erased, destroyed
//     or gone.
//   - **The expungement case file is public until the order is granted.** Every
//     document discloses that.
//   - **Written prosecutor consent is a threshold to filing on Section 5 and is
//     the prosecutor's document.** LegalEase does not draft it, sign it,
//     negotiate for it or assume it. Where the petitioner has not obtained it,
//     the packet still generates and the consent exhibit is a cover sheet that
//     says the petition must not be filed.
//   - **Section classification is a legal judgment.** Which section a conviction
//     falls under, and whether an offence involved serious bodily injury, are
//     left to the petitioner and to counsel; where the answer is unclear the
//     route stops.
//   - **Chastain v. State is a hard gate.** A petitioner with a conviction that
//     is not yet eligible can permanently lose a record that ripens later, and
//     one petition per lifetime under § 35-38-9-9(i) makes the scheduling
//     decision worth more than the document.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. Every track is `technicalFixture` and `runtimeDisabled`: nothing here
// reaches a runtime surface, and wiring it into the shared registry and template
// pack is the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE FOR A SELF-REPRESENTED PETITIONER — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

// ---------------------------------------------------------------------------
// Assigned tracks
// ---------------------------------------------------------------------------

export const IN_COLLATERAL_ACTION = "in_collateral_action";
export const IN_SERIOUS_FELONY = "in_conviction_serious_felony";
export const IN_SUPPLEMENTAL_ORDER = "in_supplemental_order";

/** The three assigned routes, held closed so no other track can derive here. */
export const IN_ASSIGNED_TRACK_IDS: readonly string[] = [
  IN_COLLATERAL_ACTION,
  IN_SERIOUS_FELONY,
  IN_SUPPLEMENTAL_ORDER
];

/**
 * The Section 5 components the design assigns to the official-PDF lane.
 *
 * Recorded here rather than left implicit, because the assembled Section 5
 * packet is genuinely incomplete without them and the instruction sheet has to
 * be able to name each one. This job produces none of them.
 */
export const IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS: readonly {
  componentId: string;
  officialFormId: string;
  title: string;
  requirement: "required" | "conditional";
  conditionDescription: string | null;
  obtainedFrom: string;
}[] = [
  {
    componentId: "in_conviction_serious_felony-attachment-4",
    officialFormId: "CCA-GF-0120-3016",
    title: "Appearance by Unrepresented Person in Expungement Matter",
    requirement: "conditional",
    conditionDescription: "Required for a self-represented filer.",
    obtainedFrom:
      "The Coalition for Court Access expungement forms page maintained by the Indiana Office of Judicial Administration, or the clerk of the court of conviction."
  },
  {
    componentId: "in_conviction_serious_felony-attachment-5",
    officialFormId: "CCA-XP-0120-7002 Form ACR",
    title: "Notice of Exclusion of Confidential Information from Public Access",
    requirement: "required",
    conditionDescription: null,
    obtainedFrom:
      "The Coalition for Court Access expungement forms page maintained by the Indiana Office of Judicial Administration, or the clerk of the court of conviction."
  },
  {
    componentId: "in_conviction_serious_felony-attachment-6",
    officialFormId: "Confidential Information Form",
    title: "Confidential Information Form, which carries the full Social Security number",
    requirement: "required",
    conditionDescription: null,
    obtainedFrom:
      "The clerk of the court of conviction. LegalEase never asks for, prints or keeps a full Social Security number."
  }
];

// ---------------------------------------------------------------------------
// Referral destinations
// ---------------------------------------------------------------------------

/** Where a stop that needs individual legal advice sends the petitioner. */
export const IN_REFERRAL =
  "Indiana Legal Services on 1-800-869-0212, the Indiana Bar Foundation's Coalition for Court Access, or the Indiana State Bar Association lawyer referral service.";

/** Where a stop about the court record itself sends the petitioner. */
export const IN_CLERK_REFERRAL =
  "The clerk of the circuit or superior court that handled the case, which is the office that holds the chronological case summary, the cause number and the balance on the cause.";

/** Where a stop about the criminal history as a whole sends the petitioner. */
export const IN_STATE_POLICE_REFERRAL =
  "The Indiana State Police, for a certified limited criminal history, which is the only reliable way to see every Indiana conviction and work out when each becomes eligible.";

/** Where the prosecutor's own document has to come from. */
export const IN_PROSECUTOR_REFERRAL =
  "The prosecuting attorney of the county of conviction, who is the only person who can give the written consent I.C. 35-38-9-5 requires. Silence is not consent.";

/** Where a petitioner belongs when this is not their route. */
export const IN_ROUTING_REFERRAL =
  "LegalEase's own Indiana routing. I.C. 35-38-9 runs five separate mechanisms and a misdemeanour, a Class D or Level 6 felony and a Section 4 felony each have their own route; this one is Section 5 only.";

/** Where the one-petition-per-lifetime scheduling question belongs. */
export const IN_SEQUENCING_REFERRAL =
  "A lawyer, before anything is filed. Under I.C. 35-38-9-9(i) a person gets one expungement petition in a lifetime, and filings in separate counties count as one petition only where they fall inside a single 365-day window, so the order and the timing of the filings decide what can ever be cleared.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class IndianaEligibilityStopError extends Error {
  readonly code = "indiana_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string,
    readonly nextStep: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "IndianaEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class IndianaBranchError extends Error {
  readonly code = "indiana_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "IndianaBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const IN_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/**
 * Which section of I.C. 35-38-9 granted the original expungement.
 *
 * It decides the operative direction of a collateral-action order: the design
 * has the court expunge the collateral action where the underlying relief came
 * under Sections 1 through 3, and mark it expunged where it came under Sections
 * 4 or 5.
 */
export const IN_EXPUNGEMENT_SECTIONS: Readonly<Record<string, "1" | "2" | "3" | "4" | "5">> = {
  "1": "1",
  "section 1": "1",
  "2": "2",
  "section 2": "2",
  "3": "3",
  "section 3": "3",
  "4": "4",
  "section 4": "4",
  "5": "5",
  "section 5": "5"
};

/** What kind of related proceeding I.C. 35-38-9-0.5 reaches. */
export const IN_COLLATERAL_ACTION_TYPES: Readonly<
  Record<string, "seizure" | "civil_forfeiture" | "specialized_driving_privileges" | "administrative_proceeding">
> = {
  seizure: "seizure",
  "civil forfeiture": "civil_forfeiture",
  forfeiture: "civil_forfeiture",
  "specialized driving privileges": "specialized_driving_privileges",
  "specialised driving privileges": "specialized_driving_privileges",
  "administrative proceeding": "administrative_proceeding"
};

/**
 * The offence-level answers the design's own question offers.
 *
 * Two of them are not this route. Which section a conviction falls under is a
 * legal judgment the design reserves to the petitioner and to counsel, so this
 * list screens the petitioner's own answer against the route they chose rather
 * than classifying the offence.
 */
export const IN_OFFENSE_LEVELS: Readonly<
  Record<string, "misdemeanor" | "d_or_level_6_felony" | "other_felony" | "felony_serious_bodily_injury">
> = {
  misdemeanor: "misdemeanor",
  misdemeanour: "misdemeanor",
  "class d or level 6 felony": "d_or_level_6_felony",
  "class d felony": "d_or_level_6_felony",
  "level 6 felony": "d_or_level_6_felony",
  "another felony": "other_felony",
  "other felony": "other_felony",
  "felony involving serious bodily injury": "felony_serious_bodily_injury",
  "felony with serious bodily injury": "felony_serious_bodily_injury"
};

/**
 * Answer keys that would carry outside-party work into a filing.
 *
 * Nothing in the adopted design declares any of them. Their presence means a
 * caller is trying to have LegalEase supply the prosecutor's written consent, a
 * judicial finding or signature, a clerk's certification, a hearing or filing
 * date, a victim's statement or a notarial act. I.C. 35-38-9-5(c)(5) puts the
 * consent on the prosecuting attorney, § 35-38-9-9 puts the findings on the
 * court, and the certified copies belong to the clerks that issued them.
 *
 * `prosecutorConsent` is not on this list: the design asks the petitioner
 * whether consent has been given, which is their own answer, not the document.
 */
export const IN_OUTSIDE_PARTY_KEYS: readonly string[] = [
  "agencyFindings",
  "certifiedCriminalHistory",
  "clerkCertification",
  "courtFindings",
  "courtOrder",
  "expungementGranted",
  "filingDate",
  "hearingDate",
  "judgeSignature",
  "notarySignature",
  "originalExpungementOrderDocument",
  "prosecutorConsentDocument",
  "prosecutorSignature",
  "proofOfService",
  "victimStatement"
];

// ---------------------------------------------------------------------------
// Answer helpers
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join("\n");
  }
  return String(value).trim();
};

/**
 * Declared rather than assigned, so TypeScript narrows after it.
 *
 * A `never`-returning arrow held in a const does not end a control-flow branch
 * for the compiler, which leaves every value screened by a stop still typed as
 * possibly null on the line after the stop.
 */
function stop(
  stopId: string,
  trackId: string,
  reason: string,
  referral: string,
  nextStep: string
): never {
  throw new IndianaEligibilityStopError(stopId, trackId, reason, referral, nextStep);
}

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    stop(
      "in-answer-missing",
      trackId,
      `The packet needs an answer to ${key} before anything can be prepared, and none was given. Every fact in an Indiana expungement filing comes from the petitioner's own answers, and a filing that does not identify the court, the cause or the record is one the clerk cannot docket and the prosecuting attorney cannot answer.`,
      IN_CLERK_REFERRAL,
      "Get the chronological case summary for the cause from the clerk, and the certified copy of any order you are relying on, then answer the question from the record rather than from memory."
    );
  }
  return value;
};

const branch = <T>(
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, T>>
): T => {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]+$/u, "");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new IndianaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), IN_YES_NO);

/** Phrases that mean the petitioner cannot answer from the record. */
const UNKNOWN_ANSWER =
  /\b(don'?t know|do not know|not sure|unsure|no idea|unknown|can'?t remember|cannot remember|can'?t recall|cannot recall|not certain|maybe)\b/i;

/** True where the answer at least states a year, which is what a recital needs. */
const statesAYear = (raw: string): boolean => /\b(19|20)\d{2}\b/.test(raw);

/**
 * A conviction the petitioner says is not eligible yet.
 *
 * The design makes this the Chastain gate: under Chastain v. State a petitioner
 * cannot use the liberal amendment rule to add records that were not yet
 * eligible when the initial petition was filed, so filing now can permanently
 * cost a record that ripens later. Only a positive assertion stops the route —
 * "everything is eligible" must not read as an ineligible conviction.
 */
const ELIGIBILITY_NEGATED =
  /\b(all|every|each|everything|both)\b[^.]{0,40}\b(eligible|ripe)\b|\bno\b[^.]{0,24}\bineligible\b|\bnothing\b[^.]{0,24}\b(pending|ineligible)\b/i;
const assertsIneligibleConviction = (value: string): boolean =>
  /\b(not (yet )?eligible|isn'?t eligible|ineligible|too (soon|early)|waiting period (has )?not|still waiting)\b/i.test(
    value
  ) && !ELIGIBILITY_NEGATED.test(value);

/**
 * Convictions in more than one county, which the petitioner asserts themselves.
 *
 * I.C. 35-38-9-9(i) gives one petition per lifetime, and filings in separate
 * counties count as one petition only where they fall inside a single 365-day
 * window. The design's own instruction is to build the window optimiser before
 * the petition generator, because in Indiana the scheduling decision is worth
 * more than the document.
 */
const assertsMultipleCounties = (value: string): boolean =>
  /\b(more than one|multiple|two|three|several|another|other|different|second)\s+count(y|ies)\b|\bcounties\b/i.test(
    value
  );

// ---------------------------------------------------------------------------
// Screens shared by all three routes
// ---------------------------------------------------------------------------

/**
 * Refuses to build a filing out of outside-party content.
 *
 * Run first, before any other screen, so that a caller passing a prosecutor's
 * consent, a judicial finding, a signature, a hearing date or a clerk's
 * certification gets a stop rather than a document that reads as though the very
 * thing being asked for had already happened.
 */
function refuseOutsidePartyContent(trackId: string, answers: Answers): void {
  const supplied = IN_OUTSIDE_PARTY_KEYS.filter((key) => str(answers, key).length > 0);
  if (supplied.length === 0) return;
  stop(
    "in-outside-party-content-refused",
    trackId,
    `Content was supplied for ${supplied.join(", ")}. I.C. 35-38-9-5(c)(5) puts the written consent on the prosecuting attorney, I.C. 35-38-9-9 puts the findings and the order on the court, and a certified copy is the issuing clerk's. LegalEase produces none of them and will not print one, because a petition that carried the consent or the order it asks for would be asserting the very thing in question.`,
    IN_CLERK_REFERRAL,
    "Obtain each of those documents from the office that issues it, attach the certified copies to the filing yourself, and leave every judicial and prosecutorial field on the generated pages blank."
  );
}

/**
 * The stop families every I.C. 35-38-9 route shares.
 *
 * Each is a `selfHelpStopConditions` entry the design repeats on all three
 * tracks. They are screened from the petitioner's own declared answers, and only
 * where an answer positively asserts the condition.
 */
function applySharedNarrativeStops(trackId: string, narrative: string, sourceKey: string): void {
  if (assertsIneligibleConviction(narrative)) {
    stop(
      "in-conviction-not-yet-eligible-chastain",
      trackId,
      `The answer to ${sourceKey} says a conviction is not eligible yet. I.C. 35-38-9-9(i) allows one expungement petition in a lifetime, and under Chastain v. State a petitioner cannot later use the liberal amendment rule to add records that were not yet eligible when the initial petition was filed. Filing now can permanently cost a record that would have ripened later, and that is not a trade LegalEase will make on a person's behalf.`,
      IN_SEQUENCING_REFERRAL,
      "Work out the eligibility date of every conviction you have, in every county, from a certified limited criminal history before you file anything. If a record ripens later, filing now may put it out of reach for good."
    );
  }
  if (assertsMultipleCounties(narrative)) {
    stop(
      "in-multi-county-365-day-window",
      trackId,
      `The answer to ${sourceKey} describes convictions in more than one county. Filings in separate counties count as one petition under I.C. 35-38-9-9(i) only where they fall inside a single 365-day window, so the order and the timing of the filings decide what can ever be cleared. The design makes that scheduling decision worth more than the document, and it is not one a generated packet can make.`,
      IN_SEQUENCING_REFERRAL,
      "List every Indiana conviction and the county it is in, take the eligibility date of each from a certified limited criminal history, and get advice on the order and timing of the filings before any of them goes in."
    );
  }
}

// ---------------------------------------------------------------------------
// Shared derived language
// ---------------------------------------------------------------------------

/**
 * The two disclosures the design puts on every Indiana component.
 *
 * They are constants rather than derived facts, but they are exported so the
 * verifier can assert the exact sentence rather than a paraphrase of it.
 */
export const IN_SEALING_NOT_DESTRUCTION =
  "In Indiana, expungement means the records are sealed or restricted under I.C. 35-38-9-1(k). The Office of Judicial Administration states plainly that court records are not deleted and are not destroyed under I.C. 35-38-9, and nothing in this packet says otherwise.";

export const IN_FILE_PUBLIC_UNTIL_GRANTED =
  "This expungement case file is public until the order is granted. Anyone can read it in the meantime, including what is written in the petitioner's own statement.";

const IN_NO_OUTCOME =
  "Nothing in this document reports a decision. No court has found anything, no prosecuting attorney has consented to anything, no clerk has certified anything, and no record has been sealed. It asks.";

const PARTICIPANT_STATEMENT_PREFIX =
  "The petitioner states, in the petitioner's own words:";

const PARTICIPANT_STATEMENT_SUFFIX =
  "The paragraph above is the petitioner's own statement. It was written by the petitioner and is reproduced without change. LegalEase composed no part of it and makes no argument on the petitioner's behalf.";

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

const upper = (value: string): string => value.toUpperCase();

/**
 * A county name as a caption reads it, without the word the caption supplies.
 *
 * The design's question is "in which Indiana county", and people answer
 * "Bartholomew County" as often as "Bartholomew". A caption that appends COUNTY
 * to the first answer prints BARTHOLOMEW COUNTY COUNTY. Trailing punctuation
 * goes with it, because "Wayne Co." is the same answer.
 */
const captionCounty = (value: string): string =>
  upper(value.trim().replace(/[,.\s]*\b(county|co\.?)\s*$/i, "").trim());

function deriveCollateralActionFacts(answers: Answers): Record<string, string> {
  const trackId = IN_COLLATERAL_ACTION;
  const originalExpungementCounty = need(trackId, answers, "originalExpungementCounty");
  const originalExpungementSectionRaw = need(trackId, answers, "originalExpungementSection");
  const collateralActionCounty = need(trackId, answers, "collateralActionCounty");
  const collateralActionCauseNumber = need(trackId, answers, "collateralActionCauseNumber");
  const collateralActionTypeRaw = need(trackId, answers, "collateralActionType");
  const relationshipToExpungedMatter = need(trackId, answers, "relationshipToExpungedMatter");

  applySharedNarrativeStops(trackId, relationshipToExpungedMatter, "relationshipToExpungedMatter");

  // The whole route rests on an order that already exists. Without a date the
  // request cannot identify it and the court cannot match it to a file.
  if (
    UNKNOWN_ANSWER.test(originalExpungementCounty) ||
    !statesAYear(originalExpungementCounty)
  ) {
    stop(
      "in-original-expungement-not-identified",
      trackId,
      "The county and date of the original expungement order have not been stated. I.C. 35-38-9-9.5 lets a person ask to expunge an action related to a matter that was already expunged, so a request that cannot identify the original order is asking the court to relate the collateral action to nothing. The certified copy of that order is a required-before-filing attachment for the same reason.",
      IN_CLERK_REFERRAL,
      "Ask the clerk of the court that granted your expungement for a certified copy of the order, take the county and the date off it, and answer again."
    );
  }

  const section = branch(
    trackId,
    "originalExpungementSection",
    originalExpungementSectionRaw,
    IN_EXPUNGEMENT_SECTIONS
  );
  const collateralActionType = branch(
    trackId,
    "collateralActionType",
    collateralActionTypeRaw,
    IN_COLLATERAL_ACTION_TYPES
  );

  // The design's own mapping: expunge where the underlying relief came under
  // Sections 1 through 3, mark expunged where it came under Sections 4 or 5.
  const marksRatherThanExpunges = section === "4" || section === "5";

  const typeSentence = {
    seizure: "a seizure",
    civil_forfeiture: "a civil forfeiture proceeding",
    specialized_driving_privileges: "a petition for specialized driving privileges",
    administrative_proceeding: "an administrative proceeding"
  }[collateralActionType];

  return {
    // Declared keys, carried through exactly as declared.
    originalExpungementCounty,
    originalExpungementSection: section,
    collateralActionCounty,
    collateralActionCauseNumber,
    collateralActionType,
    relationshipToExpungedMatter,

    // Template placeholders.
    collateralActionCountyUpper: captionCounty(collateralActionCounty),
    collateralActionTypeSentence: `The related action is ${typeSentence}, which I.C. 35-38-9-0.5 expressly includes among the actions and proceedings that may be expunged as related to an arrest, charge, allegation, conviction or adjudication.`,
    originalExpungementStatement: `The petitioner states that an expungement was granted under I.C. 35-38-9, Section ${section}, in ${originalExpungementCounty}. A certified copy of that order is attached; the petitioner obtained it from the clerk of the granting court, and LegalEase has not seen it.`,
    relationshipStatement: relationshipToExpungedMatter,
    orderDirectionRecital: marksRatherThanExpunges
      ? `The petitioner states that the original expungement was granted under Section ${section}. Under I.C. 35-38-9-9.5 the relief that follows a Section 4 or Section 5 grant is that the records of the related action be marked as expunged, and the proposed order submitted with this request is drawn that way.`
      : `The petitioner states that the original expungement was granted under Section ${section}. Under I.C. 35-38-9-9.5 the relief that follows a Section 1, 2 or 3 grant is that the records of the related action be expunged, and the proposed order submitted with this request is drawn that way.`,
    orderOperativeDirection: marksRatherThanExpunges
      ? `IT IS THEREFORE ORDERED that the records of the related action in cause number ${collateralActionCauseNumber} be MARKED AS EXPUNGED, consistent with the relief the original expungement order granted under I.C. 35-38-9, Section ${section}.`
      : `IT IS THEREFORE ORDERED that the records of the related action in cause number ${collateralActionCauseNumber} be EXPUNGED, consistent with the relief the original expungement order granted under I.C. 35-38-9, Section ${section}.`,
    exhibitDescription:
      "the certified copy of the original expungement order, obtained by the petitioner from the clerk of the court that granted it",
    packetCaseReference: `Indiana collateral action ${collateralActionCauseNumber}`
  };
}

function deriveSeriousFelonyFacts(answers: Answers): Record<string, string> {
  const trackId = IN_SERIOUS_FELONY;
  const countyOfConviction = need(trackId, answers, "countyOfConviction");
  const caseNumber = need(trackId, answers, "caseNumber");
  const convictionDate = need(trackId, answers, "convictionDate");
  const offenseLevelRaw = need(trackId, answers, "offenseLevel");
  const sentenceCompletionDate = need(trackId, answers, "sentenceCompletionDate");
  const allConvictionsAnyCounty = need(trackId, answers, "allConvictionsAnyCounty");
  const additionalInformation = need(trackId, answers, "additionalInformation");

  // Screened before the closed list, or an unsettled answer would be rejected as
  // an unrecognized value rather than sent where an unsettled classification
  // belongs. "Another felony, I think" is not a bad answer; it is a legal
  // question nobody has settled yet.
  if (UNKNOWN_ANSWER.test(offenseLevelRaw)) {
    stop(
      "in-section-classification-unclear",
      trackId,
      "The offence classification is not settled. Which section of I.C. 35-38-9 a conviction falls under, and whether an offence involved serious bodily injury as an element within Allen v. State, 159 N.E.3d 580 (Ind. 2020), are legal judgments. The design reserves them to the petitioner and to counsel, and LegalEase does not make them.",
      IN_REFERRAL,
      "Take the charging information and the judgment of conviction to a lawyer and settle which section applies before anything goes to a clerk. One petition per lifetime makes getting the section right the whole game."
    );
  }

  const offenseLevel = branch(trackId, "offenseLevel", offenseLevelRaw, IN_OFFENSE_LEVELS);
  if (offenseLevel === "misdemeanor" || offenseLevel === "d_or_level_6_felony") {
    stop(
      "in-offense-level-not-section-five",
      trackId,
      `The offence is stated as ${offenseLevel === "misdemeanor" ? "a misdemeanour" : "a Class D or Level 6 felony"}, and this route is I.C. 35-38-9-5 only. Section 5 reaches the remaining serious felonies and requires the prosecuting attorney's written consent to file at all; a misdemeanour goes to Section 2 and a Class D or Level 6 felony to Section 3, on different waiting periods, without a consent requirement and with a mandatory rather than a discretionary grant. Filing the wrong section would consume the one petition I.C. 35-38-9-9(i) allows.`,
      IN_ROUTING_REFERRAL,
      "Go back and choose the route that matches the offence you were convicted of. If you are not certain which section your conviction falls under, that classification is a legal judgment and belongs with a lawyer before anything is filed."
    );
  }

  if (UNKNOWN_ANSWER.test(convictionDate) || !statesAYear(convictionDate)) {
    stop(
      "in-conviction-date-not-established",
      trackId,
      "The date of conviction has not been stated. I.C. 35-38-9-5 runs the waiting period from the later of ten years after the date of conviction or five years after completion of the sentence, and I.C. 35-38-9-8(b) requires the date of conviction on the face of the petition. A petition that guesses at it is a petition that misstates a statutory element.",
      IN_CLERK_REFERRAL,
      "Get the chronological case summary for the cause from the clerk of the court of conviction, take the date of conviction from it, and answer again."
    );
  }

  if (UNKNOWN_ANSWER.test(sentenceCompletionDate) || !statesAYear(sentenceCompletionDate)) {
    stop(
      "in-sentence-completion-not-established",
      trackId,
      "The date the sentence was completed has not been stated. The Section 5 waiting period runs from the later of ten years after conviction or five years after completion of the sentence, so without that date neither the petitioner nor the court can say whether the period has elapsed.",
      IN_CLERK_REFERRAL,
      "Get the sentencing order and any probation or parole discharge paperwork, take the completion date from it, and answer again."
    );
  }

  applySharedNarrativeStops(trackId, allConvictionsAnyCounty, "allConvictionsAnyCounty");

  if (yesNo(trackId, answers, "pendingCharges")) {
    stop(
      "in-charges-pending",
      trackId,
      "Criminal charges are pending. I.C. 35-38-9-8(b) requires the petition to affirm that no criminal investigation or charges are pending, so a petition filed now would carry an affirmation the petitioner cannot make. A pretrial diversion programme counts the same way.",
      IN_REFERRAL,
      "Wait until the pending matter is resolved, then come back. Because the petition is one per lifetime, the pending matter's outcome may also change which section applies, so get advice before filing."
    );
  }

  if (yesNo(trackId, answers, "convictedWithinPeriod")) {
    stop(
      "in-conviction-within-waiting-period",
      trackId,
      "The petitioner has been convicted of a crime within the applicable waiting period. I.C. 35-38-9-8(b) requires the petition to affirm that no further crime was committed within the period, and I.C. 35-38-9-5 makes the elapsed period an element of the relief. The affirmation the petition would have to carry is one the answers contradict.",
      IN_STATE_POLICE_REFERRAL,
      "Get a certified limited criminal history, work out when the waiting period restarts on each conviction, and get advice on when the one petition you are allowed should be filed."
    );
  }

  if (!yesNo(trackId, answers, "financialObligationsPaid")) {
    stop(
      "in-financial-obligations-outstanding",
      trackId,
      "Fines, fees, court costs or restitution are unpaid or disputed. The design records this as a self-help stop on every Indiana conviction route: an unpaid balance on the cause is the ordinary reason a petition that is otherwise in order is denied, and denial consumes the one petition I.C. 35-38-9-9(i) allows.",
      IN_CLERK_REFERRAL,
      "Ask the clerk of the court of conviction for the balance on the cause number, including restitution, clear or resolve it, get written confirmation, and come back."
    );
  }

  if (yesNo(trackId, answers, "priorExpungementPetition")) {
    stop(
      "in-prior-petition-filed",
      trackId,
      "A petition under Sections 2 through 5 has already been filed. I.C. 35-38-9-9(i) allows one expungement petition in a lifetime, and petitions filed in separate counties count as one only where they fall inside a single 365-day window. Whether a further petition is open at all, and on what basis, is not a question a generated packet can answer.",
      IN_SEQUENCING_REFERRAL,
      "Take the earlier petition, the order on it and a certified limited criminal history to a lawyer before filing anything else."
    );
  }

  // Consent is a threshold to filing, and the design is explicit that its
  // absence is not a reason to withhold generation. The packet changes shape
  // instead: the consent exhibit becomes a placeholder and the instruction sheet
  // says in terms that the petition must not be filed.
  const prosecutorConsentGiven = yesNo(trackId, answers, "prosecutorConsent");

  const offenceStatement =
    offenseLevel === "felony_serious_bodily_injury"
      ? "The petitioner states that the conviction was of a felony involving serious bodily injury. Whether bodily injury or serious bodily injury is an element of the offence of conviction, which is what Allen v. State, 159 N.E.3d 580 (Ind. 2020), makes decisive, is a legal question this petition does not decide."
      : "The petitioner states that the conviction was of a felony other than a Class D or Level 6 felony, brought under I.C. 35-38-9-5 rather than under Sections 2 through 4. Which section a conviction falls under is a legal question this petition does not decide.";

  return {
    // Declared keys, carried through exactly as declared.
    countyOfConviction,
    caseNumber,
    convictionDate,
    offenseLevel,
    sentenceCompletionDate,
    allConvictionsAnyCounty,
    priorExpungementPetition: "no",
    financialObligationsPaid: "yes",
    pendingCharges: "no",
    convictedWithinPeriod: "no",
    prosecutorConsent: prosecutorConsentGiven ? "yes" : "no",
    additionalInformation,

    // Template placeholders.
    countyOfConvictionUpper: captionCounty(countyOfConviction),
    offenceStatement,
    convictionRecital: `The petitioner states that the conviction in this cause was entered on ${convictionDate}, and that the sentence, including any probation or parole, was completed on ${sentenceCompletionDate}.`,
    waitingPeriodRecital:
      "I.C. 35-38-9-5 sets the period at the later of ten years from the date of conviction or five years from completion of the sentence, and the prosecuting attorney's written consent may shorten it. Whether the period has elapsed on these dates is for the Court on the record before it.",
    priorConvictionsStatement: allConvictionsAnyCounty,
    additionalInformationStatement: additionalInformation,
    consentStatement: prosecutorConsentGiven
      ? "The petitioner states that the prosecuting attorney of the county of conviction has given written consent to the expungement of these records, as I.C. 35-38-9-5(c)(5) requires. The consent itself is the prosecuting attorney's document; the petitioner attaches it, and LegalEase has neither seen it nor obtained it."
      : "The petitioner states that the prosecuting attorney of the county of conviction has NOT yet given the written consent I.C. 35-38-9-5(c)(5) requires. This petition must not be filed until that written consent has been obtained and attached. Silence from the prosecuting attorney is not consent.",
    consentExhibitHeadline: prosecutorConsentGiven
      ? "EXHIBIT A — WRITTEN CONSENT OF THE PROSECUTING ATTORNEY, ATTACHED BY THE PETITIONER"
      : "EXHIBIT A — WRITTEN CONSENT OF THE PROSECUTING ATTORNEY, NOT YET OBTAINED — DO NOT FILE",
    consentExhibitBody: prosecutorConsentGiven
      ? "The petitioner states that the written consent has been obtained. Place the prosecuting attorney's own signed written consent immediately behind this cover page. Nobody at LegalEase has seen it."
      : "The written consent has not been obtained, and nothing may be filed on this cause until it has been. Ask the prosecuting attorney of the county of conviction for it, and place their own signed document behind this page when it arrives.",
    consentFilingWarning: prosecutorConsentGiven
      ? "Check that the written consent is behind Exhibit A before this petition goes to the clerk. I.C. 35-38-9-5(c)(5) makes it a condition of filing."
      : "DO NOT FILE THIS PETITION. I.C. 35-38-9-5(c)(5) makes the prosecuting attorney's written consent a condition of filing at all, and it has not been obtained. Filing without it risks a denial that would consume the one expungement petition I.C. 35-38-9-9(i) allows in a lifetime.",
    packetCaseReference: `Indiana Section 5 expungement ${caseNumber}`
  };
}

function deriveSupplementalOrderFacts(answers: Answers): Record<string, string> {
  const trackId = IN_SUPPLEMENTAL_ORDER;
  const originalExpungementCourt = need(trackId, answers, "originalExpungementCourt");
  const originalExpungementSectionRaw = need(trackId, answers, "originalExpungementSection");
  // The design's own key, misspelled in the normalized memo. It is not renamed
  // here: the declared key is what `resolvePacket` checks and what the design's
  // generation requirement names.
  const amendmentRelieadOn = need(trackId, answers, "amendmentRelieadOn");
  const reliefSought = need(trackId, answers, "reliefSought");

  applySharedNarrativeStops(trackId, reliefSought, "reliefSought");

  if (UNKNOWN_ANSWER.test(originalExpungementCourt) || !statesAYear(originalExpungementCourt)) {
    stop(
      "in-granting-court-not-identified",
      trackId,
      "The court that granted the original expungement, and the date it did, have not been stated. I.C. 35-38-9-9(l) puts a supplemental petition in the court that granted the expungement and nowhere else, so a petition that cannot name that court and date has no venue and identifies no order to supplement.",
      IN_CLERK_REFERRAL,
      "Ask the clerk of the court that granted your expungement for a certified copy of the order, take the court's name and the date from it, and answer again."
    );
  }

  const section = branch(
    trackId,
    "originalExpungementSection",
    originalExpungementSectionRaw,
    IN_EXPUNGEMENT_SECTIONS
  );

  if (UNKNOWN_ANSWER.test(amendmentRelieadOn)) {
    stop(
      "in-amendment-not-identified",
      trackId,
      "The amendment said to give greater relief has not been identified. I.C. 35-38-9-9(l) opens only where the chapter was amended after the grant in a way that provides greater relief, and the design makes identifying that amendment a manual completion item precisely because it is a legal judgment that must be settled before the petition is offered. Indiana amends this chapter nearly every year.",
      IN_REFERRAL,
      "Get advice on which amendment to I.C. 35-38-9 since the date of your order gives you greater relief than you already have. Without that, there is nothing for a supplemental petition to rely on."
    );
  }

  return {
    // Declared keys, carried through exactly as declared.
    originalExpungementCourt,
    originalExpungementSection: section,
    amendmentRelieadOn,
    reliefSought,

    // Template placeholders.
    grantRecital: `The petitioner states that this Court granted an expungement under I.C. 35-38-9, Section ${section}, as set out in the certified copy of the order attached to this petition. The petitioner obtained that certified copy from the clerk; LegalEase has not seen it.`,
    amendmentStatement: amendmentRelieadOn,
    reliefSoughtStatement: reliefSought,
    exhibitDescription:
      "the certified copy of the original expungement order, obtained by the petitioner from the clerk of the granting court",
    packetCaseReference: `Indiana supplemental petition under I.C. 35-38-9-9(l)`
  };
}

/**
 * Turns the petitioner's answers into the fact bag the templates read.
 *
 * Fails closed on anything the adopted design treats as a stop, on anything that
 * would require LegalEase to make a legal classification the design reserves,
 * and on any attempt to supply outside-party content.
 */
export function deriveIndianaFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!IN_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new IndianaBranchError(trackId, "trackId", trackId, IN_ASSIGNED_TRACK_IDS);
  }
  refuseOutsidePartyContent(trackId, answers);

  if (trackId === IN_COLLATERAL_ACTION) return deriveCollateralActionFacts(answers);
  if (trackId === IN_SERIOUS_FELONY) return deriveSeriousFelonyFacts(answers);
  return deriveSupplementalOrderFacts(answers);
}

// ---------------------------------------------------------------------------
// Shared template language
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

/**
 * The caption's party block.
 *
 * Each cell is a whole phrase. The shared writer draws one left cell and one
 * right cell per call and wraps each inside its own column, so a phrase split
 * across two entries drifts apart by however many lines the neighbouring cell
 * happened to need.
 *
 * The petitioner's name is a rule rather than a placeholder: the adopted Indiana
 * design declares no identity input on any of these three routes, and LegalEase
 * does not print a value it never asked for.
 */
const CAPTION_LEFT: readonly string[] = [
  "IN RE THE EXPUNGEMENT OF THE",
  "RECORDS OF:",
  "",
  "_____________________________,",
  "Petitioner."
];

const captionRight = (causeLine: string, documentLine: string): readonly string[] => [
  causeLine,
  "",
  "Case type XP",
  "",
  documentLine
];

const PREAMBLE_PETITION =
  "Prepared by LegalEase from the petitioner's own answers, for the petitioner to complete, sign and file. LegalEase does not represent the petitioner, has not seen any record in this matter, has filed nothing and has obtained nothing. Every statement of fact below is the petitioner's own.";

const PREAMBLE_ORDER =
  "This proposed order is submitted for the Court's consideration. Every finding, every decision, every signature and every date below is left blank for the Court.";

/** What the packet is, said before anything is asked for. */
const WHAT_THIS_IS_SECTION: Section = {
  heading: "WHAT THIS DOCUMENT IS, AND WHAT IT IS NOT",
  numbered: false,
  paragraphs: [
    "It is a filing the petitioner makes in their own name, prepared from the answers the petitioner gave. It is not legal advice and LegalEase is not the petitioner's lawyer.",
    IN_SEALING_NOT_DESTRUCTION,
    IN_FILE_PUBLIC_UNTIL_GRANTED,
    IN_NO_OUTCOME
  ]
};

/** Where automated help ends, printed rather than only enforced. */
const stopSection = (extra: readonly string[]): Section => ({
  heading: "WHERE THIS PACKET STOPS",
  numbered: false,
  paragraphs: [
    "LegalEase prepares documents from what the petitioner says. It does not give legal advice, does not look at any record, does not file anything and does not speak to any court, clerk, prosecuting attorney or agency.",
    "The prosecuting attorney objects, files a notice in opposition, or asks for time.",
    "A victim submits an oral or written statement in opposition.",
    "The Court sets a hearing.",
    "The petitioner has convictions in more than one county, or the 365-day window under I.C. 35-38-9-9(i) is already partly consumed.",
    "A conviction is not eligible yet and the petitioner wants to file now, which is the Chastain v. State trap: filing early can permanently cost a record that would have ripened later.",
    "The petitioner has already filed a petition under Sections 2 through 5.",
    "Which of Sections 2, 3, 4 and 5 applies is unclear, or turns on whether an offence caused serious bodily injury.",
    "The petitioner is a sex or violent offender under I.C. 11-8-8-5, or is subject to registration.",
    "Fines, fees, costs or restitution are unpaid or disputed.",
    "Charges are pending anywhere, or the petitioner is in a pretrial diversion programme.",
    "The record involves a commercial driver's licence, where 49 C.F.R. 384.226 bars masking a conviction.",
    "Immigration, firearm, licensing or commercial-driving consequences are in play.",
    "The petitioner wants to attack the underlying conviction rather than expunge it.",
    ...extra,
    `Where any of these applies, speak to a lawyer before filing anything. ${IN_REFERRAL}`
  ]
});

const PETITIONER_SIGNATURE_BLOCK: readonly string[] = [
  "_____________________________________, Petitioner, self-represented",
  "Printed name: _______________________________________________",
  "Address: ____________________________________________________",
  "Telephone: __________________________________________________",
  "Email: ______________________________________________________",
  "Date: _______________________________________________________",
  "",
  "Sign and date this by hand in your own name. The design records no notarization requirement for this filing, so no notarial block is printed here; confirm current local practice with the clerk before filing.",
  "Confirm the court's own name, the division and the cause number with the clerk before filing. LegalEase did not ask for them and has not supplied them."
];

/** The court signs. Every line here stays blank on the generated document. */
const COURT_SIGNATURE_BLOCK: readonly string[] = [
  "_____________________________________",
  "JUDGE",
  "",
  "Date: ______________________"
];

/**
 * The I.C. 35-38-9-8(b) identity block, as rules the petitioner completes.
 *
 * The statute requires every one of these in a conviction petition. The adopted
 * design declares none of them as a participant input, and on the Social
 * Security number it forbids collecting or persisting the full number at all. So
 * they are printed as labelled rules and the petition says why.
 */
const IDENTITY_SECTION: Section = {
  heading: "I.  PETITIONER, COMPLETED BY HAND — I.C. 35-38-9-8(b)",
  numbered: false,
  paragraphs: [
    "I.C. 35-38-9-8(b) requires each of the following in a verified petition. LegalEase did not ask the petitioner for any of them and has printed none of them. Complete each line by hand from the petitioner's own records before filing, and add a continuation page where a line is not long enough.",
    "Full legal name: _________________________________________________________",
    "Every other legal name, alias or nickname ever used: _____________________",
    "_________________________________________________________________________",
    "Date of birth: ___________________________________________________________",
    "Every address from the date of the offence to the date of this petition:",
    "_________________________________________________________________________",
    "_________________________________________________________________________",
    "Social Security number, LAST FOUR DIGITS ONLY: ______________",
    "Driver's licence number: _________________________________________________",
    "Date or dates of arrest, if applicable: __________________________________",
    "The full Social Security number does NOT go on this page. It goes on the Confidential Information Form, which is filed as a confidential document and accompanied by the Notice of Exclusion of Confidential Information from Public Access. LegalEase never asks for the full number, never prints it and never keeps it."
  ]
};

// ---------------------------------------------------------------------------
// in_collateral_action — I.C. 35-38-9-9.5
// ---------------------------------------------------------------------------

const COLLATERAL_REQUEST: PleadingTemplate = {
  templateId: "in_collateral_action-request",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine:
      "IN THE ______________________ COURT OF {{collateralActionCountyUpper}} COUNTY, INDIANA",
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight(
      "Cause No. {{collateralActionCauseNumber}}",
      "VERIFIED REQUEST TO EXPUNGE A COLLATERAL ACTION"
    )
  },
  title: "VERIFIED REQUEST TO EXPUNGE A COLLATERAL ACTION, I.C. 35-38-9-9.5",
  preamble: PREAMBLE_PETITION,
  sections: [
    {
      heading: "WHERE THIS IS FILED, AND UNDER WHICH CAUSE NUMBER",
      numbered: false,
      paragraphs: [
        "This request belongs in a circuit or superior court in the county where the related action happened, filed under that action's own cause number where the clerk will take it there. Write the court's own name and division into the caption above after confirming both with the clerk. LegalEase does not know which of the county's courts holds the related action and has not guessed.",
        "There is no filing fee for this request."
      ]
    },
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  THE ORIGINAL EXPUNGEMENT",
      numbered: true,
      paragraphs: [
        "{{originalExpungementStatement}}",
        "I.C. 35-38-9-9.5 allows a person whose records have been expunged to request the expungement of an action or proceeding, including an administrative proceeding, that is factually or legally related to the arrest, charge, allegation, conviction or adjudication that was expunged."
      ]
    },
    {
      heading: "II.  THE RELATED ACTION",
      numbered: true,
      paragraphs: [
        "The related action is in {{collateralActionCounty}}, under cause number {{collateralActionCauseNumber}}.",
        "{{collateralActionTypeSentence}}"
      ]
    },
    {
      heading: "III.  HOW THE TWO MATTERS ARE RELATED",
      numbered: false,
      paragraphs: [
        PARTICIPANT_STATEMENT_PREFIX,
        "{{relationshipStatement}}",
        PARTICIPANT_STATEMENT_SUFFIX,
        "Whether the related action is factually or legally related to the expunged matter is for the Court. This request asserts no finding on it."
      ]
    },
    {
      heading: "IV.  WHAT HAPPENS AFTER THIS IS FILED",
      numbered: false,
      paragraphs: [
        "Under I.C. 35-38-9-9.5 the Court notifies the prosecuting attorney of that county and sets a hearing, or may grant the request without a hearing where the record conclusively establishes that the petitioner is entitled to the relief.",
        "The Court gives that notice. Ask the clerk whether this court also expects the petitioner to serve the prosecuting attorney, and do so if it does; do not assume no service is required.",
        "{{orderDirectionRecital}}"
      ]
    },
    stopSection([
      "A finding by the Court that the related action does not relate to the expunged matter.",
      "The certified copy of the original expungement order cannot be obtained, or is not properly certified."
    ])
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the Court to expunge the records of the related action in cause number {{collateralActionCauseNumber}} under I.C. 35-38-9-9.5, and to enter the proposed order submitted with this request.",
    IN_NO_OUTCOME
  ],
  verification:
    "The petitioner states, under the penalties for perjury, that the statements of fact in this request are true to the best of the petitioner's knowledge, information and belief. LegalEase makes no statement here; the signature below is the petitioner's own.",
  signatureLabel: "Signature of the petitioner",
  signatureBlock: PETITIONER_SIGNATURE_BLOCK
};

const COLLATERAL_ORDER: PleadingTemplate = {
  templateId: "in_collateral_action-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine:
      "IN THE ______________________ COURT OF {{collateralActionCountyUpper}} COUNTY, INDIANA",
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight(
      "Cause No. {{collateralActionCauseNumber}}",
      "PROPOSED ORDER ON A COLLATERAL ACTION"
    )
  },
  title: "PROPOSED ORDER UNDER I.C. 35-38-9-9.5",
  preamble: PREAMBLE_ORDER,
  sections: [
    {
      numbered: false,
      paragraphs: [
        "This cause came before the Court on the Verified Request of the petitioner to expunge the records of a related action in cause number {{collateralActionCauseNumber}}, under I.C. 35-38-9-9.5.",
        "The Court, having considered the request and the record, FINDS:",
        "(     ) that the prosecuting attorney of {{collateralActionCounty}} was notified as I.C. 35-38-9-9.5 provides.",
        "(     ) that the related action is factually or legally related to the matter previously expunged, and that the request should be GRANTED.",
        "(     ) that the request should be DENIED.",
        "{{orderOperativeDirection}}",
        "IT IS FURTHER ORDERED that the clerk of this Court and every other person and agency holding official records of the related action comply with this order, and that the records be sealed or restricted as I.C. 35-38-9 provides. Nothing in this order directs that any record be deleted or destroyed.",
        "IT IS FURTHER ORDERED that the clerk deliver a copy of this order to the petitioner and to the prosecuting attorney of {{collateralActionCounty}}.",
        "Every blank above is the Court's. Nothing on this page has been decided."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: COURT_SIGNATURE_BLOCK
};

const COLLATERAL_EXHIBIT: PleadingTemplate = {
  templateId: "in_collateral_action-exhibit-cover",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine:
      "IN THE ______________________ COURT OF {{collateralActionCountyUpper}} COUNTY, INDIANA",
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("Cause No. {{collateralActionCauseNumber}}", "EXHIBIT COVER PAGE")
  },
  title: "EXHIBIT A — CERTIFIED COPY OF THE ORIGINAL EXPUNGEMENT ORDER",
  preamble:
    "This is a cover page, and nothing else. It is not the order it names, does not reproduce it, does not summarise it and is not evidence that it exists.",
  sections: [
    {
      heading: "WHAT GOES BEHIND THIS PAGE",
      numbered: false,
      paragraphs: [
        "Place {{exhibitDescription}} immediately behind this page.",
        "The petitioner states that the original expungement was granted in {{originalExpungementCounty}}. A properly certified copy is a prerequisite: I.C. 35-38-9-9.5 gives relief on a related action only where the underlying matter was expunged, and the certified order is what shows it was.",
        "Ask the clerk of the court that granted the expungement for a certified copy. A photocopy is not a certified copy.",
        "LegalEase has never seen this order, has not obtained it, has not checked it and does not hold it. It is the petitioner's document and the petitioner attaches it."
      ]
    },
    {
      heading: "BEFORE THIS GOES TO THE CLERK",
      numbered: false,
      paragraphs: [
        "Do not file the request without the certified copy behind this page.",
        IN_FILE_PUBLIC_UNTIL_GRANTED,
        IN_SEALING_NOT_DESTRUCTION
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: []
};

// ---------------------------------------------------------------------------
// in_conviction_serious_felony — I.C. 35-38-9-5
// ---------------------------------------------------------------------------

const FELONY_CAPTION_COURT_LINE =
  "IN THE ______________________ COURT OF {{countyOfConvictionUpper}} COUNTY, INDIANA";

const FELONY_PETITION: PleadingTemplate = {
  templateId: "in_conviction_serious_felony-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: FELONY_CAPTION_COURT_LINE,
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight(
      "Cause No. {{caseNumber}}",
      "VERIFIED PETITION FOR EXPUNGEMENT"
    )
  },
  title: "VERIFIED PETITION TO EXPUNGE A CONVICTION UNDER I.C. 35-38-9-5",
  preamble: PREAMBLE_PETITION,
  sections: [
    {
      heading: "READ THIS BEFORE THE PETITION IS FILED",
      numbered: false,
      paragraphs: [
        "{{consentFilingWarning}}",
        "I.C. 35-38-9-9(i) allows one expungement petition in a lifetime. Petitions filed in separate counties count as one only where they fall inside a single 365-day window. Under Chastain v. State a petitioner cannot later use the liberal amendment rule to add records that were not yet eligible when the first petition was filed, so filing before every record is eligible can put a record out of reach for good.",
        "This petition is filed in a circuit or superior court in the county of conviction, as case type XP under Administrative Rule 8(B)(3). Write the court's own name and division into the caption above after confirming both with the clerk. LegalEase does not know which of the county's courts entered the conviction and has not guessed.",
        "The petitioner pays the filing fee for a civil case. I.C. 35-38-9-8(d) lets the Court reduce or waive it where the petitioner is indigent. Ask the clerk for the current amount and for the indigency paperwork; no amount is stated in this packet because none has been established for it."
      ]
    },
    WHAT_THIS_IS_SECTION,
    IDENTITY_SECTION,
    {
      heading: "II.  THE CONVICTION",
      numbered: true,
      paragraphs: [
        "This petition concerns the conviction in cause number {{caseNumber}}, in {{countyOfConviction}}, Indiana.",
        "{{convictionRecital}}",
        "{{offenceStatement}}",
        "{{waitingPeriodRecital}}"
      ]
    },
    {
      heading: "III.  THE AFFIRMATIONS I.C. 35-38-9-8(b) REQUIRES",
      numbered: true,
      paragraphs: [
        "No criminal investigation and no criminal charges are pending against the petitioner anywhere.",
        "The petitioner has not been convicted of any crime within the applicable waiting period.",
        "All fines, fees and court costs in this cause have been paid, and any restitution has been satisfied.",
        "The petitioner has not previously filed a petition under Sections 2 through 5 of I.C. 35-38-9.",
        "Each affirmation above is the petitioner's own, made under the verification below. The petitioner reads each one before signing and strikes any that is not accurate."
      ]
    },
    {
      heading: "IV.  EVERY CONVICTION AND COLLATERAL ACTION, IN THE PETITIONER'S OWN WORDS",
      numbered: false,
      paragraphs: [
        "I.C. 35-38-9-8(b) requires a list of all past convictions and collateral actions, with case numbers, dates, appeals and the dates of any appellate decisions. Add a continuation page where this is not long enough, and check it against a certified limited criminal history from the Indiana State Police before filing.",
        PARTICIPANT_STATEMENT_PREFIX,
        "{{priorConvictionsStatement}}",
        PARTICIPANT_STATEMENT_SUFFIX
      ]
    },
    {
      heading: "V.  THE WRITTEN CONSENT OF THE PROSECUTING ATTORNEY",
      numbered: false,
      paragraphs: [
        "I.C. 35-38-9-5(c)(5) requires the prosecuting attorney's written consent before a petition under this section may be filed at all.",
        "{{consentStatement}}",
        "Silence is not consent, and time passing is not consent. Only a signed written consent is.",
        "LegalEase does not seek the consent, does not negotiate for it, and does not speak to the prosecuting attorney. Where the prosecuting attorney will not give it, or wants terms, that is a point to take to a lawyer."
      ]
    },
    {
      heading: "VI.  ANYTHING ELSE THE PETITIONER WANTS THE COURT TO KNOW",
      numbered: false,
      paragraphs: [
        PARTICIPANT_STATEMENT_PREFIX,
        "{{additionalInformationStatement}}",
        PARTICIPANT_STATEMENT_SUFFIX,
        "The grant under I.C. 35-38-9-5 is discretionary. Nothing in this section is an argument by LegalEase and nothing here predicts what the Court will do."
      ]
    },
    {
      heading: "VII.  NOTICE, SERVICE AND WHAT FOLLOWS",
      numbered: false,
      paragraphs: [
        "Service is made in accordance with the Indiana Rules of Trial Procedure, under I.C. 35-38-9-8(e).",
        "The prosecuting attorney must respond no later than thirty days after receipt, and waives any objection by failing to respond, under I.C. 35-38-9-8(g).",
        "The prosecuting attorney must notify the victim of their rights under I.C. 35-38-9-8(f), and a victim may submit an oral or written statement under I.C. 35-38-9-9(d).",
        "Where the prosecuting attorney does not object or waives objection, the Court may grant without a hearing under I.C. 35-38-9-9(a). Where a hearing is set, or an objection or a victim statement arrives, this packet has done what it can and the matter needs a lawyer."
      ]
    },
    stopSection([
      "The prosecuting attorney's written consent has not been obtained, or has been refused, or comes with conditions.",
      "The petitioner is unsure whether bodily injury or serious bodily injury was an element of the offence of conviction within Allen v. State, 159 N.E.3d 580 (Ind. 2020)."
    ])
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the Court to enter an order marking the records of the conviction in cause number {{caseNumber}} expunged in accordance with I.C. 35-38-9-7, and to enter the proposed order submitted with this petition.",
    IN_NO_OUTCOME
  ],
  verification:
    "The petitioner states, under the penalties for perjury, that the statements of fact in this petition are true to the best of the petitioner's knowledge, information and belief, and that the petitioner has read every affirmation above. LegalEase makes no statement here; the signature below is the petitioner's own.",
  signatureLabel: "Signature of the petitioner",
  signatureBlock: PETITIONER_SIGNATURE_BLOCK
};

const FELONY_ORDER: PleadingTemplate = {
  templateId: "in_conviction_serious_felony-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: FELONY_CAPTION_COURT_LINE,
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("Cause No. {{caseNumber}}", "PROPOSED ORDER OF EXPUNGEMENT")
  },
  title: "PROPOSED ORDER OF EXPUNGEMENT UNDER I.C. 35-38-9-5 AND I.C. 35-38-9-7",
  preamble: PREAMBLE_ORDER,
  sections: [
    {
      numbered: false,
      paragraphs: [
        "This cause came before the Court on the Verified Petition of the petitioner to expunge the records of the conviction in cause number {{caseNumber}}, under I.C. 35-38-9-5.",
        "The Court, having considered the petition and the record, FINDS:",
        "(     ) that the prosecuting attorney of {{countyOfConviction}} was served under I.C. 35-38-9-8(e).",
        "(     ) that the written consent I.C. 35-38-9-5(c)(5) requires has been given.",
        "(     ) that the period I.C. 35-38-9-5 requires has elapsed.",
        "(     ) that the petition should be GRANTED.",
        "(     ) that the petition should be DENIED.",
        "IT IS THEREFORE ORDERED that the records of the conviction in cause number {{caseNumber}} be MARKED AS EXPUNGED in accordance with I.C. 35-38-9-7.",
        "IT IS FURTHER ORDERED that the clerk, the arresting agency and every other person or agency holding official records of this conviction mark them expunged and restrict them as I.C. 35-38-9-7 provides. Nothing in this order directs that any record be deleted or destroyed.",
        "IT IS FURTHER ORDERED that the clerk deliver a copy of this order to the petitioner and to the prosecuting attorney of {{countyOfConviction}}.",
        "Every finding, box and blank above is the Court's; nothing here has been decided, and the grant under I.C. 35-38-9-5 is discretionary."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: COURT_SIGNATURE_BLOCK
};

const FELONY_CONSENT_EXHIBIT: PleadingTemplate = {
  templateId: "in_conviction_serious_felony-consent-exhibit-cover",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: FELONY_CAPTION_COURT_LINE,
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("Cause No. {{caseNumber}}", "EXHIBIT COVER PAGE")
  },
  title: "{{consentExhibitHeadline}}",
  preamble:
    "This is a cover page, and nothing else. It is not a consent, does not reproduce one, does not summarise one and is not evidence that one exists.",
  sections: [
    {
      heading: "WHAT GOES BEHIND THIS PAGE",
      numbered: false,
      paragraphs: [
        "{{consentExhibitBody}}",
        "LegalEase does not draft, sign, request or negotiate this consent."
      ]
    },
    {
      heading: "HOW TO ASK FOR IT",
      numbered: false,
      paragraphs: [
        "Write to the prosecuting attorney of the county of conviction. Give the cause number and the conviction date, and ask for consent under I.C. 35-38-9-5(c)(5) to the expungement of the records in that cause. Ask for the answer in writing either way, and keep whatever comes back.",
        "Silence is not consent, and time passing is not consent. Only a signed written consent is.",
        `Where the office refuses, wants conditions or does not answer, that is an attorney handoff. ${IN_REFERRAL}`
      ]
    },
    {
      heading: "BEFORE THIS GOES TO THE CLERK",
      numbered: false,
      paragraphs: [
        "Do not send the petition to the clerk without the written consent behind this page.",
        IN_FILE_PUBLIC_UNTIL_GRANTED,
        IN_SEALING_NOT_DESTRUCTION
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: []
};

const FELONY_INSTRUCTIONS: PleadingTemplate = {
  templateId: "in_conviction_serious_felony-instructions",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine:
      "FILING AND SERVICE INSTRUCTIONS FOR THE PETITIONER — KEEP THIS PAGE, DO NOT FILE IT",
    partyBlockLeft: [
      "For the petitioner's own use.",
      "",
      "Cause No. {{caseNumber}}",
      "County of conviction: {{countyOfConviction}}"
    ],
    partyBlockRight: [
      "Section 5 expungement",
      "",
      "I.C. 35-38-9-5",
      "",
      "Case type XP"
    ]
  },
  title: "HOW TO FINISH, FILE AND SERVE THIS PACKET",
  preamble:
    "This sheet is for the petitioner and is not filed with anything. Read it before the petition goes anywhere.",
  sections: [
    {
      heading: "1.  DO NOT FILE WITHOUT THE PROSECUTING ATTORNEY'S WRITTEN CONSENT",
      numbered: false,
      paragraphs: [
        "{{consentFilingWarning}}",
        "I.C. 35-38-9-5(c)(5) makes the written consent a condition of filing a Section 5 petition at all. Ask the prosecuting attorney of the county of conviction in writing, give the cause number and the conviction date, ask for an answer either way in writing, and keep it.",
        "Silence is not consent. Time passing is not consent. Only a signed written consent is.",
        "Place the consent behind the Exhibit A cover page in this packet when it arrives."
      ]
    },
    {
      heading: "2.  THE ONE PETITION YOU GET, AND WHY THE ORDER MATTERS",
      numbered: false,
      paragraphs: [
        "I.C. 35-38-9-9(i) allows one expungement petition in a lifetime. Petitions filed in separate counties count as one only where they fall inside a single 365-day window.",
        "Under Chastain v. State a petitioner cannot later use the liberal amendment rule to add records that were not yet eligible when the first petition was filed. Filing before every record is eligible can put a record out of reach for good.",
        "Get a certified limited criminal history from the Indiana State Police first, work out the eligibility date of every conviction in every county, and decide the order and the timing before anything is filed. That decision is worth more than this document.",
        "Where any conviction is not eligible yet, stop and take the criminal history and the judgment to a lawyer before filing. The order and the timing of the filings decide what can ever be cleared."
      ]
    },
    {
      heading: "3.  FILL IN BY HAND WHAT LEGALEASE DID NOT ASK FOR",
      numbered: false,
      paragraphs: [
        "The petition carries an I.C. 35-38-9-8(b) block of blank rules: full legal name, every other name or alias, date of birth, every address from the date of the offence to today, the last four digits of the Social Security number, the driver's licence number, and the dates of any arrests. LegalEase did not ask for any of them and has printed none of them. Complete each one by hand.",
        "Only the LAST FOUR digits of the Social Security number go on the petition. The full number goes on the Confidential Information Form, filed as a confidential document. LegalEase never asks for the full number and never keeps it.",
        "Write the court's own name and division into every caption, and the cause number where it is not already there, after confirming both with the clerk.",
        "Read every affirmation in Section III of the petition before signing, and strike any that is not accurate."
      ]
    },
    {
      heading: "4.  THREE COURT FORMS THIS PACKET DOES NOT CONTAIN",
      numbered: false,
      paragraphs: [
        "Three documents the Court expects with a Section 5 petition are official court forms. They are not in this packet, LegalEase does not produce them, and this packet does not reproduce or stand in for any of them. Get each from the Coalition for Court Access expungement forms page maintained by the Indiana Office of Judicial Administration, or from the clerk of the court of conviction.",
        "Notice of Exclusion of Confidential Information from Public Access, form CCA-XP-0120-7002 Form ACR. Required.",
        "Confidential Information Form, which carries the full Social Security number and is filed as a confidential document. Required.",
        "Appearance by Unrepresented Person in Expungement Matter, form CCA-GF-0120-3016. Required where the petitioner files without a lawyer.",
        "Do not file the petition until all three are completed and in hand. A packet without them is incomplete, and this sheet says so rather than pretending otherwise."
      ]
    },
    {
      heading: "5.  FILING",
      numbered: false,
      paragraphs: [
        "File the verified petition and the proposed order in a circuit or superior court in the county of conviction, as case type XP under Administrative Rule 8(B)(3).",
        "The petitioner pays the filing fee for a civil case. I.C. 35-38-9-8(d) lets the Court reduce or waive it where the petitioner is indigent. Ask the clerk for the current amount and for the indigency paperwork. No amount is printed in this packet, because none has been established for it.",
        IN_FILE_PUBLIC_UNTIL_GRANTED
      ]
    },
    {
      heading: "6.  SERVICE, AND THE PROSECUTOR'S THIRTY DAYS",
      numbered: false,
      paragraphs: [
        "Serve the prosecuting attorney in accordance with the Indiana Rules of Trial Procedure, under I.C. 35-38-9-8(e). Ask the clerk how that court expects service to be made and evidenced.",
        "The prosecuting attorney must respond no later than thirty days after receipt, and waives any objection by failing to respond, under I.C. 35-38-9-8(g).",
        "The prosecuting attorney must notify the victim of their rights under I.C. 35-38-9-8(f), and a victim may submit an oral or written statement under I.C. 35-38-9-9(d).",
        "Where the prosecuting attorney does not object or waives objection, the Court may grant without a hearing under I.C. 35-38-9-9(a).",
        "LegalEase serves nothing and files nothing. Nothing in this packet says that service has happened; the petitioner does it and keeps the proof."
      ]
    },
    {
      heading: "7.  AFTER THE ORDER, IF ONE IS GRANTED",
      numbered: false,
      paragraphs: [
        IN_SEALING_NOT_DESTRUCTION,
        "Ask the clerk for certified copies of the order and give one to every agency named in it.",
        "A related case, forfeiture or driving-privileges matter may be cleared separately under I.C. 35-38-9-9.5 once this order is granted. That is a different filing.",
        "Where the law is later amended in a way that gives greater relief, I.C. 35-38-9-9(l) allows a supplemental petition in the court that granted the expungement. That too is a different filing."
      ]
    },
    stopSection([
      "The prosecuting attorney's written consent has not been obtained, or has been refused, or comes with conditions.",
      "Any of the three official court forms above cannot be obtained."
    ])
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: []
};

// ---------------------------------------------------------------------------
// in_supplemental_order — I.C. 35-38-9-9(l)
// ---------------------------------------------------------------------------

const SUPPLEMENTAL_COURT_LINE = "IN THE ______________________________________, INDIANA";

const SUPPLEMENTAL_PETITION: PleadingTemplate = {
  templateId: "in_supplemental_order-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: SUPPLEMENTAL_COURT_LINE,
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight(
      "Cause No. ____________________",
      "SUPPLEMENTAL PETITION AFTER AN AMENDMENT"
    )
  },
  title: "SUPPLEMENTAL PETITION UNDER I.C. 35-38-9-9(l)",
  preamble: PREAMBLE_PETITION,
  sections: [
    {
      heading: "WHERE THIS IS FILED, AND UNDER WHICH CAUSE NUMBER",
      numbered: false,
      paragraphs: [
        "I.C. 35-38-9-9(l) puts a supplemental petition in the court that granted the expungement, and nowhere else. The petitioner names that court as: {{originalExpungementCourt}}.",
        "Write that court's own name, and the cause number, into every caption in this packet, taking both from the certified copy of the original expungement order. LegalEase asked only which court granted the expungement and has supplied neither. Confirm with the clerk whether that court takes the supplemental petition under the same cause number or opens a new one.",
        "No fee has been established for a supplemental petition, and none is stated here. Ask the clerk what that court charges and whether an indigency waiver is available."
      ]
    },
    WHAT_THIS_IS_SECTION,
    {
      heading: "I.  THE EXPUNGEMENT ALREADY GRANTED",
      numbered: true,
      paragraphs: [
        "{{grantRecital}}",
        "I.C. 35-38-9-9(l) allows a person whose expungement was granted before the chapter was amended, in a way that provides greater relief, to petition the court that granted it, succinctly setting out the relief sought."
      ]
    },
    {
      heading: "II.  THE AMENDMENT RELIED ON",
      numbered: false,
      paragraphs: [
        PARTICIPANT_STATEMENT_PREFIX,
        "{{amendmentStatement}}",
        PARTICIPANT_STATEMENT_SUFFIX,
        "LegalEase has not decided that the amendment named above provides greater relief, and this petition does not assert that it does. Which amendment provides greater relief in a given cycle is a legal judgment, and I.C. 35-38-9-9(l) leaves both findings to the Court.",
        "I.C. 35-38-9 has been amended in most recent sessions, and the Office of Judicial Administration's own publication says the statutes experience yearly modification. Confirm the current text of the chapter, and of any amendment relied on, before anything is filed."
      ]
    },
    {
      heading: "III.  THE RELIEF SOUGHT",
      numbered: false,
      paragraphs: [
        PARTICIPANT_STATEMENT_PREFIX,
        "{{reliefSoughtStatement}}",
        PARTICIPANT_STATEMENT_SUFFIX,
        "I.C. 35-38-9-9(l) provides that on finding both that relief was granted before the amendment and that the petitioner is otherwise entitled to the relief the amendment provides, the Court shall grant the supplemental petition consistent with the amendment. Both findings are the Court's, and neither has been made."
      ]
    },
    {
      heading: "IV.  NOTICE AND SERVICE",
      numbered: false,
      paragraphs: [
        "The review supplies no distinct notice rule for a supplemental petition, and this packet invents none. Follow the ordinary Indiana Rules of Trial Procedure for service on the prosecuting attorney, and ask the clerk what that court expects.",
        "LegalEase serves nothing and files nothing. Nothing in this packet says that service has happened."
      ]
    },
    stopSection([
      "Which amendment provides greater relief is not settled. That is a legal judgment and it belongs with a lawyer before this petition is offered at all.",
      "The certified copy of the original expungement order cannot be obtained, or is not properly certified."
    ])
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the Court to grant this supplemental petition consistent with the amendment relied on, under I.C. 35-38-9-9(l), and to enter the proposed order submitted with it.",
    IN_NO_OUTCOME
  ],
  verification:
    "The petitioner states, under the penalties for perjury, that the statements of fact in this petition are true to the best of the petitioner's knowledge, information and belief. LegalEase makes no statement here; the signature below is the petitioner's own.",
  signatureLabel: "Signature of the petitioner",
  signatureBlock: PETITIONER_SIGNATURE_BLOCK
};

const SUPPLEMENTAL_ORDER: PleadingTemplate = {
  templateId: "in_supplemental_order-proposed-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: SUPPLEMENTAL_COURT_LINE,
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight(
      "Cause No. ____________________",
      "PROPOSED SUPPLEMENTAL ORDER"
    )
  },
  title: "PROPOSED SUPPLEMENTAL ORDER UNDER I.C. 35-38-9-9(l)",
  preamble: PREAMBLE_ORDER,
  sections: [
    {
      numbered: false,
      paragraphs: [
        "This cause came before the Court on the Supplemental Petition of the petitioner under I.C. 35-38-9-9(l), asking for relief consistent with an amendment to I.C. 35-38-9 made after the expungement in this cause was granted.",
        "The Court, having considered the petition and the record, FINDS:",
        "(     ) that the petitioner was granted relief under I.C. 35-38-9 before the amendment relied on.",
        "(     ) that the petitioner is otherwise entitled to the relief the amendment provides.",
        "(     ) that the supplemental petition should be GRANTED consistent with the amendment.",
        "(     ) that the supplemental petition should be DENIED.",
        "IT IS THEREFORE ORDERED that the relief previously granted in this cause be supplemented consistent with the amendment the Court finds applies, and that the records be sealed or restricted accordingly as I.C. 35-38-9 provides. Nothing in this order directs that any record be deleted or destroyed.",
        "IT IS FURTHER ORDERED that the clerk deliver a copy of this order to the petitioner and to the prosecuting attorney.",
        "The extent of the supplemental relief is left blank for the Court to state, because it follows from the amendment the Court finds applies. Every finding, every box and every blank above is the Court's."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: COURT_SIGNATURE_BLOCK
};

const SUPPLEMENTAL_EXHIBIT: PleadingTemplate = {
  templateId: "in_supplemental_order-exhibit-cover",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: SUPPLEMENTAL_COURT_LINE,
    partyBlockLeft: CAPTION_LEFT,
    partyBlockRight: captionRight("Cause No. ____________________", "EXHIBIT COVER PAGE")
  },
  title: "EXHIBIT A — CERTIFIED COPY OF THE ORIGINAL EXPUNGEMENT ORDER",
  preamble:
    "This is a cover page, and nothing else. It is not the order it names, does not reproduce it, does not summarise it and is not evidence that it exists.",
  sections: [
    {
      heading: "WHAT GOES BEHIND THIS PAGE",
      numbered: false,
      paragraphs: [
        "Place {{exhibitDescription}} immediately behind this page.",
        "The petitioner names the granting court as: {{originalExpungementCourt}}. The certified order is what shows that relief was granted before the amendment relied on, which is the first of the two findings I.C. 35-38-9-9(l) requires.",
        "Ask the clerk of the granting court for a certified copy. A photocopy is not a certified copy.",
        "LegalEase has never seen this order, has not obtained it, has not checked it and does not hold it. It is the petitioner's document and the petitioner attaches it."
      ]
    },
    {
      heading: "BEFORE THIS GOES TO THE CLERK",
      numbered: false,
      paragraphs: [
        "Do not file the supplemental petition without the certified copy behind this page.",
        "Take the cause number from the certified order and write it into every caption in this packet.",
        IN_FILE_PUBLIC_UNTIL_GRANTED,
        IN_SEALING_NOT_DESTRUCTION
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: []
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const INDIANA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> = {
  [COLLATERAL_REQUEST.templateId]: COLLATERAL_REQUEST,
  [COLLATERAL_ORDER.templateId]: COLLATERAL_ORDER,
  [COLLATERAL_EXHIBIT.templateId]: COLLATERAL_EXHIBIT,
  [FELONY_PETITION.templateId]: FELONY_PETITION,
  [FELONY_ORDER.templateId]: FELONY_ORDER,
  [FELONY_CONSENT_EXHIBIT.templateId]: FELONY_CONSENT_EXHIBIT,
  [FELONY_INSTRUCTIONS.templateId]: FELONY_INSTRUCTIONS,
  [SUPPLEMENTAL_PETITION.templateId]: SUPPLEMENTAL_PETITION,
  [SUPPLEMENTAL_ORDER.templateId]: SUPPLEMENTAL_ORDER,
  [SUPPLEMENTAL_EXHIBIT.templateId]: SUPPLEMENTAL_EXHIBIT
};

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * Design role → engine role.
 *
 * `PacketComponentRole` is a closed twelve-value engine type this job does not
 * own. All four of the design's Indiana custom-pleading roles have an exact
 * counterpart, so the mapping is the identity — but it is stated rather than
 * assumed, and the verifier asserts it.
 *
 *   primary_filing → primary_filing   the operative filing on each route
 *   proposed_order → proposed_order   the order the court is asked to enter
 *   attachment     → attachment       an unexecuted accompaniment, here a cover
 *                                     page for a document the petitioner obtains
 *   instructions   → instructions     kept by the petitioner, filed with nothing
 */
export const IN_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order",
  attachment: "attachment",
  instructions: "instructions"
};

const component = (
  componentId: string,
  designRole: keyof typeof IN_DESIGN_ROLE_TO_ENGINE_ROLE,
  templateId: string,
  order: number
): PacketSet["components"][number] => ({
  componentId,
  role: IN_DESIGN_ROLE_TO_ENGINE_ROLE[designRole],
  outputStrategy: "custom_pleading",
  rendererStrategy: "custom_pleading",
  templateId,
  sourcePath: null,
  sourceSha256: null,
  geographicScope: "statewide",
  requirement: "required",
  order,
  approval: PENDING_APPROVAL,
  version: VERSION
});

const COLLATERAL_PACKET_SET: PacketSet = {
  packetSetId: `${IN_COLLATERAL_ACTION}-set`,
  version: VERSION,
  components: [
    component(
      `${IN_COLLATERAL_ACTION}-primary-filing-1`,
      "primary_filing",
      COLLATERAL_REQUEST.templateId,
      1
    ),
    component(
      `${IN_COLLATERAL_ACTION}-proposed-order-2`,
      "proposed_order",
      COLLATERAL_ORDER.templateId,
      2
    ),
    component(`${IN_COLLATERAL_ACTION}-attachment-3`, "attachment", COLLATERAL_EXHIBIT.templateId, 3)
  ]
};

/**
 * The Section 5 packet set carries the four custom-pleading components only.
 *
 * Orders 4, 5 and 6 are deliberately absent: the design assigns them to
 * `official_pdf_fill` and this job produces no binary. The instruction sheet
 * keeps the design's order 7 rather than being renumbered, so the packet's own
 * ordering says where the missing forms belong.
 */
const FELONY_PACKET_SET: PacketSet = {
  packetSetId: `${IN_SERIOUS_FELONY}-set`,
  version: VERSION,
  components: [
    component(`${IN_SERIOUS_FELONY}-primary-filing-1`, "primary_filing", FELONY_PETITION.templateId, 1),
    component(`${IN_SERIOUS_FELONY}-proposed-order-2`, "proposed_order", FELONY_ORDER.templateId, 2),
    component(
      `${IN_SERIOUS_FELONY}-attachment-3`,
      "attachment",
      FELONY_CONSENT_EXHIBIT.templateId,
      3
    ),
    component(
      `${IN_SERIOUS_FELONY}-instructions-7`,
      "instructions",
      FELONY_INSTRUCTIONS.templateId,
      7
    )
  ]
};

const SUPPLEMENTAL_PACKET_SET: PacketSet = {
  packetSetId: `${IN_SUPPLEMENTAL_ORDER}-set`,
  version: VERSION,
  components: [
    component(
      `${IN_SUPPLEMENTAL_ORDER}-primary-filing-1`,
      "primary_filing",
      SUPPLEMENTAL_PETITION.templateId,
      1
    ),
    component(
      `${IN_SUPPLEMENTAL_ORDER}-proposed-order-2`,
      "proposed_order",
      SUPPLEMENTAL_ORDER.templateId,
      2
    ),
    component(
      `${IN_SUPPLEMENTAL_ORDER}-attachment-3`,
      "attachment",
      SUPPLEMENTAL_EXHIBIT.templateId,
      3
    )
  ]
};

/**
 * The questions the design asks, verbatim.
 *
 * `RequiredInput` carries only a key, a label and a required flag, so where the
 * design's question needs a condition or an explanation of what a usable answer
 * looks like, it is folded into the label. No key is renamed — including
 * `amendmentRelieadOn`, which is misspelled in the normalized memo and is
 * nonetheless the declared key.
 */
const COLLATERAL_INPUTS: readonly RequiredInput[] = [
  {
    key: "originalExpungementCounty",
    label:
      "Which county granted your original expungement, and on what date? Take both from the certified copy of the order; the request has to identify the order it relates to.",
    required: true
  },
  {
    key: "originalExpungementSection",
    label:
      "Was the original expungement granted under Section 1, 2, 3, 4 or 5? It decides whether the related action is expunged or marked as expunged. Answer 1, 2, 3, 4 or 5.",
    required: true
  },
  {
    key: "collateralActionCounty",
    label: "In which county did the related action happen?",
    required: true
  },
  {
    key: "collateralActionCauseNumber",
    label: "What is the cause number of the related action, if it has one?",
    required: true
  },
  {
    key: "collateralActionType",
    label:
      "What kind of related action is it — a seizure, a civil forfeiture, a specialized driving privileges petition, or an administrative proceeding?",
    required: true
  },
  {
    key: "relationshipToExpungedMatter",
    label:
      "In your own words, how is the related action connected to the case that was expunged? This goes into the request as your own statement and LegalEase does not write it for you.",
    required: true
  }
];

const FELONY_INPUTS: readonly RequiredInput[] = [
  { key: "countyOfConviction", label: "In which Indiana county were you convicted?", required: true },
  { key: "caseNumber", label: "What is the cause number?", required: true },
  { key: "convictionDate", label: "On what date were you convicted? Take it from the chronological case summary.", required: true },
  {
    key: "offenseLevel",
    label:
      "Was the offence a misdemeanour, a Class D or Level 6 felony, another felony, or a felony involving serious bodily injury? This route is I.C. 35-38-9-5 only; the first two answers belong to a different route.",
    required: true
  },
  {
    key: "sentenceCompletionDate",
    label:
      "On what date did you complete your sentence, including any probation or parole? The Section 5 period runs from the later of ten years after conviction or five years after completion.",
    required: true
  },
  {
    key: "allConvictionsAnyCounty",
    label:
      "List every conviction you have in Indiana, in any county, and whether each is eligible yet. Check it against a certified limited criminal history from the Indiana State Police, not from memory.",
    required: true
  },
  {
    key: "priorExpungementPetition",
    label:
      "Have you ever filed an expungement petition under Sections 2 through 5 before? Answer yes or no. I.C. 35-38-9-9(i) allows one in a lifetime.",
    required: true
  },
  {
    key: "financialObligationsPaid",
    label:
      "Have you paid all fines, fees and court costs, and satisfied any restitution? Answer yes or no. Ask the clerk for the balance on the cause rather than answering from memory.",
    required: true
  },
  {
    key: "pendingCharges",
    label:
      "Do you have any criminal charges pending anywhere? Answer yes or no. A pretrial diversion programme counts as pending.",
    required: true
  },
  {
    key: "convictedWithinPeriod",
    label: "Have you been convicted of any crime within the applicable waiting period? Answer yes or no.",
    required: true
  },
  {
    key: "prosecutorConsent",
    label:
      "Has the prosecuting attorney given written consent, either to shorten the waiting period or to allow the filing? Answer yes or no. Silence is not consent, and the packet still generates if the answer is no.",
    required: true
  },
  {
    key: "additionalInformation",
    label:
      "In your own words, is there anything else you want the court to know in support of your petition? This goes into the petition as your own statement and LegalEase does not write it for you.",
    required: true
  }
];

const SUPPLEMENTAL_INPUTS: readonly RequiredInput[] = [
  {
    key: "originalExpungementCourt",
    label:
      "Which court granted your original expungement, and on what date? The supplemental petition goes to that court and nowhere else; take both from the certified copy of the order.",
    required: true
  },
  {
    key: "originalExpungementSection",
    label: "Under which section was your original expungement granted? Answer 1, 2, 3, 4 or 5.",
    required: true
  },
  {
    key: "amendmentRelieadOn",
    label:
      "Which change in the law do you believe gives you greater relief? Which amendment provides greater relief is a legal judgment that has to be settled before this petition is offered.",
    required: true
  },
  {
    key: "reliefSought",
    label:
      "In your own words, what additional relief are you asking the court for? I.C. 35-38-9-9(l) asks for the relief sought to be set out succinctly, and this goes in as your own statement.",
    required: true
  }
];

const statuses = {
  research: "research_draft_complete",
  technical: "renderer_ready",
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

const runtime = () =>
  computeRuntimeStatus({
    statuses,
    sourceCurrent: true,
    runtimeDisabled: true,
    outputStrategy: "custom_pleading"
  });

export const INDIANA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  {
    jurisdiction: "IN",
    trackId: IN_COLLATERAL_ACTION,
    publicName: "Clearing a related case, forfeiture or driving-privileges matter after your expungement",
    mechanism: "request_to_expunge_a_collateral_action",
    authority: "I.C. 35-38-9-9.5",
    recordTypes: ["collateral_action_record", "civil_forfeiture_record", "administrative_proceeding_record"],
    dispositions: ["collateral_action_related_to_expunged_matter"],
    courtLevel: "circuit_or_superior_court_of_the_county_of_the_collateral_action",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: COLLATERAL_PACKET_SET,
    requiredInputs: COLLATERAL_INPUTS,
    statuses: { ...statuses, runtime: runtime() },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "in-collateral-action-expungement",
    assembledPacketTitle: "Indiana collateral action expungement — I.C. 35-38-9-9.5",
    customerDeliverableDescription:
      "A verified request asking a circuit or superior court to expunge a seizure, civil forfeiture, specialized-driving-privileges petition or administrative proceeding that is factually or legally related to a matter already expunged, with the proposed order and a cover page for the certified original expungement order the petitioner obtains and attaches. There is no filing fee. The order is drawn to expunge where the original grant came under Sections 1 through 3 and to mark expunged where it came under Sections 4 or 5, which is the design's own mapping. Whether the two matters are related is left to the court, and every judicial field stays blank.",
    notes:
      "The design carries an open release blocker on whether the Coalition for Court Access publishes a statewide form for § 35-38-9-9.5. Until that is settled the route is a controlled statutory custom pleading with a local-form override, and the packet tells the petitioner to confirm the court's own name and any local preference with the clerk rather than assuming this document is the accepted one."
  },
  {
    jurisdiction: "IN",
    trackId: IN_SERIOUS_FELONY,
    publicName: "Clearing a serious felony conviction with the prosecutor's written consent",
    mechanism: "petition_to_expunge_a_serious_felony_conviction",
    authority: "I.C. 35-38-9-5",
    recordTypes: ["conviction_record"],
    dispositions: [
      "serious_felony_conviction",
      "felony_with_serious_bodily_injury",
      "elected_official_offense"
    ],
    courtLevel: "circuit_or_superior_court_of_the_county_of_conviction_case_type_xp",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: FELONY_PACKET_SET,
    requiredInputs: FELONY_INPUTS,
    statuses: { ...statuses, runtime: runtime() },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "in-section-5-expungement",
    assembledPacketTitle: "Indiana Section 5 conviction expungement — I.C. 35-38-9-5",
    customerDeliverableDescription:
      "A verified petition drawn to I.C. 35-38-9-5 and I.C. 35-38-9-8(b), the proposed order under I.C. 35-38-9-7, a cover page for the prosecuting attorney's written consent, and a filing and service instruction sheet. The Coalition for Court Access publishes no Section 5 insert, so the petition is a controlled statutory custom pleading with a local-form override. Written prosecutor consent is a condition of filing and is the prosecutor's own document: LegalEase neither obtains it nor negotiates for it, and where it has not been obtained the packet says in terms that the petition must not be filed. Three official court forms the packet cannot produce are named rather than reproduced.",
    notes:
      "Four custom-pleading components of the design's seven. The three official_pdf_fill attachments — CCA-XP-0120-7002 Form ACR, the Confidential Information Form and CCA-GF-0120-3016 — belong to the official-PDF lane, have no binary in this checkout, and are recorded in IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS and named on the instruction sheet. The assembled packet is therefore not a complete Section 5 filing and does not claim to be. The design declares no identity inputs, so the I.C. 35-38-9-8(b) block is printed as rules the petitioner completes; the full Social Security number is never asked for, printed or kept."
  },
  {
    jurisdiction: "IN",
    trackId: IN_SUPPLEMENTAL_ORDER,
    publicName: "Asking for more relief after the law changed in your favour",
    mechanism: "supplemental_petition_after_a_favorable_amendment",
    authority: "I.C. 35-38-9-9(l)",
    recordTypes: ["previously_expunged_record"],
    dispositions: ["expungement_granted_before_favorable_amendment"],
    courtLevel: "the_court_that_granted_the_original_expungement",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: SUPPLEMENTAL_PACKET_SET,
    requiredInputs: SUPPLEMENTAL_INPUTS,
    statuses: { ...statuses, runtime: runtime() },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: "in-supplemental-petition",
    assembledPacketTitle: "Indiana supplemental petition after an amendment — I.C. 35-38-9-9(l)",
    customerDeliverableDescription:
      "A supplemental petition to the court that granted an earlier expungement, setting out succinctly the relief sought under an amendment made after the grant, with the proposed supplemental order and a cover page for the certified original expungement order. The amendment relied on is the petitioner's own, stated in the petitioner's own words: LegalEase does not decide that any amendment provides greater relief, and the petition says so. Both findings I.C. 35-38-9-9(l) requires are left to the court.",
    notes:
      "Two release blockers stay open and stay visible in the copy: whether any statewide form exists for a § 35-38-9-9(l) petition, and what P.L.77-2025 changed in § 35-38-9-5 and whether the 2026 session amended the chapter again. The design also directs that this route run as a periodic sweep of past participants after each legislative session rather than as an on-demand consumer route; that is a delivery decision for the captain, not something this module can enforce, and no fee is stated anywhere because none has been established."
  }
];
