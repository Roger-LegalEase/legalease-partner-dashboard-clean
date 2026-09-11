import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildUtahSpecialCertificate,
  SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT
} from "../build-census-v1-ut_pet_special_certificate-set.mjs";
import {
  runUtahCompletenessRepair,
  utSpecialCertificateTestHooks as hooks
} from "../build-census-v1-ut_pet_acquittal-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_REL = "data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const read = (name) => JSON.parse(fs.readFileSync(path.join(OUT, name), "utf8"));
const fieldMap = read("production-field-map.json");
const receipt = read("source-receipt.json");
const census = read("field-census.census-v1.json");

const falseFactProbes = [
  ["canonical", "matter.no_conviction_case_filed", "p2-printed_bracket_pair-x162-y669.7"],
  ["canonical", "matter.no_conviction_disposition", "p2-printed_bracket_pair-x183.36-y622.3"],
  ["canonical", "matter.waiting_period_elapsed", "p2-printed_bracket_pair-x162-y550.1"],
  ["canonical", "matter.no_new_arrest_since_certificate", "p2-printed_bracket_pair-x162-y530.3"],
  ["canonical", "matter.not_on_probation_or_parole", "p2-printed_bracket_pair-x162-y510.5"],
  ["canonical", "matter.no_active_protective_or_stalking_order", "p2-printed_bracket_pair-x162-y490.7"],
  ["boundary", "matter.no_disqualifying_conviction", "p2-printed_bracket_pair-x162-y364.9"],
  ["boundary", "matter.no_pending_nontraffic_proceeding", "p2-printed_bracket_pair-x162-y228.7"],
  ["boundary", "matter.no_pending_nontraffic_plea_in_abeyance", "p2-printed_bracket_pair-x162-y195.1"],
  ["boundary", "matter.not_incarcerated_or_supervised", "p2-printed_bracket_pair-x453.6-y181.3"],
  ["boundary", "matter.no_active_protective_or_stalking_order", "p2-printed_bracket_pair-x162-y133.9"],
  ["boundary", "matter.conviction_count_below_limits", "p2-printed_bracket_pair-x162-y100.3"],
  ["boundary", "matter.all_obligations_paid", "p3-printed_bracket_pair-x162-y553.3"],
  ["boundary", "matter.waiting_period_elapsed", "p3-printed_bracket_pair-x162-y533.5"]
];
for (const [fixture, factId, selectionId] of falseFactProbes) {
  const facts = hooks.factsForFixture(fixture);
  facts[factId] = false;
  const selected = hooks.selectedControlIds(fieldMap, facts);
  assert.equal(selected.includes(`1001EX:${selectionId}`), false,
    `${selectionId}: false ${factId} still affirmed`);
}

let selected;
const unknownChoices = hooks.factsForFixture("canonical");
delete unknownChoices["matter.special_certificate_branch"];
delete unknownChoices["matter.bci_fee_waiver_requested"];
selected = hooks.selectedControlIds(fieldMap, unknownChoices);
assert.equal(selected.some((id) => id === "1001EX:p1-printed_bracket_pair-x108-y218.4"
  || id === "1001EX:p2-printed_bracket_pair-x108-y445.1"), false, "unknown branch was selected");
assert.equal(selected.includes("UT-BCI-EXP-APPLICATION:p2-printed_glyph_u0002-x26.7-y453.75"), false,
  "unknown BCI waiver election was selected");

const acquitted = hooks.factsForFixture("canonical");
acquitted["matter.no_conviction_disposition"] = "acquitted";
selected = hooks.selectedControlIds(fieldMap, acquitted);
assert.ok(selected.includes("1001EX:p2-printed_bracket_pair-x183.36-y602.5"));
assert.equal(selected.includes("1001EX:p2-printed_bracket_pair-x183.36-y622.3"), false);

const neverFiled = hooks.factsForFixture("canonical");
neverFiled["matter.no_conviction_case_filed"] = false;
neverFiled["matter.no_conviction_disposition"] = null;
selected = hooks.selectedControlIds(fieldMap, neverFiled);
assert.ok(selected.includes("1001EX:p1-printed_bracket_pair-x162-y83.2"));
assert.equal(selected.includes("1001EX:p2-printed_bracket_pair-x162-y669.7"), false);
assert.equal(selected.includes("1001EX:p2-printed_bracket_pair-x183.36-y622.3"), false);
assert.equal(hooks.textPlans(census, neverFiled).some((plan) => plan.factId === "matter.case_number"), false,
  "never-filed branch invented an existing case number");

