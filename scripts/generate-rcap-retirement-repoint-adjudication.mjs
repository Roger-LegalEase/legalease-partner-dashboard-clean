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
const SOURCE_DIRECT_DIR = "data/rcap-all50/pdf-source-handoffs/source-direct";
const COMPILED_PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";
const GUIDANCE_DIR = "data/rcap-all50/guidance-packets";
const CAPTURED_INDEX_PAGE = "captured_index_page_not_an_official_form";
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

// ---- captured index pages ---------------------------------------------------
// Some assigned assets are not forms at all. They are HTML captures of a
// publisher's forms listing -- the page a person lands on before they reach a
// document -- and the source lane found no binary to acquire because there is
// no document at that address to acquire.
//
// Treating one as a court form is the error to avoid in both directions. It
// cannot be filled, so it must never reach a packet; and it names where the
// real forms live, so deleting the reference without putting that address
// somewhere loses the only pointer the route had.
//
// The rows are read from the source lane's own batches by disposition, never
// inferred from the .html extension: an extension is a guess about a file and
// the disposition is a finding about it.
function capturedIndexPageRows() {
  const byAssetId = new Map();
  if (!fs.existsSync(abs(SOURCE_DIRECT_DIR))) return byAssetId;
  for (const entry of fs.readdirSync(abs(SOURCE_DIRECT_DIR)).sort()) {
    if (!entry.endsWith(".json")) continue;
    const batch = readJson(path.join(SOURCE_DIRECT_DIR, entry));
    for (const row of batch.rows ?? batch.assets ?? []) {
      if (row.disposition !== CAPTURED_INDEX_PAGE) continue;
      byAssetId.set(row.assetId, { ...row, readFrom: path.join(SOURCE_DIRECT_DIR, entry) });
    }
  }
  return byAssetId;
}
const capturedPages = capturedIndexPageRows();

/**
 * Where a compiled engine profile names this file, and as what.
 *
 * The container matters more than the count. profile-registry.ts loads these at
 * run time and packet-planner.ts reads exactly one container -- formCandidates
 * -- to build a plan's sourceFormIds. A file in the inventory containers is
 * recorded as present in the corpus; a file in formCandidates is something a
 * participant's packet can be planned around. Only the second is a route
 * dependency, and conflating them is what makes an index page look like a form.
 */
function compiledProfileSitesFor(fileName) {
  const sites = [];
  if (!fs.existsSync(abs(COMPILED_PROFILE_DIR))) return sites;
  for (const entry of fs.readdirSync(abs(COMPILED_PROFILE_DIR)).sort()) {
    if (!entry.endsWith(".json")) continue;
    const rel = path.join(COMPILED_PROFILE_DIR, entry);
    const text = fs.readFileSync(abs(rel), "utf8");
    if (!text.includes(`"${fileName}"`)) continue;

    const containers = new Set();
    const declaredKinds = new Set();
    const walk = (node, at) => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => {
          if (JSON.stringify(item).includes(fileName)) walk(item, at);
        });
        return;
      }
      if (!node || typeof node !== "object") return;
      if (node.fileName === fileName) {
        containers.add(at);
        if (node.kind) declaredKinds.add(node.kind);
        return;
      }
      for (const [key, value] of Object.entries(node)) {
        if (value && typeof value === "object" && JSON.stringify(value).includes(fileName)) walk(value, `${at}.${key}`);
      }
    };
    walk(JSON.parse(text), "");

    const lines = [];
    text.split("\n").forEach((line, index) => {
      if (line.includes(`"fileName": "${fileName}"`)) lines.push(index + 1);
    });

    sites.push({
      surface: "compiled_engine_profile",
      file: rel,
      lines,
      containers: [...containers].sort(),
      declaredKind: [...declaredKinds].sort(),
      // The one container the participant route reads.
      namedInFormCandidates: [...containers].some((container) => container.includes("formCandidates"))
    });
  }
  return sites;
}

/**
 * Anything else under src/ that names the file, matched as a whole quoted value.
 *
 * Substring matching finds the wrong asset here and it is not a near miss:
 * "criminal-record-expungement.html" is a substring of Pennsylvania's
 * "apply-for-criminal-record-expungement.html", which is a different capture of
 * a different publisher classified differently. A dependency invented that way
 * would hold an asset that nothing actually names.
 */
function applicationSourceSitesForFileName(fileName) {
  const sites = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx|mjs|js|json)$/.test(entry.name)) continue;
      const rel = path.relative(rootDir, full);
      if (rel.startsWith(COMPILED_PROFILE_DIR)) continue;
      const text = fs.readFileSync(full, "utf8");
      const quoted = `"${fileName}"`;
      if (!text.includes(quoted)) continue;
      sites.push({
        surface: "application_source",
        file: rel,
        line: text.slice(0, text.indexOf(quoted)).split("\n").length,
        matchedAs: "whole_quoted_value"
      });
    }
  };
  walk(abs("src"));
  return sites;
}

/** The corpus census: one row per file present, which is not a use. */
function overlayManifestNames(fileName) {
  const manifest = "data/rcap-all50/overlays/overlay-factory-manifest.json";
  if (!fs.existsSync(abs(manifest))) return false;
  return fs.readFileSync(abs(manifest), "utf8").includes(`"${fileName}"`);
}

