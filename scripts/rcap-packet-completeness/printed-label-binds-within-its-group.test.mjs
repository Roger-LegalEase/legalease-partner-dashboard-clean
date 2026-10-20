// A printed label is a fact identity only inside its own AcroForm group.
//
// CR-400 prints "STREET ADDRESS:" in the filer block and again in the court block,
// and CR-401 prints "Name" for the filer and for the server. Once a repair wrote
// the filer's street and name, the document-wide label match read the court's
// street and the server's name as facts the packet held, so a correct
// REQUIRED_BEFORE_FILING blank failed as KNOWN_FACT_NOT_WRITTEN. The label now
// binds within the field's own group; a flat name keeps the document scope, and
// a declared fact id binds wherever it is written.
//
//   MASTER_LIBRARY_SOURCE_DIR=<library> node --test scripts/rcap-packet-completeness/printed-label-binds-within-its-group.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { auditPreparedInputs } from "./verify-packet-completeness.mjs";

const DOC = "CI-FIXTURE-PETITION";
const FAMILY = "ci-label-group-fixture";
const write = (fieldName, factId) => ({ fieldName, effectiveLabel: "STREET ADDRESS:", documentId: DOC, factId, value: "x" });
const blank = (fieldName, factId = null) => ({ fieldName, effectiveLabel: "STREET ADDRESS:", documentId: DOC, factId,
  disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, reason: "Obtain this from the court before filing; the platform does not hold it." });
const dispositions = (writes, refusals) => auditPreparedInputs("data/ci-fixture-does-not-exist", FAMILY, {
  fieldMap: { schemaVersion: "rcap-production-field-map/v1", familyId: FAMILY, writes, refusals },
  census: null, receipt: null, actualWrites: null, rendered: null, approval: null,
  instructions: refusals.map((r) => `${r.fieldName}: ${r.reason}`).join("\n"),
}).totals.blanksByDisposition;

const filer = write("F[0].P1[0].Party[0].Street[0]", "participant.street");

test("the same label in another group of the same form is not a held fact", () => {
  assert.deepEqual(dispositions([filer], [blank("F[0].P1[0].Court[0].CrtStreet[0]")]), { REQUIRED_BEFORE_FILING: 1 });
});

test("the same label in the same group still binds", () => {
  assert.deepEqual(dispositions([filer], [blank("F[0].P1[0].Party[0].Street2[0]")]), { KNOWN_FACT_NOT_WRITTEN: 1 });
});

test("a flat name on either side keeps the document scope", () => {
  assert.deepEqual(dispositions([write("street", "participant.street")], [blank("court_street")]), { KNOWN_FACT_NOT_WRITTEN: 1 });
  assert.deepEqual(dispositions([write("street", "participant.street")], [blank("F[0].P1[0].Court[0].CrtStreet[0]")]), { KNOWN_FACT_NOT_WRITTEN: 1 });
});

test("a declared fact id binds across groups", () => {
  assert.deepEqual(dispositions([filer], [blank("F[0].P1[0].Court[0].CrtStreet[0]", "participant.street")]), { KNOWN_FACT_NOT_WRITTEN: 1 });
});
