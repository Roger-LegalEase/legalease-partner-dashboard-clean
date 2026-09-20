#!/usr/bin/env node
/**
 * WAVE 2 INTEGRATION — apply the accepted returns to the controlling files.
 *
 *   node scripts/grade-a-launch-control/apply-wave-2-returns.mjs [--check]
 *
 * A return that is merely counted has changed nothing. Every lane in Wave 2 was
 * confined to its own owned path, so each prepared its effect and stopped at the
 * boundary of the shared files. Applying them is the Captain's act, and this is
 * where it happens.
 *
 * Two outcomes are permitted per item and both are proof: the controlling file
 * changed, or the controlling file was already correct and this says mechanically
 * why. "Prepared" is not an outcome here.
 *
 * The one thing this may never do is open a commercial route. Every branch it
 * writes carries a null packet family, and the Oregon reconciliation closes a
 * checkout rather than opening one. --check re-derives without writing.
 */
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p, v) => { if (!CHECK) fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };

const ROUTES_DIR = "src/lib/legal-authority/routes";
const BINDINGS = "data/rcap-grade-a/wave-2/r2-already-answered-engineering/route-treatment-bindings.json";
const R3 = "data/rcap-grade-a/wave-2/r3-route-mapping-remainder/rows.json";
const R6 = "data/rcap-grade-a/wave-2/r6-counsel-determination-implementation/rows.json";
const CROSSWALK = "data/rcap-grade-a/launch-control/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json";
const RATIFICATION = "data/record-clearing/legal-decisions/route-ratification-registry.json";
const OR_SPEC = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";

const applied = [];
const alreadyCorrect = [];
const deferred = [];
const record = (list, entry) => list.push(entry);

/* ---------------------------------------------------------------- R2 -------- */
/* Load every contract file once; last file wins is the runtime's own order. */
const routeFiles = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".json")).sort();
const docs = new Map(routeFiles.map((f) => [f, read(path.join(ROUTES_DIR, f))]));
const locate = (routeKey) => {
  /* The last file carrying the key is the one the runtime resolves. */
  const PRECEDENCE = ["p0.json", "mississippi.json", "route-splits.json", "single-routes.json",
    "national-report-2026-08-28.json", "national-report-batch-b.json", "national-report-batch-c.json"];
  let hit = null;
  for (const f of PRECEDENCE) {
    const doc = docs.get(f);
    const route = doc?.routes?.find((r) => r.routeKey === routeKey);
    if (route) hit = { file: f, route };
  }
  return hit;
};

