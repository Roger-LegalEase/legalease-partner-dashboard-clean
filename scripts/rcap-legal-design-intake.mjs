// Legal-design intake: validate, normalize and queue.
//
// Scans the intake directory for `<CODE>.memo.json`, validates each memo
// against the fifteen required fields, normalizes the implementable tracks into
// registry records, packet-set manifests, source relationships and per-strategy
// specifications, and writes the implementation queue.
//
// An invalid memo fails this script. That is the point: incomplete imports are
// rejected rather than partially applied, because a half-imported legal rule is
// worse than none.
//
// Importing enables nothing. Every normalized track is runtime_disabled.
//
// The specifications this writes separate what LegalEase must produce from what
// the participant must do. `participantActionRequired` and `requiredBeforeFiling`
// carry the second, and neither is a condition of generating the first.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { validateLegalDesignMemo } = await import("@/lib/rcap/legal-design/validate");
const { normalizeMemo, sourceRelationships, readinessCeilingFor } = await import(
  "@/lib/rcap/legal-design/normalize"
);
const { GUIDANCE_REREVIEW_QUESTION } = await import("@/lib/rcap/legal-design/types");
const { gateRuntimeStatus } = await import("@/lib/rcap/legal-design/master-library-authority");
const { ALL_JURISDICTION_CODES } = await import("@/lib/rcap/jurisdictions/packet-capability");

const root = process.cwd();
const INTAKE_DIR = path.join(root, "data/record-clearing/legal-design-intake");
const OUT_DIR = path.join(root, "data/record-clearing");
const TRANCHE_DIR = path.join(root, "data/record-clearing/implementation-tranches");
const GUIDANCE_SPEC_DIR = path.join(
  root,
  "data/record-clearing/production-factory/guidance-specifications"
);

/**
 * Authored guidance specifications for process-guidance COMPONENTS of a
 * custom-pleading track.
 *
 * Guidance is otherwise specified per guidance track and per guidance unit of a
 * composed route. A custom-pleading track can also carry guidance components —
 * a records checklist and filing instructions — and that shape matched neither
 * rule, so every such component reported no governing specification and blocked
 * its whole track. The gate is closed by drafting the specification, never by
 * emitting an empty one: a track whose checklist and instructions nobody has
 * written stays blocked, which is the honest answer.
 */
function authoredComponentGuidance() {
  const specifications = [];

  if (fs.existsSync(TRANCHE_DIR)) {
    for (const name of fs
      .readdirSync(TRANCHE_DIR)
      .filter((entry) => entry.endsWith("-component-guidance.json"))
      .sort()) {
      const file = JSON.parse(fs.readFileSync(path.join(TRANCHE_DIR, name), "utf8"));
      for (const entry of file.specifications ?? []) {
        specifications.push({ ...entry, trancheId: file.trancheId });
      }
    }
  }

  if (fs.existsSync(GUIDANCE_SPEC_DIR)) {
    for (const name of fs
      .readdirSync(GUIDANCE_SPEC_DIR)
      .filter((entry) => entry.endsWith(".json"))
      .sort()) {
      const filePath = path.join(GUIDANCE_SPEC_DIR, name);
      const file = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const entry = file.specification;
      const sourcePath = path.relative(root, filePath);

      if (
        file.schemaVersion !== 1 ||
        !entry ||
        file.outputStrategy !== "process_guidance" ||
        entry.guidanceStatus !== "drafted" ||
        entry.jurisdiction !== file.jurisdiction ||
        entry.trackId !== file.trackId ||
        entry.componentId !== file.componentId
      ) {
        throw new Error(
          `${sourcePath}: invalid authored component-guidance specification or mismatched identity.`
        );
      }

      specifications.push({
        ...entry,
        componentIds: [entry.componentId],
        specificationId: file.specificationId,
        specificationSource: sourcePath,
        authorityEdition: file.authorityEdition
      });
    }
  }

  const componentOwners = new Map();
  for (const specification of specifications) {
    for (const componentId of specification.componentIds ?? []) {
      const existing = componentOwners.get(componentId);
      if (existing) {
        throw new Error(
          `Guidance component ${componentId} is authored more than once: ${existing} and ${
            specification.specificationSource ?? specification.trancheId
          }.`
        );
      }
      componentOwners.set(
        componentId,
        specification.specificationSource ?? specification.trancheId ?? "unknown source"
      );
    }
  }

  return specifications;
}

