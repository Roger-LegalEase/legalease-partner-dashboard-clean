/**
 * Does the accepted receipt still describe the bytes that are here now?
 *
 * ONE implementation of that question, shared by the two surfaces that ask it.
 *
 * `generate-product-wiring.mjs` already asked it correctly: before writing an
 * acceptanceReceipt into a binding a route resolver would install from, it
 * re-hashed the canonical (and the boundary, when the receipt bound one) and
 * wrote `acceptanceReceipt: null` when the bytes had moved underneath. That is
 * the test lifted here, unchanged in substance.
 *
 * `verify-lane-contracts.mjs` L4 did NOT ask it. It built its proven set from
 * `currentRasterState === "RASTER_PASS"` and `coverage.complete === true` --
 * two strings in a data file -- and never opened the PDF the row pins. A family
 * therefore stayed COMPLETE_PACKET_PROVEN on a receipt bound to a canonical
 * that no longer exists, and L4 went on reporting 9/9. The two surfaces
 * disagreed, and the weaker one was the gate.
 *
 * WHAT THIS MODULE IS NOT. It is not an acceptance framework and it does not
 * duplicate one. It answers exactly two questions about an already-accepted
 * receipt -- do the bytes still match, and did the receipt cover the family --
 * and it answers nothing about provenance. Which workflow minted the receipt,
 * which run, which job conclusion, whether the gate could be dispatched at all:
 * that is L6's property and it stays there. Nor does it decide anything. It
 * returns a verdict object; the caller decides what a verdict costs.
 *
 * THE DISTINCTION THAT MATTERS MOST. A file that is ABSENT is not a file that
 * is WRONG.
 *
 * A lane ran the truth checks in a worktree with no operational Nationwide
 * mount and produced 24 findings of A1_MISSING_ON_DISK -- every one of them
 * false, because nothing was missing from the corpus, only from that
 * filesystem. Sparse checkout has caught nine lanes in this operation the same
 * way. Neither absence proves the current bytes valid, so neither may be
 * counted as proof; but they carry a different remedy from corruption. Mount
 * the custody, or complete the checkout, and re-measure -- as against rebuild
 * the packet and re-raster it. Reporting the first as the second sends a lane
 * to regenerate bytes that were never damaged, and reporting the second as the
 * first leaves a broken family standing.
 *
 * So an evaluation carries `conclusive`. `proven === true` says the bytes are
 * verified. `proven === false && conclusive === true` says they are verified
 * WRONG. `conclusive === false` says this filesystem cannot answer, and the
 * caller must neither count the family nor accuse it.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/** How a single named file compares to the digest something pinned it by. */
export const IDENTITY = {
  MATCH: "MATCH",                             // re-hashed here, equal to the pin
  MISMATCH: "MISMATCH",                       // re-hashed here, NOT equal: confirmed
  ABSENT: "ABSENT",                           // the custody is here, this file is not
  CUSTODY_NOT_MOUNTED: "CUSTODY_NOT_MOUNTED", // the corpus holding it is not here at all
  UNREADABLE: "UNREADABLE",                   // present and cannot be read
  NOT_PINNED: "NOT_PINNED"                    // nothing to compare against
};

/** Whether an accepted receipt still proves the family, and if not, why. */
export const ACCEPTANCE = {
  PROVEN_ON_CURRENT_BYTES: "PROVEN_ON_CURRENT_BYTES",
  NO_ACCEPTED_RECEIPT: "NO_ACCEPTED_RECEIPT",
  RECEIPT_IS_NOT_A_PASS: "RECEIPT_IS_NOT_A_PASS",
  ARTIFACT_IDENTITY_MISMATCH: "ARTIFACT_IDENTITY_MISMATCH",
  RECEIPT_PINS_OTHER_BYTES_THAN_THE_ROW: "RECEIPT_PINS_OTHER_BYTES_THAN_THE_ROW",
  COVERAGE_INCOMPLETE: "COVERAGE_INCOMPLETE",
  RECEIPT_COVERS_A_DIFFERENT_DOCUMENT: "RECEIPT_COVERS_A_DIFFERENT_DOCUMENT",
  RECEIPT_DECLARES_NO_COVERAGE: "RECEIPT_DECLARES_NO_COVERAGE",
  IDENTITY_UNVERIFIABLE_HERE: "IDENTITY_UNVERIFIABLE_HERE"
};

