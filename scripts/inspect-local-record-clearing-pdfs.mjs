import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportDir = path.join(rootDir, "data/record-clearing/pdf-inspection");
const jsonReportPath = path.join(reportDir, "latest-report.json");
const markdownReportPath = path.join(reportDir, "latest-report.md");
const triageJsonReportPath = path.join(reportDir, "migration-triage.json");
const triageMarkdownReportPath = path.join(reportDir, "migration-triage.md");

const jurisdictionCodesByName = new Map(
  [
    ["Alabama", "AL"],
    ["Alaska", "AK"],
    ["Arizona", "AZ"],
    ["Arkansas", "AR"],
    ["California", "CA"],
    ["Colorado", "CO"],
    ["Connecticut", "CT"],
    ["Delaware", "DE"],
    ["Florida", "FL"],
    ["Georgia", "GA"],
    ["Hawaii", "HI"],
    ["Idaho", "ID"],
    ["Illinois", "IL"],
    ["Indiana", "IN"],
    ["Iowa", "IA"],
    ["Kansas", "KS"],
    ["Kentucky", "KY"],
    ["Louisiana", "LA"],
    ["Maine", "ME"],
    ["Maryland", "MD"],
    ["Massachusetts", "MA"],
    ["Michigan", "MI"],
    ["Minnesota", "MN"],
    ["Mississippi", "MS"],
    ["Missouri", "MO"],
    ["Montana", "MT"],
    ["Nebraska", "NE"],
    ["Nevada", "NV"],
    ["New Hampshire", "NH"],
    ["New Jersey", "NJ"],
    ["New Mexico", "NM"],
    ["New York", "NY"],
    ["North Carolina", "NC"],
    ["North Dakota", "ND"],
    ["Ohio", "OH"],
    ["Oklahoma", "OK"],
    ["Oregon", "OR"],
    ["Pennsylvania", "PA"],
    ["Rhode Island", "RI"],
    ["South Carolina", "SC"],
    ["South Dakota", "SD"],
    ["Tennessee", "TN"],
    ["Texas", "TX"],
    ["Utah", "UT"],
    ["Vermont", "VT"],
    ["Virginia", "VA"],
    ["Washington", "WA"],
    ["Washington State", "WA"],
    ["West Virginia", "WV"],
    ["Wisconsin", "WI"],
    ["Wyoming", "WY"],
    ["DC", "DC"],
    ["District Of Columbia", "DC"],
    ["District of Columbia", "DC"],
    ["Washington DC", "DC"]
  ].map(([name, code]) => [canonicalName(name), code])
);

const emptyClassificationCounts = {
  acroform_clean: 0,
  acroform_dirty: 0,
  xfa_pdf: 0,
  flat_pdf: 0,
  scanned_pdf: 0,
  encrypted_or_locked: 0,
  unreadable: 0,
  unknown: 0,
  manual_review: 0
};

const emptyMappingModeCounts = {
  acroform: 0,
  overlay: 0,
  hybrid: 0,
  manual_review: 0
};

const folderAliases = new Map([
  [
    canonicalName("Arkanasa"),
    {
      jurisdictionCode: "AR",
      normalizedJurisdictionName: "Arkansas",
      warning: "folder_name_misspelled"
    }
  ],
  [
    canonicalName("Tennesee"),
    {
      jurisdictionCode: "TN",
      normalizedJurisdictionName: "Tennessee",
      warning: "folder_name_misspelled"
    }
  ]
]);

