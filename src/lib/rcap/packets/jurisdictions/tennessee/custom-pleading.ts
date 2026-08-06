// Tennessee Title 40, Chapter 32 record clearing — custom-pleading implementation.
//
// Eleven assigned routes. Every one of them is `custom_pleading`, and the
// reason is the same structural fact the adopted design records: **the
// Tennessee AOC publishes no expunction form of any kind.** TBI form BI-0333 is
// a *court order* carrying an approved-for-entry block, and TBI form BI-0334 is
// the TBI's own removal instrument. Neither is a participant form. There is no
// official PDF for a participant to fill, so the statutes supply the content
// and these templates are built to them.
//
// The one boundary that shapes this whole module is the **actor split created
// by T.C.A. § 40-32-108(e)**:
//
//   Under § 40-32-108(e) the petition and the proposed order are prepared by
//   the office of the district attorney general and given to the petitioner to
//   file with the clerk. They are prosecutor instruments. LegalEase does not
//   generate them and does not label anything it generates as one.
//
// So the five conviction routes that run through § 40-32-108 —
// `tn_eligible_conviction`, `tn_two_offense`, `tn_illegal_voting`,
// `tn_post_pardon` and `tn_recovery_court` — carry no petition and no proposed
// order. What they carry is the participant's own **request to the district
// attorney general** and a controlled **eligibility record**: the participant's
// answers, organised against the statutory conditions, so the office that
// prepares the petition has what it needs. Every one of those documents says on
// its face that it is not the petition and that the office prepares that.
//
// Three routes are different, and the difference is statutory rather than
// stylistic:
//
//   - The § 40-32-106 non-conviction routes (`tn_nonconviction_petition`,
//     `tn_mistaken_identity`, `tn_redaction`, `tn_pretrial_diversion`,
//     `tn_judicial_diversion`) are participant petitions to the court having
//     jurisdiction in the previous action. Section 40-32-106 contains no
//     § 40-32-108(e) referral, so the participant writes the petition.
//
//   - `tn_arrest_no_court_record` runs on **§ 40-32-109**, which the design is
//     careful to note "contains no cross-reference to § 40-32-108 of any kind".
//     The participant's petition is the operative filing. But § 40-32-109(c)
//     puts the search of the court's records and the certification on **the
//     clerk**, and that certification is a clerk instrument: this module never
//     generates it, never pre-completes it and never predicts what it will say.
//
// Other actor boundaries kept here, each a place an automated packet could
// quietly claim work it did not do:
//
//   - **The clerk serves, not the participant.** On every assigned route the
//     clerk serves the district attorney general. No certificate of service is
//     generated for the ordinary case.
//   - **The court decides.** Section 40-32-108(d)(2) carries a rebuttable
//     presumption for petitioners eligible under § 40-32-107(a)(1)(A) to (E),
//     and Public Chapter 719 (2026) rewrote it so the court weighs the
//     petitioner's interest against the best interests of justice and public
//     safety. These templates may *describe* the presumption. None of them says
//     the petition will be granted.
//   - **The TBI certificate is a court instrument.** Where § 40-32-102(c)
//     requires one it is completed by court staff and submitted to the TBI.
//     Nothing here generates, pre-completes or predicts it.
//   - **The district attorney general's decision is theirs.** Where the office
//     declines to prepare the petition, or indicates it will oppose, that is a
//     typed stop with a referral — not a paragraph arguing the point.
//
// What these templates never do:
//
//   - assert the mistaken-identity showing. The participant's account is
//     rendered as the participant's account, in the participant's words;
//   - state a fee amount. Section 40-32-106(a)(1) makes the non-conviction
//     route free and § 40-32-109(e) makes the § 8-21-401 clerk's fee mandatory
//     with no waiver, and both facts are stated — but the § 8-21-401 amount is
//     set by that statute and by the county, so no number is printed;
//   - compute a waiting period or declare it satisfied. The five, ten and
//     fifteen year periods run from completion of sentence and are measured on
//     the day of filing. The participant's dates are recorded and the condition
//     is stated; whether it is met is for the office and the court;
//   - import the § 40-32-107(a) or (c) conditions into the § 40-32-107(d)
//     pardon route. Subsection (d) states three cumulative requirements and no
//     waiting period, no sentence-completion checklist and no prior-expunction
//     bar. Screening it against conditions it does not contain would refuse
//     petitioners the statute admits, and this module does not do it;
//   - tell a recovery-court participant that the DUI can be cleared. Section
//     40-32-107(e)(3) forbids it, and saying otherwise is the single most
//     damaging error available on that route.
//
// Citation currency is itself a design constraint here. Public Chapter 268 of
// 2025 reorganized the chapter and Public Chapter 608 codified it, but clerks
// and published guidance — including the AOC's own page — may still reason from
// the superseded § 40-32-101 numbering. Every template carries the current
// citation with the superseded one noted, and tells the participant to confirm
// with the clerk before filing.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. Every track is `technicalFixture` and `runtimeDisabled`: nothing here
// reaches a runtime surface, and wiring these tracks and templates into the
// shared registry and template pack is the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** Where every typed stop on every Tennessee route sends the participant. */
export const TN_REFERRAL =
  "Tennessee Alliance for Legal Services / Tennessee Free Legal Answers, or the local bar association lawyer referral service.";

/** Where a route stops because a different assigned route is the right one. */
export const TN_ROUTING_REFERRAL =
  "LegalEase's own Tennessee routing: the correct assigned route is named in the stop.";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised when an answer puts the route outside its section, or outside what
 * LegalEase may prepare without individualized advocacy.
 *
 * Typed and carrying its own referral so a caller cannot mistake a deliberate
 * stop for a missing answer, and cannot lose the destination the design
 * requires the participant to be sent to.
 */
export class TennesseeEligibilityStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly referral: string = TN_REFERRAL
  ) {
    super(reason);
    this.name = "TennesseeEligibilityStopError";
  }
}

/** Raised when an answer is outside the approved closed list for a branch. */
export class TennesseeBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "TennesseeBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

export const TN_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/**
 * The § 40-32-106(a)(1) non-conviction grounds the design asks the participant
 * to choose between. Anything outside the list is a branch error rather than a
 * free-text ground: the ground decides which statutory sentence the petition
 * pleads, and it is not somewhere to improvise.
 */
export const TN_DISPOSITION_GROUNDS: Readonly<Record<string, string>> = {
  dismissed: "the charge was dismissed",
  no_true_bill: "the grand jury returned a no true bill",
  released_without_charge: "the petitioner was arrested and released without being charged",
  nolle_prosequi: "a nolle prosequi was entered",
  not_guilty: "a verdict of not guilty was returned"
};

/** Section 40-32-106(d)(1) reaches both diversions, on different mechanics. */
export const TN_DIVERSION_KINDS: Readonly<Record<string, string>> = {
  pretrial:
    "pretrial diversion under T.C.A. §§ 40-15-102 through 40-15-107, under which prosecution was suspended by a memorandum of understanding with the district attorney general and the petitioner did not plead guilty",
  judicial:
    "judicial diversion under T.C.A. § 40-35-313, under which the petitioner entered a plea that the court held without entering a judgment of conviction and then completed probation"
};

/**
 * Section 40-32-107(b)(1) permits two misdemeanours, or one felony and one
 * misdemeanour. Two felonies are not available, so the pairing is not on the
 * list and asking for it is a branch error rather than a silent downgrade.
 */
export const TN_OFFENCE_COMBINATIONS: Readonly<Record<string, string>> = {
  two_misdemeanours: "two misdemeanours",
  one_felony_one_misdemeanour: "one felony and one misdemeanour"
};

/**
 * The seven felonies § 40-32-107(d)(1)(A) excludes from the pardon route, as
 * Public Chapter 719 (2026) rewrote it — replacing an open-textured
 * "nonviolent crime" finding with this closed list. Rendered so the participant
 * and the district attorney general's office can see exactly what the judge
 * tests the conviction against.
 */
export const TN_PARDON_EXCLUDED_FELONIES: readonly string[] = [
  "first degree murder under T.C.A. § 39-13-202",
  "second degree murder under T.C.A. § 39-13-210",
  "especially aggravated kidnapping under T.C.A. § 39-13-305",
  "aggravated child abuse under T.C.A. § 39-15-402",
  "especially aggravated robbery under T.C.A. § 39-13-403",
  "commission of an act of terrorism under T.C.A. § 39-13-805",
  "a sexual offence for which the offender must register as a sexual offender or violent sexual offender under chapter 39, part 2 of title 40, or any sexual offence involving a minor"
];

/**
 * The four inchoate forms the exclusion list reaches expressly. A conviction in
 * one of these forms is tested against the same seven felonies.
 */
export const TN_INCHOATE_FORMS: readonly string[] = [
  "attempt",
  "conspiracy",
  "facilitation",
  "solicitation"
];

// ---------------------------------------------------------------------------
// Answer handling
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
};

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    throw new TennesseeEligibilityStopError(
      trackId,
      `missing:${key}`,
      `The packet cannot be prepared without an answer to ${key}. LegalEase does not supply a fact the participant has not given.`
    );
  }
  return value;
};

const branch = <T>(
  trackId: string,
  key: string,
  value: string,
  list: Readonly<Record<string, T>>
): T => {
  if (!Object.prototype.hasOwnProperty.call(list, value)) {
    throw new TennesseeBranchError(trackId, key, value);
  }
  return list[value];
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), TN_YES_NO);

const numbered = (lines: readonly string[]): string =>
  lines.length ? lines.map((line, index) => `${index + 1}. ${line}`).join("\n") : "";

const listAnswer = (answers: Answers, key: string): string[] => {
  const raw = answers[key];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => String(entry).trim()).filter(Boolean);
};

// ---------------------------------------------------------------------------
// Stops
// ---------------------------------------------------------------------------

/**
 * Bars the adopted design places on every assigned Tennessee route.
 *
 * Each is a stop rather than a template paragraph, because each requires an
 * analysis the design puts outside the packet. Tennessee expunction reaches
 * Tennessee public records; a federal, military, tribal or out-of-state record
 * is untouched by it, and telling a participant otherwise would be the most
 * consequential thing this module could get wrong.
 */
function applyCommonStops(trackId: string, answers: Answers): void {
  if (yesNo(trackId, answers, "outOfStateOrFederalRecords")) {
    throw new TennesseeEligibilityStopError(
      trackId,
      "records_outside_tennessee",
      "Federal, military, tribal or out-of-state records are in play. Tennessee expunction does not reach them, and a packet that implies otherwise would mislead about the result."
    );
  }
  if (yesNo(trackId, answers, "citizenshipOrClearance")) {
    throw new TennesseeEligibilityStopError(
      trackId,
      "immigration_or_clearance",
      "The request is driven by an immigration, federal employment or security-clearance question. Those turn on federal records that a Tennessee expunction does not reach, and the analysis belongs with a lawyer."
    );
  }
  if (yesNo(trackId, answers, "daOpposition")) {
    throw new TennesseeEligibilityStopError(
      trackId,
      "district_attorney_opposition",
      "The office of the district attorney general disputes eligibility, declines to prepare the petition, or indicates it will oppose. That is a contested determination and it is not argued in a generated packet."
    );
  }
}

/**
 * The conditions § 40-32-107(a) states, applied on the routes that carry them.
 *
 * Deliberately **not** applied to `tn_post_pardon`: subsection (d) states three
 * cumulative requirements and none of these, and importing them would refuse
 * petitioners the statute admits.
 */
function applySentenceCompletionStops(trackId: string, answers: Answers): void {
  if (!yesNo(trackId, answers, "allMoneyPaid")) {
    throw new TennesseeEligibilityStopError(
      trackId,
      "sentence_not_complete",
      "A fine, restitution amount, court cost or other assessment is outstanding. The sentence is not complete until it is paid, and the waiting period has not started. The convicting court's clerk can state the balance.",
      "The clerk of the convicting court, to resolve the outstanding balance before the route reopens."
    );
  }
  if (yesNo(trackId, answers, "otherIneligibleConviction")) {
    throw new TennesseeEligibilityStopError(
      trackId,
      "other_ineligible_conviction",
      "Another conviction is on the record that would be ineligible in Tennessee, including a federal or out-of-state conviction. Whether it defeats this route is an analysis for a lawyer rather than for a packet."
    );
  }
  if (!yesNo(trackId, answers, "sectionMatchedToList")) {
    throw new TennesseeEligibilityStopError(
      trackId,
      "section_not_matched",
      "The exact T.C.A. section of the conviction has not been matched against the current § 40-32-107(a)(1) eligible lists. Those lists are enumerated section by section and have been amended repeatedly; an offence name or class cannot settle it."
    );
  }
}

/**
 * The § 40-32-107 reciprocal bar, which is lifetime and closes the route.
 *
 * Subsection (e) is recorded rather than applied, because the statute is
 * asymmetric on the point and no bar is applied that the subsection does not
 * state.
 */
function applyPriorExpunctionStop(trackId: string, answers: Answers): void {
  const prior = need(trackId, answers, "priorExpunction");
  if (["a", "b", "c"].includes(prior)) {
    throw new TennesseeEligibilityStopError(
      trackId,
      "prior_expunction_bar",
      `An expunction was previously granted under T.C.A. § 40-32-107(${prior}). The bars across subsections (a), (b) and (c) are reciprocal and lifetime, and a previous grant closes this route.`
    );
  }
  if (!["none", "e"].includes(prior)) {
    throw new TennesseeBranchError(trackId, "priorExpunction", prior);
  }
}

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

/**
 * Validates the participant's answers for an assigned track and returns the
 * fact bag the renderer fills templates from.
 *
 * Every value in the returned bag comes from a declared participant input or is
 * a deterministic transformation of one. Nothing is inferred, and no statutory
 * conclusion is computed.
 */
