#!/usr/bin/env node
/**
 * The denominator's separation, proven by breaking it.
 *
 * The census once took its membership from the fulfillment ledger, so the
 * answer decided the question: withdrawing one unearned record deleted its
 * route from the census, and a route the product still intends to sell quietly
 * stopped being asked about. Every invariant that now prevents that is stated
 * in verify-commercial-packet-integrity.mjs, and a stated invariant is worth
 * exactly as much as its failure mode.
 *
 * So each mutation here is the real defect, applied to the real files, with the
 * real generator and verifier run over it. If any of them goes green the
 * separation is gone, whatever the invariants say. Every file is restored
 * afterwards, including on failure.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const LEDGER = "data/rcap-ledger/packet-fulfillment-records.json";
const CENSUS = "data/rcap-ledger/commercial-packet-integrity.json";
const DENOMINATOR = "data/rcap-ledger/commercial-denominator.json";
const WITHDRAWALS = "data/rcap-ledger/fulfillment-authority-withdrawals.json";
const DOC = "docs/record-clearing/COMMERCIAL_PACKET_INTEGRITY.md";
const ND = "ND:first-offense-possession-sealing";

const read = (file) => fs.readFileSync(path.join(rootDir, file), "utf8");
const write = (file, text) => fs.writeFileSync(path.join(rootDir, file), text);
const json = (file) => JSON.parse(read(file));
const save = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);

const run = (script, args = []) =>
  spawnSync("node", [script, ...args], { cwd: rootDir, encoding: "utf8" });
const generate = () => run("scripts/generate-commercial-packet-integrity.mjs");
const verify = () => run("scripts/verify-commercial-packet-integrity.mjs");

const failures = [];
let checks = 0;

/**
 * Apply a mutation, run what should catch it, restore, and report.
 *
 * `detect` returns the reason the mutation was caught, or null if it slipped
 * through. Restoration happens in `finally`, so a throw mid-mutation cannot
 * leave the tree edited.
 */
function mutation(name, files, apply, detect) {
  checks += 1;
  const saved = new Map(files.map((file) => [file, read(file)]));
  try {
    apply();
    const caught = detect();
    if (!caught) failures.push(`MISSED: ${name}`);
    else console.log(`  detected  ${name}\n              ${caught.slice(0, 150)}`);
  } finally {
    for (const [file, text] of saved) write(file, text);
  }
}

/** The first failing assertion the verifier reports, or null if it passed. */
function verifierRefusal() {
  const result = verify();
  if (result.status === 0) return null;
  const line = `${result.stdout}${result.stderr}`.split("\n").find((entry) => entry.trim().startsWith("- "));
  return line?.trim() ?? "verifier refused";
}

console.log("Commercial denominator — mutations that must be caught\n");

// 1. The exact regression this rework exists to prevent. Withdrawing ND's
//    record must not remove ND from the census: membership is intent.
mutation(
  "deleting ND's fulfillment record removes ND from the census",
  [CENSUS, DENOMINATOR, DOC],
  () => {
    generate();
  },
  () => {
    const census = json(CENSUS);
    const present = census.rows.some((row) => row.route === ND);
    const departed = census.departuresFromTheCommercialDenominator.routes.some((row) => row.route === ND);
    if (!present) return null;
    if (departed) return null;
    return `ND stayed in the census with no fulfillment record: admission ${
      census.rows.find((row) => row.route === ND).commercialAdmissionState}`;
  }
);

// 2. A record whose proofs are incomplete must never count as authorized.
mutation(
  "an incomplete fulfillment record counts as authorized",
  [LEDGER, CENSUS, DENOMINATOR, DOC],
  () => {
    const withdrawn = json(WITHDRAWALS).withdrawals.find((entry) => entry.routeKey === ND);
    const ledger = json(LEDGER);
    ledger.records.push(withdrawn.priorRecord);
    save(LEDGER, ledger);
    generate();
  },
  () => verifierRefusal()
);

