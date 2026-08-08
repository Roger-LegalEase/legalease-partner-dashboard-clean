// Nevada process guidance — one route, and the participant's part in it is to
// recognise it and then to check.
//
// `nv_seal_deferred` is sealing after a dismissal under a deferred judgment,
// NRS 176.211. The reissued assignment is this track alone: the corrected
// design moved `nv_seal_probation_family` and `nv_repository_removal` into the
// custom-pleading lane, where a Nevada pleading module owns them. Nothing here
// touches either, and no participant instrument is built on this page.
//
// The mechanism, which the correction established from the section itself
// rather than assuming it:
//
//   - Under NRS 176.211(5), once the defendant fulfils the terms and
//     conditions and the court finds that they have been met, the court
//     discharges the defendant and dismisses the proceedings.
//   - Under NRS 176.211(6) the court **shall order sealed** the documents,
//     papers and exhibits in the defendant's record, the minute book entries
//     and docket entries, and the other documents relating to the case held by
//     the agencies and officers named in the order — and shall order them
//     sealed **without a hearing**, unless the Division of Parole and
//     Probation or the prosecutor petitions the court, for good cause shown,
//     not to seal and requests a hearing.
//   - Under NRS 176.211(8) the court sends a copy of the order to each agency
//     or officer named in it, and each must notify the court in writing that
//     it has complied. Under NRS 179.275 a copy also goes to the Central
//     Repository for Nevada Records of Criminal History and to each named
//     custodian.
//   - Under NRS 176.211(9)(a) "court" means a district court of the State of
//     Nevada, so a justice court or municipal court matter is not on this
//     route at all.
//
// So there is no application, no petition and no request for the defendant to
// make, and the section provides none. That is why the node exists at all: a
// participant describes a deferred-judgment dismissal as an ordinary
// dismissal, and NRS 179.245 expressly excepts NRS 176.211 from the ordinary
// conviction petition. Routing them to a petition would hand them the wrong
// instrument for a remedy they are already entitled to receive without filing
// anything — and it is the one mistake on this track that costs money.
//
// Four sheets, and the design names each: detection and routing, the
// explanation of the mechanism, the exclusion screen, and where to go when the
// expected result is not visible.
//
// Five boundaries this module holds:
//
//   - **Record sealing, never expungement.** The state agency says in terms
//     that sealing is not expungement because it does not authorise
//     destruction of the records. The word is used on this page only to say
//     that it is the wrong word for Nevada.
//   - **Sealed is not gone.** NRS 179.285 deems the proceedings never to have
//     occurred and restores civil rights, but NRS 179.295 allows a sealed
//     record to be reopened and NRS 179.301 allows certain persons and
//     agencies to inspect one. All three are stated together, because any one
//     alone misleads.
//   - **No firearm rights.** Sealing does not restore them. Only a pardon that
//     does not restrict the right to bear arms does.
//   - **No reach beyond Nevada.** A Nevada order does not bind an out-of-state
//     or federal agency and does not reach the records they hold, and Nevada
//     sealing is not described as having immigration effect.
//   - **No timing promise.** The section conditions the sealing on the terms
//     and conditions being met rather than on the passage of time, so there is
//     no waiting period — and equally no date by which any particular court
//     acts. The page says neither.
//
// The exclusion the design singles out is NRS 176.211(7): the court may not
// order the subsection 6 sealing for a defendant charged with a violation of
// NRS 200.5099 and discharged under the section. The discharge and dismissal
// still stand; only the sealing is withheld. That is an unusual shape and the
// sheet says it in those terms rather than implying the whole route fails.
//
// No conditional component and no fact placeholder appears here: the adopted
// packet set makes all four components required and no template interpolates a
// participant answer, so a second fixture would render byte-for-byte the same
// packet. The branches that matter are typed stops, and all thirteen are
// exercised as negative cases in the committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Nevada is
// not an enabled jurisdiction and this job does not enable one. The six
// Nevada custom-pleading tracks and their implemented module are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Nevada legal help, named once so no stop is a dead end. */
const NV_LEGAL_HELP =
  "Nevada Legal Services, a Nevada law school legal clinic, or a Nevada attorney who does record-sealing work";

/** The other Nevada routes, named the same way by every stop that points at them. */
const NV_OTHER_ROUTES =
  "the other Nevada record-sealing routes, which are separate routes in the Nevada intake";

/** The one body that can act on this route. Named the same way throughout. */
const NV_DEFERRING_COURT =
  "the Nevada district court that deferred judgment in your case, through its clerk";

// ---------------------------------------------------------------------------
// Shared participant copy
// ---------------------------------------------------------------------------

/** No sheet reports on the participant's own record. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page explains how a process works. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether a particular case qualifies.";

/** Nothing is filed on this route, and the section provides nothing to file. */
const NOTHING_IS_FILED =
  "Nothing is filed by you on this route and nothing can be. NRS 176.211(6) puts the sealing on the court's own motion once it finds the terms and conditions were met, and the section gives you no application, petition or request to make. LegalEase generates no document here, and there is none to generate.";

/** Nevada's word, and the reason the other word is wrong. */
const SEALING_NEVER_EXPUNGEMENT =
  "One word to get straight before anything else. Nevada calls this record sealing, and it is never expungement. That is not a preference: the State says directly that sealing is not expungement because it does not authorise the records to be destroyed. If somebody offers to expunge a Nevada record for you, the useful first question is which statute they are working from.";

/** What sealing does and does not do, held together. */
const WHAT_SEALING_DOES =
  "What a sealing order actually does, and it takes three sentences rather than one. Under NRS 179.285 the proceedings are deemed never to have occurred and your civil rights are restored, which is the part people mean when they say a record is cleared. But NRS 179.295 allows a sealed record to be reopened, and NRS 179.301 allows certain persons and agencies to inspect one. All three of those are true at once, and any one of them on its own gives a misleading picture.";

/** Firearm rights, which sealing does not touch. */
const NO_FIREARM_RIGHTS =
  "One thing sealing does not do, and it is the assumption most worth correcting early. Sealing does not restore firearm rights. Only a pardon that does not restrict the right to bear arms does that, and a pardon is a different process with a different body deciding it.";

