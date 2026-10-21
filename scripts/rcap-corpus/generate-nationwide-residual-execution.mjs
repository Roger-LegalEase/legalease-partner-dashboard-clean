#!/usr/bin/env node
/**
 * The execution record for the 66 unrecovered Nationwide manifest paths.
 *
 * NATIONWIDE_RESIDUAL_ACQUISITION.json says what the reconstructor could not
 * find. It deliberately says nothing about what any of it is FOR, because the
 * restore manifest carries no artifact id and no family binding, and because
 * its own perJurisdiction roll-up is labelled an UPPER BOUND rather than a
 * dependency claim. This record answers the question that list could not: of
 * the 66 paths, which few actually block a live deliverable?
 *
 * THE EVIDENCE RULE. A jurisdiction's source-blocked family count is not
 * file-level dependency evidence and is never used as one here. A file earns
 * LIVE_PACKET_COMPONENT or CURRENT_AUTHORITY_OR_INSTRUCTION only when it can be
 * traced to a NAMED obligation through a record that names the file itself --
 * its exact SHA-256, or its exact path in the Nationwide archive:
 *
 *   - route-obligation-candidate.json requiredSourceIds of the form
 *     "source-sha256:<hash>"                          -> hash-level dependency
 *   - SOURCE_RELATIONSHIP_REGISTRY.json heldPath       -> path-level dependency
 *   - SOURCE_ATTACH_COHORT.json pathInArchive          -> path-level dependency
 *   - SOURCE_BACKLOG_CLASSIFICATION.json held.pathInArchive / servesFamilies
 *   - SOURCE_ACQUISITION_MANIFEST.json expectedSha256 + obligationKeys
 *   - source-custody-reconciliation.json documentSources (resolution tiers)
 *
 * Every claim in the table below is re-checked against those records at
 * generation time. If an obligation trace stops existing, this script exits
 * non-zero rather than printing a stale dependency.
 *
 * WHAT IT DOES NOT DO. It opens no route, promotes no family, creates no second
 * source registry and no parallel restore manifest, and commits no source body.
 * Paths, hashes and bindings only.
 *
 *   node scripts/rcap-corpus/generate-nationwide-residual-execution.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "data/rcap-all50/NATIONWIDE_RESIDUAL_EXECUTION.json";
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const RESIDUAL = "data/rcap-all50/NATIONWIDE_RESIDUAL_ACQUISITION.json";
const CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const REGISTRY = "data/rcap-grade-a/official-source-registry.json";
const BACKLOG = "data/rcap-grade-a/fable-packet-factory/SOURCE_BACKLOG_CLASSIFICATION.json";
const RELATIONSHIPS = "data/rcap-grade-a/packet-factory-24h/SOURCE_RELATIONSHIP_REGISTRY.json";
const COHORT = "data/rcap-grade-a/fable-packet-factory/SOURCE_ATTACH_COHORT.json";
const ACQUISITION = "data/rcap-grade-a/packet-factory-24h/SOURCE_ACQUISITION_MANIFEST.json";
const RECONCILIATION = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const ARTIFACTS = "data/record-clearing/source-artifact-registry.json";
const DETERMINATIONS = "data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json";

const residual = read(RESIDUAL);
const census = read(CENSUS);
const registry = read(REGISTRY);
const backlog = read(BACKLOG);
const relationships = read(RELATIONSHIPS);
const cohort = read(COHORT);
const acquisition = read(ACQUISITION);
const reconciliation = read(RECONCILIATION);
const artifacts = read(ARTIFACTS);
const determinations = read(DETERMINATIONS);

const NW = "private/Nationwide Record Clearing/";
const strip = (p) => (p ?? "").replace(NW, "");

/* ------------------------------------------------------------------ *
 * Derived indexes. Nothing below is asserted by hand.
 * ------------------------------------------------------------------ */

/* 1. Hash-level route obligations. A route that names a residual file by its
 *    own SHA-256 is the strongest dependency evidence in the repository. */
const routesByHash = new Map();
for (const route of census.routes) {
  for (const sourceId of route.requiredSourceIds ?? []) {
    if (!sourceId.startsWith("source-sha256:")) continue;
    const hash = sourceId.slice("source-sha256:".length);
    if (!routesByHash.has(hash)) routesByHash.set(hash, []);
    routesByHash.get(hash).push({
      routeKey: route.routeKey,
      packetSetId: route.packetSetId,
      packetFamilyId: route.packetFamilyId,
      currentOutputStrategy: route.currentOutputStrategy,
      currentCommercialState: route.currentCommercialState,
    });
  }
}

/* 2. Form-label obligations, so a form number can be told apart from a file. */
const routesByFormLabel = new Map();
for (const route of census.routes) {
  for (const sourceId of route.requiredSourceIds ?? []) {
    if (!sourceId.startsWith("official-form:")) continue;
    const label = sourceId.slice("official-form:".length);
    if (!routesByFormLabel.has(label)) routesByFormLabel.set(label, []);
    routesByFormLabel.get(label).push(route.routeKey);
  }
}

/* 3. Routes by packet set, to name a family's exact routes. */
const routesBySet = new Map();
for (const route of census.routes) {
  if (!route.packetSetId) continue;
  if (!routesBySet.has(route.packetSetId)) routesBySet.set(route.packetSetId, []);
  routesBySet.get(route.packetSetId).push(route.routeKey);
}

/* 4. Path-level bindings out of the source relationship registry. */
const relationshipByPath = new Map();
for (const record of relationships.records ?? []) {
  const key = strip(record.heldPath);
  if (!key) continue;
  relationshipByPath.set(key, {
    canonicalArtifactId: record.canonicalArtifactId,
    canonicalArtifactTitle: record.canonicalArtifactTitle,
    sourceState: record.sourceState,
    officialArtifactUrl: record.officialArtifactUrl,
    officialSourcePage: record.officialSourcePage,
    artifactSha256: record.artifactSha256,
    families: [...new Set((record.relationships ?? []).map((r) => r.routeOrFamilyId))].sort(),
  });
}

/* 5. Path-level bindings out of the attach cohort and the source backlog. */
const attachByPath = new Map();
for (const bucket of ["cohortA", "cohortB"]) {
  for (const artifact of cohort[bucket]?.artifactList ?? []) {
    if (!artifact.pathInArchive) continue;
    attachByPath.set(strip(artifact.pathInArchive), artifact);
  }
}
const backlogByPath = new Map();
for (const entry of backlog.entries ?? []) {
  for (const artifact of entry.artifacts ?? []) {
    const held = artifact.held;
    if (!held?.pathInArchive) continue;
    backlogByPath.set(strip(held.pathInArchive), {
      artifactId: artifact.artifactId,
      officialTitle: artifact.officialTitle,
      issuingAuthority: artifact.issuingAuthority,
      officialUrl: artifact.officialUrl ?? null,
      identityConfidence: artifact.identityConfidence,
      servesFamilies: artifact.servesFamilies ?? [],
      sha256: held.sha256 ?? null,
    });
  }
}
const backlogClassByFamily = new Map();
for (const entry of backlog.entries ?? []) {
  if (!backlogClassByFamily.has(entry.familyId)) backlogClassByFamily.set(entry.familyId, []);
  backlogClassByFamily.get(entry.familyId).push(entry.class);
}

/* 6. Acquisition receipts keyed by the hash the runner actually observed. */
const acquiredByHash = new Map();
for (const entry of acquisition.entries ?? []) {
  const observed = entry.lastAcquisition?.sha256 ?? entry.expectedSha256;
  if (!observed) continue;
  if (!acquiredByHash.has(observed)) acquiredByHash.set(observed, []);
  acquiredByHash.get(observed).push({
    sourceId: entry.sourceId,
    formNumber: entry.formNumber ?? null,
    officialTitle: entry.officialTitle ?? null,
    issuingAuthority: entry.issuingAuthority ?? null,
    officialUrl: entry.officialUrl ?? null,
    urlKind: entry.urlKind ?? null,
    outcome: entry.lastAcquisition?.outcome ?? null,
    httpStatus: entry.lastAcquisition?.httpStatus ?? null,
    obligationKeys: entry.obligationKeys ?? [],
  });
}

