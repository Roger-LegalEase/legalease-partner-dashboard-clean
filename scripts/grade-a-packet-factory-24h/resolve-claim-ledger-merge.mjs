#!/usr/bin/env node
/**
 * Union-resolve a claim-ledger merge conflict.
 *
 *   git merge <branch>            # conflicts on claim-ledger.json
 *   node scripts/grade-a-packet-factory-24h/resolve-claim-ledger-merge.mjs
 *   node scripts/grade-a-packet-factory-24h/verify-claim-ledger.mjs
 *   git add data/rcap-grade-a/packet-factory-24h/claim-ledger.json
 *
 * WHY THIS EXISTS, AND WHY IT LIVES HERE NOW
 *
 * Every worker branch touches the ledger, so every integration conflicts on it,
 * and `--ours` or `--theirs` is wrong in both directions: ours loses a lane's
 * releases, theirs loses grants Captain minted while the lane was running. The
 * union is the only correct resolution and it has four rules, each written
 * after the absence of it cost something real.
 *
 * This lived in a scratchpad for most of the sprint and was lost twice when the
 * scratchpad was cleared, mid-merge both times, leaving a ledger full of
 * conflict markers that a following `git add` committed. It is repository
 * tooling used on every integration; it belongs in the repository.
 *
 * ONE. A RELEASE TRAVELS ONLY BETWEEN CLAIMS ON THE SAME LANE. The key is
 * subject+operation, so after a TRANSFER both sides hold that key on different
 * lanes: theirs records the old lane finishing, ours is the new grant
 * deliberately re-opened. Propagating by subject alone re-released four VF26
 * grants mid-read and both FIX11 grants mid-repair.
 *
 * TWO. A REISSUE IS THE SAME HAZARD ON ONE LANE, and the lane guard cannot see
 * it: same key, same lane, theirs released, ours re-opened. It closed seven
 * FIX10 Washington grants underneath a repairer. So an incoming release is
 * refused when our side was reissued after it — that release is older than the
 * re-opening and describes a finish since superseded. A release NEWER than our
 * last reissue is a genuine later finish and still applies.
 *
 * THREE. A CLAIM ONLY THEY HAVE is either a mint we lack or a grant Captain
 * withdrew that their older base still carries. Absence on our side does not
 * say which; the merge base does. Present at the base and gone from ours means
 * we removed it on purpose, and re-adding it silently un-withdraws a revoked
 * grant — which is how four Arkansas SRC04 grants came back on every wave.
 *
 * FOUR. THE LOGS AND THE DIGEST MOVE TOO. Preserving released flags while
 * dropping ledger.releases left 323 claims marked released against a log
 * holding one entry, and taking incoming grants without recomputing
 * claimsDigest made every verifier refuse with a canonical digest mismatch.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const p = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";
const show = (stage) => JSON.parse(execSync(`git show :${stage}:${p}`, { encoding: "utf8", maxBuffer: 1e9 }));

let base, ours, theirs;
try { base = show(1); ours = show(2); theirs = show(3); }
catch {
  console.error(`REFUSED: ${p} is not in a conflicted state.`);
  console.error("If a previous `git add` collapsed the stages, restore them with:");
  console.error(`  git checkout -m -- ${p}`);
  process.exit(1);
}

const subjectOf = (c) => c.itemId ?? c.familyId ?? c.id ?? c.subjectId;
const key = (c) => `${subjectOf(c)}|${c.operation ?? c.op}`;
const bmap = new Map(base.claims.map((c) => [key(c), c]));
const tmap = new Map(theirs.claims.map((c) => [key(c), c]));

let added = 0, oursAhead = 0, regression = 0, minted = 0, laneSkipped = 0, reissueSkipped = 0;

for (const c of ours.claims) {
  const t = tmap.get(key(c));
  const b = bmap.get(key(c));
  if (!t) continue;
  if (t.lane !== c.lane) { if (t.released === true && c.released !== true) laneSkipped++; continue; }
  const reissuedAt = (ours.reissues ?? [])
    .filter((r) => r.lane === c.lane && r.subjectId === subjectOf(c))
    .map((r) => String(r.reissuedAt ?? "")).sort().pop();
  if (t.released === true && c.released !== true && reissuedAt && String(t.releasedAt ?? "") < reissuedAt) {
    reissueSkipped++;
    console.error(`  withheld release of ${key(c)} — released ${t.releasedAt} on the incoming side, reissued ${reissuedAt} on ours`);
    continue;
  }
  if (t.released === true && c.released !== true) { c.released = true; c.releasedAt = t.releasedAt; added++; }
  else if (c.released === true && t.released !== true) {
    if (b?.released === true) { regression++; console.error(`  REGRESSION ${key(c)} was released at the merge base and is not on the incoming side`); }
    else oursAhead++;
  }
}

const omap = new Map(ours.claims.map((c) => [key(c), c]));
let withdrawn = 0;
for (const t of theirs.claims) {
  if (omap.has(key(t))) continue;
  if (bmap.has(key(t))) { withdrawn++; console.error(`  withheld ${key(t)} — withdrawn by Captain, present at the merge base and not on our side`); continue; }
  ours.claims.push(t); minted++;
}

if (regression) { console.error(`REFUSED: ${regression} genuine un-release(s)`); process.exit(1); }

const mergeLog = (name, k) => {
  const seen = new Map((ours[name] ?? []).map((r) => [k(r), r]));
  let recovered = 0;
  for (const r of theirs[name] ?? []) if (!seen.has(k(r))) { seen.set(k(r), r); recovered++; }
  ours[name] = [...seen.values()].sort((a, b) => String(a.releasedAt ?? a.reissuedAt).localeCompare(String(b.releasedAt ?? b.reissuedAt)));
  return recovered;
};
const relRecovered = mergeLog("releases", (r) => `${r.lane}|${r.subjectId}|${r.operation}|${r.releasedAt}`);
const reiRecovered = mergeLog("reissues", (r) => `${r.lane}|${r.subjectId}|${r.operation}|${r.reissuedAt}`);

const F = ours.claimsDigestCovers;
ours.claimsDigest = crypto.createHash("sha256")
  .update(JSON.stringify(ours.claims.map((r) => F.map((k) => r[k] ?? null))))
  .digest("hex");

fs.writeFileSync(p, `${JSON.stringify(ours, null, 2)}\n`);
console.log(`union: +${added} release(s), ${oursAhead} already ours, +${minted} incoming grant(s), ${withdrawn} withheld as withdrawn, ${laneSkipped} cross-lane refused, ${reissueSkipped} stale release(s) refused, 0 regressions`);
console.log(`logs:  +${relRecovered} release entr(ies), +${reiRecovered} reissue entr(ies)`);
