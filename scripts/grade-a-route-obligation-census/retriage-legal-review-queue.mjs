#!/usr/bin/env node
// One bucket for each of the 82 legal-review rows that are not counsel decisions.
//
//   node scripts/grade-a-route-obligation-census/retriage-legal-review-queue.mjs
//   node scripts/grade-a-route-obligation-census/retriage-legal-review-queue.mjs --check
//
// WHY THIS EXISTS
//
// The Captain's own triage routed 47 of 86 rows to counsel. Roger's correction is
// that four of them are: Alabama #4, Nebraska #47, New York #54 and Utah #76,
// pinned by routeKey in legal-review-queue-v2.json. The triage was conservative in
// the wrong direction -- it sent to counsel every row it could not itself close,
// which turned "the Captain has not done the mapping work" into "an attorney must
// decide this". Eighty-two questions the Captain owed would have buried four real
// decisions.
//
// The triage also undercounted the answers, because it looked for decision records
// in data/record-clearing/legal-decisions/ alone. The decision register that
// actually carries LD-CT-02, LD-DE-01, LD-KY-02, LD-SC-01 and sixty-three more is
// src/lib/legal-authority/authority.json, and Roger's own signed reclassifications
// live in data/rcap-ledger/sellable-pathway-reclassifications.json. Both are read
// here.
//
// WHAT A BUCKET IS NOT
//
// It decides no legal question, opens no route, approves no output and creates no
// fulfilment record. ALREADY_ANSWERED means a controlling record already states the
// answer and the remaining work is to implement it citing that record by id -- not
// that the route may sell, and not that the record has been ratified by counsel.
//
// TWO WAYS TO GET THIS WRONG, AND WHAT STOPS THEM
//
// A row wrongly filed ALREADY_ANSWERED is a question nobody ever asks again. So a
// cited decision must resolve in a register in this tree AND name this exact route
// key, and a decision whose outputMode is a MIXED menu of five treatments does not
// answer "which of them is this route" -- it is the menu, not the choice.
//
// A row wrongly filed DUPLICATE_OR_SUPERSEDED is a question that gets deleted. So
// every duplicate names the exact row it duplicates, and duplication is derived
// from shared identity in the census -- same jurisdiction and obligation label, or
// same parent expansion and same question -- never from questions that merely
// resemble each other.
//
// A row matching no rule fails this generator. It does not fall through to a
// default: the default in a triage is the bucket that hides the most work.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const CANDIDATE = "data/rcap-grade-a/route-obligation-census-candidate";
const OUT = `${V1}/legal-review-queue-v2-retriage.json`;
const CHECK = process.argv.includes("--check");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const QUEUE_V2 = `${V1}/legal-review-queue-v2.json`;
const QUEUE = `${CANDIDATE}/unresolved-legal-review-queue.json`;
const CENSUS = `${CANDIDATE}/route-obligation-candidate.json`;
const AUTHORITY = "src/lib/legal-authority/authority.json";
const RECLASS = "data/rcap-ledger/sellable-pathway-reclassifications.json";
const LEDGER = "data/rcap-ledger/authority-ledger.json";
const CROSSWALK = "data/rcap-ledger/crosswalk-adjudications.json";
const KIND_ADJ = "data/rcap-ledger/route-kind-adjudications.json";
const RECONCILIATION = `${V1}/source-queue-reconciliation.json`;
const BATCH1 = `${V1}/identity-resolution/batch-1/resolved.json`;
const BATCH2 = `${V1}/identity-resolution/batch-2/resolved.json`;
const WORKLIST = `${CANDIDATE}/packet-family-build-worklist.json`;
const INTAKE = "data/record-clearing/legal-design-intake";

const queueV2 = read(QUEUE_V2);
const queue = read(QUEUE);
const census = read(CENSUS);
const authority = read(AUTHORITY);
const reclass = read(RECLASS);
const ledger = read(LEDGER);
const crosswalk = read(CROSSWALK);
const kindAdj = read(KIND_ADJ);
const reconciliation = read(RECONCILIATION);
const batch1 = read(BATCH1);
const batch2 = read(BATCH2);
const worklist = read(WORKLIST);

const memos = {};
for (const f of fs.readdirSync(path.join(ROOT, INTAKE))) {
  if (!f.endsWith(".memo.json")) continue;
  const m = read(`${INTAKE}/${f}`);
  if (m.jurisdiction) memos[m.jurisdiction] = { file: `${INTAKE}/${f}`, memo: m };
}

