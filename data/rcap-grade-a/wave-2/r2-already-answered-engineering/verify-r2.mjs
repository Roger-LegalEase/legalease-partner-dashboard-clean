#!/usr/bin/env node
/**
 * R2_ALREADY_ANSWERED_ENGINEERING — the verifier.
 *
 *   node data/rcap-grade-a/wave-2/r2-already-answered-engineering/verify-r2.mjs
 *
 * A lane that reports its own completion is worth exactly what its verifier is
 * worth. This one re-reads every controlling record from the tree and refuses
 * the return if a row cites a record that is not there, states a treatment the
 * record does not state, uses a word outside the fixed vocabulary, or carries a
 * branch on which checkout would open.
 *
 * It shares no code with the generator on purpose: a check that imports the
 * thing it checks proves only that the file was written.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const local = (name) => JSON.parse(fs.readFileSync(path.join(HERE, name), "utf8"));

const rowsDoc = local("rows.json");
const bindingsDoc = local("route-treatment-bindings.json");
const stoppedDoc = local("stopped.json");
const retriage = read("data/rcap-grade-a/route-obligation-census-v1/legal-review-queue-v2-retriage.json");
const authority = read("src/lib/legal-authority/authority.json");
const reclass = read("data/rcap-ledger/sellable-pathway-reclassifications.json");
const assignmentItems = retriage.rows.filter((r) => r.bucket === "ALREADY_ANSWERED").map((r) => r.routeKey);

const typesSrc = fs.readFileSync(path.join(ROOT, "src/lib/legal-authority/types.ts"), "utf8");
const constArray = (name) =>
  [...(typesSrc.match(new RegExp(`${name}[^=]*=\\s*\\[([^\\]]*)\\]`))?.[1] ?? "").matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
const NO_FILING = constArray("NO_PARTICIPANT_FILING_OUTCOMES");
const PACKET_BEARING = constArray("PACKET_BEARING_OUTCOMES");
const ALL_MODES = new Set([...NO_FILING, ...PACKET_BEARING]);
const ALL_STAGES = new Set(["single_stage", "active_case_admission", "post_completion", "automatic", "enforcement"]);

let failures = 0;
const check = (id, title, passed, observed = "") => {
  if (!passed) failures += 1;
  console.log(`  ${passed ? "ok  " : "FAIL"} ${id} ${title}`);
  if (!passed && observed) console.log(`         observed: ${observed}`);
};

/* 1. Every assigned row is present, exactly once, and nothing else is. */
const returned = rowsDoc.rows.map((r) => r.itemId);
check("R2-1", "every assigned routeKey is returned exactly once",
  returned.length === assignmentItems.length && new Set(returned).size === returned.length && assignmentItems.every((k) => returned.includes(k)),
  `assigned ${assignmentItems.length}, returned ${returned.length}, distinct ${new Set(returned).size}`);

/* 2. WEC-5: the fixed vocabulary, and nothing outside it. */
const badStatus = rowsDoc.rows.filter((r) => !["COMPLETED", "STOPPED"].includes(r.status));
check("R2-2", "no status outside COMPLETED / STOPPED", badStatus.length === 0,
  badStatus.map((r) => `${r.itemId}=${r.status}`).join(", "));

/* 3. WEC-5: the fixed array key and item key. */
check("R2-3", "the array key is rows and the item key is itemId",
  Array.isArray(rowsDoc.rows) && rowsDoc.rows.every((r) => typeof r.itemId === "string" && r.itemId.length > 0));

/* 4. Every row names the record it rests on, and the record is really there. */
const missingRecord = [];
for (const row of rowsDoc.rows) {
  const id = row.decisionRecord?.id;
  if (!id) { missingRecord.push(`${row.itemId} names no record`); continue; }
  const inAuthority = authority.decisions.some((d) => d.id === id);
  const inReclass = (reclass.reclassifications ?? []).some((r) => r.id === id);
  let inMemo = false;
  if (id.includes("#")) {
    const [file, trackId] = [row.decisionRecord.file, id.split("#")[1]];
    try { inMemo = (read(file).tracks ?? []).some((t) => t.trackId === trackId); } catch { inMemo = false; }
  }
  if (!inAuthority && !inReclass && !inMemo) missingRecord.push(`${row.itemId} cites ${id}, which is not in this tree`);
}
check("R2-4", "every cited decision record resolves in this tree", missingRecord.length === 0, missingRecord.join("; "));

/* 5. A completed row names the participant A branches it settled on. */
const unsettled = rowsDoc.rows.filter((r) => r.status === "COMPLETED" && (r.settledParticipantABranches ?? []).length === 0);
check("R2-5", "every completed row names the participant A branch or branches it settled on", unsettled.length === 0,
  unsettled.map((r) => r.itemId).join(", "));

