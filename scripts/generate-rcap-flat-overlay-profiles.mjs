#!/usr/bin/env node
// Derives a flat-overlay write-box profile for every family whose verified
// binary is in the clone, from the form's own bytes.
//
//   node scripts/generate-rcap-flat-overlay-profiles.mjs
//   node scripts/generate-rcap-flat-overlay-profiles.mjs --check
//
// This is the CR-266 measurement generalised. Wisconsin CR-266 was measured by
// hand, then corrected by independent review after the first attempt guessed
// placement from rasterised dark runs and got every baseline wrong, invented a
// 213pt Case No. box where the real rule is 77.16pt, and omitted the venue rule
// entirely. Doing that by hand 87 more times would reproduce those mistakes 87
// more times, so the corrected method is the shared one: captions come from the
// text-showing operators, write boxes come from the `re` rectangles the form
// itself draws, and nothing that is not in the content stream is asserted.
//
// A caption with no rule gets no coordinate. That is the whole discipline: the
// form either expresses where a value goes or it does not, and inventing the
// difference is how a value lands in a court-use cell.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { ruleLinesOf, ruleForCaption, ruleBeforeCaption } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { FACT_DESCRIPTORS, protectCategoryOf, haystack } from "./rcap-official-forms/rcap-field-semantics.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/flat-overlay-profile-derivation.json");
const checkOnly = process.argv.includes("--check");

const SCHEMA = "rcap-flat_overlay-map/v7-content-stream-measured";
// The same geometry CR-266 was corrected to, applied everywhere: the box starts
// 1.5pt inside the rule so the glyphs do not sit on its left tick, the baseline
// is 2pt above the rule so descenders clear it, and the right edge stops at the
// rule's end or the first divider crossing it, whichever comes first.
const INSET_X = 1.5;
// The right edge stops short of the rule end for the same reason the left edge
// starts inside it: a value that touches a divider reads as crossing it, and on
// CR-266 the far side of that divider is a court-use cell.
const INSET_RIGHT = 2;
const BASELINE_ABOVE_RULE = 2;
const BOX_HEIGHT = 12;
const FONT_SIZE = 9;

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

/** Every PDF in the clone by SHA-256, so a pinned source can be located. */
function binariesBySha() {
  const found = new Map();
  const skip = new Set(["node_modules", ".git", ".next", "tmp"]);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.pdf$/i.test(entry.name)) {
        const sha = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
        if (!found.has(sha)) found.set(sha, full);
      }
    }
  };
  walk(rootDir);
  return found;
}

// A caption is what the form prints beside a blank. Trailing punctuation and
// the run of underscores or periods some forms use as a leader are part of the
// blank, not of the label.
function captionTextOf(line) {
  return String(line.text ?? "")
    .replace(/[_.…]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[:.\s]+$/, "")
    .trim();
}

// A run in the extracted text is a glyph group, not a caption -- "Name Printed
// or Typed" arrives as sixteen of them. Captions are separated on the page by
// space, so the line is split where the gap between consecutive runs exceeds
// one, and each segment is a printed phrase.
function segmentsOf(line, gapThreshold = 8) {
  const runs = (line.runs ?? []).filter((r) => String(r.text ?? "").trim().length > 0);
  const segments = [];
  let current = null;
  for (const run of runs) {
    if (current && run.x - current.x2 <= gapThreshold) {
      current.text += run.text;
      current.x2 = run.x2;
    } else {
      if (current) segments.push(current);
      current = { text: run.text, x: run.x, x2: run.x2 };
    }
  }
  if (current) segments.push(current);
  return segments.filter((s) => s.text.trim().length > 0);
}

// A CID-encoded run with no ToUnicode map decodes to control characters and
// replacement glyphs. Reading a fact off that is reading a label that was never
// established, so it is refused by name rather than skipped.
function captionIsUndecodable(text) {
  const raw = String(text ?? "");
  if (raw.length === 0) return false;
  const suspect = [...raw].filter((ch) => ch.charCodeAt(0) < 32 || ch === "\uFFFD" || ch === "\u00B6").length;
  return suspect / raw.length > 0.15;
}

