import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const profileRoot = "src/lib/rcap-engine/compiled/profiles";
const aggregateFiles = [
  "src/lib/rcap-engine/compiled/all51.json",
  "src/lib/expungement-ai/frontend/profiles/all51.json"
];
const failures = [];

const expectedPromptById = {
  jurisdiction_scope: (state) => `Did this case happen in ${state} (not a federal case)?`,
  case_outcome: () => "How did the case end?",
  possible_pathway_context: () => "Do any of these sound like your situation?",
  offense_level: () => "What kind of charge was it?",
  charge: () => "What does the record say you were charged with?",
  record_documents: () => "Do you have your court paperwork handy?",
  county_or_filing_location: (state) => `Where in ${state} did the case happen?`,
  case_identifier: () => "What's the case number?",
  sentence_completion_date: () => "Have you finished everything the court ordered?",
  disposition_date: () => "When did the case end or finish?",
  financial_obligations: () => "Have you paid off everything the court charged?",
  age_at_offense: () => "How old were you when this happened?",
  pardon_status: () => "Have you gotten a pardon or similar official relief for this?",
  pending_cases: () => "Do you have any open cases right now?",
  state_exclusion_categories: () => "Did the case involve any of these?",
  criminal_history: () => "Do you have your background check or court records handy?",
  trafficking_status: () => "Did this happen because you were a victim of human trafficking?",
  prior_relief: () => "Have you had a record cleared before, anywhere?",
  county: () => "Which county (or local area) handled the case?",
  identity_error: () => "Was this arrest a mistake — wrong person, identity theft, or an error?",
  arrest_date: () => "When did the arrest happen?",
  case_number: () => "What's the case number?"
};

const unchangedPromptIds = new Set(["ownership_scope", "court"]);
const caseOutcomeDisplay = {
  "Arrest or citation with no charge filed": ["Arrested, but never charged", "arrest or citation with no charge filed"],
  "Dismissed, no-billed, nolle prosequi, or not prosecuted": ["The case was dropped or thrown out", "dismissed, no-billed, nolle prosequi, or not prosecuted"],
  "Acquitted or found not guilty": ["Found not guilty", "acquitted or found not guilty"],
  "Diversion, deferred disposition, supervision, or similar program": ["Completed a program instead of a conviction", "diversion, deferred disposition, supervision, or similar"],
  "Misdemeanor conviction": ["Convicted of a misdemeanor", "a less serious conviction"],
  "Felony conviction": ["Convicted of a felony", "a more serious conviction"],
  "Other conviction or adjudication": ["Another kind of conviction", "other conviction or adjudication"],
  "Juvenile adjudication or offense committed as a minor": ["It happened when I was a minor", "juvenile adjudication or offense as a minor"],
  "Pardoned conviction": ["Pardoned", "pardoned conviction"],
  "I am not sure": ["I'm not sure", "keep — and this is fine; Wilma and the tool can help"]
};

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function readMainJson(file) {
  const result = spawnSync("git", ["show", `main:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`Unable to read ${file} from main:\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

function stable(value) {
  return JSON.stringify(value);
}

function questionKey(code, question) {
  return `${code}:${question.id}`;
}

function compareProfile(code, before, after) {
  assert(before.questions.length === after.questions.length, `${code} question count changed.`);
  assert(stable(before.questions.map((question) => question.id)) === stable(after.questions.map((question) => question.id)), `${code} question order changed.`);
  assert(stable(before.flowStages) === stable(after.flowStages), `${code} flow stage/order metadata changed.`);

  const afterById = new Map(after.questions.map((question) => [question.id, question]));
  const state = after.jurisdiction.name;
  for (const beforeQuestion of before.questions) {
    const afterQuestion = afterById.get(beforeQuestion.id);
    assert(afterQuestion, `${questionKey(code, beforeQuestion)} missing after rewrite.`);
    if (!afterQuestion) continue;

    for (const key of ["id", "stage", "type", "required", "contextOnly", "doesNotSelectPathway"]) {
      assert(stable(beforeQuestion[key]) === stable(afterQuestion[key]), `${questionKey(code, beforeQuestion)} changed ${key}.`);
    }
    assert(stable(beforeQuestion.options ?? null) === stable(afterQuestion.options ?? null), `${questionKey(code, beforeQuestion)} changed option values/order.`);

    if (expectedPromptById[afterQuestion.id]) {
      const expected = expectedPromptById[afterQuestion.id](state);
      assert(afterQuestion.prompt === expected, `${questionKey(code, afterQuestion)} prompt was "${afterQuestion.prompt}", expected "${expected}".`);
    } else if (unchangedPromptIds.has(afterQuestion.id)) {
      assert(afterQuestion.prompt === beforeQuestion.prompt, `${questionKey(code, afterQuestion)} should have stayed unchanged.`);
    } else if (!String(afterQuestion.id).startsWith("source_question")) {
      assert(false, `${questionKey(code, afterQuestion)} is not covered by the plain-language spec table.`);
    }

    if (afterQuestion.id === "case_outcome") {
      for (const value of afterQuestion.options ?? []) {
        const display = afterQuestion.optionDisplay?.[value];
        if (caseOutcomeDisplay[value]) {
          const [label, helperText] = caseOutcomeDisplay[value];
          assert(display?.label === label, `${code} case_outcome value "${value}" has wrong display label.`);
          assert(display?.helperText === helperText, `${code} case_outcome value "${value}" has wrong helper text.`);
        } else {
          assert(!display, `${code} case_outcome value "${value}" was not in spec and should stay undisplayed.`);
        }
      }
    }
  }
}

const profileFiles = fs.readdirSync(path.join(root, profileRoot)).filter((file) => file.endsWith(".json")).sort();
for (const file of profileFiles) {
  const current = readJson(`${profileRoot}/${file}`);
  const baseline = readMainJson(`${profileRoot}/${file}`);
  compareProfile(current.jurisdiction.code, baseline, current);
}

for (const file of aggregateFiles) {
  const current = readJson(file);
  const baseline = readMainJson(file);
  assert(stable(Object.keys(current).sort()) === stable(Object.keys(baseline).sort()), `${file} jurisdiction set changed.`);
  for (const code of Object.keys(current).sort()) compareProfile(`${file}:${code}`, baseline[code], current[code]);
}

if (failures.length) {
  console.error("Expungement plain-language value parity failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement plain-language value parity passed.");
console.log("Option value arrays, question order, stages, required flags, and contextOnly flags match main.");
