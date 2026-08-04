import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";

import {
  PDFDocument,
  StandardFonts,
  rgb
} from "pdf-lib";

import { inspectPdfBytes } from "./pdf-inspection.mjs";
import {
  normalizeRepoPath,
  pathRuleMatches,
  reviewManifestPathFor,
  validateJobWorkspace
} from "./validation.mjs";

export const REVIEW_ARTIFACT_RENDERER_VERSION =
  "rcap-factory-shared-layout-pdf-png/v1";
export const SYNTHETIC_FIXTURE_VERSION = "rcap-factory-synthetic-fixture/v1";
export const FIXED_PDF_METADATA_DATE = new Date("2000-01-01T00:00:00.000Z");

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const COLORS = Object.freeze({
  navy: [22, 42, 69],
  blue: [43, 95, 132],
  ink: [24, 31, 42],
  muted: [92, 105, 117],
  line: [196, 204, 213],
  paper: [255, 255, 255],
  warning: [148, 49, 38],
  pale: [244, 247, 250]
});

/**
 * Generate a synthetic, non-filing review packet and a PNG for every page.
 * The PDF and PNG renderer consume exactly the same layout object.
 */
export async function generateJobReviewArtifacts(
  job,
  {
    rootDir = process.cwd(),
    authorityVersion = null,
    authorityEdition = null,
    artifactDirectory,
    manifestPath,
    performValidation = true,
    validationScope = "worker",
    validationReport = null,
    write = true
  } = {}
) {
  if (!job || typeof job !== "object") {
    throw new Error("A job manifest is required to generate review artifacts");
  }
  const root = path.resolve(rootDir);
  const relativeArtifactDirectory = normalizeRepoPath(
    artifactDirectory ?? `artifacts/rcap-factory/reviews/${job.jobId}`
  );
  const relativeManifestPath = normalizeRepoPath(
    manifestPath ?? reviewManifestPathFor(job.jobId)
  );

  if (
    !(job.integrationOwnedOutputs ?? []).some((integrationOutput) =>
      pathRuleMatches(integrationOutput, relativeManifestPath)
    )
  ) {
    throw new Error(
      `Review manifest ${relativeManifestPath} is not one of ${job.jobId}'s integrationOwnedOutputs`
    );
  }
  assertArtifactDirectoryIgnored(root, relativeArtifactDirectory);
  assertManifestTrackable(root, relativeManifestPath);

  let focusedValidation = validationReport;
  if (!focusedValidation && performValidation) {
    focusedValidation = validateJobWorkspace(job, {
      rootDir: root,
      changedPaths: validationScope === "integration" ? [] : undefined,
      runCommands: true,
      requireExpectedOutputs: true
    });
  }
  if (focusedValidation && !focusedValidation.passed) {
    const error = new Error(
      `Focused validation failed; review artifacts were not generated for ${job.jobId}`
    );
    error.validationReport = focusedValidation;
    throw error;
  }

  const layout = buildSyntheticReviewLayout(job);
  const pdfBytes = await renderSyntheticReviewPdf(layout);
  const repeatedPdfBytes = await renderSyntheticReviewPdf(layout);
  const pdfHash = sha256(pdfBytes);
  const pdfDeterministic = pdfHash === sha256(repeatedPdfBytes);
  if (!pdfDeterministic) {
    throw new Error("Synthetic PDF renderer produced non-deterministic bytes");
  }

  const pdfInspection = await inspectPdfBytes(pdfBytes, {
    source: {
      kind: "generated",
      value: `${relativeArtifactDirectory}/synthetic-review.pdf`,
      fileName: "synthetic-review.pdf"
    }
  });
  if (
    pdfInspection.errors.length > 0 ||
    pdfInspection.pageCount !== layout.pages.length
  ) {
    throw new Error(
      `Synthetic PDF page verification failed: expected ${layout.pages.length}, inspected ${pdfInspection.pageCount}`
    );
  }

  const renderedPages = layout.pages.map((page, pageIndex) => {
    const pngBytes = renderReviewPagePng(page, layout);
    const repeatedPngBytes = renderReviewPagePng(page, layout);
    const pngHash = sha256(pngBytes);
    if (pngHash !== sha256(repeatedPngBytes)) {
      throw new Error(`Synthetic PNG renderer was non-deterministic on page ${pageIndex + 1}`);
    }
    return {
      page: pageIndex + 1,
      fileName: `page-${String(pageIndex + 1).padStart(3, "0")}.png`,
      relativePath: `${relativeArtifactDirectory}/pages/page-${String(pageIndex + 1).padStart(3, "0")}.png`,
      sha256: pngHash,
      bytes: pngBytes.length,
      width: layout.width,
      height: layout.height,
      pngBytes
    };
  });

  const implementationOutputs = inspectImplementationOutputs(
    root,
    job.expectedOutputs ?? []
  );
  const participantPacketProof = inspectParticipantPacketProof(root, job);
  const manifest = buildReviewManifest({
    rootDir: root,
    job,
    authorityVersion,
    authorityEdition,
    artifactDirectory: relativeArtifactDirectory,
    manifestPath: relativeManifestPath,
    layout,
    pdfBytes,
    pdfHash,
    pdfInspection,
    renderedPages,
    implementationOutputs,
    participantPacketProof,
    focusedValidation
  });

  if (write) {
    const absoluteArtifactDirectory = path.join(root, relativeArtifactDirectory);
    const pagesDirectory = path.join(absoluteArtifactDirectory, "pages");
    fs.mkdirSync(pagesDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(absoluteArtifactDirectory, "synthetic-review.pdf"),
      pdfBytes
    );
    for (const page of renderedPages) {
      fs.writeFileSync(path.join(root, page.relativePath), page.pngBytes);
    }
    fs.writeFileSync(
      path.join(absoluteArtifactDirectory, "technical-checklist.json"),
      `${JSON.stringify(manifest.technicalChecklist, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(absoluteArtifactDirectory, "visual-checklist.json"),
      `${JSON.stringify(manifest.visualChecklist, null, 2)}\n`
    );
    const absoluteManifestPath = path.join(root, relativeManifestPath);
    fs.mkdirSync(path.dirname(absoluteManifestPath), { recursive: true });
    fs.writeFileSync(
      absoluteManifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`
    );
  }

  return {
    manifest,
    manifestPath: relativeManifestPath,
    artifactDirectory: relativeArtifactDirectory,
    pdfBytes,
    renderedPages: renderedPages.map(withoutPngBytes)
  };
}

