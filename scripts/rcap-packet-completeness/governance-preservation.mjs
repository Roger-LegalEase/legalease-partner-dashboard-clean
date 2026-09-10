/**
 * A rebuild must not delete the governance state on a family's product wiring.
 *
 * WHAT IS LOST TODAY. `product-wiring.json` is regenerated wholesale by the
 * component that writes it -- a per-family builder, or the central
 * generate-product-wiring.mjs. Six keys on the committed `binding` are NOT
 * authored by that component and were being erased on every rebuild:
 *
 *   acceptanceReceipt   lastIndependentVerification   paymentEligible
 *   sponsorshipEligible whyPaymentIsClosed            maintenanceRelationship
 *
 * Two lanes found this independently, neither looking for it. FIX07 rebuilt
 * mn_petition_15218-set at base, before any edit of its own, and lost a
 * hash-bound RASTER_PASS receipt (workflow run 34413372916). FIX02 reproduced
 * the same six-key loss on the UNTOUCHED mn_petition_juvenile_as_adult-set
 * script, with byte-identical fixtures either side -- which is exactly why
 * nothing downstream reports it. The record is
 * data/rcap-grade-a/packet-factory-24h/REBUILD_ERASES_GOVERNANCE_STATE.json.
 *
 * It is worse than it looks. `paymentEligible: false` and `whyPaymentIsClosed`
 * are commercial guards: dropping them opens no route by itself, but it removes
 * the record that the route is CLOSED, and the absence of a record is supposed
 * to be a refusal rather than a gap. A hash-bound acceptance receipt is the only
 * thing standing between a family and a re-render, and it costs a central raster
 * run to replace.
 *
 * THE RULE, AND WHY IT IS NOT "COPY THE OLD BINDING".
 *
 *   Carry a governance value forward when this write does not author one.
 *   Carry an ARTIFACT-BOUND acceptance receipt forward only while it still
 *   describes the bytes this build produced. When it does not, WITHDRAW it --
 *   recorded, with both digests -- rather than deleting it.
 *
 * An acceptance receipt asserts something about ONE set of bytes: "the central
 * raster workflow rendered canonical <boundToCanonicalSha256> and returned this
 * verdict". That assertion is still true of what is in front of us exactly when
 * this build produced those same bytes. Then it is carried forward verbatim.
 *
 * When the build produced different bytes, the receipt has stopped describing
 * the packet. Carrying it forward would launder a verdict onto bytes nobody
 * rendered. Deleting it destroys the evidence and leaves nothing to compare
 * against -- which is what Roger's direction on the staged border remediation
 * forbids in as many words: preserve old receipts as historical evidence, never
 * relabel an old receipt as covering changed output. So it is WITHDRAWN: moved
 * under `acceptanceReceiptWithdrawn`, whole, carrying the digest it was bound to
 * and the digest that replaced it.
 *
 * PRESERVING A VALUE IS NOT DECIDING ONE. Nothing here issues a receipt, marks
 * a family proven, or sets `paymentEligible`, `sponsorshipEligible` or
 * `whyPaymentIsClosed` to anything. Every value it writes was already committed
 * by somebody else; the only thing this module authors is the withdrawal note,
 * and that note asserts a digest comparison and nothing more.
 *
 * NOTHING VARIES RUN TO RUN. No timestamp, no run id, no marker of its own.
 * Two rebuilds of unchanged inputs write byte-identical wiring, which is what
 * keeps the tripwire (verify-governance-state-survives-rebuild.mjs) green and
 * keeps a rebuild from producing a diff that says nothing.
 *
 * THE FOUR IMPLEMENTATIONS THIS REPLACES. The defect record names two. There
 * are four, and two of them delete:
 *
 *   scripts/census-v1-de-expungement/de-expungement-core.mjs
 *     -> preserveIdentityRefresh(), for source-receipt annotations. Its
 *        shape -- fail-safe read, verbatim deep clone, a decisions log, and a
 *        hard refusal to ride artifact-bound evidence across a rebuild -- is
 *        the shape borrowed here.
 *   scripts/build-census-v1-mn_petition_juvenile_as_adult-set.mjs (FIX02)
 *     -> the six keys plus the withdrawal rule. The correct answer, inline.
 *   scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs
 *     -> sets acceptanceReceipt = null on digest mismatch. Deletes.
 *   scripts/build-census-v1-ne-setaside-custodial-set.mjs
 *     -> sets acceptanceReceipt = null and writes prose naming both digests.
 *        Keeps the digests, loses the receipt.
 */

