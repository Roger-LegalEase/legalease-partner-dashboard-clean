import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  discoverApprovedFieldMapDraftPaths,
  getDraftGateFailures,
  renderOfficialPdfShadowBatch,
  type ShadowBatchResult,
  type ShadowBatchSummary
} from "./official-pdf-shadow-batch";

/**
 * Official-PDF implementation gate.
 *
 * This module is a NON-PROMOTIONAL evaluator. It reads visually-approved field-map
 * drafts plus their shadow-render results and classifies what each draft would still
 * need before it could ever become a future shadow renderer candidate.
 *
 * It never mutates a draft, never changes lifecycle/rendererReady/visual_review_required,
 * never marks anything replacement_candidate or verified_replacement, and never wires a
 * renderer or a live route. It is intentionally NOT exported from the public
 * record-clearing index (see scripts/verify-official-pdf-implementation-gate.mjs).
 */

export const IMPLEMENTATION_GATE_STATUSES = [
  "implementation_gate_pass",
  "needs_shadow_render_fix",
  "needs_source_confirmation",
  "needs_manual_overlay_refinement",
  "blocked_pdf_render",
  "not_ready_for_renderer_candidate"
] as const;

export type ImplementationGateStatus = (typeof IMPLEMENTATION_GATE_STATUSES)[number];

export interface ImplementationGateOptions {
  rootDir: string;
  sourceDir: string;
  /** Directory for the gate report output (e.g. tmp/official-pdf-implementation-gate). */
  outputDir: string;
  /** Directory the shadow batch renders into (e.g. tmp/official-pdf-shadow-batch). */
  shadowOutputDir: string;
  /** Optional pre-computed shadow summary to avoid re-rendering. */
  shadowSummary?: ShadowBatchSummary;
  draftPaths?: string[];
}

export interface GateCheck {
  id: string;
  description: string;
  pass: boolean;
  detail: string;
}

export interface ImplementationGateResult {
  formSlug: string;
  jurisdiction: string;
  formNumber: string | null;
  sourceDraftJson: string;
  sourcePdf: string | null;
  primaryStatus: ImplementationGateStatus;
  /** Lifecycle fields echoed verbatim for transparency. Never modified by the gate. */
  lifecycle: unknown;
  rendererReady: unknown;
  visualReviewRequired: unknown;
  fieldCount: number;
  renderedValueCount: number;
  checks: GateCheck[];
  reasons: string[];
  secondaryFindings: ImplementationGateStatus[];
}

export interface ImplementationGateReport {
  generatedAt: string;
  rootDir: string;
  approvedDraftCount: number;
  evaluatedCount: number;
  shadow: {
    rendered: number;
    blocked: number;
    manifestPath: string;
  };
  globalChecks: GateCheck[];
  statusCounts: Record<ImplementationGateStatus, number>;
  topImplementationGatePassCandidates: string[];
  blockedItems: Array<{ formSlug: string; primaryStatus: ImplementationGateStatus; reasons: string[] }>;
  results: ImplementationGateResult[];
  nonPromotionStatement: string;
}

const NON_PROMOTION_STATEMENT =
  "This is a non-promotional implementation-gate evaluation only. It does not change " +
  "lifecycle, rendererReady, or visual_review_required on any draft; it does not mark any " +
  "draft replacement_candidate or verified_replacement; it does not wire any renderer or " +
  "live route. Every evaluated draft remains shadow-only and visual_review_required.";

