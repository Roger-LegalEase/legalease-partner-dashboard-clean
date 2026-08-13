#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_COMMIT = "72915c18009e44c33851d0d719c5840cf65b27aa";
const CONSOLIDATED_REVIEW_COMMIT = "546bf49f732e5dd3e128499e1e2fd2eaf2973806";
const FITTER_REVIEW_COMMIT = "8466600ac642f9692f6aa5cd8160ac2e7bb0a0a1";
const RELATIONSHIP_COMMIT = "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: scriptDir,
  encoding: "utf8"
}).trim();
const dataDir = join(repoRoot, "data/rcap-codex/d-v5-fallback-treatments");
const candidatePath = join(dataDir, "fallback-treatments.json");
const jobsPath = join(dataDir, "review-jobs.json");
const verificationPath = join(dataDir, "verification-result.json");
const checkMode = process.argv.includes("--check");

const SEED_FAMILIES = [
  "MO:cr145-form-petition-en",
  "NH:nhjb-2956-support-record-request-en",
  "VA:cc-1203-form-en",
  "VT:200-00631-form-en",
  "WA:blake-006-form-en",
  "WA:blake-008-form-en",
  "WA:crrlj-09-0100-form-en",
  "WA:crrlj-09-0870-form-en"
];

const ACTIVE_TRIGGER_FAMILIES = new Set([
  "NH:nhjb-2956-support-record-request-en",
  "WA:crrlj-09-0100-form-en"
]);

const EXPECTED_FAMILY_CLASSIFICATION = new Map([
  ["MO:cr145-form-petition-en", "optional_or_supporting"],
  ["NH:nhjb-2956-support-record-request-en", "active_required"],
  ["VA:cc-1203-form-en", "relationship_unresolved"],
  ["VT:200-00631-form-en", "relationship_unresolved"],
  ["WA:blake-006-form-en", "relationship_unresolved"],
  ["WA:blake-008-form-en", "relationship_unresolved"],
  ["WA:crrlj-09-0100-form-en", "active_required"],
  ["WA:crrlj-09-0870-form-en", "optional_or_supporting"]
]);

const FAMILY_DOCUMENT_IDS = new Map([
  ["MO:cr145-form-petition-en", "CR145"],
  ["NH:nhjb-2956-support-record-request-en", "NHJB-2956"],
  ["VA:cc-1203-form-en", "CC-1203"],
  ["VT:200-00631-form-en", "200-00631"],
  ["WA:blake-006-form-en", "BLAKE-006"],
  ["WA:blake-008-form-en", "BLAKE-008"],
  ["WA:crrlj-09-0100-form-en", "CrRLJ-09.0100"],
  ["WA:crrlj-09-0870-form-en", "CrRLJ-09.0870"]
]);

const TRACK_IDS = [
  "nh_conviction_streamlined",
  "nh_petition_nonconviction_pre2019",
  "nh_petition_vacated",
  "wa_vac_homicide_victim_prostitution",
  "wa_vac_misdemeanor_ordinary",
  "wa_vac_substance_use_disorder"
];

const CURRENT_HASHES = {
  adoption: "2765071a048f571054337c291ba0ba5ea4a66ad91bc723f084dea5fbeae3ed36",
  briefcase: "aced1f2841956c7c1645424c2efbc216b11d1ac0f6642b029a69cc4f5fdd8908",
  briefcasePage: "f23ad34ebeab999af53e2f9518bf942b1e5d14f14c857e55ce25faa7b50dba1b",
  dMap: "a93b742e5d348be55d68861f11e292cc0744b70266ca70ee8129852e21fe1f52",
  finalHandoff: "c62451684cd910114e1709352d3017a7e7084ad7c96062239d1d2205891f94b3",
  finalIntegration: "7e17b944dbd3c31f97ad48a4cb7ce49110ab473108444e942b106071ade399ff",
  guidanceRegistry: "5bd1ed3acb4b6765e029ac55915e8783bfa1a8ff0de3f8027209ca41f1c08bcd",
  guidanceSchema: "5f8dffc055223a5732bc4f18d50e1a2aa9e014656eca7ba546aa2995d3edef86",
  jobContract: "9478e0a1140bfbf9c30a734d9f1e5390f4b1089eb5700c0bd4d7d23e8b47d3a9",
  participantContract: "b4e8ee7ef29bece1c3268f89ec2bee7e0ea6b5d27abc5209f4010fb94b0ded89",
  paymentAdapter: "8450a4a0db6decee1158992828aa48e1e98005786523c45a93e4438e94c6cb4f",
  queue: "a953681200c644a2b747e7b10cdf4579017cac2a7fbad08d5e147e8439182ad3",
  routeResolver: "b70589747d19949ae928ffb2e4ad62a3e8a35c1f43feca683b7c83efc0cbf898",
  saveResultPolicy: "d4c303ba75b5089f6c4670db6c2abf8d285bbd89636f4702025639d6d7429ff0",
  saveResultRoute: "d0258eaeddcc747e09770f46b7feca4c68739261077d75bfb5a12d85f8680f9f",
  trackPathwayCrosswalk: "1cd79510927d1a128f1b9034cc9d1116f47a36ae6bb41f970f7fccb82f23a13e"
};

const GIT_HASHES = {
  consolidatedReview: "e95c4c13c61d19b64681d98a6d53913985ef45c0f86edcf408f364ede5c42fbc",
  fitterReview: "f3de3f40b948103e4e3d81a0f71b224504b08c66dd6f517f2aed9f4840f6cd52",
  legalRegistry: "9d37ca7c654d71e6583950ed7cf3c32387f7f275b8f35cd46729a157ceea4ae9",
  legalWaMemo: "8f43ce3e1b28cb4f4848f9e3705a5d151e02015685df3cb8be6e16463f0d3bb7",
  relationships: "8376337488a0e07eb0b476f7623bfbb623272d167ecd15b23c93cbb47922b826",
  sourceMo: "e991c29e4ee16e1e97d4cfe42359781cfb16cdf8db6e2daae2b04130eab60e6b",
  sourceNh: "e1d3b4ff3b3d2004f3e74a491c50497d11e02da2fbf42ac335a74f3ea70361b0",
  sourceVa: "8b6e3f44dc8d7788af412e0c92629d62d21b41e9bdd3db11e00742610f6c009b",
  sourceVt: "b0e7a4886af0810d851f8fcc2ee23a06091cb31d179d3e3fb8c99c255551b037",
  sourceWa006: "ef9f826d8168b72ed803f56dc2e94631fd3ad8c53b81e27a56d20c7dc401781c",
  sourceWa008: "4b1c5d79169373266854dd8977484b2dae572d2accc3455fdaef9290f9ad95bb",
  sourceWa0100: "409354bbfa1d5454b70244a2e036587c1cce095b7e3453e42c1169bde92684c7",
  sourceWa0870: "70bf626dc121402d3cce0b9eb5e840e8af18944c81ec8bce0d23f6c9b790280b"
};

const SOURCE_SPECS = [
  ["source-mo-cr145", "MO:cr145-form-petition-en", "CR145", "26cd37a46192c19f6d6b1fb08968f1b6a2487d39", "data/rcap-all50/overlays/production/missouri/cr145-form-petition-en/source-record.json", GIT_HASHES.sourceMo],
  ["source-nh-nhjb-2956", "NH:nhjb-2956-support-record-request-en", "NHJB-2956", "6fea79cd0288b685d6e6e061b78952d88a508a61", "data/rcap-all50/overlays/production/new-hampshire/nhjb-2956-support-record-request-en/source-record.json", GIT_HASHES.sourceNh],
  ["source-va-cc-1203", "VA:cc-1203-form-en", "CC-1203", "f23bcfbeb64e3ae9f6d4a1c7a471effc001e8644", "data/rcap-all50/overlays/production/virginia/cc-1203-form-en/source-record.json", GIT_HASHES.sourceVa],
  ["source-vt-200-00631", "VT:200-00631-form-en", "200-00631", "f23bcfbeb64e3ae9f6d4a1c7a471effc001e8644", "data/rcap-all50/overlays/production/vermont/200-00631-form-en/source-record.json", GIT_HASHES.sourceVt],
  ["source-wa-blake-006", "WA:blake-006-form-en", "BLAKE-006", "e2c9576171e7a00b3bb42ee5e7d7557adbb73aac", "data/rcap-all50/overlays/production/washington/blake-006-form-en/source-record.json", GIT_HASHES.sourceWa006],
  ["source-wa-blake-008", "WA:blake-008-form-en", "BLAKE-008", "e2c9576171e7a00b3bb42ee5e7d7557adbb73aac", "data/rcap-all50/overlays/production/washington/blake-008-form-en/source-record.json", GIT_HASHES.sourceWa008],
  ["source-wa-crrlj-09-0100", "WA:crrlj-09-0100-form-en", "CrRLJ-09.0100", "e2c9576171e7a00b3bb42ee5e7d7557adbb73aac", "data/rcap-all50/overlays/production/washington/crrlj-09-0100-form-en/source-record.json", GIT_HASHES.sourceWa0100],
  ["source-wa-crrlj-09-0870", "WA:crrlj-09-0870-form-en", "CrRLJ-09.0870", "e2c9576171e7a00b3bb42ee5e7d7557adbb73aac", "data/rcap-all50/overlays/production/washington/crrlj-09-0870-form-en/source-record.json", GIT_HASHES.sourceWa0870]
];

const SOURCE_SPEC_BY_FAMILY = new Map(SOURCE_SPECS.map((spec) => [spec[1], spec]));

const NON_FAMILY_COMPONENT_CLAIM_SUFFIXES = new Map([
  ["nh_conviction_streamlined-sentence-completion-proof-2", ["gather_3"]],
  ["nh_conviction_streamlined-post-filing-instructions-6", ["next_action", "do_not_1"]],
  ["nh_conviction_streamlined-effect-and-limits-disclosure-7", ["do_not_2", "do_not_3", "escalation"]],
  ["nh_petition_nonconviction_pre2019-post-filing-instructions-5", ["next_action", "do_not_1"]],
  ["nh_petition_nonconviction_pre2019-effect-and-limits-disclosure-6", ["do_not_2", "do_not_3", "escalation"]],
  ["nh_petition_vacated-post-filing-instructions-5", ["next_action", "do_not_1"]],
  ["nh_petition_vacated-effect-and-limits-disclosure-6", ["do_not_2", "do_not_3", "escalation"]],
  ["wa_vac_homicide_victim_prostitution-filing-instructions-3", ["official_destination", "next_action", "do_not_1", "do_not_3"]],
  ["wa_vac_misdemeanor_ordinary-records-checklist-4", ["gather_1", "gather_2"]],
  ["wa_vac_misdemeanor_ordinary-filing-instructions-3", ["official_destination", "next_action", "do_not_1", "do_not_3"]],
  ["wa_vac_substance_use_disorder-program-documentation-request-3", ["supporting_destination_2", "gather_3", "next_action"]],
  ["wa_vac_substance_use_disorder-records-checklist-4", ["gather_1", "gather_2", "gather_3"]],
  ["wa_vac_substance_use_disorder-filing-instructions-5", ["official_destination", "next_action", "do_not_1", "do_not_3"]]
]);

const OFFICIAL_RESOURCES = {
  nh_conviction_streamlined: [
    ["New Hampshire Judicial Branch NHJB-3057-DSe reference copy", "https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-04/nhjb-3057-dse.pdf", "This is the court-hosted NHJB-3057-DSe reference. Ask the disposing-court clerk to confirm that it is the current material for your case before using it.", "Esta es la copia de referencia NHJB-3057-DSe alojada por el tribunal. Pida a la secretaría del tribunal que resolvió el caso que confirme que es el material vigente para su caso antes de usarla."],
    ["New Hampshire Judicial Branch NHJB-2956 unconfirmed-revision reference copy", "https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-05/nhjb-2956-fpe-criminalrecordreleaseauth.pdf", "This is the court-hosted NHJB-2956 reference whose revision is not confirmed. Ask the State Police Criminal Records Unit or the court clerk for the current authorization before using it.", "Esta es la copia de referencia NHJB-2956 alojada por el tribunal cuya revisión no se ha confirmado. Pida a la Unidad de Antecedentes Penales de la Policía Estatal o a la secretaría del tribunal la autorización vigente antes de usarla.", ["source-nh-nhjb-2956"]]
  ],
  nh_petition_nonconviction_pre2019: [
    ["New Hampshire Judicial Branch NHJB-2317-DSe reference copy", "https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-04/nhjb-2317-dse.pdf", "This is the court-hosted NHJB-2317-DSe reference. Ask the disposing-court clerk to confirm the current materials and seek qualified legal help if it remains unclear whether a petition is required.", "Esta es la copia de referencia NHJB-2317-DSe alojada por el tribunal. Pida a la secretaría del tribunal que resolvió el cargo que confirme los materiales vigentes y busque ayuda legal calificada si sigue sin estar claro si se requiere una petición."],
    ["New Hampshire Judicial Branch NHJB-2956 unconfirmed-revision reference copy", "https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-05/nhjb-2956-fpe-criminalrecordreleaseauth.pdf", "This is the court-hosted NHJB-2956 reference whose revision is not confirmed. Ask the State Police Criminal Records Unit or the court clerk for the current authorization before using it.", "Esta es la copia de referencia NHJB-2956 alojada por el tribunal cuya revisión no se ha confirmado. Pida a la Unidad de Antecedentes Penales de la Policía Estatal o a la secretaría del tribunal la autorización vigente antes de usarla.", ["source-nh-nhjb-2956"]]
  ],
  nh_petition_vacated: [
    ["New Hampshire Judicial Branch NHJB-2317-DSe reference copy", "https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-04/nhjb-2317-dse.pdf", "This is the court-hosted NHJB-2317-DSe reference. Ask the issuing-court clerk which current material applies to the vacatur order before using it.", "Esta es la copia de referencia NHJB-2317-DSe alojada por el tribunal. Pregunte a la secretaría del tribunal emisor qué material vigente corresponde a la orden de anulación antes de usarla."],
    ["New Hampshire Judicial Branch NHJB-2956 unconfirmed-revision reference copy", "https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-05/nhjb-2956-fpe-criminalrecordreleaseauth.pdf", "This is the court-hosted NHJB-2956 reference whose revision is not confirmed. Ask the State Police Criminal Records Unit or the court clerk for the current authorization before using it.", "Esta es la copia de referencia NHJB-2956 alojada por el tribunal cuya revisión no se ha confirmado. Pida a la Unidad de Antecedentes Penales de la Policía Estatal o a la secretaría del tribunal la autorización vigente antes de usarla.", ["source-nh-nhjb-2956"]]
  ],
  wa_vac_homicide_victim_prostitution: [
    ["Washington Courts official vacating-and-sealing forms page", "https://www.courts.wa.gov/forms/?fa=forms.contribute&formID=38", "Use the official Washington Courts forms page to locate current materials, then ask the sentencing-court clerk which subsection-(7) materials and local requirements apply.", "Use la página oficial de formularios de Washington Courts para localizar los materiales vigentes y luego pregunte a la secretaría del tribunal sentenciador qué materiales del apartado (7) y qué requisitos locales corresponden."]
  ],
  wa_vac_misdemeanor_ordinary: [
    ["Washington Courts official vacating-and-sealing forms page", "https://www.courts.wa.gov/forms/?fa=forms.contribute&formID=38", "Use the official Washington Courts forms page to locate current materials, then ask the sentencing-court clerk which forms and local requirements apply.", "Use la página oficial de formularios de Washington Courts para localizar los materiales vigentes y luego pregunte a la secretaría del tribunal sentenciador qué formularios y requisitos locales corresponden."],
    ["Washington State Patrol official criminal-history page", "https://wsp.wa.gov/crime/criminal-history/", "Use the Washington State Patrol's official page to obtain the criminal-history record.", "Use la página oficial de la Patrulla Estatal de Washington para obtener los antecedentes penales.", ["legal-wa_vac_misdemeanor_ordinary"]]
  ],
  wa_vac_substance_use_disorder: [
    ["Washington Courts official vacating-and-sealing forms page", "https://www.courts.wa.gov/forms/?fa=forms.contribute&formID=38", "Use the official Washington Courts forms page to locate current materials, then ask the sentencing-court clerk which subsection-(6) materials and local requirements apply.", "Use la página oficial de formularios de Washington Courts para localizar los materiales vigentes y luego pregunte a la secretaría del tribunal sentenciador qué materiales del apartado (6) y qué requisitos locales corresponden."],
    ["Washington State Patrol official criminal-history page", "https://wsp.wa.gov/crime/criminal-history/", "Use the Washington State Patrol's official page to obtain the criminal-history record.", "Use la página oficial de la Patrulla Estatal de Washington para obtener los antecedentes penales.", ["legal-wa_vac_misdemeanor_ordinary"]]
  ]
};

