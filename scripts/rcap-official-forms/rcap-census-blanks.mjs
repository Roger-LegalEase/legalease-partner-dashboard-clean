/**
 * One reader for a field census's blanks, shared by the name/date verifier and
 * the diff generator that writes its baseline record.
 *
 * TWO CENSUS SHAPES, AND A THIRD THAT MUST NOT PASS QUIETLY.
 *
 * Most censuses put a document's blanks in `fields`, an array of objects keyed
 * `name`. The Texas builder writes a different record: `fields` is the COUNT
 * and the blanks are in `rows`, keyed `field`. Both readers did
 * `(doc.fields ?? []).map(...)`, which throws a TypeError on a number, so the
 * verifier died at startup on fourteen documents across six Texas families --
 * and because both mutation suites decide their baseline by whether that
 * process exits zero, both had been printing "BASELINE IS RED" and proving
 * nothing at all. Two gates inert behind one unhandled shape.
 *
 * What this must NOT do is fall back to an empty list on an unrecognised shape.
 * That turns a census the reader cannot read into a census with nothing to
 * find, which is the mirror this factory keeps having to remove: a record
 * asserting its own cleanliness because it never looked. An unknown shape
 * throws, and the message names the document.
 *
 * The two readers lived in separate files and were identical, which is how they
 * came to share a defect. They share this instead.
 */
export function blanksOfDocument(doc) {
  if (Array.isArray(doc?.fields)) return doc.fields;
  if (Array.isArray(doc?.rows)) {
    return doc.rows.map((r) => ({
      name: r.field ?? r.name,
      type: r.type,
      effectiveLabel: r.effectiveLabel ?? null,
      regionHeading: r.regionHeading ?? null,
    }));
  }
  if (doc?.fields === undefined && doc?.rows === undefined) return [];
  throw new Error(`census document ${doc?.documentId ?? doc?.formNumber ?? "(unnamed)"} carries neither a fields array nor a rows array (fields is ${typeof doc?.fields}); refusing to read it as empty`);
}

/** Every blank in one census, flattened, whichever shape the census is in. */
export function blanksOf(census) {
  if (Array.isArray(census?.documents)) {
    return census.documents.flatMap((doc) => blanksOfDocument(doc).map((field) => ({
      field, documentId: doc.documentId ?? null, captionOnly: doc.captionOnly === true,
    })));
  }
  return (census?.fields ?? []).map((field) => ({ field, documentId: null, captionOnly: false }));
}
