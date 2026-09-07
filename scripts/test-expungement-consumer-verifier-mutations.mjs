#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = process.cwd();
const files = [
  "src/lib/expungement-ai/checkout-reconciliation.ts",
  "src/lib/expungement-ai/payment-adapter.ts",
  "src/lib/expungement-ai/consumer-payment-receipt.ts",
  "src/lib/expungement-ai/briefcase-consumer-presentation.ts",
  "src/components/expungement-ai/BriefcaseViews.tsx",
  "src/components/expungement-ai/packet-verification-client.ts",
  "src/app/api/expungement-ai/packet/download/route.ts"
];
const originals = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file))]));
const restore = () => {
  for (const [file, bytes] of originals) fs.writeFileSync(path.join(root, file), bytes);
};

registerTrackedMutation("test-expungement-consumer-verifier-mutations.mjs", files);
const disposeRestore = registerMutationRestore(restore);
let failures = 0;

function mutation({ name, file, replacements, verifier, expected }) {
  restore();
  const absolute = path.join(root, file);
  let source = fs.readFileSync(absolute, "utf8");
  for (const [before, after] of replacements) {
    if (!source.includes(before)) {
      console.error(`  ERROR ${name}: mutation marker not found: ${before}`);
      failures += 1;
      return;
    }
    source = source.replace(before, after);
  }
  fs.writeFileSync(absolute, source);
  const result = spawnSync(process.execPath, [verifier], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status === 0 || !output.includes(expected)) {
    console.error(`  FAIL ${name}: ${result.status === 0 ? "mutation survived" : "wrong failure"}`);
    if (result.status !== 0) console.error(output);
    failures += 1;
  } else {
    console.log(`  caught ${name}`);
  }
}

try {
  mutation({
    name: "status set Ready before artifact completion",
    file: files[0],
    replacements: [[
      '    "pending"\n  );',
      '    "ready"\n  );'
    ]],
    verifier: "scripts/test-expungement-checkout-guards.mjs",
    expected: "webhook status remains pending until artifact completion"
  });
  mutation({
    name: "canonical pathway identity omitted from Checkout binding",
    file: files[1],
    replacements: [[
      "    pathwayId: verifiedSnapshot.pathwayId,",
      "    pathwayId: null,"
    ]],
    verifier: "scripts/test-expungement-checkout-guards.mjs",
    expected: "Stripe metadata carries the protected machine pathway id"
  });
  mutation({
    name: "receipt owner scope removed",
    file: files[2],
    replacements: [
      ['    .eq("user_id", consumerAuthUserId)\n', ""],
      ["  if (row.user_id !== consumerAuthUserId\n", "  if (false\n"],
      ["consumerPacketPaymentAuthority(row.id, consumerAuthUserId, {", "consumerPacketPaymentAuthority(row.id, row.user_id, {"],
      ["validReceiptReference(row, input.consumerAuthUserId, input.reference", "validReceiptReference(row, row.user_id, input.reference"]
    ],
    verifier: "scripts/test-expungement-consumer-payment-receipt.mjs",
    expected: "a different user must receive no receipt existence signal"
  });
  mutation({
    name: "receipt lookup coupled to legal presentation",
    file: files[3],
    replacements: [[
      "  const paymentReceipt = await createConsumerPaymentReceiptAction({",
      '  if (item.paymentState !== "paid") return item;\n  const paymentReceipt = await createConsumerPaymentReceiptAction({'
    ]],
    verifier: "scripts/test-expungement-consumer-payment-receipt.mjs",
    expected: "receipt authority must resolve even when legal or artifact presentation is unavailable"
  });
  mutation({
    name: "refunded receipt coupled to paid fulfillment authority",
    file: files[2],
    replacements: [[
      '    || !["paid", "refunded"].includes(row.payment_status)',
      '    || row.payment_status !== "paid"'
    ]],
    verifier: "scripts/test-expungement-consumer-payment-receipt.mjs",
    expected: "a refund must preserve the owner-scoped payment-history receipt action"
  });
  mutation({
    name: "refunded payment history mislabeled as paid",
    file: files[3],
    replacements: [[
      "paymentState: paymentReceipt.status",
      'paymentState: "paid"'
    ]],
    verifier: "scripts/test-expungement-consumer-payment-receipt.mjs",
    expected: "payment history must present a refund as refunded rather than paid"
  });
  mutation({
    name: "localized refunded label removed",
    file: files[4],
    replacements: [[
      'k="payment.refunded"',
      'k="payment.paid"'
    ]],
    verifier: "scripts/test-expungement-consumer-payment-receipt.mjs",
    expected: "payment history must render an explicit localized refunded label"
  });
  mutation({
    name: "participant-controlled download owner",
    file: files[6],
    replacements: [[
      "getConsumerPacketDownload({ userId: auth.userId, briefcaseItemId })",
      'getConsumerPacketDownload({ userId: request.nextUrl.searchParams.get("userId") ?? auth.userId, briefcaseItemId })'
    ]],
    verifier: "scripts/verify-expungement-post-payment-packet-generation.mjs",
    expected: "Packet download must pass only the authenticated owner"
  });
  mutation({
    name: "paid failed job has no durable retry",
    file: files[5],
    replacements: [[
      '      generation: { mode: "paid_durable", label: "Prepare updated packet" }',
      "      generation: null"
    ]],
    verifier: "scripts/verify-expungement-post-payment-packet-generation.mjs",
    expected: "must offer durable retry without another Checkout"
  });
  mutation({
    name: "participant receipt action removed",
    file: files[4],
    replacements: [[
      "{item.paymentReceipt ? (",
      "{false && item.paymentReceipt ? ("
    ]],
    verifier: "scripts/verify-expungement-post-payment-packet-generation.mjs",
    expected: "Payment history must expose an accessible receipt action"
  });
} finally {
  restore();
  disposeRestore();
}

if (failures) {
  console.error(`Consumer verifier mutation suite failed: ${failures} mutation(s) escaped or failed incorrectly.`);
  process.exit(1);
}
console.log("Consumer verifier mutation suite passed: 10/10 authority and presentation defects turned red.");