const PARTICIPANT_FORBIDDEN_PHRASES = [
  "approval", "blocker", "checkout", "committed design", "component", "exact deferral", "family remains",
  "field-disposition", "independent review", "lane", "packet credit", "partner credit", "production packet",
  "registry", "render job", "runtime", "sellable", "technical review", "track matched", "for this track",
  "aprobación", "componente", "registro de diseño", "renderizado", "revisión técnica"
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function serialize(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function readCurrent(path) {
  return readFileSync(join(repoRoot, path));
}

function readGit(commit, path) {
  return execFileSync("git", ["show", `${commit}:${path}`], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
}

function parseCurrent(path) {
  return JSON.parse(readCurrent(path).toString("utf8"));
}

function parseGit(commit, path) {
  return JSON.parse(readGit(commit, path).toString("utf8"));
}

const dMap = parseCurrent("data/rcap-codex/d-track-terminalization/track-family-map.json");
const queue = parseCurrent("data/rcap-all50/review-artifacts/d-track-queue.json");
const adoption = parseCurrent("data/rcap-codex/d-adoption-continuity/track-adoption.json");
const finalFamilyHandoff = parseCurrent("docs/record-clearing/d-wave/v3/family-handoff.json");
const relationships = parseGit(RELATIONSHIP_COMMIT, "data/record-clearing/legal-design-track-source-relationships.json");
const legalRegistry = parseGit(RELATIONSHIP_COMMIT, "data/record-clearing/legal-design-track-registry.json");

function currentCarrier(id, path, hash, supports, locator = null) {
  return {
    id,
    kind: "current_path",
    commit: BASE_COMMIT,
    path,
    sha256: hash,
    supports,
    ...(locator ? { locator } : {})
  };
}

function gitCarrier(id, commit, path, hash, supports, locator = null) {
  return {
    id,
    kind: "git_object",
    commit,
    path,
    sha256: hash,
    supports,
    ...(locator ? { locator } : {})
  };
}

function arrayMatch(collection, conditions) {
  return { type: "json_array_match", collection, conditions };
}

function objectMatch(conditions) {
  return { type: "json_object_match", conditions };
}

function textContains(value) {
  return { type: "text_contains", value };
}

function buildEvidenceCarriers() {
  const carriers = [
    currentCarrier("d-map-67", "data/rcap-codex/d-track-terminalization/track-family-map.json", CURRENT_HASHES.dMap, ["relationship", "component_accounting"]),
    currentCarrier("d-track-queue", "data/rcap-all50/review-artifacts/d-track-queue.json", CURRENT_HASHES.queue, ["relationship", "commerce", "runtime_state"]),
    currentCarrier("final-253-family-handoff", "docs/record-clearing/d-wave/v3/family-handoff.json", CURRENT_HASHES.finalHandoff, ["family_disposition", "component_accounting"]),
    currentCarrier("final-d-handoff-integration", "docs/rcap/review/d/final-handoff-integration.md", CURRENT_HASHES.finalIntegration, ["relationship", "scope"], textContains("MO:cr145-form-petition-en")),
    currentCarrier("participant-deferral-contract", "docs/record-clearing/terminalize-c/c-dependency-deferral-contract.md", CURRENT_HASHES.participantContract, ["operational", "participant_standard"]),
    currentCarrier("guidance-schema", "data/rcap-all50/guidance-packets/_schema.json", CURRENT_HASHES.guidanceSchema, ["operational", "participant_standard"]),
    currentCarrier("guidance-packet-registry", "src/lib/rcap/documents/guidance-packet-registry.ts", CURRENT_HASHES.guidanceRegistry, ["operational", "runtime_gap"], textContains('const PACKET_DIR = "data/rcap-all50/guidance-packets"')),
    currentCarrier("route-resolver", "src/lib/rcap/documents/packet-route-resolver.ts", CURRENT_HASHES.routeResolver, ["operational", "runtime_state"], textContains('rendererKind: "none"')),
    currentCarrier("render-job-contract", "src/lib/rcap/render/job-contract.ts", CURRENT_HASHES.jobContract, ["operational", "runtime_state"], textContains("return { spec: null, route }")),
    currentCarrier("briefcase-runtime", "src/lib/expungement-ai/briefcase.ts", CURRENT_HASHES.briefcase, ["operational", "briefcase"], textContains('status: "guidance_saved"')),
    currentCarrier("payment-adapter", "src/lib/expungement-ai/payment-adapter.ts", CURRENT_HASHES.paymentAdapter, ["operational", "commerce"], textContains("assertNotExactDeferral")),
    currentCarrier("save-result-route", "src/app/api/expungement-ai/screening/save-result/route.ts", CURRENT_HASHES.saveResultRoute, ["operational", "runtime_gap"], textContains("componentDeferralBundle(identity.trackId, locale)")),
    currentCarrier("save-result-policy", "src/lib/expungement-ai/save-result-policy.ts", CURRENT_HASHES.saveResultPolicy, ["operational", "runtime_gap"], textContains('payload.treatmentClassification === "component_deferral"')),
    currentCarrier("briefcase-current-copy-gap", "src/app/briefcase/[packetId]/page.tsx", CURRENT_HASHES.briefcasePage, ["operational", "runtime_gap"], textContains("A self-help packet may become available")),
    gitCarrier("consolidated-failed-d-review", CONSOLIDATED_REVIEW_COMMIT, "docs/record-clearing/d-wave/v4/consolidated-handoff.json", GIT_HASHES.consolidatedReview, ["technical", "family_disposition"]),
    gitCarrier("d0-v4-fitter-scan-review", FITTER_REVIEW_COMMIT, "docs/record-clearing/d-wave/v4/review/d-fix-4-review.json", GIT_HASHES.fitterReview, ["technical", "scope"], arrayMatch("findings", { id: "D-R4-012" })),
    gitCarrier("canonical-relationships", RELATIONSHIP_COMMIT, "data/record-clearing/legal-design-track-source-relationships.json", GIT_HASHES.relationships, ["relationship", "component_accounting"]),
    gitCarrier("legal-design-registry", RELATIONSHIP_COMMIT, "data/record-clearing/legal-design-track-registry.json", GIT_HASHES.legalRegistry, ["legal_procedural"]),
    gitCarrier("wa-blake-legal-design", RELATIONSHIP_COMMIT, "data/record-clearing/legal-design-intake/WA.memo.json", GIT_HASHES.legalWaMemo, ["legal_procedural", "relationship"], arrayMatch("tracks", { trackId: "wa_blake_vacatur_and_lfo_refund" }))
  ];

  for (const trackId of TRACK_IDS) {
    carriers.push(
      currentCarrier(`dmap-${trackId}`, "data/rcap-codex/d-track-terminalization/track-family-map.json", CURRENT_HASHES.dMap, ["relationship", "component_accounting"], arrayMatch("tracks", { trackId })),
      currentCarrier(`queue-${trackId}`, "data/rcap-all50/review-artifacts/d-track-queue.json", CURRENT_HASHES.queue, ["commerce", "runtime_state", "relationship"], arrayMatch("tracks", { trackId })),
      currentCarrier(`adoption-${trackId}`, "data/rcap-codex/d-adoption-continuity/track-adoption.json", CURRENT_HASHES.adoption, ["adoption"], arrayMatch("tracks", { trackId })),
      currentCarrier(`crosswalk-${trackId}`, "data/rcap-ledger/track-pathway-crosswalk.json", CURRENT_HASHES.trackPathwayCrosswalk, ["runtime_gap"], arrayMatch("registryTracks", { registryTrackId: trackId })),
      gitCarrier(`legal-${trackId}`, RELATIONSHIP_COMMIT, "data/record-clearing/legal-design-track-registry.json", GIT_HASHES.legalRegistry, ["legal_procedural"], arrayMatch("tracks", { trackId }))
    );
  }

  carriers.push(
    gitCarrier("review-nhjb-2956", CONSOLIDATED_REVIEW_COMMIT, "docs/record-clearing/d-wave/v4/consolidated-handoff.json", GIT_HASHES.consolidatedReview, ["technical", "family_disposition"], arrayMatch("families", { familyId: "NH:nhjb-2956-support-record-request-en" })),
    gitCarrier("review-crrlj-09-0100", CONSOLIDATED_REVIEW_COMMIT, "docs/record-clearing/d-wave/v4/consolidated-handoff.json", GIT_HASHES.consolidatedReview, ["technical", "family_disposition"], arrayMatch("families", { familyId: "WA:crrlj-09-0100-form-en" }))
  );

  for (const [id, familyId, documentId, commit, path, hash] of SOURCE_SPECS) {
    carriers.push({
      ...gitCarrier(id, commit, path, hash, ["source_currentness", "technical", "relationship"], objectMatch({ documentId })),
      familyId
    });
  }

  return carriers.sort((a, b) => a.id.localeCompare(b.id));
}

function claim(trackId, suffix, claimType, en, es, evidenceRefs) {
  return {
    claimId: `${trackId}.${suffix}`,
    claimType,
    en,
    es,
    evidenceRefs: [...new Set(evidenceRefs)].sort()
  };
}

const TRACK_CONTENT = {
  nh_conviction_streamlined: {
    jurisdiction: "NH",
    destination: {
      name: "Clerk of the New Hampshire court that disposed of the case",
      kind: "court_clerk",
      url: null,
      en: "Contact the clerk of the New Hampshire court that disposed of the case. Use the official NHJB-3057-DSe petition and annulment checklist only if that clerk confirms they are the current materials for this route.",
      es: "Comuníquese con la secretaría del tribunal de New Hampshire que resolvió el caso. Use la petición oficial NHJB-3057-DSe y la lista de verificación de anulación solo si esa secretaría confirma que son los materiales vigentes para esta vía."
    },
    supportingDestinations: [
      {
        name: "New Hampshire State Police Criminal Records Unit",
        kind: "state_agency",
        url: null,
        en: "Ask the New Hampshire State Police Criminal Records Unit or the court clerk to confirm the current record-release authorization and instructions before requesting the record. The linked NHJB-2956 copy has not had its revision confirmed.",
        es: "Pida a la Unidad de Antecedentes Penales de la Policía Estatal de New Hampshire o a la secretaría del tribunal que confirme la autorización y las instrucciones vigentes antes de solicitar el registro. No se ha confirmado la revisión de la copia NHJB-2956 vinculada."
      }
    ],
    nextAction: {
      en: "Before filing anything, ask the disposing-court clerk to confirm the current streamlined petition and checklist, then confirm the current criminal-history request process with the state unit.",
      es: "Antes de presentar cualquier documento, pida a la secretaría del tribunal que resolvió el caso que confirme la petición abreviada y la lista de verificación vigentes; después confirme con la unidad estatal el proceso vigente para obtener sus antecedentes penales."
    },
    gather: [
      ["Your New Hampshire criminal-history record.", "Sus antecedentes penales de New Hampshire."],
      ["The docket and disposition for every New Hampshire case.", "El expediente y la resolución de cada caso de New Hampshire."],
      ["Proof that every sentence is complete, including probation or parole discharge, release records, and receipts or zero-balance proof.", "Prueba de que cada sentencia terminó, incluida la constancia de finalización de la libertad vigilada o de la libertad condicional, los registros de liberación y los recibos o la constancia de saldo cero."]
    ],
    doNot: [
      ["Do not sign, file, or submit any petition, authorization, order, or packet produced by LegalEase for this path.", "No firme, presente ni entregue ninguna petición, autorización, orden o paquete producido por LegalEase para esta vía."],
      ["Do not assume that you are eligible, that a particular waiting period applies, or that one offense controls the analysis until qualified legal help reviews the complete record.", "No suponga que reúne los requisitos, que corresponde un plazo de espera determinado ni que un solo delito controla el análisis hasta que un profesional legal calificado revise el historial completo."],
      ["Do not assume that a Department of Corrections fee applies or how a conditional grant will be handled; those questions have not been confirmed.", "No suponga que corresponde una tarifa del Departamento de Correcciones ni cómo se tramitará una concesión condicional; esas preguntas no se han confirmado."]
    ],
    outstanding: {
      en: "Still needed: clerk confirmation of the current streamlined process, agency confirmation of the current record-release authorization, and the complete criminal history and court dispositions. LegalEase does not have reliable filing forms for this path.",
      es: "Aún falta: la confirmación de la secretaría sobre el proceso abreviado vigente, la confirmación de la agencia sobre la autorización vigente para obtener el registro, y el historial penal y las resoluciones judiciales completas. LegalEase no tiene formularios confiables para presentar en esta vía."
    },
    resume: {
      en: "Return to this Briefcase after the clerk confirms the current route and you have the official criminal-history record and disposition documents. Reopen the saved guidance and use its saved instructions together with the records you kept.",
      es: "Regrese a este Maletín después de que la secretaría confirme la vía vigente y usted tenga los antecedentes penales oficiales y los documentos de resolución. Vuelva a abrir la orientación guardada y use sus instrucciones junto con los registros que conservó."
    },
    escalation: {
      name: "Disposing-court clerk or qualified New Hampshire legal-aid or private attorney",
      url: null,
      en: "Ask the disposing-court clerk for process and form questions. Seek qualified New Hampshire legal help for multiple courts, prosecutor opposition, immigration or firearm consequences, or any disputed eligibility question.",
      es: "Consulte a la secretaría del tribunal que resolvió el caso sobre el trámite y los formularios. Busque ayuda legal calificada en New Hampshire si hay varios tribunales, oposición de la fiscalía, consecuencias migratorias o de armas de fuego, o cualquier duda de elegibilidad."
    }
  },
  nh_petition_nonconviction_pre2019: {
    jurisdiction: "NH",
    destination: {
      name: "Clerk of the New Hampshire court that disposed of the charge",
      kind: "court_clerk",
      url: null,
      en: "Contact the clerk of the New Hampshire court that disposed of the charge. That clerk is the official destination for confirming the disposition and its date and for identifying the court's current materials.",
      es: "Comuníquese con la secretaría del tribunal de New Hampshire que resolvió el cargo. Esa secretaría es el destino oficial para confirmar la resolución y su fecha e identificar los materiales vigentes del tribunal."
    },
    supportingDestinations: [
      {
        name: "New Hampshire State Police Criminal Records Unit",
        kind: "state_agency",
        url: null,
        en: "If you have multiple New Hampshire cases, ask the State Police Criminal Records Unit or the court clerk to confirm the current authorization and instructions before obtaining the complete record. The linked NHJB-2956 copy has not had its revision confirmed.",
        es: "Si tiene varios casos de New Hampshire, pida a la Unidad de Antecedentes Penales de la Policía Estatal o a la secretaría del tribunal que confirme la autorización y las instrucciones vigentes antes de obtener el historial completo. No se ha confirmado la revisión de la copia NHJB-2956 vinculada."
      }
    ],
    nextAction: {
      en: "First ask the disposing-court clerk to verify the disposition and date and to identify the current court materials. If it remains unclear whether the law requires a petition, ask qualified New Hampshire legal help before filing.",
      es: "Primero pida a la secretaría del tribunal que resolvió el cargo que verifique la resolución y la fecha e identifique los materiales judiciales vigentes. Si sigue sin estar claro si la ley exige una petición, consulte a un profesional legal calificado de New Hampshire antes de presentar documentos."
    },
    gather: [
      ["The court record showing the disposition and its exact date.", "El registro judicial que muestre la resolución y su fecha exacta."],
      ["If you have multiple New Hampshire cases, your New Hampshire criminal history and the docket and disposition for each case.", "Si tiene varios casos de New Hampshire, sus antecedentes penales de New Hampshire y el expediente y la resolución de cada caso."]
    ],
    doNot: [
      ["Do not sign, file, or submit any petition, authorization, order, or packet produced by LegalEase for this path.", "No firme, presente ni entregue ninguna petición, autorización, orden o paquete producido por LegalEase para esta vía."],
      ["Do not assume that a petition is needed from the preliminary result alone; verify the disposition date and ask qualified legal help if the legal route remains unclear.", "No suponga que se necesita una petición basándose únicamente en el resultado preliminar; verifique la fecha de resolución y consulte a un profesional legal calificado si la vía legal sigue sin estar clara."],
      ["Do not assume that NHJB-2317-DSe is mandatory or current, that a waiting period applies, or that any quoted fee is correct without confirmation from the court and qualified legal help where needed.", "No suponga que NHJB-2317-DSe es obligatorio o vigente, que corresponde un plazo de espera ni que una tarifa indicada es correcta sin confirmación del tribunal y, cuando sea necesario, de un profesional legal calificado."]
    ],
    outstanding: {
      en: "Still needed: the verified disposition and date, the current court materials, and qualified legal guidance if it remains unclear whether a petition is required. LegalEase does not have reliable filing forms for this path.",
      es: "Aún falta: la resolución y fecha verificadas, los materiales judiciales vigentes y orientación legal calificada si sigue sin estar claro si se requiere una petición. LegalEase no tiene formularios confiables para presentar en esta vía."
    },
    resume: {
      en: "Return to this Briefcase after the clerk verifies the disposition and confirms the current process, and after you gather any requested record. Reopen the saved guidance and use its saved instructions together with the records you kept.",
      es: "Regrese a este Maletín después de que la secretaría verifique la resolución y confirme el proceso vigente, y después de reunir cualquier registro solicitado. Vuelva a abrir la orientación guardada y use sus instrucciones junto con los registros que conservó."
    },
    escalation: {
      name: "Disposing-court clerk or qualified New Hampshire legal-aid or private attorney",
      url: null,
      en: "Ask the disposing-court clerk about the disposition, form, and filing process. Seek qualified New Hampshire legal help for ambiguous dispositions, multiple courts, prosecutor opposition, or immigration or firearm consequences.",
      es: "Consulte a la secretaría del tribunal que resolvió el cargo sobre la resolución, el formulario y el proceso de presentación. Busque ayuda legal calificada en New Hampshire si la resolución es ambigua, hay varios tribunales, existe oposición de la fiscalía o hay consecuencias migratorias o de armas de fuego."
    }
  },
  nh_petition_vacated: {
    jurisdiction: "NH",
    destination: {
      name: "Clerk of the New Hampshire court whose conviction was vacated",
      kind: "court_clerk",
      url: null,
      en: "Contact the clerk of the New Hampshire court whose conviction was vacated. That clerk is the official destination for identifying the current petition or other process for the vacatur order.",
      es: "Comuníquese con la secretaría del tribunal de New Hampshire cuya condena fue anulada. Esa secretaría es el destino oficial para identificar la petición vigente u otro proceso correspondiente a la orden de anulación."
    },
    supportingDestinations: [
      {
        name: "New Hampshire State Police Criminal Records Unit",
        kind: "state_agency",
        url: null,
        en: "If you have other New Hampshire cases, ask the State Police Criminal Records Unit or the court clerk to confirm the current authorization and instructions before obtaining the complete record. The linked NHJB-2956 copy has not had its revision confirmed.",
        es: "Si tiene otros casos de New Hampshire, pida a la Unidad de Antecedentes Penales de la Policía Estatal o a la secretaría del tribunal que confirme la autorización y las instrucciones vigentes antes de obtener el historial completo. No se ha confirmado la revisión de la copia NHJB-2956 vinculada."
      }
    ],
    nextAction: {
      en: "Show the clerk of the court that issued the vacatur order a copy and ask which current official petition or process applies. Use only the current official material that the clerk identifies.",
      es: "Muestre una copia de la orden de anulación a la secretaría del tribunal que la emitió y pregunte qué petición o proceso oficial vigente corresponde. Use únicamente el material oficial vigente que identifique la secretaría."
    },
    gather: [
      ["The complete order vacating the conviction.", "La orden completa que anuló la condena."],
      ["If you have other New Hampshire cases, your New Hampshire criminal history and the docket and disposition for every case.", "Si tiene otros casos de New Hampshire, sus antecedentes penales de New Hampshire y el expediente y la resolución de cada caso."]
    ],
    doNot: [
      ["Do not sign, file, or submit any petition, authorization, order, or packet produced by LegalEase for this path.", "No firme, presente ni entregue ninguna petición, autorización, orden o paquete producido por LegalEase para esta vía."],
      ["Do not assume that NHJB-2317-DSe is the correct form for an older conviction with a recent vacatur; the correct form has not been confirmed.", "No suponga que NHJB-2317-DSe es el formulario correcto para una condena antigua con una anulación reciente; no se ha confirmado el formulario correcto."],
      ["Do not assume eligibility, a fee exemption, or any outcome from the vacatur order alone.", "No suponga elegibilidad, una exención de tarifa ni ningún resultado basándose únicamente en la orden de anulación."
      ]
    ],
    outstanding: {
      en: "Still needed: the vacatur order, clerk confirmation of the current process and form, and any complete multi-case record. LegalEase does not have reliable filing forms for this path.",
      es: "Aún falta: la orden de anulación, la confirmación de la secretaría sobre el proceso y el formulario vigentes, y cualquier historial completo de varios casos. LegalEase no tiene formularios confiables para presentar en esta vía."
    },
    resume: {
      en: "Return to this Briefcase after the issuing-court clerk reviews the vacatur order and identifies the current process, and after you gather any requested records. Reopen the saved guidance and use its saved instructions together with the records you kept.",
      es: "Regrese a este Maletín después de que la secretaría del tribunal emisor revise la orden de anulación e identifique el proceso vigente, y después de reunir los registros solicitados. Vuelva a abrir la orientación guardada y use sus instrucciones junto con los registros que conservó."
    },
    escalation: {
      name: "Issuing-court clerk or qualified New Hampshire legal-aid or private attorney",
      url: null,
      en: "Ask the clerk of the court that issued the vacatur order about the correct process. Seek qualified New Hampshire legal help for multiple cases, prosecutor opposition, uncertain order language, or immigration or firearm consequences.",
      es: "Consulte a la secretaría del tribunal que emitió la orden de anulación sobre el proceso correcto. Busque ayuda legal calificada en New Hampshire si hay varios casos, oposición de la fiscalía, lenguaje incierto en la orden o consecuencias migratorias o de armas de fuego."
    }
  },
  wa_vac_misdemeanor_ordinary: {
    jurisdiction: "WA",
    destination: {
      name: "Clerk of the Washington district or municipal court that imposed the sentence",
      kind: "court_clerk",
      url: null,
      en: "Contact the clerk of the Washington district or municipal court that imposed the sentence. Use the Washington Courts official vacation-forms page and ask that clerk for the current petition, proposed order, and local filing instructions.",
      es: "Comuníquese con la secretaría del tribunal de distrito o municipal de Washington que impuso la sentencia. Use la página oficial de formularios de anulación de Washington Courts y pida a esa secretaría la petición, la orden propuesta y las instrucciones locales de presentación vigentes."
    },
    supportingDestinations: [
      {
        name: "Washington State Patrol criminal-history service",
        kind: "state_agency",
        url: "https://wsp.wa.gov/crime/criminal-history/",
        en: "Obtain the Washington State Patrol criminal-history record through the agency's official service before relying on a remembered case history.",
        es: "Obtenga los antecedentes penales de la Patrulla Estatal de Washington mediante el servicio oficial de la agencia antes de depender de lo que recuerde sobre sus casos."
      }
    ],
    nextAction: {
      en: "Open the Washington Courts official vacation-forms page, then ask the sentencing-court clerk which current petition and proposed order apply and what local steps are required before filing anything.",
      es: "Abra la página oficial de formularios de anulación de Washington Courts y luego pregunte a la secretaría del tribunal sentenciador qué petición y orden propuesta vigentes corresponden y qué pasos locales se requieren antes de presentar cualquier documento."
    },
    gather: [
      ["Your Washington State Patrol criminal-history record.", "Sus antecedentes penales de la Patrulla Estatal de Washington."],
      ["The docket from the sentencing court.", "El expediente del tribunal sentenciador."]
    ],
    doNot: [
      ["Do not sign, file, or submit any petition, proposed order, or packet produced by LegalEase for this path.", "No firme, presente ni entregue ninguna petición, orden propuesta o paquete producido por LegalEase para esta vía."],
      ["Do not assume that the general CrRLJ 09.0100 form is current or legally applicable to your case. Ask the clerk which current forms the court accepts and seek qualified legal help on applicability.", "No suponga que el formulario general CrRLJ 09.0100 está vigente o que corresponde legalmente a su caso. Pregunte a la secretaría qué formularios vigentes acepta el tribunal y busque ayuda legal calificada sobre su aplicabilidad."],
      ["Do not assume eligibility, an outcome, the current DUI rule, local requirements, or a filing fee; those questions have not been confirmed.", "No suponga elegibilidad, un resultado, la regla vigente sobre DUI, requisitos locales ni una tarifa de presentación; esas cuestiones no se han confirmado."
      ]
    ],
    outstanding: {
      en: "Still needed: the official criminal history and sentencing docket and clerk confirmation of the current forms and local process. LegalEase does not have a reliable petition and proposed order for this path.",
      es: "Aún falta: los antecedentes penales oficiales, el expediente de sentencia y la confirmación de la secretaría sobre los formularios y el proceso local vigentes. LegalEase no tiene una petición ni una orden propuesta confiables para esta vía."
    },
    resume: {
      en: "Return to this Briefcase after the sentencing-court clerk identifies the current official forms and local steps and after you gather the criminal history and docket. Reopen the saved guidance and use its saved instructions together with the records you kept.",
      es: "Regrese a este Maletín después de que la secretaría del tribunal sentenciador identifique los formularios oficiales y pasos locales vigentes, y después de reunir los antecedentes penales y el expediente. Vuelva a abrir la orientación guardada y use sus instrucciones junto con los registros que conservó."
    },
    escalation: {
      name: "Sentencing-court clerk or qualified Washington legal-aid or private attorney",
      url: null,
      en: "Ask the sentencing-court clerk about current forms, local procedure, and fees. Seek qualified Washington legal help for eligibility, a DUI-related issue, prosecutor opposition, or immigration or firearm consequences.",
      es: "Consulte a la secretaría del tribunal sentenciador sobre los formularios vigentes, el procedimiento local y las tarifas. Busque ayuda legal calificada en Washington para cuestiones de elegibilidad, un asunto relacionado con DUI, oposición de la fiscalía o consecuencias migratorias o de armas de fuego."
    }
  },
  wa_vac_substance_use_disorder: {
    jurisdiction: "WA",
    destination: {
      name: "Clerk of the Washington court that imposed the sentence",
      kind: "court_clerk",
      url: null,
      en: "Contact the clerk of the Washington court that imposed the sentence. Use the Washington Courts official forms page and ask that clerk to identify the current subsection-(6) petition, proposed order, and local requirements.",
      es: "Comuníquese con la secretaría del tribunal de Washington que impuso la sentencia. Use la página oficial de formularios de Washington Courts y pida a esa secretaría que identifique la petición del apartado (6), la orden propuesta y los requisitos locales vigentes."
    },
    supportingDestinations: [
      {
        name: "Washington State Patrol criminal-history service",
        kind: "state_agency",
        url: "https://wsp.wa.gov/crime/criminal-history/",
        en: "Obtain the Washington State Patrol criminal-history record through the agency's official service before relying on a remembered case history.",
        es: "Obtenga los antecedentes penales de la Patrulla Estatal de Washington mediante el servicio oficial de la agencia antes de depender de lo que recuerde sobre sus casos."
      },
      {
        name: "Participant's substance-use-disorder or named alternative program",
        kind: "program_record_source",
        url: null,
        en: "Ask the program for written completion proof or, for the assessment path, the assessment and a written status showing six months of substantial compliance and progress.",
        es: "Pida al programa prueba escrita de finalización o, para la vía de evaluación, la evaluación y una actualización escrita que muestre seis meses de cumplimiento sustancial y progreso."
      }
    ],
    nextAction: {
      en: "Ask the sentencing-court clerk to identify the current subsection-(6) filing route and local requirements, then request the official criminal-history, docket, and program records before filing anything.",
      es: "Pida a la secretaría del tribunal sentenciador que identifique la vía de presentación vigente del apartado (6) y los requisitos locales; después solicite los antecedentes penales, el expediente y los registros del programa oficiales antes de presentar cualquier documento."
    },
    gather: [
      ["Your Washington State Patrol criminal-history record.", "Sus antecedentes penales de la Patrulla Estatal de Washington."],
      ["The docket from the sentencing court.", "El expediente del tribunal sentenciador."],
      ["Written proof of program completion or the assessment plus a written status update showing six months of substantial compliance and progress toward recovery goals.", "Prueba escrita de finalización del programa o la evaluación junto con una actualización escrita que muestre seis meses de cumplimiento sustancial y progreso hacia las metas de recuperación."]
    ],
    doNot: [
      ["Do not sign, file, or submit any petition, proposed order, or packet produced by LegalEase for this path.", "No firme, presente ni entregue ninguna petición, orden propuesta o paquete producido por LegalEase para esta vía."],
      ["Do not assume that the general CrRLJ 09.0100 petition is the correct form for the substance-use-disorder route; the correct form has not been confirmed.", "No suponga que la petición general CrRLJ 09.0100 es el formulario correcto para la vía de trastorno por consumo de sustancias; no se ha confirmado el formulario correcto."],
      ["Do not assume that the ordinary subsection-(2) bars apply or do not apply, that current DUI legislation has a particular effect, or that local rules or fees are uniform.", "No suponga que las prohibiciones ordinarias del apartado (2) se aplican o no se aplican, que la legislación vigente sobre DUI tiene un efecto determinado ni que las reglas o tarifas locales son uniformes."
      ]
    ],
    outstanding: {
      en: "Still needed: the official history and docket, qualifying program documentation, and clerk confirmation of the current subsection-(6) forms and local process. LegalEase does not have a reliable petition and proposed order for this path.",
      es: "Aún falta: los antecedentes y el expediente oficiales, la documentación del programa que reúna los requisitos y la confirmación de la secretaría sobre los formularios y el proceso local vigentes del apartado (6). LegalEase no tiene una petición ni una orden propuesta confiables para esta vía."
    },
    resume: {
      en: "Return to this Briefcase after the clerk identifies the current subsection-(6) route and you have the official history, docket, and program documentation. Reopen the saved guidance and use its saved instructions together with the records you kept.",
      es: "Regrese a este Maletín después de que la secretaría identifique la vía vigente del apartado (6) y usted tenga los antecedentes, el expediente y la documentación del programa oficiales. Vuelva a abrir la orientación guardada y use sus instrucciones junto con los registros que conservó."
    },
    escalation: {
      name: "Sentencing-court clerk, program records contact, or qualified Washington legal-aid or private attorney",
      url: null,
      en: "Ask the clerk about the current filing route and ask the program for records. Seek qualified Washington legal help if statutory applicability, pending charges, domestic-violence history, DUI issues, or immigration or firearm consequences are uncertain.",
      es: "Consulte a la secretaría sobre la vía de presentación vigente y pida los registros al programa. Busque ayuda legal calificada en Washington si hay dudas sobre la aplicación de la ley, cargos pendientes, antecedentes de violencia doméstica, cuestiones de DUI o consecuencias migratorias o de armas de fuego."
    }
  },
  wa_vac_homicide_victim_prostitution: {
    jurisdiction: "WA",
    destination: {
      name: "Clerk of the Washington court that sentenced the person whose prostitution conviction is at issue",
      kind: "court_clerk",
      url: null,
      en: "Contact the clerk of the Washington court that sentenced the person whose prostitution conviction is at issue. Use the Washington Courts official forms page and ask that clerk to identify the current subsection-(7) application, proposed order, and local requirements.",
      es: "Comuníquese con la secretaría del tribunal de Washington que sentenció a la persona cuya condena por prostitución está en cuestión. Use la página oficial de formularios de Washington Courts y pida a esa secretaría que identifique la solicitud del apartado (7), la orden propuesta y los requisitos locales vigentes."
    },
    supportingDestinations: [],
    nextAction: {
      en: "Ask the sentencing-court clerk to identify the current subsection-(7) application and proposed order and the local proof requirements before filing anything.",
      es: "Pida a la secretaría del tribunal sentenciador que identifique la solicitud y la orden propuesta vigentes del apartado (7), así como los requisitos locales de prueba, antes de presentar cualquier documento."
    },
    gather: [
      ["A death certificate or equivalent official record of the homicide.", "Un certificado de defunción u otro registro oficial equivalente del homicidio."],
      ["The court docket for the prostitution conviction.", "El expediente judicial de la condena por prostitución."],
      ["Records proving the applicant's qualifying family relationship.", "Registros que demuestren la relación familiar que habilita a la persona solicitante."
      ]
    ],
    doNot: [
      ["Do not sign, file, or submit any application, proposed order, or packet produced by LegalEase for this path.", "No firme, presente ni entregue ninguna solicitud, orden propuesta o paquete producido por LegalEase para esta vía."],
      ["Do not assume that the general CrRLJ 09.0100 petition is the route-specific form; the correct form has not been confirmed.", "No suponga que la petición general CrRLJ 09.0100 es el formulario específico para esta vía; no se ha confirmado el formulario correcto."],
      ["Do not assume eligibility or an outcome. Ask the clerk about current forms, local proof requirements, local procedure, and fees; seek qualified legal help for eligibility and outcome questions.", "No suponga elegibilidad ni un resultado. Consulte a la secretaría sobre los formularios vigentes, los requisitos locales de prueba, el procedimiento local y las tarifas; busque ayuda legal calificada para preguntas sobre elegibilidad y resultados."
      ]
    ],
    outstanding: {
      en: "Still needed: the official death or homicide record, conviction docket, family-relationship proof, and clerk confirmation of the current subsection-(7) materials and local process. LegalEase does not have a reliable application and proposed order for this path.",
      es: "Aún falta: el registro oficial de defunción u homicidio, el expediente de la condena, la prueba de relación familiar y la confirmación de la secretaría sobre los materiales y el proceso local vigentes del apartado (7). LegalEase no tiene una solicitud ni una orden propuesta confiables para esta vía."
    },
    resume: {
      en: "Return to this Briefcase after the sentencing-court clerk identifies the current subsection-(7) materials and you have the official death, conviction, and relationship records. Reopen the saved guidance and use its saved instructions together with the records you kept.",
      es: "Regrese a este Maletín después de que la secretaría del tribunal sentenciador identifique los materiales vigentes del apartado (7) y usted tenga los registros oficiales de defunción, condena y relación familiar. Vuelva a abrir la orientación guardada y use sus instrucciones junto con los registros que conservó."
    },
    escalation: {
      name: "Sentencing-court clerk or qualified Washington legal-aid or private attorney",
      url: null,
      en: "Ask the sentencing-court clerk about the current application and proof requirements. Seek qualified Washington legal help if relationship proof, eligibility, sensitive records, or the process is difficult or disputed; share only what is needed to route the question.",
      es: "Consulte a la secretaría del tribunal sentenciador sobre la solicitud vigente y los requisitos de prueba. Busque ayuda legal calificada en Washington si la prueba de parentesco, la elegibilidad, los registros sensibles o el proceso son difíciles o controvertidos; comparta únicamente lo necesario para orientar la consulta."
    }
  }
};

function reviewRefForTrack(trackId) {
  return trackId.startsWith("nh_") ? "review-nhjb-2956" : "review-crrlj-09-0100";
}

function sourceRefForTrack(trackId) {
  return trackId.startsWith("nh_") ? "source-nh-nhjb-2956" : "source-wa-crrlj-09-0100";
}

function unavailableReason(trackId) {
  if (trackId === "nh_conviction_streamlined") {
    return {
      en: "LegalEase cannot provide a filing packet for this path. The revision of the required NHJB-2956 record-release authorization is not confirmed; its fields are not fully accounted for, and its visual and repeat-output checks do not establish a reliable completed form. LegalEase also does not have a reliable official petition for this path.",
      es: "LegalEase no puede proporcionar un paquete para presentar en esta vía. No se ha confirmado la revisión de la autorización NHJB-2956 requerida para obtener antecedentes; no se han contabilizado todos sus campos y sus comprobaciones visuales y de repetición no demuestran un formulario completado confiable. LegalEase tampoco tiene una petición oficial confiable para esta vía."
    };
  }
  if (trackId.startsWith("nh_")) {
    return {
      en: "LegalEase cannot provide a filing packet for this path. When the NHJB-2956 record-release authorization is needed, its revision is not confirmed, its fields are not fully accounted for, and its visual and repeat-output checks do not establish a reliable completed form. LegalEase also does not have a reliable official petition for this path.",
      es: "LegalEase no puede proporcionar un paquete para presentar en esta vía. Cuando se necesita la autorización NHJB-2956 para obtener antecedentes, no se ha confirmado su revisión, no se han contabilizado todos sus campos y sus comprobaciones visuales y de repetición no demuestran un formulario completado confiable. LegalEase tampoco tiene una petición oficial confiable para esta vía."
    };
  }
  return {
    en: "LegalEase cannot provide a filing packet for this path. The current LegalEase draft of CrRLJ 09.0100 places participant information beside labels or outside the official blanks, and LegalEase does not have a reliable required CrRLJ 09.0200 proposed order.",
    es: "LegalEase no puede proporcionar un paquete para presentar en esta vía. El borrador actual de LegalEase del formulario CrRLJ 09.0100 coloca información de la persona junto a los rótulos o fuera de los espacios oficiales, y LegalEase no tiene una orden propuesta CrRLJ 09.0200 requerida que sea confiable."
  };
}

function collectClaims(value, claims = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectClaims(item, claims);
  } else if (value && typeof value === "object") {
    if (typeof value.claimId === "string") claims.push(value);
    for (const child of Object.values(value)) collectClaims(child, claims);
  }
  return claims;
}

function buildParticipantTreatment(trackId) {
  const content = TRACK_CONTENT[trackId];
  const legalRefs = [`legal-${trackId}`];
  const technicalRefs = [reviewRefForTrack(trackId), sourceRefForTrack(trackId), `dmap-${trackId}`];
  if (trackId.startsWith("wa_")) technicalRefs.push("final-253-family-handoff");
  const operationalRefs = ["participant-deferral-contract", `queue-${trackId}`, "route-resolver", "render-job-contract"];
  const briefcaseRefs = ["briefcase-runtime", "participant-deferral-contract"];
  const reason = unavailableReason(trackId);
  const participant = {
    unavailableReason: claim(trackId, "unavailable_reason", "technical", reason.en, reason.es, technicalRefs),
    participantFiles: {
      filesAnythingFromLegalEase: false,
      guidance: claim(
        trackId,
        "legalease_filing_instruction",
        "operational",
        "Do not file anything from LegalEase for this path. LegalEase is providing guidance only, not a petition, authorization, proposed order, or filing packet.",
        "No presente ningún documento de LegalEase para esta vía. LegalEase proporciona únicamente orientación, no una petición, autorización, orden propuesta ni paquete para presentar.",
        [...technicalRefs, "participant-deferral-contract"]
      )
    },
    destination: {
      name: content.destination.name,
      kind: content.destination.kind,
      url: content.destination.url,
      guidance: claim(trackId, "official_destination", "legal_procedural", content.destination.en, content.destination.es, legalRefs)
    },
    supportingDestinations: content.supportingDestinations.map((destination, index) => ({
      name: destination.name,
      kind: destination.kind,
      url: destination.url,
      guidance: claim(trackId, `supporting_destination_${index + 1}`, "legal_procedural", destination.en, destination.es, legalRefs)
    })),
    officialResources: (OFFICIAL_RESOURCES[trackId] ?? []).map(([name, url, en, es, additionalEvidenceRefs = []], index) => ({
      name,
      kind: "official_resource",
      url,
      guidance: claim(trackId, `official_resource_${index + 1}`, "legal_procedural", en, es, [...legalRefs, ...additionalEvidenceRefs])
    })),
    nextAction: claim(trackId, "next_action", "legal_procedural", content.nextAction.en, content.nextAction.es, legalRefs),
    gather: content.gather.map(([en, es], index) => claim(trackId, `gather_${index + 1}`, "legal_procedural", en, es, legalRefs)),
    doNot: content.doNot.map(([en, es], index) => claim(trackId, `do_not_${index + 1}`, "legal_procedural", en, es, [...legalRefs, reviewRefForTrack(trackId)])),
    packetAbsenceDisclosure: claim(
      trackId,
      "packet_absence",
      "operational",
      "No LegalEase filing packet is available. This page provides guidance only and makes no promise that a packet will be produced later.",
      "No hay un paquete de LegalEase disponible para presentar. Esta página ofrece únicamente orientación y no promete que se producirá un paquete más adelante.",
      [...technicalRefs, "participant-deferral-contract", "render-job-contract"]
    ),
    briefcase: {
      preserved: claim(
        trackId,
        "briefcase_preserved",
        "operational",
        "When this guidance appears in your Briefcase, it must include the reason, destination, next action, document list, cautions, and return instructions. No payment, receipt, or filing packet may be attached.",
        "Cuando esta orientación aparezca en su Maletín, debe incluir el motivo, el destino, el siguiente paso, la lista de documentos, las advertencias y las instrucciones para regresar. No se puede adjuntar ningún pago, recibo ni paquete para presentar.",
        briefcaseRefs
      ),
      outstanding: claim(trackId, "briefcase_outstanding", "legal_procedural", content.outstanding.en, content.outstanding.es, [...legalRefs, ...technicalRefs]),
      return: claim(
        trackId,
        "briefcase_return",
        "operational",
        `When this guidance appears in your Briefcase, ${content.resume.en.replace(/^Return to this Briefcase /, "return ")}`,
        `Cuando esta orientación aparezca en su Maletín, ${content.resume.es.replace(/^Regrese a este Maletín /, "regrese ")}`,
        [...briefcaseRefs, ...legalRefs]
      ),
      resumeTrigger: claim(
        trackId,
        "briefcase_resume_trigger",
        "operational",
        "When this guidance appears in your Briefcase, return only after the named official destination confirms the missing current process or form and you have gathered the identified records. Return means reopening the saved guidance, not waiting for or being promised a LegalEase packet.",
        "Cuando esta orientación aparezca en su Maletín, regrese únicamente después de que el destino oficial indicado confirme el proceso o formulario vigente que falta y usted haya reunido los registros identificados. Regresar significa volver a abrir la orientación guardada, no esperar ni recibir la promesa de un paquete de LegalEase.",
        [...briefcaseRefs, ...legalRefs]
      ),
      reuseCompletedWork: {
        requirementOnlyNotCurrentRuntimeAssertion: true,
        savedGuidanceReusableAfterAdoption: true,
        savedIntakeAnswersClaimed: false,
        savedUploadsClaimed: false,
        participantKeepsExternalRecords: true
      }
    },
    escalation: {
      name: content.escalation.name,
      kind: "official_or_qualified_support",
      url: content.escalation.url,
      guidance: claim(trackId, "escalation", "legal_procedural", content.escalation.en, content.escalation.es, legalRefs)
    },
    commercialDisclosure: claim(
      trackId,
      "commercial_disclosure",
      "operational",
      "There is no charge or payment step for this guidance. It does not use a LegalEase allowance or an allowance from your partner organization, no filing packet is created, and no future packet is promised.",
      "Esta orientación no tiene costo ni opción de pago. No usa una asignación de LegalEase ni una asignación de su organización asociada, no se crea un paquete para presentar y no se promete un paquete futuro.",
      operationalRefs
    )
  };
  return participant;
}

function exactSet(values) {
  return [...new Set(values)].sort();
}

function buildComponentAccounting(trackId) {
  const registryTrack = legalRegistry.tracks.find((track) => track.trackId === trackId);
  const dTrack = dMap.tracks.find((track) => track.trackId === trackId);
  const relationshipByComponent = new Map(relationships.relationships
    .filter((relationship) => relationship.trackId === trackId)
    .map((relationship) => [relationship.componentId, relationship]));
  const familyByDocument = new Map((dTrack.requiredFamilies ?? []).map((family) => [family.documentId, family]));
  const finalDispositionByFamily = new Map((finalFamilyHandoff.families ?? []).map((family) => [family.familyId, family.finalDisposition]));
  const components = (registryTrack.packetSet?.components ?? [])
    .filter((component) => component.requirement === "required" || component.requirement === "conditional")
    .sort((a, b) => a.componentId.localeCompare(b.componentId))
    .map((registryComponent) => {
    const relationship = relationshipByComponent.get(registryComponent.componentId) ?? null;
    const family = registryComponent.officialFormId ? familyByDocument.get(registryComponent.officialFormId) ?? null : null;
    return {
      componentId: registryComponent.componentId,
      officialFormId: registryComponent.officialFormId ?? null,
      familyId: family?.familyId ?? null,
      role: registryComponent.role,
      requirement: registryComponent.requirement,
      outputStrategy: registryComponent.outputStrategy,
      relationshipRecorded: Boolean(relationship),
      canonicalFamilyDisposition: family
        ? finalDispositionByFamily.get(family.familyId) ?? "missing_from_final_253_handoff"
        : registryComponent.officialFormId
          ? "no_exact_d_family_mapping"
          : "not_applicable_non_family_component",
      fallbackTreatment: registryComponent.outputStrategy === "process_guidance"
        ? "provided_by_fallback_guidance"
        : "not_rendered_under_exact_supported_deferral",
      coveredByFallback: true,
      fallbackCoverageClaimIds: (NON_FAMILY_COMPONENT_CLAIM_SUFFIXES.get(registryComponent.componentId) ?? [])
        .map((suffix) => `${trackId}.${suffix}`),
      evidenceRefs: [`dmap-${trackId}`, `legal-${trackId}`, "canonical-relationships"]
    };
  });
  const ids = components.map((component) => component.componentId).sort();
  return {
    canonicalComponentIds: ids,
    canonicalOfficialFormRelationshipIds: components.filter((component) => component.officialFormId).map((component) => component.componentId).sort(),
    coveredComponentIds: [...ids],
    components
  };
}

const SOURCE_REF_BY_FAMILY = new Map([
  ["MO:cr145-form-petition-en", "source-mo-cr145"],
  ["NH:nhjb-2956-support-record-request-en", "source-nh-nhjb-2956"],
  ["VA:cc-1203-form-en", "source-va-cc-1203"],
  ["VT:200-00631-form-en", "source-vt-200-00631"],
  ["WA:blake-006-form-en", "source-wa-blake-006"],
  ["WA:blake-008-form-en", "source-wa-blake-008"],
  ["WA:crrlj-09-0100-form-en", "source-wa-crrlj-09-0100"],
  ["WA:crrlj-09-0870-form-en", "source-wa-crrlj-09-0870"]
]);

function buildFamilyAnalysis() {
  const sourceCarriers = new Map(buildEvidenceCarriers()
    .filter((carrier) => carrier.familyId)
    .map((carrier) => [carrier.familyId, carrier]));
  return SEED_FAMILIES.map((familyId) => {
    const classification = EXPECTED_FAMILY_CLASSIFICATION.get(familyId);
    const documentId = FAMILY_DOCUMENT_IDS.get(familyId);
    const activeRelationships = dMap.tracks.flatMap((track) =>
      (track.requiredFamilies ?? [])
        .filter((family) => family.familyId === familyId)
        .flatMap((family) => family.componentIds.map((componentId, index) => ({
          trackId: track.trackId,
          componentId,
          role: family.roles[index] ?? family.roles[0] ?? "required_component",
          scope: "active_D_67"
        })))
    );
    const canonicalRelationships = relationships.relationships
      .filter((relationship) => relationship.officialFormId === documentId)
      .map((relationship) => ({
        trackId: relationship.trackId,
        componentId: relationship.componentId,
        role: relationship.componentId.includes("proposed-order") ? "proposed_order" : "primary_filing",
        scope: TRACK_IDS.includes(relationship.trackId) ? "active_D_67" : "canonical_non_D_track"
      }))
      .sort((a, b) => `${a.trackId}:${a.componentId}`.localeCompare(`${b.trackId}:${b.componentId}`));

    let relationshipDetails = activeRelationships.sort((a, b) => a.trackId.localeCompare(b.trackId));
    let relationshipNote;
    if (classification === "active_required") {
      relationshipNote = "This family is an exact required-family edge for one or more active tracks in the current canonical D-67 map.";
    } else if (classification === "optional_or_supporting") {
      relationshipDetails = canonicalRelationships;
      relationshipNote = "This inventory is not required by an active D-67 track. It has a canonical required relationship to a track outside the D-67 scope, so it is retained as optional/supporting to this launch decision and is not called orphaned.";
    } else if (classification === "orphaned_inventory_no_canonical_track_relationship") {
      relationshipNote = "The pinned full relationship registry and current D-67 map contain no canonical edge for this inventory. Its generic implementation follow-up does not create a canonical track relationship. Technical imperfection alone does not make it launch-blocking.";
    } else {
      relationshipNote = familyId.startsWith("WA:blake-")
        ? "No active D-67 edge is committed, but the source record requires normalized-track mapping and the Washington legal design leaves the current Blake order set unresolved. It is unresolved, not orphaned and not launch-blocking by assumption."
        : "No active D-67 edge is committed, but the current D handoff explicitly leaves open whether this family belongs outside the 67 or has a missing relationship. It is unresolved, not orphaned and not launch-blocking by assumption.";
    }
    const evidenceRefs = [SOURCE_REF_BY_FAMILY.get(familyId), "d-map-67", "canonical-relationships"];
    if (classification === "active_required") {
      for (const relationship of relationshipDetails) evidenceRefs.push(`dmap-${relationship.trackId}`);
    }
    if (classification === "relationship_unresolved") {
      if (familyId.startsWith("WA:blake-")) evidenceRefs.push("wa-blake-legal-design");
      else evidenceRefs.push("final-d-handoff-integration", "d-track-queue");
    }
    if (classification === "optional_or_supporting") evidenceRefs.push("final-d-handoff-integration");
    const sourceCarrier = sourceCarriers.get(familyId);
    const sourceRecord = parseGit(sourceCarrier.commit, sourceCarrier.path);
    return {
      familyId,
      documentId,
      classification,
      sourceCurrentness: {
        revision: sourceRecord.revision ?? null,
        freshnessStatus: sourceRecord.freshnessStatus ?? null,
        sourceSha256: sourceRecord.sha256 ?? null,
        generationAllowed: sourceRecord.generationAllowed === true,
        packetCandidate: sourceRecord.packetCandidate ?? null,
        evidenceRef: sourceCarrier.id
      },
      relationshipDetails,
      relationshipNote,
      launchBlocking: classification === "active_required",
      launchEffect: classification === "active_required"
        ? "packet_path_blocked_until_an_approved_packet_or_independently_reviewed_fallback_is_selected"
        : "none_from_this_family_classification",
      evidenceRefs: exactSet(evidenceRefs)
    };
  }).sort((a, b) => a.familyId.localeCompare(b.familyId));
}

function buildTreatment(trackId) {
  const dTrack = dMap.tracks.find((track) => track.trackId === trackId);
  const adoptionTrack = adoption.tracks.find((track) => track.trackId === trackId);
  const participantTreatment = buildParticipantTreatment(trackId);
  const triggerFamilyIds = (dTrack.requiredFamilyIds ?? []).filter((familyId) => ACTIVE_TRIGGER_FAMILIES.has(familyId)).sort();
  const authority = collectClaims(participantTreatment)
    .filter((item) => item.claimType === "legal_procedural")
    .map((item) => ({ claimId: item.claimId, evidenceRefs: item.evidenceRefs }))
    .sort((a, b) => a.claimId.localeCompare(b.claimId));
  return {
    trackId,
    jurisdiction: dTrack.jurisdiction,
    legalName: dTrack.legalName,
    candidateTreatment: "exact_supported_deferral_candidate",
    status: "candidate_only_not_approved_not_promoted",
    candidateOnly: true,
    triggerFamilyIds,
    rationale: "A production packet remains the preferred independently approved outcome, but committed evidence supports an exact official destination and next action while the required production components remain technically unavailable or unmeasurable. No filing path is manufactured.",
    adoptionContinuity: {
      classification: adoptionTrack.classification,
      legalApprovalEffect: "none",
      evidenceRefs: [`adoption-${trackId}`]
    },
    componentAccounting: buildComponentAccounting(trackId),
    participantTreatment,
    runtimeContract: {
      classification: "fallback_treatment_candidate",
      status: "guidance_saved",
      resultCode: "guidance_only",
      packetType: "guidance_packet",
      sellable: false,
      paymentAllowed: false,
      checkoutSuppressed: true,
      packetCreditConsumption: "none",
      partnerCreditConsumption: "none",
      partnerCreditConsumed: false,
      rendererKind: "none",
      renderJobAllowed: false,
      packetPlan: null,
      packetPromise: "none",
      paymentStatus: "not_applicable",
      packetStatus: "not_started",
      briefcaseHandoffRequired: true,
      runtimeAdoptionStatus: "not_registered_not_route_bound",
      serverSaveHandoffStatus: "not_wired_for_exact_supported_deferral",
      requirementOnlyNotCurrentRuntimeAssertion: true
    },
    authority,
    evidenceRefs: exactSet([
      `dmap-${trackId}`,
      `queue-${trackId}`,
      `adoption-${trackId}`,
      `legal-${trackId}`,
      reviewRefForTrack(trackId),
      sourceRefForTrack(trackId),
      "participant-deferral-contract",
      "route-resolver",
      "render-job-contract",
      "briefcase-runtime",
      "payment-adapter",
      "guidance-packet-registry",
      "save-result-route",
      "save-result-policy",
      `crosswalk-${trackId}`
    ]),
    technicalApprovalIssued: false,
    legalApprovalIssued: false,
    promotionEffect: "none",
    ledgerEffect: "none",
    factoryCycleRequiredAfterFallbackApproval: false
  };
}

function buildCandidateArtifact() {
  const evidenceCarriers = buildEvidenceCarriers();
  const familyAnalysis = buildFamilyAnalysis();
  const treatments = TRACK_IDS.map(buildTreatment).sort((a, b) => a.trackId.localeCompare(b.trackId));
  const categoryCount = (classification) => familyAnalysis.filter((family) => family.classification === classification).length;
  return {
    schemaVersion: "rcap-d-v5-fallback-treatments/v1",
    baseCommit: BASE_COMMIT,
    branch: "codex/rcap-d-v5-fallback-treatments",
    status: "candidate_ready_for_independent_review",
    posture: {
      authoringLane: "Codex bounded fallback-treatment lane",
      artifactOnly: true,
      technicalApprovalIssued: false,
      legalApprovalIssued: false,
      promotionIssued: false,
      canonicalLedgerRegenerated: false,
      factoryOrFamilyImplementationEdited: false
    },
    scopeInputs: {
      currentDMap: "data/rcap-codex/d-track-terminalization/track-family-map.json",
      final253FamilyHandoff: "docs/record-clearing/d-wave/v3/family-handoff.json",
      consolidatedFailedDReview: `${CONSOLIDATED_REVIEW_COMMIT}:docs/record-clearing/d-wave/v4/consolidated-handoff.json`,
      seedFamilyIds: [...SEED_FAMILIES].sort(),
      systemicScan: {
        status: "d0_v5_additional_family_list_not_available_at_base",
        additionalFamilyIdsIncluded: [],
        additionalFamilyCountIncluded: 0,
        priorD0V4ScanUsedAsNegativeProof: false,
        exactReason: "No committed D0-v5 additional-family list is available at the pinned base. Independent review found the prior D0-v4 fitter scan capable of failing open and incomplete across fixture/widget geometry, so its zero-addition result is not treated as proof that no further family will reopen.",
        whenAvailable: "Append every family named by the committed D0-v5 list, re-derive active D-track edges from the pinned canonical map, and issue exactly one candidate per newly affected active track without returning an already covered track to the factory.",
        evidenceRefs: ["d0-v4-fitter-scan-review"]
      }
    },
    activationPolicy: {
      packetCandidateWinsWhen: {
        d0V5: "pass",
        independentlyApprovedProductionPacket: true,
        action: "production_packet_remains_available_and_fallback_is_unused"
      },
      fallbackBecomesTerminalWhen: {
        conditionAny: ["d0_v5_failed", "geometry_remains_unmeasurable"],
        independentlyReviewedFallbackRequired: true,
        action: "independently_reviewed_fallback_becomes_terminal_track_treatment"
      },
      unresolvedStateAction: "hold_candidate_for_independent_decision_without_checkout_render_or_credit",
      returnToFactory: false,
      currentEffect: "candidate_only_no_runtime_ledger_family_factory_or_promotion_effect"
    },
    counts: {
      familiesAnalyzed: familyAnalysis.length,
      activeRequiredFamilies: categoryCount("active_required"),
      optionalOrSupportingFamilies: categoryCount("optional_or_supporting"),
      orphanedFamilies: categoryCount("orphaned_inventory_no_canonical_track_relationship"),
      relationshipUnresolvedFamilies: categoryCount("relationship_unresolved"),
      activeTracks: treatments.length,
      completeGuidanceCandidates: treatments.filter((item) => item.candidateTreatment === "complete_guidance_candidate").length,
      exactSupportedDeferralCandidates: treatments.filter((item) => item.candidateTreatment === "exact_supported_deferral_candidate").length,
      deliberateScopeExclusionCandidates: treatments.filter((item) => item.candidateTreatment === "deliberate_scope_exclusion_candidate").length,
      unsupportedTreatments: 0
    },
    familyAnalysis,
    treatments,
    unsupportedTreatments: [],
    runtimeParityGaps: [
      {
        gapId: "fallback_registry_route_adoption_missing",
        affectedTrackIds: [...TRACK_IDS],
        currentEvidenceRefs: ["guidance-packet-registry", "route-resolver", ...TRACK_IDS.map((trackId) => `crosswalk-${trackId}`)],
        exactGap: "The crosswalk records all six tracks as missing from compiled runtime coverage, and the exact-deferral registry scans only data/rcap-all50/guidance-packets. It does not ingest this Codex-owned candidate artifact, so the route resolver cannot select these exact deferrals.",
        requiredAtIndependentAdoption: "After independent approval, add a separately reviewed registry and route binding for each approved treatment without changing its fail-closed contract.",
        blocksCandidateReview: false,
        blocksRuntimeAdoptionUntilResolved: true,
        requiresAnotherFactoryCycle: false
      },
      {
        gapId: "server_exact_deferral_save_handoff_missing",
        affectedTrackIds: [...TRACK_IDS],
        currentEvidenceRefs: ["save-result-route", "save-result-policy", "briefcase-runtime"],
        exactGap: "The server save route currently declares only component deferrals, and the save policy applies its forced guidance-saved clamp only to component_deferral. These candidate exact deferrals therefore have no adopted server-owned save and Briefcase handoff path.",
        requiredAtIndependentAdoption: "After independent approval and registry binding, add a separately reviewed exact-deferral save declaration and fail-closed Briefcase handoff for each approved treatment.",
        blocksCandidateReview: false,
        blocksRuntimeAdoptionUntilResolved: true,
        requiresAnotherFactoryCycle: false
      },
      {
        gapId: "briefcase_generic_future_packet_copy",
        currentEvidenceRefs: ["briefcase-current-copy-gap"],
        exactGap: "The current generic Briefcase guidance view says a self-help packet may become available and will be saved later. That language conflicts with packetPromise=none for these candidates.",
        requiredAtIndependentAdoption: "Suppress the generic future-packet message for every adopted fallback treatment and render only the reviewed no-packet-promise disclosure.",
        blocksCandidateReview: false,
        blocksRuntimeAdoptionUntilResolved: true,
        requiresAnotherFactoryCycle: false
      }
    ],
    exactBlockers: [
      {
        blockerId: "D-V5-LIST-NOT-AVAILABLE",
        kind: "scope_input",
        exactBlocker: "No committed D0-v5 systemic additional-family list exists at the pinned base; the invalidated D0-v4 negative scan cannot substitute for it.",
        evidenceRefs: ["d-map-67", "d-track-queue", "d0-v4-fitter-scan-review"],
        factoryCycleRequired: false
      },
      {
        blockerId: "INDEPENDENT-FALLBACK-REVIEW-PENDING",
        kind: "review",
        exactBlocker: "All six treatments remain candidates until a reviewer independent from the authoring lane accepts or corrects them.",
        evidenceRefs: ["participant-deferral-contract"],
        factoryCycleRequired: false
      },
      {
        blockerId: "FALLBACK-REGISTRY-ROUTE-ADOPTION",
        kind: "runtime_adoption",
        exactBlocker: "The six candidates are absent from compiled runtime coverage and are not ingested by the current exact-deferral registry, so none is route-bound for runtime use.",
        evidenceRefs: ["guidance-packet-registry", "route-resolver", ...TRACK_IDS.map((trackId) => `crosswalk-${trackId}`)],
        factoryCycleRequired: false
      },
      {
        blockerId: "EXACT-DEFERRAL-SAVE-HANDOFF",
        kind: "runtime_adoption",
        exactBlocker: "The current server save flow declares and clamps component deferrals but does not declare these exact deferrals; approved candidates need an independently reviewed save and Briefcase integration.",
        evidenceRefs: ["save-result-route", "save-result-policy", "briefcase-runtime"],
        factoryCycleRequired: false
      },
      {
        blockerId: "BRIEFCASE-NO-PROMISE-RUNTIME-PARITY",
        kind: "runtime_adoption",
        exactBlocker: "The generic Briefcase future-packet sentence must be suppressed when an approved fallback is adopted; this lane did not edit runtime paths.",
        evidenceRefs: ["briefcase-current-copy-gap"],
        factoryCycleRequired: false
      }
    ],
    evidenceCarriers,
    safeForIndependentReview: true
  };
}

let expectedCandidateCache;
function expectedCandidateReference() {
  expectedCandidateCache ??= buildCandidateArtifact();
  return expectedCandidateCache;
}

function addError(errors, code) {
  if (!errors.includes(code)) errors.push(code);
}

function valuesEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function isNonBlank(value, minimum = 1) {
  return typeof value === "string" && value.trim().length >= minimum;
}

function validOptionalHttps(value) {
  return value === null || /^https:\/\//.test(value ?? "");
}

function expectedActiveTrackIds() {
  return dMap.tracks
    .filter((track) => (track.requiredFamilyIds ?? []).some((familyId) => SEED_FAMILIES.includes(familyId)))
    .map((track) => track.trackId)
    .sort();
}

function expectedComponentIds(trackId) {
  const registryTrack = legalRegistry.tracks.find((track) => track.trackId === trackId);
  return (registryTrack?.packetSet?.components ?? [])
    .filter((component) => component.requirement === "required" || component.requirement === "conditional")
    .map((component) => component.componentId)
    .sort();
}

function independentlyClassifyFamily(familyId) {
  const documentId = FAMILY_DOCUMENT_IDS.get(familyId);
  const hasActiveDRelationship = dMap.tracks.some((track) => (track.requiredFamilyIds ?? []).includes(familyId));
  if (hasActiveDRelationship) return "active_required";
  const hasCanonicalRelationship = relationships.relationships.some((relationship) => relationship.officialFormId === documentId);
  if (hasCanonicalRelationship) return "optional_or_supporting";
  const unresolvedBlockerText = (queue.exactBlockers ?? []).map((blocker) => `${blocker.finding} ${blocker.question}`).join("\n");
  if (unresolvedBlockerText.includes(familyId)) return "relationship_unresolved";
  const sourceSpec = SOURCE_SPEC_BY_FAMILY.get(familyId);
  const sourceRecord = sourceSpec ? parseGit(sourceSpec[3], sourceSpec[4]) : null;
  if (/map to normalized track ids/i.test(sourceRecord?.requiredFollowUp ?? "")) return "relationship_unresolved";
  return "orphaned_inventory_no_canonical_track_relationship";
}

function locatorResolves(bytes, locator) {
  if (!locator) return true;
  const text = bytes.toString("utf8");
  if (locator.type === "text_contains") return text.includes(locator.value);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return false;
  }
  if (locator.type === "json_object_match") {
    return Object.entries(locator.conditions).every(([key, value]) => parsed[key] === value);
  }
  if (locator.type === "json_array_match") {
    const collection = parsed[locator.collection];
    return Array.isArray(collection) && collection.some((item) =>
      Object.entries(locator.conditions).every(([key, value]) => item?.[key] === value)
    );
  }
  return false;
}

function validateEvidenceCarriers(artifact, errors) {
  if (!valuesEqual(artifact.evidenceCarriers, buildEvidenceCarriers())) {
    addError(errors, "EVIDENCE_CARRIER_INVALID");
  }
  const seen = new Set();
  for (const carrier of artifact.evidenceCarriers ?? []) {
    if (!isNonBlank(carrier.id) || seen.has(carrier.id)) {
      addError(errors, "EVIDENCE_CARRIER_INVALID");
      continue;
    }
    seen.add(carrier.id);
    try {
      const bytes = carrier.kind === "current_path"
        ? readCurrent(carrier.path)
        : carrier.kind === "git_object"
          ? readGit(carrier.commit, carrier.path)
          : null;
      if (!bytes || sha256(bytes) !== carrier.sha256 || !locatorResolves(bytes, carrier.locator)) {
        addError(errors, "EVIDENCE_CARRIER_INVALID");
      }
      if (carrier.kind === "current_path") {
        const committedBytes = readGit(carrier.commit, carrier.path);
        if (sha256(committedBytes) !== carrier.sha256 || !bytes.equals(committedBytes)) {
          addError(errors, "EVIDENCE_CARRIER_INVALID");
        }
      }
    } catch {
      addError(errors, "EVIDENCE_CARRIER_INVALID");
    }
  }
}

function validateRuntimeContract(runtime, errors) {
  if (runtime?.classification !== "fallback_treatment_candidate") addError(errors, "RUNTIME_CLASSIFICATION_INVALID");
  if (runtime?.sellable !== false) addError(errors, "SELLABLE_ENABLED");
  if (runtime?.paymentAllowed !== false) addError(errors, "PAYMENT_ENABLED");
  if (runtime?.checkoutSuppressed !== true) addError(errors, "CHECKOUT_ENABLED");
  if (runtime?.packetCreditConsumption !== "none") addError(errors, "PACKET_CREDIT_ENABLED");
  if (runtime?.partnerCreditConsumption !== "none") addError(errors, "PARTNER_CREDIT_ENABLED");
  if (runtime?.partnerCreditConsumed !== false) addError(errors, "RUNTIME_PARTNER_CREDIT_ENABLED");
  if (runtime?.rendererKind !== "none") addError(errors, "RENDERER_ENABLED");
  if (runtime?.renderJobAllowed !== false) addError(errors, "RENDER_JOB_ENABLED");
  if (runtime?.packetPlan !== null) addError(errors, "PACKET_PLAN_PRESENT");
  if (runtime?.packetPromise !== "none") addError(errors, "PACKET_PROMISE_PRESENT");
  if (runtime?.status !== "guidance_saved" || runtime?.resultCode !== "guidance_only" || runtime?.packetType !== "guidance_packet") {
    addError(errors, "BRIEFCASE_STATE_INVALID");
  }
  if (runtime?.paymentStatus !== "not_applicable" || runtime?.packetStatus !== "not_started" || runtime?.briefcaseHandoffRequired !== true) {
    addError(errors, "BRIEFCASE_STATE_INVALID");
  }
  if (runtime?.runtimeAdoptionStatus !== "not_registered_not_route_bound"
    || runtime?.serverSaveHandoffStatus !== "not_wired_for_exact_supported_deferral") {
    addError(errors, "RUNTIME_ADOPTION_POSTURE_INVALID");
  }
  if (runtime?.requirementOnlyNotCurrentRuntimeAssertion !== true) addError(errors, "RUNTIME_REQUIREMENT_POSTURE_INVALID");
  const forbiddenKeys = ["price", "priceCents", "session", "sessionId", "intent", "intentId", "amount", "amountCents", "receipt", "receiptUrl", "artifact", "download", "job"];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(runtime ?? {}, key)) addError(errors, "FORBIDDEN_COMMERCE_OR_ARTIFACT_FIELD");
  }
}

