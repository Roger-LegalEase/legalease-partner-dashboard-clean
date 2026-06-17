import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.resolve(process.env.OFFICIAL_FORMS_SOURCE_DIR || path.join(rootDir, "private/Nationwide Record Clearing"));
const overlayManifestPath = path.join(rootDir, "data/rcap-all50/overlays/overlay-factory-manifest.json");
const rescueDir = path.join(rootDir, "data/rcap-all50/overlays/rescued-encrypted-pdfs");
const rescueReportPath = path.join(rootDir, "data/rcap-all50/overlays/encrypted-pdf-rescue-report.json");
const fieldMapDraftRoot = path.join(rootDir, "docs/record-clearing/field-map-drafts/all50");
const shadowBatchRoot = path.join(rootDir, "tmp/official-pdf-shadow-batch/all50");
const reviewInboxRoot = path.join(rootDir, "tmp/review-inbox/all50");

const targetForms = new Set([
  "CA:cr180.pdf",
  "CA:cr181.pdf",
  "DE:download.aspx.pdf",
  "ME:MJB-Form-cr-218.pdf",
  "ME:MJB-Form-jv-043.pdf",
  "NV:DPS-006.pdf",
  "PA:dna_removal_request.pdf",
  "WV:SCA-C906.pdf"
]);

const tools = {
  qpdf: findTool("qpdf"),
  mutool: findTool("mutool"),
  gs: findTool("gs"),
  pdftocairo: findTool("pdftocairo"),
  convert: findTool("convert")
};

const manifest = readJson(overlayManifestPath);
const formsByKey = new Map(manifest.forms.map((form) => [`${form.jurisdictionCode}:${form.fileName}`, form]));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceDir,
  rescueOutputDir: path.relative(rootDir, rescueDir),
  tools,
  targets: []
};

fs.mkdirSync(rescueDir, { recursive: true });

for (const key of targetForms) {
  const form = formsByKey.get(key);
  if (!form) {
    const [jurisdictionCode, fileName] = key.split(":");
    report.targets.push({
      jurisdictionCode,
      stateName: null,
      fileName,
      sourceRelativePath: null,
      rescueStatus: "source_missing",
      successfulMethod: null,
      rescuedPdfPath: null,
      notes: ["Target encrypted PDF was not present in the overlay manifest."],
      errors: []
    });
    continue;
  }

  report.targets.push(await rescueForm(form));
}

rebuildManifestSummaries(manifest);
writeJson(overlayManifestPath, manifest);
writeJson(rescueReportPath, report);
syncReviewInboxForTouchedStates(report.targets.filter((target) => target.rescueStatus === "rescued"));

console.log("RCAP encrypted PDF rescue pass complete.");
console.log(`Targets attempted: ${report.targets.length}`);
console.log(`Rescued PDFs: ${report.targets.filter((target) => target.rescueStatus === "rescued").length}`);
console.log(`Still blocked: ${report.targets.filter((target) => target.rescueStatus !== "rescued").length}`);
console.log(`Report: ${path.relative(rootDir, rescueReportPath)}`);

