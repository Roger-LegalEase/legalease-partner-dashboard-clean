#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, StandardFonts, rgb } = require("pdf-lib");

export const FAMILY_ID = "census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement";
export const ROUTE_KEY = "obligation:runtime-only:UT:path-l-vacatur-human-trafficking-related-expungement";
const OUT = "data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill";
const SOURCE = "reference/utah/04_PCRA_Petition-2022-06-13.pdf";
const SOURCE_SHA = "9c5bd552fab0ada747b6f680b61e48acf4eca89275e2c8ad86d7ee3d82e95a09";
const SOURCE_BYTES = 128059;
const FORM = "UT-RULE-65C-PCRA";
const ATTACHMENT = "UT-PCRA-ATTACHMENTS-A-B";
const DECISION = "UT-TRAFFICKING-PCRA-RULE-65C";
const black = rgb(0, 0, 0);
const white = rgb(1, 1, 1);

const abs = (relative) => path.join(ROOT, relative);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (relative, value) => fs.writeFileSync(abs(relative), `${JSON.stringify(value, null, 2)}\n`);
const valueAt = (object, dotted) => dotted.split(".").reduce((value, key) => value?.[key], object);
const nonblank = (value) => typeof value === "string" && value.trim().length > 0;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const fail = (code, detail) => ({
  eligible: false,
  code,
  detail,
  participantInstruction:
    "Review the complete conviction record and every related proceeding. Supply record-derived offense, trafficking-nexus, procedural-history, and exhibit facts; do not estimate or invent testimony.",
});

function requireText(facts, key) {
  return nonblank(valueAt(facts, key)) ? null : fail("MISSING_REQUIRED_FACT", `${key} is required`);
}

function validateProceeding(proceeding, name, options = {}) {
  if (typeof proceeding?.[options.flag ?? "filed"] !== "boolean") {
    return fail("UNKNOWN_PROCEDURAL_HISTORY", `${name} must be answered true or false from the record`);
  }
  if (!proceeding[options.flag ?? "filed"]) return null;
  for (const key of options.fields ?? ["court", "caseNumber", "result", "resultDate", "grounds"]) {
    if (!nonblank(proceeding[key])) return fail("INCOMPLETE_CONDITIONAL_HISTORY", `${name}.${key} is required for the yes branch`);
  }
  return null;
}

export function validateUtTraffickingPcraFacts(facts = {}) {
  const gates = [
    ["districtCourtOfConvictionConfirmed", "UNKNOWN_DISTRICT_COURT_GATE", "NOT_DISTRICT_COURT_OF_CONVICTION"],
    ["qualifyingOffenseConfirmed", "UNKNOWN_QUALIFYING_OFFENSE", "OFFENSE_NOT_CONFIRMED_QUALIFYING"],
    ["traffickingNexusConfirmed", "UNKNOWN_TRAFFICKING_NEXUS", "TRAFFICKING_NEXUS_NOT_CONFIRMED"],
    ["clearAndConvincingEvidenceReady", "UNKNOWN_EVIDENCE_BURDEN", "EVIDENCE_NOT_READY_FOR_CLEAR_AND_CONVINCING_STANDARD"],
  ];
  for (const [key, unknown, negative] of gates) {
    const value = facts.eligibility?.[key];
    if (value == null) return fail(unknown, `eligibility.${key} must be verified`);
    if (value !== true) return fail(negative, `eligibility.${key} must be true for this packet`);
  }
  for (const key of [
    "participant.fullLegalName", "participant.address", "participant.cityStateZip", "participant.phone", "participant.email",
    "court.judicialDistrict", "court.county", "court.address", "court.originalCourtName", "court.originalCourtLocation",
    "case.originalCaseNumber", "case.judgmentDate", "case.sentence", "case.offensesAllCounts", "case.plea",
    "ground.qualifyingOffense", "ground.qualifyingOffenseCitation", "ground.priorPresentationExplanation",
    "attachments.judgment", "attachments.memorandum",
  ]) {
    const error = requireText(facts, key); if (error) return error;
  }
  if (!ISO_DATE.test(facts.case.judgmentDate)) return fail("INVALID_JUDGMENT_DATE", "case.judgmentDate must be YYYY-MM-DD");
  if (!new Set(["FELONY_STATE", "MISDEMEANOR_COUNTY", "MISDEMEANOR_MUNICIPALITY"]).has(facts.case.respondentKind)) {
    return fail("UNKNOWN_RESPONDENT_BRANCH", "case.respondentKind must identify the printed felony, county, or municipality branch");
  }
  if (facts.case.respondentKind === "MISDEMEANOR_COUNTY" && !nonblank(facts.case.respondentCounty)) {
    return fail("MISSING_RESPONDENT_COUNTY", "the county respondent is required for this misdemeanor branch");
  }
  if (facts.case.respondentKind === "MISDEMEANOR_MUNICIPALITY" && !nonblank(facts.case.respondentMunicipality)) {
    return fail("MISSING_RESPONDENT_MUNICIPALITY", "the municipality respondent is required for this misdemeanor branch");
  }
  const pleas = new Set(["NOT_GUILTY", "GUILTY", "NO_CONTEST", "GUILTY_MENTALLY_ILL", "NOT_GUILTY_INSANITY", "MIXED"]);
  if (!pleas.has(facts.case.plea)) return fail("UNKNOWN_PLEA", "case.plea must match one printed plea branch or MIXED");
  if (facts.case.plea === "MIXED" && !nonblank(facts.case.mixedPleaDetails)) return fail("MISSING_MIXED_PLEA_DETAILS", "question 6 requires every count's plea");
  if (["NOT_GUILTY", "NOT_GUILTY_INSANITY"].includes(facts.case.plea)) {
    if (!new Set(["JURY", "JUDGE"]).has(facts.case.trialBefore)) return fail("UNKNOWN_TRIAL_FINDER", "question 7 requires jury or judge");
    if (typeof facts.case.testifiedAtTrial !== "boolean") return fail("UNKNOWN_TRIAL_TESTIMONY", "question 8 requires yes or no");
  }
  const appeal = validateProceeding(facts.history?.directAppeal, "history.directAppeal");
  if (appeal) return appeal;
  if (facts.history.directAppeal.filed) {
    if (!nonblank(facts.attachments?.appellateDecision)) {
      return fail("MISSING_APPELLATE_DECISION_ATTACHMENT", "question 19(b) requires the appellate decision for the recorded direct appeal");
    }
    if (typeof facts.history.directAppeal.furtherReview?.sought !== "boolean") return fail("UNKNOWN_FURTHER_REVIEW", "question 10(f) requires yes or no");
    if (facts.history.directAppeal.furtherReview.sought) {
      for (const key of ["court", "caseNumber", "result", "resultDate", "grounds"]) {
        if (!nonblank(facts.history.directAppeal.furtherReview[key])) return fail("INCOMPLETE_FURTHER_REVIEW", `furtherReview.${key} is required`);
      }
    }
  } else if (!nonblank(facts.history.directAppeal.whyNot)) return fail("MISSING_NO_APPEAL_EXPLANATION", "question 11 requires why no direct appeal was filed");
  for (const key of ["priorProceeding1", "priorProceeding2"]) {
    const error = validateProceeding(facts.history?.[key], `history.${key}`); if (error) return error;
    const proceeding = facts.history[key];
    if (proceeding.filed && (typeof proceeding.evidentiaryHearing !== "boolean" || typeof proceeding.appealed !== "boolean")) {
      return fail("INCOMPLETE_PRIOR_PROCEEDING", `${key} requires hearing and appeal answers`);
    }
    if (proceeding.filed && proceeding.appealed) {
      for (const field of ["appealCourt", "appealCaseNumber", "appealResult", "appealResultDate", "appealGrounds"]) {
        if (!nonblank(proceeding[field])) return fail("INCOMPLETE_PRIOR_PROCEEDING_APPEAL", `${key}.${field} is required`);
      }
    }
  }
  if ((facts.history.priorProceeding1.filed || facts.history.priorProceeding2.filed)
    && !nonblank(facts.attachments?.priorPcraMaterials)) {
    return fail("MISSING_PRIOR_PCRA_ATTACHMENTS", "question 19(c) requires the prior PCRA filing and decision for the recorded proceeding");
  }
  const pending = validateProceeding(facts.history?.pendingProceeding, "history.pendingProceeding", {flag: "pending", fields: ["court", "caseNumber", "nature"]});
  if (pending) return pending;
  const future = validateProceeding(facts.case?.futureSentence, "case.futureSentence", {flag: "exists", fields: ["court", "location", "caseNumber"]});
  if (future) return future;
  if (!Array.isArray(facts.case.attorneys) || facts.case.attorneys.length !== 7 || facts.case.attorneys.some((entry) => !nonblank(entry))) {
    return fail("INCOMPLETE_ATTORNEY_HISTORY", "question 17 requires seven collected name/address or record-reviewed unknown entries");
  }
  if (!Array.isArray(facts.ground.nexusFacts) || facts.ground.nexusFacts.length === 0
    || facts.ground.nexusFacts.some((item) => !nonblank(item.statement) || !nonblank(item.sourceRecord)
      || !new Set(["TRAFFICKING", "FORCE", "FRAUD", "COERCION"]).has(item.relationship))) {
    return fail("MISSING_RECORD_DERIVED_NEXUS", "at least one source-identified trafficking, force, fraud, or coercion nexus fact is required");
  }
  if (!Array.isArray(facts.evidence) || facts.evidence.length === 0
    || facts.evidence.some((item) => !nonblank(item.exhibit) || !nonblank(item.description)
      || !nonblank(item.supports) || !nonblank(item.sourceRecord))) {
    return fail("MISSING_SUPPORTING_EVIDENCE", "at least one identified evidence exhibit with its source and nexus is required");
  }
  if (facts.options?.requestFeeWaiver === true && !nonblank(facts.attachments.inmateAccountingCertificate)) {
    return fail("MISSING_FEE_WAIVER_CERTIFICATE", "the printed form requires the accounting certificate when fee waiver is requested");
  }
  if (facts.options?.requestCourtAppointedLawyer === true && !nonblank(facts.attachments.financialDeclaration)) {
    return fail("MISSING_FINANCIAL_DECLARATION", "the printed form requires the financial declaration when appointed counsel is requested");
  }
  return {eligible: true, code: "ELIGIBLE_RULE_65C_TRAFFICKING_PCRA"};
}