/** Reach: Nevada records only. */
const REACH_STOPS_AT_THE_STATE_LINE =
  "And a limit on reach. A Nevada order does not bind an out-of-state or federal agency and does not reach the records they hold. Nevada sealing is also not described here as having any immigration effect, because it is not something this page can tell you it has.";

const NV_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, remove or destroy anything, and cannot make a court, a clerk, a prosecutor or a records agency act.",
  "LegalEase does not prepare a petition, motion, application, request or proposed order on this route, and does not prepare one for anybody to sign.",
  "LegalEase cannot tell you whether a particular case qualifies. This page explains how a process works; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been sealed. Only your own record check shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when a court will act, and no date is given on this page for one.",
  "LegalEase cannot tell you what the Division of Parole and Probation or a prosecutor will do about any particular case."
];

const NV_SOURCES: readonly string[] = [
  "NRS 176.211, deferral of judgment — eligibility, duration, terms and conditions, violation of a term or condition, discharge and dismissal, and sealing of records — read at the Nevada Legislature on 8 August 2026. The chapter carries a revision stamp of 15 April 2026 for the 2025 sessions.",
  "NRS 179.245, which is expressly displaced by NRS 176.211 for this route; NRS 179.275, the distribution of a sealing order to the Central Repository for Nevada Records of Criminal History and to each named custodian; NRS 179.285, 179.295 and 179.301, which say what a sealed record is, when it may be reopened and who may inspect it.",
  "Session Information, Nevada Legislature, read on 8 August 2026. The most recent sessions are the 83rd (2025) Regular Session and the 36th (2025) Special Session, and the next begins on 1 February 2027, so the text read is the current law in full.",
  "Sealing of Criminal History Records (General Information), revised August 2025, Nevada State Police, Records, Communications and Compliance Division. It publishes no form for this section, and nothing in NRS 176.211 contemplates one."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NevadaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NevadaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Nevada route. */
export class NevadaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NevadaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NevadaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NevadaBranchError";
  }
}

export const NV_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Nevada sealing reaches Nevada records and nothing else. */
export const NV_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  nevada_state: "within",
  another_state: "outside",
  federal: "outside",
  tribal: "outside",
  military: "outside"
};

/** NRS 176.211(9)(a) confines the section to a district court. */
export const NV_COURT_LEVELS: Readonly<Record<string, string>> = {
  district_court: "district",
  justice_court: "other",
  municipal_court: "other",
  cannot_tell: "unknown"
};

/** How the case ended, which is what the whole route turns on. */
export const NV_DISMISSAL_TYPES: Readonly<Record<string, string>> = {
  dismissed_after_completing_a_deferred_judgment: "deferred",
  dismissed_outright: "ordinary",
  deferral_terminated_and_convicted: "terminated",
  cannot_tell: "unknown"
};

/** What the participant's own record check showed. */
export const NV_RECORD_STATUS: Readonly<Record<string, string>> = {
  no_longer_shows: "cleared",
  still_shows: "still_shows",
  not_yet_checked: "unchecked"
};

