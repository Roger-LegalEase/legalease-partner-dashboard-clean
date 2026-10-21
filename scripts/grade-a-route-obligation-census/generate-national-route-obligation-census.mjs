#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), "../..");
const DATA_DIR = path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate");
const DOCS_DIR = path.join(ROOT, "docs/rcap/grade-a/route-obligation-census");
const AS_OF = "2026-08-29";

export const CATEGORY_VALUES = [
  "A_MUST_FULFILL",
  "B_LEGITIMATE_EXCLUSION",
  "NEEDS_LEGAL_REVIEW",
];

export const CATEGORY_B_REASONS = [
  "AUTOMATIC",
  "AGENCY_CONTROLLED",
  "PROSECUTOR_CONTROLLED",
  "COURT_INITIATED",
  "FUTURE_EFFECTIVE",
  "UNSUITABLE_FOR_SELF_HELP",
];

export const WORK_TYPES = [
  "OFFICIAL_FORM_EXISTING_MAP",
  "OFFICIAL_FORM_MAP_REQUIRED",
  "OFFICIAL_SOURCE_ACQUISITION_REQUIRED",
  "COMPOSED_PLEADING",
  "PARTICIPANT_AGENCY_APPLICATION",
  "LOCAL_VARIATION_REQUIRED",
  "PRODUCT_WIRING_REQUIRED",
  "ARTIFACT_REVIEW_REQUIRED",
  "OUTPUT_LEGAL_APPROVAL_REQUIRED",
];

export const OUTPUT_STRATEGIES = [
  "official_pdf_fill",
  "custom_pleading",
  "participant_agency_application",
  "process_guidance",
];

export const DELIVERABLE_FIELDS = [
  "primaryOfficialFormOrComposedPleading",
  "proposedOrder",
  "coverSheet",
  "notice",
  "certificateOfService",
  "affidavitOrVerification",
  "schedulesOrContinuationPages",
  "requiredParticipantAttachments",
  "laterCompletionFields",
  "signatureRequirements",
  "notarizationRequirements",
  "filingDestination",
  "filingMethod",
  "filingFee",
  "feeWaiverTreatment",
  "serviceRecipients",
  "serviceMethod",
  "serviceTiming",
  "filingDeadline",
  "waitingPeriodCalculation",
  "postFilingInstructions",
  "uncontestedHearingTreatment",
  "contestedHearingOrOppositionHandoff",
];

const CONTRACT_FILES = [
  "src/lib/legal-authority/routes/p0.json",
  "src/lib/legal-authority/routes/mississippi.json",
  "src/lib/legal-authority/routes/route-splits.json",
  "src/lib/legal-authority/routes/single-routes.json",
  "src/lib/legal-authority/routes/national-report-2026-08-28.json",
  "src/lib/legal-authority/routes/national-report-batch-b.json",
  "src/lib/legal-authority/routes/national-report-batch-c.json",
];

const RUNTIME_AUTHORITY_CONTRACT_WITHOUT_CANDIDATE_KEYS = new Set([
  "GA:automatic-restriction-of-qualifying-post-july-1-2013-non-convictions",
  "ME:adult-non-conviction-record-relief",
  "MN:prosecutor-agreed-sealing-without-a-full-petition-under-609a-025",
  "MO:marijuana-expungement-under-missouri-constitution-article-xiv",
  "MO:stolen-or-mistaken-identity-expungement-under-610-145",
  "MS:intervention-court-completion-expungement",
  "MS:pretrial-intervention-or-diversion-expungement",
  "MT:deferred-sentence-dismissal-or-confidentiality-route",
  "MT:doj-record-removal-update-request",
  "MT:marijuana-related-redesignation-expungement-under-mmrta",
  "RI:path-d-non-conviction-sealing-expungement",
  "RI:path-f-marijuana-possession-expungement",
]);

const FIXED_INPUT_FILES = [
  "docs/PRODUCT_CONTRACT.md",
  "src/lib/legal-authority/authority.json",
  "data/rcap-authorization-queue.json",
  "data/rcap-ledger/all51-legal-authority-finalization.json",
  "data/rcap-ledger/all51-legal-authority-reconciliation.json",
  "data/rcap-ledger/authority-ledger.json",
  "data/rcap-ledger/launch-graph.json",
  "data/rcap-ledger/sellable-pathway-closure.json",
  "data/rcap-ledger/completed-output-counsel-manifest.json",
  "data/rcap-ledger/track-pathway-crosswalk.json",
  "data/rcap-ledger/track-terminalization.json",
  "data/rcap-ledger/route-aliases.json",
  "data/rcap-ledger/route-kind-adjudications.json",
  "data/rcap-ledger/route-presentation-conflicts.json",
  "data/rcap-ledger/closure-authority-contradictions.json",
  "data/rcap-ledger/batch-b-unattached-decisions.json",
  "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
  "data/record-clearing/legal-design-track-registry.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/legal-design-track-source-relationships.json",
  "data/record-clearing/legal-design-specifications.json",
  "data/record-clearing/factory-v2-route-registry.json",
  "data/record-clearing/source-artifact-registry.json",
  "data/rcap-grade-a/fulfillment-authority-registry.json",
  "data/rcap-grade-a/fulfillment-observation-snapshot.json",
  "data/rcap-grade-a/fulfillment-authority-projection.json",
  "data/rcap-grade-a/official-source-registry.json",
  ...CONTRACT_FILES,
];

const RESEARCH_DECISION_EXACT_REPRESENTATION_MERGES = new Map([
  ["AK:ak-set-aside", {
    canonicalObligationKey: "obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085",
    trackId: null,
    runtimePathwayId: "set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085",
    relation: "current research decision describes the exact existing AS 12.55.085(e) compiled pathway and contract obligation",
  }],
  ["OH:oh-ls-5", {
    canonicalObligationKey: "obligation:track-pathway:OH:oh_marijuana_expungement:marijuana-hashish-possession-expungement-under-2953-321",
    trackId: "oh_marijuana_expungement",
    runtimePathwayId: "marijuana-hashish-possession-expungement-under-2953-321",
    relation: "current research decision describes the exact existing R.C. 2953.321 registry-track/runtime obligation",
  }],
]);

// These are terminal cohorts stated expressly in the effective route contract.
// They are not inferred from labels or sibling routes. A single compiled
// pathway remains the typed runtime source, but its source-to-canonical mapping
// must account for each stated terminal filing posture separately.
const RUNTIME_CONTRACT_COHORT_BRANCHES = new Map([
  ["DE:juvenile-expungement-under-10-del-c-1017-1019-1017a", [
    {
      id: "section_1017_favorable_termination_mandatory",
      label: "Delaware § 1017 favorable-termination mandatory juvenile expungement",
      statute: "10 Del. C. § 1017",
      category: "NEEDS_LEGAL_REVIEW",
      participantCanInitiate: null,
      actor: "not recorded",
      instrument: "not recorded — § 1017 favorable-termination mandatory treatment",
      destination: "not recorded",
      question: "Does the mandatory § 1017 favorable-termination cohort require a participant petition, a court-initiated order, or another no-filing implementation stage?",
      evidence: "contract-notes:§ 1017 favorable-termination matters are mandatory with no elapsed wait",
    },
    {
      id: "section_1017a_automatic_program",
      label: "Delaware § 1017A automatic juvenile-expungement program",
      statute: "10 Del. C. § 1017A",
      category: "B_LEGITIMATE_EXCLUSION",
      reason: "AUTOMATIC",
      participantCanInitiate: false,
      actor: "court or state juvenile-record system",
      instrument: "no participant filing — automatic § 1017A juvenile-expungement program",
      destination: "automatic § 1017A program; no participant filing destination",
      strategy: "process_guidance",
      evidence: "contract-notes:§ 1017A eligible records run through the automatic program",
    },
    {
      id: "section_1017a_automatic_failure_correction",
      label: "Delaware § 1017A petition or correction when automatic expungement did not occur",
      statute: "10 Del. C. § 1017A",
      category: "A_MUST_FULFILL",
      participantCanInitiate: true,
      actor: "participant",
      instrument: "petition or correction request for an eligible § 1017A record not automatically expunged",
      waitingPeriodEvidence: [],
      evidence: "contract-notes:petition or correction path only where the automatic process did not occur",
    },
    {
      id: "section_1018_discretionary_petition",
      label: "Delaware § 1018 discretionary juvenile-expungement petition",
      statute: "10 Del. C. § 1018",
      category: "A_MUST_FULFILL",
      participantCanInitiate: true,
      actor: "participant",
      instrument: "petition under § 1018 with category-specific three-, five-, or seven-year treatment",
      waitingPeriodEvidence: ["Three, five, or seven years from the statutory completion or discharge anchor, according to the discretionary § 1018 category."],
      evidence: "contract-mechanism:Juvenile expungement — discretionary adjudication branch",
    },
  ]],
  ["ME:juvenile-sealing", [
    {
      id: "class_d_e_civil_automatic",
      label: "Maine automatic juvenile sealing for qualifying Class D, Class E, and civil-type matters",
      statute: "15 M.R.S. § 3308-C",
      category: "B_LEGITIMATE_EXCLUSION",
      reason: "AUTOMATIC",
      participantCanInitiate: false,
      actor: "court",
      instrument: "no participant filing — automatic sealing for qualifying Class D, Class E, and civil-type juvenile matters",
      destination: "automatic juvenile-court sealing process; no participant filing destination",
      strategy: "process_guidance",
      evidence: "contract-notes:Qualifying Class D, Class E and civil-type juvenile matters enter the automatic branch",
    },
    {
      id: "serious_or_oui_three_year_petition",
      label: "Maine three-year juvenile-sealing petition for serious or OUI matters",
      statute: "15 M.R.S. § 3308-C",
      category: "A_MUST_FULFILL",
      participantCanInitiate: true,
      actor: "participant",
      instrument: "petition under § 3308-C for murder, Class A, B or C juvenile crimes, or OUI matters",
      waitingPeriodEvidence: ["Three years from final discharge from the juvenile disposition, subject to the statutory clean-record, no-pending-matter, and other conditions."],
      evidence: "contract-notes:three-year petition branch is limited to murder, Class A, B or C juvenile crimes and OUI matters",
    },
  ]],
  ["UT:path-m-juvenile-expungement", [
    {
      id: "automatic_branch",
      label: "Utah juvenile-expungement automatic branch",
      statute: "Utah juvenile expungement statutes",
      category: "B_LEGITIMATE_EXCLUSION",
      reason: "AUTOMATIC",
      participantCanInitiate: false,
      actor: "court or agency",
      instrument: "no participant filing — exact automatic juvenile-expungement branch",
      destination: "automatic juvenile-expungement process; no participant filing destination",
      strategy: "process_guidance",
      evidence: "contract-notes:Separate automatic ... branches exist",
    },
    {
      id: "favorable_outcome_branch",
      label: "Utah juvenile-expungement favorable-outcome branch",
      statute: "Utah juvenile expungement statutes",
      category: "NEEDS_LEGAL_REVIEW",
      participantCanInitiate: null,
      actor: "not recorded",
      instrument: "not recorded — exact favorable-outcome juvenile-expungement treatment",
      destination: "not recorded",
      question: "Which favorable juvenile outcomes receive no-filing relief, and which require a participant instrument under the current Utah statute?",
      evidence: "contract-notes:Separate ... favourable-outcome branches exist and are not subject to this age-and-time rule",
    },
    {
      id: "ordinary_petition_branch",
      label: "Utah ordinary juvenile-expungement petition branch",
      statute: "Utah juvenile expungement statutes",
      category: "A_MUST_FULFILL",
      participantCanInitiate: true,
      actor: "participant",
      instrument: "Utah Juvenile Expungement Petition",
      waitingPeriodEvidence: ["The participant must be at least eighteen and generally one year beyond termination of juvenile-court jurisdiction or release, subject to the statutory waiver."],
      evidence: "contract-mechanism:Juvenile expungement — ordinary petition branch",
    },
  ]],
  ["WA:juvenile-record-sealing-under-rcw-13-50-260", [
    {
      id: "acquittal_or_dismissal_immediate_automatic",
      label: "Washington immediate automatic juvenile sealing after qualifying acquittal or dismissal with prejudice",
      statute: "RCW 13.50.260",
      category: "B_LEGITIMATE_EXCLUSION",
      reason: "AUTOMATIC",
      participantCanInitiate: false,
      actor: "court",
      instrument: "no participant filing — immediate automatic sealing after qualifying acquittal or dismissal with prejudice",
      destination: "automatic juvenile-court sealing process; no participant filing destination",
      strategy: "process_guidance",
      evidence: "contract-notes:qualifying acquittal or dismissal with prejudice is sealed with no elapsed wait",
    },
    {
      id: "scheduled_administrative_hearing_automatic",
      label: "Washington scheduled automatic juvenile administrative-hearing sealing process",
      statute: "RCW 13.50.260",
      category: "B_LEGITIMATE_EXCLUSION",
      reason: "AUTOMATIC",
      participantCanInitiate: false,
      actor: "court",
      instrument: "no participant filing — automatic administrative-hearing sealing process at the applicable statutory event",
      destination: "automatic juvenile-court administrative-hearing process; no participant filing destination",
      strategy: "process_guidance",
      evidence: "contract-notes:automatic administrative-hearing process runs at the later of the specified age, end of probation, or release event",
    },
    {
      id: "participant_motion_branch",
      label: "Washington participant juvenile-record sealing motion branch",
      statute: "RCW 13.50.260",
      category: "A_MUST_FULFILL",
      participantCanInitiate: true,
      actor: "participant",
      instrument: "Washington Juvenile Sealing Motion under RCW 13.50.260",
      waitingPeriodEvidence: ["Five years for a Class A juvenile offense and two years for Class B, Class C, misdemeanor, gross-misdemeanor, and diversion matters, measured from the applicable release or completion anchor."],
      evidence: "contract-mechanism:Juvenile record sealing — participant motion branch",
    },
  ]],
]);

const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const asArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = (values) => [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").map(String))].sort();
const normalize = (value) => String(value ?? "").trim();
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const routeKey = (kind, ...parts) => `${kind}:${parts.map((part) => normalize(part)).join(":")}`;

function filesIn(relativeDirectory, predicate = () => true) {
  return fs.readdirSync(path.join(ROOT, relativeDirectory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => `${relativeDirectory}/${entry.name}`)
    .sort();
}

function sourceInputFiles() {
  return uniq([
    ...FIXED_INPUT_FILES,
    ...filesIn("src/lib/rcap-engine/compiled/profiles", (name) => name.endsWith(".json")),
    ...filesIn("data/record-clearing/legal-design-intake", (name) => name.endsWith(".memo.json")),
    ...filesIn("data/record-clearing/legal-decisions", (name) => name.endsWith(".json")),
    ...filesIn("data/record-clearing/packet-specifications", (name) => name.endsWith(".json")),
  ]);
}

function sourceFingerprint(files) {
  const digest = crypto.createHash("sha256");
  for (const file of files) {
    digest.update(file);
    digest.update("\0");
    digest.update(fs.readFileSync(path.join(ROOT, file)));
    digest.update("\0");
  }
  return `sha256:${digest.digest("hex")}`;
}

function flattenText(value, seen = new Set()) {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) return value.flatMap((item) => flattenText(item, seen));
  return Object.values(value).flatMap((item) => flattenText(item, seen));
}

function textOf(...values) {
  return flattenText(values).join(" \n ");
}

function firstRecorded(values) {
  return uniq(values)[0] ?? null;
}

function evidenceField(values) {
  const entries = uniq(values.map((value) => {
    const lines = String(value ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
    const cleaned = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (/^\d+(?:\.\d+)?$/.test(lines[index])) {
        if (/^(?:days?|weeks?|months?|years?|hours?)$/i.test(lines[index + 1] ?? "")) {
          cleaned.push(`${lines[index]} ${lines[index + 1]}`);
          index += 1;
        }
        continue;
      }
      cleaned.push(lines[index]);
    }
    return cleaned.join(" \n ");
  })).filter((value) => {
    const text = normalize(value).toLowerCase();
    if (!text) return false;
    return !(/\b(?:remains? unresolved|remains? open|unresolved|unknown|open question|none (?:identified|recorded|stated|specified|established)|not recorded|not specified|not stated|not identified|not addressed|not established|not verified|not source-approved|unverified|unconfirmed(?: until verified at build time)?|(?:was|were|is|are) not resolved|(?:has|have|had) not been (?:confirmed|verified|recorded|stated|established)|does not (?:address|state|identify|confirm|specify|record|provide)|not provided|not available|not confirmed|has not been read|not yet (?:known|confirmed|recorded)|to be (?:confirmed|determined)|requires? confirmation|must be confirmed|could not be retrieved|verify [^.\n]* live at intake|participant confirms? (?:the )?amount|tbd|no [^.\n]*(?:source|fee)[^.\n]*(?:was|is|has been) (?:found|located|identified|established|approved)|no [^.\n]*(?:is|are|was|were|has been|have been) (?:found|identified|established|verified|stated|recorded|confirmed)|no fee identified|(?:source review )?identifies no|not verified [^.\n]* specifically|no confirmed [^.\n]* exists)\b/i.test(text));
  });
  return entries.length ? { status: "recorded", entries } : { status: "not_recorded", entries: ["not recorded"] };
}

function explicitServiceTimingEvidence(value) {
  const text = String(value ?? "");
  return text.split(/(?:\n|[.;])/).some((clause) => {
    const serviceAct = /^\s*(?:serve|provide|send|deliver|give)\b/i.test(clause)
      || /\b(?:participant|petitioner|applicant|defendant|requestor|you)\b.{0,40}\b(?:serve|provide (?:a )?copy|send (?:a )?copy|give notice|effect service)\b/i.test(clause)
      || /\bservice\s+(?:must|shall|is required to|is due|occurs?|on\b)/i.test(clause)
      || /\b(?:is|are|must be|shall be)\s+served\b/i.test(clause)
      || /\bnotice\s+to\s+(?:the\s+)?(?:attorney general|prosecut(?:or|ing attorney)|state(?:'s)? attorney|arresting agency|charging police department|police department|law enforcement agency|respondent|victim|named part(?:y|ies))\b/i.test(clause);
    const timing = /\b(?:within\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen)|at least\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|\d+)|no later than|before\s+(?:the\s+)?(?:hearing|filing|submission)|after\s+(?:filing|submission)|(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen)\s+(?:days?|hours?|weeks?)\s+(?:before|after)|service deadline)\b/i.test(clause);
    return serviceAct && timing;
  });
}

function explicitParticipantFilingDeadlineEvidence(value) {
  const text = String(value ?? "");
  if (/\b(?:obsolete|superseded|do not|no longer|repealed|old warning)\b/i.test(text)) return false;
  return text.split(/(?:\n|[.;])/).some((clause) => {
    const participantFiling = /\b(?:participant|petitioner|applicant|defendant|requestor|you)\b.{0,50}\b(?:file|files|submit|submits)\b/i.test(clause)
      || /^\s*(?:file|submit)\s+(?:the|a|an|your)\b/i.test(clause)
      || /\b(?:petition|motion|application|request|court packet|certificate|certification)\s+(?:must|shall|is required to)\s+(?:be\s+)?(?:filed|submitted|received)\b/i.test(clause)
      || /\bcompleted petition\s+must\s+be\s+received\b/i.test(clause);
    const number = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|fifteen|thirty|forty[- ]five|sixty|seventy[- ]five|ninety|one hundred eighty|180)";
    const deadline = new RegExp(`\\b(?:filing deadline|submission deadline|within\\s+${number}\\s+(?:days?|months?|years?)|at least\\s+${number}\\s+(?:days?|hours?|weeks?)\\s+before|no later than|(?:filed|submitted|received)\\s+by|file by|submit by|before\\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\\s+\\d{1,2},\\s+\\d{4})\\b`, "i").test(clause);
    return participantFiling && deadline;
  });
}

function explicitUncontestedHearingEvidence(value) {
  const text = String(value ?? "");
  if (!/\b(?:hearing|proceeding)\b/i.test(text) || /contest|object|oppos|contradictory|adversarial|prosecutor (?:answer|response|refusal)/i.test(text)) return false;
  return /\b(?:uncontested|without (?:a )?hearing|no hearing|after (?:a |the )?hearing|hearing (?:is |may be |can be )?(?:waived|dispensed with|not required)|hearing is not invariably required|does not require a hearing|court may decide (?:on the record|without a hearing)|court (?:shall|must|will|may )?(?:set|sets|schedule|schedules|hold|holds|conduct|conducts) (?:a |the )?hearing|hearing (?:is|required|shall|must|will be|is to be) (?:required|set|scheduled|held|conducted)|hearing \d+ to \d+ days after filing)\b/i.test(text);
}

function explicitContestedHearingEvidence(value) {
  const text = String(value ?? "");
  const adversity = /contest|object|oppos|contradictory|adversarial|prosecutor (?:answer|response|refusal)|state(?:'s)? attorney (?:answer|response|refusal)/i.test(text);
  const procedure = /hearing|response|answer|refusal|handoff|attorney|counsel|stop and get help/i.test(text);
  const exactProfessionalAdverseHandoff = /\b(?:appeal|mandamus|disput(?:e|ed|ed determination|ed eligibility)|final adverse)\b.{0,120}\b(?:attorney|counsel)(?:-handled)?\s+handoff\b/i.test(text);
  return (adversity && procedure) || exactProfessionalAdverseHandoff;
}

function routeScopedServiceClauses(value) {
  return String(value ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause && !/\b(?:a |the )?(?:separate|different) (?:matter|track|route|application|proceeding)\b/i.test(clause));
}

function routeFilingFeeClauses(value) {
  const fullText = String(value ?? "");
  if (/\b(?:not established|unresolved|unknown|open question|not confirmed|not verified|not source-approved|unverified|could not be retrieved|verify [^.\n]* live at intake|participant confirms? (?:the )?amount|no [^.\n]*(?:source|fee)[^.\n]*(?:was|is|has been) (?:found|located|identified|established|approved)|no fee identified|no confirmed [^.\n]* exists|no figure (?:is )?(?:quoted|recorded|confirmed|established)|participantActionRequired kinds|packet-set manifest)\b/i.test(fullText)) return [];
  return fullText.split(/(?<=[.!?])\s+/).map((clause) => clause.trim()).filter((clause) => {
    if (!clause || /\b(?:not a filing fee|neither is a fee|not a fee for (?:this|the) (?:route|application|petition|request|motion)|rather than (?:an?|the) (?:expungement|filing|application|route) fee|does not have to (?:file a petition or )?pay filing fees?|no petition exists|fee[- ]waiver request|must never be quoted)\b/i.test(clause)) return false;
    if (/\b(?:repealed|former)\b.{0,80}\b(?:fee|surcharge)\b/i.test(clause)) return false;
    if (/\b(?:criminal history|background check|record (?:search|copy|request|retrieval|acquisition)|fingerprint|certified disposition|transcript)\b/i.test(clause)
      && !/\b(?:filing|petition|application|motion|court|clerk|agency request)\b/i.test(clause)) return false;
    return /\b(?:fee|fees|cost|costs|none|no fee)\b|\$/i.test(clause);
  });
}

function explicitParticipantFilingMethodEvidence(value, structuredParticipantAction = false) {
  const text = String(value ?? "");
  if (/\b(?:no participant filing|nothing is filed|files? nothing|guidance[- ]only|automatic relief)\b/i.test(text)) return false;
  if (/\b(?:confirm|call|contact|ask|check)\b.{0,60}\b(?:filing|submission|electronic|paper|method|mechanics)\b/i.test(text)) return false;
  const method = /\b(?:by (?:first[- ]class |certified |registered )?mail|through (?:the )?(?:online |electronic )?portal|via (?:the )?(?:online |electronic )?portal|in person|hand[- ]deliver(?:y|ed)?|drop box|courier|fax|email|e-?file(?:d|s|ing)?|electronically|online|upload(?:ed|s|ing)?|mail(?:ed|s|ing)?(?:\s+the|\s+a|\s+an|\s+your)?|deliver(?:ed|s|ing)?\s+(?:the|a|an|your)\b)\b/i;
  if (!method.test(text)) return false;
  const filingAction = /\b(?:file|files|filed|filing|submit|submits|submitted|submission|application|petition|motion|request|deliver|mail|e-?file|upload)\b/i.test(text);
  if (!filingAction) return false;
  if (structuredParticipantAction) return true;
  return text.split(/(?:\n|[.;])/).some((clause) => method.test(clause) && filingAction.test(clause));
}

function directIdsForObject(object) {
  if (!object || typeof object !== "object" || Array.isArray(object)) return [];
  return uniq([
    object.recordId,
    object.decisionId,
    object.questionId,
    object.id,
    object.registerQuestionId,
    object.legalDecisionRecordId,
    object.assignmentId,
  ]);
}

function recursivelyCollectDecisionIds(document, needles) {
  const wanted = new Set(needles.filter(Boolean).map(String));
  const matches = new Set();
  const topIds = directIdsForObject(document);
  const identityKeys = new Set([
    "trackId", "trackIds", "tracks", "candidateTrackId", "affectedTracks",
    "pathwayId", "pathwayKey", "pathways", "affectedPathways",
    "routeKey", "routeId", "routeKeys", "affectedRoutes",
  ]);
  function visit(value, inheritedIds = []) {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) {
      let descendant = false;
      for (const item of value) if (item && typeof item === "object") descendant = visit(item, inheritedIds) || descendant;
      return descendant;
    }
    const localIds = uniq([...inheritedIds, ...directIdsForObject(value)]);
    const directMatch = Object.entries(value).some(([key, item]) => identityKeys.has(key)
      && flattenText(item).some((identity) => wanted.has(identity)));
    let descendant = false;
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") descendant = visit(child, localIds) || descendant;
    }
    if (directMatch || descendant) {
      for (const id of localIds) matches.add(id);
      for (const id of topIds) matches.add(id);
    }
    return directMatch || descendant;
  }
  visit(document);
  return [...matches].sort();
}

function loadInputs() {
  const inputFiles = sourceInputFiles();
  const profileFiles = inputFiles.filter((file) => file.startsWith("src/lib/rcap-engine/compiled/profiles/"));
  const decisionFiles = inputFiles.filter((file) => file.startsWith("data/record-clearing/legal-decisions/"));
  const intakeFiles = inputFiles.filter((file) => file.startsWith("data/record-clearing/legal-design-intake/"));
  const packetSpecFiles = inputFiles.filter((file) => file.startsWith("data/record-clearing/packet-specifications/"));
  const decisions = decisionFiles.map((file) => ({ file, value: readJson(file) }));
  const researchTrackDecisions = decisions.flatMap(({ file, value }) => asArray(value.researchTrackDecisions)
    .map((decision) => ({ ...decision, sourceFile: file })));
  return {
    inputFiles,
    sourceFingerprint: sourceFingerprint(inputFiles),
    tracks: readJson("data/record-clearing/legal-design-track-registry.json").tracks,
    packetSets: readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets,
    relationships: readJson("data/record-clearing/legal-design-track-source-relationships.json").relationships,
    specifications: readJson("data/record-clearing/legal-design-specifications.json"),
    artifacts: readJson("data/record-clearing/source-artifact-registry.json").artifacts,
    officialSources: readJson("data/rcap-grade-a/official-source-registry.json").sources,
    crosswalk: readJson("data/rcap-ledger/track-pathway-crosswalk.json"),
    closure: readJson("data/rcap-ledger/sellable-pathway-closure.json"),
    launch: readJson("data/rcap-ledger/launch-graph.json"),
    factory: readJson("data/record-clearing/factory-v2-route-registry.json"),
    authorityLedger: readJson("data/rcap-ledger/authority-ledger.json"),
    counselManifest: readJson("data/rcap-ledger/completed-output-counsel-manifest.json"),
    runtimeAuthority: readJson("src/lib/legal-authority/authority.json"),
    authorizationQueue: readJson("data/rcap-authorization-queue.json"),
    gradeARegistry: readJson("data/rcap-grade-a/fulfillment-authority-registry.json"),
    gradeASnapshot: readJson("data/rcap-grade-a/fulfillment-observation-snapshot.json"),
    gradeAProjection: readJson("data/rcap-grade-a/fulfillment-authority-projection.json"),
    closureContradictions: readJson("data/rcap-ledger/closure-authority-contradictions.json"),
    unattachedDecisions: readJson("data/rcap-ledger/batch-b-unattached-decisions.json"),
    researchTrackDecisions,
    aliases: readJson("data/rcap-ledger/route-aliases.json"),
    routeKindAdjudications: readJson("data/rcap-ledger/route-kind-adjudications.json"),
    presentationConflicts: readJson("data/rcap-ledger/route-presentation-conflicts.json"),
    profiles: profileFiles.map((file) => ({ file, value: readJson(file) })),
    decisions,
    intakes: intakeFiles.map((file) => ({ file, value: readJson(file) })),
    packetSpecs: packetSpecFiles.map((file) => ({ file, value: readJson(file) })),
    contractDocuments: CONTRACT_FILES.map((file) => ({ file, value: readJson(file) })),
  };
}

function effectiveContracts(contractDocuments) {
  const byRoute = new Map();
  const superseded = [];
  let rawCount = 0;
  for (const document of contractDocuments) {
    for (const contract of document.value.routes) {
      rawCount += 1;
      const previous = byRoute.get(contract.routeKey);
      if (previous) {
        superseded.push({
          routeKey: contract.routeKey,
          supersededDecisionId: previous.contract.decisionId,
          supersededRuleId: previous.contract.ruleId,
          supersededSourceFile: previous.sourceFile,
          effectiveDecisionId: contract.decisionId,
          effectiveRuleId: contract.ruleId,
          effectiveSourceFile: document.file,
        });
      }
      byRoute.set(contract.routeKey, { contract, sourceFile: document.file });
    }
  }
  return { rawCount, effective: [...byRoute.values()], superseded };
}

function indexBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}

function artifactIsHeldAndVerified(artifact) {
  return artifact.presence === "present"
    && artifact.hashState === "match"
    && /^[a-f0-9]{64}$/i.test(normalize(artifact.inventorySha256))
    && normalize(artifact.inventorySha256).toLowerCase() === normalize(artifact.measuredSha256).toLowerCase();
}

function artifactExplicitlyMapsRelationship(artifact, relationship) {
  const officialFormIds = uniq([
    artifact.officialFormId,
    ...asArray(artifact.officialFormIds),
  ]);
  const componentIds = uniq([
    artifact.componentId,
    ...asArray(artifact.componentIds),
  ]);
  const trackIds = uniq(asArray(artifact.reliefTracksUsing));
  return (relationship.officialFormId && officialFormIds.includes(relationship.officialFormId))
    || (relationship.componentId && componentIds.includes(relationship.componentId))
    || (relationship.trackId && (trackIds.includes(relationship.trackId)
      || trackIds.includes(`${relationship.jurisdiction}:${relationship.trackId}`)));
}

