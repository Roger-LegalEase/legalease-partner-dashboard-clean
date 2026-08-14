// Reconciles lane D1's family source records against the canonical
// Expungement.ai + RCAP Master Library Edition 1 bundle manifest.
//
// Matching is by SHA-256 only; filenames are secondary (bundle rule).
// Each family is classified into exactly one lifecycle state:
//   binary_present_and_current   — hash found, retained packet/instruction/
//                                  support asset, no later revision of the
//                                  same document id in the bundle
//   binary_present_source_gated  — hash found under 05_SOURCE_GATED; never
//                                  runtime-selectable (library rule 6)
//   binary_present_obsolete      — hash found, but the bundle carries a
//                                  later revision of the same document id
//   true_hash_missing            — the pinned hash is in no bundle asset
//
// Source availability never authorizes production use: Edition 1 keeps
// generation_allowed = no and every jurisdiction runtime_disabled until the
// release gates pass, so every family keeps a runtime hold regardless of
// what this pass finds.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_MANIFEST = process.env.RCAP_BUNDLE_MANIFEST
  ?? "/tmp/claude-0/-home-user-legalease-partner-dashboard-clean/54ff2bf1-37ee-5073-8d13-dc21b63a0975/scratchpad/bundle/RCAP_SOURCE_BUNDLE_MANIFEST.json";
const OUT_ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const bundleRaw = fs.readFileSync(BUNDLE_MANIFEST);
const bundle = JSON.parse(bundleRaw.toString("utf8"));
const bundleManifestSha = crypto.createHash("sha256").update(bundleRaw).digest("hex");

const byHash = new Map(bundle.files.map((f) => [f.sha256, f]));

// Canonical name: {STATE}__{CLASS}__{DOCUMENT_ID}__{TITLE}__{REVISION}__{LANG}.ext
function parseCanonical(p) {
  const base = p.split("/").pop();
  const parts = base.replace(/\.[a-z0-9]+$/i, "").split("__");
  if (parts.length < 5) return null;
  return { state: parts[0], assetClass: parts[1], documentId: parts[2], title: parts[3],
    revision: parts[4], language: parts[5] ?? "EN", folder: p.split("/").slice(-2)[0] };
}
const parsedBundle = bundle.files.map((f) => ({ ...f, meta: parseCanonical(f.path) })).filter((f) => f.meta);

function laterRevisionExists(meta) {
  // Same asset class only: an INSTRUCTIONS sheet that shares a form's
  // document id is a companion document, not a later revision of the form.
  return parsedBundle.some((o) =>
    o.meta.state === meta.state && o.meta.documentId === meta.documentId &&
    o.meta.assetClass === meta.assetClass && o.meta.language === meta.language &&
    o.meta.revision > meta.revision);
}

// Loose document-id tokens from a legacy filename, for superseding candidates.
function candidateTokens(fileName) {
  const n = fileName.toLowerCase().replace(/\.[a-z0-9]+$/, "");
  const tokens = new Set();
  for (const m of n.matchAll(/([a-z]{1,6})[-_ ]?(\d{2,4}(?:[.\-]\d+)*)/g)) {
    tokens.add(`${m[1]}${m[2]}`.replace(/[^a-z0-9.]/g, ""));
    tokens.add(`${m[1]}-${m[2]}`.replace(/[^a-z0-9.-]/g, ""));
  }
  for (const m of n.matchAll(/\b(\d{3}-\d{5}[a-z]?)\b/g)) tokens.add(m[1]);
  return [...tokens];
}
function supersedingCandidates(state, fileName) {
  const tokens = candidateTokens(fileName);
  if (tokens.length === 0) return [];
  return parsedBundle
    .filter((f) => f.meta.state === state)
    .filter((f) => {
      const doc = f.meta.documentId.toLowerCase().replace(/[^a-z0-9.]/g, "");
      return tokens.some((t) => {
        const tt = t.replace(/[^a-z0-9.]/g, "");
        return tt.length >= 4 && (doc.includes(tt) || tt.includes(doc));
      });
    })
    .map((f) => ({ bundlePath: f.path, documentId: f.meta.documentId, revision: f.meta.revision,
      language: f.meta.language, assetClass: f.meta.assetClass, sha256: f.sha256 }));
}

