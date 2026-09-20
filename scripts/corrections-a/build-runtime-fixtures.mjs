import fs from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/runtime-fixtures.json"
);
const CLOSURE_PATH = path.join(
  ROOT,
  "data/expungement-ai/corrections-a/closure.json"
);
const EVALUATOR_TODAY = "2026-08-25";

process.env.RCAP_EVALUATOR_TODAY = EVALUATOR_TODAY;
register(
  pathToFileURL(path.join(ROOT, "scripts/corrections-a/native-ts-loader.mjs")).href,
  import.meta.url
);

const { getProfileByJurisdiction } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/rcap-engine/profile-registry.ts")).href
);
const { projectPublicProfile } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/rcap-engine/public-profile-projection.ts")).href
);
const { evaluateScreening } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/rcap-engine/evaluator.ts")).href
);

const closure = JSON.parse(fs.readFileSync(CLOSURE_PATH, "utf8"));
const removalSet = new Set(closure.sharedHandoff.removeFromRatifiedDeployable);

function desiredOutcome(pathwayId) {
  if (/minor-in-possession|underage/.test(pathwayId)) return /misdemeanor conviction/i;
  if (/juvenile/.test(pathwayId)) return /juvenile/i;
  if (/non-conviction|nonconviction|acquittal|dismissal|mistaken-identity|false-accusation/.test(pathwayId)) {
    return /dismissed|not prosecuted/i;
  }
  if (/pardon/.test(pathwayId)) return /other conviction|felony conviction/i;
  if (/felony/.test(pathwayId)) return /felony conviction/i;
  if (/automatic-clean-slate/.test(pathwayId)) return /misdemeanor conviction/i;
  return /misdemeanor conviction|other conviction/i;
}

function choice(question, preferred) {
  const options = Array.isArray(question.options) ? question.options : [];
  if (preferred) {
    const match = options.find((option) => preferred.test(String(option)));
    if (match !== undefined) return match;
  }
  return options.find(
    (option) => !/federal|not sure|unknown|prefer not|none of these|still open|pending/i.test(String(option))
  ) ?? options[0];
}

function answerFor(question, pathway) {
  const id = question.id;
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return choice(question, /state|local/i) ?? "State or local";
  if (id === "case_outcome") return choice(question, desiredOutcome(pathway.id));
  if (id === "offense_level") return /felony/.test(pathway.id) ? "Felony" : "Misdemeanor";
  if (id === "possible_pathway_context") return pathway.label;
  if (id === "state_exclusion_categories") return ["None of these"];
  if (id.endsWith("_date") || id.startsWith("date_")) return "2000-01-01";
  if (id === "special_preconditions_confirmed"
    || id === "record_documents"
    || id === "criminal_history"
    || id === "court_requirements_completed"
    || id === "financial_obligations") return "Yes";
  if (/pending|new_convictions|identity_error|trafficking_status/.test(id)) return "No";
  if (id === "resolved_timing_bucket") return choice(question, /gt_10|more than|longer/i);
  if (id === "court") return "Synthetic trial court";
  if (id === "county" || id === "county_or_filing_location" || id === "residency_or_location") {
    return "Synthetic County";
  }
  if (id === "case_identifier") return "SYN-CASE-001";
  if (id === "charge") return pathway.label;
  if (id === "offense_category") return "None of these";
  if (id === "age_at_offense") return /juvenile|minor|underage/.test(pathway.id) ? 17 : 30;
  if (id === "prior_conviction_count" || id === "prior_felony_count") return 0;
  if (question.type === "number_or_range") return 30;
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (Array.isArray(question.options) && question.options.length > 0) return choice(question);
  return "Synthetic answer";
}

const routes = closure.routes.map((row) => {
  const [jurisdiction, pathwayId] = row.routeKey.split(/:(.+)/);
  const profile = getProfileByJurisdiction(jurisdiction);
  if (!profile) throw new Error(`Missing runtime profile for ${row.routeKey}`);
  const pathway = profile.pathways.find((candidate) => candidate.id === pathwayId);
  if (!pathway) throw new Error(`Missing runtime pathway for ${row.routeKey}`);

  const answers = Object.fromEntries(
    projectPublicProfile(profile).questions.map((question) => [
      question.id,
      answerFor(question, pathway)
    ])
  );
  const evaluation = evaluateScreening({
    jurisdiction,
    profileVersion: profile.profileVersion,
    matterId: `corrections-a-${jurisdiction.toLowerCase()}-${pathwayId}`,
    answers
  });

  return {
    routeKey: row.routeKey,
    jurisdiction,
    pathwayId,
    profileVersion: profile.profileVersion,
    answers,
    baseline: {
      resultCode: evaluation.resultCode,
      pathwayId: evaluation.pathwayId ?? null,
      paymentAllowed: evaluation.paymentAllowed,
      reasonCodes: evaluation.reasons.map((reason) => reason.code),
      missingQuestionIds: evaluation.missingQuestionIds
    },
    expectedAfterSharedHandoff: {
      closureCategory: row.closureCategory,
      paymentAllowed: row.checkoutExpected,
      ratifiedRemovalRequired: removalSet.has(row.routeKey)
    }
  };
});

const fixture = {
  schemaVersion: "expai-corrections-a-runtime-fixtures/v1",
  evaluatorToday: EVALUATOR_TODAY,
  authority: closure.authority,
  routes
};
const output = `${JSON.stringify(fixture, null, 2)}\n`;

if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(path.relative(ROOT, OUTPUT_PATH));
} else {
  process.stdout.write(output);
}
