// Unit and mutation checks for the MVLP intake field map, its validation,
// the eligibility summary and the restricted-field cryptography. Pure
// functions; no database, no network.
import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";

register("../lib/ts-esm-loader.mjs", import.meta.url);

const schema = await import("../../src/lib/legal-aid/intake-schema.ts");
const eligibility = await import("../../src/lib/legal-aid/eligibility.ts");
const restricted = await import("../../src/lib/legal-aid/restricted-fields.ts");

const { INTAKE_FIELDS, INTAKE_STATEMENTS, INTAKE_SECTIONS, validateIntakeAnswers, sanitizeIntakeAnswers, canonicalAnswersJson, applicableStatements, normalizeMoney, normalizeSsn, SSN_FIELD_KEY } = schema;

// --- field map shape -------------------------------------------------------
// The source package maps 56 leaf inputs on the inspected public screen: 52
// answer fields plus the two signature and two date leaves of its attestation
// sections. The answer fields are the field map; the signature/date leaves are
// the signature records (signer name and signing time bound to a statement).
const source = JSON.parse(fs.readFileSync(new URL("../../data/legal-aid/source/MVLP_PUBLIC_FORM_FIELD_MAP.json", import.meta.url), "utf8"));
assert.equal(source.fields.length, 56, "source package leaf count");
assert.equal(INTAKE_FIELDS.length, 52, `field map must carry the 52 answer fields, has ${INTAKE_FIELDS.length}`);
assert.equal(new Set(INTAKE_FIELDS.map((f) => f.key)).size, 52, "field keys must be unique");
const productKeys = new Set(INTAKE_FIELDS.map((f) => f.key));
const statementKeys = new Set(INTAKE_STATEMENTS.map((s) => s.key));
for (const leaf of source.fields) {
  const signatureLeaf = /^(\w+)\.(signature|date)$/.exec(leaf.key);
  if (signatureLeaf) assert.ok(statementKeys.has(signatureLeaf[1]), `${leaf.key} must map to a statement`);
  else assert.ok(productKeys.has(leaf.key), `source leaf ${leaf.key} is not in the field map`);
}
for (const field of INTAKE_FIELDS) assert.ok(source.fields.some((leaf) => leaf.key === field.key), `${field.key} has no source leaf`);
for (const field of INTAKE_FIELDS) {
  assert.ok(INTAKE_SECTIONS.some((s) => s.key === field.section), `${field.key} has an unknown section`);
  assert.ok(["observed", "adaptation", "unresolved"].includes(field.product.category), `${field.key} category`);
  assert.ok(field.product.note.length > 10, `${field.key} must explain its rule`);
  assert.ok(field.source.label.length > 0, `${field.key} must cite the observed source label`);
  if (field.product.requirement === "conditional") assert.ok(field.product.conditionalOn, `${field.key} conditional without a condition`);
  if (field.source.requiredReported === null) assert.notEqual(field.product.category, "observed", `${field.key}: unknown source requiredness cannot be reported as observed`);
}
const byKey = Object.fromEntries(INTAKE_FIELDS.map((f) => [f.key, f]));
assert.equal(byKey["address.line2"].product.requirement, "optional", "Address line 2 is not mandatory");
assert.equal(byKey.ssn.control, "restricted_ssn");
assert.equal(byKey["household.adult_count"].product.requirement, "required");
assert.ok(byKey.gender.options.some((o) => o.adaptation), "the added third choice is marked as an adaptation");
assert.ok(byKey["address.state"].options.length >= 56 && byKey["address.state"].options.some((o) => o.value === "DC") && byKey["address.state"].options.some((o) => o.value === "MS"), "full state and territory list");
assert.ok(!byKey["address.state"].options.some((o) => o.default), "no state is preselected");
const categories = INTAKE_FIELDS.reduce((acc, f) => ({ ...acc, [f.product.category]: (acc[f.product.category] ?? 0) + 1 }), {});
console.log("field categories", categories);

// --- statements ------------------------------------------------------------
const citizen = { is_us_citizen: { state: "answered", value: "yes" } };
const nonCitizen = { is_us_citizen: { state: "answered", value: "no" } };
assert.deepEqual(applicableStatements(citizen).map((s) => s.key), ["financial_attestation", "citizenship_attestation", "information_sharing_consent"]);
assert.deepEqual(applicableStatements(nonCitizen).map((s) => s.key), ["financial_attestation", "noncitizen_review_acknowledgment", "information_sharing_consent"], "a No answer is never asked to sign the citizenship statement");
assert.ok(!applicableStatements({}).some((s) => s.key === "citizenship_attestation"), "an unanswered citizenship question does not surface the citizenship statement");
assert.equal(INTAKE_STATEMENTS.find((s) => s.key === "citizenship_attestation").text, "I am a citizen of the United States of America.", "verbatim source statement preserved");

