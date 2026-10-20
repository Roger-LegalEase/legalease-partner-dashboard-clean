// A compiled state profile pinned by one pathway (recordId compiled-profile:<stem>#<pathwayId>)
// is scoped to that pathway's rule and packet entries plus every shared section; only the other
// pathways are set aside. Another pathway's wording may move (a66ccc373 reworded one clean-slate
// waiting rule while OK human-trafficking-survivor-relief was proven, 2026-10-20); the family's own
// pathway, a shared section, an uncorroborated route key or a missing measured row refuse.
//
//   node --test scripts/grade-a-packet-factory-24h/repin-pathway-scoped-profile.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ADAPTERS, compareAnchors } from "./repin-lapsed-source-identities.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROFILE = "src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json";
const FAM = "composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief";
const PATHWAY = "human-trafficking-survivor-relief";
const OTHER = "clean-slate-automatic-expungement";
const adapter = ADAPTERS.get(PROFILE);
const RECEIPT = `data/rcap-all50/overlays/census-v1/ok/${FAM.toLowerCase()}--custom-pleading/source-receipt.json`;
const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, RECEIPT), "utf8"));
const pin = receipt.committedRecords.find((r) => r.pathInRepository === PROFILE);
const current = () => JSON.parse(fs.readFileSync(path.join(ROOT, PROFILE), "utf8"));
const own = (doc) => doc.pathways.find((p) => p.id === PATHWAY);
const other = (doc) => doc.pathways.find((p) => p.id === OTHER);
/* The measured row is Acceptance's real VF01 read, under the real lane root. */
const scope = (doc = current(), r = receipt, p = pin) => adapter.scopeFrom({ receipt: r, pin: p, currentDoc: doc });
const differing = (oldDoc, currentDoc) => compareAnchors({ adapter, oldDoc, currentDoc, scope: scope(currentDoc) }).differing;

test("the OK pin is scoped to its pathway plus every shared section; the other 17 pathways are set aside twice", () => {
  const s = scope();
  assert.equal(s.derivation.pathwayId, PATHWAY);
  assert.equal(s.derivation.setAside.fields.length, 34);
  assert.ok(s.derivation.setAside.fields.every((id) => !id.endsWith(`:${PATHWAY}`)));
  assert.ok(s.anchorIds.includes(`compiledProfile:pathways:${PATHWAY}`));
  assert.ok(s.anchorIds.includes(`compiledProfile:packetGenerator:pathways:${PATHWAY}`));
  for (const shared of ["terminology", "questions", "waitingPeriodRules", "exclusionRules", "sourceSections", "packetGenerator:feeRules"]) {
    assert.ok(s.anchorIds.includes(`compiledProfile:${shared}`), shared);
  }
  assert.ok(s.derivation.measuredReVerification.length > 0);
});

test("another pathway's waiting-rule wording moved (the a66ccc373 shape): no scoped anchor differs", () => {
  const old = current();
  other(old).waitingRules[1] = "This rule governs filings on or after 2026-07-01.";
  assert.notEqual(JSON.stringify(old), JSON.stringify(current()));
  assert.deepEqual(differing(old, current()), []);
});

test("the family's own pathway moved: refused", () => {
  const old = current();
  own(old).summary = `${own(old).summary} (historical wording)`;
  assert.deepEqual(differing(old, current()), [`compiledProfile:pathways:${PATHWAY}`]);
  const oldPacket = current();
  oldPacket.packetGenerator.pathways.find((p) => p.pathwayId === PATHWAY).mode = "historical";
  assert.deepEqual(differing(oldPacket, current()), [`compiledProfile:packetGenerator:pathways:${PATHWAY}`]);
});

test("a shared section moved: refused even though no pathway entry changed", () => {
  const old = current();
  old.waitingPeriodRules = structuredClone(old.waitingPeriodRules);
  old.waitingPeriodRules.push({ id: "mutant", rule: "none" });
  assert.deepEqual(differing(old, current()), ["compiledProfile:waitingPeriodRules"]);
});

test("a pin that names no pathway, a route key that does not carry the pathway id, or a profile that lost the pathway refuses", () => {
  assert.throws(() => scope(current(), receipt, { ...pin, recordId: "compiled-profile:OK-oklahoma" }), /does not name one pathway/);
  assert.throws(() => scope(current(), receipt, { ...pin, recordId: `compiled-profile:OK-oklahoma#${OTHER}` }), /do not corroborate pathway/);
  assert.throws(() => scope(current(), { ...receipt, routeKeys: ["obligation:track-only:OK:wa_style_track"] }), /do not corroborate pathway/);
  const lost = current();
  lost.pathways = lost.pathways.filter((p) => p.id !== PATHWAY);
  assert.throws(() => scope(lost), /no longer carries pathway/);
  const twice = current();
  twice.pathways.push(structuredClone(own(twice)));
  assert.throws(() => scope(twice), /names pathway .* twice/);
});

test("no measured re-verification row at the current digest refuses", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "repin-pathway-no-rows-"));
  try {
    assert.throws(() => adapter.scopeFrom({ receipt, pin, currentDoc: current(), laneReturnRoot: empty }), /no independent re-verification row/);
  } finally { fs.rmSync(empty, { recursive: true, force: true }); }
});

test("WV and NY keep their dedicated adapters; every other profile gets the pathway-scoped one", () => {
  assert.match(ADAPTERS.get("src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json").describe, /^WV compiled profile/);
  assert.match(ADAPTERS.get("src/lib/rcap-engine/compiled/profiles/NY-new-york.json").describe, /^NY compiled profile/);
  assert.equal(ADAPTERS.get("src/lib/rcap-engine/compiled/profiles/DE-delaware.json").recordPath, "src/lib/rcap-engine/compiled/profiles/DE-delaware.json");
  assert.equal(ADAPTERS.get("src/lib/rcap-engine/compiled/profiles/DE-delaware.json").describe, adapter.describe);
});