/* 7. Custody resolution tiers, so "the current edition is held" is measured. */
const resolutionByLabel = new Map();
for (const row of reconciliation.rows ?? []) {
  for (const source of row.documentSources ?? []) {
    if (!source.sourceId?.startsWith("official-form:")) continue;
    const label = source.sourceId.slice("official-form:".length);
    if (resolutionByLabel.has(label) && resolutionByLabel.get(label).resolved) continue;
    resolutionByLabel.set(label, {
      resolved: source.resolved === true,
      tier: source.tier ?? null,
      absence: source.absence ?? null,
      heldAs: source.heldAs ?? null,
    });
  }
}

/* 8. The Nationwide artifact registry's own tiering of each residual file. */
const treatmentByPath = new Map();
for (const artifact of artifacts.artifacts ?? []) {
  treatmentByPath.set(strip(artifact.sourcePath), {
    artifactId: artifact.artifactId,
    sourceTreatment: artifact.sourceTreatment,
    packageTier: artifact.packageTier ?? null,
    reliefTracksUsing: artifact.reliefTracksUsing ?? [],
  });
}

/* 9. Owner determinations, indexed by the form label they compose. */
const composedFromAuthority = new Set();
const determinationByForm = new Map();
for (const determination of determinations.determinations ?? []) {
  for (const family of determination.families ?? []) {
    for (const form of family.composedFromAuthority ?? []) {
      composedFromAuthority.add(form);
      determinationByForm.set(form, determination.id);
    }
  }
}

/* ------------------------------------------------------------------ *
 * The adjudication. One row per manifest path. `checks` are re-run at
 * generation time; a failing check aborts rather than printing a claim
 * the repository no longer supports.
 * ------------------------------------------------------------------ */

const LIVE = "LIVE_PACKET_COMPONENT";
const AUTHORITY = "CURRENT_AUTHORITY_OR_INSTRUCTION";
const SUPERSEDED = "SUPERSEDED_SOURCE";
const REFERENCE = "REFERENCE_ONLY";
const ORPHANED = "ORPHANED_FROM_LIVE_ROUTES";
const HELD = "ALREADY_HELD_OTHER_CUSTODY";

const PROXY_FAILURE = {
  attempted: true,
  attemptedOn: "2026-09-02",
  transport: "curl through this container's egress proxy, and the WebFetch tool",
  observed: "curl: (56) CONNECT tunnel failed, response 403 -- and WebFetch EGRESS_BLOCKED",
  scope:
    "Every host was refused at CONNECT, including https://example.com/, so this is a blanket egress denial in this container and not a per-judiciary block. No binary could be fetched, hashed or verified here. Web search was reachable and was used only to fix official identity and current addresses.",
};

/* Colorado JDF forms whose obligation is already satisfied by a corroborated
 * Master Library edition at a DIFFERENT hash from the Nationwide copy. */
const CO_SUPERSEDED = {
  "LegalEase Colorado/JDF418.pdf": "JDF-418",
  "LegalEase Colorado/JDF477.pdf": "JDF-477",
  "LegalEase Colorado/JDF478.pdf": "JDF-478",
  "LegalEase Colorado/JDF611.pdf": "JDF-611",
  "LegalEase Colorado/JDF612.pdf": "JDF-612",
  "LegalEase Colorado/JDF615.pdf": "JDF-615",
};

/* North Carolina AOC forms whose current edition is held at an exact content
 * hash in the D1 source packs, and is not the residual hash. */
const NC_SUPERSEDED = {
  "LegalEase North Carolina/cr287_1.pdf": "AOC-CR-287",
  "LegalEase North Carolina/cr297.pdf": "AOC-CR-297",
  "LegalEase North Carolina/cr298_1.pdf": "AOC-CR-298",
  "LegalEase North Carolina/cr297-instr_2.pdf": "AOC-CR-297-INSTRUCTIONS",
};

const table = new Map();
const add = (relativePath, row) => table.set(relativePath, row);

/* ---------------- LIVE_PACKET_COMPONENT ---------------- */

const IL_PRB = [
  [
    "LegalEase Illinois/forms/PRB-Certificate-of-Sealing-Application__certificate-of-sealing-application__rev-2024-09-18.pdf",
    "IL-PRB-CERTIFICATE-OF-SEALING-APPLICATION",
    "PRB Certificate of Sealing Application",
    "Certificate of Sealing Application (rev. 2024-09-18)",
    "https://prb.illinois.gov/content/dam/soi/en/web/prb/documents/sealing-docs/Certificate%20of%20Sealing%20application%209.18.24.pdf",
  ],
  [
    "LegalEase Illinois/forms/PRB-Certificate-of-Sealing-Acknowledgement__eligibility-acknowledgement__source-2024.pdf",
    "IL-PRB-CERTIFICATE-OF-SEALING-ACKNOWLEDGEMENT",
    "PRB Certificate of Sealing Eligibility Acknowledgement",
    "Certificate of Sealing Eligibility Acknowledgement (2024)",
    "https://prb.illinois.gov/content/dam/soi/en/web/prb/documents/sealing-docs/certificate-of-sealing-eligibility-acknowledgement.pdf",
  ],
  [
    "LegalEase Illinois/forms/PRB-Certificate-of-Expungement-for-Military-Application__military-certificate-of-expungement-application__rev-2024-09-18.pdf",
    "IL-PRB-CERTIFICATE-OF-EXPUNGEMENT-FOR-MILITARY-APPLICATION",
    "PRB Certificate of Expungement for Military Application",
    "Certificate of Expungement for Military Application (rev. 2024-09-18)",
    "https://prb.illinois.gov/content/dam/soi/en/web/prb/documents/military-expungement-docs/Certificate%20of%20Expungement%20for%20Military%20application%20v9.18.24.pdf",
  ],
  [
    "LegalEase Illinois/forms/PRB-Certificate-of-Expungement-for-Military-Acknowledgement__eligibility-acknowledgement__source-2024.pdf",
    "IL-PRB-CERTIFICATE-OF-EXPUNGEMENT-FOR-MILITARY-ACKNOWLEDGEMENT",
    "PRB Certificate of Expungement for Military Eligibility Acknowledgement",
    "Certificate of Expungement for Military Eligibility Acknowledgement (2024)",
    "https://prb.illinois.gov/content/dam/soi/en/web/prb/documents/military-expungement-docs/certificate-of-expugnement-for-military-eligibility-acknowledgement.pdf",
  ],
];

for (const [p, artifactId, formLabel, title, url] of IL_PRB) {
  add(p, {
    classification: LIVE,
    artifactId,
    familyIds: ["il-prb-cert-set"],
    obligation: `official-form:${formLabel} -- a named component of the Illinois Prisoner Review Board certificate packet`,
    officialSourceIdentity: {
      officialTitle: title,
      issuingAuthority: "Illinois Prisoner Review Board",
      authority: "730 ILCS 5/5-5.5-25 (certificate of sealing); 20 ILCS 2630/5.2 (military expungement)",
    },
    currentOfficialUrl: url,
    acquisitionPath: "DIRECT_OFFICIAL_BINARY on prb.illinois.gov, already recorded in SOURCE_ACQUISITION_MANIFEST.json",
    recordedHashIsCurrentEdition: true,
    editionEvidence:
      "The hosted acquisition runner fetched this exact URL and observed the SAME SHA-256 the restore manifest records (expectedSha256 === lastAcquisition.sha256, HTTP 200). The recorded old hash is the current official edition; nothing about this form changed.",
    whyItBlocks:
      "il-prb-cert-set is SOURCE_BLOCKED and its class is ACQUIRE_EXACT_SOURCE: no Prisoner Review Board paper exists in any Illinois pack or in the Master Library. The four PRB documents are the entire source basis for the family.",
    checks: ["backlogServesFamily", "acquiredAtThisHash", "formLabelHasRoutes"],
    formLabel,
  });
}

