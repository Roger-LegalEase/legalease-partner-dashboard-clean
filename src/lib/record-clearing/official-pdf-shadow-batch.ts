import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface ShadowBatchOptions {
  rootDir: string;
  sourceDir: string;
  outputDir: string;
  draftPaths?: string[];
}

export interface ShadowBatchSummary {
  generatedAt: string;
  approvedDraftCount: number;
  renderedCount: number;
  blockedCount: number;
  outputDir: string;
  manifestPath: string;
  results: ShadowBatchResult[];
}

export interface ShadowBatchResult {
  formSlug: string;
  jurisdiction: string;
  formNumber: string | null;
  sourceDraftJson: string;
  sourcePdf: string | null;
  outputPath: string | null;
  blockedReason: string | null;
  gatingStatus: {
    approvalExists: boolean;
    visualReviewRequired: true;
    lifecycle: "none";
    rendererReady: false;
    notPromoted: true;
    shadowOnly: true;
  };
  fieldCount: number;
  renderedValueCount: number;
  sourceSha256: string | null;
  outputSha256: string | null;
}

interface ApprovedDraft {
  raw: Record<string, unknown>;
  draftPath: string;
  formSlug: string;
  jurisdiction: string;
  jurisdictionCode: string | null;
  formNumber: string | null;
  formTitle: string | null;
  sourcePdf: string | null;
  sourceSha256: string | null;
  fields: NormalizedField[];
}

interface NormalizedField {
  id: string;
  kind: string;
  page: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  key: string;
  label: string;
}

const approval = {
  visualReviewStatus: "approved_by_user",
  visualReviewer: "Roger Roman"
} as const;

export function discoverApprovedFieldMapDraftPaths(rootDir: string): string[] {
  const draftsDir = path.join(rootDir, "docs/record-clearing/field-map-drafts");
  return fs.readdirSync(draftsDir)
    .filter((entry) => entry.endsWith(".field-map-review.json"))
    .map((entry) => path.join("docs/record-clearing/field-map-drafts", entry))
    .filter((relativePath) => {
      const draft = JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")) as Record<string, unknown>;
      return isApprovedShadowDraft(draft);
    })
    .sort();
}

export function isApprovedShadowDraft(draft: Record<string, unknown>): boolean {
  return draft.visualReviewStatus === approval.visualReviewStatus
    && draft.visualReviewer === approval.visualReviewer
    && typeof draft.visualReviewNote === "string"
    && draft.visualReviewNote.length > 0
    && typeof draft.visualReviewDate === "string"
    && draft.visualReviewDate.length > 0
    && draft.visual_review_required === true
    && draft.lifecycle === "none"
    && draft.rendererReady === false;
}

export function loadApprovedShadowDraft(rootDir: string, draftPath: string): ApprovedDraft {
  const raw = JSON.parse(fs.readFileSync(path.join(rootDir, draftPath), "utf8")) as Record<string, unknown>;
  const failures = getDraftGateFailures(raw);
  if (failures.length > 0) {
    throw new Error(`${draftPath} is not an approved shadow draft: ${failures.join("; ")}`);
  }

  return {
    raw,
    draftPath,
    formSlug: readString(raw.formSlug) ?? path.basename(draftPath, ".field-map-review.json"),
    jurisdiction: readString(raw.jurisdictionName) ?? readString(raw.jurisdiction) ?? "Unknown",
    jurisdictionCode: readString(raw.jurisdictionCode),
    formNumber: readString(raw.formNumber),
    formTitle: readString(raw.formTitle),
    sourcePdf: readString(raw.sourcePdf),
    sourceSha256: readString(raw.sourceSha256),
    fields: normalizeFields(raw)
  };
}

export function getDraftGateFailures(draft: Record<string, unknown>): string[] {
  const failures: string[] = [];
  if (draft.visualReviewStatus !== approval.visualReviewStatus) failures.push("visualReviewStatus must be approved_by_user");
  if (draft.visualReviewer !== approval.visualReviewer) failures.push("visualReviewer must be Roger Roman");
  if (typeof draft.visualReviewNote !== "string" || draft.visualReviewNote.length === 0) failures.push("visualReviewNote must exist");
  if (typeof draft.visualReviewDate !== "string" || draft.visualReviewDate.length === 0) failures.push("visualReviewDate must exist");
  if (draft.visual_review_required !== true) failures.push("visual_review_required must remain true");
  if (draft.lifecycle !== "none") failures.push("lifecycle must remain none");
  if (draft.rendererReady !== false) failures.push("rendererReady must remain false");
  return failures;
}

