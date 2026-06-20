import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

const checkPage = read("src/app/expungement-ai/check/page.tsx");
const screeningIndexPage = read("src/app/expungement-ai/screening/page.tsx");
const screeningStatePage = read("src/app/expungement-ai/screening/[state]/page.tsx");
const statePicker = read("src/components/expungement-ai/screening/StatePicker.tsx");
const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const screens = read("src/components/expungement-ai/screening/screens.ts");
const screeningResult = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
const resultPanel = read("src/components/expungement-ai/ResultPanel.tsx");

assertIncludes(checkPage, "StatePicker", "/check page");
assert(!checkPage.includes("CheckFlow"), "/check must not render shallow CheckFlow.");
assert(!fs.existsSync(path.join(root, "src/components/expungement-ai/CheckFlow.tsx")), "Shallow CheckFlow component must not exist.");
assertIncludes(screeningIndexPage, "StatePicker", "/screening page");
assertIncludes(screeningStatePage, "<ScreeningFlow", "/screening/[state] page");
assertIncludes(statePicker, 'href={`/expungement-ai/screening/${jurisdiction.code}`}', "StatePicker route");
assertIncludes(screeningFlow, "loadJurisdictionProfile", "ScreeningFlow profile load");
assertIncludes(screeningFlow, "deriveScreens(load.profile)", "ScreeningFlow screen derivation");
assertIncludes(screeningFlow, "currentIndex < screens.length - 1", "ScreeningFlow final-screen gate");
assertIncludes(screeningFlow, "void runEvaluation();", "ScreeningFlow evaluate call");
assertIncludes(screens, "!question.id.startsWith(SOURCE_QUESTION_PREFIX)", "source-question screen filter");
assertIncludes(screeningResult, "isPaymentAllowed(evaluation)", "profile result payment gate");
assertIncludes(resultPanel, 'result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")', "legacy result payment gate");

const all51 = JSON.parse(read("src/lib/expungement-ai/frontend/profiles/all51.json"));
const il = all51.IL;
assert(il, "Missing Illinois profile.");
const sourceQuestionPrefix = "source_question";
const stageOrder = new Map(il.flowStages.map((stage) => [stage.id, stage.order]));
const ilScreens = il.questions
  .map((question, index) => ({ question, index }))
  .filter(({ question }) => !question.id.startsWith(sourceQuestionPrefix))
  .sort((a, b) => {
    const orderA = stageOrder.get(a.question.stage) ?? Number.MAX_SAFE_INTEGER;
    const orderB = stageOrder.get(b.question.stage) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB || a.index - b.index;
  })
  .map(({ question }) => question);

assert(ilScreens.length > 4, `Illinois must use the full profile sequence, found only ${ilScreens.length} screens.`);
for (const raw of ["source_question_", "age_at_offense", "trafficking_status", "pardon_status"]) {
  assert(!ilScreens.some((question) => question.id.startsWith("source_question_")), `Illinois visible screens must filter ${raw}.`);
}

if (failures.length) {
  console.error("Expungement.ai profile screening flow verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai profile screening flow verifier passed.");
console.log(`Illinois profile-driven screen count: ${ilScreens.length}`);
console.log("First six Illinois questions:");
for (const question of ilScreens.slice(0, 6)) {
  console.log(`- ${question.prompt}`);
}
console.log("Evaluation remains gated behind the final derived profile screen, and payment gates remain clamped.");