function validateParticipantTreatment(trackId, participant, carrierById, errors) {
  const requiredClaim = (value, expectedId) => value
    && value.claimId === expectedId
    && isNonBlank(value.en, 8)
    && isNonBlank(value.es, 8)
    && Array.isArray(value.evidenceRefs)
    && value.evidenceRefs.length > 0;
  if (!isNonBlank(participant?.unavailableReason?.en, 40)) addError(errors, "MISSING_REASON");
  if (!isNonBlank(participant?.destination?.name, 5) || !isNonBlank(participant?.destination?.kind) || !validOptionalHttps(participant?.destination?.url)) {
    addError(errors, "MISSING_NAMED_DESTINATION");
  }
  if (!isNonBlank(participant?.nextAction?.en, 30)) addError(errors, "MISSING_NEXT_ACTION");
  if (!requiredClaim(participant?.unavailableReason, `${trackId}.unavailable_reason`)) addError(errors, "MISSING_REASON");
  if (!requiredClaim(participant?.participantFiles?.guidance, `${trackId}.legalease_filing_instruction`)) addError(errors, "UNSUPPORTED_LEGALEASE_FILING");
  if (!requiredClaim(participant?.destination?.guidance, `${trackId}.official_destination`)) addError(errors, "MISSING_NAMED_DESTINATION");
  if (!requiredClaim(participant?.nextAction, `${trackId}.next_action`)) addError(errors, "MISSING_NEXT_ACTION");
  if (!Array.isArray(participant?.gather) || participant.gather.length === 0 || participant.gather.some((item, index) => !requiredClaim(item, `${trackId}.gather_${index + 1}`))) addError(errors, "GATHER_MISSING");
  if (!Array.isArray(participant?.doNot) || participant.doNot.length === 0 || participant.doNot.some((item, index) => !requiredClaim(item, `${trackId}.do_not_${index + 1}`))) addError(errors, "DO_NOT_MISSING");
  if (participant?.participantFiles?.filesAnythingFromLegalEase !== false) addError(errors, "UNSUPPORTED_LEGALEASE_FILING");
  if (!requiredClaim(participant?.packetAbsenceDisclosure, `${trackId}.packet_absence`)) addError(errors, "PACKET_ABSENCE_MISSING");
  if (!requiredClaim(participant?.briefcase?.preserved, `${trackId}.briefcase_preserved`)) addError(errors, "BRIEFCASE_PRESERVATION_MISSING");
  if (!requiredClaim(participant?.briefcase?.outstanding, `${trackId}.briefcase_outstanding`)) addError(errors, "BRIEFCASE_OUTSTANDING_MISSING");
  if (
    !requiredClaim(participant?.briefcase?.return, `${trackId}.briefcase_return`)
    || !requiredClaim(participant?.briefcase?.resumeTrigger, `${trackId}.briefcase_resume_trigger`)
    || participant?.briefcase?.reuseCompletedWork?.requirementOnlyNotCurrentRuntimeAssertion !== true
    || participant?.briefcase?.reuseCompletedWork?.savedGuidanceReusableAfterAdoption !== true
    || participant?.briefcase?.reuseCompletedWork?.savedIntakeAnswersClaimed !== false
    || participant?.briefcase?.reuseCompletedWork?.savedUploadsClaimed !== false
  ) {
    addError(errors, "BRIEFCASE_RETURN_MISSING");
  }
  if (!requiredClaim(participant?.escalation?.guidance, `${trackId}.escalation`) || !isNonBlank(participant?.escalation?.name) || !validOptionalHttps(participant?.escalation?.url)) {
    addError(errors, "ESCALATION_MISSING");
  }

  const claims = collectClaims(participant);
  const claimIds = claims.map((item) => item.claimId);
  if (new Set(claimIds).size !== claimIds.length) addError(errors, "CLAIM_ID_DUPLICATE");
  for (const item of claims) {
    if (!isNonBlank(item.en, 8)) addError(errors, "MISSING_ENGLISH");
    if (!isNonBlank(item.es, 8)) addError(errors, "MISSING_SPANISH");
    if (isNonBlank(item.en) && isNonBlank(item.es) && item.en.trim().toLocaleLowerCase() === item.es.trim().toLocaleLowerCase()) {
      addError(errors, "NON_SUBSTANTIVE_SPANISH");
    }
    if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0) {
      addError(errors, "CLAIM_EVIDENCE_MISSING");
    } else if (item.evidenceRefs.some((ref) => !carrierById.has(ref))) {
      addError(errors, "CLAIM_EVIDENCE_MISSING");
    }
    if (item.claimType === "legal_procedural" && !item.evidenceRefs?.some((ref) => carrierById.get(ref)?.supports?.includes("legal_procedural"))) {
      addError(errors, "UNSUPPORTED_CLAIM");
    }
  }
  const participantText = collectClaims(participant).flatMap((item) => [item.en, item.es]).join("\n").toLocaleLowerCase();
  const promisePatterns = [
    "may become available",
    "we will save it",
    "coming soon",
    "podría estar disponible",
    "lo guardaremos"
  ];
  if (promisePatterns.some((pattern) => participantText.includes(pattern))) addError(errors, "PACKET_PROMISE_PRESENT");
  if (PARTICIPANT_FORBIDDEN_PHRASES.some((phrase) => participantText.includes(phrase))) addError(errors, "INTERNAL_JARGON_PRESENT");
  if (!claims.some((item) => item.claimId === `${trackId}.commercial_disclosure`)) addError(errors, "COMMERCIAL_DISCLOSURE_MISSING");
}

