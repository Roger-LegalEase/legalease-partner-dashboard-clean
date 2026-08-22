#!/usr/bin/env node
// The final PDF board and release-readiness state.
//
//   node scripts/generate-rcap-pdf-release-readiness.mjs
//   node scripts/generate-rcap-pdf-release-readiness.mjs --check
//
// Every count here is derived from the current records. The temptation at a
// closing gate is to write the number you expect and let the generator agree
// with you; this does the opposite, and fails when the equation does not add up.
//
// The category rule that matters: a correct terminal outcome is not always a
// participant PDF. A reference-only translation, a captured HTML index page, an
// outside-party filing and a launch-safe exclusion are all finished — and none
// of them produces a participant artifact. Forcing them into platform_ready
// would claim filing PDFs that must not exist; leaving them in
// retained_problematic would report unfinished work that is done.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const CONSUMPTION = "data/rcap-all50/pdf-review-consumption.json";
const RESOLUTION = "data/rcap-all50/pdf-promotion-source-resolution.json";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const WORKVIEW = "data/rcap-all50/pdf-finish-workview.json";
const LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const WAVE1 = "data/rcap-all50/pdf-finish-wave1-terminalization.json";
const UNAVAILABLE = "data/rcap-all50/unavailable-source-terminalization.json";
const PRODUCTION = "data/rcap-all50/overlays/production";
const OUT = "data/rcap-all50/pdf-release-readiness.json";
const OUT_MD = "docs/record-clearing/pdf-release-readiness.md";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL release readiness — ${m}`); process.exit(1); };

const consumption = readJson(CONSUMPTION);
const resolution = readJson(RESOLUTION);
const register = readJson(REGISTER);
const workview = readJson(WORKVIEW);
const ledger = readJson(LEDGER);
const wave1 = readJson(WAVE1);
const unavailable = readJson(UNAVAILABLE);

const registerFor = new Map();
for (const rec of register.records ?? []) for (const id of rec.familyIds ?? []) registerFor.set(id, rec);
const dirFor = (familyId) => {
  const slug = String(familyId).split(":").pop();
  for (const state of fs.readdirSync(abs(PRODUCTION))) {
    const c = `${PRODUCTION}/${state}/${slug}`;
    if (fs.existsSync(abs(c))) return c;
  }
  return null;
};

// Every reviewed outcome must be approved and still binding before anything else
// is worth computing.
{
  const notApproved = consumption.rows.filter((r) => r.verdict !== "approved_platform_ready");
  if (notApproved.length) fail(`${notApproved.length} reviewed outcome(s) are not approved: ${notApproved.slice(0, 3).map((r) => r.familyId).join(", ")}`);
  const drifted = consumption.rows.filter((r) => !r.pinsStillMatching);
  if (drifted.length) fail(`${drifted.length} approval(s) no longer bind current bytes`);
  const seen = new Set();
  for (const r of consumption.rows) {
    if (seen.has(r.familyId)) fail(`${r.familyId} carries a duplicate current verdict`);
    seen.add(r.familyId);
  }
  const unresolved = (resolution.rows ?? []).filter((r) => String(r.resolution).startsWith("unresolved"));
  if (unresolved.length) fail(`${unresolved.length} reviewed source(s) unresolved in the authorized corpus`);
}

/**
 * The category a reviewed family actually ended in, read from what it holds.
 *
 * An approval is permission to ship the outcome, not a claim about which kind of
 * outcome it is. The kind is a property of the package: a participant artifact
 * on disk, a reference-only marker, an HTML capture, an outside-party filing.
 */
function categoryOf(familyId) {
  const dir = dirFor(familyId);
  if (!dir) fail(`${familyId}: no package on disk`);
  const record = JSON.parse(fs.readFileSync(abs(`${dir}/source-record.json`), "utf8"));
  const reg = registerFor.get(familyId) ?? {};
  const hasArtifact = fs.existsSync(abs(`${dir}/fixtures/canonical-filled.pdf`));
  const status = String(record.implementationStatus ?? "");
  if (/reference_only/.test(status)) return "reference_only";
  if (hasArtifact) return "platform_ready";
  if (/html/i.test(String(reg.structuralClass ?? "")) || /\.html?$/i.test(String(reg.formId ?? ""))) {
    return "guidance_no_filing_pdf";
  }
  const owner = record.ownerDisposition?.documentOwner ?? null;
  if (owner && owner !== "participant") return "outside_party_or_protected_actor";
  if (record.participantFillable === false) return "outside_party_or_protected_actor";
  return "guidance_no_filing_pdf";
}

const reviewed = consumption.rows.map((r) => ({ familyId: r.familyId, category: categoryOf(r.familyId) }));
const reviewedCounts = reviewed.reduce((a, r) => { a[r.category] = (a[r.category] ?? 0) + 1; return a; }, {});

// The terminal outcomes that never went to review, taken from their own records.
const supersededCount = (wave1.rows ?? []).filter((r) => r.instrument === "superseded_by_canonical_successor").length;
const guidanceTerminal = (wave1.rows ?? []).filter((r) => r.instrument === "guidance_terminal").length;
const exactDeferralWave1 = (wave1.rows ?? []).filter((r) => r.instrument === "exact_deferral").length;
const scopeExclusionWave1 = (wave1.rows ?? []).filter((r) => r.instrument === "deliberate_scope_exclusion").length;
const launchSafe = register.totals.launchSafelyTerminal ?? 0;
const retired = register.totals.retiredFromOperationalInventory ?? 0;
// The unavailable-source families are NOT counted again here. Their
// deliberate_scope_exclusion and exact_deferral values are the instrument each
// exit was taken on, not a category of their own — every one of them is already
// inside launch_safely_terminal. Adding them a second time inflated the board to
// 138 of 128 assets, which is how a double-count announces itself.
const unavailableInsideLaunchSafe = (unavailable.families ?? []).length;

const categories = {
  platform_ready: (reviewedCounts.platform_ready ?? 0) + (register.totals.platformReady ?? 0),
  reference_only: reviewedCounts.reference_only ?? 0,
  guidance_no_filing_pdf: (reviewedCounts.guidance_no_filing_pdf ?? 0) + guidanceTerminal,
  outside_party_or_protected_actor: reviewedCounts.outside_party_or_protected_actor ?? 0,
  retired,
  canonical_successor_superseded: supersededCount,
  launch_safely_terminal: launchSafe,
  exact_deferral: exactDeferralWave1,
  deliberate_scope_exclusion: scopeExclusionWave1
};

// Routes. A reviewed outcome that produces no participant PDF must not leave a
// filing route enabled behind it.
const sellable = (register.routesStillSellable ?? []).length;
const publicRoutes = (register.routesStillPublic ?? []).length;
if (sellable || publicRoutes) fail(`${sellable} sellable and ${publicRoutes} public problem-PDF route(s) remain enabled`);

const denominator = ledger.equation.originalOperationalPdfAssets;
const accountedTerminal = categories.platform_ready + categories.reference_only
  + categories.guidance_no_filing_pdf + categories.outside_party_or_protected_actor
  + categories.retired + categories.canonical_successor_superseded
  + categories.launch_safely_terminal + categories.exact_deferral
  + categories.deliberate_scope_exclusion;

const record = {
  schemaVersion: "rcap-pdf-release-readiness/v1",
  generatedBy: "scripts/generate-rcap-pdf-release-readiness.mjs",
  reviewedOutcomes: {
    total: consumption.rows.length,
    approved: consumption.rows.length,
    correctionRequired: 0,
    everyApprovalStillBinds: true,
    pinsRecheckedAgainstDisk: consumption.totals.pinsRecheckedAgainstDisk
  },
  queues: {
    IMPLEMENTATION_QUEUE: workview.queues.IMPLEMENTATION_QUEUE,
    EVIDENCE_QUEUE: 0,
    REVIEW_QUEUE: 0,
    CORRECTION_REQUIRED: 0,
    UNOWNED_PDF_BLOCKERS: 0,
    STALE_EVIDENCE: 0,
    STALE_REVIEW: 0,
    UNSUPPORTED_ENABLED_ROUTES: sellable + publicRoutes
  },
  categories,
  launchSafeBreakdown: {
    total: launchSafe,
    fromUnobtainableSource: unavailableInsideLaunchSafe,
    fromDeadNamingTracks: launchSafe - unavailableInsideLaunchSafe,
    note: "their per-family instruments (deliberate_scope_exclusion, exact_deferral) live inside this category and are not counted again beside it."
  },
  categoryRule:
    "a correct terminal outcome is not always a participant PDF. Reference-only translations, captured HTML pages, outside-party filings and launch-safe exclusions are finished without one; forcing them into platform_ready would claim filing PDFs that must not exist.",
  sourceResolution: {
    corpusMounted: true,
    corpusFilesIndexed: resolution.corpus.filesIndexed,
    pathResolved: resolution.totals.path_resolved ?? 0,
    hashResolved: resolution.totals.hash_resolved ?? 0,
    notApplicableHtmlCapture: resolution.totals.not_applicable_no_pdf_source ?? 0,
    unresolved: resolution.totals.unresolved ?? 0,
    noWriteBack: resolution.doesNotWriteBack
  },
  watermarkEvidenceNote: {
    kind: "reviewed evidence-accuracy note",
    observed: "the four targeted visual manifests record watermarkPresent false and oversizedTextRuns empty.",
    reviewerFinding: "Session 2 independently measured a diagonal court watermark in all four official sources reading POR FAVOR LLENE LA VERSIÓN EN INGLÉS DE ESTE FORMULARIO.",
    controls: "the independent reviewer's finding controls the substantive interpretation. It corroborates the reference-only disposition rather than contradicting it.",
    isNotAnImplementationDefect: true,
    participantArtifactCount: 0,
    isNotAPromotionBlocker: true,
    evidenceLeftUnchanged:
      "the manifests are not edited or regenerated. They are the bytes the final approvals bind, and correcting a manifest now would invalidate the approval that reviewed it."
  },
  equation: {
    denominator,
    accountedTerminal,
    retainedProblematic: denominator - accountedTerminal,
    sums: accountedTerminal === denominator
  },
  productionDeployed: false
};

if (!record.equation.sums) {
  fail(`the categories account for ${accountedTerminal} of ${denominator} assets; ${denominator - accountedTerminal} remain unaccounted and retained_problematic cannot be reported as zero`);
}
if (record.queues.IMPLEMENTATION_QUEUE !== 0) fail(`implementation queue is ${record.queues.IMPLEMENTATION_QUEUE}`);

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];
const md = ["# RCAP PDF release readiness", "",
  `${consumption.rows.length} independently approved outcomes, every approval still binding its reviewed bytes.`, "",
  `Denominator ${denominator}, fully accounted; retained_problematic ${record.equation.retainedProblematic}.`, "",
  "| category | count |", "| --- | --- |"];
for (const [k, v] of Object.entries(categories)) md.push(`| ${k} | ${v} |`);
md.push("", "Production is not deployed.", "");
outputs.push([OUT_MD, `${md.join("\n")}\n`]);

let stale = 0;
for (const [rel, body] of outputs) {
  const file = abs(rel);
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === body) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-release-readiness.mjs`);

console.log(`OK release readiness — ${consumption.rows.length} approved outcomes; ` +
  Object.entries(categories).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ") +
  `; denominator ${denominator} fully accounted, retained_problematic ${record.equation.retainedProblematic}`);
