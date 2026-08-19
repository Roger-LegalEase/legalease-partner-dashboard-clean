#!/usr/bin/env node
// SELLABLE PATHWAY CLOSURE LEDGER — generator.
//
//   node scripts/generate-rcap-sellable-pathway-closure.mjs
//   node scripts/generate-rcap-sellable-pathway-closure.mjs --check
//
// This is the SECOND canonical nationwide denominator. It does not replace,
// reinterpret or renumber the 497-track terminal-treatment ledger in
// data/rcap-ledger/track-terminalization.json, which is read here strictly as
// an input and never written.
//
// The 497 ledger answers: "does every legal track have a complete participant
// treatment?"  It is satisfied by guidance, by an exclusion or by a deferral.
//
// This ledger answers a question that one cannot answer:
//
//     Does every pathway LegalEase INTENDS TO SELL actually produce a working,
//     paid packet for the participant?
//
// A pathway intended for a paid self-help packet is not closed by being
// reclassified. guidance_only, hold_guidance_only, needs_review,
// waiting_rule_not_executed, an unreachable needs_more_info, a deferral caused
// only by unfinished implementation, an acquirable-but-unacquired source, a
// missing packet, a missing renderer, and a pending form / technical / legal
// review are TEMPORARY BLOCKERS on an intended paid pathway. They are recorded
// here as open blockers against an open pathway. None of them is a completed
// product treatment and none of them removes a pathway from the denominator.
//
// Guidance-only is a correct terminal treatment only when the legal mechanism gives the
// participant no filing to prepare, when another actor controls the action, or
// when the route is explicitly outside the paid product.
//
// Everything below is derived from committed evidence. Nothing is asserted.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");
// Writing the freeze is a deliberate act, never a side effect of regenerating
// the ledger. A denominator that re-froze itself on every run would record
// whatever the code happened to derive that day, which is the opposite of a
// frozen denominator.
const FREEZE = process.argv.includes("--freeze");

const PROFILES_DIR = "src/lib/rcap-engine/compiled/profiles";
const ROUTE_METADATA = "data/expungement-ai/route-product-metadata.json";
const TREATMENTS_DIR = "data/rcap-all50/terminalization-treatments";
const TRACK_LEDGER = "data/rcap-ledger/track-terminalization.json";
const RECLASSIFICATIONS = "data/rcap-ledger/sellable-pathway-reclassifications.json";
const FROZEN = "data/rcap-ledger/sellable-pathway-denominator.frozen.json";
const EVALUATOR = "src/lib/rcap-engine/evaluator.ts";

const JSON_OUT = "data/rcap-ledger/sellable-pathway-closure.json";
const MD_OUT = "docs/record-clearing/sellable-pathway-closure.md";

const WINDOW_ID = "sellable-closure-w1";

const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// --------------------------------------------------------------------------- runtime under test
const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { renderRcapPacketPdf } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");

// --------------------------------------------------------------------------- inputs
const profiles = fs
  .readdirSync(path.join(rootDir, PROFILES_DIR))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => readJson(`${PROFILES_DIR}/${f}`));

const routeMetadata = readJson(ROUTE_METADATA).routes;
const trackLedger = readJson(TRACK_LEDGER);
const reclassifications = readJson(RECLASSIFICATIONS);

const treatments = [];
for (const file of fs.readdirSync(path.join(rootDir, TREATMENTS_DIR)).sort()) {
  if (file.startsWith("_") || !file.endsWith(".json")) continue;
  const payload = readJson(`${TREATMENTS_DIR}/${file}`);
  for (const treatment of payload.treatments ?? []) treatments.push(treatment);
}
const treatmentByTrack = new Map(treatments.map((t) => [t.trackId, t]));

