import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { FORM_4_222, DICTIONARY_4_222 } from "./nm-form-4-222.mjs";
import { censusFlat, resolveSourcesByHash } from "./nm-packet-host.mjs";
import { measureDocumentBlanks } from "./nm-flat-blank-measurer.mjs";

const EXPECTED_SHA = "ef54fbdc9485157d8c85735ff3d66d5a39968ebde68c60de8a7eb094107348de";
const OLD_DISTRICT_TEXT = "SIXTH JUDICIAL DISTRICT COURT";

const { resolved, failures } = resolveSourcesByHash([{ ...FORM_4_222, routeKey: "nm-test" }]);
assert.deepEqual(failures, []);
assert.equal(resolved.length, 1);
const source = resolved[0];
assert.equal(crypto.createHash("sha256").update(source.bytes).digest("hex"), EXPECTED_SHA);
assert.equal(source.custody, "user_upload_adopted_20260911");

const pdf = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
assert.equal(pdf.getPageCount(), 5);
assert.equal(pdf.getForm().getFields().length, 0);
const measured = measureDocumentBlanks(pdf);
assert.equal(measured.reduce((n, page) => n + page.blanks.length, 0), 147);
assert.equal(Object.keys(DICTIONARY_4_222).length, 147);
assert.equal(source.additionalPrintedControls.length, 7);
assert.equal(new Set(source.additionalPrintedControls.map((c) => c.key)).size, 7);

const census = await censusFlat({ ...source, dictionary: DICTIONARY_4_222 }, {
  "matter.county": "Bernalillo",
  "matter.court": "Second",
  "matter.fee_waiver_court_caption": "Second Judicial District",
  "participant.full_legal_name": "Morgan Rivera",
  "participant.street_address": "100 Central Ave SW",
  "participant.city_state_zip": "Albuquerque, NM 87102",
  "participant.full_mailing_address": "100 Central Ave SW, Albuquerque, NM 87102"
});
assert.equal(census.rows.length, 154);
assert.equal(census.unmapped.length, 0);
assert.equal(census.stale.length, 0);
const support = census.rows.filter((row) => row.key.includes("household-support"));
assert.equal(support.length, 7);
assert.ok(support.every((row) => row.policy === "election" && row.noGeometry === true));
assert.equal(census.rows.find((row) => row.key === "p4-y33222-x28800")?.policy, "route_selection");

await assert.rejects(
  () => censusFlat({
    ...source,
    dictionary: DICTIONARY_4_222,
    additionalPrintedControls: [
      { ...source.additionalPrintedControls[0], key: "negative-control-duplicate" },
      { ...source.additionalPrintedControls[1], key: "negative-control-duplicate" }
    ]
  }, {}),
  /additional printed-control keys must be unique/
);

const sourceText = measured.flatMap((page) => page.lines.map((line) => line.text)).join("\n");
assert.match(sourceText, /STATE OF NEW MEXICO/);
assert.match(sourceText, /COUNTY OF/);
assert.doesNotMatch(sourceText.toUpperCase(), new RegExp(OLD_DISTRICT_TEXT));

console.log("PASS statewide NM Form 4-222 source, census, and participant-control treatment");
