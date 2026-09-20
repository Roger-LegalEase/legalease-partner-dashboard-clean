#!/usr/bin/env node
/*
 * The terminal treatment for every family the decision owner placed in
 * WRONG_DELIVERY_TYPE on 2026-09-02, other than rcap-sc-custom-pleading.
 *
 * WHY THIS EXISTS
 *
 * WRONG_DELIVERY_TYPE is a stop against a product treatment, not a resting
 * place. It says the packet delivers an instrument the route may not use; it
 * does not say what the route delivers instead. Sixteen families sat there with
 * that second question unanswered, which is the worst posture available: the
 * packet may not ship, no other treatment is bound, and a participant arriving
 * on the route meets whatever the runtime happened to resolve.
 *
 * WHAT THIS FILE IS AND IS NOT
 *
 * It is a projection. Every treatment word below is READ from a controlling
 * record, never chosen here, and every participant-facing fact is QUOTED from
 * the record that carries it, with that record's path and hash. This generator
 * composes no legal text, writes no participant copy, and approves nothing. It
 * creates no approval, opens no route, restores no packet, and grants no
 * commercial authority; a family's presence here is the application of a
 * refusal the owner already made.
 *
 * HOW THE TREATMENT IS DECIDED
 *
 * Not by judgement. The route-ratification registry is the single controlling
 * registry of per-route legal ratification, and it publishes its own status
 * vocabulary. The owner's Q1 answer says that vocabulary stands against a
 * completed packet, so the treatment is a lookup on the ratified status:
 *
 *   intentional_unsupported     "Deliberately out of scope."          -> OUT_OF_SCOPE
 *   held_guidance               "Held to substantive guidance only."  -> GUIDANCE_READY
 *   approved_release_guidance   "Approved release behaviour for a
 *                                guidance outcome. Not a paid packet."-> GUIDANCE_READY
 *
 * Two families carry no registry row. For those the owner's own answer is the
 * controlling record and is read the same way: Q2 ("REFERRAL GUIDANCE ONLY",
 * where the compiled profile routes the matter to legal aid or an attorney) is
 * a hand-off, and Q8 ("GUIDANCE-ONLY GOVERNS FOR NOW") is guidance.
 *
 * AGENCY_APPLICATION_READY appears in the vocabulary and is used by no family
 * here. It is expressed in the runtime as outcomeMode `agency_application`,
 * which src/lib/legal-authority/types.ts lists among PACKET_BEARING_OUTCOMES —
 * so it can open checkout, and every decision in scope keeps checkout closed.
 * Alaska's route ends at an agency and is still not an agency application,
 * because its ratified status is intentional_unsupported.
 *
 *   node scripts/grade-a-terminal-treatments/generate-terminal-treatments.mjs
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "data/rcap-grade-a/legal-decisions/TERMINAL_TREATMENTS_WRONG_DELIVERY_TYPE.json";

const OWNER_DECISIONS = "data/rcap-grade-a/legal-decisions/OWNER_DELIVERY_TYPE_DECISIONS.json";
const DELTA = "data/rcap-grade-a/legal-decisions/PROVEN_FAMILY_LEGAL_DELTA_2026-09-02.json";
const RATIFICATION = "data/record-clearing/legal-decisions/route-ratification-registry.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const ROUTE_SPLITS = "src/lib/legal-authority/routes/route-splits.json";
const SINGLE_ROUTES = "src/lib/legal-authority/routes/single-routes.json";
const TERMINALIZATION_DIR = "data/rcap-all50/terminalization-treatments";
const GUIDANCE_PACKET_DIR = "data/rcap-all50/guidance-packets";

/*
 * The five jurisdictions whose legacy generator Roger Roman retired as a
 * commercial fulfillment path on 2026-08-28 (ADR-0004). The resolver returns
 * legacy_retired for every route in them, ahead of the shared packet factory,
 * so no packet is deliverable there whatever the family holds.
 */
const LEGACY_RETIRED_JURISDICTIONS = new Set(["MS", "IL", "DC", "PA", "TX"]);

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/* The one family this lane does not touch: a separate lane owns South Carolina. */
const NOT_THIS_LANE = new Set(["rcap-sc-custom-pleading"]);

