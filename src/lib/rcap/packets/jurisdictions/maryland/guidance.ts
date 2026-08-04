// Maryland process guidance — the five routes with no participant filing.
//
// Five assigned routes, all five implemented. What unites them is the thing
// that makes them dangerous to sell rather than explain:
//
//   None of these five routes has a participant filing. There is no petition,
//   no form, no fee and no counter to stand at.
//
// The accepted design states the failure mode for this family directly:
// selling a packet to someone whose case expunges itself in four months is
// what these sheets exist to prevent. So every artifact here says what the law
// does on its own, how to check that it happened, and where to go when it did
// not — and none of them generates a filing, because there is none to generate.
//
// Vocabulary. Maryland says EXPUNGEMENT for all five of these routes, and the
// statutory term is used. Expungement is not shielding: shielding removes a
// conviction from public view under a different statute, it is once in a
// lifetime, and it is a different track. Blurring the two is the recorded
// Maryland failure mode, so no sheet here calls one of these routes shielding.
//
// Two open release questions from the authoritative blocker ledger are honoured
// rather than papered over.
//
//   1. § 10-103.1 non-compliance. Where a law enforcement unit misses the
//      60-day deadline, the statutory remedy — as distinct from the § 10-103(f)
//      court-application path — is NOT clearly identified. So the automatic
//      police-record sheet does not invent a filing. It says the remedy is not
//      established and routes the participant to counsel.
//
//   2. § 10-112 and SB 315 (2026). The bill would extend § 10-112 to the MDEC
//      system and change "issued" to "disposed of". Whether it was enacted is
//      unconfirmed, so the cannabis sweep sheet states the current "issued
//      before 1 July 2023" test and flags that a pending change may move it,
//      rather than asserting either version as settled.
//
// One route is closed to everyone and says so. `md_10103_legacy_police` runs on
// a request made to the agency within 8 years of a pre-1 October 2007 incident.
// Eight years after the last possible qualifying incident expired long ago, so
// there is no participant this route can still be entered by. The sheet exists
// to say that plainly and to route the participant to the route that does fit —
// which is usually the post-2007 automatic route, because people misremember
// which side of 2007 an arrest falls on.
//
// Dates are parsed strictly or refused. The 1 October 2007 boundary decides
// routing between the two police-record routes, and a free-text date that might
// mean two things is worse than a question the participant is asked again.
//
// What these templates never do: turn guidance into a court filing, generate a
// petition for a route that has none, invent a remedy the design records as
// unresolved, quote a fee amount, or call an expungement route shielding.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Maryland
// is not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The boundary that separates the two police-record routes. */
export const MD_POLICE_RECORD_BOUNDARY = "2007-10-01";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not reach this participant and no other Maryland route is named. */
export class MarylandGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MarylandGuidanceStopError";
  }
}

/** The participant belongs on a different Maryland route, which is named. */
export class MarylandRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MarylandRouteMismatchError";
  }
}

/** An answer outside the approved list, or a date that cannot be read. */
export class MarylandBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "MarylandBranchError";
  }
}

export const MD_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * How every charge in the case ended, for the § 10-105.1 automatic route.
 *
 * The statute reaches a case where NO charge resulted in a disposition other
 * than acquittal, dismissal, not guilty or nolle prosequi. Probation before
 * judgment is a disposition other than those, so it defeats the route — and it
 * is the answer participants most often expect to qualify.
 */
export const MD_10105_1_DISPOSITIONS: Readonly<Record<string, string>> = {
  acquittal: "the case ended in an acquittal",
  dismissal: "the case was dismissed",
  not_guilty: "the finding was not guilty",
  nolle_prosequi: "the State entered a nolle prosequi",
  probation_before_judgment: "probation_before_judgment",
  conviction: "conviction",
  other_disposition: "other_disposition"
};

/** Dispositions that are outside the § 10-105.1 automatic route. */
const MD_10105_1_DEFEATING = new Set(["probation_before_judgment", "conviction", "other_disposition"]);

const COUNSEL = "a lawyer, or a Maryland legal aid or reentry clinic";
const CASE_SEARCH = "Maryland Judiciary Case Search";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new MarylandBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Reads a calendar date or refuses it.
 *
 * The 1 October 2007 boundary decides which police-record route a participant
 * is on, so a date is either unambiguous or it is not accepted. ISO strings
 * order correctly as strings, which is why the comparison needs no clock and no
 * timezone.
 */
function mdDate(trackId: string, key: string, raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new MarylandBranchError(trackId, key, value);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new MarylandBranchError(trackId, key, value);
  }
  return value;
}

/**
 * Validates participant answers, applies the Maryland stops, and routes to the
 * correct Maryland mechanism.
 */
