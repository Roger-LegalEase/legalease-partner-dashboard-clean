// Maryland Tranche 2 — participant facts to official-form field values.
//
// This module is the only place a participant answer becomes a value printed on
// CC-DC-CR-148 or MDJ-008. It exists so that three things are decided once and
// provably: which branch the packet is on, which of the twelve statutory offence
// blocks are checked, and whether the participant's case numbers physically fit
// the blanks the Maryland Judiciary provided.
//
// It fails closed. Every scope restriction the accepted Maryland legal design
// imposes — one court, one county, one petition per lifetime, no domestically
// related conviction, no pending charge — is enforced here by refusing to derive
// facts at all, because a shielding petition is granted once in a lifetime and a
// packet generated outside scope is not a recoverable mistake.
//
// It also never decides a legal question. It does not decide whether charges
// form a unit, whether three years have run, or which convictions the
// participant should include. Those are participant answers and manual
// completions; this module records them and refuses to guess at them.
//
// Authority pins: data/record-clearing/implementation-tranches/tranche-2-authority-pins.json

export const MARYLAND_SHIELDING_TRACK_ID = "md_second_chance_shielding";

export class MarylandBranchError extends Error {
  constructor(
    readonly key: string,
    message: string,
    /** Identifiers only. Never a participant value. */
    readonly detail: Record<string, string | number | boolean | null> = {}
  ) {
    super(message);
    this.name = "MarylandBranchError";
  }
}

// ---------------------------------------------------------------------------
// Court-level branch
// ---------------------------------------------------------------------------

export type MarylandCourtLevel = "district" | "circuit";

export const MARYLAND_COURT_LEVELS: readonly MarylandCourtLevel[] = ["district", "circuit"];

/**
 * The court-location option lists printed in the City/County dropdown of both
 * official forms, verbatim.
 *
 * Both forms carry the identical list, and the strategy selects a dropdown value
 * only when the source form offers it. Keeping the list here lets an out-of-list
 * election be refused before rendering, with a branch error naming the field,
 * rather than silently leaving the court blank on a filed petition.
 */
export const MARYLAND_CIRCUIT_COURT_LOCATIONS: readonly string[] = [
  "Allegany County (CC)",
  "Anne Arundel County (CC)",
  "Baltimore City (CC)",
  "Baltimore County (CC)",
  "Calvert County (CC)",
  "Caroline County (CC)",
  "Carroll County (CC)",
  "Cecil County (CC)",
  "Charles County (CC)",
  "Dorchester County (CC)",
  "Frederick County (CC)",
  "Garrett County (CC)",
  "Harford County (CC)",
  "Howard County (CC)",
  "Kent County (CC)",
  "Montgomery County (CC)",
  "Prince George's County (CC)",
  "Queen Anne's County (CC)",
  "Somerset County (CC)",
  "St. Mary's County (CC)",
  "Talbot County (CC)",
  "Washington County (CC)",
  "Wicomico County (CC)",
  "Worcester County (CC)"
];

export const MARYLAND_DISTRICT_COURT_LOCATIONS: readonly string[] = [
  "Allegany County (DC)",
  "Anne Arundel County-Annapolis (DC)",
  "Anne Arundel County-Glen Burnie (DC)",
  "Baltimore City-Eastside (DC)",
  "Baltimore City-Hubbard (DC)",
  "Baltimore City-Hargrove (DC)",
  "Baltimore City-Wabash (DC)",
  "Baltimore County-Catonsville (DC)",
  "Baltimore County-Essex (DC)",
  "Baltimore County-Towson (DC)",
  "Calvert County (DC)",
  "Caroline County (DC)",
  "Carroll County (DC)",
  "Cecil County (DC)",
  "Charles County (DC)",
  "Dorchester County (DC)",
  "Frederick County (DC)",
  "Garrett County (DC)",
  "Harford County (DC)",
  "Howard County (DC)",
  "Kent County (DC)",
  "Montgomery County-Rockville (DC)",
  "Montgomery County-Silver Spring (DC)",
  "Prince George's County-Hyattsville (DC)",
  "Prince George's County-Upper Marlboro (DC)",
  "Queen Anne's County (DC)",
  "Somerset County (DC)",
  "St. Mary's County (DC)",
  "Talbot County (DC)",
  "Washington County (DC)",
  "Wicomico County (DC)",
  "Worcester County-Ocean City (DC)",
  "Worcester County-Snow Hill (DC)"
];

