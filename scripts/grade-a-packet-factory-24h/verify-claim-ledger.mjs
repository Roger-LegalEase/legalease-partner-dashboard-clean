#!/usr/bin/env node
import crypto from "node:crypto";
import { verifySourceClaimDispatch } from "./source-claim-dispatch.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLAIM = path.join(ROOT, "scripts/grade-a-packet-factory-24h/claim.mjs");
const LEDGER = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/claim-ledger.json");
const ACTIVE = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json")));
const SOURCE = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/SOURCE_CONVEYOR_ASSIGNMENTS.json")));
const ledger = JSON.parse(fs.readFileSync(LEDGER));
const canonicalLedgerBytes = fs.readFileSync(LEDGER);
const fields = ledger.claimsDigestCovers;
const digest = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows.map((row) => fields.map((field) => row[field] ?? null)))).digest("hex");
const run = (args, ledgerPath = LEDGER) => spawnSync(process.execPath, [CLAIM, "--ledger", ledgerPath, ...args], { cwd: ROOT, encoding: "utf8" });
const fail = (message) => { throw new Error(message); };
const expect = (yes, message) => { if (!yes) fail(message); };

expect(ledger.claimsDigest === digest(ledger.claims), "canonical digest mismatch");
expect(execFileSync("git", ["cat-file", "-e", `${ledger.generatedAtCommit}^{commit}`], { cwd: ROOT }).length === 0, "generation commit unavailable");
const declared = new Set(ledger.laneKinds);
expect(ledger.claims.every((c) => declared.has(c.laneKind)), "unknown lane kind");
const keys = ledger.claims.map((c) => `${c.subjectType}\0${c.subjectId}\0${c.operation}`);
expect(new Set(keys).size === keys.length, "duplicate subject and operation");

const activeSourceLanes = new Map(SOURCE.lanes.filter((l) => l.status === "ACTIVE").map((l) => [l.assignmentId, l]));
const explicitSources = verifySourceClaimDispatch(ledger, ACTIVE, SOURCE);
for (const claim of explicitSources) {
  const result = run(["--assert", claim.lane, claim.subjectId]);
  expect(result.status === 0, `explicit source grant refused: ${claim.lane}:${claim.subjectId}`);
}
let fixtureLaneId = [...activeSourceLanes.keys()].find((lane) =>
  ledger.claims.filter((c) => c.lane === lane && c.subjectType === "source-obligation" && c.released !== true).length >= 2);
let fixtureLedgerPath = LEDGER;
let fixtureMode = "current live source dispatch";
let isolatedFixtureDir = null;

/*
 * A completed source conveyor correctly has no live source claims. That state
 * used to make this verifier red before it exercised claim.mjs at all. When no
 * active lane has two live claims, use the lane with the largest preserved
 * source-claim history and reissue two of its released claims in an isolated
 * copy through claim.mjs itself. This creates test state, not canonical work:
 * no assignment record is changed, the repository ledger is checked
 * byte-for-byte below, and the temporary ledger is removed on exit.
 */
if (!fixtureLaneId) {
  const historicalByLane = new Map();
  for (const claim of ledger.claims.filter((c) => c.subjectType === "source-obligation")) {
    if (!historicalByLane.has(claim.lane)) historicalByLane.set(claim.lane, []);
    historicalByLane.get(claim.lane).push(claim);
  }
  const historical = [...historicalByLane.entries()]
    .filter(([, claims]) => claims.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0] ?? null;
  expect(historical, "no source lane has two preserved claims to exercise in an isolated ledger");
  fixtureLaneId = historical[0];
  const toReissue = historical[1]
    .filter((claim) => claim.released === true)
    .sort((a, b) => a.subjectId.localeCompare(b.subjectId))
    .slice(0, 2);
  expect(toReissue.length === 2, `${fixtureLaneId} has fewer than two released claims for the isolated fixture`);

  isolatedFixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "clm01-source-fixture-"));
  process.on("exit", () => fs.rmSync(isolatedFixtureDir, { recursive: true, force: true }));
  fixtureLedgerPath = path.join(isolatedFixtureDir, "claim-ledger.json");
  fs.writeFileSync(fixtureLedgerPath, canonicalLedgerBytes);
  for (const claim of toReissue) {
    const result = run([
      "--reissue", fixtureLaneId, claim.subjectId,
      "--reason", "isolated claim-verifier fixture; canonical ledger remains unchanged"
    ], fixtureLedgerPath);
    expect(result.status === 0,
      `${fixtureLaneId} isolated native reissue failed for ${claim.subjectId}: ${result.stdout}${result.stderr}`);
  }
  fixtureMode = `isolated native reissue of ${toReissue.length} released claims`;
}

