#!/usr/bin/env node
// Does the platform actually use this asset, anywhere?
//
//   node scripts/generate-rcap-pdf-retirement-determination.mjs
//   node scripts/generate-rcap-pdf-retirement-determination.mjs --check
//
// Retirement is only honest if "nothing uses it" was checked rather than
// assumed, and "nothing" has to mean every surface that could reach the asset,
// not just the one that was convenient to read. An asset the register calls
// orphaned because no ledger track names it may still be named by a packet
// component, a composed route, a guidance packet, an overlay manifest, a
// runtime field-map draft, or application source.
//
// So each asset is probed against all of them, by document id AND by normalized
// form number, because the corpus keys the same form both ways -- a filename in
// one place and a form number in another, which is exactly how a dependency
// gets missed.
//
// An asset with any hit is RETAINED and must be remediated like every other.
// Only an asset with no hit anywhere is a retirement candidate, and even then
// this file records the evidence rather than performing the removal: what it
// produces is the determination, and the determination is reviewable.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json");
const checkOnly = process.argv.includes("--check");

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

/** A form identifier reduced to comparable characters: CR-65, cr_65, CR65 fold. */
const normalize = (value) => String(value ?? "")
  .replace(/\.(pdf|html?|docx?)$/i, "")
  .replace(/[-_\s.]/g, "")
  .toUpperCase();

// ---- every surface that could reach an asset --------------------------------
// Each probe returns the set of normalized identifiers it names. A surface that
// cannot be read contributes nothing AND is recorded as unread, because a probe
// that silently returns empty is indistinguishable from a surface with no
// dependencies, and only one of those justifies retiring anything.
const surfaces = [];
const unreadable = [];

// A surface is one of two things, and the difference decides what a hit means.
//
// An OPERATIONAL surface can reach the asset: route it, bind it to a track,
// put it in a packet, feed it to a renderer. A hit there is a dependency, and
// the asset is retained until the owner of that surface removes it.
//
// A CORPUS_CENSUS surface only records that the bytes exist. It emits a row per
// file found in a source folder, and it would emit that row whether or not
// anything used the file. A hit there is not a use, and it cannot be cleared by
// regenerating -- the row goes away only if the historical bytes are deleted,
// which retirement explicitly refuses to do. Counting a census as a dependency
// makes retirement unreachable for exactly the assets nothing uses, which is
// backwards.
//
// Only overlay_factory_manifest is classified as a census, and only because
// scripts/verify-rcap-corpus-census-surface.mjs establishes it on four
// independent legs. If that verifier stops passing, the classification is
// withdrawn and its assets return to retained.
const OPERATIONAL = "operational";
const CORPUS_CENSUS = "corpus_census";

function addSurface(name, description, runtime, collect, surfaceClass = OPERATIONAL) {
  try {
    const ids = collect();
    surfaces.push({ name, description, runtime, surfaceClass, identifierCount: ids.size, ids });
  } catch (error) {
    unreadable.push({ name, reason: String(error.message).slice(0, 200) });
  }
}

/** Every string in a JSON tree, so an identifier cannot hide in an unexpected key. */
function stringsIn(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) stringsIn(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) stringsIn(item, out);
  return out;
}

function idsFromTree(dir, filter = () => true) {
  const ids = new Set();
  const walk = (current) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (filter(full)) {
        for (const text of stringsIn(readJson(full, {}))) ids.add(normalize(text));
        ids.add(normalize(entry.name));
      }
    }
  };
  walk(dir);
  return ids;
}

// The pinned legal design: which forms a packet component actually requires.
/**
 * The pinned bytes of a registry file the ledger names, whatever the clone depth.
 *
 * The pin is a commit plus a sha256 per file. Reading it out of the commit is
 * the direct route, but a shallow clone does not have that commit, and the read
 * then fails in a way that reads as "this surface has no dependencies" -- the
 * one failure this determination cannot tolerate. So a clone without the commit
 * falls back to the working-tree file and requires its hash to equal the pin.
 *
 * That is the same bytes by definition: the pin is a content hash, so a file
 * matching it is the pinned content no matter which object store it came from.
 * A file that does not match is refused rather than used, and the surface goes
 * to unreadable, which halts the determination exactly as before.
 */
