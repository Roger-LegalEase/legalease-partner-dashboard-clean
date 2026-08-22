// One vocabulary for a PDF's structural class.
//
// Two different vocabularies describe the same fact in this corpus. The
// canonical bundle manifest declares `acroform_pdf`; the binary inspector,
// reading the file itself, reports `acroform`. They agree on `flat_pdf`.
//
// Comparing the two with raw string equality therefore reported disagreement
// for every AcroForm in the corpus and agreement for every flat PDF -- 64
// records marked source-identity-ambiguous on a naming difference, and not one
// genuine structural disagreement among them. A register whose largest defect
// class is an artifact of its own comparator cannot be used to decide anything,
// and the fabricated rows crowd out the real ones.
//
// Normalizing before comparing is the fix. It is deliberately narrow: only the
// spellings actually observed in the two vocabularies are folded together. An
// unrecognised token is lowercased and returned as-is, so a class nobody has
// seen before reports disagreement rather than being quietly waved through.

/** Folds a declared or observed structural class onto the canonical token. */
export function normalizeStructuralClass(value) {
  if (value === null || value === undefined) return null;
  const token = String(value).trim().toLowerCase();
  if (token === "") return null;
  switch (token) {
    case "acroform":
    case "acroform_pdf":
      return "acroform";
    case "flat":
    case "flat_pdf":
      return "flat_pdf";
    case "xfa":
    case "xfa_pdf":
      return "xfa";
    case "scanned":
    case "scanned_pdf":
      return "scanned";
    default:
      return token;
  }
}

/**
 * Whether an observed class agrees with a declared one.
 *
 * Returns null -- not false -- when nothing was declared. "No declaration to
 * compare against" is not a disagreement, and recording it as one would
 * manufacture a defect out of a silent manifest.
 */
export function structuralClassesAgree(observed, declared) {
  const declaredToken = normalizeStructuralClass(declared);
  if (declaredToken === null) return null;
  return normalizeStructuralClass(observed) === declaredToken;
}