async function rescueForm(form) {
  const sourcePath = locateSourcePdf(form);
  const target = {
    jurisdictionCode: form.jurisdictionCode,
    stateName: form.stateName,
    fileName: form.fileName,
    sourceRelativePath: form.relativePath,
    rescueStatus: "still_blocked",
    successfulMethod: null,
    rescuedPdfPath: null,
    sourceSha256Before: null,
    sourceSha256After: null,
    derivativeOfOfficialPdf: true,
    notes: [],
    errors: []
  };

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    target.rescueStatus = "source_missing";
    target.notes.push("Source PDF could not be located under the Nationwide source folder.");
    return target;
  }

  target.sourceSha256Before = sha256(sourcePath);
  const outputPath = path.join(rescueDir, `${slugify(form.stateName)}-${slugify(form.fileName.replace(/\.pdf$/i, ""))}-rescued.pdf`);
  const tempDir = fs.mkdtempSync(path.join(rescueDir, ".tmp-"));

  const methods = [
    ["qpdf_decrypt", () => runQpdfDecrypt(sourcePath, path.join(tempDir, "qpdf-decrypt.pdf"), [])],
    ["qpdf_empty_password", () => runQpdfDecrypt(sourcePath, path.join(tempDir, "qpdf-empty-password.pdf"), ["--password="])],
    ["mutool_clean", () => runMutoolClean(sourcePath, path.join(tempDir, "mutool-clean.pdf"))],
    ["ghostscript_reprint", () => runGhostscript(sourcePath, path.join(tempDir, "ghostscript.pdf"))],
    ["rasterized_rebuild", () => runRasterizedRebuild(sourcePath, path.join(tempDir, "rasterized.pdf"))],
    ["pdf_lib_ignore_encryption", () => runPdfLibIgnoreEncryption(sourcePath, path.join(tempDir, "pdf-lib.pdf"))]
  ];

  for (const [methodName, method] of methods) {
    const result = await method();
    target.notes.push(`${methodName}: ${result.status}`);
    if (result.error) target.errors.push(`${methodName}: ${result.error}`);
    if (result.status === "skipped") continue;
    if (result.status === "password_required") {
      target.rescueStatus = "password_required";
      break;
    }
    if (result.status !== "rescued") continue;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.copyFileSync(result.outputPath, outputPath);
    target.rescueStatus = "rescued";
    target.successfulMethod = methodName;
    target.rescuedPdfPath = path.relative(rootDir, outputPath);
    await reclassifyRescuedForm({ form, rescuedPath: outputPath, rescueTarget: target });
    break;
  }

  target.sourceSha256After = sha256(sourcePath);
  if (target.sourceSha256Before !== target.sourceSha256After) {
    target.errors.push("Source PDF hash changed during rescue pass.");
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  return target;
}

function locateSourcePdf(form) {
  const primary = path.join(sourceDir, form.relativePath);
  if (fs.existsSync(primary)) return primary;
  const matches = listFiles(sourceDir).filter((filePath) => path.basename(filePath) === form.fileName);
  return matches.find((filePath) => filePath.includes(form.sourceFolderName || "")) || matches[0] || null;
}

function runQpdfDecrypt(inputPath, outputPath, extraArgs) {
  if (!tools.qpdf) return { status: "skipped", error: "qpdf not installed" };
  const args = [...extraArgs, "--decrypt", inputPath, outputPath].filter(Boolean);
  const result = spawnSync(tools.qpdf, args, { encoding: "utf8" });
  return methodResult(result, outputPath);
}

function runMutoolClean(inputPath, outputPath) {
  if (!tools.mutool) return { status: "skipped", error: "mutool not installed" };
  const result = spawnSync(tools.mutool, ["clean", inputPath, outputPath], { encoding: "utf8" });
  return methodResult(result, outputPath);
}

function runGhostscript(inputPath, outputPath) {
  if (!tools.gs) return { status: "skipped", error: "gs not installed" };
  const result = spawnSync(
    tools.gs,
    ["-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite", `-sOutputFile=${outputPath}`, inputPath],
    { encoding: "utf8" }
  );
  return methodResult(result, outputPath);
}

function runRasterizedRebuild(inputPath, outputPath) {
  if (!tools.pdftocairo || !tools.convert) return { status: "skipped", error: "pdftocairo and convert are required for rasterized rebuild" };
  const imagePrefix = outputPath.replace(/\.pdf$/i, "");
  const raster = spawnSync(tools.pdftocairo, ["-png", inputPath, imagePrefix], { encoding: "utf8" });
  if (raster.status !== 0) return methodResult(raster, outputPath);
  const images = fs.readdirSync(path.dirname(outputPath)).filter((name) => name.startsWith(path.basename(imagePrefix)) && name.endsWith(".png")).sort();
  if (images.length === 0) return { status: "failed", error: "pdftocairo produced no images" };
  const result = spawnSync(tools.convert, [...images.map((name) => path.join(path.dirname(outputPath), name)), outputPath], { encoding: "utf8" });
  return methodResult(result, outputPath);
}

async function runPdfLibIgnoreEncryption(inputPath, outputPath) {
  try {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(inputPath), { ignoreEncryption: true });
    fs.writeFileSync(outputPath, await pdfDoc.save());
    return validateUnlockedPdf(outputPath);
  } catch (error) {
    return { status: isPasswordError(error.message) ? "password_required" : "failed", error: error.message };
  }
}

function methodResult(result, outputPath) {
  const stderr = result.stderr || "";
  const stdout = result.stdout || "";
  if (isPasswordError(`${stderr}\n${stdout}`)) return { status: "password_required", error: cleanError(`${stderr}\n${stdout}`) };
  if (result.status !== 0) return { status: "failed", error: cleanError(`${stderr}\n${stdout}`) || `exit ${result.status}` };
  return validateUnlockedPdf(outputPath);
}