function validateCandidate(artifact, { verifyEvidence = false } = {}) {
  const errors = [];
  const expectedArtifact = expectedCandidateReference();
  const carrierById = new Map((artifact.evidenceCarriers ?? []).map((carrier) => [carrier.id, carrier]));
  if (artifact.schemaVersion !== "rcap-d-v5-fallback-treatments/v1" || artifact.baseCommit !== BASE_COMMIT) addError(errors, "SCHEMA_OR_BASE_INVALID");
  if (
    artifact.status !== "candidate_ready_for_independent_review"
    || artifact.posture?.artifactOnly !== true
    || artifact.posture?.technicalApprovalIssued !== false
    || artifact.posture?.legalApprovalIssued !== false
    || artifact.posture?.promotionIssued !== false
    || artifact.posture?.canonicalLedgerRegenerated !== false
    || artifact.posture?.factoryOrFamilyImplementationEdited !== false
  ) {
    addError(errors, "UNAUTHORIZED_STATUS");
  }
  const policy = artifact.activationPolicy;
  if (
    policy?.packetCandidateWinsWhen?.d0V5 !== "pass"
    || policy?.packetCandidateWinsWhen?.independentlyApprovedProductionPacket !== true
    || policy?.packetCandidateWinsWhen?.action !== "production_packet_remains_available_and_fallback_is_unused"
    || !valuesEqual(policy?.fallbackBecomesTerminalWhen?.conditionAny, ["d0_v5_failed", "geometry_remains_unmeasurable"])
    || policy?.fallbackBecomesTerminalWhen?.independentlyReviewedFallbackRequired !== true
    || policy?.returnToFactory !== false
  ) addError(errors, "HARD_RULE_VIOLATION");
  if (artifact.scopeInputs?.systemicScan?.status !== "d0_v5_additional_family_list_not_available_at_base"
    || artifact.scopeInputs?.systemicScan?.priorD0V4ScanUsedAsNegativeProof !== false) {
    addError(errors, "SYSTEMIC_SCAN_POSTURE_INVALID");
  }
  if (!valuesEqual(artifact.scopeInputs, expectedArtifact.scopeInputs)) addError(errors, "SYSTEMIC_SCAN_POSTURE_INVALID");

  const families = artifact.familyAnalysis ?? [];
  if (!valuesEqual(families, expectedArtifact.familyAnalysis)) addError(errors, "FAMILY_ANALYSIS_MISMATCH");
  const familyIds = families.map((family) => family.familyId);
  if (!valuesEqual([...familyIds].sort(), [...SEED_FAMILIES].sort())) addError(errors, "FAMILY_SCOPE_MISMATCH");
  if (new Set(familyIds).size !== familyIds.length) addError(errors, "FAMILY_DUPLICATE");
  for (const family of families) {
    const expected = independentlyClassifyFamily(family.familyId);
    if (family.classification !== expected) {
      if (expected === "relationship_unresolved" && family.classification === "orphaned_inventory_no_canonical_track_relationship") {
        addError(errors, "UNSUPPORTED_ORPHAN_CLASSIFICATION");
      }
      addError(errors, "FAMILY_CLASSIFICATION_MISMATCH");
    }
    if (family.classification === "orphaned_inventory_no_canonical_track_relationship" && family.launchBlocking !== false) {
      addError(errors, "ORPHAN_BLOCKING");
    }
    if (["optional_or_supporting", "relationship_unresolved"].includes(family.classification) && family.launchBlocking !== false) {
      addError(errors, "NONACTIVE_FAMILY_BLOCKING");
    }
    if (family.classification === "active_required" && family.launchBlocking !== true) addError(errors, "ACTIVE_FAMILY_NOT_BLOCKING");
    if (
      !isNonBlank(family.sourceCurrentness?.revision)
      || !isNonBlank(family.sourceCurrentness?.freshnessStatus)
      || !isNonBlank(family.sourceCurrentness?.sourceSha256, 64)
      || family.sourceCurrentness?.generationAllowed !== false
      || family.sourceCurrentness?.evidenceRef !== SOURCE_REF_BY_FAMILY.get(family.familyId)
    ) addError(errors, "SOURCE_CURRENTNESS_INVALID");
    if (!Array.isArray(family.evidenceRefs) || family.evidenceRefs.length === 0 || family.evidenceRefs.some((ref) => !carrierById.has(ref))) {
      addError(errors, "FAMILY_EVIDENCE_MISSING");
    }
  }

  const expectedTracks = expectedActiveTrackIds();
  const treatments = artifact.treatments ?? [];
  const treatmentIds = treatments.map((treatment) => treatment.trackId);
  if (new Set(treatmentIds).size !== treatmentIds.length) addError(errors, "ACTIVE_TRACK_DUPLICATE");
  for (const trackId of expectedTracks) if (!treatmentIds.includes(trackId)) addError(errors, "ACTIVE_TRACK_MISSING");
  for (const trackId of treatmentIds) if (!expectedTracks.includes(trackId)) addError(errors, "ACTIVE_TRACK_EXTRA");
  const allowedCandidates = new Set(["complete_guidance_candidate", "exact_supported_deferral_candidate", "deliberate_scope_exclusion_candidate"]);
  for (const treatment of treatments) {
    const expectedTreatment = expectedArtifact.treatments.find((item) => item.trackId === treatment.trackId);
    if (!allowedCandidates.has(treatment.candidateTreatment) || treatment.candidateTreatment !== "exact_supported_deferral_candidate") {
      addError(errors, "UNSUPPORTED_TREATMENT");
    }
    if (treatment.status !== "candidate_only_not_approved_not_promoted" || treatment.technicalApprovalIssued !== false || treatment.legalApprovalIssued !== false || treatment.promotionEffect !== "none") {
      addError(errors, "UNAUTHORIZED_STATUS");
    }
    if (!valuesEqual(treatment.adoptionContinuity, expectedTreatment?.adoptionContinuity)) {
      addError(errors, "ADOPTION_CONTINUITY_MISMATCH");
    }
    const dTrack = dMap.tracks.find((track) => track.trackId === treatment.trackId);
    const expectedTriggers = (dTrack?.requiredFamilyIds ?? []).filter((familyId) => SEED_FAMILIES.includes(familyId)).sort();
    if (!valuesEqual(treatment.triggerFamilyIds, expectedTriggers)) addError(errors, "TRIGGER_FAMILY_MISMATCH");
    const expectedComponents = expectedComponentIds(treatment.trackId);
    const accounting = treatment.componentAccounting ?? {};
    const expectedAccounting = buildComponentAccounting(treatment.trackId);
    const detailedIds = (accounting.components ?? []).map((component) => component.componentId).sort();
    if (
      !valuesEqual(accounting.canonicalComponentIds, expectedComponents)
      || !valuesEqual(accounting.coveredComponentIds, expectedComponents)
      || !valuesEqual(detailedIds, expectedComponents)
      || (accounting.components ?? []).some((component) => component.coveredByFallback !== true)
    ) addError(errors, "HIDDEN_COMPONENT_OMISSION");
    if (!valuesEqual(accounting, expectedAccounting)) addError(errors, "COMPONENT_METADATA_MISMATCH");
    for (const component of accounting.components ?? []) {
      const expectedDisposition = component.familyId
        ? finalFamilyHandoff.families.find((family) => family.familyId === component.familyId)?.finalDisposition ?? "missing_from_final_253_handoff"
        : component.officialFormId
          ? "no_exact_d_family_mapping"
          : "not_applicable_non_family_component";
      if (component.canonicalFamilyDisposition !== expectedDisposition) addError(errors, "FAMILY_DISPOSITION_MISMATCH");
    }
    validateParticipantTreatment(treatment.trackId, treatment.participantTreatment, carrierById, errors);
    if (!valuesEqual(treatment.participantTreatment, buildParticipantTreatment(treatment.trackId))) {
      addError(errors, "PARTICIPANT_TREATMENT_MISMATCH");
    }
    validateRuntimeContract(treatment.runtimeContract, errors);
    const legalClaimIds = collectClaims(treatment.participantTreatment)
      .filter((item) => item.claimType === "legal_procedural")
      .map((item) => item.claimId)
      .sort();
    const allClaimIds = new Set(collectClaims(treatment.participantTreatment).map((item) => item.claimId));
    for (const component of accounting.components ?? []) {
      if (!Array.isArray(component.evidenceRefs)
        || component.evidenceRefs.length === 0
        || component.evidenceRefs.some((ref) => !carrierById.has(ref))) {
        addError(errors, "COMPONENT_EVIDENCE_MISSING");
      }
      if (!component.officialFormId && (
        !Array.isArray(component.fallbackCoverageClaimIds)
        || component.fallbackCoverageClaimIds.length === 0
        || component.fallbackCoverageClaimIds.some((claimId) => !allClaimIds.has(claimId))
      )) addError(errors, "COMPONENT_GUIDANCE_COVERAGE_MISSING");
    }
    const authorityIds = (treatment.authority ?? []).map((item) => item.claimId).sort();
    if (!valuesEqual(authorityIds, legalClaimIds)) addError(errors, "AUTHORITY_COVERAGE_MISMATCH");
    const legalClaimById = new Map(collectClaims(treatment.participantTreatment)
      .filter((item) => item.claimType === "legal_procedural")
      .map((item) => [item.claimId, item]));
    for (const authority of treatment.authority ?? []) {
      if (!valuesEqual(authority.evidenceRefs, legalClaimById.get(authority.claimId)?.evidenceRefs)) {
        addError(errors, "AUTHORITY_EVIDENCE_MISMATCH");
      }
    }
    if (!Array.isArray(treatment.evidenceRefs)
      || treatment.evidenceRefs.length === 0
      || treatment.evidenceRefs.some((ref) => !carrierById.has(ref))
      || !Array.isArray(treatment.adoptionContinuity?.evidenceRefs)
      || treatment.adoptionContinuity.evidenceRefs.some((ref) => !carrierById.has(ref))) {
      addError(errors, "TREATMENT_EVIDENCE_MISSING");
    }
  }
  if (!Array.isArray(artifact.unsupportedTreatments) || artifact.unsupportedTreatments.length !== 0) addError(errors, "UNSUPPORTED_TREATMENT");
  if (artifact.safeForIndependentReview !== true) addError(errors, "REVIEW_READINESS_INVALID");
  const expectedRuntimeGapIds = [
    "briefcase_generic_future_packet_copy",
    "fallback_registry_route_adoption_missing",
    "server_exact_deferral_save_handoff_missing"
  ];
  const runtimeGaps = artifact.runtimeParityGaps ?? [];
  if (
    !valuesEqual(runtimeGaps, expectedArtifact.runtimeParityGaps)
    ||
    !valuesEqual(runtimeGaps.map((gap) => gap.gapId).sort(), expectedRuntimeGapIds)
    || runtimeGaps.some((gap) => gap.blocksCandidateReview !== false
      || gap.blocksRuntimeAdoptionUntilResolved !== true
      || gap.requiresAnotherFactoryCycle !== false
      || !Array.isArray(gap.currentEvidenceRefs)
      || gap.currentEvidenceRefs.length === 0
      || gap.currentEvidenceRefs.some((ref) => !carrierById.has(ref)))
  ) addError(errors, "RUNTIME_GAP_UNRECORDED");
  const expectedBlockerIds = [
    "BRIEFCASE-NO-PROMISE-RUNTIME-PARITY",
    "D-V5-LIST-NOT-AVAILABLE",
    "EXACT-DEFERRAL-SAVE-HANDOFF",
    "FALLBACK-REGISTRY-ROUTE-ADOPTION",
    "INDEPENDENT-FALLBACK-REVIEW-PENDING"
  ];
  const exactBlockers = artifact.exactBlockers ?? [];
  if (
    !valuesEqual(exactBlockers, expectedArtifact.exactBlockers)
    ||
    !valuesEqual(exactBlockers.map((blocker) => blocker.blockerId).sort(), expectedBlockerIds)
    || exactBlockers.some((blocker) => blocker.factoryCycleRequired !== false
      || !Array.isArray(blocker.evidenceRefs)
      || blocker.evidenceRefs.length === 0
      || blocker.evidenceRefs.some((ref) => !carrierById.has(ref)))
  ) addError(errors, "EXACT_BLOCKER_INVALID");

  const counts = artifact.counts ?? {};
  const countOf = (classification) => families.filter((family) => family.classification === classification).length;
  if (
    counts.familiesAnalyzed !== families.length
    || counts.activeRequiredFamilies !== countOf("active_required")
    || counts.optionalOrSupportingFamilies !== countOf("optional_or_supporting")
    || counts.orphanedFamilies !== countOf("orphaned_inventory_no_canonical_track_relationship")
    || counts.relationshipUnresolvedFamilies !== countOf("relationship_unresolved")
    || counts.activeTracks !== treatments.length
    || counts.completeGuidanceCandidates !== treatments.filter((item) => item.candidateTreatment === "complete_guidance_candidate").length
    || counts.exactSupportedDeferralCandidates !== treatments.filter((item) => item.candidateTreatment === "exact_supported_deferral_candidate").length
    || counts.deliberateScopeExclusionCandidates !== treatments.filter((item) => item.candidateTreatment === "deliberate_scope_exclusion_candidate").length
    || counts.unsupportedTreatments !== 0
  ) addError(errors, "COUNT_MISMATCH");
  if (verifyEvidence) validateEvidenceCarriers(artifact, errors);
  return errors.sort();
}

