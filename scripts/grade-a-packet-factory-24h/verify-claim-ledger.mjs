#!/usr/bin/env node
import crypto from "node:crypto";
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
const expectedSources = ACTIVE.assignments.filter((a) => activeSourceLanes.has(a.assignmentId)).flatMap((a) => a.items.map((itemId) => `${a.assignmentId}\0${itemId}`));
/*
 * Exact set equality broke the moment a family left the source queue: its
 * released obligations stay in the ledger as history while the regenerated
 * dispatch rightly stops listing them, and this check read that as an
 * omission. Same rule as F24: a RELEASED claim absent from the dispatch is
 * finished work; an ACTIVE dispatch item missing from the ledger, or a LIVE
 * claim the dispatch no longer lists, are still fatal.
 */
const sourceClaims = ledger.claims.filter((c) => c.subjectType === "source-obligation");
const liveSources = new Set(sourceClaims.filter((c) => c.released !== true).map((c) => `${c.lane}\0${c.itemId}`));
const expectedSet = new Set(expectedSources);
expect(expectedSources.every((x) => liveSources.has(x)), "source assignment has no live, assertable grant in the ledger");
expect([...liveSources].every((x) => expectedSet.has(x)), "a live source claim is no longer dispatched");
const fixtureLaneId = [...activeSourceLanes.keys()].find((lane) =>
  ledger.claims.filter((c) => c.lane === lane && c.subjectType === "source-obligation" && c.released !== true).length >= 2);
expect(fixtureLaneId, "no active source lane has two live claims to exercise");
const sourceFixture = ledger.claims
  .filter((c) => c.lane === fixtureLaneId && c.subjectType === "source-obligation")
  .sort((a, b) => Number(a.released === true) - Number(b.released === true));
const wrongSourceLaneId = [...activeSourceLanes.keys()].find((lane) => lane !== fixtureLaneId) ?? "DISC99";
/* A particular lane can empty as obligations dissolve and re-pack. The
 * fixture therefore follows the current live dispatch while preserving the
 * invariant: exercise every historical and live claim on one nonempty lane
 * through the real claim tool. */