export async function evaluateOfficialPdfImplementationGate(
  options: ImplementationGateOptions
): Promise<ImplementationGateReport> {
  fs.mkdirSync(options.outputDir, { recursive: true });

  const draftPaths = options.draftPaths ?? discoverApprovedFieldMapDraftPaths(options.rootDir);
  const shadowSummary =
    options.shadowSummary ??
    (await renderOfficialPdfShadowBatch({
      rootDir: options.rootDir,
      sourceDir: options.sourceDir,
      outputDir: options.shadowOutputDir,
      draftPaths
    }));

  const shadowByDraft = new Map<string, ShadowBatchResult>(
    shadowSummary.results.map((result) => [result.sourceDraftJson, result])
  );

  const globalChecks = buildGlobalChecks(options.rootDir, draftPaths);

  const results: ImplementationGateResult[] = draftPaths.map((draftPath) =>
    evaluateDraft(options.rootDir, draftPath, shadowByDraft.get(draftPath) ?? null, globalChecks)
  );

  const statusCounts = emptyStatusCounts();
  for (const result of results) statusCounts[result.primaryStatus] += 1;

  const report: ImplementationGateReport = {
    generatedAt: new Date().toISOString(),
    rootDir: options.rootDir,
    approvedDraftCount: draftPaths.length,
    evaluatedCount: results.length,
    shadow: {
      rendered: shadowSummary.renderedCount,
      blocked: shadowSummary.blockedCount,
      manifestPath: shadowSummary.manifestPath
    },
    globalChecks,
    statusCounts,
    topImplementationGatePassCandidates: results
      .filter((result) => result.primaryStatus === "implementation_gate_pass")
      .map((result) => `${result.jurisdiction} ${result.formNumber ?? result.formSlug}`),
    blockedItems: results
      .filter((result) => result.primaryStatus !== "implementation_gate_pass")
      .map((result) => ({
        formSlug: result.formSlug,
        primaryStatus: result.primaryStatus,
        reasons: result.reasons
      })),
    results,
    nonPromotionStatement: NON_PROMOTION_STATEMENT
  };

  const reportPath = path.join(options.outputDir, "official-pdf-implementation-gate-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function gateReportPath(outputDir: string): string {
  return path.join(outputDir, "official-pdf-implementation-gate-report.json");
}

function evaluateDraft(
  rootDir: string,
  draftPath: string,
  shadow: ShadowBatchResult | null,
  globalChecks: GateCheck[]
): ImplementationGateResult {
  const raw = readDraft(rootDir, draftPath);
  const gateFailures = raw ? getDraftGateFailures(raw) : ["draft JSON could not be read or parsed"];

  const fields = raw ? readFieldEntries(raw) : [];
  const fieldCount = shadow?.fieldCount ?? fields.length;
  const renderedValueCount = shadow?.renderedValueCount ?? 0;
  const renderSucceeded = Boolean(shadow?.outputPath) && !shadow?.blockedReason;
  const sourceSha = raw ? readString(raw.sourceSha256) : null;
  const mappingsResolved = fields.length > 0 && fields.every(isFieldResolved);

  const noLiveWiring = globalChecks.every((check) => check.pass);

  const checks: GateCheck[] = [
    {
      id: "visual_approval_metadata",
      description: "Visual approval metadata exists and gating fields are intact.",
      pass: gateFailures.length === 0,
      detail: gateFailures.length === 0 ? "approved_by_user metadata present" : gateFailures.join("; ")
    },
    {
      id: "source_draft_readable",
      description: "Source draft JSON is readable.",
      pass: raw !== null,
      detail: raw !== null ? `parsed ${draftPath}` : `could not read ${draftPath}`
    },
    {
      id: "sample_shadow_render_succeeded",
      description: "Sample shadow render produced output with rendered values.",
      pass: renderSucceeded && renderedValueCount > 0,
      detail: shadow
        ? shadow.blockedReason
          ? `blocked: ${shadow.blockedReason}`
          : `rendered ${renderedValueCount}/${fieldCount} fields -> ${shadow.outputPath ?? "no output"}`
        : "no shadow result for draft"
    },
    {
      id: "required_fields_present",
      description: "Draft declares renderable fields.",
      pass: fieldCount > 0,
      detail: `${fieldCount} fields in map`
    },
    {
      id: "lifecycle_none",
      description: "lifecycle remains none.",
      pass: raw?.lifecycle === "none",
      detail: `lifecycle=${JSON.stringify(raw?.lifecycle ?? null)}`
    },
    {
      id: "renderer_ready_false",
      description: "rendererReady remains false.",
      pass: raw?.rendererReady === false,
      detail: `rendererReady=${JSON.stringify(raw?.rendererReady ?? null)}`
    },
    {
      id: "visual_review_required_true",
      description: "visual_review_required remains true.",
      pass: raw?.visual_review_required === true,
      detail: `visual_review_required=${JSON.stringify(raw?.visual_review_required ?? null)}`
    },
    {
      id: "source_identity_confirmed",
      description: "Draft records a source PDF hash so the official source can be confirmed.",
      pass: Boolean(sourceSha),
      detail: sourceSha ? `sourceSha256=${sourceSha.slice(0, 12)}…` : "no sourceSha256 recorded"
    },
    {
      id: "field_mappings_resolved",
      description: "Every field has a confirmed intake/canonical mapping (not a raw candidate).",
      pass: mappingsResolved,
      detail: mappingsResolved
        ? "all fields carry confirmed mappings"
        : `${fields.filter((field) => !isFieldResolved(field)).length}/${fields.length} fields still need manual mapping`
    },
    {
      id: "no_live_route_or_selector_wiring",
      description: "No live route import or public selector wiring exists for this gate/batch.",
      pass: noLiveWiring,
      detail: noLiveWiring
        ? "no live wiring detected"
        : globalChecks
            .filter((check) => !check.pass)
            .map((check) => check.detail)
            .join("; ")
    }
  ];

  const { primaryStatus, secondaryFindings, reasons } = classify({
    gatePass: gateFailures.length === 0,
    raw,
    shadow,
    renderSucceeded,
    renderedValueCount,
    fieldCount,
    sourceConfirmed: Boolean(sourceSha),
    mappingsResolved,
    noLiveWiring
  });

  return {
    formSlug: shadow?.formSlug ?? path.basename(draftPath, ".field-map-review.json"),
    jurisdiction: shadow?.jurisdiction ?? readString(raw?.jurisdictionName) ?? readString(raw?.jurisdiction) ?? "Unknown",
    formNumber: shadow?.formNumber ?? readString(raw?.formNumber),
    sourceDraftJson: draftPath,
    sourcePdf: shadow?.sourcePdf ?? readString(raw?.sourcePdf),
    primaryStatus,
    lifecycle: raw?.lifecycle ?? null,
    rendererReady: raw?.rendererReady ?? null,
    visualReviewRequired: raw?.visual_review_required ?? null,
    fieldCount,
    renderedValueCount,
    checks,
    reasons,
    secondaryFindings
  };
}

interface ClassifyInput {
  gatePass: boolean;
  raw: Record<string, unknown> | null;
  shadow: ShadowBatchResult | null;
  renderSucceeded: boolean;
  renderedValueCount: number;
  fieldCount: number;
  sourceConfirmed: boolean;
  mappingsResolved: boolean;
  noLiveWiring: boolean;
}

/**
 * Priority cascade (most fundamental gate first). The first failing gate decides the
 * primary status; every other failing gate is recorded as a secondary finding so the
 * report stays honest about everything a draft still needs.
 */
function classify(input: ClassifyInput): {
  primaryStatus: ImplementationGateStatus;
  secondaryFindings: ImplementationGateStatus[];
  reasons: string[];
} {
  const findings: Array<{ status: ImplementationGateStatus; reason: string }> = [];

  if (!input.gatePass || !input.noLiveWiring || !input.raw) {
    findings.push({
      status: "not_ready_for_renderer_candidate",
      reason: !input.raw
        ? "draft JSON unreadable"
        : !input.gatePass
          ? "approval/lifecycle gate metadata is not intact"
          : "live route or public selector wiring detected"
    });
  }

  if (!input.renderSucceeded) {
    const reason = input.shadow?.blockedReason ?? "no shadow render result";
    if (/source pdf not found|hash mismatch|does not declare sourcepdf/i.test(reason)) {
      findings.push({ status: "needs_source_confirmation", reason: `shadow render blocked: ${reason}` });
    } else {
      findings.push({ status: "blocked_pdf_render", reason: `shadow render blocked: ${reason}` });
    }
  } else if (input.renderedValueCount === 0 || input.renderedValueCount < input.fieldCount) {
    findings.push({
      status: "needs_shadow_render_fix",
      reason: `shadow render only filled ${input.renderedValueCount}/${input.fieldCount} fields`
    });
  }

  if (!input.sourceConfirmed) {
    findings.push({
      status: "needs_source_confirmation",
      reason: "no source PDF hash recorded; official source/currentness must be confirmed"
    });
  }

  if (!input.mappingsResolved) {
    findings.push({
      status: "needs_manual_overlay_refinement",
      reason: "fields are still raw candidates / needs_review intake keys; manual overlay refinement required"
    });
  }

  if (findings.length === 0) {
    return {
      primaryStatus: "implementation_gate_pass",
      secondaryFindings: [],
      reasons: ["All implementation-gate checks pass; remains shadow-only pending a separate explicit implementation task."]
    };
  }

  const ordered = orderFindings(findings);
  return {
    primaryStatus: ordered[0].status,
    secondaryFindings: dedupeStatuses(ordered.slice(1).map((finding) => finding.status)),
    reasons: ordered.map((finding) => finding.reason)
  };
}

const STATUS_PRIORITY: ImplementationGateStatus[] = [
  "not_ready_for_renderer_candidate",
  "blocked_pdf_render",
  "needs_shadow_render_fix",
  "needs_source_confirmation",
  "needs_manual_overlay_refinement",
  "implementation_gate_pass"
];

function orderFindings(
  findings: Array<{ status: ImplementationGateStatus; reason: string }>
): Array<{ status: ImplementationGateStatus; reason: string }> {
  return [...findings].sort(
    (a, b) => STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status)
  );
}