export async function inspectLocalRecordClearingPdfs(options = {}) {
  const sourceDir = options.sourceDir ?? process.env.OFFICIAL_FORMS_SOURCE_DIR;
  if (!sourceDir || sourceDir.trim().length === 0) {
    throw new Error("OFFICIAL_FORMS_SOURCE_DIR is required and must point to the local official forms directory.");
  }

  const absoluteSourceDir = path.resolve(sourceDir);
  const sourceStat = fs.existsSync(absoluteSourceDir) ? fs.statSync(absoluteSourceDir) : null;
  if (!sourceStat?.isDirectory()) {
    throw new Error(`OFFICIAL_FORMS_SOURCE_DIR must be an existing directory: ${absoluteSourceDir}`);
  }

  const entries = fs.readdirSync(absoluteSourceDir, { withFileTypes: true });
  const mappedFolders = [];
  const unknownFolders = [];
  const skippedFiles = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const mapping = mapSourceFolder(entry.name);
      if (mapping) {
        mappedFolders.push({ ...mapping, absolutePath: path.join(absoluteSourceDir, entry.name) });
      } else {
        unknownFolders.push(entry.name);
      }
      continue;
    }

    if (!entry.name.toLowerCase().endsWith(".pdf")) {
      skippedFiles.push({
        fileName: entry.name,
        relativePath: entry.name,
        reason: "not_pdf"
      });
    }
  }

  mappedFolders.sort((a, b) => a.jurisdictionCode.localeCompare(b.jurisdictionCode) || a.sourceFolderName.localeCompare(b.sourceFolderName));

  const pdfs = [];
  for (const folder of mappedFolders) {
    const filePaths = listFilesRecursive(folder.absolutePath);
    for (const absolutePath of filePaths) {
      const relativePath = path.relative(absoluteSourceDir, absolutePath);
      if (!absolutePath.toLowerCase().endsWith(".pdf")) {
        skippedFiles.push({
          fileName: path.basename(absolutePath),
          relativePath,
          reason: "not_pdf"
        });
        continue;
      }

      pdfs.push(inspectPdfFile({ ...folder, absolutePath, relativePath }));
    }
  }

  const safeSourceDir = options.safeReport === false ? absoluteSourceDir : makeSafeReportPath(absoluteSourceDir);
  const report = buildReport({
    sourceDir: safeSourceDir,
    localSourceDir: absoluteSourceDir,
    generatedAt: new Date().toISOString(),
    pdfs,
    skippedFiles,
    unknownFolders
  });
  const triageReport = buildMigrationTriageReport(report);

  if (options.writeReports !== false) {
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(markdownReportPath, renderMarkdownReport(report));
    fs.writeFileSync(triageJsonReportPath, `${JSON.stringify(triageReport, null, 2)}\n`);
    fs.writeFileSync(triageMarkdownReportPath, renderMigrationTriageMarkdown(triageReport));
  }

  return { ...report, migrationTriage: triageReport };
}

export function mapSourceFolder(sourceFolderName) {
  const trimmed = sourceFolderName.trim();
  let normalizedJurisdictionName = null;

  if (trimmed.startsWith("LegalEase_")) {
    normalizedJurisdictionName = trimmed.slice("LegalEase_".length).replace(/_/g, " ");
  } else if (trimmed.startsWith("LegalEase ")) {
    normalizedJurisdictionName = trimmed.slice("LegalEase ".length).replace(/_/g, " ");
  } else {
    return null;
  }

  normalizedJurisdictionName = titleCase(normalizedJurisdictionName.replace(/\s+/g, " ").trim());
  const alias = folderAliases.get(canonicalName(normalizedJurisdictionName));
  if (alias) {
    return {
      jurisdictionCode: alias.jurisdictionCode,
      sourceFolderName,
      normalizedJurisdictionName: alias.normalizedJurisdictionName,
      folderWarnings: [alias.warning]
    };
  }

  const jurisdictionCode = jurisdictionCodesByName.get(canonicalName(normalizedJurisdictionName));
  if (!jurisdictionCode) return null;

  return {
    jurisdictionCode,
    sourceFolderName,
    normalizedJurisdictionName,
    folderWarnings: []
  };
}

export function inspectPdfBytes(buffer, fileName = "fixture.pdf") {
  const text = buffer.toString("latin1");
  const warnings = [];
  const errors = [];
  const isPdf = buffer.subarray(0, 5).equals(Buffer.from("%PDF-"));
  const fileSizeBytes = buffer.length;
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  if (!isPdf) {
    errors.push("File does not start with a PDF header.");
    return withClassification({
      fileName,
      fileSizeBytes,
      sha256,
      pageCount: "unknown",
      encryptedOrLocked: "unknown",
      hasAcroForm: "unknown",
      acroFormFieldCount: "unknown",
      acroFormFieldNames: [],
      duplicateAcroFormFieldNames: [],
      possibleXfaDetected: "unknown",
      hasExtractableTextLayer: "unknown",
      likelyScannedPdf: "unknown",
      flatPdf: "unknown",
      warnings,
      errors
    });
  }

  const encryptedOrLocked = /\/Encrypt\b/.test(text);
  const hasAcroForm = /\/AcroForm\b/.test(text);
  const possibleXfaDetected = hasAcroForm ? /\/XFA\b/.test(text) : false;
  const pageCount = countMatches(text, /\/Type\s*\/Page\b/g);
  const acroFormFieldNames = hasAcroForm ? extractAcroFormFieldNames(text) : [];
  const duplicateAcroFormFieldNames = findDuplicates(acroFormFieldNames);
  const acroFormFieldCount = hasAcroForm ? acroFormFieldNames.length : 0;
  const hasExtractableTextLayer = detectExtractableTextLayer(text);
  const likelyScannedPdf = hasAcroForm ? false : hasExtractableTextLayer === false;
  const flatPdf = !hasAcroForm && hasExtractableTextLayer === true;

  if (hasAcroForm && acroFormFieldCount === 0) warnings.push("AcroForm dictionary was detected, but no field names were found by raw inspection.");
  if (duplicateAcroFormFieldNames.length > 0) warnings.push("Duplicate AcroForm field names detected.");
  if (acroFormFieldNames.some(isSuspiciousFieldName)) warnings.push("Suspicious AcroForm field names detected.");
  if (pageCount === 0) warnings.push("No page objects were detected by raw inspection.");
  if (!hasAcroForm && hasExtractableTextLayer === false) warnings.push("No AcroForm or extractable text layer detected; do not treat as a confident flat PDF.");

  return withClassification({
    fileName,
    fileSizeBytes,
    sha256,
    pageCount,
    encryptedOrLocked,
    hasAcroForm,
    acroFormFieldCount,
    acroFormFieldNames,
    duplicateAcroFormFieldNames,
    possibleXfaDetected,
    hasExtractableTextLayer,
    likelyScannedPdf,
    flatPdf,
    warnings,
    errors
  });
}

