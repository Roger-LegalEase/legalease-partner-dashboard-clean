// Canonical bidirectional crosswalk: registry track ↔ compiled runtime pathway.
//
// Milestone 1 item 2. Until this existed the two universes could only be
// reconciled by jurisdiction count, because they share no identifier space:
// registry ids are short slugs (`ak-courtview`), compiled ids are descriptive
// slugs (`confidentiality-of-acquittals-...-22-35-030-...`). No committed file
// mentions both. This writer joins them on substance instead of identity, and
// refuses to join where the substance is not decisive.
//
// Inputs
//   data/rcap-ledger/registry-crosswalk-projection.json   497 tracks, pinned
//   src/lib/rcap-engine/compiled/profiles/*.json          324 pathways, live
//
// Output
//   data/rcap-ledger/track-pathway-crosswalk.json         both directions
//   docs/record-clearing/track-pathway-crosswalk.md       generated report
//
//   node scripts/generate-rcap-track-pathway-crosswalk.mjs
//   node scripts/generate-rcap-track-pathway-crosswalk.mjs --check
//
// Evidence policy. A mapping is only `exact` when a statutory citation shared
// between the two sides resolves to exactly one track and exactly one pathway.
// Name similarity is never evidence. Anything less decisive is recorded as
// unresolved with the missing evidence named, never guessed into a mapping.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectionPath = path.join(rootDir, "data/rcap-ledger/registry-crosswalk-projection.json");
const profileDir = path.join(rootDir, "src/lib/rcap-engine/compiled/profiles");
const outPath = path.join(rootDir, "data/rcap-ledger/track-pathway-crosswalk.json");
const reportPath = path.join(rootDir, "docs/record-clearing/track-pathway-crosswalk.md");

const checkOnly = process.argv.includes("--check");

if (!fs.existsSync(projectionPath)) {
  console.error("No registry projection. Run npm run rcap:registry-projection first.");
  process.exit(1);
}
const projection = JSON.parse(fs.readFileSync(projectionPath, "utf8"));

// ---------------------------------------------------------------------------
// Statutory citation spines
//
// A spine is the ordered tuple of numeric groups inside one citation, joined
// only by . - : / — the punctuation every state uses inside a section number.
// `AS 12.55.085` and the compiled slug `...-as-12-55-085` both yield 12·55·85.
// Two groups are required: a bare section number is not discriminating, and
// matching on one would manufacture mappings this crosswalk exists to refuse.
// ---------------------------------------------------------------------------

const SPINE = /(?:[0-9]+[a-z]?)(?:[.\-:/][0-9]+[a-z]?)+/g;

// Form revision dates sit inside the same strings as citations — `TF-800 (5/25)`
// would otherwise yield the spine 5·25 and collide with any real section
// numbered that way. Strip the parenthesised revision before extracting.
const REVISION_DATE = /\(\s*[0-9]{1,2}\s*\/\s*[0-9]{2,4}\s*\)/g;

function spines(text) {
  if (!text) return new Set();
  const normalized = String(text).toLowerCase().replace(REVISION_DATE, " ").replace(/§/g, " ");
  const found = new Set();
  for (const match of normalized.match(SPINE) || []) {
    const groups = (match.match(/[0-9]+[a-z]?/g) || []).map((g) => g.replace(/^0+(?=[0-9])/, ""));
    if (groups.length >= 2) found.add(groups.join("."));
  }
  return found;
}

function unionSpines(values) {
  const out = new Set();
  for (const value of values) for (const s of spines(value)) out.add(s);
  return out;
}

function normalizeForm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.(pdf|html?|docx?)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Punctuation fold used by adjudication-license checks: `99-19-71(1)` and the
// slug form `99-19-71-1` must compare equal.
function foldText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/§/g, "-")
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace(/\(/g, "-")
    .replace(/\)/g, "");
}