export function buildSyntheticReviewLayout(job) {
  const trackIds =
    Array.isArray(job.trackIds) && job.trackIds.length > 0
      ? job.trackIds
      : ["NO-TRACK-NORMALIZATION-JOB"];
  const pages = trackIds.map((trackId, pageIndex) => {
    const elements = [
      {
        type: "rectangle",
        x: 0,
        y: PAGE_HEIGHT - 88,
        width: PAGE_WIDTH,
        height: 88,
        color: COLORS.navy
      },
      {
        type: "text",
        x: 40,
        y: PAGE_HEIGHT - 48,
        size: 18,
        color: COLORS.paper,
        text: "LEGALEASE RCAP FACTORY"
      },
      {
        type: "text",
        x: 40,
        y: PAGE_HEIGHT - 70,
        size: 10,
        color: COLORS.paper,
        text: "SYNTHETIC REVIEW PROOF - NOT FOR FILING"
      },
      {
        type: "rectangle",
        x: 40,
        y: PAGE_HEIGHT - 150,
        width: PAGE_WIDTH - 80,
        height: 40,
        color: COLORS.pale,
        borderColor: COLORS.line,
        borderWidth: 1
      },
      {
        type: "text",
        x: 54,
        y: PAGE_HEIGHT - 134,
        size: 11,
        color: COLORS.warning,
        text: "ALL NAMES AND CASE VALUES ON THIS PAGE ARE SYNTHETIC."
      }
    ];

    const lines = [
      ["JOB ID", job.jobId],
      ["JURISDICTION", job.jurisdiction],
      ["TRACK", trackId],
      ["STRATEGY", job.strategyFamily],
      ["LANE", job.lane],
      ["SAMPLE PARTICIPANT", "ALEX SAMPLE"],
      ["SAMPLE CASE", `SYN-${String(pageIndex + 1).padStart(4, "0")}`],
      ["AUTHORITY BASE", job.baseCommit],
      ["REVIEW STATE", "TECHNICAL PROOF ONLY - VISUAL AND LEGAL REVIEW PENDING"]
    ];
    let y = PAGE_HEIGHT - 205;
    for (const [label, value] of lines) {
      elements.push({
        type: "text",
        x: 48,
        y,
        size: 9,
        color: COLORS.muted,
        text: label
      });
      for (const [lineIndex, text] of wrapText(String(value ?? ""), 56).entries()) {
        elements.push({
          type: "text",
          x: 180,
          y: y - lineIndex * 15,
          size: 10,
          color: COLORS.ink,
          text
        });
      }
      y -= Math.max(31, wrapText(String(value ?? ""), 56).length * 15 + 12);
      elements.push({
        type: "line",
        x1: 48,
        y1: y + 17,
        x2: PAGE_WIDTH - 48,
        y2: y + 17,
        color: COLORS.line,
        width: 1
      });
    }
    elements.push({
      type: "text",
      x: 48,
      y: 42,
      size: 8,
      color: COLORS.muted,
      text: `PAGE ${pageIndex + 1} OF ${trackIds.length} - ${SYNTHETIC_FIXTURE_VERSION}`
    });
    return {
      pageNumber: pageIndex + 1,
      trackId,
      elements
    };
  });

  return {
    schemaVersion: "rcap-factory-review-layout/v1",
    rendererVersion: REVIEW_ARTIFACT_RENDERER_VERSION,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    pages
  };
}

