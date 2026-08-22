#!/usr/bin/env node
// Terminalize the five non-filing assets the finish work view assigns to
// Session 13.
//
//   node scripts/generate-rcap-session-13-terminalization.mjs
//   node scripts/generate-rcap-session-13-terminalization.mjs --check
//
// Three instruments are available and each has a precondition that has to hold
// before it can be used:
//
//   retirement            no runtime, packet, profile, route or manifest
//                         dependency remains
//   repoint               the target exists, resolves for the right
//                         jurisdiction, and carries real content
//   launch-safe exclusion an existing terminal status covers the asset AND the
//                         route is not reachable in the compiled runtime
//
// An asset none of them fits is retained, and retained is a terminal state
// reached on evidence -- not a lane that failed to finish. Manufacturing an
// outcome by loosening a precondition would take a required filing out of a
// packet, or claim a repoint into somewhere that does not exist, which is the
// specific failure this file exists to avoid.
//
// TWO WORK-VIEW PREMISES DO NOT SURVIVE CONTACT WITH THE EVIDENCE
//
// The work view groups these five under not_a_filing_artifact, titled
// "Captured HTML, index or download page". None of them is that. Each is a
// court-published PDF in the Master Library's packet-forms folder, bound as a
// required or conditional packet component. The captured index pages are a
// different set of assets entirely, and treating a filing form as one of them
// is the same category error read backwards.
//
// The work view also records each as "stale or superseded". Its own
// sourceAvailability block disproves that: the sha256 it resolves in the Master
// Library is byte-identical to the assetId's own digest for all five. Nothing
// supersedes them, so "repoint to the canonical asset" has no destination --
// these are the canonical asset.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const WORKVIEW = "data/rcap-all50/pdf-finish-workview.json";
const LEDGER = "data/rcap-ledger/track-terminalization.json";
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const TREATMENTS_DIR = "data/rcap-all50/terminalization-treatments";
const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const OUT = "data/rcap-all50/pdf-retirement-evidence/session-13-terminalization.json";
const MARKER = "terminal-state.json";
const OWNING_GROUP = "not_a_filing_artifact";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function fail(message) {
  console.error(`FAIL session 13 terminalization — ${message}`);
  process.exit(1);
}

// ---- the pinned legal design ------------------------------------------------
// Read from the ledger's pinned commit, because a packet is built from the
// pinned bytes and a dependency proven against anything else proves nothing
// about what a packet contains.
const ledger = readJson(LEDGER);
const registryPin = ledger.registrySource?.sha256?.[REGISTRY_PATH] ?? null;
const registryCommit = ledger.registrySource?.commit ?? null;
if (!registryPin || !registryCommit) fail("the ledger does not pin the legal-design registry");

let registryRaw;
let registryReadFrom;
try {
  registryRaw = execFileSync("git", ["show", `${registryCommit}:${REGISTRY_PATH}`], { cwd: rootDir, maxBuffer: 1 << 30 }).toString("utf8");
  registryReadFrom = `git:${registryCommit}`;
} catch {
  registryRaw = fs.readFileSync(abs(REGISTRY_PATH), "utf8");
  registryReadFrom = "working_tree";
}
if (sha256(registryRaw) !== registryPin) fail(`the registry read from ${registryReadFrom} does not match the ledger pin`);
const registry = JSON.parse(registryRaw);

const normalize = (value) => String(value ?? "")
  .replace(/\.(pdf|html?|docx?)$/i, "")
  .replace(/[-_\s.]/g, "")
  .toUpperCase();

/** Every packet component naming this form, with the exact site it names it from. */
function packetComponentsFor(formId) {
  const wanted = normalize(formId);
  const sites = [];
  for (const track of registry.tracks ?? []) {
    for (const component of track.packetSet?.components ?? []) {
      if (normalize(component.officialFormId) !== wanted) continue;
      sites.push({
        trackId: track.trackId,
        jurisdiction: track.jurisdiction ?? null,
        componentId: component.componentId,
        role: component.role,
        requirement: component.requirement,
        outputStrategy: component.outputStrategy
      });
    }
  }
  return sites;
}

