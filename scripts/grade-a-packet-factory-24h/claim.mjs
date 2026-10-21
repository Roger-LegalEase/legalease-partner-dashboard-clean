#!/usr/bin/env node
/** The single fail-closed claim mechanism for packet families and source obligations. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/*
 * WHICH LEDGER THIS IS, SAID OUT LOUD.
 *
 * This script chdirs to the checkout that CONTAINS IT, so the ledger it reads is
 * chosen by which copy of the script you invoke -- and several checkouts of this
 * repository live side by side on this machine, each with its own ledger at a
 * different age.
 *
 * FIX01 was told to run `node scripts/grade-a-packet-factory-24h/claim.mjs
 * --assert ...` in its worktree. Its shell's cwd resets between calls and the
 * dispatch carried no `cd`, so the relative path resolved against the PRIMARY
 * checkout -- a stale branch whose ledger has 878 claims from 5 September and
 * records the grant as released. It answered ALREADY_RELEASED, exit 9, about a
 * grant that is live in the worktree's own ledger of 975 claims. The lane was
 * right not to stop on it, and it should never have had to work that out.
 *
 * A refusal is not made safer by being silent about which record it came from.
 * Every invocation now names the checkout, the ledger, its claim count and its
 * generatedAtCommit on stderr before doing anything -- and says so loudly when
 * the checkout it is about to read is NOT the one the caller is standing in,
 * which in this fleet is almost always a mistake.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CALLER_CWD = process.cwd();
process.chdir(ROOT);
const DEFAULT_LEDGER = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";
export const CLOSED_LANE_KINDS = Object.freeze([
  "packet-build", "independent-verification", "repair", "shared-host-repair",
  "source-discovery", "source-reconciliation", "source-acquisition", "source-promotion"
]);
export const LANE_KIND = (lane) => {
  if (/^(VF|WARV|P2V|VS)/.test(lane)) return "independent-verification";
  if (/^(FIX|WAR0[34])/.test(lane)) return "repair";
  if (/^PF/.test(lane)) return "packet-build";
  if (/^WAR01/.test(lane)) return "shared-host-repair";
  if (/^DISC/.test(lane)) return "source-discovery";
  if (/^SRC/.test(lane) || /^WAR02/.test(lane)) return "source-reconciliation";
  if (/^ACQ/.test(lane)) return "source-acquisition";
  if (/^PROMO/.test(lane)) return "source-promotion";
  return "unknown";
};
export const DIGEST_FIELDS = Object.freeze(["subjectType", "subjectId", "itemId", "familyId", "familyIds", "sourceId", "operation", "lane", "laneKind", "released", "releasedAt"]);
export const claimsDigest = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows.map((row) => DIGEST_FIELDS.map((field) => row[field] ?? null)))).digest("hex");

const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
/*
 * A DRY RUN NEEDS THE REAL GATE, NOT A SECOND MODEL OF IT.
 *
 * dispatch-preflight.mjs was written to answer "can this lane be dealt this
 * family" and answered it with its own reading of the ledger -- "is a live grant
 * blocking?" -- which is not the question `--assert` enforces. Three lanes in one
 * shift were cleared by it and then refused at the gate, and FIX139 measured the
 * scale rather than the instance: 208 families have no live grant, and for all
 * 208 the preflight said dispatchable while a fresh lane's assert would refuse.
 * A grant is not minted by `--assert`; it is only validated, so "nobody holds it"
 * has never meant "you can take it".
 *
 * VF36 named the general shape: any independent reimplementation of this gate
 * drifts from locate(), and the next drift costs another dispatch. So the fix is
 * not a better model. It is to run THIS code and report what it decides. `die`
 * throws instead of exiting while a dry run is in progress, and --can-assert
 * catches it, so the preflight and the gate cannot disagree.
 */
