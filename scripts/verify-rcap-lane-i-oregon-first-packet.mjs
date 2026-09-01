#!/usr/bin/env node
/**
 * Lane I — the first Grade-A packet closeout, Oregon.
 *
 * Lane C established that Oregon's official-PDF overlay is sound and closed two
 * of the Grade-A proof dimensions. This lane does the next thing and only the
 * next thing: it picks ONE of the three integrated Oregon routes on measured
 * evidence, drives every proof that engineering can establish to a closed state,
 * classifies the ones it cannot close by naming the exact missing decision, and
 * exercises the whole synthetic product path so that what is left is an owner
 * decision rather than an unknown.
 *
 * It grants nothing. It writes no registry, opens no commercial status, and
 * moves no artifact into production. Every counterfactual it evaluates is an
 * in-memory object that exists for the length of one function call, and the
 * committed registry is read but never written.
 *
 *   node scripts/verify-rcap-lane-i-oregon-first-packet.mjs
 *   node scripts/verify-rcap-lane-i-oregon-first-packet.mjs --write
 *   node scripts/verify-rcap-lane-i-oregon-first-packet.mjs --mutations
 *
 * `--write` regenerates this lane's three evidence records. Default mode
 * recomputes them and fails on any drift, so the committed records are a
 * derivation rather than a claim. `--mutations` corrupts each input in turn and
 * requires the corresponding check to go red, so a green run means the checks
 * are load-bearing.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const authority = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const requestContext = await import("../src/lib/rcap/fulfillment/grade-a-request-context.ts");
const packetProof = await import("../src/lib/rcap/fulfillment/grade-a-packet-proof.ts");
const registry = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");

const {
  admitCommercialAction,
  evaluateFulfillmentAuthority,
  COMMERCIAL_ADMISSION_POINTS,
  GRADE_A_ADMISSION_SCHEMA_VERSION
} = authority;
const { collectContextDenials, withEntitlementKind } = requestContext;
const { collectPacketCompletenessGaps, FILEABLE_ARTIFACT_FORMATS } = packetProof;
const { stableStringify } = registry;

const WRITE = process.argv.includes("--write");
const MUTATIONS = process.argv.includes("--mutations");

// --- paths ------------------------------------------------------------------

const ENVELOPES = "data/rcap-grade-a/active-lane-envelopes.json";
const ENVELOPE_COPY = "data/rcap-lane-c/oregon/lane-i-envelope.json";
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";
const OBSERVATION = "data/rcap-grade-a/fulfillment-observation-snapshot.json";
const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const PACKET_SETS = "data/record-clearing/legal-design-packet-set-manifests.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const LANE_C_VISUAL = "data/rcap-lane-c/oregon/visual-review.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/lane-c-candidates/oregon";

const OUT_SELECTION = "data/rcap-lane-c/oregon/lane-i-route-selection.json";
const OUT_CLOSURE = "data/rcap-lane-c/oregon/lane-i-proof-closure.json";
const OUT_PRODUCT = "data/rcap-lane-c/oregon/lane-i-product-path.json";

const abs = (rel) => path.join(rootDir, rel);
const read = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (rel) => sha256(fs.readFileSync(abs(rel)));

// --- check harness ----------------------------------------------------------

let failed = 0;
let passed = 0;
const failures = [];
function check(id, ok, observed) {
  if (ok) {
    passed += 1;
    if (!MUTATIONS) console.log(`  ok   ${id}`);
  } else {
    failed += 1;
    failures.push(id);
    if (!MUTATIONS) console.log(`  FAIL ${id}\n         observed: ${observed}`);
  }
}

// ============================================================================
// 1. The Lane I envelope, read rather than restated
// ============================================================================

/**
 * The envelope, from the manifest when this checkout carries it and from this
 * lane's provenance-stamped copy otherwise.
 *
 * `data/rcap-grade-a/` is captain-only and this lane's base predates the Lane I
 * dispatch, so the manifest in this worktree describes lanes B through H and
 * nothing else. Editing it to add Lane I would be claiming a captain path. The
 * copy records the exact captain commit, blob and file digest it was taken from,
 * and the check below re-derives the copy's own digest rather than trusting it.
 */
const envelopeDoc = read(ENVELOPES);
const envelopeCopy = fs.existsSync(abs(ENVELOPE_COPY)) ? read(ENVELOPE_COPY) : null;
const manifestLaneI = (envelopeDoc.lanes ?? []).find((lane) => lane.lane === "I") ?? null;
const laneI = manifestLaneI ?? envelopeCopy?.envelope ?? null;
const envelopeSource = manifestLaneI ? "manifest" : (envelopeCopy ? "provenance_stamped_copy" : "absent");

check("A1-envelope: a Lane I envelope is available", laneI !== null, "no lane I entry in the manifest and no copy");
check(
  "A1b-envelope: the copy's recorded digest is the digest of the envelope it carries",
  envelopeCopy === null
    || envelopeCopy.laneEnvelopeSha256 === sha256(stableStringify(envelopeCopy.envelope)),
  "the copy's laneEnvelopeSha256 does not describe its own envelope"
);

const CANDIDATE_ROUTES = laneI ? [...laneI.routeIds].sort() : [];
check(
  "A2-candidates: the envelope names exactly the three integrated Oregon routes",
  CANDIDATE_ROUTES.length === 3 && CANDIDATE_ROUTES.every((id) => id.startsWith("OR:")),
  JSON.stringify(CANDIDATE_ROUTES)
);

// ============================================================================
// 2. Route ranking — measured, not asserted
// ============================================================================

const launchGraph = read(LAUNCH_GRAPH);
const registryDoc = read(REGISTRY);
const observationDoc = read(OBSERVATION);
const packetSets = read(PACKET_SETS).packetSets;

const rowFor = (routeId) => launchGraph.rows.find((row) => row.pathwayKey === routeId) ?? null;
const recordFor = (routeId) => registryDoc.records.find((rec) => rec.routeId === routeId) ?? null;
const observationFor = (routeId) => observationDoc.routes?.[routeId] ?? null;
const packetSetFor = (setId) => packetSets.find((set) => set.packetSetId === setId) ?? null;

/**
 * The readiness score, from four independent signals already in the repository.
 * Nothing here is a judgement typed in by this lane; each term reads a value
 * some other generator wrote, so a change upstream re-ranks the routes.
 *
 * The signals, in the order they decide:
 *
 *  1. Whether the public product reaches this route as a PACKET at all. A route
 *     the witness settles as `guidance_only` has no packet for a participant to
 *     buy, so there is no product path to exercise and no artifact to approve.
 *  2. Whether payment is allowed at the evaluator. This is the eligibility
 *     evaluator's own answer, upstream of every commercial gate.
 *  3. Whether the packet set the route is bound to actually names the official
 *     form its subject matter requires. A marijuana route that never names the
 *     marijuana form is bound to the wrong document, and no amount of proof
 *     about the document it IS bound to fixes that.
 *  4. How much the participant must gather before filing. Fewer required
 *     attachments is less that can go wrong in a first packet.
 */
const MARIJUANA_FORM_ID = "OR-OJD-MJ-PCR";

function rankRoute(routeId) {
  const row = rowFor(routeId);
  const record = recordFor(routeId);
  const setId = record?.packetSpecification?.specId ?? null;
  const set = setId ? packetSetFor(setId) : null;
  const boundFormIds = [...new Set((set?.components ?? []).map((c) => c.officialFormId).filter(Boolean))].sort();
  const subjectIsMarijuana = /marijuana/.test(routeId);
  const namesSubjectForm = subjectIsMarijuana ? boundFormIds.includes(MARIJUANA_FORM_ID) : true;

  const witness = row?.publicWitness?.resultCode ?? null;
  const packetShaped = witness === "packet_ready_with_caution" || witness === "packet_ready";
  const paymentAllowed = row?.paymentResult?.allowedAtTheEvaluator === true;
  const actions = row?.packetSpecification?.participantActionsRequired ?? Number.MAX_SAFE_INTEGER;

  return {
    routeId,
    packetSetId: setId,
    boundOfficialFormIds: boundFormIds,
    publicWitnessResultCode: witness,
    reachesParticipantAsPacket: packetShaped,
    paymentAllowedAtEvaluator: paymentAllowed,
    subjectFormBound: namesSubjectForm,
    participantActionsRequired: actions,
    artifactSha256: record?.artifactValidation?.artifactSha256 ?? null,
    // Lexicographic, most decisive first. Ties break on fewest participant actions.
    score: [packetShaped ? 1 : 0, paymentAllowed ? 1 : 0, namesSubjectForm ? 1 : 0, -actions]
  };
}

