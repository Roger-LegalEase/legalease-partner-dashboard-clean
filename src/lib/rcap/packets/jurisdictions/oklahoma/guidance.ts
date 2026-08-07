// Oklahoma process guidance — two routes, neither of which is operating yet.
//
// Both assigned tracks are status disclosures. Their honest deliverable is to
// tell a participant that a thing they may have heard about is not running,
// what the law actually says, and what is open in the meantime. The adopted
// packet sets record the position in terms on both: nothing is filed and
// *nothing can be*.
//
//   - `ok_clean_slate` is sealing without a petition under 22 O.S. § 18b, with
//     the process at 22 O.S. § 19d, both created by Senate Bill 2030. The Act
//     is Laws 2026, c. 282 and took effect on 1 July 2026. Eligibility exists
//     from that date and is expressly subject to the availability of funds;
//     the administration does not, because § 19d(D) allows the Bureau until
//     1 November 2027 to begin and until 1 November 2029 to finish the
//     electronic records eligible by then. So the route exists in law and not
//     yet in practice.
//   - `ok_osbi_portal` is the expedited expungement request portal § 19d(A)
//     requires the Oklahoma State Bureau of Investigation to establish and
//     maintain by 1 November 2026. None is published. It matters more than its
//     size suggests: the statute sets no fee for a request, so if the portal
//     arrives a share of participants may reach relief without paying for a
//     petition.
//
// This module is the correction of the integrated Oklahoma guidance
// implementation against the current-law decision at
// `data/record-clearing/production-factory/legal-design-decisions/ok-sb-2030-current-text-and-currency.json`
// and the corrected `OK.memo.json`. Nothing structural moved: two tracks, six
// components, the same typed stops with the same destinations, the same
// runtime-disabled posture. What changed is copy that had stopped being true.
// The parent packet said four times that the enrolled text and the effective
// date had not been obtained, and built a whole sheet on the premise that
// which records the Act removed from automatic eligibility was unidentified.
// Both premises are closed, and the second one was the wrong way round.
//
// What both sheets have to carry, and why:
//
//   - **Eligibility and administration are different things.** § 18b(B)
//     confers eligibility from the effective date "subject to the availability
//     of funds"; § 19d sets the machinery and its deadlines. A participant who
//     hears "Oklahoma clears records automatically" is hearing half of the
//     first and none of the second.
//   - **The Act widened the eligible set rather than narrowing it.** What was
//     repealed was the earlier § 18(C) route, which reached arrest records
//     only. § 18b reaches records including court records, carries a floor of
//     1 January 1980, and adds two conviction categories the repealed route
//     never touched. The honest reason to look at a petition is the timetable,
//     the funding condition and the partial sealing — not a lost category.
//   - **The right to petition is expressly preserved**, by § 19d(G) in terms.
//   - **This route seals partially.** § 18b(D) leaves the record available to
//     law enforcement for law enforcement purposes and § 18b(E) leaves it
//     admissible to prove a prior conviction or deferred judgment without an
//     unsealing order. A participant who needs a record law enforcement cannot
//     see is not served by this route.
//   - **Sealing is not destruction, and it is not permanent either way.**
//     § 19d(J)(1) says nothing in that section authorises physical
//     destruction; a sealed record may be unsealed on changed conditions or a
//     compelling reason; and § 19 carries a ten-year long-stop after which a
//     sealed record may be obliterated or destroyed. Senate Bill 2030 moved
//     the subsection lettering in § 19 and the codified section could not be
//     retrieved to confirm it, so that rule is described rather than cited to
//     a letter.
//   - **Tribal records.** Post-McGirt these are a live Oklahoma issue and the
//     adopted design makes them an explicit escalation rather than a footnote
//     to the ordinary out-of-state stop.
//
// What is still open, and is stated on the page as open: whether the funds
// § 18b(B) conditions eligibility on have been appropriated; what the § 19d(A)
// portal will require once it is published; whether rules have been made under
// § 19d(E)(7); and codified confirmation of §§ 18b, 19 and 19d, which the
// Oklahoma State Courts Network would not serve.
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

