// Texas process guidance — one route, and the deliverable is a referral that
// is worth more than the packet it replaces.
//
// `tx_exp_discretionary` is discretionary expunction under Tex. Code Crim.
// Proc. art. 55A.101, added by S.B. 1667, 89th Legislature, Regular Session
// (2025), Ch. 850, effective 1 September 2025. A court *may* expunge where the
// person was convicted at trial and then acquitted by the Court of Criminal
// Appeals, or by a court of appeals once the period for granting discretionary
// review has expired; or where the office of the attorney representing the
// state authorised by law to prosecute the offence recommends the expunction
// to the court before the person is tried, whether or not a charging
// instrument was presented. Article 55A.101(b) lets a justice court or a
// municipal court of record act under the article only on a fine-only arrest.
// Article 55A.151 bars relief where the acquitted offence arose out of a
// criminal episode in which the person was convicted of, or remains subject to
// prosecution for, another offence.
//
// Why this is guidance rather than a packet, and the reason is substantive
// rather than a missing form. The adopted decision records the article as
// outside the current LegalEase self-help scope, on two grounds that survive
// the guidance re-review: the prosecutor-recommendation route exists only if a
// prosecutor's office decides to recommend expunction before trial, and
// obtaining that decision is negotiation, which the packet-only model places
// outside scope; and the appellate-acquittal route turns on appellate posture,
// including which court acquitted and whether the period for granting
// discretionary review has expired, which is individualised advocacy rather
// than neutral completion of a participant's portion. Relief is discretionary
// in both cases even where a route applies.
//
// The node still earns its place. A participant who was acquitted on appeal
// needs to be told this article exists and referred, rather than routed into
// the mandatory trial-court acquittal route where they do not belong.
//
// Four boundaries the design fixes and this module holds:
//
//   - **No pleading is generated here, by anybody.** Where a participant
//     pursues the article with counsel, an ex parte petition runs under art.
//     55A.251, or art. 55A.252 for a fine-only arrest. Those are named as what
//     an attorney would file. Nothing on this page is drafted, completed or
//     prepared for filing, and the Texas Judicial Branch forms index was
//     confirmed to contain no expunction form at all.
//   - **No prosecutor consent is claimed or predicted.** Whether an office
//     would recommend expunction is that office's decision. This page never
//     says one will, never says one has, and never suggests a participant can
//     obtain a recommendation by asking in the right way.
//   - **No court or agency is described as having acted.** Discretionary means
//     a court may decline, and nothing here reports an outcome.
//   - **Expunction, nondisclosure and the routes that run without a petition
//     are three different things.** Chapter 55A expunction is the remedy this
//     page is about. An order of nondisclosure is a different remedy with
//     different consequences, and at least one Texas nondisclosure route is
//     issued by the court without any petition at all. All of those are
//     separate routes in the Texas intake and none of them is decided here.
//
// The universal referral is content rather than a typed stop. The design sends
// every participant on this article to an attorney or legal aid, so encoding
// that as a throw would mean the assigned deliverable never renders. The typed
// stops are reserved for the answers that discriminate: the wrong forum, the
// wrong acquittal, neither route applying, the criminal-episode bar, a
// question about appellate posture, a request to go and obtain a prosecutor's
// recommendation, and a request for a pleading.
//
// No conditional component and no fact placeholder appears here: the adopted
// packet set carries a single required component and the template interpolates
// no participant answer, so a second fixture would render byte-for-byte the
// same packet. All seven typed stops are exercised as negative cases in the
// committed verifier.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Texas is
// not an enabled jurisdiction and this job does not enable one. The Chapter
// 55A petition routes and the nondisclosure routes belong to other jobs, are
// not prepared here, and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** Texas legal help, named once so no stop is a dead end. */
const TX_LEGAL_HELP =
  "a Texas legal aid organisation, a Texas law school legal clinic, the State Bar of Texas lawyer referral service, or a Texas attorney who does expunction and appellate work";

