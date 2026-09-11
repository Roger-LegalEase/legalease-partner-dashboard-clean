#!/usr/bin/env node
/*
 * Product wiring, generated from build evidence instead of installed by hand.
 *
 * The simplification directive: one route-to-deliverable registry entry per
 * family, with hashes and provenance produced automatically in the background.
 * This emits a DECLARED_NOT_INSTALLED wiring for every family that has a
 * master-queue row and declared rendered artifacts but no wiring yet. It
 * derives the component list from the family's own rendered-artifacts.json.
 * It opens nothing: the explicit non-grants travel on every record.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { acceptedRasterFor, candidateRowsByFamily } from "./acceptance-identity.mjs";
import { bindDeclaredDeGuidance, pdfPageCount, DE_FAMILY } from "./de-guidance-binding.mjs";
import { bindDeclaredNdDelivery, ND_FAMILY } from "./nd-declared-binding.mjs";
import { bindDeclaredNcDelivery, NC_FAMILY } from "./nc-declared-delivery.mjs";
import { bindDeclaredKyDelivery, KY_FAMILY } from "./ky-declared-delivery.mjs";
import { bindDeclaredMdFavorableDelivery, MD_FAVORABLE_FAMILY } from "./md-favorable-declared-delivery.mjs";
import { bindDeclaredMdConditionalDelivery } from "./md-conditional-declared-delivery.mjs";
import { bindDeclaredGaDelivery, GA_FAMILY } from "./ga-declared-delivery.mjs";
import { IA_FORM1_FAMILY, bindDeclaredIaForm1Delivery, createDeclaredIaForm1Delivery } from "../rcap-packet-recovery/chat1/ia-form1-expected-candidates.mjs";
import { arizonaFilingCourtBinding, AZ_SEALING_ROUTES } from "../rcap-packet-recovery/chat1/az-filing-court.mjs";
import { isMiMoDeclaredFamily, bindDeclaredMiMoDelivery, createDeclaredMiMoDelivery } from "../rcap-packet-recovery/chat1/mi-mo-declared-candidates.mjs";
import { carryForwardGovernance } from "../rcap-packet-completeness/governance-preservation.mjs";
import { registeredRouteBindings } from "./route-review-registration.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");

let checkOnly = false;
let selectedFamilyId = null;
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--check") {
    checkOnly = true;
    continue;
  }
  if (arg === "--family") {
    if (selectedFamilyId !== null || !process.argv[i + 1] || process.argv[i + 1].startsWith("--")) {
      console.error("usage: node generate-product-wiring.mjs [--check] [--family <familyId>]");
      process.exit(2);
    }
    selectedFamilyId = process.argv[++i];
    continue;
  }
  console.error(`unknown argument: ${arg}`);
  console.error("usage: node generate-product-wiring.mjs [--check] [--family <familyId>]");
  process.exit(2);
}

const selectedFamilies = selectedFamilyId === null
  ? master.families
  : master.families.filter((f) => f.familyId === selectedFamilyId);
if (selectedFamilyId !== null && selectedFamilies.length !== 1) {
  console.error(`family not found in MASTER_QUEUE.json: ${selectedFamilyId}`);
  process.exit(2);
}

const rasterQueue = (() => { try { return read("data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json"); } catch { return { rows: [] }; } })();
const verifierReturns = (() => { try { return read("data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json"); } catch { return { rows: [] }; } })();
const rasterCandidatesByFamily = candidateRowsByFamily(rasterQueue);
/*
 * The re-hash this file has always done, now shared.
 *
 * It moved to ./acceptance-identity.mjs because verify-lane-contracts L4 was
 * missing exactly this test and was counting families proven on receipts bound
 * to bytes that had moved. The behaviour here is unchanged: a receipt that
 * never declared its coverage is still refused for a binding a route installs
 * from, which is what `requireReceiptDeclaredCoverage` preserves.
 */
const exactRasterFor = (familyId) => {
  const evaluation = acceptedRasterFor(ROOT, rasterCandidatesByFamily.get(familyId) ?? [],
    { requireReceiptDeclaredCoverage: true });
  return evaluation.proven ? evaluation.row : null;
};
const declaredDeliveryRefusals = [];
/*
 * A LANE THAT COULD NOT LOOK IS NOT THIS FAMILY'S LAST INDEPENDENT VERIFICATION.
 *
 * BLOCKED_BEFORE_CLAIM says the claim gate refused, so the lane opened no
 * artifact. It is a true statement about the lane and says nothing about the
 * packet. extract-verifier-returns.mjs keeps it out of the current-verdict
 * contest for exactly that reason, and generate.mjs keeps it as a fail-closed
 * fallback used only when nothing substantive exists.
 *
 * This loop did neither. It set the last non-superseded row it happened to walk,
 * so on 22 families carrying both a refusal and a real reading, which one reached
 * the DELIVERED binding depended on presentation order -- and on eight of them
 * the refusal won. pa_pardon_expungement-set shipped
 * lastIndependentVerification BLOCKED_BEFORE_CLAIM from vf12 while vf08 had
 * recorded a substantive FAIL_REPAIR_REQUIRED against it.
 *
 * None of the 22 carries two conflicting substantive readings; every one of the
 * 22 is a refusal against a single real verdict. So the rule is simply that a
 * refusal never displaces a reading, and stands alone only where there is none.
 */