/*
 * The treatment vocabulary, and the runtime word each one is expressed in.
 *
 * The four words are product vocabulary. The runtime has no field spelled
 * GUIDANCE_READY on a route contract, so each is bound through the vocabulary
 * the runtime already owns — RouteOutcomeMode in src/lib/legal-authority/types.ts
 * — and payment authority is derived from that, never stored.
 */
const TREATMENT_VOCABULARY = {
  GUIDANCE_READY: {
    runtimeOutcomeMode: "guidance_status",
    runtimeVocabularySource: "src/lib/legal-authority/types.ts RouteOutcomeMode",
    runtimeDefinition: "Nothing is filed by the participant on this stage; status/correction guidance only.",
    paymentAuthority: "closed",
    paymentDerivedBy: "src/lib/legal-authority/index.ts routePaymentAuthority — guidance_status is in NO_PARTICIPANT_FILING_OUTCOMES"
  },
  HANDOFF_READY: {
    runtimeOutcomeMode: "referral",
    runtimeVocabularySource: "src/lib/legal-authority/types.ts RouteOutcomeMode",
    runtimeDefinition: "Hand-off to counsel or a program: active-case admission, contested nexus, enforcement.",
    paymentAuthority: "closed",
    paymentDerivedBy: "src/lib/legal-authority/index.ts routePaymentAuthority — referral is in NO_PARTICIPANT_FILING_OUTCOMES"
  },
  AGENCY_APPLICATION_READY: {
    runtimeOutcomeMode: "agency_application",
    runtimeVocabularySource: "src/lib/legal-authority/types.ts RouteOutcomeMode",
    runtimeDefinition: "Administrative/agency application the participant submits (not a court filing).",
    paymentAuthority: "packet_checkout",
    paymentDerivedBy: "src/lib/legal-authority/index.ts routePaymentAuthority — agency_application is in PACKET_BEARING_OUTCOMES",
    usedByNoFamilyHere:
      "It is a packet-bearing outcome, so it can open checkout. Every decision in scope keeps checkout closed, so no family in this file may carry it."
  },
  OUT_OF_SCOPE: {
    runtimeOutcomeMode: "unsupported",
    runtimeVocabularySource: "src/lib/legal-authority/types.ts RouteOutcomeMode",
    runtimeDefinition: "Legal answer exists but the product does not support this route yet.",
    paymentAuthority: "closed",
    paymentDerivedBy: "src/lib/legal-authority/index.ts routePaymentAuthority — unsupported is in NO_PARTICIPANT_FILING_OUTCOMES"
  }
};

/* status -> treatment. Read off the registry's own published vocabulary. */
const STATUS_TO_TREATMENT = {
  intentional_unsupported: "OUT_OF_SCOPE",
  held_guidance: "GUIDANCE_READY",
  approved_release_guidance: "GUIDANCE_READY"
};

/* Where no registry row exists, the owner's own answer is the controlling record. */
const QUESTION_TO_TREATMENT = {
  "Q2-composed-petition-or-attorney-referral": "HANDOFF_READY",
  "Q8-records-disagree-on-whether-this-family-carries-a-filing-instrument": "GUIDANCE_READY"
};

/*
 * Where each family's participant-facing facts are quoted from.
 *
 * Thirteen families implement a state legal-design memo track, so the track
 * registry carries the destination, what the participant must bring or request,
 * and the self-help stop conditions in the design's own words. Three are
 * runtime-only routes with no memo track; their facts live in the family's own
 * committed build findings, which quote the compiled profile directly.
 */