let DRY_RUN = false;
class Refusal extends Error { constructor(code, message) { super(message); this.code = code; } }
const die = (code, message) => {
  if (DRY_RUN) throw new Refusal(code, message);
  console.error(message); process.exit(code);
};
const read = (ledgerPath) => {
  const absolute = path.resolve(ROOT, ledgerPath);
  if (!fs.existsSync(absolute)) die(3, `CLAIM_LEDGER_ABSENT: ${ledgerPath}`);
  return { absolute, ledger: JSON.parse(fs.readFileSync(absolute, "utf8")) };
};
function validate(ledger) {
  if (ledger.schemaVersion !== "rcap-claim-ledger/v2") die(12, `UNKNOWN_LEDGER_SCHEMA: ${ledger.schemaVersion}`);
  if (!ledger.claimsDigest) die(10, "LEDGER_HAS_NO_DIGEST");
  if (JSON.stringify(ledger.laneKinds) !== JSON.stringify(CLOSED_LANE_KINDS)) die(13, "UNDECLARED_LANE_KIND: ledger vocabulary is not the closed vocabulary");
  if ((ledger.claims ?? []).some((c) => !CLOSED_LANE_KINDS.includes(c.laneKind))) die(13, "UNDECLARED_LANE_KIND: a grant uses an unknown kind");
  const digest = claimsDigest(ledger.claims ?? []);
  if (digest !== ledger.claimsDigest) die(11, `LEDGER_DIGEST_MISMATCH: expected ${ledger.claimsDigest}, computed ${digest}`);
  if (!ledger.generatedAtCommit || git(["cat-file", "-e", `${ledger.generatedAtCommit}^{commit}`]) === null) die(5, `LEDGER_BASE_NOT_IN_CHECKOUT: ${ledger.generatedAtCommit ?? "missing"}`);
  const seen = new Set();
  for (const c of ledger.claims ?? []) {
    const key = `${c.subjectType}\0${c.subjectId}\0${c.operation}`;
    if (seen.has(key)) die(7, `AMBIGUOUS_GRANT: duplicate subject and operation ${c.subjectId} ${c.operation}`);
    seen.add(key);
  }
  return digest;
}
function locate(ledger, lane, subjectId) {
  const kind = LANE_KIND(lane);
  if (kind === "unknown") die(4, `UNKNOWN_LANE: ${lane}`);
  const expectedType = kind.startsWith("source-") ? "source-obligation" : "packet-family";
  const candidates = (ledger.claims ?? []).filter((c) => c.subjectType === expectedType && c.subjectId === subjectId && c.laneKind === kind);
  if (candidates.length === 0) die(6, `NOT_GRANTED: no ${kind} lane holds ${subjectId}`);
  if (candidates.length > 1) die(7, `AMBIGUOUS_GRANT: ${subjectId}`);
  /*
   * A lane mismatch is refused either way -- asserting a second grant on a
   * subject another lane already records would make it AMBIGUOUS_GRANT -- but
   * the two cases are not the same fact and the message used to conflate them.
   *
   * A RELEASED grant on another lane means nobody is executing the subject. It
   * is available, and Captain can --transfer it. Reporting that as
   * "granted to FIX04" told three lanes in one shift that their families were
   * being worked by someone else; the colliding grants were released, some of
   * them minutes earlier by the generated dispatch, and each lane correctly
   * refused to move a grant onto itself and stopped. That is work not done for
   * a reason that was not true.
   */
  if (candidates[0].lane !== lane) {
    const held = candidates[0];
    if (held.released) {
      die(8, `GRANTED_ELSEWHERE_BUT_RELEASED: ${subjectId} is recorded on ${held.lane}, not ${lane}, and ${held.lane} RELEASED it at ${held.releasedAt ?? "an unrecorded time"}. No lane is executing it. Captain can hand it over with: --transfer ${held.lane} ${lane} ${subjectId} --reason "...". Do not transfer it to yourself -- choosing a released grant's destination is a dispatch act.`);
    }
    die(8, `GRANTED_ELSEWHERE: ${subjectId} is granted to ${held.lane}, not ${lane}, and that grant is LIVE -- another lane is working it now.`);
  }
  return candidates[0];
}
function assertClaim(ledgerPath, lane, subjectId) {
  const { ledger } = read(ledgerPath); const digest = validate(ledger); const grant = locate(ledger, lane, subjectId);
  if (grant.released) die(9, `ALREADY_RELEASED: ${subjectId} at ${grant.releasedAt}`);
  console.log(`CLAIM_OK ${lane} ${subjectId} (${grant.laneKind}, grant set ${digest.slice(0, 16)})`);
}
/* --reason is parsed off argv for every operation and was discarded here alone,
 * so a release -- the operation that ENDS a lane's ownership and is the one a
 * later reader most wants explained -- recorded no why at all. reissue,
 * transfer and grant all keep theirs. */
