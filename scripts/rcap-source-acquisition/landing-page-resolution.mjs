// Which document on an issuing body's page is THIS form.
//
// The acquisition script can already fetch a landing page and list every
// document it links. It has never been able to say which of those documents is
// the form the queue asked for, so a landing-page leg produced an HTML file, a
// receipt, and no source. Twenty-nine of the forty-one runnable legs are
// landing pages, so that gap is most of the queue.
//
// Choosing wrongly is worse than choosing nothing. A resolver that picks
// AOC-CR-288 when the queue asked for AOC-CR-287 pins the wrong form to a
// delivery route, and every downstream check — overlay, contact sheet, packet —
// passes, because each of them only asks whether the bytes are internally
// consistent. Nothing downstream re-asks whether this was the right document.
// So every rule here is written to refuse rather than to guess, and a refusal
// carries the candidates it refused so a person can settle it in one look.
//
// Nothing here fetches. It is a pure function of (html, url, form number) so it
// can be tested against fixtures without reaching any court's website, which
// this session's egress policy forbids anyway.

/**
 * Split an identifier into its meaningful runs.
 *
 * "AOC-CR-287" and "cr287" have to compare equal on their shared tail, and
 * "CC-6-12" must NOT compare equal to "CC-6-12-1", which is a different form.
 * Normalising separators away collapses both into substrings of each other —
 * norm("CC-6-12") === "cc612" is a substring of norm("CC-6-12-1") === "cc6121"
 * — so the separators are not thrown away; they become boundaries, and the
 * digit/letter transition inside an unseparated stem like "cr287" is a boundary
 * too.
 */
export function identifierTokens(value) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .flatMap((run) => run.match(/[a-z]+|[0-9]+/g) ?? [])
    .filter(Boolean);
}

// Agency prefixes a court puts in the form's NAME but not in the form's
// FILENAME. North Carolina calls it AOC-CR-287 and publishes it as cr287.pdf.
// Dropping a leading prefix is allowed; dropping anything from the tail is not,
// because the tail is what distinguishes one form from the next.
const DROPPABLE_LEADING_TOKENS = new Set(["aoc", "form", "forms"]);

/**
 * Every token sequence that names this form exactly.
 *
 * The full sequence, plus what is left after dropping leading agency tokens.
 * "AOC-CR-287" yields ["aoc","cr","287"] and ["cr","287"], which is how North
 * Carolina actually publishes it. It deliberately stops before ["287"]: a bare
 * number is the weakest possible identifier, and AOC-CR-226 and AOC-CV-226
 * would both answer to it.
 *
 * The one exception is a form number that is nothing but an agency prefix and a
 * number. Kentucky's AOC-334 is published as 334.pdf, so ["334"] is the only
 * sequence that can ever match it, and refusing it would refuse the single
 * Priority 1 asset in the queue. There is no more specific sequence to lose to
 * in that case, and the bare token is only ever accepted as a WHOLE filename
 * (tier 0 below), never as the head of a longer one.
 */
export function acceptableSequences(formNumber) {
  const full = identifierTokens(formNumber);
  if (full.length === 0) return [];
  const out = [full];
  let head = 0;
  while (head < full.length && DROPPABLE_LEADING_TOKENS.has(full[head])) {
    head += 1;
    const remainder = full.slice(head);
    if (remainder.length >= 2 || (remainder.length === 1 && full.length === 2)) out.push(remainder);
  }
  return out;
}

const sameSequence = (a, b) => a.length === b.length && a.every((t, i) => t === b[i]);
const startsWithSequence = (candidate, prefix) =>
  candidate.length > prefix.length && prefix.every((t, i) => t === candidate[i]);

/**
 * A continuation token that is part of the form number rather than prose.
 *
 * CC-6-11A is not CC-6-11 and CC-6-12-1 is not CC-6-12, so a trailing "a" or
 * "1" disqualifies the file. "cr287-instructions" is the same form number
 * followed by a word describing which sheet it is, so a trailing word of two or
 * more letters does not. This is the whole difference between a descriptive
 * filename and a different form, and getting it backwards is how the wrong
 * revision gets pinned.
 */
const isFormNumberSuffix = (token) => /^[0-9]+$/.test(token) || token.length < 2;

/** Documents only. A link to another HTML page is a lead, not a form. */
const DOCUMENT_EXTENSION = /\.(pdf|docx?|rtf)$/i;

