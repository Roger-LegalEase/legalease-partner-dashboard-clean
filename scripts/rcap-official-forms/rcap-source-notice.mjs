#!/usr/bin/env node
// What a court form says about itself.
//
// Some official documents carry a notice, printed by the court, that the
// document is not the thing you file. A translation published for comprehension
// says so on its face; so does a sample, a specimen and an illustration. A
// participant value written onto one of those is not a filing — it is a filled
// document that the court will not accept and that reads, to anyone holding it,
// as though it were a real one.
//
// The detector this replaces recognised five English shapes and returned false
// against the notice the North Carolina translations actually print:
//
//   THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY.
//   DO NOT COMPLETE THIS FORM FOR FILING.
//   USE THE ENGLISH VERSION.
//
// Three sentences, none of which contains "not for filing", "sample only",
// "specimen copy", "for illustration only" or "do not file this form". So the
// flat-overlay path was free to write onto a document whose own first line says
// not to.
//
// Every pattern here is a phrase that describes the DOCUMENT. None matches on
// "filing" alone: filing instructions say "filing" constantly, and a form that
// stopped rendering because it explained how to file would be a worse failure
// than the one this fixes.
const NORMALIZE = /[^a-z0-9]+/g;

/** Lowercase, punctuation to space, whitespace collapsed. */
export function normalizeNoticeText(text) {
  return String(text ?? "").toLowerCase().replace(NORMALIZE, " ").trim();
}

/**
 * The notices that mean "this document is not the one you file".
 *
 * `id` names the shape so a hold can say which phrase it matched rather than
 * only that something matched.
 */
export /*
 * "for informational purposes only" is a non-filing notice ONLY when the
 * document says it about ITSELF.
 *
 * North Dakota's SFN 61663 is the Pardon Advisory Board application -- the
 * filing document, nothing else -- and its explanatory page ends: "This is
 * provided for informational purposes only and not for the purpose of
 * providing legal advice. You should contact your attorney to obtain advice
 * with respect to any particular issue or problem." That is a lawyer's
 * disclaimer about the paragraph above it, and the gate read it as the form
 * disclaiming its own filing status. The family stopped with a source that
 * binds exactly, at three paths, and the lane that found it refused to trim the
 * text or pass a falsy notice to get past -- correctly, because both would have
 * weakened the safeguard rather than corrected it.
 *
 * So the phrase is excused only in the shape that names legal advice as what is
 * being disclaimed. The reference-copy notice this pattern exists for -- a
 * translation saying it is for informational purposes only and the English
 * version is the one to file -- says nothing about legal advice and still
 * fires, as does a document that disclaims advice somewhere and separately says
 * do not file this form: every other pattern is tested independently.
 */
const LEGAL_ADVICE_DISCLAIMER =
  /\bfor informational purposes only\b[^.]{0,80}\b(?:not (?:for the purpose of providing|intended as|to be construed as|)\s*legal advice|is not legal advice)\b/;

const NON_FILING_NOTICE_PATTERNS = Object.freeze([
  { id: "not_for_filing", pattern: /\bnot for filing\b/ },
  { id: "sample_only", pattern: /\bsample only\b/ },
  { id: "specimen_copy", pattern: /\bspecimen copy\b/ },
  { id: "for_illustration_only", pattern: /\bfor illustration only\b/ },
  { id: "do_not_file_this_form", pattern: /\bdo not file this (form|document)\b/ },
  // The reference-only translation notice, in three independent parts. Each is
  // sufficient on its own: a document that says any one of them about itself is
  // telling the reader it is not the filing copy.
  { id: "informational_purposes_only", pattern: /\bfor informational purposes only\b/, notWhen: LEGAL_ADVICE_DISCLAIMER },
  { id: "do_not_complete_for_filing", pattern: /\bdo not complete this (form|document) for filing\b/ },
  { id: "use_the_english_version", pattern: /\buse the english( language)? version\b/ }
]);

/**
 * The notice this document prints about itself, or null.
 *
 * Two passes, because a court's notice is laid out for a reader and not for a
 * parser. Line by line first, so the hold can quote the exact printed line.
 * Then across the joined text, because a three-sentence notice set in a narrow
 * column breaks wherever the column ends — "DO NOT COMPLETE THIS FORM" on one
 * line and "FOR FILING." on the next is the same notice, and a line-only test
 * reads it as neither.
 */
export function detectNonFilingNotice(lines = []) {
  const texts = (lines ?? [])
    .map((line) => (typeof line === "string" ? line : line?.text))
    .filter((text) => typeof text === "string" && text.trim());

  for (const text of texts) {
    const normalized = normalizeNoticeText(text);
    for (const { id, pattern, notWhen } of NON_FILING_NOTICE_PATTERNS) {
      if (!pattern.test(normalized)) continue;
      if (notWhen && notWhen.test(normalized)) continue;
      return { notice: text.trim(), matched: id, basis: "printed_line" };
    }
  }

  const joined = normalizeNoticeText(texts.join(" "));
  for (const { id, pattern, notWhen } of NON_FILING_NOTICE_PATTERNS) {
    const found = joined.match(pattern);
    if (!found) continue;
    if (notWhen && notWhen.test(joined)) continue;
    // Quote the phrase as the court set it, not the whole page.
    const at = found.index ?? 0;
    return {
      notice: joined.slice(Math.max(0, at - 40), at + found[0].length + 40).trim(),
      matched: id,
      basis: "notice_split_across_printed_lines"
    };
  }
  return null;
}

/** The notice text a hold reports, or null. Convenience for existing callers. */
export function nonFilingNoticeText(lines = []) {
  return detectNonFilingNotice(lines)?.notice ?? null;
}
