/**
 * The approved Mississippi non-conviction bytes moved, and why.
 *
 * WHAT HAPPENED
 *
 * The §7 guide's Fees & Costs panel printed the route-level sentence "Not
 * established for this route — ask the clerk or filing office" in the LAST
 * VERIFIED half of a cell whose other half already names the official source.
 * On Wyoming, where the filing fee is a known $300.00, that read as if the fee
 * itself were in doubt. A missing verification date is not a route with nothing
 * established, so the slot now says "Not recorded" and the official source is
 * unchanged beside it.
 *
 * That renderer is shared, so the correction reaches every guide — including
 * the Mississippi non-conviction packet Roger approved on 2026-09-20. Its full
 * English and full Spanish artifacts moved. Its court-only artifact did not,
 * because a court-only packet carries no guide at all.
 *
 * WHY THIS FILE EXISTS RATHER THAN AN EDIT
 *
 * `loadMsPaidConsumerSuccessor` reads the approved artifacts off disk and
 * refuses the approval outright when their digests do not match the decision.
 * That is correct and stays: an approval names bytes, and bytes that are not
 * those bytes are not approved. Editing the decision to name the new digests
 * would be manufacturing an owner decision, which is the one thing the build
 * may never do.
 *
 * So the decision is untouched and its approval is genuinely refused. This
 * record exists so the refusal is EXPLAINED rather than merely fatal: it names
 * the exact old and new digest of each artifact and the single cause. The
 * authority generator consults it for one purpose — to decide whether a
 * mismatch is this known, pending move or an unexplained one. An unexplained
 * mismatch still halts the build. This one produces a route with no paid
 * consumer authority and a gap that says what it is waiting for.
 *
 * It creates no approval, opens no route and authorises no publication. Roger
 * decides the new bytes at the Item 13B gate, with these hashes in front of him.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MS_NONCONVICTION_ARTIFACT_MOVE_PATH =
  "data/rcap-grade-a/legal-decisions/MS_NONCONVICTION_ARTIFACT_MOVE_2026-09-20.json";

const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/**
 * The move, if the record explains exactly the mismatch that is actually on
 * disk, and `null` otherwise.
 *
 * Every artifact the decision approves must be accounted for: an artifact the
 * record does not mention, a `from` that is not what the decision approved, or
 * a `to` that is not what is on disk all return null, which puts the caller
 * back on the unexplained-mismatch path.
 */
export function msNonconvictionArtifactMove(rootDir, decision) {
  let record;
  try {
    record = JSON.parse(fs.readFileSync(path.join(rootDir, MS_NONCONVICTION_ARTIFACT_MOVE_PATH), "utf8"));
  } catch { return null; }

  if (record.schemaVersion !== "rcap-approved-artifact-move/v1"
    || record.createsApproval !== false
    || record.approvesMovedBytes !== false
    || record.opensAnyRoute !== false
    || record.productionAuthorized !== false
    || record.awaitingOwnerDecision !== true
    || record.supersedes?.decisionId !== decision.decisionId
    || record.routeId !== decision.routeId) return null;

  const approved = new Map((decision.approvedArtifacts ?? []).map((entry) => [entry.id, entry]));
  const moved = record.artifacts ?? [];
  if (!Array.isArray(moved) || moved.length !== approved.size) return null;

  for (const entry of moved) {
    const was = approved.get(entry.id);
    if (!was || entry.path !== was.path || entry.from !== was.sha256) return null;
    let onDisk;
    try { onDisk = digest(fs.readFileSync(path.join(rootDir, entry.path))); } catch { return null; }
    if (entry.to !== onDisk) return null;
    // An artifact recorded as unmoved must genuinely be unmoved.
    if ((entry.from === entry.to) !== (entry.moved === false)) return null;
  }

  return record;
}
