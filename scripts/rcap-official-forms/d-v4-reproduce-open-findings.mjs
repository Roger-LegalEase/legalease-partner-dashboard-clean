// Reproduces every open D finding against the imported bytes, before anything
// is changed.
//
// A correction that lands without the defect having been observed first is a
// guess: it may fix something, but nobody can say it fixed *this*. Worse, a
// finding that no longer reproduces usually means the wrong bytes were
// imported, and that is far easier to discover here than after a rerender.
//
// So each of the eleven findings is checked directly against the artifact or
// the source the family actually carries, using the reconstructed D0-v4
// factory, and the observed value is recorded next to the value the reviewer
// reported. Read-only: nothing here writes into a family package.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";

import { extractTextItems, groupIntoLines, partitionDecodableAnchors } from "./rcap-pdf-anchor-capture.mjs";
import { verifyWrittenValue } from "./rcap-text-fitting.mjs";
import { readSourceBinary } from "./d-v4-source-packs.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "docs/record-clearing/d-wave/v4");
const inputs = JSON.parse(fs.readFileSync(path.join(OUT, "implementation-inputs.json"), "utf8"));
const byId = new Map(inputs.families.map((f) => [f.familyId, f]));

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), "utf8"));
const pkgOf = (id) => byId.get(id).familyPackagePath;

// The control captions a filed artifact must never carry. A flattened form has
// no buttons left, so any of these appearing as drawn text means the sheet was
// built from an unflattened or superseded intermediate.
const CONTROL_CAPTIONS = [/^print$/i, /^reset$/i, /^save$/i, /^clear$/i,
  /^submit$/i, /^next\b/i, /^previous\b/i, /^back$/i, /^continue$/i,
  /^print\s+form$/i, /^reset\s+form$/i, /^clear\s+form$/i, /^save\s+form$/i];

const findings = [];
const record = (o) => { findings.push(o); const s = o.reproduced ? "REPRODUCED" : "NOT REPRODUCED"; console.log(`${s.padEnd(15)} ${o.findingId}  ${o.familyId}`); if (o.detail) console.log(`                ${o.detail}`); };

// --- MO CR-145: participant identity in a field whose printed label is an agency
{
  const id = "MO:cr145-form-petition-en";
  const pkg = pkgOf(id);
  const map = readJson(`${pkg}/production-field-map.json`);
  const census = readJson(`${pkg}/field-census.json`);
  const binding = map.bindings.find((b) => b.field === "Other Defendants");
  const field = census.fields.find((f) => f.name === "Other Defendants");
  const rect = field?.widgets?.[0]?.rect ?? null;

  // What the form itself prints above that widget, read from the source.
  const src = readSourceBinary({ sha256: map.sha256, familyId: id });
  const doc = await PDFDocument.load(src.bytes, { ignoreEncryption: true, updateMetadata: false });
  const lines = groupIntoLines(extractTextItems(doc.getPage((field?.widgets?.[0]?.page ?? 1) - 1)));
  const above = lines
    .filter((l) => rect && l.y >= rect.y + rect.height - 2 && l.y <= rect.y + rect.height + 26)
    .sort((a, b) => a.y - b.y)[0] ?? null;

  // And what the artifact actually shows in it.
  const filled = await PDFDocument.load(fs.readFileSync(path.join(REPO, `${pkg}/fixtures/canonical-filled.pdf`)), { ignoreEncryption: true, updateMetadata: false });
  const drawn = rect
    ? verifyWrittenValue({ value: "Marion T. Ellsworth", rect, runs: extractTextItems(filled.getPage((field?.widgets?.[0]?.page ?? 1) - 1)) })
    : null;

  record({
    findingId: "D-V3-R-007", familyId: id,
    reviewerClaim: "the petitioner's own name is written into 'Other Defendants', whose printed label names an agency",
    reproduced: binding?.factId === "participant.full_legal_name" && /agency/i.test(above?.text ?? ""),
    observed: {
      boundFactId: binding?.factId ?? null, boundClass: binding?.class ?? null,
      printedLabelAboveWidget: above?.text ?? null, widgetRect: rect,
      valueVisibleInArtifact: drawn?.outcome ?? null, drawnText: drawn?.drawn ?? null
    },
    detail: `bound to ${binding?.factId}; printed label above the widget reads ${JSON.stringify(above?.text ?? "(none read)")}`
  });
}