function inspectPdfFile({ jurisdictionCode, sourceFolderName, normalizedJurisdictionName, folderWarnings, absolutePath, relativePath }) {
  const fileName = path.basename(absolutePath);
  try {
    const buffer = fs.readFileSync(absolutePath);
    const inspection = inspectPdfBytes(buffer, fileName);
    return {
      jurisdictionCode,
      sourceFolderName,
      normalizedJurisdictionName,
      sourceFolderWarnings: folderWarnings ?? [],
      fileName,
      relativePath,
      ...inspection
    };
  } catch (error) {
    return {
      jurisdictionCode,
      sourceFolderName,
      normalizedJurisdictionName,
      sourceFolderWarnings: folderWarnings ?? [],
      fileName,
      relativePath,
      fileSizeBytes: "unknown",
      sha256: "unknown",
      pageCount: "unknown",
      encryptedOrLocked: "unknown",
      hasAcroForm: "unknown",
      acroFormFieldCount: "unknown",
      acroFormFieldNames: [],
      duplicateAcroFormFieldNames: [],
      possibleXfaDetected: "unknown",
      hasExtractableTextLayer: "unknown",
      likelyScannedPdf: "unknown",
      flatPdf: "unknown",
      classification: "unreadable",
      recommendedMappingMode: "manual_review",
      warnings: [],
      errors: [`Unable to read PDF: ${error.message}`]
    };
  }
}

function withClassification(record) {
  if (record.errors.length > 0) {
    return {
      ...record,
      classification: "unreadable",
      recommendedMappingMode: "manual_review"
    };
  }

  if (record.encryptedOrLocked === true) {
    return {
      ...record,
      classification: "encrypted_or_locked",
      recommendedMappingMode: "manual_review"
    };
  }

  if (record.possibleXfaDetected === true) {
    return {
      ...record,
      classification: "xfa_pdf",
      recommendedMappingMode: "manual_review"
    };
  }

  if (record.hasAcroForm === true) {
    const dirty = record.duplicateAcroFormFieldNames.length > 0 || record.acroFormFieldCount === 0 || record.acroFormFieldNames.some(isSuspiciousFieldName);
    return {
      ...record,
      classification: dirty ? "acroform_dirty" : "acroform_clean",
      recommendedMappingMode: dirty ? "hybrid" : "acroform"
    };
  }

  if (record.hasAcroForm === false && record.hasExtractableTextLayer === true) {
    return {
      ...record,
      classification: "flat_pdf",
      recommendedMappingMode: "overlay"
    };
  }

  if (record.hasAcroForm === false && record.hasExtractableTextLayer === false) {
    return {
      ...record,
      classification: "scanned_pdf",
      recommendedMappingMode: "manual_review"
    };
  }

  return {
    ...record,
    classification: "manual_review",
    recommendedMappingMode: "manual_review"
  };
}

