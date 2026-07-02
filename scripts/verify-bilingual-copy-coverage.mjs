// Verifies critical bilingual copy coverage for visible payment/result/route/readiness labels.
// This is static and read-only; it does not run Stripe, deploy, or alter eligibility/payment logic.

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const { CRITICAL_COPY_CATALOG, ROUTE_LABEL_COPY, PAYMENT_GATE_COPY, RESULT_COPY, EXTERNAL_DOCUMENT_COPY, NO_PAYMENT_COPY } =
  await import("../src/lib/expungement-ai/plain-language-copy.ts");

const errors = [];
const notes = [];

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function clean(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function hasEnEs(entry) {
  return clean(entry.en) && clean(entry.es);
}

for (const entry of CRITICAL_COPY_CATALOG) {
  assert(hasEnEs(entry), `Missing English/Spanish critical copy for ${entry.id}`);
}

for (const entry of ROUTE_LABEL_COPY) {
  assert(hasEnEs(entry), `Visible route label missing bilingual entry: ${entry.id}`);
}

for (const entry of PAYMENT_GATE_COPY) {
  assert(hasEnEs(entry), `Payment-gate string missing bilingual entry: ${entry.id}`);
}

for (const entry of RESULT_COPY) {
  assert(hasEnEs(entry), `Result string missing bilingual entry: ${entry.id}`);
}

for (const entry of NO_PAYMENT_COPY) {
  assert(hasEnEs(entry), `No-payment result string missing bilingual entry: ${entry.id}`);
}

for (const entry of EXTERNAL_DOCUMENT_COPY) {
  assert(hasEnEs(entry), `External-document checklist string missing bilingual entry: ${entry.id}`);
}

const requiredStateLabels = [
  ["route.ak.courtview_removal", "CourtView Removal"],
  ["route.nv.record_sealing", "Record Sealing"],
  ["route.ma.cori_sealing", "CORI Sealing"],
  ["route.ma.dismissed_case_sealing", "Dismissed Case Sealing"],
  ["route.ma.marijuana_expungement", "Marijuana Expungement"],
  ["route.pa.court_case_expungement", "Court Case Expungement"],
  ["route.pa.summary_expungement", "Summary Expungement"],
  ["route.pa.limited_access", "Limited Access / Sealing"],
  ["route.hi.admin_application", "Administrative Application"],
  ["route.de.discretionary_expungement", "Discretionary Expungement Packet"]
];

for (const [id, label] of requiredStateLabels) {
  const entry = ROUTE_LABEL_COPY.find((item) => item.id === id);
  assert(entry, `Missing required state label ${id}`);
  assert(entry?.en === label, `Required state label ${id} changed unexpectedly`);
  assert(clean(entry?.es), `Required state label ${id} missing Spanish`);
}

const criticalSpanishFallbacks = CRITICAL_COPY_CATALOG.filter((entry) => clean(entry.es).toLowerCase() === clean(entry.en).toLowerCase());
assert(criticalSpanishFallbacks.length === 0, `Spanish critical labels fall back to English: ${criticalSpanishFallbacks.map((entry) => entry.id).join(", ")}`);

const paymentText = PAYMENT_GATE_COPY.map((entry) => entry.en).join(" ").toLowerCase();
assert(paymentText.includes("self-help packet"), "Payment copy must say self-help packet generation.");
assert(paymentText.includes("court") && paymentText.includes("separate"), "Payment copy must say court/agency/background-report fees are separate.");
assert(!/court fee|government fee|legal fee/.test(paymentText), "Payment copy must not frame the $50 as a court/legal/government fee.");

const prohibitedGuarantees = /\b(guaranteed eligible|you qualify|will clear|will seal|will expunge|erase your record|remove from all background checks)\b/i;
for (const entry of [...PAYMENT_GATE_COPY, ...RESULT_COPY, ...NO_PAYMENT_COPY]) {
  assert(!prohibitedGuarantees.test(entry.en), `Prohibited guarantee language in ${entry.id}: ${entry.en}`);
}

assert(!ROUTE_LABEL_COPY.find((entry) => entry.id.startsWith("route.ak.") && /expungement/i.test(entry.en)), "Alaska label must not use generic expungement.");
assert(!ROUTE_LABEL_COPY.find((entry) => entry.id.startsWith("route.nv.") && /expungement/i.test(entry.en)), "Nevada label must not use expungement.");
assert(!ROUTE_LABEL_COPY.find((entry) => entry.id === "route.ma.cori_sealing" && /expungement/i.test(entry.en)), "Massachusetts CORI sealing label must not use generic expungement.");

const resultSource = fs.readFileSync(path.join(ROOT, "src/components/expungement-ai/screening/ScreeningResult.tsx"), "utf8");
assert(resultSource.includes("routeLabelKeyForState"), "ScreeningResult must use state-specific route labels.");
assert(resultSource.includes("Generate my packet - $50"), "ScreeningResult payment CTA must use DTC packet copy.");

const checkoutSource = fs.readFileSync(path.join(ROOT, "src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"), "utf8");
assert(checkoutSource.includes("Generate my packet - $50"), "Checkout button must use DTC packet copy.");

const newUiPatterns = [
  "src/app/expungement-ai/new-intake",
  "src/app/expungement-ai/new-checkout",
  "src/app/briefcase/new"
];
for (const rel of newUiPatterns) {
  assert(!fs.existsSync(path.join(ROOT, rel)), `New UI path was created: ${rel}`);
}

function fileIncludes(rel, snippets) {
  const source = fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "";
  return snippets.every((snippet) => source.includes(snippet));
}

const architectureChecks = {
  providerInstalled: fileIncludes("src/app/layout.tsx", ["LocalizationProvider"]),
  screeningQuestionsLocalized: fileIncludes("src/components/expungement-ai/screening/QuestionField.tsx", ["localizeProfileText", "useLocalization"]),
  answerChoicesLocalized: fileIncludes("src/components/expungement-ai/screening/fields/OptionGroup.tsx", ["localizeProfileText", "runtimeCopyKeyForText"]),
  resultEngineTextLocalized: fileIncludes("src/components/expungement-ai/screening/ScreeningResult.tsx", ["safeUserFacingEngineText(reason.text, { locale })", "routeLabelKeyForState"]),
  paymentCopyLocalized: fileIncludes("src/app/expungement-ai/pay/page.tsx", ["LocalizedText", "payment.title"])
    && fileIncludes("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx", ["useLocalization", "payment.generate_packet"]),
  briefcaseCopyLocalized: fileIncludes("src/components/expungement-ai/BriefcaseViews.tsx", ["LocalizedRuntimeText", "LocalizedText"]),
  packetReadyCopyLocalized: fileIncludes("src/app/expungement-ai/packet-ready/page.tsx", ["LocalizedRuntimeText", "LocalizedText"]),
  wilmaLocalePayload: fileIncludes("src/components/expungement-ai/WilmaBubble.tsx", ["requestBody.locale = locale", "useLocalization"]),
  wilmaServerLocale: fileIncludes("src/app/api/expungement-ai/wilma/chat/route.ts", ["normalizeLocale", "locale"])
    && fileIncludes("src/app/api/expungement-ai/wilma/public-chat/route.ts", ["normalizeLocale", "locale"]),
  missingFieldLocalization: fileIncludes("src/lib/expungement-ai/missing-fields.ts", ["resolveRuntimeText", "Locale"])
};

for (const [check, ok] of Object.entries(architectureChecks)) {
  assert(ok, `Runtime localization architecture check failed: ${check}`);
}

notes.push("Existing consumer adapter and all51 front-end integration are verified by their dedicated npm scripts in the required check sequence.");
notes.push("Existing RCAP partner flow and Briefcase runtime structure were not changed; this verifier checks critical copy surfaces only.");

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors, notes }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  criticalStrings: CRITICAL_COPY_CATALOG.length,
  routeLabels: ROUTE_LABEL_COPY.length,
  paymentStrings: PAYMENT_GATE_COPY.length,
  externalDocumentStrings: EXTERNAL_DOCUMENT_COPY.length,
  architectureChecks,
  notes
}, null, 2));
