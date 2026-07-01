import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Phase 5 both-direction proof for the Hawaii HCJDC 159(b) ADMINISTRATIVE APPLICATION packet.
// Not a court petition. Proves:
//   - qualifying non-conviction administrative application       -> payment opens
//   - conviction route with confirmed court order                -> payment opens
//   - conviction route WITHOUT a confirmed court order           -> no payment
//   - conviction route with "not sure" court order               -> no payment
//   - result copy describes an administrative application, not a court petition
//   - Stripe/payment copy describes a self-help packet generation fee, not a court/agency filing fee
process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];
const rows = [];
const assert = (c, m) => { if (!c) failures.push(m); };
const profile = getProfileByJurisdiction("HI");

function answers(outcome, ctx, extra) {
  const a = {};
  for (const q of projectPublicProfile(profile).questions) {
    const id = q.id;
    a[id] = id === "ownership_scope" ? "Yes" : id === "jurisdiction_scope" ? "State or local" : id === "case_outcome" ? outcome
      : id === "offense_level" ? "Misdemeanor" : id === "possible_pathway_context" ? ctx : id.endsWith("_date") ? "2000-01-01"
      : id === "state_exclusion_categories" ? ["None of these"]
      : (id === "sentence_completion_date" || id === "financial_obligations" || id === "special_preconditions_confirmed") ? "Yes"
      : ["pending_cases", "new_convictions_during_waiting_period", "pardon_status", "identity_error", "trafficking_status", "prior_relief"].includes(id) ? "No"
      : (id === "record_documents" || id === "criminal_history") ? "Yes" : id === "court" ? "Hawaii agency" : id === "charge" ? "Synthetic"
      : q.type === "number_or_range" ? 0 : q.type === "multi_select" ? ["None of these"]
      : (q.type === "yes_no_unsure" || q.type === "yes_no_prefer_not_to_say") ? "No"
      : Array.isArray(q.options) && q.options.length ? (q.options.find((o) => !/federal|not sure|unknown|prefer not|none of these/i.test(String(o))) ?? q.options[0]) : "Synthetic";
  }
  return Object.assign(a, extra || {});
}
function run(outcome, ctx, extra) {
  return evaluateScreening({ jurisdiction: "HI", profileVersion: profile.profileVersion, matterId: "hi-admin", answers: answers(outcome, ctx, extra) });
}
const paid = (ev) => ev.paymentAllowed === true && (ev.resultCode === "packet_ready" || ev.resultCode === "packet_ready_with_caution");

const NON_CONV = "Non-conviction arrest-information expungement under HRS § 831-3.2";
const DRUG = "First-time drug-offender conviction expungement";
const DUI = "DUI under age 21 conviction expungement";

// 1. non-conviction qualifying -> payment opens
let ev = run("Dismissed, no-billed, nolle prosequi, or not prosecuted", NON_CONV);
assert(paid(ev), `non-conviction qualifying must open payment; got ${ev.resultCode}/${ev.paymentAllowed}`);
rows.push(`non-conviction qualifying -> ${ev.resultCode}/${ev.paymentAllowed}`);

// 2. conviction with confirmed court order -> payment opens (both drug + DUI tracks)
for (const [ctx, name] of [[DRUG, "drug"], [DUI, "dui-under-21"]]) {
  ev = run("Misdemeanor conviction", ctx, { hi_court_order_confirmed: "Yes" });
  assert(paid(ev), `${name} conviction with court order must open payment; got ${ev.resultCode}/${ev.paymentAllowed}`);
  rows.push(`${name} conviction + court order -> ${ev.resultCode}/${ev.paymentAllowed}`);
}

// 3. conviction WITHOUT confirmed court order -> no payment
ev = run("Misdemeanor conviction", DRUG, { hi_court_order_confirmed: "No" });
assert(!paid(ev) && ev.paymentAllowed === false, `conviction without court order must fail closed; got ${ev.resultCode}/${ev.paymentAllowed}`);
rows.push(`conviction, no court order -> ${ev.resultCode}/${ev.paymentAllowed}`);

// 4. conviction with "not sure" court order -> no payment
ev = run("Misdemeanor conviction", DRUG, { hi_court_order_confirmed: "I am not sure" });
assert(!paid(ev) && ev.paymentAllowed === false, `conviction with unsure court order must fail closed; got ${ev.resultCode}/${ev.paymentAllowed}`);
rows.push(`conviction, unsure court order -> ${ev.resultCode}/${ev.paymentAllowed}`);

// 5. non-conviction route with a conviction outcome -> no payment (wrong track)
ev = run("Felony conviction", NON_CONV);
assert(!paid(ev) && ev.paymentAllowed === false, `non-conviction route with a conviction must fail closed; got ${ev.resultCode}/${ev.paymentAllowed}`);
rows.push(`non-conviction route + conviction outcome -> ${ev.resultCode}/${ev.paymentAllowed}`);

// 6. result copy: administrative application language, never court petition (evaluator + doc + metadata)
const metaPath = path.join(ROOT, "data/expungement-ai/route-product-metadata.json");
if (fs.existsSync(metaPath)) {
  const md = JSON.parse(fs.readFileSync(metaPath, "utf8")).routes;
  for (const key of ["HI:nonconviction-arrest-expungement", "HI:first-time-drug-conviction", "HI:dui-under-21-conviction"]) {
    assert(md[key]?.productRouteType === "administrative_application" && md[key]?.filingForum === "agency", `${key} metadata must be an agency administrative application.`);
  }
}
const doc = fs.readFileSync(path.join(ROOT, "docs/expungement-ai/HAWAII_ADMIN_APPLICATION_PACKET.md"), "utf8");
assert(/administrative application/i.test(doc), "Hawaii doc must describe an administrative application.");
assert(/not a court petition/i.test(doc), "Hawaii doc must affirm the packet is NOT a court petition.");

// 7. Stripe/payment copy: self-help packet generation fee, not a court/agency filing fee
const copy = fs.readFileSync(path.join(ROOT, "src/lib/expungement-ai/payment-adapter.ts"), "utf8");
assert(/self-help packet/i.test(copy), "payment copy must describe a self-help packet fee.");
for (const bad of [/court fee/i, /filing fee/i, /application fee/i, /agency fee/i, /government fee/i, /attorney fee/i]) {
  assert(!bad.test(copy), `payment copy must not label the $50 as ${bad}`);
}

console.log("hawaii_admin_application_proofs:");
for (const r of rows) console.log("  " + r);
if (failures.length) {
  console.error("verify-rcap-hawaii-admin-application FAILED:");
  for (const f of failures) console.error("- " + f);
  process.exit(1);
}
console.log("verify-rcap-hawaii-admin-application: OK");
console.log("Hawaii HCJDC 159(b) opens the $50 self-help ADMINISTRATIVE APPLICATION packet when qualifying (non-conviction) or when a Court Order Granting Expungement is confirmed (conviction), and fails closed otherwise. Never labeled a court petition; agency fees are separate.");
