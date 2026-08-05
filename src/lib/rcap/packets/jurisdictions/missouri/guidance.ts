// Missouri process guidance — closure by operation of law, and the automatic
// drug expungement that is narrower than its press coverage.
//
// Two assigned routes, five components, all implemented. Neither route has a
// participant filing: § 610.105 closes records on final termination without any
// act by the person whose records they are, and § 610.141 has the central
// repository screen and expunge of its own motion.
//
// Two corrections run through this family, and both exist because the ordinary
// way of describing Missouri relief is wrong.
//
//   1. Closure is not expungement. A closed § 610.105 record leaves the
//      judgment or order a public record, preserves the access § 610.120
//      grants, and can be reached by a victim of an enumerated offence.
//      Telling a participant their case is closed is not telling them it is
//      gone, and the § 610.141 relief is the same thing — closure under
//      § 610.120, which the section says in terms. Neither is destruction and
//      no sheet here calls either one erasure.
//
//   2. Missouri is not a clean-slate state. The enacted automatic expungement
//      reaches four offences, not a category: possession of a controlled
//      substance under § 195.202 as it existed before 1 January 2017, unlawful
//      use of drug paraphernalia under § 195.233 as it existed before that
//      date, possession or control of a controlled substance under § 579.015,
//      and unlawful possession of drug paraphernalia under § 579.074.
//      Trafficking, distribution, delivery and manufacture are outside it. The
//      design is explicit that secondary summaries must not be used, because
//      the enacted section is materially narrower than the broader vehicle
//      whose text is widely conflated with it — including a bulk-processing
//      deadline that appears nowhere in the enacted law.
//
// The verification instruction on the closure route is the one participants
// most often get wrong, and it is a trap rather than a detail:
//
//   Only a FINGERPRINT-BASED Highway Patrol search shows records that are
//   already closed. A name-based search cannot confirm closure. It can only
//   fail to show the record, which is a different answer.
//
// So a clean name-based result proves nothing, and the sheet says so plainly
// rather than letting someone conclude they are clear when they have not
// actually checked.
//
// Two things about the automatic drug route have to be said together, because
// saying either alone misleads. It operates when technically feasible and no
// later than 1 January 2027, no implementation notice has been published, and a
// § 610.140 petition is available now. Waiting is free but unproven; petitioning
// works today but costs a filing fee. And either one consumes the same lifetime
// slot: three misdemeanour and two felony expungements across §§ 610.140 and
// 610.141 combined. A participant choosing between them is an express referral
// trigger, not a decision this page makes for them.
//
// Where an eligible offence is not expunged, the statute makes a § 610.140
// petition the sole remedy. There is no appeal to the Highway Patrol and no
// correction application, so nothing here invents one — a participant whose
// record was missed is routed to the petition track rather than to an agency.
//
// This module asserts no outcome for any particular record in either direction.
// It cannot see the central repository's data and does not run the eligibility
// analysis.
//
// What these templates never do: turn guidance into a court filing, invent a
// correction petition for a remedy Missouri does not provide, describe closure
// as erasure or destruction, describe Missouri as a clean-slate state, quote a
// Highway Patrol fee, promise a start date, or tell a participant their own
// record has or has not been cleared.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Missouri
// is not an enabled jurisdiction and this job does not enable one.

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
 * the packet proof are integration-owned and name no Missouri track, so
 * `MISSOURI_COUNSEL_ADOPTED` is false on this branch and the verifier proves it.
 */
export const MISSOURI_LEGAL_OUTPUT_RECOMMENDATION = "recommended_for_counsel_adoption";
export const MISSOURI_COUNSEL_ADOPTED = false;

/** The outer limit the enacted section gives. No start date is promised. */
export const MO_AUTOMATIC_OUTER_LIMIT = "1 January 2027";

// ---------------------------------------------------------------------------
// Self-help stops and closed lists
// ---------------------------------------------------------------------------

/** The route does not answer this participant; a destination is named. */
export class MissouriGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MissouriGuidanceStopError";
  }
}

/** The participant belongs on a different Missouri route, which is named. */
export class MissouriRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MissouriRouteMismatchError";
  }
}

/** An answer outside the approved list. */
export class MissouriBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "MissouriBranchError";
  }
}

export const MO_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** How the case ended, for the closure route. */
export const MO_DISPOSITIONS: Readonly<Record<string, string>> = {
  dismissed: "the case was dismissed",
  nolle_prossed: "the prosecutor entered a nolle prosequi",
  not_guilty: "you were found not guilty",
  suspended_imposition: "the judge suspended imposition of sentence and placed you on probation",
  acquitted_mental_disease: "you were acquitted on the ground of mental disease or defect",
  convicted: "convicted"
};

/**
 * The distinction that decides the whole route.
 *
 * A suspended IMPOSITION of sentence closes automatically. A suspended
 * EXECUTION of sentence is a conviction and does not. They sound alike.
 */
export const MO_SUSPENDED_SENTENCE_KIND: Readonly<Record<string, string>> = {
  suspended_imposition: "suspended_imposition",
  suspended_execution: "suspended_execution",
  not_a_suspended_sentence: "not_a_suspended_sentence",
  cannot_tell_from_the_docket: "cannot_tell_from_the_docket"
};

/** Whether the suspended-imposition probation reached final termination. */
export const MO_PROBATION_STATUS: Readonly<Record<string, string>> = {
  completed: "completed",
  still_running: "still_running",
  revoked: "revoked",
  unsure: "unsure",
  not_applicable: "not_applicable"
};

/** What a fingerprint-based Highway Patrol search returned. */
export const MO_MSHP_RESULT: Readonly<Record<string, string>> = {
  not_yet_requested: "not_yet_requested",
  requested_not_showing: "requested_not_showing",
  requested_still_showing: "requested_still_showing"
};