function buildReport({ sourceDir, generatedAt, pdfs, skippedFiles, unknownFolders }) {
  const byClassification = { ...emptyClassificationCounts };
  const byRecommendedMappingMode = { ...emptyMappingModeCounts };
  const perJurisdiction = new Map();

  for (const pdf of pdfs) {
    byClassification[pdf.classification] = (byClassification[pdf.classification] ?? 0) + 1;
    byRecommendedMappingMode[pdf.recommendedMappingMode] = (byRecommendedMappingMode[pdf.recommendedMappingMode] ?? 0) + 1;

    const current = perJurisdiction.get(pdf.jurisdictionCode) ?? {
      jurisdictionCode: pdf.jurisdictionCode,
      sourceFolderName: pdf.sourceFolderName,
      normalizedJurisdictionName: pdf.normalizedJurisdictionName,
      sourceFolderWarnings: pdf.sourceFolderWarnings ?? [],
      totalPdfCount: 0,
      byClassification: { ...emptyClassificationCounts },
      byRecommendedMappingMode: { ...emptyMappingModeCounts }
    };
    current.sourceFolderWarnings = [...new Set([...current.sourceFolderWarnings, ...(pdf.sourceFolderWarnings ?? [])])];
    current.totalPdfCount += 1;
    current.byClassification[pdf.classification] = (current.byClassification[pdf.classification] ?? 0) + 1;
    current.byRecommendedMappingMode[pdf.recommendedMappingMode] = (current.byRecommendedMappingMode[pdf.recommendedMappingMode] ?? 0) + 1;
    perJurisdiction.set(pdf.jurisdictionCode, current);
  }

  const summary = {
    totalPdfCount: pdfs.length,
    byClassification,
    byRecommendedMappingMode,
    xfaDetectedCount: pdfs.filter((pdf) => pdf.possibleXfaDetected === true).length,
    xfaUnknownCount: pdfs.filter((pdf) => pdf.possibleXfaDetected === "unknown").length,
    noTextLayerCount: pdfs.filter((pdf) => pdf.hasExtractableTextLayer === false).length,
    textLayerUnknownCount: pdfs.filter((pdf) => pdf.hasExtractableTextLayer === "unknown").length,
    duplicateFieldNameCount: pdfs.filter((pdf) => pdf.duplicateAcroFormFieldNames.length > 0).length,
    unknownFolders,
    gitignoreSafety: checkGitignoreSafety()
  };

  return {
    generatedAt,
    sourceDir,
    summary,
    perJurisdiction: [...perJurisdiction.values()].map(finalizeJurisdictionSummary).sort((a, b) => a.jurisdictionCode.localeCompare(b.jurisdictionCode)),
    pdfs,
    skippedFiles
  };
}

function buildMigrationTriageReport(report) {
  const jurisdictions = [...report.perJurisdiction].sort((a, b) => b.easiestMigrationScore - a.easiestMigrationScore);
  const hardestJurisdictions = [...report.perJurisdiction].sort((a, b) => a.easiestMigrationScore - b.easiestMigrationScore);
  const mostlyScannedJurisdictions = report.perJurisdiction
    .filter((jurisdiction) => jurisdiction.totalPdfCount > 0 && jurisdiction.scanned_pdf / jurisdiction.totalPdfCount >= 0.5)
    .sort((a, b) => b.scanned_pdf / b.totalPdfCount - a.scanned_pdf / a.totalPdfCount);
  const encryptedOrLockedJurisdictions = report.perJurisdiction
    .filter((jurisdiction) => jurisdiction.encrypted_or_locked > 0)
    .sort((a, b) => b.encrypted_or_locked - a.encrypted_or_locked);
  const xfaJurisdictions = report.perJurisdiction
    .filter((jurisdiction) => jurisdiction.xfa_pdf > 0)
    .sort((a, b) => b.xfa_pdf - a.xfa_pdf);
  const mostlyAcroformDirtyJurisdictions = report.perJurisdiction
    .filter((jurisdiction) => jurisdiction.totalPdfCount > 0 && jurisdiction.acroform_dirty / jurisdiction.totalPdfCount >= 0.5)
    .sort((a, b) => b.acroform_dirty / b.totalPdfCount - a.acroform_dirty / a.totalPdfCount);

  const replacementNeeded = report.perJurisdiction
    .filter((jurisdiction) => jurisdiction.scanned_pdf > 0 || jurisdiction.encrypted_or_locked > 0 || jurisdiction.xfa_pdf > 0)
    .sort((a, b) => {
      const aReplacementCount = a.scanned_pdf + a.encrypted_or_locked + a.xfa_pdf;
      const bReplacementCount = b.scanned_pdf + b.encrypted_or_locked + b.xfa_pdf;
      return bReplacementCount - aReplacementCount || a.easiestMigrationScore - b.easiestMigrationScore;
    });

  const firstFive = jurisdictions
    .filter((jurisdiction) => !["scanned_replacement_needed", "encrypted_replacement_needed", "manual_review_heavy"].includes(jurisdiction.migrationBucket))
    .slice(0, 5);

  return {
    generatedAt: report.generatedAt,
    sourceDir: report.sourceDir,
    easiestJurisdictions: jurisdictions.slice(0, 10).map(toTriageJurisdiction),
    hardestJurisdictions: hardestJurisdictions.slice(0, 10).map(toTriageJurisdiction),
    mostlyScannedJurisdictions: mostlyScannedJurisdictions.map(toTriageJurisdiction),
    encryptedOrLockedJurisdictions: encryptedOrLockedJurisdictions.map(toTriageJurisdiction),
    xfaJurisdictions: xfaJurisdictions.map(toTriageJurisdiction),
    acroformDirtyJurisdictions: mostlyAcroformDirtyJurisdictions.map(toTriageJurisdiction),
    recommendedFirstStates: firstFive.map(toTriageJurisdiction),
    deferUntilBetterSources: replacementNeeded.map(toTriageJurisdiction),
    mostlyAcroformDirtyJurisdictions: mostlyAcroformDirtyJurisdictions.map(toTriageJurisdiction),
    recommendedFirstFiveStatesForOfficialPdfReplacementWork: firstFive.map(toTriageJurisdiction),
    recommendedStatesToDeferUntilBetterSourcePdfsAreFound: replacementNeeded.map(toTriageJurisdiction)
  };
}

