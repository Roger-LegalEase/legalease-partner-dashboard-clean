import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Exact-path production authorization.
//
// `supabase/` stays globally forbidden below. This does not widen the prefix:
// it lets the guard tell an unauthorized production change apart from one the
// owner approved by exact path and exact bytes. A file is permitted only when
// every condition holds, and any drift in path or content voids it.
//
// Deliberately excluded: wildcards, prefixes, directories, renames, and any
// file not named in the authorization record.
const AUTHORIZATION_QUEUE = "data/rcap-authorization-queue.json";

function loadExactPathAuthorizations(rootDir, failures) {
  const queuePath = path.join(rootDir, AUTHORIZATION_QUEUE);
  if (!fs.existsSync(queuePath)) return new Map();

  let queue;
  try {
    queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  } catch (error) {
    failures.push(`Authorization queue is unreadable: ${error.message}`);
    return new Map();
  }

  const authorized = new Map();
  for (const entry of queue.entries || []) {
    // An entry only grants anything when it names paths AND hashes.
    if (!Array.isArray(entry.authorizedPaths) || entry.authorizedPaths.length === 0) continue;

    const id = entry.id || "(unnamed authorization)";
    const problems = [];
    if (entry.decision !== "approved") problems.push("decision is not 'approved'");
    if (!Number.isInteger(entry.phase)) problems.push("no integer phase");
    if (!entry.authorizedBy) problems.push("no authorizedBy");
    if (!entry.authorizedAt) problems.push("no authorizedAt");
    if (!entry.authorizationScope) problems.push("no authorizationScope");
    if (!Array.isArray(entry.authorizedSha256)) {
      problems.push("no authorizedSha256 array");
    } else if (entry.authorizedSha256.length !== entry.authorizedPaths.length) {
      problems.push("authorizedSha256 length does not match authorizedPaths");
    } else if (!entry.authorizedSha256.every((h) => /^[0-9a-f]{64}$/.test(String(h)))) {
      problems.push("authorizedSha256 contains a value that is not a sha256");
    }

    if (problems.length > 0) {
      // A malformed authorization grants nothing and is itself a failure, so a
      // broken record cannot quietly degrade into "no exception".
      failures.push(`Authorization ${id} is malformed and grants nothing: ${problems.join("; ")}`);
      continue;
    }

    entry.authorizedPaths.forEach((p, i) => {
      authorized.set(p, { sha256: entry.authorizedSha256[i], phase: entry.phase, id });
    });
  }
  return authorized;
}