export function deriveTennesseeFacts(trackId: string, answers: Answers): Record<string, string> {
  applyCommonStops(trackId, answers);

  // Carried through even where no template renders them: they are declared
  // required inputs and `resolvePacket` is entitled to see that each was
  // actually answered rather than assumed.
  const screening: Record<string, string> = {
    outOfStateOrFederalRecords: str(answers, "outOfStateOrFederalRecords"),
    citizenshipOrClearance: str(answers, "citizenshipOrClearance"),
    daOpposition: str(answers, "daOpposition")
  };

  const base: Record<string, string> = {
    ...screening,
    stateControlNumber:
      str(answers, "stateControlNumber") || "not stated by the petitioner at the time of preparation",
    otherConvictions:
      listAnswer(answers, "otherConvictions").length > 0
        ? numbered(listAnswer(answers, "otherConvictions"))
        : "None stated.",
    citationNote:
      "Title 40, chapter 32 was reorganized by Public Chapter 268 of 2025, effective 24 April 2025, and codified by Public Chapter 608, effective 25 March 2026. Some clerks and some published guidance still use the superseded T.C.A. § 40-32-101 numbering. Confirm the section with the clerk before filing."
  };

  switch (trackId) {
    case "tn_nonconviction_petition": {
      const courtFile = need(trackId, answers, "courtFileEverExisted");
      if (courtFile === "unknown") {
        throw new TennesseeEligibilityStopError(
          trackId,
          "court_file_history_disputed",
          "Whether a court case, court file or previous court action ever existed cannot be established. LegalEase does not adjudicate that question — the clerk searches and certifies and the court finds."
        );
      }
      if (courtFile === "no") {
        throw new TennesseeEligibilityStopError(
          trackId,
          "no_court_record_route",
          "Nothing about this arrest ever reached the court. Section 40-32-106 runs to the court having jurisdiction in the previous action, and there is no previous action in that court's records. The assigned route is tn_arrest_no_court_record, which carries the mandatory § 8-21-401 clerk's fee.",
          TN_ROUTING_REFERRAL
        );
      }
      if (courtFile !== "yes") throw new TennesseeBranchError(trackId, "courtFileEverExisted", courtFile);
      if (yesNo(trackId, answers, "cameThroughDiversion")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "diversion_route",
          "The dismissal followed completion of a diversion programme. Section 40-32-106(a)(1) excludes diversion completions from the free route; § 40-32-106(d) reaches them, carries the § 8-21-401 clerk's fee and requires the TBI certificate. The assigned routes are tn_pretrial_diversion and tn_judicial_diversion.",
          TN_ROUTING_REFERRAL
        );
      }
      if (yesNo(trackId, answers, "anyCountConvicted")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "mixed_disposition_route",
          "A count in the case ended in a conviction. Section 40-32-106(a)(1) reaches the whole case; the dismissed counts of a mixed case are reached by the partial removal provision at § 40-32-106(c)(2). The assigned route is tn_redaction.",
          TN_ROUTING_REFERRAL
        );
      }
      const groundKey = need(trackId, answers, "dispositionGround");
      return {
        ...base,
        originatingCourt: need(trackId, answers, "originatingCourt"),
        docketNumber: need(trackId, answers, "docketNumber"),
        offenceAndDisposition: need(trackId, answers, "offenceAndDisposition"),
        dispositionDate: need(trackId, answers, "dispositionDate"),
        dispositionGround: branch(trackId, "dispositionGround", groundKey, TN_DISPOSITION_GROUNDS),
        cameThroughDiversion: str(answers, "cameThroughDiversion"),
        anyCountConvicted: str(answers, "anyCountConvicted"),
        courtFileEverExisted: courtFile,
        otherCounties:
          listAnswer(answers, "otherCounties").length > 0
            ? numbered(listAnswer(answers, "otherCounties"))
            : "None stated by the petitioner.",
        otherCountiesNote:
          listAnswer(answers, "otherCounties").length > 0
            ? "A separate petition is required in each county in which the petitioner has a case. This petition covers this county only."
            : "The petitioner states no case in any other Tennessee county. A separate petition would be required in each county in which one exists."
      };
    }

    case "tn_mistaken_identity": {
      const evidence = listAnswer(answers, "identityEvidence");
      if (evidence.length === 0) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "no_identity_evidence",
          "Mistaken identity under § 40-32-106(a)(1)(H) is a factual showing the petitioner makes. Nothing has been offered that bears on it, and LegalEase does not supply the showing."
        );
      }
      const expedited = yesNo(trackId, answers, "expeditedNeeded");
      return {
        ...base,
        originatingCourt: need(trackId, answers, "originatingCourt"),
        docketNumber: need(trackId, answers, "docketNumber"),
        offenceAndDisposition: need(trackId, answers, "offenceAndDisposition"),
        dispositionDate: need(trackId, answers, "dispositionDate"),
        mistakenIdentityAccount: need(trackId, answers, "mistakenIdentityAccount"),
        identityEvidence: numbered(evidence),
        expeditedNeeded: str(answers, "expeditedNeeded"),
        expeditedGround: expedited
          ? need(trackId, answers, "expeditedGround")
          : "The petitioner states no immediate job, licence or housing consequence.",
        expeditedNote: expedited
          ? "Whether the court has that power in these terms after the 2025 reorganization is not asserted here. The request is made; the outcome is not predicted."
          : "No expedited treatment is requested."
      };
    }

    case "tn_redaction": {
      if (!yesNo(trackId, answers, "understandsPartial")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "partial_relief_not_wanted",
          "This route clears the counts that did not end in conviction and leaves the conviction in place. The participant has said that is not what they are looking for, so nothing is prepared."
        );
      }
      const convicted = listAnswer(answers, "convictedCounts");
      const counts = listAnswer(answers, "countByCountDisposition");
      if (counts.length === 0) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "no_count_schedule",
          "Section 40-32-106(c)(2) reaches named counts. Without a count-by-count account of what each charge was and how each one ended, there is nothing for the motion to identify."
        );
      }
      if (convicted.length === 0) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "no_convicted_count",
          "No count in the case ended in a conviction. Partial removal is for the mixed case; where nothing was convicted the whole case is reached by § 40-32-106(a)(1), which is the free route. The assigned route is tn_nonconviction_petition.",
          TN_ROUTING_REFERRAL
        );
      }
      return {
        ...base,
        originatingCourt: need(trackId, answers, "originatingCourt"),
        docketNumber: need(trackId, answers, "docketNumber"),
        offenceAndDisposition: need(trackId, answers, "offenceAndDisposition"),
        dispositionDate: need(trackId, answers, "dispositionDate"),
        countByCountDisposition: numbered(counts),
        convictedCounts: numbered(convicted),
        countTotal: String(counts.length),
        convictedTotal: String(convicted.length),
        understandsPartial: str(answers, "understandsPartial")
      };
    }

    case "tn_arrest_no_court_record": {
      if (yesNo(trackId, answers, "everArraignedOrAppeared")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "court_action_existed",
          "The petitioner was arraigned, appeared, or was given a court date or case number. A previous action exists, so § 40-32-106 reaches this arrest — and that route is free, where § 40-32-109(e) makes the clerk's fee mandatory with no waiver. The assigned route is tn_nonconviction_petition.",
          TN_ROUTING_REFERRAL
        );
      }
      if (yesNo(trackId, answers, "courtFileExists")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "court_file_exists",
          "A court file exists for this arrest. Section 40-32-109 reaches the arrest for which the court has no history of the arrest within its records, so this is not that route. The assigned route is tn_nonconviction_petition.",
          TN_ROUTING_REFERRAL
        );
      }
      if (yesNo(trackId, answers, "dispositionThatCourtRecorded")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "recorded_disposition",
          "The arrest ended in a dismissal, no true bill, nolle prosequi, acquittal or recorded release. Section 40-32-106(a)(1) reaches that without cost, and paying the § 8-21-401 fee here would be paying for what the free route delivers. The assigned route is tn_nonconviction_petition.",
          TN_ROUTING_REFERRAL
        );
      }
      if (!yesNo(trackId, answers, "arrestRecordEstablished")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "arrest_record_not_established",
          "The TBI criminal history does not establish that an arrest record exists at all. There is nothing yet for a § 40-32-109 petition to reach.",
          "The Tennessee Bureau of Investigation, for the petitioner's own criminal history, before the route reopens."
        );
      }
      const evidence = listAnswer(answers, "evidenceOfAbsence");
      return {
        ...base,
        arrestOffenceAndAgency: need(trackId, answers, "arrestOffenceAndAgency"),
        arrestDate: need(trackId, answers, "arrestDate"),
        countyAndCourt: need(trackId, answers, "countyAndCourt"),
        everArraignedOrAppeared: str(answers, "everArraignedOrAppeared"),
        courtFileExists: str(answers, "courtFileExists"),
        dispositionThatCourtRecorded: str(answers, "dispositionThatCourtRecorded"),
        arrestRecordEstablished: str(answers, "arrestRecordEstablished"),
        evidenceOfAbsence:
          evidence.length > 0
            ? numbered(evidence)
            : "The petitioner files nothing further under § 40-32-109(b). That subsection permits evidence; it does not require it."
      };
    }

    case "tn_pretrial_diversion":
    case "tn_judicial_diversion": {
      const expected = trackId === "tn_pretrial_diversion" ? "pretrial" : "judicial";
      const other = trackId === "tn_pretrial_diversion" ? "judicial" : "pretrial";
      const kindKey = need(trackId, answers, "diversionKind");
      const kind = branch(trackId, "diversionKind", kindKey, TN_DIVERSION_KINDS);
      if (kindKey !== expected) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "wrong_diversion_kind",
          `The diversion described is ${other} diversion, not ${expected} diversion. The two differ in whether a plea was entered, and the assigned route is tn_${other}_diversion.`,
          TN_ROUTING_REFERRAL
        );
      }
      if (yesNo(trackId, answers, "sexualOffence")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "sexual_offence_bar",
          "Section 40-32-106(d)(2) bars expunction where the diverted offence was a sexual offence or a violent sexual offence as § 40-39-202 defines those. Such an offence can be diverted and cannot be expunged."
        );
      }
      if (!yesNo(trackId, answers, "successfullyCompleted")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "diversion_not_completed",
          "Section 40-32-106(d)(1) reaches charges dismissed as a result of *successful* completion of the programme. Without completion and dismissal there is nothing for the petition to rely on."
        );
      }
      if (yesNo(trackId, answers, "petitionFiledBefore")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "petition_already_filed",
          "A petition to expunge this case has already been filed. What happens next depends on what became of it, and that is not something a fresh generated petition answers."
        );
      }
      const confirmKey = trackId === "tn_pretrial_diversion" ? "mouWithDa" : "conditionalPlea";
      if (!yesNo(trackId, answers, confirmKey)) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "diversion_mechanics_unconfirmed",
          trackId === "tn_pretrial_diversion"
            ? "Pretrial diversion runs on a memorandum of understanding with the district attorney general under which prosecution is suspended and no guilty plea is entered. That is not what is described, so the route is not confirmed."
            : "Judicial diversion runs on a plea the court holds without entering a judgment of conviction, followed by probation. That is not what is described, so the route is not confirmed."
        );
      }
      return {
        ...base,
        originatingCourt: need(trackId, answers, "originatingCourt"),
        docketNumber: need(trackId, answers, "docketNumber"),
        offenceAndDisposition: need(trackId, answers, "offenceAndDisposition"),
        dispositionDate: need(trackId, answers, "dispositionDate"),
        diversionKind: kind,
        successfullyCompleted: str(answers, "successfullyCompleted"),
        sexualOffence: str(answers, "sexualOffence"),
        petitionFiledBefore: str(answers, "petitionFiledBefore"),
        mouWithDa: str(answers, "mouWithDa"),
        conditionalPlea: str(answers, "conditionalPlea"),
        diversionStatute:
          trackId === "tn_pretrial_diversion"
            ? "T.C.A. §§ 40-15-102 through 40-15-107"
            : "T.C.A. § 40-35-313",
        federalVisibilityNote:
          trackId === "tn_judicial_diversion"
            ? "A completed judicial diversion is not a conviction under Tennessee law. Federal systems and security-clearance background checks may still see the underlying guilty plea. That is stated plainly because it is what a participant most often does not expect."
            : "No guilty plea was entered on pretrial diversion. Federal systems may still hold their own records, which a Tennessee expunction does not reach."
      };
    }

    case "tn_eligible_conviction":
    case "tn_two_offense": {
      applySentenceCompletionStops(trackId, answers);
      applyPriorExpunctionStop(trackId, answers);
      const pardoned = yesNo(trackId, answers, "pardonReceived");
      const recovery = yesNo(trackId, answers, "recoveryCourtCompleted");
      const extra: Record<string, string> = {};
      if (trackId === "tn_two_offense") {
        const howMany = need(trackId, answers, "howManyOffences");
        if (!["1", "2"].includes(howMany)) {
          throw new TennesseeEligibilityStopError(
            trackId,
            "more_than_two_offences",
            "Section 40-32-107(b) defines an eligible petitioner as a person seeking expunction of no more than two offences. More than two is outside the subsection."
          );
        }
        const combinationKey = need(trackId, answers, "offenceCombination");
        if (!yesNo(trackId, answers, "understandsOnceOnly")) {
          throw new TennesseeEligibilityStopError(
            trackId,
            "lifetime_use_not_understood",
            "This pathway can be used once in a lifetime and the bars across § 40-32-107(a), (b) and (c) are reciprocal. Whether to spend it now or wait for a third conviction to become eligible is advice, and it belongs with a lawyer before anything is sent."
          );
        }
        const episode = need(trackId, answers, "sameEpisode");
        if (episode === "unknown") {
          throw new TennesseeEligibilityStopError(
            trackId,
            "single_episode_unresolved",
            "Whether the two convictions arose from a single criminal episode decides under § 40-32-107(b)(2) whether one slot is spent or two. It is unresolved, and it is too consequential to guess."
          );
        }
        if (!["yes", "no"].includes(episode)) throw new TennesseeBranchError(trackId, "sameEpisode", episode);
        extra.howManyOffences = howMany;
        extra.offenceCombination = branch(
          trackId,
          "offenceCombination",
          combinationKey,
          TN_OFFENCE_COMBINATIONS
        );
        extra.sameEpisode = episode;
        extra.sameEpisodeNote =
          episode === "yes"
            ? "The petitioner states the offences were contemporaneous, at the same location and with a single intent. Section 40-32-107(b)(2) provides that such convictions count as a single offence for the purposes of the two-offence limit. Whether they do here is for the office and the court."
            : "The petitioner states the offences were separate episodes, so each counts against the two-offence limit.";
        extra.understandsOnceOnly = str(answers, "understandsOnceOnly");
      } else {
        extra.burglaryOffence = str(answers, "burglaryOffence");
        extra.burglaryNote = yesNo(trackId, answers, "burglaryOffence")
          ? "The conviction is for burglary under T.C.A. § 39-13-1002. Public Chapter 930 (2026) moved that offence from the Class E list to the Class D list for offences committed on or after 1 July 2026, which changes the waiting period from five years to ten. The date of the offence, not the date of conviction, decides which applies."
          : "The conviction is not for burglary under T.C.A. § 39-13-1002, so the Public Chapter 930 (2026) reclassification does not bear on the waiting period.";
      }
      return {
        ...base,
        ...extra,
        convictingCourtAndDistrict: need(trackId, answers, "convictingCourtAndDistrict"),
        originatingCourt: need(trackId, answers, "originatingCourt"),
        docketNumber: need(trackId, answers, "docketNumber"),
        offenceAndDisposition: need(trackId, answers, "offenceAndDisposition"),
        dispositionDate: need(trackId, answers, "dispositionDate"),
        exactStatutorySection: need(trackId, answers, "exactStatutorySection"),
        offenceDate: need(trackId, answers, "offenceDate"),
        convictionOnOrAfter1989: str(answers, "convictionOnOrAfter1989"),
        sentenceCompletionDate: need(trackId, answers, "sentenceCompletionDate"),
        allMoneyPaid: str(answers, "allMoneyPaid"),
        otherIneligibleConviction: str(answers, "otherIneligibleConviction"),
        sectionMatchedToList: str(answers, "sectionMatchedToList"),
        priorExpunction: str(answers, "priorExpunction"),
        priorExpunctionNote:
          str(answers, "priorExpunction") === "e"
            ? "A previous expunction was granted under T.C.A. § 40-32-107(e). It is recorded here because subsection (e) is asymmetric on the point, and no bar is applied that the subsection does not state."
            : "The petitioner states no previous expunction under T.C.A. § 40-32-107(a), (b), (c) or (e).",
        commercialDriverLicence: str(answers, "commercialDriverLicence"),
        sobrietyCondition: str(answers, "sobrietyCondition"),
        pardonReceived: str(answers, "pardonReceived"),
        recoveryCourtCompleted: str(answers, "recoveryCourtCompleted"),
        alternativeRouteNote: pardoned
          ? "The petitioner holds a gubernatorial pardon. Where this route is refused because the conviction is outside the § 40-32-107(a)(1) lists, the assigned route tn_post_pardon is evaluated before any no-relief answer is given. The exclusion list here is unchanged."
          : recovery
            ? "The petitioner has completed a certified recovery court programme. Where this route is refused only by the § 40-32-107(a)(3)(A) predating condition because of a conviction under T.C.A. § 55-10-401, the assigned route tn_recovery_court is evaluated before any no-relief answer is given. The exclusion list here is unchanged."
            : "The petitioner states neither a gubernatorial pardon nor completion of a certified recovery court programme, so neither alternative route arises."
      };
    }

    case "tn_illegal_voting": {
      applySentenceCompletionStops(trackId, answers);
      applyPriorExpunctionStop(trackId, answers);
      if (!yesNo(trackId, answers, "confirmedTwoNineteenOhSeven")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "section_not_2_19_107",
          "Subsection (c) reaches a conviction under T.C.A. § 2-19-107 for illegal registration or voting and nothing else. The judgment does not name that section, and an unresolved identification is not guessed at."
        );
      }
      if (!yesNo(trackId, answers, "releaseConditionsMet")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "release_conditions_outstanding",
          "A term of imprisonment or probation, or a condition of supervised or unsupervised release, is outstanding. The sentence is not complete and the fifteen-year period has not started."
        );
      }
      if (!yesNo(trackId, answers, "offencePredatesIneligible")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "offence_does_not_predate",
          "Section 40-32-107(c) requires the offence to have occurred prior to any conviction for an expunction-ineligible offence. The petitioner states it did not."
        );
      }
      return {
        ...base,
        convictingCourtAndDistrict: need(trackId, answers, "convictingCourtAndDistrict"),
        docketNumber: need(trackId, answers, "docketNumber"),
        exactStatutorySection: need(trackId, answers, "exactStatutorySection"),
        confirmedTwoNineteenOhSeven: str(answers, "confirmedTwoNineteenOhSeven"),
        offenceDate: need(trackId, answers, "offenceDate"),
        convictionDate: need(trackId, answers, "convictionDate"),
        sentenceCompletionDate: need(trackId, answers, "sentenceCompletionDate"),
        allMoneyPaid: str(answers, "allMoneyPaid"),
        releaseConditionsMet: str(answers, "releaseConditionsMet"),
        offencePredatesIneligible: str(answers, "offencePredatesIneligible"),
        otherIneligibleConviction: str(answers, "otherIneligibleConviction"),
        sectionMatchedToList: str(answers, "sectionMatchedToList"),
        priorExpunction: str(answers, "priorExpunction"),
        votingRightsGoal: str(answers, "votingRightsGoal"),
        votingRightsNote: yesNo(trackId, answers, "votingRightsGoal")
          ? "The petitioner is seeking restoration of voting rights. Expunction under this subsection and restoration of the right of suffrage are separate remedies with separate machinery, and this request does not deliver restoration. That is stated here so no one proceeds on the wrong understanding."
          : "The petitioner is not seeking restoration of voting rights through this request, which would in any event be a separate remedy."
      };
    }

    case "tn_post_pardon": {
      // Subsection (d) states three cumulative requirements and no waiting
      // period, no sentence-completion checklist and no prior-expunction bar.
      // `applySentenceCompletionStops` and `applyPriorExpunctionStop` are
      // deliberately not called: importing conditions (d) does not contain
      // would refuse petitioners the statute admits.
      if (!yesNo(trackId, answers, "pardonReceived")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "no_pardon",
          "Subsection (d)(1)(C) requires receipt of a pardon from the Governor. Applying for clemency is a separate proceeding before the board of parole and the Governor, and it is not what this route does."
        );
      }
      if (!yesNo(trackId, answers, "boardOfParoleVote")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "no_board_vote",
          "Subsection (d)(1)(B) requires a positive vote of the board of parole recommending that the person receive a pardon. The three requirements at (d)(1)(A), (B) and (C) are cumulative."
        );
      }
      if (yesNo(trackId, answers, "sexualOffenceRegistration")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "excluded_sexual_offence",
          "The conviction is for a sexual offence requiring registration, or a sexual offence involving a minor. Section 40-32-107(d)(1)(A) excludes it, and the exclusion reaches the attempt, conspiracy, facilitation and solicitation forms as well."
        );
      }
      if (yesNo(trackId, answers, "withinExclusionList")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "within_exclusion_list",
          "The conviction may fall within one of the seven felonies § 40-32-107(d)(1)(A) excludes, or within an attempt, conspiracy, facilitation or solicitation form of one. The judge makes that finding, and a borderline case is not tested in a packet."
        );
      }
      if (yesNo(trackId, answers, "violenceContested")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "violence_contested",
          "Whether the offence was violent is genuinely contested. After Public Chapter 719 (2026) violence is a merits factor the court weighs under § 40-32-108(d)(2) rather than a jurisdictional bar, and arguing it is individualized advocacy."
        );
      }
      return {
        ...base,
        convictingCourtAndDistrict: need(trackId, answers, "convictingCourtAndDistrict"),
        docketNumber: need(trackId, answers, "docketNumber"),
        exactStatutorySection: need(trackId, answers, "exactStatutorySection"),
        pardonReceived: str(answers, "pardonReceived"),
        pardonDate: need(trackId, answers, "pardonDate"),
        boardOfParoleVote: str(answers, "boardOfParoleVote"),
        boardVoteDate: need(trackId, answers, "boardVoteDate"),
        inchoateForm: str(answers, "inchoateForm"),
        inchoateNote: yesNo(trackId, answers, "inchoateForm")
          ? `The conviction is in an inchoate form. Section 40-32-107(d)(1)(A) reaches ${TN_INCHOATE_FORMS.join(", ")} of an excluded felony expressly, so the judge tests the underlying offence against the same list.`
          : "The conviction is not in an attempt, conspiracy, facilitation or solicitation form.",
        sexualOffenceRegistration: str(answers, "sexualOffenceRegistration"),
        withinExclusionList: str(answers, "withinExclusionList"),
        violenceContested: str(answers, "violenceContested"),
        violenceAccount: need(trackId, answers, "violenceAccount"),
        exclusionList: numbered(TN_PARDON_EXCLUDED_FELONIES),
        priorExpunction: str(answers, "priorExpunction"),
        priorExpunctionNote:
          "Any previous expunction is recorded here rather than applied. Subsection (d) states three cumulative requirements and no prior-expunction bar of its own, and no condition is applied against the petitioner that the subsection does not state."
      };
    }

    case "tn_recovery_court": {
      if (yesNo(trackId, answers, "wantsDuiCleared")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "dui_cannot_be_cleared",
          "Subsection (e) does not expunge the DUI. A conviction under T.C.A. § 55-10-401 is itself expunction-ineligible and § 40-32-107(e)(3) forbids granting an expunction under the subsection where the offence involves a motor vehicle and the use of alcohol or a controlled substance. What (e) does is let a person carrying one DUI clear a different, otherwise-eligible offence committed at least ten years later."
        );
      }
      if (yesNo(trackId, answers, "offenceInvolvesVehicleAndSubstance")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "vehicle_and_substance_bar",
          "The offence to be cleared involves a motor vehicle together with alcohol or a controlled substance. Section 40-32-107(e)(3) makes that an absolute bar on this subsection even where every other condition is met."
        );
      }
      const duiCount = need(trackId, answers, "duiConvictionCount");
      if (!["0", "1"].includes(duiCount)) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "multiple_dui_convictions",
          "More than one conviction under T.C.A. § 55-10-401 is on the record. Section 40-32-107(e)(1)(E) closes the route on that ground alone."
        );
      }
      if (!yesNo(trackId, answers, "recoveryCourtCompleted")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "recovery_court_not_completed",
          "Subsection (e) requires successful completion of a certified recovery court programme established under title 16. Without it the subsection is not available."
        );
      }
      if (!yesNo(trackId, answers, "tenYearIntervalEstablished")) {
        throw new TennesseeEligibilityStopError(
          trackId,
          "ten_year_interval_unestablished",
          "The ten-year interval between the DUI conviction and the offence to be cleared cannot be established from the judgments. It is the condition the subsection turns on, and it is not estimated here.",
          "The clerks of both convicting courts, for the judgments that establish the two dates."
        );
      }
      applySentenceCompletionStops(trackId, answers);
      applyPriorExpunctionStop(trackId, answers);
      return {
        ...base,
        convictingCourtAndDistrict: need(trackId, answers, "convictingCourtAndDistrict"),
        docketNumber: need(trackId, answers, "docketNumber"),
        exactStatutorySection: need(trackId, answers, "exactStatutorySection"),
        offenceInvolvesVehicleAndSubstance: str(answers, "offenceInvolvesVehicleAndSubstance"),
        duiConvictionCount: duiCount,
        duiConvictionDate: need(trackId, answers, "duiConvictionDate"),
        offenceDate: need(trackId, answers, "offenceDate"),
        recoveryCourtCompleted: str(answers, "recoveryCourtCompleted"),
        recoveryCourtCompletionDate: need(trackId, answers, "recoveryCourtCompletionDate"),
        tenYearIntervalEstablished: str(answers, "tenYearIntervalEstablished"),
        sentenceCompletionDate: need(trackId, answers, "sentenceCompletionDate"),
        allMoneyPaid: str(answers, "allMoneyPaid"),
        releaseConditionsMet: str(answers, "releaseConditionsMet"),
        otherIneligibleConviction: str(answers, "otherIneligibleConviction"),
        sectionMatchedToList: str(answers, "sectionMatchedToList"),
        priorExpunction: str(answers, "priorExpunction"),
        wantsDuiCleared: str(answers, "wantsDuiCleared"),
        duiUnderstandingNote:
          "Asked whether clearing the DUI itself was what was wanted, the person answered no. The point is recorded because a person who expects the DUI to be cleared has been misled about what subsection (e) does."
      };
    }

    default:
      throw new TennesseeEligibilityStopError(
        trackId,
        "unassigned_track",
        "This track is not one of the eleven assigned Tennessee custom-pleading routes."
      );
  }
}

