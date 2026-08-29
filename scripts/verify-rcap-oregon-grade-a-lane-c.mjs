#!/usr/bin/env node
// Lane C's Oregon Grade-A gate.
//
//   node scripts/verify-rcap-oregon-grade-a-lane-c.mjs
//   node scripts/verify-rcap-oregon-grade-a-lane-c.mjs --mutations
//
// The family gate (verify-rcap-oregon-official-pdf-grade-a.mjs) proves the
// packet: that the official PDF is the packet, that every value sits where the
// profile says on the pages the participant signs, and that no protected blank
// is filled. This gate proves the things around it that decide whether that
// packet may ever be sold:
//
//   A. Oregon's three routes are bound to the Grade-A fulfillment authority,
//      and the authority denies them today for reasons it names.
//   B. Lane C's two proofs — official source identity and page-by-page visual
//      review — are derived from evidence and are current.
//   C. Oregon stays CANDIDATE_ONLY: nothing in this lane makes a route
//      sellable, credit-consumable, or commercially eligible.
//   D. The product path admits, pins, validates and privately delivers the
//      packet only to the participant who owns the matter.
//   E. Two defects in the shared authority are proven here rather than
//      asserted, because both block Oregon and neither is Oregon's to fix.
//
// E is the reason this file exists as a gate rather than as a memo. A patch
// request that says "this rule is unsatisfiable" and cannot demonstrate it is
// an opinion; one that goes red the moment the rule becomes satisfiable is a
// measurement, and it retires itself when the captain fixes the rule.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-08-29";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");

const OR_ROUTES = [
  "OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a",
  "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
  "OR:marijuana-specific-set-aside-redesignation"
];
const PACKET_FORM = "OR-OJD-ADULT-SET-ASIDE-PACKET";
const CCH_FORM = "OR-OSP-SET-ASIDE-CCH";
const PACKET_SHA = "b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071";
const CCH_SHA = "a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6";
const PACKET_PAGES = 5;
const CCH_PAGES = 2;

const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";
const OBSERVATION = "data/rcap-grade-a/fulfillment-observation-snapshot.json";
const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const LANE_DIR = "data/rcap-lane-c/oregon";
const CANDIDATES = "data/rcap-all50/overlays/lane-c-candidates/oregon";
const PACKET_FAMILY = `${CANDIDATES}/or-ojd-adult-set-aside-packet-motion-and-declaration`;

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const bytesOf = (rel) => fs.readFileSync(path.join(rootDir, rel));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const {
  evaluateFulfillmentAuthority,
  COMPLETE_PACKET_PROVEN
} = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { COMMERCIAL_ADMISSION_POINTS } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const admission = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const jobContract = await import("../src/lib/rcap/render/job-contract.ts");
const { authorizePacketDownload } = await import("../src/lib/rcap/render/packet-delivery.ts");

function loadEvidence() {
  const registry = read(REGISTRY);
  const observation = read(OBSERVATION);
  return {
    registry,
    observation,
    observationByRoute: new Map(Object.entries(observation.routes ?? {})),
    launchGraph: read(LAUNCH_GRAPH),
    sourceIdentity: read(`${LANE_DIR}/source-identity.json`),
    visualReview: read(`${LANE_DIR}/visual-review.json`),
    patchRequest: read(`${LANE_DIR}/authority-patch-request.json`),
    authorityModuleSource: fs.readFileSync(path.join(rootDir, "src/lib/rcap/fulfillment/grade-a-authority.ts"), "utf8"),
    generatorSource: fs.readFileSync(path.join(rootDir, "scripts/generate-rcap-grade-a-fulfillment-authority.mjs"), "utf8")
  };
}

