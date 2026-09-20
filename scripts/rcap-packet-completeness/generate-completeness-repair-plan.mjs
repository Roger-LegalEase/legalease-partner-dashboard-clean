#!/usr/bin/env node
// The four revoked PASS families, and exactly what each needs.
//
//   node scripts/rcap-packet-completeness/generate-completeness-repair-plan.mjs [--check]
//
// WHY THIS IS A SPECIFICATION AND NOT A REPAIR
//
// Repairing a packet means re-rendering it against pinned source bytes, and the
// source corpus is not mounted in the Captain environment -- deliberately, since
// private/ is gitignored and 59 corpus binaries were excluded from the C11
// integration for exactly that reason. So this produces the thing a repair
// worker cannot produce for itself: the exact per-field ledger of what must be
// written, what may stay blank and why, and which elections the route decides.
// The re-render is dispatched, not faked here.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField } from "./completeness-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json";
const MATRIX = "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const matrix = read(MATRIX);

// The four families reported as PASS before the completeness contract existed.
const REVOKED = [
  { familyId: "nj_disorderly_persons-set", priority: "A" },
  { familyId: "ca-17b-reduction-set", priority: "B" },
  { familyId: "ca-1203-43-set", priority: "C" },
  { familyId: "az_marijuana_expungement_superior_court-set", priority: "D" }
];

const problems = [];
const plans = REVOKED.map((target) => {
  const result = matrix.results.find((r) => r.familyId === target.familyId);
  if (!result) { problems.push(`${target.familyId} is not in the completeness matrix`); return null; }
  if (result.result === "PASS_COMPLETE") {
    problems.push(`${target.familyId} passes the completeness contract; revoking a PASS that the contract itself upholds would be wrong`);
  }

  // The findings, grouped into the work a repair actually has to do.
  const byCounter = {};
  for (const f of result.findings) (byCounter[f.counter] ??= []).push(f);

  const requiredWrites = (byCounter.knownRequiredFieldsMissing ?? []).map((f) => ({
    field: f.field, label: f.label,
    fieldClass: classifyField(f.label).id,
    currentReasonGiven: f.reasonGiven,
    whyThatReasonIsNotEnough: f.basis,
    requiredAction: "WRITE_THE_KNOWN_FACT_OR_CLASSIFY_REQUIRED_BEFORE_FILING"
  }));
  const routeElections = (byCounter.requiredOptionsMissing ?? []).map((f) => ({
    field: f.field, label: f.label, currentReasonGiven: f.reasonGiven,
    requiredAction: "SELECT_THE_ELECTION_THE_ROUTE_DETERMINES"
  }));
  const unexplained = (byCounter.unclassifiedBlanks ?? []).map((f) => ({
    field: f.field, label: f.label, currentReasonGiven: f.reasonGiven,
    requiredAction: "ASSIGN_ONE_APPROVED_BLANK_DISPOSITION"
  }));
  const rows = (byCounter.incompleteRows ?? []).map((f) => ({
    row: f.row, missingCells: f.missingCells,
    requiredAction: "COMPLETE_EVERY_REQUIRED_CELL_IN_THE_ROW_OR_LEAVE_THE_WHOLE_ROW_EMPTY"
  }));
  const components = (byCounter.requiredComponentsMissing ?? []).map((f) => ({
    component: f.component ?? null, why: f.why,
    requiredAction: "RENDER_THE_COMPONENT_OR_REMOVE_IT_FROM_THE_PACKET_DEFINITION"
  }));

  return {
    priority: target.priority,
    familyId: target.familyId,
    directory: result.directory,
    priorClassification: "PASS",
    newClassification: "PASS_REVOKED_PENDING_COMPLETENESS_RECHECK",
    revokedBecause: `The prior PASS proved that every write was correct. It never asked what was owed. Under the completeness contract this family writes ${result.totals.written} of ${result.totals.terminalFields} terminal fields and returns ${result.result}.`,
    lawrenceReviewPackage: "BLOCKED — no output-legal review package may be prepared for this family until it returns PASS_COMPLETE",
    completenessResult: result.result,
    counters: result.counters,
    fieldMapSchema: result.totals.fieldMapSchema,
    sourceCurrentness: result.sourceCurrentness,
    repairWork: {
      requiredWrites: { count: requiredWrites.length, fields: requiredWrites },
      routeElections: { count: routeElections.length, fields: routeElections },
      unexplainedBlanks: { count: unexplained.length, fields: unexplained },
      incompleteRows: { count: rows.length, rows },
      missingComponents: { count: components.length, components },
      truncated: result.findingsTruncated
    },
    reRenderRequired: true,
    reRenderCannotRunHere: "The pinned source bytes live in the private corpus, which is not mounted in the Captain environment. The re-render is dispatched to a worker with MASTER_LIBRARY_SOURCE_DIR bound.",
    acceptanceTest: `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${target.familyId} must return PASS_COMPLETE with all ${PASS_COUNTERS.length} counters at zero.`
  };
}).filter(Boolean);

if (problems.length > 0) {
  console.error(`completeness repair plan: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-completeness-repair-plan/v1",
  generatedBy: "scripts/rcap-packet-completeness/generate-completeness-repair-plan.mjs",
  question: "Four families were classified PASS. What does each actually need before that word means anything?",
  derivedFrom: MATRIX,
  contract: "scripts/rcap-packet-completeness/completeness-contract.mjs",
  passRevocation: {
    families: plans.map((p) => p.familyId),
    newClassification: "PASS_REVOKED_PENDING_COMPLETENESS_RECHECK",
    lawrenceReviewPackagesPrepared: 0,
    why: "A PASS that proves only the correctness of the writes it made cannot support an output-level legal approval bound to exact artifact hashes. The approval would bind Lawrence to a document with an empty offence table."
  },
  fleetContext: {
    familiesAudited: matrix.familiesAudited,
    passComplete: matrix.byResult.PASS_COMPLETE ?? 0,
    byResult: matrix.byResult,
    counterTotals: matrix.counterTotals,
    note: "The four are not outliers. No family in the fleet passes the completeness contract, and the same defect class -- a blank excused by a statement of build policy rather than a property of the field -- accounts for most of it."
  },
  doNotRebuildTheOther39: "The other 39 built families are not rebuilt in this round. They are measured, recorded and left alone until the four repairs prove the contract works end to end.",
  plans
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  console.log(`completeness repair plan current: ${plans.length} revoked famil(ies).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
for (const p of plans) {
  const w = p.repairWork;
  console.log(`  ${p.priority}  ${p.familyId.padEnd(44)} ${p.completenessResult}`);
  console.log(`     writes ${w.requiredWrites.count} · elections ${w.routeElections.count} · unexplained ${w.unexplainedBlanks.count} · rows ${w.incompleteRows.count} · components ${w.missingComponents.count}`);
}
console.log(`\n  Lawrence review packages prepared: 0`);
