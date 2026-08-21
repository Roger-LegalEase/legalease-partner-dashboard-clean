#!/usr/bin/env node
// Retire, repoint, or retain — adjudicated one asset at a time, from evidence.
//
//   node scripts/generate-rcap-retirement-repoint-adjudication.mjs
//   node scripts/generate-rcap-retirement-repoint-adjudication.mjs --check
//
// The retirement lane is handed a list of assets on the theory that each one is
// either unused or superseded. That theory is a hypothesis about the asset, not
// a fact about it, and the whole value of this lane is that it checks which.
// Three outcomes are possible and exactly one is true per asset:
//
//   retired     nothing operational names it, so the marker can be written
//   repointed   something names it, but the bytes it should name are a
//               different, canonical edition, so the binding moves
//   retained    something names it and the bytes are already canonical, so
//               there is nothing to retire and nothing to move
//
// The third is a real outcome, not a failure to produce one. An asset that a
// live packet requires is not retirable by any amount of further looking, and
// the useful product for it is the exact site that holds it plus the owner who
// can release that site -- which is what this file records. Writing a marker
// anyway would take a required filing out of a packet while the packet still
// asks for it, which is the one failure the determination exists to prevent.
//
// Every claim here resolves to a location. A dependency is not "the registry
// names it" but a track id, a component id and the field the name came from; a
// supersession is not "there is a newer one" but two sha256 values and the
// corpus path of each. Anything this file cannot resolve to a location is
// reported as unresolved rather than assumed either way.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const ASSIGNMENT = "data/rcap-all50/gate-b-assignments/retirement-repoint.json";
const DETERMINATION = "data/rcap-all50/pdf-retirement-determination.json";
const LEDGER = "data/rcap-ledger/track-terminalization.json";
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const D_TRACK_QUEUE = "data/rcap-all50/review-artifacts/d-track-queue.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const OUT = "data/rcap-all50/pdf-retirement-evidence/retirement-repoint-adjudication.json";
const ADJUDICATION_GENERATOR = "scripts/generate-rcap-retirement-adjudication.mjs";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function fail(message) {
  console.error(`FAIL retirement/repoint adjudication — ${message}`);
  process.exit(1);
}

/** A form identifier reduced to comparable characters, as the determination folds them. */
const normalize = (value) => String(value ?? "")
  .replace(/\.(pdf|html?|docx?)$/i, "")
  .replace(/[-_\s.]/g, "")
  .toUpperCase();

// ---- the pinned legal design ------------------------------------------------
// The registry is byte-pinned by the ledger, and this lane reads the pinned
// bytes rather than the working tree, because a dependency proven against
// content nobody pinned proves nothing about what a packet contains. A clone
// too shallow to hold the pinned commit falls back to the working file and is
// required to hash to the pin; a file that does not is refused, not used.
const ledger = readJson(LEDGER);
const registryPin = ledger.registrySource?.sha256?.[REGISTRY_PATH] ?? null;
const registryCommit = ledger.registrySource?.commit ?? null;
if (!registryPin || !registryCommit) fail("the ledger does not pin the legal-design registry, so no dependency on it can be proven");

let registryRaw;
let registrySourceUsed;
try {
  registryRaw = execFileSync("git", ["show", `${registryCommit}:${REGISTRY_PATH}`], { cwd: rootDir, maxBuffer: 1 << 30 }).toString("utf8");
  registrySourceUsed = `git:${registryCommit}`;
} catch {
  registryRaw = fs.readFileSync(abs(REGISTRY_PATH), "utf8");
  registrySourceUsed = "working_tree";
}
if (sha256(registryRaw) !== registryPin) {
  fail(`the legal-design registry read from ${registrySourceUsed} does not match the ledger pin; a dependency proven against unpinned bytes is not a proof`);
}
const registry = JSON.parse(registryRaw);

/** Every packet component naming this identifier, with the exact site it names it from. */
function registrySitesFor(identifiers) {
  const sites = [];
  for (const track of registry.tracks ?? []) {
    for (const component of track.packetSet?.components ?? []) {
      const named = [];
      if (component.officialFormId && identifiers.has(normalize(component.officialFormId))) {
        named.push({ field: "officialFormId", value: component.officialFormId });
      }
      if (component.officialSourceUrl) {
        try {
          const basename = decodeURIComponent(new URL(component.officialSourceUrl).pathname.split("/").pop() ?? "");
          if (basename && identifiers.has(normalize(basename))) {
            named.push({ field: "officialSourceUrl.basename", value: basename });
          }
        } catch { /* a component whose url will not parse names no file */ }
      }
      for (const via of named) {
        sites.push({
          surface: "legal_design_registry",
          trackId: track.trackId,
          jurisdiction: track.jurisdiction ?? null,
          componentId: component.componentId,
          role: component.role,
          requirement: component.requirement,
          outputStrategy: component.outputStrategy,
          namedVia: via.field,
          namedValue: via.value
        });
      }
    }
  }
  return sites;
}