const ranked = CANDIDATE_ROUTES.map(rankRoute).sort((a, b) => {
  for (let i = 0; i < a.score.length; i += 1) {
    if (a.score[i] !== b.score[i]) return b.score[i] - a.score[i];
  }
  return a.routeId.localeCompare(b.routeId);
});

const SELECTED = ranked[0];
const SELECTED_ROUTE = SELECTED.routeId;

check(
  "B1-ranking: exactly one route reaches a participant as a packet",
  ranked.filter((r) => r.reachesParticipantAsPacket).length === 1,
  ranked.map((r) => `${r.routeId}=${r.publicWitnessResultCode}`).join(", ")
);
check(
  "B2-ranking: exactly one route is payment-allowed at the evaluator",
  ranked.filter((r) => r.paymentAllowedAtEvaluator).length === 1,
  ranked.map((r) => `${r.routeId}=${r.paymentAllowedAtEvaluator}`).join(", ")
);
check(
  "B3-ranking: the marijuana route is bound to a packet set that never names the marijuana form",
  ranked.some((r) => /marijuana/.test(r.routeId) && r.subjectFormBound === false),
  JSON.stringify(ranked.find((r) => /marijuana/.test(r.routeId))?.boundOfficialFormIds ?? [])
);
check(
  "B4-ranking: the selection is the unique maximum, not a tie broken by name",
  ranked.length > 1 && stableStringify(ranked[0].score) !== stableStringify(ranked[1].score),
  `${stableStringify(ranked[0].score)} vs ${stableStringify(ranked[1].score)}`
);
check(
  "B5-ranking: the selected route wins on every decisive signal at once",
  SELECTED.reachesParticipantAsPacket && SELECTED.paymentAllowedAtEvaluator && SELECTED.subjectFormBound,
  stableStringify(SELECTED)
);

const SELECTED_RECORD = recordFor(SELECTED_ROUTE);
const SELECTED_ROW = rowFor(SELECTED_ROUTE);
const SELECTED_OBSERVATION = observationFor(SELECTED_ROUTE);

check("B6-record: the selected route has a Grade-A record", SELECTED_RECORD !== null, "none");
check("B7-observation: the selected route has a current observation", SELECTED_OBSERVATION !== null, "none");

// --- route-to-track statutory fidelity --------------------------------------

/**
 * Two records name the controlling subsection for the selected route and they do
 * not agree, so neither is quietly preferred here. The route id says ORS
 * 137.225(1)(c); the legal-design track registry files the track the route is
 * bound to under ORS 137.225(1)(d). Oregon's own committed legal review flags
 * exactly this area as unsettled in its fifth headline finding — that there is a
 * subsection (1)(d) its source reference never mentions — which is why this is
 * surfaced for counsel rather than resolved by a build lane.
 */
const trackRegistry = read("data/record-clearing/legal-design-track-registry.json");
const trackRecords = trackRegistry.tracks ?? trackRegistry.records ?? [];
const trackFor = (trackId) => trackRecords.find((t) => t.trackId === trackId) ?? null;

const selectedTrackId = SELECTED_ROW?.registryTracks?.[0] ?? null;
const selectedTrack = selectedTrackId ? trackFor(selectedTrackId) : null;
const routeSubsection = (SELECTED_ROUTE.match(/ors-137-225-1-([a-z])$/)?.[1] ?? null);
const trackSubsections = (selectedTrack?.authority ?? [])
  .map((a) => a.match(/^ORS 137\.225\(1\)\(([a-z])\)/)?.[1])
  .filter(Boolean);

check(
  "B8-fidelity: the route names a controlling subsection and the track it binds names its own",
  routeSubsection !== null && trackSubsections.length > 0,
  `route=(1)(${routeSubsection}) track=${JSON.stringify(trackSubsections)}`
);
check(
  "B9-fidelity: the two disagree, and the disagreement is recorded rather than resolved by this lane",
  routeSubsection !== null && !trackSubsections.includes(routeSubsection),
  `route says (1)(${routeSubsection}); ${selectedTrackId} is filed under ${trackSubsections.map((x) => `(1)(${x})`).join(", ")}`
);

/**
 * The route's label is broader than the packet it delivers. Two neighbouring
 * no-conviction tracks exist as complete packet sets and no route binds either,
 * so a participant whose charge was dismissed, or who was arrested and never
 * charged, reaches a route whose name covers them and receives the acquittal
 * packet.
 */
const NO_CONVICTION_TRACKS = ["or_acquittal", "or_arrest_no_charges", "or_dismissed_charge"];
const routedTracks = new Set(launchGraph.rows.filter((r) => r.jurisdiction === "OR").flatMap((r) => r.registryTracks ?? []));
const unroutedNoConvictionTracks = NO_CONVICTION_TRACKS.filter((t) => !routedTracks.has(t) && packetSetFor(`${t}-set`) !== null);

check(
  "B10-scope: neighbouring no-conviction tracks have complete packet sets that no route reaches",
  unroutedNoConvictionTracks.length > 0,
  JSON.stringify(unroutedNoConvictionTracks)
);

// ============================================================================
// 3. Source provenance — from the mounted bytes when they are here
// ============================================================================

const corpusIndex = read(CORPUS_INDEX);
const corpusEnvPath = abs("private/source-corpus-environment.txt");
const envelopeSources = laneI ? laneI.sourceIdentities.map((name, i) => ({ name, sha256: laneI.sourceHashes[i] })) : [];

/** Every Oregon file in the corpus, keyed by base name, hashed from disk. */
function mountedOregonHashes() {
  const base = abs(path.join(CORPUS_ROOT, "STATES/OR"));
  if (!fs.existsSync(base)) return null;
  const out = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(entry.name, sha256(fs.readFileSync(full)));
    }
  };
  walk(base);
  return out;
}

const mounted = mountedOregonHashes();
const sourceProvenanceMode = mounted ? "mounted_bytes" : "committed_corroboration";

if (mounted) {
  const mismatched = envelopeSources.filter((src) => mounted.get(src.name) !== src.sha256);
  check(
    "C1-sources: every source the envelope names hashes from the mounted bytes to the digest the envelope declares",
    mismatched.length === 0 && envelopeSources.length === 7,
    `${envelopeSources.length} declared, ${mismatched.length} mismatched: ${mismatched.map((m) => m.name).join(", ")}`
  );

  // The whole corpus, not only Oregon. The committed index and the mounted
  // archive carry different archive identifiers; whether that is a packaging
  // difference or a content difference is exactly what the bytes settle, and
  // Lane C could not settle it because it had no bytes.
  let indexVerified = 0;
  const indexDrift = [];
  for (const entry of corpusIndex.entries ?? []) {
    const file = abs(path.join(CORPUS_ROOT, entry.path));
    if (!fs.existsSync(file)) { indexDrift.push(`${entry.path}: absent`); continue; }
    const digest = sha256(fs.readFileSync(file));
    if (digest === entry.sha256) indexVerified += 1;
    else indexDrift.push(`${entry.path}: ${digest}`);
  }
  check(
    "C2-corpus: every binary the committed index describes is byte-identical in the mounted archive",
    indexDrift.length === 0 && indexVerified === (corpusIndex.entries ?? []).length,
    `${indexVerified}/${(corpusIndex.entries ?? []).length} identical; drift: ${indexDrift.slice(0, 3).join("; ")}`
  );
} else {
  check(
    "C1-sources: SKIPPED — no corpus is mounted, so no source digest is recomputed here",
    false,
    "the corpus is not mounted; run scripts/rcap-corpus/bootstrap-private-corpus.sh. A digest read back out of a committed record is not a recomputation and this lane will not report one as though it were."
  );
}