const FAMILY_FACT_SOURCE = {
  "ak-mistaken-identity-set": { kind: "memo_track", trackId: "ak-mistaken-identity" },
  "dc_seal_conviction-set": { kind: "memo_track", trackId: "dc_seal_conviction" },
  "dc_seal_nonconviction-set": { kind: "memo_track", trackId: "dc_seal_nonconviction" },
  "ky_felony_vacatur_expungement-set": { kind: "memo_track", trackId: "ky_felony_vacatur_expungement" },
  "ma-expunge-mj-set": { kind: "memo_track", trackId: "ma-expunge-mj" },
  "md_second_chance_shielding-set": { kind: "memo_track", trackId: "md_second_chance_shielding" },
  "ne-expunge-le-error-set": { kind: "memo_track", trackId: "ne-expunge-le-error" },
  "nj_clean_slate-set": { kind: "memo_track", trackId: "nj_clean_slate" },
  "or_conviction_setaside-set": { kind: "memo_track", trackId: "or_conviction_setaside" },
  "pa_9122_1_limited_access-set": { kind: "memo_track", trackId: "pa_9122_1_limited_access" },
  "pa_age70_deceased-set": { kind: "memo_track", trackId: "pa_age70_deceased" },
  "pa_summary_conviction-set": { kind: "memo_track", trackId: "pa_summary_conviction" },
  "ct-nolle-auto-set": { kind: "memo_track", trackId: "ct-nolle-auto" },
  "composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement": {
    kind: "family_build_findings",
    directory:
      "data/rcap-all50/overlays/census-v1/pa/composed-treatment:obligation:runtime-only:pa:path-k-human-trafficking-vacatur-expungement--custom-pleading"
  },
  "composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247": {
    kind: "family_build_findings",
    directory:
      "data/rcap-all50/overlays/census-v1/nv/composed-treatment:obligation:runtime-only:nv:trafficking-victim-vacatur-and-sealing-under-nrs-179-247--custom-pleading"
  },
  "composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement": {
    kind: "family_build_findings",
    directory:
      "data/rcap-all50/overlays/census-v1/sd/composed-treatment:obligation:runtime-only:sd:juvenile-trafficking-expungement--custom-pleading"
  }
};

const ownerFile = read(OWNER_DECISIONS);
const delta = read(DELTA);
const ratification = read(RATIFICATION);
const trackRegistry = read(TRACK_REGISTRY);

const trackById = new Map(trackRegistry.tracks.map((t) => [t.trackId, t]));
const ratByRouteKey = new Map(ratification.routes.map((r) => [r.routeKey, r]));
const deltaByFamily = new Map(delta.families.map((f) => [f.familyId, f]));

/* Every route contract, with the file it came from, so a binding names its file. */
const contractByRouteKey = new Map();
for (const rel of [ROUTE_SPLITS, SINGLE_ROUTES]) {
  for (const route of read(rel).routes) contractByRouteKey.set(route.routeKey, { file: rel, route });
}

/* Terminal treatments already registered in the runtime, keyed by track id. */
const registeredTerminalTreatments = new Map();
for (const file of fs.readdirSync(path.join(ROOT, TERMINALIZATION_DIR)).sort()) {
  if (!file.endsWith(".json") || file.startsWith("_")) continue;
  const rel = `${TERMINALIZATION_DIR}/${file}`;
  for (const entry of read(rel).treatments ?? []) {
    registeredTerminalTreatments.set(entry.trackId, {
      registry: "terminalization_treatment",
      file: rel,
      treatment: entry.treatment,
      basis: entry.treatmentBasis
    });
  }
}

/*
 * Lane-B treatments already accepted and served, keyed by track id.
 *
 * A complete-guidance or exact-supported-deferral record here is an ACCEPTED
 * treatment, and the resolver binds it ahead of the shared packet factory. Where
 * one already exists, the family's terminal treatment is already served and this
 * record says so rather than proposing a second one.
 */
const registeredGuidancePackets = new Map();
for (const file of fs.readdirSync(path.join(ROOT, GUIDANCE_PACKET_DIR)).sort()) {
  if (!file.endsWith(".json") || file.startsWith("_")) continue;
  const rel = `${GUIDANCE_PACKET_DIR}/${file}`;
  for (const entry of read(rel).packets ?? []) {
    registeredGuidancePackets.set(entry.trackId, {
      registry: "guidance_packet_registry",
      file: rel,
      treatment: entry.treatment,
      jobId: entry.jobId ?? null
    });
  }
}

function quotedDestination(track) {
  return {
    quotedFrom: { path: TRACK_REGISTRY, sha256: sha(TRACK_REGISTRY), field: `tracks[trackId=${track.trackId}].destination and .venue` },
    kind: track.destination?.kind ?? null,
    name: track.destination?.name ?? null,
    detail: track.destination?.detail ?? null,
    venue: track.venue ?? null
  };
}

