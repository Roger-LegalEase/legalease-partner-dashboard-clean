#!/usr/bin/env node
/**
 * Does the 24-hour packet factory dispatch hold?
 *
 *   node scripts/grade-a-packet-factory-24h/verify.mjs
 *   node scripts/grade-a-packet-factory-24h/verify.mjs --mutations
 *
 * Eleven refusals, each with a mutation that proves it is not vacuous. The
 * dispatch is large enough that a check nobody can falsify would be believed
 * for the whole 24 hours, so every one of them is broken on purpose here and
 * required to fail.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const MUTATIONS = process.argv.includes("--mutations");

const DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPTS = "docs/rcap/grade-a/packet-factory-24h";
const MASTER = `${DIR}/MASTER_QUEUE.json`;
const ACTIVE = `${DIR}/ACTIVE_ASSIGNMENTS.json`;
const GRAPH = `${DIR}/IMPORT_GRAPH.json`;
const COLLISIONS = `${DIR}/COLLISIONS.json`;
const CHECKPOINT = `${DIR}/CHECKPOINT.json`;

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const rootOf = (p) => p.replace(/\/?\*+$/, "");
const touches = (a, b) => { const ra = rootOf(a); const rb = rootOf(b); return ra === rb || ra.startsWith(`${rb}/`) || rb.startsWith(`${ra}/`); };

const results = [];
const check = (id, title, ok, observed = "") => { results.push({ id, title, ok, observed }); };

function run() {
  results.length = 0;
  const master = read(MASTER);
  const active = read(ACTIVE);
  const graph = read(GRAPH);
  const collisions = read(COLLISIONS);
  const checkpoint = read(CHECKPOINT);
  const a = active.assignments;

  const byLane = (lane) => a.filter((x) => x.lane === lane);
  const pf = byLane("packet-build");
  const vf = byLane("independent-verification");
  const src = byLane("source-identity-acquisition-promotion");
  const fix = byLane("rapid-repair");
  const familyById = new Map(master.families.map((f) => [f.familyId, f]));

  // 1. duplicate families, within one kind of work
  const dupes = [];
  const seen = new Map();
  for (const x of a) {
    if (x.itemKind !== "packetFamily") continue;
    for (const f of x.items) {
      const key = `${x.lane}::${f}`;
      if (seen.has(key)) dupes.push(`${f} in ${seen.get(key)} and ${x.assignmentId}`);
      seen.set(key, x.assignmentId);
    }
  }
  check("F1", "no family is claimed twice inside one kind of work", dupes.length === 0, dupes.slice(0, 3).join(" | "));

  // 2. path collisions, recomputed rather than read from the collision record
  const paths = a.flatMap((x) => x.ownedPaths.map((p) => ({ lane: x.assignmentId, path: p })));
  const hits = [];
  for (let i = 0; i < paths.length; i += 1) {
    for (let j = i + 1; j < paths.length; j += 1) {
      if (paths[i].lane === paths[j].lane) continue;
      if (touches(paths[i].path, paths[j].path)) hits.push(`${paths[i].lane}~${paths[j].lane} at ${paths[i].path}`);
    }
  }
  check("F2", "no two lanes own the same path", hits.length === 0 && collisions.counts.pathCollisions === 0, hits.slice(0, 3).join(" | "));

  // 3. shared-host collisions: one build script, one writer
  const writers = new Map();
  for (const x of a) {
    for (const p of x.ownedPaths) {
      if (!/^scripts\/build-census-v1-.+\.mjs$/.test(p)) continue;
      writers.set(p, [...(writers.get(p) ?? []), x.assignmentId]);
    }
  }
  const twoWriters = [...writers.entries()].filter(([, ls]) => ls.length > 1);
  // And the graph's own rule: a script imported from outside a lane is not owned by it.
  const wronglyOwned = [];
  for (const x of pf) {
    for (const p of x.ownedPaths.filter((q) => /^scripts\/build-census-v1-/.test(q))) {
      const edge = graph.edges.find((e) => `scripts/${e.script}` === p);
      const outside = (edge?.importedBy ?? []).map((s) => s.replace(/^build-census-v1-/, "").replace(/\.mjs$/, ""))
        .filter((f) => !x.items.includes(f));
      if (outside.length) wronglyOwned.push(`${x.assignmentId} owns ${p}, imported by ${outside.join(", ")}`);
    }
  }
  check("F3", "one shared host has one owner, and no lane owns a script imported from outside it",
    twoWriters.length === 0 && wronglyOwned.length === 0 && collisions.counts.sharedHostCollisions === 0,
    [...twoWriters.map(([s, l]) => `${s}: ${l.join(", ")}`), ...wronglyOwned].slice(0, 3).join(" | "));

  // 4. active-family collisions
  const activeFamilies = new Set(master.activeOwnership.families);
  const activePaths = master.families.filter((f) => f.activeOwner).flatMap((f) => f.ownedPaths);
  const reDispatched = a.filter((x) => x.itemKind === "packetFamily").flatMap((x) => x.items.filter((f) => activeFamilies.has(f)));
  const pathClash = paths.filter((p) => activePaths.some((q) => touches(p.path, q)));
  check("F4", "nothing this wave holds is already held by an active lane",
    reDispatched.length === 0 && pathClash.length === 0,
    `${reDispatched.length} famil(ies), ${pathClash.length} path(s)`);

  // 5. placeholders
  const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|(?<![A-Za-z0-9])__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__(?![A-Za-z0-9])/;
  const holed = a.filter((x) => PLACEHOLDER.test(JSON.stringify({
    ...x, requiredOutputs: undefined, stopConditions: undefined, focusedTests: undefined,
    returnFormat: undefined, builderObligations: undefined, proofObligations: undefined,
    preflight: undefined, prohibitedCommands: undefined, prohibitedPaths: undefined,
    scriptsNotOwned: undefined, claimRule: undefined, checkpointRule: undefined,
    everyAcquiredSourceRecords: undefined, seedItemsAreNotTheWholeJob: undefined
  }))).map((x) => x.assignmentId);
  check("F5", "no assignment carries a placeholder", holed.length === 0 && collisions.counts.placeholders === 0, holed.slice(0, 3).join(", "));

  // 6 and 7. a blocked family is never handed to a builder
  const blockedInPF = pf.flatMap((x) => x.items.map((f) => familyById.get(f)))
    .filter((f) => f && f.state === "SOURCE_BLOCKED").map((f) => f.familyId);
  const legalInPF = pf.flatMap((x) => x.items.map((f) => familyById.get(f)))
    .filter((f) => f && f.legalInputStatus === "OPEN_LEGAL_INPUT").map((f) => f.familyId);
  check("F6", "no source-blocked family is assigned to a builder", blockedInPF.length === 0, blockedInPF.slice(0, 3).join(", "));
  check("F7", "no legally blocked family is assigned to a builder", legalInPF.length === 0, legalInPF.slice(0, 3).join(", "));

  // 8. an incomplete family is never called complete
  const falsePass = master.families.filter((f) =>
    (f.state === "PASS_COMPLETE" || f.state === "VERIFIED_PASS" || f.state === "COMPLETE_PACKET_PROVEN")
    && f.counters && Object.values(f.counters).some((v) => v > 0)).map((f) => f.familyId);
  check("F8", "no family with a nonzero counter is recorded as complete", falsePass.length === 0, falsePass.slice(0, 3).join(", "));

  // 9. self-verification
  const pfItems = new Set(pf.flatMap((x) => x.items));
  const selfVerified = vf.flatMap((x) => x.items.filter((f) => pfItems.has(f)));
  const branchClash = [...pf, ...vf].map((x) => `${x.assignmentId}:${x.workerBranch}`);
  const sharedReturnDir = vf.filter((v) => pf.some((b) => b.returnDirectory === v.returnDirectory));
  check("F9", "no verifier verifies what a builder in this wave is building",
    selfVerified.length === 0 && sharedReturnDir.length === 0 && branchClash.length === pf.length + vf.length,
    `${selfVerified.length} self-verified, ${sharedReturnDir.length} shared return dir(s)`);

  // 10. no Codex prompt carries a Git network command
  const FORBIDDEN = [/(^|[^`\w])git\s+fetch/, /(^|[^`\w])git\s+pull/, /(^|[^`\w])git\s+push/, /(^|[^`\w])gh\s+\w/, /(^|[^`\w])git\s+worktree/, /(^|[^`\w])git\s+clone/];
  const promptFiles = fs.existsSync(path.join(ROOT, PROMPTS)) ? fs.readdirSync(path.join(ROOT, PROMPTS)).filter((f) => f.endsWith(".md")) : [];
  const offending = [];
  for (const f of promptFiles) {
    const text = fs.readFileSync(path.join(ROOT, PROMPTS, f), "utf8");
    // The "Never run these" list names each command inside backticks; those are
    // the prohibition, not an instruction. Only an unquoted occurrence counts.
    for (const line of text.split("\n")) {
      const stripped = line.replace(/`[^`]*`/g, "");
      if (FORBIDDEN.some((re) => re.test(stripped))) offending.push(`${f}: ${line.trim().slice(0, 60)}`);
    }
  }
  check("F10", "no Codex prompt instructs a Git network command",
    offending.length === 0 && promptFiles.length === a.length,
    `${promptFiles.length} prompt(s), ${offending.length} offending line(s): ${offending.slice(0, 2).join(" | ")}`);

  // 11. no idle lane while executable work remains
  const assignedToPF = new Set(pf.flatMap((x) => x.items));
  const unassignedSourceReady = master.families.filter((f) => f.state === "SOURCE_READY" && !f.activeOwner && !assignedToPF.has(f.familyId));
  const emptyPF = pf.filter((x) => x.items.length === 0);
  const unassignedSourceObligations = master.totals.sourceObligationsAssigned - src.reduce((n, x) => n + x.itemCount, 0);
  check("F11", "no lane is idle while work of its kind remains unassigned",
    unassignedSourceReady.length === 0
    && !(emptyPF.length > 0 && unassignedSourceReady.length > 0)
    && unassignedSourceObligations === 0
    && checkpoint.codex.queuedTasks === a.length,
    `${unassignedSourceReady.length} source-ready unassigned, ${emptyPF.length} empty builder(s), ${unassignedSourceObligations} source obligation(s) unassigned`);

  // The arithmetic that makes the rest readable.
  check("F12", "the live denominator closes",
    master.denominator.sumsToDenominator === true
    && master.denominator.liveFamilyDenominator === master.families.length
    && master.totals.lanes === a.length && a.length === 32,
    `${master.families.length} families, ${a.length} lanes`);

  const failed = results.filter((r) => !r.ok);
  return { results: [...results], failed };
}

const first = run();
for (const r of first.results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(4)} ${r.title}${r.ok ? "" : `\n         observed: ${r.observed}`}`);
console.log(`\n${first.results.length - first.failed.length}/${first.results.length} factory checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const targets = { master: path.join(ROOT, MASTER), active: path.join(ROOT, ACTIVE), collisions: path.join(ROOT, COLLISIONS), checkpoint: path.join(ROOT, CHECKPOINT) };
  const originals = Object.fromEntries(Object.entries(targets).map(([k, p]) => [k, fs.readFileSync(p)]));
  const promptTarget = path.join(ROOT, PROMPTS, "PF01.md");
  const originalPrompt = fs.readFileSync(promptTarget);
  const firstPF = (j) => j.assignments.find((x) => x.lane === "packet-build" && x.items.length > 0);
  const cases = [
    { on: "active", id: "F1", name: "a family claimed by two builders is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build" && x.items.length); b[1].items.push(b[0].items[0]); return j; } },
    { on: "active", id: "F2", name: "two lanes owning one path is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build" && x.items.length); b[1].ownedPaths.push(b[0].ownedPaths[1]); return j; } },
    { on: "active", id: "F3", name: "a shared host with two writers is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build"); const s = b.find((x) => x.ownedPaths.some((p) => /build-census-v1/.test(p))).ownedPaths.find((p) => /build-census-v1/.test(p)); b.find((x) => !x.ownedPaths.includes(s)).ownedPaths.push(s); return j; } },
    { on: "active", id: "F4", name: "an active family re-dispatched is caught", mutate: (j) => { firstPF(j).items.push(read(MASTER).activeOwnership.families[0]); return j; } },
    { on: "active", id: "F5", name: "a placeholder in an assignment is caught", mutate: (j) => { firstPF(j).mission = "TBD"; return j; } },
    { on: "master", id: "F6", name: "a source-blocked family sent to a builder is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY" && !x.activeOwner); f.state = "SOURCE_BLOCKED"; return j; } },
    { on: "master", id: "F7", name: "a legally blocked family sent to a builder is caught", mutate: (j) => { const f = j.families.find((x) => x.state === "SOURCE_READY" && !x.activeOwner); f.legalInputStatus = "OPEN_LEGAL_INPUT"; return j; } },
    { on: "master", id: "F8", name: "an incomplete family recorded as complete is caught", mutate: (j) => { const f = j.families.find((x) => x.counters && Object.values(x.counters).some((v) => v > 0)); f.state = "VERIFIED_PASS"; return j; } },
    { on: "active", id: "F9", name: "a verifier verifying what a builder in this wave builds is caught", mutate: (j) => { const b = firstPF(j); j.assignments.find((x) => x.lane === "independent-verification").items.push(b.items[0]); return j; } },
    { on: "active", id: "F11", name: "a source-ready family left unassigned is caught", mutate: (j) => { firstPF(j).items.pop(); return j; } },
    { on: "checkpoint", id: "F11", name: "a queue count that disagrees with the lanes is caught", mutate: (j) => { j.codex.queuedTasks = 7; return j; } },
    { on: "master", id: "F12", name: "a denominator that does not close is caught", mutate: (j) => { j.denominator.sumsToDenominator = false; return j; } },
    { on: "collisions", id: "F2", name: "a collision record reporting a collision it did not fail on is caught", mutate: (j) => { j.counts.pathCollisions = 1; return j; } },
    { on: "prompt", id: "F10", name: "a prompt instructing a Git network command is caught", mutateText: (t) => `${t}\n\nRun git push origin work when you are finished.\n` }
  ];
  let undetected = 0;
  try {
    for (const c of cases) {
      if (c.on === "prompt") fs.writeFileSync(promptTarget, c.mutateText(originalPrompt.toString("utf8")));
      else fs.writeFileSync(targets[c.on], `${JSON.stringify(c.mutate(JSON.parse(originals[c.on].toString("utf8"))), null, 2)}\n`);
      let caught = false;
      try {
        const after = run();
        caught = after.failed.some((f) => f.id === c.id);
      } catch { caught = true; }
      if (c.on === "prompt") fs.writeFileSync(promptTarget, originalPrompt);
      else fs.writeFileSync(targets[c.on], originals[c.on]);
      console.log(`  ${caught ? "detected " : "MISSED   "} [${c.id}] ${c.name}`);
      if (!caught) undetected += 1;
    }
  } finally {
    for (const [k, p] of Object.entries(targets)) fs.writeFileSync(p, originals[k]);
    fs.writeFileSync(promptTarget, originalPrompt);
  }
  const restored = Object.entries(targets).every(([k, p]) => fs.readFileSync(p).equals(originals[k]))
    && fs.readFileSync(promptTarget).equals(originalPrompt);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the factory verifier proves less than it claims."); process.exit(1); }
  console.log(`\nOK factory mutations — ${cases.length} case(s), every mutation caught.`);
}

const final = run();
if (final.failed.length > 0) { console.error(`\n${final.failed.length} factory check(s) FAILED.`); process.exit(1); }
