#!/usr/bin/env node
// Which numbered session owns which existing assignment.
//
//   node scripts/generate-rcap-gate-b-session-dispatch.mjs
//   node scripts/generate-rcap-gate-b-session-dispatch.mjs --check
//
// A map, not a new architecture. The eleven assignment files already carry the
// asset ids, family ids, allowed and prohibited paths; this names the session
// that owns each and pins the remote tip that session is continuing from, so a
// lane resuming work knows whether the base moved underneath it.
//
// Nothing here may alter assignment membership. The generator reads the
// assignments and fails if a mapped file is missing, if two sessions claim one
// assignment, or if the assignment set has drifted from the canonical
// denominator — a dispatch record that disagrees with the queue would send a
// session after assets that are no longer retained.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const ASSIGNMENTS = "data/rcap-all50/gate-b-assignments";
const LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const OUT = `${ASSIGNMENTS}/session-dispatch.json`;
const OUT_MD = "docs/record-clearing/gate-b-session-dispatch.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const readJsonOrNull = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
const fail = (m) => { console.error(`FAIL session dispatch — ${m}`); process.exit(1); };
const git = (...a) => { try { return execFileSync("git", a, { cwd: rootDir, stdio: ["pipe", "pipe", "ignore"] }).toString().trim(); } catch { return null; } };

const ledger = readJson(LEDGER);
const queue = readJson(QUEUE);

/** The remote tip each active lane is continuing from. */
const LANE_BRANCHES = {
  7: "claude/rcap-gate-b-family-rerender-1-cac37584",
  8: "claude/rcap-gate-b-family-rerender-2-cac37584",
  6: "claude/rcap-gate-b-shared-hotfix-after-lane1",
  9: "claude/rcap-gate-b-sidecars-lane2-batch01-corrected",
  10: "claude/rcap-gate-b-visual-lane2-batch01-clean",
  11: "claude/official-pdf-urls-hash-f9s8u9",
  12: "claude/landing-page-resolution-g4zrto",
  13: "claude/rcap-retirement-corpus-guard"
};

const MAP = [
  { session: 1, role: "captain / integration", assignment: null },
  { session: 2, role: "independent review", assignment: "reviewer-a.json" },
  { session: 3, role: "independent review", assignment: "reviewer-b.json" },
  { session: 4, role: "independent review", assignment: "reviewer-c.json" },
  { session: 5, role: "independent review", assignment: "reviewer-d.json" },
  { session: 6, role: "shared code and source-pack factory", assignment: null },
  { session: 7, role: "family rerender", assignment: "family-rerender-1.json" },
  { session: 8, role: "family rerender", assignment: "family-rerender-2.json" },
  { session: 9, role: "provenance sidecars", assignment: "evidence-sidecars.json" },
  { session: 10, role: "all-page visual evidence", assignment: "evidence-visual.json" },
  { session: 11, role: "source acquisition", assignment: "source-direct.json" },
  { session: 12, role: "source resolution", assignment: "source-resolution.json" },
  { session: 13, role: "retirement and repoint", assignment: "retirement-repoint.json" }
];

const claimed = new Map();
const sessions = MAP.map((entry) => {
  let assetIds = [];
  let familyIds = [];
  let allowedPaths = [];
  let prohibitedPaths = [];
  if (entry.assignment) {
    const rel = `${ASSIGNMENTS}/${entry.assignment}`;
    if (!fs.existsSync(abs(rel))) fail(`Session ${entry.session} is mapped to ${entry.assignment}, which does not exist`);
    if (claimed.has(entry.assignment)) {
      fail(`${entry.assignment} is claimed by Sessions ${claimed.get(entry.assignment)} and ${entry.session}`);
    }
    claimed.set(entry.assignment, entry.session);
    const body = readJson(rel);
    assetIds = body.assetIds ?? [];
    familyIds = body.familyIds ?? [];
    allowedPaths = body.allowedPaths ?? [];
    prohibitedPaths = body.prohibitedPaths ?? [];
  }
  const branch = LANE_BRANCHES[entry.session] ?? null;
  const tip = branch ? git("rev-parse", `origin/${branch}`) : null;
  if (branch && !tip) fail(`Session ${entry.session}: origin/${branch} is not reachable in this clone`);
  return {
    session: entry.session,
    role: entry.role,
    assignment: entry.assignment,
    currentRemoteBranch: branch,
    currentRemoteTip: tip,
    currentRemoteTipSubject: tip ? git("log", "-1", "--format=%s", tip) : null,
    assetCount: assetIds.length,
    assetIds,
    familyIds,
    allowedPaths,
    prohibitedPaths
  };
});

// Membership is read, never rewritten. If the assignments no longer cover the
// canonical denominator, the dispatch record would be pointing sessions at a
// set the queue has moved past.
const assignedAssets = sessions.filter((s) => s.assignment && !s.assignment.startsWith("evidence-"))
  .flatMap((s) => s.assetIds);
const unique = new Set(assignedAssets);
if (unique.size !== queue.totals.queued) {
  fail(`the assignments cover ${unique.size} unique assets and the queue holds ${queue.totals.queued}`);
}
if (unique.size !== assignedAssets.length) fail("an asset is claimed by two primary assignments");

const pathOwner = new Map();
let pathOverlaps = 0;
for (const s of sessions) {
  for (const p of s.allowedPaths) {
    if (p.includes("<own-batch>")) continue;
    if (pathOwner.has(p) && pathOwner.get(p) !== s.session) { pathOverlaps += 1; fail(`Sessions ${pathOwner.get(p)} and ${s.session} both claim ${p}`); }
    pathOwner.set(p, s.session);
  }
}