function validateUnlockedPdf(outputPath) {
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) return { status: "failed", error: "No output PDF was created." };
  try {
    const doc = PDFDocument.load(fs.readFileSync(outputPath), { ignoreEncryption: false });
    if (typeof doc.then === "function") {
      return doc
        .then(() => ({ status: "rescued", outputPath }))
        .catch((error) => ({ status: isPasswordError(error.message) ? "password_required" : "failed", error: error.message }));
    }
    return { status: "rescued", outputPath };
  } catch (error) {
    return { status: isPasswordError(error.message) ? "password_required" : "failed", error: error.message };
  }
}

async function reclassifyRescuedForm({ form, rescuedPath, rescueTarget }) {
  const pdfDoc = await PDFDocument.load(fs.readFileSync(rescuedPath), { ignoreEncryption: false });
  const pageCount = pdfDoc.getPageCount();
  let fieldNames = [];
  try {
    fieldNames = pdfDoc.getForm().getFields().map((field) => field.getName());
  } catch {
    fieldNames = [];
  }
  const classification = fieldNames.length > 0 ? "dirty_acroform" : "flat_pdf";
  const mapKind = fieldNames.length > 0 ? "hybrid" : "overlay";
  const stateSlug = slugify(form.stateName);
  const fieldMapPath = path.join(fieldMapDraftRoot, `${stateSlug}-${form.formSlug}.rescued-field-map-draft.json`);
  const samplePath = path.join(shadowBatchRoot, `${stateSlug}-${form.formSlug}-rescued-sample.pdf`);
  const fieldMap = buildRescuedFieldMap({ form, classification, mapKind, fieldNames, pageCount, rescuedPath });

  writeJson(fieldMapPath, fieldMap);
  await renderSamplePdf({ absolutePdfPath: rescuedPath, samplePath, fieldMap });

  Object.assign(form, {
    classification,
    recommendedMappingMode: mapKind === "hybrid" ? "hybrid" : "coordinate_overlay",
    fieldCount: fieldNames.length,
    pageCount,
    warnings: [...(form.warnings || []), "Encrypted official PDF rescued into derivative unlocked review copy."],
    errors: [],
    visualReview: "pending",
    status: "partial_map",
    blockedReason: null,
    blockedArtifactPath: null,
    fieldMapPath: path.relative(rootDir, fieldMapPath),
    samplePath: path.relative(rootDir, samplePath),
    mapKind,
    rescuedPdfPath: path.relative(rootDir, rescuedPath),
    rescuedFromOfficialPdf: form.relativePath
  });

  rescueTarget.notes.push(`rescued_reclassification: ${classification}`);
  rescueTarget.notes.push(`field_map: ${form.fieldMapPath}`);
  rescueTarget.notes.push(`sample: ${form.samplePath}`);
}

