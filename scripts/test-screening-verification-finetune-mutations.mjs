#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifier = path.join(root, "scripts/verify-screening-verification-finetune.mjs");
const render = path.join(root, "src/lib/expungement-ai/consumer-render-request.ts");
const queue = path.join(root, "src/lib/rcap/render/job-queue.ts");
const generation = path.join(root, "src/lib/expungement-ai/packet-generation.ts");
const sponsoredRoute = path.join(root, "src/app/api/expungement-ai/packet/generate/route.ts");
const sponsoredLifecycle = path.join(root, "src/lib/expungement-ai/rcap-slot-lifecycle.ts");
const verificationCas = path.join(root, "src/lib/expungement-ai/verification-cas.ts");
const packetInformation = path.join(root, "src/lib/expungement-ai/packet-information.ts");
const packetInformationRoute = path.join(root, "src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts");
const paymentAuthority = path.join(root, "src/lib/expungement-ai/consumer-payment-authority.ts");
const paymentAdapter = path.join(root, "src/lib/expungement-ai/payment-adapter.ts");
const checkoutRoute = path.join(root, "src/app/api/expungement-ai/checkout/route.ts");
const reconciliation = path.join(root, "src/lib/expungement-ai/checkout-reconciliation.ts");
const packetPlanner = path.join(root, "src/lib/rcap-engine/packet-planner.ts");

registerTrackedMutation("test-screening-verification-finetune-mutations.mjs", [
  "src/lib/expungement-ai/consumer-render-request.ts",
  "src/lib/rcap/render/job-queue.ts",
  "src/lib/expungement-ai/packet-generation.ts",
  "src/app/api/expungement-ai/packet/generate/route.ts",
  "src/lib/expungement-ai/rcap-slot-lifecycle.ts",
  "src/lib/expungement-ai/verification-cas.ts",
  "src/lib/expungement-ai/packet-information.ts",
  "src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts",
  "src/lib/expungement-ai/consumer-payment-authority.ts",
  "src/lib/expungement-ai/payment-adapter.ts",
  "src/app/api/expungement-ai/checkout/route.ts",
  "src/lib/expungement-ai/checkout-reconciliation.ts",
  "src/lib/rcap-engine/packet-planner.ts"
]);