/** The four offences the automatic drug expungement reaches, and everything else. */
export const MO_OFFENSE_TYPES: Readonly<Record<string, string>> = {
  possession_195_202: "possession of a controlled substance under the pre-2017 section",
  paraphernalia_195_233: "unlawful use of drug paraphernalia under the pre-2017 section",
  possession_579_015: "possession or control of a controlled substance",
  paraphernalia_579_074: "unlawful possession of drug paraphernalia",
  trafficking_distribution_delivery_or_manufacture: "trafficking_distribution_delivery_or_manufacture",
  other_offense: "other_offense"
};

/** Offence level. A class A felony is excluded from the automatic route. */
export const MO_OFFENSE_LEVELS: Readonly<Record<string, string>> = {
  misdemeanor: "misdemeanor",
  felony_not_class_a: "felony_not_class_a",
  class_a_felony: "class_a_felony"
};

/** Whether the shared lifetime caps may already be exhausted. */
export const MO_PRIOR_EXPUNGEMENTS: Readonly<Record<string, string>> = {
  none: "none",
  some_but_under_the_caps: "some_but_under_the_caps",
  at_or_over_the_caps: "at_or_over_the_caps",
  unsure: "unsure"
};

const MO_HELP =
  "a Missouri legal aid organisation or a public defender expungement clinic";
const MO_CLERK =
  "the clerk of the court the case was in, asking for the docket entries and a certified copy of the disposition";
const MO_PETITION_TRACK =
  "the Missouri § 610.140 expungement petition route, which is a court filing with its own requirements";

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new MissouriBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers, applies the Missouri stops, and routes to the
 * correct Missouri mechanism.
 *
 * A record that has not cleared is never a bare refusal. On the closure route
 * it hands off with the fingerprint result in hand, because the design forbids
 * making any determination that closure failed and forbids inventing a
 * correction petition. On the automatic drug route it goes to the petition
 * track, which the statute makes the sole remedy. A participant who has not yet
 * checked always keeps the sheet, because checking is the instruction.
 */
