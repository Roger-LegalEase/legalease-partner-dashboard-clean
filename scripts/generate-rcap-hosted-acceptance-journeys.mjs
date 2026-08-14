import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

// Generates — and self-verifies — the golden-journey probe fixture the hosted
// acceptance matrix evaluates against the deployed application.
//
// Every probe in the emitted fixture has been RUN through the real evaluator in
// this process before it is written. A probe that does not evaluate, or that
// opens payment, is not written to the fixture and is reported as a generator
// failure instead. That is the whole point: the matrix asserts "evaluated, and
// did not open payment", and a fixture full of probes nobody ever executed
// would let that assertion pass vacuously against journeys the engine never
// actually reached.
//
// `--check` regenerates in memory and fails if the committed fixture differs,
// which is how every other generator in this repository is held.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { allCompleteGuidanceTracks, allExactDeferrals } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");

const CHECK = process.argv.includes("--check");
const OUT = path.join(process.cwd(), "data/rcap-all50/hosted-acceptance-journeys.json");

// Every compiled profile carries the same version string. Reading it from the
// profile rather than hardcoding it means a future recompile cannot leave this
// fixture quietly 409-ing against the deployed engine.
const PROFILE_VERSION = getAllJurisdictionProfiles()[0].profileVersion;

const WILMA_FACT_IDS = new Set([
  "waiting_rule_id",
  "sentence_completion_actual_date",
  "release_date",
  "conviction_date",
  "arrest_date",
  "disposition_date",
  "case_closed_date"
]);

/**
 * One synthesizer, driven by the question's own declared shape.
 *
 * The overrides above the type fallbacks exist because a few question ids carry
 * routing meaning that a generic "first non-evasive option" answer would get
 * wrong — `jurisdiction_scope` in particular, where picking "Federal" is a
 * product-scope exclusion rather than a neutral answer.
 */
function answerFor(question, overrides) {
  const id = question.id;
  if (Object.prototype.hasOwnProperty.call(overrides, id)) return overrides[id];
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return "State or local";
  if (id === "state_exclusion_categories") return ["None of these"];
  if (id === "new_convictions_during_waiting_period") return "No";
  if (id === "pending_cases") return "No";
  if (WILMA_FACT_IDS.has(id)) return "2010-01-01";
  if (question.type === "number_or_range") return 30;
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (question.type === "date_or_unknown") return "2010-01-01";
  if (Array.isArray(question.options) && question.options.length > 0) {
    return question.options.find((option) => !/federal|not sure|unknown|prefer not|none of these/i.test(String(option))) ?? question.options[0];
  }
  return "Synthetic acceptance answer";
}

function buildAnswers(profile, overrides = {}) {
  const pub = projectPublicProfile(profile);
  const answers = {};
  for (const question of pub.questions) answers[question.id] = answerFor(question, overrides);
  return answers;
}

const failures = [];

/**
 * Build a probe and prove it before returning it.
 *
 * `expectPaymentClosed` is the safety property every journey in this fixture
 * shares. A probe that opens payment is a generator failure, not a fixture
 * entry — if a route that must never be sellable becomes sellable, this
 * generator must refuse to write a fixture that would have asserted otherwise.
 */
function probe(label, jurisdiction, overrides = {}) {
  const profile = getProfileByJurisdiction(jurisdiction);
  if (!profile) {
    failures.push(`${label}: no compiled profile for ${jurisdiction}`);
    return null;
  }
  const answers = buildAnswers(profile, overrides);
  let evaluation;
  try {
    evaluation = evaluateScreening({
      jurisdiction: profile.jurisdiction.code,
      profileVersion: profile.profileVersion,
      matterId: `hosted-acceptance-${label}`,
      answers
    });
  } catch (error) {
    failures.push(`${label} (${jurisdiction}): evaluator threw ${error?.constructor?.name ?? "Error"} — ${error?.message ?? ""}`);
    return null;
  }
  if (evaluation.paymentAllowed === true) {
    failures.push(`${label} (${jurisdiction}): opened payment (resultCode=${evaluation.resultCode}), which this journey must never do`);
    return null;
  }
  return {
    label,
    jurisdiction: profile.jurisdiction.code,
    profileVersion: PROFILE_VERSION,
    answers,
    // Recorded so a reviewer can see what the engine actually said at
    // generation time, and so a drift in resultCode is visible in the diff.
    observedAtGeneration: {
      resultCode: evaluation.resultCode,
      paymentAllowed: evaluation.paymentAllowed ?? null,
      pathwayId: evaluation.pathwayId ?? null
    }
  };
}

// --- the journeys -------------------------------------------------------------

