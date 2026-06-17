import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

export const ROOT_DIR = rootDir;
export const DEFAULT_NATIONWIDE_DIR = path.join(rootDir, "private/Nationwide Record Clearing");
export const ALL50_DATA_DIR = path.join(rootDir, "data/rcap-all50");
export const SOURCE_INVENTORY_PATH = path.join(ALL50_DATA_DIR, "nationwide-source-inventory.json");
export const BUILD_MANIFEST_PATH = path.join(ALL50_DATA_DIR, "all-state-build-manifest.json");
export const REVIEW_ARTIFACT_DIR = path.join(ALL50_DATA_DIR, "review-artifacts");

export const BUILD_STATUSES = [
  "not_started",
  "nationwide_resources_found",
  "resource_packet_ingested",
  "official_forms_ingested",
  "state_pack_built",
  "overlay_field_maps_drafted",
  "overlay_samples_rendered",
  "pleading_packet_rendered",
  "guidance_packet_rendered",
  "state_built",
  "qa_review_pending",
  "visual_review_pending",
  "counsel_review_pending",
  "approved_for_live",
  "live"
];

export const LOOP_DEFINITIONS = [
  {
    id: "nationwide_folder_ingestion_loop",
    purpose: "Scan Nationwide source folders and create a normalized source inventory for all states plus DC."
  },
  {
    id: "all_state_build_loop",
    purpose: "Maintain one build manifest entry per state/DC and advance ordinary build statuses without review blockers."
  },
  {
    id: "official_pdf_overlay_factory_loop",
    purpose: "Draft official PDF overlay/AcroForm/hybrid work items and sample outputs where source PDFs exist."
  },
  {
    id: "field_map_retry_loop",
    purpose: "Retry weak or missing field maps using AcroForm names, widgets, required fields, nearby text, and placeholders."
  },
  {
    id: "custom_pleading_factory_loop",
    purpose: "Draft custom pleading packets from Nationwide and coded state-pack materials when a pleading is appropriate."
  },
  {
    id: "guidance_packet_loop",
    purpose: "Generate a guidance fallback packet for every state/DC so every jurisdiction has reviewable output."
  },
  {
    id: "packet_render_qa_loop",
    purpose: "Run structural QA over generated packets and record failures as review/build metadata."
  },
  {
    id: "review_artifact_loop",
    purpose: "Create QA, visual-review, source-review, and attorney-review artifacts for post-build review."
  },
  {
    id: "integration_preview_loop",
    purpose: "Prepare internal preview records and artifact paths without exposing unapproved output to live users."
  },
  {
    id: "official_forms_watcher_loop",
    purpose: "Track official form file path, size, mtime, and hash metadata for future source-change detection."
  }
];

export const STATES_PLUS_DC = [
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
].map(([code, name]) => ({ code, name, slug: slugify(name) }));

export const LEGACY_GENERATOR_DIRS = [
  "src/lib/rcap/documents/mississippi",
  "src/lib/rcap/documents/illinois",
  "src/lib/rcap/documents/dc",
  "src/lib/rcap/documents/pennsylvania",
  "src/lib/rcap/documents/texas-harris"
];

const nameAliases = new Map([
  ["arkanas", "Arkansas"],
  ["arkanasa", "Arkansas"],
  ["massachusetts", "Massachusetts"],
  ["tennesee", "Tennessee"],
  ["virginia", "Virginia"],
  ["california", "California"],
  ["south carolina", "South Carolina"],
  ["district of columbia", "District of Columbia"],
  ["dc", "District of Columbia"]
]);

const extensionBuckets = new Map([
  [".pdf", "pdf"],
  [".rtf", "reference"],
  [".html", "reference"],
  [".htm", "reference"],
  [".doc", "document"],
  [".docx", "document"],
  [".txt", "reference"],
  [".md", "reference"],
  [".json", "data"]
]);

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeStateNameFromFolder(folderName) {
  const trimmed = folderName.trim();
  if (!trimmed.toLowerCase().startsWith("legalease ")) return null;
  const raw = trimmed.slice("LegalEase ".length).replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const canonicalKey = raw.toLowerCase();
  const alias = nameAliases.get(canonicalKey);
  if (alias) return alias;
  return raw
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(" ");
}

export function stateByName(name) {
  const normalized = name.toLowerCase();
  return STATES_PLUS_DC.find((state) => state.name.toLowerCase() === normalized) ?? null;
}

export function sourceDirFromEnv() {
  return path.resolve(process.env.OFFICIAL_FORMS_SOURCE_DIR || process.env.RCAP_NATIONWIDE_SOURCE_DIR || DEFAULT_NATIONWIDE_DIR);
}

