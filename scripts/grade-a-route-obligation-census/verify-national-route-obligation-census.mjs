#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildOutputs,
  renderedOutputs,
} from "./generate-national-route-obligation-census.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), "../..");
const DATA_DIR = path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate");
const DOCS_DIR = path.join(ROOT, "docs/rcap/grade-a/route-obligation-census");

const INDEPENDENT_CONTRACT_FILES = [
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

const INDEPENDENT_FIXED_INPUT_FILES = [
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
  ...INDEPENDENT_CONTRACT_FILES,
];

const JSON_FILES = {
  canonical: "canonical-route-universe.json",
  candidates: "route-obligation-candidate.json",
  worklist: "packet-family-build-worklist.json",
  reviewQueue: "unresolved-legal-review-queue.json",
  duplicateReport: "duplicate-and-alias-report.json",
  summary: "jurisdiction-summary.json",
};

const REQUIRED_CANDIDATE_FIELDS = [
  "routeKey",
  "jurisdiction",
  "publicLabel",
  "statuteOrAuthority",
  "trackId",
  "runtimePathwayId",
  "routeContractId",
  "processActor",
  "participantCanInitiate",
  "participantFacingInstrument",
  "destination",
  "currentOutputStrategy",
  "packetFamilyId",
  "packetSetId",
  "requiredSourceIds",
  "existingArtifactIds",
  "currentServiceDisposition",
  "currentCommercialState",
  "legalDecisionRecordIds",
  "currentImplementationEvidence",
  "missingImplementationWork",
  "possibleCategory",
  "possibleCategoryBReason",
  "classificationConfidence",
  "requiresLegalReview",
  "legalReviewQuestion",
];

const CATEGORY_VALUES = [
  "A_MUST_FULFILL",
  "B_LEGITIMATE_EXCLUSION",
  "NEEDS_LEGAL_REVIEW",
];

const CATEGORY_B_REASONS = [
  "AUTOMATIC",
  "AGENCY_CONTROLLED",
  "PROSECUTOR_CONTROLLED",
  "COURT_INITIATED",
  "FUTURE_EFFECTIVE",
  "UNSUITABLE_FOR_SELF_HELP",
];

const EXPECTED_RUNTIME_CONTRACT_COHORTS = [
  {
    contractRouteKey: "DE:juvenile-expungement-under-10-del-c-1017-1019-1017a",
    jurisdiction: "DE",
    pathwayId: "juvenile-expungement-under-10-del-c-1017-1019-1017a",
    sourceNeedles: ["§ 1017 favorable-termination matters are mandatory", "§ 1017A eligible records run through the automatic program", "petition or correction path", "discretionary § 1018 branch"],
    branches: [
      ["section_1017_favorable_termination_mandatory", "NEEDS_LEGAL_REVIEW", null, null],
      ["section_1017a_automatic_program", "B_LEGITIMATE_EXCLUSION", "AUTOMATIC", false],
      ["section_1017a_automatic_failure_correction", "A_MUST_FULFILL", null, true],
      ["section_1018_discretionary_petition", "A_MUST_FULFILL", null, true],
    ],
  },
  {
    contractRouteKey: "ME:juvenile-sealing",
    jurisdiction: "ME",
    pathwayId: "juvenile-sealing",
    sourceNeedles: ["Class D, Class E and civil-type juvenile matters enter the automatic branch", "three-year petition branch"],
    branches: [
      ["class_d_e_civil_automatic", "B_LEGITIMATE_EXCLUSION", "AUTOMATIC", false],
      ["serious_or_oui_three_year_petition", "A_MUST_FULFILL", null, true],
    ],
  },
  {
    contractRouteKey: "UT:path-m-juvenile-expungement",
    jurisdiction: "UT",
    pathwayId: "path-m-juvenile-expungement",
    sourceNeedles: ["Separate automatic and favourable-outcome branches", "ordinary petition branch"],
    branches: [
      ["automatic_branch", "B_LEGITIMATE_EXCLUSION", "AUTOMATIC", false],
      ["favorable_outcome_branch", "NEEDS_LEGAL_REVIEW", null, null],
      ["ordinary_petition_branch", "A_MUST_FULFILL", null, true],
    ],
  },
  {
    contractRouteKey: "WA:juvenile-record-sealing-under-rcw-13-50-260",
    jurisdiction: "WA",
    pathwayId: "juvenile-record-sealing-under-rcw-13-50-260",
    sourceNeedles: ["acquittal or dismissal with prejudice is sealed with no elapsed wait", "automatic administrative-hearing process", "participant motion branch"],
    branches: [
      ["acquittal_or_dismissal_immediate_automatic", "B_LEGITIMATE_EXCLUSION", "AUTOMATIC", false],
      ["scheduled_administrative_hearing_automatic", "B_LEGITIMATE_EXCLUSION", "AUTOMATIC", false],
      ["participant_motion_branch", "A_MUST_FULFILL", null, true],
    ],
  },
];

const EXPECTED_TRACK_CONTRACT_MECHANISM_REVIEWS = [
  ["LA", "la-985-3-immediate-expungement", "immediate-expungement-after-successful-court-program-completion-art-985-3"],
  ["MD", "md_10103_legacy_police", "police-record-expungement-when-no-charge-was-filed-under-10-103"],
  ["NV", "nv_seal_deferred", "deferred-judgment-dismissal-and-sealing-under-nrs-176-211"],
  ["PA", "pa_ard_expungement", "path-d-ard-expungement"],
  ["RI", "ri_filed_complaints", "path-e-filed-complaint-relief-under-12-10-12"],
];

const WORK_TYPES = [
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

const DELIVERABLE_FIELDS = [
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

const ENTITY_TYPES = {
  legal_track: { universeKey: "legalTrackKeys", label: "approved legal track" },
  legal_track_unit: { universeKey: "legalTrackUnitKeys", label: "explicit unit" },
  runtime_pathway: { universeKey: "runtimePathwayKeys", label: "compiled pathway" },
  service_branch: { universeKey: "serviceBranchKeys", label: "service branch" },
  failure_disposition: { universeKey: "failureDispositionKeys", label: "failure disposition" },
  unattached_decision_route: { universeKey: "unattachedDecisionRouteKeys", label: "unattached decision route" },
  research_decision_route: { universeKey: "researchDecisionRouteKeys", label: "research decision route" },
};

const OUTPUT_STRATEGIES = [
  "official_pdf_fill",
  "custom_pleading",
  "composed_pleading",
  "participant_agency_application",
  "process_guidance",
];

const sorted = (values) => [...values].map(String).sort();
const unique = (values) => [...new Set(values)];
const sameSet = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const stable = (value) => JSON.stringify(value);

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function exactArray(label, actual, expected, failures) {
  if (!sameSet(actual, expected)) failures.push(`${label} set mismatch: expected ${unique(expected).length}, received ${unique(actual).length}`);
}

function outputMetadata(context) {
  return [
    ["canonical", context.canonical],
    ["candidate", context.candidates],
    ["worklist", context.worklist],
    ["review queue", context.reviewQueue],
    ["duplicate report", context.duplicateReport],
    ["jurisdiction summary", context.summary],
  ];
}

function findProhibitedAuthorityFlags(value, location = "candidate", found = []) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item, index) => findProhibitedAuthorityFlags(item, `${location}[${index}]`, found));
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    if (["approvedForLive", "runtimeEnabled", "commerciallyDeliverable", "paymentAllowed", "checkoutEnabled"].includes(key) && child === true) {
      found.push(`${location}.${key}`);
    }
    findProhibitedAuthorityFlags(child, `${location}.${key}`, found);
  }
  return found;
}

function countBy(routes, predicate) {
  return routes.filter(predicate).length;
}

function flattenStrings(value, seen = new Set()) {
  if (value == null) return [];
  if (["string", "number", "boolean"].includes(typeof value)) return [String(value)];
  if (typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) return value.flatMap((item) => flattenStrings(item, seen));
  return Object.values(value).flatMap((item) => flattenStrings(item, seen));
}

function recordedUnknownSentinel(value) {
  const text = String(value ?? "").toLowerCase();
  return /\b(?:remains? unresolved|remains? open|unresolved|unknown|open question|none (?:identified|recorded|stated|specified|established)|not recorded|not specified|not stated|not identified|not addressed|not established|not verified|not source-approved|unverified|unconfirmed(?: until verified at build time)?|(?:was|were|is|are) not resolved|(?:has|have|had) not been (?:confirmed|verified|recorded|stated|established)|does not (?:address|state|identify|confirm|specify|record|provide)|not provided|not available|not confirmed|has not been read|not yet (?:known|confirmed|recorded)|to be (?:confirmed|determined)|requires? confirmation|must be confirmed|could not be retrieved|verify [^.\n]* live at intake|participant confirms? (?:the )?amount|tbd|no [^.\n]*(?:source|fee)[^.\n]*(?:was|is|has been) (?:found|located|identified|established|approved)|no [^.\n]*(?:is|are|was|were|has been|have been) (?:found|identified|established|verified|stated|recorded|confirmed)|no fee identified|(?:source review )?identifies no|not verified [^.\n]* specifically|no confirmed [^.\n]* exists)\b/i.test(text);
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

function independentAttachmentActionClauses(action) {
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
}

function explicitAttachmentActionEvidence(action) {
  return independentAttachmentActionClauses(action).length > 0;
}

function independentUnitAssociatedComponents(unit, packetSet, strategy) {
  const description = String(unit?.description ?? "").trim().toLowerCase();
  const compactDescription = description.replace(/[^a-z0-9]/g, "");
  return (packetSet?.components ?? []).filter((component) => {
    const role = String(component.role ?? "").trim().toLowerCase();
    const formId = String(component.officialFormId ?? "").trim();
    if (formId) {
      const compactFormId = formId.toLowerCase().replace(/\.(?:pdf|docx?)$/i, "").replace(/[^a-z0-9]/g, "");
      if (compactFormId && compactDescription.includes(compactFormId)) return true;
      const tokens = formId.toLowerCase().replace(/\.(?:pdf|docx?)$/i, "").split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3 && token !== String(unit?.unitId ?? "").slice(0, 2).toLowerCase());
      if (tokens.length >= 2 && tokens.every((token) => description.includes(token === "exp" ? "expung" : token))) return true;
    }
    const roleTokens = role.split("_").filter((token) => token.length >= 3 && !["primary", "filing", "instructions"].includes(token));
    if (roleTokens.length >= 2 && roleTokens.every((token) => description.includes(token))) return true;
    return !formId && role === "primary_filing" && strategy === "custom_pleading"
      && /\b(?:petition|motion|application|written request|demand letter)\b/i.test(description);
  });
}

function explicitParticipantFilingMethodEvidence(value) {
  const text = String(value ?? "");
  if (/\b(?:no participant filing|nothing is filed|files? nothing|guidance[- ]only|automatic relief|profile|compiled)\b/i.test(text)) return false;
  if (/\b(?:confirm|call|contact|ask|check)\b.{0,60}\b(?:filing|submission|electronic|paper|method|mechanics)\b/i.test(text)) return false;
  const method = /\b(?:by (?:first[- ]class |certified |registered )?mail|through (?:the )?(?:online |electronic )?portal|via (?:the )?(?:online |electronic )?portal|in person|hand[- ]deliver(?:y|ed)?|drop box|courier|fax|email|e-?file(?:d|s|ing)?|electronically|online|upload(?:ed|s|ing)?|mail(?:ed|s|ing)?(?:\s+the|\s+a|\s+an|\s+your)?|deliver(?:ed|s|ing)?\s+(?:the|a|an|your)\b)\b/i;
  return method.test(text) && /\b(?:file|files|filed|filing|submit|submits|submitted|submission|application|petition|motion|request|deliver|mail|e-?file|upload)\b/i.test(text);
}

function expectedWorklistGroupId(candidate) {
  return candidate.packetFamilyId
    ?? candidate.packetSetId
    ?? (candidate.currentOutputStrategy === "custom_pleading"
      ? `composed-treatment:${candidate.trackId ?? candidate.routeKey}`
      : candidate.currentOutputStrategy === "participant_agency_application"
        ? `agency-application-treatment:${candidate.routeKey}`
        : candidate.currentOutputStrategy === "official_pdf_fill" && candidate.requiredSourceIds.some((id) => id.startsWith("official-form:"))
          ? `official-form-treatment:${candidate.routeKey}`
          : `unresolved-family:${candidate.routeKey}`);
}

function heldAndVerifiedArtifact(artifact) {
  return artifact?.presence === "present"
    && artifact?.hashState === "match"
    && /^[a-f0-9]{64}$/i.test(String(artifact?.inventorySha256 ?? ""))
    && String(artifact.inventorySha256).toLowerCase() === String(artifact.measuredSha256 ?? "").toLowerCase();
}

function artifactExplicitlyMapsRawRelationship(artifact, relationship) {
  const formIds = unique([artifact?.officialFormId, ...(artifact?.officialFormIds ?? [])].filter(Boolean));
  const componentIds = unique([artifact?.componentId, ...(artifact?.componentIds ?? [])].filter(Boolean));
  const trackIds = unique(artifact?.reliefTracksUsing ?? []);
  return (relationship.officialFormId && formIds.includes(relationship.officialFormId))
    || (relationship.componentId && componentIds.includes(relationship.componentId))
    || (relationship.trackId && (trackIds.includes(relationship.trackId) || trackIds.includes(`${relationship.jurisdiction}:${relationship.trackId}`)));
}

function artifactIsAttributableToRelationship(artifact, relationship) {
  if (!heldAndVerifiedArtifact(artifact)) return false;
  const relationshipHash = String(relationship.sha256 ?? "").toLowerCase();
  if (/^[a-f0-9]{64}$/.test(relationshipHash)
    && [artifact.inventorySha256, artifact.measuredSha256].some((hash) => String(hash ?? "").toLowerCase() === relationshipHash)) return true;
  if (!relationship.officialSourceUrl || !artifactExplicitlyMapsRawRelationship(artifact, relationship)) return false;
  return flattenStrings(artifact.provenance).includes(relationship.officialSourceUrl);
}

function sourceRelationshipIdentity(relationship) {
  if (relationship.officialFormId) return `official-form:${relationship.officialFormId}`;
  if (/^[a-f0-9]{64}$/i.test(String(relationship.sha256 ?? ""))) return `source-sha256:${String(relationship.sha256).toLowerCase()}`;
  if (/^https?:\/\//i.test(String(relationship.officialSourceUrl ?? ""))) return `source-url:${relationship.officialSourceUrl}`;
  return `component:${relationship.jurisdiction}:${relationship.trackId}:${relationship.componentId ?? "not-recorded"}`;
}

function officialSourceIsHeld(source) {
  return source?.match === true
    && /^[a-f0-9]{64}$/i.test(String(source.expectedSha256 ?? ""))
    && String(source.expectedSha256).toLowerCase() === String(source.installedSha256 ?? "").toLowerCase();
}

function rawRelationshipsForCandidate(candidate, independent) {
  const all = independent?.sourceRelationships ?? [];
  const direct = candidate.trackId
    ? all.filter((row) => row.jurisdiction === candidate.jurisdiction && row.trackId === candidate.trackId)
    : [];
  const required = new Set(candidate.requiredSourceIds ?? []);
  const explicitlyNamed = all.filter((row) => row.jurisdiction === candidate.jurisdiction && (
    (row.componentId && required.has(`component:${row.componentId}`))
      || (row.officialFormId && required.has(`official-form:${row.officialFormId}`))
      || (row.officialSourceUrl && required.has(`source-url:${row.officialSourceUrl}`))
      || (/^[a-f0-9]{64}$/i.test(String(row.sha256 ?? "")) && required.has(`source-sha256:${String(row.sha256).toLowerCase()}`))
  ));
  const byIdentity = new Map([...direct, ...explicitlyNamed].map((row) => [`${row.jurisdiction}:${row.trackId}:${row.componentId}`, row]));
  return [...byIdentity.values()];
}

function everyRequiredSourceHasCustody(relationships, independent) {
  if (!relationships.length) return false;
  const groups = new Map();
  for (const relationship of relationships) {
    const key = sourceRelationshipIdentity(relationship);
    const rows = groups.get(key) ?? [];
    rows.push(relationship);
    groups.set(key, rows);
  }
  return [...groups.values()].every((rows) => rows.some((relationship) => {
    if (relationship.officialFormId && officialSourceIsHeld(independent?.officialSources?.[relationship.officialFormId])) return true;
    return (independent?.sourceArtifacts ?? []).some((artifact) => artifactIsAttributableToRelationship(artifact, relationship));
  }));
}

function exactContractActor(contract) {
  const text = flattenStrings([contract?.destination, contract?.statute, contract?.timing, contract?.notes]).join(" ").toLowerCase();
  if (/department|bureau|board|commission|administrative office|\bagency\b/.test(text)) return "agency";
  if (/prosecut(?:or|ing attorney)/.test(text)) return "prosecutor";
  if (/\bcourt\b|\bjudge\b/.test(text)) return "court";
  return "not recorded";
}

function exactSelectorIdentity(selector) {
  if (!selector?.operator || !selector?.factId || !Object.hasOwn(selector, "value")) return null;
  return JSON.stringify([selector.operator, selector.factId, selector.value]);
}

function independentlyBuildRepresentationEdges(crosswalk) {
  const edges = new Map();
  const add = (jurisdiction, trackId, pathwayId, relationshipType, direction) => {
    const edgeId = `${jurisdiction}:${trackId}<->${pathwayId}`;
    const edge = edges.get(edgeId) ?? {
      edgeId,
      jurisdiction,
      trackRouteKey: `track:${jurisdiction}:${trackId}`,
      pathwayRouteKey: `pathway:${jurisdiction}:${pathwayId}`,
      relationshipTypes: [],
      sourceDirections: [],
    };
    edge.relationshipTypes = sorted(unique([...edge.relationshipTypes, relationshipType].filter(Boolean)));
    edge.sourceDirections = sorted(unique([...edge.sourceDirections, direction]));
    edges.set(edgeId, edge);
  };
  for (const row of crosswalk.registryTracks) {
    for (const pathwayId of row.mappedCompiledPathwayIds ?? []) add(row.jurisdiction, row.registryTrackId, pathwayId, row.relationshipType, "registry_to_runtime");
  }
  for (const row of crosswalk.compiledPathways) {
    for (const trackId of row.mappedRegistryTrackIds ?? []) add(row.jurisdiction, trackId, row.compiledPathwayId, row.registryRelation, "runtime_to_registry");
  }
  return [...edges.values()].sort((left, right) => left.edgeId.localeCompare(right.edgeId));
}

function independentlyEnumerateFiles(directory, predicate) {
  return fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => `${directory}/${entry.name}`)
    .sort();
}

function independentSourceFiles() {
  return unique([
    ...INDEPENDENT_FIXED_INPUT_FILES,
    ...independentlyEnumerateFiles("src/lib/rcap-engine/compiled/profiles", (name) => name.endsWith(".json")),
    ...independentlyEnumerateFiles("data/record-clearing/legal-design-intake", (name) => name.endsWith(".memo.json")),
    ...independentlyEnumerateFiles("data/record-clearing/legal-decisions", (name) => name.endsWith(".json")),
    ...independentlyEnumerateFiles("data/record-clearing/packet-specifications", (name) => name.endsWith(".json")),
  ]).sort();
}

function independentSourceFingerprint(files) {
  const digest = crypto.createHash("sha256");
  for (const file of files) {
    digest.update(file);
    digest.update("\0");
    digest.update(fs.readFileSync(path.join(ROOT, file)));
    digest.update("\0");
  }
  return `sha256:${digest.digest("hex")}`;
}

function independentFileFingerprint(file) {
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex")}`;
}

