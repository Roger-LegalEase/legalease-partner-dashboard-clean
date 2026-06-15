import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  StandardFonts,
  rgb
} from "pdf-lib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inspectionReportPath = path.join(rootDir, "data/record-clearing/pdf-inspection/latest-report.json");
const defaultOfficialFormsSourceDir = "/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing";
const officialFormsSourceDir = path.resolve(process.env.OFFICIAL_FORMS_SOURCE_DIR || defaultOfficialFormsSourceDir);
const outputDirectory = path.join(rootDir, "tmp/review/field-map-accelerator-batch");
const topOverlayDirectory = path.join(outputDirectory, "top-overlays");
const summaryJsonPath = path.join(outputDirectory, "field-map-accelerator-summary.json");
const summaryMarkdownPath = path.join(outputDirectory, "field-map-accelerator-summary.md");
const readmePath = path.join(outputDirectory, "README.txt");

const candidateClassifications = new Set(["acroform_clean", "acroform_dirty"]);
const candidateMappingModes = new Set(["acroform", "hybrid"]);
const unsuitableClassifications = new Set(["encrypted_or_locked", "xfa_pdf", "scanned_pdf", "manual_review", "unreadable", "unknown"]);
const emptyConfidenceCounts = { high: 0, medium: 0, low: 0, unknown: 0 };

await main();