// ---------------------------------------------------------------------------
// Shared template pieces
// ---------------------------------------------------------------------------

/**
 * The state control number is the one identifier the design flags on every
 * route: the order cannot be completed without it and it comes from the
 * participant's own TBI criminal history.
 */
const IDENTITY_BLOCK: readonly string[] = [
  "Full name: ______________________________________________",
  "Date of birth: ___________________________________________",
  "Current address: _________________________________________",
  "__________________________________________________________"
];

const CITATION_SECTION = {
  heading: "A NOTE ON THE SECTION NUMBERS",
  numbered: false,
  paragraphs: ["{{citationNote}}"]
};

/**
 * Section 40-32-106 does not prescribe notarization, and the design records
 * that county practice may differ. So no notarial block is printed — printing
 * one would invite an oath the statute does not ask for — and the participant
 * is told to ask the clerk.
 */
function petitionSignatureBlock(actor: "Petitioner" | "Movant"): readonly string[] {
  return [
    "____________________________________",
    `${actor}, pro se`,
    "",
    "Printed name: ______________________________",
    "Address: ___________________________________",
    "Telephone: _________________________________",
    "Email: _____________________________________",
    "Date: ______________________________________",
    "",
    "Notarization is not prescribed by the section this filing is brought under. Some counties ask for it. Ask the clerk before filing, and if the clerk asks for it, sign in front of a notary rather than beforehand."
  ];
}

const REQUEST_SIGNATURE_BLOCK: readonly string[] = [
  "____________________________________",
  "The person making this request",
  "",
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Notarization is not prescribed by T.C.A. § 40-32-108."
];

const ATTACHMENT_SIGNATURE_BLOCK: readonly string[] = [
  "Prepared from the answers the person named below gave. No part of this document is a finding, a certification or a representation by any official, and it is not a pleading.",
  "",
  "Printed name: ______________________________",
  "Date: ______________________________________"
];

/** Said on the face of every document generated for a § 40-32-108 route. */
const DA_PREPARES_PETITION =
  "Under T.C.A. § 40-32-108(e) the petition and the proposed order are prepared by the office of the district attorney general and given to the petitioner to file with the clerk of the convicting court. This document is not that petition and it is not that order. LegalEase does not prepare either one and does not file anything.";

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

type PetitionSpec = {
  templateId: string;
  captionRight: string;
  /** What the document calls the person signing it, throughout. */
  actor?: "Petitioner" | "Movant";
  title: string;
  preamble: string;
  identityHeading: string;
  caseSections: readonly Section[];
  prayer: readonly string[];
};

