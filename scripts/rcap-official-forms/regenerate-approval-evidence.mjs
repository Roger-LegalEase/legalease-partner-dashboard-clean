// Regenerates the review evidence for the 104 previously approved families,
// without touching a single filed artifact.
//
// Those approvals were granted on contact sheets built by the pre-D0-v2 path:
// the sheet embedded the unsanitized blank source, and the residue scan then
// reported an empty hit list on a file whose object streams it could not read
// into. The filed participant PDFs were reviewed on their own bytes and stand;
// the evidence about them does not.
//
// So the participant PDF is loaded, hashed, and used exactly as it is. Only the
// sheet is rebuilt. The hash is re-checked after the run against the hash
// recorded before it, because "we did not change it" is a claim, and a claim
// about 104 court filings should be checkable.
//
// Usage: node regenerate-approval-evidence.mjs <worktree> <lane> [--write]
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [worktree, lane, ...flags] = process.argv.slice(2);
const WRITE = flags.includes("--write");

const orchestratorDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "data/rcap-all50/overlays/production";
const PACK_ROOTS = ["/tmp/rcap-source-packs/ex-D1", "/tmp/rcap-source-packs/ex-D2", "/tmp/rcap-source-packs/ex-D3"];

const { buildContactSheet, ContactSheetProofError } = await import(`${worktree}/scripts/rcap-official-forms/rcap-contact-sheet.mjs`);
const { scanBytesForActiveContent, readAnnotationFlags } = await import(`${worktree}/scripts/rcap-official-forms/rcap-active-content.mjs`);
const { extractTextItems } = await import(`${worktree}/scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs`);
const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
const { PDFDocument } = require(`${worktree}/node_modules/pdf-lib`);

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const gitIn = (dir, args) => { try { return execFileSync("git", args, { cwd: dir, encoding: "buffer", maxBuffer: 1 << 28 }); } catch { return null; } };