async function main() {
  if (!fs.existsSync(inspectionReportPath)) {
    console.log('OFFICIAL_FORMS_SOURCE_DIR="/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing" npm run rcap:forms:inspect-local');
    return;
  }

  const inspectionReport = JSON.parse(fs.readFileSync(inspectionReportPath, "utf8"));
  const selectedRecords = selectLikelyCandidates(inspectionReport.pdfs ?? []);
  const unsuitableRecords = (inspectionReport.pdfs ?? []).filter(isUnsuitableForWidgetExtraction);
  const inspected = [];

  for (const pdf of selectedRecords) {
    inspected.push(await inspectCandidatePdf(pdf));
  }

  const ranked = [...inspected].sort(compareEase);
  const topOverlayCandidates = ranked.filter((record) => record.widgetCount > 0 && record.errors.length === 0).slice(0, 3);

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.mkdirSync(topOverlayDirectory, { recursive: true });
  removeExistingTopOverlayPdfs();

  for (let index = 0; index < topOverlayCandidates.length; index += 1) {
    const record = topOverlayCandidates[index];
    const sourcePdfPath = path.join(officialFormsSourceDir, record.relativePath);
    const sourcePdfBytes = fs.readFileSync(sourcePdfPath);
    const overlayFileName = `${String(index + 1).padStart(2, "0")}-${safeFileStem(record.jurisdictionCode, record.fileName)}-candidate-overlay.pdf`;
    const overlayPath = path.join(topOverlayDirectory, overlayFileName);
    await writeOverlayPdf(sourcePdfBytes, record.candidates, overlayPath);
    record.overlayPdf = path.relative(rootDir, overlayPath);
  }

  const summary = buildSummary({
    inspectionReport,
    selectedRecords,
    unsuitableRecords,
    inspected,
    ranked
  });

  fs.writeFileSync(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(summaryMarkdownPath, buildMarkdown(summary));
  fs.writeFileSync(readmePath, buildReadme());

  printSummary(summary);
}

function selectLikelyCandidates(pdfs) {
  return pdfs.filter((pdf) => {
    if (isUnsuitableForWidgetExtraction(pdf)) return false;
    return candidateClassifications.has(pdf.classification) || candidateMappingModes.has(pdf.recommendedMappingMode);
  });
}

function isUnsuitableForWidgetExtraction(pdf) {
  return (
    unsuitableClassifications.has(pdf.classification) ||
    pdf.recommendedMappingMode === "manual_review" ||
    pdf.encryptedOrLocked === true ||
    pdf.possibleXfaDetected === true ||
    pdf.likelyScannedPdf === true
  );
}

async function inspectCandidatePdf(pdf) {
  const sourcePdfPath = path.join(officialFormsSourceDir, pdf.relativePath);
  const warnings = [...(pdf.warnings ?? [])];
  const errors = [];

  if (!isInsideDirectory(sourcePdfPath, officialFormsSourceDir)) {
    return failedRecord(pdf, warnings, ["Refusing to read a PDF outside OFFICIAL_FORMS_SOURCE_DIR."]);
  }

  if (!fs.existsSync(sourcePdfPath)) {
    return failedRecord(pdf, warnings, [`Missing source PDF: ${pdf.relativePath}`]);
  }

  try {
    const sourcePdfBytes = fs.readFileSync(sourcePdfPath);
    const rawPdfText = sourcePdfBytes.toString("latin1");

    if (/\/Encrypt\b/.test(rawPdfText)) {
      return failedRecord(pdf, [...warnings, "raw_encryption_marker_detected"], ["Encrypted or locked PDF is unsuitable for batch AcroForm extraction."]);
    }

    if (/\/XFA\b/.test(rawPdfText)) {
      return failedRecord(pdf, [...warnings, "raw_xfa_marker_detected"], ["XFA PDF is unsuitable for batch AcroForm extraction."]);
    }

    const { pdfDoc, loadWarnings } = await loadPdfCapturingWarnings(sourcePdfBytes);
    if (loadWarnings.some((warning) => /XFA/i.test(warning))) {
      return failedRecord(pdf, [...warnings, "pdf_lib_xfa_warning"], ["XFA PDF is unsuitable for batch AcroForm extraction."]);
    }

    const { value: form, warnings: formWarnings } = captureConsoleWarnings(() => pdfDoc.getForm());
    if (formWarnings.some((warning) => /XFA/i.test(warning))) {
      return failedRecord(pdf, [...warnings, "pdf_lib_xfa_warning"], ["XFA PDF is unsuitable for batch AcroForm extraction."]);
    }

    const pages = pdfDoc.getPages();
    const fields = form.getFields();
    const candidates = collectCandidates({ form, pages, fields, jurisdictionCode: pdf.jurisdictionCode, fileName: pdf.fileName });
    const confidenceCounts = countByConfidence(candidates);

    if (fields.length === 0) warnings.push("no_acroform_fields_found_by_pdf_lib");
    if (candidates.length === 0) warnings.push("no_widgets_found_by_pdf_lib");

    return {
      jurisdictionCode: pdf.jurisdictionCode,
      normalizedJurisdictionName: pdf.normalizedJurisdictionName,
      sourceFolderName: pdf.sourceFolderName,
      fileName: pdf.fileName,
      relativePath: pdf.relativePath,
      classification: pdf.classification,
      recommendedMappingMode: pdf.recommendedMappingMode,
      sourceInspection: {
        pageCount: pdf.pageCount,
        fileSizeBytes: pdf.fileSizeBytes,
        acroFormFieldCount: pdf.acroFormFieldCount,
        duplicateAcroFormFieldNames: pdf.duplicateAcroFormFieldNames ?? []
      },
      fieldCount: fields.length,
      widgetCount: candidates.length,
      confidenceCounts,
      easeScore: calculateEaseScore({ fieldCount: fields.length, widgetCount: candidates.length, confidenceCounts }),
      warnings: [...new Set(warnings)],
      errors,
      candidates
    };
  } catch (error) {
    return failedRecord(pdf, warnings, [`Unable to inspect AcroForm widgets with pdf-lib: ${error.message}`]);
  }
}

function failedRecord(pdf, warnings, errors) {
  return {
    jurisdictionCode: pdf.jurisdictionCode,
    normalizedJurisdictionName: pdf.normalizedJurisdictionName,
    sourceFolderName: pdf.sourceFolderName,
    fileName: pdf.fileName,
    relativePath: pdf.relativePath,
    classification: pdf.classification,
    recommendedMappingMode: pdf.recommendedMappingMode,
    sourceInspection: {
      pageCount: pdf.pageCount,
      fileSizeBytes: pdf.fileSizeBytes,
      acroFormFieldCount: pdf.acroFormFieldCount,
      duplicateAcroFormFieldNames: pdf.duplicateAcroFormFieldNames ?? []
    },
    fieldCount: 0,
    widgetCount: 0,
    confidenceCounts: { ...emptyConfidenceCounts },
    easeScore: -1000,
    warnings: [...new Set(warnings)],
    errors,
    candidates: []
  };
}

function collectCandidates({ form, pages, fields, jurisdictionCode, fileName }) {
  const candidates = [];

  for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
    const field = fields[fieldIndex];
    const fieldName = field.getName();
    const fieldType = classifyField(field);
    const options = extractOptions(field);
    const widgets = field.acroField?.getWidgets?.() ?? [];

    for (let widgetIndex = 0; widgetIndex < widgets.length; widgetIndex += 1) {
      const widget = widgets[widgetIndex];
      const warnings = ["candidate_only", "visual_review_required", "not_verified"];
      const rect = normalizeRect(widget.getRectangle());
      const page = findWidgetPage(form, pages, widget, warnings);
      const guess = guessCanonicalKey({ fieldName, fieldType, options });

      if (isGenericFieldName(fieldName)) warnings.push("generic_acroform_name");
      if (guess.confidence === "low" || guess.confidence === "unknown") warnings.push("manual_mapping_required");

      candidates.push({
        candidateId: `${jurisdictionCode}-${safeFileStem(fileName)}-F${String(fieldIndex + 1).padStart(3, "0")}-W${String(widgetIndex + 1).padStart(2, "0")}`,
        fieldName,
        fieldType,
        page,
        rect,
        options,
        guessedCanonicalKey: guess.guessedCanonicalKey,
        confidence: guess.confidence,
        matcherReason: guess.matcherReason,
        warnings: [...new Set(warnings)]
      });
    }
  }

  return candidates;
}

