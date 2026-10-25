// RCAP acceptance — the canonical worker image-input manifest.
//
// ENV-007 correction: worker equivalence must not be a whole-directory
// comparison of `scripts/lib`. It must be an explicit list of the files that
// actually enter the worker image build context, each with its own SHA-256, in
// a deterministic order, with no unlisted input.
//
// The build context is derived from deploy/rcap-render-worker/Dockerfile rather
// than asserted. Every COPY instruction that reads from the context contributes
// its paths; the `--from=deps` COPY does not, because node_modules is produced
// inside the image from package.json + package-lock.json, both of which are
// already context inputs.
//
// HONEST FINDING, recorded rather than fixed here: line 29 is
// `COPY scripts/lib/ scripts/lib/` — a whole-directory copy. The ENV-007
// control modules that live under scripts/lib (rcap-migration-manifest.mjs and
// rcap-acceptance-schema-snapshot.mjs) therefore DO enter the image context,
// even though the worker never imports them. They are listed as inputs because
// they are inputs. The manifest makes that entanglement visible per file
// instead of hiding it inside a directory-level `git diff`, and
// scripts/control/ was chosen for new infrastructure-only modules precisely
// because no COPY reads it. Narrowing that COPY would change the image and is
// out of scope while WORKER_AUTHORITY_BLOCKED stands.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const DOCKERFILE_RELATIVE_PATH = "deploy/rcap-render-worker/Dockerfile";
export const MANIFEST_RELATIVE_PATH = "data/rcap-render/worker-image-input-manifest.json";

/** Paths that are build inputs by virtue of being the build recipe itself. */
export const RECIPE_PATHS = Object.freeze([DOCKERFILE_RELATIVE_PATH]);

/**
 * Parse the Dockerfile's context-reading COPY instructions.
 * Returns the ordered list of context path specs, each flagged directory or file.
 */
export function parseBuildContextSpecs(dockerfileText) {
  const specs = [];
  for (const rawLine of dockerfileText.split("\n")) {
    const line = rawLine.trim();
    if (!/^COPY\s/i.test(line)) continue;
    if (/^COPY\s+--from=/i.test(line)) continue; // produced inside the image, not read from the context
    const args = line.replace(/^COPY\s+/i, "").split(/\s+/).filter(Boolean);
    if (args.length < 2) continue;
    for (const src of args.slice(0, -1)) {
      if (src.startsWith("--")) continue;
      specs.push({ spec: src, directory: src.endsWith("/") });
    }
  }
  return specs;
}

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function trackedFilesUnder(rootDir, spec) {
  const out = execFileSync("git", ["ls-files", "-z", "--", spec], {
    cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 28
  });
  return out.split("\0").filter(Boolean);
}

/**
 * Build the manifest for a working tree.
 *
 * Every entry carries the exact repository-relative path, its SHA-256, its byte
 * size, and the Dockerfile instruction that pulls it into the context — the
 * build-context inclusion proof. Ordering is byte-wise on the path, so the
 * manifest and its aggregate hash are deterministic.
 */
