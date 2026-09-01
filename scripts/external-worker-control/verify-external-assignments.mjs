#!/usr/bin/env node
/*
 * Refuse an external dispatch that could take work from a Claude worker, ask
 * for a claim that cannot be granted, or let an external lane write a canonical
 * path. Every check states what it measured, and the suite refuses an empty
 * subject set rather than passing over nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FACT = "data/rcap-grade-a/packet-factory-24h";
const CTL = "data/rcap-grade-a/external-worker-control";
const MUTATIONS = process.argv.includes("--mutations");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const results = [];
const check = (id, title, ok, observed) => results.push({ id, title, ok, observed });

const run = () => {
  results.length = 0;
  const index = read(`${CTL}/EXTERNAL_ASSIGNMENTS.json`);
  const ledger = read(`${FACT}/claim-ledger.json`);
  const files = fs.readdirSync(path.join(ROOT, CTL, "assignments")).filter((f) => f.endsWith(".json"));
  const assignments = files.map((f) => read(`${CTL}/assignments/${f}`));

  /* E1. There is something to check at all. A dispatch of nothing that passes
   * is indistinguishable from a clean one. */
  check("E1", "the dispatch has workers and an index that agrees with them",
    assignments.length > 0 && index.workers?.length === assignments.length,
    `${assignments.length} assignment file(s), index lists ${index.workers?.length ?? 0}`);

  /* E2. No external subject sits under a live Claude claim. */
  /*
   * A collision is a live claim on a lane OTHER than this assignment's own.
   *
   * The first version flagged any live claim at all, which was right until the
   * transfers ran and then reported all twenty workers as stealing their own
   * grants: after a transfer the live claim IS the external worker's, on the
   * lane the assignment names. That is the intended end state, not a
   * collision. The guard still catches what it exists for -- a live claim held
   * by a Claude lane -- because that claim is on a different lane.
   */
  const liveBy = new Map();
  for (const c of ledger.claims) {
    if (c.released === true) continue;
    if (!liveBy.has(c.subjectId)) liveBy.set(c.subjectId, []);
    liveBy.get(c.subjectId).push({ lane: c.lane, laneKind: c.laneKind });
  }
  const stolen = [];
  for (const a of assignments) for (const s of a.subjectIds ?? []) {
    const elsewhere = (liveBy.get(s) ?? []).filter((c) => c.lane !== a.lane);
    if (elsewhere.length) {
      stolen.push(`${a.workerId} names ${s}, held live by ${elsewhere.map((c) => `${c.lane}/${c.laneKind}`).join(", ")}`);
    }
  }
  check("E2", "no external assignment names a subject a live claim already holds",
    stolen.length === 0, `${assignments.reduce((n, a) => n + (a.subjectIds?.length ?? 0), 0)} subject(s); ${stolen.length} collision(s): ${stolen.slice(0, 2).join(" | ")}`);

  /* E3. Every subject is unique across workers -- two externals on one family
   * is the same double-write the ledger exists to prevent. */
  const seen = new Map();
  const dupes = [];
  for (const a of assignments) for (const s of a.subjectIds ?? []) {
    if (seen.has(s)) dupes.push(`${s} is assigned to both ${seen.get(s)} and ${a.workerId}`);
    else seen.set(s, a.workerId);
  }
  check("E3", "no subject is dispatched to two external workers",
    dupes.length === 0, `${seen.size} distinct subject(s); ${dupes.length} duplicate(s): ${dupes.slice(0, 2).join(" | ")}`);

  /* E4. A lane name the claim parser cannot resolve wastes the worker. */
  const LANE_KIND = (lane) => {
    if (/^(VF|WARV|P2V|VS)/.test(lane)) return "independent-verification";
    if (/^(FIX|WAR0[34])/.test(lane)) return "repair";
    if (/^PF/.test(lane)) return "packet-build";
    if (/^DISC/.test(lane)) return "source-discovery";
    if (/^SRC/.test(lane) || /^WAR02/.test(lane)) return "source-reconciliation";
    if (/^ACQ/.test(lane)) return "source-acquisition";
    if (/^PROMO/.test(lane)) return "source-promotion";
    return "unknown";
  };
  const laneProblems = [];
  for (const a of assignments) {
    const kind = LANE_KIND(a.lane);
    if (kind === "unknown") laneProblems.push(`${a.workerId}: lane ${a.lane} resolves to unknown`);
    else if (a.laneKind && a.laneKind !== kind) laneProblems.push(`${a.workerId}: lane ${a.lane} is ${kind} and the file says ${a.laneKind}`);
  }
  check("E4", "every external lane name resolves to the kind the assignment declares",
    laneProblems.length === 0, `${assignments.length} lane(s); ${laneProblems.length} problem(s): ${laneProblems.slice(0, 2).join(" | ")}`);

  /* E5. An assignment must not tell a worker to assert a claim that cannot be
   * minted. This is the XVF-A failure: a lane sent to work, refused at the
   * ledger, and a whole lane spent discovering that. */
  const existing = new Set(ledger.claims.map((c) => `${c.subjectType}|${c.subjectId}|${c.operation}`));
  const unmintable = [];
  for (const a of assignments) {
    /* Read the structured plan, not the prose. This grepped claimPrerequisite
     * for the literal "--transfer" and went red against a dispatch that had
     * been fixed correctly, because the corrected prose said "Captain transfers
     * each grant" without the flag. A check that greps English fails on
     * rewording and passes on a lie. */
    const planned = new Map((a.claimPlan ?? []).map((p) => [p.subjectId, p.kind]));
    const prosePromisesTransfer = /--transfer/.test(a.claimPrerequisite ?? "");
    for (const s of a.subjectIds ?? []) {
      const key = `packet-family|${s}|${a.laneKind}`;
      if (!existing.has(key)) continue;
      const kind = planned.get(s);
      /* TRANSFER: Captain moves the grant, then the assert succeeds.
       * ALREADY_ACTIVE: the transfer has already run and the grant is live on
       * this very lane, so the assert succeeds now. Both are assertable; only
       * an unplanned assert over an existing claim is the XVF-A failure. */
      if (kind === "TRANSFER" || kind === "ALREADY_ACTIVE") continue;
      if (!a.claimPlan && prosePromisesTransfer) continue;   // cloud slots carry the prerequisite inline
      unmintable.push(`${a.workerId} would assert ${a.laneKind} on ${s}, which already holds one; the plan says ${kind ?? "nothing"}`);
    }
  }
  check("E5", "no assignment asks for a claim the ledger would refuse",
    unmintable.length === 0, `${unmintable.length} problem(s): ${unmintable.slice(0, 2).join(" | ")}`);

  /* E6. Cloud slots write evidence only. */
  const CANONICAL = [`${FACT}/claim-ledger.json`, `${FACT}/RASTER_QUEUE.json`, `${FACT}/MASTER_QUEUE.json`, `${FACT}/ACTIVE_ASSIGNMENTS.json`];
  const writeProblems = [];
  for (const a of assignments) {
    for (const p of a.ownedPaths ?? []) {
      if (CANONICAL.some((c) => p.startsWith(c))) writeProblems.push(`${a.workerId} owns a canonical path: ${p}`);
      if (/^CLOUD/.test(a.workerId) && !p.startsWith(`${CTL}/returns/`)) {
        writeProblems.push(`${a.workerId} is a cloud slot and owns ${p}, which is outside its return path`);
      }
    }
    if (!(a.prohibitedPaths ?? []).length) writeProblems.push(`${a.workerId} declares no prohibited paths`);
  }
  check("E6", "no external worker owns a canonical path, and cloud slots write only evidence",
    writeProblems.length === 0, `${writeProblems.length} problem(s): ${writeProblems.slice(0, 2).join(" | ")}`);

  /* E7. The contract fields the control plane depends on are present. */
  const REQUIRED = ["schemaVersion", "assignmentId", "assignmentVersion", "workerId", "createdAt", "captainSha",
    "mode", "lane", "laneKind", "subjectIds", "ownedPaths", "prohibitedPaths",
    "controllingEvidencePaths", "focusedTestCommands", "rasterDisposition",
    "stopConditions", "returnPath", "commercialRoutesOpened", "productionTouched"];
  const missing = [];
  for (const a of assignments) {
    for (const f of REQUIRED) if (a[f] === undefined) missing.push(`${a.workerId} has no ${f}`);
    if (!("expiresAt" in a)) missing.push(`${a.workerId} has no expiresAt`);
    if (a.commercialRoutesOpened !== 0) missing.push(`${a.workerId} opens a commercial route`);
    if (a.productionTouched !== false) missing.push(`${a.workerId} touches Production`);
    if (!Number.isInteger(a.assignmentVersion) || a.assignmentVersion < 1) missing.push(`${a.workerId} has a non-monotonic assignmentVersion`);
  }
  check("E7", "every assignment carries the full contract and opens nothing",
    missing.length === 0, `${assignments.length} file(s) x ${REQUIRED.length + 1} field(s); ${missing.length} problem(s): ${missing.slice(0, 2).join(" | ")}`);

  /*
   * E9. An assignment without a stable id cannot be referenced by a branch, a
   * return, an integration record or a person, and both Codespaces correctly
   * refused to start without one. The id must also agree with the version it
   * claims, or a worker holding a stale file cannot tell which batch it is
   * running.
   */
  const idProblems = [];
  const seenIds = new Map();
  for (const a of assignments) {
    const id = a.assignmentId;
    if (typeof id !== "string" || id.trim() === "") { idProblems.push(`${a.workerId} has no assignmentId`); continue; }
    if (seenIds.has(id)) idProblems.push(`${id} is used by both ${seenIds.get(id)} and ${a.workerId}`);
    seenIds.set(id, a.workerId);
    if (!id.includes(`V${a.assignmentVersion}`)) idProblems.push(`${a.workerId}: id ${id} does not name version ${a.assignmentVersion}`);
    if (!id.includes(a.lane)) idProblems.push(`${a.workerId}: id ${id} does not name lane ${a.lane}`);
    if (a.returnPath && !a.returnPath.includes(id)) idProblems.push(`${a.workerId}: returnPath does not carry the assignmentId, so a return cannot be matched to the batch that produced it`);
    if (a.branch && !a.branch.includes(id.toLowerCase())) idProblems.push(`${a.workerId}: branch does not carry the assignmentId`);
  }
  check("E9", "every assignment has a stable, unique id that names its lane and version, and the return path carries it",
    idProblems.length === 0 && assignments.length > 0,
    `${seenIds.size} distinct id(s) over ${assignments.length} assignment(s); ${idProblems.length} problem(s): ${idProblems.slice(0, 2).join(" | ")}`);

  /* E8. A verifier must not be told to verify what it was told to build. */
  const byWorkerKind = new Map();
  for (const a of assignments) for (const s of a.subjectIds ?? []) {
    const k = `${a.workerId}|${s}`;
    if (!byWorkerKind.has(k)) byWorkerKind.set(k, new Set());
    byWorkerKind.get(k).add(a.laneKind);
  }
  const selfVerify = [...byWorkerKind.entries()]
    .filter(([, kinds]) => kinds.has("independent-verification") && (kinds.has("packet-build") || kinds.has("repair")))
    .map(([k]) => k);
  check("E8", "no external worker is told to verify a subject it also builds or repairs",
    selfVerify.length === 0, `${byWorkerKind.size} worker-subject pair(s); ${selfVerify.length} conflict(s)`);

  return { failed: results.filter((r) => !r.ok) };
};

