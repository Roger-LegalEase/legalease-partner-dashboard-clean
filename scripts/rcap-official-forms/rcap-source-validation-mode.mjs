// Shared source-validation contract for the problematic-PDF register and master
// list. Both regenerate-and-compare in CI, and both were rederiving
// source-dependent outcomes from an empty corpus, so both reported approved
// output as stale. The contract lives here once rather than twice: two copies of
// a rule about what counts as proof is how the two drift apart.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// --- how this run is allowed to establish source identity --------------------
//
// The register's platform-ready verdict compares each reviewed source SHA
// against real bytes, so it needs the authorized private corpus. CI does not
// have it — and the generator treated "cannot see the bytes" as "the source
// failed", rederiving platformReady 5 -> 1 and the accounting 128 -> 124. The
// committed register then read as stale in every source-empty environment.
//
// Nothing about those four families changed. An environment that cannot see a
// source is not evidence about that source, and regenerating approved evidence
// from an empty corpus manufactures a defect rather than finding one.
//
// So the run first decides, explicitly, which of three states it is in.
const EXPLICIT_CORPUS_ROOT = process.env.OFFICIAL_FORMS_SOURCE_DIR || null;
export const CONFIGURED_CORPUS_ROOTS = [
  EXPLICIT_CORPUS_ROOT,
  path.join(rootDir, "private/source-imports"),
  path.join(rootDir, "private/Nationwide Record Clearing")
].filter(Boolean);
const PRESENT_CORPUS_ROOTS = CONFIGURED_CORPUS_ROOTS.filter((c) => fs.existsSync(c));

const RESOLUTION_PATH = path.join(rootDir, "data/rcap-all50/pdf-promotion-source-resolution.json");
const READINESS_PATH = path.join(rootDir, "data/rcap-all50/pdf-release-readiness.json");
const CONSUMPTION_PATH = path.join(rootDir, "data/rcap-all50/pdf-review-consumption.json");
const OVERLAY_PRODUCTION = path.join(rootDir, "data/rcap-all50/overlays/production");

function readJsonAt(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

/** Where a reviewed source is expected to sit, if a root is mounted at all. */
function locateExpectedSource(relativePath) {
  const direct = path.join(rootDir, relativePath);
  if (fs.existsSync(direct)) return direct;
  const base = path.basename(relativePath);
  for (const root of PRESENT_CORPUS_ROOTS) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.name === base) return full;
      }
    }
  }
  return null;
}

/**
 * mounted_corpus            every reviewed source the resolution record names is
 *                           actually present, so ordinary source-byte validation
 *                           applies and any mismatch is a real finding.
 * committed_promotion_proof no configured root exists at all. The source-mounted
 *                           promotion proof is validated instead of being
 *                           recomputed from absence. NOT an automatic pass.
 * partial_or_invalid_source_mount
 *                           a root is mounted but the source set is incomplete.
 *                           This never falls back to proof mode: a half-mounted
 *                           corpus is exactly the situation in which silent
 *                           demotion would look like a finding.
 */
/**
 * Which corpus package a reviewed source declares it lives in.
 *
 * The configured roots are separate SOURCE PACKAGES, not interchangeable
 * mount points: private/source-imports holds the Edition 1 master library and
 * private/Nationwide Record Clearing holds the nationwide inventory. A reviewed
 * source names one of them in its resolvedPath and exists in that one only.
 */
function declaredRootFor(relativePath) {
  // An explicit test/CI mount claims to provide the reviewed corpus as a
  // whole. If it exists but is incomplete, that is a partial mount and must
  // fail closed rather than being mistaken for an unrelated mounted package.
  if (EXPLICIT_CORPUS_ROOT) return EXPLICIT_CORPUS_ROOT;
  const normalized = relativePath.replaceAll("\\", "/");
  for (const root of CONFIGURED_CORPUS_ROOTS) {
    const suffix = path.relative(rootDir, root).replaceAll("\\", "/");
    if (suffix && normalized.startsWith(`${suffix}/`)) return root;
  }
  return null;
}