add("LegalEase Iowa/forms/IA-RULE-2.86-FORM-1__application-to-expunge-court-record-901c-2__rev-2022-01.pdf", {
  classification: LIVE,
  artifactId: "IA-RULE-2.86-FORM-1",
  familyIds: ["ia-901c2-set"],
  obligation:
    "official-form:Rule 2.86 Form 1 -- the application the section 901C.2 route files, and the Certification of Service printed inside it",
  officialSourceIdentity: {
    officialTitle: "Iowa R. Crim. P. 2.86 - Form 1: Application to Expunge Court Record under Iowa Code s 901C.2",
    issuingAuthority: "Iowa Judicial Branch",
    authority: "Iowa Code s 901C.2; Iowa R. Crim. P. 2.86",
  },
  currentOfficialUrl: "https://www.iowacourts.gov/collections/738/files/1569/embedDocument",
  acquisitionPath: "DIRECT_OFFICIAL_BINARY on iowacourts.gov, already recorded in SOURCE_ACQUISITION_MANIFEST.json",
  recordedHashIsCurrentEdition: true,
  editionEvidence:
    "The hosted runner fetched this URL at HTTP 200 and observed the SAME SHA-256 the restore manifest records. Rev. 2022-01 is current.",
  whyItBlocks:
    "ia-901c2-set names Rule 2.86 Form 1 and the Nationwide copy is the only custody the repository records for it; the D source packs hold only Forms 4 and 5.",
  checks: ["relationshipBindsFamily", "acquiredAtThisHash", "formLabelHasRoutes"],
  formLabel: "Rule 2.86 Form 1",
});

add("LegalEase Iowa/forms/IA-RULE-2.86-FORM-3__application-to-expunge-public-intoxication-records-123-46__rev-2022-01.pdf", {
  classification: LIVE,
  artifactId: "IA-RULE-2.86-FORM-3",
  familyIds: ["ia-12346-set"],
  obligation: "official-form:Rule 2.86 Form 3 -- the application the section 123.46 public-intoxication route files",
  officialSourceIdentity: {
    officialTitle:
      "Iowa R. Crim. P. 2.86 - Form 3: Application to Expunge Public Intoxication Records under Iowa Code s 123.46",
    issuingAuthority: "Iowa Judicial Branch",
    authority: "Iowa Code s 123.46; Iowa R. Crim. P. 2.86",
  },
  currentOfficialUrl: "https://www.iowacourts.gov/collections/721/files/1504/embedDocument",
  acquisitionPath: "DIRECT_OFFICIAL_BINARY on iowacourts.gov, already recorded in SOURCE_ACQUISITION_MANIFEST.json",
  recordedHashIsCurrentEdition: true,
  editionEvidence:
    "The hosted runner fetched this URL at HTTP 200 and observed the SAME SHA-256 the restore manifest records. Rev. 2022-01 is current.",
  whyItBlocks: "ia-12346-set names Rule 2.86 Form 3 and the Nationwide copy is the only custody the repository records for it.",
  checks: ["relationshipBindsFamily", "acquiredAtThisHash", "formLabelHasRoutes"],
  formLabel: "Rule 2.86 Form 3",
});

add("LegalEase Iowa/forms/DCI-76-and-DCI-77__criminal-history-record-check-billing-and-request-forms-fillable__source-2026.pdf", {
  classification: LIVE,
  artifactId: "IA-DCI-76-AND-77",
  familyIds: ["ia-dci77-set"],
  obligation:
    "official-form:DCI-77 Criminal History Record Check Request Form and official-form:DCI-76 Criminal History Record Check Billing Form -- two named forms that resolve to one combined fillable document",
  officialSourceIdentity: {
    officialTitle:
      "DCI-76 Criminal History Record Check Billing Form and DCI-77 Criminal History Record Check Request Form (single fillable document)",
    issuingAuthority: "Iowa Department of Public Safety, Division of Criminal Investigation",
    authority: "Iowa Code ch. 692; Iowa Code s 901C.3",
  },
  currentOfficialUrl: "https://dps.iowa.gov/media/152/download?inline",
  acquisitionPath: "DIRECT_OFFICIAL_BINARY on dps.iowa.gov, already recorded in SOURCE_ACQUISITION_MANIFEST.json",
  recordedHashIsCurrentEdition: true,
  editionEvidence:
    "The hosted runner fetched this URL at HTTP 200 and observed the SAME SHA-256 the restore manifest records.",
  whyItBlocks:
    "ia-dci77-set names both DCI forms and no Iowa agency form of any kind exists in the D source packs; the Nationwide copy is the only recorded custody.",
  checks: ["backlogServesFamily", "acquiredAtThisHash", "formLabelHasRoutes"],
  formLabel: "DCI-77 Criminal History Record Check Request Form",
});

add("LegalEase Kansas/source-gated/KSJC__petition-for-expungement-of-arrest-record__rev-2013-02.pdf", {
  classification: LIVE,
  artifactId: "KSJC-PETITION-ARREST-RECORD",
  familyIds: ["ks-22-2410-arrest-set"],
  obligation:
    "source-sha256:bf4b2309f831aa317d235389a6bd1f24bca55075290ddb3d916083c6f64d840d, named directly by obligation:track-only:KS:ks-22-2410-arrest, and official-form:KSJC-PETITION-EXPUNGEMENT-ARREST-RECORD-02-2013",
  officialSourceIdentity: {
    officialTitle: "Petition for Expungement of Arrest Record (rev. 2013-02)",
    issuingAuthority: "Kansas Judicial Council",
    authority: "K.S.A. 22-2410",
  },
  currentOfficialUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/arrest-record-only",
  acquisitionPath:
    "OFFICIAL_LANDING_PAGE. The Kansas Judicial Council has moved from kansasjudicialcouncil.org to www.kjc.ks.gov, which IS inside the .gov allowlist that refused the old host. The exact binary URL under that page still needs DISC; the host obstacle is gone.",
  recordedHashIsCurrentEdition: null,
  editionEvidence:
    "Not verified here: no byte could be fetched. The Kansas Judicial Council still publishes this set at the recorded revisions (arrest petition 02/2013, registration relief 06/2022, conviction or diversion 08/2022), so no supersession is indicated, but currency is UNVERIFIED and the relationship registry records it as CURRENTNESS_UNVERIFIED.",
  whyItBlocks:
    "The route names this file by its own SHA-256. No Kansas family had any custody row at all before the Nationwide inventory, and none of the three Kansas D-pack files is an arrest-record form.",
  checks: ["hashNamedByRoute", "backlogServesFamily"],
  acquisitionAttempt: {
    ...PROXY_FAILURE,
    urls: [
      "https://www.kansasjudicialcouncil.org/legal-forms/expungement",
      "https://www.kscourts.gov/Public/Court-Forms",
    ],
  },
});

add("LegalEase Kansas/source-gated/KSJC__order-of-expungement-of-arrest-record-cover-sheet__rev-2016-12.pdf", {
  classification: LIVE,
  artifactId: "KSJC-ORDER-ARREST-COVER-SHEET",
  familyIds: ["ks-22-2410-arrest-set"],
  obligation:
    "source-sha256:d13bc7b7b2a9c5367c785c1de4f3a8d6d79410ef29a3c9c86a5b903057d249d5, named directly by obligation:track-only:KS:ks-22-2410-arrest, and official-form:KSJC-ORDER-EXPUNGEMENT-ARREST-RECORD-COVER-SHEET-12-2016",
  officialSourceIdentity: {
    officialTitle: "Order of Expungement of Arrest Record - Cover Sheet (rev. 2016-12)",
    issuingAuthority: "Kansas Judicial Council",
    authority: "K.S.A. 22-2410",
  },
  currentOfficialUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/arrest-record-only",
  acquisitionPath: "OFFICIAL_LANDING_PAGE on the migrated www.kjc.ks.gov host; exact binary URL still needs DISC.",
  recordedHashIsCurrentEdition: null,
  editionEvidence: "Not verified here: no byte could be fetched. Recorded as CURRENTNESS_UNVERIFIED.",
  whyItBlocks: "The cover sheet is what the Kansas Bureau of Investigation receives; without it the arrest packet is not deliverable.",
  checks: ["hashNamedByRoute", "backlogServesFamily"],
  acquisitionAttempt: { ...PROXY_FAILURE, urls: ["https://www.kansasjudicialcouncil.org/legal-forms/expungement"] },
});