export function listFilesRecursive(startDir) {
  const out = [];
  if (!fs.existsSync(startDir)) return out;
  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store" || entry.name.startsWith("._")) continue;
    const absolutePath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(absolutePath));
    } else if (entry.isFile()) {
      out.push(absolutePath);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function fileHash(absolutePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(absolutePath));
  return hash.digest("hex");
}

export function classifyFile(absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  return extensionBuckets.get(ext) || "other";
}

export function buildSourceInventory() {
  const sourceDir = sourceDirFromEnv();
  const sourceExists = fs.existsSync(sourceDir) && fs.statSync(sourceDir).isDirectory();
  const generatedAt = new Date().toISOString();
  const byCode = new Map(STATES_PLUS_DC.map((state) => [state.code, emptySourceState(state)]));
  const unknownFolders = [];

  if (sourceExists) {
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const normalizedName = normalizeStateNameFromFolder(entry.name);
      if (!normalizedName) {
        unknownFolders.push(entry.name);
        continue;
      }
      const state = stateByName(normalizedName);
      if (!state) {
        unknownFolders.push(entry.name);
        continue;
      }
      const absoluteFolder = path.join(sourceDir, entry.name);
      const files = listFilesRecursive(absoluteFolder).map((absolutePath) => {
        const stat = fs.statSync(absolutePath);
        return {
          relativePath: path.relative(sourceDir, absolutePath),
          fileName: path.basename(absolutePath),
          extension: path.extname(absolutePath).toLowerCase(),
          classification: classifyFile(absolutePath),
          sizeBytes: stat.size,
          mtime: stat.mtime.toISOString(),
          sha256: fileHash(absolutePath)
        };
      });
      const record = byCode.get(state.code);
      record.status = files.length > 0 ? "resources_found" : "missing";
      record.sourceFolders.push(entry.name);
      record.resourceCounts = countResources(files);
      record.files = files;
      record.missingReason = files.length > 0 ? null : "source_folder_empty";
    }
  }

  for (const record of byCode.values()) {
    if (record.status === "missing" && sourceExists) {
      record.missingReason = record.missingReason || "no_matching_nationwide_folder";
    }
  }

  return {
    schemaVersion: 1,
    generatedAt,
    sourceDir,
    sourceExists,
    expectedJurisdictionCount: STATES_PLUS_DC.length,
    unknownFolders,
    states: [...byCode.values()]
  };
}

export function buildManifest(inventory) {
  const generatedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    generatedAt,
    sourceInventoryPath: path.relative(ROOT_DIR, SOURCE_INVENTORY_PATH),
    expectedJurisdictionCount: STATES_PLUS_DC.length,
    buildStatuses: BUILD_STATUSES,
    loops: LOOP_DEFINITIONS,
    legacyGeneratorsPreserved: LEGACY_GENERATOR_DIRS,
    states: STATES_PLUS_DC.map((state) => {
      const source = inventory.states.find((entry) => entry.code === state.code) || emptySourceState(state);
      const hasResources = source.status === "resources_found";
      const hasOfficialForms = source.resourceCounts.pdf > 0;
      const hasReference = source.resourceCounts.reference > 0 || source.resourceCounts.document > 0 || source.resourceCounts.data > 0;
      const outputTypes = determineOutputTypes({ hasOfficialForms, hasReference });
      return {
        ...state,
        buildStatus: "state_built",
        statusHistory: buildStatusHistory({ hasResources, hasOfficialForms, outputTypes }),
        reviewStatuses: {
          qa: "pending",
          visual: hasOfficialForms ? "pending" : "not_applicable",
          counsel: "pending",
          sourceFreshness: "pending"
        },
        sourceInventory: {
          status: hasResources ? "nationwide_resources_found" : "missing_explicitly_marked",
          sourceFolders: source.sourceFolders,
          resourceCounts: source.resourceCounts,
          missingReason: source.missingReason
        },
        outputTypes,
        loops: LOOP_DEFINITIONS.map((loop) => ({
          id: loop.id,
          status: loopStatus(loop.id, { hasResources, hasOfficialForms, hasReference })
        })),
        artifacts: {
          guidancePacket: `data/rcap-all50/review-artifacts/states/${state.slug}.md`,
          reviewArtifact: `data/rcap-all50/review-artifacts/states/${state.slug}.md`,
          internalPreview: `data/rcap-all50/review-artifacts/states/${state.slug}.md`
        },
        liveRouting: {
          approvedForLive: false,
          live: false,
          note: "Build-first state output is internal review material only."
        }
      };
    })
  };
}

