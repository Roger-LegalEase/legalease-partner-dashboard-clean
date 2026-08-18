#!/usr/bin/env node
// Route reachability, per route, from the canonical public evaluator.
//
//   node scripts/generate-rcap-route-reachability-report.mjs [STATE ...]
//
// Answers one question per compiled pathway: can any valid set of public
// answers reach a sellable packet on this route, and if not, is that a recorded
// decision or an accident? "This state cannot be sold" is a claim about every
// route in it, so it is made here from every route in it or not made at all.
//
// Two passes per route. A DIRECTED pass pins the participant to that route and
// answers exactly what the evaluator asks for, recording the question sequence,
// the answers supplied and the facts requested — that is the transcript. A
// SWEEP pass then drives thousands of randomized-but-valid answer sets through
// the same evaluator, so "no answer set reaches packet_ready" is a search
// result rather than one unlucky transcript.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");

const STATES = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const TARGET_STATES = STATES.length ? STATES : ["PA", "IL", "MS"];
const SWEEP_TRIALS = Number(process.env.RCAP_REACHABILITY_TRIALS ?? 1200);
const OUT = path.join(rootDir, "docs/RCAP_ROUTE_REACHABILITY.md");

// Deterministic, so the report is reproducible and a diff means something.
let seed = 0x2f6e2b1;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
const pick = (list) => list[Math.floor(rnd() * list.length)];

const DATES = ["2005-01-10", "2012-06-01", "2018-03-15", "2024-11-02", "unknown"];
const NUMBERS = ["0", "1", "2", "30", "45", "72"];
const TEXTS = ["unknown", "Shoplifting", "Circuit Court", "the county of filing"];

// The answers a genuinely clearable record gives. Pinned in both passes so a
// route is never reported unreachable because a random disqualifier — a named
// excluded offense, an open case — was rolled against it.
const CLEAR_RECORD = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  state_exclusion_categories: ["None of these"],
  pending_cases: "No",
  new_convictions_during_waiting_period: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  court_requirements_completed: "yes",
  special_preconditions_confirmed: "Yes",
  trafficking_status: "No",
  pardon_status: "No",
  record_documents: "Yes"
};

function questionIndex(profile) {
  const index = new Map();
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node.id === "string" && typeof node.type === "string" && (node.prompt || node.label)) {
      if (!index.has(node.id)) index.set(node.id, node);
    }
    Object.values(node).forEach(walk);
  })(projectPublicProfile(profile));
  return index;
}

function preferredAnswer(question, id) {
  if (CLEAR_RECORD[id] !== undefined) return CLEAR_RECORD[id];
  if (!question) return "No";
  if (question.options?.length) {
    if (question.type === "multi_select") {
      return [question.options.find((o) => /^none/i.test(o)) ?? question.options[0]];
    }
    return question.options.find((o) => /^(no\b|none|yes)/i.test(o)) ?? question.options[0];
  }
  if (question.type === "date_or_unknown") return "2012-06-01";
  if (question.type === "number_or_range") return "30";
  if (question.type?.startsWith("yes_no")) return "Yes";
  return "unknown";
}

function randomAnswer(question) {
  if (!question) return "No";
  if (question.options?.length) {
    if (question.type === "multi_select") return [pick(question.options)];
    return pick(question.options);
  }
  if (question.type === "date_or_unknown") return pick(DATES);
  if (question.type === "number_or_range") return pick(NUMBERS);
  if (question.type?.startsWith("yes_no")) return pick(["Yes", "No", "I am not sure"]);
  return pick(TEXTS);
}