function buildReviewJobs(candidate, candidateSha256) {
  const jobs = candidate.treatments.map((treatment) => {
    const componentFamilyIds = exactSet(treatment.componentAccounting.components.map((component) => component.familyId).filter(Boolean));
    return {
      jobId: `D-V5-FALLBACK-${treatment.jurisdiction}-${treatment.trackId}`.toUpperCase().replaceAll("_", "-"),
      reviewKind: "d_v5_fallback_treatment_candidate",
      status: "pending_independent_review",
      trackId: treatment.trackId,
      jurisdiction: treatment.jurisdiction,
      triggerFamilyIds: [...treatment.triggerFamilyIds],
      componentFamilyIds,
      familyIds: [...componentFamilyIds],
      componentIds: [...treatment.componentAccounting.canonicalComponentIds],
      candidateArtifact: {
        path: "data/rcap-codex/d-v5-fallback-treatments/fallback-treatments.json",
        locator: `#/treatments[trackId=${treatment.trackId}]`,
        sha256: candidateSha256
      },
      authoringLane: "Codex bounded fallback-treatment lane",
      reviewerConstraint: "Reviewer must be independent from the authoring lane and may not treat job issuance as approval.",
      requiredQuestions: [
        "Does every legal or procedural claim resolve to the exact committed carrier named on the atomic claim?",
        "Are the English and Spanish reason, filing instruction, destination, next action, gather, do-not, Briefcase return, and escalation treatments complete and equivalent?",
        "Does the candidate suppress sale, checkout, packet credit, partner credit, rendering, artifacts, and any future-packet promise?",
        "Does the candidate preserve every canonical required or conditional packet component, including non-form and non-triggering components?",
        "Does the activation decision preserve an independently approved packet after D0-v5 passes and use the reviewed fallback only after failure or unmeasurable geometry, without another factory cycle?"
      ],
      closingOutcomes: ["fallback_treatment_approved", "correction_required", "unsupported_treatment"],
      technicalApprovalIssued: false,
      promotionEffect: "none; this job does not change the ledger, track, family, factory, or runtime"
    };
  }).sort((a, b) => a.jobId.localeCompare(b.jobId));
  return {
    schemaVersion: "rcap-d-v5-fallback-review-jobs/v1",
    baseCommit: BASE_COMMIT,
    status: "pending_independent_review",
    candidateArtifactSha256: candidateSha256,
    reviewerIndependenceRequired: true,
    jobCount: jobs.length,
    jobs,
    technicalApprovalIssued: false,
    promotionEffect: "none"
  };
}