/**
 * The one fact a caption names, or a refusal.
 *
 * Deny-first, exactly as field binding is: a caption that names something the
 * court owns is refused by category, and a caption matching more than one fact
 * is ambiguous and binds to nothing. A descriptor that requires an explicit
 * mapping is never satisfied by a printed label alone -- an offence date read
 * off a caption would be a criminal fact asserted from a guess.
 */
function factForCaption(caption) {
  if (captionIsUndecodable(caption)) {
    return { factId: null, refusal: "caption_not_decodable", detail: "the run is CID-encoded with no ToUnicode map, so the printed label cannot be read from these bytes" };
  }
  // A blank's printed label is a short noun phrase: "Date of Birth", "Case
  // No.", "COUNTY". Running heads and body prose contain the same words -- the
  // running head "STATE OF WISCONSIN, CIRCUIT COURT," contains "state", and
  // binding it wrote a state abbreviation across the caption box border.
  const words = caption.split(/\s+/).filter(Boolean).length;
  if (caption.length < 3 || caption.length > 30 || words > 4) {
    return { factId: null, refusal: "not_a_caption", detail: `${caption.length} characters, ${words} words` };
  }
  const category = protectCategoryOf(caption);
  if (category) return { factId: null, refusal: "protected_by_category", detail: category };

  const hay = haystack(caption);
  const matches = FACT_DESCRIPTORS.filter((d) => d.match.test(hay) && !(d.refuseWhen && d.refuseWhen.test(hay)));
  if (matches.length === 0) return { factId: null, refusal: "no_fact_descriptor_matches", detail: null };
  if (matches.some((d) => d.requiresExplicitMapping)) {
    return { factId: null, refusal: "requires_explicit_mapping", detail: matches.map((d) => d.factId).join(", ") };
  }
  if (matches.length > 1) {
    return { factId: null, refusal: "caption_matches_more_than_one_fact", detail: matches.map((d) => d.factId).join(", ") };
  }
  return { factId: matches[0].factId, refusal: null, detail: null };
}

const derivations = [];
const binaries = binariesBySha();

