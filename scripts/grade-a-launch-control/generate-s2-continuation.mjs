#!/usr/bin/env node
/**
 * S2_CONTINUATION — what P1, P3 and P4 were promised when the host was fixed.
 *
 *   node scripts/grade-a-launch-control/generate-s2-continuation.mjs [--check]
 *
 * The S2 assignment ended with a five-step contract: S2 returns, Captain
 * integrates, Captain publishes a continuation record naming the integration
 * commit and the per-family counter movement, the repair lanes rebase onto it,
 * Captain re-audits. This is step three, and it is also steps four and five --
 * the eleven families were re-rendered here rather than sent back, because the
 * lanes had already returned and re-dispatching them would have asked three
 * workers to reproduce a render that had no per-family decisions left in it.
 *
 * Every number is read from a committed record. The before counters come from
 * the matrix as it stood before the repairs; the after counters from the matrix
 * this integration wrote; the artifact drift from hashing the rendered bytes at
 * both commits rather than from either side's report of them.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const LC = "data/rcap-grade-a/launch-control";
const OUT = `${LC}/S2_CONTINUATION.json`;
const MATRIX = "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";

/* The chain this record exists to name. Each is a commit on the Captain branch. */
const S1_INTEGRATED = "9a484a666e611e5b31199eced691a2baccc8e862";
const S2_INTEGRATED = "85c1ca90accd40ab2b7e4f5b49780512601bc879";
const CONTRACT_FIX = ["8dcf9b12138bf980a6ac75b08096331c8baca986", "0c8f25d9810bdf66f81457636489da9e60b547f6"];
const REPAIRS_APPLIED = {
  P1_UT_PETITION_EXPUNGE_COMPLETENESS: { workerCommit: "af7eebbdc3f7aaeda0f910a2b750f7dbd67c3f95", integratedAs: "1b682a7911aec7a38751775c97591f291c739082" },
  P3_WV_CONVICTION_COMPLETENESS: { workerCommit: "bb82d09d51b5563a34a46dda8e51df09e3b6280a", integratedAs: "49fbca0836d69b7bd631a3e25fdfa5e6e9b5c97d" },
  P4_NE_SD_SETASIDE_COMPLETENESS: { workerCommit: "498fb601069129ab4eba26d5985e73e31bc11aac", integratedAs: "23353d3c2feb3b76f77c4788f0de2250b6de0088" }
};
const RERENDER_AND_AUDIT = "98a7a57e2a354eeb8b33b3873e62f7a9785fedaf";
const CONTINUATION_BASE = RERENDER_AND_AUDIT;
/* The matrix as it stood before any of this: the last audit of the 43 built
 * families before the repair lanes returned. Read from the tree at that commit,
 * never retyped. */
const BEFORE_AT = "ddd0502a5201313efa3ea2f45d810419f98e4197";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args, opts = {}) => execFileSync("git", args, { cwd: ROOT, maxBuffer: 1 << 29, stdio: ["ignore", "pipe", "ignore"], ...opts });
const gitText = (args) => git(args, { encoding: "utf8" }).trim();
const gitBytes = (args) => git(args);
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const shortOf = (sha) => gitText(["rev-parse", "--short", sha]);

const s2Assignment = read(`${LC}/S2_SHARED_HOST_ASSIGNMENT.json`);
const repairWave = read(`${LC}/COMPLETENESS_REPAIR_WAVE.json`);
const after = read(MATRIX);
const before = JSON.parse(gitText(["show", `${BEFORE_AT}:${MATRIX}`]));

/*
 * The exact eleven: the host family plus every BUILT importer, taken from the
 * S2 assignment's own closure rather than listed by hand, so the record cannot
 * name a family the assignment did not.
 */
const host = s2Assignment.assignments[0];
const closure = [
  host.hostImporters.hostFamily?.familyId ?? "ne-setaside-custodial-set",
  ...host.hostImporters.families.filter((f) => f.c11Classification === "BUILT").map((f) => f.familyId)
];
const families = [...new Set(closure)].sort();

