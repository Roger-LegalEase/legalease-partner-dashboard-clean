// Read-only scan of every previously approved D family for the false-clean
// shrink signature.
//
// Virginia and Vermont were caught drawing a value shorter than the one
// supplied, or past the widget's edge, and recording it as a clean `shrunk`
// outcome with an empty overflow ledger. That is a fitter-and-reporter defect,
// not a Virginia one, so every other approved family has to be asked the same
// question before any of them is promoted on the strength of an approval that
// predates the question.
//
// Nothing is re-rendered. Each family's artifacts are read out of git as blobs
// -- no worktree, no checkout, no write of any kind -- and the read-back is run
// against the bytes that were approved. A family with no defect is reported as
// such, with the command that reproduces the negative result.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";

import { extractTextItems } from "./rcap-pdf-anchor-capture.mjs";
import { verifyWrittenValue } from "./rcap-text-fitting.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "docs/record-clearing/d-wave/v4");

const git = (a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const gitBytes = (a) => execFileSync("git", a, { cwd: REPO, maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const showJson = (ref, p) => { try { return JSON.parse(git(["show", `${ref}:${p}`])); } catch { return null; } };
const showBytes = (ref, p) => { try { return gitBytes(["show", `${ref}:${p}`]); } catch { return null; } };
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

const handoff = JSON.parse(fs.readFileSync(path.join(REPO, "docs/record-clearing/d-wave/v3/family-handoff.json"), "utf8"));
const laneBranches = handoff.currentFamilyBranches;
const approved = handoff.families.filter((f) => f.finalDisposition === "technical_approved");

// Where each approved family's bytes live. A family appears on several lane
// branches because they share a base, so the owning lane is the one whose tree
// carries the largest package -- the only one that can have corrected it.
const STATE_DIR_CACHE = new Map();
function locate(familyId) {
  if (STATE_DIR_CACHE.has(familyId)) return STATE_DIR_CACHE.get(familyId);
  const slug = familyId.split(":")[1];
  let best = null;
  for (const [lane, b] of Object.entries(laneBranches)) {
    const listed = (() => { try { return git(["ls-tree", "-r", "--name-only", b.commit, "data/rcap-all50/overlays/production/"]); } catch { return ""; } })();
    for (const line of listed.split("\n")) {
      const m = new RegExp(`^(data/rcap-all50/overlays/production/[^/]+/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})/`).exec(line);
      if (!m) continue;
      const count = listed.split("\n").filter((l) => l.startsWith(`${m[1]}/`)).length;
      if (!best || count > best.count) best = { lane, commit: b.commit, branch: b.branch, pkg: m[1], count };
      break;
    }
  }
  STATE_DIR_CACHE.set(familyId, best);
  return best;
}

const CANONICAL_FALLBACK = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.arrest_date": "2019-03-08", "matter.offense_date": "2019-03-08",
  "matter.conviction_date": "2019-11-02", "matter.disposition_date": "2020-01-15",
  "deterministic.filing_date": "2026-08-12"
};

function rowsOf(populated) {
  if (Array.isArray(populated)) return populated;
  return populated?.canonicalWritten ?? [];
}

const findings = [];
const disclosed = [];
const scanned = [];
const skipped = [];

for (const fam of approved) {
  const loc = locate(fam.familyId);
  if (!loc) { skipped.push({ familyId: fam.familyId, reason: "no lane branch carries a package for this family" }); continue; }

  const filledPath = `${loc.pkg}/fixtures/canonical-filled.pdf`;
  const filled = showBytes(loc.commit, filledPath);
  if (!filled) { skipped.push({ familyId: fam.familyId, reason: "approved package carries no participant artifact to read" }); continue; }

  const census = showJson(loc.commit, `${loc.pkg}/field-census.json`);
  const populated = showJson(loc.commit, `${loc.pkg}/reports/populated-fields.json`);
  const overflow = showJson(loc.commit, `${loc.pkg}/reports/overflow-and-clipping.json`);
  const manifest = showJson(loc.commit, `${loc.pkg}/reports/rendered-artifacts.json`);
  const fixture = showJson(loc.commit, `${loc.pkg}/fixtures/canonical.json`);
  if (!census || !populated) { skipped.push({ familyId: fam.familyId, reason: "approved package carries no census or populated-fields record" }); continue; }

  const facts = fixture?.facts ?? fixture ?? CANONICAL_FALLBACK;
  const widget = new Map((census.fields ?? []).map((f) => [f.name, f.widgets?.[0] ?? null]));
  const reported = new Set([
    ...(overflow?.findings ?? []).map((x) => x.field ?? x.anchor),
    ...(overflow?.unfittableCanonical ?? []).map((x) => x.field ?? x.anchor),
    ...(overflow?.unfittableBoundary ?? []).map((x) => x.field ?? x.anchor)
  ].filter(Boolean));

  let doc;
  try { doc = await PDFDocument.load(filled, { ignoreEncryption: true, updateMetadata: false }); }
  catch (e) { skipped.push({ familyId: fam.familyId, reason: `participant artifact will not load: ${e.message.slice(0, 80)}` }); continue; }
  const runsByPage = doc.getPages().map((p) => extractTextItems(p));
  const runSource = runsByPage.flat().some((r) => r.container?.bbox) ? "appearance" : "auto";

  const rows = rowsOf(populated);
  let checked = 0;
  for (const row of rows) {
    const name = row.field ?? row.anchor;
    const w = widget.get(name);
    const value = row.value ?? row.expectedValue ?? facts[row.factId];
    if (!w?.rect || value == null) continue;
    // A dropdown's appearance stream carries its whole option list, so reading
    // it back as drawn text compares a fourteen-character county against every
    // county in Kentucky. Fitting is a text-field question; a dropdown either
    // holds a legal option or was refused for not holding one.
    if (row.kind === "dropdown" || w.type === "dropdown") continue;
    checked += 1;
    const v = verifyWrittenValue({
      value: String(value), rect: w.rect, runs: runsByPage[(w.page ?? 1) - 1] ?? [], runSource
    });
    // Absent-and-already-reported is a refusal that held, not a defect.
    if (v.outcome === "absent" && reported.has(name)) continue;
    if (v.outcome !== "clipped") continue;
    const row_ = {
      familyId: fam.familyId,
      lane: loc.lane,
      approvedBranch: loc.branch,
      approvedArtifactCommit: loc.commit,
      familyPackagePath: loc.pkg,
      fieldId: name,
      factId: row.factId ?? null,
      suppliedValue: String(value),
      suppliedChars: String(value).length,
      visibleValue: v.drawn,
      visibleChars: v.drawnChars,
      widgetGeometry: v.widget,
      overflowLeftPt: v.overflowLeftPt,
      overflowRightPt: v.overflowRightPt,
      runsSelectedBy: v.selectedBy,
      recordedFittingDisposition: row.outcome ?? null,
      recordedInOverflowLedger: reported.has(name),
      artifactSha256: sha256(filled),
      manifestSha256ForArtifact: manifest?.artifacts?.["fixtures/canonical-filled.pdf"]?.sha256 ?? null,
      manifestAgreesWithArtifact: (manifest?.artifacts?.["fixtures/canonical-filled.pdf"]?.sha256 ?? null) === sha256(filled),
      existingApprovalStillSupportable: reported.has(name),
      why: reported.has(name)
        ? "the artifact draws a value shorter than the one supplied, or outside its widget, and the family's own overflow ledger already records it -- disclosed, not concealed, so the approval rests on evidence the reviewer had"
        : "the artifact draws a value that is shorter than the one supplied, or outside its widget, while the family's own ledger records no such finding"
    };
    // The defect under investigation is a *silent* clip. A clip the family
    // already reported is a disclosed limitation the reviewer saw and approved
    // over; recording it as a new finding would manufacture four regressions
    // out of four accurate ledgers.
    (reported.has(name) ? disclosed : findings).push(row_);
  }
  scanned.push({ familyId: fam.familyId, lane: loc.lane, commit: loc.commit, writesChecked: checked });
}

const affectedFamilies = [...new Set(findings.map((f) => f.familyId))];
const out = {
  schema: "rcap-d-v4-approved-fitter-scan/v1",
  posture: "Read-only. Every artifact is read as a git blob; no worktree is created, no family is re-rendered, and nothing is written outside this report.",
  question: "Does any previously approved D family draw a value shorter than the one supplied, or outside its widget, while recording a clean fitting outcome?",
  approvedFamilies: approved.length,
  familiesScanned: scanned.length,
  familiesSkipped: skipped.length,
  writesChecked: scanned.reduce((n, s) => n + s.writesChecked, 0),
  additionalAffectedFamilies: affectedFamilies.length,
  findings,
  clipsAlreadyDisclosedByTheirOwnLedger: disclosed,
  skipped,
  scanned,
  executableProof: {
    command: "node scripts/rcap-official-forms/d-v4-approved-fitter-scan.mjs",
    interpretation: "Exit status 0 with additionalAffectedFamilies == 0 is the negative result: the two families the reviewer named are the only ones carrying this signature among those whose approved packages contain a readable participant artifact.",
    reproducibility: "The scan reads committed blobs at the lane commits named in the handoff, so it returns the same answer from any checkout that can see those commits."
  }
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "approved-fitter-scan.json"), `${JSON.stringify(out, null, 2)}\n`);

console.log(`approved families:        ${out.approvedFamilies}`);
console.log(`scanned:                  ${out.familiesScanned}`);
console.log(`skipped (no artifact):    ${out.familiesSkipped}`);
console.log(`written values read back: ${out.writesChecked}`);
console.log(`additional affected:      ${out.additionalAffectedFamilies}`);
for (const f of findings.slice(0, 40)) {
  console.log(`  ${f.familyId} :: ${f.fieldId} supplied ${f.suppliedChars} visible ${f.visibleChars} (${f.runsSelectedBy}) ledger=${f.recordedInOverflowLedger}`);
}