function toTriageJurisdiction(jurisdiction) {
  return {
    jurisdictionCode: jurisdiction.jurisdictionCode,
    sourceFolderName: jurisdiction.sourceFolderName,
    normalizedJurisdictionName: jurisdiction.normalizedJurisdictionName,
    totalPdfCount: jurisdiction.totalPdfCount,
    easiestMigrationScore: jurisdiction.easiestMigrationScore,
    migrationBucket: jurisdiction.migrationBucket,
    acroform_clean: jurisdiction.acroform_clean,
    acroform_dirty: jurisdiction.acroform_dirty,
    xfa_pdf: jurisdiction.xfa_pdf,
    flat_pdf: jurisdiction.flat_pdf,
    scanned_pdf: jurisdiction.scanned_pdf,
    encrypted_or_locked: jurisdiction.encrypted_or_locked,
    unreadable: jurisdiction.unreadable,
    manual_review: jurisdiction.manual_review,
    sourceFolderWarnings: jurisdiction.sourceFolderWarnings
  };
}

function finalizeJurisdictionSummary(jurisdiction) {
  const counts = jurisdiction.byClassification;
  const modeCounts = jurisdiction.byRecommendedMappingMode;
  const easiestMigrationScore = calculateMigrationScore(counts);
  const migrationBucket = chooseMigrationBucket(counts, modeCounts, jurisdiction.totalPdfCount);
  return {
    jurisdictionCode: jurisdiction.jurisdictionCode,
    sourceFolderName: jurisdiction.sourceFolderName,
    normalizedJurisdictionName: jurisdiction.normalizedJurisdictionName,
    sourceFolderWarnings: jurisdiction.sourceFolderWarnings,
    totalPdfCount: jurisdiction.totalPdfCount,
    acroform_clean: counts.acroform_clean,
    acroform_dirty: counts.acroform_dirty,
    xfa_pdf: counts.xfa_pdf,
    flat_pdf: counts.flat_pdf,
    scanned_pdf: counts.scanned_pdf,
    encrypted_or_locked: counts.encrypted_or_locked,
    unreadable: counts.unreadable,
    unknown: counts.unknown,
    manual_review: counts.manual_review,
    byClassification: counts,
    byRecommendedMappingMode: modeCounts,
    easiestMigrationScore,
    migrationBucket
  };
}

function calculateMigrationScore(counts) {
  return (
    counts.acroform_clean * 8 +
    counts.flat_pdf * 5 -
    counts.acroform_dirty * 2 -
    counts.scanned_pdf * 8 -
    counts.encrypted_or_locked * 10 -
    counts.xfa_pdf * 10 -
    counts.unreadable * 10 -
    counts.manual_review * 6 -
    counts.unknown * 4
  );
}

