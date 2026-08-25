import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLOSURE_PATH = path.join(ROOT, "data/expungement-ai/corrections-a/closure.json");
const CLOSURE_BUILDER_PATH = path.join(ROOT, "scripts/build-corrections-a-closure.mjs");
const METADATA_PATH = path.join(ROOT, "data/expungement-ai/route-product-metadata.json");
const PROFILES_PATH = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const EVALUATOR_PATH = path.join(ROOT, "src/lib/rcap-engine/evaluator.ts");
const MS_CORRECTIONS_PATH = path.join(
  ROOT,
  "src/lib/rcap/state-packs/mississippi/correction-closures.ts"
);

const EXPECTED_ROUTE_KEYS = [
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40",
  "AK:juvenile-record-sealing-as-47-12-300",
  "AK:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180",
  "AL:eligible-conviction-expungement-under-the-redeemer-act",
  "AR:situation-a-non-convictions",
  "CT:absolute-pardon-resulting-in-erasure",
  "CT:automatic-clean-slate-erasure-for-eligible-post-2000-convictions",
  "DC:dc_auto_expungement_16_802",
  "DC:dc_auto_sealing_16_805",
  "DC:dc_juvenile_sealing_16_2335",
  "DC:dc_motion_seal_felony_conviction_8yr_16_806",
  "DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806",
  "DC:dc_motion_seal_nonconviction_16_806",
  "DE:pardon-based-discretionary-expungement-under-11-del-c-4375",
  "FL:early-juvenile-expunction-943-0515",
  "ID:non-conviction-fingerprint-and-criminal-history-expungement-under-idaho-code-67-3004-10",
  "IL:adult-non-conviction-expungement",
  "IL:human-trafficking-survivor-vacatur-and-expungement",
  "IL:juvenile-automatic-or-petition-expungement",
  "KY:felony-conviction-431073",
  "KY:misdemeanor-violation-traffic-conviction",
  "LA:felony-ten-year-clean-period-expungement",
  "LA:first-offense-marijuana-expungement-after-90-days-art-998",
  "LA:misdemeanor-five-year-clean-period-expungement",
  "MA:adult-conviction-sealing-under-m-g-l-c-276-100a",
  "MA:juvenile-record-sealing-under-100b",
  "MA:time-based-expungement-under-100f-100j",
  "MD:automatic-expungement-under-crim-proc-10-105-1",
  "MD:cannabis-specific-expungement",
  "MD:juvenile-expungement",
  "MD:second-chance-act-shielding",
  "ME:sex-trafficking-sexual-exploitation-survivor-sealing",
  "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130",
  "MS:additional-justice-or-municipal-court-misdemeanor-relief",
  "MS:first-offense-dui-expungement",
  "MS:minor-in-possession-underage-alcohol-expungement"
];

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

