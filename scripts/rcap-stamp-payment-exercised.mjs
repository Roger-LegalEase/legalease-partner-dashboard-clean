#!/usr/bin/env node
// Stamp PAYMENT_EXERCISED onto every evidence artifact a run produces.
//
// A non-payment acceptance run that reports "complete" is telling the truth
// about what it did and, unless it says otherwise, a lie about what that
// means. Every artifact this pipeline emits now carries the fact explicitly, so
// no reader has to infer from a phase name whether money moved.
//
// Read-only with respect to every external system: it rewrites JSON files in
// the run's own evidence directory and nothing else.
//
//   RCAP_PAYMENT_EXERCISED=true|false   required
//   RCAP_EVIDENCE_DIR                   default hosted-acceptance-evidence
//   RCAP_PHASE                          recorded for context

import fs from "node:fs";
import path from "node:path";

const raw = (process.env.RCAP_PAYMENT_EXERCISED ?? "").trim();
if (raw !== "true" && raw !== "false") {
  console.error('STAMP: RCAP_PAYMENT_EXERCISED must be exactly "true" or "false"');
  process.exit(1);
}
const paymentExercised = raw === "true";
const phase = (process.env.RCAP_PHASE ?? "unknown").trim();
const dir = path.resolve(process.env.RCAP_EVIDENCE_DIR ?? "hosted-acceptance-evidence");

fs.mkdirSync(dir, { recursive: true });

const REASON = paymentExercised
  ? "This run exercised the Stripe test payment journey."
  : "This run exercised NO payment: no Stripe API call, no Checkout Session, no webhook. A green result here is non-payment acceptance only and does not mean paid acceptance is complete.";

const stamped = [];
const skipped = [];
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".json")) continue;
  const file = path.join(dir, name);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    // A malformed artifact is reported, never silently rewritten.
    skipped.push({ file: name, reason: String(error.message).slice(0, 120) });
    continue;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    skipped.push({ file: name, reason: "top level is not a JSON object" });
    continue;
  }
  parsed.PAYMENT_EXERCISED = paymentExercised;
  parsed.paymentExercised = paymentExercised;
  parsed.paymentExercisedPhase = phase;
  parsed.paymentExercisedNote = REASON;
  fs.writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
  stamped.push(name);
}

// One standalone marker, so the fact survives even when a run produced no other
// JSON at all.
const marker = {
  schemaVersion: "rcap-payment-exercised/v1",
  phase,
  PAYMENT_EXERCISED: paymentExercised,
  paymentExercised,
  note: REASON,
  stampedArtifacts: stamped,
  unstampableArtifacts: skipped
};
fs.writeFileSync(path.join(dir, "payment-exercised.json"), `${JSON.stringify(marker, null, 2)}\n`);

console.log(`PAYMENT_EXERCISED=${paymentExercised} (phase ${phase})`);
console.log(`  stamped ${stamped.length} artifact(s): ${stamped.join(", ") || "none"}`);
if (skipped.length > 0) {
  console.log(`  could not stamp ${skipped.length}: ${skipped.map((s) => `${s.file} (${s.reason})`).join(", ")}`);
}
if (!paymentExercised) {
  console.log("  this run is non-payment acceptance only; it does not report paid acceptance as complete");
}