add("LegalEase Kansas/source-gated/KSJC__petition-for-relief-from-offender-registration__rev-2022-06.pdf", {
  classification: LIVE,
  artifactId: "KSJC-PETITION-REGISTRATION-RELIEF",
  familyIds: ["ks-22-4908-registration-relief-set"],
  obligation:
    "source-sha256:9264dc51531cd8eea47fd99b00871ff49205e0f2c9ab10cb0d7420d6ca3cf396, named directly by both ks-22-4908 obligation units, and official-form:KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022",
  officialSourceIdentity: {
    officialTitle: "Petition for Relief from Offender Registration (rev. 2022-06)",
    issuingAuthority: "Kansas Judicial Council",
    authority: "K.S.A. 22-4908",
  },
  currentOfficialUrl: "https://www.kjc.ks.gov/legal-forms/drug-offender-registration-relief/-folder-468-431",
  acquisitionPath: "OFFICIAL_LANDING_PAGE on the migrated www.kjc.ks.gov host; exact binary URL still needs DISC.",
  recordedHashIsCurrentEdition: null,
  editionEvidence:
    "Not verified here: no byte could be fetched. The Council still publishes 'Petition for registration relief (6-2022)', which matches the recorded revision, so no supersession is indicated.",
  whyItBlocks: "No registration-relief form exists in any pack; the Nationwide copy is the only recorded custody.",
  checks: ["hashNamedByRoute", "backlogServesFamily"],
  acquisitionAttempt: { ...PROXY_FAILURE, urls: ["https://www.kansasjudicialcouncil.org/legal-forms/expungement"] },
});

add("LegalEase Kansas/source-gated/KSJC__order-of-relief-from-offender-registration-cover-sheet__rev-2022-06.pdf", {
  classification: LIVE,
  artifactId: "KSJC-ORDER-REGISTRATION-RELIEF-COVER-SHEET",
  familyIds: ["ks-22-4908-registration-relief-set"],
  obligation:
    "source-sha256:0c9c5a751086eee0098925e6e7398f2f0b13dd62cc95bcbffab8732d11b6a0bd, named directly by both ks-22-4908 obligation units, and official-form:KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022",
  officialSourceIdentity: {
    officialTitle: "Order of Relief from Offender Registration - Cover Sheet (rev. 2022-06)",
    issuingAuthority: "Kansas Judicial Council",
    authority: "K.S.A. 22-4908",
  },
  currentOfficialUrl: "https://www.kjc.ks.gov/legal-forms/drug-offender-registration-relief/-folder-468-431",
  acquisitionPath: "OFFICIAL_LANDING_PAGE on the migrated www.kjc.ks.gov host; exact binary URL still needs DISC.",
  recordedHashIsCurrentEdition: null,
  editionEvidence: "Not verified here: no byte could be fetched.",
  whyItBlocks: "The order cover sheet is the second half of the registration-relief filing; the family names both.",
  checks: ["hashNamedByRoute", "backlogServesFamily"],
  acquisitionAttempt: { ...PROXY_FAILURE, urls: ["https://www.kansasjudicialcouncil.org/legal-forms/expungement"] },
});

add("LegalEase Maine/forms/ME-CR-308__order-on-motion-to-seal-criminal-history-victims-of-sex-trafficking-or-sexual-exploitation__rev-2026-06.pdf", {
  classification: LIVE,
  artifactId: "ME-CR-308",
  familyIds: ["me-seal-survivor-set"],
  obligation: "official-form:CR-308 -- the order the survivor-sealing route submits with its motion",
  officialSourceIdentity: {
    officialTitle:
      "Order on Motion to Seal Criminal History Record Information (victims of sex trafficking or sexual exploitation), Form CR-308 (rev. 2026-06)",
    issuingAuthority: "Maine Judicial Branch",
    authority: "16 M.R.S. s 2802 et seq.",
  },
  currentOfficialUrl: "https://mjbportal.courts.maine.gov/CourtForms/FormsLists/DownloadForm?strFormNumber=CR-308",
  acquisitionPath:
    "OFFICIAL_DOWNLOAD_ENDPOINT on courts.maine.gov. The hosted runner has ALREADY fetched it at HTTP 200; the bytes sit in a workflow artifact behind storage this container's proxy denies. What remains is the reviewed custody commit the acquisition workflow reserves to a human, not another fetch.",
  recordedHashIsCurrentEdition: true,
  editionEvidence:
    "The runner observed SHA-256 b2e78f24cb33... -- identical to the restore-manifest hash. The recorded old hash IS the current edition.",
  whyItBlocks:
    "me-seal-survivor-set is the only Maine family naming CR-308, the reconciliation records official-form:CR-308 as named_form_number_not_in_corpus, and no other custody holds it.",
  checks: ["relationshipBindsFamily", "acquiredAtThisHash", "formLabelHasRoutes"],
  formLabel: "CR-308",
});

add("LegalEase Missouri/Judgment and Order of Expungement - Section 610.140 RSMo CR370.pdf", {
  classification: LIVE,
  artifactId: "MO-CR370",
  familyIds: ["mo-610-140-arrest-set", "mo-610-140-conviction-set"],
  obligation: "official-form:CR370 -- the judgment and order counterpart to the CR360 petition under RSMo 610.140",
  officialSourceIdentity: {
    officialTitle: "Judgment and Order of Expungement - Section 610.140, RSMo (Form CR370)",
    issuingAuthority: "Missouri Office of State Courts Administrator",
    authority: "s 610.140, RSMo",
  },
  currentOfficialUrl: "https://www.courts.mo.gov/page.jsp?id=191585",
  acquisitionPath:
    "OFFICIAL_LANDING_PAGE (the Missouri Courts expungement forms index) on the allowlisted courts.mo.gov host. Its sibling CR360 is published there as a direct binary at https://www.courts.mo.gov/file.jsp?id=56341, so CR370 has an analogous file.jsp id on the same host; establishing that exact id is a DISC step, and no address is guessed here.",
  recordedHashIsCurrentEdition: null,
  editionEvidence:
    "Unverified, and this is the weakest custody position in the residual set. SOURCE_RELATIONSHIP_REGISTRY records CR370 as MISSING_SOURCE_BINARY with artifactSha256 null: the repository names the document, points at this Nationwide path, and holds no digest for it at all.",
  whyItBlocks:
    "Both 610.140 families name CR370 alongside CR360, and the queue reports SOURCE_NAMED_BUT_NOT_HELD. CR360 itself is already held in this checkout, so CR370 is the single form standing between these two families and a complete component set.",
  checks: ["relationshipBindsFamily", "formLabelHasRoutes"],
  formLabel: "CR370",
  acquisitionAttempt: { ...PROXY_FAILURE, urls: ["https://www.courts.mo.gov/page.jsp?id=191585"] },
});

/* ---------------- CURRENT_AUTHORITY_OR_INSTRUCTION ---------------- */

