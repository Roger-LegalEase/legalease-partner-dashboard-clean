#!/usr/bin/env node
// ENV-007 — audit-to-deployment byte equivalence over the AUDITED SURFACE.
//
// The question this answers is not "do these two commits differ" — they do —
// but "does any file the Phase 1 flow audit actually measured differ between
// the commit that was audited and the commit that would be deployed".
//
// The audited surface is COMPUTED, never asserted. It is the transitive import
// closure of a declared root set:
//
//   * every src path the Phase 1 flow manifest names;
//   * state selection, screening, evaluation, waiting-rule resolution, packet
//     readiness and checkout routing;
//   * consumer Briefcase next-action routing;
//   * the payment and sponsorship guards the ten hosted journeys exercise.
//
// A difference INSIDE that closure blocks deployment. A difference outside it
// is reported with the reason "not reachable from any audited root", which is a
// derived fact, not the claim that some number of files are onboarding files.
//
// Read-only: git object reads only. Deploys nothing, writes one evidence file.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(rootDir, "data/rcap-render/audit-surface-equivalence.json");

const AUDIT_HEAD = process.env.RCAP_AUDIT_HEAD ?? "d32267b8135ee18d33fdf6d4178ea87127138efe";
const APPLICATION_SOURCE_SHA = process.env.RCAP_APPLICATION_SOURCE_SHA ?? "f7ed0ad3a8f37a0c1446b62760b1a36fb163c926";
const TOOLS_SHA = process.env.RCAP_TOOLS_SHA ?? "6d9e8792b8c68671220cac5f294562e3b3ba1b25";
const AUDIT_PACKET_COMMIT = process.env.RCAP_AUDIT_PACKET_COMMIT ?? "00212d529e82a2a2a90b172b29268922feecfcbd";