function buildRescuedFieldMap({ form, classification, mapKind, fieldNames, pageCount, rescuedPath }) {
  return {
    schemaVersion: 1,
    lifecycle: "visual_review_pending",
    sourcePdf: form.relativePath,
    rescuedPdf: path.relative(rootDir, rescuedPath),
    derivativeOfOfficialPdf: true,
    jurisdictionCode: form.jurisdictionCode,
    stateName: form.stateName,
    formName: form.fileName,
    classification,
    mapKind,
    generatedAt: new Date().toISOString(),
    notice: "Encrypted official PDF rescue draft only. Not visual approval, not counsel approval, and not source freshness approval.",
    acroFields: fieldNames.map((name, index) => ({
      id: `${form.formSlug}-rescued-field-${index + 1}`,
      sourceName: name,
      target: canonicalFieldGuess(name),
      mappingMode: "hybrid_acroform_name",
      confidence: "low",
      reviewFlags: ["visual_review_pending", "counsel_review_pending", "rescued_encrypted_pdf"]
    })),
    overlayAnchors: defaultOverlayAnchors(pageCount),
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
  const pdfDoc = await PDFDocument.load(fs.readFileSync(absolutePdfPath), { ignoreEncryption: false });
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
    page.drawText(`RCAP encrypted PDF rescue review draft - page ${index + 1}`, {
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
  fs.mkdirSync(path.dirname(samplePath), { recursive: true });
  fs.writeFileSync(samplePath, await pdfDoc.save());
}

function syncReviewInboxForTouchedStates(targets) {
  const touchedCodes = new Set(targets.map((target) => target.jurisdictionCode).filter(Boolean));
  for (const code of touchedCodes) {
    const state = manifest.states.find((entry) => entry.jurisdictionCode === code);
    if (!state) continue;
    const forms = manifest.forms.filter((form) => form.jurisdictionCode === code);
    const stateDir = path.join(reviewInboxRoot, slugify(state.stateName));
    const fieldMapDir = path.join(stateDir, "field-maps");
    const sampleDir = path.join(stateDir, "sample-packets");
    const blockedDir = path.join(stateDir, "blocked-forms");
    fs.mkdirSync(fieldMapDir, { recursive: true });
    fs.mkdirSync(sampleDir, { recursive: true });
    fs.mkdirSync(blockedDir, { recursive: true });
    for (const form of forms) {
      copyIfExists(form.fieldMapPath, path.join(fieldMapDir, path.basename(form.fieldMapPath || "")));
      copyIfExists(form.samplePath, path.join(sampleDir, path.basename(form.samplePath || "")));
      copyIfExists(form.blockedArtifactPath, path.join(blockedDir, path.basename(form.blockedArtifactPath || "")));
    }
    writeJson(path.join(stateDir, "forms-manifest.json"), { forms });
    writeJson(path.join(stateDir, "blocked-forms.json"), {
      blockedForms: forms.filter((form) => form.status === "blocked")
    });
  }
}

function rebuildManifestSummaries(currentManifest) {
  currentManifest.summary = buildSummary(currentManifest.forms);
  currentManifest.states = buildStateSummaries(currentManifest.forms);
  currentManifest.encryptedPdfRescue = {
    reportPath: path.relative(rootDir, rescueReportPath),
    generatedAt: report.generatedAt
  };
}

function buildStateSummaries(forms) {
  const states = [];
  const grouped = groupBy(forms, (form) => form.jurisdictionCode || "UNKNOWN");
  for (const [jurisdictionCode, stateForms] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    states.push({
      jurisdictionCode,
      stateName: stateForms[0]?.stateName || jurisdictionCode,
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
  const classifications = ["clean_acroform", "dirty_acroform", "xfa", "flat_pdf", "scanned_pdf", "encrypted_pdf", "html_form", "rtf_doc", "unknown"];
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
      ...Object.fromEntries(classifications.map((classification) => [classification, 0])),
      ...countBy(forms, (form) => form.classification)
    }
  };
}

function defaultOverlayAnchors(pageCount) {
  const safePageCount = Math.max(1, Math.min(Number(pageCount) || 1, 3));
  const anchors = [];
  for (let page = 1; page <= safePageCount; page += 1) {
    anchors.push({
      id: `rescued-review-anchor-${page}-1`,
      page,
      label: "participant/case info review zone",
      x: 72,
      y: 120,
      width: 240,
      height: 24,
      confidence: "low",
      reviewFlags: ["visual_review_pending", "manual_coordinate_confirmation_required", "rescued_encrypted_pdf"]
    });
    anchors.push({
      id: `rescued-review-anchor-${page}-2`,
      page,
      label: "signature/date review zone",
      x: 72,
      y: 680,
      width: 260,
      height: 24,
      confidence: "low",
      reviewFlags: ["visual_review_pending", "manual_coordinate_confirmation_required", "rescued_encrypted_pdf"]
    });
  }
  return anchors;
}

function isPasswordError(message) {
  return /password|invalid password|requires a password|encrypted/i.test(String(message));
}

function cleanError(message) {
  return String(message).replace(/\s+/g, " ").trim();
}

function findTool(command) {
  const result = spawnSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8" });
  const value = result.stdout.trim();
  return value || null;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.name === ".DS_Store" || entry.name.startsWith("._")) return [];
    if (entry.isDirectory()) return listFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  });
}

function copyIfExists(relativePath, destination) {
  if (!relativePath) return;
  const sourcePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(sourcePath)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(sourcePath, destination);
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

function countBy(items, picker) {
  const counts = {};
  for (const item of items) {
    const key = picker(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function groupBy(items, picker) {
  const groups = new Map();
  for (const item of items) {
    const key = picker(item);
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