function classifyField(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionList";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radioGroup";
  if (field instanceof PDFSignature) return "signature";
  if (field instanceof PDFButton) return "button";
  return field.constructor?.name ?? "unknown";
}

function extractOptions(field) {
  if (typeof field.getOptions !== "function") return [];

  try {
    return field.getOptions().map((option) => String(option));
  } catch {
    return [];
  }
}

function findWidgetPage(form, pages, widget, warnings) {
  try {
    const page = form.findWidgetPage(widget);
    const pageIndex = pages.indexOf(page);
    if (pageIndex >= 0) return pageIndex + 1;
  } catch {
    warnings.push("page_lookup_failed");
  }

  warnings.push("page_unknown");
  return null;
}

function guessCanonicalKey({ fieldName, fieldType, options }) {
  const normalizedName = normalizeText(fieldName);
  const normalizedOptions = normalizeText(options.join(" "));
  const combined = `${normalizedName} ${normalizedOptions}`.trim();

  if (isGenericFieldName(fieldName)) {
    return {
      guessedCanonicalKey: "unknown",
      confidence: "low",
      matcherReason: "Generic AcroForm name; no verified semantic signal."
    };
  }

  const highRules = [
    ["caseNumber", /^(case|docket) (no|number|num)$/],
    ["dateOfBirth", /^(date of birth|birth date|dob)$/],
    ["convictionDate", /^conviction date$/],
    ["dispositionDate", /^(disposition date|sentencing date|sentence date)$/],
    ["signatureDate", /^(signature date|date signed)$/],
    ["printedName", /^(printed name|print name)$/],
    ["petitionerFullName", /^(petitioner name|applicant name|defendant name|full name)$/],
    ["offenseDescription", /^(offense|offense description|charge|charge description)$/],
    ["address", /^(address|mailing address|street address)$/],
    ["phone", /^(phone|telephone|phone number)$/],
    ["email", /^(email|email address|e mail)$/],
    ["county", /^county$/],
    ["courtType", /^(court type|type of court)$/]
  ];

  for (const [guessedCanonicalKey, pattern] of highRules) {
    if (pattern.test(normalizedName)) {
      return {
        guessedCanonicalKey,
        confidence: "high",
        matcherReason: "Field name is an exact conservative canonical label match."
      };
    }
  }

  const mediumRules = [
    ["caseNumber", /\b(case|docket)\b.*\b(no|number|num)\b|\bcase no\b|\bcase number\b/, "Field name references a case or docket number."],
    ["dateOfBirth", /\b(date of birth|birth date|dob)\b/, "Field name references date of birth."],
    ["convictionDate", /\b(conviction date|date convicted|convicted date)\b/, "Field name references conviction date."],
    ["dispositionDate", /\b(disposition date|sentencing date|sentence date)\b/, "Field name references disposition or sentencing date."],
    ["signatureDate", /\b(signature date|date signed|signed date)\b/, "Field name references signature date."],
    ["printedName", /\b(printed name|print name)\b/, "Field name references printed name."],
    ["petitionerFullName", /\b(petitioner|applicant|defendant|respondent)\b.*\b(name|full name)\b|\b(full name|name of petitioner)\b/, "Field name references petitioner or applicant name."],
    ["offenseDescription", /\b(offense|charge|crime|violation|conviction)\b/, "Field name references offense, charge, or conviction."],
    ["address", /\b(address|street|city state zip|zip)\b/, "Field name references mailing address information."],
    ["phone", /\b(phone|telephone|tel)\b/, "Field name references phone."],
    ["email", /\b(email|e mail)\b/, "Field name references email."],
    ["county", /\bcounty\b/, "Field name references county."],
    ["courtType", /\bcourt type\b|\b(type of court)\b|\b(district court|county court|superior court|municipal court)\b/, "Field name references court type."]
  ];

  for (const [guessedCanonicalKey, pattern, matcherReason] of mediumRules) {
    if (pattern.test(normalizedName)) {
      return { guessedCanonicalKey, confidence: "medium", matcherReason };
    }
  }

  if (fieldType === "dropdown" || fieldType === "optionList" || fieldType === "radioGroup") {
    if (/\b(district court|county court|superior court|municipal court|circuit court)\b/.test(combined)) {
      return {
        guessedCanonicalKey: "courtType",
        confidence: "medium",
        matcherReason: "Choice options appear to distinguish court type; still requires visual review."
      };
    }

    if (/\bcounty\b/.test(combined)) {
      return {
        guessedCanonicalKey: "county",
        confidence: "low",
        matcherReason: "Choice options appear county-related; still requires visual review."
      };
    }
  }

  return {
    guessedCanonicalKey: "unknown",
    confidence: "unknown",
    matcherReason: "No conservative canonical match from AcroForm name or options."
  };
}