/** The six keys a write of product-wiring.json does not author and must not erase. */
export const GOVERNANCE_KEYS = Object.freeze([
  "acceptanceReceipt",
  "lastIndependentVerification",
  "paymentEligible",
  "sponsorshipEligible",
  "whyPaymentIsClosed",
  "maintenanceRelationship"
]);

/** Where a withdrawn receipt is kept. Never deleted, never carried as current. */
export const WITHDRAWN_KEY = "acceptanceReceiptWithdrawn";

const isDigest = (d) => /^[0-9a-f]{64}$/.test(String(d ?? ""));
const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

export class GovernancePreservationError extends Error {
  constructor(message) { super(message); this.name = "GovernancePreservationError"; }
}

/**
 * The canonical digests this write produced, as a set.
 *
 * A family is not always one canonical PDF. rcap-oh-custom-pleading-clean-tracks
 * carries four, one per track; pa-summary-conviction-set carries three, one per
 * instrument. A receipt binds ONE of them, so "does the receipt still describe
 * this packet" is a membership question, not an equality question. Comparing
 * against a single file picked by name reports four healthy Pennsylvania and
 * Ohio families as stale; it was measured doing exactly that before this
 * accepted a set.
 */
function canonicalSetOf(canonicalSha256, whyCanonicalIsNotMeasured) {
  if (canonicalSha256 === null || canonicalSha256 === undefined) {
    /*
     * A caller that cannot measure a canonical digest must SAY SO IN WORDS, and
     * the words travel in the decisions log. The generator that only rewrites
     * the wiring record moves no packet byte and legitimately has nothing to
     * measure; a packet builder always does, and this is what stops it passing
     * null by accident and getting a silent carry-forward it did not earn.
     */
    if (typeof whyCanonicalIsNotMeasured === "string" && whyCanonicalIsNotMeasured.trim().length > 0) {
      return { measured: false, why: whyCanonicalIsNotMeasured.trim(), set: null };
    }
    throw new GovernancePreservationError(
      "carryForwardGovernance needs the canonical SHA-256 this write produced in order to decide whether the "
      + "committed acceptance receipt still describes these bytes. Pass canonicalSha256 (a 64-hex digest or an "
      + "array of them), or pass whyCanonicalIsNotMeasured saying in words why this write measured none. "
      + "It will not guess, and it will not delete the receipt to avoid the question."
    );
  }
  const list = Array.isArray(canonicalSha256) ? canonicalSha256 : [canonicalSha256];
  const bad = list.filter((d) => !isDigest(d));
  if (bad.length || list.length === 0) {
    throw new GovernancePreservationError(
      `canonicalSha256 must be a 64-hex SHA-256 or a non-empty array of them; received ${JSON.stringify(canonicalSha256)}. `
      + "A digest is measured with a tool over the produced bytes, never transcribed or reconstructed."
    );
  }
  return { measured: true, why: null, set: new Set(list.map((d) => String(d))) };
}

/** Previous withdrawals, normalised to a list. An older single-object form is accepted. */
function priorWithdrawals(previousBinding) {
  const held = previousBinding?.[WITHDRAWN_KEY];
  if (Array.isArray(held)) return held.filter(isObject).map((w) => structuredClone(w));
  if (isObject(held)) return [structuredClone(held)];
  return [];
}

const sameWithdrawal = (a, b) =>
  a?.boundToCanonicalSha256 === b?.boundToCanonicalSha256
  && a?.replacedByCanonicalSha256 === b?.replacedByCanonicalSha256;

function withdrawalNote(receipt, replacedBy) {
  return {
    why: "The acceptance receipt binds an exact canonical SHA-256 and this write's canonical bytes are not those "
      + "bytes, so the receipt does not describe this packet. It is withdrawn and kept as history rather than "
      + "deleted, and it is not carried forward as though it still applied. Only the central raster acceptance "
      + "workflow issues a receipt; nothing here issues one and nothing here sets a verdict.",
    boundToCanonicalSha256: receipt.boundToCanonicalSha256 ?? null,
    replacedByCanonicalSha256: replacedBy,
    withdrawnReceipt: structuredClone(receipt)
  };
}