/* 6. A completed row states where the effect lands and what the change was. */
const thin = rowsDoc.rows.filter((r) => r.status === "COMPLETED" && (!r.effect?.file || !r.effect?.field || !r.engineeringChange));
check("R2-6", "every completed row states the file, the field and the exact change", thin.length === 0,
  thin.map((r) => r.itemId).join(", "));

/* 7. Every completed row has a binding, and every binding a completed row. */
const completed = rowsDoc.rows.filter((r) => r.status === "COMPLETED").map((r) => r.itemId).sort();
const bound = bindingsDoc.bindings.map((b) => b.itemId).sort();
check("R2-7", "completed rows and emitted bindings are the same set", JSON.stringify(completed) === JSON.stringify(bound),
  `completed ${completed.length}, bindings ${bound.length}`);

/* 8. Every branch speaks the runtime's vocabulary, not the lane's. */
const badBranch = [];
for (const b of bindingsDoc.bindings) {
  for (const br of b.branches) {
    if (!ALL_MODES.has(br.outcomeMode)) badBranch.push(`${b.itemId}#${br.branchId} outcomeMode=${br.outcomeMode}`);
    if (!ALL_STAGES.has(br.stage)) badBranch.push(`${b.itemId}#${br.branchId} stage=${br.stage}`);
    if (!br.branchId) badBranch.push(`${b.itemId} has a branch with no id`);
  }
  const ids = b.branches.map((x) => x.branchId);
  if (new Set(ids).size !== ids.length) badBranch.push(`${b.itemId} repeats a branch id`);
}
check("R2-8", "every branch uses a real RouteOutcomeMode and RouteStage and a distinct branch id", badBranch.length === 0, badBranch.join("; "));

/* 9. The load-bearing one: this lane opens no checkout. */
const wouldOpen = [];
for (const b of bindingsDoc.bindings) {
  for (const br of b.branches) {
    const closed =
      NO_FILING.includes(br.outcomeMode) ||
      ["active_case_admission", "automatic", "enforcement"].includes(br.stage) ||
      br.packetFamily === null;
    if (!closed) wouldOpen.push(`${b.itemId}#${br.branchId}`);
    if (br.paymentAuthority !== "closed") wouldOpen.push(`${b.itemId}#${br.branchId} declares ${br.paymentAuthority}`);
  }
}
check("R2-9", "no branch opens a checkout under the runtime's own derivation", wouldOpen.length === 0, wouldOpen.join("; "));

/* 10. An AA-1 binding may not restate a treatment its record does not carry. */
const drifted = [];
for (const b of bindingsDoc.bindings) {
  if (b.derivedFrom?.file !== "src/lib/legal-authority/authority.json") continue;
  const d = authority.decisions.find((x) => x.id === b.derivedFrom.id);
  if (!d) { drifted.push(`${b.itemId} cites missing ${b.derivedFrom.id}`); continue; }
  if (d.outputMode !== b.derivedFrom.outputMode) drifted.push(`${b.itemId} outputMode ${b.derivedFrom.outputMode} != record ${d.outputMode}`);
  if (d.ruleId !== b.derivedFrom.ruleId) drifted.push(`${b.itemId} ruleId ${b.derivedFrom.ruleId} != record ${d.ruleId}`);
  if (d.jurisdiction !== b.jurisdiction) drifted.push(`${b.itemId} jurisdiction ${b.jurisdiction} != record ${d.jurisdiction}`);
}
check("R2-10", "every authority-derived binding restates its record exactly", drifted.length === 0, drifted.join("; "));

/* 11. WEC-6: every stop is a row stop, and the lane did not stop. */
const badStop = stoppedDoc.stopped.filter((s) => s.stopScope !== "ROW" || !s.stopReason);
check("R2-11", "every stop is scoped ROW and states its reason", badStop.length === 0 && stoppedDoc.laneStopped === false,
  `laneStopped=${stoppedDoc.laneStopped}, malformed ${badStop.length}`);

/* 12. A stopped row is recorded in both places, with both sides of the conflict. */
const stoppedInRows = rowsDoc.rows.filter((r) => r.status === "STOPPED").map((r) => r.itemId).sort();
const stoppedInDoc = stoppedDoc.stopped.map((s) => s.itemId).sort();
check("R2-12", "stopped rows agree across rows.json and stopped.json", JSON.stringify(stoppedInRows) === JSON.stringify(stoppedInDoc),
  `rows ${stoppedInRows.length}, stopped ${stoppedInDoc.length}`);

/* 13. The counts a reader would quote are the counts the file contains. */
const c = rowsDoc.counts ?? {};
check("R2-13", "the reported counts match the rows",
  c.rows === rowsDoc.rows.length &&
  c.completed === rowsDoc.rows.filter((r) => r.status === "COMPLETED").length &&
  c.stopped === rowsDoc.rows.filter((r) => r.status === "STOPPED").length &&
  c.commercialRoutesOpened === 0,
  JSON.stringify(c));

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${failures} refusal${failures === 1 ? "" : "s"}`);
process.exit(failures === 0 ? 0 : 1);
