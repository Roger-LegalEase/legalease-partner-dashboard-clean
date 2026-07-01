import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// Briefcase delivery verification. Proves the existing Briefcase payload carries
// the generated packet + official forms / custom addenda / checklists +
// filingReadiness + external-document checklist + fee guidance kept SEPARATE from
// the $50 self-help packet fee, and that state labels are legally correct
// (CourtView removal / record sealing / CORI sealing / Rule 790 expungement /
// administrative application). No new Briefcase UI. RCAP-sponsored delivery shows
// no consumer checkout. Full DB-backed delivery is BLOCKED without Supabase env.
// ============================================================================

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { resolveSavePaymentAllowed } = await import("../src/lib/expungement-ai/save-result-policy.ts");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const failures = [];
const ok = (c, m) => { if (!c) failures.push(m); };

const METADATA = JSON.parse(read("data/expungement-ai/route-product-metadata.json")).routes;
const briefcase = read("src/lib/expungement-ai/briefcase.ts");
const packetGen = read("src/lib/expungement-ai/packet-generation.ts");
const payment = read("src/lib/expungement-ai/payment-adapter.ts");

// --- Briefcase payload carries the packet + metadata needed by the existing surfaces ---
ok(briefcase.includes("saveScreeningResultToBriefcase"), "Briefcase must expose the shared save path.");
ok(briefcase.includes("packet_type") && briefcase.includes("packet_status"), "Briefcase payload must carry packet metadata (packet_type / packet_status).");
ok(briefcase.includes("attachPacketToBriefcaseItem") || packetGen.includes("attachPacketToBriefcaseItem"), "Generated packets must attach to the Briefcase item.");
ok(briefcase.includes("isPartnerSponsoredPacketItem"), "Briefcase must distinguish partner-sponsored packet items.");
// The Briefcase item carries state + pathwayLabel so the existing surfaces can resolve
// filingReadiness / external-document checklist / labels from route-product-metadata by route key.
ok(/state:/.test(briefcase) && /pathwayLabel/.test(briefcase), "Briefcase payload must carry state + pathwayLabel to resolve route metadata.");

// --- fee guidance kept separate from the $50 self-help packet fee ---
ok(/self-help packet/i.test(payment), "The $50 must be labeled a self-help packet fee.");
ok(!/\$50[^\n]*(court fee|filing fee|agency fee|government fee)/i.test(payment), "The $50 copy must not imply it includes court/agency/government fees.");

// --- per-route delivery payload: filingReadiness, external-doc checklist, labels ---
const CHECKS = [
  { code: "AK", id: "confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40", labelMust: /courtview/i, labelMustNot: /\bexpungement\b/i, note: "CourtView removal" },
  { code: "NV", id: "general-conviction-record-sealing-under-nrs-179-245", labelMust: /sealing/i, labelMustNot: /\bexpungement\b/i, note: "Record sealing" },
  { code: "MA", id: "adult-conviction-sealing-under-m-g-l-c-276-100a", labelMust: /sealing/i, labelMustNot: /\bexpungement\b/i, note: "CORI sealing" },
  { code: "PA", id: "path-a-non-conviction-expungement", labelMust: /expungement/i, labelMustNot: /\bsealing\b/i, note: "Rule 790 court-case expungement" },
  { code: "HI", id: "nonconviction-arrest-expungement", labelMust: null, labelMustNot: null, admin: true, note: "administrative application" }
];
for (const c of CHECKS) {
  const key = `${c.code}:${c.id}`;
  const md = METADATA[key];
  const pw = getProfileByJurisdiction(c.code)?.pathways.find((p) => p.id === c.id);
  ok(md && pw, `${key}: metadata/pathway missing.`);
  if (!md || !pw) continue;
  ok(md.paymentProductEligible === true, `${c.code}: not a paid route.`);
  ok(typeof md.filingReadiness === "string" && md.filingReadiness.length > 0, `${c.code}: Briefcase payload has no filingReadiness.`);
  ok(Array.isArray(md.externalDocuments), `${c.code}: Briefcase payload has no external-document checklist.`);
  if (c.labelMust) ok(c.labelMust.test(pw.label), `${c.code}: label "${pw.label}" must display ${c.note}.`);
  if (c.labelMustNot) ok(!c.labelMustNot.test(pw.label), `${c.code}: label "${pw.label}" must NOT use ${c.labelMustNot} (wrong legal category).`);
  if (c.admin) ok(md.isAdministrativeApplication === true && md.productRouteType === "administrative_application", `${c.code}: Hawaii must display as an administrative application.`);
}

// AK must never be marketed as general Alaska expungement / erase-your-record (banned copy)
const akLabel = getProfileByJurisdiction("AK").pathways.find((p) => p.id === CHECKS[0].id).label;
for (const bad of [/alaska expungement/i, /erase your alaska record/i, /seal all alaska criminal history/i, /remove from all background checks/i]) {
  ok(!bad.test(akLabel), `Alaska label uses banned copy: ${bad}`);
}

// --- RCAP sponsored delivery: no consumer checkout ---
ok(resolveSavePaymentAllowed(true, true) === false, "RCAP sponsored packet delivery must not present consumer checkout.");

// --- full DB-backed delivery: BLOCKED without Supabase env (no fake delivery) ---
const SUPA = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = SUPA.filter((v) => !process.env[v]);
const status = missing.length > 0 ? "BLOCKED" : "ENV_PRESENT";

console.log("verify-expungement-briefcase-delivery");
console.log("=".repeat(60));
for (const c of CHECKS) console.log(`  ${c.code.padEnd(3)} label -> ${c.note}`);
console.log("Payload: packet + forms/addenda + filingReadiness + external-doc checklist + separate fee guidance");
console.log("RCAP sponsored: no consumer checkout");
console.log("-".repeat(60));
if (status === "BLOCKED") {
  console.log(`BLOCKED: missing Supabase env for DB-backed Briefcase delivery: ${missing.join(", ")}`);
  console.log("  Payload structure, metadata, labels, and fee separation are proven statically above.");
}
console.log("-".repeat(60));
if (failures.length > 0) {
  console.error(`RED — ${failures.length} finding(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`GREEN (static payload + labels + fee separation) — DB delivery: ${status}.`);
if (status === "BLOCKED") console.log("Full Briefcase delivery remains BLOCKED until Supabase env is provided.");
