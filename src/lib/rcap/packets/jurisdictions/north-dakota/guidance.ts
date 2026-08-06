// North Dakota process guidance — one automatic verification route and four
// routing nodes.
//
// Five assigned routes, all `process_guidance`, and none of them produces a
// participant submission.
//
// `nd-nonconviction-auto-close-verify` is relief by operation of law. Under
// N.D.C.C. § 12-60.1-05(1), where an order of nonconviction is entered on or
// after 1 August 2025 the court shall close the court record on the expiration
// of sixty-one days. Nothing is filed and nothing is requested; the official
// instructions say the participant does not need to do anything. The adopted
// design gives this route a single, blunt packet instruction, and it is the
// spine of the sheet:
//
//   Do not tell the participant the record has closed. Tell them to verify at
//   day sixty-one on the public access site and to contact the clerk if it has
//   not.
//
// So no page of that sheet reports an outcome. It gives the participant the
// date arithmetic, sends them to the public access search, and tells them what
// closing does and does not reach — the court record only; prosecutor, law
// enforcement and Bureau of Criminal Investigation records are untouched.
//
// Two release blockers shape it further, and both are honoured by saying less
// rather than more. Nothing in the statute or the official publications
// provides that the defendant is notified when the record closes, which is
// exactly why the sheet is built around looking rather than waiting. And no
// remedy is identified anywhere for a court that has not closed the record at
// day sixty-one — so the sheet says to contact the clerk, and then says plainly
// that no further route has been identified and that LegalEase will not invent
// one. A guidance sheet that guessed here would be inventing a remedy.
//
// The four routing nodes are the design's verification-and-routing decisions,
// and three of them route to counsel in every single case: trafficking-victim
// vacatur, DNA profile removal, and expungement of an unconstitutional arrest
// are each an express handoff trigger in the controlling review. The fourth,
// juvenile records, routes out of this package's adult scope. In every one of
// the four the design records that a participant-facing filing exists — a
// motion under N.D.C.C. § 12.1-41-14(1), a petition under § 31-13-07(1), a
// petition on the State v. Howe ground, and a complete official early-
// destruction motion packet published by the ND Legal Self Help Center — so
// each sheet says LegalEase does not do this rather than implying it cannot be
// done. Two are scope decisions; one is not.
//
// The one that is not is `nd-unconstitutional-arrest-expungement-routing`.
// State v. Howe, 308 N.W.2d 743 (N.D. 1981) is not available from any official
// electronic source: the official research guide says so in terms, North Dakota
// Supreme Court opinions predating 1993 are not online, and no unofficial
// mirror may supply a controlling standard. So this module names the case and
// says where it is published, and states no standard from it at all. Nothing
// here tells a participant what Howe requires.
//
// Likewise, `nd-dna-profile-removal-routing` never says where to take the
// certified order. The statute puts the laboratory's duty on receipt of one,
// and the design records that the laboratory's process and address are not
// stated in the statute or in the official guide. The sheet says the
// participant carries the certified order and that the court does not do it for
// them, and it does not invent an address.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. North
// Dakota is not an enabled jurisdiction and this job does not enable one. North
// Dakota's petition, sealing, pardon and remote-access tracks are other jobs
// and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Where a North Dakota participant looks the case up. Named once. */
const ND_RECORD_CHECK =
  "the case itself on the North Dakota courts public access site, and your own criminal history from the Bureau of Criminal Investigation";

/** Said on every sheet in this family. */
const AUTOMATIC_IS_NOT_A_REPORT =
  "Automatic describes what the law requires of the court, not what has happened in your case. Nothing on this page tells you that the record has closed, and LegalEase has not looked. Checking for yourself is the only way to know.";

/** What closing under § 12-60.1-05 reaches, and what it leaves alone. */
const COURT_RECORD_ONLY =
  "Closing reaches the court record only. Prosecutor records, law enforcement records and your Bureau of Criminal Investigation criminal history are untouched by it, and a background check that reads those will still find the case.";

/** Four bullets, deliberately — see the pagination note on the sources list. */
const ND_SOURCES: readonly string[] = [
  "N.D.C.C. ch. 12-60.1 (closing and sealing criminal records), in particular §§ 12-60.1-01 and 12-60.1-05.",
  "N.D.C.C. § 12.1-41-14 and § 12.1-41-12(1) (trafficking-victim vacatur); N.D.C.C. ch. 29-32.1 (Uniform Post-Conviction Procedure Act); N.D.C.C. § 31-13-07 (DNA profiles); N.D.C.C. § 27-20.2-25 (juvenile court records).",
  "State v. Howe, 308 N.W.2d 743 (N.D. 1981), published in print in the North Western Reporter, Second Series, volume 308 at page 743.",
  "North Dakota Supreme Court self-help materials: the Expungement Of Criminal Records Research Guide and the ND Legal Self Help Center."
];

const ND_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot close, seal, expunge or destroy anything, and cannot make a court, a clerk, a prosecutor, a law enforcement agency, the Bureau of Criminal Investigation or the State Crime Laboratory act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the process is; it is not legal advice.",
  "LegalEase does not obtain, inspect, hold or authenticate your criminal history or your court file. You look those up yourself.",
  "LegalEase has not contacted any court, clerk, agency or laboratory about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NorthDakotaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NorthDakotaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different North Dakota route. */
export class NorthDakotaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NorthDakotaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NorthDakotaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NorthDakotaBranchError";
  }
}

export const ND_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Whether every charge in the case ended favourably. A mixture is not enough. */
export const ND_CHARGE_RESOLUTION: Readonly<Record<string, boolean>> = {
  all_dismissed: true,
  all_acquitted: true,
  a_mixture: false
};