/**
 * Carry forward every governance value the previous binding holds that this
 * write does not author, and withdraw an acceptance receipt that has stopped
 * describing the bytes.
 *
 * `nextBinding` is mutated in place and returned inside the result.
 *
 * `acceptanceReceipt: null` in `nextBinding` is treated as "this write authored
 * no receipt", not as a decision to erase one. That is deliberate: two builders
 * and the central generator all null the field when they cannot find current
 * evidence, and reading that as an authored value is what makes the erasure look
 * intentional in a diff.
 */
export function carryForwardGovernance(previousBinding, nextBinding, options = {}) {
  const { canonicalSha256 = undefined, whyCanonicalIsNotMeasured = null } = options;
  const decisions = [];
  const carried = [];
  const withdrawn = [];

  if (!isObject(nextBinding)) {
    throw new GovernancePreservationError("carryForwardGovernance was given no binding object to write into");
  }
  if (!isObject(previousBinding)) {
    return { binding: nextBinding, carried, withdrawn, decisions };
  }

  /* ---- the five values that are not bound to an artifact ------------------ */
  for (const key of GOVERNANCE_KEYS) {
    if (key === "acceptanceReceipt") continue;
    if (previousBinding[key] === undefined) continue;
    if (nextBinding[key] !== undefined) {
      decisions.push(`authored  ${key} — this write states its own value; the committed one is not overwritten by this module`);
      continue;
    }
    nextBinding[key] = structuredClone(previousBinding[key]);
    carried.push(key);
    decisions.push(`carried   ${key} — verbatim from the committed binding; this write authored none`);
  }

  /* ---- withdrawals already on the record are history and stay ------------- */
  const held = priorWithdrawals(previousBinding);

  /* ---- the acceptance receipt -------------------------------------------- */
  const previousReceipt = isObject(previousBinding.acceptanceReceipt) ? previousBinding.acceptanceReceipt : null;
  const authoredReceipt = isObject(nextBinding.acceptanceReceipt) ? nextBinding.acceptanceReceipt : null;

  if (previousReceipt) {
    if (authoredReceipt) {
      /* This write brought its own receipt. If it is the same one, nothing
       * happened. If it is a different one, the old one is superseded and is
       * kept, not overwritten out of existence. */
      if (authoredReceipt.boundToCanonicalSha256 === previousReceipt.boundToCanonicalSha256
        && authoredReceipt.workflowRunId === previousReceipt.workflowRunId) {
        decisions.push("authored  acceptanceReceipt — this write states the same receipt the committed binding held");
      } else {
        const note = withdrawalNote(previousReceipt, authoredReceipt.boundToCanonicalSha256 ?? null);
        note.why = "This write authored a different acceptance receipt. The superseded receipt is kept as history "
          + "rather than overwritten; it is not carried forward as though it still applied.";
        held.push(note);
        withdrawn.push(note);
        decisions.push(`withdrew  acceptanceReceipt — superseded by the receipt this write authored `
          + `(was bound to ${String(previousReceipt.boundToCanonicalSha256).slice(0, 12)})`);
      }
    } else {
      const canonical = canonicalSetOf(canonicalSha256, whyCanonicalIsNotMeasured);
      if (!canonical.measured) {
        /*
         * Not deciding. The committed receipt stays exactly as committed,
         * because this write measured no bytes and therefore has nothing to say
         * about whether the receipt still covers them. It is neither renewed nor
         * withdrawn; the reason travels in the log.
         */
        nextBinding.acceptanceReceipt = structuredClone(previousReceipt);
        carried.push("acceptanceReceipt");
        decisions.push(`carried   acceptanceReceipt — unchanged from the committed binding. This write measured no `
          + `canonical digest (${canonical.why}), so it makes no statement about coverage and alters nothing.`);
      } else if (isDigest(previousReceipt.boundToCanonicalSha256)
        && canonical.set.has(previousReceipt.boundToCanonicalSha256)) {
        nextBinding.acceptanceReceipt = structuredClone(previousReceipt);
        carried.push("acceptanceReceipt");
        decisions.push(`carried   acceptanceReceipt — still bound to a canonical this write produced `
          + `(${String(previousReceipt.boundToCanonicalSha256).slice(0, 12)})`);
      } else {
        const replacedBy = [...canonical.set].sort().join(",");
        const note = withdrawalNote(previousReceipt, canonical.set.size === 1 ? [...canonical.set][0] : replacedBy);
        held.push(note);
        withdrawn.push(note);
        decisions.push(`withdrew  acceptanceReceipt — bound to ${String(previousReceipt.boundToCanonicalSha256).slice(0, 12)}, `
          + `this write produced ${replacedBy.slice(0, 12)}. Kept under ${WITHDRAWN_KEY}, not deleted.`);
      }
    }
  }

  /* A receipt-shaped null the caller wrote is not a value; leave the key absent
   * rather than recording an erasure that never happened. */
  if (nextBinding.acceptanceReceipt === null && !previousReceipt) {
    decisions.push("authored  acceptanceReceipt — this write states none and the committed binding held none");
  }

  /* De-duplicate so a second rebuild of unchanged inputs writes identical bytes. */
  const distinct = [];
  for (const w of held) if (!distinct.some((d) => sameWithdrawal(d, w))) distinct.push(w);
  if (distinct.length) nextBinding[WITHDRAWN_KEY] = distinct;

  return { binding: nextBinding, carried, withdrawn, decisions };
}