function exactSourceArtifactIdsForRelationship(relationship, artifacts) {
  const relationshipHash = /^[a-f0-9]{64}$/i.test(normalize(relationship.sha256))
    ? relationship.sha256.toLowerCase()
    : null;
  const relationshipUrl = /^https?:\/\//i.test(normalize(relationship.officialSourceUrl))
    ? relationship.officialSourceUrl
    : null;
  return artifacts.filter((artifact) => {
    if (!artifactIsHeldAndVerified(artifact)) return false;
    const artifactHashes = [artifact.inventorySha256, artifact.measuredSha256]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    if (relationshipHash && artifactHashes.includes(relationshipHash)) return true;
    if (!relationshipUrl || !artifactExplicitlyMapsRelationship(artifact, relationship)) return false;
    const artifactUrls = flattenText(artifact.provenance).filter((value) => /^https?:\/\//i.test(value));
    return artifactUrls.includes(relationshipUrl);
  }).map((artifact) => `source-artifact:${artifact.artifactId}`);
}

function exactArtifactIds(relationships, artifacts, gradeARecords = []) {
  const found = [];
  for (const relationship of relationships) found.push(...exactSourceArtifactIdsForRelationship(relationship, artifacts));
  for (const record of gradeARecords) {
    if (record.fixture?.fixtureId && /^[a-f0-9]{64}$/i.test(normalize(record.fixture.sha256))) {
      found.push(`grade-a-fixture:${record.fixture.fixtureId}:sha256:${record.fixture.sha256.toLowerCase()}`);
    }
    if (/^[a-f0-9]{64}$/i.test(normalize(record.artifactValidation?.artifactSha256))) {
      found.push(`grade-a-output-artifact-sha256:${record.artifactValidation.artifactSha256.toLowerCase()}`);
    }
    if (record.packetCompleteness?.specificationId && /^[a-f0-9]{64}$/i.test(normalize(record.packetCompleteness.specificationSha256))) {
      found.push(`grade-a-packet-specification:${record.packetCompleteness.specificationId}:sha256:${record.packetCompleteness.specificationSha256.toLowerCase()}`);
    }
    if (/^[a-f0-9]{64}$/i.test(normalize(record.packetCompleteness?.filingFormatArtifact?.sha256))) {
      found.push(`grade-a-filing-artifact-sha256:${record.packetCompleteness.filingFormatArtifact.sha256.toLowerCase()}`);
    }
    for (const artifact of record.packetCompleteness?.companionArtifacts ?? []) {
      if (artifact.componentId && /^[a-f0-9]{64}$/i.test(normalize(artifact.sha256))) found.push(`grade-a-companion-artifact:${artifact.componentId}:sha256:${artifact.sha256.toLowerCase()}`);
    }
  }
  return uniq(found);
}

function sourceIdsForRelationships(relationships) {
  const ids = [];
  for (const relationship of relationships) {
    if (relationship.componentId) ids.push(`component:${relationship.componentId}`);
    if (relationship.officialFormId) ids.push(`official-form:${relationship.officialFormId}`);
    if (relationship.officialSourceUrl) ids.push(`source-url:${relationship.officialSourceUrl}`);
    if (/^[a-f0-9]{64}$/i.test(normalize(relationship.sha256))) ids.push(`source-sha256:${relationship.sha256.toLowerCase()}`);
  }
  return uniq(ids);
}

function relationshipSourceIdentity(relationship) {
  if (relationship.officialFormId) return `official-form:${relationship.officialFormId}`;
  if (/^[a-f0-9]{64}$/i.test(normalize(relationship.sha256))) return `source-sha256:${relationship.sha256.toLowerCase()}`;
  if (/^https?:\/\//i.test(normalize(relationship.officialSourceUrl))) return `source-url:${relationship.officialSourceUrl}`;
  return `component:${relationship.jurisdiction}:${relationship.trackId}:${relationship.componentId ?? "not-recorded"}`;
}

function officialSourceIsCorroborated(source) {
  return source?.match === true
    && /^[a-f0-9]{64}$/i.test(normalize(source.expectedSha256))
    && normalize(source.expectedSha256).toLowerCase() === normalize(source.installedSha256).toLowerCase();
}

function relationshipHasExactSourceCustody(relationship, inputs) {
  if (exactSourceArtifactIdsForRelationship(relationship, inputs.artifacts).length > 0) return true;
  return relationship.officialFormId
    ? officialSourceIsCorroborated(inputs.officialSources[relationship.officialFormId])
    : false;
}

function allRequiredRelationshipSourcesHaveCustody(relationships, inputs) {
  if (!relationships.length) return false;
  const requirements = new Map();
  for (const relationship of relationships) {
    const identity = relationshipSourceIdentity(relationship);
    const rows = requirements.get(identity) ?? [];
    rows.push(relationship);
    requirements.set(identity, rows);
  }
  return [...requirements.values()].every((rows) => rows.some((relationship) => relationshipHasExactSourceCustody(relationship, inputs)));
}

function actorFor(destination, text, fallback = "not recorded") {
  const kind = normalize(destination?.kind ?? destination).toLowerCase();
  const body = String(text ?? "").toLowerCase();
  if (kind === "automatic") {
    const destinationName = normalize(destination?.name).toLowerCase();
    if (/department|bureau|board|commission|administrative office|division/.test(destinationName)) return "agency";
    if (/\bcourt\b|\bjudge\b/.test(destinationName)) return "court";
  }
  if (kind === "prosecutor") return "prosecutor";
  if (kind === "agency" || kind === "portal") return "agency";
  if (kind === "clerk") return "clerk";
  if (kind === "court") return "court";
  if (/prosecut(?:or|ing attorney)|solicitor/.test(body)) return "prosecutor";
  if (/\bagency\b|department|bureau|board|commission/.test(body)) return "agency";
  if (/\bclerk\b/.test(body)) return "clerk";
  if (/\bcourt\b|\bjudge\b/.test(body)) return "court";
  if (/participant|petitioner|applicant|defendant|requestor/.test(body)) return "participant";
  return fallback;
}

function routeScopedRuntimeActor(mappedTracks, contract) {
  const automaticNoParticipant = contract?.outcomeMode === "automatic_relief" || contract?.stage === "automatic";
  if (mappedTracks.length === 1) {
    const actor = actorFor(mappedTracks[0].destination, textOf(mappedTracks[0].destination), "not recorded");
    return automaticNoParticipant && actor === "participant" ? "automatic process — no participant filing" : actor;
  }
  const actor = actorFor(
    contract?.destination,
    textOf(contract?.destination, contract?.statute, contract?.timing, contract?.notes),
    "not recorded",
  );
  return automaticNoParticipant && ["participant", "not recorded"].includes(actor)
    ? "automatic process — no participant filing"
    : actor;
}

function routeScopedRuntimeDestination(mappedTracks, contract, actor) {
  if (mappedTracks.length === 1 && mappedTracks[0].destination) return mappedTracks[0].destination;
  if (contract?.destination) return contract.destination;
  const contractText = textOf(contract?.statute, contract?.timing, contract?.notes);
  if (actor === "agency") {
    const agencyLine = flattenText([contract?.statute, contract?.timing, contract?.notes])
      .find((line) => /department|bureau|board|commission|administrative office|agency/i.test(line));
    if (agencyLine) return `agency identified in exact route contract — ${agencyLine}`;
  }
  if (actor === "court" && /\bcourt\b/i.test(contractText)) return "court identified in exact route contract; exact filing destination not recorded";
  if (actor === "prosecutor" && /prosecut(?:or|ing attorney)/i.test(contractText)) return "prosecutor identified in exact route contract; exact office not recorded";
  return "not recorded";
}

function bReasonFor(actor, text) {
  const body = String(text ?? "").toLowerCase();
  if (/future[- ]effective|not (?:yet )?in force|effective after/.test(body)) return "FUTURE_EFFECTIVE";
  if (actor === "prosecutor") return "PROSECUTOR_CONTROLLED";
  if (actor === "agency" || actor === "clerk") return "AGENCY_CONTROLLED";
  if (actor === "court") return "COURT_INITIATED";
  if (/retained counsel|attorney|professional handoff|legal[- ]aid|referral/.test(body)) return "UNSUITABLE_FOR_SELF_HELP";
  return "AUTOMATIC";
}

function contractNoFilingReason(contract, pathway) {
  if (contract?.outcomeMode === "automatic_relief" || contract?.stage === "automatic" || pathway?.automatic === true) return "AUTOMATIC";
  const contractText = textOf(contract?.destination, contract?.statute, contract?.timing, contract?.mechanism, contract?.notes);
  if (professionalEvidence(contractText)) return "UNSUITABLE_FOR_SELF_HELP";
  const actor = routeScopedRuntimeActor([], contract);
  if (actor === "agency" || actor === "clerk") return "AGENCY_CONTROLLED";
  if (actor === "prosecutor") return "PROSECUTOR_CONTROLLED";
  if (actor === "court") return "COURT_INITIATED";
  return null;
}

function outputStrategyFromPacketMode(packetMode) {
  const value = normalize(packetMode).toLowerCase();
  if (/official/.test(value)) return "official_pdf_fill";
  if (/custom|composed|pleading/.test(value)) return "custom_pleading";
  if (/agency_application/.test(value)) return "participant_agency_application";
  if (/automatic|guidance|portal/.test(value)) return "process_guidance";
  return null;
}

function noFilingEvidence(text) {
  return /\bautomatic\b|by operation of law|participant files? no|nothing is filed|no participant filing|files? nothing|without (?:a )?participant filing|court initiates|agency initiates/i.test(text);
}

function professionalEvidence(text) {
  return /retained counsel|attorney[- ]only|professional handoff|attorney referral|legal[- ]aid referral|unsuitable for self[- ]help/i.test(text);
}

function participantFilingEvidence(text) {
  return /participant (?:files?|submits?|petitions?|applies?|requests?)|petitioner (?:files?|submits?)|applicant (?:files?|submits?)|file (?:a |the )?(?:petition|motion|application|request)|submit (?:a |the )?(?:petition|motion|application|request)/i.test(text);
}

function classificationResult({ category, reason = null, confidence, participantCanInitiate, question = null }) {
  return {
    possibleCategory: category,
    possibleCategoryBReason: reason,
    classificationConfidence: confidence,
    participantCanInitiate,
    requiresLegalReview: category === "NEEDS_LEGAL_REVIEW",
    legalReviewQuestion: category === "NEEDS_LEGAL_REVIEW" ? question : null,
  };
}

function exactTrackEvidenceTreatment(track) {
  const key = `${track.jurisdiction}:${track.trackId}`;
  const reviewTreatments = {
    "ND:nd-juvenile-records-routing": {
      processActor: "participant",
      participantFacingInstrument: "official early-destruction motion packet published by the North Dakota Legal Self Help Center",
      destination: "North Dakota juvenile court that handled the case",
      question: "Must North Dakota juvenile early destruction be represented as a separate official-form participant branch instead of the current adult-scope process-guidance node?",
      evidence: "filing-scope-conflict:official-juvenile-early-destruction-packet-exists-but-current-track-routes-only",
    },
    "NE:ne-pardon-routing": {
      processActor: "participant",
      participantFacingInstrument: "Nebraska Board of Pardons participant application",
      destination: "Nebraska Board of Pardons; exact Lincoln and Omaha mayoral-pardon variants require separate treatment",
      question: "Must the Nebraska Board of Pardons application be implemented as a participant agency-application branch, and must the Lincoln and Omaha mayoral-pardon variants be split before classification?",
      evidence: "filing-scope-conflict:participant-pardon-application-exists-but-current-track-routes-only",
    },
    "NE:ne-postconviction-routing": {
      processActor: "participant",
      participantFacingInstrument: "verified motion under the Nebraska Postconviction Act",
      destination: "Nebraska sentencing court, subject to the unresolved professional-handoff boundary",
      question: "Does the Nebraska postconviction professional handoff control every case, or must the participant-facing verified motion be represented as a separate composed-pleading branch?",
      evidence: "filing-scope-conflict:participant-verified-motion-exists-but-current-track-routes-only",
    },
    "NM:nm_cannabis": {
      processActor: "participant",
      participantFacingInstrument: "New Mexico AOC Application for Expungement of Court Records involving Cannabis",
      destination: "New Mexico Administrative Office of the Courts",
      question: "Must New Mexico cannabis relief be split into an automatic verification branch and a participant AOC application branch for expedited or mixed-charge requests?",
      evidence: "mixed-stage-conflict:automatic-cannabis-expungement-and-participant-aoc-application-require-exact-branch-identities",
    },
    "UT:ut_adj_reduction_402": {
      processActor: "participant",
      participantFacingInstrument: "motion to reduce the conviction under Utah Code § 76-3-402",
      destination: "Utah sentencing court, subject to the unresolved professional-handoff boundary",
      question: "Must Utah's § 76-3-402 reduction motion be represented as a separate participant filing, or does an express professional-only handoff control the adjacent-mechanism branch?",
      evidence: "filing-scope-conflict:participant-reduction-motion-exists-but-current-track-routes-only",
    },
  };
  if (reviewTreatments[key]) {
    return {
      ...reviewTreatments[key],
      classification: classificationResult({
        category: "NEEDS_LEGAL_REVIEW",
        confidence: "high",
        participantCanInitiate: true,
        question: reviewTreatments[key].question,
      }),
    };
  }

  const futureEffectiveTreatments = {
    "IL:il-auto-seal-2028": "future-effective-treatment:automatic-sealing-begins-2028-01-01",
    "IL:il-auto-seal-2029": "future-effective-treatment:automatic-sealing-operative-2029-01-01",
    "LA:la-985-2-automated-expungement": "future-effective-treatment:article-985-2-remains-conditioned-on-unconfirmed-appropriation-and-implementation",
    "NY:ny_clean_slate_manual_review": "future-effective-treatment:manual-review-form-and-procedure-not-available-before-publication",
    "OK:ok_osbi_portal": "future-effective-treatment:portal-required-by-2026-11-01-but-not-yet-published",
  };
  if (futureEffectiveTreatments[key]) {
    return {
      classification: classificationResult({
        category: "B_LEGITIMATE_EXCLUSION",
        reason: "FUTURE_EFFECTIVE",
        confidence: "high",
        participantCanInitiate: false,
      }),
      evidence: futureEffectiveTreatments[key],
    };
  }

  const professionalHandoffTreatments = {
    "MN:mn_inherent_authority": "professional-handoff-treatment:inherent-authority-sealing-is-expressly-outside-self-help",
    "MI:mi_setaside_csc4_pre2015": "professional-handoff-treatment:every-pre-2015-csc4-set-aside-matter-routes-to-counsel",
    "NH:nh_supreme_court_record": "professional-handoff-treatment:supreme-court-record-relief-is-expressly-outside-self-help",
    "ND:nd-trafficking-vacatur-routing": "professional-handoff-treatment:controlling-review-requires-attorney-or-survivor-clinic-handoff-in-every-case",
    "NE:ne-immigration-routing": "professional-handoff-treatment:immigration-counsel-required-before-packet-generation",
    "NM:nm_cannabis_sentence": "professional-handoff-treatment:cannabis-sentence-relief-is-expressly-outside-self-help",
    "OH:oh_2953_36_trafficking": "professional-handoff-treatment:trafficking-conviction-relief-is-expressly-referred-to-counsel",
    "OH:oh_2953_521_trafficking_nonconviction": "professional-handoff-treatment:trafficking-nonconviction-relief-is-expressly-referred-to-counsel",
    "RI:ri_commercial_sexual_activity": "professional-handoff-treatment:commercial-sexual-activity-relief-is-expressly-outside-self-help",
    "TN:tn_trafficking_40_32_105": "professional-handoff-treatment:current-node-refers-every-trafficking-matter-to-counsel-and-survivor-services",
    "TX:tx_exp_discretionary": "professional-handoff-treatment:discretionary-expunction-is-attorney-referral-only-and-unsuitable-for-approved-template",
    "UT:ut_pet_appellate": "professional-handoff-treatment:appellate-record-expungement-is-expressly-outside-self-help",
    "WI:wi_exp_trafficking_2m": "professional-handoff-treatment:trafficking-prostitution-relief-is-expressly-outside-self-help",
  };
  if (professionalHandoffTreatments[key]) {
    return {
      classification: classificationResult({
        category: "B_LEGITIMATE_EXCLUSION",
        reason: "UNSUITABLE_FOR_SELF_HELP",
        confidence: "high",
        participantCanInitiate: false,
      }),
      evidence: professionalHandoffTreatments[key],
    };
  }
  const participantAgencyTreatments = {
    "CT:ct-provisional-pardon": {
      actor: "participant",
      instrument: "participant-signed provisional-pardon application submitted through the Board of Pardons and Paroles portal",
      destination: "Connecticut Board of Pardons and Paroles",
      evidence: "participant-agency-application-treatment:board-portal-application-explicit",
    },
    "CT:ct-absolute-pardon": {
      actor: "participant",
      instrument: "participant-signed absolute-pardon application submitted through the Board of Pardons and Paroles portal",
      destination: "Connecticut Board of Pardons and Paroles",
      evidence: "participant-agency-application-treatment:board-portal-application-explicit",
    },
    "CT:ct-destruction-request": {
      actor: "participant",
      instrument: "participant request to the clerk for destruction of the eligible record; exact form or format is not recorded",
      destination: "clerk holding the eligible Connecticut record",
      evidence: "participant-agency-application-treatment:clerk-destruction-request-explicit-form-not-recorded",
    },
  };
  if (participantAgencyTreatments[key]) {
    return {
      classification: classificationResult({
        category: "A_MUST_FULFILL",
        confidence: "high",
        participantCanInitiate: true,
      }),
      processActor: participantAgencyTreatments[key].actor,
      participantFacingInstrument: participantAgencyTreatments[key].instrument,
      destination: participantAgencyTreatments[key].destination,
      outputStrategy: "participant_agency_application",
      evidence: participantAgencyTreatments[key].evidence,
    };
  }
  if (key === "OH:oh_2953_39_prosecutor") {
    return {
      classification: classificationResult({
        category: "B_LEGITIMATE_EXCLUSION",
        reason: "PROSECUTOR_CONTROLLED",
        confidence: "high",
        participantCanInitiate: false,
      }),
      processActor: "prosecutor",
      participantFacingInstrument: "no participant filing — only the prosecutor may apply under the controlling track authority",
      destination: "prosecutor-controlled application to the court",
      outputStrategy: "process_guidance",
      evidence: "prosecutor-controlled-treatment:only-prosecutor-may-apply",
    };
  }
  if (key === "HI:hi_state_initiated_marijuana_pilot") {
    return {
      classification: classificationResult({
        category: "B_LEGITIMATE_EXCLUSION",
        reason: "AUTOMATIC",
        confidence: "high",
        participantCanInitiate: false,
      }),
      processActor: "agency",
      evidence: "automatic-actor-treatment:state-of-hawaii-initiates-pilot-with-no-participant-filing",
    };
  }
  return null;
}

function exactUnitEvidenceTreatment(track, unit) {
  const key = `${track.jurisdiction}:${track.trackId}:${unit.unitId}`;
  if (key !== "RI:ri_deferred_sentence:ri-deferred-sentence-stage-3-notice-hearing-and-certified-copies") return null;
  const question = "Must Rhode Island deferred-sentence stage 3 remain a separate participant procedural branch, or should its filing, sworn affidavit, hearing, and certified-order delivery duties be merged into the Category A stage-2 packet obligation?";
  return {
    classification: classificationResult({
      category: "NEEDS_LEGAL_REVIEW",
      confidence: "high",
      participantCanInitiate: true,
      question,
    }),
    processActor: "participant",
    participantFacingInstrument: "participant filing, sworn affidavit, hearing attendance, and certified-order delivery after the deferred-sentence packet is prepared",
    destination: "Rhode Island filing court, Attorney General BCI unit, and charging police department",
    evidence: "mixed-stage-conflict:deferred-sentence-stage-3-carries-explicit-participant-filing-and-post-order-delivery-duties",
  };
}

function currentDecisionRoutePlan(decision) {
  const plans = {
    "ak-set-aside": {
      statuteOrAuthority: "Alaska Stat. § 12.55.085",
      branches: [{
        label: "Belated set-aside determination after suspended imposition of sentence",
        actor: "participant",
        instrument: "Motion for Belated Determination and Set-Aside Under AS 12.55.085(e)",
        destination: "sentencing court in the original criminal case",
        strategy: "custom_pleading",
        category: "A_MUST_FULFILL",
        facts: {
          proposedOrder: ["proposed set-aside order"],
          requiredParticipantAttachments: ["discharge order, probation-completion record, judgment and sentencing documents, and evidence concerning compliance and rehabilitation as of discharge"],
          serviceRecipients: ["prosecutor"],
          postFilingInstructions: ["A contested discharge, exclusion, prior denial, or probation-violation issue is an attorney handoff."],
          contestedHearingOrOppositionHandoff: ["State opposition or a disputed discharge/exclusion requires attorney handoff."],
        },
      }],
    },
    "ak-cannabis-seal": {
      statuteOrAuthority: "Chapter 9, SLA 2026; Alaska Stat. § 12.62.160(f), participant-request treatment effective 2027-01-01 and automatic treatment effective 2028-01-01",
      branches: [
        {
          id: "participant_request_from_2027",
          primary: true,
          label: "Future 2027 Alaska cannabis-information nondisclosure request",
          actor: "participant",
          instrument: "participant request for cannabis-information nondisclosure beginning January 1, 2027 (final official treatment not yet effective)",
          destination: "Alaska Department of Public Safety central repository or other record-holding criminal justice agency",
          strategy: "participant_agency_application",
          category: "B_LEGITIMATE_EXCLUSION",
          reason: "FUTURE_EFFECTIVE",
        },
        {
          id: "automatic_nondisclosure_from_2028",
          label: "Future automatic Alaska cannabis-information nondisclosure beginning in 2028",
          actor: "agency",
          instrument: "no participant filing — automatic agency nondisclosure beginning January 1, 2028",
          destination: "Alaska Department of Public Safety central repository and other record-holding criminal justice agencies",
          strategy: "process_guidance",
          category: "B_LEGITIMATE_EXCLUSION",
          reason: "FUTURE_EFFECTIVE",
        },
      ],
    },
    "ak-correct-record": {
      statuteOrAuthority: "Alaska Stat. § 12.62.170",
      branches: [
        {
          id: "agency_correction_request",
          primary: true,
          label: "Correct inaccurate or incomplete Alaska criminal justice information",
          actor: "participant",
          instrument: "Request to Correct Criminal Justice Information form and evidence checklist",
          destination: "Alaska DPS or the agency responsible for the disputed data",
          strategy: "participant_agency_application",
          category: "A_MUST_FULFILL",
          requiredSourceIds: ["official-form:Request to Correct Criminal Justice Information"],
          facts: {
            requiredParticipantAttachments: ["certified disposition, identity documents, fingerprints where required, and evidence identifying the inaccurate or incomplete entry"],
            postFilingInstructions: ["A final adverse agency decision proceeds to an attorney-handled Superior Court administrative appeal."],
            contestedHearingOrOppositionHandoff: ["Superior Court administrative appeal is an attorney handoff, not an ordinary self-help packet."],
          },
        },
        {
          id: "final_adverse_superior_court_appeal_handoff",
          label: "Final adverse Alaska correction decision — Superior Court appeal handoff",
          actor: "attorney or professional",
          instrument: "attorney handoff for Superior Court administrative appeal from a final adverse correction decision",
          destination: "Alaska Superior Court through retained counsel or qualified legal assistance",
          strategy: "process_guidance",
          category: "B_LEGITIMATE_EXCLUSION",
          reason: "UNSUITABLE_FOR_SELF_HELP",
        },
      ],
    },
    "al-olr": {
      statuteOrAuthority: "Ala. Code §§ 12-26-1 et seq.",
      branches: [{
        label: "Alabama Order of Limited Relief",
        actor: "participant",
        instrument: "official Alabama AOC Order of Limited Relief sworn petition and proposed order",
        destination: "Alabama circuit civil court selected under Ala. Code § 12-26-3",
        strategy: "official_pdf_fill",
        category: "A_MUST_FULFILL",
        requiredSourceIds: ["official-form:Alabama AOC Order of Limited Relief packet"],
        facts: {
          proposedOrder: ["official AOC proposed order"],
          affidavitOrVerification: ["sworn petition"],
          signatureRequirements: ["participant signs the sworn petition"],
          filingFee: ["$100 statutory administrative fee plus ordinary court costs"],
          feeWaiverTreatment: ["$100 administrative fee is nonwaivable; permitted indigency payment-plan treatment may apply"],
          uncontestedHearingTreatment: ["The court may decide on the record; a hearing is not invariably required."],
          contestedHearingOrOppositionHandoff: ["Complex venue, joinder, foreign-relief, prohibited-offense, or agency-contested matters require attorney handoff."],
        },
      }],
    },
    "al-uncharged-arrest": {
      statuteOrAuthority: "Ala. Code §§ 41-9-645 to -646",
      branches: [
        {
          id: "agency_record_challenge",
          label: "Alabama criminal-justice-information agency record challenge",
          actor: "participant",
          instrument: "agency record-challenge packet",
          destination: "ALEA/ACJIC or the originating criminal justice agency",
          strategy: "participant_agency_application",
          category: "A_MUST_FULFILL",
          facts: {
            requiredParticipantAttachments: ["identity verification, fingerprints if required, the challenged entry, and certified proof of the correct disposition"],
            postFilingInstructions: ["A final denial opens the distinct de novo circuit-court review branch."],
          },
        },
        {
          id: "de_novo_court_review_after_final_denial",
          hidden: true,
          label: "Alabama de novo circuit-court review after final agency denial",
          actor: "participant",
          instrument: "custom notice or petition for de novo review after final agency denial",
          destination: "circuit court of the participant's residence or the county where the agency is located",
          strategy: "custom_pleading",
          category: "NEEDS_LEGAL_REVIEW",
          participantCanInitiate: true,
          question: "Does the post-denial de novo circuit-court branch support a bounded self-help custom appeal, or does the current contested-appeal handoff require counsel from filing?",
          facts: {
            notice: ["statutorily prescribed notice"],
            requiredParticipantAttachments: ["final agency denial and the record-challenge evidence"],
            filingFee: ["may proceed without advance costs or bond"],
            filingDeadline: ["within the statutory period after final agency denial; exact period not recorded in the current decision"],
            contestedHearingOrOppositionHandoff: ["A contested appeal is an attorney handoff."],
          },
        },
      ],
    },
    "ca-1203-4b": {
      statuteOrAuthority: "Cal. Penal Code § 1203.4b",
      branches: [{
        label: "California fire-camp or hand-crew dismissal and set-aside petition",
        actor: "participant",
        instrument: "Judicial Council forms CR-430, CR-431, CR-432, CR-430-INFO, and CR-106 when required",
        destination: "superior court that entered the conviction",
        strategy: "official_pdf_fill",
        category: "A_MUST_FULFILL",
        requiredSourceIds: ["official-form:CR-430", "official-form:CR-431", "official-form:CR-432", "official-form:CR-430-INFO", "official-form:CR-106"],
        facts: {
          proposedOrder: ["CR-432 proposed order"],
          coverSheet: ["CR-431 cover sheet and certification material"],
          certificateOfService: ["CR-106 proof of service when required"],
          requiredParticipantAttachments: ["CDCR or county service certification, judgment and sentence, restitution/completion information, and supporting interests-of-justice material"],
          serviceRecipients: ["prosecutor"],
          contestedHearingOrOppositionHandoff: ["Excluded offenses, disputed service certification, contested restitution/completion, or prosecutor opposition requiring individualized advocacy are attorney handoffs."],
        },
      }],
    },
    "co_mistaken_identity_expungement": {
      statuteOrAuthority: "Colo. Rev. Stat. § 24-72-702",
      branches: [
        {
          id: "agency_controlled_initial_petition",
          label: "Arresting-agency petition after a mistaken-identity finding",
          actor: "agency",
          instrument: "no participant filing — agency petitions after its mistaken-identity finding",
          destination: "district court in the judicial district where the arrest occurred",
          strategy: "process_guidance",
          category: "B_LEGITIMATE_EXCLUSION",
          reason: "AGENCY_CONTROLLED",
        },
        {
          id: "participant_investigation_and_finding_request",
          hidden: true,
          label: "Participant request for agency investigation and mistaken-identity finding",
          actor: "participant",
          instrument: "written request for investigation and mistaken-identity finding",
          destination: "arresting law-enforcement agency",
          strategy: "participant_agency_application",
          category: "A_MUST_FULFILL",
          facts: {
            requiredParticipantAttachments: ["identity and arrest records supporting the mistaken-identity investigation request"],
            postFilingInstructions: ["Without an actual agency mistaken-identity finding, do not generate the district-court petition."],
          },
        },
        {
          id: "participant_court_petition_after_90_days",
          hidden: true,
          label: "Participant no-fee petition after the agency misses the 90-day filing period",
          actor: "participant",
          instrument: "custom civil petition for mandatory mistaken-identity expungement and proposed order",
          destination: "district court in the judicial district where the arrest occurred",
          strategy: "custom_pleading",
          category: "A_MUST_FULFILL",
          facts: {
            proposedOrder: ["proposed mandatory expungement order"],
            requiredParticipantAttachments: ["agency mistaken-identity finding, proof no charges were filed, arrest and incident identifiers, proof the 90-day agency deadline expired, and complete record-custodian list"],
            filingFee: ["no filing fee or other expungement cost may be charged"],
            waitingPeriodCalculation: ["90 days after the law-enforcement investigation finds mistaken identity and no charges were filed"],
            postFilingInstructions: ["Distribute the order to every record custodian and verify implementation."],
            contestedHearingOrOppositionHandoff: ["No agency finding or a disputed mistaken-identity determination proceeds to attorney handoff."],
          },
        },
      ],
    },
    "ny_160_55_violation": {
      statuteOrAuthority: "N.Y. Crim. Proc. Law § 160.55",
      branches: [
        {
          id: "automatic_partial_sealing",
          label: "Automatic partial sealing of a modern qualifying violation or traffic-infraction disposition",
          actor: "court",
          instrument: "no participant filing — automatic partial-sealing guidance",
          destination: "sentencing court, DCJS, police, and prosecutor records systems",
          strategy: "process_guidance",
          category: "B_LEGITIMATE_EXCLUSION",
          reason: "AUTOMATIC",
        },
        {
          id: "sentencing_court_transmission_correction_request",
          hidden: true,
          label: "Sentencing-court transmission or sealing-notice correction request",
          actor: "participant",
          instrument: "written request asking the sentencing court to transmit or correct the § 160.55 sealing notice",
          destination: "sentencing court",
          strategy: "custom_pleading",
          category: "A_MUST_FULFILL",
          facts: {
            requiredParticipantAttachments: ["certificate of disposition and evidence that the official criminal-history result remains incorrect"],
            postFilingInstructions: ["After court transmission or correction, verify the DCJS criminal-history result."],
          },
        },
        {
          id: "dcjs_correction_submission",
          hidden: true,
          label: "DCJS correction submission after expected automatic partial sealing",
          actor: "participant",
          instrument: "certified-disposition correction submission to DCJS",
          destination: "New York State Division of Criminal Justice Services",
          strategy: "participant_agency_application",
          category: "A_MUST_FULFILL",
          facts: {
            requiredParticipantAttachments: ["certified certificate of disposition and the incorrect official criminal-history result"],
            postFilingInstructions: ["Verify the corrected official criminal-history result; § 160.55 does not seal the public court file."],
          },
        },
        {
          id: "pre_1991_legacy_motion",
          hidden: true,
          label: "Possible pre-November 1, 1991 legacy motion",
          actor: "participant",
          instrument: "not recorded",
          destination: "sentencing court",
          strategy: null,
          category: "NEEDS_LEGAL_REVIEW",
          participantCanInitiate: true,
          question: "Which exact motion, eligibility rule, and filing procedure governs the pre-November 1, 1991 § 160.55 legacy branch?",
        },
        {
          id: "contested_nonsealing_handoff",
          label: "Interests-of-justice nonsealing order or contested refusal",
          actor: "attorney or professional",
          instrument: "attorney handoff for motion or contested nonsealing order",
          destination: "sentencing court through counsel",
          strategy: "process_guidance",
          category: "B_LEGITIMATE_EXCLUSION",
          reason: "UNSUITABLE_FOR_SELF_HELP",
        },
      ],
    },
    "oh-ls-5": {
      statuteOrAuthority: "Ohio Rev. Code § 2953.321",
      branches: [{
        label: "Pre-2026 marijuana or hashish expungement application",
        actor: "participant",
        instrument: "custom application under R.C. 2953.321 with evidence and proposed order",
        destination: "sentencing court",
        strategy: "custom_pleading",
        category: "A_MUST_FULFILL",
        facts: {
          proposedOrder: ["proposed expungement order"],
          requiredParticipantAttachments: ["evidence of the qualifying statutory subsection, amount where relevant, and pre-March 20, 2026 timing"],
          filingFee: ["$50"],
          feeWaiverTreatment: ["indigency exception"],
          uncontestedHearingTreatment: ["The court sets a hearing 45 to 90 days after filing and obtains any required probation inquiry."],
          postFilingInstructions: ["The court notifies the prosecutor and, if granted, orders destruction, deletion, and erasure of official records and index references."],
        },
      }],
    },
  };
  const plan = plans[decision.trackId];
  if (!plan) throw new Error(`No mechanical current-decision route plan for ${decision.jurisdiction}:${decision.trackId}`);
  return plan;
}

function decisionBranchClassification(branch) {
  return classificationResult({
    category: branch.category,
    reason: branch.reason ?? null,
    confidence: "high",
    participantCanInitiate: branch.participantCanInitiate ?? branch.category === "A_MUST_FULFILL",
    question: branch.question ?? null,
  });
}

function missingWorkForDecisionBranch(branch) {
  if (branch.category !== "A_MUST_FULFILL") return [];
  return uniq([
    "Acquire and verify exact official-source custody for this decision-only route; a decision record is not source custody.",
    branch.strategy === "official_pdf_fill" || asArray(branch.requiredSourceIds).some((sourceId) => String(sourceId).startsWith("official-form:"))
      ? "Create or complete the exact official-form field map for every required official form or companion."
      : null,
    branch.strategy === "custom_pleading" ? "Implement the exact composed pleading and every required companion component." : null,
    branch.strategy === "participant_agency_application" ? "Implement the exact participant-facing agency application or request treatment." : null,
    "Add an approved legal-design track and exact runtime wiring through their controlling processes; this census creates neither.",
    "Generate the exact route output and complete artifact review.",
    "Obtain completed-output legal approval; this census creates no approval.",
  ]);
}

function worklistFactsForDecisionBranch(branch) {
  const facts = branch.facts ?? {};
  return Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, evidenceField([
    ...(field === "primaryOfficialFormOrComposedPleading" ? [branch.instrument] : []),
    ...(field === "filingDestination" ? [branch.destination] : []),
    ...asArray(facts[field]),
  ])]));
}

function classifyTrack(track) {
  const text = textOf(track.mechanism, track.rules, track.packetInstructions, track.selfHelpBoundaries, track.postGenerationHandoffs);
  if (normalize(track.effectiveFrom) > AS_OF) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "FUTURE_EFFECTIVE", confidence: "high", participantCanInitiate: false });
  }
  if (track.units?.length) {
    return classificationResult({
      category: "NEEDS_LEGAL_REVIEW",
      confidence: "high",
      participantCanInitiate: null,
      question: `Should the mixed or staged parent ${track.trackId} receive any category independently of its ${track.units.length} explicit units?`,
    });
  }
  const filingComponents = asArray(track.packetSet?.components).filter((component) => ["official_pdf_fill", "custom_pleading"].includes(component.outputStrategy));
  const strategy = track.outputStrategy ?? firstRecorded(filingComponents.map((component) => component.outputStrategy));
  if (["official_pdf_fill", "custom_pleading"].includes(strategy)) {
    return classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
  }
  const actor = actorFor(track.destination, text);
  if (/attorney handoff in every case|every [^.]* matter[^.]*attorney handoff|node routes to counsel/i.test(text)) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
  }
  if (noFilingEvidence(text)) {
    const reason = /\bautomatic\b|by operation of law/i.test(text) ? "AUTOMATIC" : bReasonFor(actor, text);
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason, confidence: "medium", participantCanInitiate: false });
  }
  if (professionalEvidence(text) && !participantFilingEvidence(text)) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "medium", participantCanInitiate: false });
  }
  return classificationResult({
    category: "NEEDS_LEGAL_REVIEW",
    confidence: "low",
    participantCanInitiate: null,
    question: `Does ${track.trackId} contain a participant-initiated self-help filing, or only guidance for a process controlled by ${actor}?`,
  });
}

function exactUnitStrategy(track, unit) {
  if (OUTPUT_STRATEGIES.includes(unit.outputStrategy)) return unit.outputStrategy;
  const unitText = textOf(unit.unitId, unit.label, unit.description, unit.unavailableReason);
  const participantInstrument = participantFilingEvidence(unitText)
    || /\b(?:person|participant|petitioner|applicant|defendant|arrested person)(?:'s)?\b.{0,60}\b(?:motion|petition|application|submission)\b/i.test(unitText)
    || /\b(?:motion|petition|application|submission)\b.{0,60}\b(?:by|from) (?:the )?(?:person|participant|petitioner|applicant|defendant)\b/i.test(unitText);
  if (participantInstrument && /\b(?:motion|petition|pleading)\b/i.test(unitText)) return "custom_pleading";
  const combined = textOf(unitText, track.mechanism, track.destination);
  if ((participantFilingEvidence(combined) || /submission to (?:despp|the .*agency)/i.test(unitText))
    && actorFor(track.destination, combined) === "agency") return "participant_agency_application";
  return null;
}

function classifyUnit(track, unit, strategy = exactUnitStrategy(track, unit)) {
  const text = textOf(unit, track.mechanism, track.destination);
  if (normalize(track.effectiveFrom) > AS_OF) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "FUTURE_EFFECTIVE", confidence: "high", participantCanInitiate: false });
  }
  if (["official_pdf_fill", "custom_pleading", "participant_agency_application"].includes(strategy)) {
    return classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
  }
  const actor = actorFor(track.destination, text);
  if (noFilingEvidence(text)) {
    const reason = /\bautomatic\b|by operation of law/i.test(textOf(unit.unitId, unit.label, unit.description)) ? "AUTOMATIC" : bReasonFor(actor, text);
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason, confidence: "high", participantCanInitiate: false });
  }
  if (unit.available === false && professionalEvidence(text)) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
  }
  return classificationResult({
    category: "NEEDS_LEGAL_REVIEW",
    confidence: "medium",
    participantCanInitiate: participantFilingEvidence(text) ? true : null,
    question: `Does unit ${track.trackId}/${unit.unitId} require a participant-facing filing, and if so which exact instrument governs it?`,
  });
}

function classifyPathway(pathway, contractEntry, closureRow) {
  const contract = contractEntry?.contract;
  const text = textOf(pathway, contract);
  const strategy = outputStrategyFromPacketMode(pathway.packetMode);
  if (contract && normalize(contract.effectiveFrom) > AS_OF) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "FUTURE_EFFECTIVE", confidence: "high", participantCanInitiate: false });
  }
  if (contract) {
    if (contract.outcomeMode === "agency_application") {
      return classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
    }
    if (contract.outcomeMode === "participant_packet" && ["official_pdf_fill", "custom_pleading"].includes(strategy)) {
      return classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
    }
    if (contract.outcomeMode === "participant_packet") {
      return classificationResult({
        category: "NEEDS_LEGAL_REVIEW",
        confidence: "high",
        participantCanInitiate: true,
        question: `Which exact official-form or composed-pleading output treatment governs participant packet pathway ${pathway.compiledPathwayId}?`,
      });
    }
    if (contract.outcomeMode === "attorney_review_packet"
      && /mandatory attorney review before any packet is produced/i.test(textOf(contract.notes))) {
      return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
    }
    if (contract.outcomeMode === "attorney_review_packet" && contract.packetFamily) {
      return classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
    }
    if (contract.outcomeMode === "attorney_review_packet") {
      return classificationResult({
        category: "NEEDS_LEGAL_REVIEW",
        confidence: "high",
        participantCanInitiate: true,
        question: `Which exact packet family governs attorney-review packet pathway ${pathway.compiledPathwayId}?`,
      });
    }
    if (contract.outcomeMode === "referral") {
      return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
    }
    if (contract.outcomeMode === "automatic_relief" || contract.stage === "automatic") {
      return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "AUTOMATIC", confidence: "high", participantCanInitiate: false });
    }
    if (contract.outcomeMode === "guidance_status" && noFilingEvidence(text)) {
      const reason = contractNoFilingReason(contract, pathway);
      if (reason) return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason, confidence: "high", participantCanInitiate: false });
      return classificationResult({
        category: "NEEDS_LEGAL_REVIEW",
        confidence: "high",
        participantCanInitiate: null,
        question: `Which expressly identified actor controls the no-filing guidance pathway ${pathway.compiledPathwayId}?`,
      });
    }
  }
  if (!(pathway.mappedRegistryTrackIds ?? []).length) {
    return classificationResult({
      category: "NEEDS_LEGAL_REVIEW",
      confidence: "high",
      participantCanInitiate: pathway.filingRequired === true ? true : null,
      question: `Which current legal-design decision, if any, authorizes runtime-only pathway ${pathway.compiledPathwayId} and its stated filing treatment?`,
    });
  }
  if (pathway.automatic === true || /^automatic(?:_|$)/.test(normalize(pathway.routeType))) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "AUTOMATIC", confidence: "high", participantCanInitiate: false });
  }
  // Commercial closure is evidence about current service posture, never legal
  // authority to exclude a participant filing. A compiled filing survives any
  // product-scope or launch-graph closure as Category A implementation work.
  if (pathway.filingRequired === true) {
    if (["official_pdf_fill", "custom_pleading"].includes(strategy)) {
      return classificationResult({ category: "A_MUST_FULFILL", confidence: "medium", participantCanInitiate: true });
    }
    return classificationResult({
      category: "NEEDS_LEGAL_REVIEW",
      confidence: "medium",
      participantCanInitiate: true,
      question: `Which exact output treatment governs the participant filing on runtime pathway ${pathway.compiledPathwayId}?`,
    });
  }
  if (closureRow?.category === "paid_packet_intended" && ["official_pdf_fill", "custom_pleading"].includes(strategy)) {
    return classificationResult({ category: "A_MUST_FULFILL", confidence: "medium", participantCanInitiate: true });
  }
  if (closureRow?.category === "non_filing_guidance" && noFilingEvidence(text)) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: bReasonFor(actorFor(null, text), text), confidence: "medium", participantCanInitiate: false });
  }
  if (["product_scope_exclusion", "legally_unavailable", "exact_external_deferral"].includes(closureRow?.category) && professionalEvidence(text)) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "medium", participantCanInitiate: false });
  }
  return classificationResult({
    category: "NEEDS_LEGAL_REVIEW",
    confidence: "low",
    participantCanInitiate: pathway.filingRequired === true ? true : null,
    question: `Does runtime pathway ${pathway.compiledPathwayId} represent a participant self-help filing under current legal-design authority?`,
  });
}

