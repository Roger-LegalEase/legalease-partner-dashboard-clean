// Restricted-change guard for the state-promotion verifiers.
//
// A state-promotion pass must not quietly touch production API, auth, billing or
// participant surfaces. The guard enforces that by diffing the branch against
// main and refusing any change under a restricted prefix.
//
// The defect it had: "changed against origin/main" is not the same question as
// "did this branch change a restricted file". A branch cut from an unmerged
// platform lane inherits that lane's restricted paths in the diff forever, so
// the guard fired permanently on work the branch did not do — and the verifier
// still printed "Restricted production/auth/billing files untouched" beside the
// failure. A guard that always fails is a guard nobody reads.
//
// The fix is not an exemption list. An inherited path is acknowledged once, by
// the exact content hash it was reviewed at, in
// `docs/rcap-promotion/inherited-restricted-changes.json`. Edit an acknowledged
// file and its hash moves and the guard fails again; add a restricted path that
// is not listed and the guard fails as before. The rule becomes narrower, not
// looser, and it becomes actionable again.
//
// Both promotion verifiers import this so the two copies cannot drift apart.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Path prefixes a state-promotion pass may not change.
 *
 * Kept as one exported list so a prefix cannot be dropped from one verifier and
 * left in the other.
 */
export const RESTRICTED_PREFIXES = [
  "src/app/api/",
  "src/app/auth/",
  "src/app/p/",
  "src/app/intake/",
  "src/app/documents/",
  "src/app/briefcase/",
  "src/app/partner/",
  "src/app/partners/",
  "src/app/request-pilot/",
  "src/app/internal/billing/",
  "src/lib/auth/",
  "src/lib/partners/billing",
  "src/lib/partners/session-partner",
  "src/lib/partners/partner-dashboard-rls",
  "src/lib/partners/partner-repository",
  "src/lib/partners/partner-service",
  "src/lib/rcap/documents/mississippi/",
  "src/lib/rcap/documents/illinois/",
  "src/lib/rcap/documents/dc/",
  "src/lib/rcap/documents/pennsylvania/",
  "src/lib/rcap/documents/texas-harris/",
  "src/lib/stripe",
  "src/lib/billing",
  "supabase/",
  "vercel",
  ".env",
  ".github/workflows/deploy",
  "src/app/expungement-ai/",
  "src/app/expungement/",
  "src/components/expungement-ai/",
  "src/components/expungement/"
];

export const ACKNOWLEDGEMENT_PATH = "docs/rcap-promotion/inherited-restricted-changes.json";

export function isRestrictedPath(file) {
  return RESTRICTED_PREFIXES.some((prefix) => file.startsWith(prefix));
}

/**
 * Evaluates the guard.
 *
 * Returns `{ failures, notes, ... }` rather than throwing, so a verifier can
 * fold the failures into its own list and keep reporting everything else it
 * found in the same run.
 */
