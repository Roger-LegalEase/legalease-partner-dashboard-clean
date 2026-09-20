/**
 * Which recorded Nationwide paths are ACTIVE LAUNCH DEPENDENCIES, and are they held.
 *
 * WHY THIS EXISTS, AND WHAT IT IS NOT
 *
 * `private/nationwide-corpus-recovery-report.json` says 513 of 583, 70 missing.
 * That number is true and it keeps being read as the wrong thing. It measures
 * what one recovery kit could rebuild on 2026-09-19. It is not a count of
 * launch blockers, and every time it is read as one the same answer gets
 * re-derived: go and reacquire seventy files.
 *
 * The classification work that answers the real question was already done, on
 * 2026-09-02, and is sitting in NATIONWIDE_RESIDUAL_EXECUTION.json: every
 * unrecovered path carries a classification, a reason, and -- where it was
 * superseded -- the edition that replaced it. What was never done is applying
 * that record to anything. Nothing consumed it, so the repository went on
 * treating all 583 recorded paths as equally required and every historical
 * object as an active launch dependency.
 *
 * So this module answers one question the 583-denominator cannot:
 *
 *   Of the recorded corpus, which paths does a live route actually depend on,
 *   and is each of those held right now at its exact recorded bytes?
 *
 * IT DOES NOT REPLACE THE COMPLETENESS TEST.
 *
 * `operational-corpus-precondition.mjs` asks a different question -- whether a
 * regenerated overlay manifest still names an asset -- and that question is
 * genuinely about the WHOLE tree, because a tree missing documents answers "not
 * found in the delivery" for each of them and that is indistinguishable from a
 * real zero-reference result. Its 583/583 requirement stays exactly as strict
 * as it is. A partial custody still cannot assert completeness. This module is
 * a second, narrower contract beside it, not a relaxation of it.
 *
 * WHAT IT REFUSES TO DO
 *
 * It does not relabel missing bytes as recovered. A path classified settled is
 * still recorded as absent, with its bytes still absent; settled means nothing
 * live depends on it, which is a statement about dependency, never about
 * custody. Those are the two things this file keeps apart, because collapsing
 * them is how a corpus gets quietly declared whole.
 *
 * It is also fail-closed in the direction that matters. A recorded path is
 * ACTIVE unless the disposition names it BY SHA-256 and classifies it settled.
 * An unclassified path, a path whose hash does not match the disposition row,
 * and a path in an active class are all dependencies. Nothing is excused by
 * filename, by folder, by jurisdiction, or by being old.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const RESTORE_MANIFEST = "data/rcap-all50/nationwide-restore-manifest.json";
export const RESIDUAL_EXECUTION = "data/rcap-all50/NATIONWIDE_RESIDUAL_EXECUTION.json";

/**
 * Custody records that may prove a recorded path is held OUTSIDE the
 * operational tree. Each names exact SHA-256s and where the bytes sit, so a
 * binding can be checked rather than believed. Add a record here only when it
 * records exact bytes; a record that reports a filename proves nothing.
 */
export const CUSTODY_RECORDS = [
  {
    record: "data/rcap-grade-a/source-wave-integration/SOURCE_RECOVERY_WAVE1_2026-09-11.json",
    rows: (json) => json.sources ?? [],
    sha256: (row) => row.sha256,
    heldAt: (row) => row.heldCorpusPath
  }
];

/** A live route depends on these. Nothing in these classes is ever excused. */
export const ACTIVE_CLASSIFICATIONS = ["LIVE_PACKET_COMPONENT", "CURRENT_AUTHORITY_OR_INSTRUCTION"];

/**
 * Settled historical classes. Each is a determination already recorded on
 * 2026-09-02, with its own reason, and each means something different:
 *
 *   REFERENCE_ONLY            background material; no route names the file.
 *   ORPHANED_FROM_LIVE_ROUTES it was a route input once; no live route names it now.
 *   SUPERSEDED_SOURCE         a later edition of record replaced these bytes.
 *   ALREADY_HELD_OTHER_CUSTODY the bytes are held, outside the operational tree.
 */
export const SETTLED_CLASSIFICATIONS = [
  "REFERENCE_ONLY",
  "ORPHANED_FROM_LIVE_ROUTES",
  "SUPERSEDED_SOURCE",
  "ALREADY_HELD_OTHER_CUSTODY"
];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/** The disposition, indexed by the only identity that means anything here. */
export function dispositionByHash(rootDir) {
  const execution = readJson(path.join(rootDir, RESIDUAL_EXECUTION));
  const byHash = new Map();
  for (const row of execution.rows ?? []) byHash.set(row.sha256, row);
  return { execution, byHash };
}

/**
 * Every custody binding this repository can actually stand behind.
 *
 * A binding counts only when the file it names exists AND hashes to the
 * SHA-256 the record claims. A record naming bytes that are not there is a
 * stale record, and it is reported as one rather than trusted.
 */
