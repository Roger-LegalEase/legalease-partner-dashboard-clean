// One acquisition leg per distinct official source, not one per queue record.
//
// Several queue records legitimately name the same document: North Carolina
// AOC-CR-287 is referenced by six entries, AOC-CR-288 by six, AOC-CV-226 by
// three. Fetching the same URL six times tells us nothing new and puts six
// times the load on a court's website.
//
// It was also actively breaking the run. Each leg wrote its receipt as
// "<JURISDICTION>-<FORMNUMBER>.receipt.json", and the collector downloads every
// artifact into one directory with merge-multiple. Same document, same
// filename, so the receipts landed on top of each other and the collector's
// JSON.parse hit two concatenated documents.
//
// So entries are GROUPED, never dropped: the queue keeps every record, and each
// group carries the asset ids and queue-entry ids of everyone it covers, so a
// grouped member can still be traced to the receipt that proves its source.
//
// Grouping is only safe when the grouped records actually agree about the
// document. If two records share a source key but disagree on the publisher,
// the pinned hash, the revision or the language, then they are not describing
// one document and collapsing them would silently pick a winner. That is a
// named conflict and it stops the plan.

/** Uppercased, trimmed, punctuation-stable jurisdiction. */
export function normalizeJurisdiction(value) {
  return String(value ?? "").trim().toUpperCase();
}

/** Form numbers vary by case and incidental whitespace, not by identity. */
export function normalizeFormNumber(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * The canonical form of an official URL.
 *
 * Scheme and host are case-insensitive; a trailing slash, a default port and a
 * fragment do not change which document is served. Query strings DO, so they
 * are preserved — a form served as ?formNumber=AOC-CR-287 is not the same
 * request as one without it.
 */
export function canonicalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return raw.toLowerCase();
  }
  parsed.hash = "";
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }
  return parsed.toString();
}

/** The identity of one official source. */
export function sourceKeyOf(entry) {
  return [
    normalizeJurisdiction(entry.jurisdiction),
    normalizeFormNumber(entry.formNumber),
    canonicalizeUrl(entry.url)
  ].join("|");
}

/**
 * A filesystem-safe, collision-free name for one source key.
 *
 * Jurisdiction and form number stay in the name so a human reading the artifact
 * list can see what it is; a short digest of the FULL key disambiguates two
 * sources that share both but differ by URL. Without the digest this is the
 * exact filename collision that broke the collector.
 */
export function receiptSlugFor(key, hashHex) {
  const [jurisdiction, formNumber] = key.split("|");
  const readable = `${jurisdiction}-${formNumber}`.replace(/[^A-Za-z0-9._-]/g, "-");
  return `${readable}-${hashHex.slice(0, 12)}`;
}

/**
 * Facts that must agree before two records may share one acquisition.
 *
 * These are the facts that decide WHAT is fetched and HOW the bytes are read.
 * Two records that disagree on any of them are describing different documents
 * and must not be collapsed.
 *
 * expectedSha256 is deliberately NOT here. In this queue it is a per-asset
 * historical pin — the assetId is literally `JUR|FORM|<that sha>` — recording
 * the bytes that asset was last observed as, not an assertion about what the
 * URL serves now. Six North Carolina assets reference one landing page, each
 * carrying its own pin; the page serves HTML, so no per-asset PDF hash could
 * match a fetch of it. Treating those as six conflicting documents would block
 * on provenance rather than on identity.
 *
 * Nothing is silently chosen instead: every distinct pin is carried on the leg
 * as coveredExpectedSha256, and a group that does not agree on one value gets
 * expectedSha256 = null with expectedSha256Ambiguous = true, so the receipt
 * reports the ambiguity rather than resolving it.
 */
const IDENTITY_FACTS = [
  ["publisher", (e) => e.publisher ?? null],
  ["expectedRevision", (e) => e.expectedRevision ?? null],
  ["language", (e) => e.language ?? null],
  ["urlKind", (e) => e.urlKind ?? null],
  ["contentTypeExpectation", (e) => e.contentTypeExpectation ?? null]
];

/**
 * Group queue entries into one leg per distinct source.
 *
 * `hash` is injected so this module stays dependency-free and testable; the
 * caller passes a sha256 hex function.
 *
 * Returns { legs, conflicts, coverage }. A non-empty `conflicts` means the plan
 * must fail: it names records that claim one source but describe different
 * documents.
 */
export function planAcquisitionLegs(entries, hash) {
  const groups = new Map();

  entries.forEach((entry, index) => {
    const key = sourceKeyOf(entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ entry, index });
  });

  const conflicts = [];
  const legs = [];

  for (const [key, members] of [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    // Disagreement about the document itself is never collapsed silently.
    for (const [fact, read] of IDENTITY_FACTS) {
      const values = [...new Set(members.map(({ entry }) => JSON.stringify(read(entry) ?? null)))];
      // A record that simply does not state a fact is not in conflict with one
      // that does; only two DIFFERENT stated values are.
      const stated = values.filter((v) => v !== "null");
      if (stated.length > 1) {
        conflicts.push({
          sourceKey: key,
          fact,
          values: stated.map((v) => JSON.parse(v)),
          assetIds: members.map(({ entry }) => entry.assetId ?? null),
          why: `records sharing this source disagree on ${fact}, so they are not describing one document`
        });
      }
    }

    const first = members[0].entry;
    const stated = (read) => {
      for (const { entry } of members) {
        const value = read(entry);
        if (value !== null && value !== undefined && value !== "") return value;
      }
      return null;
    };

    // Every distinct pin the grouped records carry, so none is discarded and
    // none is silently promoted to "the" expected hash.
    const pins = [...new Set(members.map(({ entry }) => entry.expectedSha256).filter(Boolean))].sort();

    legs.push({
      sourceKey: key,
      receiptSlug: receiptSlugFor(key, hash(key)),
      jurisdiction: normalizeJurisdiction(first.jurisdiction),
      formNumber: normalizeFormNumber(first.formNumber),
      url: first.url,
      canonicalUrl: canonicalizeUrl(first.url),
      urlKind: stated((e) => e.urlKind ?? null),
      publisher: stated((e) => e.publisher ?? null),
      // Only when the group agrees. Otherwise null, and the ambiguity is stated.
      expectedSha256: pins.length === 1 ? pins[0] : null,
      expectedSha256Ambiguous: pins.length > 1,
      coveredExpectedSha256: pins,
      expectedRevision: stated((e) => e.expectedRevision ?? null),
      language: stated((e) => e.language ?? null),
      // Every record this one leg answers for. Nothing is dropped.
      coveredAssetIds: members.map(({ entry }) => entry.assetId ?? null).filter(Boolean),
      coveredQueueEntryIndexes: members.map(({ index }) => index),
      coveredQueueEntryCount: members.length
    });
  }

  const coveredIndexes = legs.flatMap((l) => l.coveredQueueEntryIndexes);
  const coverage = {
    originalEntries: entries.length,
    uniqueSourceLegs: legs.length,
    coveredEntries: coveredIndexes.length,
    everyEntryCoveredExactlyOnce:
      coveredIndexes.length === entries.length &&
      new Set(coveredIndexes).size === entries.length,
    receiptSlugsAreUnique: new Set(legs.map((l) => l.receiptSlug)).size === legs.length
  };

  return { legs, conflicts, coverage };
}