/**
 * Everything the previous binding said that the next one no longer says.
 *
 * A receipt that has been WITHDRAWN is not lost -- the whole point of a
 * withdrawal is that the evidence is still on the record -- so a withdrawal
 * carrying the same receipt satisfies the check.
 */
export function governanceLostBetween(previousBinding, nextBinding) {
  if (!isObject(previousBinding)) return [];
  const next = isObject(nextBinding) ? nextBinding : {};
  const withdrawals = priorWithdrawals(next);
  const lost = [];
  for (const key of GOVERNANCE_KEYS) {
    if (previousBinding[key] === undefined) continue;
    if (next[key] !== undefined && !(key === "acceptanceReceipt" && next[key] === null && previousBinding[key] !== null)) continue;
    if (key === "acceptanceReceipt") {
      const before = previousBinding.acceptanceReceipt;
      if (before === null) continue;                       // nothing was held
      const kept = withdrawals.some((w) =>
        w?.boundToCanonicalSha256 === before?.boundToCanonicalSha256
        || JSON.stringify(w?.withdrawnReceipt) === JSON.stringify(before));
      if (kept) continue;                                   // withdrawn, not lost
      lost.push({
        key,
        why: `the committed binding carried an acceptance receipt (verdict ${before?.verdict ?? "unstated"}, `
          + `workflow run ${before?.workflowRunId ?? "unstated"}, bound to `
          + `${String(before?.boundToCanonicalSha256 ?? "unstated").slice(0, 16)}) and this write carries neither `
          + `that receipt nor a withdrawal of it. A receipt that has stopped describing the bytes is withdrawn `
          + `under ${WITHDRAWN_KEY} with both digests; it is never deleted.`,
        was: before
      });
      continue;
    }
    lost.push({
      key,
      why: `the committed binding carried ${key} and this write does not. It is not authored by a build; it is `
        + "control-plane state, and a rebuild that drops it deletes a governance fact without mentioning it.",
      was: previousBinding[key]
    });
  }
  return lost;
}

/**
 * THE CHECK. Fail the write -- and therefore the build -- when it would drop
 * any of the six.
 *
 * Both existing implementations of the preservation are correct and neither is
 * enforced, which is how a builder that quietly drops the keys still passes
 * everything. This throws, by name, at the moment of the write.
 */
export function assertGovernancePreserved(previousBinding, nextBinding, { at = "product-wiring.json" } = {}) {
  const lost = governanceLostBetween(previousBinding, nextBinding);
  if (lost.length === 0) return;
  const names = lost.map((l) => l.key).join(", ");
  const detail = lost.map((l) => `  - ${l.key}: ${l.why}`).join("\n");
  throw new GovernancePreservationError(
    `GOVERNANCE_STATE_WOULD_BE_ERASED writing ${at}: ${lost.length} key(s) the committed binding carries and this `
    + `write does not — ${names}.\n${detail}\n`
    + "Route the write through preserveGovernanceState() in "
    + "scripts/rcap-packet-completeness/governance-preservation.mjs. Do not restate these values by hand: carry "
    + "what is committed, or record the receipt's withdrawal. Nothing here decides paymentEligible, "
    + "sponsorshipEligible or whyPaymentIsClosed."
  );
}