function chooseMigrationBucket(counts, modeCounts, totalPdfCount) {
  if (totalPdfCount === 0) return "manual_review_heavy";
  if (counts.encrypted_or_locked > 0) return "encrypted_replacement_needed";
  if (counts.xfa_pdf > 0) return "manual_review_heavy";
  if (counts.scanned_pdf / totalPdfCount >= 0.5) return "scanned_replacement_needed";
  if (modeCounts.manual_review / totalPdfCount >= 0.5) return "manual_review_heavy";
  if (counts.acroform_clean > 0 && counts.acroform_dirty === 0 && counts.scanned_pdf === 0) return "easy_acroform_candidate";
  if (counts.flat_pdf > 0 && counts.acroform_dirty === 0 && counts.scanned_pdf === 0) return "overlay_candidate";
  return "hybrid_candidate";
}

function renderMarkdownReport(report) {
  const lines = [];
  lines.push("# Local Record-Clearing PDF Inspection");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Source directory: \`${report.sourceDir}\``);
  lines.push("");
  lines.push("## Overall Counts by Classification");
  lines.push("");
  lines.push(renderCountTable(report.summary.byClassification, "Classification"));
  lines.push("");
  lines.push("## Overall Counts by Recommended Mapping Mode");
  lines.push("");
  lines.push(renderCountTable(report.summary.byRecommendedMappingMode, "Recommended mapping mode"));
  lines.push("");
  lines.push("## XFA PDFs");
  lines.push("");
  lines.push(renderPdfList(report.pdfs.filter((pdf) => pdf.possibleXfaDetected === true)));
  lines.push("");
  lines.push("## PDFs with Unknown XFA Status");
  lines.push("");
  lines.push(renderPdfList(report.pdfs.filter((pdf) => pdf.possibleXfaDetected === "unknown")));
  lines.push("");
  lines.push("## Scanned or Manual-Review PDFs");
  lines.push("");
  lines.push(renderPdfList(report.pdfs.filter((pdf) => ["scanned_pdf", "manual_review"].includes(pdf.classification))));
  lines.push("");
  lines.push("## Duplicate or Suspicious AcroForm Fields");
  lines.push("");
  lines.push(renderPdfList(report.pdfs.filter((pdf) => pdf.duplicateAcroFormFieldNames.length > 0 || pdf.warnings.some((warning) => /suspicious acroform/i.test(warning)))));
  lines.push("");
  lines.push("## Unreadable, Encrypted, or Locked PDFs");
  lines.push("");
  lines.push(renderPdfList(report.pdfs.filter((pdf) => ["unreadable", "encrypted_or_locked"].includes(pdf.classification))));
  lines.push("");
  lines.push("## Per-Jurisdiction Summary");
  lines.push("");
  lines.push("| Jurisdiction | Source folder | PDFs | AcroForm clean | AcroForm dirty | XFA | Flat | Scanned | Encrypted/locked | Unreadable | Unknown | Manual review | AcroForm mode | Overlay mode | Hybrid mode | Manual mode | Score | Bucket | Warnings |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |");
  for (const jurisdiction of report.perJurisdiction) {
    lines.push(
      `| ${jurisdiction.jurisdictionCode} (${jurisdiction.normalizedJurisdictionName}) | \`${jurisdiction.sourceFolderName}\` | ${jurisdiction.totalPdfCount} | ${jurisdiction.acroform_clean} | ${jurisdiction.acroform_dirty} | ${jurisdiction.xfa_pdf} | ${jurisdiction.flat_pdf} | ${jurisdiction.scanned_pdf} | ${jurisdiction.encrypted_or_locked} | ${jurisdiction.unreadable} | ${jurisdiction.unknown} | ${jurisdiction.manual_review} | ${jurisdiction.byRecommendedMappingMode.acroform} | ${jurisdiction.byRecommendedMappingMode.overlay} | ${jurisdiction.byRecommendedMappingMode.hybrid} | ${jurisdiction.byRecommendedMappingMode.manual_review} | ${jurisdiction.easiestMigrationScore} | ${jurisdiction.migrationBucket} | ${jurisdiction.sourceFolderWarnings.join(", ") || "none"} |`
    );
  }
  if (report.perJurisdiction.length === 0) lines.push("| None | None | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | manual_review_heavy | none |");
  lines.push("");
  lines.push("## Gitignore Safety");
  lines.push("");
  lines.push(`- private/: ${report.summary.gitignoreSafety.privateIgnored ? "ignored" : "not ignored"}`);
  lines.push(`- *.zip: ${report.summary.gitignoreSafety.zipIgnored ? "ignored" : "not ignored"}`);
  lines.push("");
  lines.push("## Unknown Folders");
  lines.push("");
  lines.push(report.summary.unknownFolders.length > 0 ? report.summary.unknownFolders.map((folder) => `- \`${folder}\``).join("\n") : "None.");
  lines.push("");
  lines.push("## Next-Step Recommendation");
  lines.push("");
  lines.push(buildNextStepRecommendation(report));
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderMigrationTriageMarkdown(triageReport) {
  const lines = [];
  lines.push("# Record-Clearing PDF Migration Triage");
  lines.push("");
  lines.push(`Generated: ${triageReport.generatedAt}`);
  lines.push(`Source directory: \`${triageReport.sourceDir}\``);
  lines.push("");
  lines.push("## Easiest Jurisdictions to Migrate First");
  lines.push("");
  lines.push(renderTriageList(triageReport.easiestJurisdictions));
  lines.push("");
  lines.push("## Hardest Jurisdictions");
  lines.push("");
  lines.push(renderTriageList(triageReport.hardestJurisdictions));
  lines.push("");
  lines.push("## Mostly Scanned PDFs");
  lines.push("");
  lines.push(renderTriageList(triageReport.mostlyScannedJurisdictions));
  lines.push("");
  lines.push("## Encrypted or Locked PDFs");
  lines.push("");
  lines.push(renderTriageList(triageReport.encryptedOrLockedJurisdictions));
  lines.push("");
  lines.push("## XFA PDFs");
  lines.push("");
  lines.push(renderTriageList(triageReport.xfaJurisdictions));
  lines.push("");
  lines.push("## AcroForm Dirty Jurisdictions");
  lines.push("");
  lines.push(renderTriageList(triageReport.acroformDirtyJurisdictions));
  lines.push("");
  lines.push("## Recommended First States");
  lines.push("");
  lines.push(renderTriageList(triageReport.recommendedFirstStates));
  lines.push("");
  lines.push("## Defer Until Better Sources");
  lines.push("");
  lines.push(renderTriageList(triageReport.deferUntilBetterSources));
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderTriageList(jurisdictions) {
  if (jurisdictions.length === 0) return "None.";
  return jurisdictions
    .map((jurisdiction) => {
      const issues = [
        jurisdiction.scanned_pdf > 0 ? `scanned: ${jurisdiction.scanned_pdf}` : null,
        jurisdiction.encrypted_or_locked > 0 ? `encrypted/locked: ${jurisdiction.encrypted_or_locked}` : null,
        jurisdiction.xfa_pdf > 0 ? `XFA: ${jurisdiction.xfa_pdf}` : null,
        jurisdiction.acroform_dirty > 0 ? `dirty AcroForm: ${jurisdiction.acroform_dirty}` : null
      ].filter(Boolean);
      return `- ${jurisdiction.jurisdictionCode} (${jurisdiction.normalizedJurisdictionName}): score ${jurisdiction.easiestMigrationScore}, ${jurisdiction.migrationBucket}, PDFs ${jurisdiction.totalPdfCount}${issues.length > 0 ? `; ${issues.join("; ")}` : ""}`;
    })
    .join("\n");
}

function buildNextStepRecommendation(report) {
  const manualReviewCount = report.summary.byClassification.scanned_pdf + report.summary.byClassification.manual_review + report.summary.byClassification.encrypted_or_locked + report.summary.byClassification.unreadable + report.summary.byClassification.xfa_pdf;
  const acroformCount = report.summary.byRecommendedMappingMode.acroform;
  const overlayCount = report.summary.byRecommendedMappingMode.overlay;

  if (report.summary.totalPdfCount === 0) return "No PDFs were found. Confirm the source directory and folder naming before planning mapping work.";
  if (manualReviewCount > 0) return `Start by reviewing ${manualReviewCount} PDFs that require manual review, especially XFA, scanned, encrypted, locked, or unreadable files. Then map ${acroformCount} clean AcroForm PDFs directly and use overlay mapping for ${overlayCount} flat PDFs.`;
  if (acroformCount >= overlayCount) return `Prioritize direct AcroForm mapping for ${acroformCount} PDFs, then overlay mapping for ${overlayCount} flat PDFs.`;
  return `Prioritize overlay mapping for ${overlayCount} flat PDFs, with direct AcroForm mapping for ${acroformCount} clean AcroForm PDFs.`;
}

function renderCountTable(counts, label) {
  const rows = [`| ${label} | Count |`, "| --- | ---: |"];
  for (const [key, value] of Object.entries(counts)) {
    rows.push(`| ${key} | ${value} |`);
  }
  return rows.join("\n");
}

function renderPdfList(pdfs) {
  if (pdfs.length === 0) return "None.";
  return pdfs
    .map((pdf) => {
      const duplicateSuffix = pdf.duplicateAcroFormFieldNames.length > 0 ? `; duplicates: ${pdf.duplicateAcroFormFieldNames.join(", ")}` : "";
      const warningSuffix = pdf.warnings.length > 0 ? `; warnings: ${pdf.warnings.join("; ")}` : "";
      const errorSuffix = pdf.errors.length > 0 ? `; errors: ${pdf.errors.join("; ")}` : "";
      return `- ${pdf.jurisdictionCode} \`${pdf.relativePath}\` (${pdf.classification}, ${pdf.recommendedMappingMode}${duplicateSuffix}${warningSuffix}${errorSuffix})`;
    })
    .join("\n");
}

function listFilesRecursive(directory) {
  const output = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...listFilesRecursive(absolutePath));
    } else if (entry.isFile()) {
      output.push(absolutePath);
    }
  }
  return output.sort((a, b) => a.localeCompare(b));
}

