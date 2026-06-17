import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { inspectLocalRecordClearingPdfs } from "./inspect-local-record-clearing-pdfs.mjs";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const defaultNationwideSourceDir = "/workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing";
export const sourceDir = path.resolve(process.env.OFFICIAL_FORMS_SOURCE_DIR || defaultNationwideSourceDir);
export const overlayDataDir = path.join(rootDir, "data/rcap-all50/overlays");
export const overlayManifestPath = path.join(overlayDataDir, "overlay-factory-manifest.json");
export const fieldMapDraftRoot = path.join(rootDir, "docs/record-clearing/field-map-drafts/all50");
export const shadowBatchRoot = path.join(rootDir, "tmp/official-pdf-shadow-batch/all50");
export const reviewInboxRoot = path.join(rootDir, "tmp/review-inbox/all50");

export const overlayClassifications = [
  "clean_acroform",
  "dirty_acroform",
  "xfa",
  "flat_pdf",
  "scanned_pdf",
  "encrypted_pdf",
  "html_form",
  "rtf_doc",
  "unknown"
];

const stateNameByCode = new Map([
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"]
]);

export async function buildOverlayFactory() {
  assertSourceDir();
  ensureDir(overlayDataDir);
  ensureDir(fieldMapDraftRoot);
  ensureDir(shadowBatchRoot);
  ensureDir(reviewInboxRoot);

  const inspection = await inspectLocalRecordClearingPdfs({
    sourceDir,
    writeReports: false,
    safeReport: true
  });

  const nonPdfForms = collectNonPdfForms();
  const forms = [];
  for (const pdf of inspection.pdfs) {
    const form = await processPdfForm(pdf);
    forms.push(form);
  }
  for (const form of nonPdfForms) {
    forms.push(form);
  }

  const states = buildStateSummaries(forms);
  const summary = buildSummary(forms);
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceDir,
    outputRoots: {
      fieldMapDraftRoot: path.relative(rootDir, fieldMapDraftRoot),
      shadowBatchRoot: path.relative(rootDir, shadowBatchRoot),
      reviewInboxRoot: path.relative(rootDir, reviewInboxRoot)
    },
    classifications: overlayClassifications,
    summary,
    states,
    forms
  };
  writeJson(overlayManifestPath, manifest);
  generateAll50ReviewInbox(manifest);
  return manifest;
}

export function retryFieldMaps() {
  const manifest = readOverlayManifest();
  let retried = 0;
  for (const form of manifest.forms) {
    if (!form.fieldMapPath || form.kind !== "pdf") continue;
    const absoluteFieldMapPath = path.join(rootDir, form.fieldMapPath);
    if (!fs.existsSync(absoluteFieldMapPath)) continue;
    const draft = JSON.parse(fs.readFileSync(absoluteFieldMapPath, "utf8"));
    draft.retryHistory = draft.retryHistory || [];
    draft.retryHistory.push({
      retriedAt: new Date().toISOString(),
      loop: "field_map_retry_loop",
      result: form.status === "blocked" ? "still_blocked" : "draft_preserved_for_visual_review",
      note: "Build-first retry records unresolved uncertainty without inventing verified semantic mappings."
    });
    fs.writeFileSync(absoluteFieldMapPath, `${JSON.stringify(draft, null, 2)}\n`);
    retried += 1;
  }
  manifest.retrySummary = {
    retriedAt: new Date().toISOString(),
    retriedFieldMaps: retried
  };
  writeJson(overlayManifestPath, manifest);
  return manifest.retrySummary;
}

