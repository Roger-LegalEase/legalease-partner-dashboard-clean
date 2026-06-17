import "server-only";

import fs from "node:fs";
import path from "node:path";

export type ReviewStatuses = {
  qa: string;
  visual: string;
  counsel: string;
  sourceFreshness: string;
};

export type BuildState = {
  code: string;
  name: string;
  slug: string;
  buildStatus: string;
  reviewStatuses: ReviewStatuses;
  outputTypes: string[];
  sourceInventory: {
    sourceFolders: string[];
    resourceCounts: Record<string, number>;
  };
  artifacts: {
    guidancePacket: string;
    reviewArtifact: string;
    internalPreview: string;
  };
  liveRouting: {
    approvedForLive: boolean;
    live: boolean;
    note: string;
  };
};

export type OverlayState = {
  jurisdictionCode: string;
  stateName: string;
  totalForms: number;
  pdfForms: number;
  mappedForms: number;
  partialMaps: number;
  blockedForms: number;
  renderedSamples: number;
  visualReviewPending: number;
  byClassification: Record<string, number>;
};

export type OverlayForm = {
  kind: string;
  jurisdictionCode: string;
  stateName: string;
  fileName: string;
  relativePath: string;
  classification: string;
  status: string;
  fieldMapPath?: string | null;
  samplePath?: string | null;
  blockedArtifactPath?: string | null;
  blockedReason?: string | null;
  mapKind?: string | null;
  visualReview?: string;
};

export type StatePreview = {
  build: BuildState;
  overlay: OverlayState;
  forms: OverlayForm[];
  reviewRoot: string;
  artifactFiles: string[];
  statePackSummary: StatePackSummary;
  formsManifest: FormsManifest;
  qaReport: QaReport;
  samples: string[];
  blockedArtifacts: string[];
};

type BuildManifest = {
  states: BuildState[];
};

type OverlayManifest = {
  summary: HandoffOverlaySummary;
  states: OverlayState[];
  forms: OverlayForm[];
};

type HandoffOverlaySummary = {
  totalFormsFound: number;
  totalPdfForms: number;
  mappedForms: number;
  partialMaps: number;
  renderedSamples: number;
  blockedForms: number;
  visualReviewPending: number;
  blockedXfa: number;
  blockedEncrypted: number;
  blockedUnreadable: number;
};

type StatePackSummary = {
  jurisdiction?: {
    code: string;
    name: string;
    slug: string;
    sourceFolders?: string[];
  };
  buildStatus?: string;
  products?: string[];
  pathways?: Array<{ id: string; label: string; output: string; reviewRequiredBeforeLive?: boolean }>;
  requiredUserInputs?: string[];
  officialFormCount?: number;
  customPleadingSupport?: { supported?: boolean; status?: string; notes?: string };
  guidanceOnlyFallback?: { supported?: boolean; label?: string; status?: string; notes?: string };
  reviewStatuses?: ReviewStatuses;
  disclaimerPresent?: boolean;
};

type FormsManifest = {
  officialFormCount?: number;
  resourcePacketCount?: number;
  officialForms?: Array<{ fileName: string; relativePath: string; sizeBytes?: number }>;
  resourcePackets?: Array<{ fileName: string; relativePath: string; classification?: string }>;
  overlay?: string;
  sourceFolders?: string[];
};

type QaReport = {
  pass?: boolean;
  failedChecks?: string[];
  checks?: Record<string, boolean>;
  pendingNotFailure?: Record<string, boolean | string>;
};

export type HandoffSummary = {
  totalJurisdictions: number;
  jurisdictionsStateBuilt: number;
  totalFormsFound: number;
  totalPdfForms: number;
  fullyMappedForms: number;
  partialFieldMaps: number;
  renderedSamples: number;
  blockedForms: number;
  visualReviewPending: number;
  counselReviewPending: number;
  qaReviewPending: number;
  sourceFreshnessPending: number;
  reviewArtifactRootPath: string;
  recommendedReviewOrder: Array<{ group: string; states: StatePreview[] }>;
};

const rootDir = process.cwd();
const buildManifestPath = path.join(rootDir, "data/rcap-all50/all-state-build-manifest.json");
const overlayManifestPath = path.join(rootDir, "data/rcap-all50/overlays/overlay-factory-manifest.json");
const reviewRoot = "tmp/review-inbox/all50";
const reviewRootPath = path.join(rootDir, reviewRoot);

const reviewArtifactFileNames = [
  "REVIEW-MANIFEST.md",
  "source-inventory.json",
  "state-pack-summary.json",
  "forms-manifest.json",
  "guidance-summary.md",
  "pleading-summary.md",
  "qa-report.json",
  "attorney-review-notes.md",
  "visual-review-notes.md",
  "next-actions.md"
];

