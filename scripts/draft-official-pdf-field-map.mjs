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
const sourcePdfRelativePath = "LegalEase Nebraska/CC-6-11.pdf";
const outputDirectoryRelativePath = "tmp/review/nebraska/auto-map";

const sourcePdfPath = path.join(officialFormsSourceDir, sourcePdfRelativePath);
const outputDirectory = path.join(rootDir, outputDirectoryRelativePath);

const jsonPath = path.join(outputDirectory, "NE-CC-6-11-acroform-candidates.json");
const markdownPath = path.join(outputDirectory, "NE-CC-6-11-acroform-candidates.md");
const overlayPdfPath = path.join(outputDirectory, "NE-CC-6-11-candidate-overlay.pdf");
const reviewHtmlPath = path.join(outputDirectory, "NE-CC-6-11-review.html");
const readmePath = path.join(outputDirectory, "README.txt");

const candidateNotice = "candidate only / visual_review_required";
const allowedCanonicalKeys = new Set([
  "courtType",
  "county",
  "caseNumber",
  "petitionerFullName",
  "dateOfBirth",
  "offenseDescription",
  "convictionDate",
  "dispositionDate",
  "signatureDate",
  "printedName",
  "address",
  "phone",
  "email",
  "unknown"
]);

await main();

async function main() {
  ensureFileExists(sourcePdfPath, "blank official Nebraska CC 6:11 PDF");

  const sourcePdfBytes = fs.readFileSync(sourcePdfPath);
  const pdfDoc = await PDFDocument.load(sourcePdfBytes);
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const fields = form.getFields();
  const candidates = collectCandidates(form, pages, fields);
  const confidenceCounts = countByConfidence(candidates);

  fs.mkdirSync(outputDirectory, { recursive: true });

  const manifest = {
    status: "visual_review_required",
    notice: `${candidateNotice}; not verified; not live; not replacement_candidate; not verified_replacement`,
    sourcePdf: sourcePdfRelativePath,
    officialFormsSourceDir,
    sourcePdfRole: "blank official source PDF",
    shadowRenderUsed: false,
    generatedAt: new Date().toISOString(),
    fieldCount: fields.length,
    widgetCount: candidates.length,
    confidenceCounts,
    canonicalKeys: [...allowedCanonicalKeys],
    candidates
  };

  fs.writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildMarkdown(manifest));
  fs.writeFileSync(reviewHtmlPath, buildHtml(manifest));
  fs.writeFileSync(readmePath, buildReadme(manifest));
  await writeOverlayPdf(sourcePdfBytes, candidates);

  console.log("Nebraska CC 6:11 AcroForm candidate map drafted.");
  console.log(`Status: ${candidateNotice}`);
  console.log(`Official forms source dir: ${officialFormsSourceDir}`);
  console.log(`Source PDF: ${sourcePdfRelativePath}`);
  console.log("Shadow render used: no");
  console.log(`Fields found: ${fields.length}`);
  console.log(`Widgets found: ${candidates.length}`);
  console.log(`Confidence counts: ${JSON.stringify(confidenceCounts)}`);
  console.log("Generated:");
  for (const filePath of [jsonPath, markdownPath, overlayPdfPath, reviewHtmlPath, readmePath]) {
    console.log(`- ${path.relative(rootDir, filePath)}`);
  }
}