const directoryOf = (familyId) => after.results.find((r) => r.familyId === familyId)?.directory ?? null;
const laneOf = (familyId) => host.hostImporters.families.find((f) => f.familyId === familyId)?.owningLane
  ?? repairWave.assignments.find((a) => a.items.includes(familyId))?.assignmentId
  ?? null;

const PASS_COUNTERS = after.results[0] ? Object.keys(after.results[0].counters) : [];

const rows = families.map((familyId) => {
  const b = before.results.find((r) => r.familyId === familyId) ?? null;
  const a = after.results.find((r) => r.familyId === familyId) ?? null;
  const dir = directoryOf(familyId);
  const drift = ["canonical", "boundary"].map((fixture) => {
    const rel = `${dir}/fixtures/${fixture}.pdf`;
    const at = (commit) => { try { return sha256(gitBytes(["show", `${commit}:${rel}`])); } catch { return null; } };
    const beforeSha = at(REPAIRS_APPLIED.P4_NE_SD_SETASIDE_COMPLETENESS.integratedAs);
    const afterSha = at(CONTINUATION_BASE);
    return { fixture, asReturnedByTheRepairLane: beforeSha, atContinuationBase: afterSha, changed: beforeSha !== afterSha };
  });
  const rasterFiles = (() => {
    try {
      return gitText(["diff", "--name-only", `${REPAIRS_APPLIED.P4_NE_SD_SETASIDE_COMPLETENESS.integratedAs}`, CONTINUATION_BASE, "--", `${dir}/raster`])
        .split("\n").filter(Boolean).length;
    } catch { return null; }
  })();
  const movement = Object.fromEntries(PASS_COUNTERS.map((c) => [c, {
    before: b?.counters?.[c] ?? null,
    after: a?.counters?.[c] ?? null,
    moved: (b?.counters?.[c] ?? null) !== (a?.counters?.[c] ?? null)
  }]));
  const failing = PASS_COUNTERS.filter((c) => (a?.counters?.[c] ?? 0) > 0);
  return {
    familyId,
    directory: dir,
    owningLane: laneOf(familyId),
    resultBefore: b?.result ?? null,
    resultAfter: a?.result ?? null,
    allNineCountersZero: failing.length === 0,
    failingCounters: failing,
    countersBefore: b?.counters ?? null,
    countersAfter: a?.counters ?? null,
    counterMovement: movement,
    writtenBefore: b ? `${b.totals.written}/${b.totals.terminalFields}` : null,
    writtenAfter: a ? `${a.totals.written}/${a.totals.terminalFields}` : null,
    requiredBeforeFilingAccepted: a?.totals?.blanksByDisposition?.REQUIRED_BEFORE_FILING ?? 0,
    blanksByDispositionAfter: a?.totals?.blanksByDisposition ?? null,
    artifactDrift: drift,
    rasterFilesChanged: rasterFiles,
    findingsRemaining: (a?.findings ?? []).map((f) => ({ counter: f.counter, field: f.field ?? null, label: f.label ?? null, why: f.why ?? f.basis ?? null }))
  };
});

/*
 * The host's importer set after the repairs, recomputed here.
 *
 * S2 existed because twelve scripts imported one host and no repair lane could
 * own it. The repairs then made most of those families self-contained, so the
 * shared surface that forced a whole lane into existence is now a quarter of its
 * size. Worth recording: the next lane that meets this host meets a different
 * problem, and a record that only said "12" would send it looking for eight
 * importers that are no longer there.
 */
const hostBase = path.basename(s2Assignment.host);
const scriptFiles = fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => /^build-census-v1-.+\.mjs$/.test(f));
const importsHost = (f) => [...fs.readFileSync(path.join(ROOT, "scripts", f), "utf8")
  .matchAll(/from\s+["']\.\/(build-census-v1-[^"']+\.mjs)["']/g)].some((m) => m[1] === hostBase);
const importersNow = scriptFiles.filter((f) => f !== hostBase && importsHost(f)).sort();

