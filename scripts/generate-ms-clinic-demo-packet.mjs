#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPECIFICATION_FILE = "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
const EVIDENCE_FILE = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json";
const WIRING_FILE = "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/product-wiring.json";
const ARTIFACT_DIRECTORY = "data/rcap-ledger/grade-a/artifacts";
const variants = [
  {
    fixture: "canonical",
    source: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.fixture.json",
    file: `${ARTIFACT_DIRECTORY}/ms-nonconviction-clinic-demo-canonical.pdf`
  },
  {
    fixture: "boundary",
    source: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.boundary.fixture.json",
    file: `${ARTIFACT_DIRECTORY}/ms-nonconviction-clinic-demo-boundary.pdf`
  }
];

const absolute = (relative) => path.join(ROOT, relative);
const readJson = (relative) => JSON.parse(fs.readFileSync(absolute(relative), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const specificationBytes = fs.readFileSync(absolute(SPECIFICATION_FILE));
const specification = JSON.parse(specificationBytes);
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");

fs.mkdirSync(absolute(ARTIFACT_DIRECTORY), { recursive: true });
const artifacts = [];
for (const variant of variants) {
  const matter = readJson(variant.source);
  const packet = composeGradeAPacket(specification, matter);
  if (/\{\{[a-z0-9_]+\}\}/.test(JSON.stringify(packet))) {
    throw new Error(`${variant.fixture} contains an unresolved template fact`);
  }
  const bytes = await renderGradeAPacketPdf(packet);
  const repeat = await renderGradeAPacketPdf(composeGradeAPacket(specification, matter));
  if (!bytes.equals(repeat)) throw new Error(`${variant.fixture} is not byte deterministic`);
  const parsed = await PDFDocument.load(bytes);
  fs.writeFileSync(absolute(variant.file), bytes);
  artifacts.push({
    fixture: variant.fixture,
    fixtureFile: variant.source,
    file: variant.file,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: parsed.getPageCount(),
    documentCount: packet.documents.length,
    verificationHash: matter.verificationHash
  });
}

const evidence = {
  schemaVersion: "rcap-grade-a-ms-clinic-demo-artifacts/v1",
  generatedBy: "scripts/generate-ms-clinic-demo-packet.mjs",
  generatedOn: "2026-09-03",
  routeKey: specification.routeKey,
  packetFamily: specification.packetFamily,
  specificationPath: SPECIFICATION_FILE,
  specificationSha256: sha256(specificationBytes),
  renderer: "rcap_grade_a_document_v1@1.0.0",
  contentType: "application/pdf",
  deterministic: true,
  artifacts
};
fs.writeFileSync(absolute(EVIDENCE_FILE), `${JSON.stringify(evidence, null, 2)}\n`);
const canonical = artifacts.find((artifact) => artifact.fixture === "canonical");
const boundary = artifacts.find((artifact) => artifact.fixture === "boundary");
const wiring = {
  schemaVersion: "rcap-census-v1-product-wiring/v1",
  family: specification.packetFamily,
  routeKey: specification.routeKey,
  routeKeys: [specification.routeKey],
  workType: "GRADE_A_PRODUCT_WIRING",
  status: "INSTALLED_HELD_FOR_NAMED_COUNSEL_APPROVAL",
  authorityCreated: "held_grade_a_fulfillment_record",
  generatedBy: "scripts/generate-ms-clinic-demo-packet.mjs",
  derivedFrom: EVIDENCE_FILE,
  explicitNonGrants: [
    "This record authorizes deterministic build and controlled review only.",
    "It opens no consumer sale and grants no production deployment.",
    "Sponsored delivery remains closed until named Mississippi counsel approves these exact artifact hashes."
  ],
  currentState: {
    serviceDisposition: "exact_runtime_route_and_grade_a_specification_installed",
    commercialState: "HELD_PENDING_INDEPENDENT_REVIEW_AND_NAMED_COUNSEL_APPROVAL",
    existingArtifactIds: artifacts.map((artifact) => artifact.sha256),
    generationAllowed: false
  },
  proposedRepresentation: {
    note: "The exact five-document packet is built and machine-verifiable. Delivery authority remains held.",
    packetSetId: specification.packetSetId,
    outputStrategy: "custom_pleading",
    components: specification.documents.map((document) => ({
      documentId: document.documentId,
      role: document.role,
      order: document.order,
      requirement: document.requirement,
      manifestComponentIds: document.manifestComponentIds
        ?? (document.manifestComponentId ? [document.manifestComponentId] : [])
    }))
  },
  binding: {
    family: specification.packetFamily,
    jurisdiction: specification.jurisdiction,
    routeKeys: [specification.routeKey],
    deliveryType: "custom_pleading",
    packetSpecification: SPECIFICATION_FILE,
    packetSpecificationSha256: evidence.specificationSha256,
    artifactEvidence: EVIDENCE_FILE,
    artifacts: { canonical, boundary },
    fieldMap: "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/production-field-map.json",
    instructions: "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/participant-instructions.md",
    rasterReview: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.raster-review.json",
    independentReview: { status: "pending_independent_second_pass", obligations: 15 },
    counselReview: { status: "pending_named_mississippi_counsel", approvedArtifactHashes: [] },
    paymentEligible: false,
    sponsorshipEligible: false,
    whyPaymentIsClosed: "Consumer launch is outside the clinic demo and named counsel has not approved these exact artifact hashes.",
    whySponsorshipIsClosed: "The packet is built for review, but sponsored generation stays held until the independent second pass and named counsel approval are recorded.",
    maintenanceRelationship: {
      rebuiltFrom: "scripts/generate-ms-clinic-demo-packet.mjs",
      reRasterRequiredWhen: "either artifact hash changes",
      reVerificationRequiredWhen: "the route, specification, facts, renderer, or artifact bytes change"
    }
  }
};
fs.writeFileSync(absolute(WIRING_FILE), `${JSON.stringify(wiring, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