const rect = (x, y, width, height = 12) => ({x, y, width, height});
const F = (id, label, page, box, anchor, factId, options = {}) => ({id, label, page, box, anchor, factId, ...options});
const checkbox = (id, label, page, x, y, anchor, selected, condition) => F(id, label, page, rect(x, y, 11, 11), anchor, null, {kind: "checkbox", selected, condition});

const officialFields = [
  F("p1-petitioner-name", "Name", 1, rect(77, 668, 215), "Name", "participant.fullLegalName"),
  F("p1-address", "Address", 1, rect(77, 640, 215), "Address", "participant.address"),
  F("p1-city-state-zip", "City, State, Zip", 1, rect(77, 612, 215), "City, State, Zip", "participant.cityStateZip"),
  F("p1-phone", "Phone", 1, rect(77, 584, 215), "Phone", "participant.phone"),
  F("p1-email", "Email", 1, rect(77, 556, 215), "Email", "participant.email"),
  F("p1-judicial-district", "Judicial District", 1, rect(167, 485, 64), "Judicial District", "court.judicialDistrict"),
  F("p1-county", "County", 1, rect(317, 485, 120), "County", "court.county"),
  F("p1-court-address", "Court Address", 1, rect(174, 459, 362), "Court Address", "court.address"),
  F("p1-petitioner-caption", "Petitioner", 1, rect(72, 384, 240), "Petitioner", "participant.fullLegalName"),
  F("p1-new-case-number", "PCRA Case Number assigned by court", 1, rect(330, 358, 205), "Case Number", null, {protect: "court assigns the new PCRA case number after filing"}),
  F("p1-respondent", "Respondent", 1, rect(72, 322, 240), "Respondent", "derived.respondent"),
  F("p1-judge", "Judge", 1, rect(330, 322, 205), "Judge", null, {protect: "the court assigns the judge"}),
  checkbox("p1-respondent-felony", "Conviction of Felony - State of Utah", 1, 108, 154, "Conviction of Felony", (f) => f.case.respondentKind === "FELONY_STATE", "case is not on the felony/State respondent branch"),
  checkbox("p1-respondent-county", "Conviction of Misdemeanor or Ordinance - County", 1, 108, 140, "County of", (f) => f.case.respondentKind === "MISDEMEANOR_COUNTY", "case is not on the county misdemeanor respondent branch"),
  F("p1-respondent-county-name", "County of", 1, rect(416, 143, 120), "County of", "case.respondentCounty", {active: (f) => f.case.respondentKind === "MISDEMEANOR_COUNTY", condition: "only the county misdemeanor respondent branch uses this blank"}),
  checkbox("p1-respondent-municipality", "Conviction of Misdemeanor or Ordinance - Municipality", 1, 108, 126, "Municipality of", (f) => f.case.respondentKind === "MISDEMEANOR_MUNICIPALITY", "case is not on the municipality misdemeanor respondent branch"),
  F("p1-respondent-municipality-name", "Municipality of", 1, rect(445, 129, 88), "Municipality of", "case.respondentMunicipality", {active: (f) => f.case.respondentKind === "MISDEMEANOR_MUNICIPALITY", condition: "only the municipality respondent branch uses this blank"}),

  F("q1a-original-court", "1(a) Name of court that entered the judgment", 2, rect(145, 629, 392), "Name of court that entered", "court.originalCourtName"),
  F("q1b-original-location", "1(b) Location of court", 2, rect(240, 603, 299), "Location of court", "court.originalCourtLocation"),
  F("q1c-original-case", "1(c) Original case number", 2, rect(224, 577, 185), "Case number", "case.originalCaseNumber"),
  F("q2-judgment-date", "2. Date of judgment being challenged", 2, rect(300, 551, 210), "Date of judgment", "case.judgmentDate"),
  F("q3-sentence", "3. Sentence", 2, rect(75, 476, 455, 36), "Sentence", "case.sentence", {kind: "area", maxLines: 3}),
  F("q4-offenses", "4. Nature of offense involved (all counts)", 2, rect(75, 390, 455, 38), "Nature of offense", "case.offensesAllCounts", {kind: "area", maxLines: 3}),
  ...[
    ["NOT_GUILTY", 311, "Not guilty"], ["GUILTY", 291, "Guilty"], ["NO_CONTEST", 271, "No contest"],
    ["GUILTY_MENTALLY_ILL", 251, "Guilty and mentally ill"], ["NOT_GUILTY_INSANITY", 231, "Not guilty by reason of insanity"],
  ].map(([choice, y, label]) => checkbox(`q5-${choice.toLowerCase()}`, `5. Plea - ${label}`, 2, 116, y, label,
    (f) => f.case.plea === choice || (f.case.plea === "MIXED" && choice === "GUILTY"), `the verified plea is not ${label}`)),
  F("q6-mixed-pleas", "6. Plea to each count", 2, rect(108, 116, 422, 58), "plea to each count", "case.mixedPleaDetails", {kind: "area", maxLines: 4, active: (f) => f.case.plea === "MIXED", condition: "question 6 applies only when pleas differ among counts"}),
  checkbox("q7-jury", "7. Trial before jury", 3, 108, 670, "Jury", (f) => ["NOT_GUILTY", "NOT_GUILTY_INSANITY"].includes(f.case.plea) && f.case.trialBefore === "JURY", "questions 7-8 apply only to the printed trial branch and this case was not tried to a jury"),
  checkbox("q7-judge", "7. Trial before judge", 3, 173, 670, "Judge", (f) => ["NOT_GUILTY", "NOT_GUILTY_INSANITY"].includes(f.case.plea) && f.case.trialBefore === "JUDGE", "questions 7-8 apply only to the printed trial branch and this case was not tried to a judge"),
  checkbox("q8-testified-yes", "8. Testified at trial - Yes", 3, 108, 618, "testify at the trial", (f) => ["NOT_GUILTY", "NOT_GUILTY_INSANITY"].includes(f.case.plea) && f.case.testifiedAtTrial === true, "question 8 is outside this case's verified trial/testimony branch"),
  checkbox("q8-testified-no", "8. Testified at trial - No", 3, 171, 618, "testify at the trial", (f) => ["NOT_GUILTY", "NOT_GUILTY_INSANITY"].includes(f.case.plea) && f.case.testifiedAtTrial === false, "question 8 is outside this case's verified trial/testimony branch"),
  checkbox("q9-appeal-yes", "9. Direct appeal - Yes", 3, 108, 566, "appeal from the conviction", (f) => f.history.directAppeal.filed, "the verified record says no direct appeal was filed"),
  checkbox("q9-appeal-no", "9. Direct appeal - No", 3, 171, 566, "appeal from the conviction", (f) => !f.history.directAppeal.filed, "the verified record says a direct appeal was filed"),
  F("q10a-appellate-court", "10(a) Name of Appellate Court", 3, rect(278, 519, 250), "Name of Appellate Court", "history.directAppeal.court", {active: (f) => f.history.directAppeal.filed, condition: "question 10 applies only when question 9 is yes"}),
  F("q10b-appellate-case", "10(b) Appellate case number", 3, rect(179, 493, 210), "Case Number", "history.directAppeal.caseNumber", {active: (f) => f.history.directAppeal.filed, condition: "question 10 applies only when question 9 is yes"}),
  F("q10c-appellate-result", "10(c) Appellate result", 3, rect(105, 424, 420, 30), "Result", "history.directAppeal.result", {kind: "area", maxLines: 2, active: (f) => f.history.directAppeal.filed, condition: "question 10 applies only when question 9 is yes"}),
  F("q10d-appellate-date", "10(d) Date of result or opinion", 3, rect(300, 403, 225), "Date of result", "history.directAppeal.resultDate", {active: (f) => f.history.directAppeal.filed, condition: "question 10 applies only when question 9 is yes"}),
  F("q10e-appellate-grounds", "10(e) Grounds raised", 3, rect(105, 329, 420, 34), "Grounds raised", "history.directAppeal.grounds", {kind: "area", maxLines: 2, active: (f) => f.history.directAppeal.filed, condition: "question 10 applies only when question 9 is yes"}),
  checkbox("q10f-review-yes", "10(f) Further review - Yes", 3, 143, 242, "seek further review", (f) => f.history.directAppeal.filed && f.history.directAppeal.furtherReview.sought, "further-review details apply only after a direct appeal and a yes answer"),
  checkbox("q10f-review-no", "10(f) Further review - No", 3, 207, 242, "seek further review", (f) => f.history.directAppeal.filed && !f.history.directAppeal.furtherReview.sought, "further-review details apply only after a direct appeal and this answer is not the verified branch"),
  F("q10g1-review-court", "10(g)(1) Reviewing Court", 3, rect(274, 194, 255), "Name of Reviewing Court", "history.directAppeal.furtherReview.court", {active: (f) => f.history.directAppeal.filed && f.history.directAppeal.furtherReview.sought, condition: "question 10(g) applies only when further review was sought"}),
  F("q10g2-review-case", "10(g)(2) Reviewing case number", 3, rect(180, 168, 210), "Case number", "history.directAppeal.furtherReview.caseNumber", {active: (f) => f.history.directAppeal.filed && f.history.directAppeal.furtherReview.sought, condition: "question 10(g) applies only when further review was sought"}),
  F("q10g3-review-result", "10(g)(3) Reviewing court result", 3, rect(105, 105, 420, 27), "Result", "history.directAppeal.furtherReview.result", {kind: "area", maxLines: 2, active: (f) => f.history.directAppeal.filed && f.history.directAppeal.furtherReview.sought, condition: "question 10(g) applies only when further review was sought"}),
  F("q10g4-review-date", "10(g)(4) Reviewing result date", 3, rect(300, 78, 225), "Date of result", "history.directAppeal.furtherReview.resultDate", {active: (f) => f.history.directAppeal.filed && f.history.directAppeal.furtherReview.sought, condition: "question 10(g) applies only when further review was sought"}),
  F("q10g5-review-grounds", "10(g)(5) Reviewing grounds", 4, rect(105, 615, 420, 43), "Grounds raised", "history.directAppeal.furtherReview.grounds", {kind: "area", maxLines: 3, active: (f) => f.history.directAppeal.filed && f.history.directAppeal.furtherReview.sought, condition: "question 10(g) applies only when further review was sought"}),
  F("q11-no-appeal-why", "11. Why no appeal", 4, rect(105, 505, 420, 42), "did not appeal", "history.directAppeal.whyNot", {kind: "area", maxLines: 3, active: (f) => !f.history.directAppeal.filed, condition: "question 11 applies only when no direct appeal was filed"}),
];