export async function renderSyntheticReviewPdf(layout) {
  const document = await PDFDocument.create({ updateMetadata: false });
  document.setTitle("LegalEase RCAP Factory Synthetic Review Proof");
  document.setAuthor("LegalEase RCAP Production Factory");
  document.setSubject("Synthetic technical review artifact; not for filing");
  document.setKeywords([
    "LegalEase",
    "RCAP",
    "synthetic",
    "review",
    "not for filing"
  ]);
  document.setProducer(REVIEW_ARTIFACT_RENDERER_VERSION);
  document.setCreator(REVIEW_ARTIFACT_RENDERER_VERSION);
  document.setCreationDate(FIXED_PDF_METADATA_DATE);
  document.setModificationDate(FIXED_PDF_METADATA_DATE);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  for (const layoutPage of layout.pages) {
    const page = document.addPage([layout.width, layout.height]);
    for (const element of layoutPage.elements) {
      if (element.type === "rectangle") {
        page.drawRectangle({
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          color: pdfColor(element.color),
          borderColor: element.borderColor
            ? pdfColor(element.borderColor)
            : undefined,
          borderWidth: element.borderWidth ?? 0
        });
      } else if (element.type === "line") {
        page.drawLine({
          start: { x: element.x1, y: element.y1 },
          end: { x: element.x2, y: element.y2 },
          thickness: element.width ?? 1,
          color: pdfColor(element.color)
        });
      } else if (element.type === "text") {
        page.drawText(sanitizePdfText(element.text), {
          x: element.x,
          y: element.y,
          size: element.size,
          font: element.size >= 16 ? bold : font,
          color: pdfColor(element.color)
        });
      }
    }
  }

  return Buffer.from(
    await document.save({
      addDefaultPage: false,
      useObjectStreams: false,
      objectsPerTick: Number.POSITIVE_INFINITY,
      updateFieldAppearances: false
    })
  );
}

