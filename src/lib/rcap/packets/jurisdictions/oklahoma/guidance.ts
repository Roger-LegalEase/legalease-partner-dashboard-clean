// Oklahoma process guidance — two routes, neither of which is operating yet.
//
// Both assigned tracks are status disclosures. Their honest deliverable is to
// tell a participant that a thing they may have heard about is not running, why
// waiting for it could cost them, and what is open in the meantime. The design
// records the position in terms on both: nothing is filed and *nothing can be*.
//
//   - `ok_clean_slate` is Oklahoma's automatic sealing under 22 O.S. §§ 18 and
//     19 as amended by Senate Bill 2030. The bill sets the Oklahoma State
//     Bureau of Investigation a deadline of 1 November 2027 to begin sealing
//     through Clean Slate, and requires records that are Clean Slate eligible
//     as of November 2027 to be seved by November 2029. As of the design's
//     reading the OSBI expungement page does not state that automatic sealing
//     is operational. So the route exists on paper and not yet in practice.
//   - `ok_osbi_portal` is the expedited expungement request portal the same
//     bill requires OSBI to establish and maintain. The design records it as
//     not yet available, and the OSBI expungement page does not mention one.
//     It matters more than its size suggests: if it launches, a meaningful
//     share of participants may get relief without paying for a petition.
//
// What both sheets have to carry, and why:
//
//   - **The removal risk.** SB 2030 does not only add: the review records that
//     it *removes* eligibility for automatic expungement of certain records and
//     removes certain automatic-expungement procedures. Which records were
//     removed is not yet identified. So a participant who waits for automatic
//     sealing may be waiting for something that will never reach their record,
//     and the design gives that its own component.
//   - **The right to petition is expressly preserved.** That is the practical
//     answer to the first point: the petition routes are open now, they are
//     owned by other jobs, and nothing here discourages using them.
//   - **Full and partial sealing are different outcomes.** A fully sealed
//     record is unavailable to the public *and* to law enforcement, with OSBI
//     retaining it for research and statistical purposes. A partially sealed
//     record is hidden from the public but remains available to law
//     enforcement. The design calls that distinction outcome-changing.
//   - **Sealing is not destruction, and it is not permanent either way.**
//     Section 19 does not authorise physical destruction; a sealed record may
//     be unsealed on changed conditions or a compelling reason; and under
//     § 19(N) a sealed record not unsealed within ten years may be obliterated
//     or destroyed. All three are stated together, because any one alone
//     misleads.
//   - **Tribal records.** Post-McGirt these are a live Oklahoma issue and the
//     design makes them an explicit escalation rather than a footnote to the
//     ordinary out-of-state stop.
//
// And what the design leaves open, which no sheet here closes: the enrolled
// text of §§ 18 and 19 as amended was not obtained, so which records SB 2030
// removed from automatic eligibility, which it makes sealable without petition,
// and what the portal procedures require are all unknown; the bill's effective
// date was not obtained; and whether the portal has in fact launched is
// evidenced but not established. Every one of those is stated on the page as
// unknown rather than guessed at.
//
// No conditional component and no fact placeholder appears in this family: the
// adopted packet sets make all six components required, and no template
// interpolates a participant answer. A second fixture on the same track would
// render byte-for-byte the same packet, so this job adds no regression variant.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Oklahoma
// is not an enabled jurisdiction and this job does not enable one. The petition
// routes named in the copy are other jobs and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Oklahoma legal help, named once so no stop is a dead end. */
const OK_LEGAL_HELP =
  "an Oklahoma legal aid office, an Oklahoma law school clinic, an expungement clinic run by a county bar association, or an Oklahoma attorney";

/** Said on both routes in this family. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes where a process stands. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether your record qualifies.";

/** Oklahoma says expungement and in most adult contexts means sealing. */
const EXPUNGEMENT_MEANS_SEALING =
  "One word to get straight before anything else. Oklahoma says expungement, but in most adult contexts what it means is sealing. That is not a quibble: it changes what you can expect at the end, and it is why this packet uses the word sealing where the outcome is sealing.";

/** Full versus partial sealing. The design calls this outcome-changing. */
const FULL_VERSUS_PARTIAL_SEALING =
  "There are two different outcomes and the difference matters more than the labels suggest. A fully sealed record is unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining it for research and statistical purposes. A partially sealed record is hidden from the public but remains available to law enforcement. If somebody tells you a record will be sealed, the useful next question is which of those two they mean.";

/** Sealing is not destruction — and is not necessarily permanent either. */
const SEALING_IS_NOT_DESTRUCTION =
  "Sealing is not destruction. Title 22 section 19 does not authorise physical destruction of the record, and a sealed record can be unsealed on changed conditions or for a compelling reason. There is a long-stop the other way as well: under section 19(N) a sealed record that has not been unsealed within ten years may be obliterated or destroyed. All three of those are true at once, and any one of them on its own gives a misleading picture.";