/**
 * Review waves, pinned to the exact commit their evidence must come from.
 *
 * A wave carries a base rather than a branch name because a branch moves. Wave
 * A was first pinned to da902cba and Session 7 pushed past it while the
 * evidence was still unbuilt; had the wave stayed on the branch, Sessions 9 and
 * 10 would have generated evidence from one commit and the reviewer measured it
 * against another. The superseded base is kept, not overwritten — a wave's
 * history is how a later reader knows which bytes a verdict actually described.
 *
 * `frozenFamilyPaths` are closed to every implementation session for the life of
 * the wave. Session 7 may continue its other assigned families; these four are
 * under review and their bytes may not move beneath it.
 */
const WAVES = [
  {
    wave: "A",
    reviewBase: "1b8a8cdd",
    reviewBaseSubject: git("log", "-1", "--format=%s", "1b8a8cdd"),
    previousBases: [
      { sha: "da902cbab36b9200aa4025e9d3ae571d26ea824a",
        status: "superseded_by_current_wave_base",
        why: "Session 7 pushed 1b8a8cdd on top of it before either evidence leg was built, so evidence from da902cba would describe bytes the reviewer would not be looking at" }
    ],
    families: [
      "AK:tf-810-form-en",
      "NC:aoc-cr-287-form-es",
      "NC:aoc-cr-287-form-vi",
      "NC:aoc-cr-288-form-es"
    ],
    measuredMovementFromPreviousBase: {
      changed: ["NC:aoc-cr-287-form-es: field-classification.json", "NC:aoc-cr-287-form-vi: field-classification.json"],
      unchanged: [
        "AK:tf-810-form-en — every measured path",
        "NC:aoc-cr-288-form-es — every measured path",
        "source records, production maps, field censuses, artifacts, contact sheets and provenance sidecars across all four"
      ],
      note: "Measured path by path between the two bases rather than inferred from the commit subject. Exactly two paths moved: field-classification.json on the two AOC-CR-287 families, which gained the completeness counters. Source records, source receipts, overlay profiles and their derived forms, field censuses, canonical and boundary artifacts, contact sheets and provenance sidecars are byte-identical across all four. The provenance sidecars name no classification digest, so none went stale behind the change.",
      measurementCorrection: "A first pass compared production-field-map.json for all four and reported it unchanged everywhere. Three of these families are flat-overlay packages that carry overlay-profile.json instead, so that comparison was between a path absent from both commits — an absence reading as agreement. The paths were re-measured against the shape each package actually has, and the verdict is unchanged only because the profiles genuinely did not move."
    },
    combinedReviewBase: "f892f0e43157665a20625252cb0fa1c703a7b891",
    combinedReviewBranch: "claude/rcap-wave-a-combined-review-v2-1b8a8cdd",
    combinedFrom: {
      implementation: "1b8a8cdd6c3a17a5452cfa3e4c238c5e6b329800",
      sidecars: "39212470646c3ec871af2212163bef0595eb70bf",
      visual: "473a5b086ca560c8c9efb878cd6aa4e3d3b96fee"
    },
    previousCombinedBases: [
      { sha: "358c6f75b2d9bd56c1b90d510fa78ac3542b05be",
        status: "superseded_by_current_visual_evidence",
        carriedVisual: "ecbbc6c1d189b2e7391d2b485e04b76e47f377aa" }
    ],
    visualArbitration: {
      selected: "473a5b086ca560c8c9efb878cd6aa4e3d3b96fee",
      selectedRange: "1b8a8cdd..473a5b08 — a single commit; the tips are siblings, so no earlier visual commit is omitted",
      superseded: "ecbbc6c1d189b2e7391d2b485e04b76e47f377aa",
      relationship:
        "siblings. Neither is an ancestor of the other; both are one commit from 1b8a8cdd, which is their merge base. Neither was cherry-picked on top of the other, and they were not combined — two sibling implementations of one evidence leg would give a reviewer two answers to the same question.",
      measuredDifference:
        "Same four families, same 12 logical pages, same 24 rasters, same four manifests plus an index and a checker, and neither touches a sidecar, map, profile, census, classification, review, implementation-index, assignment, register or denominator byte. The difference is what the manifest measures. 473a5b08 carries every key ecbbc6c1 carries and adds three: documentOwnershipContradiction, profileDisagreement and participantTextOverPrintedSourceTextProof, with captionLinePlacement and writableRun added per page. Its manifests are 23,437 bytes against 13,637 for the same family.",
      whyItWasSelected:
        "It is a strict superset that finds a live defect the other contract cannot see. On NC:aoc-cr-287-form-es it decodes the official source's own glyphs and reads DO NOT COMPLETE THIS FORM FOR FILING and USE THE ENGLISH VERSION, records that the overlay profile nonetheless claims participant_completed, and reports two participant values drawn on it. That is the NC translation owner decision, measured from the bytes rather than asserted. It also measures county and state placement against the official source: it reports the county value colliding with the form's own printed County caption on the same baseline, 48.26pt of horizontal overlap, and sitting on a printed caption line.",
      checkers: {
        sidecar: "OK — 4 families, 12 artifacts pinned to current bytes, 4/4 source digests hashed from installed binaries",
        visual: "OK — 4 families, 12/12 logical pages, 24 raster files"
      },
      implementationBytesMoved: 0
    },
    preReview: { commit: "c61e2331", status: "notes_only_not_integrated",
      why: "canonical review starts from the combined current bytes, not from another session's notes" },
    reviewerDispatched: true,
    implementationFreezeUntil:
      "Session 2 publishes canonical verdicts; no Wave A implementation byte may move before then",
    sidecarSession: 9,
    visualSession: 10,
    reviewerSession: 2,
    evidenceRule:
      "Sessions 9 and 10 both generate from exactly this base and do not depend on each other's commits",
    reviewerAssignmentRule:
      "Reviewer is not assigned until both current evidence commits exist from this base",
    frozenFamilyPaths: [
      "data/rcap-all50/overlays/production/alaska/tf-810-form-en/**",
      "data/rcap-all50/overlays/production/north-carolina/aoc-cr-287-form-es/**",
      "data/rcap-all50/overlays/production/north-carolina/aoc-cr-287-form-vi/**",
      "data/rcap-all50/overlays/production/north-carolina/aoc-cr-288-form-es/**"
    ],
    freezeScope:
      "closed to every implementation session from this dispatch commit until review completes; Session 7 continues its other assigned families"
  }
];