function normalizeRect(rect) {
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height)
  };
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizeText(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericFieldName(fieldName) {
  return /^(text|field|textbox|checkbox|check box|radio|dropdown|choice|button)\s*\d*$/i.test(String(fieldName).trim());
}

function countByConfidence(candidates) {
  const counts = { ...emptyConfidenceCounts };
  for (const candidate of candidates) {
    counts[candidate.confidence] = (counts[candidate.confidence] ?? 0) + 1;
  }
  return counts;
}

function calculateEaseScore({ fieldCount, widgetCount, confidenceCounts }) {
  return (
    widgetCount * 10 +
    fieldCount * 3 +
    confidenceCounts.high * 18 +
    confidenceCounts.medium * 10 +
    confidenceCounts.low * 2 -
    confidenceCounts.unknown * 7
  );
}

function compareEase(a, b) {
  return (
    b.easeScore - a.easeScore ||
    b.widgetCount - a.widgetCount ||
    b.confidenceCounts.high - a.confidenceCounts.high ||
    b.confidenceCounts.medium - a.confidenceCounts.medium ||
    a.confidenceCounts.unknown - b.confidenceCounts.unknown ||
    a.relativePath.localeCompare(b.relativePath)
  );
}

async function writeOverlayPdf(sourcePdfBytes, candidates, overlayPath) {
  const { pdfDoc: overlayDoc } = await loadPdfCapturingWarnings(sourcePdfBytes);
  const font = await overlayDoc.embedFont(StandardFonts.Helvetica);
  const pages = overlayDoc.getPages();

  for (const candidate of candidates) {
    if (!candidate.page) continue;

    const page = pages[candidate.page - 1];
    if (!page) continue;

    const { x, y, width, height } = candidate.rect;
    const label = `${candidate.candidateId} ${candidate.guessedCanonicalKey}`;
    const labelX = x;
    const labelY = Math.min(page.getHeight() - 9, y + height + 2);

    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor: rgb(0.9, 0.1, 0.1),
      borderWidth: 1.25
    });
    page.drawRectangle({
      x: labelX,
      y: labelY - 1,
      width: Math.min(page.getWidth() - labelX, Math.max(60, label.length * 3.8)),
      height: 9,
      color: rgb(1, 1, 1),
      opacity: 0.82
    });
    page.drawText(label, {
      x: labelX + 1,
      y: labelY,
      size: 6,
      font,
      color: rgb(0.8, 0, 0)
    });
  }

  fs.writeFileSync(overlayPath, await overlayDoc.save());
}

