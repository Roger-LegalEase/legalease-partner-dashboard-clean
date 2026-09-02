/*
 * Append one VF01 row to vf01/rows.json, refusing a row the return format does
 * not allow, and recompute the tally over every row in the file.
 *
 *   node data/rcap-grade-a/packet-factory-24h/vf01/tools/append-row.mjs <row.json>
 *
 * It refuses an unrecognised verdict, a row that does not score all fifteen
 * obligations, an obligation result outside the vocabulary, and a
 * PASS_COMPLETE_INDEPENDENT that carries a failing or unmeasured obligation or
 * a counter this lane did not measure at zero itself.
 */
import fs from "node:fs";
const ROWS = "data/rcap-grade-a/packet-factory-24h/vf01/rows.json";
const OBLIGATIONS = [
  "ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
  "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
  "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP",
];
const VERDICTS = new Set(["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"]);
const OK = new Set(["PASS", "FAIL", "NOT_MEASURABLE_HERE", "BLOCKED_LEGAL_INPUT"]);
const COUNTERS = ["knownRequiredFieldsMissing", "requiredFactsNotCollected", "unclassifiedBlanks", "incompleteRows",
  "requiredOptionsMissing", "requiredComponentsMissing", "invisibleWrites", "protectedWrites", "visualDefects"];

const row = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const doc = JSON.parse(fs.readFileSync(ROWS, "utf8"));
if (!VERDICTS.has(row.verdict)) throw new Error(`unrecognised verdict ${JSON.stringify(row.verdict)}`);
const missing = OBLIGATIONS.filter((o) => !Object.keys(row.proofObligations ?? {}).includes(o));
if (missing.length) throw new Error(`row ${row.itemId} does not score ${missing.join(", ")}`);
for (const [k, v] of Object.entries(row.proofObligations)) {
  if (!OK.has(v.result) && typeof v.result !== "boolean") throw new Error(`${k}: bad result ${JSON.stringify(v.result)}`);
}
const failed = Object.entries(row.proofObligations).filter(([, v]) => v.result === "FAIL" || v.result === false).map(([k]) => k);
if (row.verdict === "PASS_COMPLETE_INDEPENDENT") {
  if (failed.length) throw new Error(`PASS_COMPLETE_INDEPENDENT with failing obligations: ${failed.join(", ")}`);
  const un = Object.entries(row.proofObligations).filter(([, v]) => v.result === "NOT_MEASURABLE_HERE" || v.result === "BLOCKED_LEGAL_INPUT").map(([k]) => k);
  if (un.length) throw new Error(`PASS_COMPLETE_INDEPENDENT with unmeasured obligations: ${un.join(", ")}`);
  const c = row.nineCounters ?? {};
  const bad = COUNTERS.filter((k) => c[k] !== 0);
  if (bad.length) throw new Error(`PASS_COMPLETE_INDEPENDENT needs the nine counters at zero; not zero: ${bad.join(", ")}`);
  if (c.measuredHere !== true) throw new Error("PASS_COMPLETE_INDEPENDENT needs nineCounters.measuredHere true");
}
row.failedProofObligations = failed;
doc.rows.push(row);
const tally = {};
for (const r of doc.rows) tally[r.verdict] = (tally[r.verdict] || 0) + 1;
doc.summary = {
  families: new Set(doc.rows.map((r) => r.itemId)).size,
  rows: doc.rows.length,
  PASS_COMPLETE_INDEPENDENT: tally.PASS_COMPLETE_INDEPENDENT || 0,
  FAIL_REPAIR_REQUIRED: tally.FAIL_REPAIR_REQUIRED || 0,
  BLOCKED_SOURCE: tally.BLOCKED_SOURCE || 0,
  BLOCKED_LEGAL_INPUT: tally.BLOCKED_LEGAL_INPUT || 0,
  ...(tally.PASS ? { PASS: tally.PASS } : {}),
  ...(tally.STOPPED ? { STOPPED: tally.STOPPED } : {}),
  tallyRecomputedOverEveryRowInThisFile: true,
  onlyFableVaRowsAreFableVaDeterminations: doc.summary?.onlyFableVaRowsAreFableVaDeterminations ?? [],
};
fs.writeFileSync(ROWS, `${JSON.stringify(doc, null, 1)}\n`);
console.log(`appended ${row.itemId} ${row.verdict}; rows now ${doc.rows.length}; failing: ${failed.length ? failed.join(", ") : "none"}`);
console.log(JSON.stringify(doc.summary));