export function renderReviewArtifactIndex(manifest) {
  const rows = manifest.states
    .map(
      (state) =>
        `| ${state.code} | ${state.name} | ${state.buildStatus} | ${state.sourceInventory.status} | ${state.outputTypes.join(", ")} | [review](states/${state.slug}.md) |`
    )
    .join("\n");

  return `# RCAP All-50 Review Artifact Index

Generated: ${manifest.generatedAt}

These artifacts are build-review handoff materials. They are not counsel approval, visual approval, or live-routing approval.

| Code | State | Build Status | Source Status | Output Types | Artifact |
|---|---|---|---|---|---|
${rows}
`;
}

export function renderStateReviewArtifact(state) {
  return `# ${state.name} RCAP Build Review

Code: ${state.code}

Build status: ${state.buildStatus}

Source status: ${state.sourceInventory.status}

Source folders: ${state.sourceInventory.sourceFolders.length > 0 ? state.sourceInventory.sourceFolders.join(", ") : "none"}

Resource counts:

- PDFs: ${state.sourceInventory.resourceCounts.pdf}
- References: ${state.sourceInventory.resourceCounts.reference}
- Documents: ${state.sourceInventory.resourceCounts.document}
- Data files: ${state.sourceInventory.resourceCounts.data}
- Other: ${state.sourceInventory.resourceCounts.other}

Output types:

${state.outputTypes.map((type) => `- ${type}`).join("\n")}

Review statuses:

- QA: ${state.reviewStatuses.qa}
- Visual: ${state.reviewStatuses.visual}
- Counsel: ${state.reviewStatuses.counsel}
- Source freshness: ${state.reviewStatuses.sourceFreshness}

Loop status:

${state.loops.map((loop) => `- ${loop.id}: ${loop.status}`).join("\n")}

Reviewer notes:

- Build-first artifact. Not approved for live use.
- Guidance fallback is present for internal review.
- Visual, counsel, and source freshness reviews are tracked separately from build status.
`;
}

export function changedFilesFromGit() {
  try {
    const output = execFileSync("git", ["diff", "--name-only", "HEAD"], {
      cwd: ROOT_DIR,
      encoding: "utf8"
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function emptySourceState(state) {
  return {
    ...state,
    status: "missing",
    sourceFolders: [],
    resourceCounts: {
      pdf: 0,
      reference: 0,
      document: 0,
      data: 0,
      other: 0,
      total: 0
    },
    files: [],
    missingReason: null
  };
}

function countResources(files) {
  const counts = {
    pdf: 0,
    reference: 0,
    document: 0,
    data: 0,
    other: 0,
    total: files.length
  };
  for (const file of files) {
    if (counts[file.classification] === undefined) {
      counts.other += 1;
    } else {
      counts[file.classification] += 1;
    }
  }
  return counts;
}

function determineOutputTypes({ hasOfficialForms, hasReference }) {
  const outputTypes = ["guidance_packet"];
  if (hasOfficialForms) outputTypes.push("official_pdf_overlay_draft");
  if (hasReference) outputTypes.push("custom_pleading_or_state_pack_draft");
  return outputTypes;
}

function loopStatus(loopId, { hasResources, hasOfficialForms, hasReference }) {
  if (loopId === "nationwide_folder_ingestion_loop") return hasResources ? "completed" : "completed_missing_marked";
  if (loopId === "all_state_build_loop") return "completed";
  if (loopId === "official_pdf_overlay_factory_loop") return hasOfficialForms ? "draft_ready" : "not_applicable_no_pdf";
  if (loopId === "field_map_retry_loop") return hasOfficialForms ? "pending_retry_artifacts" : "not_applicable_no_pdf";
  if (loopId === "custom_pleading_factory_loop") return hasReference ? "draft_ready" : "fallback_only";
  if (loopId === "guidance_packet_loop") return "completed";
  if (loopId === "packet_render_qa_loop") return "pending_review";
  if (loopId === "review_artifact_loop") return "completed";
  if (loopId === "integration_preview_loop") return "internal_preview_ready";
  if (loopId === "official_forms_watcher_loop") return hasResources ? "source_tracked" : "missing_marked";
  return "not_started";
}

function buildStatusHistory({ hasResources, hasOfficialForms, outputTypes }) {
  const history = ["not_started"];
  if (hasResources) history.push("nationwide_resources_found", "resource_packet_ingested");
  if (hasOfficialForms) history.push("official_forms_ingested", "overlay_field_maps_drafted", "overlay_samples_rendered");
  history.push("state_pack_built");
  if (outputTypes.includes("custom_pleading_or_state_pack_draft")) history.push("pleading_packet_rendered");
  history.push("guidance_packet_rendered", "state_built");
  return history;
}