for (const wave of WAVES) {
  const base = git("rev-parse", wave.reviewBase);
  if (!base) fail(`wave ${wave.wave}: review base ${wave.reviewBase} is not reachable`);
  wave.reviewBaseResolved = base;
  for (const previous of wave.previousBases) {
    if (!git("cat-file", "-e", `${previous.sha}^{commit}`) === null) continue;
    if (git("merge-base", "--is-ancestor", previous.sha, base) === null) {
      fail(`wave ${wave.wave}: ${previous.sha.slice(0, 12)} is not an ancestor of the new base, so this is a different lineage rather than a re-pin`);
    }
  }
  // The hashes the reviewer must find on disk. Recorded from the base itself so
  // a reviewer never takes them from a record another lane wrote.
  wave.requiredHashes = wave.families.map((familyId) => {
    const slug = familyId.split(":").pop();
    const states = (git("ls-tree", "-d", "--name-only", base, "data/rcap-all50/overlays/production/") ?? "")
      .split("\n").map((d) => d.trim().split("/").pop()).filter(Boolean);
    const state = states.find((dir) =>
      git("rev-parse", `${base}:data/rcap-all50/overlays/production/${dir}/${slug}/source-record.json`) !== null);
    const dir = state ? `data/rcap-all50/overlays/production/${state}/${slug}` : null;
    if (!dir) fail(`wave ${wave.wave}: no package for ${familyId} at ${wave.reviewBase}`);
    const blob = (rel) => git("rev-parse", `${base}:${dir}/${rel}`);
    // Two package shapes exist and only one is present per family: an AcroForm
    // family carries production-field-map.json, a flat-overlay family carries
    // overlay-profile.json. Recording whichever is absent as null would read as
    // "nothing to hash" rather than "hash the other one", so the binding names
    // the kind it found.
    const fieldMap = blob("production-field-map.json");
    const overlayProfile = blob("overlay-profile.json");
    if (!fieldMap && !overlayProfile) fail(`wave ${wave.wave}: ${familyId} carries neither a field map nor an overlay profile`);
    return {
      familyId,
      familyPath: dir,
      bindingKind: fieldMap ? "production_field_map" : "overlay_profile",
      productionFieldMap: fieldMap,
      overlayProfile,
      overlayProfileDerived: blob("overlay-profile.derived.json"),
      fieldClassification: blob("field-classification.json"),
      fieldCensus: blob("field-census.json"),
      sourceRecord: blob("source-record.json"),
      sourceReceipt: blob("source-receipt.json"),
      canonicalArtifact: blob("fixtures/canonical-filled.pdf"),
      boundaryArtifact: blob("fixtures/boundary-filled.pdf"),
      contactSheet: blob("contact-sheet/blank-vs-filled.pdf"),
      provenanceSidecar: blob("artifact-provenance.json"),
      note: "git object ids at the review base; the reviewer recomputes SHA-256 from the files themselves"
    };
  });
}

/**
 * Owner decisions that are now controlling facts for review.
 *
 * Recorded, not acted on. A controlling fact tells a reviewer what the right
 * answer is; it does not authorise this lane to go and make the artifacts
 * match. Where an artifact contradicts one of these, that is a finding for the
 * owning implementation session.
 */
const OWNER_DECISIONS = [
  {
    id: "OD-NC-TRANSLATIONS-REFERENCE-ONLY",
    decision: "The three NC translations are reference-only and must never carry participant values. The English filing version is the only fillable filing artifact.",
    families: ["NC:aoc-cr-287-form-es", "NC:aoc-cr-287-form-vi", "NC:aoc-cr-288-form-es"],
    fillableFilingArtifact: "the English form of each",
    status: "controlling_review_fact",
    convertsFrom: "a prior open owner question",
    doesNotAuthorise:
      "Session 1 to repair any artifact. No implementation byte is changed by recording this.",
    consequenceForReview:
      "A reviewer finding a participant value drawn on any of these three returns a correction against the producing session rather than weighing whether the value belongs there."
  }
];

/**
 * Contributor tips the captain is deliberately not integrating, and why.
 */
const INTEGRATION_HOLDS = [];

/**
 * The HTML capture adjudication, as one unit.
 *
 * bddc55ac is superseded rather than dropped: it is an ancestor of f005a0eb and
 * the two are one adjudication, so integrating the earlier tip alone would
 * record three Alabama repoints that its own successor shows are not complete.
 * The unit is the corrected tip, and the outcomes below are read from the
 * adjudication record at that tip rather than restated.
 */