/*
 * Read-only. Answers exactly what `--assert` would answer, by running it, and
 * writes nothing whatever the outcome. Prints one line per family so a dispatch
 * can be checked in a batch, and exits nonzero if any family would refuse.
 */
function canAssert(ledgerPath, lane, subjectIds) {
  let refused = 0;
  for (const subjectId of subjectIds) {
    DRY_RUN = true;
    try {
      assertClaim(ledgerPath, lane, subjectId);
      console.log(`  ^ ${lane} CAN assert ${subjectId}`);
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      refused += 1;
      console.log(`REFUSED(${error.code}) ${subjectId}`);
      console.log(`  ${error.message}`);
    } finally { DRY_RUN = false; }
  }
  console.log();
  console.log(`${subjectIds.length} famil(ies) checked for ${lane}: ${subjectIds.length - refused} assertable, ${refused} would refuse`);
  console.log(`Answered by running the gate itself. Nothing was written.`);
  if (refused) process.exit(1);
}
function release(ledgerPath, lane, subjectId, reason = null) {
  const { absolute, ledger } = read(ledgerPath); validate(ledger); const grant = locate(ledger, lane, subjectId);
  if (grant.released) die(9, `ALREADY_RELEASED: ${subjectId}`);
  grant.released = true; grant.releasedAt = new Date().toISOString();
  if (reason) grant.releaseReason = reason;
  ledger.releases = [...(ledger.releases ?? []), { lane, subjectType: grant.subjectType, subjectId, operation: grant.operation, laneKind: grant.laneKind, releasedAt: grant.releasedAt, ...(reason ? { reason } : {}) }];
  ledger.claimsDigest = claimsDigest(ledger.claims);
  fs.writeFileSync(absolute, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`RELEASED ${lane} ${subjectId}`);
}
/*
 * Re-open a released grant, deliberately and on the record.
 *
 * The ledger was one-shot per subject with no way back, and a lane that did
 * exactly what its contract requires -- release on return -- could then never be
 * asked to touch the family again. FIX-A hit this: it released FIX01/03/05/07,
 * Captain assigned it the rebuilds those very lanes were blocked on, and every
 * --assert answered ALREADY_RELEASED. The correct behaviour of the worker made
 * the work impossible.
 *
 * This does not append a second grant: locate() requires exactly one claim per
 * subject and laneKind, so a duplicate would make the subject permanently
 * AMBIGUOUS_GRANT and unassertable by anyone. It re-opens the existing grant
 * and keeps the whole history -- the original release stays in ledger.releases,
 * and the reissue is appended to ledger.reissues with its reason.
 *
 * A reason is required. Re-opening a claim is how two workers could end up
 * writing one family, so it must be a deliberate act with an author and a
 * stated cause, never a retry that quietly succeeds.
 */
function reissue(ledgerPath, lane, subjectId, reason) {
  const { absolute, ledger } = read(ledgerPath); validate(ledger); const grant = locate(ledger, lane, subjectId);
  if (!reason) die(10, `REISSUE_NEEDS_REASON: re-opening ${subjectId} requires --reason "<why>"`);
  if (!grant.released) die(11, `NOT_RELEASED: ${subjectId} is already live; nothing to re-issue`);
  const previouslyReleasedAt = grant.releasedAt;
  grant.released = false; grant.releasedAt = null;
  ledger.reissues = [...(ledger.reissues ?? []), {
    lane, subjectType: grant.subjectType, subjectId, operation: grant.operation, laneKind: grant.laneKind,
    previouslyReleasedAt, reissuedAt: new Date().toISOString(), reason
  }];
  ledger.claimsDigest = claimsDigest(ledger.claims);
  fs.writeFileSync(absolute, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`REISSUED ${lane} ${subjectId} (was released ${previouslyReleasedAt}) — ${reason}`);
}

