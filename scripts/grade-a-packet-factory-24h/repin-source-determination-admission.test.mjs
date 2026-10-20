// MEASURED-ROW ADMISSION for the captain source-identity determinations record
// (lead ruling 2026-10-20; Roger: reuse unchanged accepted output where applicability
// is demonstrated). The adapter compares the whole shared record as one anchor, so any
// other state's determination lapsed every family pinning it. A family may refresh
// without a new read only when (a) its own determination and reconciliation row are
// identical, (b) a PASS row for it records the current digest, and (c) the remaining
// difference is confined to other families' determinations and the enumerated shared
// keys. The set-aside parts leave the family's anchor, so the written block still
// records identical anchors, which is what generate.mjs requires of a refresh.
//
//   node --test scripts/grade-a-packet-factory-24h/repin-source-determination-admission.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ADAPTERS, compareAnchors } from "./repin-lapsed-source-identities.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RECORD = "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json";
const adapter = ADAPTERS.get(RECORD);
const FAM = "fl-administrative-set";
const doc = () => {
  const d = structuredClone(JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), "utf8")));
  d.determinations = d.determinations.filter((r) => r.id === "DET-FL-ADMINISTRATIVE-EXPUNCTION-HAS-NO-FDLE-FORM" || r.id === "DET-RI-DC-33-ORDER-SOURCE-UNRESOLVED");
  d.reconciliation42.families = d.reconciliation42.families.filter((r) => r.familyId === FAM || r.familyId === "ri_decriminalized-set");
  return d;
};
const receipt = { familyId: FAM };
const pin = { pathInRepository: RECORD, sha256: "0".repeat(64) };
const row = [{ evidencePath: "vf03/rows-test.json", lane: "VF03", verifiedAtBase: "f3bbf848e" }];
/* The FL case: another state's determination changed and two admitted shared keys moved. */
const movedElsewhere = () => {
  const c = doc();
  c.determinations.find((r) => r.id === "DET-RI-DC-33-ORDER-SOURCE-UNRESOLVED").answer = "changed";
  c.reconciliation42.rhodeIslandProposedOrder = { changed: true };
  c.reconciliation42.acquisitionEvidencePaths = [...c.reconciliation42.acquisitionEvidencePaths, "data/rcap-grade-a/source-wave-integration/acquisition/ri-new.json"];
  return c;
};
const admit = (oldDoc, currentDoc, measuredRows = row) => adapter.measuredRowAdmission({ receipt, oldDoc, currentDoc, measuredRows });

test("the FL case is admitted, names what was set aside, and the narrowed anchors compare identical", () => {
  const oldDoc = doc(), currentDoc = movedElsewhere();
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc });
  assert.equal(compareAnchors({ adapter, oldDoc, currentDoc, scope }).differing.length, 1, "control: the whole-record anchor differs");
  const v = admit(oldDoc, currentDoc);
  assert.equal(v.ok, true, v.why);
  assert.deepEqual(v.admission.otherFamilyDeterminationsSetAside, ["DET-RI-DC-33-ORDER-SOURCE-UNRESOLVED"]);
  assert.deepEqual(v.admission.sharedKeysSetAside, ["acquisitionEvidencePaths", "rhodeIslandProposedOrder"]);
  assert.deepEqual(v.admission.measuredReVerification, row);
  const narrowed = { ...scope, derivation: { ...scope.derivation, measuredRowAdmission: v.admission } };
  const again = compareAnchors({ adapter, oldDoc, currentDoc, scope: narrowed });
  assert.deepEqual(again.differing, []);
  assert.equal(again.anchorsCompared, again.anchorsIdentical);
  assert.ok(again.anchorsCompared >= 2);
});

test("(a) the family's own determination changed refuses", () => {
  const c = movedElsewhere(); c.determinations.find((r) => r.families.includes(FAM)).answer = "changed";
  assert.match(admit(doc(), c).why, /own determination changed/);
});

test("(a) the family's own reconciliation row changed refuses", () => {
  const c = movedElsewhere(); c.reconciliation42.families.find((r) => r.familyId === FAM).exactNextAction = "changed";
  assert.match(admit(doc(), c).why, /own reconciliation row changed/);
});

test("(b) no PASS row at the current digest refuses", () => {
  assert.match(admit(doc(), movedElsewhere(), []).why, /no PASS_COMPLETE_INDEPENDENT row/);
});

test("(c) a shared key outside the enumerated list refuses", () => {
  const c = movedElsewhere(); c.reconciliation42.rule = "changed";
  assert.match(admit(doc(), c).why, /outside the admitted list changed: rule/);
});

test("(c) a top-level field change refuses", () => {
  const c = movedElsewhere(); c.question = "changed";
  assert.match(admit(doc(), c).why, /top-level field\(s\) changed: question/);
});

test("the enumerated keys are exactly two, by name", () => {
  assert.deepEqual(adapter.ADMITTED_SHARED_KEYS, ["acquisitionEvidencePaths", "rhodeIslandProposedOrder"]);
});
