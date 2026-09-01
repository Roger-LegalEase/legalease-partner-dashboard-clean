#!/usr/bin/env node
/*
 * Ingest one external worker's return. Refuses before it accepts:
 * a return that wrote outside its owned paths, that names a subject it was not
 * assigned, that claims a verdict it did not score, or that arrives for an
 * assignmentVersion the control plane has already superseded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CTL = "data/rcap-grade-a/external-worker-control";
const read = (r) => JSON.parse(fs.readFileSync(path.join(ROOT, r), "utf8"));
const flag = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const die = (code, msg) => { console.error(msg); process.exit(code); };

const workerId = flag("--worker");
if (!workerId) die(2, "usage: ingest-external-return.mjs --worker <WORKER_ID> [--changed-paths <file>]");

const assignmentPath = `${CTL}/assignments/${workerId}.json`;
if (!fs.existsSync(path.join(ROOT, assignmentPath))) die(3, `NO_ASSIGNMENT: ${workerId} has none`);
const assignment = read(assignmentPath);

const returnPath = `${CTL}/returns/${workerId}/RETURN.json`;
if (!fs.existsSync(path.join(ROOT, returnPath))) die(4, `NO_RETURN: ${returnPath} does not exist; a branch or PR must land it first`);
const ret = read(returnPath);

const problems = [];
if (ret.workerId !== workerId) problems.push(`the return says worker ${ret.workerId}`);
if (ret.assignmentVersion !== assignment.assignmentVersion) {
  problems.push(`return is for assignmentVersion ${ret.assignmentVersion} and the live assignment is ${assignment.assignmentVersion} — superseded, do not integrate`);
}
const assigned = new Set(assignment.subjectIds ?? []);
for (const s of ret.subjectIds ?? []) if (!assigned.has(s)) problems.push(`the return names ${s}, which was not assigned`);

/* Changed paths, when the caller supplies them, must lie inside ownedPaths.
 * Without them this cannot be checked, and it says so rather than passing. */
const cp = flag("--changed-paths");
let pathVerdict = "NOT_CHECKED — no --changed-paths supplied; a clean return here is not evidence of a clean diff";
if (cp) {
  const changed = fs.readFileSync(cp, "utf8").split("\n").map((x) => x.trim()).filter(Boolean);
  const owned = (assignment.ownedPaths ?? []).map((p) => p.replace(/\/\*\*$/, ""));
  const outside = changed.filter((c) => !owned.some((o) => c === o || c.startsWith(`${o}/`)));
  if (outside.length) problems.push(`${outside.length} changed path(s) outside ownedPaths: ${outside.slice(0, 4).join(", ")}`);
  pathVerdict = outside.length ? "OUTSIDE_OWNED_PATHS" : `${changed.length} changed path(s), all inside ownedPaths`;
}

/* A PASS_COMPLETE_INDEPENDENT from a return that scored a subset is the L9
 * failure. Enforced here too, because an external return does not pass through
 * the lane-contract check before it lands. */
const FIFTEEN = ["ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
  "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
  "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP"];
const scored = new Set(JSON.stringify(ret).match(/[A-Z][A-Z_]{4,}/g) ?? []);
for (const row of ret.rows ?? []) {
  if (row.verdict !== "PASS_COMPLETE_INDEPENDENT") continue;
  const missing = FIFTEEN.filter((o) => !scored.has(o));
  if (missing.length) problems.push(`${row.itemId}: PASS_COMPLETE_INDEPENDENT without scoring ${missing.length} obligation(s)`);
}
if (ret.commercialRoutesOpened !== 0) problems.push("the return opens a commercial route");
if (ret.productionTouched !== false) problems.push("the return touched Production");

const record = {
  schemaVersion: "rcap-external-integration/v1",
  workerId, assignmentVersion: assignment.assignmentVersion,
  ingestedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  accepted: problems.length === 0,
  changedPathCheck: pathVerdict,
  problems,
  subjectIds: ret.subjectIds ?? [],
  whatThisDoesNotDo: "Accepting a return records evidence. It promotes nothing, releases no claim and opens no route; Captain releases claims and regenerates queues separately.",
};
const outDir = path.join(ROOT, CTL, "integration");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${workerId}.v${assignment.assignmentVersion}.json`), `${JSON.stringify(record, null, 2)}\n`);

if (problems.length) {
  console.error(`REFUSED ${workerId} v${assignment.assignmentVersion} — ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`ACCEPTED ${workerId} v${assignment.assignmentVersion} — ${(ret.subjectIds ?? []).length} subject(s); ${pathVerdict}`);