const base = hooks.factsForFixture("canonical");
assert.deepEqual(hooks.includedDocumentForms(receipt, base),
  ["UT-BCI-EXP-APPLICATION", "1044XX", "1001EX", "1021EX", "1146XX", "1148XX"]);
const thirdParty = structuredClone(base);
thirdParty["matter.third_party_recipient_requested"] = true;
assert.ok(hooks.includedDocumentForms(receipt, thirdParty).includes("UT-BCI-THIRD-PARTY-RELEASE"));
const statement = structuredClone(base);
statement["matter.victim_exists"] = true;
assert.equal(hooks.includedDocumentForms(receipt, statement).includes("1149XX"), false,
  "victim alone activated prosecutor-request statement");
statement["matter.prosecutor_requests_statement"] = true;
statement["matter.victim_exists_and_prosecutor_requests_statement"] = true;
assert.ok(hooks.includedDocumentForms(receipt, statement).includes("1149XX"));
assert.equal(hooks.includedDocumentForms(receipt, statement).includes("1169XX"), false);
Object.assign(statement, {
  "matter.victim_or_prosecutor_statement_received": true,
  "matter.reply_elected": true,
  "matter.reply_elected_after_statement_received": true,
  "matter.statement_served_at": "2026-08-25",
  "matter.reply_filing_at": "2026-09-08"
});
assert.ok(hooks.componentIncluded("1169XX", statement));
statement["matter.reply_filing_at"] = "2026-09-09";
assert.equal(hooks.componentIncluded("1169XX", statement), false, "15-day reply was included");
delete statement["matter.statement_served_at"];
assert.equal(hooks.componentIncluded("1169XX", statement), false, "reply without actual service date was included");

await assert.rejects(
  buildUtahSpecialCertificate({ noRaster: true }),
  /stage two refused \(SPECIAL_CERTIFICATE_REQUIRED\)/,
  "real builder accepted stage two without independently bound certificate input"
);
const missingExpected = structuredClone(SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT);
delete missingExpected.expectedDocumentSha256;
await assert.rejects(buildUtahSpecialCertificate({ noRaster: true, stageInput: missingExpected }),
  /stage two refused \(EXPECTED_CERTIFICATE_IDENTITY_REQUIRED\)/);
const wrongExpected = structuredClone(SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT);
wrongExpected.expectedDocumentSha256 = "f".repeat(64);
await assert.rejects(buildUtahSpecialCertificate({ noRaster: true, stageInput: wrongExpected }),
  /stage two refused \(CERTIFICATE_IDENTITY_MISMATCH\)/);
await assert.rejects(runUtahCompletenessRepair("ut_pet_special_certificate-set", []),
  /real finalizer requires a successful special-certificate stage gate/,
  "shared stage-two finalizer accepted an unbound direct call");

function snapshotTree(directory) {
  const rows = {};
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else {
        const stat = fs.statSync(absolute);
        const bytes = fs.readFileSync(absolute);
        rows[path.relative(directory, absolute)] = {
          sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
          size: stat.size,
          mode: stat.mode,
          mtimeMs: stat.mtimeMs
        };
      }
    }
  };
  visit(directory);
  return rows;
}
const before = snapshotTree(OUT);
const checked = spawnSync(process.execPath,
  ["scripts/build-census-v1-ut_pet_special_certificate-set.mjs", "--check"],
  { cwd: ROOT, encoding: "utf8", env: { ...process.env, RCAP_NO_LOCAL_RASTER: "1" } });
assert.equal(checked.status, 0, checked.stderr);
assert.match(checked.stdout, /CHECKED_READ_ONLY/);
assert.deepEqual(snapshotTree(OUT), before, "--check changed output bytes or metadata");

console.log("UT special-certificate repair tests passed: 14 false facts, 2 alternatives, conditions, real gate, read-only check");