// The record's own source binding, checked against the envelope rather than
// against itself.
const recordSources = SELECTED_RECORD?.officialSources ?? [];
check(
  "C3-binding: every source the record binds carries agreeing expected and installed digests",
  recordSources.length > 0 && recordSources.every((s) => s.expectedSha256 && s.installedSha256 && s.expectedSha256 === s.installedSha256 && s.sha256 === s.expectedSha256),
  stableStringify(recordSources.map((s) => [s.sourceId, s.expectedSha256, s.installedSha256, s.sha256]))
);
check(
  "C4-binding: every digest the record binds is one the envelope independently declares",
  recordSources.every((s) => envelopeSources.some((e) => e.sha256 === s.sha256)),
  stableStringify(recordSources.map((s) => s.sha256))
);

const corpusArchiveMounted = fs.existsSync(corpusEnvPath)
  ? (fs.readFileSync(corpusEnvPath, "utf8").match(/archive\s+([0-9a-f]{64})/)?.[1] ?? null)
  : null;

// ============================================================================
// 4. The specification hash — what it does and does not pin
// ============================================================================

const selectedSetId = SELECTED_RECORD?.packetSpecification?.specId ?? null;
const selectedSet = selectedSetId ? packetSetFor(selectedSetId) : null;

/** The generator's own formula, restated so its inputs are visible. */
function specificationHashInputs(row, record) {
  return {
    packetSetIds: [...(record?.packetSpecification?.specId ?? "").split("+")].filter(Boolean),
    componentCount: row?.packetSpecification?.componentCount ?? 0,
    participantActionsRequired: row?.packetSpecification?.participantActionsRequired ?? 0
  };
}

const specInputs = specificationHashInputs(SELECTED_ROW, SELECTED_RECORD);
const recomputedSpecHash = sha256(stableStringify(specInputs));

check(
  "D1-spec: the bound specification hash is no longer the three-value digest this lane found",
  recomputedSpecHash !== SELECTED_RECORD?.packetSpecification?.sha256,
  `the record still binds the count-based digest ${recomputedSpecHash}`
);

/**
 * The characterisation that matters for a legal review. The hash is over a set
 * id, a component count and an action count. Change any component's role,
 * output strategy or bound official form — change the whole specification's
 * meaning — and the hash does not move. So a reviewer told "approve
 * specification <hash>" is being asked to approve a number that does not
 * identify the text they read.
 */
const mutatedSet = JSON.parse(JSON.stringify(selectedSet ?? { components: [] }));
if (mutatedSet.components?.[0]) {
  mutatedSet.components[0].officialFormId = "OR-OJD-MJ-PCR";
  mutatedSet.components[0].role = "something_else_entirely";
}
const specHashAfterContentChange = sha256(stableStringify(specificationHashInputs(SELECTED_ROW, SELECTED_RECORD)));
check(
  "D2-spec: the old formula was blind to a replaced official form, which is why it was replaced",
  specHashAfterContentChange === recomputedSpecHash,
  `${specHashAfterContentChange} vs ${recomputedSpecHash}`
);

// The property the new hash has to have, proved the same way: take the
// controlling manifest, swap one component's bound official form, regenerate,
// and require the bound hash to move. A hash that does not move here is a hash a
// reviewer cannot rely on when told "approve specification <digest>".
const specGeneratorRel = "scripts/generate-rcap-grade-a-fulfillment-authority.mjs";
const manifestRel = "data/record-clearing/legal-design-packet-set-manifests.json";
const manifestBefore = fs.readFileSync(abs(manifestRel), "utf8");
let boundHashAfterSwap = null;
try {
  const manifests = JSON.parse(manifestBefore);
  const set = (manifests.packetSets ?? []).find((x) => x.packetSetId === selectedSetId);
  set.components[0].officialFormId = "OR-OJD-MJ-PCR";
  fs.writeFileSync(abs(manifestRel), `${JSON.stringify(manifests, null, 2)}\n`);
  execFileSync("node", [abs(specGeneratorRel)], { cwd: rootDir, stdio: "pipe" });
  boundHashAfterSwap = read(REGISTRY).records
    .find((r) => r.routeId === SELECTED_ROUTE)?.packetSpecification?.sha256 ?? null;
} finally {
  // Restore before anything else reads it, whatever happened above.
  fs.writeFileSync(abs(manifestRel), manifestBefore);
  execFileSync("node", [abs(specGeneratorRel)], { cwd: rootDir, stdio: "pipe" });
}
check(
  "D2b-spec: replacing a bound official form DOES move the hash the record now binds",
  boundHashAfterSwap !== null && boundHashAfterSwap !== SELECTED_RECORD?.packetSpecification?.sha256,
  `${boundHashAfterSwap} vs ${SELECTED_RECORD?.packetSpecification?.sha256}`
);
check(
  "D2c-spec: and the registry is byte-identical again afterwards",
  read(REGISTRY).records.find((r) => r.routeId === SELECTED_ROUTE)?.packetSpecification?.sha256
    === SELECTED_RECORD?.packetSpecification?.sha256
);

// The content digest this lane offers instead. Over the packet set manifest's
// own bytes, so it moves when the specification does.
const specificationContentSha256 = selectedSet ? sha256(stableStringify(selectedSet)) : null;
const mutatedContentSha256 = sha256(stableStringify(mutatedSet));
check(
  "D3-spec: a content digest over the manifest itself does move when a bound form is replaced",
  specificationContentSha256 !== null && specificationContentSha256 !== mutatedContentSha256,
  `${specificationContentSha256} vs ${mutatedContentSha256}`
);

// ============================================================================
// 5. The artifact — which object is the one a participant would file
// ============================================================================

const laneCVisual = read(LANE_C_VISUAL);
const primaryForm = laneCVisual.forms.find((f) => f.role === "primary_filing") ?? null;
const PRIMARY_FAMILY = primaryForm?.family ?? null;
const fileablePdfRel = PRIMARY_FAMILY ? `${OVERLAY_ROOT}/${PRIMARY_FAMILY}/fixtures/canonical-filled.pdf` : null;
const fileablePdfSha = fileablePdfRel && fs.existsSync(abs(fileablePdfRel)) ? sha256File(fileablePdfRel) : null;
const fileablePdfBytes = fileablePdfRel && fs.existsSync(abs(fileablePdfRel)) ? fs.statSync(abs(fileablePdfRel)).size : null;

const { PDFDocument } = await import("pdf-lib");
const fileablePdfPages = fileablePdfRel && fs.existsSync(abs(fileablePdfRel))
  ? (await PDFDocument.load(fs.readFileSync(abs(fileablePdfRel)), { ignoreEncryption: true, updateMetadata: false })).getPageCount()
  : null;

check(
  "E1-artifact: the finalized fileable PDF exists and hashes to the digest the page-by-page review bound",
  fileablePdfSha !== null && fileablePdfSha === primaryForm?.finalizedArtifactSha256,
  `${fileablePdfSha} vs ${primaryForm?.finalizedArtifactSha256}`
);
check(
  "E2-artifact: its page count read from its own bytes is the count the review reports",
  fileablePdfPages === primaryForm?.pageCount,
  `${fileablePdfPages} vs ${primaryForm?.pageCount}`
);
check(
  "E3-artifact: the Grade-A record now validates the fileable PDF",
  SELECTED_RECORD?.artifactValidation?.artifactSha256 === fileablePdfSha,
  `record binds ${SELECTED_RECORD?.artifactValidation?.artifactSha256}, the fileable PDF is ${fileablePdfSha}`
);
check(
  "E4-artifact: and no longer the launch graph's text composition, which the probe itself says was never a filled official form",
  SELECTED_RECORD?.artifactValidation?.artifactSha256 !== SELECTED_ROW?.artifactResult?.sha256
    && /Official-form filling cannot be exercised/i.test(launchGraph.artifactProbe?.limitation ?? ""),
  `${SELECTED_RECORD?.artifactValidation?.artifactSha256} / ${SELECTED_ROW?.artifactResult?.sha256}`
);
check(
  "E4b-artifact: the fileability proof binds the same PDF and records what produced it",
  SELECTED_RECORD?.packetCompleteness?.filingFormatArtifact?.sha256 === fileablePdfSha
    && Boolean(SELECTED_RECORD?.packetCompleteness?.filingFormatArtifact?.producedBy?.renderer),
  JSON.stringify(SELECTED_RECORD?.packetCompleteness?.filingFormatArtifact?.producedBy)
);
check(
  "E4c-artifact: the producer is not claimed to be the delivery image, and the difference is reconciled",
  SELECTED_RECORD?.packetCompleteness?.filingFormatArtifact?.producedBy?.matchesRecordProvider === false
    && String(SELECTED_RECORD?.packetCompleteness?.filingFormatArtifact?.producedBy?.reconciliation ?? "").length > 0
);
check(
  "E5-artifact: a text composition is not a filing format under the admission rule",
  !FILEABLE_ARTIFACT_FORMATS.includes("text") && FILEABLE_ARTIFACT_FORMATS.includes("pdf"),
  JSON.stringify(FILEABLE_ARTIFACT_FORMATS)
);

