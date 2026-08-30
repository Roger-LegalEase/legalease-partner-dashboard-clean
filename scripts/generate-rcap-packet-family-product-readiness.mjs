#!/usr/bin/env node
// Packet-family product readiness: the precheck that must pass before a
// completed packet family may be connected to the paid product path.
//
//   node scripts/generate-rcap-packet-family-product-readiness.mjs
//   node scripts/generate-rcap-packet-family-product-readiness.mjs --check
//
// A packet family is "completed" in the counsel manifest sense long before it
// is safe to sell from. Completion records that counsel adopted the legal
// design and that the technical evidence was gathered; it says nothing about
// whether the artifact that evidence describes is present in the tree that is
// about to serve it, whether its hashes still match, or whether the family's
// own proof considers it runtime-ready.
//
// This generator answers exactly the questions a wiring batch has to answer per
// family, from committed evidence and never from prose:
//
//   artifactPresent            every declared implementation output exists here
//   artifactHashCurrent        every present output hashes to its recorded sha256
//   specificationCurrent       the adopted legal-design record and the legal
//                              design memo hash to their recorded sha256
//   sourceIdentityCurrent      the packet proof hashes to the sha256 the counsel
//                              manifest recorded for it
//   staleArtifactBlockClear    no problematic-PDF register record blocks a form
//                              this family's routes depend on
//   outputLegalApprovalKnown   the owner legal decision names the family, or
//                              does not; never inferred from its jurisdiction
//   familyRuntimeEnabled       the family's own proof records a runtime-enabled,
//                              packet-ready, production-enabled family
//   routeIdentityExact         every route key the family claims is a route the
//                              factory_v2 registry records under that family
//
// productReady is the conjunction. It is deliberately hard to earn: the point of
// the record is that connecting a family to money is a decision about evidence,
// not about how finished the family feels.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { familyLegalStatus, OWNER_PENDING, readOwnerLegalDecision } from "./lib/rcap-owner-legal-decision.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");