const HTML_ADJUDICATION = {
  unit: "session-13-html-capture-adjudication",
  currentTip: "f005a0eb",
  supersedes: { commit: "bddc55ac", status: "superseded_by_corrected_tip",
    rule: "never integrate bddc55ac without f005a0eb; if cherry-picking, preserve the branch sequence and verify at f005a0eb-equivalent bytes" },
  outcomes: { htmlRetired: 0, htmlRepointed: 3, htmlRetained: 8 },
  repointsCompleted: [
    { jurisdiction: "AK", target: "data/rcap-all50/guidance-packets/ak.json" },
    { jurisdiction: "AR", target: "data/rcap-all50/guidance-packets/ar.json" },
    { jurisdiction: "KY", target: "data/rcap-all50/guidance-packets/ky.json" }
  ],
  retainedUntilRepointed: [
    "al-expungement-petition.html",
    "criminal-forms.html",
    "criminal-record-expungement.html"
  ],
  exactBlocker: "data/rcap-all50/guidance-packets/al.json does not exist",
  blockerOwnedBy: "the guidance lane; the adjudication lane does not create guidance packets",
  denominatorEffect:
    "none. A repoint to a guidance surface does not retire the asset — retirement additionally requires removing the fileName from the compiled engine profile and the state-pack metadata, which is an application change. platform_ready, retired, retained_problematic and retained_missing all stand."
};

/**
 * The Lane 2 evidence wave, bounded to exactly nine families.
 *
 * The gate is that all nine are in Session 8's assignment and covered by an
 * allowedPath, and that the evidence scope contains these nine and no others.
 * It is NOT that the parent assignment holds exactly nine — it holds 28, and
 * reading the gate that way would either block a legitimate wave or drag
 * nineteen unrelated families into it.
 */
/**
 * The lane 2 semantic decision.
 *
 * Session 8 tried a broad rule — suppress any unwritten /Tx widget appearance —
 * and reverted it because it also erased official court captions. That outcome
 * is the evidence for the rule below: a string is not removable because of where
 * it is stored. "COUNTY, NEBRASKA" and "Type of Case - Check only one:" are
 * measured to live in flattened-widget appearance XObjects on these very forms,
 * exactly like the chooser prompt does. Location and field flags cannot separate
 * them; only meaning can.
 */
const WIDGET_TEXT_SEMANTICS = {
  decidedBy: "captain",
  rule: "classify by what the string means on the filed page, never by where the finalizer happened to store it",
  prohibitedHeuristics: [
    "suppress every unwritten /Tx widget appearance",
    "suppress on RichText",
    "suppress on Multiline",
    "any other /Ff bit test used as a proxy for placeholder-ness",
    "suppress because the text is in a widget appearance stream rather than the page content stream"
  ],
  whyProhibited:
    "each of these is a storage or flags test standing in for a meaning test. Measured on these artifacts, official static text and the chooser prompt are stored identically, so any such rule removes official court captions along with the placeholder — which is what Session 8 observed and correctly reverted.",
  placeholderSuppressWhenUnwritten: [
    {
      text: "(Enter the type of court)",
      disposition: "PLACEHOLDER",
      action: "suppress when unwritten",
      families: ["NE:cc-6-11-form-en", "NE:cc-6-11-2-form-en", "NE:cc-6-12-form-en", "NE:cc-6-15-1-form-en"]
    }
  ],
  // Each preserve rule carries the literal that is actually in the finalized
  // bytes. Without it the rule cannot be checked, and an unfalsifiable rule is
  // the same thing as no rule.
  officialStaticTextPreserve: [
    {
      text: "IN THE ___ COURT OF",
      disposition: "OFFICIAL STATIC TEXT",
      action: "preserve",
      matchAs: "COUNTY, NEBRASKA",
      matchNote:
        "\"IN THE ___ COURT OF\" is the caption line as a person reads it, not a string in the file. The blank IS the chooser widget, and the rest of the line is emitted as the widget appearance \"COUNTY, NEBRASKA\" (\"______________ COUNTY, NEBRASKA\" on DC-1-15). The caption is asserted through that literal.",
      families: ["NE:cc-6-11-form-en", "NE:cc-6-11-2-form-en", "NE:cc-6-12-form-en", "NE:cc-6-15-1-form-en", "NE:dc-1-15-form-en"]
    },
    {
      text: "COUNTY, NEBRASKA", disposition: "OFFICIAL STATIC TEXT", action: "preserve",
      matchAs: "COUNTY, NEBRASKA",
      families: ["NE:cc-6-11-form-en", "NE:cc-6-11-2-form-en", "NE:cc-6-12-form-en", "NE:cc-6-15-1-form-en", "NE:dc-1-15-form-en"]
    },
    {
      text: "Type of Case - Check only one:", disposition: "OFFICIAL STATIC TEXT", action: "preserve",
      matchAs: "Type of Case - Check only one:",
      families: ["NE:dc-1-15-form-en"]
    }
  ],
  measuredStorageOfEachClass: {
    method: "every string literal in every stream joined per stream, octal escapes decoded, then matched — the finalizer emits one Tj per word and escapes parens as \\050/\\051, so per-item extraction and a (...)Tj regex both miss this text",
    at: "ad3bca357e8030f5d07207aeec2d07927f3b1912",
    results: [
      { text: "(Enter the type of court)", family: "NE:cc-6-11-form-en", storedIn: "widget-appearance-XObject" },
      { text: "COUNTY, NEBRASKA", family: "NE:cc-6-11-form-en", storedIn: "widget-appearance-XObject" },
      { text: "COUNTY, NEBRASKA", family: "NE:cc-6-11-2-form-en", storedIn: "widget-appearance-XObject" },
      { text: "COUNTY, NEBRASKA", family: "NE:cc-6-12-form-en", storedIn: "widget-appearance-XObject" },
      { text: "COUNTY, NEBRASKA", family: "NE:cc-6-15-1-form-en", storedIn: "widget-appearance-XObject" },
      { text: "Type of Case - Check only one:", family: "NE:dc-1-15-form-en", storedIn: "widget-appearance-XObject" },
      { text: "______________ COUNTY, NEBRASKA", family: "NE:dc-1-15-form-en", storedIn: "widget-appearance-XObject" }
    ],
    correctedReading: {
      claim: "an earlier checkpoint recorded \"IN THE\" as present in the page content stream of NE:cc-6-11-form-en, offered as the contrast case to the widget-stored caption.",
      correction:
        "that was an incidental match. Once whitespace is squashed, \"IN THE\" matches inside \"I am the defendant in the above-listed case\" in the body text. Measured for the caption itself, the literal is absent from cc-6-11.2 and cc-6-15.1 entirely, and on DC-1-15 \"IN THE\" occurs only in unrelated adoption and estate captions.",
      effectOnTheDecision:
        "none. It removes the one page-content counter-example, so every string in this classification — official caption and chooser prompt alike — is measured to live in a widget appearance XObject. The heuristics stay prohibited for a stronger reason than before, not a weaker one."
    },
    conclusion:
      "on these forms every string at issue — official caption and chooser prompt alike — is stored in a widget appearance XObject. There is no storage-level or flags-level property that separates them, which forecloses every heuristic listed above."
  }
};