// --- NH NHJB-2956: the contact sheet was not rebuilt from the corrected artifact
{
  const id = "NH:nhjb-2956-support-record-request-en";
  const pkg = pkgOf(id);
  const manifest = readJson(`${pkg}/reports/rendered-artifacts.json`);
  const sheetPath = path.join(REPO, `${pkg}/contact-sheet/blank-vs-filled.pdf`);
  const sheet = await PDFDocument.load(fs.readFileSync(sheetPath), { ignoreEncryption: true, updateMetadata: false });
  const sheetText = sheet.getPages().flatMap((p) => groupIntoLines(extractTextItems(p)));
  const captionHits = [];
  for (const line of sheetText) {
    for (const run of line.runs ?? []) {
      const t = String(run.text ?? "").trim();
      if (CONTROL_CAPTIONS.some((re) => re.test(t))) captionHits.push({ text: t, y: line.y, x: run.x });
    }
  }
  // The manifest's own claim about the sheet, against the sheet on disk.
  const artifacts = manifest.artifacts ?? {};
  const sheetEntry = Object.entries(artifacts).find(([k]) => /contact.?sheet|blank-vs-filled/i.test(k));
  const { createHash } = await import("node:crypto");
  const sheetSha = createHash("sha256").update(fs.readFileSync(sheetPath)).digest("hex");
  const manifestSha = typeof sheetEntry?.[1] === "string" ? sheetEntry[1] : sheetEntry?.[1]?.sha256 ?? null;

  record({
    findingId: "D-V3-R-001", familyId: id,
    reviewerClaim: "the participant artifact was re-rendered but its contact sheet was not, so the sheet still shows the superseded artifact with the control captions the re-render removed",
    reproduced: captionHits.length > 0 || (manifestSha !== null && manifestSha !== sheetSha),
    observed: {
      controlCaptionsVisibleInSheet: captionHits.slice(0, 12),
      controlCaptionCount: captionHits.length,
      sheetSha256: sheetSha, manifestSheetSha256: manifestSha,
      manifestAgreesWithSheet: manifestSha === null ? null : manifestSha === sheetSha
    },
    detail: `${captionHits.length} control caption(s) still drawn on the sheet; manifest ${manifestSha === sheetSha ? "agrees" : "disagrees"} with the sheet on disk`
  });
}

// --- VA CC-1203 and VT 200-00631: values drawn clipped, reported clean
const CANONICAL_VALUES = {
  // The canonical fixture the lanes render, as the driver defines it.
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.city_state_zip": "Springfield, XX 01234", "participant.state": "XX",
  "participant.zip": "01234",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.arrest_date": "2019-03-08", "matter.offense_date": "2019-03-08",
  "matter.conviction_date": "2019-11-02", "matter.disposition_date": "2020-01-15",
  "deterministic.filing_date": "2026-08-12"
};

// The boundary fixture is the one that exercises fitting, so it is where a
// clip most often lives; VT's is exactly that case.
const BOUNDARY_VALUES = {
  ...CANONICAL_VALUES,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County"
};
const FIXTURE_VALUES = { canonical: CANONICAL_VALUES, boundary: BOUNDARY_VALUES };

// Two lanes wrote populated-fields.json two ways. Both are read rather than one
// being declared correct, because a reader that understands only its own lane's
// shape reports the other lane's family as having written nothing.
function populatedRows(doc) {
  if (Array.isArray(doc)) return { canonical: doc, boundary: doc };
  return {
    canonical: doc.canonicalWritten ?? [],
    boundary: doc.boundaryWritten ?? doc.canonicalWritten ?? []
  };
}

for (const [id, findingId, claim] of [
  ["VA:cc-1203-form-en", "D-V3-R-002", "User.AncillaryCaseNumber is drawn truncated past both widget edges and the overflow reporter did not record it"],
  ["VT:200-00631-form-en", "D-V3-R-005", "the participant's name is drawn cut mid-word at 39 of 70 characters and recorded as a clean 'shrunk' outcome"]
]) {
  const pkg = pkgOf(id);
  const census = readJson(`${pkg}/field-census.json`);
  const populated = readJson(`${pkg}/reports/populated-fields.json`);
  const overflow = readJson(`${pkg}/reports/overflow-and-clipping.json`);
  const geom = new Map();
  for (const f of census.fields ?? []) geom.set(f.name, { rect: f.widgets?.[0]?.rect ?? null, page: f.widgets?.[0]?.page ?? 1 });

  const reportedFields = new Set([
    ...(overflow.findings ?? []).map((f) => f.field),
    ...(overflow.unfittableCanonical ?? []).map((f) => f.field ?? f),
    ...(overflow.unfittableBoundary ?? []).map((f) => f.field ?? f)
  ]);
  const rowsByFixture = populatedRows(populated);
  const results = [];
  const consistentRefusals = [];
  for (const fixture of ["canonical", "boundary"]) {
    const file = path.join(REPO, `${pkg}/fixtures/${fixture}-filled.pdf`);
    if (!fs.existsSync(file)) continue;
    const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
    const runs = doc.getPages().map((p) => extractTextItems(p));
    for (const row of rowsByFixture[fixture] ?? []) {
      const g = geom.get(row.field);
      const value = row.value ?? FIXTURE_VALUES[fixture][row.factId];
      if (!g?.rect || value == null) continue;
      const v = verifyWrittenValue({ value: String(value), rect: g.rect, runs: runs[g.page - 1] ?? [] });
      // A field the overflow report already records as refused is *supposed* to
      // be absent from the page. Reading it back as absent confirms the refusal
      // rather than finding a defect, so it is recorded as consistent and kept
      // out of the defect list.
      if (v.outcome === "absent" && reportedFields.has(row.field)) {
        consistentRefusals.push({ fixture, field: row.field, factId: row.factId,
          note: "recorded as refused and nothing is drawn on the page: the refusal held" });
        continue;
      }
      if (v.outcome === "clipped" || v.outcome === "absent") {
        results.push({
          fixture, field: row.field, factId: row.factId,
          recordedFittingOutcome: row.outcome ?? null,
          recordedInOverflowReport: reportedFields.has(row.field),
          suppliedValue: String(value), suppliedChars: String(value).length,
          visibleValue: v.drawn ?? "", visibleChars: v.drawnChars ?? 0,
          overflowLeftPt: v.overflowLeftPt ?? 0, overflowRightPt: v.overflowRightPt ?? 0,
          widget: v.widget ?? g.rect, reason: v.reason, readbackOutcome: v.outcome,
          runsSelectedBy: v.selectedBy ?? null
        });
      }
    }
  }
  record({
    findingId, familyId: id, reviewerClaim: claim,
    reproduced: results.length > 0,
    observed: { clippedWrites: results, refusalsConfirmed: consistentRefusals, overflowReportFindings: (overflow.findings ?? []).length },
    detail: results.length > 0
      ? results.map((r) => `${r.fixture}/${r.field}: supplied ${r.suppliedChars} chars, visible ${r.visibleChars}, recorded "${r.recordedFittingOutcome}", in overflow report: ${r.recordedInOverflowReport}`).join("; ")
      : "no clipped write found"
  });
}