/** The enacted position, stated on the Act rather than on a bill record. */
const THE_ACT_AS_ENACTED =
  "Start with what the law actually is, because most accounts of this are working from a bill rather than from the Act. Senate Bill 2030 was approved by the Governor on 11 May 2026, it is codified as Laws 2026, c. 282, and it took effect on 1 July 2026. It amends 22 O.S. sections 18 and 19 and it creates two new sections: section 18b, which says which records are clean slate eligible, and section 19d, which says how the Oklahoma State Bureau of Investigation is to seal them. Everything on this page is written from that enacted text.";

/** Oklahoma says expungement and in most adult contexts means sealing. */
const EXPUNGEMENT_MEANS_SEALING =
  "One word to get straight before anything else. Oklahoma says expungement, but in most adult contexts what it means is sealing. That is not a quibble: it changes what you can expect at the end, and it is why this packet uses the word sealing where the outcome is sealing.";

/** Eligibility exists; the administration of it does not. */
const ELIGIBILITY_IS_NOT_ADMINISTRATION =
  "Now the distinction that the whole of this route turns on. Statutory eligibility and an operating process are two different things, and only the first of them exists today. Section 18b(B) of Title 22 says that beginning on the effective date of the Act, and subject to the availability of funds, individuals with clean slate eligible records are eligible to have their records sealed without filing a court petition. That is a grant of eligibility. The machinery that would act on it is section 19d, and section 19d is on a timetable that has not run yet.";

/** The funding condition, which sits on top of everything else here. */
const FUNDING_IS_A_CONDITION =
  "One condition sits on top of all of it. Section 18b(B) confers that eligibility subject to the availability of funds, and whether funds have been appropriated for the work has not been established here. So nobody can tell you today that this route will reach your record, and this packet does not.";

/** The statute's three dates, in the order a participant meets them. */
const THE_THREE_DATES =
  "Three dates come out of section 19d, and they are worth having in the right order. By 1 November 2026 the Bureau must establish and maintain a publicly accessible online portal for expedited expungement requests. On or before 1 November 2027 the Bureau must begin implementing the automatic process that identifies and submits clean slate eligible records for sealing without anybody asking. And all electronic records eligible through that automatic process on or after 1 November 2027 must be identified and expunged before 1 November 2029, on a schedule the Bureau sets. Those are the statute's deadlines for the Bureau. They are not predictions about your record and they are not a queue position.";

/** Full versus partial sealing. The design calls this outcome-changing. */
const FULL_VERSUS_PARTIAL_SEALING =
  "There are two different outcomes and the difference matters more than the labels suggest. A fully sealed record is unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining it for research and statistical purposes. A partially sealed record is hidden from the public but remains available to law enforcement. If somebody tells you a record will be sealed, the useful next question is which of those two they mean.";

/** Sealing is not destruction — and is not necessarily permanent either. */
const SEALING_IS_NOT_DESTRUCTION =
  "Sealing is not destruction. Section 19d(J)(1) says in terms that nothing in that section authorises the physical destruction of any criminal justice record, and a sealed record can be unsealed on changed conditions or for a compelling reason. There is a long-stop the other way as well: section 19 of Title 22 provides that a sealed record which has not been unsealed within ten years of the order may be obliterated or destroyed. Senate Bill 2030 moved the subsection lettering in section 19, and the codified section could not be read to confirm where that rule now sits, so it is described here rather than cited to a letter. All three of those are true at once, and any one of them on its own gives a misleading picture.";

/** The right to petition is expressly preserved. The practical answer. */
const PETITION_ROUTE_REMAINS_OPEN =
  "The important practical point on this route, and it is in the statute rather than inferred from it. Section 19d(G) reads that nothing in that section precludes an individual from filing a petition with the district court under section 19 of Title 22 for expungement of clean slate eligible records. The petition routes are open now. They are not what this packet prepares, but nothing here is a reason to wait instead of using them.";