/** The right to petition is expressly preserved. The practical answer. */
const PETITION_ROUTE_REMAINS_OPEN =
  "The important practical point on this route: Senate Bill 2030 expressly preserves the right to petition. The petition routes are open now. They are not what this packet prepares, but nothing here is a reason to wait instead of using them.";

/** Nothing is filed on either route, and nothing can be. */
const NOTHING_CAN_BE_FILED =
  "Nothing is filed on this route and nothing can be, because there is nowhere to file it. LegalEase generates no petition, motion, application or request here. What this page does is tell you where the process actually stands, so that you can decide what to do with that.";

/** What the design does not know, said plainly on both routes. */
const WHAT_IS_NOT_KNOWN =
  "Now the limits of this page, stated rather than buried. The enrolled text of sections 18 and 19 as amended by Senate Bill 2030 was not obtained, so which records the amendment removed from automatic eligibility, which records it makes sealable without a petition, and what the portal procedures will require are all unknown here. The bill's effective date was not obtained either. Nothing on this page fills those gaps with a guess.";

const OK_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, expunge or remove anything, and cannot make the Oklahoma State Bureau of Investigation, a court or a clerk act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains where a process stands; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been sealed. Only your own criminal history record from the Bureau shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted the Bureau, any court, clerk or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when the automatic route or the portal will start working. The dates on this page are the statute's deadlines, not predictions."
];

const OK_SOURCES: readonly string[] = [
  "Criminal History Record Expungement, Oklahoma State Bureau of Investigation, read on 6 August 2026.",
  "Senate Bill 2030, Oklahoma Legislature 2026 session, bill information record located at the Oklahoma Legislature on 6 August 2026. The enrolled text was not obtained from that channel.",
  "22 O.S. § 18 and 22 O.S. § 19, expungement of criminal records, as amended by Senate Bill 2030."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class OklahomaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "OklahomaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Oklahoma route. */
export class OklahomaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "OklahomaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class OklahomaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "OklahomaBranchError";
  }
}

export const OK_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/**
 * Only an Oklahoma state record is reached by either route.
 *
 * Tribal is separated from the other three because the design makes it an
 * explicit escalation rather than a footnote: post-McGirt it is a live
 * Oklahoma question and it routes somewhere different.
 */
export const OK_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  oklahoma_state: "within",
  tribal: "tribal",
  another_state: "outside",
  federal: "outside",
  military: "outside"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new OklahomaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment, and on these two routes it is doubly so: which records Senate Bill 2030 removed from automatic eligibility is not yet identified. This guidance explains where the process stands; it does not decide eligibility.";

const OUT_OF_JURISDICTION_STOP =
  "Oklahoma's sealing law reaches Oklahoma state records. It does not reach a federal, military or out-of-state record, and neither of these two Oklahoma routes touches one.";

const TRIBAL_STOP =
  "A tribal court record is not reached by Oklahoma's state sealing law, and in Oklahoma this is a live question rather than a technicality: after McGirt, which court had jurisdiction over a case is contested territory in a way it is not elsewhere. That deserves a person who follows it, not a general page.";

const IMMIGRATION_STOP =
  "Immigration consequences are governed by federal law, and no Oklahoma sealing reaches them. On a route where the timing is already uncertain, relying on a sealing that has not happened for an immigration purpose is a compounding risk.";

