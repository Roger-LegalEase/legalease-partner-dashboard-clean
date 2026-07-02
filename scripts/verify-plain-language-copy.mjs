// Static plain-language verifier for critical Expungement.ai / RCAP copy.
// Broad profile legalese is reported by the audit. This verifier fails only on critical
// checkout/result/route copy that would be unsafe to ship.

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "data/expungement-ai/reports/plain-language-copy-audit.json");
const { CRITICAL_COPY_CATALOG, PAYMENT_GATE_COPY, RESULT_COPY, ROUTE_LABEL_COPY } =
  await import("../src/lib/expungement-ai/plain-language-copy.ts");

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function clean(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

const bannedLegalese = [
  "eligibility determination",
  "pursuant to",
  "petitioning party",
  "movant",
  "aforementioned",
  "hereby",
  "court-ready"
];

const guaranteeWords = [
  "guaranteed eligible",
  "you qualify",
  "will clear",
  "will seal",
  "will expunge",
  "erase your record",
  "remove from all background checks"
];

const consumerTechnicalLeaks = [
  "date anchor",
  "source review",
  "packet decision",
  "safely executable",
  "evaluator",
  "engine decides",
  "rule diagnostic",
  "diagnostic",
  "qualify",
  "approved",
  "guaranteed"
];

for (const entry of CRITICAL_COPY_CATALOG) {
  const text = clean(entry.en).toLowerCase();
  for (const phrase of bannedLegalese) {
    assert(!text.includes(phrase), `Banned legalese appears in critical copy ${entry.id}: ${phrase}`);
  }
  for (const phrase of guaranteeWords) {
    assert(!text.includes(phrase), `Guarantee phrase appears in critical copy ${entry.id}: ${phrase}`);
  }
  for (const phrase of consumerTechnicalLeaks) {
    assert(!text.includes(phrase), `Consumer technical/prohibited copy appears in critical copy ${entry.id}: ${phrase}`);
  }
  if (entry.surface === "wilma_question") {
    assert(clean(entry.en).length <= 150, `Question text too long in critical copy ${entry.id}`);
  }
  assert(clean(entry.es), `Critical copy missing Spanish: ${entry.id}`);
}

const paymentCopy = PAYMENT_GATE_COPY.map((entry) => entry.en).join(" ");
assert(/self-help packet/i.test(paymentCopy), "Payment copy must mention self-help packet.");
assert(/\$50 covers Expungement\.ai packet generation/i.test(paymentCopy), "Payment copy must describe the $50 as Expungement.ai packet generation.");
assert(/fees are separate/i.test(paymentCopy), "Payment copy must state court/agency/background-report fees are separate.");

for (const entry of RESULT_COPY) {
  assert(!/you are eligible|you may be eligible/i.test(entry.en), `Result copy must avoid eligibility promise wording: ${entry.id}`);
}

const stateLabelText = ROUTE_LABEL_COPY.map((entry) => `${entry.id}: ${entry.en}`).join("\n");
assert(/route\.ak\.courtview_removal: CourtView Removal/.test(stateLabelText), "Alaska must use CourtView Removal.");
assert(/route\.nv\.record_sealing: Record Sealing/.test(stateLabelText), "Nevada must use Record Sealing.");
assert(/route\.ma\.cori_sealing: CORI Sealing/.test(stateLabelText), "Massachusetts must use CORI Sealing where applicable.");
assert(/route\.hi\.admin_application: Administrative Application/.test(stateLabelText), "Hawaii must use Administrative Application.");

const checkedFiles = [
  "src/components/expungement-ai/screening/ScreeningResult.tsx",
  "src/components/expungement-ai/ResultPanel.tsx",
  "src/app/expungement-ai/pay/page.tsx",
  "src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx"
];

for (const rel of checkedFiles) {
  const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const phrase of guaranteeWords) {
    assert(!source.toLowerCase().includes(phrase), `${rel} includes guarantee phrase: ${phrase}`);
  }
  for (const phrase of consumerTechnicalLeaks) {
    assert(!source.toLowerCase().includes(phrase), `${rel} includes consumer technical/prohibited phrase: ${phrase}`);
  }
  if (/court-ready/i.test(source)) warn(`${rel} includes court-ready language; confirm it is not visible payment/result copy.`);
}

if (fs.existsSync(REPORT_PATH)) {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  const missing = report.summary?.missingSpanish ?? 0;
  const legalese = report.summary?.legaleseConcerns ?? 0;
  if (missing > 0) warn(`${missing} non-critical strings are missing Spanish in the audit report.`);
  if (legalese > 0) warn(`${legalese} non-critical strings have legalese concerns in the audit report.`);
} else {
  warn("Plain-language audit report has not been generated yet; run npm run rcap:audit-plain-language-copy.");
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors, warnings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  criticalStringsChecked: CRITICAL_COPY_CATALOG.length,
  warnings
}, null, 2));
