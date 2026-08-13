// Re-renders the eight open D families with the reconstructed D0-v4 factory.
//
// Scope is the point. This driver knows eight family ids and refuses to touch
// anything else: a lane driver rebuilds every family it can find, and running
// one to fix Missouri would rewrite Colorado, Texas, North Dakota and New
// Hampshire on the way past. The families it does touch are named on the
// command line or taken from the handoff-derived input record, and every path
// it writes lives inside one of those eight package directories.
//
// Two render paths, because the corpus has two kinds of form. An AcroForm is
// filled through its own fields and flattened. A flat form has no fields at
// all, so values are drawn at anchors measured against the printed text -- and
// that measurement is only as good as the decoder, which is why the Washington
// families are here.
//
// Run with:
//   node scripts/rcap-official-forms/d-v4-remediate-families.mjs [familyId ...]
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";

import {
  extractTextItems, groupIntoLines, partitionDecodableAnchors,
  assembleLabelTokens, measureWidgetLabel
} from "./rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay, DETERMINISTIC_STAMP } from "./rcap-official-form-finalize.mjs";
import { buildContactSheet } from "./rcap-contact-sheet.mjs";
import { decideBinding } from "./rcap-field-semantics.mjs";
import { readSourceBinary } from "./d-v4-source-packs.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "docs/record-clearing/d-wave/v4");
const inputs = JSON.parse(fs.readFileSync(path.join(OUT, "implementation-inputs.json"), "utf8"));

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(o, null, 2)}\n`); };

// The fixtures every family renders. Identical to the lane drivers' sets, so a
// re-render is comparable to what the reviewer inspected.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202", charge: "Criminal trespass, third degree",
      arrest_date: "2020-06-21", offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203", charge: "Driving while license suspended",
      arrest_date: "2021-09-02", offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" }
  ]
};
// The negative fixture supplies nothing, so every field must come back refused.
// It is the only fixture that can show a value being invented.
const NEGATIVE = {};

const LANE_DEFAULTS = { canonical: CANONICAL, boundary: BOUNDARY, negative: NEGATIVE };

/**
 * The fact set a family renders, preferring the one its own package carries.
 *
 * Six of the eight packages ship their fixtures as data -- Missouri's canonical
 * participant is Marion T. Ellsworth in Greene County, not the D1 lane's Jordan
 * Avery Reyes -- and re-rendering with a different fact set would produce an
 * artifact the reviewer's findings no longer describe. The lane defaults are a
 * fallback for the two packages that never stored theirs, not a replacement.
 */
function fixtureFacts(pkgAbs, name) {
  const file = path.join(pkgAbs, `fixtures/${name}.json`);
  if (fs.existsSync(file)) {
    const doc = readJson(file);
    return { facts: doc.facts ?? doc, source: `fixtures/${name}.json` };
  }
  return { facts: LANE_DEFAULTS[name], source: "lane default fact set" };
}

const FIXTURE_NAMES = ["canonical", "boundary", "negative"];

/**
 * The set of fields the reviewed package actually bound, read out of git.
 *
 * A correction is subtractive. The reviewer inspected these families and
 * objected to specific bindings; every other binding in the package is
 * approved work, and a re-render that quietly *adds* bindings is not a
 * correction, it is a new implementation nobody reviewed.
 *
 * This matters because the lane drivers narrowed the shared binder with guards
 * of their own that are not part of the factory. Re-rendering Virginia through
 * the factory alone binds nine fields the lane deliberately left alone --
 * including a city-or-county field that on an arrest record names where the
 * arrest happened, not where the participant lives. Those are exactly the
 * judgements a correction has no business overturning.
 *
 * So the reviewed binding set is an allowlist: the binder may still refuse a
 * field it used to write, and that is the correction; it may not write a field
 * the reviewed package left blank.
 */
function reviewedBindingAllowlist(family) {
  // A flat form records its bindings in the overlay profile; an AcroForm in the
  // field map. Reading whichever the package has keeps the rule the same for
  // both rather than exempting one shape from it.
  const candidates = ["production-field-map.json", "overlay-profile.json"];
  let raw = null;
  for (const name of candidates) {
    try {
      raw = execFileSync("git", ["show", `${family.finalImplementationCommit}:${family.familyPackagePath}/${name}`],
        { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
      break;
    } catch { /* try the other shape */ }
  }
  if (raw === null) throw new Error(`${family.familyId}: the reviewed package records no binding set to scope against`);
  const map = JSON.parse(raw);
  const fields = (map.bindings ?? []).map((b) => b.field ?? b.anchor).filter(Boolean);
  return { allow: new Set(fields), explicitMappings: map.explicitMappings ?? {}, reviewedCount: fields.length };
}

/**
 * Reads each widget's printed label off the source binary.
 *
 * The census records what a field is called; this records what the form says
 * next to it. Both go to the binder, and either one can protect a field.
 */
function measureLabels(pdfDoc, census) {
  const linesByPage = pdfDoc.getPages().map((p) => groupIntoLines(extractTextItems(p)));
  return census.map((f) => {
    const w = f.widgets?.[0];
    if (!w?.rect) return { ...f, effectiveLabel: null, measuredLabel: null };
    const measured = measureWidgetLabel(w.rect, linesByPage[(w.page ?? 1) - 1] ?? []);
    return {
      ...f,
      measuredLabel: measured ? { text: measured.label, source: measured.source } : null,
      effectiveLabel: measured?.label ?? null
    };
  });
}

async function remediateAcroForm(family, log) {
  const pkgAbs = path.join(REPO, family.familyPackagePath);
  const record = readJson(path.join(pkgAbs, "source-record.json"));
  const census = readJson(path.join(pkgAbs, "field-census.json"));
  const src = readSourceBinary({ sha256: record.sha256, familyId: family.familyId, byteLength: record.byteLength });

  const probe = await PDFDocument.load(src.bytes, { ignoreEncryption: true, updateMetadata: false });
  const labelled = measureLabels(probe, census.fields ?? []);
  const labelsMeasured = labelled.filter((f) => f.effectiveLabel).length;
  const { allow, explicitMappings, reviewedCount } = reviewedBindingAllowlist(family);
  // Fields outside the reviewed binding set are dropped from the census, so the
  // binder is never asked about them and cannot answer "writable".
  const scoped = labelled.filter((f) => allow.has(f.name));
  const dropped = labelled.length - scoped.length;
  log(`  measured ${labelsMeasured}/${labelled.length} printed labels; ${reviewedCount} reviewed binding(s), ${dropped} field(s) outside the reviewed scope left untouched`);

  const results = {};
  for (const name of FIXTURE_NAMES) {
    const file = `fixtures/${name}-filled.pdf`;
    const target = path.join(pkgAbs, file);
    if (name === "negative" && !fs.existsSync(target) && !family.packageFiles?.includes(file)) {
      // A family whose package never carried a negative artifact does not gain
      // one here; the scope is the defect, not the shape of the package.
      continue;
    }
    const fixture = { name, file, ...fixtureFacts(pkgAbs, name) };
    const { bytes, report } = await finalizeOfficialForm({
      sourceBytes: src.bytes,
      expectedSha256: record.sha256,
      census: scoped,
      facts: fixture.facts,
      explicitMappings,
      captionOnly: record.documentOwnership === "court_issued_caption_only",
      documentAcceptsFill: record.documentOwnership !== "instructions_only",
      nonFilingNotice: record.nonFilingNoticeOnFace ?? null,
      title: `${record.jurisdiction} ${record.documentId} — ${fixture.name} fixture`
    });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    results[fixture.name] = { bytes, report, file: fixture.file, factsFrom: fixture.source };
    log(`  ${fixture.name} (${fixture.source}): wrote ${report.written.length}, refused ${report.refused.length}, withdrew ${(report.clippedWritesWithdrawn ?? []).length}`);
  }

  // The sheet is built from the finalized canonical artifact on disk, never
  // from an intermediate held in memory earlier in this function.
  const sheet = await buildContactSheet({
    blankBytes: src.bytes,
    finalizedBytes: fs.readFileSync(path.join(pkgAbs, "fixtures/canonical-filled.pdf")),
    expectedValues: results.canonical.report.expectedValues,
    artifactLabel: `${record.jurisdiction} ${record.documentId} contact sheet`,
    heading: `${record.jurisdiction} ${record.documentId} — blank (left) vs finalized fill (right)`
  });
  fs.mkdirSync(path.join(pkgAbs, "contact-sheet"), { recursive: true });
  fs.writeFileSync(path.join(pkgAbs, "contact-sheet/blank-vs-filled.pdf"), sheet.bytes);
  writeJson(path.join(pkgAbs, "contact-sheet/contact-sheet-proof.json"), {
    schemaVersion: "rcap-contact-sheet-proof/v3-d0v4",
    builtFrom: "fixtures/canonical-filled.pdf",
    builtFromSha256: sha256(fs.readFileSync(path.join(pkgAbs, "fixtures/canonical-filled.pdf"))),
    sheetSha256: sha256(sheet.bytes),
    ...sheet.proof
  });

  return { labelled, scoped, allow, reviewedCount, results, sheet, record, source: src };
}

/**
 * Builds anchors for a flat form from its own printed labels.
 *
 * Every anchor is a label token the decoder read whole, and its write box sits
 * to the right of that token. A label the decoder refused produces no anchor
 * and is recorded in the refusal ledger instead: an anchor placed against text
 * nobody could read is a guess about where a participant's data belongs on a
 * court form.
 */
// A caption is short and does not read as a sentence.
const MAX_CAPTION_CHARS = 48;
const SENTENCE_SHAPED = /[.;]\s|\b(shall|the court|hereby|is ordered|pursuant to)\b/i;
// A caption begins a thing; prose continues one. A token starting in lower case
// is the tail of a sentence that wrapped, and "state equivalents." is not a
// label for the participant's state however much it looks like one to a matcher.
const CONTINUES_PROSE = /^[a-z]/;
const isRuleToken = (s) => /^[\s_.·•\-–—]{3,}$/.test(String(s));
// A value needs somewhere to go, and the right margin bounds the last column.
const MIN_WRITE_WIDTH = 40;
const RIGHT_MARGIN = 54;

function buildFlatAnchors(pdfDoc, { captionOnly }) {
  const anchors = [];
  const refusals = [];
  const perPage = [];

  pdfDoc.getPages().forEach((page, i) => {
    const pageWidth = page.getWidth();
    const lines = groupIntoLines(extractTextItems(page));
    const part = partitionDecodableAnchors(lines);
    perPage.push({
      page: i + 1, lines: lines.length,
      readableLines: part.usableLines, unreadableLines: part.refusedLines,
      refusedByReason: part.refusedByReason
    });
    for (const r of part.refused) {
      refusals.push({ page: i + 1, ...r, consequence: "no anchor is placed against this line" });
    }

    for (const line of part.usable) {
      const tokens = assembleLabelTokens(line);
      for (let t = 0; t < tokens.length; t += 1) {
        const token = tokens[t];
        if (isRuleToken(token.text)) continue;

        // Two conditions make a token a label, and both are about the form's
        // own layout rather than about the words.
        //
        // It has to look like a caption: forms print captions short, and a
        // sixty-character clause is a sentence. Blake-006's body includes "The
        // defendant had actual notice of the motion for entry of this order",
        // which contains "defendant" and would otherwise bind the
        // participant's name into the middle of a court's decretal paragraph.
        //
        // And it has to be followed by somewhere to write: a run of
        // underscores on the same line is the form telling us where the value
        // goes. Without one there is no write box, only a guess about margins.
        const captionShaped = token.text.length <= MAX_CAPTION_CHARS
          && !SENTENCE_SHAPED.test(token.text)
          && !CONTINUES_PROSE.test(token.text);
        if (!captionShaped) continue;

        // Where the value goes. A run of underscores is the form saying so
        // outright; where the blank is drawn as a vector line instead -- which
        // is how both Blake orders draw theirs -- the space between this label
        // and the next thing on the line is the only measured answer, and it is
        // still measured rather than assumed.
        const rule = tokens[t + 1] && isRuleToken(tokens[t + 1].text) ? tokens[t + 1] : null;
        const next = tokens.slice(t + 1).find((n) => !isRuleToken(n.text));
        const gapStart = token.x2 + 4;
        const gapEnd = rule ? rule.x2 - 2 : (next ? next.x - 4 : pageWidth - RIGHT_MARGIN);
        const writeWidth = gapEnd - gapStart;
        if (writeWidth < MIN_WRITE_WIDTH) {
          refusals.push({
            page: i + 1, label: token.text, x: token.x, x2: token.x2, y: token.y,
            reason: "no_usable_write_area_beside_label", category: "geometry",
            availableWidth: Number(writeWidth.toFixed(1)),
            consequence: "label read, but the form leaves no room to write beside it"
          });
          continue;
        }

        const decision = decideBinding(
          { name: token.text, pdfType: "text", effectiveLabel: token.text },
          { captionOnly, availableChargeRows: 0 }
        );
        if (!decision.writable) {
          refusals.push({
            page: i + 1, label: token.text, x: token.x, x2: token.x2, y: token.y,
            reason: decision.reason, category: decision.category ?? null,
            consequence: "label read, binding refused"
          });
          continue;
        }
        // A court-issued order carries its caption on its first page. Anything
        // further in is the order's own text -- findings, decretal paragraphs,
        // the signature block -- and none of it is the participant's to fill.
        if (captionOnly && i > 0) {
          refusals.push({
            page: i + 1, label: token.text, y: token.y,
            reason: "caption_facts_appear_only_on_the_first_page_of_a_court_issued_order",
            category: "court",
            consequence: "label read and bindable, refused for being outside the caption block"
          });
          continue;
        }
        anchors.push({
          label: token.text, factId: decision.factId, page: i + 1, captionOnly,
          fontSize: Math.max(8, Math.min(11, token.size ?? 10)),
          labelBox: { x: token.x, x2: token.x2, y: token.y },
          // The rule line itself is the write box, inset so the value sits on
          // the rule rather than across its ends.
          writeBox: { x: gapStart, y: token.y, width: writeWidth, height: Math.max(10, (token.size ?? 10) + 2) },
          writeAreaBasis: rule ? "printed_rule_line" : "measured_gap_to_next_printed_token" 
        });
      }
    }
  });
  return { anchors, refusals, perPage };
}

async function remediateFlatOverlay(family, log) {
  const pkgAbs = path.join(REPO, family.familyPackagePath);
  const record = readJson(path.join(pkgAbs, "source-record.json"));
  const src = readSourceBinary({ sha256: record.sha256, familyId: family.familyId, byteLength: record.byteLength });
  const captionOnly = record.documentOwnership === "court_issued_caption_only";

  const probe = await PDFDocument.load(src.bytes, { ignoreEncryption: true, updateMetadata: false });
  const { allow, reviewedCount } = reviewedBindingAllowlist(family);
  const { anchors: allAnchors, refusals, perPage } = buildFlatAnchors(probe, { captionOnly });
  // The four Washington packages were reviewed with no bindings at all, because
  // the lane could not read their labels. An empty allowlist there would freeze
  // that failure in place, so a family the reviewer found *unbound* is the one
  // case where new anchors are the correction rather than a widening of it.
  const anchors = reviewedCount === 0 ? allAnchors : allAnchors.filter((a) => allow.has(a.label));
  const totalRefused = perPage.reduce((n, p) => n + p.unreadableLines, 0);
  log(`  ${anchors.length} anchor(s) from ${perPage.reduce((n, p) => n + p.readableLines, 0)} readable lines; ${totalRefused} line(s) refused by the decoder`);

  const results = {};
  for (const name of FIXTURE_NAMES.filter((n) => n !== "negative")) {
    const fixture = { name, ...fixtureFacts(pkgAbs, name) };
    const { bytes, report } = await finalizeFlatOverlay({
      sourceBytes: src.bytes,
      expectedSha256: record.sha256,
      anchors,
      facts: fixture.facts,
      nonFilingNotice: record.nonFilingNotice ?? null,
      title: `${record.jurisdiction} ${record.documentId} — ${fixture.name} fixture`
    });
    const target = path.join(pkgAbs, `fixtures/${fixture.name}-filled.pdf`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    results[fixture.name] = { bytes, report, file: `fixtures/${fixture.name}-filled.pdf`, factsFrom: fixture.source };
    log(`  ${fixture.name} (${fixture.source}): drew ${report.written.length}, refused ${report.refused.length}`);
  }

  const sheet = await buildContactSheet({
    blankBytes: src.bytes,
    finalizedBytes: fs.readFileSync(path.join(pkgAbs, "fixtures/canonical-filled.pdf")),
    expectedValues: results.canonical.report.expectedValues,
    artifactLabel: `${record.jurisdiction} ${record.documentId} contact sheet`,
    heading: `${record.jurisdiction} ${record.documentId} — blank (left) vs finalized fill (right)`
  });
  fs.mkdirSync(path.join(pkgAbs, "contact-sheet"), { recursive: true });
  fs.writeFileSync(path.join(pkgAbs, "contact-sheet/blank-vs-filled.pdf"), sheet.bytes);
  writeJson(path.join(pkgAbs, "contact-sheet/contact-sheet-proof.json"), {
    schemaVersion: "rcap-contact-sheet-proof/v3-d0v4",
    builtFrom: "fixtures/canonical-filled.pdf",
    builtFromSha256: sha256(fs.readFileSync(path.join(pkgAbs, "fixtures/canonical-filled.pdf"))),
    sheetSha256: sha256(sheet.bytes),
    ...sheet.proof
  });

  return { anchors, refusals, perPage, results, sheet, record, source: src };
}

// --- reports ----------------------------------------------------------------

function writeAcroFormReports(family, out) {
  const pkgAbs = path.join(REPO, family.familyPackagePath);
  const { labelled, results, record } = out;
  const canonical = results.canonical.report;
  const boundary = results.boundary?.report ?? null;

  writeJson(path.join(pkgAbs, "reports/populated-fields.json"), {
    schemaVersion: "rcap-populated-fields/v3-d0v4",
    canonicalWritten: canonical.written,
    boundaryWritten: boundary?.written ?? [],
    expectedValues: canonical.expectedValues
  });

  writeJson(path.join(pkgAbs, "reports/protected-fields.json"), {
    schemaVersion: "rcap-protected-fields/v3-d0v4",
    basis: "scripts/rcap-official-forms/rcap-field-semantics.mjs, applied to the field name and to the label the form prints beside the widget",
    protectedFields: canonical.protectedFields,
    refusals: canonical.refused
  });

  // Every fitting decision with the numbers behind it, so a disposition can be
  // checked rather than believed: required width, available width, the size
  // chosen, what was supplied, what is visible, and what was done about it.
  const fittingRows = [];
  for (const [fixtureName, r] of Object.entries(results)) {
    for (const v of r.report.writtenValueVerification ?? []) {
      fittingRows.push({
        fixture: fixtureName, field: v.field, factId: v.factId, page: v.page,
        selectedFontSize: v.selectedFontSize, availableWidth: v.availableWidth,
        suppliedChars: v.suppliedChars, renderedChars: v.drawnChars ?? 0,
        fittingOutcome: v.fittingOutcome, readbackOutcome: v.outcome,
        runsSelectedBy: v.selectedBy ?? null,
        overflowLeftPt: v.overflowLeftPt ?? 0, overflowRightPt: v.overflowRightPt ?? 0,
        disposition: v.outcome === "complete" ? "rendered_whole_inside_widget" : `withdrawn_${v.outcome}`
      });
    }
    for (const w of r.report.clippedWritesWithdrawn ?? []) {
      fittingRows.push({
        fixture: fixtureName, field: w.field, factId: w.factId ?? null,
        suppliedChars: w.expectedChars ?? null, renderedChars: w.drawnChars ?? null,
        readbackOutcome: w.outcome, reason: w.reason,
        overflowLeftPt: w.overflowLeftPt ?? 0, overflowRightPt: w.overflowRightPt ?? 0,
        widget: w.widget ?? null,
        disposition: "withdrawn_and_left_blank"
      });
    }
  }
  writeJson(path.join(pkgAbs, "reports/overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v4-d0v4",
    policy: "A value renders whole inside its own widget or the field is refused and left blank. The rendered appearance is read back and a clipped value is withdrawn, never filed.",
    boundaryFixtureApplied: Boolean(boundary),
    findings: fittingRows.filter((r) => r.disposition !== "rendered_whole_inside_widget"),
    allFittingDecisions: fittingRows
  });

  writeJson(path.join(pkgAbs, "reports/active-content.json"), {
    schemaVersion: "rcap-active-content/v3-d0v4",
    artifacts: Object.fromEntries(Object.entries(results).map(([k, r]) => [r.file, r.report.activeContentScan])),
    contactSheet: out.sheet.proof.activeContentScan
  });

  const map = readJson(path.join(pkgAbs, "production-field-map.json"));
  writeJson(path.join(pkgAbs, "production-field-map.json"), {
    ...map,
    factoryVersion: "d0-v4",
    bindingBasis: "typed fail-closed binder applied to the field name and to the printed label measured beside each widget; every field starts protected",
    measuredLabels: labelled
      .filter((f) => f.measuredLabel)
      .map((f) => ({ field: f.name, label: f.measuredLabel.text, source: f.measuredLabel.source })),
    bindings: canonical.written.map((w) => ({ field: w.field, factId: w.factId, kind: w.kind })),
    bindingRefusals: canonical.refused
  });

  return { canonical, boundary };
}

function writeFlatReports(family, out) {
  const pkgAbs = path.join(REPO, family.familyPackagePath);
  const { anchors, refusals, perPage, results, record } = out;
  const canonical = results.canonical.report;

  const profile = readJson(path.join(pkgAbs, "overlay-profile.json"));
  const totalRefusedLines = perPage.reduce((n, p) => n + p.unreadableLines, 0);
  writeJson(path.join(pkgAbs, "overlay-profile.json"), {
    ...profile,
    factoryVersion: "d0-v4",
    bindingBasis: "label tokens assembled from the decoded text layer, then passed through the typed fail-closed binder; a line the decoder refused yields no token and no anchor",
    anchorCapture: {
      basis: "text drawn by this exact sha256, read from the page content streams and assembled into label tokens",
      pages: perPage,
      // These two must agree with the decoder, because they are the decoder.
      totalUnreadableLines: totalRefusedLines,
      anchorCount: anchors.length,
      candidateLabelCount: anchors.length + refusals.filter((r) => r.label).length,
      anchors: anchors.map((a) => ({ label: a.label, factId: a.factId, page: a.page, labelBox: a.labelBox, writeBox: a.writeBox }))
    },
    bindings: canonical.written.map((w) => ({ anchor: w.anchor, factId: w.factId })),
    bindingRefusals: canonical.refused
  });

  // Every line and every label the lane declined to use, with the reason. A
  // refusal that is not written down is indistinguishable from a decision that
  // was never made.
  writeJson(path.join(pkgAbs, "reports/refusal-ledger.json"), {
    schemaVersion: "rcap-refusal-ledger/v1-d0v4",
    posture: "Every line the decoder could not read and every label the binder declined is recorded here. Undecodable geometry fails closed: no anchor is placed against a line that could not be read.",
    unreadableLines: totalRefusedLines,
    perPage,
    refusals
  });

  writeJson(path.join(pkgAbs, "reports/populated-fields.json"), {
    schemaVersion: "rcap-populated-fields/v3-d0v4",
    canonicalWritten: canonical.written,
    boundaryWritten: results.boundary?.report.written ?? [],
    expectedValues: canonical.expectedValues
  });
  writeJson(path.join(pkgAbs, "reports/protected-fields.json"), {
    schemaVersion: "rcap-protected-fields/v3-d0v4",
    basis: "scripts/rcap-official-forms/rcap-field-semantics.mjs, applied to every assembled label token",
    refusals: canonical.refused
  });
  writeJson(path.join(pkgAbs, "reports/overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v4-d0v4",
    policy: "A value renders whole inside its measured write box or the anchor is refused and nothing is drawn.",
    findings: Object.entries(results).flatMap(([fixture, r]) => (r.report.unfittable ?? []).map((u) => ({ fixture, ...u }))),
    allFittingDecisions: Object.entries(results).flatMap(([fixture, r]) => (r.report.written ?? []).map((w) => ({
      fixture, anchor: w.anchor, factId: w.factId, selectedFontSize: w.fontSize, fittingOutcome: w.outcome
    })))
  });
  writeJson(path.join(pkgAbs, "reports/active-content.json"), {
    schemaVersion: "rcap-active-content/v3-d0v4",
    artifacts: Object.fromEntries(Object.entries(results).map(([k, r]) => [r.file, r.report.activeContentScan])),
    contactSheet: out.sheet.proof.activeContentScan
  });
}

function writeManifest(family, out) {
  const pkgAbs = path.join(REPO, family.familyPackagePath);
  const files = [
    ...Object.values(out.results).map((r) => r.file),
    "contact-sheet/blank-vs-filled.pdf"
  ];
  const artifacts = {};
  for (const rel of files) {
    const abs = path.join(pkgAbs, rel);
    if (!fs.existsSync(abs)) continue;
    const bytes = fs.readFileSync(abs);
    artifacts[rel] = { sha256: sha256(bytes), bytes: bytes.length };
  }
  writeJson(path.join(pkgAbs, "reports/rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v3-d0v4",
    sourceSha256: out.record.sha256,
    renderer: "scripts/rcap-official-forms/d-v4-remediate-families.mjs",
    factoryVersion: "d0-v4",
    reproducible: "Creation and modification dates are pinned, so re-rendering from the same source binary reproduces these digests byte for byte.",
    generatedDuringV4Remediation: true,
    artifacts
  });
  return artifacts;
}

// --- main -------------------------------------------------------------------

const requested = process.argv.slice(2);
const families = inputs.families.filter((f) => requested.length === 0 || requested.includes(f.familyId));
if (requested.length > 0 && families.length !== requested.length) {
  const known = new Set(inputs.families.map((f) => f.familyId));
  const unknown = requested.filter((r) => !known.has(r));
  throw new Error(`refusing to run: ${unknown.join(", ")} is not one of the eight open families`);
}

const summary = [];
for (const family of families) {
  console.log(`\n=== ${family.familyId} (${family.renderStrategy ?? "acroform_fill"}) ===`);
  const log = (m) => console.log(m);
  const flat = family.renderStrategy === "flat_overlay_anchor_draw";
  const out = flat ? await remediateFlatOverlay(family, log) : await remediateAcroForm(family, log);
  if (flat) writeFlatReports(family, out); else writeAcroFormReports(family, out);
  const artifacts = writeManifest(family, out);

  summary.push({
    familyId: family.familyId,
    renderStrategy: flat ? "flat_overlay_anchor_draw" : "acroform_fill",
    sourceSha256: out.record.sha256,
    artifacts,
    written: out.results.canonical.report.written.length,
    refused: out.results.canonical.report.refused.length,
    withdrawn: Object.values(out.results).reduce((n, r) => n + (r.report.clippedWritesWithdrawn ?? []).length, 0),
    unreadableLines: flat ? out.perPage.reduce((n, p) => n + p.unreadableLines, 0) : null,
    anchors: flat ? out.anchors.length : null,
    measuredLabels: flat ? null : out.labelled.filter((f) => f.effectiveLabel).length
  });
  console.log(`  artifacts: ${Object.keys(artifacts).length}`);
}

writeJson(path.join(OUT, "remediation-summary.json"), {
  schema: "rcap-d-v4-remediation/v1",
  canonicalControlPlaneBase: inputs.canonicalControlPlaneBase,
  factoryVersion: "d0-v4",
  familiesRemediated: summary.length,
  families: summary
});
console.log(`\nremediated ${summary.length} family package(s)`);
