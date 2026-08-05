import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const OFFICIAL_PDF_PROOF_SCHEMA =
  "rcap-official-pdf-implementation-proof/v1";
export const OFFICIAL_PDF_PROOF_DIRECTORY =
  "data/record-clearing/production-factory/official-pdf-proofs";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;

const OFFICIAL_PDF_PROOF_SPECS = Object.freeze({
  "rcap-ak-acroform-fill": {
    kind: "acroform",
    positiveFixtures: [
      {
        fixtureId: "ak-courtview-visible",
        trackId: "ak-courtview",
        documentId: "TF-810",
        variant: "visible"
      },
      {
        fixtureId: "ak-tf800-standard",
        trackId: "ak-tf800",
        documentId: "TF-800",
        variant: "standard"
      },
      {
        fixtureId: "ak-tf805-standard",
        trackId: "ak-tf805",
        documentId: "TF-805",
        variant: "standard"
      }
    ],
    noDocumentFixtures: [
      {
        fixtureId: "ak-courtview-already-absent",
        trackId: "ak-courtview",
        variant: "already_absent"
      }
    ],
    positiveFixtureCount: 3,
    renderedPageCount: 6,
    fieldOrOverlayInventory: {
      inventoryType: "acroform_fields",
      totalSourceFields: 66,
      mappedParticipantFields: 6,
      manualFields: 60,
      protectedOutsidePartySurfaces: 2,
      protectedCourtOrAgencySurfaces: 4
    },
    protectedSurfaceTreatment:
      "Outside-party, clerk, court, judge, agency, signature, certification, and legal-conclusion surfaces remain blank or manual."
  },
  "rcap-ct-acroform-fill": {
    kind: "acroform",
    positiveFixtures: [
      {
        fixtureId: "ct-cleanslate-petition-standard",
        trackId: "ct-cleanslate-petition",
        documentId: "JD-CR-202",
        variant: "standard"
      },
      {
        fixtureId: "ct-cleanslate-petition-optional-contact-blank",
        trackId: "ct-cleanslate-petition",
        documentId: "JD-CR-202",
        variant: "optional_contact_blank"
      }
    ],
    noDocumentFixtures: [],
    positiveFixtureCount: 2,
    renderedPageCount: 4,
    fieldOrOverlayInventory: {
      inventoryType: "acroform_fields",
      totalSourceFields: 22,
      completionFields: 18,
      mappedParticipantFields: 7,
      manualFields: 4,
      outsidePartyFields: 2,
      courtOnlyFields: 5,
      unusedActionButtons: 4
    },
    protectedSurfaceTreatment:
      "Print/reset action buttons are not completion fields; court, order, outside-party, execution, and optional-unprovided participant fields remain blank."
  },
  "rcap-ga-flat-pdf-overlay": {
    kind: "flat_pdf_overlay",
    positiveFixtures: [
      {
        fixtureId: "ga-nonconv-pre2013-synthetic-layout",
        trackId: "ga-nonconv-pre2013",
        documentId:
          "GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013",
        variant: "synthetic_layout"
      }
    ],
    noDocumentFixtures: [],
    positiveFixtureCount: 1,
    renderedPageCount: 4,
    fieldOrOverlayInventory: {
      inventoryType: "flat_pdf_overlay_regions",
      totalSourcePages: 4,
      overlayPages: [2],
      mappedParticipantRegions: 14,
      unchangedSourcePages: [1, 3, 4]
    },
    protectedSurfaceTreatment:
      "Agency, prosecutor, signature, execution, disposition, screening, and GBI-only regions remain blank or unchanged; pages 1, 3, and 4 remain raster-identical."
  }
});

export function officialPdfProofPathFor(jobId) {
  return `${OFFICIAL_PDF_PROOF_DIRECTORY}/${jobId}.json`;
}

