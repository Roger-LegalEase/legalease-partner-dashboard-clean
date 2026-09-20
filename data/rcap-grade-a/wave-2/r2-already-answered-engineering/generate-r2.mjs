#!/usr/bin/env node
/**
 * R2_ALREADY_ANSWERED_ENGINEERING — the generator.
 *
 *   node data/rcap-grade-a/wave-2/r2-already-answered-engineering/generate-r2.mjs
 *
 * C8 audited these thirty-seven citations and implemented none, because one
 * conflicted row was read as stopping the lane. This generator implements the
 * decision each row already has, and stops that one row rather than the lane.
 *
 * Nothing here decides a legal question. Every binding is derived from a record
 * already in this tree: an authority decision, a legal-design memo track, or a
 * signed reclassification. Where the record and the retriage disagree the record
 * wins and the row stops, which is the only outcome this lane may reach on its
 * own.
 *
 * Every branch is emitted with packetFamily null, so the runtime's own payment
 * derivation closes checkout on all of them. That is why this lane opens no
 * commercial route, and the verifier re-proves it rather than trusting it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const write = (name, value) =>
  fs.writeFileSync(path.join(HERE, name), `${JSON.stringify(value, null, 2)}\n`);

const ASSIGNMENT_ID = "R2_ALREADY_ANSWERED_ENGINEERING";
const WORKER_BRANCH = "claude/r2-already-answered-engineering";
const BASE_SHA = "ebb99d663f857f58a173c1d29eb73d0f15e70cbd";
const DISPATCH_SHA = "cbdfcd9ef9356182085ec1686e9084b244d5dc79";

const RETRIAGE = "data/rcap-grade-a/route-obligation-census-v1/legal-review-queue-v2-retriage.json";
const AUTHORITY = "src/lib/legal-authority/authority.json";
const RECLASS = "data/rcap-ledger/sellable-pathway-reclassifications.json";
const UNIVERSE = "data/rcap-grade-a/route-obligation-census-candidate/canonical-route-universe.json";
const RESIDUAL = "data/rcap-grade-a/launch-control/RESIDUAL_WORK.json";
const GUIDANCE_DIR = "data/rcap-all50/guidance-packets";
const REGISTRY = "src/lib/rcap/documents/guidance-packet-registry.ts";
const ROUTES_DIR = "src/lib/legal-authority/routes";
const TYPES = "src/lib/legal-authority/types.ts";

const table = JSON.parse(fs.readFileSync(path.join(HERE, "decomposition-table.json"), "utf8"));
const retriage = read(RETRIAGE);
const authority = read(AUTHORITY);
const reclass = read(RECLASS);
const universe = read(UNIVERSE);
const residual = read(RESIDUAL);

/** The runtime's own vocabulary, read from the runtime rather than restated. */
const typesSrc = fs.readFileSync(path.join(ROOT, TYPES), "utf8");
const constArray = (name) => {
  const m = typesSrc.match(new RegExp(`${name}[^=]*=\\s*\\[([^\\]]*)\\]`));
  if (!m) throw new Error(`${name} not found in ${TYPES}`);
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
};
const NO_FILING = constArray("NO_PARTICIPANT_FILING_OUTCOMES");
const PACKET_BEARING = constArray("PACKET_BEARING_OUTCOMES");
const OUTCOME_MODES = [...new Set([...NO_FILING, ...PACKET_BEARING])];

/** src/lib/legal-authority/index.ts routePaymentAuthority, over a branch. */
const paymentAuthorityOf = (branch) => {
  if (NO_FILING.includes(branch.outcomeMode)) return "closed";
  if (["active_case_admission", "automatic", "enforcement"].includes(branch.stage)) return "closed";
  if (branch.packetFamily === null) return "closed";
  if (branch.outcomeMode === "attorney_review_packet") return "attorney_review_required";
  return "packet_checkout";
};

/**
 * What the live contract would have to change for the record to be honoured.
 *
 * A record that states two disjoint treatments and a contract that states one
 * outcome mode are not a disagreement about wording: the contract cannot
 * express the branch the record requires, so one of the two dispositions is
 * unreachable. That is the defect worth naming per route, and it is the reason
 * this lane is measured in effects rather than citations.
 */