export function sourceValidationMode() {
  if (PRESENT_CORPUS_ROOTS.length === 0) return { mode: "committed_promotion_proof", missing: [] };
  const resolution = readJsonAt(RESOLUTION_PATH);
  if (!resolution || !Array.isArray(resolution.rows)) {
    return { mode: "partial_or_invalid_source_mount", missing: ["pdf-promotion-source-resolution.json is unreadable"] };
  }
  const expected = resolution.rows.filter((r) => typeof r.resolvedPath === "string" && r.resolvedPath !== "");
  const missing = [];
  const notMaterialized = [];
  for (const row of expected) {
    if (locateExpectedSource(row.resolvedPath)) continue;
    /**
     * Absent because its own package is not mounted, or absent from a package
     * that IS mounted. Those are different facts and only the second is a
     * finding.
     *
     * Mounting the nationwide inventory used to put this run in
     * partial_or_invalid_source_mount for forty-five Edition 1 sources, purely
     * because a DIFFERENT package had appeared. "A root is mounted" was standing
     * in for "the root these sources live under is mounted", and the two are not
     * the same statement. A package nobody mounted is not evidence about the
     * sources inside it.
     */
    const declared = declaredRootFor(row.resolvedPath);
    if (declared && !PRESENT_CORPUS_ROOTS.includes(declared)) {
      notMaterialized.push(`${row.familyId} -> ${row.resolvedPath}`);
      continue;
    }
    missing.push(`${row.familyId} -> ${row.resolvedPath}`);
  }
  if (missing.length > 0) return { mode: "partial_or_invalid_source_mount", missing, notMaterialized };
  // Every remaining absence is a package that was never mounted here. The
  // committed promotion proof is validated rather than recomputed from absence,
  // which is the same treatment an entirely unmounted run gets and for the same
  // reason.
  if (notMaterialized.length > 0) {
    return { mode: "committed_promotion_proof", missing: [], notMaterialized };
  }
  return { mode: "mounted_corpus", missing: [], expected };
}


/**
 * Source-empty validation of the committed register against the proof that WAS
 * generated with the corpus mounted. Every claim the register cannot recompute
 * without private bytes must be established by a current, self-consistent proof
 * — and every claim it CAN check on disk is still checked here.
 */