function validateReviewJobs(candidate, jobsArtifact, candidateSha256) {
  const errors = [];
  if (!valuesEqual(jobsArtifact, buildReviewJobs(candidate, candidateSha256))) addError(errors, "REVIEW_JOB_INVALID");
  if (jobsArtifact.jobCount !== candidate.treatments.length || jobsArtifact.jobs?.length !== candidate.treatments.length) addError(errors, "REVIEW_JOB_COUNT_MISMATCH");
  const jobTracks = (jobsArtifact.jobs ?? []).map((job) => job.trackId).sort();
  const treatmentTracks = candidate.treatments.map((treatment) => treatment.trackId).sort();
  if (!valuesEqual(jobTracks, treatmentTracks) || new Set(jobTracks).size !== jobTracks.length) addError(errors, "REVIEW_JOB_TRACK_MISMATCH");
  for (const job of jobsArtifact.jobs ?? []) {
    const treatment = candidate.treatments.find((item) => item.trackId === job.trackId);
    const expectedComponentFamilyIds = exactSet((treatment?.componentAccounting.components ?? []).map((component) => component.familyId).filter(Boolean));
    if (
      job.status !== "pending_independent_review"
      || job.reviewKind !== "d_v5_fallback_treatment_candidate"
      || job.candidateArtifact?.sha256 !== candidateSha256
      || job.technicalApprovalIssued !== false
      || !job.promotionEffect?.startsWith("none")
      || !isNonBlank(job.reviewerConstraint)
      || !valuesEqual(job.triggerFamilyIds, treatment?.triggerFamilyIds)
      || !valuesEqual(job.componentFamilyIds, expectedComponentFamilyIds)
      || !valuesEqual(job.familyIds, expectedComponentFamilyIds)
      || !valuesEqual(job.componentIds, treatment?.componentAccounting.canonicalComponentIds)
    ) addError(errors, "REVIEW_JOB_INVALID");
  }
  return errors.sort();
}