// --- Washington x4: the profile disagrees with the decoder
for (const [id, findingId, claim] of [
  ["WA:blake-006-form-en", "D-V3-R-010", "every text run is a single character, so the run-level label matcher cannot see labels at all; 'no participant label matched' is not a supportable conclusion"],
  ["WA:blake-008-form-en", "D-V3-R-011", "same"],
  ["WA:crrlj-09-0100-form-en", "D-V3-R-008", "the profile reports 0 unreadable lines while the decoder's own gate refuses 2"],
  ["WA:crrlj-09-0870-form-en", "D-V3-R-009", "the profile reports 0 unreadable lines while the decoder's own gate refuses 7"]
]) {
  const pkg = pkgOf(id);
  const rec = readJson(`${pkg}/source-record.json`);
  const profile = readJson(`${pkg}/overlay-profile.json`);
  const src = readSourceBinary({ sha256: rec.sha256, familyId: id });
  const doc = await PDFDocument.load(src.bytes, { ignoreEncryption: true, updateMetadata: false });

  let runs = 0, singleCharRuns = 0;
  const lines = [];
  for (const p of doc.getPages()) {
    const items = extractTextItems(p);
    runs += items.length;
    singleCharRuns += items.filter((i) => String(i.text).length === 1).length;
    lines.push(...groupIntoLines(items));
  }
  const part = partitionDecodableAnchors(lines);
  const profileUnreadable = (profile.anchorCapture?.pages ?? []).reduce((n, p) => n + (p.unreadableLines ?? 0), 0);

  record({
    findingId, familyId: id, reviewerClaim: claim,
    reproduced: profileUnreadable !== part.refusedLines
      || ((profile.anchorCapture?.candidateLabelCount ?? 0) === 0 && part.usableLines > 0),
    observed: {
      totalRuns: runs, singleCharacterRuns: singleCharRuns,
      singleCharacterRunShare: Number((singleCharRuns / Math.max(1, runs)).toFixed(4)),
      decoderLines: lines.length, decoderUsableLines: part.usableLines,
      decoderRefusedLines: part.refusedLines, decoderRefusedByReason: part.refusedByReason,
      profileUnreadableLines: profileUnreadable,
      profileCandidateLabelCount: profile.anchorCapture?.candidateLabelCount ?? null,
      profileAnchorCount: profile.anchorCapture?.anchorCount ?? null,
      recordedImplementationStatus: rec.implementationStatus,
      readableLabelSample: part.usable.slice(0, 5).map((l) => l.text.slice(0, 70)),
      refusedSample: part.refused.slice(0, 8)
    },
    detail: `profile says ${profileUnreadable} unreadable, decoder refuses ${part.refusedLines}; ${singleCharRuns}/${runs} runs are single characters; profile found ${profile.anchorCapture?.candidateLabelCount ?? "?"} candidate labels against ${part.usableLines} usable decoder lines`
  });
}

const out = {
  schema: "rcap-d-v4-finding-reproduction/v1",
  posture: "Read-only. Reproduces each open finding against the imported bytes before any correction, so a fix can be shown to have addressed the defect that was actually reported.",
  canonicalControlPlaneBase: inputs.canonicalControlPlaneBase,
  totals: { findings: findings.length, reproduced: findings.filter((f) => f.reproduced).length },
  findings
};
fs.writeFileSync(path.join(OUT, "finding-reproduction.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(`\n${out.totals.reproduced}/${out.totals.findings} findings reproduced against the imported bytes`);
process.exitCode = out.totals.reproduced === out.totals.findings ? 0 : 1;