const NON_READING_VERDICTS = new Set(["BLOCKED_BEFORE_CLAIM"]);

/*
 * FIX149. TWO THINGS A BINDING SAYS THAT NOTHING WAS KEEPING TRUE.
 *
 * (1) `packetComponents` is `f.packetComponents` from the family's MASTER_QUEUE
 *     row, verbatim. That is a DECLARATION about the packet, and on
 *     la-977d-marijuana-first-offense-set it disagrees with the packet: it lists
 *     `component:la-977d-marijuana-first-offense-fee-waiver-4`, which appears in
 *     no delivered artifact, and omits the primary filing the packet is built
 *     around. Measured across the whole queue at this base: 5 families agree,
 *     157 disagree and 184 declare nothing a page manifest can be compared to.
 *
 * (2) `acceptanceReceiptWithdrawn[].replacedByCanonicalSha256` is written once,
 *     at the moment the receipt is withdrawn, and never again. carryForward-
 *     Governance only reaches that code when the PREVIOUS binding still holds a
 *     receipt; after the first withdrawal the receipt is null, the branch is
 *     skipped, and the pointer freezes. la-976-arrest-no-conviction-set has been
 *     rebuilt twice since its withdrawal and its record still says the receipt
 *     was replaced by bdd789e2, which is two repairs old. Its sibling
 *     la-977d's reads current only because its withdrawal happened to be
 *     recorded on the most recent byte move.
 *
 * Neither is repaired by rewriting history. `replacedByCanonicalSha256` was
 * TRUE when written and stays exactly as written -- Roger's direction on the
 * staged border remediation is that old receipts are preserved as historical
 * evidence and never relabelled as covering changed output -- and the queue's
 * declared list keeps the queue's name. What is added is a MEASURED reading
 * beside each, refreshed on every run, so a reader can see at a glance that the
 * pointer no longer names the current bytes.
 *
 * OPT-IN PER FAMILY, exactly as build-census-v1-ne-setaside-custodial-set.mjs
 * gates the same correction behind `carryProductBinding`. This lane holds a
 * grant on two families. Switching 157 records on for every other lane's
 * families is not this lane's to do, and a set literal makes the next lane's
 * decision an explicit one rather than a side effect of a rebuild.
 */
const MEASURE_DELIVERED_AGAINST_THE_BYTES = new Set([
  "la-976-arrest-no-conviction-set",
  "la-977d-marijuana-first-offense-set"
]);

/** The components a family's own rendered artifacts actually carry pages for. */
function deliveredComponentsOf(directory) {
  try {
    const rendered = read(`${directory}/reports/rendered-artifacts.json`);
    const found = new Set();
    for (const artifact of rendered.artifacts ?? []) {
      for (const page of artifact.pageManifest ?? []) {
        if (page.component) found.add(`component:${page.component}`);
      }
    }
    return found.size ? [...found].sort() : null;
  } catch { return null; }
}

/** The canonical digests a family's own rendered artifacts report right now. */
function canonicalDigestsOnDisk(directory) {
  try {
    const rendered = read(`${directory}/reports/rendered-artifacts.json`);
    return (rendered.artifacts ?? [])
      .filter((a) => a.fixture === "canonical" && /^[0-9a-f]{64}$/.test(String(a.sha256 ?? "")))
      .map((a) => a.sha256);
  } catch { return []; }
}