/** Nothing is filed on either route, and nothing can be. */
const NOTHING_CAN_BE_FILED =
  "Nothing is filed on this route and nothing can be, because there is nowhere to file it. LegalEase generates no petition, motion, application or request here. What this page does is tell you where the process actually stands, so that you can decide what to do with that.";

/** The limits of this page, stated rather than buried. */
const WHAT_IS_NOT_KNOWN =
  "Now the limits of this page, stated rather than buried. The enrolled text of Senate Bill 2030 has been read and so has the codified section 18, which is where the chapter number and the effective date come from. What remains genuinely open is narrower than it was, and it is this. Whether funds have been appropriated for the work that section 18b(B) conditions eligibility on has not been established. What the portal will require in practice is not published, because the portal is not published. Whether the Bureau or the Supreme Court has made rules under section 19d(E)(7) could not be established, and none was found. And the codified text of sections 18b, 19 and 19d could not be retrieved from the Oklahoma State Courts Network, which returned an automated-traffic challenge, so this page describes the subsection rules rather than pinning each one to a letter. Nothing here fills any of that with a guess.";

const OK_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot seal, expunge or remove anything, and cannot make the Oklahoma State Bureau of Investigation, a court or a clerk act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains where a process stands; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been sealed. Only your own criminal history record from the Bureau shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted the Bureau, any court, clerk or agency about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when the automatic process or the portal will start working. The dates on this page are the statute's deadlines for the Bureau, not predictions."
];

const OK_SOURCES: readonly string[] = [
  "Enrolled Senate Bill No. 2030, Oklahoma Legislature 2026 session, enacted as Laws 2026, c. 282, obtained from the Oklahoma Legislature on 7 August 2026.",
  "22 O.S. § 18, expungement of criminal records, as codified after Senate Bill 2030 and read at the Oklahoma State Courts Network on 7 August 2026. Its historical note records the amendment as Laws 2026, SB 2030, c. 282, § 1, emerg. eff. July 1, 2026.",
  "22 O.S. § 18b, clean slate eligible records, and 22 O.S. § 19d, the expedited request portal and the automatic process, both created by Senate Bill 2030.",
  "22 O.S. § 19, petition to the district court for sealing, as amended by Senate Bill 2030.",
  "Criminal History Record Expungement, Oklahoma State Bureau of Investigation, page last updated 23 July 2026 and read on 7 August 2026."
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
  "Whether a particular record qualifies is an individualised legal judgment, and on these two routes it is a hard one. Eligibility under 22 O.S. section 18b turns on which category the record falls into, on a floor of 1 January 1980, and — for several of the categories — on the record being an Oklahoma single-source record, which means an Oklahoma arrest record carrying no out-of-state arrest, no federal arrest and no National Sex Offender Registry or NCIC wanted or warrant entry. That last condition is about the shape of your whole record rather than about the one case you are asking about, which is exactly why a page cannot answer it. This guidance explains where the process stands; it does not decide eligibility.";

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
        "Waiting for Oklahoma's clean slate sealing instead of filing is the one decision this page exists to prevent. Eligibility exists in the statute from 1 July 2026, but the process that would act on it does not: section 19d(D) gives the Bureau until 1 November 2027 to begin and until 1 November 2029 to finish the electronic records eligible by then, and section 18b(B) makes the eligibility itself subject to the availability of funds. What the route produces when it does run is partial sealing under section 18b(D), which leaves the record available to law enforcement. So waiting is a wait for a process that is not running, for an outcome that may not be the one you need.",
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
        "There is no portal to use. Section 19d(A) of Title 22 requires the Bureau to establish and maintain a publicly accessible online portal for expedited expungement requests by 1 November 2026. That date has not arrived, so this is a duty that is not yet due rather than one that has been missed — and as things stand none is published and nothing can be sent through one. The Bureau's own expungement page, last updated 23 July 2026 and therefore after the Act took effect, describes none. That is strong evidence rather than formal confirmation.",
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
    "The Bureau holds the state criminal history record and will release your own copy to you. Sections 18b and 19d of Title 22 also make it the body responsible for the sealing without a petition and for the request portal. Nothing is submitted to it on this route, and LegalEase contacts it about nothing."
};

