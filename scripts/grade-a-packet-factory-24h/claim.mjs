#!/usr/bin/env node
/** The single fail-closed claim mechanism for packet families and source obligations. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
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
const die = (code, message) => { console.error(message); process.exit(code); };
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

function status(ledgerPath, lane) {
  const { ledger } = read(ledgerPath); validate(ledger);
  const claims = ledger.claims.filter((c) => (!lane || c.lane === lane) && !c.released);
  console.log(`${claims.length} live grant(s)${lane ? ` for ${lane}` : ""}`);
  for (const c of claims.slice(0, 40)) console.log(`  ${c.lane.padEnd(10)} ${c.laneKind.padEnd(25)} ${c.subjectId}`);
}

const args = process.argv.slice(2); let ledgerPath = DEFAULT_LEDGER;
const li = args.indexOf("--ledger"); if (li >= 0) { ledgerPath = args[li + 1]; args.splice(li, 2); }
const ri = args.indexOf("--reason"); let reason = null;
if (ri >= 0) { reason = args[ri + 1] ?? null; args.splice(ri, 2); }
const [mode, lane, subjectId] = args;
if (mode === "--assert" && lane && subjectId) assertClaim(ledgerPath, lane, subjectId);
else if (mode === "--release" && lane && subjectId) release(ledgerPath, lane, subjectId, reason);
else if (mode === "--reissue" && lane && subjectId) reissue(ledgerPath, lane, subjectId, reason);
else if (mode === "--transfer" && lane && subjectId && args[3]) transfer(ledgerPath, lane, subjectId, args[3], reason);
else if (mode === "--grant" && lane && subjectId) grant(ledgerPath, lane, subjectId, reason);
else if (mode === "--status") status(ledgerPath, lane);
else die(2, "usage: claim.mjs [--ledger path] --assert|--release <LANE> <familyId|itemId> | --grant <LANE> <subjectId> --reason \"<why>\" | --reissue <LANE> <subjectId> --reason \"<why>\" | --transfer <FROM_LANE> <TO_LANE> <subjectId> --reason \"<why>\" | --status [LANE]");