function fileSha256(rootDir, relPath) {
  const abs = path.join(rootDir, relPath);
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

/**
 * Filters an already-computed forbidden list through the exact-path
 * authorizations, for verifiers that carry their own inline restricted-path
 * check rather than calling assertSourceEngineChangeScope.
 *
 * Semantics are identical to the main guard and deliberately all-or-nothing:
 * a path is removed only when it is exactly authorized at exactly the
 * recorded bytes, AND no unauthorized path remains in the list, AND the
 * SQL/TypeScript contract verifier passes. If any condition fails, the list
 * is returned with the authorized paths still in it, so nothing sails through
 * alongside an unauthorized change.
 *
 * The caller's own prefixes and allowlists are untouched: this only ever
 * REMOVES entries the owner specifically approved, never adds tolerance for
 * anything else.
 */
export function applyExactPathAuthorizations({ rootDir, candidates, failures }) {
  if (!Array.isArray(candidates) || candidates.length === 0) return candidates ?? [];

  const exactAuthorized = loadExactPathAuthorizations(rootDir, failures);
  if (exactAuthorized.size === 0) return candidates;

  const remaining = [];
  const authorizedHits = [];
  for (const candidate of candidates) {
    const grant = exactAuthorized.get(candidate);
    if (!grant) {
      remaining.push(candidate);
      continue;
    }
    const actual = fileSha256(rootDir, candidate);
    if (actual !== grant.sha256) {
      remaining.push(
        `${candidate} (authorized by ${grant.id} but content hash ${actual ? actual.slice(0, 12) : "missing"}… does not match authorized ${grant.sha256.slice(0, 12)}…; authorization is void)`
      );
      continue;
    }
    authorizedHits.push(candidate);
  }

  if (authorizedHits.length === 0) return remaining;

  if (remaining.length > 0) {
    // Unauthorized paths present: the grant does not cover the set.
    return candidates;
  }

  const contract = contractVerifierPasses(rootDir);
  if (!contract.ok) {
    failures.push(
      `Authorized supabase change present but the render-job contract verifier fails (${contract.reason}); authorization requires it green`
    );
    return candidates;
  }

  return remaining;
}

// Condition: the SQL/TypeScript contract must hold before any authorized
// migration change is let through. An approved migration that has drifted from
// the contract is not the thing that was approved.
function contractVerifierPasses(rootDir) {
  const script = path.join(rootDir, "scripts/verify-rcap-render-job-contract.mjs");
  const fixture = path.join(rootDir, "data/rcap-render/state-machine.json");
  const contract = path.join(rootDir, "src/lib/rcap/render/job-contract.ts");
  if (!fs.existsSync(script)) return { ok: false, reason: "contract verifier is missing" };

  // Content-addressed pass cache. Several verifiers chain-invoke each other
  // through npm scripts, and each process re-running the contract verifier
  // added ~4s per hop. The verifier's verdict depends only on the bytes of the
  // fixture, the TypeScript contract and the verifier itself, so a pass is
  // cached under the digest of exactly those bytes: any drift in any input
  // changes the key and forces a real run. Failures are never cached.
  let cacheKey = null;
  try {
    const h = crypto.createHash("sha256");
    for (const f of [script, fixture, contract]) {
      h.update(f);
      h.update(fs.existsSync(f) ? fs.readFileSync(f) : "missing");
    }
    cacheKey = h.digest("hex");
    const cachePath = path.join(os.tmpdir(), `rcap-contract-pass-${cacheKey}`);
    if (fs.existsSync(cachePath)) return { ok: true };
  } catch {
    // Cache trouble is never a reason to skip the real check.
    cacheKey = null;
  }

  const result = spawnSync("node", [script], { cwd: rootDir, encoding: "utf8", timeout: 60000 });
  if (result.status === 0) {
    if (cacheKey) {
      try {
        fs.writeFileSync(path.join(os.tmpdir(), `rcap-contract-pass-${cacheKey}`), "");
      } catch {
        // Failing to cache costs time, not correctness.
      }
    }
    return { ok: true };
  }
  return {
    ok: false,
    reason: (result.stderr || result.stdout || "").trim().split("\n").slice(-1)[0] || "non-zero exit"
  };
}

const sourceEngineAllowedFiles = new Set([
  "src/app/api/expungement-ai/evaluate/route.ts",
  "src/app/api/expungement-ai/profiles/[state]/route.ts",
  "src/app/api/rcap/documents/[packetId]/generate/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/app/api/rcap/documents/[packetId]/route.ts",
  "src/app/api/rcap/documents/[packetId]/save/route.ts",
  "src/app/api/rcap/documents/dc/create/route.ts",
  "src/app/api/rcap/documents/illinois/create/route.ts",
  "src/app/api/rcap/documents/mississippi/create/route.ts",
  "src/app/api/rcap/documents/pennsylvania/create/route.ts",
  "src/app/api/rcap/documents/texas-harris/create/route.ts",
  "src/app/documents/[partnerSlug]/[packetId]/page.tsx",
  "src/app/documents/[partnerSlug]/form/DcMotionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/PennsylvaniaPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/TexasHarrisPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/page.tsx",
  "src/app/expungement-ai/check/page.tsx",
  "src/app/expungement-ai/results/page.tsx"
]);

const legacyGeneratorPrefixes = [
  "src/lib/rcap/documents/mississippi/",
  "src/lib/rcap/documents/illinois/",
  "src/lib/rcap/documents/dc/",
  "src/lib/rcap/documents/pennsylvania/",
  "src/lib/rcap/documents/texas-harris/"
];

const productionForbiddenPrefixes = [
  "src/app/auth/",
  "src/app/internal/billing/",
  "src/lib/auth/",
  "src/lib/partners/billing",
  "src/lib/partners/session-partner",
  "src/lib/partners/partner-dashboard-rls",
  "src/lib/partners/partner-repository",
  "src/lib/partners/partner-service",
  "src/lib/stripe",
  "src/lib/billing",
  "supabase/",
  "vercel",
  ".env",
  ".github/workflows/deploy",
  "src/app/expungement/",
  "src/components/expungement/"
];

export function assertSourceEngineChangeScope({
  rootDir,
  failures,
  extraForbiddenPrefixes = [],
  extraAllowedFiles = []
}) {
  const changedEntries = changedEntriesAgainstMain(rootDir, failures);
  const forbiddenPrefixes = [...productionForbiddenPrefixes, ...extraForbiddenPrefixes];
  const allowedFiles = new Set(extraAllowedFiles);
  const exactAuthorized = loadExactPathAuthorizations(rootDir, failures);
  const forbidden = [];
  const authorizedHits = [];

  for (const entry of changedEntries) {
    if (sourceEngineAllowedFiles.has(entry.path)) continue;
    if (allowedFiles.has(entry.path)) continue;

    const legacyPrefix = legacyGeneratorPrefixes.find((prefix) => entry.path.startsWith(prefix));
    if (legacyPrefix) {
      if (entry.status !== "D") forbidden.push(`${entry.path} (${entry.status}; legacy generators may only be removed)`);
      continue;
    }

    if (!forbiddenPrefixes.some((prefix) => entry.path.startsWith(prefix))) continue;

    // Forbidden by prefix. The only escape is an owner authorization naming
    // this exact path, whose current bytes hash to the authorized digest.
    const grant = exactAuthorized.get(entry.path);
    if (!grant) {
      forbidden.push(entry.path);
      continue;
    }
    const actual = fileSha256(rootDir, entry.path);
    if (actual !== grant.sha256) {
      forbidden.push(
        `${entry.path} (authorized by ${grant.id} but content hash ${actual ? actual.slice(0, 12) : "missing"}… does not match authorized ${grant.sha256.slice(0, 12)}…; authorization is void)`
      );
      continue;
    }
    authorizedHits.push({ path: entry.path, grant });
  }

  // The authorization travels with its conditions. If any forbidden-prefix path
  // in the diff is unauthorized, the specifically approved ones do not sail
  // through alongside it — the whole set fails until the diff is clean.
  if (authorizedHits.length > 0 && forbidden.length > 0) {
    failures.push(
      `Restricted files changed alongside authorized ones; the authorization does not cover the extra paths: ${forbidden.join(", ")}`
    );
    return;
  }

  // And the SQL/TypeScript contract must hold: bytes that pass the hash check
  // but fail the contract are not the change that was approved.
  if (authorizedHits.length > 0) {
    const contract = contractVerifierPasses(rootDir);
    if (!contract.ok) {
      failures.push(
        `Authorized supabase change present but the render-job contract verifier fails (${contract.reason}); authorization requires it green`
      );
      return;
    }
  }

  if (forbidden.length > 0) failures.push(`Restricted files changed: ${forbidden.join(", ")}`);
}

function changedEntriesAgainstMain(rootDir, failures) {
  const baseRef = resolveMainBaseRef(rootDir);
  if (!baseRef) {
    failures.push("Could not resolve origin/main or main for restricted-file comparison.");
    return [];
  }

  const mergeBase = gitOneLine(rootDir, ["merge-base", "HEAD", baseRef]);
  if (!mergeBase) {
    failures.push(`Could not compute merge base between HEAD and ${baseRef}.`);
    return [];
  }

  return git(rootDir, ["diff", "--name-status", mergeBase, "HEAD"]).map((line) => {
    const [status, firstPath, secondPath] = line.split("\t");
    return { status: status?.[0] ?? "", path: secondPath || firstPath || "" };
  }).filter((entry) => entry.path);
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
