#!/usr/bin/env node
/**
 * The one claim mechanism. There is no lane-specific improvisation.
 *
 *   node scripts/grade-a-packet-factory-24h/claim.mjs --assert <LANE> <familyId>
 *   node scripts/grade-a-packet-factory-24h/claim.mjs --release <LANE> <familyId>
 *   node scripts/grade-a-packet-factory-24h/claim.mjs --status [<LANE>]
 *
 * VF12 returned BLOCKED_BEFORE_CLAIM because the ledger its prompt named did
 * not exist. It was right to stop. This is the ledger, and this is the only
 * program that reads or writes it.
 *
 * WHERE THE ATOMICITY ACTUALLY COMES FROM
 *
 * Workers run in isolated Codex Cloud containers. They share no filesystem, no
 * lock and no network channel, so two workers cannot contend for a row at run
 * time -- and a mechanism that pretended otherwise would be a race dressed up
 * as a protocol. Atomicity here comes from there being exactly ONE WRITER:
 * Captain assigns every family to exactly one lane of each kind when the
 * dispatch is generated, and the assignment is committed before any worker
 * starts. The ledger is that commitment, written once and read many times.
 *
 * So a worker does not acquire a claim. It ASSERTS one:
 *
 *   - the ledger grants this family to this lane, and to no other lane of the
 *     same kind; and
 *   - the ledger was generated from a commit its checkout contains.
 *
 * If either is false the worker stops before reading a single artifact, which
 * is exactly what VF12 did. A verifier that reads a packet it was not granted
 * is duplicate work reported as independent proof.
 *
 * A release is recorded locally and returned in the lane's diff. Captain
 * integrates it; a worker's own copy of the ledger is evidence, not authority.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const LEDGER = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";

/* A lane KIND, not a lane. A builder and a verifier holding one family is the
 * design; two verifiers holding it is the collision. */
export const LANE_KIND = (lane) => {
  if (/^VF/.test(lane) || /^WARV/.test(lane) || /^P2V/.test(lane) || /^VS/.test(lane)) return "independent-verification";
  if (/^FIX/.test(lane) || /^WAR0[34]/.test(lane)) return "repair";
  if (/^PF/.test(lane)) return "packet-build";
  if (/^(DISC|SRC|ACQ|PROMO|WAR02)/.test(lane)) return "source";
  if (/^WAR01/.test(lane)) return "shared-host-repair";
  return "unknown";
};