function dedupeStatuses(statuses: ImplementationGateStatus[]): ImplementationGateStatus[] {
  return [...new Set(statuses)];
}

function buildGlobalChecks(rootDir: string, draftPaths: string[]): GateCheck[] {
  const checks: GateCheck[] = [];

  const publicIndexPath = path.join(rootDir, "src/lib/record-clearing/index.ts");
  const publicIndex = fs.existsSync(publicIndexPath) ? fs.readFileSync(publicIndexPath, "utf8") : "";
  const exportedFromIndex =
    publicIndex.includes("official-pdf-implementation-gate") ||
    publicIndex.includes("official-pdf-shadow-batch");
  checks.push({
    id: "not_exported_from_public_index",
    description: "Gate/batch modules are not exported from the public record-clearing index.",
    pass: !exportedFromIndex,
    detail: exportedFromIndex ? "gate/batch module is exported from index.ts" : "gate/batch modules stay private"
  });

  const liveRouteImports = grep(rootDir, ["src/app"], "official-pdf-(implementation-gate|shadow-batch)");
  checks.push({
    id: "no_live_route_imports",
    description: "No file under src/app imports the gate or shadow batch.",
    pass: liveRouteImports.length === 0,
    detail: liveRouteImports.length === 0 ? "no src/app imports" : liveRouteImports.join("; ")
  });

  const approvedCodes = draftPaths
    .map((draftPath) => readString(readDraft(rootDir, draftPath)?.jurisdictionCode))
    .filter((code): code is string => Boolean(code));
  const liveSelector = liveSelectorWiring(rootDir, approvedCodes);
  checks.push({
    id: "no_public_selector_wiring",
    description: "No approved draft jurisdiction is wired into the live record-clearing selector.",
    pass: liveSelector.length === 0,
    detail: liveSelector.length === 0 ? "no live selector wiring" : liveSelector.join("; ")
  });

  return checks;
}