const { failed } = run();
for (const r of results) {
  console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(3)} ${r.title}`);
  if (!r.ok) console.log(`         observed: ${r.observed}`);
}
console.log(`\n${results.length - failed.length}/${results.length} external-dispatch checks passed.`);

if (MUTATIONS) {
  console.log("\nMutations:");
  const target = path.join(ROOT, CTL, "assignments", "CLOUD01.json");
  const idxPath = path.join(ROOT, CTL, "EXTERNAL_ASSIGNMENTS.json");
  const cases = [
    /* Picks a live claim held by some OTHER lane, so the mutation is a genuine
     * collision. Taking the first live claim became a no-op once the transfers
     * ran: the first one is now CLOUD01's own grant on CLOUD01's own lane, and
     * assigning a worker its own subject changes nothing. */
    { id: "E2", name: "an external assignment over a live Claude claim is caught", file: target,
      edit: (j) => { const l = read(`${FACT}/claim-ledger.json`);
        const held = l.claims.find((c) => c.released !== true && c.lane !== j.lane);
        if (!held) return j;
        j.subjectIds = [held.subjectId]; return j; } },
    { id: "E9", name: "an assignment with no id is caught", file: target,
      edit: (j) => { delete j.assignmentId; return j; } },
    { id: "E9", name: "an id that disagrees with its version is caught", file: target,
      edit: (j) => { j.assignmentId = j.assignmentId.replace(/V\d+/, "V99"); return j; } },
    { id: "E4", name: "an unresolvable lane name is caught", file: target,
      edit: (j) => { j.lane = "XVF-A"; return j; } },
    { id: "E5", name: "an assert on a family that already holds that claim is caught", file: target,
      edit: (j) => { j.claimPrerequisite = "assert it"; return j; } },
    { id: "E6", name: "a cloud slot owning a packet path is caught", file: target,
      edit: (j) => { j.ownedPaths = ["data/rcap-all50/overlays/census-v1/**"]; return j; } },
    { id: "E7", name: "a dropped contract field is caught", file: target,
      edit: (j) => { delete j.stopConditions; return j; } },
    { id: "E7", name: "an assignment that opens a commercial route is caught", file: target,
      edit: (j) => { j.commercialRoutesOpened = 1; return j; } },
    { id: "E1", name: "an index that disagrees with the files is caught", file: idxPath,
      edit: (j) => { j.workers = j.workers.slice(0, 1); return j; } },
  ];
  let undetected = 0;
  const baseline = new Set(run().failed.map((f) => f.id));
  if (baseline.size) console.log(`  baseline: ${[...baseline].join(", ")} already failing — those cases cannot be judged\n`);
  for (const c of cases) {
    if (baseline.has(c.id)) { console.log(`  UNPROVABLE [${c.id}] ${c.name}`); undetected += 1; continue; }
    const original = fs.readFileSync(c.file);
    const mutated = `${JSON.stringify(c.edit(JSON.parse(original.toString("utf8"))), null, 2)}\n`;
    if (mutated === original.toString("utf8")) { console.log(`  MISSED    [${c.id}] ${c.name} — the mutation changed nothing`); undetected += 1; continue; }
    fs.writeFileSync(c.file, mutated);
    let caught = false;
    try { caught = run().failed.some((f) => f.id === c.id); } catch { caught = true; }
    fs.writeFileSync(c.file, original);
    const restored = fs.readFileSync(c.file).equals(original);
    if (!caught || !restored) undetected += 1;
    console.log(`  ${caught ? "detected " : "MISSED   "} [${c.id}] ${c.name}${restored ? "" : " — FILE NOT RESTORED"}`);
  }
  if (undetected) { console.error(`\n${undetected} case(s) prove nothing.`); process.exit(1); }
  console.log(`\nOK external-dispatch mutations — ${cases.length} case(s), every mutation caught.`);
}

if (failed.length) process.exit(1);
console.log("EXTERNAL_DISPATCH_HELD");