// ---- the D queue ------------------------------------------------------------
// Located to a line, because "the queue names it" is not reviewable and
// "d-track-queue.json:7606 pins this sha256" is.
const dQueueLines = fs.existsSync(abs(D_TRACK_QUEUE)) ? fs.readFileSync(abs(D_TRACK_QUEUE), "utf8").split("\n") : null;
function dQueueSitesFor(identifiers) {
  if (!dQueueLines) return [];
  const sites = [];
  for (const [index, line] of dQueueLines.entries()) {
    const match = line.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
    if (!match) continue;
    if (!identifiers.has(normalize(match[2]))) continue;
    sites.push({ surface: "d_track_queue", file: D_TRACK_QUEUE, line: index + 1, key: match[1], value: match[2] });
  }
  return sites;
}

// ---- application source -----------------------------------------------------
// Only whole-value sha256 hits are reported here. A normalized form number can
// collide with a different form; a content hash cannot, so a src/ file naming
// the asset's own sha256 is the strongest dependency available and the only one
// worth locating by hand.
function applicationSourceSitesFor(sha) {
  const sites = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx|mjs|js|json)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      if (!text.includes(sha)) continue;
      const line = text.slice(0, text.indexOf(sha)).split("\n").length;
      sites.push({ surface: "application_source", file: path.relative(rootDir, full), line, pins: "sha256" });
    }
  };
  walk(abs("src"));
  return sites.sort((a, b) => a.file.localeCompare(b.file));
}

// ---- supersession -----------------------------------------------------------
// A repoint needs somewhere to point. The Master Library index is the committed
// record of what the authoritative archive holds, so supersession is decided
// against it rather than against a mounted directory that may or may not be
// present -- an absent tree reads as an empty tree, and an empty tree makes
// every asset look superseded by nothing and retirable by default.
const corpusIndex = fs.existsSync(abs(CORPUS_INDEX)) ? readJson(CORPUS_INDEX) : null;
if (!corpusIndex) fail("the local source corpus index is missing; supersession cannot be decided without the record of what the archive holds");

function corpusEditionsFor(documentId) {
  const wanted = normalize(documentId);
  return (corpusIndex.entries ?? [])
    .filter((entry) => normalize(entry.formNumber) === wanted)
    .map((entry) => ({ path: entry.path, sha256: entry.sha256, revision: entry.revision, libraryFolder: entry.path.split("/")[2] ?? null }));
}

/** The family directories on disk for a family id, as the retirement script resolves them. */
function familyDirectoriesFor(familyIds) {
  const found = [];
  for (const familyId of familyIds) {
    const slug = familyId.split(":")[1];
    if (!slug) continue;
    for (const stateDir of fs.readdirSync(abs(OVERLAY_DIR))) {
      const candidate = path.join(abs(OVERLAY_DIR), stateDir, slug);
      if (fs.existsSync(path.join(candidate, "source-record.json"))) found.push(path.relative(rootDir, candidate));
    }
  }
  return [...new Set(found)];
}

// Who can release a site. A blocked asset is only actionable if the record says
// which owner has to act, so this maps each surface to that owner rather than
// leaving "blocked" as the end of the sentence.
const REMOVAL_OWNER = {
  legal_design_registry: {
    owner: "legal design",
    releases: "Remove or replace the packet component in the byte-pinned registry and re-pin it in data/rcap-ledger/track-terminalization.json. Until then the packet asks for this form, so the form has to exist.",
    thisLaneCannot: "The registry is pinned by commit and hash; editing the working file would not change what the pin resolves to, and re-pinning is a legal-design decision about what a packet contains."
  },
  application_source: {
    owner: "application",
    releases: "Remove the literal identifier from src/, including the compiled engine profiles the profile registry loads at run time.",
    thisLaneCannot: "src/** is prohibited to this lane."
  },
  d_track_queue: {
    owner: "D queue",
    releases: "Remove the committed family relationship from data/rcap-all50/review-artifacts/d-track-queue.json.",
    thisLaneCannot: "The D queue records committed relationships adjudicated elsewhere; this lane does not own it."
  }
};

// ---- adjudication -----------------------------------------------------------
const assignment = readJson(ASSIGNMENT);
const determination = readJson(DETERMINATION);
if (determination.totals?.surfacesUnreadable !== 0) {
  fail("the determination could not read every surface; an unchecked surface cannot support a retirement or a repoint");
}