export function courtLocationsFor(level: MarylandCourtLevel): readonly string[] {
  return level === "circuit" ? MARYLAND_CIRCUIT_COURT_LOCATIONS : MARYLAND_DISTRICT_COURT_LOCATIONS;
}

// ---------------------------------------------------------------------------
// The twelve statutory offence branches
// ---------------------------------------------------------------------------

export type MarylandShieldableOffence = {
  /** Participant-facing branch key. */
  readonly key: string;
  readonly label: string;
  readonly citation: string;
  /** Checkbox field name on CC-DC-CR-148, verbatim. */
  readonly checkboxField: string;
  /** Case-number field name on CC-DC-CR-148, verbatim. */
  readonly caseField: string;
  /**
   * Widget width of the case-number field in PDF points, measured from the
   * source document. Capacity is derived from it rather than guessed.
   */
  readonly caseFieldWidth: number;
  /** Second line the form itself provides, where it provides one. */
  readonly continuationField: string | null;
  readonly continuationFieldWidth: number;
};

// ---------------------------------------------------------------------------
// Does it fit the blank?
// ---------------------------------------------------------------------------

/**
 * Advance widths of Times-Roman, ASCII 32 to 126, in thousandths of an em.
 *
 * Every case-number blank on CC-DC-CR-148 declares `/TiRo 11 Tf` — Times-Roman
 * at a fixed eleven points — so this is the type the court's own blanks were
 * sized for, and the renderer reproduces it. The metrics are the Adobe standard
 * ones for the base-14 Times-Roman; they are constants of the typeface, not of
 * any document.
 *
 * Not every field on the two forms is fixed at eleven points: four on
 * CC-DC-CR-148 and two on MDJ-008 declare `0 Tf` or `10 Tf`, and a `0 Tf` field
 * is one the court asked the viewer to auto-size. Those are not packed here.
 * Packing decides a case list, and every case-number blank is 11pt.
 *
 * They are inlined rather than measured through pdf-lib because packing a case
 * list is a synchronous decision taken before any document exists, and a
 * character count cannot stand in for them. `1B02SYN0041` and `CRSYNCRSYNC` are
 * both eleven characters; the second is a third wider, and on a hundred-point
 * blank that is the difference between a case number and a clipped case number.
 */
const TIMES_ROMAN_WIDTHS: readonly number[] = [
  250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444,
  921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722,
  556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500,
  333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500,
  500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541
];

/** The size both forms' text fields declare. */
export const MARYLAND_FORM_FONT_SIZE = 11;

/**
 * Points of a blank the value cannot use — the border and the padding a viewer
 * leaves either side. Matches what the renderer reserves, so the packer and the
 * renderer answer "does it fit" the same way and a split the packer proposes is
 * never one the renderer then refuses.
 */
const WIDGET_PADDING = 4;

/** Width of `text` printed in Times-Roman at the form's own size, in points. */
export function printedWidth(text: string, size: number = MARYLAND_FORM_FONT_SIZE): number {
  let thousandths = 0;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 32;
    // Anything outside printable ASCII is charged at the widest glyph in the
    // face. A Maryland case number contains none, and over-charging an unusual
    // character makes it refuse rather than clip.
    thousandths += code >= 32 && code <= 126 ? TIMES_ROMAN_WIDTHS[code - 32] : 944;
  }
  return (thousandths / 1000) * size;
}

/** True where the value fits the blank the Maryland Judiciary actually drew. */
export function fitsBlank(text: string, widgetWidthInPoints: number): boolean {
  return printedWidth(text) <= widgetWidthInPoints - WIDGET_PADDING;
}

/**
 * Md. Code, Crim. Proc. § 10-301(h), in the order CC-DC-CR-148 prints them.
 *
 * The order is the form's, not ours, because the caption's "1st Case Listed"
 * refers to the first case listed on the form.
 */