function classifyServiceBranch(contract, branch, exactStrategy) {
  const text = textOf(branch, contract.mechanism, contract.statute);
  if (branch.outcomeMode === "agency_application") {
    return classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
  }
  if (branch.outcomeMode === "participant_packet" && ["official_pdf_fill", "custom_pleading"].includes(exactStrategy)) {
    return classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
  }
  if (branch.outcomeMode === "participant_packet") {
    return classificationResult({
      category: "NEEDS_LEGAL_REVIEW",
      confidence: "high",
      participantCanInitiate: true,
      question: `Which exact official-form or composed-pleading treatment governs service branch ${branch.id}?`,
    });
  }
  if (branch.outcomeMode === "automatic_relief" || branch.stage === "automatic") {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "AUTOMATIC", confidence: "high", participantCanInitiate: false });
  }
  if (branch.outcomeMode === "guidance_status") {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: bReasonFor(actorFor(null, text), text), confidence: "high", participantCanInitiate: false });
  }
  if (branch.outcomeMode === "referral" || professionalEvidence(text)) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
  }
  return classificationResult({
    category: "NEEDS_LEGAL_REVIEW",
    confidence: "medium",
    participantCanInitiate: null,
    question: `What participant-facing treatment, if any, is authorized for service branch ${branch.id}?`,
  });
}

function classifyFailureDisposition(contract, disposition) {
  if (contract.routeKey === "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05" && disposition.id === "nd_eligibility_contested") {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
  }
  if (["retained_counsel", "partner_handoff"].includes(disposition.disposition)) {
    return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
  }
  if (disposition.disposition === "attorney_or_prosecutor") {
    if (/prosecut(?:or|ing attorney)/i.test(textOf(disposition.when, disposition.note))) {
      return classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "PROSECUTOR_CONTROLLED", confidence: "high", participantCanInitiate: false });
    }
    return classificationResult({
      category: "NEEDS_LEGAL_REVIEW",
      confidence: "high",
      participantCanInitiate: null,
      question: `Does ${disposition.id} require a professional handoff, prosecutor action, or another participant-facing treatment?`,
    });
  }
  return classificationResult({
    category: "NEEDS_LEGAL_REVIEW",
    confidence: "medium",
    participantCanInitiate: null,
    question: `Is the ${disposition.id} ${disposition.disposition} disposition a participant self-help correction request, or only a handoff instruction?`,
  });
}

function buildIndexes(inputs, contracts) {
  const packetSetByTrack = new Map(inputs.packetSets.map((row) => [`${row.jurisdiction}:${row.trackId}`, row]));
  const relationshipsByTrack = indexBy(inputs.relationships, (row) => `${row.jurisdiction}:${row.trackId}`);
  const authorityByTrack = new Map(inputs.authorityLedger.tracks.map((row) => [`${row.jurisdiction}:${row.trackId}`, row]));
  const trackById = new Map(inputs.tracks.map((row) => [`${row.jurisdiction}:${row.trackId}`, row]));
  const crosswalkTrack = new Map(inputs.crosswalk.registryTracks.map((row) => [`${row.jurisdiction}:${row.registryTrackId}`, row]));
  const crosswalkPathway = new Map(inputs.crosswalk.compiledPathways.map((row) => [`${row.jurisdiction}:${row.compiledPathwayId}`, row]));
  const closureByPathway = new Map(inputs.closure.pathways.map((row) => [`${row.jurisdiction}:${row.pathwayId}`, row]));
  const launchByPathway = new Map(inputs.launch.rows.map((row) => [`${row.jurisdiction}:${row.pathwayId}`, row]));
  const factoryByPathway = new Map(inputs.factory.routes.map((row) => [`${row.jurisdiction}:${row.pathwayId}`, row]));
  const contractByPathway = new Map(contracts.effective.map((entry) => [`${entry.contract.jurisdiction}:${entry.contract.pathwayId}`, entry]));
  const gradeAByPathway = indexBy(inputs.gradeARegistry.records, (row) => `${row.jurisdiction}:${row.pathwayId}`);
  const gradeAProjectionByPathway = new Map(inputs.gradeAProjection.routes.map((row) => [row.routeId, row]));
  const contradictionByPathway = new Map(inputs.closureContradictions.rows.map((row) => [row.pathwayKey, row]));
  const packetSpecificationRecords = inputs.packetSpecs.flatMap(({ file, value }) => {
    if (Array.isArray(value.configurations)) return value.configurations.map((configuration) => ({ ...configuration, sourceFile: file, specificationHistorical: false }));
    return [{ ...value, sourceFile: file, specificationHistorical: Boolean(value.supersededBy) || value.legalSectionsBound === false }];
  });
  const packetSpecsByRoute = indexBy(packetSpecificationRecords, (row) => row.routeKey ?? "");
  const packetSpecsByTrack = indexBy(packetSpecificationRecords, (row) => `${row.jurisdiction}:${row.trackId ?? ""}`);
  const packetSpecsByPathway = indexBy(packetSpecificationRecords, (row) => `${row.jurisdiction}:${row.pathwayId ?? ""}`);
  const counselByTrack = new Map();
  for (const family of inputs.counselManifest.families) {
    for (const trackId of asArray(family.tracksServed)) {
      for (const jurisdiction of asArray(family.jurisdictions)) counselByTrack.set(`${jurisdiction}:${trackId}`, family);
    }
  }
  const profilePathway = new Map();
  for (const profile of inputs.profiles) {
    for (const pathway of profile.value.pathways) {
      profilePathway.set(`${profile.value.jurisdiction.code}:${pathway.id}`, { ...pathway, profileFile: profile.file });
    }
  }
  return {
    packetSetByTrack,
    relationshipsByTrack,
    authorityByTrack,
    trackById,
    crosswalkTrack,
    crosswalkPathway,
    closureByPathway,
    launchByPathway,
    factoryByPathway,
    contractByPathway,
    gradeAByPathway,
    gradeAProjectionByPathway,
    contradictionByPathway,
    packetSpecificationRecords,
    packetSpecsByRoute,
    packetSpecsByTrack,
    packetSpecsByPathway,
    counselByTrack,
    profilePathway,
  };
}

function legalDecisionIds(inputs, needles, contractDecisionId = null) {
  const wanted = new Set(needles.filter(Boolean).map(String));
  const ids = contractDecisionId ? [contractDecisionId] : [];
  const identityValues = (row) => [
    row.trackId,
    ...asArray(row.trackIds),
    ...asArray(row.tracks),
    row.candidateTrackId,
    ...asArray(row.affectedTracks),
    row.pathwayId,
    row.pathwayKey,
    ...asArray(row.pathwayKeys),
    ...asArray(row.pathways),
    ...asArray(row.affectedPathways),
    row.routeKey,
    row.routeId,
    ...asArray(row.routeKeys),
    ...asArray(row.affectedRoutes),
  ].filter(Boolean).map(String);
  const recordIds = (row) => uniq([
    row.recordId,
    row.decisionId,
    row.questionId ? `legal-question:${row.questionId}` : null,
    row.assignmentId,
    row.registerQuestionId ? `register-question:${row.registerQuestionId}` : null,
    row.reportQuestionId ? `report-question:${row.reportQuestionId}` : null,
    row.legalDecisionRecordId,
    row.decisionAuthority?.recordId,
    row.decisionAuthority?.decisionId,
    row.decisionAuthority?.questionId ? `legal-question:${row.decisionAuthority.questionId}` : null,
    row.decisionAuthority?.assignmentId,
  ]);
  for (const document of inputs.decisions) {
    const { value } = document;
    const records = [
      ...asArray(value.decisions),
      ...asArray(value.immediateAssignments),
      ...asArray(value.questionDecisions),
      ...asArray(value.researchTrackDecisions),
      ...asArray(value.rows),
      ...asArray(value.routes),
    ];
    for (const record of records) {
      if (!identityValues(record).some((identity) => wanted.has(identity))) continue;
      ids.push(...recordIds(record));
      if (asArray(value.researchTrackDecisions).includes(record)) ids.push(`research-track-decision:${record.trackId}`);
    }
    if (identityValues(value).some((identity) => wanted.has(identity))) ids.push(...recordIds(value));
  }
  return uniq(ids);
}

function exactTrackDecisions(inputs, trackId) {
  return inputs.decisions.flatMap(({ file, value }) => asArray(value.decisions)
    .filter((decision) => asArray(decision.tracks).includes(trackId))
    .map((decision) => ({ ...decision, sourceFile: file, recordId: value.recordId ?? null })));
}

function matchingPacketSpecs(indexes, { jurisdiction, trackId = null, pathwayId = null, contractRouteKey = null }) {
  return uniq([
    ...(trackId ? (indexes.packetSpecsByTrack.get(`${jurisdiction}:${trackId}`) ?? []).map((row) => `${row.sourceFile}#${row.specificationId ?? row.packetConfigurationId}`) : []),
    ...(pathwayId ? (indexes.packetSpecsByPathway.get(`${jurisdiction}:${pathwayId}`) ?? []).map((row) => `${row.sourceFile}#${row.specificationId ?? row.packetConfigurationId}`) : []),
    ...(contractRouteKey ? (indexes.packetSpecsByRoute.get(contractRouteKey) ?? []).map((row) => `${row.sourceFile}#${row.specificationId ?? row.packetConfigurationId}`) : []),
  ]).map((identity) => indexes.packetSpecificationRecords.find((row) => `${row.sourceFile}#${row.specificationId ?? row.packetConfigurationId}` === identity));
}

function implementationEvidenceForTrack(track, indexes, relationships, packetSpecs = []) {
  const key = `${track.jurisdiction}:${track.trackId}`;
  const ledger = indexes.authorityByTrack.get(key);
  const counsel = indexes.counselByTrack.get(key);
  return uniq([
    `legal-design:${track.legalDesignStatus}`,
    `runtime:${track.runtimeDisabledReason ?? "runtime disabled; no route authority granted"}`,
    ledger ? `authority-ledger:${ledger.rootBlockerStage}:${ledger.transitionReasonCode}` : null,
    counsel ? `completed-output-counsel-family:${counsel.familyId}:${counsel.legalApprovalResult}` : null,
    ...packetSpecs.map((spec) => `packet-specification:${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}:historical=${spec.specificationHistorical}`),
    ...relationships.map((row) => `source-relationship:${row.componentId}:${row.corpusState}`),
  ]);
}

function commercialStateFor(pathwayKey, indexes) {
  const projection = indexes.gradeAProjectionByPathway.get(pathwayKey);
  if (projection) return `GRADE_A_${projection.state}_${String(projection.commercialStatus).toUpperCase()}`;
  const launch = indexes.launchByPathway.get(pathwayKey);
  if (launch) return launch.operationallySellable ? "LAUNCH_GRAPH_OPERATIONALLY_SELLABLE" : "LAUNCH_GRAPH_CLOSED";
  return "NO_GRADE_A_FULFILLMENT_RECORD";
}

const OWNER_COMPLETED_OUTPUT_DECISION_ID = "auth-2026-08-19-owner-legal-approval-completed-output";

function ownerCompletedOutputDecision(inputs) {
  const queueRecord = asArray(inputs.authorizationQueue?.entries).find((row) => row.id === OWNER_COMPLETED_OUTPUT_DECISION_ID);
  const manifestRecord = asArray(inputs.counselManifest?.ownerLegalDecision?.records)
    .find((row) => row.recordId === OWNER_COMPLETED_OUTPUT_DECISION_ID);
  if (!queueRecord
    || queueRecord.kind !== "owner_legal_decision"
    || queueRecord.status !== "authorized"
    || queueRecord.decision !== "approved"
    || queueRecord.legalApprovalResult !== "approved_by_decision_owner"
    || inputs.counselManifest?.ownerLegalDecision?.approved !== true
    || inputs.counselManifest?.ownerLegalDecision?.result !== "approved_by_decision_owner"
    || manifestRecord?.legalApprovalResult !== "approved_by_decision_owner") return null;
  const queueFamilies = new Set(asArray(queueRecord.decisionScope?.completedOutputPacketFamilies));
  const technicalAnnexFamilies = new Set(asArray(queueRecord.decisionScope?.annexFamiliesWithSupersededTechnicalEvidence));
  const approvedFamilies = inputs.counselManifest.families.filter((family) =>
    queueFamilies.has(family.familyId)
      && family.legalApprovalResult === "approved_by_decision_owner"
      && family.legalDecisionRecordId === OWNER_COMPLETED_OUTPUT_DECISION_ID
      && (asArray(family.substantiveDifferencesFromAdoptedDesign).length === 0
        || technicalAnnexFamilies.has(family.familyId)));
  return { queueRecord, manifestRecord, approvedFamilies };
}

function ownerApprovedFamilyForCandidate(candidate, inputs) {
  const decision = ownerCompletedOutputDecision(inputs);
  if (!decision || candidate?.possibleCategory !== "A_MUST_FULFILL" || !candidate?.packetFamilyId || !candidate?.trackId) return null;
  const exactTrack = inputs.tracks.find((track) => track.jurisdiction === candidate.jurisdiction && track.trackId === candidate.trackId);
  if (!exactTrack || exactTrack.outputStrategy !== candidate.currentOutputStrategy) return null;
  return decision.approvedFamilies.find((family) =>
    family.familyId === candidate.packetFamilyId
      && asArray(family.jurisdictions).includes(candidate.jurisdiction)
      && asArray(family.tracksServed).includes(candidate.trackId)) ?? null;
}

function mappingIsExisting(status) {
  return new Set(["mapped", "complete", "existing_map", "approved_map"]).has(normalize(status).toLowerCase());
}

function hasLocalVariationSignal(track, contract) {
  const scope = normalize(track?.geographicScope).toLowerCase();
  const explicitNonStatewide = ["county", "district", "circuit", "court_specific", "agency_specific"].includes(scope);
  const multipleGeographyKeys = asArray(track?.geographyKeys).length > 1;
  const explicitVariationText = /county-specific|district-specific|circuit-specific|local (?:form|rule|fee|practice|configuration)|var(?:y|ies) by (?:county|district|circuit|court|agency|parish)/i.test(textOf(
    track?.rules,
    track?.packetInstructions,
    track?.scopeRestrictions,
    track?.releaseBlockers,
    track?.unresolvedQuestions,
    track?.openLegalQuestions,
    contract?.deliveryGates,
  ));
  return explicitNonStatewide || multipleGeographyKeys || explicitVariationText;
}

function missingWorkFor({ classification, strategy, track, unit, pathway, contract, branch, relationships, artifacts, packetSet, indexes, gradeARecords = [] }) {
  if (classification.possibleCategory !== "A_MUST_FULFILL") return [];
  const work = [];
  if (!allRequiredRelationshipSourcesHaveCustody(relationships, indexes.sourceCustodyInputs)) {
    work.push("Acquire and verify exact official-source custody for every required relationship; one held source cannot satisfy a separate missing form or source.");
  }
  const mappingRows = inputsSafe(indexes, "officialFormAssignments", []);
  const exactOfficialFormIds = uniq([
    ...relationships.map((row) => row.officialFormId),
    ...asArray(packetSet?.components).map((component) => component.officialFormId),
  ]).filter(Boolean);
  if (strategy === "official_pdf_fill") {
    const officialRelationships = relationships.filter((row) => row.officialFormId || row.officialSourceUrl);
    if (!officialRelationships.length) work.push("Acquire and bind the exact current official source; no exact form relationship is recorded.");
  }
  if (strategy === "official_pdf_fill" || exactOfficialFormIds.length) {
    const mapped = mappingRows.filter((row) => row.jurisdiction === (track?.jurisdiction ?? pathway?.jurisdiction)
      && row.trackId === track?.trackId
      && (!exactOfficialFormIds.length || exactOfficialFormIds.includes(row.officialFormId)));
    if (!exactOfficialFormIds.length || mapped.length < exactOfficialFormIds.length || mapped.some((row) => !mappingIsExisting(row.mappingStatus))) {
      work.push("Draft or complete the exact official-form field map for every required official form or companion.");
    }
  }
  if (strategy === "custom_pleading" || strategy === "composed_pleading") {
    work.push("Implement or confirm the composed pleading and every required companion component.");
  }
  if (strategy === "participant_agency_application") work.push("Implement the participant-facing agency application workflow without representing it as a court petition.");
  if (hasLocalVariationSignal(track, contract)) work.push("Record and test each local filing, fee, venue, or delivery variation.");
  if (pathway && (!indexes.crosswalkPathway.get(`${pathway.jurisdiction}:${pathway.compiledPathwayId}`)?.mappedRegistryTrackIds?.length || !indexes.factoryByPathway.get(`${pathway.jurisdiction}:${pathway.compiledPathwayId}`))) {
    work.push("Wire the exact runtime pathway to its legal-design track and packet family; this census grants no runtime authority.");
  }
  if (track && !(indexes.crosswalkTrack.get(`${track.jurisdiction}:${track.trackId}`)?.mappedCompiledPathwayIds?.length)) {
    work.push("Add an exact runtime representation or record an approved exclusion; the legal-design track is not represented in compiled runtime.");
  }
  if (unit) work.push("Wire this explicit unit as a distinct branch so the parent route cannot hide or collapse it.");
  if (branch) work.push("Wire the explicit route-contract service branch independently from its parent outcome.");
  work.push("Generate or locate an exact route output artifact and complete artifact review; source custody is not output proof.");
  const approved = gradeARecords.some((record) => /approved|pass/i.test(textOf(record.outputLegalApproval, record.finalVerification)) && record.serviceDisposition === "COMPLETE_PACKET_PROVEN");
  if (!approved) work.push("Obtain completed-output legal approval for the exact packet family; this census creates no approval.");
  if (!packetSet && !contract?.packetFamily && !branch?.packetFamily) work.push("Create an exact packet-family and packet-set identity or an explicit composed-pleading treatment.");
  return uniq(work);
}

function inputsSafe(indexes, key, fallback) {
  return Object.hasOwn(indexes, key) ? indexes[key] : fallback;
}

function requiredSourceIdsFromTrack(track, relationships) {
  const ids = sourceIdsForRelationships(relationships);
  for (const source of asArray(track.officialSources)) {
    if (typeof source === "string") ids.push(`declared-source:${source}`);
    else {
      if (source.officialFormId) ids.push(`official-form:${source.officialFormId}`);
      if (source.url || source.officialSourceUrl) ids.push(`source-url:${source.url ?? source.officialSourceUrl}`);
      if (/^[a-f0-9]{64}$/i.test(normalize(source.sha256))) ids.push(`source-sha256:${source.sha256.toLowerCase()}`);
    }
  }
  return uniq(ids);
}

function candidateBase(entity, overrides) {
  return {
    routeKey: entity.routeKey,
    jurisdiction: entity.jurisdiction,
    publicLabel: overrides.publicLabel ?? entity.publicLabel ?? "not recorded",
    statuteOrAuthority: overrides.statuteOrAuthority ?? entity.statuteOrAuthority ?? "not recorded",
    trackId: overrides.trackId ?? null,
    runtimePathwayId: overrides.runtimePathwayId ?? null,
    routeContractId: overrides.routeContractId ?? null,
    processActor: overrides.processActor ?? "not recorded",
    participantCanInitiate: overrides.classification.participantCanInitiate,
    participantFacingInstrument: overrides.participantFacingInstrument ?? "not recorded",
    destination: overrides.destination ?? "not recorded",
    currentOutputStrategy: overrides.currentOutputStrategy ?? null,
    packetFamilyId: overrides.packetFamilyId ?? null,
    packetSetId: overrides.packetSetId ?? null,
    requiredSourceIds: uniq(overrides.requiredSourceIds ?? []),
    existingArtifactIds: uniq(overrides.existingArtifactIds ?? []),
    currentServiceDisposition: overrides.currentServiceDisposition ?? "not_recorded",
    currentCommercialState: overrides.currentCommercialState ?? "NO_GRADE_A_FULFILLMENT_RECORD",
    legalDecisionRecordIds: uniq(overrides.legalDecisionRecordIds ?? []),
    currentImplementationEvidence: uniq(overrides.currentImplementationEvidence ?? []),
    missingImplementationWork: uniq(overrides.missingImplementationWork ?? []),
    possibleCategory: overrides.classification.possibleCategory,
    possibleCategoryBReason: overrides.classification.possibleCategoryBReason,
    classificationConfidence: overrides.classification.classificationConfidence,
    requiresLegalReview: overrides.classification.requiresLegalReview,
    legalReviewQuestion: overrides.classification.legalReviewQuestion,
  };
}

function componentInstrument(components, fallback = "not recorded") {
  const filing = components.filter((component) => component.role !== "process_guidance");
  return filing.map((component) => `${component.role}: ${component.officialFormId ?? component.componentId}`).join("; ") || fallback;
}

function contractStrategy(contractOrBranch) {
  if (contractOrBranch?.outcomeMode === "agency_application") return "participant_agency_application";
  if (["automatic_relief", "guidance_status", "referral"].includes(contractOrBranch?.outcomeMode)) return "process_guidance";
  return null;
}

function exactSelectorIdentity(selector) {
  if (!selector?.operator || !selector?.factId || !Object.hasOwn(selector, "value")) return null;
  return JSON.stringify([selector.operator, selector.factId, selector.value]);
}

function isSharedFormOnlyCrosswalkConflict(pathway) {
  return asArray(pathway.mappingEvidence).includes("shared_official_form")
    && !asArray(pathway.evidenceDetail?.sharedStatutoryCitations).length;
}

function heldPresentationConflictForPathway(pathway, presentationConflicts) {
  if (!pathway) return null;
  const routeKeyValue = `${pathway.jurisdiction}:${pathway.compiledPathwayId}`;
  return asArray(presentationConflicts?.rows).find((row) => row.routeKey === routeKeyValue && row.status === "held") ?? null;
}

function trustedPathwayTrackIds(pathway, presentationConflicts = null) {
  return isSharedFormOnlyCrosswalkConflict(pathway) || heldPresentationConflictForPathway(pathway, presentationConflicts)
    ? []
    : uniq(pathway.mappedRegistryTrackIds ?? []);
}

function trustedTrackPathwayIds(inputs, jurisdiction, trackId) {
  const raw = inputs.crosswalk.registryTracks.find((row) => row.jurisdiction === jurisdiction && row.registryTrackId === trackId)?.mappedCompiledPathwayIds ?? [];
  return uniq(raw.filter((pathwayId) => {
    const pathway = inputs.crosswalk.compiledPathways.find((row) => row.jurisdiction === jurisdiction && row.compiledPathwayId === pathwayId);
    return pathway && trustedPathwayTrackIds(pathway, inputs.presentationConflicts).includes(trackId);
  }));
}

function representationEdges(inputs) {
  const edges = new Map();
  const add = (jurisdiction, trackId, pathwayId, relationshipType, direction) => {
    const id = `${jurisdiction}:${trackId}<->${pathwayId}`;
    const existing = edges.get(id) ?? {
      edgeId: id,
      jurisdiction,
      trackId,
      compiledPathwayId: pathwayId,
      trackRouteKey: routeKey("track", jurisdiction, trackId),
      pathwayRouteKey: routeKey("pathway", jurisdiction, pathwayId),
      relationshipTypes: [],
      sourceDirections: [],
    };
    existing.relationshipTypes = uniq([...existing.relationshipTypes, relationshipType]);
    existing.sourceDirections = uniq([...existing.sourceDirections, direction]);
    edges.set(id, existing);
  };
  for (const row of inputs.crosswalk.registryTracks) {
    for (const pathwayId of row.mappedCompiledPathwayIds ?? []) add(row.jurisdiction, row.registryTrackId, pathwayId, row.relationshipType, "registry_to_runtime");
  }
  for (const row of inputs.crosswalk.compiledPathways) {
    for (const trackId of row.mappedRegistryTrackIds ?? []) add(row.jurisdiction, trackId, row.compiledPathwayId, row.registryRelation, "runtime_to_registry");
  }
  for (const edge of edges.values()) {
    const pathway = inputs.crosswalk.compiledPathways.find((row) => row.jurisdiction === edge.jurisdiction && row.compiledPathwayId === edge.compiledPathwayId);
    edge.canonicalizationDisposition = pathway && isSharedFormOnlyCrosswalkConflict(pathway)
      ? "REJECTED_SHARED_FORM_ONLY_WITHOUT_SHARED_STATUTORY_CITATION"
      : pathway && heldPresentationConflictForPathway(pathway, inputs.presentationConflicts)
        ? "REJECTED_HELD_PRESENTATION_CONFLATION_PENDING_EXACT_CROSSWALK_AND_COMPILED_PROFILE_REPAIR"
      : "REPRESENTATION_LINK_ACCEPTED_FOR_SOURCE_ACCOUNTING";
  }
  return [...edges.values()].sort((a, b) => a.edgeId.localeCompare(b.edgeId));
}

