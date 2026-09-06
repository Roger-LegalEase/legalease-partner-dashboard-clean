#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };

function runBehavioralFixture(script, label) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.status !== 0) {
    failures.push(`${label} failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim());
  }
}

runBehavioralFixture("scripts/test-expungement-checkout-guards.mjs", "matter-level checkout/render fixture");
runBehavioralFixture("scripts/test-expungement-consumer-payment-receipt.mjs", "owner-scoped receipt fixture");

const receiptRoutePath = "src/app/api/expungement-ai/payment/receipt/route.ts";
const downloadRoutePath = "src/app/api/expungement-ai/packet/download/route.ts";
const presentationPath = "src/lib/expungement-ai/briefcase-presentation-authority.ts";
const consumerPresentationPath = "src/lib/expungement-ai/briefcase-consumer-presentation.ts";
const receiptAuthorityPath = "src/lib/expungement-ai/consumer-payment-receipt.ts";
const matterPath = "src/app/briefcase/[packetId]/page.tsx";
const paymentsPath = "src/components/expungement-ai/BriefcaseViews.tsx";

for (const file of [receiptRoutePath, downloadRoutePath, presentationPath, consumerPresentationPath, receiptAuthorityPath, matterPath, paymentsPath]) {
  assert(exists(file), `${file} is required.`);
}

const receiptRoute = exists(receiptRoutePath) ? read(receiptRoutePath) : "";
const downloadRoute = exists(downloadRoutePath) ? read(downloadRoutePath) : "";
const presentation = exists(presentationPath) ? read(presentationPath) : "";
const consumerPresentation = exists(consumerPresentationPath) ? read(consumerPresentationPath) : "";
const receiptAuthority = exists(receiptAuthorityPath) ? read(receiptAuthorityPath) : "";
const matter = exists(matterPath) ? read(matterPath) : "";
const payments = exists(paymentsPath) ? read(paymentsPath) : "";

// Receipt presentation is its own owner-scoped authority. It is not a packet
// URL, a Checkout return URL or a raw provider receipt copied into React data.
assert(receiptRoute.includes("requireConsumerBriefcaseSession"), "Receipt route must require the participant session.");
assert(receiptRoute.includes("resolveConsumerPaymentReceipt"), "Receipt route must resolve current owner/payment authority.");
assert(receiptAuthority.includes("consumerPacketPaymentAuthority"), "Receipt must reuse exact-matter payment authority.");
assert(receiptAuthority.includes("validReceiptReference"), "Receipt links must enforce expiry and integrity.");
assert(consumerPresentation.includes("createConsumerPaymentReceiptAction") && !consumerPresentation.includes('item.paymentState !== "paid"'), "Receipt authority must be resolved independently of legal and artifact presentation.");
assert(!payments.includes("receiptUrl"), "Payment history must never render a raw provider receipt URL.");
assert(payments.includes("{item.paymentReceipt ? (") && payments.includes("View receipt"), "Payment history must expose an accessible receipt action.");
assert(matter.includes("{item.paymentReceipt ? (") && matter.includes("View payment receipt"), "Matter detail must expose the same receipt action.");

// Protected artifact authority is distinct from payment and receipt authority.
// A payment can be paid while the artifact remains absent/pending.
assert(presentation.includes("readProtectedPacketArtifact"), "Briefcase presentation must read protected artifact authority.");
assert(presentation.includes('protectedArtifact?.status !== "ready"'), "Only a protected ready artifact may become downloadable presentation.");
assert(presentation.includes('status: "absent", canDownload: false'), "Missing artifacts must stay non-downloadable even when paid.");

// Download is owner-scoped independently of receipt presentation.
assert(downloadRoute.includes("requireConsumerBriefcaseSession"), "Packet download must require the participant session.");
assert(downloadRoute.includes("getConsumerPacketDownload({ userId: auth.userId, briefcaseItemId })"), "Packet download must pass only the authenticated owner to artifact resolution.");
assert(!downloadRoute.includes("paymentReceipt"), "Packet download must not confuse receipt authority with artifact authority.");

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { packetVerificationActions } = await import("../src/components/expungement-ai/packet-verification-client.ts");
const paidRetry = packetVerificationActions({ verified: true, packetReady: false, mode: "paid" });
assert(paidRetry.generation?.mode === "paid_durable", "A paid matter with no artifact must offer durable retry without another Checkout.");
assert(!paidRetry.checkout, "A paid failed/pending render must never offer a second payment.");
const paidReady = packetVerificationActions({ verified: true, packetReady: true, mode: "paid" });
assert(paidReady.openPacket === true && !paidReady.checkout, "A ready paid artifact must offer repeat download without another payment.");
const guidance = packetVerificationActions({ verified: false, packetReady: false, mode: "consumer" });
assert(!guidance.checkout && !guidance.generation && !guidance.openPacket, "Unverified/guidance presentation must expose no paid packet authority.");

if (failures.length) {
  console.error("Expungement.ai post-payment rails verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai post-payment rails verified behaviorally.");
console.log("Receipt presentation, protected artifact authority, owner-scoped download, paid retry, repeat download, and guidance refusal remain separate gates.");
