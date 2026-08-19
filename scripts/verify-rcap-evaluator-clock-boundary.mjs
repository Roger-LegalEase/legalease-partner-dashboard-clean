#!/usr/bin/env node
// The evaluator's idea of "today" is a test instrument outside production and
// the authoritative clock inside it.
//
//   node scripts/verify-rcap-evaluator-clock-boundary.mjs
//   node scripts/verify-rcap-evaluator-clock-boundary.mjs --mutations
//
// RCAP_EVALUATOR_TODAY pins the evaluator's current date so the 284-pathway
// witness replay is deterministic. That pin used to be honoured unconditionally,
// including in production.
//
// Nothing set it in production, so nothing had gone wrong. The reason it matters
// anyway is the shape of the failure: every waiting period — every "you may file
// on or after" — would be computed against a frozen date, and the result would
// look completely ordinary. A wrong date does not raise an error; it produces a
// confident answer. A participant would be told to keep waiting when they may
// already file, or told they may file when they may not, and the only evidence
// would be an environment variable nobody reads.
//
// So the boundary is asserted here rather than left to convention: the pin works
// where the tests need it, and refuses where a real person's eligibility is
// decided.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const EVALUATOR = "src/lib/rcap-engine/evaluator.ts";
const PROBE = "scripts/verify-rcap-md-pardon-pathway.mjs";

const abs = (p) => path.join(rootDir, p);
const read = (p) => fs.readFileSync(abs(p), "utf8");

/**
 * Run a probe that actually evaluates, under a given environment.
 *
 * The probe is a real pathway verifier, so this exercises the clock through
 * evaluation rather than by reading the source and hoping.
 */
function probe(env) {
  try {
    const stdout = execFileSync("node", [PROBE], {
      cwd: rootDir,
      encoding: "utf8",
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { ok: true, output: stdout };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

const REFUSAL = /RCAP_EVALUATOR_TODAY is set in a production environment/;

/**
 * Drive one real evaluation in production mode with the pin genuinely ABSENT.
 *
 * Inline rather than through a fixture script because every fixture script pins
 * the date itself, so none of them can represent the unpinned case.
 */
function evaluateWithoutPin() {
  const source = [
    'import { register } from "node:module";',
    'register("./scripts/lib/ts-esm-loader.mjs", import.meta.url);',
    'const { getProfileByJurisdiction } = await import("./src/lib/rcap-engine/profile-registry.ts");',
    'const { evaluateScreening } = await import("./src/lib/rcap-engine/evaluator.ts");',
    'const profile = getProfileByJurisdiction("MD");',
    'const result = evaluateScreening({ jurisdiction: "MD", profileVersion: profile.profileVersion, answers: {} });',
    'if (!result || typeof result.resultCode !== "string") throw new Error("evaluation produced no result code");',
    'console.log("unpinned production evaluation produced", result.resultCode);'
  ].join("\n");
  const file = path.join(rootDir, ".rcap-clock-boundary-probe.mjs");
  const env = { ...process.env, NODE_ENV: "production" };
  delete env.RCAP_EVALUATOR_TODAY;
  try {
    fs.writeFileSync(file, `${source}\n`);
    const stdout = execFileSync("node", [file], { cwd: rootDir, encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output: stdout };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  } finally {
    fs.rmSync(file, { force: true });
  }
}

function failures() {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  // 1. The pin works where the deterministic replay needs it.
  const pinned = probe({ RCAP_EVALUATOR_TODAY: "2026-07-01", NODE_ENV: "" });
  fail(pinned.ok, "the evaluator refuses the deterministic date pin outside production; the 284-pathway replay depends on it");

  // 2. The pin is refused where eligibility is decided for a real person.
  const production = probe({ RCAP_EVALUATOR_TODAY: "2026-07-01", NODE_ENV: "production" });
  fail(!production.ok, "a pinned evaluation date was ACCEPTED in production; every waiting period would be computed against a frozen day");
  fail(
    REFUSAL.test(production.output),
    "production refused the pinned date, but not with the named reason; a refusal nobody can attribute gets diagnosed as something else"
  );

  // 3. Production WITHOUT the pin evaluates normally.
  //
  //    This needs its own probe. The fixture probe above self-pins with `||`, so
  //    an empty RCAP_EVALUATOR_TODAY is replaced by its own default and the
  //    variable is never actually absent — asking it about the unpinned case
  //    gets an answer about the pinned one. The variable is deleted from the
  //    environment here and a real evaluation is driven inline instead.
  const unpinned = evaluateWithoutPin();
  fail(
    !REFUSAL.test(unpinned.output),
    "the production refusal fired with no pin set; production would be unable to evaluate at all"
  );
  fail(
    unpinned.ok,
    `production evaluation with no pin did not complete: ${unpinned.output.slice(0, 300)}`
  );

  // 4. The fallback is the real clock, not a literal.
  const source = read(EVALUATOR);
  fail(
    /Date\.now\(\)/.test(source),
    `${EVALUATOR} no longer falls back to the authoritative clock`
  );
  fail(
    !/const\s+\w*[Tt]oday\w*\s*=\s*new Date\(\s*["'`]\d{4}-\d{2}-\d{2}/.test(source),
    `${EVALUATOR} hardcodes a calendar date as today; the deterministic pin belongs in the environment, not in the evaluator`
  );

  return out;
}

if (MUTATIONS) {
  const original = read(EVALUATOR);
  const restore = () => fs.writeFileSync(abs(EVALUATOR), original);
  const base = failures().length;

  const mutations = [
    [
      "the production refusal is removed and the pin is honoured everywhere",
      (s) => s.replace(/if \(pinned && process\.env\.NODE_ENV === "production"\) \{[\s\S]*?\n  \}\n/, "")
    ],
    [
      "today is hardcoded to the test date instead of read from the clock",
      (s) => s.replace(/return new Date\(pinned \? .*? : Date\.now\(\)\);/, 'return new Date("2026-07-01T00:00:00.000Z");')
    ],
    [
      "the refusal fires whenever the pin is set, breaking the deterministic replay",
      (s) => s.replace('if (pinned && process.env.NODE_ENV === "production") {', "if (pinned) {")
    ]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = mutate(original);
    if (mutated === original) {
      restore();
      throw new Error(`mutation ${JSON.stringify(label)} changed nothing; a mutation that cannot apply proves nothing`);
    }
    fs.writeFileSync(abs(EVALUATOR), mutated);
    let caught;
    try {
      caught = failures().length > base;
    } finally {
      restore();
    }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }

  if (read(EVALUATOR) !== original) throw new Error("the evaluator was left mutated");
  if (undetected > 0) {
    console.error(`\nverify-rcap-evaluator-clock-boundary FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nThe evaluator's clock boundary holds in both directions (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures();
if (problems.length > 0) {
  console.error(`verify-rcap-evaluator-clock-boundary FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
console.log("evaluator clock boundary: the date pin is honoured for deterministic replay and refused in production, which falls back to the authoritative clock.");