function measureBindingAgainstTheBytes(familyId, directory, binding) {
  if (!MEASURE_DELIVERED_AGAINST_THE_BYTES.has(familyId) || !binding) return;

  const delivered = deliveredComponentsOf(directory);
  if (delivered) {
    const declared = Array.isArray(binding.packetComponents) ? [...binding.packetComponents].sort() : [];
    const declaredNotDelivered = declared.filter((c) => !delivered.includes(c));
    const deliveredNotDeclared = delivered.filter((c) => !declared.includes(c));
    binding.packetComponentsOnTheQueueRow = declared;
    binding.packetComponents = delivered;
    binding.packetComponentsProvenance = "measured from this family's own reports/rendered-artifacts.json page "
      + "manifest -- the components the delivered bytes actually carry pages for -- rather than declared from the "
      + "MASTER_QUEUE row. The queue row's list is kept above under its own name.";
    if (declaredNotDelivered.length || deliveredNotDeclared.length) {
      binding.packetComponentsDisagreement = {
        theyDisagree: true,
        declaredByTheQueueRowButInNoDeliveredArtifact: declaredNotDelivered,
        deliveredButNotDeclaredByTheQueueRow: deliveredNotDeclared,
        whyTheQueueRowIsNotEditedHere: "MASTER_QUEUE.json is generated centrally and is not edited by this "
          + "generator. The disagreement is recorded rather than reconciled away."
      };
    } else delete binding.packetComponentsDisagreement;
  }

  const canonicalNow = canonicalDigestsOnDisk(directory);

  /*
   * The third thing this binding said that nothing kept true.
   *
   * `lastIndependentVerification` names a lane, a verdict and the BASE COMMIT it
   * was read at. It does not name the canonical digest that lane read, and
   * VERIFIER_RETURNS.json does not record one -- so from this record alone it is
   * not decidable whether the verdict describes the bytes on disk. On la-976 it
   * reads vf43 and on la-977d vf05, and both were read before repairs that moved
   * every fixture in both families.
   *
   * The verdict is NOT edited. Setting a verdict is the independent lane's act
   * and nothing here does it. What is added is the one thing that IS measurable
   * from here: that the digest coverage is not measurable from here. It is null
   * with a reason, never 0 and never an assumed PASS.
   */
  if (binding.lastIndependentVerification) {
    binding.lastIndependentVerification.coversTheCanonicalOnDiskNow = null;
    binding.lastIndependentVerification.whyCoverageIsNull = "the returns ledger records the base commit a lane read "
      + "at, not the canonical digest it read, so whether this verdict describes the bytes now on disk cannot be "
      + "decided from this record. It is null rather than 0 or an assumed pass. Where acceptanceReceiptWithdrawn "
      + "below reports replacedByIsStillTheCanonicalOnDisk false, the family's bytes have demonstrably moved since "
      + "some earlier read, which is a reason to re-read and not a verdict.";
    binding.lastIndependentVerification.canonicalOnDiskNow = canonicalNow.length
      ? (canonicalNow.length === 1 ? canonicalNow[0] : [...canonicalNow].sort())
      : null;
  }

  for (const withdrawal of binding.acceptanceReceiptWithdrawn ?? []) {
    if (!canonicalNow.length) {
      withdrawal.canonicalOnDiskNow = null;
      withdrawal.whyCanonicalOnDiskIsNull = "this family declares no canonical fixture this generator can read, so "
        + "this run measured no bytes and makes no statement about what the pointer above still names";
      continue;
    }
    withdrawal.canonicalOnDiskNow = canonicalNow.length === 1 ? canonicalNow[0] : [...canonicalNow].sort();
    withdrawal.replacedByIsStillTheCanonicalOnDisk = canonicalNow.includes(withdrawal.replacedByCanonicalSha256);
    if (!withdrawal.replacedByIsStillTheCanonicalOnDisk) {
      withdrawal.readThePointerAsHistory = "replacedByCanonicalSha256 records the canonical this family produced at "
        + "the moment the receipt was withdrawn, and it was true then. The bytes have moved again since, so it is "
        + "history and not a description of what is on disk now. It is left as written rather than relabelled; "
        + "canonicalOnDiskNow beside it is measured on every run. The withdrawn receipt's own workflow run and "
        + "artifact ids are the ids of the superseded raster and are equally historical.";
    } else delete withdrawal.readThePointerAsHistory;
  }
}

const currentVerdict = new Map();
const preclaimRefusals = new Map();
for (const r of verifierReturns.rows ?? []) {
  if (!r.isIndependentVerification || !r.verdict || r.superseded) continue;
  if (NON_READING_VERDICTS.has(r.verdict)) { preclaimRefusals.set(r.familyId, r); continue; }
  currentVerdict.set(r.familyId, r);
}
for (const [familyId, refusal] of preclaimRefusals) {
  if (!currentVerdict.has(familyId)) currentVerdict.set(familyId, refusal);
}

/*
 * WHAT A BINDING RECORDS, AND WHAT IT STILL REFUSES.
 *
 * A family is not operationally complete because its packet passed. The
 * binding is the record a route resolver would read: what the participant
 * receives, which components carry it, where the field map and the
 * instructions are, which acceptance receipt proves the pixels, which source
 * version it was built from, and when it was last independently read.
 *
 * PAYMENT STAYS FAIL-CLOSED, and that is not a formality. Commercial authority
 * comes from a Grade-A fulfillment record keyed to an exact route and packet
 * family and from nothing else, so every binding written here says
 * paymentEligible: false and sponsorshipEligible: false, and says why. A
 * binding is a description of a deliverable, not a grant to sell it.
 */