function quotedNextStep(track) {
  /*
   * What the participant must bring or request, in the design's own words.
   *
   * This is the owner's own standard for a non-packet treatment, stated in the
   * South Carolina decision's split treatment B: name the correct office and
   * what the participant must bring or request. participantFilingRequirements
   * is the field that carries exactly that, per requirement, with where it
   * comes from and how to get it.
   */
  return {
    quotedFrom: {
      path: TRACK_REGISTRY,
      sha256: sha(TRACK_REGISTRY),
      field: `tracks[trackId=${track.trackId}].participantFilingRequirements`
    },
    mustBringOrRequest: (track.participantFilingRequirements ?? []).map((r) => ({
      name: r.name,
      obtainedFrom: r.obtainedFrom,
      requirement: r.requirement,
      requiredBeforeFiling: r.requiredBeforeFiling,
      howToObtain: r.howToObtain
    })),
    postGenerationHandoffs: {
      quotedFrom: {
        path: TRACK_REGISTRY,
        sha256: sha(TRACK_REGISTRY),
        field: `tracks[trackId=${track.trackId}].postGenerationHandoffs`
      },
      quotes: track.postGenerationHandoffs ?? []
    }
  };
}

function quotedSelfHelpStop(track) {
  return {
    quotedFrom: {
      path: TRACK_REGISTRY,
      sha256: sha(TRACK_REGISTRY),
      field: `tracks[trackId=${track.trackId}].selfHelpStopConditions`
    },
    quotes: track.selfHelpStopConditions ?? [],
    scopeRestrictions: {
      quotedFrom: {
        path: TRACK_REGISTRY,
        sha256: sha(TRACK_REGISTRY),
        field: `tracks[trackId=${track.trackId}].scopeRestrictions`
      },
      quotes: track.scopeRestrictions ?? []
    },
    legalDesignBlockers: {
      quotedFrom: {
        path: TRACK_REGISTRY,
        sha256: sha(TRACK_REGISTRY),
        field: `tracks[trackId=${track.trackId}].legalDesignBlockers`
      },
      quotes: track.legalDesignBlockers ?? []
    }
  };
}

/*
 * The sentence in a family's own build findings that names where the matter
 * goes. Selected by a fixed test, never written here, and the verifier applies
 * the same test to the same file: a destination that cannot be re-selected from
 * its source is a composed one.
 */
const DESTINATION_SENTENCE = /routed to legal aid or an attorney|attorney escalation path/i;


function runtimeOnlyFacts(source, familyRow) {
  const findingsPath = `${source.directory}/build-findings.json`;
  const approvalPath = `${source.directory}/approval-request.json`;
  const findings = read(findingsPath);
  const approval = read(approvalPath);
  const contract = familyRow.tracks?.[0]?.routeAuthorityContract ?? null;
  const named = (findings.findings ?? []).findIndex((f) => DESTINATION_SENTENCE.test(String(f.finding ?? "")));
  return {
    destination: {
      quotedFrom:
        named >= 0
          ? { path: findingsPath, sha256: sha(findingsPath), field: `findings[${named}].finding` }
          : contract
            ? { path: contract.sourceFile, field: `routes[routeKey=${contract.routeKey}] — decisionId ${contract.decisionId}`, sha256: exists(contract.sourceFile) ? sha(contract.sourceFile) : null }
            : null,
      kind: named >= 0 ? "referral" : null,
      name: named >= 0 ? findings.findings[named].finding : null,
      detail: contract ? `Route authority contract statute ${contract.statute}; decision ${contract.decisionId}.` : null,
      venue: null,
      selectedBy: named >= 0 ? `the first findings[].finding matching ${DESTINATION_SENTENCE}` : null,
      noMemoTrack:
        "No state legal-design memo track carries this route, so no memo destination or venue exists to quote. The controlling records are the route-authority contract and the family's own committed build findings."
    },
    nextStep: {
      quotedFrom: { path: approvalPath, sha256: sha(approvalPath), field: "counselQuestionsRaised" },
      mustBringOrRequest: [],
      counselQuestionsRaised: approval.counselQuestionsRaised ?? [],
      postGenerationHandoffs: { quotedFrom: null, quotes: [] }
    },
    selfHelpStop: {
      quotedFrom: { path: findingsPath, sha256: sha(findingsPath), field: "findings[].finding and .consequence" },
      quotes: (findings.findings ?? []).flatMap((f) => [f.finding, f.consequence]),
      scopeRestrictions: { quotedFrom: null, quotes: [] },
      legalDesignBlockers: { quotedFrom: null, quotes: [] }
    }
  };
}

