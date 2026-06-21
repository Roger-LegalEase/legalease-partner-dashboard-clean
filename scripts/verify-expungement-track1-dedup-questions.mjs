import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];

const removals = {
  CA: [["county_or_filing_location", "county"]],
  FL: [["county_or_filing_location", "county"]],
  GA: [["county_or_filing_location", "county"]],
  IA: [["county_or_filing_location", "county"]],
  ID: [["county_or_filing_location", "county"]],
  IN: [["county_or_filing_location", "county"], ["case_identifier", "case_number"]],
  KS: [["county_or_filing_location", "county"]],
  KY: [["county_or_filing_location", "county"]],
  LA: [["case_identifier", "case_number"]],
  MD: [["county_or_filing_location", "county"]],
  NE: [["county_or_filing_location", "county"]],
  OR: [["county_or_filing_location", "county"]],
  WV: [["county_or_filing_location", "county"], ["case_identifier", "case_number"]]
};

const profileFiles = {
  CA: "CA-california.json",
  FL: "FL-florida.json",
  GA: "GA-georgia.json",
  IA: "IA-iowa.json",
  ID: "ID-idaho.json",
  IN: "IN-indiana.json",
  KS: "KS-kansas.json",
  KY: "KY-kentucky.json",
  LA: "LA-louisiana.json",
  MD: "MD-maryland.json",
  NE: "NE-nebraska.json",
  OR: "OR-oregon.json",
  WV: "WV-west-virginia.json"
};

const duplicateFields = Object.values(removals).flat().map(([field]) => field);
const keptFields = Object.values(removals).flat().map(([, field]) => field);
const modifiedCodes = Object.keys(removals);

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function readMainJson(file) {
  for (const ref of ["main", "origin/main"]) {
    const result = spawnSync("git", ["show", `${ref}:${file}`], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024
    });
    if (result.status === 0) return JSON.parse(result.stdout);
  }
  throw new Error(`Unable to read ${file} from main or origin/main.`);
}

function questionIds(profile) {
  return (profile.questions ?? []).map((question) => question.id);
}

function questionMap(profile) {
  return new Map((profile.questions ?? []).map((question) => [question.id, question]));
}

function deriveScreens(profile) {
  const stageOrder = new Map((profile.flowStages ?? []).map((stage) => [stage.id, stage.order]));
  return (profile.questions ?? [])
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !question.id.startsWith("source_question"))
    .sort((a, b) => {
      const orderA = stageOrder.get(a.question.stage) ?? Number.MAX_SAFE_INTEGER;
      const orderB = stageOrder.get(b.question.stage) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || a.index - b.index;
    })
    .map(({ question }) => question);
}

function byId(profile, id) {
  return (profile.questions ?? []).find((question) => question.id === id);
}

function stableStructuralQuestion(question) {
  const { prompt: _prompt, helperText: _helperText, optionDisplay: _optionDisplay, ...structural } = question;
  return JSON.stringify(structural);
}

function answerText(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(" | ").trim();
  return String(value).trim();
}

function isAffirmative(value) {
  const text = answerText(value).toLowerCase();
  return text === "true" || text === "yes" || text.startsWith("yes,") || text.includes("state or local");
}

function isNegative(value) {
  const text = answerText(value).toLowerCase();
  return text === "false" || text === "no" || text.startsWith("no,");
}

function isUnknownAnswer(value) {
  const text = answerText(value).toLowerCase();
  return !text || text.includes("not sure") || text.includes("unknown") || text.includes("prefer not");
}

function hasAnswer(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
}

function requiredMissingPublicQuestionIds(publicProfile, answers) {
  const publicIds = new Set([
    ...(publicProfile.questions ?? []).map((question) => question.id),
    ...(publicProfile.flowStages ?? []).flatMap((stage) => stage.questionIds ?? [])
  ]);
  return (publicProfile.questions ?? [])
    .filter((question) => publicIds.has(question.id))
    .filter((question) => question.required && question.contextOnly !== true)
    .filter((question) => !hasAnswer(answers[question.id]))
    .map((question) => question.id);
}