export function validateAgainstCommittedProof(OUT_JSON) {
  const problems = [];
  const need = (condition, message) => { if (!condition) problems.push(message); };

  const readiness = readJsonAt(READINESS_PATH);
  const resolution = readJsonAt(RESOLUTION_PATH);
  const consumption = readJsonAt(CONSUMPTION_PATH);
  const register = readJsonAt(OUT_JSON);

  need(readiness !== null, "the source-mounted promotion proof (pdf-release-readiness.json) is absent");
  need(resolution !== null, "the promotion source-resolution record is absent");
  need(consumption !== null, "the PDF review-consumption record is absent");
  need(register !== null, "the committed problematic-PDF register is absent or unreadable");
  if (problems.length > 0) return problems;

  // The proof must say it actually saw the sources it is standing in for.
  const sr = readiness.sourceResolution ?? {};
  need(sr.corpusMounted === true, "the promotion proof was not generated with the corpus mounted, so it cannot stand in for source bytes");
  need(Number(sr.unresolved) === 0, `the promotion proof reports ${sr.unresolved} unresolved reviewed source(s)`);
  need(Number(resolution.totals?.unresolved) === 0, `the source-resolution record reports ${resolution.totals?.unresolved} unresolved source(s)`);
  // HTML captures are counted as their own outcome, never as unresolved PDFs.
  need(Number(sr.notApplicableHtmlCapture) === Number(resolution.totals?.not_applicable_no_pdf_source),
    "the proof and the resolution record disagree on how many outcomes have no PDF source");
  need(Number(sr.pathResolved) === Number(resolution.totals?.path_resolved)
    && Number(sr.hashResolved) === Number(resolution.totals?.hash_resolved),
    "the proof and the resolution record disagree on how the reviewed sources were resolved");

  // Queues and the equation, from the proof itself.
  for (const [queue, value] of Object.entries(readiness.queues ?? {})) {
    need(Number(value) === 0, `the promotion proof reports ${queue} = ${value}`);
  }
  need(readiness.equation?.sums === true, "the promotion proof's completion equation does not sum");
  need(Number(readiness.equation?.retainedProblematic) === 0,
    `the promotion proof reports retained_problematic ${readiness.equation?.retainedProblematic}`);
  const categorySum = Object.values(readiness.categories ?? {}).reduce((a, b) => a + Number(b), 0);
  need(categorySum === Number(readiness.equation?.denominator),
    `the proof's categories account for ${categorySum} of ${readiness.equation?.denominator}`);

  // Reviewed outcomes, and that every approval still binds the same bytes.
  const rows = consumption.rows ?? [];
  need(rows.length === Number(readiness.reviewedOutcomes?.total),
    `the review record carries ${rows.length} outcomes and the proof claims ${readiness.reviewedOutcomes?.total}`);
  need(Number(readiness.reviewedOutcomes?.correctionRequired) === 0, "the proof reports a correction-required outcome");
  need(readiness.reviewedOutcomes?.everyApprovalStillBinds === true, "the proof no longer states that every approval still binds");
  const approved = rows.filter((r) => String(r.verdict ?? "").startsWith("approved"));
  need(approved.length === rows.length, `${rows.length - approved.length} reviewed outcome(s) are not approved`);

  // The digests the proof resolved must still be the digests the reviewed
  // records carry. This is the part a source-empty run CAN check, and it is
  // what stops the proof standing in for bytes that have since changed.
  const familyDirs = new Map();
  for (const stateDir of fs.existsSync(OVERLAY_PRODUCTION) ? fs.readdirSync(OVERLAY_PRODUCTION) : []) {
    const statePath = path.join(OVERLAY_PRODUCTION, stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const family of fs.readdirSync(statePath)) familyDirs.set(family, path.join(statePath, family));
  }
  const approvedIds = new Set(approved.map((r) => String(r.familyId)));
  let digestChecked = 0;
  for (const row of resolution.rows ?? []) {
    const family = String(row.familyId).split(":").pop();
    const dir = familyDirs.get(family);
    if (!dir) { problems.push(`${row.familyId}: the resolution record names a family that is not on disk`); continue; }
    need(approvedIds.has(String(row.familyId)), `${row.familyId}: resolved source has no current approved review verdict`);
    if (row.resolution === "not_applicable_no_pdf_source") {
      // No PDF source to bind. Its terminal classification must say so.
      need(typeof row.structuralClass === "string" && row.structuralClass !== "",
        `${row.familyId}: a no-PDF-source outcome must record its structural class`);
      continue;
    }
    const record = readJsonAt(path.join(dir, "source-record.json"));
    if (!record) { problems.push(`${row.familyId}: source record is unreadable`); continue; }
    const recordedSha = record.sha256 ?? record.expectedSha256 ?? null;
    need(String(recordedSha) === String(row.sha256),
      `${row.familyId}: reviewed source digest ${String(recordedSha).slice(0, 16)}… does not match the promotion proof's ${String(row.sha256).slice(0, 16)}…`);
    const recordedBytes = record.byteLength ?? record.expectedSizeBytes ?? null;
    if (recordedBytes !== null && row.byteLength !== undefined && row.byteLength !== null) {
      need(Number(recordedBytes) === Number(row.byteLength),
        `${row.familyId}: reviewed source byte length ${recordedBytes} does not match the proof's ${row.byteLength}`);
    }
    digestChecked += 1;
  }
  need(digestChecked > 0, "no reviewed source digest could be checked against the promotion proof");

  // The committed register's own safety claims, read from the committed bytes.
  need((register.routesStillSellable ?? []).length === 0,
    `${(register.routesStillSellable ?? []).length} problem-PDF route(s) remain sellable in the committed register`);
  need((register.routesStillPublic ?? []).length === 0,
    `${(register.routesStillPublic ?? []).length} problem-PDF route(s) remain public in the committed register`);

  return problems;
}

// A source-empty `--check` validates the proof instead of rederiving outcomes it
// cannot see. It writes nothing, and it exits BEFORE the source-dependent
// generation below so the false demotion is never computed in the first place.
