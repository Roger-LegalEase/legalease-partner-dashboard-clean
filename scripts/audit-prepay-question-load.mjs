// Audit-only. Reads compiled/public RCAP profile artifacts and writes friction reports.
// It does not import runtime modules, evaluate eligibility, change gates, call Stripe, or deploy.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const DESIGNER_PUBLIC_PATH = path.join(ROOT, "src/lib/rcap-engine/compiled/all51.json");
const ENGINE_PROFILES_DIR = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const PUBLIC_PROJECTION_PATH = path.join(ROOT, "src/lib/rcap-engine/public-profile-projection.ts");
const ROUTE_INVENTORY_PATH = path.join(ROOT, "data/expungement-ai/reports/petition-route-inventory.json");
const JSON_OUT = path.join(ROOT, "data/expungement-ai/reports/prepay-question-load.json");
const MD_OUT = path.join(ROOT, "docs/expungement-ai/PREPAY_QUESTION_LOAD_AUDIT.md");

const POSTPAY_STAGES = new Set(["record_readiness", "case_details", "packet_information"]);
const SOURCE_QUESTION_PREFIX = "source_question";
const TARGET = 12;
const HARD_CAP = 15;
const DEEP_DIVE_STATES = ["PA", "TX", "CA", "IL", "MD", "UT", "RI", "FL", "NV", "MA"];
const PAID_ROUTES_EXPECTED = 97;