export const MARYLAND_SHIELDABLE_OFFENCES: readonly MarylandShieldableOffence[] = [
  {
    key: "disorderly_conduct",
    label: "Disorderly conduct",
    citation: "Md. Code, Crim. Law § 10-201(c)(2)",
    checkboxField: "Disorderly conduct under 10-201(c)(2) of the Criminal Law Article",
    caseField: "Case Number(s) for Disorderly conduct under 10-201(c)(2) of the Criminal Law Article",
    caseFieldWidth: 111,
    continuationField:
      "Case Number(s) for Disorderly conduct under 10-201(c)(2) of the Criminal Law Article continued",
    continuationFieldWidth: 440
  },
  {
    key: "disturbing_the_peace",
    label: "Disturbing the peace",
    citation: "Md. Code, Crim. Law § 10-201(c)(4)",
    checkboxField: "Disturbing the peace under 10-201(c)(4) of the Criminal Law Article",
    caseField: "Case Number(s) for Disturbing the peace under 10-201(c)(4) of the Criminal Law Article",
    caseFieldWidth: 106,
    continuationField:
      "Case Number(s) for Disturbing the peace under 10-201(c)(4) of the Criminal Law Article continued",
    continuationFieldWidth: 440
  },
  {
    key: "failure_to_obey_a_lawful_order",
    label: "Failure to obey a reasonable and lawful order",
    citation: "Md. Code, Crim. Law § 10-201(c)(3)",
    checkboxField:
      "Failure to obey a reasonable and lawful order under 10-201(c)(3) of the Criminal Law Article",
    caseField:
      "Case Number(s) for Failure to obey a reasonable and lawful order under 10-201(c)(3) of the Criminal Law Article",
    caseFieldWidth: 440,
    continuationField: null,
    continuationFieldWidth: 0
  },
  {
    key: "malicious_destruction_lesser_degree",
    label: "Malicious destruction of property in the lesser degree",
    citation: "Md. Code, Crim. Law § 6-301",
    checkboxField:
      "Malicious destruction of property in the lesser degree under 6-301 of the Criminal Law Article",
    caseField:
      "Case Number(s) for Malicious destruction of property in the lesser degree under 6-301 of the Criminal Law Article",
    caseFieldWidth: 439,
    continuationField: null,
    continuationFieldWidth: 0
  },
  {
    key: "trespass_on_posted_property",
    label: "Trespass on posted property",
    citation: "Md. Code, Crim. Law § 6-402",
    checkboxField: "Trespass on posted property under 6-402 of the Criminal Law Article",
    caseField: "Case Number(s) for Trespass on posted property under 6-402 of the Criminal Law Article",
    caseFieldWidth: 104,
    continuationField:
      "Case Number(s) for Trespass on posted property under 6-402 of the Criminal Law Article continued",
    continuationFieldWidth: 439
  },
  {
    key: "possession_or_administering_cds",
    label: "Possessing or administering a controlled dangerous substance",
    citation: "Md. Code, Crim. Law § 5-601",
    checkboxField:
      "Possessing or administering a controlled dangerous substance under 5-601 of the Criminal Law Article",
    caseField:
      "Case Number(s) for Possessing or administering a controlled dangerous substance under 5-601 of the Criminal Law Article",
    caseFieldWidth: 393,
    continuationField: null,
    continuationFieldWidth: 0
  },
  {
    key: "possession_or_administering_non_cds",
    label: "Possessing or administering a noncontrolled substance",
    citation: "Md. Code, Crim. Law § 5-618(a)",
    checkboxField:
      "Possessing or Administering a noncontrolled substance under 5-618(a) of the Criminal Law Article",
    caseField:
      "Case Number(s) for Possessing or Administering a noncontrolled substance under 5-618(a) of the Criminal Law Article",
    caseFieldWidth: 415,
    continuationField: null,
    continuationFieldWidth: 0
  },
  {
    key: "drug_paraphernalia",
    label: "Use of or possession with intent to use drug paraphernalia",
    citation: "Md. Code, Crim. Law § 5-619(c)(1)",
    checkboxField:
      "Use of or possession with intent to use drug paraphernalia under 5-619(c)(1) of the Criminal Law Article",
    caseField:
      "Case Number(s) for Use of or possession with intent to use drug paraphernalia under 5-619(c)(1) of the Criminal Law Article",
    caseFieldWidth: 393,
    continuationField: null,
    continuationFieldWidth: 0
  },
  {
    key: "driving_without_a_licence",
    label: "Driving without a license",
    citation: "Md. Code, Transp. § 16-101",
    checkboxField: "Driving without a license under 16-101 of the Transportation Article",
    caseField: "Case Number(s) for Driving without a license under 16-101 of the Transportation Article",
    caseFieldWidth: 107,
    continuationField:
      "Case Number(s) for Driving without a license under 16-101 of the Transportation Article continued",
    continuationFieldWidth: 440
  },
  {
    key: "driving_while_privilege_withdrawn",
    label: "Driving while privilege is canceled, suspended, refused, or revoked",
    citation: "Md. Code, Transp. § 16-303",
    checkboxField:
      "Driving while privilege is canceled, suspended, refused, or revoked under 16-303 of the Transportation Article",
    caseField:
      "Case Number(s) for Driving while privilege is canceled, suspended, refused, or revoked under 16-303 of the Transportation Article",
    caseFieldWidth: 360,
    continuationField: null,
    continuationFieldWidth: 0
  },
  {
    key: "driving_while_uninsured",
    label: "Driving while uninsured",
    citation: "Md. Code, Transp. § 17-107",
    checkboxField: "Driving while uninsured under 17-107 of the Transportation Article",
    caseField: "Case Number(s) for Driving while uninsured under 17-107 of the Transportation Article",
    caseFieldWidth: 110,
    continuationField:
      "Case Number(s) for Driving while uninsured under 17-107 of the Transportation Article continued",
    continuationFieldWidth: 439
  },
  {
    key: "prostitution",
    label: "Prostitution, not assignation",
    citation: "Md. Code, Crim. Law § 11-303, formerly § 11-306(a)(1)",
    checkboxField:
      "Prostitution (not assignation) under 11-303 (formerly 11-306(a)(1)) of the Criminal Law Article",
    caseField:
      "Case Number(s) for Prostitution (not assignation) under 11-303 (formerly 11-306(a)(1)) of the Criminal Law Article",
    caseFieldWidth: 415,
    continuationField: null,
    continuationFieldWidth: 0
  }
];

