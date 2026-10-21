/**
 * One form number, several documents.
 *
 * The Master Library files an instruction sheet under the number of the form it
 * explains. NC__INSTRUCTIONS__AOC-CR-287__… and NC__FORM__AOC-CR-287__… both
 * carry `formNumber: "AOC-CR-287"`, and fourteen form numbers across the index
 * are in that state — four North Carolina petitions, Nebraska's CC-6-12, and
 * nine Texas nondisclosure forms.
 *
 * That makes an `official-form:` lookup ambiguous in a way that has nothing to
 * do with the question being asked. A family that names `official-form:AOC-CR-287`
 * is naming the petition and order it files, not the two-page sheet explaining
 * how to fill it in. Every resolver that saw both got it wrong in its own way:
 * one bound the instruction sheet, another refused the whole number as an
 * ambiguity it could not decide.
 *
 * The library already records the answer. `assetClass` is the second field of
 * its six-field naming standard and says FORM or INSTRUCTIONS in as many words.
 * So: where a form number has FORM entries, an `official-form:` obligation sees
 * only those.
 *
 * This never hides a document. An instruction sheet that no form shares a
 * number with is returned untouched, because a family may legitimately name one
 * as a component in its own right — California's CR-106-INFO is exactly that,
 * a read-only instruction component with no field mapping. The filter only ever
 * removes a candidate that a FORM at the same number already answers.
 */

/** The entries an `official-form:` label should be resolved against. */
export function preferOfficialForm(matches) {
  if (!Array.isArray(matches) || matches.length < 2) return matches ?? [];
  const forms = matches.filter((m) => m?.assetClass === "FORM");
  return forms.length > 0 && forms.length < matches.length ? forms : matches;
}

/** What preferOfficialForm dropped, for a resolver that wants to say so. */
export function nonFormCandidatesSetAside(matches) {
  if (!Array.isArray(matches) || matches.length < 2) return [];
  const forms = matches.filter((m) => m?.assetClass === "FORM");
  if (forms.length === 0 || forms.length === matches.length) return [];
  return matches.filter((m) => m?.assetClass !== "FORM")
    .map((m) => ({ path: m.path, assetClass: m.assetClass ?? null, sha256: m.sha256 }));
}

/**
 * ONE FORM NUMBER, SEVERAL LANGUAGES — AND SOMETIMES SEVERAL DOCUMENTS.
 *
 * The FORM preference above is not the only reason a form number resolves to
 * more than one document, and the residue is not one thing:
 *
 *  - LANGUAGE. North Carolina files AOC-CR-287 and AOC-CV-226 in English,
 *    Spanish and Vietnamese under one number. A packet delivers one of them,
 *    and which one is not a coin toss.
 *  - EDITION. AOC-CR-287 exists at REV-2020-12 and REV-2025-12. That is the
 *    staleness question and this resolver has a class for it.
 *  - GENUINELY DIFFERENT DOCUMENTS. Montana files the OCA MMRTA proposed order
 *    and its certificate of service under one document id, split only by role,
 *    and both are required; Texas files the order and the petition for each
 *    nondisclosure section under one section number. There the label does not
 *    identify a document at all, and no preference can make it.
 *
 * Language is decidable from the index and is decided here. The rest is not,
 * and the caller is expected to refuse rather than pick — a form number that
 * still names two distinct hashes after both preferences is an unresolved
 * identity, and binding one arbitrarily is how a family comes to ship the
 * certificate of service where the proposed order belongs.
 */
export function preferPrimaryLanguage(matches, language = "EN") {
  if (!Array.isArray(matches) || matches.length < 2) return matches ?? [];
  const preferred = matches.filter((m) => (m?.language ?? language) === language);
  return preferred.length > 0 && preferred.length < matches.length ? preferred : matches;
}

/**
 * The entries an `official-form:` label resolves to after every preference
 * this module can justify, or null when the label still names more than one
 * distinct document and therefore identifies none of them.
 */
export function resolveOfficialFormCandidates(matches, language = "EN") {
  const narrowed = preferPrimaryLanguage(preferOfficialForm(matches), language);
  if (narrowed.length === 0) return { candidates: [], ambiguous: false };
  const distinct = new Set(narrowed.map((m) => m?.sha256));
  return { candidates: narrowed, ambiguous: distinct.size > 1 };
}
