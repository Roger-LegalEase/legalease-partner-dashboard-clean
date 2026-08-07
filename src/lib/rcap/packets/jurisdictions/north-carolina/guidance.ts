// North Carolina process guidance — one route, and it runs without anybody
// asking for it.
//
// `nc_auto_146_a4` is automatic expunction under N.C. Gen. Stat. § 15A-146(a4).
// Where a person is charged with a misdemeanour, a felony or an infraction and
// every charge in the case is disposed on or after 1 December 2021 by
// dismissal, a finding of not guilty or a finding of not responsible, the
// charges are expunged by operation of law not less than 180 and not more than
// 210 days after final disposition, if the statutory conditions are met. There
// is no petition, no form and no fee, so there is nothing for a participant to
// file and nothing for LegalEase to generate. The General Assembly postponed
// the automatic process until 1 July 2024, and the packet says so, because a
// participant whose case ended in 2022 will otherwise conclude the route
// failed them.
//
// The deliverable is therefore three things the design names: a timing
// calculation, a verification step through the participant's own State Bureau
// of Investigation record, and an honest account of the gap at the end of the
// route.
//
// Four things this sheet has to hold, and each is a trap the design names:
//
//   - **The court clearing its record is not every agency clearing theirs.**
//     For an automatic expunction under subsection (a4) the clerk is not
//     required to transmit an expunction order to other entities. So a record
//     that has gone from the court file can still sit with an agency, and the
//     participant who assumes otherwise finds out from an employer. Where the
//     Bureau record shows exactly that, there is a separate North Carolina
//     route that prepares the participant's written request to the holder —
//     it is not this track, and nothing here prepares it.
//   - **Expunction is not destruction, and the design says so in terms.** The
//     record-destruction claim is withdrawn and replaced by the sections that
//     actually govern what survives, G.S. 15A-151(a1) and 15A-151.5. Neither
//     is described beyond § 15A-151's own published subject, confidential
//     agency files, because their text was not read for this page.
//   - **The eligibility gate is not fully encoded, and the page must not
//     pretend it is.** The full list of conditions in subsection (a4) was not
//     read at the official source in the controlling review. The conditions
//     that are established are set out; the participant is told the list is
//     not complete here and is sent to their own record rather than to a
//     conclusion.
//   - **What happens where the automatic expunction never ran at all is not
//     established.** That is a real gap rather than an omission, and it is
//     stated as one. No appeal, no deadline and no remedy is invented; the
//     participant gets the clerk of superior court, the Bureau and legal help,
//     which are the destinations that exist.
//
// Two roles are kept straight because North Carolina mixes them. Some
// expunctions are petitioned for by the person and some are petitioned for by
// the district attorney. This route is neither: nobody petitions, and the
// participant's part is to check and to keep copies.
//
// No conditional component and no fact placeholder appears here: the adopted
// packet set carries a single required component and the template interpolates
// no participant answer, so a second fixture would render byte-for-byte the
// same packet. The branches that matter are typed stops, and all nine are
// exercised as negative cases in the committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. North
// Carolina is not an enabled jurisdiction and this job does not enable one.
// The petition routes and their official AOC forms belong to other jobs, are
// not named here, and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** North Carolina legal help, named once so no stop is a dead end. */
const NC_LEGAL_HELP =
  "a North Carolina legal aid office, a North Carolina law school legal clinic, an expunction clinic run by a local bar association, or a North Carolina attorney who does record-clearing work";

/** The petition alternative, named the same way by every stop that points at it. */
const NC_PETITION_ROUTE =
  "the North Carolina petition routes, which are separate routes in the North Carolina intake";

/** The clerk, named the same way everywhere, because it is the office that answers. */
const NC_CLERK = "the clerk of superior court in the county where the charge was brought";

const NC_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, remove or clear anything, and cannot make a court, a clerk, a prosecutor or a records agency act.",
  "LegalEase cannot tell you whether a particular case qualifies. This page explains how a process works; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged. Only your own criminal record check shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you.",
  "LegalEase does not prepare a petition on this route, because there is no petition on this route to prepare.",
  "LegalEase cannot tell you when a particular case will be reached. Where this page gives a period, it is the one the statute gives, not a prediction."
];