for (const stateDir of fs.readdirSync(OVERLAY_DIR).sort()) {
  const statePath = path.join(OVERLAY_DIR, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;

  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const familyPath = path.join(statePath, familyDir);
    const record = readJson(path.join(familyPath, "source-record.json"));
    if (!record) continue;
    if (fs.existsSync(path.join(familyPath, "retirement.json"))) continue;
    if (record.structuralClassObserved !== "flat_pdf") continue;

    const jurisdiction = String(record.jurisdiction ?? stateDir).toUpperCase();
    const familyId = `${jurisdiction}:${familyDir}`;
    const sha = record.sha256 ?? null;
    const binary = sha ? binaries.get(sha) ?? null : null;
    const existing = readJson(path.join(familyPath, "overlay-profile.json"));

    if (!binary) {
      derivations.push({
        familyId, documentId: record.documentId ?? familyDir, sourceSha256: sha,
        derived: false,
        reason: "the verified source binary pinned by this record is not in the clone, and geometry is only ever read from the bytes",
        anchorsDerived: 0, captionsRefused: 0,
        hasExistingProfile: Boolean(existing)
      });
      continue;
    }

    const bytes = fs.readFileSync(binary);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const ruleLines = await ruleLinesOf(bytes);

    const anchors = [];
    const refusedCaptions = [];
    for (const [index, page] of doc.getPages().entries()) {
      const pageNumber = index + 1;
      const lines = groupIntoLines(extractTextItems(page));
      for (const line of lines) {
      // Both the whole line and each printed run are candidate captions. A
      // line like "Name Printed or Typed   Signature" holds two captions with
      // two different rules, and reading only the joined line would bind one
      // fact to the other's blank.
      const candidates = [
        { text: captionTextOf(line), x: line.x, y: line.y },
        ...segmentsOf(line).map((seg) => ({ text: captionTextOf(seg), x: seg.x, y: line.y }))
      ];
      const seen = new Set();
      for (const candidate of candidates) {
        const caption = candidate.text;
        if (!caption || seen.has(`${caption}|${candidate.x}`)) continue;
        seen.add(`${caption}|${candidate.x}`);
        const decision = factForCaption(caption);
        // Both layouts are tried and the nearer rule wins. Taking the leading
        // layout's answer whenever it has one put CR-266's venue value on the
        // caption box's border 4.8pt away instead of on the venue rule 2.2pt
        // away -- the right answer existed and was not looked at.
        const attempts = [
          ruleForCaption(ruleLines, { page: pageNumber, baselineY: candidate.y, labelX: candidate.x, label: caption }),
          ruleBeforeCaption(ruleLines, { page: pageNumber, baselineY: candidate.y, labelX: candidate.x, label: caption })
        ];
        // The canonical association returns a REFUSAL OBJECT rather than null,
        // so `bound` is what separates an answer from a reason. Filtering on
        // truthiness would treat "two rules are indistinguishable here" as a
        // successful binding and then read `.rule` off it.
        const options = attempts.filter((o) => o?.bound);
        const found = options
          .sort((a, b) => Math.abs(a.rule.y - candidate.y) - Math.abs(b.rule.y - candidate.y))[0] ?? null;
        // A caption both layouts refused is not the same as a caption nobody
        // asked about, and the reason is the useful half.
        const refusals = attempts.filter((o) => o && !o.bound);

        if (!decision.factId) {
          // Any caption sitting on a real rule is worth naming: it is a blank
          // the form draws that this factory will not fill, and a reviewer
          // should see it was seen and refused rather than quietly dropped.
          // Captions with no rule and no fact are page prose, not blanks.
          if (found && decision.refusal !== "no_fact_descriptor_matches" && decision.refusal !== "not_a_caption") {
            refusedCaptions.push({
              page: pageNumber, caption, refusal: decision.refusal, detail: decision.detail,
              ruleLine: { x: found.rule.x, y: found.rule.y, endX: found.rule.endX },
              deliberatelyUnbound: decision.refusal === "protected_by_category"
            });
          }
          continue;
        }
        if (!found) {
          refusedCaptions.push({
            page: pageNumber, caption, factId: decision.factId,
            refusal: "no_rule_line_belongs_to_this_caption",
            detail: "The form does not draw a rectangle for this blank, so its position is set by a printed cell this document does not express. No coordinate is asserted.",
            ruleLine: null, deliberatelyUnbound: false
          });
          continue;
        }

        const x = Number((found.rule.x + INSET_X).toFixed(2));
        const width = Number((found.maxRightEdge - INSET_RIGHT - x).toFixed(2));
        if (width < 20) {
          refusedCaptions.push({
            page: pageNumber, caption, factId: decision.factId,
            refusal: "write_box_too_narrow_to_hold_a_value",
            detail: `${width}pt between the rule start and ${found.dividerX === null ? "the rule end" : `the divider at x=${found.dividerX}`}`,
            ruleLine: { x: found.rule.x, y: found.rule.y, endX: found.rule.endX },
            deliberatelyUnbound: false
          });
          continue;
        }

        anchors.push({
          label: caption,
          factId: decision.factId,
          page: pageNumber,
          writeBox: {
            x, y: Number((found.rule.y + BASELINE_ABOVE_RULE).toFixed(2)),
            width, height: BOX_HEIGHT
          },
          fontSize: FONT_SIZE,
          ruleLine: { x: found.rule.x, y: found.rule.y, endX: found.rule.endX },
          // Recorded because it is the boundary an over-long value must not
          // cross. CR-266's Case No. cell is 77.16pt wide with a divider at
          // x=464.26 and a court-use cell on the far side of it.
          dividerX: found.dividerX,
          maxRightEdge: found.maxRightEdge
        });
      }
      }
    }

    // One drawn rule can carry two blanks: CR-266 prints "Email Address" and
    // "Telephone Number" over a single 217pt line. Giving the rule to whichever
    // caption was read first writes an email address across the telephone
    // blank, so a contested rule binds to nothing and both captions are
    // reported. Splitting it would be a guess about where one blank ends.
    const byRule = new Map();
    for (const anchor of anchors) {
      const key = `${anchor.page}|${anchor.ruleLine.x}|${anchor.ruleLine.y}`;
      if (!byRule.has(key)) byRule.set(key, []);
      byRule.get(key).push(anchor);
    }
    const kept = [];
    for (const [, claimants] of byRule) {
      const distinct = new Set(claimants.map((a) => a.factId));
      if (distinct.size > 1) {
        for (const anchor of claimants) {
          refusedCaptions.push({
            page: anchor.page, caption: anchor.label, factId: anchor.factId,
            refusal: "more_than_one_caption_claims_this_rule",
            detail: `contested by ${[...distinct].join(", ")}; the rule is not split because where one blank ends is not drawn`,
            ruleLine: anchor.ruleLine, deliberatelyUnbound: false
          });
        }
        continue;
      }
      kept.push(claimants[0]);
    }
    // One fact, one place. WI DJ-LE-250B prints a caption that decodes to
    // "F8LLMIDDLENAME" on two different rules, and both bound
    // participant.middle_name -- so the participant's middle name would have
    // been written twice, in two places, on one filed record request. A fact
    // has one value; which of two blanks it belongs in is a decision the form
    // does not express, so neither is taken.
    const byFact = new Map();
    for (const anchor of kept) {
      if (!byFact.has(anchor.factId)) byFact.set(anchor.factId, []);
      byFact.get(anchor.factId).push(anchor);
    }
    const single = [];
    for (const [factId, claimants] of byFact) {
      if (claimants.length > 1) {
        for (const anchor of claimants) {
          refusedCaptions.push({
            page: anchor.page, caption: anchor.label, factId,
            refusal: "this_fact_claims_more_than_one_rule",
            detail: `${claimants.length} rules on this form would each receive ${factId}; the form does not say which blank it belongs in`,
            ruleLine: anchor.ruleLine, deliberatelyUnbound: false
          });
        }
        continue;
      }
      single.push(claimants[0]);
    }
    kept.length = 0;
    kept.push(...single);
    kept.sort((a, b) => a.page - b.page || b.writeBox.y - a.writeBox.y || a.writeBox.x - b.writeBox.x);

    const profile = {
      schemaVersion: SCHEMA,
      family: familyDir,
      documentOwnership: record.participantFillable ? "participant_completed" : "court_or_agency_completed",
      sha256: sha,
      derivedBy: "scripts/generate-rcap-flat-overlay-profiles.mjs",
      pageGeometry: doc.getPages().map((p, i) => ({
        page: i + 1, width: Math.round(p.getWidth()), height: Math.round(p.getHeight()),
        orientation: p.getWidth() > p.getHeight() ? "landscape" : "portrait"
      })),
      anchorBasis: "Write boxes read from the rectangles the form itself draws, extracted from the page content stream. Captions read from the text-showing operators of the same bytes. Nothing the content stream does not express is asserted.",
      overflowPolicy: { longText: "shrink_to_fit_then_addendum", multiline: "wrap_within_widget_rect" },
      // This file is review input. The render driver reads overlay-profile.json,
      // and a profile only becomes that after a person has looked at the
      // rendered result -- which is the step that caught every earlier
      // placement error on this form.
      requiresIndependentReviewBeforeUse: true,
      anchors: kept,
      refusedCaptions
    };

    const target = path.join(familyPath, "overlay-profile.derived.json");
    if (!checkOnly) fs.writeFileSync(target, `${JSON.stringify(profile, null, 2)}\n`);

    // Where a reviewed profile already exists, the derivation is compared to it
    // rather than replacing it. A generalisation that cannot reproduce the one
    // profile independent review corrected has not been shown to work.
    let agreement = null;
    if (existing && Array.isArray(existing.anchors) && existing.anchors.length > 0) {
      const matched = [];
      const missing = [];
      for (const reviewed of existing.anchors) {
        // An anchor the reviewed profile deliberately leaves unbound is
        // reproduced by refusing it, not by binding it.
        if (reviewed.deliberatelyUnbound || String(reviewed.expectedOutcome ?? "").startsWith("refused")) {
          const refused = refusedCaptions.find((r) => r.page === reviewed.page && r.ruleLine
            && r.deliberatelyUnbound
            && Math.abs(r.ruleLine.y - (reviewed.ruleLine?.y ?? -1)) <= 0.5);
          if (refused) { matched.push({ label: reviewed.label, factId: reviewed.factId, dx: 0, dy: 0, dWidth: 0, reproducedAsRefusal: refused.refusal }); }
          else missing.push({ label: reviewed.label, factId: reviewed.factId, page: reviewed.page, note: "deliberately unbound in review and not refused here" });
          continue;
        }
        const mine = kept.find((a) => a.factId === reviewed.factId && a.page === reviewed.page
          && Math.abs(a.writeBox.y - reviewed.writeBox.y) <= 0.5);
        if (!mine) { missing.push({ label: reviewed.label, factId: reviewed.factId, page: reviewed.page }); continue; }
        matched.push({
          label: reviewed.label, factId: reviewed.factId,
          dx: Number((mine.writeBox.x - reviewed.writeBox.x).toFixed(2)),
          dy: Number((mine.writeBox.y - reviewed.writeBox.y).toFixed(2)),
          dWidth: Number((mine.writeBox.width - reviewed.writeBox.width).toFixed(2))
        });
      }
      agreement = {
        reviewedAnchors: existing.anchors.length,
        derivedAnchors: kept.length,
        matchedAnchors: matched.length,
        missingFromDerivation: missing,
        largestOffsetPt: matched.reduce((m, a) => Math.max(m, Math.abs(a.dx), Math.abs(a.dy), Math.abs(a.dWidth)), 0),
        perAnchor: matched
      };
    }

    derivations.push({
      familyId, documentId: record.documentId ?? familyDir, sourceSha256: sha,
      sourceBinaryPath: path.relative(rootDir, binary),
      derived: true, profilePath: path.relative(rootDir, target),
      anchorsDerived: kept.length, captionsRefused: refusedCaptions.length,
      hasExistingProfile: Boolean(existing),
      agreementWithReviewedProfile: agreement
    });
  }
}