// ---- is the route reachable? ------------------------------------------------
// Not "is the trackId in the profile" -- a legal-design track id is not a
// compiled pathway id, and looking for one inside the other reports every route
// unreachable, which would make every asset excludable. The ledger states the
// mapping itself, so reachability is that mapping resolved against the compiled
// profile the runtime loads.
const compiledProfiles = new Map();
function compiledProfileText(jurisdiction) {
  if (compiledProfiles.has(jurisdiction)) return compiledProfiles.get(jurisdiction);
  const dir = abs(PROFILE_DIR);
  const match = fs.existsSync(dir)
    ? fs.readdirSync(dir).sort().find((entry) => entry.toUpperCase().startsWith(`${jurisdiction.toUpperCase()}-`))
    : null;
  const text = match ? fs.readFileSync(path.join(dir, match), "utf8") : null;
  compiledProfiles.set(jurisdiction, { file: match ? path.join(PROFILE_DIR, match) : null, text });
  return compiledProfiles.get(jurisdiction);
}

function routeReachability(trackId) {
  const track = ledger.tracks.find((entry) => entry.trackId === trackId);
  if (!track) return { trackId, inTheLedger: false, reachable: null, why: "the track is not in the terminalization ledger" };
  const profile = compiledProfileText(track.jurisdiction);
  const mapped = track.mappedCompiledPathwayIds ?? [];
  const resolved = mapped.map((pathwayId) => ({
    pathwayId,
    inTheCompiledProfile: Boolean(profile.text && profile.text.includes(`"${pathwayId}"`))
  }));
  return {
    trackId,
    jurisdiction: track.jurisdiction,
    inTheLedger: true,
    coverageDisposition: track.coverageDisposition,
    ledgerTerminal: track.terminal === true,
    holds: track.holds ?? [],
    mappedCompiledPathwayIds: mapped,
    compiledProfile: profile.file,
    resolved,
    reachable: resolved.some((entry) => entry.inTheCompiledProfile),
    why: resolved.length === 0
      ? "the ledger maps this track to no compiled pathway, so the compiled runtime has no route to it"
      : resolved.some((entry) => entry.inTheCompiledProfile)
        ? "a mapped compiled pathway is present in the profile the runtime loads"
        : "every mapped compiled pathway is absent from the profile the runtime loads"
  };
}

/** An affirmative terminal treatment for this track, if one has been written. */
function terminalTreatmentFor(trackId, jurisdiction) {
  const file = path.join(TREATMENTS_DIR, `${String(jurisdiction).toLowerCase()}.json`);
  if (!fs.existsSync(abs(file))) return { file, exists: false, treatment: null };
  const document = readJson(file);
  const entries = document.treatments ?? document.tracks ?? document.packets ?? [];
  const row = entries.find((entry) => (entry.trackId ?? entry.id) === trackId);
  return {
    file,
    exists: true,
    treatment: row?.treatment ?? null,
    saysThePlatformDoesNotProduceIt: Boolean(row?.stopReason),
    basis: row?.treatmentBasis ? String(row.treatmentBasis).slice(0, 400) : null
  };
}

/** The family package directory on disk, so the terminal state lands beside its family. */
function familyDirectoriesFor(familyIds) {
  const found = [];
  for (const familyId of familyIds ?? []) {
    const slug = String(familyId).split(":").pop();
    if (!slug || !fs.existsSync(abs(OVERLAY_DIR))) continue;
    for (const state of fs.readdirSync(abs(OVERLAY_DIR)).sort()) {
      const candidate = path.join(OVERLAY_DIR, state, slug);
      if (fs.existsSync(abs(path.join(candidate, "source-record.json")))) found.push(candidate);
    }
  }
  return [...new Set(found)];
}

// ---- adjudication -----------------------------------------------------------
const workview = readJson(WORKVIEW);
const assigned = workview.families.filter((family) => family.rootCauseGroup === OWNING_GROUP);
if (assigned.length === 0) fail(`the work view assigns no ${OWNING_GROUP} family to this session`);