// The live payment gate. Parsed from the evaluator source for the same reason
// scripts/audit-petition-route-inventory.mjs does: these sets ARE the gate, and
// a re-implementation here would measure this script instead of the runtime.
const evaluatorSource = read(EVALUATOR);
function evaluatorRouteSet(name) {
  const match = evaluatorSource.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`, "m"));
  if (!match) throw new Error(`evaluator.ts no longer declares ${name}; the closure ledger cannot measure the payment gate.`);
  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((k) => /^[A-Z]{2}:/.test(k)));
}
const RATIFIED_DEPLOYABLE = evaluatorRouteSet("RATIFIED_DEPLOYABLE_ROUTES");

// --------------------------------------------------------------------------- track -> pathway
const tracksByPathway = new Map();
for (const track of trackLedger.tracks) {
  for (const pathwayId of track.mappedCompiledPathwayIds ?? []) {
    const key = `${track.jurisdiction}:${pathwayId}`;
    if (!tracksByPathway.has(key)) tracksByPathway.set(key, []);
    tracksByPathway.get(key).push(track);
  }
}

// --------------------------------------------------------------------------- causation
//
// Roger's rule: "exact deferral caused only by unfinished implementation" is
// NOT a completed treatment. A deferral earns the exact_external_deferral
// category only when a SPECIFIC EXTERNAL fact, official source or legal event
// prevents the route — something outside our own build queue.
//
// A treatment that says the stop is ours is, by its own words, an open blocker.
const OUR_OWN_STOP = [
  "a limit on us",
  "un límite nuestro",
  "not bound into the system",
  "has not finished",
  "have not finished",
  "we are not producing",
  "we do not yet",
  "we have not",
  "not yet built",
  "not wired",
  "not implemented",
  "technical proof checks",
  "output and technical proof"
];

function statedCausation(treatment) {
  if (!treatment) return null;
  const corpus = [
    treatment.treatmentBasis,
    treatment.stopReason?.en,
    treatment.mechanism?.en
  ].filter((v) => typeof v === "string").join(" \n ").toLowerCase();
  const hits = OUR_OWN_STOP.filter((phrase) => corpus.includes(phrase));
  if (hits.length > 0) return { cause: "unfinished_implementation", evidencePhrases: hits };
  // An external blocker must be DECLARED, not inferred. Nothing is read as an
  // external cause on the strength of prose alone.
  if (treatment.externalBlocker && typeof treatment.externalBlocker === "object") {
    const { kind, fact, whoResolves, howResolved } = treatment.externalBlocker;
    if (kind && fact && whoResolves && howResolved) {
      return { cause: "declared_external_blocker", externalBlocker: treatment.externalBlocker };
    }
    return { cause: "incomplete_external_blocker_declaration" };
  }
  return { cause: "undeclared" };
}

// --------------------------------------------------------------------------- classification
const CATEGORIES = [
  "paid_packet_intended",
  "non_filing_guidance",
  "product_scope_exclusion",
  "legally_unavailable",
  "exact_external_deferral"
];

const NON_FILING_PRODUCT_TYPES = new Set(["automatic_relief", "prosecutor_or_agency", "guidance_only"]);

const reclassificationByKey = new Map((reclassifications.reclassifications ?? []).map((r) => [r.pathwayKey, r]));

function classify(profile, pathway) {
  const code = profile.jurisdiction.code;
  const key = `${code}:${pathway.id}`;
  const meta = routeMetadata[key];
  const tracks = tracksByPathway.get(key) ?? [];
  const trackTreatments = tracks.map((t) => treatmentByTrack.get(t.trackId)).filter(Boolean);

  // Committed evidence that the participant has a filing of their own to
  // prepare. This is the single strongest signal in the repository and it
  // OUTRANKS every treatment classification: a route on which the participant
  // files something is a route on which a packet can be prepared.
  const filingEvidence = trackTreatments
    .filter((t) => t.participantFiles?.filesSomething === true)
    .map((t) => ({ trackId: t.trackId, treatment: t.treatment, participantFiles: t.participantFiles.en }));

  const signed = reclassificationByKey.get(key);
  if (signed) {
    return {
      category: signed.newClassification,
      categoryBasis: `Signed reclassification ${signed.id}: ${signed.reason}`,
      evidence: { signedReclassification: signed, filingEvidence, tracks: tracks.map((t) => t.trackId) }
    };
  }

  const evidence = {
    routeType: pathway.routeType ?? null,
    productRouteType: meta?.productRouteType ?? null,
    userFiled: meta?.userFiled ?? null,
    currentlyOperative: meta?.currentlyOperative ?? null,
    paidRouteBlocker: meta?.paidRouteBlocker ?? null,
    packetPlanMode: profile.packetGenerator?.pathways?.find((p) => p.pathwayId === pathway.id)?.mode ?? null,
    tracks: tracks.map((t) => t.trackId),
    trackTreatments: trackTreatments.map((t) => ({ trackId: t.trackId, treatment: t.treatment, causation: statedCausation(t) })),
    filingEvidence
  };

  if (pathway.routeType === "out_of_scope") {
    return { category: "product_scope_exclusion", categoryBasis: "The compiled profile types this pathway out_of_scope.", evidence };
  }
  if (meta?.paidRouteBlocker === "duplicate") {
    return { category: "product_scope_exclusion", categoryBasis: "Recorded as a duplicate of another compiled route; it is not a separate product.", evidence };
  }
  const scopeExclusionTreatment = trackTreatments.find((t) => t.treatment === "deliberate_scope_exclusion");
  if (scopeExclusionTreatment && filingEvidence.length === 0) {
    return { category: "product_scope_exclusion", categoryBasis: `Deliberate scope exclusion recorded on ${scopeExclusionTreatment.trackId}.`, evidence };
  }

  if (meta && meta.currentlyOperative === false) {
    return { category: "legally_unavailable", categoryBasis: "Route metadata records the mechanism as not currently operative.", evidence };
  }

  // A declared external blocker is the ONLY way into exact_external_deferral.
  const externalTreatment = trackTreatments.find((t) => statedCausation(t)?.cause === "declared_external_blocker");
  if (externalTreatment) {
    return {
      category: "exact_external_deferral",
      categoryBasis: `${externalTreatment.trackId} declares a specific external blocker.`,
      evidence
    };
  }

  // From here the participant either files something or does not.
  if (filingEvidence.length > 0) {
    return {
      category: "paid_packet_intended",
      categoryBasis: `Committed treatment evidence states the participant files their own document(s) on this route (${filingEvidence.map((f) => f.trackId).join(", ")}).`,
      evidence
    };
  }

  if (meta && meta.userFiled === false && NON_FILING_PRODUCT_TYPES.has(meta.productRouteType)) {
    return {
      category: "non_filing_guidance",
      categoryBasis: `Route metadata records no participant filing (productRouteType=${meta.productRouteType}); relief is automatic or another actor controls the action.`,
      evidence
    };
  }

  const nonFilingTreatment = trackTreatments.find((t) => t.participantFiles?.filesSomething === false);
  if (nonFilingTreatment && (!meta || meta.userFiled !== true)) {
    return {
      category: "non_filing_guidance",
      categoryBasis: `${nonFilingTreatment.trackId} records that the participant files nothing on this route.`,
      evidence
    };
  }

  if (meta && meta.userFiled === true) {
    return {
      category: "paid_packet_intended",
      categoryBasis: `Route metadata records a participant-filed ${meta.productRouteType} route in product scope.`,
      evidence
    };
  }

  // The filing question is not answered by any committed evidence. This never
  // resolves toward guidance: an unanswered product question is an open
  // question, and the safe reading of "we do not know whether the participant
  // files something" is "we owe this participant a packet or a reason". Pardon
  // and board routes land here because route metadata derives userFiled from
  // the court product types alone, while the committed treatments for several
  // of them state that the applicant signs and files the application.
  return {
    category: "paid_packet_intended",
    categoryBasis: meta
      ? `Route metadata records productRouteType=${meta.productRouteType} but does not answer whether the participant files something; the pathway is held in the paid denominator until an evidenced filing determination is recorded.`
      : "No product classification evidence exists for this pathway; it is held in the paid denominator until an evidenced classification is recorded.",
    evidence: { ...evidence, unclassified: !meta, filingDeterminationMissing: true }
  };
}

// --------------------------------------------------------------------------- render probe
//
// Stage 7 is proved, not assumed. Every intended-sellable pathway is put
// through the real packet route resolver, and where the resolver admits a
// renderer the real browser-free renderer is asked to produce bytes.
function probePacket(code, pathwayId, label) {
  return {
    id: `closure-probe-${code}-${pathwayId}`.slice(0, 120),
    partnerSlug: "closure-probe",
    state: code,
    pathway: pathwayId,
    status: "ready_for_review",
    reliefOutcome: "not_recorded",
    documentType: label,
    petitionerFirstName: "Probe",
    petitionerLastName: "Participant",
    needsRecordReview: false,
    generatedHtml: "",
    generatedPlainText: `${code} ${label} closure probe`,
    filingInstructions: ["Closure probe."],
    countyCourtInstructions: [],
    filingNextStepsPacket: {
      title: `${code} filing next steps`,
      plainText: "Closure probe.",
      filingLocation: "Closure probe.",
      filingMethod: "Closure probe.",
      requiredDocuments: [],
      serviceAndCopies: [],
      feeSummary: [],
      courtContactOrLocationGuidance: [],
      afterFiling: [],
      trackingChecklist: [],
      workflowGaps: [],
      safetyDisclaimer: "Closure probe."
    },
    missingFields: [],
    safetyDisclaimer: "Closure probe."
  };
}

async function renderProbe(code, pathwayId, label, route) {
  if (!packetRouteCanRender(route)) {
    return { rendered: false, reason: `resolver refused: routeKind=${route.routeKind}`, bytes: 0 };
  }
  try {
    const pdf = await renderRcapPacketPdf(probePacket(code, pathwayId, label), "court");
    const valid = pdf.length > 0 && pdf.subarray(0, 5).toString("latin1") === "%PDF-";
    return { rendered: valid, reason: valid ? "renderer produced valid PDF bytes" : "renderer produced bytes that are not a PDF", bytes: pdf.length };
  } catch (error) {
    return { rendered: false, reason: `renderer threw: ${error instanceof Error ? error.message : String(error)}`, bytes: 0 };
  }
}

// --------------------------------------------------------------------------- blockers
const BLOCKER_LABELS = {
  route_metadata: "The engine does not recognise this as a user-filed court/administrative route; explicit product route metadata is not set.",
  gate_build: "The named substantive eligibility gate is not coded and verified, so the route fails closed to review.",
  intake_fix: "A required screening fact is not modelable from the current public intake.",
  wait_anchor_fix: "The route-specific waiting period / anchor is not coded, so the engine fails closed on ambiguity.",
  legal_reconfirmation: "Counsel ratification of this route is not current.",
  legal_action_required: "A named legal question is open and owned.",
  not_paid_product: "Recorded as not a paid product.",
  none: null
};

function openBlockers(entry) {
  const blockers = [];
  const meta = entry.meta;
  if (!meta) {
    blockers.push({ id: "unclassified_route", severity: "blocking", statement: "This compiled pathway has no row in route-product-metadata.json, so no product decision exists for it." });
  }
  if (entry.classification.evidence?.filingDeterminationMissing === true && meta) {
    blockers.push({
      id: "filing_determination_missing",
      severity: "blocking",
      statement: `Route metadata types this as ${meta.productRouteType} and does not record whether the participant files something, so no product decision closes this pathway either way.`
    });
  }
  if (meta && meta.paidRouteBlocker && meta.paidRouteBlocker !== "none" && BLOCKER_LABELS[meta.paidRouteBlocker]) {
    const statement = meta.paidRouteBlocker === "not_paid_product"
      ? "Route metadata records this as not a paid product, and committed treatment evidence records that the participant files their own document(s) on this route. The conflict is unresolved; under the controlling decision it is an open blocker, not a completed guidance treatment."
      : BLOCKER_LABELS[meta.paidRouteBlocker];
    blockers.push({ id: meta.paidRouteBlocker, severity: "blocking", statement });
  }
  for (const secondary of meta?.secondaryBlockers ?? []) {
    if (BLOCKER_LABELS[secondary]) blockers.push({ id: secondary, severity: "blocking", statement: BLOCKER_LABELS[secondary] });
  }
  if (!entry.stages.packetSpecComplete) {
    blockers.push({ id: "packet_spec_incomplete", severity: "blocking", statement: "The compiled packet plan does not yet name the required inputs, source rules and source forms a packet needs." });
  }
  if (!entry.stages.legallyApprovedPacket) {
    blockers.push({ id: "legal_review_pending", severity: "blocking", statement: "No current counsel ratification records this route as packet-capable and payable." });
  }
  if (!entry.stages.successfullyRendered) {
    blockers.push({ id: entry.render.rendered === false && entry.route.rendererKind === "none" ? "renderer_unavailable" : "render_failed", severity: "blocking", statement: `No packet artifact is produced for this route today (${entry.render.reason}).` });
  }
  // A treatment that stops the route on our own unfinished work is an open
  // blocker on a paid pathway, never a completed treatment.
  for (const t of entry.classification.evidence.trackTreatments ?? []) {
    if (t.causation?.cause === "unfinished_implementation") {
      blockers.push({
        id: "guidance_substitution",
        severity: "blocking",
        statement: `${t.trackId} is served to the participant as a ${t.treatment} whose own stated reason is our unfinished work; it is a temporary blocker on a paid pathway, not a completed product treatment.`
      });
    }
  }
  const seen = new Set();
  return blockers.filter((b) => (seen.has(b.id + b.statement) ? false : seen.add(b.id + b.statement)));
}

// --------------------------------------------------------------------------- build
const entries = [];
for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  for (const pathway of profile.pathways) {
    const key = `${code}:${pathway.id}`;
    const meta = routeMetadata[key];
    const classification = classify(profile, pathway);
    const plan = packetPlanForPathway(profile, pathway.id);
    const route = resolvePacketRoute({ state: code, pathway: pathway.id });
    const lawrence = pathway.lawrenceRatification ?? null;

    const stages = {
      intendedSellable: classification.category === "paid_packet_intended",
      publiclyReachableSellable: Boolean(meta?.paymentProductEligible === true && RATIFIED_DEPLOYABLE.has(key)),
      authoritativePacketReady: meta?.packetFulfillmentStatus === "ready" && meta?.paidRouteBlocker === "none",
      packetSpecComplete: isPacketPlanFulfillmentReady(plan),
      technicallyApprovedPacket: false,
      legallyApprovedPacket: Boolean(
        lawrence
        && lawrence.status === "ratified_deployable"
        && lawrence.packet_capable === true
        && lawrence.payment_allowed_when_engine_confirms === true
      ),
      successfullyRendered: false
    };

    const render = classification.category === "paid_packet_intended"
      ? await renderProbe(code, pathway.id, pathway.label, route)
      : { rendered: false, reason: "not an intended-sellable pathway; no render is owed", bytes: 0 };
    stages.successfullyRendered = render.rendered === true;

    // Technical approval is the absence of an open technical blocker AND a
    // route the runtime will actually build a render job for.
    const technicalBlockers = new Set(["route_metadata", "gate_build", "intake_fix", "wait_anchor_fix", "packet_form_work"]);
    stages.technicallyApprovedPacket = Boolean(
      meta
      && !technicalBlockers.has(meta.paidRouteBlocker)
      && (meta.secondaryBlockers ?? []).every((b) => !technicalBlockers.has(b))
      && packetRouteCanRender(route)
    );

    const entry = {
      pathwayKey: key,
      jurisdiction: code,
      pathwayId: pathway.id,
      pathwayLabel: pathway.label,
      category: classification.category,
      categoryBasis: classification.categoryBasis,
      classification,
      meta: meta ?? null,
      route: { routeKind: route.routeKind, rendererKind: route.rendererKind, sellable: route.sellable, creditConsumable: route.creditConsumable, reason: route.reason },
      lawrence,
      stages,
      render
    };
    entry.openBlockers = classification.category === "paid_packet_intended" ? openBlockers(entry) : [];
    delete entry.meta;
    entry.routeMetadata = meta
      ? {
        productRouteType: meta.productRouteType,
        userFiled: meta.userFiled,
        paymentProductEligible: meta.paymentProductEligible,
        packetFulfillmentStatus: meta.packetFulfillmentStatus,
        paidRouteBlocker: meta.paidRouteBlocker,
        checkoutEligibility: meta.checkoutEligibility
      }
      : null;
    entries.push(entry);
  }
}

// --------------------------------------------------------------------------- aggregates
const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, entries.filter((e) => e.category === c).length]));
const intended = entries.filter((e) => e.category === "paid_packet_intended");

const STAGE_ORDER = [
  "intendedSellablePathways",
  "publiclyReachableSellablePathways",
  "authoritativePacketReadyPathways",
  "packetSpecCompletePathways",
  "technicallyApprovedPacketPathways",
  "legallyApprovedPacketPathways",
  "successfullyRenderedPathways"
];
const STAGE_FIELD = {
  intendedSellablePathways: "intendedSellable",
  publiclyReachableSellablePathways: "publiclyReachableSellable",
  authoritativePacketReadyPathways: "authoritativePacketReady",
  packetSpecCompletePathways: "packetSpecComplete",
  technicallyApprovedPacketPathways: "technicallyApprovedPacket",
  legallyApprovedPacketPathways: "legallyApprovedPacket",
  successfullyRenderedPathways: "successfullyRendered"
};

const stageSets = {};
for (const stage of STAGE_ORDER) {
  stageSets[stage] = intended.filter((e) => e.stages[STAGE_FIELD[stage]] === true).map((e) => e.pathwayKey).sort();
}
const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, stageSets[s].length]));

const invariantBreaks = [];
const target = stageCounts.intendedSellablePathways;
for (const stage of STAGE_ORDER.slice(1)) {
  if (stageCounts[stage] !== target) {
    const present = new Set(stageSets[stage]);
    invariantBreaks.push({
      stage,
      expected: target,
      actual: stageCounts[stage],
      shortfall: target - stageCounts[stage],
      missingPathwayKeys: stageSets.intendedSellablePathways.filter((k) => !present.has(k))
    });
  }
}

// The money gate must never be wider than the delivery gate. This is the
// "do not charge for guidance" invariant, measured directly.
const payableButUndeliverable = intended
  .filter((e) => e.stages.publiclyReachableSellable && !e.stages.successfullyRendered)
  .map((e) => ({ pathwayKey: e.pathwayKey, routeKind: e.route.routeKind, renderReason: e.render.reason }));

// Payment may not run ahead of counsel. A route the evaluator opens payment for
// while no compiled counsel ratification records it as packet-capable and
// payable is money taken on an unrecorded legal approval.
const payableWithoutRecordedLegalApproval = intended
  .filter((e) => e.stages.publiclyReachableSellable && !e.stages.legallyApprovedPacket)
  .map((e) => ({ pathwayKey: e.pathwayKey, lawrenceStatus: e.lawrence?.status ?? "no compiled counsel ratification record" }));

const guidanceSubstitution = [];
for (const treatment of treatments) {
  const causation = statedCausation(treatment);
  if (treatment.participantFiles?.filesSomething === true && treatment.treatment !== "production_packet") {
    guidanceSubstitution.push({
      trackId: treatment.trackId,
      jurisdiction: treatment.jurisdiction,
      servedAs: treatment.treatment,
      participantFilesSomething: true,
      statedCause: causation?.cause ?? "undeclared",
      basis: String(treatment.treatmentBasis ?? "").slice(0, 240)
    });
  }
}

const unclassified = entries.filter((e) => e.classification.evidence?.unclassified === true).map((e) => e.pathwayKey);

const denominatorKeys = intended.map((e) => e.pathwayKey).sort();
const denominatorHash = sha256(denominatorKeys.join("\n"));

const ledger = {
  schemaVersion: "rcap-sellable-pathway-closure/v1",
  generatedBy: "scripts/generate-rcap-sellable-pathway-closure.mjs",
  windowId: WINDOW_ID,
  denominatorName: "SELLABLE PATHWAY CLOSURE LEDGER",
  separateFrom: {
    ledger: TRACK_LEDGER,
    denominator: "497 tracks",
    rule: "This ledger neither replaces nor reinterprets 497/497. The 497 denominator asks whether every legal track has a complete participant treatment. This denominator asks whether every pathway LegalEase intends to sell produces a working paid packet. A track may be terminal in the 497 ledger and its pathway still open here."
  },
  categoryRule: "Every compiled pathway carries exactly one category. paid_packet_intended may never end as guidance-only. Removing a pathway from paid_packet_intended requires a signed record in data/rcap-ledger/sellable-pathway-reclassifications.json carrying the exact previous classification, the exact new classification, a written reason and an authority; implementation difficulty, a missing form, stale review and an evaluator defect are not valid reasons.",
  categories: CATEGORIES,
  universe: { compiledPathways: entries.length, jurisdictions: profiles.length },
  categoryCounts: byCategory,
  denominator: { count: denominatorKeys.length, sha256: denominatorHash },
  invariant: {
    chain: STAGE_ORDER,
    counts: stageCounts,
    holds: invariantBreaks.length === 0,
    breaks: invariantBreaks.map((b) => ({ ...b, missingPathwayKeys: b.missingPathwayKeys.slice(0, 400) }))
  },
  doNotChargeForGuidance: {
    rule: "A pathway that may take money must be able to deliver an artifact. publiclyReachableSellable ⊆ successfullyRendered.",
    holds: payableButUndeliverable.length === 0,
    payableButUndeliverable
  },
  paymentFollowsLegalApproval: {
    rule: "A route may open payment only where a compiled counsel ratification records it as packet-capable and payable. publiclyReachableSellable ⊆ legallyApprovedPacket.",
    holds: payableWithoutRecordedLegalApproval.length === 0,
    payableWithoutRecordedLegalApproval
  },
  guidanceSubstitution: {
    rule: "A track whose own treatment records that the participant files something may not be served as a completed guidance, deferral or exclusion treatment. Each one below is an open blocker on a paid pathway.",
    count: guidanceSubstitution.length,
    tracks: guidanceSubstitution
  },
  unclassifiedPathways: unclassified,
  stageSets,
  pathways: entries.sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey))
};

// --------------------------------------------------------------------------- report
function md() {
  const lines = [];
  lines.push(`# Sellable pathway closure — window ${WINDOW_ID}`);
  lines.push("");
  lines.push("This is the second nationwide denominator. It does not replace or renumber the");
  lines.push("497-track terminal-treatment ledger, which answers a different question and stays");
  lines.push("at 497/497. This one answers: **does every pathway LegalEase intends to sell");
  lines.push("actually produce a working paid packet?**");
  lines.push("");
  lines.push("## Intended-sellable denominator");
  lines.push("");
  lines.push("| Category | Pathways |");
  lines.push("|---|---|");
  for (const category of CATEGORIES) lines.push(`| \`${category}\` | ${byCategory[category]} |`);
  lines.push(`| **total compiled pathways** | **${entries.length}** |`);
  lines.push("");
  lines.push(`Frozen denominator: **${denominatorKeys.length}** pathways, sha256 \`${denominatorHash.slice(0, 16)}…\``);
  lines.push("");
  lines.push("## The invariant");
  lines.push("");
  lines.push("```text");
  lines.push(STAGE_ORDER.join("\n  == "));
  lines.push("```");
  lines.push("");
  lines.push("| Stage | Pathways | Shortfall against the denominator |");
  lines.push("|---|---|---|");
  for (const stage of STAGE_ORDER) {
    const shortfall = target - stageCounts[stage];
    lines.push(`| \`${stage}\` | ${stageCounts[stage]} | ${shortfall === 0 ? "—" : `**${shortfall}**`} |`);
  }
  lines.push("");
  lines.push(ledger.invariant.holds
    ? "The invariant holds. Every intended-sellable pathway is reachable, specified, approved and rendered."
    : `**The invariant does not hold.** ${invariantBreaks.length} of the six downstream stages fall short of the ${target}-pathway denominator. Every shortfall below is an open blocker on an open paid pathway, not a completed treatment.`);
  lines.push("");
  lines.push("## Do not charge for guidance");
  lines.push("");
  lines.push(ledger.doNotChargeForGuidance.holds
    ? "Every pathway that can take money can also deliver an artifact."
    : `**${payableButUndeliverable.length} pathway(s) can take money and cannot deliver an artifact.** The money gate (evaluator payment) and the delivery gate (packet route resolver) are not bound to each other, so a participant on these routes can be charged and then refused the packet.`);
  if (payableButUndeliverable.length > 0) {
    lines.push("");
    lines.push("| Pathway | Route kind | Why no artifact |");
    lines.push("|---|---|---|");
    for (const row of payableButUndeliverable.slice(0, 80)) {
      lines.push(`| \`${row.pathwayKey}\` | \`${row.routeKind}\` | ${row.renderReason} |`);
    }
    if (payableButUndeliverable.length > 80) lines.push(`| … | | ${payableButUndeliverable.length - 80} more |`);
  }
  lines.push("");
  lines.push("## Payment follows counsel, or it does not open");
  lines.push("");
  lines.push(ledger.paymentFollowsLegalApproval.holds
    ? "Every payable route carries a compiled counsel ratification recording it as packet-capable and payable."
    : `**${payableWithoutRecordedLegalApproval.length} payable route(s) carry no compiled counsel ratification** recording them as packet-capable and payable. The evaluator's ratified-route set and the compiled \`lawrenceRatification\` records disagree, and payment follows the wider of the two.`);
  lines.push("");
  lines.push("## Guidance substituted for a packet");
  lines.push("");
  lines.push(`${guidanceSubstitution.length} track(s) record that the participant files a document of their own and are still served`);
  lines.push("a guidance, deferral or exclusion treatment. Under the controlling decision these are");
  lines.push("temporary blockers on intended paid pathways, not completed product treatments.");
  lines.push("");
  const causeCounts = {};
  for (const row of guidanceSubstitution) causeCounts[row.statedCause] = (causeCounts[row.statedCause] ?? 0) + 1;
  lines.push("| Stated cause of the stop | Tracks |");
  lines.push("|---|---|");
  for (const [cause, count] of Object.entries(causeCounts).sort((a, b) => b[1] - a[1])) lines.push(`| \`${cause}\` | ${count} |`);
  lines.push("");
  lines.push("## Open blockers across the denominator");
  lines.push("");
  const blockerCounts = {};
  for (const entry of intended) {
    for (const blocker of entry.openBlockers) blockerCounts[blocker.id] = (blockerCounts[blocker.id] ?? 0) + 1;
  }
  lines.push("| Blocker | Pathways |");
  lines.push("|---|---|");
  for (const [id, count] of Object.entries(blockerCounts).sort((a, b) => b[1] - a[1])) lines.push(`| \`${id}\` | ${count} |`);
  lines.push("");
  const closed = intended.filter((e) => e.openBlockers.length === 0);
  lines.push(`**${closed.length} of ${intended.length}** intended-sellable pathways are closed with no open blocker.`);
  lines.push("");
  if (unclassified.length > 0) {
    lines.push("## Pathways with no row in route-product-metadata.json");
    lines.push("");
    for (const key of unclassified) lines.push(`- \`${key}\``);
    lines.push("");
  }
  lines.push("Regenerate with `npm run rcap:generate-sellable-closure`; verify with `npm run rcap:verify-sellable-closure`.");
  return lines.join("\n") + "\n";
}