const OUT_JSON = "data/record-clearing/packet-family-product-readiness.json";
const OUT_DOC = "docs/record-clearing/packet-family-product-readiness.md";
const MANIFEST = "data/rcap-ledger/completed-output-counsel-manifest.json";
const FACTORY_REGISTRY = "data/record-clearing/factory-v2-route-registry.json";
const PROBLEMATIC_REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const TEMPLATE_FAMILY_DIR = "data/record-clearing/template-families";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256File = (rel) => {
  const abs = path.join(rootDir, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
};

const manifest = readJson(MANIFEST);
const factory = readJson(FACTORY_REGISTRY);
const problematic = readJson(PROBLEMATIC_REGISTER);
const decision = readOwnerLegalDecision();

// --------------------------------------------------------------------------- route index
// familyId -> the routes the generated factory registry records under it, and
// the official forms those routes depend on.
const routesByFamily = new Map();
for (const route of factory.routes ?? []) {
  for (const familyId of route.packetFamilies ?? []) {
    if (!routesByFamily.has(familyId)) routesByFamily.set(familyId, []);
    routesByFamily.get(familyId).push({
      pathwayKey: route.pathwayKey,
      jurisdiction: route.jurisdiction,
      pathwayId: route.pathwayId,
      officialFormIds: route.officialFormIds ?? [],
      factoryV2Resolves: route.factoryV2Resolves === true,
      openBlockerIds: route.separateGates?.openBlockerIds ?? []
    });
  }
}

// --------------------------------------------------------------------------- stale-artifact block index
// The problematic-PDF register keys its records by an official-form identity.
// A family is blocked when any route it serves depends on a form the register
// still carries a record for.
const blockedForms = new Map();
for (const record of problematic.records ?? []) {
  const key = String(record.formId ?? "").trim();
  if (key === "") continue;
  if (!blockedForms.has(key)) blockedForms.set(key, []);
  blockedForms.get(key).push({
    identity: record.identity ?? null,
    jurisdiction: record.jurisdiction ?? null,
    defectCategories: record.defectCategories ?? []
  });
}

const families = [];

for (const family of manifest.families ?? []) {
  const familyId = family.familyId;
  const refusals = [];

  // --- artifact identity ---------------------------------------------------
  const implementationOutputs = (family.implementationOutputs ?? []).map((output) => {
    const measured = sha256File(output.path);
    return {
      path: output.path,
      recordedSha256: output.sha256 ?? null,
      measuredSha256: measured,
      state: measured === null ? "absent" : measured === output.sha256 ? "match" : "mismatch"
    };
  });
  const artifactPresent = implementationOutputs.length > 0
    && implementationOutputs.every((output) => output.state !== "absent");
  const artifactHashCurrent = implementationOutputs.length > 0
    && implementationOutputs.every((output) => output.state === "match");
  if (!artifactPresent) {
    const absent = implementationOutputs.filter((o) => o.state === "absent").map((o) => o.path);
    refusals.push(implementationOutputs.length === 0
      ? "the family declares no implementation output, so there is nothing to serve"
      : `implementation output(s) absent from this tree: ${absent.join(", ")}`);
  } else if (!artifactHashCurrent) {
    const bad = implementationOutputs.filter((o) => o.state === "mismatch").map((o) => o.path);
    refusals.push(`implementation output(s) no longer hash to the recorded artifact: ${bad.join(", ")}`);
  }

  // --- specification identity ---------------------------------------------
  const adoptionPath = path.posix.join(TEMPLATE_FAMILY_DIR, `${family.adoptedLegalDesignRecord}.json`);
  const adoptionMeasured = sha256File(adoptionPath);
  const adoptionCurrent = adoptionMeasured !== null && adoptionMeasured === family.adoptedLegalDesignRecordSha256;
  const memoMeasured = family.legalDesignMemoPath ? sha256File(family.legalDesignMemoPath) : null;
  const memoCurrent = memoMeasured !== null && memoMeasured === family.legalDesignMemoSha256;
  const specificationCurrent = adoptionCurrent && memoCurrent;
  if (!adoptionCurrent) {
    refusals.push(adoptionMeasured === null
      ? `the adopted legal-design record ${adoptionPath} is absent from this tree`
      : `the adopted legal-design record ${adoptionPath} no longer hashes to ${family.adoptedLegalDesignRecordSha256}`);
  }
  if (!memoCurrent) {
    refusals.push(memoMeasured === null
      ? `the legal design memo ${family.legalDesignMemoPath} is absent from this tree`
      : `the legal design memo ${family.legalDesignMemoPath} no longer hashes to ${family.legalDesignMemoSha256}`);
  }

  // --- source identity (the packet proof the evidence rests on) ------------
  const proofMeasured = family.packetProofPath ? sha256File(family.packetProofPath) : null;
  const sourceIdentityCurrent = proofMeasured !== null && proofMeasured === family.currentPacketProofSha256;
  if (!sourceIdentityCurrent) {
    refusals.push(proofMeasured === null
      ? `the packet proof ${family.packetProofPath} is absent from this tree`
      : `the packet proof ${family.packetProofPath} no longer hashes to ${family.currentPacketProofSha256}`);
  }

  // --- the family's own runtime gates, read from its proof ----------------
  const proof = proofMeasured === null ? null : readJson(family.packetProofPath);
  const familyRuntime = {
    runtimeStatus: proof?.runtimeStatus ?? null,
    packetReady: proof?.packetReady ?? null,
    productionEnabled: proof?.productionEnabled ?? null,
    counselAdopted: proof?.counselAdopted ?? null,
    technicalEvidence: proof?.technicalEvidence ?? null,
    visualReview: proof?.visualReview ?? null,
    completedOutputLegalReview: proof?.completedOutputLegalReview ?? null
  };
  const familyRuntimeEnabled = familyRuntime.runtimeStatus === "runtime_enabled"
    && familyRuntime.packetReady === true
    && familyRuntime.productionEnabled === true;
  if (!familyRuntimeEnabled) {
    refusals.push(`the family's own completion proof records runtimeStatus=${familyRuntime.runtimeStatus ?? "unknown"}, packetReady=${familyRuntime.packetReady ?? "unknown"}, productionEnabled=${familyRuntime.productionEnabled ?? "unknown"}`);
  }

  // --- stale-artifact block ------------------------------------------------
  const routes = routesByFamily.get(familyId) ?? [];
  const dependedForms = [...new Set(routes.flatMap((route) => route.officialFormIds))];
  const blocks = dependedForms
    .filter((formId) => blockedForms.has(formId))
    .map((formId) => ({ formId, records: blockedForms.get(formId) }));
  const staleArtifactBlockClear = blocks.length === 0;
  if (!staleArtifactBlockClear) {
    refusals.push(`the problematic-PDF register still carries a record for ${blocks.map((b) => b.formId).join(", ")}`);
  }

  // --- output legal approval ----------------------------------------------
  const legalStatus = familyLegalStatus(decision, familyId);
  const supersededTechnicalEvidence = Boolean(decision?.supersededFamilies?.has(familyId));
  const outputLegalApprovalKnown = typeof legalStatus === "string" && legalStatus !== "";
  if (legalStatus === OWNER_PENDING) {
    refusals.push("no owner legal decision names this family");
  }
  if (supersededTechnicalEvidence) {
    refusals.push("the owner decision's annex records this family's technical evidence as superseded");
  }

  // --- route identity ------------------------------------------------------
  const claimedRouteKeys = [...new Set(family.intendedPaidPathwaysUnblocked ?? [])].sort();
  const registryRouteKeys = [...new Set(routes.map((route) => route.pathwayKey))].sort();
  const unmatchedClaims = claimedRouteKeys.filter((key) => !registryRouteKeys.includes(key));
  const routeIdentityExact = registryRouteKeys.length > 0 && unmatchedClaims.length === 0;
  if (registryRouteKeys.length === 0) {
    refusals.push("the factory_v2 route registry records no route under this family id");
  } else if (unmatchedClaims.length > 0) {
    refusals.push(`route key(s) the family claims are not recorded under it in the factory registry: ${unmatchedClaims.join(", ")}`);
  }

  const precheck = {
    artifactPresent,
    artifactHashCurrent,
    specificationCurrent,
    sourceIdentityCurrent,
    staleArtifactBlockClear,
    outputLegalApprovalKnown,
    familyRuntimeEnabled,
    routeIdentityExact
  };

  families.push({
    familyId,
    jurisdictions: family.jurisdictions ?? [],
    routeKeys: registryRouteKeys,
    claimedRouteKeys,
    precheck,
    productReady: Object.values(precheck).every(Boolean) && refusals.length === 0,
    refusals,
    outputLegalApprovalStatus: legalStatus,
    legalDecisionRecordId: family.legalDecisionRecordId ?? null,
    supersededTechnicalEvidence,
    familyRuntime,
    implementationOutputs,
    staleArtifactBlocks: blocks
  });
}

families.sort((a, b) => a.familyId.localeCompare(b.familyId));

const productReady = families.filter((f) => f.productReady);
const conditionTotals = {};
for (const family of families) {
  for (const [name, held] of Object.entries(family.precheck)) {
    conditionTotals[name] = (conditionTotals[name] ?? 0) + (held ? 1 : 0);
  }
}

const ledger = {
  schemaVersion: "rcap-packet-family-product-readiness/v1",
  generatedBy: "scripts/generate-rcap-packet-family-product-readiness.mjs",
  question: "Which completed packet families may be connected to the paid product path, and on what evidence?",
  createsApproval: false,
  makesNothingSellable: true,
  ownerLegalDecision: {
    approved: decision.approved === true,
    recordIds: (decision.records ?? []).map((record) => record.recordId),
    doesNotAuthorize: (decision.records ?? []).flatMap((record) => record.doesNotAuthorize ?? [])
  },
  totals: {
    families: families.length,
    productReady: productReady.length,
    refused: families.length - productReady.length,
    routeKeysCovered: [...new Set(families.flatMap((f) => f.routeKeys))].length,
    conditionsHeld: conditionTotals
  },
  productReadyFamilyIds: productReady.map((f) => f.familyId),
  productReadyRouteKeys: [...new Set(productReady.flatMap((f) => f.routeKeys))].sort(),
  families
};

// --------------------------------------------------------------------------- report
const refusalTally = new Map();
for (const family of families) {
  for (const refusal of family.refusals) {
    // Group by the shape of the refusal, not its exact paths.
    const shape = refusal.replace(/:.*$/, "").replace(/data\/[^\s,]+/g, "…");
    refusalTally.set(shape, (refusalTally.get(shape) ?? 0) + 1);
  }
}

const doc = [
  "# Packet-family product readiness",
  "",
  "Generated by `scripts/generate-rcap-packet-family-product-readiness.mjs`. This",
  "record creates no approval and makes nothing sellable. It answers one question:",
  "which completed packet families may be connected to the paid product path, and",
  "on what evidence.",
  "",
  `**${productReady.length} of ${families.length}** completed packet families are product-ready.`,
  "",
  "## The precheck",
  "",
  "| Condition | Families holding |",
  "|---|---|",
  ...Object.entries(conditionTotals).map(([name, held]) => `| \`${name}\` | ${held} / ${families.length} |`),
  "",
  "## Why families are refused",
  "",
  "| Refusal | Families |",
  "|---|---|",
  ...[...refusalTally.entries()].sort((a, b) => b[1] - a[1]).map(([shape, count]) => `| ${shape} | ${count} |`),
  "",
  "## What this means for the product path",
  "",
  "A family that is not product-ready may not be sold from and may not consume a",
  "packet credit. That is enforced in the runtime rather than asserted here: the",
  "packet route resolver declares every `factory_v2` route non-sellable and",
  "non-credit-consumable, `assertPacketRouteCanDeliver` refuses Checkout for any",
  "route the resolver does not declare sellable, and `buildRenderJobSpec` builds no",
  "durable render job for a route that may not consume a credit — so there is no",
  "artifact finalization and no path into credit accounting.",
  "",
  "Turning a route public or sellable is outside every decision on record. The only",
  "owner legal decision in the authorization queue names its own limits, and",
  "`turning any route public or sellable` is one of them.",
  "",
  "## Families",
  "",
  "| Family | Routes | Product ready | Legal approval | First refusal |",
  "|---|---|---|---|---|",
  ...families.map((family) => `| \`${family.familyId}\` | ${family.routeKeys.length} | ${family.productReady ? "yes" : "no"} | \`${family.outputLegalApprovalStatus}\` | ${family.refusals[0] ?? "—"} |`),
  ""
].join("\n");

const serialized = `${JSON.stringify(ledger, null, 2)}\n`;

if (CHECK) {
  const failures = [];
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_DOC, doc]]) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) failures.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) failures.push(`${rel} is stale; regenerate it`);
  }
  if (failures.length > 0) {
    console.error("generate-rcap-packet-family-product-readiness --check FAILED:");
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }
  console.log(`packet-family product readiness is current: ${productReady.length}/${families.length} families product-ready.`);
} else {
  fs.mkdirSync(path.dirname(path.join(rootDir, OUT_JSON)), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(rootDir, OUT_DOC)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, OUT_JSON), serialized);
  fs.writeFileSync(path.join(rootDir, OUT_DOC), doc);
  console.log(`wrote ${OUT_JSON} and ${OUT_DOC}: ${productReady.length}/${families.length} families product-ready.`);
}