const read = () => {
  const p = path.join(ROOT, LEDGER);
  if (!fs.existsSync(p)) {
    console.error(`CLAIM_LEDGER_ABSENT: ${LEDGER} is not in this checkout.`);
    console.error("Stop the lane here. Do not read, verify or write any packet artifact.");
    console.error("Report laneStatus BLOCKED_BEFORE_CLAIM naming this path, and nothing else.");
    process.exit(3);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
};

const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

function assertClaim(lane, familyId) {
  const ledger = read();
  const kind = LANE_KIND(lane);
  if (kind === "unknown") { console.error(`UNKNOWN_LANE: ${lane} is not a lane this ledger knows.`); process.exit(4); }

  // The ledger must have been generated from a commit this checkout carries,
  // or the grants describe a dispatch the worker cannot see.
  const base = ledger.generatedAtCommit;
  if (base && git(["cat-file", "-e", `${base}^{commit}`]) === null) {
    console.error(`LEDGER_BASE_NOT_IN_CHECKOUT: the ledger was generated at ${base}, which this checkout does not contain.`);
    console.error("Stop. Report BLOCKED_BEFORE_CLAIM; a grant you cannot place in history is not a grant.");
    process.exit(5);
  }

  /*
   * The ledger must describe its own grants. C13 showed that generatedAtCommit
   * is a declared floor: it did not move when thirteen grants were revoked, so
   * the pre- and post-revocation ledgers were indistinguishable and a stale
   * worker asserted a withdrawn grant. The digest is a function of the grants,
   * so it moves whenever they do -- and a ledger whose digest does not describe
   * its own claims is a hand-edited ledger.
   */
  const rows = ledger.claims ?? [];
  const digest = crypto.createHash("sha256")
    .update(JSON.stringify(rows.map((c) => [c.familyId, c.lane, c.laneKind])))
    .digest("hex");
  if (!ledger.claimsDigest) {
    console.error("LEDGER_HAS_NO_DIGEST: this ledger predates grant-set identity and cannot say which dispatch it is.");
    console.error("Stop. Report BLOCKED_BEFORE_CLAIM naming this; Captain must regenerate the dispatch.");
    process.exit(10);
  }
  if (ledger.claimsDigest !== digest) {
    console.error(`LEDGER_DIGEST_MISMATCH: the ledger declares ${ledger.claimsDigest} and its ${rows.length} grants hash to ${digest}.`);
    console.error("Stop. A ledger that does not describe its own grants was edited by something that is not the generator.");
    process.exit(11);
  }

  const grants = rows.filter((c) => c.familyId === familyId && c.laneKind === kind);
  if (grants.length === 0) {
    console.error(`NOT_GRANTED: no ${kind} lane holds ${familyId} in this ledger.`);
    console.error("Stop. Do not read its artifacts.");
    process.exit(6);
  }
  if (grants.length > 1) {
    console.error(`AMBIGUOUS_GRANT: ${familyId} is granted to ${grants.length} ${kind} lanes (${grants.map((g) => g.lane).join(", ")}).`);
    console.error("Stop. This is a Captain-side collision and no worker may resolve it.");
    process.exit(7);
  }
  const grant = grants[0];
  if (grant.lane !== lane) {
    console.error(`GRANTED_ELSEWHERE: ${familyId} is granted to ${grant.lane}, not ${lane}.`);
    console.error("Stop. Reading it anyway is duplicate work reported as independent proof.");
    process.exit(8);
  }
  if (grant.released === true) {
    console.error(`ALREADY_RELEASED: ${familyId} was released by ${lane} at ${grant.releasedAt}.`);
    process.exit(9);
  }
  console.log(`CLAIM_OK ${lane} ${familyId} (${kind}, granted at ${ledger.generatedAtCommit ?? "unpinned"}, grant set ${digest.slice(0, 16)})`);
  console.log("Report the grant set with your return. A return naming a grant set Captain has superseded acted on withdrawn grants.");
  return 0;
}

function release(lane, familyId) {
  const ledger = read();
  const kind = LANE_KIND(lane);
  const grant = (ledger.claims ?? []).find((c) => c.familyId === familyId && c.laneKind === kind && c.lane === lane);
  if (!grant) { console.error(`NOT_GRANTED: ${lane} does not hold ${familyId}; there is nothing to release.`); process.exit(6); }
  grant.released = true;
  grant.releasedAt = new Date().toISOString();
  ledger.releases = (ledger.releases ?? []).concat([{ lane, familyId, laneKind: kind, releasedAt: grant.releasedAt }]);
  fs.writeFileSync(path.join(ROOT, LEDGER), `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`RELEASED ${lane} ${familyId}. Leave this in your diff; Captain integrates it.`);
  return 0;
}

function status(lane) {
  const ledger = read();
  const claims = (ledger.claims ?? []).filter((c) => !lane || c.lane === lane);
  const held = claims.filter((c) => !c.released);
  console.log(`ledger at ${ledger.generatedAtCommit ?? "unpinned"} — ${claims.length} grant(s)${lane ? ` for ${lane}` : ""}, ${held.length} still held`);
  for (const c of held.slice(0, 40)) console.log(`  ${c.lane.padEnd(10)} ${c.laneKind.padEnd(24)} ${c.familyId}`);
  if (held.length > 40) console.log(`  ... and ${held.length - 40} more`);
  return 0;
}

const argv = process.argv.slice(2);
const mode = argv[0];
if (mode === "--assert") process.exit(assertClaim(argv[1], argv[2]));
else if (mode === "--release") process.exit(release(argv[1], argv[2]));
else if (mode === "--status") process.exit(status(argv[1]));
else {
  console.error("usage: claim.mjs --assert <LANE> <familyId> | --release <LANE> <familyId> | --status [<LANE>]");
  process.exit(2);
}