function staticFailures(evidence) {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };
  const { registry, observationByRoute, launchGraph, sourceIdentity, visualReview, patchRequest } = evidence;

  // -- A. The routes are bound to the authority, and it denies them today ----
  for (const routeId of OR_ROUTES) {
    const record = registry.records.find((row) => row.routeId === routeId) ?? null;
    fail(record !== null, `A-record ${routeId}: no Grade-A fulfillment record binds this route`);
    if (!record) continue;

    fail(record.jurisdiction === "OR", `A-jurisdiction ${routeId}: record says ${record.jurisdiction}`);
    fail(record.serviceDisposition === "paid_packet_intended", `A-disposition ${routeId}: ${record.serviceDisposition}`);
    const boundIds = (record.officialSources ?? []).map((source) => source.sourceId).sort();
    fail(boundIds.includes(PACKET_FORM), `A-form ${routeId}: not bound to ${PACKET_FORM}`);
    fail(boundIds.includes(CCH_FORM), `A-cch ${routeId}: not bound to ${CCH_FORM}`);

    const decision = evaluateFulfillmentAuthority(record, observationByRoute.get(routeId) ?? null, routeId);
    // The whole point of the authority: nothing Lane C does authorizes anything.
    fail(decision.authorized === false, `A-authorized ${routeId}: the authority authorized a route this lane only produced candidate evidence for`);
    fail(decision.state !== COMPLETE_PACKET_PROVEN, `A-state ${routeId}: state is ${decision.state}`);
    fail(decision.commercialStatus === "not_commercially_eligible", `A-commercial ${routeId}: ${decision.commercialStatus}`);
    // And it must say why, in named proofs rather than a bare denial.
    fail(decision.state === "INCOMPLETE", `A-incomplete ${routeId}: expected INCOMPLETE, got ${decision.state}`);
    fail(decision.missingProof.length > 0, `A-named ${routeId}: denied without naming a missing proof`);
    fail(decision.missingProof.some((proof) => proof.startsWith("output_legal_approval")),
      `A-legal ${routeId}: output-level legal approval is not among the missing proofs, though no reviewer has decided`);
    fail(decision.missingProof.some((proof) => proof.startsWith("final_verification")),
      `A-verification ${routeId}: final verification is not among the missing proofs, though nothing is bound`);
  }

  // -- B. Lane C's two proofs are real and current ---------------------------
  const bySourceId = new Map((sourceIdentity.sources ?? []).map((source) => [source.sourceId, source]));
  fail(bySourceId.size === 2, `B-sources: the lane records ${bySourceId.size} official source identities, expected 2`);
  fail(bySourceId.get(PACKET_FORM)?.sha256 === PACKET_SHA, `B-packet-sha: ${bySourceId.get(PACKET_FORM)?.sha256}`);
  fail(bySourceId.get(CCH_FORM)?.sha256 === CCH_SHA, `B-cch-sha: ${bySourceId.get(CCH_FORM)?.sha256}`);
  for (const source of sourceIdentity.sources ?? []) {
    // A digest with one witness is a restatement. Two records written by
    // different generators from different inputs agreeing is evidence.
    fail((source.corroboratedBy ?? []).length >= 2, `B-corroboration ${source.sourceId}: fewer than two independent records`);
    fail(/^[0-9a-f]{64}$/.test(source.sha256 ?? ""), `B-digest ${source.sourceId}: not a sha-256 digest`);
    fail(source.byteLength > 0, `B-bytes ${source.sourceId}: no byte length`);
    fail(source.pageCount > 0, `B-pages ${source.sourceId}: no page count`);
    // The lane must not claim to have hashed bytes it never had.
    fail(source.bytesRehashedOnThisRun === false || fs.existsSync(path.join(rootDir, "private")),
      `B-honesty ${source.sourceId}: claims the bytes were re-hashed while no corpus is mounted`);
  }

  fail(visualReview.pageCount === PACKET_PAGES + CCH_PAGES, `B-pagecount: reviewed ${visualReview.pageCount} pages, the two bound forms have ${PACKET_PAGES + CCH_PAGES}`);
  fail(visualReview.pagesReviewed === visualReview.pageCount, `B-reviewed: ${visualReview.pagesReviewed} of ${visualReview.pageCount} pages`);
  fail(visualReview.allPagesRetained === true, "B-retained: a bound form lost a page in its finalized artifact");
  fail(visualReview.noResidualFillableForm === true, "B-flattened: a finalized artifact still carries a fillable form");
  fail(visualReview.noClippedValues === true, "B-clipped: a value is clipped in a finalized artifact");
  fail((visualReview.forms ?? []).length === 2, "B-forms: the review does not cover both bound forms");
  for (const form of visualReview.forms ?? []) {
    fail((form.pages ?? []).length === form.pageCount, `B-form-pages ${form.sourceId}: ${(form.pages ?? []).length} page records for ${form.pageCount} pages`);
    fail(form.valuesDrawnAndVerified > 0, `B-drawn ${form.sourceId}: no value was confirmed drawn by the artifact`);
    fail(form.activeContentResult === "clean", `B-active ${form.sourceId}: active-content scan returned ${form.activeContentResult}`);
    fail(form.allExpectedValuesVisible === true, `B-visible ${form.sourceId}: not every expected value is visible`);
    fail(form.panelsDiffer === true, `B-panels ${form.sourceId}: the blank and filled contact-sheet panels do not differ`);
    // Each reviewed artifact must be the artifact on disk right now.
    const onDisk = sha256(bytesOf(`${CANDIDATES}/${form.family}/fixtures/canonical-filled.pdf`));
    fail(form.finalizedArtifactSha256 === onDisk, `B-stale ${form.sourceId}: reviewed ${form.finalizedArtifactSha256}, on disk ${onDisk}`);
  }
  fail((visualReview.doesNotEstablish ?? []).length > 0, "B-scope: the review does not record what it fails to establish");
  fail(/not the independent human visual review/i.test((visualReview.doesNotEstablish ?? []).join(" ")),
    "B-independent: the review does not disclaim standing in for independent human review");

  // -- C. Oregon stays CANDIDATE_ONLY ---------------------------------------
  for (const routeId of OR_ROUTES) {
    const [, pathwayId] = routeId.split(":");
    const resolved = resolvePacketRoute({ state: "OR", pathway: pathwayId, trackId: null });
    fail(resolved.sellable === false, `C-sellable ${routeId}: resolved sellable`);
    fail(resolved.creditConsumable === false, `C-credit ${routeId}: resolved credit-consumable`);
    fail(packetRouteCanRender(resolved) === true, `C-render ${routeId}: the route cannot render`);
    fail((resolved.factoryV2?.officialFormIds ?? []).includes(PACKET_FORM), `C-form ${routeId}: the resolver does not bind ${PACKET_FORM}`);
  }
  fail(!fs.existsSync(path.join(rootDir, "data/rcap-all50/overlays/production/oregon")),
    "C-production: Oregon evidence sits in the production overlay directory, which this lane may not write");
  fail(fs.existsSync(path.join(rootDir, CANDIDATES)), "C-candidates: the lane's Oregon candidate directory is missing");
  fail(patchRequest.createsApproval === false, "C-approval: the patch request claims to create an approval");
  fail(patchRequest.laneDoesNotEditTarget === true, "C-target: the patch request does not record that the lane leaves its target alone");

  // The patch request's values must be the derived ones, not free text.
  const patched = new Map((patchRequest.proofsLaneCCloses?.officialSources ?? []).map((source) => [source.sourceId, source.sha256]));
  fail(patched.get(PACKET_FORM) === PACKET_SHA, "C-patch-packet: the patch request proposes a different packet digest");
  fail(patched.get(CCH_FORM) === CCH_SHA, "C-patch-cch: the patch request proposes a different criminal-history digest");
  fail(patchRequest.proofsLaneCCloses?.visualReview?.pageCount === visualReview.pageCount,
    "C-patch-pages: the patch request and the review disagree on the page count");
  fail(Boolean(patchRequest.proofsLaneCCannotClose?.outputLegalApproval), "C-patch-legal: the patch request does not record that legal approval is not the lane's");
  fail(Boolean(patchRequest.proofsLaneCCannotClose?.finalVerification), "C-patch-verify: the patch request does not record that final verification is not the lane's");
  // Patching the record without the observation converts a missing proof into a
  // staleness failure, so the request has to carry both sides.
  fail(Boolean(patchRequest.observationSnapshotMustAlsoMove?.officialSourceSha256ById),
    "C-patch-observation: the patch request does not carry the matching observation values");

  // -- E. The two shared-authority defects, measured ------------------------
  //
  // E1. heldInRepository is unsatisfiable. collectMissingProof requires it true
  //     for every bound source; nothing in the product sets it true; and the
  //     one thing that would — committing the court's PDF — is forbidden by
  //     .gitignore and by the repository's standing rule against committing
  //     source bytes. So no route can reach COMPLETE_PACKET_PROVEN at all.
  //
  //     This check is written to go RED when the defect is fixed. That is
  //     deliberate: it is a measurement with an expiry, not a permanent rule.
  const rows = launchGraph.routes ?? launchGraph.rows ?? [];
  const namedForms = rows.reduce((sum, row) => sum + (row.sourceAssets?.officialFormIdsNamed ?? []).length, 0);
  const heldForms = rows.reduce((sum, row) => sum + (row.sourceAssets?.officialFormIdsHeldInThisRepository ?? []).length, 0);
  const heldInRegistry = registry.records.reduce(
    (sum, record) => sum + (record.officialSources ?? []).filter((source) => source.heldInRepository).length, 0
  );
  fail(namedForms > 0, "E1-premise: the launch graph names no official form at all, so this measurement has no subject");
  fail(heldForms === 0 && heldInRegistry === 0,
    `E1-RESOLVED: heldInRepository is now true for ${heldForms} launch-graph form(s) and ${heldInRegistry} registry source(s). ` +
    "The unsatisfiable-gate finding in the lane's patch request is stale — re-check it and retire this measurement.");
  fail(/heldInRepository/.test(evidence.authorityModuleSource),
    "E1-gone: the authority no longer mentions heldInRepository; the finding is resolved and this measurement should be retired");
  fail(/private\//.test(fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8")),
    "E1-gitignore: private/ is no longer git-ignored, which changes the premise of this finding");

  // E2. When held is true the generator writes sha256(sourceId) — the digest of
  //     the identifier string, not of the document. A content proof that hashes
  //     the name proves nothing about the content.
  fail(/sha256\(`\$\{sourceId\}`\)/.test(evidence.generatorSource),
    "E2-RESOLVED: the generator no longer derives an official source digest from the identifier string. Re-check the finding and retire this measurement.");
  for (const source of sourceIdentity.sources ?? []) {
    const identifierDigest = sha256(Buffer.from(source.sourceId, "utf8"));
    fail(source.sha256 !== identifierDigest,
      `E2-lane ${source.sourceId}: this lane's own digest is the hash of the identifier rather than of the document`);
  }

  return out;
}