function worklistFactsForTrack(track, packetSet, relationships, strategy) {
  const components = asArray(packetSet?.components ?? track.packetSet?.components);
  const actions = asArray(packetSet?.participantActionRequired ?? track.participantFilingRequirements);
  const instructions = asArray(track.packetInstructions);
  const boundaries = asArray(track.selfHelpBoundaries);
  const componentLine = (component) => `${component.role}: ${component.officialFormId ?? component.componentId}`;
  const componentLines = components.map(componentLine);
  const componentByRole = (predicate) => components.filter((component) => predicate(normalize(component.role).toLowerCase())).map(componentLine);
  const actionLines = actions.map((action) => action.description ?? textOf(action));
  const actionLinesByKind = (kind) => actions
    .filter((action) => action?.kind === kind)
    .map((action) => action.description ?? textOf(action));
  const actionBy = (pattern) => actionLines.filter((line) => pattern.test(line));
  const primaryRoles = new Set([
    "primary_filing", "primary_filing_post_2019", "alternate_primary_filing", "secondary_filing", "petition", "motion",
    "application_for_sealing", "agency_written_request", "bci_certificate_application", "certificate_of_verification_application",
    "district_attorney_alternative_filing", "expedited_request", "in_camera_request", "informal_demand_letter", "lfo_refund_claim",
    "misidentification_motion", "motion_for_partial_removal", "participant_request_to_district_attorney", "prosecutor_request_letter",
    "request_to_district_attorney", "request_to_trial_court", "status_request", "verified_application_to_prosecutor", "written_request_to_court",
  ]);
  const hearing = uniq([
    ...instructions,
    ...boundaries,
    track.rules?.hearing,
    track.mechanism,
  ].flatMap((line) => String(line ?? "").split(/(?<=[.!?;])\s+/)).filter(explicitUncontestedHearingEvidence));
  const contested = uniq([...instructions, ...boundaries, ...asArray(track.postGenerationHandoffs)].filter(explicitContestedHearingEvidence));
  const scopedServiceLines = [...actionLinesByKind("serve_party"), track.rules?.service, track.rules?.notice]
    .flatMap(routeScopedServiceClauses);
  const dedicatedServiceLines = scopedServiceLines.filter((line) =>
    /\b(?:serve|served|service on|notice to (?:the )?(?:attorney|prosecut|state|police|agency|respondent|victim)|provide (?:a )?copy to|send (?:a )?copy to)\b/i.test(String(line)));
  const explicitServiceRecipientLines = uniq([...scopedServiceLines, ...dedicatedServiceLines]).filter((line) =>
    /^none required\b/i.test(String(line))
      || /\b(?:serves?\s+(?:the\s+)?(?:prosecut(?:or|ing attorney|ing agency)|attorney|state(?:'s)? attorney|district attorney|agency|court|clerk|respondent|victim|custodian|law enforcement|police)|serves?\s+(?:a\s+)?copy\s+(?:on|to)|service (?:on|to)|notice (?:on|to)|provide (?:a )?copy to|send (?:a )?copy to|no service|transmit.*\bto\b)\b/i.test(String(line)));
  const explicitServiceMethodLines = scopedServiceLines.filter((line) =>
    /^none required\b/i.test(String(line))
      || /\b(?:mail|deliver|electronic|e-?service|personal(?:ly)?|hand|certified mail|portal|no service|transmit)\b/i.test(String(line)));
  const attachmentClausesForAction = (action) => {
    if (!["obtain_document", "file"].includes(action?.kind)) return [];
    const text = `${action?.description ?? ""} ${action?.conditionDescription ?? ""}`;
    const document = "(?:certif(?:icate|ication|ied)?|record|history|affidavit|fingerprint|statement|letter|copy|document|exhibit|opinion|disposition|charging document|identification|proof|release|card|report)";
    const substantiveSupport = /\b(?:arrest record|criminal history|certified criminal history|disposition(?:s| records?)?|rap sheet|repository record|charging document|sworn affidavit|affidavit|fingerprints?|fingerprint set|supporting documentation|certified statement|cover letter|identification|exhibit|release|report|proof (?!of service)|certificate (?!of service)|certification (?!of service))\b/i;
    return text.split(/(?<=[.!?;])\s+/).map((clause) => clause.trim()).filter((clause) => {
      const explicitAttachment = new RegExp(`\\b(?:attach(?:ed|ment)?|enclose(?:d)?|include(?:d)?)\\b.{0,90}\\b${document}\\b|\\b${document}\\b.{0,90}\\b(?:attach(?:ed|ment)?|enclose(?:d)?|include(?:d)?)\\b`, "i").test(clause);
      const filingCompanion = new RegExp(`\\b(?:file|filed|submit|submitted)\\b.{0,70}\\b(?:with|together with|accompanied by)\\b(?!\\s+(?:the\\s+)?(?:clerk|court|agency|prosecutor|department|office)\\b).{0,90}\\b${document}\\b`, "i").test(clause);
      const partOfInstrument = new RegExp(`\\b${document}\\b.{0,70}\\b(?:part of|required with|component of)\\b.{0,50}\\b(?:petition|application|request|motion|packet)\\b|\\b(?:part of|required with|component of)\\b.{0,70}\\b${document}\\b`, "i").test(clause);
      const orderedPacket = new RegExp(`\\bassemble the packet\\b.{0,140}\\b${document}\\b`, "i").test(clause);
      const relationship = explicitAttachment || filingCompanion || partOfInstrument || orderedPacket || /\bstatutory attachment\b/i.test(clause);
      if (!relationship) return false;
      if (action.kind === "obtain_document") return true;
      return substantiveSupport.test(clause);
    });
  };
  const attachmentLines = actions.flatMap(attachmentClausesForAction);
  const postFilingLines = uniq([...instructions, ...asArray(track.postGenerationHandoffs)]).filter((line) =>
    /\b(?:after (?:filing|submission)|post[- ]filing|once filed|following filing|after the (?:petition|motion|application|request) is filed|order entered|decision issued|filing status)\b/i.test(String(line)));
  return {
    primaryOfficialFormOrComposedPleading: evidenceField([
      ...componentByRole((role) => primaryRoles.has(role)),
      strategy === "custom_pleading" ? `composed pleading for ${track.trackId}` : null,
    ]),
    proposedOrder: evidenceField(componentByRole((role) => ["proposed_order", "court_order", "order_for_hearing", "stipulation_and_proposed_order"].includes(role))),
    coverSheet: evidenceField(componentByRole((role) => ["cover_sheet", "civil_cover_sheet"].includes(role))),
    notice: evidenceField(componentByRole((role) => [
      "notice", "notice_of_entry", "notice_of_hearing", "notice_package", "notice_to_submit_or_notice_of_hearing",
      "prosecutor_notification", "second_stage_notice", "victim_notice_form", "notice_and_certificate_of_service",
    ].includes(role))),
    certificateOfService: evidenceField(componentByRole((role) => [
      "certificate_of_service", "proof_of_service", "proof_of_delivery_to_prosecutor", "acceptance_of_service", "notice_and_certificate_of_service",
    ].includes(role))),
    affidavitOrVerification: evidenceField(componentByRole((role) => [
      "affidavit", "supporting_affidavit", "declaration_and_verification", "decriminalization_affidavit", "one_time_use_affidavit",
      "supporting_declaration", "sworn_prior_applications_statement", "verification",
    ].includes(role))),
    schedulesOrContinuationPages: evidenceField(componentByRole((role) => [
      "continuation", "count_by_count_schedule", "supplemental_pleading", "supporting_timeline",
    ].includes(role))),
    requiredParticipantAttachments: evidenceField([
      ...componentByRole((role) => role === "attachment" || role.endsWith("_attachment")),
      ...attachmentLines,
    ]),
    laterCompletionFields: evidenceField(asArray(track.manualCompletionItems).map((item) => item.item ?? textOf(item))),
    signatureRequirements: evidenceField(actionLinesByKind("sign")),
    notarizationRequirements: evidenceField(actionLinesByKind("notarize")),
    filingDestination: evidenceField([textOf(track.destination), track.venue]),
    filingMethod: evidenceField(actionLinesByKind("file").filter((line) => explicitParticipantFilingMethodEvidence(line, true))),
    filingFee: evidenceField(actionLinesByKind("pay_fee").flatMap(routeFilingFeeClauses)),
    feeWaiverTreatment: evidenceField(actionLinesByKind("apply_fee_waiver")),
    serviceRecipients: evidenceField(explicitServiceRecipientLines),
    serviceMethod: evidenceField(explicitServiceMethodLines),
    serviceTiming: evidenceField(scopedServiceLines.filter((line) => /^none required\b/i.test(String(line)) || explicitServiceTimingEvidence(line))),
    filingDeadline: evidenceField(uniq([
      ...actionLines,
      track.rules?.filing,
      ...instructions,
      ...asArray(track.scopeRestrictions),
      ...asArray(track.participantFilingRequirements).flatMap((item) => [item.howToObtain, item.conditionDescription]),
    ]).filter(explicitParticipantFilingDeadlineEvidence)),
    waitingPeriodCalculation: evidenceField(asArray(track.waitingPeriods).map((period) => textOf(period))),
    postFilingInstructions: evidenceField(postFilingLines),
    uncontestedHearingTreatment: evidenceField(hearing),
    contestedHearingOrOppositionHandoff: evidenceField(contested),
  };
}

function unitAssociatedComponents(unit, packetSet, strategy) {
  const description = normalize(unit?.description).toLowerCase();
  const compactDescription = description.replace(/[^a-z0-9]/g, "");
  return asArray(packetSet?.components).filter((component) => {
    const role = normalize(component.role).toLowerCase();
    const formId = normalize(component.officialFormId);
    if (formId) {
      const compactFormId = formId.toLowerCase().replace(/\.(?:pdf|docx?)$/i, "").replace(/[^a-z0-9]/g, "");
      if (compactFormId && compactDescription.includes(compactFormId)) return true;
      const tokens = formId.toLowerCase().replace(/\.(?:pdf|docx?)$/i, "").split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3 && token !== unit?.unitId?.slice(0, 2).toLowerCase());
      if (tokens.length >= 2 && tokens.every((token) => description.includes(token === "exp" ? "expung" : token))) return true;
    }
    const roleTokens = role.split("_").filter((token) => token.length >= 3 && !["primary", "filing", "instructions"].includes(token));
    if (roleTokens.length >= 2 && roleTokens.every((token) => description.includes(token))) return true;
    if (!formId && role === "primary_filing" && strategy === "custom_pleading" && /\b(?:petition|motion|application|written request|demand letter)\b/i.test(description)) {
      return true;
    }
    return false;
  });
}

function worklistFactsForUnit(unit, strategy, packetSet) {
  const description = String(unit?.description ?? "");
  const sentences = description.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  const by = (pattern) => sentences.filter((line) => pattern.test(line));
  const components = unitAssociatedComponents(unit, packetSet, strategy);
  const componentByRole = (predicate) => components.filter((component) => predicate(normalize(component.role).toLowerCase()))
    .map((component) => `${component.role}: ${component.officialFormId ?? component.componentId}`);
  const primaryRoles = new Set([
    "primary_filing", "primary_filing_post_2019", "alternate_primary_filing", "secondary_filing", "petition", "motion",
    "application_for_sealing", "agency_written_request", "bci_certificate_application", "certificate_of_verification_application",
    "district_attorney_alternative_filing", "expedited_request", "in_camera_request", "informal_demand_letter", "lfo_refund_claim",
    "misidentification_motion", "motion_for_partial_removal", "participant_request_to_district_attorney", "prosecutor_request_letter",
    "request_to_district_attorney", "request_to_trial_court", "status_request", "verified_application_to_prosecutor", "written_request_to_court",
  ]);
  const serviceLines = sentences.filter((line) => {
    if (/\b(?:not settled|not approved|not located|not established|unresolved|unknown)\b/i.test(line)) return false;
    return /\b(?:participant|petitioner|person|filer)\b.{0,100}\b(?:serve|serves|send|sends|deliver|delivers|give notice)\b/i.test(line)
      || /\b(?:must|shall|required to)\s+be\s+served\b/i.test(line)
      || /\bcourt sends\b.{0,100}\bpetitioner does not serve\b/i.test(line)
      || /\bcertificate of service covers\b/i.test(line)
      || /\bnotice must reach\b/i.test(line);
  });
  return {
    primaryOfficialFormOrComposedPleading: evidenceField([
      ...componentByRole((role) => primaryRoles.has(role)),
      unit?.label ? `${unit.label} (${strategy ?? "output treatment not recorded"})` : null,
    ]),
    proposedOrder: evidenceField([...componentByRole((role) => ["proposed_order", "court_order", "order_for_hearing", "stipulation_and_proposed_order"].includes(role)), ...by(/\bproposed order\b/i)]),
    coverSheet: evidenceField([...componentByRole((role) => ["cover_sheet", "civil_cover_sheet"].includes(role)), ...by(/\bcover sheet\b/i)]),
    notice: evidenceField([...componentByRole((role) => ["notice", "notice_of_entry", "notice_of_hearing", "notice_package", "notice_to_submit_or_notice_of_hearing", "prosecutor_notification", "second_stage_notice", "victim_notice_form", "notice_and_certificate_of_service"].includes(role)), ...by(/\b(?:notice to|notice form|victim notice)\b/i)]),
    certificateOfService: evidenceField([...componentByRole((role) => ["certificate_of_service", "proof_of_service", "proof_of_delivery_to_prosecutor", "acceptance_of_service", "notice_and_certificate_of_service"].includes(role)), ...by(/\b(?:certificate of service|proof of service|acceptance of service)\b/i)]),
    affidavitOrVerification: evidenceField([...componentByRole((role) => ["affidavit", "supporting_affidavit", "declaration_and_verification", "decriminalization_affidavit", "one_time_use_affidavit", "supporting_declaration", "sworn_prior_applications_statement", "verification"].includes(role)), ...by(/\b(?:affidavit|sworn|declaration|verification (?:form|statement|instrument|signature|under oath))\b/i)]),
    schedulesOrContinuationPages: evidenceField([...componentByRole((role) => ["continuation", "count_by_count_schedule", "supplemental_pleading", "supporting_timeline"].includes(role)), ...by(/\b(?:schedule|continuation|supplemental page)\b/i)]),
    requiredParticipantAttachments: evidenceField([...componentByRole((role) => role === "attachment" || role.endsWith("_attachment")), ...by(/\b(?:attach(?:ed|ment)?|accompan(?:y|ied)|send the order, fingerprints|fingerprint card .*required|with the certificate)\b/i)]),
    laterCompletionFields: evidenceField([]),
    signatureRequirements: evidenceField(by(/\b(?:participant|petitioner|filer) signs?\b/i)),
    notarizationRequirements: evidenceField(by(/\b(?:notary|notarized|sworn before)\b/i)),
    filingDestination: evidenceField(by(/\b(?:file(?:d)? in|file with|submit(?:s|ted)? .* to|send(?:s)? .* to)\b/i)),
    filingMethod: evidenceField(by(/\b(?:file|submit|send)\b/i).filter((line) => explicitParticipantFilingMethodEvidence(line, true))),
    filingFee: evidenceField(by(/\b(?:fee|cost|\$)\b/i).flatMap(routeFilingFeeClauses)),
    feeWaiverTreatment: evidenceField([...componentByRole((role) => role.startsWith("fee_waiver")), ...by(/\b(?:fee waiver|indigent|in forma)\b/i)]),
    serviceRecipients: evidenceField(serviceLines),
    serviceMethod: evidenceField(serviceLines.filter((line) => /\b(?:mail|deliver|electronic|hand|personal|send|serve)\b/i.test(line))),
    serviceTiming: evidenceField(serviceLines.filter(explicitServiceTimingEvidence)),
    filingDeadline: evidenceField(sentences.filter(explicitParticipantFilingDeadlineEvidence)),
    waitingPeriodCalculation: evidenceField(by(/\b(?:wait(?:ing)? period|must wait|no sooner than)\b/i)),
    postFilingInstructions: evidenceField(by(/\b(?:after filing|after the .* is filed|after the court order|after the judge signs|post-filing)\b/i)),
    uncontestedHearingTreatment: evidenceField(sentences.filter(explicitUncontestedHearingEvidence)),
    contestedHearingOrOppositionHandoff: evidenceField(sentences.filter(explicitContestedHearingEvidence)),
  };
}

function worklistFactsForContract(contract, branch = null) {
  const source = branch ?? contract;
  const components = asArray(source.packetComponents ?? contract.packetComponents);
  const gates = asArray(contract.deliveryGates).filter((gate) => !branch?.branchDeliveryGateIds || branch.branchDeliveryGateIds.includes(gate.id));
  const notes = asArray([source.note, contract.notes]);
  const componentBy = (pattern) => components.filter((item) => pattern.test(String(item)));
  const explicitServiceRecipientLines = [...components, ...notes].filter((line) =>
    /\b(?:serve|service (?:on|to)|notice (?:on|to)|provide (?:a )?copy to|send (?:a )?copy to)\b/i.test(String(line)));
  const explicitServiceMethodLines = notes.filter((line) =>
    /\b(?:serve|service|notice)\b/i.test(String(line))
      && /\b(?:mail|deliver|electronic|e-?service|personal(?:ly)?|hand|certified mail|portal)\b/i.test(String(line)));
  const explicitPostFilingLines = notes.filter((line) =>
    /\b(?:after (?:filing|submission)|post[- ]filing|once filed|following filing|after the (?:petition|motion|application|request) is filed|order entered|decision issued|filing status)\b/i.test(String(line)));
  return {
    primaryOfficialFormOrComposedPleading: evidenceField([...componentBy(/petition|motion|application|request|primary/i), source.packetFamily]),
    proposedOrder: evidenceField(componentBy(/order/i)),
    coverSheet: evidenceField(componentBy(/cover/i)),
    notice: evidenceField(componentBy(/notice/i)),
    certificateOfService: evidenceField(componentBy(/certificate.*service|proof.*service/i)),
    affidavitOrVerification: evidenceField(componentBy(/affidavit|verification|declaration/i)),
    schedulesOrContinuationPages: evidenceField(componentBy(/schedule|continuation|supplement/i)),
    requiredParticipantAttachments: evidenceField(componentBy(/record|certif|attachment|evidence|disposition/i)),
    laterCompletionFields: evidenceField(gates.flatMap((gate) => asArray(gate.items))),
    signatureRequirements: evidenceField(componentBy(/signature|signed/i)),
    notarizationRequirements: evidenceField(componentBy(/notari/i)),
    filingDestination: evidenceField([source.destination, contract.destination]),
    filingMethod: evidenceField(notes.filter((line) => explicitParticipantFilingMethodEvidence(line, false))),
    filingFee: evidenceField(flattenText([contract.timing, contract.notes, contract.deliveryGates]).filter((line) => /\bfiling fee\b|fees? (?:are |is )?waived|no fee is charged/i.test(line))),
    feeWaiverTreatment: evidenceField(flattenText(contract).filter((line) => /fee waiver|waiver of (?:the )?(?:filing|court|agency) fee|indigent|in forma/i.test(line))),
    serviceRecipients: evidenceField(explicitServiceRecipientLines),
    serviceMethod: evidenceField(explicitServiceMethodLines),
    serviceTiming: evidenceField(notes.filter(explicitServiceTimingEvidence)),
    filingDeadline: evidenceField(flattenText([contract.timing, contract.notes, contract.deliveryGates]).filter(explicitParticipantFilingDeadlineEvidence)),
    waitingPeriodCalculation: evidenceField(contract.timing?.kind === "filing_deadline" ? [] : [textOf(contract.timing)]),
    postFilingInstructions: evidenceField(explicitPostFilingLines),
    uncontestedHearingTreatment: evidenceField(notes.filter(explicitUncontestedHearingEvidence)),
    contestedHearingOrOppositionHandoff: evidenceField(flattenText(contract.failureDisposition).filter(explicitContestedHearingEvidence)),
  };
}

function worklistFactsForPacketSpecs(packetSpecs) {
  const specs = packetSpecs.filter((spec) => !spec.specificationHistorical);
  const documents = specs.flatMap((spec) => asArray(spec.documents));
  const documentLines = documents.map((document) => textOf(document));
  const linesBy = (pattern) => documentLines.filter((line) => pattern.test(line));
  const values = (field) => specs.flatMap((spec) => flattenText(spec[field]));
  const attachmentLines = specs.flatMap((spec) => asArray(spec.attachments).map((attachment) => {
    if (typeof attachment === "string") return attachment;
    const label = attachment?.title ?? attachment?.name ?? attachment?.label ?? attachment?.description ?? null;
    if (!label) return null;
    return attachment.requirement === "conditional" && attachment.conditionDescription
      ? `${label} — conditional: ${attachment.conditionDescription}`
      : label;
  })).filter(Boolean);
  const postFilingLines = specs.flatMap((spec) => asArray(spec.postFilingTimeline).map((item) =>
    typeof item === "string" ? item : [item?.step, item?.timing].filter(Boolean).join(" — "))).filter(Boolean);
  const hearingLines = specs.flatMap((spec) => asArray(spec.hearingAndObjectionStops).map((item) =>
    typeof item === "string"
      ? item
      : [item?.situation, item?.whatItMeans, item?.stopAndGetHelp === true ? "Stop and get help." : null].filter(Boolean).join(" "))).filter(Boolean);
  return {
    primaryOfficialFormOrComposedPleading: evidenceField(linesBy(/petition|motion|application|request|primary/i)),
    proposedOrder: evidenceField(linesBy(/proposed.order|\border\b/i)),
    coverSheet: evidenceField(linesBy(/cover.sheet|coversheet/i)),
    notice: evidenceField(linesBy(/notice/i)),
    certificateOfService: evidenceField(linesBy(/certificate.*service|proof.*service|affidavit.*service/i)),
    affidavitOrVerification: evidenceField(linesBy(/affidavit|verification|declaration/i)),
    schedulesOrContinuationPages: evidenceField(linesBy(/schedule|continuation|supplement|additional.page/i)),
    requiredParticipantAttachments: evidenceField(attachmentLines),
    laterCompletionFields: evidenceField(values("finalVerificationRequirements")),
    signatureRequirements: evidenceField([...linesBy(/signature|signed/i), ...values("participantChecklist").filter((line) => /sign|signature/i.test(line))]),
    notarizationRequirements: evidenceField([...linesBy(/notari/i), ...values("participantChecklist").filter((line) => /notari/i.test(line))]),
    filingDestination: evidenceField(values("filingDestination")),
    filingMethod: evidenceField(values("filingDestination").filter((line) => explicitParticipantFilingMethodEvidence(line, true))),
    filingFee: evidenceField(values("feeAndWaiver").flatMap(routeFilingFeeClauses)),
    feeWaiverTreatment: evidenceField(values("feeAndWaiver").filter((line) => /waiv|indigent|in forma/i.test(line))),
    serviceRecipients: evidenceField(values("serviceAndNotice").filter((line) => /\b(?:recipient|serve|service (?:on|to)|notice (?:on|to)|provide (?:a )?copy to|send (?:a )?copy to)\b/i.test(line))),
    serviceMethod: evidenceField(values("serviceAndNotice").filter((line) =>
      /\b(?:mail|deliver|electronic|e-?service|personal(?:ly)?|hand|certified mail|portal|no service|transmit)\b/i.test(line)
        && /\b(?:serve|service|notice|transmit)\b/i.test(line))),
    serviceTiming: evidenceField(values("serviceAndNotice").filter(explicitServiceTimingEvidence)),
    filingDeadline: evidenceField([...values("filingDestination"), ...postFilingLines].filter(explicitParticipantFilingDeadlineEvidence)),
    waitingPeriodCalculation: evidenceField(postFilingLines.filter((line) => /wait|days?|months?|years?|calculate|from the/i.test(line))),
    postFilingInstructions: evidenceField(postFilingLines),
    uncontestedHearingTreatment: evidenceField(hearingLines.filter(explicitUncontestedHearingEvidence)),
    contestedHearingOrOppositionHandoff: evidenceField(hearingLines.filter(explicitContestedHearingEvidence)),
  };
}

function mergeWorklistFacts(facts) {
  const merged = {};
  for (const field of DELIVERABLE_FIELDS) {
    const values = facts.flatMap((item) => item[field]?.entries ?? []).filter((entry) => entry !== "not recorded");
    merged[field] = evidenceField(values);
  }
  return merged;
}

function overlayWorklistFacts(base, ...overlays) {
  const result = Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, base[field] ?? evidenceField([])]));
  for (const overlay of overlays) {
    for (const field of DELIVERABLE_FIELDS) {
      if (overlay[field]?.status === "recorded") result[field] = overlay[field];
    }
  }
  return result;
}

function workTypesFor(candidate, detail, inputs, indexes) {
  const types = [];
  const relationships = detail.relationships ?? [];
  if (!allRequiredRelationshipSourcesHaveCustody(relationships, inputs)) types.push("OFFICIAL_SOURCE_ACQUISITION_REQUIRED");
  const exactOfficialFormIds = uniq((candidate.requiredSourceIds ?? [])
    .filter((sourceId) => sourceId.startsWith("official-form:"))
    .map((sourceId) => sourceId.slice("official-form:".length)));
  if (candidate.currentOutputStrategy === "official_pdf_fill" || exactOfficialFormIds.length) {
    const assignments = inputs.specifications.officialFormAssignments.filter((row) => row.jurisdiction === candidate.jurisdiction
      && row.trackId === candidate.trackId
      && (!exactOfficialFormIds.length || exactOfficialFormIds.includes(row.officialFormId)));
    if (exactOfficialFormIds.length
      && exactOfficialFormIds.every((formId) => assignments.some((row) => row.officialFormId === formId && mappingIsExisting(row.mappingStatus)))) {
      types.push("OFFICIAL_FORM_EXISTING_MAP");
    } else {
      types.push("OFFICIAL_FORM_MAP_REQUIRED");
    }
  }
  if (["custom_pleading", "composed_pleading"].includes(candidate.currentOutputStrategy)) types.push("COMPOSED_PLEADING");
  const explicitAgencyApplication = candidate.currentOutputStrategy === "participant_agency_application"
    || detail.track?.outputStrategy === "participant_agency_application"
    || detail.contract?.outcomeMode === "agency_application"
    || detail.branch?.outcomeMode === "agency_application";
  if (explicitAgencyApplication) types.push("PARTICIPANT_AGENCY_APPLICATION");
  if (hasLocalVariationSignal(detail.track, detail.contract)) types.push("LOCAL_VARIATION_REQUIRED");
  if (candidate.missingImplementationWork.some((item) => /wir(?:e|ing)|runtime representation|packet-family|application-treatment/i.test(item))) types.push("PRODUCT_WIRING_REQUIRED");
  types.push("ARTIFACT_REVIEW_REQUIRED");
  if (!ownerApprovedFamilyForCandidate(candidate, inputs)) types.push("OUTPUT_LEGAL_APPROVAL_REQUIRED");
  return uniq(types);
}