function loadIndependentSourceExpectations() {
  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const tracks = readJson("data/record-clearing/legal-design-track-registry.json").tracks;
  const crosswalk = readJson("data/rcap-ledger/track-pathway-crosswalk.json");
  const packetSetRows = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
  const officialFormAssignments = readJson("data/record-clearing/legal-design-specifications.json").officialFormAssignments;
  const sourceRelationships = readJson("data/record-clearing/legal-design-track-source-relationships.json").relationships;
  const sourceArtifacts = readJson("data/record-clearing/source-artifact-registry.json").artifacts;
  const routeKindAdjudicationRows = readJson("data/rcap-ledger/route-kind-adjudications.json").rows;
  const presentationConflictRows = readJson("data/rcap-ledger/route-presentation-conflicts.json").rows;
  const aliasRegistry = readJson("data/rcap-ledger/route-aliases.json");
  const launchRows = readJson("data/rcap-ledger/launch-graph.json").rows;
  const factoryRows = readJson("data/record-clearing/factory-v2-route-registry.json").routes;
  const counselFamilies = readJson("data/rcap-ledger/completed-output-counsel-manifest.json").families;
  const counselManifest = readJson("data/rcap-ledger/completed-output-counsel-manifest.json");
  const runtimeAuthority = readJson("src/lib/legal-authority/authority.json");
  const authorizationQueue = readJson("data/rcap-authorization-queue.json");
  const gradeARecords = readJson("data/rcap-grade-a/fulfillment-authority-registry.json").records;
  const officialSources = readJson("data/rcap-grade-a/official-source-registry.json").sources;
  const projectionRows = readJson("data/rcap-grade-a/fulfillment-authority-projection.json").routes;
  const contradictionRows = readJson("data/rcap-ledger/closure-authority-contradictions.json").rows;
  const profileFiles = independentlyEnumerateFiles("src/lib/rcap-engine/compiled/profiles", (name) => name.endsWith(".json"));
  const runtimePathwayRows = profileFiles.flatMap((file) => {
    const profile = readJson(file);
    return profile.pathways.map((pathway) => ({ ...pathway, jurisdiction: profile.jurisdiction.code, profileFile: file }));
  });
  const runtimePathwayKeys = runtimePathwayRows.map((pathway) => `pathway:${pathway.jurisdiction}:${pathway.id}`);
  const crosswalkRuntimePathwayKeys = crosswalk.compiledPathways.map((pathway) => `pathway:${pathway.jurisdiction}:${pathway.compiledPathwayId}`);
  const effectiveContracts = new Map();
  const supersededContracts = [];
  let rawRouteContracts = 0;
  for (const file of INDEPENDENT_CONTRACT_FILES) {
    for (const contract of readJson(file).routes) {
      rawRouteContracts += 1;
      const previous = effectiveContracts.get(contract.routeKey);
      if (previous) supersededContracts.push({ routeKey: contract.routeKey, supersededSourceFile: previous.file, effectiveSourceFile: file });
      effectiveContracts.set(contract.routeKey, { file, contract });
    }
  }
  const serviceBranchKeys = [];
  const failureDispositionKeys = [];
  for (const { contract } of effectiveContracts.values()) {
    for (const branch of contract.serviceBranches ?? []) serviceBranchKeys.push(`service-branch:${contract.routeKey}:${branch.id}`);
    for (const disposition of contract.failureDisposition ?? []) failureDispositionKeys.push(`failure-disposition:${contract.routeKey}:${disposition.id}`);
  }
  const pendingAliasInstructions = [...effectiveContracts.values()].flatMap(({ file, contract }) =>
    [...String(contract.notes ?? "").matchAll(/Register route key alias:\s*([A-Z]{2}:[a-z0-9-]+)/g)].map((match) => ({
      aliasRouteKey: match[1],
      canonicalRouteKey: contract.routeKey,
      decisionId: contract.decisionId,
      sourceFile: file,
      instruction: match[0],
      registryStatus: "PENDING_NOT_REGISTERED",
    })));
  const runtimeAuthorityDecisionById = new Map(runtimeAuthority.decisions.map((decision) => [decision.id, decision]));
  const runtimeAuthorityDecisionAssociations = [...effectiveContracts.values()].map(({ file, contract }) => {
    const decision = runtimeAuthorityDecisionById.get(contract.decisionId);
    return {
      contractRouteKey: contract.routeKey,
      jurisdiction: contract.jurisdiction,
      pathwayId: contract.pathwayId,
      contractSourceFile: file,
      contractDecisionId: contract.decisionId,
      contractOutcomeMode: contract.outcomeMode,
      authorityDecisionId: decision?.id ?? null,
      authorityRuleId: decision?.ruleId ?? null,
      authorityOutputMode: decision?.outputMode ?? null,
      authorityEffectiveDateNote: decision?.effectiveDateNote ?? null,
      authorityRouteKeys: sorted(unique(decision?.routeKeys ?? [])),
      associationStatus: decision?.routeKeys?.includes(contract.routeKey)
        ? "EXACT_AUTHORITY_ROUTE_KEY_ASSOCIATION"
        : decision
          ? "DECISION_ID_RESOLVES_AUTHORITY_ROUTE_KEY_REGISTRY_GAP"
          : "MISSING_RUNTIME_AUTHORITY_DECISION",
    };
  }).sort((a, b) => a.contractRouteKey.localeCompare(b.contractRouteKey));
  const ownerDecisionId = "auth-2026-08-19-owner-legal-approval-completed-output";
  const ownerQueueRecord = authorizationQueue.entries.find((row) => row.id === ownerDecisionId);
  const ownerManifestRecord = counselManifest.ownerLegalDecision?.records?.find((row) => row.recordId === ownerDecisionId);
  const ownerDecisionValid = ownerQueueRecord?.kind === "owner_legal_decision"
    && ownerQueueRecord?.status === "authorized"
    && ownerQueueRecord?.decision === "approved"
    && ownerQueueRecord?.legalApprovalResult === "approved_by_decision_owner"
    && counselManifest.ownerLegalDecision?.approved === true
    && counselManifest.ownerLegalDecision?.result === "approved_by_decision_owner"
    && ownerManifestRecord?.legalApprovalResult === "approved_by_decision_owner";
  const queueApprovedFamilyIds = new Set(ownerQueueRecord?.decisionScope?.completedOutputPacketFamilies ?? []);
  const technicalAnnexFamilyIds = new Set(ownerQueueRecord?.decisionScope?.annexFamiliesWithSupersededTechnicalEvidence ?? []);
  const ownerApprovedFamilies = ownerDecisionValid ? counselFamilies.filter((family) =>
    queueApprovedFamilyIds.has(family.familyId)
      && family.legalApprovalResult === "approved_by_decision_owner"
      && family.legalDecisionRecordId === ownerDecisionId
      && ((family.substantiveDifferencesFromAdoptedDesign ?? []).length === 0
        || technicalAnnexFamilyIds.has(family.familyId))).map((family) => ({
        familyId: family.familyId,
        jurisdictions: sorted(unique(family.jurisdictions ?? [])),
        tracksServed: sorted(unique(family.tracksServed ?? [])),
      })) : [];
  const packetSpecificationFiles = independentlyEnumerateFiles("data/record-clearing/packet-specifications", (name) => name.endsWith(".json"));
  const packetSpecifications = packetSpecificationFiles.flatMap((file) => {
    const value = readJson(file);
    const rows = Array.isArray(value.configurations) ? value.configurations : [value];
    return rows.map((row) => {
      const sourceRouteKeys = unique([
        row.trackId ? `track:${row.jurisdiction}:${row.trackId}` : null,
        row.pathwayId ? `pathway:${row.jurisdiction}:${row.pathwayId}` : null,
        row.runtimePathwayId ? `pathway:${row.jurisdiction}:${row.runtimePathwayId}` : null,
        row.routeKey && runtimePathwayKeys.includes(`pathway:${row.routeKey}`) ? `pathway:${row.routeKey}` : null,
      ].filter(Boolean));
      return {
        specificationIdentity: `${file}#${row.specificationId ?? row.packetConfigurationId}`,
        jurisdiction: row.jurisdiction,
        sourceRouteKeys,
        packetFamily: row.packetFamily ?? null,
        packetSetId: row.packetSetId ?? null,
      };
    });
  });
  const stablePacketFamilyIds = unique([
    ...counselFamilies.map((family) => family.familyId),
    ...launchRows.flatMap((row) => (row.packetFamilies ?? []).map((family) => typeof family === "string" ? family : family.packetFamilyId)),
    ...factoryRows.flatMap((row) => (row.packetFamilies ?? []).map((family) => typeof family === "string" ? family : family.packetFamilyId)),
    ...gradeARecords.map((record) => record.packetFamilyId),
    ...packetSpecifications.map((specification) => specification.packetFamily),
  ].filter(Boolean));
  const stablePacketSetIds = unique([
    ...packetSetRows.map((packetSet) => packetSet.packetSetId),
    ...launchRows.flatMap((row) => (row.packetSets ?? []).map((packetSet) => typeof packetSet === "string" ? packetSet : packetSet.packetSetId)),
    ...packetSpecifications.map((specification) => specification.packetSetId),
  ].filter(Boolean));
  const pendingCensusPacketFamilies = [...effectiveContracts.values()].flatMap(({ contract }) => {
    const pathway = crosswalk.compiledPathways.find((row) =>
      row.jurisdiction === contract.jurisdiction && row.compiledPathwayId === contract.pathwayId);
    const hasStableFamily = launchRows.some((row) => row.jurisdiction === contract.jurisdiction
      && row.pathwayId === contract.pathwayId && (row.packetFamilies ?? []).length)
      || factoryRows.some((row) => row.jurisdiction === contract.jurisdiction
        && row.pathwayId === contract.pathwayId && (row.packetFamilies ?? []).length)
      || packetSpecifications.some((row) => row.jurisdiction === contract.jurisdiction
        && row.sourceRouteKeys.includes(`pathway:${contract.jurisdiction}:${contract.pathwayId}`) && row.packetFamily);
    const hasStableSet = launchRows.some((row) => row.jurisdiction === contract.jurisdiction
      && row.pathwayId === contract.pathwayId && (row.packetSets ?? []).length)
      || packetSpecifications.some((row) => row.jurisdiction === contract.jurisdiction
        && row.sourceRouteKeys.includes(`pathway:${contract.jurisdiction}:${contract.pathwayId}`) && row.packetSetId);
    if (contract.outcomeMode !== "participant_packet"
      || !contract.packetFamily
      || !/official/i.test(String(pathway?.packetMode ?? ""))
      || (pathway?.mappedRegistryTrackIds ?? []).length
      || hasStableFamily
      || hasStableSet) return [];
    return [{
      packetFamilyId: `census-pending-family:${contract.jurisdiction}:${contract.pathwayId}`,
      jurisdiction: contract.jurisdiction,
      pathwayId: contract.pathwayId,
      routeContractId: contract.routeKey,
      packetMode: pathway.packetMode,
      contractPacketFamily: contract.packetFamily,
    }];
  });
  const decisionFiles = independentlyEnumerateFiles("data/record-clearing/legal-decisions", (name) => name.endsWith(".json"));
  const decisionDocuments = decisionFiles.map((file) => ({ file, value: readJson(file) }));
  const scopedDecisionRecords = decisionDocuments.flatMap(({ value }) => {
    const direct = (value.decisions ?? []).flatMap((decision) => {
      const ids = unique([
        decision.decisionId,
        decision.recordId,
        decision.questionId ? `legal-question:${decision.questionId}` : null,
      ].filter(Boolean));
      return ids.map((decisionId) => ({
        decisionId,
        jurisdiction: decision.jurisdiction ?? null,
        tracks: decision.tracks ?? (decision.trackId ? [decision.trackId] : []),
        pathways: decision.pathways ?? (decision.pathwayId ? [decision.pathwayId] : []),
        classification: decision.classification ?? null,
      }));
    });
    const assignments = (value.immediateAssignments ?? []).flatMap((decision) => decision.assignmentId ? [{
      decisionId: decision.assignmentId,
      jurisdiction: decision.jurisdiction ?? null,
      tracks: decision.trackId ? [decision.trackId] : [],
      pathways: [],
      classification: null,
    }] : []);
    const questions = (value.questionDecisions ?? []).flatMap((decision) => unique([
      decision.registerQuestionId ? `register-question:${decision.registerQuestionId}` : null,
      decision.reportQuestionId ? `report-question:${decision.reportQuestionId}` : null,
    ].filter(Boolean)).map((decisionId) => ({
      decisionId,
      jurisdiction: decision.jurisdiction ?? null,
      tracks: decision.trackId ? [decision.trackId] : [],
      pathways: [],
      classification: decision.deliveryDisposition ?? null,
    })));
    return [...direct, ...assignments, ...questions];
  });
  const unattachedDecisionRows = readJson("data/rcap-ledger/batch-b-unattached-decisions.json").rows;
  const unattachedDecisionTrackIds = unattachedDecisionRows.map((row) => row.trackId);
  const unattachedDecisionTrackIdSet = new Set(unattachedDecisionTrackIds);
  const researchTrackDecisions = decisionDocuments.flatMap(({ file, value }) => (value.researchTrackDecisions ?? []).map((decision) => ({
    ...decision,
    sourceFile: file,
    entityType: unattachedDecisionTrackIdSet.has(decision.trackId) ? "unattached_decision_route" : "research_decision_route",
    sourceRouteKey: unattachedDecisionTrackIdSet.has(decision.trackId)
      ? `unattached-decision-route:${decision.jurisdiction}:${decision.trackId}`
      : `research-decision-route:${decision.jurisdiction}:${decision.trackId}`,
  })));
  const lawrenceSourceFile = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
  const lawrenceDocument = decisionDocuments.find(({ file }) => file === lawrenceSourceFile)?.value;
  const lawrenceOregonDecisionIds = [
    "LWD-2026-08-29-OR-SUBSECTION",
    "legal-question:OR-Q1-SUBSECTION",
    "LWD-2026-08-29-OR-PACKET-SCOPE",
    "legal-question:OR-Q2-PACKET-SCOPE",
  ];
  const lawrenceOregonDecisions = (lawrenceDocument?.decisions ?? []).filter((decision) =>
    ["LWD-2026-08-29-OR-SUBSECTION", "LWD-2026-08-29-OR-PACKET-SCOPE"].includes(decision.decisionId));
  const decisionFidelityConflictSources = [
    {
      conflictId: "NY:automatic-non-conviction-sealing-under-cpl-160-50-160-55:overbroad-160-50-160-55",
      jurisdiction: "NY",
      runtimePathwayId: "automatic-non-conviction-sealing-under-cpl-160-50-160-55",
      researchSourceRouteKey: researchTrackDecisions.find((decision) => decision.trackId === "ny_160_55_violation")?.sourceRouteKey,
      legalDecisionRecordIds: ["research-track-decision:ny_160_55_violation"],
      sourceFile: researchTrackDecisions.find((decision) => decision.trackId === "ny_160_55_violation")?.sourceFile,
    },
    {
      conflictId: "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c:lawrence-subsection-packet-scope",
      jurisdiction: "OR",
      runtimePathwayId: "set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
      researchSourceRouteKey: null,
      legalDecisionRecordIds: lawrenceOregonDecisionIds,
      sourceFile: lawrenceSourceFile,
      sourceSha256: independentFileFingerprint(lawrenceSourceFile),
    },
  ].map((conflict) => {
    const pathway = crosswalk.compiledPathways.find((row) =>
      row.jurisdiction === conflict.jurisdiction && row.compiledPathwayId === conflict.runtimePathwayId);
    return {
      ...conflict,
      sourceSha256: conflict.sourceSha256 ?? (conflict.sourceFile ? independentFileFingerprint(conflict.sourceFile) : null),
      mappedRegistryTrackIds: pathway?.mappedRegistryTrackIds ?? [],
    };
  });
  const sharedFormOnlyCrosswalkConflicts = crosswalk.compiledPathways.filter((pathway) =>
    (pathway.mappingEvidence ?? []).includes("shared_official_form")
      && (pathway.evidenceDetail?.sharedStatutoryCitations ?? []).length === 0
      && (pathway.mappedRegistryTrackIds ?? []).length > 0).map((pathway) => ({
    jurisdiction: pathway.jurisdiction,
    pathwayId: pathway.compiledPathwayId,
    pathwayRouteKey: `pathway:${pathway.jurisdiction}:${pathway.compiledPathwayId}`,
    trackRouteKeys: pathway.mappedRegistryTrackIds.map((trackId) => `track:${pathway.jurisdiction}:${trackId}`),
    edgeIds: pathway.mappedRegistryTrackIds.map((trackId) => `${pathway.jurisdiction}:${trackId}<->${pathway.compiledPathwayId}`),
  }));
  const heldPresentationCrosswalkConflicts = presentationConflictRows.filter((row) => row.status === "held").map((conflict) => {
    const contract = [...effectiveContracts.values()].find(({ contract: row }) => row.routeKey === conflict.routeKey)?.contract;
    const pathway = crosswalk.compiledPathways.find((row) => row.jurisdiction === contract?.jurisdiction && row.compiledPathwayId === contract?.pathwayId);
    return {
      routeKey: conflict.routeKey,
      status: conflict.status,
      classification: conflict.classification,
      provenStatute: conflict.provenStatute,
      pathwayRouteKey: contract ? `pathway:${contract.jurisdiction}:${contract.pathwayId}` : null,
      trackRouteKeys: (pathway?.mappedRegistryTrackIds ?? []).map((trackId) => `track:${pathway.jurisdiction}:${trackId}`),
      edgeIds: (pathway?.mappedRegistryTrackIds ?? []).map((trackId) => `${pathway.jurisdiction}:${trackId}<->${pathway.compiledPathwayId}`),
      sourceRecord: conflict,
    };
  });
  const rejectedPathwayRouteKeys = new Set([
    ...sharedFormOnlyCrosswalkConflicts.map((conflict) => conflict.pathwayRouteKey),
    ...heldPresentationCrosswalkConflicts.map((conflict) => conflict.pathwayRouteKey),
  ]);
  const legalTracksWithoutRuntime = crosswalk.registryTracks
    .filter((row) => !(row.mappedCompiledPathwayIds ?? []).length)
    .map((row) => ({
      jurisdiction: row.jurisdiction,
      trackId: row.registryTrackId,
      sourceRouteKey: `track:${row.jurisdiction}:${row.registryTrackId}`,
      relationshipType: row.relationshipType,
      compiledCoverageDisposition: row.compiledCoverageDisposition,
    }))
    .sort((a, b) => a.sourceRouteKey.localeCompare(b.sourceRouteKey));
  const runtimeWithoutCurrentLegalDesignTrack = crosswalk.compiledPathways
    .filter((row) => !(row.mappedRegistryTrackIds ?? []).length
      || rejectedPathwayRouteKeys.has(`pathway:${row.jurisdiction}:${row.compiledPathwayId}`))
    .map((row) => ({
      jurisdiction: row.jurisdiction,
      runtimePathwayId: row.compiledPathwayId,
      sourceRouteKey: `pathway:${row.jurisdiction}:${row.compiledPathwayId}`,
      registryRelation: row.registryRelation,
      rawMappedRegistryTrackIds: unique(row.mappedRegistryTrackIds ?? []),
      currentRelation: sharedFormOnlyCrosswalkConflicts.some((conflict) => conflict.pathwayRouteKey === `pathway:${row.jurisdiction}:${row.compiledPathwayId}`)
        ? "REJECTED_SHARED_FORM_ONLY_WITHOUT_SHARED_STATUTORY_CITATION"
        : heldPresentationCrosswalkConflicts.some((conflict) => conflict.pathwayRouteKey === `pathway:${row.jurisdiction}:${row.compiledPathwayId}`)
          ? "REJECTED_HELD_PRESENTATION_CONFLATION_PENDING_EXACT_CROSSWALK_AND_COMPILED_PROFILE_REPAIR"
          : "NO_CURRENT_LEGAL_DESIGN_TRACK",
    }))
    .sort((a, b) => a.sourceRouteKey.localeCompare(b.sourceRouteKey));
  const representationEdges = independentlyBuildRepresentationEdges(crosswalk);
  const sharedFormOnlyEdgeIds = new Set(sharedFormOnlyCrosswalkConflicts.flatMap((conflict) => conflict.edgeIds));
  const heldPresentationEdgeIds = new Set(heldPresentationCrosswalkConflicts.flatMap((conflict) => conflict.edgeIds));
  for (const edge of representationEdges) {
    edge.canonicalizationDisposition = sharedFormOnlyEdgeIds.has(edge.edgeId)
      ? "REJECTED_SHARED_FORM_ONLY_WITHOUT_SHARED_STATUTORY_CITATION"
      : heldPresentationEdgeIds.has(edge.edgeId)
        ? "REJECTED_HELD_PRESENTATION_CONFLATION_PENDING_EXACT_CROSSWALK_AND_COMPILED_PROFILE_REPAIR"
        : "REPRESENTATION_LINK_ACCEPTED_FOR_SOURCE_ACCOUNTING";
  }
  const sourceFiles = independentSourceFiles();
  return {
    sourceFiles,
    sourceFingerprint: independentSourceFingerprint(sourceFiles),
    trackRows: tracks,
    crosswalk,
    packetSetRows,
    officialFormAssignments,
    sourceRelationships,
    sourceArtifacts,
    routeKindAdjudicationRows,
    presentationConflictRows,
    heldPresentationCrosswalkConflicts,
    legalTracksWithoutRuntime,
    runtimeWithoutCurrentLegalDesignTrack,
    aliasRegistry,
    pendingAliasInstructions,
    runtimeAuthority,
    runtimeAuthorityDecisionAssociations,
    authorizationQueue,
    counselManifest,
    ownerDecisionId,
    ownerDecisionValid,
    ownerQueueRecord,
    ownerManifestRecord,
    ownerApprovedFamilies,
    nationwideInventoryPresent: fs.existsSync(path.join(ROOT, "private/Nationwide Record Clearing")),
    legalTrackKeys: tracks.map((track) => `track:${track.jurisdiction}:${track.trackId}`),
    legalTrackUnitKeys: tracks.flatMap((track) => (track.units ?? []).map((unit) => `unit:${track.jurisdiction}:${track.trackId}:${unit.unitId}`)),
    runtimePathwayKeys,
    runtimePathwayRows,
    crosswalkRuntimePathwayKeys,
    serviceBranchKeys,
    failureDispositionKeys,
    unattachedDecisionRouteKeys: researchTrackDecisions.filter((decision) => decision.entityType === "unattached_decision_route").map((decision) => decision.sourceRouteKey),
    researchDecisionRouteKeys: researchTrackDecisions.filter((decision) => decision.entityType === "research_decision_route").map((decision) => decision.sourceRouteKey),
    researchTrackDecisions,
    rawRouteContracts,
    effectiveRouteContracts: effectiveContracts.size,
    effectiveContractRows: [...effectiveContracts.values()].map(({ file, contract }) => ({ file, contract })),
    supersededContracts,
    representationEdges,
    sharedFormOnlyCrosswalkConflicts,
    decisionFidelityConflictSources,
    lawrenceOregonDecisions,
    packetSpecifications,
    packetSpecificationIdentities: packetSpecifications.map((specification) => specification.specificationIdentity),
    stablePacketFamilyIds,
    stablePacketSetIds,
    pendingCensusPacketFamilies,
    officialSources,
    scopedDecisionRecords,
    projectionRows,
    projectionRouteIds: projectionRows.map((row) => row.routeId),
    contradictionRows,
    contradictionPathwayKeys: contradictionRows.map((row) => row.pathwayKey),
    unattachedDecisionTrackIds,
  };
}

export function loadVerificationContext() {
  const parsed = {};
  for (const [key, name] of Object.entries(JSON_FILES)) parsed[key] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
  parsed.docs = {
    "NATIONAL_ROUTE_OBLIGATION_CENSUS.md": fs.readFileSync(path.join(DOCS_DIR, "NATIONAL_ROUTE_OBLIGATION_CENSUS.md"), "utf8"),
    "CAPTAIN_INTEGRATION_REQUEST.md": fs.readFileSync(path.join(DOCS_DIR, "CAPTAIN_INTEGRATION_REQUEST.md"), "utf8"),
  };
  parsed.expected = buildOutputs();
  parsed.independent = loadIndependentSourceExpectations();
  return parsed;
}

