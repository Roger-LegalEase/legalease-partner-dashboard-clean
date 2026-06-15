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
const defaultOfficialFormsSourceDir = "/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing";
const officialFormsSourceDir = path.resolve(process.env.OFFICIAL_FORMS_SOURCE_DIR || defaultOfficialFormsSourceDir);
const localBatchRoot = path.join(rootDir, "tmp/review/batch-field-map-review");
const inboxBatchRoot = "/workspaces/legalease-partner-dashboard-clean/tmp/review-inbox/batch-field-map-review";
const manifestPath = path.join(inboxBatchRoot, "REVIEW-MANIFEST.md");
const inspectionReportPath = path.join(rootDir, "data/record-clearing/pdf-inspection/latest-report.json");

const defaultTargets = [
  "LegalEase Illinois/CXP Motion to Vacate and Expunge.pdf",
  "LegalEase Missouri/Conf Case Filing Info Sheet(FI-05).pdf",
  "LegalEase New York/CPL160.59SealingApplication.pdf",
  "LegalEase South Carolina /SCCA223A1.pdf",
  "LegalEase Illinois/CXP Additional Cannabis Convictions.pdf",
  "LegalEase Maryland/LegalEase Maryland forms /ccdccr072A.pdf",
  "LegalEase Maryland/LegalEase Maryland forms /ccdccr072C.pdf",
  "LegalEase Maryland/LegalEase Maryland forms /ccdccr072D.pdf",
  "LegalEase Minnesota/EXP102_Current-2.pdf",
  "LegalEase Minnesota/EXP105_Current.pdf"
];

const emptyConfidenceCounts = { high: 0, medium: 0, low: 0, unknown: 0 };

await main();

async function main() {
  const targetRelativePaths = process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultTargets;
  const inspectionByPath = loadInspectionByPath();
  const results = [];

  fs.mkdirSync(localBatchRoot, { recursive: true });
  fs.mkdirSync(inboxBatchRoot, { recursive: true });

  for (const relativePath of targetRelativePaths) {
    const result = await generatePacket(relativePath, inspectionByPath.get(relativePath));
    results.push(result);
  }

  fs.writeFileSync(manifestPath, buildManifest(results));
  printSummary(results);
}

function loadInspectionByPath() {
  if (!fs.existsSync(inspectionReportPath)) return new Map();

  const report = JSON.parse(fs.readFileSync(inspectionReportPath, "utf8"));
  return new Map((report.pdfs ?? []).map((pdf) => [pdf.relativePath, pdf]));
}