export function buildOutputs() {
  const inputs = loadInputs();
  const contracts = effectiveContracts(inputs.contractDocuments);
  const indexes = buildIndexes(inputs, contracts);
  indexes.officialFormAssignments = inputs.specifications.officialFormAssignments;
  indexes.sourceCustodyInputs = inputs;
  const entities = [];
  const candidates = [];
  const details = new Map();

  for (const track of inputs.tracks) {
    const key = `${track.jurisdiction}:${track.trackId}`;
    const packetSet = indexes.packetSetByTrack.get(key) ?? track.packetSet ?? null;
    const relationships = indexes.relationshipsByTrack.get(key) ?? [];
    const packetSpecs = matchingPacketSpecs(indexes, { jurisdiction: track.jurisdiction, trackId: track.trackId });
    const currentPacketSpecs = packetSpecs.filter((spec) => !spec.specificationHistorical);
    const crosswalk = indexes.crosswalkTrack.get(key);
    const gradeARecords = uniq((crosswalk?.mappedCompiledPathwayIds ?? []).flatMap((pathwayId) => indexes.gradeAByPathway.get(`${track.jurisdiction}:${pathwayId}`) ?? []).map((row) => row.recordId))
      .map((recordId) => inputs.gradeARegistry.records.find((record) => record.recordId === recordId));
    const artifacts = exactArtifactIds(relationships, inputs.artifacts, gradeARecords);
    let classification = classifyTrack(track);
    const filingComponents = asArray(packetSet?.components).filter((component) => ["official_pdf_fill", "custom_pleading"].includes(component.outputStrategy));
    let strategy = track.outputStrategy ?? firstRecorded(filingComponents.map((component) => component.outputStrategy));
    const trackDecisions = exactTrackDecisions(inputs, track.trackId);
    const retirementDecision = trackDecisions.find((decision) => decision.classification === "RECORD_RETIREMENT_REQUIRED");
    const exactEvidenceTreatment = exactTrackEvidenceTreatment(track);
    if (exactEvidenceTreatment) {
      classification = exactEvidenceTreatment.classification;
      strategy = exactEvidenceTreatment.outputStrategy ?? strategy;
    }
    const treatmentUsesNewOutput = exactEvidenceTreatment?.outputStrategy
      && exactEvidenceTreatment.outputStrategy !== track.outputStrategy;
    const treatmentPacketSet = treatmentUsesNewOutput ? null : packetSet;
    if (retirementDecision) {
      classification = classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "UNSUITABLE_FOR_SELF_HELP", confidence: "high", participantCanInitiate: false });
      strategy = "process_guidance";
    }
    const entity = {
      routeKey: routeKey("track", track.jurisdiction, track.trackId),
      entityType: "legal_track",
      sourceIdentity: routeKey("track", track.jurisdiction, track.trackId),
      jurisdiction: track.jurisdiction,
      publicLabel: track.publicName,
      statuteOrAuthority: asArray(track.authority).join("; ") || "not recorded",
      parentRouteKey: null,
      hiddenParticipantBranch: false,
      mappedRuntimePathwayIds: uniq(crosswalk?.mappedCompiledPathwayIds ?? []),
    };
    entities.push(entity);
    const packetFamilyId = firstRecorded(currentPacketSpecs.map((spec) => spec.packetFamily)) ?? indexes.counselByTrack.get(key)?.familyId ?? null;
    const decisionIds = uniq([
      ...legalDecisionIds(inputs, [track.trackId]),
      retirementDecision?.recordId,
      retirementDecision?.decisionId,
      retirementDecision?.questionId ? `legal-question:${retirementDecision.questionId}` : null,
    ]);
    const missing = missingWorkFor({ classification, strategy, track, relationships, artifacts, packetSet: treatmentPacketSet, indexes, gradeARecords });
    const professionalHandoff = classification.possibleCategory === "B_LEGITIMATE_EXCLUSION"
      && classification.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP";
    const candidate = candidateBase(entity, {
      trackId: track.trackId,
      processActor: exactEvidenceTreatment?.processActor
        ?? (retirementDecision || professionalHandoff ? "attorney or professional" : actorFor(track.destination, textOf(track))),
      participantFacingInstrument: retirementDecision
        ? "no participant filing — same-hearing attorney guidance/referral"
        : professionalHandoff
          ? "no participant filing — attorney or qualified legal-assistance handoff"
          : exactEvidenceTreatment?.participantFacingInstrument
            ?? (classification.possibleCategory === "B_LEGITIMATE_EXCLUSION" && strategy === "process_guidance"
              ? "no filing — process guidance"
              : componentInstrument(asArray(packetSet?.components), strategy === "custom_pleading" ? `composed pleading for ${track.trackId}` : "not recorded")),
      destination: exactEvidenceTreatment?.destination
        ?? (retirementDecision || professionalHandoff ? "attorney or qualified legal-assistance referral" : track.destination ?? "not recorded"),
      currentOutputStrategy: strategy,
      packetFamilyId: retirementDecision || treatmentUsesNewOutput ? null : packetFamilyId,
      packetSetId: retirementDecision || treatmentUsesNewOutput ? null : packetSet?.packetSetId ?? null,
      requiredSourceIds: uniq([
        ...requiredSourceIdsFromTrack(track, relationships),
        ...packetSpecs.flatMap((spec) => asArray(spec.sourceIdentities).map((source) => `packet-spec-source:${source.sourceId ?? textOf(source)}`)),
      ]),
      existingArtifactIds: artifacts,
      currentServiceDisposition: retirementDecision ? "participant_facing_pleading_retired_professional_handoff" : crosswalk?.compiledCoverageDisposition ?? "not_represented_in_runtime",
      currentCommercialState: "NO_ROUTE_LEVEL_GRADE_A_AUTHORITY_FROM_TRACK_MEMBERSHIP",
      legalDecisionRecordIds: decisionIds,
      currentImplementationEvidence: uniq([
        ...implementationEvidenceForTrack(track, indexes, relationships, packetSpecs),
        retirementDecision ? `controlling-retirement-decision:${retirementDecision.recordId}:${retirementDecision.decisionId}` : null,
        exactEvidenceTreatment?.evidence,
      ]),
      missingImplementationWork: missing,
      classification,
    });
    candidates.push(candidate);
    details.set(entity.routeKey, {
      track,
      packetSet: treatmentPacketSet,
      packetSpecs: treatmentUsesNewOutput ? [] : packetSpecs,
      relationships,
      classification,
      worklistFacts: treatmentUsesNewOutput
        ? worklistFactsForTrack(track, null, relationships, strategy)
        : overlayWorklistFacts(worklistFactsForTrack(track, packetSet, relationships, strategy), worklistFactsForPacketSpecs(packetSpecs)),
    });

    for (const unit of track.units ?? []) {
      const unitStrategy = exactUnitStrategy(track, unit);
      const exactUnitTreatment = exactUnitEvidenceTreatment(track, unit);
      const unitClassification = exactUnitTreatment?.classification ?? classifyUnit(track, unit, unitStrategy);
      const unitEntity = {
        routeKey: routeKey("unit", track.jurisdiction, track.trackId, unit.unitId),
        entityType: "legal_track_unit",
        sourceIdentity: routeKey("unit", track.jurisdiction, track.trackId, unit.unitId),
        jurisdiction: track.jurisdiction,
        publicLabel: unit.label ?? `${track.publicName} — ${unit.unitId}`,
        statuteOrAuthority: asArray(track.authority).join("; ") || "not recorded",
        parentRouteKey: entity.routeKey,
        hiddenParticipantBranch: unitClassification.participantCanInitiate === true && !["official_pdf_fill", "custom_pleading"].includes(track.outputStrategy),
        unitOrder: unit.order,
      };
      entities.push(unitEntity);
      const unitFamily = firstRecorded(currentPacketSpecs.map((spec) => spec.packetFamily)) ?? indexes.counselByTrack.get(key)?.familyId ?? null;
      const unitMissing = missingWorkFor({ classification: unitClassification, strategy: unitStrategy, track, unit, relationships, artifacts, packetSet, indexes, gradeARecords });
      const unitCandidate = candidateBase(unitEntity, {
        trackId: track.trackId,
        processActor: exactUnitTreatment?.processActor
          ?? (unitClassification.participantCanInitiate === true ? "participant" : actorFor(track.destination, textOf(unit, track.destination))),
        participantFacingInstrument: exactUnitTreatment?.participantFacingInstrument
          ?? (unitStrategy === "process_guidance"
            ? `no filing — process guidance: ${unit.label ?? unit.unitId}`
            : unit.label ? `${unit.label} (${unitStrategy ?? "output treatment not recorded"})` : "not recorded"),
        destination: exactUnitTreatment?.destination ?? track.destination ?? "not recorded",
        currentOutputStrategy: unitStrategy,
        packetFamilyId: unitFamily,
        packetSetId: packetSet?.packetSetId ?? null,
        requiredSourceIds: uniq([
          ...requiredSourceIdsFromTrack(track, relationships),
          ...packetSpecs.flatMap((spec) => asArray(spec.sourceIdentities).map((source) => `packet-spec-source:${source.sourceId ?? textOf(source)}`)),
        ]),
        existingArtifactIds: artifacts,
        currentServiceDisposition: unit.available === false ? `unit_unavailable:${unit.unavailableReason ?? "not recorded"}` : "explicit_legal_design_unit",
        currentCommercialState: "NO_UNIT_LEVEL_GRADE_A_FULFILLMENT_RECORD",
        legalDecisionRecordIds: decisionIds,
        currentImplementationEvidence: uniq([...implementationEvidenceForTrack(track, indexes, relationships, packetSpecs), `unit:${unit.unitId}:available=${unit.available}`, `unit-packet-identity-status:${unit.packetIdentity ?? "not recorded"}`, exactUnitTreatment?.evidence]),
        missingImplementationWork: unitMissing,
        classification: unitClassification,
      });
      candidates.push(unitCandidate);
      details.set(unitEntity.routeKey, {
        track,
        unit,
        packetSet,
        packetSpecs: [],
        relationships,
        classification: unitClassification,
        worklistFacts: worklistFactsForUnit(unit, unitStrategy, packetSet),
      });
    }
  }

  for (const pathway of inputs.crosswalk.compiledPathways) {
    const key = `${pathway.jurisdiction}:${pathway.compiledPathwayId}`;
    const profilePathway = indexes.profilePathway.get(key);
    const contractEntry = indexes.contractByPathway.get(key);
    const contract = contractEntry?.contract;
    const closure = indexes.closureByPathway.get(key);
    const launch = indexes.launchByPathway.get(key);
    const factory = indexes.factoryByPathway.get(key);
    const gradeAProjection = indexes.gradeAProjectionByPathway.get(key);
    const closureContradiction = indexes.contradictionByPathway.get(key);
    const routeKindAdjudication = inputs.routeKindAdjudications.rows.find((row) => row.routeKey === contract?.routeKey);
    const presentationConflict = inputs.presentationConflicts.rows.find((row) => row.routeKey === contract?.routeKey);
    const mappedTracks = (pathway.mappedRegistryTrackIds ?? []).map((trackId) => indexes.trackById.get(`${pathway.jurisdiction}:${trackId}`)).filter(Boolean);
    const packetSpecs = uniq([
      ...matchingPacketSpecs(indexes, { jurisdiction: pathway.jurisdiction, pathwayId: pathway.compiledPathwayId, contractRouteKey: contract?.routeKey }).map((spec) => `${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}`),
      ...mappedTracks.flatMap((track) => matchingPacketSpecs(indexes, { jurisdiction: track.jurisdiction, trackId: track.trackId }).map((spec) => `${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}`)),
    ]).map((identity) => indexes.packetSpecificationRecords.find((spec) => `${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}` === identity));
    const currentPacketSpecs = packetSpecs.filter((spec) => !spec.specificationHistorical);
    const relationships = mappedTracks.flatMap((track) => indexes.relationshipsByTrack.get(`${track.jurisdiction}:${track.trackId}`) ?? []);
    const gradeARecords = indexes.gradeAByPathway.get(key) ?? [];
    const artifacts = exactArtifactIds(relationships, inputs.artifacts, gradeARecords);
    let classification = classifyPathway({ ...pathway, ...profilePathway }, contractEntry, closure);
    if (closureContradiction && closureContradiction.proposal?.authority == null && closureContradiction.proposal?.decidedOn == null) {
      classification = classificationResult({
        category: "NEEDS_LEGAL_REVIEW",
        confidence: "high",
        participantCanInitiate: null,
        question: `Must ${closureContradiction.pathwayKey} be split into its automatic and Board-review mechanisms before service classification, and what participant action, if any, initiates the Board-review branch?`,
      });
    }
    const contractedStrategy = contractStrategy(contract) ?? outputStrategyFromPacketMode(pathway.packetMode);
    const exactTrackStrategies = uniq(mappedTracks
      .map((track) => track.outputStrategy)
      .filter((value) => ["official_pdf_fill", "custom_pleading", "participant_agency_application"].includes(value)));
    /* A route-contract guidance_status describes the result/presentation. It
     * cannot erase an exact participant filing carried by the one joined legal
     * track. Preserve the track's packet treatment for Category A routes while
     * retaining guidance_status as contract evidence. */
    const strategy = contractedStrategy === "process_guidance"
      && classification.possibleCategory === "A_MUST_FULFILL"
      && classification.participantCanInitiate === true
      && exactTrackStrategies.length === 1
      ? exactTrackStrategies[0]
      : contractedStrategy;
    const packetSets = uniq([
      ...asArray(launch?.packetSets).map((item) => typeof item === "string" ? item : item.packetSetId),
      ...mappedTracks.map((track) => indexes.packetSetByTrack.get(`${track.jurisdiction}:${track.trackId}`)?.packetSetId),
      ...currentPacketSpecs.map((spec) => spec.packetSetId),
    ]);
    const packetFamilies = uniq([
      ...asArray(launch?.packetFamilies).map((item) => typeof item === "string" ? item : item.packetFamilyId),
      ...asArray(factory?.packetFamilies).map((item) => typeof item === "string" ? item : item.packetFamilyId),
      ...currentPacketSpecs.map((spec) => spec.packetFamily),
    ]);
    const censusPendingFamilyId = classification.possibleCategory === "A_MUST_FULFILL"
      && strategy === "official_pdf_fill"
      && !packetFamilies[0]
      && !packetSets[0]
      && contract?.packetFamily
      && /official/i.test(normalize(pathway.packetMode))
      ? `census-pending-family:${pathway.jurisdiction}:${pathway.compiledPathwayId}`
      : null;
    const entity = {
      routeKey: routeKey("pathway", pathway.jurisdiction, pathway.compiledPathwayId),
      entityType: "runtime_pathway",
      sourceIdentity: routeKey("pathway", pathway.jurisdiction, pathway.compiledPathwayId),
      jurisdiction: pathway.jurisdiction,
      publicLabel: pathway.label,
      statuteOrAuthority: contract?.statute ?? profilePathway?.lawrenceRatification?.legal_basis ?? "not recorded",
      parentRouteKey: null,
      hiddenParticipantBranch: false,
      mappedTrackIds: uniq(pathway.mappedRegistryTrackIds ?? []),
      registryRelation: pathway.registryRelation,
    };
    entities.push(entity);
    const sources = uniq([
      ...sourceIdsForRelationships(relationships),
      profilePathway?.profileFile ? `compiled-profile:${profilePathway.profileFile}` : null,
      profilePathway?.sourceRef ? `compiled-source-ref:${profilePathway.sourceRef}` : null,
      contractEntry ? `route-contract:${contractEntry.sourceFile}#${contract.routeKey}` : null,
      ...packetSpecs.map((spec) => `packet-specification:${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}`),
      ...packetSpecs.flatMap((spec) => asArray(spec.sourceIdentities).map((source) => `packet-spec-source:${source.sourceId ?? textOf(source)}`)),
    ]);
    const missing = uniq([
      ...missingWorkFor({ classification, strategy, pathway: { ...pathway, ...profilePathway }, contract, relationships, artifacts, packetSet: packetSets[0], indexes, gradeARecords }),
      ...(classification.possibleCategory === "A_MUST_FULFILL" ? asArray(gradeAProjection?.missingProof).map((item) => `Close Grade-A proof gap: ${item}`) : []),
      classification.possibleCategory === "A_MUST_FULFILL" && routeKindAdjudication?.status === "pending"
        ? "Complete product wiring for the pending contract-versus-evaluator route-kind adjudication and verify that the participant-facing result presents the exact contract packet without creating commercial authority."
        : null,
      classification.possibleCategory === "A_MUST_FULFILL" && presentationConflict?.status === "held"
        ? "Correct product wiring for the held route-presentation conflict so participant-facing compiled text and the exact contract mechanism agree, then verify the dedicated commercial hold remains closed until separately released."
        : null,
    ]);
    const decisionIds = legalDecisionIds(inputs, [pathway.compiledPathwayId, contract?.routeKey], contract?.decisionId);
    const professionalPathwayHandoff = classification.possibleCategory === "B_LEGITIMATE_EXCLUSION"
      && classification.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP";
    const exactRuntimeActor = routeScopedRuntimeActor(mappedTracks, contract);
    const exactRuntimeDestination = routeScopedRuntimeDestination(mappedTracks, contract, exactRuntimeActor);
    const candidate = candidateBase(entity, {
      trackId: pathway.mappedRegistryTrackIds?.length === 1 ? pathway.mappedRegistryTrackIds[0] : null,
      runtimePathwayId: pathway.compiledPathwayId,
      routeContractId: contract?.routeKey ?? null,
      processActor: closureContradiction
        ? "not recorded — combined automatic BCA and Cannabis Expungement Board mechanisms"
        : professionalPathwayHandoff
          ? "attorney or professional"
          : exactRuntimeActor,
      participantFacingInstrument: closureContradiction
        ? "not recorded — current route combines automatic and Board-review treatments"
        : professionalPathwayHandoff
          ? "no participant filing — attorney or qualified legal-assistance handoff"
          : strategy === "process_guidance"
            ? `no filing — process guidance: ${contract?.mechanism ?? pathway.label}`
            : contract?.packetFamily ?? packetFamilies[0] ?? componentInstrument(asArray(mappedTracks[0]?.packetSet?.components)),
      destination: closureContradiction
        ? "not recorded — exact automatic and Board-review destinations require separate identities"
        : professionalPathwayHandoff
          ? "attorney or qualified legal-assistance referral"
          : exactRuntimeDestination,
      currentOutputStrategy: strategy,
      packetFamilyId: strategy === "process_guidance" ? null : packetFamilies[0] ?? censusPendingFamilyId,
      packetSetId: strategy === "process_guidance" ? null : packetSets[0] ?? null,
      requiredSourceIds: sources,
      existingArtifactIds: artifacts,
      currentServiceDisposition: closure?.category ?? "not_recorded_in_sellable_closure",
      currentCommercialState: presentationConflict?.status === "held"
        ? `ROUTE_PRESENTATION_CONFLICT_HELD:${commercialStateFor(key, indexes)}`
        : commercialStateFor(key, indexes),
      legalDecisionRecordIds: decisionIds,
      currentImplementationEvidence: uniq([
        `compiled-runtime:${pathway.compiledProfilePath}#${pathway.compiledPathwayId}`,
        `crosswalk:${pathway.registryRelation}`,
        closure ? `runtime-service-disposition:${closure.category}` : null,
        ...gradeARecords.map((record) => `grade-a-commercial-disposition:${record.recordId}:${record.serviceDisposition}`),
        gradeAProjection ? `grade-a-projection:${gradeAProjection.state}:${gradeAProjection.commercialStatus}` : null,
        launch ? `launch-graph:operationallySellable=${launch.operationallySellable}` : null,
        contract ? `route-contract:${contract.routeKey}:${contract.decisionId}:${contract.outcomeMode}` : null,
        contract?.packetFamily ? `route-contract-packet-family-label:${contract.packetFamily}` : null,
        censusPendingFamilyId
          ? `census-pending-family-identity:${censusPendingFamilyId}:packet-mode=${pathway.packetMode}:contract-label=${contract.packetFamily}:no-shared-authority`
          : null,
        routeKindAdjudication ? `route-kind-adjudication:${routeKindAdjudication.status}:${routeKindAdjudication.routeKey}:${routeKindAdjudication.decisionId}` : null,
        routeKindAdjudication ? `route-kind-contract-evidence:${routeKindAdjudication.routeKey}:${routeKindAdjudication.contractSays}` : null,
        routeKindAdjudication ? `route-kind-evaluator-evidence:${routeKindAdjudication.routeKey}:${routeKindAdjudication.heuristicSaid}:prior=${routeKindAdjudication.priorResultCode}:conclusive=${routeKindAdjudication.priorResultCodeIsConclusive ?? "not-recorded"}` : null,
        presentationConflict ? `route-presentation-conflict:${presentationConflict.status}:${presentationConflict.routeKey}:${presentationConflict.classification}` : null,
        ...packetSpecs.map((spec) => `packet-specification:${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}:historical=${spec.specificationHistorical}`),
        closureContradiction ? `unadopted-closure-contradiction:${closureContradiction.pathwayKey}:proposal-authority=${closureContradiction.proposal?.authority ?? "null"}:decidedOn=${closureContradiction.proposal?.decidedOn ?? "null"}` : null,
      ]),
      missingImplementationWork: uniq([
        ...missing,
        censusPendingFamilyId
          ? `Replace ${censusPendingFamilyId} with an approved shared packet-family or packet-set identity after exact source acquisition, form mapping, and product wiring; the census-local identity grants no runtime, approval, or commercial authority.`
          : null,
      ]),
      classification,
    });
    candidates.push(candidate);
    const baseWorklistFacts = mappedTracks[0]
      ? worklistFactsForTrack(mappedTracks[0], indexes.packetSetByTrack.get(`${mappedTracks[0].jurisdiction}:${mappedTracks[0].trackId}`), relationships, strategy)
      : Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, evidenceField([])]));
    const contractWorklistFacts = contract ? worklistFactsForContract(contract) : Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, evidenceField([])]));
    const worklistFacts = overlayWorklistFacts(baseWorklistFacts, contractWorklistFacts, worklistFactsForPacketSpecs(packetSpecs));
    details.set(entity.routeKey, { pathway: { ...pathway, ...profilePathway }, contract, packetSets, packetSpecs, relationships, classification, worklistFacts });
  }

  for (const contractEntry of contracts.effective) {
    const { contract } = contractEntry;
    const parentKey = `${contract.jurisdiction}:${contract.pathwayId}`;
    const parentPathway = indexes.crosswalkPathway.get(parentKey);
    const mappedTracks = (parentPathway?.mappedRegistryTrackIds ?? []).map((trackId) => indexes.trackById.get(`${contract.jurisdiction}:${trackId}`)).filter(Boolean);
    const relationships = mappedTracks.flatMap((track) => indexes.relationshipsByTrack.get(`${track.jurisdiction}:${track.trackId}`) ?? []);
    const gradeARecords = indexes.gradeAByPathway.get(parentKey) ?? [];
    const artifacts = exactArtifactIds(relationships, inputs.artifacts, gradeARecords);
    for (const branch of contract.serviceBranches ?? []) {
      const mappedStrategies = uniq(mappedTracks.map((track) => track.outputStrategy).filter((strategy) => ["official_pdf_fill", "custom_pleading"].includes(strategy)));
      let strategy = contractStrategy(branch)
        ?? (mappedStrategies.length === 1 ? mappedStrategies[0] : outputStrategyFromPacketMode(parentPathway?.packetMode));
      let exactTreatmentTracks = mappedTracks.filter((track) => track.outputStrategy === strategy && ["official_pdf_fill", "custom_pleading"].includes(strategy));
      if (contract.routeKey === "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05" && branch.id === "pre_effective_date_petition") {
        const petitionTrack = indexes.trackById.get("ND:nd-nonconviction-close-petition");
        const parentReferencesTrack = mappedTracks.some((track) => textOf(track.selfHelpBoundaries, track.postGenerationHandoffs).includes("nd-nonconviction-close-petition"));
        if (petitionTrack && parentReferencesTrack) {
          strategy = petitionTrack.outputStrategy;
          exactTreatmentTracks = [petitionTrack];
        }
      }
      const branchRelationships = [...relationships, ...exactTreatmentTracks.flatMap((track) => indexes.relationshipsByTrack.get(`${track.jurisdiction}:${track.trackId}`) ?? [])]
        .filter((row, index, rows) => rows.findIndex((candidate) => `${candidate.trackId}:${candidate.componentId}` === `${row.trackId}:${row.componentId}`) === index);
      const branchArtifacts = exactArtifactIds(branchRelationships, inputs.artifacts, gradeARecords);
      const branchPacketSpecs = uniq([
        ...matchingPacketSpecs(indexes, { jurisdiction: contract.jurisdiction, pathwayId: contract.pathwayId, contractRouteKey: contract.routeKey })
          .map((spec) => `${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}`),
        ...exactTreatmentTracks.flatMap((track) => matchingPacketSpecs(indexes, { jurisdiction: track.jurisdiction, trackId: track.trackId })
          .map((spec) => `${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}`)),
      ]).map((identity) => indexes.packetSpecificationRecords.find((spec) => `${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}` === identity));
      const currentBranchPacketSpecs = branchPacketSpecs.filter((spec) => !spec.specificationHistorical);
      const stablePacketFamilyIds = uniq([
        ...currentBranchPacketSpecs.map((spec) => spec.packetFamily),
        ...exactTreatmentTracks.map((track) => indexes.counselByTrack.get(`${track.jurisdiction}:${track.trackId}`)?.familyId),
      ]);
      const stablePacketSetIds = uniq([
        ...currentBranchPacketSpecs.map((spec) => spec.packetSetId),
        ...exactTreatmentTracks.map((track) => indexes.packetSetByTrack.get(`${track.jurisdiction}:${track.trackId}`)?.packetSetId),
      ]);
      const exactBranchDecisionTrackIds = exactTreatmentTracks.length
        ? exactTreatmentTracks.map((track) => track.trackId)
        : mappedTracks.length === 1 ? [mappedTracks[0].trackId] : [];
      let classification = classifyServiceBranch(contract, branch, strategy);
      const entity = {
        routeKey: routeKey("service-branch", contract.routeKey, branch.id),
        entityType: "service_branch",
        sourceIdentity: routeKey("service-branch", contract.routeKey, branch.id),
        jurisdiction: contract.jurisdiction,
        publicLabel: `${contract.mechanism} — ${branch.when}`,
        statuteOrAuthority: contract.statute,
        parentRouteKey: routeKey("pathway", contract.jurisdiction, contract.pathwayId),
        parentContractRouteKey: contract.routeKey,
        hiddenParticipantBranch: classification.participantCanInitiate === true && ["automatic_relief", "guidance_status"].includes(contract.outcomeMode),
      };
      entities.push(entity);
      const sources = uniq([
        ...sourceIdsForRelationships(branchRelationships),
        `route-contract:${contractEntry.sourceFile}#${contract.routeKey}`,
        ...asArray(branch.branchDeliveryGateIds).map((id) => `delivery-gate:${contract.routeKey}:${id}`),
        ...branchPacketSpecs.map((spec) => `packet-specification:${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}`),
      ]);
      const missing = missingWorkFor({ classification, strategy, pathway: parentPathway, contract, branch, relationships: branchRelationships, artifacts: branchArtifacts, packetSet: stablePacketSetIds[0] ?? null, indexes, gradeARecords });
      let branchProcessActor = classification.participantCanInitiate === true ? "participant" : actorFor(null, textOf(branch), "not recorded");
      let branchInstrument = branch.packetFamily
        ?? (classification.participantCanInitiate === true
          ? componentInstrument(asArray(exactTreatmentTracks[0]?.packetSet?.components), `${branch.when} (${strategy ?? "output treatment not recorded"})`)
          : `no participant filing — ${branch.when}`);
      let branchDestination = branch.destination
        ?? exactTreatmentTracks[0]?.destination
        ?? mappedTracks[0]?.destination
        ?? contract.destination
        ?? "not recorded";
      if (classification.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP") {
        branchProcessActor = "attorney or professional";
        branchInstrument = "no participant filing — attorney or qualified legal-assistance referral";
        branchDestination = "attorney or qualified legal-assistance referral for exact local-law or instrument review";
      } else if (classification.possibleCategoryBReason === "AGENCY_CONTROLLED") {
        branchProcessActor = "agency";
        branchInstrument = "no participant filing — agency implementation and verification of already-granted relief";
        branchDestination = "record-holding agencies responsible for implementing and verifying the existing order";
      } else if (classification.possibleCategoryBReason === "AUTOMATIC") {
        branchProcessActor = contract.jurisdiction === "ND" ? "court" : "court or agency";
        branchInstrument = "no participant filing — automatic or already-granted relief implementation guidance";
        branchDestination = contract.jurisdiction === "ND"
          ? mappedTracks[0]?.destination ?? "court that entered the qualifying nonconviction disposition"
          : "court and record-holding agencies responsible for implementing and verifying the existing order";
      }
      const candidate = candidateBase(entity, {
        trackId: exactTreatmentTracks.length === 1 ? exactTreatmentTracks[0].trackId : parentPathway?.mappedRegistryTrackIds?.length === 1 ? parentPathway.mappedRegistryTrackIds[0] : null,
        runtimePathwayId: contract.pathwayId,
        routeContractId: contract.routeKey,
        processActor: branchProcessActor,
        participantFacingInstrument: branchInstrument,
        destination: branchDestination,
        currentOutputStrategy: strategy,
        packetFamilyId: stablePacketFamilyIds.length === 1 ? stablePacketFamilyIds[0] : null,
        packetSetId: stablePacketSetIds.length === 1 ? stablePacketSetIds[0] : null,
        requiredSourceIds: sources,
        existingArtifactIds: branchArtifacts,
        currentServiceDisposition: `contract_service_branch:${branch.outcomeMode}`,
        currentCommercialState: `BRANCH_POSTURE:${branch.commercialPosture?.checkoutEnabled === true ? "DECLARED_CHECKOUT_TRUE_BUT_NOT_AUTHORITY" : "CLOSED_OR_NOT_RECORDED"}`,
        legalDecisionRecordIds: legalDecisionIds(inputs, [
          contract.routeKey,
          contract.pathwayId,
          branch.id,
          ...exactBranchDecisionTrackIds,
        ], contract.decisionId),
        currentImplementationEvidence: uniq([
          `effective-route-contract:${contract.routeKey}:${contract.decisionId}`,
          `service-branch:${branch.id}:${branch.outcomeMode}`,
          branch.packetFamily ? `route-contract-packet-family-label:${branch.packetFamily}` : null,
          ...branchPacketSpecs.map((spec) => `packet-specification:${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}:historical=${spec.specificationHistorical}`),
          ...gradeARecords.map((record) => `grade-a-commercial-disposition:${record.recordId}:${record.serviceDisposition}`),
        ]),
        missingImplementationWork: missing,
        classification,
      });
      candidates.push(candidate);
      const branchTrackFacts = exactTreatmentTracks.length === 1
        ? worklistFactsForTrack(exactTreatmentTracks[0], indexes.packetSetByTrack.get(`${exactTreatmentTracks[0].jurisdiction}:${exactTreatmentTracks[0].trackId}`), branchRelationships, strategy)
        : Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, evidenceField([])]));
      details.set(entity.routeKey, {
        pathway: parentPathway,
        contract,
        branch,
        packetSpecs: branchPacketSpecs,
        relationships: branchRelationships,
        classification,
        worklistFacts: mergeWorklistFacts([branchTrackFacts, worklistFactsForContract(contract, branch), worklistFactsForPacketSpecs(branchPacketSpecs)]),
      });
    }
    for (const disposition of contract.failureDisposition ?? []) {
      const classification = classifyFailureDisposition(contract, disposition);
      const professionalFailure = classification.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP";
      const prosecutorFailure = classification.possibleCategoryBReason === "PROSECUTOR_CONTROLLED";
      const entity = {
        routeKey: routeKey("failure-disposition", contract.routeKey, disposition.id),
        entityType: "failure_disposition",
        sourceIdentity: routeKey("failure-disposition", contract.routeKey, disposition.id),
        jurisdiction: contract.jurisdiction,
        publicLabel: `${contract.mechanism} — ${disposition.when}`,
        statuteOrAuthority: contract.statute,
        parentRouteKey: routeKey("pathway", contract.jurisdiction, contract.pathwayId),
        parentContractRouteKey: contract.routeKey,
        hiddenParticipantBranch: false,
      };
      entities.push(entity);
      const candidate = candidateBase(entity, {
        trackId: parentPathway?.mappedRegistryTrackIds?.length === 1 ? parentPathway.mappedRegistryTrackIds[0] : null,
        runtimePathwayId: contract.pathwayId,
        routeContractId: contract.routeKey,
        processActor: professionalFailure ? "attorney or professional" : prosecutorFailure ? "prosecutor or attorney" : actorFor(null, textOf(disposition)),
        participantFacingInstrument: professionalFailure
          ? "no participant filing — attorney or qualified legal-assistance handoff"
          : prosecutorFailure
            ? "no participant filing — prosecutor-controlled prerequisite or attorney handoff"
            : `not recorded — ${disposition.disposition} treatment requires legal review`,
        destination: professionalFailure
          ? "attorney or qualified legal-assistance referral"
          : prosecutorFailure
            ? "prosecutor-controlled prerequisite or attorney referral"
            : `not recorded — exact ${disposition.disposition} destination requires legal review`,
        currentOutputStrategy: "process_guidance",
        packetFamilyId: null,
        packetSetId: null,
        requiredSourceIds: [`route-contract:${contractEntry.sourceFile}#${contract.routeKey}`],
        existingArtifactIds: [],
        currentServiceDisposition: `contract_failure_disposition:${disposition.disposition}`,
        currentCommercialState: "FAILURE_DISPOSITION_NOT_COMMERCIAL_AUTHORITY",
        legalDecisionRecordIds: legalDecisionIds(inputs, [
          contract.routeKey,
          contract.pathwayId,
          disposition.id,
          ...(mappedTracks.length === 1 ? [mappedTracks[0].trackId] : []),
        ], contract.decisionId),
        currentImplementationEvidence: [`effective-route-contract:${contract.routeKey}:${contract.decisionId}`, `failure-disposition:${disposition.id}:${disposition.disposition}`],
        missingImplementationWork: [],
        classification,
      });
      candidates.push(candidate);
      details.set(entity.routeKey, { pathway: parentPathway, contract, disposition, relationships, classification, worklistFacts: worklistFactsForContract(contract) });
    }
  }

  const unattachedDecisionIds = new Set(inputs.unattachedDecisions.rows.map((row) => `${row.jurisdiction}:${row.trackId}`));
  for (const decisionRoute of inputs.researchTrackDecisions) {
    const plan = currentDecisionRoutePlan(decisionRoute);
    const primaryBranch = plan.branches[0];
    const classification = decisionBranchClassification(primaryBranch);
    const isUnattached = unattachedDecisionIds.has(`${decisionRoute.jurisdiction}:${decisionRoute.trackId}`);
    const representationMerge = RESEARCH_DECISION_EXACT_REPRESENTATION_MERGES.get(`${decisionRoute.jurisdiction}:${decisionRoute.trackId}`);
    const sourceKind = isUnattached ? "unattached-decision-route" : "research-decision-route";
    const entity = {
      routeKey: routeKey(sourceKind, decisionRoute.jurisdiction, decisionRoute.trackId),
      entityType: isUnattached ? "unattached_decision_route" : "research_decision_route",
      sourceIdentity: routeKey(sourceKind, decisionRoute.jurisdiction, decisionRoute.trackId),
      jurisdiction: decisionRoute.jurisdiction,
      publicLabel: primaryBranch.label,
      statuteOrAuthority: plan.statuteOrAuthority,
      parentRouteKey: null,
      hiddenParticipantBranch: Boolean(primaryBranch.hidden),
      approvedRegistryTrack: representationMerge?.trackId != null,
      compiledRuntimePathway: representationMerge?.runtimePathwayId != null,
    };
    entities.push(entity);
    const candidate = candidateBase(entity, {
      trackId: representationMerge?.trackId ?? null,
      runtimePathwayId: representationMerge?.runtimePathwayId ?? null,
      routeContractId: null,
      processActor: primaryBranch.actor,
      participantFacingInstrument: primaryBranch.instrument,
      destination: primaryBranch.destination,
      currentOutputStrategy: primaryBranch.strategy,
      packetFamilyId: null,
      packetSetId: null,
      requiredSourceIds: primaryBranch.requiredSourceIds ?? [],
      existingArtifactIds: [],
      currentServiceDisposition: representationMerge
        ? "current_decision_exact_existing_representation"
        : `current_decision_route:${primaryBranch.category.toLowerCase()}`,
      currentCommercialState: "NO_APPROVED_TRACK_RUNTIME_OR_GRADE_A_FULFILLMENT_RECORD",
      legalDecisionRecordIds: [`research-track-decision:${decisionRoute.trackId}`],
      currentImplementationEvidence: [
        isUnattached ? `unattached-decision:data/rcap-ledger/batch-b-unattached-decisions.json#${decisionRoute.trackId}` : null,
        `national-legal-decision:data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json#${decisionRoute.trackId}`,
        `current-decision-product-disposition-sha256:${decisionRoute.productDisposition?.sha256 ?? "not-recorded"}`,
        `exact-output-treatment:${primaryBranch.strategy ?? "not-recorded"}:${primaryBranch.instrument}`,
        representationMerge
          ? `exact-existing-representation:${representationMerge.canonicalObligationKey}`
          : "approved-registry-track=false",
        representationMerge ? null : "compiled-runtime-pathway=false",
      ],
      missingImplementationWork: missingWorkForDecisionBranch(primaryBranch),
      classification,
    });
    candidates.push(candidate);
    details.set(entity.routeKey, { decisionRoute, plan, relationships: [], classification, worklistFacts: worklistFactsForDecisionBranch(primaryBranch) });
  }

  entities.sort((a, b) => a.routeKey.localeCompare(b.routeKey));
  candidates.sort((a, b) => a.routeKey.localeCompare(b.routeKey));

  // The typed rows above prove source-universe accounting. Classification is
  // performed over canonical terminal obligations so a track and its mapped
  // runtime representation are not counted twice, and a composed parent is
  // not counted again beside its explicit units.
  const sourceCandidateByKey = new Map(candidates.map((row) => [row.routeKey, row]));
  const sourceEntityByKey = new Map(entities.map((row) => [row.routeKey, row]));
  const canonicalObligations = [];
  const obligationCandidates = [];
  const obligationDetails = new Map();
  const mergedServiceFailureSelectorSignals = [];
  const mergedTrackServiceBranchSignals = [];
  const mergedDecisionFailureSignals = [];
  const mergedResearchRepresentationSignals = [];

  const classificationFromCandidate = (row) => ({
    possibleCategory: row.possibleCategory,
    possibleCategoryBReason: row.possibleCategoryBReason,
    classificationConfidence: row.classificationConfidence,
    participantCanInitiate: row.participantCanInitiate,
    requiresLegalReview: row.requiresLegalReview,
    legalReviewQuestion: row.legalReviewQuestion,
  });

  const strategyCompatibleMissingWork = (strategy, items) => uniq(items).filter((item) => {
    if (strategy === "official_pdf_fill" && /composed pleading/i.test(item)) return false;
    if (strategy === "participant_agency_application" && /composed pleading/i.test(item)) return false;
    return true;
  });

  const addObligation = ({ obligationKey, obligationKind, sourceKeys, sourceCandidate, detail, hiddenParticipantBranch = null, overrides = {} }) => {
    const sourceEntityKeys = uniq(sourceKeys);
    const candidate = {
      ...sourceCandidate,
      ...overrides,
      routeKey: obligationKey,
    };
    candidate.missingImplementationWork = strategyCompatibleMissingWork(
      candidate.currentOutputStrategy,
      candidate.missingImplementationWork ?? [],
    );
    const entity = {
      routeKey: obligationKey,
      entityType: "canonical_obligation",
      obligationKind,
      sourceIdentity: obligationKey,
      jurisdiction: candidate.jurisdiction,
      publicLabel: candidate.publicLabel,
      statuteOrAuthority: candidate.statuteOrAuthority,
      sourceEntityKeys,
      hiddenParticipantBranch: hiddenParticipantBranch
        ?? sourceEntityKeys.some((key) => sourceEntityByKey.get(key)?.hiddenParticipantBranch === true),
    };
    canonicalObligations.push(entity);
    obligationCandidates.push(candidate);
    obligationDetails.set(obligationKey, detail);
  };

  const removeObligation = (obligationKey) => {
    const obligationIndex = canonicalObligations.findIndex((row) => row.routeKey === obligationKey);
    const candidateIndex = obligationCandidates.findIndex((row) => row.routeKey === obligationKey);
    const removed = obligationIndex >= 0 ? canonicalObligations.splice(obligationIndex, 1)[0] : null;
    if (candidateIndex >= 0) obligationCandidates.splice(candidateIndex, 1);
    obligationDetails.delete(obligationKey);
    return removed;
  };

  const trackRuntimeClassification = (trackCandidate, runtimeCandidate) => {
    if (runtimeCandidate.routeContractId) return classificationFromCandidate(runtimeCandidate);
    if (trackCandidate.possibleCategory === "NEEDS_LEGAL_REVIEW") return classificationFromCandidate(trackCandidate);
    if (trackCandidate.possibleCategory === runtimeCandidate.possibleCategory) return classificationFromCandidate(trackCandidate);
    if (trackCandidate.possibleCategory === "A_MUST_FULFILL" && runtimeCandidate.possibleCategory === "NEEDS_LEGAL_REVIEW") return classificationFromCandidate(trackCandidate);
    if (trackCandidate.possibleCategory === "B_LEGITIMATE_EXCLUSION" && runtimeCandidate.possibleCategory === "NEEDS_LEGAL_REVIEW") return classificationFromCandidate(trackCandidate);
    return classificationResult({
      category: "NEEDS_LEGAL_REVIEW",
      confidence: "high",
      participantCanInitiate: trackCandidate.participantCanInitiate === true || runtimeCandidate.participantCanInitiate === true ? true : null,
      question: `Which current authority controls the filing-status conflict between legal track ${trackCandidate.trackId} and runtime pathway ${runtimeCandidate.runtimePathwayId}?`,
    });
  };

  const runtimeStructuralSourceIds = (runtimeCandidate) => runtimeCandidate.requiredSourceIds.filter((sourceId) =>
    sourceId.startsWith("compiled-profile:")
      || sourceId.startsWith("compiled-source-ref:")
      || sourceId.startsWith("route-contract:"));
  const runtimeStructuralEvidence = (runtimeCandidate) => runtimeCandidate.currentImplementationEvidence.filter((item) =>
    item.startsWith("compiled-runtime:")
      || item.startsWith("crosswalk:")
      || item.startsWith("grade-a-commercial-disposition:")
      || item.startsWith("grade-a-fulfillment-record:")
      || item.startsWith("grade-a-projection:")
      || item.startsWith("launch-graph:")
      || item.startsWith("route-contract:")
      || item.startsWith("runtime-service-disposition:")
      || item.startsWith("runtime:")
      || item.startsWith("unadopted-closure-contradiction:"));
  const runtimeStructuralMissingWork = (runtimeCandidate) => runtimeCandidate.missingImplementationWork.filter((item) =>
    /wire the exact runtime pathway|product wiring|route-kind adjudication|route-presentation conflict|close grade-a proof gap/i.test(item));

  for (const track of inputs.tracks) {
    const trackSourceKey = routeKey("track", track.jurisdiction, track.trackId);
    const trackCandidate = sourceCandidateByKey.get(trackSourceKey);
    const trackDetail = details.get(trackSourceKey);
    const mappedPathwayIds = trustedTrackPathwayIds(inputs, track.jurisdiction, track.trackId);
    if (track.units?.length) {
      for (const unit of track.units) {
        const unitSourceKey = routeKey("unit", track.jurisdiction, track.trackId, unit.unitId);
        const unitCandidate = sourceCandidateByKey.get(unitSourceKey);
        const pathwaySourceKeys = mappedPathwayIds.map((pathwayId) => routeKey("pathway", track.jurisdiction, pathwayId));
        const parentRuntimeCandidates = pathwaySourceKeys.map((key) => sourceCandidateByKey.get(key)).filter(Boolean);
        const projectedParents = parentRuntimeCandidates.filter((row) => String(row.currentCommercialState).startsWith("GRADE_A_"));
        addObligation({
          obligationKey: routeKey("obligation", "unit", track.jurisdiction, track.trackId, unit.unitId),
          obligationKind: "explicit_track_unit",
          sourceKeys: [trackSourceKey, unitSourceKey, ...pathwaySourceKeys],
          sourceCandidate: unitCandidate,
          detail: details.get(unitSourceKey),
          overrides: {
            runtimePathwayId: null,
            currentServiceDisposition: mappedPathwayIds.length
              ? `unit_parent_represented_by_runtime:${mappedPathwayIds.join("+")}`
              : unitCandidate.currentServiceDisposition,
            currentCommercialState: projectedParents.length
              ? `UNIT_PARENT_${uniq(projectedParents.map((row) => row.currentCommercialState)).join("+")}`
              : unitCandidate.currentCommercialState,
            currentImplementationEvidence: uniq([
              ...unitCandidate.currentImplementationEvidence,
              ...mappedPathwayIds.map((pathwayId) => `runtime-to-unit-parent-expansion:${pathwayId}:parent_expansion_without_unit_assignment`),
              ...parentRuntimeCandidates.flatMap((row) => row.currentImplementationEvidence.filter((item) => item.startsWith("grade-a-projection:") || item.startsWith("runtime-service-disposition:"))),
            ]),
          },
        });
      }
      continue;
    }

    if (!mappedPathwayIds.length) {
      addObligation({
        obligationKey: routeKey("obligation", "track-only", track.jurisdiction, track.trackId),
        obligationKind: "unmapped_legal_track",
        sourceKeys: [trackSourceKey],
        sourceCandidate: trackCandidate,
        detail: trackDetail,
      });
      continue;
    }

    for (const pathwayId of mappedPathwayIds) {
      const pathwaySourceKey = routeKey("pathway", track.jurisdiction, pathwayId);
      const runtimeCandidate = sourceCandidateByKey.get(pathwaySourceKey);
      const crosswalkPathway = inputs.crosswalk.compiledPathways.find((row) => row.jurisdiction === track.jurisdiction && row.compiledPathwayId === pathwayId);
      const multiTrackRuntime = trustedPathwayTrackIds(crosswalkPathway, inputs.presentationConflicts).length > 1;
      const routeKindAdjudication = inputs.routeKindAdjudications.rows.find((row) => row.routeKey === runtimeCandidate.routeContractId);
      const presentationConflict = inputs.presentationConflicts.rows.find((row) => row.routeKey === runtimeCandidate.routeContractId);
      const westVirginiaPardonTrackTreatmentControls = track.jurisdiction === "WV"
        && track.trackId === "wv_pardon_expungement"
        && pathwayId === "pardon-based-expungement";
      const rhodeIslandDecriminalizedTrackTreatmentControls = track.jurisdiction === "RI"
        && track.trackId === "ri_decriminalized"
        && pathwayId === "path-g-decriminalized-offense-expungement";
      const louisianaConditionalFutureTrackTreatmentControls = track.jurisdiction === "LA"
        && track.trackId === "la-985-2-automated-expungement"
        && pathwayId === "automated-expungement-status-verification-art-985-2";
      const kentuckyJuvenileMixedStageReview = track.jurisdiction === "KY"
        && track.trackId === "ky_juvenile_record_expungement"
        && pathwayId === "juvenile-automatic-dismissal";
      const montanaCrissMixedStageReview = track.jurisdiction === "MT"
        && track.trackId === "mt_nonconviction_removal"
        && pathwayId === "non-conviction-criminal-history-removal-through-criss";
      const southCarolinaPtiApplicationReview = track.jurisdiction === "SC"
        && track.trackId === "sc_pti_17_22_150"
        && pathwayId === "diversion-or-program-completion-expungement";
      const newHampshireVacatedTemporalSplit = track.jurisdiction === "NH"
        && track.trackId === "nh_auto_vacated"
        && pathwayId === "annulment-of-a-vacated-conviction";
      const exactNoFilingVsParticipantContractConflict = new Set([
        "LA:la-985-3-immediate-expungement:immediate-expungement-after-successful-court-program-completion-art-985-3",
        "MD:md_10103_legacy_police:police-record-expungement-when-no-charge-was-filed-under-10-103",
        "NV:nv_seal_deferred:deferred-judgment-dismissal-and-sealing-under-nrs-176-211",
        "PA:pa_ard_expungement:path-d-ard-expungement",
        "RI:ri_filed_complaints:path-e-filed-complaint-relief-under-12-10-12",
      ]).has(`${track.jurisdiction}:${track.trackId}:${pathwayId}`);
      const exactTrackContractOutputTreatmentConflict = track.jurisdiction === "MN"
        && track.trackId === "mn_299c11_arrest_demand"
        && pathwayId === "arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11";
      const sourceExactTrackTreatmentControls = exactTrackEvidenceTreatment(track) != null;
      const exactTrackTreatmentControls = westVirginiaPardonTrackTreatmentControls
        || rhodeIslandDecriminalizedTrackTreatmentControls
        || louisianaConditionalFutureTrackTreatmentControls
        || newHampshireVacatedTemporalSplit
        || exactNoFilingVsParticipantContractConflict
        || exactTrackContractOutputTreatmentConflict
        || sourceExactTrackTreatmentControls;
      const mixedStageReview = kentuckyJuvenileMixedStageReview
        || montanaCrissMixedStageReview
        || southCarolinaPtiApplicationReview;
      const classification = exactTrackContractOutputTreatmentConflict
        ? classificationResult({
          category: "NEEDS_LEGAL_REVIEW",
          confidence: "high",
          participantCanInitiate: true,
          question: `Does approved custom-pleading track ${track.trackId} control, or does effective agency-application contract ${runtimeCandidate.routeContractId} represent a distinct treatment that requires its own exact family and branch identity?`,
        })
        : exactNoFilingVsParticipantContractConflict
        ? classificationResult({
          category: "NEEDS_LEGAL_REVIEW",
          confidence: "high",
          participantCanInitiate: true,
          question: `Does exact legal-design track ${track.trackId} control as a no-filing or unavailable-current-stage treatment, or does effective contract ${runtimeCandidate.routeContractId} establish a distinct participant-filed cohort that must be represented separately?`,
        })
        : kentuckyJuvenileMixedStageReview
        ? classificationResult({
          category: "NEEDS_LEGAL_REVIEW",
          confidence: "high",
          participantCanInitiate: true,
          question: "Does the mapped juvenile-automatic-dismissal runtime represent only the no-filing KRS 610.330(7) branch, leaving the AOC-JV-30 participant petition as a separate terminal obligation, or must the current track/runtime mapping be replaced by explicit branch identities?",
        })
        : montanaCrissMixedStageReview
          ? classificationResult({
            category: "NEEDS_LEGAL_REVIEW",
            confidence: "high",
            participantCanInitiate: true,
            question: "Must Montana's automatic post-July 1, 2017 CRISS removal and the participant-filed CRISS correction/removal request be represented as separate terminal branches, and which dispositions select each branch?",
          })
          : southCarolinaPtiApplicationReview
            ? classificationResult({
              category: "NEEDS_LEGAL_REVIEW",
              confidence: "high",
              participantCanInitiate: true,
              question: "Does South Carolina PTI expungement require a Category A participant agency-application treatment using the circuit solicitor's current form and intake, or is there exact authority for a prosecutor-controlled no-filing branch?",
            })
          : multiTrackRuntime
            ? classificationFromCandidate(trackCandidate)
          : exactTrackTreatmentControls
            ? classificationFromCandidate(trackCandidate)
            : trackRuntimeClassification(trackCandidate, runtimeCandidate);
      const isA = classification.possibleCategory === "A_MUST_FULFILL";
      const preserveTrackTreatment = multiTrackRuntime || exactTrackTreatmentControls || mixedStageReview;
      const overrides = {
        runtimePathwayId: pathwayId,
        routeContractId: runtimeCandidate.routeContractId,
        ...(runtimeCandidate.routeContractId && !preserveTrackTreatment ? {
          processActor: runtimeCandidate.processActor,
          participantFacingInstrument: runtimeCandidate.participantFacingInstrument,
          destination: runtimeCandidate.destination,
          currentOutputStrategy: runtimeCandidate.currentOutputStrategy,
          packetFamilyId: runtimeCandidate.packetFamilyId,
          packetSetId: runtimeCandidate.packetSetId,
        } : {}),
        ...(southCarolinaPtiApplicationReview ? {
          processActor: "participant",
          participantFacingInstrument: "participant-signed PTI expungement application submitted through the circuit Solicitor's Office",
          destination: "Solicitor's Office in the judicial circuit where the offense was committed",
          currentOutputStrategy: null,
          packetFamilyId: null,
          packetSetId: null,
        } : {}),
        ...(exactTrackContractOutputTreatmentConflict ? {
          processActor: "participant",
          participantFacingInstrument: "not recorded — approved custom demand pleading and effective agency-application contract conflict",
          destination: "not recorded — exact demand recipient and agency-application destination require treatment reconciliation",
          currentOutputStrategy: null,
          packetFamilyId: null,
          packetSetId: null,
        } : {}),
        currentServiceDisposition: runtimeCandidate.currentServiceDisposition,
        currentCommercialState: presentationConflict?.status === "held"
          ? `ROUTE_PRESENTATION_CONFLICT_HELD:${runtimeCandidate.currentCommercialState}`
          : runtimeCandidate.currentCommercialState,
        requiredSourceIds: uniq([
          ...trackCandidate.requiredSourceIds,
          ...(multiTrackRuntime ? runtimeStructuralSourceIds(runtimeCandidate) : runtimeCandidate.requiredSourceIds),
        ]),
        existingArtifactIds: uniq([
          ...trackCandidate.existingArtifactIds,
          ...(multiTrackRuntime
            ? runtimeCandidate.existingArtifactIds.filter((artifactId) => !artifactId.startsWith("source-artifact:"))
            : runtimeCandidate.existingArtifactIds),
        ]),
        legalDecisionRecordIds: uniq([...trackCandidate.legalDecisionRecordIds, ...runtimeCandidate.legalDecisionRecordIds]),
        currentImplementationEvidence: uniq([
          ...trackCandidate.currentImplementationEvidence,
          ...(multiTrackRuntime ? runtimeStructuralEvidence(runtimeCandidate) : runtimeCandidate.currentImplementationEvidence),
          multiTrackRuntime
            ? `multi-track-runtime-edge:per-track-treatment-preserved:${track.trackId}`
            : null,
          routeKindAdjudication
            ? `route-kind-adjudication:${routeKindAdjudication.status}:${routeKindAdjudication.routeKey}:${routeKindAdjudication.decisionId}`
            : null,
          routeKindAdjudication
            ? `route-kind-contract-evidence:${routeKindAdjudication.routeKey}:${routeKindAdjudication.contractSays}`
            : null,
          routeKindAdjudication
            ? `route-kind-evaluator-evidence:${routeKindAdjudication.routeKey}:${routeKindAdjudication.heuristicSaid}:prior=${routeKindAdjudication.priorResultCode}:conclusive=${routeKindAdjudication.priorResultCodeIsConclusive ?? "not-recorded"}`
            : null,
          presentationConflict
            ? `route-presentation-conflict:${presentationConflict.status}:${presentationConflict.routeKey}:${presentationConflict.classification}`
            : null,
          westVirginiaPardonTrackTreatmentControls
            ? "exact-track-filing-treatment-controls:runtime-guidance-status-narrows-effect-and-service-posture-only"
            : null,
          rhodeIslandDecriminalizedTrackTreatmentControls
            ? "exact-track-filing-treatment-controls:missing-specific-authority-does-not-create-category-b"
            : null,
          louisianaConditionalFutureTrackTreatmentControls
            ? "exact-track-future-treatment-controls:contract-operational-gate-does-not-change-the-express-unsatisfied-statutory-condition"
            : null,
          newHampshireVacatedTemporalSplit
            ? "exact-temporal-cohort-split:post-2019-vacatur-track-is-automatic;pre-2019-petition-is-separate-nh_petition_vacated-track"
            : null,
          exactNoFilingVsParticipantContractConflict
            ? `exact-mechanism-conflict:track=${track.trackId}:track-treatment=${track.outputStrategy}:contract=${runtimeCandidate.routeContractId}:contract-outcome=${details.get(pathwaySourceKey)?.contract?.outcomeMode ?? "not-recorded"}`
            : null,
          exactTrackContractOutputTreatmentConflict
            ? `exact-output-treatment-conflict:track=${track.trackId}:track-treatment=${track.outputStrategy}:contract=${runtimeCandidate.routeContractId}:contract-treatment=${runtimeCandidate.currentOutputStrategy}`
            : null,
          kentuckyJuvenileMixedStageReview
            ? "mixed-stage-conflict:participant-aoc-jv-30-petition-and-automatic-dismissal-require-exact-branch-identities"
            : null,
          montanaCrissMixedStageReview
            ? "mixed-stage-conflict:automatic-criss-removal-and-participant-correction-request-require-exact-branch-identities"
            : null,
          southCarolinaPtiApplicationReview
            ? "filing-scope-conflict:participant-signed-solicitor-application-exists-but-effective-contract-retires-the-pleading-and-records-guidance-status"
            : null,
        ]),
        missingImplementationWork: isA
          ? uniq([
            ...trackCandidate.missingImplementationWork,
            ...(preserveTrackTreatment
              ? runtimeStructuralMissingWork(runtimeCandidate)
              : runtimeCandidate.missingImplementationWork),
            rhodeIslandDecriminalizedTrackTreatmentControls
              ? "Acquire and confirm the exact offense-specific decriminalization authority and current official-form source; missing authority or source is Category A implementation work, not a Category B exclusion."
              : null,
            routeKindAdjudication?.status === "pending"
              ? "Complete product wiring for the pending contract-versus-evaluator route-kind adjudication and verify that the participant-facing result presents the exact contract packet without creating commercial authority."
              : null,
            presentationConflict?.status === "held"
              ? "Correct product wiring for the held route-presentation conflict so participant-facing compiled text and the exact contract mechanism agree, then verify the dedicated commercial hold remains closed until separately released."
              : null,
          ])
          : [],
        possibleCategory: classification.possibleCategory,
        possibleCategoryBReason: classification.possibleCategoryBReason,
        classificationConfidence: classification.classificationConfidence,
        participantCanInitiate: classification.participantCanInitiate,
        requiresLegalReview: classification.requiresLegalReview,
        legalReviewQuestion: classification.legalReviewQuestion,
      };
      addObligation({
        obligationKey: routeKey("obligation", "track-pathway", track.jurisdiction, track.trackId, pathwayId),
        obligationKind: "mapped_track_runtime_edge",
        sourceKeys: [trackSourceKey, pathwaySourceKey],
        sourceCandidate: trackCandidate,
        detail: runtimeCandidate.routeContractId && !preserveTrackTreatment
          ? details.get(pathwaySourceKey)
          : multiTrackRuntime && details.get(pathwaySourceKey)?.contract
            ? {
              ...trackDetail,
              contract: details.get(pathwaySourceKey).contract,
              worklistFacts: overlayWorklistFacts(
                trackDetail.worklistFacts,
                worklistFactsForContract(details.get(pathwaySourceKey).contract),
              ),
            }
            : trackDetail,
        overrides,
      });
    }
  }

  // The approved NC dismissal track expressly identifies § 15A-146(b1) DNA
  // expunction as a separate participant application with its own service and
  // hearing timing. Preserve it as a hidden terminal branch without inventing
  // another approved-track source identity or importing its facts into the
  // ordinary dismissal packet.
  {
    const trackId = "nc_146_dismissal_petition";
    const trackSourceKey = routeKey("track", "NC", trackId);
    const sourceCandidate = sourceCandidateByKey.get(trackSourceKey);
    const sourceDetail = details.get(trackSourceKey);
    if (!sourceCandidate || !sourceDetail) throw new Error("NC § 15A-146(b1) source track is missing");
    const classification = classificationResult({
      category: "A_MUST_FULFILL",
      confidence: "high",
      participantCanInitiate: true,
    });
    addObligation({
      obligationKey: routeKey("obligation", "track-branch", "NC", trackId, "dna-expunction-application-15a-146-b1"),
      obligationKind: "hidden_participant_filing_branch",
      sourceKeys: [trackSourceKey],
      sourceCandidate,
      hiddenParticipantBranch: true,
      detail: {
        ...sourceDetail,
        packetSet: null,
        packetSpecs: [],
        classification,
        worklistFacts: Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, evidenceField({
          primaryOfficialFormOrComposedPleading: ["composed DNA expunction application under G.S. 15A-146(b1) — exact approved form is not recorded"],
          serviceRecipients: ["Serve the district attorney with the separate G.S. 15A-146(b1) DNA expunction application."],
          serviceMethod: ["Serve the district attorney with the separate G.S. 15A-146(b1) DNA expunction application."],
          serviceTiming: ["Serve the district attorney not less than 20 days before the hearing."],
          uncontestedHearingTreatment: ["The court holds a hearing on the separate G.S. 15A-146(b1) DNA expunction application after timely district-attorney service."],
        }[field] ?? [])])),
      },
      overrides: {
        publicLabel: "North Carolina DNA expunction application under G.S. 15A-146(b1)",
        statuteOrAuthority: "N.C. Gen. Stat. § 15A-146(b1)",
        trackId,
        runtimePathwayId: null,
        routeContractId: null,
        processActor: "participant",
        participantFacingInstrument: "composed DNA expunction application under G.S. 15A-146(b1) — exact approved form is not recorded",
        destination: "not recorded — exact filing court for the separate G.S. 15A-146(b1) application requires source confirmation",
        currentOutputStrategy: "custom_pleading",
        packetFamilyId: null,
        packetSetId: null,
        requiredSourceIds: sourceCandidate.requiredSourceIds,
        existingArtifactIds: [],
        currentServiceDisposition: "hidden_participant_filing_branch:separate_dna_expunction_application",
        currentCommercialState: "NO_DISTINCT_REGISTRY_RUNTIME_OR_GRADE_A_FULFILLMENT_RECORD",
        legalDecisionRecordIds: sourceCandidate.legalDecisionRecordIds,
        currentImplementationEvidence: uniq([
          ...sourceCandidate.currentImplementationEvidence.filter((item) => item.startsWith("source-relationship:")),
          "exact-track-branch:nc_146_dismissal_petition:participantActionRequired.serve_party:G.S.15A-146(b1)",
          "separate-matter-evidence:DNA expunction application must be served on the district attorney not less than 20 days before the hearing",
        ]),
        missingImplementationWork: [
          "Acquire and verify exact official-source custody for the statute and current application or form governing the separate G.S. 15A-146(b1) branch.",
          "Implement the exact composed DNA expunction application and every required companion component; no stable official form is recorded.",
          "Create an exact packet-family and packet-set identity for the separate DNA expunction application.",
          "Wire the separate G.S. 15A-146(b1) branch into the approved registry, crosswalk, and compiled runtime without collapsing it into ordinary dismissal expunction.",
          "Generate the exact route output and complete artifact review.",
          "Obtain completed-output legal approval for this new branch family; this census creates no approval.",
        ],
        possibleCategory: classification.possibleCategory,
        possibleCategoryBReason: classification.possibleCategoryBReason,
        classificationConfidence: classification.classificationConfidence,
        participantCanInitiate: classification.participantCanInitiate,
        requiresLegalReview: classification.requiresLegalReview,
        legalReviewQuestion: classification.legalReviewQuestion,
      },
    });
  }

  for (const pathway of inputs.crosswalk.compiledPathways.filter((row) => !trustedPathwayTrackIds(row, inputs.presentationConflicts).length)) {
    const pathwaySourceKey = routeKey("pathway", pathway.jurisdiction, pathway.compiledPathwayId);
    const sourceCandidate = sourceCandidateByKey.get(pathwaySourceKey);
    const sourceDetail = details.get(pathwaySourceKey);
    const cohortBranches = RUNTIME_CONTRACT_COHORT_BRANCHES.get(sourceCandidate.routeContractId);
    if (cohortBranches) {
      const contractNotes = normalize(sourceDetail.contract?.notes);
      for (const branch of cohortBranches) {
        const classification = classificationResult({
          category: branch.category,
          reason: branch.reason ?? null,
          confidence: "high",
          participantCanInitiate: branch.participantCanInitiate,
          question: branch.question ?? null,
        });
        const isA = branch.category === "A_MUST_FULFILL";
        const emptyFacts = Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, evidenceField([])]));
        const branchWorklistFacts = isA
          ? {
            ...worklistFactsForContract(sourceDetail.contract),
            primaryOfficialFormOrComposedPleading: evidenceField([branch.instrument]),
            feeWaiverTreatment: evidenceField([]),
            serviceTiming: evidenceField([]),
            filingDeadline: evidenceField([]),
            waitingPeriodCalculation: evidenceField(branch.waitingPeriodEvidence ?? []),
            postFilingInstructions: evidenceField([]),
            uncontestedHearingTreatment: evidenceField([]),
            contestedHearingOrOppositionHandoff: evidenceField([]),
          }
          : emptyFacts;
        addObligation({
          obligationKey: routeKey("obligation", "runtime-contract-cohort", pathway.jurisdiction, pathway.compiledPathwayId, branch.id),
          obligationKind: "exact_runtime_contract_cohort_branch",
          sourceKeys: [pathwaySourceKey],
          sourceCandidate,
          detail: {
            ...sourceDetail,
            classification,
            worklistFacts: branchWorklistFacts,
          },
          overrides: {
            publicLabel: branch.label,
            statuteOrAuthority: branch.statute,
            processActor: branch.actor,
            participantCanInitiate: classification.participantCanInitiate,
            participantFacingInstrument: branch.instrument,
            destination: branch.destination ?? sourceCandidate.destination,
            currentOutputStrategy: isA ? sourceCandidate.currentOutputStrategy : (branch.strategy ?? null),
            packetFamilyId: isA ? sourceCandidate.packetFamilyId : null,
            packetSetId: isA ? sourceCandidate.packetSetId : null,
            existingArtifactIds: isA ? sourceCandidate.existingArtifactIds : [],
            currentServiceDisposition: `contract_cohort_branch:${branch.id}:${isA ? "participant_implementation" : branch.category === "B_LEGITIMATE_EXCLUSION" ? "no_filing" : "legal_review"}`,
            currentImplementationEvidence: uniq([
              ...sourceCandidate.currentImplementationEvidence,
              `exact-runtime-contract-cohort:${branch.id}:${branch.evidence}`,
              `exact-runtime-contract-cohort-source-notes:${sourceCandidate.routeContractId}:${contractNotes}`,
            ]),
            missingImplementationWork: isA
              ? uniq([
                ...sourceCandidate.missingImplementationWork,
                `Wire the exact ${branch.id} terminal cohort independently from the sibling automatic, petition, correction, or favorable-outcome cohorts stated in the same contract.`,
              ])
              : [],
            possibleCategory: classification.possibleCategory,
            possibleCategoryBReason: classification.possibleCategoryBReason,
            classificationConfidence: classification.classificationConfidence,
            requiresLegalReview: classification.requiresLegalReview,
            legalReviewQuestion: classification.legalReviewQuestion,
          },
        });
      }
      continue;
    }
    const fidelityConflict = isSharedFormOnlyCrosswalkConflict(pathway);
    const heldPresentationConflict = heldPresentationConflictForPathway(pathway, inputs.presentationConflicts);
    const classification = fidelityConflict
      ? classificationResult({
        category: "NEEDS_LEGAL_REVIEW",
        confidence: "high",
        participantCanInitiate: sourceCandidate.participantCanInitiate,
        question: `Which exact current legal-design track and statutory authority governs runtime pathway ${pathway.compiledPathwayId}, whose only crosswalk evidence is a shared form with no shared statutory citation?`,
      })
      : classificationFromCandidate(sourceCandidate);
    addObligation({
      obligationKey: routeKey("obligation", "runtime-only", pathway.jurisdiction, pathway.compiledPathwayId),
      obligationKind: fidelityConflict
        ? "runtime_with_rejected_shared_form_only_crosswalk"
        : heldPresentationConflict
          ? "runtime_with_rejected_held_presentation_crosswalk"
          : "runtime_without_legal_track",
      sourceKeys: [pathwaySourceKey],
      sourceCandidate,
      detail: heldPresentationConflict
        ? {
          ...sourceDetail,
          relationships: [],
          classification,
          worklistFacts: overlayWorklistFacts(
            Object.fromEntries(DELIVERABLE_FIELDS.map((field) => [field, evidenceField([])])),
            sourceDetail.contract ? worklistFactsForContract(sourceDetail.contract) : {},
          ),
        }
        : { ...sourceDetail, classification },
      overrides: fidelityConflict ? {
        trackId: null,
        processActor: "not recorded",
        participantFacingInstrument: sourceCandidate.routeContractId
          ? "South Carolina juvenile-expungement participant packet — exact form or composed treatment not recorded"
          : "not recorded",
        destination: "not recorded — rejected crosswalk supplied only the adult § 17-22-950 summary-court destination",
        currentOutputStrategy: null,
        packetFamilyId: null,
        packetSetId: null,
        requiredSourceIds: sourceCandidate.requiredSourceIds.filter((id) => id.startsWith("compiled-profile:")
          || id.startsWith("compiled-source-ref:")
          || id.startsWith("route-contract:")),
        existingArtifactIds: [],
        currentServiceDisposition: "crosswalk_fidelity_conflict:shared_official_form_without_shared_statutory_citation",
        currentImplementationEvidence: uniq([
          ...sourceCandidate.currentImplementationEvidence.filter((item) => !/SCCA-?223E|scca223e|sc_17_22_950_summary/i.test(item)),
          "rejected-crosswalk-edge:shared_official_form:no_shared_statutory_citation",
          "adult-summary-court-destination-and-packet-evidence-rejected",
        ]),
        possibleCategory: classification.possibleCategory,
        possibleCategoryBReason: classification.possibleCategoryBReason,
        classificationConfidence: classification.classificationConfidence,
        participantCanInitiate: classification.participantCanInitiate,
        requiresLegalReview: classification.requiresLegalReview,
        legalReviewQuestion: classification.legalReviewQuestion,
      } : heldPresentationConflict ? {
        trackId: null,
        processActor: "participant",
        destination: "not recorded — the held compiled presentation does not establish the exact § 42-8-62.1 filing destination",
        packetSetId: null,
        requiredSourceIds: sourceCandidate.requiredSourceIds.filter((id) => id.startsWith("compiled-profile:")
          || id.startsWith("compiled-source-ref:")
          || id.startsWith("route-contract:")),
        existingArtifactIds: sourceCandidate.existingArtifactIds.filter((id) => !id.startsWith("source-artifact:")),
        currentServiceDisposition: "crosswalk_fidelity_conflict:held_presentation_edge_rejected",
        currentCommercialState: String(sourceCandidate.currentCommercialState).startsWith("ROUTE_PRESENTATION_CONFLICT_HELD:")
          ? sourceCandidate.currentCommercialState
          : `ROUTE_PRESENTATION_CONFLICT_HELD:${sourceCandidate.currentCommercialState}`,
        currentImplementationEvidence: uniq([
          ...sourceCandidate.currentImplementationEvidence.filter((item) => !item.startsWith("legal-design:")
            && !item.startsWith("authority-ledger:")
            && !item.startsWith("completed-output-counsel-family:")
            && !item.startsWith("source-relationship:")),
          `rejected-crosswalk-edge:held-route-presentation-conflict:${heldPresentationConflict.routeKey}`,
          `route-presentation-conflict:${heldPresentationConflict.status}:${heldPresentationConflict.routeKey}:${heldPresentationConflict.classification}`,
        ]),
        missingImplementationWork: classification.possibleCategory === "A_MUST_FULFILL"
          ? uniq([
            ...sourceCandidate.missingImplementationWork,
            "Correct product wiring for the held route-presentation conflict so participant-facing compiled text and the exact contract mechanism agree, then verify the dedicated commercial hold remains closed until separately released.",
          ])
          : [],
      } : {},
    });
  }

  let replacedBranchSelectionParents = 0;
  for (const contractEntry of contracts.effective.filter((entry) => entry.contract.serviceBranches?.length)) {
    const { contract } = contractEntry;
    let inheritedSourceKeys = [];
    if (contract.branchSelectionRequired === true) {
      const replaced = canonicalObligations.filter((row) => {
        const candidate = obligationCandidates.find((item) => item.routeKey === row.routeKey);
        return candidate?.jurisdiction === contract.jurisdiction && candidate?.runtimePathwayId === contract.pathwayId;
      });
      replacedBranchSelectionParents += replaced.length;
      inheritedSourceKeys = uniq(replaced.flatMap((row) => row.sourceEntityKeys));
      const removedKeys = new Set(replaced.map((row) => row.routeKey));
      for (let index = canonicalObligations.length - 1; index >= 0; index -= 1) {
        if (!removedKeys.has(canonicalObligations[index].routeKey)) continue;
        canonicalObligations.splice(index, 1);
      }
      for (const removedKey of removedKeys) {
        const candidateIndex = obligationCandidates.findIndex((row) => row.routeKey === removedKey);
        if (candidateIndex >= 0) obligationCandidates.splice(candidateIndex, 1);
        obligationDetails.delete(removedKey);
      }
    }
    for (const branch of contract.serviceBranches) {
      const branchSourceKey = routeKey("service-branch", contract.routeKey, branch.id);
      const branchCandidate = sourceCandidateByKey.get(branchSourceKey);
      if (contract.routeKey === "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05" && branch.id === "pre_effective_date_petition") {
        const petitionTrackSourceKey = routeKey("track", "ND", "nd-nonconviction-close-petition");
        const trackOnlyKey = routeKey("obligation", "track-only", "ND", "nd-nonconviction-close-petition");
        const trackOnlyCandidate = obligationCandidates.find((row) => row.routeKey === trackOnlyKey);
        const trackOnlyObligation = canonicalObligations.find((row) => row.routeKey === trackOnlyKey);
        if (trackOnlyCandidate && trackOnlyObligation) {
          canonicalObligations.splice(canonicalObligations.indexOf(trackOnlyObligation), 1);
          obligationCandidates.splice(obligationCandidates.indexOf(trackOnlyCandidate), 1);
          obligationDetails.delete(trackOnlyKey);
          addObligation({
            obligationKey: routeKey("obligation", "service-branch", contract.routeKey, branch.id),
            obligationKind: "hidden_track_backed_contract_service_branch",
            sourceKeys: [petitionTrackSourceKey, branchSourceKey, ...trackOnlyObligation.sourceEntityKeys, ...inheritedSourceKeys],
            sourceCandidate: branchCandidate,
            detail: details.get(branchSourceKey),
            overrides: {
              requiredSourceIds: uniq([...trackOnlyCandidate.requiredSourceIds, ...branchCandidate.requiredSourceIds]),
              existingArtifactIds: uniq([...trackOnlyCandidate.existingArtifactIds, ...branchCandidate.existingArtifactIds]),
              legalDecisionRecordIds: uniq([...trackOnlyCandidate.legalDecisionRecordIds, ...branchCandidate.legalDecisionRecordIds]),
              currentImplementationEvidence: uniq([...trackOnlyCandidate.currentImplementationEvidence, ...branchCandidate.currentImplementationEvidence, "exact-track-service-branch:nd-nonconviction-close-petition"]),
              missingImplementationWork: uniq([...trackOnlyCandidate.missingImplementationWork, ...branchCandidate.missingImplementationWork]),
            },
          });
          mergedTrackServiceBranchSignals.push({
            trackRouteKey: petitionTrackSourceKey,
            serviceBranchRouteKey: branchSourceKey,
            canonicalObligationKey: routeKey("obligation", "service-branch", contract.routeKey, branch.id),
            evidence: "The automatic track names nd-nonconviction-close-petition as its pre-effective route, and the contract branch selects the same pre-effective petition.",
          });
          continue;
        }
      }
      addObligation({
        obligationKey: routeKey("obligation", "service-branch", contract.routeKey, branch.id),
        obligationKind: contract.branchSelectionRequired ? "exhaustive_contract_service_branch" : "contract_exception_branch",
        sourceKeys: [branchSourceKey, ...inheritedSourceKeys],
        sourceCandidate: branchCandidate,
        detail: details.get(branchSourceKey),
      });
    }
  }

  for (const contractEntry of contracts.effective) {
    const { contract } = contractEntry;
    for (const disposition of contract.failureDisposition ?? []) {
      const sourceKey = routeKey("failure-disposition", contract.routeKey, disposition.id);
      const selectorIdentity = exactSelectorIdentity(disposition.selector);
      const matchingServiceBranch = selectorIdentity
        ? (contract.serviceBranches ?? []).find((branch) => exactSelectorIdentity(branch.selector) === selectorIdentity)
        : null;
      if (matchingServiceBranch) {
        const obligationKey = routeKey("obligation", "service-branch", contract.routeKey, matchingServiceBranch.id);
        const obligation = canonicalObligations.find((row) => row.routeKey === obligationKey);
        const candidate = obligationCandidates.find((row) => row.routeKey === obligationKey);
        if (obligation && candidate) {
          obligation.sourceEntityKeys = uniq([...obligation.sourceEntityKeys, sourceKey]);
          const failureCandidate = sourceCandidateByKey.get(sourceKey);
          candidate.requiredSourceIds = uniq([...candidate.requiredSourceIds, ...failureCandidate.requiredSourceIds]);
          candidate.legalDecisionRecordIds = uniq([...candidate.legalDecisionRecordIds, ...failureCandidate.legalDecisionRecordIds]);
          candidate.currentImplementationEvidence = uniq([...candidate.currentImplementationEvidence, ...failureCandidate.currentImplementationEvidence, `merged-exact-selector:${selectorIdentity}`]);
          mergedServiceFailureSelectorSignals.push({
            contractRouteKey: contract.routeKey,
            selectorIdentity,
            serviceBranchId: matchingServiceBranch.id,
            failureDispositionId: disposition.id,
            canonicalObligationKey: obligationKey,
            interpretation: "Exact selector representations merged into one terminal condition; both typed source rows remain accounted.",
          });
          continue;
        }
      }
      if (contract.routeKey === "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05" && disposition.id === "nd_still_public_day_62") {
        const sourceCandidate = sourceCandidateByKey.get(sourceKey);
        const sourceDetail = details.get(sourceKey);
        const decisionEvidence = "decision-source:data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json#LA-IMM-03";
        const correctionBranches = [
          {
            id: "written_clerk_correction_request",
            label: "Written Request to Implement Mandatory Closure and Correct Public-Access Status",
            destination: "clerk of the original court",
            serviceDisposition: "participant_written_clerk_correction_request",
            postFiling: "If the clerk cannot correct the public-access status, prepare the original-case enforcement motion.",
          },
          {
            id: "original_case_enforcement_motion",
            label: "Motion to Enforce Mandatory Closure Under N.D.C.C. § 12-60.1-05 with proposed order",
            destination: "court in the original criminal case",
            serviceDisposition: "participant_original_case_enforcement_motion",
            postFiling: "A contested eligibility question requires attorney or partner handoff.",
          },
        ];
        for (const correction of correctionBranches) {
          const classification = classificationResult({ category: "A_MUST_FULFILL", confidence: "high", participantCanInitiate: true });
          const correctionKey = routeKey("obligation", "failure-disposition", contract.routeKey, disposition.id, correction.id);
          const worklistFacts = overlayWorklistFacts(sourceDetail.worklistFacts, {
            primaryOfficialFormOrComposedPleading: evidenceField([correction.label]),
            filingDestination: evidenceField([correction.destination]),
            filingMethod: evidenceField([]),
            postFilingInstructions: evidenceField([correction.postFiling]),
            contestedHearingOrOppositionHandoff: evidenceField(["Contested eligibility requires attorney or partner handoff."]),
          });
          addObligation({
            obligationKey: correctionKey,
            obligationKind: "hidden_participant_correction_branch",
            sourceKeys: [sourceKey],
            sourceCandidate,
            detail: { ...sourceDetail, classification, worklistFacts },
            overrides: {
              publicLabel: `${sourceCandidate.publicLabel} — ${correction.label}`,
              processActor: "participant",
              participantCanInitiate: true,
              participantFacingInstrument: correction.label,
              destination: correction.destination,
              currentOutputStrategy: "custom_pleading",
              packetFamilyId: null,
              packetSetId: null,
              requiredSourceIds: uniq([...sourceCandidate.requiredSourceIds, decisionEvidence]),
              currentServiceDisposition: `contract_failure_disposition:${correction.serviceDisposition}`,
              currentCommercialState: "HIDDEN_CORRECTION_BRANCH_NOT_COMMERCIAL_AUTHORITY",
              legalDecisionRecordIds: uniq([...sourceCandidate.legalDecisionRecordIds, "LA-IMM-03"]),
              currentImplementationEvidence: uniq([
                ...sourceCandidate.currentImplementationEvidence,
                `controlling-participant-correction-decision:LA-IMM-03:${correction.id}`,
              ]),
              missingImplementationWork: uniq([
                "Acquire and verify exact official-source custody for this correction branch.",
                "Implement the exact composed correction instrument and companion instructions.",
                "Wire the hidden correction branch independently from the automatic parent.",
                "Generate the exact route output and complete artifact review.",
                "Obtain completed-output legal approval; this census creates no approval.",
              ]),
              possibleCategory: classification.possibleCategory,
              possibleCategoryBReason: classification.possibleCategoryBReason,
              classificationConfidence: classification.classificationConfidence,
              requiresLegalReview: classification.requiresLegalReview,
              legalReviewQuestion: classification.legalReviewQuestion,
            },
          });
          canonicalObligations.at(-1).hiddenParticipantBranch = true;
        }
        continue;
      }
      addObligation({
        obligationKey: routeKey("obligation", "failure-disposition", contract.routeKey, disposition.id),
        obligationKind: "conditional_failure_disposition",
        sourceKeys: [sourceKey],
        sourceCandidate: sourceCandidateByKey.get(sourceKey),
        detail: details.get(sourceKey),
      });
    }
  }

  const addCurrentDecisionBranch = ({ baseObligationKey, obligationKey, branchId, label, instrument, destination, strategy, category, reason = null, actor = "participant", hidden = false, facts = {}, sourceTag }) => {
    const baseObligation = canonicalObligations.find((row) => row.routeKey === baseObligationKey);
    const baseCandidate = obligationCandidates.find((row) => row.routeKey === baseObligationKey);
    if (!baseObligation || !baseCandidate) throw new Error(`Cannot add ${sourceTag}:${branchId}; base obligation ${baseObligationKey} is missing`);
    const classification = classificationResult({
      category,
      reason,
      confidence: "high",
      participantCanInitiate: category === "A_MUST_FULFILL",
    });
    const worklistFacts = worklistFactsForDecisionBranch({ instrument, destination, facts });
    addObligation({
      obligationKey,
      obligationKind: category === "A_MUST_FULFILL" ? "hidden_participant_correction_branch" : "conditional_professional_handoff",
      sourceKeys: baseObligation.sourceEntityKeys,
      sourceCandidate: baseCandidate,
      detail: { relationships: [], classification, worklistFacts },
      overrides: {
        publicLabel: label,
        processActor: actor,
        participantCanInitiate: classification.participantCanInitiate,
        participantFacingInstrument: instrument,
        destination,
        currentOutputStrategy: strategy,
        packetFamilyId: null,
        packetSetId: null,
        requiredSourceIds: [],
        existingArtifactIds: [],
        currentServiceDisposition: `current_decision_branch:${sourceTag}:${branchId}`,
        currentCommercialState: "DECISION_DERIVED_BRANCH_WITHOUT_GRADE_A_AUTHORITY",
        legalDecisionRecordIds: uniq([...baseCandidate.legalDecisionRecordIds, sourceTag]),
        currentImplementationEvidence: uniq([...baseCandidate.currentImplementationEvidence, `current-decision-branch:${sourceTag}:${branchId}`]),
        missingImplementationWork: category === "A_MUST_FULFILL" ? missingWorkForDecisionBranch({ category, strategy }) : [],
        possibleCategory: classification.possibleCategory,
        possibleCategoryBReason: classification.possibleCategoryBReason,
        classificationConfidence: classification.classificationConfidence,
        requiresLegalReview: classification.requiresLegalReview,
        legalReviewQuestion: classification.legalReviewQuestion,
      },
    });
    canonicalObligations.at(-1).hiddenParticipantBranch = hidden;
  };

  const sdSisBaseKey = routeKey("obligation", "track-pathway", "SD", "sd_sis_sealing", "suspended-imposition-of-sentence-sealing");
  const sdSisCandidate = obligationCandidates.find((row) => row.routeKey === sdSisBaseKey);
  const sdSisDetail = obligationDetails.get(sdSisBaseKey);
  if (!sdSisCandidate || !sdSisDetail) throw new Error("Current Q-037 SD SIS decision has no canonical base obligation");
  const sdInitialClassification = classificationResult({ category: "B_LEGITIMATE_EXCLUSION", reason: "AUTOMATIC", confidence: "high", participantCanInitiate: false });
  Object.assign(sdSisCandidate, {
    publicLabel: "Mandatory initial sealing at suspended-imposition discharge and dismissal",
    processActor: "court",
    participantCanInitiate: false,
    participantFacingInstrument: "no participant filing — verify mandatory court sealing at discharge and dismissal",
    destination: "sentencing court in the original criminal case",
    currentOutputStrategy: "process_guidance",
    packetFamilyId: null,
    packetSetId: null,
    requiredSourceIds: [],
    existingArtifactIds: [],
    currentServiceDisposition: "current_decision_initial_automatic_sealing",
    legalDecisionRecordIds: uniq([...sdSisCandidate.legalDecisionRecordIds, "Q-037"]),
    currentImplementationEvidence: uniq([...sdSisCandidate.currentImplementationEvidence, "current-decision:Q-037:initial-sealing-is-court-mandatory"]),
    missingImplementationWork: [],
    ...sdInitialClassification,
  });
  obligationDetails.set(sdSisBaseKey, { ...sdSisDetail, classification: sdInitialClassification });
  addCurrentDecisionBranch({
    baseObligationKey: sdSisBaseKey,
    obligationKey: routeKey("obligation", "decision-branch", "SD", "sd_sis_sealing", "written_implementation_request"),
    branchId: "written_implementation_request",
    label: "South Dakota SIS written sealing-implementation request",
    instrument: "written request to implement mandatory sealing under SDCL § 23A-27-17",
    destination: "clerk or sentencing judge in the original criminal case",
    strategy: "custom_pleading",
    category: "A_MUST_FULFILL",
    hidden: true,
    sourceTag: "report-question:Q-037",
    facts: {
      requiredParticipantAttachments: ["discharge and dismissal order plus evidence the record remains publicly accessible"],
      postFilingInstructions: ["If the clerk or sentencing judge cannot correct the record, use the original-case enforcement motion."],
    },
  });
  addCurrentDecisionBranch({
    baseObligationKey: sdSisBaseKey,
    obligationKey: routeKey("obligation", "decision-branch", "SD", "sd_sis_sealing", "original_case_enforcement_motion"),
    branchId: "original_case_enforcement_motion",
    label: "South Dakota SIS motion to enforce mandatory sealing",
    instrument: "motion in the original criminal case to enforce SDCL § 23A-27-17",
    destination: "sentencing court in the original criminal docket",
    strategy: "custom_pleading",
    category: "A_MUST_FULFILL",
    hidden: true,
    sourceTag: "report-question:Q-037",
    facts: {
      proposedOrder: ["proposed sealing-enforcement order"],
      requiredParticipantAttachments: ["discharge and dismissal order, written implementation request, and evidence the record remains public"],
      contestedHearingOrOppositionHandoff: ["A contested refusal or mandamus issue is an attorney handoff."],
    },
  });
  addCurrentDecisionBranch({
    baseObligationKey: sdSisBaseKey,
    obligationKey: routeKey("obligation", "decision-branch", "SD", "sd_sis_sealing", "contested_refusal_handoff"),
    branchId: "contested_refusal_handoff",
    label: "South Dakota SIS contested refusal or mandamus handoff",
    instrument: "attorney handoff for contested refusal or mandamus",
    destination: "attorney or partner",
    strategy: "process_guidance",
    category: "B_LEGITIMATE_EXCLUSION",
    reason: "UNSUITABLE_FOR_SELF_HELP",
    actor: "attorney or professional",
    sourceTag: "report-question:Q-037",
  });

  const scSummaryBaseKey = routeKey("obligation", "unit", "SC", "sc_17_22_950_summary", "sc-17-22-950-unit-a-fingerprinted-automatic");
  addCurrentDecisionBranch({
    baseObligationKey: scSummaryBaseKey,
    obligationKey: routeKey("obligation", "decision-branch", "SC", "sc_17_22_950_summary", "written_implementation_request"),
    branchId: "written_implementation_request",
    label: "South Carolina summary-court written automatic-order implementation request",
    instrument: "written implementation request to the summary-court clerk or judge",
    destination: "original summary court",
    strategy: "custom_pleading",
    category: "A_MUST_FULFILL",
    hidden: true,
    sourceTag: "report-question:Q-029",
    facts: {
      requiredParticipantAttachments: ["original docket, disposition, fingerprinted status, statutory deadline, and evidence the mandatory order was not implemented"],
      postFilingInstructions: ["If the summary court does not implement the order, use the original-case enforcement motion."],
    },
  });
  addCurrentDecisionBranch({
    baseObligationKey: scSummaryBaseKey,
    obligationKey: routeKey("obligation", "decision-branch", "SC", "sc_17_22_950_summary", "original_case_enforcement_motion"),
    branchId: "original_case_enforcement_motion",
    label: "South Carolina summary-court motion to enforce § 17-22-950(A)",
    instrument: "motion in the original summary case to enforce § 17-22-950(A)",
    destination: "original summary court",
    strategy: "custom_pleading",
    category: "A_MUST_FULFILL",
    hidden: true,
    sourceTag: "report-question:Q-029",
    facts: {
      proposedOrder: ["proposed mandatory expungement order"],
      requiredParticipantAttachments: ["original docket, disposition, fingerprinted status, statutory deadline, written implementation request, and evidence of nonimplementation"],
      contestedHearingOrOppositionHandoff: ["Mandamus or disputed eligibility is an attorney handoff."],
    },
  });

  for (const decisionRoute of inputs.researchTrackDecisions) {
    const plan = currentDecisionRoutePlan(decisionRoute);
    const isUnattached = unattachedDecisionIds.has(`${decisionRoute.jurisdiction}:${decisionRoute.trackId}`);
    const sourceKind = isUnattached ? "unattached-decision-route" : "research-decision-route";
    const sourceKey = routeKey(sourceKind, decisionRoute.jurisdiction, decisionRoute.trackId);
    const sourceCandidate = sourceCandidateByKey.get(sourceKey);
    const sourceDetail = details.get(sourceKey);
    const representationMerge = RESEARCH_DECISION_EXACT_REPRESENTATION_MERGES.get(`${decisionRoute.jurisdiction}:${decisionRoute.trackId}`);
    if (representationMerge) {
      if (plan.branches.length !== 1) throw new Error(`Exact research representation merge must have one branch: ${decisionRoute.trackId}`);
      const branch = plan.branches[0];
      const targetObligation = canonicalObligations.find((row) => row.routeKey === representationMerge.canonicalObligationKey);
      const targetCandidate = obligationCandidates.find((row) => row.routeKey === representationMerge.canonicalObligationKey);
      const targetDetail = obligationDetails.get(representationMerge.canonicalObligationKey);
      if (!targetObligation || !targetCandidate || !targetDetail) {
        throw new Error(`Missing exact canonical merge target ${representationMerge.canonicalObligationKey}`);
      }
      targetObligation.sourceEntityKeys = uniq([...targetObligation.sourceEntityKeys, sourceKey]);
      targetCandidate.processActor = branch.actor;
      targetCandidate.legalDecisionRecordIds = uniq([
        ...targetCandidate.legalDecisionRecordIds,
        ...sourceCandidate.legalDecisionRecordIds,
      ]);
      targetCandidate.currentImplementationEvidence = uniq([
        ...targetCandidate.currentImplementationEvidence,
        ...sourceCandidate.currentImplementationEvidence,
        `research-decision-exact-representation:${decisionRoute.trackId}:${representationMerge.canonicalObligationKey}`,
      ]);
      targetCandidate.requiredSourceIds = uniq([
        ...targetCandidate.requiredSourceIds,
        ...(branch.requiredSourceIds ?? []),
      ]);
      targetDetail.worklistFacts = overlayWorklistFacts(
        targetDetail.worklistFacts,
        worklistFactsForDecisionBranch(branch),
      );
      mergedResearchRepresentationSignals.push({
        researchDecisionSourceKey: sourceKey,
        researchTrackId: decisionRoute.trackId,
        canonicalObligationKey: representationMerge.canonicalObligationKey,
        exactRegistryTrackId: representationMerge.trackId,
        exactRuntimePathwayId: representationMerge.runtimePathwayId,
        interpretation: representationMerge.relation,
      });
      continue;
    }
    for (const branch of plan.branches) {
      const classification = decisionBranchClassification(branch);
      let sourceKeys = [sourceKey];
      let mergedFailureCandidate = null;
      if (decisionRoute.trackId === "ny_160_55_violation" && ["pre_1991_legacy_motion", "contested_nonsealing_handoff"].includes(branch.id)) {
        const failureId = branch.id === "pre_1991_legacy_motion" ? "ny_160_55_pre_1991_disposition" : "ny_160_55_interests_of_justice_order";
        const failureKey = routeKey("failure-disposition", "NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55", failureId);
        const failureObligationKey = routeKey("obligation", "failure-disposition", "NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55", failureId);
        const removedFailure = canonicalObligations.find((row) => row.routeKey === failureObligationKey);
        mergedFailureCandidate = obligationCandidates.find((row) => row.routeKey === failureObligationKey);
        if (removedFailure) {
          sourceKeys = uniq([...sourceKeys, ...removedFailure.sourceEntityKeys, failureKey]);
          removeObligation(failureObligationKey);
          mergedDecisionFailureSignals.push({
            decisionTrackId: decisionRoute.trackId,
            decisionBranchId: branch.id,
            failureDispositionId: failureId,
            interpretation: "The current decision branch and effective contract failure disposition name the same § 160.55 condition; both typed sources map to one terminal obligation.",
          });
        }
      }
      const obligationKind = isUnattached ? "unattached_legal_decision_route" : "current_research_decision_route";
      const obligationKey = branch.primary === true || !branch.id
        ? routeKey("obligation", sourceKind, decisionRoute.jurisdiction, decisionRoute.trackId)
        : routeKey("obligation", sourceKind, decisionRoute.jurisdiction, decisionRoute.trackId, branch.id);
      const worklistFacts = worklistFactsForDecisionBranch(branch);
      addObligation({
        obligationKey,
        obligationKind: branch.hidden ? `hidden_${obligationKind}_branch` : obligationKind,
        sourceKeys,
        sourceCandidate,
        detail: { ...sourceDetail, classification, worklistFacts },
        overrides: {
          publicLabel: branch.label,
          statuteOrAuthority: plan.statuteOrAuthority,
          trackId: null,
          runtimePathwayId: null,
          routeContractId: null,
          processActor: branch.actor,
          participantCanInitiate: classification.participantCanInitiate,
          participantFacingInstrument: branch.instrument,
          destination: branch.destination,
          currentOutputStrategy: branch.strategy,
          packetFamilyId: null,
          packetSetId: null,
          requiredSourceIds: branch.requiredSourceIds ?? [],
          existingArtifactIds: [],
          currentServiceDisposition: `current_decision_route_branch:${branch.id ?? "single"}:${branch.category.toLowerCase()}`,
          currentCommercialState: "NO_APPROVED_TRACK_RUNTIME_OR_GRADE_A_FULFILLMENT_RECORD",
          legalDecisionRecordIds: uniq([
            ...sourceCandidate.legalDecisionRecordIds,
            ...(mergedFailureCandidate?.legalDecisionRecordIds ?? []),
          ]),
          currentImplementationEvidence: uniq([
            ...sourceCandidate.currentImplementationEvidence.filter((item) => !item.startsWith("exact-output-treatment:")),
            ...(mergedFailureCandidate?.currentImplementationEvidence ?? []),
            `current-decision-branch:${decisionRoute.trackId}:${branch.id ?? "single"}`,
            `exact-output-treatment:${branch.strategy ?? "not-recorded"}:${branch.instrument}`,
          ]),
          missingImplementationWork: missingWorkForDecisionBranch(branch),
          possibleCategory: classification.possibleCategory,
          possibleCategoryBReason: classification.possibleCategoryBReason,
          classificationConfidence: classification.classificationConfidence,
          requiresLegalReview: classification.requiresLegalReview,
          legalReviewQuestion: classification.legalReviewQuestion,
        },
      });
      canonicalObligations.at(-1).hiddenParticipantBranch = Boolean(branch.hidden);
    }
  }

  const lawrenceDecisionFile = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
  const lawrenceDecisionSourceSha256 = `sha256:${sha256(readText(lawrenceDecisionFile))}`;
  const oregonLawrenceObligationKey = routeKey(
    "obligation",
    "track-pathway",
    "OR",
    "or_acquittal",
    "set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
  );
  const oregonLawrenceCandidate = obligationCandidates.find((row) => row.routeKey === oregonLawrenceObligationKey);
  const oregonLawrenceDetail = obligationDetails.get(oregonLawrenceObligationKey);
  if (!oregonLawrenceCandidate || !oregonLawrenceDetail) throw new Error(`Missing Oregon Lawrence conflict obligation ${oregonLawrenceObligationKey}`);
  const oregonLawrenceClassification = classificationResult({
    category: "NEEDS_LEGAL_REVIEW",
    confidence: "high",
    participantCanInitiate: true,
    question: "Which exact route and packet-configuration identities replace the overbroad ORS 137.225(1)(c) runtime treatment so never-charged matters use Option 3 and acquittal or ordinary-dismissal matters use separate ORS 137.225(1)(d) Option 2 treatments?",
  });
  Object.assign(oregonLawrenceCandidate, {
    participantFacingInstrument: "not recorded — current route combines disposition treatments that the Lawrence decisions require to be separate",
    destination: "not recorded — exact destination must be bound independently for each disposition-specific replacement configuration",
    currentOutputStrategy: null,
    packetFamilyId: null,
    packetSetId: null,
    requiredSourceIds: oregonLawrenceCandidate.requiredSourceIds.filter((id) => id.startsWith("compiled-profile:")
      || id.startsWith("compiled-source-ref:")
      || id.startsWith("official-form:")
      || id.startsWith("route-contract:")
      || id.startsWith("source-url:")),
    existingArtifactIds: [],
    currentServiceDisposition: "legal_decision_fidelity_conflict:overbroad_1_c_route_and_packet_scope",
    legalDecisionRecordIds: uniq([
      ...oregonLawrenceCandidate.legalDecisionRecordIds,
      "LWD-2026-08-29-OR-SUBSECTION",
      "legal-question:OR-Q1-SUBSECTION",
      "LWD-2026-08-29-OR-PACKET-SCOPE",
      "legal-question:OR-Q2-PACKET-SCOPE",
    ]),
    currentImplementationEvidence: uniq([
      ...oregonLawrenceCandidate.currentImplementationEvidence,
      `lawrence-decision-source:${lawrenceDecisionFile}:${lawrenceDecisionSourceSha256}`,
      "lawrence-decision:LWD-2026-08-29-OR-SUBSECTION:1(c)-only-never-charged",
      "lawrence-decision:LWD-2026-08-29-OR-PACKET-SCOPE:separate-option-2-and-option-3-configurations",
      "current-grade-a-artifacts-do-not-resolve-the-new-disposition-scope-conflict",
    ]),
    missingImplementationWork: [],
    possibleCategory: oregonLawrenceClassification.possibleCategory,
    possibleCategoryBReason: oregonLawrenceClassification.possibleCategoryBReason,
    classificationConfidence: oregonLawrenceClassification.classificationConfidence,
    participantCanInitiate: oregonLawrenceClassification.participantCanInitiate,
    requiresLegalReview: oregonLawrenceClassification.requiresLegalReview,
    legalReviewQuestion: oregonLawrenceClassification.legalReviewQuestion,
  });
  oregonLawrenceDetail.classification = oregonLawrenceClassification;

  const newYorkOverbroadObligationKey = routeKey(
    "obligation",
    "track-pathway",
    "NY",
    "ny_160_50_nonconviction",
    "automatic-non-conviction-sealing-under-cpl-160-50-160-55",
  );
  const newYorkOverbroadCandidate = obligationCandidates.find((row) => row.routeKey === newYorkOverbroadObligationKey);
  if (!newYorkOverbroadCandidate) throw new Error(`Missing New York overbroad compiled mapping obligation ${newYorkOverbroadObligationKey}`);
  Object.assign(newYorkOverbroadCandidate, {
    participantFacingInstrument: "no filing — § 160.50 favorable-termination sealing guidance; § 160.55 is accounted through separate current-decision branches",
    currentServiceDisposition: "crosswalk_fidelity_conflict:compiled_scope_combines_160_50_and_160_55",
    legalDecisionRecordIds: uniq([
      ...newYorkOverbroadCandidate.legalDecisionRecordIds,
      "research-track-decision:ny_160_55_violation",
    ]),
    currentImplementationEvidence: uniq([
      ...newYorkOverbroadCandidate.currentImplementationEvidence,
      "overbroad-compiled-scope:160.50-track-mapped-to-160.50-and-160.55-runtime-label",
      "separate-current-decision-source:research-decision-route:NY:ny_160_55_violation",
    ]),
  });

  const effectiveContractByRouteKey = new Map(contracts.effective.map((entry) => [entry.contract.routeKey, entry.contract]));
  for (const adjudication of inputs.routeKindAdjudications.rows) {
    const contract = effectiveContractByRouteKey.get(adjudication.routeKey);
    if (!contract) continue;
    const pathwaySourceKey = routeKey("pathway", contract.jurisdiction, contract.pathwayId);
    const affected = canonicalObligations.filter((obligation) => obligation.sourceEntityKeys.includes(pathwaySourceKey));
    if (!affected.length) throw new Error(`Route-kind adjudication has no canonical association: ${adjudication.routeKey}`);
    for (const obligation of affected) {
      const candidate = obligationCandidates.find((row) => row.routeKey === obligation.routeKey);
      candidate.currentImplementationEvidence = uniq([
        ...candidate.currentImplementationEvidence,
        `route-kind-adjudication:${adjudication.status}:${adjudication.routeKey}:${adjudication.decisionId}`,
        `route-kind-contract-evidence:${adjudication.routeKey}:${adjudication.contractSays}`,
        `route-kind-evaluator-evidence:${adjudication.routeKey}:${adjudication.heuristicSaid}:prior=${adjudication.priorResultCode}:conclusive=${adjudication.priorResultCodeIsConclusive ?? "not-recorded"}`,
      ]);
      if (candidate.possibleCategory === "A_MUST_FULFILL" && adjudication.status === "pending") {
        candidate.missingImplementationWork = strategyCompatibleMissingWork(candidate.currentOutputStrategy, [
          ...candidate.missingImplementationWork,
          "Complete product wiring for the pending contract-versus-evaluator route-kind adjudication and verify that the participant-facing result presents the exact contract packet without creating commercial authority.",
        ]);
      }
    }
  }

  for (const conflict of inputs.presentationConflicts.rows.filter((row) => row.status === "held")) {
    const contract = effectiveContractByRouteKey.get(conflict.routeKey);
    if (!contract) continue;
    const pathway = inputs.crosswalk.compiledPathways.find((row) => row.jurisdiction === contract.jurisdiction && row.compiledPathwayId === contract.pathwayId);
    const affectedSourceKeys = uniq([
      routeKey("pathway", contract.jurisdiction, contract.pathwayId),
      ...asArray(pathway?.mappedRegistryTrackIds).map((trackId) => routeKey("track", contract.jurisdiction, trackId)),
    ]);
    const affected = canonicalObligations.filter((obligation) => obligation.sourceEntityKeys.some((sourceKey) => affectedSourceKeys.includes(sourceKey)));
    if (!affected.length) throw new Error(`Held route-presentation conflict has no canonical association: ${conflict.routeKey}`);
    for (const obligation of affected) {
      const candidate = obligationCandidates.find((row) => row.routeKey === obligation.routeKey);
      candidate.currentImplementationEvidence = uniq([
        ...candidate.currentImplementationEvidence,
        `route-presentation-conflict:${conflict.status}:${conflict.routeKey}:${conflict.classification}`,
        `rejected-crosswalk-edge:held-route-presentation-conflict:${conflict.routeKey}`,
      ]);
      if (candidate.possibleCategory === "A_MUST_FULFILL") {
        candidate.missingImplementationWork = strategyCompatibleMissingWork(candidate.currentOutputStrategy, [
          ...candidate.missingImplementationWork,
          "Correct product wiring for the held route-presentation conflict so participant-facing compiled text and the exact contract mechanism agree, then verify the dedicated commercial hold remains closed until separately released.",
        ]);
      }
    }
  }

  canonicalObligations.sort((a, b) => a.routeKey.localeCompare(b.routeKey));
  obligationCandidates.sort((a, b) => a.routeKey.localeCompare(b.routeKey));
  const sourceToCanonicalMappings = entities.map((entity) => {
    const mappedObligations = canonicalObligations.filter((obligation) => obligation.sourceEntityKeys.includes(entity.routeKey));
    const parentExpansionWithoutAssignment = entity.entityType === "runtime_pathway"
      && mappedObligations.some((obligation) => obligation.obligationKind === "explicit_track_unit"
        && obligationCandidates.find((candidate) => candidate.routeKey === obligation.routeKey)?.currentImplementationEvidence
          .some((item) => item === `runtime-to-unit-parent-expansion:${entity.sourceIdentity.split(":").slice(2).join(":")}:parent_expansion_without_unit_assignment`));
    return {
      sourceRouteKey: entity.routeKey,
      sourceEntityType: entity.entityType,
      accountingRelation: parentExpansionWithoutAssignment ? "parent_expansion_without_unit_assignment" : "exact_source_to_terminal_representation",
      canonicalObligationKeys: mappedObligations.map((obligation) => obligation.routeKey),
    };
  });

  const canonicalKeysForSources = (sourceKeys) => canonicalObligations
    .filter((obligation) => sourceKeys.some((sourceKey) => obligation.sourceEntityKeys.includes(sourceKey)))
    .map((obligation) => obligation.routeKey)
    .sort();
  const nationalDecisionFile = "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json";
  const decisionFidelityConflicts = [
    {
      conflictId: "NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55:overbroad-160-50-160-55",
      jurisdiction: "NY",
      runtimePathwayId: "automatic-non-conviction-sealing-under-cpl-160-50-160-55",
      mappedRegistryTrackIds: ["ny_160_50_nonconviction"],
      legalDecisionRecordIds: ["research-track-decision:ny_160_55_violation"],
      canonicalObligationKeys: canonicalKeysForSources([
        "pathway:NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55",
        "research-decision-route:NY:ny_160_55_violation",
      ]),
      sourceFile: nationalDecisionFile,
      sourceSha256: `sha256:${sha256(readText(nationalDecisionFile))}`,
      sourceProvenance: "Current research decision ny_160_55_violation separates § 160.55 treatment from the approved ny_160_50_nonconviction legal track, while the compiled pathway label and contract combine both sections.",
      fidelityDisposition: "OVERBROAD_COMPILED_SCOPE_RETAINED_ONLY_FOR_160_50_REPRESENTATION_WITH_160_55_SEPARATELY_ACCOUNTED",
      requiredPatch: "Split or narrow the compiled/runtime identity so the § 160.50 legal track does not purport to govern § 160.55; wire the separately governed § 160.55 branches only through the controlling approval process.",
    },
    {
      conflictId: "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c:lawrence-subsection-packet-scope",
      jurisdiction: "OR",
      runtimePathwayId: "set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
      mappedRegistryTrackIds: ["or_acquittal"],
      legalDecisionRecordIds: [
        "LWD-2026-08-29-OR-SUBSECTION",
        "legal-question:OR-Q1-SUBSECTION",
        "LWD-2026-08-29-OR-PACKET-SCOPE",
        "legal-question:OR-Q2-PACKET-SCOPE",
      ],
      canonicalObligationKeys: canonicalKeysForSources([
        "pathway:OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
      ]),
      sourceFile: lawrenceDecisionFile,
      sourceSha256: lawrenceDecisionSourceSha256,
      sourceProvenance: "Lawrence decisions LWD-2026-08-29-OR-SUBSECTION / OR-Q1-SUBSECTION and LWD-2026-08-29-OR-PACKET-SCOPE / OR-Q2-PACKET-SCOPE supersede the broad 1(c)-to-acquittal scope inference for census fidelity.",
      fidelityDisposition: "REJECTED_OVERBROAD_SUBSECTION_AND_PACKET_SCOPE_PENDING_EXACT_DISPOSITION_SPLIT",
      requiredPatch: "Replace the broad treatment with stable disposition-bound identities: never charged under ORS 137.225(1)(c) using Option 3, and separate acquittal and ordinary-dismissal configurations under ORS 137.225(1)(d) using Option 2.",
    },
  ];

  const crosswalkFidelityConflicts = [
    ...inputs.crosswalk.compiledPathways.filter(isSharedFormOnlyCrosswalkConflict).map((pathway) => ({
      conflictId: `${pathway.jurisdiction}:${pathway.compiledPathwayId}:shared-form-without-shared-citation`,
      jurisdiction: pathway.jurisdiction,
      runtimePathwayId: pathway.compiledPathwayId,
      mappedRegistryTrackIds: uniq(pathway.mappedRegistryTrackIds),
      mappingEvidence: uniq(pathway.mappingEvidence),
      sharedStatutoryCitations: uniq(pathway.evidenceDetail?.sharedStatutoryCitations ?? []),
      canonicalObligationKeys: canonicalKeysForSources([
        routeKey("pathway", pathway.jurisdiction, pathway.compiledPathwayId),
        ...asArray(pathway.mappedRegistryTrackIds).map((trackId) => routeKey("track", pathway.jurisdiction, trackId)),
      ]),
      canonicalizationDisposition: "REJECTED_SHARED_FORM_ONLY_WITHOUT_SHARED_STATUTORY_CITATION",
      requiredPatch: "Replace the shared-form-only crosswalk edge with an exact statutory or decision-backed relationship before canonicalization.",
    })),
    ...inputs.presentationConflicts.rows.filter((row) => row.status === "held").map((conflict) => {
      const contract = effectiveContractByRouteKey.get(conflict.routeKey);
      const pathway = inputs.crosswalk.compiledPathways.find((row) => row.jurisdiction === contract?.jurisdiction && row.compiledPathwayId === contract?.pathwayId);
      return {
        conflictId: `${conflict.routeKey}:held-presentation-crosswalk`,
        jurisdiction: contract?.jurisdiction ?? conflict.routeKey.split(":")[0],
        runtimePathwayId: contract?.pathwayId ?? conflict.routeKey.split(":").slice(1).join(":"),
        mappedRegistryTrackIds: uniq(pathway?.mappedRegistryTrackIds ?? []),
        mappingEvidence: uniq(pathway?.mappingEvidence ?? []),
        sharedStatutoryCitations: uniq(pathway?.evidenceDetail?.sharedStatutoryCitations ?? []),
        canonicalObligationKeys: canonicalKeysForSources([
          routeKey("pathway", contract?.jurisdiction, contract?.pathwayId),
          ...asArray(pathway?.mappedRegistryTrackIds).map((trackId) => routeKey("track", contract?.jurisdiction, trackId)),
        ]),
        canonicalizationDisposition: "REJECTED_HELD_PRESENTATION_CONFLATION_PENDING_EXACT_CROSSWALK_AND_COMPILED_PROFILE_REPAIR",
        requiredPatch: `Remove the ${pathway?.mappedRegistryTrackIds?.join(", ") ?? "recorded"} crosswalk edge from ${conflict.routeKey}; narrow the compiled pathway to the contract's proven ${conflict.provenStatute} mechanism and represent the distinct compiled-text remedies separately before re-linking.`,
        sourceRecord: conflict,
      };
    }),
  ];

  const routeKindAdjudicationFindings = inputs.routeKindAdjudications.rows.map((adjudication) => {
    const contract = effectiveContractByRouteKey.get(adjudication.routeKey);
    return {
      ...adjudication,
      canonicalObligationKeys: contract ? canonicalKeysForSources([
        routeKey("pathway", contract.jurisdiction, contract.pathwayId),
      ]) : [],
      censusDisposition: adjudication.status === "pending"
        ? "PENDING_PRODUCT_WIRING_AND_PARTICIPANT_PRESENTATION_PROOF_NO_COMMERCIAL_AUTHORITY_GRANTED"
        : "APPLIED_SOURCE_RECORD_PRESERVED_NO_NEW_AUTHORITY_GRANTED",
    };
  });

  const runtimeAuthorityDecisionById = new Map(inputs.runtimeAuthority.decisions.map((decision) => [decision.id, decision]));
  const runtimeAuthorityDecisionAssociations = contracts.effective.map(({ contract, sourceFile }) => {
    const decision = runtimeAuthorityDecisionById.get(contract.decisionId);
    return {
      contractRouteKey: contract.routeKey,
      jurisdiction: contract.jurisdiction,
      pathwayId: contract.pathwayId,
      contractSourceFile: sourceFile,
      contractDecisionId: contract.decisionId,
      contractOutcomeMode: contract.outcomeMode,
      authorityDecisionId: decision?.id ?? null,
      authorityRuleId: decision?.ruleId ?? null,
      authorityOutputMode: decision?.outputMode ?? null,
      authorityEffectiveDateNote: decision?.effectiveDateNote ?? null,
      authorityRouteKeys: uniq(decision?.routeKeys ?? []),
      associationStatus: decision?.routeKeys?.includes(contract.routeKey)
        ? "EXACT_AUTHORITY_ROUTE_KEY_ASSOCIATION"
        : decision
          ? "DECISION_ID_RESOLVES_AUTHORITY_ROUTE_KEY_REGISTRY_GAP"
          : "MISSING_RUNTIME_AUTHORITY_DECISION",
    };
  }).sort((a, b) => a.contractRouteKey.localeCompare(b.contractRouteKey));

  const runtimeAuthorityContractCandidateGaps = runtimeAuthorityDecisionAssociations
    .filter((association) => RUNTIME_AUTHORITY_CONTRACT_WITHOUT_CANDIDATE_KEYS.has(association.contractRouteKey))
    .map((association) => ({
      contractRouteKey: association.contractRouteKey,
      jurisdiction: association.jurisdiction,
      pathwayId: association.pathwayId,
      authorityDecisionId: association.authorityDecisionId,
      canonicalPathwayObligationKeys: sourceToCanonicalMappings.find((mapping) =>
        mapping.sourceRouteKey === routeKey("pathway", association.jurisdiction, association.pathwayId))?.canonicalObligationKeys ?? [],
      gapDisposition: "EFFECTIVE_CONTRACT_HAS_NO_EXACT_CANONICAL_CANDIDATE_ASSOCIATION_SHARED_ROUTE_IDENTITY_PATCH_REQUIRED",
    }));
  for (const association of runtimeAuthorityDecisionAssociations) {
    const exactCandidateKeys = obligationCandidates
      .filter((candidate) => candidate.routeContractId === association.contractRouteKey)
      .map((candidate) => candidate.routeKey);
    const expectedGap = RUNTIME_AUTHORITY_CONTRACT_WITHOUT_CANDIDATE_KEYS.has(association.contractRouteKey);
    if (expectedGap && exactCandidateKeys.length) throw new Error(`Runtime-authority contract gap unexpectedly acquired a candidate: ${association.contractRouteKey}`);
    if (!expectedGap && !exactCandidateKeys.length) throw new Error(`Runtime-authority contract lost its exact canonical candidate: ${association.contractRouteKey}`);
  }

  const ownerDecision = ownerCompletedOutputDecision(inputs);
  const ownerApprovedCandidateRoutes = [];
  for (const candidate of obligationCandidates) {
    const ownerApprovedFamily = ownerApprovedFamilyForCandidate(candidate, inputs);
    if (ownerApprovedFamily) {
      ownerApprovedCandidateRoutes.push({
        routeKey: candidate.routeKey,
        packetFamilyId: ownerApprovedFamily.familyId,
        trackId: candidate.trackId,
        jurisdiction: candidate.jurisdiction,
      });
      candidate.legalDecisionRecordIds = uniq([...candidate.legalDecisionRecordIds, OWNER_COMPLETED_OUTPUT_DECISION_ID]);
      candidate.currentImplementationEvidence = uniq([
        ...candidate.currentImplementationEvidence,
        `decision-owner-completed-output-approval:${OWNER_COMPLETED_OUTPUT_DECISION_ID}:family=${ownerApprovedFamily.familyId}:track=${candidate.trackId}:legal-only-no-technical-runtime-commercial-authority`,
      ]);
      candidate.missingImplementationWork = candidate.missingImplementationWork.filter((item) => !/completed-output legal approval/i.test(item));
    } else if (candidate.possibleCategory === "A_MUST_FULFILL") {
      candidate.missingImplementationWork = uniq([
        ...candidate.missingImplementationWork,
        "Obtain completed-output legal approval for the exact packet family and route scope; the census creates no approval.",
      ]);
    }
    for (const association of runtimeAuthorityDecisionAssociations.filter((row) =>
      row.authorityDecisionId && row.contractRouteKey === candidate.routeContractId)) {
      candidate.legalDecisionRecordIds = uniq([...candidate.legalDecisionRecordIds, association.authorityDecisionId]);
      candidate.currentImplementationEvidence = uniq([
        ...candidate.currentImplementationEvidence,
        `runtime-authority-decision:${association.authorityDecisionId}:route=${association.contractRouteKey}:association=${association.associationStatus}:output-mode=${association.authorityOutputMode}:effective-note=${association.authorityEffectiveDateNote}`,
      ]);
    }
  }

  const pendingAliasInstructions = contracts.effective.flatMap(({ contract, sourceFile }) => {
    const notes = textOf(contract.notes);
    return [...notes.matchAll(/Register route key alias:\s*([A-Z]{2}:[a-z0-9-]+)/g)].map((match) => ({
      aliasRouteKey: match[1],
      canonicalRouteKey: contract.routeKey,
      decisionId: contract.decisionId,
      sourceFile,
      instruction: match[0],
      registryStatus: "PENDING_NOT_REGISTERED",
    }));
  });

  const edges = representationEdges(inputs);
  const supersededRuntimeTextRows = inputs.crosswalk.registryTracks.filter((row) => row.compiledCoverageDisposition === "represented_with_superseded_runtime_text");
  const counts = {
    totalJurisdictions: uniq(inputs.tracks.map((track) => track.jurisdiction)).length,
    totalStatutoryLegalTracks: inputs.tracks.length,
    totalLegalTrackUnits: inputs.tracks.reduce((count, track) => count + (track.units?.length ?? 0), 0),
    totalRuntimeRoutes: inputs.crosswalk.compiledPathways.length,
    totalEffectiveServiceBranches: contracts.effective.reduce((count, entry) => count + (entry.contract.serviceBranches?.length ?? 0), 0),
    totalEffectiveFailureDispositions: contracts.effective.reduce((count, entry) => count + (entry.contract.failureDisposition?.length ?? 0), 0),
    totalUnattachedDecisionRoutes: inputs.unattachedDecisions.rows.length,
    totalResearchDecisionRoutes: inputs.researchTrackDecisions.length - inputs.unattachedDecisions.rows.length,
    totalCurrentDecisionRoutes: inputs.researchTrackDecisions.length,
    totalCrosswalkFidelityConflicts: crosswalkFidelityConflicts.length,
    totalDecisionFidelityConflicts: decisionFidelityConflicts.length,
    totalRouteKindAdjudications: routeKindAdjudicationFindings.length,
    pendingRouteKindAdjudications: routeKindAdjudicationFindings.filter((row) => row.status === "pending").length,
    appliedRouteKindAdjudications: routeKindAdjudicationFindings.filter((row) => row.status === "applied").length,
    totalRuntimeAuthorityDecisions: inputs.runtimeAuthority.decisions.length,
    totalRuntimeAuthorityContractAssociations: runtimeAuthorityDecisionAssociations.length,
    runtimeAuthorityContractsWithoutCandidate: runtimeAuthorityContractCandidateGaps.length,
    runtimeAuthorityRouteKeyRegistryGaps: runtimeAuthorityDecisionAssociations.filter((row) => row.associationStatus === "DECISION_ID_RESOLVES_AUTHORITY_ROUTE_KEY_REGISTRY_GAP").length,
    ownerApprovedCandidateRoutes: ownerApprovedCandidateRoutes.length,
    ownerApprovedPacketFamilyIds: uniq(ownerApprovedCandidateRoutes.map((row) => row.packetFamilyId)).length,
    totalTypedSourceEntities: entities.length,
    totalCanonicalObligations: canonicalObligations.length,
    totalCanonicalEntities: canonicalObligations.length,
    totalDistinctParticipantActionBranches: obligationCandidates.filter((row) => row.participantCanInitiate === true).length,
    possibleCategoryA: obligationCandidates.filter((row) => row.possibleCategory === "A_MUST_FULFILL").length,
    possibleCategoryB: obligationCandidates.filter((row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION").length,
    needsLegalReview: obligationCandidates.filter((row) => row.possibleCategory === "NEEDS_LEGAL_REVIEW").length,
    duplicateAliases: inputs.aliases.aliases.length,
    pendingAliasInstructions: pendingAliasInstructions.length,
    pendingCensusPacketFamilies: obligationCandidates.filter((row) => row.packetFamilyId?.startsWith("census-pending-family:")).length,
    supersededRoutes: contracts.superseded.length + supersededRuntimeTextRows.length,
    supersededContractReplacements: contracts.superseded.length,
    supersededRuntimeTextRows: supersededRuntimeTextRows.length,
    hiddenParticipantFilingBranches: canonicalObligations.filter((row) => row.hiddenParticipantBranch).length,
    rawRouteContracts: contracts.rawCount,
    effectiveRouteContracts: contracts.effective.length,
    branchSelectionParentsReplaced: replacedBranchSelectionParents,
  };

  const worklistMap = new Map();
  for (const candidate of obligationCandidates.filter((row) => row.possibleCategory === "A_MUST_FULFILL")) {
    const detail = obligationDetails.get(candidate.routeKey);
    const familyId = candidate.packetFamilyId;
    const worklistGroupId = familyId
      ?? candidate.packetSetId
      ?? (candidate.currentOutputStrategy === "custom_pleading"
        ? `composed-treatment:${candidate.trackId ?? candidate.routeKey}`
        : candidate.currentOutputStrategy === "participant_agency_application"
          ? `agency-application-treatment:${candidate.routeKey}`
          : candidate.currentOutputStrategy === "official_pdf_fill" && candidate.requiredSourceIds.some((id) => id.startsWith("official-form:"))
            ? `official-form-treatment:${candidate.routeKey}`
            : `unresolved-family:${candidate.routeKey}`);
    const groupKey = `${worklistGroupId}|${candidate.currentOutputStrategy}`;
    const family = worklistMap.get(groupKey) ?? {
      worklistGroupId,
      packetFamilyId: familyId,
      packetSetId: null,
      packetSetIds: [],
      implementationStrategy: candidate.currentOutputStrategy,
      routeKeys: [],
      jurisdictions: [],
      workTypes: [],
      routes: [],
    };
    const workTypes = workTypesFor(candidate, detail, inputs, indexes);
    family.routeKeys.push(candidate.routeKey);
    family.jurisdictions.push(candidate.jurisdiction);
    if (candidate.packetSetId) family.packetSetIds.push(candidate.packetSetId);
    family.workTypes.push(...workTypes);
    const missingDimensionWork = DELIVERABLE_FIELDS
      .filter((field) => detail.worklistFacts[field]?.status === "not_recorded")
      .map((field) => `Record ${field}; current evidence is not recorded.`);
    const workTypeMissing = [
      workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED") ? "Acquire and verify exact official-source custody; a source relationship alone is not custody." : null,
      workTypes.includes("OFFICIAL_FORM_MAP_REQUIRED") ? "Complete the exact official-form field map; not_mapped is not an existing map." : null,
      workTypes.includes("LOCAL_VARIATION_REQUIRED") ? "Resolve the explicit non-statewide or locally varying filing configuration." : null,
      workTypes.includes("PRODUCT_WIRING_REQUIRED") ? "Complete exact product wiring without creating runtime or commercial authority." : null,
      workTypes.includes("ARTIFACT_REVIEW_REQUIRED") ? "Complete route-output artifact review; a held source file is not an output artifact." : null,
      workTypes.includes("OUTPUT_LEGAL_APPROVAL_REQUIRED") ? "Obtain completed-output legal approval for this exact family and route scope." : null,
    ];
    family.routes.push({
      routeKey: candidate.routeKey,
      jurisdiction: candidate.jurisdiction,
      trackId: candidate.trackId,
      runtimePathwayId: candidate.runtimePathwayId,
      requiredSourceIds: candidate.requiredSourceIds,
      existingArtifactIds: candidate.existingArtifactIds,
      missingImplementationWork: uniq([...candidate.missingImplementationWork, ...missingDimensionWork, ...workTypeMissing]),
      workTypes,
      deliverable: detail.worklistFacts,
    });
    worklistMap.set(groupKey, family);
  }
  const packetFamilies = [...worklistMap.values()].map((family) => {
    const packetSetIds = uniq(family.packetSetIds);
    return {
      ...family,
      packetSetId: packetSetIds.length === 1 ? packetSetIds[0] : null,
      packetSetIds,
      routeKeys: uniq(family.routeKeys),
      jurisdictions: uniq(family.jurisdictions),
      workTypes: uniq(family.workTypes),
      routes: family.routes.sort((a, b) => a.routeKey.localeCompare(b.routeKey)),
      reusableFamilyDeliverable: mergeWorklistFacts(family.routes.map((route) => route.deliverable)),
    };
  }).sort((a, b) => `${a.worklistGroupId}|${a.implementationStrategy}`.localeCompare(`${b.worklistGroupId}|${b.implementationStrategy}`));

  const workCounts = {
    packetFamilies: packetFamilies.length,
    officialSourceAcquisitionTasks: packetFamilies.filter((family) => family.workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED")).length,
    formMapTasks: packetFamilies.filter((family) => family.workTypes.includes("OFFICIAL_FORM_MAP_REQUIRED")).length,
    composedPleadingTasks: packetFamilies.filter((family) => family.workTypes.includes("COMPOSED_PLEADING")).length,
    localVariationTasks: packetFamilies.filter((family) => family.workTypes.includes("LOCAL_VARIATION_REQUIRED")).length,
    productWiringTasks: packetFamilies.filter((family) => family.workTypes.includes("PRODUCT_WIRING_REQUIRED")).length,
    artifactReviewTasks: packetFamilies.filter((family) => family.workTypes.includes("ARTIFACT_REVIEW_REQUIRED")).length,
    outputApprovalTasks: packetFamilies.filter((family) => family.workTypes.includes("OUTPUT_LEGAL_APPROVAL_REQUIRED")).length,
  };

  const duplicateSemanticIdentities = [];
  const identityGroups = indexBy(entities, (row) => `${row.entityType}:${row.sourceIdentity}`);
  for (const [identity, rows] of identityGroups) {
    if (rows.length > 1) duplicateSemanticIdentities.push({ identity, routeKeys: rows.map((row) => row.routeKey) });
  }
  // These are cardinality signals, not legal conclusions. The crosswalk is the
  // only authority used: prose citations are never split, normalized or
  // grouped to infer that two statutory remedies are the same or different.
  const oneTrackMultipleRuntimeRepresentationSignals = inputs.crosswalk.registryTracks
    .filter((row) => (row.mappedCompiledPathwayIds ?? []).length > 1)
    .map((row) => ({
      jurisdiction: row.jurisdiction,
      trackId: row.registryTrackId,
      relationshipType: row.relationshipType,
      runtimePathwayIds: uniq(row.mappedCompiledPathwayIds),
      interpretation: "crosswalk cardinality signal only; not an alias or duplicate-route conclusion",
    }))
    .sort((a, b) => `${a.jurisdiction}:${a.trackId}`.localeCompare(`${b.jurisdiction}:${b.trackId}`));
  const multipleTracksOneRuntimeCollapseSignals = inputs.crosswalk.compiledPathways
    .filter((row) => (row.mappedRegistryTrackIds ?? []).length > 1)
    .map((row) => ({
      jurisdiction: row.jurisdiction,
      runtimePathwayId: row.compiledPathwayId,
      registryRelation: row.registryRelation,
      mappedTrackIds: uniq(row.mappedRegistryTrackIds),
      interpretation: "crosswalk cardinality signal only; legal review is required before calling this an improper collapse",
    }))
    .sort((a, b) => `${a.jurisdiction}:${a.runtimePathwayId}`.localeCompare(`${b.jurisdiction}:${b.runtimePathwayId}`));
  const legalTracksWithoutRuntime = inputs.crosswalk.registryTracks
    .filter((row) => !(row.mappedCompiledPathwayIds ?? []).length)
    .map((row) => ({
      jurisdiction: row.jurisdiction,
      trackId: row.registryTrackId,
      sourceRouteKey: routeKey("track", row.jurisdiction, row.registryTrackId),
      relationshipType: row.relationshipType,
      compiledCoverageDisposition: row.compiledCoverageDisposition,
    }))
    .sort((a, b) => a.sourceRouteKey.localeCompare(b.sourceRouteKey));
  const runtimeWithoutCurrentLegalDesignTrack = inputs.crosswalk.compiledPathways
    .filter((row) => !trustedPathwayTrackIds(row, inputs.presentationConflicts).length)
    .map((row) => ({
      jurisdiction: row.jurisdiction,
      runtimePathwayId: row.compiledPathwayId,
      sourceRouteKey: routeKey("pathway", row.jurisdiction, row.compiledPathwayId),
      registryRelation: row.registryRelation,
      rawMappedRegistryTrackIds: uniq(row.mappedRegistryTrackIds ?? []),
      currentRelation: isSharedFormOnlyCrosswalkConflict(row)
        ? "REJECTED_SHARED_FORM_ONLY_WITHOUT_SHARED_STATUTORY_CITATION"
        : heldPresentationConflictForPathway(row, inputs.presentationConflicts)
          ? "REJECTED_HELD_PRESENTATION_CONFLATION_PENDING_EXACT_CROSSWALK_AND_COMPILED_PROFILE_REPAIR"
          : "NO_CURRENT_LEGAL_DESIGN_TRACK",
    }))
    .sort((a, b) => a.sourceRouteKey.localeCompare(b.sourceRouteKey));

  const metadata = {
    schemaVersion: "rcap-national-route-obligation-census/v1",
    generatedBy: "scripts/grade-a-route-obligation-census/generate-national-route-obligation-census.mjs",
    sourceFingerprint: inputs.sourceFingerprint,
    asOf: AS_OF,
    createsApproval: false,
    changesRuntime: false,
    productionTouched: false,
    sourceInventoryAvailability: {
      expectedPath: "private/Nationwide Record Clearing/",
      presentInWorktree: fs.existsSync(path.join(ROOT, "private/Nationwide Record Clearing")),
      ingestionStatus: fs.existsSync(path.join(ROOT, "private/Nationwide Record Clearing"))
        ? "AVAILABLE_FOR_RECONCILIATION"
        : "ABSENT_FROM_THIS_WORKTREE_REGISTRIES_USED_AS_CURRENT_REPOSITORY_EVIDENCE",
    },
  };

  const packetSpecificationCoverage = indexes.packetSpecificationRecords.map((spec) => {
    const specificationIdentity = `${spec.sourceFile}#${spec.specificationId ?? spec.packetConfigurationId}`;
    return {
      specificationIdentity,
      jurisdiction: spec.jurisdiction,
      routeKey: spec.routeKey ?? null,
      trackId: spec.trackId ?? null,
      pathwayId: spec.pathwayId ?? null,
      historical: spec.specificationHistorical,
      canonicalObligationKeys: obligationCandidates
        .filter((candidate) => candidate.currentImplementationEvidence.some((item) => item.startsWith(`packet-specification:${specificationIdentity}:`)))
        .map((candidate) => candidate.routeKey),
    };
  }).sort((a, b) => a.specificationIdentity.localeCompare(b.specificationIdentity));

  const canonical = {
    metadata,
    methodology: {
      typedIdentityRule: "Legal tracks, explicit track units, compiled pathways, effective route-contract service branches, effective route-contract failure dispositions, and all current research-track decision routes are preserved as separate typed evidence entities. The two batch-B unattached decisions retain their own subtype. Crosswalk edges and exact current-decision representation joins relate source identities and never license fuzzy deduplication.",
      canonicalObligationRule: "Classification is over terminal obligations once: mapped non-unit track/runtime edges, unmapped non-unit tracks, explicit units in place of their abstract parents, runtime-only pathways, exact contract service branches, failure dispositions, current-decision route stages, and current-decision correction or enforcement branches. A runtime-to-unit-parent edge expands to the units without guessing a unit/pathway assignment. Exact AK ak-set-aside and OH oh-ls-5 research representations map to their existing obligations. Shared-form-only edges without shared statutory citations and held route-presentation conflations are retained as evidence but rejected as canonicalization authority.",
      contractPrecedence: `Last file wins in the runtime import order: ${CONTRACT_FILES.join(" -> ")}`,
      paidSubsetRule: "The 260 intended-paid launch/factory rows are evidence joins only and never define or filter this universe.",
    },
    sourceUniverse: {
      legalTrackKeys: inputs.tracks.map((track) => routeKey("track", track.jurisdiction, track.trackId)).sort(),
      legalTrackUnitKeys: inputs.tracks.flatMap((track) => (track.units ?? []).map((unit) => routeKey("unit", track.jurisdiction, track.trackId, unit.unitId))).sort(),
      runtimePathwayKeys: inputs.crosswalk.compiledPathways.map((pathway) => routeKey("pathway", pathway.jurisdiction, pathway.compiledPathwayId)).sort(),
      serviceBranchKeys: contracts.effective.flatMap(({ contract }) => (contract.serviceBranches ?? []).map((branch) => routeKey("service-branch", contract.routeKey, branch.id))).sort(),
      failureDispositionKeys: contracts.effective.flatMap(({ contract }) => (contract.failureDisposition ?? []).map((disposition) => routeKey("failure-disposition", contract.routeKey, disposition.id))).sort(),
      unattachedDecisionRouteKeys: inputs.unattachedDecisions.rows.map((row) => routeKey("unattached-decision-route", row.jurisdiction, row.trackId)).sort(),
      researchDecisionRouteKeys: inputs.researchTrackDecisions
        .filter((row) => !unattachedDecisionIds.has(`${row.jurisdiction}:${row.trackId}`))
        .map((row) => routeKey("research-decision-route", row.jurisdiction, row.trackId))
        .sort(),
    },
    counts,
    representationEdges: edges,
    routeEntities: entities,
    canonicalObligations,
    sourceToCanonicalMappings,
    packetSpecificationCoverage,
    crosswalkFidelityConflicts,
    decisionFidelityConflicts,
    routeKindAdjudicationFindings,
    runtimeAuthorityDecisionAssociations,
    runtimeAuthorityContractCandidateGaps,
    ownerLegalDecisionEvidence: {
      decisionId: ownerDecision?.queueRecord.id ?? null,
      queueStatus: ownerDecision?.queueRecord.status ?? null,
      queueDecision: ownerDecision?.queueRecord.decision ?? null,
      legalApprovalResult: ownerDecision?.queueRecord.legalApprovalResult ?? null,
      manifestApproved: inputs.counselManifest.ownerLegalDecision?.approved ?? false,
      approvedPacketFamilyIds: uniq(ownerDecision?.approvedFamilies.map((family) => family.familyId) ?? []),
      approvedCandidateRoutes: ownerApprovedCandidateRoutes,
      authorityBoundary: "Completed-output legal approval only; no technical, artifact, visual, runtime, commercial, or Production authority.",
    },
    sourceInventoryAvailability: {
      expectedPath: "private/Nationwide Record Clearing/",
      presentInWorktree: fs.existsSync(path.join(ROOT, "private/Nationwide Record Clearing")),
      ingestionStatus: fs.existsSync(path.join(ROOT, "private/Nationwide Record Clearing"))
        ? "AVAILABLE_FOR_RECONCILIATION"
        : "ABSENT_FROM_THIS_WORKTREE_REGISTRIES_USED_AS_CURRENT_REPOSITORY_EVIDENCE",
    },
    unattachedDecisionFindings: inputs.unattachedDecisions.rows.map((row) => ({
      trackId: row.trackId,
      jurisdiction: row.jurisdiction,
      statute: row.statute,
      status: row.status,
      reportSaysNow: row.reportSaysNow,
      reportSaysLater: row.reportSaysLater ?? null,
      mechanismWhenItArrives: row.mechanismWhenItArrives,
      registryRuntimeIntegrationStatus: "No approved registry track or compiled pathway identity exists; the census classifies the exact decision route but creates neither authority identity.",
    })),
    researchDecisionFindings: inputs.researchTrackDecisions.map((row) => {
      const merge = RESEARCH_DECISION_EXACT_REPRESENTATION_MERGES.get(`${row.jurisdiction}:${row.trackId}`);
      const sourceKind = unattachedDecisionIds.has(`${row.jurisdiction}:${row.trackId}`) ? "unattached-decision-route" : "research-decision-route";
      const sourceKey = routeKey(sourceKind, row.jurisdiction, row.trackId);
      return {
        trackId: row.trackId,
        jurisdiction: row.jurisdiction,
        sourceFile: row.sourceFile,
        productDispositionSha256: row.productDisposition?.sha256 ?? null,
        inApprovedRegistry: merge?.trackId != null,
        hasExactCompiledRuntimeIdentity: merge?.runtimePathwayId != null,
        representationStatus: merge ? "EXACT_EXISTING_REPRESENTATION_MERGED" : "DECISION_ONLY_SOURCE_NOT_IN_APPROVED_REGISTRY_OR_RUNTIME",
        canonicalObligationKeys: sourceToCanonicalMappings.find((mapping) => mapping.sourceRouteKey === sourceKey)?.canonicalObligationKeys ?? [],
      };
    }),
  };

  const candidateOutput = { metadata, counts, routes: obligationCandidates };
  const worklist = { metadata, counts: workCounts, allowedWorkTypes: WORK_TYPES, deliverableFields: DELIVERABLE_FIELDS, packetFamilies };
  const reviewQueue = {
    metadata,
    count: counts.needsLegalReview,
    routes: obligationCandidates.filter((row) => row.possibleCategory === "NEEDS_LEGAL_REVIEW").map((row) => ({
      routeKey: row.routeKey,
      jurisdiction: row.jurisdiction,
      publicLabel: row.publicLabel,
      legalReviewQuestion: row.legalReviewQuestion,
      classificationConfidence: row.classificationConfidence,
      currentImplementationEvidence: row.currentImplementationEvidence,
    })),
  };
  const duplicateReport = {
    metadata,
    counts: {
      duplicateRouteKeys: 0,
      explicitAliases: inputs.aliases.aliases.length,
      pendingAliasInstructions: pendingAliasInstructions.length,
      supersededRouteContracts: contracts.superseded.length,
      supersededRuntimeTextRows: supersededRuntimeTextRows.length,
      totalSupersessionFindings: contracts.superseded.length + supersededRuntimeTextRows.length,
      oneTrackMultipleRuntimeRepresentationSignals: oneTrackMultipleRuntimeRepresentationSignals.length,
      multipleTracksOneRuntimeCollapseSignals: multipleTracksOneRuntimeCollapseSignals.length,
      mergedServiceFailureSelectorSignals: mergedServiceFailureSelectorSignals.length,
      mergedTrackServiceBranchSignals: mergedTrackServiceBranchSignals.length,
      mergedDecisionFailureSignals: mergedDecisionFailureSignals.length,
      mergedResearchRepresentationSignals: mergedResearchRepresentationSignals.length,
      crosswalkFidelityConflicts: counts.totalCrosswalkFidelityConflicts,
      decisionFidelityConflicts: decisionFidelityConflicts.length,
      routeKindAdjudications: routeKindAdjudicationFindings.length,
      pendingRouteKindAdjudications: routeKindAdjudicationFindings.filter((row) => row.status === "pending").length,
      heldRoutePresentationConflicts: inputs.presentationConflicts.rows.filter((row) => row.status === "held").length,
      hiddenParticipantBranches: counts.hiddenParticipantFilingBranches,
      legalTracksWithoutRuntime: legalTracksWithoutRuntime.length,
      runtimeWithoutCurrentLegalDesignTrack: runtimeWithoutCurrentLegalDesignTrack.length,
      runtimeAuthorityDecisions: inputs.runtimeAuthority.decisions.length,
      runtimeAuthorityContractAssociations: runtimeAuthorityDecisionAssociations.length,
      runtimeAuthorityContractsWithoutCandidate: runtimeAuthorityContractCandidateGaps.length,
      runtimeAuthorityRouteKeyRegistryGaps: runtimeAuthorityDecisionAssociations.filter((row) => row.associationStatus === "DECISION_ID_RESOLVES_AUTHORITY_ROUTE_KEY_REGISTRY_GAP").length,
      ownerApprovedCandidateRoutes: ownerApprovedCandidateRoutes.length,
      ownerApprovedPacketFamilyIds: uniq(ownerApprovedCandidateRoutes.map((row) => row.packetFamilyId)).length,
    },
    explicitAliases: inputs.aliases.aliases,
    pendingAliasInstructions,
    revalidationsThatAreNotAliases: inputs.aliases.revalidations,
    supersededRouteContracts: contracts.superseded,
    supersededRuntimeTextRows: supersededRuntimeTextRows.map((row) => ({
      jurisdiction: row.jurisdiction,
      trackId: row.registryTrackId,
      compiledCoverageDisposition: row.compiledCoverageDisposition,
      mappedCompiledPathwayIds: row.mappedCompiledPathwayIds,
    })),
    duplicateSemanticIdentities,
    oneTrackMultipleRuntimeRepresentationSignals,
    multipleTracksOneRuntimeCollapseSignals,
    hiddenParticipantBranches: canonicalObligations.filter((row) => row.hiddenParticipantBranch).map((row) => ({ routeKey: row.routeKey, sourceEntityKeys: row.sourceEntityKeys, obligationKind: row.obligationKind })),
    representationEdgesAreNotAliases: edges,
    legalTracksWithoutRuntime,
    runtimeWithoutCurrentLegalDesignTrack,
    mergedServiceFailureSelectorSignals,
    mergedTrackServiceBranchSignals,
    mergedDecisionFailureSignals,
    mergedResearchRepresentationSignals,
    crosswalkFidelityConflicts: canonical.crosswalkFidelityConflicts,
    decisionFidelityConflicts,
    routeKindAdjudicationFindings,
    runtimeAuthorityDecisionAssociations,
    runtimeAuthorityContractCandidateGaps,
    ownerLegalDecisionEvidence: canonical.ownerLegalDecisionEvidence,
    heldRoutePresentationConflicts: inputs.presentationConflicts.rows.filter((row) => row.status === "held"),
  };
  const jurisdictions = uniq(inputs.tracks.map((track) => track.jurisdiction)).map((jurisdiction) => {
    const jurisdictionEntities = entities.filter((row) => row.jurisdiction === jurisdiction);
    const jurisdictionCandidates = obligationCandidates.filter((row) => row.jurisdiction === jurisdiction);
    return {
      jurisdiction,
      legalTracks: inputs.tracks.filter((track) => track.jurisdiction === jurisdiction).length,
      legalTrackUnits: jurisdictionEntities.filter((row) => row.entityType === "legal_track_unit").length,
      runtimeRoutes: jurisdictionEntities.filter((row) => row.entityType === "runtime_pathway").length,
      serviceBranches: jurisdictionEntities.filter((row) => row.entityType === "service_branch").length,
      failureDispositions: jurisdictionEntities.filter((row) => row.entityType === "failure_disposition").length,
      unattachedDecisionRoutes: jurisdictionEntities.filter((row) => row.entityType === "unattached_decision_route").length,
      researchDecisionRoutes: jurisdictionEntities.filter((row) => row.entityType === "research_decision_route").length,
      participantActionBranches: jurisdictionCandidates.filter((row) => row.participantCanInitiate === true).length,
      possibleCategoryA: jurisdictionCandidates.filter((row) => row.possibleCategory === "A_MUST_FULFILL").length,
      possibleCategoryB: jurisdictionCandidates.filter((row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION").length,
      needsLegalReview: jurisdictionCandidates.filter((row) => row.possibleCategory === "NEEDS_LEGAL_REVIEW").length,
    };
  });
  const summary = { metadata, counts: { ...counts, ...workCounts }, jurisdictions };

  const censusDoc = `# National Route Obligation Census\n\n` +
    `Evidence date: ${AS_OF}. Source fingerprint: \`${inputs.sourceFingerprint}\`.\n\n` +
    `Source-inventory limitation: \`private/Nationwide Record Clearing/\` is absent from this exact worktree. This run therefore uses the current repository registries, ledgers, compiled profiles, contracts, packet specifications, and legal-decision records as its source evidence and does not claim direct Nationwide-folder ingestion. The Captain request requires an exact reconciliation when that inventory is attached.\n\n` +
    `This is a mechanical census, not a legal decision, runtime change, packet approval, commercial opening, or Production change. It preserves ${counts.totalStatutoryLegalTracks} approved legal-design tracks, ${counts.totalLegalTrackUnits} explicit track units, ${counts.totalRuntimeRoutes} compiled pathways, ${counts.totalEffectiveServiceBranches} effective contract service branches, ${counts.totalEffectiveFailureDispositions} effective contract failure dispositions, and all ${counts.totalCurrentDecisionRoutes} current research-track decisions (${counts.totalUnattachedDecisionRoutes} batch-B unattached plus ${counts.totalResearchDecisionRoutes} other research-decision sources) as separate typed identities. The 260 intended-paid rows are evidence joins only.\n\n` +
    `## Candidate totals\n\n` +
    `- Jurisdictions: ${counts.totalJurisdictions}\n` +
    `- Typed source entities: ${counts.totalTypedSourceEntities}\n` +
    `- Canonical terminal obligations: ${counts.totalCanonicalObligations}\n` +
    `- Participant-action branches: ${counts.totalDistinctParticipantActionBranches}\n` +
    `- Possible Category A: ${counts.possibleCategoryA}\n` +
    `- Possible Category B: ${counts.possibleCategoryB}\n` +
    `- Needs legal review: ${counts.needsLegalReview}\n` +
    `- Hidden participant-filing branches: ${counts.hiddenParticipantFilingBranches}\n` +
    `- Rejected crosswalk fidelity conflicts: ${counts.totalCrosswalkFidelityConflicts}\n` +
    `- Post-crosswalk legal-decision fidelity conflicts: ${counts.totalDecisionFidelityConflicts}\n` +
    `- Route-kind adjudications preserved: ${counts.totalRouteKindAdjudications} (${counts.pendingRouteKindAdjudications} pending; ${counts.appliedRouteKindAdjudications} applied)\n` +
    `- Runtime authority decisions: ${counts.totalRuntimeAuthorityDecisions}; effective contract associations: ${counts.totalRuntimeAuthorityContractAssociations}; exact route-key registry gaps: ${counts.runtimeAuthorityRouteKeyRegistryGaps}; effective contracts without an exact canonical candidate association: ${counts.runtimeAuthorityContractsWithoutCandidate}\n` +
    `- Decision-owner completed-output approval: ${counts.ownerApprovedCandidateRoutes} exact candidate associations across ${counts.ownerApprovedPacketFamilyIds} packet-family identities\n` +
    `- Registered explicit aliases: ${counts.duplicateAliases}; pending contract alias instructions: ${counts.pendingAliasInstructions}\n` +
    `- Supersession findings: ${counts.supersededRoutes} (${counts.supersededContractReplacements} contract replacements; ${counts.supersededRuntimeTextRows} superseded-runtime-text row)\n\n` +
    `## Finalization delta\n\n` +
    `After the provisional 452 Category A / 157 Category B / 85 legal-review / 353 family checkpoint, the already-running exact-mechanism review changed one existing row without adding, removing, splitting, or merging an obligation. Exact source IDs: \`track:LA:la-985-3-immediate-expungement\` and \`route-contract:LA:immediate-expungement-after-successful-court-program-completion-art-985-3:NATIONAL-2026-08-28-B-LA-03:participant_packet\`. Before route key: \`obligation:track-pathway:LA:la-985-3-immediate-expungement:immediate-expungement-after-successful-court-program-completion-art-985-3\` (possible Category A / custom pleading). After route key: \`obligation:track-pathway:LA:la-985-3-immediate-expungement:immediate-expungement-after-successful-court-program-completion-art-985-3\` (needs legal review because the approved track says process guidance while the effective contract says participant packet). Net movement: Category A -1, legal review +1, reusable family/strategy groups -1; all other provisional counts are unchanged.\n\n` +
    `## Interpretation\n\n` +
    `Category A means the evidence shows a participant-facing filing obligation. Missing sources, maps, artifacts, fees, local rules, tests, or technical review remain implementation work and never justify Category B. Category B is used only with the six enumerated reasons. Ambiguous or mixed evidence is queued with one narrow legal question. Generic participant-action arrays are not classification proof.\n\n` +
    `The canonical file contains explicit representation edges and source-to-obligation mappings. Those edges explain track/runtime overlap; they do not collapse remedies or create aliases. The exact AK ak-set-aside and OH oh-ls-5 research records join their already-existing compiled or registry/runtime obligations while retaining distinct typed source identities. The shared-form-only South Carolina juvenile edge and held Georgia § 35-3-37(m) → § 42-8-62.1 presentation edge remain raw crosswalk evidence but are rejected as canonicalization authority, preserving their distinct terminal obligations. All ${counts.totalRouteKindAdjudications} route-kind adjudication records remain fidelity evidence; the ${counts.pendingRouteKindAdjudications} pending rows create product-wiring and participant-presentation work, not legal or commercial authority. The 67-record runtime authority registry is fingerprinted and joined to every effective contract; ${counts.runtimeAuthorityRouteKeyRegistryGaps} contract identities resolve by decision ID but remain explicit authority-route-key registry gaps rather than inferred aliases. The ${counts.pendingCensusPacketFamilies} 'census-pending-family:' identities are deterministic, census-local placeholders for exact official-form runtime contracts that have a packet-family label but no shared family, packet-set, or form identity; they grant no runtime, approval, or commercial authority and remain source, mapping, and wiring work. Two later legal-decision conflicts separately flag New York's overbroad § 160.50/§ 160.55 compiled scope and Oregon's superseded 1(c)-to-acquittal packet-scope inference. West Virginia's pardon-expungement petition and Rhode Island's decriminalized-offense petition remain Category A under their exact approved filing tracks; guidance/referral service records do not erase participant filings merely because effect or authority work remains. Kentucky's juvenile petition/automatic pairing, Montana's CRISS automatic/correction pairing, New Mexico's automatic-cannabis/AOC-application pairing, and Rhode Island deferred-sentence stage 3 remain review questions until exact branch identities resolve their mixed stages. The North Dakota juvenile, Nebraska pardon, Nebraska postconviction, and Utah § 402 routing rows likewise remain review questions because their sources identify participant instruments while their approved treatments still route or exclude by scope. South Carolina PTI remains review because the approved track requires a participant-signed solicitor application while the effective route contract retires the pleading and records guidance status; missing circuit intake configuration cannot itself authorize Category B. Minnesota's combined automatic-cannabis/Board-review pathway remains a review question: its null-authority, null-decision-date commercial reclassification proposal is recorded as contradiction evidence and is not adopted. Express later-operative treatments in Illinois, Louisiana, New York, and Oklahoma remain Category B / FUTURE_EFFECTIVE on the census date; the census does not turn a future or conditionally unavailable procedure into a filing. The ${counts.totalTypedSourceEntities} typed source entities reduce mechanically to ${counts.totalCanonicalObligations} terminal obligations without dropping any source identity. Route-contract precedence follows the runtime import order and separately records ${contracts.superseded.length} overwritten contracts and ${supersededRuntimeTextRows.length} crosswalk row with superseded runtime text. Runtime service disposition and Grade-A commercial disposition remain separate evidence strings.\n\n` +
    `## Build worklist\n\n` +
    `The worklist groups ${counts.possibleCategoryA} Category A terminal obligations into ${workCounts.packetFamilies} reusable family/strategy groups. Work-type totals count unique reusable family/strategy groups carrying that work type, not route associations. The controlling ${OWNER_COMPLETED_OUTPUT_DECISION_ID} record closes completed-output legal approval only for the ${counts.ownerApprovedCandidateRoutes} exact family/track associations in scope, even where a stale family field still says pending; all out-of-scope treatments retain legal-approval work. Artifact review remains required for all ${workCounts.artifactReviewTasks} groups because that decision waives no technical, deterministic, visual, runtime, or commercial gate. Every route entry carries all ${DELIVERABLE_FIELDS.length} required deliverable, filing, service, timing, and hearing dimensions. An absent fact is written as \`not recorded\` and paired with implementation work; absence creates no approval.\n`;

  const captainDoc = `# Captain Integration Request\n\n` +
    `No shared ledger, registry, compiled profile, runtime, package file, migration, workflow, or Production configuration was modified.\n\n` +
    `## Requested follow-up patches\n\n` +
    `1. Review the ${counts.needsLegalReview} narrow questions in \`unresolved-legal-review-queue.json\`; adopt decisions only through the controlling legal-decision process.\n` +
    `2. Reconcile the exact sorted identities in 'duplicate-and-alias-report.json#/legalTracksWithoutRuntime' (${duplicateReport.counts.legalTracksWithoutRuntime}) and '#/runtimeWithoutCurrentLegalDesignTrack' (${duplicateReport.counts.runtimeWithoutCurrentLegalDesignTrack}). Patch 'data/rcap-ledger/track-pathway-crosswalk.json' and the named compiled profiles/registries only through their controlling processes; do not treat either absence as approval.\n` +
    `3. Schedule the worklist's ${workCounts.officialSourceAcquisitionTasks} source-acquisition, ${workCounts.formMapTasks} form-map, ${workCounts.composedPleadingTasks} composed-pleading, ${workCounts.localVariationTasks} local-variation, ${workCounts.productWiringTasks} wiring, ${workCounts.artifactReviewTasks} artifact-review, and ${workCounts.outputApprovalTasks} output-approval family tasks.\n` +
    `4. Preserve the exact hidden participant branches identified by the current decisions: North Dakota's pre-effective petition and two day-62 corrections; South Dakota's written request and enforcement motion after mandatory sealing; South Carolina's two summary-court enforcement steps; New York's court and DCJS correction requests; Alabama's de novo review after agency denial; and Colorado's agency-finding request and 90-day fallback petition.\n` +
    `5. Through the controlling approval processes, separately integrate the seven decision-only IDs \`ak-cannabis-seal\`, \`ak-correct-record\`, \`al-olr\`, \`al-uncharged-arrest\`, \`ca-1203-4b\`, \`co_mistaken_identity_expungement\`, and \`ny_160_55_violation\` into the approved registry and exact compiled profiles. Do not mint duplicate routes for \`ak-set-aside\` or \`oh-ls-5\`; their current research records already match the exact compiled AK AS 12.55.085(e) obligation and exact OH R.C. 2953.321 registry/runtime obligation recorded in the representation-merge signals. This census creates no authority.\n` +
    `6. In \`data/rcap-ledger/track-pathway-crosswalk.json\`, remove or re-adjudicate the \`SC:juvenile-expungement\` → \`sc_17_22_950_summary\` edge. Its only evidence is a shared form and it has no shared statutory citation; the proposed patch must preserve juvenile expungement as a distinct remedy without inheriting the adult summary-court destination, packet set, or SCCA 223E.\n` +
    `7. Narrow or split the New York compiled/runtime identity \`automatic-non-conviction-sealing-under-cpl-160-50-160-55\`: retain the exact \`ny_160_50_nonconviction\` representation only for § 160.50 and govern the separately accounted § 160.55 branches through their current decision record.\n` +
    `8. Apply the Lawrence decisions \`LWD-2026-08-29-OR-SUBSECTION\` and \`LWD-2026-08-29-OR-PACKET-SCOPE\`: replace the broad Oregon 1(c)-to-acquittal mapping with stable disposition-bound route and packet-configuration identities (1(c)/Option 3 for never charged; separate 1(d)/Option 2 treatments for acquittal and ordinary dismissal).\n` +
    `9. Reconcile \`WV:pardon-based-expungement\` in the exact runtime contract/profile without erasing the approved \`wv_pardon_expungement\` participant petition. The contract's \`guidance_status\` narrows the statutory-effect message and current service posture; the exact track still requires a custom pleading, service, publication, and hearing.\n` +
    `10. Split or re-adjudicate the mixed-stage mappings for \`KY:juvenile-automatic-dismissal\`, \`MT:non-conviction-criminal-history-removal-through-criss\`, \`NM:cannabis-expungement\`, and Rhode Island deferred-sentence stage 3. Preserve the exact AOC-JV-30 petition, CRISS correction/removal request, New Mexico AOC cannabis application, and Rhode Island filing/hearing/certified-copy duties instead of allowing an automatic or court-controlled parent treatment to hide participant action.\n` +
    `11. Reconcile \`RI:path-g-decriminalized-offense-expungement\` with approved track \`ri_decriminalized\`. Missing offense-specific authority/source work must remain Category A implementation work for the exact official-form filing and cannot become a referral-based Category B exclusion.\n` +
    `12. Re-adjudicate the routing-only treatments for \`ND:nd-juvenile-records-routing\`, \`NE:ne-pardon-routing\`, \`NE:ne-postconviction-routing\`, and \`UT:ut_adj_reduction_402\`. Their exact sources identify participant motions or applications; split the participant branch or adopt a professional-only disposition through the controlling decision process instead of treating product scope as Category B authority.\n` +
    `13. Split \`MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06\` into exact automatic and Board-review identities before reclassifying its service or commercial state. The current proposed reclassification has null authority and decision date; this census preserves it only as unresolved contradiction evidence.\n` +
    `14. Reconcile \`SC:diversion-or-program-completion-expungement\` with approved track \`sc_pti_17_22_150\`. The participant-signed circuit-solicitor application remains a filing obligation unless the controlling process expressly adopts a prosecutor-controlled no-filing decision; a retired pleading and missing local intake configuration do not supply that authority.\n` +
    `15. Attach and reconcile \`private/Nationwide Record Clearing/\` against all ${counts.totalTypedSourceEntities} typed sources and ${counts.totalCanonicalObligations} canonical obligations. That inventory is absent from this worktree, so this census does not claim direct Nationwide ingestion and does not use the absence to drop or approve a route.\n` +
    `16. Quarantine the held \`GA:ga-seal-m\` → \`GA:youthful-first-offender-restriction-route\` crosswalk edge. In \`data/rcap-ledger/track-pathway-crosswalk.json\`, remove the § 35-3-37(m) representation from the § 42-8-62.1 contract route; in \`src/lib/rcap-engine/compiled/profiles/GA-georgia.json\`, replace the whole-chapter prose with route-scoped § 42-8-62.1 text and separately preserve the other Georgia mechanisms. Re-run the participant presentation proof before releasing the dedicated hold.\n` +
    `17. Resolve the ${counts.pendingRouteKindAdjudications} pending rows in \`data/rcap-ledger/route-kind-adjudications.json\` through route-specific evaluator runs. Each affected canonical association carries exact contract/evaluator evidence and PRODUCT_WIRING_REQUIRED; verify the named packet presentation and preserve every independent commercial gate.\n` +
    `18. Register or expressly reject the pending Mississippi alias instruction from \`src/lib/legal-authority/routes/mississippi.json\`: \`MS:uncharged-or-unprosecuted-misdemeanor-after-12-months\` → \`MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59\`. The structured alias registry currently contains zero aliases; this census reports the instruction and does not adopt it.\n` +
    `19. Replace the ${counts.pendingCensusPacketFamilies} deterministic 'census-pending-family:' placeholders with exact approved shared packet-family or packet-set identities after acquiring each official source, completing its form map, and wiring the route. These census-local identities reflect exact contract packet labels and packet modes only; they create no shared-family, runtime, approval, or commercial authority.\n` +
    `20. Patch the exact ${counts.runtimeAuthorityRouteKeyRegistryGaps} rows identified in 'duplicate-and-alias-report.json#/runtimeAuthorityDecisionAssociations' whose decision IDs resolve but whose current authority decision routeKeys omit the effective split contract identity. Update 'src/lib/legal-authority/authority.json' only through its controlling process; do not infer an alias or change the contract outcome from the shared decision ID.\n` +
    `21. Resolve the exact ${counts.runtimeAuthorityContractsWithoutCandidate} effective-contract gaps in 'duplicate-and-alias-report.json#/runtimeAuthorityContractCandidateGaps'. Each decision ID resolves, and its compiled pathway is source-accounted, but no canonical candidate carries that exact contract identity. Patch the shared contract/pathway-to-candidate association rather than attaching the decision to a sibling contract or treating the gap as approval.\n` +
    `22. Materialize stable shared route identities for the exact mixed cohorts now enumerated mechanically by the census: Delaware § 1017 mandatory favorable termination, § 1017A automatic, § 1017A failed-automatic correction, and § 1018 discretionary petition; Maine automatic Class D/E/civil matters versus the three-year serious/OUI petition; Utah juvenile automatic, favorable-outcome, and ordinary-petition branches; and Washington immediate automatic acquittal/dismissal, scheduled automatic administrative-hearing, and participant-motion branches. Patch the affected compiled profiles, crosswalk, contracts, and registry only through their controlling processes; the census branch keys themselves grant no shared runtime authority.\n` +
    `23. Resolve the exact approved-track versus effective-contract filing-mechanism conflicts for LA 'la-985-3-immediate-expungement', MD 'md_10103_legacy_police', NV 'nv_seal_deferred', PA 'pa_ard_expungement', and RI 'ri_filed_complaints'; split distinct cohorts when authority proves them, otherwise adopt one narrow controlling decision. Preserve NH 'nh_auto_vacated' as the post-2019 automatic/no-filing treatment and the separate 'nh_petition_vacated' track as the participant petition.\n` +
    `24. Preserve ${OWNER_COMPLETED_OUTPUT_DECISION_ID} as the controlling completed-output legal approval for the exact covered family/track scope. Do not reopen that legal gate from stale per-family pending fields, and do not use the decision to waive artifact, technical, visual, runtime, commercial, or Production gates.\n` +
    `25. Run the census verifier before integrating any regenerated artifacts. This request creates no fulfillment record and changes no commercial state.\n`;

  return {
    inputs,
    counts: { ...counts, ...workCounts },
    json: {
      "canonical-route-universe.json": canonical,
      "route-obligation-candidate.json": candidateOutput,
      "packet-family-build-worklist.json": worklist,
      "unresolved-legal-review-queue.json": reviewQueue,
      "duplicate-and-alias-report.json": duplicateReport,
      "jurisdiction-summary.json": summary,
    },
    docs: {
      "NATIONAL_ROUTE_OBLIGATION_CENSUS.md": censusDoc,
      "CAPTAIN_INTEGRATION_REQUEST.md": captainDoc,
    },
  };
}

export function renderedOutputs() {
  const built = buildOutputs();
  const files = new Map();
  for (const [name, value] of Object.entries(built.json)) files.set(path.join(DATA_DIR, name), stableJson(value));
  for (const [name, value] of Object.entries(built.docs)) files.set(path.join(DOCS_DIR, name), value.endsWith("\n") ? value : `${value}\n`);
  return { built, files };
}

function main() {
  const check = process.argv.slice(2).includes("--check");
  const { built, files } = renderedOutputs();
  const failures = [];
  if (check) {
    for (const [file, expected] of files) {
      if (!fs.existsSync(file)) failures.push(`missing generated output: ${path.relative(ROOT, file)}`);
      else if (fs.readFileSync(file, "utf8") !== expected) failures.push(`stale generated output: ${path.relative(ROOT, file)}`);
    }
    if (failures.length) {
      console.error(failures.join("\n"));
      process.exitCode = 1;
      return;
    }
    console.log(`PASS national route obligation census generation check (${files.size} outputs; ${built.counts.totalTypedSourceEntities} typed sources; ${built.counts.totalCanonicalObligations} terminal obligations)`);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  for (const [file, contents] of files) fs.writeFileSync(file, contents);
  console.log(`WROTE national route obligation census (${files.size} outputs; ${built.counts.totalTypedSourceEntities} typed sources; ${built.counts.totalCanonicalObligations} terminal obligations)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) main();