function collectCandidates(form, pages, fields) {
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
      if (guess.confidence === "low" || guess.confidence === "unknown") {
        warnings.push("manual_mapping_required");
      }

      if (!allowedCanonicalKeys.has(guess.guessedCanonicalKey)) {
        throw new Error(`Unsupported canonical key guessed: ${guess.guessedCanonicalKey}`);
      }

      candidates.push({
        candidateId: `NE-CC-6-11-F${String(fieldIndex + 1).padStart(2, "0")}-W${String(widgetIndex + 1).padStart(2, "0")}`,
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

  const namedRules = [
    ["caseNumber", /\b(case|docket)\b.*\b(no|number|num)\b|\bcase no\b|\bcase number\b/, "Field name references a case or docket number."],
    ["dateOfBirth", /\b(date of birth|birth date|dob)\b/, "Field name references date of birth."],
    ["convictionDate", /\b(conviction date|date convicted|convicted date)\b/, "Field name references conviction date."],
    ["dispositionDate", /\b(disposition date|sentencing date|sentence date)\b/, "Field name references disposition or sentencing date."],
    ["signatureDate", /\b(signature date|date signed|signed date)\b/, "Field name references signature date."],
    ["printedName", /\b(printed name|print name)\b/, "Field name references printed name."],
    ["petitionerFullName", /\b(petitioner|applicant|defendant)\b.*\b(name|full name)\b|\b(full name|name of petitioner)\b/, "Field name references petitioner or applicant name."],
    ["offenseDescription", /\b(offense|charge|crime|violation)\b/, "Field name references offense or charge."],
    ["address", /\b(address|street|city state zip|zip)\b/, "Field name references mailing address information."],
    ["phone", /\b(phone|telephone|tel)\b/, "Field name references phone."],
    ["email", /\b(email|e mail)\b/, "Field name references email."],
    ["county", /\bcounty\b/, "Field name references county."],
    ["courtType", /\bcourt type\b|\b(type of court)\b|\b(district court|county court)\b/, "Field name references court type."]
  ];

  for (const [guessedCanonicalKey, pattern, reason] of namedRules) {
    if (pattern.test(normalizedName)) {
      return { guessedCanonicalKey, confidence: "medium", matcherReason: reason };
    }
  }

  if (fieldType === "dropdown" || fieldType === "optionList" || fieldType === "radioGroup") {
    if (/\b(district court|county court)\b/.test(combined)) {
      return {
        guessedCanonicalKey: "courtType",
        confidence: "medium",
        matcherReason: "Choice options appear to distinguish court type; still requires visual review."
      };
    }

    if (/\b(county|douglas|lancaster|sarpy|hall|dodge|madison|buffalo|scotts bluff)\b/.test(combined)) {
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
  const counts = { medium: 0, low: 0, unknown: 0 };
  for (const candidate of candidates) {
    counts[candidate.confidence] = (counts[candidate.confidence] ?? 0) + 1;
  }
  return counts;
}

async function writeOverlayPdf(sourcePdfBytes, candidates) {
  const overlayDoc = await PDFDocument.load(sourcePdfBytes);
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

  fs.writeFileSync(overlayPdfPath, await overlayDoc.save());
}

function buildMarkdown(manifest) {
  const rows = manifest.candidates.map((candidate) => [
    candidate.candidateId,
    inlineCode(candidate.fieldName),
    candidate.fieldType,
    candidate.page ?? "unknown",
    inlineCode(formatRect(candidate.rect)),
    candidate.guessedCanonicalKey,
    candidate.confidence,
    candidate.matcherReason,
    candidate.warnings.join(", "),
    candidate.options.length ? candidate.options.map(inlineCode).join(", ") : ""
  ]);

  return [
    "# Nebraska CC 6:11 AcroForm Candidate Map",
    "",
    `Status: ${candidateNotice}`,
    "",
    "These candidates are not verified, not live, not replacement_candidate, and not verified_replacement.",
    `Source PDF: ${manifest.sourcePdf}`,
    "Shadow render used: no",
    "",
    `Fields found: ${manifest.fieldCount}`,
    `Widgets found: ${manifest.widgetCount}`,
    `Confidence counts: ${JSON.stringify(manifest.confidenceCounts)}`,
    "",
    "| Candidate | Field | Type | Page | Rect | Guess | Confidence | Reason | Warnings | Options |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`),
    ""
  ].join("\n");
}

function buildHtml(manifest) {
  const rows = manifest.candidates.map((candidate) => `
      <tr>
        <td>${escapeHtml(candidate.candidateId)}</td>
        <td><code>${escapeHtml(candidate.fieldName)}</code></td>
        <td>${escapeHtml(candidate.fieldType)}</td>
        <td>${escapeHtml(candidate.page ?? "unknown")}</td>
        <td><code>${escapeHtml(formatRect(candidate.rect))}</code></td>
        <td>${escapeHtml(candidate.guessedCanonicalKey)}</td>
        <td>${escapeHtml(candidate.confidence)}</td>
        <td>${escapeHtml(candidate.matcherReason)}</td>
        <td>${escapeHtml(candidate.warnings.join(", "))}</td>
        <td>${escapeHtml(candidate.options.join(", "))}</td>
      </tr>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Nebraska CC 6:11 AcroForm Candidate Map</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111827; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .notice { border: 1px solid #b91c1c; color: #7f1d1d; padding: 10px 12px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>Nebraska CC 6:11 AcroForm Candidate Map</h1>
  <div class="notice">
    ${escapeHtml(candidateNotice)}. Not verified. Not live. Not replacement_candidate. Not verified_replacement.
  </div>
  <p>Source PDF: <code>${escapeHtml(manifest.sourcePdf)}</code></p>
  <p>Shadow render used: no</p>
  <p>Fields found: ${escapeHtml(manifest.fieldCount)}. Widgets found: ${escapeHtml(manifest.widgetCount)}. Confidence counts: <code>${escapeHtml(JSON.stringify(manifest.confidenceCounts))}</code>.</p>
  <p>Overlay PDF: <a href="NE-CC-6-11-candidate-overlay.pdf">NE-CC-6-11-candidate-overlay.pdf</a></p>
  <table>
    <thead>
      <tr>
        <th>Candidate</th>
        <th>Field</th>
        <th>Type</th>
        <th>Page</th>
        <th>Rect</th>
        <th>Guess</th>
        <th>Confidence</th>
        <th>Reason</th>
        <th>Warnings</th>
        <th>Options</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

function buildReadme(manifest) {
  return [
    "Nebraska CC 6:11 official-PDF field-map accelerator output",
    "",
    `Status: ${candidateNotice}`,
    "Not verified.",
    "Not live.",
    "Not replacement_candidate.",
    "Not verified_replacement.",
    "",
    `Source PDF: ${manifest.sourcePdf}`,
    "Shadow render used: no",
    "",
    "UPLOAD/REVIEW THIS FILE:",
    "tmp/review/nebraska/auto-map/NE-CC-6-11-candidate-overlay.pdf",
    "",
    "The overlay identifies AcroForm field/widget candidates only.",
    "No legal sample values were filled.",
    "Visual review is required before any mapping can be used for final output.",
    ""
  ].join("\n");
}

function formatRect(rect) {
  return `x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`;
}

function inlineCode(value) {
  return `\`${String(value).replace(/`/g, "\\`")}\``;
}

function markdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureFileExists(filePath, label) {
  if (fs.existsSync(filePath)) return;

  console.error(`Missing ${label}: ${path.relative(rootDir, filePath)}`);
  console.error("This script only reads the blank official source PDF and will not fall back to shadow-render output.");
  process.exit(1);
}