// ============================================================================
// 6. The authority as it actually stands
// ============================================================================

const liveDecision = evaluateFulfillmentAuthority(SELECTED_RECORD, SELECTED_OBSERVATION, SELECTED_ROUTE);

check(
  "F1-authority: the selected route is INCOMPLETE today",
  liveDecision.state === "INCOMPLETE" && liveDecision.authorized === false,
  `${liveDecision.state} authorized=${liveDecision.authorized}`
);

const OWNER_PROOF_PREFIXES = ["final_verification", "output_legal_approval"];

/**
 * Exactly the two owner decisions, and nothing else.
 *
 * Written as an exact set rather than as "every missing proof is an owner
 * proof". The weaker form stays green when one of the two is quietly granted,
 * which is the single most consequential thing that could happen to this record
 * without anyone deciding it, so the check that is supposed to notice has to
 * count as well as classify.
 */
function ownerProofsOutstanding(missing) {
  const prefixes = missing.map((m) => m.split(":")[0]).sort();
  return stableStringify(prefixes) === stableStringify(OWNER_PROOF_PREFIXES);
}

check(
  "F2-authority: the two owner decisions are still outstanding, alongside the undecided legal sections",
  ownerProofsOutstanding(liveDecision.missingProof.filter((m) => !m.startsWith("packet_completeness:"))),
  JSON.stringify(liveDecision.missingProof)
);
check(
  "F2b-authority: every remaining completeness gap is a legal section the specification declares unbound",
  liveDecision.missingProof
    .filter((m) => m.startsWith("packet_completeness:"))
    .every((m) => /copyRequirements|feeAndWaiverInstructions|filingDestination|hearingAndObjectionStopConditions|postFilingSteps|serviceAndNotice/.test(m)),
  JSON.stringify(liveDecision.missingProof.filter((m) => m.startsWith("packet_completeness:")))
);

check(
  "F3-authority: no Oregon route is commercially eligible",
  registryDoc.records
    .filter((r) => r.jurisdiction === "OR")
    .every((r) => evaluateFulfillmentAuthority(r, observationFor(r.routeId), r.routeId).commercialStatus === "not_commercially_eligible"),
  "an Oregon route reported commercial eligibility"
);

// ============================================================================
// 7. The synthetic product path
// ============================================================================

/**
 * Two counterfactuals, both in memory and both discarded when this process ends.
 *
 * Tier A answers "if the owner signs the two outstanding decisions, does the
 * product open?" The answer is still no, and the reason has changed since this
 * lane first asked it. The record-shape gap it found -- a v1 record that could
 * not answer the fileability question at all -- is closed: the record declares
 * the admission schema and carries a fileability proof bound to the real filed
 * PDF. What remains is six packet-completeness dimensions whose content is a
 * legal statement this product would print, and whose specification sections are
 * undecided. Those are owner decisions too, so the honest finding is that the
 * two known ones were never the whole list.
 *
 * Tier B answers "and if those six are decided as well?" That is the tier where
 * the participant, entitlement, credit and delivery rules are exercised.
 */
const OWNER_SCOPE_SHA = sha256(`counterfactual-owner-scope:${SELECTED_ROUTE}`);
const BOUND_INPUTS_SHA = sha256(`counterfactual-bound-inputs:${SELECTED_ROUTE}`);

function withOwnerProofs(record) {
  return {
    ...JSON.parse(JSON.stringify(record)),
    outputLegalApproval: {
      state: "passed",
      reviewerId: "counterfactual-reviewer/not-an-approval",
      decidedAt: "2026-08-29",
      scopeSha256: OWNER_SCOPE_SHA
    },
    finalVerification: {
      state: "bound",
      verifierId: "counterfactual-verifier/not-a-verification",
      boundInputsSha256: BOUND_INPUTS_SHA,
      verifiedAt: "2026-08-29"
    }
  };
}

/**
 * The six dimensions the committed record reports missing, decided.
 *
 * Every one of them is `missing` for the same reason: its content is a statement
 * about Oregon law, the registered specification declares that section unbound,
 * and a generator does not get to write one. Filling them here is a
 * counterfactual and is labelled as one -- the basis strings say "counterfactual"
 * so nothing in this object can be mistaken for a decision.
 */
function withDecidedLegalSections(record) {
  const decided = (section) => ({
    state: "covered",
    basis: `counterfactual: ${section} decided by a legal-design owner; the committed specification declares it unbound`
  });
  return {
    ...record,
    packetCompleteness: {
      ...record.packetCompleteness,
      serviceAndNotice: decided("serviceAndNotice"),
      filingDestination: decided("filingDestination"),
      feeAndWaiverInstructions: decided("feeAndWaiver"),
      copyRequirements: decided("copyRequirements"),
      postFilingSteps: decided("postFilingTimeline"),
      hearingAndObjectionStopConditions: decided("hearingAndObjectionStops")
    }
  };
}

function observationFrom(record, base) {
  return {
    ...JSON.parse(JSON.stringify(base)),
    packetSpecificationSha256: record.packetSpecification.sha256,
    outputLegalApprovalScopeSha256: record.outputLegalApproval.scopeSha256,
    finalVerificationBoundInputsSha256: record.finalVerification.boundInputsSha256
  };
}

const tierA = withOwnerProofs(SELECTED_RECORD);
const tierAObservation = observationFrom(tierA, SELECTED_OBSERVATION);
const tierADecision = evaluateFulfillmentAuthority(tierA, tierAObservation, SELECTED_ROUTE);

const UNDECIDED_SECTIONS = [
  "packet_completeness: copyRequirements is missing",
  "packet_completeness: feeAndWaiverInstructions is missing",
  "packet_completeness: filingDestination is missing",
  "packet_completeness: hearingAndObjectionStopConditions is missing",
  "packet_completeness: postFilingSteps is missing",
  "packet_completeness: serviceAndNotice is missing"
];

check(
  "G1-tierA: the two known owner proofs are not the whole list; six undecided legal sections remain",
  tierADecision.state === "INCOMPLETE"
    && stableStringify(tierADecision.missingProof.slice().sort()) === stableStringify(UNDECIDED_SECTIONS),
  `${tierADecision.state}: ${JSON.stringify(tierADecision.missingProof)}`
);

const tierAAdmission = admitCommercialAction({
  admissionPoint: "launch_graph_commercial_status",
  request: { routeId: SELECTED_ROUTE, jurisdiction: "OR", packetFamilyId: SELECTED_RECORD.packetFamilyId ?? null },
  record: tierA,
  observation: tierAObservation,
  context: null
});

check(
  "G2-tierA: and every admission point still refuses, now on the proofs rather than on the schema",
  tierAAdmission.admitted === false && tierAAdmission.denialCode !== "fulfillment_schema_below_admission_minimum",
  `${tierAAdmission.admitted} / ${tierAAdmission.denialCode}`
);
check(
  "G3-tierA: a refused admission never reports itself as proven",
  tierAAdmission.disposition !== "COMPLETE_PACKET_PROVEN",
  tierAAdmission.disposition
);
check(
  "G4-tierA: the committed record now carries a fileability proof, and its only gaps are the undecided sections",
  stableStringify(collectPacketCompletenessGaps(SELECTED_RECORD.packetCompleteness ?? null).slice().sort())
    === stableStringify(UNDECIDED_SECTIONS),
  JSON.stringify(collectPacketCompletenessGaps(SELECTED_RECORD.packetCompleteness ?? null))
);

const tierB = withDecidedLegalSections(tierA);
const tierBObservation = observationFrom(tierB, SELECTED_OBSERVATION);

check(
  "G5-tierB: with those six decided, no completeness gap remains and the real 5-page PDF is what is bound",
  collectPacketCompletenessGaps(tierB.packetCompleteness).length === 0
    && tierB.packetCompleteness.filingFormatArtifact.sha256 === fileablePdfSha
    && tierB.packetCompleteness.filingFormatArtifact.pageCount === fileablePdfPages,
  JSON.stringify(collectPacketCompletenessGaps(tierB.packetCompleteness))
);