// ---------------------------------------------------------------------------
// D. The product path, on this base, against the real artifact.
// ---------------------------------------------------------------------------

async function productPathFailures() {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };

  const pathway = "set-aside-of-eligible-convictions-under-ors-137-225-1-a";
  const facts = read(`${PACKET_FAMILY}/fixtures/canonical.json`).facts;

  const built = jobContract.buildRenderJobSpec({
    packetId: "pk_or_lane_c_synthetic",
    state: "OR",
    pathway,
    sourceSha256: PACKET_SHA,
    partnerSlug: null,
    briefcaseItemId: "bc_item_or_synthetic",
    trackId: null,
    packetFields: facts
  });
  fail(built.spec !== null, "D-spec: no render job could be built for the Oregon route");
  if (!built.spec) return out;
  fail(built.spec.sourceSha256 === PACKET_SHA, "D-pin: the job does not pin the Oregon packet");
  fail(built.spec.profileId === "OR", `D-profile: the job carries profile ${built.spec.profileId}`);

  const jobId = "3f7a5f2e-9d41-4c8b-b7a2-6d0f1c9e4a11";
  const allowlists = {
    knownJobIds: new Set([jobId]),
    allowedSourceShas: new Set([PACKET_SHA]),
    knownProfileVersions: new Set([built.spec.profileVersion])
  };
  const claim = { id: jobId, rendererKind: built.spec.rendererKind, sourceSha256: PACKET_SHA, profileVersion: built.spec.profileVersion };
  try {
    fail(jobContract.assertClaimAcceptable(claim, allowlists) === true, "D-claim: a well-formed claim was not accepted");
  } catch (error) {
    fail(false, `D-claim: a well-formed claim was refused (${error.message})`);
  }
  for (const [label, bad] of [
    ["an unadmitted source", { ...claim, sourceSha256: "0".repeat(64) }],
    ["an unknown profile version", { ...claim, profileVersion: "1.3.0" }],
    ["a job the server never issued", { ...claim, id: "00000000-0000-0000-0000-000000000000" }]
  ]) {
    let refused = false;
    try { jobContract.assertClaimAcceptable(bad, allowlists); } catch { refused = true; }
    fail(refused, `D-refuse: the worker contract accepted ${label}`);
  }

  const bytes = bytesOf(`${PACKET_FAMILY}/fixtures/canonical-filled.pdf`);
  const validation = await jobContract.validateRenderOutput(
    { bytes, containerDigest: "sha256:lane-c-synthetic" },
    { minimumPageCount: PACKET_PAGES, expectedPageSize: { width: 612, height: 792 } }
  );
  fail(validation.ok === true, `D-validate: the Oregon artifact failed production validation (${validation.errorCode ?? ""})`);
  fail(validation.pageCount === PACKET_PAGES, `D-validate-pages: validation saw ${validation.pageCount} pages`);

  // Private, participant-owned delivery. The contract's governing rule: a
  // Briefcase may not be anonymous, and a packet follows the claimed item.
  const owner = "user_or_owner";
  const briefcaseItemId = "bc_item_or_synthetic";
  const outputSha256 = validation.outputSha256;
  const storagePath = jobContract.buildArtifactStoragePath({
    partnerId: null, matterId: "matter_or_synthetic", jobId, outputSha256
  });
  const job = {
    id: jobId,
    routeId: built.spec.routeId,
    status: "artifact_validated",
    deliveryEligibility: "eligible",
    accountingResult: "zero_charge",
    briefcaseItemId,
    outputStoragePath: storagePath,
    outputSha256
  };
  const ports = {
    getJob: async (id) => (id === jobId ? job : null),
    userOwnsBriefcaseItem: async (userId, itemId) => userId === owner && itemId === briefcaseItemId,
    storage: { upload: async () => ({ ok: true }), read: async (p) => (p === storagePath ? bytes : null) },
    recordEvent: async () => "evt"
  };

  const granted = await authorizePacketDownload(ports, { jobId, userId: owner });
  fail(granted.ok === true, `D-deliver: the owning participant was refused their own packet (${granted.ok ? "" : granted.code})`);
  const repeat = await authorizePacketDownload(ports, { jobId, userId: owner });
  fail(repeat.ok === true, "D-repeat: a repeat download was refused");
  fail(granted.ok && repeat.ok && sha256(granted.bytes) === sha256(repeat.bytes), "D-repeat-bytes: a repeat download returned different bytes");
  fail(granted.ok && sha256(granted.bytes) === outputSha256, "D-deliver-bytes: the delivered bytes are not the validated artifact");

  // Every commercial admission point, asked about every Oregon route. The
  // contract says only COMPLETE_PACKET_PROVEN authorizes checkout, sponsorship,
  // credit consumption, generation, dispatch, attachment, Briefcase Ready,
  // private download or commercial launch status. Oregon holds none of them, so
  // all nine must refuse — and the refusal has to come from the authority
  // rather than from a route flag that could drift away from it.
  for (const routeId of OR_ROUTES) {
    const [jurisdiction] = routeId.split(":");
    for (const point of COMMERCIAL_ADMISSION_POINTS) {
      const decision = admission.admitCommercial(point, { routeId, jurisdiction, packetFamilyId: null });
      fail(decision.admitted === false, `D-admit ${routeId} ${point}: admitted a route with no proven packet`);
      fail(decision.authority.authorized === false, `D-admit-authority ${routeId} ${point}: the deciding authority reported authorized`);
    }
  }
  // The same finding as E1, observed at runtime instead of in the data: with
  // heldInRepository unsatisfiable, nothing anywhere in the product is proven.
  const proven = admission.provenCommercialRoutes();
  fail(proven.length === 0,
    `D-proven-RESOLVED: ${proven.length} route(s) are now commercially proven (${proven.slice(0, 3).join(", ")}). ` +
    "The unsatisfiable-gate finding is stale — re-check it and retire this measurement.");

  const stranger = await authorizePacketDownload(ports, { jobId, userId: "user_or_stranger" });
  fail(stranger.ok === false && stranger.status === 403, "D-wrong-user: another participant could download this packet");
  const anonymous = await authorizePacketDownload(ports, { jobId, userId: null });
  fail(anonymous.ok === false && anonymous.status === 401, "D-anonymous: an unauthenticated request could download this packet");
  const wrongMatter = await authorizePacketDownload(
    { ...ports, getJob: async () => ({ ...job, briefcaseItemId: "bc_item_someone_else" }) },
    { jobId, userId: owner }
  );
  fail(wrongMatter.ok === false && wrongMatter.status === 403, "D-wrong-matter: a packet was served for a matter the participant does not own");
  const unclaimed = await authorizePacketDownload(
    { ...ports, getJob: async () => ({ ...job, briefcaseItemId: null }) },
    { jobId, userId: owner }
  );
  fail(unclaimed.ok === false && unclaimed.status === 403, "D-unclaimed: an unclaimed packet was delivered");
  const blocked = await authorizePacketDownload(
    { ...ports, getJob: async () => ({ ...job, deliveryEligibility: "accounting_blocked", accountingResult: "consumer_payment_required" }) },
    { jobId, userId: owner }
  );
  fail(blocked.ok === false, "D-accounting: an accounting-blocked packet was delivered");
  const swapped = await authorizePacketDownload(
    { ...ports, storage: { upload: async () => ({ ok: true }), read: async () => Buffer.from("%PDF-1.7 not this artifact") } },
    { jobId, userId: owner }
  );
  fail(swapped.ok === false && swapped.code === "artifact_corrupt", "D-substitution: a substituted object was delivered as this packet");

  return out;
}