// --------------------------------------------------------------------------- emit
const jsonText = JSON.stringify(ledger, null, 2) + "\n";
const mdText = md();

if (CHECK) {
  const problems = [];
  if (read(JSON_OUT) !== jsonText) problems.push(`${JSON_OUT} is stale; regenerate it.`);
  if (read(MD_OUT) !== mdText) problems.push(`${MD_OUT} is stale; regenerate it.`);
  if (problems.length > 0) {
    console.error("generate-rcap-sellable-pathway-closure --check FAILED:");
    for (const problem of problems) console.error(` - ${problem}`);
    process.exit(1);
  }
  console.log(`sellable pathway closure ledger is current: ${denominatorKeys.length} intended-sellable of ${entries.length} compiled pathways.`);
  process.exit(0);
}

if (FREEZE) {
  const frozen = {
    schemaVersion: "rcap-sellable-pathway-denominator/v1",
    frozenBy: "scripts/generate-rcap-sellable-pathway-closure.mjs --freeze",
    windowId: WINDOW_ID,
    rule: "This is the intended-sellable denominator. It does not shrink because a pathway is hard to build, because a form is missing, because a review is stale or because an evaluator is defective. It changes only through a signed record in data/rcap-ledger/sellable-pathway-reclassifications.json, and the verifier proves every difference against that register.",
    count: denominatorKeys.length,
    sha256: denominatorHash,
    pathwayKeys: denominatorKeys
  };
  fs.writeFileSync(path.join(rootDir, FROZEN), JSON.stringify(frozen, null, 2) + "\n");
  console.log(`froze ${FROZEN}: ${denominatorKeys.length} pathway(s), sha256 ${denominatorHash}`);
}

fs.mkdirSync(path.join(rootDir, path.dirname(JSON_OUT)), { recursive: true });
fs.mkdirSync(path.join(rootDir, path.dirname(MD_OUT)), { recursive: true });
fs.writeFileSync(path.join(rootDir, JSON_OUT), jsonText);
fs.writeFileSync(path.join(rootDir, MD_OUT), mdText);
console.log(`wrote ${JSON_OUT} and ${MD_OUT}`);
console.log(`intended-sellable denominator: ${denominatorKeys.length} pathway(s), sha256 ${denominatorHash}`);
for (const stage of STAGE_ORDER) console.log(`  ${stage}: ${stageCounts[stage]}`);
