// scripts/audit-petition-route-inventory.mjs
//
// Petition / application-route inventory for LegalEase / Expungement.ai / RCAP (last-mile build).
//
// READ-ONLY / AUDIT-ONLY over runtime. It does NOT change evaluator/payment behavior and does NOT move
// any route between RATIFIED_DEPLOYABLE / CORRECTED_AWAITING_RECONFIRM / HARD_GATE_PENDING /
// HELD_GUIDANCE. It classifies every compiled pathway exactly once and emits four source-controlled
// artifacts:
//   - data/expungement-ai/route-product-metadata.json      (explicit per-route product metadata)
//   - data/expungement-ai/reports/petition-route-inventory.json
//   - data/expungement-ai/reports/legal-action-required.json (machine feed)
//   - docs/expungement-ai/PETITION_ROUTE_INVENTORY.md
//   - docs/expungement-ai/LEGAL_ACTION_REQUIRED.md
//
// Ground truth for "can this route open the $50 self-help packet fee today" is the live evaluator
// payment gate (src/lib/rcap-engine/evaluator.ts):
//     paymentAllowed = route.deterministic && Boolean(plan) && routeIsRatifiedDeployable
//       && (isCourtFiledPetitionRoute || routeIsAdministrativeApplicationPacket)
//       && isPacketPlanFulfillmentReady
// No payment is inferred from legal possibility. Route recognition is driven by the STRUCTURED
// compiled routeType + explicit overrides (metadata), NOT summary regex. Anything that cannot be
// safely classified into a buildable paid bucket because legal material is missing becomes
// `legal_action_required` and a row in LEGAL_ACTION_REQUIRED.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVALUATOR_PATH = path.join(ROOT, "src/lib/rcap-engine/evaluator.ts");
const PROFILES_DIR = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const METADATA_OUT = path.join(ROOT, "data/expungement-ai/route-product-metadata.json");
const JSON_OUT = path.join(ROOT, "data/expungement-ai/reports/petition-route-inventory.json");
const LAR_JSON_OUT = path.join(ROOT, "data/expungement-ai/reports/legal-action-required.json");
const MD_OUT = path.join(ROOT, "docs/expungement-ai/PETITION_ROUTE_INVENTORY.md");
const LAR_MD_OUT = path.join(ROOT, "docs/expungement-ai/LEGAL_ACTION_REQUIRED.md");