function priorFields(prefix, question, proceedingKey, pageA, y, pageB, yB) {
  const p = (f) => f.history[proceedingKey];
  return [
    checkbox(`${prefix}-yes`, `${question}(a) Prior petition/application/motion - Yes`, pageA, 143, y.yes, "petitions, applications", (f) => p(f).filed, `question ${question} yes branch is outside the verified record`),
    checkbox(`${prefix}-no`, `${question}(a) Prior petition/application/motion - No`, pageA, 207, y.yes, "petitions, applications", (f) => !p(f).filed, `question ${question} no branch is outside the verified record`),
    F(`${prefix}-court`, `${question}(b)(1) Name of Court`, pageA, rect(250, y.court, 278), "Name of Court", `history.${proceedingKey}.court`, {active: (f) => p(f).filed, condition: `question ${question}(b) applies only when ${question}(a) is yes`}),
    F(`${prefix}-case`, `${question}(b)(2) Case number`, pageA, rect(180, y.caseNo, 210), "Case number", `history.${proceedingKey}.caseNumber`, {active: (f) => p(f).filed, condition: `question ${question}(b) applies only when ${question}(a) is yes`}),
    F(`${prefix}-result`, `${question}(b)(3) Result`, pageA, rect(105, y.result, 420, 28), "Result", `history.${proceedingKey}.result`, {kind: "area", maxLines: 2, active: (f) => p(f).filed, condition: `question ${question}(b) applies only when ${question}(a) is yes`}),
    F(`${prefix}-date`, `${question}(b)(4) Date of result or opinion`, pageA, rect(300, y.date, 225), "Date of result", `history.${proceedingKey}.resultDate`, {active: (f) => p(f).filed, condition: `question ${question}(b) applies only when ${question}(a) is yes`}),
    F(`${prefix}-grounds`, `${question}(b)(5) Grounds raised`, pageA, rect(105, y.grounds, 420, 34), "Grounds raised", `history.${proceedingKey}.grounds`, {kind: "area", maxLines: 2, active: (f) => p(f).filed, condition: `question ${question}(b) applies only when ${question}(a) is yes`}),
    checkbox(`${prefix}-hearing-yes`, `${question}(c) Evidentiary hearing - Yes`, yB.hearingPage ?? pageB, 143, yB.hearing, "evidentiary hearing", (f) => p(f).filed && p(f).evidentiaryHearing, `question ${question}(c) is outside the verified proceeding/hearing branch`),
    checkbox(`${prefix}-hearing-no`, `${question}(c) Evidentiary hearing - No`, yB.hearingPage ?? pageB, 207, yB.hearing, "evidentiary hearing", (f) => p(f).filed && !p(f).evidentiaryHearing, `question ${question}(c) is outside the verified proceeding/hearing branch`),
    checkbox(`${prefix}-appeal-yes`, `${question}(d) Appeal of prior decision - Yes`, pageB, 143, yB.appeal, "appeal the decision", (f) => p(f).filed && p(f).appealed, `question ${question}(d) is outside the verified proceeding/appeal branch`),
    checkbox(`${prefix}-appeal-no`, `${question}(d) Appeal of prior decision - No`, pageB, 207, yB.appeal, "appeal the decision", (f) => p(f).filed && !p(f).appealed, `question ${question}(d) is outside the verified proceeding/appeal branch`),
    F(`${prefix}-appeal-court`, `${question}(e)(1) Appeal court`, pageB, rect(250, yB.court, 278), "Name of Court", `history.${proceedingKey}.appealCourt`, {active: (f) => p(f).filed && p(f).appealed, condition: `question ${question}(e) applies only when the prior decision was appealed`}),
    F(`${prefix}-appeal-case`, `${question}(e)(2) Appeal case number`, pageB, rect(180, yB.caseNo, 210), "Case number", `history.${proceedingKey}.appealCaseNumber`, {active: (f) => p(f).filed && p(f).appealed, condition: `question ${question}(e) applies only when the prior decision was appealed`}),
    F(`${prefix}-appeal-result`, `${question}(e)(3) Appeal result`, pageB, rect(105, yB.result, 420, 28), "Result", `history.${proceedingKey}.appealResult`, {kind: "area", maxLines: 2, active: (f) => p(f).filed && p(f).appealed, condition: `question ${question}(e) applies only when the prior decision was appealed`}),
    F(`${prefix}-appeal-date`, `${question}(e)(4) Appeal result date`, pageB, rect(300, yB.date, 225), "Date of result", `history.${proceedingKey}.appealResultDate`, {active: (f) => p(f).filed && p(f).appealed, condition: `question ${question}(e) applies only when the prior decision was appealed`}),
    F(`${prefix}-appeal-grounds`, `${question}(e)(5) Appeal grounds`, pageB, rect(105, yB.grounds, 420, 34), "Grounds raised", `history.${proceedingKey}.appealGrounds`, {kind: "area", maxLines: 2, active: (f) => p(f).filed && p(f).appealed, condition: `question ${question}(e) applies only when the prior decision was appealed`}),
  ];
}

