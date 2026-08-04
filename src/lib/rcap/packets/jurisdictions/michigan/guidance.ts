// Michigan process guidance — court-adjacent and automatic routes.
//
// Seven Michigan routes were assigned. Six produce a guidance artifact. The
// seventh, `mi_setaside_csc4_pre2015`, is registered as an explicit typed stop:
// the adopted design records it as "not offered as a packet, the participant is
// routed to counsel", and routing to counsel in every case is the whole of that
// route.
//
// None of the six is a court filing, and the difference matters more here than
// on a pleading route. Five of the six describe relief that happens *without
// the participant doing anything*: Clean Slate sets convictions aside by
// operation of law, and biometric data and arrest cards are destroyed by the
// agency holding them. There is no application, no form and no fee. The one
// thing a participant can get badly wrong is believing they must file
// something, so every artifact says on its face that there is nothing to file
// and what to do instead when the record does not clear on its own.
//
// Vocabulary. Michigan says SET ASIDE. It does not say expunge, and the word
// appears nowhere in this module — not in the templates, not in the source
// references, not in a page title quoted from an agency. That is a counsel
// instruction repeated on every one of the seven specifications, and it is the
// opposite of the District of Columbia, where § 16-803 genuinely expunges.
//
// What these templates never do:
//
//   - turn guidance into a court filing. There is no petition, no proposed
//     order, no signature block and no service list on any of them;
//   - give legal advice. They state what the statute does, what the participant
//     can check, and where the route ends. They do not tell a participant
//     whether they qualify;
//   - promise that a conviction has been or will be set aside. The participant
//     checks their own record; the artifact says how;
//   - invent a mechanism for compelling automatic relief. Where an eligible
//     conviction has not been set aside, the route ends and the participant is
//     sent to the application-based set-aside track. No participant-facing
//     mechanism for forcing the automatic route has been identified, and none
//     is fabricated here;
//   - lead a 92-day misdemeanour population to the MSP check. Where such a
//     record was never fingerprinted to MSP, a criminal-history check proves
//     nothing, and the design records a blanket MSP-first instruction as wrong
//     for that population.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Michigan
// is not an enabled jurisdiction and this job does not enable one. Michigan's
// official-form set-aside routes — the SCAO MC 227 family — are a separate,
// blocked job and are untouched here.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

/** No component here is visually or legally approved. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/** Where every Michigan stop condition sends the participant. */
const MI_RECORD_CHECK =
  "your own Michigan criminal history record, from the Michigan State Police — or, where a 92-day-or-less misdemeanour was never fingerprinted to the State Police, from the convicting court instead";

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised for an assigned Michigan route that produces no participant artifact.
 *
 * A typed error rather than a missing registry entry, so a caller cannot read a
 * deliberate route-to-counsel as an unknown track and quietly produce nothing.
 */
export class MichiganRouteUnavailableError extends Error {
  constructor(
    readonly trackId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MichiganRouteUnavailableError";
  }
}

/**
 * Raised when a participant's answer puts them on a different Michigan route.
 *
 * These are not failures. Michigan's automatic relief is split by conviction
 * class and by where the record lives, and answering honestly can move a
 * participant from one route to a better one. The error carries the destination
 * so the caller can send them there rather than reporting a dead end.
 */
export class MichiganRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MichiganRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class MichiganBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "MichiganBranchError";
  }
}

/**
 * `mi_setaside_csc4_pre2015` produces no packet, by design.
 *
 * The adopted design records the destination as "not offered as a packet, the
 * participant is routed to counsel", and every one of its stop conditions is a
 * legal judgment: whether the bespoke prior-record test is met, whether the
 * age-at-offence element is satisfied, and what continuing SORA obligations
 * mean. Producing a guidance artifact that walked a participant through those
 * questions would be giving legal advice, which this lane may not do.
 */
export const MI_ROUTED_TO_COUNSEL = Object.freeze({
  trackId: "mi_setaside_csc4_pre2015",
  reason:
    "mi_setaside_csc4_pre2015 is not offered as a packet. The adopted design routes the participant to counsel in every case: whether the bespoke prior-record test is met, including the age-at-offence element, is a legal judgment, and SORA registration and reporting obligations continue regardless of the outcome of a set-aside.",
  routeTo: "counsel",
  unblockedBy:
    "A legal-design decision that this route may be offered as self-help, together with a drafted guidance specification for it."
});

export const MICHIGAN_ROUTED_TO_COUNSEL_TRACK_IDS: readonly string[] = [MI_ROUTED_TO_COUNSEL.trackId];