const BUCKETS = {
  CAPTAIN_MAPPING_CORRECTION: "The Captain owes the route/output mapping. Stays with the Captain; never goes to counsel.",
  SOURCE_IDENTITY_QUESTION: "The answer is a document identity. Goes to the source team.",
  DUPLICATE_OR_SUPERSEDED: "The same question is asked by another row, or a later decision has overtaken it. The row it duplicates, or the decision that supersedes it, is named. A row removed without naming what replaces it is a question deleted, not answered.",
  ALREADY_ANSWERED: "A controlling decision exists in this repository. The work is to implement it citing that record by id, not to ask it again."
};

// ---- indexes -----------------------------------------------------------------
const censusByRoute = new Map(census.routes.map((r) => [r.routeKey, r]));
const decisionById = new Map(authority.decisions.map((d) => [d.id, d]));
const reclassByPathway = new Map(reclass.reclassifications.map((r) => [r.pathwayKey, r]));
const ledgerByTrack = new Map(ledger.tracks.map((t) => [`${t.jurisdiction}|${t.trackId}`, t]));
const crosswalkByPathway = new Map(crosswalk.adjudications.map((a) => [`${a.jurisdiction}:${a.compiledPathwayId}`, a]));
const kindAdjByRoute = new Map(kindAdj.rows.map((r) => [r.routeKey, r]));

// A census source id belongs to a packet family; the family is what the source
// queue and the two identity batches were worked against.
const familyByComponent = new Map();
for (const fam of worklist.packetFamilies) {
  for (const m of JSON.stringify(fam).matchAll(/"component:([^"]+)"/g)) {
    familyByComponent.set(m[1], fam.worklistGroupId);
  }
}
const reconByGroup = new Map();
for (const r of reconciliation.rows) {
  if (!reconByGroup.has(r.worklistGroupId)) reconByGroup.set(r.worklistGroupId, []);
  reconByGroup.get(r.worklistGroupId).push({ role: r.role, disposition: r.disposition, heldAs: r.heldAs ?? null });
}
const batchResolution = new Map();
for (const r of batch1.rows) batchResolution.set(r.worklistGroupId, { batch: 1, resolution: r.resolution ?? null });
for (const r of batch2.rows) batchResolution.set(r.worklistGroupId, { batch: 2, resolution: r.resolution ?? null });

// ---- the 86 rows, in the numbering legal-review-queue-v2 established ----------
//
// The instruction numbered the four counsel questions 4, 47, 54 and 76 and named
// their jurisdictions. A stable sort of the queue by jurisdiction reproduces all
// four positions exactly. queue-v2 recorded that; this asserts it, because a
// numbering that has drifted would silently repin the wrong four rows.
const numbered = [...queue.routes]
  .map((r, fileIndex) => ({ ...r, fileIndex }))
  .sort((a, b) => (a.jurisdiction < b.jurisdiction ? -1 : a.jurisdiction > b.jurisdiction ? 1 : a.fileIndex - b.fileIndex))
  .map((r, i) => ({ ...r, number: i + 1 }));

const pinned = new Map(queueV2.trueCounselQueue.questions.map((q) => [q.routeKey, q]));
for (const q of queueV2.trueCounselQueue.questions) {
  const at = numbered[q.number - 1];
  if (!at || at.routeKey !== q.routeKey) {
    console.error(`Counsel question ${q.number} (${q.jurisdiction}) does not sit at position ${q.number} in the jurisdiction-stable ordering.`);
    console.error(`  pinned:   ${q.routeKey}`);
    console.error(`  position: ${at ? at.routeKey : "(none)"}`);
    console.error("The numbering that identifies the four counsel questions has drifted. Refusing to retriage against a numbering that would repin the wrong rows.");
    process.exit(1);
  }
}

// ---- evidence readers --------------------------------------------------------
const tag = (row, prefix) => row.currentImplementationEvidence.find((e) => e.startsWith(prefix)) ?? null;
const tags = (row, prefix) => row.currentImplementationEvidence.filter((e) => e.startsWith(prefix));

const compiledPathway = (row) => {
  const t = tag(row, "compiled-runtime:");
  return t && t.includes("#") ? t.split("#")[1] : null;
};