function petitionTemplate(spec: PetitionSpec): PleadingTemplate {
  // A motion under an existing docket is made by a movant. Calling the same
  // person two different things across one filing is the kind of thing a clerk
  // notices, so the noun is chosen once and used everywhere.
  const actor = spec.actor ?? "Petitioner";
  const lower = actor.toLowerCase();
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "IN THE {{originatingCourt}}",
      partyBlockLeft: [
        "STATE OF TENNESSEE",
        "",
        "v.",
        "",
        "THE PETITIONER"
      ],
      partyBlockRight: ["Docket No. {{docketNumber}}", "", spec.captionRight]
    },
    title: spec.title,
    preamble: spec.preamble,
    sections: [
      {
        heading: spec.identityHeading,
        numbered: false,
        paragraphs: [
          `The ${lower} completes each line by hand before filing. LegalEase does not hold or supply these values.`,
          ...IDENTITY_BLOCK,
          `State control number from the ${lower}'s TBI criminal history: {{stateControlNumber}}`
        ]
      },
      ...spec.caseSections,
      {
        heading: `OTHER CONVICTIONS THE ${actor.toUpperCase()} HAS STATED`,
        numbered: false,
        paragraphs: [
          `Given so the court and the district attorney general have the ${lower}'s own account in one place. It is the ${lower}'s statement, not a records check, and no one has verified it.`,
          "{{otherConvictions}}"
        ]
      },
      CITATION_SECTION,
      {
        heading: "SERVICE",
        numbered: false,
        paragraphs: [
          `The clerk serves this on the district attorney general in the ordinary course. The ${lower} does not effect service.`
        ]
      }
    ],
    prayer: spec.prayer,
    signatureLabel: actor,
    signatureBlock: petitionSignatureBlock(actor)
  };
}

type RequestSpec = {
  templateId: string;
  subsection: string;
  title: string;
  purpose: readonly string[];
  askedFor: readonly string[];
};

/**
 * The participant's own request to the office of the district attorney general.
 *
 * Not captioned as a court document, because it is not filed: it is sent to an
 * office. The caption block names the recipient instead of a court, and the
 * title says "REQUEST" so nothing about the face of it reads as a petition.
 */
function requestTemplate(spec: RequestSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "REQUEST TO THE OFFICE OF THE DISTRICT ATTORNEY GENERAL",
      partyBlockLeft: [
        "To: The office of the district attorney general",
        "for the judicial district of the convicting court",
        "",
        "Convicting court and district:",
        "{{convictingCourtAndDistrict}}",
        "",
        "Re: Docket No. {{docketNumber}}"
      ],
      partyBlockRight: [`T.C.A. § ${spec.subsection}`, "", "REQUEST — NOT A PETITION"]
    },
    title: spec.title,
    preamble: DA_PREPARES_PETITION,
    sections: [
      {
        heading: "THE PERSON MAKING THIS REQUEST",
        numbered: false,
        paragraphs: [
          "Each line is completed by hand before the request is sent. LegalEase does not hold or supply these values.",
          ...IDENTITY_BLOCK,
          "State control number from the TBI criminal history: {{stateControlNumber}}"
        ]
      },
      {
        heading: "WHY THIS REQUEST IS BEING MADE",
        numbered: true,
        paragraphs: spec.purpose
      },
      {
        heading: "WHAT IS BEING ASKED OF THE OFFICE",
        numbered: true,
        paragraphs: spec.askedFor
      },
      CITATION_SECTION,
      {
        heading: "WHAT THIS DOCUMENT IS NOT",
        numbered: false,
        paragraphs: [
          DA_PREPARES_PETITION,
          "Nothing in this request records a decision by the office of the district attorney general, and nothing in it says what that office will do. The decision is the office's alone.",
          "Once the office prepares the petition and the proposed order, the person named above files them with the clerk of the convicting court under T.C.A. § 40-32-108(a). The clerk then serves the district attorney general, who may submit recommendations within sixty days with a copy to the petitioner and may file evidence under seal. The court may not order sooner than sixty-one days after service."
        ]
      }
    ],
    prayer: [],
    signatureLabel: "The person making this request",
    signatureBlock: [...REQUEST_SIGNATURE_BLOCK]
  };
}

type EligibilityRecordSpec = {
  templateId: string;
  subsection: string;
  title: string;
  purposeLine: string;
  conditionSections: readonly Section[];
};

/**
 * The controlled eligibility record.
 *
 * Its whole job is to put the participant's answers next to the statutory
 * conditions so the office preparing the petition can see both. It states no
 * conclusion: it does not say a condition is met, only what the participant
 * answered and what the condition is.
 */
function eligibilityRecordTemplate(spec: EligibilityRecordSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: "ELIGIBILITY RECORD ACCOMPANYING THE REQUEST",
      partyBlockLeft: [
        "Re: Docket No. {{docketNumber}}",
        "{{convictingCourtAndDistrict}}"
      ],
      partyBlockRight: [`T.C.A. § ${spec.subsection}`, "", "ELIGIBILITY RECORD"]
    },
    title: spec.title,
    preamble:
      "Supplied so the office of the district attorney general has the answers next to the conditions in one place. It states no conclusion about whether any condition is met, it is not a pleading, and it asks for nothing.",
    sections: [
      {
        heading: "PURPOSE",
        numbered: false,
        paragraphs: [spec.purposeLine, DA_PREPARES_PETITION]
      },
      {
        heading: "THE CONVICTION AS THE PERSON DESCRIBES IT",
        numbered: true,
        paragraphs: [
          "Convicting court and judicial district: {{convictingCourtAndDistrict}}",
          "Docket number: {{docketNumber}}",
          "Exact T.C.A. section of the conviction, taken from the judgment: {{exactStatutorySection}}",
          "State control number from the TBI criminal history: {{stateControlNumber}}"
        ]
      },
      ...spec.conditionSections,
      {
        heading: "OTHER CONVICTIONS THE PERSON HAS STATED",
        numbered: false,
        paragraphs: [
          "Given so the office has the person's own account in one place. It is the person's statement, not a records check, and no one has verified it.",
          "{{otherConvictions}}"
        ]
      },
      CITATION_SECTION
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [...ATTACHMENT_SIGNATURE_BLOCK]
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const NONCONVICTION_PETITION = petitionTemplate({
  templateId: "tn_nonconviction_petition-petition",
  captionRight: "PETITION FOR EXPUNCTION",
  title: "PETITION FOR EXPUNCTION OF PUBLIC RECORDS (T.C.A. § 40-32-106(a)(1))",
  preamble:
    "Tennessee publishes no expunction form for a participant to fill. This is a controlled pleading prepared to the content T.C.A. § 40-32-106 prescribes. It has not been reviewed by counsel and must not be filed until it has been.",
  identityHeading: "THE PETITIONER",
  caseSections: [
    {
      heading: "THE CASE",
      numbered: true,
      paragraphs: [
        "The case was heard in the {{originatingCourt}} under docket number {{docketNumber}}.",
        "The charge and how the case ended: {{offenceAndDisposition}}",
        "The case ended on {{dispositionDate}}.",
        "The ground on which this petition is brought is that {{dispositionGround}}, which T.C.A. § 40-32-106(a)(1) names."
      ]
    },
    {
      heading: "GROUNDS FOR EXPUNCTION",
      numbered: true,
      paragraphs: [
        "Section 40-32-106(a)(1) provides that all public records of a person charged with a misdemeanour or a felony must, upon petition by that person to the court having jurisdiction in the previous action, be removed and destroyed without cost to that person, on the grounds that section names.",
        "The charge did not end in a conviction and did not end through completion of a diversion programme, which § 40-32-106(d) reaches separately.",
        "No count in the case ended in a conviction.",
        "This route carries no waiting period, and § 40-32-106(a)(1) provides that it is without cost to the petitioner. The petitioner asks the court to find the section's requirements met on the facts stated. The petitioner does not assert that the court is bound to do so."
      ]
    },
    {
      heading: "CASES IN OTHER COUNTIES",
      numbered: false,
      paragraphs: ["{{otherCountiesNote}}", "{{otherCounties}}"]
    },
    {
      heading: "WHAT A GRANT WOULD MEAN",
      numbered: false,
      paragraphs: [
        "Under T.C.A. § 40-32-110 an expunction restores the person, in contemplation of law, to the status occupied before arrest, indictment, information, trial and conviction. Under § 40-32-102(e) the expunged records are confidential and unlawful release is a Class A misdemeanour.",
        "A Tennessee expunction reaches Tennessee public records. It does not reach federal, military, tribal or out-of-state records."
      ]
    }
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the court to order that all public records of the charge described above be removed and destroyed as T.C.A. § 40-32-106(a)(1) provides, and without cost to the petitioner as that section requires.",
    "The petitioner asks for such other relief as the court finds appropriate."
  ]
});

const MISTAKEN_IDENTITY_PETITION = petitionTemplate({
  templateId: "tn_mistaken_identity-petition",
  captionRight: "PETITION FOR EXPUNCTION",
  title: "PETITION FOR EXPUNCTION — MISTAKEN IDENTITY (T.C.A. § 40-32-106(a)(1)(H))",
  preamble:
    "Tennessee publishes no expunction form for a participant to fill. This is a controlled pleading prepared to the content T.C.A. § 40-32-106 prescribes. The account of the mistake is the petitioner's own, in the petitioner's words. It has not been reviewed by counsel and must not be filed until it has been.",
  identityHeading: "THE PETITIONER",
  caseSections: [
    {
      heading: "THE CASE",
      numbered: true,
      paragraphs: [
        "The case was heard in the {{originatingCourt}} under docket number {{docketNumber}}.",
        "The charge and how the case ended: {{offenceAndDisposition}}",
        "The case ended on {{dispositionDate}}."
      ]
    },
    {
      heading: "THE PETITIONER'S ACCOUNT OF THE MISTAKE",
      numbered: false,
      paragraphs: [
        "This section is the petitioner's own account, given in the petitioner's own words. LegalEase prompted for it and asserts none of it.",
        "{{mistakenIdentityAccount}}"
      ]
    },
    {
      heading: "WHAT THE PETITIONER OFFERS IN SUPPORT",
      numbered: false,
      paragraphs: [
        "The petitioner states that the following bear on the mistake. Whether they establish it is for the court.",
        "{{identityEvidence}}"
      ]
    },
    {
      heading: "GROUNDS FOR EXPUNCTION",
      numbered: true,
      paragraphs: [
        "Mistaken identity is one of the grounds T.C.A. § 40-32-106(a)(1) names, and Public Chapter 268 of 2025 rewrote § 40-32-101 as a chapter-wide definitions section that defines mistaken identity for the whole chapter.",
        "The petitioner states that the arrest or charge came to be attached to the petitioner's name as a result of a case of mistaken identity, and asks the court to determine the question on what is before it.",
        "The petitioner makes no assertion about who committed the offence."
      ]
    }
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the court to order that all public records of the charge described above be removed and destroyed as T.C.A. § 40-32-106(a)(1) provides, and without cost to the petitioner as that section requires.",
    "The petitioner asks for such other relief as the court finds appropriate."
  ]
});

/**
 * The expedited request.
 *
 * Filed with the petition and deliberately separate from it, because the design
 * records that whether the pre-reorganization expedited-order duty survived
 * Public Chapter 268 in the same terms was not established from an official
 * source. So the request is made and no duty is asserted; keeping it out of the
 * petition means the petition does not depend on an unresolved point.
 */
const MISTAKEN_IDENTITY_EXPEDITED: PleadingTemplate = {
  templateId: "tn_mistaken_identity-expedited-request",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{originatingCourt}}",
    partyBlockLeft: ["STATE OF TENNESSEE", "", "v.", "", "THE PETITIONER"],
    partyBlockRight: ["Docket No. {{docketNumber}}", "", "REQUEST TO EXPEDITE"]
  },
  title: "REQUEST THAT THE EXPUNCTION BE CARRIED OUT IN AN EXPEDITED MANNER",
  preamble:
    "Filed with the petition. This is a request, not an assertion that the court must grant it. The provision that formerly directed expedited treatment on a mistaken-identity showing sat in the section Public Chapter 268 of 2025 replaced, and whether it survived in the same terms was not established from an official source; nothing here says that it did.",
  sections: [
    {
      heading: "THE REQUEST",
      numbered: true,
      paragraphs: [
        "The petitioner has filed a petition for expunction on the ground of mistaken identity in this cause.",
        "The petitioner asks the court to consider ordering that the expunction be carried out in an expedited manner by the Tennessee Bureau of Investigation and by any other expunging entity.",
        "{{expeditedNote}}"
      ]
    },
    {
      heading: "WHY SPEED MATTERS TO THE PETITIONER",
      numbered: false,
      paragraphs: [
        "The petitioner's own statement of the consequence. It is given so the court has it, and it is not verified by anyone.",
        "{{expeditedGround}}"
      ]
    },
    CITATION_SECTION
  ],
  prayer: [],
  signatureLabel: "Petitioner",
  signatureBlock: petitionSignatureBlock("Petitioner")
};

const REDACTION_MOTION = petitionTemplate({
  templateId: "tn_redaction-motion-for-partial-removal",
  captionRight: "MOTION FOR PARTIAL REMOVAL",
  actor: "Movant",
  title: "MOTION FOR PARTIAL REMOVAL OF RECORDS (T.C.A. § 40-32-106(c)(2))",
  preamble:
    "Filed under the existing docket rather than as a new case. Tennessee publishes no form for this. This motion reaches the counts that did not end in conviction and leaves the conviction in place, and it says so plainly because a participant who expects otherwise has been misled.",
  identityHeading: "THE MOVANT",
  caseSections: [
    {
      heading: "THE CASE",
      numbered: true,
      paragraphs: [
        "The case was heard in the {{originatingCourt}} under docket number {{docketNumber}}.",
        "The charge and how the case ended: {{offenceAndDisposition}}",
        "The case ended on {{dispositionDate}}.",
        "The case carried {{countTotal}} counts, of which {{convictedTotal}} ended in a conviction."
      ]
    },
    {
      heading: "THE COUNTS AND HOW EACH ONE ENDED",
      numbered: false,
      paragraphs: [
        "As the movant describes them. The court file governs, and the movant has been directed to check this schedule against it before filing.",
        "{{countByCountDisposition}}"
      ]
    },
    {
      heading: "THE COUNTS THAT ENDED IN A CONVICTION AND ARE NOT REACHED",
      numbered: false,
      paragraphs: [
        "These remain on the record. This motion does not ask for their removal and does not reach them.",
        "{{convictedCounts}}"
      ]
    },
    {
      heading: "GROUNDS",
      numbered: true,
      paragraphs: [
        "Public Chapter 268 of 2025 created a partial removal provision at T.C.A. § 40-32-106(c)(2).",
        "The movant asks the court to order removal of the records of the counts that did not end in a conviction, identified in the schedule above.",
        "Whether the relief reaches paper records or only electronic databases was not established from an official source, and this motion does not state that it reaches either. What the movant receives may be narrower than a full expunction."
      ]
    }
  ],
  prayer: [
    "WHEREFORE, the movant asks the court to order the removal of the records of the counts identified above as T.C.A. § 40-32-106(c)(2) provides, leaving the counts that ended in a conviction untouched.",
    "The movant asks for such other relief as the court finds appropriate."
  ]
});