/** The other Texas routes, named the same way by every stop that points at them. */
const TX_OTHER_ROUTES =
  "the other Texas record-clearing routes, which are separate routes in the Texas intake";

/** The mandatory route, named the same way wherever it is mentioned. */
const TX_MANDATORY_ACQUITTAL_ROUTE =
  "the Texas trial-court acquittal route, which is a separate route in the Texas intake";

/** The office that holds the appellate paperwork. */
const TX_APPELLATE_CLERK =
  "the clerk of the court that acquitted you — the Court of Criminal Appeals or the court of appeals";

const TX_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, seal or remove anything, and cannot make a court, a clerk, a prosecutor or a records agency act.",
  "LegalEase does not prepare a petition, motion, application or proposed order on this route, and does not prepare one for anybody to sign.",
  "LegalEase cannot tell you whether a court would exercise its discretion in your favour. Discretionary means a court may decline.",
  "LegalEase cannot ask a prosecutor's office for anything, cannot negotiate with one, and cannot tell you whether one would recommend expunction.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains how a process works; it is not legal advice and it is not an eligibility decision.",
  "LegalEase cannot tell you that a record has been expunged. Only your own record check shows that, and you are the one who reads it.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal record. You request your own copy and you read it.",
  "LegalEase has not contacted any court, clerk, prosecutor or agency about your case, and has not filed anything for you."
];

const TX_SOURCES: readonly string[] = [
  "Tex. Code Crim. Proc. ch. 55A, expunction of criminal records, read at the Texas Legislature's statutes site on 6 August 2026.",
  "Tex. Code Crim. Proc. art. 55A.101, the discretionary expunction article, with art. 55A.151, the criminal-episode bar, and arts. 55A.251 and 55A.252, the ex parte petition provisions.",
  "S.B. 1667, 89th Legislature, Regular Session (2025), Ch. 850, enrolled text, effective 1 September 2025, read on 6 August 2026.",
  "Texas Judicial Branch forms index, checked on 6 August 2026 and containing no expunction form."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class TexasGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "TexasGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Texas route. */
export class TexasRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "TexasRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class TexasBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "TexasBranchError";
  }
}

export const TX_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Chapter 55A reaches Texas records and nothing else. */
export const TX_RECORD_JURISDICTIONS: Readonly<Record<string, string>> = {
  texas_state: "within",
  another_state: "outside",
  federal: "outside",
  tribal: "outside"
};

/** Which court acquitted, because the article turns on exactly that. */
export const TX_ACQUITTAL_POSTURE: Readonly<Record<string, string>> = {
  court_of_criminal_appeals: "appellate",
  court_of_appeals: "appellate",
  trial_court: "trial",
  not_acquitted: "none"
};

/** The art. 55A.151 criminal-episode bar, in the terms the article uses. */
export const TX_CRIMINAL_EPISODE: Readonly<Record<string, string>> = {
  no_other_offence_in_the_episode: "clear",
  convicted_of_another_offence_in_the_episode: "barred",
  still_subject_to_prosecution_in_the_episode: "barred",
  not_sure: "unknown"
};