const mutations = [
  ["render packet identity drops verification versioning", render, (source) => source.replace(
    '`${CONSUMER_PACKET_NAMESPACE}:${item.id}:${verification.hash}:${payloadVersionHash}`',
    '`${CONSUMER_PACKET_NAMESPACE}:${item.id}:${payloadVersionHash}`'
  )],
  ["render packet identity omits source-version authority", render, (source) => source.replace(
    "      sourceSha256: built.spec.sourceSha256,\n",
    ""
  )],
  ["render packet identity omits an immutable row field", render, (source) => source.replace(
    '    relief_outcome: "not_recorded",\n',
    ""
  )],
  ["render enqueue drops protected verification CAS", queue, (source) => source.replace(
    "    p_expected_verification_hash: identity.expectedVerificationHash,\n",
    ""
  )],
  ["render enqueue reuses a hash that omits exact payload bytes", render, (source) => source.replace(
    "  const verifiedSpec = { ...versioned.spec, inputHash };",
    "  const verifiedSpec = versioned.spec;"
  )],
  ["consumer render bypasses the atomic payload boundary", render, (source) => source.replaceAll(
    "enqueueVerifiedConsumerRender",
    "enqueueRenderJob"
  )],
  ["sponsored artifact attaches before credit finalization", generation, (source) => source.replace(
    "    if (partnerSponsored) {",
    "    if (false) {"
  )],
  ["sponsored slot refusal is ignored", sponsoredRoute, (source) => source.replace(
    "      if (!finalization.ok) {",
    "      if (false) {"
  )],
  ["verification transition omits expected protected revision", verificationCas, (source) => source.replace(
    "    p_expected_prior_revision: input.transition.expectedPriorRevision,\n",
    ""
  )],
  ["packet transition makes protected authority optional", packetInformation, (source) => source.replace(
    "protectedVerification: ProtectedPacketVerificationRecord;",
    "protectedVerification?: ProtectedPacketVerificationRecord;"
  )],
  ["verification transition bypasses protected persistence RPC", verificationCas, (source) => source.replace(
    'rpc("persist_consumer_packet_verification"',
    'rpc("persist_unprotected_packet_verification"'
  )],
  ["artifact attach bypasses protected verification RPC", verificationCas, (source) => source.replace(
    'rpc("attach_consumer_packet_artifact_if_verified"',
    'rpc("attach_consumer_packet_artifact"'
  )],
  ["packet information route bypasses protected atomic transition", packetInformationRoute, (source) => source.replace(
    "persistProtectedPacketVerification({",
    "mergeBriefcaseArtifactRefs({"
  )],
  ["semantic verification no-op mints a new protected revision", packetInformation, (source) => source.replace(
    "nextVerification: { ...currentVerification, revision: priorProtected.revision }",
    "nextVerification: { ...currentVerification, revision: priorProtected.revision + 1 }"
  )],
  ["invalidated transition trusts participant JSON verification", packetInformation, (source) => source.replace(
    "unverifiedOrInvalidatedPacketRecord(priorProtected, now, input.verify === true",
    "unverifiedOrInvalidatedPacketRecord(flow?.verification, now, input.verify === true"
  )],
  ["checkout binding bypasses protected verification RPC", paymentAuthority, (source) => source.replace(
    'rpc("bind_consumer_checkout_verification"',
    'rpc("bind_consumer_checkout"'
  )],
  ["payment entitlement omits expected protected hash", paymentAuthority, (source) => source.replace(
    "    p_expected_verification_hash: input.expectedVerificationHash\n",
    ""
  )],
  ["artifact attach omits expected protected hash", verificationCas, (source) => source.replace(
    "    p_expected_verification_hash: input.expectedVerificationHash,\n",
    ""
  )],
  ["sponsored finalization omits expected protected hash", sponsoredLifecycle, (source) => source.replace(
    "      p_expected_verification_hash: input.expectedVerificationHash,\n",
    ""
  )],
  ["reused open Checkout session survives a refused binding CAS", paymentAdapter, (source) => source.replace(
    '          await stripe.checkout.sessions.expire(reusable.id);\n',
    ""
  )],
  ["completed paid Checkout Session is replaced during webhook lag", paymentAdapter, (source) => source.replace(
    '      if (existing.status === "complete") {',
    '    if (false) {'
  )],
  ["checkout binding transport error is treated as definitive refusal", paymentAuthority, (source) => source.replace(
    'if (error) return { outcome: "unavailable", reason: error.message };',
    'if (error) return { outcome: "refused", reason: error.message };'
  )],
  ["checkout route restores writable pathway preguard", checkoutRoute, (source) => source.replace(
    "  if (await isPartnerSponsoredPacketItem(item)) {",
    "  if (item.pathwayLabel === \"participant-forged\") return NextResponse.json({ error: \"forged\" }, { status: 403 });\n\n  if (await isPartnerSponsoredPacketItem(item)) {"
  )],
  ["compiled packet plan drops the protected readiness checklist", packetPlanner, (source) => source.replace(
    "    packetReadyWhen: plan.packetReadyWhen ?? []\n",
    ""
  )],
  ["legacy stored plans require a writable checklist backfill", packetInformation, (source) => source.replace(
    "canonicalEqual(storedPlan, comparableStoredPacketPlan(authoritativePlan))",
    "canonicalEqual(storedPlan, authoritativePlan)"
  )],
  ["Stripe metadata reverts to writable pathway label", paymentAdapter, (source) => source.replace(
    "pathway_id: binding.pathwayId",
    'pathway_label: item.pathwayLabel ?? ""'
  )],
  ["Stripe metadata restores obsolete participant JSON hash", paymentAdapter, (source) => source.replace(
    "    verification_hash: binding.verificationHash,\n",
    "    verification_hash: binding.verificationHash,\n    reviewed_input_hash: binding.verificationHash,\n"
  )],
  ["Stripe idempotency drops protected authority versioning", paymentAdapter, (source) => source.replace(
    '${CONSUMER_PACKET_PRODUCT_ID}:${itemId}:${verificationHash}:${verificationRevision}:${previousSessionId ?? "initial"}',
    '${CONSUMER_PACKET_PRODUCT_ID}:${itemId}:${previousSessionId ?? "initial"}'
  )],
  ["checkout treatment guard drops protected pathway identity", paymentAdapter, (source) => source.replace(
    "exactDeferralForPathway(snapshot.jurisdiction, snapshot.pathwayId)",
    "exactDeferralForPathway(snapshot.jurisdiction, null)"
  )],
  ["canonical mirror metadata spreads participant extensions", packetInformation, (source) => source.replace(
    "  return {\n    stage: packetInformation.stage,",
    "  return {\n    ...packetInformation,\n    stage: packetInformation.stage,"
  )],
  ["protected source artifact omits packet plan provenance", generation, (source) => source.replace(
    "    typeof refs.packetPlanId === \"string\" &&\n",
    ""
  )],
  ["writable packet status suppresses protected artifact generation", reconciliation, (source) => source.replace(
    '    "pending"\n',
    '    item.packetStatus === "ready" ? "ready" : "pending"\n'
  )],
  ["writable JSON artifact grants immutable access", generation, (source) => source.replace(
    "  void item;\n",
    "  const forged = artifactRefsFor(item);\n  if (forged) return forged;\n"
  )],
  ["source renderer consumes writable summary", generation, (source) => source.replace(
    "    authoritativeSummary,\n",
    "    item.summary,\n    authoritativeSummary,\n"
  )],
  ["durable renderer consumes writable next steps", render, (source) => source.replace(
    "    `Matter pathway: ${input.pathwayLabel}.`,\n",
    "    ...input.item.nextSteps,\n    `Matter pathway: ${input.pathwayLabel}.`,\n"
  )],
  ["durable renderer drops the protected compiled checklist", render, (source) => source.replace(
    "filing_instructions: packetReadyWhen.length > 0\n      ? packetReadyWhen",
    "filing_instructions: packetReadyWhen.length > 0\n      ? []"
  )],
  ["durable renderer trusts writable selected-track metadata", render, (source) => source.replace(
    "trackId: verification.snapshot.selectedTrackId",
    "trackId: item.selectedTrackId"
  )]
];

const originals = new Map(mutations.map(([, file]) => [file, fs.readFileSync(file, "utf8")]));
function restore() {
  for (const [file, source] of originals) fs.writeFileSync(file, source);
}
registerMutationRestore(restore);

let caught = 0;
const survived = [];
try {
  for (const [name, file, mutate] of mutations) {
    const original = originals.get(file);
    const changed = mutate(original);
    if (changed === original) {
      survived.push(`${name} (mutation matched nothing)`);
      continue;
    }
    fs.writeFileSync(file, changed);
    try {
      execFileSync(process.execPath, [verifier], { cwd: root, stdio: "pipe" });
      survived.push(name);
    } catch {
      caught += 1;
      console.log(`  caught   ${name}`);
    } finally {
      fs.writeFileSync(file, original);
    }
  }
} finally {
  restore();
}

if (survived.length) {
  console.error(`test-screening-verification-finetune-mutations FAILED: ${survived.length} survived`);
  for (const name of survived) console.error(`  - ${name}`);
  process.exit(1);
}
console.log(`test-screening-verification-finetune-mutations: ${caught}/${mutations.length} mutations red; sources restored.`);
