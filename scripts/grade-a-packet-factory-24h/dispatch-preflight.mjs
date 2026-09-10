#!/usr/bin/env node
/*
 * BEFORE A LANE IS DISPATCHED, ANSWER THE ONE QUESTION THAT STOPS IT DEAD.
 *
 * In one shift I dispatched three lanes -- FIX138, FIX139, VF36 -- against seven
 * families held LIVE by lanes that had already returned. All three refused at
 * exit 8, correctly, having written nothing. Seven families sat idle and three
 * lanes' worth of capacity was spent discovering a fact I could have read in a
 * second.
 *
 * Two distinct errors produced it, and this script closes both.
 *
 *   1. I read `claim.mjs --status`, grepped its output for a family, found no
 *      row and concluded nobody held it. The ledger held FIX130's grant the
 *      whole time. A filtered listing is a view; the ledger is the record.
 *
 *   2. On another family I DID release the grants -- in my own worktree, without
 *      committing -- and then dispatched a lane from a worktree cut at a commit
 *      that predated the release. A release nobody else can see has not
 *      happened. So this refuses to answer from the working copy alone: pass
 *      --at <commit> and it reads the ledger as it exists AT THAT COMMIT, which
 *      is what the lane will actually read.
 *
 * It performs no writes and holds no opinion about who should get the work.
 * Choosing a released grant's destination stays a dispatch act.
 *
 * Usage:
 *   node dispatch-preflight.mjs --lane VF36 --families a,b,c [--at <commit>]
 *
 * Exit 0 when every family is dispatchable to that lane. Exit 1 otherwise, with
 * the exact remedy per family.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LEDGER = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";
const arg = (n, required = true) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1 || !process.argv[i + 1]) {
    if (required) { console.error(`missing --${n}`); process.exit(2); }
    return null;
  }
  return process.argv[i + 1];
};

const lane = arg("lane");
const families = arg("families").split(",").map((s) => s.trim()).filter(Boolean);
const at = arg("at", false);

/* The ledger AS THE LANE WILL READ IT, not as my uncommitted working copy has it. */
const raw = at
  ? execFileSync("git", ["show", `${at}:${LEDGER}`], { encoding: "utf8", maxBuffer: 1 << 28 })
  : readFileSync(LEDGER, "utf8");
const ledger = JSON.parse(raw);

/* A grant covers a family either as its subject or through familyIds. */
const grantsFor = (family) => ledger.claims.filter((c) =>
  c.subjectId === family || (Array.isArray(c.familyIds) && c.familyIds.includes(family)));

let blocked = 0;
for (const family of families) {
  const grants = grantsFor(family);
  const live = grants.filter((g) => !g.released);
  const mine = grants.filter((g) => g.lane === lane && !g.released);
  if (mine.length) { console.log(`OK        ${family} -- ${lane} already holds a live grant (${mine.map((g) => g.operation).join(", ")})`); continue; }
  if (!live.length) { console.log(`OK        ${family} -- no live grant; ${lane} can assert`); continue; }
  blocked += 1;
  console.log(`BLOCKED   ${family}`);
  for (const g of live) {
    /* A release reason on an unreleased grant is a real shape in this ledger and
     * it means someone wrote the reason and never performed the release. Say so
     * rather than letting it read as a released grant. */
    const stale = g.releaseReason ? "  <- carries a releaseReason but was NEVER released" : "";
    console.log(`            held LIVE by ${g.lane} (${g.operation})${stale}`);
  }
  console.log(`            remedy: release each holder with a reason, COMMIT the ledger, then dispatch from that commit`);
}

console.log();
console.log(`${families.length} famil(ies) checked for ${lane} against ${at ? `the ledger at ${at}` : "the working-copy ledger"}: ${families.length - blocked} dispatchable, ${blocked} blocked`);
if (at) console.log(`This is the ledger the lane will read. A release that is not in this commit does not exist for the lane.`);
else console.log(`WARNING: read from the working copy. If the lane's worktree is at a different commit, pass --at <that commit> instead.`);
process.exit(blocked ? 1 : 0);