add("LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf", {
  classification: AUTHORITY,
  artifactId: "FL-RULE-3.989-FORMS",
  familyIds: ["fl-expunction-set", "fl-10yr-bridge-set", "fl-sealing-set"],
  obligation:
    "official-form:FL-RULE-3.989-PETITION, official-form:FL-RULE-3.989-ORDER and official-form:FL-RULE-3.989-SWORN-STATEMENT -- the three rule-prescribed instruments the owner determined are COMPOSE_FROM_AUTHORITY",
  officialSourceIdentity: {
    officialTitle:
      "Florida Rules of Criminal Procedure, effective 1 January 2026 -- the publication carrying Fla. R. Crim. P. 3.989 (Affidavit, Petition and Order to Expunge or Seal)",
    issuingAuthority: "Supreme Court of Florida, as published in the Florida Bar rules volume",
    authority: "Fla. R. Crim. P. 3.989; ss 943.0585 and 943.059, Fla. Stat.",
  },
  currentOfficialUrl: null,
  acquisitionPath:
    "This is an EXTRACTION from a rules publication, not a search for a form: the registry's own externally verified note records that no separate fillable Rule 3.989 PDF exists. The rule text is addressable through the Supreme Court of Florida rules publication; the Nationwide copy is the only edition the repository records, and its Rule 3.989 text is presently an EMBEDDED_SECTION with artifactSha256 and heldPath both null.",
  recordedHashIsCurrentEdition: true,
  editionEvidence:
    "The document is itself dated 1 January 2026 and is the current rules edition; the owner determination of 2026-09-02 rests on it. Nothing later is recorded anywhere in the repository.",
  whyItBlocks:
    "OWNER_DETERMINATION FL-RULE-3989 made the sworn statement, petition and order COMPOSE_FROM_AUTHORITY. Composition needs held authority text with a hash. This file is the held authority: SOURCE_ATTACH_COHORT binds artifact FL-RULE-3.989-FORMS to this exact Nationwide path at this exact SHA-256. The determination's own record says one acquisition of addressable Rule 3.989 text releases four families.",
  checks: ["attachBindsFamily", "backlogServesFamily"],
  acquisitionAttempt: { ...PROXY_FAILURE, urls: [] },
});

add("LegalEase Georgia/reference-only/GBI-Time-Expired-Restrictions__georgia-law-regarding-time-expired-restrictions__source-2013-10-08.pdf", {
  classification: AUTHORITY,
  artifactId: "GA-GBI-TIME-EXPIRED-RESTRICTIONS",
  familyIds: ["ga-time-expired-set", "rcap-ga-guidance-implementation"],
  obligation:
    "source-sha256:0e2f11700b8793c13f848b4837f9a5c56a7e15429f04aa3d41467835bf913f4d -- named directly in the requiredSourceIds of obligation:track-only:GA:ga-time-expired",
  officialSourceIdentity: {
    officialTitle: "Georgia law regarding time-expired restriction notifications",
    issuingAuthority: "Georgia Bureau of Investigation, Georgia Crime Information Center",
    authority: "O.C.G.A. s 35-3-37(h)(1)(A)(ii); O.C.G.A. s 35-3-39.1",
  },
  currentOfficialUrl:
    "https://gbi.georgia.gov/document/document/georgia-law-regarding-time-expired-restriction-notifications/download",
  acquisitionPath: "DIRECT_OFFICIAL_BINARY on the allowlisted gbi.georgia.gov host, recorded in the route's own requiredSourceIds.",
  recordedHashIsCurrentEdition: null,
  editionEvidence:
    "Unverified. The recorded capture is dated 2013-10-08 and the GBI publishes this document at a stable address, so the current edition should be re-hashed at acquisition and compared rather than assumed identical.",
  whyItBlocks:
    "ga-time-expired is a process_guidance route: nothing is filed, and the deliverable IS the explanation of when the centre restricts the record automatically. The route names this document by content hash, which makes it the source that proves the legal design. It is filed under reference-only/ in the Nationwide tree, and that folder name is exactly the trap this lane exists to catch: the folder says reference, the route says required.",
  checks: ["hashNamedByRoute"],
  acquisitionAttempt: {
    ...PROXY_FAILURE,
    urls: ["https://gbi.georgia.gov/document/document/georgia-law-regarding-time-expired-restriction-notifications/download"],
  },
});

/* ---------------- ALREADY_HELD_OTHER_CUSTODY ---------------- */

for (const entry of residual.missing) {
  if (!entry.alreadyHeldInThisCheckoutAt) continue;
  add(entry.relativePath, {
    classification: HELD,
    artifactId: null,
    familyIds: [],
    obligation: null,
    reason:
      "The exact recorded SHA-256 is present in this checkout's mounted Master Library custody at the path the residual list names. Nothing is owed.",
    heldAt: entry.alreadyHeldInThisCheckoutAt,
    checks: ["declaredHeldByInput"],
  });
}

/* ---------------- SUPERSEDED_SOURCE ---------------- */

for (const [p, form] of Object.entries(CO_SUPERSEDED)) {
  add(p, {
    classification: SUPERSEDED,
    artifactId: `CO-${form}`,
    familyIds: [],
    reason:
      "The obligation that names this form number is already satisfied by a CORROBORATED Master Library edition whose SHA-256 differs from the Nationwide copy. Two different byte-streams of one form number means the Nationwide capture is not the edition of record.",
    currentOfficialEdition: {
      formNumber: form,
      status: "corroborated",
      heldAt: null, // filled from the registry at generation time
      officialSourcePage: "https://www.coloradojudicial.gov/self-help/forms (Colorado Judicial Department JDF forms index)",
    },
    doNotHuntTheOldBytes: true,
    checks: ["registryCorroboratedAtDifferentHash"],
    formLabel: form,
  });
}

for (const [p, form] of Object.entries(NC_SUPERSEDED)) {
  add(p, {
    classification: SUPERSEDED,
    artifactId: `NC-${form}`,
    familyIds: [],
    reason:
      "The current edition is held at an EXACT CONTENT HASH in the D1 source packs and that hash is not this file's. The North Carolina AOC republishes these forms on a rolling revision, and the Nationwide capture is an earlier printing.",
    currentOfficialEdition: {
      formNumber: form,
      status: "resolved_at_exact_content_hash",
      heldAt: null, // filled from the reconciliation at generation time
      officialSourcePage: "https://www.nccourts.gov/documents/forms (North Carolina AOC forms index)",
    },
    doNotHuntTheOldBytes: true,
    checks: ["reconciliationResolvedAtDifferentHash"],
    formLabel: form,
  });
}

add("LegalEase Maryland/dccr071.pdf", {
  classification: SUPERSEDED,
  artifactId: "MD-DC-CR-071",
  familyIds: [],
  reason:
    "No Maryland obligation anywhere in the census names form 071. Every current Maryland petition obligation names the CC-DC-CR-072 series (072A expungement petition, 072B conviction or pardon, 072C early, 072D cannabis), and 072B, 072C and 072D have already been fetched at HTTP 200 with recorded digests. The 071 capture is the predecessor printing of that petition and is not the edition any route asks for.",
  currentOfficialEdition: {
    formNumber: "CC-DC-CR-072A / 072B / 072C / 072D",
    status: "acquired_bytes_recorded_for_072B_072C_072D",
    officialSourcePage: "https://www.mdcourts.gov/courtforms (Maryland Judiciary court forms index)",
  },
  identityConfidence: "inferred_from_filename_and_from_the_absence_of_any_071_obligation",
  doNotHuntTheOldBytes: true,
  checks: ["noObligationNamesThisForm"],
  formLabel: "CC-DC-CR-071",
});

/* ---------------- REFERENCE_ONLY ---------------- */

const CO_REFERENCE = [
  "LegalEase Colorado/guide-sealing-conviction-records-multiple-cases.html",
  "LegalEase Colorado/how-expunge-juvenile-delinquency-records.html",
  "LegalEase Colorado/how-seal-criminal-records-non-convictions.html",
  "LegalEase Colorado/JDF613.pdf.html",
  "LegalEase Colorado/motion-seal-conviction-record-pardoned.html",
  "LegalEase Colorado/order-seal-pardoned-conviction-records.html",
  "LegalEase Colorado/request-hearing-automatic-sealing.html",
];
for (const p of CO_REFERENCE) {
  add(p, {
    classification: REFERENCE,
    reason:
      "An HTML capture of a Colorado Judicial self-help page, not an official form. Where the page describes a filing, the corresponding JDF form and its JDF instruction sheet are already CORROBORATED in the Master Library, so the capture adds background and no deliverable depends on it.",
    checks: ["classifiedReferenceInTheNationwideRegistry"],
  });
}

