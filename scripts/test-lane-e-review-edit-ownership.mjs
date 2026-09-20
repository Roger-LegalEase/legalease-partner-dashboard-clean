#!/usr/bin/env node

// Lane E: Review and Edit as an ownership-preserving operation.
//
// Contract §7 and §8. The claim boundary decides who owns a matter. Review and
// Edit is the one operation that changes a claimed matter's facts afterwards,
// so it is where ownership can quietly stop meaning anything: an edit that
// leaves a stale verification current would let a participant be fulfilled
// against facts they have already contradicted, and an edit that reaches
// payment columns would let a fact change rewrite what was paid.
//
// scripts/verify-screening-verification-finetune.mjs already measures the
// protected verification machinery in depth. This proves the four properties
// the ownership boundary specifically depends on, which that verifier does not
// state directly:
//
//   1. deterministic  -- the same edit twice produces the same protected draft
//   2. reversible     -- editing back to the original facts restores the
//                        original draft identity exactly
//   3. render-visible -- a material edit changes the render input, so no
//                        already-verified specification can be reused
//   4. payment-safe   -- the edit patch cannot name a payment field at any
//                        depth, so payment history survives a fact change
//
// and then that a stale verification actually refuses fulfillment.
//
// Usage: node scripts/test-lane-e-review-edit-ownership.mjs

import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"
]) delete process.env[name];

const { evaluateAuthoritativeScreeningResult } =
  await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const {
  packetInformationPatch,
  protectedPacketDraftSeedFromAuthoritative,
  requireCurrentPacketVerificationRecord
} = await import("../src/lib/expungement-ai/packet-information.ts");

const results = [];
function check(condition, label) {
  results.push([Boolean(condition), label]);
  console.log(`  ${condition ? "ok  " : "FAIL"} ${label}`);
}

const screeningAnswers = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
  resolved_timing_bucket: "gt_10_years",
  court_requirements_completed: "yes"
};

const authoritative = evaluateAuthoritativeScreeningResult({
  jurisdiction: "MS",
  profileVersion: "2026-06-19-source-conversion-1",
  matterId: "matter-1",
  answers: screeningAnswers
});

const seed = protectedPacketDraftSeedFromAuthoritative({
  authoritative,
  screeningAnswers,
  dependencies: {
    commercialFlowVersion: 1,
    entitlementSource: "consumer_payment",
    productId: "expungement_packet"
  },
  capturedAt: "2026-08-26T00:00:00.000Z"
});
assert.ok(seed, "fixture must seed protected packet draft authority");

// A claimed, paid matter. The payment columns below are the history the edit
// must not be able to touch.
const paidItem = {
  id: "matter-1",
  type: "result",
  title: "Matter",
  state: "MS",
  status: "packet_ready",
  resultCode: authoritative.evaluation.resultCode,
  createdAt: "2026-08-26T00:00:00.000Z",
  summary: "Possible path",
  nextSteps: [],
  paymentAllowed: true,
  packetReady: false,
  pathwayLabel: authoritative.pathwayLabel,
  packetType: authoritative.packetType,
  paymentStatus: "paid",
  packetStatus: "not_started",
  artifactRefs: { commercialFlow: { version: 1, entitlementSource: "consumer_payment" } }
};

// The verification has to be a real one. A synthesized record is refused by
// the protected authority (its hash must match its own snapshot), and a proof
// built on a record the system would reject proves nothing, so it is produced
// by completing the facts and verifying through the same path a participant
// takes.
const completePacketAnswers = {
  age_at_offense: { value: "30", unknown: false },
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  charge: { value: "Synthetic misdemeanor charge", unknown: false },
  contact_information: "100 Acceptance Way, Jackson, MS 39201",
  county: { value: "Hinds County", unknown: false },
  court: { value: "Hinds County Circuit Court", unknown: false },
  disposition_date: { value: "2015-01-15", unknown: false },
  financial_obligations: "Yes",
  offense_category: { value: "Misdemeanor", unknown: false },
  offense_level: "Misdemeanor",
  participant_full_legal_name: "Acceptance Consumer",
  pending_cases: "No",
  prior_relief: "No",
  record_type: "Arrest or charge",
  residency_or_location: { value: "Jackson, Mississippi", unknown: false },
  sentence_completion_date: "Yes",
  trafficking_status: "No"
};

const unverifiedRecord = {
  status: "unverified",
  reason: "final_verification_not_completed",
  revision: 0,
  draftHash: seed.hash,
  draftSnapshot: seed.snapshot
};

const verifying = packetInformationPatch({
  existingItem: paidItem,
  answers: completePacketAnswers,
  verify: true,
  protectedVerification: unverifiedRecord
});
assert.ok(verifying, "fixture must be able to complete its packet facts");
assert.equal(
  verifying.patch.commercialFlow.verification.status,
  "verified",
  "fixture must reach a real verified verification"
);

const verifiedRecord = { ...verifying.protectedTransition.nextVerification, revision: 3 };
const verifiedDraftHash = verifiedRecord.draftHash;