export async function renderOfficialPdfShadowBatch(options: ShadowBatchOptions): Promise<ShadowBatchSummary> {
  fs.mkdirSync(options.outputDir, { recursive: true });
  const draftPaths = options.draftPaths ?? discoverApprovedFieldMapDraftPaths(options.rootDir);
  const results: ShadowBatchResult[] = [];

  for (const draftPath of draftPaths) {
    try {
      const draft = loadApprovedShadowDraft(options.rootDir, draftPath);
      results.push(await renderOneDraft(options, draft));
    } catch (error) {
      results.push(blockedResult(draftPath, error instanceof Error ? error.message : String(error)));
    }
  }

  const summary: ShadowBatchSummary = {
    generatedAt: new Date().toISOString(),
    approvedDraftCount: draftPaths.length,
    renderedCount: results.filter((result) => result.outputPath).length,
    blockedCount: results.filter((result) => result.blockedReason).length,
    outputDir: options.outputDir,
    manifestPath: path.join(options.outputDir, "official-pdf-shadow-batch-manifest.json"),
    results
  };

  fs.writeFileSync(summary.manifestPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function renderOneDraft(options: ShadowBatchOptions, draft: ApprovedDraft): Promise<ShadowBatchResult> {
  if (!draft.sourcePdf) return blockedDraftResult(draft, "Draft does not declare sourcePdf.");
  if (draft.fields.length === 0) return blockedDraftResult(draft, "Draft has no renderable fields or candidates.");

  const sourcePdfPath = resolveSourcePdfPath(options.sourceDir, draft);
  if (!sourcePdfPath) return blockedDraftResult(draft, `Source PDF not found for ${draft.sourcePdf}.`);

  const sourceSha256 = hashFile(sourcePdfPath);
  if (draft.sourceSha256 && draft.sourceSha256 !== sourceSha256) {
    return blockedDraftResult(draft, `Source PDF hash mismatch: expected ${draft.sourceSha256}, got ${sourceSha256}.`, sourceSha256);
  }

  try {
    const document = await PDFDocument.load(fs.readFileSync(sourcePdfPath), { ignoreEncryption: true });
    const font = await document.embedFont(StandardFonts.HelveticaBold);
    const pages = document.getPages();
    let renderedValueCount = 0;

    for (const field of draft.fields) {
      const page = pages[field.page - 1];
      if (!page) continue;
      const sampleValue = sampleValueForField(field);
      if (!sampleValue) continue;
      page.drawText(sampleValue, {
        x: field.rect.x,
        y: field.rect.y + 1,
        size: field.kind === "signature" ? 9 : Math.max(7, Math.min(9, field.rect.height + 1)),
        font,
        color: rgb(0.85, 0, 0),
        maxWidth: Math.max(30, field.rect.width)
      });
      renderedValueCount += 1;
    }

    const outputPath = path.join(options.outputDir, `${safeFileName(draft.formSlug)}-shadow-sample.pdf`);
    fs.writeFileSync(outputPath, await document.save({ useObjectStreams: false }));

    return {
      ...baseResult(draft),
      outputPath,
      blockedReason: null,
      fieldCount: draft.fields.length,
      renderedValueCount,
      sourceSha256,
      outputSha256: hashFile(outputPath)
    };
  } catch (error) {
    return blockedDraftResult(draft, `PDF render failed: ${error instanceof Error ? error.message : String(error)}`, sourceSha256);
  }
}

function normalizeFields(raw: Record<string, unknown>): NormalizedField[] {
  const manualFields = readArray(readObject(raw.draftFieldMap)?.fields);
  if (manualFields.length > 0) {
    return manualFields.map((field, index) => normalizeManualField(field, index)).filter((field): field is NormalizedField => field !== null);
  }

  return readArray(raw.candidates)
    .map((candidate, index) => normalizeCandidate(candidate, index))
    .filter((field): field is NormalizedField => field !== null);
}

function normalizeManualField(field: unknown, index: number): NormalizedField | null {
  const object = readObject(field);
  const rect = readArray(object?.rect);
  if (!object || rect.length !== 4) return null;
  const [x1, y1, x2, y2] = rect.map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  return {
    id: readString(object.id) ?? `field-${index + 1}`,
    kind: readString(object.kind) ?? "text",
    page: Number(object.page ?? 1),
    rect: {
      x: x1,
      y: y1,
      width: Math.max(1, x2 - x1),
      height: Math.max(1, y2 - y1)
    },
    key: readString(object.intakeKey) ?? readString(object.fieldKey) ?? `field_${index + 1}`,
    label: readString(object.label) ?? readString(object.fieldKey) ?? `Field ${index + 1}`
  };
}

function normalizeCandidate(candidate: unknown, index: number): NormalizedField | null {
  const object = readObject(candidate);
  const rect = readObject(object?.rect);
  if (!object || !rect) return null;
  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return {
    id: readString(object.candidateId) ?? `candidate-${index + 1}`,
    kind: readString(object.fieldType) ?? "text",
    page: Number(object.page ?? 1),
    rect: {
      x,
      y,
      width: Math.max(1, width),
      height: Math.max(1, height)
    },
    key: readString(object.draftCanonicalKey) ?? readString(object.sourceAcroFormFieldName) ?? `candidate_${index + 1}`,
    label: readString(object.sourceAcroFormFieldName) ?? readString(object.draftCanonicalKey) ?? `Candidate ${index + 1}`
  };
}

function resolveSourcePdfPath(sourceDir: string, draft: ApprovedDraft): string | null {
  if (!draft.sourcePdf) return null;
  const direct = path.join(sourceDir, draft.sourcePdf);
  if (fs.existsSync(direct)) return direct;

  const folderName = `LegalEase ${draft.jurisdiction}`;
  const nested = path.join(sourceDir, folderName, draft.sourcePdf);
  if (fs.existsSync(nested)) return nested;
  return null;
}

function sampleValueForField(field: NormalizedField): string {
  const key = sanitizePdfText(field.key);
  if (field.kind === "checkbox" || field.kind === "radioGroup") return "X";
  if (field.kind === "date" || /date/i.test(key)) return "06/16/2026";
  if (/case/i.test(key)) return "2026CF000001";
  if (/county/i.test(key)) return "Sample County";
  if (/name|defendant|petitioner/i.test(key)) return "Sample Person";
  if (/phone|telephone/i.test(key)) return "(555) 010-0000";
  if (/email/i.test(key)) return "sample@example.test";
  if (/address/i.test(key)) return "123 Sample St";
  if (/signature/i.test(key)) return "/s/ Sample Person";
  return sanitizePdfText(`Sample ${field.label}`).slice(0, 80);
}

function sanitizePdfText(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim() || "Sample";
}

function baseResult(draft: ApprovedDraft): Omit<ShadowBatchResult, "outputPath" | "blockedReason" | "fieldCount" | "renderedValueCount" | "sourceSha256" | "outputSha256"> {
  return {
    formSlug: draft.formSlug,
    jurisdiction: draft.jurisdiction,
    formNumber: draft.formNumber,
    sourceDraftJson: draft.draftPath,
    sourcePdf: draft.sourcePdf,
    gatingStatus: {
      approvalExists: true,
      visualReviewRequired: true,
      lifecycle: "none",
      rendererReady: false,
      notPromoted: true,
      shadowOnly: true
    }
  };
}

function blockedDraftResult(draft: ApprovedDraft, blockedReason: string, sourceSha256: string | null = null): ShadowBatchResult {
  return {
    ...baseResult(draft),
    outputPath: null,
    blockedReason,
    fieldCount: draft.fields.length,
    renderedValueCount: 0,
    sourceSha256,
    outputSha256: null
  };
}

function blockedResult(draftPath: string, blockedReason: string): ShadowBatchResult {
  return {
    formSlug: path.basename(draftPath, ".field-map-review.json"),
    jurisdiction: "Unknown",
    formNumber: null,
    sourceDraftJson: draftPath,
    sourcePdf: null,
    outputPath: null,
    blockedReason,
    gatingStatus: {
      approvalExists: false,
      visualReviewRequired: true,
      lifecycle: "none",
      rendererReady: false,
      notPromoted: true,
      shadowOnly: true
    },
    fieldCount: 0,
    renderedValueCount: 0,
    sourceSha256: null,
    outputSha256: null
  };
}

function safeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function hashFile(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