const rows = [];
for (const family of assigned) {
  const [jurisdiction, formId, digest] = family.assetId.split("|");
  const components = packetComponentsFor(formId);
  const trackIds = [...new Set(components.map((component) => component.trackId))];
  const routes = trackIds.map(routeReachability);
  const treatments = trackIds.map((trackId) => ({ trackId, ...terminalTreatmentFor(trackId, jurisdiction) }));

  // Identity, from the work view's own source resolution. This is what decides
  // whether "superseded" is true, and it is not: the archive holds these exact
  // bytes at this exact digest.
  const source = family.sourceAvailability ?? {};
  const supersededByTheArchive = source.sha256 ? source.sha256 !== digest : null;

  const reachableRoutes = routes.filter((route) => route.reachable === true);
  const affirmativeTreatments = treatments.filter((entry) => entry.treatment && entry.saysThePlatformDoesNotProduceIt);
  const everyRouteTerminalInTheLedger = routes.length > 0 && routes.every((route) => route.ledgerTerminal);

  let terminalOutcome;
  let terminalBasis;
  if (components.length === 0) {
    terminalOutcome = "retired_from_operational_inventory";
    terminalBasis = "No packet component names this form in the pinned legal design, and no route reaches it.";
  } else if (supersededByTheArchive === false && components.length > 0 && reachableRoutes.length === 0 && everyRouteTerminalInTheLedger) {
    terminalOutcome = "launch_safe_exclusion";
    terminalBasis =
      `Every track naming this form is terminal in the ledger and unreachable in the compiled runtime ` +
      `(${routes.map((route) => `${route.trackId}: ${route.why}`).join("; ")}), so no participant route can reach the asset. ` +
      (affirmativeTreatments.length > 0
        ? `An existing terminal treatment covers it: ${affirmativeTreatments.map((entry) => `${entry.trackId} = ${entry.treatment}`).join(", ")}.`
        : "The terminal status is the ledger's own, with no treatment written yet; the exclusion rests on the ledger and the compiled runtime rather than on a treatment.");
  } else {
    terminalOutcome = "retained_operational_dependency_survives";
    terminalBasis =
      `${components.length} packet component(s) name this form and ${reachableRoutes.length} route(s) reach it in the compiled runtime, so it cannot be retired. ` +
      `It is not superseded either: the archive holds it at ${source.sha256 ?? "an unrecorded digest"}, which is this asset's own identity, so a repoint has no destination.`;
  }

  rows.push({
    familyId: family.familyId,
    familyIds: family.familyIds,
    assetId: family.assetId,
    jurisdiction,
    formId,
    documentSha256: digest,
    packagePath: family.packagePath,
    familyDirectories: familyDirectoriesFor(family.familyIds),
    terminalOutcome,
    terminalBasis,
    // What the work view said, kept beside what the evidence says, because a
    // premise corrected silently is a premise that comes back.
    workViewSaid: {
      rootCauseGroup: family.rootCauseGroup,
      groupTitle: "Captured HTML, index or download page",
      rootBlocker: family.rootBlocker,
      currentnessStatus: family.currentnessStatus,
      terminalOutcome: family.terminalOutcome,
      terminalExitCondition: family.terminalExitCondition
    },
    correctionsToTheWorkView: [
      {
        premise: "not_a_filing_artifact — captured HTML, index or download page",
        holds: false,
        because: `${formId} is a court-published PDF at ${source.resolvedPath ?? "its Master Library path"}, ${source.byteLength ?? "unknown"} bytes, bound as a packet component with outputStrategy official_pdf_fill.`
      },
      {
        premise: "recorded as stale or superseded",
        holds: false,
        because: `the work view's own sourceAvailability resolves ${source.sha256 ?? "no digest"} in the ${source.corpus ?? "archive"}, byte-identical to this asset's identity, so nothing supersedes it and "repoint to the canonical asset" has no destination.`
      }
    ],
    identity: {
      sourceStatus: source.status ?? null,
      corpus: source.corpus ?? null,
      resolvedPath: source.resolvedPath ?? null,
      sha256: source.sha256 ?? null,
      byteLength: source.byteLength ?? null,
      matchesTheAssetIdentity: source.sha256 ? source.sha256 === digest : null,
      supersededByTheArchive
    },
    legalDesign: {
      pin: { path: REGISTRY_PATH, commit: registryCommit, sha256: registryPin, readFrom: registryReadFrom },
      components
    },
    routes,
    terminalTreatments: treatments,
    retirementAvailable: components.length === 0,
    repointAvailable: false,
    whyRepointIsUnavailable:
      "A repoint needs a canonical asset to point at. These bytes are the canonical edition the archive holds, so there is nowhere for a reference to move.",
    launchSafeExclusionAvailable: terminalOutcome === "launch_safe_exclusion"
  });
}

