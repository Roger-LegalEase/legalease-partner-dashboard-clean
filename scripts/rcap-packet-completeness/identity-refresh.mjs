/**
 * A rebuild regenerates a source receipt. It must not regenerate away the
 * annotations a repair lane wrote on it by hand.
 *
 * WHAT IS LOST TODAY. An identityRefresh block is written by a human lane that
 * recovered the historical blob carrying a pin, compared the entries the
 * receipt actually binds object-for-object across a whole-file drift, and
 * recorded that the bound content did not move. The builder that writes the
 * receipt knows nothing about that, so it emits a fresh document and the block
 * is gone -- with no source change, no diff a reader would notice, and nothing
 * saying why. Three lanes have hit it. One lost three annotations per receipt,
 * nested `was.byteLength` included, on a rebuild it performed itself, and
 * restored them by hand. Seventeen families were restored to
 * COMPLETE_PACKET_PROVEN on exactly these annotations, so any rebuild of any of
 * them silently undoes the repair.
 *
 * THE RULE, AND WHY IT IS NOT "COPY THE OLD BLOCK".
 *
 *   Preserve a SOURCE-BOUND annotation when the source identity is unchanged.
 *   Do not carry an ARTIFACT-BOUND approval or acceptance forward when the
 *   artifact identity changes.
 *
 * An identityRefresh is an assertion about ONE pin: "this record's whole-file
 * identity moved from `was.sha256` to the sha256 this block sits beside, and
 * the entries we bind are byte-identical across that move." The assertion is
 * still true of the bytes in front of us exactly when the rebuild computes the
 * SAME sha256 the annotation was written against. Then the annotation is
 * carried forward verbatim.
 *
 * When the rebuild computes a DIFFERENT sha256, the record moved again. Nobody
 * has compared anchors across that second move; the annotation describes a
 * transition that no longer ends where the bytes are. Copying it forward would
 * make a stale comparison look current and would launder acceptance onto bytes
 * no human ever read -- which is worse than the erasure this module exists to
 * stop. So it is dropped, loudly, and the receipt lapses honestly.
 *
 * The same reasoning rejects a block that is not a source-identity note at all.
 * An approval, a raster receipt, a visual sign-off: those are bound to an
 * artifact, not to a source pin, and this path never carries one.
 *
 * VERBATIM. A carried annotation is deep-cloned unchanged -- no marker, no
 * timestamp, no note of its own. The rebuild's output stays byte-identical to
 * the receipt a human wrote, which is what keeps the tripwire
 * (verify-identity-refresh-survives-rebuild.mjs) green and keeps a rebuild from
 * producing a diff that says nothing.
 */

/* Pins hide under at least five path keys and six container names across the
 * corpus -- committedRecords, documents, compositionSources, groundingRecords,
 * committedLegalRecords, records. Naming containers is how an earlier attempt
 * silently skipped most of them, so this walks by SHAPE: an object carrying a
 * repository path and a sha256 is a pin, wherever it sits. */
const PIN_PATH_KEYS = ["pathInRepository", "path", "pathInPack", "pathInArchive", "recordPath", "declaredPath", "sourcePath", "custodyPath"];

/* An annotation carrying any of these is not a source-identity note. It is
 * evidence about an artifact, and artifact evidence never rides a rebuild. */
const ARTIFACT_BOUND_KEYS = [
  "acceptanceReceipt", "rasterReceipt", "approval", "approvedBy", "approvedAt",
  "visualReview", "counselReview", "verdict", "boundToCanonicalSha256",
  "boundToBoundarySha256", "workflowRunId", "renderedCommitSha", "artifactId"
];

const isDigest = (d) => /^[0-9a-f]{64}$/.test(String(d ?? ""));

export function pathKeyOf(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  return PIN_PATH_KEYS.find((k) => typeof node[k] === "string") ?? null;
}

/** Every pin in a receipt: an object with a repository path and a sha256. */
export function eachPin(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const x of node) eachPin(x, visit); return; }
  const key = pathKeyOf(node);
  if (key && typeof node.sha256 === "string") visit(node, node[key]);
  for (const v of Object.values(node)) eachPin(v, visit);
}

/**
 * Is this block a source-identity note that may ride a rebuild at all?
 * Independent of whether the source moved -- that is the second question.
 */
export function annotationIsSourceBound(annotation) {
  if (!annotation || typeof annotation !== "object" || Array.isArray(annotation)) {
    return { ok: false, why: "the annotation is not an object" };
  }
  const artifactKeys = ARTIFACT_BOUND_KEYS.filter((k) => k in annotation);
  if (artifactKeys.length) {
    return { ok: false, why: `it carries artifact-bound evidence (${artifactKeys.join(", ")}), which is never carried across a rebuild` };
  }
  if (!annotation.was || typeof annotation.was !== "object" || !isDigest(annotation.was.sha256)) {
    return { ok: false, why: "it records no previous source identity (was.sha256), so it is not a statement about a source pin" };
  }
  return { ok: true, why: "it records a previous source identity and no artifact-bound evidence" };
}

