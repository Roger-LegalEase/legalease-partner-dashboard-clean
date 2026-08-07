// Wisconsin process guidance — four routes, none of which the participant
// files anything on.
//
// Four assigned tracks, all `process_guidance` in the adopted design:
//
//   - `wi_exp_certificate_of_discharge` is administrative execution of an
//     expungement a judge already ordered. Under Wis. Stat. § 973.015(1m)(b),
//     on successful completion of the sentence the detaining or probationary
//     authority shall issue a certificate of discharge, forward it to the court
//     of record, and that certificate has the effect of expunging the record.
//     There is no petition and no separate court motion in the ordinary case.
//   - `wi_exp_942_08_mandatory` is the one place in § 973.015 where the
//     sentencing court has no discretion: for a violation of § 942.08(2)(b),
//     (c) or (d) or (3) committed by someone under 18, the court shall order
//     expungement at sentencing. This track detects the route, checks whether
//     the mandatory order was in fact entered, and refers where it was not.
//   - `wi_def_961_47` is court action in a live case. The court defers further
//     proceedings, and on fulfilment of the conditions discharges the person
//     and dismisses the proceedings without adjudication of guilt. Form CR-214
//     is court-generated through CCAP and is not a participant form. The value
//     is the explanation and the documented bridge into the DOJ fingerprint
//     removal route, which the non-conviction status is what unlocks.
//   - `wi_exp_trafficking_2m` is detection and referral. The § 973.015(2m)
//     motion is the only adult Wisconsin route that operates after sentencing,
//     and it turns on a contested evidentiary showing that must stay
//     participant-authored. No pleading is generated here and none is drafted.
//
// The Wisconsin fact that shapes every sheet: adult expungement had to be
// ordered at sentencing. State v. Matasek confines the decision to the
// sentencing proceeding and State v. Arberry forecloses reaching it afterwards
// through sentence modification. So the first question on the main track is the
// one that ends the matter for most people, and the design says to ask it first
// and answer it immediately rather than running a long intake to a dead end.
//
// Three things the design expressly leaves open, which no sheet here closes:
//
//   - Whether current § 973.015 carries a subsection (4) providing that an
//     expunged record is not a conviction for employment or licensing purposes.
//     That is a release blocker on the legal-effect warning, so no sheet here
//     tells a participant how to answer an employment or licensing question.
//   - Whether a criminal OWI conviction can be expunged under § 973.015. The
//     practitioner reading and the statutory text point opposite ways and the
//     design records it as a build blocker. The sheets state both readings,
//     choose neither, and stop the route.
//   - Whether § 973.015(1b) provides anything relevant. It was not read.
//
// One instruction is followed in substance rather than to the letter. The
// design says to quote the CR-266 warning language on the limits of
// expungement, on the ground that the state's own form is more credible than we
// are. CR-266 is an official source binary this job does not own and has not
// read, so its warning is described and attributed rather than quoted, and the
// participant is pointed at the form itself. Inventing a quotation from a form
// nobody here has read would be worse than describing it.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Wisconsin
// is not an enabled jurisdiction and this job does not enable one. The
// certificate-of-discharge follow-up letter, the CR-266 route and the two DOJ
// routes are other jobs and are untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** The two places a Wisconsin participant looks the case up. Named once. */
const WI_RECORD_CHECK =
  "Wisconsin Circuit Court Access, which is the public court record, and your own Wisconsin Department of Justice criminal history record from the Crime Information Bureau";

/** Free and low-cost Wisconsin help, named once so no stop is a dead end. */
const WI_LEGAL_HELP =
  "a Wisconsin legal aid office, a Wisconsin law school clinic, or a Wisconsin attorney";

/** Said on every route here. Nothing on these sheets reports a participant's case. */
const NOT_A_REPORT_ON_YOUR_CASE =
  "This page describes what the law does. It does not tell you what has happened in your case, and LegalEase has not looked. Treat the route as pending until you have checked for yourself.";

/** The Wisconsin fact that decides most cases before anything else does. */
const ORDERED_AT_SENTENCING_OR_NOTHING =
  "Wisconsin adult expungement had to be ordered by the judge at sentencing. That is not a formality and it is not something that can be picked up later: State v. Matasek confines the decision to the sentencing proceeding, and State v. Arberry forecloses reaching it afterwards through sentence modification. Where the judge did not order it, there is generally no later route, and you should know that now rather than after a long process.";

/** What expungement in Wisconsin does and does not reach. */
const EXPUNGEMENT_LIMITS =
  "Expungement in Wisconsin clears the public court record and leaves the state criminal history record in place. Under State v. Braunschweig it does not vacate the conviction, which remains provable; under State v. Leitner it does not require law enforcement agencies or prosecutors to destroy their records and does not stop a court considering the underlying facts when sentencing in another case; and the Department of Justice's position is that a conviction ordered expunged cannot be removed from the Wisconsin criminal history repository.";

/** The state's own form says the same thing, and says it better. */
const CR_266_WARNING =
  "The state's own expungement form, CR-266, carries a warning to the same effect on its face. Ask the clerk of circuit court for a copy and read that warning yourself. It is the Wisconsin court system describing the limits of its own remedy, and it is worth more than any description of it here.";

/** Written into the eligibility provision itself, so it belongs in the copy. */
const DOT_RECORDS_CARVE_OUT =
  "Driving records are outside this statute altogether. Section 973.015(1m)(a)1 says in terms that the subsection does not apply to information the Department of Transportation maintains about a conviction required to be included in a record kept under § 343.23(2)(a). An expungement of the court record does not touch the driving record, and nobody should tell you otherwise.";

/**
 * The release blocker on the legal-effect warning.
 *
 * The design will not say what a participant may tell an employer or a
 * licensing body, so neither will any sheet here.
 */
const EMPLOYMENT_QUESTION_UNSETTLED =
  "One thing this page will not tell you is how to answer an employment or licensing question about an expunged case. Whether § 973.015 carries a provision making an expunged record not a conviction for those purposes is unsettled in the work behind this sheet, and it has been left open rather than guessed at. Ask a lawyer before you answer such a question, and do not treat silence here as permission either way.";

/** Nothing on any of these four routes is a document the participant files. */
const NO_FILING_ON_THIS_ROUTE =
  "There is no petition, motion or application on this route for you to file, and LegalEase does not generate one. Where the body that owes the step has not taken it, the answer is to ask them and then to get advice — not to file something the statute does not provide for.";

const WI_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge, seal or remove anything, and cannot make a judge, a clerk of circuit court, the Department of Corrections, a detaining authority or the Department of Justice act.",
  "LegalEase cannot tell you whether a particular record qualifies. This page explains the mechanism; it is not legal advice and it is not an eligibility decision.",
  "LegalEase does not obtain, hold, inspect or authenticate your criminal history or your court file. You request your own copies and you read them.",
  "LegalEase has not contacted any court, clerk, agency or authority about your case, and has not filed anything for you.",
  "LegalEase cannot tell you when anything will happen. No period on this page is a promise about your case."
];

const WI_SOURCES: readonly string[] = [
  "Wis. Stat. § 973.015, special disposition, read at docs.legis.wisconsin.gov on 5 August 2026; certified through 2025 Wis. Act 247 and in effect on that date, with its history line ending at 2015 Wis. Act 366.",
  "Wis. Stat. § 973.015(1m)(a)1 and (a)2, § 973.015(1m)(b) and § 973.015(2m); Wis. Stat. §§ 942.08, 944.30, 971.30 and 343.23(2)(a).",
  "Wis. Stat. § 961.47, conditional discharge for possession or attempted possession as a first offence, read at docs.legis.wisconsin.gov on 5 August 2026; also §§ 961.41(3g)(b) and 961.48.",
  "State v. Matasek; State v. Arberry; State v. Braunschweig; State v. Leitner.",
  "Wisconsin Circuit Court Access; Wisconsin Department of Justice criminal background check information, at wisdoj.gov."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help entirely. */
export class WisconsinGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "WisconsinGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Wisconsin route. */
export class WisconsinRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string,
    readonly nextStep: string
  ) {
    super(reason);
    this.name = "WisconsinRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class WisconsinBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "WisconsinBranchError";
  }
}

export const WI_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Only a Wisconsin record is reached by any of these four routes. */
export const WI_RECORD_JURISDICTIONS: Readonly<Record<string, boolean>> = {
  wisconsin: true,
  another_state: false,
  federal: false,
  tribal: false
};

/**
 * Whether the sentence carried supervision or confinement.
 *
 * The certificate of discharge exists because there is a detaining or
 * probationary authority to issue it. A sentence with neither runs on CR-266,
 * which is a different track.
 */
export const WI_SENTENCE_TYPES: Readonly<Record<string, string>> = {
  probation: "certificate",
  jail: "certificate",
  prison: "certificate",
  fine_or_costs_only: "cr266"
};

/**
 * Whether the conviction is one the OWI open question bites on.
 *
 * The design records two readings that produce opposite answers and refuses to
 * choose. So this list exists to detect the question, not to answer it.
 */
export const WI_OWI_ANSWERS: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new WisconsinBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualised legal judgment. This guidance explains the mechanism; it does not decide eligibility, and LegalEase will not pretend otherwise.";

const OUT_OF_JURISDICTION_STOP =
  "No Wisconsin statute reaches a federal, tribal or out-of-state record. Relief, if any, lies under the law of the authority that holds it, and none of these four Wisconsin routes touches it.";

const IMMIGRATION_STOP =
  "Immigration consequences are governed by federal law and no Wisconsin expungement, discharge or dismissal reaches them. A Wisconsin disposition that is not a conviction for state purposes may still matter federally.";

const TRAFFICKING_ROUTE = "the Wisconsin trafficking-survivor route under § 973.015(2m)";