const LANE_2_EVIDENCE_WAVE = (() => {
  const STATE = { KY: "kentucky", NE: "nebraska", VT: "vermont" };
  const COMMIT = {
    "KY:aoc-496-form-en": "e6ffff87", "KY:aoc-496-2-form-en": "e6ffff87", "KY:aoc-496-4-form-en": "e6ffff87",
    "NE:cc-6-11-form-en": "e6ffff87", "NE:cc-6-11-2-form-en": "e6ffff87", "NE:cc-6-12-form-en": "e6ffff87",
    "NE:cc-6-15-1-form-en": "ad3bca35", "NE:dc-1-15-form-en": "ad3bca35", "VT:600-00228-support-en": "ad3bca35"
  };
  // Narrowed by re-measurement at ad3bca35. The rerender scope is exactly the
  // families still carrying the placeholder; everything else holds byte-identical.
  const AFFECTED = new Set([
    "NE:cc-6-11-form-en", "NE:cc-6-11-2-form-en", "NE:cc-6-12-form-en", "NE:cc-6-15-1-form-en"
  ]);
  const CLASSIFICATION_SCOPE = [
    "NE:cc-6-11-form-en", "NE:cc-6-11-2-form-en", "NE:cc-6-12-form-en",
    "NE:cc-6-15-1-form-en", "NE:dc-1-15-form-en"
  ];
  const assignment = readJson(`${ASSIGNMENTS}/family-rerender-2.json`);
  const assigned = new Set(assignment.familyIds ?? []);
  const allowed = assignment.allowedPaths ?? [];

  // The pack a family's source member belongs to, read from the committed pack
  // manifests rather than assumed from the batch number.
  const packDir = "data/rcap-all50/source-packs";
  const packs = fs.readdirSync(abs(packDir))
    .filter((f) => f.startsWith("family-rerender-lane-2") && f.endsWith(".manifest.json"))
    .map((f) => ({ file: `${packDir}/${f}`, body: readJson(`${packDir}/${f}`) }));
  const memberFor = (familyId) => {
    for (const pack of packs) {
      for (const entry of pack.body.files ?? []) {
        if ((entry.familyIds ?? []).includes(familyId)) {
          return { packId: pack.body.packId, manifest: pack.file, pathInArchive: entry.pathInArchive,
            memberSha256: entry.sha256 ?? null, memberByteLength: entry.byteLength ?? null,
            built: pack.body.built === true, archiveFileName: pack.body.zip ?? null };
        }
      }
    }
    return null;
  };

  const families = Object.keys(COMMIT).map((familyId) => {
    const slug = familyId.split(":").pop();
    const dir = `data/rcap-all50/overlays/production/${STATE[familyId.split(":")[0]]}/${slug}`;
    if (!assigned.has(familyId)) fail(`lane 2 wave: ${familyId} is not in Session 8's assignment`);
    const allowedPath = allowed.find((x) => x.replace(/\/\*\*$/, "") === dir) ?? null;
    if (!allowedPath) fail(`lane 2 wave: ${familyId} has no allowedPath authorizing ${dir}`);
    const member = memberFor(familyId);
    if (!member) fail(`lane 2 wave: ${familyId} appears in no lane-2 source-pack manifest`);
    return {
      familyId, packageDirectory: dir,
      ownedBy: { session: 8, assignment: "family-rerender-2.json" },
      allowedPath, implementationCommit: COMMIT[familyId],
      sourcePackBatch: member.packId, sourcePackManifest: member.manifest,
      sourcePackMemberPath: member.pathInArchive,
      sourceMemberSha256: member.memberSha256, sourceMemberByteLength: member.memberByteLength,
      status: AFFECTED.has(familyId)
        ? "rerender_required_placeholder_suppression"
        : "held_byte_identical",
      inClassificationScope: CLASSIFICATION_SCOPE.includes(familyId),
      artifactMayMove: AFFECTED.has(familyId),
      frozen: true
    };
  });

  // Pack facts are read and hashed here, not transcribed. The manifest is the
  // only artifact of a pack that exists in the repository, so it is the only
  // thing that can carry a filename, a full digest and a byte length; the
  // archive-level fields stay null until a ZIP is actually built.
  const REQUIRED_FOR_CORRECTION = new Set(["family-rerender-lane-2-batch-01", "family-rerender-lane-2-batch-02"]);
  const packMatrix = [...new Map(packs.map((p) => [p.body.packId, p])).values()].map(({ file, body }) => {
    const bytes = fs.readFileSync(abs(file));
    return {
      packId: body.packId,
      requiredForThisCorrection: REQUIRED_FOR_CORRECTION.has(body.packId),
      manifestFileName: path.basename(file),
      manifestPath: file,
      manifestSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      manifestByteLength: bytes.length,
      archiveFileName: body.zip,
      archiveSha256: null,
      archiveByteLength: null,
      built: body.built === true,
      memberCount: (body.files ?? []).length,
      members: (body.files ?? []).map((e) => ({
        familyIds: e.familyIds ?? [],
        pathInArchive: e.pathInArchive,
        sha256: e.sha256,
        byteLength: e.byteLength,
        inThisWave: (e.familyIds ?? []).some((f) => Object.keys(COMMIT).includes(f))
      }))
    };
  }).filter((p) => p.members.some((m) => m.inThisWave));

  {
    for (const pack of packMatrix) {
      for (const m of pack.members) {
        if (!/^[0-9a-f]{64}$/.test(String(m.sha256 ?? ""))) {
          fail(`${pack.packId} member ${m.pathInArchive} carries no full SHA-256; abbreviated or missing digests are not publishable`);
        }
        if (!Number.isInteger(m.byteLength) || m.byteLength <= 0) {
          fail(`${pack.packId} member ${m.pathInArchive} carries no byte length`);
        }
      }
    }
    for (const id of REQUIRED_FOR_CORRECTION) {
      if (!packMatrix.some((p) => p.packId === id)) fail(`${id} is required for this correction but is not in the matrix`);
    }
  }

  // The policy and the rerender scope have to agree, or a session reads one and
  // acts on the other.
  {
    const placeholderFamilies = new Set(
      WIDGET_TEXT_SEMANTICS.placeholderSuppressWhenUnwritten.flatMap((r) => r.families ?? []));
    for (const f of placeholderFamilies) {
      if (!AFFECTED.has(f)) fail(`${f} carries a placeholder disposition but is not in the rerender scope`);
    }
    for (const f of AFFECTED) {
      if (!placeholderFamilies.has(f)) fail(`${f} is in the rerender scope but carries no placeholder disposition`);
      if (!CLASSIFICATION_SCOPE.includes(f)) fail(`${f} is rerendered but is outside the classification scope`);
    }
    // Preserve-only means the family appears in a preserve rule and in no
    // placeholder rule. A family can legitimately carry both — the four NE
    // petitions preserve their caption AND suppress the prompt inside it.
    for (const f of new Set(WIDGET_TEXT_SEMANTICS.officialStaticTextPreserve.flatMap((r) => r.families ?? []))) {
      if (!placeholderFamilies.has(f) && AFFECTED.has(f)) {
        fail(`${f} carries only preserve dispositions; its artifact may not move`);
      }
    }
    for (const rule of WIDGET_TEXT_SEMANTICS.officialStaticTextPreserve) {
      if (!rule.matchAs) fail(`preserve rule "${rule.text}" carries no matchAs literal and cannot be checked against bytes`);
      if (!(rule.families ?? []).length) fail(`preserve rule "${rule.text}" names no family`);
    }
    for (const f of Object.keys(COMMIT)) {
      const state = f.split(":")[0];
      if ((state === "KY" || state === "VT") && AFFECTED.has(f)) {
        fail(`${f} is a ${state} family; no Kentucky or Vermont artifact may move in this correction`);
      }
    }
    if (!WIDGET_TEXT_SEMANTICS.prohibitedHeuristics.length) fail("the semantic decision records no prohibited heuristic");
  }

  return {
    wave: "lane-2-evidence",
    implementationBase: "ad3bca357e8030f5d07207aeec2d07927f3b1912",
    implementationStatus: "visual_gate_failed",
    canonicalSidecars: "none",
    canonicalVisual: "none",
    reviewer: "not dispatched",
    diagnosticVisual: {
      commit: "9c92412f60d3acc3d88400227915a26803531fea",
      disposition: "diagnostic_only_source_bytes_unavailable",
      rastersManifestsIndexIntegrated: false,
      why: "its own manifests record binaryAvailableToThisRun false and censusPinConfirmedAgainstBytes false: the lane 2 pack is not in the clone, so nothing it says about source preservation rests on official bytes",
      butItsArtifactBoundObservationsReopenedTheGate: true,
      findingsNarrowedAt: "ad3bca357e8030f5d07207aeec2d07927f3b1912",
      findingsNarrowedBy:
        "each reported string re-measured directly against the fixtures at ad3bca35 by joining every string literal per stream and decoding octal escapes. The earlier confirmation was taken against the diagnostic tip's own artifacts, not against ad3bca35; measuring the implementation snapshot narrows it.",
      confirmedCurrentPlaceholderDefects: [
        { text: "(Enter the type of court)", occurrences: 4,
          families: ["NE:cc-6-11-form-en", "NE:cc-6-11-2-form-en", "NE:cc-6-12-form-en", "NE:cc-6-15-1-form-en"] }
      ],
      refutedAtThisSnapshot: [
        { text: "Print Form", family: "KY:aoc-496-form-en", measured: "absent" },
        { text: "Reset Form", family: "KY:aoc-496-form-en", measured: "absent" },
        { text: "Print Form", family: "KY:aoc-496-2-form-en", measured: "absent" },
        { text: "Reset Form", family: "KY:aoc-496-2-form-en", measured: "absent" },
        { text: "RESET FORM", family: "NE:dc-1-15-form-en", measured: "absent" }
      ],
      preserveNotADefect: [
        { text: "Type of Case - Check only one:", family: "NE:dc-1-15-form-en",
          measured: "present in a widget-appearance-XObject", disposition: "OFFICIAL STATIC TEXT" }
      ],
      unconfirmed: [
        { finding: "date-caption overlap", family: "NE:cc-6-15-1-form-en",
          why: "the caption/value x-positions differ by extraction method — 367.22 by this tree's extraction against 366.22 by the diagnostic — so the reported magnitude is method-dependent and no overlap figure is certified here" }
      ]
    },
    familyCount: families.length,
    affectedFamilies: [...AFFECTED],
    frozenCleanFamilies: ["KY:aoc-496-4-form-en", "VT:600-00228-support-en"],
    families,
    sourcePackMatrix: packMatrix,
    sourcePackArchivesDoNotExistYet: {
      zipsBuilt: 0,
      consequence:
        "no archive filename, archive SHA-256 or archive byte length exists to publish for any lane-2 pack. Every manifest records built:false and zip:null, and the generator that would build them writes into tmp/source-packs, which git refuses to track. Member paths, member digests and member byte lengths ARE published below, because those are pinned in the manifests; the archive-level values are not invented.",
      whatIsPublishedInstead:
        "each pack's manifest file name, its full SHA-256, its byte length, and every member's archive path, full SHA-256 and byte length. The manifest is the committed half of a pack and is the only half that exists.",
      withdrawnClaim:
        "an earlier checkpoint recorded sourcePackSha256 11e1311c… for this wave. That value is a pack-pinned member digest carried in the diagnostic's manifests, not the SHA-256 of a built archive, and it was recorded here without being derived. It is withdrawn as an archive digest.",
      abbreviatedValueNotStored: {
        value: "e0d801c0…",
        resolvedAgainst: "all 107 member entries across every committed source-pack manifest, and the SHA-256 of every lane-2 manifest file",
        matches: 0,
        disposition:
          "not stored. It is an abbreviation with no resolvable full value in this tree, and an abbreviation is not a digest. If Session 8 holds the full value it must be published with what it hashes."
      }
    },
    gate: {
      allNineInTheAssignment: true,
      allNineCoveredByAnAllowedPath: true,
      evidenceScopeIsExactlyTheseNine: true,
      parentAssignmentSize: (assignment.familyIds ?? []).length,
      note: "the parent assignment holds more than nine, and that is not a failure — the gate is about these nine, not the parent's size"
    },
    widgetTextSemantics: WIDGET_TEXT_SEMANTICS,
    regressionVerifier: {
      script: "scripts/verify-rcap-lane2-widget-text-semantics.mjs",
      mutations: "scripts/verify-rcap-lane2-widget-text-semantics.mjs --mutations",
      asserts: [
        "every officialStaticTextPreserve rule's matchAs literal is present in every family it names",
        "no placeholder string appears in a wave family outside its classification"
      ],
      doesNotAssert:
        "that the placeholder is gone. It passes before Session 8's rerender and must keep passing after it — asserting the defect's presence would make the verifier fail the moment the defect is fixed.",
      runBeforePushing: [6, 8],
      notRegisteredInNpmTest: "package.json is a prohibited path for this lane; the verifier follows the verify-rcap-* convention and is named here instead"
    },
    dispatch: {
      order: [
        "1. Session 6 publishes the semantic classification commit",
        "2. Session 8 rerenders the four placeholder families against it",
        "3. only then may Sessions 9 and 10 produce evidence"
      ],
      classification: {
        session: 6,
        status: "dispatched",
        role: "shared code and source-pack factory",
        whyThisSession:
          "the classification governs the finalizer, and the finalizer lives under scripts/rcap-official-forms/**, which Session 8's own assignment lists as a prohibited path. Session 6 already owns shared code and its current tip is on this exact question. This is read off the committed assignment, not assigned by preference.",
        familyIds: CLASSIFICATION_SCOPE,
        mustLandBefore: "any finalizer change or artifact rerender by Session 8",
        mayNotWriteInto: "the family package directories — those are Session 8's allowed paths, and a classification record is shared, not per-package",
        producesNoArtifactMovement: true
      },
      rerender: {
        session: 8,
        status: "blocked_until_classification_commit",
        assignment: "family-rerender-2.json",
        familyIds: [...AFFECTED],
        artifactsThatMayMove: [...AFFECTED],
        artifactsHeldByteIdentical: Object.keys(COMMIT).filter((f) => !AFFECTED.has(f)),
        explicitHolds: [
          "no Kentucky artifact may move",
          "no Vermont artifact may move",
          "NE:dc-1-15-form-en's artifact may not move"
        ]
      },
      sidecarSession: { session: 9, status: "not_dispatched" },
      visualSession: { session: 10, status: "not_dispatched" },
      reviewer: { session: 2, status: "not_dispatched", isAnEvidenceProducer: false },
      evidenceMayNotStartUntil: [
        "Session 6 pushes the semantic classification commit",
        "Session 8 pushes the four-family rerender against it",
        "every required source-pack archive hash is published",
        "every required source archive is available to the evidence sessions"
      ]
    },
    changesNothingElse:
      "no implementation package, assignment ownership, count, register, denominator or review record is altered by publishing this scope"
  };
})();