export function verifyOverlayFactory() {
  const manifest = readOverlayManifest();
  const failures = [];
  if (manifest.summary.totalFormsFound <= 0) failures.push("No forms found.");
  if (manifest.summary.totalPdfForms <= 0) failures.push("No PDF forms found.");
  const reviewQueueTotal = manifest.summary.mappedForms + manifest.summary.partialMaps + manifest.summary.blockedForms;
  if (manifest.summary.visualReviewPending !== reviewQueueTotal) {
    failures.push("visualReviewPending must equal mappedForms + partialMaps + blockedForms.");
  }
  for (const classification of overlayClassifications) {
    if (!(classification in manifest.summary.byClassification)) {
      failures.push(`Missing classification bucket: ${classification}`);
    }
  }
  for (const form of manifest.forms) {
    if (form.kind === "pdf" && !form.fieldMapPath && form.status !== "blocked") {
      failures.push(`PDF form missing field map path: ${form.relativePath}`);
    }
    if (form.fieldMapPath && !fs.existsSync(path.join(rootDir, form.fieldMapPath))) {
      failures.push(`Missing field map file: ${form.fieldMapPath}`);
    }
    if (form.samplePath && !fs.existsSync(path.join(rootDir, form.samplePath))) {
      failures.push(`Missing rendered sample: ${form.samplePath}`);
    }
    if (form.blockedArtifactPath && !fs.existsSync(path.join(rootDir, form.blockedArtifactPath))) {
      failures.push(`Missing blocked artifact: ${form.blockedArtifactPath}`);
    }
  }
  for (const state of manifest.states) {
    const stateDir = path.join(reviewInboxRoot, slugify(state.stateName));
    for (const fileName of [
      "REVIEW-MANIFEST.md",
      "source-inventory.json",
      "forms-manifest.json",
      "blocked-forms.json",
      "QA-warnings.md",
      "next-actions.md"
    ]) {
      if (!fs.existsSync(path.join(stateDir, fileName))) {
        failures.push(`Missing review artifact ${fileName} for ${state.stateName}.`);
      }
    }
  }
  return { passed: failures.length === 0, failures, manifest };
}

export function generateAll50ReviewInbox(manifest = readOverlayManifest()) {
  ensureDir(reviewInboxRoot);
  const stateForms = groupBy(manifest.forms, (form) => form.jurisdictionCode || "UNKNOWN");
  for (const state of manifest.states) {
    const forms = stateForms.get(state.jurisdictionCode) || [];
    const stateDir = path.join(reviewInboxRoot, slugify(state.stateName));
    const fieldMapDir = path.join(stateDir, "field-maps");
    const sampleDir = path.join(stateDir, "sample-packets");
    const blockedDir = path.join(stateDir, "blocked-forms");
    ensureDir(fieldMapDir);
    ensureDir(sampleDir);
    ensureDir(blockedDir);
    for (const form of forms) {
      copyIfExists(form.fieldMapPath, path.join(fieldMapDir, path.basename(form.fieldMapPath || "")));
      copyIfExists(form.samplePath, path.join(sampleDir, path.basename(form.samplePath || "")));
      copyIfExists(form.blockedArtifactPath, path.join(blockedDir, path.basename(form.blockedArtifactPath || "")));
    }
    writeText(path.join(stateDir, "REVIEW-MANIFEST.md"), renderStateReviewManifest(state, forms));
    writeJson(path.join(stateDir, "source-inventory.json"), {
      jurisdictionCode: state.jurisdictionCode,
      stateName: state.stateName,
      sourceFolders: [...new Set(forms.map((form) => form.sourceFolderName).filter(Boolean))],
      sourceDir
    });
    writeJson(path.join(stateDir, "forms-manifest.json"), { forms });
    writeJson(path.join(stateDir, "blocked-forms.json"), {
      blockedForms: forms.filter((form) => form.status === "blocked")
    });
    writeText(path.join(stateDir, "QA-warnings.md"), renderQaWarnings(state, forms));
    writeText(path.join(stateDir, "next-actions.md"), renderNextActions(state, forms));
  }
  return reviewInboxRoot;
}

