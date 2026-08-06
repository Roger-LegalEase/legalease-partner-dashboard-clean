// Nebraska process guidance — one automatic verification route and six routing
// nodes.
//
// Seven assigned routes, all `process_guidance`, and not one of them produces a
// participant submission:
//
//   - `ne-nonconviction-auto` is relief by operation of law. Under Neb. Rev.
//     Stat. § 29-3523(3) criminal history record information about an arrest,
//     citation in lieu of arrest or referral for prosecution becomes
//     confidential on the statutory timetable, and the agency must then answer a
//     public inquiry as if there were no such information. The court and the
//     agencies carry the duties under § 29-3523(7). Nothing is applied for.
//     State v. Coble, 299 Neb. 434 (2018), holds that § 29-3523 does not
//     authorise a motion to make criminal history record information non-public
//     and that the remedy for non-compliance is a separate action under
//     § 29-3528 — so a motion filed in the criminal case invites a
//     jurisdictional dismissal. This sheet says so, and routes the still-public
//     record to `ne-seal-enforcement` instead. That is a backstop the adopted
//     design already contains; it is not a new remedy invented here.
//
//   - the six routing nodes decide, at intake, which body a participant belongs
//     in front of: the juvenile court, the Board of Pardons, the clemency
//     process for firearm rights, another sovereign, immigration counsel, or
//     post-conviction counsel. Each is a verification-or-routing node in the
//     normalized design, so guidance is the whole of the assigned output.
//
// Two of those six are routed for a reason the design states plainly and this
// module repeats rather than dresses up: a participant-facing filing does exist
// and LegalEase has chosen not to serve it. Juvenile sealing has a statute, four
// official statewide forms and published hearing instructions; the Board of
// Pardons has an application; the Postconviction Act has a verified motion. The
// design records each as a product-scope decision and not a capability finding,
// and the sheets say "we do not do this" rather than implying it cannot be done.
//
// Two gates run on every Nebraska route because the design puts them there:
// record jurisdiction is the first question in the Nebraska intake and precedes
// every other one, so nobody is quoted a packet that cannot reach their record;
// and immigration exposure is screened on every Nebraska track, before anything
// is generated rather than after, because filing can surface a record a
// participant would rather not surface.
//
// Three things the design forbids, and which no template here does:
//
//   - No section number for the deferred judgment or pretrial diversion
//     statutes appears in participant copy. Their primary text was not read at
//     source, and the design records that as a release blocker. The branches are
//     described in words instead; nothing is lost to a reader, and nothing
//     unverified is asserted.
//   - Nothing here says a mayoral pardon of a Lincoln or Omaha city ordinance
//     violation supports a motion to seal. Whether it does is an open question
//     in the design, and the sheet says it is unsettled.
//   - Nothing here states what Laws 2025, LB530 changed in the juvenile sealing
//     statute. The design records the amendment and records that its substance
//     was not determined.
//
// And the thing every automatic route has to get right: "automatic" describes
// what the law does, not what has happened in this participant's case. Every
// sheet tells the participant how to look, and treats the route as pending until
// they have looked.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Nebraska is
// not an enabled jurisdiction and this job does not enable one. Nebraska's
// set-aside, sealing, law-enforcement-error and seal-enforcement tracks are
// other jobs and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The two places a Nebraska participant looks themselves up. Named once. */
const NE_RECORD_CHECK =
  "your own Nebraska criminal history, through the limited criminal history search the Nebraska State Patrol offers at nebraska.gov, and the case itself on the Nebraska Judicial Branch online case search";

/**
 * Said on every sheet in this family.
 *
 * "Automatic" is a statement about the mechanism, not about the participant's
 * case, and a sheet that blurs the two has told them their record is gone.
 */
const AUTOMATIC_IS_NOT_A_REPORT =
  "Automatic describes what the law does, not what has happened in your case. Nothing on this page tells you that your record has come off, and LegalEase has not looked. Until you have checked for yourself, treat this as pending rather than done.";

/** The private-database limit, on every sheet that touches a Nebraska record. */
const PRIVATE_DATABASES =
  "Sealing does not reach privately maintained websites or private background-check databases. An agency that passes on sealed information without authority is subject to a penalty under Neb. Rev. Stat. § 29-3527, but a private data broker is outside a Nebraska court's reach and a copy already sold on stays sold on.";

/** Coble. Repeated because filing the wrong thing is the expensive mistake here. */
const NO_MOTION_ON_THIS_ROUTE =
  "Do not file a motion in the criminal case about this. In State v. Coble the Nebraska Supreme Court held that section 29-3523 does not authorise a motion to make criminal history record information non-public, and that the remedy where an agency has not complied is a separate action under section 29-3528. A motion filed in the criminal case invites a dismissal for want of jurisdiction.";

/** The firearm warning the design hard-wires into every Nebraska track. */
const FIREARMS_NOT_RESTORED =
  "No Nebraska record-clearing packet restores firearm rights, and nothing LegalEase prepares should be read as doing so. A set-aside does not: Neb. Rev. Stat. § 29-2264(6) preserves the conviction for the firearm statute, and § 29-2264(5)(c) requires the set-aside order itself to tell you to consult an attorney about firearm effects. Restoration runs through the Board of Pardons.";

/** Four bullets, deliberately. See the pagination note on the sources list. */
const NE_SOURCES: readonly string[] = [
  "Neb. Rev. Stat. §§ 29-3523, 29-3527 and 29-3528 (criminal history record information); § 29-2264 (set aside); §§ 43-2,108.01 to 43-2,108.05 (juvenile records).",
  "Neb. Const. art. IV, § 13 and Neb. Rev. Stat. §§ 83-1,126 to 83-1,134 (Board of Pardons); Nebraska Postconviction Act, Neb. Rev. Stat. § 29-3001 et seq.",
  "State v. Coble, 299 Neb. 434 (2018).",
  "Nebraska Judicial Branch self-help pages on adult record sealing and on pardons; Nebraska State Patrol limited criminal history search."
];

const NE_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, expunge or set aside anything, and cannot make a court, the Nebraska State Patrol, the Commission on Law Enforcement and Criminal Justice, any other agency or the Board of Pardons act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the process is; it is not legal advice.",
  "LegalEase does not obtain, inspect, hold or authenticate your criminal history. You request your own copy and you read it.",
  "LegalEase has not contacted any court, agency or board about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NebraskaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NebraskaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Nebraska route. */
export class NebraskaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NebraskaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NebraskaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NebraskaBranchError";
  }
}

export const NE_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** The first gate in the Nebraska intake, ahead of every other question. */
export const NE_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  nebraska: true,
  another_state: false,
  federal: false,
  tribal: false
};

/**
 * How the matter ended, in the words § 29-3523(3) uses.
 *
 * `deferred_judgment_dismissal` and `problem_solving_court_completed` are named
 * as outcomes, never by the section numbers of the statutes that create them:
 * that primary text was not read at source and the design blocks release on it.
 */
export const NE_DISPOSITION_CATEGORIES: Readonly<Record<string, string>> = {
  no_charges_filed: "one_year",
  diversion_completed: "two_years",
  dismissed: "immediate",
  acquitted: "immediate",
  deferred_judgment_dismissal: "immediate",
  problem_solving_court_completed: "immediate",
  unclear: "unclear"
};