/**
 * The checkpoint contributors are pointed at is derived from the dispatch's own
 * inputs, never from HEAD.
 *
 * Publishing this file moves HEAD, so a HEAD-derived pointer is stale the
 * moment it is committed and every determinism check afterwards reports a
 * difference that is not a content difference. Deriving it from the inputs
 * gives a pointer that names the state the dispatch actually describes and that
 * survives publishing the dispatch itself.
 */
const CHECKPOINT_INPUTS = [
  "data/rcap-all50/gate-b-assignments/index.json",
  "data/rcap-all50/gate-b-81-terminalization-queue.json",
  "data/rcap-all50/problematic-pdf-register.json"
];
const captainCheckpoint = git("log", "-1", "--format=%H", "--", ...CHECKPOINT_INPUTS);
if (!/^[0-9a-f]{40}$/.test(captainCheckpoint ?? "")) {
  fail("could not resolve a commit for any dispatch input; the assignments and queue must be committed before the dispatch is published");
}

const record = {
  schemaVersion: "rcap-gate-b-session-dispatch/v1",
  generatedBy: "scripts/generate-rcap-gate-b-session-dispatch.mjs",
  captainCheckpoint,
  captainCheckpointIs:
    "the last commit that changed a dispatch input (the assignment files, the terminalization queue or the problematic-PDF register). It is deliberately not HEAD: a HEAD read cannot equal the commit that records it, so --check would call this file stale one commit after every commit, on a field carrying no dispatch content.",
  thisIsAMapNotAnArchitecture:
    "The eleven assignment files are unchanged. This names the session that owns each and pins the remote tip it continues from; no asset id, family id, allowed path, prohibited path or denominator membership is altered here.",
  denominator: {
    platform_ready: ledger.equation.platformReady,
    retired: ledger.equation.retired,
    retained_problematic: ledger.equation.retainedProblematic,
    retained_missing: ledger.retainedBreakdown.retainedMissing
  },
  cancelled: {
    what: "the pdf-lane-2..7 reset and reviewer-8..11 queues",
    why: "superseded by this dispatch over the existing eleven assignments; the files and their generator are removed so no session can pick up a cancelled assignment",
    keptFromThatWork: "the shared finalizer hotfix, ownership/index corrections and source-pack factory imported into this base, which are independent of the lane recut"
  },
  waves: WAVES,
  ownerDecisions: OWNER_DECISIONS,
  integrationHolds: INTEGRATION_HOLDS,
  htmlAdjudication: HTML_ADJUDICATION,
  lane2EvidenceWave: LANE_2_EVIDENCE_WAVE,
  laneBases: [
    {
      lane: "lane 2 evidence",
      session: 8,
      base: "ad3bca357e8030f5d07207aeec2d07927f3b1912",
      published: true,
      frozen: true,
      freezeScope: "no implementation session may modify these nine family packages until evidence and review complete",
      frozenFamilyPackages: [
        "data/rcap-all50/overlays/production/kentucky/aoc-496-form-en",
        "data/rcap-all50/overlays/production/kentucky/aoc-496-2-form-en",
        "data/rcap-all50/overlays/production/kentucky/aoc-496-4-form-en",
        "data/rcap-all50/overlays/production/nebraska/cc-6-11-form-en",
        "data/rcap-all50/overlays/production/nebraska/cc-6-11-2-form-en",
        "data/rcap-all50/overlays/production/nebraska/cc-6-12-form-en",
        "data/rcap-all50/overlays/production/nebraska/cc-6-15-1-form-en",
        "data/rcap-all50/overlays/production/nebraska/dc-1-15-form-en",
        "data/rcap-all50/overlays/production/vermont/600-00228-support-en"
      ],
      evidenceDispatch: {
        sidecarSession: 9, visualSession: 10,
        from: "exactly ad3bca357e8030f5d07207aeec2d07927f3b1912",
        rule: "independent branches; neither leg depends on the other's commit"
      },
      authorizedFrom: "e6ffff87",
      intermediate: ["407525c0"],
      auditedAndPassing: [
        "linear descendant of e6ffff87",
        "every family touched is assigned to Session 8",
        "every family touched has an explicit allowedPath",
        "no frozen Wave A family package changed",
        "no application, worker or platform-ready byte changed"
      ],
      correctionMadeToPassIt:
        "The allowedPath check first failed on VT:600-00228-support-en, and the fault was this lane's rather than Session 8's. An asset row can carry more than one familyId — a filing form and its support sheet resolving to one binary — while the queue records a single familyPackagePath, so the sibling package was assigned to the session and forbidden to it at the same time. Twelve sibling packages were in that position. The assignment generator now grants a path for every family in an asset that has a real package, and ad3bca35 passes all five checks against the corrected assignment."
    }
  ],
  totals: {
    waves: WAVES.length,
    frozenFamilyPaths: WAVES.flatMap((w) => w.frozenFamilyPaths).length,
    sessions: sessions.length,
    ownerDecisions: OWNER_DECISIONS.length,
    integrationHolds: INTEGRATION_HOLDS.length,
    assignmentsMapped: claimed.size,
    uniqueAssetsAssigned: unique.size,
    pathOverlaps,
    activeLaneTipsRecorded: sessions.filter((s) => s.currentRemoteTip).length
  },
  sessions
};