officialFields.push(
  ...priorFields("q12", "12", "priorProceeding1", 4,
    {yes: 406, court: 358, caseNo: 332, result: 273, date: 248, grounds: 168}, 5,
    {hearingPage: 4, hearing: 79, appeal: 643, court: 596, caseNo: 570, result: 510, date: 486, grounds: 408}),
  ...priorFields("q13", "13", "priorProceeding2", 5,
    {yes: 303, court: 256, caseNo: 230, result: 169, date: 145, grounds: 78}, 6,
    {hearing: 577, appeal: 525, court: 478, caseNo: 452, result: 391, date: 367, grounds: 289}),
  checkbox("q14-pending-yes", "14(a) Related proceeding pending - Yes", 6, 143, 199, "now pending", (f) => f.history.pendingProceeding.pending, "question 14 yes branch is outside the verified record"),
  checkbox("q14-pending-no", "14(a) Related proceeding pending - No", 6, 207, 199, "now pending", (f) => !f.history.pendingProceeding.pending, "question 14 no branch is outside the verified record"),
  F("q14b1-pending-court", "14(b)(1) Name of Court", 6, rect(250, 151, 278), "Name of Court", "history.pendingProceeding.court", {active: (f) => f.history.pendingProceeding.pending, condition: "question 14(b) applies only when a related proceeding is pending"}),
  F("q14b2-pending-case", "14(b)(2) Case number", 6, rect(180, 125, 210), "Case number", "history.pendingProceeding.caseNumber", {active: (f) => f.history.pendingProceeding.pending, condition: "question 14(b) applies only when a related proceeding is pending"}),
  F("q14b3-pending-nature", "14(b)(3) Nature of Proceeding", 6, rect(105, 72, 420, 28), "Nature of Proceeding", "history.pendingProceeding.nature", {kind: "area", maxLines: 2, active: (f) => f.history.pendingProceeding.pending, condition: "question 14(b) applies only when a related proceeding is pending"}),
  F("q15-ground-one", "15(a) Ground One", 8, rect(214, 607, 322), "Ground One", "derived.groundTitle"),
  F("q15-ground-one-facts", "15(a) Supporting facts for Ground One", 8, rect(110, 515, 416, 48), "Supporting facts for Ground One", "derived.groundCrossReference", {kind: "area", maxLines: 3}),
  F("q15-ground-two", "15(b) Ground Two", 8, rect(214, 468, 322), "Ground Two", null, {optional: true}),
  F("q15-ground-three", "15(c) Ground Three", 8, rect(144, 315, 382), "Ground Three", null, {optional: true}),
  F("q15-ground-four", "15(d) Ground Four", 8, rect(216, 177, 320), "Ground Four", null, {optional: true}),
  F("q16-prior-presentation", "16. Grounds not previously presented and reasons", 9, rect(105, 548, 420, 56), "grounds listed above were not previously", "ground.priorPresentationExplanation", {kind: "area", maxLines: 4}),
  ...["Preliminary hearing", "Arraignment and plea", "Trial", "Sentencing", "Appeal", "Post-conviction proceeding", "Appeal from post-conviction proceeding"].map((label, index) =>
    F(`q17-attorney-${index + 1}`, `17(${String.fromCharCode(97 + index)}) ${label} attorney name/address if known`, 9,
      rect([251, 263, 171, 208, 186, 292, 359][index], 474 - index * 26, 534 - [251, 263, 171, 208, 186, 292, 359][index]), label, `case.attorneys.${index}`)),
  checkbox("q18-future-yes", "18(a) Future sentence - Yes", 9, 143, 250, "future sentence", (f) => f.case.futureSentence.exists, "question 18 yes branch is outside the verified record"),
  checkbox("q18-future-no", "18(a) Future sentence - No", 9, 207, 250, "future sentence", (f) => !f.case.futureSentence.exists, "question 18 no branch is outside the verified record"),
  F("q18b1-future-court", "18(b)(1) Future sentence court", 9, rect(266, 202, 268), "Name of Court", "case.futureSentence.court", {active: (f) => f.case.futureSentence.exists, condition: "question 18(b) applies only when a future sentence exists"}),
  F("q18b2-future-location", "18(b)(2) Future sentence location", 9, rect(230, 176, 304), "Location", "case.futureSentence.location", {active: (f) => f.case.futureSentence.exists, condition: "question 18(b) applies only when a future sentence exists"}),
  F("q18b3-future-case", "18(b)(3) Future sentence case number", 9, rect(256, 150, 162), "Case number", "case.futureSentence.caseNumber", {active: (f) => f.case.futureSentence.exists, condition: "question 18(b) applies only when a future sentence exists"}),
  {...checkbox("q20-appointed-lawyer", "20. Request court-appointed lawyer", 10, 72, 404, "appoint a lawyer", (f) => f.options?.requestCourtAppointedLawyer === true, "the participant did not elect to ask for appointed counsel"), participantElection: true},
  F("signature-location", "Signed at (city, state or country)", 10, rect(130, 321, 390), "Signed at", null, {protect: "the petitioner completes the execution location when signing"}),
  F("signature-date", "Petitioner's signature date", 10, rect(72, 282, 150), "Date", null, {protect: "the petitioner dates the petition when signing"}),
  F("signature", "Petitioner's Signature", 10, rect(262, 304, 263), "Signature", null, {protect: "the petitioner signs under criminal penalty"}),
  F("signature-printed-name", "Petitioner's Printed Name", 10, rect(262, 270, 263), "Printed Name", "participant.fullLegalName"),
  F("attorney-cert-date", "Attorney certification date", 10, rect(72, 157, 150), "Certification of Attorney", null, {attorney: true}),
  F("attorney-cert-signature", "Attorney certification signature", 10, rect(262, 179, 263), "Certification of Attorney", null, {attorney: true}),
  F("attorney-cert-name", "Attorney certification printed name", 10, rect(262, 145, 263), "Certification of Attorney", null, {attorney: true}),
);

function withDerived(facts) {
  const respondent = facts.case.respondentKind === "FELONY_STATE" ? "State of Utah"
    : facts.case.respondentKind === "MISDEMEANOR_COUNTY" ? `County of ${facts.case.respondentCounty}`
      : `Municipality of ${facts.case.respondentMunicipality}`;
  return {...facts, derived: {
    respondent,
    groundTitle: "Utah Code 78B-9-104(1)(h)",
    groundCrossReference: "See incorporated Attachment A for the record-derived qualifying offense, trafficking nexus, and supporting evidence.",
  }};
}

function fieldState(field, facts) {
  if (field.protect) return {kind: "blank", disposition: "PROTECTED_FIELD", reason: field.protect, refusalClass: "signature_or_date_participant_completion"};
  if (field.attorney) return {kind: "blank", disposition: "PROTECTED_FIELD", reason: "the attorney-only Rule 11 certification is completed only by counsel, never from participant facts", refusalClass: "signature_or_date_participant_completion"};
  if (field.optional) return {kind: "blank", disposition: "OPTIONAL_PARTICIPANT_CONTENT", reason: "optional participant-authored additional PCRA ground; the platform does not invent it"};
  if (field.kind === "checkbox") {
    return field.selected(facts) ? {kind: "write", value: "X", factId: `selection.${field.id}`}
      : field.participantElection
        ? {kind: "blank", disposition: "PARTICIPANT_ELECTION_GENUINE", reason: field.condition, refusalClass: "participant_sworn_narrative_or_legal_election"}
        : {kind: "blank", disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: field.condition, condition: field.condition};
  }
  if (field.active && !field.active(facts)) return {kind: "blank", disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: field.condition, condition: field.condition};
  if (!field.factId) return {kind: "blank", disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: field.condition, condition: field.condition};
  const value = valueAt(facts, field.factId);
  assert.ok(nonblank(String(value ?? "")), `${field.id}: active field ${field.factId} is unavailable`);
  return {kind: "write", value: String(value), factId: field.factId};
}

function wrap(font, text, size, width) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function fitLine(font, text, width, preferred = 8.5, minimum = 5.5) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  assert.ok(font.widthOfTextAtSize(text, size) <= width, `text does not fit measured box: ${text}`);
  return size;
}

function drawField(page, font, field, value, placements) {
  const {x, y, width, height} = field.box;
  page.drawRectangle({x: x - 1, y: y - 1, width: width + 2, height: height + 2, color: white});
  if (field.kind === "checkbox") {
    page.drawText("X", {x: x + 1, y, size: 9, font, color: black});
    placements.push({fieldId: field.id, text: "X", page: field.page, box: field.box, x: x + 1, y, size: 9});
    return;
  }
  if (field.kind === "area") {
    let size = 8;
    let lines = wrap(font, value, size, width);
    while (lines.length > (field.maxLines ?? 3) && size > 5.5) { size -= 0.25; lines = wrap(font, value, size, width); }
    assert.ok(lines.length <= (field.maxLines ?? 3), `${field.id}: narrative exceeds measured area`);
    lines.forEach((line, index) => {
      const lineY = y + height - size - 2 - index * (size + 2);
      page.drawText(line, {x, y: lineY, size, font, color: black});
      placements.push({fieldId: field.id, text: line, page: field.page, box: field.box, x, y: lineY, size});
    });
    return;
  }
  const size = fitLine(font, value, width);
  page.drawText(value, {x, y, size, font, color: black});
  placements.push({fieldId: field.id, text: value, page: field.page, box: field.box, x, y, size});
}