function clone(value) {
  return structuredClone(value);
}

function runMutationSuite(pristine) {
  const first = (artifact) => artifact.treatments[0];
  const cases = [
    ["M01", "MISSING_REASON", (a) => { first(a).participantTreatment.unavailableReason.en = ""; }],
    ["M02", "MISSING_NAMED_DESTINATION", (a) => { first(a).participantTreatment.destination.name = ""; }],
    ["M03", "MISSING_NEXT_ACTION", (a) => { first(a).participantTreatment.nextAction.en = ""; }],
    ["M04", "MISSING_SPANISH", (a) => { first(a).participantTreatment.unavailableReason.es = ""; }],
    ["M05", "NON_SUBSTANTIVE_SPANISH", (a) => { first(a).participantTreatment.unavailableReason.es = first(a).participantTreatment.unavailableReason.en; }],
    ["M06", "PAYMENT_ENABLED", (a) => { first(a).runtimeContract.paymentAllowed = true; }],
    ["M07", "CHECKOUT_ENABLED", (a) => { first(a).runtimeContract.checkoutSuppressed = false; }],
    ["M08", "SELLABLE_ENABLED", (a) => { first(a).runtimeContract.sellable = true; }],
    ["M09", "PACKET_CREDIT_ENABLED", (a) => { first(a).runtimeContract.packetCreditConsumption = "one"; }],
    ["M10", "PARTNER_CREDIT_ENABLED", (a) => { first(a).runtimeContract.partnerCreditConsumption = "one"; }],
    ["M11", "RUNTIME_PARTNER_CREDIT_ENABLED", (a) => { first(a).runtimeContract.partnerCreditConsumed = true; }],
    ["M12", "RENDERER_ENABLED", (a) => { first(a).runtimeContract.rendererKind = "packet_document_v1"; }],
    ["M13", "RENDER_JOB_ENABLED", (a) => { first(a).runtimeContract.renderJobAllowed = true; }],
    ["M14", "PACKET_PLAN_PRESENT", (a) => { first(a).runtimeContract.packetPlan = { kind: "packet" }; }],
    ["M15", "PACKET_PROMISE_PRESENT", (a) => { first(a).runtimeContract.packetPromise = "future"; }],
    ["M16", "HIDDEN_COMPONENT_OMISSION", (a) => {
      const treatment = first(a);
      const hidden = treatment.componentAccounting.components.find((component) => component.familyId === null) ?? treatment.componentAccounting.components[0];
      treatment.componentAccounting.components = treatment.componentAccounting.components.filter((component) => component.componentId !== hidden.componentId);
      treatment.componentAccounting.coveredComponentIds = treatment.componentAccounting.coveredComponentIds.filter((id) => id !== hidden.componentId);
      treatment.componentAccounting.canonicalComponentIds = treatment.componentAccounting.canonicalComponentIds.filter((id) => id !== hidden.componentId);
    }],
    ["M17", "ACTIVE_TRACK_MISSING", (a) => { a.treatments.shift(); }],
    ["M18", "ACTIVE_TRACK_DUPLICATE", (a) => { a.treatments.push(clone(first(a))); }],
    ["M19", "NONACTIVE_FAMILY_BLOCKING", (a) => { a.familyAnalysis.find((family) => family.classification === "relationship_unresolved").launchBlocking = true; }],
    ["M20", "UNSUPPORTED_ORPHAN_CLASSIFICATION", (a) => { a.familyAnalysis.find((family) => family.classification === "relationship_unresolved").classification = "orphaned_inventory_no_canonical_track_relationship"; }],
    ["M21", "BRIEFCASE_PRESERVATION_MISSING", (a) => { delete first(a).participantTreatment.briefcase.preserved; }],
    ["M22", "BRIEFCASE_OUTSTANDING_MISSING", (a) => { delete first(a).participantTreatment.briefcase.outstanding; }],
    ["M23", "BRIEFCASE_RETURN_MISSING", (a) => { delete first(a).participantTreatment.briefcase.return; }],
    ["M24", "GATHER_MISSING", (a) => { first(a).participantTreatment.gather = []; }],
    ["M25", "DO_NOT_MISSING", (a) => { first(a).participantTreatment.doNot = []; }],
    ["M26", "UNSUPPORTED_LEGALEASE_FILING", (a) => { first(a).participantTreatment.participantFiles.filesAnythingFromLegalEase = true; }],
    ["M27", "CLAIM_EVIDENCE_MISSING", (a) => { first(a).participantTreatment.nextAction.evidenceRefs = []; }],
    ["M28", "EVIDENCE_CARRIER_INVALID", (a) => { a.evidenceCarriers[0].sha256 = "0".repeat(64); }],
    ["M29", "UNAUTHORIZED_STATUS", (a) => { first(a).status = "approved_for_live"; }],
    ["M30", "HARD_RULE_VIOLATION", (a) => { a.activationPolicy.returnToFactory = true; }],
    ["M31", "FORBIDDEN_COMMERCE_OR_ARTIFACT_FIELD", (a) => { first(a).runtimeContract.amountCents = 5000; }],
    ["M32", "ESCALATION_MISSING", (a) => { delete first(a).participantTreatment.escalation; }],
    ["M33", "TRIGGER_FAMILY_MISMATCH", (a) => { first(a).triggerFamilyIds = []; }],
    ["M34", "PACKET_PROMISE_PRESENT", (a) => { first(a).participantTreatment.packetAbsenceDisclosure.en = "A self-help packet may become available later. We will save it here."; }],
    ["M35", "INTERNAL_JARGON_PRESENT", (a) => { first(a).participantTreatment.nextAction.en = "Wait for technical review in the runtime lane before acting."; }],
    ["M36", "RUNTIME_CLASSIFICATION_INVALID", (a) => { first(a).runtimeContract.classification = "packet_ready"; }],
    ["M37", "UNAUTHORIZED_STATUS", (a) => { a.posture.legalApprovalIssued = true; }],
    ["M38", "PARTICIPANT_TREATMENT_MISMATCH", (a) => { first(a).participantTreatment.nextAction.en = "The court must grant this request after these records are gathered."; }],
    ["M39", "COMPONENT_METADATA_MISMATCH", (a) => { first(a).componentAccounting.components[0].role = "invented_role"; }],
    ["M40", "RUNTIME_GAP_UNRECORDED", (a) => { a.runtimeParityGaps = a.runtimeParityGaps.slice(1); }],
    ["M41", "COUNT_MISMATCH", (a) => { a.counts.completeGuidanceCandidates = 1; }],
    ["M44", "FAMILY_ANALYSIS_MISMATCH", (a) => { a.familyAnalysis[0].relationshipDetails = []; }],
    ["M45", "RUNTIME_GAP_UNRECORDED", (a) => { a.runtimeParityGaps[0].exactGap = ""; }],
    ["M46", "EXACT_BLOCKER_INVALID", (a) => { a.exactBlockers[0].exactBlocker = ""; }],
    ["M47", "ADOPTION_CONTINUITY_MISMATCH", (a) => { first(a).adoptionContinuity.evidenceRefs = []; }],
    ["M48", "SYSTEMIC_SCAN_POSTURE_INVALID", (a) => { a.scopeInputs.systemicScan.evidenceRefs = []; }]
  ];
  return cases.map(([mutationId, expectedError, mutate]) => {
    const mutant = clone(pristine);
    mutate(mutant);
    const errors = validateCandidate(mutant, { verifyEvidence: mutationId === "M28" });
    if (!errors.includes(expectedError)) {
      throw new Error(`${mutationId} survived: expected ${expectedError}; got ${errors.join(", ") || "no error"}`);
    }
    return { mutationId, expectedError, killed: true };
  });
}