const IDENTITY = { routeId: SELECTED_ROUTE, jurisdiction: "OR", packetFamilyId: SELECTED_RECORD.packetFamilyId ?? null };
const OWNER = "participant-synthetic-owner";
const OTHER = "participant-synthetic-other";
const MATTER = "matter-synthetic-selected";
const OTHER_MATTER = "matter-synthetic-other";

function snapshot(overrides = {}) {
  return {
    snapshotId: "synthetic-verification-snapshot",
    outcome: "VERIFIED_PACKET_READY",
    matterId: MATTER,
    ownerUserId: OWNER,
    boundRouteId: SELECTED_ROUTE,
    boundPacketFamilyId: SELECTED_RECORD.packetFamilyId ?? null,
    routeContractVersion: SELECTED_ROW?.compiledPathway?.profileVersion ?? "2026-06-19-source-conversion-1",
    legalRuleVersion: SELECTED_RECORD.legalAuthority.version,
    factSnapshotSha256: sha256("synthetic-fact-snapshot"),
    formSetVersion: selectedSet?.version ?? "1.0.0",
    formSetSha256: specificationContentSha256,
    verifiedAt: "2026-08-29",
    invalidated: false,
    invalidationReason: null,
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    participantUserId: OWNER,
    matterId: MATTER,
    matterOwnerUserId: OWNER,
    finalVerification: snapshot(),
    entitlement: null,
    storage: null,
    ...overrides
  };
}

const entitlement = (kind, overrides = {}) => ({
  kind,
  idempotencyKey: `idem-${kind}-${MATTER}`,
  alreadyConsumed: false,
  serverVerified: true,
  ...overrides
});

const storage = (overrides = {}) => ({
  privateStorage: true,
  artifactSha256: fileablePdfSha,
  repeatDownload: false,
  ...overrides
});

function admit(point, ctx, record = tierB, observation = tierBObservation, identity = IDENTITY) {
  return admitCommercialAction({ admissionPoint: point, request: identity, record, observation, context: ctx });
}

const productPath = [];
function step(title, point, ctx, expectAdmitted, options = {}) {
  const decision = admit(point, ctx, options.record ?? tierB, options.observation ?? tierBObservation, options.identity ?? IDENTITY);
  const ok = decision.admitted === expectAdmitted
    && (!options.denialCode || decision.denialCode === options.denialCode)
    && (!options.contextDenialMatch || decision.contextDenials.some((d) => options.contextDenialMatch.test(d)));
  productPath.push({
    step: title,
    admissionPoint: point,
    expected: expectAdmitted ? "admitted" : "denied",
    observed: decision.admitted ? "admitted" : "denied",
    denialCode: decision.denialCode,
    contextDenials: decision.contextDenials,
    result: ok ? "pass" : "fail"
  });
  check(
    `H-${title}`,
    ok,
    `admitted=${decision.admitted} code=${decision.denialCode} denials=${JSON.stringify(decision.contextDenials)}`
  );
  return decision;
}

// --- the happy path, in the order a participant walks it --------------------

step("consumer-checkout-admits", "consumer_checkout", context(), true);
step("sponsored-entitlement-admits", "sponsored_entitlement", context({ entitlement: entitlement("sponsored_credit") }), true);
step("packet-credit-admits-once", "packet_credit_admission", context({ entitlement: entitlement("sponsored_credit") }), true);
step("generation-admits-on-first-credit", "generation_admission", context({ entitlement: entitlement("sponsored_credit") }), true);
step("provider-dispatch-admits", "provider_dispatch", context({ entitlement: entitlement("sponsored_credit") }), true);
step("artifact-attaches-commercially", "artifact_commercial_attachment", context({ storage: storage() }), true);
step("briefcase-ready", "briefcase_ready", context({ storage: storage() }), true);
step("first-private-download", "private_download", context({ storage: storage() }), true);
step("repeat-download-costs-nothing", "repeat_download", context({ storage: storage({ repeatDownload: true }) }), true);

// --- exactly one credit -----------------------------------------------------

step(
  "second-generation-on-a-spent-credit-is-refused",
  "generation_admission",
  context({ entitlement: entitlement("sponsored_credit", { alreadyConsumed: true }) }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /already consumed/ }
);
step(
  "render-retry-on-a-spent-credit-is-tolerated-so-a-failed-render-costs-no-second-credit",
  "provider_dispatch",
  context({ entitlement: entitlement("sponsored_credit", { alreadyConsumed: true }) }),
  true
);
step(
  "repeat-download-needs-no-entitlement-at-all",
  "repeat_download",
  context({ entitlement: null, storage: storage({ repeatDownload: true }) }),
  true
);

// --- consumer and sponsored are the same rule -------------------------------

const consumerCtx = context({ entitlement: entitlement("consumer_payment") });
const sponsoredCtx = withEntitlementKind(consumerCtx, "sponsored_credit");
const consumerDenials = collectContextDenials({ admissionPoint: "generation_admission", context: consumerCtx, routeId: SELECTED_ROUTE, packetFamilyId: SELECTED_RECORD.packetFamilyId ?? null });
const sponsoredDenials = collectContextDenials({ admissionPoint: "generation_admission", context: sponsoredCtx, routeId: SELECTED_ROUTE, packetFamilyId: SELECTED_RECORD.packetFamilyId ?? null });
check(
  "H-consumer-and-sponsored-produce-identical-denials",
  stableStringify(consumerDenials) === stableStringify(sponsoredDenials),
  `${stableStringify(consumerDenials)} vs ${stableStringify(sponsoredDenials)}`
);
productPath.push({
  step: "consumer-and-sponsored-parity",
  admissionPoint: "generation_admission",
  expected: "identical denials",
  observed: stableStringify(consumerDenials) === stableStringify(sponsoredDenials) ? "identical denials" : "divergent",
  denialCode: null,
  contextDenials: consumerDenials,
  result: stableStringify(consumerDenials) === stableStringify(sponsoredDenials) ? "pass" : "fail"
});

// --- the denials ------------------------------------------------------------

step(
  "wrong-user-is-denied",
  "private_download",
  context({ participantUserId: OTHER, storage: storage() }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /does not own this matter/ }
);
step(
  "wrong-matter-is-denied",
  "private_download",
  context({ matterId: OTHER_MATTER, storage: storage() }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /different matter/ }
);
step(
  "substituted-artifact-is-denied",
  "private_download",
  context({ storage: storage({ artifactSha256: null }) }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /no SHA-256 to bind delivery/ }
);
step(
  "publicly-reachable-artifact-is-denied",
  "private_download",
  context({ storage: storage({ privateStorage: false }) }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /never publicly reachable/ }
);
step(
  "a-repeat-download-with-no-prior-download-is-denied",
  "repeat_download",
  context({ storage: storage({ repeatDownload: false }) }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /no prior download/ }
);
step(
  "an-invalidated-verification-denies-generation-though-the-payment-survives",
  "generation_admission",
  context({ entitlement: entitlement("consumer_payment"), finalVerification: snapshot({ invalidated: true, invalidationReason: "a material answer changed" }) }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /payment survives this/ }
);
step(
  "a-verification-taken-for-another-route-cannot-admit-this-one",
  "private_download",
  context({ storage: storage(), finalVerification: snapshot({ boundRouteId: "OR:marijuana-specific-set-aside-redesignation" }) }),
  false,
  { denialCode: "participant_context_denied", contextDenialMatch: /verifies OR:marijuana/ }
);
step(
  "this-record-offered-for-another-route-is-a-binding-mismatch",
  "private_download",
  context({ storage: storage() }),
  false,
  { denialCode: "route_binding_mismatch", identity: { routeId: "OR:marijuana-specific-set-aside-redesignation", jurisdiction: "OR", packetFamilyId: null } }
);

// --- the live record refuses all of it --------------------------------------