const families = [];
for (const decision of ownerFile.decisions) {
  if (decision.refused !== true) continue;
  if (NOT_THIS_LANE.has(decision.familyId)) continue;

  const familyRow = deltaByFamily.get(decision.familyId);
  if (!familyRow) throw new Error(`no legal-delta row for ${decision.familyId}`);

  /* ---- the treatment, read rather than chosen ---------------------------- */
  const ratifiedStatuses = [
    ...new Set(
      (familyRow.tracks ?? [])
        .map((t) => t.routeRatification?.status)
        .filter(Boolean)
    )
  ];
  if (ratifiedStatuses.length > 1) {
    throw new Error(`${decision.familyId}: routes carry different ratified statuses (${ratifiedStatuses.join(", ")}); a family-level treatment cannot be read`);
  }
  const status = ratifiedStatuses[0] ?? null;
  const treatment = status ? STATUS_TO_TREATMENT[status] : QUESTION_TO_TREATMENT[decision.fromQuestion];
  if (!treatment) {
    throw new Error(`${decision.familyId}: neither a ratified status nor the owner question names a treatment`);
  }

  const authorizingRecord = status
    ? {
        path: RATIFICATION,
        sha256: sha(RATIFICATION),
        field: `routes[routeKey=...].status = ${status}`,
        statusVocabularyQuote: ratification.statusVocabulary[status],
        controllingAuthority: ratification.controllingAuthority,
        legalBases: [
          ...new Set((familyRow.tracks ?? []).map((t) => t.routeRatification?.legalBasis).filter(Boolean))
        ]
      }
    : {
        path: OWNER_DECISIONS,
        sha256: sha(OWNER_DECISIONS),
        field: `decisions[decisionId=${decision.decisionId}].decision`,
        statusVocabularyQuote: decision.decision,
        controllingAuthority: `${decision.decisionOwner} (decision owner)`,
        legalBases: [],
        whyNotTheRatificationRegistry:
          "The route-ratification registry carries no row for this route, so the owner's own answer is the controlling record for the product treatment."
      };

  /* ---- the facts, quoted ------------------------------------------------- */
  const source = FAMILY_FACT_SOURCE[decision.familyId];
  if (!source) throw new Error(`${decision.familyId}: no fact source is registered`);
  let destination;
  let nextStep;
  let selfHelpStop;
  if (source.kind === "memo_track") {
    const track = trackById.get(source.trackId);
    if (!track) throw new Error(`${decision.familyId}: track ${source.trackId} is not in the track registry`);
    destination = quotedDestination(track);
    nextStep = quotedNextStep(track);
    selfHelpStop = quotedSelfHelpStop(track);
  } else {
    ({ destination, nextStep, selfHelpStop } = runtimeOnlyFacts(source, familyRow));
  }

  /* ---- the binding, measured against the committed runtime ---------------- */
  const routes = (familyRow.tracks ?? []).map((t) => {
    const ratKey = t.routeRatification?.routeKey ?? null;
    const contractKey = t.routeAuthorityContract?.routeKey ?? ratKey;
    const bound = contractKey ? contractByRouteKey.get(contractKey) ?? null : null;
    const registered =
      (t.trackId && registeredTerminalTreatments.get(t.trackId)) ||
      (t.trackId && registeredGuidancePackets.get(t.trackId)) ||
      null;

    /*
     * WHERE THE TREATMENT IS BOUND, in the order the resolver reads.
     *
     * Every branch named here sits AHEAD of the shared packet factory in
     * src/lib/rcap/documents/packet-route-resolver.ts, which is what makes it a
     * binding rather than a note. A route with none of them still resolves to
     * the retired packet set, and this record says so instead of implying a
     * binding it does not have.
     */
    let boundBy = null;
    if (registered) {
      boundBy = {
        surface: registered.registry,
        file: registered.file,
        sha256: sha(registered.file),
        treatment: registered.treatment,
        resolverBranch:
          registered.registry === "terminalization_treatment"
            ? "resolvePacketRoute terminal-treatment branch, ahead of the shared packet factory"
            : "resolvePacketRoute exact-supported-deferral / complete-guidance branch, ahead of the shared packet factory"
      };
    } else if (bound && bound.route.outcomeMode === TREATMENT_VOCABULARY[treatment].runtimeOutcomeMode) {
      boundBy = {
        surface: "legal_authority_route_contract",
        file: bound.file,
        sha256: sha(bound.file),
        treatment: bound.route.outcomeMode,
        resolverBranch:
          TREATMENT_VOCABULARY[treatment].runtimeOutcomeMode === "referral"
            ? "resolvePacketRoute hand-off branch, ahead of the legacy generators and the shared packet factory"
            : "resolvePacketRoute authority-closed branch, ahead of the legacy generators and the shared packet factory"
      };
    } else if (LEGACY_RETIRED_JURISDICTIONS.has(familyRow.jurisdiction)) {
      boundBy = {
        surface: "legacy_generator_retirement",
        file: "data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json",
        sha256: exists("data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json")
          ? sha("data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json")
          : null,
        treatment: "legacy_retired",
        resolverBranch:
          "resolvePacketRoute legacy-retired branch, ahead of the shared packet factory. It renders for historical access and migration comparison only and authorizes no checkout, sponsorship, credit or delivery.",
        note:
          "This closes packet delivery on the route; it is not itself the terminal treatment. The treatment above is what the route delivers, and it is carried by this record until a participant-facing treatment is registered for the track."
      };
    }

    return {
      obligationRouteKey: t.routeKey,
      trackId: t.trackId ?? null,
      routeKey: contractKey,
      ratification: ratKey
        ? { routeKey: ratKey, status: t.routeRatification.status, legalBasis: t.routeRatification.legalBasis ?? null }
        : { routeKey: null, status: null, legalBasis: null, note: "no route-ratification row" },
      legalAuthorityContract: bound
        ? {
            file: bound.file,
            sha256: sha(bound.file),
            decisionId: bound.route.decisionId,
            outcomeMode: bound.route.outcomeMode,
            packetFamily: bound.route.packetFamily,
            boundTreatment: bound.route.outcomeMode === TREATMENT_VOCABULARY[treatment].runtimeOutcomeMode,
            paymentAuthorityDerived:
              bound.route.packetFamily === null ? "closed" : "not closed — a packet family is still bound"
          }
        : {
            file: null,
            note:
              "No legal-authority route contract exists for this route, so there is no contract outcomeMode to move; see boundBy."
          },
      registeredTreatment: registered ? { ...registered, trackId: t.trackId } : null,
      boundBy,
      packetStillResolvesOnThisRoute: boundBy === null
    };
  });

  /* ---- the retired packet, preserved -------------------------------------- */
  const proof = familyRow.outputProof ?? {};
  const retiredPacket = {
    disposition: "internal_review_fixture",
    participantDelivery: "removed",
    bytesMoved: false,
    whyBytesDidNotMove:
      "The owner's Q1 answer says in terms to keep the packet as an internal review fixture. Removing a packet from participant delivery is a binding change, not a deletion, so nothing under the family directory was moved, rewritten or deleted.",
    renderedArtifacts: proof.renderedArtifacts ?? null,
    productionFieldMap: proof.productionFieldMap ?? null,
    participantInstructions: proof.participantInstructions ?? null,
    canonicalPdfs: proof.canonicalPdfs ?? [],
    priorIndependentVerification: proof.independentVerification ?? null,
    priorVerificationDoesNotSurvive:
      "The prior verdict was taken on the packet. It verifies an artifact the owner has ruled may not be delivered, and it verifies nothing about the treatment that replaces it."
  };

  families.push({
    familyId: decision.familyId,
    jurisdiction: familyRow.jurisdiction,
    terminalTreatment: treatment,
    runtimeExpression: TREATMENT_VOCABULARY[treatment],
    ownerDecision: {
      decisionId: decision.decisionId,
      decidedOn: decision.decidedOn,
      decisionOwner: decision.decisionOwner,
      fromQuestion: decision.fromQuestion,
      theQuestionAsked: decision.theQuestionAsked,
      decision: decision.decision,
      consequences: decision.consequences,
      whatWouldReopenIt: decision.whatWouldReopenIt,
      quotedFrom: { path: OWNER_DECISIONS, sha256: sha(OWNER_DECISIONS) }
    },
    authorizingRecord,
    treatmentReadNotChosen: status
      ? `route-ratification-registry status ${status} -> ${treatment}, by the registry's own statusVocabulary.`
      : `owner answer ${decision.fromQuestion} -> ${treatment}, by the owner's own words; the registry carries no row for this route.`,
    routes,
    destination,
    participantNextStep: nextStep,
    selfHelpStop,
    checkout: {
      packetCheckout: "closed",
      packetCreditConsumption: "none",
      partnerCreditConsumption: "none",
      renderJobAllowed: false,
      derivedNotStored:
        "src/lib/legal-authority/index.ts routePaymentAuthority derives payment from outcomeMode, stage and packetFamily. Nothing here stores an open checkout, and nothing here can."
    },
    retiredPacket,
    independentVerification: {
      state: "pending_independent_verification_of_the_treatment",
      authoredBy: "the terminal-treatment lane; the lane that wrote a treatment may not verify it",
      verifyTheTreatmentNotThePacket: true,
      mustRead: [
        `${OWNER_DECISIONS} — decisions[decisionId=${decision.decisionId}]`,
        `${authorizingRecord.path} — ${authorizingRecord.field}`,
        ...(source.kind === "memo_track"
          ? [`${TRACK_REGISTRY} — tracks[trackId=${source.trackId}] destination, venue, participantFilingRequirements, selfHelpStopConditions`]
          : [`${source.directory}/build-findings.json`, `${source.directory}/approval-request.json`]),
        ...routes
          .filter((r) => r.legalAuthorityContract?.file)
          .map((r) => `${r.legalAuthorityContract.file} — routes[routeKey=${r.routeKey}] outcomeMode and packetFamily`),
        "src/lib/rcap/documents/packet-route-resolver.ts — resolvePacketRoute for each routeKey",
        "scripts/grade-a-terminal-treatments/verify-terminal-treatments.mjs"
      ],
      mustNotRead: [
        `${retiredPacket.canonicalPdfs.map((p) => p.path).join(", ") || "(no canonical pdf recorded)"} — the retired packet is not the subject of this verification`
      ]
    }
  });
}

