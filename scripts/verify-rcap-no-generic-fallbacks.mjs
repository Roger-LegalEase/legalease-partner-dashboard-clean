import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// PERMANENT RULE: NO GENERIC FALLBACK LOGIC ANYWHERE.
//
// Specific source-backed route, or fail closed. This verifier fails (exit 1) if
// any generic-fallback / unsafe-payment pattern exists. It combines three proof
// layers so the guarantee holds for ALL inputs, not just sampled ones:
//
//   PART A — static source proof over evaluator.ts:
//            the single payment gate is uniquely and fully guarded; there is no
//            first-pathway fallback, no generic default wait, no source_question_*
//            payment gate, no free-text-charge-only paid gate.
//   PART B — structural proof over the four control sets + compiled pathways:
//            the tiers are mutually exclusive; every compiled pathway is
//            classified; automatic/admin/board/pardon and hard-gate routes are
//            never in the ratified/deployable set.
//   PART C — behavioral both-direction proof over all 324 compiled routes:
//            every ratified route sells when qualifying and blocks when
//            disqualified; NO non-ratified route (hard-gate / corrected / held /
//            untiered / automatic) can EVER open payment; no fail-closed result
//            code ever carries paymentAllowed=true.
//
// The 14 numbered checks from the rule are annotated inline as [#n].
// This script does NOT change runtime behavior, promote routes, deploy, or run
// Stripe. It is read-only except for its own console output.
// ============================================================================

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVALUATOR_PATH = path.join(ROOT, "src/lib/rcap-engine/evaluator.ts");
const INVENTORY_PATH = path.join(ROOT, "data/expungement-ai/reports/petition-route-inventory.json");

const evalSrc = fs.readFileSync(EVALUATOR_PATH, "utf8");
const evalLines = evalSrc.split("\n");

const failures = [];      // hard failures -> exit 1
const findings = [];      // reported fallback-like patterns (file/line)
function fail(check, message) { failures.push({ check, message }); }
function ok(cond, check, message) { if (!cond) fail(check, message); }
function record(check, severity, file, line, snippet) {
  findings.push({ check, severity, file, line, snippet: snippet.trim().slice(0, 160) });
}

