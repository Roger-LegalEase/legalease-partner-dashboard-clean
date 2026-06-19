/**
 * Frontend-only verification for the Expungement.ai all-51 consumer screening frontend.
 *
 * Structural, no-browser checks that the profile-driven flow is complete and the safety
 * invariants hold. Run with: `node scripts/verify-expungement-frontend-all51.mjs`
 *
 * This does NOT replace the existing consumer-adapter / wilma-safety / launch-polish verifiers;
 * it adds frontend coverage for the new mock-boundary flow built on this branch.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const FE = "src/lib/expungement-ai/frontend";
const SC = "src/components/expungement-ai/screening";

// 1. Profile coverage: 50 states + DC.
const profiles = JSON.parse(read(`${FE}/profiles/all51.json`));
const codes = Object.keys(profiles);
assert(codes.length === 51, `Expected 51 jurisdiction profiles, found ${codes.length}.`);
assert(codes.includes("DC"), "Profile set must include DC.");

// 2. Question-type coverage: every observed type is handled in QuestionField.
const questionField = read(`${SC}/QuestionField.tsx`);
const questionTypes = [
  "single_choice",
  "multi_select",
  "date_or_unknown",
  "number_or_range",
  "text",
  "text_or_unknown",
  "yes_no_unsure",
  "yes_no_prefer_not_to_say"
];
for (const type of questionTypes) {
  assert(questionField.includes(`"${type}"`), `QuestionField missing handler for type: ${type}`);
}
// Every question type present in the data must be one the renderer handles.
const dataTypes = new Set();
for (const code of codes) for (const q of profiles[code].questions ?? []) if (q?.type) dataTypes.add(q.type);
for (const type of dataTypes) {
  assert(questionTypes.includes(type), `Profile data uses an unhandled question type: ${type}`);
}

// 3. Result-screen coverage: all nine result codes presented.
const result = read(`${SC}/ScreeningResult.tsx`);
const resultCodes = [
  "packet_ready",
  "packet_ready_with_caution",
  "needs_more_info",
  "not_yet",
  "guidance_only",
  "not_covered_yet",
  "likely_not_eligible",
  "needs_review",
  "hard_stop"
];
for (const code of resultCodes) {
  assert(result.includes(`${code}:`), `ScreeningResult missing presentation for result code: ${code}`);
}

// 4. Payment clamp: the result uses the shared isPaymentAllowed guard, not ad-hoc logic.
assert(result.includes("isPaymentAllowed(evaluation)"), "ScreeningResult must gate the packet action on isPaymentAllowed.");
const contracts = read(`${FE}/contracts.ts`);
assert(
  contracts.includes('PAYMENT_ELIGIBLE_RESULT_CODES') && contracts.includes("evaluation.paymentAllowed === true"),
  "isPaymentAllowed must require paymentAllowed true plus a packet-ready code."
);

// 5. Live endpoint flags must stay disabled on this branch.
assert(read(`${FE}/profile-loader.ts`).includes("USE_LIVE_PROFILE_ENDPOINT = false"), "Profile live endpoint flag must be false.");
assert(read(`${FE}/evaluate.ts`).includes("USE_LIVE_EVALUATE_ENDPOINT = false"), "Evaluate live endpoint flag must be false.");

// 6. Mock evaluator returns a fixed safe needs_review and never allows payment.
const fixtures = read(`${FE}/fixtures.ts`);
assert(fixtures.includes('SAFE_FALLBACK_RESULT_CODE = "needs_review"'), "Mock fallback must be needs_review.");
assert(
  fixtures.includes("resultCode: SAFE_FALLBACK_RESULT_CODE") && fixtures.includes("paymentAllowed: false"),
  "Mock needs_review must not allow payment."
);

// 7. contextOnly never blocks Continue.
const answers = read(`${SC}/answers.ts`);
assert(answers.includes("if (question.contextOnly) return false;"), "contextOnly questions must never block Continue.");

// 8. Dev galleries are blocked in production.
for (const page of [
  "src/app/expungement-ai/dev/result-gallery/page.tsx",
  "src/app/expungement-ai/dev/matter-gallery/page.tsx"
]) {
  assert(exists(page), `Missing dev gallery page: ${page}`);
  const src = read(page);
  assert(src.includes('process.env.NODE_ENV === "production"') && src.includes("notFound()"), `Dev gallery must be production-blocked: ${page}`);
}

// 9. No sensitive-answer leakage: screening + frontend lib must not use storage or log answers.
const leakFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel);
    else if (/\.(ts|tsx)$/.test(entry.name)) leakFiles.push(rel);
  }
};
walk(SC);
walk(FE);
for (const file of leakFiles) {
  const src = read(file);
  // Match real API usage (member access), not prose mentions in comments.
  assert(!/localStorage\s*[.[]/.test(src), `Sensitive-answer risk: localStorage used in ${file}`);
  assert(!/sessionStorage\s*[.[]/.test(src), `Sensitive-answer risk: sessionStorage used in ${file}`);
  assert(!/console\.(log|info|debug)\s*\(/.test(src), `Sensitive-answer risk: console logging in ${file}`);
}

// 10. No forced-result / branch-selector / hidden-payment control in the consumer flow.
const flow = read(`${SC}/ScreeningFlow.tsx`);
for (const banned of ["forceResult", "branchSelector", "forcePayment", "paymentAllowed =", "resultCode ="]) {
  assert(!flow.includes(banned), `Consumer flow must not contain a result/payment override: ${banned}`);
}

if (failures.length) {
  console.error("Expungement.ai frontend all51 verification FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("Expungement.ai frontend all51 verification passed.");
console.log(`Profiles: ${codes.length} (50 states + DC).`);
console.log(`Question types handled: ${questionTypes.length} (covers ${dataTypes.size} used in data).`);
console.log(`Result screens: ${resultCodes.length}.`);
console.log("Live endpoint flags disabled; mock returns fixed needs_review; payment clamped; no answer leakage; dev galleries production-blocked.");
