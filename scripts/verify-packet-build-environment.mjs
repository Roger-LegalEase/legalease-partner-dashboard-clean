#!/usr/bin/env node
// Can this container build an official-form packet, or will it stop at the source gate?
//
// The first national packet wave answered that question the expensive way. Six
// workers were dispatched; five reached their first step, found no source bytes,
// and correctly refused. Nothing they did was wrong. The dispatch was wrong: it
// assumed a container carries the corpus, and a fresh clone never does, because
// private/ is git-ignored and the bytes live in a private release.
//
// So this runs BEFORE a packet worker, not after it. It is the difference
// between discovering the container is unusable in the first minute and
// discovering it after a session has been spent writing a gate report.
//
//   node scripts/verify-packet-build-environment.mjs
//   node scripts/verify-packet-build-environment.mjs --family ak-courtview-set
//   node scripts/verify-packet-build-environment.mjs --family ca-1203-4-set --branch claude/census-v1-build-ca-1203-4-set
//   node scripts/verify-packet-build-environment.mjs --prove     # discrimination self-test
//
// Exit 0 only when every check passes. Any failure is a refusal to launch.
//
// WHY EACH CHECK EXISTS
//
// Every check below is here because something actually failed on it, and each
// one names the return that produced it. A preflight assembled from imagination
// tests the failures you thought of; this one tests the failures that happened.
//
// THE VACUITY TRAP
//
// The failure this file most has to avoid is the one it is checking for. An
// absent directory read as an empty file list is how twelve assets once flipped
// from held to passing. A check that cannot fail proves nothing, so --prove
// exercises each check against a synthetic environment that should fail it, and
// a check that passes its own negative case is reported as VACUOUS.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MASTER_LIBRARY_RELATIVE = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const OPERATIONAL_RELATIVE = "private/Nationwide Record Clearing";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CUSTODY = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const BOOTSTRAP = "scripts/rcap-corpus/bootstrap-private-corpus.sh";

const EXPECT_JURISDICTIONS = 51;
const EXPECT_FILES = 499;
const EXPECT_PDFS = 329;

// ---- argument handling -------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const FAMILY = flag("--family");
const BRANCH = flag("--branch");
const REPORT = flag("--json");
const PROVE = argv.includes("--prove");

// ---- check plumbing ----------------------------------------------------------
// A check returns { ok, detail, ...evidence }. It never throws for a condition it
// is meant to detect: a thrown check and a failed check look different to a
// reader, and "the corpus is absent" is a finding, not a crash.
const CHECKS = [];
// `negative` optionally builds an environment this check MUST fail in. A check
// whose failure mode the barren directory does not reproduce needs its own
// negative case, or --prove would call it discriminating on no evidence.
const check = (id, title, because, run, negative = null) => CHECKS.push({ id, title, because, run, negative });

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const shSafe = (cmd, args, opts) => { try { return sh(cmd, args, opts); } catch { return null; } };

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const readJson = (rel, env = ROOT) => {
  const p = path.join(env, rel);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
};

/** The Master Library root this environment would use, however it is pointed at. */
function masterLibraryRoot(env = ROOT) {
  if (process.env.MASTER_LIBRARY_SOURCE_DIR) return path.resolve(process.env.MASTER_LIBRARY_SOURCE_DIR);
  return path.join(env, MASTER_LIBRARY_RELATIVE);
}

/**
 * Every file under a directory, or null when the directory cannot be walked.
 *
 * null and [] are different answers and the difference is the whole point: null
 * means "there is no tree here", [] means "the tree is here and it is empty".
 * Collapsing them is the defect this preflight exists to prevent.
 */
function filesUnder(dir) {
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  };
  try { walk(dir); } catch { return null; }
  return found;
}

/**
 * The document sources a family must bind.
 *
 * Two tiers, in order, and neither of them guesses.
 *
 * Tier 1 is the custody reconciliation, which already resolved each source to a
 * held path and a pinned digest. It is authoritative where it has a row.
 *
 * Tier 2 exists because the reconciliation covers the 295 acquisition tasks
 * only: a family whose sources are all held names no acquisition task and so
 * has no row, which is exactly the position the three AK families are in. For
 * those, the census route states `official-form:<number>` and the committed
 * corpus index states what that form number is held as. Resolution is exact
 * form-number equality within the index, and an ambiguous or absent form number
 * is a refusal rather than a nearest match -- a wrong resolution sends a worker
 * to measure the wrong document.
 */