/** Only these say the current bytes are verified wrong rather than unverified. */
const CONCLUSIVE_FAILURES = new Set([
  ACCEPTANCE.NO_ACCEPTED_RECEIPT,
  ACCEPTANCE.RECEIPT_IS_NOT_A_PASS,
  ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH,
  ACCEPTANCE.RECEIPT_PINS_OTHER_BYTES_THAN_THE_ROW,
  ACCEPTANCE.COVERAGE_INCOMPLETE,
  ACCEPTANCE.RECEIPT_COVERS_A_DIFFERENT_DOCUMENT,
  ACCEPTANCE.RECEIPT_DECLARES_NO_COVERAGE
]);

/*
 * A corpus root is a directory whose absence means "not mounted here" rather
 * than "this file was deleted". Longest prefix wins, so a census fixture is
 * attributed to the census overlay rather than to data/.
 */
export const DEFAULT_CUSTODY_ROOTS = [
  "data/rcap-all50/overlays/census-v1",
  "data/rcap-all50/overlays",
  "data/rcap-all50",
  "private/Nationwide Record Clearing"
];

const isDigest = (d) => /^[0-9a-f]{64}$/.test(String(d ?? ""));

function custodyRootFor(rel, custodyRoots) {
  const posix = String(rel ?? "").split(path.sep).join("/");
  let best = null;
  for (const r of custodyRoots) {
    if (posix === r || posix.startsWith(`${r}/`)) {
      if (!best || r.length > best.length) best = r;
    }
  }
  return best;
}

/**
 * Re-hash one file and say how it compares to its pin -- and, when it does not
 * compare at all, say which kind of silence that is.
 */
export function identityOf(root, rel, pinned, { custodyRoots = DEFAULT_CUSTODY_ROOTS } = {}) {
  const out = { path: rel ?? null, pinned: pinned ?? null, actual: null, identity: IDENTITY.NOT_PINNED, custodyRoot: null };
  if (!rel || !isDigest(pinned)) return out;
  const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
  const custody = custodyRootFor(rel, custodyRoots);
  out.custodyRoot = custody;
  if (!fs.existsSync(abs)) {
    /* Absent because the custody is not here, or absent from a custody that is?
     * The remedy differs, so the finding does. */
    if (custody && !fs.existsSync(path.join(root, custody))) {
      out.identity = IDENTITY.CUSTODY_NOT_MOUNTED;
      return out;
    }
    out.identity = IDENTITY.ABSENT;
    return out;
  }
  let bytes;
  try { bytes = fs.readFileSync(abs); }
  catch { out.identity = IDENTITY.UNREADABLE; return out; }
  out.actual = crypto.createHash("sha256").update(bytes).digest("hex");
  out.identity = out.actual === pinned ? IDENTITY.MATCH : IDENTITY.MISMATCH;
  return out;
}

/**
 * Every document the accepted receipt is answerable for on this row: the
 * canonical it pins, the boundary when it bound one, and every other document
 * the row declares that the coverage says the verdict covered.
 *
 * A verdict that covered a document is a verdict about that document's bytes.
 * Re-hashing only the canonical would let a companion filing move under a
 * receipt that claims to have rendered it.
 */