async function loadPdfCapturingWarnings(sourcePdfBytes) {
  const originalWarn = console.warn;
  const loadWarnings = [];
  console.warn = (...args) => {
    loadWarnings.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    const pdfDoc = await PDFDocument.load(sourcePdfBytes);
    return { pdfDoc, loadWarnings };
  } finally {
    console.warn = originalWarn;
  }
}

function captureConsoleWarnings(callback) {
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => {
    warnings.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    return { value: callback(), warnings };
  } finally {
    console.warn = originalWarn;
  }
}

function buildSummary({ inspectionReport, selectedRecords, unsuitableRecords, inspected, ranked }) {
  const perJurisdiction = buildPerJurisdiction(inspected);
  const confidenceCounts = inspected.reduce((counts, pdf) => addConfidenceCounts(counts, pdf.confidenceCounts), { ...emptyConfidenceCounts });
  const errorRecords = inspected.filter((pdf) => pdf.errors.length > 0);
  const top20 = ranked.slice(0, 20).map(toReportRecord);

  return {
    status: "candidate_extraction_only",
    notice: "Not visual approval. Not replacement_candidate. Not verified_replacement. Does not replace human visual review.",
    generatedAt: new Date().toISOString(),
    officialFormsSourceDir,
    inspectionReportPath: path.relative(rootDir, inspectionReportPath),
    outputDirectory: path.relative(rootDir, outputDirectory),
    selectionCriteria: {
      classifications: [...candidateClassifications],
      recommendedMappingModes: [...candidateMappingModes],
      unsuitableClassifications: [...unsuitableClassifications]
    },
    totals: {
      pdfsInInspectionReport: inspectionReport.summary?.totalPdfCount ?? (inspectionReport.pdfs ?? []).length,
      pdfsConsidered: selectedRecords.length,
      pdfsInspected: inspected.filter((pdf) => pdf.errors.length === 0).length,
      pdfsWithWidgets: inspected.filter((pdf) => pdf.widgetCount > 0).length,
      pdfsWithNoWidgets: inspected.filter((pdf) => pdf.errors.length === 0 && pdf.widgetCount === 0).length,
      unsuitablePdfsExcludedFromInspection: unsuitableRecords.length,
      errors: errorRecords.length,
      totalFieldsFound: inspected.reduce((sum, pdf) => sum + pdf.fieldCount, 0),
      totalWidgetsFound: inspected.reduce((sum, pdf) => sum + pdf.widgetCount, 0),
      globalConfidenceCounts: confidenceCounts
    },
    top20EasiestCandidatePdfs: top20,
    perJurisdiction,
    errors: errorRecords.map((pdf) => ({
      jurisdictionCode: pdf.jurisdictionCode,
      relativePath: pdf.relativePath,
      classification: pdf.classification,
      recommendedMappingMode: pdf.recommendedMappingMode,
      errors: pdf.errors
    })),
    inspectedPdfs: ranked.map(toReportRecord),
    gitignoreSafety: checkGitignoreSafety()
  };
}

function toReportRecord(pdf) {
  return {
    jurisdictionCode: pdf.jurisdictionCode,
    normalizedJurisdictionName: pdf.normalizedJurisdictionName,
    relativePath: pdf.relativePath,
    fileName: pdf.fileName,
    classification: pdf.classification,
    recommendedMappingMode: pdf.recommendedMappingMode,
    fieldCount: pdf.fieldCount,
    widgetCount: pdf.widgetCount,
    confidenceCounts: pdf.confidenceCounts,
    easeScore: pdf.easeScore,
    warnings: pdf.warnings,
    errors: pdf.errors,
    overlayPdf: pdf.overlayPdf,
    candidates: pdf.candidates
  };
}