/**
 * Retire, repoint or retain a captured index page.
 *
 * Three findings decide it, in order:
 *
 *   1. It is not a court form. Recorded, not assumed -- the source lane's own
 *      disposition says so and the byte identity is an HTML capture.
 *   2. Does the participant route require it? The route requires exactly what
 *      packet-planner.ts can plan around, which is formCandidates and nothing
 *      else. A page named only by the inventory containers is recorded as
 *      present in the corpus, not reachable by a packet.
 *   3. What still names it? A page nothing names retires. A page the route does
 *      not require but a compiled profile still names cannot retire from this
 *      lane -- src/ is prohibited to it -- so what it gets is a recorded
 *      repoint naming the surface that should carry the address instead.
 *
 * The repoint target is a guidance surface rather than a form slot, because
 * what the page is good for is telling a participant where the publisher keeps
 * the real documents. That is guidance, and it is the only thing the page can
 * honestly become.
 */
function adjudicateCapturedIndexPage(asset, sourceRow) {
  const fileName = sourceRow.fileName;
  const sha = asset.assetId.split("|")[2];
  const profileSites = compiledProfileSitesFor(fileName);
  const otherSourceSites = applicationSourceSitesForFileName(fileName);
  const namedByTheCensus = overlayManifestNames(fileName);
  const locatedSites = [...profileSites, ...otherSourceSites];

  const routeSites = profileSites.filter((site) => site.namedInFormCandidates);
  const participantRouteRequiresIt = routeSites.length > 0;
  const misdeclared = profileSites.filter((site) => site.declaredKind.some((kind) => /form|packet/i.test(kind)));

  const guidancePacket = path.join(GUIDANCE_DIR, `${asset.jurisdiction.toLowerCase()}.json`);
  const guidancePacketExists = fs.existsSync(abs(guidancePacket));

  let outcome;
  let outcomeBasis;
  if (locatedSites.length === 0 && asset.useSites.length === 0) {
    outcome = "retirement_candidate_confirmed";
    outcomeBasis = "No operational surface names this captured page at any located site.";
  } else if (participantRouteRequiresIt) {
    outcome = "retained_route_plans_around_a_non_form";
    outcomeBasis =
      `${routeSites.length} compiled profile(s) name this page in formCandidates, so packet-planner.ts can emit it as a packet sourceFormId. ` +
      "That is a defect rather than a dependency to respect -- a listing page cannot be filed -- and it has to be removed from the plan before this asset can move.";
  } else {
    outcome = "repoint_to_guidance_recorded";
    outcomeBasis =
      `The participant route does not require this page: it appears in no formCandidates array, and packet-planner.ts reads no other container when it builds a plan's sourceFormIds. ` +
      `${locatedSites.length} compiled-profile and application-source site(s) still name it, and src/** is prohibited to this lane, so the repoint is recorded here rather than applied.`;
  }

  return {
    assetId: asset.assetId,
    jurisdiction: asset.jurisdiction,
    formNumber: asset.formNumber,
    documentSha256: sha,
    familyIds: asset.familyIds,
    familyDirectories: familyDirectoriesFor(asset.familyIds),
    assetClass: "captured_index_page",
    isACourtForm: false,
    whyItIsNotACourtForm: {
      sourceLaneDisposition: sourceRow.disposition,
      readFrom: sourceRow.readFrom,
      why: sourceRow.why,
      isPdf: sourceRow.isPdf === true,
      publisherOfRecord: sourceRow.searchStartsAt ?? null
    },
    outcome,
    outcomeBasis,
    retirementMarkerWritten: false,
    repointRecorded: outcome === "repoint_to_guidance_recorded",
    determinationSaid: asset.determination,
    determinationBasis: asset.determinationBasis,
    activeTrackStatus: asset.activeTrackStatus,
    affectedTrackIds: asset.affectedTrackIds,
    participantRoute: {
      requiresThisPage: participantRouteRequiresIt,
      decidedBy: "src/lib/rcap-engine/packet-planner.ts builds sourceFormIds from plan.formCandidates and from nothing else",
      namedInFormCandidates: routeSites.map((site) => site.file),
      namedOnlyInInventoryContainers: profileSites
        .filter((site) => !site.namedInFormCandidates)
        .map((site) => ({ file: site.file, containers: site.containers })),
      andThoseContainersAreInternal:
        "src/lib/content/state-resources.ts lists packetGenerator, formInventory and formCandidates in INTERNAL_LEAK_MARKERS, so no public payload may carry them."
    },
    locatedSites,
    surfaceHitsInTheDetermination: asset.useSites.map((site) => site.surface),
    // A compiled-profile hit IS the determination's application_source hit,
    // located; the census hit is located as the manifest row it is. Anything
    // else the determination found and this did not is reported unlocated
    // rather than dropped.
    unlocatedSurfaceHits: asset.useSites
      .map((site) => site.surface)
      .filter((surface) => {
        if (surface === "overlay_factory_manifest") return !namedByTheCensus;
        if (surface === "application_source") return locatedSites.length === 0;
        return true;
      }),
    namedByTheCorpusCensus: namedByTheCensus,
    whyTheCensusIsNotAUse:
      "The overlay factory manifest emits one row per file found in the source corpus. It would name this capture whether or not anything used it, so it records existence rather than use.",
    repointTarget: outcome === "repoint_to_guidance_recorded"
      ? {
          surface: "guidance_packet",
          path: guidancePacket,
          exists: guidancePacketExists,
          publisherOfRecord: sourceRow.searchStartsAt ?? null,
          whatTheGuidanceMustSay:
            "the publisher of record, the address where that publisher keeps the forms, and what the participant does there -- the address this capture was standing in for",
          whatMustNotHappen: "no customer PDF is produced from this asset, because it is a listing and there is nothing on it to fill",
          appliedBy: guidancePacketExists
            ? "the guidance lane: data/rcap-all50/guidance-packets is outside this assignment's allowed paths"
            : "the guidance lane, which must first create a packet for this jurisdiction: none exists",
          thenRetirableBy: "removing the fileName from the compiled engine profile and the state-pack metadata, which is an application change"
        }
      : null,
    // Recorded for the profile's owner. A listing declared as a form is the
    // classification that lets one reach a packet in the first place.
    misdeclaredInTheCompiledProfile: misdeclared.map((site) => ({
      file: site.file,
      lines: site.lines,
      declaredKind: site.declaredKind,
      shouldBe: "a source-discovery reference, not a form or packet"
    }))
  };
}

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

  // A captured index page is adjudicated on its own terms. The PDF path below
  // asks whether the bound bytes are the canonical edition of a form; for a page
  // that is not a form, that question has no answer and asking it anyway is how
  // a listing ends up in a packet.
  if (capturedPages.has(assetId)) {
    rows.push(adjudicateCapturedIndexPage(asset, capturedPages.get(assetId)));
    continue;
  }

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