function requiredDocuments(row, receipt) {
  const required = [];
  const seen = new Set();
  const add = (role, name, rel, pinned, why) => {
    const key = `${rel}::${pinned}`;
    if (!rel || !isDigest(pinned) || seen.has(key)) return;
    seen.add(key);
    required.push({ role, name: name ?? (rel ? rel.split("/").pop() : null), path: rel, pinned, why });
  };

  add("canonical", null, row.canonicalPdfPath, receipt.boundToCanonicalSha256,
    "the canonical the accepted receipt binds");
  if (receipt.boundToBoundarySha256) {
    add("boundary", null, row.boundaryPdfPath, receipt.boundToBoundarySha256,
      "the boundary the accepted receipt binds");
  }

  const covered = new Set([
    ...(Array.isArray(receipt.documentsCovered) ? receipt.documentsCovered : []),
    ...(Array.isArray(row.coverage?.rastered) ? row.coverage.rastered : []),
    ...(Array.isArray(row.coverage?.documents) ? row.coverage.documents : [])
  ].map(String));
  for (const d of row.documents ?? []) {
    if (!d || !d.path || !isDigest(d.sha256)) continue;
    /* Boundary and route-level fixtures a row declares but the coverage does
     * not name are bound by hash and were not rendered by this gate; the row
     * says so itself. They are still identities the row pins, so a declared
     * boundary is checked; anything else is checked only where the coverage
     * claims the verdict reached it. */
    if (d.role !== "canonical" && d.role !== "boundary" && !covered.has(String(d.name))) continue;
    add(d.role ?? "document", d.name, d.path, d.sha256,
      `a ${d.role ?? "document"} the row declares and the accepted coverage carries`);
  }
  return required;
}

/**
 * Judge one candidate row against the bytes on disk right now.
 *
 * `requireReceiptDeclaredCoverage` is the one place the two callers differ, and
 * deliberately. A binding that a route installs from will not accept a receipt
 * that never said what it covered; the lane contract will, because thirteen
 * rows carry an older receipt shape that predates documentsCovered and failing
 * them here would demote five proven families over a schema drift rather than
 * over anything about their bytes. Where the older shape is accepted, coverage
 * is still required -- it is read from the row, which is where L7 measures it.
 */