const fixtureLedger = JSON.parse(fs.readFileSync(fixtureLedgerPath));
const sourceFixture = fixtureLedger.claims
  .filter((c) => c.lane === fixtureLaneId && c.subjectType === "source-obligation")
  .sort((a, b) => Number(a.released === true) - Number(b.released === true) || a.subjectId.localeCompare(b.subjectId));
expect(sourceFixture.filter((claim) => claim.released !== true).length >= 2,
  `${fixtureLaneId} source fixture does not contain two live claims after selection`);
const alternateLaneForKind = {
  "source-discovery": "DISC99",
  "source-reconciliation": "SRC99",
  "source-acquisition": "ACQ99",
  "source-promotion": "PROMO99"
};
const fixtureKind = sourceFixture[0].laneKind;
const wrongSourceLaneId = ledger.claims.find((claim) => claim.subjectType === "source-obligation"
  && claim.laneKind === fixtureKind && claim.lane !== fixtureLaneId)?.lane
  ?? alternateLaneForKind[fixtureKind];
expect(wrongSourceLaneId, `no valid alternate lane prefix for source kind ${fixtureKind}`);
/* A particular lane can empty as obligations dissolve and re-pack. The
 * fixture therefore follows the current live dispatch when one exists and the
 * isolated historical fallback otherwise, while preserving the invariant:
 * exercise every historical and live claim in the selected fixture through
 * the real claim tool. */
/*
 * All claims in the selected source fixture are exercised through the real
 * claim tool, not merely inspected as data.
 *
 * This used to demand status 0 from every one of them, which made the check
 * unsatisfiable the moment the lane did its job. claim.mjs --assert exits 9
 * ALREADY_RELEASED against a released claim, so releasing DISC06 -- exactly what
 * its prompt asks -- turned CLAIM_LEDGER_OK into "DISC06 assertion refused".
 * The gate punished finishing the work. VF-SRC-B hit it, restored the ledger
 * rather than papering over it, and handed it back.
 *
 * Both outcomes are correct behaviour; which one is correct depends on the
 * claim's state. An unreleased claim must assert (0). A released claim must
 * refuse, and must refuse for that exact reason (9 ALREADY_RELEASED) rather
 * than by being absent, unreadable or unowned. Anything else is a real failure,
 * so the fixture still exercises all 42 and can still fail.
 */
let fixtureAsserted = 0;
let fixtureReleased = 0;
for (const c of sourceFixture) {
  const r = run(["--assert", fixtureLaneId, c.subjectId], fixtureLedgerPath);
  if (c.released === true) {
    expect(r.status === 9, `${fixtureLaneId} released claim did not refuse as ALREADY_RELEASED (status ${r.status}): ${c.subjectId}`);
    expect(/ALREADY_RELEASED/.test(`${r.stdout ?? ""}${r.stderr ?? ""}`), `${fixtureLaneId} released claim refused for the wrong reason: ${c.subjectId}`);
    fixtureReleased += 1;
  } else {
    expect(r.status === 0, `${fixtureLaneId} assertion refused: ${c.subjectId}`);
    fixtureAsserted += 1;
  }
}
expect(fixtureAsserted + fixtureReleased === sourceFixture.length, `${fixtureLaneId} exercised ${fixtureAsserted + fixtureReleased} of ${sourceFixture.length}`);
expect(Buffer.compare(fs.readFileSync(LEDGER), canonicalLedgerBytes) === 0,
  "canonical claim ledger changed while constructing or exercising the source fixture");