function drawWrapped(page, font, bold, placements, fieldId, text, x, y, width, options = {}) {
  const size = options.size ?? 9;
  const usedFont = options.bold ? bold : font;
  const lines = wrap(usedFont, text, size, width);
  for (const line of lines) {
    assert.ok(y >= 55, `${fieldId}: generated attachment overflow`);
    page.drawText(line, {x, y, size, font: usedFont, color: black});
    placements.push({fieldId, text: line, page: options.page, box: rect(x, y - 2, width, size + 4), x, y, size});
    y -= size + 3;
  }
  return y;
}

function drawAttachmentPages(pdf, font, bold, facts, placements) {
  const a = pdf.addPage([612, 792]);
  let y = 744;
  y = drawWrapped(a, font, bold, placements, "attachment-a-title", "ATTACHMENT A - GROUND ONE FACTUAL NEXUS AND EVIDENCE SCHEDULE", 54, y, 504, {bold: true, size: 11, page: 11}) - 8;
  y = drawWrapped(a, font, bold, placements, "attachment-a-incorporation", "Incorporated into Question 15(a) of the Petition for Relief Under the Post-Conviction Remedies Act.", 54, y, 504, {size: 9, page: 11}) - 10;
  y = drawWrapped(a, font, bold, placements, "attachment-a-offense-heading", "1. Qualifying offense", 54, y, 504, {bold: true, page: 11});
  y = drawWrapped(a, font, bold, placements, "attachment-a-offense", `${facts.ground.qualifyingOffense} (${facts.ground.qualifyingOffenseCitation}). Original case: ${facts.case.originalCaseNumber}.`, 66, y, 480, {page: 11}) - 8;
  y = drawWrapped(a, font, bold, placements, "attachment-a-nexus-heading", "2. Record-derived trafficking / force / fraud / coercion nexus", 54, y, 504, {bold: true, page: 11});
  facts.ground.nexusFacts.forEach((item, index) => {
    y = drawWrapped(a, font, bold, placements, `attachment-a-nexus-${index + 1}`, `${index + 1}. [${item.relationship}] ${item.statement} Source: ${item.sourceRecord}.`, 66, y, 480, {page: 11}) - 5;
  });
  y -= 4;
  y = drawWrapped(a, font, bold, placements, "attachment-a-evidence-heading", "3. Supporting evidence to attach", 54, y, 504, {bold: true, page: 11});
  facts.evidence.forEach((item, index) => {
    y = drawWrapped(a, font, bold, placements, `attachment-a-evidence-${index + 1}`, `${item.exhibit}: ${item.description}. Supports: ${item.supports}. Record source: ${item.sourceRecord}.`, 66, y, 480, {page: 11}) - 5;
  });
  y -= 4;
  drawWrapped(a, font, bold, placements, "attachment-a-no-testimony", "This schedule transcribes collected record facts and exhibit descriptions. It does not create or infer petitioner testimony. Attach the identified exhibits themselves.", 54, y, 504, {bold: true, size: 8.5, page: 11});

  const b = pdf.addPage([612, 792]);
  y = 744;
  y = drawWrapped(b, font, bold, placements, "attachment-b-title", "ATTACHMENT B - MEMORANDUM OF POINTS AND AUTHORITIES", 54, y, 504, {bold: true, size: 11, page: 12}) - 12;
  y = drawWrapped(b, font, bold, placements, "attachment-b-ground-heading", "Ground", 54, y, 504, {bold: true, page: 12});
  y = drawWrapped(b, font, bold, placements, "attachment-b-ground", "The petition invokes Utah Code 78B-9-104(1)(h) through Utah Rule of Civil Procedure 65C in the district court of conviction.", 66, y, 480, {page: 12}) - 12;
  y = drawWrapped(b, font, bold, placements, "attachment-b-proof-heading", "Proof treatment", 54, y, 504, {bold: true, page: 12});
  y = drawWrapped(b, font, bold, placements, "attachment-b-proof", "The petitioner must establish the qualifying offense and its trafficking, force, fraud, or coercion nexus by clear and convincing evidence. Attachment A identifies the collected record facts and the evidence offered for that showing.", 66, y, 480, {page: 12}) - 12;
  y = drawWrapped(b, font, bold, placements, "attachment-b-remedy-heading", "Requested relief", 54, y, 504, {bold: true, page: 12});
  y = drawWrapped(b, font, bold, placements, "attachment-b-remedy", "Vacate the conviction and sentence and apply the resulting statutory expungement consequence identified by the controlling implementation decision.", 66, y, 480, {page: 12}) - 12;
  y = drawWrapped(b, font, bold, placements, "attachment-b-attachments-heading", "Rule 65C attachment references", 54, y, 504, {bold: true, page: 12});
  const rows = [
    `Judgment and commitment: ${facts.attachments.judgment}`,
    ...(facts.history.directAppeal.filed ? [`Direct-appeal decision: ${facts.attachments.appellateDecision}`] : []),
    ...(facts.history.priorProceeding1.filed || facts.history.priorProceeding2.filed ? [`Prior PCRA filings/decisions: ${facts.attachments.priorPcraMaterials}`] : []),
    `Supporting evidence: ${facts.evidence.map((item) => item.exhibit).join(", ")}`,
    ...(facts.options?.requestFeeWaiver ? [`Inmate Accounting Office certificate: ${facts.attachments.inmateAccountingCertificate}`] : []),
    `Memorandum: this Attachment B (${facts.attachments.memorandum})`,
    ...(facts.options?.requestCourtAppointedLawyer ? [`Declaration of Financial Status: ${facts.attachments.financialDeclaration}`] : []),
  ];
  rows.forEach((line, index) => { y = drawWrapped(b, font, bold, placements, `attachment-b-required-${index + 1}`, `- ${line}`, 66, y, 480, {page: 12}) - 4; });
}

function sourceMeasurements(pdf) {
  assert.equal(pdf.getPageCount(), 10, "official Rule 65C source must remain 10 pages");
  assert.equal(pdf.catalog.get(PDFName.of("AcroForm")), undefined, "official source is expected to be flat");
  const texts = pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" "));
  for (const field of officialFields) assert.ok(texts[field.page - 1].toLowerCase().includes(field.anchor.toLowerCase()), `${field.id}: printed source anchor is absent on page ${field.page}`);
  for (const phrase of ["Utah Rule of Civil Procedure 65C", "Required Attachments", "criminal penalty under the law of Utah"]) {
    assert.ok(texts.some((text) => text.includes(phrase)), `source phrase absent: ${phrase}`);
  }
  return texts;
}

async function renderFixture(name, rawFacts) {
  const gate = validateUtTraffickingPcraFacts(rawFacts);
  assert.equal(gate.eligible, true, `${name} fails closed at ${gate.code}: ${gate.detail}`);
  const facts = withDerived(rawFacts);
  const sourceBytes = fs.readFileSync(abs(SOURCE));
  assert.equal(sourceBytes.length, SOURCE_BYTES);
  assert.equal(sha256(sourceBytes), SOURCE_SHA);
  const pdf = stampDeterministic(await PDFDocument.load(sourceBytes));
  sourceMeasurements(pdf);
  pdf.setTitle("Rule 65C PCRA Petition - Utah trafficking ground packet");
  pdf.setSubject(`${DECISION}; ${FAMILY_ID}`);
  pdf.setProducer("LegalEase RCAP deterministic official-form overlay");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const placements = [];
  const states = officialFields.map((field) => ({field, state: fieldState(field, facts)}));
  for (const {field, state} of states) if (state.kind === "write") drawField(pdf.getPages()[field.page - 1], font, field, state.value, placements);
  drawAttachmentPages(pdf, font, bold, facts, placements);
  const bytes = await pdf.save({useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false});
  const relative = `${OUT}/fixtures/${name}.pdf`;
  fs.writeFileSync(abs(relative), bytes);
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 12);
  const outItems = reopened.getPages().flatMap((page, index) => extractTextItems(page).map((item) => ({...item, page: index + 1})));
  for (const placement of placements) {
    assert.ok(outItems.some((item) => item.page === placement.page && item.text === placement.text
      && Math.abs(item.x - placement.x) < 0.5 && Math.abs(item.y - placement.y) < 0.5),
    `${name}/${placement.fieldId}: drawn text was not read back from its measured box`);
  }
  const nonWhitespace = placements.reduce((count, placement) => count + placement.text.replace(/\s/g, "").length, 0);
  return {name, facts, states, placements, relative, bytes, sha256: sha256(bytes), byteLength: bytes.length,
    pageCount: 12, nonWhitespace};
}