const driftOf = (currentOutcomeMode, branches, composition, contractPresent) => {
  if (!contractPresent) {
    return {
      kind: "no_contract",
      detail: `No route contract carries this key, so the record's ${branches.length} branch configuration${branches.length === 1 ? "" : "s"} have nowhere to resolve. The binding names what the contract must declare when it is authored.`
    };
  }
  const required = [...new Set(branches.map((b) => b.outcomeMode))];
  const missing = required.filter((m) => m !== currentOutcomeMode);
  if (branches.length > 1 && missing.length === 0) {
    /* The modes agree; what is missing is the separate identity per branch. */
    return {
      kind: "branch_identity_missing_at_matching_outcome_mode",
      currentOutcomeMode,
      requiredOutcomeModes: required,
      unreachableOutcomeModes: [],
      detail:
        `The contract's outcomeMode (${currentOutcomeMode}) is the one the record derives, but the record requires ${branches.length} distinct configurations ` +
        `(${branches.map((b) => b.branchId).join(", ")}) that may not collapse into one. A single configuration cannot be selected by the wrong disposition only because it is the only one there is.`
    };
  }
  if (branches.length > 1) {
    return {
      kind: composition === "conjunctive_branches" ? "single_mode_where_record_requires_both" : "single_mode_where_record_requires_disjoint_branches",
      currentOutcomeMode,
      requiredOutcomeModes: required,
      unreachableOutcomeModes: missing,
      detail:
        `The contract declares one outcomeMode (${currentOutcomeMode}). The record requires ${branches.length} branches ` +
        `(${required.join(", ")}) ${composition === "conjunctive_branches" ? "both owed on the same matter" : "selected by disposition and never sharing a checkout path"}. ` +
        `As written, ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} unreachable on this route.`
    };
  }
  if (currentOutcomeMode === required[0]) {
    return { kind: "contract_matches_record", currentOutcomeMode };
  }
  return {
    kind: "outcome_mode_differs_from_record",
    currentOutcomeMode,
    requiredOutcomeModes: required,
    detail: `The contract declares ${currentOutcomeMode}; the record's single treatment derives ${required[0]}.`
  };
};

/** Which route-contract file, if any, already carries a participant A key. */
const contractIndex = new Map();
for (const file of fs.readdirSync(path.join(ROOT, ROUTES_DIR)).sort()) {
  if (!file.endsWith(".json")) continue;
  const parsed = read(path.posix.join(ROUTES_DIR, file));
  for (const route of parsed.routes ?? []) {
    contractIndex.set(route.routeKey, { file: path.posix.join(ROUTES_DIR, file), outcomeMode: route.outcomeMode ?? null });
  }
}

/** Which guidance packets already exist, by JURISDICTION:trackId. */
const guidanceIndex = new Map();
const guidanceDirAbs = path.join(ROOT, GUIDANCE_DIR);
if (fs.existsSync(guidanceDirAbs)) {
  for (const file of fs.readdirSync(guidanceDirAbs).sort()) {
    if (!file.endsWith(".json") || file.startsWith("_")) continue;
    const parsed = read(path.posix.join(GUIDANCE_DIR, file));
    const jurisdiction = String(parsed.jurisdiction ?? "").toUpperCase();
    for (const packet of parsed.packets ?? []) {
      guidanceIndex.set(`${jurisdiction}:${packet.trackId}`, {
        file: path.posix.join(GUIDANCE_DIR, file),
        treatment: packet.treatment ?? null,
        paymentAllowed: packet.paymentAllowed ?? null,
        sellable: packet.sellable ?? null
      });
    }
  }
}

