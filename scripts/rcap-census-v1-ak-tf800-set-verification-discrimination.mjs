#!/usr/bin/env node
// Does this family's verification actually CATCH anything?
//
//   node scripts/rcap-census-v1-ak-tf800-set-verification-discrimination.mjs
//
// The predecessor on this family proved its SOURCE GATE discriminated before
// recording a refusal, on the principle that a gate which always says no proves
// nothing about the thing it refused. The same argument runs the other way for
// a build that goes green: a check that cannot fail is not a check, and
// "0 findings" from a blind verifier looks exactly like "0 findings" from a
// clean artifact.
//
// So this exercises the three questions the build asks of the artifact bytes,
// against deliberately defective renders, and records which of them fire. It
// writes reports/verification-discrimination.json and exits non-zero if any
// proof fails to behave.
//
// It renders to a scratch directory. Nothing it produces is committed, no
// source binary is written anywhere, and the shipped fixtures are not touched.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, PDFName, PDFRawStream } = require("pdf-lib");
const zlib = require("node:zlib");

const OUT = "data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const REL = "STATES/AK/02_PACKET_FORMS/AK__FORM__TF-800__request-to-make-case-records-confidential-or-sealed-under-administrative-rule-37-6__REV-2025-05__EN.pdf";
const SHA = "94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd";

// The role refusals the shipped map makes. Kept in step with
// scripts/build-census-v1-ak-tf800-set.mjs; the check below fails loudly if
// they drift apart, so this proof can never be about a map that is not shipping.
const SHIPPED_REFUSALS = [
  "caseName", "partyNames", "documents", "dateHearing", "audioRecording", "transcript",
  "confidentialBecause", "Group1", "Check Box1", "Check Box2", "Check Box3", "Check Box4",
  "Check Box5", "certDate", "time2", "mail", "hd", "tf", "emailCB", "needText1", "signature0"
];
const NAME_MAY_APPEAR_IN = new Set(["name"]);
const FACTS = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17", "matter.county": "Example County",
  "matter.court": "District Court", "matter.case_number": "3AN-24-01234CI",
  "deterministic.filing_date": "2026-08-12", "matter.charges": []
};
const NAME_TOKENS = ["Jordan Avery Reyes", "Jordan", "Avery", "Reyes"];
const HARD_BLANK = /signature|^time2$|^certdate$|^needtext1$|^mail$|^hd$|^tf$|^emailcb$/i;

const inflate = (b) => { try { return zlib.inflateSync(b); } catch { return b; } };
const fail = (m) => { console.error(`verification-discrimination: ${m}`); process.exit(1); };