async function processPdfForm(pdf) {
  const classification = normalizePdfClassification(pdf.classification);
  const formSlug = formSlugFor(pdf.relativePath);
  const stateSlug = slugify(pdf.normalizedJurisdictionName || pdf.jurisdictionCode);
  const fieldMapPath = path.join(fieldMapDraftRoot, `${stateSlug}-${formSlug}.field-map-draft.json`);
  const samplePath = path.join(shadowBatchRoot, `${stateSlug}-${formSlug}-sample.pdf`);
  const blockedArtifactPath = path.join(fieldMapDraftRoot, `${stateSlug}-${formSlug}.blocked.json`);
  const absolutePdfPath = path.join(sourceDir, pdf.relativePath);
  const base = {
    kind: "pdf",
    jurisdictionCode: pdf.jurisdictionCode,
    stateName: pdf.normalizedJurisdictionName,
    sourceFolderName: pdf.sourceFolderName,
    fileName: pdf.fileName,
    relativePath: pdf.relativePath,
    formSlug,
    classification,
    recommendedMappingMode: pdf.recommendedMappingMode,
    fieldCount: numberOrZero(pdf.acroFormFieldCount),
    pageCount: numberOrZero(pdf.pageCount),
    warnings: pdf.warnings || [],
    errors: pdf.errors || [],
    visualReview: "pending"
  };

  if (classification === "encrypted_pdf" || classification === "xfa" || classification === "unknown") {
    const blockedReason =
      classification === "encrypted_pdf" ? "encrypted_pdf" : classification === "xfa" ? "xfa_form" : "unreadable_or_unknown_pdf";
    writeBlockedArtifact(blockedArtifactPath, { ...base, blockedReason });
    return {
      ...base,
      status: "blocked",
      blockedReason,
      blockedArtifactPath: path.relative(rootDir, blockedArtifactPath)
    };
  }

  const mapKind = chooseMapKind(classification);
  const fieldMap = buildFieldMapDraft({ pdf, classification, mapKind });
  writeJson(fieldMapPath, fieldMap);

  let rendered = false;
  let renderError = null;
  try {
    await renderSamplePdf({ absolutePdfPath, samplePath, fieldMap });
    rendered = true;
  } catch (error) {
    renderError = error.message;
    writeBlockedArtifact(blockedArtifactPath, { ...base, blockedReason: "render_failed", renderError });
  }

  const partial = classification !== "clean_acroform" || mapKind !== "acroform";
  return {
    ...base,
    status: rendered ? (partial ? "partial_map" : "mapped") : "blocked",
    fieldMapPath: path.relative(rootDir, fieldMapPath),
    samplePath: rendered ? path.relative(rootDir, samplePath) : null,
    blockedArtifactPath: rendered ? null : path.relative(rootDir, blockedArtifactPath),
    blockedReason: rendered ? null : "render_failed",
    renderError,
    mapKind
  };
}

function collectNonPdfForms() {
  const forms = [];
  const sourceFolders = fs.readdirSync(sourceDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name.startsWith("LegalEase "));
  for (const folder of sourceFolders) {
    const stateName = normalizeStateName(folder.name.slice("LegalEase ".length));
    const jurisdictionCode = codeForStateName(stateName);
    const folderPath = path.join(sourceDir, folder.name);
    for (const filePath of listFiles(folderPath)) {
      const ext = path.extname(filePath).toLowerCase();
      if (![".html", ".htm", ".rtf"].includes(ext)) continue;
      forms.push({
        kind: ext === ".rtf" ? "rtf_doc" : "html_form",
        jurisdictionCode,
        stateName,
        sourceFolderName: folder.name,
        fileName: path.basename(filePath),
        relativePath: path.relative(sourceDir, filePath),
        formSlug: formSlugFor(path.relative(sourceDir, filePath)),
        classification: ext === ".rtf" ? "rtf_doc" : "html_form",
        status: "inventory_only",
        visualReview: "not_applicable",
        warnings: [],
        errors: []
      });
    }
  }
  return forms;
}

function buildFieldMapDraft({ pdf, classification, mapKind }) {
  const acroFields = (pdf.acroFormFieldNames || []).map((name, index) => ({
    id: `${formSlugFor(pdf.relativePath)}-field-${index + 1}`,
    sourceName: name,
    target: canonicalFieldGuess(name),
    mappingMode: mapKind === "acroform" ? "acroform_name" : "hybrid_acroform_name",
    confidence: mapKind === "acroform" ? "medium" : "low",
    reviewFlags: ["visual_review_pending", "counsel_review_pending"]
  }));
  const overlayAnchors = mapKind === "overlay" || mapKind === "hybrid" ? defaultOverlayAnchors(pdf) : [];
  return {
    schemaVersion: 1,
    lifecycle: "visual_review_pending",
    sourcePdf: pdf.relativePath,
    jurisdictionCode: pdf.jurisdictionCode,
    stateName: pdf.normalizedJurisdictionName,
    formName: pdf.fileName,
    classification,
    mapKind,
    generatedAt: new Date().toISOString(),
    notice:
      "Build-first draft only. Not visual approval, not counsel approval, not source freshness approval, and not approved for live use.",
    acroFields,
    overlayAnchors,
    retryHistory: [],
    reviewStatus: {
      visual: "pending",
      counsel: "pending",
      sourceFreshness: "pending",
      qa: "pending"
    }
  };
}