export function evaluateRestrictedChanges(rootDir) {
  const failures = [];
  const notes = [];

  const baseRef = resolveMainBaseRef(rootDir);
  if (!baseRef) {
    failures.push("Could not resolve origin/main or main for restricted-file comparison.");
    return { failures, notes, changedRestricted: [], acknowledged: [], unacknowledged: [] };
  }

  const mergeBase = gitOneLine(rootDir, ["merge-base", "HEAD", baseRef]);
  if (!mergeBase) {
    failures.push(`Could not compute merge base between HEAD and ${baseRef}.`);
    return { failures, notes, changedRestricted: [], acknowledged: [], unacknowledged: [] };
  }

  const changedFiles = git(rootDir, ["diff", "--name-only", mergeBase, "HEAD"]);
  const changedRestricted = changedFiles.filter(isRestrictedPath);

  const acknowledgement = readAcknowledgement(rootDir, failures);
  const entries = acknowledgement?.entries ?? [];
  const byPath = new Map();

  for (const entry of entries) {
    // A malformed entry must never silently grant permission.
    if (!entry.path || typeof entry.path !== "string") {
      failures.push(`${ACKNOWLEDGEMENT_PATH}: an entry has no path.`);
      continue;
    }
    if (!isRestrictedPath(entry.path)) {
      failures.push(
        `${ACKNOWLEDGEMENT_PATH}: ${entry.path} is not under a restricted prefix, so acknowledging it means nothing.`
      );
      continue;
    }
    if (!/^[0-9a-f]{40}$/.test(String(entry.blobSha256 ?? ""))) {
      failures.push(`${ACKNOWLEDGEMENT_PATH}: ${entry.path} has no valid pinned content hash.`);
      continue;
    }
    if (!entry.reason || String(entry.reason).trim().length < 40) {
      failures.push(`${ACKNOWLEDGEMENT_PATH}: ${entry.path} has no substantive reason.`);
      continue;
    }
    if (!entry.reviewedUnder || !Array.isArray(entry.introducedBy) || entry.introducedBy.length === 0) {
      failures.push(`${ACKNOWLEDGEMENT_PATH}: ${entry.path} does not record what reviewed it or what introduced it.`);
      continue;
    }
    if (byPath.has(entry.path)) {
      failures.push(`${ACKNOWLEDGEMENT_PATH}: ${entry.path} is acknowledged twice.`);
      continue;
    }
    byPath.set(entry.path, entry);
  }

  const acknowledged = [];
  const unacknowledged = [];

  for (const file of changedRestricted) {
    const entry = byPath.get(file);
    if (!entry) {
      unacknowledged.push(file);
      continue;
    }
    // The acknowledgement is pinned to content, not to a path. Re-editing an
    // acknowledged file moves its hash and it fails again.
    const currentHash = gitOneLine(rootDir, ["rev-parse", `HEAD:${file}`]);
    if (!currentHash) {
      failures.push(`${file} is acknowledged but could not be read at HEAD.`);
      continue;
    }
    if (currentHash !== entry.blobSha256) {
      failures.push(
        `${file} has changed since it was acknowledged (pinned ${entry.blobSha256.slice(0, 12)}, now ${currentHash.slice(0, 12)}). Re-review it and update ${ACKNOWLEDGEMENT_PATH}.`
      );
      continue;
    }
    acknowledged.push(file);
  }

  if (unacknowledged.length > 0) {
    failures.push(`Restricted files changed: ${unacknowledged.join(", ")}`);
  }

  // A stale entry grants nothing — its path is no longer in the diff — but it
  // should be removed once the platform lane lands, so it is surfaced.
  for (const [file] of byPath) {
    if (!changedRestricted.includes(file)) {
      notes.push(`${file} is acknowledged but no longer differs from ${baseRef}; the entry can be removed.`);
    }
  }

  return { failures, notes, baseRef, mergeBase, changedRestricted, acknowledged, unacknowledged };
}

function readAcknowledgement(rootDir, failures) {
  const file = path.join(rootDir, ACKNOWLEDGEMENT_PATH);
  if (!fs.existsSync(file)) return { entries: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(parsed.entries)) {
      failures.push(`${ACKNOWLEDGEMENT_PATH} has no entries array.`);
      return { entries: [] };
    }
    return parsed;
  } catch (error) {
    failures.push(`${ACKNOWLEDGEMENT_PATH} could not be parsed: ${String(error?.message ?? error).slice(0, 120)}`);
    return { entries: [] };
  }
}

function git(rootDir, args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 && result.error && !result.stdout) throw result.error;
  return (result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function gitOneLine(rootDir, args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 || (result.error && !result.stdout)) return null;
  return result.stdout.trim() || null;
}

function resolveMainBaseRef(rootDir) {
  for (const candidate of [
    ["refs/remotes/origin/main", "origin/main"],
    ["refs/heads/main", "main"]
  ]) {
    if (gitOneLine(rootDir, ["rev-parse", "--verify", `${candidate[0]}^{commit}`])) return candidate[1];
  }
  return null;
}