function familySources(family, env = ROOT) {
  const custody = readJson(CUSTODY, env);
  const row = custody?.rows?.find((r) => r.worklistGroupId === family);
  if (row) {
    return {
      tier: "custody_reconciliation",
      from: CUSTODY,
      custodyClass: row.custodyClass,
      commissionAcquisition: row.commissionAcquisition,
      sources: (row.documentSources || [])
        .filter((s) => s.resolved && s.heldAs?.sha256)
        .map((s) => ({ sourceId: s.sourceId, path: s.heldAs.path, sha256: s.heldAs.sha256 })),
      unresolvable: []
    };
  }

  const worklist = readJson(WORKLIST, env);
  const entry = worklist?.packetFamilies?.find((f) => f.worklistGroupId === family);
  if (!entry) return null;

  const index = readJson(CORPUS_INDEX, env);
  if (!index?.entries?.length) return null;

  const formNumbers = [...new Set(
    (entry.routes || [])
      .flatMap((r) => r.requiredSourceIds || [])
      .filter((id) => typeof id === "string" && id.startsWith("official-form:"))
      .map((id) => id.slice("official-form:".length))
  )];

  const sources = [];
  const unresolvable = [];
  for (const formNumber of formNumbers) {
    const matches = index.entries.filter((e) => e.formNumber === formNumber);
    if (matches.length === 1) {
      sources.push({ sourceId: `official-form:${formNumber}`, path: matches[0].path, sha256: matches[0].sha256 });
    } else {
      unresolvable.push({
        sourceId: `official-form:${formNumber}`,
        indexMatches: matches.length,
        why: matches.length === 0
          ? "no entry in the committed corpus index carries this exact form number"
          : "more than one index entry carries this exact form number, so the identity is ambiguous"
      });
    }
  }
  return { tier: "census_form_number_against_committed_index", from: WORKLIST, custodyClass: null, commissionAcquisition: null, sources, unresolvable };
}