export function collectFailures(context) {
  const failures = [];
  const independent = context.independent;
  const entities = context.canonical?.routeEntities ?? [];
  const obligations = context.canonical?.canonicalObligations ?? [];
  const routes = context.candidates?.routes ?? [];

  for (const [label, output] of outputMetadata(context)) {
    if (output?.metadata?.sourceFingerprint !== context.expected.inputs.sourceFingerprint) {
      failures.push(`${label} source fingerprint mismatch; stale output hash`);
    }
    if (output?.metadata?.createsApproval !== false || output?.metadata?.changesRuntime !== false || output?.metadata?.productionTouched !== false) {
      failures.push(`${label} metadata invents approval, runtime, or Production authority`);
    }
    const inventory = output?.metadata?.sourceInventoryAvailability;
    const expectedInventoryStatus = independent?.nationwideInventoryPresent
      ? "AVAILABLE_FOR_RECONCILIATION"
      : "ABSENT_FROM_THIS_WORKTREE_REGISTRIES_USED_AS_CURRENT_REPOSITORY_EVIDENCE";
    if (inventory?.expectedPath !== "private/Nationwide Record Clearing/"
      || inventory?.presentInWorktree !== independent?.nationwideInventoryPresent
      || inventory?.ingestionStatus !== expectedInventoryStatus) {
      failures.push(`${label} Nationwide source-inventory availability metadata disagrees with the exact worktree path state`);
    }
  }
  if (context.canonical?.sourceInventoryAvailability?.presentInWorktree !== independent?.nationwideInventoryPresent
    || context.canonical?.sourceInventoryAvailability?.expectedPath !== "private/Nationwide Record Clearing/") {
    failures.push("canonical Nationwide source-inventory limitation disagrees with the exact worktree path state");
  }
  const outputFingerprints = outputMetadata(context).map(([, output]) => output?.metadata?.sourceFingerprint);
  if (unique(outputFingerprints).length !== 1) failures.push("source fingerprint agreement failure across the six generated JSON outputs");
  if (!independent || independent.sourceFingerprint !== context.expected.inputs.sourceFingerprint) failures.push("independent source fingerprint mismatch; generator input coverage is incomplete or stale");
  if (!independent || !sameSet(independent.sourceFiles, context.expected.inputs.inputFiles)) failures.push("independent source file inventory mismatch; required raw input is omitted or invented");
  if ((independent?.runtimeAuthority?.decisions ?? []).length !== 74) failures.push("runtime authority decision registry count drift; expected 74 current decisions");
  if (!sameSet(
    (independent?.runtimeAuthority?.decisions ?? []).map((decision) => decision.id),
    (independent?.effectiveContractRows ?? []).map(({ contract }) => contract.decisionId),
  )) failures.push("runtime authority decision IDs and effective route-contract decision IDs do not resolve bidirectionally");
  const queueOwnerFamilyIds = independent?.ownerQueueRecord?.decisionScope?.completedOutputPacketFamilies ?? [];
  const manifestOwnerFamilyIds = independent?.counselManifest?.families?.map((family) => family.familyId) ?? [];
  if (independent?.ownerQueueRecord?.decisionScope?.completedOutputPacketFamilyCount !== 57
    || queueOwnerFamilyIds.length !== 57
    || unique(queueOwnerFamilyIds).length !== 57
    || independent?.counselManifest?.familyRows !== 57
    || independent?.counselManifest?.familyRowsApproved !== 57
    || independent?.counselManifest?.familyRowsPending !== 0
    || manifestOwnerFamilyIds.length !== 57
    || unique(manifestOwnerFamilyIds).length !== 57
    || !sameSet(queueOwnerFamilyIds, manifestOwnerFamilyIds)
    || (independent?.ownerApprovedFamilies ?? []).length !== 57) {
    failures.push("decision-owner completed-output authority scope is not the exact internally consistent 57-family queue/manifest set");
  }
  const emittedAuthorityAssociations = context.canonical?.runtimeAuthorityDecisionAssociations ?? [];
  const reportedAuthorityAssociations = context.duplicateReport?.runtimeAuthorityDecisionAssociations ?? [];
  const expectedAuthorityAssociations = independent?.runtimeAuthorityDecisionAssociations ?? [];
  if (emittedAuthorityAssociations.length !== expectedAuthorityAssociations.length
    || reportedAuthorityAssociations.length !== expectedAuthorityAssociations.length
    || unique(emittedAuthorityAssociations.map((row) => row.contractRouteKey)).length !== emittedAuthorityAssociations.length
    || unique(reportedAuthorityAssociations.map((row) => row.contractRouteKey)).length !== reportedAuthorityAssociations.length
    || !sameSet(emittedAuthorityAssociations.map(stable), expectedAuthorityAssociations.map(stable))
    || !sameSet(reportedAuthorityAssociations.map(stable), expectedAuthorityAssociations.map(stable))) {
    failures.push("runtime authority decision association set disagrees with the 74-record registry and 148 effective contracts");
  }
  const emittedAuthorityCandidateGaps = context.canonical?.runtimeAuthorityContractCandidateGaps ?? [];
  const reportedAuthorityCandidateGaps = context.duplicateReport?.runtimeAuthorityContractCandidateGaps ?? [];
  const expectedAuthorityCandidateGapKeys = [...RUNTIME_AUTHORITY_CONTRACT_WITHOUT_CANDIDATE_KEYS];
  if (emittedAuthorityCandidateGaps.length !== expectedAuthorityCandidateGapKeys.length
    || reportedAuthorityCandidateGaps.length !== expectedAuthorityCandidateGapKeys.length
    || unique(emittedAuthorityCandidateGaps.map((row) => row.contractRouteKey)).length !== emittedAuthorityCandidateGaps.length
    || unique(reportedAuthorityCandidateGaps.map((row) => row.contractRouteKey)).length !== reportedAuthorityCandidateGaps.length
    || !sameSet(emittedAuthorityCandidateGaps.map((row) => row.contractRouteKey), expectedAuthorityCandidateGapKeys)
    || !sameSet(reportedAuthorityCandidateGaps.map((row) => row.contractRouteKey), expectedAuthorityCandidateGapKeys)) {
    failures.push("runtime-authority effective-contract-without-candidate gap identity set drift");
  }
  for (const gap of emittedAuthorityCandidateGaps) {
    const association = expectedAuthorityAssociations.find((row) => row.contractRouteKey === gap.contractRouteKey);
    const mapping = context.canonical?.sourceToCanonicalMappings?.find((row) =>
      row.sourceRouteKey === `pathway:${association?.jurisdiction}:${association?.pathwayId}`);
    if (!association
      || gap.jurisdiction !== association.jurisdiction
      || gap.pathwayId !== association.pathwayId
      || gap.authorityDecisionId !== association.authorityDecisionId
      || gap.gapDisposition !== "EFFECTIVE_CONTRACT_HAS_NO_EXACT_CANONICAL_CANDIDATE_ASSOCIATION_SHARED_ROUTE_IDENTITY_PATCH_REQUIRED"
      || !sameSet(gap.canonicalPathwayObligationKeys ?? [], mapping?.canonicalObligationKeys ?? [])) {
      failures.push(`runtime-authority contract candidate gap ${gap.contractRouteKey} lacks exact raw association and pathway-accounting evidence`);
    }
  }
  for (const association of expectedAuthorityAssociations) {
    if (!association.authorityDecisionId || !association.authorityOutputMode || !association.authorityEffectiveDateNote) {
      failures.push(`effective contract ${association.contractRouteKey} lacks a resolved runtime-authority decision, output mode, or effective-date note`);
      continue;
    }
    const joined = routes.filter((route) => route.routeContractId === association.contractRouteKey);
    const expectedEvidence = `runtime-authority-decision:${association.authorityDecisionId}:route=${association.contractRouteKey}:association=${association.associationStatus}:output-mode=${association.authorityOutputMode}:effective-note=${association.authorityEffectiveDateNote}`;
    const expectedGap = RUNTIME_AUTHORITY_CONTRACT_WITHOUT_CANDIDATE_KEYS.has(association.contractRouteKey);
    if ((expectedGap && joined.length) || (!expectedGap && !joined.length)) {
      failures.push(`effective contract ${association.contractRouteKey} exact candidate association/gap disposition is missing or vacuous`);
    }
    if (joined.some((route) => {
      const authorityEvidence = (route.currentImplementationEvidence ?? []).filter((item) => item.startsWith("runtime-authority-decision:"));
      return !(route.legalDecisionRecordIds ?? []).includes(association.authorityDecisionId)
        || authorityEvidence.length !== 1
        || authorityEvidence[0] !== expectedEvidence;
    })) {
      failures.push(`effective contract ${association.contractRouteKey} is missing exact runtime-authority decision/output/effective-note evidence on a canonical candidate`);
    }
  }
  for (const route of routes) {
    const authorityEvidence = (route.currentImplementationEvidence ?? []).filter((item) => item.startsWith("runtime-authority-decision:"));
    const association = expectedAuthorityAssociations.find((row) => row.contractRouteKey === route.routeContractId);
    const expectedEvidence = association
      ? `runtime-authority-decision:${association.authorityDecisionId}:route=${association.contractRouteKey}:association=${association.associationStatus}:output-mode=${association.authorityOutputMode}:effective-note=${association.authorityEffectiveDateNote}`
      : null;
    if ((!association && authorityEvidence.length)
      || (association && (authorityEvidence.length !== 1 || authorityEvidence[0] !== expectedEvidence))) {
      failures.push(`${route.routeKey} carries missing, extra, sibling, or otherwise non-exact runtime-authority evidence`);
    }
  }

  if (duplicates(entities.map((row) => row.routeKey)).length) failures.push(`duplicate route key: ${duplicates(entities.map((row) => row.routeKey)).join(", ")}`);
  if (duplicates(obligations.map((row) => row.routeKey)).length) failures.push(`duplicate canonical obligation key: ${duplicates(obligations.map((row) => row.routeKey)).join(", ")}`);
  if (duplicates(routes.map((row) => row.routeKey)).length) failures.push(`duplicate candidate route key: ${duplicates(routes.map((row) => row.routeKey)).join(", ")}`);

  for (const [entityType, definition] of Object.entries(ENTITY_TYPES)) {
    const actual = entities.filter((row) => row.entityType === entityType).map((row) => row.routeKey);
    const declared = context.canonical?.sourceUniverse?.[definition.universeKey] ?? [];
    const expected = independent?.[definition.universeKey] ?? [];
    if (!sameSet(declared, expected)) failures.push(`${definition.label} source-universe declaration mismatch`);
    if (!sameSet(actual, expected)) failures.push(`${definition.label} set mismatch; ${definition.label} is unaccounted for`);
  }
  if (!sameSet(independent?.runtimePathwayKeys ?? [], independent?.crosswalkRuntimePathwayKeys ?? [])) failures.push("compiled profile and crosswalk runtime pathway sets disagree");

  const exactTypedCounts = Object.fromEntries(Object.entries(ENTITY_TYPES).map(([entityType, definition]) => [
    entityType,
    (independent?.[definition.universeKey] ?? []).length,
  ]));
  for (const [entityType, expectedCount] of Object.entries(exactTypedCounts)) {
    const actualCount = entities.filter((row) => row.entityType === entityType).length;
    if (actualCount !== expectedCount) failures.push(`typed universe count drift for ${entityType}: expected ${expectedCount}, received ${actualCount}`);
  }
  const exactTypedTotal = Object.values(exactTypedCounts).reduce((sum, count) => sum + count, 0);
  if (entities.length !== exactTypedTotal) failures.push(`typed universe count drift: expected ${exactTypedTotal} source-derived route-or-branch entities, received ${entities.length}`);
  if ((independent?.researchTrackDecisions ?? []).length !== 9 || exactTypedCounts.unattached_decision_route !== 2 || exactTypedCounts.research_decision_route !== 7) {
    failures.push("research-decision source accounting drift; expected the current nine decisions split into two batch-B unattached and seven additional research routes");
  }
  if (entities.filter((row) => row.entityType === "runtime_pathway").length === 260) failures.push("compiled pathway universe was improperly pruned to the 260 paid subset");

  exactArray("candidate route", routes.map((row) => row.routeKey), obligations.map((row) => row.routeKey), failures);
  const actualClassificationCounts = {
    possibleCategoryA: countBy(routes, (row) => row.possibleCategory === "A_MUST_FULFILL"),
    possibleCategoryB: countBy(routes, (row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION"),
    needsLegalReview: countBy(routes, (row) => row.possibleCategory === "NEEDS_LEGAL_REVIEW"),
  };
  if (Object.values(actualClassificationCounts).reduce((sum, count) => sum + count, 0) !== obligations.length) {
    failures.push("classification counts do not exhaust the canonical terminal obligations");
  }

  for (const cohort of EXPECTED_RUNTIME_CONTRACT_COHORTS) {
    const contract = independent?.effectiveContractRows?.find(({ contract: row }) => row.routeKey === cohort.contractRouteKey)?.contract;
    const sourceText = `${contract?.mechanism ?? ""} ${contract?.notes ?? ""}`;
    if (!contract || contract.pathwayId !== cohort.pathwayId || cohort.sourceNeedles.some((needle) => !sourceText.includes(needle))) {
      failures.push(`${cohort.contractRouteKey} exact mixed-cohort source precondition is missing or changed`);
      continue;
    }
    const expectedKeys = cohort.branches.map(([branchId]) => `obligation:runtime-contract-cohort:${cohort.jurisdiction}:${cohort.pathwayId}:${branchId}`);
    const actualKeys = routes.filter((row) => row.routeContractId === cohort.contractRouteKey).map((row) => row.routeKey);
    if (!sameSet(actualKeys, expectedKeys)) failures.push(`${cohort.contractRouteKey} does not enumerate every exact automatic/participant/favorable terminal cohort once`);
    for (const [branchId, category, reason, participantCanInitiate] of cohort.branches) {
      const key = `obligation:runtime-contract-cohort:${cohort.jurisdiction}:${cohort.pathwayId}:${branchId}`;
      const row = routes.find((candidate) => candidate.routeKey === key);
      if (!row
        || row.possibleCategory !== category
        || row.possibleCategoryBReason !== reason
        || row.participantCanInitiate !== participantCanInitiate
        || !row.currentImplementationEvidence?.some((item) => item.startsWith(`exact-runtime-contract-cohort:${branchId}:`))) {
        failures.push(`${key} disagrees with the exact effective-contract cohort filing posture`);
      }
    }
    const mapping = context.canonical?.sourceToCanonicalMappings?.find((row) => row.sourceRouteKey === `pathway:${cohort.jurisdiction}:${cohort.pathwayId}`);
    if (!mapping || !sameSet(mapping.canonicalObligationKeys, expectedKeys)) {
      failures.push(`${cohort.contractRouteKey} source-to-canonical mapping does not account for every exact cohort branch`);
    }
  }

  const nhAutomatic = routes.find((row) => row.routeKey === "obligation:track-pathway:NH:nh_auto_vacated:annulment-of-a-vacated-conviction");
  const nhPetition = routes.find((row) => row.routeKey === "obligation:track-only:NH:nh_petition_vacated");
  if (!nhAutomatic
    || nhAutomatic.possibleCategory !== "B_LEGITIMATE_EXCLUSION"
    || nhAutomatic.possibleCategoryBReason !== "AUTOMATIC"
    || nhAutomatic.participantCanInitiate !== false
    || nhAutomatic.currentOutputStrategy !== "process_guidance"
    || !nhAutomatic.currentImplementationEvidence?.includes("exact-temporal-cohort-split:post-2019-vacatur-track-is-automatic;pre-2019-petition-is-separate-nh_petition_vacated-track")
    || !nhPetition
    || nhPetition.possibleCategory !== "A_MUST_FULFILL"
    || nhPetition.participantCanInitiate !== true) {
    failures.push("New Hampshire vacated-conviction automatic and petition temporal cohorts were collapsed or overwritten");
  }

  const ncDismissalTrack = independent?.trackRows?.find((row) => row.jurisdiction === "NC" && row.trackId === "nc_146_dismissal_petition");
  const ncDnaSourceAction = (ncDismissalTrack?.packetSet?.participantActionRequired ?? []).find((action) =>
    action.kind === "serve_party"
      && /DNA expunction application under G\.S\. 15A-146\(b1\) is a separate matter/i.test(String(action.description))
      && /district attorney not less than 20 days before the hearing/i.test(String(action.description)));
  const ncDnaKey = "obligation:track-branch:NC:nc_146_dismissal_petition:dna-expunction-application-15a-146-b1";
  const ncDna = routes.find((row) => row.routeKey === ncDnaKey);
  const ncDnaObligation = obligations.find((row) => row.routeKey === ncDnaKey);
  const ncDismissalMapping = context.canonical?.sourceToCanonicalMappings?.find((row) => row.sourceRouteKey === "track:NC:nc_146_dismissal_petition");
  if (!ncDnaSourceAction
    || !ncDna
    || ncDna.possibleCategory !== "A_MUST_FULFILL"
    || ncDna.participantCanInitiate !== true
    || ncDna.currentOutputStrategy !== "custom_pleading"
    || ncDna.trackId !== "nc_146_dismissal_petition"
    || ncDna.runtimePathwayId !== null
    || !ncDna.currentImplementationEvidence?.some((item) => item.startsWith("exact-track-branch:nc_146_dismissal_petition:"))
    || ncDnaObligation?.hiddenParticipantBranch !== true
    || !ncDismissalMapping?.canonicalObligationKeys?.includes(ncDnaKey)) {
    failures.push("North Carolina's separate G.S. 15A-146(b1) DNA expunction application is missing, collapsed into dismissal expunction, or not source-accounted as a hidden Category A branch");
  } else {
    const familyRoute = (context.worklist?.packetFamilies ?? []).flatMap((family) => family.routes ?? []).find((row) => row.routeKey === ncDnaKey);
    const entries = (field) => familyRoute?.deliverable?.[field]?.status === "recorded" ? familyRoute.deliverable[field].entries.join(" ") : "";
    if (!/district attorney/i.test(entries("serviceRecipients"))
      || !/district attorney/i.test(entries("serviceMethod"))
      || !/not less than 20 days before the hearing/i.test(entries("serviceTiming"))) {
      failures.push(`${ncDnaKey} does not preserve the exact separate-branch service recipient, method, and timing evidence`);
    }
  }
  const ncDismissalKey = "obligation:track-only:NC:nc_146_dismissal_petition";
  const ncDismissalWork = (context.worklist?.packetFamilies ?? []).flatMap((family) => family.routes ?? []).find((row) => row.routeKey === ncDismissalKey);
  for (const field of ["serviceRecipients", "serviceMethod", "serviceTiming"]) {
    const text = ncDismissalWork?.deliverable?.[field]?.entries?.join(" ") ?? "";
    if (/DNA expunction|20 days before the hearing/i.test(text)) failures.push(`${ncDismissalKey} imports service facts from the separate DNA-expunction matter`);
  }

  const flatDeliverableText = (routeKeyValue) => {
    const workRoute = (context.worklist?.packetFamilies ?? []).flatMap((family) => family.routes ?? []).find((row) => row.routeKey === routeKeyValue);
    return DELIVERABLE_FIELDS.flatMap((field) => workRoute?.deliverable?.[field]?.entries ?? []).join(" ");
  };
  const unitLeakageFixtures = [
    [
      "obligation:unit:UT:ut_pet_no_charges:ut_pet_no_charges-bci-certificate",
      /\b(?:1000EX|1020EX|1044XX|victim notice|proposed order|acceptance of service|consent and waiver of hearing)\b/i,
      "Utah BCI-certificate stage imports court-petition sibling components",
    ],
    [
      "obligation:unit:UT:ut_pet_no_charges:ut_pet_no_charges-court-petition",
      /\bBCI Application for Expungement of Adult Criminal History\b/i,
      "Utah court-petition stage imports the BCI-application sibling primary",
    ],
    [
      "obligation:unit:MT:mt_misdemeanor_expungement:mt-misdemeanor-criss-implementation",
      /\b(?:Petition for Expungement of Misdemeanor Records|proposed order|five-year|\$120|district-court petition)\b/i,
      "Montana CRISS stage imports district-court sibling pleading, fee, or wait facts",
    ],
    [
      "obligation:unit:RI:ri_deferred_sentence:ri-deferred-sentence-stage-2-court-motion-and-affidavit",
      /\b(?:at least ten days|delivers one to the Attorney General|three certified copies|charging police department)\b/i,
      "Rhode Island document stage imports stage-three notice, service, or delivery facts",
    ],
  ];
  for (const [key, forbidden, label] of unitLeakageFixtures) {
    const obligation = routes.find((row) => row.routeKey === key);
    if (!obligation || forbidden.test(flatDeliverableText(key))) failures.push(`${label}: ${key}`);
  }
  for (const [jurisdiction, trackId, pathwayId] of EXPECTED_TRACK_CONTRACT_MECHANISM_REVIEWS) {
    const track = independent?.trackRows?.find((row) => row.jurisdiction === jurisdiction && row.trackId === trackId);
    const contract = independent?.effectiveContractRows?.find(({ contract: row }) => row.jurisdiction === jurisdiction && row.pathwayId === pathwayId)?.contract;
    const key = `obligation:track-pathway:${jurisdiction}:${trackId}:${pathwayId}`;
    const row = routes.find((candidate) => candidate.routeKey === key);
    if (!track
      || track.outputStrategy !== "process_guidance"
      || !["participant_packet", "agency_application"].includes(contract?.outcomeMode)
      || !row
      || row.possibleCategory !== "NEEDS_LEGAL_REVIEW"
      || row.participantCanInitiate !== true
      || row.currentOutputStrategy !== "process_guidance"
      || !row.currentImplementationEvidence?.some((item) => item.startsWith(`exact-mechanism-conflict:track=${trackId}:`))) {
      failures.push(`${key} silently resolves an exact no-filing/current-stage track versus participant-contract mechanism conflict`);
    }
  }
  {
    const key = "obligation:track-pathway:MN:mn_299c11_arrest_demand:arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11";
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === "MN" && row.trackId === "mn_299c11_arrest_demand");
    const sourceContract = independent?.effectiveContractRows?.find(({ contract }) => contract.routeKey === "MN:arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11")?.contract;
    const row = routes.find((candidate) => candidate.routeKey === key);
    if (sourceTrack?.outputStrategy !== "custom_pleading"
      || sourceContract?.outcomeMode !== "agency_application"
      || !row
      || row.possibleCategory !== "NEEDS_LEGAL_REVIEW"
      || row.participantCanInitiate !== true
      || row.currentOutputStrategy !== null
      || row.packetFamilyId !== null
      || !row.currentImplementationEvidence?.some((item) => item.startsWith("exact-output-treatment-conflict:track=mn_299c11_arrest_demand:"))) {
      failures.push(`${key} silently resolves the approved custom-pleading track versus effective agency-application contract conflict`);
    }
  }
  for (const [countName, expectedCount] of Object.entries(actualClassificationCounts)) {
    for (const [outputLabel, output] of [["canonical", context.canonical], ["candidate", context.candidates], ["jurisdiction summary", context.summary]]) {
      if (output?.counts?.[countName] !== expectedCount) failures.push(`${outputLabel} stale counter for ${countName}: expected ${expectedCount}, received ${output?.counts?.[countName]}`);
    }
  }
  const participantActionCount = countBy(routes, (row) => row.participantCanInitiate === true);
  for (const [outputLabel, output] of [["canonical", context.canonical], ["candidate", context.candidates], ["jurisdiction summary", context.summary]]) {
    if (output?.counts?.totalDistinctParticipantActionBranches !== participantActionCount) failures.push(`${outputLabel} stale counter for totalDistinctParticipantActionBranches: expected ${participantActionCount}, received ${output?.counts?.totalDistinctParticipantActionBranches}`);
  }

  const mappings = context.canonical?.sourceToCanonicalMappings ?? [];
  exactArray("source-to-canonical mapping", mappings.map((row) => row.sourceRouteKey), entities.map((row) => row.routeKey), failures);
  for (const mapping of mappings) {
    if (!Array.isArray(mapping.canonicalObligationKeys) || mapping.canonicalObligationKeys.length === 0) failures.push(`source entity ${mapping.sourceRouteKey} is unaccounted for by canonical obligations`);
    for (const key of mapping.canonicalObligationKeys ?? []) {
      if (!obligations.some((row) => row.routeKey === key)) failures.push(`source mapping ${mapping.sourceRouteKey} points to missing canonical obligation ${key}`);
    }
  }
  for (const obligation of obligations) {
    if (!Array.isArray(obligation.sourceEntityKeys) || obligation.sourceEntityKeys.length === 0) failures.push(`${obligation.routeKey} has no typed source accounting`);
    for (const key of obligation.sourceEntityKeys ?? []) {
      if (!entities.some((row) => row.routeKey === key)) failures.push(`${obligation.routeKey} cites missing typed source ${key}`);
      const reverse = mappings.find((row) => row.sourceRouteKey === key)?.canonicalObligationKeys ?? [];
      if (!reverse.includes(obligation.routeKey)) failures.push(`source-to-canonical accounting is not bidirectional for ${key} -> ${obligation.routeKey}`);
    }
  }
  const independentlyAccountedObligationKeys = unique(mappings.flatMap((mapping) => mapping.canonicalObligationKeys ?? []));
  exactArray("canonical obligation versus independently enumerated source mappings", obligations.map((row) => row.routeKey), independentlyAccountedObligationKeys, failures);

  const packetSpecificationCoverage = context.canonical?.packetSpecificationCoverage ?? [];
  exactArray(
    "packet specification source accounting",
    packetSpecificationCoverage.map((row) => row.specificationIdentity),
    independent?.packetSpecificationIdentities ?? [],
    failures,
  );
  if (duplicates(packetSpecificationCoverage.map((row) => row.specificationIdentity)).length) {
    failures.push(`duplicate packet specification source identity: ${duplicates(packetSpecificationCoverage.map((row) => row.specificationIdentity)).join(", ")}`);
  }
  for (const coverage of packetSpecificationCoverage) {
    if (!Array.isArray(coverage.canonicalObligationKeys) || coverage.canonicalObligationKeys.length === 0) {
      failures.push(`packet specification ${coverage.specificationIdentity} is not accounted for by a canonical obligation`);
      continue;
    }
    for (const key of coverage.canonicalObligationKeys) {
      if (!obligations.some((row) => row.routeKey === key)) failures.push(`packet specification ${coverage.specificationIdentity} points to missing canonical obligation ${key}`);
      const candidate = routes.find((row) => row.routeKey === key);
      if (!candidate?.currentImplementationEvidence?.some((item) => item.startsWith(`packet-specification:${coverage.specificationIdentity}:`))) {
        failures.push(`packet specification accounting is not bidirectional for ${coverage.specificationIdentity} -> ${key}`);
      }
    }
  }
  for (const specification of independent?.packetSpecifications ?? []) {
    const coverage = packetSpecificationCoverage.find((row) => row.specificationIdentity === specification.specificationIdentity);
    if (!coverage) continue;
    const expectedTargets = unique(specification.sourceRouteKeys.flatMap((sourceRouteKey) =>
      mappings.find((mapping) => mapping.sourceRouteKey === sourceRouteKey)?.canonicalObligationKeys ?? []));
    if (!expectedTargets.length) failures.push(`packet specification ${specification.specificationIdentity} has no exact typed source target`);
    else if (!sameSet(coverage.canonicalObligationKeys ?? [], expectedTargets)) failures.push(`packet specification ${specification.specificationIdentity} target mapping does not match its exact track/pathway source identities`);
  }
  const evidencedPacketSpecifications = routes.flatMap((row) => (row.currentImplementationEvidence ?? [])
    .filter((item) => item.startsWith("packet-specification:"))
    .map((item) => packetSpecificationCoverage.find((coverage) => item.startsWith(`packet-specification:${coverage.specificationIdentity}:`))?.specificationIdentity ?? item));
  for (const identity of evidencedPacketSpecifications) {
    if (!packetSpecificationCoverage.some((coverage) => coverage.specificationIdentity === identity)) failures.push(`candidate cites unaccounted packet specification evidence ${identity}`);
  }
  if (!sameSet((context.canonical?.unattachedDecisionFindings ?? []).map((row) => row.trackId), independent?.unattachedDecisionTrackIds ?? [])) {
    failures.push("unattached legal-decision route accounting drift");
  }

  for (const entity of entities.filter((row) => row.entityType === "legal_track_unit")) {
    const parent = entities.find((row) => row.routeKey === entity.parentRouteKey);
    if (!parent || parent.entityType !== "legal_track" || parent.jurisdiction !== entity.jurisdiction) {
      failures.push(`parent-unit integrity failure for ${entity.routeKey}: missing parent ${entity.parentRouteKey}`);
    }
  }
  const trackRouteKeysWithUnits = new Set(entities.filter((row) => row.entityType === "legal_track_unit").map((row) => row.parentRouteKey));
  const sharedFormOnlyEdgeIds = new Set((independent?.sharedFormOnlyCrosswalkConflicts ?? []).flatMap((conflict) => conflict.edgeIds));
  const heldPresentationEdgeIds = new Set((independent?.heldPresentationCrosswalkConflicts ?? []).flatMap((conflict) => conflict.edgeIds));
  const unitParentExpansionEdges = (independent?.representationEdges ?? []).filter((edge) =>
    trackRouteKeysWithUnits.has(edge.trackRouteKey)
      && !sharedFormOnlyEdgeIds.has(edge.edgeId)
      && !heldPresentationEdgeIds.has(edge.edgeId));
  for (const edge of unitParentExpansionEdges) {
    const unitSourceKeys = entities.filter((row) => row.entityType === "legal_track_unit" && row.parentRouteKey === edge.trackRouteKey).map((row) => row.routeKey);
    const unitTargets = unique(unitSourceKeys.flatMap((sourceRouteKey) =>
      mappings.find((mapping) => mapping.sourceRouteKey === sourceRouteKey)?.canonicalObligationKeys ?? []));
    const pathwayMapping = mappings.find((mapping) => mapping.sourceRouteKey === edge.pathwayRouteKey);
    const pathwayTargets = pathwayMapping?.canonicalObligationKeys ?? [];
    if (!unitTargets.length || !unitTargets.every((routeKey) => pathwayTargets.includes(routeKey))) {
      failures.push(`unit-parent expansion ${edge.edgeId} invents a one-to-one unit assignment or omits a parent expansion`);
    }
    if (pathwayMapping?.accountingRelation !== "parent_expansion_without_unit_assignment") {
      failures.push(`unit-parent expansion ${edge.edgeId} lacks the explicit parent_expansion_without_unit_assignment accounting mode`);
    }
  }

  const sourceIdentityGroups = new Map();
  for (const entity of entities) {
    const key = `${entity.entityType}:${entity.sourceIdentity}`;
    const group = sourceIdentityGroups.get(key) ?? [];
    group.push(entity.routeKey);
    sourceIdentityGroups.set(key, group);
  }
  for (const [identity, routeKeys] of sourceIdentityGroups) {
    if (routeKeys.length > 1) failures.push(`duplicate semantic identity / source identity collision: ${identity}; the same route requires an explicit alias and distinct remedies may not be collapsed`);
  }
  const effectiveContractIdentityGroups = new Map();
  for (const { contract } of independent?.effectiveContractRows ?? []) {
    const identity = `${contract.jurisdiction}:${contract.pathwayId}`;
    const rows = effectiveContractIdentityGroups.get(identity) ?? [];
    rows.push(contract.routeKey);
    effectiveContractIdentityGroups.set(identity, rows);
  }
  for (const [identity, routeKeys] of effectiveContractIdentityGroups) {
    const distinctRouteKeys = unique(routeKeys);
    if (distinctRouteKeys.length < 2) continue;
    const explicitAliasCovers = (independent?.aliasRegistry?.aliases ?? []).some((alias) => {
      const values = flattenStrings(alias);
      return distinctRouteKeys.every((routeKey) => values.includes(routeKey));
    });
    const explicitRevalidationCovers = (independent?.aliasRegistry?.revalidations ?? []).some((revalidation) => {
      const values = flattenStrings(revalidation);
      return distinctRouteKeys.every((routeKey) => values.includes(routeKey));
    });
    if (!explicitAliasCovers && !explicitRevalidationCovers) {
      failures.push(`duplicate current contract identity ${identity} uses two route keys without an explicit alias or revalidation: ${distinctRouteKeys.join(", ")}`);
    }
  }
  const obligationIdentities = obligations.map((row) => row.sourceIdentity);
  if (duplicates(obligationIdentities).length) failures.push(`duplicate semantic identity among canonical obligations: ${duplicates(obligationIdentities).join(", ")}`);

  const edgeIds = context.canonical?.representationEdges?.map((edge) => edge.edgeId) ?? [];
  const independentEdges = independent?.representationEdges ?? [];
  const edgeSignature = (edge) => stable({
    edgeId: edge.edgeId,
    jurisdiction: edge.jurisdiction,
    trackRouteKey: edge.trackRouteKey,
    pathwayRouteKey: edge.pathwayRouteKey,
    relationshipTypes: sorted(edge.relationshipTypes ?? []),
    sourceDirections: sorted(edge.sourceDirections ?? []),
    canonicalizationDisposition: edge.canonicalizationDisposition,
  });
  if (!sameSet(edgeIds, independentEdges.map((edge) => edge.edgeId))
    || !sameSet((context.canonical?.representationEdges ?? []).map(edgeSignature), independentEdges.map(edgeSignature))) {
    failures.push("crosswalk bidirectional accounting failure; representation edge set mismatch");
  }
  const rejectedConflictEdgeIds = new Set([
    ...(independent?.sharedFormOnlyCrosswalkConflicts ?? []).flatMap((conflict) => conflict.edgeIds),
    ...(independent?.heldPresentationCrosswalkConflicts ?? []).flatMap((conflict) => conflict.edgeIds),
  ]);
  for (const edge of context.canonical?.representationEdges ?? []) {
    if (!entities.some((row) => row.routeKey === edge.trackRouteKey) || !entities.some((row) => row.routeKey === edge.pathwayRouteKey)) {
      failures.push(`crosswalk edge ${edge.edgeId} points to an unaccounted typed entity`);
    }
    const trackObligations = new Set(mappings.find((row) => row.sourceRouteKey === edge.trackRouteKey)?.canonicalObligationKeys ?? []);
    const pathwayObligations = mappings.find((row) => row.sourceRouteKey === edge.pathwayRouteKey)?.canonicalObligationKeys ?? [];
    const sharesTerminalObligation = pathwayObligations.some((key) => trackObligations.has(key));
    if (rejectedConflictEdgeIds.has(edge.edgeId) && sharesTerminalObligation) {
      failures.push(`rejected crosswalk fidelity conflict ${edge.edgeId} improperly collapses distinct statutory remedies`);
    } else if (!rejectedConflictEdgeIds.has(edge.edgeId) && !sharesTerminalObligation) {
      failures.push(`crosswalk remedy collapse for ${edge.edgeId}; track and pathway lack a shared explicit terminal obligation`);
    }
  }
  const sharedFormOnlyConflicts = independent?.sharedFormOnlyCrosswalkConflicts ?? [];
  if (sharedFormOnlyConflicts.length !== 1
    || sharedFormOnlyConflicts[0]?.pathwayRouteKey !== "pathway:SC:juvenile-expungement"
    || !sharedFormOnlyConflicts[0]?.trackRouteKeys.includes("track:SC:sc_17_22_950_summary")) {
    failures.push("shared-form-only crosswalk conflict source accounting drift; expected the sole SC juvenile/summary conflict");
  }
  for (const conflict of sharedFormOnlyConflicts) {
    const pathwayTargets = mappings.find((row) => row.sourceRouteKey === conflict.pathwayRouteKey)?.canonicalObligationKeys ?? [];
    const trackTargets = unique(conflict.trackRouteKeys.flatMap((sourceRouteKey) =>
      mappings.find((row) => row.sourceRouteKey === sourceRouteKey)?.canonicalObligationKeys ?? []));
    const conflictCandidate = pathwayTargets.length === 1 ? routes.find((row) => row.routeKey === pathwayTargets[0]) : null;
    const conflictObligation = pathwayTargets.length === 1 ? obligations.find((row) => row.routeKey === pathwayTargets[0]) : null;
    if (pathwayTargets.length !== 1
      || pathwayTargets.some((routeKey) => trackTargets.includes(routeKey))
      || conflictCandidate?.possibleCategory !== "NEEDS_LEGAL_REVIEW"
      || conflictCandidate?.runtimePathwayId !== conflict.pathwayId
      || conflictObligation?.sourceEntityKeys?.some((sourceRouteKey) => conflict.trackRouteKeys.includes(sourceRouteKey))) {
      failures.push(`shared-form-only runtime route ${conflict.pathwayRouteKey} lacks its own legal-review obligation or remains collapsed into a distinct remedy`);
    }
    const inheritedAdultText = [
      conflictCandidate?.participantFacingInstrument,
      typeof conflictCandidate?.destination === "string" ? conflictCandidate.destination : JSON.stringify(conflictCandidate?.destination),
      ...(conflictCandidate?.requiredSourceIds ?? []),
      ...(conflictCandidate?.currentImplementationEvidence ?? []),
    ].join(" ");
    if (conflictCandidate?.packetFamilyId !== null
      || conflictCandidate?.packetSetId !== null
      || /scca[ -]?223e/i.test(inheritedAdultText)
      || (!/^not recorded\b/i.test(String(conflictCandidate?.destination))
        && /summary court|summary-court|solicitor/i.test(String(conflictCandidate?.destination)))) {
      failures.push(`shared-form-only runtime route ${conflict.pathwayRouteKey} improperly inherits an adult summary-route destination, packet identity, or SCCA-223E treatment`);
    }
  }

  const heldPresentationConflicts = independent?.heldPresentationCrosswalkConflicts ?? [];
  const canonicalCrosswalkConflicts = context.canonical?.crosswalkFidelityConflicts ?? [];
  const reportedCrosswalkConflicts = context.duplicateReport?.crosswalkFidelityConflicts ?? [];
  if (canonicalCrosswalkConflicts.length !== sharedFormOnlyConflicts.length + heldPresentationConflicts.length
    || !sameSet(canonicalCrosswalkConflicts.map((row) => row.conflictId), reportedCrosswalkConflicts.map((row) => row.conflictId))) {
    failures.push("crosswalk fidelity conflict coverage/counters disagree between raw conflicts and generated reports");
  }
  for (const conflict of heldPresentationConflicts) {
    const expectedConflictId = `${conflict.routeKey}:held-presentation-crosswalk`;
    const report = canonicalCrosswalkConflicts.find((row) => row.conflictId === expectedConflictId);
    const pathwayTargets = mappings.find((row) => row.sourceRouteKey === conflict.pathwayRouteKey)?.canonicalObligationKeys ?? [];
    const trackTargets = unique(conflict.trackRouteKeys.flatMap((sourceRouteKey) =>
      mappings.find((row) => row.sourceRouteKey === sourceRouteKey)?.canonicalObligationKeys ?? []));
    const affectedTargets = unique([...pathwayTargets, ...trackTargets]);
    const affectedCandidates = routes.filter((row) => affectedTargets.includes(row.routeKey));
    if (!report
      || stable(report.sourceRecord) !== stable(conflict.sourceRecord)
      || report.canonicalizationDisposition !== "REJECTED_HELD_PRESENTATION_CONFLATION_PENDING_EXACT_CROSSWALK_AND_COMPILED_PROFILE_REPAIR"
      || !sameSet(report.canonicalObligationKeys ?? [], affectedTargets)
      || pathwayTargets.some((routeKey) => trackTargets.includes(routeKey))) {
      failures.push(`held route-presentation conflict ${conflict.routeKey} is not preserved as an exact rejected crosswalk finding with distinct terminal remedies`);
    }
    for (const edgeId of conflict.edgeIds) {
      const edge = context.canonical?.representationEdges?.find((row) => row.edgeId === edgeId);
      if (edge?.canonicalizationDisposition !== "REJECTED_HELD_PRESENTATION_CONFLATION_PENDING_EXACT_CROSSWALK_AND_COMPILED_PROFILE_REPAIR") {
        failures.push(`held presentation edge ${edgeId} has a disposition inconsistent with its rejected fidelity finding`);
      }
    }
    for (const candidate of affectedCandidates) {
      if (!candidate.currentImplementationEvidence?.includes(`route-presentation-conflict:${conflict.status}:${conflict.routeKey}:${conflict.classification}`)
        || !candidate.currentImplementationEvidence?.includes(`rejected-crosswalk-edge:held-route-presentation-conflict:${conflict.routeKey}`)) {
        failures.push(`${candidate.routeKey} omits exact held route-presentation conflict evidence for ${conflict.routeKey}`);
      }
      if (candidate.possibleCategory === "A_MUST_FULFILL") {
        const worklistRoute = (context.worklist?.packetFamilies ?? []).flatMap((family) => family.routes ?? [])
          .find((row) => row.routeKey === candidate.routeKey);
        if (!candidate.missingImplementationWork?.some((item) => /held route-presentation conflict/i.test(item))
          || !worklistRoute?.workTypes?.includes("PRODUCT_WIRING_REQUIRED")) {
          failures.push(`${candidate.routeKey} lacks product-wiring work for held route-presentation conflict ${conflict.routeKey}`);
        }
      }
    }
  }
  if (context.canonical?.counts?.totalCrosswalkFidelityConflicts !== canonicalCrosswalkConflicts.length
    || context.summary?.counts?.totalCrosswalkFidelityConflicts !== canonicalCrosswalkConflicts.length
    || context.duplicateReport?.counts?.crosswalkFidelityConflicts !== canonicalCrosswalkConflicts.length) {
    failures.push("crosswalk fidelity conflict counter drift");
  }
  const emittedLegalTrackGaps = context.duplicateReport?.legalTracksWithoutRuntime ?? [];
  const expectedLegalTrackGaps = independent?.legalTracksWithoutRuntime ?? [];
  if (emittedLegalTrackGaps.length !== expectedLegalTrackGaps.length
    || unique(emittedLegalTrackGaps.map((row) => row.sourceRouteKey)).length !== emittedLegalTrackGaps.length
    || !sameSet(emittedLegalTrackGaps.map(stable), expectedLegalTrackGaps.map(stable))
    || context.duplicateReport?.counts?.legalTracksWithoutRuntime !== (independent?.legalTracksWithoutRuntime ?? []).length) {
    failures.push("legal tracks without runtime identity findings drift from the exact raw crosswalk set");
  }
  const emittedRuntimeGaps = context.duplicateReport?.runtimeWithoutCurrentLegalDesignTrack ?? [];
  const expectedRuntimeGaps = independent?.runtimeWithoutCurrentLegalDesignTrack ?? [];
  if (emittedRuntimeGaps.length !== expectedRuntimeGaps.length
    || unique(emittedRuntimeGaps.map((row) => row.sourceRouteKey)).length !== emittedRuntimeGaps.length
    || !sameSet(emittedRuntimeGaps.map(stable), expectedRuntimeGaps.map(stable))
    || context.duplicateReport?.counts?.runtimeWithoutCurrentLegalDesignTrack !== (independent?.runtimeWithoutCurrentLegalDesignTrack ?? []).length) {
    failures.push("runtime pathways without a current legal-design track drift from the exact raw/rejected crosswalk set");
  }

  const rawRouteKindRows = independent?.routeKindAdjudicationRows ?? [];
  const canonicalRouteKindRows = context.canonical?.routeKindAdjudicationFindings ?? [];
  const reportedRouteKindRows = context.duplicateReport?.routeKindAdjudicationFindings ?? [];
  if (rawRouteKindRows.length !== 40 || unique(rawRouteKindRows.map((row) => row.routeKey)).length !== 40) {
    failures.push("raw route-kind adjudication source drift; expected 40 unique current records");
  }
  exactArray("route-kind adjudication", canonicalRouteKindRows.map((row) => row.routeKey), rawRouteKindRows.map((row) => row.routeKey), failures);
  if (canonicalRouteKindRows.length !== rawRouteKindRows.length
    || reportedRouteKindRows.length !== rawRouteKindRows.length
    || unique(canonicalRouteKindRows.map((row) => row.routeKey)).length !== canonicalRouteKindRows.length
    || unique(reportedRouteKindRows.map((row) => row.routeKey)).length !== reportedRouteKindRows.length
    || !sameSet(canonicalRouteKindRows.map(stable), reportedRouteKindRows.map(stable))) {
    failures.push("route-kind adjudication findings disagree between canonical and duplicate/fidelity reports");
  }
  for (const adjudication of rawRouteKindRows) {
    const contract = independent?.effectiveContractRows?.find(({ contract: row }) => row.routeKey === adjudication.routeKey)?.contract;
    const expectedTargets = contract
      ? mappings.find((row) => row.sourceRouteKey === `pathway:${contract.jurisdiction}:${contract.pathwayId}`)?.canonicalObligationKeys ?? []
      : [];
    const finding = canonicalRouteKindRows.find((row) => row.routeKey === adjudication.routeKey);
    const rawFieldsPreserved = finding && Object.entries(adjudication).every(([key, value]) => stable(finding[key]) === stable(value));
    if (!contract
      || !rawFieldsPreserved
      || !sameSet(finding?.canonicalObligationKeys ?? [], expectedTargets)
      || finding?.censusDisposition !== (adjudication.status === "pending"
        ? "PENDING_PRODUCT_WIRING_AND_PARTICIPANT_PRESENTATION_PROOF_NO_COMMERCIAL_AUTHORITY_GRANTED"
        : "APPLIED_SOURCE_RECORD_PRESERVED_NO_NEW_AUTHORITY_GRANTED")) {
      failures.push(`route-kind adjudication ${adjudication.routeKey} lacks exact raw evidence, effective contract association, or canonical targets`);
      continue;
    }
    for (const target of expectedTargets) {
      const candidate = routes.find((row) => row.routeKey === target);
      const requiredEvidence = [
        `route-kind-adjudication:${adjudication.status}:${adjudication.routeKey}:${adjudication.decisionId}`,
        `route-kind-contract-evidence:${adjudication.routeKey}:${adjudication.contractSays}`,
        `route-kind-evaluator-evidence:${adjudication.routeKey}:${adjudication.heuristicSaid}:prior=${adjudication.priorResultCode}:conclusive=${adjudication.priorResultCodeIsConclusive ?? "not-recorded"}`,
      ];
      if (!candidate || !requiredEvidence.every((evidence) => candidate.currentImplementationEvidence?.includes(evidence))) {
        failures.push(`${target} omits exact contract/evaluator evidence for route-kind adjudication ${adjudication.routeKey}`);
      }
      if (adjudication.status === "pending" && candidate?.possibleCategory === "A_MUST_FULFILL") {
        const worklistRoute = (context.worklist?.packetFamilies ?? []).flatMap((family) => family.routes ?? [])
          .find((row) => row.routeKey === target);
        if (!candidate.missingImplementationWork?.some((item) => /pending contract-versus-evaluator route-kind adjudication/i.test(item))
          || !worklistRoute?.workTypes?.includes("PRODUCT_WIRING_REQUIRED")) {
          failures.push(`${target} lacks exact pending route-kind product-wiring work for ${adjudication.routeKey}`);
        }
      }
    }
  }
  const pendingRouteKinds = rawRouteKindRows.filter((row) => row.status === "pending").length;
  const appliedRouteKinds = rawRouteKindRows.filter((row) => row.status === "applied").length;
  for (const output of [context.canonical, context.summary]) {
    if (output?.counts?.totalRouteKindAdjudications !== rawRouteKindRows.length
      || output?.counts?.pendingRouteKindAdjudications !== pendingRouteKinds
      || output?.counts?.appliedRouteKindAdjudications !== appliedRouteKinds) {
      failures.push("route-kind adjudication counter drift from raw source rows");
    }
  }
  if (context.duplicateReport?.counts?.routeKindAdjudications !== rawRouteKindRows.length
    || context.duplicateReport?.counts?.pendingRouteKindAdjudications !== pendingRouteKinds) {
    failures.push("duplicate/fidelity report route-kind adjudication counter drift from raw source rows");
  }

  const expectedDecisionConflicts = independent?.decisionFidelityConflictSources ?? [];
  const canonicalDecisionConflicts = context.canonical?.decisionFidelityConflicts ?? [];
  const reportedDecisionConflicts = context.duplicateReport?.decisionFidelityConflicts ?? [];
  exactArray("decision fidelity conflict", canonicalDecisionConflicts.map((row) => row.conflictId), expectedDecisionConflicts.map((row) => row.conflictId), failures);
  exactArray("reported decision fidelity conflict", reportedDecisionConflicts.map((row) => row.conflictId), expectedDecisionConflicts.map((row) => row.conflictId), failures);
  if (!sameSet(canonicalDecisionConflicts.map(stable), reportedDecisionConflicts.map(stable))) {
    failures.push("decision fidelity conflict records disagree between the canonical census and duplicate/alias report");
  }
  if (context.canonical?.counts?.totalDecisionFidelityConflicts !== expectedDecisionConflicts.length
    || context.summary?.counts?.totalDecisionFidelityConflicts !== expectedDecisionConflicts.length
    || context.duplicateReport?.counts?.decisionFidelityConflicts !== expectedDecisionConflicts.length) {
    failures.push(`decision fidelity conflict counter drift; expected ${expectedDecisionConflicts.length}`);
  }
  const lawrenceOregonDecisionText = (independent?.lawrenceOregonDecisions ?? []).flatMap((decision) => decision.recordedAuthority ?? []).join(" ");
  if ((independent?.lawrenceOregonDecisions ?? []).length !== 2
    || !/paragraph \(1\)\(c\) applies only when no accusatory instrument was filed/i.test(lawrenceOregonDecisionText)
    || !/separate packet sets are required/i.test(lawrenceOregonDecisionText)) {
    failures.push("independent Lawrence Oregon subsection/packet-scope decision source is missing or incomplete");
  }
  for (const expectedConflict of expectedDecisionConflicts) {
    const conflict = canonicalDecisionConflicts.find((row) => row.conflictId === expectedConflict.conflictId);
    if (!conflict) continue;
    const pathwaySourceKey = `pathway:${expectedConflict.jurisdiction}:${expectedConflict.runtimePathwayId}`;
    const expectedTargets = unique([
      ...(mappings.find((row) => row.sourceRouteKey === pathwaySourceKey)?.canonicalObligationKeys ?? []),
      ...(expectedConflict.researchSourceRouteKey
        ? mappings.find((row) => row.sourceRouteKey === expectedConflict.researchSourceRouteKey)?.canonicalObligationKeys ?? []
        : []),
    ]);
    if (conflict.jurisdiction !== expectedConflict.jurisdiction
      || conflict.runtimePathwayId !== expectedConflict.runtimePathwayId
      || !sameSet(conflict.mappedRegistryTrackIds ?? [], expectedConflict.mappedRegistryTrackIds)
      || !sameSet(conflict.legalDecisionRecordIds ?? [], expectedConflict.legalDecisionRecordIds)
      || !sameSet(conflict.canonicalObligationKeys ?? [], expectedTargets)
      || conflict.sourceFile !== expectedConflict.sourceFile
      || conflict.sourceSha256 !== expectedConflict.sourceSha256
      || typeof conflict.sourceProvenance !== "string" || !conflict.sourceProvenance.trim()
      || typeof conflict.fidelityDisposition !== "string" || !conflict.fidelityDisposition.trim()
      || typeof conflict.requiredPatch !== "string" || !conflict.requiredPatch.trim()) {
      failures.push(`decision fidelity conflict ${expectedConflict.conflictId} does not preserve its exact source identities, terminal targets, disposition, and required patch`);
    }
    if (expectedConflict.jurisdiction === "OR") {
      const sourceEvidence = `lawrence-decision-source:${expectedConflict.sourceFile}:${expectedConflict.sourceSha256}`;
      const joined = routes.filter((row) => expectedTargets.includes(row.routeKey));
      if (conflict.sourceFile !== expectedConflict.sourceFile
        || conflict.sourceSha256 !== expectedConflict.sourceSha256
        || typeof conflict.sourceProvenance !== "string"
        || !expectedConflict.legalDecisionRecordIds.every((id) => conflict.sourceProvenance.includes(id.replace("legal-question:", "")))
        || !joined.length
        || joined.some((row) => row.possibleCategory !== "NEEDS_LEGAL_REVIEW")
        || joined.some((row) => !expectedConflict.legalDecisionRecordIds.every((id) => row.legalDecisionRecordIds.includes(id)))
        || joined.some((row) => !row.currentImplementationEvidence.includes(sourceEvidence))) {
        failures.push("Oregon Lawrence subsection/packet-scope conflict lacks exact source fingerprint/provenance or a legal-review candidate joined to both decisions");
      }
    }
  }

  const actualHidden = obligations.filter((row) => row.hiddenParticipantBranch).map((row) => row.routeKey);
  if (actualHidden.length !== 87) failures.push(`audited hidden participant-branch count drift: expected 87, received ${actualHidden.length}`);
  for (const routeKey of actualHidden) {
    if (routes.find((row) => row.routeKey === routeKey)?.participantCanInitiate !== true) failures.push(`hidden participant branch ${routeKey} is not marked participant-initiatable`);
  }
  const ndHidden = "obligation:service-branch:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:pre_effective_date_petition";
  if (!actualHidden.includes(ndHidden)) failures.push("staged route hides the North Dakota pre-effective participant-filed branch");
  const ndPreEffectiveCandidate = routes.find((row) => row.routeKey === ndHidden);
  if (!ndPreEffectiveCandidate || ndPreEffectiveCandidate.possibleCategory !== "A_MUST_FULFILL" || ndPreEffectiveCandidate.currentOutputStrategy !== "official_pdf_fill" || ndPreEffectiveCandidate.trackId !== "nd-nonconviction-close-petition" || ndPreEffectiveCandidate.participantCanInitiate !== true) {
    failures.push("North Dakota pre-effective petition branch is not joined to its exact approved petition track and official-form treatment");
  }

  const stablePacketFamilyIds = new Set(independent?.stablePacketFamilyIds ?? []);
  const pendingCensusPacketFamilyIds = new Set((independent?.pendingCensusPacketFamilies ?? []).map((row) => row.packetFamilyId));
  const stablePacketSetIds = new Set(independent?.stablePacketSetIds ?? []);

  for (const row of routes) {
    for (const field of REQUIRED_CANDIDATE_FIELDS) {
      if (!Object.hasOwn(row, field)) failures.push(`${row.routeKey ?? "unknown route"} is missing required field ${field}`);
    }
    if (!CATEGORY_VALUES.includes(row.possibleCategory)) failures.push(`${row.routeKey} has no category candidate or invalid category ${row.possibleCategory}`);
    if (!Array.isArray(row.requiredSourceIds)) failures.push(`${row.routeKey} requiredSourceIds must be an array`);
    if (!Array.isArray(row.existingArtifactIds)) failures.push(`${row.routeKey} existingArtifactIds must be an array`);
    if (!Array.isArray(row.legalDecisionRecordIds)) failures.push(`${row.routeKey} legalDecisionRecordIds must be an array`);
    if (!Array.isArray(row.currentImplementationEvidence)) failures.push(`${row.routeKey} currentImplementationEvidence must be an array`);
    if (![true, false, null].includes(row.participantCanInitiate)) failures.push(`${row.routeKey} participantCanInitiate must be boolean or null`);
    if (!["high", "medium", "low"].includes(row.classificationConfidence)) failures.push(`${row.routeKey} has invalid classification confidence ${row.classificationConfidence}`);
    if (row.packetFamilyId !== null && !stablePacketFamilyIds.has(row.packetFamilyId) && !pendingCensusPacketFamilyIds.has(row.packetFamilyId)) failures.push(`${row.routeKey} packetFamilyId is not a stable or exact census-pending packet family identity: ${row.packetFamilyId}`);
    if (row.packetSetId !== null && !stablePacketSetIds.has(row.packetSetId)) failures.push(`${row.routeKey} packetSetId is not a stable packet-set identity: ${row.packetSetId}`);
    if (row.possibleCategory === "A_MUST_FULFILL"
      && /^(?:obligation:track-only:|obligation:track-pathway:|obligation:unit:)/.test(row.routeKey)
      && row.trackId) {
      const sourceTrack = independent?.trackRows?.find((track) => track.jurisdiction === row.jurisdiction && track.trackId === row.trackId);
      const sourcePacketSet = independent?.packetSetRows?.find((packetSet) => packetSet.jurisdiction === row.jurisdiction && packetSet.trackId === row.trackId) ?? sourceTrack?.packetSet;
      const explicitParticipantApplicationTreatment = row.currentImplementationEvidence
        .some((item) => item.startsWith("participant-agency-application-treatment:"));
      if (sourcePacketSet?.packetSetId && row.packetSetId !== sourcePacketSet.packetSetId
        && !explicitParticipantApplicationTreatment) {
        failures.push(`${row.routeKey} candidate packet-set treatment disagrees with its exact legal-track source`);
      }
    }
    for (const artifactId of row.existingArtifactIds ?? []) {
      if (typeof artifactId !== "string" || artifactId.length > 300 || /[\r\n]/.test(artifactId)
        || !/^(?:source-artifact|grade-a-(?:fixture|output-artifact-sha256|packet-specification|filing-artifact-sha256|companion-artifact)):/i.test(artifactId)) {
        failures.push(`${row.routeKey} existingArtifactIds contains prose or a non-identity value`);
      }
    }

    if (row.possibleCategory === "B_LEGITIMATE_EXCLUSION") {
      if (!CATEGORY_B_REASONS.includes(row.possibleCategoryBReason)) failures.push(`${row.routeKey} uses unauthorized Category B reason ${row.possibleCategoryBReason}`);
      const normalizedActor = String(row.processActor).toLowerCase();
      if (row.possibleCategoryBReason === "AGENCY_CONTROLLED" && !/agency|clerk|department|board|bureau/.test(normalizedActor)) failures.push(`${row.routeKey} Category B agency-controlled reason contradicts processActor ${row.processActor}`);
      if (row.possibleCategoryBReason === "PROSECUTOR_CONTROLLED" && !/prosecut/.test(normalizedActor)) failures.push(`${row.routeKey} Category B prosecutor-controlled reason contradicts processActor ${row.processActor}`);
      if (row.possibleCategoryBReason === "COURT_INITIATED" && !/court|judge/.test(normalizedActor)) failures.push(`${row.routeKey} Category B court-initiated reason contradicts processActor ${row.processActor}`);
      if (row.possibleCategoryBReason === "AUTOMATIC" && /^(?:participant|petitioner|applicant|defendant|requestor)\b/.test(normalizedActor)) failures.push(`${row.routeKey} Category B automatic reason contradicts a participant processActor`);
      if (Array.isArray(row.missingImplementationWork) && row.missingImplementationWork.some((item) => /missing|not held|not proven|unfinished|unknown|manual|not tested|technical review|source|form|artifact|fee|court|local rule/i.test(String(item)))) {
        failures.push(`${row.routeKey} has missing implementation evidence treated as Category B; a missing form or source cannot be Category B`);
      }
      if (row.requiresLegalReview !== false || row.legalReviewQuestion !== null) failures.push(`${row.routeKey} Category B review flags are inconsistent`);
      if (row.participantCanInitiate === true) failures.push(`${row.routeKey} Category B contradicts an explicit participant-initiatable filing`);
    } else if (row.possibleCategoryBReason !== null) {
      failures.push(`${row.routeKey} has a Category B reason outside Category B`);
    }

    if (row.possibleCategory === "A_MUST_FULFILL") {
      if (!normalizeStrategy(row.currentOutputStrategy)) failures.push(`${row.routeKey} Category A has an invalid output strategy or no exact output strategy`);
      const explicitAgencyApplication = row.currentOutputStrategy === "participant_agency_application" && row.participantFacingInstrument !== "not recorded";
      const explicitOfficialForm = hasExplicitOfficialFormTreatment(row);
      if (!row.packetFamilyId && !row.packetSetId && !/composed|custom_pleading/i.test(String(row.currentOutputStrategy)) && !explicitAgencyApplication && !explicitOfficialForm) failures.push(`${row.routeKey} Category A has no packet-family, exact official form, or explicit composed packet treatment`);
      if (!row.packetFamilyId && !row.packetSetId && row.currentOutputStrategy === "official_pdf_fill"
        && row.currentImplementationEvidence.some((item) => item.startsWith("route-contract-packet-family-label:"))) {
        const missingWork = row.missingImplementationWork.join(" ");
        if (!/source/i.test(missingWork) || !/(?:form|field) map/i.test(missingWork) || !/wir(?:e|ing)|packet family/i.test(missingWork)) {
          failures.push(`${row.routeKey} contract-labeled official-form treatment omits source, map, or packet-identity wiring work`);
        }
      }
      if (!Array.isArray(row.missingImplementationWork) || row.missingImplementationWork.length === 0) failures.push(`${row.routeKey} Category A has no enumerated missing-work list`);
      if (row.participantCanInitiate !== true) failures.push(`${row.routeKey} Category A is not marked as a participant-action branch`);
      if (row.requiresLegalReview !== false || row.legalReviewQuestion !== null) failures.push(`${row.routeKey} Category A review flags are inconsistent`);
    }

    if (row.possibleCategory === "NEEDS_LEGAL_REVIEW") {
      if (row.requiresLegalReview !== true || typeof row.legalReviewQuestion !== "string" || !row.legalReviewQuestion.trim()) failures.push(`${row.routeKey} legal-review candidate lacks one narrow review question`);
    }

    for (const decisionId of row.legalDecisionRecordIds ?? []) {
      const scopedDecisions = independent?.scopedDecisionRecords?.filter((decision) => decision.decisionId === decisionId) ?? [];
      if (!scopedDecisions.length) continue;
      const routeIdentities = unique([
        row.trackId,
        row.runtimePathwayId,
        row.routeContractId,
      ].filter(Boolean));
      const matchesAtLeastOneScopedRecord = scopedDecisions.some((scopedDecision) => {
        const scopedIdentities = [...scopedDecision.tracks, ...scopedDecision.pathways];
        return !scopedIdentities.length || routeIdentities.some((identity) => scopedIdentities.includes(identity));
      });
      if (!matchesAtLeastOneScopedRecord) {
        failures.push(`${row.routeKey} overjoins unrelated legal decision ${decisionId}`);
      }
    }
  }

  for (const row of routes.filter((candidate) => /obligation:(?:service-branch|failure-disposition):/.test(candidate.routeKey))) {
    const retainedTrackIds = row.trackId ? [row.trackId] : [];
    const expectedTrackDecisionIds = unique((independent?.scopedDecisionRecords ?? [])
      .filter((decision) => (decision.tracks ?? []).some((trackId) => retainedTrackIds.includes(trackId)))
      .map((decision) => decision.decisionId));
    for (const decisionId of expectedTrackDecisionIds) {
      if (!(row.legalDecisionRecordIds ?? []).includes(decisionId)) {
        failures.push(`${row.routeKey} derived service/failure branch omits exact retained-track legal decision association ${decisionId}`);
      }
    }
  }

  const actualPendingCensusFamilies = routes.filter((row) => row.packetFamilyId?.startsWith("census-pending-family:"));
  exactArray(
    "census-pending packet family",
    actualPendingCensusFamilies.map((row) => row.packetFamilyId),
    (independent?.pendingCensusPacketFamilies ?? []).map((row) => row.packetFamilyId),
    failures,
  );
  for (const expectedFamily of independent?.pendingCensusPacketFamilies ?? []) {
    const candidate = actualPendingCensusFamilies.find((row) => row.packetFamilyId === expectedFamily.packetFamilyId);
    const family = (context.worklist?.packetFamilies ?? []).find((row) => row.packetFamilyId === expectedFamily.packetFamilyId);
    const expectedEvidence = `census-pending-family-identity:${expectedFamily.packetFamilyId}:packet-mode=${expectedFamily.packetMode}:contract-label=${expectedFamily.contractPacketFamily}:no-shared-authority`;
    if (!candidate
      || ![
        `obligation:runtime-only:${expectedFamily.jurisdiction}:${expectedFamily.pathwayId}`,
        `obligation:runtime-contract-cohort:${expectedFamily.jurisdiction}:${expectedFamily.pathwayId}:`,
      ].some((prefix) => candidate.routeKey === prefix || candidate.routeKey.startsWith(prefix))
      || candidate.routeContractId !== expectedFamily.routeContractId
      || candidate.possibleCategory !== "A_MUST_FULFILL"
      || candidate.currentOutputStrategy !== "official_pdf_fill"
      || candidate.packetSetId !== null
      || candidate.requiredSourceIds.some((sourceId) => sourceId.startsWith("official-form:"))
      || !candidate.currentImplementationEvidence.includes(expectedEvidence)
      || !candidate.missingImplementationWork.some((item) => item.includes(expectedFamily.packetFamilyId) && /grants no runtime, approval, or commercial authority/i.test(item))
      || family?.worklistGroupId !== expectedFamily.packetFamilyId
      || family?.implementationStrategy !== "official_pdf_fill"
      || !["OFFICIAL_SOURCE_ACQUISITION_REQUIRED", "OFFICIAL_FORM_MAP_REQUIRED", "PRODUCT_WIRING_REQUIRED", "ARTIFACT_REVIEW_REQUIRED", "OUTPUT_LEGAL_APPROVAL_REQUIRED"].every((workType) => family?.workTypes?.includes(workType))) {
      failures.push(`census-pending packet family ${expectedFamily.packetFamilyId} lacks its exact contract/packet-mode evidence, no-authority boundary, or source/map/wiring work`);
    }
  }
  for (const output of [context.canonical, context.candidates, context.summary]) {
    if (output?.counts?.pendingCensusPacketFamilies !== (independent?.pendingCensusPacketFamilies ?? []).length) {
      failures.push("census-pending packet-family counter drift");
    }
  }

  const obligationByKey = new Map(obligations.map((obligation) => [obligation.routeKey, obligation]));
  for (const pathway of (independent?.crosswalk?.compiledPathways ?? []).filter((row) => (row.mappedRegistryTrackIds ?? []).length > 1)) {
    const pathwaySourceKey = `pathway:${pathway.jurisdiction}:${pathway.compiledPathwayId}`;
    const pathwayTargets = new Set(mappings.find((row) => row.sourceRouteKey === pathwaySourceKey)?.canonicalObligationKeys ?? []);
    for (const trackId of pathway.mappedRegistryTrackIds) {
      const trackSourceKey = `track:${pathway.jurisdiction}:${trackId}`;
      const trackTargets = mappings.find((row) => row.sourceRouteKey === trackSourceKey)?.canonicalObligationKeys ?? [];
      const exactTargets = trackTargets.filter((routeKey) => pathwayTargets.has(routeKey));
      const sourceTrack = independent.trackRows.find((row) => row.jurisdiction === pathway.jurisdiction && row.trackId === trackId);
      if (!sourceTrack || sourceTrack.units?.length || !exactTargets.length) continue;
      const sourcePacketSet = independent.packetSetRows.find((row) => row.jurisdiction === pathway.jurisdiction && row.trackId === trackId) ?? sourceTrack.packetSet;
      const allowedOfficialForms = new Set([
        ...(independent.sourceRelationships ?? []).filter((row) => row.jurisdiction === pathway.jurisdiction && row.trackId === trackId).map((row) => row.officialFormId),
        ...(sourceTrack.officialSources ?? []).map((source) => typeof source === "string" ? null : source.officialFormId),
        ...(sourcePacketSet?.components ?? []).map((component) => component.officialFormId),
      ].filter(Boolean));
      for (const target of exactTargets) {
        const candidate = routes.find((row) => row.routeKey === target);
        if (!candidate?.currentImplementationEvidence?.includes(`multi-track-runtime-edge:per-track-treatment-preserved:${trackId}`)) {
          failures.push(`${target} lacks the per-track treatment-isolation invariant for multi-track runtime ${pathway.compiledPathwayId}`);
          continue;
        }
        const citedOfficialForms = (candidate.requiredSourceIds ?? [])
          .filter((sourceId) => sourceId.startsWith("official-form:"))
          .map((sourceId) => sourceId.slice("official-form:".length));
        if (citedOfficialForms.some((formId) => !allowedOfficialForms.has(formId))) {
          failures.push(`${target} inherits an official form from a sibling track on multi-track runtime ${pathway.compiledPathwayId}`);
        }
        if (candidate.possibleCategory !== "NEEDS_LEGAL_REVIEW") {
          const exactStrategy = sourceTrack.outputStrategy ?? null;
          const exactSourceTreatmentOverride = candidate.currentImplementationEvidence
            .some((item) => /professional-handoff-treatment|future-effective-treatment|participant-agency-application-treatment/.test(item));
          if (exactStrategy && candidate.currentOutputStrategy !== exactStrategy
            && !exactSourceTreatmentOverride) {
            failures.push(`${target} inherits a sibling output strategy instead of exact track ${trackId} treatment`);
          }
          if (sourcePacketSet?.packetSetId && candidate.packetSetId !== sourcePacketSet.packetSetId
            && !exactSourceTreatmentOverride) {
            failures.push(`${target} inherits a sibling packet set instead of exact track ${trackId} treatment`);
          }
          if ((sourceTrack.automatic === true || sourceTrack.outputStrategy === "process_guidance")
            && /automatic/i.test(flattenStrings([sourceTrack.legalName, sourceTrack.publicName, sourceTrack.mechanism, sourceTrack.destination]).join(" "))
            && (candidate.possibleCategory !== "B_LEGITIMATE_EXCLUSION"
              || candidate.possibleCategoryBReason !== "AUTOMATIC"
              || candidate.participantCanInitiate !== false)) {
            failures.push(`${target} automatic exact track is not preserved as B / AUTOMATIC on a divergent multi-track runtime`);
          }
        }
      }
    }
  }

  for (const candidate of routes.filter((row) => row.routeKey.startsWith("obligation:runtime-only:") && row.routeContractId)) {
    const contract = independent?.effectiveContractRows?.find(({ contract: row }) => row.routeKey === candidate.routeContractId)?.contract;
    if (!contract) continue;
    const rawActor = exactContractActor(contract);
    if (/prosecut/.test(String(candidate.processActor).toLowerCase()) && rawActor !== "prosecutor") {
      failures.push(`${candidate.routeKey} infers a prosecutor actor from non-route-scoped profile text`);
    }
    if (contract.outcomeMode === "guidance_status" && candidate.possibleCategory === "B_LEGITIMATE_EXCLUSION" && rawActor !== "not recorded") {
      const expectedReason = rawActor === "agency" ? "AGENCY_CONTROLLED" : rawActor === "prosecutor" ? "PROSECUTOR_CONTROLLED" : "COURT_INITIATED";
      if (candidate.possibleCategoryBReason !== expectedReason) failures.push(`${candidate.routeKey} guidance Category B reason disagrees with its exact route-contract actor`);
    }
    if (!contract.destination && contract.mechanism && stable(candidate.destination) === stable(contract.mechanism)) {
      failures.push(`${candidate.routeKey} uses a route mechanism as a filing destination fallback`);
    }
  }
  const mappedRoutesForSource = (sourceRouteKey) => {
    const targetKeys = mappings.find((mapping) => mapping.sourceRouteKey === sourceRouteKey)?.canonicalObligationKeys ?? [];
    return targetKeys.map((routeKey) => routes.find((row) => row.routeKey === routeKey)).filter(Boolean);
  };
  const routeSearchText = (row) => [
    row.routeKey,
    row.publicLabel,
    row.participantFacingInstrument,
    typeof row.destination === "string" ? row.destination : JSON.stringify(row.destination),
    row.currentServiceDisposition,
    ...(row.currentImplementationEvidence ?? []),
  ].join(" ");
  const isHiddenParticipantBranch = (row) => obligationByKey.get(row.routeKey)?.hiddenParticipantBranch === true;
  const researchSourceKey = (trackId) => independent?.researchTrackDecisions?.find((decision) => decision.trackId === trackId)?.sourceRouteKey;
  const requireMappedDecisionBranch = (sourceRouteKey, label, predicate) => {
    if (!sourceRouteKey || !mappedRoutesForSource(sourceRouteKey).some(predicate)) failures.push(`${label} decision branch is missing or misclassified`);
  };
  const requireExactDecisionMerge = (trackId, expectedObligationKey) => {
    const sourceRouteKey = researchSourceKey(trackId);
    const targetKeys = mappings.find((mapping) => mapping.sourceRouteKey === sourceRouteKey)?.canonicalObligationKeys ?? [];
    const obligation = obligations.find((row) => row.routeKey === expectedObligationKey);
    const candidate = routes.find((row) => row.routeKey === expectedObligationKey);
    if (!sourceRouteKey
      || !sameSet(targetKeys, [expectedObligationKey])
      || !obligation?.sourceEntityKeys?.includes(sourceRouteKey)
      || !candidate?.legalDecisionRecordIds?.includes(`research-track-decision:${trackId}`)
      || !candidate?.currentImplementationEvidence?.includes(`national-legal-decision:data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json#${trackId}`)
      || obligations.some((row) => row.routeKey.startsWith(`obligation:research-decision-route:${row.jurisdiction}:${trackId}`))) {
      failures.push(`research decision ${trackId} is not merged into its exact preexisting canonical obligation with decision provenance preserved`);
    }
  };
  for (const decision of independent?.researchTrackDecisions ?? []) {
    const entity = entities.find((row) => row.routeKey === decision.sourceRouteKey);
    const mapped = mappings.find((row) => row.sourceRouteKey === decision.sourceRouteKey)?.canonicalObligationKeys ?? [];
    const exactMerge = new Set(["ak-set-aside", "oh-ls-5"]).has(decision.trackId);
    const prefix = `obligation:${decision.entityType.replaceAll("_", "-")}:${decision.jurisdiction}:${decision.trackId}`;
    const expectedTargets = exactMerge
      ? mapped
      : obligations.filter((obligation) => obligation.routeKey === prefix || obligation.routeKey.startsWith(`${prefix}:`)).map((obligation) => obligation.routeKey);
    const reverseExact = mapped.every((routeKey) => obligations.find((obligation) => obligation.routeKey === routeKey)?.sourceEntityKeys?.includes(decision.sourceRouteKey));
    if (!entity
      || entity.entityType !== decision.entityType
      || !mapped.length
      || (!exactMerge && (!expectedTargets.length || !sameSet(mapped, expectedTargets)))
      || !reverseExact) {
      failures.push(`research decision ${decision.jurisdiction}:${decision.trackId} is not represented by its exact typed source entity and exact branch target set`);
    }
  }

  const akSetAsideObligationKey = "obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085";
  requireExactDecisionMerge("ak-set-aside", akSetAsideObligationKey);
  requireMappedDecisionBranch(researchSourceKey("ak-set-aside"), "Alaska belated set-aside", (row) =>
    row.routeKey === akSetAsideObligationKey && row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "custom_pleading");

  const akCannabisRoutes = mappedRoutesForSource(researchSourceKey("ak-cannabis-seal"));
  const akCannabis2027 = akCannabisRoutes.find((row) => row.routeKey === "obligation:unattached-decision-route:AK:ak-cannabis-seal");
  const akCannabis2028 = akCannabisRoutes.find((row) => row.routeKey === "obligation:unattached-decision-route:AK:ak-cannabis-seal:automatic_nondisclosure_from_2028");
  if (akCannabisRoutes.length !== 2
    || !akCannabis2027
    || !/2027/.test(routeSearchText(akCannabis2027))
    || !/request/i.test(routeSearchText(akCannabis2027))
    || !akCannabis2028
    || !/2028/.test(routeSearchText(akCannabis2028))
    || !/automatic|no participant filing/i.test(routeSearchText(akCannabis2028))
    || akCannabisRoutes.some((row) => row.possibleCategory !== "B_LEGITIMATE_EXCLUSION"
      || row.possibleCategoryBReason !== "FUTURE_EFFECTIVE" || row.participantCanInitiate !== false)) {
    failures.push("Alaska cannabis decision is not split into exact 2027 participant-request and 2028 automatic FUTURE_EFFECTIVE branches");
  }

  const akCorrectionRoutes = mappedRoutesForSource(researchSourceKey("ak-correct-record"));
  const akCorrectionInitial = akCorrectionRoutes.find((row) => row.routeKey === "obligation:unattached-decision-route:AK:ak-correct-record");
  const akCorrectionAppeal = akCorrectionRoutes.find((row) => row.routeKey === "obligation:unattached-decision-route:AK:ak-correct-record:final_adverse_superior_court_appeal_handoff");
  if (akCorrectionRoutes.length !== 2
    || !akCorrectionInitial
    || akCorrectionInitial.possibleCategory !== "A_MUST_FULFILL"
    || akCorrectionInitial.currentOutputStrategy !== "participant_agency_application"
    || !akCorrectionAppeal
    || akCorrectionAppeal.possibleCategory !== "B_LEGITIMATE_EXCLUSION"
    || akCorrectionAppeal.possibleCategoryBReason !== "UNSUITABLE_FOR_SELF_HELP"
    || akCorrectionAppeal.participantCanInitiate !== false
    || !/superior.*court|appeal|handoff/i.test(routeSearchText(akCorrectionAppeal))) {
    failures.push("Alaska record correction lacks its exact agency-request branch plus final-adverse Superior Court attorney-handoff exclusion");
  }
  requireMappedDecisionBranch(researchSourceKey("al-olr"), "Alabama order of limited relief", (row) =>
    row.possibleCategory === "A_MUST_FULFILL"
      && row.currentOutputStrategy === "official_pdf_fill"
      && row.requiredSourceIds.some((sourceId) => sourceId.startsWith("official-form:"))
      && row.participantFacingInstrument !== "not recorded");
  requireMappedDecisionBranch(researchSourceKey("al-uncharged-arrest"), "Alabama uncharged-arrest agency request", (row) =>
    row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "participant_agency_application");
  requireMappedDecisionBranch(researchSourceKey("al-uncharged-arrest"), "Alabama uncharged-arrest judicial appeal", (row) =>
    isHiddenParticipantBranch(row)
      && row.possibleCategory === "NEEDS_LEGAL_REVIEW"
      && row.requiresLegalReview === true
      && /appeal|court/i.test(routeSearchText(row)));
  requireMappedDecisionBranch(researchSourceKey("ca-1203-4b"), "California section 1203.4b firefighter packet", (row) =>
    row.possibleCategory === "A_MUST_FULFILL"
      && row.currentOutputStrategy === "official_pdf_fill"
      && row.requiredSourceIds.some((sourceId) => sourceId.startsWith("official-form:"))
      && row.participantFacingInstrument !== "not recorded");
  requireMappedDecisionBranch(researchSourceKey("co_mistaken_identity_expungement"), "Colorado mistaken-identity agency-first stage", (row) =>
    row.possibleCategory === "B_LEGITIMATE_EXCLUSION" && row.possibleCategoryBReason === "AGENCY_CONTROLLED" && row.participantCanInitiate === false);
  requireMappedDecisionBranch(researchSourceKey("co_mistaken_identity_expungement"), "Colorado mistaken-identity finding request", (row) =>
    isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "participant_agency_application");
  requireMappedDecisionBranch(researchSourceKey("co_mistaken_identity_expungement"), "Colorado mistaken-identity day-90 court petition", (row) =>
    isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "custom_pleading" && /90|court|petition/i.test(routeSearchText(row)));
  requireMappedDecisionBranch(researchSourceKey("ny_160_55_violation"), "New York section 160.55 automatic stage", (row) =>
    row.possibleCategory === "B_LEGITIMATE_EXCLUSION" && row.possibleCategoryBReason === "AUTOMATIC" && row.participantCanInitiate === false);
  requireMappedDecisionBranch(researchSourceKey("ny_160_55_violation"), "New York section 160.55 court correction", (row) =>
    isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "custom_pleading" && /court|sentencing/i.test(routeSearchText(row)));
  requireMappedDecisionBranch(researchSourceKey("ny_160_55_violation"), "New York section 160.55 DCJS correction", (row) =>
    isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "participant_agency_application" && /dcjs|agency/i.test(routeSearchText(row)));
  requireMappedDecisionBranch(researchSourceKey("ny_160_55_violation"), "New York section 160.55 legacy motion", (row) =>
    row.possibleCategory === "NEEDS_LEGAL_REVIEW" && /legacy|pre.?1991|motion/i.test(routeSearchText(row)));
  const ohioLs5ObligationKey = "obligation:track-pathway:OH:oh_marijuana_expungement:marijuana-hashish-possession-expungement-under-2953-321";
  requireExactDecisionMerge("oh-ls-5", ohioLs5ObligationKey);
  requireMappedDecisionBranch(researchSourceKey("oh-ls-5"), "Ohio marijuana/hashish expungement", (row) =>
    row.routeKey === ohioLs5ObligationKey && row.possibleCategory === "A_MUST_FULFILL" && row.currentOutputStrategy === "custom_pleading");

  const sdSisRoutes = mappedRoutesForSource("track:SD:sd_sis_sealing");
  if (!sdSisRoutes.some((row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION" && row.possibleCategoryBReason === "AUTOMATIC" && row.participantCanInitiate === false)) failures.push("South Dakota SIS initial automatic sealing branch is missing or misclassified");
  if (!sdSisRoutes.some((row) => isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && /written.*request|implementation.*request/i.test(routeSearchText(row)))) failures.push("South Dakota SIS hidden written implementation-request branch is missing or misclassified");
  if (!sdSisRoutes.some((row) => isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && /enforce|enforcement/i.test(routeSearchText(row)))) failures.push("South Dakota SIS hidden enforcement-motion branch is missing or misclassified");
  if (!sdSisRoutes.some((row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION" && row.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP" && /handoff|refusal|mandamus|attorney/i.test(routeSearchText(row)))) failures.push("South Dakota SIS contested-refusal handoff branch is missing or misclassified");

  const scSummaryRoutes = mappedRoutesForSource("track:SC:sc_17_22_950_summary");
  if (!scSummaryRoutes.some((row) => isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && /written.*request|implementation.*request/i.test(routeSearchText(row)))) failures.push("South Carolina summary-court hidden implementation-request branch is missing or misclassified");
  if (!scSummaryRoutes.some((row) => isHiddenParticipantBranch(row) && row.possibleCategory === "A_MUST_FULFILL" && /enforce|enforcement/i.test(routeSearchText(row)))) failures.push("South Carolina summary-court hidden enforcement-motion branch is missing or misclassified");

  const westVirginiaPardonKey = "obligation:track-pathway:WV:wv_pardon_expungement:pardon-based-expungement";
  const westVirginiaPardonTrack = independent?.trackRows?.find((row) => row.jurisdiction === "WV" && row.trackId === "wv_pardon_expungement");
  const westVirginiaPardon = routes.find((row) => row.routeKey === westVirginiaPardonKey);
  if (westVirginiaPardonTrack?.outputStrategy !== "custom_pleading"
    || westVirginiaPardonTrack?.packetSet?.packetSetId !== "wv_pardon_expungement-set"
    || !westVirginiaPardonTrack?.packetSet?.participantActionRequired?.some((action) => action.kind === "file" && /file the petition/i.test(action.description))
    || westVirginiaPardon?.possibleCategory !== "A_MUST_FULFILL"
    || westVirginiaPardon?.participantCanInitiate !== true
    || westVirginiaPardon?.currentOutputStrategy !== "custom_pleading"
    || westVirginiaPardon?.packetSetId !== "wv_pardon_expungement-set"
    || !/petition|primary_filing/i.test(String(westVirginiaPardon?.participantFacingInstrument))
    || !/circuit court/i.test(typeof westVirginiaPardon?.destination === "string" ? westVirginiaPardon.destination : JSON.stringify(westVirginiaPardon?.destination))) {
    failures.push("West Virginia pardon-expungement participant petition is incorrectly treated as guidance or Category B instead of exact-track Category A fulfillment work");
  }
  for (const trackId of ["nd-dna-profile-removal-routing", "nd-unconstitutional-arrest-expungement-routing"]) {
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === "ND" && row.trackId === trackId);
    const candidate = routes.find((row) => row.routeKey === `obligation:track-only:ND:${trackId}`);
    if (!sourceTrack?.selfHelpBoundaries?.some((boundary) => /attorney handoff in every case/i.test(boundary))
      || candidate?.possibleCategory !== "B_LEGITIMATE_EXCLUSION"
      || candidate?.possibleCategoryBReason !== "UNSUITABLE_FOR_SELF_HELP"
      || candidate?.participantCanInitiate !== false
      || !/attorney|professional/i.test(String(candidate?.processActor))
      || !/attorney|professional/i.test(`${candidate?.participantFacingInstrument} ${typeof candidate?.destination === "string" ? candidate.destination : JSON.stringify(candidate?.destination)}`)) {
      failures.push(`North Dakota professional-handoff route ${trackId} is not preserved as B / UNSUITABLE_FOR_SELF_HELP with an exact attorney handoff`);
    }
  }

  const mixedStageReviewRoutes = [
    {
      routeKey: "obligation:track-pathway:KY:ky_juvenile_record_expungement:juvenile-automatic-dismissal",
      routeContractId: "KY:juvenile-automatic-dismissal",
      jurisdiction: "KY",
      trackId: "ky_juvenile_record_expungement",
      packetSetId: "ky_juvenile_record_expungement-set",
      officialFormId: "AOC-JV-30",
      sourceParticipantPattern: /petition/i,
      reviewQuestionPattern: /automatic|no-filing/i,
      participantQuestionPattern: /participant petition|AOC-JV-30/i,
      failureLabel: "Kentucky juvenile mixed automatic-dismissal and AOC-JV-30 petition route",
    },
    {
      routeKey: "obligation:track-pathway:MT:mt_nonconviction_removal:non-conviction-criminal-history-removal-through-criss",
      routeContractId: "MT:non-conviction-criminal-history-removal-through-criss",
      jurisdiction: "MT",
      trackId: "mt_nonconviction_removal",
      packetSetId: "mt_nonconviction_removal-set",
      officialFormId: "EXPUNGEMENTREMOVALREQUESTFORM.DOCX",
      sourceParticipantPattern: /request/i,
      reviewQuestionPattern: /automatic.*CRISS|CRISS.*automatic/i,
      participantQuestionPattern: /participant.*request|request.*participant/i,
      failureLabel: "Montana mixed automatic CRISS-removal and participant correction-request route",
    },
  ];
  for (const expected of mixedStageReviewRoutes) {
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === expected.jurisdiction && row.trackId === expected.trackId);
    const sourceContract = independent?.effectiveContractRows?.find(({ contract }) => contract.routeKey === expected.routeContractId)?.contract;
    const sourceComponents = sourceTrack?.packetSet?.components ?? [];
    const candidate = routes.find((row) => row.routeKey === expected.routeKey);
    if (!(sourceContract?.outcomeMode === "automatic_relief" || sourceContract?.stage === "automatic")
      || sourceTrack?.outputStrategy !== "official_pdf_fill"
      || sourceTrack?.packetSet?.packetSetId !== expected.packetSetId
      || !sourceComponents.some((component) => component.officialFormId === expected.officialFormId && component.role === "primary_filing")
      || !expected.sourceParticipantPattern.test(String(sourceTrack?.mechanism))
      || candidate?.routeContractId !== expected.routeContractId
      || candidate?.possibleCategory !== "NEEDS_LEGAL_REVIEW"
      || candidate?.possibleCategoryBReason !== null
      || candidate?.requiresLegalReview !== true
      || candidate?.participantCanInitiate !== true
      || candidate?.currentOutputStrategy !== "official_pdf_fill"
      || candidate?.packetSetId !== expected.packetSetId
      || !String(candidate?.participantFacingInstrument).includes(expected.officialFormId)
      || !expected.reviewQuestionPattern.test(String(candidate?.legalReviewQuestion))
      || !expected.participantQuestionPattern.test(String(candidate?.legalReviewQuestion))
      || !candidate?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("mixed-stage-conflict:"))) {
      failures.push(`${expected.failureLabel} is not preserved as an exact participant-form treatment pending explicit branch separation`);
    }
  }

  const destinationText = (row) => typeof row.destination === "string" ? row.destination : JSON.stringify(row.destination);
  const newMexicoCannabisKey = "obligation:track-pathway:NM:nm_cannabis:cannabis-expungement";
  const newMexicoCannabisTrack = independent?.trackRows?.find((row) => row.jurisdiction === "NM" && row.trackId === "nm_cannabis");
  const newMexicoCannabis = routes.find((row) => row.routeKey === newMexicoCannabisKey);
  if (newMexicoCannabisTrack?.outputStrategy !== "process_guidance"
    || newMexicoCannabisTrack?.packetSet?.packetSetId !== "nm_cannabis-set"
    || !/automatically expunged.*Administrative Office of the Courts.*request expedited automatic expungement/i.test(String(newMexicoCannabisTrack?.mechanism))
    || !newMexicoCannabisTrack?.packetSet?.components?.some((component) => component.role === "aoc_application_instructions")
    || !newMexicoCannabisTrack?.packetSet?.participantActionRequired?.some((action) => /participant completes.*Application for Expungement.*submits it to the AOC/i.test(action.description))
    || newMexicoCannabis?.possibleCategory !== "NEEDS_LEGAL_REVIEW"
    || newMexicoCannabis?.possibleCategoryBReason !== null
    || newMexicoCannabis?.requiresLegalReview !== true
    || newMexicoCannabis?.participantCanInitiate !== true
    || newMexicoCannabis?.currentOutputStrategy !== "process_guidance"
    || newMexicoCannabis?.packetSetId !== "nm_cannabis-set"
    || !/AOC Application for Expungement/i.test(String(newMexicoCannabis?.participantFacingInstrument))
    || !/automatic verification branch.*participant AOC application branch|participant AOC application branch.*automatic verification branch/i.test(String(newMexicoCannabis?.legalReviewQuestion))
    || !newMexicoCannabis?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("mixed-stage-conflict:"))) {
    failures.push("New Mexico cannabis automatic-expungement and participant AOC-application stages are not preserved as an exact mixed-stage legal-review conflict");
  }

  const minnesotaCannabisKey = "obligation:track-pathway:MN:mn_auto_cannabis_nonfelony:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06";
  const minnesotaCannabisPathwayKey = "MN:cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06";
  const minnesotaCannabisContradiction = independent?.contradictionRows?.find((row) => row.pathwayKey === minnesotaCannabisPathwayKey);
  const minnesotaCannabis = routes.find((row) => row.routeKey === minnesotaCannabisKey);
  if (minnesotaCannabisContradiction?.proposal?.authority !== null
    || minnesotaCannabisContradiction?.proposal?.decidedOn !== null
    || minnesotaCannabisContradiction?.adjudication?.serviceDisposition !== "selection_only"
    || !minnesotaCannabisContradiction?.adjudication?.conflatesDistinctMechanisms?.some((mechanism) => /automatic cannabis expungement/i.test(mechanism))
    || !minnesotaCannabisContradiction?.adjudication?.conflatesDistinctMechanisms?.some((mechanism) => /Cannabis Expungement Board review/i.test(mechanism))
    || minnesotaCannabis?.routeContractId !== minnesotaCannabisPathwayKey
    || minnesotaCannabis?.possibleCategory !== "NEEDS_LEGAL_REVIEW"
    || minnesotaCannabis?.possibleCategoryBReason !== null
    || minnesotaCannabis?.requiresLegalReview !== true
    || minnesotaCannabis?.participantCanInitiate !== null
    || minnesotaCannabis?.currentOutputStrategy !== "process_guidance"
    || minnesotaCannabis?.currentServiceDisposition !== "paid_packet_intended"
    || !/combined automatic BCA and Cannabis Expungement Board mechanisms/i.test(String(minnesotaCannabis?.processActor))
    || !/combines automatic and Board-review treatments/i.test(String(minnesotaCannabis?.participantFacingInstrument))
    || !/automatic and Board-review destinations require separate identities/i.test(destinationText(minnesotaCannabis ?? {}))
    || !/split into its automatic and Board-review mechanisms.*what participant action/i.test(String(minnesotaCannabis?.legalReviewQuestion))
    || !minnesotaCannabis?.currentImplementationEvidence?.includes(`unadopted-closure-contradiction:${minnesotaCannabisPathwayKey}:proposal-authority=null:decidedOn=null`)) {
    failures.push("Minnesota combined automatic/Board cannabis pathway is not preserved as legal review while retaining its current paid_packet_intended service disposition until the null-authority proposal is adopted");
  }

  const rhodeIslandDecriminalizedKey = "obligation:track-pathway:RI:ri_decriminalized:path-g-decriminalized-offense-expungement";
  const rhodeIslandDecriminalizedTrack = independent?.trackRows?.find((row) => row.jurisdiction === "RI" && row.trackId === "ri_decriminalized");
  const rhodeIslandDecriminalized = routes.find((row) => row.routeKey === rhodeIslandDecriminalizedKey);
  if (rhodeIslandDecriminalizedTrack?.outputStrategy !== "official_pdf_fill"
    || rhodeIslandDecriminalizedTrack?.packetSet?.packetSetId !== "ri_decriminalized-set"
    || !rhodeIslandDecriminalizedTrack?.packetSet?.components?.some((component) => component.role === "primary_filing" && component.officialFormId === "DC-33")
    || rhodeIslandDecriminalized?.possibleCategory !== "A_MUST_FULFILL"
    || rhodeIslandDecriminalized?.possibleCategoryBReason !== null
    || rhodeIslandDecriminalized?.requiresLegalReview !== false
    || rhodeIslandDecriminalized?.participantCanInitiate !== true
    || rhodeIslandDecriminalized?.currentOutputStrategy !== "official_pdf_fill"
    || rhodeIslandDecriminalized?.packetSetId !== "ri_decriminalized-set"
    || !/DC-33/.test(String(rhodeIslandDecriminalized?.participantFacingInstrument))
    || !rhodeIslandDecriminalized?.requiredSourceIds?.includes("official-form:DC-33")
    || !rhodeIslandDecriminalized?.missingImplementationWork?.some((work) => /offense-specific decriminalization authority.*official-form source|official-form source.*offense-specific decriminalization authority/i.test(work))) {
    failures.push("Rhode Island decriminalized-offense participant filing is not preserved as exact-track Category A official-form work with its authority/source gap explicit");
  }

  const filingScopeReviewRoutes = [
    {
      jurisdiction: "ND",
      trackId: "nd-juvenile-records-routing",
      routeKey: "obligation:track-only:ND:nd-juvenile-records-routing",
      packetSetId: "nd-juvenile-records-routing-set",
      sourcePattern: /participant-facing.*motion packet.*early destruction|complete official motion packet.*early destruction/i,
      instrumentPattern: /official.*early-destruction motion packet/i,
      destinationPattern: /North Dakota juvenile court/i,
      questionPattern: /separate official-form participant branch.*adult-scope process-guidance|adult-scope process-guidance.*separate official-form participant branch/i,
      failureLabel: "North Dakota juvenile early-destruction filing-scope conflict",
    },
    {
      jurisdiction: "NE",
      trackId: "ne-pardon-routing",
      routeKey: "obligation:track-only:NE:ne-pardon-routing",
      packetSetId: "ne-pardon-routing-set",
      sourcePattern: /participant-facing agency application.*scope restriction|Board of Pardons application.*participant-facing/i,
      instrumentPattern: /Board of Pardons.*participant application/i,
      destinationPattern: /Board of Pardons.*Lincoln.*Omaha.*mayoral-pardon variants/i,
      questionPattern: /participant agency-application branch.*Lincoln.*Omaha.*split|Lincoln.*Omaha.*split.*participant agency-application branch/i,
      failureLabel: "Nebraska pardon application and mayoral-variant filing-scope conflict",
    },
    {
      jurisdiction: "NE",
      trackId: "ne-postconviction-routing",
      routeKey: "obligation:track-only:NE:ne-postconviction-routing",
      packetSetId: "ne-postconviction-routing-set",
      sourcePattern: /participant-facing verified motion/i,
      instrumentPattern: /verified motion.*Postconviction Act/i,
      destinationPattern: /sentencing court.*professional-handoff boundary/i,
      questionPattern: /professional handoff.*every case.*participant-facing verified motion.*separate composed-pleading branch/i,
      failureLabel: "Nebraska postconviction verified-motion filing-scope conflict",
    },
    {
      jurisdiction: "UT",
      trackId: "ut_adj_reduction_402",
      routeKey: "obligation:track-only:UT:ut_adj_reduction_402",
      packetSetId: "ut_adj_reduction_402-set",
      sourcePattern: /reduction motion.*participant pursues one.*filed in the court that entered the conviction|participant wants the reduction motion itself prepared/i,
      instrumentPattern: /motion to reduce.*76-3-402/i,
      destinationPattern: /sentencing court.*professional-handoff boundary/i,
      questionPattern: /separate participant filing.*professional-only handoff|professional-only handoff.*separate participant filing/i,
      failureLabel: "Utah section 76-3-402 participant-motion and professional-handoff conflict",
    },
  ];
  for (const expected of filingScopeReviewRoutes) {
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === expected.jurisdiction && row.trackId === expected.trackId);
    const sourceText = JSON.stringify(sourceTrack);
    const candidate = routes.find((row) => row.routeKey === expected.routeKey);
    const mappedKeys = mappings.find((mapping) => mapping.sourceRouteKey === `track:${expected.jurisdiction}:${expected.trackId}`)?.canonicalObligationKeys ?? [];
    if (!expected.sourcePattern.test(sourceText)
      || !mappedKeys.includes(expected.routeKey)
      || candidate?.possibleCategory !== "NEEDS_LEGAL_REVIEW"
      || candidate?.possibleCategoryBReason !== null
      || candidate?.requiresLegalReview !== true
      || candidate?.participantCanInitiate !== true
      || candidate?.currentOutputStrategy !== "process_guidance"
      || candidate?.packetSetId !== expected.packetSetId
      || !expected.instrumentPattern.test(String(candidate?.participantFacingInstrument))
      || !expected.destinationPattern.test(destinationText(candidate ?? {}))
      || !expected.questionPattern.test(String(candidate?.legalReviewQuestion))
      || !candidate?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("filing-scope-conflict:"))) {
      failures.push(`${expected.failureLabel} is not preserved as a narrow participant-filing legal-review question`);
    }
  }

  const southCarolinaPtiKey = "obligation:track-pathway:SC:sc_pti_17_22_150:diversion-or-program-completion-expungement";
  const southCarolinaPtiTrack = independent?.trackRows?.find((row) => row.jurisdiction === "SC" && row.trackId === "sc_pti_17_22_150");
  const southCarolinaPtiContract = independent?.effectiveContractRows?.find(({ contract }) => contract.routeKey === "SC:diversion-or-program-completion-expungement")?.contract;
  const southCarolinaPti = routes.find((row) => row.routeKey === southCarolinaPtiKey);
  if (southCarolinaPtiTrack?.outputStrategy !== "custom_pleading"
    || southCarolinaPtiTrack?.packetSet?.packetSetId !== "sc_pti_17_22_150-set"
    || !/person may apply.*signature on the application/i.test(String(southCarolinaPtiTrack?.mechanism))
    || !southCarolinaPtiTrack?.packetSet?.participantActionRequired?.some((action) => action.kind === "sign" && /applicant signs the application/i.test(action.description))
    || !southCarolinaPtiTrack?.packetSet?.participantActionRequired?.some((action) => action.kind === "file" && /Apply to the Solicitor's Office/i.test(action.description))
    || southCarolinaPtiContract?.outcomeMode !== "guidance_status"
    || !/participant files no pleading/i.test(String(southCarolinaPtiContract?.timing?.anchorText))
    || southCarolinaPti?.possibleCategory !== "NEEDS_LEGAL_REVIEW"
    || southCarolinaPti?.possibleCategoryBReason !== null
    || southCarolinaPti?.requiresLegalReview !== true
    || southCarolinaPti?.participantCanInitiate !== true
    || southCarolinaPti?.processActor !== "participant"
    || southCarolinaPti?.currentOutputStrategy !== null
    || southCarolinaPti?.currentServiceDisposition !== "non_filing_guidance"
    || !/participant-signed PTI expungement application/i.test(String(southCarolinaPti?.participantFacingInstrument))
    || !/Solicitor's Office/i.test(destinationText(southCarolinaPti ?? {}))
    || !/Category A participant agency-application treatment.*prosecutor-controlled no-filing branch/i.test(String(southCarolinaPti?.legalReviewQuestion))
    || !southCarolinaPti?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("filing-scope-conflict:participant-signed-solicitor-application"))) {
    failures.push("South Carolina PTI participant-signed solicitor application conflict is not preserved as legal review with the current non_filing_guidance service disposition unchanged");
  }

  const rhodeIslandDeferredStageThreeKey = "obligation:unit:RI:ri_deferred_sentence:ri-deferred-sentence-stage-3-notice-hearing-and-certified-copies";
  const rhodeIslandDeferredTrack = independent?.trackRows?.find((row) => row.jurisdiction === "RI" && row.trackId === "ri_deferred_sentence");
  const rhodeIslandDeferredStageThreeSource = rhodeIslandDeferredTrack?.units?.find((unit) => unit.unitId === "ri-deferred-sentence-stage-3-notice-hearing-and-certified-copies");
  const rhodeIslandDeferredStageThree = routes.find((row) => row.routeKey === rhodeIslandDeferredStageThreeKey);
  if (rhodeIslandDeferredStageThreeSource?.outputStrategy !== "process_guidance"
    || rhodeIslandDeferredStageThreeSource?.available !== true
    || !/File with the clerk.*Sign the affidavit.*Attend the hearing.*petitioner delivers/i.test(String(rhodeIslandDeferredStageThreeSource?.description))
    || !obligationByKey.get(rhodeIslandDeferredStageThreeKey)?.hiddenParticipantBranch
    || rhodeIslandDeferredStageThree?.possibleCategory !== "NEEDS_LEGAL_REVIEW"
    || rhodeIslandDeferredStageThree?.possibleCategoryBReason !== null
    || rhodeIslandDeferredStageThree?.requiresLegalReview !== true
    || rhodeIslandDeferredStageThree?.participantCanInitiate !== true
    || rhodeIslandDeferredStageThree?.processActor !== "participant"
    || rhodeIslandDeferredStageThree?.currentOutputStrategy !== "process_guidance"
    || rhodeIslandDeferredStageThree?.packetSetId !== "ri_deferred_sentence-set"
    || !/participant filing.*sworn affidavit.*hearing attendance.*certified-order delivery/i.test(String(rhodeIslandDeferredStageThree?.participantFacingInstrument))
    || !/filing court.*Attorney General BCI unit.*charging police department/i.test(destinationText(rhodeIslandDeferredStageThree ?? {}))
    || !/separate participant procedural branch.*merged into the Category A stage-2 packet obligation/i.test(String(rhodeIslandDeferredStageThree?.legalReviewQuestion))
    || !rhodeIslandDeferredStageThree?.currentImplementationEvidence?.includes("mixed-stage-conflict:deferred-sentence-stage-3-carries-explicit-participant-filing-and-post-order-delivery-duties")) {
    failures.push("Rhode Island deferred-sentence stage 3 is not preserved as a hidden participant filing/hearing/delivery legal-review branch distinct from the stage-2 packet");
  }

  const exactProfessionalHandoffRoutes = [
    ["MN", "mn_inherent_authority", /entire track.*handed off to legal aid or private counsel/i],
    ["ND", "nd-trafficking-vacatur-routing", /attorney or survivor legal clinic handoff.*every case/i],
    ["NE", "ne-immigration-routing", /route to immigration counsel before generating/i],
    ["NH", "nh_supreme_court_record", /outside the packet product|appellate practice is outside/i],
    ["NM", "nm_cannabis_sentence", /outside the packet product|every matter on this track.*referred/i],
    ["OH", "oh_2953_36_trafficking", /outside the current LegalEase self-help scope/i],
    ["OH", "oh_2953_521_trafficking_nonconviction", /outside the current LegalEase self-help scope/i],
    ["RI", "ri_commercial_sexual_activity", /detection and referral only|not packet generation/i],
    ["TN", "tn_trafficking_40_32_105", /referred to counsel and to survivor services/i],
    ["MI", "mi_setaside_csc4_pre2015", /route to counsel in every case/i],
    ["TX", "tx_exp_discretionary", /neither is suitable for an approved template|referred to an attorney or legal aid/i],
    ["UT", "ut_pet_appellate", /outside the current LegalEase self-help scope/i],
    ["WI", "wi_exp_trafficking_2m", /referred out to an attorney or legal aid/i],
  ];
  for (const [jurisdiction, trackId, sourcePattern] of exactProfessionalHandoffRoutes) {
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === jurisdiction && row.trackId === trackId);
    const mappedKeys = mappings.find((mapping) => mapping.sourceRouteKey === `track:${jurisdiction}:${trackId}`)?.canonicalObligationKeys ?? [];
    const mappedCandidates = mappedKeys.map((routeKey) => routes.find((row) => row.routeKey === routeKey));
    const exactTreatment = (candidate) => candidate?.possibleCategory === "B_LEGITIMATE_EXCLUSION"
      && candidate?.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP"
      && candidate?.participantCanInitiate === false
      && candidate?.currentOutputStrategy === "process_guidance"
      && /attorney|professional/i.test(String(candidate?.processActor))
      && /no participant filing/i.test(String(candidate?.participantFacingInstrument))
      && /attorney|legal-assistance handoff/i.test(String(candidate?.participantFacingInstrument))
      && /attorney|legal-assistance referral/i.test(destinationText(candidate ?? {}))
      && candidate?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("professional-handoff-treatment:"));
    if (!sourcePattern.test(JSON.stringify(sourceTrack))
      || mappedCandidates.length === 0
      || mappedCandidates.some((candidate) => !exactTreatment(candidate))) {
      failures.push(`${jurisdiction} ${trackId} is not preserved as an exact source-required professional handoff with B / UNSUITABLE_FOR_SELF_HELP reason fidelity`);
    }
  }

  for (const [jurisdiction, trackId] of [["CT", "ct-provisional-pardon"], ["CT", "ct-absolute-pardon"], ["CT", "ct-destruction-request"]]) {
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === jurisdiction && row.trackId === trackId);
    const mappedKeys = mappings.find((mapping) => mapping.sourceRouteKey === `track:${jurisdiction}:${trackId}`)?.canonicalObligationKeys ?? [];
    const candidates = mappedKeys.map((routeKey) => routes.find((row) => row.routeKey === routeKey));
    const sourceParticipantAction = sourceTrack?.packetSet?.participantActionRequired?.some((action) =>
      ["file", "sign"].includes(action.kind) && /participant|accused|application|request|portal/i.test(String(action.description)));
    if (!sourceParticipantAction || candidates.length === 0 || candidates.some((candidate) =>
      candidate?.possibleCategory !== "A_MUST_FULFILL"
        || candidate?.participantCanInitiate !== true
        || candidate?.processActor !== "participant"
        || candidate?.currentOutputStrategy !== "participant_agency_application"
        || candidate?.packetFamilyId !== null
        || candidate?.packetSetId !== null
        || !candidate?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("participant-agency-application-treatment:"))
        || !candidate?.missingImplementationWork?.some((item) => /participant-facing agency application workflow/i.test(item)))) {
      failures.push(`${jurisdiction} ${trackId} participant-request evidence is not preserved as Category A agency-application work without inventing a stable form or family`);
    }
  }

  {
    const jurisdiction = "OH";
    const trackId = "oh_2953_39_prosecutor";
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === jurisdiction && row.trackId === trackId);
    const mappedKeys = mappings.find((mapping) => mapping.sourceRouteKey === `track:${jurisdiction}:${trackId}`)?.canonicalObligationKeys ?? [];
    const candidates = mappedKeys.map((routeKey) => routes.find((row) => row.routeKey === routeKey));
    if (!/Only the prosecutor may initiate this route/i.test(JSON.stringify(sourceTrack))
      || candidates.length === 0
      || candidates.some((candidate) => candidate?.possibleCategory !== "B_LEGITIMATE_EXCLUSION"
        || candidate?.possibleCategoryBReason !== "PROSECUTOR_CONTROLLED"
        || candidate?.participantCanInitiate !== false
        || candidate?.processActor !== "prosecutor"
        || !candidate?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("prosecutor-controlled-treatment:")))) {
      failures.push("Ohio prosecutor-only § 2953.39 route is not preserved as B / PROSECUTOR_CONTROLLED from its exact source");
    }
  }

  const exactFutureEffectiveRoutes = [
    ["IL", "il-auto-seal-2028", "obligation:track-only:IL:il-auto-seal-2028", /beginning January 1, 2028|before January 1, 2028/i],
    ["IL", "il-auto-seal-2029", "obligation:track-pathway:IL:il-auto-seal-2029:clean-slate-automatic-sealing", /operative January 1, 2029|before January 1, 2029/i],
    ["LA", "la-985-2-automated-expungement", "obligation:track-pathway:LA:la-985-2-automated-expungement:automated-expungement-status-verification-art-985-2", /subject to the appropriate funding|eff\. upon appropriation|not established as effective/i],
    ["NY", "ny_clean_slate_manual_review", "obligation:track-only:NY:ny_clean_slate_manual_review", /form.*published.*November 16, 2027|November 16, 2027.*form/i],
    ["OK", "ok_osbi_portal", "obligation:track-only:OK:ok_osbi_portal", /portal.*1 November 2026|1 November 2026.*portal/i],
  ];
  for (const [jurisdiction, trackId, routeKey, sourcePattern] of exactFutureEffectiveRoutes) {
    const sourceTrack = independent?.trackRows?.find((row) => row.jurisdiction === jurisdiction && row.trackId === trackId);
    const candidate = routes.find((row) => row.routeKey === routeKey);
    const mappedKeys = mappings.find((mapping) => mapping.sourceRouteKey === `track:${jurisdiction}:${trackId}`)?.canonicalObligationKeys ?? [];
    if (!sourcePattern.test(JSON.stringify(sourceTrack))
      || !mappedKeys.includes(routeKey)
      || candidate?.possibleCategory !== "B_LEGITIMATE_EXCLUSION"
      || candidate?.possibleCategoryBReason !== "FUTURE_EFFECTIVE"
      || candidate?.participantCanInitiate !== false
      || candidate?.currentOutputStrategy !== "process_guidance"
      || !/no filing|no participant filing/i.test(String(candidate?.participantFacingInstrument))
      || !candidate?.currentImplementationEvidence?.some((evidence) => evidence.startsWith("future-effective-treatment:"))) {
      failures.push(`${jurisdiction} ${trackId} does not preserve its exact source-backed B / FUTURE_EFFECTIVE reason and no-filing treatment`);
    }
  }

  const exactServiceBranch = (routeKey, label, predicate) => {
    const candidate = routes.find((row) => row.routeKey === routeKey);
    if (!candidate || !predicate(candidate)) failures.push(`${label} service-branch actor, instrument, destination, or classification drifted from the exact contract branch`);
  };
  exactServiceBranch(
    "obligation:service-branch:GA:retroactive-first-offender-treatment-under-42-8-66:order_already_granted_before_2026_07_01",
    "Georgia pre-2026 already-granted order",
    (row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION"
      && row.possibleCategoryBReason === "AUTOMATIC"
      && row.participantCanInitiate === false
      && row.processActor === "court or agency"
      && /no participant filing/i.test(String(row.participantFacingInstrument))
      && /automatic|already-granted/i.test(String(row.participantFacingInstrument))
      && /court.*record-holding agencies.*implementing.*verifying/i.test(destinationText(row)),
  );
  exactServiceBranch(
    "obligation:service-branch:GA:retroactive-first-offender-treatment-under-42-8-66:order_already_granted_post_2026_07_01",
    "Georgia post-2026 agency implementation",
    (row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION"
      && row.possibleCategoryBReason === "AGENCY_CONTROLLED"
      && row.participantCanInitiate === false
      && row.processActor === "agency"
      && /no participant filing.*agency implementation/i.test(String(row.participantFacingInstrument))
      && /record-holding agencies.*implementing.*verifying/i.test(destinationText(row)),
  );
  for (const branchId of ["judgment_ambiguous", "ordinance_expressly_adopts_311_326", "ordinance_merely_mirrors_offence"]) {
    exactServiceBranch(
      `obligation:service-branch:MO:first-minor-in-possession-alcohol-expungement-under-311-326:${branchId}`,
      `Missouri ${branchId} referral`,
      (row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION"
        && row.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP"
        && row.participantCanInitiate === false
        && /attorney|professional/i.test(String(row.processActor))
        && /no participant filing/i.test(String(row.participantFacingInstrument))
        && /attorney|legal-assistance referral/i.test(String(row.participantFacingInstrument))
        && /attorney|legal-assistance referral/i.test(destinationText(row)),
    );
  }
  exactServiceBranch(
    "obligation:service-branch:MO:first-minor-in-possession-alcohol-expungement-under-311-326:state_311_325_conviction",
    "Missouri exact state-law participant petition",
    (row) => row.possibleCategory === "A_MUST_FULFILL"
      && row.participantCanInitiate === true
      && row.processActor === "participant"
      && row.currentOutputStrategy === "custom_pleading"
      && /petition/i.test(String(row.participantFacingInstrument))
      && /clerk|court/i.test(destinationText(row)),
  );
  exactServiceBranch(
    "obligation:service-branch:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:post_effective_date_automatic",
    "North Dakota post-effective automatic closing",
    (row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION"
      && row.possibleCategoryBReason === "AUTOMATIC"
      && row.participantCanInitiate === false
      && row.processActor === "court"
      && /no participant filing/i.test(String(row.participantFacingInstrument))
      && /automatic|already-granted/i.test(String(row.participantFacingInstrument))
      && /court that entered the order of nonconviction/i.test(destinationText(row)),
  );
  exactServiceBranch(
    "obligation:service-branch:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:pre_effective_date_petition",
    "North Dakota pre-effective participant petition",
    (row) => row.possibleCategory === "A_MUST_FULFILL"
      && row.participantCanInitiate === true
      && row.processActor === "participant"
      && row.currentOutputStrategy === "official_pdf_fill"
      && /petition.*proposed order/i.test(String(row.participantFacingInstrument))
      && /clerk of court/i.test(destinationText(row)),
  );

  for (const row of routes.filter((candidate) => candidate.routeKey.startsWith("obligation:failure-disposition:") && candidate.possibleCategory === "B_LEGITIMATE_EXCLUSION")) {
    const statusToken = String(row.participantFacingInstrument);
    if (!statusToken.startsWith("no participant filing — ")) failures.push(`${row.routeKey} Category B failure disposition does not use an explicit no-participant-filing status instrument`);
    if (row.possibleCategoryBReason === "UNSUITABLE_FOR_SELF_HELP"
      && (!/attorney|professional/i.test(String(row.processActor)) || !/attorney|legal-assistance/i.test(`${statusToken} ${destinationText(row)}`))) {
      failures.push(`${row.routeKey} Category B failure disposition does not preserve its professional-handoff actor, instrument, and destination`);
    }
    if (row.possibleCategoryBReason === "PROSECUTOR_CONTROLLED"
      && (!/prosecutor/i.test(String(row.processActor)) || !/prosecutor/i.test(`${statusToken} ${destinationText(row)}`))) {
      failures.push(`${row.routeKey} Category B failure disposition does not preserve its prosecutor-controlled actor, instrument, and destination`);
    }
  }

  const automaticContractClassificationExceptions = new Set([
    ...mixedStageReviewRoutes.map((row) => row.routeContractId),
    "LA:automated-expungement-status-verification-art-985-2",
  ]);
  for (const { contract } of independent?.effectiveContractRows ?? []) {
    if (contract.branchSelectionRequired
      || automaticContractClassificationExceptions.has(contract.routeKey)
      || !(contract.outcomeMode === "automatic_relief" || contract.stage === "automatic")) continue;
    const joined = routes.filter((row) => row.routeContractId === contract.routeKey && !row.routeKey.includes(":service-branch:") && !row.routeKey.includes(":failure-disposition:"));
    if (joined.some((row) => row.possibleCategory !== "B_LEGITIMATE_EXCLUSION" || row.possibleCategoryBReason !== "AUTOMATIC" || row.participantCanInitiate !== false)) {
      failures.push(`automatic route contract ${contract.routeKey} is not classified as Category B / AUTOMATIC`);
    }
  }
  const retiredIllinoisRoute = routes.find((row) => row.trackId === "il-immediate-seal" && row.runtimePathwayId === null);
  if (!retiredIllinoisRoute || retiredIllinoisRoute.possibleCategory !== "B_LEGITIMATE_EXCLUSION" || retiredIllinoisRoute.possibleCategoryBReason !== "UNSUITABLE_FOR_SELF_HELP" || retiredIllinoisRoute.participantCanInitiate !== false) {
    failures.push("controlling Illinois § 5.2(g) retirement decision is not reflected as professional-handoff Category B");
  }
  if (!retiredIllinoisRoute?.legalDecisionRecordIds?.includes("LWD-2026-08-29-IL-5-2-G")) failures.push("Illinois § 5.2(g) retirement candidate omits its exact controlling decision ID");
  if (!retiredIllinoisRoute?.legalDecisionRecordIds?.includes("legal-question:Q-J-01")) failures.push("Illinois § 5.2(g) retirement candidate omits its typed controlling legal-question ID");
  const ndCorrectionPrefix = "obligation:failure-disposition:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:nd_still_public_day_62:";
  const ndCorrectionKeys = [
    `${ndCorrectionPrefix}written_clerk_correction_request`,
    `${ndCorrectionPrefix}original_case_enforcement_motion`,
  ];
  for (const key of ndCorrectionKeys) {
    const row = routes.find((candidate) => candidate.routeKey === key);
    const obligation = obligations.find((candidate) => candidate.routeKey === key);
    if (!row || !obligation?.hiddenParticipantBranch || row.possibleCategory !== "A_MUST_FULFILL" || row.participantCanInitiate !== true || row.currentOutputStrategy !== "custom_pleading") {
      failures.push(`North Dakota day-62 hidden participant correction branch is missing or misclassified: ${key}`);
    }
  }
  const ndEligibility = routes.find((row) => row.routeKey.endsWith(":nd_eligibility_contested"));
  if (!ndEligibility || ndEligibility.possibleCategory !== "B_LEGITIMATE_EXCLUSION" || ndEligibility.possibleCategoryBReason !== "UNSUITABLE_FOR_SELF_HELP" || ndEligibility.participantCanInitiate !== false || !/attorney|professional/i.test(ndEligibility.processActor)) {
    failures.push("North Dakota contested eligibility is not preserved as the controlling attorney-handoff exclusion");
  }
  const akCannabis = routes.find((row) => row.routeKey === "obligation:unattached-decision-route:AK:ak-cannabis-seal");
  if (!akCannabis || akCannabis.possibleCategory !== "B_LEGITIMATE_EXCLUSION" || akCannabis.possibleCategoryBReason !== "FUTURE_EFFECTIVE" || akCannabis.participantCanInitiate !== false) failures.push("future-effective Alaska cannabis decision route is missing or misclassified");
  const akCorrection = routes.find((row) => row.routeKey === "obligation:unattached-decision-route:AK:ak-correct-record");
  if (!akCorrection || akCorrection.possibleCategory !== "A_MUST_FULFILL" || akCorrection.currentOutputStrategy !== "participant_agency_application" || akCorrection.participantCanInitiate !== true) failures.push("operative Alaska record-correction agency application is missing or misclassified");

  for (const flag of findProhibitedAuthorityFlags(routes)) failures.push(`prohibited authority flag / invented approval or runtime flag at ${flag}`);

  const expectedJurisdictions = unique((independent?.legalTrackKeys ?? []).map((routeKey) => routeKey.split(":")[1]));
  const actualJurisdictions = context.summary?.jurisdictions?.map((row) => row.jurisdiction) ?? [];
  if (unique(actualJurisdictions).length !== 51 || !sameSet(actualJurisdictions, expectedJurisdictions)) failures.push("jurisdiction set mismatch; at least one required jurisdiction is absent");
  if (duplicates(actualJurisdictions).length) failures.push(`duplicate jurisdiction summary rows: ${duplicates(actualJurisdictions).join(", ")}`);

  const actualA = routes.filter((row) => row.possibleCategory === "A_MUST_FULFILL").map((row) => row.routeKey);
  const worklistRouteKeys = context.worklist?.packetFamilies?.flatMap((family) => family.routeKeys ?? []) ?? [];
  if (!sameSet(actualA, worklistRouteKeys)) failures.push("Category A worklist membership mismatch; every Category A route must appear exactly in the worklist");
  if (duplicates(worklistRouteKeys).length) failures.push(`Category A route appears in multiple worklist families: ${duplicates(worklistRouteKeys).join(", ")}`);
  if (!independent?.ownerDecisionValid) failures.push("decision-owner completed-output approval does not resolve identically across the authorization queue and counsel manifest");
  const ownerFamilyById = new Map((independent?.ownerApprovedFamilies ?? []).map((family) => [family.familyId, family]));
  const expectedOwnerApprovedCandidateRoutes = routes.flatMap((candidate) => {
    if (candidate.possibleCategory !== "A_MUST_FULFILL" || !candidate.trackId) return [];
    const sourceTrack = independent?.trackRows?.find((track) => track.jurisdiction === candidate.jurisdiction && track.trackId === candidate.trackId);
    const family = (independent?.ownerApprovedFamilies ?? []).find((row) =>
      row.jurisdictions.includes(candidate.jurisdiction)
        && row.tracksServed.includes(candidate.trackId)
        && sourceTrack?.outputStrategy === candidate.currentOutputStrategy);
    if (!family) return [];
    if (candidate.packetFamilyId !== family.familyId) {
      failures.push(`${candidate.routeKey} is in an exact owner-approved track/treatment scope but does not retain its raw manifest packet-family identity ${family.familyId}`);
    }
    return [{
      routeKey: candidate.routeKey,
      packetFamilyId: family.familyId,
      trackId: candidate.trackId,
      jurisdiction: candidate.jurisdiction,
    }];
  }).sort((a, b) => a.routeKey.localeCompare(b.routeKey));
  const ownerEvidence = context.canonical?.ownerLegalDecisionEvidence;
  const duplicateOwnerEvidence = context.duplicateReport?.ownerLegalDecisionEvidence;
  const expectedOwnerFamilyIds = sorted(ownerFamilyById.keys());
  for (const [label, evidence] of [["canonical", ownerEvidence], ["duplicate report", duplicateOwnerEvidence]]) {
    if (evidence?.decisionId !== independent?.ownerDecisionId
      || evidence?.queueStatus !== "authorized"
      || evidence?.queueDecision !== "approved"
      || evidence?.legalApprovalResult !== "approved_by_decision_owner"
      || evidence?.manifestApproved !== true
      || (evidence?.approvedPacketFamilyIds ?? []).length !== expectedOwnerFamilyIds.length
      || unique(evidence?.approvedPacketFamilyIds ?? []).length !== (evidence?.approvedPacketFamilyIds ?? []).length
      || (evidence?.approvedCandidateRoutes ?? []).length !== expectedOwnerApprovedCandidateRoutes.length
      || unique((evidence?.approvedCandidateRoutes ?? []).map((row) => row.routeKey)).length !== (evidence?.approvedCandidateRoutes ?? []).length
      || !sameSet(evidence?.approvedPacketFamilyIds ?? [], expectedOwnerFamilyIds)
      || !sameSet((evidence?.approvedCandidateRoutes ?? []).map(stable), expectedOwnerApprovedCandidateRoutes.map(stable))
      || !/no technical, artifact, visual, runtime, commercial, or Production authority/i.test(String(evidence?.authorityBoundary))) {
      failures.push(`${label} decision-owner completed-output approval evidence or authority boundary is incomplete`);
    }
  }
  const flatWorklistRoutes = context.worklist?.packetFamilies?.flatMap((family) => family.routes ?? []) ?? [];
  for (const candidate of routes.filter((row) => row.possibleCategory === "A_MUST_FULFILL")) {
    const worklistRoute = flatWorklistRoutes.find((route) => route.routeKey === candidate.routeKey);
    const ownerApproved = expectedOwnerApprovedCandidateRoutes.some((row) => row.routeKey === candidate.routeKey);
    const approvalMissing = (candidate.missingImplementationWork ?? []).some((item) => /completed-output legal approval/i.test(item));
    const approvalWork = worklistRoute?.workTypes?.includes("OUTPUT_LEGAL_APPROVAL_REQUIRED") === true;
    const artifactWork = worklistRoute?.workTypes?.includes("ARTIFACT_REVIEW_REQUIRED") === true;
    if (!artifactWork) failures.push(`${candidate.routeKey} lacks artifact review; decision-owner legal approval does not waive technical or deterministic output proof`);
    if (ownerApproved) {
      const expectedEvidencePrefix = `decision-owner-completed-output-approval:${independent.ownerDecisionId}:family=${candidate.packetFamilyId}:track=${candidate.trackId}:`;
      if (!(candidate.legalDecisionRecordIds ?? []).includes(independent.ownerDecisionId)
        || !(candidate.currentImplementationEvidence ?? []).some((item) => item.startsWith(expectedEvidencePrefix))
        || approvalMissing
        || approvalWork) {
        failures.push(`${candidate.routeKey} is in the exact owner-approved family/track scope but incorrectly retains legal-approval work or omits controlling evidence`);
      }
    } else if (!approvalMissing || !approvalWork) {
      failures.push(`${candidate.routeKey} is outside exact owner-approved family/track scope but lacks completed-output legal-approval work`);
    }
  }
  const worklistGroupKeys = (context.worklist?.packetFamilies ?? []).map((family) => `${family.worklistGroupId}|${family.implementationStrategy}`);
  if (duplicates(worklistGroupKeys).length) failures.push(`reusable family/strategy is split into multiple worklist groups: ${duplicates(worklistGroupKeys).join(", ")}`);

  for (const family of context.worklist?.packetFamilies ?? []) {
    if (!sameSet(family.routeKeys ?? [], (family.routes ?? []).map((route) => route.routeKey))) {
      failures.push(`worklist family ${family.worklistGroupId ?? "unknown"} route membership is internally inconsistent`);
    }
    const explicitOfficialFormFamily = family.implementationStrategy === "official_pdf_fill" && (family.routeKeys ?? []).every((routeKey) => {
      const candidate = routes.find((row) => row.routeKey === routeKey);
      return hasExplicitOfficialFormTreatment(candidate);
    });
    if (!family.packetFamilyId && !family.packetSetId && !/composed|custom_pleading|participant_agency_application/i.test(String(family.implementationStrategy)) && !explicitOfficialFormFamily) failures.push(`worklist family ${family.worklistGroupId ?? "unknown"} lacks packet-family, exact official form, composed, or explicit agency-application treatment`);
    for (const workType of family.workTypes ?? []) {
      if (!WORK_TYPES.includes(workType)) failures.push(`unauthorized work type ${workType} in ${family.worklistGroupId}`);
    }
    const familyCandidates = (family.routes ?? []).map((route) => routes.find((row) => row.routeKey === route.routeKey)).filter(Boolean);
    const expectedPacketSetIds = unique(familyCandidates.map((candidate) => candidate.packetSetId).filter(Boolean)).sort();
    const expectedTopPacketSetId = expectedPacketSetIds.length === 1 ? expectedPacketSetIds[0] : null;
    if (!sameSet(family.packetSetIds ?? [], expectedPacketSetIds) || family.packetSetId !== expectedTopPacketSetId) {
      failures.push(`worklist family ${family.worklistGroupId ?? "unknown"} packet-set aggregate is out of sync with its route associations`);
    }
    for (const route of family.routes ?? []) {
      if (!(family.routeKeys ?? []).includes(route.routeKey)) failures.push(`worklist route ${route.routeKey} is absent from its family routeKeys`);
      const candidate = routes.find((row) => row.routeKey === route.routeKey);
      if (!candidate) {
        failures.push(`worklist route ${route.routeKey} has no candidate treatment`);
        continue;
      }
      if (candidate.currentOutputStrategy !== family.implementationStrategy
        || candidate.packetFamilyId !== family.packetFamilyId
        || expectedWorklistGroupId(candidate) !== family.worklistGroupId) {
        failures.push(`${route.routeKey} candidate/worklist reusable-family or output-strategy treatment is out of sync`);
      }
      if (!sameSet(route.requiredSourceIds ?? [], candidate.requiredSourceIds ?? [])
        || !sameSet(route.existingArtifactIds ?? [], candidate.existingArtifactIds ?? [])) {
        failures.push(`${route.routeKey} candidate/worklist source or artifact evidence is out of sync`);
      }
      if (!(candidate.missingImplementationWork ?? []).every((item) => (route.missingImplementationWork ?? []).includes(item))) {
        failures.push(`${route.routeKey} worklist omits candidate missing-implementation work`);
      }
      for (const workType of route.workTypes ?? []) {
        if (!WORK_TYPES.includes(workType)) failures.push(`unauthorized work type ${workType} on ${route.routeKey}`);
      }
      const routeWorkTypes = new Set(route.workTypes ?? []);
      const composedStrategy = ["custom_pleading", "composed_pleading"].includes(candidate.currentOutputStrategy);
      if (composedStrategy !== routeWorkTypes.has("COMPOSED_PLEADING")) {
        failures.push(`${route.routeKey} composed-pleading work type does not exactly match its explicit output strategy`);
      }
      const agencyStrategy = candidate.currentOutputStrategy === "participant_agency_application";
      if (agencyStrategy !== routeWorkTypes.has("PARTICIPANT_AGENCY_APPLICATION")) {
        failures.push(`${route.routeKey} participant-agency-application work type does not exactly match its explicit output strategy`);
      }
      const exactOfficialFormIds = unique((candidate.requiredSourceIds ?? [])
        .filter((sourceId) => sourceId.startsWith("official-form:"))
        .map((sourceId) => sourceId.slice("official-form:".length)));
      const requiresOfficialMap = candidate.currentOutputStrategy === "official_pdf_fill" || exactOfficialFormIds.length > 0;
      const matchingAssignments = (independent?.officialFormAssignments ?? []).filter((assignment) =>
        assignment.jurisdiction === candidate.jurisdiction
          && assignment.trackId === candidate.trackId
          && (!exactOfficialFormIds.length || exactOfficialFormIds.includes(assignment.officialFormId)));
      const everyRequiredFormMapped = exactOfficialFormIds.length > 0
        && exactOfficialFormIds.every((formId) => matchingAssignments.some((assignment) =>
          assignment.officialFormId === formId && mappingIsExisting(assignment.mappingStatus)));
      const expectedOfficialMapType = requiresOfficialMap
        ? everyRequiredFormMapped ? "OFFICIAL_FORM_EXISTING_MAP" : "OFFICIAL_FORM_MAP_REQUIRED"
        : null;
      const actualOfficialMapTypes = ["OFFICIAL_FORM_EXISTING_MAP", "OFFICIAL_FORM_MAP_REQUIRED"].filter((workType) => routeWorkTypes.has(workType));
      if ((expectedOfficialMapType && !routeWorkTypes.has(expectedOfficialMapType))
        || (!expectedOfficialMapType && actualOfficialMapTypes.length)
        || actualOfficialMapTypes.length > 1) {
        failures.push(`${route.routeKey} official-form mapping work does not match its exact required official forms and positive mapping-status allowlist`);
      }
      if ((route.workTypes ?? []).includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED")
        && !(candidate.missingImplementationWork ?? []).some((item) => /acquire.*(?:official[- ]source|source custody)|official[- ]source custody/i.test(item))) {
        failures.push(`${route.routeKey} source-acquisition work is absent from candidate missingImplementationWork`);
      }
      const missingWorkText = (route.missingImplementationWork ?? []).join(" ");
      if (candidate.currentOutputStrategy === "official_pdf_fill" && /composed pleading/i.test(missingWorkText)) {
        failures.push(`${route.routeKey} official-form treatment carries incompatible composed-pleading work`);
      }
      if (expectedOfficialMapType === "OFFICIAL_FORM_MAP_REQUIRED" && !/official-form field map/i.test(missingWorkText)) {
        failures.push(`${route.routeKey} lacks missing implementation work for an exact required official-form map`);
      }
      const sourceTrack = candidate.trackId
        ? independent?.trackRows?.find((row) => row.jurisdiction === candidate.jurisdiction && row.trackId === candidate.trackId)
        : null;
      const sourceUnit = candidate.routeKey.startsWith("obligation:unit:")
        ? (sourceTrack?.units ?? []).find((unit) => candidate.routeKey.endsWith(`:${unit.unitId}`))
        : null;
      if (sourceTrack && !sourceUnit) {
        const exactUncontestedHearingEvidence = [
          ...(sourceTrack.packetInstructions ?? []),
          ...(sourceTrack.selfHelpBoundaries ?? []),
          sourceTrack.rules?.hearing,
          sourceTrack.mechanism,
        ].flatMap((line) => String(line ?? "").split(/(?<=[.!?;])\s+/)).filter(explicitUncontestedHearingEvidence);
        if (exactUncontestedHearingEvidence.length && route.deliverable?.uncontestedHearingTreatment?.status !== "recorded") {
          failures.push(`${route.routeKey} omits exact routine or mandatory uncontested-hearing treatment from its legal-track source`);
        }
        const exactParticipantDeadlineEvidence = [
          ...(sourceTrack.packetSet?.participantActionRequired ?? []).map((action) => action.description),
          sourceTrack.rules?.filing,
          ...(sourceTrack.packetInstructions ?? []),
          ...(sourceTrack.scopeRestrictions ?? []),
          ...(sourceTrack.participantFilingRequirements ?? []).flatMap((item) => [item.howToObtain, item.conditionDescription]),
        ].filter(explicitParticipantFilingDeadlineEvidence);
        if (exactParticipantDeadlineEvidence.length && route.deliverable?.filingDeadline?.status !== "recorded") {
          failures.push(`${route.routeKey} omits an exact participant filing deadline from its legal-track source`);
        }
        const exactServeActions = (sourceTrack.packetSet?.participantActionRequired ?? [])
          .filter((action) => action.kind === "serve_party")
          .map((action) => String(action.description ?? ""))
          .filter((text) => !/none required[^.]*[.;].*(?:separate|different) (?:matter|track|route)/i.test(text));
        if (exactServeActions.some(explicitServiceTimingEvidence)
          && route.deliverable?.serviceTiming?.status !== "recorded") {
          failures.push(`${route.routeKey} omits exact participant-bound service timing from its structured serve-party source action`);
        }
        if (exactServeActions.some((text) => /\bserves?\s+(?:the\s+)?(?:prosecut|attorney|state|agency|respondent|victim|court|clerk|law enforcement|police)|\bservice (?:on|to)|\bnotice (?:on|to)/i.test(text))
          && route.deliverable?.serviceRecipients?.status !== "recorded") {
          failures.push(`${route.routeKey} omits exact service recipients from its structured serve-party source action`);
        }
      }
      if (candidate.routeKey.startsWith("obligation:unit:")) {
        if (!sourceUnit) {
          failures.push(`${route.routeKey} explicit-unit worklist row has no exact source unit`);
        } else {
          const unitSentences = String(sourceUnit.description ?? "").split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
          const unitPrimary = sourceUnit.label ? `${sourceUnit.label} (${candidate.currentOutputStrategy ?? "output treatment not recorded"})` : null;
          const associatedComponents = independentUnitAssociatedComponents(sourceUnit, sourceTrack.packetSet, candidate.currentOutputStrategy);
          const componentLine = (component) => `${component.role}: ${component.officialFormId ?? component.componentId}`;
          const allowedUnitEvidence = new Set([...unitSentences, unitPrimary, ...associatedComponents.map(componentLine)].filter(Boolean));
          for (const field of DELIVERABLE_FIELDS) {
            for (const entry of route.deliverable?.[field]?.status === "recorded" ? route.deliverable[field].entries : []) {
              if (!allowedUnitEvidence.has(entry)) failures.push(`${route.routeKey} ${field} imports parent or sibling-stage evidence not explicitly associated with this unit`);
            }
          }
          const primaryRoles = new Set(["primary_filing", "primary_filing_post_2019", "alternate_primary_filing", "secondary_filing", "petition", "motion", "application_for_sealing", "agency_written_request", "bci_certificate_application", "certificate_of_verification_application", "district_attorney_alternative_filing", "expedited_request", "in_camera_request", "informal_demand_letter", "lfo_refund_claim", "misidentification_motion", "motion_for_partial_removal", "participant_request_to_district_attorney", "prosecutor_request_letter", "request_to_district_attorney", "request_to_trial_court", "status_request", "verified_application_to_prosecutor", "written_request_to_court"]);
          const fieldForRole = (role) => {
            if (primaryRoles.has(role)) return "primaryOfficialFormOrComposedPleading";
            if (["proposed_order", "court_order", "order_for_hearing", "stipulation_and_proposed_order"].includes(role)) return "proposedOrder";
            if (["cover_sheet", "civil_cover_sheet"].includes(role)) return "coverSheet";
            if (["notice", "notice_of_entry", "notice_of_hearing", "notice_package", "notice_to_submit_or_notice_of_hearing", "prosecutor_notification", "second_stage_notice", "victim_notice_form", "notice_and_certificate_of_service"].includes(role)) return "notice";
            if (["certificate_of_service", "proof_of_service", "proof_of_delivery_to_prosecutor", "acceptance_of_service", "notice_and_certificate_of_service"].includes(role)) return "certificateOfService";
            if (["affidavit", "supporting_affidavit", "declaration_and_verification", "decriminalization_affidavit", "one_time_use_affidavit", "supporting_declaration", "sworn_prior_applications_statement", "verification"].includes(role)) return "affidavitOrVerification";
            if (["continuation", "count_by_count_schedule", "supplemental_pleading", "supporting_timeline"].includes(role)) return "schedulesOrContinuationPages";
            if (role === "attachment" || role.endsWith("_attachment")) return "requiredParticipantAttachments";
            if (role.startsWith("fee_waiver")) return "feeWaiverTreatment";
            return null;
          };
          for (const component of associatedComponents) {
            const field = fieldForRole(String(component.role ?? "").toLowerCase());
            if (field && !(route.deliverable?.[field]?.entries ?? []).includes(componentLine(component))) {
              failures.push(`${route.routeKey} omits exact unit-associated component ${componentLine(component)} from ${field}`);
            }
          }
        }
      }
      const sourcePacketSet = sourceTrack
        ? independent?.packetSetRows?.find((row) => row.jurisdiction === sourceTrack.jurisdiction && row.trackId === sourceTrack.trackId) ?? sourceTrack.packetSet
        : null;
      const sourceActions = sourcePacketSet?.participantActionRequired ?? sourceTrack?.participantFilingRequirements ?? [];
      const sourceComponents = sourcePacketSet?.components ?? [];
      const actionDescription = (action) => String(action?.description ?? "");
      const deliverableEntries = (field) => route.deliverable?.[field]?.status === "recorded"
        ? route.deliverable[field].entries
        : [];
      const nonAttachmentActionText = sourceActions.filter((action) => !explicitAttachmentActionEvidence(action)).map(actionDescription);
      const permittedAttachmentActionClauses = sourceActions.flatMap(independentAttachmentActionClauses);
      const participantActionText = sourceActions.map(actionDescription);
      if (deliverableEntries("requiredParticipantAttachments").some((entry) =>
        nonAttachmentActionText.includes(entry)
          || (participantActionText.includes(entry)
            && !permittedAttachmentActionClauses.includes(entry)))) {
        failures.push(`${route.routeKey} requiredParticipantAttachments reuses a non-obtain_document participant action instead of exact attachment evidence`);
      }
      const nonFilingFeeText = sourceActions
        .filter((action) => action.kind !== "pay_fee")
        .map(actionDescription);
      if (deliverableEntries("filingFee").some((entry) => nonFilingFeeText.includes(entry))) {
        failures.push(`${route.routeKey} filingFee reuses eligibility, fine, record-copy, or non-filing-fee prose`);
      }
      const nonRouteFeeActionText = sourceActions
        .filter((action) => action.kind === "pay_fee" && routeFilingFeeClauses(actionDescription(action)).length === 0)
        .map(actionDescription);
      if (deliverableEntries("filingFee").some((entry) => nonRouteFeeActionText.includes(entry))) {
        failures.push(`${route.routeKey} filingFee reuses a prerequisite record charge or an amount expressly identified as not a filing fee`);
      }
      const nonServiceActionText = sourceActions.filter((action) => action.kind !== "serve_party").map(actionDescription);
      if (deliverableEntries("serviceMethod").some((entry) => nonServiceActionText.includes(entry))) {
        failures.push(`${route.routeKey} serviceMethod reuses a non-service participant action instead of exact service-method evidence`);
      }
      const nonFileActionText = sourceActions.filter((action) => action.kind !== "file").map(actionDescription);
      if (deliverableEntries("filingMethod").some((entry) => nonFileActionText.includes(entry))) {
        failures.push(`${route.routeKey} filingMethod reuses a non-filing participant action`);
      }
      if (deliverableEntries("serviceRecipients").some((entry) => nonServiceActionText.includes(entry))) {
        failures.push(`${route.routeKey} serviceRecipients reuses a non-service participant action`);
      }
      if (deliverableEntries("serviceTiming").some((entry) => nonServiceActionText.includes(entry))) {
        failures.push(`${route.routeKey} serviceTiming reuses a non-service participant action`);
      }
      const componentLine = (component) => `${component.role}: ${component.officialFormId ?? component.componentId}`;
      const allowedRolesByField = {
        primaryOfficialFormOrComposedPleading: new Set([
          "primary_filing", "primary_filing_post_2019", "alternate_primary_filing", "secondary_filing", "petition", "motion",
          "application_for_sealing", "agency_written_request", "bci_certificate_application", "certificate_of_verification_application",
          "district_attorney_alternative_filing", "expedited_request", "in_camera_request", "informal_demand_letter", "lfo_refund_claim",
          "misidentification_motion", "motion_for_partial_removal", "participant_request_to_district_attorney", "prosecutor_request_letter",
          "request_to_district_attorney", "request_to_trial_court", "status_request", "verified_application_to_prosecutor", "written_request_to_court",
        ]),
        proposedOrder: new Set(["proposed_order", "court_order", "order_for_hearing", "stipulation_and_proposed_order"]),
        coverSheet: new Set(["cover_sheet", "civil_cover_sheet"]),
        notice: new Set(["notice", "notice_of_entry", "notice_of_hearing", "notice_package", "notice_to_submit_or_notice_of_hearing", "prosecutor_notification", "second_stage_notice", "victim_notice_form", "notice_and_certificate_of_service"]),
        certificateOfService: new Set(["certificate_of_service", "proof_of_service", "proof_of_delivery_to_prosecutor", "acceptance_of_service", "notice_and_certificate_of_service"]),
        affidavitOrVerification: new Set(["affidavit", "supporting_affidavit", "declaration_and_verification", "decriminalization_affidavit", "one_time_use_affidavit", "supporting_declaration", "sworn_prior_applications_statement", "verification"]),
        schedulesOrContinuationPages: new Set(["continuation", "count_by_count_schedule", "supplemental_pleading", "supporting_timeline"]),
        requiredParticipantAttachments: new Set(["attachment", "certification_attachment"]),
      };
      for (const [field, allowedRoles] of Object.entries(allowedRolesByField)) {
        const disallowedComponentLines = sourceComponents
          .filter((component) => !allowedRoles.has(String(component.role ?? "").toLowerCase())
            && !(field === "requiredParticipantAttachments" && String(component.role ?? "").toLowerCase().endsWith("_attachment")))
          .map(componentLine);
        if (deliverableEntries(field).some((entry) => disallowedComponentLines.includes(entry))) {
          failures.push(`${route.routeKey} ${field} reuses a packet component whose exact semantic role belongs to another dimension`);
        }
      }
      const sourceContract = candidate.routeContractId
        ? independent?.effectiveContractRows?.find(({ contract }) => contract.routeKey === candidate.routeContractId)?.contract
        : null;
      if (!sourceContract?.destination && sourceContract?.mechanism
        && deliverableEntries("filingDestination").includes(sourceContract.mechanism)) {
        failures.push(`${route.routeKey} filingDestination improperly falls back to the route mechanism label`);
      }
      const prefilingInstructions = (sourceTrack?.packetInstructions ?? []).filter((line) =>
        !/\b(?:after (?:filing|submission)|post[- ]filing|once filed|following filing|after the (?:petition|motion|application|request) is filed|court (?:will|may)|hearing|order entered|decision issued|filing status)\b/i.test(String(line)));
      if (deliverableEntries("postFilingInstructions").some((entry) => prefilingInstructions.includes(entry))) {
        failures.push(`${route.routeKey} postFilingInstructions reuses prefiling packet instructions`);
      }
      const nonServiceTimingInstructions = (sourceTrack?.packetInstructions ?? []).filter((line) => !explicitServiceTimingEvidence(line));
      if (deliverableEntries("serviceTiming").some((entry) => nonServiceTimingInstructions.includes(entry))) {
        failures.push(`${route.routeKey} serviceTiming reuses a non-service timing instruction`);
      }
      const nonParticipantDeadlineInstructions = (sourceTrack?.packetInstructions ?? []).filter((line) => !explicitParticipantFilingDeadlineEvidence(line));
      if (deliverableEntries("filingDeadline").some((entry) => nonParticipantDeadlineInstructions.includes(entry))) {
        failures.push(`${route.routeKey} filingDeadline reuses a non-participant, obsolete, or processing deadline`);
      }
      for (const field of DELIVERABLE_FIELDS) {
        verifyEvidenceField(route.routeKey, field, route.deliverable?.[field], failures);
        if (route.deliverable?.[field]?.status === "not_recorded" && !(route.missingImplementationWork ?? []).includes(`Record ${field}; current evidence is not recorded.`)) {
          failures.push(`${route.routeKey} worklist dimension ${field} is not recorded without corresponding missing work`);
        }
      }
      const relationships = rawRelationshipsForCandidate(candidate, independent);
      if (!everyRequiredSourceHasCustody(relationships, independent)
        && !(route.workTypes ?? []).includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED")) {
        failures.push(`${route.routeKey} lacks custody for every exact required source and required source-acquisition work`);
      }
      for (const artifactId of route.existingArtifactIds ?? []) {
        if (!artifactId.startsWith("source-artifact:")) continue;
        const rawArtifact = independent?.sourceArtifacts?.find((artifact) => artifact.artifactId === artifactId.slice("source-artifact:".length));
        if (!rawArtifact || !relationships.some((relationship) => artifactIsAttributableToRelationship(rawArtifact, relationship))) {
          failures.push(`${route.routeKey} cites source artifact ${artifactId} without an attributable exact component/form/track relationship`);
        }
      }
    }
    const routeWorkTypes = unique((family.routes ?? []).flatMap((route) => route.workTypes ?? []));
    if (!sameSet(family.workTypes ?? [], routeWorkTypes)) failures.push(`worklist family ${family.worklistGroupId ?? "unknown"} work types are out of sync with its routes`);
    for (const field of DELIVERABLE_FIELDS) {
      verifyEvidenceField(family.worklistGroupId ?? "unknown family", field, family.reusableFamilyDeliverable?.[field], failures);
      const expectedEntries = unique((family.routes ?? []).flatMap((route) =>
        route.deliverable?.[field]?.status === "recorded" ? route.deliverable[field].entries : []));
      const expectedReusable = expectedEntries.length
        ? { status: "recorded", entries: expectedEntries }
        : { status: "not_recorded", entries: ["not recorded"] };
      const actualReusable = family.reusableFamilyDeliverable?.[field];
      if (actualReusable?.status !== expectedReusable.status || !sameSet(actualReusable?.entries ?? [], expectedReusable.entries)) {
        failures.push(`worklist family ${family.worklistGroupId ?? "unknown"} reusable ${field} evidence is out of sync with its exact route associations`);
      }
    }
  }
  if (!sameSet(context.worklist?.allowedWorkTypes ?? [], WORK_TYPES)) failures.push("worklist allowed-work-type enum drift");
  if (!sameSet(context.worklist?.deliverableFields ?? [], DELIVERABLE_FIELDS)) failures.push("worklist deliverable-field enum drift");
  if ((context.worklist?.packetFamilies ?? []).some((family) => family.workTypes.includes("OFFICIAL_FORM_EXISTING_MAP"))) failures.push("official-form map status is invented; every source assignment at this SHA is not_mapped");
  if ((context.worklist?.packetFamilies ?? []).some((family) => !family.workTypes.includes("ARTIFACT_REVIEW_REQUIRED"))) failures.push("Category A family lacks artifact review; source custody is not output proof");
  const laTraffickingWorklistRows = (context.worklist?.packetFamilies ?? []).flatMap((family) => family.routes ?? [])
    .filter((row) => row.runtimePathwayId === "human-trafficking-survivor-expungement-fee-exempt-route");
  if (!laTraffickingWorklistRows.length || laTraffickingWorklistRows.some((row) => {
    const filingFee = row.deliverable?.filingFee?.entries ?? [];
    return !filingFee.some((entry) => /fees? (?:are |is )?waived/i.test(entry)) || filingFee.some((entry) => /\$550/.test(entry));
  })) failures.push("Louisiana trafficking-survivor fee-exempt route does not preserve the exact waived-fee contract treatment");

  const reviewCandidateKeys = routes.filter((row) => row.possibleCategory === "NEEDS_LEGAL_REVIEW").map((row) => row.routeKey);
  const queuedKeys = context.reviewQueue?.routes?.map((row) => row.routeKey) ?? [];
  if (!sameSet(reviewCandidateKeys, queuedKeys)) failures.push("legal-review queue mismatch; review row is missing from queue");
  if (context.reviewQueue?.count !== reviewCandidateKeys.length) failures.push("legal-review queue stale counter");

  const recomputedCounts = {
    totalJurisdictions: unique(obligations.map((row) => row.jurisdiction)).length,
    totalStatutoryLegalTracks: countBy(entities, (row) => row.entityType === "legal_track"),
    totalLegalTrackUnits: countBy(entities, (row) => row.entityType === "legal_track_unit"),
    totalRuntimeRoutes: countBy(entities, (row) => row.entityType === "runtime_pathway"),
    totalEffectiveServiceBranches: countBy(entities, (row) => row.entityType === "service_branch"),
    totalEffectiveFailureDispositions: countBy(entities, (row) => row.entityType === "failure_disposition"),
    totalUnattachedDecisionRoutes: countBy(entities, (row) => row.entityType === "unattached_decision_route"),
    totalResearchDecisionRoutes: countBy(entities, (row) => row.entityType === "research_decision_route"),
    totalTypedSourceEntities: entities.length,
    totalCanonicalObligations: obligations.length,
    totalCanonicalEntities: obligations.length,
    totalDistinctParticipantActionBranches: countBy(routes, (row) => row.participantCanInitiate === true),
    possibleCategoryA: countBy(routes, (row) => row.possibleCategory === "A_MUST_FULFILL"),
    possibleCategoryB: countBy(routes, (row) => row.possibleCategory === "B_LEGITIMATE_EXCLUSION"),
    needsLegalReview: countBy(routes, (row) => row.possibleCategory === "NEEDS_LEGAL_REVIEW"),
    duplicateAliases: context.duplicateReport?.explicitAliases?.length ?? 0,
    supersededRoutes: (context.duplicateReport?.supersededRouteContracts?.length ?? 0) + (context.duplicateReport?.supersededRuntimeTextRows?.length ?? 0),
    supersededContractReplacements: context.duplicateReport?.supersededRouteContracts?.length ?? 0,
    supersededRuntimeTextRows: context.duplicateReport?.supersededRuntimeTextRows?.length ?? 0,
    hiddenParticipantFilingBranches: actualHidden.length,
    rawRouteContracts: independent?.rawRouteContracts ?? 0,
    effectiveRouteContracts: independent?.effectiveRouteContracts ?? 0,
    totalRuntimeAuthorityDecisions: independent?.runtimeAuthority?.decisions?.length ?? 0,
    totalRuntimeAuthorityContractAssociations: independent?.runtimeAuthorityDecisionAssociations?.length ?? 0,
    runtimeAuthorityRouteKeyRegistryGaps: countBy(independent?.runtimeAuthorityDecisionAssociations ?? [], (row) => row.associationStatus === "DECISION_ID_RESOLVES_AUTHORITY_ROUTE_KEY_REGISTRY_GAP"),
    runtimeAuthorityContractsWithoutCandidate: RUNTIME_AUTHORITY_CONTRACT_WITHOUT_CANDIDATE_KEYS.size,
    ownerApprovedCandidateRoutes: expectedOwnerApprovedCandidateRoutes.length,
    ownerApprovedPacketFamilyIds: unique(expectedOwnerApprovedCandidateRoutes.map((row) => row.packetFamilyId)).length,
    packetFamilies: context.worklist?.packetFamilies?.length ?? 0,
    officialSourceAcquisitionTasks: countBy(context.worklist?.packetFamilies ?? [], (family) => family.workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED")),
    formMapTasks: countBy(context.worklist?.packetFamilies ?? [], (family) => family.workTypes.includes("OFFICIAL_FORM_MAP_REQUIRED")),
    composedPleadingTasks: countBy(context.worklist?.packetFamilies ?? [], (family) => family.workTypes.includes("COMPOSED_PLEADING")),
    localVariationTasks: countBy(context.worklist?.packetFamilies ?? [], (family) => family.workTypes.includes("LOCAL_VARIATION_REQUIRED")),
    productWiringTasks: countBy(context.worklist?.packetFamilies ?? [], (family) => family.workTypes.includes("PRODUCT_WIRING_REQUIRED")),
    artifactReviewTasks: countBy(context.worklist?.packetFamilies ?? [], (family) => family.workTypes.includes("ARTIFACT_REVIEW_REQUIRED")),
    outputApprovalTasks: countBy(context.worklist?.packetFamilies ?? [], (family) => family.workTypes.includes("OUTPUT_LEGAL_APPROVAL_REQUIRED")),
  };
  for (const key of [
    "totalJurisdictions",
    "totalStatutoryLegalTracks",
    "totalLegalTrackUnits",
    "totalRuntimeRoutes",
    "totalEffectiveServiceBranches",
    "totalEffectiveFailureDispositions",
    "totalUnattachedDecisionRoutes",
    "totalResearchDecisionRoutes",
    "totalCanonicalEntities",
    "totalTypedSourceEntities",
    "totalCanonicalObligations",
    "totalDistinctParticipantActionBranches",
    "possibleCategoryA",
    "possibleCategoryB",
    "needsLegalReview",
    "hiddenParticipantFilingBranches",
    "totalRuntimeAuthorityDecisions",
    "totalRuntimeAuthorityContractAssociations",
    "runtimeAuthorityRouteKeyRegistryGaps",
    "runtimeAuthorityContractsWithoutCandidate",
    "ownerApprovedCandidateRoutes",
    "ownerApprovedPacketFamilyIds",
  ]) {
    if (context.canonical?.counts?.[key] !== recomputedCounts[key]) failures.push(`canonical typed count / stale counter for ${key}: expected ${recomputedCounts[key]}, received ${context.canonical?.counts?.[key]}`);
  }
  for (const [key, value] of Object.entries(recomputedCounts)) {
    if (context.summary?.counts?.[key] !== value) failures.push(`summary counter mismatch / stale counter for ${key}: expected ${value}, received ${context.summary?.counts?.[key]}`);
  }

  if (context.duplicateReport?.counts?.duplicateRouteKeys !== 0) failures.push("duplicate report declares duplicate route keys");
  if (context.duplicateReport?.counts?.runtimeAuthorityDecisions !== recomputedCounts.totalRuntimeAuthorityDecisions
    || context.duplicateReport?.counts?.runtimeAuthorityContractAssociations !== recomputedCounts.totalRuntimeAuthorityContractAssociations
    || context.duplicateReport?.counts?.runtimeAuthorityRouteKeyRegistryGaps !== recomputedCounts.runtimeAuthorityRouteKeyRegistryGaps
    || context.duplicateReport?.counts?.runtimeAuthorityContractsWithoutCandidate !== recomputedCounts.runtimeAuthorityContractsWithoutCandidate
    || context.duplicateReport?.counts?.ownerApprovedCandidateRoutes !== recomputedCounts.ownerApprovedCandidateRoutes
    || context.duplicateReport?.counts?.ownerApprovedPacketFamilyIds !== recomputedCounts.ownerApprovedPacketFamilyIds) {
    failures.push("duplicate/fidelity report runtime-authority or decision-owner approval counters are stale");
  }
  if (context.duplicateReport?.duplicateSemanticIdentities?.length) failures.push("duplicate report contains unresolved duplicate semantic identities without explicit aliases");
  if (!sameSet((context.duplicateReport?.explicitAliases ?? []).map(stable), (independent?.aliasRegistry?.aliases ?? []).map(stable))) {
    failures.push("registered explicit alias report disagrees with the raw alias registry");
  }
  const emittedPendingAliases = context.duplicateReport?.pendingAliasInstructions ?? [];
  const expectedPendingAliases = independent?.pendingAliasInstructions ?? [];
  const expectedMississippiAlias = expectedPendingAliases.find((row) => row.aliasRouteKey === "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months");
  if (expectedPendingAliases.length !== 1
    || expectedMississippiAlias?.canonicalRouteKey !== "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59"
    || expectedMississippiAlias?.decisionId !== "LD-MS-01"
    || expectedMississippiAlias?.registryStatus !== "PENDING_NOT_REGISTERED") {
    failures.push("exact pending Mississippi route-key alias instruction is missing or changed in effective-contract notes");
  }
  if (emittedPendingAliases.length !== expectedPendingAliases.length
    || unique(emittedPendingAliases.map((row) => row.aliasRouteKey)).length !== emittedPendingAliases.length
    || !sameSet(emittedPendingAliases.map(stable), expectedPendingAliases.map(stable))
    || context.duplicateReport?.counts?.pendingAliasInstructions !== (independent?.pendingAliasInstructions ?? []).length
    || context.canonical?.counts?.pendingAliasInstructions !== (independent?.pendingAliasInstructions ?? []).length
    || context.summary?.counts?.pendingAliasInstructions !== (independent?.pendingAliasInstructions ?? []).length) {
    failures.push("pending route-key alias instruction coverage drift from exact effective-contract notes");
  }
  for (const instruction of independent?.pendingAliasInstructions ?? []) {
    if ((context.duplicateReport?.explicitAliases ?? []).some((alias) => flattenStrings(alias).includes(instruction.aliasRouteKey))) {
      failures.push(`pending route-key alias ${instruction.aliasRouteKey} was invented as an adopted alias`);
    }
  }
  if (context.duplicateReport?.supersededRouteContracts?.length !== 3) failures.push("superseded route-contract count drift; expected three last-file-wins replacements");
  if (context.duplicateReport?.supersededRuntimeTextRows?.length !== 1) failures.push("superseded-runtime-text integrity drift; expected one crosswalk finding");
  if (context.duplicateReport?.counts?.totalSupersessionFindings !== 4) failures.push("supersession integrity drift; expected three contract replacements plus one superseded-runtime-text finding");
  if (context.canonical?.counts?.rawRouteContracts !== 151 || context.canonical?.counts?.effectiveRouteContracts !== 148) failures.push("route-contract precedence counters are stale; expected 151 raw and 148 effective");
  if (independent?.rawRouteContracts !== 151 || independent?.effectiveRouteContracts !== 148) failures.push("independent route-contract import found count drift from 151 raw / 148 effective");
  const actualContractSupersessions = (context.duplicateReport?.supersededRouteContracts ?? []).map((row) => `${row.routeKey}|${row.supersededSourceFile}|${row.effectiveSourceFile}`);
  const independentContractSupersessions = (independent?.supersededContracts ?? []).map((row) => `${row.routeKey}|${row.supersededSourceFile}|${row.effectiveSourceFile}`);
  if (!sameSet(actualContractSupersessions, independentContractSupersessions)) failures.push("route-contract supersession integrity drift from independent last-file-wins import");
  if (context.canonical?.counts?.branchSelectionParentsReplaced !== 2) failures.push("branch-selection overlay drift; exhaustive MO/ND branches must replace exactly two parent obligations");
  const exactSelectorPairs = (independent?.effectiveContractRows ?? []).flatMap(({ contract }) => (contract.failureDisposition ?? []).flatMap((disposition) => {
    const identity = exactSelectorIdentity(disposition.selector);
    const branch = identity ? (contract.serviceBranches ?? []).find((candidate) => exactSelectorIdentity(candidate.selector) === identity) : null;
    return branch ? [{ contract, branch, disposition, identity }] : [];
  }));
  if (exactSelectorPairs.length !== 2 || context.duplicateReport?.mergedServiceFailureSelectorSignals?.length !== exactSelectorPairs.length) {
    failures.push("exact service/failure selector representation merge count drift");
  }
  for (const { contract, branch, disposition } of exactSelectorPairs) {
    const serviceSource = `service-branch:${contract.routeKey}:${branch.id}`;
    const failureSource = `failure-disposition:${contract.routeKey}:${disposition.id}`;
    const serviceTargets = mappings.find((row) => row.sourceRouteKey === serviceSource)?.canonicalObligationKeys ?? [];
    const failureTargets = mappings.find((row) => row.sourceRouteKey === failureSource)?.canonicalObligationKeys ?? [];
    if (serviceTargets.length !== 1 || !sameSet(serviceTargets, failureTargets)) failures.push(`exact selector representations were double-counted for ${contract.routeKey}:${branch.id}`);
  }
  const ndPetitionTrackTargets = mappings.find((row) => row.sourceRouteKey === "track:ND:nd-nonconviction-close-petition")?.canonicalObligationKeys ?? [];
  const ndPreEffectiveBranchTargets = mappings.find((row) => row.sourceRouteKey === "service-branch:ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05:pre_effective_date_petition")?.canonicalObligationKeys ?? [];
  if (ndPetitionTrackTargets.length !== 1 || !sameSet(ndPetitionTrackTargets, ndPreEffectiveBranchTargets)) failures.push("North Dakota pre-effective petition track and exact service branch are double-counted or disconnected");

  if ((independent?.projectionRouteIds ?? []).length !== 9) {
    failures.push("Grade-A projection source accounting drift; expected nine exact route identities");
  }
  for (const projection of independent?.projectionRows ?? []) {
    const sourceKey = `pathway:${projection.routeId}`;
    const mappedKeys = mappings.find((row) => row.sourceRouteKey === sourceKey)?.canonicalObligationKeys ?? [];
    const joined = routes.filter((row) => mappedKeys.includes(row.routeKey));
    if (!joined.length || !joined.some((row) => row.currentImplementationEvidence.some((item) => item === `grade-a-projection:${projection.state}:${projection.commercialStatus}`))) {
      failures.push(`Grade-A projection route ${projection.routeId} is not joined to a canonical obligation`);
    }
    if (joined.some((row) => /COMMERCIALLY_ELIGIBLE$/.test(String(row.currentCommercialState)) && !/NOT_COMMERCIALLY_ELIGIBLE$/.test(String(row.currentCommercialState)))) {
      failures.push(`Grade-A projection route ${projection.routeId} invents commercial eligibility`);
    }
  }
  for (const contradiction of independent?.contradictionRows ?? []) {
    const sourceKey = `pathway:${contradiction.pathwayKey}`;
    const mappedKeys = mappings.find((row) => row.sourceRouteKey === sourceKey)?.canonicalObligationKeys ?? [];
    const joined = routes.filter((row) => mappedKeys.includes(row.routeKey));
    if (!joined.some((row) => row.currentImplementationEvidence.some((item) => item.startsWith(`unadopted-closure-contradiction:${contradiction.pathwayKey}:`)))) {
      failures.push(`unadopted closure contradiction ${contradiction.pathwayKey} is missing from review evidence`);
    }
    if (contradiction.proposal?.authority !== null || contradiction.proposal?.decidedOn !== null) failures.push(`closure contradiction fixture ${contradiction.pathwayKey} unexpectedly appears adopted`);
  }

  if (context.docs) {
    for (const [name, expected] of Object.entries(context.expected.docs)) {
      if (context.docs[name] !== expected) failures.push(`stale generated documentation: ${name}`);
    }
  }

  return unique(failures);
}

function normalizeStrategy(value) {
  return OUTPUT_STRATEGIES.includes(value);
}

function mappingIsExisting(status) {
  return new Set(["mapped", "complete", "existing_map", "approved_map"]).has(String(status ?? "").trim().toLowerCase());
}

function hasExplicitOfficialFormTreatment(row) {
  if (!row || row.currentOutputStrategy !== "official_pdf_fill" || row.participantFacingInstrument === "not recorded") return false;
  return row.requiredSourceIds?.some((sourceId) => sourceId.startsWith("official-form:"))
    || row.currentImplementationEvidence?.some((item) => item.startsWith("route-contract-packet-family-label:"));
}

function verifyEvidenceField(owner, field, value, failures) {
  if (!value || !["recorded", "not_recorded"].includes(value.status) || !Array.isArray(value.entries) || value.entries.length === 0) {
    failures.push(`${owner} worklist dimension ${field} is missing or malformed`);
    return;
  }
  if (value.status === "not_recorded" && (value.entries.length !== 1 || value.entries[0] !== "not recorded")) {
    failures.push(`${owner} worklist dimension ${field} must use the literal not recorded sentinel`);
  }
  if (value.status === "recorded" && value.entries.includes("not recorded")) failures.push(`${owner} worklist dimension ${field} mixes recorded evidence with not recorded`);
  if (value.status === "recorded" && value.entries.some((entry) => recordedUnknownSentinel(entry))) {
    failures.push(`${owner} worklist dimension ${field} marks unresolved/unknown/unstated evidence as recorded`);
  }
  if (value.status === "recorded" && value.entries.some((entry) => /^\d+$/.test(String(entry).trim()))) {
    failures.push(`${owner} worklist dimension ${field} contains a numeric map-index sentinel instead of route evidence`);
  }
  if (value.status === "recorded" && field === "serviceRecipients" && value.entries.some((entry) =>
    !(/^none required\b/i.test(String(entry))
      || /\b(?:recipient|serve|serves|served|service (?:on|to)|notice (?:on|to)|provide (?:a )?copy to|send (?:a )?copy to|no service|transmit.*\bto\b|prosecutor|attorney|respondent|custodian|agency|state)\b/i.test(String(entry))))) {
    failures.push(`${owner} serviceRecipients contains unrelated agency/filing text without service-recipient semantics`);
  }
  if (value.status === "recorded" && field === "serviceMethod" && value.entries.some((entry) => {
    const text = String(entry);
    return !(/^none required\b/i.test(text)
      || (/\b(?:serve|send|mail|deliver|delivery|electronic|e-?service|personal(?:ly)?|hand|certified mail|portal|no service|transmit|notif(?:y|ies)|proof of service)\b/i.test(text)
        && /\b(?:serve|served|service|notice|transmit|prosecutor|attorney|respondent|custodian|commonwealth|state|copy|after filing|request|demand|proof|record)\b/i.test(text)));
  })) {
    failures.push(`${owner} serviceMethod contains filing/contact delivery text without explicit service-method semantics`);
  }
  if (value.status === "recorded" && field === "filingDeadline" && value.entries.some((entry) =>
    !explicitParticipantFilingDeadlineEvidence(entry))) {
    failures.push(`${owner} filingDeadline contains a non-participant, obsolete, or processing deadline`);
  }
  if (value.status === "recorded" && field === "filingMethod" && value.entries.some((entry) => !explicitParticipantFilingMethodEvidence(entry))) {
    failures.push(`${owner} filingMethod contains profile/compiled/no-filing prose instead of an explicit participant submission action`);
  }
  if (value.status === "recorded" && field === "filingFee" && value.entries.some((entry) => routeFilingFeeClauses(entry).length === 0)) {
    failures.push(`${owner} filingFee contains a prerequisite or non-filing charge expressly disclaimed as a filing fee`);
  }
  if (value.status === "recorded" && field === "serviceTiming" && value.entries.some((entry) => !/^none required\b/i.test(String(entry)) && !explicitServiceTimingEvidence(entry))) {
    failures.push(`${owner} serviceTiming contains a non-service timing statement`);
  }
  if (value.status === "recorded" && field === "uncontestedHearingTreatment" && value.entries.some((entry) => !explicitUncontestedHearingEvidence(entry))) {
    failures.push(`${owner} uncontestedHearingTreatment lacks hearing/proceeding semantics or contains contested/opposition evidence`);
  }
  if (value.status === "recorded" && field === "contestedHearingOrOppositionHandoff" && value.entries.some((entry) => !explicitContestedHearingEvidence(entry))) {
    failures.push(`${owner} contestedHearingOrOppositionHandoff contains an unrelated professional boundary`);
  }
}

function main() {
  let context;
  try {
    context = loadVerificationContext();
  } catch (error) {
    console.error(`FAIL national route obligation census: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const failures = collectFailures(context);
  const { files } = renderedOutputs();
  for (const [file, expected] of files) {
    if (!fs.existsSync(file)) failures.push(`missing generated output ${path.relative(ROOT, file)}`);
    else if (fs.readFileSync(file, "utf8") !== expected) failures.push(`generated output byte mismatch ${path.relative(ROOT, file)}`);
  }
  if (failures.length) {
    console.error(`FAIL national route obligation census (${failures.length} failures)`);
    for (const failure of unique(failures)) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }
  const counts = context.summary.counts;
  console.log(`PASS national route obligation census (${counts.totalJurisdictions} jurisdictions; ${counts.totalStatutoryLegalTracks} tracks; ${counts.totalRuntimeRoutes} runtime routes; ${counts.totalTypedSourceEntities} typed sources; ${counts.totalCanonicalObligations} terminal obligations)`);
  console.log(`  Category A ${counts.possibleCategoryA}; Category B ${counts.possibleCategoryB}; legal review ${counts.needsLegalReview}; packet families ${counts.packetFamilies}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) main();