const COMPONENT_GUIDANCE = authoredComponentGuidance();

/**
 * SHA-256 pins for official-form components an implementation tranche has
 * resolved to exactly one retained Master Library asset.
 *
 * A normalized memo names a component's form ID and source URL but carries no
 * hash, so every official-form component is generated unpinned and the edition's
 * matching-hash requirement can never be met from the memo alone. A tranche that
 * has actually resolved a component to one retained asset records the hash in
 * its authority pins; this reads those pins back so the generated relationship
 * carries them and regeneration stays stable.
 *
 * It is deliberately narrow. A pin is applied only where the tranche names the
 * same track, the same component and the same source URL the memo names — a pin
 * that disagrees with the memo about which document this is would be a source
 * substitution, and is ignored rather than allowed to win.
 */
function authoredSourcePins() {
  if (!fs.existsSync(TRANCHE_DIR)) return new Map();
  const pins = new Map();
  for (const name of fs.readdirSync(TRANCHE_DIR).filter((entry) => entry.endsWith("-authority-pins.json"))) {
    const file = JSON.parse(fs.readFileSync(path.join(TRANCHE_DIR, name), "utf8"));
    for (const pin of file.sourceRelationshipPinsWritten ?? []) {
      pins.set(`${pin.trackId}::${pin.componentId}`, { ...pin, trancheId: file.trancheId });
    }
  }
  return pins;
}

const SOURCE_PINS = authoredSourcePins();

function applySourcePin(relationship) {
  const pin = SOURCE_PINS.get(`${relationship.trackId}::${relationship.componentId}`);
  if (!pin) return relationship;
  if (pin.officialSourceUrl !== relationship.officialSourceUrl) return relationship;
  if (pin.officialFormId && pin.officialFormId !== relationship.officialFormId) return relationship;
  return { ...relationship, sha256: pin.sha256, corpusState: pin.corpusState ?? relationship.corpusState };
}

const strict = !process.argv.includes("--report-only");

if (strict) fs.mkdirSync(INTAKE_DIR, { recursive: true });

const memoFiles = (fs.existsSync(INTAKE_DIR) ? fs.readdirSync(INTAKE_DIR) : [])
  .filter((name) => /^[A-Z]{2}\.memo\.json$/.test(name))
  .sort();

const errors = [];
const validated = [];
const rejected = [];

for (const fileName of memoFiles) {
  const code = fileName.slice(0, 2);
  const filePath = path.join(INTAKE_DIR, fileName);

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    rejected.push({ jurisdiction: code, file: fileName, issues: [`Memo is not valid JSON: ${error.message}`] });
    errors.push(`${fileName}: not valid JSON`);
    continue;
  }

  const result = validateLegalDesignMemo(parsed);

  if (result.jurisdiction && result.jurisdiction !== code) {
    result.issues.push({
      severity: "error",
      jurisdiction: code,
      trackId: null,
      field: "jurisdiction",
      message: `Memo declares ${result.jurisdiction} but the file is named ${fileName}.`
    });
  }

  const hardIssues = result.issues.filter((issue) => issue.severity === "error");
  if (hardIssues.length > 0 || result.jurisdiction !== code) {
    rejected.push({
      jurisdiction: code,
      file: fileName,
      issues: hardIssues.map((issue) => `${issue.trackId ? `${issue.trackId}: ` : ""}${issue.field} — ${issue.message}`)
    });
    errors.push(`${fileName}: ${hardIssues.length} validation error(s)`);
    continue;
  }

  validated.push({ code, memo: parsed, result });
}