const git = (...args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 28 });
// stdio "pipe" on stderr: a path absent on one side is an expected outcome the
// caller handles, not something to print a fatal line about.
const gitBuf = (...args) => execFileSync("git", args, { cwd: rootDir, maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const tryGit = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function treeFiles(ref, prefix = "src") {
  return git("ls-tree", "-r", "--name-only", ref, prefix).split("\n").filter(Boolean);
}
function readAt(ref, rel) {
  return tryGit(() => gitBuf("show", `${ref}:${rel}`), null);
}

// --- roots -------------------------------------------------------------------

const allAuditFiles = new Set(treeFiles(AUDIT_HEAD));

/** The flow manifest's own src references. Component names appear with a .ts
 *  suffix where the file is .tsx, so each is resolved against the real tree. */
function flowManifestRoots() {
  const raw = readAt(AUDIT_PACKET_COMMIT, "data/expungement-ai/flow-audit/flow-manifest.json");
  if (!raw) return { roots: [], unresolved: [], source: "unavailable" };
  const text = raw.toString("utf8");
  const referenced = [...new Set(text.match(/src\/[A-Za-z0-9_.@/\[\]-]+\.(?:tsx?|json)/g) ?? [])];
  const roots = [];
  const unresolved = [];
  for (const ref of referenced) {
    if (allAuditFiles.has(ref)) { roots.push(ref); continue; }
    const asTsx = ref.replace(/\.ts$/, ".tsx");
    if (allAuditFiles.has(asTsx)) { roots.push(asTsx); continue; }
    unresolved.push(ref);
  }
  return { roots: [...new Set(roots)], unresolved, source: `${AUDIT_PACKET_COMMIT}:data/expungement-ai/flow-audit/flow-manifest.json` };
}

/** Declared roots for the concerns the flow manifest names but does not enumerate as files. */
const DECLARED_ROOT_PATTERNS = [
  { concern: "state selection and screening UI", re: /^src\/app\/expungement-ai\/(check|screening|start)\// },
  { concern: "screening components", re: /^src\/components\/expungement-ai\/screening\// },
  { concern: "screening, evaluation and profile APIs", re: /^src\/app\/api\/expungement-ai\/(evaluate|profiles|screening)\// },
  { concern: "consumer Briefcase next-action routing", re: /^src\/app\/briefcase\// },
  { concern: "packet information and packet APIs", re: /^src\/app\/api\/expungement-ai\/(packet|briefcase)\// },
  { concern: "payment and sponsorship guards", re: /^src\/app\/api\/(expungement-ai\/(checkout|payment)|stripe)\// },
  { concern: "evaluation and waiting-rule resolution", re: /^src\/lib\/rcap-engine\/(evaluator|packet-planner|component-deferral-clamp)\.ts$/ },
  { concern: "packet readiness and checkout routing", re: /^src\/lib\/rcap\/documents\/(packet-route-resolver|guidance-packet-registry)\.ts$/ },
  { concern: "payment and sponsorship guards", re: /^src\/lib\/(expungement-ai\/(consumer-payment-authority|payment-adapter|checkout-reconciliation|packet-information)|stripe\/(server|webhook-handler))\.ts$/ }
];

function declaredRoots() {
  const out = [];
  for (const file of allAuditFiles) {
    for (const { concern, re } of DECLARED_ROOT_PATTERNS) {
      if (re.test(file) && /\.(tsx?|json)$/.test(file)) { out.push({ file, concern }); break; }
    }
  }
  return out;
}

// --- transitive import closure ----------------------------------------------

const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
const EXTENSIONS = ["", ".ts", ".tsx", ".json", "/index.ts", "/index.tsx"];

function resolveSpecifier(spec, fromFile, fileSet) {
  let base = null;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  else return null; // bare specifier: a package, outside the repository surface
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (fileSet.has(candidate)) return candidate;
  }
  return null;
}

function closureFrom(roots, ref, fileSet) {
  const seen = new Set();
  const unresolvedSpecifiers = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file) || !fileSet.has(file)) continue;
    seen.add(file);
    if (!/\.tsx?$/.test(file)) continue; // JSON and assets are leaves
    const buf = readAt(ref, file);
    if (!buf) continue;
    const text = buf.toString("utf8");
    IMPORT_RE.lastIndex = 0;
    let m;
    while ((m = IMPORT_RE.exec(text)) !== null) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      const resolved = resolveSpecifier(spec, file, fileSet);
      if (resolved) queue.push(resolved);
      else if (spec.startsWith("@/") || spec.startsWith(".")) unresolvedSpecifiers.push({ from: file, specifier: spec });
    }
  }
  return { closure: [...seen].sort(), unresolvedSpecifiers };
}

// --- compare -----------------------------------------------------------------

const manifestRoots = flowManifestRoots();
const declared = declaredRoots();
const roots = [...new Set([...manifestRoots.roots, ...declared.map((d) => d.file)])].sort();

const { closure, unresolvedSpecifiers } = closureFrom(roots, AUDIT_HEAD, allAuditFiles);

const deployFiles = new Set(treeFiles(APPLICATION_SOURCE_SHA));

const identical = [];
const differing = [];
for (const file of closure) {
  const a = readAt(AUDIT_HEAD, file);
  const b = readAt(APPLICATION_SOURCE_SHA, file);
  const aHash = a ? sha256(a) : null;
  const bHash = b ? sha256(b) : null;
  const row = { path: file, auditHeadSha256: aHash, applicationSourceSha256: bHash, presentInBoth: Boolean(a && b) };
  if (aHash !== null && aHash === bHash) identical.push(row);
  else differing.push({ ...row, insideAuditedSurface: true, reason: a && b ? "byte difference in a file the audit measured" : "file present on only one side" });
}

// Everything that differs anywhere under src, so a difference cannot hide by
// sitting outside the closure without being named.
const wholeTreeDiff = git("diff", "--name-only", AUDIT_HEAD, APPLICATION_SOURCE_SHA, "--", "src")
  .split("\n").filter(Boolean);
const closureSet = new Set(closure);
const outsideSurface = wholeTreeDiff
  .filter((p) => !closureSet.has(p))
  .map((p) => ({
    path: p,
    insideAuditedSurface: false,
    reason: "not reachable from any audited root by the transitive import closure computed above",
    auditHeadSha256: (() => { const b = readAt(AUDIT_HEAD, p); return b ? sha256(b) : null; })(),
    applicationSourceSha256: (() => { const b = readAt(APPLICATION_SOURCE_SHA, p); return b ? sha256(b) : null; })()
  }));

// tools_sha must carry the same application bytes as application_sha, which is
// the workflow's own gate; re-proven here so this file stands alone.
const toolsMatchesApplication = (() => {
  try {
    execFileSync("git", ["diff", "--quiet", APPLICATION_SOURCE_SHA, TOOLS_SHA, "--", "src", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "public"], { cwd: rootDir });
    return true;
  } catch { return false; }
})();

const pass = differing.length === 0 && toolsMatchesApplication;

const report = {
  schemaVersion: "rcap-audit-surface-equivalence/v1",
  generatedBy: "scripts/rcap-audit-surface-equivalence.mjs",
  readOnly: true,
  auditHead: AUDIT_HEAD,
  auditPacketCommit: AUDIT_PACKET_COMMIT,
  applicationSourceSha: APPLICATION_SOURCE_SHA,
  toolsSha: TOOLS_SHA,
  toolsShaCarriesTheSameApplicationBytes: toolsMatchesApplication,
  rootSelection: {
    flowManifestSource: manifestRoots.source,
    flowManifestRootCount: manifestRoots.roots.length,
    flowManifestUnresolvedReferences: manifestRoots.unresolved,
    declaredRootCount: declared.length,
    declaredRootConcerns: [...new Set(declared.map((d) => d.concern))].sort(),
    totalRoots: roots.length,
    roots
  },
  auditedSurface: {
    fileCount: closure.length,
    unresolvedSpecifiers
  },
  identicalPaths: identical.map((r) => r.path),
  identicalCount: identical.length,
  differingInsideAuditedSurface: differing,
  differingOutsideAuditedSurface: outsideSurface,
  hashes: { identical, differingInside: differing, differingOutside: outsideSurface },
  pass,
  verdict: pass
    ? `PASS — all ${identical.length} files in the audited surface are byte-identical between ${AUDIT_HEAD.slice(0, 8)} and ${APPLICATION_SOURCE_SHA.slice(0, 8)}, and tools_sha carries the same application bytes. ${outsideSurface.length} src file(s) differ outside the surface and are named above.`
    : `FAIL — ${differing.length} file(s) inside the audited surface differ${toolsMatchesApplication ? "" : "; tools_sha does not carry the same application bytes"}. Deployment must not proceed on this pairing.`
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`audit-surface equivalence → data/rcap-render/audit-surface-equivalence.json`);
console.log(`  roots: ${roots.length} (${manifestRoots.roots.length} from the flow manifest, ${declared.length} declared)`);
console.log(`  audited surface: ${closure.length} files`);
console.log(`  identical: ${identical.length}`);
console.log(`  differing INSIDE the audited surface: ${differing.length}`);
for (const d of differing.slice(0, 40)) console.log(`    ${d.path} — ${d.reason}`);
console.log(`  differing outside the audited surface: ${outsideSurface.length}`);
for (const d of outsideSurface.slice(0, 40)) console.log(`    ${d.path}`);
console.log(`\n${report.verdict}`);

if (!pass) process.exit(1);