// selectionMarkIn, kept identical to the build's. Duplicated deliberately: if
// the two ever diverge, the shipped detector is no longer the proven one, and
// the equivalence check below catches that.
function selectionMarkIn(streamSource) {
  const text = String(streamSource ?? "");
  if (/\bT[jJ]\b/.test(text)) return { marked: true, basis: "text_showing_operator_in_a_control_appearance" };
  const toks = text.match(/[-\d.]+|[A-Za-z*'"]+/g) ?? [];
  let stand = []; let pts = []; let sawDiagonal = false;
  for (const t of toks) {
    if (/^-?[\d.]+$/.test(t)) { stand.push(t); continue; }
    const n = (k) => +stand[stand.length - k];
    if (t === "m") pts = [[n(2), n(1)]];
    else if (t === "l" && pts.length) {
      const [px, py] = pts[pts.length - 1]; const [x, y] = [n(2), n(1)];
      if (Math.abs(x - px) > 0.01 && Math.abs(y - py) > 0.01) sawDiagonal = true;
      pts.push([x, y]);
    } else if (/^(S|s|B|B\*|b|b\*|f|F|f\*|n)$/.test(t)) pts = [];
    stand = [];
  }
  return sawDiagonal
    ? { marked: true, basis: "stroked_diagonal_segment_in_a_control_appearance" }
    : { marked: false, basis: "border_geometry_only" };
}

const fieldType = (f) => f instanceof PDFTextField ? "text" : f instanceof PDFCheckBox ? "checkbox"
  : f instanceof PDFRadioGroup ? "radio" : f instanceof PDFDropdown ? "dropdown"
    : f instanceof PDFOptionList ? "optionlist" : "other";

async function buildCensus(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const linesByPage = pages.map((p) => groupIntoLines(extractTextItems(p)));
  const documentTextLines = linesByPage.flat().map((l) => normalizeHarvestedText(l.text));
  const forCapture = new Map();
  const fields = pdf.getForm().getFields().map((f) => {
    const name = f.getName();
    const widgets = f.acroField.getWidgets().map((w, i) => {
      const r = w.getRectangle(); const ref = w.P?.(); let page = 1;
      pages.forEach((p, j) => { if (p.ref === ref) page = j + 1; });
      return { index: i, page, rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) } };
    });
    for (const w of widgets) { if (!forCapture.has(w.page)) forCapture.set(w.page, []); forCapture.get(w.page).push({ name, rect: w.rect }); }
    return { name, type: fieldType(f), widgets };
  });
  const ctxm = new Map();
  pages.forEach((page, i) => {
    const list = forCapture.get(i + 1) ?? []; if (!list.length) return;
    for (const c of captureWidgetContext(page, list, { precomputedLines: linesByPage[i], isFirstPage: i === 0 })) {
      if (!ctxm.has(c.name)) ctxm.set(c.name, c);
    }
  });
  return {
    documentTextLines,
    fields: fields.map((f) => {
      const c = ctxm.get(f.name) ?? {};
      return { name: f.name, type: f.type, effectiveLabel: c.effectiveLabel ?? null, regionHeading: c.regionHeading ?? null, widgets: f.widgets };
    })
  };
}