/** Track ids the runtime registry already binds to compiled pathways. */
const registrySrc = fs.readFileSync(path.join(ROOT, REGISTRY), "utf8");
const registryBlock = registrySrc.match(/TRACK_COMPILED_PATHWAYS[^=]*=\s*\{([\s\S]*?)\n\};/);
const registryTracks = new Set(
  registryBlock ? [...registryBlock[1].matchAll(/"?([A-Za-z0-9_-]+)"?\s*:\s*\[/g)].map((m) => m[1]) : []
);

const obligationByKey = new Map(universe.canonicalObligations.map((o) => [o.routeKey, o]));
const laneDetail = residual.lanes.find((l) => l.residualLaneId === ASSIGNMENT_ID)?.detail ?? {};
const conflicts = new Map((laneDetail.conflictToResolveFirst ?? []).map((c) => [c.routeKey, c]));

const rows = [];
const bindings = [];
const stopped = [];
const observations = [];

for (const row of retriage.rows.filter((r) => r.bucket === "ALREADY_ANSWERED")) {
  const ev = row.evidence;
  const obligation = obligationByKey.get(row.routeKey);
  const participantA = (obligation?.sourceEntityKeys ?? [])
    .filter((k) => k.startsWith("pathway:"))
    .map((k) => k.slice("pathway:".length));

  const base = {
    itemId: row.routeKey,
    status: "COMPLETED",
    jurisdiction: row.jurisdiction,
    publicLabel: row.publicLabel,
    retriageRule: row.ruleId,
    obligationKind: obligation?.obligationKind ?? null,
    legalReviewQuestion: row.legalReviewQuestion,
    decisionRecord: { id: ev.recordId, file: ev.file, field: ev.field }
  };

  /** ROW STOP — the record must exist before anything may be asserted from it. */
  const stop = (reason, extra = {}) => {
    const entry = { ...base, status: "STOPPED", stopScope: "ROW", stopReason: reason, ...extra };
    rows.push(entry);
    stopped.push(entry);
  };

  /* ------------------------------------------------ AA-1: authority decision */
  if (ev.kind === "controlling-decision-record") {
    const decision = authority.decisions.find((d) => d.id === ev.recordId);
    if (!decision) {
      stop("the cited decision record does not exist in this tree; nothing may be asserted from it");
      continue;
    }
    const disagreements = [];
    if (decision.outputMode !== ev.outputMode)
      disagreements.push({ field: "outputMode", record: decision.outputMode, retriage: ev.outputMode });
    if (decision.ruleId !== ev.ruleId)
      disagreements.push({ field: "ruleId", record: decision.ruleId, retriage: ev.ruleId });
    if (!(decision.routeKeys ?? []).includes(ev.namesThisRouteKey))
      disagreements.push({ field: "routeKeys", record: decision.routeKeys ?? [], retriage: ev.namesThisRouteKey });

    const conflict = conflicts.get(row.routeKey);
    if (conflict) {
      /*
       * The stop is only useful if it hands on what the controlling record
       * actually requires. Read it rather than paraphrasing the lane detail.
       */
      const COUNSEL = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
      let counselDecisions = [];
      try {
        const doc = read(COUNSEL);
        counselDecisions = (doc.decisions ?? []).filter((d) => conflict.controllingDecisionIds.includes(d.decisionId));
      } catch { counselDecisions = []; }
      const requiredTreatments = counselDecisions.flatMap((d) => d.requiredTreatments ?? []);
      const requiredFacts = counselDecisions.flatMap((d) => d.requiredFacts ?? []);
      stop(
        "a newer counsel record names the route this retriage cites as legally overbroad, so the retriage's treatment may not be implemented",
        {
          retriageClaim: `${ev.recordId} maps this route to one ${ev.outputMode}.`,
          supersedingRecord: {
            ids: conflict.controllingDecisionIds,
            file: "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json",
            field: conflict.controllingDecisionIds.map((id) => `decisions[] decisionId=${id}`)
          },
          recordEffect: conflict.recordEffect,
          whyThisRowCannotBeImplementedHere:
            "The record requires three disposition-bound configurations with distinct route identities. This lane holds one route key, not three, and route identity is not in its owned paths. Emitting a single binding would re-record the overbroad treatment the record retires.",
          controllingRecordResolved: counselDecisions.length === conflict.controllingDecisionIds.length,
          requiredTreatments,
          requiredFacts,
          whatTheNextLaneNeedsToProduce:
            requiredTreatments.length > 0
              ? requiredTreatments.map((t) => ({
                  label: t.label,
                  authority: t.authority,
                  formOption: t.formOption,
                  needs: "its own route identity, disposition predicate, packet configuration identity, required facts, specification and specification hash, fixture, verification snapshot, artifact-input hash, artifact review and legal/output approval"
                }))
              : [],
          captainInput: conflict.captainOwns,
          laneContinued: true
        }
      );
      continue;
    }
    if (disagreements.length > 0) {
      stop("the decision record states something different from the retriage; the record wins and the retriage is the defect", {
        disagreements
      });
      continue;
    }

    /* The record id's jurisdiction prefix is not the record's jurisdiction. */
    if (decision.jurisdiction !== row.jurisdiction) {
      stop("the decision record's own jurisdiction is not this row's jurisdiction", {
        recordJurisdiction: decision.jurisdiction,
        rowJurisdiction: row.jurisdiction
      });
      continue;
    }
    const idPrefixJurisdiction = ev.recordId.match(/-([A-Z]{2})-[A-Z0-9]+-?\d*$/)?.[1] ?? null;
    if (idPrefixJurisdiction && idPrefixJurisdiction !== decision.jurisdiction) {
      observations.push({
        routeKey: row.routeKey,
        observation: "record-id naming artifact",
        detail: `${ev.recordId} reads as ${idPrefixJurisdiction} but the record's own jurisdiction field and routeKeys govern ${decision.jurisdiction}. The record content controls and matches this row; the id string is misleading but not a defect in the decision.`
      });
    }

    const decomposition = table.decompositions[decision.outputMode];
    if (!decomposition) {
      stop("the record's output treatment has no entry in this lane's decomposition table, so its runtime outcome mode is not derivable here", {
        outputMode: decision.outputMode
      });
      continue;
    }

    const branches = decomposition.branches.map((b) => ({ ...b, packetFamily: null, paymentAuthority: paymentAuthorityOf({ ...b, packetFamily: null }) }));

    /*
     * A failure disposition and a contract cohort are branches OF a route, so
     * the census carries no pathway edge of their own. The decision record does
     * name the route they hang off, and that route is the participant A key
     * they settle. Falling back to it is not a guess: R2-10 already proved the
     * record names this row.
     */
    const keys = participantA.length > 0 ? participantA : (decision.routeKeys ?? []);
    const participantAOrigin = participantA.length > 0 ? "census-representation-edge" : "decision-record-routeKeys";
    const targets = keys.map((key) => {
      const current = contractIndex.get(key)?.outcomeMode ?? null;
      return {
        participantARouteKey: key,
        file: contractIndex.get(key)?.file ?? `${ROUTES_DIR}/ (no contract carries this route key)`,
        field: `routes[] routeKey=${key} -> outcomeMode, stage, serviceBranches[]`,
        contractPresent: contractIndex.has(key),
        currentOutcomeMode: current,
        drift: driftOf(current, branches, decomposition.composition, contractIndex.has(key))
      };
    });

    bindings.push({
      itemId: row.routeKey,
      jurisdiction: row.jurisdiction,
      derivedFrom: { id: decision.id, file: AUTHORITY, field: `decisions[] id=${decision.id}`, ruleId: decision.ruleId, outputMode: decision.outputMode },
      participantARouteKeys: keys,
      participantARouteKeyOrigin: participantAOrigin,
      composition: decomposition.composition,
      branches,
      bindingConstraints: decision.effectiveDateNote ? [decision.effectiveDateNote] : [],
      separationRule:
        decomposition.composition === "disjoint_branches"
          ? "Each branch carries its own stable branch id and is selected by its own disposition predicate. Two branches may not resolve to one undifferentiated configuration, and may not share a checkout path."
          : "Both branches are owed on the same matter. Serving one does not discharge the other.",
      targets
    });

    rows.push({
      ...base,
      settledParticipantABranches: keys.flatMap((key) => branches.map((b) => `${key}#${b.branchId}`)),
      participantARouteKeys: keys,
      participantARouteKeyOrigin: participantAOrigin,
      effect: {
        file: "data/rcap-grade-a/wave-2/r2-already-answered-engineering/route-treatment-bindings.json",
        field: `bindings[] itemId=${row.routeKey} -> branches[]`
      },
      target: targets,
      engineeringChange:
        `Decomposed the record's output treatment "${decision.outputMode}" into ${branches.length} governed branch configuration${branches.length === 1 ? "" : "s"} ` +
        `(${branches.map((b) => `${b.branchId}=${b.outcomeMode}/${b.stage}`).join(", ")}), each with a stable branch id, a distinct disposition predicate slot and packetFamily null, ` +
        `and carried the record's effective-date note across as a binding constraint. ` +
        `Every branch derives paymentAuthority closed under src/lib/legal-authority/index.ts routePaymentAuthority.`,
      commercialEffect: "none; every branch derives paymentAuthority closed"
    });
    continue;
  }

  /* ---------------------------------------------- AA-3: legal-design memo track */
  if (ev.kind === "legal-design-memo-track") {
    const trackId = ev.recordId.split("#")[1];
    let memo;
    try {
      memo = read(ev.file);
    } catch {
      stop("the cited memo file does not exist in this tree; nothing may be asserted from it");
      continue;
    }
    const track = (memo.tracks ?? []).find((t) => t.trackId === trackId);
    if (!track) {
      stop("the cited memo track does not exist in this tree; nothing may be asserted from it", { trackId });
      continue;
    }
    const disagreements = [];
    if (track.outputStrategy !== ev.outputStrategy)
      disagreements.push({ field: "outputStrategy", record: track.outputStrategy, retriage: ev.outputStrategy });
    if (JSON.stringify(track.guidanceRationales ?? []) !== JSON.stringify(ev.guidanceRationales ?? []))
      disagreements.push({ field: "guidanceRationales", record: track.guidanceRationales ?? [], retriage: ev.guidanceRationales ?? [] });
    if ((track.legalDesignDecision?.status ?? null) !== ev.legalDesignStatus)
      disagreements.push({ field: "legalDesignDecision.status", record: track.legalDesignDecision?.status ?? null, retriage: ev.legalDesignStatus });
    if (disagreements.length > 0) {
      stop("the memo track states something different from the retriage; the record wins and the retriage is the defect", { disagreements });
      continue;
    }

    const decomposition = table.guidanceStrategyDecomposition[track.outputStrategy];
    if (!decomposition) {
      stop("the memo's output strategy has no entry in this lane's decomposition table", { outputStrategy: track.outputStrategy });
      continue;
    }
    const branches = decomposition.branches.map((b) => ({ ...b, packetFamily: null, paymentAuthority: paymentAuthorityOf({ ...b, packetFamily: null }) }));
    const guidanceKey = `${row.jurisdiction}:${trackId}`;
    const guidance = guidanceIndex.get(guidanceKey) ?? null;
    const counselHandoff = (track.guidanceRationales ?? []).filter((r) => table.counselHandoffRationales.includes(r));

    const targets = [
      {
        file: guidance?.file ?? `${GUIDANCE_DIR}/${row.jurisdiction.toLowerCase()}.json`,
        field: `packets[] trackId=${trackId} -> treatment, paymentAllowed, sellable`,
        guidancePacketPresent: Boolean(guidance),
        observedTreatment: guidance?.treatment ?? null,
        observedPaymentAllowed: guidance?.paymentAllowed ?? null,
        observedSellable: guidance?.sellable ?? null
      },
      {
        file: REGISTRY,
        field: `TRACK_COMPILED_PATHWAYS["${trackId}"]`,
        registryEntryPresent: registryTracks.has(trackId)
      }
    ];

    bindings.push({
      itemId: row.routeKey,
      jurisdiction: row.jurisdiction,
      derivedFrom: {
        id: ev.recordId,
        file: ev.file,
        field: `tracks[] trackId=${trackId} -> outputStrategy, guidanceRationales, legalDesignDecision.status`,
        outputStrategy: track.outputStrategy,
        guidanceRationales: track.guidanceRationales ?? [],
        legalDesignStatus: track.legalDesignDecision?.status ?? null
      },
      participantARouteKeys: participantA,
      participantABranchResolution:
        participantA.length === 0
          ? {
              kind: "no_participant_branch_by_decision",
              why: `The memo records this track's output as ${track.outputStrategy} because ${(track.guidanceRationales ?? []).join(", ")}. A track on which the participant files nothing has no participant A packet branch, and the census carries no representation edge for it. The empty set is the decided answer, not an undetermined one.`,
              registryPrecedent: `src/lib/rcap/documents/guidance-packet-registry.ts already binds guidance-only tracks with no compiled pathway to [], for example ak-sej.`
            }
          : { kind: "participant_branches_named", keys: participantA },
      composition: decomposition.composition,
      branches,
      counselHandoffRequired: counselHandoff.length > 0,
      counselHandoffRationales: counselHandoff,
      bindingConstraints: [
        "The participant files nothing on this track. Checkout, packet credit and render jobs stay closed.",
        ...(track.legalDesignDecision?.limitations ?? []).map((l) => l.statement)
      ],
      separationRule:
        "A guidance-only track may not acquire a packet-bearing branch without a new controlling record. The guidance registry is fail-closed on paymentAllowed and sellable.",
      targets
    });

    rows.push({
      ...base,
      settledParticipantABranches:
        participantA.length === 0
          ? [`${row.jurisdiction}:${trackId}#process-guidance (no participant A packet branch, by decision)`]
          : participantA.flatMap((key) => branches.map((b) => `${key}#${b.branchId}`)),
      participantARouteKeys: participantA,
      effect: {
        file: "data/rcap-grade-a/wave-2/r2-already-answered-engineering/route-treatment-bindings.json",
        field: `bindings[] itemId=${row.routeKey} -> branches[], participantABranchResolution`
      },
      target: targets,
      engineeringChange:
        `Bound track ${trackId} to a single governed guidance branch (process-guidance=guidance_status/single_stage, packetFamily null, paymentAuthority closed), ` +
        `carried its ${(track.guidanceRationales ?? []).length} guidance rationale${(track.guidanceRationales ?? []).length === 1 ? "" : "s"} and its legal-design limitations across as binding constraints, ` +
        `recorded ${counselHandoff.length > 0 ? `a required counsel handoff (${counselHandoff.join(", ")})` : "no counsel handoff"}, ` +
        `and settled the participant A branch question as ${participantA.length === 0 ? "no participant A packet branch by decision" : participantA.join(", ")}. ` +
        `Observed state: guidance packet ${guidance ? "present" : "absent"}, registry entry ${registryTracks.has(trackId) ? "present" : "absent"}.`,
      commercialEffect: "none; guidance_status is a no-participant-filing outcome and derives paymentAuthority closed"
    });
    continue;
  }

  /* ------------------------------------ AA-2: signed reclassification record */
  if (ev.kind === "signed-reclassification-record") {
    const record = (reclass.reclassifications ?? []).find((r) => r.id === ev.recordId);
    if (!record) {
      stop("the cited reclassification record does not exist in this tree; nothing may be asserted from it");
      continue;
    }
    const key = table.reclassificationDecomposition[ev.reclassification] ? ev.reclassification : null;
    if (!key) {
      stop("the reclassification has no entry in this lane's decomposition table", { reclassification: ev.reclassification });
      continue;
    }
    const decomposition = table.reclassificationDecomposition[key];
    const branches = decomposition.branches.map((b) => ({ ...b, packetFamily: null, paymentAuthority: paymentAuthorityOf({ ...b, packetFamily: null }) }));
    const pathwayKey = ev.pathwayKey;
    const targets = [
      {
        participantARouteKey: pathwayKey,
        file: contractIndex.get(pathwayKey)?.file ?? `${ROUTES_DIR}/ (no contract carries this route key)`,
        field: `routes[] routeKey=${pathwayKey} -> outcomeMode`,
        contractPresent: contractIndex.has(pathwayKey),
        currentOutcomeMode: contractIndex.get(pathwayKey)?.outcomeMode ?? null,
        drift: driftOf(contractIndex.get(pathwayKey)?.outcomeMode ?? null, branches, decomposition.composition, contractIndex.has(pathwayKey))
      }
    ];

    bindings.push({
      itemId: row.routeKey,
      jurisdiction: row.jurisdiction,
      derivedFrom: { id: record.id, file: RECLASS, field: `reclassifications[] id=${record.id}`, reclassification: ev.reclassification, reason: ev.reason, authority: ev.authority },
      participantARouteKeys: [pathwayKey],
      composition: decomposition.composition,
      branches,
      bindingConstraints: [
        "A signed reclassification is the only way this pathway may change classification. It is out of paid product scope and may not be reopened by a route edit.",
        `Signed by: ${ev.authority}.`
      ],
      separationRule: "product_scope_exclusion is terminal for the paid path. Reopening it requires another signed record in the same register, not a contract change.",
      targets
    });

    rows.push({
      ...base,
      settledParticipantABranches: branches.map((b) => `${pathwayKey}#${b.branchId}`),
      participantARouteKeys: [pathwayKey],
      effect: {
        file: "data/rcap-grade-a/wave-2/r2-already-answered-engineering/route-treatment-bindings.json",
        field: `bindings[] itemId=${row.routeKey} -> branches[]`
      },
      target: targets,
      engineeringChange:
        `Bound ${pathwayKey} to a single governed branch product-scope-exclusion=unsupported/single_stage with packetFamily null, ` +
        `implementing the signed reclassification ${record.id} (${ev.reclassification}, reason ${ev.reason}). ` +
        `unsupported is a no-participant-filing outcome, so the runtime's own derivation closes the checkout this pathway previously intended.`,
      commercialEffect: "closes a previously paid-intended path; opens none"
    });
    continue;
  }

  stop(`unrecognised evidence kind ${ev.kind}`);
}

const completed = rows.filter((r) => r.status === "COMPLETED");
const openedCheckouts = bindings.flatMap((b) => b.branches).filter((b) => b.paymentAuthority === "packet_checkout");

write("route-treatment-bindings.json", {
  schemaVersion: "rcap-grade-a-r2-route-treatment-bindings/v1",
  assignmentId: ASSIGNMENT_ID,
  generatedBy: "data/rcap-grade-a/wave-2/r2-already-answered-engineering/generate-r2.mjs",
  what: "The engineering effect of this lane: one governed branch configuration set per already-answered route, derived from the controlling record and expressed in the runtime's own RouteOutcomeMode vocabulary.",
  whyPacketFamilyIsAlwaysNull: table.packetFamilyRule,
  runtimeVocabularySource: { file: TYPES, noParticipantFilingOutcomes: NO_FILING, packetBearingOutcomes: PACKET_BEARING },
  paymentDerivation: { file: "src/lib/legal-authority/index.ts", field: "routePaymentAuthority", restatedHere: "closed for any no-filing outcome, any active_case_admission/automatic/enforcement stage, or any null packet family" },
  counts: {
    bindings: bindings.length,
    branches: bindings.reduce((n, b) => n + b.branches.length, 0),
    branchesWithOpenCheckout: openedCheckouts.length
  },
  bindings
});

write("stopped.json", {
  schemaVersion: "rcap-grade-a-r2-stopped/v1",
  assignmentId: ASSIGNMENT_ID,
  stopScopeRule: "WEC-6: every stop here is a ROW stop. The lane continued past each one.",
  laneStopped: false,
  rowsStopped: stopped.length,
  stopped
});

write("rows.json", {
  schemaVersion: "rcap-grade-a-wave-2-lane-return/v1",
  assignmentId: ASSIGNMENT_ID,
  workerBranch: WORKER_BRANCH,
  baseSha: BASE_SHA,
  assignmentReadFrom: {
    branch: "claude/legalease-sprint-captain-utucnw",
    file: "data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json",
    dispatchSha: DISPATCH_SHA,
    captainBaseShaVerified: true
  },
  generatedBy: "data/rcap-grade-a/wave-2/r2-already-answered-engineering/generate-r2.mjs",
  completionVocabulary: ["COMPLETED", "STOPPED"],
  counts: {
    rows: rows.length,
    completed: completed.length,
    stopped: stopped.length,
    decisionRecordsCited: new Set(rows.map((r) => r.decisionRecord.id)).size,
    commercialRoutesOpened: openedCheckouts.length
  },
  productionTouched: false,
  observations,
  rows
});

console.log(`rows ${rows.length}  completed ${completed.length}  stopped ${stopped.length}`);
console.log(`bindings ${bindings.length}  branches ${bindings.reduce((n, b) => n + b.branches.length, 0)}  openCheckouts ${openedCheckouts.length}`);
if (openedCheckouts.length > 0) { console.error("REFUSED: this lane may not open a checkout"); process.exit(1); }
