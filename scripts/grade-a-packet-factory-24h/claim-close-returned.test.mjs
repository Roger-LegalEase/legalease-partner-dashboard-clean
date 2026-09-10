/*
 * The regression this file exists for, in one sentence: a local lane that has
 * returned kept its grants, so 116 grants across 40 lanes over 87 families read
 * LIVE while nothing executed them, and every dispatch refused at the gate.
 *
 * Each test drives claim.mjs as a process against a temporary ledger, because
 * the gate is the script and a test that models it instead of running it is the
 * exact defect dispatch-preflight.mjs already had once.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLAIM = path.join(HERE, "claim.mjs");
const ROOT = path.resolve(HERE, "../..");

const claim = (args) => spawnSync(process.execPath, [CLAIM, ...args], { cwd: ROOT, encoding: "utf8" });

/* The ledger a test writes must satisfy the real validate(): the closed lane-kind
 * vocabulary, a digest over the real DIGEST_FIELDS, and a base commit this
 * checkout contains. Importing them keeps the fixture honest -- a hand-typed
 * digest would test a ledger the gate would reject in production. */
const { CLOSED_LANE_KINDS, claimsDigest } = await import(CLAIM);
const HEAD = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const ledgerWith = (claims) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claim-close-"));
  const file = path.join(dir, "ledger.json");
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: "rcap-claim-ledger/v2",
    generatedBy: "claim-close-returned.test.mjs",
    generatedAtCommit: HEAD,
    laneKinds: CLOSED_LANE_KINDS,
    claims,
    claimsDigest: claimsDigest(claims)
  }, null, 2));
  return file;
};

const familyClaim = (lane, subjectId, laneKind, operation) => ({
  subjectType: "packet-family", subjectId, itemId: null, familyId: subjectId, familyIds: [subjectId],
  sourceId: null, operation, lane, laneKind, released: false, releasedAt: null
});

/* A lane whose rows are committed in this tree. vf36 is real: it committed
 * rows-vf36-*.json and returned. The test asserts the mechanism, not vf36. */
const RETURNED_LOCAL_LANE = "VF36";

test("a returned local lane's stale claims are closed on its committed return", () => {
  const ledger = ledgerWith([
    familyClaim(RETURNED_LOCAL_LANE, "test-family-a", "independent-verification", "independent-verification"),
    familyClaim(RETURNED_LOCAL_LANE, "test-family-b", "independent-verification", "independent-verification")
  ]);
  const run = claim(["--ledger", ledger, "--close-returned", RETURNED_LOCAL_LANE, "--reason", "returned; assignment finished"]);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /CLOSED 2 grant\(s\)/);
  const after = JSON.parse(fs.readFileSync(ledger, "utf8"));
  assert.equal(after.claims.filter((c) => !c.released).length, 0);
  assert.equal(after.releases.length, 2);
  assert.equal(after.releases[0].closedAtReturnBoundary, true);
  assert.ok(after.releases[0].returnEvidence.file, "the release records WHERE the return is");
});

test("a lane with no committed return is refused, however old its claim", () => {
  const ledger = ledgerWith([familyClaim("VF9999", "test-family-c", "independent-verification", "independent-verification")]);
  const run = claim(["--ledger", ledger, "--close-returned", "VF9999", "--reason", "looks idle"]);
  assert.equal(run.status, 19);
  assert.match(run.stderr, /NO_RETURN_EVIDENCE/);
  assert.match(run.stderr, /not stale because it is old/);
  const after = JSON.parse(fs.readFileSync(ledger, "utf8"));
  assert.equal(after.claims.filter((c) => !c.released).length, 1, "an active owner keeps its grant");
});

test("a remote PF owner is refused even though it has no local process", () => {
  const ledger = ledgerWith([familyClaim("PF24", "test-family-d", "packet-build", "packet-build")]);
  const run = claim(["--ledger", ledger, "--close-returned", "PF24", "--reason", "no local process visible"]);
  assert.equal(run.status, 17);
  assert.match(run.stderr, /REMOTE_OWNER/);
  const after = JSON.parse(fs.readFileSync(ledger, "utf8"));
  assert.equal(after.claims.filter((c) => !c.released).length, 1);
});

test("a remote SRC owner is refused on the same ground", () => {
  const ledger = ledgerWith([{ subjectType: "source-obligation", subjectId: "test-source", itemId: null, familyId: null,
    familyIds: [], sourceId: "test-source", operation: "held-inventory-reconciliation", lane: "SRC01",
    laneKind: "source-reconciliation", released: false, releasedAt: null }]);
  const run = claim(["--ledger", ledger, "--close-returned", "SRC01", "--reason", "quiet"]);
  assert.equal(run.status, 17);
  assert.match(run.stderr, /REMOTE_OWNER/);
});

test("a return commit that this repository does not contain is refused", () => {
  const ledger = ledgerWith([familyClaim("VF9999", "test-family-e", "independent-verification", "independent-verification")]);
  const run = claim(["--ledger", ledger, "--close-returned", "VF9999", "--reason", "returned",
    "--returned-at", "0000000000000000000000000000000000000000"]);
  assert.equal(run.status, 18);
  assert.match(run.stderr, /RETURN_COMMIT_NOT_IN_THIS_REPOSITORY/);
});

test("closing requires a stated reason", () => {
  const ledger = ledgerWith([familyClaim(RETURNED_LOCAL_LANE, "test-family-f", "independent-verification", "independent-verification")]);
  const run = claim(["--ledger", ledger, "--close-returned", RETURNED_LOCAL_LANE]);
  assert.equal(run.status, 10);
  assert.match(run.stderr, /CLOSE_NEEDS_REASON/);
});

test("--ownership writes nothing and closes nothing", () => {
  const ledger = ledgerWith([
    familyClaim(RETURNED_LOCAL_LANE, "test-family-g", "independent-verification", "independent-verification"),
    familyClaim("PF24", "test-family-h", "packet-build", "packet-build")
  ]);
  const before = fs.readFileSync(ledger, "utf8");
  const run = claim(["--ledger", ledger, "--ownership"]);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /remote_owner_not_judged_from_here/);
  assert.match(run.stdout, /has_committed_output_here/);
  assert.match(run.stdout, /NECESSARY condition/);
  assert.equal(fs.readFileSync(ledger, "utf8"), before, "a reconciliation report is not a write");
});