async function generatePacket(relativePath, inspectionRecord) {
  const sourcePdfPath = path.join(officialFormsSourceDir, relativePath);
  const state = stateNameFromRelativePath(relativePath);
  const slug = safeSlug(relativePath);
  const localOutputDirectory = path.join(localBatchRoot, slug);
  const inboxOutputDirectory = path.join(inboxBatchRoot, slug);
  const overlayFileName = `${slug}-candidate-overlay.pdf`;
  const shortOverlayFileName = "OPEN-ME-overlay.pdf";
  const jsonFileName = `${slug}-candidates.json`;
  const markdownFileName = `${slug}-candidates.md`;
  const readmeFileName = "README.txt";

  fs.rmSync(localOutputDirectory, { recursive: true, force: true });
  fs.rmSync(inboxOutputDirectory, { recursive: true, force: true });
  fs.mkdirSync(localOutputDirectory, { recursive: true });
  fs.mkdirSync(inboxOutputDirectory, { recursive: true });

  if (!isInsideDirectory(sourcePdfPath, officialFormsSourceDir)) {
    return failedResult({
      relativePath,
      state,
      slug,
      localOutputDirectory,
      inboxOutputDirectory,
      errors: ["Refusing to read a PDF outside OFFICIAL_FORMS_SOURCE_DIR."]
    });
  }

  if (!fs.existsSync(sourcePdfPath)) {
    return failedResult({
      relativePath,
      state,
      slug,
      localOutputDirectory,
      inboxOutputDirectory,
      errors: [`Missing source PDF: ${relativePath}`]
    });
  }

  const warnings = [...(inspectionRecord?.warnings ?? [])];
  const errors = [];

  try {
    const sourcePdfBytes = fs.readFileSync(sourcePdfPath);
    const rawPdfText = sourcePdfBytes.toString("latin1");

    if (/\/Encrypt\b/.test(rawPdfText)) {
      errors.push("Encrypted or locked PDF is unsuitable for AcroForm extraction.");
      warnings.push("raw_encryption_marker_detected");
    }

    if (/\/XFA\b/.test(rawPdfText)) {
      errors.push("XFA PDF is unsuitable for AcroForm extraction.");
      warnings.push("raw_xfa_marker_detected");
    }

    const { pdfDoc, loadWarnings } = await loadPdfCapturingWarnings(sourcePdfBytes);
    warnings.push(...loadWarnings.map((warning) => `pdf_lib_warning: ${warning}`));

    const { value: form, warnings: formWarnings } = captureConsoleWarnings(() => pdfDoc.getForm());
    warnings.push(...formWarnings.map((warning) => `pdf_lib_form_warning: ${warning}`));

    const pages = pdfDoc.getPages();
    const fields = form.getFields();
    const candidates = collectCandidates({
      form,
      pages,
      fields,
      jurisdictionCode: inspectionRecord?.jurisdictionCode ?? stateCodeFromStateName(state),
      fileName: path.basename(relativePath)
    });
    const confidenceCounts = countByConfidence(candidates);

    if (fields.length === 0) warnings.push("no_acroform_fields_found_by_pdf_lib");
    if (candidates.length === 0) warnings.push("no_widgets_found_by_pdf_lib");

    await writeOverlayPdf(sourcePdfBytes, candidates, path.join(localOutputDirectory, overlayFileName));
    fs.copyFileSync(path.join(localOutputDirectory, overlayFileName), path.join(localOutputDirectory, shortOverlayFileName));

    const manifest = {
      status: "candidate_extraction_only",
      notice: "Not visual approval. Not replacement_candidate. Not verified_replacement. Does not replace human visual review.",
      sourcePdf: relativePath,
      officialFormsSourceDir,
      sourceInspection: inspectionRecord
        ? {
            pageCount: inspectionRecord.pageCount,
            fileSizeBytes: inspectionRecord.fileSizeBytes,
            acroFormFieldCount: inspectionRecord.acroFormFieldCount,
            duplicateAcroFormFieldNames: inspectionRecord.duplicateAcroFormFieldNames ?? []
          }
        : null,
      classification: inspectionRecord?.classification ?? "unknown",
      recommendedMappingMode: inspectionRecord?.recommendedMappingMode ?? "manual_review",
      fieldCount: fields.length,
      widgetCount: candidates.length,
      confidenceCounts,
      warnings: [...new Set(warnings)],
      errors,
      overlayPdf: overlayFileName,
      shortOverlayPdf: shortOverlayFileName,
      candidates
    };

    fs.writeFileSync(path.join(localOutputDirectory, jsonFileName), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(localOutputDirectory, markdownFileName), buildCandidateMarkdown({ manifest, markdownFileName, overlayFileName, shortOverlayFileName }));
    fs.writeFileSync(path.join(localOutputDirectory, readmeFileName), buildReadme({ relativePath, fieldCount: fields.length, widgetCount: candidates.length, confidenceCounts, overlayFileName, shortOverlayFileName, jsonFileName, markdownFileName }));

    copyPacketFiles({
      localOutputDirectory,
      inboxOutputDirectory,
      fileNames: [overlayFileName, shortOverlayFileName, jsonFileName, markdownFileName, readmeFileName]
    });

    return {
      state,
      relativePath,
      slug,
      status: "generated",
      localOutputDirectory,
      inboxOutputDirectory,
      openMePath: path.join(inboxOutputDirectory, shortOverlayFileName),
      fieldCount: fields.length,
      widgetCount: candidates.length,
      confidenceCounts,
      warnings: [...new Set(warnings)],
      errors
    };
  } catch (error) {
    return failedResult({
      relativePath,
      state,
      slug,
      localOutputDirectory,
      inboxOutputDirectory,
      errors: [`Unable to generate review packet: ${error.message}`],
      warnings
    });
  }
}