// ---------------------------------------------------------------------------

const evidence = loadEvidence();

if (MUTATIONS) {
  const base = staticFailures(evidence).length;
  const clone = () => ({
    ...structuredClone({
      registry: evidence.registry,
      observation: evidence.observation,
      launchGraph: evidence.launchGraph,
      sourceIdentity: evidence.sourceIdentity,
      visualReview: evidence.visualReview,
      patchRequest: evidence.patchRequest
    }),
    observationByRoute: new Map(),
    authorityModuleSource: evidence.authorityModuleSource,
    generatorSource: evidence.generatorSource
  });
  const withObservation = (mutated) => {
    mutated.observationByRoute = new Map(Object.entries(mutated.observation.routes ?? {}));
    return mutated;
  };

  const mutations = [
    ["an Oregon route loses its authority record", (e) => { e.registry.records = e.registry.records.filter((r) => r.routeId !== OR_ROUTES[0]); }],
    ["a route stops being bound to the packet", (e) => { for (const r of e.registry.records) if (r.jurisdiction === "OR") r.officialSources = r.officialSources.filter((s) => s.sourceId !== PACKET_FORM); }],
    ["a route stops being bound to the criminal-history form", (e) => { for (const r of e.registry.records) if (r.jurisdiction === "OR") r.officialSources = r.officialSources.filter((s) => s.sourceId !== CCH_FORM); }],
    ["a route's disposition stops being a paid packet", (e) => { for (const r of e.registry.records) if (r.jurisdiction === "OR") r.serviceDisposition = "non_filing_guidance"; }],
    ["the authority stops naming a missing proof", (e) => { for (const r of e.registry.records) if (r.jurisdiction === "OR") { r.outputLegalApproval = { state: "passed", reviewerId: "x", decidedAt: "2026-08-29", scopeSha256: "a".repeat(64) }; r.finalVerification = { state: "bound", verifierId: "x", boundInputsSha256: "b".repeat(64), verifiedAt: "2026-08-29" }; r.visualReview = { state: "passed", pagesReviewed: 7, pageCount: 7, evidenceSha256: "c".repeat(64), reviewedBy: "x", reviewedAt: "2026-08-29" }; for (const s of r.officialSources) { s.sha256 = "d".repeat(64); s.heldInRepository = true; } } }],
    ["the lane's packet digest changes", (e) => { e.sourceIdentity.sources.find((s) => s.sourceId === PACKET_FORM).sha256 = "0".repeat(64); }],
    ["the lane's criminal-history digest changes", (e) => { e.sourceIdentity.sources.find((s) => s.sourceId === CCH_FORM).sha256 = "0".repeat(64); }],
    ["a source identity loses its second witness", (e) => { e.sourceIdentity.sources[0].corroboratedBy = ["one-record-only"]; }],
    ["a source digest becomes the hash of its own identifier", (e) => { const s = e.sourceIdentity.sources[0]; s.sha256 = sha256(Buffer.from(s.sourceId, "utf8")); }],
    ["the lane claims it re-hashed bytes it never had", (e) => { e.sourceIdentity.sources[0].bytesRehashedOnThisRun = true; }],
    ["the review covers fewer pages than the bound forms have", (e) => { e.visualReview.pageCount = 5; }],
    ["the review leaves a page unreviewed", (e) => { e.visualReview.pagesReviewed = 6; }],
    ["a bound form loses a page in its artifact", (e) => { e.visualReview.allPagesRetained = false; }],
    ["a finalized artifact keeps a fillable form", (e) => { e.visualReview.noResidualFillableForm = false; }],
    ["a value is clipped", (e) => { e.visualReview.noClippedValues = false; }],
    ["the review drops one of the two bound forms", (e) => { e.visualReview.forms = e.visualReview.forms.slice(0, 1); }],
    ["the review's per-page records stop covering the pages", (e) => { e.visualReview.forms[0].pages = e.visualReview.forms[0].pages.slice(0, 2); }],
    ["a reviewed artifact is not the artifact on disk", (e) => { e.visualReview.forms[0].finalizedArtifactSha256 = "0".repeat(64); }],
    ["a reviewed form confirms no drawn value", (e) => { e.visualReview.forms[0].valuesDrawnAndVerified = 0; }],
    ["active content survives into a reviewed artifact", (e) => { e.visualReview.forms[0].activeContentResult = "dirty"; }],
    ["an expected value is not visible", (e) => { e.visualReview.forms[0].allExpectedValuesVisible = false; }],
    ["the contact-sheet panels stop differing", (e) => { e.visualReview.forms[0].panelsDiffer = false; }],
    ["the review claims to stand in for independent review", (e) => { e.visualReview.doesNotEstablish = ["nothing"]; }],
    ["the patch request claims to create an approval", (e) => { e.patchRequest.createsApproval = true; }],
    ["the patch request proposes a different packet digest", (e) => { e.patchRequest.proofsLaneCCloses.officialSources.find((s) => s.sourceId === PACKET_FORM).sha256 = "0".repeat(64); }],
    ["the patch request and the review disagree on pages", (e) => { e.patchRequest.proofsLaneCCloses.visualReview.pageCount = 99; }],
    ["the patch request drops the observation half", (e) => { delete e.patchRequest.observationSnapshotMustAlsoMove; }],
    ["the patch request stops saying legal approval is not the lane's", (e) => { e.patchRequest.proofsLaneCCannotClose.outputLegalApproval = ""; }],
    ["heldInRepository becomes true in the registry", (e) => { for (const r of e.registry.records) for (const s of r.officialSources) s.heldInRepository = true; }],
    ["the launch graph starts holding forms", (e) => { const rows = e.launchGraph.routes ?? e.launchGraph.rows ?? []; if (rows[0]) { rows[0].sourceAssets = rows[0].sourceAssets ?? {}; rows[0].sourceAssets.officialFormIdsHeldInThisRepository = ["X-1"]; } }],
    ["the authority drops heldInRepository entirely", (e) => { e.authorityModuleSource = e.authorityModuleSource.replaceAll("heldInRepository", "somethingElse"); }],
    ["the generator stops hashing the identifier string", (e) => { e.generatorSource = e.generatorSource.replace("sha256(`${sourceId}`)", "sha256(sourceBytes)"); }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = clone();
    mutate(mutated);
    const caught = staticFailures(withObservation(mutated)).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-oregon-grade-a-lane-c --mutations FAILED — ${undetected} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way Oregon's candidate evidence could overstate itself, lose its binding to the authority, or quietly become commercial is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = [...staticFailures(evidence), ...(await productPathFailures())];

const decisions = OR_ROUTES.map((routeId) => {
  const record = evidence.registry.records.find((row) => row.routeId === routeId) ?? null;
  return evaluateFulfillmentAuthority(record, evidence.observationByRoute.get(routeId) ?? null, routeId);
});

console.log(
  `OR Grade-A, Lane C candidate: ${OR_ROUTES.length} routes bound to ${PACKET_FORM} (${PACKET_SHA.slice(0, 12)}…, ${PACKET_PAGES}pp) ` +
  `and ${CCH_FORM} (${CCH_SHA.slice(0, 12)}…, ${CCH_PAGES}pp); ` +
  `page-by-page review over ${evidence.visualReview.pagesReviewed}/${evidence.visualReview.pageCount} pages of both.`
);
for (const decision of decisions) {
  console.log(`  ${decision.routeId}: ${decision.state}, ${decision.missingProof.length} proof(s) still missing`);
}
console.log(
  "Authority verdict: none of the three is COMPLETE_PACKET_PROVEN and none is commercially eligible. " +
  "Lane C closed official-source identity and page-by-page visual review; output-level legal approval and " +
  "final-verification binding are not a lane's to grant."
);

if (problems.length > 0) {
  console.error(`\nverify-rcap-oregon-grade-a-lane-c FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("Oregon stays CANDIDATE_ONLY, its proofs are derived and current, and the packet reaches only the participant who owns the matter.");