// A decision only answers a row when it resolves in a register in this tree AND
// names this exact route key. "association=EXACT_AUTHORITY_ROUTE_KEY_ASSOCIATION"
// is the census's claim; this re-derives it rather than trusting it.
const authorityDecisionFor = (row) => {
  for (const e of tags(row, "runtime-authority-decision:")) {
    const m = /^runtime-authority-decision:([^:]+):route=([^:]+:[^:]+):association=EXACT_AUTHORITY_ROUTE_KEY_ASSOCIATION/.exec(e);
    if (!m) continue;
    const decision = decisionById.get(m[1]);
    if (!decision) continue;
    if (!(decision.routeKeys ?? []).includes(m[2])) continue;
    return { decision, contractRouteKey: m[2] };
  }
  return null;
};

const CONFLICT_MARKERS = [
  "exact-output-treatment-conflict:",
  "exact-mechanism-conflict:",
  "mixed-stage-conflict:",
  "filing-scope-conflict:",
  "unadopted-closure-contradiction:",
  "rejected-crosswalk-edge:",
  "current-grade-a-artifacts-do-not-resolve"
];
const conflictMarker = (row) => row.currentImplementationEvidence.find((e) => CONFLICT_MARKERS.some((p) => e.startsWith(p))) ?? null;

// An unadopted closure records a proposal with no authority and no decision date.
// Nothing has been decided, so nothing can be cited as deciding it.
const unadoptedClosure = (row) => {
  const t = tag(row, "unadopted-closure-contradiction:");
  return t && t.includes("proposal-authority=null") ? t : null;
};

const memoTrackFor = (row) => {
  const c = censusByRoute.get(row.routeKey);
  const entry = memos[row.jurisdiction];
  if (!c?.trackId || !entry) return null;
  const track = (entry.memo.tracks ?? []).find((t) => t.trackId === c.trackId);
  return track ? { file: entry.file, track } : null;
};

const packetIdentityStatus = (row) => {
  const t = tag(row, "unit-packet-identity-status:");
  return t ? t.slice("unit-packet-identity-status:".length) : null;
};

const namesADocument = (row) => {
  const c = censusByRoute.get(row.routeKey);
  const instrument = c?.participantFacingInstrument ?? null;
  if (!instrument) return false;
  if (instrument === "not recorded") return false;
  // "no filing - process guidance: <label>" restates the label; it names no document.
  return !instrument.startsWith("no filing");
};

// ---- duplicate identity, derived from the census, never from resemblance -----
const byLabel = new Map();
const byParentExpansion = new Map();
const normalizedQuestion = (row) => row.legalReviewQuestion.replace(/unit [^ ]+\/[^ ]+/g, "unit <unit>");
for (const row of numbered) {
  const labelKey = `${row.jurisdiction} ${row.publicLabel}`;
  if (!byLabel.has(labelKey)) byLabel.set(labelKey, []);
  byLabel.get(labelKey).push(row);
  for (const e of tags(row, "runtime-to-unit-parent-expansion:")) {
    const parent = e.slice("runtime-to-unit-parent-expansion:".length).replace(/:parent_expansion_without_unit_assignment$/, "");
    const key = `${row.jurisdiction} ${parent} ${normalizedQuestion(row)}`;
    if (!byParentExpansion.has(key)) byParentExpansion.set(key, []);
    byParentExpansion.get(key).push(row);
  }
}
// The canonical row of a cluster is the one carrying the conflict marker that
// states the question the others ask generically; failing that, the lowest number.
const canonicalOf = (cluster) => cluster.find((r) => conflictMarker(r)) ?? cluster[0];