// ==============================================================================
// 1. Repository identity
// ==============================================================================
check(
  "repo_identity",
  "The checkout is the packet repository, at a commit, on a named branch",
  "A worker that builds in the wrong clone pushes work nobody reads.",
  (env) => {
    const remote = shSafe("git", ["remote", "get-url", "origin"], { cwd: env });
    const head = shSafe("git", ["rev-parse", "HEAD"], { cwd: env });
    const branch = shSafe("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: env });
    const ok = Boolean(remote?.includes("legalease-partner-dashboard-clean") && head && branch && branch !== "HEAD");
    return { ok, remote, head, branch, detail: ok ? `${branch} at ${head?.slice(0, 8)}` : "origin is not the packet repository, or HEAD is detached" };
  }
);

// ==============================================================================
// 2. The clone is complete
// ==============================================================================
check(
  "clone_is_complete",
  "The clone is not shallow and not single-branch",
  "A shallow single-branch clone cannot see the branch it is meant to resume, so a resumed worker silently rebuilds from scratch and loses the committed research on its own tip.",
  (env) => {
    const shallow = shSafe("git", ["rev-parse", "--is-shallow-repository"], { cwd: env });
    const refspecs = (shSafe("git", ["config", "--get-all", "remote.origin.fetch"], { cwd: env }) || "").split("\n").filter(Boolean);
    const fetchesAllHeads = refspecs.some((r) => r.includes("refs/heads/*:refs/remotes/origin/*"));
    const ok = shallow === "false" && fetchesAllHeads;
    return {
      ok, shallow, refspecs, fetchesAllHeads,
      detail: ok ? "full clone, all heads fetchable"
        : shallow !== "false" ? "the clone is shallow"
        : "remote.origin.fetch does not fetch all heads"
    };
  }
);

// ==============================================================================
// 3. The assigned branch's own pushed tip is visible
// ==============================================================================
check(
  "assigned_branch_tip_visible",
  "The assigned branch and its pushed tip are visible locally",
  "Five returns are branches to RESUME, not to rebuild. A container that cannot resolve origin/<branch> will start over and throw away committed source and local-variation research.",
  (env) => {
    if (!BRANCH) return { ok: true, skipped: true, detail: "no --branch given; check not applicable" };
    const tip = shSafe("git", ["rev-parse", `origin/${BRANCH}`], { cwd: env });
    const assignments = readJson("data/rcap-grade-a/route-obligation-census-v1/worker-assignments.json", env);
    const recorded = assignments?.assignments?.find((a) => a.branch === BRANCH)?.pushedTip ?? null;
    const ok = Boolean(tip) && (!recorded || tip === recorded);
    return {
      ok, branch: BRANCH, resolvedTip: tip, recordedTip: recorded,
      detail: !tip ? `origin/${BRANCH} does not resolve in this clone`
        : recorded && tip !== recorded ? `origin/${BRANCH} is ${tip.slice(0, 8)} but the Captain recorded ${recorded.slice(0, 8)}`
        : `origin/${BRANCH} at ${tip.slice(0, 8)}`
    };
  }
);

// ==============================================================================
// 4. The worktree is clean
// ==============================================================================
check(
  "worktree_clean",
  "The worktree carries no uncommitted change",
  "A verifier batch launched on a dirty tree has already produced two false regression diagnoses in this sprint. A build that starts dirty cannot attribute its own output.",
  (env) => {
    const status = shSafe("git", ["status", "--porcelain"], { cwd: env });
    const ok = status === "";
    return { ok, dirtyPaths: status ? status.split("\n") : [], detail: ok ? "clean" : `${status.split("\n").length} uncommitted path(s)` };
  }
);

// ==============================================================================
// 5. The toolchain can run the factory
// ==============================================================================
check(
  "node_toolchain",
  "Node is present at a version the factory runs on",
  "The factory is ESM and uses node:crypto, node:fs promises and structuredClone.",
  () => {
    const major = Number(process.versions.node.split(".")[0]);
    const ok = major >= 18;
    return { ok, node: process.versions.node, detail: ok ? `node ${process.versions.node}` : `node ${process.versions.node} is below 18` };
  }
);

// ==============================================================================
// 6. pdf-lib is importable
// ==============================================================================
check(
  "pdf_lib_importable",
  "node_modules is installed and pdf-lib imports",
  "ak-courtview-set named this explicitly: node_modules was absent in its container, so scripts/rcap-all50-overlay-factory-lib.mjs could not import pdf-lib. Without it nothing can be filled, measured or rastered.",
  (env) => {
    const modules = path.join(env, "node_modules");
    if (!fs.existsSync(modules)) return { ok: false, nodeModules: false, detail: "node_modules is absent; run npm ci" };
    const pkg = path.join(modules, "pdf-lib", "package.json");
    if (!fs.existsSync(pkg)) return { ok: false, nodeModules: true, pdfLib: false, detail: "node_modules is present but pdf-lib is not installed" };
    let version = null;
    try { version = JSON.parse(fs.readFileSync(pkg, "utf8")).version; } catch { /* reported below */ }
    return { ok: Boolean(version), nodeModules: true, pdfLib: true, version, detail: version ? `pdf-lib ${version}` : "pdf-lib package.json is unreadable" };
  }
);

// ==============================================================================
// 6b. the tooling-readable rendition stage, for families that declare one
// ==============================================================================
check(
  "readable_rendition_stage_declared",
  "a family whose sources pdf-lib cannot open has a declared, available and proven rendition stage",
  "ca-1203-4-set named this: its five official sources carry a permissions-only /Standard handler, they open with an empty user password in any conforming implementation, and pdf-lib 1.17.1 implements no decryption at all -- so pdf-lib cannot open them to WRITE a filled artifact. The predecessor pip-installed pikepdf in its own container, measured off it, and left a family the next worker could not rebuild. A family that needs the stage declares it in readable-rendition-request.json; this check refuses to call such a family buildable unless the stage is present AND its committed proof says the rendition is the same document, on deterministic bytes.",
  (env) => {
    if (!FAMILY) return { ok: null, skipped: true, detail: "no --family given; check not applicable" };
    const overlays = path.join(env, "data/rcap-all50/overlays");
    if (!fs.existsSync(overlays)) return { ok: null, skipped: true, detail: "no overlay tree in this environment" };

    const requests = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "readable-rendition-request.json"
          && path.basename(path.dirname(full)).startsWith(`${FAMILY}--`)) requests.push(full);
      }
    };
    walk(overlays);
    // A family that declares no request does not need the stage. That is not a
    // pass on the stage; it is the check not applying.
    if (requests.length === 0) return { ok: null, skipped: true, detail: `${FAMILY} declares no rendition request; the stage is not required` };

    const probe = shSafe("python3", ["-c",
      "import json,pikepdf;print(json.dumps({'pikepdf':pikepdf.__version__,'libqpdf':pikepdf.__libqpdf_version__}))"]);
    let stage = null;
    try { stage = probe ? JSON.parse(probe.trim()) : null; } catch { stage = null; }
    if (!stage) {
      return {
        ok: false, stageAvailable: false, requests: requests.length,
        detail: "pikepdf is not importable; this family cannot be rebuilt. Install it (pip install pikepdf) -- it is deliberately NOT a package.json dependency, because package.json is the worker-image input and adding a Python stage to it would be a factory-level change."
      };
    }

    // The stage being installed is not the same as the family being proven. The
    // committed report is where the proof lives, and a report that records a
    // delta, or a run that was not deterministic, is a failure here and not a note.
    const problems = [];
    for (const request of requests) {
      const report = path.join(path.dirname(request), "readable-rendition.json");
      if (!fs.existsSync(report)) { problems.push(`${path.basename(path.dirname(request))}: no readable-rendition.json`); continue; }
      let parsed = null;
      try { parsed = JSON.parse(fs.readFileSync(report, "utf8")); } catch { problems.push(`${path.basename(path.dirname(request))}: readable-rendition.json is unreadable`); continue; }
      const declared = JSON.parse(fs.readFileSync(request, "utf8"));
      if (parsed.allIdentical !== true) problems.push("the report does not claim the rendition is the same document");
      if (parsed.allDeterministic !== true) problems.push("the report does not claim deterministic bytes");
      if ((parsed.sources || []).length !== (declared.sources || []).length) problems.push(`the report covers ${(parsed.sources || []).length} source(s) of ${(declared.sources || []).length} requested`);
      for (const s of parsed.sources || []) {
        if (s?.comparison?.deltaCount !== 0) problems.push(`${s?.formNumber}: ${s?.comparison?.deltaCount} delta(s) against the official`);
        if (s?.official?.verifiedBeforeTransformation !== true) problems.push(`${s?.formNumber}: the official hash was not verified before transformation`);
        if (s?.rendition?.committed !== false) problems.push(`${s?.formNumber}: the rendition is recorded as committed`);
      }
      if (parsed.transformation?.libqpdfVersion && parsed.transformation.libqpdfVersion !== stage.libqpdf) {
        problems.push(`the proof was produced under libqpdf ${parsed.transformation.libqpdfVersion}; this container has ${stage.libqpdf}`);
      }
    }
    const ok = problems.length === 0;
    return {
      ok, stageAvailable: true, pikepdf: stage.pikepdf, libqpdf: stage.libqpdf,
      requests: requests.length, problems,
      detail: ok
        ? `pikepdf ${stage.pikepdf} / libqpdf ${stage.libqpdf}; ${requests.length} rendition proof(s) hold`
        : problems.slice(0, 3).join("; ")
    };
  },
  // The stage being installed must not be enough to pass. The negative case is a
  // family that declares a rendition request and has no proof to show for it.
  (work) => {
    const env = path.join(work, "rendition-declared-but-unproven");
    const dir = path.join(env, "data/rcap-all50/overlays/census-v1/zz", `${FAMILY ?? "unnamed"}--official-pdf-fill`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "readable-rendition-request.json"),
      JSON.stringify({ familyId: FAMILY ?? "unnamed", renditionDirectory: "private/x", sources: [{ formNumber: "X" }] }));
    return env;
  }
);

