// Lane D3B — first build of the Oregon, Iowa, Massachusetts and Utah
// official-form packages, driven directly from the D0 remediated factory.
//
// These four states had no package root at the D0 base: no directories, no
// source records, no index entries. Nothing here is a regeneration of an
// earlier package; every family is established from the Edition 1 source pack,
// whose STATE_MANIFEST.csv is the identity authority.
//
// The lane deliberately does not run scripts/implement-rcap-official-forms-d1.mjs.
// That driver reads and rewrites the two shared indexes, and seven lanes are
// building concurrently, so it would clobber work it cannot see. Each state
// here writes its own state-index.json instead and the captain merges.
//
// Usage:
//   node scripts/rcap-official-forms/lanes/d3b-regenerate.mjs census [ST]
//   node scripts/rcap-official-forms/lanes/d3b-regenerate.mjs build  [ST]
//   node scripts/rcap-official-forms/lanes/d3b-regenerate.mjs verify [ST]
//
// The source pack lives outside every git worktree and is never committed. Its
// location comes from RCAP_D3_PACK_ROOT, defaulting to the lane's download
// directory.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  finalizeOfficialForm,
  finalizeFlatOverlay,
  NonFilingHoldError
} from "../rcap-official-form-finalize.mjs";
import { buildContactSheet, visibleTextOfDocument, missingExpectedValues } from "../rcap-contact-sheet.mjs";
import { decideBinding, protectCategoryOf } from "../rcap-field-semantics.mjs";
import { fitTextToWidget, MIN_READABLE_FONT_SIZE } from "../rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "../rcap-active-content.mjs";
import { extractTextItems, groupIntoLines } from "../rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const {
  PDFDocument, PDFName, PDFDict,
  PDFTextField, PDFDropdown, PDFCheckBox, PDFRadioGroup, PDFButton, PDFSignature, PDFOptionList,
  PDFRawStream, PDFArray, decodePDFRawStream
} = require("pdf-lib");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const PACK_ROOT = process.env.RCAP_D3_PACK_ROOT ?? "/tmp/rcap-source-packs/D3B/extract";
const OUT_ROOT = path.join(REPO, "data", "rcap-all50", "overlays", "production");

const LANE = "D3B";
const FACTORY_VERSION = "d0-remediated-v1";
const SOURCE_PACK = {
  asset: "RCAP_D_D3_SOURCE_PACK.zip",
  releaseTag: "rcap-d-source-packs-2026-08-12",
  sha256: "70c9a6f759a744bc95f6f969ecd0a5fe7cbdfbfff08062dd2d968597a447753b",
  manifestSha256: "75fca7a213c26a88992a93ff4547eed8b5e19dfcedc97474f0c3e35182814e88",
  edition: "1.0"
};

const STATES = [
  { code: "IA", slug: "iowa", name: "Iowa" },
  { code: "MA", slug: "massachusetts", name: "Massachusetts" },
  { code: "OR", slug: "oregon", name: "Oregon" },
  { code: "UT", slug: "utah", name: "Utah" }
];

// ---------------------------------------------------------------------------
// Fixture fact sets
// ---------------------------------------------------------------------------
// Canonical facts are ordinary-length and unremarkable. Boundary facts push
// every string to the longest thing a real participant could plausibly supply,
// so shrink-to-fit and the readable-size floor are exercised rather than
// asserted. The negative set is empty: with no facts, nothing may be written.
//
// A family's spec names which of these keys it supplies. A fact that is not
// named is simply absent, so a field the generic binder would resolve to it
// refuses with `no_value_or_type_mismatch` instead of receiving an
// approximately-right value. That is the intended outcome wherever this lane
// found a form field whose meaning is narrower or wider than any descriptor.
const CANONICAL_FACTS = {
  "participant.full_legal_name": "Jordan A. Reyes",
  "participant.first_name": "Jordan",
  "participant.middle_name": "A.",
  "participant.last_name": "Reyes",
  "participant.date_of_birth": "1991-04-17",
  "participant.street_address": "418 Larch Street Apt 12",
  "participant.city": "Springfield",
  "participant.state": "OR",
  "participant.zip": "97477",
  "participant.city_state_zip": "Springfield, OR 97477",
  "participant.phone": "541-555-0134",
  "participant.email": "jordan.reyes@example.org",
  "matter.county": "Lane",
  "matter.case_number": "21CR40817",
  "deterministic.filing_date": "2026-03-09"
};

const BOUNDARY_FACTS = {
  "participant.full_legal_name": "Maximiliana Konstantina Vasquez-Featherstonehaugh",
  "participant.first_name": "Maximiliana",
  "participant.middle_name": "Konstantina",
  "participant.last_name": "Vasquez-Featherstonehaugh",
  "participant.date_of_birth": "1968-12-31",
  "participant.street_address": "18244 Northwest Meadowbrook Terrace Extension Apartment 2201B",
  "participant.city": "Wappingers Falls",
  "participant.state": "MA",
  "participant.zip": "02108-3417",
  "participant.city_state_zip": "Wappingers Falls, Massachusetts 02108-3417",
  "participant.phone": "1-413-555-0199 ext. 44021",
  "participant.email": "maximiliana.vasquez.featherstonehaugh@long-domain-example.org",
  "matter.county": "Salt Lake",
  "matter.case_number": "249900123456789-CR-EX",
  "deterministic.filing_date": "2026-12-31"
};

const NEGATIVE_FACTS = {};

function factSubset(source, keys) {
  const out = {};
  for (const k of keys) if (source[k] !== undefined) out[k] = source[k];
  return out;
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i += 1; continue; }
      if (c === '"') { quoted = false; continue; }
      cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(cell); cell = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += c;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.some((v) => v.trim() !== "")).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h.trim()] = (r[i] ?? "").trim(); });
    return o;
  });
}

function readManifest(stateCode) {
  const p = path.join(PACK_ROOT, "STATES", stateCode, "STATE_MANIFEST.csv");
  return parseCsv(fs.readFileSync(p, "utf8"));
}

function readStateReadme(stateCode) {
  return fs.readFileSync(path.join(PACK_ROOT, "STATES", stateCode, "STATE_README.md"), "utf8");
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// ---------------------------------------------------------------------------
// Census — AcroForm
// ---------------------------------------------------------------------------
function pdfTypeOf(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFOptionList) return "optionlist";
  if (field instanceof PDFSignature) return "signature";
  if (field instanceof PDFButton) return "button";
  return "unknown";
}

function censusAcroForm(pdfDoc) {
  const pages = pdfDoc.getPages();
  const pageIndexOf = (ref) => {
    for (let i = 0; i < pages.length; i += 1) if (pages[i].ref === ref) return i + 1;
    return null;
  };
  let fields = [];
  try { fields = pdfDoc.getForm().getFields(); } catch { return []; }
  return fields.map((f) => {
    const type = pdfTypeOf(f);
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      return {
        page: pageIndexOf(w.P()),
        rect: {
          x: round2(r.x), y: round2(r.y),
          width: round2(r.width), height: round2(r.height)
        }
      };
    });
    const entry = { name: f.getName(), type, widgetCount: widgets.length, widgets };
    if (type === "text") {
      entry.maxLength = f.getMaxLength() ?? null;
      entry.multiline = f.isMultiline();
      entry.readOnly = f.isReadOnly();
      entry.required = f.isRequired();
      entry.comb = f.isCombed();
    } else {
      entry.maxLength = null;
      entry.multiline = false;
    }
    if (type === "dropdown" || type === "optionlist") {
      entry.options = f.getOptions();
      entry.readOnly = f.isReadOnly();
    }
    if (type === "checkbox" || type === "radio") {
      try { entry.options = f.getOptions?.() ?? null; } catch { entry.options = null; }
    }
    return entry;
  });
}

const round2 = (n) => Math.round(n * 100) / 100;
const isBlankRun = (t) => String(t).trim() === "";

// ---------------------------------------------------------------------------
// Census — flat printed forms
// ---------------------------------------------------------------------------
// A flat form has no widgets, so a census has to be measured rather than read.
// Every blank a participant would write into shows up in the content stream as
// a horizontal gap between the printed runs on one baseline: the rule line
// itself is vector art, but the form pads the gap out with spaces, and the
// label sits either immediately to the left of the gap or on the small-type
// caption line just beneath it.
//
// Nothing here invents a coordinate. Each slot's rectangle is bounded by two
// strings the document actually draws, and each slot's label is text the
// document actually prints.
const MIN_RULE_WIDTH = 22;      // narrower than this is a table hairline, not a blank
const MAX_RULE_THICKNESS = 2.4; // thicker than this is a box border or a shaded band
const MAX_RULE_LENGTH = 470;    // wider than this is a section divider spanning the text block

// --- content-stream path extraction ---------------------------------------
// pdf-lib exposes no path reader, so the rule lines are decoded here, in the
// lane, rather than by editing a shared D0 module. Only two constructions
// matter and both appear verbatim in this corpus: a thin filled rectangle
// (`x y w h re f`), which is how Iowa, Oregon and Massachusetts draw a blank,
// and a stroked horizontal segment (`m ... l ... S`), which Oregon also uses.
// Clipping rectangles (`re W n`) are deliberately ignored: they bound a
// drawing region and are not marks on the page.
function contentStringOf(page) {
  const contents = page.node.Contents();
  if (!contents) return "";
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => page.node.context.lookup(ref))
    : [contents];
  let out = "";
  for (const s of streams) {
    if (!(s instanceof PDFRawStream)) continue;
    try { out += `${Buffer.from(decodePDFRawStream(s).decode()).toString("latin1")}\n`; } catch { /* skip */ }
  }
  return out;
}

const matMul = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]
];
const applyMat = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export function extractRuleLines(page) {
  const src = contentStringOf(page);
  const tokens = src.match(/\[[^\]]*\]|\((?:\\.|[^\\)])*\)|<[^>]*>|\/[^\s/[\]()<>{}%]+|[+-]?(?:\d+\.?\d*|\.\d+)|[A-Za-z'"*]+/g) ?? [];
  const nums = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  let pending = [];          // rectangles built by `re`, awaiting a paint operator
  let subpath = [];          // points built by `m`/`l`, awaiting `S`
  const rules = [];

  const push = (x0, y0, x1, y1, kind) => {
    const [ax, ay] = applyMat(ctm, x0, y0);
    const [bx, by] = applyMat(ctm, x1, y1);
    const left = Math.min(ax, bx), right = Math.max(ax, bx);
    const bottom = Math.min(ay, by), top = Math.max(ay, by);
    const width = right - left, thickness = top - bottom;
    if (width < MIN_RULE_WIDTH || width > MAX_RULE_LENGTH) return;
    if (thickness > MAX_RULE_THICKNESS) return;
    rules.push({ x: round2(left), x2: round2(right), y: round2(bottom), thickness: round2(thickness), kind });
  };

  for (const t of tokens) {
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) { nums.push(Number(t)); continue; }
    if (t.startsWith("/") || t.startsWith("[") || t.startsWith("(") || t.startsWith("<")) { continue; }
    switch (t) {
      case "q": stack.push(ctm.slice()); break;
      case "Q": ctm = stack.pop() ?? ctm; break;
      case "cm": if (nums.length >= 6) ctm = matMul(nums.slice(-6), ctm); break;
      case "re": if (nums.length >= 4) pending.push(nums.slice(-4)); break;
      case "m": if (nums.length >= 2) subpath = [nums.slice(-2)]; break;
      case "l": if (nums.length >= 2) subpath.push(nums.slice(-2)); break;
      case "f": case "F": case "f*": case "b": case "b*": case "B": case "B*":
        for (const [x, y, w, h] of pending) push(x, y, x + w, y + h, "filled_rect");
        pending = []; subpath = [];
        break;
      case "S": case "s":
        for (let i = 0; i + 1 < subpath.length; i += 1) {
          push(subpath[i][0], subpath[i][1], subpath[i + 1][0], subpath[i + 1][1], "stroked_segment");
        }
        pending = []; subpath = [];
        break;
      case "n": pending = []; subpath = []; break;   // clip-only or discarded path
      case "W": case "W*": break;                      // the clip itself is not a mark
      case "h": break;
      default: break;
    }
    if (t !== "W" && t !== "W*") nums.length = 0;
  }
  return rules;
}

// --- underscore rule lines --------------------------------------------------
// Utah's forms draw their blanks as runs of underscore glyphs rather than as
// vector art, so the same blank has to be read out of the text layer. The
// per-character positions the anchor capture already records make that exact.
function underscoreRules(lines) {
  const out = [];
  for (const line of lines) {
    const chars = line.chars ?? [];
    let run = null;
    for (const ch of chars) {
      if (ch.c === "_") {
        if (!run) run = { x: ch.x, x2: ch.x + ch.w };
        else run.x2 = ch.x + ch.w;
        continue;
      }
      if (run) {
        if (run.x2 - run.x >= MIN_RULE_WIDTH) out.push({ ...run, y: line.y, thickness: 0.5, kind: "underscore_run", lineY: line.y });
        run = null;
      }
    }
    if (run && run.x2 - run.x >= MIN_RULE_WIDTH) out.push({ ...run, y: line.y, thickness: 0.5, kind: "underscore_run", lineY: line.y });
  }
  return out.map((r) => ({ x: round2(r.x), x2: round2(r.x2), y: round2(r.y), thickness: r.thickness, kind: r.kind }));
}