function runReviewJobMutationSuite(candidate, pristineJobs, candidateSha256) {
  const cases = [
    ["M42", "REVIEW_JOB_INVALID", (jobs) => { jobs.reviewerIndependenceRequired = false; }],
    ["M43", "REVIEW_JOB_INVALID", (jobs) => { jobs.jobs[0].candidateArtifact.locator = "#/treatments[trackId=wrong]"; }]
  ];
  return cases.map(([mutationId, expectedError, mutate]) => {
    const mutant = clone(pristineJobs);
    mutate(mutant);
    const errors = validateReviewJobs(candidate, mutant, candidateSha256);
    if (!errors.includes(expectedError)) {
      throw new Error(`${mutationId} survived: expected ${expectedError}; got ${errors.join(", ") || "no error"}`);
    }
    return { mutationId, expectedError, killed: true };
  });
}

function changedPathsAgainstBase() {
  const commands = [
    ["diff", "--name-only", `${BASE_COMMIT}...HEAD`],
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"]
  ];
  const paths = new Set();
  for (const args of commands) {
    const output = execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
    for (const value of output.split("\n").map((item) => item.trim()).filter(Boolean)) paths.add(value);
  }
  return [...paths].sort();
}

function assertAllowedPathScope() {
  const allowed = [
    "data/rcap-codex/d-v5-fallback-treatments/",
    "docs/rcap/codex/d-v5-fallback-treatments/"
  ];
  const invalid = changedPathsAgainstBase().filter((path) => !allowed.some((prefix) => path.startsWith(prefix)));
  if (invalid.length) throw new Error(`Out-of-scope changed path(s): ${invalid.join(", ")}`);
}

function buildVerificationResult(candidate, candidateSha256, jobs, jobsSha256, mutations) {
  const claims = candidate.treatments.flatMap((treatment) => collectClaims(treatment.participantTreatment));
  return {
    schemaVersion: "rcap-d-v5-fallback-verification/v1",
    baseCommit: BASE_COMMIT,
    status: "pass_candidate_ready_for_independent_review",
    outputHashes: {
      fallbackTreatmentsSha256: candidateSha256,
      reviewJobsSha256: jobsSha256
    },
    results: {
      affectedActiveTrackCoverage: { expected: 6, actual: candidate.treatments.length, result: "pass_exactly_once" },
      familyClassification: {
        analyzed: candidate.familyAnalysis.length,
        activeRequired: candidate.counts.activeRequiredFamilies,
        optionalOrSupporting: candidate.counts.optionalOrSupportingFamilies,
        orphaned: candidate.counts.orphanedFamilies,
        relationshipUnresolved: candidate.counts.relationshipUnresolvedFamilies,
        result: "pass"
      },
      candidateDisposition: {
        completeGuidance: candidate.counts.completeGuidanceCandidates,
        exactSupportedDeferral: candidate.counts.exactSupportedDeferralCandidates,
        deliberateScopeExclusion: candidate.counts.deliberateScopeExclusionCandidates,
        unsupported: candidate.counts.unsupportedTreatments,
        result: "pass"
      },
      englishSpanish: {
        pairedAtomicClaims: claims.length,
        missingEnglish: 0,
        missingSpanish: 0,
        copiedEnglishAsSpanish: 0,
        result: "pass"
      },
      evidence: {
        exactCarriersVerified: candidate.evidenceCarriers.length,
        atomicClaimsWithEvidence: claims.length,
        unsupportedLegalProceduralClaims: 0,
        result: "pass"
      },
      componentAccounting: { hiddenOrMissingComponents: 0, result: "pass" },
      briefcase: {
        candidateRequiresSavedGuidancePreservationOutstandingAndReturn: true,
        savedIntakeOrUploadPersistenceClaimed: false,
        runtimeAdoptionPending: true,
        result: "pass_candidate_contract"
      },
      paymentAndCredits: {
        sellable: false,
        paymentAllowed: false,
        checkoutSuppressed: true,
        packetCreditConsumption: "none",
        partnerCreditConsumption: "none",
        result: "pass_candidate_contract_not_runtime_adoption"
      },
      renderAndPromise: { renderJobs: 0, packetPromise: "none", result: "pass_candidate_contract" },
      runtimeParityGaps: {
        recorded: candidate.runtimeParityGaps.length,
        gapIds: candidate.runtimeParityGaps.map((gap) => gap.gapId).sort(),
        blocksRuntimeAdoptionUntilResolved: true,
        candidateReviewBlocked: false,
        factoryCycleRequired: false,
        result: "pass_all_known_gaps_recorded"
      },
      systemicScan: { d0V5ListAvailableAtBase: false, priorV4ZeroUsedAsProof: false, result: "pass_exact_limitation_recorded" },
      reviewJobs: { expected: candidate.treatments.length, actual: jobs.jobCount, result: "pass_exactly_once" },
      deterministicOutput: { candidateGeneratedTwiceIdentically: true, jobsGeneratedTwiceIdentically: true, lfTerminatedCanonicalJson: true, result: "pass" },
      pathScope: { onlyCodexOwnedOutputDirectories: true, result: "pass" },
      cleanTreeRequirement: { requiredAfterCommit: true, verifierCheckModeNonMutating: true }
    },
    mutations: {
      total: mutations.length,
      killed: mutations.filter((mutation) => mutation.killed).length,
      result: mutations.every((mutation) => mutation.killed) ? "pass" : "fail",
      cases: mutations
    },
    reviewDoesNotApproveOrPromote: true,
    safeForIndependentReview: true
  };
}

function writeOrCheck(path, bytes) {
  if (checkMode) {
    let actual;
    try {
      actual = readFileSync(path, "utf8");
    } catch {
      throw new Error(`Missing generated artifact: ${relative(repoRoot, path)}`);
    }
    if (actual !== bytes) throw new Error(`Generated artifact is stale: ${relative(repoRoot, path)}`);
  } else {
    writeFileSync(path, bytes, "utf8");
  }
}

const statusBefore = checkMode
  ? execFileSync("git", ["status", "--porcelain=v1"], { cwd: repoRoot, encoding: "utf8" })
  : null;
assertAllowedPathScope();
const candidate = buildCandidateArtifact();
const candidateAgain = buildCandidateArtifact();
const candidateBytes = serialize(candidate);
if (candidateBytes !== serialize(candidateAgain)) throw new Error("Candidate generation is nondeterministic");
const candidateErrors = validateCandidate(candidate, { verifyEvidence: true });
if (candidateErrors.length) throw new Error(`Candidate validation failed: ${candidateErrors.join(", ")}`);
const candidateSha256 = sha256(Buffer.from(candidateBytes, "utf8"));
const jobs = buildReviewJobs(candidate, candidateSha256);
const jobsAgain = buildReviewJobs(candidateAgain, candidateSha256);
const jobsBytes = serialize(jobs);
if (jobsBytes !== serialize(jobsAgain)) throw new Error("Review-job generation is nondeterministic");
const jobErrors = validateReviewJobs(candidate, jobs, candidateSha256);
if (jobErrors.length) throw new Error(`Review-job validation failed: ${jobErrors.join(", ")}`);
const jobsSha256 = sha256(Buffer.from(jobsBytes, "utf8"));
const mutations = [
  ...runMutationSuite(candidate),
  ...runReviewJobMutationSuite(candidate, jobs, candidateSha256)
].sort((a, b) => Number(a.mutationId.slice(1)) - Number(b.mutationId.slice(1)));
const verification = buildVerificationResult(candidate, candidateSha256, jobs, jobsSha256, mutations);
const verificationBytes = serialize(verification);

writeOrCheck(candidatePath, candidateBytes);
writeOrCheck(jobsPath, jobsBytes);
writeOrCheck(verificationPath, verificationBytes);
assertAllowedPathScope();

if (checkMode) {
  const statusAfter = execFileSync("git", ["status", "--porcelain=v1"], { cwd: repoRoot, encoding: "utf8" });
  if (statusBefore !== statusAfter) throw new Error("Check mode changed the working tree");
}

process.stdout.write(JSON.stringify({
  mode: checkMode ? "check" : "write",
  status: "pass",
  candidateSha256,
  reviewJobsSha256: jobsSha256,
  familiesAnalyzed: candidate.counts.familiesAnalyzed,
  activeTracks: candidate.counts.activeTracks,
  exactDeferrals: candidate.counts.exactSupportedDeferralCandidates,
  orphanedFamilies: candidate.counts.orphanedFamilies,
  relationshipUnresolvedFamilies: candidate.counts.relationshipUnresolvedFamilies,
  reviewJobs: jobs.jobCount,
  mutationsKilled: mutations.length
}, null, 2) + "\n");