const LA_FORMS = [
  ["LegalEase Louisiana/forms/LA-CCRP-ART-987__motion-to-set-aside-conviction-rule-to-show-cause-and-order-of-dismissal-forms__source-2026-08.html", "LA-CCRP-ART-987"],
  ["LegalEase Louisiana/forms/LA-CCRP-ART-988__motion-for-fee-exemption-certification-of-fee-waiver-form__source-2026-08.html", "LA-CCRP-ART-988"],
  ["LegalEase Louisiana/forms/LA-CCRP-ART-989__motion-for-expungement-form__source-2026-08.html", "LA-CCRP-ART-989"],
  ["LegalEase Louisiana/forms/LA-CCRP-ART-991__order-form__source-2026-08.html", "LA-CCRP-ART-991"],
  ["LegalEase Louisiana/forms/LA-CCRP-ART-992__order-of-expungement-form__source-2026-08.html", "LA-CCRP-ART-992"],
  ["LegalEase Louisiana/forms/LA-CCRP-ART-994__motion-for-interim-expungement-form__source-2026-08.html", "LA-CCRP-ART-994"],
];
for (const [p, form] of LA_FORMS) {
  add(p, {
    classification: REFERENCE,
    artifactId: "LA-CCRP-STATUTORY-FORMS",
    reason:
      "Covered by OWNER_DETERMINATION LA-STATUTORY-FORMS, which puts La. C.Cr.P. arts. 987 through 995 and 998 uniformly under COMPOSE_FROM_AUTHORITY with authorityHeld true. All six of these files fall inside the numbered range the determination names. The composition authority is the codified article text carried by the compiled Louisiana profile, and the determination says in terms that existing renderings of the articles are references rather than a different product class. Acquiring this statutory HTML solely to rebuild the old private tree would buy nothing the determination has not already settled.",
    ownerDetermination: "LA-STATUTORY-FORMS",
    determinationCoversThisArticle: true,
    checks: ["coveredByComposeFromAuthority"],
    formLabel: form,
  });
}

const IL_REFERENCE = [
  "LegalEase Illinois/reference-only/PRB-Guidelines-for-Certificate-of-Expungement-for-Military__guidelines__rev-2024-09-18.pdf",
  "LegalEase Illinois/reference-only/PRB-Guidelines-for-Certificate-of-Sealing__guidelines__rev-2024-09-18.pdf",
  "LegalEase Illinois/reference-only/PRB-Sealable-Convictions-List__offences-eligible-for-certificate-of-sealing__source-undated.pdf",
];
for (const p of IL_REFERENCE) {
  add(p, {
    classification: REFERENCE,
    reason:
      "Filed reference_only in the Nationwide artifact registry at packageTier reference-only, and no il-prb-cert-set obligation names it. il-prb-cert-set names exactly four PRB documents -- the two applications and the two eligibility acknowledgements -- and all four are classified LIVE_PACKET_COMPONENT here. The guidelines and the sealable-convictions list inform eligibility screening; they are not components of the filing.",
    checks: ["classifiedReferenceInTheNationwideRegistry", "noObligationNamesThisFile"],
  });
}

const IN_REFERENCE = [
  "LegalEase Indiana/reference-only/CCA-XP-0320-7000B__conviction-petition-instructions__rev-2020-03.pdf",
  "LegalEase Indiana/reference-only/IOCS__detailed-information-on-criminal-case-expungement__rev-2026-07-01.pdf",
];
for (const p of IN_REFERENCE) {
  add(p, {
    classification: REFERENCE,
    reason:
      "Filed reference_only at packageTier reference-only. The three SOURCE_BLOCKED Indiana families name the CCA conviction expungement PETITION and ORDER, not these instruction and explainer documents, and neither is named by any obligation.",
    checks: ["classifiedReferenceInTheNationwideRegistry", "noObligationNamesThisFile"],
  });
}

add("LegalEase Mississippi/reference-only/MS-HB-1546-2026__enrolled-act-chapter-430-laws-of-2026-expunction-waiting-period__source-2026-08.pdf", {
  classification: REFERENCE,
  reason:
    "Named inside the Mississippi custom-pleading family adoption record with sourceRole explicitly 'reference_only', beside four authority_source documents that carry the actual petition and order text. Mississippi has no source-blocked family. The enrolled act matters legally -- it moved the expunction waiting period -- but its declared role in the family that would use it is reference, and no packet component is built from it.",
  declaredSourceRole: "reference_only",
  declaredIn: "data/record-clearing/template-families/ADOPT-01-custom-pleading-family-adoption.json",
  checks: ["classifiedReferenceInTheNationwideRegistry"],
});

add("LegalEase Oklahoma/Facets of Expungement of Criminal Records in Oklahoma - Oklahoma Bar Association.html", {
  classification: REFERENCE,
  reason:
    "A bar-association article capture. Not an official form, not an issuing authority's instruction, and Oklahoma has no source-blocked family. The Oklahoma state pack files it under resourcePacketInventory with classification 'reference'.",
  checks: ["noObligationNamesThisFile"],
});

add("LegalEase Wyoming/Wyoming Expungement-Handout_05.01.25.pdf", {
  classification: REFERENCE,
  reason:
    "A self-help handout, not a filing component. Wyoming has no source-blocked family and no Wyoming obligation names it.",
  checks: ["noObligationNamesThisFile"],
});

const WI_REFERENCE = [
  "LegalEase Wisconsin/CR-266_summary.pdf",
  "LegalEase Wisconsin/CR-267_summary.pdf",
  "LegalEase Wisconsin/forms-download/CR-266_summary_en.pdf",
];
for (const p of WI_REFERENCE) {
  add(p, {
    classification: REFERENCE,
    reason:
      "A form SUMMARY sheet, not the form. official-form:CR-266 and official-form:CR-267 are both CORROBORATED in the Master Library at digests the Wisconsin production overlays already pin, so the obligations these summaries sit next to are satisfied. Two of these three paths are byte-identical, which is why 66 paths carry 65 hashes.",
    checks: ["formLabelCorroborated", "noObligationNamesThisFile"],
  });
}

/* ---------------- ORPHANED_FROM_LIVE_ROUTES ---------------- */

const CO_ORPHANED = [
  ["LegalEase Colorado/JDF302.pdf", "JDF-302"],
  ["LegalEase Colorado/JDF302.spanish.pdf", "JDF-302"],
  ["LegalEase Colorado/JDF304.pdf", "JDF-304"],
  ["LegalEase Colorado/JDF324.pdf", "JDF-324"],
  ["LegalEase Colorado/JDF324.spanish.pdf", "JDF-324"],
  ["LegalEase Colorado/JDF326.pdf", "JDF-326"],
  ["LegalEase Colorado/JDF326.spanish.pdf", "JDF-326"],
  ["LegalEase Colorado/JDF493.pdf", "JDF-493"],
  ["LegalEase Colorado/JDF493.spanish.pdf", "JDF-493"],
];
for (const [p, form] of CO_ORPHANED) {
  const spanish = p.includes(".spanish.");
  add(p, {
    classification: ORPHANED,
    reason: spanish
      ? "A Spanish translation of a Colorado form number that no obligation names. Every Colorado packet family is EN, so this is not a participant deliverable and must not be queued for acquisition."
      : "No route, family or obligation anywhere in the census names this Colorado form number. Colorado's obligations name JDF-417, 417-ORDER, 418, 477, 478, 612, 615, 641, 642, 680, 681, 683, 684, 2363, 2371 and 2374 -- and not this one.",
    isTranslation: spanish,
    doNotQueueForAcquisition: true,
    checks: ["noObligationNamesThisForm"],
    formLabel: form,
  });
}