function liveSelectorWiring(rootDir: string, approvedCodes: string[]): string[] {
  if (approvedCodes.length === 0) return [];
  try {
    const recordClearing = requireRecordClearingIndex(rootDir);
    const jurisdictions = recordClearing?.recordClearingJurisdictions;
    if (!Array.isArray(jurisdictions)) return [];
    const liveCodes = new Set(
      jurisdictions
        .map((entry: unknown) => readString(readObject(entry)?.jurisdictionCode))
        .filter((code): code is string => Boolean(code))
    );
    return approvedCodes.filter((code) => liveCodes.has(code)).map((code) => `${code} appears in recordClearingJurisdictions`);
  } catch {
    return [];
  }
}

interface RecordClearingIndexModule {
  recordClearingJurisdictions?: unknown;
}

function requireRecordClearingIndex(rootDir: string): RecordClearingIndexModule | null {
  try {
    const dynamicRequire = eval("require") as NodeRequire | undefined;
    if (typeof dynamicRequire !== "function") return null;
    return dynamicRequire(path.join(rootDir, "src/lib/record-clearing/index.ts")) as RecordClearingIndexModule;
  } catch {
    return null;
  }
}

function readDraft(rootDir: string, draftPath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, draftPath), "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readFieldEntries(raw: Record<string, unknown>): Record<string, unknown>[] {
  const manualFields = readArray(readObject(raw.draftFieldMap)?.fields)
    .map(readObject)
    .filter((field): field is Record<string, unknown> => field !== null);
  if (manualFields.length > 0) return manualFields;
  return readArray(raw.candidates)
    .map(readObject)
    .filter((field): field is Record<string, unknown> => field !== null);
}

function isFieldResolved(field: Record<string, unknown>): boolean {
  // Manual overlay fields carry a confirmed intakeKey.
  const intakeKey = readString(field.intakeKey);
  if (intakeKey) return intakeKey !== "needs_review";

  // Auto-extracted candidates are resolved only once a human accepts them.
  const reviewStatus = readString(field.reviewStatus);
  const canonicalKey = readString(field.draftCanonicalKey);
  const confidence = readString(field.canonicalKeyConfidence);
  if (reviewStatus) {
    return /accepted|approved|confirmed/i.test(reviewStatus) && Boolean(canonicalKey) && confidence === "high";
  }
  return false;
}

function emptyStatusCounts(): Record<ImplementationGateStatus, number> {
  const counts = {} as Record<ImplementationGateStatus, number>;
  for (const status of IMPLEMENTATION_GATE_STATUSES) counts[status] = 0;
  return counts;
}

function grep(rootDir: string, paths: string[], pattern: string): string[] {
  const existing = paths.filter((target) => fs.existsSync(path.join(rootDir, target)));
  if (existing.length === 0) return [];
  const result = spawnSync("grep", ["-R", "-n", "-E", pattern, ...existing], {
    cwd: rootDir,
    encoding: "utf8"
  });
  if (result.status === 1) return [];
  return (result.stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