/*
 * What is bound in the runtime today, and what is not.
 *
 * Stated per family rather than asserted once, because the honest answer
 * differs. Where a legal-authority route contract exists, the treatment is
 * bound in it and the resolver reads it. Where no contract exists, the route is
 * already fail-closed by other means and this record says so rather than
 * implying a binding it does not have.
 */
const unbound = families.filter((f) =>
  f.routes.some((r) => r.legalAuthorityContract?.file && r.legalAuthorityContract.boundTreatment === false)
);
if (unbound.length > 0) {
  throw new Error(
    `a route contract exists but does not carry the treatment's outcome mode: ${unbound.map((f) => f.familyId).join(", ")}`
  );
}

const byTreatment = families.reduce((acc, f) => {
  acc[f.terminalTreatment] = (acc[f.terminalTreatment] ?? 0) + 1;
  return acc;
}, {});

const bySurface = families.reduce((acc, f) => {
  for (const r of f.routes) {
    const key = r.boundBy?.surface ?? "not_bound_ahead_of_the_packet_factory";
    acc[key] = (acc[key] ?? 0) + 1;
  }
  return acc;
}, {});

/*
 * The routes on which the retired packet is still what the resolver returns.
 *
 * Named rather than smoothed over. Suppressing a route ahead of the shared
 * packet factory takes one of the surfaces above, and for these the surface
 * that fits is a registered participant-facing treatment for the track — an
 * authoring act with its own independent review, which this lane may not
 * perform on its own work and does not attempt here.
 */