export function deriveMissouriGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  if (branch(trackId, "immigrationMatter", MO_YES_NO, facts.immigrationMatter).resolved) {
    throw new MissouriGuidanceStopError(
      trackId,
      "immigration_consequence_in_play",
      "Closure under § 610.120 is not the same thing as expungement, and it does not answer a federal immigration question. A record that is closed in Missouri can still matter federally, and the order in which things are done can matter more than the closure itself.",
      `an immigration lawyer before any record step is taken, and only then ${MO_HELP}`
    );
  }

  if (trackId === "mo-610-105-automatic-closure") {
    const kind = branch(
      trackId,
      "sesConfusion",
      MO_SUSPENDED_SENTENCE_KIND,
      facts.sesConfusion
    );
    if (kind.value === "suspended_execution") {
      throw new MissouriRouteMismatchError(
        trackId,
        "suspended_execution_is_a_conviction",
        "A suspended execution of sentence is a conviction. Only a suspended imposition closes by operation of law, and the two sound so alike that this is the most common way a Missouri participant is told the wrong thing about their own case.",
        `${MO_PETITION_TRACK}; take the certified disposition with you so the distinction is on the record rather than from memory`
      );
    }
    if (kind.value === "cannot_tell_from_the_docket") {
      throw new MissouriGuidanceStopError(
        trackId,
        "cannot_distinguish_suspended_imposition_from_execution",
        "Which of the two you received decides whether the record closed on its own or never will, and it cannot be guessed at. The docket is where the answer is written.",
        `${MO_CLERK}; if the entry is still ambiguous once you have it, take it to ${MO_HELP}`
      );
    }

    const disposition = branch(trackId, "disposition", MO_DISPOSITIONS, facts.disposition);
    if (disposition.value === "convicted") {
      throw new MissouriRouteMismatchError(
        trackId,
        "case_ended_in_a_conviction",
        "Closure by operation of law follows a dismissal, a nolle prosequi, a not guilty finding, an acquittal on the ground of mental disease or defect, or a suspended imposition of sentence that reached final termination. A conviction is not among them.",
        MO_PETITION_TRACK
      );
    }
    derived.dispositionAllegation = disposition.resolved;

    const probation = branch(trackId, "sisProbationComplete", MO_PROBATION_STATUS, facts.sisProbationComplete);
    if (kind.value === "suspended_imposition" || disposition.value === "suspended_imposition") {
      if (probation.value === "still_running") {
        throw new MissouriGuidanceStopError(
          trackId,
          "probation_has_not_reached_final_termination",
          "The record closes on final termination of the case, and a suspended imposition of sentence does not reach that point until the probation ends. While it is running there is nothing for the closure to attach to.",
          "wait until the probation term ends and the court records the discharge, then request a fingerprint-based Highway Patrol criminal record and check again"
        );
      }
      if (probation.value === "revoked") {
        throw new MissouriRouteMismatchError(
          trackId,
          "probation_revoked_and_sentence_imposed",
          "Where the probation was revoked and sentence was then imposed, the case no longer ends in a suspended imposition and the automatic closure does not reach it.",
          MO_PETITION_TRACK
        );
      }
      if (probation.value === "unsure") {
        throw new MissouriGuidanceStopError(
          trackId,
          "unsure_whether_probation_reached_final_termination",
          "Whether the probation ran to discharge or was revoked decides whether this record closed at all, and the court file is where that is recorded.",
          `${MO_CLERK}, asking specifically whether the probation was discharged or revoked`
        );
      }
    }
    derived.probationStatus = probation.value;

    if (branch(trackId, "chapter566Charge", MO_YES_NO, facts.chapter566Charge).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "enumerated_offense_with_victim_access_to_the_closed_file",
        "For the enumerated offences, the law lets the victim of that offence obtain the closed records for use in their own case. Closure therefore does not mean the file is beyond reach, and what that means for you is not something a general page can work out.",
        `${MO_HELP}, asking specifically about victim access to a closed file under the enumerated-offence provision`
      );
    }

    if (branch(trackId, "wantsRecordCorrected", MO_YES_NO, facts.wantsRecordCorrected).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "wants_the_record_corrected_rather_than_confirmed",
        "Correcting what an agency holds is a different thing from confirming that a record closed. It is an agency process, it sits outside this route, and it sits outside self-help.",
        `the Missouri State Highway Patrol criminal justice information services division for the criminal history record, and the arresting agency for its own records; take ${MO_HELP} with you if either refuses`
      );
    }

    if (branch(trackId, "backgroundCheckVisible", MO_YES_NO, facts.backgroundCheckVisible).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "background_check_shows_a_case_believed_closed",
        "A commercial background check showing a case you believe closed is a different problem from the closure itself, and it is not evidence that the closure failed — the reporting company may be holding old data that no closure will reach on its own.",
        `note who ran the check and when, obtain a fingerprint-based Highway Patrol criminal record so you know what the state actually holds, and take both to ${MO_HELP}`
      );
    }

    const mshp = branch(trackId, "mshpVisible", MO_MSHP_RESULT, facts.mshpVisible);
    derived.mshpResult = mshp.value;
    if (mshp.value === "requested_still_showing") {
      throw new MissouriGuidanceStopError(
        trackId,
        "record_still_showing_after_final_termination",
        "Your fingerprint-based record still shows the case after final termination. This page will not tell you that the closure failed, because that is a determination it is not entitled to make, and Missouri provides no correction petition for it — so inventing one would send you somewhere that does not exist.",
        `${MO_HELP}, taking the fingerprint-based Highway Patrol record and the certified disposition from ${MO_CLERK}`
      );
    }

    if (branch(trackId, "wantsExpungementToo", MO_YES_NO, facts.wantsExpungementToo).resolved) {
      throw new MissouriRouteMismatchError(
        trackId,
        "wants_to_know_whether_a_petition_adds_anything",
        "It is a fair question and the answer is often yes. Closure leaves the judgment public and preserves the statutory access; an expungement order does more. Which of those matters to you depends on what the record is costing you.",
        `${MO_PETITION_TRACK}, which is where that comparison is made`
      );
    }
  }

  if (trackId === "mo-610-141-automatic-drug") {
    const offense = branch(trackId, "offenseType", MO_OFFENSE_TYPES, facts.offenseType);
    if (
      offense.value === "trafficking_distribution_delivery_or_manufacture" ||
      offense.value === "other_offense"
    ) {
      throw new MissouriRouteMismatchError(
        trackId,
        "offense_outside_the_four_covered_offenses",
        "The automatic expungement reaches four offences and is not a general clean-slate law. Trafficking, distribution, delivery and manufacture are outside it, and so is anything that is not one of the four possession or paraphernalia offences.",
        MO_PETITION_TRACK
      );
    }
    derived.offenseAllegation = offense.resolved;

    const level = branch(trackId, "offenseLevel", MO_OFFENSE_LEVELS, facts.offenseLevel);
    if (level.value === "class_a_felony") {
      throw new MissouriRouteMismatchError(
        trackId,
        "class_a_felony_excluded_from_the_automatic_route",
        "A class A felony is excluded from the automatic mechanism however long you wait.",
        MO_PETITION_TRACK
      );
    }
    derived.offenseLevel = level.value;

    if (branch(trackId, "statuteUnclear", MO_YES_NO, facts.statuteUnclear).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "statute_of_conviction_unclear_on_the_docket",
        "Which section you were convicted under decides whether this route reaches the record at all, and the pre-2017 sections were renumbered — so an old docket can describe the same conduct under a section number that no longer reads the way it did.",
        `${MO_CLERK}, asking for the charging document and the judgment so the section of conviction is unambiguous; then ${MO_HELP} if it is still unclear`
      );
    }

    if (!branch(trackId, "onlyChargeInCase", MO_YES_NO, facts.onlyChargeInCase).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "case_contained_a_non_qualifying_conviction",
        "Where the same case included a conviction for something outside the four covered offences, the automatic law does not reach any of it — not even the part that would have qualified on its own.",
        `${MO_PETITION_TRACK}; if you are not certain what else was in the case, get the docket from ${MO_CLERK} first`
      );
    }

    if (branch(trackId, "convictionSinceDisposition", MO_YES_NO, facts.convictionSinceDisposition).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "intervening_conviction_since_final_disposition",
        "A misdemeanour or felony conviction since the date you finished everything the court ordered takes the record outside the automatic route. Traffic regulation violations under the motor vehicle chapters do not count for this.",
        `${MO_PETITION_TRACK}; take the dates of both cases to ${MO_HELP} so the effect of the later conviction can be assessed`
      );
    }

    if (branch(trackId, "pendingChargesOrWarrants", MO_YES_NO, facts.pendingChargesOrWarrants).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "outstanding_arrest_warrant_or_pending_charge",
        "An outstanding arrest, warrant or pending charge keeps the record outside the automatic route while it is live.",
        "resolve the outstanding matter first — a public defender or defence lawyer for a pending charge, or the court that issued the warrant — and then come back to this route"
      );
    }

    const priors = branch(trackId, "priorExpungements", MO_PRIOR_EXPUNGEMENTS, facts.priorExpungements);
    if (priors.value === "at_or_over_the_caps" || priors.value === "unsure") {
      throw new MissouriGuidanceStopError(
        trackId,
        "shared_lifetime_caps_may_be_exhausted",
        "Automatic and petition expungements share the same lifetime limits — three misdemeanours and two felonies between them, counting only the highest-level offence where a case contained more than one. Whether you have slots left is an arithmetic question about your whole record, not about this case.",
        `${MO_HELP}, taking a list of every Missouri expungement you have had, so the remaining slots can be counted before either route is used`
      );
    }
    derived.priorExpungements = priors.value;

    if (branch(trackId, "recordNotExpungedAfterOperative", MO_YES_NO, facts.recordNotExpungedAfterOperative).resolved) {
      throw new MissouriRouteMismatchError(
        trackId,
        "eligible_record_not_expunged_is_remedied_only_by_petition",
        "Where an eligible offence is not expunged, the statute makes a petition the sole remedy. There is no appeal to the Highway Patrol and no correction application, so there is nowhere else this can go.",
        `${MO_PETITION_TRACK}, which the statute names as the only remedy for a record the automatic screen did not reach`
      );
    }

    if (branch(trackId, "urgency", MO_YES_NO, facts.urgency).resolved) {
      throw new MissouriRouteMismatchError(
        trackId,
        "needs_the_record_cleared_by_a_fixed_date",
        `The automatic mechanism has no published start date beyond an outer limit of ${MO_AUTOMATIC_OUTER_LIMIT}, and no implementation notice has been published. A mechanism that may not have started cannot be relied on for a deadline.`,
        `${MO_PETITION_TRACK}, which is available now — but note it costs a filing fee and uses one of the same lifetime slots, so ${MO_HELP} is worth speaking to before you commit to it`
      );
    }

    if (branch(trackId, "petitionNowOrWait", MO_YES_NO, facts.petitionNowOrWait).resolved) {
      throw new MissouriGuidanceStopError(
        trackId,
        "choosing_between_petitioning_now_and_waiting",
        "This is a genuine trade-off rather than a lookup. Petitioning works today and costs a filing fee; waiting is free but the mechanism is not yet shown to be running. Both consume the same lifetime slot, so choosing wrong is not recoverable by simply doing the other one later.",
        `${MO_HELP} to talk it through, taking the docket and a list of any previous Missouri expungements; the alternative route itself is ${MO_PETITION_TRACK}`
      );
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

const NOTHING_TO_FILE =
  "There is nothing for you to file on this route and nothing to pay for the relief itself. Missouri does this one without you, so the work here is understanding what it does and checking whether it happened.";

const CLOSURE_IS_NOT_EXPUNGEMENT =
  "Closure is not expungement. A closed record still exists: the judgment or order stays a public record, the entities the statute names keep their access, and closure is not destruction. Being told your case is closed is not being told it is gone.";

const FINGERPRINT_ONLY =
  "Only a fingerprint-based Highway Patrol search shows records that are already closed. A name-based search cannot confirm closure — if it comes back clean, that tells you the name search did not find the record, which is a different answer. Request the fingerprint-based criminal record if you want a real answer.";

const NO_OUTCOME_ASSERTED =
  "This page does not tell you whether your own record has or has not been cleared. It cannot see the state's data and does not run the eligibility analysis. What it can do is tell you where to look and what each answer means.";

const NO_FEE_QUOTED =
  "No figure is quoted here for what a record costs to obtain. Confirm the current fee with the office you are requesting it from rather than relying on a number from anywhere else.";

const MO_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot close, expunge or correct anything, and cannot make a court, a clerk, the Highway Patrol or the state courts administrator act.",
  "LegalEase cannot tell you whether you qualify, and never asserts an outcome for a particular record in either direction.",
  "LegalEase does not obtain, receive, inspect or hold your criminal record or your court file. You request and read your own.",
  "LegalEase does not file the petition route named here; that is a separate route with its own requirements."
];