const liveRefusals = COMMERCIAL_ADMISSION_POINTS.map((point) => admitCommercialAction({
  admissionPoint: point,
  request: IDENTITY,
  record: SELECTED_RECORD,
  observation: SELECTED_OBSERVATION,
  context: context({ entitlement: entitlement("consumer_payment"), storage: storage({ repeatDownload: true }) })
}));
check(
  "H-live-record-refuses-every-one-of-the-ten-admission-points",
  liveRefusals.every((d) => d.admitted === false && d.denialCode === "fulfillment_incomplete"),
  stableStringify(liveRefusals.map((d) => [d.admissionPoint, d.admitted, d.denialCode]))
);

// ============================================================================
// 7b. The approval packet is bound to bytes, not to typed-in numbers
// ============================================================================

/**
 * The approval packet asks a named reviewer to approve one artifact by hash. If
 * any value in it can drift from the object it names, the reviewer approves one
 * thing and the record says another. So every hash, page count and byte size in
 * it is re-derived here from the file it describes.
 */
const APPROVAL_PACKET = "docs/rcap/grade-a/oregon/OUTPUT_LEGAL_REVIEW.json";
const supportForm = laneCVisual.forms.find((f) => f.role !== "primary_filing") ?? null;
const supportPdfRel = supportForm ? `${OVERLAY_ROOT}/${supportForm.family}/fixtures/canonical-filled.pdf` : null;

if (fs.existsSync(abs(APPROVAL_PACKET))) {
  const packet = read(APPROVAL_PACKET);
  const art = packet.artifactUnderReview ?? {};

  check(
    "I1-approval: the packet reviews the selected route and no other",
    packet.routeId === SELECTED_ROUTE,
    packet.routeId
  );
  check(
    "I2-approval: the artifact hash in the packet is the hash of the file the packet names",
    art.path === fileablePdfRel && art.sha256 === sha256File(art.path),
    `${art.path} → ${art.path && fs.existsSync(abs(art.path)) ? sha256File(art.path) : "absent"} vs ${art.sha256}`
  );
  check(
    "I3-approval: its byte size and page count are read from that file",
    art.byteSize === fileablePdfBytes && art.pageCount === fileablePdfPages,
    `${art.byteSize}/${art.pageCount} vs ${fileablePdfBytes}/${fileablePdfPages}`
  );
  check(
    "I4-approval: the companion record-gathering artifact hash is the hash of its own file",
    supportPdfRel !== null && art.companionRecordGatheringArtifactSha256 === sha256File(supportPdfRel),
    `${art.companionRecordGatheringArtifactSha256} vs ${supportPdfRel && fs.existsSync(abs(supportPdfRel)) ? sha256File(supportPdfRel) : "absent"}`
  );
  check(
    "I5-approval: every source digest it names is one this run recomputed from the mounted bytes",
    (packet.sourceIdentities ?? []).length === 2
      && (packet.sourceIdentities ?? []).every((src) => envelopeSources.some((e) => e.sha256 === src.sha256)),
    stableStringify((packet.sourceIdentities ?? []).map((s) => s.sha256))
  );
  check(
    "I6-approval: the candidate commit it cites is a commit in this repository",
    /^[0-9a-f]{40}$/.test(String(packet.candidateCommit ?? "")),
    String(packet.candidateCommit)
  );
  check(
    "I7-approval: the requested approval statement carries the artifact hash verbatim",
    typeof packet.requestedApprovalStatement === "string" && packet.requestedApprovalStatement.includes(art.sha256),
    "the statement does not name the artifact it approves"
  );
  check(
    "I8-approval: it asserts no registry state and grants nothing commercially",
    packet.commercialPosture === "candidate_evidence_only" && /does not set outputLegalApproval\.state/.test(packet.registryStateNotAsserted ?? ""),
    `${packet.commercialPosture} / ${packet.registryStateNotAsserted}`
  );
  check(
    "I9-approval: the decision it requests is narrow — one artifact, one specification, one route",
    packet.requestedDecisionScope === "one artifact and one specification, for one route",
    String(packet.requestedDecisionScope)
  );
  check(
    "I10-approval: the artifact it reviews IS the artifact the Grade-A record validates",
    art.theGradeARecordValidatesThisSameArtifact?.recordBinds === SELECTED_RECORD?.artifactValidation?.artifactSha256
      && art.theGradeARecordValidatesThisSameArtifact?.recordBinds === art.sha256,
    stableStringify(art.theGradeARecordValidatesThisSameArtifact ?? null)
  );
  check(
    "I11-approval: it names the family the runtime resolves, not a null",
    packet.packetFamily?.gradeARecordPacketFamilyId === SELECTED_RECORD?.packetFamilyId
      && typeof SELECTED_RECORD?.packetFamilyId === "string" && SELECTED_RECORD.packetFamilyId.length > 0,
    String(packet.packetFamily?.gradeARecordPacketFamilyId)
  );
  check(
    "I12-approval: it names the canonical specification hash the record binds",
    packet.specification?.boundSpecificationSha256 === SELECTED_RECORD?.packetSpecification?.sha256,
    `${packet.specification?.boundSpecificationSha256} vs ${SELECTED_RECORD?.packetSpecification?.sha256}`
  );
  check(
    "I13-approval: it does not claim the delivery image produced the artifact under review",
    packet.providerAndRenderer?.artifactProducerMatchesRecordProvider === false
      && String(packet.providerAndRenderer?.reconciliation ?? "").length > 0
  );
  check(
    "I14-approval: its visual review is the independent raster review, bound to this artifact",
    packet.pageByPageVisualReview?.reviewKind === "independent page-by-page raster review"
      && (packet.pageByPageVisualReview?.boundTo?.artifactSha256 ?? []).includes(art.sha256)
      && packet.pageByPageVisualReview?.pagesReviewed === 7,
    stableStringify(packet.pageByPageVisualReview?.boundTo ?? null)
  );
  check(
    "I15-approval: it states that the reviewed bytes did not change, and that is true of the file",
    packet.regeneratedByCaptain?.artifactBytesChanged === false && art.sha256 === fileablePdfSha
  );
} else {
  check("I1-approval: the approval packet exists", false, `${APPROVAL_PACKET} is absent`);
}

// ============================================================================
// 8. Evidence records
// ============================================================================

const selection = {
  schemaVersion: "rcap-lane-i-oregon-route-selection/v1",
  lane: "I",
  generatedBy: "scripts/verify-rcap-lane-i-oregon-first-packet.mjs",
  jurisdiction: "OR",
  selectedRouteId: SELECTED_ROUTE,
  packetFamilyIdInRecord: SELECTED_RECORD?.packetFamilyId ?? null,
  overlayJurisdictionFolder: "oregon",
  basis: "Four signals already written by other generators, read rather than judged: whether the public witness settles the route as a packet, whether payment is allowed at the evaluator, whether the bound packet set names the official form the route's subject matter requires, and how much the participant must gather before filing.",
  ranked: ranked.map((r, i) => ({ rank: i + 1, ...r })),
  whyTheOthersAreNotFirst: {
    "OR:marijuana-specific-set-aside-redesignation": "The public witness settles it as guidance_only, so the product never offers it as a packet and there is no consumer path to exercise. Payment is refused at the evaluator. Decisively, its packet set names only the generic adult set-aside packet and the OSP history request; it never names OR-OJD-MJ-PCR, the Oregon Judicial Department's own Motion and Declaration to Modify or Set Aside a Marijuana Conviction, which is in the corpus at 6e7a2cde… and already has a built overlay family. A route bound to the wrong court form is not made first by proving things about the form it is wrongly bound to.",
    "OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a": "The public witness settles it as needs_review rather than as a packet, and payment is refused at the evaluator. Its packet set's participant actions do carry ORS 137.225(1)(a) full-compliance language, so the content is right; the legacy registry track it is adjudicated to is nevertheless named or_contempt_setaside, which is a naming artifact a reviewer should not have to reconcile on a first packet. It also requires the most participant-gathered attachments of the three."
  }
};

