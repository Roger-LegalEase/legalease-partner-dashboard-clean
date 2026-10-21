#!/usr/bin/env node
// Regression tests for the route-election rule in verify-packet-completeness.
//
// requiredOptionsMissing is raised only from the blank classifier, and
// readFieldRows sends every documents-and-decisions row whose decision is not
// literally "refuse" into writes. A row declaring `measured_route_selection`
// therefore never reached the classifier, and the counter read zero on all six
// families that declare one — including three New Jersey families a reader
// failed by hand for delivering no election at all.
//
// The rule is deliberately at the ROUTE level, not the fixture level: a fixture
// whose row is broken withholds its mark on purpose and records the withholding,
// and failing that would punish the honest behaviour. What cannot stand is a
// route that withholds on every fixture it can build, because then no packet it
// delivers states which statute it proceeds under.
//
//   node --test scripts/rcap-packet-completeness/verify-route-election-is-made.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { auditPreparedInputs } from "./verify-packet-completeness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERIFIER = path.join(ROOT, "scripts/rcap-packet-completeness/verify-packet-completeness.mjs");

/* The smallest field map carrying the shape the rule reads: one document whose
 * only row declares a measured route election. Everything else a family would
 * carry is absent on purpose, so a failure here is about the election. */
const fieldMap = () => ({
  documents: [{
    documentId: "TEST-FORM-1",
    fields: [{ field: "guilty", decision: "measured_route_selection", factId: null }],
  }],
});

const artifact = (fixture, { drawn = false, written = false, withheld = false } = {}) => ({
  documentId: "TEST-FORM-1",
  fixture,
  written: written ? [{ field: "guilty" }] : [],
  refused: [{ field: "guilty", reason: "classified_unwritable_by_role", category: "role" }],
  selections: drawn ? [{ control: "guilty", page: 1 }] : [],
  heldButNotPrinted: withheld
    ? [{ field: "guilty", election: true, why: "another cell of the same row could not be printed, so the election is withdrawn with the row" }]
    : [],
});

const audit = (artifacts) => auditPreparedInputs("data/rcap-all50/overlays/census-v1/test/none", "election-test-set", {
  fieldMap: fieldMap(),
  actualWrites: artifacts === null ? null : { schemaVersion: "test", familyId: "election-test-set", artifacts },
  rendered: null, receipt: null, census: null, approval: null, instructions: "",
});

const electionFindings = (r) => r.findings.filter((f) => f.counter === "requiredOptionsMissing" && f.field === "guilty");

test("an election drawn on one fixture is accepted even though the other withholds it", () => {
  const r = audit([artifact("canonical", { drawn: true }), artifact("boundary", { withheld: true })]);
  assert.deepEqual(electionFindings(r), [], "a route that makes its election somewhere states its statute");
});

test("an election written as a field on one fixture is accepted", () => {
  const r = audit([artifact("canonical", { written: true }), artifact("boundary", { withheld: true })]);
  assert.deepEqual(electionFindings(r), []);
});

test("an election withheld on every fixture is caught", () => {
  const r = audit([artifact("canonical", { withheld: true }), artifact("boundary", { withheld: true })]);
  const found = electionFindings(r);
  assert.equal(found.length, 1, "the route delivers no packet stating which statute it proceeds under");
  assert.deepEqual(found[0].fixturesWithoutTheElection, ["canonical", "boundary"]);
  assert.equal(r.result, "FAIL_ROUTE_SELECTION");
});

test("an election absent from every fixture, with no withholding recorded, is caught", () => {
  const r = audit([artifact("canonical"), artifact("boundary")]);
  assert.equal(electionFindings(r).length, 1);
});

test("a declared election with no artifact record at all is refused, not assumed made", () => {
  for (const empty of [null, []]) {
    const found = electionFindings(audit(empty));
    assert.equal(found.length, 1, `an unread write record must be refused, not read as empty (${JSON.stringify(empty)})`);
  }
});

test("the counter is reached from the declaration, not from the blank classifier alone", () => {
  /* The defect was structural: measured_route_selection rows land in writes, and
   * only blanks can raise requiredOptionsMissing. If someone deletes the
   * reconciliation and leaves readFieldRows as it is, every test above still has
   * to fail — but this one names the cause so the next reader does not have to
   * rediscover it. */
  const source = fs.readFileSync(VERIFIER, "utf8");
  assert.match(source, /measured_route_selection/, "the verifier no longer reads the decision this rule exists for");
  assert.match(source, /fixturesWithoutTheElection/, "the route-level election finding is gone");
});