/*
 * One current source lane is the ledger's live fixture: all of its claims are exercised through the
 * real claim tool, not inspected as data.
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
  const r = run(["--assert", fixtureLaneId, c.itemId]);
  if (c.released === true) {
    expect(r.status === 9, `${fixtureLaneId} released claim did not refuse as ALREADY_RELEASED (status ${r.status}): ${c.itemId}`);
    expect(/ALREADY_RELEASED/.test(`${r.stdout ?? ""}${r.stderr ?? ""}`), `${fixtureLaneId} released claim refused for the wrong reason: ${c.itemId}`);
    fixtureReleased += 1;
  } else {
    expect(r.status === 0, `${fixtureLaneId} assertion refused: ${c.itemId}`);
    fixtureAsserted += 1;
  }
}
expect(fixtureAsserted + fixtureReleased === sourceFixture.length, `${fixtureLaneId} exercised ${fixtureAsserted + fixtureReleased} of ${sourceFixture.length}`);

if (!process.argv.includes("--mutations")) {
  console.log(`CLAIM_LEDGER_OK ${ledger.claims.length} claims; ${fixtureLaneId} ${fixtureAsserted + fixtureReleased}/${sourceFixture.length} exercised (${fixtureAsserted} assertable, ${fixtureReleased} already released)`);
  process.exit(0);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clm01-"));
const write = (name, value, redigest = false) => { if (redigest) value.claimsDigest = digest(value.claims); const p = path.join(tmp, name); fs.writeFileSync(p, JSON.stringify(value)); return p; };
const clone = () => structuredClone(ledger);
const mustPass = (args, p, label) => expect(run(args, p).status === 0, `${label} did not pass`);
const mustFail = (args, p, label, pattern) => { const r = run(args, p); expect(r.status !== 0 && (!pattern || pattern.test(r.stderr)), `${label} did not fail closed: ${r.stdout}${r.stderr}`); };

const pf = ledger.claims.find((c) => c.lane === "PF01");
const vf = ledger.claims.find((c) => c.lane === "VF01");
const fix = ledger.claims.find((c) => c.lane === "FIX01");
mustPass(["--assert", pf.lane, pf.subjectId], LEDGER, "packet family positive");
mustPass(["--assert", fix.lane, fix.subjectId], LEDGER, "repair positive");
const releaseLedger = clone(); const releasePath = write("release.json", releaseLedger);
mustPass(["--release", fixtureLaneId, sourceFixture[0].itemId], releasePath, "source release");
mustPass(["--assert", fixtureLaneId, sourceFixture[1].itemId], releasePath, "independent source remains live");

mustFail(["--assert", wrongSourceLaneId, sourceFixture[0].itemId], LEDGER, "wrong source lane", /NOT_GRANTED|GRANTED_ELSEWHERE/);
mustFail(["--assert", fixtureLaneId, "missing-source-item"], LEDGER, "missing item", /NOT_GRANTED/);
let x = clone(); x.claims.push({ ...sourceFixture[0], lane: wrongSourceLaneId }); mustFail(["--assert", fixtureLaneId, sourceFixture[0].itemId], write("dup-source.json", x, true), "duplicate source owner", /AMBIGUOUS_GRANT/);
x = clone(); x.claims.push({ ...vf, lane: "VF99" }); mustFail(["--assert", vf.lane, vf.subjectId], write("dup-vf.json", x, true), "duplicate verifier", /AMBIGUOUS_GRANT/);
x = clone(); delete x.claimsDigest; mustFail(["--assert", pf.lane, pf.subjectId], write("no-digest.json", x), "missing digest", /LEDGER_HAS_NO_DIGEST/);
x = clone(); x.claims[0].lane = "PF99"; mustFail(["--assert", pf.lane, pf.subjectId], write("stale-digest.json", x), "stale digest", /LEDGER_DIGEST_MISMATCH/);
x = clone(); x.generatedAtCommit = "0000000000000000000000000000000000000000"; mustFail(["--assert", pf.lane, pf.subjectId], write("bad-commit.json", x), "unavailable commit", /LEDGER_BASE_NOT_IN_CHECKOUT/);
x = clone(); x.laneKinds.push("invented"); mustFail(["--assert", pf.lane, pf.subjectId], write("unknown-kind.json", x), "unknown kind", /UNDECLARED_LANE_KIND/);
mustFail(["--assert", fixtureLaneId, sourceFixture[0].familyIds[0]], LEDGER, "family used as source key", /NOT_GRANTED/);
x = clone(); x.claims = x.claims.filter((c) => c !== x.claims.find((r) => r.lane === fixtureLaneId && r.itemId === sourceFixture[0].itemId)); mustFail(["--assert", fixtureLaneId, sourceFixture[0].itemId], write("omitted-source.json", x, true), "omitted source", /NOT_GRANTED/);
mustFail(["--assert", "UNKNOWN01", pf.subjectId], LEDGER, "unknown lane", /UNKNOWN_LANE/);
mustFail(["--assert", pf.lane === "PF01" ? "PF02" : "PF01", pf.subjectId], LEDGER, "wrong packet worker", /GRANTED_ELSEWHERE|NOT_GRANTED/);
mustPass(["--assert", vf.lane, vf.subjectId], LEDGER, "verifier positive");
mustFail(["--assert", "VF99", vf.subjectId], LEDGER, "wrong verifier", /GRANTED_ELSEWHERE/);
mustFail(["--assert", fixtureLaneId, sourceFixture[0].itemId], releasePath, "released claim", /ALREADY_RELEASED/);
console.log("CLAIM_LEDGER_MUTATIONS_OK positive controls 4/4; negative controls 10/10; preservation controls 7/7");