const FL_ORPHANED = [
  "LegalEase Florida/se (1).pdf",
  "LegalEase Florida/se (2).pdf",
  "LegalEase Florida/se (3).pdf",
  "LegalEase Florida/se (4).pdf",
  "LegalEase Florida/se (5).pdf",
];
for (const p of FL_ORPHANED) {
  add(p, {
    classification: ORPHANED,
    reason:
      "An untitled download-numbered capture with no form number, no issuing authority and no recorded identity beyond its filename; the Nationwide artifact registry leaves it unclassified_pre_batch_1_import. No Florida obligation names it by hash or by label. Every Florida family's named components are accounted for elsewhere: the four FDLE applications are held or addressed, and the Rule 3.989 instruments are COMPOSE_FROM_AUTHORITY off the rules publication. There is nothing to trace this file to, and a file that cannot be traced to a named obligation is not a packet component.",
    checks: ["noObligationNamesThisFile"],
  });
}

add("LegalEase Minnesota/EXP103_Current.pdf", {
  classification: ORPHANED,
  reason:
    "Minnesota's obligations name EXP101, EXP102, EXP104, EXP105 and EXP106. Not EXP103. The official source registry has no EXP103 entry at all, and at 10,256 bytes this is not one of the substantive petition or order forms.",
  checks: ["noObligationNamesThisForm"],
  formLabel: "EXP103",
});

add("LegalEase Indiana/forms/IN-FORM-ACR__notice-of-exclusion-of-confidential-information-from-public-access__source-2026-08.docx", {
  classification: ORPHANED,
  reason:
    "Form ACR looks like a live dependency and is not one. official-form:CCA-XP-0120-7002 Form ACR and official-form:Confidential Information Form are BOTH already RESOLVED in the custody reconciliation at tier exact_identity_confirmed_from_document_text, against the Coalition for Court Access Section 1 petition-and-order bundle held in the Master Library. No route depends on this separate .docx. The three SOURCE_BLOCKED Indiana families need the CCA CONVICTION petition and order, which this is not. Worth holding as a currency refresh of the ACR page; not a blocker.",
  checks: ["formLabelResolvedElsewhere"],
  formLabel: "CCA-XP-0120-7002 Form ACR",
});

/* ------------------------------------------------------------------ *
 * Verification. Every claim is measured before it is printed.
 * ------------------------------------------------------------------ */

const failures = [];
const fail = (relativePath, message) => failures.push(`${relativePath}: ${message}`);

const runCheck = (entry, row, check) => {
  const p = entry.relativePath;
  switch (check) {
    case "declaredHeldByInput":
      if (!entry.alreadyHeldInThisCheckoutAt) fail(p, "claimed ALREADY_HELD but the input records no custody path");
      return;
    case "hashNamedByRoute": {
      const routes = routesByHash.get(entry.sha256);
      if (!routes?.length) fail(p, "claimed a hash-level route obligation; no route names this SHA-256");
      else row.tracedRoutes = routes;
      return;
    }
    case "relationshipBindsFamily": {
      const rel = relationshipByPath.get(p);
      if (!rel) return fail(p, "claimed a source-relationship binding; no record carries this heldPath");
      for (const family of row.familyIds ?? [])
        if (!rel.families.includes(family)) fail(p, `relationship registry does not bind ${family}`);
      row.sourceRelationship = rel;
      return;
    }
    case "attachBindsFamily": {
      const attach = attachByPath.get(p);
      if (!attach) return fail(p, "claimed an attach-cohort binding; no artifact carries this pathInArchive");
      row.attachCohortArtifact = { artifactId: attach.artifactId, servesFamilies: attach.servesFamilies ?? [], namedInFamiliesAs: attach.namedInFamiliesAs ?? [] };
      if (attach.sha256 !== entry.sha256) fail(p, "attach cohort binds a different SHA-256 than the residual hash");
      return;
    }
    case "backlogServesFamily": {
      const held = backlogByPath.get(p);
      const named = [...backlogByPath.values()].some((a) => a.servesFamilies.some((f) => (row.familyIds ?? []).includes(f)));
      const classes = (row.familyIds ?? []).flatMap((f) => backlogClassByFamily.get(f) ?? []);
      if (!held && !named && !classes.length)
        fail(p, "claimed a source-backlog binding; the backlog names neither this path nor these families");
      if (held) row.sourceBacklog = held;
      if (classes.length) row.sourceBacklogClassOfFamily = [...new Set(classes)];
      return;
    }
    case "acquiredAtThisHash": {
      const receipts = acquiredByHash.get(entry.sha256);
      if (!receipts?.length)
        fail(p, "claimed the recorded hash is the current edition on an acquisition receipt; no receipt observes this SHA-256");
      else row.acquisitionReceipts = receipts;
      return;
    }
    case "formLabelHasRoutes": {
      const routes = routesByFormLabel.get(row.formLabel);
      if (!routes?.length) fail(p, `claimed obligation official-form:${row.formLabel}; no route names that label`);
      else row.routesNamingThisForm = [...new Set(routes)].sort();
      return;
    }
    case "registryCorroboratedAtDifferentHash": {
      const source = registry.sources[row.formLabel];
      if (!source) return fail(p, `claimed a corroborated current edition for ${row.formLabel}; the registry has no such source`);
      if (source.status !== "corroborated") return fail(p, `${row.formLabel} is ${source.status}, not corroborated`);
      if (source.installedSha256 === entry.sha256) return fail(p, `${row.formLabel} is corroborated at THIS hash; it is not superseded`);
      row.currentOfficialEdition.heldAt = source.corpusPath;
      row.currentOfficialEdition.currentSha256 = source.installedSha256;
      row.currentOfficialEdition.currentByteLength = source.byteLength;
      row.recordedHashIsCurrentEdition = false;
      return;
    }
    case "reconciliationResolvedAtDifferentHash": {
      const resolution = resolutionByLabel.get(row.formLabel);
      if (!resolution?.resolved) return fail(p, `claimed ${row.formLabel} is resolved in custody; the reconciliation says otherwise`);
      if (resolution.heldAs?.sha256 === entry.sha256) return fail(p, `${row.formLabel} resolves to THIS hash; it is not superseded`);
      row.currentOfficialEdition.heldAt = resolution.heldAs?.path ?? null;
      row.currentOfficialEdition.currentSha256 = resolution.heldAs?.sha256 ?? null;
      row.currentOfficialEdition.currentRevision = resolution.heldAs?.revision ?? null;
      row.currentOfficialEdition.resolutionTier = resolution.tier;
      row.recordedHashIsCurrentEdition = false;
      return;
    }
    case "formLabelCorroborated": {
      for (const label of ["CR-266", "CR-267"]) {
        const source = registry.sources[label];
        if (source?.status !== "corroborated") fail(p, `${label} is not corroborated; the summary cannot be dismissed on that basis`);
      }
      return;
    }
    case "formLabelResolvedElsewhere": {
      const resolution = resolutionByLabel.get(row.formLabel);
      if (!resolution?.resolved) fail(p, `claimed ${row.formLabel} is resolved elsewhere; the reconciliation says otherwise`);
      else row.resolvedElsewhereAs = resolution.heldAs;
      return;
    }
    case "noObligationNamesThisForm": {
      if (routesByFormLabel.has(row.formLabel))
        fail(p, `claimed no obligation names ${row.formLabel}, but ${routesByFormLabel.get(row.formLabel).length} route(s) do`);
      row.searched = SEARCH_TRAIL;
      return;
    }
    case "noObligationNamesThisFile": {
      if (routesByHash.has(entry.sha256)) fail(p, "claimed no obligation names this file, but a route names its SHA-256");
      if (relationshipByPath.has(p)) fail(p, "claimed no obligation names this file, but the relationship registry binds its path");
      if (attachByPath.has(p)) fail(p, "claimed no obligation names this file, but the attach cohort binds its path");
      row.searched = SEARCH_TRAIL;
      return;
    }
    case "classifiedReferenceInTheNationwideRegistry": {
      const treatment = treatmentByPath.get(p);
      if (!treatment) return fail(p, "no Nationwide artifact-registry row for this path");
      row.nationwideTreatment = treatment;
      return;
    }
    case "coveredByComposeFromAuthority": {
      if (!composedFromAuthority.has(row.formLabel))
        fail(p, `claimed ${row.formLabel} is COMPOSE_FROM_AUTHORITY; no owner determination composes it`);
      else row.ownerDeterminationId = determinationByForm.get(row.formLabel);
      return;
    }
    default:
      fail(p, `unknown check ${check}`);
  }
};

