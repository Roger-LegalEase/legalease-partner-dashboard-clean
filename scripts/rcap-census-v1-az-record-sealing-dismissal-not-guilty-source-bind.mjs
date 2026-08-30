// Source bind check for ONE packet family:
//   az_record_sealing_dismissal_not_guilty-set  (AZ record sealing after a
//   dismissal or a not-guilty verdict, official_pdf_fill).
//
// Route Obligation Census v1 flags this family OFFICIAL_SOURCE_ACQUISITION_REQUIRED,
// but source-custody-reconciliation.json classifies it SOURCE_ALREADY_HELD: both
// document-shaped sources it names resolve to files in the verified corpus. So the
// work is not acquisition, it is BINDING the held bytes -- and a bind is only real
// when the bytes are hashed.
//
// WHAT THIS REFUSES TO DO
//
// It will not report a bind from a record. local-source-corpus-index.json and the
// custody reconciliation both carry a SHA-256 for each form, and the two agree; that
// agreement is a consistency check on the bookkeeping, NOT custody. Custody is a file
// on disk whose bytes hash to the recorded digest. With the corpus unmounted there are
// no bytes, and an absent corpus is not an empty one -- reading absence as "nothing to
// check" is the failure scripts/rcap-official-forms/operational-corpus-precondition.mjs
// exists to stop. This module names the exact path it expected in every refusal.
//
// Exit 0 = every named source bound against its own bytes. Exit 1 = refused, with reasons.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const WORKLIST_GROUP_ID = "az_record_sealing_dismissal_not_guilty-set";
export const CORPUS_ENV = "MASTER_LIBRARY_SOURCE_DIR";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CUSTODY = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";

/** The Master Library, wherever it is pointed at. Its own index names the default root. */
export function corpusRoot(corpusIndex) {
  return process.env[CORPUS_ENV]
    ? path.resolve(process.env[CORPUS_ENV])
    : path.join(ROOT, corpusIndex.corpusRoot);
}

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));

/** The custody row for this family, or null. One family only -- siblings own the others. */
function custodyRow(custody) {
  return custody.rows.find((row) => row.worklistGroupId === WORKLIST_GROUP_ID) ?? null;
}

/**
 * Do the two independent records agree about what is held?
 *
 * This is checkable with no corpus at all, and it is worth checking separately: if the
 * census bookkeeping disagrees with itself about which bytes are authoritative, then no
 * hash of any file can settle which record was right.
 */
export function recordsAgree(row, corpusIndex) {
  return row.documentSources.map((source) => {
    const held = source.heldAs ?? null;
    const entry = held ? corpusIndex.entries.find((e) => e.path === held.path) ?? null : null;
    return {
      sourceId: source.sourceId,
      resolvedInCustody: source.resolved === true,
      corpusPath: held?.path ?? null,
      indexEntryFound: entry !== null,
      custodySha256: held?.sha256 ?? null,
      indexSha256: entry?.sha256 ?? null,
      indexByteLength: entry?.byteLength ?? null,
      indexPageCount: entry?.pageCount ?? null,
      indexAcroFieldCount: entry?.acroFieldCount ?? null,
      agree: Boolean(entry) && entry.sha256 === held?.sha256
    };
  });
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/**
 * Hash each named source against the corpus on disk.
 *
 * Every outcome is stated as what was observed. A file that is not there is
 * "absent", never "verified by record" and never silently skipped.
 */
export function bindSources(agreement, root) {
  return agreement.map((record) => {
    const target = record.corpusPath ? path.join(root, record.corpusPath) : null;
    if (!target || !fs.existsSync(target)) {
      return { ...record, bound: false, observed: null, refusal: "source_bytes_absent", expectedAt: target };
    }
    let bytes;
    try { bytes = fs.readFileSync(target); }
    catch (error) {
      return { ...record, bound: false, observed: null, refusal: "source_unreadable", expectedAt: target, error: String(error.message ?? error) };
    }
    const observed = { sha256: sha256(bytes), byteLength: bytes.length };
    const matches = observed.sha256 === record.indexSha256 && observed.byteLength === record.indexByteLength;
    return {
      ...record,
      bound: matches,
      observed,
      expectedAt: target,
      refusal: matches ? null : "source_sha256_mismatch"
    };
  });
}

export function run() {
  const corpusIndex = readJson(CORPUS_INDEX);
  const custody = readJson(CUSTODY);
  const row = custodyRow(custody);
  if (!row) throw new Error(`No custody row for ${WORKLIST_GROUP_ID}`);

  const root = corpusRoot(corpusIndex);
  const corpusPresent = fs.existsSync(root);
  const agreement = recordsAgree(row, corpusIndex);
  const sources = corpusPresent
    ? bindSources(agreement, root)
    : agreement.map((record) => ({
        ...record,
        bound: false,
        observed: null,
        refusal: "corpus_absent",
        expectedAt: record.corpusPath ? path.join(root, record.corpusPath) : null
      }));

  const refusals = [];
  if (!corpusPresent) {
    refusals.push({
      code: "corpus_absent",
      because:
        "The Master Library corpus is not mounted, so no source file can be hashed and no bind is possible. " +
        "An absent corpus is not an empty one: treating it as nothing-to-check would let a family whose bytes were " +
        "never opened report as bound. private/ is git-ignored, so the corpus is a working input that must be mounted, " +
        "not something the clone carries.",
      expectedAt: root,
      orSetTheEnvironmentVariable: CORPUS_ENV
    });
  }
  for (const source of sources) {
    if (!source.agree) {
      refusals.push({
        code: "records_disagree",
        sourceId: source.sourceId,
        because:
          "The custody reconciliation and the corpus index name different bytes (or the index has no entry for the " +
          "path custody names), so there is no single recorded digest to bind against."
      });
    }
    if (source.refusal && source.refusal !== "corpus_absent") {
      refusals.push({ code: source.refusal, sourceId: source.sourceId, expectedAt: source.expectedAt });
    }
  }

  return {
    schemaVersion: "rcap-census-v1-family-source-bind/v1",
    worklistGroupId: WORKLIST_GROUP_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdictions: row.jurisdictions,
    custodyClass: row.custodyClass,
    acquisitionCommissioned: row.commissionAcquisition === true,
    corpus: { root, present: corpusPresent, declaredRoot: corpusIndex.corpusRoot, environmentOverride: CORPUS_ENV },
    nonDocumentSourceIds: row.nonDocumentSourceIds,
    sources,
    recordsAgreeOnEverySource: sources.every((s) => s.agree),
    everySourceBoundToItsOwnBytes: corpusPresent && sources.every((s) => s.bound),
    refusals,
    grantsNoAuthority:
      "A source bind is custody of bytes and nothing else. It maps no field, proves no packet, opens no route, and requests no approval."
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.everySourceBoundToItsOwnBytes ? 0 : 1);
}