const REDACTION_SCHEDULE: PleadingTemplate = {
  templateId: "tn_redaction-count-by-count-schedule",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "SCHEDULE OF COUNTS ACCOMPANYING THE MOTION",
    partyBlockLeft: ["Re: Docket No. {{docketNumber}}", "{{originatingCourt}}"],
    partyBlockRight: ["T.C.A. § 40-32-106(c)(2)", "", "SCHEDULE OF COUNTS"]
  },
  title: "SCHEDULE OF COUNTS AND DISPOSITIONS",
  preamble:
    "Supplied so the court and the district attorney general can see every count and its disposition side by side. It is not a pleading, it asserts no ground, and it asks for nothing.",
  sections: [
    {
      heading: "EVERY COUNT, AS THE MOVANT DESCRIBES IT",
      numbered: false,
      paragraphs: [
        "The court file governs. The movant checks this schedule against it before filing.",
        "{{countByCountDisposition}}"
      ]
    },
    {
      heading: "COUNTS SOUGHT TO BE REMOVED",
      numbered: false,
      paragraphs: [
        "Those counts above that did not end in a conviction. The count total stated by the movant is {{countTotal}}, of which {{convictedTotal}} ended in a conviction.",
        "State control number from the movant's TBI criminal history: {{stateControlNumber}}"
      ]
    },
    {
      heading: "COUNTS NOT REACHED",
      numbered: false,
      paragraphs: ["{{convictedCounts}}"]
    },
    CITATION_SECTION
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [...ATTACHMENT_SIGNATURE_BLOCK]
};

/**
 * The § 40-32-109 petition.
 *
 * The only route in the chapter on which the participant writes the operative
 * petition against an outside-party certification: § 40-32-109(c) puts the
 * search and the certification on the clerk. This template names that, and
 * generates none of it.
 */
const ARREST_NO_COURT_RECORD_PETITION: PleadingTemplate = {
  templateId: "tn_arrest_no_court_record-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{countyAndCourt}}",
    partyBlockLeft: ["IN RE: THE PETITIONER", "", "Petition to expunge an arrest record"],
    partyBlockRight: ["Docket No. ______________", "", "PETITION FOR EXPUNCTION"]
  },
  title: "PETITION FOR EXPUNCTION OF AN ARREST RECORD WHERE THE COURT HAS NO HISTORY OF THE ARREST (T.C.A. § 40-32-109)",
  preamble:
    "Tennessee publishes no form for this. This is a controlled pleading prepared to the content T.C.A. § 40-32-109 prescribes, and on this route it is the petitioner's own operative filing. It has not been reviewed by counsel and must not be filed until it has been.",
  sections: [
    {
      heading: "THE PETITIONER",
      numbered: false,
      paragraphs: [
        "The petitioner completes each line by hand before filing. LegalEase does not hold or supply these values.",
        ...IDENTITY_BLOCK,
        "State control number from the petitioner's TBI criminal history: {{stateControlNumber}}"
      ]
    },
    {
      heading: "THE ARREST",
      numbered: true,
      paragraphs: [
        "The petitioner was arrested on {{arrestDate}}.",
        "The offence for which the petitioner was arrested, and the arresting agency: {{arrestOffenceAndAgency}}",
        "The arrest occurred in the county served by this court, which would have had jurisdiction over that offence: {{countyAndCourt}}",
        "The petitioner's TBI criminal history establishes that a record of this arrest exists."
      ]
    },
    {
      heading: "WHY THIS SECTION RATHER THAN § 40-32-106",
      numbered: true,
      paragraphs: [
        "The petitioner was never arraigned, never appeared in this court, and was never given a court date or a case number for this arrest.",
        "As far as the petitioner knows, no court file and no court case exists for this arrest.",
        "The arrest did not end in a dismissal, a no true bill, a nolle prosequi, an acquittal or a release without charge that this court recorded.",
        "Section 40-32-106 runs to the court having jurisdiction in the previous action. There is no previous action in this court's records, so § 40-32-109 is the section that reaches this arrest. Section 40-32-109 contains no cross-reference to § 40-32-108, and § 40-32-109(a) provides that a person in the petitioner's position may petition."
      ]
    },
    {
      heading: "WHAT THE PETITIONER FILES UNDER § 40-32-109(b)",
      numbered: false,
      paragraphs: [
        "Section 40-32-109(b) permits the petitioner to file evidence. It does not require it, and nothing is required to be proved by the petitioner about the absence of a record the clerk searches for.",
        "{{evidenceOfAbsence}}"
      ]
    },
    {
      heading: "WHAT THE CLERK DOES, AND WHAT THE COURT DOES",
      numbered: false,
      paragraphs: [
        "Under T.C.A. § 40-32-109(c) the clerk of this court searches the court's records and certifies to the court whether there is any history of the arrest. That certification is the clerk's instrument. It is filed either way, because it certifies whether there is any history. It is not attached here, it has not been prepared here, and what it will say is not predicted here.",
        "Under § 40-32-109(d) the court reviews the clerk's certification and the evidence submitted, and decides. No finding is written in this petition.",
        "Under § 40-32-102(c)(1) no TBI certificate step arises on this route, because that provision exempts the court from submitting a certificate where the expungement is pursuant to § 40-32-109."
      ]
    },
    {
      heading: "THE FEE",
      numbered: false,
      paragraphs: [
        "Section 40-32-109(e) makes the clerk's fee under T.C.A. § 8-21-401 mandatory on this route. There is no indigency provision, no waiver and no without-cost provision in § 40-32-109, in express contrast to § 40-32-106(a)(1). The amount is set by § 8-21-401 and by the county; the clerk states it. This route is not free, and the petitioner has been told so before anything was prepared."
      ]
    },
    {
      heading: "WHAT A GRANT WOULD MEAN",
      numbered: false,
      paragraphs: [
        "Section 40-32-109(f) applies the effect of T.C.A. § 40-32-110: the petitioner would be entitled to have all public records destroyed, would be restored in contemplation of law to the status occupied before the arrest, would not suffer adverse effects or collateral disabilities by virtue of the offence, and would not be guilty of perjury for failing to acknowledge the arrest in response to any inquiry.",
        "A Tennessee expunction reaches Tennessee public records. It does not reach federal, military, tribal or out-of-state records."
      ]
    },
    CITATION_SECTION,
    {
      heading: "SERVICE",
      numbered: false,
      paragraphs: [
        "The clerk serves this petition on the district attorney general for this judicial district on filing. The petitioner does not effect service. Under § 40-32-109(b) the district attorney general may also file evidence with the court."
      ]
    }
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the court, on the clerk's certification and the evidence before it, to order the expunction of all public records of the arrest described above as T.C.A. § 40-32-109 provides.",
    "The petitioner asks for such other relief as the court finds appropriate."
  ],
  signatureLabel: "Petitioner",
  signatureBlock: [
    "____________________________________",
    "Petitioner, pro se",
    "",
    "Printed name: ______________________________",
    "Address: ___________________________________",
    "Telephone: _________________________________",
    "Email: _____________________________________",
    "Date: ______________________________________",
    "",
    "Section 40-32-109 requires no verification and no affidavit, and notarization is not prescribed. Ask the clerk whether the county asks for it anyway."
  ]
};

function diversionPetition(trackId: string, kindLabel: string): PleadingTemplate {
  return petitionTemplate({
    templateId: `${trackId}-petition`,
    captionRight: "PETITION FOR EXPUNCTION",
    title: `PETITION FOR EXPUNCTION AFTER ${kindLabel} DIVERSION (T.C.A. § 40-32-106(d)(1))`,
    preamble:
      "Tennessee publishes no expunction form for a participant to fill. This is a controlled pleading prepared to the content T.C.A. § 40-32-106(d) prescribes. Unlike the straight-dismissal route this one is not free and requires a TBI certificate, and both facts are stated here rather than discovered at the counter.",
    identityHeading: "THE PETITIONER",
    caseSections: [
      {
        heading: "THE CASE",
        numbered: true,
        paragraphs: [
          "The case was heard in the {{originatingCourt}} under docket number {{docketNumber}}.",
          "The charge and how the case ended: {{offenceAndDisposition}}",
          "The case ended on {{dispositionDate}}.",
          "The petitioner completed {{diversionKind}}."
        ]
      },
      {
        heading: "GROUNDS FOR EXPUNCTION",
        numbered: true,
        paragraphs: [
          "Section 40-32-106(d)(1) provides that a person may petition for expunction of the public records where the charges were dismissed as a result of successful completion of the programme, under {{diversionStatute}}.",
          "The petitioner successfully completed everything the programme required and the charges were then dismissed.",
          "The offence was not a sexual offence or a violent sexual offence as T.C.A. § 40-39-202 defines those, which § 40-32-106(d)(2) would bar.",
          "No petition to expunge this case has been filed before.",
          "The petitioner asks the court to find the section's requirements met on the facts stated. Expunction under this subsection is not automatic and the petitioner does not assert that it is."
        ]
      },
      {
        heading: "THE FEE AND THE CERTIFICATE",
        numbered: false,
        paragraphs: [
          "Section 40-32-106(d)(3) requires the appropriate clerk's fee under T.C.A. § 8-21-401, so this route is not free. The amount is set by § 8-21-401 and by the county; the clerk states it.",
          "The TBI certificate under T.C.A. § 40-32-102(c) is required on this route, because the exemption for § 40-32-106 expunctions is carved back where the expunction resulted from successful completion of diversion. That certificate is a court instrument completed by court staff and submitted to the TBI. Nothing in this packet is that certificate, and no part of it has been prepared here."
        ]
      },
      {
        heading: "WHAT A GRANT WOULD AND WOULD NOT MEAN",
        numbered: false,
        paragraphs: [
          "Under T.C.A. § 40-32-110 an expunction restores the person, in contemplation of law, to the status occupied before arrest, indictment, information, trial and conviction.",
          "{{federalVisibilityNote}}"
        ]
      }
    ],
    prayer: [
      "WHEREFORE, the petitioner asks the court to order the expunction of the public records of the case described above as T.C.A. § 40-32-106(d)(1) provides.",
      "The petitioner asks for such other relief as the court finds appropriate."
    ]
  });
}

const SENTENCE_CONDITION_SECTION: Section = {
  heading: "THE SENTENCE, AS THE PERSON DESCRIBES IT",
  numbered: true,
  paragraphs: [
    "Date the offence was committed: {{offenceDate}}",
    "Date the entire sentence was completed, including any imprisonment or probation and every condition of release: {{sentenceCompletionDate}}",
    "Every fine, restitution amount, court cost and other assessment is paid in full: {{allMoneyPaid}}",
    "The waiting period at T.C.A. § 40-32-107(a)(3)(B) runs from completion of the sentence — five years for a misdemeanour or a Class E felony and ten years for a Class C or Class D felony — and it is measured on the day the petition is filed. The dates are given above; whether the period has run is for the office and the court, and it is not calculated here."
  ]
};

const ELIGIBLE_CONVICTION_REQUEST = requestTemplate({
  templateId: "tn_eligible_conviction-request-to-district-attorney",
  subsection: "40-32-107(a)",
  title: "REQUEST TO THE DISTRICT ATTORNEY GENERAL TO PREPARE AN EXPUNCTION PETITION (T.C.A. § 40-32-107(a))",
  purpose: [
    "The person named above asks the office of the district attorney general to prepare the petition and the proposed order for expunction of the conviction identified in the eligibility record accompanying this request.",
    "T.C.A. § 40-32-107(a)(4) directs a petitioner under that subsection to § 40-32-108, and § 40-32-108(e) puts preparation of the petition and the proposed order on this office.",
    "The eligibility record accompanying this request sets out the person's answers next to the conditions § 40-32-107(a) states. It reaches no conclusion about whether any of them is met."
  ],
  askedFor: [
    "That the office consider whether the conviction is on one of the enumerated eligible lists at T.C.A. § 40-32-107(a)(1), which are stated section by section.",
    "That, if the office is satisfied, it prepare the petition and the proposed order under § 40-32-108(e) and give them to the person named above to file with the clerk of the convicting court under § 40-32-108(a).",
    "Where the eligibility requirements are satisfied, T.C.A. § 40-32-108(d)(2) carries a rebuttable presumption that the petition should be granted for a petitioner eligible under § 40-32-107(a)(1)(A) to (E), and Public Chapter 719 of 2026 preserved that presumption while providing that the court weighs the petitioner's interest against the best interests of justice and public safety. That is stated as what the section says. It is not a statement about what this court will do with this petition, which is the court's decision on the record before it."
  ]
});

const ELIGIBLE_CONVICTION_RECORD = eligibilityRecordTemplate({
  templateId: "tn_eligible_conviction-eligibility-record",
  subsection: "40-32-107(a)",
  title: "ELIGIBILITY RECORD — T.C.A. § 40-32-107(a)",
  purposeLine:
    "Accompanies the request so the office of the district attorney general has the person's answers next to the conditions § 40-32-107(a) states.",
  conditionSections: [
    SENTENCE_CONDITION_SECTION,
    {
      heading: "THE OTHER CONDITIONS § 40-32-107(a) STATES",
      numbered: true,
      paragraphs: [
        "The conviction occurred on or after 1 November 1989: {{convictionOnOrAfter1989}}",
        "The exact T.C.A. section has been matched against the current § 40-32-107(a)(1) eligible lists: {{sectionMatchedToList}}",
        "Previous expunction under T.C.A. § 40-32-107: {{priorExpunction}}",
        "A commercial driver licence was held at the time, and the offence involved a controlled substance or a commercial motor vehicle: {{commercialDriverLicence}}",
        "The sentence required a period free from dependency on or abuse of alcohol or a controlled substance, and at least one year of it has been met: {{sobrietyCondition}}"
      ]
    },
    {
      heading: "NOTES ON THOSE ANSWERS",
      numbered: false,
      paragraphs: ["{{priorExpunctionNote}}", "{{burglaryNote}}"]
    },
    {
      heading: "ROUTES THAT MAY APPLY IF THIS ONE DOES NOT",
      numbered: false,
      paragraphs: ["{{alternativeRouteNote}}"]
    }
  ]
});

const TWO_OFFENSE_REQUEST = requestTemplate({
  templateId: "tn_two_offense-request-to-district-attorney",
  subsection: "40-32-107(b)",
  title: "REQUEST TO THE DISTRICT ATTORNEY GENERAL TO PREPARE AN EXPUNCTION PETITION (T.C.A. § 40-32-107(b))",
  purpose: [
    "The person named above asks the office of the district attorney general to prepare the petition and the proposed order for expunction of the offences identified in the eligibility record accompanying this request.",
    "T.C.A. § 40-32-107(b)(3) directs a petitioner under that subsection to § 40-32-108, and § 40-32-108(e) puts preparation of the petition and the proposed order on this office.",
    "Section 40-32-107(b) reaches no more than two offences, and the permitted combinations are two misdemeanours or one felony and one misdemeanour. The person understands that the bars across subsections (a), (b) and (c) are reciprocal and lifetime."
  ],
  askedFor: [
    "That the office consider whether each offence is eligible under T.C.A. § 40-32-107(a)(1) in its own right, as § 40-32-107(b)(1) requires.",
    "That the office consider whether § 40-32-107(b)(2) applies, under which contemporaneous same-location single-intent convictions count as a single offence for the purposes of the two-offence limit.",
    "That, if the office is satisfied, it prepare the petition and the proposed order under § 40-32-108(e) and give them to the person named above to file with the clerk of the convicting court under § 40-32-108(a)."
  ]
});