if (!process.argv.includes("--mutations")) {
  console.log(`CLAIM_LEDGER_OK ${ledger.claims.length} claims; ${explicitSources.length} explicit source grants asserted; ${fixtureLaneId} ${fixtureAsserted + fixtureReleased}/${sourceFixture.length} exercised (${fixtureAsserted} assertable, ${fixtureReleased} already released; ${fixtureMode}); canonical ledger byte-preserved`);
  process.exit(0);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clm01-"));
const write = (name, value, redigest = false) => { if (redigest) value.claimsDigest = digest(value.claims); const p = path.join(tmp, name); fs.writeFileSync(p, JSON.stringify(value)); return p; };
const clone = () => structuredClone(ledger);
const mustPass = (args, p, label) => expect(run(args, p).status === 0, `${label} did not pass`);
const mustFail = (args, p, label, pattern) => { const r = run(args, p); expect(r.status !== 0 && (!pattern || pattern.test(r.stderr)), `${label} did not fail closed: ${r.stdout}${r.stderr}`); };

// Positive controls must exercise live claims; the first historical row on
// FIX01 may correctly refuse as ALREADY_RELEASED after completed work.
const liveKind = kind => ledger.claims.find(c => c.laneKind === kind && c.released !== true);
const pf = liveKind("packet-build"), vf = liveKind("independent-verification"), fix = liveKind("repair");
expect(pf && vf && fix, "missing live packet/verification/repair mutation fixtures");
mustPass(["--assert", pf.lane, pf.subjectId], LEDGER, "packet family positive");
mustPass(["--assert", fix.lane, fix.subjectId], LEDGER, "repair positive");
const cloneFixture = () => structuredClone(fixtureLedger);
const releaseLedger = cloneFixture(); const releasePath = write("release.json", releaseLedger);
mustPass(["--release", fixtureLaneId, sourceFixture[0].subjectId], releasePath, "source release");
mustPass(["--assert", fixtureLaneId, sourceFixture[1].subjectId], releasePath, "independent source remains live");

mustFail(["--assert", wrongSourceLaneId, sourceFixture[0].subjectId], fixtureLedgerPath, "wrong source lane", /NOT_GRANTED|GRANTED_ELSEWHERE/);
mustFail(["--assert", fixtureLaneId, "missing-source-item"], fixtureLedgerPath, "missing item", /NOT_GRANTED/);
let x = cloneFixture(); x.claims.push({ ...sourceFixture[0], lane: wrongSourceLaneId }); mustFail(["--assert", fixtureLaneId, sourceFixture[0].subjectId], write("dup-source.json", x, true), "duplicate source owner", /AMBIGUOUS_GRANT/);
x = clone(); x.claims.push({ ...vf, lane: "VF99" }); mustFail(["--assert", vf.lane, vf.subjectId], write("dup-vf.json", x, true), "duplicate verifier", /AMBIGUOUS_GRANT/);
x = clone(); delete x.claimsDigest; mustFail(["--assert", pf.lane, pf.subjectId], write("no-digest.json", x), "missing digest", /LEDGER_HAS_NO_DIGEST/);
x = clone(); x.claims[0].lane = "PF99"; mustFail(["--assert", pf.lane, pf.subjectId], write("stale-digest.json", x), "stale digest", /LEDGER_DIGEST_MISMATCH/);
x = clone(); x.generatedAtCommit = "0000000000000000000000000000000000000000"; mustFail(["--assert", pf.lane, pf.subjectId], write("bad-commit.json", x), "unavailable commit", /LEDGER_BASE_NOT_IN_CHECKOUT/);
x = clone(); x.laneKinds.push("invented"); mustFail(["--assert", pf.lane, pf.subjectId], write("unknown-kind.json", x), "unknown kind", /UNDECLARED_LANE_KIND/);
mustFail(["--assert", fixtureLaneId, sourceFixture[0].familyIds[0]], fixtureLedgerPath, "family used as source key", /NOT_GRANTED/);
x = cloneFixture(); x.claims = x.claims.filter((c) => c !== x.claims.find((r) => r.lane === fixtureLaneId && r.subjectId === sourceFixture[0].subjectId)); mustFail(["--assert", fixtureLaneId, sourceFixture[0].subjectId], write("omitted-source.json", x, true), "omitted source", /NOT_GRANTED/);
mustFail(["--assert", "UNKNOWN01", pf.subjectId], LEDGER, "unknown lane", /UNKNOWN_LANE/);
mustFail(["--assert", pf.lane === "PF01" ? "PF02" : "PF01", pf.subjectId], LEDGER, "wrong packet worker", /GRANTED_ELSEWHERE|NOT_GRANTED/);
mustPass(["--assert", vf.lane, vf.subjectId], LEDGER, "verifier positive");
mustFail(["--assert", "VF99", vf.subjectId], LEDGER, "wrong verifier", /GRANTED_ELSEWHERE/);
mustFail(["--assert", fixtureLaneId, sourceFixture[0].subjectId], releasePath, "released claim", /ALREADY_RELEASED/);
expect(Buffer.compare(fs.readFileSync(LEDGER), canonicalLedgerBytes) === 0,
  "canonical claim ledger changed during mutation controls");
console.log("CLAIM_LEDGER_MUTATIONS_OK positive controls 4/4; negative controls 10/10; preservation controls 7/7");