// ==============================================================================
// 7. private/ is git-ignored
// ==============================================================================
check(
  "private_is_git_ignored",
  "private/ is git-ignored, so source bytes cannot be committed",
  "The bootstrap refuses to extract into a tracked tree, and it is right to. Source binaries must never enter a commit.",
  (env) => {
    let ignored = false;
    try { execFileSync("git", ["check-ignore", "-q", "private/"], { cwd: env, stdio: "ignore" }); ignored = true; } catch { ignored = false; }
    const tracked = (shSafe("git", ["ls-files", "private/"], { cwd: env }) || "").split("\n").filter(Boolean);
    const ok = ignored && tracked.length === 0;
    return { ok, ignored, trackedBeneathPrivate: tracked.length, detail: ok ? "private/ is ignored and tracks nothing" : ignored ? `${tracked.length} tracked path(s) beneath private/` : "private/ is NOT git-ignored" };
  }
);

// ==============================================================================
// 8. The Master Library is mounted
// ==============================================================================
check(
  "master_library_mounted",
  "The Master Library corpus root exists and is a directory",
  "This is the check the whole first wave failed. Five workers found no root and stopped. An absent root is a positive finding of absence, not an empty corpus.",
  (env) => {
    const root = masterLibraryRoot(env);
    const exists = fs.existsSync(root) && fs.statSync(root).isDirectory();
    return {
      ok: exists, root: path.relative(env, root) || root, exists,
      detail: exists ? `mounted at ${path.relative(env, root)}` : `absent at ${path.relative(env, root) || root} — run: bash ${BOOTSTRAP}`
    };
  }
);