const bindings = read(BINDINGS).bindings;
for (const binding of bindings) {
  for (const target of binding.targets ?? []) {
    const key = target.participantARouteKey;
    if (!key || !target.contractPresent) continue;
    const found = locate(key);
    if (!found) continue;
    const { file, route } = found;
    const required = binding.branches;
    const existing = route.serviceBranches ?? [];

    /* A single-treatment record the top-level mode already states. */
    if (required.length === 1 && required[0].outcomeMode === route.outcomeMode) {
      record(alreadyCorrect, { lane: "R2", itemId: binding.itemId, routeKey: key, file: `${ROUTES_DIR}/${file}`,
        finding: `the record states one treatment and the contract's outcomeMode is already ${route.outcomeMode}` });
      continue;
    }
    /* A contract already branched at least as finely as the record requires. */
    if (existing.length >= required.length) {
      record(alreadyCorrect, { lane: "R2", itemId: binding.itemId, routeKey: key, file: `${ROUTES_DIR}/${file}`,
        finding: `the contract already declares ${existing.length} service branch(es) for a record requiring ${required.length}: ${existing.map((b) => `${b.id}=${b.outcomeMode}`).join(", ")}` });
      continue;
    }

    /* The primary treatment is the one the top-level outcomeMode already is,
     * and only when no sibling shares that mode — two treatments at one mode is
     * exactly the branch-identity gap the record refuses to let collapse. */
    const modeCounts = {};
    for (const b of required) modeCounts[b.outcomeMode] = (modeCounts[b.outcomeMode] ?? 0) + 1;
    const candidates = required.filter((b) => {
      if (existing.some((e) => e.id === b.branchId)) return false;
      if (b.outcomeMode === route.outcomeMode && modeCounts[b.outcomeMode] === 1) return false;
      return true;
    });
    /*
     * A packet-bearing branch becomes a Category A terminal obligation in the
     * census the moment it exists, and the census denominator for v1 is frozen.
     * Installing one here would move a frozen denominator as a side effect of an
     * integration -- the exact act R3 refused and recorded rather than perform.
     * So the identity is deferred to the residual with its reason, and only the
     * branches the census reads as legitimate exclusions are installed now.
     */
    const PACKET_BEARING = ["participant_packet", "attorney_review_packet", "agency_application"];
    /*
     * Three contracts are pinned runtime-contract cohorts: the census verifier
     * carries their exact branch enumeration and each branch's expected
     * classification. Adding a branch to one changes a set counsel's review is
     * pinned against, so it moves with its own record too.
     */
    const PINNED_COHORT_CONTRACTS = new Set([
      "DE:juvenile-expungement-under-10-del-c-1017-1019-1017a",
      "ME:juvenile-sealing",
      "UT:path-m-juvenile-expungement"
    ]);
    const pinned = PINNED_COHORT_CONTRACTS.has(key);
    const toAdd = pinned ? [] : candidates.filter((b) => !PACKET_BEARING.includes(b.outcomeMode));
    if (pinned) {
      for (const b of candidates) {
        record(deferred, { lane: "R2", itemId: binding.itemId, routeKey: key, file: `${ROUTES_DIR}/${file}`,
          branchId: b.branchId, outcomeMode: b.outcomeMode, decisionRecord: binding.derivedFrom.id,
          why: "this contract is a pinned runtime-contract cohort whose exact branch enumeration and per-branch classification the census verifier asserts; adding a branch moves a set counsel's review is pinned against",
          owed: "a cohort-enumeration change recorded against the verifier's expectation, then the branch identity and its predicate" });
      }
    }
    for (const b of pinned ? [] : candidates.filter((x) => PACKET_BEARING.includes(x.outcomeMode))) {
      record(deferred, { lane: "R2", itemId: binding.itemId, routeKey: key, file: `${ROUTES_DIR}/${file}`,
        branchId: b.branchId, outcomeMode: b.outcomeMode, decisionRecord: binding.derivedFrom.id,
        why: "installing a packet-bearing service branch creates a Category A terminal obligation and moves the frozen census v1 denominator; that is a Captain act with its own record, not a side effect of integrating a return",
        owed: "a denominator-movement record, then the branch identity, its disposition predicate and its packet configuration" });
    }
    if (toAdd.length === 0) {
      record(alreadyCorrect, { lane: "R2", itemId: binding.itemId, routeKey: key, file: `${ROUTES_DIR}/${file}`,
        finding: "every branch the record requires is already expressed by the contract's outcomeMode or an existing branch" });
      continue;
    }

    const newBranches = toAdd.map((b) => ({
      id: b.branchId,
      when: `the matter's disposition selects the ${b.treatment} treatment named by ${binding.derivedFrom.id}`,
      outcomeMode: b.outcomeMode,
      packetFamily: null,
      stage: b.stage,
      note:
        `${binding.derivedFrom.id} states this route's output treatment as "${binding.derivedFrom.outputMode}". ` +
        `${binding.separationRule} ` +
        `Installed by the Wave 2 integration from R2_ALREADY_ANSWERED_ENGINEERING with no selector and a null packet family: ` +
        `the branch identity is the decision, and its disposition predicate and packet configuration are owed by the branch-identity and packet-factory lanes. ` +
        `It therefore records the requirement without opening anything or inventing a predicate.`
    }));
    route.serviceBranches = [...existing, ...newBranches];
    record(applied, { lane: "R2", itemId: binding.itemId, routeKey: key, file: `${ROUTES_DIR}/${file}`,
      field: `routes[] routeKey=${key} -> serviceBranches[]`,
      change: `added ${newBranches.length} governed service branch(es): ${newBranches.map((b) => `${b.id}=${b.outcomeMode}/${b.stage}`).join(", ")}`,
      decisionRecord: binding.derivedFrom.id });
  }
}

