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
export const NON_FILING_NOTICE_PATTERNS = Object.freeze([
  { id: "not_for_filing", pattern: /\bnot for filing\b/ },
  { id: "sample_only", pattern: /\bsample only\b/ },
  { id: "specimen_copy", pattern: /\bspecimen copy\b/ },
  { id: "for_illustration_only", pattern: /\bfor illustration only\b/ },
  { id: "do_not_file_this_form", pattern: /\bdo not file this (form|document)\b/ },
  // The reference-only translation notice, in three independent parts. Each is
  // sufficient on its own: a document that says any one of them about itself is
  // telling the reader it is not the filing copy.
  { id: "informational_purposes_only", pattern: /\bfor informational purposes only\b/ },
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
    for (const { id, pattern } of NON_FILING_NOTICE_PATTERNS) {
      if (pattern.test(normalized)) return { notice: text.trim(), matched: id, basis: "printed_line" };
    }
  }

  const joined = normalizeNoticeText(texts.join(" "));
  for (const { id, pattern } of NON_FILING_NOTICE_PATTERNS) {
    const found = joined.match(pattern);
    if (!found) continue;
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