/**
 * Carry forward every annotation the previous receipt holds that is still true
 * of the bytes this rebuild measured.
 *
 * `previous` is the receipt on disk (or at a ref); `next` is the document the
 * builder is about to write. `next` is mutated in place and returned.
 */
export function carryForwardIdentityRefresh(previous, next) {
  const decisions = [];
  if (!previous || typeof previous !== "object" || !next || typeof next !== "object") {
    return { document: next, carried: [], dropped: [], decisions };
  }

  /* Index the previous receipt's annotated pins by path. A path carrying more
   * than one pin keeps them all, matched on the sha256 they were written
   * against. */
  const before = new Map();
  eachPin(previous, (pin, at) => {
    if (!pin.identityRefresh) return;
    if (!before.has(at)) before.set(at, []);
    before.get(at).push({ pin, at, annotation: pin.identityRefresh, writtenAgainst: pin.sha256 });
  });
  if (before.size === 0) return { document: next, carried: [], dropped: [], decisions };

  const carried = [];
  const dropped = [];
  const claimed = new Set();

  eachPin(next, (pin, at) => {
    if (pin.identityRefresh) return;          // the builder wrote one; leave it alone
    const held = before.get(at) ?? [];
    for (const candidate of held) {
      if (claimed.has(candidate)) continue;

      const shape = annotationIsSourceBound(candidate.annotation);
      if (!shape.ok) {
        claimed.add(candidate);
        dropped.push({ path: at, why: shape.why, wasSha256: candidate.annotation?.was?.sha256 ?? null });
        continue;
      }

      /*
       * THE WHOLE FIX, IN ONE COMPARISON. The annotation asserts a move that
       * ENDS at `candidate.writtenAgainst`. It is still true of what this
       * rebuild measured only if the rebuild measured the same thing.
       */
      if (pin.sha256 !== candidate.writtenAgainst) {
        claimed.add(candidate);
        dropped.push({
          path: at,
          why: `the source moved again: the annotation was written against ${String(candidate.writtenAgainst).slice(0, 12)} and this build measured ${String(pin.sha256).slice(0, 12)}. Nobody has compared anchors across that second move, so the recorded comparison is stale and is not carried forward.`,
          wasSha256: candidate.annotation.was.sha256,
          writtenAgainst: candidate.writtenAgainst,
          measuredNow: pin.sha256
        });
        continue;
      }

      /* Reverted to the pre-refresh bytes: the move the annotation records has
       * been undone, so the note describes a transition away from where we are.
       * Unreachable while the comparison above holds, asserted because a future
       * edit to it must not open this door. */
      if (pin.sha256 === candidate.annotation.was.sha256) {
        claimed.add(candidate);
        dropped.push({ path: at, why: "the source reverted to the identity the annotation records as previous", wasSha256: candidate.annotation.was.sha256 });
        continue;
      }

      pin.identityRefresh = structuredClone(candidate.annotation);
      claimed.add(candidate);
      carried.push({ path: at, sha256: pin.sha256, wasSha256: candidate.annotation.was.sha256 });
      break;
    }
  });

  /* An annotated pin the rebuild no longer emits at all: the record is no
   * longer bound by this receipt, so there is nothing to annotate. Reported,
   * because a silently unbound source is its own defect. */
  for (const held of before.values()) {
    for (const candidate of held) {
      if (claimed.has(candidate)) continue;
      dropped.push({ path: candidate.at, why: "this build binds no pin at that path, so the annotation has nothing to sit on", wasSha256: candidate.annotation?.was?.sha256 ?? null });
    }
  }

  for (const c of carried) decisions.push(`carried  ${c.path} (unchanged at ${String(c.sha256).slice(0, 12)})`);
  for (const d of dropped) decisions.push(`dropped  ${d.path} — ${d.why}`);
  return { document: next, carried, dropped, decisions };
}

/**
 * The call a builder makes: given the receipt it is about to write and the path
 * it will write it to, return the document with every still-true annotation
 * restored.
 *
 * Fail-safe by construction. A previous receipt that is absent, unreadable or
 * not JSON leaves the document exactly as the builder composed it -- this
 * module may cost a build nothing.
 */
export function preserveIdentityRefresh(fs, receiptPath, document, { log = null } = {}) {
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(receiptPath, "utf8")); }
  catch { return document; }
  let result;
  try { result = carryForwardIdentityRefresh(previous, document); }
  catch { return document; }
  if (log && result.decisions.length) for (const d of result.decisions) log(`identityRefresh: ${d}`);
  return result.document;
}