// ---- rules -------------------------------------------------------------------
// Ordered. The first match wins, and a row matching none fails the run.
const RULES = [
  {
    id: "AA-1-AUTHORITY-DECISION-NAMES-THIS-ROUTE",
    bucket: "ALREADY_ANSWERED",
    test(row) {
      const hit = authorityDecisionFor(row);
      if (!hit) return null;
      // A MIXED outputMode is a menu of treatments across several routes. It does
      // not say which one this route takes, and a row asking exactly that is not
      // answered by being handed the menu.
      if (/^MIXED\b/i.test(hit.decision.outputMode ?? "")) return null;
      return {
        evidence: {
          kind: "controlling-decision-record",
          recordId: hit.decision.id,
          file: AUTHORITY,
          field: `decisions[] id=${hit.decision.id}`,
          ruleId: hit.decision.ruleId ?? null,
          outputMode: hit.decision.outputMode ?? null,
          effectiveDateNote: hit.decision.effectiveDateNote ?? null,
          namesThisRouteKey: hit.contractRouteKey,
          recordExistsInThisTree: true
        },
        confidence: "high",
        why: `The decision register names this exact route key, and states its output treatment: ${hit.decision.outputMode}. Implementing it cites ${hit.decision.id}.`
      };
    }
  },
  {
    id: "AA-2-SIGNED-RECLASSIFICATION",
    bucket: "ALREADY_ANSWERED",
    test(row) {
      const pathway = compiledPathway(row);
      if (!pathway) return null;
      const rec = reclassByPathway.get(`${row.jurisdiction}:${pathway}`);
      if (!rec) return null;
      return {
        evidence: {
          kind: "signed-reclassification-record",
          recordId: rec.id,
          file: RECLASS,
          field: `reclassifications[] id=${rec.id}`,
          pathwayKey: rec.pathwayKey,
          reclassification: `${rec.previousClassification} -> ${rec.newClassification}`,
          reason: rec.reason,
          authority: rec.authority ?? null,
          recordExistsInThisTree: true
        },
        confidence: "high",
        why: `A signed record moves this pathway to ${rec.newClassification} for reason ${rec.reason}. The register is the only way a pathway may change classification, so the filing-status question is decided.`
      };
    }
  },
  {
    id: "AA-3-MEMO-RECORDS-THE-GUIDANCE-RATIONALE",
    bucket: "ALREADY_ANSWERED",
    test(row) {
      if (unadoptedClosure(row)) return null;
      const hit = memoTrackFor(row);
      if (!hit) return null;
      const { track, file } = hit;
      if (track.outputStrategy !== "process_guidance") return null;
      const rationales = Array.isArray(track.guidanceRationales) ? track.guidanceRationales : [];
      if (!rationales.length) return null;
      const c = censusByRoute.get(row.routeKey);
      const led = ledgerByTrack.get(`${row.jurisdiction}|${c.trackId}`);
      // A rationale is a decision only where the legal-design stage is closed for
      // the track. An open legal-design stage means the memo is still being written.
      if (!led || led.legalDesignTerminal !== true) return null;
      const decisive = ["no_participant_filing_exists", "another_entity_decides", "agency_certification", "participant_obtains_record"];
      return {
        evidence: {
          kind: "legal-design-memo-track",
          recordId: `${file}#${c.trackId}`,
          file,
          field: `tracks[] trackId=${c.trackId} -> outputStrategy, guidanceRationales, legalDesignDecision.status`,
          outputStrategy: track.outputStrategy,
          guidanceRationales: rationales,
          legalDesignStatus: track.legalDesignDecision?.status ?? null,
          ledgerCorroboration: {
            file: LEDGER,
            field: `tracks[] ${row.jurisdiction}|${c.trackId} -> legalDesignTerminal`,
            legalDesignTerminal: true,
            remainingBlockerStage: led.rootBlockerStage,
            remainingBlockerOwner: led.rootBlockerOwner
          },
          recordExistsInThisTree: true
        },
        confidence: rationales.some((r) => decisive.includes(r)) ? "high" : "medium",
        why: `The memo records this track's output as process guidance and states why: ${rationales.join(", ")}. The ledger carries the track's legal-design stage as terminal, so what remains is ${led.rootBlockerStage} owned by ${led.rootBlockerOwner}, which is not a legal question.`
      };
    }
  },
  {
    id: "DUP-1-SAME-JURISDICTION-AND-OBLIGATION-LABEL",
    bucket: "DUPLICATE_OR_SUPERSEDED",
    test(row) {
      const cluster = byLabel.get(`${row.jurisdiction} ${row.publicLabel}`) ?? [];
      if (cluster.length < 2) return null;
      const canonical = canonicalOf(cluster);
      if (canonical.number === row.number) return null;
      return {
        evidence: {
          kind: "duplicate-of-row",
          duplicatesRowNumber: canonical.number,
          duplicatesRouteKey: canonical.routeKey,
          file: QUEUE,
          field: "routes[] -> jurisdiction + publicLabel",
          sharedIdentity: `${row.jurisdiction} :: ${row.publicLabel}`,
          canonicalQuestion: canonical.legalReviewQuestion,
          recordExistsInThisTree: true
        },
        confidence: "high",
        why: `The census gives this row and row #${canonical.number} the same jurisdiction and the same obligation label, so both describe one obligation. Row #${canonical.number} states the question; answering it answers this row. This row is removed naming #${canonical.number}, not deleted.`
      };
    }
  },
  {
    id: "DUP-2-SAME-PARENT-EXPANSION-AND-QUESTION",
    bucket: "DUPLICATE_OR_SUPERSEDED",
    test(row) {
      for (const e of tags(row, "runtime-to-unit-parent-expansion:")) {
        const parent = e.slice("runtime-to-unit-parent-expansion:".length).replace(/:parent_expansion_without_unit_assignment$/, "");
        const cluster = byParentExpansion.get(`${row.jurisdiction} ${parent} ${normalizedQuestion(row)}`) ?? [];
        if (cluster.length < 2) continue;
        const canonical = canonicalOf(cluster);
        if (canonical.number === row.number) continue;
        return {
          evidence: {
            kind: "duplicate-of-row",
            duplicatesRowNumber: canonical.number,
            duplicatesRouteKey: canonical.routeKey,
            file: QUEUE,
            field: "routes[] -> runtime-to-unit-parent-expansion + legalReviewQuestion",
            sharedParentExpansion: parent,
            sharedQuestion: normalizedQuestion(row),
            recordExistsInThisTree: true
          },
          confidence: "high",
          why: `Both rows expand the same parent, ${parent}, and ask the same question with only the unit id differing. Row #${canonical.number} carries it; this row is removed naming #${canonical.number}.`
        };
      }
      return null;
    }
  },
  {
    id: "SRC-1-PACKET-IDENTITY-NOT-RECORDED-AND-A-DOCUMENT-IS-IN-QUESTION",
    bucket: "SOURCE_IDENTITY_QUESTION",
    test(row) {
      if (packetIdentityStatus(row) !== "not recorded") return null;
      const unchecked = tags(row, "source-relationship:").filter((e) => e.endsWith(":unchecked"))
        .map((e) => e.slice("source-relationship:".length).replace(/:unchecked$/, ""));
      const documentNamed = namesADocument(row);
      // No packet identity AND no document in question is not a source question --
      // it is the Captain's unit-to-output mapping, and it falls through to that.
      if (!unchecked.length && !documentNamed) return null;
      const c = censusByRoute.get(row.routeKey);
      const groups = [...new Set(unchecked.map((id) => familyByComponent.get(id)).filter(Boolean))];
      const settledBy = groups.map((g) => ({
        worklistGroupId: g,
        sourceQueueReconciliation: reconByGroup.get(g) ?? null,
        identityBatch: batchResolution.get(g) ?? null
      }));
      const dispositions = settledBy.flatMap((s) => (s.sourceQueueReconciliation ?? []).map((d) => d.disposition));
      const settled = dispositions.length > 0 && dispositions.every((d) => d !== "UNRESOLVED_IDENTITY" && d !== "LEGAL_DESIGN_DECISION_REQUIRED");
      return {
        evidence: {
          kind: "source-identity",
          file: QUEUE,
          field: "routes[] -> unit-packet-identity-status, source-relationship:<id>:unchecked",
          packetIdentityStatus: "not recorded",
          uncheckedDocumentSourceIds: unchecked,
          participantFacingInstrument: c?.participantFacingInstrument ?? null,
          sourceWorkThatHasSinceLanded: settledBy,
          alreadySettledBySourceWork: settled,
          recordExistsInThisTree: true
        },
        confidence: unchecked.length ? "high" : "medium",
        why: unchecked.length
          ? `The census records no packet identity and names ${unchecked.length} document source(s) still unchecked. What is missing is a document identity, which the source team resolves.`
          : `The census records no packet identity and names the instrument only by prose title (${c?.participantFacingInstrument}). What is missing is which document that title is.`
      };
    }
  },
  {
    id: "MAP-1-CONFLICT-OR-CONTRADICTION-WITH-NO-DECIDING-RECORD",
    bucket: "CAPTAIN_MAPPING_CORRECTION",
    test(row) {
      const marker = conflictMarker(row);
      if (!marker) return null;
      return {
        evidence: {
          kind: "unreconciled-representation-conflict",
          file: QUEUE,
          field: "routes[] -> currentImplementationEvidence",
          marker,
          noDecidingRecord: "No decision in the authority register names this route key with a treatment that resolves the marker, and no signed reclassification covers the pathway.",
          recordExistsInThisTree: true
        },
        confidence: "high",
        why: `The census records an unreconciled conflict in this route's own representation (${marker.split(":")[0]}), and nothing in the decision registers resolves it. Reconciling the two representations is route/output mapping the Captain owes; it is not a question for counsel.`
      };
    }
  },
  {
    id: "MAP-2-ROUTE-KIND-ADJUDICATION-STILL-PENDING",
    bucket: "CAPTAIN_MAPPING_CORRECTION",
    test(row) {
      const t = tag(row, "route-kind-adjudication:pending:");
      if (!t) return null;
      const routeKey = t.slice("route-kind-adjudication:pending:".length).replace(/:[^:]+$/, "");
      const adj = kindAdjByRoute.get(routeKey);
      if (adj && adj.status === "applied") return null;
      return {
        evidence: {
          kind: "pending-route-kind-adjudication",
          file: KIND_ADJ,
          field: `rows[] routeKey=${routeKey} -> status`,
          status: adj?.status ?? "pending",
          decisionId: adj?.decisionId ?? null,
          registerNote: "Adding a route to this file does not adjudicate it; setting status to applied does, and that is a per-route decision with its own evidence.",
          recordExistsInThisTree: Boolean(adj)
        },
        confidence: "high",
        why: `The route-kind disagreement for ${routeKey} is recorded as pending, and the register states plainly that a pending row is not an adjudication. Applying it is the Captain's per-route mapping work.`
      };
    }
  },
  {
    id: "MAP-3-PARENT-EXPANSION-WITHOUT-UNIT-ASSIGNMENT",
    bucket: "CAPTAIN_MAPPING_CORRECTION",
    test(row) {
      const t = tag(row, "runtime-to-unit-parent-expansion:");
      if (!t) return null;
      const parent = t.slice("runtime-to-unit-parent-expansion:".length).replace(/:parent_expansion_without_unit_assignment$/, "");
      return {
        evidence: {
          kind: "parent-expansion-without-unit-assignment",
          file: QUEUE,
          field: "routes[] -> runtime-to-unit-parent-expansion",
          parentPathway: parent,
          packetIdentityStatus: packetIdentityStatus(row),
          recordExistsInThisTree: true
        },
        confidence: "high",
        why: `The runtime pathway ${parent} expanded into units without assigning this unit an output. The packet identity is already ${packetIdentityStatus(row)}, so what is missing is the unit-to-output assignment, which is the Captain's mapping.`
      };
    }
  },
  {
    id: "MAP-4-CROSSWALK-RELATION-THE-REGISTRY-HAS-NOT-ABSORBED",
    bucket: "CAPTAIN_MAPPING_CORRECTION",
    test(row) {
      const t = tag(row, "crosswalk:");
      if (!t) return null;
      const relation = t.slice("crosswalk:".length);
      const pathway = compiledPathway(row);
      const adj = pathway ? crosswalkByPathway.get(`${row.jurisdiction}:${pathway}`) : null;
      const gap = relation === "unregistered_relief_mechanism_registry_gap" || relation === "registry_scoped_out_named_authority";
      return {
        evidence: {
          kind: "crosswalk-relation",
          file: adj ? CROSSWALK : QUEUE,
          field: adj
            ? `adjudications[] ${row.jurisdiction}:${pathway} -> relation, mappedRegistryTrackIds`
            : "routes[] -> crosswalk:<relation>",
          relation,
          adjudicatedRelation: adj?.relation ?? null,
          mappedRegistryTrackIds: adj?.mappedRegistryTrackIds ?? null,
          adjudicatedBy: adj?.adjudicatedBy ?? null,
          recordExistsInThisTree: Boolean(adj)
        },
        confidence: gap ? "high" : "medium",
        why: gap
          ? `The crosswalk carries this pathway as ${relation} with no mapped registry track. The answer to "which decision authorizes it" is that none does and the registry has a gap; creating the mapping is the Captain's work, not an attorney's.`
          : `The crosswalk relates this pathway to the registry as ${relation}, and the route's legal question is which representation governs. Choosing between two representations the repository already holds is mapping, not a legal decision.`
      };
    }
  },
  {
    id: "MAP-5-AVAILABLE-UNIT-WITH-NO-PACKET-IDENTITY-AND-NO-DOCUMENT",
    bucket: "CAPTAIN_MAPPING_CORRECTION",
    test(row) {
      const unit = tag(row, "unit:");
      if (!unit || !unit.endsWith(":available=true")) return null;
      if (packetIdentityStatus(row) !== "not recorded") return null;
      if (namesADocument(row)) return null;
      return {
        evidence: {
          kind: "available-unit-without-output-assignment",
          file: QUEUE,
          field: "routes[] -> unit:<id>:available, unit-packet-identity-status",
          unit: unit.slice("unit:".length).replace(/:available=true$/, ""),
          packetIdentityStatus: "not recorded",
          participantFacingInstrument: censusByRoute.get(row.routeKey)?.participantFacingInstrument ?? null,
          recordExistsInThisTree: true
        },
        confidence: "high",
        why: "The unit is available and no document is in question -- the census names no instrument beyond the unit's own label. What is missing is the Captain's decision about what this unit produces."
      };
    }
  }
];