const TWO_OFFENSE_RECORD = eligibilityRecordTemplate({
  templateId: "tn_two_offense-eligibility-record",
  subsection: "40-32-107(b)",
  title: "ELIGIBILITY RECORD — T.C.A. § 40-32-107(b)",
  purposeLine:
    "Accompanies the request so the office of the district attorney general has the person's answers next to the conditions § 40-32-107(b) states.",
  conditionSections: [
    SENTENCE_CONDITION_SECTION,
    {
      heading: "THE TWO-OFFENCE CONDITIONS § 40-32-107(b) STATES",
      numbered: true,
      paragraphs: [
        "Number of offences the person asks to clear: {{howManyOffences}}",
        "The combination: {{offenceCombination}}. Two felonies are not available on this route.",
        "The offences arose from a single criminal episode: {{sameEpisode}}",
        "The conviction occurred on or after 1 November 1989: {{convictionOnOrAfter1989}}",
        "The exact T.C.A. section has been matched against the current § 40-32-107(a)(1) eligible lists: {{sectionMatchedToList}}",
        "Previous expunction under T.C.A. § 40-32-107: {{priorExpunction}}",
        "A commercial driver licence was held at the time, and the offence involved a controlled substance or a commercial motor vehicle: {{commercialDriverLicence}}",
        "The sentence required a period free from dependency on or abuse of alcohol or a controlled substance, and at least one year of it has been met: {{sobrietyCondition}}"
      ]
    },
    {
      heading: "NOTES ON THOSE ANSWERS",
      numbered: false,
      paragraphs: ["{{sameEpisodeNote}}", "{{priorExpunctionNote}}"]
    },
    {
      heading: "THE ONCE-IN-A-LIFETIME POINT",
      numbered: false,
      paragraphs: [
        "The person has confirmed understanding that this pathway can be used once and that a grant under subsection (a), (b) or (c) closes the others for life: {{understandsOnceOnly}}",
        "Whether to use it now or wait for another conviction to become eligible is a decision for the person, taken with advice. It is recorded here rather than decided here."
      ]
    },
    {
      heading: "ROUTES THAT MAY APPLY IF THIS ONE DOES NOT",
      numbered: false,
      paragraphs: ["{{alternativeRouteNote}}"]
    }
  ]
});

const ILLEGAL_VOTING_REQUEST = requestTemplate({
  templateId: "tn_illegal_voting-participant-request-to-district-attorney",
  subsection: "40-32-107(c)",
  title: "REQUEST TO THE DISTRICT ATTORNEY GENERAL TO PREPARE AN EXPUNCTION PETITION (T.C.A. § 40-32-107(c))",
  purpose: [
    "The person named above asks the office of the district attorney general to prepare the petition and the proposed order for expunction of the conviction identified in the eligibility record accompanying this request.",
    "T.C.A. § 40-32-107(c) reaches a conviction for illegal registration or voting under T.C.A. § 2-19-107 and nothing else, and directs the petitioner to § 40-32-108, whose subsection (e) puts preparation of the petition and the proposed order on this office.",
    "The fifteen-year period under § 40-32-107(c) runs from completion of the sentence and is measured on the day the petition is filed. The dates are in the eligibility record; this request calculates nothing."
  ],
  askedFor: [
    "That the office consider whether the conditions T.C.A. § 40-32-107(c) states are met on the answers in the eligibility record.",
    "That, if the office is satisfied, it prepare the petition and the proposed order under § 40-32-108(e) and give them to the person named above to file with the clerk of the convicting court under § 40-32-108(a).",
    "Subsection (c) is not reached by the rebuttable presumption at § 40-32-108(d)(2), which is keyed to petitioners eligible under § 40-32-107(a)(1)(A) to (E). The court weighs the interest of the petitioner against the best interests of justice and public safety, and no presumption applies."
  ]
});

const ILLEGAL_VOTING_RECORD = eligibilityRecordTemplate({
  templateId: "tn_illegal_voting-participant-eligibility-record",
  subsection: "40-32-107(c)",
  title: "ELIGIBILITY RECORD — T.C.A. § 40-32-107(c)",
  purposeLine:
    "Accompanies the request so the office of the district attorney general has the person's answers next to the conditions § 40-32-107(c) states.",
  conditionSections: [
    {
      heading: "THE SECTION THE JUDGMENT NAMES",
      numbered: true,
      paragraphs: [
        "The judgment names T.C.A. § 2-19-107 specifically, rather than another elections or fraud provision: {{confirmedTwoNineteenOhSeven}}",
        "Date the offence was committed: {{offenceDate}}",
        "Date of conviction: {{convictionDate}}"
      ]
    },
    {
      heading: "THE CONDITIONS § 40-32-107(c) STATES",
      numbered: true,
      paragraphs: [
        "Date the entire sentence was completed: {{sentenceCompletionDate}}",
        "Every fine, restitution amount, court cost and other assessment is paid in full: {{allMoneyPaid}}",
        "Any term of imprisonment or probation is complete and every condition of supervised or unsupervised release has been met: {{releaseConditionsMet}}",
        "The offence occurred prior to any conviction for an expunction-ineligible offence: {{offencePredatesIneligible}}",
        "Previous expunction under T.C.A. § 40-32-107: {{priorExpunction}}",
        "Fifteen years must have elapsed since completion of the sentence. It is the longest period in the chapter. The date is given above and the period is not calculated here."
      ]
    },
    {
      heading: "RESTORATION OF VOTING RIGHTS IS A DIFFERENT THING",
      numbered: false,
      paragraphs: ["{{votingRightsNote}}"]
    }
  ]
});

const POST_PARDON_REQUEST = requestTemplate({
  templateId: "tn_post_pardon-participant-request-to-district-attorney",
  subsection: "40-32-107(d)",
  title: "REQUEST TO THE DISTRICT ATTORNEY GENERAL TO PREPARE AN EXPUNCTION PETITION AFTER A PARDON (T.C.A. § 40-32-107(d))",
  purpose: [
    "The person named above holds a pardon from the Governor and asks the office of the district attorney general to prepare the petition and the proposed order for expunction of the pardoned conviction.",
    "A pardon by itself does not clear the record. T.C.A. § 40-32-107(d) is the route that reaches it, and it directs the petitioner to § 40-32-108, whose subsection (e) puts preparation of the petition and the proposed order on this office.",
    "Subsection (d) states three cumulative requirements at (d)(1)(A), (B) and (C) and no others: the judicial finding against the closed list of excluded felonies, a positive vote of the board of parole recommending a pardon, and receipt of a pardon from the Governor. It contains no waiting period, no sentence-completion checklist, no prior-expunction bar and no requirement that the offence predate a conviction for an expunction-ineligible offence. None of those has been applied to this request."
  ],
  askedFor: [
    "That the office consider the three requirements § 40-32-107(d)(1) states, on the answers in the eligibility record accompanying this request.",
    "That, if the office is satisfied, it prepare the petition and the proposed order under § 40-32-108(e) and give them to the person named above to file with the clerk of the convicting court under § 40-32-108(a).",
    "Public Chapter 719 of 2026 rewrote § 40-32-108(d)(2). A subsection (d) petitioner gets no rebuttable presumption; the court considers whether the offence sought to be expunged was violent and any other relevant factors presented by the petitioner and the district attorney general. Violence moved from a jurisdictional bar to a matter the court weighs."
  ]
});

const POST_PARDON_RECORD = eligibilityRecordTemplate({
  templateId: "tn_post_pardon-participant-eligibility-record",
  subsection: "40-32-107(d)",
  title: "ELIGIBILITY RECORD — T.C.A. § 40-32-107(d)",
  purposeLine:
    "Accompanies the request so the office of the district attorney general has the person's answers next to the three requirements § 40-32-107(d)(1) states.",
  conditionSections: [
    {
      heading: "THE THREE REQUIREMENTS § 40-32-107(d)(1) STATES",
      numbered: true,
      paragraphs: [
        "(A) The judge finds the conviction was not for one of the excluded felonies, or an attempt, conspiracy, facilitation or solicitation to commit one. The person states the conviction is under {{exactStatutorySection}}.",
        "(B) A positive vote of the board of parole recommending a pardon: {{boardOfParoleVote}}, on {{boardVoteDate}}.",
        "(C) Receipt of a pardon from the Governor: {{pardonReceived}}, on {{pardonDate}}."
      ]
    },
    {
      heading: "THE CLOSED LIST THE JUDGE TESTS THE CONVICTION AGAINST",
      numbered: false,
      paragraphs: [
        "Public Chapter 719 of 2026 replaced an open-textured nonviolent-crime finding with this closed list. The finding is the judge's; nothing here makes it.",
        "{{exclusionList}}",
        "{{inchoateNote}}",
        "The conviction is for a sexual offence requiring registration or a sexual offence involving a minor: {{sexualOffenceRegistration}}"
      ]
    },
    {
      heading: "WHAT SUBSECTION (d) DOES NOT REQUIRE",
      numbered: false,
      paragraphs: [
        "Subsection (d) contains no waiting period, no sentence-completion checklist, no prior-expunction bar and no requirement that the offence predate a conviction for an expunction-ineligible offence. Those conditions appear in subsections (b) and (c) and not in (d), and applying them here would refuse a petitioner the statute admits.",
        "{{priorExpunctionNote}}"
      ]
    },
    {
      heading: "WHAT THE PERSON WANTS THE COURT TO KNOW ABOUT VIOLENCE",
      numbered: false,
      paragraphs: [
        "After Public Chapter 719 of 2026 this is a matter the court weighs rather than a bar. The account below is the person's own, in the person's own words, and is asserted by no one else.",
        "{{violenceAccount}}"
      ]
    }
  ]
});

const RECOVERY_COURT_REQUEST = requestTemplate({
  templateId: "tn_recovery_court-participant-request-to-district-attorney",
  subsection: "40-32-107(e)",
  title: "REQUEST TO THE DISTRICT ATTORNEY GENERAL TO PREPARE AN EXPUNCTION PETITION AFTER RECOVERY COURT (T.C.A. § 40-32-107(e))",
  purpose: [
    "The person named above asks the office of the district attorney general to prepare the petition and the proposed order for expunction of the offence identified in the eligibility record accompanying this request.",
    "Subsection (e) does not expunge a DUI and this request does not ask it to. A conviction under T.C.A. § 55-10-401 is itself expunction-ineligible, and § 40-32-107(e)(3) provides that a court shall not grant an expunction under the subsection where the offence sought to be expunged involves a motor vehicle and the use of alcohol or a controlled substance.",
    "What subsection (e) does is let a person carrying one conviction under § 55-10-401 clear a different, otherwise-eligible offence committed at least ten years after it — relief that § 40-32-107(a)(3)(A) would otherwise deny. It was added by Public Chapter 1061 of 2026, the Recovery Court Renewal Act, effective 1 July 2026, with no offence-date limitation."
  ],
  askedFor: [
    "That the office consider whether the offence to be cleared is eligible under T.C.A. § 40-32-107(a)(1) in its own right, as § 40-32-107(e)(1)(A)(i) requires.",
    "That the office consider the ten-year interval, the completion of a certified recovery court programme established under title 16, and the remaining conditions the subsection states, on the answers in the eligibility record.",
    "That, if the office is satisfied, it prepare the petition and the proposed order under § 40-32-108(e) and give them to the person named above to file with the clerk of the convicting court under § 40-32-108(a).",
    "Subsection (e) is not named in the rebuttable presumption at § 40-32-108(d)(2) and is not reached by the violence-weighing sentence Public Chapter 719 added for subsection (d). The court weighs the interest of the petitioner against the best interests of justice and public safety."
  ]
});

const RECOVERY_COURT_RECORD = eligibilityRecordTemplate({
  templateId: "tn_recovery_court-participant-eligibility-record",
  subsection: "40-32-107(e)",
  title: "ELIGIBILITY RECORD — T.C.A. § 40-32-107(e)",
  purposeLine:
    "Accompanies the request so the office of the district attorney general has the person's answers next to the conditions § 40-32-107(e) states.",
  conditionSections: [
    {
      heading: "WHAT IS BEING CLEARED, AND WHAT IS NOT",
      numbered: true,
      paragraphs: [
        "The offence to be cleared, taken from the judgment: {{exactStatutorySection}}",
        "That offence involves a motor vehicle together with alcohol or a controlled substance: {{offenceInvolvesVehicleAndSubstance}}. Section 40-32-107(e)(3) makes that an absolute bar.",
        "The DUI conviction under T.C.A. § 55-10-401 is not being cleared and cannot be cleared on this route.",
        "{{duiUnderstandingNote}}"
      ]
    },
    {
      heading: "THE TEN-YEAR INTERVAL",
      numbered: true,
      paragraphs: [
        "Number of convictions under T.C.A. § 55-10-401: {{duiConvictionCount}}. More than one closes the route under § 40-32-107(e)(1)(E).",
        "Date of that DUI conviction: {{duiConvictionDate}}",
        "Date the offence to be cleared was committed: {{offenceDate}}",
        "The offence to be cleared must have occurred at least ten years after the DUI conviction. Both dates are given above, taken from the judgments; the interval is not calculated here."
      ]
    },
    {
      heading: "THE REMAINING CONDITIONS § 40-32-107(e) STATES",
      numbered: true,
      paragraphs: [
        "Successful completion of a certified recovery court programme established under title 16: {{recoveryCourtCompleted}}, on {{recoveryCourtCompletionDate}}.",
        "Date the entire sentence for the offence to be cleared was completed: {{sentenceCompletionDate}}",
        "Every fine, restitution amount, court cost and other assessment for that offence is paid in full: {{allMoneyPaid}}",
        "Any term of imprisonment or probation is complete and every condition of supervised or unsupervised release has been met: {{releaseConditionsMet}}",
        "The exact T.C.A. section has been matched against the current § 40-32-107(a)(1) eligible lists: {{sectionMatchedToList}}",
        "Previous expunction under T.C.A. § 40-32-107(a), (b), (c) or (e): {{priorExpunction}}"
      ]
    }
  ]
});