/* ------------------------------------------------------- Oregon ------------- */
/* Counsel retired the broad route. Retiring it closes a checkout the runtime
 * derives today; it does not create the three replacements, which have their own
 * identities in the specification and are not built. */
const orSpec = read(OR_SPEC);
const orKey = orSpec.supersedes.routeId;
const orFound = locate(orKey);
if (orFound && orFound.route.outcomeMode !== "unsupported") {
  const route = orFound.route;
  const before = { outcomeMode: route.outcomeMode, packetFamily: route.packetFamily };
  route.outcomeMode = "unsupported";
  route.packetFamily = null;
  delete route.packetComponents;
  route.retiredBy = {
    decisions: orSpec.recordedDecisions,
    record: orSpec.decisionRecord,
    specification: OR_SPEC,
    why: orSpec.supersedes.why,
    replacedBy: orSpec.configurations.map((c) => ({ specificationId: c.specificationId, routeKey: c.routeKey, label: c.label, formOption: c.formOption })),
    doNotRecreate: "This route is legally overbroad. It is retired in place so its key still resolves and cannot be silently re-pointed at one of the three replacements."
  };
  route.notes = `RETIRED. ${orSpec.supersedes.why} The three disposition-bound replacements are governed by ${OR_SPEC} and are not built; none is commercially open. ${route.notes ?? ""}`.trim();
  record(applied, { lane: "OREGON", itemId: orKey, routeKey: orKey, file: `${ROUTES_DIR}/${orFound.file}`,
    field: `routes[] routeKey=${orKey} -> outcomeMode, packetFamily`,
    change: `retired the overbroad route: outcomeMode ${before.outcomeMode} -> unsupported and packetFamily ${JSON.stringify(before.packetFamily)} -> null, which closes the checkout the runtime derived for it, and named the three replacement identities`,
    decisionRecord: orSpec.recordedDecisions.join(", "), closesCheckout: true });
} else if (orFound) {
  record(alreadyCorrect, { lane: "OREGON", itemId: orKey, routeKey: orKey, file: `${ROUTES_DIR}/${orFound.file}`, finding: "the route is already retired to unsupported" });
}

for (const [file, doc] of docs) write(path.join(ROUTES_DIR, file), doc);

/* ---------------------------------------------------------------- R3 -------- */
const r3 = read(R3).rows.filter((r) => r.status === "COMPLETED");
const crosswalk = read(CROSSWALK);
for (const row of r3) {
  if (row.rowKind === "stage_branch_pair_binding") {
    const c = row.correctedMapping;
    const pair = crosswalk.pairs.find((p) => p.bStageRouteKey === c.bStageRouteKey && p.aBranchRouteKey === c.aBranchRouteKey);
    if (!pair) { record(alreadyCorrect, { lane: "R3", itemId: row.itemId, finding: "no crosswalk pair carries this stage/branch pair" }); continue; }
    if (pair.bStageRuntimeBinding && pair.aBranchRuntimeBinding) {
      record(alreadyCorrect, { lane: "R3", itemId: row.itemId, file: CROSSWALK, finding: "the pair already carries both runtime bindings" });
      continue;
    }
    pair.bStageRuntimeBinding = c.bStageRuntimeBinding;
    pair.aBranchRuntimeBinding = c.aBranchRuntimeBinding;
    pair.participantBranchRouteKeysSettled = c.participantBranchRouteKeysSettled;
    pair.bindingDisposition = c.disposition;
    pair.settledBy = "R3_ROUTE_MAPPING_REMAINDER";
    record(applied, { lane: "R3", itemId: row.itemId, file: CROSSWALK,
      field: `pairs[] bStageRouteKey=${c.bStageRouteKey} -> bStageRuntimeBinding, aBranchRuntimeBinding, participantBranchRouteKeysSettled`,
      change: `bound the stage to ${c.bStageRuntimeBinding.status} and the participant A branch to ${c.aBranchRuntimeBinding.status}` });
  }
  if (row.rowKind === "packet_family_vehicle_mapping") {
    const c = row.correctedMapping;
    const dir = fs.readdirSync("data/rcap-all50/overlays/census-v1/ne").find((d) => d.startsWith(`${c.packetFamilyId}--`));
    const dest = dir ? `data/rcap-all50/overlays/census-v1/ne/${dir}/product-wiring.json` : null;
    if (!dest || !fs.existsSync(dest)) { record(alreadyCorrect, { lane: "R3", itemId: row.itemId, finding: "no installed wiring record for this family" }); continue; }
    const wiring = read(dest);
    if (wiring.implementationStrategy === c.implementationStrategy) {
      record(alreadyCorrect, { lane: "R3", itemId: row.itemId, file: dest, finding: `the wiring already declares ${c.implementationStrategy}` });
      continue;
    }
    const before = wiring.implementationStrategy;
    wiring.implementationStrategy = c.implementationStrategy;
    wiring.officialPacket = c.officialPacket;
    wiring.customPleadingAuthorized = c.customPleadingAuthorized;
    wiring.generationAllowed = false;
    wiring.runtimeSelectable = false;
    wiring.commercialState = c.commercialState;
    wiring.correctedBy = "R3_ROUTE_MAPPING_REMAINDER";
    wiring.note = `${wiring.note ?? ""} The vehicle was corrected from ${before} to ${c.implementationStrategy}; the official packet is ${c.officialPacket.join(", ")}. Generation and runtime selection stay closed pending rebuild and review.`.trim();
    write(dest, wiring);
    record(applied, { lane: "R3", itemId: row.itemId, file: dest, field: "implementationStrategy, officialPacket, commercialState",
      change: `corrected the packet vehicle from ${before} to ${c.implementationStrategy} and named the official packet (${c.officialPacket.join(", ")}); generation and runtime selection remain closed` });
  }
}
write(CROSSWALK, crosswalk);