const stillResolvingToTheRetiredPacket = families
  .filter((f) => f.routes.some((r) => r.packetStillResolvesOnThisRoute))
  .map((f) => ({
    familyId: f.familyId,
    jurisdiction: f.jurisdiction,
    terminalTreatment: f.terminalTreatment,
    routes: f.routes.filter((r) => r.packetStillResolvesOnThisRoute).map((r) => r.routeKey),
    whatIsAlreadyTrue:
      "The resolver returns sellable false and creditConsumable false, and the compiled profile's lawrenceRatification block projects the ratified status with packet_capable false and payment_allowed_when_engine_confirms false. Nothing is sold, no credit is consumed and no render job opens.",
    whatIsNotYetTrue:
      "The route's resolved identity is still the retired packet set, in shadow, because no treatment is registered for its track ahead of the shared packet factory.",
    whatWouldCloseIt:
      "A participant-facing treatment registered for the track in data/rcap-all50/terminalization-treatments or data/rcap-all50/guidance-packets, carrying the destination, next step and self-help stop this record already quotes. Authoring it is a separate act with its own independent review."
  }));

const out = {
  schemaVersion: "rcap-terminal-treatments-wrong-delivery-type/v1",
  generatedBy: "scripts/grade-a-terminal-treatments/generate-terminal-treatments.mjs",
  generatedOn: "2026-09-02",
  createsApproval: false,
  opensNoRoute: true,
  restoresNoPacket: true,
  deletesNoPacket: true,
  grantsNoCommercialAuthority: true,
  whatThisIs:
    "The terminal treatment for every family the decision owner placed in WRONG_DELIVERY_TYPE on 2026-09-02, other than rcap-sc-custom-pleading, which another lane owns. WRONG_DELIVERY_TYPE stops a product treatment and names no replacement; this record names the replacement each family's own controlling records already authorise, and binds it where the runtime has a contract to bind it in.",
  whatThisIsNot:
    "It is not an approval, not a second approval system, and not a workbook. Every treatment word is read from a controlling record and every participant-facing fact is quoted from the record that carries it, with that record's path and hash. No legal text and no participant copy is composed here.",
  theOwnersRulings: {
    "Q1-route-treatment-guidance-or-packet":
      "GUIDANCE / OUT-OF-SCOPE STANDS. A completed packet does not override the controlling route-ratification decision. Keep the packet as an internal review fixture and keep checkout disabled unless a later route-specific owner or counsel approval expressly authorizes packet delivery.",
    "Q2-composed-petition-or-attorney-referral":
      "REFERRAL GUIDANCE ONLY. Where the compiled profile routes the matter to legal aid or an attorney, do not ship a participant-filed composed petition without route-specific counsel approval. Keep checkout disabled.",
    "Q8-records-disagree-on-whether-this-family-carries-a-filing-instrument":
      "GUIDANCE-ONLY GOVERNS FOR NOW. Do not ship or charge for the motion while the committed records conflict. Resolve the contradiction through a new legal-design decision before any filing instrument is delivered."
  },
  treatmentVocabulary: TREATMENT_VOCABULARY,
  howTheTreatmentIsDecided: {
    rule: "A lookup, not a judgement.",
    statusToTreatment: STATUS_TO_TREATMENT,
    statusVocabulary: ratification.statusVocabulary,
    whereNoRegistryRowExists: QUESTION_TO_TREATMENT,
    controllingAuthority: ratification.controllingAuthority
  },
  sources: {
    ownerDeliveryTypeDecisions: { path: OWNER_DECISIONS, sha256: sha(OWNER_DECISIONS) },
    provenFamilyLegalDelta: { path: DELTA, sha256: sha(DELTA) },
    routeRatificationRegistry: { path: RATIFICATION, sha256: sha(RATIFICATION) },
    legalDesignTrackRegistry: { path: TRACK_REGISTRY, sha256: sha(TRACK_REGISTRY) },
    legalAuthorityRouteContracts: [
      { path: ROUTE_SPLITS, sha256: sha(ROUTE_SPLITS) },
      { path: SINGLE_ROUTES, sha256: sha(SINGLE_ROUTES) }
    ],
    runtimeOutcomeVocabulary: { path: "src/lib/legal-authority/types.ts", field: "RouteOutcomeMode" },
    authoritativeResolver: { path: "src/lib/rcap/documents/packet-route-resolver.ts", field: "resolvePacketRoute" }
  },
  counts: {
    families: families.length,
    byTreatment,
    routes: families.reduce((n, f) => n + f.routes.length, 0),
    routesWithALegalAuthorityContract: families.reduce(
      (n, f) => n + f.routes.filter((r) => r.legalAuthorityContract?.file).length,
      0
    ),
    routesByBindingSurface: bySurface
  },
  stillResolvingToTheRetiredPacket,
  families
};

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(out, null, 2)}\n`);
console.log(`${OUT}: ${families.length} families, ${JSON.stringify(byTreatment)}`);