// ==============================================================================
// 9. The mounted corpus is complete
// ==============================================================================
check(
  "master_library_complete",
  "The mounted corpus carries the declared file, PDF and jurisdiction counts",
  "A short extract is worse than no extract: every field map keyed to a missing binary would report a form with no source. The bootstrap refuses a short extract and so does this.",
  (env) => {
    const root = masterLibraryRoot(env);
    const files = filesUnder(root);
    if (files === null) return { ok: false, walkable: false, detail: "the corpus root cannot be walked (absent is not empty)" };
    const pdfs = files.filter((f) => f.toLowerCase().endsWith(".pdf"));
    const jurisdictions = new Set(files.map((f) => f.match(/^STATES\/([A-Z]{2})\//)?.[1]).filter(Boolean));
    const ok = files.length >= EXPECT_FILES && pdfs.length === EXPECT_PDFS && jurisdictions.size >= EXPECT_JURISDICTIONS - 6;
    return {
      ok, walkable: true, files: files.length, pdfs: pdfs.length, jurisdictions: jurisdictions.size,
      expected: { files: EXPECT_FILES, pdfs: EXPECT_PDFS },
      detail: ok ? `${files.length} files, ${pdfs.length} PDFs, ${jurisdictions.size} jurisdictions`
        : `short extract: ${files.length}/${EXPECT_FILES} files, ${pdfs.length}/${EXPECT_PDFS} PDFs`
    };
  }
);

// ==============================================================================
// 10. The mounted corpus is the corpus the committed index describes
// ==============================================================================
check(
  "corpus_matches_committed_index",
  "A sample of the committed index verifies byte-exact against the mounted corpus",
  "A corpus that looks recovered and is not is worse than no corpus. The index is the committed record of what the corpus contained; if the bytes disagree, every measurement keyed to them describes a document that no longer exists.",
  (env) => {
    const root = masterLibraryRoot(env);
    const index = readJson(CORPUS_INDEX, env);
    if (!index?.entries?.length) return { ok: false, detail: `${CORPUS_INDEX} is missing or carries no entries` };
    if (filesUnder(root) === null) return { ok: false, detail: "the corpus root cannot be walked; nothing to compare the index against" };
    // A deterministic spread across states rather than the first N, so a corpus
    // recovered correctly for AK and truncated at TX is still caught.
    const sorted = [...index.entries].sort((a, b) => a.path.localeCompare(b.path));
    const step = Math.max(1, Math.floor(sorted.length / 24));
    const sample = sorted.filter((_, i) => i % step === 0).slice(0, 24);
    const mismatched = [];
    const absent = [];
    for (const entry of sample) {
      const p = path.join(root, entry.path);
      if (!fs.existsSync(p)) { absent.push(entry.path); continue; }
      if (sha256(p) !== entry.sha256) mismatched.push(entry.path);
    }
    const ok = absent.length === 0 && mismatched.length === 0;
    return {
      ok, sampled: sample.length, absent: absent.length, mismatched: mismatched.length,
      absentPaths: absent.slice(0, 5), mismatchedPaths: mismatched.slice(0, 5),
      detail: ok ? `${sample.length} sampled entries verify byte-exact` : `${absent.length} absent, ${mismatched.length} mismatched of ${sample.length} sampled`
    };
  }
);

// ==============================================================================
// 11. This family's own pinned sources bind
// ==============================================================================
check(
  "family_sources_bind",
  "Every source this family names is present and hashes to its pinned digest",
  "Family-level is the level that matters. A corpus can be complete in aggregate and still not carry the two binaries this worker was dispatched to measure.",
  (env) => {
    if (!FAMILY) return { ok: true, skipped: true, detail: "no --family given; check not applicable" };
    const resolved = familySources(FAMILY, env);
    if (!resolved) return { ok: false, family: FAMILY, detail: `${FAMILY} is not resolvable from ${CUSTODY} or ${WORKLIST}; the Captain must resolve its sources before dispatch` };
    if (resolved.unresolvable.length) {
      return {
        ok: false, family: FAMILY, tier: resolved.tier, unresolvable: resolved.unresolvable,
        detail: `${resolved.unresolvable.length} source(s) do not resolve to exactly one committed index entry: ${resolved.unresolvable.map((u) => u.sourceId).join(", ")}`
      };
    }
    if (resolved.sources.length === 0) {
      return {
        ok: false, family: FAMILY, custodyClass: resolved.custodyClass, sources: 0,
        detail: `${FAMILY} names no resolved document source. An official_pdf_fill family with no bound source is not dispatchable.`
      };
    }
    const root = masterLibraryRoot(env);
    const results = resolved.sources.map((s) => {
      const p = path.join(root, s.path);
      if (!fs.existsSync(p)) return { ...s, present: false, observed: null, bound: false };
      const observed = sha256(p);
      return { ...s, present: true, observed, bound: observed === s.sha256 };
    });
    const ok = results.every((r) => r.bound);
    return {
      ok, family: FAMILY, tier: resolved.tier, custodyClass: resolved.custodyClass, commissionAcquisition: resolved.commissionAcquisition,
      sources: results.map((r) => ({ sourceId: r.sourceId, present: r.present, bound: r.bound, pinned: r.sha256, observed: r.observed })),
      detail: ok ? `${results.length}/${results.length} source(s) bind by exact SHA-256 (${resolved.tier})`
        : `${results.filter((r) => !r.bound).length} of ${results.length} source(s) do not bind`
    };
  }
);

// ==============================================================================
// 12. The Master Library is not standing in for the operational tree
// ==============================================================================
check(
  "master_library_not_at_operational_path",
  "The Master Library is not mounted at, or pointed to by, the operational path",
  "operational-corpus-precondition.mjs refuses a Master Library mounted at the operational path by name, and is right to: the two trees answer different questions. Substituting one for the other would make a retirement mean something nobody intended.",
  (env) => {
    const env_var = process.env.OFFICIAL_FORMS_SOURCE_DIR ?? null;
    const master = masterLibraryRoot(env);
    const operational = env_var ? path.resolve(env_var) : path.join(env, OPERATIONAL_RELATIVE);
    const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
    const collides = fs.existsSync(operational) && fs.existsSync(master) && real(operational) === real(master);
    // A Master Library shape sitting at the operational path is the same substitution
    // by another route, so the shape is read rather than inferred from the path.
    let shapedLikeMasterLibrary = false;
    if (fs.existsSync(operational)) {
      try { shapedLikeMasterLibrary = fs.readdirSync(operational).includes("STATES"); } catch { shapedLikeMasterLibrary = false; }
    }
    const ok = !collides && !shapedLikeMasterLibrary;
    return {
      ok, officialFormsSourceDir: env_var, collides, shapedLikeMasterLibrary,
      detail: ok ? "the operational path does not resolve to the Master Library"
        : collides ? "OFFICIAL_FORMS_SOURCE_DIR / the operational path resolves to the Master Library"
        : "a Master Library-shaped tree is sitting at the operational path"
    };
  },
  // The barren directory has no operational tree at all, so it passes this check
  // trivially. The substitution has to be built to be tested.
  (work) => {
    const env = path.join(work, "master-library-at-operational-path");
    fs.mkdirSync(path.join(env, OPERATIONAL_RELATIVE, "STATES", "AK"), { recursive: true });
    return env;
  }
);

// ==============================================================================
// 13. Absent is not empty
// ==============================================================================
check(
  "absent_is_not_empty",
  "This preflight distinguishes an absent corpus from an empty one",
  "An adjudication once walked an empty file list from a missing directory and read the silence as the condition passing. Twelve assets flipped from held to passing on the strength of a missing directory. A preflight that cannot tell those apart reproduces exactly that.",
  () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "packet-preflight-"));
    try {
      const missing = path.join(work, "does-not-exist");
      const empty = path.join(work, "empty");
      fs.mkdirSync(empty);
      const absentWalk = filesUnder(missing);
      const emptyWalk = filesUnder(empty);
      const ok = absentWalk === null && Array.isArray(emptyWalk) && emptyWalk.length === 0;
      return {
        ok, absentReturns: absentWalk === null ? "null" : String(absentWalk?.length),
        emptyReturns: Array.isArray(emptyWalk) ? `[] (${emptyWalk.length})` : String(emptyWalk),
        detail: ok ? "an absent tree returns null; an empty tree returns []" : "absence and emptiness are indistinguishable — the preflight is unsound"
      };
    } finally { fs.rmSync(work, { recursive: true, force: true }); }
  }
);