/** What the participant is trying to achieve, because one goal is unreachable. */
export const NV_PARTICIPANT_GOAL: Readonly<Record<string, string>> = {
  background_checks_and_employment: "records",
  housing_or_licensing: "records",
  firearm_rights: "firearms"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NevadaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers and routes to the correct Nevada node.
 *
 * The order is: the three gates that decide whether NRS 176.211 is the route
 * at all — Nevada records, a district court, a deferred-judgment dismissal —
 * then the section's own exclusion and its one adversarial step, then the
 * questions about what the participant is actually trying to achieve, and last
 * what their own record check showed.
 *
 * Fails closed on any answer outside a closed list, and fails closed on the
 * two "cannot tell" answers, because both go to gates the section makes
 * dispositive. Every stop and every mismatch carries a reason, a destination
 * and the next step to take there.
 */
export function deriveNevadaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nevada sealing reaches Nevada records.
  const jurisdiction = branch(
    trackId,
    "recordJurisdiction",
    NV_RECORD_JURISDICTIONS,
    facts.recordJurisdiction
  );
  if (jurisdiction.resolved === "outside") {
    throw new NevadaRouteMismatchError(
      trackId,
      "record_is_not_a_nevada_state_record",
      "NRS 176.211 runs on Nevada cases in Nevada courts. A Nevada order does not bind an out-of-state, federal, tribal or military agency and does not reach the records it holds, so this route does not touch one.",
      "the state, federal, tribal or military authority that holds the record, and " + NV_LEGAL_HELP,
      "Take the record to that authority and ask what its own law provides for clearing it. If you also have Nevada cases, those are handled separately and only those are served here."
    );
  }

  // Gate 2. NRS 176.211(9)(a) means a district court and nothing else.
  const court = branch(trackId, "courtLevel", NV_COURT_LEVELS, facts.courtLevel);
  if (court.resolved === "other") {
    throw new NevadaRouteMismatchError(
      trackId,
      "case_was_not_in_a_nevada_district_court",
      "NRS 176.211(9)(a) defines the court for this section as a district court of the State of Nevada. A justice court or a municipal court matter is not on this route, even where the disposition looks the same from the outside — a different section governs it, with its own rules about who acts and when.",
      NV_OTHER_ROUTES + ", and " + NV_LEGAL_HELP,
      "Go back to the Nevada intake with the name of the court and the county and ask which section applies to a justice court or municipal court disposition."
    );
  }
  if (court.resolved === "unknown") {
    throw new NevadaGuidanceStopError(
      trackId,
      "which_court_handled_the_case_cannot_be_established",
      "Which court handled the case decides whether this section reaches it at all, so it is not a detail that can be left open. NRS 176.211(9)(a) confines the section to a district court of the State of Nevada, and a justice court or municipal court matter runs on different rules. Guessing here would mean telling you a court is going to act when no court is.",
      NV_DEFERRING_COURT + " if you know the county, otherwise " + NV_LEGAL_HELP,
      "Ask the clerk in the county where the case was heard which court it was and for a copy of the docket. Come back with the answer rather than an assumption."
    );
  }

  // Gate 3. The detection this node exists for.
  const dismissal = branch(
    trackId,
    "dismissalType",
    NV_DISMISSAL_TYPES,
    facts.dismissalType
  );
  if (dismissal.resolved === "ordinary") {
    throw new NevadaRouteMismatchError(
      trackId,
      "dismissal_was_ordinary_rather_than_after_a_deferred_judgment",
      "This route is only for a case dismissed because a deferred judgment was completed. A case dismissed outright is a different thing with a different remedy, and it is worth getting right in both directions: a person on this route who is sent to a petition pays for something the statute already gives them, and a person off it who is told to wait may be waiting for a court step that is never coming.",
      NV_OTHER_ROUTES + ", and " + NV_LEGAL_HELP,
      "Go back to the Nevada intake, say the case was dismissed outright rather than after a programme, and ask which route reaches it."
    );
  }
  if (dismissal.resolved === "terminated") {
    throw new NevadaRouteMismatchError(
      trackId,
      "deferral_was_terminated_and_a_judgment_of_conviction_was_entered",
      "Where a deferral is terminated for violating a term or condition, NRS 176.211(4) has the court enter a judgment of conviction. That means the subsection 6 sealing does not follow, because it depends on the discharge and dismissal that never happened. What you have is a conviction, and Nevada's conviction routes are a different thing with waiting periods and a petition.",
      NV_OTHER_ROUTES + ", and " + NV_LEGAL_HELP,
      "Go back to the Nevada intake with the judgment and the date it was entered, and ask about the conviction routes."
    );
  }
  if (dismissal.resolved === "unknown") {
    throw new NevadaGuidanceStopError(
      trackId,
      "whether_the_dismissal_followed_a_deferred_judgment_cannot_be_established",
      "This is the question the whole route turns on, and it is genuinely easy to be unsure about — a deferred-judgment dismissal and an ordinary dismissal read almost the same on a summary. The difference decides whether a court seals the record on its own or whether nothing happens without a filing, so it has to be established rather than assumed.",
      NV_DEFERRING_COURT + ", and " + NV_LEGAL_HELP,
      "Ask the clerk for the docket and the minutes for the case. What you are looking for is an order deferring judgment, then a discharge and dismissal after you finished the programme or the agreement."
    );
  }

  // Gate 4. The NRS 176.211(7) exclusion, which withholds only the sealing.
  const elderVulnerable = branch(
    trackId,
    "elderOrVulnerablePersonCharge",
    NV_YES_NO,
    facts.elderOrVulnerablePersonCharge
  );
  if (elderVulnerable.resolved) {
    throw new NevadaGuidanceStopError(
      trackId,
      "charge_was_an_older_or_vulnerable_person_offence",
      "This one has an unusual shape and it is worth being precise about. NRS 176.211(7) says the court may not order the subsection 6 sealing for a defendant charged with a violation of NRS 200.5099 and discharged under the section. The deferral and the discharge and dismissal still stand — what is withheld is the sealing, and only the sealing. So the case can be over and the record still there, permanently as far as this section goes.",
      NV_LEGAL_HELP,
      "Take the charging document and the dismissal to one of them and ask whether any other Nevada provision reaches the record, because this section does not."
    );
  }

  // Gate 5. The section's one adversarial step.
  const contested = branch(
    trackId,
    "divisionOrProsecutorObjected",
    NV_YES_NO,
    facts.divisionOrProsecutorObjected
  );
  if (contested.resolved) {
    throw new NevadaGuidanceStopError(
      trackId,
      "division_or_prosecutor_has_petitioned_the_court_not_to_seal",
      "NRS 176.211(6) has the court order the records sealed without a hearing unless the Division of Parole and Probation or the prosecutor petitions the court, for good cause shown, not to seal and requests a hearing. Where that has happened, the route stops being administrative and becomes a contested proceeding with somebody arguing against you. That is advocacy, not a process to follow, and it is not something a page can carry you through.",
      NV_LEGAL_HELP,
      "Get a lawyer before the hearing date. Take the court's notice, anything the Division or the prosecutor has filed, and your record of completing the terms and conditions."
    );
  }

  // Gate 6. Offence classification is a legal judgment, not a lookup.
  const categoryQuestion = branch(
    trackId,
    "hasOffenceCategoryQuestion",
    NV_YES_NO,
    facts.hasOffenceCategoryQuestion
  );
  if (categoryQuestion.resolved) {
    throw new NevadaGuidanceStopError(
      trackId,
      "offence_category_question_requires_legal_classification",
      "Nevada's other sealing routes turn on whether an offence is a category A through E felony, a gross misdemeanour or a misdemeanour, and on whether it is a crime of violence. Those classifications are what drive the difference between a one-year wait and a ten-year one on those routes, and getting one wrong changes the answer completely. It is a legal classification rather than something to look up, and this page does not make it.",
      NV_LEGAL_HELP,
      "Take the judgment or the charging document to one of them and ask for the category in terms, then bring that answer back to the Nevada intake."
    );
  }

  // Gate 7. One goal this route cannot reach.
  const goal = branch(trackId, "participantGoal", NV_PARTICIPANT_GOAL, facts.participantGoal);
  if (goal.resolved === "firearms") {
    throw new NevadaGuidanceStopError(
      trackId,
      "firearm_rights_are_the_goal_and_sealing_does_not_restore_them",
      "Sealing does not restore firearm rights, so this route cannot give you what you are after even if it runs perfectly. Only a pardon that does not restrict the right to bear arms does that, and a pardon is a different process decided by a different body. Saying so now is better than saying it after you have waited for a court order that would not have helped.",
      NV_LEGAL_HELP,
      "Ask one of them about the pardon process and about what a sealing order would and would not change for you, so that you are pursuing the thing that reaches your goal."
    );
  }

  // Gate 8. Immigration, which Nevada sealing is not described as touching.
  const immigration = branch(
    trackId,
    "immigrationExposure",
    NV_YES_NO,
    facts.immigrationExposure
  );
  if (immigration.resolved) {
    throw new NevadaGuidanceStopError(
      trackId,
      "immigration_exposure_in_play",
      "Nevada sealing is not described on this page as having any immigration effect, because that is not something this page can tell you it has. A decision made on the assumption that sealing a Nevada record solves an immigration problem is a decision made on a basis nobody here has established. It also cuts the other way: once records are sealed, producing them again is harder, and an immigration case can turn on producing exactly those documents.",
      "an immigration attorney, and afterwards " + NV_LEGAL_HELP,
      "Speak to an immigration attorney before the court reaches the sealing step, and ask the clerk for copies of the charging document, the discharge and the dismissal while they are still straightforward to obtain."
    );
  }

  // Gate 9. More than one court or county is not one question.
  const multipleCourts = branch(
    trackId,
    "recordsInMoreThanOneCourtOrCounty",
    NV_YES_NO,
    facts.recordsInMoreThanOneCourtOrCounty
  );
  if (multipleCourts.resolved) {
    throw new NevadaGuidanceStopError(
      trackId,
      "records_are_in_more_than_one_court_or_county",
      "Records in more than one county, or in a municipal or justice court as well as a district court, are not one question with one answer. Each court's disposition runs on its own section, and this section reaches only the district court matter. Answering for the whole record from a page about one of its parts is how somebody ends up believing everything is dealt with when only some of it is.",
      NV_OTHER_ROUTES + ", and " + NV_LEGAL_HELP,
      "List every case with its court and county and take the list to the Nevada intake or to legal help, so that each one is answered on its own footing."
    );
  }

  // Gate 10. What the participant's own record check already showed.
  const status = branch(trackId, "recordStatus", NV_RECORD_STATUS, facts.recordStatus);
  if (status.resolved === "still_shows") {
    throw new NevadaGuidanceStopError(
      trackId,
      "record_still_appears_after_the_discharge_and_dismissal",
      "That is a compliance question and it belongs to the court, not to you. Under NRS 176.211(8) the court sends a copy of the sealing order to each agency and officer named in it and each must notify the court in writing that it has complied, and under NRS 179.275 a copy also goes to the Central Repository and to each named custodian. If a record is still showing, the possibilities are that the order has not been made, that it did not name the agency you are looking at, or that the agency has not yet reported compliance — and there is nothing you can file to cure any of them.",
      NV_DEFERRING_COURT + ", and " + NV_LEGAL_HELP,
      "Ask the clerk whether a sealing order was entered, on what date, and which agencies it named. Take that answer to legal help if the record is still showing after it."
    );
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

type SheetInput = {
  templateId: string;
  mechanismName: string;
  whyNotAFiling: string;
  prerequisites: readonly string[];
  documentsToObtain: readonly string[];
  gather: readonly string[];
  destination: { name: string; detail: string };
  sequence: readonly string[];
  /** Required per sheet: the fee sentence differs in what it has to head off. */
  fees: string;
  feeWaiver: string;
  /** Required per sheet: notice is the court's duty, and only one sheet owns it. */
  noticeOrService: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  escalations: readonly string[];
};

/**
 * Builds one sheet.
 *
 * `fees`, `feeWaiver` and `noticeOrService` are required rather than defaulted.
 * The fee sentences have to carry the NRS 179.245(9) waiver accurately —
 * it is a real entitlement on the petition routes and it does not reach this
 * section — and a shared default would either drop it or imply it applies
 * here. Notice belongs to the explanation sheet, where the subsection 8 and
 * NRS 179.275 duties are set out; putting the full account on all four would
 * make the routing sheet read as though something were being served.
 */
function sheet(input: SheetInput): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: "court_adjacent",
    prerequisites: [...input.prerequisites],
    documentsToObtain: [...input.documentsToObtain],
    participantDataToGather: [...input.gather],
    officialDestination: input.destination,
    actionSequence: [...input.sequence],
    submissionMethod:
      "There is nothing for you to submit and nowhere to submit it. No petition, motion, application, request or proposed order is generated on this route, and nothing is sent on your behalf.",
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: [...input.noticeOrService],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: [...input.canPrepare],
    legalEaseCannotPerform: NV_CANNOT_PERFORM,
    escalationTriggers: [...input.escalations],
    officialSourceReferences: NV_SOURCES
  };
}