/*
 * Move a released grant to a different lane so the family can be read again.
 *
 * A repaired family needs a SECOND independent read, and until now the ledger
 * could not express one. A family may hold only one claim per operation, so no
 * second grant is mintable; --reissue re-opens the grant but leaves it on the
 * lane that already read it, which is wrong precisely when that lane also did
 * the repair. Twenty-two families sit at FAIL_REPAIR_REQUIRED waiting on this.
 *
 * The independence rule is that a verifier is not the builder or the repairer
 * of what it verifies -- not that a different worker must read it each time. So
 * a transfer is refused only when the destination has actually written the
 * family, and the caller states which lane is taking it and why.
 */
function transfer(ledgerPath, fromLane, toLane, subjectId, reason) {
  const { absolute, ledger } = read(ledgerPath); validate(ledger);
  const grant = locate(ledger, fromLane, subjectId);
  if (!reason) die(10, `TRANSFER_NEEDS_REASON: moving ${subjectId} requires --reason "<why>"`);
  if (!grant.released) die(11, `NOT_RELEASED: ${subjectId} is still live on ${fromLane}; release it or let that lane finish`);
  if (fromLane === toLane) die(12, `SAME_LANE: ${toLane} already holds this grant; --reissue re-opens it in place`);
  const toKind = LANE_KIND(toLane);
  if (toKind === "unknown") die(4, `UNKNOWN_LANE: ${toLane}`);
  if (toKind !== grant.laneKind) die(14, `KIND_MISMATCH: ${subjectId} is a ${grant.laneKind} grant and ${toLane} is ${toKind}`);

  /*
   * A structural guard, and it is honest about how little it can reach.
   *
   * LANE_KIND derives the kind from the lane's PREFIX, so a VF lane can never
   * hold a packet-build or repair claim and the kind check above fires first --
   * I tested a transfer to the lane that actually built the family and got
   * KIND_MISMATCH, not this. So this catches a ledger where lane and laneKind
   * disagree, which means corruption or a hand-edit, not a bad dispatch.
   *
   * Real independence is a question about WORKERS, not lanes: VF20 and the FIX
   * lane that repaired the family can belong to one worker and every check here
   * would pass. That is enforced by the roster in CLAUDE_9H_SHIFT.json and by
   * factory check F21, which reads lane ownership. Captain checks it when
   * choosing the destination; this function cannot.
   */
  const wrote = ledger.claims.filter((c) => c.subjectId === subjectId
    && c.lane === toLane
    && ["packet-build", "repair", "shared-host-repair"].includes(c.laneKind));
  if (wrote.length) die(15, `LEDGER_INCONSISTENT: ${toLane} resolves to ${toKind} but holds a ${wrote[0].laneKind} claim on ${subjectId}`);

  const from = grant.lane;
  const previouslyReleasedAt = grant.releasedAt;
  grant.lane = toLane; grant.released = false; grant.releasedAt = null;
  ledger.transfers = [...(ledger.transfers ?? []), {
    subjectType: grant.subjectType, subjectId, operation: grant.operation, laneKind: grant.laneKind,
    fromLane: from, toLane, previouslyReleasedAt, transferredAt: new Date().toISOString(), reason
  }];
  ledger.claimsDigest = claimsDigest(ledger.claims);
  fs.writeFileSync(absolute, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`TRANSFERRED ${subjectId} ${from} -> ${toLane} (was released ${previouslyReleasedAt}) — ${reason}`);
}