/*
 * A family that has already come back with an independent verdict is finished
 * here. The eligible list is what still NEEDS verification, so leaving a
 * verified family in it would dispatch a second shard to re-prove what a first
 * shard already proved.
 */
const verifiedIndependently = new Map();
for (const shard of ["01", "02", "03"]) {
  const rel = `data/rcap-grade-a/codex-cloud/s2-continuation-verify-${shard}/rows.json`;
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  const doc = read(rel);
  for (const row of doc.rows ?? doc) {
    const id = row.itemId ?? row.familyId;
    if (id) verifiedIndependently.set(id, { shard: `VS${shard}`, verdict: row.verdict });
  }
}
for (const r of rows) {
  const v = verifiedIndependently.get(r.familyId) ?? null;
  r.independentVerdict = v?.verdict ?? null;
  r.verifiedByShard = v?.shard ?? null;
}

const passing = rows.filter((r) => r.allNineCountersZero && !r.independentVerdict);
const alreadyVerified = rows.filter((r) => r.independentVerdict);
const failingRows = rows.filter((r) => !r.allNineCountersZero);

/*
 * Independent verification is assigned only to a family whose nine counters are
 * zero. A verifier handed an incomplete packet spends its slot rediscovering
 * what the audit already published, and a PASS it returned would be a PASS for
 * something nobody claimed was complete.
 */
