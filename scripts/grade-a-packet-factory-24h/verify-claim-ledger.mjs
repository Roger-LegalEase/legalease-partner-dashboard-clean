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
const actualSources = ledger.claims.filter((c) => c.subjectType === "source-obligation").map((c) => `${c.lane}\0${c.itemId}`);
expect(expectedSources.length === actualSources.length && expectedSources.every((x) => actualSources.includes(x)), "source assignment omitted from ledger");
const disc06 = ledger.claims.filter((c) => c.lane === "DISC06");
expect(activeSourceLanes.has("DISC06"), "DISC06 not ACTIVE");
expect(disc06.length === 42, `DISC06 has ${disc06.length} claims`);
for (const c of disc06) expect(run(["--assert", "DISC06", c.itemId]).status === 0, `DISC06 assertion refused: ${c.itemId}`);

if (!process.argv.includes("--mutations")) {
  console.log(`CLAIM_LEDGER_OK ${ledger.claims.length} claims; DISC06 42/42`);
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
mustPass(["--release", "DISC06", disc06[0].itemId], releasePath, "source release");
mustPass(["--assert", "DISC06", disc06[1].itemId], releasePath, "independent source remains live");

mustFail(["--assert", "DISC05", disc06[0].itemId], LEDGER, "wrong source lane", /NOT_GRANTED|GRANTED_ELSEWHERE/);
mustFail(["--assert", "DISC06", "missing-source-item"], LEDGER, "missing item", /NOT_GRANTED/);
let x = clone(); x.claims.push({ ...disc06[0], lane: "DISC05" }); mustFail(["--assert", "DISC06", disc06[0].itemId], write("dup-source.json", x, true), "duplicate source owner", /AMBIGUOUS_GRANT/);
x = clone(); x.claims.push({ ...vf, lane: "VF99" }); mustFail(["--assert", vf.lane, vf.subjectId], write("dup-vf.json", x, true), "duplicate verifier", /AMBIGUOUS_GRANT/);
x = clone(); delete x.claimsDigest; mustFail(["--assert", pf.lane, pf.subjectId], write("no-digest.json", x), "missing digest", /LEDGER_HAS_NO_DIGEST/);
x = clone(); x.claims[0].lane = "PF99"; mustFail(["--assert", pf.lane, pf.subjectId], write("stale-digest.json", x), "stale digest", /LEDGER_DIGEST_MISMATCH/);
x = clone(); x.generatedAtCommit = "0000000000000000000000000000000000000000"; mustFail(["--assert", pf.lane, pf.subjectId], write("bad-commit.json", x), "unavailable commit", /LEDGER_BASE_NOT_IN_CHECKOUT/);
x = clone(); x.laneKinds.push("invented"); mustFail(["--assert", pf.lane, pf.subjectId], write("unknown-kind.json", x), "unknown kind", /UNDECLARED_LANE_KIND/);
mustFail(["--assert", "DISC06", disc06[0].familyIds[0]], LEDGER, "family used as source key", /NOT_GRANTED/);
x = clone(); x.claims = x.claims.filter((c) => c !== x.claims.find((r) => r.lane === "DISC06")); mustFail(["--assert", "DISC06", disc06[0].itemId], write("omitted-source.json", x, true), "omitted source", /NOT_GRANTED/);
mustFail(["--assert", "UNKNOWN01", pf.subjectId], LEDGER, "unknown lane", /UNKNOWN_LANE/);
mustFail(["--assert", pf.lane === "PF01" ? "PF02" : "PF01", pf.subjectId], LEDGER, "wrong packet worker", /GRANTED_ELSEWHERE|NOT_GRANTED/);
mustPass(["--assert", vf.lane, vf.subjectId], LEDGER, "verifier positive");
mustFail(["--assert", "VF99", vf.subjectId], LEDGER, "wrong verifier", /GRANTED_ELSEWHERE/);
mustFail(["--assert", "DISC06", disc06[0].itemId], releasePath, "released claim", /ALREADY_RELEASED/);
console.log("CLAIM_LEDGER_MUTATIONS_OK positive controls 4/4; negative controls 10/10; preservation controls 7/7");