const MO_SOURCES: readonly string[] = [
  "Mo. Rev. Stat. § 610.105 (closure on final termination) and § 610.120 (access to closed records).",
  "Mo. Rev. Stat. § 610.141, § 610.143 and § 610.144 (automatic expungement, enacted 2026); § 610.140 (expungement petition).",
  "Mo. Rev. Stat. § 195.202 and § 195.233 as they existed prior to 1 January 2017; § 579.015; § 579.074.",
  "Mo. Rev. Stat. §§ 43.500 to 43.530 (central repository); CCS SS SB 1421, 103rd General Assembly, Second Regular Session (2026).",
  "Missouri Case.net; Missouri State Highway Patrol criminal record request; the clerk of the originating court."
];

function moGuidance(input: {
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
    actionSequence: [NOTHING_TO_FILE, ...input.sequence, NO_OUTCOME_ASSERTED],
    submissionMethod: input.submissionMethod,
    fees: input.fees,
    feeWaiver: input.feeWaiver,
    noticeOrService: input.noticeOrService,
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: input.cannotPerform ?? MO_CANNOT_PERFORM,
    escalationTriggers: input.escalations,
    officialSourceReferences: MO_SOURCES
  };
}

export const MISSOURI_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "mo-610-105-closure-what-it-is": moGuidance({
    templateId: "mo-610-105-closure-what-it-is",
    mechanismName: "Cases that already closed by law — what closure is, and what it is not",
    processType: "automatic",
    whyNotAFiling:
      "The statute closes the records on final termination without any act by the person whose records they are. There is no petition, no motion, no application and no request of any kind, so nothing is filed and nothing is paid for the closure itself.",
    destination: {
      name: "No participant filing destination — closure by operation of law",
      detail:
        "Nothing is filed and nothing is submitted. Your only dealings are informational: a Case.net search, a request to the clerk of the originating court for the docket, and a fingerprint-based criminal record request to the Highway Patrol."
    },
    prerequisites: [
      "The case ended in a dismissal, a nolle prosequi, a not guilty finding, an acquittal on the ground of mental disease or defect, or a suspended imposition of sentence.",
      "Where it was a suspended imposition of sentence, the probation has ended.",
      "Nothing else. This closure is not applied for."
    ],
    documents: [
      "The docket entries and a certified copy of the disposition from the clerk of the court the case was in.",
      "A fingerprint-based criminal record from the Missouri State Highway Patrol.",
      "Your Case.net search result for the case."
    ],
    gather: [
      "How the case ended.",
      "Whether it was a suspended imposition of sentence or a suspended execution of sentence.",
      "If it was a suspended imposition, whether the probation ended or was revoked.",
      "Which Missouri court and county the case was in, and the case number."
    ],
    sequence: [
      CLOSURE_IS_NOT_EXPUNGEMENT,
      "Then the distinction that decides everything, because the two terms sound alike and are constantly confused. A suspended IMPOSITION of sentence closes automatically. A suspended EXECUTION of sentence is a conviction and does not close. If you were told your case would 'go away after probation', it matters a great deal which of those you actually received.",
      "Read it off the docket rather than from memory. This is not something to work out from what anyone said at the time, and the clerk of the court the case was in can give you the entries and a certified copy of the disposition.",
      "Know when it happens. The record closes on final termination of the case. For a suspended imposition of sentence, that is when the probation ends — not when it was imposed, and not if it was revoked and sentence was then entered.",
      "Know who can still see it. Closure preserves the access the statute grants to the named entities, and for the enumerated offences the victim of that offence may obtain the closed records for use in their own case. Closure narrows who sees the record; it does not empty the file."
    ],
    submissionMethod:
      "There is nothing to submit. The closure happens on final termination without any act by you.",
    fees: `No fee for the closure, because nothing is filed. You pay only for records you choose to obtain. ${NO_FEE_QUOTED}`,
    feeWaiver: "Not applicable to the closure. There is no filing and no fee to waive.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "Nobody is required to tell you that a record has closed, which is why checking is the whole of the participant's part."
    ],
    expectedNextStage:
      "You know whether your case is the kind that closes on its own, and you are ready to check whether it did.",
    canPrepare: [
      "This explanation of what closure does and what it deliberately leaves in place.",
      "The suspended-imposition against suspended-execution distinction, before it costs you a wrong assumption.",
      "The list of what to ask the clerk for."
    ],
    escalations: [
      "You cannot tell from the docket which kind of suspended sentence you received.",
      "The probation was revoked, or you are unsure whether it ran to discharge.",
      "The charge was one of the enumerated offences where the victim may obtain the closed file.",
      "There is an immigration consequence, where closure is not the same as expungement."
    ]
  }),

  "mo-610-105-closure-how-to-check": moGuidance({
    templateId: "mo-610-105-closure-how-to-check",
    mechanismName: "Checking whether the case actually closed, and what to do if it did not",
    processType: "automatic",
    whyNotAFiling:
      "This is the verification half of the same route. Nothing here is filed either — it is how you find out whether the closure happened, and where to go if your record still shows the case.",
    destination: {
      name: "Case.net, the clerk of the originating court, and the Highway Patrol",
      detail:
        "Three places, and only one of them can confirm a closure. The fingerprint-based Highway Patrol criminal record is the only search that shows records already closed."
    },
    prerequisites: [
      "You have read the first sheet and know which kind of disposition you had.",
      "The case reached final termination."
    ],
    documents: [
      "A fingerprint-based criminal record from the Missouri State Highway Patrol.",
      "The docket entries and certified disposition from the clerk.",
      "Any background check that showed the case, with a note of who ran it and when."
    ],
    gather: [
      "Whether the case still comes up when you search Case.net for your name.",
      "Whether the case appears on the fingerprint-based Highway Patrol record you obtained.",
      "Whether the case has appeared on a background check run by an employer, a landlord or a licensing body, and who ran it."
    ],
    sequence: [
      FINGERPRINT_ONLY,
      "Start with Case.net anyway, because it is free and it tells you what the public court system is showing. Just do not treat a clean result there as proof of anything.",
      "Then request the fingerprint-based Highway Patrol criminal record. That is the search that shows closed records, and it is the only way to see what the state actually holds about you.",
      "If the record no longer shows the case, that is your answer and there is nothing further to do on this route.",
      "If it still shows the case after final termination, this page stops rather than guessing. It will not tell you the closure failed — that is a determination it is not entitled to make — and Missouri provides no correction petition for it, so nothing here will invent one. Take the fingerprint-based record and the certified disposition to a legal aid organisation or a public defender expungement clinic.",
      "A background check showing a case you believe closed is a separate problem. Commercial reporting companies may hold old data that no closure reaches on its own, so note who ran the check and when, and take that with you too.",
      "If what you want is the record corrected at the Highway Patrol or at the arresting agency rather than merely confirmed, that is an agency process. It sits outside this route and outside self-help."
    ],
    submissionMethod:
      "Nothing is submitted. These are record requests about yourself, not applications for relief.",
    fees: `No fee for the closure. You pay only for the records you request. ${NO_FEE_QUOTED}`,
    feeWaiver: "Not established for the record requests. Ask the office you are requesting from.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage:
      "You know what the state actually holds, and either the case is closed or you are on your way to someone who can look at why it is not.",
    canPrepare: [
      "This explanation of which search answers the question and which cannot.",
      "The order to do the checks in.",
      "The handoff, with the two documents to take, if the record is still showing."
    ],
    escalations: [
      "The record still shows the case after final termination.",
      "A background check shows a case you believe is closed.",
      "You want the record corrected rather than confirmed, which is an agency process outside self-help.",
      "You want to know whether a petition would add anything to a case already closed."
    ]
  }),

  "mo-610-141-scope-and-limits": moGuidance({
    templateId: "mo-610-141-scope-and-limits",
    mechanismName: "Drug records that clear themselves — which four offences, and the lifetime limit",
    processType: "automatic",
    whyNotAFiling:
      "The central repository screens the statewide criminal history database and expunges eligible offences of its own motion. The section creates no petition, application, request or submission of any kind for you.",
    destination: {
      name: "The Highway Patrol central repository, with the Office of the State Courts Administrator",
      detail:
        "The repository screens on a rolling basis not less than once per week, expunges eligible offences, reflects the change through the state law enforcement system and notifies the Supreme Court of Missouri and the state courts administrator, who then expunges the corresponding case records. You submit nothing to either body."
    },
    prerequisites: [
      "The conviction is for one of the four covered offences.",
      "It is not a class A felony.",
      "It was the only conviction in that case."
    ],
    documents: [
      "The docket and judgment from the clerk of the court the case was in, showing the exact section of conviction.",
      "A list of every Missouri expungement you have already had, under any law."
    ],
    gather: [
      "Whether the conviction is for possessing a controlled substance or for drug paraphernalia.",
      "Whether it was a misdemeanour or a felony, and if a felony whether it was class A.",
      "The date you finished everything the court ordered and were released from custody or supervision.",
      "Whether it was the only conviction in that case.",
      "Whether you have had any Missouri expungement before, under any law."
    ],
    sequence: [
      "Start with the scope, because the press coverage is wider than the law. This reaches four offences, not a category: possession of a controlled substance under the pre-2017 section, unlawful use of drug paraphernalia under the pre-2017 section, possession or control of a controlled substance, and unlawful possession of drug paraphernalia. Trafficking, distribution, delivery and manufacture are outside it.",
      "So Missouri is not a clean-slate state, whatever you may have read. A broader bill was widely reported and widely conflated with what actually passed, and the enacted section is materially narrower — including that it contains no bulk-processing deadline of the kind the coverage described.",
      "Check the section number on the judgment rather than the offence name. The pre-2017 sections were renumbered, so an older case can describe the same conduct under a section that no longer reads the way it did, and the section is what decides eligibility.",
      "A class A felony is excluded. So is a case that contained a conviction for anything outside the four — the automatic law then reaches none of it, not even the part that would have qualified alone.",
      "Now the limit that surprises people most: an automatic expungement uses up one of your lifetime slots. Three misdemeanours and two felonies, across the petition route and the automatic route combined, counting only the highest-level offence where a case had more than one. Relief that arrives for free still costs you a slot.",
      "Know what the relief actually is. It is closure of the record under the access statute, which the section says in terms — the same legal effect as an expungement order, not destruction. It is not erasure and nothing here will describe it that way."
    ],
    submissionMethod:
      "There is nothing to submit. The repository screens and expunges without any application from you.",
    fees: `No fee. The mechanism costs you nothing because nothing is filed. You pay only for any record you choose to obtain to check the outcome. ${NO_FEE_QUOTED}`,
    feeWaiver: "Not applicable. There is no filing and no fee to waive on this route.",
    noticeOrService: [
      "There is nobody to notify and nothing to serve.",
      "The repository notifies the Supreme Court of Missouri and the state courts administrator. Nobody is required to notify you."
    ],
    expectedNextStage:
      "You know whether the record is within the four covered offences and whether you have a lifetime slot available to spend on it.",
    canPrepare: [
      "This explanation of the four covered offences and what sits outside them.",
      "The correction to the clean-slate framing that the coverage created.",
      "The lifetime-slot limit, before a free remedy quietly spends one."
    ],
    escalations: [
      "The offence is outside the four, or the conviction is a class A felony.",
      "The case contained more than one conviction and not all of them qualify.",
      "The section of conviction is unclear on the docket, particularly for a pre-2017 case.",
      "You have prior Missouri expungements and the shared caps may already be exhausted."
    ]
  }),

  "mo-610-141-timing-and-the-alternative": moGuidance({
    templateId: "mo-610-141-timing-and-the-alternative",
    mechanismName: "Waiting for automatic relief, or petitioning now — the trade-off stated honestly",
    processType: "automatic",
    whyNotAFiling:
      "Nothing is filed on the automatic route. The alternative — a petition — is a court filing on a different track, and this sheet exists so the choice between them is made with both facts in view rather than one.",
    destination: {
      name: "Either the automatic mechanism, or the petition route",
      detail:
        "The automatic mechanism requires nothing from you but has no published start date. The petition route is available now, costs a filing fee and is a court filing. Both consume the same lifetime slot."
    },
    prerequisites: [
      "You have read the scope sheet and believe the record is within the four covered offences.",
      "You know whether you have a fixed date by which the record must be clear."
    ],
    documents: [
      "The docket and judgment for the case.",
      "A list of every Missouri expungement you have already had."
    ],
    gather: [
      "Whether you need this record cleared by a particular date, and what for.",
      "Whether you would like to talk through petitioning now against waiting.",
      "Whether you have any outstanding arrest, warrant or pending charge.",
      "Whether you have been convicted of anything since the case finished."
    ],
    sequence: [
      `Here is the timing, stated exactly. The section operates when it is technically feasible and no later than ${MO_AUTOMATIC_OUTER_LIMIT}. No implementation notice has been published. That is the whole of what is known, and it is not a start date.`,
      "So the honest position is that nobody can tell you when — or whether — your record will be reached, and this page will not pretend otherwise by giving you a date to count towards.",
      "The alternative exists today. A petition under the expungement section is available now. It costs a filing fee, it is a court filing, and it does not depend on a mechanism that may not have started.",
      "Both use the same slot. Whichever route clears the record, it counts against the same lifetime limit — so this is not a case where you can try one and fall back on the other without cost.",
      "That makes it a genuine trade-off rather than a lookup, and it is the point at which this page hands over. If you have a deadline for a job, a licence, housing or an immigration matter, do not wait on the automatic route for it.",
      "If a record you believe qualifies is not expunged once the section is operating, the petition is the only remedy the statute provides. There is no appeal to the Highway Patrol and no correction application, so nothing here will send you to an agency that cannot help."
    ],
    submissionMethod:
      "Nothing is submitted on the automatic route. The petition route is a court filing made on its own track.",
    fees: `Nothing for the automatic route. The petition route carries a filing fee, which is one of the things to weigh. ${NO_FEE_QUOTED}`,
    feeWaiver: "Not applicable to the automatic route. Ask about fee relief on the petition route.",
    noticeOrService: ["There is nobody to notify and nothing to serve on the automatic route."],
    expectedNextStage:
      "You have made the choice with both facts in front of you, or you are speaking to someone who can help you make it.",
    canPrepare: [
      "This statement of the timing, including that there is no published start date.",
      "The comparison with the petition route that is available now.",
      "The shared-slot point, which is what makes the choice irreversible."
    ],
    escalations: [
      "You need the record cleared by a fixed date.",
      "You are deciding whether to petition now or wait.",
      "You have an outstanding warrant or a pending charge.",
      "A record you believe qualifies was not expunged after the section became operative."
    ]
  }),

  "mo-610-141-how-to-check": moGuidance({
    templateId: "mo-610-141-how-to-check",
    mechanismName: "Checking whether the automatic expungement reached your record",
    processType: "automatic",
    whyNotAFiling:
      "This is the verification half of the automatic route. Nothing is filed — it is how you find out whether the repository reached your record, and where the statute says to go if it did not.",
    destination: {
      name: "The Highway Patrol criminal record, and Case.net for the court file",
      detail:
        "The repository reflects an expungement through the state law enforcement system and the state courts administrator expunges the corresponding case records, so there are two places the change should show."
    },
    prerequisites: [
      "You have read the scope and timing sheets.",
      "You understand that the mechanism has no published start date."
    ],
    documents: [
      "A fingerprint-based criminal record from the Missouri State Highway Patrol.",
      "Your Case.net search result for the case."
    ],
    gather: [
      "What the Highway Patrol record shows for the case.",
      "What Case.net shows for the case.",
      "Whether the record was expunged after the section became operative, if you know it has."
    ],
    sequence: [
      FINGERPRINT_ONLY,
      "Check both places, because two different bodies act. The repository handles the criminal history record; the state courts administrator handles the corresponding case records in the court system. They do not necessarily change on the same day.",
      "Do not read a change as confirmation of eligibility, and do not read the absence of one as a refusal. This page asserts nothing about your particular record in either direction, and neither should you until the fingerprint-based record shows you what the state holds.",
      "If a record you believe qualifies has not been expunged once the section is operating, the statute makes a petition the sole remedy. That is not a fallback this page invented — it is written into the section, and it means there is deliberately no agency appeal to pursue.",
      "One thing worth knowing about background-check companies: the statute addresses them through a data feed between agencies rather than through anything you can enforce against a reporting company yourself. If a commercial report keeps showing an expunged record, that is a separate problem."
    ],
    submissionMethod:
      "Nothing is submitted. These are record requests about yourself, not applications for relief.",
    fees: `No fee for the automatic mechanism. You pay only for the records you request. ${NO_FEE_QUOTED}`,
    feeWaiver: "Not established for the record requests. Ask the office you are requesting from.",
    noticeOrService: ["There is nobody to notify and nothing to serve."],
    expectedNextStage:
      "You know what the Highway Patrol record and the court system each show, and you know that the petition route is the only remedy if the record was missed.",
    canPrepare: [
      "This explanation of the two places to check and why they can differ.",
      "The instruction not to draw a conclusion from a name-based search.",
      "The single remedy the statute provides where a record was missed."
    ],
    escalations: [
      "A record you believe qualifies was not expunged after the section became operative.",
      "A commercial background check keeps showing a record you believe was expunged.",
      "You want to know whether an automatic expungement can be reversed."
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
      if (!MISSOURI_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(`${component.componentId}: no Missouri guidance template ${component.templateId} is registered.`);
      }
      return {
        componentId: component.componentId,
        role: "instructions" as const,
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

function missouriTrack(input: {
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
    jurisdiction: "MO",
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
  key: "immigrationMatter",
  label: "Are you not a United States citizen, or is there any immigration consequence in play?",
  required: true
};

export const MISSOURI_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  missouriTrack({
    trackId: "mo-610-105-automatic-closure",
    publicName: "Cases that already closed by law",
    mechanism: "closure_of_records_on_final_termination_by_operation_of_law",
    authority: "Mo. Rev. Stat. § 610.105; § 610.120; § 552.030; § 198.006; § 192.2400",
    recordTypes: ["court_record", "criminal_history_record", "arrest", "charge"],
    dispositions: [
      "nolle_prosequi",
      "dismissal",
      "acquittal",
      "suspended_imposition_of_sentence",
      "acquittal_mental_disease_or_defect"
    ],
    courtLevel: "not_a_court_process",
    components: [
      { componentId: "mo-610-105-automatic-closure-instructions-1", templateId: "mo-610-105-closure-what-it-is" },
      { componentId: "mo-610-105-automatic-closure-instructions-2", templateId: "mo-610-105-closure-how-to-check" }
    ],
    requiredInputs: [
      IMMIGRATION_INPUT,
      {
        key: "disposition",
        label:
          "How did the case end? Was it dismissed, was it nolle prossed by the prosecutor, were you found not guilty, or did the judge suspend the imposition of sentence and put you on probation?",
        required: true
      },
      {
        key: "sesConfusion",
        label:
          "Was it a suspended imposition of sentence, or a suspended execution of sentence? They sound alike and the difference decides everything.",
        required: true
      },
      {
        key: "sisProbationComplete",
        label: "If the judge suspended imposition of sentence, has your probation ended?",
        required: true
      },
      {
        key: "originatingCourt",
        label: "Which Missouri court and county was the case in, and what was the case number?",
        required: true
      },
      { key: "caseNetVisible", label: "When you search Case.net for your name, does this case still come up?", required: true },
      {
        key: "mshpVisible",
        label: "Does this case appear on the criminal record you obtained from the Missouri State Highway Patrol?",
        required: true
      },
      {
        key: "backgroundCheckVisible",
        label:
          "Has this case appeared on a background check run by an employer, a landlord or a licensing body?",
        required: true
      },
      {
        key: "chapter566Charge",
        label:
          "Was the charge one of the enumerated sex or endangerment offences with the imposition of sentence suspended, where the law lets the victim obtain the closed records for their own case?",
        required: true
      },
      {
        key: "wantsRecordCorrected",
        label:
          "Do you want the record corrected at the Highway Patrol or at the arresting agency, rather than merely confirmed?",
        required: true
      },
      {
        key: "wantsExpungementToo",
        label:
          "Closure and expungement are different. Would you like to know whether an expungement petition would give you more than closure already has?",
        required: true
      }
    ],
    assembledPacketName: "Missouri-Closure-By-Law-Explainer-And-Verification",
    assembledPacketTitle: "Cases that already closed by law",
    customerDeliverableDescription:
      "A two-part guidance packet: an explanation that closure happens on final termination without any filing, that closure is not expungement and leaves the judgment public with statutory access preserved, and that a suspended imposition closes while a suspended execution does not; and a verification sheet explaining that only a fingerprint-based Highway Patrol search shows closed records, with the handoff where a record is still showing.",
    notes:
      "The design's packet instructions are that closure and expungement must be kept apart — a closed record leaves the judgment public, preserves § 610.120 access and may be reached by a victim under § 610.105.2, so telling a participant their case is closed is not telling them it is gone — and that only a fingerprint-based Highway Patrol search shows records already closed, a name-based search being unable to confirm closure at all. Both are on the sheets. Where a case that should have closed is still public the guidance stops and refers out: no determination that closure failed is made, and no correction petition is invented, because Missouri provides none. A participant who has not yet checked still receives the packet, since checking is the instruction. The suspended-imposition against suspended-execution distinction is a typed stop in both directions."
  }),

  missouriTrack({
    trackId: "mo-610-141-automatic-drug",
    publicName: "Drug records that clear themselves",
    mechanism: "central_repository_automatic_expungement_of_four_drug_offenses",
    authority:
      "Mo. Rev. Stat. § 610.141; § 610.143; § 610.144; § 610.120; § 610.140; § 195.202 and § 195.233 as they existed prior to 1 January 2017; § 579.015; § 579.074; §§ 43.500 to 43.530; CCS SS SB 1421 (2026)",
    recordTypes: ["conviction", "criminal_history_record", "court_record"],
    dispositions: ["final_conviction"],
    courtLevel: "not_a_court_process",
    components: [
      { componentId: "mo-610-141-automatic-drug-instructions-1", templateId: "mo-610-141-scope-and-limits" },
      {
        componentId: "mo-610-141-automatic-drug-instructions-2",
        templateId: "mo-610-141-timing-and-the-alternative"
      },
      { componentId: "mo-610-141-automatic-drug-instructions-3", templateId: "mo-610-141-how-to-check" }
    ],
    requiredInputs: [
      IMMIGRATION_INPUT,
      {
        key: "offenseType",
        label:
          "Is the conviction for possessing a controlled substance, or for drug paraphernalia? The automatic law reaches only those four offences — not trafficking, distribution, delivery or manufacture.",
        required: true
      },
      {
        key: "offenseLevel",
        label: "Was it a misdemeanor or a felony? And if a felony, was it a class A felony?",
        required: true
      },
      {
        key: "finalDispositionDate",
        label:
          "On what date did you finish everything the court ordered and were released from any custody or supervision?",
        required: true
      },
      {
        key: "statuteUnclear",
        label:
          "Is the section of conviction unclear from the docket, particularly for a pre-2017 case where the sections were renumbered?",
        required: true
      },
      { key: "onlyChargeInCase", label: "Was this the only conviction in that case?", required: true },
      {
        key: "convictionSinceDisposition",
        label:
          "Since that date, have you been convicted of any misdemeanor or felony? Traffic regulation violations do not count.",
        required: true
      },
      {
        key: "pendingChargesOrWarrants",
        label: "Do you have any outstanding arrest, warrant or pending criminal charge right now?",
        required: true
      },
      {
        key: "priorExpungements",
        label:
          "Have you had any Missouri expungement before, under any law? Automatic and petition expungements share the same lifetime limits.",
        required: true
      },
      {
        key: "recordNotExpungedAfterOperative",
        label:
          "Has a record you believe qualifies gone un-expunged after the section became operative?",
        required: true
      },
      {
        key: "urgency",
        label:
          "Do you need this record cleared by a particular date — for a job, a licence, housing or an immigration matter?",
        required: true
      },
      {
        key: "petitionNowOrWait",
        label:
          "Would you like to talk through whether to petition now or wait for automatic relief, knowing both use the same lifetime slot?",
        required: true
      }
    ],
    assembledPacketName: "Missouri-Automatic-Drug-Expungement-Explainer",
    assembledPacketTitle: "Drug records that clear themselves",
    customerDeliverableDescription:
      "A three-part guidance packet: the scope of the four covered offences with the clean-slate framing corrected and the shared lifetime caps explained; the timing stated honestly with no published start date against a petition route available now, both consuming the same slot; and a verification sheet with the statutory sole remedy where a record was missed.",
    notes:
      "The design's packet instructions are carried in full: the scope is four offences and not a category, so Missouri is never described as a general clean-slate state; automatic expungement consumes a lifetime slot under the caps shared with the petition section, counting only the highest-level offence in a multi-count case; the relief is closure of the record under § 610.120 as § 610.141.1(4) says in terms, which is not destruction and is never called erasure; the uncertainty and the alternative are stated together, because telling a participant to wait for future relief without explaining both is not acceptable; the sole remedy for a failure to expunge is a § 610.140 petition under § 610.141.8, with no agency appeal, so a missed record routes to the petition track rather than to an agency; and secondary summaries are not used, since the enacted section is materially narrower than the broader vehicle widely conflated with it, including a bulk-processing deadline that appears nowhere in the enacted law. A participant choosing between petitioning now and waiting is an express referral trigger and is a typed stop."
  })
];