// Normalize only what validated cleanly.
const normalizedMemos = validated.map(({ memo }) => normalizeMemo(memo));
const allTracks = normalizedMemos.flatMap((memo) => memo.tracks);
const allRelationships = normalizedMemos.flatMap((memo) => sourceRelationships(memo)).map(applySourcePin);

const received = new Set(validated.map((entry) => entry.code));
const outstanding = ALL_JURISDICTION_CODES.filter((code) => !received.has(code));

// ---------------------------------------------------------------------------
// Master Library authority
// ---------------------------------------------------------------------------

// Readiness is now two questions, not one. `readinessCeilingFor` answers what a
// track would be if every platform gate passed; the Master Library authority
// gate answers whether the source it proposes to render is one the adopted
// edition authorises for that use. Both must pass.
//
// The gate fails closed. A missing or stale audit is not a pass — it means no
// track has been checked, and an unchecked track cannot be ready. The audit is
// written by `npm run rcap:reconcile-master-library`, which reads this
// registry, so the regeneration order is intake first, reconcile second.
const authorityAuditPath = "data/record-clearing/master-library/track-source-audit.json";
const authorityAudit = readAuthorityAudit();

function readAuthorityAudit() {
  const file = path.join(root, authorityAuditPath);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    edition: parsed.authorityEdition,
    byTrackId: new Map(parsed.tracks.map((track) => [track.trackId, track]))
  };
}

function gatedRuntimeStatusFor(track) {
  return gateRuntimeStatus(readinessCeilingFor(track), authorityAudit?.byTrackId.get(track.trackId));
}

const ungatedCeilings = allTracks.map((track) => readinessCeilingFor(track));
const gatedStatuses = allTracks.map((track) => gatedRuntimeStatusFor(track));
const countOf = (list, status) => list.filter((entry) => entry === status).length;
const authorityClearedTracks = allTracks.filter((track) =>
  Boolean(authorityAudit?.byTrackId.get(track.trackId)?.cleared)
).length;

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

const registryRecords = {
  schemaVersion: 1,
  planOfRecord: "docs/record-clearing/PLAN_OF_RECORD_RELIEF_TRACK_STRATEGY.md",
  note:
    "Imported from legal-design memos. Every track is runtime_disabled: design approval is not output approval, and packet_ready additionally requires source approval, technical proof, visual review, a current source and runtime enablement.",
  participantNote:
    "participantActionRequired and requiredBeforeFiling describe what the participant does after LegalEase hands them the packet. LegalEase does not collect, inspect or authenticate any of it, and none of it gates generation or packet_ready.",
  jurisdictionsReceived: validated.length,
  jurisdictionsOutstanding: outstanding.length,
  trackCount: allTracks.length,
  // Derived, not asserted, so that a change anywhere in the readiness or
  // authority chain shows up here instead of being contradicted by a
  // hard-coded zero.
  packetReadyCount: countOf(gatedStatuses, "packet_ready"),
  readinessCeiling: {
    note:
      "A ceiling is what a track could become if every platform gate passed — never what it is. Every imported track is runtime_disabled, no route is enabled, and nothing here promotes anything. The two rows show what the Master Library authority gate removes from the hypothetical.",
    packetReadyBeforeAuthorityGate: countOf(ungatedCeilings, "packet_ready"),
    packetReadyAfterAuthorityGate: countOf(gatedStatuses, "packet_ready"),
    guidanceReadyBeforeAuthorityGate: countOf(ungatedCeilings, "guidance_ready"),
    guidanceReadyAfterAuthorityGate: countOf(gatedStatuses, "guidance_ready"),
    removedByAuthorityGate:
      countOf(ungatedCeilings, "packet_ready") +
      countOf(ungatedCeilings, "guidance_ready") -
      countOf(gatedStatuses, "packet_ready") -
      countOf(gatedStatuses, "guidance_ready")
  },
  masterLibraryAuthority: {
    adoptedEdition: authorityAudit?.edition ?? null,
    auditPath: authorityAuditPath,
    auditPresent: authorityAudit !== null,
    tracksAuthorityCleared: authorityClearedTracks,
    tracksAuthorityBlocked: allTracks.length - authorityClearedTracks,
    note:
      "Track-level authority results live in the audit file, not in this registry: the Master Library is the source authority and this registry is a derived implementation of it. Authority clearance is a provenance result only — it never makes a track ready, and every gate in readinessCeilingFor still applies.",
    failClosed:
      "A track with no audit entry is treated as blocked. Absence of a check is not a pass."
  },
  tracks: allTracks
};