function pinnedRegistryBytes(ledger, relativePath) {
  const { commit, sha256 } = ledger.registrySource;
  try {
    return { text: execFileSync("git", ["show", `${commit}:${relativePath}`],
      { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }), readVia: `git show ${commit}` };
  } catch (gitError) {
    const expected = sha256?.[relativePath];
    if (!expected) throw new Error(`${relativePath} is not hash-pinned by the ledger, and ${commit} is not in this clone: ${gitError.message}`);
    const file = path.join(rootDir, relativePath);
    if (!fs.existsSync(file)) throw new Error(`${relativePath} is absent from this clone and ${commit} is not in it either`);
    const text = fs.readFileSync(file, "utf8");
    const actual = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    if (actual !== expected) {
      throw new Error(`${relativePath} does not match the pinned sha256 (expected ${expected}, found ${actual}); the working tree is not the pinned edition`);
    }
    return { text, readVia: `working tree, sha256-verified against the pin ${expected}` };
  }
}

const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
let legalDesignRegistryPin = null;

addSurface("legal_design_registry", "The byte-pinned legal-design track registry's packet components.", false, () => {
  const ledger = readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"));
  const { text: raw } = pinnedRegistryBytes(ledger, REGISTRY_PATH);
  legalDesignRegistryPin = {
    path: REGISTRY_PATH,
    commit: ledger.registrySource.commit,
    sha256: ledger.registrySource.sha256?.[REGISTRY_PATH] ?? null
  };
  const ids = new Set();
  for (const track of JSON.parse(raw).tracks) {
    for (const component of track.packetSet?.components ?? []) {
      if (component.officialFormId) ids.add(normalize(component.officialFormId));
      // The component also names the exact file it is served from, and the
      // corpus keys several assets by that filename rather than by the form id
      // -- KY 496.2.pdf is component AOC-496.2, and those two do not normalize
      // to the same string. Reading only the form id made a required packet
      // component look like an asset nothing referenced.
      if (component.officialSourceUrl) {
        try {
          const basename = decodeURIComponent(new URL(component.officialSourceUrl).pathname.split("/").pop() ?? "");
          if (basename) ids.add(normalize(basename));
        } catch { /* a component whose url will not parse names no file */ }
      }
    }
  }
  return ids;
});

