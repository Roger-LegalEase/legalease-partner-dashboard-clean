import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// All-51 front-end integration proof: every jurisdiction (incl. the Final Five)
// plugs into the EXISTING Expungement.ai / RCAP surfaces — no new intake page,
// no state wizard, no duplicate Briefcase/checkout/result UI, no state fork.
// Static source + compiled-profile + pure-policy proof (no runtime env needed).
// ============================================================================

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { resolveSavePaymentAllowed } = await import("../src/lib/expungement-ai/save-result-policy.ts");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const failures = [];
const ok = (c, m) => { if (!c) failures.push(m); };

const METADATA = JSON.parse(read("data/expungement-ai/route-product-metadata.json")).routes;
const statePicker = read("src/components/expungement-ai/screening/StatePicker.tsx");
const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const resultPanel = read("src/components/expungement-ai/ResultPanel.tsx");
const briefcase = read("src/lib/expungement-ai/briefcase.ts");
const payment = read("src/lib/expungement-ai/payment-adapter.ts");
const savePolicy = read("src/lib/expungement-ai/save-result-policy.ts");

// [1] all 51 jurisdictions selectable through the existing source-engine list
const profiles = getAllJurisdictionProfiles();
ok(profiles.length === 51, `Expected 51 selectable jurisdictions, found ${profiles.length}.`);
const codes = profiles.map((p) => p.jurisdiction.code);
for (const c of ["AK", "DE", "MA", "NV", "PA", "HI"]) ok(codes.includes(c), `Jurisdiction ${c} missing from the selectable source-engine list.`);

// [2] all states enter the ONE existing dynamic screening route pattern (no per-state pages)
ok(statePicker.includes("href={`/expungement-ai/screening/${jurisdiction.code}`}"), "StatePicker must route every state into the shared /screening/[state] route.");
ok(exists("src/app/expungement-ai/screening/[state]/page.tsx"), "Shared dynamic screening route [state] must exist.");

// [3] public questions come from the existing profile/question system (derived, not hardcoded in React)
ok(screeningFlow.includes("deriveScreens(load.profile)"), "ScreeningFlow must derive questions from the profile system.");
ok(!/const\s+\w*[Qq]uestions\s*=\s*\[/.test(screeningFlow), "ScreeningFlow must not hardcode a question array.");

// [4][12] no Final Five state added a standalone intake page / state fork
for (const st of ["ak", "de", "ma", "nv", "pa", "alaska", "delaware", "massachusetts", "nevada", "pennsylvania"]) {
  for (const p of [`src/app/expungement-ai/${st}`, `src/app/expungement-ai/screening/${st}`, `src/components/expungement-ai/${st}`, `src/app/expungement-ai/check/${st}`]) {
    ok(!exists(p), `State-specific front-end fork must not exist: ${p}`);
  }
}
// screening route dir must contain only the shared dynamic [state] route (no per-state siblings)
const screeningDir = path.join(ROOT, "src/app/expungement-ai/screening");
if (fs.existsSync(screeningDir)) {
  const stateForks = fs.readdirSync(screeningDir).filter((e) => e !== "[state]" && !e.startsWith(".") && fs.statSync(path.join(screeningDir, e)).isDirectory() && !["resume"].includes(e));
  ok(stateForks.length === 0, `Only the shared [state] screening route (and resume) is allowed; found extra: ${stateForks.join(", ")}`);
}

// [5] single checkout route (no per-state duplicate)
ok(exists("src/app/api/expungement-ai/checkout/route.ts"), "The shared consumer checkout route must exist.");
const checkoutForks = fs.existsSync(path.join(ROOT, "src/app/api/expungement-ai/checkout"))
  ? fs.readdirSync(path.join(ROOT, "src/app/api/expungement-ai/checkout")).filter((e) => /^(ak|de|ma|nv|pa|[a-z]{2})-/.test(e))
  : [];
ok(checkoutForks.length === 0, `No state-specific checkout route may exist; found: ${checkoutForks.join(", ")}`);

// [6] single Briefcase UI (no per-state duplicate component)
const briefcaseComponents = fs.existsSync(path.join(ROOT, "src/components/expungement-ai"))
  ? fs.readdirSync(path.join(ROOT, "src/components/expungement-ai")).filter((e) => /briefcase/i.test(e) && /(ak|de|ma|nv|pa|alaska|delaware|massachusetts|nevada|pennsylvania)/i.test(e))
  : [];
ok(briefcaseComponents.length === 0, `No state-specific Briefcase UI may exist; found: ${briefcaseComponents.join(", ")}`);

// [7][8] paid results use the existing pay gate; non-payment results never show checkout
ok(resultPanel.includes('result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")'), "ResultPanel pay gate must require paymentAllowed + packet-ready.");
ok(resultPanel.includes('data-consumer-pay-gate="hidden"'), "ResultPanel must hide the pay gate for non-payment results.");

// [9] partner-sponsored flows suppress consumer checkout (real pure policy)
ok(savePolicy.includes("resolveSavePaymentAllowed"), "save-result-policy must expose the partner-sponsored suppression.");
ok(resolveSavePaymentAllowed(true, true) === false, "RCAP partner-sponsored session must force paymentAllowed=false (no consumer checkout).");
ok(resolveSavePaymentAllowed(false, true) === true, "Non-partner consumer session must preserve engine paymentAllowed.");

// [10] generated packets route to the existing Briefcase payload
ok(briefcase.includes("saveScreeningResultToBriefcase") && briefcase.includes("createBriefcaseItem"), "Briefcase must expose the shared save/create payload path.");
ok(briefcase.includes("packet_type") && briefcase.includes("packet_status"), "Briefcase payload must carry packet metadata (packet_type / packet_status).");

// [11] filingReadiness + external-document checklist available for the existing ResultPanel/Briefcase to consume
for (const key of Object.keys(METADATA)) {
  const m = METADATA[key];
  if (m.paymentProductEligible === true) {
    ok(typeof m.filingReadiness === "string" && m.filingReadiness.length > 0, `Paid route ${key} lacks filingReadiness for the result/Briefcase surfaces.`);
    ok(Array.isArray(m.externalDocuments), `Paid route ${key} lacks an external-document checklist array.`);
    ok(m.checkoutEligibility === "eligible", `Paid route ${key} checkoutEligibility must be eligible.`);
  }
}

// $50 copy stays a self-help packet fee (existing pay gate copy)
ok(/self-help packet/i.test(payment) || /self-help packet/i.test(resultPanel), "Consumer pay-gate copy must describe the $50 as a self-help packet fee.");

console.log("verify-expungement-all51-frontend-integration");
console.log("=".repeat(62));
console.log(`Selectable jurisdictions (source engine): ${profiles.length}/51`);
console.log("Shared surfaces: StatePicker · /screening/[state] · ScreeningFlow · ResultPanel · pay gate · Briefcase");
console.log("Partner-sponsored suppression: resolveSavePaymentAllowed(partner=true) -> paymentAllowed=false");
console.log(`Paid routes with filingReadiness + external-doc checklist: ${Object.values(METADATA).filter((m) => m.paymentProductEligible).length}`);
console.log("-".repeat(62));
if (failures.length > 0) {
  console.error(`RED — ${failures.length} finding(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("GREEN — all 51 jurisdictions use the existing front-end; no new intake/checkout/Briefcase UI, no state fork.");