function markdown() {
  const lines = [];
  lines.push("# Gate B numbered-session dispatch");
  lines.push("");
  lines.push(record.thisIsAMapNotAnArchitecture);
  lines.push("");
  for (const w of record.waves ?? []) {
    lines.push(`## Wave ${w.wave} — base \`${w.reviewBase}\``);
    lines.push("");
    lines.push(`Superseding \`${w.previousBases[0].sha.slice(0, 12)}\` (${w.previousBases[0].status}). ${w.previousBases[0].why}.`);
    lines.push("");
    lines.push(w.measuredMovementFromPreviousBase.note);
    lines.push("");
    lines.push(`Frozen for the life of the wave: ${w.families.join(", ")}.`);
    lines.push("");
  }
  lines.push("| session | role | assignment | assets | continuing from |");
  lines.push("| ---: | --- | --- | ---: | --- |");
  for (const s of sessions) {
    lines.push(`| ${s.session} | ${s.role} | ${s.assignment ? `\`${s.assignment}\`` : "—"} | ${s.assetCount} | ${s.currentRemoteTip ? `\`${s.currentRemoteTip.slice(0, 12)}\`` : "—"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-session-dispatch.mjs`);

console.log(
  `OK session dispatch — ${record.totals.sessions} sessions, ${record.totals.assignmentsMapped} assignments mapped, ` +
    `${record.totals.uniqueAssetsAssigned} unique assets, ${record.totals.pathOverlaps} path overlap(s), ` +
    `${record.totals.activeLaneTipsRecorded} active lane tip(s) pinned`
);