function addYears(dateString, years) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date;
}

function packetPlanForPathway(profile, pathwayId) {
  const plan = profile.packetGenerator?.pathways?.find((candidate) => candidate.pathwayId === pathwayId);
  if (!plan) return undefined;
  return {
    pathwayId,
    mode: plan.mode,
    formMappingStatus: plan.formMappingStatus,
    sourceFormIds: (plan.formCandidates ?? []).map((candidate) => `${profile.jurisdiction.code}:${candidate.relativePath}:${candidate.sha256}`),
    requiredInputIds: plan.requiredInputIds ?? profile.packetGenerator.requiredInputs ?? [],
    sourceRuleRefs: plan.sourceRuleRefs ?? []
  };
}

function isPacketPlanFulfillmentReady(plan) {
  if (!plan) return false;
  if (plan.mode === "automatic_relief_verification_and_guidance") return false;
  return plan.requiredInputIds.length > 0 && plan.sourceRuleRefs.length > 0 && plan.sourceFormIds.every((id) => id.includes(":"));
}

function contextTokenMatch(source, target) {
  const sourceTokens = new Set(source.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 4));
  return target.toLowerCase().split(/[^a-z0-9]+/).some((token) => token.length > 4 && sourceTokens.has(token));
}

function selectPathway(profile, answers) {
  const context = answerText(answers.possible_pathway_context).toLowerCase();
  if (context) {
    const byContext = profile.pathways.find((pathway) => contextTokenMatch(context, pathway.label) || contextTokenMatch(context, pathway.summary));
    if (byContext) return byContext;
  }
  const outcome = answerText(answers.case_outcome).toLowerCase();
  const automatic = profile.pathways.find((pathway) => /automatic|clean slate|no-filing/i.test(`${pathway.label} ${pathway.summary}`));
  if (/automatic|clean slate/.test(context) && automatic) return automatic;
  const nonConviction = profile.pathways.find((pathway) => /non[- ]conviction|dismiss|acquit|arrest/i.test(`${pathway.label} ${pathway.summary}`));
  if (/dismiss|acquit|no charge|not prosecuted|arrest/.test(outcome) && nonConviction) return nonConviction;
  const juvenile = profile.pathways.find((pathway) => /juvenile|minor/i.test(`${pathway.label} ${pathway.summary}`));
  if (/juvenile|minor/.test(outcome) && juvenile) return juvenile;
  const conviction = profile.pathways.find((pathway) => /conviction|misdemeanor|felony/i.test(`${pathway.label} ${pathway.summary}`));
  if (/conviction|misdemeanor|felony/.test(outcome) && conviction) return conviction;
  return profile.pathways[0];
}

function sourceCaution(profile, answers, pathwayId) {
  const pathway = profile.pathways.find((candidate) => candidate.id === pathwayId);
  const text = `${pathway?.label ?? ""} ${pathway?.summary ?? ""}`.toLowerCase();
  return text.includes("caution") || text.includes("review") || isAffirmative(answers.prior_relief);
}