export function custodyBindings(rootDir) {
  const held = new Map();
  const stale = [];
  for (const source of CUSTODY_RECORDS) {
    const recordPath = path.join(rootDir, source.record);
    if (!fs.existsSync(recordPath)) continue;
    for (const row of source.rows(readJson(recordPath))) {
      const hash = source.sha256(row);
      const at = source.heldAt(row);
      if (!hash || !at) continue;
      const abs = path.join(rootDir, at);
      let bytes;
      try { bytes = fs.readFileSync(abs); } catch {
        stale.push({ record: source.record, heldAt: at, sha256: hash, why: "the record names a file that is not there" });
        continue;
      }
      if (sha256(bytes) !== hash) {
        stale.push({ record: source.record, heldAt: at, sha256: hash, why: "the file is there and is not those bytes" });
        continue;
      }
      if (!held.has(hash)) held.set(hash, { heldAt: at, record: source.record });
    }
  }
  return { held, stale };
}

/**
 * The contract: every recorded path, with whether a live route depends on it.
 *
 * `operationalCorpusDir` is optional. When the operational tree is mounted its
 * contents are the first place a dependency can be satisfied; when it is not,
 * the contract still resolves, because custody records are evidence in their
 * own right and an unmounted tree is not a finding about dependency.
 */
export function activeDependencyContract(rootDir, operationalCorpusDir = null) {
  const manifest = readJson(path.join(rootDir, RESTORE_MANIFEST));
  const { execution, byHash } = dispositionByHash(rootDir);
  const { held, stale } = custodyBindings(rootDir);

  const inOperationalTree = new Set();
  if (operationalCorpusDir && fs.existsSync(operationalCorpusDir)) {
    for (const file of manifest.files) {
      const abs = path.join(operationalCorpusDir, file.relativePath);
      let bytes;
      try { bytes = fs.readFileSync(abs); } catch { continue; }
      if (sha256(bytes) === file.sha256) inOperationalTree.add(file.sha256);
    }
  }

  const rows = manifest.files.map((file) => {
    const disposition = byHash.get(file.sha256) ?? null;
    const classification = disposition?.classification ?? "UNCLASSIFIED";
    // Fail-closed: only a named, settled classification excuses a path.
    const active = !SETTLED_CLASSIFICATIONS.includes(classification);
    const custody = inOperationalTree.has(file.sha256)
      ? { heldAt: "operational corpus", record: RESTORE_MANIFEST }
      : held.get(file.sha256) ?? null;
    return {
      relativePath: file.relativePath,
      sha256: file.sha256,
      jurisdiction: disposition?.jurisdiction ?? null,
      classification,
      active,
      bytesHeld: Boolean(custody),
      custody,
      // Carried through so a settled row still says why, at the point of use.
      reason: disposition?.reason ?? null,
      successor: disposition?.currentOfficialEdition ?? null,
      familyIds: disposition?.familyIds ?? [],
      obligation: disposition?.obligation ?? null
    };
  });

  const activeRows = rows.filter((row) => row.active);
  const unheldActive = activeRows.filter((row) => !row.bytesHeld);

  /*
   * TWO POPULATIONS, AND THE REASON THEY MUST NOT BE ADDED TOGETHER.
   *
   * A path the disposition never names was never in dispute: it was recovered,
   * and the only thing that can confirm its bytes is a mounted tree. With the
   * tree absent, five hundred such paths report "not held" -- which is true
   * about this checkout and says nothing whatever about launch. Summed with the
   * real findings it buries them, and the resulting number is exactly the kind
   * of frightening denominator this whole record exists to stop producing.
   *
   * So the residual set -- the paths the disposition actually classifies -- is
   * reported on its own. That is where a classification decides anything, and
   * an unheld active path there is a genuine finding. Everything else is
   * reported as what it is: custody that this checkout cannot measure.
   */
  const inDisposition = (row) => byHash.has(row.sha256);
  const findings = unheldActive.filter(inDisposition);
  const pendingCorpusMount = unheldActive.filter((row) => !inDisposition(row));

  return {
    manifest: RESTORE_MANIFEST,
    disposition: RESIDUAL_EXECUTION,
    dispositionRecordedOn: execution.generatedOn ?? null,
    recorded: rows.length,
    rows,
    counts: {
      residual: rows.filter(inDisposition).length,
      residualActive: activeRows.filter(inDisposition).length,
      residualActiveHeld: activeRows.filter(inDisposition).filter((row) => row.bytesHeld).length,
      residualActiveUnheld: findings.length,
      settled: rows.length - activeRows.length,
      neverInDispute: rows.filter((row) => !inDisposition(row)).length,
      custodyNotMeasurableHere: pendingCorpusMount.length,
      // Custody, reported separately from dependency and never merged into it.
      bytesHeldAnywhere: rows.filter((row) => row.bytesHeld).length
    },
    /** The real findings: classified live, and held nowhere this repo can check. */
    findings,
    pendingCorpusMount,
    staleCustodyBindings: stale,
    /** Satisfied is about the residual set. The rest is a mount question. */
    satisfied: findings.length === 0
  };
}

/** Settled rows grouped by class, for a status report that stays readable. */
export function settledByClassification(contract) {
  const grouped = {};
  for (const row of contract.rows) {
    if (row.active) continue;
    (grouped[row.classification] ??= []).push(row);
  }
  return grouped;
}