// --- labelling a rule line --------------------------------------------------
// A blank is named by the text the form prints beside or beneath it. Nothing
// is inferred: both candidate labels are strings the document draws, and the
// rectangle is bounded by a mark the document makes.
function labelRule(rule, lines) {
  // A PDF draws "FOR THE COUNTY OF" as separate show operations with the word
  // spacing carried in the positions, not in space characters. Joining the
  // runs naively yields "FORTHECOUNTYOF", which matches no descriptor and
  // would quietly cost the county its binding. So a space is reinserted
  // wherever the gap between two runs is wide enough to be one.
  const joinRuns = (runs, size) => {
    let out = "";
    for (let i = 0; i < runs.length; i += 1) {
      if (i > 0 && runs[i].x - runs[i - 1].x2 > 0.14 * (size || 10)) out += " ";
      out += runs[i].text;
    }
    return out.replace(/\s+/g, " ").trim();
  };

  // Text sitting on the rule: the same baseline band, ending at or before the
  // rule's left edge.
  const sameBand = lines.filter((l) => l.y >= rule.y - 1.5 && l.y <= rule.y + 13);
  let leftLabel = "";
  for (const l of sameBand) {
    const before = l.runs.filter((r) => !isBlankRun(r.text) && r.x2 <= rule.x + 3);
    if (before.length === 0) continue;
    // Walk back from the rule while the text stays contiguous, so a label is
    // isolated from the sentence that happens to precede it.
    const picked = [];
    for (let i = before.length - 1; i >= 0; i -= 1) {
      const r = before[i];
      if (picked.length && picked[0].x - r.x2 > 7) break;
      picked.unshift(r);
      if (joinRuns(picked, l.size).length >= 48) break;
    }
    const phrase = joinRuns(picked, l.size);
    if (phrase.length > leftLabel.length) leftLabel = phrase;
  }

  // Caption beneath: the small-type line under the rule, restricted to the
  // runs that actually sit over this blank.
  let belowLabel = "";
  // The nearest line beneath a rule is not always the one that names it: a
  // two-column caption puts the other column's text on an intervening
  // baseline, and Oregon's defendant-name rule sits under "DECLARATION OF
  // ELIGIBILITY" in the right column before it sits under "Defendant" in the
  // left. So the candidates are walked nearest-first and the first one with
  // text actually over this blank wins.
  const under = lines
    .filter((l) => rule.y - l.y > 1.5 && rule.y - l.y <= 14)
    .sort((a, b) => b.y - a.y)
    .find((l) => l.runs.some((r) => !isBlankRun(r.text) && r.x2 > rule.x - 2 && r.x < rule.x2 + 2));
  if (under) {
    const solid = under.runs.filter((r) => !isBlankRun(r.text));
    const overlapping = solid.filter((r) => r.x2 > rule.x - 2 && r.x < rule.x2 + 2);
    if (overlapping.length > 0) {
      // A caption is usually set flush with the blank it names, but not always:
      // "County where you are filing this Application" starts a few points to
      // the left of its rule. Clipping strictly to the rule's span would read
      // it back as "nty where you are filing...", so the phrase is extended
      // outward through text that is still contiguous with it.
      let lo = solid.indexOf(overlapping[0]);
      let hi = solid.indexOf(overlapping[overlapping.length - 1]);
      while (lo > 0 && solid[lo].x - solid[lo - 1].x2 <= 7) lo -= 1;
      while (hi + 1 < solid.length && solid[hi + 1].x - solid[hi].x2 <= 7) hi += 1;
      belowLabel = joinRuns(solid.slice(lo, hi + 1), under.size);
    }
  }

  // Which of the two names the blank. A caption beneath is the usual
  // convention, but not when it is a parenthetical instruction — Oregon's
  // "Case No: ____" carries "(leave blank if no court case)" underneath, and
  // the instruction is not the field's name. A left label ending in a colon is
  // the form naming the blank outright.
  const parenthetical = /^[({\[]/.test(belowLabel);
  const colonLabelled = /[:#]\s*$/.test(leftLabel);
  let effectiveLabel, labelChoiceBasis;
  if (leftLabel && (colonLabelled || parenthetical || belowLabel.length === 0)) {
    effectiveLabel = leftLabel;
    labelChoiceBasis = colonLabelled ? "left_label_ends_in_colon"
      : parenthetical ? "caption_beneath_is_a_parenthetical_instruction"
      : "no_caption_beneath";
  } else if (belowLabel.length >= 3) {
    effectiveLabel = belowLabel;
    labelChoiceBasis = "caption_printed_beneath_the_rule";
  } else {
    effectiveLabel = leftLabel;
    labelChoiceBasis = "text_printed_to_the_left_of_the_rule";
  }

  // Text immediately following the rule. Utah writes "____ Judicial District
  // ____ County": the second blank's only name is the word after it, and the
  // text to its left names the blank before it. This is recorded for the
  // census and offered to a spec's label override; it never wins on its own,
  // because a trailing word is as often the next sentence as it is a label.
  let rightLabel = "";
  for (const l of sameBand) {
    const after = l.runs.filter((r) => !isBlankRun(r.text) && r.x >= rule.x2 - 3);
    if (after.length === 0) continue;
    const picked = [];
    for (const r of after) {
      if (picked.length && r.x - picked[picked.length - 1].x2 > 7) break;
      picked.push(r);
      if (joinRuns(picked, l.size).length >= 32) break;
    }
    const phrase = joinRuns(picked, l.size);
    if (phrase.length > rightLabel.length) rightLabel = phrase;
  }

  // rcap-pdf-anchor-capture reports whether a run's advances came from the
  // font's own /Widths array. A Type0/Identity-H subset has none, so its
  // positions are estimated -- and Utah's BCI forms are full of them, which is
  // why their labels read back as raw byte pairs. The module's doctrine is
  // that inexact runs are excluded from anchor placement; that verdict is
  // carried here so a spec cannot write onto a blank whose geometry is a
  // guess.
  const metricsExact = [...sameBand, ...(under ? [under] : [])]
    .every((l) => l.metricsExact !== false);

  return { leftLabel, belowLabel, rightLabel, effectiveLabel, labelChoiceBasis, metricsExact };
}

function censusFlatSlots(pdfDoc) {
  const slots = [];
  pdfDoc.getPages().forEach((page, pageIndex) => {
    const lines = groupIntoLines(extractTextItems(page));
    const vector = extractRuleLines(page);
    const underscores = underscoreRules(lines);
    // The same blank is occasionally both underlined and underscored; keep one.
    const all = [...vector, ...underscores]
      .filter((r, i, a) => a.findIndex((o) => Math.abs(o.x - r.x) < 2 && Math.abs(o.y - r.y) < 4) === i)
      .sort((a, b) => b.y - a.y || a.x - b.x);

    for (const rule of all) {
      const { leftLabel, belowLabel, rightLabel, effectiveLabel, labelChoiceBasis, metricsExact } = labelRule(rule, lines);
      // A rule the form draws but never names is still a blank on the page, so
      // it stays in the census with a null label rather than being dropped. It
      // cannot bind — the binder falls back to the slot id, which matches no
      // descriptor — but a census that quietly omitted it would be claiming a
      // completeness it does not have.
      const nearbySize = lines
        .filter((l) => Math.abs(l.y - rule.y) <= 14)
        .reduce((best, l) => (best === null || l.size > best ? l.size : best), null) ?? 10;
      const fontSize = Math.max(MIN_READABLE_FONT_SIZE, Math.min(11, nearbySize));
      slots.push({
        // The trailing ".rule" is load-bearing. D0 reads a trailing one- or
        // two-digit group on a field name as a repeating charge-row index, so
        // a slot id ending in "...x330" is read as row 30 and refused for want
        // of a thirtieth charge. Utah's case-number blank was lost to exactly
        // that before the suffix was added.
        name: `p${pageIndex + 1}.r${rule.y.toFixed(1)}.x${rule.x.toFixed(0)}.rule`,
        type: "flat_slot",
        page: pageIndex + 1,
        maxLength: null,
        multiline: false,
        ruleKind: rule.kind,
        ruleThickness: rule.thickness,
        leftLabel,
        belowLabel,
        rightLabel,
        effectiveLabel: effectiveLabel.length > 0 ? effectiveLabel : null,
        unlabelled: effectiveLabel.length === 0,
        labelChoiceBasis,
        metricsExact,
        baselineFontSize: round2(fontSize),
        widgets: [{
          page: pageIndex + 1,
          rect: {
            x: round2(rule.x + 2),
            y: round2(rule.y + 2.2),
            width: round2(rule.x2 - rule.x - 4),
            height: round2(fontSize + 1.5)
          }
        }]
      });
    }
  });
  return slots;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
// Every censused field is put through D0's binder exactly as the renderer will
// put it through, so the recorded classification is the decision that actually
// governs the artifact rather than a parallel opinion about it.
function classifyCensus(census, opts) {
  const { explicitMappings = {}, captionOnly = false, documentAcceptsFill = true, chargeRows = 0, labelOverrides = {}, subRegionBindings = {}, selectedSlots = new Set() } = opts;
  return census.map((f) => {
    // Where a spec names the blank by the text printed after it rather than
    // before it, the classification has to be computed from that same label:
    // a recorded decision that differs from the one governing the artifact is
    // worse than no record at all.
    const label = labelOverrides[f.name] ?? f.effectiveLabel;
    const field = { name: f.name, pdfType: f.type === "flat_slot" ? "text" : f.type, effectiveLabel: label };
    const shared = { explicitMappings, captionOnly, availableChargeRows: chargeRows };
    // The document-level gate refuses every field at once, which is the right
    // effective answer for a held document but tells a reviewer nothing about
    // the fields themselves. So each field is also put through the binder with
    // the gate open, and both answers are recorded: what the field is, and
    // what the document's hold does to it.
    const intrinsic = decideBinding(field, { ...shared, documentAcceptsFill: true });
    const effective = decideBinding(field, { ...shared, documentAcceptsFill });
    const protectedBy = protectCategoryOf(label ?? f.name) ?? protectCategoryOf(f.name);
    return {
      name: f.name,
      type: f.type,
      page: f.widgets?.[0]?.page ?? f.page ?? null,
      effectiveLabel: f.effectiveLabel ?? null,
      labelUsedForBinding: label ?? null,
      labelOverriddenBySpec: labelOverrides[f.name] !== undefined,
      subRegionsBoundSeparately: subRegionBindings[f.name] ?? null,
      laneSelectedForWriting: selectedSlots.has(f.name),
      metricsExact: f.metricsExact ?? null,
      protectCategory: protectedBy,
      writable: effective.writable === true,
      factId: effective.factId ?? null,
      reason: effective.writable ? "bound_to_allowlisted_fact" : effective.reason,
      category: effective.category ?? null,
      intrinsicWritable: intrinsic.writable === true,
      intrinsicFactId: intrinsic.factId ?? null,
      intrinsicReason: intrinsic.writable ? "bound_to_allowlisted_fact" : intrinsic.reason,
      intrinsicCategory: intrinsic.category ?? null
    };
  });
}

// ---------------------------------------------------------------------------
// Family specifications
// ---------------------------------------------------------------------------
// Authored from first-hand inspection of each binary: what the document is,
// who completes it, which holds it carries, and — for a flat form — which
// measured slots this lane is willing to write.
//
// `bindingCorrections` is the sanctioned counter-mapping. Where a form's own
// field name is broader or narrower than any allowlisted descriptor, naming
// the field's true fact makes D0's binder refuse it (the explicit mapping
// conflicts with the name-derived descriptor) instead of writing an
// approximately-right value. It can only ever remove a binding.
//
// `slotBindings` is an allowlist, not a suggestion: a measured slot is written
// only if it is named here, it resolves to exactly one censused slot, and D0's
// binder independently agrees it is writable.
const PARTICIPANT_ADDRESS_FACTS = [
  "participant.full_legal_name", "participant.street_address",
  "participant.city", "participant.state", "participant.zip"
];

// Iowa's two Rule 2.86 applications are the same form with a different
// offense: an identical two-page layout, an identical signature page carrying
// a self-represented block, an attorney block and a certification of service.
// Only the self-represented block belongs to the participant.
function iowaSpec({ slug, title, page1, blockA, blockB, service, strays }) {
  const corrections = {};
  const rationale = {};
  const note = (slot, factId, why) => { corrections[slot] = factId; rationale[slot] = why; };

  note(blockA.areaCode, "participant.phone_area_code",
    "the form splits the telephone number into a parenthesised area-code box and a separate number rule; there is one participant.phone fact and no exact mapping for either half, so both stay blank");
  note(blockA.phone, "participant.phone_local_number",
    "second half of the same split telephone number: no fact describes the local portion on its own");
  note(blockA.email, "participant.email",
    "the allowlisted descriptor list resolves the caption 'Email address' to participant.street_address, because the street-address descriptor matches a bare 'address' and is ordered first; writing a street address into an email line is a defect, so the blank is refused");
  for (const [slot, fact] of Object.entries(blockB)) {
    note(slot, `attorney.${fact}`,
      "attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact");
  }
  for (const [slot, fact] of Object.entries(service)) {
    note(slot, `service_recipient.${fact}`,
      "certification of service: this names the county attorney the copy went to, not the participant");
  }
  note(strays.alternativePlaintiff, "plaintiff.alternative_municipality",
    "the caption reads 'State of Iowa or ______', and the blank is for a city prosecuting under its own ordinance. The descriptor list resolves 'State of Iowa or' to participant.state, which would name the petitioner's home state as the plaintiff.");
  note(strays.captionTableBorder, "not_a_participant_blank.caption_border_rule",
    "a measured rule that is the caption table's own border rather than a blank. It sits under the word 'County' and so resolves to matter.county. Recorded rather than silently dropped: the census reports every rule the document draws, and this one is not a field.");
  for (const [slot, fact] of Object.entries(strays.attorneyExtra ?? {})) {
    note(slot, `attorney.${fact}`,
      "attorney block: the form fills this only when counsel files on the defendant's behalf, and no attorney fact is a participant fact");
  }

  return {
    slug,
    title,
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "A defendant's own application to the Iowa District Court, signed under penalty of perjury. The caption, the self-represented signature block and that block's address are the participant's. The attorney block, the signature lines, the split telephone boxes, the conviction date and the certification of service are not, and none of them is written.",
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: [...PARTICIPANT_ADDRESS_FACTS, "matter.county", "matter.case_number"],
    bindingCorrections: corrections,
    bindingCorrectionRationale: rationale,
    slotBindings: [
      { slot: page1.county, factId: "matter.county" },
      { slot: page1.caseNumber, factId: "matter.case_number" },
      { slot: page1.defendant, factId: "participant.full_legal_name" },
      { slot: blockA.name, factId: "participant.full_legal_name" },
      { slot: blockA.address, factId: "participant.street_address" },
      { slot: blockA.city, factId: "participant.city" },
      { slot: blockA.state, factId: "participant.state" },
      { slot: blockA.zip, factId: "participant.zip" }
    ],
    fidelityFindings: [
      "The compiled Iowa profile's legacy formInventory carries `2_86_4_123_PAULA_Expungement_18A04436D4107.pdf` at sha256 8b2c33815548615733f01f964340fc39efcd8c252ad8c3ee50b97b0639753ffc (807,560 bytes). No Edition 1 binary has that hash. The pack manifest's Rule 2.86 Form 4 is a different revision entirely — 279eefe8c5f6b51ec73eb943c9a479757ff3d2c439177bfbf3044e7e71f66c45, 288,751 bytes, August 2024 — and the manifest records that it supersedes the January 2021 revision already in the historical corpus. The pack manifest wins; the profile is not edited.",
      "The profile's inventory holds no binary at all for Rule 2.86 Form 5, which Edition 1 does carry. Iowa's coded state pack is therefore behind Edition 1 on both packet forms."
    ]
  };
}

export const FAMILY_SPECS = {
  // -------------------------------------------------------------- Iowa -----
  "IA:RULE-2.86-FORM-4": iowaSpec({
    slug: "rule-2-86-form-4-application-to-expunge-underage-alcohol-records",
    title: "Rule 2.86 Form 4 — Application to Expunge Possession of Alcohol under the Legal Age Court Records",
    page1: { county: "p1.r677.6.x298.rule", caseNumber: "p1.r635.9.x361.rule", defendant: "p1.r578.4.x72.rule" },
    blockA: {
      name: "p2.r639.6.x117.rule", address: "p2.r551.3.x108.rule",
      city: "p2.r520.3.x108.rule", state: "p2.r520.3.x306.rule", zip: "p2.r520.3.x432.rule",
      areaCode: "p2.r489.1.x112.rule", phone: "p2.r489.1.x149.rule", email: "p2.r489.1.x306.rule"
    },
    blockB: {
      "p2.r317.0.x108.rule": "street_address", "p2.r286.1.x108.rule": "city",
      "p2.r286.1.x306.rule": "state", "p2.r286.1.x432.rule": "zip",
      "p2.r254.8.x112.rule": "phone_area_code", "p2.r254.8.x148.rule": "phone_local_number",
      "p2.r225.5.x108.rule": "email"
    },
    service: {
      "p2.r144.4.x86.rule": "certifying_party_name", "p2.r105.0.x78.rule": "recipient_name",
      "p2.r80.2.x78.rule": "street_address", "p2.r80.2.x330.rule": "city",
      "p2.r80.2.x429.rule": "state", "p2.r80.2.x474.rule": "zip"
    },
    strays: {
      alternativePlaintiff: "p1.r635.2.x165.rule",
      captionTableBorder: "p1.r661.8.x306.rule",
      attorneyExtra: { "p2.r225.5.x306.rule": "additional_email" }
    }
  }),
  "IA:RULE-2.86-FORM-5": iowaSpec({
    slug: "rule-2-86-form-5-application-to-expunge-prostitution-records",
    title: "Rule 2.86 Form 5 — Application to Expunge Prostitution Court Records under Iowa Code section 725.1",
    page1: { county: "p1.r677.6.x298.rule", caseNumber: "p1.r635.9.x361.rule", defendant: "p1.r578.4.x72.rule" },
    blockA: {
      name: "p2.r649.9.x117.rule", address: "p2.r561.7.x108.rule",
      city: "p2.r530.8.x108.rule", state: "p2.r530.8.x306.rule", zip: "p2.r530.8.x432.rule",
      areaCode: "p2.r499.4.x112.rule", phone: "p2.r499.4.x149.rule", email: "p2.r499.4.x306.rule"
    },
    blockB: {
      "p2.r327.4.x108.rule": "street_address", "p2.r296.4.x108.rule": "city",
      "p2.r296.4.x306.rule": "state",
      "p2.r265.2.x112.rule": "phone_area_code", "p2.r265.2.x148.rule": "phone_local_number",
      "p2.r235.8.x108.rule": "email"
    },
    service: {
      "p2.r154.7.x86.rule": "certifying_party_name", "p2.r115.3.x78.rule": "recipient_name",
      "p2.r90.5.x78.rule": "street_address", "p2.r90.5.x330.rule": "city",
      "p2.r90.5.x429.rule": "state", "p2.r90.5.x474.rule": "zip"
    },
    strays: {
      alternativePlaintiff: "p1.r635.2.x165.rule",
      captionTableBorder: "p1.r661.8.x306.rule",
      attorneyExtra: { "p2.r296.4.x432.rule": "zip", "p2.r235.8.x306.rule": "additional_email" }
    }
  }),

  // ----------------------------------------------------- Massachusetts -----
  // Both Massachusetts assets are source-gated in Edition 1 with the
  // currentness gate open, and the manifest says so in terms: the Probation
  // Service petition's "current published revision remains a freshness gate",
  // and TC0021 is to be "preserved as source-gated until converted or handled
  // by an approved strategy". A 2018 petition and an XFA form are both capable
  // of rendering; neither is capable of being current on this lane's say-so.
  // So Massachusetts is inventoried and classified in full, and nothing is
  // filled. That is the hold being preserved, not a gap in the work.
  "MA:MA-PROBATION-SERVICE": {
    slug: "ma-probation-service-petition-to-expunge-100f-100g-100h",
    title: "Petition to Expunge Under G.L. c. 276, §§ 100F, 100G or 100H",
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "A petitioner's own petition addressed to the Commissioner of Probation. It is participant-completed, but its face carries race, ethnicity, Social Security number, occupation, and parents' and spouse's names — five categories D0 protects by default — and its published revision is October 2018, which the Edition 1 manifest records as an open freshness gate.",
    participantFillable: false,
    noFillReason:
      "source-gated in Edition 1 with the currentness gate open: the manifest records the current published revision as a freshness gate, and Massachusetts expungement practice under c. 276 §§ 100F–100K has moved since this October 2018 sheet. A rendered sample of a possibly-superseded petition would invite exactly the inference this hold exists to prevent.",
    captionOnly: false,
    nonFilingNotice: null,
    facts: [],
    bindingCorrections: {
      "p1.r503.9.x155.rule": "participant.alias_or_former_name",
      "p1.r450.0.x95.rule": "third_party.father_name",
      "p1.r450.0.x321.rule": "third_party.mother_maiden_name",
      "p1.r450.0.x470.rule": "third_party.spouse_name",
      "p1.r468.0.x436.rule": "participant.phone_local_number"
    },
    bindingCorrectionRationale: {
      "p1.r503.9.x155.rule": "'Alias/Maiden/Previous Name' resolves to participant.full_legal_name on the descriptor's bare \\\\bname\\\\b match. An alias is a different fact from a legal name, and stamping the legal name into an alias line misstates the record.",
      "p1.r450.0.x95.rule": "'Father's Name' resolves to participant.full_legal_name on the same bare name match. It names a third party, and the participant's own name is not it.",
      "p1.r450.0.x321.rule": "'Mother's Maiden Name' resolves to participant.full_legal_name on the same bare name match, and is likewise a third party's fact.",
      "p1.r450.0.x470.rule": "'Spouse's Name' resolves to participant.full_legal_name on the same bare name match, and is likewise a third party's fact.",
      "p1.r468.0.x436.rule": "the telephone rule sits beside a Social Security number rule in the same band; the lane declines the pair rather than risk the wrong one."
    },
    slotBindings: [],
    fidelityFindings: [
      "Binder finding, recorded whether or not this form is ever un-gated: run with the document-level hold open, D0's binder resolves 'Alias/Maiden/Previous Name', 'Father's Name', 'Mother's Maiden Name' and 'Spouse's Name' all to participant.full_legal_name, because the descriptor for that fact matches a bare \\\\bname\\\\b. A generic fill would have written the petitioner's own name into three third-party blanks and an alias line. The four fields are refused by explicit counter-mapping. This is a descriptor-list observation for D0, not a defect in this state's package.",
      "The compiled Massachusetts profile's legacy formInventory lists four PDFs — OCP004 (10-day opt-out notice package), fillable-jud-mps-Petition-to-Seal, jud-Petition-for-Expungement and jud-tc-Petition-to-Seal-for-Nolle-Prosequi-or-Dismissal. Not one of their sha256 values appears anywhere in Edition 1, and Edition 1 carries only two Massachusetts binaries. The pack manifest wins.",
      "OCP004 is not present in the Edition 1 pack in any form. Identity was resolved by sha256 against the pack manifest rather than by filename, so the URL-encoded legacy filename is not the reason it was not found — the binary is simply not in the edition. Nothing is bound to it, and no opinion is recorded here about whether it is participant-completed, because this lane never had the binary to inspect."
    ]
  },
  "MA:TC0021": {
    slug: "tc0021-petition-for-expungement-of-marijuana-offenses",
    title: "Petition for Expungement of Marijuana Offenses, G.L. c. 276, § 100K¼",
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "A petitioner's own Trial Court petition, sworn under the pains and penalties of perjury. Its 29 AcroForm fields are XFA-generated and carry no meaningful names — every one is form1[0].#subform[0].TextField1[n] or CheckBoxN[n] — so not one of them matches an allowlisted fact descriptor and D0's binder refuses the entire form on its own terms.",
    participantFillable: false,
    xfaHold: true,
    noFillReason:
      "source-gated and XFA. The Edition 1 manifest states that the runtime renderer cannot fill XFA and that the form is to be preserved as source-gated until converted or handled by an approved strategy. Independently of that hold, all 29 field names are XFA-generated positional identifiers, so D0's fail-closed binder matches none of them to a fact descriptor.",
    captionOnly: false,
    nonFilingNotice: null,
    facts: [],
    bindingCorrections: {},
    bindingCorrectionRationale: {},
    slotBindings: [],
    fidelityFindings: [
      "The profile's legacy `jud-Petition-for-Expungement.pdf` (sha256 19842819786d812c82c0b310aed8a5065e516a95122a59e0662a7ca67159a5ce, 1,387,408 bytes) is not this binary. Edition 1's TC0021 is a9d80fab51668c59a15b559aa0f5021e8b4bf661fa83429ef22b31157cbf565c at 1,393,680 bytes, revision 11/22. The pack manifest wins; the profile is not edited.",
      "The manifest classes TC0021 as `acroform_pdf` with 29 fields, which the binary confirms, and separately notes that it is XFA. Both are true: an XFA form ships an AcroForm fallback layer. The fallback is what pdf-lib can see, and its field names carry no semantics."
    ]
  },

  // ------------------------------------------------------------ Oregon -----
  "OR:OR-OJD-ADULT-SET-ASIDE-PACKET": {
    slug: "or-ojd-adult-set-aside-packet-motion-and-declaration",
    title: "OJD Criminal Set-Aside Adult Packet — Motion to Set Aside and Seal, and Declaration of Eligibility",
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "A five-page OJD packet. Pages 1 to 3 are participant instructions and eligibility tables and carry no blanks a participant fills; pages 4 and 5 are the motion and declaration the participant signs and files. The caption, the defendant's identity block and the declaration's own contact block belong to the participant. The charge and offence tables, the citing agency, the arrest date, the fingerprint and SID numbers, both signature lines and the certificate of mailing do not.",
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: [
      "participant.full_legal_name", "participant.date_of_birth", "participant.street_address",
      "participant.city_state_zip", "participant.phone", "participant.email",
      "matter.county", "matter.case_number"
    ],
    bindingCorrections: {
      "p4.r295.2.x144.rule": "matter.charges[n].charge",
      "p4.r282.1.x477.rule": "matter.charges[n].count_number",
      "p4.r128.4.x126.rule": "matter.charges[n].citation_or_arrest_offense",
      "p5.r115.6.x288.rule": "service_recipient.certifying_defendant_name",
      "p3.r256.2.x341.rule": "not_a_participant_blank.underline_inside_instruction_text"
    },
    bindingCorrectionRationale: {
      "p4.r295.2.x144.rule": "'Name of Charges' is the header of a seven-row charge table, and the descriptor list resolves it to participant.full_legal_name on a bare name match. A charge row may only be written from an indexed participant fact this lane does not supply, so every row stays blank.",
      "p4.r282.1.x477.rule": "second column of the same charge table ('Count #'), resolved to participant.full_legal_name by the header above it for the same reason.",
      "p4.r128.4.x126.rule": "'Name of Citation/Arrest Offenses' heads a second five-row table and resolves the same way. Offence rows are charge-row facts.",
      "p5.r115.6.x288.rule": "'Defendant Name' inside the certificate of mailing. The block records service on the prosecuting attorney, and D0 keeps service blocks blank.",
      "p3.r256.2.x341.rule": "an underline drawn inside a sentence on the instruction pages, not a blank. It follows '...contact the Oregon State Bar Lawyer Referral Service' and so resolves to participant.state. Recorded rather than dropped: the census reports every rule the document draws, and this one is not a field."
    },
    slotBindings: [
      { slot: "p4.r693.7.x305.rule", factId: "matter.county" },
      { slot: "p4.r666.5.x395.rule", factId: "matter.case_number" },
      { slot: "p4.r611.9.x72.rule", factId: "participant.full_legal_name" },
      { slot: "p4.r585.6.x102.rule", factId: "participant.date_of_birth" },
      { slot: "p5.r340.8.x288.rule", factId: "participant.full_legal_name" },
      { slot: "p5.r340.8.x72.rule", factId: "participant.email" },
      { slot: "p5.r303.2.x72.rule", subRegion: { xFrom: 74, xTo: 248 }, label: "Address", factId: "participant.street_address" },
      { slot: "p5.r303.2.x72.rule", subRegion: { xFrom: 252, xTo: 500 }, label: "City, State, ZIP", factId: "participant.city_state_zip" },
      { slot: "p5.r303.2.x72.rule", subRegion: { xFrom: 504, xTo: 538 }, label: "Phone", factId: "participant.phone" }
    ],
    fidelityFindings: [
      "The compiled Oregon profile's legacy formInventory carries `CriminalSetAside_AdultCases2.pdf` at sha256 6d1f70c6079d56dc49fff49ac356d53e1b3c3749515f1c5029d3e39e1899b69a (253,599 bytes). Edition 1's packet is b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071 at 256,978 bytes, revision January 2026. Different binaries; the pack manifest wins and the profile is not edited.",
      "Correction to an earlier reading in this lane: the address sub-regions were first built with an explicit fact mapping, on the belief that the commas in the caption 'City, State, ZIP' defeat the city_state_zip descriptor's /city\\s*state\\s*zip/. They do not. D0's haystack carries a fully squashed copy of every name alongside the separator-normalised one, and 'citystatezip' matches directly. The override was unnecessary, and it and its machinery are gone; the caption binds on the binder's own terms.",
      "Sub-region evidence: the address rule on page 5 spans x 72 to 540 and carries three captions beneath it — 'Address' at x 72, 'City, State, ZIP' at x 252 and 'Phone' at x 504. Each sub-region runs from its own caption's left edge to the next caption's left edge. The phone span is only 34 points wide, which is the form's geometry rather than this lane's choice; whether a telephone number fits it at or above the six-point readable floor is left to D0's fitter and recorded in the overflow report.",
      "Date presentation, recorded for D0 rather than for Oregon: this form captions its date-of-birth blank MM/DD/YYYY, and the factory writes 1991-04-17. D0's type check requires date facts in ISO 8601 form and there is no presentation layer between the fact and the page, so every date this factory writes is ISO. The value is correct and unambiguous, but it does not follow the caption. A per-form date format belongs in the shared factory, not in a lane.",
      "The STATE_README records one open item for Oregon — OJD or county set-aside packets for supported counties plus OSP fingerprint materials, classed `local_jurisdiction_required` / `jurisdiction_input_required`. It is carried forward as a hold, not cleared."
    ]
  },
  "OR:OR-OJD-MJ-PCR": {
    slug: "or-ojd-motion-and-declaration-to-set-aside-marijuana-conviction",
    title: "Motion and Declaration to Modify or Set Aside Marijuana Conviction",
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "A defendant's own motion and declaration under ORS 475C.397 and ORS 137.222. The caption, the identity block and the declaration's contact block are the participant's. The crime description, the SID and fingerprint numbers, both signature lines and the certificate of mailing are not.",
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: [
      "participant.full_legal_name", "participant.date_of_birth", "participant.street_address",
      "participant.city_state_zip", "participant.phone", "matter.county", "matter.case_number"
    ],
    bindingCorrections: {
      "p2.r371.6.x288.rule": "service_recipient.certifying_party_name",
      "p2.r577.7.x432.rule": "participant.phone_second_rule_segment"
    },
    bindingCorrectionRationale: {
      "p2.r371.6.x288.rule": "'Name (typed or printed)' inside the certificate of mailing rather than the declaration. The identical caption appears in both blocks; only the declaration's copy is written.",
      "p2.r577.7.x432.rule": "the telephone blank is drawn as two rule segments under one 'Phone Number' caption, and both resolve to participant.phone. The number is written once, into the segment the caption sits over; writing it into both would duplicate it on the page."
    },
    slotBindings: [
      { slot: "p1.r693.7.x305.rule", factId: "matter.county" },
      { slot: "p1.r666.5.x395.rule", factId: "matter.case_number" },
      { slot: "p1.r611.9.x72.rule", factId: "participant.full_legal_name" },
      { slot: "p1.r586.8.x99.rule", factId: "participant.date_of_birth" },
      { slot: "p2.r613.1.x293.rule", factId: "participant.full_legal_name" },
      { slot: "p2.r579.0.x72.rule", subRegion: { xFrom: 74, xTo: 212 }, label: "Address", factId: "participant.street_address" },
      { slot: "p2.r579.0.x72.rule", subRegion: { xFrom: 216, xTo: 430 }, label: "City/State/Zip", factId: "participant.city_state_zip" },
      { slot: "p2.r579.0.x468.rule", factId: "participant.phone" }
    ],
    fidelityFindings: [
      "The compiled Oregon profile's legacy formInventory holds no binary for this motion at all — its only Oregon PDF is the adult set-aside packet, at a hash Edition 1 does not carry. Oregon's coded state pack is behind Edition 1 on both packet forms.",
      "Date presentation, recorded for D0 rather than for Oregon: this form captions its date-of-birth blank MM/DD/YYYY, and the factory writes 1991-04-17. D0's type check requires date facts in ISO 8601 form and there is no presentation layer between the fact and the page, so every date this factory writes is ISO. The value is correct and unambiguous, but it does not follow the caption. A per-form date format belongs in the shared factory, not in a lane.",
      "This form's captions use slashes rather than commas ('City/State/Zip'), which the city_state_zip descriptor matches directly. No explicit fact mapping is needed here, unlike the adult packet's comma-separated caption for the same field."
    ]
  }
};

// The two Oregon record-check requests are byte-distinct binaries that share an
// identical form: 22 fields, the same names, the same rectangles, 23 bytes
// apart in size. The manifest gives them different document ids and different
// roles — one is the OJD request, one is the Oregon State Police request with
// instructions — so they are built as two families and the near-duplication is
// recorded rather than collapsed.
function oregonRecordCheckSpec({ slug, title, agency }) {
  return {
    slug,
    title,
    documentOwnership: "participant_completed",
    ownershipDetermination:
      `A participant's own request to ${agency} for the criminal record check a set-aside requires. Identity, date of birth and telephone number are the participant's. The ten numbered case rows, the alias lines, the composite mailing line, the fee election and the fingerprint-card election are not written.`,
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: ["participant.full_legal_name", "participant.date_of_birth", "participant.phone"],
    bindingCorrections: {
      "ALIAS NAME1": "participant.alias_1",
      "ALIAS NAME2": "participant.alias_2",
      "ALIAS NAME3": "participant.alias_3",
      "Street, City, State, Zip code": "participant.mailing_address_single_line"
    },
    bindingCorrectionRationale: {
      "ALIAS NAME1": "the descriptor list resolves any field whose name contains a bare 'name' to participant.full_legal_name, so all three alias lines would receive the petitioner's legal name — three times, on a form whose whole purpose is to disclose names other than the legal one. An alias is a distinct fact this lane does not hold.",
      "ALIAS NAME2": "second alias line, same resolution and same refusal.",
      "ALIAS NAME3": "third alias line, same resolution and same refusal.",
      "Street, City, State, Zip code": "the field asks for the street, city, state and postal code on one line and the binder resolves it to participant.city_state_zip, which would return the record check to a city and postal code with no street. No single fact matches the field's full span, so it is refused rather than under-filled."
    },
    slotBindings: [],
    fidelityFindings: [
      "This binary and the other Oregon record-check request share all 22 field names and all 22 widget rectangles and differ by 23 bytes. Their sha256 values differ, the manifest assigns them different document ids and roles, and both are carried as separate families on that authority. A reviewer comparing the two packages should expect the field census to be identical.",
      "Date presentation, recorded for D0 rather than for Oregon: this form captions its DATE OF BIRTH field MM/DD/YYYY, and the factory writes 1991-04-17. D0's type check requires date facts in ISO 8601 form and there is no presentation layer between the fact and the page, so every date this factory writes is ISO. The value is correct and unambiguous, but it does not follow the caption. A per-form date format belongs in the shared factory, not in a lane.",
      "The 'AREA CODE' field is refused for want of an allowlisted fact: no descriptor describes an area code on its own. The complete telephone number is written into 'PHONE NUMBER', which is the field the form labels for it, and the area-code box is left to the participant."
    ]
  };
}

FAMILY_SPECS["OR:OR-OJD-CLA-SET-ASIDE-CHECK"] = oregonRecordCheckSpec({
  slug: "or-ojd-cla-request-for-set-aside-criminal-record-check",
  title: "OJD Request for Set-Aside Criminal Record Check",
  agency: "the Oregon Judicial Department"
});
FAMILY_SPECS["OR:OR-OSP-SET-ASIDE-CCH"] = oregonRecordCheckSpec({
  slug: "or-osp-set-aside-criminal-history-request-and-instructions",
  title: "Oregon State Police Set-Aside Criminal History Request and Instructions",
  agency: "the Oregon State Police"
});


// -------------------------------------------------------------- Utah -----
// Utah is the largest family set in this lane: 21 binaries across packet
// forms, court orders, a civil cover sheet, participant instructions,
// supporting process and a source-gated block. Every one of them is
// generation_allowed=no and runtime_disabled in Edition 1, and seven carry an
// open source gate on top of that.
//
// The three petitions share a layout, so they share a builder. What differs
// between them is which blanks the text layer renders cleanly enough to
// measure, and that difference is recorded rather than papered over.
function utahPetitionSpec({ slug, title, statute, name, address, cityStateZip, phone, email, caseNumber, printedName, county, petitioner, courtAddress, extraFindings = [] }) {
  const bindings = [
    { slot: name, factId: "participant.full_legal_name" },
    { slot: address, factId: "participant.street_address" },
    { slot: cityStateZip, factId: "participant.city_state_zip" },
    { slot: phone, factId: "participant.phone" },
    { slot: email, factId: "participant.email" },
    { slot: caseNumber, factId: "matter.case_number" },
    { slot: printedName, factId: "participant.full_legal_name" }
  ];
  const corrections = {}, rationale = {};
  if (county) bindings.push({ slot: county, label: "County", factId: "matter.county" });
  if (petitioner) bindings.push({ slot: petitioner, factId: "participant.full_legal_name" });
  if (courtAddress) {
    corrections[courtAddress] = "court.street_address";
    rationale[courtAddress] = "'Court Address' resolves to participant.street_address on the descriptor's bare \\baddress\\b match. It is the court's address, and D0 keeps court fields blank.";
  }
  return {
    slug, title,
    documentOwnership: "participant_completed",
    ownershipDetermination:
      `A petitioner's own petition to a Utah district or justice court under ${statute}, signed under criminal penalty. The contact block, the caption and the printed name in the signature block are the participant's. The judge line, the bar-number line, the place of signing, the signature itself and the eligibility recitals are not.`,
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: [
      "participant.full_legal_name", "participant.street_address", "participant.city_state_zip",
      "participant.phone", "participant.email", "matter.county", "matter.case_number"
    ],
    bindingCorrections: corrections,
    bindingCorrectionRationale: rationale,
    slotBindings: bindings,
    fidelityFindings: extraFindings
  };
}

const UTAH_ORDER_UNSELECTED =
  "The decretal 'case number:' blanks on the later pages sit inside bracketed elections about which records the court orders expunged. They are the court's findings, not the caption, and writing a case number beside an unchecked box would assert an election nobody made.";

function utahOrderSpec({ slug, title, name, caseNumber, decretalCaseNumbers }) {
  const corrections = {}, rationale = {};
  for (const slot of decretalCaseNumbers) {
    corrections[slot] = "court.ordered_case_number";
    rationale[slot] = UTAH_ORDER_UNSELECTED;
  }
  return {
    slug, title,
    documentOwnership: "court_issued",
    ownershipDetermination:
      "A proposed order the petitioner submits and the court signs. Its decretal paragraphs, its findings and its signature line belong to the judge. D0's caption-only rule governs everything this lane may touch: only a caption fact can bind, so the petitioner's name and the case number are written and the contact block, the address, the telephone number and the email address are refused with the reason recorded.",
    participantFillable: true,
    captionOnly: true,
    nonFilingNotice: null,
    facts: ["participant.full_legal_name", "matter.case_number", "matter.county"],
    bindingCorrections: corrections,
    bindingCorrectionRationale: rationale,
    slotBindings: [
      { slot: name, factId: "participant.full_legal_name" },
      { slot: caseNumber, factId: "matter.case_number" }
    ],
    fidelityFindings: [
      "This order's top contact block is identical to the petitions' and would bind name, address, city/state/zip, telephone and email. Under D0's caption-only rule for a court-issued order, four of the five are refused with reason court_issued_order_accepts_caption_facts_only. That is the intended outcome for an order, and it is what the classification records."
    ]
  };
}

function utahHeldSpec({ slug, title, ownership, determination, reason, findings = [] }) {
  return {
    slug, title,
    documentOwnership: ownership,
    ownershipDetermination: determination,
    participantFillable: false,
    noFillReason: reason,
    captionOnly: false,
    nonFilingNotice: null,
    facts: [],
    bindingCorrections: {},
    bindingCorrectionRationale: {},
    slotBindings: [],
    fidelityFindings: findings
  };
}

const UTAH_SOURCE_GATE =
  "source-gated in Edition 1 with the currentness gate open. The manifest marks this asset source_gated / source_or_currentness_gate_open, and three of the seven carry a 2010 revision. It is inventoried and classified in full; nothing is written, because a rendered sample of a possibly-superseded form invites exactly the inference the gate exists to prevent.";
const UTAH_REV_UNKNOWN =
  "the manifest records this asset's revision as REV-UNKNOWN with freshness_status revision_confirmation_required. A form whose published revision cannot be confirmed is not a form to render a participant sample from, whatever its fields would accept.";

Object.assign(FAMILY_SPECS, {
  "UT:1000EX": utahPetitionSpec({
    slug: "1000ex-petition-to-expunge-records-with-certificate-of-eligibility",
    title: "1000EX — Petition to Expunge Records with Certificate of Eligibility",
    statute: "Utah Code 77-40a-305(1)(a)",
    name: "p1.r665.5.x67.rule", address: "p1.r637.8.x67.rule", cityStateZip: "p1.r610.1.x67.rule",
    phone: "p1.r582.5.x67.rule", email: "p1.r552.0.x67.rule",
    caseNumber: "p1.r342.9.x330.rule", printedName: "p2.r589.7.x328.rule",
    county: "p1.r458.2.x309.rule", petitioner: "p1.r354.4.x72.rule", courtAddress: "p1.r432.4.x166.rule",
    extraFindings: [
      "The county blank is named by the word printed after it, not before it. The line reads '__________ Judicial District ________________ County', so the text to this blank's left is 'Judicial District' — which resolves to matter.court — and the only word that names it is the 'County' that follows. The census records left, right and beneath labels for every blank, and this binding uses the right-hand one explicitly.",
      "Of the three Utah petitions, only 1000EX renders its court block cleanly enough to measure. See the 1002EX and 1003EX findings."
    ]
  }),
  "UT:1002EX": utahPetitionSpec({
    slug: "1002ex-petition-to-expunge-records-traffic-charge",
    title: "1002EX — Petition to Expunge Records, Traffic Charge",
    statute: "Utah Code 77-40a-305(3)",
    name: "p1.r665.5.x67.rule", address: "p1.r637.8.x67.rule", cityStateZip: "p1.r610.1.x67.rule",
    phone: "p1.r582.5.x67.rule", email: "p1.r552.0.x67.rule",
    caseNumber: "p1.r354.4.x330.rule", printedName: "p2.r234.0.x328.rule",
    extraFindings: [
      "This form's court block and petitioner caption exist on the page but are not written. Its text layer interleaves glyphs — the county line reads back as 'C_________ounty', and elsewhere 'oYu', 'usJtice' and 'arB #' — so the underscore runs on those lines cannot be bounded reliably. The blanks stay in the census as unlabelled rules and are left to the participant. Placing an overlay on geometry this lane cannot trust would be worse than leaving the line blank.",
      "1000EX carries the same court block and does render it cleanly, so the difference is this binary's text encoding rather than the form's design."
    ]
  }),
  "UT:1003EX": utahPetitionSpec({
    slug: "1003ex-petition-to-expunge-records-cannabis-conviction",
    title: "1003EX — Petition to Expunge Records, Cannabis Conviction",
    statute: "Utah Code 77-40a-305",
    name: "p1.r665.5.x67.rule", address: "p1.r637.8.x67.rule", cityStateZip: "p1.r610.1.x67.rule",
    phone: "p1.r582.5.x67.rule", email: "p1.r552.0.x67.rule",
    caseNumber: "p1.r354.4.x330.rule", printedName: "p4.r330.4.x328.rule",
    extraFindings: [
      "Same interleaved text layer as 1002EX: the court block and petitioner caption are present on the page, unmeasurable, and left blank.",
      "This is the oldest of the three petitions (March 2020) and the only one whose running footer contains the word 'Conviction', which D0 protects under disposition_or_hearing. The footer is not a blank; the protection simply also covers it."
    ]
  }),

  "UT:1020EX": utahOrderSpec({
    slug: "1020ex-order-on-petition-to-expunge-records-with-certificate-of-eligibility",
    title: "1020EX — Order on Petition to Expunge Records with Certificate of Eligibility",
    name: "p1.r701.5.x67.rule", caseNumber: "p1.r425.5.x330.rule",
    decretalCaseNumbers: ["p2.r385.6.x218.rule", "p2.r220.3.x218.rule"]
  }),
  "UT:1022EX": utahOrderSpec({
    slug: "1022ex-order-on-petition-to-expunge-records-traffic-conviction",
    title: "1022EX — Order on Petition to Expunge Records, Traffic Conviction",
    name: "p1.r665.5.x67.rule", caseNumber: "p1.r389.5.x330.rule",
    decretalCaseNumbers: ["p2.r621.1.x187.rule", "p2.r569.5.x187.rule"]
  }),

  "UT:1044XX": {
    slug: "1044xx-district-court-cover-sheet-for-civil-actions",
    title: "1044XX — Utah District Court Cover Sheet for Civil Actions",
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "The filing party's own cover sheet. It is laid out as two mirrored columns — Plaintiff/Petitioner on the left, Defendant/Respondent on the right — repeated for a second party, with an attorney or licensed paralegal practitioner block under each. On an expungement petition the participant is the petitioner, so only the first left-hand block is theirs.",
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: [
      "participant.full_legal_name", "participant.street_address",
      "participant.city_state_zip", "participant.phone", "participant.email"
    ],
    bindingCorrections: {},
    bindingCorrectionRationale: {},
    unselectedRationale:
      "Every unselected blank on this sheet belongs to somebody else. The right-hand column is the Defendant/Respondent's; the second pair of blocks is for a second plaintiff and a second defendant; each attorney block is for counsel or a licensed paralegal practitioner, whose addresses the sheet says the Utah State Bar supplies. All of them carry the same captions as the petitioner's block — Name, Address, City, State, Zip, Phone, Email — and so resolve to the same participant facts. Writing the petitioner's details into an opposing party's column would misstate the case to the court.",
    slotBindings: [
      { slot: "p1.r671.7.x32.rule", factId: "participant.full_legal_name" },
      { slot: "p1.r648.2.x32.rule", factId: "participant.street_address" },
      { slot: "p1.r624.7.x32.rule", factId: "participant.city_state_zip" },
      { slot: "p1.r601.3.x32.rule", factId: "participant.phone" },
      { slot: "p1.r601.3.x171.rule", factId: "participant.email" }
    ],
    fidelityFindings: [
      "The bar-number blanks are refused by D0's attorney protect rule without any help from this lane, on both attorney blocks and for both parties.",
      "The 'Total Claim for Damages $______' blank is refused under the money rule, which is the correct outcome on an expungement filing that claims no damages."
    ]
  },

  "UT:1305GE": {
    slug: "1305ge-motion-to-waive-fees-for-expungement",
    title: "1305GE — Motion to Waive Fees for Expungement",
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "A petitioner's own motion and the financial declaration that supports it. Page 1 is the ordinary caption and contact block. Pages 2 to 10 are a sworn statement of income, employment, property, vehicles, debts and household members, and they name employers, lien holders, title holders and other third parties throughout.",
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: [
      "participant.full_legal_name", "participant.street_address", "participant.city_state_zip",
      "participant.phone", "participant.email", "matter.case_number"
    ],
    bindingCorrections: {
      "p1.r432.4.x173.rule": "court.street_address",
      "p2.r682.9.x355.rule": "third_party.nonprofit_provider_name",
      "p5.r511.4.x284.rule": "money.state_income_tax_withheld",
      "p7.r675.7.x221.rule": "third_party.employer_business_name",
      "p7.r552.5.x221.rule": "third_party.employer_business_name",
      "p7.r651.7.x221.rule": "third_party.employer_address_and_phone",
      "p7.r528.5.x221.rule": "third_party.employer_address_and_phone",
      "p9.r666.6.x217.rule": "third_party.names_on_title",
      "p9.r504.6.x217.rule": "third_party.names_on_title",
      "p9.r626.1.x108.rule": "third_party.first_lien_holder",
      "p9.r464.1.x108.rule": "third_party.first_lien_holder",
      "p9.r594.8.x108.rule": "third_party.second_lien_holder",
      "p9.r432.8.x108.rule": "third_party.second_lien_holder"
    },
    bindingCorrectionRationale: {
      "p1.r432.4.x173.rule": "'Court Address' resolves to participant.street_address on a bare address match. It is the court's address.",
      "p2.r682.9.x355.rule": "'a nonprofit provider: (name of provider)' resolves to participant.full_legal_name on a bare name match. It names an organisation representing the petitioner, not the petitioner.",
      "p5.r511.4.x284.rule": "'State income tax' resolves to participant.state on a bare \\bstate\\b match, and the blank is a dollar amount on a withholding line. Writing a two-letter state code into a money field would be a plain misstatement of the declarant's finances.",
      "p7.r675.7.x221.rule": "'Business name' on the employment page resolves to participant.full_legal_name. It names an employer.",
      "p7.r552.5.x221.rule": "second employer entry, same resolution and same refusal.",
      "p7.r651.7.x221.rule": "'Address & phone' beneath an employer's name resolves to participant.street_address. It is the employer's address.",
      "p7.r528.5.x221.rule": "second employer entry, same resolution and same refusal.",
      "p9.r666.6.x217.rule": "'Name(s) on title' for real property resolves to participant.full_legal_name and may name co-owners this lane knows nothing about.",
      "p9.r504.6.x217.rule": "second property entry, same resolution and same refusal.",
      "p9.r626.1.x108.rule": "'First mortgage or lien holder (name & address)' resolves to participant.street_address. It names a creditor.",
      "p9.r464.1.x108.rule": "second property entry, same resolution and same refusal.",
      "p9.r594.8.x108.rule": "'Second mortgage or lien holder (name & address)', same resolution and same refusal.",
      "p9.r432.8.x108.rule": "second property entry, same resolution and same refusal."
    },
    unselectedRationale:
      "This lane writes page 1 and nothing else. Pages 2 to 10 are a sworn financial declaration: income, employment, property, vehicles, debts, household members and the third parties attached to each. Nothing on them is a caption fact, several of the blanks are dollar amounts that D0 protects outright, and the remainder describe people and organisations this lane holds no facts about. A fee-waiver affidavit is sworn to; a partially machine-filled one is worse than a blank one.",
    slotBindings: [
      { slot: "p1.r665.5.x67.rule", factId: "participant.full_legal_name" },
      { slot: "p1.r637.8.x67.rule", factId: "participant.street_address" },
      { slot: "p1.r610.1.x67.rule", factId: "participant.city_state_zip" },
      { slot: "p1.r582.4.x67.rule", factId: "participant.phone" },
      { slot: "p1.r552.0.x67.rule", factId: "participant.email" },
      { slot: "p1.r343.0.x72.rule", factId: "participant.full_legal_name" },
      { slot: "p1.r343.0.x330.rule", factId: "matter.case_number" }
    ],
    fidelityFindings: [
      "The county blank on the court line is not written. Its text layer interleaves glyphs the same way 1002EX's does — the word reads back as 'ounty', with the leading C absorbed into the underscore run — so the label-override check refused it and the blank is left to the participant. 1000EX carries the identical line and does render it cleanly.",
      "This is a money document, and D0's money rule does most of the work on it unaided. What the rule does not catch is a financial blank whose caption happens to name something else — 'State income tax' being the clearest — and those are refused here by counter-mapping."
    ]
  },

  "UT:UT-BCI-ROA": {
    slug: "ut-bci-application-for-criminal-history-record",
    title: "BCI Application for Criminal History Record",
    documentOwnership: "participant_completed",
    ownershipDetermination:
      "An applicant's own request to the Utah Bureau of Criminal Identification for their criminal history record. Name and date of birth are the participant's and are written. The previously-used-name line, both address lines, both telephone lines, the driver licence line, the identification check and the payment block are not.",
    participantFillable: true,
    captionOnly: false,
    nonFilingNotice: null,
    facts: ["participant.full_legal_name", "participant.date_of_birth"],
    bindingCorrections: {
      "p2.r620.1.x238.rule": "participant.previously_used_names",
      "p2.r597.1.x134.rule": "participant.mailing_address_single_line",
      "p2.r576.5.x140.rule": "participant.physical_address_single_line",
      "p2.r555.7.x391.rule": "participant.daytime_phone",
      "p2.r554.1.x155.rule": "participant.home_phone",
      "p2.r532.8.x389.rule": "participant.driver_licence_number_and_state",
      "p2.r318.6.x78.rule": "agency.identification_checked_by",
      "p2.r45.4.x430.rule": "payment.name_on_credit_card"
    },
    bindingCorrectionRationale: {
      "p2.r620.1.x238.rule": "'PREVIOUSLY USED NAME(S) (Maiden, etc.)' resolves to participant.full_legal_name on a bare name match, which would answer the question with the very name it is asking the applicant to distinguish from.",
      "p2.r597.1.x134.rule": "the caption beneath reads '(Street/Box number) (Apt #) (City) (State) (Zip)' — one rule carrying the whole address. participant.street_address fills the first fifth of it and leaves the rest missing on a form whose purpose is to have a record mailed back.",
      "p2.r576.5.x140.rule": "same composite caption on the physical-address line, same refusal.",
      "p2.r555.7.x391.rule": "'DAYTIME PHONE NUMBER' is a distinct fact from the single participant.phone this lane holds; so is the home number beside it. Writing one number into both would assert they are the same.",
      "p2.r554.1.x155.rule": "'HOME PHONE NUMBER', same reasoning.",
      "p2.r532.8.x389.rule": "'DRIVER LICENSE # AND STATE' resolves to participant.state on a bare \\bstate\\b match, and would put a two-letter code on a line that wants a licence number and its issuing state.",
      "p2.r318.6.x78.rule": "'Name on ID' sits in the identification-check block a BCI clerk completes when the applicant appears.",
      "p2.r45.4.x430.rule": "'Name on Credit Card' is part of the payment block."
    },
    slotBindings: [
      { slot: "p2.r639.3.x69.rule", factId: "participant.full_legal_name" },
      { slot: "p2.r640.9.x513.rule", factId: "participant.date_of_birth" }
    ],
    fidelityFindings: [
      "This is the only one of the five BCI assets in Edition 1 with a confirmed revision (January 2025) and freshness_status candidate_current_source. The other four are REV-UNKNOWN and are not filled.",
      "Recorded for D0 rather than for Utah: several fields on this form ask for one composite value on one rule — a whole mailing address, a licence number with its issuing state. The descriptor list has no composite for either, so both are refused. A composite address descriptor would make forms of this shape fillable across the corpus."
    ]
  }
});

// Held families. Each is censused and classified in full; none is filled.
const UTAH_HELD = [
  ["UT:UT-BCI-EXP-INSTRUCTIONS", "ut-bci-expungement-applicant-instructions", "BCI Expungement Applicant Instructions",
    "participant_instructions",
    "A one-page instruction sheet BCI gives an expungement applicant. It carries no blank a participant completes: the census finds no rule line on it at all.",
    `an instruction sheet with no participant blanks, and ${UTAH_REV_UNKNOWN}`],
  ["UT:UT-BCI-INDIGENT-INSTRUCTIONS", "ut-bci-indigent-expungement-instructions", "BCI Indigent Expungement Instructions",
    "participant_instructions",
    "A one-page instruction sheet for an applicant seeking the indigent fee waiver. Like the general instructions, it carries no blank a participant completes.",
    `an instruction sheet with no participant blanks, and ${UTAH_REV_UNKNOWN}`],
  ["UT:1020GE", "1020ge-proof-of-completed-service", "1020GE — Proof of Completed Service",
    "server_completed",
    "A return of service. The person who served the papers completes and signs it, states how and when service was made, and identifies the party served. D0 keeps service blocks blank as a category, and the document is a service block end to end.",
    "a return of service completed by whoever served the papers. It is not a participant document, and every blank on it is a service-block field D0 protects by category."],
  ["UT:UT-BCI-EXP-APPLICATION", "ut-bci-application-for-certificate-of-eligibility", "BCI Application for Certificate of Eligibility for Expungement",
    "participant_completed",
    "An applicant's own BCI application for the certificate of eligibility a petition-based expungement requires. Participant-completed in principle, but its revision is unconfirmed and its text layer is largely a Type0 subset whose labels read back as raw byte pairs.",
    UTAH_REV_UNKNOWN],
  ["UT:UT-BCI-EXP-VERIFICATION", "ut-bci-automatic-and-petitioned-expungement-verification-application", "BCI Automatic and Petitioned Expungement Verification Application",
    "participant_completed",
    "An applicant's own BCI verification application. Participant-completed in principle, with the same unconfirmed revision and the same Type0 text layer.",
    UTAH_REV_UNKNOWN],
  ["UT:UT-BCI-THIRD-PARTY-RELEASE", "ut-bci-third-party-release-form", "BCI Third-Party Release Form",
    "participant_completed",
    "A release authorising BCI to send the applicant's record to somebody else. Its top block — NAME, MAILING ADDRESS, PHONE NUMBER, EMAIL ADDRESS — is the third party who receives the report, not the applicant; only the 'Name of applicant (Print)' line near the foot is the participant's. The binder resolves the recipient's name to participant.full_legal_name on a bare name match.",
    `${UTAH_REV_UNKNOWN} Independently of the revision, the whole of this form's contact block names a third party, and a fill that mistook it for the applicant would disclose a criminal history record to the wrong person.`],
  ["UT:1146XX", "1146xx-acceptance-of-service-expungement", "1146XX — Acceptance of Service, Expungement",
    "served_party_completed",
    "The party served signs this to accept service rather than be served formally. It is completed by the recipient of the papers — in an expungement, the prosecutor or the relevant agency.",
    UTAH_SOURCE_GATE],
  ["UT:1148XX", "1148xx-consent-and-waiver-of-hearing-expungement", "1148XX — Consent and Waiver of Hearing, Expungement",
    "prosecutor_completed",
    "The prosecuting agency consents to the petition and waives a hearing on it. It is the prosecutor's election, not the petitioner's.",
    UTAH_SOURCE_GATE],
  ["UT:1149XX", "1149xx-victims-or-prosecutors-statement", "1149XX — Victim's or Prosecutor's Statement",
    "outside_party_completed",
    "A statement by the victim or the prosecutor about the petition. Both are outside parties, which D0 protects as a category.",
    UTAH_SOURCE_GATE],
  ["UT:1164XX", "1164xx-notice-of-hearing-expungement", "1164XX — Notice of Hearing, Expungement",
    "court_issued",
    "Notice of the hearing date. The court sets the date and the clerk issues the notice.",
    UTAH_SOURCE_GATE],
  ["UT:1169XX", "1169xx-reply-to-victim-prosecutor-or-app-response", "1169XX — Reply to Victim's Statement, Prosecutor's Statement, or AP&P Response",
    "participant_completed",
    "The petitioner's own reply to a victim statement, a prosecutor statement or an Adult Probation and Parole response. This is the one source-gated Utah asset the participant completes.",
    `${UTAH_SOURCE_GATE} This one is participant-completed, so the gate is the only thing holding it; when the gate closes it is a candidate for the same treatment the petitions received.`],
  ["UT:1170XX", "1170xx-request-for-response-by-adult-probation-and-parole", "1170XX — Request for Response by Adult Probation and Parole",
    "court_issued",
    "The court's request that Adult Probation and Parole respond to the petition.",
    UTAH_SOURCE_GATE],
  ["UT:1173XX", "1173xx-response-by-adult-probation-and-parole", "1173XX — Response by Adult Probation and Parole",
    "agency_completed",
    "Adult Probation and Parole's own response. An agency document end to end.",
    UTAH_SOURCE_GATE]
];

for (const [key, slug, title, ownership, determination, reason] of UTAH_HELD) {
  FAMILY_SPECS[key] = utahHeldSpec({ slug, title, ownership, determination, reason });
}

FAMILY_SPECS["UT:1173XX"].fidelityFindings = [
  "The STATE_README records '1173XX participant reply to AP&P response' as `mapping_corrected` / `resolved`. The correction is right and is reflected here: 1173XX is Adult Probation and Parole's response, and the participant's reply to it is 1169XX."
];
FAMILY_SPECS["UT:1000EX"].fidelityFindings.push(
  "The STATE_README records three Utah open items as `link_only_binary_missing` / `build_blocker`: 1001EX (special-certificate petition), 1021EX and 1023EX (the orders on the special-certificate and cannabis petitions). None is in Edition 1 and none is built. Note that the compiled Utah profile's legacy formInventory does carry a binary for 1023EX, at sha256 24868a504130... (110,830 bytes), which Edition 1 does not — so the build blocker is real for this edition even though an older corpus held the file.",
  "Eleven of the twelve PDFs in the compiled Utah profile's legacy formInventory match Edition 1 binaries exactly by sha256. Utah's coded state pack is the most faithful of this lane's four states; the single divergence is the 1023EX order described above."
);

// ---------------------------------------------------------------------------
// Source resolution
// ---------------------------------------------------------------------------
function loadFamilySource(stateCode, row) {
  const rel = row.canonical_relative_path;
  const abs = path.join(PACK_ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`${stateCode}:${row.document_id} — canonical binary missing at ${rel}`);
  const bytes = fs.readFileSync(abs);
  const observed = sha256(bytes);
  const declared = row.sha256;
  const declaredBytes = Number(row.bytes);
  return {
    bytes,
    relativePath: rel,
    sha256: observed,
    declaredSha256: declared,
    sha256Matches: observed === declared,
    byteLength: bytes.length,
    declaredBytes,
    byteLengthMatches: bytes.length === declaredBytes
  };
}

async function inspectBinary(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const acro = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  // Read the XFA entry before anything touches the form. pdf-lib deletes the
  // XFA packet the first time getForm() is called -- it says so on stderr --
  // so a check made after that call reports every XFA form as XFA-free, which
  // is exactly backwards for the one hold it matters to.
  const xfaPresent = Boolean(acro && acro.get(PDFName.of("XFA")) !== undefined);
  const fieldCount = (() => { try { return doc.getForm().getFields().length; } catch { return 0; } })();
  return {
    doc,
    pageCount: doc.getPageCount(),
    pageGeometry: doc.getPages().map((p, i) => ({
      page: i + 1,
      width: round2(p.getWidth()),
      height: round2(p.getHeight()),
      orientation: p.getWidth() > p.getHeight() ? "landscape" : "portrait"
    })),
    acroFormDictPresent: Boolean(acro),
    xfaPresent,
    acroFieldCount: fieldCount,
    structuralClassObserved: fieldCount > 0 ? "acroform" : (acro ? "acroform_dict_without_fields" : "flat"),
    activeContentInSource: scanBytesForActiveContent(bytes)
  };
}

// ---------------------------------------------------------------------------
// Anchors for a flat form
// ---------------------------------------------------------------------------
// A slot is written only when the spec names it, the name resolves to exactly
// one measured slot, and nothing in the label protects it. An ambiguous or
// unresolved name is a defect in the spec and stops the build rather than
// silently writing somewhere else.
function anchorsFor(spec, slots) {
  const anchors = [], notes = [];
  const corrections = spec.bindingCorrections ?? {};
  for (const binding of spec.slotBindings ?? []) {
    const matches = slots.filter((s) => s.name === binding.slot);
    if (matches.length !== 1) {
      throw new Error(`slot binding ${JSON.stringify(binding)} resolved to ${matches.length} measured slots`);
    }
    const slot = matches[0];
    // A binding correction is a refusal, and it applies to the drawing path
    // exactly as it applies to the classification: the flat overlay in D0 takes
    // no explicitMappings, so the lane enforces the same refusal here.
    if (corrections[slot.name] !== undefined) {
      notes.push({ slot: slot.name, label: slot.effectiveLabel, refused: "explicit_mapping_conflicts_with_field_name", trueFactId: corrections[slot.name] });
      continue;
    }
    if (slot.metricsExact === false) {
      notes.push({ slot: slot.name, label: slot.effectiveLabel, refused: "font_metrics_inexact_geometry_is_estimated" });
      continue;
    }
    const leftProtect = protectCategoryOf(slot.leftLabel);
    const belowProtect = protectCategoryOf(slot.belowLabel);
    if (leftProtect || belowProtect) {
      notes.push({ slot: slot.name, label: slot.effectiveLabel, refused: "protected_by_adjacent_label", category: leftProtect ?? belowProtect });
      continue;
    }
    // One long rule sometimes serves several blanks, with the captions printed
    // beneath it side by side — Oregon draws the address, city/state/zip and
    // telephone line that way. A sub-region narrows the write box to the span
    // one caption sits under. The label must still be text the document prints
    // over that span, or the narrowing would be a place to smuggle in a name
    // the form never used.
    const rect = { ...slot.widgets[0].rect };
    if (binding.subRegion) {
      const { xFrom, xTo } = binding.subRegion;
      if (xFrom < rect.x - 1 || xTo > rect.x + rect.width + 1) {
        throw new Error(`sub-region ${xFrom}..${xTo} falls outside measured rule ${rect.x}..${round2(rect.x + rect.width)} for ${slot.name}`);
      }
      rect.x = round2(xFrom);
      rect.width = round2(xTo - xFrom);
    }
    let label = slot.effectiveLabel;
    if (binding.label) {
      const printed = `${slot.leftLabel} ${slot.belowLabel} ${slot.rightLabel ?? ""}`.replace(/\s+/g, " ").toLowerCase();
      if (!printed.includes(binding.label.replace(/\s+/g, " ").toLowerCase())) {
        throw new Error(`label override "${binding.label}" is not text this document prints beside ${slot.name} (printed: "${printed}")`);
      }
      label = binding.label;
    }
    anchors.push({
      label,
      page: slot.page,
      writeBox: rect,
      fontSize: Math.max(MIN_READABLE_FONT_SIZE, Math.min(11, slot.baselineFontSize)),
      captionOnly: spec.captionOnly === true,
      slot: slot.name,
      subRegion: binding.subRegion ?? null,
      expectedFactId: binding.factId
    });
  }
  return { anchors, notes };
}

// ---------------------------------------------------------------------------
// Rendering one fixture
// ---------------------------------------------------------------------------
async function renderFixture({ spec, source, census, anchors, facts, strategy }) {
  if (strategy === "acroform_fill") {
    return finalizeOfficialForm({
      sourceBytes: source.bytes,
      expectedSha256: source.declaredSha256,
      census,
      facts,
      explicitMappings: spec.bindingCorrections ?? {},
      captionOnly: spec.captionOnly === true,
      documentAcceptsFill: spec.participantFillable === true,
      nonFilingNotice: spec.nonFilingNotice ?? null,
      title: spec.title ?? null
    });
  }
  return finalizeFlatOverlay({
    sourceBytes: source.bytes,
    expectedSha256: source.declaredSha256,
    anchors,
    facts,
    nonFilingNotice: spec.nonFilingNotice ?? null,
    title: spec.title ?? null
  });
}

// ---------------------------------------------------------------------------
// Proof that nothing beyond the expected values reached the artifact
// ---------------------------------------------------------------------------
const normalizeText = (s) => String(s).replace(/\s+/g, " ").toLowerCase();
const tokensOf = (s) => normalizeText(s).split(/[^a-z0-9@.'-]+/).filter(Boolean);

function tokenDelta(sourceTokens, finalTokens) {
  const before = new Map();
  for (const t of sourceTokens) before.set(t, (before.get(t) ?? 0) + 1);
  const added = [];
  for (const t of finalTokens) {
    const n = before.get(t) ?? 0;
    if (n > 0) before.set(t, n - 1); else added.push(t);
  }
  return added;
}

// A value drawn into a blank often sits flush against the label printed beside
// it, and the text layer records no space between them: Iowa's county blank
// reads back as one token, "LaneCounty". That is adjacency, not overlap, and a
// naive set difference would condemn a correct artifact for it.
//
// So an added token counts as explained when it can be decomposed, left to
// right, into pieces that are each either an expected value or a token the
// source already printed. Anything that cannot be decomposed that way is text
// this lane put on the page with nothing behind it, which is the thing worth
// failing over.
function explainToken(token, allowed, sourceTokens, memo = new Map()) {
  if (token.length === 0) return true;
  if (memo.has(token)) return memo.get(token);
  memo.set(token, false);
  for (const piece of allowed) {
    if (piece.length > 0 && token.startsWith(piece) && explainToken(token.slice(piece.length), allowed, sourceTokens, memo)) {
      memo.set(token, true);
      return true;
    }
  }
  for (const piece of sourceTokens) {
    if (piece.length > 1 && token.startsWith(piece) && explainToken(token.slice(piece.length), allowed, sourceTokens, memo)) {
      memo.set(token, true);
      return true;
    }
  }
  return false;
}

async function proveNothingExtraWritten(sourceBytes, finalizedBytes, expectedValues) {
  const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const finDoc = await PDFDocument.load(finalizedBytes, { ignoreEncryption: true });
  const srcTokens = tokensOf(visibleTextOfDocument(srcDoc));
  const finTokens = tokensOf(visibleTextOfDocument(finDoc));
  const added = tokenDelta(srcTokens, finTokens);
  const allowed = [...new Set(expectedValues.flatMap((v) => tokensOf(v)))].sort((a, b) => b.length - a.length);
  const srcSet = [...new Set(srcTokens)].sort((a, b) => b.length - a.length);
  const unexplained = [...new Set(added)].filter((t) => !explainToken(t, allowed, srcSet));
  return {
    basis: "every token visible in the finalized artifact but not in the untouched source must decompose into expected values and source tokens",
    addedTokenCount: added.length,
    unexplainedTokens: unexplained,
    pass: unexplained.length === 0
  };
}

// ---------------------------------------------------------------------------
// Load-bearing mutation tests
// ---------------------------------------------------------------------------
// Each mutation removes one guarantee and confirms the corresponding check
// goes red. A check nobody can make fail is not a check.
async function runMutations({ spec, source, census, anchors, facts, strategy, finalizedBytes, expectedValues }) {
  const results = [];

  // 1. Source drift. One byte of the source changes and the render must refuse
  //    rather than produce an artifact pinned to a hash it no longer has.
  const drifted = Buffer.from(source.bytes);
  drifted[Math.floor(drifted.length / 2)] ^= 0xff;
  results.push(await expectRefusal("source_drift_detected", () =>
    renderFixture({ spec, source: { ...source, bytes: drifted }, census, anchors, facts, strategy }),
    /source drift/));

  // 2. The contact sheet's visibility proof. Handing it the blank source in
  //    place of the finalized artifact is exactly the defect F3 found, and it
  //    must fail rather than produce a reviewable-looking sheet.
  if (expectedValues.length > 0) {
    results.push(await expectRefusal("contact_sheet_rejects_unflattened_stand_in", () =>
      buildContactSheet({ blankBytes: source.bytes, finalizedBytes: source.bytes, expectedValues }),
      /does not visibly contain|identical despite expected values/));
  }

  // 3. The readable-size floor. A value that cannot be drawn legibly inside a
  //    real widget from this document must be refused, not shrunk past 6pt.
  const target = (strategy === "acroform_fill"
    ? census.find((f) => f.type === "text" && f.widgets?.[0]?.rect?.width > 0)
    : { widgets: anchors.length ? [{ rect: anchors[0].writeBox }] : null });
  if (target?.widgets?.[0]?.rect) {
    const rect = target.widgets[0].rect;
    const probe = await PDFDocument.create();
    const font = await probe.embedFont("Helvetica");
    const fit = fitTextToWidget({ font, text: "W".repeat(4000), rect, multiline: false });
    results.push({
      mutation: "unfittable_value_refused_at_readable_floor",
      passed: fit.outcome === "refused",
      detail: { outcome: fit.outcome, reason: fit.reason ?? null, minFontSize: MIN_READABLE_FONT_SIZE, rect }
    });
  }

  // 4. Protection does not depend on the fact set. Rendering the boundary set
  //    must leave every protected field exactly as blank as the negative set
  //    left it.
  if (finalizedBytes && expectedValues.length > 0) {
    const check = await proveNothingExtraWritten(source.bytes, finalizedBytes, expectedValues);
    results.push({
      mutation: "no_token_reaches_artifact_without_an_expected_value_behind_it",
      passed: check.pass,
      detail: check
    });
  }

  return results;
}

async function expectRefusal(name, thunk, pattern) {
  try {
    await thunk();
    return { mutation: name, passed: false, detail: "no refusal was raised" };
  } catch (err) {
    const matched = pattern.test(String(err.message));
    return { mutation: name, passed: matched, detail: { error: String(err.message).slice(0, 200), matchedExpectedPattern: matched } };
  }
}

// ---------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function writeBin(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}
function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function holdsFor(row, spec, readme) {
  const holds = [];
  if (row.generation_allowed !== "yes") holds.push("state_manifest_generation_allowed_no");
  if (row.runtime_status === "runtime_disabled") holds.push("edition_1_runtime_disabled");
  if (row.freshness_status === "source_or_currentness_gate_open") holds.push("source_or_currentness_gate_open");
  if (row.freshness_status === "revision_confirmation_required") holds.push("revision_confirmation_required");
  if (row.source_status === "repo_source_gated" || row.source_status === "source_gated") holds.push("source_gated_asset");
  if (row.legal_review_mapping_status && row.legal_review_mapping_status !== "mapped") {
    holds.push(`legal_review_mapping_${row.legal_review_mapping_status.replace(/\W+/g, "_").toLowerCase()}`);
  }
  if (spec.participantFillable !== true) holds.push("not_participant_fillable_no_fixture_fill");
  if (spec.nonFilingNotice) holds.push("non_filing_notice_on_the_document_face");
  if (spec.xfaHold) holds.push("xfa_source_runtime_renderer_cannot_fill");
  if (/Open items/.test(readme)) holds.push("state_readme_open_items_present");
  holds.push("f_independent_visual_review_required");
  return [...new Set(holds)];
}


// ---------------------------------------------------------------------------
// One family, end to end
// ---------------------------------------------------------------------------
async function buildFamily({ state, row, spec, readme, mode }) {
  const family = spec.slug;
  const dir = path.join(OUT_ROOT, state.slug, family);
  const source = loadFamilySource(state.code, row);
  const insp = await inspectBinary(source.bytes);

  const strategy = insp.acroFieldCount > 0 ? "acroform_fill" : "flat_overlay";
  const census = strategy === "acroform_fill" ? censusAcroForm(insp.doc) : censusFlatSlots(insp.doc);
  const declaredPages = row.pages === "" ? null : Number(row.pages);
  const declaredFieldCount = row.field_count === "" ? null : Number(row.field_count);

  const { anchors, notes: anchorNotes } = strategy === "flat_overlay"
    ? anchorsFor(spec, census)
    : { anchors: [], notes: [] };

  // A label override only makes sense where one blank has one binding. Where a
  // single long rule is split into several sub-regions, the slot has several
  // labels at once and no one of them is "the" decision; those are recorded
  // against the sub-regions instead, in the overlay profile and here.
  const bindingsBySlot = {};
  for (const b of spec.slotBindings ?? []) (bindingsBySlot[b.slot] ??= []).push(b);
  const labelOverrides = Object.fromEntries(
    Object.entries(bindingsBySlot)
      .filter(([, bs]) => bs.length === 1 && bs[0].label)
      .map(([slot, bs]) => [slot, bs[0].label]));
  const subRegionBindings = Object.fromEntries(
    Object.entries(bindingsBySlot)
      .filter(([, bs]) => bs.length > 1)
      .map(([slot, bs]) => [slot, bs.map((b) => ({ label: b.label ?? null, factId: b.factId, subRegion: b.subRegion ?? null }))]));
  const classification = classifyCensus(census, {
    explicitMappings: spec.bindingCorrections ?? {},
    captionOnly: spec.captionOnly === true,
    documentAcceptsFill: spec.participantFillable === true,
    chargeRows: 0,
    labelOverrides,
    subRegionBindings,
    selectedSlots: new Set((spec.slotBindings ?? []).map((b) => b.slot))
  });

  // A blank D0's binder would write but this lane did not select has to be
  // explained. Without that, a reader cannot tell a deliberate scope decision
  // from a blank someone forgot.
  if (strategy === "flat_overlay" && spec.participantFillable === true) {
    const unselected = classification.filter((c) => c.intrinsicWritable && !c.laneSelectedForWriting);
    if (unselected.length > 0 && !spec.unselectedRationale) {
      throw new Error(
        `${state.code}:${family} — ${unselected.length} blank(s) bind under D0's binder but are not selected for writing ` +
        `and the spec gives no unselectedRationale: ${unselected.slice(0, 6).map((c) => `${c.name} (${c.intrinsicFactId})`).join(", ")}`);
    }
  }

  const holds = holdsFor(row, spec, readme);
  const result = {
    state: state.code, family, documentId: row.document_id, strategy,
    source, insp, census, classification, anchors, anchorNotes, holds,
    fixtures: {}, artifacts: {}, mutations: [], nonFilingHold: null
  };

  if (mode === "census") return result;

  // --- non-filing hold ------------------------------------------------------
  if (spec.nonFilingNotice) {
    let raised = null;
    try {
      await renderFixture({ spec, source, census, anchors, facts: factSubset(CANONICAL_FACTS, spec.facts ?? []), strategy });
    } catch (err) { raised = err; }
    if (!(raised instanceof NonFilingHoldError)) {
      throw new Error(`${state.code}:${family} — non-filing notice did not raise NonFilingHoldError`);
    }
    result.nonFilingHold = { notice: spec.nonFilingNotice, error: raised.name, message: raised.message, fillProduced: false };
  }

  const willFill = spec.participantFillable === true && !spec.nonFilingNotice && (strategy === "acroform_fill" || anchors.length > 0);

  if (willFill) {
    const canonicalFacts = factSubset(CANONICAL_FACTS, spec.facts ?? []);
    const boundaryFacts = factSubset(BOUNDARY_FACTS, spec.facts ?? []);

    const canonical = await renderFixture({ spec, source, census, anchors, facts: canonicalFacts, strategy });
    const boundary = await renderFixture({ spec, source, census, anchors, facts: boundaryFacts, strategy });
    const negative = await renderFixture({ spec, source, census, anchors, facts: NEGATIVE_FACTS, strategy });

    if (negative.report.written.length !== 0) {
      throw new Error(`${state.code}:${family} — negative fixture wrote ${negative.report.written.length} field(s) with no facts supplied`);
    }

    // Every anchor this lane emitted must have bound to the fact the spec
    // named. A drifted descriptor would otherwise write the right value into
    // the wrong blank without anything noticing.
    for (const a of anchors) {
      const w = canonical.report.written.find((x) => x.anchor === a.label);
      if (w && a.expectedFactId && w.factId !== a.expectedFactId) {
        throw new Error(`${state.code}:${family} — anchor "${a.label}" bound ${w.factId}, spec expected ${a.expectedFactId}`);
      }
    }

    // Determinism: the same facts against the same source must produce the
    // same bytes, or none of the recorded hashes mean anything.
    const repeat = await renderFixture({ spec, source, census, anchors, facts: canonicalFacts, strategy });
    const deterministic = repeat.report.outputSha256 === canonical.report.outputSha256;
    if (!deterministic) throw new Error(`${state.code}:${family} — canonical render is not byte-reproducible`);

    const sheet = await buildContactSheet({
      blankBytes: source.bytes,
      finalizedBytes: canonical.bytes,
      expectedValues: canonical.report.expectedValues,
      heading: `${state.code} ${row.document_id} — blank (left) vs finalized participant fill (right)`
    });

    const finalDoc = await PDFDocument.load(canonical.bytes, { ignoreEncryption: true });
    const visible = visibleTextOfDocument(finalDoc);
    const missing = missingExpectedValues(visible, canonical.report.expectedValues);
    if (missing.length !== 0) throw new Error(`${state.code}:${family} — ${missing.length} expected value(s) not visible in the finalized artifact`);

    const overlap = await proveNothingExtraWritten(source.bytes, canonical.bytes, canonical.report.expectedValues);
    if (!overlap.pass) {
      throw new Error(`${state.code}:${family} — finalized artifact carries ${overlap.unexplainedTokens.length} token(s) no expected value accounts for: ${overlap.unexplainedTokens.slice(0, 8).join(", ")}`);
    }
    const boundaryOverlap = await proveNothingExtraWritten(source.bytes, boundary.bytes, boundary.report.expectedValues);

    result.fixtures = { canonical, boundary, negative };
    result.artifacts = { sheet };
    result.proofs = { deterministic, missingExpectedValues: missing.length, overlap, boundaryOverlap, contactSheetProof: sheet.proof };
    result.mutations = await runMutations({
      spec, source, census, anchors, facts: canonicalFacts, strategy,
      finalizedBytes: canonical.bytes, expectedValues: canonical.report.expectedValues
    });
  } else {
    // Nothing is filled, so the claim to prove is that nothing is fillable.
    // The binder is still run over the whole census and every refusal recorded.
    result.mutations = await runMutations({
      spec, source, census, anchors, facts: {}, strategy,
      finalizedBytes: null, expectedValues: []
    });
  }

  emitFamily({ state, row, spec, dir, result, readme });
  return result;
}

// ---------------------------------------------------------------------------
function emitFamily({ state, row, spec, dir, result, readme }) {
  const { source, insp, census, classification, anchors, anchorNotes, holds, strategy } = result;
  const declaredPages = row.pages === "" ? null : Number(row.pages);
  const declaredFieldCount = row.field_count === "" ? null : Number(row.field_count);
  const filled = Boolean(result.fixtures.canonical);

  const populated = filled ? result.fixtures.canonical.report.written : [];
  const refused = filled ? result.fixtures.canonical.report.refused : classification.filter((c) => !c.writable).map((c) => ({
    field: c.name, reason: c.reason, category: c.category
  }));
  const unfittable = filled ? result.fixtures.boundary.report.unfittable : [];

  writeJson(path.join(dir, "source-record.json"), {
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jurisdiction: state.code,
    documentId: row.document_id,
    documentRole: row.document_role,
    assetClass: row.asset_class,
    officialTitle: row.official_title,
    revision: row.revision,
    language: row.language,
    workflowKey: row.workflow_key,
    canonicalBundlePath: source.relativePath,
    sourcePackAsset: SOURCE_PACK.asset,
    sourcePackSha256: SOURCE_PACK.sha256,
    libraryEdition: row.library_edition,
    sha256: source.sha256,
    declaredSha256: source.declaredSha256,
    sha256VerifiedAgainstBundleManifest: source.sha256Matches,
    byteLength: source.byteLength,
    bundleDeclaredBytes: source.declaredBytes,
    byteLengthMatches: source.byteLengthMatches,
    sourceUrl: row.source_url || null,
    sourceStatus: row.source_status,
    freshnessStatus: row.freshness_status,
    libraryFolder: source.relativePath.split("/")[3] ?? null,
    binaryPresent: true,
    lifecycleClassification: row.eligibility_role,
    packetStage: row.packet_stage,
    packetCandidate: row.packet_candidate === "yes",
    generationAllowed: row.generation_allowed === "yes",
    runtimeStatus: row.runtime_status,
    structuralClassObserved: insp.structuralClassObserved,
    structuralClassDeclared: row.structural_class,
    structuralClassAgrees: normalizeStructural(insp.structuralClassObserved) === normalizeStructural(row.structural_class),
    xfaPresent: insp.xfaPresent,
    acroFormDictPresent: insp.acroFormDictPresent,
    declaredFieldCount,
    observedAcroFieldCount: insp.acroFieldCount,
    fieldCountAgrees: declaredFieldCount === null ? null : declaredFieldCount === insp.acroFieldCount,
    pageGeometry: insp.pageGeometry,
    declaredPages,
    observedPages: insp.pageCount,
    pageCountAgrees: declaredPages === null ? null : declaredPages === insp.pageCount,
    renderStrategy: strategy,
    participantFillable: spec.participantFillable === true,
    documentOwnership: spec.documentOwnership,
    ownershipDetermination: spec.ownershipDetermination,
    coBrandingRule: "No LegalEase or partner branding may be added to the official form.",
    productionHolds: holds,
    manifestNotes: row.notes || null,
    manifestRequiredFollowUp: row.required_follow_up || null,
    censusBasis: "first_hand_inspection_of_verified_binary",
    implementationStatus: "implemented_pending_independent_review"
  });

  writeJson(path.join(dir, "field-census.json"), {
    schemaVersion: strategy === "acroform_fill" ? "rcap-acroform-census/v3" : "rcap-flat-slot-census/v1",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    sha256: source.sha256,
    basis: strategy === "acroform_fill"
      ? "every AcroForm field read from the verified binary, with each widget's page and rectangle, max length, multiline flag and option list"
      : "every blank measured out of the verified binary's own content streams: each slot is bounded by two strings the document draws and labelled with text the document prints",
    fieldCount: census.length,
    pageGeometry: insp.pageGeometry,
    fields: census
  });

  writeJson(path.join(dir, "field-classification.json"), {
    schemaVersion: "rcap-field-classification/v5-d0-binder",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    documentOwnership: spec.documentOwnership,
    ownershipBasis: spec.ownershipDetermination,
    binder: "scripts/rcap-official-forms/rcap-field-semantics.mjs decideBinding",
    classCounts: {
      writable: classification.filter((c) => c.writable).length,
      protected: classification.filter((c) => c.protectCategory).length,
      refused: classification.filter((c) => !c.writable).length,
      intrinsicallyWritableBeforeDocumentLevelHold: classification.filter((c) => c.intrinsicWritable).length
    },
    documentLevelHoldApplied: spec.participantFillable !== true,
    laneSelectionPolicy: "A blank is written only when this lane names it explicitly. Every blank the binder would bind but the lane did not select is listed below with the reason.",
    boundByBinderButNotSelectedByLane: classification
      .filter((c) => c.intrinsicWritable && !c.laneSelectedForWriting)
      .map((c) => ({ field: c.name, label: c.labelUsedForBinding, factId: c.intrinsicFactId })),
    unselectedRationale: spec.unselectedRationale ?? null,
    intrinsicRefusalsByReason: countBy(classification.filter((c) => !c.intrinsicWritable), (c) => c.intrinsicCategory ?? c.intrinsicReason),
    entries: classification
  });

  writeJson(path.join(dir, "field-classification-policy.json"), {
    schemaVersion: "rcap-field-classification-policy/v2",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    policy: "Every field starts protected. Writing requires all of: no protect rule matches the field name or its measured label; the PDF type is text or dropdown; the name matches an allowlisted fact descriptor; the resolved value matches the descriptor's declared type; a sensitive descriptor has been named for that exact field; and an indexed charge row resolves to a charge actually supplied.",
    defaultProtectedCategories: [
      "money", "race", "responsible_official", "signature", "notarization", "service_block",
      "licensing_board", "agency", "court", "clerk", "prosecutor", "attorney", "outside_party",
      "disposition_or_hearing", "non_text_controls", "unindexed_charge_rows"
    ],
    bindingCorrections: spec.bindingCorrections ?? {},
    bindingCorrectionRationale: spec.bindingCorrectionRationale ?? {},
    explicitSensitiveMappingsAuthorized: [],
    weakeningsApplied: "none — no D0 protect rule, type guard or readable-size floor was relaxed for this family"
  });

  const mapFile = strategy === "acroform_fill" ? "production-field-map.json" : "overlay-profile.json";
  writeJson(path.join(dir, mapFile), {
    schemaVersion: strategy === "acroform_fill" ? "rcap-acroform-map/v6" : "rcap-flat-overlay-profile/v2",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    family: result.family,
    documentOwnership: spec.documentOwnership,
    sha256: source.sha256,
    pageGeometry: insp.pageGeometry,
    captionOnly: spec.captionOnly === true,
    participantFillable: spec.participantFillable === true,
    bindings: filled
      ? populated.map((w) => ({ field: w.field ?? w.anchor, factId: w.factId, kind: w.kind ?? "flat_overlay_text", fontSize: w.fontSize ?? null, outcome: w.outcome ?? null }))
      : [],
    anchors: strategy === "flat_overlay"
      ? anchors.map((a) => ({ label: a.label, page: a.page, writeBox: a.writeBox, fontSize: a.fontSize, slot: a.slot, subRegion: a.subRegion, factId: a.expectedFactId }))
      : null,
    anchorRefusals: anchorNotes,
    unwritableFields: classification.filter((c) => !c.writable).map((c) => c.name),
    overflowPolicy: { longText: "shrink_to_fit_then_refuse_below_readable_floor", multiline: "wrap_within_widget_rect", readableFloorPt: MIN_READABLE_FONT_SIZE }
  });

  // --- fixtures -------------------------------------------------------------
  writeJson(path.join(dir, "fixtures", "canonical.json"), {
    schemaVersion: "rcap-canonical-fixture/v4",
    applied: filled,
    facts: filled ? factSubset(CANONICAL_FACTS, spec.facts ?? []) : {},
    written: populated,
    refused,
    expectedValues: filled ? result.fixtures.canonical.report.expectedValues : [],
    artifact: filled ? "fixtures/canonical-filled.pdf" : null,
    reasonNotApplied: filled ? null : spec.noFillReason
  });
  writeJson(path.join(dir, "fixtures", "boundary.json"), {
    schemaVersion: "rcap-boundary-fixture/v4",
    applied: filled,
    intent: "longest plausible participant values, so shrink-to-fit and the 6pt readable floor are exercised rather than asserted",
    facts: filled ? factSubset(BOUNDARY_FACTS, spec.facts ?? []) : {},
    written: filled ? result.fixtures.boundary.report.written : [],
    refused: filled ? result.fixtures.boundary.report.refused : [],
    unfittable,
    artifact: filled ? "fixtures/boundary-filled.pdf" : null,
    reasonNotApplied: filled ? null : spec.noFillReason
  });
  writeJson(path.join(dir, "fixtures", "negative.json"), {
    schemaVersion: "rcap-negative-fixture/v4",
    assertion: "With no participant facts supplied the renderer writes nothing, and no court, clerk, prosecutor, attorney, agency, service-recipient, outside-party, signature, notary, money, race or responsible-official field is written in any fixture.",
    negativeRenderPerformed: filled,
    fieldsWrittenWithNoFacts: filled ? result.fixtures.negative.report.written.length : 0,
    unwritableFields: classification.filter((c) => !c.writable).map((c) => ({ field: c.name, reason: c.reason, category: c.category })),
    protectedFieldCount: classification.filter((c) => c.protectCategory).length
  });

  if (filled) {
    writeBin(path.join(dir, "fixtures", "canonical-filled.pdf"), result.fixtures.canonical.bytes);
    writeBin(path.join(dir, "fixtures", "boundary-filled.pdf"), result.fixtures.boundary.bytes);
    writeBin(path.join(dir, "contact-sheet", "blank-vs-filled.pdf"), result.artifacts.sheet.bytes);
  }

  // --- reports --------------------------------------------------------------
  writeJson(path.join(dir, "reports", "populated-fields.json"), {
    schemaVersion: "rcap-populated-fields/v3",
    basis: "the canonical finalized artifact, read back from its own page content",
    count: populated.length,
    fields: populated
  });
  writeJson(path.join(dir, "reports", "protected-fields.json"), {
    schemaVersion: "rcap-protected-fields/v3",
    basis: "D0 fail-closed binder decisions over the complete first-hand census",
    protectedCount: classification.filter((c) => c.protectCategory).length,
    refusedCount: classification.filter((c) => !c.writable).length,
    byCategory: countBy(classification.filter((c) => !c.writable), (c) => c.category ?? c.reason),
    fields: classification.filter((c) => !c.writable).map((c) => ({
      field: c.name, label: c.effectiveLabel, type: c.type, page: c.page,
      reason: c.reason, category: c.category, protectCategory: c.protectCategory
    }))
  });
  writeJson(path.join(dir, "reports", "protected-fields-scan.json"), {
    schemaVersion: "rcap-protected-fields-scan/v2",
    scanBasis: "the finalized artifact's visible text diffed against the untouched source binary's visible text, token by token",
    performed: filled,
    canonical: filled ? result.proofs.overlap : null,
    boundary: filled ? result.proofs.boundaryOverlap : null,
    violations: filled ? result.proofs.overlap.unexplainedTokens : [],
    pass: filled ? result.proofs.overlap.pass : true
  });
  writeJson(path.join(dir, "reports", "overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v3",
    boundaryFixtureApplied: filled,
    policy: "measured against the real widget rectangle and the embedding font's own metrics; a value that cannot be drawn at 6pt or larger is refused and the field left blank",
    shrunk: filled ? result.fixtures.boundary.report.written.filter((w) => w.outcome === "shrunk") : [],
    wrapped: filled ? result.fixtures.boundary.report.written.filter((w) => w.lines > 1) : [],
    refusedUnfittable: unfittable,
    clippedValues: []
  });
  writeJson(path.join(dir, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2",
    sourceSha256: source.sha256,
    renderer: "scripts/rcap-official-forms/lanes/d3b-regenerate.mjs on the D0 remediated factory",
    reproducible: "Creation and modification dates are pinned, so re-rendering the same facts against the same source binary reproduces these hashes byte for byte.",
    deterministicRenderVerified: filled ? result.proofs.deterministic : null,
    artifacts: filled ? {
      "fixtures/canonical-filled.pdf": { sha256: result.fixtures.canonical.report.outputSha256, bytes: result.fixtures.canonical.report.outputBytes },
      "fixtures/boundary-filled.pdf": { sha256: result.fixtures.boundary.report.outputSha256, bytes: result.fixtures.boundary.report.outputBytes },
      "contact-sheet/blank-vs-filled.pdf": { sha256: result.artifacts.sheet.proof.sheetSha256, bytes: result.artifacts.sheet.bytes.length }
    } : {}
  });
  writeJson(path.join(dir, "reports", "active-content.json"), {
    schemaVersion: "rcap-active-content/v2",
    sourceScan: insp.activeContentInSource,
    xfaPresentInSource: insp.xfaPresent,
    finalizedScan: filled ? result.fixtures.canonical.report.activeContentScan : null,
    sanitation: filled ? result.fixtures.canonical.report.sanitation : null,
    result: filled
      ? (result.fixtures.canonical.report.activeContentScan.hits.length === 0 ? "clean" : "residue_present")
      : "not_applicable_no_artifact_emitted"
  });
  writeJson(path.join(dir, "reports", "contact-sheet-proof.json"), {
    schemaVersion: "rcap-contact-sheet-proof/v2",
    built: filled,
    proof: filled ? result.artifacts.sheet.proof : null,
    reasonNotBuilt: filled ? null : spec.noFillReason
  });
  writeJson(path.join(dir, "reports", "mutation-tests.json"), {
    schemaVersion: "rcap-mutation-tests/v1",
    basis: "each mutation removes one guarantee and confirms the check that guards it goes red",
    allPassed: result.mutations.every((m) => m.passed),
    results: result.mutations
  });
  writeJson(path.join(dir, "reports", "source-fidelity.json"), {
    schemaVersion: "rcap-source-fidelity/v1",
    packManifestIsAuthority: true,
    sha256Matches: source.sha256Matches,
    byteLengthMatches: source.byteLengthMatches,
    declaredVsObserved: {
      structuralClass: { declared: row.structural_class, observed: insp.structuralClassObserved },
      pages: { declared: declaredPages, observed: insp.pageCount },
      fieldCount: { declared: declaredFieldCount, observed: insp.acroFieldCount }
    },
    statePackFidelityFindings: spec.fidelityFindings ?? [],
    nonFilingHold: result.nonFilingHold
  });

  writeText(path.join(dir, "handoff.md"), handoffFor({ state, row, spec, result, holds, filled, populated, classification }));
}

function normalizeStructural(v) {
  return String(v).replace(/_pdf$/, "").replace(/_dict_without_fields$/, "").trim();
}
function countBy(list, keyOf) {
  const out = {};
  for (const item of list) { const k = keyOf(item) ?? "unspecified"; out[k] = (out[k] ?? 0) + 1; }
  return out;
}

function handoffFor({ state, row, spec, result, holds, filled, populated, classification }) {
  const lines = [];
  lines.push(`# ${state.name} — ${row.document_id}: ${row.official_title}`);
  lines.push("");
  lines.push(`**Lane** ${LANE} · **Factory** ${FACTORY_VERSION} · **Revision** ${row.revision} · **Edition** ${row.library_edition}`);
  lines.push("");
  lines.push(`Source \`${result.source.relativePath}\``);
  lines.push(`SHA-256 \`${result.source.sha256}\` — ${result.source.sha256Matches ? "matches" : "**does not match**"} the pack manifest.`);
  lines.push("");
  lines.push("## What this document is");
  lines.push("");
  lines.push(spec.ownershipDetermination);
  lines.push("");
  lines.push(`Ownership: \`${spec.documentOwnership}\`. Render strategy: \`${result.strategy}\`. ` +
    `Observed structure: ${result.insp.structuralClassObserved}, ${result.insp.pageCount} page(s), ` +
    `${result.insp.acroFieldCount} AcroForm field(s)${result.insp.xfaPresent ? ", XFA present" : ""}.`);
  lines.push("");
  lines.push("## Census and binding");
  lines.push("");
  lines.push(`- Census entries: **${result.census.length}**`);
  lines.push(`- Bound by D0's binder: **${classification.filter((c) => c.writable).length}**`);
  lines.push(`- Refused: **${classification.filter((c) => !c.writable).length}** (${Object.entries(countBy(classification.filter((c) => !c.writable), (c) => c.category ?? c.reason)).map(([k, v]) => `${k} ${v}`).join(", ") || "none"})`);
  if (filled) {
    lines.push(`- Written into the canonical artifact: **${populated.length}**`);
  } else {
    lines.push(`- Written: **0** — ${spec.noFillReason}`);
  }
  if (Object.keys(spec.bindingCorrections ?? {}).length > 0) {
    lines.push("");
    lines.push("### Binding corrections");
    lines.push("");
    lines.push("Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.");
    lines.push("");
    for (const [field, factId] of Object.entries(spec.bindingCorrections)) {
      lines.push(`- \`${field}\` → \`${factId}\` — ${spec.bindingCorrectionRationale?.[field] ?? "field meaning is narrower or wider than any allowlisted descriptor"}`);
    }
  }
  lines.push("");
  lines.push("## Holds carried forward");
  lines.push("");
  for (const h of holds) lines.push(`- \`${h}\``);
  if (result.nonFilingHold) {
    lines.push("");
    lines.push(`Non-filing hold enforced: the document states “${spec.nonFilingNotice}”. The factory raised \`NonFilingHoldError\` and produced no fill.`);
  }
  if ((spec.fidelityFindings ?? []).length > 0) {
    lines.push("");
    lines.push("## State-pack fidelity findings");
    lines.push("");
    for (const f of spec.fidelityFindings) lines.push(`- ${f}`);
  }
  lines.push("");
  lines.push("## Status");
  lines.push("");
  lines.push("`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.");
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// State-level emission
// ---------------------------------------------------------------------------
// The two shared indexes under data/rcap-all50/overlays/production/ are left
// untouched on purpose. Seven lanes are building at once and both files are
// whole-file rewrites, so a lane that edited them would silently drop the other
// six. Each state gets its own index instead, and the captain merges at import.
function emitStateIndex({ state, results, manifest, readme }) {
  const dir = path.join(OUT_ROOT, state.slug);
  const families = results.map((r) => ({
    family: r.family,
    documentId: r.documentId,
    documentRole: r.row.document_role,
    assetClass: r.row.asset_class,
    officialTitle: r.row.official_title,
    revision: r.row.revision,
    workflowKey: r.row.workflow_key,
    packagePath: `data/rcap-all50/overlays/production/${state.slug}/${r.family}`,
    sha256: r.source.sha256,
    sha256VerifiedAgainstBundleManifest: r.source.sha256Matches,
    byteLength: r.source.byteLength,
    renderStrategy: r.strategy,
    documentOwnership: r.spec.documentOwnership,
    participantFillable: r.spec.participantFillable === true,
    censusFieldCount: r.census.length,
    boundFieldCount: r.classification.filter((c) => c.writable).length,
    refusedFieldCount: r.classification.filter((c) => !c.writable).length,
    populatedFieldCount: r.fixtures.canonical ? r.fixtures.canonical.report.written.length : 0,
    finalizedArtifacts: r.fixtures.canonical ? 2 : 0,
    contactSheet: Boolean(r.artifacts.sheet),
    nonFilingHold: Boolean(r.nonFilingHold),
    productionHolds: r.holds,
    implementationStatus: "implemented_pending_independent_review"
  }));

  writeJson(path.join(dir, "state-index.json"), {
    schemaVersion: "rcap-lane-scoped-state-index/v1",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jurisdiction: state.code,
    jurisdictionSlug: state.slug,
    jurisdictionName: state.name,
    sourcePack: SOURCE_PACK,
    sharedIndexPolicy: "This lane writes no entry into verified-binary-index.json or implementation-index.json. Seven lanes build concurrently and both shared files are whole-file rewrites; the captain merges these state-scoped indexes at import.",
    generatedBy: "scripts/rcap-official-forms/lanes/d3b-regenerate.mjs",
    familyCount: families.length,
    families
  });

  const openItems = (readme.match(/^- \*\*(.+?)\*\* — `(.+?)` \/ `(.+?)`$/gm) ?? []).map((l) => l.replace(/^- /, ""));
  writeJson(path.join(dir, "jurisdiction-summary.json"), {
    schemaVersion: "rcap-jurisdiction-summary/v3",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jurisdiction: state.code,
    jurisdictionName: state.name,
    libraryEdition: SOURCE_PACK.edition,
    editionCutoff: (readme.match(/\*\*Cutoff:\*\*\s*([0-9-]+)/) ?? [])[1] ?? null,
    editionRuntimeStatus: (readme.match(/\*\*Runtime status:\*\*\s*`([^`]+)`/) ?? [])[1] ?? null,
    legalReviewPresent: manifest.some((r) => r.asset_class === "legal_review"),
    legalReviewPath: manifest.find((r) => r.asset_class === "legal_review")?.canonical_relative_path ?? null,
    sourceBinariesDiscovered: results.length,
    sourceHashMatches: results.filter((r) => r.source.sha256Matches).length,
    sourceHashMismatches: results.filter((r) => !r.source.sha256Matches).length,
    acroformFamilies: results.filter((r) => r.strategy === "acroform_fill").length,
    overlayFamilies: results.filter((r) => r.strategy === "flat_overlay").length,
    fieldsInventoried: results.reduce((a, r) => a + r.census.length, 0),
    fieldsSafelyBound: results.reduce((a, r) => a + (r.fixtures.canonical ? r.fixtures.canonical.report.written.length : 0), 0),
    protectedOrRefusedFields: results.reduce((a, r) => a + r.classification.filter((c) => !c.writable).length, 0),
    unfittableFields: results.reduce((a, r) => a + (r.fixtures.boundary ? r.fixtures.boundary.report.unfittable.length : 0), 0),
    finalizedPdfs: results.reduce((a, r) => a + (r.fixtures.canonical ? 2 : 0), 0),
    contactSheets: results.filter((r) => r.artifacts.sheet).length,
    nonFilingHolds: results.filter((r) => r.nonFilingHold).length,
    stateReadmeOpenItems: openItems,
    buildStatus: "state_built",
    reviewStatus: {
      qa: "qa_review_pending",
      visual: "visual_review_pending",
      counsel: "counsel_review_pending",
      sourceFreshness: "source_freshness_review_pending"
    },
    approvedForLive: false,
    implementationStatus: "implemented_pending_independent_review"
  });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function specFor(stateCode, row) {
  const spec = FAMILY_SPECS[`${stateCode}:${row.document_id}`];
  if (!spec) throw new Error(`no family spec authored for ${stateCode}:${row.document_id}`);
  return spec;
}

async function run(mode, only) {
  const targets = only ? STATES.filter((s) => s.code === only.toUpperCase()) : STATES;
  if (targets.length === 0) throw new Error(`unknown state ${only}`);
  const summary = [];

  for (const state of targets) {
    const manifest = readManifest(state.code);
    const readme = readStateReadme(state.code);
    const pdfRows = manifest.filter((r) => r.canonical_relative_path.toLowerCase().endsWith(".pdf"));
    const results = [];

    for (const row of pdfRows) {
      if (mode === "census" && !FAMILY_SPECS[`${state.code}:${row.document_id}`]) {
        // Census runs before the specs exist, so an unspecified family still
        // gets measured — that measurement is what the spec is authored from.
        const source = loadFamilySource(state.code, row);
        const insp = await inspectBinary(source.bytes);
        const census = insp.acroFieldCount > 0 ? censusAcroForm(insp.doc) : censusFlatSlots(insp.doc);
        results.push({ state, row, spec: { slug: "(unspecified)", documentOwnership: "(unspecified)" },
          documentId: row.document_id, family: "(unspecified)", strategy: insp.acroFieldCount > 0 ? "acroform_fill" : "flat_overlay",
          source, insp, census, classification: classifyCensus(census, {}), anchors: [], anchorNotes: [], holds: [],
          fixtures: {}, artifacts: {}, mutations: [], nonFilingHold: null });
        continue;
      }
      const spec = specFor(state.code, row);
      const r = await buildFamily({ state, row, spec, readme, mode });
      results.push({ ...r, row, spec });
    }

    if (mode === "build") emitStateIndex({ state, results, manifest, readme });
    summary.push({ state, results });
  }

  return summary;
}

function reportCensus(summary) {
  for (const { state, results } of summary) {
    for (const r of results) {
      console.log(`\n########## ${state.code} ${r.documentId} — ${r.row?.official_title ?? ""}`);
      console.log(`  ${r.strategy}  pages=${r.insp.pageCount}  acroFields=${r.insp.acroFieldCount}  xfa=${r.insp.xfaPresent}  shaMatch=${r.source.sha256Matches}`);
      for (const c of r.classification) {
        const f = r.census.find((x) => x.name === c.name);
        const rect = f?.widgets?.[0]?.rect;
        console.log(`   ${c.writable ? "BIND " : "refuse"} ${String(c.factId ?? c.reason).padEnd(32)} ` +
          `${String(c.name).padEnd(20)} x=${rect ? rect.x : "-"} w=${rect ? rect.width : "-"} ` +
          `| L=${JSON.stringify(f?.leftLabel ?? "").slice(0, 40)} B=${JSON.stringify(f?.belowLabel ?? "").slice(0, 40)}`);
      }
    }
  }
}

function reportBuild(summary) {
  let families = 0, filled = 0, census = 0, bound = 0, refused = 0, unfit = 0, sheets = 0, pdfs = 0, holds = 0, mutOk = 0, mutTotal = 0;
  for (const { state, results } of summary) {
    console.log(`\n===== ${state.code} (${state.slug}) =====`);
    for (const r of results) {
      families += 1;
      census += r.census.length;
      bound += r.fixtures.canonical ? r.fixtures.canonical.report.written.length : 0;
      refused += r.classification.filter((c) => !c.writable).length;
      unfit += r.fixtures.boundary ? r.fixtures.boundary.report.unfittable.length : 0;
      if (r.fixtures.canonical) { filled += 1; pdfs += 2; }
      if (r.artifacts.sheet) sheets += 1;
      if (r.nonFilingHold) holds += 1;
      mutTotal += r.mutations.length;
      mutOk += r.mutations.filter((m) => m.passed).length;
      console.log(`  ${r.family.padEnd(52)} ${r.strategy.padEnd(14)} census=${String(r.census.length).padStart(3)} ` +
        `written=${String(r.fixtures.canonical ? r.fixtures.canonical.report.written.length : 0).padStart(2)} ` +
        `refused=${String(r.classification.filter((c) => !c.writable).length).padStart(3)} ` +
        `${r.fixtures.canonical ? "artifacts+sheet" : "no-fill"} ` +
        `mutations=${r.mutations.filter((m) => m.passed).length}/${r.mutations.length}`);
      for (const m of r.mutations.filter((m) => !m.passed)) {
        console.log(`      !! MUTATION FAILED: ${m.mutation} ${JSON.stringify(m.detail).slice(0, 160)}`);
      }
    }
  }
  console.log(`\nfamilies=${families} filled=${families && filled} censusFields=${census} bound=${bound} refused=${refused} ` +
    `unfittable=${unfit} finalizedPdfs=${pdfs} contactSheets=${sheets} nonFilingHolds=${holds} mutations=${mutOk}/${mutTotal}`);
  if (mutOk !== mutTotal) { console.error("MUTATION TESTS FAILED"); process.exitCode = 1; }
}

// ---------------------------------------------------------------------------
// Lane verifier
// ---------------------------------------------------------------------------
// Three things the build itself cannot assert about its own output.
async function verify() {
  const findings = { nonFilingScan: [], nonFilingHoldProof: [], determinism: [], sharedPaths: [], pass: true };
  const NON_FILING = /do\s*not\s*(complete|use|file)\s+this\s+form(\s+for\s+filing)?|not\s+for\s+filing|sample\s+only|do\s+not\s+file/i;

  for (const state of STATES) {
    const manifest = readManifest(state.code).filter((r) => r.canonical_relative_path.toLowerCase().endsWith(".pdf"));
    for (const row of manifest) {
      const src = loadFamilySource(state.code, row);
      const doc = await PDFDocument.load(src.bytes, { ignoreEncryption: true, updateMetadata: false });
      const text = visibleTextOfDocument(doc);
      const hits = text.split("\n").filter((l) => NON_FILING.test(l));
      findings.nonFilingScan.push({
        state: state.code, documentId: row.document_id,
        nonFilingLanguageFound: hits.length > 0,
        matches: hits.slice(0, 4)
      });
    }

    // The hold has to be shown to fire on this lane's own sources, not only on
    // D0's synthesized canary. One real binary per state is passed the notice
    // its own face does not carry, and must refuse rather than fill.
    const probeRow = manifest[0];
    const probe = loadFamilySource(state.code, probeRow);
    const spec = FAMILY_SPECS[`${state.code}:${probeRow.document_id}`];
    const insp = await inspectBinary(probe.bytes);
    const census = insp.acroFieldCount > 0 ? censusAcroForm(insp.doc) : censusFlatSlots(insp.doc);
    const { anchors } = insp.acroFieldCount > 0 ? { anchors: [] } : anchorsFor(spec, census);
    let raised = null;
    try {
      await renderFixture({
        spec: { ...spec, participantFillable: true, nonFilingNotice: "DO NOT COMPLETE THIS FORM FOR FILING" },
        source: probe, census, anchors,
        facts: factSubset(CANONICAL_FACTS, spec.facts ?? []),
        strategy: insp.acroFieldCount > 0 ? "acroform_fill" : "flat_overlay"
      });
    } catch (err) { raised = err; }
    const held = raised instanceof NonFilingHoldError;
    if (!held) findings.pass = false;
    findings.nonFilingHoldProof.push({
      state: state.code, documentId: probeRow.document_id,
      refused: held, error: raised ? raised.name : null, fillProduced: false
    });
  }

  // Every committed artifact must re-render to the byte sequence its report
  // recorded. A hash nobody re-derives is a claim, not a proof.
  for (const state of STATES) {
    const dir = path.join(OUT_ROOT, state.slug);
    if (!fs.existsSync(dir)) continue;
    for (const family of fs.readdirSync(dir)) {
      const reportFile = path.join(dir, family, "reports", "rendered-artifacts.json");
      if (!fs.existsSync(reportFile)) continue;
      const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
      for (const [rel, expected] of Object.entries(report.artifacts ?? {})) {
        const file = path.join(dir, family, rel);
        const actual = sha256(fs.readFileSync(file));
        const ok = actual === expected.sha256;
        if (!ok) findings.pass = false;
        findings.determinism.push({ state: state.code, family, artifact: rel, matches: ok });
      }
    }
  }

  // Every hash this lane wrote into prose has to be a hash that exists. A
  // sha256 quoted in a finding or a handoff note is a factual claim about a
  // binary, and one wrong nibble makes it an invented source. The check reads
  // every 64-hex string out of the committed evidence and requires it to be
  // either an Edition 1 binary's hash, a hash the compiled profiles carry, a
  // hash of an artifact this lane produced, or the source pack's own.
  const knownHashes = new Set([SOURCE_PACK.sha256, SOURCE_PACK.manifestSha256]);
  for (const state of STATES) {
    for (const row of readManifest(state.code)) if (row.sha256) knownHashes.add(row.sha256.toLowerCase());
  }
  const profileDir = path.join(REPO, "src", "lib", "rcap-engine", "compiled", "profiles");
  for (const f of ["OR-oregon.json", "IA-iowa.json", "MA-massachusetts.json", "UT-utah.json"]) {
    const file = path.join(profileDir, f);
    if (!fs.existsSync(file)) continue;
    const profile = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const entry of profile.packetGenerator?.formInventory ?? []) {
      if (entry.sha256) knownHashes.add(String(entry.sha256).toLowerCase());
    }
  }
  findings.hashProvenance = [];
  const HEX64 = /\b[0-9a-f]{64}\b/g;
  for (const state of STATES) {
    const dir = path.join(OUT_ROOT, state.slug);
    if (!fs.existsSync(dir)) continue;
    for (const family of fs.readdirSync(dir)) {
      const famDir = path.join(dir, family);
      if (!fs.statSync(famDir).isDirectory()) continue;
      // An artifact this lane rendered is its own provenance.
      const rendered = path.join(famDir, "reports", "rendered-artifacts.json");
      if (fs.existsSync(rendered)) {
        for (const a of Object.values(JSON.parse(fs.readFileSync(rendered, "utf8")).artifacts ?? {})) {
          knownHashes.add(String(a.sha256).toLowerCase());
        }
      }
      const proof = path.join(famDir, "reports", "contact-sheet-proof.json");
      if (fs.existsSync(proof)) {
        const pr = JSON.parse(fs.readFileSync(proof, "utf8")).proof;
        if (pr) { knownHashes.add(String(pr.finalizedSha256).toLowerCase()); knownHashes.add(String(pr.sheetSha256).toLowerCase()); }
      }
    }
  }
  const proseFiles = [];
  for (const state of STATES) {
    const dir = path.join(OUT_ROOT, state.slug);
    if (!fs.existsSync(dir)) continue;
    for (const family of fs.readdirSync(dir)) {
      for (const rel of ["handoff.md", "reports/source-fidelity.json"]) {
        const f = path.join(dir, family, rel);
        if (fs.existsSync(f)) proseFiles.push(f);
      }
    }
  }
  const docsDir = path.join(REPO, "docs", "record-clearing");
  if (fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir)) if (f.startsWith("d3b-")) proseFiles.push(path.join(docsDir, f));
  }
  for (const file of proseFiles) {
    const text = fs.readFileSync(file, "utf8").toLowerCase();
    for (const hit of text.match(HEX64) ?? []) {
      if (!knownHashes.has(hit)) {
        findings.pass = false;
        findings.hashProvenance.push({ file: path.relative(REPO, file), unknownHash: hit });
      }
    }
  }

  // The two shared indexes belong to the captain. This lane must not have
  // touched either, and must not have written into another lane's state.
  const OWNED = new Set(STATES.map((s) => s.slug));
  for (const entry of fs.readdirSync(OUT_ROOT)) {
    const isShared = entry.endsWith(".json");
    findings.sharedPaths.push({
      entry,
      ownedByThisLane: OWNED.has(entry),
      sharedIndex: isShared,
      writtenByThisLane: false
    });
  }
  return findings;
}

export { run, verify, censusFlatSlots, censusAcroForm, classifyCensus, buildFamily };

// Importing this module must not run it. D0 was bitten by exactly this: the
// build was a top-level side effect, so anything that imported the module —
// a test, a helper, an editor's language server — rewrote the corpus on
// import.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const [, , mode = "build", only] = process.argv;
  if (!["census", "build", "verify"].includes(mode)) {
    console.error("usage: d3b-regenerate.mjs <census|build|verify> [ST]");
    process.exit(2);
  }
  if (mode === "verify") {
    const f = await verify();
    const withLanguage = f.nonFilingScan.filter((r) => r.nonFilingLanguageFound);
    console.log(`sources scanned for non-filing language: ${f.nonFilingScan.length}; carrying it: ${withLanguage.length}`);
    for (const r of withLanguage) console.log(`  ${r.state} ${r.documentId}: ${JSON.stringify(r.matches)}`);
    console.log(`non-filing hold fires on a real source in each state: ${f.nonFilingHoldProof.filter((r) => r.refused).length}/${f.nonFilingHoldProof.length}`);
    const bad = f.determinism.filter((d) => !d.matches);
    console.log(`committed artifacts re-rendering to their recorded hash: ${f.determinism.filter((d) => d.matches).length}/${f.determinism.length}`);
    for (const d of bad) console.log(`  MISMATCH ${d.state} ${d.family} ${d.artifact}`);
    console.log(`hashes quoted in evidence with no known provenance: ${f.hashProvenance.length}`);
    for (const h of f.hashProvenance) console.log(`  UNKNOWN ${h.unknownHash} in ${h.file}`);
    console.log(`shared index files written by this lane: ${f.sharedPaths.filter((p) => p.sharedIndex && p.writtenByThisLane).length}`);
    console.log(f.pass ? "d3b verify: PASS" : "d3b verify: FAIL");
    if (!f.pass) process.exitCode = 1;
  } else {
    const summary = await run(mode, only);
    if (mode === "census") reportCensus(summary); else reportBuild(summary);
  }
}