const packetSetManifests = {
  schemaVersion: 1,
  packetSets: allTracks.map((track) => ({
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    ...track.packetSet
  }))
};

const specifications = {
  schemaVersion: 1,
  customPleadingSpecs: allTracks.flatMap((track) =>
    track.packetSet.components
      .filter((component) => component.outputStrategy === "custom_pleading")
      .map((component) => ({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        componentId: component.componentId,
        role: component.role,
        venue: track.venue,
        authority: track.authority,
        rules: track.rules,
        generationRequirements: track.generationRequirements,
        packetInstructions: track.packetInstructions,
        manualCompletionItems: track.manualCompletionItems,
        participantActionRequired: track.packetSet.participantActionRequired,
        requiredBeforeFiling: track.packetSet.requiredBeforeFiling,
        stopConditions: track.selfHelpBoundaries,
        templateStatus: "not_drafted"
      }))
  ),
  officialFormAssignments: allTracks.flatMap((track) =>
    track.packetSet.components
      .filter((component) => component.outputStrategy === "official_pdf_fill")
      .map((component) => ({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        componentId: component.componentId,
        officialFormId: component.officialFormId,
        officialSourceUrl: component.officialSourceUrl,
        generationRequirements: track.generationRequirements,
        manualCompletionItems: track.manualCompletionItems,
        participantActionRequired: track.packetSet.participantActionRequired,
        requiredBeforeFiling: track.packetSet.requiredBeforeFiling,
        mappingStatus: "not_mapped"
      }))
  ),
  // Guidance is specified per output, not per track.
  //
  // A single-output guidance track contributes one spec. A composed route
  // contributes one spec per guidance unit, carrying that unit's ID: the
  // guidance stage of a staged route is real work that must be drafted, and it
  // does not stop being real because the route also has a filing stage. The
  // unitId is recorded because the guidance is only ever produced for an
  // explicitly selected unit.
  processGuidanceSpecs: allTracks.flatMap((track) => {
    const base = {
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      destination: track.destination,
      rules: track.rules,
      generationRequirements: track.generationRequirements,
      packetInstructions: track.packetInstructions,
      participantActionRequired: track.packetSet.participantActionRequired,
      requiredBeforeFiling: track.packetSet.requiredBeforeFiling,
      stopConditions: track.selfHelpBoundaries,
      guidanceStatus: "not_drafted"
    };
    if (track.outputStrategy === "process_guidance") {
      return [{ ...base, unitId: null, compositionMode: null, unitAvailable: true }];
    }

    // A custom-pleading or official-form track whose guidance components have an
    // authored specification contributes one spec naming those components.
    const authored = COMPONENT_GUIDANCE.filter((entry) => entry.trackId === track.trackId);
    const componentGuidance = authored.map((entry) => ({
      ...base,
      ...(Array.isArray(entry.componentIds) ? entry : {}),
      unitId: entry.unitId ?? null,
      compositionMode: entry.compositionMode ?? track.compositionMode ?? null,
      unitAvailable: entry.unitAvailable ?? true,
      componentIds: entry.componentIds,
      templateIds: entry.templateIds ?? [],
      scope: entry.scope ?? null,
      notAFiling: entry.notAFiling ?? null,
      trancheId: entry.trancheId ?? null,
      guidanceStatus: entry.guidanceStatus ?? "drafted"
    }));

    return componentGuidance.concat(track.units
      .filter((unit) => unit.outputStrategy === "process_guidance")
      .map((unit) => ({
        ...base,
        unitId: unit.unitId,
        unitLabel: unit.label,
        unitDescription: unit.description,
        compositionMode: track.compositionMode,
        // An unavailable unit is still specified, so the blocker is visible
        // rather than the work simply being absent.
        unitAvailable: unit.available,
        unavailableReason: unit.unavailableReason ?? null
      })));
  }),
  // Named here so nobody has to infer it from the shape of the specs above: a
  // document the participant obtains is listed, never demanded up front.
  participantFilingRequirements: allTracks.flatMap((track) =>
    track.participantFilingRequirements.map((document) => ({
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      ...document,
      collectedByLegalEase: false,
      inspectedByLegalEase: false,
      blocksGeneration: false
    }))
  )
};

