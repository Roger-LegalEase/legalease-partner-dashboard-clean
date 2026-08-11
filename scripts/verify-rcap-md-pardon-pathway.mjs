// Verifies the MD pardoned-conviction compiled pathway added for
// registry track MD:md_pardon_expungement (E4-R3 "still_blocked" closure).
//
// Owns: schema-shape and identity of the new pathway, the exact
// § 10-105(a)(8)/(c)(4) authority (mutation-red on drift), the routing
// pointers (rule-11, pardon case outcome, packet generator form binding),
// the untouched survival of the seven pre-existing MD pathways, and live
// evaluator routing via the canonical fixtures — including both directions
// of the counsel-approved (2026-08-11) contract: an in-deadline pardon opens
// the caution packet and payment; a passed § 10-105(c)(4) deadline is barred
// and a missing pardon date is requested, with payment shut in both.
process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY || "2026-08-11";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const PATHWAY_ID = "pardoned-conviction-expungement-under-crim-proc-10-105-a-8";
const PRE_EXISTING_IDS = [
  "adult-non-conviction-expungement-under-crim-proc-10-105",
  "automatic-expungement-under-crim-proc-10-105-1",
  "police-record-expungement-when-no-charge-was-filed-under-10-103",
  "eligible-conviction-expungement-under-crim-proc-10-110",
  "cannabis-specific-expungement",
  "second-chance-act-shielding",
  "juvenile-expungement"
];

const profile = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/lib/rcap-engine/compiled/profiles/MD-maryland.json"), "utf8")
);

// --- pathway identity and schema shape --------------------------------------

const pathways = profile.pathways;
assert(pathways.length === 8, `profile has 8 pathways (found ${pathways.length})`);
for (const id of PRE_EXISTING_IDS) {
  assert(pathways.some((p) => p.id === id), `pre-existing pathway survives: ${id}`);
}
const matches = pathways.filter((p) => p.id === PATHWAY_ID);
assert(matches.length === 1, "exactly one pardon pathway with the canonical id");
const pathway = matches[0];

const pardonOutcomePathways = pathways.filter((p) => (p.caseOutcomes ?? []).includes("pardon"));
assert(
  pardonOutcomePathways.length === 1 && pardonOutcomePathways[0].id === PATHWAY_ID,
  "the pardon case outcome belongs to exactly one pathway — no duplicate pardon route"
);

for (const field of ["id", "label", "summary", "sourceRef", "suggestedResultCode"]) {
  assert(typeof pathway?.[field] === "string" && pathway[field].length > 0, `schema-required field present: ${field}`);
}
const sibling = pathways.find((p) => p.id === PRE_EXISTING_IDS[3]);
for (const key of Object.keys(sibling)) {
  assert(pathway !== undefined && key in pathway, `pathway carries sibling profile key: ${key}`);
}

// --- exact authority and mechanism (mutation-red on drift) ------------------

assert(pathway.label.includes("§ 10-105(a)(8)"), "label carries the operative citation § 10-105(a)(8)");
const clauses = (pathway.ruleClauses ?? []).join(" ");
assert(clauses.includes("§ 10-105(a)(8)"), "ruleClauses cite § 10-105(a)(8)");
assert(clauses.includes("§ 10-105(c)(4)"), "ruleClauses cite the § 10-105(c)(4) filing deadline");
assert(clauses.includes("only one criminal act"), "mechanism: single convicted criminal act");
assert(clauses.includes("crime of violence") && clauses.includes("§ 14-101(a)"), "mechanism: crime-of-violence exclusion under Crim. Law § 14-101(a)");
assert(clauses.includes("full and unconditional pardon"), "mechanism: full and unconditional Governor's pardon");
assert(clauses.includes("10 years"), "mechanism: ten-year filing deadline stated");
assert(
  (pathway.waitingRules ?? []).length === 0,
  "no waiting rules: § 10-105(c)(4) is a filing deadline, and encoding it as a minimum wait would invert the statute"
);
assert(
  (pathway.triggerFields ?? []).includes("pardon_signed_date"),
  "the pardon-date fact is a trigger field"
);
const compiledDateQuestion = (profile.questions ?? []).find((q) => q.id === "pardon_signed_date");
assert(
  compiledDateQuestion?.type === "date_or_unknown" && compiledDateQuestion?.required === false,
  "compiled profile carries the optional pardon_signed_date date question"
);
const designerAll51 = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/lib/rcap-engine/compiled/all51.json"), "utf8")
);
const designerDateQuestion = (designerAll51.MD?.questions ?? []).find((q) => q.id === "pardon_signed_date");
assert(
  designerDateQuestion?.type === "date_or_unknown" && designerDateQuestion?.required === false,
  "designer public profile (all51.json MD) exposes the pardon_signed_date question"
);
assert(pathway.routeType === "court_filing" && pathway.filingRequired === true && pathway.automatic === false, "output posture: court-filed petition route");
assert(pathway.suggestedResultCode === "packet_ready_with_caution", "suggested result code matches rule-11's caution posture");
assert(pathway.lawrenceRatification?.status === "ratified_deployable", "counsel-approved ratification recorded on the pathway");
assert(pathway.lawrenceRatification?.payment_allowed_when_engine_confirms === true, "ratification permits engine-confirmed payment");
assert(String(pathway.lawrenceRatification?.legal_basis ?? "").includes("10-105(a)(8)"), "ratification legal basis cites § 10-105(a)(8)");