const bindingFor = (f) => {
  const raster = exactRasterFor(f.familyId);
  const verdict = currentVerdict.get(f.familyId) ?? null;
  const has = (rel) => fs.existsSync(path.join(ROOT, f.directory, rel));
  const filingCourtSelection = arizonaFilingCourtBinding(f);
  return {
    family: f.familyId,
    ...(filingCourtSelection ? { filingCourtSelection } : {}),
    jurisdiction: f.jurisdiction,
    routeKeys: f.routeKeys,
    deliveryType: f.implementationStrategy,
    instrumentKinds: f.instrumentKinds ?? [],
    packetComponents: f.packetComponents ?? [],
    fieldMap: has("production-field-map.json") ? `${f.directory}/production-field-map.json` : null,
    instructions: has("participant-instructions.md") ? `${f.directory}/participant-instructions.md` : null,
    renderedArtifacts: has("reports/rendered-artifacts.json") ? `${f.directory}/reports/rendered-artifacts.json` : null,
    sourceReceipt: has("source-receipt.json") ? `${f.directory}/source-receipt.json` : null,
    sourceVersion: (f.sourceReadiness?.boundSources ?? []).map((b) => ({ sourceId: b.sourceId, sha256: b.sha256, tier: b.tier })),
    acceptanceReceipt: raster?.rasterReceipt
      ? {
          verdict: raster.rasterReceipt.verdict,
          workflowRunId: raster.rasterReceipt.workflowRunId,
          jobId: raster.rasterReceipt.jobId,
          artifactId: raster.rasterReceipt.receiptArtifact?.id ?? null,
          boundToCanonicalSha256: raster.rasterReceipt.boundToCanonicalSha256,
          coversTheWholeFamily: raster.rasterReceipt.coversTheWholeFamily === true
        }
      : null,
    lastIndependentVerification: verdict
      ? { verdict: verdict.verdict, lane: verdict.lane, verifiedAtBase: verdict.verifiedAtBase ?? null }
      : null,
    paymentEligible: false,
    sponsorshipEligible: false,
    whyPaymentIsClosed: "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else. This binding is not that record, and nothing in this repository has produced one.",
    maintenanceRelationship: {
      rebuiltFrom: f.buildScript,
      sharedBuildHost: f.sharedBuildHost ?? null,
      reRasterRequiredWhen: "any fixture byte moves; the acceptance receipt binds exact hashes and refuses a packet nobody rendered",
      reVerificationRequiredWhen: "the packet bytes, its bound source, or its legal treatment changes"
    }
  };
};

/*
 * A product-specific installed binding is not a cache of the factory queue.
 * It can carry a different, narrower route identity plus exact delivery
 * artifacts, authenticated review, and operational holds that the generic
 * census binding cannot reconstruct.  In particular, the Mississippi Clinic
 * Mode record is generated by its own packet workflow and binds the two
 * participant-delivery PDFs, not the census fixtures in RASTER_QUEUE.json.
 * Preserve such bindings byte-for-byte; their owning generator is the only
 * component allowed to replace them.
 */
const hasBespokeInstalledBinding = (record) =>
  /^INSTALLED_/.test(String(record?.status ?? ""))
  && record?.generatedBy !== "scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs"
  && typeof record?.binding?.packetSpecification === "string"
  && record?.binding?.artifacts
  && typeof record.binding.artifacts === "object";

const NON_GRANTS = [
  "This document opens no commercial route.",
  "It creates no fulfillment record and consumes no packet credit.",
  "It marks no packet proven and grants no output approval.",
  "It does not add this track to compiled runtime. src/lib/rcap-engine/compiled/** is untouched.",
  "It does not change any live RCAP route.",
  "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else. This is not that record."
];