function copyPacketFiles({ localOutputDirectory, inboxOutputDirectory, fileNames }) {
  fs.mkdirSync(inboxOutputDirectory, { recursive: true });
  for (const fileName of fileNames) {
    fs.copyFileSync(path.join(localOutputDirectory, fileName), path.join(inboxOutputDirectory, fileName));
  }
}

function failedResult({ relativePath, state, slug, localOutputDirectory, inboxOutputDirectory, errors, warnings = [] }) {
  fs.mkdirSync(localOutputDirectory, { recursive: true });
  fs.mkdirSync(inboxOutputDirectory, { recursive: true });

  const readme = [
    `${state} official PDF candidate packet`,
    "",
    "Status: candidate_extraction_only",
    "Not visual approval.",
    "Not replacement_candidate.",
    "Not verified_replacement.",
    "Does not replace human visual review.",
    "",
    `Source PDF: ${relativePath}`,
    "",
    "Packet generation did not complete. See REVIEW-MANIFEST.md for errors.",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(localOutputDirectory, "README.txt"), readme);
  fs.copyFileSync(path.join(localOutputDirectory, "README.txt"), path.join(inboxOutputDirectory, "README.txt"));

  return {
    state,
    relativePath,
    slug,
    status: "missing_or_failed",
    localOutputDirectory,
    inboxOutputDirectory,
    openMePath: "",
    fieldCount: 0,
    widgetCount: 0,
    confidenceCounts: { ...emptyConfidenceCounts },
    warnings: [...new Set(warnings)],
    errors
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

function buildCandidateMarkdown({ manifest, overlayFileName, shortOverlayFileName }) {
  const lines = [
    `# ${manifest.sourcePdf} Candidate Field Map`,
    "",
    "Status: candidate_extraction_only",
    manifest.notice,
    "",
    `Source PDF: \`${manifest.sourcePdf}\``,
    `Official forms source dir: \`${manifest.officialFormsSourceDir}\``,
    `Classification/mode: \`${manifest.classification}\` / \`${manifest.recommendedMappingMode}\``,
    "",
    `Overlay PDF: \`${overlayFileName}\``,
    `Short overlay copy: \`${shortOverlayFileName}\``,
    `Fields found: ${manifest.fieldCount}`,
    `Widgets found: ${manifest.widgetCount}`,
    `Confidence counts: \`${JSON.stringify(manifest.confidenceCounts)}\``,
    `Warnings: ${manifest.warnings.length ? manifest.warnings.join(", ") : "none"}`,
    `Errors: ${manifest.errors.length ? manifest.errors.join(", ") : "none"}`,
    "",
    "## Top Unmapped/Unknown Fields",
    ""
  ];

  const unknowns = manifest.candidates
    .filter((candidate) => candidate.confidence === "unknown" || candidate.guessedCanonicalKey === "unknown")
    .slice(0, 25);

  if (unknowns.length === 0) {
    lines.push("None in candidate extraction.");
  } else {
    for (const candidate of unknowns) {
      lines.push(`- ${candidate.candidateId}: \`${inlineCodeText(candidate.fieldName)}\`, page ${candidate.page ?? "unknown"}, ${formatRect(candidate.rect)}, confidence ${candidate.confidence}`);
    }
  }

  lines.push("");
  lines.push("## Candidates");
  lines.push("");
  lines.push("| Candidate | Field | Type | Page | Rect | Guess | Confidence | Reason | Warnings | Options |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const candidate of manifest.candidates) {
    lines.push(
      `| ${[
        candidate.candidateId,
        `\`${inlineCodeText(candidate.fieldName)}\``,
        candidate.fieldType,
        candidate.page ?? "unknown",
        `\`${formatRect(candidate.rect)}\``,
        candidate.guessedCanonicalKey,
        candidate.confidence,
        candidate.matcherReason,
        candidate.warnings.join(", "),
        candidate.options.join(", ")
      ].map(markdownCell).join(" | ")} |`
    );
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildReadme({ relativePath, fieldCount, widgetCount, confidenceCounts, overlayFileName, shortOverlayFileName, jsonFileName, markdownFileName }) {
  return [
    `${relativePath} official PDF candidate packet`,
    "",
    "Status: candidate_extraction_only",
    "Not visual approval.",
    "Not replacement_candidate.",
    "Not verified_replacement.",
    "Does not replace human visual review.",
    "",
    "This folder contains accelerator extraction artifacts only. It does not approve field placement, does not promote lifecycle, and does not make this PDF live.",
    "",
    "Open for review:",
    shortOverlayFileName,
    overlayFileName,
    jsonFileName,
    markdownFileName,
    "",
    `Source PDF: ${relativePath}`,
    `Fields/widgets: ${fieldCount}/${widgetCount}`,
    `Confidence counts: ${JSON.stringify(confidenceCounts)}`,
    ""
  ].join("\n");
}

function buildManifest(results) {
  const lines = [
    "# Batch Field-Map Review Manifest",
    "",
    `Generated: ${new Date().toISOString()}`,
    "Status: candidate_extraction_only",
    "",
    "Not visual approval. Not replacement_candidate. Not verified_replacement. Does not replace human visual review.",
    ""
  ];

  for (const result of results) {
    lines.push(`## ${result.state} - ${result.relativePath}`);
    lines.push("");
    lines.push(`- State: ${result.state}`);
    lines.push(`- Source PDF path: \`${result.relativePath}\``);
    lines.push(`- Review folder path: \`${result.inboxOutputDirectory}\``);
    lines.push(`- OPEN-ME-overlay.pdf path: ${result.openMePath ? `\`${result.openMePath}\`` : "_not generated_"}`);
    lines.push(`- Fields/widgets: ${result.fieldCount}/${result.widgetCount}`);
    lines.push(`- Confidence counts: \`${JSON.stringify(result.confidenceCounts)}\``);
    lines.push(`- Warnings/errors: ${formatWarningsAndErrors(result)}`);
    lines.push("");
    lines.push("Review result: [ ] pass [ ] fail [ ] needs improved overlay");
    lines.push("");
    lines.push("Notes:");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function formatWarningsAndErrors(result) {
  const entries = [];
  if (result.warnings.length > 0) entries.push(`warnings: ${result.warnings.join("; ")}`);
  if (result.errors.length > 0) entries.push(`errors: ${result.errors.join("; ")}`);
  return entries.length > 0 ? entries.join(" | ") : "none";
}

function printSummary(results) {
  console.log("Batch field-map review packet generation completed.");
  console.log(`Local batch root: ${path.relative(rootDir, localBatchRoot)}`);
  console.log(`Review inbox batch root: ${inboxBatchRoot}`);
  console.log(`Review manifest: ${manifestPath}`);

  for (const result of results) {
    console.log(`${result.status}: ${result.relativePath}`);
    console.log(`  review: ${result.inboxOutputDirectory}`);
    console.log(`  fields/widgets: ${result.fieldCount}/${result.widgetCount}`);
    console.log(`  confidence: ${JSON.stringify(result.confidenceCounts)}`);
    if (result.warnings.length > 0) console.log(`  warnings: ${result.warnings.join("; ")}`);
    if (result.errors.length > 0) console.log(`  errors: ${result.errors.join("; ")}`);
  }
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

function countByConfidence(candidates) {
  const counts = { ...emptyConfidenceCounts };
  for (const candidate of candidates) {
    counts[candidate.confidence] = (counts[candidate.confidence] ?? 0) + 1;
  }
  return counts;
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

function stateNameFromRelativePath(relativePath) {
  const folder = relativePath.split("/")[0] ?? "Unknown";
  return folder.replace(/^LegalEase\s+/i, "").trim() || "Unknown";
}

function stateCodeFromStateName(stateName) {
  const codes = {
    Illinois: "IL",
    Maryland: "MD",
    Minnesota: "MN",
    Missouri: "MO",
    "New York": "NY",
    "South Carolina": "SC"
  };

  return codes[stateName] ?? safeSlug(stateName).slice(0, 3).toUpperCase();
}

function safeSlug(value) {
  return String(value)
    .replace(/\.pdf$/i, "")
    .replace(/^LegalEase\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
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

function formatRect(rect) {
  return `x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`;
}

function inlineCodeText(value) {
  return String(value).replace(/`/g, "\\`");
}

function markdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function isInsideDirectory(filePath, directory) {
  const relativePath = path.relative(directory, filePath);
  return relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}