addSurface("track_terminalization_ledger", "Tracks and their required family ids.", false,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"), {})).map(normalize)));

addSurface("d_track_queue", "The D queue's committed family relationships.", false,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-all50/review-artifacts/d-track-queue.json"), {})).map(normalize)));

addSurface("composed_routes", "Composed route definitions and their components.", true,
  () => idsFromTree(path.join(rootDir, "data/rcap-all50/composed-routes"), (f) => f.endsWith(".json")));

addSurface("guidance_packets", "Guidance packets the runtime registry loads.", true,
  () => idsFromTree(path.join(rootDir, "data/rcap-all50/guidance-packets"), (f) => f.endsWith(".json")));

addSurface("terminalization_treatments", "Terminal treatments the runtime registry loads.", true,
  () => idsFromTree(path.join(rootDir, "data/rcap-all50/terminalization-treatments"), (f) => f.endsWith(".json")));

// A census of the source corpus, not a dependency on it. See CORPUS_CENSUS
// above and scripts/verify-rcap-corpus-census-surface.mjs for the proof.
addSurface("overlay_factory_manifest", "A census of the source corpus: one row per file found, read only by the internal-admin preview.", true,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-all50/overlays/overlay-factory-manifest.json"), {})).map(normalize)),
  CORPUS_CENSUS);

addSurface("all_state_build_manifest", "The all-state build manifest the internal preview reads.", true,
  () => new Set(stringsIn(readJson(path.join(rootDir, "data/rcap-all50/all-state-build-manifest.json"), {})).map(normalize)));

// A genuine runtime input: src/lib/record-clearing/official-pdf-shadow-batch.ts
// reads this directory at run time, so a file here is an application input and
// removing one changes application behaviour.
addSurface("field_map_drafts", "Field-map drafts read at runtime by official-pdf-shadow-batch.ts.", true, () => {
  const dir = path.join(rootDir, "docs/record-clearing/field-map-drafts");
  const ids = new Set();
  if (!fs.existsSync(dir)) return ids;
  for (const entry of fs.readdirSync(dir)) ids.add(normalize(entry));
  return ids;
});

// Anything under src/ that names an asset, by whatever key it uses to name it.
//
// This probe used to read only .ts/.tsx/.mjs/.js and only match identifiers
// shaped `letters-digit...`, and both limits hid real dependencies:
//
//   - src/lib/rcap-engine/compiled/profiles/*.json are the compiled engine
//     profiles. profile-registry.ts loads them from disk at run time and
//     packet-planner.ts turns their formCandidates into the sourceFormIds of a
//     packet plan. They were never opened, because they are .json.
//   - The identifier shape cannot produce `7_Nolle_Prosequi_..._2020_F.pdf`,
//     `496.2.pdf`, `cr287_1.pdf`, `forms.html` or `200-00131`, so even in the
//     files it did read, an asset named by filename was invisible.
//
// Together those two holes made assets that a paid pathway plans around report
// zero use sites. So this now reads every source file under src/, JSON
// included, and collects three kinds of name: the form-number shape as before,
// any filename with a document extension, and any sha256. The sha256 is the
// strongest of the three -- it is the asset's own byte identity, so it cannot
// collide with a different form the way a normalized form number can.
addSurface("application_source", "Identifiers, filenames and source hashes named literally in src/, including the compiled engine profiles.", true, () => {
  const ids = new Set();
  const add = (value) => { const id = normalize(value); if (id.length >= 3) ids.add(id); };
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx|mjs|js|json)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      // The form-number shape this probe has always matched.
      for (const match of text.match(/[A-Za-z]{2,8}-\d[\dA-Za-z.-]*/g) ?? []) add(match);
      // A filename carrying a document extension, however it is punctuated.
      for (const match of text.match(/[^"'\s/\\]+\.(?:pdf|html?|docx?|rtf)/gi) ?? []) add(match);
      // A source hash: exact byte identity, immune to form-number collisions.
      for (const match of text.match(/\b[0-9a-f]{64}\b/g) ?? []) add(match);
    }
  };
  walk(path.join(rootDir, "src"));
  return ids;
});

// ---- probe every asset ------------------------------------------------------
// Read from the family directories rather than from the register, and include
// families already carrying a retirement marker. The register's denominator
// shrinks as assets retire, so deriving this from the register would make the
// determination self-confirming: it could never re-check a retirement it had
// already caused. Scanning the directories keeps it verifiable forever, and
// keeps a retired asset re-testable the day something starts using it again.
function everyFamily() {
  const out = [];
  for (const stateDir of fs.readdirSync(OVERLAY_DIR).sort()) {
    const statePath = path.join(OVERLAY_DIR, stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath).sort()) {
      const familyPath = path.join(statePath, familyDir);
      const record = readJson(path.join(familyPath, "source-record.json"));
      if (!record) continue;
      out.push({ familyPath, familyDir, jurisdiction: String(record.jurisdiction ?? stateDir).toUpperCase(), record });
    }
  }
  return out;
}

// One row per asset identity, matching how the register deduplicates: two
// families resolving to the same binary are one asset.
const byIdentity = new Map();
for (const family of everyFamily()) {
  const documentId = family.record.documentId ?? family.record.fileName ?? family.familyDir;
  const sha = family.record.sha256 ?? family.record.expectedSha256 ?? null;
  const identity = `${family.jurisdiction}|${documentId}|${sha ?? "no-sha"}`;
  const row = byIdentity.get(identity) ?? {
    assetId: identity, jurisdiction: family.jurisdiction, formNumber: documentId,
    formFamilyIds: [], alreadyRetired: false
  };
  row.formFamilyIds.push(`${family.jurisdiction}:${family.familyDir}`);
  if (fs.existsSync(path.join(family.familyPath, "retirement.json"))) row.alreadyRetired = true;
  byIdentity.set(identity, row);
}

// Track bindings, read from the same committed relationships the register uses.
const queueTracks = new Map();
for (const track of (readJson(path.join(rootDir, "data/rcap-all50/review-artifacts/d-track-queue.json"), { tracks: [] }).tracks ?? [])) {
  for (const familyId of track.requiredFamilyIds ?? []) {
    queueTracks.set(familyId, [...(queueTracks.get(familyId) ?? []), track.trackId]);
  }
}

// The surfaces differ in what a reference to them costs to remove.
const SURFACE_REMOVAL = {
  legal_design_registry: "a legal-design decision: the byte-pinned registry names this asset as a packet component, so retiring it changes what a packet contains",
  track_terminalization_ledger: "a track decision: a terminalization track requires this family",
  d_track_queue: "a D-queue decision: a committed family relationship names it",
  composed_routes: "a route decision: a composed route lists it as a component",
  guidance_packets: "a participant-facing decision: a guidance packet the runtime registry loads names it",
  terminalization_treatments: "a participant-facing decision: a terminal treatment the runtime registry loads names it",
  overlay_factory_manifest: "nothing: this is a census of the source corpus, not a use of the asset. It emits a row per file present and would emit that row whether or not anything used the file, so it never blocks a retirement. It appears here only so the message is correct if scripts/verify-rcap-corpus-census-surface.mjs ever stops passing and the classification is withdrawn",
  all_state_build_manifest: "regeneration of the all-state build manifest the internal preview reads",
  field_map_drafts: "removal of a field-map draft that src/lib/record-clearing/official-pdf-shadow-batch.ts reads at run time",
  application_source: "an application-source change: the identifier appears literally in src/, which this lane does not modify"
};

/**
 * What would have to change for a retained asset to become retirable.
 *
 * A retention that does not say what is holding it cannot be acted on, and
 * "retained" then reads as a permanent state rather than a blocked one.
 */
function retirementBlockedBy(useSites) {
  if (useSites.length === 0) return {};
  const surfaces = [...new Set(useSites.map((h) => h.surface))];
  return {
    retirementBlockedBy: surfaces.map((surface) => ({
      surface,
      removalRequires: SURFACE_REMOVAL[surface] ?? "a decision by the owner of that surface"
    }))
  };
}

// The words a family slug appends to a form number to say what the document is
// and what language it is in. Surveyed from the family directories themselves,
// not guessed: every trailing run in the corpus decomposes into these tokens
// plus, sometimes, a form-variant letter.
//
// A variant letter is deliberately NOT in here. `A` in CC-6-11.2A is part of
// the form number -- CC-6-11.2 is a different Nebraska form -- so stripping it
// would make one form's registry binding look like another form's dependency.
const DOCUMENT_ROLE_SUFFIXES = [
  "INSTRUCTIONS", "INSTRUCTION", "INST", "SOURCEGATED", "SUPPORT", "FORMS", "FORM"
];
const LANGUAGE_SUFFIXES = ["EN", "ES", "VI"];
const STRIPPABLE_SUFFIXES = [...DOCUMENT_ROLE_SUFFIXES, ...LANGUAGE_SUFFIXES];

/**
 * The bare form number inside an identifier that carries document-role suffixes.
 *
 * A surface names the form: `CC-1473`. The corpus names the file that carries
 * it: `cc1473inst.pdf`, the instructions for that same form. Normalized those
 * are CC1473 and CC1473INST, which do not compare equal, so a registry binding
 * on the form is invisible to a probe that only knows the filename -- and the
 * asset reads as depended on by nothing. That is exactly how VA CC-1473 came
 * out of this probe with zero use sites while the byte-pinned registry named it
 * as the required primary filing of va_exp_nonconviction.
 *
 * So role and language words are peeled off the end, one at a time:
 * CC1473INST -> CC1473, and CC1201AFORMEN -> CC1201AFORM -> CC1201A, which then
 * stops because `A` is a form variant rather than a role word.
 *
 * Peeling only ever ADDS identifiers, so it can only add hits, so it can only
 * move an asset from retirement candidate to retained. Where this errs it errs
 * toward keeping the asset, which is the direction a retirement probe should
 * fail in.
 */
function formNumberStems(identifier) {
  const stems = [];
  let stem = identifier;
  for (let guard = 0; guard < 8; guard += 1) {
    const suffix = STRIPPABLE_SUFFIXES.find((candidate) => stem.endsWith(candidate) && stem.length > candidate.length);
    if (!suffix) break;
    const trimmed = stem.slice(0, -suffix.length);
    // A stem still has to look like a form number, or it is not one.
    if (trimmed.length < 3 || !/\d/.test(trimmed)) break;
    stems.push(trimmed);
    stem = trimmed;
  }
  return stems;
}

const assets = [...byIdentity.values()].map((row) => {
  const affectedTrackIds = [...new Set(row.formFamilyIds.flatMap((id) => queueTracks.get(id) ?? []))].sort();
  // Both keys, because the corpus names the same form both ways.
  const literal = [
    normalize(row.formNumber),
    ...row.formFamilyIds.map((id) => normalize(id.split(":")[1] ?? id))
  ];
  // The asset's own source hash, when one is recorded. A surface that names the
  // bytes rather than the form number -- a compiled engine profile's
  // formCandidates, say -- is naming exactly this asset and nothing else, so
  // this is the one identifier that cannot match the wrong form.
  const sha = row.assetId.split("|")[2];
  const shaIdentifier = /^[0-9a-f]{64}$/.test(sha ?? "") ? [normalize(sha)] : [];
  const candidates = [...new Set([...literal, ...literal.flatMap(formNumberStems), ...shaIdentifier])]
    .filter((c) => c.length >= 3);

  const hits = [];
  for (const surface of surfaces) {
    const matched = candidates.filter((c) => surface.ids.has(c));
    if (matched.length > 0) {
      hits.push({ surface: surface.name, runtime: surface.runtime, surfaceClass: surface.surfaceClass, matchedIdentifiers: matched });
    }
  }

  // A use site is a hit on a surface that could reach the asset. A census
  // appearance is a hit on a surface that only records the bytes exist. Both
  // are kept -- nothing is dropped from the evidence -- but only the first kind
  // is a reason to retain, because only the first kind can be cleared without
  // deleting the historical source.
  const useSites = hits.filter((h) => h.surfaceClass !== CORPUS_CENSUS);
  const censusAppearances = hits.filter((h) => h.surfaceClass === CORPUS_CENSUS);

  const usedByPlatform = useSites.length > 0 || affectedTrackIds.length > 0;
  const usedAtRuntime = useSites.some((h) => h.runtime);
  const heldOnlyByTheCorpusCensus = useSites.length === 0 && affectedTrackIds.length === 0 && censusAppearances.length > 0;

  return {
    jurisdiction: row.jurisdiction,
    formNumber: row.formNumber,
    assetId: row.assetId,
    familyIds: row.formFamilyIds.sort(),
    alreadyRetired: row.alreadyRetired,
    activeTrackStatus: affectedTrackIds.length > 0 ? "active_track" : "no_track_binding",
    affectedTrackIds,
    probedIdentifiers: candidates,
    usedByPlatform,
    usedAtRuntime,
    useSites,
    censusAppearances,
    heldOnlyByTheCorpusCensus,
    determination: usedByPlatform ? "retain_and_remediate" : "retirement_candidate",
    // Recorded, never inferred: an asset that no surface names still had to be
    // checked against every surface for that to mean anything.
    determinationBasis: usedByPlatform
      ? `Named by ${useSites.length} operational surface(s): ${useSites.map((h) => h.surface).join(", ")}.`
      : heldOnlyByTheCorpusCensus
        ? `No operational surface names it. Probed ${surfaces.length} surface(s) against ${candidates.length} identifier(s); the only hit is the corpus census (${censusAppearances.map((h) => h.surface).join(", ")}), which records that the bytes exist rather than that anything uses them.`
        : `No surface names it. Probed ${surfaces.length} surface(s) against ${candidates.length} identifier(s).`,
    // What would actually have to change for this asset to be retirable. A
    // retention that does not say what is holding it cannot be acted on, and
    // "retained" then reads as a permanent state rather than a blocked one.
    ...retirementBlockedBy(useSites)
  };
});

const retainable = assets.filter((a) => a.determination === "retain_and_remediate");
const retirable = assets.filter((a) => a.determination === "retirement_candidate");

const totals = {
  assetsProbed: assets.length,
  surfacesProbed: surfaces.length,
  surfacesUnreadable: unreadable.length,
  retainAndRemediate: retainable.length,
  retirementCandidates: retirable.length,
  retirementCandidatesHeldOnlyByTheCorpusCensus: retirable.filter((a) => a.heldOnlyByTheCorpusCensus).length,
  retainedBecauseOfARuntimeSurface: assets.filter((a) => a.usedAtRuntime).length,
  assetsWithNoTrackBinding: assets.filter((a) => a.activeTrackStatus === "no_track_binding").length,
  assetsWithNoTrackBindingRetainedAnyway: assets.filter((a) => a.activeTrackStatus === "no_track_binding" && a.usedByPlatform).length,
  alreadyCarryingARetirementMarker: assets.filter((a) => a.alreadyRetired).length
};

const payload = {
  schemaVersion: "rcap-pdf-retirement-determination/v1",
  generatedBy: "scripts/generate-rcap-pdf-retirement-determination.mjs",
  purpose: "Whether the platform uses each problematic asset anywhere, probed across every surface that could reach it, so retirement rests on a checked absence rather than an assumed one.",
  rule: "An asset named by ANY operational surface is retained and must be remediated. Only an asset no operational surface names is a retirement candidate. Difficulty of repair is never a reason to retire.",
  surfaceClasses: {
    operational: "A surface that can reach the asset: route it, bind it to a track, put it in a packet, feed it to a renderer. A hit here is a dependency and retains the asset.",
    corpus_census: "A surface that only records that the bytes exist, emitting a row per file found in the source folder whether or not anything uses it. A hit here is not a use. It cannot be cleared by regenerating -- the row goes away only if the historical bytes are deleted, and retirement deletes nothing -- so counting it as a dependency would make retirement unreachable for precisely the assets nothing uses.",
    proof: "scripts/verify-rcap-corpus-census-surface.mjs establishes the census classification on four independent legs and fails if any stops holding.",
    proofRecord: "data/rcap-all50/pdf-retirement-evidence/corpus-census-surface-proof.json"
  },
  // The pin, not the route to it. Whether the bytes came out of the commit or
  // out of a hash-verified working tree is a property of the clone, and
  // recording it here would make this artifact differ between clones that read
  // byte-identical input.
  legalDesignRegistryPin,
  surfacesProbed: surfaces.map(({ name, description, runtime, surfaceClass, identifierCount }) => ({ name, description, runtime, surfaceClass, identifierCount })),
  surfacesUnreadable: unreadable,
  totals,
  assets
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

if (unreadable.length > 0) {
  console.error(`FAIL retirement determination — ${unreadable.length} surface(s) could not be read; an unchecked surface cannot support a retirement`);
  for (const row of unreadable) console.error(`  ${row.name}: ${row.reason}`);
  process.exit(1);
}

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`FAIL retirement determination — ${path.relative(rootDir, OUT)} is stale; re-run scripts/generate-rcap-pdf-retirement-determination.mjs`);
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, json);
}

console.log(`OK retirement determination — ${totals.assetsProbed} assets probed across ${totals.surfacesProbed} surfaces; retain ${totals.retainAndRemediate}, retirement candidates ${totals.retirementCandidates}`);