export function getAll50StatePreviews(): StatePreview[] {
  const buildManifest = readJson<BuildManifest>(buildManifestPath);
  const overlayManifest = readJson<OverlayManifest>(overlayManifestPath);
  const overlayByCode = new Map(overlayManifest.states.map((state) => [state.jurisdictionCode, state]));
  const formsByCode = groupBy(overlayManifest.forms, (form) => form.jurisdictionCode);

  return buildManifest.states.map((build) => {
    const stateReviewRoot = path.join(reviewRoot, build.slug);
    const stateReviewPath = path.join(reviewRootPath, build.slug);
    const stateOverlay = overlayByCode.get(build.code) ?? emptyOverlayState(build);
    const forms = formsByCode.get(build.code) ?? [];
    const samples = listRelativeFiles(path.join(stateReviewPath, "sample-packets"), stateReviewRoot);
    const blockedArtifacts = listRelativeFiles(path.join(stateReviewPath, "blocked-forms"), stateReviewRoot);

    return {
      build,
      overlay: stateOverlay,
      forms,
      reviewRoot: stateReviewRoot,
      artifactFiles: reviewArtifactFileNames.map((fileName) => path.join(stateReviewRoot, fileName)),
      statePackSummary: readOptionalJson<StatePackSummary>(path.join(stateReviewPath, "state-pack-summary.json")),
      formsManifest: readOptionalJson<FormsManifest>(path.join(stateReviewPath, "forms-manifest.json")),
      qaReport: readOptionalJson<QaReport>(path.join(stateReviewPath, "qa-report.json")),
      samples,
      blockedArtifacts
    };
  });
}

export function getAll50StatePreview(slug: string): StatePreview | null {
  return getAll50StatePreviews().find((state) => state.build.slug === slug || state.build.code.toLowerCase() === slug.toLowerCase()) ?? null;
}

export function getAll50HandoffSummary(): HandoffSummary {
  const states = getAll50StatePreviews();
  const overlayManifest = readJson<OverlayManifest>(overlayManifestPath);
  const reviewStatuses = states.map((state) => state.build.reviewStatuses);

  return {
    totalJurisdictions: states.length,
    jurisdictionsStateBuilt: states.filter((state) => state.build.buildStatus === "state_built").length,
    totalFormsFound: overlayManifest.summary.totalFormsFound,
    totalPdfForms: overlayManifest.summary.totalPdfForms,
    fullyMappedForms: overlayManifest.summary.mappedForms,
    partialFieldMaps: overlayManifest.summary.partialMaps,
    renderedSamples: overlayManifest.summary.renderedSamples,
    blockedForms: overlayManifest.summary.blockedForms,
    visualReviewPending: overlayManifest.summary.visualReviewPending,
    counselReviewPending: reviewStatuses.filter((status) => status.counsel === "pending").length,
    qaReviewPending: reviewStatuses.filter((status) => status.qa === "pending").length,
    sourceFreshnessPending: reviewStatuses.filter((status) => status.sourceFreshness === "pending").length,
    reviewArtifactRootPath: reviewRoot,
    recommendedReviewOrder: buildRecommendedReviewOrder(states)
  };
}

export function getLegacyGeneratorStatus(state: StatePreview): string {
  if (state.build.code === "TX") return "Texas-Harris legacy fallback preserved; statewide build pending review";
  if (["MS", "IL", "DC", "PA"].includes(state.build.code)) return "legacy live generator preserved";
  return "not a legacy live generator";
}

export function getRendererModes(state: StatePreview): string[] {
  const modes = new Set<string>();
  for (const form of state.forms) {
    if (form.mapKind) modes.add(form.mapKind);
    if (form.status === "blocked") modes.add("blocked_artifact");
    if (form.kind === "html_form" || form.kind === "rtf_doc") modes.add("guidance_reference");
  }
  if (modes.size === 0) modes.add("guidance_packet");
  return [...modes].sort();
}

function buildRecommendedReviewOrder(states: StatePreview[]) {
  const used = new Set<string>();
  const take = (group: string, predicate: (state: StatePreview) => boolean) => {
    const matches = states.filter((state) => !used.has(state.build.code) && predicate(state));
    for (const state of matches) used.add(state.build.code);
    return { group, states: matches };
  };

  const legacyOrder = ["MS", "IL", "DC", "PA", "TX"];
  const launchPriority = ["GA", "MD", "MI", "CA", "NY", "FL"];

  return [
    take("Legacy live states first: MS, IL, DC, PA, TX-Harris", (state) => legacyOrder.includes(state.build.code)),
    take("High-volume / launch-priority states: GA, MD, MI, TX statewide, CA, NY, FL", (state) => launchPriority.includes(state.build.code)),
    take("States with blocked forms", (state) => state.overlay.blockedForms > 0),
    take("States with rendered overlay samples", (state) => state.overlay.renderedSamples > 0),
    take("Guidance-only or lower-complexity states", () => true)
  ];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readOptionalJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) return {} as T;
  return readJson<T>(filePath);
}

function listRelativeFiles(dirPath: string, stateReviewRoot: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(stateReviewRoot, path.basename(dirPath), entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function emptyOverlayState(state: BuildState): OverlayState {
  return {
    jurisdictionCode: state.code,
    stateName: state.name,
    totalForms: 0,
    pdfForms: 0,
    mappedForms: 0,
    partialMaps: 0,
    blockedForms: 0,
    renderedSamples: 0,
    visualReviewPending: 0,
    byClassification: {}
  };
}