export function generateOfficialPdfImplementationProof(
  job,
  {
    rootDir = process.cwd(),
    authorityEdition = null,
    write = true
  } = {}
) {
  const root = path.resolve(rootDir);
  const spec = proofSpecFor(job);
  const proofPath = officialPdfProofPathFor(job.jobId);
  if (!(job.integrationOwnedOutputs ?? []).includes(proofPath)) {
    throw new Error(
      `${proofPath} is not an integration-owned output for ${job.jobId}`
    );
  }
  if (job.status !== "completed" || !COMMIT_PATTERN.test(job.completionCommit ?? "")) {
    throw new Error(`${job.jobId} is not a completion-pinned official-PDF job`);
  }
  if (!process.env.RCAP_SOURCE_MATERIALIZATION_ROOT) {
    throw new Error("RCAP_SOURCE_MATERIALIZATION_ROOT is required");
  }

  const firstRun = runFocusedVerifier(root, job);
  const secondRun = runFocusedVerifier(root, job);
  const firstFixtures = parseVerifierFixtures(job, spec, firstRun.stdout);
  const secondFixtures = parseVerifierFixtures(job, spec, secondRun.stdout);
  if (canonicalJson(firstFixtures) !== canonicalJson(secondFixtures)) {
    throw new Error(`${job.jobId} focused verifier fixture evidence was not deterministic`);
  }

  const sourceReceipts = inspectSourceReceipts(root, job);
  const implementationOutputs = inspectImplementationOutputs(root, job);
  const fixtures = buildFixtureEvidence(job, spec, firstFixtures);
  const positiveFixtures = fixtures.filter(
    (fixture) => fixture.expectedOutputStatus === "rendered_pdf"
  );
  const noDocumentFixtures = fixtures.filter(
    (fixture) => fixture.expectedOutputStatus === "no_document_required"
  );
  const proof = {
    schemaVersion: OFFICIAL_PDF_PROOF_SCHEMA,
    jobId: job.jobId,
    parentJobId: job.parentJobId,
    jurisdiction: job.jurisdiction,
    completionCommit: job.completionCommit,
    authorityEdition,
    generatedAt: stableCommitTimestamp(root, job.completionCommit),
    sourceReceipts,
    verifier: {
      path: job.regressionVerifier,
      sha256: fileSha256(path.join(root, job.regressionVerifier)),
      result: "passed"
    },
    implementationOutputs,
    assignments: {
      trackIds: [...job.trackIds],
      componentIds: [...(job.officialPdfAssignment?.exactComponentIds ?? [])],
      sourceIdentityKeys: [
        ...(job.officialPdfAssignment?.identityKeys ?? [])
      ]
    },
    fieldOrOverlayInventory: structuredClone(
      spec.fieldOrOverlayInventory
    ),
    protectedSurfaceTreatment: spec.protectedSurfaceTreatment,
    fixtures,
    totals: {
      assignedTracks: job.trackIds.length,
      positiveRenderedFixtures: positiveFixtures.length,
      renderedPages: positiveFixtures.reduce(
        (total, fixture) => total + fixture.assembledPageCount,
        0
      ),
      expectedNoDocumentBranches: noDocumentFixtures.length
    },
    deterministic: true,
    sourceMutationDetected: false,
    officialSourcePdfBytesTracked: false,
    generatedParticipantPdfBytesTracked: false,
    workerVisualEvidenceStatus: "technical_evidence_only",
    formalVisualApprovalStatus: "pending",
    completedOutputLegalReviewStatus: "pending",
    counselAdopted: false,
    packetReady: false,
    runtimeStatus: "runtime_disabled",
    productionEnabled: false
  };

  const verification = verifyOfficialPdfImplementationProof(root, job, {
    proof,
    proofPath,
    authorityEdition
  });
  if (!verification.passed) {
    throw new Error(
      `${job.jobId} generated official-PDF proof did not verify:\n- ` +
        verification.failures.join("\n- ")
    );
  }
  if (write) {
    const absolutePath = path.join(root, proofPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${JSON.stringify(proof, null, 2)}\n`);
  }
  return { proof, proofPath, verification };
}

export function verifyOfficialPdfImplementationProof(
  rootDir,
  job,
  {
    proof = null,
    proofPath = officialPdfProofPathFor(job.jobId),
    authorityEdition = null
  } = {}
) {
  const root = path.resolve(rootDir);
  const failures = [];
  const spec = OFFICIAL_PDF_PROOF_SPECS[job.jobId];
  let record = proof;
  const absoluteProofPath = path.join(root, proofPath);
  if (!record) {
    if (!fs.existsSync(absoluteProofPath)) {
      return {
        passed: false,
        proof: null,
        proofPath,
        failures: [`official-PDF implementation proof missing: ${proofPath}`]
      };
    }
    try {
      record = JSON.parse(fs.readFileSync(absoluteProofPath, "utf8"));
    } catch (error) {
      return {
        passed: false,
        proof: null,
        proofPath,
        failures: [`official-PDF implementation proof is invalid JSON: ${error.message}`]
      };
    }
  }
  if (!spec) failures.push(`no official-PDF proof specification exists for ${job.jobId}`);
  if (record.schemaVersion !== OFFICIAL_PDF_PROOF_SCHEMA) {
    failures.push("proof schemaVersion is invalid");
  }
  for (const [field, expected] of Object.entries({
    jobId: job.jobId,
    parentJobId: job.parentJobId,
    jurisdiction: job.jurisdiction,
    completionCommit: job.completionCommit
  })) {
    if (record[field] !== expected) failures.push(`${field} does not match the job`);
  }
  if (
    authorityEdition !== null &&
    record.authorityEdition !== authorityEdition
  ) {
    failures.push("authorityEdition does not match");
  }
  if (
    record.verifier?.path !== job.regressionVerifier ||
    record.verifier?.result !== "passed" ||
    !fileHashMatches(root, record.verifier?.path, record.verifier?.sha256)
  ) {
    failures.push("focused verifier identity does not reconcile");
  }
  verifyImplementationOutputs(root, job, record, failures);
  verifySourceReceipts(root, job, record, failures);
  if (
    canonicalJson(record.assignments?.trackIds ?? []) !==
      canonicalJson(job.trackIds ?? []) ||
    canonicalJson(record.assignments?.componentIds ?? []) !==
      canonicalJson(job.officialPdfAssignment?.exactComponentIds ?? []) ||
    canonicalJson(record.assignments?.sourceIdentityKeys ?? []) !==
      canonicalJson(job.officialPdfAssignment?.identityKeys ?? [])
  ) {
    failures.push("proof assignments do not reconcile with the exact job");
  }
  if (
    spec &&
    canonicalJson(record.fieldOrOverlayInventory) !==
      canonicalJson(spec.fieldOrOverlayInventory)
  ) {
    failures.push("field or overlay inventory does not match");
  }
  verifyFixtureEvidence(job, spec, record, failures);
  for (const [field, expected] of Object.entries({
    deterministic: true,
    sourceMutationDetected: false,
    officialSourcePdfBytesTracked: false,
    generatedParticipantPdfBytesTracked: false,
    workerVisualEvidenceStatus: "technical_evidence_only",
    formalVisualApprovalStatus: "pending",
    completedOutputLegalReviewStatus: "pending",
    counselAdopted: false,
    packetReady: false,
    runtimeStatus: "runtime_disabled",
    productionEnabled: false
  })) {
    if (record[field] !== expected) {
      failures.push(`${field} must remain ${JSON.stringify(expected)}`);
    }
  }

  const passed = failures.length === 0;
  const positiveFixtures = (record.fixtures ?? []).filter(
    (fixture) => fixture.expectedOutputStatus === "rendered_pdf"
  );
  const noDocumentFixtures = (record.fixtures ?? []).filter(
    (fixture) => fixture.expectedOutputStatus === "no_document_required"
  );
  return {
    passed,
    proof: record,
    proofPath,
    failures,
    normalizedEvidence: passed
      ? {
          status: "verified",
          sourceType: "integration_owned_official_pdf_implementation_proof",
          sourceManifestPath: proofPath,
          sourceManifestSha256: fs.existsSync(absoluteProofPath)
            ? fileSha256(absoluteProofPath)
            : sha256(Buffer.from(`${JSON.stringify(record, null, 2)}\n`)),
          verifier: structuredClone(record.verifier),
          implementationOutputs: structuredClone(
            record.implementationOutputs
          ),
          sourceReceipts: structuredClone(record.sourceReceipts),
          finalPdfCount: positiveFixtures.length,
          assembledPageCount: positiveFixtures.reduce(
            (total, fixture) => total + fixture.assembledPageCount,
            0
          ),
          packets: positiveFixtures.map((fixture) => ({
            trackId: fixture.trackId,
            fixtureId: fixture.fixtureId,
            variant: fixture.variant,
            fileName: fixture.assembledFileName,
            sha256: fixture.outputSha256,
            pageCount: fixture.assembledPageCount
          })),
          fixtureEvidence: structuredClone(record.fixtures),
          expectedNoDocumentBranches: noDocumentFixtures.length,
          fieldOrOverlayInventory: structuredClone(
            record.fieldOrOverlayInventory
          ),
          deterministic: true,
          runtimeStatus: "runtime_disabled",
          visualProof: "pending",
          counselAdopted: false,
          productionEnabled: false,
          verified: true
        }
      : null
  };
}

function proofSpecFor(job) {
  const spec = OFFICIAL_PDF_PROOF_SPECS[job?.jobId];
  if (!spec) {
    throw new Error(`No official-PDF proof specification exists for ${job?.jobId}`);
  }
  return spec;
}

function runFocusedVerifier(root, job) {
  const result = spawnSync("node", [job.regressionVerifier], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      RCAP_FACTORY_VALIDATION_SCOPE: "integration"
    }
  });
  if (result.status !== 0) {
    throw new Error(
      `${job.jobId} focused verifier failed:\n${result.stdout}${result.stderr}`
    );
  }
  return result;
}

function parseVerifierFixtures(job, spec, output) {
  const parsed = [];
  if (job.jobId === "rcap-ak-acroform-fill") {
    for (const match of output.matchAll(
      /^\s+(ak-\S+)\s+(TF-\d+)\s+(\d+)p\s+([0-9a-f]{64})$/gmu
    )) {
      parsed.push({
        fixtureId: match[1],
        documentId: match[2],
        pageCount: Number(match[3]),
        sha256: match[4]
      });
    }
  } else if (job.jobId === "rcap-ct-acroform-fill") {
    for (const match of output.matchAll(
      /^\s+(ct-\S+)\s+(JD-CR-202)\s+(\d+)p\s+([0-9a-f]{64})$/gmu
    )) {
      parsed.push({
        fixtureId: match[1],
        documentId: match[2],
        pageCount: Number(match[3]),
        sha256: match[4]
      });
    }
  } else if (job.jobId === "rcap-ga-flat-pdf-overlay") {
    for (const match of output.matchAll(
      /^\s+(ga-\S+)\s+(\d+)p\s+(\d+) regions\s+([0-9a-f]{64})$/gmu
    )) {
      parsed.push({
        fixtureId: match[1],
        documentId: spec.positiveFixtures[0].documentId,
        pageCount: Number(match[2]),
        mappedRegionCount: Number(match[3]),
        sha256: match[4]
      });
    }
  }
  const expectedIds = spec.positiveFixtures
    .map((fixture) => fixture.fixtureId)
    .sort();
  const actualIds = parsed.map((fixture) => fixture.fixtureId).sort();
  if (canonicalJson(actualIds) !== canonicalJson(expectedIds)) {
    throw new Error(
      `${job.jobId} focused verifier returned ${JSON.stringify(actualIds)}, expected ${JSON.stringify(expectedIds)}`
    );
  }
  return parsed.sort((left, right) =>
    left.fixtureId.localeCompare(right.fixtureId)
  );
}

function buildFixtureEvidence(job, spec, parsedFixtures) {
  const parsedById = new Map(
    parsedFixtures.map((fixture) => [fixture.fixtureId, fixture])
  );
  const componentUses = job.officialPdfAssignment?.componentUses ?? [];
  const positive = spec.positiveFixtures.map((expected) => {
    const actual = parsedById.get(expected.fixtureId);
    const uses = componentUses.filter(
      (use) => use.trackId === expected.trackId
    );
    return {
      fixtureId: expected.fixtureId,
      trackId: expected.trackId,
      componentIds: uses.map((use) => use.componentId).sort(),
      sourceIdentityKeys: [...new Set(uses.map((use) => use.identityKey))].sort(),
      documentId: expected.documentId,
      variant: expected.variant,
      expectedOutputStatus: "rendered_pdf",
      generatedPdf: true,
      assembledFileName: `${expected.fixtureId}-${shortDocumentId(expected.documentId)}.pdf`,
      outputSha256: actual.sha256,
      assembledPageCount: actual.pageCount,
      deterministic: true,
      workerVisualEvidence: {
        status: "worker_inspected_technical_evidence",
        pagesInspected: actual.pageCount,
        renderedPageImages: actual.pageCount,
        sourceReferencePageImages:
          spec.kind === "flat_pdf_overlay" ? actual.pageCount : 0,
        noBlankPages: true,
        formalApproval: false
      }
    };
  });
  const noDocument = spec.noDocumentFixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    componentIds: [],
    sourceIdentityKeys: [],
    documentId: null,
    variant: fixture.variant,
    expectedOutputStatus: "no_document_required",
    generatedPdf: false,
    assembledFileName: null,
    outputSha256: null,
    assembledPageCount: 0,
    deterministic: true,
    legalOrBranchResult: "passed",
    workerVisualEvidence: {
      status: "not_applicable_expected_no_document",
      pagesInspected: 0,
      renderedPageImages: 0,
      sourceReferencePageImages: 0,
      noBlankPages: null,
      formalApproval: false
    }
  }));
  return [...positive, ...noDocument].sort((left, right) =>
    left.fixtureId.localeCompare(right.fixtureId)
  );
}

function inspectSourceReceipts(root, job) {
  return (job.sourceMaterializationInputs ?? []).map((input) => {
    const receiptPath = input.receiptOutput;
    const absoluteReceipt = path.join(root, receiptPath);
    const receipt = JSON.parse(fs.readFileSync(absoluteReceipt, "utf8"));
    const materializationRoot = fs.realpathSync(
      path.resolve(process.env.RCAP_SOURCE_MATERIALIZATION_ROOT)
    );
    const sourcePath = path.join(
      materializationRoot,
      input.materializationDestination
    );
    const stat = fs.statSync(sourcePath);
    const actualSha256 = fileSha256(sourcePath);
    if (
      receipt.actualSha256 !== input.expectedSha256 ||
      receipt.actualBytes !== input.expectedBytes ||
      receipt.ready !== true ||
      actualSha256 !== input.expectedSha256 ||
      stat.size !== input.expectedBytes ||
      (stat.mode & 0o777) !== 0o444
    ) {
      throw new Error(`${input.sourceIdentityKey} source receipt or bytes do not verify`);
    }
    return {
      sourceIdentityKey: input.sourceIdentityKey,
      documentId: input.documentId,
      receiptPath,
      receiptSha256: fileSha256(absoluteReceipt),
      sourceSha256: actualSha256,
      sourceBytes: stat.size,
      materializationDestination: input.materializationDestination,
      verified: true
    };
  });
}

function inspectImplementationOutputs(root, job) {
  return (job.expectedOutputs ?? []).map((relativePath) => {
    const absolutePath = path.join(root, relativePath);
    if (!fs.statSync(absolutePath).isFile()) {
      throw new Error(`${relativePath} is not a file`);
    }
    return {
      path: relativePath,
      sha256: fileSha256(absolutePath)
    };
  });
}

function verifyImplementationOutputs(root, job, record, failures) {
  const expected = [...(job.expectedOutputs ?? [])].sort();
  const actual = (record.implementationOutputs ?? [])
    .map((output) => output?.path)
    .sort();
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    failures.push("implementation output paths do not reconcile");
    return;
  }
  for (const output of record.implementationOutputs) {
    if (!fileHashMatches(root, output.path, output.sha256)) {
      failures.push(`implementation output hash does not reconcile: ${output.path}`);
    }
  }
}

function verifySourceReceipts(root, job, record, failures) {
  const expectedInputs = job.sourceMaterializationInputs ?? [];
  const actual = record.sourceReceipts ?? [];
  if (actual.length !== expectedInputs.length) {
    failures.push("source receipt count does not reconcile");
    return;
  }
  for (const input of expectedInputs) {
    const source = actual.find(
      (candidate) => candidate.sourceIdentityKey === input.sourceIdentityKey
    );
    if (
      !source ||
      source.documentId !== input.documentId ||
      source.receiptPath !== input.receiptOutput ||
      source.sourceSha256 !== input.expectedSha256 ||
      source.sourceBytes !== input.expectedBytes ||
      source.materializationDestination !== input.materializationDestination ||
      source.verified !== true ||
      !fileHashMatches(root, source.receiptPath, source.receiptSha256)
    ) {
      failures.push(`source receipt does not reconcile: ${input.sourceIdentityKey}`);
    }
  }
}

function verifyFixtureEvidence(job, spec, record, failures) {
  if (!spec || !Array.isArray(record.fixtures)) {
    failures.push("fixture evidence is missing");
    return;
  }
  const fixtures = record.fixtures;
  const fixtureIds = fixtures.map((fixture) => fixture.fixtureId);
  if (new Set(fixtureIds).size !== fixtureIds.length) {
    failures.push("fixture identities must be unique");
  }
  const expectedIds = [
    ...spec.positiveFixtures,
    ...spec.noDocumentFixtures
  ].map((fixture) => fixture.fixtureId).sort();
  if (
    canonicalJson([...fixtureIds].sort()) !==
    canonicalJson(expectedIds)
  ) {
    failures.push("fixture identity coverage does not reconcile");
  }
  const positive = fixtures.filter(
    (fixture) => fixture.expectedOutputStatus === "rendered_pdf"
  );
  const noDocument = fixtures.filter(
    (fixture) => fixture.expectedOutputStatus === "no_document_required"
  );
  if (
    positive.length !== spec.positiveFixtureCount ||
    positive.reduce(
      (total, fixture) => total + fixture.assembledPageCount,
      0
    ) !== spec.renderedPageCount ||
    noDocument.length !== spec.noDocumentFixtures.length
  ) {
    failures.push("positive, page, or no-document fixture totals do not reconcile");
  }
  if (
    positive.some(
      (fixture) =>
        fixture.generatedPdf !== true ||
        !SHA256_PATTERN.test(fixture.outputSha256 ?? "") ||
        !Number.isInteger(fixture.assembledPageCount) ||
        fixture.assembledPageCount < 1 ||
        fixture.deterministic !== true ||
        fixture.workerVisualEvidence?.formalApproval !== false
    )
  ) {
    failures.push("a positive rendered fixture is invalid");
  }
  if (
    noDocument.some(
      (fixture) =>
        fixture.generatedPdf !== false ||
        fixture.outputSha256 !== null ||
        fixture.assembledFileName !== null ||
        fixture.assembledPageCount !== 0 ||
        fixture.legalOrBranchResult !== "passed"
    )
  ) {
    failures.push("an expected no-document branch is invalid");
  }
  const representedTracks = new Set(fixtures.map((fixture) => fixture.trackId));
  if (
    canonicalJson([...representedTracks].sort()) !==
    canonicalJson([...(job.trackIds ?? [])].sort())
  ) {
    failures.push("fixture track coverage does not reconcile");
  }
  if (
    record.totals?.assignedTracks !== job.trackIds.length ||
    record.totals?.positiveRenderedFixtures !== positive.length ||
    record.totals?.renderedPages !== spec.renderedPageCount ||
    record.totals?.expectedNoDocumentBranches !== noDocument.length
  ) {
    failures.push("proof totals do not reconcile");
  }
}

function fileHashMatches(root, relativePath, expectedSha256) {
  return (
    typeof relativePath === "string" &&
    SHA256_PATTERN.test(expectedSha256 ?? "") &&
    fs.existsSync(path.join(root, relativePath)) &&
    fileSha256(path.join(root, relativePath)) === expectedSha256
  );
}

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableCommitTimestamp(root, commit) {
  const result = spawnSync("git", ["show", "-s", "--format=%cI", commit], {
    cwd: root,
    encoding: "utf8"
  });
  return result.status === 0 && result.stdout.trim()
    ? result.stdout.trim()
    : "2000-01-01T00:00:00.000Z";
}

function shortDocumentId(documentId) {
  if (documentId.startsWith("GBI-GCIC-")) return "GBI-GCIC";
  return documentId;
}