const NC_SOURCES: readonly string[] = [
  "N.C. Gen. Stat. § 15A-146, expunction of records when charges are dismissed or there are findings of not guilty, read at the General Assembly on 5 August 2026.",
  "N.C. Gen. Stat. § 15A-150, notification requirements, read at the General Assembly on 5 August 2026.",
  "N.C. Gen. Stat. § 15A-151, confidential agency files, read at the General Assembly on 5 August 2026.",
  "North Carolina State Bureau of Investigation, right to review your own criminal history, instructions read on 1 August 2026."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class NorthCarolinaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NorthCarolinaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different North Carolina route. */
export class NorthCarolinaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "NorthCarolinaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class NorthCarolinaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "NorthCarolinaBranchError";
  }
}

export const NC_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** North Carolina expunction reaches North Carolina state records and nothing else. */
export const NC_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  north_carolina_state: "within",
  another_state: "outside",
  federal: "outside",
  military: "outside",
  tribal: "outside"
};

/** The disposition boundary the automatic route runs on. */
export const NC_DISPOSITION_ERA: Readonly<Record<string, string>> = {
  on_or_after_1_december_2021: "within",
  before_1_december_2021: "outside"
};

/** How the case ended. A court dismissal opens the incapable-to-proceed question. */
export const NC_DISPOSITION_TYPES: Readonly<Record<string, string>> = {
  dismissed_by_the_state: "state_dismissal",
  dismissed_by_the_court: "court_dismissal",
  found_not_guilty: "acquittal",
  found_not_responsible: "not_responsible"
};

