import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

// The runner retains the authenticated matter and database throughout this wait.
// Only ciphertext and a capability-free status receipt leave the runner.
export async function waitForHumanCheckout({ stripe, opened, identity, certificatePath,
  envelopePath, statusPath, waitMs = 45 * 60 * 1000, pollMs = 5000 }) {
  assert(Number.isSafeInteger(waitMs) && waitMs >= 0 && waitMs <= 45 * 60 * 1000);
  assert(Number.isSafeInteger(pollMs) && pollMs >= 0);
  assert.equal(opened.livemode, false, "Human Checkout must remain in Stripe test mode.");
  assert(opened.id.startsWith("cs_test_"), "A test Checkout Session is required.");
  const url = new URL(opened.url);
  assert(url.protocol === "https:" && url.hostname === "checkout.stripe.com" && !url.username && !url.password && !url.port,
    "Only the secure Stripe-hosted Checkout URL may be handed to the operator.");
  const verify = current => {
    assert.equal(current.id, opened.id, "The same Checkout Session must survive the human handoff.");
    assert.equal(current.livemode, false);
    assert.equal(current.mode, "payment");
    assert.equal(current.amount_total, 5000, "The existing $50 contract must not change.");
    assert.equal(current.currency, "usd");
    assert.equal(current.client_reference_id, identity.briefcaseItemId);
    assert.deepEqual(current.metadata, opened.metadata, "Owner/matter/verification metadata must remain unchanged.");
  };
  verify(opened);
  assert.equal(opened.status,"open","A fresh open test Checkout is required.");
  assert.equal(opened.payment_status,"unpaid","The handoff must begin before payment.");
  const deadline = Date.now() + waitMs;
  const status = { schemaVersion: "legalease-human-stripe-checkout/v1", phase: "awaiting_human",
    runId: identity.runId, applicationSha: identity.applicationSha, amountCents: 5000, currency: "usd",
    livemode: false, automatedBrowser: false, deadlineAt: new Date(deadline).toISOString(), encryptedHandoff: true };
  const handoff = { ...status, ...identity, sessionId: opened.id, checkoutUrl: opened.url,
    providerExpiresAt: opened.expires_at ? new Date(opened.expires_at * 1000).toISOString() : null };
  const envelope = execFileSync("openssl", ["cms", "-encrypt", "-binary", "-aes-256-gcm", "-outform", "DER", certificatePath],
    { input: JSON.stringify(handoff), stdio: ["pipe", "pipe", "pipe"] });
  fs.writeFileSync(envelopePath, envelope, { mode: 0o600, flag: "wx" });
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  console.log("HUMAN_CHECKOUT_READY: encrypted handoff published; same participant, matter and database retained.");
  while (Date.now() < deadline) {
    const current = await stripe.checkout.sessions.retrieve(opened.id);
    verify(current);
    if (current.payment_status === "paid") {
      fs.writeFileSync(statusPath, JSON.stringify({ ...status, phase: "provider_reports_paid" }, null, 2) + "\n");
      return current;
    }
    assert.equal(current.status, "open", "Checkout closed without the required settled test payment.");
    await sleep(pollMs);
  }
  throw new Error("Human Stripe verification window ended without a settled payment. No payment or delivery assertion is passed.");
}