/** The three questions the build asks of an artifact, asked here identically. */
async function interrogate(file, census) {
  const drawn = await flattenedWidgets(file);
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const findings = [];

  for (const f of census.fields.filter((x) => HARD_BLANK.test(x.name))) {
    for (const w of f.widgets) {
      const t = drawnAt(drawn, { page: w.page, rect: w.rect, tolerance: 3 }).map((d) => d.text).join(" ").trim();
      if (t !== "") findings.push({ check: "signature_date_or_service_field_is_not_blank", field: f.name, page: w.page, drawnText: t });
    }
  }
  for (const ap of drawn) {
    const text = String(ap.text ?? "").trim(); if (!text) continue;
    const hit = NAME_TOKENS.filter((t) => text.toLowerCase().includes(t.toLowerCase())); if (!hit.length) continue;
    const owner = census.fields.find((f) => f.widgets.some((w) =>
      w.page === ap.page && Math.abs(w.rect.x - ap.x) <= 3 && Math.abs(w.rect.y - ap.y) <= 3));
    const name = owner?.name ?? null;
    const incidentalOk = name === "email" && text === FACTS["participant.email"];
    if (!NAME_MAY_APPEAR_IN.has(name) && !incidentalOk) {
      findings.push({ check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank", field: name, page: ap.page, drawnText: text });
    }
  }
  for (const ap of drawn) {
    if (ap.page === 1) continue;
    const text = String(ap.text ?? "").trim(); if (!text) continue;
    const owner = census.fields.find((f) => f.widgets.some((w) =>
      w.page === ap.page && Math.abs(w.rect.x - ap.x) <= 3 && Math.abs(w.rect.y - ap.y) <= 3));
    if (owner?.name !== "caseNo") {
      findings.push({ check: "ink_on_a_court_page_outside_the_case_number_header", field: owner?.name ?? null, page: ap.page, drawnText: text });
    }
  }
  for (const f of census.fields.filter((x) => x.type === "checkbox" || x.type === "radio")) {
    for (const w of f.widgets) {
      const ctx = doc.context; const pageNode = doc.getPages()[w.page - 1];
      const res = pageNode.node.get(PDFName.of("Resources"));
      const xo = res && ctx.lookup(res).get(PDFName.of("XObject"));
      if (!xo) continue;
      const dict = ctx.lookup(xo);
      const contents = pageNode.node.get(PDFName.of("Contents"));
      const refs = contents?.asArray ? contents.asArray() : contents ? [contents] : [];
      let stream = "";
      for (const r of refs) { try { stream += inflate(Buffer.from(ctx.lookup(r).contents)).toString("latin1"); } catch { /* not a stream */ } }
      const placement = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/(\S+)\s+Do/g;
      let match;
      while ((match = placement.exec(stream))) {
        let ax = 0, ay = 0;
        for (const cm of match[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)) { ax += Number(cm[5]); ay += Number(cm[6]); }
        if (Math.abs(ax - w.rect.x) > 3 || Math.abs(ay - w.rect.y) > 3) continue;
        const key = PDFName.of(match[2]); if (!dict.has(key)) continue;
        const obj = ctx.lookup(dict.get(key)); if (!(obj instanceof PDFRawStream)) continue;
        const mark = selectionMarkIn(inflate(Buffer.from(obj.contents)).toString("latin1"));
        if (mark.marked) findings.push({ check: "a_control_this_family_refuses_carries_a_selection_mark", field: f.name, page: w.page, basis: mark.basis });
      }
    }
  }
  return findings;
}

async function main() {
  // The shipped map must be the map under test.
  const buildSrc = fs.readFileSync(path.join(rootDir, "scripts/build-census-v1-ak-tf800-set.mjs"), "utf8");
  const shippedInBuild = [...buildSrc.matchAll(/\{\s*field:\s*"([^"]+)"\s*,\s*class:/g)].map((m) => m[1]);
  const drift = [
    ...SHIPPED_REFUSALS.filter((f) => !shippedInBuild.includes(f)),
    ...shippedInBuild.filter((f) => !SHIPPED_REFUSALS.includes(f))
  ];
  if (drift.length) fail(`this proof and the shipped map disagree about the role refusals: ${drift.join(", ")}`);

  const abs = path.join(rootDir, CORPUS_ROOT, REL);
  if (!fs.existsSync(abs)) fail(`source not mounted at ${CORPUS_ROOT}/${REL} — run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
  const bytes = fs.readFileSync(abs);
  const census = await buildCensus(bytes);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ak-tf800-discrimination-"));

  const render = async (label, refusals) => {
    const res = await finalizeOfficialForm({
      sourceBytes: bytes, expectedSha256: SHA, census: census.fields, facts: FACTS,
      explicitMappings: {}, unwritableFields: refusals.map((f) => ({ field: f, class: "probe" })),
      captionOnly: false, documentTextLines: census.documentTextLines, title: "discrimination probe"
    });
    const file = path.join(tmp, `${label.replace(/\W+/g, "-")}.pdf`);
    fs.writeFileSync(file, res.bytes);
    return { file, written: res.report.written.map((w) => w.field) };
  };

  const results = { baseline: null, droppedRoleRefusals: [], injectedInk: null, detectorUnitCases: [] };

  // --- 1. baseline: the shipped map must come back clean ---------------------
  const base = await render("baseline", SHIPPED_REFUSALS);
  const baseFindings = await interrogate(base.file, census);
  results.baseline = { fieldsWritten: base.written, findings: baseFindings.length, detail: baseFindings };
  if (baseFindings.length) fail(`the shipped map does not verify clean: ${JSON.stringify(baseFindings)}`);

  // --- 2. drop one role refusal at a time -----------------------------------
  //
  // A drop that writes nothing is not a failure of the check: it means the
  // SHARED rules refuse the field independently, which is the defence in depth
  // this family claims. The two outcomes are recorded distinctly.
  for (const target of SHIPPED_REFUSALS) {
    const r = await render(`drop-${target}`, SHIPPED_REFUSALS.filter((f) => f !== target));
    const findings = await interrogate(r.file, census);
    const nowWritten = r.written.includes(target);
    results.droppedRoleRefusals.push({
      roleRefusalDropped: target,
      theFieldWasThenWritten: nowWritten,
      findingsRaised: findings.length,
      outcome: nowWritten && findings.length > 0 ? "CAUGHT — the field was written and the artifact check fired"
        : nowWritten && findings.length === 0 ? "NOT CAUGHT — the field was written and nothing fired"
          : "HELD BY THE SHARED RULES — dropping this family's refusal wrote nothing, because the shared binder refuses it too",
      findings
    });
  }

  // --- 3. positive control: ink placed directly, bypassing both channels -----
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const injected = { certDate: "2026-08-12", time2: "9:00 am", needText1: "Jordan Avery Reyes", signature0: "Jordan Avery Reyes" };
  for (const [n, v] of Object.entries(injected)) { const f = form.getField(n); if (f instanceof PDFTextField) f.setText(v); }
  form.getCheckBox("emailCB").check();
  form.getRadioGroup("Group1").select("Choice1");
  form.flatten();
  const injectedFile = path.join(tmp, "injected.pdf");
  fs.writeFileSync(injectedFile, await doc.save({ useObjectStreams: false, updateMetadata: false }));
  const injectedFindings = await interrogate(injectedFile, census);
  results.injectedInk = {
    why: "Dropping a role refusal on a field the shared rules also refuse writes nothing, which leaves those "
      + "checks unexercised. Here the ink is placed into the boxes DIRECTLY, bypassing the role refusals AND "
      + "the shared binder, so the checks have something to find.",
    injectedInto: { text: Object.keys(injected), checkbox: ["emailCB"], radio: ["Group1=Choice1"] },
    findingsRaised: injectedFindings.length,
    checksThatFired: [...new Set(injectedFindings.map((f) => f.check))],
    findings: injectedFindings
  };
  if (injectedFindings.length === 0) fail("the checks are blind: injected ink raised nothing");
  const fired = new Set(injectedFindings.map((f) => f.check));
  for (const required of [
    "signature_date_or_service_field_is_not_blank",
    "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
    "ink_on_a_court_page_outside_the_case_number_header",
    "a_control_this_family_refuses_carries_a_selection_mark"
  ]) if (!fired.has(required)) fail(`injected ink did not trip ${required}`);

  // --- 4. the selection-mark detector, on known streams ----------------------
  const cases = [
    ["TF-800's own selected state — the stroked X every control on this form uses",
      "q\n1 1 9.52 9.52 re\nW\nn\n2 9.52 m\n9.52 2 l\n9.52 9.52 m\n2 2 l\ns\nQ\n", true],
    ["an unselected checkbox border, axis-aligned",
      "q\n0 0 0 RG\n0 w\n0 0 m\n0 11.51 l\n11.51 11.51 l\n11.51 0 l\n0 0 l\nS\nQ\n", false],
    ["pdf-lib's synthesised RADIO border: a stroked circle of four Beziers. This is the false positive that "
      + "withdrew an earlier `curve operator means selected` rule — it reported both Group1 widgets as selected "
      + "in a clean render. A ring is a border, not a mark.",
      "q\n0 0 0 RG\n0 w\n0 5.76 m\n0 2.57 2.57 0 5.76 0 c\n8.94 0 11.52 2.57 11.52 5.76 c\n11.52 8.94 8.94 11.52 5.76 11.52 c\n2.57 11.52 0 8.94 0 5.76 c\nS\nQ\n", false],
    ["an empty appearance", "q Q ", false],
    ["a ZapfDingbats glyph mark, the other way a form draws a tick", "/ZaDb 9 Tf BT (4) Tj ET", true]
  ];
  for (const [label, stream, expected] of cases) {
    const got = selectionMarkIn(stream);
    results.detectorUnitCases.push({ case: label, expectedMarked: expected, observedMarked: got.marked, basis: got.basis, pass: got.marked === expected });
    if (got.marked !== expected) fail(`selection-mark detector wrong on: ${label}`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });

  const caught = results.droppedRoleRefusals.filter((r) => r.outcome.startsWith("CAUGHT"));
  const held = results.droppedRoleRefusals.filter((r) => r.outcome.startsWith("HELD"));
  const missed = results.droppedRoleRefusals.filter((r) => r.outcome.startsWith("NOT CAUGHT"));

  fs.mkdirSync(path.join(rootDir, `${OUT}/reports`), { recursive: true });
  fs.writeFileSync(path.join(rootDir, `${OUT}/reports/verification-discrimination.json`),
    `${JSON.stringify({
      schemaVersion: "rcap-verification-discrimination/v1",
      familyId: "ak-tf800-set",
      producedBy: "scripts/rcap-census-v1-ak-tf800-set-verification-discrimination.mjs",
      question:
        "This family's build reports zero findings. Is that because the artifacts are clean, or because the "
        + "checks cannot fail?",
      why:
        "The predecessor on this family proved its SOURCE GATE discriminated before recording a refusal, on the "
        + "principle that a gate which always says no proves nothing. The same argument runs the other way for a "
        + "build that goes green: '0 findings' from a blind verifier is indistinguishable from '0 findings' from "
        + "a clean artifact unless the verifier is shown to fail on a defect.",
      method:
        "Three probes, all rendered from the pinned source bytes into a scratch directory and thrown away. "
        + "(1) The shipped map must verify clean. (2) Each role refusal is dropped in turn and the same "
        + "questions are re-asked. (3) Ink is injected directly into the hard-blank fields and controls, "
        + "bypassing both the role refusals and the shared binder, so checks that had nothing to find are given "
        + "something. Plus the selection-mark detector against known appearance streams.",
      readingTheDroppedRefusalResults:
        "Dropping a role refusal and seeing NOTHING written is not a hole. It means the shared rules in "
        + "rcap-field-semantics.mjs refuse that field independently of this family's classification — which is "
        + "the defence in depth this family claims, and probe 3 is what exercises those checks instead. The "
        + "rows that matter are the ones where dropping this family's refusal DOES write the field: those are "
        + "the fields nothing but this map protects.",
      summary: {
        baselineFindings: results.baseline.findings,
        roleRefusalsDropped: results.droppedRoleRefusals.length,
        droppedAndCaught: caught.length,
        droppedAndHeldByTheSharedRules: held.length,
        droppedAndMissed: missed.length,
        fieldsOnlyThisMapProtects: caught.map((r) => r.roleRefusalDropped),
        injectedInkFindings: results.injectedInk.findingsRaised,
        checksProvenToFire: results.injectedInk.checksThatFired,
        detectorUnitCasesPassed: `${results.detectorUnitCases.filter((c) => c.pass).length}/${results.detectorUnitCases.length}`
      },
      verdict: missed.length === 0 && results.baseline.findings === 0 && results.injectedInk.findingsRaised > 0
        ? "THE VERIFICATION DISCRIMINATES. The shipped map verifies clean; every field that only this map "
          + "protects is caught when its refusal is dropped; and all four artifact checks fire on injected ink."
        : "DEFECTIVE — see the rows below.",
      ...results
    }, null, 2)}\n`);

  console.log(`baseline findings: ${results.baseline.findings} (must be 0)`);
  console.log(`role refusals dropped: ${results.droppedRoleRefusals.length}`
    + `  caught=${caught.length}  held-by-shared-rules=${held.length}  missed=${missed.length}`);
  console.log(`  fields only this map protects: ${caught.map((r) => r.roleRefusalDropped).join(", ") || "(none)"}`);
  console.log(`injected ink: ${results.injectedInk.findingsRaised} finding(s) across ${results.injectedInk.checksThatFired.length} check(s)`);
  console.log(`selection-mark detector: ${results.detectorUnitCases.filter((c) => c.pass).length}/${results.detectorUnitCases.length} cases`);
  if (missed.length) { for (const m of missed) console.error(`  MISSED ${m.roleRefusalDropped}`); process.exit(1); }
  console.log("\nVERIFICATION_DISCRIMINATES");
}

await main();