function extractAcroFormFieldNames(text) {
  const names = [];
  for (const match of text.matchAll(/\/T\s*(?:\((?<literal>(?:\\.|[^\\)])*)\)|<(?<hex>[0-9a-fA-F\s]+)>)/g)) {
    if (match.groups?.literal !== undefined) {
      names.push(unescapePdfLiteral(match.groups.literal).trim());
    } else if (match.groups?.hex !== undefined) {
      names.push(decodeHexString(match.groups.hex).trim());
    }
  }
  return names.filter((name) => name.length > 0);
}

function detectExtractableTextLayer(text) {
  if (/BT[\s\S]{0,4000}ET/.test(text) && /(?:\([^)]{2,}\)|<[\da-fA-F\s]{4,}>|\[[^\]]+\])\s*T[Jj]/.test(text)) return true;
  if (/\/Subtype\s*\/Image\b/.test(text)) return false;
  return false;
}

function isSuspiciousFieldName(name) {
  return /^(text|textbox|field|untitled|undefined|null)\s*\d*$/i.test(name) || name.length > 120;
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort((a, b) => a.localeCompare(b));
}

function unescapePdfLiteral(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([\\()])/g, "$1");
}

function decodeHexString(hex) {
  const cleaned = hex.replace(/\s+/g, "");
  const even = cleaned.length % 2 === 0 ? cleaned : `${cleaned}0`;
  return Buffer.from(even, "hex").toString("utf8");
}