function evaluate(profile, publicProfile, answers) {
  if (isNegative(answers.ownership_scope)) return { resultCode: "hard_stop", paymentAllowed: false };
  if (answerText(answers.jurisdiction_scope).toLowerCase().includes("federal")) return { resultCode: "hard_stop", paymentAllowed: false };

  const missingQuestionIds = requiredMissingPublicQuestionIds(publicProfile, answers);
  if (missingQuestionIds.length > 0) return { resultCode: "needs_more_info", paymentAllowed: false };

  if (isNegative(answers.sentence_completion_date) || isAffirmative(answers.pending_cases)) return { resultCode: "not_yet", paymentAllowed: false };
  const disposition = answerText(answers.disposition_date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(disposition)) {
    const earliest = addYears(disposition, 3);
    if (earliest && earliest > new Date()) return { resultCode: "not_yet", paymentAllowed: false };
  }

  const categories = Array.isArray(answers.state_exclusion_categories)
    ? answers.state_exclusion_categories.map(String)
    : answerText(answers.state_exclusion_categories).split("|");
  const normalized = categories.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (normalized.some((value) => value.includes("not sure"))) return { resultCode: "needs_review", paymentAllowed: false };
  if (normalized.filter((value) => !value.includes("none of these")).length > 0) return { resultCode: "likely_not_eligible", paymentAllowed: false };

  const legalFields = profile.questions.filter((question) => question.contextOnly !== true && question.stage !== "case_details" && question.stage !== "record_readiness");
  if (legalFields.find((question) => isUnknownAnswer(answers[question.id]))) return { resultCode: "needs_review", paymentAllowed: false };

  const pathway = selectPathway(profile, answers);
  if (!pathway) return { resultCode: "needs_review", paymentAllowed: false };
  const plan = packetPlanForPathway(profile, pathway.id);
  if (plan?.mode === "automatic_relief_verification_and_guidance") return { resultCode: "guidance_only", paymentAllowed: false };
  const resultCode = sourceCaution(profile, answers, pathway.id) ? "packet_ready_with_caution" : "packet_ready";
  return { resultCode, paymentAllowed: isPacketPlanFulfillmentReady(plan) };
}

function representativeValue(question) {
  if (question.id === "ownership_scope") return "Yes";
  if (question.id === "jurisdiction_scope") return "State or local";
  if (question.id === "sentence_completion_date") return "Yes";
  if (question.id === "financial_obligations") return "Yes";
  if (question.id === "pending_cases") return "No";
  if (question.id === "state_exclusion_categories") return ["None of these"];
  if (question.id === "record_documents" || question.id === "criminal_history") return "Yes";
  if (question.id === "disposition_date" || question.id === "arrest_date") return "2010-01-01";
  if (question.id === "age_at_offense") return "30";
  if (question.id === "county" || question.id === "county_or_filing_location") return "Sample County";
  if (question.id === "case_number" || question.id === "case_identifier") return "CASE-123";
  if (question.id === "court") return "Sample Court";
  if (question.id === "charge") return "Sample charge";
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_prefer_not_to_say" || question.type === "yes_no_unsure") return "Yes";
  if (Array.isArray(question.options) && question.options.length > 0) {
    return question.options.find((option) => !String(option).toLowerCase().includes("not sure") && !String(option).toLowerCase().includes("none of these")) ?? question.options[0];
  }
  return "Sample answer";
}

function representativeAnswers(publicProfile) {
  return Object.fromEntries((publicProfile.questions ?? []).map((question) => [question.id, representativeValue(question)]));
}

const currentPublic = readJson("src/lib/rcap-engine/compiled/all51.json");
const currentFrontend = readJson("src/lib/expungement-ai/frontend/profiles/all51.json");
const mainPublic = readMainJson("src/lib/rcap-engine/compiled/all51.json");

