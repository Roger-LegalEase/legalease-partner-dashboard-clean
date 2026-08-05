// Georgia process guidance — restriction, sealing, and the consent gate.
//
// Three assigned routes, four components, all implemented. None produces a
// court filing from LegalEase: two happen without anybody asking, and the third
// cannot be filed at all until a prosecutor consents, which is a negotiation
// the design places outside self-help every time.
//
// Vocabulary first, because Georgia's is the thing consumer copy gets wrong:
//
//   Georgia says RESTRICT, and separately SEAL. It has not said expungement in
//   the statute since 1 July 2013, and neither remedy destroys the record.
//
// So no artifact here calls a Georgia remedy an expungement, and the verifier
// fails the build if one does. More important than the word is what follows
// from it: because the record still exists, a participant must never be told
// they may say it does not. Restriction or sealing may still be used to
// disqualify someone from employment or office in the same way a first offender
// discharge can, and it does not displace disclosure that federal law requires.
// Both sentences are on every sheet.
//
// The hardest truth in this family belongs to the time-expired route. The
// Attorney General determined that a time-expired restriction does not meet the
// federal definition of a sealed record, so the Crime Information Center will
// still give those records to the Federal Bureau of Investigation and to other
// states for employment and licensing. A time-expired restriction is therefore
// materially weaker than a disposition-based one, and someone who needs a clean
// federal or multi-state check is told so rather than reassured.
//
// The First Offender sentencing route changed in the participant's favour and
// the sheet says how. As amended effective 1 July 2026, the court SHALL limit
// public access at sentencing: the former discretionary language and the
// written-findings requirement were struck. What used to be a request is now
// the court's duty. The sheet also carries the two deadlines that tell a
// participant when to expect the change — the clerk seals within sixty days,
// the agencies comply within thirty days of receiving the order — and the fact
// that revocation of first offender status removes the restriction and sealing
// again.
//
// Retroactive first offender treatment is the one route with a petition, and it
// is deliberately not generated. The petition may be filed only with the
// prosecuting attorney's consent, obtained before filing, and the design is
// unambiguous that obtaining that consent is negotiation with an opposing party
// and outside self-help, always. The eligibility claim also turns on what the
// participant was or was not told at the original sentencing, which requires
// assessment of the sentencing record — something LegalEase never inspects. So
// the design gives this route two guidance components rather than a filing: one
// explains the route and the gate, and the second organises the participant's
// own factual account so the desk or attorney who takes the handoff starts with
// it in order. That second component is the deliverable, and it is not a
// petition.
//
// Every typed stop routes to a named Georgia expungement desk: the Georgia
// Justice Project, the Cobb County Second Chance Desk, the Henry County Records
// Restriction Desk, or Middle Georgia Justice "The Desk".
//
// What these templates never do: turn guidance into a court filing, generate or
// file the retroactive first offender petition, seek a prosecutor's consent,
// call a Georgia remedy an expungement, tell a participant they may say the
// record does not exist, promise a federal or multi-state check will come back
// clean, or quote a fee.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Georgia is
// not an enabled jurisdiction and this job does not enable one.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/**
 * The worker-branch legal-output position for this family.
 *
 * Built and put forward; counsel has not adopted it. The adoption records and
 * the packet proof are integration-owned and name no Georgia guidance track, so
 * `GEORGIA_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const GEORGIA_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const GEORGIA_COUNSEL_ADOPTED = false;

/** The referral destinations the design names for every stop. */
export const GEORGIA_EXPUNGEMENT_DESKS =
  "a Georgia records-restriction desk — the Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, or Middle Georgia Justice \"The Desk\"";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class GeorgiaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "GeorgiaGuidanceStopError";
  }
}

/** The participant belongs on a different Georgia route, which is named. */
export class GeorgiaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "GeorgiaRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class GeorgiaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "GeorgiaBranchError";
  }
}

export const GA_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Offence class, which decides the waiting period on the time-expired route. */
export const GA_OFFENSE_CLASSES: Readonly<Record<string, string>> = {
  misdemeanor: "two years from the date of arrest",
  high_and_aggravated_misdemeanor: "two years from the date of arrest",
  felony: "four years from the date of arrest",
  serious_violent_or_sexual_offense_victim_under_16: "seven years from the date of arrest"
};

/** Whether the participant needs the record clean beyond Georgia. */
export const GA_BACKGROUND_SCOPE: Readonly<Record<string, string>> = {
  georgia_only: "georgia_only",
  federal_or_multi_state: "federal_or_multi_state"
};

/** Whether a disposition-based restriction is also available. */
export const GA_OTHER_ROUTE: Readonly<Record<string, string>> = {
  no_disposition_based_route: "no_disposition_based_route",
  dismissal_nolle_prosse_or_acquittal: "dismissal_nolle_prosse_or_acquittal",
  unsure: "unsure"
};

/** Where the participant is in the First Offender sentencing timeline. */
export const GA_SENTENCING_POSTURE: Readonly<Record<string, string>> = {
  already_sentenced: "already_sentenced",
  being_sentenced_now: "being_sentenced_now"
};

/** Which office prosecuted, which decides who consent is sought from. */
export const GA_PROSECUTING_OFFICE: Readonly<Record<string, string>> = {
  district_attorney: "the District Attorney's office for that county",
  solicitor_general: "the Solicitor-General's office for that county",
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
    throw new GeorgiaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Georgia stops, and routes to the
 * correct Georgia mechanism.
 */
export function deriveGeorgiaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (trackId === "ga-time-expired") {
    const offense = branch(trackId, "offenseClass", GA_OFFENSE_CLASSES, facts.offenseClass);
    derived.applicablePeriod = offense.resolved;

    if (branch(trackId, "everCharged", GA_YES_NO, facts.everCharged).resolved) {
      throw new GeorgiaRouteMismatchError(
        trackId,
        "charges_were_filed",
        "This route reaches an arrest where the Crime Information Center never received notice that the offence was referred to a prosecuting attorney. Once charges were filed there is a case, and a case is restricted on what happened to it rather than on time passing.",
        `the Georgia disposition-based records restriction routes, which turn on how the case ended; to identify which applies, ${GEORGIA_EXPUNGEMENT_DESKS}`
      );
    }

    const other = branch(trackId, "otherRestrictionRoute", GA_OTHER_ROUTE, facts.otherRestrictionRoute);
    if (other.value === "dismissal_nolle_prosse_or_acquittal") {
      throw new GeorgiaRouteMismatchError(
        trackId,
        "disposition_based_restriction_is_the_better_route",
        "A dismissal, a nolle prosse or an acquittal qualifies for a disposition-based restriction, and that is the stronger remedy. A time-expired restriction is the weaker one — the Attorney General determined it does not meet the federal definition of a sealed record — so taking the disposition route instead is worth doing.",
        `the Georgia disposition-based records restriction route for a dismissal, nolle prosse or acquittal; to be taken through it, ${GEORGIA_EXPUNGEMENT_DESKS}`
      );
    }
    derived.otherRestrictionRoute = other.value;

    const scope = branch(trackId, "backgroundCheckScope", GA_BACKGROUND_SCOPE, facts.backgroundCheckScope);
    if (scope.value === "federal_or_multi_state") {
      throw new GeorgiaGuidanceStopError(
        trackId,
        "federal_or_multi_state_check_not_delivered_by_this_route",
        "This route may not give you what you need. The Attorney General determined that a time-expired restriction does not meet the federal definition of a sealed record, so the Crime Information Center will still provide the record to the Federal Bureau of Investigation and to other states for employment and licensing. Waiting for it will not produce a clean federal or multi-state check.",
        `${GEORGIA_EXPUNGEMENT_DESKS}, to ask whether a disposition-based restriction or another Georgia remedy reaches your record, before you rely on this one for an out-of-state or federal application`
      );
    }
  }

  if (trackId === "ga-fo-sentencing-post2026") {
    const posture = branch(trackId, "sentencingPosture", GA_SENTENCING_POSTURE, facts.sentencingPosture);
    if (posture.value === "being_sentenced_now") {
      throw new GeorgiaGuidanceStopError(
        trackId,
        "live_criminal_case_belongs_to_defence_counsel",
        "Anything happening inside a live criminal case belongs to the lawyer defending it. Sentencing is where this order is made, so the person who can make sure it happens is your defence lawyer, not a record-clearing service.",
        "your defence lawyer in that case, or the public defender's office for that court, asking them to confirm the court makes the first offender restriction and sealing order at sentencing"
      );
    }

    if (!branch(trackId, "sentencedUnderFirstOffenderAct", GA_YES_NO, facts.sentencedUnderFirstOffenderAct).resolved) {
      throw new GeorgiaRouteMismatchError(
        trackId,
        "not_sentenced_under_the_first_offender_act",
        "This route follows a First Offender Act sentence. Where you were sentenced as an ordinary conviction instead, the question becomes whether you should have been given first offender treatment and were never told you could be.",
        `the Georgia retroactive first offender route, which asks the convicting court to give you that treatment now; it needs the prosecutor's consent first, so ${GEORGIA_EXPUNGEMENT_DESKS}`
      );
    }

    if (branch(trackId, "statusRevoked", GA_YES_NO, facts.statusRevoked).resolved) {
      throw new GeorgiaGuidanceStopError(
        trackId,
        "first_offender_status_revoked_and_guilt_adjudicated",
        "Where the court revoked the First Offender Act sentence and adjudicated you guilty, the restriction and sealing of the court records are removed by statute and the records may be disseminated. This route no longer protects that case.",
        `${GEORGIA_EXPUNGEMENT_DESKS}, to ask what remains available for an adjudicated conviction in your county`
      );
    }

    if (branch(trackId, "immigrationConsequence", GA_YES_NO, facts.immigrationConsequence).resolved) {
      throw new GeorgiaGuidanceStopError(
        trackId,
        "immigration_consequence_in_play",
        "A first offender discharge is not a conviction for Georgia purposes, but how a record is treated for immigration is decided under federal law and can differ. Acting on the record before that is understood can make a disposition harder to prove.",
        "an immigration lawyer first, and only then " + GEORGIA_EXPUNGEMENT_DESKS
      );
    }
  }

  if (trackId === "ga-rfo") {
    if (branch(trackId, "sentencedUnderFirstOffenderAct", GA_YES_NO, facts.sentencedUnderFirstOffenderAct).resolved) {
      throw new GeorgiaRouteMismatchError(
        trackId,
        "already_sentenced_under_the_first_offender_act",
        "This route exists to ask for first offender treatment you were never given. Where you already had it, there is nothing to ask for — the restriction and sealing follow the sentence itself.",
        "the Georgia First Offender sentencing restriction and sealing route, which explains what the court should already have ordered and by when"
      );
    }

    if (branch(trackId, "immigrationConsequence", GA_YES_NO, facts.immigrationConsequence).resolved) {
      throw new GeorgiaGuidanceStopError(
        trackId,
        "immigration_consequence_in_play",
        "Converting a conviction into a first offender discharge changes how the record reads in Georgia, but immigration consequences are decided under federal law and do not follow automatically. The sequence matters and it needs to be advised on before anything is asked of a prosecutor.",
        "an immigration lawyer first, and only then " + GEORGIA_EXPUNGEMENT_DESKS
      );
    }

    const informed = branch(trackId, "informedOfEligibility", GA_YES_NO, facts.informedOfEligibility);
    const historical = branch(trackId, "historicalCategory", GA_YES_NO, facts.historicalCategory);
    if (informed.resolved && !historical.resolved) {
      throw new GeorgiaRouteMismatchError(
        trackId,
        "told_about_first_offender_and_outside_the_historical_window",
        "The route is for someone who qualified but was never told they could be sentenced as a first offender, or who was sentenced in the 1968 to 1982 window to a year or less. Where you were told about it and are outside that window, neither ground is made out on what you have described.",
        `${GEORGIA_EXPUNGEMENT_DESKS}, taking the sentencing transcript if you can obtain it, because what you were actually told is the fact the whole route turns on and it is read from the record rather than from memory`
      );
    }

    derived.prosecutingOffice = branch(
      trackId,
      "prosecutingAttorneyOffice",
      GA_PROSECUTING_OFFICE,
      facts.prosecutingAttorneyOffice
    ).resolved;

    // The design's standing instruction: the consent stage is negotiation with
    // an opposing party and is outside self-help, always. This is not a failure
    // case — it is the point at which the packet hands over, and it fires for
    // every participant who reaches it.
    if (branch(trackId, "readyForConsentStage", GA_YES_NO, facts.readyForConsentStage).resolved) {
      throw new GeorgiaGuidanceStopError(
        trackId,
        "consent_stage_is_always_a_handoff",
        "Nothing can be filed on this route until the prosecuting attorney consents, and that consent has to be obtained before the petition is filed. Asking for it is a negotiation with the other side of your old case, and silence is not consent — so this is where self-help stops for everyone, not only for difficult cases.",
        `${GEORGIA_EXPUNGEMENT_DESKS}, taking the factual record this packet helped you assemble, and ask them to seek the prosecuting attorney's consent before any petition is filed`
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const RESTRICT_AND_SEAL =
  "Georgia says restrict, and separately seal. It has not used the word expungement in the statute since 1 July 2013, and neither restriction nor sealing destroys the record — the record still exists and some people can still see it.";

const NEVER_SAY_IT_DOES_NOT_EXIST =
  "Because the record still exists, you must not say that it does not. A restriction or sealing may still be used to disqualify you from employment or office in the same way a first offender discharge can, and it does not override disclosure that federal law requires of you.";

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and no fee to pay.";

const GA_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot restrict or seal anything, and cannot make a court, a clerk, a prosecuting attorney or the Crime Information Center act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, inspect or hold your record, and does not read your sentencing transcript."
];

const GA_SOURCES: readonly string[] = [
  "O.C.G.A. § 35-3-37(h)(1)(A)(ii) and § 35-3-39.1 (records restriction and sealing).",
  "O.C.G.A. § 42-8-62.1(b), (e), (f), (g) and (h); 2026 Ga. Laws Act 403 (HB 162), § 3 (first offender restriction at sentencing).",
  "O.C.G.A. § 42-8-63.1 (effect on employment and office); § 42-8-66 (retroactive first offender treatment).",
  "Georgia Crime Information Center; Georgia Department of Driver Services.",
  "Georgia Justice Project; Cobb County Second Chance Desk; Henry County Records Restriction Desk; Middle Georgia Justice \"The Desk\"."
];

function gaGuidance(input: {
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
    actionSequence: [RESTRICT_AND_SEAL, ...input.sequence, NEVER_SAY_IT_DOES_NOT_EXIST],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? GA_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: GA_SOURCES
  };
}

export const GEORGIA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "ga-time-expired-guidance": gaGuidance({
    templateId: "ga-time-expired-guidance",
    mechanismName: "Arrests where charges were never filed",
    processType: "automatic",
    whyNotAFiling:
      "Where the Crime Information Center never receives notice that the offence was referred to a prosecuting attorney, and the applicable period has run from the arrest, the centre restricts the record without any request. There is nothing to submit and no office receives anything from you.",
    destination: {
      name: "The Georgia Crime Information Center",
      detail:
        "The centre restricts the record when the applicable period has run without notice of referral. Nothing is submitted by the participant."
    },
    prerequisites: [
      "You were arrested and, so far as you know, charges were never filed.",
      "The applicable period has run from the date of arrest, or you are waiting for it to."
    ],
    documents: [
      "Your Georgia criminal history record, so you can see what the centre currently holds.",
      "Anything that fixes the arrest date, which is what every period is measured from."
    ],
    gather: [
      "The date you were arrested.",
      "Whether the offence was a misdemeanour, a high and aggravated misdemeanour, a felony, or a serious violent felony or felony sexual offence with a victim under 16.",
      "Whether charges were ever filed.",
      "Whether you need the record clean for a federal or multi-state background check.",
      "Whether the case ended in a dismissal, nolle prosse or acquittal instead."
    ],
    sequence: [
      "Work out which period applies to you, measured from the date of arrest. It is two years for a misdemeanour or a high and aggravated misdemeanour; four years for a felony other than a serious violent felony or a felony sexual offence with a victim under 16; and seven years for such a felony.",
      "Know what triggers it. The restriction happens where the centre receives no notice that the offence was referred to a prosecuting attorney or transferred elsewhere for prosecution. If no charging instrument arrives within thirty days after the applicable period, the centre restricts.",
      "Know that it can be undone. If an indictment arrives later, the centre unrestricts the record. This is a restriction that follows the absence of a prosecution, not a permanent closing of the file.",
      "Now the part that matters most, and it is not good news. The Attorney General determined that a time-expired restriction does not meet the federal definition of a sealed record. The Crime Information Center will still provide time-expired records to the Federal Bureau of Investigation and to other states for employment and licensing purposes.",
      "So a time-expired restriction is weaker than a disposition-based one. If your case actually ended in a dismissal, a nolle prosse or an acquittal, that is the stronger route and it is worth taking instead of waiting for this one.",
      "Check your own Georgia criminal history rather than assuming. If it shows a disposition you do not recognise on this arrest, that can be an identity problem on the record, and it is worth resolving before anything else."
    ],
    submissionMethod: "There is nothing to submit. The centre restricts the record without any request.",
    fees: "No fee. There is nothing to file on this route.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: ["There is nobody to notify and nothing to serve.", "Nobody is required to tell you when it has happened."],
    expectedNextStage:
      "Your Georgia criminal history shows the arrest restricted — while remaining available to the federal and out-of-state checks described above.",
    canPrepare: [
      "This explanation of the three periods and what triggers the restriction.",
      "The honest limit of this route for federal and multi-state checks.",
      "The comparison with the stronger disposition-based route."
    ],
    escalations: [
      "You need the record clean for a federal or multi-state background check.",
      "The arrest shows a disposition you do not recognise, which may be an identity problem.",
      "The case ended in a dismissal, nolle prosse or acquittal, which is the better route."
    ]
  }),

  "ga-fo-sentencing-post2026-guidance": gaGuidance({
    templateId: "ga-fo-sentencing-post2026-guidance",
    mechanismName: "First Offender records restricted and sealed when you are sentenced",
    processType: "court_adjacent",
    whyNotAFiling:
      "The court makes this order itself, at the time of sentencing. No petition, application or request from you starts it — and as amended it is no longer discretionary, so this page explains what the court is now required to do and by when.",
    destination: {
      name: "The sentencing court, acting on its own",
      detail:
        "The court makes the order at sentencing. The clerk then seals, and law enforcement agencies, jails and detention centres restrict. Nothing is submitted by the participant."
    },
    prerequisites: [
      "You were sentenced under Georgia's First Offender Act.",
      "Your first offender status has not been revoked."
    ],
    documents: [
      "Your sentencing order or the court's disposition, showing first offender treatment.",
      "Your Georgia criminal history record, so you can see whether the restriction has taken effect."
    ],
    gather: [
      "Whether you were actually sentenced under the First Offender Act.",
      "The date you were sentenced, the court and county, and the case number.",
      "Whether the court has revoked your first offender status and adjudicated you guilty.",
      "Whether you have a lawyer in the criminal case."
    ],
    sequence: [
      "Know what changed, because it changed in your favour. At sentencing the court shall limit public access to your first offender sentencing information: it orders that dissemination of the records be restricted, that the criminal file, docket books, criminal minutes, final record, all other records of the court and your criminal history record information held by the clerk — including within any index — be sealed and unavailable to the public, and that law enforcement agencies, jails and detention centres restrict the arrest record including fingerprints and photographs. The former discretionary wording and the written-findings requirement were struck.",
      "Know the two deadlines, so you know when to look. The clerk seals within sixty days of the order. Law enforcement agencies, jails and detention centres must comply within thirty days of receiving a copy of it.",
      "Know who still sees it. The entities the statute enumerates keep access without needing a court order or an affidavit, so this is restriction and sealing rather than disappearance.",
      "Know what would undo it. If the court revokes your First Offender Act sentence and adjudicates you guilty while you are serving it, the restriction and sealing of the court records are removed and the records may be disseminated again.",
      "Check your own Georgia criminal history after those deadlines have passed rather than assuming the order reached every holder of the record."
    ],
    submissionMethod: "There is nothing to submit. The court makes the order at sentencing.",
    fees: "No fee. There is no petition on this route.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "You serve nobody. The court's order goes to the clerk and to the agencies holding the records.",
      "Nobody is required to tell you when the sealing and restriction have been completed."
    ],
    expectedNextStage:
      "The clerk has sealed within sixty days and the agencies have restricted within thirty days of receiving the order, and your criminal history reflects it.",
    canPrepare: [
      "This explanation of what the court is now required to do at sentencing, rather than what it may do.",
      "The sixty-day and thirty-day deadlines, so you know when to check.",
      "What revocation would undo, before it is a surprise."
    ],
    escalations: [
      "You are being sentenced now, which belongs to your defence lawyer.",
      "The court did not make the order at sentencing and you want that corrected.",
      "Your first offender status has been revoked and guilt adjudicated.",
      "An immigration consequence is in play."
    ]
  }),

  "ga-rfo-guidance": gaGuidance({
    templateId: "ga-rfo-guidance",
    mechanismName: "Asking for First Offender treatment you should have been given",
    processType: "prosecutor",
    whyNotAFiling:
      "There is a petition on this route, and LegalEase does not generate or file it. It may be filed only with the prosecuting attorney's consent, obtained before filing, and the eligibility claim turns on what you were told at your original sentencing — which is read from the sentencing record rather than supplied by you. This page explains the route and the gate; the sheet that follows organises your own account for the person who takes it forward.",
    destination: {
      name: "The prosecuting attorney first, then the convicting court",
      detail:
        "Consent is sought from the prosecuting attorney before anything is filed. Only after consent is obtained may the petition be filed in the convicting court. On a grant the court sends the order to the petitioner, the prosecuting attorney, the Crime Information Center and the Department of Driver Services, both of which must modify their records."
    },
    prerequisites: [
      "You were convicted in Georgia and were not sentenced under the First Offender Act.",
      "Either you qualified for first offender sentencing and were never told you were eligible, or you were sentenced between 18 March 1968 and 31 October 1982 to incarceration of one year or less and would otherwise have qualified."
    ],
    documents: [
      "Your sentencing order and, if you can obtain it, the transcript of the sentencing hearing. What you were told is the fact the route turns on.",
      "Your Georgia criminal history record.",
      "The case number, the convicting court and the county."
    ],
    gather: [
      "Whether you were sentenced under the First Offender Act in the original case.",
      "The convicting court, the county, the case number and the sentencing date.",
      "Which Code section you were convicted under.",
      "Whether you had ever been given first offender treatment before that case.",
      "Whether you were told at the time that you could be sentenced as a first offender.",
      "Whether the case was prosecuted by the District Attorney or the Solicitor-General."
    ],
    sequence: [
      "Know what a grant would be worth, because it is substantial. If the court grants it, the conviction becomes a first offender discharge — which is not a conviction — and the record then becomes restrictable and sealable in the way an ordinary conviction never is.",
      "Know the two ways in. Either you qualified for first offender sentencing at the time and were not informed you were eligible, or you were sentenced between 18 March 1968 and 31 October 1982 to incarceration not exceeding one year and would otherwise have qualified.",
      "Know the gate, because it governs everything else. The petition may be filed only with the prosecuting attorney's consent, and that consent must be obtained before filing. There is no route around it and no way to file first and ask afterwards.",
      "That gate is why this stops being self-help. Asking a prosecuting attorney to consent is a negotiation with the other side of your old case, and silence is not consent. It is not something to attempt alone, and it is where this packet hands over.",
      "Know what the court would decide. It may grant if it finds, on the balance of probabilities, that you were eligible at the time of the original sentencing or qualify under the 1968 to 1982 provision, and that the ends of justice and the welfare of society are served. A hearing is held if you ask for one, if the prosecuting attorney asks, or if the court wants one.",
      "There is no filing fee for this petition. That is worth knowing before anyone quotes you one.",
      "On a grant, the order goes to you, to the prosecuting attorney, to the Crime Information Center and to the Department of Driver Services, and both of those must modify their records."
    ],
    submissionMethod:
      "Nothing is submitted by you through LegalEase. Consent is sought from the prosecuting attorney by the desk or attorney taking the handoff, and only then may a petition be filed in the convicting court.",
    fees: "There is no filing fee for this petition. Ask before paying anyone who says otherwise.",
    feeWaiver: "Not applicable. There is no filing fee to waive on this route.",
    noticeOrService: [
      "You serve nobody. Consent is sought from the prosecuting attorney before filing.",
      "On a grant the court distributes the order; you do not."
    ],
    expectedNextStage:
      "A records-restriction desk or attorney has your factual record and is approaching the prosecuting attorney for consent.",
    canPrepare: [
      "This explanation of the route, what a grant is worth, and where the gate is.",
      "The organised factual record on the sheet that follows, ready to hand over.",
      "The no-filing-fee point, before anyone quotes one."
    ],
    cannotPerform: [
      ...GA_CANNOT_PERFORM,
      "LegalEase does not generate or file the retroactive first offender petition, and does not seek the prosecuting attorney's consent. Both belong to the desk or attorney who takes the handoff."
    ],
    escalations: [
      "You are at the consent stage, which is always a handoff.",
      "The prosecuting attorney declines or does not respond.",
      "The claim turns on what you were told at sentencing, which is read from the record.",
      "An immigration consequence is in play."
    ]
  }),

  "ga-rfo-factual-record-guidance": gaGuidance({
    templateId: "ga-rfo-factual-record-guidance",
    mechanismName: "Your factual record for the retroactive First Offender request",
    processType: "prosecutor",
    whyNotAFiling:
      "This is not a petition and it is not filed anywhere. It is your own account, organised, so that the desk or attorney who approaches the prosecuting attorney starts with the facts in order instead of assembling them from scratch.",
    destination: {
      name: "The records-restriction desk or attorney taking the handoff",
      detail:
        "You bring this with you. They decide what to do with it, and they are the ones who approach the prosecuting attorney for consent."
    },
    prerequisites: [
      "You have read the explanation sheet and understand that the consent stage is a handoff.",
      "You have your case details, or know where to get them."
    ],
    documents: [
      "Your sentencing order.",
      "The transcript of the sentencing hearing, if you can obtain it.",
      "Your Georgia criminal history record.",
      "Anything from the original case showing what you were offered or told."
    ],
    gather: [
      "The convicting court, the county and the case number.",
      "The sentencing date and the Code section you were convicted under.",
      "Whether you had ever had first offender treatment before.",
      "Whether the District Attorney or the Solicitor-General prosecuted the case.",
      "Your own account of the sentencing and what you were told about your options."
    ],
    sequence: [
      "Write down what you remember about the sentencing, in your own words, before you look at anything else. What you recall being told about your options is the fact the whole route turns on, and a first account written before reading documents is worth more than one written after.",
      "Then set out the case identifiers together: the convicting court, the county, the case number, the sentencing date and the Code section.",
      "Say whether you had ever been given first offender treatment before that case. Having had it already matters to eligibility.",
      "Say whether the District Attorney or the Solicitor-General prosecuted it, because that decides which office consent is sought from.",
      "Note whether you fall in the 1968 to 1982 window with a sentence of a year or less, since that is a separate way in that does not depend on what you were told.",
      "Try to obtain the sentencing transcript. Nobody can confirm from memory alone what you were or were not told, and the record is where that is read from. If you cannot get it, say so — that is useful information rather than a failure.",
      "Take all of this to the desk or attorney together with the explanation sheet. Do not approach the prosecuting attorney yourself."
    ],
    submissionMethod:
      "Nothing is submitted. You hand this to the desk or attorney taking the handoff.",
    fees: "No fee. This is your own record of the facts.",
    feeWaiver: "Not applicable.",
    noticeOrService: ["You serve nobody and notify nobody with this sheet."],
    expectedNextStage:
      "The desk or attorney has your account, your identifiers and whatever documents you could obtain, and can approach the prosecuting attorney from there.",
    canPrepare: [
      "This structure for your own account of the sentencing.",
      "The identifier checklist, so nothing is missing at the handover.",
      "The document list, including the transcript that the claim is read from."
    ],
    cannotPerform: [
      ...GA_CANNOT_PERFORM,
      "LegalEase does not assess your account, does not read your sentencing transcript, and does not decide whether you were eligible. The desk or attorney does that."
    ],
    escalations: [
      "You cannot obtain the sentencing transcript.",
      "You are unsure which office prosecuted the case.",
      "You are tempted to approach the prosecuting attorney yourself, which is the one thing not to do."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

type ComponentSpec = { componentId: string; templateId: string };

function packetSet(trackId: string, components: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: components.map((component, index) => {
      if (!GEORGIA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(`${component.componentId}: no Georgia guidance template ${component.templateId} is registered.`);
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
        requirement: "required" as const,
        order: index + 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      };
    })
  };
}

function georgiaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  components: readonly ComponentSpec[];
  requiredInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  // Built and put forward, not adopted. `legal_review_pending` is the in-type
  // expression of `recommended_for_counsel_adoption`.
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "legal_review_pending"
  } as const;

  return {
    jurisdiction: "GA",
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
    packetSet: packetSet(input.trackId, input.components),
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

const IMMIGRATION_INPUT: RequiredInput = {
  key: "immigrationConsequence",
  label: "Is any immigration consequence in play for you?",
  required: true
};

export const GEORGIA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  georgiaTrack({
    trackId: "ga-time-expired",
    publicName: "Arrests where charges were never filed",
    mechanism: "gcic_time_expired_records_restriction_without_request",
    authority: "O.C.G.A. § 35-3-37(h)(1)(A)(ii); § 35-3-39.1",
    recordTypes: [
      "arrest_cycle_held_by_gcic",
      "fingerprints_and_photographs_taken_in_conjunction_with_the_arrest"
    ],
    dispositions: ["no_disposition_and_no_notice_of_referral_to_a_prosecuting_attorney"],
    courtLevel: "not_a_court_process",
    components: [{ componentId: "ga-time-expired-process-guidance-1", templateId: "ga-time-expired-guidance" }],
    requiredInputs: [
      { key: "arrestDate", label: "On what date were you arrested?", required: true },
      {
        key: "offenseClass",
        label:
          "Was the offence a misdemeanour, a high and aggravated misdemeanour, a felony, or a serious violent felony or felony sexual offence with a victim under 16?",
        required: true
      },
      {
        key: "everCharged",
        label: "As far as you know, were charges ever filed against you for this arrest?",
        required: true
      },
      {
        key: "backgroundCheckScope",
        label:
          "Do you need this record to be clean for a federal or multi-state background check, for example for employment or licensing outside Georgia?",
        required: true
      },
      {
        key: "otherRestrictionRoute",
        label:
          "Did this case end in a dismissal, nolle prosse or acquittal that would qualify for a disposition-based restriction instead?",
        required: true
      }
    ],
    assembledPacketName: "Time-Expired-Records-Restriction-Explainer",
    assembledPacketTitle: "Arrests where charges were never filed",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Crime Information Center restricts an arrest record without any request once the applicable two, four or seven year period has run without notice of referral, that a later indictment unrestricts it, and that a time-expired restriction does not meet the federal definition of a sealed record so the record is still provided to the FBI and to other states.",
    notes:
      "The design requires consumer-facing copy to say restrict and, separately, seal, and records that Georgia has not used expungement in the statute since 1 July 2013 and that neither remedy destroys the record — the verifier enforces the vocabulary. It also requires the packet to state that a restriction or sealing may still be used to disqualify from employment or office in the same manner as a first offender discharge and does not supersede federally required disclosure, and never to tell a participant they may state the record does not exist; both are on every sheet. The Attorney General's determination that time-expired restrictions do not meet the federal definition of sealed records is surfaced as the design requires, which is why a participant needing a federal or multi-state check receives a typed stop rather than reassurance."
  }),

  georgiaTrack({
    trackId: "ga-fo-sentencing-post2026",
    publicName: "First Offender records restricted and sealed when you are sentenced",
    mechanism: "mandatory_first_offender_restriction_and_sealing_ordered_at_sentencing",
    authority: "O.C.G.A. § 42-8-62.1(b), (e), (f), (g), (h); 2026 Ga. Laws Act 403 (HB 162), § 3",
    recordTypes: [
      "first_offender_court_file",
      "clerk_criminal_history_record_information",
      "law_enforcement_jail_and_detention_center_arrest_records"
    ],
    dispositions: ["first_offender_treatment_imposed_at_sentencing_on_or_after_july_1_2026"],
    courtLevel: "sentencing_court",
    components: [
      {
        componentId: "ga-fo-sentencing-post2026-process-guidance-1",
        templateId: "ga-fo-sentencing-post2026-guidance"
      }
    ],
    requiredInputs: [
      {
        key: "sentencingPosture",
        label: "Have you already been sentenced, or are you being sentenced now?",
        required: true
      },
      {
        key: "sentencedUnderFirstOffenderAct",
        label: "Were you actually sentenced under Georgia's First Offender Act in the original case?",
        required: true
      },
      { key: "sentencingDate", label: "On what date were you sentenced?", required: true },
      {
        key: "statusRevoked",
        label: "Has the court revoked your First Offender status and entered an adjudication of guilt?",
        required: true
      },
      {
        key: "sentencingCourtAndCounty",
        label: "Which court sentenced you, in which county, and what is the case number?",
        required: true
      },
      { key: "representedByCounsel", label: "Do you have a lawyer in the criminal case?", required: true },
      IMMIGRATION_INPUT
    ],
    assembledPacketName: "First-Offender-Sentencing-Restriction-Explainer",
    assembledPacketTitle: "First Offender records restricted and sealed when you are sentenced",
    customerDeliverableDescription:
      "A guidance sheet explaining that as amended the court shall order first offender restriction and sealing at sentencing rather than may, what the order covers across the court file and the agencies, that the clerk seals within 60 days and the agencies comply within 30 days, that enumerated entities retain access, and that revocation removes the protection.",
    notes:
      "The design requires the guidance to say that the clerk seals within 60 days of the order, that law enforcement agencies, jails and detention centers must comply within 30 days of receiving a copy, that the enumerated entities retain access without a court order or affidavit, and that revocation with an adjudication of guilt removes restriction and sealing and permits dissemination — all four are on the sheet. A participant being sentenced now is a typed stop to defence counsel, because anything inside the live criminal case belongs there. A participant not sentenced under the Act is routed to the retroactive first offender route."
  }),

  georgiaTrack({
    trackId: "ga-rfo",
    publicName: "Asking for First Offender treatment you should have been given",
    mechanism: "retroactive_first_offender_petition_gated_on_prosecutor_consent",
    authority: "O.C.G.A. § 42-8-66(a) through (h)",
    recordTypes: ["georgia_conviction_where_first_offender_treatment_was_never_imposed"],
    dispositions: [
      "ordinary_conviction_where_the_individual_qualified_for_first_offender_sentencing_but_was_not_informed_of_eligibility",
      "sentence_entered_between_march_18_1968_and_october_31_1982_to_incarceration_not_exceeding_one_year_where_the_individual_would_otherwise_have_qualified"
    ],
    courtLevel: "convicting_court",
    components: [
      { componentId: "ga-rfo-process-guidance-1", templateId: "ga-rfo-guidance" },
      { componentId: "ga-rfo-process-guidance-2", templateId: "ga-rfo-factual-record-guidance" }
    ],
    requiredInputs: [
      {
        key: "sentencedUnderFirstOffenderAct",
        label:
          "Were you actually sentenced under Georgia's First Offender Act in the original case? If you were, this is not your route.",
        required: true
      },
      {
        key: "convictingCourtAndCounty",
        label: "Which court convicted you, in which county, and what is the case number?",
        required: true
      },
      { key: "sentencingDate", label: "On what date were you sentenced?", required: true },
      { key: "offenseCodeSection", label: "Which O.C.G.A. Code section were you convicted under?", required: true },
      {
        key: "firstOffenderEverUsed",
        label: "Had you ever been given First Offender treatment before this case?",
        required: true
      },
      {
        key: "informedOfEligibility",
        label: "Were you told at the time that you could be sentenced as a first offender?",
        required: true
      },
      {
        key: "historicalCategory",
        label:
          "Were you sentenced between 18 March 1968 and 31 October 1982 to incarceration of one year or less?",
        required: true
      },
      {
        key: "prosecutingAttorneyOffice",
        label: "Was the case prosecuted by the District Attorney or by the Solicitor-General for that county?",
        required: true
      },
      {
        key: "participantAccount",
        label: "In your own words: what do you remember about the sentencing, and what were you told about your options?",
        required: true
      },
      {
        key: "readyForConsentStage",
        label: "Are you ready to take this to a desk or attorney to seek the prosecuting attorney's consent?",
        required: true
      },
      IMMIGRATION_INPUT
    ],
    assembledPacketName: "Retroactive-First-Offender-Route-And-Factual-Record",
    assembledPacketTitle: "Asking for First Offender treatment you should have been given",
    customerDeliverableDescription:
      "A two-part guidance packet: an explanation of the retroactive first offender route, what a grant is worth, the no-filing-fee rule and the prosecutor-consent gate; and a structured sheet organising the participant's own factual account and case identifiers for the records-restriction desk or attorney who approaches the prosecuting attorney.",
    notes:
      "The design records the self-help stop as always occurring at the consent stage, because obtaining the prosecuting attorney's advance consent is negotiation with an opposing party, and states that LegalEase's role is to identify the candidate, explain the gate and prepare the participant's factual record. This job therefore does not generate the § 42-8-66 petition: the petition cannot be filed before consent, and its eligibility claim turns on what the participant was told at the original sentencing, which the design says requires assessment of the sentencing record and which LegalEase never inspects. The adopted design allocates two process-guidance components to this track, and the second is the factual record the design calls for. The no-filing-fee rule under § 42-8-66(h), the effect of a grant converting the conviction into a first offender discharge, and the distribution of the order to the participant, the prosecuting attorney, the Crime Information Center and the Department of Driver Services are all stated."
  })
];