/** Fails closed for an assigned route that produces no artifact. */
export function assertMichiganTrackImplemented(trackId: string): void {
  if (trackId === MI_ROUTED_TO_COUNSEL.trackId) {
    throw new MichiganRouteUnavailableError(
      MI_ROUTED_TO_COUNSEL.trackId,
      MI_ROUTED_TO_COUNSEL.reason,
      MI_ROUTED_TO_COUNSEL.routeTo
    );
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** Michigan's automatic relief is split three ways by conviction class. */
export const MI_CONVICTION_TYPES: Readonly<Record<string, string>> = {
  felony: "mi_auto_felony",
  misdemeanor_93_or_more: "mi_auto_misd93",
  misdemeanor_92_or_less: "mi_auto_misd92"
};

export const MI_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** MCL 28.243 destruction turns on how the case ended. */
export const MI_DISPOSITION_TYPES: Readonly<Record<string, string>> = {
  acquittal: "the case ended in an acquittal",
  dismissal: "the case ended in a dismissal"
};

/**
 * Which deferral statute applied, which changes the eligibility counting.
 *
 * `unsure` is an approved answer and a hard stop: the design records that being
 * uncertain which statute applied changes the counting, so guessing would
 * produce counting guidance that is wrong in a way the participant cannot see.
 */
export const MI_DEFERRAL_STATUTES: Readonly<Record<string, string>> = {
  section_7411: "MCL 333.7411",
  hyta: "the Holmes Youthful Trainee Act, MCL 762.11 to 762.15",
  section_769_4a: "MCL 769.4a",
  drug_court: "a drug treatment court disposition",
  dwi_court: "a DWI court disposition",
  liquor_control: "MCL 436.1703",
  unsure: "unsure"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new MichiganBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

function routeTo(trackId: string, stopId: string, reason: string, destination: string): never {
  throw new MichiganRouteMismatchError(trackId, stopId, reason, destination);
}

const AUTOMATIC_TRACKS = new Set(["mi_auto_felony", "mi_auto_misd93", "mi_auto_misd92"]);

/**
 * Validates participant answers and routes to the correct Michigan mechanism.
 *
 * Fails closed on an answer outside a closed list, and raises a typed route
 * mismatch where an honest answer puts the participant on a different Michigan
 * route. Nothing here decides eligibility: it decides which route's guidance a
 * participant should be reading.
 */
export function deriveMichiganFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  assertMichiganTrackImplemented(trackId);
  const derived: Record<string, unknown> = { ...facts };

  if (AUTOMATIC_TRACKS.has(trackId)) {
    const type = branch(trackId, "convictionType", MI_CONVICTION_TYPES, facts.convictionType);
    if (type.resolved !== trackId) {
      routeTo(
        trackId,
        "conviction_class_belongs_to_another_route",
        `Michigan splits automatic set-aside by conviction class, and this conviction belongs to a different route.`,
        type.resolved
      );
    }

    // An excluded offence is never set aside by operation of law. Reading this
    // route's guidance would tell the participant to wait for something that is
    // not coming.
    const excluded = branch(trackId, "excludedCategory", MI_YES_NO, facts.excludedCategory);
    if (excluded.resolved) {
      routeTo(
        trackId,
        "offence_category_excluded_from_automatic_relief",
        "An assaultive offence, a serious misdemeanour, a crime of dishonesty, an offence punishable by ten or more years, one involving a minor, a vulnerable adult, injury, serious impairment or death, human trafficking, or a traffic offence is not set aside by operation of law.",
        "the application-based set-aside route"
      );
    }

    branch(trackId, "convictionsSince", MI_YES_NO, facts.convictionsSince);
    branch(trackId, "pendingCharges", MI_YES_NO, facts.pendingCharges);
    branch(trackId, "restitutionOutstanding", MI_YES_NO, facts.restitutionOutstanding);
    branch(trackId, "checkedRecord", MI_YES_NO, facts.checkedRecord);
  }

  if (trackId === "mi_arrest_no_charge") {
    branch(trackId, "wasFingerprinted", MI_YES_NO, facts.wasFingerprinted);
    const released = branch(trackId, "releasedWithoutCharge", MI_YES_NO, facts.releasedWithoutCharge);
    if (!released.resolved) {
      routeTo(
        trackId,
        "a_charge_was_filed",
        "A charge was in fact filed, so destruction is governed by the acquittal-or-dismissal rule rather than by the released-without-charge rule.",
        "mi_arrest_acquittal_dismissal"
      );
    }
    branch(trackId, "dataStillAppears", MI_YES_NO, facts.dataStillAppears);
  }

  if (trackId === "mi_arrest_acquittal_dismissal") {
    const disposition = branch(trackId, "dispositionType", MI_DISPOSITION_TYPES, facts.dispositionType);
    derived.dispositionAllegation = disposition.resolved;

    // MCL 28.243(14): a prior conviction other than a misdemeanour traffic
    // offence defeats automatic destruction outright.
    const prior = branch(trackId, "priorNonTrafficConviction", MI_YES_NO, facts.priorNonTrafficConviction);
    if (prior.resolved) {
      routeTo(
        trackId,
        "prior_non_traffic_conviction_defeats_destruction",
        "A prior conviction other than a misdemeanour traffic offence defeats automatic destruction under MCL 28.243(14).",
        "counsel"
      );
    }
    branch(trackId, "arraignedEnumeratedOffence", MI_YES_NO, facts.arraignedEnumeratedOffence);
    branch(trackId, "dataStillAppears", MI_YES_NO, facts.dataStillAppears);
  }

  if (trackId === "mi_deferral_status") {
    const statute = branch(trackId, "deferralStatute", MI_DEFERRAL_STATUTES, facts.deferralStatute);
    if (statute.value === "unsure") {
      routeTo(
        trackId,
        "deferral_statute_unknown",
        "Which deferral statute applied changes the eligibility counting, so guidance cannot be produced while it is unknown.",
        "counsel, or the convicting court for a copy of the disposition"
      );
    }
    derived.deferralStatuteName = statute.resolved;
    branch(trackId, "deferralCompleted", MI_YES_NO, facts.deferralCompleted);
    branch(trackId, "arrestRecordExists", MI_YES_NO, facts.arrestRecordExists);
    branch(trackId, "seekingSetAsideElsewhere", MI_YES_NO, facts.seekingSetAsideElsewhere);
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared guidance blocks
// ---------------------------------------------------------------------------

/**
 * Every Michigan source reference this module cites.
 *
 * Deliberately worded. The Michigan State Police publish a record-correction
 * resource whose own page title contains the word this module may not use, so
 * it is cited by function rather than by title.
 */
const MI_SOURCES: readonly string[] = [
  "MCL 780.621 to 780.623 and MCL 780.621b to 780.621h, the Michigan set-aside act.",
  "MCL 28.243, destruction of biometric data and arrest cards.",
  "Michigan State Police, criminal history record check and record-correction resource.",
  "Michigan courts, SCAO set-aside form family MC 227, MC 227a, MC 227b, MC 228 and MC 262."
];

const MI_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot set a conviction aside, and cannot make the State Police or a court act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, inspect or hold your criminal history record. You get your own copy."
];

const SET_ASIDE_VOCABULARY_NOTE =
  "Michigan law says a conviction is SET ASIDE. Court staff, the State Police and the forms all use that phrase, so use it when you ask about your record.";

const REVERSIBILITY_NOTE =
  "A set-aside under this route can be undone. Under MCL 780.621h the court must reinstate the conviction on its own motion if it was not eligible, and must reinstate it on the motion of a person owed restitution, or on its own motion, where you have not made a good-faith effort to pay restitution the court ordered.";

const NOT_SET_ASIDE_YET_NOTE =
  "If your record still shows a conviction you believe should have cleared on its own, this route ends here. There is no application to make the automatic route happen, and LegalEase will not invent one. The next step is the application-based set-aside route, which is a different process with its own form.";

function automaticGuidance(input: {
  templateId: string;
  mechanismName: string;
  processType: GuidanceTemplate["processType"];
  destination: { name: string; detail: string };
  capNote: string;
  recordCheckSequence: readonly string[];
  extraPrerequisites?: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling:
      "This relief happens by operation of law. There is no application, no form, no fee and no court hearing, so there is nothing to file and no petition is generated. This page explains what the law does on its own and how to check whether it has happened.",
    processType: input.processType,
    prerequisites: [
      "The conviction is a Michigan conviction.",
      "The waiting period for this conviction class has run from the date sentence was imposed, or from completion of any term of imprisonment where that is later.",
      "The offence is not in a category the statute excludes from automatic relief.",
      ...(input.extraPrerequisites ?? [])
    ],
    documentsToObtain: [`A copy of ${MI_RECORD_CHECK}.`],
    participantDataToGather: [
      "The conviction class: felony, misdemeanour punishable by 93 days or more, or misdemeanour punishable by 92 days or less.",
      "The date sentence was imposed, and the date you completed any term of imprisonment.",
      "Any conviction entered since, and any charge now pending.",
      "Whether any court-ordered restitution is still unpaid."
    ],
    officialDestination: input.destination,
    actionSequence: [
      ...input.recordCheckSequence,
      "Read the entry for this conviction. A conviction that has been set aside is no longer shown as a public conviction.",
      "If it has been set aside, you are done. There is nothing to file and nothing to pay.",
      NOT_SET_ASIDE_YET_NOTE
    ],
    submissionMethod: "There is nothing to submit. No application exists for this route.",
    fees: "None. There is no fee, because there is no application.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "You are not told when a conviction is set aside automatically. Checking your own record is how you find out."
    ],
    expectedNextStage:
      "Your record shows the conviction as set aside. If it does not, the application-based set-aside route is the next thing to look at.",
    legalEaseCanPrepare: [
      "This explanation of what the automatic route does and what it does not reach.",
      "A plain list of what to check on your own record, and where to get it.",
      "The limits and the reversibility rule, so nothing on your record surprises you later."
    ],
    legalEaseCannotPerform: MI_CANNOT_PERFORM,
    escalationTriggers: [
      "An eligible conviction has not been set aside. Route to the application-based set-aside route.",
      "The court reinstates a conviction under MCL 780.621h.",
      "Court-ordered restitution is unpaid, which is a ground for reinstatement.",
      input.capNote
    ],
    officialSourceReferences: MI_SOURCES
  };
}

export const MICHIGAN_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // =========================================================================
  // mi_auto_felony — MCL 780.621g(2), (5), (10)
  // =========================================================================
  "mi-auto-felony-guidance": automaticGuidance({
    templateId: "mi-auto-felony-guidance",
    mechanismName: "Felony convictions that are set aside automatically",
    processType: "automatic",
    destination: {
      name: "By operation of law",
      detail:
        "No application and no court order. Nobody applies and nobody signs anything. MCL 780.621g(5) sets a combined lifetime limit of not more than two felonies and four qualifying misdemeanours."
    },
    capNote:
      "The lifetime limit is reached. MCL 780.621g(5) allows not more than two felonies and four qualifying misdemeanours in total.",
    recordCheckSequence: [
      `Get a copy of ${MI_RECORD_CHECK}.`,
      "Ten years must have passed from the date sentence was imposed, or from completion of any term of imprisonment, whichever is later."
    ],
    extraPrerequisites: [
      "Not more than two felonies are set aside automatically in a lifetime, within the combined limit of two felonies and four qualifying misdemeanours."
    ]
  }),

  // =========================================================================
  // mi_auto_misd93 — MCL 780.621g(4), (5), (10)
  // =========================================================================
  "mi-auto-misd93-guidance": automaticGuidance({
    templateId: "mi-auto-misd93-guidance",
    mechanismName: "Misdemeanours punishable by 93 days or more that are set aside automatically",
    processType: "agency",
    destination: {
      name: "Michigan State Police",
      detail: "The State Police perform the set-aside. No application and no court order."
    },
    capNote:
      "The limit is reached. Not more than four such misdemeanours are set aside automatically, within the combined lifetime limit of two felonies and four misdemeanours under MCL 780.621g(5).",
    recordCheckSequence: [
      `Get a copy of ${MI_RECORD_CHECK}.`,
      "Seven years must have passed from the date sentence was imposed."
    ],
    extraPrerequisites: [
      "Not more than four such misdemeanours are set aside automatically, within the combined lifetime limit under MCL 780.621g(5)."
    ]
  }),

  // =========================================================================
  // mi_auto_misd92 — MCL 780.621g(1), (3), (5)
  // =========================================================================
  "mi-auto-misd92-guidance": automaticGuidance({
    templateId: "mi-auto-misd92-guidance",
    mechanismName: "Misdemeanours punishable by 92 days or less that are set aside automatically",
    processType: "automatic",
    destination: {
      name: "The Michigan State Police, or the convicting court where the record was never sent to the State Police",
      detail:
        "Which office holds your record decides who you ask. No application and no court order either way."
    },
    capNote:
      "This route has no numerical limit, unlike the felony and 93-day misdemeanour routes. If you have been told there is a cap on it, that is wrong.",
    recordCheckSequence: [
      "Work out first where your record lives. A misdemeanour punishable by 92 days or less is often never fingerprinted to the Michigan State Police.",
      "If it was fingerprinted, get a copy of your Michigan State Police criminal history record.",
      "If it was never fingerprinted, a State Police check proves nothing about it — the record is not there to find. Ask the convicting court for its own record of the case instead.",
      "Seven years must have passed from the date sentence was imposed."
    ],
    extraPrerequisites: [
      "There is no limit on how many misdemeanours punishable by 92 days or less are set aside automatically."
    ]
  }),

  // =========================================================================
  // mi_arrest_no_charge — MCL 28.243
  // =========================================================================
  "mi-arrest-no-charge-guidance": {
    templateId: "mi-arrest-no-charge-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Destroying fingerprints and an arrest card when you were never charged",
    whyNotAFiling:
      "Destruction is carried out by the official holding your biometric data and arrest card, and it is not requested by a petition. There is no application form for it, so nothing is filed and no petition is generated.",
    processType: "agency",
    prerequisites: [
      "You were fingerprinted at the arrest.",
      "You were released without any charge being filed."
    ],
    documentsToObtain: [`A copy of ${MI_RECORD_CHECK}.`],
    participantDataToGather: [
      "Which agency arrested you.",
      "The date of the arrest.",
      "Whether the arrest still appears on your criminal history record."
    ],
    officialDestination: {
      name: "The official holding the biometric data and the arrest card",
      detail:
        "The holding official destroys them, and gives written notice to the Michigan State Police where the data had already been forwarded. There is no application."
    },
    actionSequence: [
      `Get a copy of ${MI_RECORD_CHECK}.`,
      "Look for the arrest. This route reaches the fingerprints and the arrest card only — it does not reach a conviction record, because there was no charge and so no conviction.",
      "If the arrest is gone, you are done.",
      "If it still appears, raise it with the agency that arrested you, because that agency holds the record. There is no participant application form for this and LegalEase will not invent one.",
      "If the arresting agency had already forwarded the data to the Michigan State Police, ask the agency to confirm it gave the State Police written notice."
    ],
    submissionMethod: "There is nothing to submit. No application exists for this route.",
    fees: "None.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Notice to the Michigan State Police, where it is needed, is given by the agency holding the record, not by you."
    ],
    expectedNextStage:
      "The fingerprints and the arrest card are destroyed and the arrest no longer appears on your record.",
    legalEaseCanPrepare: [
      "This explanation of what the destruction rule reaches and what it does not.",
      "A plain list of what to check and which agency to ask."
    ],
    legalEaseCannotPerform: MI_CANNOT_PERFORM,
    escalationTriggers: [
      "The biometric data or the arrest card still appears after you were released without charge. Raise it with the holding agency.",
      "A charge was in fact filed. A different rule applies, and the acquittal-or-dismissal route is the one to read."
    ],
    officialSourceReferences: MI_SOURCES
  },

  // =========================================================================
  // mi_arrest_acquittal_dismissal — MCL 28.243(8)-(10), (14), MCL 769.16a
  // =========================================================================
  "mi-arrest-acquittal-dismissal-guidance": {
    templateId: "mi-arrest-acquittal-dismissal-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName:
      "Destroying fingerprints and an arrest card after an acquittal or a dismissal",
    whyNotAFiling:
      "Destruction follows a court order that the court enters in your case, and the clerk tells the Michigan State Police the outcome. You do not petition for it. Form MC 262 is the court's order, not a participant filing, so nothing is generated for you to file.",
    processType: "court_adjacent",
    prerequisites: [
      "The case ended in an acquittal or a dismissal.",
      "You have no prior conviction other than a misdemeanour traffic offence. Under MCL 28.243(14) a prior conviction other than a misdemeanour traffic offence defeats automatic destruction."
    ],
    documentsToObtain: [
      "The court's order of acquittal or dismissal, from the clerk of the court that entered it. Form MC 262 carries the destruction notice on its face, which is how you confirm whether destruction was triggered.",
      `A copy of ${MI_RECORD_CHECK}.`
    ],
    participantDataToGather: [
      "Whether the case ended in an acquittal or a dismissal, and the date the order was entered.",
      "Whether you have any prior conviction other than a misdemeanour traffic offence.",
      "Whether you were arraigned for an offence involving a child under 16, or another offence the statute lists.",
      "Whether the fingerprints or the arrest still appear on your criminal history record."
    ],
    officialDestination: {
      name: "The court entering the order, then the Michigan State Police",
      detail:
        "The clerk advises the State Police Criminal Justice Information Center of the disposition. The State Police act on receipt of an appropriate district or circuit court order."
    },
    actionSequence: [
      "Ask the clerk of the court that ended your case for a copy of the disposition order.",
      "Read the order. Where it is on form MC 262, the destruction notice appears on the face of it, and that is how you tell whether destruction was triggered.",
      "Where the case was dismissed, the prosecutor or the judge has 60 days to object. Wait out that period before expecting the record to change.",
      `After that, get a copy of ${MI_RECORD_CHECK} and look for the arrest.`,
      "If it is gone, you are done.",
      "If it still appears, a records correction is the next step. Raise it with the agency that reported the information — the court or the Michigan State Police, whichever reported it."
    ],
    submissionMethod:
      "There is nothing for you to submit. The order comes from the court and the clerk notifies the State Police.",
    fees: "None.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "The clerk of the court advises the Michigan State Police of the disposition."
    ],
    expectedNextStage:
      "The fingerprints and the arrest card are destroyed and the arrest no longer appears on your record.",
    legalEaseCanPrepare: [
      "This explanation of how destruction is triggered and what confirms it.",
      "A plain list of what to ask the clerk for and what to check afterwards."
    ],
    legalEaseCannotPerform: MI_CANNOT_PERFORM,
    escalationTriggers: [
      "You have a prior conviction other than a misdemeanour traffic offence, which defeats automatic destruction under MCL 28.243(14).",
      "The prosecutor or the judge objects within 60 days of a dismissal order.",
      "The data still appears after 60 days, and a records correction must be raised with the court or the Michigan State Police."
    ],
    officialSourceReferences: MI_SOURCES
  },

  // =========================================================================
  // mi_deferral_status — MCL 780.621(2), MCL 780.621d(7)(d)
  // =========================================================================
  "mi-deferral-status-guidance": {
    templateId: "mi-deferral-status-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "What a completed deferral means for clearing your record",
    whyNotAFiling:
      "This page grants nothing and asks for nothing. It exists to tell you which Michigan route your situation belongs to, and what a completed deferral means when you count up what can be set aside. There is no application here and nothing is filed.",
    processType: "court_adjacent",
    prerequisites: [
      "Your case was deferred under a Michigan deferral law and was dismissed after you completed it.",
      "You know which deferral law applied. Which one it was changes the counting, so this page is not produced while that is unknown."
    ],
    documentsToObtain: [
      "The court's disposition in the deferred case, from the convicting court, if you are not sure which deferral law applied.",
      `A copy of ${MI_RECORD_CHECK}.`
    ],
    participantDataToGather: [
      "Which deferral law applied.",
      "Whether you completed the deferral and the case was dismissed.",
      "Whether an arrest record from that case still exists.",
      "Whether you are also seeking to set aside a different conviction."
    ],
    officialDestination: {
      name: "Not applicable",
      detail:
        "No relief is granted here. This page routes you to the right mechanism and tells you what a deferral means for eligibility counting on the application routes."
    },
    actionSequence: [
      "Identify which deferral law your case was handled under. If you are not sure, ask the convicting court for the disposition before going further.",
      "Understand what the dismissal did and did not do. A completed deferral that ended in dismissal is not a conviction, but the set-aside act does not reach the arrest record from that case.",
      "If an arrest record from the deferred case still exists, that record is dealt with by the biometric-destruction routes, not by the set-aside act.",
      "If you are applying to set aside a different conviction, list every deferred-and-dismissed action on the application. MCL 780.621d(7)(d) requires it, and leaving one off makes the application deficient on its face.",
      "Item 5 on the application is where that disclosure goes. Treat it as required, not optional."
    ],
    submissionMethod: "There is nothing to submit. This page is not an application.",
    fees: "None.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage:
      "You know which Michigan route applies to your situation, and what you must disclose if you apply to set aside another conviction.",
    legalEaseCanPrepare: [
      "This explanation of what a completed deferral does and does not do.",
      "The routing to the biometric-destruction routes for an arrest record the set-aside act does not reach.",
      "A plain statement of the disclosure MCL 780.621d(7)(d) requires."
    ],
    legalEaseCannotPerform: [
      ...MI_CANNOT_PERFORM,
      "LegalEase cannot tell you whether a particular deferred-and-dismissed disposition falls within MCL 780.621(2), including the catch-all at (2)(f). That is a legal judgment."
    ],
    escalationTriggers: [
      "Whether a prior deferred-and-dismissed disposition falls within MCL 780.621(2), including the catch-all at (2)(f), is unclear.",
      "An arrest record from the deferred case still exists, which routes to the biometric-destruction routes.",
      "You are uncertain which deferral law applied, which changes the eligibility counting."
    ],
    officialSourceReferences: MI_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!MICHIGAN_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Michigan guidance template ${templateId} is registered.`);
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

const RECORD_CHECK_INPUT: RequiredInput = {
  key: "checkedRecord",
  label: "Have you checked your criminal history to see whether the conviction has already been set aside?",
  required: true
};

const AUTOMATIC_INPUTS: readonly RequiredInput[] = [
  {
    key: "convictionType",
    label: "Was the conviction a felony, a misdemeanour punishable by 93 days or more, or a misdemeanour punishable by 92 days or less?",
    required: true
  },
  {
    key: "sentenceImpositionDate",
    label: "When was sentence imposed, and when did you complete any term of imprisonment?",
    required: true
  },
  { key: "convictionsSince", label: "Have you been convicted of any criminal offence since?", required: true },
  { key: "pendingCharges", label: "Do you have any criminal charges pending?", required: true },
  {
    key: "excludedCategory",
    label: "Was the offence assaultive, a serious misdemeanour, a crime of dishonesty, punishable by 10 or more years, involving a minor, vulnerable adult, injury, serious impairment or death, human trafficking, or a traffic offence?",
    required: true
  },
  { key: "restitutionOutstanding", label: "Is any court-ordered restitution still unpaid?", required: true },
  RECORD_CHECK_INPUT
];

function michiganTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
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
    jurisdiction: "MI",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "not_applicable",
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

export const MICHIGAN_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  michiganTrack({
    trackId: "mi_auto_felony",
    publicName: "Felony convictions that clear on their own",
    mechanism: "automatic_set_aside_felony",
    authority: "MCL 780.621g(2), (5), (10); MCL 780.621h",
    recordTypes: ["michigan_conviction"],
    dispositions: ["felony_conviction"],
    componentId: "mi_auto_felony-process-guidance-1",
    templateId: "mi-auto-felony-guidance",
    requiredInputs: AUTOMATIC_INPUTS,
    assembledPacketName: "Automatic-Set-Aside-Felony",
    assembledPacketTitle: "Felony convictions that are set aside automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining that the conviction is set aside by operation of law with no application and no fee, how to check whether it has happened, the two-felony lifetime limit, and what to do if the record has not cleared.",
    notes:
      "There is no participant filing on this route. The lifetime limit under MCL 780.621g(5) is two felonies within a combined limit of two felonies and four qualifying misdemeanours, and the reversibility rule at MCL 780.621h is stated on the face of the guidance."
  }),

  michiganTrack({
    trackId: "mi_auto_misd93",
    publicName: "Higher-level misdemeanours that clear on their own",
    mechanism: "automatic_set_aside_misdemeanor_93_or_more",
    authority: "MCL 780.621g(4), (5), (10); MCL 780.621h",
    recordTypes: ["michigan_conviction"],
    dispositions: ["misdemeanor_conviction_93_days_or_more"],
    componentId: "mi_auto_misd93-process-guidance-1",
    templateId: "mi-auto-misd93-guidance",
    requiredInputs: AUTOMATIC_INPUTS,
    assembledPacketName: "Automatic-Set-Aside-Misdemeanor-93-Day",
    assembledPacketTitle: "Misdemeanours punishable by 93 days or more that are set aside automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Michigan State Police perform the set-aside with no application and no fee, how to check whether it has happened, the four-misdemeanour limit, and what to do if the record has not cleared.",
    notes:
      "The Michigan State Police perform this set-aside. The cap is four such misdemeanours within the combined lifetime limit under MCL 780.621g(5)."
  }),

  michiganTrack({
    trackId: "mi_auto_misd92",
    publicName: "Lower-level misdemeanours that clear on their own",
    mechanism: "automatic_set_aside_misdemeanor_92_or_less",
    authority: "MCL 780.621g(1), (3), (5); MCL 780.621h",
    recordTypes: ["michigan_conviction"],
    dispositions: ["misdemeanor_conviction_92_days_or_less"],
    componentId: "mi_auto_misd92-process-guidance-1",
    templateId: "mi-auto-misd92-guidance",
    requiredInputs: AUTOMATIC_INPUTS,
    assembledPacketName: "Automatic-Set-Aside-Misdemeanor-92-Day",
    assembledPacketTitle: "Misdemeanours punishable by 92 days or less that are set aside automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining that the conviction is set aside with no application and no fee, where the record lives and therefore who to ask, that this route has no numerical limit, and what to do if the record has not cleared.",
    notes:
      "The one route in this family with no numerical cap. Its guidance deliberately does not lead with the State Police check: a 92-day-or-less misdemeanour is often never fingerprinted to the State Police, and for that population a criminal-history check proves nothing. The convicting court is the right place to ask instead."
  }),

  michiganTrack({
    trackId: "mi_arrest_no_charge",
    publicName: "Clearing fingerprints and an arrest card when you were never charged",
    mechanism: "biometric_destruction_no_charge",
    authority: "MCL 28.243",
    recordTypes: ["biometric_data", "arrest_card"],
    dispositions: ["arrested_and_released_without_charge"],
    componentId: "mi_arrest_no_charge-process-guidance-1",
    templateId: "mi-arrest-no-charge-guidance",
    requiredInputs: [
      { key: "wasFingerprinted", label: "Were you fingerprinted when you were arrested?", required: true },
      { key: "releasedWithoutCharge", label: "Were you released without being charged?", required: true },
      { key: "arrestingAgency", label: "Which agency arrested you?", required: true },
      { key: "dataStillAppears", label: "Does the arrest still appear on your criminal history?", required: true }
    ],
    assembledPacketName: "Arrest-Record-Destruction-No-Charge",
    assembledPacketTitle: "Destroying fingerprints and an arrest card when you were never charged",
    customerDeliverableDescription:
      "A guidance sheet explaining that the agency holding the biometric data and the arrest card destroys them without any application, and what to do where the arrest still appears.",
    notes:
      "Arrest-only relief: it reaches biometric data and the arrest card, not a conviction record. Where a charge was in fact filed the route changes, and the deriver routes the participant to the acquittal-or-dismissal rule rather than producing this sheet."
  }),

  michiganTrack({
    trackId: "mi_arrest_acquittal_dismissal",
    publicName: "Clearing fingerprints and an arrest card after a case ended in your favour",
    mechanism: "biometric_destruction_acquittal_or_dismissal",
    authority: "MCL 28.243(8), (9), (10), (14); MCL 769.16a",
    recordTypes: ["biometric_data", "arrest_card", "lein_entry"],
    dispositions: ["acquittal", "dismissal"],
    componentId: "mi_arrest_acquittal_dismissal-process-guidance-1",
    templateId: "mi-arrest-acquittal-dismissal-guidance",
    requiredInputs: [
      { key: "dispositionType", label: "Did the case end in an acquittal or a dismissal?", required: true },
      { key: "orderDate", label: "On what date was the order of acquittal or dismissal entered?", required: true },
      {
        key: "priorNonTrafficConviction",
        label: "Do you have any prior conviction other than a misdemeanour traffic offence?",
        required: true
      },
      {
        key: "arraignedEnumeratedOffence",
        label: "Were you arraigned for an offence involving a child under 16, or another enumerated offence?",
        required: true
      },
      {
        key: "dataStillAppears",
        label: "Do the fingerprints or arrest still appear on your criminal history?",
        required: true
      }
    ],
    assembledPacketName: "Arrest-Record-Destruction-Acquittal-Dismissal",
    assembledPacketTitle: "Destroying fingerprints and an arrest card after an acquittal or a dismissal",
    customerDeliverableDescription:
      "A guidance sheet explaining that destruction follows the court's own order rather than any participant filing, how form MC 262 confirms it was triggered, the 60-day objection window, and how to raise a records correction.",
    notes:
      "MC 262 is the court's order, not a participant filing, and no version of it is generated. A prior conviction other than a misdemeanour traffic offence defeats automatic destruction under MCL 28.243(14), and the deriver stops rather than producing guidance that would not apply."
  }),

  michiganTrack({
    trackId: "mi_deferral_status",
    publicName: "What a completed deferral means for clearing your record",
    mechanism: "deferral_status_routing",
    authority:
      "MCL 333.7411; MCL 762.11 to 762.15; MCL 769.4a; MCL 436.1703; MCL 780.621(2); MCL 780.621d(7)(d)",
    recordTypes: ["deferred_and_dismissed_disposition"],
    dispositions: ["completed_deferral"],
    componentId: "mi_deferral_status-process-guidance-1",
    templateId: "mi-deferral-status-guidance",
    requiredInputs: [
      {
        key: "deferralStatute",
        label: "Under which law was your case deferred, for example 7411, HYTA, 769.4a, drug court, DWI court or liquor control?",
        required: true
      },
      { key: "deferralCompleted", label: "Did you complete the deferral and was the case dismissed?", required: true },
      { key: "arrestRecordExists", label: "Does an arrest record from that case still exist?", required: true },
      {
        key: "seekingSetAsideElsewhere",
        label: "Are you also seeking to set aside a different conviction?",
        required: true
      }
    ],
    assembledPacketName: "Deferral-Status-Routing",
    assembledPacketTitle: "What a completed deferral means for clearing your record",
    customerDeliverableDescription:
      "A guidance sheet explaining what a completed deferral did and did not do, routing an arrest record to the destruction routes, and stating the disclosure MCL 780.621d(7)(d) requires on a set-aside application.",
    notes:
      "This route grants no relief. It exists to send the participant to the right mechanism and to drive eligibility counting on the application routes. Where the participant does not know which deferral law applied, the deriver stops, because that answer changes the counting."
  })
];