// --------------------------------------------------------------------------- evaluator control sets
const evalSrc = fs.readFileSync(EVALUATOR_PATH, "utf8");
function parseRouteSet(name) {
  const m = evalSrc.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`, "m"));
  if (!m) throw new Error(`Could not find set ${name} in evaluator.ts`);
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((k) => /^[A-Z]{2}:/.test(k)));
}
const RATIFIED_DEPLOYABLE = parseRouteSet("RATIFIED_DEPLOYABLE_ROUTES");
const CORRECTED_AWAITING_RECONFIRM = parseRouteSet("CORRECTED_AWAITING_RECONFIRM_ROUTES");
const HARD_GATE_PENDING = parseRouteSet("HARD_GATE_PENDING_ROUTES");
const HELD_GUIDANCE = parseRouteSet("HELD_GUIDANCE_ROUTES");
const ADMIN_APPLICATION_ROUTES = parseRouteSet("ADMINISTRATIVE_APPLICATION_PACKET_ROUTES");
const SPECIAL_TIMING_KEYS = new Set([...evalSrc.matchAll(/key === "([A-Z]{2}:[^"]+)"/g)].map((m) => m[1]));

function headCommit() {
  try {
    const head = fs.readFileSync(path.join(ROOT, ".git/HEAD"), "utf8").trim();
    if (head.startsWith("ref: ")) return fs.readFileSync(path.join(ROOT, ".git", head.slice(5)), "utf8").trim().slice(0, 40);
    return head.slice(0, 40);
  } catch { return "unknown"; }
}

const profileFiles = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".json")).sort();
const profiles = profileFiles.map((f) => JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, f), "utf8")));

// --------------------------------------------------------------------------- evaluator helper ports
function packetPlanForPathway(profile, pathwayId) {
  const plan = profile.packetGenerator.pathways.find((c) => c.pathwayId === pathwayId);
  if (!plan) return undefined;
  return {
    mode: plan.mode,
    formMappingStatus: plan.formMappingStatus,
    formCandidatePaths: (plan.formCandidates ?? []).map((c) => c.relativePath),
    sourceFormIds: (plan.formCandidates ?? []).map((c) => `${profile.jurisdiction.code}:${c.relativePath}:${c.sha256}`),
    requiredInputIds: plan.requiredInputIds ?? profile.packetGenerator.requiredInputs ?? [],
    sourceRuleRefs: plan.sourceRuleRefs ?? []
  };
}
function isPacketPlanFulfillmentReady(plan) {
  if (!plan) return false;
  if (plan.mode === "automatic_relief_verification_and_guidance") return false;
  return plan.requiredInputIds.length > 0 && plan.sourceRuleRefs.length > 0 && plan.sourceFormIds.every((id) => id.includes(":"));
}
function routeKey(profile, pathway) { return `${profile.jurisdiction.code}:${pathway.id}`; }
function evaluatorTreatsAsCourtFiled(profile, pathway) {
  const code = profile.jurisdiction.code;
  const key = routeKey(profile, pathway);
  const text = `${pathway.id} ${pathway.label} ${pathway.summary}`.toLowerCase();
  const plan = packetPlanForPathway(profile, pathway.id);
  if (code === "AK") return false;
  if (ADMIN_APPLICATION_ROUTES.has(key)) return false; // Hawaii HCJDC = admin application, not court
  if (code === "CT" && pathway.id === "absolute-pardon-resulting-in-erasure") return false;
  if (code === "CT" && pathway.id === "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202") return true;
  if (code === "DC") return ["dc_actual_innocence_expungement_16_803", "dc_motion_seal_nonconviction_16_806", "dc_motion_seal_misdemeanor_conviction_5yr_16_806", "dc_motion_seal_felony_conviction_8yr_16_806"].includes(pathway.id);
  if (code === "GA" && ["non-conviction-record-restriction-through-the-agency-prosecutor-process", "automatic-restriction-of-qualifying-post-july-1-2013-non-convictions"].includes(pathway.id)) return false;
  if (code === "GA" && ["sb-288-misdemeanor-conviction-restriction-and-sealing", "restriction-and-sealing-of-a-pardoned-felony", "youthful-first-offender-restriction-route"].includes(pathway.id)) return true;
  if (code === "NY" && ["conditional-treatment-sealing-under-cpl-160-58", "discretionary-conviction-sealing-by-petition-under-cpl-160-59"].includes(pathway.id)) return true;
  if (code === "CA" && ["tool-1-dismissal-set-aside", "tool-3-petition-based-felony-sealing", "tool-4-arrest-record-sealing"].includes(pathway.id)) return true;
  if (code === "IL" && pathway.id !== "clean-slate-automatic-sealing") return true;
  if (code === "MD" && ["adult-non-conviction-expungement-under-crim-proc-10-105", "eligible-conviction-expungement-under-crim-proc-10-110", "cannabis-specific-expungement", "second-chance-act-shielding", "juvenile-expungement"].includes(pathway.id)) return true;
  if (code === "WI" && pathway.id === "adult-conviction-expungement-under-wis-stat-973-015") return true;
  if (RATIFIED_DEPLOYABLE.has(key)) return true;
  if (CORRECTED_AWAITING_RECONFIRM.has(key)) return true;
  if (/automatic|no filing|without any petition|without a petition|by operation of law|clean slate automatic/.test(text)) return false;
  if (/board of pardons|epardon|pardon portal|executive clemency|governor.?s pardon|executive-pardon|pardon guidance/.test(text)) return false;
  if (/agency\/prosecutor|prosecutor-agreed|prosecutor process|agency-only|prosecutor-only/.test(text)) return false;
  if (/department of|state police|dps|doj|cbi|cib|fingerprint|criminal-history|criminal history|data destruction|record correction|record removal|record deletion|administrative sealing/.test(text) && !/petition|motion|court/.test(text)) return false;
  if (plan?.mode === "official_form_overlay_or_source_form_set") return true;
  return /petition|motion|pleading|apply to .*court|file .*court|filed .*court|sentencing court|convicting court|circuit court|district court|superior court|municipal court|trial court|court form|forms? [a-z0-9-]*\d/i.test(text);
}

// --------------------------------------------------------------------------- explicit product metadata
// EXPLICIT_OVERRIDES is the human product/legal judgment layer (Phase 4). Route-recognition problems
// are fixed here as explicit metadata, never by expanding summary regexes.
const EXPLICIT_OVERRIDES = {
  // Hawaii HCJDC 159(b) administrative application packet — legal signoff 2026-07-01.
  "HI:nonconviction-arrest-expungement": { productRouteType: "administrative_application", filingForum: "agency", userFiled: true, legalSignoffStatus: "signed_off" },
  "HI:first-time-drug-conviction": { productRouteType: "administrative_application", filingForum: "agency", userFiled: true, legalSignoffStatus: "signed_off" },
  "HI:dui-under-21-conviction": { productRouteType: "administrative_application", filingForum: "agency", userFiled: true, legalSignoffStatus: "signed_off" },
  // Hawaii deferred-acceptance routes: the sellable step (court deferred-acceptance discharge motion vs
  // the later HCJDC application) is legally ambiguous in the source; hold for legal confirmation.
  "HI:deferred-acceptance-one-year": { productRouteType: "unknown", filingForum: "unknown", forceLegalActionRequired: true, larReason: "Forum ambiguous: HRS ch. 853 deferred-acceptance discharge is a court process, but expungement is via the HCJDC application. Confirm which is the sellable user-filed step." },
  "HI:deferred-prostitution-three-year": { productRouteType: "unknown", filingForum: "unknown", forceLegalActionRequired: true, larReason: "Forum ambiguous: HRS § 712-1200 deferred-acceptance/prostitution discharge vs later HCJDC application. Confirm the sellable user-filed step." }
};

// Structured routeType -> product route type (NOT summary regex).
function productRouteTypeFor(pathway, key) {
  if (EXPLICIT_OVERRIDES[key]?.productRouteType) return EXPLICIT_OVERRIDES[key].productRouteType;
  const rt = pathway.routeType || "unknown";
  const text = `${pathway.id} ${pathway.label}`.toLowerCase();
  if (rt === "court_filing" || rt === "review" || rt === "special") {
    if (/set-aside|set aside|vacat|annul/.test(text)) return "court_motion";
    if (/by application|application-based|application for/.test(text)) return "court_application";
    return "court_petition";
  }
  if (rt === "juvenile" || rt === "juvenile_special") return "court_petition";
  if (rt === "juvenile_guidance") return "guidance_only";
  if (rt.startsWith("automatic")) return "automatic_relief";
  if (rt === "administrative") return "prosecutor_or_agency";
  if (rt === "pardon" || rt === "pardon_then_court") return "board_or_pardon";
  if (rt === "portal_guidance") return "board_or_pardon";
  if (rt === "out_of_scope") return "unknown";
  return "unknown";
}
function filingForumFor(productRouteType, key) {
  if (EXPLICIT_OVERRIDES[key]?.filingForum) return EXPLICIT_OVERRIDES[key].filingForum;
  return {
    court_petition: "court", court_motion: "court", court_application: "court",
    administrative_application: "agency", automatic_relief: "automatic",
    board_or_pardon: "board", prosecutor_or_agency: "prosecutor", no_filing: "none",
    guidance_only: "none", unknown: "unknown"
  }[productRouteType] ?? "unknown";
}
const COURT_PRODUCT_TYPES = new Set(["court_petition", "court_motion", "court_application"]);
const PAID_CAPABLE_PRODUCT_TYPES = new Set(["court_petition", "court_motion", "court_application", "administrative_application"]);

// --------------------------------------------------------------------------- classification helpers
const NOT_OPERATIONAL_RE = /not currently operating|not yet operational|not operational|not in effect|has not taken effect|awaiting implementation/i;
const NEXUS_RE = /traffick|coerc|survivor|sexual exploitation|commercial sexual/i;
const KNOWN_DUPLICATES = {
  "CA:tool-5-proposition-64-marijuana-relief": "Superseded by the two ratified CA Prop 64 routes (prop-64-currently-serving-petition-11361-8 + prop-64-completed-sentence-application-11361-8), which carry the coded caRouteSafetyGate."
};
function parseDurationText(t) {
  const l = String(t).toLowerCase();
  const n = l.match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/);
  if (n) return `${n[1]}:${n[2][0]}`;
  return undefined;
}
function waitAmbiguous(profile, pathway, key) {
  if (SPECIAL_TIMING_KEYS.has(key)) return false;
  const waits = (pathway.waitingRules ?? []).map(parseDurationText).filter(Boolean);
  return new Set(waits).size > 1;
}
function tierOf(key) {
  if (RATIFIED_DEPLOYABLE.has(key)) return "RATIFIED_DEPLOYABLE_ROUTES";
  if (CORRECTED_AWAITING_RECONFIRM.has(key)) return "CORRECTED_AWAITING_RECONFIRM_ROUTES";
  if (HARD_GATE_PENDING.has(key)) return "HARD_GATE_PENDING_ROUTES";
  if (HELD_GUIDANCE.has(key)) return "HELD_GUIDANCE_ROUTES";
  return "other / unclassified";
}

const BUCKETS = [
  "paid_now", "paid_after_legal_reconfirmation", "paid_after_route_metadata_fix", "paid_after_gate_build",
  "paid_after_intake_fix", "paid_after_wait_anchor_fix", "paid_after_packet_form_work",
  "gate_built_wait_pending", "permanent_guidance_not_a_paid_product", "not_currently_operational",
  "discard_or_duplicate", "legal_action_required"
];

// Priority ordering for the build queue (lower = safest / cheapest to make paid first).
const BLOCKER_EFFORT = {
  none: 0, legal_reconfirmation: 1, route_metadata: 2, wait_anchor_fix: 3,
  gate_build: 4, intake_fix: 5, packet_form_work: 6, legal_action_required: 7
};

let larSeq = 0;
const larItems = [];
function openLar(route, { missingItemType, exactMissingItem, whyItMatters, engineeringBlocked, legalReviewRequired, sourceRequested, suggestedSourceType, priority }) {
  const id = `LAR-${String(++larSeq).padStart(3, "0")}`;
  larItems.push({
    id, priority, jurisdiction: route.jurisdictionCode, routeId: route.pathwayId, routeName: route.pathwayLabel,
    currentClassification: route.bucket, missingItemType, exactMissingItem, whyItMatters,
    engineeringBlocked: engineeringBlocked ? "Yes" : "No", legalReviewRequired: legalReviewRequired ? "Yes" : "No",
    sourceRequestedFromLegalTeam: sourceRequested, suggestedSourceType, status: "open", owner: "Roger / legal team",
    dateOpened: "2026-07-01", dateResolved: "", resolutionNotes: ""
  });
  return id;
}

function classify(profile, pathway) {
  const code = profile.jurisdiction.code;
  const key = routeKey(profile, pathway);
  const tier = tierOf(key);
  const plan = packetPlanForPathway(profile, pathway.id);
  const fulfillmentReady = isPacketPlanFulfillmentReady(plan);
  const engineCourt = evaluatorTreatsAsCourtFiled(profile, pathway);
  const productRouteType = productRouteTypeFor(pathway, key);
  const filingForum = filingForumFor(productRouteType, key);
  const userFiled = EXPLICIT_OVERRIDES[key]?.userFiled ?? (COURT_PRODUCT_TYPES.has(productRouteType) || productRouteType === "administrative_application");
  const text = `${pathway.id} ${pathway.label} ${pathway.summary}`.toLowerCase();
  const autoMode = plan?.mode === "automatic_relief_verification_and_guidance" || pathway.automatic === true;
  const nexus = NEXUS_RE.test(text);
  const notOp = NOT_OPERATIONAL_RE.test(text) && !RATIFIED_DEPLOYABLE.has(key);
  const isAdmin = ADMIN_APPLICATION_ROUTES.has(key);
  const paidCapable = (PAID_CAPABLE_PRODUCT_TYPES.has(productRouteType)) && !autoMode && !KNOWN_DUPLICATES[key];
  const waitAmb = waitAmbiguous(profile, pathway, key);
  const forceLar = EXPLICIT_OVERRIDES[key]?.forceLegalActionRequired === true;

  let bucket, primaryBlocker;
  const secondaryBlockers = [];
  if (KNOWN_DUPLICATES[key]) { bucket = "discard_or_duplicate"; primaryBlocker = "duplicate"; }
  else if (notOp) { bucket = "not_currently_operational"; primaryBlocker = "not_operational"; }
  else if (forceLar) { bucket = "legal_action_required"; primaryBlocker = "legal_action_required"; }
  else if (!paidCapable) { bucket = "permanent_guidance_not_a_paid_product"; primaryBlocker = autoMode ? "automatic_relief_mode" : "not_paid_product"; }
  else if (tier === "RATIFIED_DEPLOYABLE_ROUTES") { bucket = "paid_now"; primaryBlocker = "none"; }
  else if (tier === "CORRECTED_AWAITING_RECONFIRM_ROUTES") { bucket = "paid_after_legal_reconfirmation"; primaryBlocker = "legal_reconfirmation"; }
  else if (tier === "HARD_GATE_PENDING_ROUTES") { bucket = "paid_after_gate_build"; primaryBlocker = "gate_build"; }
  else if (tier === "HELD_GUIDANCE_ROUTES") {
    if (nexus) { bucket = "paid_after_intake_fix"; primaryBlocker = "intake_fix"; }
    else if (!engineCourt && !isAdmin) { bucket = "paid_after_route_metadata_fix"; primaryBlocker = "route_metadata"; }
    else { bucket = "paid_after_legal_reconfirmation"; primaryBlocker = "legal_reconfirmation"; }
  } else {
    // untiered, paid-capable court/admin route
    if (!engineCourt && !isAdmin) { bucket = "paid_after_route_metadata_fix"; primaryBlocker = "route_metadata"; }
    else if (nexus) { bucket = "paid_after_intake_fix"; primaryBlocker = "intake_fix"; }
    else if (waitAmb) { bucket = "paid_after_wait_anchor_fix"; primaryBlocker = "wait_anchor_fix"; }
    else if (!fulfillmentReady) { bucket = "paid_after_packet_form_work"; primaryBlocker = "packet_form_work"; }
    else { bucket = "paid_after_legal_reconfirmation"; primaryBlocker = "legal_reconfirmation"; }
  }
  if (bucket.startsWith("paid_after") || bucket === "gate_built_wait_pending") {
    if (waitAmb && primaryBlocker !== "wait_anchor_fix") secondaryBlockers.push("wait_anchor_fix");
    if (!fulfillmentReady && primaryBlocker !== "packet_form_work") secondaryBlockers.push("packet_form_work");
    if (!engineCourt && !isAdmin && primaryBlocker !== "route_metadata") secondaryBlockers.push("route_metadata");
  }

  const legalSignoffStatus = EXPLICIT_OVERRIDES[key]?.legalSignoffStatus ?? (
    tier === "RATIFIED_DEPLOYABLE_ROUTES" ? "signed_off" :
    tier === "CORRECTED_AWAITING_RECONFIRM_ROUTES" ? "needs_reconfirm" :
    (tier === "HARD_GATE_PENDING_ROUTES" || tier === "HELD_GUIDANCE_ROUTES") ? "blocked" :
    paidCapable ? "needs_reconfirm" : "not_applicable");
  const packetFulfillmentStatus = tier === "RATIFIED_DEPLOYABLE_ROUTES" ? "ready"
    : plan?.mode === "automatic_relief_verification_and_guidance" ? "not_applicable"
    : plan?.formMappingStatus === "source_candidate_identified" ? "needs_form_mapping"
    : plan?.formMappingStatus === "custom_or_manual_mapping_required" ? "needs_custom_packet"
    : plan?.formMappingStatus === "not_required" ? "not_applicable" : "needs_custom_packet";

  const route = {
    jurisdictionCode: code, jurisdictionName: profile.jurisdiction.name,
    pathwayId: pathway.id, pathwayLabel: pathway.label, routeKey: key,
    routeType: productRouteType, currentlyOperative: !notOp, userFiles: userFiled,
    filingForum, canEverBePaidPacket: paidCapable, evaluatorTier: tier,
    packetMode: plan?.mode ?? null, formMappingStatus: plan?.formMappingStatus ?? null,
    sourceFormCandidates: plan?.formCandidatePaths ?? [], requiredInputIds: plan?.requiredInputIds ?? [],
    sourceRuleRefs: plan?.sourceRuleRefs ?? (pathway.sourceRef ? [pathway.sourceRef] : []),
    bucket, primaryBlocker, secondaryBlockers,
    productRouteType, paymentProductEligible: bucket === "paid_now",
    legalSignoffStatus, packetFulfillmentStatus, engineRecognizedAsCourtFiled: engineCourt,
    isAdministrativeApplication: isAdmin, packetFulfillmentReady: fulfillmentReady,
    missingEligibilityGates: [], missingIntakeQuestions: [], missingWaitAnchorEventLogic: [],
    missingPacketFormFulfillment: [], routeMetadataIssue: null, legalActionRequiredItemIds: [],
    engineeringWorkNeeded: "", legalSourceReviewNeeded: "", materialNeededFromLegalTeam: "",
    verifierCasesRequiredBeforePayment: [], priority: "", effortScore: BLOCKER_EFFORT[primaryBlocker] ?? 9
  };

  // Blocker detail + engineering/legal work + LAR generation.
  fillBlockerDetail(route, { plan, tier, isAdmin, waitAmb, engineCourt, nexus, forceLar, key });
  return route;
}

function fillBlockerDetail(route, ctx) {
  const b = route.primaryBlocker;
  if (b === "gate_build") route.missingEligibilityGates.push("Named substantive eligibility gate (offense classes, count caps, prior-relief bars, preconditions) not yet coded/verified in routeSpecificSafetyGate; HARD_GATE_PENDING fails closed to needs_review.");
  if (b === "route_metadata") route.routeMetadataIssue = "Engine does not recognize this route as a user-filed court/admin route (isCourtFiledPetitionRoute=false and not an approved admin route). Fix by adding explicit product route metadata, NOT by expanding summary regexes.";
  if (b === "intake_fix") route.missingIntakeQuestions.push("Trafficking/coercion/survivor nexus fact not modelable from current public intake; add a public intake question + gate before this route can be screened.");
  if (b === "wait_anchor_fix") route.missingWaitAnchorEventLogic.push("Multiple distinct source waits could apply and no route-specific specialRouteTiming entry exists; the engine fails closed on ambiguity. Add route-specific wait/anchor/event logic.");
  if (b === "packet_form_work") route.missingPacketFormFulfillment.push(`Packet plan not fulfillment-ready (mode=${route.packetMode}, formMappingStatus=${route.formMappingStatus}).`);
  if (route.packetFulfillmentStatus !== "ready" && route.packetFulfillmentStatus !== "not_applicable" && b !== "packet_form_work") {
    route.missingPacketFormFulfillment.push(`Packet form work outstanding (${route.packetFulfillmentStatus}); tracked, not blocking payment for the ratified/custom model.`);
  }

  route.engineeringWorkNeeded = engineeringWorkFor(route);
  route.legalSourceReviewNeeded = legalReviewFor(route);
  route.materialNeededFromLegalTeam = materialFor(route);
  route.verifierCasesRequiredBeforePayment = verifierCasesFor(route);

  // Priority tag.
  if (route.bucket === "discard_or_duplicate") route.priority = "discard";
  else if (route.bucket === "permanent_guidance_not_a_paid_product" || route.bucket === "not_currently_operational") route.priority = "guidance-only";
  else if (route.bucket === "paid_now") route.priority = "high-confidence";
  else if (route.bucket === "legal_action_required") route.priority = "legal-action-required";
  else route.priority = "route-depth"; // refined to first-paid-jurisdiction after all routes are classified

  // Legal Action Required rows: every non-paid, paid-capable route needs legal material/confirmation
  // before it can move to paid_now (no route may move to paid_now with an open LAR item).
  if (route.bucket === "legal_action_required") {
    const id = openLar(route, {
      priority: "P1", missingItemType: "Missing legal confirmation",
      exactMissingItem: EXPLICIT_OVERRIDES[ctx.key]?.larReason ?? "Route cannot be safely classified; operational status / forum / sellable step unclear.",
      whyItMatters: "Cannot open a paid packet without knowing the correct user-filed forum and that the route is operative and screenable.",
      engineeringBlocked: true, legalReviewRequired: true,
      sourceRequested: "Confirmation of the correct user-filed step, official form, statute, and operational status.",
      suggestedSourceType: "official agency/court guidance + statute"
    });
    route.legalActionRequiredItemIds.push(id);
  } else if (route.bucket.startsWith("paid_after") || route.bucket === "gate_built_wait_pending") {
    const map = {
      legal_reconfirmation: { type: "Missing legal confirmation", item: "Legal reconfirmation of the route's wait/anchor, exclusions, and that it is a sellable user-filed court/admin route.", src: "Legal-team ratification sign-off", srcType: "implementation memo / legal confirmation", lrr: true, eb: false },
      route_metadata: { type: "Missing legal confirmation", item: "Confirm this is a genuine user-filed court/admin route to sell (not automatic/board/prosecutor), then set explicit product route metadata.", src: "Product/legal classification of the route", srcType: "official court/agency guidance", lrr: true, eb: true },
      gate_build: { type: "Missing eligibility rule", item: "Confirmed offense-exclusion list / count caps / prior-relief bars / preconditions the coded gate must enforce.", src: "Statutory exclusion & eligibility criteria", srcType: "statute + official guidance", lrr: true, eb: true },
      intake_fix: { type: "Missing intake question", item: "The trafficking/coercion/survivor nexus test and how to screen it from a public intake question.", src: "Statutory nexus test + screening definition", srcType: "statute + official guidance", lrr: true, eb: true },
      wait_anchor_fix: { type: "Missing eligibility rule", item: "The specific waiting period + anchor (and any event trigger) that applies, to resolve the ambiguous multi-wait.", src: "Waiting-period + anchor confirmation", srcType: "statute + court rule", lrr: true, eb: true },
      packet_form_work: { type: "Missing packet work", item: "Official form / custom pleading template + field mapping so the packet plan is fulfillment-ready.", src: "Official form(s) + filing instructions", srcType: "official form + filing instructions", lrr: false, eb: true }
    }[route.primaryBlocker];
    if (map) {
      const id = openLar(route, {
        priority: "P2", missingItemType: map.type, exactMissingItem: map.item,
        whyItMatters: "No route may move to paid_now while this item is open; payment stays closed until supplied and verifier-proven.",
        engineeringBlocked: map.eb, legalReviewRequired: map.lrr, sourceRequested: map.src, suggestedSourceType: map.srcType
      });
      route.legalActionRequiredItemIds.push(id);
    }
  }
}

function engineeringWorkFor(r) {
  switch (r.primaryBlocker) {
    case "none": return "None to open payment — route is ratified, engine-recognized, and fulfillment-ready.";
    case "legal_reconfirmation": return "No new eligibility code required; add the route key to RATIFIED_DEPLOYABLE_ROUTES + set paymentProductEligible metadata after legal reconfirmation, then re-run both-direction verifier.";
    case "route_metadata": return "Set explicit productRouteType/filingForum/userFiled/paymentProductEligible metadata for this route and add an explicit recognition branch (isCourtFiledPetitionRoute or admin predicate). Do NOT expand summary regexes.";
    case "gate_build": return "Implement + verify the named substantive gate in routeSpecificSafetyGate; wire its public intake facts; then promote from HARD_GATE_PENDING.";
    case "intake_fix": return "Add the nexus intake question to public-profile-projection + a matching safety gate; then tier + ratify.";
    case "wait_anchor_fix": return "Add a route-specific specialRouteTiming entry (wait/anchor/event) so the engine stops failing closed on ambiguous waits; then tier + ratify.";
    case "packet_form_work": return "Complete the packet/form fulfillment (official form overlay field map or custom pleading template) so isPacketPlanFulfillmentReady passes; then tier + ratify.";
    case "legal_action_required": return "Blocked pending legal material/confirmation; no safe engineering path until supplied.";
    default: return "Not applicable — guidance-only / non-paid route.";
  }
}
function legalReviewFor(r) {
  if (r.bucket === "paid_now") return "Already ratified. Standard post-build QA / source-freshness / visual review remains a separate gate before live.";
  if (r.bucket === "permanent_guidance_not_a_paid_product") return "Confirm this route must remain guidance-only (automatic / board / pardon / prosecutor / agency / no-filing).";
  if (r.bucket === "not_currently_operational") return "Confirm the relief mechanism is not operating; keep guidance-only until it is.";
  if (r.bucket === "discard_or_duplicate") return "Confirm this route is superseded/duplicate and can be dropped.";
  return "Legal/source review required: confirm operative status, sellable user-filed forum, wait/anchor, exclusions/preconditions/count caps/prior-relief bars, and form-readiness before ratification.";
}
function materialFor(r) {
  if (!r.legalActionRequiredItemIds.length) return "None outstanding.";
  const items = larItems.filter((i) => r.legalActionRequiredItemIds.includes(i.id));
  return items.map((i) => `${i.missingItemType}: ${i.exactMissingItem}`).join(" | ");
}
function verifierCasesFor(r) {
  if (r.bucket === "paid_now") return [
    "qualifying + wait/order satisfied -> packet_ready(+caution) with paymentAllowed=true + source-backed reason",
    "just-under wait / missing court order -> not_yet / likely_not_eligible, no payment",
    "state exclusion selected / route disqualifier -> no payment",
    "pending case -> no payment"
  ];
  if (["permanent_guidance_not_a_paid_product", "not_currently_operational", "discard_or_duplicate"].includes(r.bucket))
    return ["any qualifying facts -> guidance_only / fail-closed, paymentAllowed=false (must never open payment)"];
  return [
    "qualifying facts -> payment opens (only after the work below lands and legal items close)",
    "just-under wait -> not_yet, no payment",
    "missing anchor -> needs_more_info / needs_review, no payment",
    "pending case -> no payment",
    "state exclusion selected -> no payment",
    "route-specific disqualifier -> no payment",
    "'not sure' -> no payment",
    "wrong route type -> no payment",
    "packet missing required field -> no payment",
    "open Legal Action Required item -> no payment"
  ];
}

// --------------------------------------------------------------------------- run classification
const routes = [];
for (const profile of profiles) for (const pathway of profile.pathways) routes.push(classify(profile, pathway));
routes.sort((a, b) => a.routeKey.localeCompare(b.routeKey));

const allJurisdictions = [...new Set(routes.map((r) => r.jurisdictionCode))].sort();
const nameByCode = Object.fromEntries(profiles.map((p) => [p.jurisdiction.code, p.jurisdiction.name]));
const paidNow = routes.filter((r) => r.bucket === "paid_now");
const paidJurisdictions = [...new Set(paidNow.map((r) => r.jurisdictionCode))].sort();
const buildableBuckets = ["paid_after_legal_reconfirmation", "paid_after_route_metadata_fix", "paid_after_gate_build", "paid_after_intake_fix", "paid_after_wait_anchor_fix", "paid_after_packet_form_work", "gate_built_wait_pending"];
const buildable = routes.filter((r) => buildableBuckets.includes(r.bucket));
const zeroPaidWithBuildable = allJurisdictions.filter((c) => !paidJurisdictions.includes(c) && (buildable.some((r) => r.jurisdictionCode === c) || routes.some((r) => r.jurisdictionCode === c && r.bucket === "legal_action_required")));

// Refine priority: first-paid-jurisdiction for buildable routes in zero-paid jurisdictions.
for (const r of routes) {
  if (buildableBuckets.includes(r.bucket) && zeroPaidWithBuildable.includes(r.jurisdictionCode) && !paidJurisdictions.includes(r.jurisdictionCode)) r.priority = "first-paid-jurisdiction";
}

// Target 51 first paid route queue: the single safest buildable route per zero-paid jurisdiction.
const target51 = [];
for (const c of zeroPaidWithBuildable) {
  const candidates = [...buildable.filter((r) => r.jurisdictionCode === c), ...routes.filter((r) => r.jurisdictionCode === c && r.bucket === "legal_action_required")]
    .sort((a, b) => (BLOCKER_EFFORT[a.primaryBlocker] ?? 9) - (BLOCKER_EFFORT[b.primaryBlocker] ?? 9) || a.routeKey.localeCompare(b.routeKey));
  const pick = candidates[0];
  if (!pick) continue;
  target51.push({
    jurisdiction: c, jurisdictionName: nameByCode[c], selectedPathwayId: pick.pathwayId, selectedPathwayLabel: pick.pathwayLabel,
    currentStatus: pick.bucket, primaryBlocker: pick.primaryBlocker, secondaryBlockers: pick.secondaryBlockers,
    whySafestFirst: `Lowest-effort paid-capable ${pick.routeType} route in ${nameByCode[c]} (blocker=${pick.primaryBlocker}); opening it makes ${nameByCode[c]} a paid jurisdiction.`,
    requires: {
      legalReconfirmation: pick.primaryBlocker === "legal_reconfirmation",
      routeMetadata: pick.primaryBlocker === "route_metadata" || pick.secondaryBlockers.includes("route_metadata"),
      gateBuild: pick.primaryBlocker === "gate_build",
      intakeFix: pick.primaryBlocker === "intake_fix",
      waitAnchorFix: pick.primaryBlocker === "wait_anchor_fix" || pick.secondaryBlockers.includes("wait_anchor_fix"),
      packetFormWork: pick.primaryBlocker === "packet_form_work" || pick.secondaryBlockers.includes("packet_form_work"),
      legalAction: pick.bucket === "legal_action_required"
    },
    exactEvaluatorAction: pick.engineeringWorkNeeded,
    exactIntakeProfileAction: pick.missingIntakeQuestions.length ? pick.missingIntakeQuestions.join(" ") : "No new public intake question required (verify existing facts suffice).",
    exactPacketFormAction: pick.missingPacketFormFulfillment.length ? pick.missingPacketFormFulfillment.join(" ") : "Confirm the custom packet / official form is fulfillment-ready.",
    exactLegalReviewAction: pick.legalSourceReviewNeeded,
    exactLegalMaterialNeeded: pick.materialNeededFromLegalTeam,
    verifierCasesRequired: pick.verifierCasesRequiredBeforePayment,
    expectedPaidJurisdictionGain: "yes"
  });
}
target51.sort((a, b) => (BLOCKER_EFFORT[a.primaryBlocker] ?? 9) - (BLOCKER_EFFORT[b.primaryBlocker] ?? 9) || a.jurisdiction.localeCompare(b.jurisdiction));

// Route-depth queue: remaining buildable routes in already-paid jurisdictions (or extra routes in zero-paid).
const target51Keys = new Set(target51.map((t) => `${t.jurisdiction}:${t.selectedPathwayId}`));
const routeDepthQueue = buildable.filter((r) => !target51Keys.has(r.routeKey))
  .sort((a, b) => (BLOCKER_EFFORT[a.primaryBlocker] ?? 9) - (BLOCKER_EFFORT[b.primaryBlocker] ?? 9) || a.routeKey.localeCompare(b.routeKey))
  .map((r) => ({ routeKey: r.routeKey, jurisdiction: r.jurisdictionCode, bucket: r.bucket, primaryBlocker: r.primaryBlocker, effortScore: r.effortScore }));

// --------------------------------------------------------------------------- metadata map (Phase 4)
const metadata = {
  generatedBy: "scripts/audit-petition-route-inventory.mjs",
  note: "Explicit per-route product metadata. Derived from the STRUCTURED compiled routeType + EXPLICIT_OVERRIDES (Phase 4), never from summary regex. paymentProductEligible=true only for routes the evaluator currently opens payment for (ratified + court/admin + fulfillment-ready).",
  headCommit: headCommit(),
  routes: Object.fromEntries(routes.map((r) => [r.routeKey, {
    productRouteType: r.productRouteType, filingForum: r.filingForum, userFiled: r.userFiles,
    currentlyOperative: r.currentlyOperative, paymentProductEligible: r.paymentProductEligible,
    isAdministrativeApplication: r.isAdministrativeApplication, legalSignoffStatus: r.legalSignoffStatus,
    packetFulfillmentStatus: r.packetFulfillmentStatus, paidRouteBlocker: primaryBlockerToMetadata(r.primaryBlocker, r.bucket),
    evaluatorTier: r.evaluatorTier, openLegalActionRequiredItems: r.legalActionRequiredItemIds
  }]))
};
function primaryBlockerToMetadata(b, bucket) {
  if (bucket === "paid_now") return "none";
  if (bucket === "permanent_guidance_not_a_paid_product") return "not_paid_product";
  if (bucket === "not_currently_operational") return "not_operational";
  if (bucket === "discard_or_duplicate") return "duplicate";
  if (bucket === "legal_action_required") return "legal_action_required";
  return b;
}

// --------------------------------------------------------------------------- summaries
const bucketCounts = Object.fromEntries(BUCKETS.map((b) => [b, routes.filter((r) => r.bucket === b).length]));
const summaries = {
  s1_all_paid_now_routes: paidNow.map((r) => r.routeKey),
  s2_all_paid_jurisdictions_now: paidJurisdictions.map((c) => ({ code: c, name: nameByCode[c] })),
  s3_zero_paid_jurisdictions_with_buildable_paid_route: zeroPaidWithBuildable.map((c) => ({ code: c, name: nameByCode[c] })),
  s4_routes_needing_only_legal_reconfirmation: routes.filter((r) => r.bucket === "paid_after_legal_reconfirmation").map((r) => r.routeKey),
  s5_routes_needing_only_route_metadata_fix: routes.filter((r) => r.bucket === "paid_after_route_metadata_fix").map((r) => r.routeKey),
  s6_routes_needing_gate_build: routes.filter((r) => r.bucket === "paid_after_gate_build").map((r) => r.routeKey),
  s7_routes_needing_intake_fix: routes.filter((r) => r.bucket === "paid_after_intake_fix").map((r) => r.routeKey),
  s8_routes_needing_wait_anchor_fix: routes.filter((r) => r.bucket === "paid_after_wait_anchor_fix").map((r) => r.routeKey),
  s9_routes_needing_packet_form_work: routes.filter((r) => r.bucket === "paid_after_packet_form_work").map((r) => r.routeKey),
  s10_permanent_guidance_routes: routes.filter((r) => r.bucket === "permanent_guidance_not_a_paid_product").map((r) => r.routeKey),
  s11_not_currently_operational_routes: routes.filter((r) => r.bucket === "not_currently_operational").map((r) => r.routeKey),
  s12_discard_or_duplicate_routes: routes.filter((r) => r.bucket === "discard_or_duplicate").map((r) => r.routeKey),
  s13_legal_action_required_routes: routes.filter((r) => r.bucket === "legal_action_required").map((r) => r.routeKey),
  s14_missing_legal_materials: larItems.map((i) => ({ id: i.id, jurisdiction: i.jurisdiction, route: i.routeId, type: i.missingItemType, item: i.exactMissingItem })),
  s15_target_51_first_paid_route_queue: target51,
  s16_post_51_route_depth_queue: routeDepthQueue
};

// --------------------------------------------------------------------------- acceptance
const compiledPathwayCount = profiles.reduce((n, p) => n + p.pathways.length, 0);
const acceptance = {
  everyPathwayClassifiedOnce: routes.every((r) => BUCKETS.includes(r.bucket)),
  totalEqualsCompiledPathwayCount: routes.length === compiledPathwayCount,
  all51JurisdictionsPresent: allJurisdictions.length === 51,
  paidNowRemainsAtLeast68: paidNow.length >= 68,
  hawaiiIsAdministrativeApplicationNotCourtPetition: routes.filter((r) => r.jurisdictionCode === "HI" && r.isAdministrativeApplication).every((r) => r.routeType === "administrative_application" && r.filingForum === "agency"),
  noPaymentInferredFromLegalPossibility: paidNow.every((r) => r.evaluatorTier === "RATIFIED_DEPLOYABLE_ROUTES" && r.packetFulfillmentReady && PAID_CAPABLE_PRODUCT_TYPES.has(r.productRouteType)),
  bucketSumMatches: BUCKETS.reduce((n, b) => n + bucketCounts[b], 0) === routes.length
};

const report = {
  generatedBy: "scripts/audit-petition-route-inventory.mjs", auditOnly: true, runtimeBehaviorChanged: false,
  headCommit: headCommit(),
  routeTierSetSizes: { RATIFIED_DEPLOYABLE: RATIFIED_DEPLOYABLE.size, CORRECTED_AWAITING_RECONFIRM: CORRECTED_AWAITING_RECONFIRM.size, HARD_GATE_PENDING: HARD_GATE_PENDING.size, HELD_GUIDANCE: HELD_GUIDANCE.size, ADMINISTRATIVE_APPLICATION: ADMIN_APPLICATION_ROUTES.size },
  totals: {
    totalPathwaysClassified: routes.length, compiledPathwayCount, jurisdictions: allJurisdictions.length,
    paidNowRoutes: paidNow.length, paidNowJurisdictions: paidJurisdictions.length,
    buildablePaidRoutes: buildable.length, zeroPaidJurisdictionsWithBuildableRoute: zeroPaidWithBuildable.length,
    legalActionRequiredRoutes: bucketCounts.legal_action_required, legalActionRequiredItems: larItems.length,
    ...Object.fromEntries(BUCKETS.map((b) => [b, bucketCounts[b]]))
  },
  bucketCounts, acceptance, paidJurisdictions, zeroPaidWithBuildable, summaries, routes
};

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
fs.writeFileSync(METADATA_OUT, JSON.stringify(metadata, null, 2) + "\n");
fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(LAR_JSON_OUT, JSON.stringify({ generatedAt: "derived", headCommit: headCommit(), openItems: larItems.length, items: larItems }, null, 2) + "\n");
fs.writeFileSync(MD_OUT, renderInventoryMd(report));
fs.writeFileSync(LAR_MD_OUT, renderLarMd(larItems));

// --------------------------------------------------------------------------- console
const acceptanceOk = Object.values(acceptance).every(Boolean);
console.log("RCAP Petition/Application-Route Inventory — audit only, no runtime behavior changed.");
console.log("=".repeat(74));
console.log(`Head commit                                 : ${report.headCommit}`);
console.log(`Total pathways classified                   : ${routes.length} (compiled ${compiledPathwayCount})`);
console.log(`Jurisdictions                               : ${allJurisdictions.length}`);
console.log(`paid_now routes                             : ${paidNow.length}`);
console.log(`paid_now jurisdictions                       : ${paidJurisdictions.length} [${paidJurisdictions.join(", ")}]`);
console.log(`Buildable paid-capable routes               : ${buildable.length}`);
console.log(`Zero-paid jurisdictions w/ buildable route   : ${zeroPaidWithBuildable.length} [${zeroPaidWithBuildable.join(", ")}]`);
console.log(`legal_action_required routes                 : ${bucketCounts.legal_action_required}`);
console.log(`Legal Action Required items                  : ${larItems.length}`);
console.log("-".repeat(74));
for (const b of BUCKETS) console.log(`  ${b.padEnd(42)} ${bucketCounts[b]}`);
console.log("-".repeat(74));
console.log(`Target 51 first-paid-route queue (${target51.length} zero-paid jurisdictions):`);
for (const t of target51.slice(0, 8)) console.log(`  ${t.jurisdiction}  ${t.selectedPathwayId}  (${t.primaryBlocker})`);
if (target51.length > 8) console.log(`  ... +${target51.length - 8} more (see report)`);
console.log("-".repeat(74));
console.log("Files written:");
for (const f of [METADATA_OUT, JSON_OUT, LAR_JSON_OUT, MD_OUT, LAR_MD_OUT]) console.log(`  ${path.relative(ROOT, f)}`);
console.log("-".repeat(74));
console.log(`Acceptance: ${acceptanceOk ? "ALL PASS" : "FAILURES"}`);
for (const [k, v] of Object.entries(acceptance)) console.log(`  ${v ? "ok  " : "FAIL"} ${k}`);
if (!acceptanceOk) process.exitCode = 1;

// --------------------------------------------------------------------------- markdown renderers
function renderInventoryMd(rep) {
  const L = [];
  L.push("# Expungement.ai / RCAP — Petition / Application-Route Inventory");
  L.push("");
  L.push("> **Audit / report only. No runtime behavior changed by this script.** No route moved between control sets.");
  L.push(`> Head commit \`${rep.headCommit}\`. Ground truth = the live evaluator payment gate. No payment inferred from legal possibility.`);
  L.push("");
  L.push("## Headline totals");
  L.push("");
  L.push("| Metric | Value |");
  L.push("| --- | --- |");
  L.push(`| Total pathways classified | ${rep.totals.totalPathwaysClassified} (compiled ${rep.totals.compiledPathwayCount}) |`);
  L.push(`| Jurisdictions | ${rep.totals.jurisdictions} |`);
  L.push(`| **paid_now** routes | **${rep.totals.paidNowRoutes}** |`);
  L.push(`| paid_now jurisdictions | ${rep.totals.paidNowJurisdictions} |`);
  L.push(`| Buildable paid-capable routes | ${rep.totals.buildablePaidRoutes} |`);
  L.push(`| Zero-paid jurisdictions with a buildable route | ${rep.totals.zeroPaidJurisdictionsWithBuildableRoute} |`);
  L.push(`| legal_action_required routes | ${rep.totals.legalActionRequiredRoutes} |`);
  L.push(`| Legal Action Required items | ${rep.totals.legalActionRequiredItems} |`);
  L.push("");
  L.push("## Bucket counts (12-bucket taxonomy)");
  L.push("");
  L.push("| Bucket | Count |");
  L.push("| --- | --- |");
  for (const b of BUCKETS) L.push(`| ${b} | ${rep.bucketCounts[b]} |`);
  L.push("");
  const S = rep.summaries;
  const list = (arr) => arr.length ? arr.map((k) => `\`${k}\``).join(", ") : "_none_";
  L.push("## Summary 1 — all paid_now routes"); L.push(""); L.push(list(S.s1_all_paid_now_routes)); L.push("");
  L.push("## Summary 2 — all paid jurisdictions now"); L.push(""); L.push(S.s2_all_paid_jurisdictions_now.map((j) => `${j.code} ${j.name}`).join(", ")); L.push("");
  L.push("## Summary 3 — zero-paid jurisdictions with a buildable paid route"); L.push(""); L.push(S.s3_zero_paid_jurisdictions_with_buildable_paid_route.map((j) => `${j.code} ${j.name}`).join(", ") || "_none_"); L.push("");
  L.push("## Summary 4 — routes needing only legal reconfirmation"); L.push(""); L.push(list(S.s4_routes_needing_only_legal_reconfirmation)); L.push("");
  L.push("## Summary 5 — routes needing only route metadata fix"); L.push(""); L.push(list(S.s5_routes_needing_only_route_metadata_fix)); L.push("");
  L.push("## Summary 6 — routes needing gate build"); L.push(""); L.push(list(S.s6_routes_needing_gate_build)); L.push("");
  L.push("## Summary 7 — routes needing intake fix"); L.push(""); L.push(list(S.s7_routes_needing_intake_fix)); L.push("");
  L.push("## Summary 8 — routes needing wait/anchor fix"); L.push(""); L.push(list(S.s8_routes_needing_wait_anchor_fix)); L.push("");
  L.push("## Summary 9 — routes needing packet/form work"); L.push(""); L.push(list(S.s9_routes_needing_packet_form_work)); L.push("");
  L.push("## Summary 10 — permanent-guidance / no-paid-product routes"); L.push(""); L.push(`${S.s10_permanent_guidance_routes.length} routes (see per-route table).`); L.push("");
  L.push("## Summary 11 — not-currently-operational routes"); L.push(""); L.push(list(S.s11_not_currently_operational_routes)); L.push("");
  L.push("## Summary 12 — discard / duplicate routes"); L.push(""); L.push(list(S.s12_discard_or_duplicate_routes)); L.push("");
  L.push("## Summary 13 — legal-action-required routes"); L.push(""); L.push(list(S.s13_legal_action_required_routes)); L.push("");
  L.push("## Summary 14 — missing legal materials needed from Roger / legal team"); L.push(""); L.push(`${S.s14_missing_legal_materials.length} items — see \`docs/expungement-ai/LEGAL_ACTION_REQUIRED.md\`.`); L.push("");
  L.push("## Summary 15 — Target 51 first paid route queue"); L.push("");
  L.push("| # | Juris | Route | Current status | Primary blocker | Expected paid gain |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  S.s15_target_51_first_paid_route_queue.forEach((t, i) => L.push(`| ${i + 1} | ${t.jurisdiction} | \`${t.selectedPathwayId}\` | ${t.currentStatus} | ${t.primaryBlocker} | ${t.expectedPaidJurisdictionGain} |`));
  L.push("");
  L.push("## Summary 16 — post-51 route-depth queue"); L.push(""); L.push(`${S.s16_post_51_route_depth_queue.length} routes (see JSON report).`); L.push("");
  L.push("## Full per-route inventory");
  L.push("");
  L.push("| Route | Juris | Product route type | Forum | Operative | User-files | Ever paid | Tier | Bucket | Primary blocker | LAR |");
  L.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of rep.routes) L.push(`| \`${r.pathwayId}\` | ${r.jurisdictionCode} | ${r.productRouteType} | ${r.filingForum} | ${r.currentlyOperative ? "y" : "n"} | ${r.userFiles ? "y" : "n"} | ${r.canEverBePaidPacket ? "y" : "n"} | ${r.evaluatorTier.replace(/_ROUTES$/, "")} | ${r.bucket} | ${r.primaryBlocker} | ${r.legalActionRequiredItemIds.join(",") || "-"} |`);
  L.push("");
  L.push("_Full structured detail is in `data/expungement-ai/reports/petition-route-inventory.json` and `data/expungement-ai/route-product-metadata.json`._");
  L.push("");
  return L.join("\n");
}