const QUEUES = [
  ["A_official_pdf_acroform", "Official PDF fill, backed by a verified AcroForm"],
  ["B_official_pdf_overlay", "Official PDF fill, requiring a coordinate overlay"],
  ["C_custom_pleading", "Custom pleading"],
  ["D_composed_or_process_guidance", "Composed and process-guidance tracks"],
  ["E_local_variant", "Local, county, circuit, district and court-specific variants"],
  ["F_source_problem", "Missing, encrypted, XFA, stale or conflicting sources"]
];

const implementationQueue = {
  schemaVersion: 1,
  generatedFrom: "data/record-clearing/legal-design-intake",
  jurisdictionsReceived: validated.length,
  jurisdictionsOutstanding: outstanding.length,
  outstandingJurisdictions: outstanding,
  rejectedMemos: rejected,
  deferredTracks: normalizedMemos.flatMap((memo) =>
    memo.deferredTrackIds.map((trackId) => ({ jurisdiction: memo.jurisdiction, trackId }))
  ),
  batches: QUEUES.map(([id, label]) => {
    const tracks = allTracks.filter((track) => track.implementationQueue === id);
    return {
      batch: id,
      label,
      trackCount: tracks.length,
      tracks: tracks.map((track) => ({
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        publicName: track.publicName,
        outputStrategy: track.outputStrategy,
        geographicScope: track.geographicScope,
        legalDesignStatus: track.legalDesignStatus,
        legalStatus: track.legalStatus,
        runtimeStatus: "runtime_disabled",
        legalDesignBlockers: track.legalDesignBlockers,
        scopeRestrictions: track.scopeRestrictions,
        openLegalQuestions: track.openLegalQuestions,
        participantActionCount: track.packetSet.participantActionRequired.length,
        blockers: track.blockers
      }))
    };
  })
};

// ---------------------------------------------------------------------------
// Legal re-review queue for guidance tracks
//
// A track is a candidate only when every reason counsel gave for choosing
// guidance is an external dependency — someone else signs, an agency certifies,
// the participant fetches a record, a certificate is attached later, another
// body decides. None of those means we could not prepare the participant's part
// of a form and tell them how to get the rest.
//
// This queue asks counsel. It does not answer. No track is reclassified here,
// and a track carrying any preserved rationale is not listed at all.
// ---------------------------------------------------------------------------

const guidanceRereviewQueue = {
  schemaVersion: 1,
  question: GUIDANCE_REREVIEW_QUESTION,
  note:
    "Candidates only. Nothing here is reclassified by this script or by engineering. Counsel answers the question; a yes produces a revised memo, a no leaves the track on process guidance. Tracks whose rationale includes negotiation, individualized advocacy, a contested evidentiary showing, or no participant filing existing are deliberately absent.",
  candidateCount: 0,
  candidates: [],
  preserved: [],
  deliveryModelReconciliationCount: 0,
  deliveryModelReconciliations: []
};