/** What the participant's own record check shows once the window has passed. */
export const NC_RECORD_STATUS_AFTER_WINDOW: Readonly<Record<string, string>> = {
  no_longer_shows: "cleared",
  still_shows: "still_shows",
  not_yet_checked: "unchecked"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new NorthCarolinaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers and routes to the correct North Carolina node.
 *
 * The order is the design's: record jurisdiction, then the immigration
 * exposure the design records as a self-help boundary on this track in
 * particular, then the disposition boundary, then each exclusion in the order
 * the design lists it, then the two questions that are about what has already
 * happened rather than about eligibility.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveNorthCarolinaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. North Carolina law reaches North Carolina records.
  const jurisdiction = branch(
    trackId,
    "recordJurisdiction",
    NC_RECORD_JURISDICTIONS,
    facts.recordJurisdiction
  );
  if (jurisdiction.resolved === "outside") {
    throw new NorthCarolinaRouteMismatchError(
      trackId,
      "record_is_not_a_north_carolina_state_record",
      "North Carolina's automatic expunction runs on North Carolina charges in North Carolina courts. It does not reach a federal, military, tribal or out-of-state record, and nothing on this route touches one.",
      "the state, federal, military or tribal authority that holds the record",
      "Take the record to that authority and ask what its own law provides for clearing it. If you also have North Carolina charges, those are handled separately and only those are served here."
    );
  }

  // Gate 2. Immigration, which on this track cuts the other way.
  const immigration = branch(trackId, "immigrationMatter", NC_YES_NO, facts.immigrationMatter);
  if (immigration.resolved) {
    throw new NorthCarolinaGuidanceStopError(
      trackId,
      "immigration_matter_in_play",
      "This is the one place on this route where relief can work against you, so it is a stop rather than a warning. An expunction restricts access to the underlying court records, and an immigration case can turn on being able to produce exactly those records — the charging document, the dismissal, the judgment. Because this route runs by operation of law, it can happen without you asking for it and without anybody telling you it is coming.",
      "an immigration attorney",
      "Speak to an immigration attorney before the window runs, and ask the clerk of superior court for certified copies of the charging documents, the dismissal orders and the judgments now, while you can still get them."
    );
  }

  // Gate 3. The disposition boundary.
  const era = branch(trackId, "finalDispositionEra", NC_DISPOSITION_ERA, facts.finalDispositionEra);
  if (era.resolved === "outside") {
    throw new NorthCarolinaRouteMismatchError(
      trackId,
      "final_disposition_predates_the_automatic_route",
      "The automatic route runs on cases disposed on or after 1 December 2021. A case that ended before that date is not reached by it, however favourably it ended. That is a boundary in the statute rather than a backlog, so waiting will not bring it within reach.",
      NC_PETITION_ROUTE + ", and " + NC_LEGAL_HELP,
      "Go back to the North Carolina intake with the disposition date and ask about the petition routes, which are not limited to that date in the same way."
    );
  }

  // Gate 4. Every charge in the case, not merely the one being asked about.
  const allFavourable = branch(
    trackId,
    "everyChargeDisposedFavourably",
    NC_YES_NO,
    facts.everyChargeDisposedFavourably
  );
  if (!allFavourable.resolved) {
    throw new NorthCarolinaRouteMismatchError(
      trackId,
      "not_every_charge_in_the_case_was_disposed_favourably",
      "The automatic route works on the case rather than on the charge. Every charge in it has to have been dismissed, or found not guilty, or found not responsible. Where one charge ended another way, the case is not reached by this route even though the charge you are asking about ended well.",
      NC_PETITION_ROUTE + ", and " + NC_LEGAL_HELP,
      "Go back to the North Carolina intake with the disposition for every charge in the case, and ask which route fits a mixed case."
    );
  }

  // Gate 5. Deferred prosecution and conditional discharge are treated differently.
  const deferred = branch(
    trackId,
    "deferredProsecutionOrConditionalDischarge",
    NC_YES_NO,
    facts.deferredProsecutionOrConditionalDischarge
  );
  if (deferred.resolved) {
    throw new NorthCarolinaRouteMismatchError(
      trackId,
      "dismissal_came_through_a_deferred_prosecution_or_conditional_discharge",
      "A dismissal that came at the end of a deferred prosecution or a conditional discharge agreement is treated differently from an ordinary dismissal, and it is not on the automatic route. It is worth knowing before you plan around it that the route it does belong to is a petition route and carries a fee.",
      NC_PETITION_ROUTE + ", and " + NC_LEGAL_HELP,
      "Go back to the North Carolina intake, say that the dismissal followed a deferred prosecution or a conditional discharge, and ask what the petition route costs before you commit to it."
    );
  }

  // Gate 6. The plea-agreement felony exclusion.
  const pleaFelony = branch(
    trackId,
    "felonyDismissedUnderAPleaAgreement",
    NC_YES_NO,
    facts.felonyDismissedUnderAPleaAgreement
  );
  if (pleaFelony.resolved) {
    throw new NorthCarolinaRouteMismatchError(
      trackId,
      "felony_charge_was_dismissed_under_a_plea_agreement",
      "Section 15A-146(a) says that no case with a felony charge dismissed pursuant to a plea agreement is expunged under that subsection. That is a specific exclusion on a specific subsection, and whether any other North Carolina route reaches the case is a question this page does not answer and should not be read as answering.",
      NC_LEGAL_HELP + ", and " + NC_PETITION_ROUTE,
      "Take the plea agreement, the dismissal and the judgment to one of them and ask which subsection, if any, reaches the case."
    );
  }

  // Gate 7. The incapable-to-proceed dismissal, asked only where the court dismissed.
  const disposition = branch(trackId, "dispositionType", NC_DISPOSITION_TYPES, facts.dispositionType);
  if (disposition.resolved === "court_dismissal") {
    const incapable = branch(
      trackId,
      "dismissedAsIncapableToProceed",
      NC_YES_NO,
      facts.dismissedAsIncapableToProceed
    );
    if (incapable.resolved) {
      throw new NorthCarolinaGuidanceStopError(
        trackId,
        "dismissal_was_on_the_ground_of_incapacity_to_proceed",
        "This one turns on a date and then stops being clear. For dismissals on or after 1 December 2025, a dismissal by the court of a charge against a defendant found incapable to proceed is not eligible for expunction under section 15A-146 and is not to be included in an automatic expunction. For a dismissal before that date the position is genuinely open and this page does not resolve it, because it has not been settled.",
        NC_LEGAL_HELP,
        "Take the dismissal order, with its date, to one of them and ask which side of 1 December 2025 it falls on and what follows from that."
      );
    }
  }

  // Gate 8. What the participant's own record check already showed.
  const status = branch(
    trackId,
    "recordStatusAfterWindow",
    NC_RECORD_STATUS_AFTER_WINDOW,
    facts.recordStatusAfterWindow
  );
  if (status.resolved === "still_shows") {
    throw new NorthCarolinaGuidanceStopError(
      trackId,
      "record_still_shows_after_the_statutory_window",
      "There are two quite different explanations for that and they have different answers. The expunction may have run at the court while an agency still holds its own copy, which is expected rather than surprising here, because on this route the clerk is not required to transmit an order to other entities. Or the expunction may not have run at all — and what remedy exists for that is not established. This page will not invent one, and there is no appeal or deadline attached to the automatic route to point you at.",
      NC_CLERK + ", the North Carolina State Bureau of Investigation, and " + NC_LEGAL_HELP,
      "Ask the clerk whether the case was expunged and when, and ask the Bureau what its record now shows. If the court expunged it but a named agency still holds it, there is a separate North Carolina route that prepares your written request to that holder, and the intake will take you to it. If nothing was expunged at all, take both answers to legal help."
    );
  }

  // Gate 9. Never a petition on this route before the case has been checked.
  const wantsPetition = branch(
    trackId,
    "wantsAPetitionPreparedNow",
    NC_YES_NO,
    facts.wantsAPetitionPreparedNow
  );
  if (wantsPetition.resolved && status.resolved === "unchecked") {
    throw new NorthCarolinaGuidanceStopError(
      trackId,
      "petition_requested_before_the_automatic_route_was_checked",
      "Bringing a petition for something that has already happened by operation of law costs time and, on the routes that charge one, a fee — and this route charges nothing at all. Checking first is not a delay; it is the step that tells you whether anything is needed.",
      "the North Carolina State Bureau of Investigation, and then " + NC_CLERK,
      "Request a right-to-review copy of your own North Carolina criminal history from the Bureau and see whether the case is still there. Come back with the answer, and bring it to the intake if a petition still looks necessary."
    );
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance template
// ---------------------------------------------------------------------------

export const NORTH_CAROLINA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "nc-auto-146-a4-process-guidance": {
    templateId: "nc-auto-146-a4-process-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Automatic expunction of a dismissed North Carolina case, and how to check it",
    whyNotAFiling:
      "Nothing is filed by you and nothing is filed for you, because on this route relief happens by operation of law. Under N.C. Gen. Stat. section 15A-146(a4) a case in which every charge was disposed favourably on or after 1 December 2021 is expunged automatically, without a petition, without a form and without a fee. There is nothing here for LegalEase to generate. What this page does is work out when the window falls, show you how to check whether it ran, and tell you plainly where the route stops being reliable.",
    processType: "automatic",
    prerequisites: [
      "The charges were North Carolina charges in a North Carolina court.",
      "Every charge in the case ended in a dismissal, a finding of not guilty or a finding of not responsible.",
      "The last of those dispositions was on or after 1 December 2021.",
      "You are willing to check your own record rather than assume either way."
    ],
    documentsToObtain: [
      "A right-to-review copy of your own North Carolina criminal history from the State Bureau of Investigation. This is the instrument that shows whether the automatic expunction actually ran, and whether other agencies still hold the record.",
      "Copies of the charging documents, the dismissal orders and the judgments, from the clerk of superior court in the county where the charge was brought. Get these before the expunction takes effect and keep them permanently.",
      "The case file or a copy of the disposition from that clerk, where your criminal record check is unclear about how or when the case ended."
    ],
    participantDataToGather: [
      "The date the last charge in the case reached its final disposition.",
      "Whether every charge in the case was dismissed, found not guilty or found not responsible.",
      "How the case ended: dismissed by the State, dismissed by the court, found not guilty, or found not responsible.",
      "Whether any dismissal came at the end of a deferred prosecution or a conditional discharge agreement.",
      "Whether any felony charge in the case was dismissed as part of a plea agreement.",
      "The county where each charge was brought, and the file number if you have it."
    ],
    officialDestination: {
      name: "The North Carolina courts and the Administrative Office of the Courts — and, for checking, the clerk of superior court and the State Bureau of Investigation",
      detail:
        "The route is administered through the courts and the Administrative Office of the Courts. There is no petition, no form and no fee, and nothing is submitted by you at any point. Afterwards, the two offices that can answer a question are the clerk of superior court in the county where the charge was brought, who holds the case file and any expunction order, and the State Bureau of Investigation, whose record is what a background check draws on."
    },
    actionSequence: [
      "This page explains how a process works. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether a particular case qualifies.",
      "Start with what the route is, because it is unusual and most people have not heard of it. Where a person is charged with a misdemeanour, a felony or an infraction, and every charge in that case is disposed on or after 1 December 2021 by dismissal, by a finding of not guilty or by a finding of not responsible, section 15A-146(a4) expunges the charges by operation of law. Nobody applies. Nobody pays. The court does it.",
      "When it happens: not less than 180 days and not more than 210 days after the date of final disposition, provided the statutory conditions are met. So the earliest useful moment to look is about six months after the case ended, and the honest outer edge is about seven.",
      "One date correction that matters more than it sounds, because it explains a great many disappointments. The General Assembly postponed the automatic process until 1 July 2024. It is now under way. But a case that ended in, say, 2022 was not reached in 2022, and a record check done back then proves nothing about where the case stands now.",
      "It works the same way everywhere in the State, which is worth saying because so much else about court paperwork does not. This is a statute administered through the courts and the Administrative Office of the Courts; there is no county version of it, no county form and no county packet, and a county that told you it does this differently would be worth a second question.",
      "Now the limit on what this page can tell you, said before the exclusions rather than after them. The full list of conditions in subsection (a4) was not read at the official source for this page, so the complete gate is not set out here. What follows is what is established, and it is enough to rule cases out — it is not enough for anybody, including this page, to tell you that a case qualifies.",
      "The exclusions that are established. A disposition before 1 December 2021 is outside the route. A case in which not every charge was disposed favourably is outside it. A dismissal that came through a deferred prosecution or a conditional discharge agreement is treated differently and belongs to a petition route, which carries a fee. Under section 15A-146(a), no case with a felony charge dismissed pursuant to a plea agreement is expunged under that subsection. And for dismissals on or after 1 December 2025, a dismissal by the court of a charge against a defendant found incapable to proceed is not eligible under section 15A-146 and is not to be included in an automatic expunction.",
      "Do one thing before the window runs, and do it even if you are confident the route reaches you. Ask the clerk of superior court for copies of the charging documents, the dismissal orders and the judgments, and keep them permanently. After an expunction, access to those records is restricted, and if you later need to prove what actually happened you may not be able to get them. That bites hardest in an immigration proceeding, where being able to produce the dismissal can matter more than the record being hidden.",
      "How to check whether it ran, which is the only way you will ever find out. Request a right-to-review copy of your own North Carolina criminal history from the State Bureau of Investigation. Nobody writes to tell you that a case has been expunged, and no notice arrives. Your own record check is the instrument, and it is the reason this page exists.",
      "Now the part of this route that catches people, and it is the most important paragraph on this page. The court clearing its record is not every agency clearing theirs. For an automatic expunction under subsection (a4), the clerk is not required to transmit an expunction order to other entities. So a charge can be gone from the court file and still sit in the records of an agency that never received an order about it.",
      "That is why the check has two questions rather than one. Has the court record gone, and does anything else still show the charge? A criminal record check answers the first straightforwardly. For the second, what you are looking for is a charge appearing in a place the court does not control.",
      "What to do if the record still shows once the window has passed. Ask the clerk whether the case was expunged and when. If the court expunged it but a named agency still holds it, there is a separate North Carolina route that prepares your written request to that record holder, and the intake will take you to it — it is not prepared on this page. If nothing was expunged at all, the honest position is this: what remedy exists in that situation is not established, this page will not invent one, and there is no appeal or deadline attached to the automatic route to point you at. Take what the clerk and the Bureau tell you to legal help.",
      "One correction to a common belief about what an expunction is. It does not wipe out every copy of everything. North Carolina keeps confidential files after an expunction, and sections 15A-151(a1) and 15A-151.5 are the provisions that govern them. What exactly those sections permit is not set out here, because their text was not read for this page, but the point stands: plan on the basis that something is retained rather than that nothing is.",
      "A word about who does the asking on other North Carolina routes, because it confuses people who have looked things up. Some North Carolina expunctions are petitioned for by the person whose record it is, and some are petitioned for by the district attorney. This route is neither. Nobody petitions at all, and your part in it is to check and to keep copies.",
      "And what not to do in the meantime. Do not tell an employer, a landlord or a licensing body that a case has been cleared because the window has passed. Until your own record check shows it, that is not something you can stand behind."
    ],
    submissionMethod:
      "There is nothing to submit and nowhere to submit it. No petition, application, form or request is generated on this route, and nothing is sent on your behalf.",
    fees:
      "None. There is no fee on this route because there is nothing on it to pay for. A dismissal that came through a deferred prosecution or a conditional discharge belongs to a petition route instead, and those routes do charge a fee — which is a reason to establish which route you are on before you plan around it. Requesting your own record check from the State Bureau of Investigation, and copies from the clerk, are separate services with their own charges.",
    feeWaiver:
      "Not applicable on this route. There is no fee here to waive, because there is nothing here to file.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify.",
      "Nobody is required to write and tell you that a case has been expunged, and no notice arrives when it happens.",
      "For an automatic expunction under subsection (a4) the clerk is not required to transmit an expunction order to other entities, so no agency is necessarily told either."
    ],
    expectedNextStage:
      "You leave this sheet knowing when the window falls, what rules the case out, what to keep before it runs, how to check whether it ran, and what the two possible answers mean — including the one the law does not yet have a remedy for.",
    legalEaseCanPrepare: [
      "This account of how the automatic route works and of when its window falls.",
      "The timing calculation: 180 to 210 days from final disposition, and the 1 July 2024 start that explains the older cases.",
      "The list of established exclusions, with a plain statement that the list of conditions is not complete here.",
      "The instruction to obtain and keep the charging documents, dismissal orders and judgments before the expunction takes effect.",
      "The verification plan through your own criminal record check, and what each answer means.",
      "A plain statement of where the route stops being reliable, including the case the law does not answer."
    ],
    legalEaseCannotPerform: NC_CANNOT_PERFORM,
    escalationTriggers: [
      "The record is a federal, military, tribal or out-of-state record.",
      "You have an immigration matter, now or in prospect.",
      "Not every charge in the case was disposed favourably.",
      "A dismissal came through a deferred prosecution or a conditional discharge agreement.",
      "A felony charge in the case was dismissed as part of a plea agreement.",
      "A charge was dismissed by the court because a defendant was found incapable to proceed.",
      "The case still shows on your criminal record check more than 210 days after it ended.",
      "An agency other than the court is still showing the charge.",
      "You are asked to confirm in writing that a case has been cleared.",
      "Somebody offers to bring a petition for a case that may already have cleared itself."
    ],
    officialSourceReferences: NC_SOURCES
  }
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
      if (!NORTH_CAROLINA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no North Carolina guidance template ${component.templateId} is registered.`
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

const NC_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label:
      "Were the charges North Carolina charges in a North Carolina court, or are they another state's, federal, military or tribal?",
    required: true
  },
  {
    key: "immigrationMatter",
    label:
      "Do you have an immigration matter, now or in prospect? On this route an expunction can make records harder to obtain when you need them.",
    required: true
  },
  {
    key: "finalDispositionEra",
    label: "Was the final disposition on or after 1 December 2021, or before it?",
    required: true
  },
  {
    key: "finalDispositionDate",
    label: "On what date did the last charge in the case reach its final disposition?",
    required: true
  },
  {
    key: "everyChargeDisposedFavourably",
    label:
      "Were all of the charges in the case dismissed, or found not guilty, or found not responsible?",
    required: true
  },
  {
    key: "dispositionType",
    label:
      "How did the case end — dismissed by the State, dismissed by the court, found not guilty, or found not responsible?",
    required: true
  },
  {
    key: "deferredProsecutionOrConditionalDischarge",
    label: "Was the dismissal part of a deferred prosecution or a conditional discharge agreement?",
    required: true
  },
  {
    key: "felonyDismissedUnderAPleaAgreement",
    label: "Was any felony charge in the case dismissed as part of a plea agreement?",
    required: true
  },
  {
    key: "dismissedAsIncapableToProceed",
    label:
      "Was the charge dismissed by the court because a defendant was found incapable to proceed?",
    required: false
  },
  {
    key: "recordStatusAfterWindow",
    label:
      "If you have already checked your own criminal record since the window passed, does the case still show?",
    required: true
  },
  {
    key: "wantsAPetitionPreparedNow",
    label: "Do you want a petition prepared for this case now?",
    required: true
  },
  {
    key: "countyOfCharge",
    label: "In which North Carolina county was each charge brought?",
    required: true
  }
];

export const NORTH_CAROLINA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  (() => {
    const statuses = {
      research: "research_draft_complete",
      technical: "renderer_ready",
      visual: "not_reviewed",
      legal: "not_submitted"
    } as const;

    return {
      jurisdiction: "NC",
      trackId: "nc_auto_146_a4",
      publicName: "Your dismissed North Carolina case may have cleared itself",
      mechanism:
        "automatic_expunction_by_operation_of_law_with_verification_and_an_agency_gap_disclosure",
      authority:
        "N.C. Gen. Stat. § 15A-146(a4), with § 15A-150, § 15A-151(a1) and § 15A-153",
      recordTypes: ["arrest", "charge", "infraction"],
      dispositions: ["dismissed", "acquitted", "found_not_responsible"],
      courtLevel: "not_applicable",
      geographicScope: "statewide",
      geographyKeys: [],
      outputStrategy: "process_guidance",
      packetSet: packetSet("nc_auto_146_a4", [
        {
          componentId: "nc_auto_146_a4-process-guidance-1",
          templateId: "nc-auto-146-a4-process-guidance"
        }
      ]),
      requiredInputs: NC_INPUTS,
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
      assembledPacketName: "north-carolina-automatic-expunction-check",
      assembledPacketTitle:
        "North Carolina automatic expunction — when it runs, and how to find out whether it did",
      customerDeliverableDescription:
        "Tells a North Carolina participant whose case was dismissed, or ended in a finding of not guilty or not responsible, that N.C. Gen. Stat. § 15A-146(a4) may have expunged it by operation of law between 180 and 210 days after final disposition, with no petition, no form and no fee — and then does the three things that actually help. It corrects the start date, because the General Assembly postponed the automatic process until 1 July 2024 and an older case was not reached when it ended. It says which cases are established to be outside the route, while stating plainly that the full list of conditions was not read at the official source, so nothing here tells a participant they qualify. And it holds the two things the route does not do: the clerk is not required to transmit an order to other entities, so agency records can survive a court expunction, and what remedy exists where the expunction never ran at all is not established, so none is invented. Instructs the participant to keep the charging documents, dismissal orders and judgments before the window runs, which matters most in an immigration case. Nothing is filed and nothing is generated.",
      notes:
        "Process guidance only, on the ground that no participant filing exists — relief runs by operation of law. Never generate a petition on this track, and never generate one anywhere before the participant has checked whether the case already cleared. Never state that agency records cleared with the court record: under subsection (a4) the clerk is not required to transmit an order. The record-destruction claim is withdrawn in favour of G.S. 15A-151(a1) and 15A-151.5, neither of which is described beyond § 15A-151's published subject. The eligibility gate is incomplete and is stated as incomplete. Where the automatic expunction never ran, no remedy is established and none is invented. The agency-follow-up request for a holder that still shows the charge is a separate North Carolina route and is not prepared here; the official AOC petition forms belong to other jobs and are not named on this sheet."
    };
  })()
];