export function renderReviewPagePng(page, layout) {
  const raster = createRaster(layout.width, layout.height, COLORS.paper);
  for (const element of page.elements) {
    if (element.type === "rectangle") {
      fillRectanglePdfCoordinates(
        raster,
        element.x,
        element.y,
        element.width,
        element.height,
        element.color
      );
      if (element.borderColor && element.borderWidth) {
        strokeRectanglePdfCoordinates(
          raster,
          element.x,
          element.y,
          element.width,
          element.height,
          element.borderColor,
          element.borderWidth
        );
      }
    } else if (element.type === "line") {
      drawLinePdfCoordinates(
        raster,
        element.x1,
        element.y1,
        element.x2,
        element.y2,
        element.color,
        element.width ?? 1
      );
    } else if (element.type === "text") {
      drawBitmapTextPdfCoordinates(
        raster,
        element.x,
        element.y,
        sanitizeRasterText(element.text),
        element.size,
        element.color
      );
    }
  }
  return encodePng(raster);
}

export function verifyTrackedReviewManifest(
  rootDir,
  job,
  manifestPath = reviewManifestPathFor(job.jobId)
) {
  const relativePath = normalizeRepoPath(manifestPath);
  const absolutePath = path.join(rootDir, relativePath);
  const failures = [];
  if (!fs.existsSync(absolutePath)) {
    failures.push(`review manifest missing: ${relativePath}`);
    return { passed: false, manifestPath: relativePath, failures, manifest: null };
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    failures.push(`review manifest is not valid JSON: ${error.message}`);
    return { passed: false, manifestPath: relativePath, failures, manifest: null };
  }
  if (manifest.jobId !== job.jobId) failures.push("review manifest jobId does not match");
  if (manifest.jurisdiction !== job.jurisdiction) {
    failures.push("review manifest jurisdiction does not match");
  }
  if (manifest.baseCommit !== (job.completionCommit ?? job.baseCommit)) {
    failures.push("review manifest baseCommit does not match");
  }
  if (!/^[0-9a-f]{64}$/.test(manifest.packet?.sha256 ?? "")) {
    failures.push("review manifest packet hash is missing or invalid");
  }
  if (
    !Number.isInteger(manifest.packet?.pageCount) ||
    manifest.packet.pageCount < 1
  ) {
    failures.push("review manifest packet page count is invalid");
  }
  if (
    !Array.isArray(manifest.renderedPages) ||
    manifest.renderedPages.length !== manifest.packet?.pageCount
  ) {
    failures.push("review manifest rendered-page count does not match packet");
  } else if (
    manifest.renderedPages.some(
      (page) =>
        !Number.isInteger(page.page) ||
        !/^[0-9a-f]{64}$/.test(page.sha256 ?? "")
    )
  ) {
    failures.push("review manifest rendered-page metadata is invalid");
  }
  if (manifest.technicalProofPassed !== true) {
    failures.push("review manifest technical proof is not passed");
  }
  if (manifest.visualProofPassed !== false) {
    failures.push("generated review manifest must leave visual proof pending");
  }
  if (manifest.counselAdopted !== false) {
    failures.push("generated review manifest must not adopt counsel approval");
  }
  return {
    passed: failures.length === 0,
    manifestPath: relativePath,
    failures,
    manifest
  };
}

