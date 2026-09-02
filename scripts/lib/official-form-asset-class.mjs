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