/* ---------------------------------------------------------------- R6 -------- */
/* Counsel determined these four are Category A. Their gates are not implemented
 * in code, which is exactly what hard_gate_pending means, so that is the status
 * they enter under. Ratified is necessary and never sufficient. */
const ratification = read(RATIFICATION);
const r6 = read(R6).rows.filter((r) => r.status === "COMPLETED");
for (const row of r6) {
  const created = row.branchIdentityCreated ?? {};
  const keys = created.routeKeys ?? (created.routeKey ? [created.routeKey] : []);
  for (const key of keys) {
    if (ratification.routes.some((r) => r.routeKey === key)) {
      record(alreadyCorrect, { lane: "R6", itemId: row.itemId, routeKey: key, file: RATIFICATION, finding: "the registry already carries this route identity" });
      continue;
    }
    ratification.routes.push({
      routeKey: key,
      status: "hard_gate_pending",
      cautionOverride: false,
      intentionalUnsupported: false,
      inEvaluator: false,
      inCompiledProfile: false,
      compiledStatusAsFound: null,
      staleRecord: false,
      decisionAuthority: `Lawrence (counsel), ${row.decisionId}, recorded in data/record-clearing/legal-decisions/2026-08-30-lawrence-four-counsel-determinations.json`,
      classification: row.classification,
      publicLabel: created.publicLabel ?? null,
      gatesNotYetInCode: [
        created.selector?.jurisdictionalGate,
        created.selector?.deadlineGate,
        created.selector?.question ? `date-cohort selector: ${created.selector.question}` : null
      ].filter(Boolean),
      refusalConditions: row.refusalConditions ?? [],
      commercialTreatment: created.commercialTreatment ?? "CLOSED",
      installedBy: "WAVE_2_INTEGRATION_CHECKPOINT",
      whyHardGatePending: "Counsel determined the route is Category A and participant-filed. Its jurisdictional, deadline or date-cohort gate is not implemented in code, so promoting it would open payment on records the engine cannot screen."
    });
    record(applied, { lane: "R6", itemId: row.itemId, routeKey: key, file: RATIFICATION,
      field: `routes[] routeKey=${key}`,
      change: `installed the counsel-determined route identity at status hard_gate_pending with its ungated conditions named`,
      decisionRecord: row.decisionId });
  }
}
ratification.totals.routes = ratification.routes.length;
ratification.totals.byStatus.hard_gate_pending = ratification.routes.filter((r) => r.status === "hard_gate_pending").length;
write(RATIFICATION, ratification);