/*
 * Mint a grant where none has ever existed.
 *
 * Every other operation here moves an existing grant around, and grants
 * themselves are minted by the dispatch packer in generate.mjs when it deals
 * work to lanes. The packer only deals families that are VERIFY_PENDING or
 * FAIL_REPAIR_REQUIRED, which is correct for a queue and leaves a hole exactly
 * where it hurts: a COMPLETE_PACKET_PROVEN family can be granted to nobody.
 *
 * That hole has now cost three lanes. A verifier sent to re-read
 * rcap-sc-custom-pleading after an owner-level finding got NOT_GRANTED and
 * rightly stopped rather than reading unclaimed -- so a family under active
 * suspicion was untestable by anyone. The per-route delivery lane got the same
 * refusal on both first-cohort families and had to work unclaimed at Captain's
 * direction. In each case the worker behaved correctly and the ledger had no
 * way to say yes.
 *
 * --reissue cannot fill it: it re-opens a released grant and dies NOT_GRANTED
 * when there is nothing to re-open. --transfer cannot: it moves a grant that
 * exists. So this mints one, under the same discipline as those two rather than
 * a weaker one:
 *
 *   - a reason is required, because a grant is how a worker is authorised to
 *     write a family, and one that appears without a stated cause is
 *     indistinguishable from a retry that quietly succeeded;
 *   - it refuses when any claim already exists for that subject and kind, so it
 *     can never create the duplicate that would make a family permanently
 *     AMBIGUOUS_GRANT and unassertable by everyone;
 *   - the lane must resolve to a known kind, so the minted grant's laneKind is
 *     derived rather than asserted;
 *   - and it is logged to ledger.grants with its author and cause, so a grant
 *     that was minted rather than dealt is visible as such forever.
 */
function grant(ledgerPath, lane, subjectId, reason) {
  const { absolute, ledger } = read(ledgerPath); validate(ledger);
  if (!reason) die(10, `GRANT_NEEDS_REASON: minting a grant for ${subjectId} requires --reason "<why>"`);
  const kind = LANE_KIND(lane);
  if (kind === "unknown") die(4, `UNKNOWN_LANE: ${lane}`);
  const subjectType = kind.startsWith("source-") ? "source-obligation" : "packet-family";
  const existing = (ledger.claims ?? []).filter((c) => c.subjectType === subjectType && c.subjectId === subjectId && c.laneKind === kind);
  if (existing.length) {
    die(16, `ALREADY_GRANTED: ${subjectId} already has a ${kind} grant on ${existing[0].lane}`
      + `${existing[0].released ? " (released — use --reissue to re-open it, or --transfer to move it)" : " and it is live"}`);
  }
  const claim = {
    subjectType, subjectId, itemId: null,
    familyId: subjectType === "packet-family" ? subjectId : null,
    familyIds: subjectType === "packet-family" ? [subjectId] : [],
    sourceId: subjectType === "source-obligation" ? subjectId : null,
    operation: kind === "repair" ? "rapid-repair" : kind,
    lane, laneKind: kind, released: false, releasedAt: null
  };
  ledger.claims = [...(ledger.claims ?? []), claim];
  ledger.grants = [...(ledger.grants ?? []), {
    lane, subjectType, subjectId, operation: claim.operation, laneKind: kind,
    grantedAt: new Date().toISOString(), grantedBy: "Captain", reason,
    whyThisWasMintedRatherThanDealt: "the dispatch packer deals grants only to families in the verification or repair queues, and this subject was in neither"
  }];
  ledger.claimsDigest = claimsDigest(ledger.claims);
  fs.writeFileSync(absolute, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`GRANTED ${lane} ${subjectId} (${kind}) — ${reason}`);
}