export const OKLAHOMA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- ok_clean_slate -------------------------------------------------------
  "ok-clean-slate-status-disclosure": sheet({
    templateId: "ok-clean-slate-status-disclosure",
    mechanismName: "Oklahoma's clean slate sealing without a petition, and where it stands",
    whyNotAFiling:
      "Nothing is filed by you and nothing can be. Sealing without a petition under 22 O.S. section 18b, run through the process in 22 O.S. section 19d, is something the Oklahoma State Bureau of Investigation does on the State's own records — and as things stand it is not doing it yet. There is no application, no form and no queue to join, so LegalEase generates nothing here.",
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
      THE_ACT_AS_ENACTED,
      ELIGIBILITY_IS_NOT_ADMINISTRATION,
      THE_THREE_DATES,
      FUNDING_IS_A_CONDITION,
      EXPUNGEMENT_MEANS_SEALING,
      "What the process looks like when it does run, so that you can recognise it. Section 19d(E) has the Bureau identify eligible records from its repository each month, notify the arresting and prosecuting agencies, and wait forty-five days during which those agencies or the Bureau may object in writing on one of three grounds. Where nobody objects the Bureau sends the courts a list and a signed expungement order issues; where somebody does object, the court may set the objection down for hearing and may still order the record sealed if it finds the objection is not sufficiently grounded. Every step in that is the State's own machinery. None of it is a step you take, and none of it is a step you can start.",
      "One more thing worth knowing before you read the next sheet: an order made this way carries an 'AE' prefix identifying it as an automated or expedited expungement, and it is not a public record.",
      PETITION_ROUTE_REMAINS_OPEN,
      WHAT_IS_NOT_KNOWN,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "The next sheet in this packet is about what this route reaches and what it does not, which is the half most accounts get wrong in both directions. The last sheet sets out what to watch and when.",
    canPrepare: [
      "This account of where Oklahoma's sealing without a petition actually stands, written from the enacted text rather than from a bill record.",
      "The scope sheet that follows it in this packet, which sets out what the route reaches and what it leaves untouched.",
      "A description of the process the statute lays down, so that you can tell an official step from something somebody has invented.",
      "The monitoring sheet, which sets out what to watch and when to check again.",
      "A plain statement of what is still open, so that you are not relying on a confident answer nobody has."
    ],
    escalations: [
      "You have been told your record will be cleared automatically on a particular date.",
      "You are deciding whether to wait rather than file, and something turns on the answer.",
      "Your criminal history record shows something you do not recognise."
    ]
  }),

  "ok-clean-slate-scope-disclosure": sheet({
    templateId: "ok-clean-slate-scope-disclosure",
    mechanismName: "What the clean slate route reaches, and what it leaves untouched",
    whyNotAFiling:
      "This page describes the boundaries of a route and compares it with the one that is open. Nothing on it is filed, and there is nothing on this route that could be filed.",
    processType: "agency",
    prerequisites: [
      "You have read the sheet before this one and know that the process is not running yet.",
      "You are deciding whether to wait for it or to look at the petition routes."
    ],
    documentsToObtain: [
      "Your own criminal history record from the Oklahoma State Bureau of Investigation, so that the decision is made against what the state actually holds."
    ],
    gather: [
      "Every Oklahoma case on your record, with the county, the court and how it ended.",
      "Whether the arrest record or the court record is the one causing you the problem, because they are treated differently and cost differently.",
      "Whether your record shows any arrest outside Oklahoma, because that changes which categories can reach it.",
      "Any date of your own that the timing has to work against."
    ],
    destination: {
      name: "No destination. This sheet is a decision aid rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists because the choice between waiting and petitioning is the participant's to make, and making it well needs the shape of the route rather than a headline about it."
    },
    sequence: [
      "First, correct a thing you have probably been told the wrong way round. Senate Bill 2030 did not shrink the set of records that can be sealed without a petition. What it repealed was the earlier route, which reached arrest records only, and what it put in its place at section 18b is wider: it reaches records rather than arrest records alone, court records expressly included, and it adds two conviction categories the old route never touched at all.",
      "So the reason to look at a petition is not a lost category. It is the timetable, the funding condition and the kind of sealing this route produces, which are the next three things on this page.",
      "What section 18b actually reaches. There is a floor: the record must arise on or after 1 January 1980. Above that floor sit the acquittal, reversal-with-dismissal, DNA-innocence and full-pardon categories, the pardon for an offence committed before the age of eighteen, and the identity-theft category the same Act added to section 18. Then come three categories that reach only an Oklahoma single-source record: a record where the prosecuting agency declined to file charges, and two further section 18 categories. And then the two new ones: a felony under paragraph 1 of subsection A of 63 O.S. section 2-402 where you are not currently serving a sentence in this state, at least five years have passed since the end of your last felony or misdemeanour sentence, and the record is single-source; and a misdemeanour conviction where you have no felony conviction, nothing is pending, five years have passed since the end of your last misdemeanour sentence, and the record is single-source.",
      "Single-source is the condition that catches people out, so here it is in full. A single-source record means an Oklahoma criminal history record consisting of an Oklahoma arrest record only — no out-of-state arrest on it, no federal arrest, and no National Sex Offender Registry or NCIC wanted or warrant entry. That is a fact about your whole record rather than about the case you care about, which is why a record that looks eligible on its face may not be.",
      "There is also a measurement rule that is easy to miss. In deciding whether those waiting periods are met the Bureau considers only the records in its own possession, and treats sentences as having ended on the sentence-length information it holds. If its record of a sentence is wrong or incomplete, the arithmetic it does will follow its record rather than yours.",
      "Now the limit that changes what the route is worth. Sealing under this route is partial. Section 18b(D) makes the record unavailable to the public but leaves it available to law enforcement for law enforcement purposes, and section 18b(E) leaves it admissible in a later criminal prosecution to prove a prior conviction or a prior deferred judgment, without any order unsealing it first.",
      FULL_VERSUS_PARTIAL_SEALING,
      "Put those together and the practical question becomes a sharp one. If what you need is a record that law enforcement cannot see, this route does not produce it, and the thing to ask about is whether a petition category under section 18 would.",
      "One cost difference worth knowing before you choose. On the petition side an arrest-record expungement carries a $150 processing fee charged by the Bureau, and local law enforcement agencies may charge their own on top; a court-record expungement is free of that fee. Which of the two you actually need is worth establishing before you price anything.",
      NOT_A_REPORT_ON_YOUR_CASE,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "You leave this sheet knowing what the route reaches, what kind of sealing it produces, and what a petition would cost instead. The last sheet sets out what to watch and when.",
    canPrepare: [
      "This account of what the clean slate route reaches and of the conditions that narrow it.",
      "The correction to the common claim that the Act took categories away, which is the wrong way round.",
      "The explanation of partial sealing, which is what changes whether either route is worth using for your purpose.",
      "The comparison between waiting and petitioning, with the fee difference stated.",
      "The monitoring sheet that follows it in this packet."
    ],
    escalations: [
      "You cannot tell whether your record is a single-source record.",
      "You need a record that law enforcement cannot see, rather than one hidden from the public.",
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
      "Anything you are told about clean slate sealing by an official source, and the date you were told it.",
      "Whether your own circumstances change in a way that affects a petition route."
    ],
    destination: {
      name: "No destination. This sheet is an expectation rather than a step",
      detail:
        "Nothing here is sent anywhere. It exists so that checking back is a plan rather than an anxiety."
    },
    sequence: [
      "The nearest date is not the one most accounts lead with. Section 19d(A) requires the Bureau to establish and maintain an online portal for expedited expungement requests by 1 November 2026, and that is the first thing that can visibly change. The automatic process itself comes later: the Bureau must begin implementing it on or before 1 November 2027, and the electronic records eligible through it on or after that date must be identified and expunged before 1 November 2029.",
      "The second thing to watch is the Bureau's own reporting. From 2027 it must publish an annual report, and electronically submit it to the Legislature, of the number of records identified and sealed through the expedited and the automatic processes. A published count is the difference between a route existing on paper and a route doing something.",
      "The third is the money. Section 18b(B) makes the eligibility subject to the availability of funds, so an appropriation reaching this work is a real change in the answer rather than an administrative footnote.",
      "The fourth is rulemaking. Section 19d(E)(7) allows the Bureau and the Supreme Court to make rules governing the process, and none has been found. Rules, when they appear, are where the practical detail will be.",
      "And the fifth is your own record. Obtain a criminal history record from the Bureau and keep it dated. Obtain another later and compare the two. That comparison is the only reliable evidence of whether anything moved, and two dated copies are worth considerably more than one.",
      "What not to do in the meantime. Do not tell an employer, a landlord or a licensing body that a record is sealed because a deadline has passed or because somebody said the record qualifies. Until your criminal history record shows it, it is not something you can stand behind.",
      "And do not treat the deadlines as a reason to stop asking. The right to petition is expressly preserved, and a petition does not become unavailable because another route exists in the statute.",
      SEALING_IS_NOT_DESTRUCTION,
      "That last point is worth carrying into any conversation about what sealing is worth: it is not erasure, it is not necessarily permanent, and it has a ten-year long-stop in the other direction.",
      WHAT_IS_NOT_KNOWN,
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet knowing where the clean slate route stands, what it reaches, what waiting risks, what the alternative costs, and what to check and when.",
    canPrepare: [
      "This account of what to watch, in the order the dates actually fall, and of what each change would mean.",
      "The value of holding two dated criminal history records rather than one.",
      "The explanation of what sealing is and is not, including the ten-year long-stop.",
      "The two sheets before this one."
    ],
    escalations: [
      "The Bureau's pages begin to say the automatic process has started and you want to know what it means for you.",
      "A deadline in the statute passes and nothing has changed on your record.",
      "You have been asked to confirm in writing that a record is sealed."
    ]
  }),

  // ---- ok_osbi_portal -------------------------------------------------------
  "ok-portal-status-disclosure": sheet({
    templateId: "ok-portal-status-disclosure",
    mechanismName: "Oklahoma's free expungement request portal, and where it stands",
    whyNotAFiling:
      "Nothing is filed and nothing can be. Section 19d(A) of Title 22 requires the Oklahoma State Bureau of Investigation to establish and maintain a portal for expedited expungement requests by 1 November 2026, but none is published, so there is nothing to send and nowhere to send it. LegalEase generates nothing here.",
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
      THE_ACT_AS_ENACTED,
      "The position on the portal, stated plainly and with its date. Section 19d(A) requires the Bureau to establish and maintain a publicly accessible online portal by 1 November 2026, through which an individual may make an expedited expungement request for a clean slate eligible record. That date has not arrived. So this is a duty that is not yet due, rather than one that has been missed, and there is nothing on this route to send today.",
      "As things stand no such portal is published. The Bureau's own criminal history record expungement page was last updated on 23 July 2026 — after the Act took effect — and it describes no portal, giving an email address and a telephone number for enquiries instead. That is strong evidence rather than formal confirmation, and it is put that way deliberately: a page that does not mention a thing is not the same as an official statement that the thing does not exist.",
      "What the request will consist of when there is somewhere to make it, because it is unusually light. Section 19d(B) says a request may require only enough personal identification information for the Bureau to find the record, plus contact details — an email address or a phone number — so that you can be notified. No filing, no pleading, and the statute sets no fee.",
      "What happens to it after that is not yours to drive either. Under section 19d(C) the Bureau reviews the record; if it looks eligible on the Bureau's own records it asks the arresting and prosecuting agencies to review it; on their confirmation it sends a request to the district court; and if the court approves, an order issues to the Bureau and the other agencies holding the record. If any of them finds the record ineligible, the Bureau sends you a written or electronic notice of rejection stating the reasons.",
      "Why the portal matters more than its size suggests, and why it is worth a sheet at all: the statute sets no fee for a request, so if it arrives, a meaningful share of people may reach relief without paying for a petition. That is a real difference in access, not an administrative detail.",
      EXPUNGEMENT_MEANS_SEALING,
      FUNDING_IS_A_CONDITION,
      PETITION_ROUTE_REMAINS_OPEN,
      WHAT_IS_NOT_KNOWN,
      NOTHING_CAN_BE_FILED
    ],
    expectedNextStage:
      "The next sheet is the cost comparison, which is the decision this route actually turns on: whether to pay for a petition now or wait to see whether a free route opens.",
    canPrepare: [
      "This account of where the portal stands, with the statutory deadline the Bureau is working to.",
      "The description of what a request would consist of and who reviews it, taken from the statute.",
      "The cost comparison that follows it in this packet.",
      "The monitoring sheet, which sets out what to watch and when to check again.",
      "A plain statement of what is still open, so that you are not relying on a confident answer nobody has."
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
      "Whether a legal aid office or a clinic would take the work on for you, which changes the arithmetic."
    ],
    destination: {
      name: "No destination. This sheet is a decision aid rather than a step",
      detail:
        "Nothing here is sent anywhere. The decision is yours to make, and it is made better with the numbers in front of you than with a general sense that one route is cheaper."
    },
    sequence: [
      "Start with which record you actually need cleared, because the costs differ. On the petition side an arrest-record expungement carries a $150 processing fee charged by the Bureau, and local law enforcement agencies may charge their own on top. A court-record expungement is free of that fee.",
      "So the participant for whom a free portal would matter most is the one who needs the arrest record cleared. If that is you, this decision is worth taking slowly.",
      "Now the three things that make waiting a real gamble rather than a free option. The portal is not published, and although the statute puts a date on it — 1 November 2026 — it provides no remedy to anybody if that date passes without one. The eligibility the route runs on is expressly subject to the availability of funds. And what it produces is partial sealing, which leaves the record available to law enforcement.",
      "So waiting is not simply cheaper. It is cheaper only if the route arrives, reaches your record, and produces the outcome you actually need, and none of those three is established today.",
      "Set that against the thing that is certain: the right to petition is expressly preserved by section 19d(G) and is available now.",
      "The honest framing of the choice, and it is genuinely yours to make. If your need has a date on it, pay for the route that exists. If it does not, and the fee is the obstacle, waiting is a reasonable bet provided you know it is a bet and you have given yourself a date to review it.",
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
      "A statement of what the statute does and does not guarantee about the portal, so that the bet is made with the odds visible.",
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
      "This page sets expectations against a statutory duty that has not yet produced anything. Nothing on it is filed and nothing on it is generated for you to sign.",
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
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you when a record has been sealed, or when this route starts working, which is why this packet tells you to check your own record.",
      "If the portal does arrive, the statute has the Bureau notify you rather than the other way round: a written or electronic notice of rejection if a reviewing body finds the record ineligible, and a notification when a record is sealed."
    ],
    sequence: [
      "Give the wait a date, because the statute already has. Section 19d(A) puts the portal deadline at 1 November 2026, so that is the first date to check against rather than an open horizon. The Bureau's own expungement and clean slate pages are where it would be described if it arrives.",
      "Be careful here, and this is the practical warning on this sheet. A free government route is exactly the shape that paid intermediaries imitate. If something asks you to pay to submit an expedited request, that is a reason to stop and check where the procedure is published. A portal you hear about anywhere other than the Bureau's own pages is worth checking against them before you use it.",
      "The second thing to watch is your own record. Obtain a criminal history record from the Bureau and keep it dated; obtain another later and compare. That is the only reliable evidence of whether anything has moved.",
      "The third is the automatic process running alongside this one, because both are the same body's obligations under the same Act. The Bureau must begin implementing it on or before 1 November 2027, and the electronic records eligible through it on or after that date must be identified and expunged before 1 November 2029. From 2027 the Bureau must also publish an annual report, and submit it to the Legislature, of what the expedited and automatic processes have actually sealed.",
      "The fourth is rulemaking. Section 19d(E)(7) allows the Bureau and the Supreme Court to make rules for the process, and none has been found; when rules appear, that is where the practical detail about the portal will be.",
      "And if your circumstances change — a job, a licence, a housing application — the answer changes with them, and the petition route is the one that can be made to happen on a date of your choosing.",
      SEALING_IS_NOT_DESTRUCTION,
      WHAT_IS_NOT_KNOWN,
      "None of that is a reason to do nothing. It is a reason to know what you are waiting for, and to have decided in advance what would make you stop waiting.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this packet knowing where the portal stands, what a petition would cost instead, what to watch, and what would make waiting the wrong choice.",
    canPrepare: [
      "This account of what to watch and where to check it, with the statutory date to check against.",
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
    mechanism: "status_disclosure_and_routing_for_clean_slate_sealing_that_is_not_yet_administered",
    authority:
      "22 O.S. § 18b and 22 O.S. § 19d, as enacted by Senate Bill 2030, Laws 2026, c. 282, with 22 O.S. §§ 18 and 19 as amended by the same Act",
    recordTypes: ["arrest", "charge", "conviction", "court_record"],
    dispositions: ["convicted", "dismissed", "acquitted"],
    components: [
      {
        componentId: "ok_clean_slate-status-disclosure-1",
        templateId: "ok-clean-slate-status-disclosure"
      },
      {
        componentId: "ok_clean_slate-scope-disclosure-2",
        templateId: "ok-clean-slate-scope-disclosure"
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
    assembledPacketTitle: "Oklahoma clean slate sealing — where it stands and what it reaches",
    customerDeliverableDescription:
      "Tells an Oklahoma participant the true status of sealing without a petition: Senate Bill 2030 is Laws 2026, c. 282 and took effect on 1 July 2026, so statutory eligibility exists under 22 O.S. § 18b(B) subject to the availability of funds, while the § 19d administration does not — the Bureau has until 1 November 2027 to begin and until 1 November 2029 to finish the electronic records eligible by then, and the § 19d(A) portal is not due until 1 November 2026. Corrects the widespread misreading that the Act narrowed eligibility, sets out what § 18b actually reaches including the single-source condition and the 1 January 1980 floor, explains that § 18b(D) seals only partially, prices the preserved petition alternative against it, and gives a monitoring plan. Nothing is filed and nothing can be.",
    notes:
      "Process guidance only, and a status disclosure rather than a route to use. Nothing is filed on this track and nothing can be; never generate an application or a request. Eligibility is funding-conditioned under § 18b(B) and no participant is told they qualify. The petition right preserved by § 19d(G) is the actionable alternative."
  }),

  oklahomaTrack({
    trackId: "ok_osbi_portal",
    publicName: "Oklahoma's free expungement request portal, and where it stands",
    mechanism: "status_disclosure_and_cost_comparison_for_a_request_portal_that_is_not_yet_published",
    authority:
      "22 O.S. § 19d and 22 O.S. § 18b, as enacted by Senate Bill 2030, Laws 2026, c. 282, with 22 O.S. §§ 18 and 19 as amended by the same Act",
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
        label: "Do you want to send a request through the expedited portal now?",
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
      "Tells an Oklahoma participant that the expedited expungement request portal 22 O.S. § 19d(A) requires by 1 November 2026 is not published and that nothing can be sent through one, distinguishes evidence from confirmation on that point, sets out what § 19d(B) and (C) say a request would consist of and who reviews it, and then does the thing that actually matters: sets the $150 arrest-record processing fee against a free court-record expungement and a statutory request that carries no fee, so the participant can decide for themselves whether to pay now or wait. Adds a monitoring plan and a warning about paid intermediaries imitating a free government route. Nothing is filed and nothing can be.",
    notes:
      "Process guidance only, and a status disclosure rather than a route to use. No portal is published; never suggest a request can be sent, and never generate one. The 1 November 2026 deadline in § 19d(A) has not arrived, so the duty is not yet due rather than breached, and the Bureau's page not mentioning a portal is stated as evidence rather than confirmation."
  })
];