/**
 * Validates participant answers and routes to the correct Wisconsin node.
 *
 * The order is the design's. The eligibility-advice boundary first; then record
 * jurisdiction and immigration, which are stop conditions on all four assigned
 * tracks; then the trafficking screen, because the design routes any trafficking
 * or prostitution fact pattern arising anywhere in Wisconsin to the § 973.015(2m)
 * node and says to do it on a single non-graphic question; then the route's own
 * questions, with the at-sentencing question first on the tracks that turn on it.
 *
 * Fails closed on any answer outside a closed list. Every stop and every
 * mismatch carries a reason, a destination and the next step to take there.
 */
export function deriveWisconsinGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Gate 1. Nobody is served an eligibility opinion by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", WI_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new WisconsinGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      WI_LEGAL_HELP,
      "Take the judgment of conviction and your criminal history record to one of them and ask about your own case."
    );
  }

  // Gate 2. Record jurisdiction, a stop condition on all four assigned tracks.
  const jurisdiction = branch(trackId, "recordJurisdiction", WI_RECORD_JURISDICTIONS, facts.recordJurisdiction);
  if (!jurisdiction.resolved) {
    throw new WisconsinRouteMismatchError(
      trackId,
      "record_is_not_a_wisconsin_record",
      OUT_OF_JURISDICTION_STOP,
      "the state, federal or tribal authority that holds the record",
      "Take the record to that authority and ask what it provides. If you also hold Wisconsin records, those are handled separately and only those are served here."
    );
  }

  // Gate 3. Immigration exposure.
  const immigration = branch(trackId, "immigrationQuestion", WI_YES_NO, facts.immigrationQuestion);
  if (immigration.resolved) {
    throw new WisconsinGuidanceStopError(
      trackId,
      "immigration_consequences_in_play",
      IMMIGRATION_STOP,
      "an immigration attorney",
      "Speak to an immigration attorney about the record before you rely on anything on this route."
    );
  }

  // Gate 4. The trafficking screen. One non-graphic question, asked everywhere,
  // because the design routes any such fact pattern to the § 973.015(2m) node
  // and forbids asking for details.
  const trafficking = branch(trackId, "traffickingConnection", WI_YES_NO, facts.traffickingConnection);
  if (trackId !== "wi_exp_trafficking_2m" && trafficking.resolved) {
    throw new WisconsinRouteMismatchError(
      trackId,
      "trafficking_or_exploitation_fact_pattern",
      "Where a Wisconsin case was connected to trafficking, coercion or exploitation, the adopted design routes it to § 973.015(2m) rather than to the route you are on. That is not a smaller answer: it is the only adult Wisconsin route that works after sentencing.",
      TRAFFICKING_ROUTE,
      "Read that sheet. You will not be asked for any detail about what happened, here or there."
    );
  }
  if (trackId === "wi_exp_trafficking_2m" && !trafficking.resolved) {
    throw new WisconsinRouteMismatchError(
      trackId,
      "no_trafficking_connection_to_route",
      "This node exists for a case connected to trafficking, coercion or exploitation. Without that connection there is nothing here to route, and the other Wisconsin routes are the ones to look at.",
      "the Wisconsin expungement and conditional-discharge routes",
      "Go back to the Wisconsin intake and answer the questions for the disposition the case actually had."
    );
  }

  if (trackId === "wi_exp_trafficking_2m") {
    const offence = branch(trackId, "offenceIs94430", WI_YES_NO, facts.offenceIs94430);
    if (!offence.resolved) {
      throw new WisconsinRouteMismatchError(
        trackId,
        "offence_is_not_a_section_944_30_violation",
        "Section 973.015(2m) reaches a violation of § 944.30 and nothing else. Another charge, however it arose, is not within the subsection.",
        WI_LEGAL_HELP + ", and a Wisconsin survivor-services organisation",
        "Take the charge to one of them and ask what Wisconsin routes reach it. This sheet is about one subsection and one offence."
      );
    }
    return derived;
  }

  if (trackId === "wi_exp_certificate_of_discharge") {
    const sentencingDone = branch(trackId, "sentencingHasHappened", WI_YES_NO, facts.sentencingHasHappened);
    if (!sentencingDone.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "sentencing_has_not_yet_happened",
        "Whether expungement is ordered is decided at sentencing, so before sentencing this is a criminal-defence question about what to ask the judge for. That is a different kind of help from record clearing and the adopted scope does not reach it.",
        "the lawyer representing you in the criminal case, or " + WI_LEGAL_HELP,
        "Raise expungement with your defence lawyer before sentencing. It is the one moment at which it can be asked for."
      );
    }

    const ordered = branch(
      trackId,
      "expungementOrderedAtSentencing",
      WI_YES_NO,
      facts.expungementOrderedAtSentencing
    );
    if (!ordered.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "expungement_was_not_ordered_at_sentencing",
        "Wisconsin adult expungement had to be ordered by the judge at sentencing. Where it was not, there is generally no later route: State v. Matasek confines the decision to the sentencing proceeding and State v. Arberry forecloses reaching it afterwards through sentence modification. You are being told this now rather than at the end of a long process.",
        "the Wisconsin Department of Justice record-correction route, Wisconsin fair-employment protections, and a pardon referral, through " + WI_LEGAL_HELP,
        "Ask about those three. They are not the same as expungement and this sheet is not pretending they are, but they are what remains and they are worth asking about."
      );
    }

    const owi = branch(trackId, "convictionIsOwi", WI_OWI_ANSWERS, facts.convictionIsOwi);
    if (owi.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "conviction_is_an_intoxicated_driving_offence",
        "Whether a criminal intoxicated-driving conviction can be expunged under § 973.015 is genuinely unsettled. Practitioner commentary says such offences may not be expunged; the only intoxicated-driving text in the eligibility provision is the Department of Transportation records carve-out, which preserves the driving record rather than barring expungement of the court record. Those two readings produce opposite answers and this page does not choose between them.",
        WI_LEGAL_HELP,
        "Take the judgment of conviction to one of them and ask which reading applies to your case. Do not act on either reading on the strength of this page."
      );
    }

    const offenceClass = branch(trackId, "offenceClassKnown", WI_YES_NO, facts.offenceClassKnown);
    if (!offenceClass.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "offence_class_or_violent_offence_question",
        "Whether a felony is a Class H or a Class I, and whether an offence counts as violent, decides eligibility under § 973.015 and cannot be worked out from a participant's description of the charge. It needs an offence-class lookup against the statute rather than an estimate.",
        WI_LEGAL_HELP,
        "Take the judgment of conviction, which names the statute and the class, to one of them and ask before you rely on any eligibility reading."
      );
    }

    const sentenceType = branch(trackId, "sentenceType", WI_SENTENCE_TYPES, facts.sentenceType);
    if (sentenceType.resolved === "cr266") {
      throw new WisconsinRouteMismatchError(
        trackId,
        "sentence_carried_neither_supervision_nor_confinement",
        "The certificate of discharge exists because there is a detaining or probationary authority to issue it. A sentence of a fine or costs alone has neither, and execution of the expungement runs through the CR-266 route instead.",
        "the Wisconsin CR-266 expungement-execution route",
        "Go back to the Wisconsin intake and answer the questions for a sentence that carried no probation, jail or prison."
      );
    }
    derived.executionRoute = sentenceType.resolved;

    const revoked = branch(trackId, "probationRevoked", WI_YES_NO, facts.probationRevoked);
    if (revoked.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "probation_was_revoked",
        "Successful completion is what the statute turns on, and revocation is one of the two facts that destroy the expungement entirely. Whether a particular revocation has that effect on a particular sentence is a legal question, not a checkbox.",
        WI_LEGAL_HELP,
        "Take the revocation order and the judgment of conviction to one of them and ask what they mean for the expungement the judge ordered."
      );
    }

    const subsequent = branch(trackId, "subsequentConviction", WI_YES_NO, facts.subsequentConviction);
    if (subsequent.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "subsequent_conviction_before_completion",
        "The statute defines successful completion as including that the person has not been convicted of a subsequent offense. A conviction before completion is the other of the two facts that destroy the expungement entirely, and whether a particular one counts is a legal question.",
        WI_LEGAL_HELP,
        "Take both judgments to one of them and ask what the later case means for the expungement the judge ordered on the earlier one."
      );
    }
    return derived;
  }

  if (trackId === "wi_exp_942_08_mandatory") {
    const sentencingDone = branch(trackId, "sentencingHasHappened", WI_YES_NO, facts.sentencingHasHappened);
    if (!sentencingDone.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "sentencing_has_not_yet_happened",
        "The mandatory order under § 973.015(1m)(a)2 is made at sentencing. Before sentencing this is a criminal-defence question about making sure the court is told the provision applies, and the adopted scope does not reach that stage.",
        "the lawyer representing you in the criminal case, or " + WI_LEGAL_HELP,
        "Tell your defence lawyer that § 973.015(1m)(a)2 may apply, before sentencing. It is the only place in the section where the court has no discretion."
      );
    }

    const offence = branch(trackId, "offenceIs94208", WI_YES_NO, facts.offenceIs94208);
    if (!offence.resolved) {
      throw new WisconsinRouteMismatchError(
        trackId,
        "offence_is_not_a_section_942_08_violation",
        "The mandatory provision reaches a violation of § 942.08(2)(b), (c) or (d) or (3) and nothing else. Any other offence runs on the ordinary discretionary route, where the judge decides at sentencing.",
        "the Wisconsin certificate-of-discharge route under § 973.015(1m)(b)",
        "Go back to the Wisconsin intake and answer the questions for an expungement the judge ordered at sentencing in the ordinary way."
      );
    }

    const under18 = branch(trackId, "ageUnder18AtOffence", WI_YES_NO, facts.ageUnder18AtOffence);
    if (!under18.resolved) {
      throw new WisconsinRouteMismatchError(
        trackId,
        "person_was_18_or_older_at_the_offence",
        "This provision uses a different age threshold from the rest of § 973.015: under 18 at the time of the offence, not the general under-25 rule. At 18 or older the mandatory route does not apply and the ordinary discretionary route is the one to look at.",
        "the Wisconsin certificate-of-discharge route under § 973.015(1m)(b)",
        "Go back to the Wisconsin intake and answer the questions for the ordinary route, where the judge decides at sentencing."
      );
    }

    const ordered = branch(
      trackId,
      "expungementOrderedAtSentencing",
      WI_YES_NO,
      facts.expungementOrderedAtSentencing
    );
    if (!ordered.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "mandatory_order_was_not_entered_at_sentencing",
        "Where § 973.015(1m)(a)2 applied and the court did not order expungement at sentencing, that is a grievance about a duty rather than disappointment at a discretionary refusal. It is the one situation on this family of tracks where a lawyer has something concrete to work with, and it is not a self-help fix.",
        WI_LEGAL_HELP,
        "Take the judgment of conviction, and the sentencing transcript or minutes if the judgment is silent, to one of them and say that you believe the order was mandatory."
      );
    }

    const subsequent = branch(trackId, "subsequentConviction", WI_YES_NO, facts.subsequentConviction);
    const revoked = branch(trackId, "probationRevoked", WI_YES_NO, facts.probationRevoked);
    if (subsequent.resolved || revoked.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "completion_is_in_dispute_after_a_revocation_or_a_later_conviction",
        "A revocation or a conviction before completion are the two facts that destroy an ordered expungement, and they do so on the mandatory route as on the discretionary one. Whether a particular one has that effect is a legal question.",
        WI_LEGAL_HELP,
        "Take the judgment of conviction and the revocation or later judgment to one of them and ask what they mean for the order the court made."
      );
    }
    return derived;
  }

  if (trackId === "wi_def_961_47") {
    const notYet = branch(trackId, "caseStillBeingDecided", WI_YES_NO, facts.caseStillBeingDecided);
    if (notYet.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "plea_or_sentencing_has_not_yet_happened",
        "Consenting to a § 961.47 deferral is a criminal-defence decision taken in a live case, with the accused's consent, and LegalEase does not advise on it.",
        "the lawyer representing you in the criminal case, or " + WI_LEGAL_HELP,
        "Ask your defence lawyer about § 961.47. This sheet is about what a completed conditional discharge means, not about whether to agree to one."
      );
    }

    const deferred = branch(trackId, "deferredJudgmentGranted", WI_YES_NO, facts.deferredJudgmentGranted);
    if (!deferred.resolved) {
      throw new WisconsinRouteMismatchError(
        trackId,
        "the_court_convicted_rather_than_deferring",
        "Section 961.47 works by the court deferring further proceedings without entering a judgment of guilt. Where the court convicted, this is not the section that applies, whatever happened to the case afterwards.",
        "the Wisconsin expungement routes under § 973.015",
        "Go back to the Wisconsin intake and answer the questions for a conviction. Check the judgment first: people describe this disposition inaccurately in both directions."
      );
    }

    const possession = branch(trackId, "chargeWasPossession", WI_YES_NO, facts.chargeWasPossession);
    if (!possession.resolved) {
      throw new WisconsinRouteMismatchError(
        trackId,
        "charge_was_not_possession_or_attempted_possession",
        "Section 961.47 reaches possession or attempted possession under § 961.41(3g)(b). A different charge is outside the section even where the court deferred proceedings on some other basis.",
        WI_LEGAL_HELP,
        "Take the charging document and the court's order to one of them and ask which provision the deferral was made under."
      );
    }

    const priorDrug = branch(
      trackId,
      "priorControlledSubstanceOffence",
      WI_YES_NO,
      facts.priorControlledSubstanceOffence
    );
    if (priorDrug.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "prior_controlled_substance_conviction",
        "The section is confined to a person who has not previously been convicted of an offence under ch. 961, or of any statute of the United States or of any state, or any county ordinance, relating to controlled substances or controlled substance analogs, narcotic drugs, marijuana, or stimulant, depressant or hallucinogenic drugs. A prior conviction of that kind puts the case outside it.",
        WI_LEGAL_HELP,
        "Take both records to one of them and ask what the earlier conviction means for the disposition in this case."
      );
    }

    const priorDischarge = branch(
      trackId,
      "priorConditionalDischarge",
      WI_YES_NO,
      facts.priorConditionalDischarge
    );
    if (priorDischarge.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "an_earlier_discharge_and_dismissal_under_the_section_exists",
        "Section 961.47 says there may be only one discharge and dismissal under the section with respect to any person. Where one has already happened, what the second case is depends on facts a page cannot check.",
        WI_LEGAL_HELP,
        "Take the records of both cases to one of them and ask what the once-per-lifetime limit means here."
      );
    }

    const conditions = branch(trackId, "conditionsFulfilled", WI_YES_NO, facts.conditionsFulfilled);
    if (!conditions.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "terms_and_conditions_not_fulfilled",
        "The discharge and dismissal follow fulfilment of the terms and conditions of the probation the court imposed. Until they are fulfilled the case is still running, and where a term was violated and the court entered an adjudication of guilt the section's benefit is gone.",
        "the probation agent supervising the case, and then " + WI_LEGAL_HELP,
        "Ask the agent what the court still has outstanding, and ask a lawyer if an adjudication of guilt has already been entered."
      );
    }

    const discharged = branch(
      trackId,
      "dischargeAndDismissalEntered",
      WI_YES_NO,
      facts.dischargeAndDismissalEntered
    );
    if (!discharged.resolved) {
      throw new WisconsinGuidanceStopError(
        trackId,
        "discharge_and_dismissal_has_not_been_entered",
        "The non-conviction status this route turns on arrives with the court's discharge and dismissal. Until that order is on the record there is nothing to carry into the Department of Justice removal route, and this sheet is describing something that has not happened yet.",
        "the clerk of circuit court in the county where the case was heard",
        "Ask the clerk whether the order discharging you and dismissing the proceedings has been entered, and come back to this sheet once it has."
      );
    }
    derived.eligibleForDojHandoff = true;
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
      "There is nothing to submit and nothing for LegalEase to file. No petition, motion or application exists on this route, so none is generated.",
    fees:
      input.fees ??
      "None for the step this page describes. A Wisconsin Department of Justice background check, where you choose to obtain one, carries its own fee; ask the Department what it is rather than relying on a figure here.",
    feeWaiver: input.feeWaiver ?? "Not applicable. There is no court fee on this route because there is no filing.",
    noticeOrService: input.noticeOrService ?? [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody is required to write and tell you when the step this page describes has been taken, which is why this packet tells you to go and check."
    ],
    expectedNextStage: input.expectedNextStage,
    legalEaseCanPrepare: input.canPrepare,
    legalEaseCannotPerform: [...WI_CANNOT_PERFORM, ...(input.extraCannotPerform ?? [])],
    escalationTriggers: [
      "You want advice about whether a particular record qualifies.",
      "The record is a federal, tribal or out-of-state record.",
      "Your immigration status could be affected by the record.",
      ...input.escalations
    ],
    officialSourceReferences: WI_SOURCES
  };
}