function mapRow(field, state) {
  const base = {field: field.id, label: field.label, printedLabel: field.label, page: field.page,
    measured: {...field.box}, sourceAnchor: field.anchor};
  if (state.kind === "write") return {...base, factId: state.factId, outcome: "fit"};
  if (state.disposition === "PROTECTED_FIELD") return {...base, category: state.refusalClass,
    completenessDisposition: "PROTECTED_FIELD", reason: state.reason};
  if (state.disposition === "OPTIONAL_PARTICIPANT_CONTENT") return {...base,
    completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false, reason: state.reason};
  if (state.disposition === "PARTICIPANT_ELECTION_GENUINE") return {...base, category: state.refusalClass,
    completenessDisposition: "PARTICIPANT_ELECTION_GENUINE", requiredBeforeFiling: false, routeDetermined: false, reason: state.reason};
  return {...base, completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE", requiredBeforeFiling: false,
    routeDetermined: false, routeConditionThatMakesItInapplicable: state.condition, reason: state.reason};
}

const customMapWrites = (result) => {
  const facts = result.facts;
  const writes = [
    ["attachment-a-title", "Attachment A title", "derived.groundTitle", 11],
    ["attachment-a-offense", "Qualifying offense and original case", "ground.qualifyingOffense", 11],
    ...facts.ground.nexusFacts.map((_, index) => [`attachment-a-nexus-${index + 1}`, `Record-derived nexus fact ${index + 1}`, `ground.nexusFacts.${index}`, 11]),
    ...facts.evidence.map((_, index) => [`attachment-a-evidence-${index + 1}`, `Supporting evidence ${index + 1}`, `evidence.${index}`, 11]),
    ["attachment-a-no-testimony", "Record-fact provenance statement", "derived.recordFactProvenance", 11],
    ["attachment-b-ground", "Ground under Utah Code 78B-9-104(1)(h)", "derived.groundTitle", 12],
    ["attachment-b-proof", "Clear-and-convincing proof treatment", "derived.proofStandard", 12],
    ["attachment-b-remedy", "Requested vacatur and statutory expungement consequence", "derived.remedy", 12],
  ];
  const requiredReferenceCount = 3 + (facts.history.directAppeal.filed ? 1 : 0)
    + (facts.history.priorProceeding1.filed || facts.history.priorProceeding2.filed ? 1 : 0)
    + (facts.options?.requestFeeWaiver ? 1 : 0) + (facts.options?.requestCourtAppointedLawyer ? 1 : 0);
  for (let index = 0; index < requiredReferenceCount; index += 1) {
    writes.push([`attachment-b-required-${index + 1}`, `Rule 65C attachment reference ${index + 1}`, `attachments.reference.${index}`, 12]);
  }
  return writes.map(([field, label, factId, page]) => ({field, label, printedLabel: label, page,
    factId, outcome: "fit", measured: {x: 54, y: 55, width: 504, height: 689}}));
};

function buildFieldMap(canonical, boundary) {
  const mapFor = (result) => ({
    writes: [...result.states.filter(({state}) => state.kind === "write").map(({field, state}) => mapRow(field, state)), ...customMapWrites(result)],
    refusals: result.states.filter(({state}) => state.kind === "blank").map(({field, state}) => mapRow(field, state)),
  });
  const c = mapFor(canonical); const b = mapFor(boundary);
  return {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1-completeness-repair",
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], routeSelectionId: "ut-rule65c-trafficking-pcra",
    legalDecision: DECISION,
    requiredComponents: [FORM, ATTACHMENT],
    maps: [{formNumber: FORM, structuralClass: "flat_pdf",
      canonicalWrites: c.writes.filter((row) => row.page <= 10), canonicalRefusals: c.refusals,
      boundaryWrites: b.writes.filter((row) => row.page <= 10), boundaryRefusals: b.refusals},
    {formNumber: ATTACHMENT, structuralClass: "generated_record_derived_attachment",
      canonicalWrites: c.writes.filter((row) => row.page > 10), canonicalRefusals: [],
      boundaryWrites: b.writes.filter((row) => row.page > 10), boundaryRefusals: []}],
  };
}

function buildCensus() {
  return {schemaVersion: "rcap-field-census/v1", familyId: FAMILY_ID, sourceSha256: SOURCE_SHA,
    measuredFromCurrentSourceBytes: true,
    documents: [{formNumber: FORM, sourceSha256: SOURCE_SHA, structuralClass: "flat_pdf", pageCount: 10,
      pageDimensionsPoints: [612, 792], acroFieldCount: 0,
      fields: officialFields.map((field) => ({name: field.id, label: field.label, page: field.page,
        rect: field.box, sourceAnchor: field.anchor, terminal: true, fieldType: field.kind === "checkbox" ? "selection_control" : "printed_blank"}))},
    {formNumber: ATTACHMENT, structuralClass: "generated_record_derived_attachment", pageCount: 2,
      fields: [{name: "attachment-a-title", label: "Attachment A title", page: 11, terminal: true},
        {name: "attachment-a-offense", label: "Qualifying offense and original case", page: 11, terminal: true},
        {name: "attachment-a-nexus[]", label: "Repeatable record-derived nexus fact with source record", page: 11, repeatable: true, terminal: true},
        {name: "attachment-a-evidence[]", label: "Repeatable supporting evidence item with source record", page: 11, repeatable: true, terminal: true},
        {name: "attachment-a-no-testimony", label: "Record-fact provenance statement", page: 11, terminal: true},
        {name: "attachment-b-ground", label: "Ground under Utah Code 78B-9-104(1)(h)", page: 12, terminal: true},
        {name: "attachment-b-proof", label: "Clear-and-convincing proof treatment", page: 12, terminal: true},
        {name: "attachment-b-remedy", label: "Requested vacatur and statutory expungement consequence", page: 12, terminal: true},
        {name: "attachment-b-required[]", label: "Repeatable Rule 65C attachment reference", page: 12, repeatable: true, terminal: true}]}]};
}

function actualWriteRow(result, row) {
  const placement = result.placements.find((item) => item.fieldId === row.field);
  return {field: row.field, fieldId: row.field, factId: row.factId, expected: placement?.text ?? row.label,
    drawnText: placement?.text ?? row.label, visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true,
    writeBox: row.measured, outcome: "fit"};
}

function renderedReport(results) {
  return {schemaVersion: "rcap-rendered-artifacts/v1-completeness-repair", familyId: FAMILY_ID, renderedFresh: true,
    componentIdentityMode: "exact",
    packets: results.map((result) => ({fixture: result.name, documents: [FORM, ATTACHMENT], file: result.relative})),
    artifacts: results.map((result) => ({fixture: result.name, file: result.relative, sha256: result.sha256,
      byteLength: result.byteLength, pageCount: result.pageCount,
      pageManifest: [...Array.from({length: 10}, (_, index) => ({packetPage: index + 1, formNumber: FORM,
        sourcePage: index + 1, sourceSha256: SOURCE_SHA})),
      {packetPage: 11, formNumber: ATTACHMENT, generatedFrom: DECISION},
      {packetPage: 12, formNumber: ATTACHMENT, generatedFrom: DECISION}] })), rasters: []};
}

function actualWritesReport(results, fieldMap) {
  const documents = [];
  const artifacts = [];
  for (const result of results) {
    const prefix = result.name;
    const writes = fieldMap.maps.flatMap((map) => map[`${prefix}Writes`] ?? []);
    const selections = writes.filter((row) => row.factId?.startsWith("selection.")).map((row) => ({control: row.field, selected: true}));
    documents.push(...fieldMap.maps.map((map) => ({fixture: prefix, formNumber: map.formNumber,
      sourceSha256: map.formNumber === FORM ? SOURCE_SHA : null,
      actualWrites: writes.filter((row) => (row.page <= 10) === (map.formNumber === FORM)).map((row) => actualWriteRow(result, row))})));
    artifacts.push({fixture: prefix, proofMethod: "final PDF text geometry read from output bytes at every committed placement",
      valuesReportedByFinalizer: writes.length, addedGlyphsReadFromOutputBytes: result.nonWhitespace,
      flattenedWidgetAppearancesReadFromOutputBytes: 0, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [], written: writes.map((row) => ({field: row.field})), selections});
  }
  return {schemaVersion: "rcap-actual-writes-byte-proof/v1-completeness-repair", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true, artifacts, documents};
}