async function renderSamplePdf({ absolutePdfPath, samplePath, fieldMap }) {
  const bytes = fs.readFileSync(absolutePdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 18,
      y: height - 42,
      width: Math.min(width - 36, 430),
      height: 24,
      color: rgb(1, 0.96, 0.72),
      borderColor: rgb(0.7, 0.45, 0),
      borderWidth: 0.5
    });
    page.drawText(`RCAP all-50 overlay review draft - page ${index + 1}`, {
      x: 26,
      y: height - 34,
      size: 9,
      font,
      color: rgb(0.25, 0.18, 0)
    });
    for (const anchor of fieldMap.overlayAnchors || []) {
      if (anchor.page !== index + 1) continue;
      page.drawRectangle({
        x: anchor.x,
        y: Math.max(18, height - anchor.y - anchor.height),
        width: anchor.width,
        height: anchor.height,
        borderColor: rgb(0.1, 0.35, 0.95),
        borderWidth: 0.75
      });
      page.drawText(anchor.label, {
        x: anchor.x + 2,
        y: Math.max(20, height - anchor.y - 9),
        size: 6,
        font,
        color: rgb(0.1, 0.25, 0.7)
      });
    }
  });
  ensureDir(path.dirname(samplePath));
  fs.writeFileSync(samplePath, await pdfDoc.save());
}

function writeBlockedArtifact(blockedArtifactPath, artifact) {
  writeJson(blockedArtifactPath, {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "blocked",
    visualReview: "pending_if_unblocked",
    ...artifact
  });
}

function buildStateSummaries(forms) {
  const states = [];
  const grouped = groupBy(forms, (form) => form.jurisdictionCode || "UNKNOWN");
  for (const [jurisdictionCode, stateForms] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const stateName = stateForms[0]?.stateName || stateNameByCode.get(jurisdictionCode) || jurisdictionCode;
    states.push({
      jurisdictionCode,
      stateName,
      totalForms: stateForms.length,
      pdfForms: stateForms.filter((form) => form.kind === "pdf").length,
      mappedForms: stateForms.filter((form) => form.status === "mapped").length,
      partialMaps: stateForms.filter((form) => form.status === "partial_map").length,
      blockedForms: stateForms.filter((form) => form.status === "blocked").length,
      renderedSamples: stateForms.filter((form) => form.samplePath).length,
      visualReviewPending: stateForms.filter((form) => form.visualReview === "pending").length,
      byClassification: countBy(stateForms, (form) => form.classification)
    });
  }
  return states;
}

function buildSummary(forms) {
  return {
    totalFormsFound: forms.length,
    totalPdfForms: forms.filter((form) => form.kind === "pdf").length,
    mappedForms: forms.filter((form) => form.status === "mapped").length,
    renderedSamples: forms.filter((form) => form.samplePath).length,
    partialMaps: forms.filter((form) => form.status === "partial_map").length,
    blockedXfa: forms.filter((form) => form.blockedReason === "xfa_form").length,
    blockedEncrypted: forms.filter((form) => form.blockedReason === "encrypted_pdf").length,
    blockedUnreadable: forms.filter((form) => ["unreadable_or_unknown_pdf", "render_failed"].includes(form.blockedReason)).length,
    blockedForms: forms.filter((form) => form.status === "blocked").length,
    visualReviewPending: forms.filter((form) => form.visualReview === "pending").length,
    byClassification: {
      ...Object.fromEntries(overlayClassifications.map((classification) => [classification, 0])),
      ...countBy(forms, (form) => form.classification)
    }
  };
}

function renderStateReviewManifest(state, forms) {
  return `# ${state.stateName} All-50 Overlay Review Manifest

Status: build-first review artifacts generated

Forms found: ${forms.length}
PDF forms: ${forms.filter((form) => form.kind === "pdf").length}
Mapped forms: ${forms.filter((form) => form.status === "mapped").length}
Partial maps: ${forms.filter((form) => form.status === "partial_map").length}
Rendered samples: ${forms.filter((form) => form.samplePath).length}
Blocked forms: ${forms.filter((form) => form.status === "blocked").length}
Visual review pending: ${forms.filter((form) => form.visualReview === "pending").length}

This folder is for QA, visual review, and attorney review. It is not live approval.
`;
}

function renderQaWarnings(state, forms) {
  const warnings = [];
  for (const form of forms) {
    for (const warning of form.warnings || []) warnings.push(`- ${form.relativePath}: ${warning}`);
    if (form.status === "blocked") warnings.push(`- ${form.relativePath}: blocked (${form.blockedReason})`);
    if (form.status === "partial_map") warnings.push(`- ${form.relativePath}: partial map requires visual review`);
  }
  return `# ${state.stateName} QA Warnings

${warnings.length > 0 ? warnings.join("\n") : "No generated QA warnings beyond standard visual/counsel/source review gates."}
`;
}