// Guidance tracks: registered, real, and sellable=false by construction. Taking
// the jurisdictions from the registry rather than naming states by hand means
// this follows the registry if it changes.
const guidanceJurisdictions = [...new Set(allCompleteGuidanceTracks().map((track) => track.jurisdiction))].sort().slice(0, 6);
const deferralJurisdictions = [...new Set(allExactDeferrals().map((deferral) => deferral.jurisdiction))].sort().slice(0, 6);

const cases = {
  guidance_route_is_not_sellable: {
    intent: "A registered complete-guidance track is served as guidance with payment closed. These tracks carry sellable=false and paymentAllowed=false in the registry; this proves the deployed engine agrees.",
    probes: guidanceJurisdictions.map((code) => probe(`guidance-${code}`, code)).filter(Boolean)
  },
  exact_deferral_route_is_not_sellable: {
    intent: "A registered exact deferral is a route the product deliberately does not complete. It must evaluate and must not open payment.",
    probes: deferralJurisdictions.map((code) => probe(`deferral-${code}`, code)).filter(Boolean)
  },
  product_scope_exclusion_is_typed: {
    intent: "A federal matter is outside the product's scope. The refusal must be a typed evaluation the participant can read, not a crash and not a silent state route.",
    probes: ["PA", "MS", "IL"].map((code) => probe(`federal-scope-${code}`, code, { jurisdiction_scope: "Federal" })).filter(Boolean)
  },
  sponsored_session_never_opens_payment: {
    intent: "Someone helping another person complete a check is not the person whose record it is. That session must never reach a checkout.",
    probes: ["PA", "MS", "IL"].map((code) =>
      probe(`assisted-${code}`, code, { ownership_scope: "I am helping someone complete their own check" })
    ).filter(Boolean)
  },
  problematic_pdf_routes_are_not_sellable: {
    intent: "Routes whose official PDF is on the problematic register must not be sellable while the register still holds them. The register is the source; these probes prove the engine does not sell them.",
    probes: []
  }
};

// The problematic-PDF journey is driven by the register itself rather than by a
// hand-picked list, so it cannot drift away from what the register says.
{
  const register = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/rcap-all50/problematic-pdf-register.json"), "utf8"));
  // Section entries are pipe-delimited `JURISDICTION|FORM|sha256` strings, and
  // the register keys its sections by name rather than as an array. Only the
  // ACTIVE-track section matters here: an orphaned or optional problem PDF is
  // not on a route anybody can reach, so it proves nothing about sellability.
  const active = Array.isArray(register.sections?.activeTrackProblemPdfs) ? register.sections.activeTrackProblemPdfs : [];
  const jurisdictions = [...new Set(
    active.map((entry) => String(entry).split("|")[0]?.trim()).filter((code) => /^[A-Z]{2}$/.test(code ?? ""))
  )].sort().slice(0, 6);
  cases.problematic_pdf_routes_are_not_sellable.probes = jurisdictions.map((code) => probe(`problematic-pdf-${code}`, code)).filter(Boolean);
}

for (const [caseId, spec] of Object.entries(cases)) {
  if (spec.probes.length === 0) failures.push(`${caseId}: no probe survived verification, so this journey would assert nothing`);
}

const fixture = {
  schemaVersion: "rcap-hosted-acceptance-journeys/v1",
  generatedBy: "scripts/generate-rcap-hosted-acceptance-journeys.mjs",
  purpose: "Golden-journey probes for the hosted acceptance matrix. Every probe was executed against the real evaluator at generation time and evaluated without opening payment.",
  profileVersion: PROFILE_VERSION,
  evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
  totals: {
    cases: Object.keys(cases).length,
    probes: Object.values(cases).reduce((sum, spec) => sum + spec.probes.length, 0)
  },
  cases
};

if (failures.length > 0) {
  console.error("JOURNEY GENERATION FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const serialized = `${JSON.stringify(fixture, null, 2)}\n`;

if (CHECK) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (existing !== serialized) {
    console.error(`JOURNEY FIXTURE STALE — ${OUT} does not match a fresh generation. Run without --check.`);
    process.exit(1);
  }
  console.log(`JOURNEY FIXTURE CURRENT — ${fixture.totals.probes} probes across ${fixture.totals.cases} cases.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, serialized);
console.log(`JOURNEY FIXTURE WRITTEN — ${fixture.totals.probes} probes across ${fixture.totals.cases} cases, every one evaluated with payment closed.`);
for (const [caseId, spec] of Object.entries(cases)) {
  console.log(`  ${caseId}: ${spec.probes.map((p) => `${p.jurisdiction}=${p.observedAtGeneration.resultCode}`).join(", ")}`);
}