// --- routing pointers -------------------------------------------------------

const rule11 = (profile.orderedDecisionRules ?? []).find(
  (r) => r.id === "rule-11-full-and-unconditional-governor-pardon-10-105-route-onl"
);
assert(rule11 !== undefined, "rule-11 exists");
assert(
  JSON.stringify(rule11?.candidatePathwayIds) === JSON.stringify([PATHWAY_ID]),
  "rule-11 candidatePathwayIds points at exactly the pardon pathway"
);

const pardonOutcome = (profile.caseOutcomeOptions ?? []).find((o) => o.value === "pardon");
assert(
  JSON.stringify(pardonOutcome?.candidatePathways) === JSON.stringify([PATHWAY_ID]),
  "the pardoned-conviction case outcome routes to the pardon pathway (previously a dangling id)"
);

const generatorEntry = (profile.packetGenerator?.pathways ?? []).filter((e) => e.pathwayId === PATHWAY_ID);
assert(generatorEntry.length === 1, "packet generator carries exactly one pardon-pathway binding");
const form = generatorEntry[0]?.formCandidates?.[0];
assert(form?.fileName === "ccdccr072B.pdf", "registry-designated official form CC-DC-CR-072B is the form candidate");
assert(
  form?.sha256 === "3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469",
  "form candidate is pinned to the committed source inventory bytes"
);

// --- engine deadline carve-out stays present --------------------------------

const evaluatorSource = fs.readFileSync(path.join(rootDir, "src/lib/rcap-engine/evaluator.ts"), "utf8");
assert(
  evaluatorSource.includes(`MD:${PATHWAY_ID}`),
  "evaluator carries the MD pardon timing carve-out keyed to the pathway id"
);
assert(
  evaluatorSource.includes("md_pardon_date_needed") && evaluatorSource.includes("md_pardon_deadline_not_eligible"),
  "evaluator carries the pardon-date request and the § 10-105(c)(4) deadline bar"
);
assert(
  /RATIFIED_DEPLOYABLE_ROUTES = new Set\(\[[^\]]*MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8/s.test(evaluatorSource),
  "the route is in the ratified-deployable payment allowlist (counsel approval 2026-08-11)"
);

// --- live routing via canonical fixtures ------------------------------------

const fixtures = JSON.parse(
  fs.readFileSync(path.join(rootDir, "data/expungement-ai/fixtures/maryland-pardon-evaluation-fixtures.json"), "utf8")
);
assert(fixtures.pathwayId === PATHWAY_ID, "fixtures are bound to the canonical pathway id");
for (const fixtureCase of fixtures.cases) {
  let evaluation;
  try {
    evaluation = evaluateScreening({
      jurisdiction: fixtures.jurisdiction,
      profileVersion: fixtures.profileVersion,
      matterId: `verify-${fixtureCase.id}`,
      answers: fixtureCase.answers
    });
  } catch (error) {
    failures.push(`fixture ${fixtureCase.id}: evaluator threw ${error?.message ?? error}`);
    continue;
  }
  assert(
    evaluation.resultCode === fixtureCase.expect.resultCode,
    `fixture ${fixtureCase.id}: resultCode ${evaluation.resultCode} === ${fixtureCase.expect.resultCode}`
  );
  assert(
    evaluation.reasons.some((r) => r.code === fixtureCase.expect.reasonCode),
    `fixture ${fixtureCase.id}: reason ${fixtureCase.expect.reasonCode} present (got ${evaluation.reasons.map((r) => r.code).join(",")})`
  );
  assert(
    evaluation.paymentAllowed === fixtureCase.expect.paymentAllowed,
    `fixture ${fixtureCase.id}: paymentAllowed === ${fixtureCase.expect.paymentAllowed}`
  );
  if (fixtureCase.expect.pathwayId) {
    assert(
      evaluation.pathwayId === fixtureCase.expect.pathwayId,
      `fixture ${fixtureCase.id}: pathwayId ${evaluation.pathwayId} === ${fixtureCase.expect.pathwayId}`
    );
  }
  if (fixtureCase.expect.missingQuestionId) {
    assert(
      evaluation.missingQuestionIds.includes(fixtureCase.expect.missingQuestionId),
      `fixture ${fixtureCase.id}: asks for ${fixtureCase.expect.missingQuestionId}`
    );
  }
}
const paymentDirections = fixtures.cases.map((c) => c.expect.paymentAllowed);
assert(
  paymentDirections.includes(true) && paymentDirections.includes(false),
  "both-direction payment proof: at least one fixture opens payment and at least one keeps it shut"
);

if (failures.length > 0) {
  console.error("verify-rcap-md-pardon-pathway FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(
  "verify-rcap-md-pardon-pathway passed: the § 10-105(a)(8)/(c)(4) pardon pathway is schema-shaped, uniquely routed, authority-pinned, deadline-verified in both directions with counsel-approved payment, and the seven pre-existing Maryland pathways survive."
);
