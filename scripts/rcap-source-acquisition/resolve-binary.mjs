// Chooses which document on an official landing page is the form we asked for.
//
// The queue holds 29 sources whose URL is the issuing body's page, not the
// form: `official_landing_page`. The acquirer already fetches those pages and
// harvests every document they link to, but nothing decided which of the
// harvested links was the form, so the binary was never resolved and the
// register still has no direct URL for any of them.
//
// Deciding is the whole risk. A landing page for expungement links the
// petition, the order, the instructions, a fee waiver, a Spanish translation
// and often a vendor's copy. Picking the wrong one produces a confident,
// hash-pinned, entirely incorrect source — worse than having none, because it
// looks settled.
//
// So this refuses more readily than it chooses:
//
//   - a name that identifies the form              -> chosen
//   - two names that identify it equally well      -> ambiguous, nothing chosen
//   - only a bare number in common                 -> too weak, nothing chosen
//   - nothing that names the form                  -> unresolved
//
// What it produces is a CANDIDATE to fetch. It is not a claim that the URL is
// official: that is settled by the acquisition, which fetches only from
// allowlisted government hosts and receipts what actually arrived.
import { formTokens } from "./revision.mjs";

/** Documents worth considering, best first. A form is a PDF far more often than not. */
const EXTENSION_RANK = { pdf: 3, docx: 2, doc: 2, rtf: 1 };

/**
 * How strongly a filename claims to be this form.
 *
 * Scores are ordered, not measured: what matters is that an exact name beats a
 * prefix, a prefix beats a substring, and a bare number never wins on its own.
 */
export const MATCH_STRENGTH = {
  exact: 100,
  prefixed: 80,
  contained: 60,
  numberOnly: 25,
  none: 0
};

/** The weakest match that may be chosen without a human looking at it. */
const MINIMUM_CHOOSABLE = MATCH_STRENGTH.contained;

function fileNameOf(url) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(last);
  } catch {
    return "";
  }
}

function extensionOf(name) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/** The filename with separators and case removed, so "AOC-CR-287.pdf" → "aoccr287". */
function stemOf(name) {
  return name.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]/g, "");
}

/** The digits a form number ends in: "AOC-CR-287" → "287". */
function trailingNumber(formNumber) {
  const m = String(formNumber ?? "").trim().match(/(\d+[a-zA-Z]?)\s*$/);
  return m ? m[1].toLowerCase() : "";
}

export function scoreCandidate(url, formNumber) {
  const name = fileNameOf(url);
  const stem = stemOf(name);
  const compact = formTokens(formNumber).find((t) => /^[a-z0-9]+$/.test(t)) ?? "";
  const number = trailingNumber(formNumber);

  if (!stem || !compact) return { url, name, strength: MATCH_STRENGTH.none, why: "no comparable filename or form number" };

  if (stem === compact) return { url, name, strength: MATCH_STRENGTH.exact, why: `filename is exactly the form number (${name})` };

  if (stem.startsWith(compact)) {
    return { url, name, strength: MATCH_STRENGTH.prefixed, why: `filename begins with the form number (${name})` };
  }
  if (stem.includes(compact)) {
    return { url, name, strength: MATCH_STRENGTH.contained, why: `filename contains the form number (${name})` };
  }
  if (number && stem.includes(number)) {
    // "287" appears in "aoccr287", but also in "form287instructions" and in
    // "2870". A number alone has never been enough to identify a court form.
    return { url, name, strength: MATCH_STRENGTH.numberOnly, why: `filename shares only the form's number (${number}), which does not identify it` };
  }
  return { url, name, strength: MATCH_STRENGTH.none, why: `filename does not name the form (${name})` };
}

/**
 * Choose the document to acquire, or refuse and say why.
 *
 * `sameHostOnly` keeps the choice on the host that served the landing page. A
 * court page that links a commercial reprint is common, and the reprint is
 * often the better-named file — exactly the case where scoring alone picks
 * wrong.
 */
export function chooseOfficialBinary({ formNumber, candidates = [], landingUrl = null, sameHostOnly = true } = {}) {
  const landingHost = hostOf(landingUrl);
  const considered = [];
  const rejected = [];

  for (const url of [...new Set(candidates)]) {
    const host = hostOf(url);
    if (sameHostOnly && landingHost && host && host !== landingHost) {
      rejected.push({ url, why: `served by ${host}, not by the issuing body's own host (${landingHost})` });
      continue;
    }
    const extension = extensionOf(fileNameOf(url));
    if (!(extension in EXTENSION_RANK)) {
      rejected.push({ url, why: `.${extension || "(none)"} is not a document format a form is published in` });
      continue;
    }
    considered.push({ ...scoreCandidate(url, formNumber), extension, extensionRank: EXTENSION_RANK[extension] });
  }

  const ranked = considered.sort((a, b) => {
    if (a.strength !== b.strength) return b.strength - a.strength;
    if (a.extensionRank !== b.extensionRank) return b.extensionRank - a.extensionRank;
    return a.url < b.url ? -1 : 1;
  });

  const base = { formNumber, landingUrl, ranked, rejected, candidatesConsidered: considered.length };

  if (ranked.length === 0) {
    return { ...base, outcome: "unresolved", chosen: null, why: "the landing page linked no document this could consider" };
  }

  const best = ranked[0];
  if (best.strength < MINIMUM_CHOOSABLE) {
    return {
      ...base,
      outcome: best.strength === MATCH_STRENGTH.none ? "unresolved" : "too_weak_to_choose",
      chosen: null,
      why: best.strength === MATCH_STRENGTH.none
        ? "no linked document names this form"
        : `the closest link only ${best.why}; that is a guess, and a guess pinned to a hash reads as a settled source`
    };
  }

  // A tie at the top, at the same format, is two documents with an equal claim.
  // Choosing by URL order would be arbitrary and invisible.
  const tied = ranked.filter((r) => r.strength === best.strength && r.extensionRank === best.extensionRank);
  if (tied.length > 1) {
    return {
      ...base,
      outcome: "ambiguous",
      chosen: null,
      why: `${tied.length} linked documents identify this form equally well (${tied.map((t) => t.name).join(", ")}); which is the form is a decision for a person`
    };
  }

  return { ...base, outcome: "resolved", chosen: best.url, strength: best.strength, why: best.why };
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