function documentExtensionOf(url) {
  try {
    const parsed = new URL(url);
    const fromPath = parsed.pathname.match(DOCUMENT_EXTENSION);
    if (fromPath) return fromPath[1].toLowerCase();
    // Some publishers name the file in the query: /formdisplay?file=CR-266.pdf
    for (const value of parsed.searchParams.values()) {
      const fromQuery = String(value).match(DOCUMENT_EXTENSION);
      if (fromQuery) return fromQuery[1].toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

/** The filename a link points at, stripped of its extension. */
export function fileStemOf(url) {
  try {
    const parsed = new URL(url);
    const fromPath = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    if (DOCUMENT_EXTENSION.test(fromPath)) return decodeURIComponent(fromPath).replace(DOCUMENT_EXTENSION, "");
    for (const value of parsed.searchParams.values()) {
      if (DOCUMENT_EXTENSION.test(String(value))) return String(value).replace(DOCUMENT_EXTENSION, "");
    }
    return decodeURIComponent(fromPath);
  } catch {
    return "";
  }
}

/**
 * Every document this page links, absolute and de-duplicated.
 *
 * Deliberately a regex over the markup rather than a parsed DOM: the input is
 * one fetched page in a CI job with no DOM available, and a link this misses is
 * a refusal, not a wrong answer.
 */
export function harvestDocumentLinks(html, baseUrl) {
  const seen = new Map();
  const text = String(html ?? "");
  for (const match of text.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    let absolute;
    try {
      absolute = new URL(match[1], baseUrl).href;
    } catch {
      continue;
    }
    if (!documentExtensionOf(absolute)) continue;
    if (!seen.has(absolute)) seen.set(absolute, { url: absolute, extension: documentExtensionOf(absolute) });
  }
  return [...seen.values()].sort((a, b) => a.url.localeCompare(b.url));
}

/**
 * How well one linked document answers to this form number.
 *
 * 0 — the filename IS the form number.
 * 1 — the filename is the form number followed by descriptive words.
 * null — not this form.
 */
export function tierFor(url, formNumber) {
  const stem = identifierTokens(fileStemOf(url));
  if (stem.length === 0) return null;
  const sequences = acceptableSequences(formNumber);
  if (sequences.some((sequence) => sameSequence(stem, sequence))) return 0;
  for (const sequence of sequences) {
    // A one-token sequence is only ever a whole filename. "334-order.pdf" is
    // not evidence that AOC-334 is the order, and a bare number at the head of
    // a longer name is exactly where a coincidence would hide.
    if (sequence.length < 2) continue;
    if (!startsWithSequence(stem, sequence)) continue;
    const continuation = stem.slice(sequence.length);
    if (continuation.every((token) => !isFormNumberSuffix(token))) return 1;
  }
  return null;
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

/**
 * Resolve the form's binary from the page that publishes it.
 *
 * Returns a verdict in every case, and never throws: a landing page that
 * cannot be resolved is a normal outcome that has to be recorded, not an error
 * that loses the other forty legs.
 *
 * `officialHosts` is this jurisdiction's issuing bodies. A document linked from
 * an official page but served by someone else is refused — a court linking a
 * vendor's copy of its own form does not make the vendor's copy official.
 */
export function resolveFormBinaryFromLandingPage({
  html,
  landingPageUrl,
  formNumber,
  officialHosts = []
}) {
  const base = { landingPageUrl, formNumber, resolvedUrl: null, candidates: [] };
  if (!formNumber || identifierTokens(formNumber).length === 0) {
    return { ...base, verdict: "refused_no_form_number", reason: "the leg carries no form number to match a filename against" };
  }

  const permittedHosts = new Set(officialHosts.map((h) => String(h).toLowerCase()));
  const landingHost = hostOf(landingPageUrl);
  if (landingHost) permittedHosts.add(landingHost);

  const linked = harvestDocumentLinks(html, landingPageUrl);
  if (linked.length === 0) {
    return { ...base, verdict: "refused_no_document_linked", reason: "the page links no PDF, DOC, DOCX or RTF at all" };
  }

  const onOfficialHosts = linked.filter((link) => permittedHosts.has(hostOf(link.url) ?? ""));
  const offHost = linked.filter((link) => !permittedHosts.has(hostOf(link.url) ?? ""));
  if (onOfficialHosts.length === 0) {
    return {
      ...base,
      verdict: "refused_every_document_is_off_host",
      reason: `the page links ${linked.length} document(s), none served by this jurisdiction's issuing bodies`,
      candidates: linked.map((link) => ({ ...link, tier: null, refusedBecause: "not served by an official host" }))
    };
  }

  const scored = onOfficialHosts
    .map((link) => ({ ...link, tier: tierFor(link.url, formNumber) }))
    .filter((link) => link.tier !== null)
    .sort((a, b) => a.tier - b.tier || a.url.localeCompare(b.url));

  const candidates = [
    ...scored,
    ...onOfficialHosts
      .filter((link) => tierFor(link.url, formNumber) === null)
      .map((link) => ({ ...link, tier: null, refusedBecause: "the filename does not name this form number" })),
    ...offHost.map((link) => ({ ...link, tier: null, refusedBecause: "not served by an official host" }))
  ];

  if (scored.length === 0) {
    return {
      ...base,
      candidates,
      verdict: "refused_no_document_names_this_form",
      reason: `${onOfficialHosts.length} official document(s) are linked and none is named for ${formNumber}`
    };
  }

  const bestTier = scored[0].tier;
  const best = scored.filter((link) => link.tier === bestTier);
  if (best.length > 1) {
    return {
      ...base,
      candidates,
      verdict: "refused_ambiguous",
      reason: `${best.length} documents are named for ${formNumber} equally well; choosing between them is a decision, not a lookup`
    };
  }

  return {
    ...base,
    candidates,
    resolvedUrl: best[0].url,
    resolvedTier: bestTier,
    verdict: "resolved",
    reason: bestTier === 0
      ? `exactly one linked document on an official host is named ${formNumber}`
      : `exactly one linked document on an official host is named ${formNumber} followed by descriptive text`
  };
}

/**
 * What a resolution does and does not settle.
 *
 * Copied onto every receipt so the claim travels with the bytes. Resolving a
 * link says which document the page offered under this form number. It says
 * nothing about the edition.
 */
export const RESOLUTION_DOES_NOT_ESTABLISH = [
  "that the resolved document is the current published edition",
  "that it has not been superseded since the page was written",
  "that the page itself is the issuing body's current index for this form"
];