const isSellable = (evaluation) =>
  (evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution")
  && evaluation.paymentAllowed === true
  && typeof evaluation.pathwayId === "string";

/** Runs one participant to a terminal evaluation, recording the whole exchange. */
function converge(state, profile, questions, seedAnswers, answerFor) {
  const answers = { ...seedAnswers };
  const transcript = [];
  let evaluation = null;
  for (let round = 0; round < 24; round += 1) {
    try {
      evaluation = evaluateAuthoritativeScreeningResult({
        jurisdiction: state, profileVersion: profile.profileVersion, matterId: "route-reachability", answers
      }).evaluation;
    } catch (error) {
      if (!error?.invalidQuestionIds?.length) return { answers, transcript, evaluation: null, error: String(error?.message ?? error) };
      // Packet-only fields are not evaluator questions; drop exactly those.
      for (const id of error.invalidQuestionIds) delete answers[id];
      transcript.push({ round, droppedAsNotEvaluatorQuestions: [...error.invalidQuestionIds] });
      continue;
    }
    const missing = evaluation.missingQuestionIds ?? [];
    if (!missing.length) return { answers, transcript, evaluation, error: null };
    const supplied = {};
    for (const id of missing) {
      answers[id] = answerFor(questions.get(id), id);
      supplied[id] = answers[id];
    }
    transcript.push({ round, requested: [...missing], supplied });
  }
  return { answers, transcript, evaluation, error: "did not settle in 24 rounds" };
}

const sections = [];
for (const state of TARGET_STATES) {
  const profile = getProfileByJurisdiction(state);
  if (!profile) { sections.push(`## ${state}\n\nNo compiled profile.\n`); continue; }
  const questions = questionIndex(profile);
  const pathwayOptions = questions.get("possible_pathway_context")?.options ?? [];

  // ---- sweep: which pathways can reach a sellable packet at all -------------
  const sweepSellable = new Map();
  const sweepTerminals = new Map();
  for (let trial = 0; trial < SWEEP_TRIALS; trial += 1) {
    const seedAnswers = {
      ...CLEAR_RECORD,
      ...(pathwayOptions.length ? { possible_pathway_context: pathwayOptions[trial % pathwayOptions.length] } : {})
    };
    const { evaluation, answers } = converge(state, profile, questions, seedAnswers, randomAnswer);
    if (!evaluation) continue;
    const key = `${evaluation.pathwayId ?? "(none)"} | ${evaluation.resultCode} | paymentAllowed=${evaluation.paymentAllowed} | ${(evaluation.reasons ?? []).map((r) => r.code).join(",")}`;
    sweepTerminals.set(key, (sweepTerminals.get(key) ?? 0) + 1);
    if (isSellable(evaluation) && !sweepSellable.has(evaluation.pathwayId)) sweepSellable.set(evaluation.pathwayId, answers);
  }

  const rows = [];
  for (const generated of profile.packetGenerator.pathways) {
    const pathway = profile.pathways.find((p) => p.id === generated.pathwayId) ?? {};
    const route = resolvePacketRoute({ state, pathway: generated.pathwayLabel, trackId: null });
    const option = pathwayOptions.find((o) => o === generated.pathwayLabel)
      ?? pathwayOptions.find((o) => o.includes(generated.pathwayLabel))
      ?? pathwayOptions.find((o) => generated.pathwayLabel.includes(o));
    const directed = converge(
      state, profile, questions,
      { ...CLEAR_RECORD, ...(option ? { possible_pathway_context: option } : {}) },
      preferredAnswer
    );
    const evaluation = directed.evaluation;
    const reasons = (evaluation?.reasons ?? []).map((r) => r.code);
    const hold = pathway.lawrenceRatification?.lawrence_review ?? null;
    const sweepAnswers = sweepSellable.get(generated.pathwayId) ?? null;

    rows.push({
      jurisdiction: state,
      profileVersion: profile.profileVersion,
      compiledPathwayId: generated.pathwayId,
      pathwayLabel: generated.pathwayLabel,
      routeId: `${route.jurisdiction}:${route.pathwayId}`,
      routeKind: route.routeKind,
      rendererKind: route.rendererKind,
      routeSellable: route.sellable,
      routeCreditConsumable: route.creditConsumable,
      routeCanRender: packetRouteCanRender(route),
      routeReason: route.reason,
      publicQuestionSequence: directed.transcript.flatMap((step) => step.requested ?? []),
      suppliedAnswers: directed.answers,
      requestedMissingFacts: evaluation?.missingQuestionIds ?? [],
      finalResultCode: evaluation?.resultCode ?? `(no evaluation: ${directed.error})`,
      finalPaymentAllowed: evaluation?.paymentAllowed ?? null,
      finalReasonCodes: reasons,
      waitingRuleIds: pathway.waitingRules ?? [],
      waitingRuleInputs: Object.fromEntries(
        ["disposition_date", "sentence_completion_actual_date", "resolved_timing_bucket", "waiting_rule_id",
         "court_requirements_completed", "sentence_completion_date", "financial_obligations", "pending_cases",
         "new_convictions_during_waiting_period", "special_preconditions_confirmed"]
          .filter((id) => directed.answers[id] !== undefined)
          .map((id) => [id, directed.answers[id]])
      ),
      waitingRuleNotExecuted: reasons.some((code) => code.endsWith("waiting_rule_not_executed"))
        ? "no waiting rule with a selectable duration applied to this packet-like pathway for these answers, so the evaluator returned needs_review rather than guessing a period"
        : null,
      anotherAnswerSetReachesPacketReady: sweepSellable.has(generated.pathwayId),
      sellableAnswerSet: sweepAnswers,
      recordedHold: hold,
      classification: sweepSellable.has(generated.pathwayId)
        ? "reachable and sellable"
        : hold === "hold_guidance_only"
          ? "intentionally guidance-only (recorded Lawrence hold: hold_guidance_only)"
          : hold === "gate_required"
            ? "intentionally gated (recorded Lawrence review: gate_required)"
            : reasons.some((code) => code.endsWith("guidance_only_no_user_filed_court_petition"))
              ? "intentionally guidance-only (no user-filed court petition on this route)"
              : "not reached by this search — no recorded hold explains it"
    });
  }

  const sellableCount = rows.filter((r) => r.anotherAnswerSetReachesPacketReady).length;
  const unexplained = rows.filter((r) => r.classification.startsWith("not reached"));
  sections.push([
    `## ${state} — profile ${profile.profileVersion}`,
    "",
    `${sellableCount} of ${rows.length} compiled pathways reach a sellable packet under some valid public answer set `
    + `(${SWEEP_TRIALS} randomized participants plus one directed participant per route).`,
    unexplained.length
      ? `**${unexplained.length} route(s) were not reached and carry no recorded hold that explains it: ${unexplained.map((r) => r.compiledPathwayId).join(", ")}.**`
      : "Every route that is not sellable carries a recorded decision that says why.",
    "",
    "### Terminal outcomes observed across the sweep",
    "",
    "| n | pathway | result | paymentAllowed | reasons |",
    "| --- | --- | --- | --- | --- |",
    ...[...sweepTerminals.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => {
      const [pathwayId, result, payment, reason] = key.split(" | ");
      return `| ${n} | \`${pathwayId}\` | ${result} | ${payment.replace("paymentAllowed=", "")} | ${reason || "—"} |`;
    }),
    "",
    "### Per route",
    "",
    ...rows.flatMap((row) => [
      `#### ${row.compiledPathwayId}`,
      "",
      `- jurisdiction: ${row.jurisdiction}`,
      `- profile version: ${row.profileVersion}`,
      `- compiled pathway id: \`${row.compiledPathwayId}\` (${row.pathwayLabel})`,
      `- route id: \`${row.routeId}\``,
      `- route kind: ${row.routeKind} — ${row.routeReason}`,
      `- renderer kind: ${row.rendererKind}`,
      `- route sellable: ${row.routeSellable}`,
      `- route credit-consumable: ${row.routeCreditConsumable}`,
      `- route can render: ${row.routeCanRender}`,
      `- public question sequence (directed run, in the order the evaluator asked): ${row.publicQuestionSequence.length ? row.publicQuestionSequence.map((id) => `\`${id}\``).join(" → ") : "none — the evaluator asked for nothing further"}`,
      `- every supplied answer: \`${JSON.stringify(row.suppliedAnswers)}\``,
      `- still-requested missing facts at the end: ${row.requestedMissingFacts.length ? row.requestedMissingFacts.map((id) => `\`${id}\``).join(", ") : "none"}`,
      `- final result code: ${row.finalResultCode}`,
      `- final paymentAllowed: ${row.finalPaymentAllowed}`,
      `- final reason codes: ${row.finalReasonCodes.join(", ") || "none"}`,
      // The compiled corpus carries waiting rules as source clauses rather than
      // ids, and some run to several hundred words. Enough of each to identify
      // it, with the count, so the field stays a field.
      `- waiting rules declared on this pathway (${row.waitingRuleIds.length}): ${row.waitingRuleIds.length ? row.waitingRuleIds.map((id) => `\`${String(id).replace(/\s+/g, " ").slice(0, 110)}${String(id).length > 110 ? "…" : ""}\``).join("; ") : "none"}`,
      `- waiting-rule inputs supplied: \`${JSON.stringify(row.waitingRuleInputs)}\``,
      `- why waiting_rule_not_executed: ${row.waitingRuleNotExecuted ?? "not emitted for this route"}`,
      `- another valid public answer set reaches packet_ready: ${row.anotherAnswerSetReachesPacketReady}${row.sellableAnswerSet ? ` — \`${JSON.stringify(row.sellableAnswerSet)}\`` : ""}`,
      `- recorded review state: ${row.recordedHold ?? "none recorded"}`,
      `- classification: **${row.classification}**`,
      ""
    ])
  ].join("\n"));
}

const report = [
  "# RCAP route reachability — Pennsylvania, Illinois and the Mississippi reference",
  "",
  "Generated by `scripts/generate-rcap-route-reachability-report.mjs`. Regenerate rather than edit.",
  "",
  `Evaluator date pinned to ${process.env.RCAP_EVALUATOR_TODAY}. Every result below comes from`,
  "`evaluateAuthoritativeScreeningResult` — the same server-owned evaluator the public",
  "route uses — not from a fixture or a summary.",
  "",
  "**How to read the two kinds of finding.** \"Reachable and sellable\" is an existence",
  "proof: one witnessing answer set is printed with it, and one witness settles the",
  "question for that route. \"Not reached by this search\" is not the converse — it is a",
  "search result over a bounded number of participants, and it must not be quoted as",
  "\"this route cannot be sold\". The only non-reach findings that carry that weight are",
  "the ones whose classification names a recorded decision (a Lawrence hold, a gate, or a",
  "route with no user-filed court petition), because those say the route is closed by",
  "intent rather than missed by the search.",
  "",
  ...sections
].join("\n");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${report}\n`);
console.log(`wrote ${path.relative(rootDir, OUT)} for ${TARGET_STATES.join(", ")}`);