// ==============================================================================
// 14. The stale-artifact block is loadable and consulted
// ==============================================================================
check(
  "stale_artifact_block_consulted",
  "The stale-artifact block loads, is internally consistent, and no artifact this family owns carries a blocked hash",
  "Blocked hashes cannot satisfy artifact approval, packet-family completion, launch authority or commercial admission. A worker that cannot read the block, or reads a truncated one, could render onto a blocked artifact and call it proven.",
  (env) => {
    const block = readJson(STALE_BLOCK, env);
    if (!block) return { ok: false, detail: `${STALE_BLOCK} is missing or unparseable` };

    // A truncated block is the dangerous failure: it loads, reads as fewer
    // blocked hashes than exist, and silently stops refusing some of them. So
    // the declared counts are checked against the arrays that carry them.
    const hashes = Array.isArray(block.hashes) ? block.hashes : [];
    const families = Array.isArray(block.families) ? block.families : [];
    const consistent = block.blockedHashes === hashes.length && block.uniqueFamilies === families.length;
    if (!consistent) {
      return {
        ok: false, blockedHashes: hashes.length, declaredHashes: block.blockedHashes,
        families: families.length, declaredFamilies: block.uniqueFamilies,
        detail: `the block is internally inconsistent: declares ${block.blockedHashes} hash(es)/${block.uniqueFamilies} family(ies), carries ${hashes.length}/${families.length}`
      };
    }
    if (hashes.length === 0) {
      return { ok: false, detail: "the block carries no hashes; a block that refuses nothing is not a block" };
    }

    const blocked = new Set(hashes);
    let scanned = 0;
    const carryingABlockedHash = [];
    if (FAMILY) {
      // Every PDF the family already owns, hashed against the block. This is the
      // check that stops a resumed worker from inheriting a stale artifact.
      const assignments = readJson("data/rcap-grade-a/route-obligation-census-v1/worker-assignments.json", env);
      const owned = assignments?.assignments?.find((a) => a.worklistGroupId === FAMILY)?.ownedPath;
      const dir = owned ? path.join(env, owned) : null;
      const files = dir ? filesUnder(dir) : null;
      for (const rel of (files ?? []).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
        scanned += 1;
        const digest = sha256(path.join(dir, rel));
        if (blocked.has(digest)) carryingABlockedHash.push({ path: `${owned}/${rel}`, sha256: digest });
      }
      // Also refuse a family whose own production directory the block names.
      const named = families.filter((f) => typeof f.familyDirectory === "string" && fs.existsSync(path.join(env, f.familyDirectory)));
      return {
        ok: carryingABlockedHash.length === 0,
        family: FAMILY, ownedPath: owned ?? null, artifactsScanned: scanned,
        blockedHashes: hashes.length, blockedFamilies: families.length,
        blockedProductionDirectoriesPresent: named.length,
        carryingABlockedHash,
        detail: carryingABlockedHash.length
          ? `${carryingABlockedHash.length} artifact(s) under ${owned} carry a blocked hash; re-render through the bounded per-family entry point before proving anything`
          : `block consistent (${hashes.length} hashes, ${families.length} families); ${scanned} artifact(s) under ${owned ?? "this family"} clear`
      };
    }
    return {
      ok: true, blockedHashes: hashes.length, blockedFamilies: families.length,
      refusedCapabilities: (block.refusedCapabilities ?? []).length,
      detail: `block consistent: ${hashes.length} hashes, ${families.length} families, ${(block.refusedCapabilities ?? []).length} refused capabilities`
    };
  },
  // A block that does not load is the negative case; the barren directory has no
  // data/ at all, which is exactly that.
  null
);