/**
 * The call a component makes: given the wiring document it is about to write and
 * the path it will write it to, return the document with the committed
 * governance state preserved -- or throw rather than let the write erase it.
 *
 * NOT fail-safe, and that is the difference from the Delaware module it is
 * modelled on. preserveIdentityRefresh() may cost a build nothing, because the
 * worst case there is a lost annotation a human can rewrite. Here the worst case
 * is a deleted hash-bound acceptance receipt and a deleted commercial guard, so
 * a committed record that is present and unreadable STOPS the write instead of
 * being silently regenerated over.
 */
export function preserveGovernanceState(fsModule, wiringPath, document, options = {}) {
  const { canonicalSha256 = undefined, whyCanonicalIsNotMeasured = null, log = null } = options;
  if (!isObject(document)) {
    throw new GovernancePreservationError("preserveGovernanceState was given no wiring document to write");
  }
  let previous = null;
  if (fsModule.existsSync(wiringPath)) {
    let raw;
    try { raw = fsModule.readFileSync(wiringPath, "utf8"); }
    catch (error) {
      throw new GovernancePreservationError(
        `${wiringPath} exists and could not be read (${error.message}). Regenerating over a committed wiring record `
        + "this process cannot read would erase whatever governance state it holds."
      );
    }
    try { previous = JSON.parse(raw); }
    catch (error) {
      throw new GovernancePreservationError(
        `${wiringPath} exists and does not parse as JSON (${error.message}). Fix or restore it before rebuilding; `
        + "regenerating over it would erase whatever governance state it holds."
      );
    }
  }
  if (!isObject(previous)) return document;

  const previousBinding = isObject(previous.binding) ? previous.binding : null;
  if (!previousBinding) return document;
  if (!isObject(document.binding)) {
    /*
     * The committed record carries a binding and this write carries none at all.
     * There is nowhere to preserve into, and writing anyway erases every key.
     */
    assertGovernancePreserved(previousBinding, {}, { at: wiringPath });
    return document;
  }

  const result = carryForwardGovernance(previousBinding, document.binding, { canonicalSha256, whyCanonicalIsNotMeasured });
  if (log && result.decisions.length) for (const d of result.decisions) log(`governance: ${d}`);
  assertGovernancePreserved(previousBinding, result.binding, { at: wiringPath });
  return document;
}

/**
 * THE CHECK AT THE WRITE BOUNDARY, and the only place it belongs.
 *
 * `preserveGovernanceState` fixes a write that routes through it. This refuses a
 * write that does not -- a builder carrying its own five of six, a generator
 * regenerating the binding wholesale, a hand edit. It preserves NOTHING and
 * repairs NOTHING: it reads the committed record, compares, and either writes or
 * throws naming the keys that would be lost. A check that silently repaired what
 * it was measuring could not fail, and a check that cannot fail is not a check.
 *
 * Returns the bytes written, so a caller can hash what it actually put on disk.
 */
export function writeWiringChecked(fsModule, wiringPath, document, { at = null } = {}) {
  let previousBinding = null;
  if (fsModule.existsSync(wiringPath)) {
    let previous = null;
    try { previous = JSON.parse(fsModule.readFileSync(wiringPath, "utf8")); }
    catch (error) {
      throw new GovernancePreservationError(
        `${wiringPath} exists and could not be read as JSON (${error.message}). Writing over a committed wiring `
        + "record this process cannot read would erase whatever governance state it holds."
      );
    }
    if (isObject(previous?.binding)) previousBinding = previous.binding;
  }
  if (previousBinding) assertGovernancePreserved(previousBinding, document?.binding ?? {}, { at: at ?? wiringPath });
  const bytes = `${JSON.stringify(document, null, 2)}\n`;
  fsModule.writeFileSync(wiringPath, bytes);
  return bytes;
}