for (const track of allTracks) {
  if (track.outputStrategy !== "process_guidance") continue;
  const row = {
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    publicName: track.publicName,
    guidanceRationales: track.guidanceRationales,
    destination: track.destination,
    participantFilingRequirements: track.participantFilingRequirements.map((document) => document.name),
    manualCompletionItems: track.manualCompletionItems.map((item) => item.item)
  };
  if (track.guidanceRereviewCandidate) {
    guidanceRereviewQueue.candidates.push({ ...row, question: GUIDANCE_REREVIEW_QUESTION, answer: null });
  } else {
    guidanceRereviewQueue.preserved.push({
      ...row,
      reason: "Carries a rationale that makes guidance the right output regardless of what we could prepare."
    });
  }
}
guidanceRereviewQueue.candidateCount = guidanceRereviewQueue.candidates.length;

// The Illinois intake retains two mutually exclusive delivery statements for
// the same route. Engineering cannot choose between them, and implementation
// proof does not make either one controlling. Keep the conflict as one bounded
// counsel-adoption row and fail closed until counsel adopts exactly one
// treatment for the hash-bound output.
const immediateSeal = allTracks.find(
  (track) => track.jurisdiction === "IL" && track.trackId === "il-immediate-seal"
);
if (!immediateSeal) {
  throw new Error("il-immediate-seal: track is absent; delivery-model reconciliation cannot be generated.");
}
const noFiling = immediateSeal.legalDesignLimitations.find((limitation) =>
  limitation.statement.startsWith("LegalEase does not generate a filing for this route.")
);
const attorneyHandoff = immediateSeal.legalDesignLimitations.find((limitation) =>
  limitation.statement.startsWith("Delivery is attorney-mediated.")
);

if (!noFiling || !attorneyHandoff) {
  throw new Error(
    "il-immediate-seal: the two retained delivery statements required for reconciliation are incomplete."
  );
}

guidanceRereviewQueue.deliveryModelReconciliations.push({
  jurisdiction: immediateSeal.jurisdiction,
  trackId: immediateSeal.trackId,
  publicName: immediateSeal.publicName,
  reconciliationType: "incompatible_delivery_statements",
  reviewStatus: "awaiting_counsel_adoption",
  releaseStatus: "blocked_pending_controlling_treatment",
  affectedElement: "participant_instructions",
  question:
    "Which treatment controls il-immediate-seal: no LegalEase filing, or a generated attorney-handoff petition for counsel to file during the same disposition hearing?",
  conflictingStatements: [
    {
      treatment: "guidance_only_no_legalease_filing",
      statement: noFiling.statement,
      provenance: noFiling.provenance
    },
    {
      treatment: "generated_attorney_handoff_packet",
      statement: attorneyHandoff.statement,
      provenance: attorneyHandoff.provenance
    }
  ],
  implementationRecommendation:
    "data/record-clearing/implementation-tranches/tranche-4-legal-output-recommendation.json#questionsForCounsel[attorney-handoff-delivery-model]",
  controllingTreatment: null,
  resolutionAuthority: "licensed_counsel",
  requiredResolution:
    "Counsel must adopt exactly one controlling delivery treatment. Adoption must identify the reviewed packet and legal-output hashes; a future changed output requires renewed adoption.",
  failClosedTreatment: {
    packetGeneration: "disabled_for_release",
    packetReady: false,
    runtimeStatus: "runtime_disabled",
    jurisdictionEnabled: false,
    productionEnabled: false
  }
});
guidanceRereviewQueue.deliveryModelReconciliationCount =
  guidanceRereviewQueue.deliveryModelReconciliations.length;

// ---------------------------------------------------------------------------
// Legal-research queue
//
// Tracks counsel marked legal_research_required. They are absent from every
// runtime artifact above — no registry record, no packet set, no specification,
// no implementation batch — so they are unreachable rather than disabled. This
// queue is where they stay visible, with everything counsel did establish.
// ---------------------------------------------------------------------------

const allDeferred = normalizedMemos.flatMap((memo) => memo.deferredTracks);

const legalResearchQueue = {
  schemaVersion: 1,
  note:
    "Deferred, not missing. Counsel has not identified the governing mechanism, whether the route exists, the correct output strategy, or the legally accepted filing vehicle. No strategy is invented to make the record importable. These tracks are absent from runtime resolution and unreachable; they are not runtime_disabled, because they were never registered.",
  deferredTrackCount: allDeferred.length,
  deferredTracks: allDeferred
};