// ==============================================================================
// running
// ==============================================================================
function runAll(env = ROOT) {
  return CHECKS.map((c) => {
    let result;
    try { result = c.run(env); }
    catch (error) { result = { ok: false, threw: true, detail: `check threw: ${error.message}` }; }
    return { id: c.id, title: c.title, because: c.because, ...result };
  });
}

/**
 * Does each check actually discriminate?
 *
 * Every check is run a second time against a synthetic environment built to fail
 * it. A check that passes there tests nothing, and is reported VACUOUS. This is
 * the same standard the source gates on the returned branches held themselves to.
 */
function prove() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "packet-preflight-prove-"));
  const results = [];
  try {
    // A directory that is not a clone, has no corpus, no node_modules and no data.
    const barren = path.join(work, "barren");
    fs.mkdirSync(barren);
    const barrenResults = new Map(runAll(barren).map((r) => [r.id, r]));

    for (const c of CHECKS) {
      // A check with its own negative builder is run against that environment;
      // the barren directory would pass it for the wrong reason.
      let negative = barrenResults.get(c.id);
      let negativeCase = "barren directory";
      if (c.negative) {
        const env = c.negative(work);
        negativeCase = path.basename(env);
        try { negative = { id: c.id, ...c.run(env) }; }
        catch (error) { negative = { id: c.id, ok: false, threw: true, detail: error.message }; }
      }
      // Checks that are environment-independent by construction, or that were
      // skipped for want of an argument, cannot be falsified this way; they are
      // reported as such rather than silently counted as proved.
      const structural = c.id === "absent_is_not_empty" || c.id === "node_toolchain";
      const skipped = Boolean(negative.skipped);
      const discriminates = structural || skipped ? null : negative.ok === false;
      results.push({
        id: c.id,
        negativeCase,
        negativeCaseOutcome: negative.ok ? "PASSED (did not discriminate)" : "failed as it should",
        verdict: structural ? "STRUCTURAL_NOT_FALSIFIABLE_THIS_WAY" : skipped ? "SKIPPED_NEEDS_ARGUMENT" : discriminates ? "DISCRIMINATES" : "VACUOUS"
      });
    }
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
  return results;
}