for (const code of modifiedCodes) {
  const currentEngine = readJson(`src/lib/rcap-engine/compiled/profiles/${profileFiles[code]}`);
  const mainEngine = readMainJson(`src/lib/rcap-engine/compiled/profiles/${profileFiles[code]}`);
  const currentPublicProfile = currentPublic[code];
  const currentFrontendProfile = currentFrontend[code];
  const mainPublicProfile = mainPublic[code];
  const targetRemoved = removals[code].map(([field]) => field).sort();

  for (const profile of [currentEngine, currentPublicProfile, currentFrontendProfile]) {
    const screens = deriveScreens(profile);
    for (const [removed, kept] of removals[code]) {
      assert(!screens.some((question) => question.id === removed), `${code} still renders removed duplicate ${removed}.`);
      assert(screens.some((question) => question.id === kept), `${code} no longer renders kept twin ${kept}.`);
    }
  }

  for (const profile of [currentEngine, currentPublicProfile]) {
    for (const stage of profile.flowStages ?? []) {
      if (Array.isArray(stage.questionIds)) {
        for (const [removed] of removals[code]) {
          assert(!stage.questionIds.includes(removed), `${code} flow stage still references removed duplicate ${removed}.`);
        }
      }
    }
  }

  const currentById = questionMap(currentPublicProfile);
  for (const question of mainPublicProfile.questions ?? []) {
    if (targetRemoved.includes(question.id)) continue;
    assert(currentById.has(question.id), `${code} removed non-listed field ${question.id}.`);
    if (currentById.has(question.id)) {
      assert(stableStructuralQuestion(currentById.get(question.id)) === stableStructuralQuestion(question), `${code} changed structural metadata for ${question.id}.`);
    }
  }

  const currentEngineById = questionMap(currentEngine);
  for (const question of mainEngine.questions ?? []) {
    if (targetRemoved.includes(question.id)) continue;
    assert(currentEngineById.has(question.id), `${code} engine profile removed non-listed field ${question.id}.`);
    if (currentEngineById.has(question.id)) {
      assert(stableStructuralQuestion(currentEngineById.get(question.id)) === stableStructuralQuestion(question), `${code} engine profile changed structural metadata for ${question.id}.`);
    }
  }

  for (const readiness of ["record_documents", "criminal_history"]) {
    if (byId(mainPublicProfile, readiness)) {
      assert(byId(currentPublicProfile, readiness), `${code} removed readiness field ${readiness}.`);
      assert(deriveScreens(currentPublicProfile).some((question) => question.id === readiness), `${code} readiness field ${readiness} is no longer visible.`);
    }
  }

  const exclusion = byId(mainPublicProfile, "state_exclusion_categories");
  if (exclusion) {
    const currentExclusion = byId(currentPublicProfile, "state_exclusion_categories");
    assert(currentExclusion, `${code} removed state_exclusion_categories.`);
    assert(deriveScreens(currentPublicProfile).some((question) => question.id === "state_exclusion_categories"), `${code} state_exclusion_categories is no longer visible.`);
    const order = new Map(currentPublicProfile.flowStages.map((stage) => [stage.id, stage.order]));
    assert((order.get(currentExclusion.stage) ?? 0) < (order.get("checkout") ?? 99), `${code} state_exclusion_categories is no longer pre-payment.`);
  }

  if (code === "OR" || code === "WV") {
    const ids = deriveScreens(currentPublicProfile).map((question) => question.id);
    assert(ids.filter((id) => id === "county").length === 1, `${code} must render exactly one canonical county field.`);
    assert(!ids.includes("county_or_filing_location"), `${code} must not render county_or_filing_location.`);
  }

  const mainAnswers = representativeAnswers(mainPublicProfile);
  const currentAnswers = representativeAnswers(currentPublicProfile);
  const mainResult = evaluate(mainEngine, mainPublicProfile, mainAnswers);
  const currentResult = evaluate(currentEngine, currentPublicProfile, currentAnswers);
  assert(mainResult.resultCode === currentResult.resultCode, `${code} resultCode changed from ${mainResult.resultCode} to ${currentResult.resultCode}.`);
  assert(mainResult.paymentAllowed === currentResult.paymentAllowed, `${code} paymentAllowed changed from ${mainResult.paymentAllowed} to ${currentResult.paymentAllowed}.`);
}

assert(duplicateFields.length === 15, `Expected 15 removal declarations, found ${duplicateFields.length}.`);
assert(keptFields.length === 15, `Expected 15 kept twin declarations, found ${keptFields.length}.`);

if (failures.length) {
  console.error("Expungement Track 1 de-dup verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement Track 1 de-dup verifier passed.");
console.log("Removed duplicate fields are absent from consumer screen sequences; kept twins remain visible.");
console.log("Readiness fields, state_exclusion_categories, prompts/options, and representative evaluator results are unchanged.");