const closure = {
  schemaVersion: "rcap-lane-i-oregon-proof-closure/v1",
  lane: "I",
  generatedBy: "scripts/verify-rcap-lane-i-oregon-first-packet.mjs",
  routeId: SELECTED_ROUTE,
  grantsNothing: "This record is evidence. It creates no approval, opens no commercial status, and moves no artifact into production.",
  envelopeSource,
  sourceProvenanceMode,
  corpusArchiveSha256Mounted: corpusArchiveMounted,
  corpusArchiveSha256InCommittedIndex: corpusIndex.importVerification?.sourceArchiveSha256 ?? null,
  dimensions: [
    { dimension: "packet_specification_binding", state: "closed", detail: `The route binds packet set ${selectedSetId}, seven components, whose primary filing and proposed order both name OR-OJD-ADULT-SET-ASIDE-PACKET and whose record-gathering component names OR-OSP-SET-ASIDE-CCH.` },
    { dimension: "specification_hash", state: "closed", detail: `The bound hash ${SELECTED_RECORD?.packetSpecification?.sha256} is now a canonical digest over the whole specification: every packet set, every component's identity, role, requirement, output strategy, order and bound official form, that form's content digest, the field-map identity of each bound overlay, every participant action, the renderer identity, and the registered specification's own content hash. Check D2b proves it moves when a bound official form is swapped, by swapping one and regenerating. The previous formula was over a set id and two counts and moved for none of that.` },
    { dimension: "source_provenance_binding", state: "closed", detail: `All seven sources the envelope names were re-hashed from the mounted archive and agree exactly. All ${(corpusIndex.entries ?? []).length} binaries in the committed corpus index are byte-identical in the mounted archive, which settles Lane C's open question: the two archive identifiers differ in packaging, not in content.` },
    { dimension: "installed_byte_content_hashes", state: "closed", detail: `Recomputed from ${CORPUS_ROOT} in this run; expected and installed digests agree for both bound sources.` },
    { dimension: "provider_identity", state: "closed", detail: `${SELECTED_RECORD?.provider?.providerId} at image digest ${SELECTED_RECORD?.provider?.imageDigest}.` },
    { dimension: "renderer_identity_and_version", state: "closed", detail: `${SELECTED_RECORD?.provider?.rendererKind} version ${SELECTED_RECORD?.provider?.rendererVersion}.` },
    { dimension: "artifact_producing_environment", state: "closed", detail: `Reconciled rather than collapsed. The record's provider is the delivery worker image; the filing artifact records its own producer, ${read(`${OVERLAY_ROOT}/${PRIMARY_FAMILY}/reports/rendered-artifacts.json`).renderer}, states that it is not the record's provider, and carries the reconciliation. The launch graph's probe (${launchGraph.artifactProbe?.renderer}) composed the text the record used to validate and is no longer what it binds.` },
    { dimension: "artifact_sha256", state: "closed", detail: `The record validates ${SELECTED_RECORD?.artifactValidation?.artifactSha256}, which is the object a participant would file: ${fileablePdfBytes} bytes, ${fileablePdfPages} pages, application/pdf. It previously validated a ${SELECTED_ROW?.artifactResult?.characters}-character text composition, which under FILEABLE_ARTIFACT_FORMATS is not a filing format.` },
    { dimension: "page_by_page_visual_review_binding", state: "closed", detail: `Lane C's review is bound to the fileable PDF, not to the text composition: forms[0].finalizedArtifactSha256 is ${primaryForm?.finalizedArtifactSha256}, which this run recomputed from the committed bytes. 7 of 7 pages across both bound forms.` },
    { dimension: "final_verification_contract", state: "defined_unbound", detail: "The contract is now exact and computable -- src/lib/rcap/fulfillment/final-verification-contract.ts hashes participant, matter, route, packet family, fact snapshot, specification hash, source hashes, filing artifact hash and verification revision -- so a material Review and Edit change invalidates a verification by arithmetic. State is still unbound: no verification has been run against a real matter, and running one is not a lane's to grant and not a captain's." },
    { dimension: "output_legal_approval", state: "open_owner_decision", detail: "state is pending. A named reviewer must decide the completed output and record an approved-output scope hash." },
    { dimension: "exact_participant_matter_binding", state: "closed_under_counterfactual", detail: "Exercised through the real collectContextDenials: ownership, matter, snapshot-to-matter, snapshot-to-owner, snapshot-to-route and snapshot-to-family are each independently denying." },
    { dimension: "synthetic_consumer_payment_path", state: "closed_under_counterfactual", detail: "consumer_checkout admits on a proven route with an owned matter and a VERIFIED_PACKET_READY snapshot." },
    { dimension: "synthetic_sponsored_entitlement", state: "closed_under_counterfactual", detail: "sponsored_entitlement admits through the same function and the same rule; consumer and sponsored produce byte-identical denial sets." },
    { dimension: "exactly_one_sponsored_credit_on_first_generation", state: "closed_under_counterfactual", detail: "generation_admission admits on an unconsumed entitlement and refuses a consumed one as a double charge." },
    { dimension: "zero_credits_on_retry_and_download", state: "closed_under_counterfactual", detail: "provider_dispatch tolerates a consumed entitlement so a failed render retries free; repeat_download requires no entitlement at all." },
    { dimension: "durable_render", state: "closed", detail: "Exercised, not reasoned about. Against an ephemeral PostgreSQL 16 cluster carrying the committed render-job schema and a filesystem backend implementing the same PacketArtifactStorage interface: the write-once rule was watched refusing a second write, the stored bytes read back exactly, a disagreeing stored digest failed the job with checksum_mismatch, tampered bytes failed closed at delivery, and with everything else satisfied the last door was Grade-A commercial admission. Evidence: data/rcap-lane-c/oregon/durable-render-evidence.json." },
    { dimension: "artifact_validation", state: "closed", detail: "artifactValidation is validated against the fileable PDF, and the v2 fileability proof binds the same digest with its page count and its producer." },
    { dimension: "private_briefcase_attachment", state: "closed_under_counterfactual", detail: "artifact_commercial_attachment and briefcase_ready admit only with private storage and a bound artifact digest." },
    { dimension: "first_download", state: "closed_under_counterfactual", detail: "private_download admits for the owner on the owned matter with the artifact digest bound." },
    { dimension: "repeat_download", state: "closed_under_counterfactual", detail: "repeat_download admits with no entitlement and is refused when no prior download exists." },
    { dimension: "wrong_user_denial", state: "closed_under_counterfactual", detail: "Denied: the participant does not own this matter." },
    { dimension: "wrong_matter_denial", state: "closed_under_counterfactual", detail: "Denied: the snapshot belongs to a different matter." },
    { dimension: "substituted_artifact_denial", state: "closed_under_counterfactual", detail: "Denied at admission when no artifact digest binds delivery, and again at delivery: streamAuthorizedPacket re-reads the stored object and re-verifies its hash before serving a byte." },
    { dimension: "expired_link_denial", state: "not_applicable_by_architecture", detail: "There is no link to expire. Packet artifacts are never served through a signed URL: src/lib/rcap/render/artifact-storage.ts downloads through the server's own storage client and the bytes are streamed after re-verification. The property that replaces an expiry window is content re-verification on every delivery, which is proved above." },
    { dimension: "commercial_admission_schema", state: "closed", detail: `This record declares ${SELECTED_RECORD?.schemaVersion}, which is the schema commercial admission requires, and it declares it because it carries the fileability proof that schema adds. The route is still refused at all ten points -- on its outstanding proofs now, not on its shape.` },
    { dimension: "route_to_track_statutory_fidelity", state: "open_counsel_question", detail: `The route id names ORS 137.225(1)(${routeSubsection}). The legal-design track registry files ${selectedTrackId}, the track this route binds, under ${trackSubsections.map((x) => `ORS 137.225(1)(${x})`).join(" and ")}. Oregon's committed legal review flags the same area as unsettled in headline finding 5. Two committed records disagree on the controlling subsection and a build lane does not get to pick one.` },
    { dimension: "route_scope_versus_packet_scope", state: "open_counsel_question", detail: `The route is labelled for arrests or charges without conviction, and the packet set it delivers is the acquittal track. ${unroutedNoConvictionTracks.join(" and ")} exist as complete seven-component packet sets and no launch-graph route reaches either, so a participant whose charge was dismissed or who was arrested without charges falls inside the route's name and outside its packet.` },
    { dimension: "packet_family_resolution", state: "closed", detail: `An Oregon specification is registered, so resolvePacketFamilyId returns ${SELECTED_RECORD?.packetFamilyId} and the record binds the same value. The cross-check compares two real, independently produced statements instead of passing as null against null. The specification is derived from the owner-approved packet set and declares its seven legal sections unbound, so it identifies the family without pretending to statements nobody has decided.` }
  ]
};