function parseRouteSet(source, name) {
  const match = source.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`, "m"));
  check(Boolean(match), `Evaluator route set ${name} is missing.`);
  return new Set(match ? [...match[1].matchAll(/"([A-Z]{2}:[^"]+)"/g)].map((entry) => entry[1]) : []);
}

if (!fs.existsSync(CLOSURE_PATH)) {
  console.error("verify-corrections-a-closure: RED");
  console.error(`- Missing ${path.relative(ROOT, CLOSURE_PATH)}.`);
  process.exit(1);
}

const closure = JSON.parse(fs.readFileSync(CLOSURE_PATH, "utf8"));
const regeneratedClosure = execFileSync(process.execPath, [CLOSURE_BUILDER_PATH], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024
});
const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf8")).routes;
const evaluatorSource = fs.readFileSync(EVALUATOR_PATH, "utf8");
const controlSets = {
  ratified: parseRouteSet(evaluatorSource, "RATIFIED_DEPLOYABLE_ROUTES"),
  corrected: parseRouteSet(evaluatorSource, "CORRECTED_AWAITING_RECONFIRM_ROUTES"),
  hardGate: parseRouteSet(evaluatorSource, "HARD_GATE_PENDING_ROUTES"),
  heldGuidance: parseRouteSet(evaluatorSource, "HELD_GUIDANCE_ROUTES")
};

check(closure.schemaVersion === "expai-corrections-a-closure/v1", "Closure schema version is not expai-corrections-a-closure/v1.");
check(
  fs.readFileSync(CLOSURE_PATH, "utf8") === regeneratedClosure,
  "Closure register is stale; run node scripts/build-corrections-a-closure.mjs --write."
);
check(closure.authority?.sourceCandidateSha === "714f4d51f93461855b24c8644b6ea6ddad6d15f2", "Closure source candidate SHA is not pinned.");
check(closure.authority?.assignmentBaseSha === "07675789a80e732d2b835c1e8ba2092b39201b79", "Closure assignment base SHA is not pinned.");
check(closure.authority?.ownershipSlice === "corrections-a:1-36", "Closure ownership slice is not corrections-a:1-36.");

const routes = Array.isArray(closure.routes) ? closure.routes : [];
const actualKeys = routes.map((route) => route.routeKey);
check(routes.length === 36, `Expected 36 closure rows, found ${routes.length}.`);
check(new Set(actualKeys).size === routes.length, "Closure register contains duplicate route keys.");
check(JSON.stringify(actualKeys) === JSON.stringify([...actualKeys].sort()), "Closure rows are not lexicographically sorted.");
check(JSON.stringify(actualKeys) === JSON.stringify(EXPECTED_ROUTE_KEYS), "Closure rows do not exactly match the assigned correction IDs.");

const profileFiles = fs.readdirSync(PROFILES_PATH).filter((file) => file.endsWith(".json"));
const paidRouteTypes = new Set(["court_application", "court_motion", "court_petition"]);
const nonPaymentCategories = new Set(["automatic_or_no_filing", "guidance_only", "legal_hold_guidance"]);
const counts = { paid_packet: 0, automatic_or_no_filing: 0, guidance_only: 0, legal_hold_guidance: 0 };
const metadataHandoff = closure.sharedHandoff?.routeProductMetadata ?? {};
const ratifiedRemovals = new Set(closure.sharedHandoff?.removeFromRatifiedDeployable ?? []);
const heldGuidanceAdditions = new Set(closure.sharedHandoff?.addToHeldGuidance ?? []);

check(
  [...ratifiedRemovals].every((routeKey) => EXPECTED_ROUTE_KEYS.includes(routeKey)),
  "Ratified-route removal handoff includes a route outside Corrections A ownership."
);
check(
  Object.keys(metadataHandoff).every((routeKey) => EXPECTED_ROUTE_KEYS.includes(routeKey)),
  "Product-metadata handoff includes a route outside Corrections A ownership."
);
check(
  [...heldGuidanceAdditions].every((routeKey) => EXPECTED_ROUTE_KEYS.includes(routeKey)),
  "Held-guidance handoff includes a route outside Corrections A ownership."
);
check(
  [...heldGuidanceAdditions].every((routeKey) => !controlSets.ratified.has(routeKey) || ratifiedRemovals.has(routeKey)),
  "Held-guidance handoff leaves a route effectively ratified."
);

for (const row of routes) {
  const [code, pathwayId] = String(row.routeKey).split(/:(.+)/);
  const profileFile = profileFiles.find((file) => file.startsWith(`${code}-`));
  check(Boolean(profileFile), `${row.routeKey}: compiled profile is missing.`);
  if (!profileFile) continue;

  const profile = JSON.parse(fs.readFileSync(path.join(PROFILES_PATH, profileFile), "utf8"));
  const pathway = (profile.pathways ?? []).find((candidate) => candidate.id === pathwayId);
  const committedMetadata = metadata[row.routeKey];
  const routeMetadata = { ...committedMetadata, ...metadataHandoff[row.routeKey] };
  check(Boolean(pathway), `${row.routeKey}: pathway is missing from ${profileFile}.`);
  check(Boolean(committedMetadata), `${row.routeKey}: product metadata is missing.`);
  if (!pathway || !committedMetadata) continue;

  check(row.priorDecision === "HELD", `${row.routeKey}: prior decision must remain recorded as HELD.`);
  check(Array.isArray(row.priorBlockers) && row.priorBlockers.length > 0, `${row.routeKey}: prior blockers are missing.`);
  check(Object.hasOwn(counts, row.closureCategory), `${row.routeKey}: unknown closure category ${row.closureCategory}.`);
  if (Object.hasOwn(counts, row.closureCategory)) counts[row.closureCategory] += 1;
  check(row.checkoutExpected === routeMetadata.paymentProductEligible, `${row.routeKey}: checkout expectation disagrees with committed metadata plus the shared handoff.`);
  check(typeof row.timingResolution === "string" && row.timingResolution.length > 0, `${row.routeKey}: timing resolution is missing.`);
  check(row.evidence?.profilePath === `src/lib/rcap-engine/compiled/profiles/${profileFile}`, `${row.routeKey}: evidence profile path is not exact.`);
  check(row.evidence?.pathwaySourceRef === pathway.sourceRef, `${row.routeKey}: evidence sourceRef does not match the compiled pathway.`);
  check(Array.isArray(row.evidence?.sourceQuotes) && row.evidence.sourceQuotes.length > 0, `${row.routeKey}: source quotes are missing.`);

  const sourceCorpus = JSON.stringify({ pathway, waitingPeriodRules: profile.waitingPeriodRules ?? [] });
  for (const quote of row.evidence?.sourceQuotes ?? []) {
    check(typeof quote === "string" && quote.length >= 12, `${row.routeKey}: source quote is too short.`);
    check(sourceCorpus.includes(quote), `${row.routeKey}: source quote is not present in the route/profile evidence.`);
  }

  const memberships = Object.values(controlSets).filter((set) => set.has(row.routeKey)).length;
  check(memberships <= 1, `${row.routeKey}: route appears in more than one evaluator control set.`);

  if (row.closureCategory === "paid_packet") {
    check(row.checkoutExpected === true, `${row.routeKey}: paid-packet closure must expect checkout.`);
    check(routeMetadata.legalSignoffStatus === "signed_off", `${row.routeKey}: paid-packet closure lacks signed-off legal metadata.`);
    check(paidRouteTypes.has(routeMetadata.productRouteType), `${row.routeKey}: paid-packet closure has non-paid route type ${routeMetadata.productRouteType}.`);
    check(controlSets.ratified.has(row.routeKey) && !ratifiedRemovals.has(row.routeKey), `${row.routeKey}: paid-packet closure is not effectively ratified.`);
    check(!/pending|fallback|unresolved/i.test(row.timingResolution), `${row.routeKey}: paid-packet timing remains unresolved.`);
  } else {
    check(nonPaymentCategories.has(row.closureCategory), `${row.routeKey}: non-payment route uses an invalid closure category.`);
    check(row.checkoutExpected === false, `${row.routeKey}: non-payment closure unexpectedly permits checkout.`);
    check(!controlSets.ratified.has(row.routeKey) || ratifiedRemovals.has(row.routeKey), `${row.routeKey}: non-payment closure is effectively ratified for checkout.`);
  }

  if (row.closureCategory === "automatic_or_no_filing") {
    check(routeMetadata.productRouteType === "automatic_relief", `${row.routeKey}: automatic closure is not metadata-classified as automatic relief.`);
  }
  if (row.closureCategory === "guidance_only") {
    check(["board_or_pardon", "guidance_only"].includes(routeMetadata.productRouteType), `${row.routeKey}: guidance closure has unexpected route type ${routeMetadata.productRouteType}.`);
  }
  if (row.closureCategory === "legal_hold_guidance") {
    check(["blocked", "needs_reconfirm"].includes(routeMetadata.legalSignoffStatus), `${row.routeKey}: legal-hold closure lacks a blocked/reconfirm status.`);
    check(
      controlSets.corrected.has(row.routeKey) ||
        controlSets.hardGate.has(row.routeKey) ||
        controlSets.heldGuidance.has(row.routeKey) ||
        heldGuidanceAdditions.has(row.routeKey),
      `${row.routeKey}: legal-hold closure is not represented by an evaluator hold set or handoff.`
    );
  }
}

check(fs.existsSync(MS_CORRECTIONS_PATH), "Mississippi state-local correction closures are missing.");
if (fs.existsSync(MS_CORRECTIONS_PATH)) {
  const mississippiSource = fs.readFileSync(MS_CORRECTIONS_PATH, "utf8");
  const requiredMississippiEvidence = [
    "additional-justice-or-municipal-court-misdemeanor-relief",
    "last_conviction_date_any_court",
    "two_years_good_conduct",
    "Miss. Code Ann. § 9-11-15(3)",
    "Miss. Code Ann. § 21-23-7(6)",
    "first-offense-dui-expungement",
    "five_years_after_successful_sentence_completion",
    "Miss. Code Ann. § 63-11-30(13)",
    "minor-in-possession-underage-alcohol-expungement",
    "one_year_after_dismissal_or_discharge",
    "latest_of_sentence_completion_or_fine_payment",
    "Miss. Code Ann. § 67-3-70(6)",
    "fail_closed_pending_formal_legal_approval_and_hosted_acceptance"
  ];
  for (const evidence of requiredMississippiEvidence) {
    check(mississippiSource.includes(evidence), `Mississippi correction source is missing ${evidence}.`);
  }
}

if (failures.length > 0) {
  console.error("verify-corrections-a-closure: RED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-corrections-a-closure: GREEN");
console.log(JSON.stringify({ assigned: routes.length, counts }, null, 2));