const NV_COMMON_ESCALATIONS: readonly string[] = [
  "The record is a federal, tribal, military or out-of-state record.",
  "The case was heard in a justice court or a municipal court rather than a district court.",
  "You cannot tell whether the dismissal followed a deferred judgment or was an ordinary dismissal.",
  "Your immigration status could be affected by the record.",
  "What you are actually after is firearm rights."
];

/** The fee position, worded so the NRS 179.245(9) waiver is placed accurately. */
const NV_FEES_STANDARD =
  "None. There is no filing on this route to charge for, and NRS 176.211 prescribes no fee for the sealing it directs. One thing worth knowing because it comes up whenever Nevada fees are discussed: NRS 179.245(9) waives the fees for a person whose record arises out of being a victim of sex trafficking or involuntary servitude. By its own words that applies to a petition for sealing under NRS 179.245, which is a different route. It is not needed here, because here there is nothing to pay.";

const NV_FEE_WAIVER_STANDARD =
  "Not applicable on this route. There is no fee here to waive, because there is nothing here to file. The NRS 179.245(9) waiver belongs to the petition route under NRS 179.245, and that is a separate route in the Nevada intake.";

export const NEVADA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "nv-seal-deferred-detection-and-routing": sheet({
    templateId: "nv-seal-deferred-detection-and-routing",
    mechanismName:
      "Was your case dismissed after a deferred judgment? If so, you are on a different route",
    whyNotAFiling:
      "Nothing is filed by you and nothing is prepared for you. This sheet exists to work out which route your case is on, because a case dismissed after a deferred judgment is sealed by the court under NRS 176.211 without anybody filing anything — and the ordinary Nevada sealing petition is expressly unavailable for it. Getting that identification right is the whole value of this page.",
    prerequisites: [
      "The case was a Nevada case.",
      "It ended in a dismissal rather than a sentence.",
      "You are willing to check the court record rather than rely on how the outcome was described to you."
    ],
    documentsToObtain: [
      "The docket and the minutes for the case, from the clerk of the court that heard it. What you are looking for is an order deferring judgment, and then a discharge and dismissal after you completed the programme or the agreement. Those two entries are what identify this route.",
      "Anything you were given when you finished the programme or the agreement — a certificate, a letter, a completion notice. It establishes the date the court's own finding rests on."
    ],
    gather: [
      "Whether the case was dismissed because you completed a programme or an agreement with the court, or dismissed outright.",
      "Which court handled it and in which county, and whether it was a district court, a justice court or a municipal court.",
      "When you finished the programme or agreement, and when the case was dismissed.",
      "Whether you have Nevada cases in more than one court or more than one county."
    ],
    destination: {
      name: "The clerk of the Nevada court that heard the case — for identification only",
      detail:
        "Nothing is submitted anywhere on this route. The clerk is named here because the docket and the minutes are what settle which route you are on, and that is a question you can answer for yourself with a copy of them. LegalEase contacts nobody about your case."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Start with the question this sheet exists to ask, because almost nobody volunteers the answer. Was your case dismissed because you finished a programme or an agreement with the court, or was it simply dismissed? People describe both as a dismissal, and the two are cleared in completely different ways.",
      "Why it matters that much. If a Nevada district court deferred judgment and then discharged and dismissed the case once you completed the terms and conditions, NRS 176.211(6) directs the court to order the record sealed on its own. There is no application, no petition and no request for you to make, and the section provides none.",
      "And the trap on the other side of it. NRS 179.245, which is the ordinary Nevada sealing petition, expressly excepts NRS 176.211. So a person on this route who is sent off to file a petition is being handed the wrong instrument for a remedy the statute already gives them without filing anything. That is the one mistake on this track that costs real money.",
      "How to tell, using the court's own record rather than memory. Ask the clerk of the court that heard the case for the docket and the minutes. You are looking for two things in sequence: an order deferring judgment, and then, after you finished, a discharge and a dismissal of the proceedings. If both are there, this is your route.",
      "What it looks like if it is not your route. A case that was dismissed outright, without a programme or an agreement first, is a different Nevada question with a different answer. So is a case where a deferral was terminated because a term or condition was broken, because NRS 176.211(4) has the court enter a judgment of conviction in that situation, and a conviction goes down the conviction routes instead.",
      "One more identification point that decides everything else. NRS 176.211(9)(a) defines the court for this section as a district court of the State of Nevada. A justice court or a municipal court matter is not on this route, however similar the disposition looks, and a different section governs it.",
      SEALING_NEVER_EXPUNGEMENT,
      "If more than one court or county is involved, treat each case separately. Each disposition runs on its own section, and an answer about one of them is not an answer about the rest.",
      NOTHING_IS_FILED
    ],
    fees: NV_FEES_STANDARD,
    feeWaiver: NV_FEE_WAIVER_STANDARD,
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify on this sheet.",
      "Asking a clerk for a copy of the docket and the minutes is a records request, not a filing, and it starts nothing."
    ],
    expectedNextStage:
      "Once you know the case was dismissed after a deferred judgment in a district court, the next sheet sets out exactly what the court does and in what order. The third sheet is what would stop it, and the last is what to do if the record is still showing.",
    canPrepare: [
      "This account of how to tell a deferred-judgment dismissal from an ordinary one, using the docket and the minutes.",
      "The warning that the ordinary Nevada sealing petition is expressly unavailable for this section, so that nobody pays for the wrong instrument.",
      "The district-court requirement, which decides whether the section reaches the case at all.",
      "The correction to the vocabulary, which is that Nevada seals records and does not expunge them.",
      "The three sheets that follow this one in the packet."
    ],
    escalations: [
      ...NV_COMMON_ESCALATIONS,
      "The deferral was terminated and a judgment of conviction was entered.",
      "You have Nevada cases in more than one court or more than one county.",
      "Somebody has offered to prepare a sealing petition for a case that was dismissed after a programme."
    ]
  }),

  "nv-seal-deferred-explanation": sheet({
    templateId: "nv-seal-deferred-explanation",
    mechanismName: "What the court does, in what order, and what a sealing order is worth",
    whyNotAFiling:
      "Nothing is filed by you and nothing is prepared for you, because on this route the duty runs to the court. Under NRS 176.211(6) the court shall order the records sealed, and shall do it without a hearing, once it finds the terms and conditions were met. This sheet sets out the steps in order so that you can recognise them, and says plainly what a sealing order does and does not do.",
    prerequisites: [
      "You have read the sheet before this one and know the case was dismissed after a deferred judgment in a Nevada district court.",
      "You want to know what the court does rather than to be told to be patient."
    ],
    documentsToObtain: [
      "A copy of the discharge and dismissal, from the clerk of the district court that deferred judgment. It is the step the sealing follows from.",
      "A copy of the sealing order itself, once one has been entered. Keep it permanently: it names the agencies the court ordered to seal, which is the list that matters if a record turns up later."
    ],
    gather: [
      "The date the court discharged you and dismissed the proceedings.",
      "The district court and the county, and the case number.",
      "Whether you have heard anything from the court, the Division of Parole and Probation or the prosecutor since the dismissal."
    ],
    destination: {
      name: "The Nevada district court that deferred judgment, and the agencies its order names",
      detail:
        "The district court discharges, dismisses and then orders the sealing on its own. Under NRS 176.211(8) it sends a copy of the order to each agency or officer named in it, and each must notify the court in writing that it has complied. Under NRS 179.275 a copy also goes to the Central Repository for Nevada Records of Criminal History and to each named custodian. Nothing is submitted by you at any point."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "The steps, in the order the section puts them. First, under NRS 176.211(5), you fulfil the terms and conditions the court and the Division of Parole and Probation imposed, and the court finds that they have been met. On that finding the court discharges you and dismisses the proceedings.",
      "Second, under NRS 176.211(6), the court shall order sealed the documents, papers and exhibits in your record, the minute book entries and the docket entries, and the other documents relating to the case held by the agencies and officers named in the order. The section says the court shall order those records sealed without a hearing.",
      "There is one exception to the no-hearing rule and it is worth knowing about rather than being surprised by. The court orders the sealing without a hearing unless the Division of Parole and Probation or the prosecutor petitions the court, for good cause shown, not to seal and requests a hearing. That is the mechanism the statute provides. It is not a prediction that anybody will, and this page does not offer one.",
      "Third, under NRS 176.211(8), the court sends a copy of the order to each agency or officer named in it, and each of them must notify the court in writing that it has complied. Under NRS 179.275 a copy also goes to the Central Repository for Nevada Records of Criminal History and to each custodian named in it. That reporting duty is the closest thing this route has to a receipt, and it runs to the court rather than to you.",
      "There is no waiting period on this route. The section conditions the sealing on the terms and conditions being fulfilled, not on time passing after the dismissal. What there also is not, and this page will not invent one, is a date by which a particular court acts.",
      SEALING_NEVER_EXPUNGEMENT,
      WHAT_SEALING_DOES,
      NO_FIREARM_RIGHTS,
      REACH_STOPS_AT_THE_STATE_LINE,
      "What you can do with all of that, which is more than it sounds. Ask the clerk for the sealing order once it is entered and keep it permanently. It names the agencies the court ordered to seal, and if a record surfaces later that list is what tells you whether the agency showing it was ever covered.",
      NOTHING_IS_FILED
    ],
    fees: NV_FEES_STANDARD,
    feeWaiver: NV_FEE_WAIVER_STANDARD,
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify. No notice duty on this route falls on you at all.",
      "Under NRS 176.211(8) the court sends a copy of the sealing order to each agency or officer named in it, and each must advise the court in writing that it has complied.",
      "Under NRS 179.275 a copy of the order also goes to the Central Repository for Nevada Records of Criminal History and to each custodian named in it.",
      "Nobody is required to write and tell you when a record has been sealed, which is why checking your own record is the step this packet asks you to take."
    ],
    expectedNextStage:
      "The next sheet is what would stop the sealing even where everything else is in place. The last sheet is what to do if the record is still showing.",
    canPrepare: [
      "This account of the three steps the section sets out, in the order it sets them out.",
      "The no-hearing rule and its single exception, stated as the mechanism rather than as a likelihood.",
      "The explanation of what a sealed Nevada record is, including that it can be reopened and inspected.",
      "The plain statement that sealing does not restore firearm rights and does not reach federal or out-of-state records.",
      "The reason to keep the sealing order permanently, which is the list of agencies it names."
    ],
    escalations: [
      ...NV_COMMON_ESCALATIONS,
      "The Division of Parole and Probation or the prosecutor has petitioned the court not to seal.",
      "You have been asked to confirm in writing that a record has been sealed.",
      "You need to know whether a sealed record can be reopened in your particular situation."
    ]
  }),

  "nv-seal-deferred-exclusion-screen": sheet({
    templateId: "nv-seal-deferred-exclusion-screen",
    mechanismName: "What would stop the sealing, even where everything else is in place",
    whyNotAFiling:
      "This sheet is a screen. Nothing on it is filed, and there is nothing on this route that could be filed. It sets out the situations in which the sealing does not follow, so that you are not waiting for a court step that is not coming.",
    prerequisites: [
      "You have read the two sheets before this one in the packet.",
      "You want to know what would stop the sealing rather than to assume it follows automatically from the dismissal."
    ],
    documentsToObtain: [
      "The charging document for the case, from the clerk of the district court. What the charge actually was decides whether the one statutory exclusion on this route applies.",
      "Any order the court made when the deferral ended, whether that was a discharge and dismissal or a judgment of conviction."
    ],
    gather: [
      "Exactly what the charge was, as it appears on the charging document rather than as it was described to you.",
      "Whether the deferral ran to completion or was terminated for breaking a term or condition.",
      "Whether the court that handled the case was a district court.",
      "Whether anything has been filed asking the court not to seal."
    ],
    destination: {
      name: "No destination. This sheet is a screen rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because the sealing on this route follows conditions in the statute, and a person who knows one of them is not met is better off asking a different question now than waiting for an order that cannot be made."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "The first one has an unusual shape and is the reason this sheet exists. NRS 176.211(7) says the court may not order the subsection 6 sealing for a defendant who is charged with a violation of NRS 200.5099 — abuse, neglect, exploitation, isolation or abandonment of an older person or a vulnerable person — and who is discharged under the section. Read that carefully: the deferral is still available and the discharge and dismissal still stand. What is withheld is the sealing, and only the sealing.",
      "So on that charge the case genuinely can be over while the record stays where it is, as far as this section goes. That is worth knowing early rather than after months of checking, and it is a question for a lawyer rather than for this page, because whether any other provision reaches the record is not something set out here.",
      "The second is the one that turns the route into a contest. Under NRS 176.211(6) the court orders the records sealed without a hearing unless the Division of Parole and Probation or the prosecutor petitions the court, for good cause shown, not to seal and requests a hearing. Again, that is the mechanism the section provides and not a forecast. If it happens, what you have is a contested hearing and you should have somebody arguing for you at it.",
      "The third is about how the deferral ended. NRS 176.211(4) has the court enter a judgment of conviction where a deferral is terminated for violating a term or condition. The subsection 6 sealing depends on the discharge and dismissal, so where those never happened the sealing does not follow either. What exists instead is a conviction, and Nevada's conviction routes work differently and do involve a petition.",
      "The fourth is the court itself. NRS 176.211(9)(a) confines this section to a district court of the State of Nevada. A justice court or municipal court disposition that looks the same is governed by a different section, so nothing on this page describes what happens to it.",
      "There is also a set of offences that never reach this route in the first place, because the deferral itself is unavailable for them. NRS 176.211(3)(b) bars a deferral of judgment for a defendant convicted of a violent or sexual offense as defined in NRS 202.876, a crime against a child as defined in NRS 179D.0357, a violation of NRS 200.508, or a violation of NRS 574.100 punishable under subsection 6 of that section. If a deferral was granted, that question was already answered; it is set out here so that the picture is complete.",
      "What this sheet does not do, and the limit is deliberate. It does not tell you which category your offence falls into. Nevada's other routes turn on whether an offence is a category A through E felony, a gross misdemeanour or a misdemeanour, and on whether it is a crime of violence, and that classification is a legal judgment rather than a lookup.",
      "And a reminder about scope, because it changes what any of this is worth to you. Sealing does not restore firearm rights, and a Nevada order does not bind an out-of-state or federal agency or reach the records it holds.",
      NOTHING_IS_FILED
    ],
    fees: NV_FEES_STANDARD,
    feeWaiver: NV_FEE_WAIVER_STANDARD,
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "If the Division of Parole and Probation or the prosecutor petitions the court not to seal, that is their filing and not yours, and the court is the body it goes to.",
      "Nothing on this sheet asks you to send anything anywhere."
    ],
    expectedNextStage:
      "You leave this sheet knowing what would stop the sealing and which of those things you can check for yourself. The last sheet is what to do when the record is still showing.",
    canPrepare: [
      "This account of the NRS 176.211(7) exclusion, stated precisely, because it withholds the sealing without disturbing the dismissal.",
      "The no-hearing rule and the objection that displaces it, so that a contested hearing is not a surprise.",
      "The difference between a completed deferral and a terminated one, and what follows from each.",
      "The district-court requirement, and the offences for which a deferral was never available.",
      "A plain statement of the question this page will not answer, which is what category an offence falls into."
    ],
    escalations: [
      ...NV_COMMON_ESCALATIONS,
      "The charge was one of abuse, neglect, exploitation, isolation or abandonment of an older person or a vulnerable person.",
      "The Division of Parole and Probation or the prosecutor has asked the court not to seal.",
      "You need to know which category an offence falls into, or whether it counts as a crime of violence."
    ]
  }),

  "nv-seal-deferred-referral-instructions": sheet({
    templateId: "nv-seal-deferred-referral-instructions",
    mechanismName: "What to do when the record is still showing",
    whyNotAFiling:
      "This sheet is about checking and asking, not about filing. There is nothing on this route for you to file, and nothing here is prepared for you to send. What it gives you is the one office that can actually act, and the question to put to it.",
    prerequisites: [
      "You have read the three sheets before this one in the packet.",
      "You have checked, or are about to check, what your own record currently shows."
    ],
    documentsToObtain: [
      "Your own Nevada criminal history record, so that the question is asked against what is actually recorded rather than against what an employer said. Keep it dated: a second copy later is only useful if you can compare it to the first.",
      "A copy of the sealing order, if one has been entered, from the clerk of the district court that deferred judgment. It names the agencies the court ordered to seal, and that list is the first thing to check a stray record against."
    ],
    gather: [
      "The date of each record check you obtain, and exactly what it showed.",
      "Which agency or database the record appeared in, and how you came to see it.",
      "The date of the discharge and dismissal, and the district court and county."
    ],
    destination: {
      name: "The Nevada district court that deferred judgment, through its clerk — and Nevada Legal Services if the answer does not resolve it",
      detail:
        "The court that made the order is the only body that can act on this route: under NRS 176.211(8) it is the court that sends the order to each named agency and the court that each agency must report its compliance to. Nothing is submitted by you, and this sheet asks you to put a question rather than to make a request for relief."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Check your own record first, because everything after this depends on knowing what is actually there. Obtain your own Nevada criminal history record and keep it dated. Nobody writes to tell you that a record has been sealed, so your own copy is the only reliable evidence either way.",
      "If the case no longer appears, that is your answer and it is the one worth having. Keep the record check, and keep the sealing order if you obtained one.",
      "If it still appears, the important thing to understand is whose problem it is. Under NRS 176.211(8) the court sends the sealing order to each agency and officer named in it, and each of those must notify the court in writing that it has complied. Under NRS 179.275 the order also goes to the Central Repository for Nevada Records of Criminal History and to each named custodian. Compliance is therefore reported to the court, and the court is the body that knows whether it has been.",
      "So the question to ask, and the office to ask it of. Go to the clerk of the district court that deferred judgment and ask three things: whether a sealing order was entered in the case, on what date, and which agencies and officers it named. Those three answers separate the possibilities from one another.",
      "What the answers mean. If no order was entered, the sealing step has not happened yet or something on the previous sheet has stopped it. If an order was entered but did not name the agency whose record you saw, that is a different problem from an agency that has simply not complied. And if the order named the agency and the record is still there, the compliance duty runs to the court, which is exactly why the court is the place to raise it.",
      "What not to do while you are asking. Do not file anything. There is no application, petition or request on this route, the section provides none, and the ordinary Nevada sealing petition is expressly unavailable for a case under this section — so a filing here is money spent on the wrong instrument rather than a way of hurrying anybody along.",
      "And do not tell an employer, a landlord or a licensing body that a case has been sealed because the dismissal happened or because time has passed. Until your own record check shows it, that is not something you can stand behind.",
      "When to bring in help rather than keep asking. If the clerk's answer does not resolve it, or if you are told an order was made and the record is still appearing, take what the clerk told you to Nevada Legal Services, a Nevada law school legal clinic, or a Nevada attorney who does record-sealing work. Take the dated record check and the sealing order with you if you have one.",
      REACH_STOPS_AT_THE_STATE_LINE,
      NOTHING_IS_FILED
    ],
    fees: NV_FEES_STANDARD,
    feeWaiver: NV_FEE_WAIVER_STANDARD,
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "Asking the clerk whether an order was entered is a question about the court's own record. It is not a filing and it starts no proceeding.",
      "Nobody is required to write and tell you when a record has been sealed, which is why the dated record check is the step this sheet asks you to take."
    ],
    expectedNextStage:
      "You leave this packet knowing how to tell whether this route is yours, what the court does, what would stop it, how to check whether it happened, and who to ask when the answer is not what you expected.",
    canPrepare: [
      "This account of how to check, and of why a dated record check is worth more than an assumption.",
      "The three questions to put to the clerk, and what each of the possible answers separates out.",
      "The explanation of why compliance is reported to the court, which is what makes the court the place to raise it.",
      "The plain statement that there is nothing to file here, so that nobody spends money trying to hurry a court step along.",
      "The referral to legal help, with what to take to it."
    ],
    escalations: [
      ...NV_COMMON_ESCALATIONS,
      "The record still appears some months after the discharge and dismissal.",
      "The clerk tells you a sealing order was entered and an agency is still showing the case.",
      "An agency the order did not name is showing the case.",
      "You have been asked to confirm in writing that a case has been sealed."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief track
// ---------------------------------------------------------------------------

type ComponentSpec = {
  componentId: string;
  templateId: string;
  requirement?: "required" | "conditional";
  conditionKey?: string;
};

function packetSet(trackId: string, components: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: components.map((component, index) => {
      if (!NEVADA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Nevada guidance template ${component.templateId} is registered.`
        );
      }
      return {
        componentId: component.componentId,
        role: "process_guidance" as const,
        outputStrategy: "process_guidance" as const,
        rendererStrategy: "process_guidance" as const,
        templateId: component.templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide" as const,
        requirement: component.requirement ?? ("required" as const),
        ...(component.conditionKey ? { conditionKey: component.conditionKey } : {}),
        order: index + 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      };
    })
  };
}

const NV_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label:
      "Is the record a Nevada record, or is it another state's, federal, tribal or military?",
    required: true
  },
  {
    key: "courtLevel",
    label:
      "Which court handled the case — a Nevada district court, a justice court, a municipal court, or can you not tell?",
    required: true
  },
  {
    key: "dismissalType",
    label:
      "Was the case dismissed because you completed a programme or an agreement with the court, dismissed outright, or was the deferral terminated and a conviction entered?",
    required: true
  },
  {
    key: "elderOrVulnerablePersonCharge",
    label:
      "Was the charge one of abuse, neglect, exploitation, isolation or abandonment of an older person or a vulnerable person?",
    required: true
  },
  {
    key: "divisionOrProsecutorObjected",
    label:
      "Has the Division of Parole and Probation or the prosecutor asked the court not to seal the records, or requested a hearing about it?",
    required: true
  },
  {
    key: "hasOffenceCategoryQuestion",
    label:
      "Do you have a question about which category the offence falls into, or about whether it counts as a crime of violence?",
    required: true
  },
  {
    key: "participantGoal",
    label:
      "What are you mainly trying to achieve — background checks and employment, housing or licensing, or firearm rights?",
    required: true
  },
  {
    key: "immigrationExposure",
    label: "Could your immigration status be affected by this record?",
    required: true
  },
  {
    key: "recordsInMoreThanOneCourtOrCounty",
    label:
      "Do you have Nevada cases in more than one county, or in a municipal or justice court as well as a district court?",
    required: true
  },
  {
    key: "recordStatus",
    label:
      "When you check your own record, does the case still show, has it gone, or have you not checked?",
    required: true
  },
  {
    key: "completionAndDismissalDates",
    label:
      "When did you finish the programme or agreement, and when was the case dismissed?",
    required: true
  },
  {
    key: "countyOfCase",
    label: "Which Nevada county handled the case?",
    required: true
  }
];

export const NEVADA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  (() => {
    const statuses = {
      research: "research_draft_complete",
      technical: "renderer_ready",
      visual: "not_reviewed",
      legal: "not_submitted"
    } as const;

    return {
      jurisdiction: "NV",
      trackId: "nv_seal_deferred",
      publicName: "Clearing a Nevada case that was dismissed after a deferred judgment",
      mechanism:
        "court_ordered_sealing_without_a_hearing_after_a_deferred_judgment_dismissal_with_routing_detection_and_verification",
      authority:
        "NRS 176.211, with NRS 179.245, 179.275, 179.285, 179.295 and 179.301",
      recordTypes: ["arrest", "charge", "conviction", "court_record"],
      dispositions: ["dismissed", "set_aside"],
      courtLevel: "district",
      geographicScope: "statewide",
      geographyKeys: [],
      outputStrategy: "process_guidance",
      packetSet: packetSet("nv_seal_deferred", [
        {
          componentId: "nv_seal_deferred-detection-and-routing-1",
          templateId: "nv-seal-deferred-detection-and-routing"
        },
        {
          componentId: "nv_seal_deferred-explanation-2",
          templateId: "nv-seal-deferred-explanation"
        },
        {
          componentId: "nv_seal_deferred-exclusion-screen-3",
          templateId: "nv-seal-deferred-exclusion-screen"
        },
        {
          componentId: "nv_seal_deferred-referral-instructions-4",
          templateId: "nv-seal-deferred-referral-instructions"
        }
      ]),
      requiredInputs: NV_INPUTS,
      statuses: {
        ...statuses,
        runtime: computeRuntimeStatus({
          statuses,
          sourceCurrent: true,
          runtimeDisabled: true,
          outputStrategy: "process_guidance"
        })
      },
      sourceCurrent: true,
      technicalFixture: true,
      runtimeDisabled: true,
      assembledPacketName: "nevada-deferred-judgment-sealing",
      assembledPacketTitle:
        "Nevada deferred-judgment sealing — the court acts, you check, and nothing is filed",
      customerDeliverableDescription:
        "Tells a Nevada participant whose case was dismissed after a deferred judgment that NRS 176.211 seals the record through the court rather than through anything they file. Leads with detection, because the value of the node is that a participant calls this an ordinary dismissal and NRS 179.245 expressly excepts NRS 176.211 from the ordinary sealing petition — so being routed to a petition means paying for the wrong instrument for a remedy the statute already gives. Sets out the mechanism in the section's own order: § 176.211(5) discharge and dismissal on the court's finding that the terms and conditions were met; § 176.211(6) the court shall order the records sealed, and without a hearing unless the Division of Parole and Probation or the prosecutor petitions for good cause not to seal and requests one; § 176.211(8) each named agency must report its compliance to the court, with NRS 179.275 carrying a copy to the Central Repository and each named custodian. Screens the § 176.211(7) exclusion, which withholds the sealing for an NRS 200.5099 charge while leaving the discharge and dismissal standing, the § 176.211(4) terminated-deferral case, and the § 176.211(9)(a) district-court limit. Holds Nevada's own vocabulary — record sealing, never expungement — and says what a sealed record is under NRS 179.285 alongside the reopening and inspection rules at NRS 179.295 and 179.301. States that sealing does not restore firearm rights and does not reach federal or out-of-state records. Ends where the participant actually gets stuck: a record still showing is a compliance question owned by the court, with the three questions to put to the clerk. Nothing is filed, nothing is generated, and no date is promised for any court.",
      notes:
        "Process guidance only, on the established grounds that no participant filing exists and another entity decides: NRS 176.211(6) puts the sealing on the district court's own motion and the section provides the defendant no vehicle at all. Never generate a petition, application, request or proposed order on this track — the ordinary NRS 179.245 petition is expressly unavailable for a case under this section, so offering one would be worse than doing nothing. Never state or predict what the Division of Parole and Probation or a prosecutor will do, never state that a court has sealed or will seal a record, and never give a date by which a court acts. Nevada's word is sealing and never expungement. The § 176.211(7) exclusion withholds only the sealing and leaves the discharge and dismissal intact, and must be stated that way. nv_seal_probation_family and nv_repository_removal left this lane for custom pleading and are not touched here; the six completed Nevada custom-pleading tracks and their module are untouched."
    };
  })()
];
