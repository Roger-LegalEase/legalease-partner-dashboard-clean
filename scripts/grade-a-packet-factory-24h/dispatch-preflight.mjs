#!/usr/bin/env node
/*
 * BEFORE A LANE IS DISPATCHED, ASK THE GATE ITSELF WHETHER IT WOULD LET THAT
 * LANE IN -- AT THE COMMIT THE LANE WILL ACTUALLY READ.
 *
 * The first version of this script asked a question of its own invention: "is a
 * live grant blocking this family?" That is not the question `claim.mjs
 * --assert` enforces, which is "does THIS lane hold an unreleased grant of its
 * own kind on this subject?" A grant is never minted by an assert. So "nobody
 * holds it" has never meant "you can take it", and the branch that green-lit a
 * NEW dispatch could never be right.
 *
 * Three lanes were cleared by that branch and refused at the gate in the same
 * shift. FIX139 measured the scale rather than the instance: 208 families have
 * no live grant, and for all 208 the old script said dispatchable while a fresh
 * lane's assert would refuse. 208 of 208. FIX138 found a second error in the
 * same function -- it pooled verification and repair grants because it never
 * filtered by laneKind, which locate() does first.
 *
 * VF36 named the general shape, and it is the reason this file is now four
 * lines of logic instead of forty: any independent reimplementation of the gate
 * drifts from locate(), and the next drift costs another dispatch. This script
 * was itself built out of a finding about a second model of the ledger
 * disagreeing with the enforcing one, and it promptly became a third.
 *
 * So it no longer models anything. `claim.mjs --can-assert` runs the real
 * assert path with `die` throwing instead of exiting, writes nothing, and
 * reports what the gate decides. This script's whole remaining job is the part
 * the gate cannot do for itself: read the ledger AS OF THE COMMIT THE LANE
 * HOLDS, because a release I have not committed does not exist for the lane.
 *
 * Usage:
 *   node dispatch-preflight.mjs --lane VF36 --families a,b,c [--at <commit>]
 *
 * Exit 0 when the gate would admit that lane to every family. Nonzero otherwise,
 * with the gate's own refusal and its own named remedy per family.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const LEDGER = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";
const CLAIM = "scripts/grade-a-packet-factory-24h/claim.mjs";
const arg = (n, required = true) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1 || !process.argv[i + 1]) {
    if (required) { console.error(`missing --${n}`); process.exit(2); }
    return null;
  }
  return process.argv[i + 1];
};

const lane = arg("lane");
const families = arg("families");
const at = arg("at", false);

/*
 * The ledger the LANE will read, not my working copy. Written to a temp file so
 * the real gate reads the real bytes of that commit through its own --ledger
 * path, rather than this script parsing them and forming an opinion.
 */
let ledgerPath = LEDGER;
let scratch = null;
if (at) {
  scratch = mkdtempSync(path.join(tmpdir(), "rcap-preflight-"));
  ledgerPath = path.join(scratch, "claim-ledger.json");
  writeFileSync(ledgerPath, execFileSync("git", ["show", `${at}:${LEDGER}`], { encoding: "utf8", maxBuffer: 1 << 28 }));
}

console.log(at ? `Asking the gate against the ledger at ${at} -- the one the lane will read.` : `Asking the gate against the working-copy ledger.`);
if (!at) console.log(`WARNING: no --at given. If the lane's worktree is at a different commit, this answer is not the lane's answer.`);
console.log();

const run = spawnSync(process.execPath, [CLAIM, "--ledger", ledgerPath, "--can-assert", lane, families], { stdio: "inherit" });
if (scratch) rmSync(scratch, { recursive: true, force: true });
process.exit(run.status ?? 1);