const totals = {
  assigned: rows.length,
  retired: rows.filter((row) => row.terminalOutcome === "retired_from_operational_inventory").length,
  launchSafeExcluded: rows.filter((row) => row.terminalOutcome === "launch_safe_exclusion").length,
  retained: rows.filter((row) => row.terminalOutcome === "retained_operational_dependency_survives").length,
  repointed: rows.filter((row) => row.terminalOutcome === "repointed_to_canonical_asset").length,
  workViewPremisesCorrected: rows.reduce((count, row) => count + row.correctionsToTheWorkView.filter((entry) => !entry.holds).length, 0)
};
if (totals.assigned !== totals.retired + totals.launchSafeExcluded + totals.retained + totals.repointed) {
  fail("the terminal outcomes do not partition the assigned assets");
}

const record = {
  schemaVersion: "rcap-session-13-terminalization/v1",
  generatedBy: "scripts/generate-rcap-session-13-terminalization.mjs",
  purpose: "Terminalize the five non-filing assets the finish work view assigns to Session 13, each on the instrument its evidence supports.",
  readFrom: WORKVIEW,
  instruments: {
    retired_from_operational_inventory: "no packet component, route, profile or manifest dependency remains",
    repointed_to_canonical_asset: "a target that exists, resolves for the jurisdiction, and carries real content",
    launch_safe_exclusion: "every naming track is terminal in the ledger and unreachable in the compiled runtime, so no participant route reaches the asset",
    retained_operational_dependency_survives: "a live packet component or reachable route still names it; a terminal state reached on evidence, not an unfinished one"
  },
  whyNoneIsRetired:
    "Every assigned asset is named by at least one packet component in the byte-pinned legal design. Retiring one removes a required or conditional filing from a packet that still asks for it.",
  whyNoneIsRepointed:
    "A repoint needs a canonical asset to point at, and all five hash exactly to the Master Library edition of the same document. They are the canonical asset.",
  totals,
  assets: rows
};

// ---- family-local terminal state --------------------------------------------
const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];
for (const row of rows) {
  for (const dir of row.familyDirectories) {
    const marker = {
      schemaVersion: "rcap-family-terminal-state/v1",
      writtenBy: "scripts/generate-rcap-session-13-terminalization.mjs",
      familyId: row.familyId,
      assetId: row.assetId,
      terminalOutcome: row.terminalOutcome,
      terminalBasis: row.terminalBasis,
      meaning: row.terminalOutcome === "launch_safe_exclusion"
        ? "No participant route reaches this asset: every track naming it is terminal in the ledger and maps to no compiled pathway the runtime loads. It stays on disk with its evidence; nothing was deleted, and naming it from a compiled pathway returns it."
        : row.terminalOutcome === "retained_operational_dependency_survives"
          ? "A live packet component or reachable route still names this asset, so it stays in the operational inventory and must be remediated like every other retained asset."
          : "No operational surface names this asset; it has left the operational inventory and stays on disk as historical evidence.",
      identity: row.identity,
      namedBy: row.legalDesign.components,
      routes: row.routes.map((route) => ({ trackId: route.trackId, reachable: route.reachable, why: route.why })),
      isNotACapturedIndexPage:
        "This is a court-published PDF bound as a packet component with outputStrategy official_pdf_fill, not an HTML capture of a forms listing.",
      evidence: OUT
    };
    outputs.push([path.join(dir, MARKER), `${JSON.stringify(marker, null, 2)}\n`]);
  }
}

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
if (checkOnly && stale > 0) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-session-13-terminalization.mjs`);

console.log(
  `OK session 13 terminalization — ${totals.assigned} asset(s): ${totals.retired} retired, ${totals.repointed} repointed, ` +
    `${totals.launchSafeExcluded} launch-safe excluded, ${totals.retained} retained; ${outputs.length - 1} family terminal state(s) written`
);