// --- validation ------------------------------------------------------------
const empty = validateIntakeAnswers({});
assert.equal(empty.valid, false);
assert.ok(empty.missingRequired.includes("name.first") && empty.missingRequired.includes("monthly_receipts.wages"));
assert.ok(!empty.missingRequired.includes("address.line2"));
assert.ok(!empty.missingRequired.includes("assets.home_value"), "conditional field not required until its condition holds");
assert.ok(!empty.missingRequired.includes("ssn"), "the protected value is validated by its own step, never as an answer");

function complete(overrides = {}) {
  const answers = {};
  for (const field of INTAKE_FIELDS) {
    if (field.control === "restricted_ssn" || field.product.requirement === "derived") continue;
    if (field.control === "radio") answers[field.key] = { state: "answered", value: field.options[0].value };
    else if (field.control === "dropdown") answers[field.key] = { state: "answered", value: "MS" };
    else if (field.control === "money") answers[field.key] = { state: "answered", value: "0" };
    else if (field.control === "count") answers[field.key] = { state: "answered", value: "1" };
    else if (field.control === "date") answers[field.key] = { state: "answered", value: "1990-01-01" };
    else if (field.control === "email") answers[field.key] = { state: "answered", value: "a@example.net" };
    else if (field.control === "phone") answers[field.key] = { state: "answered", value: "601-555-0100" };
    else answers[field.key] = { state: "answered", value: "x" };
  }
  return { ...answers, ...overrides };
}
const full = validateIntakeAnswers(complete());
assert.equal(full.valid, true, JSON.stringify(full.errors));
assert.equal(full.applicableCount, full.answeredCount);
assert.equal(validateIntakeAnswers(complete({ "monthly_receipts.wages": { state: "unknown" } })).valid, true, "I don't know is a valid answer for a money field");
assert.equal(validateIntakeAnswers(complete({ "name.first": { state: "unknown" } })).valid, false, "I don't know is not accepted where the field does not allow it");
assert.equal(validateIntakeAnswers(complete({ "monthly_receipts.wages": { state: "answered", value: "abc" } })).valid, false, "non-numeric money rejected");
assert.equal(validateIntakeAnswers(complete({ "household.adult_count": { state: "answered", value: "-1" } })).valid, false, "negative count rejected");
assert.equal(validateIntakeAnswers(complete({ "email": { state: "answered", value: "not-an-email" } })).valid, false);
assert.equal(validateIntakeAnswers(complete({ "assets.owns_home": { state: "answered", value: "yes" }, "assets.home_value": undefined })).missingRequired.includes("assets.home_value"), true, "home value required once the applicant owns a home");
assert.equal(validateIntakeAnswers(complete({ "is_us_citizen": { state: "answered", value: "maybe" } })).valid, false, "unknown option rejected");
delete_check: {
  const answers = complete();
  delete answers["household.adult_count"];
  const result = validateIntakeAnswers(answers);
  assert.ok(result.missingRequired.includes("household.adult_count"), "household size is never defaulted");
}

// --- sanitising and hashing ------------------------------------------------
const dirty = sanitizeIntakeAnswers({ "name.first": { state: "answered", value: "A" }, ssn: { state: "answered", value: "123456789" }, unknown_key: { state: "answered", value: "x" }, "phone": { state: "bogus", value: "1" }, "race": { state: "answered", value: 42 } });
assert.deepEqual(Object.keys(dirty), ["name.first"], "the SSN, unknown keys, bad states and non-string values are dropped");
assert.equal(canonicalAnswersJson({ b: { state: "answered", value: "1" }, a: { state: "unknown" } }), canonicalAnswersJson({ a: { state: "unknown" }, b: { state: "answered", value: "1" } }), "hash input is order-independent");
assert.notEqual(canonicalAnswersJson({ a: { state: "answered", value: "1" } }), canonicalAnswersJson({ a: { state: "answered", value: "2" } }));
assert.equal(normalizeMoney("$1,200.50"), "1200.50");
assert.equal(normalizeMoney("0"), "0");
assert.equal(normalizeMoney("-5"), null);
assert.equal(normalizeMoney("1.234"), null);

