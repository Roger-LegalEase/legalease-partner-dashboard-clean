// The captain source-identity determinations adapter scopes a receipt pin by the
// determination it names. A pin written before determinations carried ids names
// none (fl-administrative-set, 2026-10-20): then the one determination naming the
// family is the scope, none or several refuses, and an explicit recordId still decides.
//
//   node --test scripts/grade-a-packet-factory-24h/repin-source-determination-scope.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ADAPTERS } from "./repin-lapsed-source-identities.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RECORD = "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json";
const adapter = ADAPTERS.get(RECORD);
const FAM = "fl-administrative-set";
/* The real record, cut to two families, so the adapter's own schema checks apply. */
const doc = () => {
  const d = structuredClone(JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), "utf8")));
  d.determinations = d.determinations.filter((r) => r.id === "DET-FL-ADMINISTRATIVE-EXPUNCTION-HAS-NO-FDLE-FORM" || r.id === "DET-RI-DC-33-ORDER-SOURCE-UNRESOLVED");
  d.reconciliation42.families = d.reconciliation42.families.filter((r) => r.familyId === FAM || r.familyId === "ri_decriminalized-set");
  return d;
};
const receipt = { familyId: FAM };
const pinWithout = { pathInRepository: RECORD, sha256: "0".repeat(64) };
const scope = (currentDoc, pin) => adapter.scopeFrom({ receipt, pin, currentDoc });

test("no recordId: the unique determination naming the family is the scope", () => {
  const s = scope(doc(), pinWithout);
  assert.equal(s.derivation.determinationId, "DET-FL-ADMINISTRATIVE-EXPUNCTION-HAS-NO-FDLE-FORM");
  assert.equal(s.derivation.scopedBy, "the unique determination naming this family");
  assert.deepEqual(s.anchorIds, [FAM]);
});

test("no recordId and no determination naming the family refuses", () => {
  const d = doc(); d.determinations = d.determinations.filter((r) => !r.families.includes(FAM));
  assert.throws(() => scope(d, pinWithout), /0 determination\(s\) name this family/);
});

test("no recordId and two determinations naming the family refuses", () => {
  const d = doc(); d.determinations.push({ ...structuredClone(d.determinations.find((r) => r.families.includes(FAM))), id: "DET-FL-SECOND" });
  assert.throws(() => scope(d, pinWithout), /2 determination\(s\) name this family/);
});

test("an explicit recordId still decides, even when two determinations name the family", () => {
  const d = doc(); d.determinations.push({ ...structuredClone(d.determinations.find((r) => r.families.includes(FAM))), id: "DET-FL-SECOND" });
  const s = scope(d, { ...pinWithout, recordId: "captain-source-identity-determination:DET-FL-SECOND" });
  assert.equal(s.derivation.determinationId, "DET-FL-SECOND");
  assert.equal(s.derivation.scopedBy, "recordId");
});

test("an explicit recordId that names no determination, or one not naming the family, refuses as before", () => {
  assert.throws(() => scope(doc(), { ...pinWithout, recordId: "captain-source-identity-determination:DET-NOPE" }), /does not uniquely bind/);
  assert.throws(() => scope(doc(), { ...pinWithout, recordId: "captain-source-identity-determination:DET-RI-DC-33-ORDER-SOURCE-UNRESOLVED" }), /does not uniquely bind/);
});

test("the family's reconciliation row may carry satisfiedWithoutStandaloneBinary (official-form ids), nothing else new", () => {
  const d = doc(); const s = scope(d, pinWithout);
  const anchors = adapter.anchorsOf(d, s, "current");
  assert.ok(anchors.has(`sourceReconciliation:${FAM}`));
  const bad = doc(); bad.reconciliation42.families.find((r) => r.familyId === FAM).satisfiedWithoutStandaloneBinary = "official-form:X";
  assert.throws(() => adapter.anchorsOf(bad, s, "current"), /ambiguous satisfiedWithoutStandaloneBinary/);
  const other = doc(); other.reconciliation42.families.find((r) => r.familyId === FAM).somethingElse = 1;
  assert.throws(() => adapter.anchorsOf(other, s, "current"), /ambiguous source reconciliation dependencies/);
});