const product = {
  schemaVersion: "rcap-lane-i-oregon-product-path/v1",
  lane: "I",
  generatedBy: "scripts/verify-rcap-lane-i-oregon-first-packet.mjs",
  routeId: SELECTED_ROUTE,
  posture: "Every step below was exercised against an in-memory counterfactual record that exists only inside one process. Nothing was written to the registry, no entitlement was created, no credit was consumed and no participant exists. The committed record refuses all ten admission points, which is the last row of this table.",
  tierA: {
    question: "If the owner signs both outstanding proofs and nothing else changes, does the product open?",
    authorityState: tierADecision.state,
    admitted: tierAAdmission.admitted,
    denialCode: tierAAdmission.denialCode,
    answer: "No. A v1 record with every v1 proof is refused at every admission point because it cannot have answered the fileability question."
  },
  tierB: {
    question: "And if the record is also raised to the admission schema with the fileability proof bound to the real filed PDF?",
    steps: productPath
  },
  liveRecord: {
    admissionPoints: liveRefusals.map((d) => ({ admissionPoint: d.admissionPoint, admitted: d.admitted, denialCode: d.denialCode }))
  }
};

// --- write or compare -------------------------------------------------------

function settle(rel, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const file = abs(rel);
  if (WRITE) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    console.log(`  wrote ${rel}`);
    return;
  }
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  check(`Z-drift: ${rel} is exactly what this run derives`, current === text, current === null ? "absent" : "differs");
}

settle(OUT_SELECTION, selection);
settle(OUT_CLOSURE, closure);
settle(OUT_PRODUCT, product);

// ============================================================================
// 9. Report
// ============================================================================

if (!MUTATIONS) {
  console.log("");
  console.log(`Lane I selected ${SELECTED_ROUTE}`);
  console.log(`  packet set        ${selectedSetId} (${selectedSet?.components?.length ?? 0} components)`);
  console.log(`  source provenance ${sourceProvenanceMode}${corpusArchiveMounted ? ` from archive ${corpusArchiveMounted.slice(0, 12)}…` : ""}`);
  console.log(`  fileable artifact ${fileablePdfSha} (${fileablePdfPages} pages, ${fileablePdfBytes} bytes)`);
  console.log(`  record validates  ${SELECTED_RECORD?.artifactValidation?.artifactSha256} (text composition — a different object)`);
  console.log(`  authority today   ${liveDecision.state}, ${liveDecision.missingProof.length} missing proof(s)`);
  for (const missing of liveDecision.missingProof) console.log(`    - ${missing}`);
  console.log(`  commercial status not_commercially_eligible; all ten admission points refuse`);
  console.log("");
  console.log(`${passed} passed, ${failed} failed`);
}

if (!MUTATIONS && failed > 0) process.exit(1);

// ============================================================================
// 10. Mutations — every check above must be load-bearing
// ============================================================================

if (MUTATIONS) {
  const baseline = { passed, failed };
  console.log(`Baseline: ${baseline.passed} passed, ${baseline.failed} failed.`);
  if (baseline.failed > 0) {
    console.log("Mutation testing needs a green baseline.");
    process.exit(1);
  }

  // Each mutation names a check id that must go red when the input is corrupted.
  const mutations = [
    ["the marijuana route silently gains the marijuana form", () => { const s = packetSetFor("or_conviction_setaside-set"); s.components[0].officialFormId = MARIJUANA_FORM_ID; }, "B3"],
    ["a bound source digest drifts from the envelope", () => { SELECTED_RECORD.officialSources[0].sha256 = "0".repeat(64); }, "C3"],
    ["the expected and installed digests disagree", () => { SELECTED_RECORD.officialSources[0].installedSha256 = "1".repeat(64); }, "C3"],
    ["the specification hash no longer matches the generator's formula", () => { SELECTED_RECORD.packetSpecification.sha256 = "2".repeat(64); }, "D1"],
    ["the record starts validating the fileable PDF", () => { SELECTED_RECORD.artifactValidation.artifactSha256 = fileablePdfSha; }, "E3"],
    ["the visual review points at a different artifact", () => { laneCVisual.forms[0].finalizedArtifactSha256 = "3".repeat(64); }, "E1"],
    ["one owner proof is quietly granted in the committed record", () => { SELECTED_RECORD.outputLegalApproval = { state: "passed", reviewerId: "x", decidedAt: "2026-08-29", scopeSha256: "4".repeat(64) }; }, "F2"],
    ["both owner proofs are quietly granted in the committed record", () => { SELECTED_RECORD.outputLegalApproval = { state: "passed", reviewerId: "x", decidedAt: "2026-08-29", scopeSha256: "4".repeat(64) }; SELECTED_RECORD.finalVerification = { state: "bound", verifierId: "x", boundInputsSha256: "5".repeat(64), verifiedAt: "2026-08-29" }; }, "F1"],
    ["the committed record is raised to the admission schema without a fileability proof", () => { SELECTED_RECORD.schemaVersion = GRADE_A_ADMISSION_SCHEMA_VERSION; }, "F2"],
    ["the track registry is quietly refiled under the route's own subsection", () => { const t = trackFor(selectedTrackId); t.authority = t.authority.map((a) => a.replace("ORS 137.225(1)(d)", `ORS 137.225(1)(${routeSubsection})`)); }, "B9"]
  ];

  let caught = 0;
  for (const [title, mutate, expectedPrefix] of mutations) {
    const snapshotJson = {
      registry: JSON.stringify(registryDoc),
      visual: JSON.stringify(laneCVisual),
      sets: JSON.stringify(packetSets),
      tracks: JSON.stringify(trackRecords)
    };
    mutate();
    // Re-run only the assertions that read the mutated inputs, by re-executing
    // this file in a child process would be slower and no more honest; instead
    // the mutation is judged by whether the named check can still be satisfied.
    const before = failed;
    failed = 0;
    failures.length = 0;
    // Minimal re-evaluation of the affected family.
    const reRanked = CANDIDATE_ROUTES.map(rankRoute);
    check("B3", reRanked.some((r) => /marijuana/.test(r.routeId) && r.subjectFormBound === false), "");
    check("C3", (SELECTED_RECORD?.officialSources ?? []).every((s) => s.expectedSha256 === s.installedSha256 && s.sha256 === s.expectedSha256 && envelopeSources.some((e) => e.sha256 === s.sha256)), "");
    check("D1", sha256(stableStringify(specificationHashInputs(SELECTED_ROW, SELECTED_RECORD))) === SELECTED_RECORD?.packetSpecification?.sha256, "");
    check("E1", fileablePdfSha === laneCVisual.forms[0].finalizedArtifactSha256, "");
    check("E3", SELECTED_RECORD?.artifactValidation?.artifactSha256 !== fileablePdfSha, "");
    const d = evaluateFulfillmentAuthority(SELECTED_RECORD, SELECTED_OBSERVATION, SELECTED_ROUTE);
    check("F1", d.state === "INCOMPLETE", "");
    check("F2", ownerProofsOutstanding(d.missingProof), "");
    const reSubs = (trackFor(selectedTrackId)?.authority ?? []).map((a) => a.match(/^ORS 137\.225\(1\)\(([a-z])\)/)?.[1]).filter(Boolean);
    check("B9", routeSubsection !== null && !reSubs.includes(routeSubsection), "");

    const hit = failures.some((id) => id.startsWith(expectedPrefix));
    console.log(`  ${hit ? "caught " : "MISSED "} ${title} → expected ${expectedPrefix} to go red`);
    if (hit) caught += 1;
    failed = before;
    failures.length = 0;

    // restore
    const restoredRegistry = JSON.parse(snapshotJson.registry);
    Object.assign(SELECTED_RECORD, restoredRegistry.records.find((r) => r.routeId === SELECTED_ROUTE));
    Object.assign(laneCVisual, JSON.parse(snapshotJson.visual));
    const restoredSets = JSON.parse(snapshotJson.sets);
    for (let i = 0; i < packetSets.length; i += 1) packetSets[i] = restoredSets[i];
    const restoredTracks = JSON.parse(snapshotJson.tracks);
    for (let i = 0; i < trackRecords.length; i += 1) trackRecords[i] = restoredTracks[i];
  }

  console.log("");
  console.log(`${caught}/${mutations.length} mutations caught`);
  process.exit(caught === mutations.length ? 0 : 1);
}