/** The offences N.D.C.C. § 12.1-41-12(1) lists for trafficking-victim vacatur. */
export const ND_TRAFFICKING_OFFENCES: Readonly<Record<string, boolean>> = {
  prostitution: true,
  misdemeanor_forgery: true,
  misdemeanor_theft: true,
  insufficient_funds_or_credit: true,
  controlled_or_counterfeit_substance: true,
  drug_paraphernalia: true,
  something_else: false
};

/** The § 31-13-07 grounds, as the design states them. */
export const ND_DNA_OUTCOMES: Readonly<Record<string, boolean>> = {
  no_felony_charge_within_a_year: true,
  dismissed: true,
  acquitted: true,
  misdemeanor_conviction: true,
  no_felony_conviction: true,
  conviction_reversed_or_dismissed: true,
  none_of_these: false
};

/** Juvenile retention runs on different clocks for the two case types. */
export const ND_JUVENILE_CASE_TYPES: Readonly<Record<string, string>> = {
  delinquency: "ten years after the final order, or your eighteenth birthday, whichever is later",
  child_in_need_of_services:
    "one year after your eighteenth birthday, or the expiry of the final order, whichever is later"
};

/** What happened in the case the arrest belongs to. */
export const ND_UNCONSTITUTIONAL_ARREST_OUTCOMES: Readonly<Record<string, boolean>> = {
  charges_dismissed: true,
  conviction_overturned: true,
  conviction_stands: false
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NorthDakotaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualized legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

/** North Dakota free and low-cost help, named once so no stop is a dead end. */
const ND_LEGAL_HELP =
  "Legal Services of North Dakota, the ND Legal Self Help Center, or a North Dakota attorney";

/** The two survivor-facing destinations the controlling review names. */
const ND_SURVIVOR_HELP = "a North Dakota attorney or a survivor legal clinic";

/**
 * Validates participant answers and routes to the correct North Dakota node.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 *
 * Note what is deliberately *not* a typed stop. Three of these five routes are
 * an attorney handoff in every case, and encoding that as a throw would mean
 * the participant never receives the sheet that tells them so. The universal
 * handoff is the content of those sheets; the typed stops here are the answers
 * that discriminate — the ones that put the participant on a different route,
 * or outside the mechanism altogether.
 */
export function deriveNorthDakotaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Asked on every route: a guidance sheet is not an eligibility opinion.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", ND_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new NorthDakotaGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      ND_LEGAL_HELP,
      "Take your court records and your criminal history to one of them and ask about your own case."
    );
  }

  if (trackId === "nd-nonconviction-auto-close-verify") {
    // The automatic route reaches orders entered on or after 1 August 2025.
    // Anything earlier is the petition route, which is a real filing with an
    // official form and is a different job.
    const before = branch(
      trackId,
      "autoOrderBeforeAugust2025",
      ND_YES_NO,
      facts.autoOrderBeforeAugust2025
    );
    if (before.resolved) {
      throw new NorthDakotaRouteMismatchError(
        trackId,
        "order_predates_the_automatic_close",
        "The court's duty to close the record on its own reaches orders of nonconviction entered on or after 1 August 2025. An earlier order is not swept up by it, and is dealt with by petitioning the court to close the record.",
        "the North Dakota nonconviction closing petition route",
        "Go back to the North Dakota intake and answer the questions for closing a nonconviction record by petition. That route is a real filing and uses an official form."
      );
    }

    const resolvedAll = branch(
      trackId,
      "autoAllChargesResolved",
      ND_CHARGE_RESOLUTION,
      facts.autoAllChargesResolved
    );
    if (!resolvedAll.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "fewer_than_all_charges_resolved_favourably",
        "A partial disposition is outside this route. Where some charges ended favourably and others did not, the case is not an order of nonconviction and the automatic close does not run on it.",
        ND_LEGAL_HELP,
        "Take the disposition entry for every charge in the case to one of them, and ask which North Dakota route reaches the case you actually have."
      );
    }

    const plea = branch(trackId, "autoPleaException", ND_YES_NO, facts.autoPleaException);
    if (plea.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "dismissal_under_a_plea_agreement_with_another_conviction",
        "A dismissal that came out of a plea agreement in which you were convicted of another offence is one of the statutory exceptions. The automatic close does not run on it.",
        ND_LEGAL_HELP,
        "Ask about the conviction you took in that agreement, because that is the record that is still live, and about which North Dakota sealing route reaches it."
      );
    }

    const others = branch(trackId, "autoOtherExceptions", ND_YES_NO, facts.autoOtherExceptions);
    if (others.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "fitness_to_proceed_criminal_responsibility_or_appeal_exception",
        "A dismissal on a fitness-to-proceed finding, a verdict of not guilty by reason of lack of criminal responsibility, and any case that was appealed are each statutory exceptions. The automatic close does not run on any of them.",
        ND_LEGAL_HELP,
        "Take the order and the docket to one of them and ask which exception applies and what, if anything, reaches your case."
      );
    }

    const expectsMore = branch(
      trackId,
      "autoExpectsAgencyRecordsToChange",
      ND_YES_NO,
      facts.autoExpectsAgencyRecordsToChange
    );
    if (expectsMore.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "participant_expects_agency_records_to_change",
        "Closing under this section reaches the court record. It does not reach prosecutor records, law enforcement records or your Bureau of Criminal Investigation criminal history, and a participant who is counting on those changing is counting on the wrong thing.",
        ND_LEGAL_HELP,
        "Ask which North Dakota route, if any, reaches the agency record you are actually worried about, before you rely on the court record closing."
      );
    }

    // The verification step. The design forbids telling the participant the
    // record has closed, and identifies no remedy where the court has not
    // closed it, so this stop goes to the clerk and stops there rather than
    // inventing a next filing.
    const stillShowing = branch(trackId, "autoVerifiedClosed", ND_YES_NO, facts.autoVerifiedClosed);
    const sixtyOneDaysPassed = branch(
      trackId,
      "autoSixtyOneDaysPassed",
      ND_YES_NO,
      facts.autoSixtyOneDaysPassed
    );
    if (stillShowing.resolved && sixtyOneDaysPassed.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "record_still_showing_after_sixty_one_days",
        "Sixty-one days have passed since the order and the case is still showing on public access. The statute puts the closing duty on the court and does not say what happens if the court has not carried it out, and no remedy for that has been identified in the statute, the official instructions or the official research guide.",
        "the clerk of the court that entered the order, and then " + ND_LEGAL_HELP,
        "Contact the clerk, tell them the date of the order, and ask about the closing. Keep the dated search result you pulled. LegalEase has not identified a further route and will not invent one, so if the clerk does not resolve it, take it to legal help."
      );
    }
  }

  if (trackId === "nd-trafficking-vacatur-routing") {
    const offence = branch(trackId, "tvOffence", ND_TRAFFICKING_OFFENCES, facts.tvOffence);
    if (!offence.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "offence_outside_the_listed_offences",
        "This route reaches the offences the statute lists: prostitution, misdemeanor forgery, misdemeanor theft, insufficient funds or credit offences, manufacture or possession of a controlled or counterfeit substance, and drug paraphernalia. A conviction outside that list is not reached by it.",
        ND_SURVIVOR_HELP,
        "Take the conviction to one of them anyway. They can tell you whether any other North Dakota route reaches it; this sheet cannot."
      );
    }

    const nexus = branch(trackId, "tvVictimisationNexus", ND_YES_NO, facts.tvVictimisationNexus);
    if (!nexus.resolved) {
      throw new NorthDakotaRouteMismatchError(
        trackId,
        "no_victimisation_nexus_asserted",
        "This route turns on the offence having been committed as a direct result of being a victim of trafficking. Without that connection the case is an ordinary record-clearing matter.",
        "the North Dakota record-clearing routes",
        "Go back to the North Dakota intake and answer the questions for the conviction you want cleared."
      );
    }

    const selfPrepare = branch(
      trackId,
      "tvWantsToRunItAlone",
      ND_YES_NO,
      facts.tvWantsToRunItAlone
    );
    if (selfPrepare.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "post_conviction_procedure_is_not_self_help",
        "The motion, any hearing on it and any relief granted are governed by the Uniform Post-Conviction Procedure Act. That is contested litigation about your own history, and it is not self-help work.",
        ND_SURVIVOR_HELP,
        "Take what you have to one of them and let them run it. Nothing is lost by asking, and the statute does not require official documentation of victim status before you do."
      );
    }
  }

  if (trackId === "nd-juvenile-records-routing") {
    const underEighteen = branch(trackId, "juvAgeAtOffence", ND_YES_NO, facts.juvAgeAtOffence);
    if (!underEighteen.resolved) {
      throw new NorthDakotaRouteMismatchError(
        trackId,
        "offence_was_not_a_juvenile_matter",
        "This node is about a juvenile court record. A case from an offence committed at eighteen or over is an adult record.",
        "the North Dakota adult record-clearing routes",
        "Go back to the North Dakota intake and answer the questions for the adult record."
      );
    }
    const caseType = branch(trackId, "juvCaseType", ND_JUVENILE_CASE_TYPES, facts.juvCaseType);
    derived.juvRetentionPeriod = caseType.resolved;

    const pending = branch(trackId, "juvPendingCharges", ND_YES_NO, facts.juvPendingCharges);
    if (pending.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "charges_pending_in_another_court",
        "The early-destruction route excludes a case where juvenile or criminal charges are pending in another court. While anything is pending, that route is closed.",
        "the juvenile court that handled the case, and " + ND_LEGAL_HELP,
        "Deal with the pending case first. Come back to the juvenile record afterwards, and ask the juvenile court then."
      );
    }

    const earlyDestruction = branch(
      trackId,
      "juvWantsEarlyDestruction",
      ND_YES_NO,
      facts.juvWantsEarlyDestruction
    );
    if (earlyDestruction.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "early_destruction_needs_a_good_cause_showing",
        "Asking for the records to be destroyed before the retention period has run is a good-cause showing to the juvenile court. That is an argument about your own circumstances, and it is not self-help work.",
        "the ND Legal Self Help Center's early-destruction motion packet, and " + ND_LEGAL_HELP,
        "The North Dakota courts publish a complete motion packet and hearing instructions for early destruction. Get that packet from the official site and take it to legal help; LegalEase does not prepare it."
      );
    }
  }

  if (trackId === "nd-dna-profile-removal-routing") {
    const outcome = branch(trackId, "dnaOutcome", ND_DNA_OUTCOMES, facts.dnaOutcome);
    if (!outcome.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "outcome_is_not_one_of_the_statutory_grounds",
        "The petition to seal runs on the grounds the statute enumerates. Where none of them describes what happened in your case, this is not the route.",
        ND_LEGAL_HELP,
        "Take the case history to one of them and ask what, if anything, reaches a profile held on your facts."
      );
    }

    const felony = branch(trackId, "dnaFelonyKeepsProfile", ND_YES_NO, facts.dnaFelonyKeepsProfile);
    if (felony.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "felony_charge_or_conviction_keeps_the_profile",
        "A felony charge or a felony conviction keeps the profile in the database, and the route does not reach a profile held on that footing.",
        ND_LEGAL_HELP,
        "Ask about the felony first. Until that changes, the profile is not reachable on this ground."
      );
    }
  }

  if (trackId === "nd-unconstitutional-arrest-expungement-routing") {
    const outcome = branch(
      trackId,
      "uaOutcome",
      ND_UNCONSTITUTIONAL_ARREST_OUTCOMES,
      facts.uaOutcome
    );
    if (!outcome.resolved) {
      throw new NorthDakotaGuidanceStopError(
        trackId,
        "conviction_has_not_been_overturned",
        "This route reaches an arrest where the charges were dismissed or the conviction was overturned. Where the conviction stands, it is not available.",
        ND_LEGAL_HELP,
        "Ask about challenging the conviction itself first. That is a different question from clearing the arrest record, and it comes first."
      );
    }

    const ground = branch(
      trackId,
      "uaConstitutionalGroundAsserted",
      ND_YES_NO,
      facts.uaConstitutionalGroundAsserted
    );
    if (!ground.resolved) {
      throw new NorthDakotaRouteMismatchError(
        trackId,
        "no_constitutional_defect_in_the_arrest_asserted",
        "This route turns on the arrest itself having been unconstitutional. Without that, the case is an ordinary record-clearing matter.",
        "the North Dakota record-clearing routes",
        "Go back to the North Dakota intake and answer the questions for the arrest or case you want cleared."
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
 * Nothing is filed at any of these nodes. Each names the body the participant
 * actually belongs in front of, and each says in the participant's own words
 * why LegalEase is not the one preparing the filing — a scope decision on three
 * of them, and an unobtainable controlling authority on the fourth.
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
    documentsToObtain: input.documentsToObtain ?? [`A copy of ${ND_RECORD_CHECK}.`],
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
    legalEaseCannotPerform: [...ND_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      ...input.escalations
    ],
    officialSourceReferences: ND_SOURCES
  };
}

export const NORTH_DAKOTA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // The one route where the law itself does the work.
  "nd-nonconviction-auto-close-verify-guidance": {
    templateId: "nd-nonconviction-auto-close-verify-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Checking that a North Dakota nonconviction record closed on its own",
    whyNotAFiling:
      "Nothing is filed and nothing is requested. Under N.D.C.C. § 12-60.1-05(1), where an order of nonconviction is entered on or after 1 August 2025, the court shall close the court record on the expiration of sixty-one days. The official instructions say you do not need to do anything, so no petition, motion or application is generated for this route.",
    processType: "automatic",
    prerequisites: [
      "The case is a North Dakota case and the court entered an order of nonconviction — every charge dismissed, or every charge acquitted.",
      "The order was entered on or after 1 August 2025. An earlier order is dealt with by petitioning the court instead, which is a real filing with an official form.",
      "None of the four statutory exceptions applies: a dismissal that came out of a plea agreement in which you were convicted of another offence, a dismissal on a fitness-to-proceed finding, a verdict of not guilty by reason of lack of criminal responsibility, or a case that was appealed.",
      "The case is not a partial disposition. Where some charges ended favourably and others did not, this route does not run."
    ],
    documentsToObtain: [
      "The order that ended the case, from the clerk of the court, or the case entry on the North Dakota courts public access site. The date the court entered that order is what the count runs from.",
      `A copy of ${ND_RECORD_CHECK}.`
    ],
    participantDataToGather: [
      "The date the court entered the order ending the case.",
      "Whether every charge was dismissed, every charge was acquitted, or it was a mixture.",
      "Whether the dismissal was part of a plea agreement in which you were convicted of something else.",
      "Whether the case was dismissed on a fitness-to-proceed finding, ended in a verdict of not guilty by reason of lack of criminal responsibility, or was appealed.",
      "Whether the case was still showing when you searched public access.",
      "Which court entered the order, and the case number, because that is the clerk you would contact if the record is still showing on day sixty-one."
    ],
    officialDestination: {
      name: "The court that entered the order of nonconviction",
      detail:
        "The court closes the court record on the expiration of sixty-one days from the order. The official instructions state that the participant does not need to do anything. Nothing is submitted by you."
    },
    actionSequence: [
      AUTOMATIC_IS_NOT_A_REPORT,
      "Find the date the court entered the order ending the case, and count sixty-one days from it. That date is when the court's duty to close the record falls due.",
      "Nothing in the statute or the official publications provides that you are told when a record has been closed. Do not wait to be notified; there is no notice to wait for.",
      "On day sixty-one, search the case on the North Dakota courts public access site.",
      "If the case no longer shows there, the court record has been closed. That is the whole of what closing does, and it is worth knowing exactly what it does not do.",
      COURT_RECORD_ONLY,
      "If the case is still showing on day sixty-one, contact the clerk of the court that entered the order, give them the date of the order, and ask about the closing. Keep the dated search result you pulled — it is what you have.",
      "Beyond contacting the clerk, no route has been identified. Neither the statute, nor the official instructions, nor the official research guide says what a person may do where the court has not closed the record, and LegalEase will not invent one. If the clerk does not resolve it, take it to legal help."
    ],
    submissionMethod:
      "There is nothing to submit. No petition, motion or application exists for this route, because the duty is the court's and not yours.",
    fees: "None. There is nothing to file, so there is nothing to pay.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nothing in the statute or the official publications provides that you are notified when the record is closed. Searching public access is how you find out."
    ],
    expectedNextStage:
      "On day sixty-one you search public access and see whether the case still shows. Until you have searched, treat the closing as pending rather than done.",
    legalEaseCanPrepare: [
      "This explanation of when the court's duty falls due, and how to check whether it has been carried out.",
      "The four statutory exceptions, stated plainly, so you can tell whether the route runs on your case at all.",
      "The limit that matters most: closing reaches the court record and nothing else."
    ],
    legalEaseCannotPerform: [
      ...ND_CANNOT_PERFORM,
      "LegalEase cannot tell you that a record has closed. Nothing here is a report about your case, and no page of it says the record closed.",
      "LegalEase cannot tell you what to do if the court has not closed the record and the clerk does not resolve it. No such route has been identified, and none is invented here."
    ],
    escalationTriggers: [
      "Sixty-one days have passed, the case is still showing, and the clerk has not resolved it.",
      "You want advice about whether a particular record qualifies.",
      "Some charges in the case ended favourably and others did not.",
      "One of the four statutory exceptions may apply to your case.",
      "You are relying on prosecutor, law enforcement or Bureau of Criminal Investigation records changing, which this route does not reach."
    ],
    officialSourceReferences: ND_SOURCES
  },

  "nd-trafficking-vacatur-routing-guidance": routingGuidance({
    templateId: "nd-trafficking-vacatur-routing-guidance",
    mechanismName: "Where to go if your conviction came from being trafficked",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here. This page routes. A motion to vacate and seal does exist under N.D.C.C. § 12.1-41-14(1) and no official form controls it, so the route is legally capable of being built — LegalEase does not prepare it because the controlling review makes every trafficking matter an attorney or survivor legal clinic handoff.",
    destination: {
      name: "A North Dakota attorney or a survivor legal clinic, and then the convicting court",
      detail:
        "The motion is made in the convicting court, and the motion, any hearing on it and any relief granted are governed by the Uniform Post-Conviction Procedure Act. Nothing is submitted through LegalEase."
    },
    prerequisites: [
      "The conviction is a North Dakota conviction.",
      "The offence is one the statute lists: prostitution, misdemeanor forgery, misdemeanor theft, an insufficient funds or credit offence, manufacture or possession of a controlled or counterfeit substance, or drug paraphernalia.",
      "The offence was committed as a direct result of your being a victim of trafficking."
    ],
    gather: [
      "What you were convicted of, and on what date.",
      "In your own words, how the offence was connected to your being trafficked.",
      "Whether you hold any official determination or documentation of victim status from a government agency.",
      "Which court convicted you."
    ],
    sequence: [
      "This is a different kind of remedy from record clearing. It asks the court to vacate the conviction and seal the record of it, on the ground that the offence came out of your being trafficked.",
      "Official documentation of victim status is not required, and not having it is not a bar. Where documentation from a federal, state, local or tribal agency does exist, the statute gives it weight: it creates a presumption that your participation was a direct result of victimisation.",
      "The motion, any hearing on it and any relief granted are governed by the Uniform Post-Conviction Procedure Act. That procedure has not been mapped here, so this page describes the route rather than walking you through it.",
      "Take it to a North Dakota attorney or a survivor legal clinic. The controlling review treats every trafficking matter as a handoff, and this page is that handoff rather than a step towards a document LegalEase will prepare.",
      "Bring what you have: the conviction, the date, any documentation of victim status, and your own account of the connection. You do not need to have it all before you ask."
    ],
    expectedNextStage:
      "An attorney or a survivor legal clinic tells you whether the motion is available on your facts, and runs it if it is.",
    extraCanPrepare: [
      "The list of offences the statute reaches, so you know before you ask whether yours is one of them.",
      "The point that documentation is not required, which is the thing most likely to stop someone asking at all."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare or file the motion to vacate and seal, and does not appear on it.",
      "LegalEase cannot tell you whether a court will find the offence was a direct result of victimisation. That is a contested question about your own history."
    ],
    escalations: [
      "Every trafficking matter. This route is a handoff in every case, not only in hard ones.",
      "The offence is outside the list the statute reaches.",
      "You want to run the motion yourself, which the post-conviction procedure makes unrealistic."
    ]
  }),

  "nd-juvenile-records-routing-guidance": routingGuidance({
    templateId: "nd-juvenile-records-routing-guidance",
    mechanismName: "Where to go about a North Dakota juvenile record",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here. This page routes. North Dakota juvenile records are outside the adult scope of this product, so LegalEase does not prepare the early-destruction motion — the North Dakota courts publish a complete motion packet and hearing instructions for it, and the route is served by the juvenile court rather than by LegalEase.",
    destination: {
      name: "The juvenile court that handled the case",
      detail:
        "Juvenile court records are retained and disposed of under rules and policies established by the Supreme Court. The ND Legal Self Help Center publishes the early-destruction motion packet and its instructions."
    },
    prerequisites: [
      "The record is a North Dakota juvenile court record — you were under eighteen at the time.",
      "For early destruction, no juvenile or criminal charges are pending against you in any other court."
    ],
    gather: [
      "Whether you were under eighteen at the time.",
      "Whether it was a delinquency case or a child in need of services case.",
      "When the case closed, and when you turned eighteen.",
      "Whether any juvenile or criminal charges are pending against you in any other court."
    ],
    sequence: [
      "Juvenile court records are not kept forever. They are retained and then disposed of under rules and policies the Supreme Court establishes, and the clock depends on which kind of case it was.",
      "For a delinquency case, retention runs ten years after the final order or your eighteenth birthday, whichever is later. For a child in need of services case, it runs one year after your eighteenth birthday or the expiry of the final order, whichever is later.",
      AUTOMATIC_IS_NOT_A_REPORT,
      "When the records are finally destroyed, the proceeding must be treated as if it never occurred: the juvenile court notifies each agency named in the record, and index references are deleted.",
      "There is also a route to ask for destruction earlier than that, by motion to the juvenile court. It is not available while juvenile or criminal charges are pending against you in another court, and it asks the court to find good cause, which is an argument about your circumstances.",
      "The North Dakota courts publish a complete motion packet and hearing instructions for early destruction through the ND Legal Self Help Center. Get it from the official site.",
      "LegalEase does not prepare the early-destruction motion. That is a decision about what this product covers, not a finding that the route cannot be run."
    ],
    expectedNextStage:
      "The juvenile court, or the official self-help materials, tell you when the records are due to be disposed of and what an early-destruction motion needs.",
    extraCanPrepare: [
      "The two retention clocks, so you can work out roughly where your case sits.",
      "The effect of final destruction, which is that the proceeding is treated as if it never occurred."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare the North Dakota early-destruction motion and does not appear at a juvenile hearing.",
      "LegalEase cannot tell you whether a juvenile court will find good cause to destroy records early."
    ],
    escalations: [
      "Any juvenile record. It is outside the adult scope of this package in every case.",
      "Charges are pending against you in any court, which closes the early-destruction route.",
      "You want to ask for early destruction, which needs a good-cause showing."
    ]
  }),

  "nd-dna-profile-removal-routing-guidance": routingGuidance({
    templateId: "nd-dna-profile-removal-routing-guidance",
    mechanismName: "Where to go about a North Dakota DNA profile",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here. This page routes. A petition to seal does exist under N.D.C.C. § 31-13-07(1) and no official form controls it, so the route is legally capable of being built — LegalEase does not prepare it because the controlling review makes every DNA matter an attorney handoff.",
    destination: {
      name: "A North Dakota attorney, and then the district court",
      detail:
        "The petition is made to the district court. Where the court seals, the State Crime Laboratory expunges the identifiable information and destroys the samples on receipt of a certified order. Nothing is submitted through LegalEase."
    },
    prerequisites: [
      "Your DNA profile is in the state database.",
      "What happened in your case is one of the grounds the statute enumerates.",
      "No felony charge or felony conviction is keeping the profile in the database."
    ],
    documentsToObtain: [
      `A copy of ${ND_RECORD_CHECK}.`,
      "Whatever you hold about the arrest that put the profile in the database, and about how that case ended."
    ],
    gather: [
      "The date of the arrest that put your DNA in the database.",
      "What happened afterwards — no felony charge within a year, a dismissal, an acquittal, a misdemeanor conviction, no felony conviction, or a reversal or dismissal of the conviction the profile was based on.",
      "Whether any felony charge or conviction is still in play."
    ],
    sequence: [
      "This route has two halves, and the second one is the one people miss. First, the district court seals the court record on one of the grounds the statute enumerates. Then, and only on receipt of a certified order, the State Crime Laboratory expunges the identifiable information in the database and destroys the samples.",
      "You carry the certified order to the laboratory. The court does not do it for you, and nothing happens at the laboratory until the certified order reaches it.",
      "Where and how a certified order is delivered to the laboratory is not stated in the statute or in the official expungement guide, so this page does not tell you. Ask the attorney running the petition, or ask the laboratory directly; do not rely on an address from anywhere else.",
      "A sealed record on this route may not be opened even by order of the court, which is a stronger effect than most record-clearing routes have.",
      "One thing the statute is explicit about, and it is worth hearing before you start: a detention, an arrest or a conviction based on database information is not invalidated even if the samples should have been expunged. Clearing the profile does not undo what was done with it.",
      "Take it to a North Dakota attorney. The controlling review treats every DNA matter as a handoff, and this page is that handoff rather than a step towards a document LegalEase will prepare."
    ],
    expectedNextStage:
      "An attorney tells you whether one of the statutory grounds fits your case, and runs the petition if it does.",
    extraCanPrepare: [
      "The two halves of the route, so the laboratory step is not forgotten after the court seals.",
      "The statute's own warning that clearing a profile does not invalidate what was done on the strength of it."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare or file the petition to seal, and does not appear on it.",
      "LegalEase cannot tell you where or how to deliver a certified order to the State Crime Laboratory, because that is not stated in the statute or in the official guide. Nothing on this page is an address for it."
    ],
    escalations: [
      "Every DNA matter. This route is a handoff in every case, not only in hard ones.",
      "A felony charge or conviction is keeping the profile in the database.",
      "The court has sealed and you do not know how to get the certified order to the laboratory."
    ]
  }),

  "nd-unconstitutional-arrest-expungement-routing-guidance": routingGuidance({
    templateId: "nd-unconstitutional-arrest-expungement-routing-guidance",
    mechanismName: "Where to go if you believe your arrest was unconstitutional",
    processType: "court_adjacent",
    whyNotAFiling:
      "Nothing is filed here. This page routes, and on this route LegalEase could not build a packet even if it were in scope. The official expungement guide identifies State v. Howe as the source of the route, but the decision cannot be obtained from any official electronic source, so no standard from it can be stated here.",
    destination: {
      name: "A North Dakota attorney, and then the court where the arrest record originates",
      detail:
        "The petition is made to the court where the arrest record originates. The controlling review makes every unconstitutional-arrest matter an attorney handoff. Nothing is submitted through LegalEase."
    },
    prerequisites: [
      "The arrest is a North Dakota arrest.",
      "The charges were dismissed, or the conviction was overturned. Where the conviction stands, this route is not available.",
      "You are saying the arrest itself was unconstitutional, rather than asking for an ordinary record clearing."
    ],
    gather: [
      "The date you were arrested, and which agency arrested you.",
      "Whether the charges were dismissed or a conviction was overturned, and when.",
      "In your own words, why you believe the arrest itself was unconstitutional.",
      "Which court the arrest record originates in."
    ],
    sequence: [
      "The North Dakota courts' own expungement research guide lists this as one of the state's expungement routes: where an arrest was unconstitutional and the charges were dismissed or the conviction overturned, the defendant may petition the court to expunge the arrest records.",
      "There is no North Dakota Century Code section for it. The route comes from a decision of the North Dakota Supreme Court, State v. Howe, decided in 1981.",
      "This page does not tell you what that decision requires, and that is deliberate. The official research guide says the decision is not available at the courts' own site, North Dakota Supreme Court opinions from before 1993 are not published online, and it is in print in the North Western Reporter, Second Series, volume 308 at page 743. LegalEase will not take a standard from an unofficial copy and put it in front of you as the law.",
      "So: the route is real, and what it requires is something you need from someone who can read the decision. That is a law library or an attorney, not this page.",
      "Take it to a North Dakota attorney. The controlling review treats every unconstitutional-arrest matter as a handoff, and a constitutional argument about your own arrest is not self-help work in any event.",
      "If what you want is the arrest record cleared and you are not arguing the arrest was unconstitutional, say so — North Dakota has ordinary routes for that, and they are simpler."
    ],
    expectedNextStage:
      "An attorney reads the decision, tells you whether the route fits your arrest, and runs the petition if it does.",
    extraCanPrepare: [
      "Where the controlling decision is published, so somebody can actually go and read it.",
      "The reason this page states no standard, rather than leaving you to assume none exists."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare or file a petition on this ground, and does not appear on it.",
      "LegalEase cannot tell you what that decision requires. It is not available from an official electronic source, and an unofficial copy is not something LegalEase will treat as the law."
    ],
    escalations: [
      "Every unconstitutional-arrest matter. This route is a handoff in every case.",
      "The conviction has not been overturned, which closes this route.",
      "You need to know what the decision actually requires, which needs someone who can read it."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!NORTH_DAKOTA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no North Dakota guidance template ${templateId} is registered.`);
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

const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  }
];

function northDakotaTrack(input: {
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
    jurisdiction: "ND",
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

export const NORTH_DAKOTA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  northDakotaTrack({
    trackId: "nd-nonconviction-auto-close-verify",
    publicName: "Check that your North Dakota nonconviction record closed on its own",
    mechanism: "automatic_closing_of_nonconviction_court_records",
    authority: "N.D.C.C. § 12-60.1-05(1); N.D.C.C. § 12-60.1-01",
    recordTypes: ["arrest", "charge"],
    dispositions: ["dismissed", "acquitted"],
    componentId: "nd-nonconviction-auto-close-verify-process-guidance-1",
    templateId: "nd-nonconviction-auto-close-verify-guidance",
    extraInputs: [
      {
        key: "autoOrderDate",
        label: "On what date did the court enter the order ending the case?",
        required: true
      },
      {
        key: "autoOrderBeforeAugust2025",
        label: "Was that date before 1 August 2025?",
        required: true
      },
      {
        key: "autoAllChargesResolved",
        label: "Were all of the charges dismissed, all acquitted, or a mixture?",
        required: true
      },
      {
        key: "autoPleaException",
        label:
          "Was the dismissal part of a plea agreement where you were convicted of something else?",
        required: true
      },
      {
        key: "autoOtherExceptions",
        label:
          "Was the case dismissed on a fitness-to-proceed finding, was there a verdict of not guilty by reason of lack of criminal responsibility, or was the case appealed?",
        required: true
      },
      {
        key: "autoExpectsAgencyRecordsToChange",
        label:
          "Are you expecting your Bureau of Criminal Investigation, prosecutor or law enforcement records to change as well?",
        required: true
      },
      {
        key: "autoSixtyOneDaysPassed",
        label: "Have sixty-one days passed since the court entered the order?",
        required: true
      },
      {
        key: "autoVerifiedClosed",
        label:
          "When you searched the case on the North Dakota courts public access site, was it still showing?",
        required: true
      }
    ],
    assembledPacketName: "Nonconviction-Close-Verification",
    assembledPacketTitle: "Checking that a North Dakota nonconviction record closed on its own",
    customerDeliverableDescription:
      "A guidance sheet explaining that the court closes the record of an order of nonconviction entered on or after 1 August 2025 on the expiration of sixty-one days with nothing filed, the four statutory exceptions, that closing reaches the court record only, and how to verify on the public access site at day sixty-one.",
    notes:
      "The adopted design forbids telling the participant the record has closed, so no page of this sheet reports an outcome. No notice provision was identified, which is why the sheet is built around searching rather than waiting, and no remedy was identified where the court has not closed the record — the sheet routes to the clerk, says plainly that no further route has been identified, and does not invent one. A pre-1 August 2025 order routes to the nonconviction closing petition."
  }),

  northDakotaTrack({
    trackId: "nd-trafficking-vacatur-routing",
    publicName: "Where to go if your conviction came from being trafficked",
    mechanism: "routing_of_human_trafficking_victim_vacatur_and_sealing",
    authority: "N.D.C.C. § 12.1-41-14; N.D.C.C. § 12.1-41-12(1); N.D.C.C. ch. 29-32.1",
    recordTypes: ["conviction"],
    dispositions: ["convicted"],
    componentId: "nd-trafficking-vacatur-routing-process-guidance-1",
    templateId: "nd-trafficking-vacatur-routing-guidance",
    extraInputs: [
      { key: "tvOffence", label: "What were you convicted of?", required: true },
      { key: "tvConvictionDate", label: "On what date were you convicted?", required: true },
      {
        key: "tvVictimisationNexus",
        label: "Was the offence connected to your being trafficked?",
        required: true
      },
      {
        key: "tvOfficialDocumentation",
        label:
          "Do you have any official determination or documentation of victim status from a government agency?",
        required: true
      },
      {
        key: "tvWantsToRunItAlone",
        label: "Do you want to prepare and run the motion yourself?",
        required: true
      }
    ],
    assembledPacketName: "Trafficking-Vacatur-Routing",
    assembledPacketTitle: "Where to go if your conviction came from being trafficked",
    customerDeliverableDescription:
      "A guidance sheet explaining that a motion to vacate the conviction and seal the record is available for listed offences committed as a direct result of being trafficked, that official documentation of victim status is not required but creates a presumption where it exists, and that the route is an attorney or survivor legal clinic handoff.",
    notes:
      "The controlling review makes every trafficking matter a handoff, and the design records that a participant-facing motion exists and no official form controls it — so the sheet says LegalEase does not prepare it rather than implying no filing exists. The Chapter 29-32.1 procedural overlay is an open release blocker, so the sheet describes the route and does not walk the participant through the procedure."
  }),

  northDakotaTrack({
    trackId: "nd-juvenile-records-routing",
    publicName: "Where to go about a North Dakota juvenile record",
    mechanism: "routing_of_juvenile_court_record_retention_and_destruction",
    authority: "N.D.C.C. § 27-20.2-25; N.D.R.Juv.P. 14 and 19; N.D.R.Ct. 3.2",
    recordTypes: ["juvenile_adjudication"],
    dispositions: ["adjudicated"],
    componentId: "nd-juvenile-records-routing-process-guidance-1",
    templateId: "nd-juvenile-records-routing-guidance",
    extraInputs: [
      { key: "juvAgeAtOffence", label: "Were you under eighteen at the time?", required: true },
      {
        key: "juvCaseType",
        label: "Was it a delinquency case or a child in need of services case?",
        required: true
      },
      {
        key: "juvFinalOrderDate",
        label: "When did the case close, and when did you turn eighteen?",
        required: true
      },
      {
        key: "juvPendingCharges",
        label: "Do you have any juvenile or criminal charges pending in any other court?",
        required: true
      },
      {
        key: "juvWantsEarlyDestruction",
        label: "Do you want to ask the court to destroy the records early?",
        required: true
      }
    ],
    assembledPacketName: "Juvenile-Record-Routing",
    assembledPacketTitle: "Where to go about a North Dakota juvenile record",
    customerDeliverableDescription:
      "A guidance sheet explaining the two juvenile retention clocks, that final destruction means the proceeding is treated as if it never occurred with each named agency notified and index references deleted, that an early-destruction motion packet is published officially, and that LegalEase does not prepare it.",
    notes:
      "Juvenile records are outside this package's adult scope. The design records that a complete official motion packet and hearing instructions exist and that the controlling review carried no authority for the row at all, so the sheet points at the official packet and says the scope decision is LegalEase's rather than implying the route cannot be run."
  }),

  northDakotaTrack({
    trackId: "nd-dna-profile-removal-routing",
    publicName: "Where to go about a North Dakota DNA profile",
    mechanism: "routing_of_dna_profile_sealing_and_laboratory_expungement",
    authority: "N.D.C.C. § 31-13-07",
    recordTypes: ["dna_profile"],
    dispositions: ["dismissed", "acquitted", "convicted"],
    componentId: "nd-dna-profile-removal-routing-process-guidance-1",
    templateId: "nd-dna-profile-removal-routing-guidance",
    extraInputs: [
      {
        key: "dnaArrestDate",
        label: "On what date was the arrest that put your DNA in the database?",
        required: true
      },
      {
        key: "dnaOutcome",
        label:
          "What happened — no felony charge within a year, a dismissal, an acquittal, a misdemeanor conviction, no felony conviction, or a reversal or dismissal of the conviction the profile was based on?",
        required: true
      },
      {
        key: "dnaFelonyKeepsProfile",
        label: "Is any felony charge or felony conviction still in play?",
        required: true
      }
    ],
    assembledPacketName: "DNA-Profile-Routing",
    assembledPacketTitle: "Where to go about a North Dakota DNA profile",
    customerDeliverableDescription:
      "A guidance sheet explaining that the district court seals on enumerated grounds and the State Crime Laboratory expunges and destroys the samples on receipt of a certified order the participant carries, that the sealed record may not be opened even by court order, that a detention, arrest or conviction based on database information is not invalidated, and that the route is an attorney handoff.",
    notes:
      "The laboratory's process and address are not stated in the statute or in the official guide, so the sheet says the participant carries the certified order and expressly declines to give an address for it. A participant-facing petition exists and no official form controls it, so the sheet says LegalEase does not prepare it rather than implying no filing exists."
  }),

  northDakotaTrack({
    trackId: "nd-unconstitutional-arrest-expungement-routing",
    publicName: "Where to go if you believe your arrest was unconstitutional",
    mechanism: "routing_of_unconstitutional_arrest_record_expungement",
    authority: "State v. Howe, 308 N.W.2d 743 (N.D. 1981)",
    recordTypes: ["arrest"],
    dispositions: ["dismissed", "conviction_overturned"],
    componentId: "nd-unconstitutional-arrest-expungement-routing-process-guidance-1",
    templateId: "nd-unconstitutional-arrest-expungement-routing-guidance",
    extraInputs: [
      { key: "uaArrestDate", label: "On what date were you arrested?", required: true },
      {
        key: "uaOutcome",
        label: "Were the charges dismissed, was a conviction overturned, or does the conviction stand?",
        required: true
      },
      {
        key: "uaConstitutionalGroundAsserted",
        label: "Are you saying the arrest itself was unconstitutional?",
        required: true
      },
      {
        key: "uaConstitutionalGround",
        label: "In your own words, why do you believe the arrest itself was unconstitutional?",
        required: false
      }
    ],
    assembledPacketName: "Unconstitutional-Arrest-Routing",
    assembledPacketTitle: "Where to go if you believe your arrest was unconstitutional",
    customerDeliverableDescription:
      "A guidance sheet explaining that the official expungement research guide lists a route to petition for expungement of an unconstitutional arrest where the charges were dismissed or the conviction overturned, that it comes from a 1981 decision rather than a statute, where that decision is published, and why this sheet states no standard from it.",
    notes:
      "The controlling authority cannot be obtained from any official electronic source and no unofficial mirror may supply it, so the sheet names the decision and its print citation and states nothing about what it requires. Every unconstitutional-arrest matter is an attorney handoff, and a constitutional showing is not self-help work in any event."
  })
];