/** What the Board of Pardons will and will not consider. */
export const NE_PARDON_OFFENCE_TYPES: Readonly<Record<string, boolean>> = {
  traffic_violation: false,
  driving_under_the_influence: false,
  driving_under_suspension: false,
  other: true
};

export const NE_CONVICTION_LEVELS: Readonly<Record<string, string>> = {
  felony: "ten years",
  misdemeanor: "three years"
};

/** A warrant of discharge is not a pardon, and does not unlock the seal route. */
export const NE_CLEMENCY_DOCUMENTS: Readonly<Record<string, string>> = {
  pardon: "pardon",
  warrant_of_discharge: "warrant_of_discharge",
  neither: "neither"
};

export const NE_FIREARM_RIGHTS_REMOVED_BY: Readonly<Record<string, string>> = {
  felony_conviction: "felony_conviction",
  domestic_violence_misdemeanor: "domestic_violence_misdemeanor"
};

export const NE_JUVENILE_DISPOSITIONS: Readonly<Record<string, string>> = {
  no_charges: "automatic",
  dismissed: "automatic",
  diversion_or_similar_completed: "automatic",
  adjudication_completed: "automatic",
  other: "motion"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NebraskaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualized legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

/** Nebraska free and low-cost help, named once so no stop is a dead end. */
const NE_LEGAL_HELP = "Legal Aid of Nebraska, a Nebraska legal clinic, or a Nebraska attorney";

/**
 * Validates participant answers and routes to the correct Nebraska node.
 *
 * The order is the design's order: record jurisdiction first, because it decides
 * whether any Nebraska packet can reach the record at all; immigration exposure
 * second, because it is screened on every Nebraska track and must be raised
 * before anything is generated; then the eligibility-advice stop; then the
 * route's own questions.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries both a destination and the next step to take there, so no
 * negative case terminates without somewhere to go.
 */
export function deriveNebraskaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Jurisdiction, on every route except the node that exists to answer
  // it. Asked first so that nobody is quoted a Nebraska packet for a record no
  // Nebraska court or agency can reach.
  const jurisdiction = branch(
    trackId,
    "recordJurisdiction",
    NE_RECORD_JURISDICTIONS,
    facts.recordJurisdiction
  );
  if (trackId !== "ne-out-of-jurisdiction-routing" && !jurisdiction.resolved) {
    throw new NebraskaRouteMismatchError(
      trackId,
      "record_is_not_a_nebraska_record",
      "No Nebraska court or agency can clear a federal, out-of-state or tribal record. Relief, if any, lies under the law of the sovereign that holds it.",
      "the Nebraska out-of-jurisdiction routing sheet",
      "Read that sheet, then take the record to the state, federal or tribal authority that holds it. If you also hold Nebraska records, those are handled separately and only those are served here."
    );
  }
  if (trackId === "ne-out-of-jurisdiction-routing" && jurisdiction.resolved) {
    throw new NebraskaRouteMismatchError(
      trackId,
      "record_is_a_nebraska_record",
      "This node is for a record held by another sovereign. A Nebraska record is served by the Nebraska routes.",
      "the Nebraska record-clearing routes",
      "Go back to the Nebraska intake and answer the questions for the Nebraska record you hold."
    );
  }

  // Gate 2. Immigration exposure, screened on every Nebraska track, before
  // anything is generated rather than after.
  const immigration = branch(
    trackId,
    "immigrationStatusInPlay",
    NE_YES_NO,
    facts.immigrationStatusInPlay
  );
  if (trackId !== "ne-immigration-routing" && immigration.resolved) {
    throw new NebraskaRouteMismatchError(
      trackId,
      "immigration_exposure_screened_on_every_track",
      "Immigration consequences are governed by federal law and no Nebraska mechanism reaches them. This is screened before anything is generated, because filing can surface a record you would rather not surface.",
      "the Nebraska immigration routing sheet, and then an immigration attorney",
      "Read that sheet and speak to an immigration attorney before anything is generated or filed on any Nebraska route."
    );
  }
  if (trackId === "ne-immigration-routing" && !immigration.resolved) {
    throw new NebraskaRouteMismatchError(
      trackId,
      "no_immigration_exposure_to_route",
      "This node exists to route a participant whose immigration status could be affected. Without that exposure there is nothing here to route.",
      "the Nebraska record-clearing routes",
      "Go back to the Nebraska intake and continue on the route that matches your record."
    );
  }

  // Gate 3. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(
    trackId,
    "wantsEligibilityAdvice",
    NE_YES_NO,
    facts.wantsEligibilityAdvice
  );
  if (wantsAdvice.resolved) {
    throw new NebraskaGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      NE_LEGAL_HELP,
      "Take your criminal history and your court records to one of them and ask about your own case."
    );
  }

  if (trackId === "ne-nonconviction-auto") {
    const disposition = branch(
      trackId,
      "ncaDispositionCategory",
      NE_DISPOSITION_CATEGORIES,
      facts.ncaDispositionCategory
    );
    if (disposition.resolved === "unclear") {
      throw new NebraskaGuidanceStopError(
        trackId,
        "disposition_type_unclear_from_the_record",
        "Which branch of section 29-3523(3) applies is decided by how the matter ended, and an outcome that is genuinely unclear from the record cannot be read off a guidance sheet.",
        "the clerk of the court that handled the case, and then " + NE_LEGAL_HELP,
        "Ask the clerk for the disposition entry, then have someone read it with you before you rely on any timetable."
      );
    }
    derived.ncaWaitingBranch = disposition.resolved;

    // The disposition date, not the arrest date, decides the branch.
    const before2017 = branch(
      trackId,
      "ncaDispositionBefore2017",
      NE_YES_NO,
      facts.ncaDispositionBefore2017
    );
    if (before2017.resolved) {
      throw new NebraskaRouteMismatchError(
        trackId,
        "disposition_predates_the_automatic_route",
        "The automatic route reaches dispositions from 1 January 2017 onwards. A dismissal or acquittal before that date is not swept up by it, and is dealt with by asking a court to seal the case.",
        "the Nebraska pre-2017 sealing route",
        "Go back to the Nebraska intake and answer the questions for a case dismissed before 2017."
      );
    }

    const separate = branch(
      trackId,
      "ncaSeparateProsecution",
      NE_YES_NO,
      facts.ncaSeparateProsecution
    );
    if (separate.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "separate_prosecution_or_correctional_control",
        "Section 29-3523 does not treat the information as confidential during any period in which the person is the subject of prosecution or correctional control arising from a separate arrest. While that is true of you, the automatic route is suspended.",
        NE_LEGAL_HELP,
        "Ask about your own timing once the separate matter has ended, and check your record again then."
      );
    }

    const office = branch(trackId, "ncaPublicOffice", NE_YES_NO, facts.ncaPublicOffice);
    if (office.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "announced_candidate_for_or_holder_of_public_office",
        "Section 29-3523 does not treat the information as confidential during any period in which the person is an announced candidate for, or a holder of, public office.",
        NE_LEGAL_HELP,
        "Ask about your own position before relying on the automatic route, and check your record again if that changes."
      );
    }

    const firearmGoal = branch(
      trackId,
      "firearmRestorationIsTheGoal",
      NE_YES_NO,
      facts.firearmRestorationIsTheGoal
    );
    if (firearmGoal.resolved) {
      throw new NebraskaRouteMismatchError(
        trackId,
        "firearm_restoration_is_the_actual_goal",
        "Sealing a non-conviction record does not restore firearm rights, and no Nebraska record-clearing packet does. Restoration runs through the Board of Pardons.",
        "the Nebraska firearm-rights routing sheet",
        "Read that sheet, then take the pardon route if firearm rights are what you are after."
      );
    }

    // The verification step, and the design's own backstop when it fails.
    const stillShowing = branch(
      trackId,
      "ncaRecordStillPublic",
      NE_YES_NO,
      facts.ncaRecordStillPublic
    );
    const periodHasRun = branch(
      trackId,
      "ncaPeriodHasRun",
      NE_YES_NO,
      facts.ncaPeriodHasRun
    );
    if (stillShowing.resolved && periodHasRun.resolved) {
      throw new NebraskaRouteMismatchError(
        trackId,
        "record_still_public_after_the_applicable_period",
        "Where the applicable period has run and the record is still being disclosed, the answer is an action to enforce the statute against the agency, not a motion in the criminal case. State v. Coble puts the remedy for non-compliance in a separate action under section 29-3528.",
        "the Nebraska seal-enforcement route",
        "Go back to the Nebraska intake and answer the questions for making an agency clear a record that should already be sealed. Keep the dated copy of the record you checked."
      );
    }

    const privateDatabase = branch(
      trackId,
      "ncaAppearsInPrivateDatabase",
      NE_YES_NO,
      facts.ncaAppearsInPrivateDatabase
    );
    if (privateDatabase.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "copy_held_in_a_private_background_check_database",
        "A copy held by a privately maintained website or a private background-check database is outside what a Nebraska court order reaches. The statutory penalty for unauthorized dissemination applies to those subject to the act, not to a private data broker.",
        "the operator of that website or database, and " + NE_LEGAL_HELP,
        "Use the private operator's own dispute or correction process, and take advice about consumer-reporting remedies. Nebraska record clearing is not that remedy."
      );
    }
  }

  if (trackId === "ne-juvenile-sealing-routing") {
    const underEighteen = branch(trackId, "jsUnderEighteen", NE_YES_NO, facts.jsUnderEighteen);
    if (!underEighteen.resolved) {
      throw new NebraskaRouteMismatchError(
        trackId,
        "offence_was_not_a_juvenile_matter",
        "This node is about a record from a juvenile matter. A record from an offence committed at eighteen or over is an adult record.",
        "the Nebraska adult record-clearing routes",
        "Go back to the Nebraska intake and answer the questions for the adult record."
      );
    }
    branch(trackId, "jsDispositionCategory", NE_JUVENILE_DISPOSITIONS, facts.jsDispositionCategory);

    const currentlyAMinor = branch(
      trackId,
      "jsCurrentlyAMinor",
      NE_YES_NO,
      facts.jsCurrentlyAMinor
    );
    if (currentlyAMinor.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "participant_is_currently_a_minor",
        "LegalEase serves an adult participant, and a person who is still a minor is not one. The juvenile sealing statute is also written so that a parent or guardian may act.",
        "a parent or guardian, together with " + NE_LEGAL_HELP,
        "Have a parent, guardian or lawyer take the case to the juvenile court of record, or to the county court sitting as a juvenile court."
      );
    }

    const spansBoth = branch(
      trackId,
      "jsSpansAdultAndJuvenile",
      NE_YES_NO,
      facts.jsSpansAdultAndJuvenile
    );
    if (spansBoth.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "record_spans_juvenile_and_adult_cases",
        "A record that spans both juvenile and adult cases is two different processes in two different places, and treating it as one is how part of it gets missed.",
        NE_LEGAL_HELP + ", for the juvenile part",
        "Split them. Take the juvenile cases to the juvenile court of record with help, and bring the adult cases back to the Nebraska adult routes."
      );
    }
  }

  if (trackId === "ne-pardon-routing") {
    const offence = branch(
      trackId,
      "prOffenceType",
      NE_PARDON_OFFENCE_TYPES,
      facts.prOffenceType
    );
    if (!offence.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "offence_the_board_will_not_consider",
        "The Nebraska Judicial Branch records that the Board of Pardons will not consider pardons for traffic violations, driving under the influence, or driving under suspension. A conviction of that kind cannot reach the pardoned-conviction sealing route either, because that route needs a pardon first.",
        NE_LEGAL_HELP,
        "Ask whether any other Nebraska route reaches your conviction. Do not prepare a pardon application for an offence the Board has said it will not consider."
      );
    }

    const level = branch(trackId, "prConvictionLevel", NE_CONVICTION_LEVELS, facts.prConvictionLevel);
    derived.prWaitingPeriod = level.resolved;

    const waitingRun = branch(trackId, "prWaitingPeriodHasRun", NE_YES_NO, facts.prWaitingPeriodHasRun);
    if (!waitingRun.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "board_waiting_period_has_not_run_or_has_restarted",
        `The Nebraska Judicial Branch publishes the Board's waiting period as ${level.resolved} for a ${level.value}, running from completion of the sentence and restarting on any contact with law enforcement or any additional conviction. Until it has run there is nothing to take to the Board.`,
        "the Nebraska Board of Pardons, once the period has run",
        "Note the date your sentence was completed, keep it clean, and check the Board's own published requirements again before you apply."
      );
    }

    const clemency = branch(
      trackId,
      "prDocumentHeld",
      NE_CLEMENCY_DOCUMENTS,
      facts.prDocumentHeld
    );
    if (clemency.resolved === "warrant_of_discharge") {
      throw new NebraskaGuidanceStopError(
        trackId,
        "participant_holds_a_warrant_of_discharge_not_a_pardon",
        "A warrant of discharge is not a pardon. The Nebraska route that seals a pardoned conviction needs a pardon, and a discharge does not stand in for one.",
        NE_LEGAL_HELP,
        "Take the document you hold to someone who can read it with you, and ask the Board what it is before you rely on it."
      );
    }
    branch(trackId, "prCityOrdinance", NE_YES_NO, facts.prCityOrdinance);
  }

  if (trackId === "ne-firearm-restoration-routing") {
    const goal = branch(trackId, "frGoal", NE_YES_NO, facts.frGoal);
    if (!goal.resolved) {
      throw new NebraskaRouteMismatchError(
        trackId,
        "firearm_restoration_is_not_the_goal",
        "This node exists for a participant who is trying to get firearm rights back. If that is not what you are after, the ordinary Nebraska record-clearing routes are.",
        "the Nebraska record-clearing routes",
        "Go back to the Nebraska intake and answer the questions for the record you want cleared."
      );
    }
    branch(trackId, "frRightsRemovedBy", NE_FIREARM_RIGHTS_REMOVED_BY, facts.frRightsRemovedBy);
  }

  if (trackId === "ne-postconviction-routing") {
    const disputes = branch(trackId, "pcDisputesConviction", NE_YES_NO, facts.pcDisputesConviction);
    const wantsVacatur = branch(trackId, "pcWantsVacatur", NE_YES_NO, facts.pcWantsVacatur);
    if (!disputes.resolved && !wantsVacatur.resolved) {
      throw new NebraskaRouteMismatchError(
        trackId,
        "participant_wants_record_clearing_not_vacatur",
        "This node is for a participant who says the conviction should not stand. Someone who accepts the conviction and wants its effects cleared is on a record-clearing route.",
        "the Nebraska record-clearing routes",
        "Go back to the Nebraska intake and answer the questions for the record you want cleared."
      );
    }
    const activeAppeal = branch(trackId, "pcActiveAppeal", NE_YES_NO, facts.pcActiveAppeal);
    if (activeAppeal.resolved) {
      throw new NebraskaGuidanceStopError(
        trackId,
        "active_appeal_in_the_case",
        "A case under appeal is live litigation. Nothing should be prepared or filed around it without the lawyer running it.",
        "the attorney handling the appeal, or " + NE_LEGAL_HELP,
        "Speak to that attorney first. Come back to record clearing when the case has finished."
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

/**
 * A routing node's sheet.
 *
 * These six nodes are the ones the design classifies as verification or routing.
 * Nothing is filed at any of them, and each names the body the participant
 * actually belongs in front of. Where the reason LegalEase does not serve the
 * route is a product-scope decision rather than a legal one, `scopeNote` says so
 * in the participant's own words.
 */
function routingGuidance(input: {
  templateId: string;
  mechanismName: string;
  processType: GuidanceTemplate["processType"];
  whyNotAFiling: string;
  destination: { name: string; detail: string };
  prerequisites: readonly string[];
  documentsToObtain?: readonly string[];
  gather: readonly string[];
  sequence: readonly string[];
  expectedNextStage: string;
  extraCanPrepare?: readonly string[];
  extraCannotPerform?: readonly string[];
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
    documentsToObtain: input.documentsToObtain ?? [`A copy of ${NE_RECORD_CHECK}.`],
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: input.sequence,
    submissionMethod:
      "There is nothing to submit to LegalEase and nothing for LegalEase to file. This page routes you; it is not a step towards a document prepared here.",
    fees: "None. There is nothing to file on this route, so there is nothing to pay for on it.",
    feeWaiver: "Not applicable. There is no fee to waive where there is nothing to file.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve on this route.",
      "Nobody writes to tell you where you should have gone. That is what this page is for."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: [
      "This explanation of what the process is and who runs it.",
      "A plain list of what to gather before you go.",
      ...(input.extraCanPrepare ?? [])
    ],
    legalEaseCannotPerform: [...NE_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      ...input.escalations
    ],
    officialSourceReferences: NE_SOURCES
  };
}

export const NEBRASKA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // The one route in this family where the law itself does the work.
  "ne-nonconviction-auto-guidance": {
    templateId: "ne-nonconviction-auto-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Checking whether a Nebraska non-conviction record came off the public record",
    whyNotAFiling:
      "Nothing is filed and nothing is applied for. Under Neb. Rev. Stat. § 29-3523(3) the information becomes confidential by operation of law on the statutory timetable, and § 29-3523(7) puts the notification and sealing duties on the court and on the agencies holding the record. There is no application, petition or motion on this route, so none is generated. State v. Coble holds that a motion under this section fails for want of jurisdiction.",
    processType: "automatic",
    prerequisites: [
      "The record is a Nebraska record.",
      "The matter ended without a conviction: no charges were filed, charges were not filed after you completed diversion, the case was dismissed, you were acquitted, the case was dismissed after a deferred judgment, or it was dismissed after you completed a problem-solving court programme.",
      "The disposition was on or after 1 January 2017. The disposition date decides this, not the arrest date. An earlier dismissal or acquittal is dealt with by asking a court to seal the case.",
      "You are not currently the subject of prosecution or correctional control from a separate arrest, and you are not an announced candidate for or a holder of public office. Section 29-3523 suspends confidentiality during either."
    ],
    documentsToObtain: [
      `A copy of ${NE_RECORD_CHECK}.`,
      "The court's disposition entry for the case, from the clerk of the court that handled it, if what happened is not clear from the case search."
    ],
    participantDataToGather: [
      "How the matter ended, and the date it ended.",
      "The date you were arrested, cited or referred for prosecution.",
      "Whether you are currently being prosecuted, or under correctional control, from any separate arrest.",
      "Whether you are an announced candidate for or a holder of public office.",
      "Whether the matter was still showing when you checked."
    ],
    officialDestination: {
      name: "The court that handled the case, and the criminal justice agencies holding the record",
      detail:
        "Section 29-3523(7) places the notification and sealing duties on the court and on the agencies. The court notifies the Commission on Law Enforcement and Criminal Justice, the Nebraska State Patrol, the agencies and attorneys named in the record, and any transferring court. Nothing is submitted by you."
    },
    actionSequence: [
      AUTOMATIC_IS_NOT_A_REPORT,
      "Work out which timetable applies from how the matter ended. Where no charges were filed, the information becomes confidential one year after the arrest, citation or referral. Where charges were not filed because you completed diversion, it is two years. Where charges were filed and the case was dismissed on the prosecutor's motion, dismissed after a hearing and not subject to a pending appeal, ended in acquittal, was dismissed after a deferred judgment, or was dismissed after you completed a problem-solving court programme, it is immediate — on entry of the dismissal, or on notification after an acquittal.",
      `Once that period has run, get a copy of ${NE_RECORD_CHECK}, and keep it with the date you pulled it.`,
      "Look the matter up. Where the section has done its work, a criminal justice agency must respond to a public inquiry as if there were no such information.",
      "Section 29-3523(8) also says you cannot be questioned about the offence in an application for employment, bonding, a licence, education or any other right or privilege, as a witness, or in any other public inquiry, and that you may answer as if it never occurred.",
      "Some disclosure continues by design and is not a failure of the section: information still flows to criminal justice agencies, in de-identified aggregate form, and for approved research. It also flows to a specific person you authorise yourself, by a notarized request — that request is the one notarized document on this route, it is yours to make or not make, and it releases information rather than clearing it.",
      "Check what you have written down against what the record actually says — the ending, the date it ended, and the date of the arrest, citation or referral. Where they disagree, the record is what counts, and the timetable you worked out from your own memory may be the wrong one.",
      NO_MOTION_ON_THIS_ROUTE,
      "If the period has run and the record is still being disclosed, that is an enforcement problem with an agency, and Nebraska has a separate route for it. Keep the copy you pulled and the date you pulled it: that is the evidence that the information was still being disclosed after the period had run, and it is the first thing anyone taking the enforcement route will ask you for.",
      PRIVATE_DATABASES,
      FIREARMS_NOT_RESTORED
    ],
    submissionMethod:
      "There is nothing to submit. No application, petition or motion exists for this route, and filing one in the criminal case invites a dismissal for want of jurisdiction.",
    fees: "None. There is nothing to file, so there is nothing to pay.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "The court does the notifying, to the Commission on Law Enforcement and Criminal Justice, the Nebraska State Patrol, the agencies and attorneys named in the record, and any transferring court.",
      "Nobody writes to tell you it has happened. Looking yourself up is how you find out."
    ],
    expectedNextStage:
      "You check after the applicable period has run and the matter is no longer disclosed on a public inquiry. Until you have checked, treat it as pending.",
    legalEaseCanPrepare: [
      "This explanation of which timetable applies to which ending, and what the section does when it applies.",
      "A plain list of what to check and where to get it.",
      "The warning that a motion in the criminal case is the wrong instrument, and what the right route is instead.",
      "The list of disclosures the section preserves, so that a record you can still see through one of those channels is not mistaken for a failure of the section."
    ],
    legalEaseCannotPerform: [
      ...NE_CANNOT_PERFORM,
      "LegalEase cannot tell you that a record has been sealed. Nothing here is a report about your case, and no page of it says the record came off."
    ],
    escalationTriggers: [
      "The period has run and the record is still being disclosed.",
      "You want advice about whether a particular record qualifies.",
      "You are being prosecuted, or are under correctional control, from a separate arrest.",
      "You are an announced candidate for or a holder of public office.",
      "How the matter ended is genuinely unclear from the record.",
      "The record is in a private background-check database, which no Nebraska court order reaches."
    ],
    officialSourceReferences: NE_SOURCES
  },

  "ne-juvenile-sealing-routing-guidance": routingGuidance({
    templateId: "ne-juvenile-sealing-routing-guidance",
    mechanismName: "Where to go about a Nebraska juvenile record",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here. This page routes. Nebraska juvenile records are outside the adult scope of this product, so LegalEase does not prepare the juvenile motion — the route exists in Nebraska law and is served by the juvenile court, not by LegalEase.",
    destination: {
      name: "The juvenile court of record, or the county court sitting as a juvenile court",
      detail:
        "That court holds the juvenile case and runs the sealing process, whether it is the automatic one or the motion one. The Nebraska Judicial Branch publishes the juvenile sealing forms and hearing instructions."
    },
    prerequisites: [
      "The record is a Nebraska juvenile record — the offence was committed before you turned eighteen.",
      "You are no longer a minor. Where the person is still a minor, a parent or guardian acts."
    ],
    gather: [
      "Whether you were under eighteen at the time of the offence.",
      "How the juvenile matter ended: no charges, dismissed, a diversion or similar programme completed, or an adjudication you completed.",
      "When the case closed, and when you turned eighteen.",
      "Whether the record is still showing.",
      "Whether any of your cases were adult cases."
    ],
    sequence: [
      "Nebraska seals some juvenile records without anybody asking: where no charges were filed, where charges were filed and dismissed, where diversion, mediation, restorative justice, probation or treatment was completed, or where an adjudication was followed by satisfactory completion.",
      AUTOMATIC_IS_NOT_A_REPORT,
      "Where automatic sealing does not apply, the statute lets the person, or a parent or guardian, move to seal in the court of record once the person reaches the age of majority or six months after the case closes, whichever comes first.",
      "A sealed juvenile record is deemed never to have occurred.",
      "LegalEase does not prepare the juvenile motion. That is a decision about what this product covers, not a finding that the route cannot be run: Nebraska has the statute, the judiciary publishes the forms and the hearing instructions, and a lawyer or a clinic can run it.",
      "Take it to the juvenile court of record, or to the county court sitting as a juvenile court, and ask for the sealing forms and instructions the judiciary publishes.",
      "One of the sections in this chapter was amended in 2025. What that amendment changed has not been confirmed here, so check the current text with the court or with a lawyer rather than relying on a summary."
    ],
    expectedNextStage:
      "The juvenile court tells you whether the record sealed on its own or whether a motion is needed, and gives you its own forms and instructions.",
    extraCanPrepare: [
      "The distinction between the juvenile records that seal on their own and the ones that need a motion."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare the Nebraska juvenile motion to seal, and does not appear at a juvenile sealing hearing."
    ],
    escalations: [
      "You are still a minor, so a parent or guardian needs to act.",
      "Your record covers both juvenile and adult cases, which are two different processes in two different places.",
      "You want the juvenile motion prepared, which LegalEase does not do."
    ]
  }),

  "ne-pardon-routing-guidance": routingGuidance({
    templateId: "ne-pardon-routing-guidance",
    mechanismName: "Where to go about a Nebraska pardon",
    processType: "agency",
    whyNotAFiling:
      "Nothing is filed here and nothing is filed with a court. This page routes you to the Board of Pardons, which is an executive body, not a court. The Board has its own application; LegalEase does not prepare it.",
    destination: {
      name: "The Nebraska Board of Pardons",
      detail:
        "The Board is the Governor, the Attorney General and the Secretary of State. It grants pardons under the Nebraska Constitution and the clemency statutes, and it publishes its own application and requirements. Nothing is submitted through LegalEase."
    },
    prerequisites: [
      "The conviction is a Nebraska conviction. Nebraska cannot pardon a federal or an out-of-state conviction.",
      "The offence is not a traffic violation, driving under the influence, or driving under suspension. The judiciary records that the Board will not consider those.",
      "Your sentence is complete, and the Board's waiting period has run from that completion."
    ],
    gather: [
      "Whether the conviction was a felony or a misdemeanor.",
      "The date you finished your sentence.",
      "What the offence was.",
      "Whether it was a city ordinance violation in Lincoln or Omaha.",
      "Any contact with law enforcement, or any further conviction, since you finished.",
      "Whether what you hold is a pardon or a warrant of discharge."
    ],
    sequence: [
      "A pardon nullifies the conviction. It is also the only route to firearm-rights restoration, and it is what the Nebraska route for sealing a pardoned conviction needs before it can be used at all.",
      "The Nebraska Judicial Branch publishes the Board's waiting periods as ten years for a felony and three years for a misdemeanor, running from completion of the sentence, and records that the period restarts on any contact with law enforcement or any additional conviction.",
      "The judiciary also records that the Board will not consider pardons for traffic violations, driving under the influence, or driving under suspension. A conviction of that kind cannot reach the pardoned-conviction sealing route either.",
      "The Board may grant a pardon with or without restoring firearm rights. The two are decided together, by the Board, and neither is automatic.",
      "A warrant of discharge is not a pardon, and does not open the sealing route.",
      "Where the conviction was a city ordinance violation, Lincoln and Omaha each operate their own mayoral pardon process. Whether a mayoral pardon of a city ordinance violation supports a Nebraska motion to seal has not been settled here, and this page does not say that it does. Ask the city and ask a lawyer before relying on it.",
      "Go to the Board of Pardons for its current application and its current requirements, and use those rather than any summary.",
      "LegalEase does not prepare the pardon application. That is a decision about what this product covers, not a finding that the application cannot be prepared."
    ],
    expectedNextStage:
      "The Board's own published requirements and application tell you what it wants and when it will consider it.",
    extraCanPrepare: [
      "The waiting periods the judiciary publishes, and what restarts them.",
      "The list of offences the Board has said it will not consider."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare or submit the Board of Pardons application, and does not appear before the Board.",
      "LegalEase cannot tell you whether the Board will grant a pardon. That is the Board's decision alone."
    ],
    escalations: [
      "The waiting period has not run, or has restarted on a later contact.",
      "The offence is one the Board will not consider.",
      "You hold a warrant of discharge rather than a pardon.",
      "The conviction was a city ordinance violation and you want to rely on a mayoral pardon."
    ]
  }),

  "ne-firearm-restoration-routing-guidance": routingGuidance({
    templateId: "ne-firearm-restoration-routing-guidance",
    mechanismName: "Where to go about restoring firearm rights in Nebraska",
    processType: "agency",
    whyNotAFiling:
      "Nothing is filed here. This page routes. There is no standalone statewide firearm-restoration application in Nebraska to prepare: restoration runs through the Board of Pardons, and no participant-facing instrument separate from clemency was identified.",
    destination: {
      name: "The Nebraska Board of Pardons",
      detail:
        "Firearm rights removed by a conviction are restored through the clemency process. The Nebraska Judicial Branch records that the Board may grant a pardon with or without restoring firearm rights."
    },
    prerequisites: [
      "The conviction is a Nebraska conviction.",
      "You understand that this is the clemency route, and that no record-clearing packet is a substitute for it."
    ],
    gather: [
      "Whether restoring firearm rights is what you are actually trying to achieve.",
      "Whether your rights were removed by a felony conviction or by a domestic-violence misdemeanor.",
      "The date you finished your sentence, which is where the Board's waiting period runs from."
    ],
    sequence: [
      FIREARMS_NOT_RESTORED,
      "Restoration runs through the Board of Pardons, and the judiciary records that the Board may grant a pardon with or without restoring firearm rights. It is one decision, made by the Board.",
      "There is no separate statewide firearm-restoration application to fill in. This is the pardon route, so read the pardon page and go to the Board.",
      "A federal firearm disability is a different thing and Nebraska cannot lift it. If a federal prohibition is in play, that needs an attorney.",
      "If a clean record rather than firearm rights is what you are after, the Nebraska record-clearing routes are the ones to look at — but do not expect them to give you firearm rights back, because they do not."
    ],
    expectedNextStage:
      "You read the Board of Pardons requirements and decide whether to apply to it. Nothing about firearm rights is decided anywhere else.",
    extraCanPrepare: [
      "The reason no record-clearing packet reaches firearm rights, in the statute's own terms."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare a firearm-rights restoration application, because no standalone statewide application was identified, and does not prepare the pardon application either.",
      "LegalEase cannot tell you whether you may lawfully possess a firearm. That is an individualized legal question with federal law in it, and it needs an attorney."
    ],
    escalations: [
      "Firearm restoration is your actual goal, which is a hard stop on every Nebraska set-aside and sealing route.",
      "A federal firearm prohibition may apply, which Nebraska cannot lift."
    ]
  }),

  "ne-out-of-jurisdiction-routing-guidance": routingGuidance({
    templateId: "ne-out-of-jurisdiction-routing-guidance",
    mechanismName: "Where to go about a record from outside Nebraska",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here, and nothing could usefully be filed in Nebraska. No Nebraska court or agency can clear a federal, out-of-state or tribal record, so no Nebraska packet is generated for one.",
    destination: {
      name: "The state, federal or tribal authority that holds the record",
      detail:
        "Relief, if any, lies under the law of the sovereign that holds the record. Which court or agency that is depends on where the record was made."
    },
    prerequisites: [
      "The record was made outside Nebraska — by another state, by a federal court, or by a tribal court."
    ],
    documentsToObtain: [
      "Whatever record you already hold showing which court or agency the case was in, and where.",
      `If you also hold Nebraska records, a copy of ${NE_RECORD_CHECK}.`
    ],
    gather: [
      "Whether the record is from Nebraska, another state, the federal courts, or a tribal court.",
      "Which court or agency the case was in, and in which state or nation.",
      "Whether you also hold any Nebraska records."
    ],
    sequence: [
      "Record jurisdiction is the first question in the Nebraska intake, and it is asked before any other one, so that nobody is quoted a packet that cannot reach their record.",
      "No Nebraska court or agency can clear a federal, out-of-state or tribal record. A Nebraska order does not reach it, and a Nebraska packet would not do anything for you.",
      "Relief, if any, is under the law of the sovereign that holds the record. Start with the court or agency that made it, and with legal help in that place.",
      "If you also hold Nebraska records, those are handled separately. Only the Nebraska ones are served here, and the others still need to go where they belong.",
      "Nothing on this page says your record cannot be cleared. It says Nebraska is not where that happens."
    ],
    expectedNextStage:
      "You take the record to the state, federal or tribal authority that holds it, and find out what that place offers.",
    extraCanPrepare: [
      "The reason a Nebraska route cannot reach the record, so you do not pay for one that would not work."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare packets for federal, out-of-state or tribal records on this route.",
      "LegalEase cannot tell you what another state, the federal courts or a tribal court offer.",
      "LegalEase cannot tell you whether relief exists where your record is held, or which office runs it there. Nothing on this page says there is a route, and nothing on it says there is not."
    ],
    escalations: [
      "You hold both Nebraska and out-of-jurisdiction records, so the two need splitting.",
      "Your immigration status could be affected, which needs an immigration attorney wherever the record is."
    ]
  }),

  "ne-immigration-routing-guidance": routingGuidance({
    templateId: "ne-immigration-routing-guidance",
    mechanismName: "Where to go if you have an immigration matter",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here. This page routes, and it routes before anything is generated rather than after, because filing can surface a record you would rather not surface.",
    destination: {
      name: "An immigration attorney",
      detail:
        "Immigration consequences are governed by federal law. No Nebraska court, agency or packet reaches them, and no Nebraska route should be started without that advice first."
    },
    prerequisites: [
      "Your immigration status is something that could be affected — for example, you are not a United States citizen."
    ],
    documentsToObtain: [
      `A copy of ${NE_RECORD_CHECK}, to take with you.`,
      "Any immigration documents you already hold."
    ],
    gather: [
      "Whether your immigration status could be affected by this.",
      "Which Nebraska cases you have, and how each of them ended.",
      "Whether anything is already under way in an immigration matter."
    ],
    sequence: [
      "Stop here first. This is screened on every Nebraska route, and it is screened before anything is generated, not after, because starting a Nebraska process can surface a record you would rather leave alone.",
      "Immigration consequences are governed by federal law and no Nebraska mechanism reaches them.",
      "A Nebraska set-aside is a state-law nullification with no federal or immigration effect. Neb. Rev. Stat. § 29-2264(6) preserves the conviction for a list of purposes, and every Nebraska set-aside packet carries that disclaimer.",
      "Take your criminal history and your court records to an immigration attorney before anything is prepared or filed on any Nebraska route.",
      "This page is not immigration advice, and nothing on it tells you whether to proceed. It tells you to ask someone who can answer that."
    ],
    expectedNextStage:
      "An immigration attorney tells you whether a Nebraska record-clearing route is safe to start in your situation.",
    extraCanPrepare: [
      "The reason this is asked before anything is generated rather than after."
    ],
    extraCannotPerform: [
      "LegalEase does not give immigration advice and does not prepare immigration applications.",
      "LegalEase cannot tell you whether a Nebraska route would help or hurt your immigration matter."
    ],
    escalations: [
      "Anything at all is under way in an immigration matter.",
      "You are considering a Nebraska set-aside and have not yet spoken to an immigration attorney."
    ]
  }),

  "ne-postconviction-routing-guidance": routingGuidance({
    templateId: "ne-postconviction-routing-guidance",
    mechanismName: "Where to go if you want your Nebraska conviction overturned",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here. This page routes. The Nebraska Postconviction Act does provide a participant-facing verified motion, and LegalEase does not prepare it: attacking the validity of a conviction is a different remedy class from clearing a record, and it is individualized advocacy on a contested evidentiary showing.",
    destination: {
      name: "A Nebraska attorney, and then the sentencing court",
      detail:
        "The Nebraska Postconviction Act is run in the sentencing court on a verified motion. It is litigation, and it needs a lawyer rather than a prepared document."
    },
    prerequisites: [
      "The conviction is a Nebraska conviction.",
      "You are saying the conviction should not stand, rather than asking for its effects to be cleared."
    ],
    gather: [
      "Whether you say you should not have been convicted at all.",
      "Whether you want the conviction overturned rather than set aside.",
      "Whether any appeal is still running.",
      "The sentencing court and the case number."
    ],
    sequence: [
      "These are two different things, and choosing the wrong one wastes the attempt. A set-aside concedes the conviction and nullifies its civil effects. Post-conviction relief attacks whether the conviction was valid at all.",
      "A set-aside is not a way to say the conviction was wrong. If that is what you want to say, a set-aside will not say it for you.",
      "The Nebraska Postconviction Act is run in the sentencing court, on a verified motion. It turns on what happened in your case and on evidence that is contested, which is advocacy rather than document preparation.",
      "LegalEase does not prepare that motion. That is a decision about which remedies this product covers, not a finding that the motion cannot be made.",
      "If an appeal is still running, speak to the attorney handling it before doing anything else.",
      "If what you actually want is the record cleared rather than the conviction undone, go back to the Nebraska record-clearing routes."
    ],
    expectedNextStage:
      "A Nebraska attorney tells you whether post-conviction relief is available on your facts, and runs it if it is.",
    extraCanPrepare: [
      "The difference between a set-aside and overturning a conviction, before you choose between them."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare or file a motion under the Nebraska Postconviction Act, and does not appear on one.",
      "LegalEase cannot tell you whether your conviction was valid."
    ],
    escalations: [
      "You dispute the underlying conviction.",
      "You want the conviction overturned rather than set aside.",
      "An appeal is still running in the case."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!NEBRASKA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Nebraska guidance template ${templateId} is registered.`);
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

/**
 * Asked on every Nebraska route, in this order.
 *
 * Jurisdiction is the design's first intake gate and immigration exposure is
 * screened on every track, so both belong on every route rather than on the two
 * nodes named after them.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label: "Is the record from Nebraska, another state, the federal courts, or a tribal court?",
    required: true
  },
  {
    key: "immigrationStatusInPlay",
    label:
      "Is your immigration status something that could be affected by this — for example, are you not a United States citizen?",
    required: true
  },
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  }
];

function nebraskaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  componentId: string;
  templateId: string;
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
    jurisdiction: "NE",
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
    requiredInputs: [...SHARED_INPUTS, ...input.extraInputs],
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

export const NEBRASKA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  nebraskaTrack({
    trackId: "ne-nonconviction-auto",
    publicName: "Check whether your Nebraska non-conviction record came off the public record",
    mechanism: "automatic_confidentiality_of_non_conviction_criminal_history_record_information",
    authority: "Neb. Rev. Stat. § 29-3523; State v. Coble, 299 Neb. 434 (2018)",
    recordTypes: ["arrest", "charge"],
    dispositions: [
      "no_charges_filed",
      "diversion_completed",
      "dismissed",
      "acquitted",
      "deferred_judgment",
      "problem_solving_court_completed"
    ],
    componentId: "ne-nonconviction-auto-process-guidance-1",
    templateId: "ne-nonconviction-auto-guidance",
    extraInputs: [
      {
        key: "ncaDispositionCategory",
        label:
          "How did the matter end — no charges filed, charges not filed after you completed diversion, dismissed, acquitted, dismissed after a deferred judgment, or dismissed after a problem-solving court programme?",
        required: true
      },
      { key: "ncaDispositionDate", label: "On what date did that happen?", required: true },
      {
        key: "ncaDispositionBefore2017",
        label: "Was that date before 1 January 2017?",
        required: true
      },
      {
        key: "ncaArrestDate",
        label: "On what date were you arrested, cited or referred?",
        required: true
      },
      {
        key: "ncaSeparateProsecution",
        label:
          "Are you currently being prosecuted, or under correctional control, from any separate arrest?",
        required: true
      },
      {
        key: "ncaPublicOffice",
        label: "Are you an announced candidate for, or a holder of, public office?",
        required: true
      },
      {
        key: "firearmRestorationIsTheGoal",
        label: "Is restoring your firearm rights what you are actually trying to achieve?",
        required: true
      },
      { key: "ncaPeriodHasRun", label: "Has the period for your branch already run?", required: true },
      {
        key: "ncaRecordStillPublic",
        label: "When you checked your record, was the matter still showing?",
        required: true
      },
      {
        key: "ncaAppearsInPrivateDatabase",
        label: "Is the matter also showing on a private background-check website?",
        required: true
      }
    ],
    assembledPacketName: "Non-Conviction-Record-Verification",
    assembledPacketTitle: "Checking whether a Nebraska non-conviction record came off the public record",
    customerDeliverableDescription:
      "A guidance sheet explaining which section 29-3523(3) timetable applies to which ending, what the section does when it applies, how to check with the State Patrol and the court case search, why a motion in the criminal case is the wrong instrument under State v. Coble, and what to do instead where the period has run and the record is still being disclosed.",
    notes:
      "No section number is given for the deferred judgment or pretrial diversion statutes, because their primary text was not read at source and the design records that as a release blocker; the branches are described by outcome instead. The still-public case routes to ne-seal-enforcement, which is an existing Nebraska track, rather than to a motion. A pre-2017 disposition routes to the pre-2017 sealing route."
  }),

  nebraskaTrack({
    trackId: "ne-juvenile-sealing-routing",
    publicName: "Where to go about a Nebraska juvenile record",
    mechanism: "routing_to_juvenile_court_sealing",
    authority: "Neb. Rev. Stat. §§ 43-2,108.01, 43-2,108.03 and 43-2,108.05",
    recordTypes: ["juvenile_adjudication"],
    dispositions: ["adjudicated", "dismissed", "diversion_completed"],
    componentId: "ne-juvenile-sealing-routing-process-guidance-1",
    templateId: "ne-juvenile-sealing-routing-guidance",
    extraInputs: [
      {
        key: "jsUnderEighteen",
        label: "Were you under eighteen at the time of the offence?",
        required: true
      },
      {
        key: "jsDispositionCategory",
        label:
          "How did the juvenile matter end — no charges, dismissed, diversion or a similar programme completed, or an adjudication you completed?",
        required: true
      },
      {
        key: "jsCaseClosedDate",
        label: "When did the case close, and when did you turn eighteen?",
        required: true
      },
      { key: "jsCurrentlyAMinor", label: "Are you still under eighteen now?", required: true },
      {
        key: "jsSpansAdultAndJuvenile",
        label: "Do you also have adult cases on your record?",
        required: true
      },
      { key: "jsRecordStillPublic", label: "Is the record still showing?", required: true }
    ],
    assembledPacketName: "Juvenile-Record-Routing",
    assembledPacketTitle: "Where to go about a Nebraska juvenile record",
    customerDeliverableDescription:
      "A guidance sheet explaining which Nebraska juvenile records seal without anybody asking and which need a motion in the court of record, that a sealed juvenile record is deemed never to have occurred, and that LegalEase does not prepare the juvenile motion because juvenile records are outside this product's adult scope.",
    notes:
      "The design records this as a product-scope decision rather than a capability finding — a statute, four official statewide forms and published hearing instructions all exist — and the sheet says so instead of implying the route cannot be run. The 2025 amendment to section 43-2,108.05 is flagged as unread rather than summarised."
  }),

  nebraskaTrack({
    trackId: "ne-pardon-routing",
    publicName: "Where to go about a Nebraska pardon",
    mechanism: "routing_to_board_of_pardons_clemency",
    authority: "Neb. Const. art. IV, § 13; Neb. Rev. Stat. §§ 83-1,126 and 83-1,130",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    componentId: "ne-pardon-routing-process-guidance-1",
    templateId: "ne-pardon-routing-guidance",
    extraInputs: [
      {
        key: "prConvictionLevel",
        label: "Was the conviction a felony or a misdemeanor?",
        required: true
      },
      { key: "prCompletionDate", label: "When did you finish your sentence?", required: true },
      {
        key: "prOffenceType",
        label:
          "Was the offence a traffic violation, driving under the influence, driving under suspension, or something else?",
        required: true
      },
      {
        key: "prWaitingPeriodHasRun",
        label:
          "Has the Board's waiting period run from the date you finished, without any contact with law enforcement or any further conviction since?",
        required: true
      },
      {
        key: "prCityOrdinance",
        label: "Was it a city ordinance violation in Lincoln or Omaha?",
        required: true
      },
      {
        key: "prDocumentHeld",
        label: "Do you hold a pardon, a warrant of discharge, or neither?",
        required: true
      }
    ],
    assembledPacketName: "Pardon-Routing",
    assembledPacketTitle: "Where to go about a Nebraska pardon",
    customerDeliverableDescription:
      "A guidance sheet explaining what the Board of Pardons is and what a pardon does, the waiting periods the judiciary publishes and what restarts them, the offences the Board will not consider, that a warrant of discharge is not a pardon, and that LegalEase does not prepare the Board's application.",
    notes:
      "The sheet does not say that a Lincoln or Omaha mayoral pardon supports a section 29-3523(5) motion to seal; the design records that as an open question and the sheet says it is unsettled. Whether LegalEase should prepare the Board application is a counsel classification question, and the sheet states the current answer without dressing it as a legal limit."
  }),

  nebraskaTrack({
    trackId: "ne-firearm-restoration-routing",
    publicName: "Where to go about restoring firearm rights in Nebraska",
    mechanism: "routing_to_clemency_for_firearm_rights_restoration",
    authority: "Neb. Rev. Stat. § 83-1,130(2); Neb. Rev. Stat. § 29-2264(5)(c) and (6)",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    componentId: "ne-firearm-restoration-routing-process-guidance-1",
    templateId: "ne-firearm-restoration-routing-guidance",
    extraInputs: [
      {
        key: "frGoal",
        label: "Is restoring your firearm rights what you are trying to achieve?",
        required: true
      },
      {
        key: "frRightsRemovedBy",
        label:
          "Were your rights removed by a felony conviction or by a domestic-violence misdemeanor?",
        required: true
      }
    ],
    assembledPacketName: "Firearm-Rights-Routing",
    assembledPacketTitle: "Where to go about restoring firearm rights in Nebraska",
    customerDeliverableDescription:
      "A guidance sheet explaining that no Nebraska record-clearing packet restores firearm rights and why the set-aside statute says so itself, that restoration runs through the Board of Pardons which may grant a pardon with or without it, and that a federal firearm disability is outside Nebraska's reach.",
    notes:
      "No standalone statewide restoration application was identified, so there is nothing to prepare on this route and the sheet says that rather than implying an application exists. The firearm warning is the one the design hard-wires into every Nebraska set-aside and sealing track."
  }),

  nebraskaTrack({
    trackId: "ne-out-of-jurisdiction-routing",
    publicName: "Where to go about a record from outside Nebraska",
    mechanism: "routing_of_federal_out_of_state_and_tribal_records",
    authority: "Neb. Rev. Stat. § 29-3523",
    recordTypes: ["arrest", "charge", "conviction"],
    dispositions: ["convicted", "dismissed", "acquitted"],
    componentId: "ne-out-of-jurisdiction-routing-process-guidance-1",
    templateId: "ne-out-of-jurisdiction-routing-guidance",
    extraInputs: [
      {
        key: "ojRecordJurisdiction",
        label:
          "Which court or agency was the case in, and in which state or nation?",
        required: true
      },
      {
        key: "ojAlsoHoldsNebraskaRecords",
        label: "Do you also have any Nebraska records?",
        required: true
      }
    ],
    assembledPacketName: "Out-Of-Jurisdiction-Routing",
    assembledPacketTitle: "Where to go about a record from outside Nebraska",
    customerDeliverableDescription:
      "A guidance sheet explaining that no Nebraska court or agency can clear a federal, out-of-state or tribal record, that relief lies under the law of the sovereign that holds it, and that a participant who also holds Nebraska records has those handled separately.",
    notes:
      "Record jurisdiction is the design's first intake gate, so this node's question is asked on every Nebraska route and a non-Nebraska answer routes here. The sheet is careful to say Nebraska is not where the record is cleared, not that it cannot be cleared."
  }),

  nebraskaTrack({
    trackId: "ne-immigration-routing",
    publicName: "Where to go if you have an immigration matter",
    mechanism: "routing_to_immigration_counsel_before_generation",
    authority: "Neb. Rev. Stat. § 29-2264(6)",
    recordTypes: ["conviction", "charge"],
    dispositions: ["convicted", "dismissed", "acquitted"],
    componentId: "ne-immigration-routing-process-guidance-1",
    templateId: "ne-immigration-routing-guidance",
    extraInputs: [
      {
        key: "imNebraskaCases",
        label: "Which Nebraska cases do you have, and how did each of them end?",
        required: true
      },
      {
        key: "imMatterUnderway",
        label: "Is anything already under way in an immigration matter?",
        required: true
      }
    ],
    assembledPacketName: "Immigration-Routing",
    assembledPacketTitle: "Where to go if you have an immigration matter",
    customerDeliverableDescription:
      "A guidance sheet explaining that immigration consequences are federal and no Nebraska mechanism reaches them, that a Nebraska set-aside is a state-law nullification with no federal or immigration effect, and that an immigration attorney should be seen before anything is generated rather than after.",
    notes:
      "Immigration exposure is screened on every Nebraska track and the screen runs before generation, because filing can surface a record the participant would rather not surface. The sheet gives no immigration advice and does not tell the participant whether to proceed."
  }),

  nebraskaTrack({
    trackId: "ne-postconviction-routing",
    publicName: "Where to go if you want your Nebraska conviction overturned",
    mechanism: "routing_of_actual_innocence_and_post_conviction_litigation",
    authority: "Nebraska Postconviction Act, Neb. Rev. Stat. § 29-3001",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    componentId: "ne-postconviction-routing-process-guidance-1",
    templateId: "ne-postconviction-routing-guidance",
    extraInputs: [
      {
        key: "pcDisputesConviction",
        label: "Do you say you should not have been convicted at all?",
        required: true
      },
      {
        key: "pcWantsVacatur",
        label: "Do you want the conviction overturned rather than set aside?",
        required: true
      },
      { key: "pcActiveAppeal", label: "Is any appeal still running in the case?", required: true },
      {
        key: "pcSentencingCourt",
        label: "Which court sentenced you, and what is the case number?",
        required: true
      }
    ],
    assembledPacketName: "Post-Conviction-Routing",
    assembledPacketTitle: "Where to go if you want your Nebraska conviction overturned",
    customerDeliverableDescription:
      "A guidance sheet explaining the difference between a set-aside, which concedes the conviction and nullifies its civil effects, and post-conviction relief, which attacks the conviction's validity, and routing the second to a Nebraska attorney because it is contested litigation rather than document preparation.",
    notes:
      "A participant-facing verified motion does exist under the Postconviction Act, so the sheet says LegalEase does not prepare it rather than implying no filing exists. A participant who wants the record cleared rather than the conviction undone is routed back to the record-clearing tracks."
  })
];
