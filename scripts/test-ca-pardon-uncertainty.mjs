// A21: explicit uncertainty is a review fact, not an unanswered question.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { register } from "node:module";
import ts from "typescript";
register("./lib/ts-esm-loader.mjs", import.meta.url);
// Expose the existing server action derivation without substituting its gates.
const authorityFile = new URL("../src/lib/expungement-ai/briefcase-presentation-authority.ts", import.meta.url);
const authoritySource = ts.transpileModule(fs.readFileSync(authorityFile, "utf8") + "\nexport { DEFAULT_PRESENTATION_DEPENDENCIES };", { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
// Expose the normal locale provider for server-rendered result-card checks.
const localeFile = new URL("../src/components/expungement-ai/LocalizationProvider.tsx", import.meta.url);
const localeSource = ts.transpileModule(fs.readFileSync(localeFile, "utf8") + "\nexport { LocalizationContext };", { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return Object.hasOwn(d,u)?{format:"module",source:d[u],shortCircuit:true}:n(u,c);}')}`, { data: { [authorityFile.href]: authoritySource, [localeFile.href]: localeSource } });
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { resolveRuntimeText } = await import("../src/lib/expungement-ai/localization.ts");
const { selectScreeningQuestionIds } = await import("../src/lib/rcap-engine/screening-question-selection.ts");
const { sanitizeResumedAnswersForQuestionIds } = await import("../src/components/expungement-ai/screening/screens.ts");
const { DEFAULT_PRESENTATION_DEPENDENCIES, UNAVAILABLE_COMMERCIAL_ACTIONS } = await import(authorityFile.href);
const profile = getProfileByJurisdiction("CA"), pub = projectPublicProfile(profile);
function completePublicAnswers(pub) {
  const answers = {};
  for (const question of pub.questions) {
    const id = question.id;
    if (id === "ownership_scope") { answers[id] = "Yes"; continue; }
    if (id === "jurisdiction_scope") { answers[id] = "State or local"; continue; }
    if (id === "case_outcome") { answers[id] = "Dismissed, no-billed, nolle prosequi, or not prosecuted"; continue; }
    if (id === "offense_level") { answers[id] = "Misdemeanor"; continue; }
    if (id === "possible_pathway_context") {
      answers[id] = (question.options || []).find((opt) => !/none of these|i am not sure/i.test(opt)) || "";
      continue;
    }
    if (id === "state_exclusion_categories") { answers[id] = ["None of these"]; continue; }
    if (id === "sentence_completion_date") { answers[id] = "Yes"; continue; }
    if (id === "disposition_date" || id === "arrest_date") { answers[id] = "2015-01-01"; continue; }
    if (question.type === "multi_select") { answers[id] = [question.options.find(opt => !/unknown|not sure/i.test(opt))]; continue; }
    if (question.type === "yes_no_unsure") { answers[id] = "No"; continue; }
    if (Array.isArray(question.options) && question.options.length) {
      answers[id] = question.options.find((opt) => !/i am not sure|unknown|prefer not|none of these/i.test(opt)) || question.options[0];
      continue;
    }
    answers[id] = id.includes("date") ? "2015-01-01" : "N/A";
  }
  return answers;
}


const base = completePublicAnswers(pub);
const request = answers => ({ jurisdiction: "CA", profileVersion: profile.profileVersion, matterId: "synthetic-a21", answers });
const evaluate = answers => evaluateScreening(request(answers));
const english = 'Confirm whether you received a pardon or similar official relief for this case. Keep "I am not sure" if you do not know, and update your saved answer when you can confirm it. Checkout and packet generation remain unavailable until this fact is resolved.';
const spanish = 'Confirme si recibió un indulto u otra medida oficial similar para este caso. Mantenga "No estoy seguro/a" si no lo sabe y actualice su respuesta guardada cuando pueda confirmarlo. El pago y la generación del paquete no estarán disponibles hasta que se aclare este hecho.';

test("A21 counterexample: explicit uncertain pardon precedes missing Prop64 conduct facts", () => {
  const result = evaluate({ ...base, pardon_status: "I am not sure" });
  assert.equal(result.resultCode, "needs_review");
  assert.deepEqual(result.reasons.map(r => r.code), ["ca.source_fact_unknown"]);
  assert.deepEqual(result.missingQuestionIds, []);
  assert.equal(result.paymentAllowed, false);
  assert.equal(result.packetPlan, undefined);
});

test("A21 unanswered required pardon stays needs_more_info", () => {
  for (const value of [undefined, ""]) {
    const result = evaluate({ ...base, pardon_status: value });
    assert.equal(result.resultCode, "needs_more_info");
    assert.deepEqual(result.missingQuestionIds, ["pardon_status"]);
    assert.equal(result.paymentAllowed, false);
    assert.equal(result.packetPlan, undefined);
  }
});

test("A21 known answers preserve the original missing conduct result", () => {
  for (const value of ["Yes", "No"]) {
    const result = evaluate({ ...base, pardon_status: value });
    assert.equal(result.resultCode, "needs_more_info");
    assert.deepEqual(result.reasons.map(r => r.code), ["ca.ca_prop64_facts_missing"]);
    assert.deepEqual(result.missingQuestionIds, ["ca_prop64_age_at_offense", "ca_prop64_flower_grams"]);
  }
});

test("A21 clear EN/ES reason and next step identify the uncertain fact", () => {
  const result = evaluate({ ...base, pardon_status: "I am not sure" });
  assert.equal(result.reasons[0].text, english);
  assert.deepEqual(result.nextSteps, [english]);
  assert.equal(resolveRuntimeText("en", english), english);
  assert.equal(resolveRuntimeText("es", english), spanish);
  assert.doesNotMatch(result.nextSteps.join(" "), /attorney review|lawyer will|abogado revisará/i);
});

test("A21 real server action derivation refuses unpaid and paid unresolved matters", async () => {
  const answers = { ...base, pardon_status: "I am not sure" };
  const authority = evaluateAuthoritativeScreeningResult(request(answers));
  assert.equal(authority.evaluation.resultCode, "needs_review");
  assert.equal(authority.evaluation.packetPlan, undefined);
  // Sponsored source lookup is independently protected; unpaid and paid reach
  // the same result-code refusal without any database, payment or service call.
  for (const paymentState of ["unpaid", "paid"]) {
    const actions = await DEFAULT_PRESENTATION_DEPENDENCIES.readCommercialActions({ consumerAuthUserId: "synthetic-owner", item: { id: "synthetic-a21" }, legalAuthority: authority.evaluation, paymentState });
    assert.deepEqual(actions, UNAVAILABLE_COMMERCIAL_ACTIONS);
    assert.equal(actions.checkoutAllowed, false);
    assert.equal(actions.generationAllowed, false);
  }
});

test("A21 save/resume preserves raw answers and later explicit correction", () => {
  const answers = { ...base, pardon_status: "I am not sure" }, saved = JSON.stringify(answers);
  const selected = selectScreeningQuestionIds(profile, pub, answers);
  const resumed = sanitizeResumedAnswersForQuestionIds(pub, JSON.parse(saved), selected);
  assert.equal(resumed.pardon_status, "I am not sure");
  assert.equal(evaluate(answers).resultCode, "needs_review");
  assert.equal(evaluate(resumed).resultCode, "needs_review");
  assert.equal(JSON.stringify(answers), saved);
  const corrected = { ...resumed, pardon_status: "No" };
  assert.equal(evaluate(corrected).reasons[0].code, "ca.ca_prop64_facts_missing");
  assert.equal(answers.pardon_status, "I am not sure");
});

// Keep the existing hard-stop precedence and unrelated CA facts unchanged.
test("A21 cannot bypass an actual jurisdiction exclusion", () => {
  const result = evaluate({ ...base, pardon_status: "I am not sure", jurisdiction_scope: "Federal" });
  assert.equal(result.resultCode, "hard_stop");
  assert.equal(result.paymentAllowed, false);
  assert.equal(result.packetPlan, undefined);
});

test("A21 uncertainty survives the actual stateless evaluate handler", async () => {
  const { POST } = await import("../src/app/api/expungement-ai/evaluate/route.ts");
  const response = await POST(new Request("http://localhost/api/expungement-ai/evaluate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request({ ...base, pardon_status: "I am not sure" }))
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.resultCode, "needs_review");
  assert.equal(result.reasons[0].code, "ca.source_fact_unknown");
  assert.equal(result.paymentAllowed, false);
  assert.equal(result.packetPlan, undefined);
});


test("A21 actual result card renders the pardon guidance in English and Spanish", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ScreeningResult } = await import("../src/components/expungement-ai/screening/ScreeningResult.tsx");
  const { LocalizationContext } = await import("../src/components/expungement-ai/LocalizationProvider.tsx");
  const { t } = await import("../src/lib/expungement-ai/localization.ts");
  const evaluation = evaluate({ ...base, pardon_status: "I am not sure" });
  for (const [locale, expected] of [["en", english], ["es", spanish]]) {
    const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
    const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(ScreeningResult, {
      evaluation, stateName: "California", questionPromptById: Object.fromEntries(pub.questions.map(q => [q.id, q.prompt])),
      hasScreeningSession: false, onEditAnswers() {}, onPacketAction() {}
    })));
    const literal = renderToStaticMarkup(React.createElement("span", null, expected)).slice(6, -7);
    assert.ok(markup.includes(literal), locale + " exact pardon guidance is visible");
  }
});