function buildReviewManifest({
  rootDir,
  job,
  authorityVersion,
  authorityEdition,
  artifactDirectory,
  manifestPath,
  layout,
  pdfBytes,
  pdfHash,
  pdfInspection,
  renderedPages,
  implementationOutputs,
  participantPacketProof,
  focusedValidation
}) {
  const focusedPassed = focusedValidation?.passed === true;
  const technicalChecklist = {
    status: focusedValidation ? (focusedPassed ? "passed" : "failed") : "pending",
    items: [
      {
        id: "synthetic-data-only",
        status: "passed",
        evidence: "Packet labels every value synthetic and not for filing."
      },
      {
        id: "focused-worker-validation",
        status: focusedValidation
          ? focusedPassed
            ? "passed"
            : "failed"
          : "not_run",
        evidence: focusedValidation
          ? `${focusedValidation.commandResults.length} focused command(s); ${focusedValidation.failures.length} failure(s).`
          : "Library caller explicitly supplied no workspace validation."
      },
      {
        id: "deterministic-pdf",
        status: "passed",
        evidence: `Two renders matched SHA-256 ${pdfHash}.`
      },
      {
        id: "pdf-page-count",
        status: "passed",
        evidence: `${pdfInspection.pageCount} page(s) inspected from generated bytes.`
      },
      {
        id: "deterministic-page-images",
        status: "passed",
        evidence: `${renderedPages.length} PNG render(s) reproduced byte-for-byte.`
      },
      {
        id: "expected-output-hashes",
        status: implementationOutputs.every((output) => output.exists)
          ? "passed"
          : "failed",
        evidence: `${implementationOutputs.filter((output) => output.exists).length} of ${implementationOutputs.length} expected outputs hashed.`
      },
      {
        id: "participant-packet-proof",
        status: participantPacketProof
          ? participantPacketProof.verified
            ? "passed"
            : "failed"
          : "not_applicable",
        evidence: participantPacketProof
          ? `${participantPacketProof.finalPdfCount} final participant PDF hash(es), ${participantPacketProof.assembledPageCount} total page(s), reconciled from ${participantPacketProof.sourceManifestPath}.`
          : "This job has no tranche participant-packet review manifest."
      }
    ]
  };
  const visualChecklist = {
    status: "pending",
    items: [
      "Confirm every page is legible at normal zoom.",
      "Confirm no text is clipped, overlapped, or outside page bounds.",
      "Confirm page order and track labels match the assigned job.",
      "Confirm checkbox, radio, overlay, and signature placement when applicable.",
      "Confirm participant and third-party fields are visually distinguishable.",
      "Record reviewer name, date, defects, and disposition; generation itself grants no approval."
    ].map((label, index) => ({
      id: `visual-${String(index + 1).padStart(2, "0")}`,
      label,
      status: "pending",
      reviewer: null,
      reviewedAt: null,
      notes: null
    }))
  };

  return {
    schemaVersion: "rcap-factory-review-manifest/v1",
    jobId: job.jobId,
    lane: job.lane,
    jurisdiction: job.jurisdiction,
    trackIds: [...(job.trackIds ?? [])],
    strategyFamily: job.strategyFamily,
    baseCommit: job.completionCommit ?? job.baseCommit,
    authorityVersion,
    authorityEdition,
    generatedAt: stableCommitTimestamp(
      rootDir,
      job.completionCommit ?? job.baseCommit
    ),
    syntheticData: true,
    filingUseAllowed: false,
    artifactTracking: {
      generatedAssetsTracked: false,
      artifactDirectory,
      reviewManifestTracked: true,
      reviewManifestPath: manifestPath,
      note:
        "Generated PDFs and PNGs are reproducible and ignored. This JSON manifest is the tracked proof record."
    },
    reproducibility: {
      rendererVersion: REVIEW_ARTIFACT_RENDERER_VERSION,
      fixtureVersion: SYNTHETIC_FIXTURE_VERSION,
      fixedPdfMetadataDate: FIXED_PDF_METADATA_DATE.toISOString(),
      sharedLayoutSha256: sha256(
        Buffer.from(JSON.stringify(layout), "utf8")
      )
    },
    packet: {
      fileName: "synthetic-review.pdf",
      relativePath: `${artifactDirectory}/synthetic-review.pdf`,
      sha256: pdfHash,
      bytes: pdfBytes.length,
      pageCount: layout.pages.length,
      structureClass: pdfInspection.structureClass
    },
    packetHashes: [
      {
        relativePath: `${artifactDirectory}/synthetic-review.pdf`,
        sha256: pdfHash
      }
    ],
    pageCounts: {
      packet: layout.pages.length,
      renderedImages: renderedPages.length
    },
    renderedPages: renderedPages.map(withoutPngBytes),
    implementationOutputs,
    participantPacketProof,
    technicalChecklist,
    visualChecklist,
    technicalProofPassed:
      technicalChecklist.items.every((item) =>
        ["passed", "not_applicable"].includes(item.status)
      ),
    visualProofPassed: false,
    legalRecommendationComplete: false,
    counselAdopted: false,
    stagingPassed: false,
    productionEnabled: false
  };
}