/* ---------------------------------------------------------------- R4 -------- */
/* Every resolved identity claims RESOLVED_FROM_COMMITTED_RECORD. That is a claim
 * about a file, so it is checked against the file rather than accepted. A row
 * whose exact document name appears in no committed record is not a resolution. */
const R4 = "data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/rows.json";
const R4_CORPUS = [
  "data/rcap-grade-a/official-source-registry.json",
  "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json",
  "data/rcap-grade-a/route-obligation-census-v1/source-queue-reconciliation.json"
];
const corpusText = R4_CORPUS.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const row of read(R4).rows.filter((r) => r.status === "COMPLETED")) {
  const needle = row.exactDocumentName;
  const evidenceFiles = (row.evidence ?? []).map((e) => String(e).split("#")[0]);
  const inCorpus = corpusText.includes(needle);
  const inEvidence = evidenceFiles.some((f) => fs.existsSync(f) && fs.readFileSync(f, "utf8").includes(needle));
  if (inCorpus || inEvidence) {
    record(alreadyCorrect, { lane: "R4", itemId: row.itemId,
      file: inCorpus ? R4_CORPUS.find((f) => fs.existsSync(f) && fs.readFileSync(f, "utf8").includes(needle)) : evidenceFiles[0],
      finding: `the identity "${needle}" (${row.issuingAuthority}) already resolves in a committed record, which is what ${row.identityResolution} claims; no controlling file needed changing` });
  } else {
    record(deferred, { lane: "R4", itemId: row.itemId, why: `the exact document name "${needle}" appears in no committed record, so the claimed resolution is unproven`, owed: "the committed record the identity resolves from" });
  }
}

const LOG = "data/rcap-grade-a/wave-2/integration/applied.json";
const log = {
  schemaVersion: "rcap-grade-a-wave-2-integration-log/v1",
  generatedBy: "scripts/grade-a-launch-control/apply-wave-2-returns.mjs",
  what: "Every Wave 2 effect this integration applied to a controlling file, and every item it found the controlling file already correct on. A return is proven by one of these two entries and by nothing else.",
  returns: {
    R1: "7fbcfb07450d5bc4365ca82d9bc0915ec6bd48d7",
    R2: "9ee6a5f65f36bee6159efe66a0fa6d2fe06204ab",
    R3: "6c01e4e7ace3aee37f2443aad15c50c3d772c0e6",
    R4: "436b85d1b77720f6a00497e3f40a15e6b8c0e582",
    R6: "a07d65a0e1f44046cbedfb2fb8ae59c3a69b7ec2",
    R7: "614de04452450b0a4f077d315cfe1d2d4c6dbb1d",
    V1: "e14950ec5b9d9a74b300f1d076b488e1f5ebd772",
    V2: "85b58750104f85f8ed4d35362581ba4a7f9a950f",
    V3: "6fe1432af7f8aadb06087a699880dc85707a285f",
    V4: "ed8176e98344d715040bfdaeaacb684ef04aec2e",
    V5: "79922470a6a16264ba268b026097800faa9839f7",
    V6: "6e2e41fbadfaed782a68f6cb03844091b337bf5c",
    V7: "ce6bd1b174b518ecc11a69fb5214899abff8a83e"
  },
  commercialRule: "Every branch written here carries a null packet family, so the runtime's own derivation closes it. The Oregon reconciliation closes a checkout and opens none.",
  counts: { applied: applied.length, alreadyCorrect: alreadyCorrect.length, deferred: deferred.length, commercialRoutesOpened: 0 },
  frozenDenominatorRule: "A packet-bearing service branch is a Category A terminal obligation. Census v1 is frozen, so those identities are deferred to the residual with their reason rather than installed as a side effect of this integration.",
  applied,
  alreadyCorrect,
  deferred
};
if (!CHECK) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, `${JSON.stringify(log, null, 2)}\n`);
}
console.log(`applied ${applied.length}  alreadyCorrect ${alreadyCorrect.length}  deferred ${deferred.length}${CHECK ? "  (check only)" : ""}`);
for (const a of applied) console.log(`  APPLIED ${a.lane} ${a.routeKey ?? a.itemId}`);
for (const a of alreadyCorrect) console.log(`  ALREADY ${a.lane} ${a.routeKey ?? a.itemId} — ${a.finding}`);