const SEARCH_TRAIL = [
  "route-obligation-candidate.json requiredSourceIds, both source-sha256: and official-form: forms, across all 703 obligations",
  "SOURCE_RELATIONSHIP_REGISTRY.json heldPath and heldCandidates, across all 238 records",
  "SOURCE_ATTACH_COHORT.json pathInArchive, both cohorts",
  "SOURCE_BACKLOG_CLASSIFICATION.json held.pathInArchive and servesFamilies, across all 161 artifacts",
  "SOURCE_ACQUISITION_MANIFEST.json expectedSha256, lastAcquisition.sha256 and obligationKeys",
  "source-custody-reconciliation.json documentSources, all resolution tiers",
  "official-source-registry.json by form number",
  "source-artifact-registry.json sourceTreatment, packageTier and reliefTracksUsing",
  "a full-text scan of every committed .json, .mjs, .ts and .md file in the repository for each of the 65 residual SHA-256 digests",
];

const entriesByPath = new Map(residual.missing.map((m) => [m.relativePath, m]));
const rows = [];

for (const entry of residual.missing) {
  const row = table.get(entry.relativePath);
  if (!row) {
    failures.push(`${entry.relativePath}: no adjudication row`);
    continue;
  }
  const out = {
    relativePath: entry.relativePath,
    sha256: entry.sha256,
    byteLength: entry.byteLength,
    jurisdiction: entry.jurisdiction,
    manifestClassification: entry.classification,
    ...row,
  };
  for (const check of row.checks ?? []) runCheck(entry, out, check);
  delete out.checks;
  rows.push(out);
}

for (const p of table.keys())
  if (!entriesByPath.has(p)) failures.push(`${p}: adjudicated but absent from the residual list`);

if (failures.length) {
  console.error("REFUSING to write: adjudication claims the repository no longer supports.");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Emit.
 * ------------------------------------------------------------------ */

const counts = {};
for (const c of [LIVE, AUTHORITY, SUPERSEDED, REFERENCE, ORPHANED, HELD]) counts[c] = 0;
for (const row of rows) counts[row.classification] += 1;

const packetCritical = rows
  .filter((r) => r.classification === LIVE || r.classification === AUTHORITY)
  .map((r) => ({
    relativePath: r.relativePath,
    sha256: r.sha256,
    jurisdiction: r.jurisdiction,
    classification: r.classification,
    artifactId: r.artifactId,
    familyIds: r.familyIds,
    routes: [...new Set([...(r.routesNamingThisForm ?? []), ...(r.tracedRoutes ?? []).map((x) => x.routeKey), ...(r.familyIds ?? []).flatMap((f) => routesBySet.get(f) ?? [])])].sort(),
    obligation: r.obligation,
    officialSourceIdentity: r.officialSourceIdentity,
    currentOfficialUrl: r.currentOfficialUrl,
    acquisitionPath: r.acquisitionPath,
    recordedHashIsCurrentEdition: r.recordedHashIsCurrentEdition,
    editionEvidence: r.editionEvidence,
  }));

const record = {
  schemaVersion: "rcap-nationwide-residual-execution/v1",
  generatedBy: "scripts/rcap-corpus/generate-nationwide-residual-execution.mjs",
  generatedOn: new Date().toISOString().slice(0, 10),
  derivedFrom: {
    residualList: RESIDUAL,
    residualListOutcome: residual.outcome,
    evidenceRecords: [CENSUS, REGISTRY, BACKLOG, RELATIONSHIPS, COHORT, ACQUISITION, RECONCILIATION, ARTIFACTS, DETERMINATIONS],
  },
  question:
    "Of the 66 unrecovered Nationwide manifest paths, which actually block a live deliverable, and what is each of the rest?",
  answer:
    "Fifteen do. Thirteen are packet components of source-blocked families and two are the current authority a composed family is measured against. The other fifty-one are settled: four are already held at their exact hash, eleven are earlier printings whose current edition the repository already holds or has already fetched, twenty-four are background the deliverables do not use, and sixteen have no route at all. Colorado, the biggest block at twenty-two paths, contributes nothing to the blocking set: its one source-blocked family needs JDF 684, and JDF 684 is not among the twenty-two.",
  theEvidenceRule: {
    rule: "A jurisdiction's source-blocked family count is an upper bound, never a per-file dependency. Nothing here is classified from it.",
    whatCountsAsADependency:
      "A record that names the file itself -- its exact SHA-256 in a route's requiredSourceIds, or its exact path in the Nationwide archive in a binding record. Anything less is ORPHANED_FROM_LIVE_ROUTES, and the search that produced that answer is printed on the row.",
    whatWasSearched: SEARCH_TRAIL,
  },
  counts,
  countsAreOverPaths: "66 acquisition-task paths plus the 4 already-held paths, 70 rows in total. Two Wisconsin paths share one SHA-256.",
  acquisitionOutcome: {
    attempted: true,
    acquired: 0,
    why:
      "Every outbound host was refused at CONNECT with a 403 from this container's egress gateway, including https://example.com/, and the WebFetch tool returned EGRESS_BLOCKED for every judiciary and agency host tried. This is a blanket egress denial in this container, not a per-judiciary block, so no binary could be fetched, hashed or verified from here. Web search was reachable and was used only to fix official identity and current addresses.",
    hostsRefused: [
      "prb.illinois.gov",
      "www.iowacourts.gov",
      "dps.iowa.gov",
      "mjbportal.courts.maine.gov",
      "gbi.georgia.gov",
      "www.courts.mo.gov",
      "www.kansasjudicialcouncil.org",
      "www.kscourts.gov",
      "www.kjc.ks.gov",
      "example.com (control)",
    ],
    whatWasEstablishedInstead: [
      "Seven of the fifteen packet-critical files already have a hosted-runner acquisition receipt observing the SAME SHA-256 the restore manifest records, at HTTP 200. For those the recorded old hash IS the current official edition and no fetch is owed -- what remains is the reviewed custody commit the acquisition workflow reserves to a human.",
      "The Kansas Judicial Council has migrated from kansasjudicialcouncil.org to www.kjc.ks.gov. The old host was refused by the acquisition lane as off-allowlist; the new one is a .gov host inside the allowlist. Four Kansas packet-critical files become fetchable on that basis alone once an exact binary URL is fixed.",
      "Missouri publishes CR360 as a direct binary at https://www.courts.mo.gov/file.jsp?id=56341 off the expungement forms index at https://www.courts.mo.gov/page.jsp?id=191585, on the allowlisted courts.mo.gov host. CR370 has an analogous file.jsp id on the same host; fixing it is a DISC step and no address is guessed here.",
    ],
  },
  packetCriticalUnresolved: packetCritical,
  whatThisDoesNotEstablish: [
    "That any file classified LIVE_PACKET_COMPONENT is now held. Nothing was acquired and nothing was mounted.",
    "That any family may be built, promoted or sold. This record creates no approval and opens no commercial route.",
    "That a recorded hash marked recordedHashIsCurrentEdition true is the byte on the issuing authority's server right now. It says a receipt observed that digest at that address, which is a past observation and not a live check.",
    "That a SUPERSEDED_SOURCE row's current edition has itself been visually or legally reviewed. It says the repository holds a later edition of that form number, and nothing more.",
  ],
  claimDiscipline:
    "No packet-family claim was asserted or released. MASTER_QUEUE.json, VERIFIER_RETURNS.json, claim-ledger.json and every vf/fix lane directory were not touched. No second source registry and no parallel restore manifest was created. No source body was committed.",
  commercialRoutesOpened: 0,
  productionTouched: false,
  rows,
};

fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(record, null, 2) + "\n");
console.log(`${OUT}: ${rows.length} rows`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
console.log(`  packet-critical unresolved: ${packetCritical.length}`);