function renderNextActions(state, forms) {
  const blocked = forms.filter((form) => form.status === "blocked").length;
  const partial = forms.filter((form) => form.status === "partial_map").length;
  return `# ${state.stateName} Next Actions

- Complete visual review for mapped and partial official PDF samples.
- Review field-map drafts against source forms.
- Confirm blocked forms can be replaced, unlocked, or handled through guidance fallback.
- Counsel review remains pending before live approval.
- Source freshness review remains pending before live approval.

Blocked forms: ${blocked}
Partial maps: ${partial}
`;
}

export function readOverlayManifest() {
  if (!fs.existsSync(overlayManifestPath)) {
    throw new Error(`Overlay manifest not found: ${overlayManifestPath}. Run npm run rcap:build-overlays first.`);
  }
  return JSON.parse(fs.readFileSync(overlayManifestPath, "utf8"));
}

function normalizePdfClassification(classification) {
  if (classification === "acroform_clean") return "clean_acroform";
  if (classification === "acroform_dirty") return "dirty_acroform";
  if (classification === "xfa_pdf") return "xfa";
  if (classification === "encrypted_or_locked") return "encrypted_pdf";
  if (classification === "flat_pdf") return "flat_pdf";
  if (classification === "scanned_pdf") return "scanned_pdf";
  return "unknown";
}

function chooseMapKind(classification) {
  if (classification === "clean_acroform") return "acroform";
  if (classification === "dirty_acroform") return "hybrid";
  return "overlay";
}

function defaultOverlayAnchors(pdf) {
  const pageCount = Math.max(1, Math.min(numberOrZero(pdf.pageCount) || 1, 3));
  const anchors = [];
  for (let page = 1; page <= pageCount; page += 1) {
    anchors.push({
      id: `review-anchor-${page}-1`,
      page,
      label: "participant/case info review zone",
      x: 72,
      y: 120,
      width: 240,
      height: 24,
      confidence: "low",
      reviewFlags: ["visual_review_pending", "manual_coordinate_confirmation_required"]
    });
    anchors.push({
      id: `review-anchor-${page}-2`,
      page,
      label: "signature/date review zone",
      x: 72,
      y: 680,
      width: 260,
      height: 24,
      confidence: "low",
      reviewFlags: ["visual_review_pending", "manual_coordinate_confirmation_required"]
    });
  }
  return anchors;
}

function canonicalFieldGuess(name) {
  const lower = String(name).toLowerCase();
  if (lower.includes("name")) return "participant_full_legal_name";
  if (lower.includes("case") || lower.includes("docket")) return "case_number";
  if (lower.includes("court")) return "court_name";
  if (lower.includes("county")) return "county_or_filing_location";
  if (lower.includes("date")) return "date";
  if (lower.includes("sign")) return "signature";
  if (lower.includes("address")) return "participant_address";
  if (lower.includes("phone")) return "participant_phone";
  if (lower.includes("email")) return "participant_email";
  return "unknown";
}

function assertSourceDir() {
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`Nationwide source directory not found: ${sourceDir}`);
  }
}

function collectFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.name === ".DS_Store" || entry.name.startsWith("._")) return [];
    if (entry.isDirectory()) return collectFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  });
}

function listFiles(dir) {
  return collectFiles(dir).sort((a, b) => a.localeCompare(b));
}

function normalizeStateName(value) {
  const aliases = new Map([
    ["Arkanasa", "Arkansas"],
    ["Tennesee", "Tennessee"],
    ["DC", "District of Columbia"],
    ["massachusetts", "Massachusetts"]
  ]);
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (aliases.has(trimmed)) return aliases.get(trimmed);
  return trimmed
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(" ");
}

function codeForStateName(stateName) {
  for (const [code, name] of stateNameByCode.entries()) {
    if (name.toLowerCase() === stateName.toLowerCase()) return code;
  }
  return "UNKNOWN";
}

function countBy(items, picker) {
  const counts = {};
  for (const item of items) {
    const key = picker(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function groupBy(items, picker) {
  const groups = new Map();
  for (const item of items) {
    const key = picker(item);
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

function numberOrZero(value) {
  return typeof value === "number" ? value : 0;
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formSlugFor(relativePath) {
  return slugify(relativePath.replace(/\.[^.]+$/, ""));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function copyIfExists(relativePath, destination) {
  if (!relativePath) return;
  const sourcePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(sourcePath)) return;
  ensureDir(path.dirname(destination));
  fs.copyFileSync(sourcePath, destination);
}