// ---- assignment --------------------------------------------------------------
const assignments = [];
const unmatched = [];

for (const row of numbered) {
  const pin = pinned.get(row.routeKey);
  if (pin) {
    assignments.push({
      number: row.number,
      routeKey: row.routeKey,
      jurisdiction: row.jurisdiction,
      publicLabel: row.publicLabel,
      legalReviewQuestion: row.legalReviewQuestion,
      bucket: "TRUE_COUNSEL_DECISION",
      ruleId: "PINNED-BY-QUEUE-V2",
      confidence: pin.confidence ?? "high",
      evidence: {
        kind: "pinned-counsel-question",
        recordId: `${QUEUE_V2}#trueCounselQueue.questions[number=${pin.number}]`,
        file: QUEUE_V2,
        field: `trueCounselQueue.questions[] number=${pin.number}`,
        recordExistsInThisTree: true
      },
      why: "Settled and pinned by Roger's routing instruction. Not retriaged, not reworded, not moved.",
      notRetriaged: true
    });
    continue;
  }

  let matched = null;
  for (const rule of RULES) {
    const hit = rule.test(row);
    if (hit) { matched = { rule, hit }; break; }
  }
  if (!matched) { unmatched.push(row); continue; }

  assignments.push({
    number: row.number,
    routeKey: row.routeKey,
    jurisdiction: row.jurisdiction,
    publicLabel: row.publicLabel,
    legalReviewQuestion: row.legalReviewQuestion,
    bucket: matched.rule.bucket,
    ruleId: matched.rule.id,
    confidence: matched.hit.confidence,
    evidence: matched.hit.evidence,
    why: matched.hit.why,
    notRetriaged: false
  });
}