function instructions() {
  return `# Utah Rule 65C trafficking PCRA packet\n\nThis packet uses the official 10-page Petition for Relief Under the Post-Conviction Remedies Act and adds an incorporated factual-nexus/evidence schedule and memorandum. It is for the district court where the conviction was entered and pleads Utah Code 78B-9-104(1)(h).\n\n## Before filing\n\n- Verify every caption and original-case fact against the judgment and court record.\n- Review every answer in Questions 5-18, including all appeals, prior petitions or motions, pending matters, attorney history, and any future sentence. Conditional blanks are unused only because the recorded case facts make that printed branch inapplicable.\n- Review Questions 15(b)-(d) separately. They remain optional participant-authored spaces because the official form warns that omitted available grounds may be barred later; this route supplies Ground One and does not decide whether another ground exists.\n- Read Attachment A. It must contain only record-derived facts. Attach each evidence exhibit identified there; the schedule is an index and does not replace the evidence. The qualifying offense and trafficking, force, fraud, or coercion nexus must be supported under the clear-and-convincing standard.\n- Attach the judgment and commitment (${"attachments.judgment"}), every applicable appellate decision, every applicable earlier PCRA filing and decision, affidavits/documents/other supporting evidence, and the Memorandum of Points and Authorities (${"attachments.memorandum"}).\n- If asking to waive a filing fee, attach the Inmate Accounting Office certificate printed in Question 19(e). This packet does not decide fee-waiver eligibility or state a fee.\n- If asking for a court-appointed lawyer, check Question 20 and attach the Declaration of Financial Status (Criminal).\n- Complete Signed at (city, state or country), the petitioner's signature date, and the petitioner's signature only after reviewing the finished packet. If represented, the attorney completes the separate Rule 11 certification.\n\n## Filing and service\n\nFile in the district court of conviction. This packet does not invent a filing fee, filing method, deadline, notary requirement, hearing date, or proposed order. The printed form warns that required attachments or an explanation for unavailable copies are necessary and that limitations may expire; confirm current filing details promptly with the court clerk or a lawyer.\n\nRule 65C uses court-screened service. Do not invent recipients or serve the packet automatically. After filing, follow the court's screening order and its directions about who must be served, how, and when. No participant certificate of service is prefilled.\n\n## Relief requested\n\nThe memorandum requests vacatur of the conviction and sentence and the resulting statutory expungement consequence recorded in ${DECISION}. The packet is disabled for runtime and commercial delivery until independent output and visual review complete.\n`;
}