/*
 * CLOSE A LANE'S GRANTS AT ITS RETURN BOUNDARY, ON EVIDENCE.
 *
 * The defect this exists for, measured: 116 grants across 40 lanes over 87
 * families read LIVE while nothing was executing them, because a lane that
 * returns keeps its grant until someone releases it. Every dispatch batch the
 * Captain tried refused at the gate with GRANTED_ELSEWHERE, and the ledger --
 * not the work -- was the limit on throughput. That is a lifecycle hole at the
 * RETURN boundary, so it is closed here, in the same script that opens grants.
 *
 * Three rules this obeys, each of them the reason a naive sweep would be wrong:
 *
 *   1. A CLAIM IS NEVER CLOSED BECAUSE ITS TIMESTAMP IS OLD. Age is not
 *      evidence of anything: a lane can hold a grant for hours while rendering,
 *      and a grant asserted a minute ago can belong to a lane that has already
 *      returned. This refuses unless the caller can point at the lane's own
 *      committed return -- its rows under data/rcap-grade-a/packet-factory-24h/
 *      <lane>/, or a commit named with --returned-at that this repository
 *      actually contains. No date arithmetic appears in this function.
 *
 *   2. A REMOTE OWNER IS NEVER RECLAIMED FROM HERE. PF lanes run in Codex Cloud
 *      and SRC lanes hold source inventory; neither has a process visible in
 *      this container, so "no local process" says nothing about them. They are
 *      refused outright rather than judged.
 *
 *   3. A STATUS LABEL IS NOT EXECUTION. The only thing that counts as finished
 *      is an artifact the lane itself wrote and committed. If a lane is
 *      deliberately retaining a grant for a follow-up repair, the Captain says
 *      so with --reason and does not close it; that is a bounded continuation,
 *      and it is recorded as one by simply not closing.
 *
 * What it does NOT do: it does not accept, reject or supersede the lane's work.
 * A release moves ownership and nothing else.
 */
const laneReturnEvidence = (lane) => {
  const dir = path.join("data/rcap-grade-a/packet-factory-24h", lane.toLowerCase());
  if (!fs.existsSync(dir)) return null;
  const rows = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (!rows.length) return null;
  const file = path.join(dir, rows[0]);
  const tracked = git(["log", "-1", "--format=%H", "--", file]);
  return tracked ? { file, committedAt: tracked, rowFiles: rows.length } : null;
};

export function ownershipReconciliation(ledger) {
  const rows = [];
  const lanes = [...new Set((ledger.claims ?? []).filter((c) => !c.released).map((c) => c.lane))].sort();
  for (const lane of lanes) {
    const live = (ledger.claims ?? []).filter((c) => c.lane === lane && !c.released);
    const remote = /^(PF|SRC)/.test(lane);
    const evidence = remote ? null : laneReturnEvidence(lane);
    rows.push({
      lane, liveClaims: live.length, laneKind: LANE_KIND(lane),
      classification: remote ? "remote_owner_not_judged_from_here"
        : evidence ? "has_committed_output_here"
        : "no_committed_return_found_here",
      returnEvidence: evidence,
      subjectIds: live.map((c) => c.subjectId)
    });
  }
  return rows;
}

function ownership(ledgerPath) {
  const { ledger } = read(ledgerPath); validate(ledger);
  const rows = ownershipReconciliation(ledger);
  const closable = rows.filter((r) => r.classification === "has_committed_output_here");
  console.log(`${rows.length} lane(s) holding ${rows.reduce((n, r) => n + r.liveClaims, 0)} live grant(s)`);
  for (const r of rows) console.log(`  ${r.lane.padEnd(10)} ${String(r.liveClaims).padStart(3)}  ${r.classification}${r.returnEvidence ? `  ${r.returnEvidence.file}` : ""}`);
  console.log();
  console.log(`${closable.length} lane(s) have committed output in this tree. That is a NECESSARY condition for closing a grant, not a sufficient one:`);
  console.log(`  a lane commits its rows and keeps working, so the Captain must know the assignment is finished -- or is a bounded`);
  console.log(`  continuation with an executing owner -- before running --close-returned <LANE> --reason "<why>".`);
  console.log(`No claim is closed by this command, and none is ever closed because its timestamp is old.`);
}