// Report-only is a read of the current memo set, not a write of it. It has to
// stay byte-inert: a captain runs it to see what a candidate memo would do
// before deciding to accept the state, and a run that silently rewrote the
// shared registries would leave the worktree carrying an unreviewed derived
// change attributed to no commit. Write mode is unchanged.
const OUTPUTS = [
  ["legal-design-legal-research-queue.json", legalResearchQueue],
  ["legal-design-guidance-rereview-queue.json", guidanceRereviewQueue],
  ["legal-design-track-registry.json", registryRecords],
  ["legal-design-packet-set-manifests.json", packetSetManifests],
  [
    "legal-design-track-source-relationships.json",
    { schemaVersion: 1, relationships: allRelationships }
  ],
  ["legal-design-specifications.json", specifications],
  ["legal-design-implementation-queue.json", implementationQueue]
];

if (strict) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, value] of OUTPUTS) write(name, value);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("RCAP legal-design intake");
console.log(`1. Memos found: ${memoFiles.length}. Accepted: ${validated.length}. Rejected: ${rejected.length}.`);
console.log(`2. Jurisdictions outstanding: ${outstanding.length} of ${ALL_JURISDICTION_CODES.length}.`);
console.log(
  `3. Tracks imported: ${allTracks.length}. Deferred under legal_research_required: ${implementationQueue.deferredTracks.length}. Total accounted: ${allTracks.length + implementationQueue.deferredTracks.length}.`
);
console.log("4. Implementation batches:");
for (const batch of implementationQueue.batches) {
  console.log(`     ${batch.batch}: ${batch.trackCount} — ${batch.label}`);
}
console.log(`5. Custom-pleading specs: ${specifications.customPleadingSpecs.length}. Official-form assignments: ${specifications.officialFormAssignments.length}. Guidance specs: ${specifications.processGuidanceSpecs.length}.`);

const legalDesignBlockerCount = allTracks.reduce((total, track) => total + track.legalDesignBlockers.length, 0);
const participantActionCount = allTracks.reduce(
  (total, track) => total + track.packetSet.participantActionRequired.length,
  0
);
const supportingDocumentCount = specifications.participantFilingRequirements.length;
console.log(
  `6. Legal-design blockers: ${legalDesignBlockerCount}. Participant actions recorded: ${participantActionCount}, of which ${supportingDocumentCount} are documents the participant obtains and attaches.`
);
console.log("   None of those participant actions gates generation. LegalEase names them; the participant does them.");
console.log(
  `7. Deferred under legal_research_required: ${allDeferred.length}. Absent from runtime resolution and unreachable.`
);
console.log(`8. Tracks packet_ready: ${registryRecords.packetReadyCount}. Importing a memo enables nothing.`);
console.log(
  `9. Master Library authority: ${authorityAudit ? `Edition ${authorityAudit.edition}` : "audit absent — every track fails closed"}. Authority-cleared: ${authorityClearedTracks} of ${allTracks.length}. Readiness ceilings removed by the gate: ${registryRecords.readinessCeiling.removedByAuthorityGate}.`
);

if (!strict) {
  console.log("");
  console.log("Report-only: nothing was written. Write mode would regenerate:");
  for (const [name] of OUTPUTS) console.log(`     data/record-clearing/${name}`);
}

if (rejected.length > 0) {
  console.error("");
  console.error("REJECTED MEMOS — incomplete imports are refused, not partially applied:");
  for (const entry of rejected) {
    console.error(`  ${entry.file}:`);
    for (const issue of entry.issues.slice(0, 12)) console.error(`    - ${issue}`);
    if (entry.issues.length > 12) console.error(`    ... and ${entry.issues.length - 12} more`);
  }
}

if (strict && errors.length > 0) {
  console.error("");
  console.error(`Legal-design intake failed: ${errors.length} memo(s) rejected.`);
  process.exit(1);
}

function write(name, value) {
  fs.writeFileSync(path.join(OUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}
