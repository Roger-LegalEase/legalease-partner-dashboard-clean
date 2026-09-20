#!/usr/bin/env node
/**
 * A builder, in the shape the 25 census builders that write product-wiring.json
 * actually have, small enough to run in a temp directory and mutate.
 *
 * WHY THIS EXISTS RATHER THAN A REAL FAMILY. The check has to be shown failing,
 * and a check can only be shown failing by breaking a build on purpose. The two
 * families the defect is confirmed on -- mn_petition_15218-set and
 * mn_petition_juvenile_as_adult-set -- are held by live repair lanes (FIX07 and
 * FIX02) in the claim ledger, and this lane holds no claim on any family. So the
 * subject is a harness that reproduces the write faithfully: compose the wiring
 * document wholesale, from nothing, with no governance keys in it -- which is
 * precisely what every one of those builders does and precisely why the six keys
 * disappear -- and then write it.
 *
 * It moves no packet byte and touches no family directory. Everything it writes
 * goes under --out.
 *
 *   node governance-rebuild-harness.mjs --out DIR --canonical TEXT [options]
 *
 *     --preservation module   route the write through preserveGovernanceState()
 *     --preservation inline   carry the six keys with the builder's own code
 *     --preservation none     the pre-fix builder: compose and write
 *     --drop KEY              with `inline`, carry every key EXCEPT this one
 *     --seed                  write the "committed" wiring record first, with a
 *                             receipt bound to the canonical this run produces
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  GOVERNANCE_KEYS, preserveGovernanceState, writeWiringChecked
} from "./governance-preservation.mjs";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => { const i = argv.indexOf(name); return i === -1 ? fallback : argv[i + 1]; };
const has = (name) => argv.includes(name);

const OUT = flag("--out");
const CANONICAL_TEXT = flag("--canonical", "canonical bytes, revision one");
const MODE = flag("--preservation", "none");
const DROP = flag("--drop");
if (!OUT) { console.error("--out DIR is required"); process.exit(2); }

const FAMILY_ID = "harness_governance_preservation-set";
const ROUTE_KEY = "harness:governance-preservation";
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
const canonicalPath = path.join(OUT, "fixtures", "canonical.pdf");
/* Not a real PDF and not pretending to be one. The only property the governance
 * rule turns on is the digest of the bytes this build produced. */
fs.writeFileSync(canonicalPath, Buffer.from(CANONICAL_TEXT, "utf8"));
const canonicalSha256 = sha256(fs.readFileSync(canonicalPath));
const wiringPath = path.join(OUT, "product-wiring.json");

/* ---- the "committed" record a rebuild would be regenerating over ---------- */
if (has("--seed")) {
  fs.writeFileSync(wiringPath, `${JSON.stringify({
    schemaVersion: "rcap-family-product-wiring/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    binding: {
      family: FAMILY_ID,
      routeKeys: [ROUTE_KEY],
      /* Shaped like a real acceptance receipt and issued by nothing. This is a
       * harness fixture; no verdict here describes any packet in this
       * repository. */
      acceptanceReceipt: {
        verdict: "RASTER_PASS",
        workflowRunId: "00000000000",
        boundToCanonicalSha256: canonicalSha256,
        coversTheWholeFamily: true
      },
      lastIndependentVerification: { verdict: "FAIL_REPAIR_REQUIRED", lane: "harness" },
      paymentEligible: false,
      sponsorshipEligible: false,
      whyPaymentIsClosed: "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and "
        + "packet family, and from nothing else. This binding is not that record.",
      maintenanceRelationship: { rebuiltFrom: "scripts/rcap-packet-completeness/governance-rebuild-harness.mjs" }
    }
  }, null, 2)}\n`);
  console.log(`seeded ${wiringPath} with a receipt bound to ${canonicalSha256}`);
  process.exit(0);
}

/* ---- the rebuild: composed wholesale, with no governance keys in it ------- */
const document = {
  schemaVersion: "rcap-family-product-wiring/v1",
  familyId: FAMILY_ID,
  routeKeys: [ROUTE_KEY],
  implementationStrategy: "official_pdf_fill",
  generationAllowed: false,
  runtimeSelectable: false,
  commercialRoutesOpened: 0,
  createsFulfillmentRecord: false,
  opensCommercialRoute: false,
  binding: {
    family: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    deliveryType: "official_pdf_fill",
    canonical: `${OUT}/fixtures/canonical.pdf`,
    canonicalSha256
  }
};

if (MODE === "module") {
  preserveGovernanceState(fs, wiringPath, document, {
    canonicalSha256,
    log: (line) => console.log(line)
  });
} else if (MODE === "inline") {
  /*
   * A builder that carries the keys with its own code -- the FIX02 shape --
   * and, with --drop, one that carries all but one. That is the regression the
   * check exists for: preservation that looks right and quietly omits a key.
   */
  const previous = fs.existsSync(wiringPath) ? JSON.parse(fs.readFileSync(wiringPath, "utf8")) : null;
  const previousBinding = previous?.binding ?? {};
  for (const key of GOVERNANCE_KEYS) {
    if (key === DROP) continue;
    if (key === "acceptanceReceipt") continue;
    if (previousBinding[key] !== undefined) document.binding[key] = previousBinding[key];
  }
  if (DROP !== "acceptanceReceipt") {
    const receipt = previousBinding.acceptanceReceipt ?? null;
    if (receipt && receipt.boundToCanonicalSha256 === canonicalSha256) document.binding.acceptanceReceipt = receipt;
    else if (receipt) {
      document.binding.acceptanceReceiptWithdrawn = [{
        why: "the receipt binds an exact canonical SHA-256 and this build produced different bytes",
        boundToCanonicalSha256: receipt.boundToCanonicalSha256,
        replacedByCanonicalSha256: canonicalSha256,
        withdrawnReceipt: receipt
      }];
    }
  }
}

writeWiringChecked(fs, wiringPath, document);
console.log(`wrote ${wiringPath} · canonical ${canonicalSha256} · preservation=${MODE}${DROP ? ` drop=${DROP}` : ""}`);