function buildTemplates(): Record<string, PleadingTemplate> {
  const templates: Record<string, PleadingTemplate> = {};
  const all = [
    NONCONVICTION_PETITION,
    MISTAKEN_IDENTITY_PETITION,
    MISTAKEN_IDENTITY_EXPEDITED,
    REDACTION_MOTION,
    REDACTION_SCHEDULE,
    ARREST_NO_COURT_RECORD_PETITION,
    diversionPetition("tn_pretrial_diversion", "PRETRIAL"),
    diversionPetition("tn_judicial_diversion", "JUDICIAL"),
    ELIGIBLE_CONVICTION_REQUEST,
    ELIGIBLE_CONVICTION_RECORD,
    TWO_OFFENSE_REQUEST,
    TWO_OFFENSE_RECORD,
    ILLEGAL_VOTING_REQUEST,
    ILLEGAL_VOTING_RECORD,
    POST_PARDON_REQUEST,
    POST_PARDON_RECORD,
    RECOVERY_COURT_REQUEST,
    RECOVERY_COURT_RECORD
  ];
  for (const template of all) templates[template.templateId] = template;
  return templates;
}

export const TENNESSEE_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> =
  buildTemplates();

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
 * The adopted legal design names eight component roles that
 * `PacketComponentRole` does not carry. Extending that enum would be a change
 * to `src/lib/rcap/packets/types.ts`, which this job does not own, so the
 * design roles are mapped onto the existing enum and the mapping is stated
 * here rather than left implicit. The **componentId is pinned exactly as the
 * design assigns it** — that is what carries assignment fidelity.
 *
 *   petition                              → primary_filing
 *   motion_for_partial_removal            → primary_filing (the operative
 *                                           filing on the redaction route,
 *                                           filed under the existing docket)
 *   request_to_district_attorney          → notice   (a document the
 *   participant_request_to_district_attorney         participant delivers to
 *                                           an office rather than files, which
 *                                           is what `notice` exists for)
 *   eligibility_record                    → attachment
 *   participant_eligibility_record        → attachment
 *   count_by_count_schedule               → attachment
 *   expedited_request                     → continuation (filed with the
 *                                           petition, subordinate to it and
 *                                           signed with it, which is more than
 *                                           a passive attachment carries)
 */
export const TN_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  petition: "primary_filing",
  motion_for_partial_removal: "primary_filing",
  request_to_district_attorney: "notice",
  participant_request_to_district_attorney: "notice",
  eligibility_record: "attachment",
  participant_eligibility_record: "attachment",
  count_by_count_schedule: "attachment",
  expedited_request: "continuation"
};