function inspectParticipantPacketProof(rootDir, job) {
  for (const relativePath of [
    ...(job.expectedOutputs ?? []),
    ...(job.integrationOwnedOutputs ?? [])
  ]) {
    if (
      !/^data\/record-clearing\/implementation-tranches\/tranche-\d+-review-manifest\.json$/.test(
        relativePath
      )
    ) {
      continue;
    }
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const sourceBytes = fs.readFileSync(absolutePath);
    const source = JSON.parse(sourceBytes.toString("utf8"));
    if (!Array.isArray(source.samplePackets)) continue;

    const packets = source.samplePackets.map((packet) => ({
      trackId: packet.trackId,
      fileName: packet.assembledFileName,
      sha256: packet.assembledSha256,
      pageCount: packet.assembledPageCount
    }));
    const finalPdfCount = packets.length;
    const assembledPageCount = packets.reduce(
      (total, packet) => total + packet.pageCount,
      0
    );
    const expectedTrackIds = [...(job.trackIds ?? [])].sort();
    const actualTrackIds = packets.map((packet) => packet.trackId).sort();
    const verified =
      finalPdfCount === source.implementedTrackCount &&
      assembledPageCount === source.assembledPageCount &&
      new Set(actualTrackIds).size === actualTrackIds.length &&
      JSON.stringify(actualTrackIds) === JSON.stringify(expectedTrackIds) &&
      packets.every(
        (packet) =>
          typeof packet.fileName === "string" &&
          /^[0-9a-f]{64}$/.test(packet.sha256 ?? "") &&
          Number.isInteger(packet.pageCount) &&
          packet.pageCount > 0
      );
    if (!verified) {
      throw new Error(
        `${job.jobId} participant packet hashes or page counts do not reconcile with ${relativePath}`
      );
    }
    return {
      sourceManifestPath: relativePath,
      sourceManifestSha256: sha256(sourceBytes),
      finalPdfCount,
      assembledPageCount,
      packets,
      verified
    };
  }
  return null;
}

function inspectImplementationOutputs(rootDir, outputs) {
  return outputs.map((entry) => {
    const relativePath = normalizeRepoPath(
      typeof entry === "string" ? entry : entry.path
    );
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return {
        relativePath,
        exists: false,
        kind: null,
        bytes: null,
        sha256: null
      };
    }
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      const digest = crypto.createHash("sha256");
      let totalBytes = 0;
      for (const file of listFiles(absolutePath)) {
        const relativeFile = path
          .relative(absolutePath, file)
          .replaceAll(path.sep, "/");
        const bytes = fs.readFileSync(file);
        digest.update(relativeFile);
        digest.update("\0");
        digest.update(bytes);
        digest.update("\0");
        totalBytes += bytes.length;
      }
      return {
        relativePath,
        exists: true,
        kind: "directory",
        bytes: totalBytes,
        sha256: digest.digest("hex")
      };
    }
    const bytes = fs.readFileSync(absolutePath);
    return {
      relativePath,
      exists: true,
      kind: "file",
      bytes: bytes.length,
      sha256: sha256(bytes)
    };
  });
}

function withoutPngBytes(page) {
  return Object.fromEntries(
    Object.entries(page).filter(([key]) => key !== "pngBytes")
  );
}