/**
 * Validates participant answers and routes to the correct Oklahoma node.
 *
 * The order is the design's: the eligibility-advice boundary first; then record
 * jurisdiction, with tribal separated out because the design makes it an
 * explicit escalation; then immigration exposure, which the design records on
 * both tracks; then each route's own question.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveOklahomaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", OK_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new OklahomaGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      OK_LEGAL_HELP,
      "Take your criminal history record from the Bureau and the case papers to one of them and ask about your own record."
    );
  }

  // Gate 2. Record jurisdiction, with tribal separated out.
  const jurisdiction = branch(trackId, "recordJurisdiction", OK_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (jurisdiction.resolved === "outside") {
    throw new OklahomaRouteMismatchError(
      trackId,
      "record_is_not_an_oklahoma_state_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal or military authority that holds the record",
      "Take the record to that authority and ask what its own law provides. If you also hold Oklahoma state records, those are handled separately and only those are served here."
    );
  }
  if (jurisdiction.resolved === "tribal") {
    throw new OklahomaGuidanceStopError(
      trackId,
      "tribal_court_record_is_a_live_oklahoma_question",
      TRIBAL_STOP,
      "the tribal court that handled the matter, and " + OK_LEGAL_HELP + ", asking specifically for somebody who does post-McGirt work",
      "Ask which court actually had jurisdiction over the case and what that court provides for clearing its own records. Do not assume the Oklahoma state route reaches it."
    );
  }

  // Gate 3. Immigration exposure, a stop condition on both tracks.
  const immigration = branch(trackId, "immigrationQuestion", OK_YES_NO, facts.immigrationQuestion);
  if (immigration.resolved) {
    throw new OklahomaGuidanceStopError(
      trackId,
      "immigration_consequences_in_play",
      IMMIGRATION_STOP,
      "an immigration attorney",
      "Speak to an immigration attorney about the record before you rely on any Oklahoma sealing, and before you decide to wait for one."
    );
  }

  // Both routes rest on the participant having seen their own record.
  const checked = branch(trackId, "obtainedOsbiCriminalHistory", OK_YES_NO, facts.obtainedOsbiCriminalHistory);
  if (!checked.resolved) {
    throw new OklahomaGuidanceStopError(
      trackId,
      "criminal_history_record_not_yet_obtained",
      "Nothing useful can be decided about a record nobody has looked at. A criminal history record from the Oklahoma State Bureau of Investigation is the only way to see what the state actually holds and whether anything has already been sealed, and both of these routes are about what happens to that record.",
      "the Oklahoma State Bureau of Investigation",
      "Request your own criminal history record from the Bureau and read it. Come back to this route with it in front of you."
    );
  }

  if (trackId === "ok_clean_slate") {
    const relying = branch(trackId, "relyingOnAutomaticSealing", OK_YES_NO, facts.relyingOnAutomaticSealing);
    if (relying.resolved) {
      throw new OklahomaGuidanceStopError(
        trackId,
        "relying_on_automatic_sealing_that_is_not_operating",
        "Waiting for Oklahoma's automatic sealing instead of filing is the one decision this page exists to prevent. It is not operating yet: the Bureau has until 1 November 2027 to begin, and records eligible as of November 2027 need not be sealed until November 2029. Worse, Senate Bill 2030 removed some records from automatic eligibility altogether and which ones has not been identified — so the wait may be for something that never arrives for your record.",
        "the Oklahoma petition routes, which are open now and which the bill expressly preserves, and " + OK_LEGAL_HELP,
        "Go back to the Oklahoma intake and ask about the petition routes. Decide to wait only after somebody has looked at your actual record and told you what waiting would be for."
      );
    }
    return derived;
  }

  if (trackId === "ok_osbi_portal") {
    const wantsPortal = branch(trackId, "wantsToUseThePortalNow", OK_YES_NO, facts.wantsToUseThePortalNow);
    if (wantsPortal.resolved) {
      throw new OklahomaGuidanceStopError(
        trackId,
        "no_expedited_request_portal_is_published_to_use",
        "There is no portal to use. Senate Bill 2030 requires the Bureau to establish and maintain a request portal with procedures for reviewing expedited expungement requests, but as things stand none is published and nothing can be submitted through one. Whether it has launched is evidenced by the Bureau's own expungement page not mentioning it, and that is evidence rather than confirmation.",
        "the Oklahoma petition routes, which are open now, and " + OK_LEGAL_HELP,
        "Ask about the petition routes, and ask whoever you speak to whether the portal has appeared since this was written. If somebody points you at one, ask where the procedure is published."
      );
    }
    return derived;
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
  processType: GuidanceTemplate["processType"];
  prerequisites: readonly string[];
  documentsToObtain: readonly string[];
  gather: readonly string[];
  destination: { name: string; detail: string };
  sequence: readonly string[];
  submissionMethod?: string;
  fees?: string;
  feeWaiver?: string;
  noticeOrService?: readonly string[];
  expectedNextStage: string;
  canPrepare: readonly string[];
  extraCannotPerform?: readonly string[];
  escalations: readonly string[];
};

function sheet(input: SheetInput): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: input.prerequisites,
    documentsToObtain: input.documentsToObtain,
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: input.sequence,
    submissionMethod:
      input.submissionMethod ??
      "There is nothing to submit and nowhere to submit it. No petition, motion, application or request is generated on this route.",
    fees:
      input.fees ??
      "None for this route, because there is nothing on it to pay for. The petition alternative is where the costs sit: an arrest-record expungement carries a $150 processing fee charged by the Oklahoma State Bureau of Investigation, and a court-record expungement is free of that fee.",
    feeWaiver:
      input.feeWaiver ??
      "Not applicable to this route. There is no fee here to waive, because there is nothing here to file.",
    noticeOrService: input.noticeOrService ?? [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you when a record has been sealed, or when this route starts working, which is why this packet tells you to check your own record."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...OK_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "The record is a federal, military or out-of-state record.",
      "The record is a tribal court record, which after McGirt is a live Oklahoma question.",
      "Your immigration status could be affected by the record.",
      ...input.escalations
    ],
    officialSourceReferences: OK_SOURCES
  };
}

const OSBI = {
  name: "The Oklahoma State Bureau of Investigation",
  detail:
    "The Bureau holds the state criminal history record and will release your own copy to you. It is also the body Senate Bill 2030 makes responsible for the automatic sealing and for the request portal. Nothing is submitted to it on this route, and LegalEase contacts it about nothing."
};

export const OKLAHOMA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- ok_clean_slate -------------------------------------------------------
  "ok-clean-slate-status-disclosure": sheet({
    templateId: "ok-clean-slate-status-disclosure",
    mechanismName: "Oklahoma's automatic record sealing, and where it actually stands",
    whyNotAFiling:
      "Nothing is filed by you and nothing can be. Automatic sealing under 22 O.S. §§ 18 and 19, as amended by Senate Bill 2030, is something the Oklahoma State Bureau of Investigation does — and as things stand it is not doing it yet. There is no application, no form and no queue to join, so LegalEase generates nothing here.",
    processType: "agency",
    prerequisites: [
      "The record is an Oklahoma state record.",
      "You have, or can get, your own criminal history record from the Bureau.",
      "You are willing to be told that a thing you may have heard about is not running yet."
    ],
    documentsToObtain: [
      "Your own criminal history record from the Oklahoma State Bureau of Investigation. It is the only way to see what the state actually holds and whether anything has already been sealed."
    ],
    gather: [
      "Whether anyone has told you that Oklahoma clears records automatically, and what exactly they said.",
      "What your criminal history record from the Bureau actually shows, case by case.",
      "The county and court for each case, and the date each one ended.",
      "Whether you have a deadline of your own — a job, a licence, a housing application — and when it falls."
    ],
    destination: OSBI,
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "The position, stated plainly. Senate Bill 2030, passed in May 2026, amends 22 O.S. §§ 18 and 19 and sets the Bureau a deadline of 1 November 2027 to begin sealing records through Clean Slate. Records that are Clean Slate eligible as of November 2027 must be sealed by November 2029.",
      "As things stand, the Bureau's own expungement page refers to Clean Slate eligibility by category and links to a Clean Slate page, and does not state that automatic sealing is operational. So this is a route that exists on paper and not yet in practice.",
      "Those two dates are the statute's deadlines for the Bureau. They are not predictions about your record and they are not a queue position. Nobody can tell you today when a particular record will be reached.",
      EXPUNGEMENT_MEANS_SEALING,
      "What the bill does beyond the deadlines, as the review records it: it provides for eligibility for sealing of certain records without a petition to the court, and it adds annual reporting, objection procedures and rulemaking authority for the Bureau and for the Supreme Court.",
      "And the part that matters most to you, which the next sheet is entirely about: it also removes eligibility for automatic expungement of certain records, and removes certain automatic-expungement procedures.",
      PETITION_ROUTE_REMAINS_OPEN,
      WHAT_IS_NOT_KNOWN,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "The next sheet in this packet is about the risk in waiting: which records the amendment removed from automatic eligibility has not been identified, and that is a reason to look at the petition routes rather than to sit tight.",
    canPrepare: [
      "This account of where Oklahoma's automatic sealing actually stands and of what the statute's deadlines are.",
      "The removal-risk sheet that follows it in this packet.",
      "The monitoring sheet, which sets out what to watch and when to check again.",
      "A plain statement of what is not known here, so that you are not relying on a confident answer nobody has."
    ],
    escalations: [
      "You have been told your record will be cleared automatically on a particular date.",
      "You are deciding whether to wait rather than file, and something turns on the answer.",
      "Your criminal history record shows something you do not recognise."
    ]
  }),

  "ok-clean-slate-removal-risk-disclosure": sheet({
    templateId: "ok-clean-slate-removal-risk-disclosure",
    mechanismName: "The risk in waiting: what Senate Bill 2030 took out",
    whyNotAFiling:
      "This page is a warning and a comparison. Nothing on it is filed, and there is nothing on this route that could be filed.",
    processType: "agency",
    prerequisites: [
      "You have read the sheet before this one and know that automatic sealing is not operating yet.",
      "You are deciding whether to wait for it or to look at the petition routes."
    ],
    documentsToObtain: [
      "Your own criminal history record from the Oklahoma State Bureau of Investigation, so that the decision is made against what the state actually holds."
    ],
    gather: [
      "Every Oklahoma case on your record, with the county, the court and how it ended.",
      "Whether the arrest record or the court record is the one causing you the problem, because they are treated differently and cost differently.",
      "Any date of your own that the timing has to work against."
    ],
    destination: {
      name: "No destination. This sheet is a decision aid rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because the choice between waiting and filing is the participant's to make, and making it well needs one fact most summaries leave out."
    },
    sequence: [
      "Here is the fact most summaries leave out. Senate Bill 2030 does not only add to automatic sealing. The review records that it removes eligibility for automatic expungement of certain records, and removes certain automatic-expungement procedures.",
      "Which records were removed has not been identified. That is not a hedge — the enrolled text of the amended sections was not obtained, and identifying the removed categories is recorded as the top outstanding research item.",
      "So the risk in waiting is not simply that it is slow. It is that your record may be in a category that was taken out, in which case waiting produces nothing at all, and you will not find that out by waiting.",
      "Against that, the reassurance that actually matters: Senate Bill 2030 expressly preserves the right to petition. The petition routes are open today, and they do not depend on any of this.",
      "So the practical shape of the decision is this. If your need has a date on it — a job, a licence, a housing application — the petition route is the one that can be made to happen. If it does not, waiting costs nothing except time, provided you understand you may be waiting for something that never comes.",
      "One cost difference worth knowing before you choose. On the petition side an arrest-record expungement carries a $150 processing fee charged by the Bureau, while a court-record expungement is free of that fee. Which of the two you actually need is worth establishing before you price anything.",
      FULL_VERSUS_PARTIAL_SEALING,
      "That distinction bears on the choice too. Ask whoever advises you which of the two outcomes a particular route would produce for your record, because they are not the same result.",
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "You leave this sheet with the decision framed honestly: what waiting risks, what petitioning costs, and which of the two outcomes each would produce. The last sheet sets out what to watch.",
    canPrepare: [
      "This account of what the amendment removed and of why that changes the decision.",
      "The comparison between waiting and petitioning, with the cost difference stated.",
      "A written statement of the two options and what each costs, which is what you want in front of you when you decide.",
      "The explanation of full versus partial sealing, which changes what either route is worth.",
      "The monitoring sheet that follows it in this packet."
    ],
    escalations: [
      "You need to know whether your category was removed from automatic eligibility.",
      "You have a date of your own and need to know whether waiting can meet it.",
      "You cannot tell whether it is the arrest record or the court record that is causing the problem."
    ]
  }),

  "ok-clean-slate-monitoring-disclosure": sheet({
    templateId: "ok-clean-slate-monitoring-disclosure",
    mechanismName: "What to watch, and when to check again",
    whyNotAFiling:
      "This page sets expectations against statutory deadlines. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "agency",
    prerequisites: [
      "You have read the two sheets before this one in the packet.",
      "You want to know what would change the answer rather than to be told to be patient."
    ],
    documentsToObtain: [
      "A dated copy of each criminal history record you obtain from the Bureau, kept so that a later one can be compared against it."
    ],
    gather: [
      "The date of each criminal history record you obtain, and what it showed.",
      "Anything you are told about Clean Slate by an official source, and the date you were told it.",
      "Whether your own circumstances change in a way that affects a petition route."
    ],
    destination: {
      name: "No destination. This sheet is an expectation rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists so that checking back is a plan rather than an anxiety."
    },
    sequence: [
      "The first thing to watch is the Bureau itself. It has until 1 November 2027 to begin sealing through Clean Slate, and records eligible as of November 2027 must be sealed by November 2029. When the Bureau's own pages begin to say that the automatic route has started, that is the change worth acting on.",
      "The second thing to watch is your own record. Obtain a criminal history record from the Bureau and keep it dated. Obtain another later and compare the two. That comparison is the only reliable evidence of whether anything moved, and two dated copies are worth considerably more than one.",
      "The third is the amended text itself. Which records Senate Bill 2030 removed from automatic eligibility has not been identified, and when it is, that answer may change whether waiting is sensible for you specifically.",
      "What not to do in the meantime. Do not tell an employer, a landlord or a licensing body that a record is sealed because a deadline has passed or because you were told the record qualifies. Until your criminal history record shows it, it is not something you can stand behind.",
      "And do not treat the deadlines as a reason to stop asking. The right to petition is expressly preserved, and a petition does not become unavailable because an automatic route exists on paper.",
      SEALING_IS_NOT_DESTRUCTION,
      "That last point is worth carrying into any conversation about what sealing is worth: it is not erasure, it is not necessarily permanent, and it has a ten-year long-stop in the other direction.",
      WHAT_IS_NOT_KNOWN,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet knowing where the automatic route stands, what waiting risks, what the alternative costs, and what to check and when.",
    canPrepare: [
      "This account of what to watch and of what each change would mean.",
      "The value of holding two dated criminal history records rather than one.",
      "The explanation of what sealing is and is not, including the ten-year long-stop.",
      "The two sheets before this one."
    ],
    escalations: [
      "The Bureau's pages begin to say the automatic route has started and you want to know what it means for you.",
      "A deadline in the statute passes and nothing has changed on your record.",
      "You have been asked to confirm in writing that a record is sealed."
    ]
  }),

  // ---- ok_osbi_portal -------------------------------------------------------
  "ok-portal-status-disclosure": sheet({
    templateId: "ok-portal-status-disclosure",
    mechanismName: "Oklahoma's free expungement request portal, and where it actually stands",
    whyNotAFiling:
      "Nothing is filed and nothing can be. Senate Bill 2030 requires the Oklahoma State Bureau of Investigation to establish and maintain a portal for expedited expungement requests, but no portal is published, so there is nothing to submit and nowhere to submit it. LegalEase generates nothing here.",
    processType: "portal",
    prerequisites: [
      "The record is an Oklahoma state record.",
      "You have, or can get, your own criminal history record from the Bureau.",
      "You are willing to be told that a route you may have heard about does not exist yet."
    ],
    documentsToObtain: [
      "Your own criminal history record from the Oklahoma State Bureau of Investigation. It is the only way to see what the state actually holds and whether anything has already been sealed."
    ],
    gather: [
      "Whether it is the arrest record or the court case that you need cleared.",
      "What your criminal history record from the Bureau actually shows.",
      "Whether your need is urgent, or whether you could wait to see if a free route opens.",
      "Anything you have been told about a portal, and where you were told it."
    ],
    destination: OSBI,
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "The position, stated plainly. Senate Bill 2030 requires the Bureau to establish and maintain a request portal, with procedures for the review of expedited expungement requests. As things stand no such portal is published, and the Bureau's own expungement page does not mention one.",
      "That last point is evidence rather than confirmation. The Bureau's expungement page was read and does not mention a portal; a Clean Slate page linked from it was not read. So the honest statement is that there is no published portal to use, and that whether one has quietly launched has not been established.",
      "Which means there is nothing on this route to submit today, and nothing this packet can prepare for it.",
      "Why the portal matters more than its size suggests, and why it is worth a sheet at all: if it launches, a meaningful share of people may be able to get relief without paying for a petition. That is a real difference in access, not an administrative detail.",
      EXPUNGEMENT_MEANS_SEALING,
      PETITION_ROUTE_REMAINS_OPEN,
      WHAT_IS_NOT_KNOWN,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "The next sheet is the cost comparison, which is the decision this route actually turns on: whether to pay for a petition now or wait to see whether a free route opens.",
    canPrepare: [
      "This account of where the portal stands and of what the statute requires of the Bureau.",
      "The cost comparison that follows it in this packet.",
      "The monitoring sheet, which sets out what to watch and when to check again.",
      "A plain statement of what is not known here, so that you are not relying on a confident answer nobody has."
    ],
    escalations: [
      "Somebody has pointed you at a portal and you want to know whether it is the one the statute requires.",
      "You are being asked to pay for something described as an expedited request.",
      "Your need is urgent and you cannot afford to wait."
    ]
  }),

  "ok-portal-cost-comparison": sheet({
    templateId: "ok-portal-cost-comparison",
    mechanismName: "Paying for a petition now, or waiting to see whether a free route opens",
    whyNotAFiling:
      "This page is a cost comparison. Nothing on it is filed, and there is nothing on this route that could be filed.",
    processType: "portal",
    prerequisites: [
      "You have read the sheet before this one and know that no portal is published.",
      "You know whether it is the arrest record or the court case that you need cleared."
    ],
    documentsToObtain: [
      "Your own criminal history record from the Oklahoma State Bureau of Investigation, so that the decision is made against what the state actually holds."
    ],
    gather: [
      "Whether the arrest record or the court record is the one causing you the problem.",
      "Whether your need has a date on it, and what that date is.",
      "What a petition would cost you in total, including anything a lawyer or clinic would charge.",
      "Whether you qualify for help from a legal aid office or a clinic, which changes the arithmetic."
    ],
    destination: {
      name: "No destination. This sheet is a decision aid rather than a step",
      detail:
        "Nothing here is sent anywhere. The decision is yours to make, and it is made better with the numbers in front of you than with a general sense that one route is cheaper."
    },
    sequence: [
      "Start with which record you actually need cleared, because the costs differ. On the petition side an arrest-record expungement carries a $150 processing fee charged by the Bureau. A court-record expungement is free of that fee.",
      "So the participant for whom a free portal would matter most is the one who needs the arrest record cleared. If that is you, this decision is worth taking slowly.",
      "Now the two things that make waiting a real gamble rather than a free option. There is no published portal and no published date for one. And Senate Bill 2030 removed certain records from automatic eligibility, without it yet being identified which.",
      "So waiting is not simply cheaper. It is cheaper only if the route arrives and reaches your record, and neither of those is established.",
      "Set that against the thing that is certain: the right to petition is expressly preserved and is available now.",
      "The honest framing of the choice, and it is genuinely yours to make. If your need has a date on it, pay for the route that exists. If it does not, and the fee is the obstacle, waiting is a reasonable bet provided you know it is a bet.",
      "One thing to do either way, because it costs nothing and improves both branches: ask a legal aid office or an expungement clinic whether they would take it on. That can change the arithmetic more than the portal would.",
      FULL_VERSUS_PARTIAL_SEALING,
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "You leave this sheet with the cost difference stated, the risk in waiting stated, and the decision left with you. The last sheet sets out what to watch.",
    canPrepare: [
      "This comparison, with the fee difference between the two kinds of expungement stated.",
      "The account of what makes waiting a bet rather than a free option.",
      "The suggestion worth taking either way, which is to ask whether a clinic would take it on.",
      "The monitoring sheet that follows it in this packet."
    ],
    escalations: [
      "You cannot tell whether it is the arrest record or the court record that you need.",
      "The fee is the only obstacle and you want to know what help exists.",
      "You have been quoted a price for an expungement and have no way to judge it."
    ]
  }),

  "ok-portal-monitoring-disclosure": sheet({
    templateId: "ok-portal-monitoring-disclosure",
    mechanismName: "What to watch for the portal, and when to check again",
    whyNotAFiling:
      "This page sets expectations against a statutory requirement that has not yet produced anything. Nothing on it is filed and nothing on it is generated for you to sign.",
    processType: "portal",
    prerequisites: [
      "You have read the two sheets before this one in the packet.",
      "You want to know what would change the answer rather than to be told to be patient."
    ],
    documentsToObtain: [
      "A dated copy of each criminal history record you obtain from the Bureau, kept so that a later one can be compared against it."
    ],
    gather: [
      "The date of each criminal history record you obtain, and what it showed.",
      "Anything the Bureau publishes about a request portal, and the date you saw it.",
      "Whether your own need becomes urgent, because that changes the decision."
    ],
    destination: {
      name: "No destination. This sheet is an expectation rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists so that watching for the portal is a plan with a review date rather than an indefinite wait."
    },
    sequence: [
      "The first thing to watch is the Bureau's own expungement pages. The portal is required by statute, so if it launches that is where it will be described. A portal you hear about anywhere else is worth checking against that page before you use it.",
      "Be careful here, and this is the practical warning on this sheet. A free government route is exactly the shape that paid intermediaries imitate. If something asks you to pay to submit an expedited request, that is a reason to stop and check where the procedure is published.",
      "The second thing to watch is your own record. Obtain a criminal history record from the Bureau and keep it dated; obtain another later and compare. That is the only reliable evidence of whether anything has moved.",
      "The third is the automatic sealing route running alongside this one. The Bureau has until 1 November 2027 to begin sealing through Clean Slate, and records eligible as of November 2027 must be sealed by November 2029. Those dates bear on the portal question because both are the same body's obligations under the same bill.",
      "Give yourself a review date rather than an open-ended wait. If your circumstances change — a job, a licence, a housing application — the answer changes with them, and the petition route is the one that can be made to happen on a date.",
      SEALING_IS_NOT_DESTRUCTION,
      WHAT_IS_NOT_KNOWN,
      "None of that is a reason to do nothing. It is a reason to know what you are waiting for, and to have decided in advance what would make you stop waiting.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet knowing where the portal stands, what a petition would cost instead, what to watch, and what would make waiting the wrong choice.",
    canPrepare: [
      "This account of what to watch and where to check it.",
      "The warning about paid intermediaries imitating a free government route.",
      "The suggestion to set yourself a review date rather than waiting open-endedly.",
      "The explanation of what sealing is and is not, including the ten-year long-stop.",
      "The two sheets before this one."
    ],
    escalations: [
      "Something is charging you to submit an expedited expungement request.",
      "The portal appears and you want to know whether your record can go through it.",
      "Your need becomes urgent while you are waiting."
    ]
  })
};

// ---------------------------------------------------------------------------
// Relief tracks
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
      if (!OKLAHOMA_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Oklahoma guidance template ${component.templateId} is registered.`
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

/**
 * Asked on both Oklahoma routes in this family, in this order.
 *
 * The tribal answer is separated from the other out-of-jurisdiction answers
 * because the design makes it an explicit escalation: after McGirt, which court
 * had jurisdiction is a live Oklahoma question and it routes somewhere else.
 * The last is asked on both because both routes are about what happens to the
 * record the Bureau holds, and neither can be discussed usefully by somebody
 * who has not seen it.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  },
  {
    key: "recordJurisdiction",
    label:
      "Is the record an Oklahoma state record, a tribal court record, another state's, a federal record, or a military one?",
    required: true
  },
  {
    key: "immigrationQuestion",
    label:
      "Could your immigration status be affected by this — for example, are you not a United States citizen?",
    required: true
  },
  {
    key: "obtainedOsbiCriminalHistory",
    label:
      "Have you obtained your criminal history record from the Oklahoma State Bureau of Investigation to see what is actually on it?",
    required: true
  }
];

function oklahomaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  components: readonly ComponentSpec[];
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
    jurisdiction: "OK",
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

export const OKLAHOMA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  oklahomaTrack({
    trackId: "ok_clean_slate",
    publicName: "Oklahoma's automatic record sealing, and where it stands",
    mechanism: "status_disclosure_and_routing_for_automatic_sealing_that_is_not_yet_operating",
    authority: "22 O.S. § 18, 22 O.S. § 19 and Senate Bill 2030 (2026)",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["convicted", "dismissed", "acquitted"],
    components: [
      {
        componentId: "ok_clean_slate-status-disclosure-1",
        templateId: "ok-clean-slate-status-disclosure"
      },
      {
        componentId: "ok_clean_slate-removal-risk-disclosure-2",
        templateId: "ok-clean-slate-removal-risk-disclosure"
      },
      {
        componentId: "ok_clean_slate-monitoring-disclosure-3",
        templateId: "ok-clean-slate-monitoring-disclosure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "heardRecordsClearAutomatically",
        label: "Have you been told that Oklahoma clears records automatically?",
        required: false
      },
      {
        key: "relyingOnAutomaticSealing",
        label:
          "Are you planning to wait for the automatic sealing rather than looking at a petition?",
        required: true
      },
      {
        key: "caseDetails",
        label: "For each Oklahoma case: the county, the court, and how and when it ended?",
        required: true
      },
      {
        key: "ownDeadline",
        label:
          "Do you have a date of your own that this has to work against — a job, a licence, a housing application?",
        required: false
      }
    ],
    assembledPacketName: "oklahoma-clean-slate-status",
    assembledPacketTitle: "Oklahoma automatic sealing — where it stands and what waiting risks",
    customerDeliverableDescription:
      "Tells an Oklahoma participant the true status of automatic sealing: Senate Bill 2030 gives the Bureau until 1 November 2027 to begin and until November 2029 to finish the eligible back catalogue, and the Bureau's own pages do not yet say it is operating. Surfaces the risk the summaries omit — that the same bill removed certain records from automatic eligibility and which ones has not been identified — sets the cost of the preserved petition alternative against it, explains full versus partial sealing, and gives a monitoring plan. Nothing is filed and nothing can be.",
    notes:
      "Process guidance only, and a status disclosure rather than a route to use. Nothing is filed on this track and nothing can be; never generate an application or a request. The enrolled text of §§ 18 and 19 as amended, the bill's effective date, and which records lost automatic eligibility are all preserved as unknown."
  }),

  oklahomaTrack({
    trackId: "ok_osbi_portal",
    publicName: "Oklahoma's free expungement request portal, and where it stands",
    mechanism: "status_disclosure_and_cost_comparison_for_a_request_portal_that_is_not_yet_published",
    authority: "22 O.S. § 18, 22 O.S. § 19 and Senate Bill 2030 (2026)",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["convicted", "dismissed", "acquitted"],
    components: [
      {
        componentId: "ok_osbi_portal-status-disclosure-1",
        templateId: "ok-portal-status-disclosure"
      },
      { componentId: "ok_osbi_portal-cost-comparison-2", templateId: "ok-portal-cost-comparison" },
      {
        componentId: "ok_osbi_portal-monitoring-disclosure-3",
        templateId: "ok-portal-monitoring-disclosure"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "arrestRecordIsTheGoal",
        label: "Is the arrest record what you need cleared, rather than just the court case?",
        required: true
      },
      {
        key: "wantsToUseThePortalNow",
        label: "Do you want to submit a request through the expedited portal now?",
        required: true
      },
      {
        key: "canWaitForAFreeRoute",
        label: "Is your need urgent, or could you wait to see whether a free route opens?",
        required: true
      },
      {
        key: "caseDetails",
        label: "For each Oklahoma case: the county, the court, and how and when it ended?",
        required: true
      }
    ],
    assembledPacketName: "oklahoma-osbi-portal-status",
    assembledPacketTitle: "Oklahoma expedited request portal — where it stands and what it would save",
    customerDeliverableDescription:
      "Tells an Oklahoma participant that the expedited expungement request portal Senate Bill 2030 requires is not published and that nothing can be submitted through one, distinguishes evidence from confirmation on that point, and then does the thing that actually matters: sets the $150 arrest-record processing fee against a free court-record expungement so the participant can decide for themselves whether to pay now or wait. Adds a monitoring plan and a warning about paid intermediaries imitating a free government route. Nothing is filed and nothing can be.",
    notes:
      "Process guidance only, and a status disclosure rather than a route to use. No portal is published; never suggest a request can be submitted, and never generate one. Whether the portal has launched is evidenced by the Bureau's page not mentioning it, which is stated as evidence rather than confirmation."
  })
];