const counts = { binary_present_and_current: 0, binary_present_source_gated: 0,
  binary_present_obsolete: 0, true_hash_missing: 0 };
const perJurisdiction = {};

for (const jurisdictionDir of fs.readdirSync(OUT_ROOT, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const jdir = path.join(OUT_ROOT, jurisdictionDir.name);
  for (const familyEntry of fs.readdirSync(jdir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const srPath = path.join(jdir, familyEntry.name, "source-record.json");
    if (!fs.existsSync(srPath)) continue;
    const record = readJson(srPath);
    const found = byHash.get(record.expectedSha256);

    let lifecycle, reconciliation;
    if (found) {
      const meta = parseCanonical(found.path);
      const sourceGated = found.path.includes("/05_SOURCE_GATED/") || meta?.assetClass === "SOURCE-GATED";
      const superseded = meta ? laterRevisionExists(meta) : false;
      lifecycle = superseded ? "binary_present_obsolete"
        : sourceGated ? "binary_present_source_gated"
        : "binary_present_and_current";
      reconciliation = {
        matchedBy: "sha256",
        bundlePath: found.path,
        bundleBytes: found.bytes,
        documentId: meta?.documentId ?? null,
        revision: meta?.revision ?? null,
        language: meta?.language ?? null,
        assetClass: meta?.assetClass ?? null,
        libraryFolder: meta?.folder ?? null,
        sourceGated,
        supersededByLaterRevisionInBundle: superseded,
        runtimeSelectable: sourceGated ? false : "gated_by_edition_1_release_gates"
      };
    } else {
      lifecycle = "true_hash_missing";
      const cands = supersedingCandidates(record.jurisdiction, record.fileName);
      reconciliation = {
        matchedBy: null,
        note: "The pinned hash appears in no Edition 1 asset. The pinned copy predates the curated library or was excluded as duplicate/obsolete/out-of-scope.",
        supersedingCandidatesByDocumentId: cands,
        actionRequired: cands.length > 0
          ? "Re-pin this family to the canonical Edition 1 asset above after legal-design confirmation that the document identity matches the track."
          : "Acquire the official asset; no Edition 1 asset carries a matching document id."
      };
    }

    record.bundleReconciliation = {
      schemaVersion: "rcap-bundle-reconciliation/v1",
      bundleEdition: "Expungement_AI_RCAP_Master_Library_Edition_1",
      bundleManifestSha256: bundleManifestSha,
      bundlePartition: bundle.partition,
      reconciledAt: "2026-08-12",
      lifecycleClassification: lifecycle,
      ...reconciliation
    };
    // The prior blocked disposition is superseded only where the hash was
    // actually found; holds survive regardless of availability.
    record.sourcePresenceInBundleManifest = Boolean(found);
    record.bundleBinaryBytesPresentInContainer = false;
    record.productionHolds = [
      "edition_1_generation_allowed_no",
      "jurisdiction_runtime_disabled",
      ...(lifecycle === "binary_present_source_gated" ? ["source_gated_never_runtime_selectable"] : []),
      ...(lifecycle === "binary_present_obsolete" ? ["superseded_revision_must_be_repinned"] : []),
      ...(lifecycle === "true_hash_missing" ? ["pinned_hash_absent_from_canonical_library"] : []),
      "f_independent_visual_review_required"
    ];
    fs.writeFileSync(srPath, JSON.stringify(record, null, 2) + "\n");

    counts[lifecycle] += 1;
    (perJurisdiction[record.jurisdiction] ??= []).push({ family: familyEntry.name, lifecycle });
  }

  // Refresh the jurisdiction summary with reconciliation outcomes.
  const summaryPath = path.join(jdir, "jurisdiction-summary.json");
  if (fs.existsSync(summaryPath)) {
    const summary = readJson(summaryPath);
    summary.bundleReconciliation = {
      bundleManifestSha256: bundleManifestSha,
      families: (perJurisdiction[summary.jurisdiction] ?? [])
    };
    summary.tracks = summary.tracks.map((t) => ({ ...t, terminal: false,
      readiness: "blocked_pending_bundle_binaries_and_release_gates" }));
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  }
}

console.log("bundle manifest sha256:", bundleManifestSha);
console.log(JSON.stringify(counts, null, 2));