type ComponentSpec = {
  componentId: string;
  /** The role as the adopted legal design names it. Mapped on the way in. */
  designRole: keyof typeof TN_DESIGN_ROLE_TO_ENGINE_ROLE;
  templateId: string;
  order: number;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!TENNESSEE_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(`${spec.componentId}: no Tennessee template ${spec.templateId} is registered.`);
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: TN_DESIGN_ROLE_TO_ENGINE_ROLE[spec.designRole],
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

/** Asked on every assigned Tennessee route. */
const COMMON_INPUTS: readonly RequiredInput[] = [
  {
    key: "stateControlNumber",
    label: "State control number from your TBI criminal history",
    required: true
  },
  {
    key: "otherConvictions",
    label: "Every other conviction you have anywhere, including federal and out-of-state",
    required: true
  },
  {
    key: "outOfStateOrFederalRecords",
    label: "Are federal, military, tribal or out-of-state records involved?",
    required: true
  },
  {
    key: "citizenshipOrClearance",
    label: "Is this driven by immigration, federal employment or a security clearance?",
    required: true
  },
  {
    key: "daOpposition",
    label: "Has the district attorney general's office disputed eligibility or indicated it will oppose?",
    required: true
  }
];

/** Asked on the five routes that run through T.C.A. § 40-32-108. */
const DA_ROUTE_INPUTS: readonly RequiredInput[] = [
  {
    key: "convictingCourtAndDistrict",
    label: "The convicting court, its county and its judicial district",
    required: true
  },
  { key: "docketNumber", label: "Docket or case number", required: true },
  {
    key: "exactStatutorySection",
    label: "The exact T.C.A. section of the conviction, taken from the judgment",
    required: true
  },
  {
    key: "priorExpunction",
    label: "Any previous expunction under T.C.A. § 40-32-107(a), (b), (c) or (e)",
    required: true
  }
];

/** Asked on the § 40-32-107(a), (b), (c) and (e) routes, but not on (d). */
const SENTENCE_INPUTS: readonly RequiredInput[] = [
  {
    key: "sentenceCompletionDate",
    label: "The date the entire sentence was completed",
    required: true
  },
  {
    key: "allMoneyPaid",
    label: "Is every fine, restitution amount, court cost and other assessment paid in full?",
    required: true
  },
  {
    key: "otherIneligibleConviction",
    label: "Is any other conviction on the record that would be ineligible in Tennessee?",
    required: true
  },
  {
    key: "sectionMatchedToList",
    label: "Has the exact section been matched against the current eligible lists?",
    required: true
  }
];

/** Asked on the § 40-32-106 court-petition routes. */
const COURT_ROUTE_INPUTS: readonly RequiredInput[] = [
  { key: "originatingCourt", label: "The court that handled the case, and its county", required: true },
  { key: "docketNumber", label: "Docket or case number", required: true },
  { key: "offenceAndDisposition", label: "The charge, and exactly how the case ended", required: true },
  { key: "dispositionDate", label: "The date the case ended", required: true }
];

function tennesseeTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
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
    jurisdiction: "TN",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: input.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: [...COMMON_INPUTS, ...input.extraInputs],
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

const COURT_TAIL =
  "The clerk serves the district attorney general; the participant does not. The court decides. Tennessee publishes no expunction form for a participant to fill and none is supplied here.";

const DA_TAIL =
  "Under T.C.A. § 40-32-108(e) the office of the district attorney general prepares the petition and the proposed order. LegalEase generates neither, and nothing generated here is labelled as either.";

export const TENNESSEE_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  tennesseeTrack({
    trackId: "tn_nonconviction_petition",
    publicName: "Clear a charge that did not end in a conviction",
    mechanism: "expunction_nonconviction",
    authority: "T.C.A. § 40-32-106(a)(1)",
    recordTypes: ["arrest", "charge"],
    dispositions: ["dismissed", "no_true_bill", "released_without_charge", "nolle_prosequi", "not_guilty"],
    courtLevel: "court_having_jurisdiction_in_the_previous_action",
    packetSet: packetSet("tn_nonconviction_petition", [
      {
        componentId: "tn_nonconviction_petition-petition-1",
        designRole: "petition",
        templateId: "tn_nonconviction_petition-petition",
        order: 1
      }
    ]),
    extraInputs: [
      ...COURT_ROUTE_INPUTS,
      { key: "dispositionGround", label: "Which § 40-32-106(a)(1) ground applies", required: true },
      { key: "cameThroughDiversion", label: "Was the case dismissed after a diversion programme?", required: true },
      { key: "anyCountConvicted", label: "Did any count in the case end in a conviction?", required: true },
      { key: "otherCounties", label: "Cases in any other Tennessee county", required: true },
      {
        key: "courtFileEverExisted",
        label: "Did a court case, court file or previous court action ever exist?",
        required: true
      }
    ],
    assembledPacketName: "tn-expunction-nonconviction",
    assembledPacketTitle: "Tennessee expunction packet — charge that did not end in a conviction",
    customerDeliverableDescription: `Petition for expunction under T.C.A. § 40-32-106(a)(1). The section makes this route without cost to the petitioner, and there is no waiting period. ${COURT_TAIL}`,
    notes:
      "A dismissal after diversion, a mixed-disposition case and an arrest that never reached the court each route elsewhere rather than being squeezed into this section."
  }),

  tennesseeTrack({
    trackId: "tn_mistaken_identity",
    publicName: "Clear an arrest that was not yours",
    mechanism: "expunction_mistaken_identity",
    authority: "T.C.A. § 40-32-106(a)(1)(H)",
    recordTypes: ["arrest", "charge"],
    dispositions: ["mistaken_identity"],
    courtLevel: "court_having_jurisdiction_in_the_previous_action",
    packetSet: packetSet("tn_mistaken_identity", [
      {
        componentId: "tn_mistaken_identity-petition-1",
        designRole: "petition",
        templateId: "tn_mistaken_identity-petition",
        order: 1
      },
      {
        componentId: "tn_mistaken_identity-expedited-request-2",
        designRole: "expedited_request",
        templateId: "tn_mistaken_identity-expedited-request",
        order: 2
      }
    ]),
    extraInputs: [
      ...COURT_ROUTE_INPUTS,
      {
        key: "mistakenIdentityAccount",
        label: "In your own words, how the arrest came to be attached to your name",
        required: true
      },
      { key: "identityEvidence", label: "What you have that bears on it not being you", required: true },
      { key: "expeditedNeeded", label: "Is there a job, licence or housing application making speed matter?", required: true },
      {
        key: "expeditedGround",
        label: "What makes speed matter — asked only where expedited treatment is requested",
        required: false
      }
    ],
    assembledPacketName: "tn-expunction-mistaken-identity",
    assembledPacketTitle: "Tennessee expunction packet — mistaken identity",
    customerDeliverableDescription: `Petition for expunction on the mistaken-identity ground, with a separate request that the expunction be carried out in an expedited manner. The account of the mistake is the participant's own and LegalEase asserts none of it. ${COURT_TAIL}`,
    notes:
      "Whether the pre-reorganization expedited-order duty survived Public Chapter 268 in the same terms was not established, so the request is made separately and no duty is asserted."
  }),

  tennesseeTrack({
    trackId: "tn_redaction",
    publicName: "Clear the dismissed counts in a case where other counts stuck",
    mechanism: "partial_removal_mixed_disposition",
    authority: "T.C.A. § 40-32-106(c)(2)",
    recordTypes: ["charge"],
    dispositions: ["mixed_disposition"],
    courtLevel: "court_having_jurisdiction_in_the_previous_action",
    packetSet: packetSet("tn_redaction", [
      {
        componentId: "tn_redaction-motion-for-partial-removal-1",
        designRole: "motion_for_partial_removal",
        templateId: "tn_redaction-motion-for-partial-removal",
        order: 1
      },
      {
        componentId: "tn_redaction-count-by-count-schedule-2",
        designRole: "count_by_count_schedule",
        templateId: "tn_redaction-count-by-count-schedule",
        order: 2
      }
    ]),
    extraInputs: [
      ...COURT_ROUTE_INPUTS,
      { key: "countByCountDisposition", label: "Each count and how each one ended", required: true },
      { key: "convictedCounts", label: "The counts that ended in a conviction", required: true },
      {
        key: "understandsPartial",
        label: "This clears the dismissed counts and leaves the conviction. Is that what you want?",
        required: true
      }
    ],
    assembledPacketName: "tn-partial-removal-mixed-case",
    assembledPacketTitle: "Tennessee partial removal packet — mixed-disposition case",
    customerDeliverableDescription: `Motion for partial removal under T.C.A. § 40-32-106(c)(2), filed under the existing docket, with a schedule of counts. Whether the relief reaches paper records or only electronic databases was not established, and the packet says so rather than implying a full expunction. ${COURT_TAIL}`,
    notes:
      "The most common real Tennessee scenario after a plea: some counts dismissed, others convicted. Nothing here suggests the conviction is reached."
  }),

  tennesseeTrack({
    trackId: "tn_arrest_no_court_record",
    publicName: "Clear an arrest that never reached a courtroom",
    mechanism: "expunction_arrest_no_court_record",
    authority: "T.C.A. § 40-32-109",
    recordTypes: ["arrest"],
    dispositions: ["no_court_record"],
    courtLevel: "court_with_jurisdiction_over_the_offence_of_arrest",
    packetSet: packetSet("tn_arrest_no_court_record", [
      {
        componentId: "tn_arrest_no_court_record-petition-1",
        designRole: "petition",
        templateId: "tn_arrest_no_court_record-petition",
        order: 1
      }
    ]),
    extraInputs: [
      { key: "arrestOffenceAndAgency", label: "The offence of arrest and the arresting agency", required: true },
      { key: "arrestDate", label: "The date of the arrest", required: true },
      { key: "countyAndCourt", label: "The county of arrest and the court with jurisdiction", required: true },
      {
        key: "everArraignedOrAppeared",
        label: "Were you ever arraigned, did you appear, or were you given a court date or case number?",
        required: true
      },
      { key: "courtFileExists", label: "Does any court file or court case exist for this arrest?", required: true },
      {
        key: "dispositionThatCourtRecorded",
        label: "Did the arrest end in a disposition the court recorded?",
        required: true
      },
      {
        key: "arrestRecordEstablished",
        label: "Does the TBI criminal history establish that an arrest record exists?",
        required: true
      },
      {
        key: "evidenceOfAbsence",
        label:
          "Anything you can file that bears on there being no court record — § 40-32-109(b) permits evidence, it does not require it",
        required: false
      }
    ],
    assembledPacketName: "tn-expunction-arrest-no-court-record",
    assembledPacketTitle: "Tennessee expunction packet — arrest with no court record",
    customerDeliverableDescription: `Petition under T.C.A. § 40-32-109, which is the participant's own operative filing. The clerk searches the court's records and certifies to the court under § 40-32-109(c); that certification is the clerk's instrument and nothing here generates or predicts it. Section 40-32-109(e) makes the § 8-21-401 clerk's fee mandatory with no waiver, so this route is not free. ${COURT_TAIL}`,
    notes:
      "Section 40-32-109 carries no cross-reference to § 40-32-108, so none of that section's machinery — the DA-prepared petition, the 61-day clock, the presumption, the refiling bar — applies here."
  }),

  tennesseeTrack({
    trackId: "tn_pretrial_diversion",
    publicName: "Clear a case after completing pretrial diversion",
    mechanism: "expunction_pretrial_diversion",
    authority: "T.C.A. § 40-32-106(d)(1)",
    recordTypes: ["charge"],
    dispositions: ["dismissed_after_pretrial_diversion"],
    courtLevel: "court_having_jurisdiction_in_the_previous_action",
    packetSet: packetSet("tn_pretrial_diversion", [
      {
        componentId: "tn_pretrial_diversion-petition-1",
        designRole: "petition",
        templateId: "tn_pretrial_diversion-petition",
        order: 1
      }
    ]),
    extraInputs: [
      ...COURT_ROUTE_INPUTS,
      { key: "diversionKind", label: "Pretrial or judicial diversion", required: true },
      { key: "successfullyCompleted", label: "Did you complete everything and were the charges dismissed?", required: true },
      { key: "sexualOffence", label: "Was the offence a sexual or violent sexual offence?", required: true },
      { key: "petitionFiledBefore", label: "Have you already filed a petition to expunge this case?", required: true },
      {
        key: "mouWithDa",
        label: "Did you sign a memorandum of understanding suspending prosecution, without pleading guilty?",
        required: true
      }
    ],
    assembledPacketName: "tn-expunction-pretrial-diversion",
    assembledPacketTitle: "Tennessee expunction packet — pretrial diversion completed",
    customerDeliverableDescription: `Petition under T.C.A. § 40-32-106(d)(1). Unlike the straight-dismissal route this one carries the § 8-21-401 clerk's fee and requires the TBI certificate under § 40-32-102(c), and the packet states both. The certificate is a court instrument and nothing here prepares it. ${COURT_TAIL}`,
    notes: "Section 40-32-106(d)(2) bars the route where the diverted offence was a sexual or violent sexual offence."
  }),

  tennesseeTrack({
    trackId: "tn_judicial_diversion",
    publicName: "Clear a case after completing judicial diversion",
    mechanism: "expunction_judicial_diversion",
    authority: "T.C.A. § 40-32-106(d)(1)",
    recordTypes: ["charge"],
    dispositions: ["dismissed_after_judicial_diversion"],
    courtLevel: "court_having_jurisdiction_in_the_previous_action",
    packetSet: packetSet("tn_judicial_diversion", [
      {
        componentId: "tn_judicial_diversion-petition-1",
        designRole: "petition",
        templateId: "tn_judicial_diversion-petition",
        order: 1
      }
    ]),
    extraInputs: [
      ...COURT_ROUTE_INPUTS,
      { key: "diversionKind", label: "Pretrial or judicial diversion", required: true },
      { key: "successfullyCompleted", label: "Did you complete everything and were the charges dismissed?", required: true },
      { key: "sexualOffence", label: "Was the offence a sexual or violent sexual offence?", required: true },
      { key: "petitionFiledBefore", label: "Have you already filed a petition to expunge this case?", required: true },
      {
        key: "conditionalPlea",
        label: "Did you enter a plea the court held without entering a judgment, then complete probation?",
        required: true
      }
    ],
    assembledPacketName: "tn-expunction-judicial-diversion",
    assembledPacketTitle: "Tennessee expunction packet — judicial diversion completed",
    customerDeliverableDescription: `Petition under T.C.A. § 40-32-106(d)(1) for a judicial diversion completed under § 40-35-313. The packet states plainly that federal systems and security-clearance background checks may still see the underlying guilty plea. ${COURT_TAIL}`,
    notes:
      "Public Chapter 268 amended § 40-35-313(b) and (c) to cite title 40, chapter 32, which is the official cross-reference confirming the route survived the reorganization."
  }),

  tennesseeTrack({
    trackId: "tn_eligible_conviction",
    publicName: "Expunge an eligible conviction",
    mechanism: "expunction_eligible_conviction",
    authority: "T.C.A. §§ 40-32-107(a), 40-32-108",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    courtLevel: "convicting_court",
    packetSet: packetSet("tn_eligible_conviction", [
      {
        componentId: "tn_eligible_conviction-request-to-district-attorney-1",
        designRole: "request_to_district_attorney",
        templateId: "tn_eligible_conviction-request-to-district-attorney",
        order: 1
      },
      {
        componentId: "tn_eligible_conviction-eligibility-record-2",
        designRole: "eligibility_record",
        templateId: "tn_eligible_conviction-eligibility-record",
        order: 2
      }
    ]),
    extraInputs: [
      ...DA_ROUTE_INPUTS,
      ...SENTENCE_INPUTS,
      { key: "originatingCourt", label: "The court that handled the case, and its county", required: true },
      { key: "offenceAndDisposition", label: "The charge, and exactly how the case ended", required: true },
      { key: "dispositionDate", label: "The date the case ended", required: true },
      { key: "offenceDate", label: "The date the offence was committed", required: true },
      { key: "convictionOnOrAfter1989", label: "Did the conviction occur on or after 1 November 1989?", required: true },
      {
        key: "commercialDriverLicence",
        label: "Did you hold a commercial driver licence, and did the offence involve a controlled substance or a commercial vehicle?",
        required: true
      },
      {
        key: "sobrietyCondition",
        label: "Did the sentence require a period free from dependency or abuse, and has a year been met?",
        required: true
      },
      { key: "burglaryOffence", label: "Was the conviction for burglary under T.C.A. § 39-13-1002?", required: true },
      { key: "pardonReceived", label: "Have you received a pardon from the Governor?", required: true },
      {
        key: "recoveryCourtCompleted",
        label: "Have you completed a certified recovery court programme?",
        required: true
      }
    ],
    assembledPacketName: "tn-expunction-eligible-conviction-request",
    assembledPacketTitle: "Tennessee expunction request — eligible conviction",
    customerDeliverableDescription: `The participant's own request to the office of the district attorney general, with a controlled eligibility record. ${DA_TAIL}`,
    notes:
      "Where this route is refused, tn_post_pardon and tn_recovery_court are evaluated before any no-relief answer is given. The exclusion list here is unchanged by either."
  }),

  tennesseeTrack({
    trackId: "tn_two_offense",
    publicName: "Expunge up to two offences, once in your life",
    mechanism: "expunction_two_offence",
    authority: "T.C.A. §§ 40-32-107(b), 40-32-108",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    courtLevel: "convicting_court",
    packetSet: packetSet("tn_two_offense", [
      {
        componentId: "tn_two_offense-request-to-district-attorney-1",
        designRole: "request_to_district_attorney",
        templateId: "tn_two_offense-request-to-district-attorney",
        order: 1
      },
      {
        componentId: "tn_two_offense-eligibility-record-2",
        designRole: "eligibility_record",
        templateId: "tn_two_offense-eligibility-record",
        order: 2
      }
    ]),
    extraInputs: [
      ...DA_ROUTE_INPUTS,
      ...SENTENCE_INPUTS,
      { key: "originatingCourt", label: "The court that handled the case, and its county", required: true },
      { key: "offenceAndDisposition", label: "The charge, and exactly how the case ended", required: true },
      { key: "dispositionDate", label: "The date the case ended", required: true },
      { key: "offenceDate", label: "The date the offence was committed", required: true },
      { key: "convictionOnOrAfter1989", label: "Did the conviction occur on or after 1 November 1989?", required: true },
      {
        key: "commercialDriverLicence",
        label: "Did you hold a commercial driver licence, and did the offence involve a controlled substance or a commercial vehicle?",
        required: true
      },
      {
        key: "sobrietyCondition",
        label: "Did the sentence require a period free from dependency or abuse, and has a year been met?",
        required: true
      },
      { key: "howManyOffences", label: "How many offences are you asking to clear?", required: true },
      { key: "offenceCombination", label: "Two misdemeanours, or one felony and one misdemeanour", required: true },
      { key: "sameEpisode", label: "Did the offences arise from a single criminal episode?", required: true },
      {
        key: "understandsOnceOnly",
        label: "This pathway can be used once in your life. Do you understand that using it now closes it?",
        required: true
      },
      { key: "pardonReceived", label: "Have you received a pardon from the Governor?", required: true },
      {
        key: "recoveryCourtCompleted",
        label: "Have you completed a certified recovery court programme?",
        required: true
      }
    ],
    assembledPacketName: "tn-expunction-two-offence-request",
    assembledPacketTitle: "Tennessee expunction request — up to two offences",
    customerDeliverableDescription: `The participant's own request to the office of the district attorney general, with a controlled eligibility record covering the two-offence conditions. ${DA_TAIL}`,
    notes:
      "Two felonies are not an available combination, and § 40-32-107(b)(2) may merge a single episode into one offence. Whether to spend the one lifetime use now is recorded, not decided."
  }),

  tennesseeTrack({
    trackId: "tn_illegal_voting",
    publicName: "Clear a conviction for illegal registration or voting",
    mechanism: "expunction_illegal_voting",
    authority: "T.C.A. §§ 40-32-107(c), 2-19-107, 40-32-108",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    courtLevel: "convicting_court",
    packetSet: packetSet("tn_illegal_voting", [
      {
        componentId: "tn_illegal_voting-participant-request-to-district-attorney-1",
        designRole: "participant_request_to_district_attorney",
        templateId: "tn_illegal_voting-participant-request-to-district-attorney",
        order: 1
      },
      {
        componentId: "tn_illegal_voting-participant-eligibility-record-2",
        designRole: "participant_eligibility_record",
        templateId: "tn_illegal_voting-participant-eligibility-record",
        order: 2
      }
    ]),
    extraInputs: [
      ...DA_ROUTE_INPUTS,
      ...SENTENCE_INPUTS,
      {
        key: "confirmedTwoNineteenOhSeven",
        label: "Does the judgment name T.C.A. § 2-19-107 specifically?",
        required: true
      },
      { key: "offenceDate", label: "The date the offence was committed", required: true },
      { key: "convictionDate", label: "The date of conviction", required: true },
      {
        key: "releaseConditionsMet",
        label: "Is any term of imprisonment or probation complete and every release condition met?",
        required: true
      },
      {
        key: "offencePredatesIneligible",
        label: "Did the offence happen before any conviction that cannot be expunged?",
        required: true
      },
      { key: "votingRightsGoal", label: "Are you doing this to get your voting rights back?", required: true }
    ],
    assembledPacketName: "tn-expunction-illegal-voting-request",
    assembledPacketTitle: "Tennessee expunction request — illegal registration or voting",
    customerDeliverableDescription: `The participant's own request to the office of the district attorney general, with a controlled eligibility record. The fifteen-year period is the longest in the chapter and the packet records the dates rather than calculating it. ${DA_TAIL}`,
    notes:
      "Restoration of voting rights is a separate remedy with separate machinery, and the packet says so wherever the participant names it as the goal."
  }),

  tennesseeTrack({
    trackId: "tn_post_pardon",
    publicName: "Clear a conviction you have been pardoned for",
    mechanism: "expunction_post_pardon",
    authority: "T.C.A. §§ 40-32-107(d), 40-32-108",
    recordTypes: ["conviction"],
    dispositions: ["pardoned"],
    courtLevel: "convicting_court",
    packetSet: packetSet("tn_post_pardon", [
      {
        componentId: "tn_post_pardon-participant-request-to-district-attorney-1",
        designRole: "participant_request_to_district_attorney",
        templateId: "tn_post_pardon-participant-request-to-district-attorney",
        order: 1
      },
      {
        componentId: "tn_post_pardon-participant-eligibility-record-2",
        designRole: "participant_eligibility_record",
        templateId: "tn_post_pardon-participant-eligibility-record",
        order: 2
      }
    ]),
    extraInputs: [
      ...DA_ROUTE_INPUTS,
      { key: "pardonReceived", label: "Have you received a pardon from the Governor?", required: true },
      { key: "pardonDate", label: "The date the pardon was granted", required: true },
      { key: "boardOfParoleVote", label: "Did the board of parole return a positive vote?", required: true },
      { key: "boardVoteDate", label: "The date of the board of parole vote", required: true },
      {
        key: "inchoateForm",
        label: "Was the conviction for an attempt, conspiracy, facilitation or solicitation?",
        required: true
      },
      {
        key: "sexualOffenceRegistration",
        label: "Was the offence a registrable sexual offence, or any sexual offence involving a minor?",
        required: true
      },
      {
        key: "withinExclusionList",
        label: "Might the conviction fall within one of the seven excluded felonies?",
        required: true
      },
      { key: "violenceContested", label: "Is whether the offence was violent genuinely contested?", required: true },
      {
        key: "violenceAccount",
        label: "In your own words, anything you want the court to know about whether the offence was violent",
        required: true
      }
    ],
    assembledPacketName: "tn-expunction-post-pardon-request",
    assembledPacketTitle: "Tennessee expunction request — after a pardon",
    customerDeliverableDescription: `The participant's own request to the office of the district attorney general, with a controlled eligibility record built to the three cumulative requirements § 40-32-107(d)(1) states. No waiting period, sentence-completion checklist or prior-expunction bar is applied, because subsection (d) states none. ${DA_TAIL}`,
    notes:
      "Public Chapter 719 (2026) replaced an open-textured nonviolent-crime finding with a closed list of seven excluded felonies and moved violence from a bar to a merits factor the court weighs."
  }),

  tennesseeTrack({
    trackId: "tn_recovery_court",
    publicName: "Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
    mechanism: "expunction_recovery_court",
    authority: "T.C.A. §§ 40-32-107(e), 40-32-108",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    courtLevel: "convicting_court",
    packetSet: packetSet("tn_recovery_court", [
      {
        componentId: "tn_recovery_court-participant-request-to-district-attorney-1",
        designRole: "participant_request_to_district_attorney",
        templateId: "tn_recovery_court-participant-request-to-district-attorney",
        order: 1
      },
      {
        componentId: "tn_recovery_court-participant-eligibility-record-2",
        designRole: "participant_eligibility_record",
        templateId: "tn_recovery_court-participant-eligibility-record",
        order: 2
      }
    ]),
    extraInputs: [
      ...DA_ROUTE_INPUTS,
      ...SENTENCE_INPUTS,
      {
        key: "offenceInvolvesVehicleAndSubstance",
        label: "Does the offence to be cleared involve a motor vehicle together with alcohol or a controlled substance?",
        required: true
      },
      { key: "duiConvictionCount", label: "How many convictions do you have under T.C.A. § 55-10-401?", required: true },
      { key: "duiConvictionDate", label: "The date of that DUI conviction", required: true },
      { key: "offenceDate", label: "The date the offence to be cleared was committed", required: true },
      {
        key: "recoveryCourtCompleted",
        label: "Did you successfully complete a certified recovery court programme?",
        required: true
      },
      {
        key: "recoveryCourtCompletionDate",
        label: "The date you completed the recovery court programme",
        required: true
      },
      {
        key: "tenYearIntervalEstablished",
        label: "Can the ten-year interval be established from the judgments?",
        required: true
      },
      {
        key: "releaseConditionsMet",
        label: "Is any term of imprisonment or probation complete and every release condition met?",
        required: true
      },
      { key: "wantsDuiCleared", label: "Are you hoping to clear the DUI itself?", required: true }
    ],
    assembledPacketName: "tn-expunction-recovery-court-request",
    assembledPacketTitle: "Tennessee expunction request — after recovery court, with a DUI in the way",
    customerDeliverableDescription: `The participant's own request to the office of the district attorney general, with a controlled eligibility record. This is relief from the DUI bar, not DUI expunction: § 40-32-107(e)(3) forbids clearing the DUI, and the packet says so on its face. ${DA_TAIL}`,
    notes:
      "Added by Public Chapter 1061 (2026), the Recovery Court Renewal Act, effective 1 July 2026 with no offence-date limitation. Reading it as a DUI-expunction route is the single most damaging error available on it."
  })
];