// A byte identity the determination never probes is a dependency it cannot
// find. The determination's own note says the sha256 is the strongest of its
// three identifier kinds precisely because it cannot collide; an asset whose
// probed set omits it is being held, or released, on the weaker two.
for (const row of rows) {
  const sha = row.documentSha256;
  const asset = determination.assets.find((candidate) => candidate.assetId === row.assetId);
  const probesTheBytes = (asset.probedIdentifiers ?? []).some((identifier) => normalize(identifier) === sha.toUpperCase());
  if (probesTheBytes) continue;
  const reachable = [
    ...dQueueSitesFor(new Set([sha.toUpperCase()])),
    ...applicationSourceSitesFor(sha)
  ];
  if (reachable.length === 0) continue;
  findings.push({
    finding: "the determination does not probe this asset's byte identity, so a surface that pins it by sha256 is invisible to the probe",
    where: { asset: row.assetId, probedIdentifiers: asset.probedIdentifiers, missing: sha },
    mechanism:
      "The determination builds a probed set per asset. This asset's set carries its form number and family ids but not its content hash, so a surface naming the exact bytes is not matched.",
    observedConsequence: `${reachable.length} site(s) pin these bytes and are not reachable by the probe: ` +
      reachable.map((site) => `${site.surface} ${site.file}:${site.line}`).join(", "),
    whyItMatters:
      "A normalized form number can collide with a different form; a content hash cannot. Dropping the hash removes the one identifier that cannot be wrong, which is the identifier a retirement most needs.",
    exactFix: "Add the asset's sha256 to its probed identifiers, as the determination already does on other lines.",
    ownedBy: "the owner of scripts/generate-rcap-pdf-retirement-determination.mjs",
    thisLaneCannot: "The determination generator is outside this assignment's allowed paths, so the finding is recorded rather than applied."
  });
}

const totals = {
  assetsAssigned: assignment.assetIds.length,
  retirementsWritten: rows.filter((row) => row.retirementMarkerWritten).length,
  repointsRecorded: rows.filter((row) => row.repointRecorded).length,
  retainedWithABlockingDependency: rows.filter((row) => row.outcome === "retained_with_blocking_dependency").length,
  retirementCandidatesConfirmed: rows.filter((row) => row.outcome === "retirement_candidate_confirmed").length,
  capturedIndexPages: rows.filter((row) => row.assetClass === "captured_index_page").length,
  capturedIndexPagesRepointedToGuidance: rows.filter((row) => row.outcome === "repoint_to_guidance_recorded").length,
  capturedIndexPagesTheRouteStillPlansAround: rows.filter((row) => row.outcome === "retained_route_plans_around_a_non_form").length,
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

console.log(
  `OK retirement/repoint adjudication — ${totals.assetsAssigned} asset(s): ${totals.retirementCandidatesConfirmed} retirable, ` +
    `${totals.repointsRecorded} repointed, ${totals.retainedWithABlockingDependency} retained with a located blocking dependency; ` +
    `of ${totals.capturedIndexPages} captured index page(s), ${totals.capturedIndexPagesRepointedToGuidance} repointed to guidance and ` +
    `${totals.capturedIndexPagesTheRouteStillPlansAround} still planned around by a route`
);
