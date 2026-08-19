// Forms that say, in their own printed text, that they must not be filed.
//
// North Carolina publishes Spanish translations of AOC-CR-287, AOC-CR-288 and
// AOC-CV-226 that carry this notice on their face:
//
//   NOTE: THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY. DO NOT COMPLETE THIS
//   FORM FOR FILING. USE THE ENGLISH VERSION OF THE AOC-CR-287 INSTEAD.
//
//   SÍRVASE NOTAR: ESTE FORMULARIO SÓLO SE DISPONE PARA FINES INFORMATIVOS. NO
//   LO DEBE PRESENTAR EN EL TRIBUNAL, SINO QUE DEBE LLENAR Y PRESENTAR LA
//   VERSIÓN EN INGLÉS DEL FORMULARIO AOC-CR-287.
//
// The factory was treating these as filing documents that had failed to render
// participant values. They had not failed. They had correctly refused, and the
// refusal was being counted as a defect — which pointed at the fix of making
// them fill, and filling them is the one thing the court says not to do. A
// Spanish-speaking participant would have received a completed Spanish form,
// indistinguishable from the filable thing, and filed it.
//
// DETECTED, NOT LISTED. The disposition is evidenced by the notice printed on
// the document rather than by a family id in a table, for two reasons: a
// hardcoded pair would have missed AOC-CV-226's Spanish version, which carries
// the same notice and was not among the two reported failures; and any
// translation the courts publish next is covered the day it arrives.
//
// This module only READS. It never alters the court's PDF, and adding a
// watermark to say "do not file" would be modifying an official form to make a
// point the form already makes.
import { extractPageGeometry, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";

export const NON_FILING_DISPOSITION = "informational_companion";

/**
 * The printed sentences that make a document informational.
 *
 * Deliberately anchored on the court's own wording in both languages. A form is
 * not informational because a filename says "es"; it is informational because
 * it says so.
 */
export const NON_FILING_PATTERNS = [
  { language: "en", pattern: /THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY/i },
  { language: "en", pattern: /DO NOT COMPLETE THIS FORM FOR FILING/i },
  { language: "es", pattern: /S[ÓO]LO SE DISPONE PARA FINES INFORMATIVOS/i },
  { language: "es", pattern: /NO LO DEBE PRESENTAR EN EL TRIBUNAL/i }
];

/** The English form a notice points the participant at, when it names one. */
const FILE_INSTEAD = [
  /USE THE ENGLISH VERSION OF THE\s+([A-Z0-9-]+)/i,
  /VERSI[ÓO]N EN INGL[ÉE]S DEL FORMULARIO\s+([A-Z0-9-]+)/i
];

/**
 * Read a document's own notice, if it has one.
 *
 * Returns the exact matched lines so a disposition can cite the sentence that
 * produced it. A disposition that cannot quote its own evidence is an assertion.
 */
export async function nonFilingNoticeOf(pdfDoc) {
  const matches = [];
  let fileInstead = null;

  for (const [index, page] of pdfDoc.getPages().entries()) {
    for (const line of groupIntoLines(extractPageGeometry(page).text)) {
      const text = String(line.text ?? "");
      for (const { language, pattern } of NON_FILING_PATTERNS) {
        if (pattern.test(text)) {
          matches.push({ page: index + 1, language, printedText: text.trim().slice(0, 400) });
        }
      }
      if (!fileInstead) {
        for (const rule of FILE_INSTEAD) {
          const found = text.match(rule);
          if (found) { fileInstead = found[1].toUpperCase(); break; }
        }
      }
    }
  }

  if (matches.length === 0) return null;

  const languages = [...new Set(matches.map((m) => m.language))].sort();
  return {
    disposition: NON_FILING_DISPOSITION,
    basis: "the document's own printed notice",
    languages,
    fileInsteadFormId: fileInstead,
    printedNotice: matches,
    // What this means operationally, stated once so no consumer has to infer it.
    mustNotBeFilled: true,
    mustNotBeFiled: true,
    countsAsAFileableArtifact: false,
    participantValueVisibilityExpected: false
  };
}

/**
 * The bilingual instruction a packet must carry alongside an informational
 * companion.
 *
 * Both languages always, because the participant this protects is by definition
 * reading the Spanish one.
 */
export function nonFilingParticipantInstruction(fileInsteadFormId) {
  const en = fileInsteadFormId
    ? `File the completed English ${fileInsteadFormId}. The Spanish form is provided only to help you read and understand the document. Do not file the Spanish form.`
    : "File the completed English form. The Spanish form is provided only to help you read and understand the document. Do not file the Spanish form.";
  const es = fileInsteadFormId
    ? `Presente el formulario en inglés ${fileInsteadFormId} debidamente completado. El formulario en español se incluye únicamente para ayudarle a leer y comprender el documento. No presente el formulario en español ante el tribunal.`
    : "Presente el formulario en inglés debidamente completado. El formulario en español se incluye únicamente para ayudarle a leer y comprender el documento. No presente el formulario en español ante el tribunal.";
  return { en, es };
}

/** The label a participant sees, in both languages. */
export const REFERENCE_ONLY_LABEL = {
  en: "REFERENCE ONLY — DO NOT FILE",
  es: "SÓLO PARA REFERENCIA — NO PRESENTAR"
};