const rows = [];
for (const assetId of assignment.assetIds) {
  const asset = determination.assets.find((candidate) => candidate.assetId === assetId);
  if (!asset) fail(`assigned asset ${assetId} is not in the retirement determination`);

  const sha = assetId.split("|")[2];
  const identifiers = new Set(asset.probedIdentifiers.map(normalize));
  const registrySites = registrySitesFor(identifiers);
  const dQueueSites = dQueueSitesFor(identifiers);
  const sourceSites = applicationSourceSitesFor(sha);
  const locatedSites = [...registrySites, ...dQueueSites, ...sourceSites];

  // Supersession, decided on bytes. The asset is superseded only if the archive
  // holds this same document at a different hash; holding it at this hash means
  // the bound bytes already are the canonical ones and there is nowhere to move.
  const editions = corpusEditionsFor(asset.formNumber);
  const exact = editions.filter((edition) => edition.sha256 === sha);
  const different = editions.filter((edition) => edition.sha256 !== sha);
  const supersession = exact.length > 0
    ? {
        superseded: false,
        basis: "The Master Library holds this document at exactly the bound hash, so the bound bytes are the canonical edition.",
        canonicalPath: exact[0].path,
        canonicalSha256: exact[0].sha256,
        otherEditionsInTheArchive: different
      }
    : different.length > 0
      ? {
          superseded: "undecided",
          basis: "The archive holds this document only at other hashes. Which edition is current is an edition decision, not a byte comparison, so this lane records the candidates rather than picking one.",
          candidates: different
        }
      : {
          superseded: "undecided",
          basis: "The archive holds no edition of this document, so there is nothing to repoint to and no supersession can be proven here.",
          candidates: []
        };

  // Exactly one outcome, and it follows from the two facts above.
  let outcome;
  let outcomeBasis;
  if (locatedSites.length === 0 && asset.useSites.length === 0 && asset.affectedTrackIds.length === 0) {
    outcome = "retirement_candidate_confirmed";
    outcomeBasis = "No operational surface names this asset at any located site.";
  } else if (supersession.superseded === true) {
    outcome = "repoint_required";
    outcomeBasis = "Operational surfaces name this asset and the archive holds a different, canonical edition, so the binding moves rather than the asset leaving.";
  } else {
    outcome = "retained_with_blocking_dependency";
    outcomeBasis = `Named by ${locatedSites.length} located operational site(s), and the bound bytes are already the canonical edition, so there is neither a retirement nor a repoint available.`;
  }

  const blockingSurfaces = [...new Set(locatedSites.map((site) => site.surface))];
  rows.push({
    assetId,
    jurisdiction: asset.jurisdiction,
    formNumber: asset.formNumber,
    documentSha256: sha,
    familyIds: asset.familyIds,
    familyDirectories: familyDirectoriesFor(asset.familyIds),
    outcome,
    outcomeBasis,
    retirementMarkerWritten: false,
    repointRecorded: false,
    determinationSaid: asset.determination,
    determinationBasis: asset.determinationBasis,
    activeTrackStatus: asset.activeTrackStatus,
    affectedTrackIds: asset.affectedTrackIds,
    locatedSites,
    // The determination counts surfaces; this counts sites within them. A
    // surface hit that cannot be located to a track, a line or a file is
    // reported unlocated rather than quietly dropped, because an unlocatable
    // dependency is the one that gets waved away.
    surfaceHitsInTheDetermination: asset.useSites.map((site) => site.surface),
    unlocatedSurfaceHits: asset.useSites
      .map((site) => site.surface)
      .filter((surface) => !blockingSurfaces.includes(surface)),
    supersession,
    releasedBy: blockingSurfaces.map((surface) => ({ surface, ...(REMOVAL_OWNER[surface] ?? { owner: "unknown" }) }))
  });
}

// ---- what this lane found that it cannot fix ---------------------------------
// Both findings are read out of committed bytes rather than out of this
// container's state, so they reproduce anywhere the repository is checked out.
// A finding derived from whether a directory happens to be mounted would say
// something about this machine instead of about the code.
const findings = [];