function assertArtifactDirectoryIgnored(rootDir, relativeDirectory) {
  if (!relativeDirectory.startsWith("artifacts/")) {
    throw new Error(
      `Generated review assets must live under ignored artifacts/: ${relativeDirectory}`
    );
  }
  if (!isGitRepository(rootDir)) return;
  const result = spawnSync(
    "git",
    ["check-ignore", "--quiet", "--no-index", `${relativeDirectory}/synthetic-review.pdf`],
    { cwd: rootDir, encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(
      `Generated review asset path is not ignored by git: ${relativeDirectory}`
    );
  }
}

function assertManifestTrackable(rootDir, relativeManifestPath) {
  if (
    !relativeManifestPath.startsWith(
      "data/record-clearing/production-factory/review-manifests/"
    )
  ) {
    throw new Error(
      `Tracked review manifests must use the production-factory manifest directory: ${relativeManifestPath}`
    );
  }
  if (!isGitRepository(rootDir)) return;
  const result = spawnSync(
    "git",
    ["check-ignore", "--quiet", "--no-index", relativeManifestPath],
    { cwd: rootDir, encoding: "utf8" }
  );
  if (result.status === 0) {
    throw new Error(`Review manifest path is ignored and cannot be tracked: ${relativeManifestPath}`);
  }
}

function stableCommitTimestamp(rootDir, commit) {
  const result = spawnSync(
    "git",
    ["show", "-s", "--format=%cI", commit],
    { cwd: rootDir, encoding: "utf8" }
  );
  const value = result.status === 0 ? result.stdout.trim() : "";
  return value || FIXED_PDF_METADATA_DATE.toISOString();
}

function listFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolutePath));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function wrapText(value, width) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= width) {
      line = `${line} ${word}`;
    } else {
      lines.push(line.slice(0, width));
      line = word;
    }
    while (line.length > width) {
      lines.push(line.slice(0, width));
      line = line.slice(width);
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pdfColor(color) {
  return rgb(color[0] / 255, color[1] / 255, color[2] / 255);
}

function sanitizePdfText(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?");
}

function sanitizeRasterText(value) {
  return sanitizePdfText(value).toUpperCase();
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function isGitRepository(rootDir) {
  return (
    spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: rootDir,
      encoding: "utf8"
    }).status === 0
  );
}

// -------------------------------------------------------------------------
// Dependency-free raster and PNG encoder
// -------------------------------------------------------------------------

function createRaster(width, height, background) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let offset = 0; offset < pixels.length; offset += 3) {
    pixels[offset] = background[0];
    pixels[offset + 1] = background[1];
    pixels[offset + 2] = background[2];
  }
  return { width, height, pixels };
}

function setPixel(raster, x, y, color) {
  const column = Math.round(x);
  const row = Math.round(y);
  if (
    column < 0 ||
    column >= raster.width ||
    row < 0 ||
    row >= raster.height
  ) {
    return;
  }
  const offset = (row * raster.width + column) * 3;
  raster.pixels[offset] = color[0];
  raster.pixels[offset + 1] = color[1];
  raster.pixels[offset + 2] = color[2];
}

function fillRectanglePdfCoordinates(raster, x, y, width, height, color) {
  const left = Math.max(0, Math.floor(x));
  const right = Math.min(raster.width, Math.ceil(x + width));
  const top = Math.max(0, Math.floor(raster.height - (y + height)));
  const bottom = Math.min(raster.height, Math.ceil(raster.height - y));
  for (let row = top; row < bottom; row += 1) {
    for (let column = left; column < right; column += 1) {
      setPixel(raster, column, row, color);
    }
  }
}

function strokeRectanglePdfCoordinates(
  raster,
  x,
  y,
  width,
  height,
  color,
  thickness
) {
  fillRectanglePdfCoordinates(raster, x, y, width, thickness, color);
  fillRectanglePdfCoordinates(
    raster,
    x,
    y + height - thickness,
    width,
    thickness,
    color
  );
  fillRectanglePdfCoordinates(raster, x, y, thickness, height, color);
  fillRectanglePdfCoordinates(
    raster,
    x + width - thickness,
    y,
    thickness,
    height,
    color
  );
}