function buildPerJurisdiction(inspected) {
  const byJurisdiction = new Map();
  for (const pdf of inspected) {
    const key = pdf.jurisdictionCode;
    const current = byJurisdiction.get(key) ?? {
      jurisdictionCode: pdf.jurisdictionCode,
      normalizedJurisdictionName: pdf.normalizedJurisdictionName,
      sourceFolderName: pdf.sourceFolderName,
      pdfsConsidered: 0,
      pdfsInspected: 0,
      pdfsWithWidgets: 0,
      pdfsWithNoWidgets: 0,
      errors: 0,
      fieldCount: 0,
      widgetCount: 0,
      confidenceCounts: { ...emptyConfidenceCounts }
    };

    current.pdfsConsidered += 1;
    if (pdf.errors.length === 0) current.pdfsInspected += 1;
    if (pdf.widgetCount > 0) current.pdfsWithWidgets += 1;
    if (pdf.errors.length === 0 && pdf.widgetCount === 0) current.pdfsWithNoWidgets += 1;
    if (pdf.errors.length > 0) current.errors += 1;
    current.fieldCount += pdf.fieldCount;
    current.widgetCount += pdf.widgetCount;
    current.confidenceCounts = addConfidenceCounts(current.confidenceCounts, pdf.confidenceCounts);
    byJurisdiction.set(key, current);
  }

  return [...byJurisdiction.values()].sort((a, b) => {
    return b.widgetCount - a.widgetCount || b.confidenceCounts.high - a.confidenceCounts.high || b.confidenceCounts.medium - a.confidenceCounts.medium || a.jurisdictionCode.localeCompare(b.jurisdictionCode);
  });
}

function addConfidenceCounts(left, right) {
  return {
    high: (left.high ?? 0) + (right.high ?? 0),
    medium: (left.medium ?? 0) + (right.medium ?? 0),
    low: (left.low ?? 0) + (right.low ?? 0),
    unknown: (left.unknown ?? 0) + (right.unknown ?? 0)
  };
}

