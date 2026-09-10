import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { verdictsOnDisk, contradictions } from "./verify-gate-coverage-matches-its-verdicts.mjs";

const stage = () => fs.mkdtempSync(path.join(os.tmpdir(), "gate-coverage-"));
const writeVerdict = (dir, familyId, body) => {
  const d = path.join(dir, familyId);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, `${familyId}.verdict.json`), JSON.stringify({ familyId, ...body }));
};

test("it fires on the real shape of the defect: a row calling unrendered what the same run rendered", () => {
  const runs = stage();
  writeVerdict(runs, "az_certificate_second_chance-set", {
    workflowRunId: "34364359375",
    documentsRendered: [{ role: "canonical", document: "canonical.pdf" }, { role: "boundary", document: "boundary.pdf" }],
  });
  const queue = { rows: [{
    familyId: "az_certificate_second_chance-set",
    coverage: { notRenderedByThisGate: ["boundary.pdf"] },
  }] };
  const found = contradictions(queue, verdictsOnDisk(runs));
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].refuted, ["boundary.pdf"]);
  assert.equal(found[0].runId, "34364359375");
});

test("it fires when the contradiction sits in the carried receipt rather than the coverage block", () => {
  const runs = stage();
  writeVerdict(runs, "f", { workflowRunId: "1", documentsRendered: [{ role: "boundary", document: "boundary.pdf" }] });
  const queue = { rows: [{ familyId: "f", rasterReceipt: { whatThisGateDidNotRender: ["boundary.pdf"] } }] };
  assert.equal(contradictions(queue, verdictsOnDisk(runs)).length, 1);
});

test("it passes when the row queues and the gate renders the same set", () => {
  const runs = stage();
  writeVerdict(runs, "f", { workflowRunId: "1", documentsRendered: [{ role: "canonical", document: "canonical.pdf" }, { role: "boundary", document: "boundary.pdf" }] });
  const queue = { rows: [{ familyId: "f", coverage: { notRenderedByThisGate: [] } }] };
  assert.deepEqual(contradictions(queue, verdictsOnDisk(runs)), []);
});

test("a truthful unrendered list is not a contradiction: Hawaii's route fixtures are never queued", () => {
  const runs = stage();
  writeVerdict(runs, "rcap-hi-custom-pleading", {
    workflowRunId: "34407406641",
    documentsRendered: [{ role: "canonical", document: "canonical.pdf" }, { role: "boundary", document: "boundary.pdf" }],
  });
  const queue = { rows: [{
    familyId: "rcap-hi-custom-pleading",
    coverage: { notRenderedByThisGate: ["routes/hi-under-21-dui/boundary.pdf", "routes/hi-under-21-dui/canonical.pdf"] },
  }] };
  assert.deepEqual(contradictions(queue, verdictsOnDisk(runs)), [],
    "a substring test would flag this; only an exact document name is a contradiction");
});

test("a verdict with no documentsRendered proves nothing and must not be read as proof nothing was rendered", () => {
  const runs = stage();
  writeVerdict(runs, "f", { workflowRunId: "1", verdict: "RASTER_PASS" });
  const queue = { rows: [{ familyId: "f", coverage: { notRenderedByThisGate: ["boundary.pdf"] } }] };
  assert.deepEqual(contradictions(queue, verdictsOnDisk(runs)), []);
});

test("a family with no verdict on disk is not judged either way", () => {
  const queue = { rows: [{ familyId: "absent", coverage: { notRenderedByThisGate: ["boundary.pdf"] } }] };
  assert.deepEqual(contradictions(queue, verdictsOnDisk(stage())), []);
});

test("every verdict for a family is checked, not just the newest", () => {
  const runs = stage();
  const d = path.join(runs, "f");
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "f.verdict.json"), JSON.stringify({ familyId: "f", workflowRunId: "old", documentsRendered: [{ role: "canonical", document: "canonical.pdf" }] }));
  fs.mkdirSync(path.join(d, "later"), { recursive: true });
  fs.writeFileSync(path.join(d, "later", "f.verdict.json"), JSON.stringify({ familyId: "f", workflowRunId: "new", documentsRendered: [{ role: "boundary", document: "boundary.pdf" }] }));
  const queue = { rows: [{ familyId: "f", coverage: { notRenderedByThisGate: ["boundary.pdf"] } }] };
  const found = contradictions(queue, verdictsOnDisk(runs));
  assert.equal(found.length, 1);
  assert.equal(found[0].runId, "new");
});