/** True of the § 973.015 execution routes, and stated only on those sheets. */
const CANNOT_ISSUE_THE_CERTIFICATE =
  "LegalEase cannot issue a certificate of discharge. The statute puts that on the detaining or probationary authority, and it is their document rather than ours.";

const CLERK_AND_DOJ = {
  name: "The clerk of circuit court for the county of the case, and the Wisconsin Department of Justice Crime Information Bureau",
  detail:
    "The clerk holds the court file and the judgment of conviction, and Wisconsin Circuit Court Access is the public face of that record. The Department of Justice holds the state criminal history record and will provide you your own copy for a fee. LegalEase contacts neither and reads neither."
};

export const WISCONSIN_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  // ---- wi_exp_certificate_of_discharge -------------------------------------
  "wi-cod-eligibility-verification": sheet({
    templateId: "wi-cod-eligibility-verification",
    mechanismName: "Wisconsin expungement: the one question that decides it, and how to answer it from the record",
    whyNotAFiling:
      "Nothing is filed by you. Under Wis. Stat. § 973.015(1m)(b) the detaining or probationary authority issues a certificate of discharge on successful completion of the sentence and forwards it to the court of record, and that certificate has the effect of expunging the record. There is no petition and no separate court motion in the ordinary case, so none is generated here.",
    processType: "agency",
    prerequisites: [
      "The case is a Wisconsin case and you have been sentenced in it.",
      "You can get hold of the judgment of conviction, and the sentencing transcript or minutes if the judgment is silent.",
      "You are prepared for the answer to be no. For most Wisconsin adults with a conviction, it is."
    ],
    documentsToObtain: [
      "The judgment of conviction from the clerk of circuit court for the county of conviction, and the sentencing transcript or minutes where the judgment does not say. This is where an at-sentencing expungement order appears, and it is the only place it appears.",
      `A look at ${WI_RECORD_CHECK}.`
    ],
    gather: [
      "Whether the judge said at sentencing that the record would be expunged once you completed the sentence. Take this from the judgment, not from memory.",
      "How old you were when the offence happened. The general rule turns on being under 25 at the time of the offence.",
      "The case number and the Wisconsin county the case was in.",
      "The statute the charge was brought under, and its class, as the judgment states them.",
      "Whether the sentence included probation, jail or prison, or only a fine and costs. That decides which route executes the expungement.",
      "Whether the case still shows on Wisconsin Circuit Court Access, and the date you last looked."
    ],
    destination: CLERK_AND_DOJ,
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      ORDERED_AT_SENTENCING_OR_NOTHING,
      "So start with the judgment of conviction. If it records an order that the record be expunged on successful completion of the sentence, this route is open to you. If it is silent, ask the clerk for the sentencing transcript or the minutes, because the order is sometimes made orally and recorded there.",
      "Do not answer this question from memory, and do not let anyone answer it for you from memory. It is the question the whole route turns on and the record is the only thing that settles it.",
      "Where the answer is no, this page has done its job by telling you now. What remains is worth asking about: the Department of Justice record-correction route where the criminal history record is wrong, Wisconsin fair-employment protections, and whether a pardon is realistic. None of those is expungement and this page is not pretending they are.",
      "Where the answer is yes, the next question is how the expungement gets executed. A sentence that included probation, jail or prison runs through a certificate of discharge, which is what the rest of this packet is about. A sentence of a fine or costs alone runs through the CR-266 route, which is a separate LegalEase track.",
      "One eligibility point needs a lookup rather than a guess: whether a felony is a Class H or a Class I, and whether the offence counts as violent. Those decide eligibility under the section and they are read off the statute, not estimated from the charge's name.",
      "Ask the clerk for a certified copy of the judgment rather than a photocopy. Everything downstream on this route is read off it, and asking twice costs more than asking once.",
      DOT_RECORDS_CARVE_OUT,
      NO_FILING_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "If the judgment records an at-sentencing expungement order and the sentence carried probation, jail or prison, the completion sheet in this packet is next. If it does not, the honest answer is that this route is closed and the alternatives named above are what remain.",
    canPrepare: [
      "This explanation of the at-sentencing rule and why it decides the matter.",
      "A plain list of what to ask the clerk for and where the order would appear.",
      "The completion, verification and effect sheets that follow in this packet."
    ],
    extraCannotPerform: [CANNOT_ISSUE_THE_CERTIFICATE],
    escalations: [
      "The judgment is silent and the clerk cannot produce the sentencing transcript or minutes.",
      "You believe the judge said it and the record does not show it.",
      "You need to know whether the felony was a Class H or a Class I, or whether the offence counts as violent."
    ]
  }),

  "wi-cod-completion-verification": sheet({
    templateId: "wi-cod-completion-verification",
    mechanismName: "Successful completion, as Wisconsin defines it rather than as it sounds",
    whyNotAFiling:
      "This page explains a statutory definition and how to check it against the record. Nothing on it is filed, and § 973.015(1m)(b) provides no participant application for LegalEase to prepare.",
    processType: "agency",
    prerequisites: [
      "The judgment of conviction records that expungement was ordered at sentencing.",
      "The sentence included probation, jail or prison, so there is a detaining or probationary authority to issue the certificate.",
      "You have read the sheet that comes before this one in the packet."
    ],
    documentsToObtain: [
      "Proof of discharge from probation or confinement, from the Department of Corrections or the detaining authority: the documentation showing the sentence terms were completed and probation was not revoked.",
      "The judgment of conviction, which sets out the sentence the completion is measured against."
    ],
    gather: [
      "The date you finished the sentence, including any probation term.",
      "Whether probation was ever revoked, on this case.",
      "Whether you were convicted of any other offence before you finished this sentence.",
      "Who supervised the probation, or which facility held you. That authority is the one that issues the certificate.",
      "Whether every condition of probation was satisfied, and anything that was not."
    ],
    destination: {
      name: "The detaining or probationary authority — in most probation cases the Wisconsin Department of Corrections",
      detail:
        "The statute puts the issuing duty on the supervising or detaining authority, and the certificate it issues is what has the effect of expunging the record once it reaches the clerk. Nothing is submitted by you, and LegalEase cannot complete the certificate."
    },
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "The statute defines successful completion rather than leaving it to ordinary meaning. A person has successfully completed the sentence if the person has not been convicted of a subsequent offense and, if on probation, the probation has not been revoked and the probationer has satisfied the conditions of probation.",
      "Two of those are hard facts and they are the two that destroy the expungement outright: a revocation, and a conviction before completion. Neither is something this page can assess for you, and neither is something to guess about.",
      "Check the third against the discharge documentation rather than against your memory of what the agent said. Conditions of probation are itemised somewhere, and 'I think I did everything' is not the same as the file showing it.",
      "Get the discharge documentation from the Department of Corrections or the detaining authority in writing. It is the document that shows the completion the certificate depends on, and it is the first thing anyone will ask you for later.",
      "Identify the authority by name while you are at it. The certificate is theirs to issue and theirs to forward, so knowing who they are is the difference between a phone call and a search.",
      "Nothing about completion is something you file. If the terms were completed, the duty to issue the certificate is the authority's; the next sheet in this packet is about checking whether they did.",
      NO_FILING_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "With the discharge documentation in hand and the two hard facts confirmed, the verification sheet in this packet is how you find out whether the certificate was issued and whether it reached the court.",
    canPrepare: [
      "This explanation of what successful completion means in the statute.",
      "A list of what to ask the supervising or detaining authority for.",
      "A plain statement of the two facts that end the route, so you are not surprised by them later.",
      "The verification sheet that follows it in this packet."
    ],
    extraCannotPerform: [CANNOT_ISSUE_THE_CERTIFICATE],
    escalations: [
      "Probation was revoked, or you were convicted of something before completion.",
      "The Department of Corrections will not give you discharge documentation.",
      "You cannot tell from anything you hold whether every condition was satisfied."
    ]
  }),

  "wi-cod-status-verification": sheet({
    templateId: "wi-cod-status-verification",
    mechanismName: "Checking whether the Wisconsin certificate of discharge issued and reached the court",
    whyNotAFiling:
      "This is a plan for checking a public record and asking two offices a question. Nothing on it is filed. Where the certificate was never issued or never forwarded, the written request is prepared on a separate LegalEase track, not on this one.",
    processType: "agency",
    prerequisites: [
      "The judgment records an at-sentencing expungement order and the sentence has been completed.",
      "You have read the eligibility and completion sheets that come before this one in the packet."
    ],
    documentsToObtain: [
      "Proof of discharge from probation or confinement, if you have not already obtained it.",
      `A dated look at ${WI_RECORD_CHECK}, kept with the date you looked.`
    ],
    gather: [
      "The case number and the county, so the clerk can find the file.",
      "The date the sentence was completed.",
      "The name of the supervising agent or the detaining authority.",
      "What Wisconsin Circuit Court Access showed, and the date you looked.",
      "The date of each enquiry you make, so you can tell one from another."
    ],
    destination: CLERK_AND_DOJ,
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Look the case up on Wisconsin Circuit Court Access first. It is free, it is the public face of the court record, and it is the quickest way to see whether the case is still publicly visible.",
      "Then ask the clerk of circuit court two things: whether a certificate of discharge has been received on the case, and whether the record has come off public access. Those are two different questions and the second does not always follow the first immediately.",
      "If the clerk has not received it, ask the supervising or detaining authority whether the certificate was issued and when it was forwarded. That authority is where the duty sits.",
      "Write down what each office told you and the date. Nothing is sent to you when a record is expunged, so those dated notes are the whole of what you will hold.",
      "Where the record is still publicly visible and the certificate appears not to have issued or not to have been forwarded, the next step is a written request to the authority or the clerk. LegalEase prepares that request on a separate track; it is not part of this sheet and nothing on this sheet is a filing.",
      "Do not read a delay as a refusal. Nothing on this page tells you how long any of this takes, because nobody has told us.",
      "Commercial background-check companies keep their own copies and refresh them on their own schedules, so a vendor's report can lag the court record by months. That is a problem with the vendor, and it is not what an expungement is for.",
      NO_FILING_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "Either the case has come off public access, in which case read the effect sheet before you decide what that means for you, or it has not, in which case the written request to the authority or the clerk is the next thing — and it is a separate LegalEase track.",
    canPrepare: [
      "This verification plan and the two questions to put to the clerk.",
      "The list of what to record and when to record it.",
      "A plain statement of where the written follow-up request is prepared, which is not on this track.",
      "The effect sheet that follows it in this packet."
    ],
    extraCannotPerform: [
      CANNOT_ISSUE_THE_CERTIFICATE,
      "LegalEase does not prepare the written follow-up request on this track. That request is a participant's own letter and it is produced on a separate LegalEase track, so that a document you can send is never hidden inside a route that files nothing."
    ],
    escalations: [
      "The clerk says no certificate has been received and the authority says one was sent.",
      "The certificate was received and the case is still publicly visible months later.",
      "Nobody at the supervising authority can tell you whether the certificate was issued."
    ]
  }),

  "wi-cod-legal-effect": sheet({
    templateId: "wi-cod-legal-effect",
    mechanismName: "What Wisconsin expungement does, and the four places it stops",
    whyNotAFiling:
      "This page explains the effect of an administrative act. Nothing on it is filed and § 973.015 provides nothing on this route for a participant to submit.",
    processType: "agency",
    prerequisites: [
      "You have read the sheets that come before this one in the packet.",
      "You are prepared to hear what expungement does not do as well as what it does."
    ],
    documentsToObtain: [
      `A copy of your own Wisconsin Department of Justice criminal history record, so what follows is read against your actual record rather than in the abstract.`,
      "Form CR-266 from the clerk of circuit court, which carries the state's own warning about the limits of expungement on its face."
    ],
    gather: [
      "What Wisconsin Circuit Court Access showed when you last looked, and the date.",
      "What your Department of Justice criminal history record shows.",
      "Whether anything you are applying for asks about convictions, and in what words.",
      "Whether a driving record matters to what you are trying to do."
    ],
    destination: {
      name: "The Wisconsin circuit court record, with the state criminal history record retained by the Department of Justice",
      detail:
        "Expungement clears the public court record. The Department of Justice keeps the state criminal history record, and the Department of Transportation keeps the driving record. Nothing on this route is submitted by you at any stage."
    },
    sequence: [
      EXPUNGEMENT_LIMITS,
      CR_266_WARNING,
      DOT_RECORDS_CARVE_OUT,
      "So the accurate description is that the public court record is cleared and the rest of the state's records are not. That is worth having — Wisconsin Circuit Court Access is what most people actually look at — and it is a long way short of the record ceasing to exist.",
      EMPLOYMENT_QUESTION_UNSETTLED,
      "The same caution applies to anything you have read elsewhere about expunged records and job applications. This page is not withholding an answer for effect; the answer has genuinely not been settled in the work behind it, and saying so is better than guessing.",
      "Nothing here says a record has been expunged or has not been. It describes what the mechanism does, and the verification sheet in this packet is the only thing that tells you where your own case stands.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing which record expungement reaches, which three it does not, and which question about it has been left open rather than answered.",
    canPrepare: [
      "This explanation of what expungement reaches and where it stops.",
      "The pointer to the state's own warning on CR-266.",
      "A plain statement of the question about employment and licensing that has been left open."
    ],
    extraCannotPerform: [CANNOT_ISSUE_THE_CERTIFICATE],
    escalations: [
      "An employment or licensing form asks about convictions and you do not know how to answer it.",
      "Your Department of Justice criminal history record still shows the case and you expected it not to.",
      "A driving record matters to what you are trying to do."
    ]
  }),

  // ---- wi_exp_942_08_mandatory ---------------------------------------------
  "wi-942-08-eligibility-verification": sheet({
    templateId: "wi-942-08-eligibility-verification",
    mechanismName: "The one Wisconsin expungement the sentencing court has no discretion to refuse",
    whyNotAFiling:
      "Nothing is filed by you. Section 973.015(1m)(a)2 requires the court to order at sentencing that the record be expunged on successful completion, where the offence was a violation of § 942.08(2)(b), (c) or (d) or (3) and the person was under 18 when it was committed. The order is the court's and the execution runs through a certificate of discharge or the CR-266 route, so nothing is generated here.",
    processType: "court_adjacent",
    prerequisites: [
      "The offence was a violation of Wis. Stat. § 942.08 — an invasion of privacy offence.",
      "You were under 18 when the offence was committed.",
      "Sentencing has happened, and you can get hold of the judgment of conviction."
    ],
    documentsToObtain: [
      "The judgment of conviction from the clerk of circuit court, and the sentencing transcript or minutes where the judgment is silent. This establishes both the offence charged and whether the mandatory order was entered.",
      `A look at ${WI_RECORD_CHECK}.`
    ],
    gather: [
      "The statute and subsection the charge was brought under, as the judgment states them.",
      "Your date of birth and the date of the offence, so the under-18 question is answered from dates rather than recollection.",
      "Whether the judgment records an order that the record be expunged on successful completion.",
      "The case number and the Wisconsin county the case was in.",
      "Whether the sentence included probation, jail or prison."
    ],
    destination: {
      name: "The Wisconsin circuit court of the original case, and the detaining or probationary authority where there was one",
      detail:
        "The order is mandatory at sentencing. Execution then runs the ordinary way: a certificate of discharge issued by the supervising or detaining authority, or a CR-266 filing where the sentence carried neither probation nor incarceration. You file nothing on this track."
    },
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody writes to tell you whether the mandatory order was made, or whether it later took effect. Both are things you have to go and look for, and this packet is about how.",
      "That is as true where the order was not made as where it was. A court does not write to explain an omission, which is why the escalation sheet in this packet exists."
    ],
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "This provision is different from the rest of § 973.015 in two ways worth knowing. The age threshold is under 18 at the time of the offence, not the general under-25 rule. And it is the only place in the section where the sentencing court has no discretion: the statute says the court shall order it.",
      "Confirm the offence first, from the judgment. The provision reaches a violation of § 942.08(2)(b), (c) or (d) or (3), and those subsections are specific. An invasion-of-privacy charge under a different subsection is not automatically within it.",
      "Then confirm the age from dates rather than from memory: your date of birth against the date of the offence, as the charging document states it.",
      "Then look for the order itself in the judgment. Mandatory does not mean automatic in practice — the court still has to make the order, and the question this track asks is whether it did.",
      "Where the order is there, the route is the ordinary one and the next sheet tells you how to check whether it took effect.",
      "Where the order is not there and this provision applied, that is a grievance about a duty rather than disappointment at a discretionary refusal. That distinction matters, and the escalation sheet in this packet says what to do with it.",
      "Keep the charging document as well as the judgment. The judgment often names the statute without the subsection, and it is the subsection that decides whether this provision applied at all.",
      "Ask the clerk for a certified copy while you are there, rather than a photocopy. A certified copy is what anyone you take this to afterwards will want to see, and asking twice costs more than asking once.",
      DOT_RECORDS_CARVE_OUT,
      NO_FILING_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "Either the judgment records the mandatory order, in which case the verification sheet is next, or it does not, in which case the escalation sheet in this packet is.",
    canPrepare: [
      "This explanation of the mandatory provision and of its two differences from the general rule.",
      "A plain list of what to check in the judgment and in what order.",
      "The verification sheet and the escalation sheet that follow it in this packet."
    ],
    escalations: [
      "The judgment does not name the subsection of § 942.08 the charge was under.",
      "The dates are close enough to eighteen that the answer is not obvious.",
      "The judgment is silent about expungement and no transcript can be produced."
    ]
  }),

  "wi-942-08-status-verification": sheet({
    templateId: "wi-942-08-status-verification",
    mechanismName: "Checking whether a mandatory Wisconsin expungement took effect",
    whyNotAFiling:
      "This is a plan for checking a public record and asking the clerk a question. Nothing on it is filed and no participant application exists on this route for LegalEase to prepare.",
    processType: "court_adjacent",
    prerequisites: [
      "The judgment records the mandatory expungement order.",
      "The sentence has been completed.",
      "You have read the sheet that comes before this one in the packet."
    ],
    documentsToObtain: [
      "The judgment of conviction, and proof of discharge from probation or confinement where the sentence carried either.",
      `A dated look at ${WI_RECORD_CHECK}.`
    ],
    gather: [
      "The case number and the county.",
      "The date the sentence was completed.",
      "What Wisconsin Circuit Court Access showed, and the date you looked.",
      "Who supervised the probation or held you, where the sentence carried either."
    ],
    destination: CLERK_AND_DOJ,
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Look the case up on Wisconsin Circuit Court Access. That is the public court record and it is free to search.",
      "Ask the clerk of circuit court whether the expungement has taken effect on the case, and if the sentence carried probation or confinement, whether a certificate of discharge was received.",
      "Where the sentence carried neither, execution runs through the CR-266 route rather than a certificate, and that is a separate LegalEase track with its own packet.",
      "Write down what you were told and the date. Nothing is sent to you when a record is expunged.",
      EXPUNGEMENT_LIMITS,
      "So a case that has come off Wisconsin Circuit Court Access has had the thing this route delivers. It has not had more than that, and the effect described above is what to expect.",
      NO_FILING_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "Either the case has come off public access, or it has not and the question is why — which is the clerk's answer to give, not something to file about.",
    canPrepare: [
      "This verification plan and the questions to put to the clerk.",
      "The list of what to record and when.",
      "The escalation sheet that follows it in this packet."
    ],
    extraCannotPerform: [CANNOT_ISSUE_THE_CERTIFICATE],
    escalations: [
      "The clerk cannot say whether the expungement took effect.",
      "The sentence carried neither probation nor confinement and you do not know which route executes it.",
      "The case is still publicly visible long after the sentence was completed."
    ]
  }),

  "wi-942-08-escalation": sheet({
    templateId: "wi-942-08-escalation",
    mechanismName: "Where a mandatory Wisconsin expungement order was not made at sentencing",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed. Whether a court failed in a duty is a legal question, not a form, and LegalEase does not draft an application asserting it.",
    processType: "court_adjacent",
    prerequisites: [
      "The offence was a violation of § 942.08(2)(b), (c) or (d) or (3) and you were under 18 when it was committed.",
      "The judgment of conviction records no order that the record be expunged.",
      "You accept that this sheet routes you to a lawyer rather than giving you a document."
    ],
    documentsToObtain: [
      "The judgment of conviction, and the sentencing transcript or minutes.",
      "The charging document, which names the subsection of § 942.08."
    ],
    gather: [
      "The subsection of § 942.08 the charge was brought under.",
      "Your date of birth and the date of the offence.",
      "The case number, the county and the sentencing date.",
      "Whether the judgment or the transcript says anything about expungement at all."
    ],
    destination: {
      name: "A Wisconsin lawyer, with the judgment of conviction and the sentencing record",
      detail:
        "There is no office to write to and no form to send. The point of this page is that this particular situation is worth a lawyer's time, and why."
    },
    sequence: [
      "Say the distinction plainly, because it is the whole reason this sheet exists. Most Wisconsin participants who did not get expungement got a discretionary refusal, and there is very little to be done about that. You may be in a different position: § 973.015(1m)(a)2 says the court shall order it, and where the provision applied that is a duty rather than a choice.",
      "That does not mean this page is telling you the court got it wrong. Whether the provision applied to your offence and your age, and what follows if it did, are legal conclusions, and a guidance sheet is not where they belong.",
      "Take the judgment of conviction, the sentencing transcript or minutes, and the charging document to " + WI_LEGAL_HELP + ". Say that you believe the expungement order was mandatory under § 973.015(1m)(a)2 and ask them to look at it.",
      "Bring the dates. The subsection of § 942.08 and your age at the offence are the two things that decide whether the provision applied, and both are read off documents rather than recalled.",
      "Do not file anything about this yourself. There is no participant application here and this packet does not prepare one; going in with a document nobody asked for is more likely to cost you than help you.",
      "Be realistic about time as well. Nothing on this page tells you what a court can do about it now or how long anything takes, because that is exactly the legal question being handed over.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet with the documents that matter and with the reason this situation is different from an ordinary refusal. What can be done about it is advice this packet cannot give.",
    canPrepare: [
      "This explanation of why a missing mandatory order is different from a discretionary refusal.",
      "The list of documents to take with you.",
      "A plain statement of what LegalEase will not assert on your behalf."
    ],
    extraCannotPerform: [
      "LegalEase does not assert that the mandatory order should have been entered, and does not prepare any application asking a court to enter one now. That is a legal conclusion about the sentencing court's duty and it belongs to a lawyer."
    ],
    escalations: [
      "You cannot obtain the sentencing transcript or minutes.",
      "A lawyer tells you the provision did not apply and you do not understand why.",
      "A job, a licence or a housing application turns on this record by a particular date."
    ]
  }),

  // ---- wi_exp_trafficking_2m -----------------------------------------------
  "wi-trafficking-route-detection": sheet({
    templateId: "wi-trafficking-route-detection",
    mechanismName: "The one Wisconsin route that works after sentencing",
    whyNotAFiling:
      "Nothing on this page is filed and no motion is generated. Section 973.015(2m) is brought on the motion of the person and turns on a factual showing about trafficking that must stay in the person's own words, prepared with a lawyer or a survivor-services partner. LegalEase does not draft it.",
    processType: "court_adjacent",
    prerequisites: [
      "The case is a Wisconsin case for a violation of Wis. Stat. § 944.30.",
      "The case was connected to trafficking, coercion or exploitation, or to someone forcing or directing what happened.",
      "You are willing to be routed to a person rather than given a document."
    ],
    documentsToObtain: [
      "Nothing needs to be obtained before you read this page or before you are referred.",
      "Your lawyer or survivor-services partner will advise what the motion should include. Do not send documents to LegalEase."
    ],
    gather: [
      "The case number and the Wisconsin county, so the referral goes to the right court and the right provider.",
      "Whether the charge was a prostitution offence under § 944.30.",
      "Nothing else. You will not be asked for any detail about what happened, here or on the next sheet."
    ],
    fees:
      "None for this page. No fee is identified in the statute for the § 973.015(2m) motion, and none is stated here; the provider you are referred to can tell you what a court charges, if anything.",
    destination: {
      name: "The Wisconsin circuit court of the underlying § 944.30 matter, through a lawyer or a survivor-services partner",
      detail:
        "The motion is filed in the court that entered the conviction, adjudication or finding, and must comply with Wis. Stat. § 971.30. It is filed by your lawyer or provider, not by you alone and not by LegalEase."
    },
    sequence: [
      "You have been asked one question and you will not be asked more. Whether the case was connected to trafficking, coercion or exploitation is the only thing this page needed to know, and no detail about it is wanted at any point.",
      "Here is why the question was asked. Section 973.015(2m) provides that at any time after a person has been convicted, adjudicated delinquent, or found not guilty by reason of mental disease or defect for a violation of § 944.30, a court may, on the motion of the person, vacate the conviction, adjudication or finding, or order the record expunged, where the person was a victim of trafficking for the purposes of a commercial sex act and committed the violation as a result of that trafficking.",
      "That is the only adult route in Wisconsin that operates after sentencing. Everything else in § 973.015 is decided at sentencing and cannot be reached later. So for someone with an old § 944.30 record, this is a live remedy where nothing else is, and it is worth knowing that it exists.",
      "It is not a route LegalEase serves. The motion turns on a factual showing about what happened to you, and that showing has to be yours, made with someone who can advise you. A packet-generated account of a person's own trafficking would be the wrong thing on every level, and none is produced here.",
      "The statute says what the motion may include: certified records of court proceedings, approval notices or law-enforcement certifications from federal immigration proceedings, official government documentation, or other relevant and probative evidence. Your lawyer or provider decides what is used. Do not gather it for LegalEase and do not send it to us.",
      "The motion must comply with Wis. Stat. § 971.30 and contain a statement of facts, and the district attorney has an opportunity to respond. That is a contested proceeding, which is another reason it belongs with someone representing you.",
      "One practical point before the referral. The subsection says the motion may be brought at any time after the conviction, adjudication or finding, so an old record is not too old for it. How long ago it was may be discussed, but it is not a bar on the face of the subsection.",
      "The next sheet in this packet says who to take it to.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing that a route exists after sentencing where you may have been told none does, and the referral sheet tells you where to take it. Nothing has been asked of you beyond one question, and nothing about the case has been recorded anywhere by LegalEase.",
    canPrepare: [
      "This explanation of the route and of why it is the only one that works after sentencing.",
      "The referral sheet that follows it in this packet.",
      "Nothing else. No motion, no statement of facts, and no account of what happened to you."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare the § 973.015(2m) motion or its statement of facts, and does not ask for, receive or hold any detail about trafficking, coercion or exploitation. The factual showing must remain yours."
    ],
    escalations: [
      "You want to talk to someone now rather than read a page.",
      "The record is causing a problem today, in housing, work or a licence.",
      "You are not sure whether the old charge was under § 944.30."
    ]
  }),

  "wi-trafficking-referral": sheet({
    templateId: "wi-trafficking-referral",
    mechanismName: "Where to take a Wisconsin § 973.015(2m) motion",
    whyNotAFiling:
      "This page is a referral. Nothing on it is filed, and nothing is generated here or anywhere else in this packet — not the motion, and not the statement of facts it must contain.",
    processType: "court_adjacent",
    prerequisites: [
      "You have read the sheet that comes before this one in the packet.",
      "You accept that this route runs through a person rather than through a form."
    ],
    documentsToObtain: [
      "Nothing, before you make contact. The provider will tell you what they need.",
      "Do not send documents to LegalEase at any point."
    ],
    gather: [
      "The case number and the county, if you have them. If you do not, the provider can find the case.",
      "A way to be contacted safely, if that matters to you.",
      "Nothing about what happened. That conversation belongs with the provider, on your terms."
    ],
    fees:
      "None for this page. No fee is identified in the statute for the § 973.015(2m) motion; ask the provider what a court charges, if anything, and what they charge.",
    destination: {
      name: "A Wisconsin legal aid office, a law school clinic, a Wisconsin attorney, or a survivor-services organisation",
      detail:
        "Any of them can take a § 973.015(2m) motion or tell you who does. A survivor-services organisation is often the easier first call, because they can arrange the legal help alongside everything else. LegalEase does not contact any of them for you."
    },
    sequence: [
      "Make the first call to whichever of these is easiest for you: " + WI_LEGAL_HELP + ", or a Wisconsin survivor-services organisation.",
      "Say that you have an old conviction or adjudication under Wis. Stat. § 944.30 and that you were told there is a route under § 973.015(2m). Naming the subsection saves a great deal of explaining, because it is not a route many people know about.",
      "You do not have to explain what happened to you in order to ask whether they take these cases. That conversation can wait until you are with someone who can help.",
      "Ask two practical things: whether they take § 973.015(2m) motions, and if not, who in Wisconsin does. A no is worth having quickly.",
      "Nothing here is a view about whether the motion will succeed, or about how long it takes. LegalEase does not know and would be wrong to suggest.",
      "No fee is identified in the statute for this motion, and none is stated here. Ask the provider what the court charges, if anything, and what they charge.",
      "One thing worth knowing before you go: no official Wisconsin form was identified for this motion. That is not a sign the route is unavailable — it is drafted rather than filled in, which is another reason it goes to a person.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet with somewhere to call and with the name of the subsection to give them. What follows is between you and them.",
    canPrepare: [
      "This referral explanation and the subsection to name when you call.",
      "The two practical questions to ask on the first call.",
      "Nothing else, and deliberately so."
    ],
    extraCannotPerform: [
      "LegalEase does not contact a lawyer, a clinic or a survivor-services organisation for you, does not prepare the motion, and does not hold any account of what happened."
    ],
    escalations: [
      "You cannot find a provider who takes these motions.",
      "You are not safe, in which case that is the more urgent call and this record can wait.",
      "You want to know what the motion involves before you commit to anything."
    ]
  }),

  // ---- wi_def_961_47 -------------------------------------------------------
  "wi-961-47-status-verification": sheet({
    templateId: "wi-961-47-status-verification",
    mechanismName: "Wisconsin conditional discharge: what the court actually did, from the record",
    whyNotAFiling:
      "Nothing is filed by you. Under Wis. Stat. § 961.47 the court defers further proceedings without entering a judgment of guilt and, on fulfilment of the conditions, discharges the person and dismisses the proceedings. Both are the court's acts, and form CR-214 is court-generated through the case management system rather than a participant form.",
    processType: "court_adjacent",
    prerequisites: [
      "The case is a Wisconsin controlled-substance case that is no longer being decided.",
      "The charge was possession or attempted possession under § 961.41(3g)(b).",
      "You had no earlier controlled-substance conviction and no earlier discharge and dismissal under this section."
    ],
    documentsToObtain: [
      "Form CR-214, Judgment Deferred Under 961.47, and the order discharging you and dismissing the case, from the clerk of circuit court. These establish the non-conviction status the rest of this packet turns on.",
      `A copy of your own Wisconsin Department of Justice criminal history record, which is where the arrest event will still appear.`
    ],
    gather: [
      "Whether the court deferred judgment and placed you on probation without entering a conviction, or convicted you. Take this from the record, not from how the case felt.",
      "Whether the charge was possession or attempted possession of a controlled substance.",
      "Whether you had ever been convicted of any drug offence before this case, anywhere.",
      "Whether you completed all the terms and conditions the court set.",
      "Whether the court has entered an order discharging you and dismissing the case.",
      "Whether you have ever had a case handled this way before.",
      "The case number and the Wisconsin county.",
      "The date probation was granted under the section, if the record shows it, and the date of the discharge order."
    ],
    destination: CLERK_AND_DOJ,
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "Nobody writes to tell you that a discharge and dismissal has been entered, which is why this sheet asks you to go and get the order.",
      "The one notice the statute does require runs the other way: within 20 days after probation is granted under the section, the clerk of court notifies the Department of Justice. Nothing is served by you at any point."
    ],
    sequence: [
      NOT_A_REPORT_ON_YOUR_CASE,
      "Start with the question people get wrong most often. A § 961.47 disposition is not a conviction that was later dropped: the court deferred further proceedings without entering a judgment of guilt at all. Participants describe it inaccurately in both directions, often as 'I got convicted but they dropped it', and the difference matters more here than almost anywhere else.",
      "So check the record rather than the memory. Ask the clerk of circuit court for form CR-214, Judgment Deferred Under 961.47. It is generated by the court through the case management system and it is the document that shows what actually happened.",
      "Then ask for the order discharging you and dismissing the proceedings. That is the second act, it follows fulfilment of the terms and conditions, and it is what completes the disposition.",
      "Check two eligibility facts against the record as well, because both are absolute. The section is confined to a person not previously convicted of an offence under ch. 961 or of any comparable federal, state or county ordinance offence relating to controlled substances. And there may be only one discharge and dismissal under the section with respect to any person, ever.",
      "One administrative detail is worth knowing because it explains what turns up later. Within 20 days after probation is granted under the section, the clerk of court notifies the Department of Justice. So the Department knows about the case from early on, which is why the arrest event is on your criminal history record even though there is no conviction.",
      "Where the discharge and dismissal has been entered, the effect sheet in this packet says what it means and the handoff sheet says what it unlocks.",
      NO_FILING_ON_THIS_ROUTE
    ],
    expectedNextStage:
      "With CR-214 and the discharge order in hand, the effect sheet explains what the disposition is, and the handoff sheet explains the one Wisconsin removal route the non-conviction status opens.",
    canPrepare: [
      "This explanation of what the court did and how to read it off the record.",
      "The list of the two documents to ask the clerk for by name.",
      "The effect sheet and the handoff sheet that follow it in this packet."
    ],
    escalations: [
      "The clerk cannot produce CR-214 and you do not know whether judgment was deferred.",
      "You are not sure whether an old case counts as a controlled-substance conviction.",
      "A term was violated and you do not know whether the court entered an adjudication of guilt."
    ]
  }),

  "wi-961-47-legal-effect": sheet({
    templateId: "wi-961-47-legal-effect",
    mechanismName: "What a Wisconsin discharge and dismissal under § 961.47 is, and what it is not",
    whyNotAFiling:
      "This page explains the effect of two acts of the court. Nothing on it is filed and § 961.47 provides nothing for a participant to submit.",
    processType: "court_adjacent",
    prerequisites: [
      "The court has discharged you and dismissed the proceedings under § 961.47.",
      "You have read the sheet that comes before this one in the packet."
    ],
    documentsToObtain: [
      "The order discharging you and dismissing the case.",
      "A copy of your own Wisconsin Department of Justice criminal history record."
    ],
    gather: [
      "What the discharge order says and the date it was entered.",
      "What your criminal history record shows for the case now.",
      "Whether anything you are applying for asks about convictions, arrests, or both."
    ],
    destination: {
      name: "The Wisconsin circuit court record, with the arrest event retained by the Department of Justice",
      detail:
        "The discharge and dismissal is the court's act and is recorded in the court file. The Department of Justice keeps the arrest event on the state criminal history record, which is what the next sheet in this packet is about."
    },
    sequence: [
      "Start with what the statute says the disposition is. Discharge and dismissal under § 961.47 is without adjudication of guilt and is not a conviction for purposes of disqualifications or disabilities imposed by law upon conviction of a crime — including the § 961.48 second-or-subsequent-offence penalties that a drug conviction would otherwise carry.",
      "That last point is worth pausing on. It means a later controlled-substance charge is not enhanced by this case in the way a conviction would enhance it. For someone with one old possession case, that is often the most valuable thing about the disposition.",
      "There is no expungement provision in § 961.47. The section was read in full and it contains none: completion produces a discharge and dismissal that is not a conviction, and nothing more. Anyone who told you the section expunges the record was wrong, and knowing that now saves you looking for something that is not there.",
      "The section is also once in a lifetime. There may be only one discharge and dismissal under it with respect to any person, so a second case cannot be handled the same way.",
      "The arrest event remains on your Wisconsin Department of Justice criminal history record. That is not a failure of the disposition; the clerk notified the Department within 20 days of probation being granted, and a non-conviction is still an event the Department holds.",
      "That is exactly what the next sheet in this packet is about. The non-conviction status is what makes the one Wisconsin agency removal route available, and it is the practical payoff of the disposition.",
      "One thing this page will not tell you is how to answer an employment or licensing question. The statute says the discharge and dismissal is not a conviction for disqualifications or disabilities imposed by law, and that is a statement about legal consequences rather than a script for a form. How far it carries into a particular question, and how to answer one that asks about arrests rather than convictions, has not been settled here. Ask a lawyer before you answer one, and do not treat anything on this page as permission either way.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "You leave this sheet knowing that the disposition is a non-conviction, that the section contains no expungement, and that the arrest event is still with the Department of Justice — which is what the handoff sheet addresses.",
    canPrepare: [
      "This explanation of what the disposition is and what the section does not contain.",
      "The account of the § 961.48 effect and of the once-per-lifetime limit.",
      "The handoff sheet that follows it in this packet."
    ],
    escalations: [
      "An application asks about arrests as well as convictions and you do not know how to answer it.",
      "A later charge is being treated as a second or subsequent offence and you believe this case is the reason.",
      "Your criminal history record describes the case as a conviction."
    ]
  }),

  "wi-961-47-doj-handoff": sheet({
    templateId: "wi-961-47-doj-handoff",
    mechanismName: "From a Wisconsin conditional discharge to the one agency removal route the state has",
    whyNotAFiling:
      "This page is a handoff. Nothing on it is filed; the Department of Justice route it points at has its own official form, its own packet and its own LegalEase track.",
    processType: "agency",
    prerequisites: [
      "The court has discharged you and dismissed the proceedings under § 961.47.",
      "You hold, or can obtain, the discharge order.",
      "You have read the effect sheet that comes before this one in the packet."
    ],
    documentsToObtain: [
      "The order discharging you and dismissing the case, and form CR-214.",
      "A copy of your own Wisconsin Department of Justice criminal history record. You need it to see how the arrest event is recorded before anything else happens."
    ],
    gather: [
      "How the arrest event appears on the criminal history record: the date, the agency, and the charge as recorded.",
      "The date of the discharge and dismissal.",
      "Whether the criminal history record shows the disposition at all, and if so, how it describes it.",
      "The case number and county for the court file."
    ],
    destination: {
      name: "The Wisconsin Department of Justice, Crime Information Bureau",
      detail:
        "Wisconsin's fingerprint removal route runs through the Department of Justice rather than through a court, and it is the only agency removal route the state has. It is a separate LegalEase track with its own official form; nothing on this page goes to the Department."
    },
    sequence: [
      "This is the practical payoff of the disposition, so it is worth being clear about the chain. The court deferred proceedings, you completed the conditions, the court discharged you and dismissed the case, and the result is a non-conviction. That non-conviction status is what makes the Department of Justice removal route available.",
      "The bridge is the point. A conviction closes that route; a discharge and dismissal under § 961.47 does not. It is the one place in Wisconsin where a criminal case leads into an agency removal, and if nobody has told you about it, this is why the sheet exists.",
      "Get your own criminal history record from the Department of Justice first, and read how the arrest event is recorded. Everything on the removal route is built from that record rather than from the court file, and the two do not always describe the case the same way.",
      "Keep the discharge order with it. That order is what shows the disposition was a discharge and dismissal rather than a conviction, and it is what the removal route needs to see.",
      "The removal route itself is a separate LegalEase track with its own official Department of Justice form and its own instructions. Nothing on this sheet is that form, and nothing on this sheet is sent anywhere.",
      "Do not send anything to the Department on the strength of this page. Read the record, keep the order, and go to that track when you are ready.",
      "Nothing here says the arrest event will be removed. It says the route exists and that this disposition is what opens it. What the Department decides is the Department's.",
      NOT_A_REPORT_ON_YOUR_CASE
    ],
    expectedNextStage:
      "With the criminal history record and the discharge order together, the Department of Justice fingerprint removal track is the next packet — and it is a different one from this.",
    canPrepare: [
      "This explanation of why the disposition opens the removal route.",
      "The list of what to have in hand before starting it.",
      "A plain statement of what belongs to the Department rather than to this packet."
    ],
    extraCannotPerform: [
      "LegalEase does not prepare the Department of Justice removal request on this track, does not submit anything to the Department, and cannot tell you what the Department will decide."
    ],
    escalations: [
      "The criminal history record does not show the discharge and dismissal.",
      "The arrest event on the record does not match the case as the court file describes it.",
      "You cannot obtain the discharge order from the clerk."
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
      if (!WISCONSIN_GUIDANCE_TEMPLATES[component.templateId]) {
        throw new Error(
          `${component.componentId}: no Wisconsin guidance template ${component.templateId} is registered.`
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
        requirement: "required" as const,
        order: index + 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      };
    })
  };
}

/**
 * Asked on every Wisconsin route in this family, in this order.
 *
 * Record jurisdiction and immigration are stop conditions on all four assigned
 * tracks. The trafficking screen is on all four because the design routes any
 * such fact pattern arising anywhere in Wisconsin to § 973.015(2m), and it is a
 * single non-graphic question by design: no detail is asked for on any track.
 */
const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  },
  {
    key: "recordJurisdiction",
    label: "Is the record from Wisconsin, another state, the federal courts, or a tribal court?",
    required: true
  },
  {
    key: "immigrationQuestion",
    label:
      "Could your immigration status be affected by this — for example, are you not a United States citizen?",
    required: true
  },
  {
    key: "traffickingConnection",
    label:
      "Was this case connected to trafficking, coercion or exploitation, or to someone forcing or directing what happened?",
    required: true
  }
];

function wisconsinTrack(input: {
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
    jurisdiction: "WI",
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

export const WISCONSIN_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  wisconsinTrack({
    trackId: "wi_exp_certificate_of_discharge",
    publicName: "Complete an expungement the judge already ordered",
    mechanism: "execution_of_court_ordered_expungement_by_certificate_of_discharge",
    authority: "Wis. Stat. § 973.015(1m) and (1m)(b); State v. Matasek; State v. Arberry; State v. Braunschweig; State v. Leitner",
    recordTypes: ["conviction"],
    dispositions: ["convicted_with_expungement_ordered_at_sentencing"],
    components: [
      {
        componentId: "wi_exp_certificate_of_discharge-eligibility-verification-1",
        templateId: "wi-cod-eligibility-verification"
      },
      {
        componentId: "wi_exp_certificate_of_discharge-completion-verification-2",
        templateId: "wi-cod-completion-verification"
      },
      {
        componentId: "wi_exp_certificate_of_discharge-status-verification-instructions-3",
        templateId: "wi-cod-status-verification"
      },
      {
        componentId: "wi_exp_certificate_of_discharge-legal-effect-explanation-4",
        templateId: "wi-cod-legal-effect"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "sentencingHasHappened",
        label: "Have you already been sentenced in this case?",
        required: true
      },
      {
        key: "expungementOrderedAtSentencing",
        label:
          "Did the judge order at your sentencing that the record would be expunged once you completed your sentence?",
        required: true
      },
      {
        key: "convictionIsOwi",
        label: "Was the conviction for operating while intoxicated, or another intoxicated-driving offence?",
        required: true
      },
      {
        key: "offenceClassKnown",
        label:
          "Do you know from the judgment which class of offence this was, and whether it is treated as violent?",
        required: true
      },
      { key: "ageAtOffense", label: "How old were you when the offence happened?", required: true },
      {
        key: "caseNumberAndCounty",
        label: "What is the case number, and which Wisconsin county was the case in?",
        required: true
      },
      {
        key: "sentenceType",
        label: "Did your sentence include probation, jail or prison, or only a fine and costs?",
        required: true
      },
      {
        key: "sentenceCompletionDate",
        label: "On what date did you finish your sentence, including any probation?",
        required: true
      },
      { key: "probationRevoked", label: "Was your probation ever revoked?", required: true },
      {
        key: "subsequentConviction",
        label: "Were you convicted of any other offence before you finished this sentence?",
        required: true
      },
      {
        key: "stillVisibleOnCcap",
        label: "Does the case still show up on Wisconsin Circuit Court Access?",
        required: true
      },
      {
        key: "supervisingAuthority",
        label: "Who supervised your probation, or which facility held you?",
        required: true
      }
    ],
    assembledPacketName: "wisconsin-certificate-of-discharge-expungement",
    assembledPacketTitle: "Wisconsin expungement — the certificate of discharge route",
    customerDeliverableDescription:
      "Answers the question that decides most Wisconsin cases — whether the judge ordered expungement at sentencing — from the record rather than from memory, explains what successful completion means in the statute, shows how to check whether the certificate of discharge issued and reached the court, and sets out the four places expungement stops. Nothing is filed by the participant and no fee is charged.",
    notes:
      "Process guidance only. The certificate is the authority's document; the participant's written follow-up request is a separate supporting-action track so that a submittable document is never hidden inside a no-filing route."
  }),

  wisconsinTrack({
    trackId: "wi_exp_942_08_mandatory",
    publicName: "Mandatory expungement for an under-18 invasion of privacy offence",
    mechanism: "mandatory_expungement_order_at_sentencing_for_a_youthful_offence",
    authority: "Wis. Stat. § 973.015(1m)(a)2; Wis. Stat. § 942.08(2)(b), (c), (d) and (3)",
    recordTypes: ["conviction"],
    dispositions: ["convicted_with_mandatory_expungement_ordered_at_sentencing"],
    components: [
      {
        componentId: "wi_exp_942_08_mandatory-eligibility-verification-1",
        templateId: "wi-942-08-eligibility-verification"
      },
      {
        componentId: "wi_exp_942_08_mandatory-status-verification-instructions-2",
        templateId: "wi-942-08-status-verification"
      },
      {
        componentId: "wi_exp_942_08_mandatory-escalation-instructions-3",
        templateId: "wi-942-08-escalation"
      }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "sentencingHasHappened",
        label: "Have you already been sentenced in this case?",
        required: true
      },
      {
        key: "offenceIs94208",
        label: "Was the offence a violation of Wisconsin statute 942.08 — an invasion of privacy offence?",
        required: true
      },
      {
        key: "ageUnder18AtOffence",
        label: "Were you under 18 years old when the offence happened?",
        required: true
      },
      {
        key: "expungementOrderedAtSentencing",
        label:
          "Did the judge order at your sentencing that the record would be expunged once you completed your sentence?",
        required: true
      },
      {
        key: "sentenceType",
        label: "Did your sentence include probation, jail or prison, or only a fine and costs?",
        required: true
      },
      {
        key: "sentenceCompletionDate",
        label: "On what date did you finish your sentence, including any probation?",
        required: true
      },
      { key: "probationRevoked", label: "Was your probation ever revoked?", required: true },
      {
        key: "subsequentConviction",
        label: "Were you convicted of any other offence before you finished this sentence?",
        required: true
      },
      {
        key: "caseNumberAndCounty",
        label: "What is the case number, and which Wisconsin county was the case in?",
        required: true
      },
      {
        key: "stillVisibleOnCcap",
        label: "Does the case still show up on Wisconsin Circuit Court Access?",
        required: true
      }
    ],
    assembledPacketName: "wisconsin-mandatory-expungement-942-08",
    assembledPacketTitle: "Wisconsin mandatory expungement — under-18 invasion of privacy",
    customerDeliverableDescription:
      "Detects the one Wisconsin expungement the sentencing court has no discretion to refuse, explains its two differences from the general rule, shows how to check whether the mandatory order was entered and took effect, and explains why a missing mandatory order is a grievance a lawyer can work with rather than a discretionary disappointment. Nothing is filed by the participant and no fee is charged.",
    notes:
      "Process guidance only. The order is the court's at sentencing and execution runs on the certificate-of-discharge or CR-266 track; where the order was not entered the route is an attorney referral and no application is drafted."
  }),

  wisconsinTrack({
    trackId: "wi_exp_trafficking_2m",
    publicName: "Clear a prostitution record that resulted from trafficking",
    mechanism: "trafficking_survivor_vacatur_or_expungement_after_sentencing",
    authority: "Wis. Stat. § 973.015(2m); Wis. Stat. §§ 944.30 and 971.30",
    recordTypes: ["conviction", "adjudication"],
    dispositions: ["convicted", "adjudicated_delinquent", "not_guilty_by_reason_of_mental_disease_or_defect"],
    components: [
      { componentId: "wi_exp_trafficking_2m-route-detection-1", templateId: "wi-trafficking-route-detection" },
      { componentId: "wi_exp_trafficking_2m-referral-instructions-2", templateId: "wi-trafficking-referral" }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "offenceIs94430",
        label: "Was the charge a prostitution offence under Wisconsin statute 944.30?",
        required: true
      },
      {
        key: "caseNumberAndCounty",
        label: "What is the case number, and which Wisconsin county was the case in?",
        required: false
      }
    ],
    assembledPacketName: "wisconsin-trafficking-survivor-route",
    assembledPacketTitle: "Wisconsin trafficking-survivor route under § 973.015(2m)",
    customerDeliverableDescription:
      "Explains that § 973.015(2m) is the only adult Wisconsin route that works after sentencing, on a single non-graphic screening question and with no request for any detail, and names where to take it. No motion and no statement of facts is generated: the factual showing stays the participant's own. Nothing is filed and no fee is charged.",
    notes:
      "Process guidance only, by design. Counsel's stated strategy was a custom pleading with a mandatory handoff; because the handoff is mandatory and the trafficking nexus is a contested evidentiary showing, no pleading is generated and the route is detection and referral."
  }),

  wisconsinTrack({
    trackId: "wi_def_961_47",
    publicName: "Drug possession first-offence conditional discharge",
    mechanism: "conditional_discharge_for_first_offence_possession",
    authority: "Wis. Stat. § 961.47; Wis. Stat. §§ 961.41(3g)(b) and 961.48",
    recordTypes: ["charge"],
    dispositions: ["conditional_discharge_granted", "discharged_and_dismissed_without_adjudication_of_guilt"],
    components: [
      {
        componentId: "wi_def_961_47-status-verification-instructions-1",
        templateId: "wi-961-47-status-verification"
      },
      { componentId: "wi_def_961_47-legal-effect-explanation-2", templateId: "wi-961-47-legal-effect" },
      { componentId: "wi_def_961_47-handoff-to-doj-removal-3", templateId: "wi-961-47-doj-handoff" }
    ],
    requiredInputs: [
      ...SHARED_INPUTS,
      {
        key: "caseStillBeingDecided",
        label: "Is the case still going on — has the plea or the sentencing not happened yet?",
        required: true
      },
      {
        key: "deferredJudgmentGranted",
        label:
          "Did the court defer judgment and put you on probation without entering a conviction, rather than convicting you?",
        required: true
      },
      {
        key: "chargeWasPossession",
        label: "Was the charge possession or attempted possession of a controlled substance?",
        required: true
      },
      {
        key: "priorControlledSubstanceOffence",
        label: "Had you ever been convicted of any drug offence before this case, in Wisconsin or anywhere else?",
        required: true
      },
      {
        key: "conditionsFulfilled",
        label: "Did you complete all the terms and conditions the court set?",
        required: true
      },
      {
        key: "dischargeAndDismissalEntered",
        label: "Did the court discharge you and dismiss the case?",
        required: true
      },
      {
        key: "priorConditionalDischarge",
        label: "Have you ever had a case handled this way before?",
        required: true
      },
      {
        key: "caseNumberAndCounty",
        label: "What is the case number, and which Wisconsin county was the case in?",
        required: true
      }
    ],
    assembledPacketName: "wisconsin-961-47-conditional-discharge",
    assembledPacketTitle: "Wisconsin conditional discharge under § 961.47",
    customerDeliverableDescription:
      "Establishes from the court record whether the court deferred judgment under § 961.47 rather than convicting, explains that discharge and dismissal is not a conviction — including for the § 961.48 enhanced penalties — that the section contains no expungement provision and that only one such discharge is available in a lifetime, and documents the handoff into the one Wisconsin agency removal route the non-conviction status unlocks. Nothing is filed by the participant and no fee is charged.",
    notes:
      "Process guidance only. Both the deferral and the discharge are the court's acts and CR-214 is court-generated; the value is the explanation and the bridge into the Department of Justice fingerprint removal track."
  })
];