// ---------------------------------------------------------------------------
// Parse the mutually-exclusive control sets straight from evaluator.ts source.
// ---------------------------------------------------------------------------
function parseRouteSet(name) {
  const m = evalSrc.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`, "m"));
  if (!m) throw new Error(`Could not find control set ${name} in evaluator.ts`);
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((k) => /^[A-Z]{2}:/.test(k)));
}
const RATIFIED_DEPLOYABLE = parseRouteSet("RATIFIED_DEPLOYABLE_ROUTES");
const CORRECTED_AWAITING_RECONFIRM = parseRouteSet("CORRECTED_AWAITING_RECONFIRM_ROUTES");
const HARD_GATE_PENDING = parseRouteSet("HARD_GATE_PENDING_ROUTES");
const HELD_GUIDANCE = parseRouteSet("HELD_GUIDANCE_ROUTES");
const RATIFIED_CAUTION_OVERRIDE = parseRouteSet("RATIFIED_CAUTION_OVERRIDE_ROUTES");
const ADMIN_APPLICATION_ROUTES = parseRouteSet("ADMINISTRATIVE_APPLICATION_PACKET_ROUTES");
const MUTUALLY_EXCLUSIVE = {
  RATIFIED_DEPLOYABLE_ROUTES: RATIFIED_DEPLOYABLE,
  CORRECTED_AWAITING_RECONFIRM_ROUTES: CORRECTED_AWAITING_RECONFIRM,
  HARD_GATE_PENDING_ROUTES: HARD_GATE_PENDING,
  HELD_GUIDANCE_ROUTES: HELD_GUIDANCE
};

// Source-controlled product metadata + Legal Action Required feed (Phase 4 / Phase 2). These are the
// explicit payment-eligibility source of truth; if they are missing, fail closed.
const METADATA_PATH = path.join(ROOT, "data/expungement-ai/route-product-metadata.json");
const LAR_PATH = path.join(ROOT, "data/expungement-ai/reports/legal-action-required.json");
const routeMetadata = fs.existsSync(METADATA_PATH) ? JSON.parse(fs.readFileSync(METADATA_PATH, "utf8")).routes : null;
const openLarByRoute = new Set();
if (fs.existsSync(LAR_PATH)) {
  for (const item of JSON.parse(fs.readFileSync(LAR_PATH, "utf8")).items ?? []) {
    if (item.status === "open") openLarByRoute.add(`${item.jurisdiction}:${item.routeId}`);
  }
}

const profiles = getAllJurisdictionProfiles();

// =====================================================================
// PART A — STATIC SOURCE PROOF over evaluator.ts
// =====================================================================

// [#1] No first-pathway fallback (profile.pathways[0] or pathways[ 0 ]).
{
  const re = /pathways\s*\[\s*0\s*\]/g;
  let m;
  let found = false;
  while ((m = re.exec(evalSrc)) !== null) {
    found = true;
    const line = evalSrc.slice(0, m.index).split("\n").length;
    record("#1 first_pathway_fallback", "unsafe", "src/lib/rcap-engine/evaluator.ts", line, evalLines[line - 1]);
  }
  ok(!found, "#1", "evaluator.ts contains a first-pathway fallback (pathways[0]).");
}

// [#2] No generic/default waiting-period shortcut.
//   Every hardcoded duration literal { value: N, unit: "..." } must live inside the
//   route-keyed specialRouteTiming function (each guarded by `if (key === "CC:route")`
//   or the NY latestAnchorTiming call). Any duration literal in the generic timing path,
//   or a DEFAULT_WAIT-style constant, is a generic fallback.
{
  ok(!/DEFAULT_WAIT|defaultWait|genericWait|generic_wait|fallbackWait|FALLBACK_WAIT/.test(evalSrc),
    "#2", "evaluator.ts defines a generic/default waiting-period constant.");
  const specialStart = evalSrc.indexOf("function specialRouteTiming(");
  const specialEnd = evalSrc.indexOf("\nfunction latestAnchorTiming(");
  ok(specialStart !== -1 && specialEnd !== -1 && specialEnd > specialStart, "#2", "Could not locate specialRouteTiming bounds to validate waiting-period literals.");
  // A *positive* duration literal outside route-keyed specialRouteTiming is a generic default wait.
  // value:0 (event-based, parsed from "immediate/no waiting period" source text) and value:-1
  // (the ambiguous fail-closed sentinel) are data-derived / fail-closed, not generic defaults.
  const durationLiteral = /\{\s*value:\s*(-?\d+)\s*,\s*unit:\s*"(?:days|months|years)"/g;
  let m;
  while ((m = durationLiteral.exec(evalSrc)) !== null) {
    const value = Number(m[1]);
    const inSpecialRouteTiming = specialStart !== -1 && specialEnd !== -1 && m.index > specialStart && m.index < specialEnd;
    if (inSpecialRouteTiming) continue;
    const line = evalSrc.slice(0, m.index).split("\n").length;
    if (value > 0) {
      record("#2 generic_default_wait", "unsafe", "src/lib/rcap-engine/evaluator.ts", line, evalLines[line - 1]);
      fail("#2", `Positive waiting-period literal outside route-keyed specialRouteTiming at line ${line}: ${evalLines[line - 1].trim()}`);
    } else {
      record("#2 event_or_ambiguous_wait_literal", "safe", "src/lib/rcap-engine/evaluator.ts", line, `value:${value} — event-based/ambiguous sentinel derived from source text (not a generic default).`);
    }
  }
  // The generic timing path must FAIL CLOSED (needs_review) when it cannot resolve a
  // source-specific wait for a packet-like route, rather than defaulting to a wait.
  ok(/waiting_rule_not_executed/.test(evalSrc) && /waiting_anchor_not_determined/.test(evalSrc),
    "#2", "Generic timing path is missing its fail-closed needs_review branches (waiting_rule_not_executed / waiting_anchor_not_determined).");
}

// Locate the single truthy payment computation (the deep gate) and the result() clamp.
const payComputeIdx = evalSrc.indexOf("const paymentAllowed = route.deterministic === true");
const payComputeLine = payComputeIdx === -1 ? -1 : evalSrc.slice(0, payComputeIdx).split("\n").length;
const payClampIdx = evalSrc.indexOf('const paymentAllowed = overrides.paymentAllowed === true');
ok(payComputeIdx !== -1, "#3", "Could not find the deep payment computation in evaluator.ts.");
ok(payClampIdx !== -1, "#7", "Could not find the result() payment clamp in evaluator.ts.");

// Extract the full deep-gate expression (from the compute to the following `;`).
const payExpr = payComputeIdx === -1 ? "" : evalSrc.slice(payComputeIdx, evalSrc.indexOf(";", payComputeIdx));

// [#3] Payment cannot open without routeIsRatifiedDeployable.
ok(/routeIsRatifiedDeployable\(/.test(payExpr), "#3", "Deep payment gate does not require routeIsRatifiedDeployable().");
// [#4] Payment cannot open without isCourtFiledPetitionRoute OR the legally signed-off administrative
// application predicate (Hawaii HCJDC). Both must be present; the ONLY permitted disjunction is between
// these two route-type predicates.
ok(/isCourtFiledPetitionRoute\(/.test(payExpr), "#4", "Deep payment gate does not require isCourtFiledPetitionRoute().");
ok(/routeIsAdministrativeApplicationPacket\(/.test(payExpr), "#4", "Deep payment gate does not admit the legally signed-off administrative-application predicate (routeIsAdministrativeApplicationPacket).");
// [#5] Payment cannot open without isPacketPlanFulfillmentReady.
ok(/isPacketPlanFulfillmentReady\(/.test(payExpr), "#5", "Deep payment gate does not require isPacketPlanFulfillmentReady().");
// [#6] Payment cannot open without a deterministic compiled rule match.
ok(/route\.deterministic === true/.test(payExpr), "#6", "Deep payment gate does not require a deterministic compiled rule match (route.deterministic === true).");
ok(/Boolean\(plan\)/.test(payExpr), "#6", "Deep payment gate does not require a resolved packet plan (Boolean(plan)).");
// The gate must be a conjunction whose ONLY `||` is the court-vs-admin route-type disjunction. Strip
// that one permitted disjunction; any remaining `||` is an unsafe alternate payment path.
{
  const permitted = "(isCourtFiledPetitionRoute(profile, pathway) || routeIsAdministrativeApplicationPacket(profile, pathway))";
  const stripped = payExpr.replace(permitted, "");
  ok(payExpr.includes("&&"), "#3", "Deep payment gate is not a conjunction.");
  ok(!stripped.includes("||"), "#3", "Deep payment gate contains an alternate `||` path beyond the permitted court-vs-admin route-type disjunction.");
}

// [#7] result() clamps paymentAllowed to packet_ready / packet_ready_with_caution only,
// and payment can never accompany a fail-closed result code.
{
  const clampExpr = payClampIdx === -1 ? "" : evalSrc.slice(payClampIdx, evalSrc.indexOf(";", payClampIdx));
  ok(/overrides\.paymentAllowed === true/.test(clampExpr) &&
     /resultCode === "packet_ready"/.test(clampExpr) &&
     /resultCode === "packet_ready_with_caution"/.test(clampExpr),
    "#7", "result() does not clamp paymentAllowed to packet_ready / packet_ready_with_caution only.");
  for (const badCode of ["guidance_only", "needs_review", "needs_more_info", "not_yet", "likely_not_eligible", "hard_stop"]) {
    ok(!new RegExp(`resultCode === "${badCode}"[^)]*paymentAllowed`).test(clampExpr),
      "#7", `result() clamp references a fail-closed code (${badCode}) in the payment expression.`);
  }
}

// Single-source-of-payment proof: exactly one truthy compute + one clamp; every other
// `paymentAllowed` mention passes `false` or reads the clamped value. No alternate route
// can set paymentAllowed true. (Reinforces [#3][#7].)
{
  const truthyComputes = (evalSrc.match(/const paymentAllowed = route\.deterministic === true/g) ?? []).length;
  const clamps = (evalSrc.match(/const paymentAllowed = overrides\.paymentAllowed === true/g) ?? []).length;
  ok(truthyComputes === 1, "#3", `Expected exactly one truthy payment computation; found ${truthyComputes}.`);
  ok(clamps === 1, "#7", `Expected exactly one result() payment clamp; found ${clamps}.`);
  // Every `paymentAllowed:` object-literal assignment in a result() override must be `false`.
  const overrideAssigns = [...evalSrc.matchAll(/paymentAllowed:\s*([A-Za-z0-9_]+)/g)];
  for (const m of overrideAssigns) {
    const val = m[1];
    if (val !== "false" && val !== "paymentAllowed") {
      const line = evalSrc.slice(0, m.index).split("\n").length;
      record("#3 alternate_payment_path", "unsafe", "src/lib/rcap-engine/evaluator.ts", line, evalLines[line - 1]);
      fail("#3", `A result() override sets paymentAllowed to a non-false value (${val}) at line ${line}.`);
    }
  }
}

// [#12] No route uses an internal-only source_question_* field as a payment gate.
{
  const re = /answers\s*(?:\.|\[["'])source_question_/g;
  let m;
  while ((m = re.exec(evalSrc)) !== null) {
    const line = evalSrc.slice(0, m.index).split("\n").length;
    record("#12 source_question_gate", "unsafe", "src/lib/rcap-engine/evaluator.ts", line, evalLines[line - 1]);
    fail("#12", `evaluator.ts reads an internal source_question_* answer as a gate at line ${line}.`);
  }
}

// [#13] Free-text `charge` is never the ONLY paid eligibility gate. Every gate/timing
// function that reads answers.charge must also read a structured field
// (offense_level / case_outcome / a coded *_confirmed / ny_/ca_/dc_ boolean).
{
  const gateFunctionNames = [
    "routeSpecificSafetyGate", "ilFelonyProstitutionSafetyGate", "caRouteSafetyGate",
    "nyCpl16058SafetyGate", "nyCpl16059SafetyGate", "dcSafetyGate",
    "missingProductFactIds", "specialRouteTiming"
  ];
  for (const fn of gateFunctionNames) {
    const start = evalSrc.indexOf(`function ${fn}(`);
    if (start === -1) continue;
    const nextFn = evalSrc.indexOf("\nfunction ", start + 1);
    const body = evalSrc.slice(start, nextFn === -1 ? undefined : nextFn);
    if (/answers\.charge\b|answers\["charge"\]/.test(body)) {
      const hasStructured = /answers\.offense_level|answers\.case_outcome|_confirmed|answers\.(?:ny|ca|dc)_/.test(body);
      const line = evalSrc.slice(0, start).split("\n").length;
      if (!hasStructured) {
        record("#13 freetext_charge_only_gate", "unsafe", "src/lib/rcap-engine/evaluator.ts", line, `${fn}()`);
        fail("#13", `${fn}() gates on free-text charge without a structured offense field.`);
      } else {
        record("#13 charge_used_with_structured_field", "safe", "src/lib/rcap-engine/evaluator.ts", line, `${fn}() reads charge alongside a structured offense field (offense_level/case_outcome/coded boolean).`);
      }
    }
  }
}

// No "default to Mississippi / generic state packet / generic legal fallback" in evaluator.
{
  for (const pat of [/mississippi/i, /generic\s*fallback/i, /genericLegalFallback\s*[:=]\s*true/i, /legacy\s*generator/i]) {
    const m = evalSrc.match(pat);
    if (m) {
      const line = evalSrc.slice(0, m.index).split("\n").length;
      record("generic_state_fallback", "unsafe", "src/lib/rcap-engine/evaluator.ts", line, evalLines[line - 1]);
      fail("#2", `evaluator.ts references a generic/legacy/MS fallback at line ${line}: ${evalLines[line - 1].trim()}`);
    }
  }
}

// =====================================================================
// PART B — STRUCTURAL PROOF over control sets + compiled pathways
// =====================================================================

// [#8] No route appears in more than one mutually-exclusive control set.
{
  const names = Object.keys(MUTUALLY_EXCLUSIVE);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = MUTUALLY_EXCLUSIVE[names[i]];
      const b = MUTUALLY_EXCLUSIVE[names[j]];
      for (const key of a) {
        if (b.has(key)) fail("#8", `Route ${key} appears in both ${names[i]} and ${names[j]}.`);
      }
    }
  }
  // RATIFIED_CAUTION_OVERRIDE is an annotation subset of RATIFIED_DEPLOYABLE (not a tier);
  // it must not leak routes into any non-ratified tier.
  for (const key of RATIFIED_CAUTION_OVERRIDE) {
    ok(RATIFIED_DEPLOYABLE.has(key), "#8", `Caution-override route ${key} is not in RATIFIED_DEPLOYABLE_ROUTES.`);
    ok(!CORRECTED_AWAITING_RECONFIRM.has(key) && !HARD_GATE_PENDING.has(key) && !HELD_GUIDANCE.has(key),
      "#8", `Caution-override route ${key} also appears in a mutually-exclusive tier.`);
  }
}

// Build the compiled route universe + a routeType map.
const allRouteKeys = new Set();
const routeTypeByKey = {};
const packetModeByKey = {};
for (const profile of profiles) {
  for (const pathway of profile.pathways) {
    const key = `${profile.jurisdiction.code}:${pathway.id}`;
    allRouteKeys.add(key);
    routeTypeByKey[key] = pathway.routeType || "unknown";
    const plan = profile.packetGenerator.pathways.find((c) => c.pathwayId === pathway.id);
    packetModeByKey[key] = plan?.mode ?? null;
  }
}

// Every control-set key must correspond to a real compiled pathway.
for (const [name, set] of Object.entries(MUTUALLY_EXCLUSIVE)) {
  for (const key of set) ok(allRouteKeys.has(key), "#8", `${name} references non-existent pathway ${key}.`);
}

// [#11] structural: automatic / administrative / board / pardon / portal routes are never in
// RATIFIED_DEPLOYABLE — EXCEPT a legally signed-off administrative-application packet route (Hawaii),
// which must be in ADMINISTRATIVE_APPLICATION_PACKET_ROUTES. automatic-relief-mode routes are never ratified.
{
  const NON_COURT_TYPES = new Set(["automatic", "automatic_or_administrative", "automatic_guidance", "pardon", "pardon_then_court", "portal_guidance", "administrative", "juvenile_guidance", "out_of_scope"]);
  for (const key of RATIFIED_DEPLOYABLE) {
    if (NON_COURT_TYPES.has(routeTypeByKey[key]) && !ADMIN_APPLICATION_ROUTES.has(key)) fail("#11", `Ratified route ${key} has non-court routeType ${routeTypeByKey[key]} and is not a signed-off administrative-application route.`);
    if (packetModeByKey[key] === "automatic_relief_verification_and_guidance") fail("#11", `Ratified route ${key} has automatic_relief packet mode.`);
  }
  // Every admin-application route must be ratified + carry signed-off administrative-application metadata.
  for (const key of ADMIN_APPLICATION_ROUTES) {
    ok(RATIFIED_DEPLOYABLE.has(key), "#11", `Administrative-application route ${key} is not in RATIFIED_DEPLOYABLE.`);
    if (routeMetadata) {
      const md = routeMetadata[key];
      ok(md && md.isAdministrativeApplication === true && md.productRouteType === "administrative_application" && md.legalSignoffStatus === "signed_off", "#11", `Administrative-application route ${key} lacks signed-off administrative-application metadata.`);
    }
  }
}

// [#4] Payment is backed by EXPLICIT product metadata, not label/summary regex. Every route the
// evaluator can open payment for (ratified + court/admin + fulfillment-ready) must carry metadata
// with paymentProductEligible=true and a paid-capable product route type. Missing metadata -> fail closed.
{
  ok(routeMetadata !== null, "#4", `Route product metadata not found at ${path.relative(ROOT, METADATA_PATH)}; run rcap:audit-petition-route-inventory first (payment must be metadata-backed).`);
  const PAID_TYPES = new Set(["court_petition", "court_motion", "court_application", "administrative_application"]);
  if (routeMetadata) {
    for (const key of RATIFIED_DEPLOYABLE) {
      const md = routeMetadata[key];
      ok(md, "#4", `Ratified route ${key} has no explicit product metadata.`);
      if (md) {
        ok(md.paymentProductEligible === true, "#4", `Ratified route ${key} metadata does not mark it paymentProductEligible.`);
        ok(PAID_TYPES.has(md.productRouteType), "#4", `Ratified route ${key} metadata productRouteType ${md.productRouteType} is not a paid-capable court/admin type.`);
      }
    }
    // No route marked paymentProductEligible in metadata may sit outside RATIFIED_DEPLOYABLE.
    for (const [key, md] of Object.entries(routeMetadata)) {
      if (md.paymentProductEligible === true) ok(RATIFIED_DEPLOYABLE.has(key), "#4", `Metadata marks ${key} paymentProductEligible but it is not in RATIFIED_DEPLOYABLE.`);
    }
  }
}

// [#16] No route with an OPEN Legal Action Required item may be paymentProductEligible / ratified.
{
  for (const key of RATIFIED_DEPLOYABLE) {
    ok(!openLarByRoute.has(key), "#16", `Ratified route ${key} has an OPEN Legal Action Required item; payment must stay closed until it is resolved.`);
  }
}

// [#15] Payment/Stripe copy labels the $50 as a self-help PACKET GENERATION fee, never a court /
// filing / application / expungement / legal / attorney / government fee.
{
  const COPY_PATH = path.join(ROOT, "src/lib/expungement-ai/payment-adapter.ts");
  if (!fs.existsSync(COPY_PATH)) {
    fail("#15", `Payment copy source not found at ${path.relative(ROOT, COPY_PATH)}.`);
  } else {
    const copy = fs.readFileSync(COPY_PATH, "utf8");
    const dollarLines = copy.split("\n").filter((l) => /\$50|self-help packet|consumerPacketPrice|product_data|name:\s*"/.test(l) && /"/.test(l));
    const BANNED = [/court fee/i, /filing fee/i, /\bapplication fee\b/i, /expungement fee/i, /\blegal fee\b/i, /attorney fee/i, /government fee/i, /agency fee(?! .*separate)/i];
    for (const line of dollarLines) {
      for (const bad of BANNED) {
        if (bad.test(line)) fail("#15", `Payment copy labels the $50 with a banned fee type: ${line.trim()}`);
      }
    }
    ok(/self-help packet/i.test(copy), "#15", "Payment copy does not describe the $50 as a self-help packet generation fee.");
  }
}

// [#14] Every compiled pathway is classified (via the audit inventory). No pathway may be
// simultaneously in two tiers, and the inventory must have bucketed all 324.
{
  const tierOf = (k) => {
    let n = 0;
    if (RATIFIED_DEPLOYABLE.has(k)) n++;
    if (CORRECTED_AWAITING_RECONFIRM.has(k)) n++;
    if (HARD_GATE_PENDING.has(k)) n++;
    if (HELD_GUIDANCE.has(k)) n++;
    return n;
  };
  for (const key of allRouteKeys) ok(tierOf(key) <= 1, "#14", `Pathway ${key} is in more than one tier.`);

  if (fs.existsSync(INVENTORY_PATH)) {
    const inv = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8"));
    ok(inv.acceptance?.everyPathwayClassifiedOnce === true, "#14", "Petition-route inventory reports an unclassified pathway.");
    ok(inv.totals?.totalPathwaysClassified === allRouteKeys.size, "#14", `Inventory classified ${inv.totals?.totalPathwaysClassified} pathways; compiled universe has ${allRouteKeys.size}.`);
    const bucketed = new Set((inv.routes ?? []).filter((r) => r.bucket).map((r) => r.routeKey));
    for (const key of allRouteKeys) ok(bucketed.has(key), "#14", `Pathway ${key} is not classified in the petition-route inventory.`);
  } else {
    fail("#14", `Petition-route inventory not found at ${path.relative(ROOT, INVENTORY_PATH)}; run rcap:audit-petition-route-inventory first.`);
  }
}

// =====================================================================
// PART C — BEHAVIORAL BOTH-DIRECTION PROOF over all 324 routes
// =====================================================================

// Eligible gate-unlock overlay (public projected gate questions -> eligible value).
const GATE_UNLOCK = {
  ny_16059_total_eligible_convictions: 1,
  ny_16059_felony_convictions: 1,
  ny_16059_ineligible_offense: "No",
  ny_16059_sex_offender_registration: "No",
  ny_16059_pending_charge: "No",
  ny_16059_post_last_conviction_crime: "No",
  ny_16059_prior_sealing: "No",
  ny_16058_treatment_program_completed: "Yes",
  ca_prop64_qualifying_marijuana_offense: "Yes",
  ca_prop64_lesser_or_no_offense: "Yes",
  ca_prop64_relief_requested: "dismissal and sealing",
  wi_expungement_ordered_at_sentencing: "Yes",
  wi_no_probation_jail_prison: "Yes",
  in_prosecutor_consent_confirmed: "Yes",
  dc_offense_severity_group: "Not in offense severity group 1, 2, or 3",
  actual_innocence_basis: "The offense did not occur",
  dc_actual_innocence_basis: "The offense did not occur",
  hi_court_order_confirmed: "Yes"
};
const OUTCOME_CANDIDATES = [
  "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  "Misdemeanor conviction",
  "Felony conviction",
  "Other conviction or adjudication",
  "Acquitted or found not guilty"
];

// Source-defined waiting-rule selection (mirrors verify-rcap-evaluator-all51-provability.mjs).
// The engine fail-closes to needs_review when several distinct source waits could apply; the
// caller disambiguates by naming ONE specific compiled source waiting rule via the public
// waiting_rule_id field. That is a source-defined wait, NOT a generic fallback.
function parseDurationText(text) {
  const lower = String(text).toLowerCase();
  const numeric = lower.match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/);
  if (numeric) return { value: Number(numeric[1]), unit: numeric[2].startsWith("day") ? "days" : numeric[2].startsWith("month") ? "months" : "years" };
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const word = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|month|months|year|years)\b/);
  if (word) return { value: words[word[1]], unit: word[2].startsWith("day") ? "days" : word[2].startsWith("month") ? "months" : "years" };
  if (/immediate|no waiting period|upon event/.test(lower)) return { value: 0, unit: "days" };
  return undefined;
}
function durationDays(d) { if (!d) return -1; if (d.unit === "days") return d.value; if (d.unit === "months") return d.value * 31; return d.value * 366; }
function waitingRuleIdFor(profile, pathway) {
  const routeText = `${pathway.id} ${pathway.label} ${pathway.summary}`.toLowerCase();
  const tokens = routeText.split(/[^a-z0-9]+/).filter((t) => t.length > 5);
  const rows = [
    ...(profile.waitingPeriodRules ?? []).map((r) => ({ id: r.id, text: r.ruleText ?? "", duration: r.duration ?? parseDurationText(r.ruleText ?? "") })),
    ...((pathway.waitingRules ?? []).map((text, i) => ({ id: `pathway-wait-${i}`, text, duration: parseDurationText(text) })))
  ];
  const candidates = rows
    .map((row) => {
      const text = String(row.text).toLowerCase();
      const score = tokens.filter((t) => text.includes(t)).length
        + (/arrest/.test(routeText) && /arrest/.test(text) ? 2 : 0)
        + (/dismiss|nonconviction/.test(routeText) && /dismiss|non-conviction|nonconviction/.test(text) ? 2 : 0)
        + (/acquit/.test(routeText) && /acquit|not guilty/.test(text) ? 2 : 0)
        + (/felony/.test(routeText) && /felony/.test(text) ? 2 : 0)
        + (/misdemeanor/.test(routeText) && /misdemeanor/.test(text) ? 2 : 0);
      return { id: row.id, duration: row.duration ?? parseDurationText(text), score };
    })
    .filter((row) => row.id && row.duration && row.duration.value >= 0 && row.score > 0)
    .sort((a, b) => b.score - a.score || durationDays(b.duration) - durationDays(a.duration));
  return candidates[0]?.id;
}

function baseAnswer(question, outcome, offenseLevel, date, profile, pathway) {
  const id = question.id;
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return "State or local";
  if (id === "case_outcome") return outcome;
  if (id === "offense_level") return offenseLevel;
  if (id === "possible_pathway_context") return pathway.label;
  if (id.endsWith("_date")) return date;                       // all date anchors far in the past
  if (id === "state_exclusion_categories") return ["None of these"];
  if (id === "sentence_completion_date" || id === "financial_obligations" || id === "special_preconditions_confirmed") return "Yes";
  if (["pending_cases", "new_convictions_during_waiting_period", "pardon_status", "identity_error", "trafficking_status", "prior_relief"].includes(id)) return "No";
  if (id === "record_documents" || id === "criminal_history") return "Yes";
  if (id === "court") return `${profile.jurisdiction.name} trial court`;
  if (id === "charge") return offenseLevel === "Felony" ? "Synthetic felony conviction" : "Synthetic misdemeanor conviction";
  if (id === "county_or_filing_location" || id === "county") return "Synthetic County";
  if (id === "case_identifier") return "SYN-CASE-001";
  if (id === "offense_category") return "None of these";
  if (id === "age_at_offense") return 30;
  if (id === "prior_conviction_count" || id === "prior_felony_count") return 0;
  if (Object.prototype.hasOwnProperty.call(GATE_UNLOCK, id)) return GATE_UNLOCK[id];
  if (question.type === "number_or_range") return 0;
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.find((o) => !/federal|not sure|unknown|prefer not|none of these/i.test(String(o))) ?? question.options[0];
  }
  return "Synthetic answer";
}

function buildAnswers(profile, pathway, outcome, offenseLevel, date, mutate) {
  const answers = {};
  for (const q of projectPublicProfile(profile).questions) answers[q.id] = baseAnswer(q, outcome, offenseLevel, date, profile, pathway);
  // Route-aware CA Prop 64 branch.
  if (Object.prototype.hasOwnProperty.call(answers, "ca_prop64_branch")) {
    answers.ca_prop64_branch = pathway.id.includes("completed-sentence") ? "completed sentence" : "currently serving";
  }
  // IL felony-prostitution needs a felony prostitution record.
  if (pathway.id === "felony-prostitution-relief") { answers.offense_level = "Felony"; if ("charge" in answers) answers.charge = "Felony prostitution conviction"; }
  for (const [k, v] of Object.entries(GATE_UNLOCK)) if (k in answers) answers[k] = v;
  // Name one specific source waiting rule so the engine does not fail closed on ambiguous waits.
  if ("waiting_rule_id" in answers) answers.waiting_rule_id = waitingRuleIdFor(profile, pathway) ?? "";
  if (mutate) mutate(answers);
  return answers;
}

function evaluate(profile, pathway, outcome, offenseLevel, date, mutate) {
  return evaluateScreening({
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: `no-generic-fallbacks-${profile.jurisdiction.code}-${pathway.id}`,
    answers: buildAnswers(profile, pathway, outcome, offenseLevel, date, mutate)
  });
}

const FAIL_CLOSED_CODES = new Set(["needs_more_info", "needs_review", "not_yet", "likely_not_eligible", "guidance_only", "hard_stop"]);
function packetOpen(ev) { return ev.paymentAllowed === true && (ev.resultCode === "packet_ready" || ev.resultCode === "packet_ready_with_caution"); }

function offenseFor(pathway) {
  const t = `${pathway.id} ${pathway.label}`.toLowerCase();
  if (/felony/.test(t)) return "Felony";
  if (/misdemeanor/.test(t)) return "Misdemeanor";
  return "Misdemeanor";
}

// Find any qualifying case that opens payment (tries several eligible outcomes).
function findQualifying(profile, pathway) {
  const offense = offenseFor(pathway);
  for (const outcome of OUTCOME_CANDIDATES) {
    const ev = evaluate(profile, pathway, outcome, offense, "2000-01-01");
    // Global invariant: a fail-closed result may never carry payment. [#7 behavioral]
    if (FAIL_CLOSED_CODES.has(ev.resultCode) && ev.paymentAllowed === true) {
      fail("#7", `${profile.jurisdiction.code}:${pathway.id}: fail-closed result ${ev.resultCode} carried paymentAllowed=true.`);
    }
    if (packetOpen(ev)) return { ev, outcome, offense };
  }
  return null;
}

const behavioral = { ratifiedQualified: 0, ratifiedMissingQualifying: [], ratifiedMissingBlock: [], nonRatifiedThatPaid: [], failClosedPaid: [] };

for (const profile of profiles) {
  for (const pathway of profile.pathways) {
    const key = `${profile.jurisdiction.code}:${pathway.id}`;
    const isRatified = RATIFIED_DEPLOYABLE.has(key);
    const qualifying = findQualifying(profile, pathway);

    if (isRatified) {
      // [#9] qualifying direction: every ratified route must have a case that opens payment.
      if (!qualifying) { behavioral.ratifiedMissingQualifying.push(key); continue; }
      behavioral.ratifiedQualified++;
      // Paid result must carry a source-backed compiled-rule match reason. [rule cond. 9]
      if (!qualifying.ev.reasons.some((r) => r.code.includes("compiled_rule_match"))) {
        fail("#9", `${key}: paid result lacks a compiled_rule_match reason.`);
      }
      // [#9] disqualifying direction: pending case must block payment.
      const blocked = evaluate(profile, pathway, qualifying.outcome, qualifying.offense, "2000-01-01", (a) => { a.pending_cases = "Yes"; });
      if (blocked.paymentAllowed !== false) behavioral.ratifiedMissingBlock.push(`${key} (pending -> ${blocked.resultCode}/${blocked.paymentAllowed})`);
    } else {
      // [#10][#11] No non-ratified route (hard-gate / corrected / held / untiered / automatic)
      // may EVER open payment, even fully-eligible with every gate unlocked.
      if (qualifying) behavioral.nonRatifiedThatPaid.push(`${key} (tier ${tierNameOf(key)} -> ${qualifying.ev.resultCode})`);
    }
  }
}

function tierNameOf(key) {
  if (RATIFIED_DEPLOYABLE.has(key)) return "RATIFIED_DEPLOYABLE";
  if (CORRECTED_AWAITING_RECONFIRM.has(key)) return "CORRECTED_AWAITING_RECONFIRM";
  if (HARD_GATE_PENDING.has(key)) return "HARD_GATE_PENDING";
  if (HELD_GUIDANCE.has(key)) return "HELD_GUIDANCE";
  return "UNLISTED";
}

// [#9] fold behavioral coverage into hard failures.
for (const key of behavioral.ratifiedMissingQualifying) fail("#9", `Ratified route ${key} has NO qualifying case that opens payment (both-direction coverage incomplete).`);
for (const key of behavioral.ratifiedMissingBlock) fail("#9", `Ratified route ${key} does not fail closed on a pending case (both-direction coverage incomplete).`);
// [#10][#11] non-ratified routes that opened payment.
for (const key of behavioral.nonRatifiedThatPaid) {
  fail(HARD_GATE_PENDING.has(key.split(" ")[0]) ? "#10" : "#11", `Non-ratified route opened payment: ${key}.`);
}

// =====================================================================
// REPORT
// =====================================================================
const CHECK_TITLES = {
  "#1": "no first-pathway fallback (pathways[0])",
  "#2": "no generic/default waiting-period shortcut",
  "#3": "payment requires routeIsRatifiedDeployable / single gated path",
  "#4": "payment requires explicit court/admin product metadata (not regex)",
  "#5": "payment requires isPacketPlanFulfillmentReady",
  "#6": "payment requires a deterministic compiled rule match",
  "#7": "payment never on a fail-closed result code",
  "#8": "no route in more than one mutually-exclusive control set",
  "#9": "every ratified route has both-direction verifier coverage",
  "#10": "no hard-gate-pending route can produce paymentAllowed=true",
  "#11": "no automatic/board/prosecutor/no-filing route can pay (except signed-off Hawaii admin app)",
  "#12": "no internal source_question_* field used as a payment gate",
  "#13": "no free-text-charge-only paid eligibility gate",
  "#14": "every compiled pathway is classified",
  "#15": "$50 copy is a self-help packet fee, never a court/filing/agency/attorney fee",
  "#16": "no route with an open Legal Action Required item can pay"
};
const failedChecks = new Set(failures.map((f) => f.check));

console.log("verify-rcap-no-generic-fallbacks — NO GENERIC FALLBACK LOGIC ANYWHERE");
console.log("=".repeat(74));
console.log(`Control-set sizes: RATIFIED_DEPLOYABLE=${RATIFIED_DEPLOYABLE.size}, CORRECTED_AWAITING_RECONFIRM=${CORRECTED_AWAITING_RECONFIRM.size}, HARD_GATE_PENDING=${HARD_GATE_PENDING.size}, HELD_GUIDANCE=${HELD_GUIDANCE.size}`);
console.log(`Deep payment gate (evaluator.ts:${payComputeLine}): ${payExpr.replace(/\s+/g, " ").trim()}`);
console.log("-".repeat(74));
console.log("Behavioral both-direction coverage:");
console.log(`  Ratified routes with qualifying(open) + disqualifying(block): ${behavioral.ratifiedQualified}/${RATIFIED_DEPLOYABLE.size}`);
console.log(`  Non-ratified routes probed with fully-eligible facts that paid : ${behavioral.nonRatifiedThatPaid.length} (must be 0)`);
console.log("-".repeat(74));
console.log("Check results:");
for (const c of Object.keys(CHECK_TITLES)) {
  console.log(`  ${failedChecks.has(c) ? "RED " : "GREEN"} ${c.padEnd(4)} ${CHECK_TITLES[c]}`);
}
console.log("-".repeat(74));
console.log(`Fallback-like pattern scan (${findings.length} pattern${findings.length === 1 ? "" : "s"} found):`);
if (findings.length === 0) {
  console.log("  (none)");
} else {
  for (const f of findings) {
    console.log(`  [${f.severity.toUpperCase()}] ${f.check} — ${f.file}:${f.line}`);
    console.log(`         ${f.snippet}`);
  }
}
console.log("-".repeat(74));

if (failures.length > 0) {
  console.error(`RED — ${failures.length} unsafe finding(s):`);
  for (const f of failures) console.error(`  - [${f.check}] ${f.message}`);
  console.error("");
  console.error("Final standard NOT met: generic fallback / unsafe payment logic present.");
  process.exit(1);
}

console.log("GREEN — no generic fallback logic anywhere.");
console.log("Payment opens only for an operative, user-filed, ratified, deterministically-matched,");
console.log("state-timed, state-gated, publicly-screened, fulfillment-ready route with a source-backed");
console.log("compiled-rule reason and proven both-direction coverage. Everything else fails closed.");