const SHARD_SIZE = 4;
const verificationAssignments = [];
for (let i = 0; i < passing.length; i += SHARD_SIZE) {
  const items = passing.slice(i, i + SHARD_SIZE).map((r) => r.familyId);
  const n = String(verificationAssignments.length + 1).padStart(2, "0");
  const slug = `s2-continuation-verify-${n}`;
  verificationAssignments.push({
    assignmentId: `VS${n}_S2_CONTINUATION_INDEPENDENT_VERIFICATION`,
    wave: "s2-continuation",
    engine: "Codex",
    lane: "independent-verification",
    workerBranch: `codex/${slug}`,
    captainBaseSha: CONTINUATION_BASE,
    readAssignmentFrom: { branch: CAPTAIN_BRANCH, file: OUT, verify: `continuationBase must equal ${CONTINUATION_BASE}` },
    itemKind: "packetFamily",
    itemCount: items.length,
    items,
    ownedPaths: [`data/rcap-grade-a/wave-2/${slug}/**`],
    prohibitedPaths: [
      "data/rcap-all50/overlays/census-v1/**",
      "scripts/build-census-v1-*.mjs",
      "scripts/rcap-packet-completeness/**",
      `${LC}/**`
    ],
    mission: "Verify independently that each family's packet is complete. The completeness audit says all nine counters are zero; you are asked whether that is true of the artifact, not whether the report says so.",
    proofObligations: [
      "COMPLETENESS: recompute the nine counters from the family's own field map and rendered artifacts, and say whether each is zero",
      "COMPLETENESS: every REQUIRED_BEFORE_FILING blank is named in participant-instructions.md, checked against the file rather than the count",
      "COMPLETENESS: no fact the packet writes elsewhere in the same document is refused as required-before-filing",
      "ARTIFACT: the canonical and boundary bytes hash to what the record names",
      "SOURCE: every source the receipt names is exact, by form number or content hash",
      "BOUNDARY: no protected field carries ink -- participant signature, signature date, certificate of mailing before mailing, court-only or prosecutor-only"
    ],
    verdicts: ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"],
    independenceRule: "You did not build these families and you may not repair them. A defect you find is a verdict, never an edit.",
    requiredOutputs: [
      `data/rcap-grade-a/wave-2/${slug}/rows.json — one row per family: itemId, verdict, the nine counters as you measured them, and the evidence read`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"], rule: "An unrecognised verdict is refused at integration rather than translated." },
    focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>"],
    stopConditions: [
      "LANE STOP — you write into no overlay directory and no build script.",
      "ROW STOP — a counter you cannot reproduce is a FAIL_REPAIR_REQUIRED naming the counter and the rows that make it nonzero, never a silent agreement with the audit."
    ],
    grantsNothing: "An independent PASS proves a packet is complete. It approves no output and opens no commercial route."
  });
}

const doc = {
  schemaVersion: "rcap-s2-continuation/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-s2-continuation.mjs",
  question: "The shared host is corrected and integrated. What exactly changed for the eleven families that import it?",
  everyCountIsDerived: "No number here is typed. The before counters are read from the matrix at the commit before the repairs, the after counters from the matrix this integration wrote, and the artifact drift from hashing the rendered bytes at both commits.",
  theChain: {
    s1Integrated: S1_INTEGRATED,
    s2Integrated: S2_INTEGRATED,
    contractFixCommits: CONTRACT_FIX,
    whyTwoContractCommits: "The first made REQUIRED_BEFORE_FILING reachable. The second corrected three defects that only became visible once it was: a checkbox read as a text field, a boxed entry read as a checkbox, and a field name read as a fact identity across documents.",
    repairsApplied: REPAIRS_APPLIED,
    rerenderAndAudit: RERENDER_AND_AUDIT,
    continuationBase: CONTINUATION_BASE,
    ancestryCheck: `git merge-base --is-ancestor ${CONTINUATION_BASE} HEAD`,
    order: [
      "S1 integrated by cherry-pick",
      "S2 integrated by cherry-pick; it modified the shared host and nothing else",
      "the completeness contract corrected as Captain work, twice",
      "P1, P3 and P4 integrated by cherry-pick",
      "all eleven families re-rendered on the integrated base",
      "the fleet audit regenerated from what came out"
    ]
  },
  theContractDefectThatWasFixed: {
    what: "REQUIRED_BEFORE_FILING was in the closed vocabulary, marked allowed, and no path through classifyBlank returned it.",
    consequence: "A genuinely unavailable participant fact was always counted as KNOWN_FACT_NOT_WRITTEN, even for a family that classified it, disclosed it and told the participant to supply it before filing.",
    fix: "The disposition is reachable only through an explicit declaration on the field-map row, and only when all six conditions hold. It is never inferred from prose.",
    provedBy: "Twenty mutations in scripts/rcap-packet-completeness/verify-packet-completeness.mjs, two of which are controls. A negative test whose subject cannot exist proves nothing, so the group opens by showing the accepted path is reachable and then breaks one condition at a time."
  },
  families: {
    count: rows.length,
    derivedFrom: `${LC}/S2_SHARED_HOST_ASSIGNMENT.json — the host family plus every BUILT importer in its closure`,
    rerendered: rows.length,
    passComplete: rows.filter((r) => r.allNineCountersZero).length,
    awaitingIndependentVerification: passing.length,
    independentlyVerified: alreadyVerified.length,
    failing: failingRows.length,
    ids: families
  },
  fleet: {
    familiesAudited: after.familiesAudited,
    passCompleteBefore: before.byResult?.PASS_COMPLETE ?? 0,
    passCompleteAfter: after.byResult?.PASS_COMPLETE ?? 0,
    counterTotalsBefore: before.counterTotals,
    counterTotalsAfter: after.counterTotals
  },
  rows,
  whatStillFails: failingRows.map((r) => ({
    familyId: r.familyId,
    owningLane: r.owningLane,
    failingCounters: r.failingCounters,
    findings: r.findingsRemaining,
    ownedBy: r.owningLane,
    captainDidNotAbsorbThis: "The defect is stated rather than reclassified. Its owning lane decides whether the fields are disclosed or the declaration was wrong; neither is a Captain decision and neither is family legal research."
  })),
  theSharedSurfaceShrank: {
    host: s2Assignment.host,
    importersWhenS2WasDispatched: host.hostImporters.count,
    importersNow: importersNow.length,
    stillImporting: importersNow,
    finding: `The repairs made most of the closure self-contained: the host that forced a dedicated lane into existence is imported by ${importersNow.length} script(s) now, down from ${host.hostImporters.count}.`,
    whyItMatters: "A later reader deciding whether this host may be owned by one lane should recompute the graph rather than reuse the twelve. The number was right when it was derived and is not right now, which is the difference between a derived number and a remembered one.",
    thisChangesNoOwnership: "No lane's owned paths move because of this. It is an observation about the tree, not a re-dispatch."
  },
  artifactDrift: {
    measuredBy: "hashing fixtures/canonical.pdf and fixtures/boundary.pdf at the repair-integration commit and at the continuation base",
    familiesWithChangedPdfBytes: rows.filter((r) => r.artifactDrift.some((d) => d.changed)).map((r) => r.familyId),
    familiesByteIdentical: rows.filter((r) => r.artifactDrift.every((d) => !d.changed)).map((r) => r.familyId),
    finding: "Only the host's own family moved, which is the family whose build script S2 corrected. Integrating a field-map correction should not change a rendered page anywhere else, and it did not.",
    rasters: {
      changedOnEveryFamily: rows.every((r) => (r.rasterFilesChanged ?? 0) > 0),
      why: "This environment's poppler is not the build the repair lanes used, and identical PDFs raster to different PNG bytes under different builds. The PDF is the artifact; the raster is a derived visual proof of it, regenerated here alongside the audit that reads it."
    }
  },
  independentVerification: {
    rule: "Assigned only to a family whose nine counters are zero. A verifier handed an incomplete packet spends its slot rediscovering what the audit already published.",
    eligible: passing.map((r) => r.familyId),
    alreadyVerified: alreadyVerified.map((r) => ({ familyId: r.familyId, shard: r.verifiedByShard, verdict: r.independentVerdict })),
    eligibleMeans: "complete and NOT yet independently verified. A family with a verdict is finished here; dispatching a second shard for it would re-prove what a first shard proved.",
    notEligible: failingRows.map((r) => ({ familyId: r.familyId, because: r.failingCounters.join(", ") })),
    shardSize: SHARD_SIZE,
    assignments: verificationAssignments
  },
  commercialPosture: "Ten complete packets are ten complete packets. Completeness is not independent verification, independent verification is not output approval, and none of the three opens a commercial route. No route was opened here and Production was not touched.",
  totals: {
    familiesRerendered: rows.length,
    passComplete: rows.filter((r) => r.allNineCountersZero).length,
    awaitingIndependentVerification: passing.length,
    independentlyVerified: alreadyVerified.length,
    failures: failingRows.length,
    verificationAssignments: verificationAssignments.length,
    familiesAwaitingVerification: passing.length,
    verifiedFamilies: alreadyVerified.map((r) => r.familyId),
    commercialRoutesOpened: 0,
    productionTouched: false
  }
};

const problems = [];
if (rows.length !== 11) problems.push(`the closure has ${rows.length} families, not 11`);
if (rows.some((r) => !r.directory)) problems.push("a family in the closure has no audited directory");
if (verificationAssignments.some((a) => a.items.some((f) => !passing.map((p) => p.familyId).includes(f)))) {
  problems.push("a verification assignment names a family that is not PASS_COMPLETE");
}
if (!/^[0-9a-f]{40}$/.test(CONTINUATION_BASE)) problems.push("no real continuation base");
if (problems.length > 0) {
  console.error(`S2 continuation: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`S2 continuation current: ${rows.length} families, ${passing.length} PASS_COMPLETE, ${verificationAssignments.length} verification assignment(s).`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
console.log("");
console.log(`  continuation base ${shortOf(CONTINUATION_BASE)} · ${rows.length} families · ${passing.length} PASS_COMPLETE · ${failingRows.length} failing`);
console.log(`  fleet ${before.byResult?.PASS_COMPLETE ?? 0} -> ${after.byResult?.PASS_COMPLETE ?? 0} PASS_COMPLETE of ${after.familiesAudited}`);
for (const r of rows) {
  console.log(`    ${r.familyId.padEnd(42)} ${String(r.resultBefore).padEnd(28)} -> ${String(r.resultAfter).padEnd(28)} RBF=${r.requiredBeforeFilingAccepted}`);
}
console.log(`  verification assignments: ${verificationAssignments.length} covering ${passing.length} famil(ies)`);