function closeReturned(ledgerPath, lane, reason, returnedAt) {
  const { absolute, ledger } = read(ledgerPath); validate(ledger);
  if (!reason) die(10, `CLOSE_NEEDS_REASON: closing ${lane}'s grants requires --reason "<why>"`);
  const kind = LANE_KIND(lane);
  if (kind === "unknown") die(4, `UNKNOWN_LANE: ${lane}`);
  if (/^(PF|SRC)/.test(lane)) {
    die(17, `REMOTE_OWNER: ${lane} runs outside this container, so the absence of a local process is not evidence it finished.`
      + ` Release its grants one at a time with --release, on evidence from the worker itself.`);
  }
  let evidence = laneReturnEvidence(lane);
  if (returnedAt) {
    const resolved = git(["rev-parse", "--verify", `${returnedAt}^{commit}`]);
    if (!resolved) die(18, `RETURN_COMMIT_NOT_IN_THIS_REPOSITORY: ${returnedAt}. A return boundary is a commit this checkout contains, never a sha typed from a report.`);
    evidence = { ...(evidence ?? {}), namedReturnCommit: resolved };
  }
  if (!evidence) {
    die(19, `NO_RETURN_EVIDENCE: nothing committed under data/rcap-grade-a/packet-factory-24h/${lane.toLowerCase()}/ and no --returned-at given.`
      + ` A grant is not stale because it is old; it is stale because the lane returned. Say where the return is.`);
  }
  const live = (ledger.claims ?? []).filter((c) => c.lane === lane && !c.released);
  if (!live.length) die(20, `NOTHING_LIVE: ${lane} holds no live grant`);
  const closedAt = new Date().toISOString();
  for (const grant of live) {
    grant.released = true; grant.releasedAt = closedAt; grant.releaseReason = reason;
    ledger.releases = [...(ledger.releases ?? []), {
      lane, subjectType: grant.subjectType, subjectId: grant.subjectId, operation: grant.operation,
      laneKind: grant.laneKind, releasedAt: closedAt, reason,
      closedAtReturnBoundary: true, returnEvidence: evidence
    }];
  }
  ledger.claimsDigest = claimsDigest(ledger.claims);
  fs.writeFileSync(absolute, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`CLOSED ${live.length} grant(s) held by ${lane} at its return boundary — ${reason}`);
  console.log(`  evidence: ${JSON.stringify(evidence)}`);
  for (const g of live) console.log(`  released ${g.subjectId}`);
}

function status(ledgerPath, lane) {
  const { ledger } = read(ledgerPath); validate(ledger);
  const claims = ledger.claims.filter((c) => (!lane || c.lane === lane) && !c.released);
  console.log(`${claims.length} live grant(s)${lane ? ` for ${lane}` : ""}`);
  for (const c of claims.slice(0, 40)) console.log(`  ${c.lane.padEnd(10)} ${c.laneKind.padEnd(25)} ${c.subjectId}`);
}