export function deriveMarylandGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (trackId === "md_10105_1_automatic") {
    const disposition = branch(trackId, "disposition", MD_10105_1_DISPOSITIONS, facts.disposition);
    if (MD_10105_1_DEFEATING.has(disposition.value)) {
      throw new MarylandGuidanceStopError(
        trackId,
        "disposition_outside_automatic_expungement",
        "This route reaches a case only where no charge in it ended in anything other than an acquittal, a dismissal, a not guilty finding or a nolle prosequi. Probation before judgment is a disposition other than those, and so is a conviction, so neither is reached by the automatic route.",
        "the ordinary Maryland petition routes, and " + COUNSEL
      );
    }
    derived.dispositionAllegation = disposition.resolved;
    derived.dispositionDate = mdDate(trackId, "dispositionDate", facts.dispositionDate);

    if (branch(trackId, "treatmentRequirement", MD_YES_NO, facts.treatmentRequirement).resolved) {
      throw new MarylandGuidanceStopError(
        trackId,
        "nolle_prosequi_with_treatment_requirement",
        "A nolle prosequi entered with a drug or alcohol treatment requirement is expressly excluded from this automatic route. The exclusion is in the statute, and it is not something a guidance sheet can work around.",
        "the ordinary Maryland petition routes, and " + COUNSEL
      );
    }

    if (branch(trackId, "needsReliefSooner", MD_YES_NO, facts.needsReliefSooner).resolved) {
      throw new MarylandRouteMismatchError(
        trackId,
        "relief_needed_before_the_automatic_date",
        "The automatic date arrives on its own with nothing filed and nothing paid. Where that is too late to be useful, there is an early-filing route that asks the court to act sooner — but it is entered by giving up the right to sue over the arrest, which the automatic route never asks for.",
        "the early-filing waiver route, where the general waiver and release is the price of filing early"
      );
    }
  }

  if (trackId === "md_10112_dpscs_cannabis") {
    if (!branch(trackId, "cannabisOnlyCharge", MD_YES_NO, facts.cannabisOnlyCharge).resolved) {
      throw new MarylandRouteMismatchError(
        trackId,
        "cannabis_was_not_the_only_charge",
        "The one-time departmental clearing covered cases in which possession of cannabis was the only charge. Where the case carried another charge, the sweep did not reach it.",
        "the Maryland cannabis petition route"
      );
    }
    if (!branch(trackId, "chargeIssuedBefore2023", MD_YES_NO, facts.chargeIssuedBefore2023).resolved) {
      throw new MarylandGuidanceStopError(
        trackId,
        "charge_issued_outside_the_swept_window",
        "The clearing covered charges issued before 1 July 2023. A charge issued on or after that date was outside the sweep.",
        "the Maryland cannabis petition route, and " + COUNSEL
      );
    }
    if (!branch(trackId, "checkedCaseSearch", MD_YES_NO, facts.checkedCaseSearch).resolved) {
      throw new MarylandGuidanceStopError(
        trackId,
        "case_search_not_yet_checked",
        "Whether the sweep reached a particular case is a question the record answers and this sheet cannot. Checking comes first, because assuming the sweep covered a case that it did not is how someone stops pursuing a route that was still open to them.",
        CASE_SEARCH
      );
    }
    if (branch(trackId, "caseStillAppears", MD_YES_NO, facts.caseStillAppears).resolved) {
      throw new MarylandRouteMismatchError(
        trackId,
        "case_still_appears_after_the_sweep",
        "Where the case still appears, the sweep did not clear it. That is not a reason to wait longer: the petition route is the one that is still open.",
        "the Maryland cannabis petition route"
      );
    }
  }

  if (trackId === "md_10103_1_automatic") {
    const arrestDate = mdDate(trackId, "arrestDate", facts.arrestDate);
    derived.arrestDate = arrestDate;
    if (arrestDate < MD_POLICE_RECORD_BOUNDARY) {
      throw new MarylandRouteMismatchError(
        trackId,
        "arrest_predates_the_automatic_police_record_route",
        "The automatic 60-day expungement of police records applies to an arrest, detention or confinement occurring on or after 1 October 2007. An earlier incident is governed by the older request route.",
        "the pre-October 2007 police records route"
      );
    }
    if (!branch(trackId, "releasedWithoutCharge", MD_YES_NO, facts.releasedWithoutCharge).resolved) {
      throw new MarylandRouteMismatchError(
        trackId,
        "charges_were_filed",
        "This route is for a person who was arrested and released without being charged. Once a charge was filed there is a case, and a case is cleared through the routes that deal with dispositions rather than through this one.",
        "the Maryland routes that clear a charged case"
      );
    }
    if (branch(trackId, "recordsStillAppear", MD_YES_NO, facts.recordsStillAppear).resolved) {
      throw new MarylandGuidanceStopError(
        trackId,
        "agency_has_not_complied_and_the_remedy_is_unresolved",
        "The unit had 60 days and the records are still there. What the statute gives a person in that position — as distinct from the court-application path that belongs to the older route — is not clearly identified in the adopted authority, so this sheet does not invent a filing to make the problem look solved.",
        COUNSEL
      );
    }
  }

  if (trackId === "md_10103_legacy_police") {
    const incidentDate = mdDate(trackId, "incidentDate", facts.incidentDate);
    derived.incidentDate = incidentDate;
    if (incidentDate >= MD_POLICE_RECORD_BOUNDARY) {
      throw new MarylandRouteMismatchError(
        trackId,
        "incident_falls_under_the_automatic_police_record_route",
        "An arrest, detention or confinement on or after 1 October 2007 is covered by the automatic route, where the unit expunges police records within 60 days and nothing is requested. People misremember which side of 2007 an arrest falls on, which is why the date is asked for rather than assumed.",
        "the automatic post-October 2007 police records route"
      );
    }
    if (branch(trackId, "priorRequestMade", MD_YES_NO, facts.priorRequestMade).resolved) {
      throw new MarylandGuidanceStopError(
        trackId,
        "timely_request_already_made_and_the_matter_is_contested",
        "A request that was made in time, and answered by the agency with specific grounds, is a contested matter with its own short deadline to apply to the District Court. That is not something a guidance sheet can carry.",
        COUNSEL
      );
    }
  }

  if (trackId === "md_10104_pre_service") {
    if (branch(trackId, "wasServed", MD_YES_NO, facts.wasServed).resolved) {
      throw new MarylandRouteMismatchError(
        trackId,
        "participant_was_served",
        "This section reaches a District Court case with which the defendant was never served. Once the charging document was served, the case is cleared through the ordinary routes instead.",
        "the ordinary Maryland petition routes"
      );
    }
    if (!branch(trackId, "allChargesNolled", MD_YES_NO, facts.allChargesNolled).resolved) {
      throw new MarylandGuidanceStopError(
        trackId,
        "not_every_charge_was_dropped",
        "The section applies where the State enters a nolle prosequi as to all charges in the case. Where any charge survived, this route is not the one.",
        "the ordinary Maryland petition routes, and " + COUNSEL
      );
    }
    if (!branch(trackId, "districtCourtCase", MD_YES_NO, facts.districtCourtCase).resolved) {
      throw new MarylandRouteMismatchError(
        trackId,
        "case_was_not_in_the_district_court",
        "This section is a District Court of Maryland provision. A case in another court is cleared through the ordinary routes.",
        "the ordinary Maryland petition routes"
      );
    }
    if (branch(trackId, "recordStillAppears", MD_YES_NO, facts.recordStillAppears).resolved) {
      throw new MarylandRouteMismatchError(
        trackId,
        "record_still_appears",
        "The court may order expungement on this section, and where it did not, the ordinary petition routes remain available. Waiting longer does not make this route act.",
        "the ordinary Maryland petition routes"
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route, and nothing to pay. If anyone offers to sell you a petition for it, that is the sign to stop and check.";

const EXPUNGEMENT_NOT_SHIELDING =
  "Maryland says expungement for this route. Expungement is not shielding — shielding is a different, once-in-a-lifetime process that removes a conviction from public view, and the two are not interchangeable.";

const CHECK_CASE_SEARCH =
  `Check ${CASE_SEARCH} yourself. That is how you find out whether it happened, and it is the only step on this route that is actually yours.`;

const DISCLOSURE_LIMIT =
  "Expungement is not the same as the event never having happened. A person may still be required to disclose an expunged case in situations Maryland law does not govern, such as some federal questions.";

const MD_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge anything, and cannot make a court, a law enforcement unit or the Central Repository act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, inspect or hold your record. You check your own."
];

const MD_SOURCES: readonly string[] = [
  "Md. Code, Crim. Proc. § 10-103 and § 10-103.1 (police records).",
  "Md. Code, Crim. Proc. § 10-104 (nolle prosequi before service).",
  "Md. Code, Crim. Proc. § 10-105.1 and § 10-105.2 (automatic expungement and notice of the right).",
  "Md. Code, Crim. Proc. § 10-112 (one-time cannabis clearing).",
  "Md. Rules 4-503.3 and 4-503.4; Maryland Judiciary Case Search."
];

function mdGuidance(input: {
  templateId: string;
  mechanismName: string;
  processType: GuidanceTemplate["processType"];
  whyNotAFiling: string;
  destination: { name: string; detail: string };
  prerequisites: readonly string[];
  gather: readonly string[];
  documents: readonly string[];
  sequence: readonly string[];
  submissionMethod: string;
  fees: string;
  feeWaiver: string;
  noticeOrService: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  cannotPerform?: readonly string[];
  escalations: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: input.prerequisites,
    documentsToObtain: input.documents,
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: [EXPUNGEMENT_NOT_SHIELDING, NOTHING_TO_FILE, ...input.sequence],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? MD_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: MD_SOURCES
  };
}

export const MARYLAND_PROCESS_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "md-10105-1-automatic-guidance": mdGuidance({
    templateId: "md-10105-1-automatic-guidance",
    mechanismName: "Automatic clearing of a case that ended without a conviction",
    processType: "automatic",
    whyNotAFiling:
      "The record is expunged three years after disposition because the statute says so, not because anyone asked. There is no petition, no form and no fee on this route, so nothing is filed.",
    destination: {
      name: "The court and the Central Repository",
      detail:
        "The court sends notice of the disposition and the required expungement date to the Central Repository, to each booking facility, law enforcement unit and other State or local unit that may hold a record, and to the person entitled to expungement. Nothing is filed by the participant."
    },
    prerequisites: [
      "No charge in the case ended in anything other than an acquittal, a dismissal, a not guilty finding or a nolle prosequi.",
      "Where the case ended in a nolle prosequi, it did not carry a drug or alcohol treatment requirement.",
      "Three years have passed since disposition, or you are waiting for that date to arrive."
    ],
    documents: [
      `Your ${CASE_SEARCH} result for the case.`,
      "The court's disposition record, if the case search does not make the disposition clear."
    ],
    gather: [
      "How every charge in the case ended, not just the one you remember.",
      "The date the case was disposed of.",
      "Whether a nolle prosequi carried a drug or alcohol treatment requirement.",
      "Whether you need the record cleared sooner than the automatic date."
    ],
    sequence: [
      "Work out your date. The record is expunged three years after disposition, and the court is required to tell you that date at disposition. If you were told, that notice is the answer.",
      "Check that every charge qualifies, not just the main one. One charge in the case that ended in probation before judgment or a conviction takes the whole case out of this route.",
      CHECK_CASE_SEARCH,
      "If the date has passed and the case is still there, that is worth chasing — but it is a question for a lawyer or a clinic, not a form you can send.",
      DISCLOSURE_LIMIT
    ],
    submissionMethod: "There is nothing to submit. The expungement date arrives on its own.",
    fees: "No fee. This route needs no petition at all.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "The court is required to notify you of the right to expungement at disposition, and to give you a general waiver and release form if you want to file early instead."
    ],
    expectedNextStage: `The case no longer appears on ${CASE_SEARCH} after the expungement date.`,
    canPrepare: [
      "This explanation of when the date arrives and what it covers.",
      "The charge-by-charge check that decides whether the route reaches your case at all.",
      "The trade-off in filing early, before you agree to it."
    ],
    escalations: [
      "Any charge in the case ended in probation before judgment, a conviction, or anything other than the four qualifying dispositions.",
      "A nolle prosequi carried a drug or alcohol treatment requirement.",
      "The automatic date has passed and the record still appears.",
      "You need the record cleared sooner than the automatic date."
    ]
  }),

  "md-10112-dpscs-cannabis-guidance": mdGuidance({
    templateId: "md-10112-dpscs-cannabis-guidance",
    mechanismName: "Checking whether the one-time cannabis clearing already covered your case",
    processType: "agency",
    whyNotAFiling:
      "This was a one-time departmental sweep, already carried out against the Central Repository. There was never anything for a person to file, and there is nothing to file now — the only question left is whether it reached your case.",
    destination: {
      name: "Maryland Department of Public Safety and Correctional Services",
      detail:
        "The Department performed the sweep against the Central Repository. Nothing is filed by the participant."
    },
    prerequisites: [
      "Possession of cannabis was the only charge in the case.",
      "The charge was issued before 1 July 2023."
    ],
    documents: [
      `Your ${CASE_SEARCH} result for the case.`,
      "The charging document or case record, if you need to confirm what the only charge was."
    ],
    gather: [
      "Whether cannabis possession was the only charge in the case, or one of several.",
      "The date the charge was issued.",
      `Whether the case still appears on ${CASE_SEARCH}.`
    ],
    sequence: [
      "Check first, then conclude. The sweep was required to be completed, so treat it as done and find out whether it reached you — do not assume either way.",
      "Know what the clearing did. On this section, expungement means removal of all references to the case from the Central Repository, which is the State's central criminal record.",
      CHECK_CASE_SEARCH,
      "If the case is gone, that is the answer and there is nothing further to do on this route.",
      "If the case is still there, the sweep did not clear it. The cannabis petition route is the one that is still open, and waiting longer will not change the sweep.",
      "One caution on the test itself: the qualifying window turns on when the charge was ISSUED, and a pending Maryland bill would move that to when the case was DISPOSED OF and extend the section to the electronic case system. Whether that bill was enacted is unconfirmed here, so this sheet states the current test and flags that it may move rather than guessing.",
      DISCLOSURE_LIMIT
    ],
    submissionMethod: "There is nothing to submit. The sweep was carried out by the Department.",
    fees: "No fee.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage: `Either the case no longer appears on ${CASE_SEARCH}, or it does and the petition route is next.`,
    canPrepare: [
      "This explanation of what the sweep covered and how to check whether it reached you.",
      "The distinction between a case the sweep cleared and one that needs the petition route.",
      "A plain statement of which part of the test is unsettled."
    ],
    escalations: [
      "Cannabis possession was not the only charge in the case.",
      "The charge was issued on or after 1 July 2023.",
      `The case still appears on ${CASE_SEARCH}.`
    ]
  }),

  "md-10103-1-automatic-guidance": mdGuidance({
    templateId: "md-10103-1-automatic-guidance",
    mechanismName: "Automatic clearing of police records after you were released without being charged",
    processType: "agency",
    whyNotAFiling:
      "A person arrested and released without being charged is entitled to expungement of all police records within 60 days, and the unit must do it without being asked. There is no application on this route, so none is generated.",
    destination: {
      name: "The arresting law enforcement unit",
      detail: "The unit expunges all police records within 60 days. No application is made by the participant."
    },
    prerequisites: [
      "The arrest, detention or confinement happened on or after 1 October 2007.",
      "You were released without being charged."
    ],
    documents: [
      "Any paperwork you were given at release, which is often the only thing that fixes the date.",
      "Your own copy of a police record check, if you want to see what a unit still holds."
    ],
    gather: [
      "The date you were arrested, detained or confined.",
      "Which law enforcement unit made the arrest.",
      "Whether you were released without being charged.",
      "Whether police records from that arrest still appear."
    ],
    sequence: [
      "Fix the date first. On or after 1 October 2007 is this route. Earlier than that is the older request route, and people are often a year or two out on which side they fall.",
      "Know what is covered. All police records from that arrest, including photographs and fingerprints, not merely the arrest entry.",
      "Count 60 days from the arrest. That is the unit's deadline, and it runs without you asking.",
      "If the 60 days have passed and records are still there, stop rather than improvise. What the law gives you in that position is not clearly settled, so this sheet does not hand you a form that may not exist — take it to a lawyer or a clinic.",
      DISCLOSURE_LIMIT
    ],
    submissionMethod: "There is nothing to submit. The unit is required to act without an application.",
    fees: "No fee. There is no application on this route.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage: "The police records from that arrest, including photographs and fingerprints, are gone within 60 days.",
    canPrepare: [
      "This explanation of what the unit must do and by when.",
      "The 1 October 2007 boundary, which decides which of the two police-record routes you are on.",
      "An honest statement of where the law runs out, rather than a filing invented to fill the gap."
    ],
    escalations: [
      "The 60-day window has passed and records still appear. The remedy for that is not clearly established.",
      "The arrest happened before 1 October 2007.",
      "You were in fact charged, which puts you on a different route."
    ]
  }),

  "md-10103-legacy-police-guidance": mdGuidance({
    templateId: "md-10103-legacy-police-guidance",
    mechanismName: "Clearing police records from an arrest before October 2007",
    processType: "court_adjacent",
    whyNotAFiling:
      "This route ran on a written request to the law enforcement unit, made within 8 years of the incident, with an application to the District Court only if the unit refused. Both windows closed long ago for every incident this route covers, so there is no filing to generate — this page explains why, and where to go instead.",
    destination: {
      name: "The law enforcement unit holding the record, then the District Court on denial",
      detail:
        "Stage one was a written request to the unit; stage two was a District Court application on form DC-CR-071, which prints Maryland Rules Forms 4-503.3 and 4-503.4. Neither stage can now be entered, because the 8-year request window has closed."
    },
    prerequisites: [
      "The arrest, detention or confinement happened before 1 October 2007. If it did not, this is the wrong route and the automatic one is the right one.",
      "Nothing else, because the route cannot be entered. What follows explains why and what is left."
    ],
    documents: [
      "Anything that fixes the date of the incident, which is the one fact that decides which route you are on.",
      `Your ${CASE_SEARCH} result, if a court case came out of the incident.`
    ],
    gather: [
      "The date the arrest, detention or confinement happened.",
      "Which law enforcement unit made the arrest.",
      "Whether you already made a written request to that unit within 8 years of the incident.",
      "Whether police records from that arrest still appear."
    ],
    sequence: [
      "The window has closed. The request to the unit had to be made within 8 years of the incident, and this route only covers incidents before 1 October 2007 — so the last day to enter it passed years ago. That is the honest answer, and it is why nothing here asks you to send a request that would arrive out of time.",
      "Check the date before you accept that answer. If the incident was actually on or after 1 October 2007, you are on the automatic route instead, where the unit must clear police records within 60 days without being asked. This is the most common mistake on this route, so it is worth being certain.",
      "If a court case came out of the incident, the case has its own routes. Charges that were dropped or that ended without a conviction are cleared through the case, not through the police unit, and those routes do not run on the 8-year clock.",
      "One naming point, because it misleads people: DC-CR-071 is a Maryland District Court form. The DC stands for District Court, not the District of Columbia, and the form has nothing to do with Washington. The route was statewide in authority, and specific to the District Court and the arresting unit in venue.",
      "If you did make a timely request years ago and the unit answered with specific grounds, that is a contested matter with its own short deadline, and it belongs with a lawyer rather than on a guidance sheet.",
      DISCLOSURE_LIMIT
    ],
    submissionMethod:
      "Nothing is submitted. The request window closed, so LegalEase does not generate a request or a District Court application for this route.",
    fees: "No fee, because there is nothing to file.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "When the route was open, the agency had 30 days after service to answer a District Court application with specific grounds."
    ],
    expectedNextStage:
      "You know this route is closed, and you know which of the other Maryland routes to look at instead.",
    canPrepare: [
      "This explanation of why the route cannot be entered, instead of a request that would be refused as out of time.",
      "The date check that moves most people to the automatic route, which is open.",
      "The DC-CR-071 naming point, so a Maryland form is not mistaken for a District of Columbia one."
    ],
    cannotPerform: [
      ...MD_CANNOT_PERFORM,
      "LegalEase does not generate the written request to the unit or the District Court application on this route. The statutory window to make either has closed."
    ],
    escalations: [
      "The incident was on or after 1 October 2007, which is the automatic route.",
      "A timely request was made and the agency answered with specific grounds.",
      "A court case came out of the incident, which has its own routes."
    ]
  }),

  "md-10104-pre-service-guidance": mdGuidance({
    templateId: "md-10104-pre-service-guidance",
    mechanismName: "Clearing a case the State dropped before you were ever served",
    processType: "automatic",
    whyNotAFiling:
      "Where the State drops all charges in a District Court case before the defendant was served, the court may order expungement on its own. There is no petition from you, and the court may not assess any costs against you for a proceeding under this section.",
    destination: {
      name: "District Court of Maryland",
      detail:
        "The District Court may order expungement of each court record, police record and other State or local record as to the charges, unless the State objects and shows cause. Nothing is filed by the participant."
    },
    prerequisites: [
      "The case was in the District Court of Maryland.",
      "The State entered a nolle prosequi as to all of the charges.",
      "You were never served with the charging document."
    ],
    documents: [
      `Your ${CASE_SEARCH} result for the case.`,
      "The court record showing the nolle prosequi, if the case search does not make it clear."
    ],
    gather: [
      "Whether you were ever served with the charging document.",
      "Whether the State dropped all of the charges, or only some.",
      "Whether the case was in the District Court of Maryland.",
      `Whether the case still appears on ${CASE_SEARCH}.`
    ],
    sequence: [
      "Understand why this route exists. A case you were never served with is one you may not have known about, which is exactly why the law does not make you ask.",
      "Check that all charges were dropped. The section works on the whole case, so a surviving charge takes it out of this route.",
      "No costs may be assessed against you for a proceeding under this section. If you are asked to pay something for it, that is worth questioning.",
      CHECK_CASE_SEARCH,
      "If the record is still there, the ordinary petition routes remain available. The court may order expungement here; where it has not, that is not the end of the matter.",
      DISCLOSURE_LIMIT
    ],
    submissionMethod: "There is nothing to submit. The court may order expungement without a petition from you.",
    fees: "No fee. No costs may be assessed against you for a proceeding under this section.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "The State may object and show cause why the record should not be expunged."
    ],
    expectedNextStage: `The case no longer appears on ${CASE_SEARCH}.`,
    canPrepare: [
      "This explanation of a route that runs without you, and of what it covers.",
      "The no-costs rule, before someone asks you to pay.",
      "The fallback to the ordinary petition routes if the record is still there."
    ],
    escalations: [
      "You were served with the charging document.",
      "Only some of the charges were dropped.",
      "The State objects and shows cause.",
      "The record still appears, in which case the ordinary petition routes are next."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!MARYLAND_PROCESS_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Maryland guidance template ${templateId} is registered.`);
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId,
        role: "process_guidance",
        outputStrategy: "process_guidance",
        rendererStrategy: "process_guidance",
        templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      }
    ]
  };
}

function marylandTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  componentId: string;
  templateId: string;
  requiredInputs: readonly RequiredInput[];
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
    jurisdiction: "MD",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: input.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.componentId, input.templateId),
    requiredInputs: input.requiredInputs,
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
    assembledPacketName: input.assembledPacketName,
    assembledPacketTitle: input.assembledPacketTitle,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

export const MARYLAND_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  marylandTrack({
    trackId: "md_10105_1_automatic",
    publicName: "Automatic clearing of a case that ended without a conviction",
    mechanism: "automatic_expungement_three_years_after_qualifying_disposition",
    authority: "Md. Code, Crim. Proc. § 10-105.1; § 10-105.2",
    recordTypes: ["police_record", "court_record"],
    dispositions: ["acquittal", "dismissal", "not_guilty", "nolle_prosequi_without_treatment_requirement"],
    courtLevel: "not_a_court_process",
    componentId: "md_10105_1_automatic-process-guidance-1",
    templateId: "md-10105-1-automatic-guidance",
    requiredInputs: [
      { key: "disposition", label: "How did every charge in the case end?", required: true },
      { key: "dispositionDate", label: "On what date was the case disposed (YYYY-MM-DD)?", required: true },
      {
        key: "treatmentRequirement",
        label: "Did a nolle prosequi carry a drug or alcohol treatment requirement?",
        required: true
      },
      {
        key: "needsReliefSooner",
        label: "Do you need the record cleared sooner than the automatic date?",
        required: true
      }
    ],
    assembledPacketName: "Automatic-Expungement-Verification",
    assembledPacketTitle: "Automatic clearing of a case that ended without a conviction",
    customerDeliverableDescription:
      "A guidance sheet explaining that the record is expunged three years after a qualifying disposition with nothing to file and nothing to pay, that one non-qualifying charge takes the whole case out of the route, how to verify on Case Search, and what filing early would cost.",
    notes:
      "The design records the failure mode for this track as selling a packet to someone whose case expunges itself, so the sheet says plainly that nothing is filed and nothing is paid. Probation before judgment is the disposition participants most often expect to qualify and it defeats the route, so it is a typed stop. A participant who needs relief sooner is routed to the early-filing waiver route with the tort-claim trade-off stated rather than assumed."
  }),

  marylandTrack({
    trackId: "md_10112_dpscs_cannabis",
    publicName: "Checking whether the one-time cannabis clearing already covered your case",
    mechanism: "departmental_one_time_cannabis_expungement_sweep",
    authority: "Md. Code, Crim. Proc. § 10-112",
    recordTypes: ["central_repository_record"],
    dispositions: ["cannabis_possession_only_charge_issued_before_2023_07_01"],
    courtLevel: "not_a_court_process",
    componentId: "md_10112_dpscs_cannabis-process-guidance-1",
    templateId: "md-10112-dpscs-cannabis-guidance",
    requiredInputs: [
      {
        key: "cannabisOnlyCharge",
        label: "Was cannabis possession the only charge in the case?",
        required: true
      },
      { key: "chargeIssuedBefore2023", label: "Was the charge issued before 1 July 2023?", required: true },
      {
        key: "checkedCaseSearch",
        label: "Have you checked Maryland Judiciary Case Search to see whether the case still appears?",
        required: true
      },
      { key: "caseStillAppears", label: "Does the case still appear on Case Search?", required: true }
    ],
    assembledPacketName: "Cannabis-Clearing-Verification",
    assembledPacketTitle: "Checking whether the one-time cannabis clearing already covered your case",
    customerDeliverableDescription:
      "A guidance sheet explaining what the one-time departmental cannabis clearing covered, how to check on Case Search whether it reached a particular case, and that a case which still appears goes to the cannabis petition route rather than waiting.",
    notes:
      "The deadline for the sweep has passed, so the design treats it as executed and verifies per participant. Checking Case Search before concluding is a typed stop, because assuming the sweep covered a case it did not is how someone abandons a route still open to them. Whether SB 315 (2026) was enacted is an open release question — it would extend the section to the electronic case system and change the test from when the charge was issued to when the case was disposed of — so the sheet states the current test and flags the possible move instead of asserting either."
  }),

  marylandTrack({
    trackId: "md_10103_1_automatic",
    publicName: "Automatic clearing of police records after you were released without being charged",
    mechanism: "automatic_police_record_expungement_within_sixty_days",
    authority: "Md. Code, Crim. Proc. § 10-103.1",
    recordTypes: ["police_record", "photographs", "fingerprints"],
    dispositions: ["arrested_and_released_without_charge"],
    courtLevel: "not_a_court_process",
    componentId: "md_10103_1_automatic-process-guidance-1",
    templateId: "md-10103-1-automatic-guidance",
    requiredInputs: [
      {
        key: "arrestDate",
        label: "On what date were you arrested, detained or confined (YYYY-MM-DD)?",
        required: true
      },
      { key: "releasedWithoutCharge", label: "Were you released without being charged?", required: true },
      { key: "recordsStillAppear", label: "Do police records from that arrest still appear?", required: true }
    ],
    assembledPacketName: "Police-Records-Automatic-Expungement",
    assembledPacketTitle: "Automatic clearing of police records after you were released without being charged",
    customerDeliverableDescription:
      "A guidance sheet explaining that a law enforcement unit must expunge all police records — including photographs and fingerprints — within 60 days of an arrest that ended in release without charge, with no application, and what the participant can and cannot do if the deadline passes.",
    notes:
      "The remedy where a unit fails to comply with § 10-103.1, as distinct from the § 10-103(f) court-application path, is an open release question in the authoritative blocker ledger. The design instruction is not to invent a filing, so records still appearing after 60 days is a typed stop to counsel rather than a generated document. An arrest before 1 October 2007 is routed to the legacy police-record route."
  }),

  marylandTrack({
    trackId: "md_10103_legacy_police",
    publicName: "Clearing police records from an arrest before October 2007",
    mechanism: "pre_2007_agency_request_then_district_court_application",
    authority: "Md. Code, Crim. Proc. § 10-103; Md. Rules 4-503.3 and 4-503.4",
    recordTypes: ["police_record"],
    dispositions: ["pre_2007_arrest_detention_or_confinement"],
    courtLevel: "district_court",
    componentId: "md_10103_legacy_police-process-guidance-1",
    templateId: "md-10103-legacy-police-guidance",
    requiredInputs: [
      {
        key: "incidentDate",
        label: "On what date did the arrest, detention or confinement happen (YYYY-MM-DD)?",
        required: true
      },
      { key: "lawEnforcementUnit", label: "Which law enforcement unit made the arrest?", required: true },
      {
        key: "priorRequestMade",
        label: "Did you already make a written request to that unit within 8 years of the incident?",
        required: true
      },
      { key: "recordsStillAppear", label: "Do police records from that arrest still appear?", required: true }
    ],
    assembledPacketName: "Pre-2007-Police-Records-Route-Explainer",
    assembledPacketTitle: "Clearing police records from an arrest before October 2007",
    customerDeliverableDescription:
      "A guidance sheet explaining that the pre-October 2007 police-record request route can no longer be entered because its 8-year window has closed, why the date should be double-checked because most participants belong on the automatic route instead, and that DC-CR-071 is a Maryland District Court form rather than a District of Columbia one.",
    notes:
      "Neither stage is enterable: the statutory 8-year request window has closed for every incident this route covers, so no request or District Court application is generated. The adopted memorandum's identification is preserved — DC-CR-071 is the Maryland District Court form for the denial-stage application printing Rules Forms 4-503.3 and 4-503.4, and DC denotes the Maryland District Court rather than a District of Columbia geographic limitation. An incident on or after 1 October 2007 is routed to the automatic route; a timely request answered with specific grounds is a contested matter and a typed stop."
  }),

  marylandTrack({
    trackId: "md_10104_pre_service",
    publicName: "Clearing a case the State dropped before you were ever served",
    mechanism: "district_court_expungement_on_nolle_prosequi_before_service",
    authority: "Md. Code, Crim. Proc. § 10-104",
    recordTypes: ["court_record", "police_record", "state_or_local_record"],
    dispositions: ["nolle_prosequi_all_charges_before_service"],
    courtLevel: "district_court",
    componentId: "md_10104_pre_service-process-guidance-1",
    templateId: "md-10104-pre-service-guidance",
    requiredInputs: [
      { key: "wasServed", label: "Were you ever served with the charging document?", required: true },
      { key: "allChargesNolled", label: "Did the State drop all of the charges?", required: true },
      { key: "districtCourtCase", label: "Was the case in the District Court of Maryland?", required: true },
      {
        key: "recordStillAppears",
        label: "Does the case still appear on Maryland Judiciary Case Search?",
        required: true
      }
    ],
    assembledPacketName: "Pre-Service-Nolle-Prosequi-Expungement",
    assembledPacketTitle: "Clearing a case the State dropped before you were ever served",
    customerDeliverableDescription:
      "A guidance sheet explaining that the District Court may order expungement where the State dropped all charges in a case the defendant was never served with, that no costs may be assessed for the proceeding, and that the ordinary petition routes remain available if the record still appears.",
    notes:
      "The design instruction is to tell the participant that no costs may be assessed against them under this section and that a person may still be required to disclose expunged cases in situations Maryland law does not govern; both are stated on the sheet. Service, a surviving charge and a case outside the District Court each route away from this track rather than generating anything."
  })
];