function renderLarMd(items) {
  const L = [];
  L.push("# Legal Action Required — Paid Packet Program");
  L.push("");
  L.push("> Generated from the petition-route inventory. **Every unresolved missing item is one row.**");
  L.push("> No route may move to `paid_now` while it has an open Legal Action Required item. Never guess — if a");
  L.push("> statute, form, waiting rule, exclusion list, county/local variation, packet, public intake fact, or");
  L.push("> operational status is missing, it is asked for here.");
  L.push("");
  L.push(`Open items: **${items.length}**. Target-51 first-paid routes are marked priority **P1/P2**.`);
  L.push("");
  L.push("## What we need from Roger / the legal team (by missing-item type)");
  L.push("");
  const byType = {};
  for (const i of items) (byType[i.missingItemType] ??= []).push(i);
  for (const [type, arr] of Object.entries(byType)) {
    L.push(`### ${type} (${arr.length})`);
    L.push("");
    const bySrc = {};
    for (const i of arr) (bySrc[i.exactMissingItem] ??= []).push(i);
    for (const [item, group] of Object.entries(bySrc)) {
      const juris = [...new Set(group.map((g) => g.jurisdiction))].sort();
      L.push(`- ${item} — _${group.length} route(s): ${juris.join(", ")}_`);
    }
    L.push("");
  }
  L.push("## Full Legal Action Required table");
  L.push("");
  L.push("| ID | Priority | Juris | Route ID | Current class | Missing type | Exact missing item | Eng blocked | Legal review | Suggested source type | Status |");
  L.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const i of items) L.push(`| ${i.id} | ${i.priority} | ${i.jurisdiction} | \`${i.routeId}\` | ${i.currentClassification} | ${i.missingItemType} | ${i.exactMissingItem.replace(/\|/g, "/")} | ${i.engineeringBlocked} | ${i.legalReviewRequired} | ${i.suggestedSourceType} | ${i.status} |`);
  L.push("");
  L.push("_Fields per row: Priority, Jurisdiction, Route ID, Route name, Current classification, Missing item type,");
  L.push("Exact missing item, Why it matters, Engineering blocked?, Legal review required?, Source requested, Suggested");
  L.push("source type, Status, Owner, Date opened, Date resolved, Resolution notes — full set in");
  L.push("`data/expungement-ai/reports/legal-action-required.json`._");
  L.push("");
  return L.join("\n");
}