export function evaluateAcceptance(root, row, {
  requireReceiptDeclaredCoverage = false,
  custodyRoots = DEFAULT_CUSTODY_ROOTS
} = {}) {
  const reasons = [];
  const fail = (status) => ({
    status, proven: false, conclusive: CONCLUSIVE_FAILURES.has(status),
    reasons, documents: [], row
  });

  const receipt = row?.rasterReceipt ?? null;
  if (!receipt) { reasons.push("the row carries no accepted receipt"); return fail(ACCEPTANCE.NO_ACCEPTED_RECEIPT); }
  if (receipt.verdict !== "RASTER_PASS") {
    reasons.push(`the receipt returned ${receipt.verdict ?? "no verdict"}`);
    return fail(ACCEPTANCE.RECEIPT_IS_NOT_A_PASS);
  }

  /* The receipt and the row must pin the SAME bytes before either is asked
   * whether disk agrees. A row re-pinned to a rebuilt packet while its receipt
   * still names the old ones is a stale verdict wearing a fresh hash. */
  if (isDigest(row.canonicalPdfSha256) && isDigest(receipt.boundToCanonicalSha256)
    && row.canonicalPdfSha256 !== receipt.boundToCanonicalSha256) {
    reasons.push(`the row pins ${String(row.canonicalPdfSha256).slice(0, 12)} and its receipt is bound to ${String(receipt.boundToCanonicalSha256).slice(0, 12)}`);
    return fail(ACCEPTANCE.RECEIPT_PINS_OTHER_BYTES_THAN_THE_ROW);
  }

  /* ---- coverage: what the verdict was answerable for --------------------- */
  const declaresCoverage = typeof receipt.coversTheWholeFamily === "boolean"
    || Array.isArray(receipt.documentsCovered);
  if (!declaresCoverage && requireReceiptDeclaredCoverage) {
    reasons.push("the receipt predates documentsCovered/coversTheWholeFamily and never said what it covered");
    return fail(ACCEPTANCE.RECEIPT_DECLARES_NO_COVERAGE);
  }

  const rowDocuments = (row.coverage?.documents ?? []).map(String);
  const rowRastered = new Set((row.coverage?.rastered ?? []).map(String));
  const rowUncovered = rowDocuments.filter((d) => !rowRastered.has(d));
  if (row.coverage?.complete !== true) {
    reasons.push(`the row declares partial coverage${rowUncovered.length ? `; unrendered: ${rowUncovered.join(", ")}` : ""}`);
    return fail(ACCEPTANCE.COVERAGE_INCOMPLETE);
  }
  if (rowUncovered.length) {
    reasons.push(`the row claims complete coverage while ${rowUncovered.length} document(s) go unrendered: ${rowUncovered.join(", ")}`);
    return fail(ACCEPTANCE.COVERAGE_INCOMPLETE);
  }

  if (declaresCoverage) {
    if (receipt.coversTheWholeFamily === false) {
      reasons.push("the receipt says it does not cover the whole family");
      return fail(ACCEPTANCE.COVERAGE_INCOMPLETE);
    }
    if (Array.isArray(receipt.documentsCovered)) {
      const receiptCovered = receipt.documentsCovered.map(String);
      const known = new Set([...rowDocuments, ...(row.documents ?? []).map((d) => String(d?.name))]);
      const foreign = receiptCovered.filter((d) => !known.has(d));
      if (foreign.length) {
        reasons.push(`the receipt covers ${foreign.join(", ")}, which this row does not declare`);
        return fail(ACCEPTANCE.RECEIPT_COVERS_A_DIFFERENT_DOCUMENT);
      }
      const missed = rowDocuments.filter((d) => !receiptCovered.includes(d));
      if (missed.length) {
        reasons.push(`the receipt does not cover ${missed.join(", ")}, which the row declares`);
        return fail(ACCEPTANCE.COVERAGE_INCOMPLETE);
      }
      if ((receipt.documentsNotCovered ?? []).length) {
        reasons.push(`the receipt records ${receipt.documentsNotCovered.length} document(s) it did not cover`);
        return fail(ACCEPTANCE.COVERAGE_INCOMPLETE);
      }
    }
  }

  /* ---- identity: the bytes themselves ------------------------------------ */
  const documents = requiredDocuments(row, receipt)
    .map((d) => ({ ...d, ...identityOf(root, d.path, d.pinned, { custodyRoots }) }));
  if (documents.length === 0) {
    reasons.push("the row pins no document by digest, so there is nothing for the receipt to be bound to");
    return fail(ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH);
  }

  const mismatched = documents.filter((d) => d.identity === IDENTITY.MISMATCH);
  if (mismatched.length) {
    for (const d of mismatched) {
      reasons.push(`${d.role} ${d.path} was accepted as ${String(d.pinned).slice(0, 12)} and now hashes to ${String(d.actual).slice(0, 12)}`);
    }
    return { status: ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH, proven: false, conclusive: true, reasons, documents, row };
  }

  const silent = documents.filter((d) => d.identity !== IDENTITY.MATCH);
  if (silent.length) {
    for (const d of silent) {
      const why = d.identity === IDENTITY.CUSTODY_NOT_MOUNTED
        ? `its custody ${d.custodyRoot} is not mounted here, so this filesystem cannot say whether the bytes are still the accepted ones`
        : d.identity === IDENTITY.UNREADABLE
          ? "it is present and cannot be read here"
          : "it is not present here, so the accepted bytes cannot be re-hashed";
      reasons.push(`${d.role} ${d.path}: ${why}`);
    }
    return { status: ACCEPTANCE.IDENTITY_UNVERIFIABLE_HERE, proven: false, conclusive: false, reasons, documents, row };
  }

  return { status: ACCEPTANCE.PROVEN_ON_CURRENT_BYTES, proven: true, conclusive: true, reasons, documents, row };
}

/*
 * Refusals are not equally informative. A family whose canonical demonstrably
 * moved needs naming ahead of one this worktree simply cannot see, so when no
 * candidate proves the family the strongest-evidence refusal is the one
 * reported.
 */