const edit = (answers, protectedVerification = verifiedRecord) => packetInformationPatch({
  existingItem: paidItem,
  answers,
  protectedVerification
});

console.log("\n1. A material edit invalidates the verification it contradicts");
const edited = edit({ court: { value: "Edited Circuit Court", unknown: false } });
assert.ok(edited, "a material edit must produce a transition");
check(edited.patch.commercialFlow.verification.status === "invalidated",
  "a material edit leaves the verification invalidated");
check(edited.patch.commercialFlow.verification.hash === undefined,
  "an invalidated verification exposes no reusable current hash");
check(Object.keys(edited.protectedTransition.answerDelta).length === 1,
  "exactly the edited fact is recorded as the material change");

console.log("\n2. The edit is deterministic");
// The protected draft records capturedAt, which is the wall clock and is
// supposed to differ between two saves. Determinism is therefore a property of
// the derived facts, so the comparison excludes exactly that field and nothing
// else -- excluding more would let a real derivation difference hide.
const withoutCaptureTime = (snapshot) => {
  const { capturedAt, ...rest } = snapshot;
  return JSON.stringify(rest);
};
const editedAgain = edit({ court: { value: "Edited Circuit Court", unknown: false } });
check(
  withoutCaptureTime(editedAgain.protectedTransition.nextVerification.draftSnapshot)
    === withoutCaptureTime(edited.protectedTransition.nextVerification.draftSnapshot),
  "the same edit applied twice derives the same protected draft facts"
);
check(
  JSON.stringify(editedAgain.protectedTransition.answerDelta)
    === JSON.stringify(edited.protectedTransition.answerDelta),
  "the same edit applied twice records the same answer delta"
);

console.log("\n3. The edit is reversible");
// Re-editing from the invalidated draft back to the original value has to land
// on the identity the matter started with. If it does not, an edit is a
// one-way door and "reversible" is not a property the participant has.
const reverted = edit(
  { court: completePacketAnswers.court },
  { ...verifiedRecord, ...edited.protectedTransition.nextVerification }
);
assert.ok(reverted, "reverting an edit must produce a transition");
check(
  withoutCaptureTime(reverted.protectedTransition.nextVerification.draftSnapshot)
    === withoutCaptureTime(verifiedRecord.draftSnapshot),
  "editing back to the original fact restores the original protected draft facts"
);
check(
  reverted.patch.commercialFlow.verification.status === "invalidated",
  "a revert is still an edit: it does not silently restore the old verification"
);

console.log("\n4. A material edit changes the render input");
check(
  edited.protectedTransition.nextVerification.draftHash !== verifiedDraftHash,
  "the protected draft hash changes when a material fact changes"
);

console.log("\n5. Payment history survives the edit");
// Structural, not incidental: the patch is asserted to contain no payment key
// at any depth, so this stays true as the patch shape grows.
const PAYMENT_KEYS = [
  "paymentStatus", "payment_status", "amountCents", "amount_cents",
  "checkoutSessionId", "checkout_session_id", "paymentIntentId", "payment_intent_id",
  "receiptUrl", "receipt_url", "paymentProvider", "payment_provider"
];
function keysAtEveryDepth(value, found = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) keysAtEveryDepth(entry, found);
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      found.add(key);
      keysAtEveryDepth(entry, found);
    }
  }
  return found;
}
const patchKeys = keysAtEveryDepth(edited.patch);
for (const key of PAYMENT_KEYS) {
  check(!patchKeys.has(key), `the edit patch never names ${key}`);
}
check(paidItem.paymentStatus === "paid", "the paid matter is still paid after the edit");

console.log("\n6. A stale specification refuses fulfillment");
const invalidatedRecord = { ...verifiedRecord, ...edited.protectedTransition.nextVerification };
let refused = false;
try {
  requireCurrentPacketVerificationRecord(paidItem, invalidatedRecord);
} catch {
  refused = true;
}
check(refused, "an invalidated verification cannot satisfy the fulfillment gate");
// The gate is not a status flag: a record that still claims "verified" but
// whose snapshot no longer hashes to its own hash is a tampered or drifted
// record, and it has to be refused on the same path.
const refusesTampered = (() => {
  try {
    requireCurrentPacketVerificationRecord(paidItem, {
      ...verifiedRecord,
      snapshot: { ...verifiedRecord.snapshot, packetAnswers: { court: "Substituted After Verification" } }
    });
    return false;
  } catch {
    return true;
  }
})();
check(refusesTampered, "a verified record whose snapshot no longer matches its hash is refused");
check(
  (() => {
    try {
      requireCurrentPacketVerificationRecord(paidItem, verifiedRecord);
      return true;
    } catch {
      return false;
    }
  })(),
  "the genuine current verification still satisfies the gate"
);

console.log("");
const failed = results.filter(([ok]) => !ok);
if (failed.length > 0) {
  console.error(`test-lane-e-review-edit-ownership FAILED: ${failed.length} check(s).`);
  for (const [, label] of failed) console.error(`  - ${label}`);
  process.exit(1);
}
console.log(`test-lane-e-review-edit-ownership: ${results.length} checks passed.`);
