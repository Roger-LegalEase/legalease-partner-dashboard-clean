import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/shared-integration.patch"
);
const CLOSURE_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/closure.json"
);
const EVALUATOR_RELATIVE = "src/lib/rcap-engine/evaluator.ts";
const PROJECTION_RELATIVE = "src/lib/rcap-engine/public-profile-projection.ts";
const METADATA_RELATIVE = "data/expungement-ai/route-product-metadata.json";
const closure = JSON.parse(fs.readFileSync(CLOSURE_PATH, "utf8"));

function replaceExactlyOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`${label}: source anchor is missing`);
  if (source.indexOf(search, first + search.length) >= 0) {
    throw new Error(`${label}: source anchor is not unique`);
  }
  return source.replace(search, replacement);
}

function mutateRouteSet(source, name, removals, additions, comment) {
  const expression = new RegExp(`(const ${name} = new Set\\(\\[)([\\s\\S]*?)(\\n\\]\\);)`);
  const match = source.match(expression);
  if (!match) throw new Error(`Missing evaluator set ${name}`);
  let body = match[2];
  for (const routeKey of removals) {
    const routeLine = new RegExp(`^[ \\t]*"${routeKey.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}",?\\n?`, "m");
    if (!routeLine.test(body)) throw new Error(`${name}: removal route is missing: ${routeKey}`);
    body = body.replace(routeLine, "");
  }
  const alreadyPresent = new Set([...body.matchAll(/"([A-Z]{2}:[^"]+)"/g)].map((entry) => entry[1]));
  const freshAdditions = additions.filter((routeKey) => !alreadyPresent.has(routeKey));
  let cleanedBody = body.replace(/\s+$/, "");
  if (!cleanedBody.startsWith("\n")) cleanedBody = `\n${cleanedBody}`;
  if (freshAdditions.length > 0 && !cleanedBody.endsWith(",")) cleanedBody += ",";
  const additionBlock = freshAdditions.length > 0
    ? `\n  // ${comment}\n${freshAdditions.map((routeKey) => `  "${routeKey}",`).join("\n")}`
    : "";
  const replacement = `${match[1]}${cleanedBody}${additionBlock}${match[3]}`;
  return source.replace(expression, replacement);
}

function buildEvaluatorSource() {
  const original = fs.readFileSync(path.join(ROOT, EVALUATOR_RELATIVE), "utf8");
  let source = mutateRouteSet(
    original,
    "RATIFIED_DEPLOYABLE_ROUTES",
    closure.sharedHandoff.removeFromRatifiedDeployable,
    [],
    "Corrections A removes routes whose exact wait, anchor, or product classification is not integrated."
  );
  source = mutateRouteSet(
    source,
    "CORRECTED_AWAITING_RECONFIRM_ROUTES",
    [],
    closure.sharedHandoff.addToCorrectedAwaitingReconfirm,
    "Corrections A: exact Mississippi clocks run before the formal legal-reconfirmation hold."
  );
  source = mutateRouteSet(
    source,
    "HELD_GUIDANCE_ROUTES",
    [],
    closure.sharedHandoff.addToHeldGuidance,
    "Corrections A: withdrawn or non-product proposals stay guidance-only and fail closed."
  );

  source = replaceExactlyOnce(
    source,
    'return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 90, unit: "days", raw: "90 days" }, "Louisiana Art. 998 first-offense marijuana expungement requires 90 days from conviction (disposition date used as the available anchor).");',
    'return timingFromExactAnchor(profile, answers, rule, pathway, "conviction_date", { value: 90, unit: "days", raw: "90 days" }, "Louisiana Art. 998 first-offense marijuana expungement requires 90 days from the conviction date.");',
    "Louisiana Art. 998 exact conviction anchor"
  );
  source = replaceExactlyOnce(
    source,
    'return timingFromAnchor(profile, answers, rule, pathway, "disposition_date", { value: 60, unit: "days", raw: "60 days" }, "Alaska CourtView exclusion (Form TF-810 · AS 22.35.030 / Admin. R. 40) is available 60 days after the acquittal or dismissal.");',
    'return timingFromExactAnchor(profile, answers, rule, pathway, "disposition_date", { value: 60, unit: "days", raw: "60 days" }, "Alaska CourtView exclusion (Form TF-810 · AS 22.35.030 / Admin. R. 40) is available 60 days after the acquittal or dismissal.");',
    "Alaska TF-810 exact disposition anchor"
  );

  const mississippiInsertionAnchor = `  if (key === "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {`;
  const mississippiOverrides = `  // ---- Corrections A: exact Mississippi route clocks; payment remains held for reconfirmation ----
  if (key === "MS:additional-justice-or-municipal-court-misdemeanor-relief") {
    return timingFromExactAnchor(profile, answers, rule, pathway, "ms_last_conviction_date_any_court", { value: 2, unit: "years", raw: "2 years" }, "Miss. Code §§ 9-11-15(3) and 21-23-7(6) require two years of good conduct from the last conviction in any court.");
  }
  if (key === "MS:first-offense-dui-expungement") {
    return timingFromExactAnchor(profile, answers, rule, pathway, "ms_successful_sentence_completion_date", { value: 5, unit: "years", raw: "5 years" }, "Miss. Code § 63-11-30(13) requires five years after successful completion of every sentence term and condition.");
  }
  if (key === "MS:minor-in-possession-underage-alcohol-expungement") {
    const outcome = normalizeCaseOutcome(answers.case_outcome);
    if (outcome === "dismissed" || outcome === "acquitted") {
      return timingFromExactAnchor(profile, answers, rule, pathway, "ms_mip_dismissal_or_discharge_date", { value: 1, unit: "years", raw: "1 year" }, "Miss. Code § 67-3-70(6) opens the dismissal branch one year after dismissal and discharge.");
    }
    const fineImposed = answers.ms_mip_fine_imposed;
    if (!answerText(fineImposed).trim()) {
      return {
        status: "missing_anchor",
        reason: reason(profile.jurisdiction.code, "ms_mip_fine_applicability_missing", "The conviction branch needs to know whether a fine was imposed before its latest applicable date can be computed.", rule.sourceRef ?? pathway.sourceRef),
        missingQuestionIds: ["ms_mip_fine_imposed"]
      };
    }
    if (isExplicitUnknownAnswer(fineImposed)) {
      return {
        status: "needs_review",
        reason: reason(profile.jurisdiction.code, "ms_mip_fine_applicability_unknown", "Whether a fine was imposed is uncertain, so the latest applicable date cannot be computed.", rule.sourceRef ?? pathway.sourceRef)
      };
    }
    if (isNegative(fineImposed)) {
      return timingFromExactAnchor(profile, answers, rule, pathway, "ms_mip_sentence_completion_date", { value: 1, unit: "years", raw: "1 year" }, "Miss. Code § 67-3-70(6) opens the conviction branch one year after sentence completion when no fine was imposed.");
    }
    return latestExactAnchorTiming(profile, answers, rule, pathway, ["ms_mip_sentence_completion_date", "ms_mip_fine_payment_date"], { value: 1, unit: "years", raw: "1 year" }, "Miss. Code § 67-3-70(6) opens the conviction branch one year after the later sentence-completion or fine-payment date when a fine was imposed.");
  }
`;
  source = replaceExactlyOnce(
    source,
    mississippiInsertionAnchor,
    `${mississippiOverrides}${mississippiInsertionAnchor}`,
    "Mississippi exact route timing overrides"
  );

  const helperAnchor = "function latestAnchorTiming(profile: EngineProfile";
  const exactHelpers = `function latestExactAnchorTiming(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, anchorIds: string[], duration: CompiledDuration, text: string): TimingResult {
  const missingAnchorIds = anchorIds.filter((id) => !parseDateAnswer(answers[id]));
  if (missingAnchorIds.length > 0) {
    const askable = answerableAnchorIds(profile, missingAnchorIds);
    if (askable.length !== missingAnchorIds.length) {
      return {
        status: "needs_review",
        reason: reason(profile.jurisdiction.code, "waiting_anchor_not_publicly_askable", \`The exact source-specific waiting period requires \${missingAnchorIds.join(", ")}, and this profile does not publish every required question.\`, rule.sourceRef ?? pathway.sourceRef)
      };
    }
    return {
      status: "missing_anchor",
      reason: reason(profile.jurisdiction.code, "waiting_anchor_missing", \`\${askable.join(", ")} must be supplied before the latest exact source-specific anchor can be evaluated.\`, rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: askable
    };
  }
  const dates = anchorIds
    .map((id) => ({ id, date: parseDateAnswer(answers[id]) }))
    .filter((candidate): candidate is { id: string; date: Date } => Boolean(candidate.date));
  const latest = dates.sort((left, right) => right.date.getTime() - left.date.getTime())[0];
  return timingFromExactAnchor(profile, answers, rule, pathway, latest.id, duration, text);
}

function timingFromExactAnchor(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, rule: CompiledRule, pathway: CompiledPathway, anchorId: string, duration: CompiledDuration, text: string): TimingResult {
  const jurisdiction = profile.jurisdiction.code;
  const anchor = parseDateAnswer(answers[anchorId]);
  if (!anchor) {
    const askable = answerableAnchorIds(profile, [anchorId]);
    if (askable.length === 0) {
      return {
        status: "needs_review",
        reason: reason(jurisdiction, "waiting_anchor_not_publicly_askable", \`The exact source-specific waiting period runs from \${anchorId}, and this profile publishes no public question for it.\`, rule.sourceRef ?? pathway.sourceRef)
      };
    }
    return {
      status: "missing_anchor",
      reason: reason(jurisdiction, "waiting_anchor_missing", \`The \${anchorId} value is needed before the exact source-specific waiting period can be evaluated.\`, rule.sourceRef ?? pathway.sourceRef),
      missingQuestionIds: [anchorId]
    };
  }
  const earliest = addDuration(anchor, duration.value, duration.unit);
  if (!earliest) {
    return {
      status: "needs_review",
      reason: reason(jurisdiction, "waiting_rule_not_executed", "The exact source-specific waiting period needs review before a packet decision.", rule.sourceRef ?? pathway.sourceRef)
    };
  }
  if (earliest > evaluationToday()) {
    return {
      status: "not_yet",
      reason: reason(jurisdiction, "waiting_period_not_satisfied", \`\${text} The source-specific waiting period runs until \${earliest.toISOString().slice(0, 10)}.\`, rule.sourceRef ?? pathway.sourceRef)
    };
  }
  return { status: "satisfied" };
}

`;
  source = replaceExactlyOnce(
    source,
    helperAnchor,
    `${exactHelpers}${helperAnchor}`,
    "exact-anchor evaluator helpers"
  );
  return { original, modified: source };
}

function buildProjectionSource() {
  const original = fs.readFileSync(path.join(ROOT, PROJECTION_RELATIVE), "utf8");
  let source = replaceExactlyOnce(
    original,
    'MS: new Set(["disposition_date"]),',
    'MS: new Set(["disposition_date", "ms_last_conviction_date_any_court", "ms_successful_sentence_completion_date", "ms_mip_dismissal_or_discharge_date", "ms_mip_sentence_completion_date", "ms_mip_fine_imposed", "ms_mip_fine_payment_date"]),',
    "Mississippi public prepayment fact allowlist"
  );
  const questionAnchor = "];\n\nfunction withWilmaFactQuestions";
  const mississippiQuestions = `];

const MISSISSIPPI_CORRECTION_FACT_QUESTIONS: PublicQuestion[] = [
  {
    id: "ms_last_conviction_date_any_court",
    stage: "timing_and_completion",
    prompt: "What is the person's last conviction date in any court?",
    helperText: "Use the complete conviction history, not only the target court's docket.",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ms_successful_sentence_completion_date",
    stage: "timing_and_completion",
    prompt: "What date were every term and condition of the DUI sentence successfully completed?",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ms_mip_dismissal_or_discharge_date",
    stage: "timing_and_completion",
    prompt: "What is the dismissal and discharge date for the underage-alcohol case?",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ms_mip_sentence_completion_date",
    stage: "timing_and_completion",
    prompt: "What date was the underage-alcohol sentence completed?",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ms_mip_fine_imposed",
    stage: "timing_and_completion",
    prompt: "Was a fine imposed for the underage-alcohol case?",
    helperText: "If yes, the exact payment date is required because the later applicable date controls.",
    type: "yes_no_unsure",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  },
  {
    id: "ms_mip_fine_payment_date",
    stage: "timing_and_completion",
    prompt: "What date was the underage-alcohol fine paid?",
    type: "date_or_unknown",
    required: false,
    contextOnly: false,
    doesNotSelectPathway: true,
    options: null
  }
];

function withWilmaFactQuestions`;
  source = replaceExactlyOnce(
    source,
    questionAnchor,
    mississippiQuestions,
    "Mississippi public exact-date questions"
  );
  source = replaceExactlyOnce(
    source,
    "  const additions = WILMA_FACT_QUESTIONS\n    .filter((question) => !existingIds.has(question.id))",
    "  const availableWilmaFacts = profile.jurisdiction.code === \"MS\"\n    ? [...WILMA_FACT_QUESTIONS, ...MISSISSIPPI_CORRECTION_FACT_QUESTIONS]\n    : WILMA_FACT_QUESTIONS;\n  const additions = availableWilmaFacts\n    .filter((question) => !existingIds.has(question.id))",
    "state-specific Wilma fact routing"
  );
  return { original, modified: source };
}

function buildMetadataSource() {
  const original = fs.readFileSync(path.join(ROOT, METADATA_RELATIVE), "utf8");
  const parsed = JSON.parse(original);
  for (const [routeKey, routePatch] of Object.entries(closure.sharedHandoff.routeProductMetadata)) {
    if (!parsed.routes[routeKey]) throw new Error(`Missing route-product metadata row ${routeKey}`);
    parsed.routes[routeKey] = { ...parsed.routes[routeKey], ...routePatch };
  }
  return { original, modified: `${JSON.stringify(parsed, null, 2)}\n` };
}

function unifiedDiff(relativePath, original, modified) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "corrections-a-patch-"));
  const before = path.join(directory, "before");
  const after = path.join(directory, "after");
  fs.writeFileSync(before, original);
  fs.writeFileSync(after, modified);
  try {
    execFileSync("diff", ["-U0", "--label", `a/${relativePath}`, "--label", `b/${relativePath}`, before, after], { encoding: "utf8" });
    return "";
  } catch (error) {
    if (error.status !== 1) throw error;
    return error.stdout;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

const surfaces = [
  [EVALUATOR_RELATIVE, buildEvaluatorSource()],
  [PROJECTION_RELATIVE, buildProjectionSource()],
  [METADATA_RELATIVE, buildMetadataSource()]
];
const output = surfaces
  .map(([relativePath, pair]) => unifiedDiff(relativePath, pair.original, pair.modified))
  .join("")
  .replace(/^\+[\t ]+$/gm, "+");
if (!output.trim()) throw new Error("Shared integration patch is empty");

if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(path.relative(ROOT, OUTPUT_PATH));
} else {
  process.stdout.write(output);
}