// --- eligibility summary ---------------------------------------------------
const finance = { countableReceiptCategories: ["wages", "disability", "unemployment", "tanf", "pension_retirement", "family_friend_assistance", "other"], excludedReceiptCategories: ["food_stamps"], incomeGuideline: null, assetPolicy: null };
const summary = eligibility.computeEligibilitySummary(complete({ "monthly_receipts.wages": { state: "answered", value: "1200" }, "monthly_receipts.food_stamps": { state: "answered", value: "250" }, "monthly_receipts.pension_retirement": { state: "unknown" }, "household.adult_count": { state: "answered", value: "2" }, "household.child_count": { state: "answered", value: "1" } }), finance);
assert.equal(summary.outcome, "manual_review", "no guideline table means a person decides");
assert.equal(summary.countable.monthlyCashIncome, null, "an unknown countable category makes the total non-computable rather than zero");
assert.ok(summary.countable.excludedCategories.includes("food_stamps"), "food benefits are reported but never counted as cash income");
assert.equal(summary.householdSize, 3);
const known = eligibility.computeEligibilitySummary(complete({ "monthly_receipts.wages": { state: "answered", value: "1200" }, "monthly_receipts.food_stamps": { state: "answered", value: "250" } }), finance);
assert.equal(known.countable.monthlyCashIncome, 1200, "excluded categories are not added");
assert.ok(known.reportedExpenses.rent_mortgage, "expenses are reported separately and never deducted");
const missingFinance = eligibility.computeEligibilitySummary({}, finance);
assert.equal(missingFinance.countable.monthlyCashIncome, null, "missing answers never become zero income");
assert.equal(missingFinance.householdSize, null, "missing household answers never become a household of one");
const guided = eligibility.computeEligibilitySummary(complete({ "monthly_receipts.wages": { state: "answered", value: "1200" }, "household.adult_count": { state: "answered", value: "1" }, "household.child_count": { state: "answered", value: "0" } }), { ...finance, incomeGuideline: { basis: "approved table (synthetic)", effectiveFrom: "2026-01-01", monthlyLimitByHouseholdSize: { "1": 1500, "2": 2000 } } });
assert.equal(guided.outcome, "within_guideline");
const over = eligibility.computeEligibilitySummary(complete({ "monthly_receipts.wages": { state: "answered", value: "1600" }, "household.adult_count": { state: "answered", value: "1" }, "household.child_count": { state: "answered", value: "0" } }), { ...finance, incomeGuideline: { basis: "approved table (synthetic)", effectiveFrom: "2026-01-01", monthlyLimitByHouseholdSize: { "1": 1500, "2": 2000 } } });
assert.equal(over.outcome, "over_guideline");

// --- restricted fields -----------------------------------------------------
assert.equal(normalizeSsn("512-34-6789"), "512346789");
assert.equal(normalizeSsn("987-65-4321"), null, "area numbers 900-999 are never issued");
assert.equal(normalizeSsn("000-12-3456"), null);
assert.equal(normalizeSsn("666-12-3456"), null);
assert.equal(normalizeSsn("512-00-6789"), null);
assert.equal(normalizeSsn("512-34-0000"), null);
assert.equal(normalizeSsn("12345678"), null);
assert.equal(SSN_FIELD_KEY, "ssn");
const key = Buffer.from(new Uint8Array(32).map((_, index) => index)).toString("base64");
const envA = { LEGAL_AID_RESTRICTED_FIELD_KEY: key, LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: "v1" };
assert.equal(restricted.restrictedFieldsConfigured({}), false, "no key means the protected field is unavailable, never silently unencrypted");
assert.throws(() => restricted.encryptRestrictedValue("512346789", {}), restricted.RestrictedFieldError);
const encrypted = restricted.encryptRestrictedValue("512346789", envA);
assert.equal(encrypted.keyVersion, "v1");
assert.ok(!encrypted.ciphertext.includes("512346789"));
assert.notEqual(restricted.encryptRestrictedValue("512346789", envA).ciphertext, encrypted.ciphertext, "fresh nonce per write");
assert.equal(restricted.decryptRestrictedValue(encrypted, envA), "512346789");
const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -4) + (encrypted.ciphertext.endsWith("AAAA") ? "BBBB" : "AAAA") };
assert.throws(() => restricted.decryptRestrictedValue(tampered, envA), "tampered ciphertext must fail authentication");
const rotated = { LEGAL_AID_RESTRICTED_FIELD_KEY: Buffer.from(new Uint8Array(32).map((_, index) => 255 - index)).toString("base64"), LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: "v2", LEGAL_AID_RESTRICTED_FIELD_KEY_V1: key };
assert.equal(restricted.decryptRestrictedValue(encrypted, rotated), "512346789", "a previous key version remains readable after rotation");
assert.throws(() => restricted.decryptRestrictedValue(encrypted, { LEGAL_AID_RESTRICTED_FIELD_KEY: rotated.LEGAL_AID_RESTRICTED_FIELD_KEY, LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: "v2" }), "an unknown key version cannot be decrypted with the wrong key");
assert.equal(restricted.maskSsn("6789"), "•••-••-6789");
assert.equal(restricted.maskSsn(null), "•••-••-••••");
assert.equal(restricted.ssnDisplayHint("512346789"), "6789");

console.log("Legal Aid intake schema, eligibility and restricted-field checks passed.");