function buildMarkdown(summary) {
  const lines = [];
  lines.push("# Field-Map Accelerator Batch Summary");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Status: ${summary.status}`);
  lines.push("");
  lines.push(summary.notice);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- PDFs in inspection report: ${summary.totals.pdfsInInspectionReport}`);
  lines.push(`- PDFs considered: ${summary.totals.pdfsConsidered}`);
  lines.push(`- PDFs successfully inspected: ${summary.totals.pdfsInspected}`);
  lines.push(`- PDFs with widgets: ${summary.totals.pdfsWithWidgets}`);
  lines.push(`- PDFs with no widgets: ${summary.totals.pdfsWithNoWidgets}`);
  lines.push(`- Unsuitable PDFs excluded from inspection: ${summary.totals.unsuitablePdfsExcludedFromInspection}`);
  lines.push(`- Errors: ${summary.totals.errors}`);
  lines.push(`- Total fields found: ${summary.totals.totalFieldsFound}`);
  lines.push(`- Total widgets found: ${summary.totals.totalWidgetsFound}`);
  lines.push(`- Global confidence counts: ${JSON.stringify(summary.totals.globalConfidenceCounts)}`);
  lines.push("");
  lines.push("## Top 20 Easiest Candidate PDFs");
  lines.push("");
  lines.push("| Rank | Jurisdiction | PDF | Mode | Fields | Widgets | High | Medium | Low | Unknown | Score | Overlay | Warnings |");
  lines.push("| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |");
  summary.top20EasiestCandidatePdfs.forEach((pdf, index) => {
    lines.push(
      `| ${index + 1} | ${pdf.jurisdictionCode} | \`${markdownCell(pdf.relativePath)}\` | ${pdf.classification}/${pdf.recommendedMappingMode} | ${pdf.fieldCount} | ${pdf.widgetCount} | ${pdf.confidenceCounts.high} | ${pdf.confidenceCounts.medium} | ${pdf.confidenceCounts.low} | ${pdf.confidenceCounts.unknown} | ${pdf.easeScore} | ${pdf.overlayPdf ? `\`${pdf.overlayPdf}\`` : ""} | ${markdownCell(pdf.warnings.join(", ") || "none")} |`
    );
  });
  if (summary.top20EasiestCandidatePdfs.length === 0) lines.push("| 0 | none | none | none | 0 | 0 | 0 | 0 | 0 | 0 | 0 |  | none |");
  lines.push("");
  lines.push("## Per-Jurisdiction Totals");
  lines.push("");
  lines.push("| Jurisdiction | PDFs considered | Inspected | With widgets | No widgets | Errors | Fields | Widgets | High | Medium | Low | Unknown |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const jurisdiction of summary.perJurisdiction) {
    lines.push(
      `| ${jurisdiction.jurisdictionCode} (${markdownCell(jurisdiction.normalizedJurisdictionName)}) | ${jurisdiction.pdfsConsidered} | ${jurisdiction.pdfsInspected} | ${jurisdiction.pdfsWithWidgets} | ${jurisdiction.pdfsWithNoWidgets} | ${jurisdiction.errors} | ${jurisdiction.fieldCount} | ${jurisdiction.widgetCount} | ${jurisdiction.confidenceCounts.high} | ${jurisdiction.confidenceCounts.medium} | ${jurisdiction.confidenceCounts.low} | ${jurisdiction.confidenceCounts.unknown} |`
    );
  }
  if (summary.perJurisdiction.length === 0) lines.push("| none | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |");
  lines.push("");
  lines.push("## Errors");
  lines.push("");
  lines.push(summary.errors.length > 0 ? summary.errors.map((error) => `- ${error.jurisdictionCode} \`${error.relativePath}\`: ${error.errors.join("; ")}`).join("\n") : "None.");
  lines.push("");
  lines.push("## Gitignore Safety");
  lines.push("");
  lines.push(`- tmp/: ${summary.gitignoreSafety.tmpIgnored ? "ignored" : "not ignored"}`);
  lines.push(`- private/: ${summary.gitignoreSafety.privateIgnored ? "ignored" : "not ignored"}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildReadme() {
  return [
    "Field-map accelerator batch output",
    "",
    "This is candidate extraction only.",
    "Not visual approval.",
    "Not replacement_candidate.",
    "Not verified_replacement.",
    "Does not replace human visual review.",
    "",
    "The JSON and Markdown summaries rank likely AcroForm/hybrid candidates by extraction ease.",
    "Only the top three candidate overlay PDFs are generated.",
    "No raw official PDFs are copied into this directory.",
    ""
  ].join("\n");
}

function printSummary(summary) {
  console.log("Official PDF field-map accelerator batch completed.");
  console.log(`Output directory: ${summary.outputDirectory}`);
  console.log(`Summary JSON: ${path.relative(rootDir, summaryJsonPath)}`);
  console.log(`Summary Markdown: ${path.relative(rootDir, summaryMarkdownPath)}`);
  console.log(`README: ${path.relative(rootDir, readmePath)}`);
  console.log(`PDFs considered: ${summary.totals.pdfsConsidered}`);
  console.log(`PDFs successfully inspected: ${summary.totals.pdfsInspected}`);
  console.log(`PDFs with widgets: ${summary.totals.pdfsWithWidgets}`);
  console.log(`Fields/widgets found: ${summary.totals.totalFieldsFound}/${summary.totals.totalWidgetsFound}`);
  console.log(`Global confidence counts: ${JSON.stringify(summary.totals.globalConfidenceCounts)}`);
}

function removeExistingTopOverlayPdfs() {
  for (const entry of fs.readdirSync(topOverlayDirectory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith("-candidate-overlay.pdf")) {
      fs.unlinkSync(path.join(topOverlayDirectory, entry.name));
    }
  }
}

function checkGitignoreSafety() {
  const gitignorePath = path.join(rootDir, ".gitignore");
  const content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return {
    tmpIgnored: lines.includes("tmp/") || lines.includes("/tmp/") || lines.includes("tmp/**"),
    privateIgnored: lines.includes("private/"),
    zipIgnored: lines.includes("*.zip")
  };
}

function isInsideDirectory(filePath, directory) {
  const relativePath = path.relative(directory, filePath);
  return relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function safeFileStem(...parts) {
  return parts
    .join("-")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function markdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
