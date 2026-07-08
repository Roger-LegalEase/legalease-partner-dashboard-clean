// Shared derivation for Expungement.ai state landing content.
//
// Single source of truth for how a compiled jurisdiction profile
// (src/lib/rcap-engine/compiled/profiles/<CODE>-<slug>.json) is projected into the
// lightweight, copy-safe content object the state landing pages consume.
//
// Used by BOTH:
//   - scripts/build-state-landing-content.mjs  (writes the committed JSON the pages import)
//   - scripts/verify-expungement-state-landing-pages.mjs  (re-derives and asserts no drift)
//
// Keeping the logic here means the pages can never silently diverge from the engine
// profiles: the verifier re-runs this exact projection and compares byte-for-byte.

import fs from "node:fs";
import path from "node:path";

export const PROFILES_DIR = "src/lib/rcap-engine/compiled/profiles";

// Outcome-promise / marketing-risk stems. Any pathway label containing one of these is
// dropped from the consumer-facing highlights (a court/agency decides; we never imply
// eligibility). Mirrors the landing copy-safety avoid-list.
const BANNED_STEMS = ["qualif", "eligib", "elegib", "calific", "approved", "aprobad", "guarante", "garantiz"];

const MAX_HIGHLIGHTS = 4;
const MIN_HIGHLIGHTS = 2;

function containsBannedStem(value) {
  const lower = String(value).toLowerCase();
  return BANNED_STEMS.some((stem) => lower.includes(stem));
}

// Normalize the em/en dashes the compiled labels use so the JSON is stable and readable.
function tidyLabel(label) {
  return String(label)
    .replace(/\s+/g, " ")
    .replace(/\s+—\s+/g, " — ")
    .trim();
}

// Build the ordered, deduped, copy-safe pathway highlights for one profile. Primary source
// is `pathways[].label` (clean, statute-anchored); `terminology.pathwayLabels[]` is a
// secondary top-up only if the primary source is thin after filtering.
export function derivePathwayHighlights(profile) {
  const primary = (profile.pathways ?? []).map((p) => p?.label).filter(Boolean);
  const secondary = (profile.terminology?.pathwayLabels ?? []).filter(Boolean);

  const highlights = [];
  const seen = new Set();
  for (const raw of [...primary, ...secondary]) {
    const label = tidyLabel(raw);
    if (!label || containsBannedStem(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    highlights.push(label);
    if (highlights.length >= MAX_HIGHLIGHTS) break;
  }
  return highlights;
}

// Project a single compiled profile object into the committed content shape.
export function deriveStateContent(profile) {
  const jurisdiction = profile.jurisdiction ?? {};
  const terminology = profile.terminology ?? {};
  const allowedStateTerms = (terminology.allowedStateTerms ?? [])
    .filter((term) => typeof term === "string" && term.length > 0 && !containsBannedStem(term))
    .map((term) => term.trim());

  return {
    code: jurisdiction.code,
    name: jurisdiction.name,
    slug: jurisdiction.slug,
    primaryConsumerTerm: terminology.primaryConsumerTerm ?? "expungement",
    avoidUniversalExpungementLabel: Boolean(terminology.avoidUniversalExpungementLabel),
    allowedStateTerms,
    pathwayHighlights: derivePathwayHighlights(profile)
  };
}

// Read every compiled profile from disk and return the derived content, sorted by code.
export function deriveAllStateContent(root = process.cwd()) {
  const dir = path.join(root, PROFILES_DIR);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const content = [];
  const problems = [];
  for (const file of files) {
    const profile = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const derived = deriveStateContent(profile);
    if (!derived.code || !derived.name || !derived.slug) {
      problems.push(`${file}: profile is missing jurisdiction code/name/slug`);
      continue;
    }
    if (derived.pathwayHighlights.length < MIN_HIGHLIGHTS) {
      problems.push(
        `${file}: only ${derived.pathwayHighlights.length} copy-safe pathway highlight(s); need >= ${MIN_HIGHLIGHTS}`
      );
    }
    content.push(derived);
  }

  content.sort((a, b) => a.code.localeCompare(b.code));
  return { content, problems };
}

export { MIN_HIGHLIGHTS, MAX_HIGHLIGHTS, BANNED_STEMS };