const payload = {
  schemaVersion: "rcap-flat-overlay-profile-derivation/v1",
  generatedBy: "scripts/generate-rcap-flat-overlay-profiles.mjs",
  purpose: "Derive flat-overlay write boxes from each form's own content stream, so every family is measured the way independent review required CR-266 to be measured.",
  method: {
    captions: "text-showing operators, grouped into lines, with leaders and trailing punctuation stripped",
    writeBoxes: "`re` rectangles drawn by the page, filtered to hairline horizontals at least 40pt long",
    boxFromRule: `x = rule.x + ${INSET_X}, baseline = rule.y + ${BASELINE_ABOVE_RULE}, right edge = min(rule end, first crossing divider)`,
    refusals: "a caption the court owns, a caption matching no fact or more than one, a criminal-fact caption needing an explicit mapping, and any caption with no rule of its own"
  },
  whatIsNotDerivedHere: [
    "whether the form is the current official edition",
    "whether a value belongs on this form at all",
    "any coordinate the content stream does not express"
  ],
  totals: {
    familiesConsidered: derivations.length,
    familiesDerived: derivations.filter((d) => d.derived).length,
    familiesAwaitingBinary: derivations.filter((d) => !d.derived).length,
    anchorsDerived: derivations.reduce((n, d) => n + d.anchorsDerived, 0),
    captionsRefused: derivations.reduce((n, d) => n + d.captionsRefused, 0)
  },
  derivations
};

if (checkOnly) {
  const committed = readJson(OUT);
  if (JSON.stringify(committed) !== JSON.stringify(payload)) {
    console.error("FAIL flat-overlay profile derivation has drifted from the committed record");
    process.exit(1);
  }
  console.log("OK flat-overlay profile derivation matches the committed record");
  process.exit(0);
}

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.totals, null, 1));
for (const d of derivations.filter((x) => x.agreementWithReviewedProfile)) {
  const a = d.agreementWithReviewedProfile;
  console.log(`${d.familyId}: ${a.matchedAnchors}/${a.reviewedAnchors} reviewed anchors reproduced, largest offset ${a.largestOffsetPt}pt`);
  for (const m of a.missingFromDerivation) console.log(`  MISSING ${m.factId} "${m.label}" page ${m.page}`);
}