const REFUSAL_RANK = [
  ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH,
  ACCEPTANCE.RECEIPT_PINS_OTHER_BYTES_THAN_THE_ROW,
  ACCEPTANCE.RECEIPT_COVERS_A_DIFFERENT_DOCUMENT,
  ACCEPTANCE.COVERAGE_INCOMPLETE,
  ACCEPTANCE.RECEIPT_DECLARES_NO_COVERAGE,
  ACCEPTANCE.RECEIPT_IS_NOT_A_PASS,
  ACCEPTANCE.IDENTITY_UNVERIFIABLE_HERE,
  ACCEPTANCE.NO_ACCEPTED_RECEIPT
];

/**
 * The newest candidate row whose accepted receipt still describes the bytes on
 * disk, or the most informative reason none does. Newest-first, exactly as
 * generate-product-wiring walked its candidates.
 */
export function acceptedRasterFor(root, candidateRows, options = {}) {
  const candidates = candidateRows ?? [];
  if (candidates.length === 0) {
    return { proven: false, conclusive: true, status: ACCEPTANCE.NO_ACCEPTED_RECEIPT, reasons: ["no row in the raster queue"], documents: [], row: null };
  }
  const refusals = [];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const evaluation = evaluateAcceptance(root, candidates[i], options);
    if (evaluation.proven) return evaluation;
    refusals.push(evaluation);
  }
  refusals.sort((a, b) => REFUSAL_RANK.indexOf(a.status) - REFUSAL_RANK.indexOf(b.status));
  return refusals[0];
}

/**
 * Index the queue: historical rows first, current rows last, so "newest-first"
 * walks the current row before the row it superseded.
 *
 * `includeSuperseded` is the second place the two callers differ, and for the
 * same kind of reason as the first. A BINDING asks "is there an accepted
 * receipt that still describes these exact bytes?" -- a superseded row whose
 * digests still match answers that, which is why generate-product-wiring walks
 * both lists. A PROMOTION GATE asks "is this family's current raster row a
 * pass?", and a superseded row is by definition not it. Letting a historical
 * row answer for a family whose current row is pending is how a promotion slips
 * through: one family in the queue today holds a RASTER_PASS only in
 * historicalRasterRows, and reading it as current made L4's own negative
 * control stop firing.
 */
export function candidateRowsByFamily(queue, { includeSuperseded = true } = {}) {
  const byFamily = new Map();
  const lists = includeSuperseded
    ? [...(queue?.historicalRasterRows ?? []), ...(queue?.rows ?? [])]
    : [...(queue?.rows ?? [])];
  for (const r of lists) {
    if (!r?.familyId) continue;
    if (!byFamily.has(r.familyId)) byFamily.set(r.familyId, []);
    byFamily.get(r.familyId).push(r);
  }
  return byFamily;
}

/**
 * A corpus this run could not actually inspect must not report zero defects.
 *
 * Zero findings has two causes and they are opposite: nothing is wrong, or
 * nothing was read. A verifier that cannot tell them apart passes loudest
 * exactly when it is most broken. So the inventory answers for itself first --
 * it must parse, and it must carry the rows it is supposed to carry -- and only
 * then is a zero-defect result meaningful. A correctly inspected corpus with no
 * defects passes; that is the point of separating the two.
 */
export function inventoryIsInspectable(queue, { minimumRows = 1 } = {}) {
  if (!queue || typeof queue !== "object") {
    return { ok: false, why: "the raster queue is absent or does not parse, so nothing was inspected" };
  }
  if (!Array.isArray(queue.rows)) {
    return { ok: false, why: "the raster queue declares no rows array, so nothing was inspected" };
  }
  if (queue.rows.length < minimumRows) {
    return { ok: false, why: `the raster queue holds ${queue.rows.length} row(s), fewer than the ${minimumRows} an inspection needs; an empty inventory is not a clean one` };
  }
  return { ok: true, why: `${queue.rows.length} row(s) available to inspect` };
}