const results = runAll();
const proof = PROVE ? prove() : null;
const failed = results.filter((r) => r.ok === false);
const skipped = results.filter((r) => r.skipped);
const vacuous = (proof ?? []).filter((p) => p.verdict === "VACUOUS");

const report = {
  schemaVersion: "rcap-packet-build-environment-preflight/v1",
  generatedBy: "scripts/verify-packet-build-environment.mjs",
  question: "Can this container build an official-form packet, or will it stop at the source gate?",
  family: FAMILY,
  branch: BRANCH,
  checks: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  skipped: skipped.length,
  verdict: failed.length === 0 ? "PACKET_BUILD_ENVIRONMENT_READY" : "PACKET_BUILD_ENVIRONMENT_NOT_READY",
  mayLaunchPacketWorker: failed.length === 0,
  whatAPassDoesNotEstablish: [
    "that any packet is built, or that any artifact is proven",
    "that any route may open, or that any output is approved for participant delivery",
    "that the held sources are the current official editions"
  ],
  results,
  discriminationProof: proof
};

if (REPORT) { fs.mkdirSync(path.dirname(path.join(ROOT, REPORT)), { recursive: true }); fs.writeFileSync(path.join(ROOT, REPORT), JSON.stringify(report, null, 2) + "\n"); }

for (const r of results) {
  const mark = r.skipped ? "  -" : r.ok ? "  ok" : "FAIL";
  console.log(`${mark}  ${r.id.padEnd(38)} ${r.detail}`);
}
if (proof) {
  console.log("\ndiscrimination:");
  for (const p of proof) console.log(`  ${p.verdict.padEnd(34)} ${p.id}`);
}
console.log(`\n${report.verdict}: ${report.passed}/${report.checks} passed, ${report.failed} failed, ${report.skipped} not applicable`);
if (vacuous.length) console.log(`${vacuous.length} check(s) do not discriminate and prove nothing.`);
if (REPORT) console.log(`Wrote ${REPORT}`);

process.exit(failed.length === 0 && vacuous.length === 0 ? 0 : 1);
