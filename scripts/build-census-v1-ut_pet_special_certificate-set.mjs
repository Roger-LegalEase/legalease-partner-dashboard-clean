#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runUtahCompletenessRepair } from "./build-census-v1-ut_pet_acquittal-set.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
export const FAMILY_ID = "ut_pet_special_certificate-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill";
const TRACK_ID = "ut_pet_special_certificate";
const MASTER_REL = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const READINESS = "data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/ut-special-certificate-build-readiness.json";

export const COMPONENTS = Object.freeze([
  ["ut_pet_special_certificate-bci-certificate-application-1", "UT-BCI-EXP-APPLICATION", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/04_SUPPORTING_PROCESS/UT__SUPPORT__UT-BCI-EXP-APPLICATION__bci-application-for-certificate-of-eligibility-for-expungement__REV-UNKNOWN__EN.pdf", "required"],
  ["ut_pet_special_certificate-bci-third-party-release-2", "UT-BCI-THIRD-PARTY-RELEASE", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/04_SUPPORTING_PROCESS/UT__SUPPORT__UT-BCI-THIRD-PARTY-RELEASE__bci-third-party-release-form__REV-UNKNOWN__EN.pdf", "conditional"],
  ["ut_pet_special_certificate-civil-cover-sheet-3", "1044XX", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/02_PACKET_FORMS/UT__FORM__1044XX__district-court-cover-sheet-for-civil-actions__REV-2026-05-06__EN.pdf", "required"],
  ["ut_pet_special_certificate-petition-4", "1001EX", "reference/chat-parallel-2026-09-07/chat6/ut-special/1001EX-Revised-2023-04-10.pdf", "required"],
  ["ut_pet_special_certificate-proposed-order-5", "1021EX", "reference/chat-parallel-2026-09-07/chat6/ut-special/1021EX-Revised-2025-04-14.pdf", "required"],
  ["ut_pet_special_certificate-acceptance-of-service-6", "1146XX", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1146XX__acceptance-of-service-expungement__REV-2019-05-01__EN.pdf", "required"],
  ["ut_pet_special_certificate-consent-and-waiver-of-hearing-7", "1148XX", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1148XX__consent-and-waiver-of-hearing-expungement__REV-2019-05-01__EN.pdf", "required"],
  ["ut_pet_special_certificate-victim-notice-form-8", "1149XX", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1149XX__victim-s-or-prosecutor-s-statement__REV-2019-05-01__EN.pdf", "conditional"],
  ["ut_pet_special_certificate-reply-to-prosecutor-or-victim-statement-9", "1169XX", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1169XX__reply-to-victim-s-statement-prosecutor-s-statement-or-ap-p-response__REV-2010-07-16__EN.pdf", "conditional"],
  ["ut_pet_special_certificate-filing-and-timing-instructions-10", null, null, "required"]
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (rel, value) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};

const EXPECTED = Object.freeze(Object.fromEntries(readJson(READINESS).sourceFiles
  .map((row) => [row.path, { sha256: row.sha256, byteLength: row.byteLength }])));

export function resolveExactSources(root = ROOT) {
  return COMPONENTS.filter(([, formNumber, sourcePath]) => formNumber && sourcePath)
    .map(([componentId, formNumber, sourcePath, requirement]) => {
      const bytes = fs.readFileSync(path.join(root, sourcePath));
      const expected = EXPECTED[sourcePath];
      assert.ok(expected, `${componentId}: exact readiness pin is absent`);
      assert.equal(sha256(bytes), expected.sha256, `${componentId}: source SHA-256 drift`);
      assert.equal(bytes.length, expected.byteLength, `${componentId}: source byte-length drift`);
      return { componentId, formNumber, path: sourcePath, requirement,
        sha256: expected.sha256, byteLength: expected.byteLength, sha256Exact: true };
    });
}

export function specialCertificateStageGate({ certificate, episodeId, expectedDocumentSha256, asOf = new Date() }) {
  const now = new Date(asOf);
  if (Number.isNaN(now.valueOf())) return { status: "REFUSE", reason: "INVALID_AS_OF" };
  if (!certificate || typeof certificate !== "object") return { status: "REFUSE", reason: "SPECIAL_CERTIFICATE_REQUIRED" };
  if (certificate.type !== "UT_BCI_SPECIAL_CERTIFICATE") return { status: "REFUSE", reason: "WRONG_CERTIFICATE_TYPE" };
  if (certificate.familyId !== FAMILY_ID) return { status: "REFUSE", reason: "WRONG_CERTIFICATE_FAMILY" };
  if ((episodeId || certificate.episodeId) && (!episodeId || !certificate.episodeId)) return { status: "REFUSE", reason: "CERTIFICATE_EPISODE_REQUIRED" };
  if (episodeId && certificate.episodeId !== episodeId) return { status: "REFUSE", reason: "WRONG_CERTIFICATE_EPISODE" };
  if (!/^[0-9a-f]{64}$/.test(certificate.documentSha256 ?? "")) return { status: "REFUSE", reason: "CERTIFICATE_IDENTITY_PROOF_REQUIRED" };
  if (expectedDocumentSha256 !== undefined && !/^[0-9a-f]{64}$/.test(expectedDocumentSha256)) return { status: "REFUSE", reason: "EXPECTED_CERTIFICATE_IDENTITY_REQUIRED" };
  if (expectedDocumentSha256 && certificate.documentSha256 !== expectedDocumentSha256) return { status: "REFUSE", reason: "CERTIFICATE_IDENTITY_MISMATCH" };
  const issued = new Date(certificate.issuedAt);
  const expires = new Date(certificate.expiresAt);
  if (!certificate.issuedAt || !certificate.expiresAt || Number.isNaN(issued.valueOf()) || Number.isNaN(expires.valueOf())) return { status: "REFUSE", reason: "CERTIFICATE_DATES_REQUIRED" };
  if (issued > now) return { status: "REFUSE", reason: "CERTIFICATE_ISSUED_IN_FUTURE" };
  if (expires <= now) return { status: "REFUSE", reason: "SPECIAL_CERTIFICATE_EXPIRED" };
  const life = expires - issued;
  if (life <= 0 || life > 180 * 86400000) return { status: "REFUSE", reason: "SPECIAL_CERTIFICATE_VALIDITY_EXCEEDS_180_DAYS" };
  return { status: "ALLOW_STAGE_2", reason: "VALID_SPECIAL_CERTIFICATE", episodeId, expiresAt: certificate.expiresAt };
}

function hostPathFor(sourcePath) {
  const prefix = `${MASTER_REL}/`;
  if (sourcePath.startsWith(prefix)) return sourcePath.slice(prefix.length);
  return path.relative(path.join(ROOT, MASTER_REL), path.join(ROOT, sourcePath)).split(path.sep).join("/");
}

function validateMeasuredCensus(sources) {
  const census = readJson(`${OUT_REL}/field-census.census-v1.json`);
  assert.equal(census.familyId, FAMILY_ID);
  assert.equal(census.censusBasis, "first_hand_inspection_of_each_exact_hash_bound_source");
  assert.equal(census.documents.length, 9, "all nine source-backed components require a native census");
  for (const source of sources) {
    const document = census.documents.find((row) => row.formNumber === source.formNumber);
    assert.ok(document, `${source.formNumber}: census document absent`);
    assert.equal(document.sourceSha256, source.sha256, `${source.formNumber}: census/source identity mismatch`);
    assert.ok(document.fieldCount > 0 && document.fields.length > 0, `${source.formNumber}: empty source census`);
    assert.ok(document.fields.every((field) => field.blankId || field.selectionId), `${source.formNumber}: incomplete census row`);
  }
  return census;
}

function seedNativeMap(census, track) {
  const roleByForm = new Map(track.packetSet.components.filter((row) => row.officialFormId)
    .map((row) => [row.officialFormId, row]));
  return {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: ["obligation:track-only:UT:ut_pet_special_certificate"],
    routeSelectionId: "ut-special-certificate-bci-plus-court",
    maps: census.documents.map((document) => {
      const component = roleByForm.get(document.formNumber);
      assert.ok(component, `${document.formNumber}: no registry component`);
      const noFill = ["1146XX", "1148XX", "1149XX", "UT-BCI-THIRD-PARTY-RELEASE"].includes(document.formNumber);
      return {
        formNumber: document.formNumber, componentId: component.componentId,
        componentRequirement: component.requirement, componentCondition: component.conditionDescription ?? null,
        documentPolicy: {
          mode: noFill ? "actor_or_condition_protected" : document.formNumber === "1021EX" ? "caption_only" : "participant",
          captionOnly: document.formNumber === "1021EX", documentAcceptsFill: !noFill,
          routeKey: "obligation:track-only:UT:ut_pet_special_certificate"
        },
        structuralClass: document.structuralClass,
        canonicalWrites: [], canonicalRefusals: [], roleRefusals: [], boundaryWrites: [], boundaryRefusals: [],
        selectionControls: structuredClone(document.selectionControls ?? [])
      };
    }),
    sourceFieldCensus: Object.fromEntries(census.documents.map((document) => [document.formNumber, {
      sourceSha256: document.sourceSha256, fieldCount: document.fieldCount,
      selectionControlCount: document.selectionControlCount, measured: true
    }]))
  };
}

export async function buildUtahSpecialCertificate({ noRaster = true, check = false } = {}) {
  assert.equal(noRaster, true, "local raster is forbidden for this family");
  process.chdir(ROOT);
  process.env.RCAP_NO_LOCAL_RASTER = "1";
  process.env.MASTER_LIBRARY_SOURCE_DIR ??= path.join(ROOT, MASTER_REL);
  const sources = resolveExactSources();
  const registry = readJson("data/record-clearing/legal-design-track-registry.json");
  const track = (registry.tracks ?? []).find((row) => row.trackId === TRACK_ID);
  assert.equal(track?.packetSet?.packetSetId, FAMILY_ID);
  assert.equal(track.packetSet.components.length, 10);
  const components = track.packetSet.components.map((component) => ({ ...component,
    sourceBound: component.officialFormId ? sources.some((source) => source.formNumber === component.officialFormId) : false,
    guidanceBound: component.outputStrategy === "process_guidance" }));
  assert.equal(components.filter((row) => row.sourceBound).length, 9);
  assert.equal(components.filter((row) => row.guidanceBound).length, 1);
  const census = validateMeasuredCensus(sources);
  const documents = sources.map((source) => ({
    componentId: source.componentId, formNumber: source.formNumber, pathInArchive: hostPathFor(source.path),
    sourcePath: source.path, sha256: source.sha256, byteLength: source.byteLength,
    requirement: source.requirement, sourceHashesExact: true
  }));
  for (const document of documents) {
    const bytes = fs.readFileSync(path.join(process.env.MASTER_LIBRARY_SOURCE_DIR, document.pathInArchive));
    assert.equal(sha256(bytes), document.sha256, `${document.formNumber}: host path resolves to different bytes`);
  }
  writeJson(`${OUT_REL}/source-receipt.json`, {
    schemaVersion: "rcap-source-receipt/v1-native-utah-completeness", familyId: FAMILY_ID,
    sources, documents, sourceHashesExact: true,
    component10: {
      componentId: "ut_pet_special_certificate-filing-and-timing-instructions-10", outputStrategy: "process_guidance",
      sources: ["data/record-clearing/legal-design-track-registry.json", "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/UT/01_LEGAL_REVIEW/UT__LEGAL-REVIEW__STATEWIDE__utah-record-clearing-legal-review__ASOF-2026-08-01__EN.md"],
      officialPdf: null, fakeHash: false
    }
  });
  writeJson(`${OUT_REL}/packet-set-manifest.json`, {
    schemaVersion: "rcap-packet-set-manifest/v2-native-utah-completeness", familyId: FAMILY_ID,
    trackId: TRACK_ID, components, sourceBackedComponentCount: 9, guidanceComponentCount: 1,
    stageContract: {
      stage1: "BCI application and recorded conditional third-party release",
      stage2Gate: "same-episode, exact-identity, unexpired Utah BCI special certificate with validity no longer than 180 days",
      stage2: "1001EX/1021EX court packet filed in the court that decided the case",
      participantService: false,
      conditionalVictimStatement: "victim exists and prosecutor requests 1149XX",
      conditionalReply: "actual statement received and participant elects 1169XX within 14 days"
    }
  });
  writeJson(`${OUT_REL}/production-field-map.json`, seedNativeMap(census, track));
  await runUtahCompletenessRepair(FAMILY_ID, check ? ["--check"] : []);
  return { familyId: FAMILY_ID, sourceCount: 9, componentCount: 10,
    noLocalRaster: true, status: "BUILT_REVIEW_PENDING" };
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(thisFile)) {
  const check = process.argv.includes("--check");
  const unsupported = process.argv.slice(2).filter((arg) => arg !== "--check");
  assert.deepEqual(unsupported, [], `unsupported option(s): ${unsupported.join(", ")}`);
  console.log(JSON.stringify(await buildUtahSpecialCertificate({ check })));
}