// 3. A route may not leave the denominator without a recorded decision.
mutation(
  "a denominator route disappears with no departure record",
  [CENSUS, DENOMINATOR, DOC],
  () => {
    const census = json(CENSUS);
    const victim = census.rows.find((row) => row.route !== ND);
    census.rows = census.rows.filter((row) => row.route !== victim.route);
    save(CENSUS, census);
  },
  () => verifierRefusal()
);

// 4. Checkout may not be admitted for a route nothing proves.
mutation(
  "checkout is admitted for a census route with no valid fulfillment authority",
  [CENSUS, DENOMINATOR, DOC],
  () => {
    const census = json(CENSUS);
    const victim = census.rows.find((row) => !row.gradeAProofValid);
    victim.commercialAdmissionState = "admitted";
    victim.commercialAuthorityRefusedBecause = null;
    save(CENSUS, census);
  },
  () => verifierRefusal()
);

// 5. A sponsored credit may not be consumable without proven authority, and a
//    record may not be held by a route whose proofs are incomplete.
mutation(
  "a route is marked proven while its Grade-A proofs are incomplete",
  [CENSUS, DENOMINATOR, DOC],
  () => {
    const census = json(CENSUS);
    const victim = census.rows.find((row) => !row.gradeAProofValid);
    victim.fulfillmentRecordPresent = true;
    victim.creditConsumptionState = "consumable";
    save(CENSUS, census);
  },
  () => verifierRefusal()
);

// 6. A withdrawal must stay traceable. Erasing it leaves an absence nobody can
//    account for, which is the state this whole ledger exists to prevent.
mutation(
  "the withdrawal record is erased, leaving an unexplained absence",
  [WITHDRAWALS],
  () => {
    const withdrawals = json(WITHDRAWALS);
    withdrawals.withdrawals = [];
    save(WITHDRAWALS, withdrawals);
  },
  () => verifierRefusal()
);

// ------------------------------------------------------------- green proof
//
// The mutations prove the invariants bite. This proves they are not simply
// refusing everything: the real tree, unmutated, is in the state the decision
// called for.
checks += 1;
{
  const census = json(CENSUS);
  const denominator = json(DENOMINATOR);
  const withdrawals = json(WITHDRAWALS);
  const row = census.rows.find((entry) => entry.route === ND);
  const withdrawal = withdrawals.withdrawals.find((entry) => entry.routeKey === ND);
  const expected = {
    "ND remains in the census": Boolean(row),
    "ND remains in the denominator": denominator.routes.includes(ND),
    "its invalid authority record is absent": row?.fulfillmentRecordPresent === false,
    "its withdrawal is preserved": Boolean(withdrawal?.priorRecord) && Boolean(withdrawal?.priorRecordSha256),
    "commercial admission refuses": row?.commercialAdmissionState === "refused",
    "checkout refuses": row?.checkoutState === "refused",
    "sponsorship refuses": row?.sponsorshipState === "refused",
    "credit consumption refuses": row?.creditConsumptionState === "refused",
    "the refusal names the missing proof": (row?.commercialAuthorityRefusedBecause ?? "").includes("Grade-A proof incomplete"),
    "route and legal work preserved": row?.routeAndLegalWorkPreserved === true,
    "ND is not recorded as a departure":
      !census.departuresFromTheCommercialDenominator.routes.some((entry) => entry.route === ND),
    "the denominator is unchanged": denominator.sha256 === census.denominator.sha256
  };
  const wrong = Object.entries(expected).filter(([, held]) => !held).map(([label]) => label);
  if (wrong.length > 0) failures.push(`the expected green state does not hold: ${wrong.join("; ")}`);
  else console.log(`\n  green     ${Object.keys(expected).length} expected conditions hold on the real tree`);
}

if (failures.length > 0) {
  console.error(`\nCommercial denominator mutations FAILED:\n${failures.map((entry) => ` - ${entry}`).join("\n")}`);
  process.exit(1);
}
console.log(`\n${checks} mutation group(s) checked. Membership is intent, proof is a separate question, and neither can silently move the other.`);