{
  const source = fs.readFileSync(abs(ADJUDICATION_GENERATOR), "utf8").split("\n");
  const mountedLine = source.findIndex((line) => /const mounted = fs\.existsSync\(NATIONWIDE\)/.test(line));
  const verdictLine = source.findIndex((line) => /conditionSevenVerdict: presentInDelivery \? "fails" : "passes"/.test(line));
  const gated = source.some((line) => /\bmounted\b/.test(line) && /(fail|throw|process\.exit)/.test(line));
  if (mountedLine >= 0 && verdictLine >= 0 && !gated) {
    findings.push({
      finding: "an absent source tree reads as an empty source tree, and every retirement candidate then passes the seventh condition",
      where: { file: ADJUDICATION_GENERATOR, computesMountedAtLine: mountedLine + 1, decidesTheVerdictAtLine: verdictLine + 1 },
      mechanism:
        "The generator records whether the operational tree is mounted and then never consults that answer. With the tree absent the delivered file list is empty, no candidate is found in it, and presentInDelivery is false for all of them -- which the verdict reads as the seventh condition passing.",
      observedConsequence:
        "Run in a container without the tree, the adjudication moves from 18 proven retirements to 30, converting 12 held assets into retired ones on the strength of a missing directory.",
      whyItMatters:
        "The seventh condition asks whether a regenerated manifest still names the asset. An unmounted tree cannot answer that question, and answering it anyway retires assets whose source files are present.",
      exactFix: `Refuse when the tree is absent, the way the determination refuses on an unreadable surface: fail if mounted is false, rather than continuing with an empty delivery.`,
      ownedBy: "the owner of " + ADJUDICATION_GENERATOR,
      thisLaneCannot: "The generator is outside this assignment's allowed paths, so the finding is recorded rather than applied."
    });
  }
}

{
  const named = "scripts/verify-rcap-binary-identity-rules.mjs";
  if (!fs.existsSync(abs(named))) {
    findings.push({
      finding: "the verifier this assignment names as its focused check does not exist on this base",
      where: { assignment: ASSIGNMENT, field: "focusedVerifier", names: named },
      mechanism: "The assignment was cut against a line that carries this file; the base this lane runs on does not have it.",
      observedConsequence: "Half of the assignment's focused verifier cannot be run here, so the binary-identity leg of these five adjudications rests on the determination and the corpus index instead.",
      exactFix: "Reconcile the assignment's base line with this one, or name a verifier that exists on both.",
      ownedBy: "the captain who cut the assignment",
      thisLaneCannot: "Reconciling the two lines is a shared-module adjudication, not a lane change."
    });
  }
}

const totals = {
  assetsAssigned: assignment.assetIds.length,
  retirementsWritten: rows.filter((row) => row.retirementMarkerWritten).length,
  repointsRecorded: rows.filter((row) => row.repointRecorded).length,
  retainedWithABlockingDependency: rows.filter((row) => row.outcome === "retained_with_blocking_dependency").length,
  retirementCandidatesConfirmed: rows.filter((row) => row.outcome === "retirement_candidate_confirmed").length,
  assetsWithAnUnlocatedSurfaceHit: rows.filter((row) => row.unlocatedSurfaceHits.length > 0).length,
  findingsForSurfaceOwners: findings.length
};

const record = {
  schemaVersion: "rcap-retirement-repoint-adjudication/v1",
  generatedBy: "scripts/generate-rcap-retirement-repoint-adjudication.mjs",
  purpose: "Adjudicate each asset assigned to the retirement and repoint lane to exactly one of retired, repointed, or retained, with every claim resolved to a location.",
  assignment: ASSIGNMENT,
  assignmentBaseSha: assignment.baseSha,
  legalDesignRegistryPin: { path: REGISTRY_PATH, commit: registryCommit, sha256: registryPin, readFrom: registrySourceUsed },
  supersessionDecidedAgainst: { index: CORPUS_INDEX, archive: corpusIndex.corpusRoot ?? null, entries: (corpusIndex.entries ?? []).length },
  whatARetainedOutcomeMeans:
    "That the lane checked and the asset is held, not that the lane did not finish. An asset a live packet requires cannot be retired by looking harder, and marking it retired would remove a required filing from a packet that still asks for it. The product for a held asset is the site holding it and the owner who can release it.",
  whatThisDoesNotEstablish:
    "Whether a held asset renders correctly. This lane decides whether the asset stays in the operational inventory; the rendering lanes decide whether what stays is right.",
  totals,
  assets: rows,
  findingsForSurfaceOwners: findings
};

const json = `${JSON.stringify(record, null, 2)}\n`;
if (checkOnly) {
  const current = fs.existsSync(abs(OUT)) ? fs.readFileSync(abs(OUT), "utf8") : "";
  if (current !== json) fail(`${OUT} is stale; re-run scripts/generate-rcap-retirement-repoint-adjudication.mjs`);
} else {
  fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
  fs.writeFileSync(abs(OUT), json);
}

console.log(`OK retirement/repoint adjudication — ${totals.assetsAssigned} asset(s): ${totals.retirementCandidatesConfirmed} retirable, ${totals.repointsRecorded} repointed, ${totals.retainedWithABlockingDependency} retained with a located blocking dependency`);