const index = JSON.parse(fs.readFileSync(path.join(orchestratorDir, "docs/record-clearing/d-wave/corrections-v2/correction-index.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(orchestratorDir, "docs/record-clearing/d-wave/corrected-review-manifest.json"), "utf8"));
const approved = new Set(index.preservedTechnicalApproved);
const laneHead = index.laneCorrectionBranches[lane]?.head;
if (!laneHead) throw new Error(`unknown lane ${lane}`);

// Source binaries, keyed by their pack-relative path.
const packIndex = new Map();
for (const root of PACK_ROOTS) {
  if (!fs.existsSync(root)) continue;
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else packIndex.set(path.relative(root, p), p);
  } };
  walk(root);
}

const families = manifest.families.filter((f) => approved.has(f.familyId) && f.lane === lane);

// Text that must never appear on a filed document or the evidence about one.
const CONTROL_CAPTIONS = [/^reset( form)?$/i, /^clear (form|all data)$/i, /^print( form)?$/i, /^save( and lock form)?$/i, /^submit$/i];

const results = [];
for (const family of families) {
  const slug = family.familyId.split(":")[1];
  const dir = path.join(worktree, PRODUCTION, family.jurisdictionSlug, slug);
  const r = { familyId: family.familyId, lane, state: family.jurisdiction, checks: [], failures: [] };
  const check = (ok, msg, detail) => { r.checks.push({ ok, msg, ...(detail !== undefined ? { detail } : {}) }); if (!ok) r.failures.push(msg); };

  const canonical = family.finalPdfPaths.find((p) => /canonical-filled\.pdf$/.test(p)) ?? family.finalPdfPaths[0];
  if (!canonical) {
    // Instructional documents, court orders with no participant fill, and
    // overlays still pending a write box produce no filed artifact, so there is
    // no evidence about one to correct.
    r.outcome = "no_participant_artifact_nothing_to_reevidence";
    r.implementationStatus = family.implementationStatus;
    results.push(r);
    continue;
  }

  // 1-2. The approved artifact, and the hash that has to survive this.
  const finalizedBytes = fs.readFileSync(path.join(worktree, canonical));
  const hashBefore = sha(finalizedBytes);
  const hashAtLaneHead = (() => {
    const b = gitIn(worktree, ["show", `${laneHead}:${canonical}`]);
    return b ? sha(b) : null;
  })();
  check(hashAtLaneHead === hashBefore,
    "the participant PDF on this branch is the one that was approved at the lane head",
    { hashAtLaneHead: hashAtLaneHead?.slice(0, 16) ?? null, onBranch: hashBefore.slice(0, 16) });

  const sourceAbs = packIndex.get(family.sourceCanonicalPath ?? "");
  if (!sourceAbs) {
    check(false, "the blank source resolves in the packs", family.sourceCanonicalPath);
    r.outcome = "source_binary_unavailable";
    results.push(r);
    continue;
  }
  const blankBytes = fs.readFileSync(sourceAbs);
  check(sha(blankBytes) === family.sourceSha256, "the blank source hashes to the recorded sha256");

  // Expected values come from the approval evidence already on the branch, so
  // the new sheet is held to the same claim the old one made.
  let expectedValues = [];
  const proofPath = family.contactSheetProofPath ? path.join(worktree, family.contactSheetProofPath) : null;
  if (proofPath && fs.existsSync(proofPath)) {
    const raw = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    expectedValues = (raw.proof ?? raw).expectedValues ?? [];
  }

  // 3. The new sheet, from the unchanged artifact.
  let sheet = null;
  try {
    sheet = await buildContactSheet({
      blankBytes, finalizedBytes, expectedValues,
      artifactLabel: `${family.familyId} approval-evidence contact sheet`
    });
  } catch (error) {
    check(false, `the contact sheet builds from the approved artifact (${error.name})`, error.message.slice(0, 200));
    r.outcome = error instanceof ContactSheetProofError ? "contact_sheet_proof_failed" : "contact_sheet_build_failed";
    r.error = `${error.name}: ${error.message.slice(0, 300)}`;
    results.push(r);
    continue;
  }

  // 4. The filed artifact is untouched.
  const hashAfter = sha(fs.readFileSync(path.join(worktree, canonical)));
  check(hashAfter === hashBefore, "the participant PDF is byte-identical after regenerating its evidence",
    { before: hashBefore.slice(0, 16), after: hashAfter.slice(0, 16) });

  // 5-6. The sheet shows what it claims to show.
  check(sheet.proof.allExpectedValuesVisible === true,
    `every expected participant value is visible (${expectedValues.length} value(s))`);
  check(expectedValues.length === 0 || sheet.proof.panelsDiffer === true,
    "the blank and filled panels differ where values are expected");

  // 7-8. It is inspectable, and clean.
  const scan = scanBytesForActiveContent(sheet.bytes);
  check(scan.inspectable === true, "the sheet is byte-inspectable", scan.verdict);
  check(scan.hits.length === 0, "no XFA, JavaScript, /AA, OpenAction, Launch, Submit, Import, URI or network action remains", scan.hits);
  check(sheet.proof.panelScans?.blank?.clean === true && sheet.proof.panelScans?.finalized?.clean === true,
    "both panels were clean at the moment they were embedded",
    { blank: sheet.proof.panelScans?.blank?.hits ?? null, finalized: sheet.proof.panelScans?.finalized?.hits ?? null });

  // 9. No helper text or control caption reached the filed artifact. Judged on
  // the artifact itself, since the sheet only shows what the artifact contains.
  const nonPrintingBoxes = [];
  const printingBoxes = [];
  try {
    const src = await PDFDocument.load(blankBytes, { ignoreEncryption: true, updateMetadata: false });
    for (const field of src.getForm().getFields()) {
      for (const w of field.acroField.getWidgets()) {
        let q = null;
        try { q = w.getRectangle(); } catch { continue; }
        const box = { x0: q.x, y0: q.y, x1: q.x + q.width, y1: q.y + q.height };
        (readAnnotationFlags(w.dict).partOfFiledAppearance ? printingBoxes : nonPrintingBoxes).push(box);
      }
    }
  } catch { /* a flat form has no widgets to judge */ }

  const artDoc = await PDFDocument.load(finalizedBytes, { ignoreEncryption: true });
  const runs = artDoc.getPages().flatMap((p, i) => extractTextItems(p).map((t) => ({ page: i + 1, ...t })));
  const covers = (bs, t) => bs.some((b) => t.x >= b.x0 - 2 && t.x <= b.x1 + 2 && t.y >= b.y0 - 2 && t.y <= b.y1 + 2);

  // Whatever the untouched source already prints in its own page content is
  // the form's, not ours, wherever it happens to sit. Official forms print
  // labels and rule lines underneath their controls -- one Colorado form
  // prints "Courtroom:" inside a non-printing widget's rectangle -- so without
  // this the check condemns the form's own text. Two widgets can also overlap,
  // so a run belonging to a printing widget is excluded as well.
  const srcDoc = await PDFDocument.load(blankBytes, { ignoreEncryption: true });
  const sourceRuns = new Set(srcDoc.getPages().flatMap((p, i) =>
    extractTextItems(p).map((t) => `${i + 1}|${t.text}|${Math.round(t.x)}|${Math.round(t.y)}`)));
  const fromSource = (t) => sourceRuns.has(`${t.page}|${t.text}|${Math.round(t.x)}|${Math.round(t.y)}`);

  const captionLeaks = runs.filter((t) => CONTROL_CAPTIONS.some((re) => re.test(String(t.text).trim())) && !fromSource(t));
  const widgetLeaks = runs.filter((t) => covers(nonPrintingBoxes, t) && !covers(printingBoxes, t) && !fromSource(t));
  check(captionLeaks.length === 0, "no Reset, Clear Form or Print caption appears in the filed artifact",
    captionLeaks.slice(0, 5).map((t) => ({ page: t.page, text: String(t.text).slice(0, 30) })));
  check(widgetLeaks.length === 0, "no helper text from a non-printing widget appears in the filed artifact",
    widgetLeaks.slice(0, 5).map((t) => ({ page: t.page, text: String(t.text).slice(0, 40) })));

  // The sheet is written whenever it built, including for a family whose
  // artifact failed a check. A sheet that documents a defect is exactly the
  // evidence an independent reviewer needs; withholding it would hide the
  // finding rather than surface it.
  if (WRITE) {
    const sheetPath = family.contactSheetPaths[0] ?? `${PRODUCTION}/${family.jurisdictionSlug}/${slug}/contact-sheet/blank-vs-filled.pdf`;
    fs.mkdirSync(path.dirname(path.join(worktree, sheetPath)), { recursive: true });
    fs.writeFileSync(path.join(worktree, sheetPath), sheet.bytes);
    fs.writeFileSync(path.join(worktree, path.dirname(sheetPath), "contact-sheet-proof.json"),
      `${JSON.stringify({
        schemaVersion: "rcap-contact-sheet-proof/v2-d0v2-approval-evidence",
        basis: "regenerated from the unchanged, previously approved participant artifact using the D0-v2 contact-sheet path",
        participantArtifact: canonical,
        participantArtifactSha256: hashBefore,
        participantArtifactUnchanged: true,
        built: true,
        // Recorded on the evidence itself, so a reviewer opening this family
        // sees the finding without having to consult a separate report.
        filedArtifactChecksPassed: r.failures.length === 0,
        filedArtifactFindings: r.checks.filter((c) => !c.ok),
        proof: sheet.proof
      }, null, 2)}\n`);
    r.written = { sheet: sheetPath, sheetSha256: sha(sheet.bytes) };
  }

  r.participantArtifact = canonical;
  r.participantArtifactSha256 = hashBefore;
  r.participantArtifactUnchanged = hashAfter === hashBefore;
  r.expectedValueCount = expectedValues.length;
  r.sheetSha256 = sha(sheet.bytes);
  r.outcome = r.failures.length === 0 ? "evidence_regenerated_clean" : "evidence_regeneration_found_a_problem";
  results.push(r);
}

const totals = {
  lane,
  approvedFamiliesInLane: families.length,
  withParticipantArtifact: results.filter((r) => r.participantArtifact).length,
  noParticipantArtifact: results.filter((r) => r.outcome === "no_participant_artifact_nothing_to_reevidence").length,
  evidenceRegeneratedClean: results.filter((r) => r.outcome === "evidence_regenerated_clean").length,
  problems: results.filter((r) => (r.failures?.length ?? 0) > 0 || /failed|unavailable/.test(r.outcome ?? "")).length,
  participantHashesUnchanged: results.filter((r) => r.participantArtifactUnchanged === true).length,
  written: results.filter((r) => r.written).length
};

console.log(JSON.stringify({ totals, problems: results.filter((r) => (r.failures?.length ?? 0) > 0 || /failed|unavailable/.test(r.outcome ?? "")) }, null, 2));

if (WRITE) {
  const outDir = path.join(worktree, "docs/record-clearing/d-wave/corrections-v2/approval-evidence");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${lane.toLowerCase()}-approval-evidence.json`),
    `${JSON.stringify({ schema: "rcap-d-approval-evidence/v1", lane, laneHead, totals, families: results }, null, 2)}\n`);
}
process.exitCode = totals.problems === 0 ? 0 : 1;