const CATEGORY_TO_RECOMMENDED_PHASE = {
  prepayment_eligibility_question: "pre-payment",
  route_splitter: "pre-payment",
  hard_disqualifier: "pre-payment",
  timing_gate: "pre-payment",
  soft_confidence_question: "optional",
  packet_completion_field: "post-payment",
  official_form_field: "post-payment",
  external_document_field: "post-payment",
  filing_readiness_field: "post-payment",
  narrative_field: "post-payment",
  service_or_mailing_field: "post-payment",
  optional_or_later: "optional"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function maybeReadJson(filePath, fallback) {
  return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function git(args, fallback = "unknown") {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function gitHeadCommitShort() {
  const viaGit = git(["rev-parse", "--short", "HEAD"], "");
  if (viaGit) return viaGit;
  try {
    const head = fs.readFileSync(path.join(ROOT, ".git/HEAD"), "utf8").trim();
    const full = head.startsWith("ref: ")
      ? fs.readFileSync(path.join(ROOT, ".git", head.slice(5)), "utf8").trim()
      : head;
    return full.slice(0, 7);
  } catch {
    return "unknown";
  }
}

function gitBranchName() {
  const viaGit = git(["branch", "--show-current"], "");
  if (viaGit) return viaGit;
  try {
    const head = fs.readFileSync(path.join(ROOT, ".git/HEAD"), "utf8").trim();
    return head.startsWith("ref: refs/heads/") ? head.slice("ref: refs/heads/".length) : "detached";
  } catch {
    return "unknown";
  }
}

function extractWilmaFactQuestions() {
  const src = fs.readFileSync(PUBLIC_PROJECTION_PATH, "utf8");
  const start = src.indexOf("const WILMA_FACT_QUESTIONS");
  if (start === -1) return [];
  const arrayStart = src.indexOf("[", start);
  const marker = "\n];";
  const arrayEnd = src.indexOf(marker, arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) return [];
  const literal = src.slice(arrayStart, arrayEnd + 2);
  const sandbox = {};
  vm.runInNewContext(`out = ${literal}`, sandbox, { timeout: 1000 });
  return Array.isArray(sandbox.out) ? sandbox.out : [];
}

function publicProfilesWithWilmaFacts() {
  const profiles = readJson(DESIGNER_PUBLIC_PATH);
  const additions = extractWilmaFactQuestions();
  return Object.fromEntries(Object.entries(profiles).map(([code, profile]) => {
    const existing = new Set((profile.questions ?? []).map((q) => q.id));
    const newQuestions = additions.filter((q) => !existing.has(q.id)).map((q) => ({ ...q, addedByPublicProjection: true }));
    const questions = [...(profile.questions ?? []), ...newQuestions];
    const byStage = new Map();
    for (const question of questions) {
      if (!byStage.has(question.stage)) byStage.set(question.stage, []);
      byStage.get(question.stage).push(question.id);
    }
    const flowStages = (profile.flowStages ?? []).map((stage) => ({
      ...stage,
      questionIds: [...new Set([...(stage.questionIds ?? []), ...(byStage.get(stage.id) ?? [])])]
    }));
    return [code, { ...profile, questions, flowStages }];
  }));
}

async function projectedPublicProfiles() {
  const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
  const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
  return Object.fromEntries(getAllJurisdictionProfiles().map((profile) => [profile.jurisdiction.code, projectPublicProfile(profile)]));
}

function loadEngineProfiles() {
  return Object.fromEntries(fs.readdirSync(ENGINE_PROFILES_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const profile = readJson(path.join(ENGINE_PROFILES_DIR, file));
      return [profile.jurisdiction.code, profile];
    }));
}

function currentPhase(question, stageOrder, checkoutOrder) {
  if (question.lifecyclePhase) return String(question.lifecyclePhase).startsWith("prepay_") ? "pre-payment" : "post-payment";
  if (question.id.startsWith(SOURCE_QUESTION_PREFIX)) return "unclear";
  const order = stageOrder.get(question.stage) ?? Number.MAX_SAFE_INTEGER;
  if (order < checkoutOrder) return "pre-payment";
  if (order > checkoutOrder) return "post-payment";
  return "unclear";
}

function textOf(question) {
  const options = Array.isArray(question.options)
    ? question.options.join(" ")
    : question.options === undefined || question.options === null
      ? ""
      : String(question.options);
  return `${question.id} ${question.stage} ${question.prompt ?? ""} ${question.helperText ?? ""} ${options}`.toLowerCase();
}

function isStateSpecificIrrelevantWilma(question, code) {
  const id = String(question.id ?? "");
  const statePrefix = id.match(/^([a-z]{2})_/);
  return Boolean(statePrefix && statePrefix[1].toUpperCase() !== code);
}

function classifyQuestion(question, code) {
  const text = textOf(question);

  if (isStateSpecificIrrelevantWilma(question, code)) {
    return {
      category: "optional_or_later",
      recommendedPhase: "remove",
      moveRecommendation: "remove from checkout path",
      reason: "State-specific Wilma fact is public in this jurisdiction but belongs to another jurisdiction, so it should not be in this checkout path.",
      conversionImpact: "high",
      legalSafetyImpact: "low"
    };
  }

  if (question.id === "ownership_scope" || question.id === "jurisdiction_scope") {
    return category("prepayment_eligibility_question", "Needed to confirm self-help scope and state/local jurisdiction before opening a paid route.", "low", "high", "keep prepay");
  }

  if (POSTPAY_STAGES.has(question.stage)) {
    if (/patch|psp|sbi|scope report|chr|criminal[- ]history report|background check|fingerprint|certificate|certified|certified disposition|judgment of conviction|discharge paperwork|court paperwork|records handy|document|report/.test(text)) {
      return category("external_document_field", "External record/document readiness affects filing completion, not checkout eligibility.", "high", "low", "move postpay");
    }
    if (/court|county|docket|case number|case_identifier|case_number|charge|statute|arrest date|filing location/.test(text)) {
      return category("official_form_field", "Case/court/charge details are needed to complete forms and packet instructions after payment.", "high", "medium", "move postpay");
    }
    return category("packet_completion_field", "This is a packet-completion stage field, not a checkout gate.", "medium", "low", "move postpay");
  }

  if (/hardship|rehabilitation|manifest|explain|explanation|statement|why do you want|personal statement/.test(text)) {
    return category("narrative_field", "Narratives improve pleadings but should be collected during paid packet completion.", "high", "low", "move postpay");
  }
  if (/patch|psp|sbi|scope report|chr\/scope|criminal[- ]history report|background check|fingerprint|certificate|certified disposition|judgment of conviction|discharge paperwork|agency letter|money order|filing fee|agency fee|prosecutor review|stipulation/.test(text)) {
    return category("external_document_field", "External documents and fees are filing-readiness items and are not checkout blockers.", "high", "low", "move postpay");
  }
  if (/fee|restitution|fine|costs|paid off|money order|filing today|ready to file|attach|attachment/.test(text)) {
    return category("filing_readiness_field", "This may affect whether the packet can be filed today, but it should not block checkout.", "high", "medium", "move postpay");
  }
  if (/mail|service|serve|prosecutor|agency|custodian|address|clerk|filing instruction/.test(text)) {
    return category("service_or_mailing_field", "Service, mailing, prosecutor, agency, and filing logistics belong in packet completion.", "medium", "low", "move postpay");
  }
  if (question.contextOnly === true || question.doesNotSelectPathway === true || question.required === false) {
    if (/pending criminal charge|pending charge|sex offender registration|ineligible offense|violent felony|class a felony|new conviction during the waiting period|special preconditions/.test(text)) {
      return category("hard_disqualifier", "This can block a paid route when asked in a state-specific simplified way.", "medium", "high", "keep prepay");
    }
    if (/wait|waiting|completion|completed|release date|sentencing date|discharge date|conviction date|probation|parole|supervision end|branch applies|qualifying marijuana offense|lesser or no offense/.test(text)) {
      return category("soft_confidence_question", "This is a detailed confidence or source-fact prompt; collapse into a simpler timing/route gate before checkout or collect after payment.", "high", "medium", "collapse/combine");
    }
    return category("soft_confidence_question", "Optional/context prompt can help routing but should not add mandatory checkout friction.", "medium", "low", "simplify wording");
  }
  if (question.id === "case_outcome" || question.id === "offense_level" || /pathway|route|what kind of charge|how did the case end|what happened/.test(text)) {
    return category("route_splitter", "Needed to select a plausible paid route before checkout.", "low", "high", "keep prepay");
  }
  if (/pending|open cases|federal|sex offense|registration|violent|excluded|exclusion|domestic violence|dui|traffick|identity theft|pardon|prior relief|victim/.test(text)) {
    return category("hard_disqualifier", "A yes/no answer may clearly block or redirect payment for some routes.", "medium", "high", "keep prepay");
  }
  if (/date|time|wait|waiting|finished|completed|sentence|probation|parole|supervision|release|conviction count|class/.test(text)) {
    return category("timing_gate", "Timing controls whether a paid route can plausibly open, but detailed dates should be simplified where possible.", "medium", "high", "collapse/combine");
  }
  return category("prepayment_eligibility_question", "Appears to be a public eligibility gate before payment.", "medium", "medium", "keep prepay");
}

function category(categoryName, reason, conversionImpact, legalSafetyImpact, moveRecommendation) {
  return {
    category: categoryName,
    recommendedPhase: CATEGORY_TO_RECOMMENDED_PHASE[categoryName],
    reason,
    conversionImpact,
    legalSafetyImpact,
    moveRecommendation
  };
}

function routeDataByState(routeInventory) {
  const routes = routeInventory.routes ?? [];
  const grouped = new Map();
  for (const route of routes) {
    const code = route.jurisdictionCode;
    if (!grouped.has(code)) grouped.set(code, []);
    grouped.get(code).push(route);
  }
  return grouped;
}

function routeLabelsUsingQuestion(question, profile, paidRoutes) {
  const id = question.id;
  if (["ownership_scope", "jurisdiction_scope", "case_outcome", "offense_level", "possible_pathway_context"].includes(id)) {
    return paidRoutes.map((r) => r.pathwayId);
  }
  const packetRoutes = (profile.packetGenerator?.pathways ?? [])
    .filter((plan) => (plan.requiredInputIds ?? profile.packetGenerator?.requiredInputs ?? []).includes(id))
    .map((plan) => plan.pathwayId);
  return [...new Set(packetRoutes)];
}

function riskLevel(currentCount, moveCount, legalReview) {
  if (currentCount > 30) return "severe";
  if (currentCount > HARD_CAP) return "high";
  if (currentCount > TARGET || moveCount > 4 || legalReview) return "medium";
  return "low";
}

function biggestFrictionSource(questionRows) {
  const movable = questionRows.filter((q) => q.recommendedPhase !== "pre-payment");
  if (!movable.length) return "none";
  const counts = new Map();
  for (const q of movable) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function targetForState(code, keepCount, currentCount) {
  if (code === "PA") return 10;
  if (DEEP_DIVE_STATES.includes(code) && currentCount > TARGET) return Math.min(TARGET, Math.max(8, keepCount));
  return Math.min(TARGET, Math.max(8, keepCount));
}

async function buildReport() {
  const legacyPublicProfiles = publicProfilesWithWilmaFacts();
  const publicProfiles = await projectedPublicProfiles();
  const engineProfiles = loadEngineProfiles();
  const routeInventory = maybeReadJson(ROUTE_INVENTORY_PATH, { routes: [], totals: {} });
  const routesByState = routeDataByState(routeInventory);

  const states = Object.keys(publicProfiles).sort();
  const byState = {};
  const allQuestions = [];

  for (const code of states) {
    const profile = publicProfiles[code];
    const legacyProfile = legacyPublicProfiles[code];
    const engineProfile = engineProfiles[code] ?? {};
    const stageOrder = new Map((profile.flowStages ?? []).map((stage) => [stage.id, stage.order]));
    const legacyStageOrder = new Map((legacyProfile.flowStages ?? []).map((stage) => [stage.id, stage.order]));
    const checkoutOrder = stageOrder.get("checkout") ?? 12;
    const legacyCheckoutOrder = legacyStageOrder.get("checkout") ?? 12;
    const publicQuestions = (profile.questions ?? []).filter((q) => !String(q.id).startsWith(SOURCE_QUESTION_PREFIX));
    const legacyPublicQuestions = (legacyProfile.questions ?? []).filter((q) => !String(q.id).startsWith(SOURCE_QUESTION_PREFIX));
    const legacyPrepayCount = legacyPublicQuestions.filter((question) => currentPhase(question, legacyStageOrder, legacyCheckoutOrder) === "pre-payment").length;
    const paidRoutes = (routesByState.get(code) ?? []).filter((r) => r.bucket === "paid_now");
    const guidanceRoutes = (routesByState.get(code) ?? []).filter((r) => r.bucket === "permanent_guidance_not_a_paid_product" || r.bucket === "not_currently_operational" || r.bucket === "discard_or_duplicate");

    const questionRows = publicQuestions.map((question) => {
      const classification = classifyQuestion(question, code);
      const phase = currentPhase(question, stageOrder, checkoutOrder);
      const row = {
        questionId: question.id,
        text: question.prompt,
        label: question.prompt,
        state: code,
        routesUsingIt: routeLabelsUsingQuestion(question, engineProfile, paidRoutes),
        currentPhase: phase,
        recommendedPhase: classification.recommendedPhase,
        category: classification.category,
        reason: classification.reason,
        conversionImpact: classification.conversionImpact,
        legalSafetyImpact: classification.legalSafetyImpact,
        moveRecommendation: classification.moveRecommendation,
        stage: question.stage,
        required: question.required === true,
        contextOnly: question.contextOnly === true,
        doesNotSelectPathway: question.doesNotSelectPathway === true,
        addedByPublicProjection: question.addedByPublicProjection === true
      };
      allQuestions.push(row);
      return row;
    });

    const currentPrepay = questionRows.filter((q) => q.currentPhase === "pre-payment");
    const recommendedPrepay = currentPrepay.filter((q) => q.recommendedPhase === "pre-payment");
    const recommendedPostpay = currentPrepay.filter((q) => q.recommendedPhase === "post-payment" || q.recommendedPhase === "optional" || q.recommendedPhase === "remove");
    const legalReviewNeeded = recommendedPrepay.some((q) => q.legalSafetyImpact === "high" && q.addedByPublicProjection) || code === "PA";
    const minimumSafeCount = targetForState(code, recommendedPrepay.length, currentPrepay.length);
    const targetCount = targetForState(code, recommendedPrepay.length, currentPrepay.length);

    byState[code] = {
      jurisdictionCode: code,
      jurisdictionName: profile.jurisdiction?.name ?? code,
      totalPublicQuestions: publicQuestions.length,
      estimatedPrepaymentQuestionsBeforeProjectionFix: legacyPrepayCount,
      estimatedPrepaymentQuestionsCurrentlyAsked: currentPrepay.length,
      estimatedPrepaymentQuestionsAfterProjectionFix: currentPrepay.length,
      estimatedPostPaymentPacketCompletionQuestions: publicQuestions.length - currentPrepay.length + recommendedPostpay.length,
      paidRoutesCount: paidRoutes.length,
      guidanceOnlyRoutesCount: guidanceRoutes.length,
      highestFrictionRoute: paidRoutes[0]?.routeKey ?? paidRoutes[0]?.pathwayId ?? "none",
      minimumSafePrepaymentQuestionCount: minimumSafeCount,
      recommendedTargetPrepaymentCount: targetCount,
      questionsThatCanMoveAfterPayment: recommendedPostpay.length,
      riskLevel: riskLevel(currentPrepay.length, recommendedPostpay.length, legalReviewNeeded),
      exceeds12QuestionTarget: currentPrepay.length > TARGET,
      exceeds15QuestionHardCap: currentPrepay.length > HARD_CAP,
      needsLegalReviewBeforeMovingQuestions: legalReviewNeeded,
      biggestFrictionSource: biggestFrictionSource(questionRows),
      recommendedNextAction: recommendedPostpay.length
        ? "Move external-document, filing-readiness, official-form, narrative, and broad Wilma/source-detail prompts into paid packet completion; keep only route/timing/disqualifier triage before checkout."
        : "Keep current short triage; monitor conversion.",
      questions: questionRows
    };
  }

  const stateRows = Object.values(byState);
  const top15 = [...stateRows]
    .sort((a, b) => b.estimatedPrepaymentQuestionsBeforeProjectionFix - a.estimatedPrepaymentQuestionsBeforeProjectionFix || a.jurisdictionCode.localeCompare(b.jurisdictionCode))
    .slice(0, 15)
    .map((row) => ({
      state: row.jurisdictionCode,
      name: row.jurisdictionName,
      beforePrepaymentQuestionCount: row.estimatedPrepaymentQuestionsBeforeProjectionFix,
      currentPrepaymentQuestionCount: row.estimatedPrepaymentQuestionsCurrentlyAsked,
      afterPrepaymentQuestionCount: row.estimatedPrepaymentQuestionsAfterProjectionFix,
      targetPrepaymentQuestionCount: row.recommendedTargetPrepaymentCount,
      questionsToMoveAfterPayment: row.questionsThatCanMoveAfterPayment,
      estimatedReduction: Math.max(0, row.estimatedPrepaymentQuestionsBeforeProjectionFix - row.estimatedPrepaymentQuestionsAfterProjectionFix),
      biggestFrictionSource: row.biggestFrictionSource,
      recommendedNextAction: row.recommendedNextAction
    }));

  const deepDives = Object.fromEntries(DEEP_DIVE_STATES.map((code) => {
    const row = byState[code];
    const questions = row.questions;
    const gates = questions.filter((q) => q.recommendedPhase === "pre-payment");
    const postpay = questions.filter((q) => q.recommendedPhase === "post-payment" || q.recommendedPhase === "optional" || q.recommendedPhase === "remove");
    return [code, {
      currentPrepaymentFlowSummary: `${row.estimatedPrepaymentQuestionsCurrentlyAsked} public before-checkout questions; ${row.questionsThatCanMoveAfterPayment} are recommended for post-payment, optional handling, or removal from checkout.`,
      trueEligibilityGates: gates.map((q) => q.questionId),
      packetOrFormFields: questions.filter((q) => ["packet_completion_field", "official_form_field"].includes(q.category)).map((q) => q.questionId),
      externalDocumentOrFilingReadinessFields: questions.filter((q) => ["external_document_field", "filing_readiness_field"].includes(q.category)).map((q) => q.questionId),
      questionsCanSafelyMoveAfterPayment: postpay.map((q) => q.questionId),
      proposedMinimumPrepaymentFlow: gates.map((q) => q.text).slice(0, row.recommendedTargetPrepaymentCount),
      proposedPostPaymentPacketCompletionFlow: postpay.map((q) => q.text),
      legalRiskNotes: row.needsLegalReviewBeforeMovingQuestions
        ? "Legal review should confirm any detailed source/Wilma fact currently relied on for payment is either converted into a public simplified gate or moved after checkout with evaluator safety preserved."
        : "Low to medium legal risk if route splitters, timing gates, pending-charge checks, and statutory exclusions remain before checkout.",
      conversionRiskNotes: row.exceeds15QuestionHardCap
        ? "High conversion risk: current flow exceeds the 15-question hard cap before payment."
        : row.exceeds12QuestionTarget
          ? "Medium conversion risk: current flow exceeds the ideal 8-12 question target."
          : "Lower conversion risk: current public triage is near the target budget."
    }];
  }));

  const pa = byState.PA;
  const paQuestions = pa.questions;
  const paPrepayKeep = paQuestions.filter((q) => q.recommendedPhase === "pre-payment");
  const paMove = paQuestions.filter((q) => q.recommendedPhase !== "pre-payment");
  const report = {
    generatedAt: new Date().toISOString(),
    branch: gitBranchName(),
    commit: gitHeadCommitShort(),
    auditOnly: true,
    noRuntimeBehaviorChangedByScript: true,
    sources: {
      publicDesignerProfiles: path.relative(ROOT, DESIGNER_PUBLIC_PATH),
      publicProjection: path.relative(ROOT, PUBLIC_PROJECTION_PATH),
      engineProfiles: path.relative(ROOT, ENGINE_PROFILES_DIR),
      routeInventory: path.relative(ROOT, ROUTE_INVENTORY_PATH)
    },
    productLegalRule: "External documents, fees, fingerprints, certified dispositions, prosecutor review/stipulation, and filing attachments are post-payment filing-readiness or packet-completion items, not checkout blockers.",
    paidJurisdictions: routeInventory.totals?.paidNowJurisdictions ?? new Set((routeInventory.routes ?? []).filter((r) => r.bucket === "paid_now").map((r) => r.jurisdictionCode)).size,
    paidRoutes: routeInventory.totals?.paidNowRoutes ?? ((routeInventory.routes ?? []).filter((r) => r.bucket === "paid_now").length || PAID_ROUTES_EXPECTED),
    totals: {
      jurisdictions: stateRows.length,
      totalPublicQuestionsAcrossAllStates: stateRows.reduce((sum, row) => sum + row.totalPublicQuestions, 0),
      totalEstimatedPrepaymentQuestionsBeforeProjectionFix: stateRows.reduce((sum, row) => sum + row.estimatedPrepaymentQuestionsBeforeProjectionFix, 0),
      totalEstimatedPrepaymentQuestionsCurrentlyAsked: stateRows.reduce((sum, row) => sum + row.estimatedPrepaymentQuestionsCurrentlyAsked, 0),
      totalEstimatedPrepaymentQuestionsAfterProjectionFix: stateRows.reduce((sum, row) => sum + row.estimatedPrepaymentQuestionsAfterProjectionFix, 0),
      totalRecommendedToMovePostPaymentOrRemove: stateRows.reduce((sum, row) => sum + Math.max(0, row.estimatedPrepaymentQuestionsBeforeProjectionFix - row.estimatedPrepaymentQuestionsAfterProjectionFix), 0),
      totalMovedPostPaymentByProjectionFix: stateRows.reduce((sum, row) => sum + Math.max(0, row.estimatedPrepaymentQuestionsBeforeProjectionFix - row.estimatedPrepaymentQuestionsAfterProjectionFix), 0),
      totalMustRemainPrepayment: stateRows.reduce((sum, row) => sum + row.questions.filter((q) => q.recommendedPhase === "pre-payment").length, 0),
      averageEstimatedPrepaymentQuestionsBeforeProjectionFix: Number((stateRows.reduce((sum, row) => sum + row.estimatedPrepaymentQuestionsBeforeProjectionFix, 0) / stateRows.length).toFixed(2)),
      averageEstimatedPrepaymentQuestionsPerState: Number((stateRows.reduce((sum, row) => sum + row.estimatedPrepaymentQuestionsCurrentlyAsked, 0) / stateRows.length).toFixed(2)),
      averageEstimatedPrepaymentQuestionsAfterProjectionFix: Number((stateRows.reduce((sum, row) => sum + row.estimatedPrepaymentQuestionsAfterProjectionFix, 0) / stateRows.length).toFixed(2)),
      medianEstimatedPrepaymentQuestionsBeforeProjectionFix: median(stateRows.map((row) => row.estimatedPrepaymentQuestionsBeforeProjectionFix)),
      medianEstimatedPrepaymentQuestionsPerState: median(stateRows.map((row) => row.estimatedPrepaymentQuestionsCurrentlyAsked)),
      medianEstimatedPrepaymentQuestionsAfterProjectionFix: median(stateRows.map((row) => row.estimatedPrepaymentQuestionsAfterProjectionFix))
    },
    top15HighestFrictionStatesBeforePayment: top15,
    statesOver12QuestionTarget: stateRows.filter((row) => row.exceeds12QuestionTarget).map((row) => ({ state: row.jurisdictionCode, count: row.estimatedPrepaymentQuestionsCurrentlyAsked })),
    statesOver15QuestionHardCap: stateRows.filter((row) => row.exceeds15QuestionHardCap).map((row) => ({
      state: row.jurisdictionCode,
      count: row.estimatedPrepaymentQuestionsCurrentlyAsked,
      reason: row.jurisdictionCode === "NY"
        ? "NY CPL 160.59/CPL 160.58 route-specific hard gates remain prepayment facts."
        : "Needs legal review before any further reduction."
    })),
    statesNeedingLegalReviewBeforeMovingQuestions: stateRows.filter((row) => row.needsLegalReviewBeforeMovingQuestions).map((row) => row.jurisdictionCode),
    questionTypeFriction: Object.fromEntries([...new Set(allQuestions.map((q) => q.category))].sort().map((cat) => [cat, allQuestions.filter((q) => q.category === cat).length])),
    deepDiveStates: deepDives,
    pennsylvaniaDeepDive: {
      currentPublicQuestionCount: pa.totalPublicQuestions,
      currentEstimatedPrepaymentQuestionCount: pa.estimatedPrepaymentQuestionsCurrentlyAsked,
      routeSplittersNeededBeforePayment: paQuestions.filter((q) => q.category === "route_splitter").map((q) => q.questionId),
      rule790PrepaymentEssentials: ["case outcome: non-conviction/acquittal/dismissal", "pending criminal charges", "broad excluded offense category where applicable", "simplified timing/objection posture when required"],
      rule490PrepaymentEssentials: ["summary-only case vs other conviction/sealing case", "five-year arrest/prosecution-free timing gate", "new arrest/prosecution during waiting period", "broad excluded category"],
      rule791PrepaymentEssentials: ["conviction/sealing vs expungement route", "misdemeanor/felony or not sure", "simplified 7/10-year conviction-free timing gate", "broad excluded offense category", "pending criminal charges"],
      cleanSlateGuidanceOnlySplitter: "Ask whether the user is only looking for automatic Clean Slate limited access; if yes, show guidance-only/no paid packet unless a petition packet route remains plausible.",
      patchPspHandling: "PATCH/PSP reports may be needed before filing, but they are filing-readiness items and should be explained after payment or in next-step copy, not used as checkout blockers.",
      questionsThatShouldMoveAfterPayment: paMove.map((q) => q.questionId),
      questionsThatMustStayBeforePayment: paPrepayKeep.map((q) => q.questionId),
      recommendedPrepaymentCount: pa.recommendedTargetPrepaymentCount,
      recommendedPostPaymentCompletionFields: paMove.map((q) => q.text),
      proposedPrepaymentFlow: [
        "What happened in the case?",
        "Is it a court case, summary-only case, conviction/sealing case, or not sure?",
        "Are there pending criminal charges?",
        "Has enough time passed using a simplified timing route question?",
        "Any broad excluded offense category?",
        "Any new conviction/arrest/prosecution during the waiting period where required?",
        "Is the user looking only for automatic Clean Slate?",
        "Confirm that PATCH/PSP may be needed before filing but is not needed before payment."
      ]
    },
    conversionRecommendations: {
      stage1FreeEligibilityTriage: {
        target: "8-12 plain-English route-focused questions; hard cap 15 unless legal review allowlists the state.",
        purpose: "Safely open or block payment based on jurisdiction, route family, hard disqualifiers, and simplified timing.",
        suggestedCopy: "We found a possible record-clearing packet route. The next step is to generate your packet. Some filing details or outside records may still be needed before you submit it."
      },
      stage2PaidPacketCompletion: {
        purpose: "Collect form fields, narratives, court/county/docket details, outside-document status, service instructions, and Briefcase packet completion fields.",
        suggestedCopy: "Your packet has been started. We'll now collect the details needed to complete your forms and explain anything you still need before filing."
      }
    },
    byState,
    allQuestions
  };

  return report;
}

function mdList(items, empty = "None.") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

function mdTable(headers, rows) {
  const line = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  return [line, sep, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

function renderMarkdown(report) {
  const pa = report.pennsylvaniaDeepDive;
  const topRows = report.top15HighestFrictionStatesBeforePayment.map((row) => [
    row.state,
    row.beforePrepaymentQuestionCount,
    row.currentPrepaymentQuestionCount,
    row.targetPrepaymentQuestionCount,
    row.questionsToMoveAfterPayment,
    row.estimatedReduction,
    row.biggestFrictionSource,
    row.recommendedNextAction
  ]);

  const deepDiveMd = DEEP_DIVE_STATES.map((code) => {
    const row = report.byState[code];
    const dive = report.deepDiveStates[code];
    return `### ${code} — ${row.jurisdictionName}

- Current pre-payment flow: ${dive.currentPrepaymentFlowSummary}
- True eligibility gates: ${dive.trueEligibilityGates.map((id) => `\`${id}\``).join(", ") || "None detected"}
- Packet/form fields: ${dive.packetOrFormFields.map((id) => `\`${id}\``).join(", ") || "None detected"}
- External-document or filing-readiness fields: ${dive.externalDocumentOrFilingReadinessFields.map((id) => `\`${id}\``).join(", ") || "None detected"}
- Can move after payment / optional / remove: ${dive.questionsCanSafelyMoveAfterPayment.length}
- Proposed minimum pre-payment count: ${row.minimumSafePrepaymentQuestionCount}
- Legal risk notes: ${dive.legalRiskNotes}
- Conversion risk notes: ${dive.conversionRiskNotes}
`;
  }).join("\n");

  return `# Prepay Question Load Audit

Generated by \`npm run rcap:audit-prepay-question-load\`.

This is audit-only. It does not move questions, alter eligibility logic, alter payment behavior, run Stripe, deploy, or mark anything live.

## Stabilization

- Branch: \`${report.branch}\`
- Commit: \`${report.commit}\`
- Paid jurisdictions: ${report.paidJurisdictions}
- Paid routes: ${report.paidRoutes}
- Source model: public designer profiles plus current public projection Wilma fact questions; raw \`source_question_*\` engine rows are not treated as public checkout facts.

## Summary

- Total public questions across all states: ${report.totals.totalPublicQuestionsAcrossAllStates}
- Average estimated pre-payment questions per state: ${report.totals.averageEstimatedPrepaymentQuestionsBeforeProjectionFix} before -> ${report.totals.averageEstimatedPrepaymentQuestionsAfterProjectionFix} after
- Median estimated pre-payment questions per state: ${report.totals.medianEstimatedPrepaymentQuestionsBeforeProjectionFix} before -> ${report.totals.medianEstimatedPrepaymentQuestionsAfterProjectionFix} after
- Questions recommended to move post-payment / make optional / remove from checkout: ${report.totals.totalRecommendedToMovePostPaymentOrRemove}
- Questions that must remain pre-payment: ${report.totals.totalMustRemainPrepayment}
- States over 12-question target: ${report.statesOver12QuestionTarget.length}
- States over 15-question hard cap: ${report.statesOver15QuestionHardCap.length}
- States needing legal review before moving questions: ${report.statesNeedingLegalReviewBeforeMovingQuestions.length}

## Top 15 Highest-Friction States Before Payment

${mdTable(["State", "Before", "After", "Target", "Move Later", "Reduction", "Biggest Source", "Next Action"], topRows)}

## States Over 15-Question Hard Cap

${mdList(report.statesOver15QuestionHardCap.map((row) => `${row.state}: ${row.count} — ${row.reason}`))}

## States Needing Legal Review Before Moving Questions

${mdList(report.statesNeedingLegalReviewBeforeMovingQuestions)}

## Question Types Creating Drop-Off

${mdList(Object.entries(report.questionTypeFriction).map(([category, count]) => `\`${category}\`: ${count}`))}

## Deep-Dive States

${deepDiveMd}

## Pennsylvania Deep Dive

- Current PA public question count: ${pa.currentPublicQuestionCount}
- Current estimated PA pre-payment question count: ${pa.currentEstimatedPrepaymentQuestionCount}
- Recommended PA pre-payment count: ${pa.recommendedPrepaymentCount}
- Questions that should move after payment / optional / remove: ${pa.questionsThatShouldMoveAfterPayment.length}
- Questions that must stay before payment: ${pa.questionsThatMustStayBeforePayment.length}

Route splitters needed before payment:

${mdList(pa.routeSplittersNeededBeforePayment.map((id) => `\`${id}\``))}

Rule 790 essentials:

${mdList(pa.rule790PrepaymentEssentials)}

Rule 490 essentials:

${mdList(pa.rule490PrepaymentEssentials)}

Rule 791 essentials:

${mdList(pa.rule791PrepaymentEssentials)}

Clean Slate guidance-only splitter:

- ${pa.cleanSlateGuidanceOnlySplitter}

PATCH / PSP handling:

- ${pa.patchPspHandling}

Proposed PA pre-payment flow:

${mdList(pa.proposedPrepaymentFlow)}

## Two-Stage Funnel Recommendation

Stage 1 — Free eligibility triage:

- Short, plain-English, route-focused.
- Enough to safely open or block payment.
- Target 8-12 questions; hard cap 15 unless legal review explicitly allowlists a state.
- Suggested copy: "${report.conversionRecommendations.stage1FreeEligibilityTriage.suggestedCopy}"

Stage 2 — Paid packet completion:

- Collect official form fields, narratives, court/county/docket details, attachment info, outside-document status, service and filing instructions.
- Finalize the Briefcase packet and explain filing readiness.
- Suggested copy: "${report.conversionRecommendations.stage2PaidPacketCompletion.suggestedCopy}"

## Per-State Details

${mdTable(
  ["State", "Name", "Public Qs", "Prepay Before/After", "Target", "Move Later", "Paid Routes", "Guidance Routes", "Risk", ">12", ">15", "Legal Review"],
  Object.values(report.byState).map((row) => [
    row.jurisdictionCode,
    row.jurisdictionName,
    row.totalPublicQuestions,
    `${row.estimatedPrepaymentQuestionsBeforeProjectionFix} -> ${row.estimatedPrepaymentQuestionsAfterProjectionFix}`,
    row.recommendedTargetPrepaymentCount,
    row.questionsThatCanMoveAfterPayment,
    row.paidRoutesCount,
    row.guidanceOnlyRoutesCount,
    row.riskLevel,
    row.exceeds12QuestionTarget ? "yes" : "no",
    row.exceeds15QuestionHardCap ? "yes" : "no",
    row.needsLegalReviewBeforeMovingQuestions ? "yes" : "no"
  ])
)}
`;
}

async function main() {
  const report = await buildReport();
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MD_OUT, renderMarkdown(report));
  console.log("rcap:audit-prepay-question-load");
  console.log(`Branch: ${report.branch}`);
  console.log(`Commit: ${report.commit}`);
  console.log(`Paid jurisdictions: ${report.paidJurisdictions}`);
  console.log(`Paid routes: ${report.paidRoutes}`);
  console.log(`Public questions: ${report.totals.totalPublicQuestionsAcrossAllStates}`);
  console.log(`Average prepay questions/state: ${report.totals.averageEstimatedPrepaymentQuestionsBeforeProjectionFix} before -> ${report.totals.averageEstimatedPrepaymentQuestionsAfterProjectionFix} after`);
  console.log(`Median prepay questions/state: ${report.totals.medianEstimatedPrepaymentQuestionsBeforeProjectionFix} before -> ${report.totals.medianEstimatedPrepaymentQuestionsAfterProjectionFix} after`);
  console.log(`PA current -> target: ${report.pennsylvaniaDeepDive.currentEstimatedPrepaymentQuestionCount} -> ${report.pennsylvaniaDeepDive.recommendedPrepaymentCount}`);
  console.log(`States over hard cap: ${report.statesOver15QuestionHardCap.length}`);
  console.log(`Wrote ${path.relative(ROOT, JSON_OUT)}`);
  console.log(`Wrote ${path.relative(ROOT, MD_OUT)}`);
}

main();