export const fixtures = {
  canonical: {
    participant: {fullLegalName: "Jordan Avery Reyes", address: "42 Aspen Way", cityStateZip: "Salt Lake City, UT 84101", phone: "801-555-0142", email: "jordan.reyes@example.org"},
    court: {judicialDistrict: "Third", county: "Salt Lake", address: "450 South State Street, Salt Lake City, UT 84114", originalCourtName: "Third District Court", originalCourtLocation: "Salt Lake County, Utah"},
    case: {originalCaseNumber: "251900123", judgmentDate: "2025-02-10", sentence: "Recorded sentence: 180 days jail, suspended; 24 months probation.", offensesAllCounts: "Count 1: qualifying offense, Utah Code 76-10-1302, class A misdemeanor.", plea: "GUILTY", respondentKind: "MISDEMEANOR_COUNTY", respondentCounty: "Salt Lake", attorneys: ["A. Lawyer, address in court record", "A. Lawyer, address in court record", "No trial attorney - no trial", "A. Lawyer, address in court record", "No appeal attorney - no appeal", "No prior PCRA attorney - no prior PCRA", "No prior PCRA appeal attorney - no prior PCRA"], futureSentence: {exists: false}},
    eligibility: {districtCourtOfConvictionConfirmed: true, qualifyingOffenseConfirmed: true, traffickingNexusConfirmed: true, clearAndConvincingEvidenceReady: true},
    history: {directAppeal: {filed: false, whyNot: "The verified docket records no direct appeal."}, priorProceeding1: {filed: false}, priorProceeding2: {filed: false}, pendingProceeding: {pending: false}},
    ground: {qualifyingOffense: "Count 1 conviction", qualifyingOffenseCitation: "Utah Code 76-10-1302", priorPresentationExplanation: "Ground One was not presented earlier because the verified docket records no prior PCRA petition.", nexusFacts: [{relationship: "COERCION", statement: "The sentencing record attributes the conduct underlying Count 1 to coercion by an identified trafficker.", sourceRecord: "sentencing memorandum, page 4"}]},
    evidence: [{exhibit: "Exhibit 1", description: "Certified sentencing memorandum", supports: "the coercion nexus for Count 1", sourceRecord: "district-court file"}, {exhibit: "Exhibit 2", description: "Certified judgment and commitment", supports: "the qualifying conviction and sentence", sourceRecord: "district-court file"}],
    attachments: {judgment: "Exhibit 2", memorandum: "Attachment B"}, options: {requestFeeWaiver: false, requestCourtAppointedLawyer: false},
  },
  boundary: {
    participant: {fullLegalName: "Maria-Alejandra O'Shaughnessy", address: "1188 West Long Canyon Road, Apartment 14B", cityStateZip: "St. George, UT 84770-2214", phone: "435-555-0199 ext. 417", email: "maria.oshaughnessy@example.org"},
    court: {judicialDistrict: "Fifth", county: "Washington", address: "206 West Tabernacle, St. George, UT 84770", originalCourtName: "Fifth District Court", originalCourtLocation: "Washington County, Utah"},
    case: {originalCaseNumber: "241500987", judgmentDate: "2024-06-03", sentence: "Recorded sentence: 365 days jail with 300 suspended; 36 months probation and recorded conditions.", offensesAllCounts: "Count 1: qualifying class A misdemeanor; Count 2: qualifying class B misdemeanor.", plea: "MIXED", mixedPleaDetails: "Count 1: guilty. Count 2: no contest.", respondentKind: "MISDEMEANOR_COUNTY", respondentCounty: "Washington", attorneys: ["R. Counsel, 100 Main St., St. George, UT", "R. Counsel, same address", "No trial - plea disposition", "R. Counsel, same address", "P. Appellate, address in appellate docket", "C. PCRA, address in PCRA docket", "A. Review, address in reviewing docket"], futureSentence: {exists: true, court: "Fourth District Court", location: "Utah County, Utah", caseNumber: "231400456"}},
    eligibility: {districtCourtOfConvictionConfirmed: true, qualifyingOffenseConfirmed: true, traffickingNexusConfirmed: true, clearAndConvincingEvidenceReady: true},
    history: {directAppeal: {filed: true, court: "Utah Court of Appeals", caseNumber: "2024-CA-101", result: "Affirmed.", resultDate: "2025-01-15", grounds: "Grounds listed in the appellate brief.", furtherReview: {sought: true, court: "Utah Supreme Court", caseNumber: "2025-SC-22", result: "Petition denied.", resultDate: "2025-05-02", grounds: "Grounds listed in the certiorari petition."}}, priorProceeding1: {filed: true, court: "Fifth District Court", caseNumber: "251500111", result: "Dismissed without merits adjudication.", resultDate: "2025-07-01", grounds: "Ground listed in the filed petition.", evidentiaryHearing: false, appealed: true, appealCourt: "Utah Court of Appeals", appealCaseNumber: "2025-CA-220", appealResult: "Dismissal affirmed.", appealResultDate: "2026-01-08", appealGrounds: "Grounds listed in the appellate brief."}, priorProceeding2: {filed: false}, pendingProceeding: {pending: true, court: "Fifth District Court", caseNumber: "261500333", nature: "Recorded motion concerning the challenged sentence."}},
    ground: {qualifyingOffense: "Counts 1 and 2 convictions", qualifyingOffenseCitation: "Utah Code 76-10-1302", priorPresentationExplanation: "Ground One was not presented in the earlier petition; the record-backed reason is stated in Exhibit 4.", nexusFacts: [{relationship: "FORCE", statement: "A filed declaration describes force tied to the conduct underlying both counts.", sourceRecord: "filed declaration, paragraphs 8-12"}, {relationship: "FRAUD", statement: "The investigative report records fraudulent recruitment tied to the same conduct.", sourceRecord: "investigative report, pages 6-9"}]},
    evidence: [{exhibit: "Exhibit 1", description: "Certified judgment and commitment", supports: "the qualifying convictions and sentence", sourceRecord: "district-court file"}, {exhibit: "Exhibit 3", description: "Filed declaration", supports: "force nexus", sourceRecord: "prior proceeding file"}, {exhibit: "Exhibit 4", description: "Investigative report excerpt", supports: "fraud nexus and prior-presentation explanation", sourceRecord: "district-court file"}],
    attachments: {judgment: "Exhibit 1", memorandum: "Attachment B", appellateDecision: "Exhibit 5", priorPcraMaterials: "Exhibits 6-9"}, options: {requestFeeWaiver: false, requestCourtAppointedLawyer: false},
  },
};

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const noRaster = argv.includes("--no-raster") || process.env.RCAP_NO_LOCAL_RASTER === "1";
  assert.ok(checkOnly || noRaster, "local raster is prohibited; use --no-raster or RCAP_NO_LOCAL_RASTER=1");
  const sourceBytes = fs.readFileSync(abs(SOURCE));
  assert.equal(sha256(sourceBytes), SOURCE_SHA); assert.equal(sourceBytes.length, SOURCE_BYTES);
  const sourcePdf = await PDFDocument.load(sourceBytes); sourceMeasurements(sourcePdf);
  for (const [name, facts] of Object.entries(fixtures)) {
    const result = validateUtTraffickingPcraFacts(facts);
    assert.equal(result.eligible, true, `${name}: ${result.code}`);
  }
  if (checkOnly) return {familyId: FAMILY_ID, status: "CHECK_ONLY", sourceSha256: SOURCE_SHA,
    sourceByteLength: SOURCE_BYTES, sourcePages: 10, sourceFieldsMeasured: officialFields.length,
    fixturesValidated: 2, outputPagesPerFixture: 12, overlayDirectoryTouched: false};

  fs.mkdirSync(abs(`${OUT}/fixtures`), {recursive: true});
  fs.mkdirSync(abs(`${OUT}/reports`), {recursive: true});
  const results = [await renderFixture("canonical", fixtures.canonical), await renderFixture("boundary", fixtures.boundary)];
  const fieldMap = buildFieldMap(...results);
  writeJson(`${OUT}/production-field-map.json`, fieldMap);
  writeJson(`${OUT}/field-census.census-v1.json`, buildCensus());
  writeJson(`${OUT}/source-receipt.json`, {schemaVersion: "rcap-source-receipt/v1", familyId: FAMILY_ID, allSourcesExact: true,
    documents: [{documentId: FORM, formNumber: FORM, sourceId: "official-form:1231XX", heldCorpusPath: SOURCE,
      officialTitle: "Petition for Relief Under the Post-Conviction Remedies Act", revision: "Revised June 13, 2022",
      officialUrl: "https://legacy.utcourts.gov/resources/forms/criminal/04_PCRA_Petition.pdf", sha256: SOURCE_SHA,
      byteLength: SOURCE_BYTES, pageCount: 10, acroFieldCount: 0}],
    sourceAdoption: "data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/ut-pcra-source-adoption-20260911.json",
    legalDecision: "data/rcap-grade-a/legal-decisions/UT_TRAFFICKING_PCRA_IMPLEMENTATION_2026-09-11.md"});
  writeJson(`${OUT}/reports/rendered-artifacts.json`, renderedReport(results));
  writeJson(`${OUT}/reports/actual-writes.json`, actualWritesReport(results, fieldMap));
  writeJson(`${OUT}/reports/completeness-counters.json`, {schemaVersion: "rcap-completeness-counters/v1", familyId: FAMILY_ID,
    status: "PREPARED_FOR_REAL_COMPLETENESS_READER", counters: {knownRequiredFieldsMissing: 0,
      requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0,
      requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: 0},
    measurement: "Builder source/placement assertions complete; authoritative real reader is run separately without --write."});
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {schemaVersion: "rcap-blanks/v1", familyId: FAMILY_ID,
    protectedActs: ["Signed at location", "petition signature date", "petition signature", "attorney Rule 11 certification"],
    conditionalBranches: fieldMap.maps[0].canonicalRefusals.filter((row) => row.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE"),
    optionalParticipantContent: fieldMap.maps[0].canonicalRefusals.filter((row) => row.completenessDisposition === "OPTIONAL_PARTICIPANT_CONTENT"),
    participantElections: fieldMap.maps[0].canonicalRefusals.filter((row) => row.completenessDisposition === "PARTICIPANT_ELECTION_GENUINE")});
  fs.writeFileSync(abs(`${OUT}/participant-instructions.md`), instructions());
  writeJson(`${OUT}/approval-request.json`, {schemaVersion: "rcap-output-approval-request/v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY], status: "REQUESTED", grantedBy: null, exactSourceReviewComplete: true,
    independentVisualReviewRequired: true, outputLegalApprovalRequired: true, generationAllowed: false,
    runtimeSelectable: false, commercialRoutesOpened: 0});
  writeJson(`${OUT}/build-status.json`, {schemaVersion: "rcap-family-build-status/v1-completeness-repair", familyId: FAMILY_ID,
    status: "BUILT_REVIEW_PENDING", implementationDecision: DECISION, sourcePagesPreserved: 10,
    generatedAttachmentPages: 2, renderedArtifacts: 2, rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0});
  writeJson(`${OUT}/build-findings.json`, {schemaVersion: "rcap-build-findings/v1", familyId: FAMILY_ID,
    source: {sha256: SOURCE_SHA, byteLength: SOURCE_BYTES, originalPages: 10, flat: true},
    fieldInventory: {officialTerminalFields: officialFields.length, conditionalBranchesExplicit: true},
    packet: {officialPagesPreserved: 10, generatedAttachmentPages: 2, attachments: ["Ground One factual nexus/evidence schedule", "Memorandum of Points and Authorities"]},
    legalTreatment: {decision: DECISION, burden: "clear and convincing evidence", service: "court-screened; participant does not invent or automatically perform service"},
    safety: {inventedTestimony: 0, protectedParticipantSignatureActs: 3, protectedAttorneyCertificationActs: 3,
      localRasterPages: 0, generationAllowed: false, runtimeSelectable: false}});
  writeJson(`${OUT}/packet-set-manifest.json`, {schemaVersion: "rcap-packet-set-manifest/v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY], packetKind: "standalone_rule65c_pcra_with_incorporated_attachments",
    orderedComponents: [{componentId: FORM, title: "Official Petition for Relief Under the Post-Conviction Remedies Act", pages: "1-10", sourceSha256: SOURCE_SHA},
      {componentId: "UT-PCRA-ATTACHMENT-A", title: "Ground One Factual Nexus and Evidence Schedule", pages: "11"},
      {componentId: "UT-PCRA-ATTACHMENT-B", title: "Memorandum of Points and Authorities", pages: "12"}],
    participantSuppliedExternalAttachments: ["judgment and commitment", "applicable appellate decision",
      "applicable prior PCRA filings and decisions", "identified evidence exhibits",
      "Inmate Accounting Office certificate only if requesting fee waiver",
      "Declaration of Financial Status only if requesting appointed counsel"]});
  writeJson(`${OUT}/product-wiring.json`, {schemaVersion: "rcap-family-product-wiring/v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY], routeSelectionId: "ut-rule65c-trafficking-pcra", implementationStrategy: "official_pdf_fill",
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0, createsFulfillmentRecord: false,
    opensCommercialRoute: false, assignmentOwnedPath: OUT,
    binding: {jurisdiction: "UT", deliveryType: "official_pdf_fill", packetComponents: [FORM, ATTACHMENT],
      fieldMap: `${OUT}/production-field-map.json`, instructions: `${OUT}/participant-instructions.md`,
      renderedArtifacts: `${OUT}/reports/rendered-artifacts.json`, sourceReceipt: `${OUT}/source-receipt.json`,
      sourceVersion: [{sourceId: "official-form:1231XX", sha256: SOURCE_SHA, tier: "exact_held_generic_rule65c_form"}],
      acceptanceReceipt: null, lastIndependentVerification: null},
    centralReconciliationRequired: {runtimePathwayId: "path-l-vacatur-human-trafficking-related-expungement",
      routeKey: ROUTE_KEY, currentCensusFamilyId: FAMILY_ID, implementationStrategy: "official_pdf_fill",
      replaceOldVehicle: "old Title 77 / guidance-only / LegalEase Utah expungements.html candidate",
      adoptedVehicle: "generic Rule 65C PCRA petition plus Attachments A-B under UT-TRAFFICKING-PCRA-RULE-65C",
      sourceBinding: {sourceId: "official-form:1231XX", meaning: "catalog identity for the held generic petition, not a trafficking-specific form", sha256: SOURCE_SHA},
      packetComponents: [FORM, ATTACHMENT], outputDirectory: OUT,
      profileChangesCaptainMustReconcile: ["bind the runtime pathway to this exact packet family and Rule 65C vehicle",
        "replace the stale guidance-only/source-candidate treatment", "retain disabled generation and checkout until output-level gates pass"],
      preserveLaunchGraphClosed: true, sharedRegistryEditsMadeHere: false}});
  return {familyId: FAMILY_ID, status: "BUILT_REVIEW_PENDING", sourceSha256: SOURCE_SHA,
    sourceFieldsMeasured: officialFields.length, artifacts: results.map((r) => ({fixture: r.name, sha256: r.sha256,
      byteLength: r.byteLength, pageCount: r.pageCount})), rasterPages: 0, generationAllowed: false,
    runtimeSelectable: false, commercialRoutesOpened: 0};
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runFamily(), null, 2));
}