/** Fine-only decides which courts may act under art. 55A.101(b). */
export const TX_FINE_ONLY: Readonly<Record<string, string>> = {
  fine_only_arrest: "fine_only",
  not_a_fine_only_arrest: "not_fine_only",
  not_sure: "unknown"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new TexasBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

/**
 * Validates participant answers and routes to the correct Texas node.
 *
 * The order is: forum first, then which acquittal this actually was, then
 * whether either route in the article is in play at all, then the design's own
 * self-help stop conditions — the criminal-episode bar, appellate posture, the
 * negotiation boundary — and last a request for a pleading, which is refused
 * on this route however the earlier answers fell.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveTexasGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Chapter 55A reaches Texas records.
  const jurisdiction = branch(
    trackId,
    "recordJurisdiction",
    TX_RECORD_JURISDICTIONS,
    facts.recordJurisdiction
  );
  if (jurisdiction.resolved === "outside") {
    throw new TexasRouteMismatchError(
      trackId,
      "record_is_not_a_texas_state_record",
      "Chapter 55A expunction runs on Texas records in Texas courts. It does not reach a federal, tribal or out-of-state record, and neither route in article 55A.101 touches one.",
      "the state, federal or tribal authority that holds the record, and " + TX_LEGAL_HELP,
      "Take the record to that authority and ask what its own law provides for clearing it. If you also have Texas matters, those are handled separately and only those are served here."
    );
  }

  // Gate 2. A trial-court acquittal is the mandatory route, not this one.
  const posture = branch(
    trackId,
    "acquittalPosture",
    TX_ACQUITTAL_POSTURE,
    facts.acquittalPosture
  );
  const recommendation = branch(
    trackId,
    "prosecutorRecommendationOffered",
    TX_YES_NO,
    facts.prosecutorRecommendationOffered
  );
  if (posture.resolved === "trial") {
    throw new TexasRouteMismatchError(
      trackId,
      "acquittal_was_at_trial_rather_than_on_appeal",
      "An acquittal by the trial court is the better position to be in, and it is a different article. A person tried and acquitted by the trial court is entitled to expunction, which is not the same as a court having a discretion to grant it. Article 55A.101 is about acquittals that came from an appellate court, so this page is not the one that fits.",
      TX_MANDATORY_ACQUITTAL_ROUTE + ", and " + TX_LEGAL_HELP,
      "Go back to the Texas intake, say the acquittal was at trial, and ask about the entitlement route. Take the judgment of acquittal with you."
    );
  }
  if (posture.resolved === "none" && !recommendation.resolved) {
    throw new TexasRouteMismatchError(
      trackId,
      "neither_route_in_the_article_is_in_play",
      "Article 55A.101 has two doors and this answer opens neither. One needs an acquittal by an appellate court; the other needs the prosecutor's office to have decided, before trial, that it would recommend expunction to the court. Without one of those, the article is not the route — which says nothing at all about whether some other Texas route reaches the record. Expunction and an order of nondisclosure are different remedies with different consequences, and the Texas intake keeps them apart precisely so that this question gets asked properly.",
      TX_OTHER_ROUTES + ", and " + TX_LEGAL_HELP,
      "Go back to the Texas intake with how each case actually ended and ask which route fits. Expunction and an order of nondisclosure are different remedies with different consequences, and the intake separates them."
    );
  }

  // Gate 3. The article 55A.151 criminal-episode bar.
  const episode = branch(
    trackId,
    "criminalEpisode",
    TX_CRIMINAL_EPISODE,
    facts.criminalEpisode
  );
  if (episode.resolved === "barred" || episode.resolved === "unknown") {
    throw new TexasGuidanceStopError(
      trackId,
      "companion_offence_from_the_same_criminal_episode",
      "Article 55A.151 bars relief where the acquitted offence arose out of a criminal episode in which the person was convicted of, or remains subject to prosecution for, another offence. That turns on what counts as one episode and on the status of every charge in it, which is a judgment about the shape of a whole prosecution rather than about the case you are asking about — and it is the same answer whether you know there is a companion matter or cannot tell.",
      TX_LEGAL_HELP,
      "Take every charge that came out of the same incident, with how each one ended and whether any is still live, to one of them and ask whether article 55A.151 reaches the case."
    );
  }

  // Gate 4. Appellate posture, which the design makes a self-help boundary.
  const postureQuestion = branch(
    trackId,
    "hasAppellatePostureQuestion",
    TX_YES_NO,
    facts.hasAppellatePostureQuestion
  );
  if (postureQuestion.resolved) {
    throw new TexasGuidanceStopError(
      trackId,
      "appellate_posture_question_requires_advocacy",
      "Appellate posture is the thing this route turns on and it is not something a page can read for you. For an acquittal by a court of appeals the article works only once the period for granting discretionary review has expired, and whether it has depends on what has happened in the case since the opinion issued — which is what the mandate records. Getting that wrong in either direction wastes a filing or misses the moment.",
      TX_APPELLATE_CLERK + ", and " + TX_LEGAL_HELP,
      "Ask the appellate clerk for the opinion and the mandate, and take both to an attorney. The mandate is the document that shows where the case stands."
    );
  }

  // Gate 5. The negotiation boundary, stated as a boundary rather than a hint.
  const seekingRecommendation = branch(
    trackId,
    "wantsHelpObtainingARecommendation",
    TX_YES_NO,
    facts.wantsHelpObtainingARecommendation
  );
  if (seekingRecommendation.resolved) {
    throw new TexasGuidanceStopError(
      trackId,
      "obtaining_a_prosecutor_recommendation_is_negotiation",
      "Persuading a prosecutor's office to recommend expunction is negotiation with the office that prosecuted you, conducted before trial and on the merits of your case. It is advocacy by a person, not a document a service produces, and nobody can tell you in advance what any office would decide. LegalEase does not approach a prosecutor's office, does not negotiate with one, and does not draft anything for one.",
      TX_LEGAL_HELP,
      "Ask one of them to take the conversation on, and ask early — a recommendation under this article has to be made to the court before you are tried."
    );
  }

  // Gate 6. No pleading on this route, whatever the earlier answers were.
  const wantsPleading = branch(
    trackId,
    "wantsAPleadingPrepared",
    TX_YES_NO,
    facts.wantsAPleadingPrepared
  );
  if (wantsPleading.resolved) {
    throw new TexasGuidanceStopError(
      trackId,
      "pleading_requested_on_a_route_that_generates_none",
      "Nothing is drafted on this route. Where the article is pursued with counsel the vehicle is an ex parte petition under article 55A.251, or article 55A.252 for a fine-only arrest, and that is a document an attorney prepares on the facts of an appellate record or a negotiation. LegalEase does not prepare it, does not part-prepare it, and does not produce a version for anybody to adapt.",
      TX_LEGAL_HELP,
      "Ask one of them to prepare the petition. Take the appellate opinion and mandate if you have them, and a list of every agency you know to hold a record of the arrest."
    );
  }

  // Not a stop. It decides which courts may act, and the sheet explains both.
  const fineOnly = branch(trackId, "fineOnlyArrest", TX_FINE_ONLY, facts.fineOnlyArrest);
  derived.txFineOnlyArrest = fineOnly.resolved === "fine_only";

  return derived;
}

// ---------------------------------------------------------------------------
// Guidance template
// ---------------------------------------------------------------------------

export const TEXAS_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "tx-exp-discretionary-process-guidance": {
    templateId: "tx-exp-discretionary-process-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName:
      "Discretionary expunction under article 55A.101: what it is, and why it needs a lawyer",
    whyNotAFiling:
      "Nothing is filed by you and nothing is prepared for you. Article 55A.101 of the Texas Code of Criminal Procedure gives a court a discretion to expunge in two narrow situations, and both of them turn on things a document cannot supply: an appellate record, or a decision by a prosecutor's office. This page tells you the article exists, what each of its two routes requires, what would rule your case out, and who to take it to. It does not prepare a petition, and no Texas expunction form exists to complete.",
    processType: "court_adjacent",
    prerequisites: [
      "The record is a Texas record from a Texas court.",
      "Either an appellate court acquitted you after a conviction at trial, or a prosecutor's office has raised recommending expunction before you are tried.",
      "You are willing to be told that this is a route LegalEase refers out rather than prepares."
    ],
    documentsToObtain: [
      "The appellate opinion and the mandate, from the clerk of the court that acquitted you. Ask for both. The mandate is what establishes whether the period for granting discretionary review has expired, which the appellate route turns on.",
      "The judgment and the docket sheet for every charge that came out of the same incident, from the clerk of the trial court. Article 55A.151 turns on what happened to all of them, not only to the one you are asking about.",
      "Your own Texas criminal history, so that the conversation with an attorney starts from what is actually recorded rather than from memory."
    ],
    participantDataToGather: [
      "Which court acquitted you, and on what date.",
      "Whether any other offence came out of the same incident, how each one ended, and whether any is still being prosecuted.",
      "Whether the arrest was for a fine-only offence, because that decides which courts may act under this article.",
      "Whether anybody from a prosecutor's office has said anything about recommending expunction, exactly what was said, and when.",
      "Whether you have been tried yet, because the recommendation route is only available before trial."
    ],
    officialDestination: {
      name: "A district court, or a justice court or a municipal court of record where the arrest was for a fine-only offence",
      detail:
        "Article 55A.101 is exercised by a court, and under article 55A.101(b) a justice court or a municipal court of record may act under the article only where the arrest was for a fine-only offence; otherwise it is a district court. Nothing is submitted by you on this page and nothing is generated here. Where the article is pursued, it is pursued by an attorney."
    },
    actionSequence: [
      "This page explains how a process works. It does not tell you what has happened to your own record, and LegalEase has not looked. Nothing here is a decision about whether a particular record qualifies.",
      "Start with what this article is, because it is unusual and it is new. Article 55A.101 was added by Senate Bill 1667 in the 2025 regular session and took effect on 1 September 2025. It gives a court a discretion to expunge in two situations, and the word to hold on to is discretion: the article says the court may order the expunction, not that it must.",
      "The first route is an appellate acquittal. It applies where a person was convicted at trial and then acquitted by the Court of Criminal Appeals, or acquitted by a court of appeals once the period for granting discretionary review has expired. That second condition is doing real work — a court of appeals acquittal is not enough on its own until that period has run.",
      "The second route is a prosecutor recommendation. It applies where the office of the attorney representing the state, authorised by law to prosecute the offence, recommends the expunction to the court before the person is tried. It works whether or not a charging instrument was presented, which is unusual and is one reason the article is worth knowing about. What it needs is the office's own decision.",
      "Now the thing that decides whether either route is worth pursuing, and it is why this page ends in a referral rather than a document. On the first route everything turns on appellate posture: which court acquitted, what the mandate says, and whether the discretionary-review period has expired. On the second, everything turns on a decision by the office that prosecuted you, which somebody has to ask for and argue for — that is negotiation with the other side, and nobody can tell you in advance what any office would decide. Neither of those is a form to complete. Both are advocacy by a person, and this article therefore sits outside what LegalEase prepares.",
      "What rules a case out even where a route applies. Article 55A.151 bars relief where the acquitted offence arose out of a criminal episode in which the person was convicted of, or remains subject to prosecution for, another offence. So a single good outcome inside a bad episode may not be enough, and whether two charges are one episode is exactly the kind of question that needs a lawyer looking at the file.",
      "Which court can act, because people ask and getting it wrong costs a hearing. Under article 55A.101(b) a justice court or a municipal court of record may act under this article only where the arrest was for a fine-only offence. Anything else belongs in a district court.",
      "What the vehicle is, so that you recognise it when an attorney describes it. Where the article is pursued, it goes forward on an ex parte petition under article 55A.251, or under article 55A.252 for a fine-only arrest. That petition is prepared by an attorney on the facts of your case. It is not prepared here, not part-prepared here, and there is no Texas expunction form to fill in: the Texas Judicial Branch forms index was checked and contains none.",
      "Three remedies that get confused with one another, and it is worth being able to tell them apart before anybody spends money. Expunction under chapter 55A is what this page is about. An order of nondisclosure is a different remedy with different consequences — it restricts who may see a record rather than removing it — and at least one Texas nondisclosure route is issued by the court without any petition being filed at all. Those are separate routes in the Texas intake, and which one fits depends on how each case ended.",
      "What to do next, in order. Get the appellate opinion and the mandate from the appellate clerk. Get the judgment and docket sheet for every charge from the same incident. Then take all of it to an attorney or a legal aid organisation and ask two questions: whether article 55A.151 reaches the case, and whether the posture supports the article at all.",
      "One thing to be careful about while you are asking. Nobody can tell you what a prosecutor's office would decide, and nobody should tell you that a court will grant a discretionary expunction. If somebody promises either, that is a reason to ask how they know.",
      "And what not to do in the meantime. Do not tell an employer, a landlord or a licensing body that a record has been cleared because an appeal went your way. An acquittal and an expunction are different events, and until your own record check shows the second one, it is not something you can stand behind."
    ],
    submissionMethod:
      "There is nothing for you to submit and nothing is generated here. No petition, motion, application or proposed order is produced on this route, and nothing is sent on your behalf. Where the article is pursued, an attorney files the petition.",
    fees:
      "Not quoted. This article is not built here and no figure is asserted for it. What a court charges, and what an attorney would charge, are questions to ask the court's clerk and the attorney directly before you commit to anything.",
    feeWaiver:
      "A participant who proceeds with counsel may still use the Texas Rule 145 Statement of Inability to Afford Payment of Court Costs. That is a court procedure rather than anything prepared here, and the attorney or the clerk is the right source for how it is used.",
    noticeOrService: [
      "There is nothing for you to serve and nobody for you to notify on this page.",
      "The article's vehicle is an ex parte petition, which is a term worth understanding: it means the petition is presented without the other side being heard first. What notice a court then requires is a matter for the court and for the attorney who files.",
      "Nobody is required to write and tell you that a record has been expunged, which is why a check of your own record is the only reliable confirmation."
    ],
    expectedNextStage:
      "You leave this sheet knowing that article 55A.101 exists, which of its two routes could apply to you, what would rule the case out, which court could act, and who to take it to. The next step is a conversation with an attorney, not a filing.",
    legalEaseCanPrepare: [
      "This account of what article 55A.101 provides and of the two quite different routes inside it.",
      "The plain statement that relief under the article is discretionary, so that nobody plans around a certainty that does not exist.",
      "The article 55A.151 criminal-episode screen, which is the thing most likely to rule a case out.",
      "The list of documents to collect before any appointment, so that one conversation does the work of three.",
      "The distinction between expunction, an order of nondisclosure, and the Texas routes that run without a petition.",
      "The referral: who to look for, and the two questions to ask them."
    ],
    legalEaseCannotPerform: TX_CANNOT_PERFORM,
    escalationTriggers: [
      "Any question about discretionary expunction under this article. It is outside what LegalEase prepares, and the answer is a referral rather than a packet.",
      "Any other charge from the same incident, whether it ended in a conviction or is still being prosecuted.",
      "Any question about appellate posture, including whether the period for granting discretionary review has expired.",
      "Somebody from a prosecutor's office has said something about recommending expunction.",
      "You have not been tried yet and are trying to work out what to do before you are.",
      "The record is a federal, tribal or out-of-state record.",
      "You have been quoted a price for an expunction and have no way to judge it."
    ],
    officialSourceReferences: TX_SOURCES
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
      if (!TEXAS_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Texas guidance template ${component.templateId} is registered.`
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

const TX_INPUTS: readonly RequiredInput[] = [
  {
    key: "recordJurisdiction",
    label: "Is the record a Texas record, or is it another state's, federal or tribal?",
    required: true
  },
  {
    key: "acquittalPosture",
    label:
      "Were you acquitted by the Court of Criminal Appeals, by a court of appeals, by the trial court, or not acquitted?",
    required: true
  },
  {
    key: "prosecutorRecommendationOffered",
    label:
      "Has the prosecutor's office said it would recommend that your record be expunged? Record only what was actually said.",
    required: true
  },
  {
    key: "criminalEpisode",
    label:
      "Did any other offence come out of the same incident? If so, were you convicted of it, or are you still subject to prosecution for it?",
    required: true
  },
  {
    key: "hasAppellatePostureQuestion",
    label:
      "Do you have a question about where the appeal stands, including whether the period for granting discretionary review has expired?",
    required: true
  },
  {
    key: "wantsHelpObtainingARecommendation",
    label: "Do you want help persuading a prosecutor's office to recommend expunction?",
    required: true
  },
  {
    key: "wantsAPleadingPrepared",
    label: "Do you want a petition prepared for this article now?",
    required: true
  },
  {
    key: "fineOnlyArrest",
    label:
      "Was the arrest for a fine-only offence? That decides which courts may act under this article.",
    required: true
  },
  {
    key: "acquittalDate",
    label: "On what date were you acquitted, and by which court?",
    required: true
  },
  {
    key: "countyOfProsecution",
    label: "In which Texas county was the case prosecuted?",
    required: true
  }
];

export const TEXAS_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  (() => {
    const statuses = {
      research: "research_draft_complete",
      technical: "renderer_ready",
      visual: "not_reviewed",
      legal: "not_submitted"
    } as const;

    return {
      jurisdiction: "TX",
      trackId: "tx_exp_discretionary",
      publicName: "Discretionary expunction: when the court may, but need not, clear a record",
      mechanism:
        "status_disclosure_eligibility_screen_and_attorney_referral_for_a_discretionary_article_outside_self_help_scope",
      authority:
        "Tex. Code Crim. Proc. art. 55A.101, with arts. 55A.151, 55A.251 and 55A.252, as added by S.B. 1667, 89th Leg., R.S. (2025), Ch. 850",
      recordTypes: ["arrest", "charge", "conviction"],
      dispositions: ["acquitted"],
      courtLevel: "district",
      geographicScope: "statewide",
      geographyKeys: [],
      outputStrategy: "process_guidance",
      packetSet: packetSet("tx_exp_discretionary", [
        {
          componentId: "tx_exp_discretionary-process-guidance-1",
          templateId: "tx-exp-discretionary-process-guidance"
        }
      ]),
      requiredInputs: TX_INPUTS,
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
      assembledPacketName: "texas-discretionary-expunction-referral",
      assembledPacketTitle:
        "Texas discretionary expunction — what article 55A.101 provides, and why it needs a lawyer",
      customerDeliverableDescription:
        "Tells a Texas participant who was acquitted on appeal, or whose prosecutor has raised recommending expunction, that Tex. Code Crim. Proc. art. 55A.101 exists and what each of its two routes actually requires — an acquittal by the Court of Criminal Appeals, or by a court of appeals once the period for granting discretionary review has expired; or a recommendation made to the court by the prosecuting office before the person is tried. States plainly that relief is discretionary, screens the art. 55A.151 criminal-episode bar, explains that art. 55A.101(b) lets a justice or municipal court of record act only on a fine-only arrest, and names the art. 55A.251 and 55A.252 ex parte petition as the vehicle an attorney would use. Then does the thing the adopted decision requires: refers the participant out, because obtaining a prosecutor's recommendation is negotiation and reading appellate posture is advocacy, and neither is a document a service produces. Distinguishes chapter 55A expunction from an order of nondisclosure and from the Texas routes that issue without any petition. Nothing is filed, no pleading is generated, no prosecutor consent is claimed or predicted, and no court or agency is described as having acted.",
      notes:
        "Process guidance only, on the adopted ground that the article is outside the current LegalEase self-help scope: requires_negotiation on the prosecutor-recommendation route and individualized_advocacy on the appellate-acquittal route. Never generate a petition, motion, application or proposed order on this track, and never a draft for an attorney to adapt. Never state or predict that a prosecutor's office would recommend expunction, and never state that a court has acted or would exercise its discretion in a participant's favour. The universal attorney referral is content rather than a typed stop, so the assigned deliverable renders; typed stops are reserved for the discriminating answers. The mandatory trial-court acquittal route and the nondisclosure routes are separate routes in the Texas intake and are not prepared here."
    };
  })()
];
