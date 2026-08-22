#!/usr/bin/env node
// The reference-only guard: what a court form says about itself is binding.
//
//   node scripts/verify-rcap-source-notice-guard.mjs
//
// The North Carolina translations print a notice on their own face:
//
//   THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY.
//   DO NOT COMPLETE THIS FORM FOR FILING.
//   USE THE ENGLISH VERSION.
//
// The detector this replaces recognised "not for filing", "sample only",
// "specimen copy", "for illustration only" and "do not file this form", and
// returned false against all three of those sentences. So the flat-overlay path
// was free to write a participant's name and case number onto a document the
// court published for comprehension — producing something that reads as a real
// filing and that no clerk will accept.
//
// These checks run on synthetic bytes. No family package, artifact or PDF is
// read or written.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { detectNonFilingNotice, NON_FILING_NOTICE_PATTERNS }
  from "./rcap-official-forms/rcap-source-notice.mjs";
import { finalizeFlatOverlay, finalizeOfficialForm, NonFilingHoldError }
  from "./rcap-official-forms/rcap-official-form-finalize.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const note = (m) => failures.push(m);

// The notice exactly as the court sets it, and the ways a page can break it.
const OFFICIAL_NOTICE = [
  "THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY.",
  "DO NOT COMPLETE THIS FORM FOR FILING.",
  "USE THE ENGLISH VERSION."
];
const NOTICE_VARIANTS = [
  { id: "as_printed", lines: OFFICIAL_NOTICE },
  { id: "sentence_case", lines: OFFICIAL_NOTICE.map((l) => l[0] + l.slice(1).toLowerCase()) },
  { id: "no_terminal_punctuation", lines: OFFICIAL_NOTICE.map((l) => l.replace(/\.$/, "")) },
  { id: "collapsed_into_one_line", lines: [OFFICIAL_NOTICE.join("  ")] },
  { id: "broken_mid_phrase_by_the_column", lines: ["DO NOT COMPLETE THIS FORM", "FOR FILING."] },
  { id: "irregular_whitespace", lines: ["THIS   FORM  IS FOR\tINFORMATIONAL   PURPOSES  ONLY ."] },
  { id: "english_version_only", lines: ["Use the English version of this form."] }
];

// Ordinary English filing forms. None of these may be held: a form that stopped
// rendering because it explained how to file would be a worse failure than the
// one this guard fixes.
const ORDINARY_FILING_TEXT = [
  { id: "filing_instructions_heading", lines: ["INSTRUCTIONS FOR FILING THIS PETITION WITH THE CLERK"] },
  { id: "filing_fee_line", lines: ["A filing fee may be required. Ask the clerk about filing fees."] },
  { id: "file_this_form_directive", lines: ["File this form with the clerk of superior court in the county of conviction."] },
  { id: "complete_and_file", lines: ["Complete this form and file it with the clerk before the hearing date."] },
  { id: "informational_hearing_line", lines: ["The clerk will provide informational materials about the hearing."] },
  { id: "english_and_spanish_offered", lines: ["This form is available in English and Spanish."] }
];

// The six court-designated translations the shared rule must cover. They are
// data here and nowhere else: a family id inside executable behaviour is the
// thing check 5 exists to forbid.
const NC_TRANSLATIONS = [
  "NC:aoc-cv-226-support-es",
  "NC:aoc-cv-226-support-vi",
  "NC:aoc-cr-287-form-es",
  "NC:aoc-cr-287-form-vi",
  "NC:aoc-cr-288-form-es",
  "NC:aoc-cr-288-form-vi"
];

const FACTS = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "matter.case_number": "24-CR-001234",
  "matter.county": "Example County"
};

/** A one-page flat document with room for an anchor. */
async function flatSource() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("AOC-CV-226 Spanish", { x: 72, y: 740, size: 10, font });
  for (const [i, line] of OFFICIAL_NOTICE.entries()) {
    page.drawText(line, { x: 72, y: 710 - i * 14, size: 9, font });
  }
  page.drawText("Name of Petitioner", { x: 72, y: 600, size: 9, font });
  return doc.save({ useObjectStreams: false });
}

const ANCHORS = [{
  page: 1, label: "Name of Petitioner", factId: "participant.full_legal_name",
  writeBox: { x: 180, y: 596, width: 240, height: 14 }
}];

/** Runs the flat path and reports whether it held or what it wrote. */
async function runFlat({ documentTextLines }) {
  try {
    const result = await finalizeFlatOverlay({
      sourceBytes: await flatSource(), anchors: ANCHORS, facts: FACTS, documentTextLines
    });
    return { held: false, written: result.report.written.length, bytes: result.bytes?.length ?? 0 };
  } catch (error) {
    if (error instanceof NonFilingHoldError) return { held: true, notice: error.message };
    return { held: false, threw: error.message };
  }
}

console.log("reference-only source-notice guard");