export function buildWorkerImageInputManifest(rootDir) {
  const dockerfileAbs = path.join(rootDir, DOCKERFILE_RELATIVE_PATH);
  const dockerfileText = fs.readFileSync(dockerfileAbs, "utf8");
  const specs = parseBuildContextSpecs(dockerfileText);

  const byPath = new Map();
  const addFile = (rel, inclusion) => {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return;
    if (byPath.has(rel)) { byPath.get(rel).inclusion.push(inclusion); return; }
    const buf = fs.readFileSync(abs);
    byPath.set(rel, { path: rel, sha256: sha256(buf), bytes: buf.length, inclusion: [inclusion] });
  };

  for (const { spec, directory } of specs) {
    const inclusion = directory ? `COPY ${spec} (directory)` : `COPY ${spec}`;
    if (directory) for (const rel of trackedFilesUnder(rootDir, spec)) addFile(rel, inclusion);
    else addFile(spec, inclusion);
  }
  for (const rel of RECIPE_PATHS) addFile(rel, "build recipe");

  const entries = [...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const aggregate = sha256(Buffer.from(entries.map((e) => `${e.path}:${e.sha256}`).join("\n"), "utf8"));

  return {
    schemaVersion: "rcap-worker-image-input-manifest/v1",
    dockerfile: DOCKERFILE_RELATIVE_PATH,
    contextSpecs: specs,
    ordering: "byte-wise ascending on path",
    fileCount: entries.length,
    aggregateSha256: aggregate,
    entries
  };
}

function trackedFilesUnderAtCommit(rootDir, sha, spec) {
  const out = execFileSync("git", ["ls-tree", "-r", "-z", "--name-only", sha, "--", spec], {
    cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 28
  });
  return out.split("\0").filter(Boolean);
}

/**
 * Read the exact bytes of many paths at one commit with a single `git cat-file
 * --batch` process, so hashing a 1000-file context does not spawn 1000 children
 * and cannot pick up an uncommitted working-tree edit.
 */
function readBlobsAtCommit(rootDir, sha, relPaths) {
  if (relPaths.length === 0) return new Map();
  const input = relPaths.map((rel) => `${sha}:${rel}`).join("\n") + "\n";
  const raw = execFileSync("git", ["cat-file", "--batch"], {
    cwd: rootDir, input, maxBuffer: 1 << 30
  });
  const out = new Map();
  let off = 0;
  for (const rel of relPaths) {
    const nl = raw.indexOf(0x0a, off);
    if (nl < 0) break;
    const header = raw.subarray(off, nl).toString("utf8");
    off = nl + 1;
    const m = /^\S+ (\S+) (\d+)$/.exec(header);
    if (!m) continue;               // "missing" — absent at this commit
    const size = Number(m[2]);
    out.set(rel, raw.subarray(off, off + size));
    off += size + 1;                // payload plus its trailing newline
  }
  return out;
}

/**
 * The same manifest, built from a commit instead of the working tree. This is
 * what worker-source equivalence is computed over: two commits produce two
 * per-file manifests, and the comparison names individual paths.
 */
export function buildWorkerImageInputManifestAtCommit(rootDir, sha, dockerfileText = null) {
  const text = dockerfileText ?? execFileSync(
    "git", ["show", `${sha}:${DOCKERFILE_RELATIVE_PATH}`], { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 28 }
  );
  const specs = parseBuildContextSpecs(text);

  const ordered = [];
  const inclusionOf = new Map();
  const remember = (rel, inclusion) => {
    if (inclusionOf.has(rel)) { inclusionOf.get(rel).push(inclusion); return; }
    inclusionOf.set(rel, [inclusion]);
    ordered.push(rel);
  };
  for (const { spec, directory } of specs) {
    const inclusion = directory ? `COPY ${spec} (directory)` : `COPY ${spec}`;
    if (directory) for (const rel of trackedFilesUnderAtCommit(rootDir, sha, spec)) remember(rel, inclusion);
    else remember(spec, inclusion);
  }
  for (const rel of RECIPE_PATHS) remember(rel, "build recipe");

  const blobs = readBlobsAtCommit(rootDir, sha, ordered);
  const entries = ordered
    .filter((rel) => blobs.has(rel))
    .map((rel) => {
      const buf = blobs.get(rel);
      return { path: rel, sha256: sha256(buf), bytes: buf.length, inclusion: inclusionOf.get(rel) };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const aggregate = sha256(Buffer.from(entries.map((e) => `${e.path}:${e.sha256}`).join("\n"), "utf8"));
  return {
    schemaVersion: "rcap-worker-image-input-manifest/v1",
    sourceCommit: sha,
    dockerfile: DOCKERFILE_RELATIVE_PATH,
    contextSpecs: specs,
    ordering: "byte-wise ascending on path",
    fileCount: entries.length,
    aggregateSha256: aggregate,
    entries
  };
}

/**
 * Compare two manifests. Equivalence is per file: added, removed and changed
 * inputs are named individually, never as "the scripts/lib directory differs".
 */
export function compareManifests(a, b) {
  const am = new Map(a.entries.map((e) => [e.path, e.sha256]));
  const bm = new Map(b.entries.map((e) => [e.path, e.sha256]));
  const added = [...bm.keys()].filter((p) => !am.has(p)).sort();
  const removed = [...am.keys()].filter((p) => !bm.has(p)).sort();
  const changed = [...am.keys()].filter((p) => bm.has(p) && bm.get(p) !== am.get(p)).sort();
  return {
    identical: added.length === 0 && removed.length === 0 && changed.length === 0,
    added, removed, changed,
    aggregateA: a.aggregateSha256,
    aggregateB: b.aggregateSha256
  };
}

/** Every listed path must be reachable from a context spec; nothing else may be listed. */
export function verifyNoUnlistedInput(manifest, rootDir) {
  const errors = [];
  const specs = manifest.contextSpecs ?? [];
  const covered = new Set();
  for (const { spec, directory } of specs) {
    if (directory) for (const rel of trackedFilesUnder(rootDir, spec)) covered.add(rel);
    else covered.add(spec);
  }
  for (const rel of RECIPE_PATHS) covered.add(rel);
  for (const e of manifest.entries) {
    if (!covered.has(e.path)) errors.push(`${e.path} is listed but no COPY instruction reads it`);
    covered.delete(e.path);
  }
  for (const rel of covered) {
    if (fs.existsSync(path.join(rootDir, rel))) errors.push(`${rel} enters the build context but is not listed`);
  }
  return { ok: errors.length === 0, errors };
}