const OFFENCE_BY_KEY = new Map(MARYLAND_SHIELDABLE_OFFENCES.map((offence) => [offence.key, offence]));

/** Fact key carrying the checkbox state for one offence branch. */
export function offenceCheckboxKey(offenceKey: string): string {
  return `md148Offence_${offenceKey}`;
}

/** Fact key carrying the case-number list for one offence branch. */
export function offenceCaseKey(offenceKey: string): string {
  return `md148Cases_${offenceKey}`;
}

/** Fact key carrying the overflow line the form itself provides. */
export function offenceCaseContinuationKey(offenceKey: string): string {
  return `md148CasesContinued_${offenceKey}`;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type MarylandShieldingConviction = {
  offenceKey: string;
  caseNumbers: readonly string[];
};

export type MarylandShieldingInput = {
  petitionerName?: unknown;
  dateOfBirth?: unknown;
  petitionerStreetAddress?: unknown;
  petitionerCityStateZip?: unknown;
  petitionerTelephone?: unknown;
  petitionerCellPhone?: unknown;
  petitionerEmail?: unknown;
  courtLevel?: unknown;
  courtCityCounty?: unknown;
  courtAddress?: unknown;
  courtTelephone?: unknown;
  convictions?: unknown;
  sentenceSatisfiedDate?: unknown;
  threeYearsElapsed?: unknown;
  priorShieldingPetition?: unknown;
  pendingCriminalCharges?: unknown;
  domesticallyRelated?: unknown;
  sameIncidentIneligibleOffence?: unknown;
  convictionsInOtherCourtsOrCounties?: unknown;
  understandsShieldingNotExpungement?: unknown;
  [key: string]: unknown;
};

/**
 * The five scope answers that must be a plain "no", and the one that must be a
 * plain "yes".
 *
 * Every one of them comes from the accepted Maryland legal design's own scope
 * restrictions and self-help stop conditions. They are checked as answers, not
 * inferred: LegalEase does not conclude that a participant has never filed a
 * shielding petition, that no conviction was domestically related, or that
 * charges do not form a unit. It asks, and it refuses to build on silence.
 */
const SCOPE_ANSWERS_REQUIRING_NO = [
  {
    key: "priorShieldingPetition",
    stop: "One shielding petition will be granted in a lifetime, Md. Code, Crim. Proc. § 10-303. A participant who has already filed one is outside self-help."
  },
  {
    key: "pendingCriminalCharges",
    stop: "CC-DC-CR-148 paragraph 4 states there are no pending criminal charges against the petitioner."
  },
  {
    key: "domesticallyRelated",
    stop: "A domestically related conviction is excluded from shielding and the question is a legal judgment about the underlying charge."
  },
  {
    key: "sameIncidentIneligibleOffence",
    stop: "CC-DC-CR-148 paragraph 2 states no ineligible offence arose from the same incident, transaction or set of facts. Whether charges form a unit is a legal judgment the accepted design bars from automation."
  },
  {
    key: "convictionsInOtherCourtsOrCounties",
    stop: "The accepted Maryland design hard-blocks every multi-court and multi-county record. Generate only where the participant has eligible convictions in exactly one court in exactly one county."
  }
] as const;

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

export type MarylandDerivedFacts = Record<string, string | boolean>;

export function deriveMarylandFacts(
  trackId: string,
  input: MarylandShieldingInput
): MarylandDerivedFacts {
  if (trackId !== MARYLAND_SHIELDING_TRACK_ID) {
    throw new MarylandBranchError("unknown_track", "No Maryland fact derivation is registered for this track.", {
      trackId
    });
  }

  // --- Court-level branch -------------------------------------------------
  const courtLevel = text(input.courtLevel).toLowerCase();
  if (!(MARYLAND_COURT_LEVELS as readonly string[]).includes(courtLevel)) {
    throw new MarylandBranchError("courtLevel", "The court level must be district or circuit.", {
      supplied: courtLevel || null
    });
  }
  const level = courtLevel as MarylandCourtLevel;

  const cityCounty = text(input.courtCityCounty);
  if (!courtLocationsFor(level).includes(cityCounty)) {
    // A court location the form does not offer cannot be selected in the
    // dropdown, so it would leave the court blank on a filed petition.
    throw new MarylandBranchError(
      "courtCityCounty",
      "The court location is not one the official form offers for this court level.",
      { courtLevel: level, suppliedIsEmpty: cityCounty === "" }
    );
  }

  // --- Scope restrictions -------------------------------------------------
  for (const answer of SCOPE_ANSWERS_REQUIRING_NO) {
    const value = yesNo(input[answer.key]);
    if (value === null) {
      throw new MarylandBranchError(answer.key, "This scope question has no yes or no answer.", {
        stop: answer.stop
      });
    }
    if (value === true) {
      throw new MarylandBranchError(answer.key, "This answer puts the participant outside the packet's scope.", {
        stop: answer.stop
      });
    }
  }

  if (yesNo(input.understandsShieldingNotExpungement) !== true) {
    throw new MarylandBranchError(
      "understandsShieldingNotExpungement",
      "The participant has not confirmed they understand shielding is not expungement.",
      {
        stop: "Shielding removes a conviction from public view. It generally does not let the participant deny the conviction happened, and law enforcement, courts and certain agencies keep access."
      }
    );
  }

  if (yesNo(input.threeYearsElapsed) !== true) {
    throw new MarylandBranchError(
      "threeYearsElapsed",
      "The participant has not affirmed that three years have passed since the sentence was satisfied.",
      {
        stop: "CC-DC-CR-148 paragraph 3 is a sworn statement that at least three years have passed since the sentence for every conviction to be shielded — including parole, probation and mandatory supervision — was satisfied, with no new conviction since."
      }
    );
  }

  // --- Offence branches ---------------------------------------------------
  const convictions = normalizeConvictions(input.convictions);
  if (convictions.length === 0) {
    throw new MarylandBranchError("convictions", "No shieldable conviction was supplied.", {});
  }

  const seen = new Set<string>();
  for (const conviction of convictions) {
    if (!OFFENCE_BY_KEY.has(conviction.offenceKey)) {
      throw new MarylandBranchError("convictions", "That offence is not one of the twelve shieldable offences.", {
        offenceKey: conviction.offenceKey
      });
    }
    if (seen.has(conviction.offenceKey)) {
      // One block per offence on the form. Two entries for the same offence
      // would silently overwrite each other's case numbers.
      throw new MarylandBranchError("convictions", "The same offence was supplied twice.", {
        offenceKey: conviction.offenceKey
      });
    }
    seen.add(conviction.offenceKey);
    if (conviction.caseNumbers.length === 0) {
      throw new MarylandBranchError("convictions", "An offence was selected with no case number.", {
        offenceKey: conviction.offenceKey
      });
    }
  }

  const facts: MarylandDerivedFacts = {};

  // Every offence gets an explicit false, so an unselected box is unchecked by
  // instruction rather than by omission.
  for (const offence of MARYLAND_SHIELDABLE_OFFENCES) {
    facts[offenceCheckboxKey(offence.key)] = false;
  }

  const orderedSelections = MARYLAND_SHIELDABLE_OFFENCES.map((offence) => ({
    offence,
    conviction: convictions.find((entry) => entry.offenceKey === offence.key)
  })).filter((entry) => entry.conviction !== undefined);

  for (const { offence, conviction } of orderedSelections) {
    const joined = (conviction as MarylandShieldingConviction).caseNumbers.join(", ");
    const packed = packCaseNumbers(offence, joined);
    facts[offenceCheckboxKey(offence.key)] = true;
    facts[offenceCaseKey(offence.key)] = packed.primary;
    if (offence.continuationField) {
      facts[offenceCaseContinuationKey(offence.key)] = packed.continued;
    }
  }

  // The caption asks for the first case listed, and the form's own order is
  // what "first listed" means.
  const firstCaseNumber = (orderedSelections[0].conviction as MarylandShieldingConviction).caseNumbers[0];

  // Identity and caption values are carried through rather than demanded here.
  // Their absence is a missing required input, which the resolver decides for
  // every track in one place; this module owns the branch, the scope and the
  // physical fit, which nothing else can decide.
  const petitionerName = text(input.petitionerName);
  const streetAddress = text(input.petitionerStreetAddress);
  const cityStateZip = text(input.petitionerCityStateZip);
  const courtAddress = text(input.courtAddress);
  const courtTelephone = text(input.courtTelephone);
  const dateOfBirth = text(input.dateOfBirth);

  // --- CC-DC-CR-148 -------------------------------------------------------
  facts.md148CircuitCourt = level === "circuit";
  facts.md148DistrictCourt = level === "district";
  facts.md148CityCounty = cityCounty;
  facts.md148CourtAddress = courtAddress;
  facts.md148CourtTelephone = courtTelephone;
  facts.md148CaptionCaseNumber = firstCaseNumber;
  facts.md148CaptionPetitionerName = petitionerName;
  facts.md148PetitionerName = petitionerName;
  facts.md148DateOfBirth = dateOfBirth;
  facts.md148PetitionerPrintedName = petitionerName;
  facts.md148PetitionerStreetAddress = streetAddress;
  facts.md148PetitionerCityStateZip = cityStateZip;
  facts.md148PetitionerTelephone = text(input.petitionerTelephone);
  facts.md148PetitionerCellPhone = text(input.petitionerCellPhone);
  facts.md148PetitionerEmail = text(input.petitionerEmail);

  // --- MDJ-008 ------------------------------------------------------------
  facts.mdj008CircuitCourt = level === "circuit";
  facts.mdj008DistrictCourt = level === "district";
  facts.mdj008CityCounty = cityCounty;
  facts.mdj008CourtAddress = courtAddress;
  facts.mdj008CourtTelephone = courtTelephone;
  facts.mdj008CaseNumber = firstCaseNumber;
  // The form preprints STATE OF MARYLAND above the Plaintiff/Petitioner rule for
  // exactly this case, so that rule stays blank and the participant is named on
  // the Defendant/Respondent side, which is where a criminal caption puts them.
  facts.mdj008DefendantName = petitionerName;
  facts.mdj008Title = MDJ008_SUBMISSION_TITLE;
  facts.mdj008RestrictedDocument = true;
  facts.mdj008SealingOrShieldingMotion = true;
  facts.mdj008PrintedName = petitionerName;
  facts.mdj008StreetAddress = streetAddress;
  facts.mdj008CityStateZip = cityStateZip;
  facts.mdj008Telephone = text(input.petitionerTelephone);
  facts.mdj008Email = text(input.petitionerEmail);

  // --- Guidance -----------------------------------------------------------
  facts.participantName = petitionerName;
  facts.courtLevelLabel = level === "circuit" ? "Circuit Court" : "District Court of Maryland";
  facts.courtCityCounty = cityCounty;
  facts.courtAddress = courtAddress;
  facts.firstCaseNumber = firstCaseNumber;
  facts.sentenceSatisfiedDate = text(input.sentenceSatisfiedDate);
  facts.selectedOffenceSummary = orderedSelections
    .map(
      ({ offence, conviction }) =>
        `${offence.label} (${offence.citation}) — ${(conviction as MarylandShieldingConviction).caseNumbers.join(", ")}`
    )
    .join("; ");
  facts.selectedOffenceCount = String(orderedSelections.length);
  facts.branchVariantId = level === "circuit" ? "circuit_court" : "district_court";

  return facts;
}

/**
 * The title MDJ-008 asks for.
 *
 * Derived from the packet, not from the participant: the confidential submission
 * this notice accompanies is always the shielding petition, and naming it
 * anything else would misdescribe the filing to the clerk.
 */
export const MDJ008_SUBMISSION_TITLE =
  "Petition for Shielding Under the Maryland Second Chance Act (CC-DC-CR-148)";

// ---------------------------------------------------------------------------
// Case-number packing
// ---------------------------------------------------------------------------

export type PackedCaseNumbers = { primary: string; continued: string };

/**
 * Distributes a case-number list across the blanks the form actually provides.
 *
 * Where the Maryland Judiciary gave an offence a second line, a long list uses
 * it. Where it did not, a long list has nowhere to go, and this refuses rather
 * than shrinking the text until it is unreadable or inventing a continuation
 * sheet the approved Maryland packet does not include.
 */
export function packCaseNumbers(
  offence: MarylandShieldableOffence,
  joined: string
): PackedCaseNumbers {
  if (fitsBlank(joined, offence.caseFieldWidth)) {
    return { primary: joined, continued: "" };
  }

  const overflow = () =>
    new MarylandBranchError(
      "case_numbers_overflow",
      offence.continuationField
        ? "The case numbers for this offence do not fit the two blanks the official form provides."
        : "The case numbers for this offence do not fit the blank the official form provides, and the form gives this offence no second line.",
      {
        offenceKey: offence.key,
        availablePoints: Number(
          (offence.caseFieldWidth + offence.continuationFieldWidth).toFixed(1)
        ),
        requiredPoints: Number(printedWidth(joined).toFixed(1))
      }
    );

  if (!offence.continuationField) throw overflow();

  // Split on a case-number boundary, taking as many onto the first line as it
  // will hold. Never mid-number: half a case number on one rule and half on the
  // next is a different case number, and a clerk would read it as one.
  const parts = joined.split(", ");
  for (let take = parts.length - 1; take >= 1; take -= 1) {
    const primary = `${parts.slice(0, take).join(", ")},`;
    const continued = parts.slice(take).join(", ");
    if (fitsBlank(primary, offence.caseFieldWidth) && fitsBlank(continued, offence.continuationFieldWidth)) {
      return { primary, continued };
    }
  }

  // Not even one entry fits the first blank. The Maryland Judiciary printed a
  // full-width rule directly underneath this offence for exactly this reason,
  // so the list goes there whole rather than being shrunk into it.
  if (fitsBlank(joined, offence.continuationFieldWidth)) {
    return { primary: "", continued: joined };
  }

  throw overflow();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

/** Accepts only an explicit yes or no. Silence is never treated as either. */
function yesNo(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const normalized = text(value).toLowerCase();
  if (normalized === "yes" || normalized === "true") return true;
  if (normalized === "no" || normalized === "false") return false;
  return null;
}

function normalizeConvictions(value: unknown): readonly MarylandShieldingConviction[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const record = (entry ?? {}) as Record<string, unknown>;
    const caseNumbers = Array.isArray(record.caseNumbers)
      ? record.caseNumbers.map((item) => text(item)).filter(Boolean)
      : [];
    return { offenceKey: text(record.offenceKey), caseNumbers };
  });
}