function drawLinePdfCoordinates(
  raster,
  x1,
  y1,
  x2,
  y2,
  color,
  thickness
) {
  const startY = raster.height - y1;
  const endY = raster.height - y2;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(endY - startY);
  const steps = Math.max(1, Math.ceil(Math.max(dx, dy)));
  for (let step = 0; step <= steps; step += 1) {
    const x = x1 + ((x2 - x1) * step) / steps;
    const y = startY + ((endY - startY) * step) / steps;
    for (let offsetX = 0; offsetX < thickness; offsetX += 1) {
      for (let offsetY = 0; offsetY < thickness; offsetY += 1) {
        setPixel(raster, x + offsetX, y + offsetY, color);
      }
    }
  }
}

function drawBitmapTextPdfCoordinates(
  raster,
  x,
  baselineY,
  text,
  size,
  color
) {
  const scale = Math.max(1, Math.floor(size / 6));
  const glyphHeight = 7 * scale;
  const top = Math.round(raster.height - baselineY - glyphHeight);
  let cursor = Math.round(x);
  for (const character of text) {
    const rows = FONT_5X7[character] ?? FONT_5X7["?"];
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        if ((rows[row] & (1 << (4 - column))) === 0) continue;
        for (let pixelY = 0; pixelY < scale; pixelY += 1) {
          for (let pixelX = 0; pixelX < scale; pixelX += 1) {
            setPixel(
              raster,
              cursor + column * scale + pixelX,
              top + row * scale + pixelY,
              color
            );
          }
        }
      }
    }
    cursor += 6 * scale;
    if (cursor >= raster.width - scale) break;
  }
}

function encodePng(raster) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(raster.width, 0);
  header.writeUInt32BE(raster.height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const stride = raster.width * 3;
  const raw = Buffer.alloc((stride + 1) * raster.height);
  for (let row = 0; row < raster.height; row += 1) {
    const rawOffset = row * (stride + 1);
    raw[rawOffset] = 0;
    raster.pixels.copy(raw, rawOffset + 1, row * stride, (row + 1) * stride);
  }
  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const FONT_5X7 = Object.freeze({
  " ": [0, 0, 0, 0, 0, 0, 0],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "A": [14, 17, 17, 31, 17, 17, 17],
  "B": [30, 17, 17, 30, 17, 17, 30],
  "C": [14, 17, 16, 16, 16, 17, 14],
  "D": [30, 17, 17, 17, 17, 17, 30],
  "E": [31, 16, 16, 30, 16, 16, 31],
  "F": [31, 16, 16, 30, 16, 16, 16],
  "G": [14, 17, 16, 23, 17, 17, 15],
  "H": [17, 17, 17, 31, 17, 17, 17],
  "I": [14, 4, 4, 4, 4, 4, 14],
  "J": [7, 2, 2, 2, 18, 18, 12],
  "K": [17, 18, 20, 24, 20, 18, 17],
  "L": [16, 16, 16, 16, 16, 16, 31],
  "M": [17, 27, 21, 21, 17, 17, 17],
  "N": [17, 25, 21, 19, 17, 17, 17],
  "O": [14, 17, 17, 17, 17, 17, 14],
  "P": [30, 17, 17, 30, 16, 16, 16],
  "Q": [14, 17, 17, 17, 21, 18, 13],
  "R": [30, 17, 17, 30, 20, 18, 17],
  "S": [15, 16, 16, 14, 1, 1, 30],
  "T": [31, 4, 4, 4, 4, 4, 4],
  "U": [17, 17, 17, 17, 17, 17, 14],
  "V": [17, 17, 17, 17, 17, 10, 4],
  "W": [17, 17, 17, 21, 21, 21, 10],
  "X": [17, 17, 10, 4, 10, 17, 17],
  "Y": [17, 17, 10, 4, 4, 4, 4],
  "Z": [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [30, 1, 1, 14, 1, 1, 30],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 16, 30, 1, 1, 30],
  "6": [14, 16, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 1, 14],
  "-": [0, 0, 0, 31, 0, 0, 0],
  "_": [0, 0, 0, 0, 0, 0, 31],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 12, 8],
  ":": [0, 12, 12, 0, 12, 12, 0],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "#": [10, 31, 10, 10, 31, 10, 0],
  "'": [12, 12, 8, 0, 0, 0, 0]
});