function titleCase(value) {
  if (/^(dc|d\.c\.)$/i.test(value)) return "DC";
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => (part.length <= 2 && part !== "of" ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`))
    .join(" ")
    .replace(/\bOf\b/g, "of");
}

function canonicalName(value) {
  return value.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function makeSafeReportPath(absolutePath) {
  const relativePath = path.relative(rootDir, absolutePath);
  if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) return relativePath;
  return "[external-local-source]";
}

function checkGitignoreSafety() {
  const gitignorePath = path.join(rootDir, ".gitignore");
  const content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return {
    privateIgnored: lines.includes("private/"),
    zipIgnored: lines.includes("*.zip")
  };
}

function printSummary(report) {
  console.log("Local official PDF inspection completed.");
  console.log(`Source directory: ${process.env.OFFICIAL_FORMS_SOURCE_DIR}`);
  console.log(`JSON report: ${path.relative(rootDir, jsonReportPath)}`);
  console.log(`Markdown report: ${path.relative(rootDir, markdownReportPath)}`);
  console.log(`Migration triage JSON report: ${path.relative(rootDir, triageJsonReportPath)}`);
  console.log(`Migration triage Markdown report: ${path.relative(rootDir, triageMarkdownReportPath)}`);
  console.log(`Total PDF count: ${report.summary.totalPdfCount}`);
  console.log(`Classification counts: ${JSON.stringify(report.summary.byClassification)}`);
  console.log(`Recommended mapping mode counts: ${JSON.stringify(report.summary.byRecommendedMappingMode)}`);
  console.log(`XFA detected count: ${report.summary.xfaDetectedCount}`);
  console.log(`XFA unknown count: ${report.summary.xfaUnknownCount}`);
  console.log(`Scanned/manual-review count: ${report.summary.byClassification.scanned_pdf + report.summary.byClassification.manual_review}`);
  console.log(`Unknown folders: ${report.summary.unknownFolders.length > 0 ? report.summary.unknownFolders.join(", ") : "none"}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  inspectLocalRecordClearingPdfs()
    .then(printSummary)
    .catch((error) => {
      console.error(`Local official PDF inspection failed: ${error.message}`);
      process.exit(1);
    });
}