// A form reference is only usable as a join key when it is specific enough to
// name one document. Bare words and very short tokens are dropped.
function formKeys(values) {
  const out = new Set();
  for (const value of values) {
    const key = normalizeForm(value);
    if (key.length >= 4 && /[0-9]/.test(key)) out.add(key);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Load both universes
// ---------------------------------------------------------------------------

// A registry authority list leads with the operative statute and continues with
// supporting citations. Only the operative one identifies the track: matching a
// supporting citation maps a pathway onto whichever unrelated track happens to
// mention that section, which is how `40-32-101` reached a mistaken-identity
// track whose own remedy is `40-32-106(a)(1)(H)`. Supporting citations are kept
// as corroboration and never resolve a mapping on their own.
const registryTracks = projection.tracks.map((track) => ({
  ...track,
  authoritySpines: unionSpines(track.authority.slice(0, 1)),
  supportingSpines: unionSpines(track.authority.slice(1)),
  formKeys: formKeys(track.officialFormRefs),
  scopedOutSpines: (() => {
    const map = new Map();
    for (const statement of track.scopedOutStatements || []) {
      for (const spine of spines(statement.text)) {
        if (!map.has(spine)) map.set(spine, statement);
      }
    }
    return map;
  })(),
}));

const compiledPathways = [];
for (const file of fs.readdirSync(profileDir).filter((f) => f.endsWith(".json")).sort()) {
  const profile = JSON.parse(fs.readFileSync(path.join(profileDir, file), "utf8"));
  const code = String(profile.jurisdiction?.code || profile.jurisdiction).toUpperCase();
  const generatorByPathway = new Map(
    (profile.packetGenerator?.pathways || []).map((p) => [p.pathwayId, p])
  );
  for (const pathway of profile.pathways || []) {
    const generator = generatorByPathway.get(pathway.id) || {};
    compiledPathways.push({
      jurisdiction: code,
      pathwayId: pathway.id,
      label: pathway.label ?? null,
      profilePath: `src/lib/rcap-engine/compiled/profiles/${file}`,
      routeType: pathway.routeType ?? null,
      automatic: pathway.automatic === true,
      packetMode: generator.mode ?? null,
      formMappingStatus: generator.formMappingStatus ?? null,
      identitySpines: unionSpines([pathway.id, pathway.label]),
      formKeys: formKeys((generator.formCandidates || []).map((c) => c.fileName)),
      // Full committed text of the pathway, punctuation-folded, so an
      // adjudication license can be re-verified against it on every run.
      corpus: foldText(
        [pathway.id, pathway.label, pathway.summary]
          .concat(pathway.ruleClauses || [])
          .concat(pathway.waitingRules || [])
          .map((v) => String(v ?? ""))
          .join(" ")
      ),
    });
  }
}

// Whole-profile corpora for adjudication licenses whose citations live in a
// profile's source sections rather than a pathway row.
const profileCorpusByPath = new Map();
for (const file of fs.readdirSync(profileDir).filter((f) => f.endsWith(".json")).sort()) {
  profileCorpusByPath.set(
    `src/lib/rcap-engine/compiled/profiles/${file}`,
    foldText(fs.readFileSync(path.join(profileDir, file), "utf8"))
  );
}

const registryByJurisdiction = new Map();
for (const track of registryTracks) {
  if (!registryByJurisdiction.has(track.jurisdiction)) registryByJurisdiction.set(track.jurisdiction, []);
  registryByJurisdiction.get(track.jurisdiction).push(track);
}

// ---------------------------------------------------------------------------
// Candidate edges. Same jurisdiction is mandatory — a track never serves a
// pathway in another state — and every edge carries the evidence that produced
// it, so nothing downstream has to trust an unlabelled link.
// ---------------------------------------------------------------------------

const edges = new Map(); // pathwayKey -> Map(trackId -> {evidence[], spines[], forms[]})
const backEdges = new Map(); // trackKey -> Map(pathwayId -> same)

const keyOf = (jurisdiction, id) => `${jurisdiction}:${id}`;

for (const pathway of compiledPathways) {
  const pathwayKey = keyOf(pathway.jurisdiction, pathway.pathwayId);
  for (const track of registryByJurisdiction.get(pathway.jurisdiction) || []) {
    const sharedSpines = [...pathway.identitySpines].filter((s) => track.authoritySpines.has(s)).sort();
    const supportingSpines = [...pathway.identitySpines].filter((s) => track.supportingSpines.has(s)).sort();
    const sharedForms = [...pathway.formKeys].filter((f) => track.formKeys.has(f)).sort();
    if (sharedSpines.length === 0 && supportingSpines.length === 0 && sharedForms.length === 0) continue;
    const evidence = [];
    if (sharedSpines.length > 0) evidence.push("shared_operative_statutory_citation");
    if (supportingSpines.length > 0) evidence.push("shared_supporting_statutory_citation");
    if (sharedForms.length > 0) evidence.push("shared_official_form");
    const record = { evidence, sharedSpines, supportingSpines, sharedForms };
    if (!edges.has(pathwayKey)) edges.set(pathwayKey, new Map());
    edges.get(pathwayKey).set(track.trackId, record);
    const trackKey = keyOf(track.jurisdiction, track.trackId);
    if (!backEdges.has(trackKey)) backEdges.set(trackKey, new Map());
    backEdges.get(trackKey).set(pathway.pathwayId, record);
  }
}

// ---------------------------------------------------------------------------
// Classification
//
// Vocabulary follows the committed batch-1 authority crosswalk
// (`crosswalkDisposition`: exact_current_track / missing_from_current_normalization)
// rather than introducing a second set of words for the same ideas.
// ---------------------------------------------------------------------------

const pathwayResults = new Map();
const trackMappings = new Map(); // trackId -> [{pathwayId, relation, evidence}]
// Pass 1 records the pathways that resolve to a single track; pass 2 decides
// what a track claimed by several of them means. Deciding inside pass 1 would
// have to guess, because the competing pathway may not have been seen yet.
const tentative = [];

function addTrackMapping(jurisdiction, trackId, entry) {
  const key = keyOf(jurisdiction, trackId);
  if (!trackMappings.has(key)) trackMappings.set(key, []);
  trackMappings.get(key).push(entry);
}

for (const pathway of compiledPathways) {
  const pathwayKey = keyOf(pathway.jurisdiction, pathway.pathwayId);
  const candidates = edges.get(pathwayKey) || new Map();

  // Statutory candidates decide; a shared form alone corroborates but never
  // resolves, because one official form is routinely filed for several tracks.
  const statutory = [...candidates.entries()].filter(([, r]) =>
    r.evidence.includes("shared_operative_statutory_citation")
  );

  if (statutory.length === 1) {
    const [trackId, record] = statutory[0];
    tentative.push({ pathway, pathwayKey, trackId, record });
    continue;
  }

  if (statutory.length > 1) {
    const ids = statutory.map(([t]) => t).sort();
    pathwayResults.set(pathwayKey, {
      registryRelation: "unresolved_ambiguous_candidates",
      mappedRegistryTrackIds: [],
      mappingEvidence: ["shared_operative_statutory_citation"],
      evidenceDetail: { candidateRegistryTrackIds: ids },
      coMappedPathwayIds: [],
      contributesToRuntimeCoverage: false,
      contributesToRegistryDenominator: false,
      unresolvedReason: "several registry tracks in this jurisdiction cite the same statutory section",
      missingEvidence: [
        "subsection-level authority pinning on the registry track, or a component/form identifier unique to one track",
      ],
    });
    continue;
  }

  // No statutory candidate. A specific official form can still decide it, but
  // only when that form names exactly one track and exactly one pathway: the
  // same form is routinely filed for several tracks, so a shared form that is
  // not unique on both sides proves nothing.
  const formCandidates = [...candidates.entries()].filter(([, r]) =>
    r.evidence.includes("shared_official_form")
  );
  if (formCandidates.length === 1) {
    const [trackId, record] = formCandidates[0];
    const claimants = [...(backEdges.get(keyOf(pathway.jurisdiction, trackId)) || new Map()).entries()]
      .filter(([, r]) => r.evidence.includes("shared_official_form"))
      .map(([pid]) => pid);
    if (claimants.length === 1) {
      tentative.push({ pathway, pathwayKey, trackId, record });
      continue;
    }
  }

  // A registry track may still account for the pathway by naming its authority
  // as a matter routed *outside* that track — the registry's own way of
  // registering a mechanism it deliberately does not carry.
  const scopedOut = [];
  for (const track of registryByJurisdiction.get(pathway.jurisdiction) || []) {
    for (const spine of pathway.identitySpines) {
      const statement = track.scopedOutSpines.get(spine);
      if (statement) {
        scopedOut.push({ registryTrackId: track.trackId, spine, field: statement.field, statement: statement.text });
        break;
      }
    }
  }

  if (scopedOut.length > 0) {
    pathwayResults.set(pathwayKey, {
      registryRelation: "registry_scoped_out_named_authority",
      mappedRegistryTrackIds: [],
      mappingEvidence: ["registry_scope_restriction_names_this_authority"],
      evidenceDetail: { scopedOutBy: scopedOut.sort((a, b) => a.registryTrackId.localeCompare(b.registryTrackId)) },
      coMappedPathwayIds: [],
      contributesToRuntimeCoverage: false,
      contributesToRegistryDenominator: false,
      unresolvedReason: null,
      missingEvidence: [],
    });
    continue;
  }

  const formOnly = [...candidates.keys()].sort();
  pathwayResults.set(pathwayKey, {
    registryRelation: formOnly.length > 0 ? "unresolved_ambiguous_candidates" : "unresolved_no_candidate",
    mappedRegistryTrackIds: [],
    mappingEvidence: formOnly.length > 0 ? ["shared_official_form"] : [],
    evidenceDetail: formOnly.length > 0 ? { candidateRegistryTrackIds: formOnly } : {},
    coMappedPathwayIds: [],
    contributesToRuntimeCoverage: false,
    contributesToRegistryDenominator: false,
    unresolvedReason:
      formOnly.length > 0
        ? "only a shared official form links these, which does not identify one track"
        : "no statutory citation, official form or scope restriction links this pathway to any registry track in its jurisdiction",
    missingEvidence:
      formOnly.length > 0
        ? ["a statutory citation on the compiled pathway, or a component identifier unique to one track"]
        : [
            "a statutory citation in the compiled pathway id or label",
            "or an official form identifier shared with a registry track",
          ],
  });
}

// Pass 2. A track claimed by one pathway is a one-to-one mapping. A track
// claimed by several is only a variant decomposition when the registry itself
// declares the track composed — `compositionMode` or a unit list. Without that
// declaration the shared citation is a section-level collision between distinct
// remedies, not a finer slicing of one, so it fails closed to unresolved.
const claimsByTrack = new Map();
for (const entry of tentative) {
  const key = keyOf(entry.pathway.jurisdiction, entry.trackId);
  if (!claimsByTrack.has(key)) claimsByTrack.set(key, []);
  claimsByTrack.get(key).push(entry);
}

const registryByKey = new Map(registryTracks.map((t) => [keyOf(t.jurisdiction, t.trackId), t]));

for (const [trackKey, claims] of claimsByTrack) {
  const track = registryByKey.get(trackKey);
  const declaresComposition = Boolean(track.compositionMode) || track.unitCount > 0;
  const siblings = claims.map((c) => c.pathway.pathwayId).sort();

  if (claims.length > 1 && !declaresComposition) {
    for (const claim of claims) {
      pathwayResults.set(claim.pathwayKey, {
        registryRelation: "unresolved_ambiguous_candidates",
        mappedRegistryTrackIds: [],
        mappingEvidence: claim.record.evidence,
        evidenceDetail: {
          candidateRegistryTrackIds: [claim.trackId],
          competingCompiledPathwayIds: siblings.filter((p) => p !== claim.pathway.pathwayId),
          sharedStatutoryCitations: claim.record.sharedSpines,
        },
        coMappedPathwayIds: [],
        contributesToRuntimeCoverage: false,
        contributesToRegistryDenominator: false,
        unresolvedReason:
          "several compiled pathways share this track's statutory section and the registry does not declare the track composed",
        missingEvidence: [
          "a composition declaration on the registry track, or subsection-level authority separating these pathways",
        ],
      });
    }
    continue;
  }

  const relation = claims.length === 1 ? "direct_runtime_representation" : "compiled_variant_of_registry_track";
  for (const claim of claims) {
    pathwayResults.set(claim.pathwayKey, {
      registryRelation: relation,
      mappedRegistryTrackIds: [claim.trackId],
      mappingEvidence: claim.record.evidence,
      evidenceDetail: {
        sharedStatutoryCitations: claim.record.sharedSpines,
        sharedOfficialForms: claim.record.sharedForms,
        ...(claims.length > 1
          ? { registryCompositionMode: track.compositionMode, registryComposedUnitCount: track.unitCount }
          : {}),
      },
      coMappedPathwayIds: siblings.filter((p) => p !== claim.pathway.pathwayId),
      contributesToRuntimeCoverage: true,
      contributesToRegistryDenominator: false,
      unresolvedReason: null,
      missingEvidence: [],
    });
    addTrackMapping(claim.pathway.jurisdiction, claim.trackId, {
      pathwayId: claim.pathway.pathwayId,
      relation,
      evidence: claim.record.evidence,
    });
  }
}

// ---------------------------------------------------------------------------
// Adjudicated relationships
//
// Automatic matching stops where committed evidence stops. The adjudication
// input carries relationships a human lane resolved from deeper committed
// sources, each with a machine-verifiable license this generator re-checks on
// every run: the license tokens must still exist in the pathway's own
// committed text and in the pinned registry projection. A registry or profile
// edit that withdraws the evidence turns the build red instead of silently
// keeping the mapping. An adjudication may only land on a row the automatic
// pass left unresolved — it refines the matcher's refusals, never overrides
// its findings.
// ---------------------------------------------------------------------------

const adjudicationPath = path.join(rootDir, "data/rcap-ledger/crosswalk-adjudications.json");
const adjudicationDoc = fs.existsSync(adjudicationPath)
  ? JSON.parse(fs.readFileSync(adjudicationPath, "utf8"))
  : null;

const registryGapBlockers = [];

function adjudicationFailure(message) {
  console.error(`Adjudication drift: ${message}`);
  process.exit(1);
}

if (adjudicationDoc) {
  if (adjudicationDoc.registryProjectionCommit !== projection.source.commit) {
    adjudicationFailure(
      `adjudications pinned to registry commit ${adjudicationDoc.registryProjectionCommit}, projection is at ${projection.source.commit}`
    );
  }
  const pathwayByKey = new Map(compiledPathways.map((p) => [keyOf(p.jurisdiction, p.pathwayId), p]));
  const trackByKey = new Map(registryTracks.map((t) => [keyOf(t.jurisdiction, t.trackId), t]));
  const trackLicenseBlob = (track) =>
    foldText(
      [
        track.legalName,
        track.mechanismExcerpt,
        (track.dispositions || []).join(" "),
        (track.authority || []).join(" "),
        (track.unitIds || []).join(" "),
        track.compositionMode,
      ].join(" ")
    );

  const MAPPED_ADJ = new Set([
    "direct_runtime_representation",
    "compiled_variant_of_registry_track",
    "composed_unit_of_registry_track",
  ]);
  const RELIEF_ROUTE_TYPES = new Set(["court_filing", "pardon_then_court", "automatic"]);

  for (const adj of adjudicationDoc.adjudications || []) {
    const key = keyOf(adj.jurisdiction, adj.compiledPathwayId);
    const pathway = pathwayByKey.get(key);
    if (!pathway) adjudicationFailure(`${key} does not exist in the compiled profiles`);
    const current = pathwayResults.get(key);
    if (!current || !current.registryRelation.startsWith("unresolved")) {
      adjudicationFailure(`${key} is ${current?.registryRelation ?? "unclassified"}, not unresolved — the adjudication is stale`);
    }
    const license = adj.license || {};

    if (MAPPED_ADJ.has(adj.relation)) {
      if (!Array.isArray(adj.mappedRegistryTrackIds) || adj.mappedRegistryTrackIds.length === 0) {
        adjudicationFailure(`${key} maps to no registry track`);
      }
      const track = trackByKey.get(keyOf(adj.jurisdiction, adj.mappedRegistryTrackIds[0]));
      if (!track) adjudicationFailure(`${key} maps to unknown track ${adj.mappedRegistryTrackIds[0]}`);
      const blob = trackLicenseBlob(track);
      if (license.kind === "operative_citation_in_pathway") {
        for (const token of license.citationTokens || []) {
          if (!pathway.corpus.includes(foldText(token))) {
            adjudicationFailure(`${key} citation token "${token}" no longer in the pathway text`);
          }
        }
        if (!(license.citationTokens || []).some((token) => blob.includes(foldText(token).split("-")[0]))) {
          adjudicationFailure(`${key} citation no longer corroborated by track ${track.trackId}`);
        }
      } else if (
        license.kind === "mechanism_identity" ||
        license.kind === "registry_declared_branching" ||
        license.kind === "registry_declared_units"
      ) {
        for (const token of license.pathwayTokens || []) {
          if (!pathway.corpus.includes(foldText(token))) {
            adjudicationFailure(`${key} pathway token "${token}" no longer in the pathway text`);
          }
        }
        for (const token of license.registryTokens || []) {
          if (!blob.includes(foldText(token))) {
            adjudicationFailure(`${key} registry token "${token}" no longer on track ${track.trackId}`);
          }
        }
        if (license.kind === "registry_declared_branching") {
          const declares =
            (track.dispositions || []).length >= 2 ||
            Boolean(track.compositionMode) ||
            (track.unitIds || []).length > 0 ||
            /categories|routes|grounds|either of|one of these|or where/.test(String(track.mechanismExcerpt || "").toLowerCase());
          if (!declares) adjudicationFailure(`${key} branching license but track ${track.trackId} declares no branching`);
        }
        if (license.kind === "registry_declared_units") {
          if (!(track.unitIds || []).includes((license.registryTokens || [])[0])) {
            adjudicationFailure(`${key} unit "${(license.registryTokens || [])[0]}" not declared on track ${track.trackId}`);
          }
        }
      } else {
        adjudicationFailure(`${key} mapped relation with unsupported license kind "${license.kind}"`);
      }
    } else if (adj.relation === "routing_or_supporting_path") {
      if (RELIEF_ROUTE_TYPES.has(pathway.routeType)) {
        adjudicationFailure(`${key} routing classification on relief routeType ${pathway.routeType}`);
      }
      for (const token of license.pathwayTokens || []) {
        if (!pathway.corpus.includes(foldText(token))) {
          adjudicationFailure(`${key} routing token "${token}" no longer in the pathway text`);
        }
      }
    } else if (adj.relation === "registry_scoped_out_named_authority") {
      // The registry names this pathway's authority as routed outside its
      // tracks. License: the token must still appear in a scoped-out statement
      // of the named track.
      const scopingTrack = trackByKey.get(keyOf(adj.jurisdiction, license.scopedOutByTrackId));
      if (!scopingTrack) adjudicationFailure(`${key} scoped-out license names unknown track ${license.scopedOutByTrackId}`);
      const statements = (scopingTrack.scopedOutStatements || []).map((s) => foldText(s.text)).join(" ");
      for (const token of license.registryTokens || []) {
        if (!statements.includes(foldText(token))) {
          adjudicationFailure(`${key} scope-restriction token "${token}" no longer on track ${license.scopedOutByTrackId}`);
        }
      }
      if ((license.registryTokens || []).length === 0) {
        adjudicationFailure(`${key} scoped-out adjudication without registry tokens`);
      }
    } else if (adj.relation === "unregistered_relief_mechanism_registry_gap") {
      if (!adj.gapBlocker) adjudicationFailure(`${key} registry gap without a gap blocker record`);
      // Gap citations may live in the profile's source sections rather than
      // the pathway row; license.scope 'profile' widens the search to the
      // profile's committed text.
      const gapCorpus =
        license.scope === "profile" ? profileCorpusByPath.get(pathway.profilePath) ?? pathway.corpus : pathway.corpus;
      if (adj.provisional !== true) {
        for (const token of license.citationTokens || []) {
          if (!gapCorpus.includes(foldText(token))) {
            adjudicationFailure(`${key} gap citation token "${token}" no longer in the ${license.scope === "profile" ? "profile" : "pathway"} text`);
          }
          for (const track of registryByJurisdiction.get(adj.jurisdiction) || []) {
            // Operative authority only: a supporting citation does not
            // register a mechanism.
            if (new RegExp(`(?<![0-9a-z])${foldText(token).replace(/[-]/g, "\\-")}(?![0-9a-z])`).test(foldText((track.authority || [""])[0]))) {
              adjudicationFailure(`${key} gap authority is carried operatively by track ${track.trackId}`);
            }
          }
        }
        if ((license.citationTokens || []).length === 0) {
          adjudicationFailure(`${key} non-provisional gap without citation tokens`);
        }
      }
    } else {
      adjudicationFailure(`${key} unknown adjudicated relation "${adj.relation}"`);
    }

    const mapped = MAPPED_ADJ.has(adj.relation);
    const coverage = mapped && !adj.currencyFlag;
    const scopedOutDetail =
      adj.relation === "registry_scoped_out_named_authority"
        ? {
            scopedOutBy: (license.registryTokens || []).map((token) => ({
              registryTrackId: license.scopedOutByTrackId,
              spine: null,
              field: "scopedOutStatements",
              statement: token,
            })),
          }
        : {};
    pathwayResults.set(key, {
      registryRelation: adj.relation,
      mappedRegistryTrackIds: mapped ? adj.mappedRegistryTrackIds : [],
      mappingEvidence: [`adjudicated_${license.kind}`],
      evidenceDetail: {
        adjudication: { by: adj.adjudicatedBy, evidenceRef: adj.evidenceRef },
        license,
        ...scopedOutDetail,
        ...(adj.operativeAuthority ? { operativeAuthority: adj.operativeAuthority } : {}),
      },
      coMappedPathwayIds: [],
      contributesToRuntimeCoverage: coverage,
      contributesToRegistryDenominator: false,
      unresolvedReason: null,
      missingEvidence: [],
      adjudicated: true,
      ...(adj.currencyFlag ? { currencyFlag: adj.currencyFlag } : {}),
      ...(adj.provisional ? { provisional: true, provisionalReason: adj.provisionalReason ?? null } : {}),
    });
    if (mapped) {
      for (const trackId of adj.mappedRegistryTrackIds) {
        addTrackMapping(adj.jurisdiction, trackId, {
          pathwayId: adj.compiledPathwayId,
          relation: adj.relation,
          evidence: [`adjudicated_${license.kind}`],
          ...(adj.currencyFlag ? { currencyFlag: adj.currencyFlag } : {}),
        });
      }
    }
    if (adj.relation === "unregistered_relief_mechanism_registry_gap") {
      registryGapBlockers.push({
        jurisdiction: adj.jurisdiction,
        compiledPathwayId: adj.compiledPathwayId,
        provisional: adj.provisional === true,
        ...adj.gapBlocker,
      });
    }
  }

  // Fill in sibling links for adjudicated variant/composed groups.
  const adjSiblings = new Map();
  for (const adj of adjudicationDoc.adjudications || []) {
    if (!MAPPED_ADJ.has(adj.relation)) continue;
    for (const trackId of adj.mappedRegistryTrackIds) {
      const trackKey = keyOf(adj.jurisdiction, trackId);
      if (!adjSiblings.has(trackKey)) adjSiblings.set(trackKey, []);
      adjSiblings.get(trackKey).push(adj.compiledPathwayId);
    }
  }
  for (const adj of adjudicationDoc.adjudications || []) {
    if (!MAPPED_ADJ.has(adj.relation)) continue;
    const key = keyOf(adj.jurisdiction, adj.compiledPathwayId);
    const siblings = (adjSiblings.get(keyOf(adj.jurisdiction, adj.mappedRegistryTrackIds[0])) || [])
      .filter((pid) => pid !== adj.compiledPathwayId)
      .sort();
    pathwayResults.get(key).coMappedPathwayIds = siblings;
  }
}

// ---------------------------------------------------------------------------
// Registry-side rows
// ---------------------------------------------------------------------------

const trackRows = registryTracks.map((track) => {
  const key = keyOf(track.jurisdiction, track.trackId);
  const mappings = (trackMappings.get(key) || []).sort((a, b) => a.pathwayId.localeCompare(b.pathwayId));
  const ambiguous = [...(backEdges.get(key) || new Map()).keys()].sort();

  // Ambiguity resolved by exhaustion: a track with no accepted mapping whose
  // candidate pathways have all been classified to other tracks or terminal
  // classes is no longer ambiguous — every candidate is accounted for, each
  // with its own evidence, so what remains is a track with no runtime
  // representation. This is a structural consequence of the pathway rows, not
  // an evidence-free assertion.
  const candidateStates = ambiguous.map((pid) => pathwayResults.get(keyOf(track.jurisdiction, pid)));
  const ambiguityExhausted =
    ambiguous.length > 0 &&
    candidateStates.every(
      (r) =>
        r &&
        !r.registryRelation.startsWith("unresolved") &&
        !(r.mappedRegistryTrackIds || []).includes(track.trackId)
    );

  let disposition;
  if (mappings.length >= 1 && mappings.every((m) => m.currencyFlag)) {
    // Every runtime representation of this track renders from superseded
    // authority text; identity holds but current coverage may not be claimed.
    disposition = "represented_with_superseded_runtime_text";
  } else if (mappings.length === 1 && mappings[0].relation === "direct_runtime_representation") {
    disposition = "exact_current_pathway";
  } else if (mappings.length >= 1) {
    disposition = "represented_by_compiled_variants";
  } else if (ambiguous.length > 0 && !ambiguityExhausted) {
    disposition = "unresolved_ambiguous_candidates";
  } else {
    disposition = "missing_from_compiled_runtime";
  }

  const blocker =
    mappings.length > 0
      ? null
      : ambiguous.length > 0 && !ambiguityExhausted
        ? "candidate compiled pathways exist but no evidence identifies exactly one"
        : ambiguityExhausted
          ? "every candidate compiled pathway resolved to another track or a terminal class; no runtime representation remains"
          : "no compiled pathway in this jurisdiction shares a statutory citation or official form with this track";

  return {
    jurisdiction: track.jurisdiction,
    registryTrackId: track.trackId,
    legalName: track.legalName,
    mechanismAuthority: track.authority,
    outputStrategy: track.outputStrategy,
    compositionMode: track.compositionMode,
    composedUnitCount: track.unitCount,
    mappedCompiledPathwayIds: mappings.map((m) => m.pathwayId),
    relationshipType: mappings.length > 0 ? mappings[0].relation : null,
    mappingEvidence: mappings.length > 0 ? mappings[0].evidence : [],
    compiledCoverageDisposition: disposition,
    ambiguityResolvedByExhaustion: ambiguityExhausted && mappings.length === 0 ? true : undefined,
    candidateCompiledPathwayIds: mappings.length > 0 ? [] : ambiguous,
    blocker,
  };
});

const pathwayRows = compiledPathways.map((pathway) => {
  const result = pathwayResults.get(keyOf(pathway.jurisdiction, pathway.pathwayId));
  return {
    jurisdiction: pathway.jurisdiction,
    compiledPathwayId: pathway.pathwayId,
    label: pathway.label,
    compiledProfilePath: pathway.profilePath,
    routeType: pathway.routeType,
    automatic: pathway.automatic,
    packetMode: pathway.packetMode,
    ...result,
  };
});

// ---------------------------------------------------------------------------
// Aggregates and surplus reconciliation
// ---------------------------------------------------------------------------

const count = (rows, key, value) => rows.filter((r) => r[key] === value).length;

const byJurisdiction = [...new Set([...registryTracks.map((t) => t.jurisdiction), ...compiledPathways.map((p) => p.jurisdiction)])]
  .sort()
  .map((code) => {
    const tracks = trackRows.filter((t) => t.jurisdiction === code);
    const pathways = pathwayRows.filter((p) => p.jurisdiction === code);
    return {
      jurisdiction: code,
      registryTracks: tracks.length,
      compiledPathways: pathways.length,
      delta: pathways.length - tracks.length,
      tracksMapped: tracks.filter((t) => t.mappedCompiledPathwayIds.length > 0).length,
      pathwaysMapped: pathways.filter((p) =>
        ["direct_runtime_representation", "compiled_variant_of_registry_track", "composed_unit_of_registry_track"].includes(p.registryRelation)
      ).length,
      pathwaysScopedOut: count(pathways, "registryRelation", "registry_scoped_out_named_authority"),
      pathwaysTerminalOther:
        count(pathways, "registryRelation", "routing_or_supporting_path") +
        count(pathways, "registryRelation", "unregistered_relief_mechanism_registry_gap"),
      pathwaysUnresolved: pathways.filter((p) => p.registryRelation.startsWith("unresolved")).length,
    };
  });

const surplusJurisdictions = byJurisdiction
  .filter((j) => j.delta > 0)
  .map((j) => {
    const pathways = pathwayRows.filter((p) => p.jurisdiction === j.jurisdiction);
    // A surplus is absorbed when a pathway does not claim a registry track of its
    // own: it is either a finer variant of one, or an authority the registry
    // explicitly routes outside its tracks. Anything still unresolved is surplus
    // that remains unexplained, and is reported as such rather than absorbed.
    const variants = pathways.filter((p) =>
      ["compiled_variant_of_registry_track", "composed_unit_of_registry_track"].includes(p.registryRelation)
    );
    const scopedOut = pathways.filter((p) => p.registryRelation === "registry_scoped_out_named_authority");
    const routing = pathways.filter((p) => p.registryRelation === "routing_or_supporting_path");
    const gaps = pathways.filter((p) => p.registryRelation === "unregistered_relief_mechanism_registry_gap");
    const unresolved = pathways.filter((p) => p.registryRelation.startsWith("unresolved"));
    return {
      jurisdiction: j.jurisdiction,
      delta: j.delta,
      absorbedByVariantDecomposition: variants.map((p) => p.compiledPathwayId),
      absorbedByRegistryScopeRestriction: scopedOut.map((p) => p.compiledPathwayId),
      absorbedByRoutingOrSupporting: routing.map((p) => p.compiledPathwayId),
      absorbedByRegistryGap: gaps.map((p) => ({
        compiledPathwayId: p.compiledPathwayId,
        provisional: p.provisional === true,
      })),
      unexplainedSurplusCandidates: unresolved.map((p) => p.compiledPathwayId),
      fullyExplained: unresolved.length === 0,
    };
  });

const aggregates = {
  registryTracks: trackRows.length,
  compiledPathways: pathwayRows.length,
  registryJurisdictions: new Set(registryTracks.map((t) => t.jurisdiction)).size,
  compiledJurisdictions: new Set(compiledPathways.map((p) => p.jurisdiction)).size,
  tracksExactPathway: count(trackRows, "compiledCoverageDisposition", "exact_current_pathway"),
  tracksRepresentedByVariants: count(trackRows, "compiledCoverageDisposition", "represented_by_compiled_variants"),
  tracksUnresolvedAmbiguous: count(trackRows, "compiledCoverageDisposition", "unresolved_ambiguous_candidates"),
  tracksMissingFromCompiledRuntime: count(trackRows, "compiledCoverageDisposition", "missing_from_compiled_runtime"),
  tracksSupersededRuntimeText: count(trackRows, "compiledCoverageDisposition", "represented_with_superseded_runtime_text"),
  pathwaysDirect: count(pathwayRows, "registryRelation", "direct_runtime_representation"),
  pathwaysVariant: count(pathwayRows, "registryRelation", "compiled_variant_of_registry_track"),
  pathwaysComposedUnit: count(pathwayRows, "registryRelation", "composed_unit_of_registry_track"),
  pathwaysRoutingOrSupporting: count(pathwayRows, "registryRelation", "routing_or_supporting_path"),
  pathwaysRegistryGap: count(pathwayRows, "registryRelation", "unregistered_relief_mechanism_registry_gap"),
  pathwaysScopedOut: count(pathwayRows, "registryRelation", "registry_scoped_out_named_authority"),
  pathwaysAdjudicated: pathwayRows.filter((p) => p.adjudicated === true).length,
  pathwaysCurrencyFlagged: pathwayRows.filter((p) => p.currencyFlag).length,
  pathwaysUnresolvedAmbiguous: count(pathwayRows, "registryRelation", "unresolved_ambiguous_candidates"),
  pathwaysUnresolvedNoCandidate: count(pathwayRows, "registryRelation", "unresolved_no_candidate"),
};
aggregates.tracksWithRuntimeCoverage = aggregates.tracksExactPathway + aggregates.tracksRepresentedByVariants;
aggregates.pathwaysMapped =
  aggregates.pathwaysDirect + aggregates.pathwaysVariant + aggregates.pathwaysComposedUnit;
aggregates.pathwaysTerminal =
  aggregates.pathwaysScopedOut + aggregates.pathwaysRoutingOrSupporting + aggregates.pathwaysRegistryGap;
aggregates.pathwaysUnresolved = aggregates.pathwaysUnresolvedAmbiguous + aggregates.pathwaysUnresolvedNoCandidate;
aggregates.milestone1Item2Closed =
  aggregates.pathwaysUnresolved === 0 && aggregates.tracksUnresolvedAmbiguous === 0;

const unresolvedIds = {
  compiledPathways: pathwayRows
    .filter((p) => p.registryRelation.startsWith("unresolved"))
    .map((p) => `${p.jurisdiction}:${p.compiledPathwayId}`)
    .sort(),
  registryTracks: trackRows
    .filter((t) => t.compiledCoverageDisposition === "unresolved_ambiguous_candidates")
    .map((t) => `${t.jurisdiction}:${t.registryTrackId}`)
    .sort(),
};

const crosswalk = {
  schemaVersion: "rcap-track-pathway-crosswalk/v1",
  generatedBy: "scripts/generate-rcap-track-pathway-crosswalk.mjs",
  note:
    "Bidirectional crosswalk between the nationwide registry tracks and the compiled runtime pathways. " +
    "A mapping is exact only where a shared statutory citation resolves to one track and one pathway, or " +
    "where an adjudication whose evidence license still verifies resolves a row the matcher left unresolved. " +
    "Name similarity is not evidence and never produces a mapping here.",
  registrySource: projection.source,
  compiledSource: { directory: "src/lib/rcap-engine/compiled/profiles", profiles: 51 },
  adjudicationSource: adjudicationDoc
    ? {
        path: "data/rcap-ledger/crosswalk-adjudications.json",
        round: adjudicationDoc.adjudicationRound ?? null,
        entries: (adjudicationDoc.adjudications || []).length,
      }
    : null,
  aggregates,
  unresolvedIds,
  registryGapBlockers: registryGapBlockers.sort((a, b) =>
    a.jurisdiction === b.jurisdiction
      ? a.compiledPathwayId.localeCompare(b.compiledPathwayId)
      : a.jurisdiction.localeCompare(b.jurisdiction)
  ),
  byJurisdiction,
  surplusReconciliation: surplusJurisdictions,
  registryTracks: trackRows,
  compiledPathways: pathwayRows,
};

crosswalk.compiledSource.profiles = new Set(compiledPathways.map((p) => p.profilePath)).size;

// --- two hashes, because they answer two different questions -----------------
//
// `contentHash` covers the crosswalk object alone: which track maps to which
// pathway, the terminal classifications, the aggregates, the denominator. It is
// a SEMANTIC RELATIONSHIP HASH. It deliberately says nothing about the evidence
// those relationships were argued from — evidence can be corrected, repointed
// or reclassified without any conclusion moving, and when that happens
// contentHash is expected to stay put. That is a feature, but it means
// contentHash alone must never be cited as proof that the evidence is unchanged.
//
// `evidenceHash` closes exactly that gap: it pins the bytes of the nine evidence
// packages, the adjudication input that turned them into conclusions, and the
// source-support audit that graded them. Quote it when the claim is "the
// evidence behind this crosswalk has not moved". Together the two are a complete
// relationship-and-evidence pin; separately, each is honest about its scope.
//
// evidenceHash is excluded from contentHash's preimage, so adding it here does
// not perturb the semantic hash of an unchanged crosswalk.
const EVIDENCE_CORPUS = [
  ...fs
    .readdirSync(path.join(rootDir, "data/rcap-ledger/e2-evidence"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => `data/rcap-ledger/e2-evidence/${f}`),
  "data/rcap-ledger/crosswalk-adjudications.json",
  "data/rcap-crosswalk-enrichment/e2-source-support-audit.json"
];

const evidenceFiles = {};
for (const rel of EVIDENCE_CORPUS) {
  const abs = path.join(rootDir, rel);
  evidenceFiles[rel] = fs.existsSync(abs)
    ? crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")
    : null;
}
crosswalk.evidenceSource = {
  note:
    "Bytes of the evidence corpus behind these conclusions. Distinct from contentHash, which covers relationships only and does not move when evidence is corrected.",
  files: evidenceFiles
};
crosswalk.evidenceHash = crypto
  .createHash("sha256")
  .update(JSON.stringify(evidenceFiles))
  .digest("hex");

crosswalk.contentHash = crypto
  .createHash("sha256")
  .update(JSON.stringify({ ...crosswalk, contentHash: undefined, evidenceHash: undefined, evidenceSource: undefined }))
  .digest("hex");

const serialized = `${JSON.stringify(crosswalk, null, 2)}\n`;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const lines = [];
lines.push("# RCAP Track ↔ Pathway Crosswalk");
lines.push("");
lines.push(
  `Generated by \`scripts/generate-rcap-track-pathway-crosswalk.mjs\` from the registry projection pinned at \`${projection.source.commit.slice(0, 10)}\` (Master Library edition ${projection.source.authorityEdition}) and the compiled profiles in this tree.`
);
lines.push("");
lines.push("## What this closes");
lines.push("");
lines.push(
  "The registry and the compiled profiles share no identifier space, and no committed file mentions both. This crosswalk joins them on substance — a statutory citation carried by both sides, or an official form both name — and refuses to join where the substance is not decisive."
);
lines.push("");
lines.push("| Figure | Count |");
lines.push("| --- | ---: |");
lines.push(`| Registry tracks | ${aggregates.registryTracks} |`);
lines.push(`| Compiled pathways | ${aggregates.compiledPathways} |`);
lines.push(`| Registry tracks with an exact compiled pathway | ${aggregates.tracksExactPathway} |`);
lines.push(`| Registry tracks represented by compiled variants | ${aggregates.tracksRepresentedByVariants} |`);
lines.push(`| Registry tracks represented only by superseded runtime text | ${aggregates.tracksSupersededRuntimeText} |`);
lines.push(`| Registry tracks with no compiled pathway | ${aggregates.tracksMissingFromCompiledRuntime} |`);
lines.push(`| Registry tracks unresolved (ambiguous candidates) | ${aggregates.tracksUnresolvedAmbiguous} |`);
lines.push(`| Compiled pathways mapped to a registry track | ${aggregates.pathwaysMapped} |`);
lines.push(`| Compiled pathways terminally classified (scoped-out, routing, registry gap) | ${aggregates.pathwaysTerminal} |`);
lines.push(`| Compiled pathways unresolved | ${aggregates.pathwaysUnresolved} |`);
lines.push("");
lines.push(
  `**Milestone 1 item 2: ${aggregates.milestone1Item2Closed ? "closed" : "blocked"}.** ${aggregates.milestone1Item2Closed ? "Every track and every pathway carries a supported relationship or a terminal classification." : `${aggregates.pathwaysUnresolved} compiled pathways and ${aggregates.tracksUnresolvedAmbiguous} registry tracks remain unresolved. The exact set is enumerated in \`unresolvedIds\` in the JSON and cannot be closed without the missing evidence named on each row.`}`
);
lines.push("");
lines.push("## Relationship vocabulary");
lines.push("");
lines.push("| Term | Side | Meaning |");
lines.push("| --- | --- | --- |");
lines.push("| `exact_current_pathway` | registry | Exactly one compiled pathway, and that pathway claims only this track. |");
lines.push("| `represented_by_compiled_variants` | registry | The runtime decomposes this track into several narrower pathways. |");
lines.push("| `missing_from_compiled_runtime` | registry | No compiled pathway shares this track's authority or forms. |");
lines.push("| `direct_runtime_representation` | compiled | One-to-one with a registry track. |");
lines.push("| `compiled_variant_of_registry_track` | compiled | A narrower runtime slice of one registry track. |");
lines.push("| `represented_with_superseded_runtime_text` | registry | Mapped, but every runtime representation renders from superseded authority text; current coverage is not claimed. |");
lines.push("| `registry_scoped_out_named_authority` | compiled | A registry stop condition names this authority as routed outside its tracks. |");
lines.push("| `composed_unit_of_registry_track` | compiled | One declared unit of a registry track whose composition the registry itself declares. |");
lines.push("| `routing_or_supporting_path` | compiled | A router or support surface, not an independent relief mechanism; the remedy it points at is registered separately. |");
lines.push("| `unregistered_relief_mechanism_registry_gap` | compiled | A substantive relief mechanism the runtime carries but no registry track registers; a blocker for the registry owner, never a denominator change here. |");
lines.push("| `unresolved_ambiguous_candidates` | both | Candidates exist; no evidence isolates one. |");
lines.push("| `unresolved_no_candidate` | compiled | No shared citation, form or scope restriction in the jurisdiction. |");
lines.push("");
if (crosswalk.adjudicationSource) {
  lines.push("## Adjudicated relationships");
  lines.push("");
  lines.push(
    `${aggregates.pathwaysAdjudicated} rows were resolved by adjudication (round: lane ${crosswalk.adjudicationSource.round?.lane ?? "?"} @ \`${crosswalk.adjudicationSource.round?.laneCommit ?? "?"}\`, ${crosswalk.adjudicationSource.entries} entries in \`data/rcap-ledger/crosswalk-adjudications.json\`). Every adjudication carries a machine-verifiable license — tokens that must still exist in the pathway's committed text and in the pinned registry projection — re-checked on every generator run, and may only land on a row automatic matching left unresolved.`
  );
  lines.push("");
}
if (crosswalk.registryGapBlockers.length > 0) {
  lines.push("## Registry-gap blockers");
  lines.push("");
  lines.push(
    "Substantive relief mechanisms the runtime carries with no registry track. Recording a gap changes nothing here — the 497 denominator moves only when the registry owner lands a track through the canonical registry source branch, or records a terminal out-of-scope disposition."
  );
  lines.push("");
  lines.push("| Juris | Compiled pathway | Operative authority | Provisional |");
  lines.push("| --- | --- | --- | --- |");
  for (const gap of crosswalk.registryGapBlockers) {
    lines.push(
      `| ${gap.jurisdiction} | \`${gap.compiledPathwayId}\` | ${gap.operativeAuthority} | ${gap.provisional ? "yes — operative citation not yet pinned" : "no"} |`
    );
  }
  lines.push("");
}
lines.push("## Surplus reconciliation");
lines.push("");
lines.push(
  "Jurisdictions where the runtime compiles more pathways than the registry lists. A surplus is absorbed when a pathway claims no registry track of its own — a finer variant or declared unit of one, an authority the registry routes outside its tracks, a routing surface, or an unregistered mechanism recorded as a registry-owner blocker. No registry track was created and no compiled pathway was dropped to make these balance."
);
lines.push("");
lines.push("| Juris | Delta | Variants/units | Scoped-out | Routing | Registry gaps | Still unresolved | Surplus identified |");
lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
for (const s of surplusJurisdictions) {
  lines.push(
    `| ${s.jurisdiction} | +${s.delta} | ${s.absorbedByVariantDecomposition.length} | ${s.absorbedByRegistryScopeRestriction.length} | ${s.absorbedByRoutingOrSupporting.length} | ${s.absorbedByRegistryGap.length} | ${s.unexplainedSurplusCandidates.length} | ${s.fullyExplained ? "yes" : "no"} |`
  );
}
lines.push("");
lines.push("## Per-jurisdiction coverage");
lines.push("");
lines.push("| Juris | Registry | Compiled | Delta | Tracks mapped | Pathways mapped | Scoped out | Unresolved |");
lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
for (const j of byJurisdiction) {
  lines.push(
    `| ${j.jurisdiction} | ${j.registryTracks} | ${j.compiledPathways} | ${j.delta > 0 ? "+" : ""}${j.delta} | ${j.tracksMapped} | ${j.pathwaysMapped} | ${j.pathwaysScopedOut} | ${j.pathwaysUnresolved} |`
  );
}
lines.push(
  `| **Total** | **${aggregates.registryTracks}** | **${aggregates.compiledPathways}** | **${aggregates.compiledPathways - aggregates.registryTracks}** | **${aggregates.tracksWithRuntimeCoverage}** | **${aggregates.pathwaysMapped}** | **${aggregates.pathwaysScopedOut}** | **${aggregates.pathwaysUnresolved}** |`
);
lines.push("");
lines.push("## What this does not claim");
lines.push("");
lines.push(
  `A mapping is a statement about identity, not about readiness. ${aggregates.tracksWithRuntimeCoverage} of ${aggregates.registryTracks} tracks now have a named runtime representation; none of that makes a track implemented, certified or terminal. Terminal disposition stays a certification property computed by the production factory and recorded in the authority ledger.`
);
lines.push("");

const report = `${lines.join("\n")}\n`;

if (checkOnly) {
  const stale = [];
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, "utf8") !== serialized) stale.push(outPath);
  if (!fs.existsSync(reportPath) || fs.readFileSync(reportPath, "utf8") !== report) stale.push(reportPath);
  if (stale.length > 0) {
    console.error(`Stale generated artifacts:\n${stale.map((p) => `  ${path.relative(rootDir, p)}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Crosswalk current. contentHash ${crosswalk.contentHash.slice(0, 16)}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized, "utf8");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report, "utf8");

console.log(`registryTracks             ${aggregates.registryTracks}`);
console.log(`compiledPathways           ${aggregates.compiledPathways}`);
console.log(`tracksExactPathway         ${aggregates.tracksExactPathway}`);
console.log(`tracksByVariants           ${aggregates.tracksRepresentedByVariants}`);
console.log(`tracksMissingFromRuntime   ${aggregates.tracksMissingFromCompiledRuntime}`);
console.log(`tracksUnresolved           ${aggregates.tracksUnresolvedAmbiguous}`);
console.log(`pathwaysDirect             ${aggregates.pathwaysDirect}`);
console.log(`pathwaysVariant            ${aggregates.pathwaysVariant}`);
console.log(`pathwaysComposedUnit       ${aggregates.pathwaysComposedUnit}`);
console.log(`pathwaysRouting            ${aggregates.pathwaysRoutingOrSupporting}`);
console.log(`pathwaysRegistryGap        ${aggregates.pathwaysRegistryGap}`);
console.log(`pathwaysScopedOut          ${aggregates.pathwaysScopedOut}`);
console.log(`pathwaysAdjudicated        ${aggregates.pathwaysAdjudicated}`);
console.log(`pathwaysUnresolved         ${aggregates.pathwaysUnresolved}`);
console.log(`milestone1Item2Closed      ${aggregates.milestone1Item2Closed}`);
console.log(`contentHash                ${crosswalk.contentHash}`);
console.log(`crosswalk                  ${path.relative(rootDir, outPath)}`);
console.log(`report                     ${path.relative(rootDir, reportPath)}`);