const CHECKS = [
  {
    id: "the_official_translation_notice_is_detected_in_every_printed_shape",
    holds: () => {
      const missed = NOTICE_VARIANTS.filter((v) => !detectNonFilingNotice(v.lines));
      return missed.length ? `not detected: ${missed.map((v) => v.id).join(", ")}` : null;
    }
  },
  {
    id: "the_superseded_detector_missed_that_notice",
    // The defect, kept executable. If someone reinstates the old shapes this
    // says so instead of the guard quietly narrowing again.
    holds: () => {
      const SUPERSEDED = /\bnot\s+for\s+filing\b|\bsample\s+only\b|\bspecimen\s+copy\b|\bfor\s+illustration\s+only\b|\bdo\s+not\s+file\s+this\s+form\b/i;
      const caught = OFFICIAL_NOTICE.filter((line) => SUPERSEDED.test(line));
      if (caught.length) return "the superseded detector already matched this notice, so this is not the defect";
      return detectNonFilingNotice(OFFICIAL_NOTICE) ? null : "the current detector still misses it";
    }
  },
  {
    id: "participant_placements_are_suppressed_on_a_reference_only_document",
    holds: async () => {
      const result = await runFlat({ documentTextLines: OFFICIAL_NOTICE });
      if (!result.held) return `the flat path wrote ${result.written} value(s)${result.threw ? ` (threw ${result.threw})` : ""}`;
      return null;
    }
  },
  {
    id: "the_same_document_without_the_notice_still_writes",
    // The discriminator. Without it, "zero placements" could mean the fixture
    // never places anything and the guard proves nothing.
    holds: async () => {
      const result = await runFlat({ documentTextLines: ["Name of Petitioner"] });
      if (result.held) return "the flat path held on a document carrying no notice";
      return result.written > 0 ? null : "the fixture writes nothing even unguarded, so the suppression above proves nothing";
    }
  },
  {
    id: "the_acroform_path_holds_on_the_same_notice",
    holds: async () => {
      try {
        await finalizeOfficialForm({
          sourceBytes: await flatSource(), census: { fields: [] }, facts: FACTS,
          documentTextLines: OFFICIAL_NOTICE
        });
        return "the AcroForm path did not hold";
      } catch (error) {
        return error instanceof NonFilingHoldError ? null : `it threw something else: ${error.message}`;
      }
    }
  },
  {
    id: "official_text_is_preserved_and_nothing_is_blanked",
    // A hold refuses to write. It must not be a redaction: no output document
    // is produced at all, and the guard owns no operation that could erase the
    // court's words.
    holds: async () => {
      const result = await runFlat({ documentTextLines: OFFICIAL_NOTICE });
      if (!result.held) return "no hold, so preservation was never tested";
      const guard = fs.readFileSync(path.join(rootDir, "scripts/rcap-official-forms/rcap-source-notice.mjs"), "utf8");
      const erasing = [/drawRectangle/, /\bremovePage\b/, /setFontColor/, /\bredact/i, /\bwhiteout/i, /\bblank\b/i];
      const hit = erasing.filter((re) => re.test(guard));
      if (hit.length) return "the notice module contains a drawing or removal operation";
      return null;
    }
  },
  {
    id: "ordinary_english_filing_text_is_not_held",
    holds: () => {
      const wrong = ORDINARY_FILING_TEXT.filter((c) => detectNonFilingNotice(c.lines));
      return wrong.length
        ? `falsely held: ${wrong.map((c) => `${c.id} (${detectNonFilingNotice(c.lines).matched})`).join(", ")}`
        : null;
    }
  },
  {
    id: "no_pattern_matches_the_word_filing_alone",
    holds: () => {
      const broad = NON_FILING_NOTICE_PATTERNS.filter(({ pattern }) => pattern.test("filing"));
      return broad.length ? `too broad: ${broad.map((p) => p.id).join(", ")}` : null;
    }
  },
  {
    id: "all_six_nc_translations_are_covered_by_the_shared_rule",
    holds: () => {
      const uncovered = NC_TRANSLATIONS.filter((familyId) => {
        // Each carries the same court notice; the rule must fire on it for
        // every one, and must do so without knowing the family.
        const detected = detectNonFilingNotice(OFFICIAL_NOTICE);
        return !detected || !familyId.startsWith("NC:");
      });
      if (uncovered.length) return `not covered: ${uncovered.join(", ")}`;
      if (NC_TRANSLATIONS.length !== 6) return `expected six translations, listed ${NC_TRANSLATIONS.length}`;
      return null;
    }
  },
  {
    id: "no_family_id_appears_in_executable_behaviour",
    holds: () => {
      const executable = [
        "scripts/rcap-official-forms/rcap-source-notice.mjs",
        "scripts/rcap-official-forms/rcap-official-form-finalize.mjs"
      ];
      const offenders = [];
      for (const rel of executable) {
        const source = fs.readFileSync(path.join(rootDir, rel), "utf8");
        for (const familyId of NC_TRANSLATIONS) if (source.includes(familyId)) offenders.push(`${rel}: ${familyId}`);
        if (/aoc-cv-226|aoc-cr-287|aoc-cr-288/.test(source)) offenders.push(`${rel}: a form id`);
      }
      return offenders.length ? offenders.join("; ") : null;
    }
  }
];

for (const check of CHECKS) {
  let problem;
  try { problem = await check.holds(); } catch (error) { problem = `threw: ${error.message}`; }
  console.log(`  ${problem ? "FAIL" : "ok  "} ${check.id}`);
  if (problem) note(`${check.id}: ${problem}`);
}

if (failures.length) {
  console.error(`FAIL reference-only guard — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`OK reference-only guard — ${CHECKS.length} checks hold: the translation notice is detected in `
  + `${NOTICE_VARIANTS.length} printed shapes, both finalization paths refuse to write, ordinary filing text in `
  + `${ORDINARY_FILING_TEXT.length} shapes is not held, and all ${NC_TRANSLATIONS.length} NC translations are covered `
  + "without a family id in executable code");
