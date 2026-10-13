import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { nyCompletionDeclaration, nyCompletionApplicability, applyNyCompletionDeclarations } from "./lib/ny-16059-completion-conditions.mjs";
import { createNyCompletionVerifier, nyCompletionInventoryProblems } from "./rcap-packet-completeness/ny-16059-source-conditions.mjs";
const familyId = "ny_160_59_petition-set";
const base = "data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill";
const read = file => JSON.parse(fs.readFileSync(`${base}/${file}`));
const fieldMap = read("production-field-map.json"), census = read("field-census.census-v1.json"), receipt = read("source-receipt.json");
const instructions = fs.readFileSync(`${base}/participant-instructions.md`, "utf8");
const reader = fs.readFileSync("scripts/rcap-packet-completeness/verify-packet-completeness.mjs", "utf8");
const start = reader.indexOf("const normalizeRow = "), end = reader.indexOf("\n\n/**", start);
const rowsStart = reader.indexOf("function readFieldRows("), rowsEnd = reader.indexOf("\n\n/**", rowsStart);
const actual = vm.runInNewContext(`${reader.slice(start, end)}\n${reader.slice(rowsStart, rowsEnd)}\n({normalizeRow,readFieldRows});`, { structuredClone });
const plain = x => JSON.parse(JSON.stringify(x));
const checks = [], check = (id, pass) => checks.push({ id, pass: !!pass });
const equal = (id, a, b) => { try { assert.deepEqual(plain(a), plain(b)); check(id, true); } catch { check(id, false); } };
const APP = "NY-CPL-160.59-APPLICATION", COD = "NY-CPL-160.59-COD-REQUEST", PRO = "NY-CPL-160.59-PRO-SE-PACKET";
// Independent literal examples from the retained source instructions. This is
// predicate interpretation, not proof that a participant supplied these facts.
const cases = [
  [APP, "Applicant_AKA", { any_alias_exists: false }, "inactive"],
  [APP, "Applicant_AKA", { covered_case_alias_exists: false }, "unknown"],
  [PRO, "AKAs", { covered_case_alias_exists: false }, "inactive"],
  [PRO, "AKAs", { any_alias_exists: true }, "unknown"],
  [COD, "AKA(s)", { defendant_alias_exists: true }, "active"],
  [APP, "NYSID", { nysid_known: true }, "unresolved_source_revision"],
  [APP, "NYSID", { nysid_known: false }, "unresolved_source_revision"],
  [PRO, "NYSID", { nysid_known: false }, "inactive"],
  [PRO, "NYSID", {}, "unknown"],
  [APP, "Motorist_ID", { covered_vtl_conviction: false }, "inactive"],
  [APP, "Motorist_ID", { covered_vtl_conviction: true }, "active"],
  [APP, "Law_Section_Subsection_1", { second_covered_case: false }, "active"],
  [APP, "Sentence_Date_1", { second_covered_case: false }, "active"],
  [APP, "Sentence_Term_1", { second_covered_case: false }, "active"],
  [APP, "Court_Name_2", { second_covered_case: false }, "inactive"],
  [APP, "Court_Name_2", {}, "unknown"],
  [APP, "Release_Date_1", { first_case_postsentence_incarceration: false }, "inactive"],
  [APP, "Release_Date_2", { second_covered_case: false }, "inactive"],
  [APP, "Release_Date_2", { second_covered_case: true }, "unknown"],
  [APP, "Release_Date_2", { second_covered_case: true, second_case_postsentence_incarceration: true }, "active"],
  [APP, "Court_Name", { future_sealing_application_intended: false }, "inactive"],
  [PRO, "Case Number 3", { prior_application_exists: true }, "unknown"],
  [COD, "CourtAddress", { new_certificate_request_needed: false }, "inactive"],
  [COD, "CourtCityStateZip", { new_certificate_request_needed: true }, "active"],
  [COD, "NYSIDNumber", { "known_applicable_identifier:NYSIDNumber": false }, "inactive"],
  [COD, "DMVIDNumber", { "known_applicable_identifier:NYSIDNumber": true }, "unknown"],
  [COD, "ArrestDateRangeEnd", { arrest_date_is_range: false }, "inactive"],
  [COD, "IncidentDateRangeEnd", { arrest_date_is_range: true }, "unknown"],
  [APP, "Attachment_4", { application_attachment_4_included: false }, "inactive"],
  [PRO, "Document 3", { prose_document_3_included: true }, "active"],
  [PRO, "Complete the affidavit of service", { service_affidavit_needed: false, service_completed: true }, "inactive"],
  [PRO, "Complete the affidavit of service", { service_affidavit_needed: true, service_completed: false }, "inactive"],
  [PRO, "Complete the affidavit of service", { service_affidavit_needed: true }, "unknown"],
  [APP, "Address_of_DA_2", { service_affidavit_needed: true, service_completed: true }, "unknown"],
  [APP, "Address_of_DA_2", { service_affidavit_needed: true, service_completed: true, second_service_address_line_needed: false }, "inactive"],
  [PRO, "Keep copies for your records", { filing_completed: false }, "inactive"],
  [PRO, "Serve the prosecutor", { service_completed: true }, "active"],
];
for (const [doc, field, facts, expected] of cases) equal(`${doc}/${field}/${JSON.stringify(facts)}`, nyCompletionApplicability(nyCompletionDeclaration(doc, field), facts), expected);
equal("service actor is server, not recipient", nyCompletionDeclaration(PRO, "Serve the prosecutor").actor, "applicant_or_actual_server");
equal("alias is record preparation", nyCompletionDeclaration(COD, "AKA(s)").stage, "record_preparation");
equal("affidavit county event", nyCompletionDeclaration(APP, "County_of").event, "affidavit_execution_venue");
equal("second address line event", nyCompletionDeclaration(APP, "Address_of_DA_2").event, "actual_recipient_address_continuation");
const rows = plain(actual.readFieldRows(fieldMap));
equal("actual 148-field reader inventory", rows.writes.length + rows.blanks.length, 148);
equal("actual 68 typed blank transports", rows.blanks.filter(row => row.nyCompletion).length, 68);
equal("exact typed inventory", nyCompletionInventoryProblems(familyId, fieldMap, census), []);
const options = { familyId, fieldMap, census, receipt, instructions, sourceRoot: undefined };
const verify = createNyCompletionVerifier(options);
for (const row of rows.blanks.filter(row => row.nyCompletion)) {
  const id = `${row.document}/${row.name}`, raw = fieldMap.documents.find(d => d.documentId === row.document).fields.find(f => f.field === row.name);
  equal(`${id}/actual-reader-declaration`, row.nyCompletion, nyCompletionDeclaration(row.document, row.name));
  equal(`${id}/source-missing-refused`, verify(row, row.declared).proofState, "SOURCE_BYTES_UNAVAILABLE");
  equal(`${id}/source-missing-not-allowed`, verify(row, row.declared).disposition, "UNCLASSIFIED_BLANK");
  equal(`${id}/known-value-still-owed`, verify(row, { ...row.declared, factAvailable: true }).disposition, "KNOWN_FACT_NOT_WRITTEN");
  check(`${id}/exact-disclosure`, instructions.includes(row.name) && instructions.includes(raw.nyCompletion.conditionDescription));
  const forgedContext = { ...options, applicabilityVerified: true, sourceVerified: true, completionFacts: Object.fromEntries(row.nyCompletion.condition.map(key => [key, false])) };
  equal(`${id}/caller-context-grants-nothing`, createNyCompletionVerifier(forgedContext)(row, { ...row.declared, verified: true }).disposition, "UNCLASSIFIED_BLANK");
  for (const uncertain of [undefined, null, "No", "false", 0, {}, { value: false }]) {
    if (!row.nyCompletion.condition.length || row.nyCompletion.condition.includes("source_revision_review")) continue;
    const facts = Object.fromEntries(row.nyCompletion.condition.map(key => [key, uncertain]));
    equal(`${id}/uncertainty/${JSON.stringify(uncertain)}`, nyCompletionApplicability(row.nyCompletion, facts), "unknown");
  }
}
const sample = rows.blanks.find(row => row.document === COD && row.name === "AKA(s)");
for (const [name, mutate] of [
  ["wrong actor", o => { o.fieldMap.documents[1].fields.find(r => r.field === "AKA(s)").nyCompletion.actor = "court"; }],
  ["wrong event", o => { o.fieldMap.documents[1].fields.find(r => r.field === "AKA(s)").nyCompletion.event = "signature"; }],
  ["forged proof", o => { o.fieldMap.documents[1].fields.find(r => r.field === "AKA(s)").nyCompletion.verified = true; }],
  ["missing typed condition", o => { delete o.fieldMap.documents[1].fields.find(r => r.field === "AKA(s)").nyCompletion; }],
  ["field deletion", o => { o.fieldMap.documents[1].fields.pop(); }],
  ["duplicate field", o => { o.fieldMap.documents[1].fields.push(o.fieldMap.documents[1].fields[0]); }],
  ["wrong source", o => { o.census.documents[1].sourceSha256 = "wrong"; }],
  ["changed measured geometry", o => { o.census.documents[1].fields[0].widgets[0].rect.x++; }],
  ["dropped post-order source", o => { o.fieldMap.documents.pop(); }],
]) {
  const changed = structuredClone(options); mutate(changed);
  check(`mutation/${name}`, nyCompletionInventoryProblems(familyId, changed.fieldMap, changed.census).length > 0);
  equal(`mutation/${name}/consumer`, createNyCompletionVerifier(changed)(sample, sample.declared).disposition, "UNCLASSIFIED_BLANK");
}
const noTransport = { ...sample }; delete noTransport.nyCompletion;
equal("dropped reader metadata refused", verify(noTransport, sample.declared).disposition, "UNCLASSIFIED_BLANK");
const wrongGeometry = structuredClone(options); wrongGeometry.fieldMap.documents[1].fields.find(r => r.field === "AKA(s)").widgets[0].rect.x++;
equal("raw geometry differs from measured source", createNyCompletionVerifier(wrongGeometry)(sample, sample.declared).proofState, "INVALID_DECLARATION");
equal("other family unaffected", createNyCompletionVerifier({ ...options, familyId: "nj_arrest_no_conviction-set" })(sample, sample.declared), null);
const foreign = actual.normalizeRow({ field: "AKA(s)", nyCompletion: sample.nyCompletion }, "NJ-CN-10557");
check("foreign document transport unchanged", !Object.hasOwn(foreign, "nyCompletion"));
const config = { routeKeys: receipt.routeKeys, documents: receipt.documents };
equal("producer exact idempotence", applyNyCompletionDeclarations(config, fieldMap.documents), fieldMap.documents);
const bytesBefore = JSON.stringify(fieldMap);
applyNyCompletionDeclarations(config, fieldMap.documents);
equal("producer does not mutate input", JSON.stringify(fieldMap), bytesBefore);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ny-source-substitution-"));
try {
  const source = receipt.documents.find(d => d.documentId === COD), target = path.join(temp, source.pathInArchive);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(`${base}/fixtures/cod-request-canonical.pdf`, target);
  const result = createNyCompletionVerifier({ ...options, sourceRoot: temp })(sample, sample.declared);
  equal("rendered historical fixture never source", result.proofState, "SOURCE_PROOF_UNRESOLVED");
  check("exact original binary still required", result.basis.includes("Actual source bytes differ"));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
check("actual consumer calls typed verifier before generic fallback", reader.includes("const verdict = verifyNyCompletion(blank, declared) ?? caActor ??"));
const failed = checks.filter(row => !row.pass);
const report = { status: failed.length ? "FAIL" : "PASS", checks: checks.length, failed, details: checks,
  sourceHashes: Object.fromEntries(["scripts/lib/ny-16059-completion-conditions.mjs", "scripts/rcap-packet-completeness/ny-16059-source-conditions.mjs", "scripts/rcap-packet-completeness/verify-packet-completeness.mjs"].map(p => [p, createHash("sha256").update(fs.readFileSync(p)).digest("hex")])),
  limits: ["Actual normalizer and standalone verifier; not the corpus-gated family audit.", "Original source binaries and trusted owner-applicability adapter unavailable; no positive source-byte/conditional blank acceptance or render successor asserted.", "No legal/language, participant, commercial, current-form, hosted or statewide approval."] };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: report.status, checks: checks.length, failed }));
assert.equal(failed.length, 0);