if (unmatched.length) {
  console.error(`${unmatched.length} row(s) matched no rule. A row that falls through to a default is a question filed where it hides, so this is a failure.`);
  for (const r of unmatched.slice(0, 10)) console.error(`  #${r.number} ${r.jurisdiction} ${r.routeKey}`);
  process.exit(1);
}

// Every ALREADY_ANSWERED row must cite a record, and the record must exist here.
const asserted = assignments.filter((a) => a.bucket === "ALREADY_ANSWERED");
const uncited = asserted.filter((a) => !a.evidence.recordId || a.evidence.recordExistsInThisTree !== true);
if (uncited.length) {
  console.error(`${uncited.length} ALREADY_ANSWERED row(s) cite no record that exists in this tree. An asserted answer no record backs silently closes a question nobody decided.`);
  for (const a of uncited) console.error(`  #${a.number} ${a.routeKey}`);
  process.exit(1);
}
const undirected = assignments.filter((a) => a.bucket === "DUPLICATE_OR_SUPERSEDED" && !a.evidence.duplicatesRouteKey && !a.evidence.supersededBy);
if (undirected.length) {
  console.error(`${undirected.length} DUPLICATE_OR_SUPERSEDED row(s) name nothing that replaces them. A row removed without naming what replaces it is a question deleted, not answered.`);
  for (const a of undirected) console.error(`  #${a.number} ${a.routeKey}`);
  process.exit(1);
}