const miMoOptions = (family) => ({
  report: read(`${family.directory}/reports/rendered-artifacts.json`),
  hashFile: (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"),
  raster: exactRasterFor(family.familyId)
});
const normalizedSelectedIndependentVerdict = (family) => family.selectedIndependentVerdict
  ? {
      verdict: family.selectedIndependentVerdict.verdict,
      lane: family.selectedIndependentVerdict.lane,
      verifiedAtBase: family.selectedIndependentVerdict.verifiedAtBase ?? null
    }
  : null;
const alignFamilyDeclaredDelivery = (record, family) => ["md_10110_conviction-set", "md_cannabis_petition-set"].includes(family.familyId)
  ? bindDeclaredMdConditionalDelivery(record, family, miMoOptions(family))
  : family.familyId === IA_FORM1_FAMILY
  ? bindDeclaredIaForm1Delivery(record, family, miMoOptions(family))
  : family.familyId === GA_FAMILY
  ? bindDeclaredGaDelivery(record, family, miMoOptions(family))
  : isMiMoDeclaredFamily(family.familyId)
  ? bindDeclaredMiMoDelivery(record, family, miMoOptions(family))
  : family.familyId === MD_FAVORABLE_FAMILY
  ? bindDeclaredMdFavorableDelivery(record, family, {
      report: read(`${family.directory}/reports/rendered-artifacts.json`),
      hashFile: (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"),
      raster: exactRasterFor(family.familyId)
    })
  : family.familyId === KY_FAMILY
  ? bindDeclaredKyDelivery(record, family, {
      report: read(`${family.directory}/reports/rendered-artifacts.json`),
      hashFile: (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"),
      raster: exactRasterFor(family.familyId)
    })
  : family.familyId === NC_FAMILY
  ? bindDeclaredNcDelivery(record, family, {
      report: read(`${family.directory}/reports/rendered-artifacts.json`),
      hashFile: (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"),
      raster: exactRasterFor(family.familyId)
    })
  : family.familyId === ND_FAMILY
  ? bindDeclaredNdDelivery(record, family, {
      report: read(`${family.directory}/reports/rendered-artifacts.json`),
      sourceReceipt: read(`${family.directory}/source-receipt.json`),
      fieldMap: read(`${family.directory}/production-field-map.json`),
      hashFile: (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"),
      raster: exactRasterFor(family.familyId),
      selectedIndependentVerdict: normalizedSelectedIndependentVerdict(family)
    })
  : family.familyId !== DE_FAMILY ? record
  : bindDeclaredDeGuidance(record, family, {
      report: read(`${family.directory}/reports/rendered-artifacts.json`),
      receipt: read(`${family.directory}/source-receipt.json`),
      pageCountFile: rel => pdfPageCount(fs.readFileSync(path.join(ROOT, rel))),
      instructions: fs.readFileSync(path.join(ROOT, family.directory, "participant-instructions.md"), "utf8"),
      hashFile: (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex")
    });

const alignDeclaredDelivery = (record, family) => {
  const aligned = alignFamilyDeclaredDelivery(record, family);
  const routes = registeredRouteBindings(family.familyId);
  if (routes.length) aligned.binding.routeArtifactBindings = routes;
  return aligned;
};

/*
 * THE CANONICAL DIGESTS A FAMILY CURRENTLY PRODUCES.
 *
 * An acceptance receipt binds ONE exact canonical SHA-256. Whether it still
 * describes the family is therefore a membership question, not an equality one:
 * rcap-oh-custom-pleading-clean-tracks renders four canonicals, one per track,
 * and pa-summary-conviction-set three, one per instrument. The fixture-label
 * test is the same one the component derivation below uses.
 */
const canonicalDigestsFor = (family) => {
  let art;
  try { art = JSON.parse(fs.readFileSync(path.join(ROOT, family.directory, "reports", "rendered-artifacts.json"), "utf8")); }
  catch { return null; }
  const digests = [...new Set((art.artifacts ?? art.pdfs ?? art.packets ?? [])
    .filter((a) => /(^|-)canonical(-|$)/.test(String(a.fixture ?? "")))
    .map((a) => String(a.sha256 ?? ""))
    .filter((d) => /^[0-9a-f]{64}$/.test(d)))];
  return digests.length ? digests : null;
};

let written = 0, skipped = 0, refreshed = 0, bespokeBindingsPreserved = 0;
const digestsRepinned = [];
const digestFileMissing = [];
const receiptsWithdrawn = [];
const governanceCarried = [];
for (const f of selectedFamilies) {
  const wiringPath = path.join(ROOT, f.directory, "product-wiring.json");
  const artifactsPath = path.join(ROOT, f.directory, "reports", "rendered-artifacts.json");
  /*
   * A wiring record written before bindings existed carries no binding, and a
   * binding goes stale the moment a receipt or a verdict moves. So an existing
   * record is refreshed in place rather than skipped: its identity and its
   * non-grants are untouched, and the binding is rewritten from current
   * evidence.
   *
   * The component digests in proposedRepresentation are refreshed too, and this
   * is not an exception to leaving the proposal alone. Everything else in that
   * block is a proposal -- which components, in what order, in what role, at
   * what path. A sha256 is not a proposal about anything; it is a measurement
   * of the bytes at the path the proposal names, and a measurement that no
   * longer matches the bytes is simply wrong.
   *
   * It was wrong on ten of seventy-nine records. Every one of them is a family
   * repaired after its wiring was first written: the packet was rebuilt, the
   * fixture changed, and the digest kept naming the superseded bytes -- in one
   * case three lines above an acceptanceReceipt that recorded the new hash, so
   * the same file disagreed with itself. An independent verifier failed the AK
   * treatment on ARTIFACTS for exactly this and was right to: a route installs
   * from this record, and a stale pin installs the wrong document or nothing.
   *
   * The refresh only ever answers the question the field already asks. A named
   * file that is absent keeps its declared digest and is reported, because a
   * missing component is a build problem and silently blanking its hash would
   * bury it.
   */
  if (fs.existsSync(wiringPath)) {
    try {
      let existing = JSON.parse(fs.readFileSync(wiringPath, "utf8"));
      const before = JSON.stringify(existing);
      let previousBinding = null;
      let canonical = null;
      if (hasBespokeInstalledBinding(existing)) bespokeBindingsPreserved++;
      else {
        /*
         * A REGENERATED BINDING MUST NOT DELETE THE RECEIPT IT CANNOT REDERIVE.
         *
         * bindingFor() derives the acceptance receipt from RASTER_QUEUE.json and
         * writes `acceptanceReceipt: null` when it finds no proven row. That
         * null used to land straight on top of a committed hash-bound
         * RASTER_PASS. Measured at this base: 32 of the 212 committed records
         * this generator wrote carry a receipt whose family has NO row in the
         * raster queue at all, so a refresh deletes 32 receipts, silently, and
         * leaves nothing to compare against.
         *
         * That is the defect recorded in
         * data/rcap-grade-a/packet-factory-24h/REBUILD_ERASES_GOVERNANCE_STATE.json.
         * Roger's direction on the staged border remediation is explicit that old
         * receipts are preserved as historical evidence and that no old receipt
         * is ever relabelled as covering changed output, so the receipt is
         * carried while it still binds a canonical this family produces and
         * WITHDRAWN, with both digests, when it does not. Nothing here issues a
         * receipt or sets a verdict: only the central raster workflow does that.
         */
        previousBinding = existing.binding ?? null;
        existing.binding = bindingFor(f);
        canonical = canonicalDigestsFor(f);
        const outcome = carryForwardGovernance(previousBinding, existing.binding, canonical
          ? { canonicalSha256: canonical }
          : { whyCanonicalIsNotMeasured: "this family declares no canonical fixture this generator can read, so this "
              + "refresh measured no bytes and makes no statement about what the receipt covers" });
        for (const w of outcome.withdrawn) {
          receiptsWithdrawn.push({ family: f.familyId, was: w.boundToCanonicalSha256, now: w.replacedByCanonicalSha256 });
        }
        if (outcome.carried.includes("acceptanceReceipt")) governanceCarried.push(f.familyId);
      }
      for (const c of existing.proposedRepresentation?.components ?? []) {
        if (!c.file || !/^[0-9a-f]{64}$/.test(String(c.sha256 ?? ""))) continue;
        const abs = path.join(ROOT, c.file);
        if (!fs.existsSync(abs)) { digestFileMissing.push({ family: f.familyId, file: c.file }); continue; }
        const actual = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
        if (actual === c.sha256) continue;
        digestsRepinned.push({ family: f.familyId, componentId: c.componentId ?? null, file: c.file, was: c.sha256, now: actual });
        c.sha256 = actual;
      }
      /*
       * ONE FAMILY'S UNMET EXPECTATION MUST NOT BLIND THE OTHER 345.
       *
       * The declared-delivery binders assert what their family's records must
       * look like, and a failed assertion throws out of the whole generator.
       * Six families do that today — five because their binder expects the
       * boundary fixture in the raster receipt and the central gate never
       * renders boundary fixtures, and rcap-ga-guidance-implementation because
       * its binder was written for a fifteen-document receipt while the queue
       * holds one covering fewer. So generate-product-wiring.mjs has been
       * exiting non-zero and NO family's wiring regenerated: 128 records were
       * stale behind the first thrown assertion.
       *
       * Each refusal is real and is preserved: that family's binding is left
       * exactly as committed and nothing is written for it. What changes is the
       * blast radius. The failure is recorded per family and reported at the
       * end, so the derivation completes for everyone else and the defect stays
       * visible instead of stopping the queue.
       */
      try {
        existing = alignDeclaredDelivery(existing, f);
      } catch (e) {
        /* An AssertionError's first line is boilerplate; the useful part is the
         * assertion's own message where one was given, and otherwise the first
         * differing lines. Truncating to line one made six distinct defects
         * print the same sentence. */
        const raw = String(e?.message ?? e);
        const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
        const why = lines.find((l) => !/^Expected values|^\+ actual|^- expected|^\.\.\.|^\[|^\]$/.test(l) && l.length > 12)
          ?? lines.slice(0, 3).join(" | ");
        declaredDeliveryRefusals.push({ family: f.familyId, why: why.slice(0, 260) });
        continue;
      }
      /*
       * PRESERVATION MUST HAVE THE LAST WORD, NOT THE FIRST.
       *
       * carryForwardGovernance ran above, and then alignDeclaredDelivery ran,
       * and the declared-delivery binders unconditionally null the receipt
       * before re-deriving it -- nc-declared-delivery.mjs, ky-declared-delivery
       * .mjs and md-favorable-declared-delivery.mjs each carry a bare
       * `result.binding.acceptanceReceipt = null;` and none of them imports the
       * preservation module. So a receipt carried at line 292 was nulled again
       * at line 330 and written out at line 344 with nothing between.
       *
       * That was measured, not inferred: of twelve receipts restored from
       * history by the recovery lane, only six were carried by the guard. The
       * other six survived because their binder THREW and the `continue` above
       * skipped the write entirely -- they survived by refusal rather than by
       * preservation, and the moment those assertions are fixed the null lands
       * on them.
       *
       * Re-asserting here rather than editing each binder is deliberate: it
       * fixes every binder that exists and every one written later, and it
       * cannot be undone by a binder that does not know this module exists.
       * Running it twice is free -- carrying an already-carried key is a
       * no-op, and a withdrawal already recorded is not recorded twice.
       */
      const afterAlign = carryForwardGovernance(previousBinding, existing.binding, canonical
        ? { canonicalSha256: canonical }
        : { whyCanonicalIsNotMeasured: "this family declares no canonical fixture this generator can read, so this "
            + "refresh measured no bytes and makes no statement about what the receipt covers" });
      for (const w of afterAlign.withdrawn) {
        if (receiptsWithdrawn.some((r) => r.family === f.familyId && r.was === w.boundToCanonicalSha256)) continue;
        receiptsWithdrawn.push({ family: f.familyId, was: w.boundToCanonicalSha256, now: w.replacedByCanonicalSha256 });
      }
      if (afterAlign.carried.includes("acceptanceReceipt") && !governanceCarried.includes(f.familyId)) {
        governanceCarried.push(f.familyId);
      }
      measureBindingAgainstTheBytes(f.familyId, f.directory, existing.binding);
      if (JSON.stringify(existing) !== before) {
        if (!checkOnly) fs.writeFileSync(wiringPath, `${JSON.stringify(existing, null, 2)}\n`);
        refreshed++;
      } else skipped++;
    } catch (error) {
      if ([DE_FAMILY, ND_FAMILY, NC_FAMILY, KY_FAMILY, MD_FAVORABLE_FAMILY, "md_10110_conviction-set", "md_cannabis_petition-set", GA_FAMILY, IA_FORM1_FAMILY].includes(f.familyId) || isMiMoDeclaredFamily(f.familyId) || Object.hasOwn(AZ_SEALING_ROUTES, f.familyId)) throw error;
      skipped++;
    }
    continue;
  }
  if (!fs.existsSync(artifactsPath)) continue;
  if (f.familyId === IA_FORM1_FAMILY) {
    const wiring = createDeclaredIaForm1Delivery(f, bindingFor(f), miMoOptions(f));
    if (!checkOnly) fs.writeFileSync(wiringPath, `${JSON.stringify(wiring, null, 2)}\n`);
    console.log(`${checkOnly ? "would write" : "wrote"} ${f.directory}/product-wiring.json (${wiring.binding.conditionalDelivery.fixtureBindings.length} exact outputs, diagnostics retained)`);
    written++;
    continue;
  }
  if (isMiMoDeclaredFamily(f.familyId)) {
    const wiring = createDeclaredMiMoDelivery(f, bindingFor(f), miMoOptions(f));
    if (!checkOnly) fs.writeFileSync(wiringPath, `${JSON.stringify(wiring, null, 2)}\n`);
    console.log(`${checkOnly ? "would write" : "wrote"} ${f.directory}/product-wiring.json (${wiring.binding.conditionalDelivery.fixtureBindings.length} exact selected complete outputs)`);
    written++;
    continue;
  }
  let art;
  try { art = JSON.parse(fs.readFileSync(artifactsPath, "utf8")); } catch { continue; }
  /* Fixture labels vary by host era: "canonical", "tf810-canonical",
   * "canonical-misdemeanor_5yr". A canonical fixture is one whose label
   * carries `canonical` as a hyphen-delimited segment.
   *
   * The anchored form missed only the third shape, and only dc_seal_conviction
   * wears it -- which is why that family alone reached VERIFIED_PASS with no
   * wiring record at all, and so could never be proven. Every other family
   * matched by this test already matched the anchored one, so widening it
   * writes exactly one record that was previously skipped and rewrites none.
   */
  const docs = (art.artifacts ?? art.pdfs ?? art.packets ?? []).filter((a) => /(^|-)canonical(-|$)/.test(String(a.fixture ?? "")));
  if (docs.length === 0) continue;
  /*
   * A component is a document a participant files. It is NOT a rendering, and
   * on DC the two are not even the same shape.
   *
   * Almost every family renders one canonical fixture per document, so the
   * fixture list and the component list coincide and the ordinary branch below
   * is right. DC does something else: it assembles its whole packet into ONE
   * fixture and renders that fixture once per route -- the misdemeanor
   * five-year track and the felony eight-year track. Each of those fixtures
   * declares the same three documents inside it: primary_filing,
   * prosecutor_service, filing_instructions.
   *
   * Reading the fixtures as components would have said this family files two
   * documents named canonical-misdemeanor_5yr and canonical-felony_8yr, one of
   * them a "companion_document" -- so a route installer would represent a
   * participant filing a misdemeanor motion AND a felony motion. The family
   * files three documents, and which assembled bytes carry them depends on
   * which route the participant is on.
   *
   * So where a canonical fixture declares the documents inside it, those are
   * the components, and the per-route assembled renderings are recorded beside
   * them as what actually carries the bytes.
   */
  const assembled = docs.filter((d) => Array.isArray(d.documents ?? d.components) && (d.documents ?? d.components).length > 0);
  const isAssembledPacket = assembled.length === docs.length && docs.length > 0
    && new Set(docs.map((d) => d.routeKey ?? "")).size === docs.length;
  const componentGroups = [];
  const groupIndex = new Map();
  if (isAssembledPacket) {
    for (const d of docs) for (const document of (d.documents ?? d.components)) {
      const documentId = typeof document === "string" ? document : document?.documentId;
      if (!documentId) continue;
      if (!groupIndex.has(documentId)) { groupIndex.set(documentId, componentGroups.length); componentGroups.push({ key: documentId, renderings: [] }); }
      componentGroups[groupIndex.get(documentId)].renderings.push(d);
    }
  } else {
    for (const d of docs) {
      const key = d.documentId ?? d.document ?? path.basename(d.file ?? "", ".pdf");
      if (!groupIndex.has(key)) { groupIndex.set(key, componentGroups.length); componentGroups.push({ key, renderings: [] }); }
      componentGroups[groupIndex.get(key)].renderings.push(d);
    }
  }
  let wiring = {
    schemaVersion: "rcap-census-v1-product-wiring/v1",
    family: f.familyId,
    routeKey: f.routeKeys[0] ?? null,
    routeKeys: f.routeKeys,
    workType: "PRODUCT_WIRING_REQUIRED",
    status: "DECLARED_NOT_INSTALLED",
    authorityCreated: "none",
    generatedBy: "scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs",
    derivedFrom: `${f.directory}/reports/rendered-artifacts.json`,
    explicitNonGrants: NON_GRANTS,
    currentState: {
      serviceDisposition: "missing_from_compiled_runtime",
      commercialState: "NO_ROUTE_LEVEL_GRADE_A_AUTHORITY_FROM_TRACK_MEMBERSHIP",
      existingArtifactIds: [],
      generationAllowed: false
    },
    binding: bindingFor(f),
    proposedRepresentation: {
      note: "A specification for a later lane, derived from the family's own declared render. Installing it would still represent in runtime a packet whose output no human has reviewed or approved.",
      packetSetId: f.familyId,
      outputStrategy: f.implementationStrategy,
      components: componentGroups.map((g, i) => {
        const perRoute = g.renderings.length > 1;
        const only = g.renderings[0];
        return {
          componentId: `${f.familyId}-component-${i + 1}`,
          role: i === 0 ? "primary_filing" : "companion_document",
          order: i + 1,
          documentId: g.key,
          file: perRoute ? null : (only.file ?? null),
          sha256: perRoute ? null : (only.sha256 ?? null),
          requirement: "required",
          ...(perRoute ? {
            carriedByAssembledPacketPerRoute: g.renderings.map((d) => ({
              routeKey: d.routeKey ?? null,
              fixture: d.fixture ?? null,
              file: d.file ?? null,
              sha256: d.sha256 ?? null,
              pagesInThatPacket: (d.pageManifest ?? []).filter((p) => (p.documentId ?? p.component) === g.key).map((p) => p.packetPage)
            })),
            whyThereIsNoSingleDigest: "This family assembles its whole packet into one fixture and renders that fixture once per route, so this component has no bytes of its own to pin. A route installs the assembled packet whose routeKey it matches; the digests are on those packets, and the pages above say where this component sits inside each."
          } : {})
        };
      })
    }
  };
  wiring = alignDeclaredDelivery(wiring, f);
  if (!checkOnly) fs.writeFileSync(wiringPath, `${JSON.stringify(wiring, null, 2)}\n`);
  console.log(`${checkOnly ? "would write" : "wrote"} ${f.directory}/product-wiring.json (${componentGroups.length} component(s) across ${docs.length} canonical rendering(s))`);
  written++;
}
console.log(checkOnly
  ? `${written} wiring record(s) need creation, ${refreshed} record(s) need refresh, ${skipped} unchanged`
  : `${written} wiring record(s) written, ${refreshed} record(s) refreshed, ${skipped} unchanged`);
if (bespokeBindingsPreserved) console.log(`  ${bespokeBindingsPreserved} bespoke installed binding(s) preserved`);
if (governanceCarried.length) {
  console.log(`  ${governanceCarried.length} committed acceptance receipt(s) carried forward: this refresh derived none from the raster queue and the committed receipt still binds a canonical the family produces.`);
}
if (receiptsWithdrawn.length) {
  console.log(`  ${receiptsWithdrawn.length} acceptance receipt(s) WITHDRAWN, kept on the record under acceptanceReceiptWithdrawn:`);
  for (const w of receiptsWithdrawn) console.log(`    ${w.family} bound to ${String(w.was).slice(0, 12)}, the family now produces ${String(w.now).slice(0, 12)}`);
  console.log("  A withdrawn receipt is history, not a verdict. Each of these families owes a central raster of its current bytes; nothing here issues one.");
}
if (digestsRepinned.length) {
  console.log(`  ${digestsRepinned.length} component digest(s) re-pinned to the bytes on disk:`);
  for (const d of digestsRepinned) console.log(`    ${d.family} ${d.file.split("/").pop()} ${d.was.slice(0, 12)} -> ${d.now.slice(0, 12)}`);
}
for (const m of digestFileMissing) console.log(`  MISSING component file, digest left as declared: ${m.family} ${m.file}`);
if (declaredDeliveryRefusals.length) {
  console.log(`  ${declaredDeliveryRefusals.length} famil(ies) REFUSED their declared-delivery binding; their wiring is left exactly as committed:`);
  for (const r of declaredDeliveryRefusals) console.log(`    ${r.family}: ${r.why}`);
  console.log("  Each is a real mismatch between a family's binder and its records. It is reported rather than thrown so the other families still derive.");
}
if (checkOnly && (written > 0 || refreshed > 0)) process.exitCode = 1;
