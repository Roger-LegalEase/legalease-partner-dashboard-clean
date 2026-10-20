import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { SPEC, runFamily } from "./build-census-v1-ks-22-4908-registration-relief-set.mjs";

const instructions = JSON.stringify([
  SPEC.instructionsIntro, SPEC.obligationTable, SPEC.documentsToObtain, SPEC.steps,
]);
const guide = JSON.stringify(SPEC.guidance);

test("registration guidance states the held poverty-affidavit practice and preserves combined-fee uncertainty", () => {
  for (const text of [instructions, guide]) {
    assert.match(text, /K\.S\.A\. 60-2001 poverty affidavit practice applies to the civil docket fee by its own terms/);
    assert.match(text, /reach over the combined expungement fee is unresolved/);
  }
  assert.doesNotMatch(instructions, /Do not assume a single fee or a fee waiver/);
  assert.match(instructions, /confirm the current amount with the clerk/);
  assert.match(instructions, /\$176/);
});

test("both guidance surfaces recommend attorney review and explain the actual reasons", () => {
  for (const text of [instructions, guide]) {
    assert.match(text, /recommend attorney review before filing/);
    for (const reason of [
      "clear and convincing evidence", "county or district attorney is notified",
      "victims may be notified and may participate", "court may order a risk assessment",
    ]) assert.ok(text.includes(reason), reason);
  }
  assert.deepEqual(SPEC.routeGuards, { currentlyRequiredToRegister: true },
    "a recommendation does not add an attorney-review generation gate");
});

test("both guidance surfaces state the victim protection while preserving court-controlled notice", () => {
  for (const text of [instructions, guide]) {
    assert.match(text, /victim or the victim's family cannot be compelled to testify or to provide discovery to the offender/);
    assert.match(text, /court causes notice/);
  }
});

test("an ordered risk assessment ends self-help in the action sequence", () => {
  const step = SPEC.steps.find(text => text.includes("court orders a risk assessment"));
  assert.match(step, /stop self-help and get attorney help/);
  assert.doesNotMatch(step, /arrange and pay for it as directed/);
  assert.ok(SPEC.stopConditions.includes("The court orders a risk assessment."));
  assert.ok(SPEC.stopConditions.some(text => text.includes("immigration")));
  assert.ok(SPEC.stopConditions.some(text => text.includes("sex offender or violent offender")));
});

test("a held write the boundary fixture does not carry counts as a missing known fact", () => {
  const read = (f) => JSON.parse(fs.readFileSync(`${SPEC.outDir}/${f}`, "utf8"));
  const components = SPEC.documents.map((d) => d.componentId);
  const count = (maps) => runFamily.countCompleteness(maps, read("reports/actual-writes.json").documents,
    fs.readFileSync(`${SPEC.outDir}/participant-instructions.md`, "utf8"), components, components);
  const maps = read("production-field-map.json").maps;
  const before = count(maps).counters.knownRequiredFieldsMissing;
  const dropped = maps.map((m) => m.documentId !== "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022" ? m : {
    ...m, boundaryRefusals: [...m.boundaryRefusals, { ...m.boundaryWrites.find((w) => w.field === "on"), decision: "refuse", heldButNotWritten: true }]
  });
  const after = count(dropped);
  assert.equal(after.counters.knownRequiredFieldsMissing, before + 1);
  assert.ok(after.findings.some((f) => f.fixture === "boundary" && f.field === "on"));
});

test("a build never rewrites the PF20 lane history", () => {
  const history = "data/rcap-grade-a/packet-factory-24h/pf20/ks-22-4908-registration-relief-return-20260913.json";
  const digest = () => crypto.createHash("sha256").update(fs.readFileSync(history)).digest("hex");
  const before = digest();
  // The real build. Without the private sources it stops at BLOCKED_SOURCE, where the old writer still rewrote the file.
  spawnSync(process.execPath, ["scripts/build-census-v1-ks-22-4908-registration-relief-set.mjs"], { stdio: "ignore" });
  assert.equal(digest(), before);
});