const announce = (ledgerFile) => {
  let claims = "unreadable";
  let at = "unreadable";
  try {
    const l = JSON.parse(fs.readFileSync(path.resolve(ROOT, ledgerFile), "utf8"));
    claims = (l.claims ?? []).length;
    at = l.generatedAtCommit ?? "none";
  } catch { /* validate() produces the real error a moment later */ }
  process.stderr.write("ledger: " + path.resolve(ROOT, ledgerFile) + "  (" + claims + " claims, generatedAtCommit " + at + ")\n");
  /* A caller standing in a different checkout of this repo is reading a ledger it
   * did not mean to read. Say so; do not refuse, because --ledger and CI callers
   * legitimately point elsewhere. */
  let callerRoot = null;
  try { callerRoot = execFileSync("git", ["-C", CALLER_CWD, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(); } catch { callerRoot = null; }
  if (callerRoot && path.resolve(callerRoot) !== path.resolve(ROOT)) {
    process.stderr.write("WRONG_CHECKOUT: you are standing in " + callerRoot + " and this script belongs to " + ROOT + ".\n");
    process.stderr.write("  The answer below is about that checkout's ledger, not yours. Re-run as: cd " + callerRoot + " && node scripts/grade-a-packet-factory-24h/claim.mjs ...\n");
  }
};

/*
 * Run the CLI only when this file IS the program.
 *
 * Everything above is also the gate other code must be able to ASK rather than
 * re-model: claim-close-returned.test.mjs needs claimsDigest and the closed
 * lane-kind vocabulary to build a fixture ledger the real validate() accepts,
 * and a test that hand-typed a digest instead would be testing a ledger this
 * gate would reject. Without this guard, importing the module ran the argv
 * dispatch and exited 2 before the importer got anything -- so the only way to
 * reuse the vocabulary was to copy it, which is how two readings of one rule
 * start to disagree.
 */
const INVOKED_DIRECTLY = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) {
const args = process.argv.slice(2); let ledgerPath = DEFAULT_LEDGER;
const li = args.indexOf("--ledger"); if (li >= 0) { ledgerPath = args[li + 1]; args.splice(li, 2); }
const rai = args.indexOf("--returned-at"); let returnedAt = null;
if (rai >= 0) { returnedAt = args[rai + 1] ?? null; args.splice(rai, 2); }
const ri = args.indexOf("--reason"); let reason = null;
if (ri >= 0) { reason = args[ri + 1] ?? null; args.splice(ri, 2); }
const [mode, lane, subjectId] = args;
/*
 * VF51 read "1 assertable, 0 would refuse" for a two-family preflight and
 * nearly believed it had confirmed both. `--can-assert` takes ONE
 * comma-separated argument, so `--can-assert VF51 a b` silently discarded `b`
 * and answered about `a` alone. Every other mode discarded surplus arguments
 * the same way: FIX152's dispatch said `--assert FIX152 repair <family>` and
 * the gate dutifully looked for a subject named "repair".
 *
 * A gate that silently ignores part of what it was asked is not a gate. It now
 * refuses surplus positional arguments instead of answering a narrower question
 * than the caller asked, and says so in the words a caller needs.
 */
const POSITIONAL_ARITY = { "--can-assert": 3, "--assert": 3, "--release": 3, "--reissue": 3,
  "--transfer": 4, "--grant": 3, "--ownership": 1, "--close-returned": 2, "--status": 2 };
if (Object.hasOwn(POSITIONAL_ARITY, mode) && args.length > POSITIONAL_ARITY[mode]) {
  die(20, `SURPLUS_ARGUMENTS: ${mode} takes ${POSITIONAL_ARITY[mode] - 1} positional argument(s) and received `
    + `${args.length - 1} (${args.slice(1).map((a) => JSON.stringify(a)).join(" ")}). `
    + (mode === "--can-assert"
      ? "Several ids go in ONE comma-separated argument: --can-assert LANE a,b,c. Answering about the first alone "
      + "would report a preflight the caller never ran."
      : "One subject per call. Nothing was read as a narrower question than you asked."));
}
announce(ledgerPath);
if (mode === "--can-assert" && lane && subjectId) canAssert(ledgerPath, lane, subjectId.split(",").map((x) => x.trim()).filter(Boolean));
else if (mode === "--assert" && lane && subjectId) assertClaim(ledgerPath, lane, subjectId);
else if (mode === "--release" && lane && subjectId) release(ledgerPath, lane, subjectId, reason);
else if (mode === "--reissue" && lane && subjectId) reissue(ledgerPath, lane, subjectId, reason);
else if (mode === "--transfer" && lane && subjectId && args[3]) transfer(ledgerPath, lane, subjectId, args[3], reason);
else if (mode === "--grant" && lane && subjectId) grant(ledgerPath, lane, subjectId, reason);
else if (mode === "--ownership") ownership(ledgerPath);
else if (mode === "--close-returned" && lane) closeReturned(ledgerPath, lane, reason, returnedAt);
else if (mode === "--status") status(ledgerPath, lane);
else die(2, "usage: claim.mjs [--ledger path] --can-assert <LANE> <id[,id...]> | --assert|--release <LANE> <familyId|itemId> | --grant <LANE> <subjectId> --reason \"<why>\" | --reissue <LANE> <subjectId> --reason \"<why>\" | --transfer <FROM_LANE> <TO_LANE> <subjectId> --reason \"<why>\" | --ownership | --close-returned <LANE> --reason \"<why>\" [--returned-at <sha>] | --status [LANE]");
}