// ---- counts against Roger's targets ------------------------------------------
const TARGETS = queueV2.remainingEightyTwo.targetRouting;
const counts = {};
for (const k of Object.keys(BUCKETS)) counts[k] = 0;
for (const a of assignments) if (a.bucket !== "TRUE_COUNSEL_DECISION") counts[a.bucket] += 1;

const againstTargets = Object.fromEntries(Object.keys(TARGETS).map((k) => [k, {
  target: TARGETS[k], derived: counts[k], difference: counts[k] - TARGETS[k]
}]));

const sourceWorkAnswers = assignments
  .filter((a) => a.bucket === "SOURCE_IDENTITY_QUESTION" && a.evidence.alreadySettledBySourceWork)
  .map((a) => ({
    number: a.number,
    routeKey: a.routeKey,
    settledBy: a.evidence.sourceWorkThatHasSinceLanded,
    means: "The source team's landed work names every document this row was waiting on. The row still belongs to the source team; it is answered rather than open."
  }));

const doc = {
  schemaVersion: "rcap-census-legal-review-retriage/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/retriage-legal-review-queue.mjs",
  question: "For each of the 82 legal-review rows that are not counsel decisions, which bucket does the row's own evidence put it in, and what exactly is that evidence?",
  supersedes: `${V1}/legal-review-triage.json`,
  controllingRecord: QUEUE_V2,
  authority: "Roger's routing instruction of 2026-08-30, as recorded in legal-review-queue-v2.json. The four counsel questions are pinned there by routeKey and are not retriaged here.",
  inputs: [QUEUE_V2, QUEUE, CENSUS, AUTHORITY, RECLASS, LEDGER, CROSSWALK, KIND_ADJ, RECONCILIATION, BATCH1, BATCH2, WORKLIST, `${INTAKE}/*.memo.json`],

  nothingWasFetched: "Every assignment is derived from committed bytes in this worktree. No decision was made, no legal question answered, no route opened.",
  bucketMeanings: BUCKETS,
  everyRowCarriesExactlyOne: "Rules are ordered and the first match wins. A row matching no rule fails the generator rather than falling through to a default.",
  whyTheCaptainsTriageUndercountedTheAnswers: "It looked for decision records in data/record-clearing/legal-decisions/ alone. The register that carries LD-CT-02, LD-DE-01, LD-KY-02, LD-SC-01 and sixty-three more decisions is src/lib/legal-authority/authority.json, and Roger's own signed classification changes are in data/rcap-ledger/sellable-pathway-reclassifications.json.",

  guardsAgainstTheTwoDangerousOutcomes: {
    againstAssertingAnUnbackedAnswer: [
      "A cited decision must resolve in a register in this tree and name this exact route key; the census's own association claim is re-derived, not trusted.",
      "A decision whose outputMode is a MIXED menu of treatments does not answer which treatment this route takes.",
      "A route-kind adjudication recorded as pending is not a decision; the register says so and this generator honours it.",
      "An unadopted closure contradiction carrying proposal-authority=null decides nothing and cannot close a row.",
      "The run fails if any ALREADY_ANSWERED row cites no record that exists in this tree."
    ],
    againstDeletingAQuestion: [
      "Duplication is derived from shared identity in the census -- same jurisdiction and obligation label, or same parent expansion and same question -- never from resemblance.",
      "Every duplicate names the exact row number and route key it duplicates.",
      "The run fails if any DUPLICATE_OR_SUPERSEDED row names nothing that replaces it."
    ]
  },

  counts,
  targets: TARGETS,
  againstTargets,
  targetsAreACheckNotAQuota: "Each row is assigned from its own evidence. Where the derived count differs from the target the difference is reported and the rows are named, rather than moved to make the arithmetic agree.",

  sourceIdentityQuestionsTheSourceWorkHasAlreadyAnswered: sourceWorkAnswers,

  whatThisDoesNotDo: [
    "It decides no legal question.",
    "It does not touch the four counsel questions, which are settled and pinned.",
    "It installs no synthesis register as controlling production authority; attorney ratification is not recorded.",
    "It opens no commercial route, approves no output and creates no fulfilment record.",
    "It does not implement the ALREADY_ANSWERED rows -- it identifies that they are answered and names the record the implementation must cite."
  ],

  rows: assignments
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale. Run the retriage.`); process.exit(1); }
  console.log(`legal-review retriage current: ${assignments.length} row(s), ${counts.ALREADY_ANSWERED} answered, ${counts.CAPTAIN_MAPPING_CORRECTION} mapping, ${counts.SOURCE_IDENTITY_QUESTION} source, ${counts.DUPLICATE_OR_SUPERSEDED} duplicate.`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
console.log("  86 rows: 4 pinned counsel questions untouched, 82 retriaged\n");
for (const [k, v] of Object.entries(againstTargets)) {
  const d = v.difference === 0 ? "on target" : `${v.difference > 0 ? "+" : ""}${v.difference} against target ${v.target}`;
  console.log(`    ${String(v.derived).padStart(3)}  ${k.padEnd(28)} ${d}`);
}
