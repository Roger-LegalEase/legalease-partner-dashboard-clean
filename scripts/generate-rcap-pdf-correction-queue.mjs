#!/usr/bin/env node
// The correction queue for the 26 correction-required families.
//
//   node scripts/generate-rcap-pdf-correction-queue.mjs
//   node scripts/generate-rcap-pdf-correction-queue.mjs --check
//
// "26 families need correction" is not a work queue. It is one generic task
// wearing twenty-six labels, and a lane that starts from it will fix whatever
// it happens to open first. This turns it into a queue: one root cause and one
// next action per family, each family in exactly one shard, and — the question
// that decides everything else — whether the correction belongs to the family
// or to a shared module that is frozen.
//
// That last split is what stops the obvious mistake. Twenty of these twenty-six
// findings come from four defects in shared code. Correcting them family by
// family would mean twenty local workarounds for four bugs, and the next
// re-render would undo every one.
//
// The queue is derived, never typed: the family list, the findings and the
// hashes all come from the frozen batch-1 records, and the executability of
// each action is measured against what this container actually has.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadReviewRecords } from "./rcap-official-forms/rcap-platform-ready.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REVIEWS_DIR = path.join(rootDir, "data/rcap-all50/pdf-independent-reviews");
const PACKETS = "data/rcap-all50/pdf-independent-reviews/correction-packets.json";
const EVIDENCE_DIR = "docs/record-clearing/pdf-visual-evidence";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const OUT_QUEUE = "data/rcap-all50/pdf-independent-reviews/correction-queue.json";
const OUT_ESCALATIONS = "data/rcap-all50/pdf-independent-reviews/shared-module-escalations.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/correction-queue.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fail(message) {
  console.error(`FAIL PDF correction queue — ${message}`);
  process.exit(1);
}

/**
 * Who owns each root cause, and what the next action is.
 *
 * `owner` is the only field that decides whether a family can be worked now.
 * A shared-module cause has no family-owned correction at all — writing one
 * would be the local workaround the freeze exists to prevent.
 */
const CAUSE_OWNERSHIP = {
  "RC-C-GEOMETRY-NOT-AN-INPUT": {
    owner: "shared_module",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs and scripts/implement-rcap-official-forms-d1.mjs",
    nextAction: "escalated: pass the widget rect and printed caption into decideBinding, then re-derive and re-render"
  },
  "RC-C-MANUAL-NOT-NEVER-WRITE": {
    owner: "shared_module",
    module: "scripts/implement-rcap-official-forms-d1.mjs and scripts/verify-rcap-official-forms-d1.mjs",
    nextAction: "escalated: add `manual` to NEVER_WRITE in the binder and the verifier"
  },
  "RC-M-NO-SSN-RULE": {
    owner: "shared_module",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    nextAction: "escalated: add an SSN protect rule"
  },
  "RC-M-NO-REFUSE-WHEN": {
    owner: "shared_module",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    nextAction: "escalated: add refuseWhen guards to street_address and full_legal_name"
  },
  "RC-M-SERVICE-BLOCK-BY-NAME": {
    owner: "shared_module",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    nextAction: "escalated: fire service_block from the printed heading, not the field name"
  },
  "RC-G-CAPTION-VARIANTS": {
    owner: "shared_module",
    module: "scripts/implement-rcap-official-forms-d1.mjs and the shared content-stream geometry module",
    nextAction: "escalated: bind one field per caption slot; suppress unfilled dropdown prompts at flatten"
  },
  "RC-V-VALUE-NOT-VISIBLE": {
    owner: "shared_module",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    nextAction: "escalated: capture the printed label into effectiveLabel"
  },
  "RC-P-SIDECAR-NONCONFORMANT": {
    owner: "shared_module",
    module: "scripts/rcap-official-forms/rcap-artifact-provenance.mjs",
    nextAction: "escalated: emit all 20 contract fields, and point the contract verifier at a committed sidecar"
  },
  "RC-B-NO-APPROVAL-CHANNEL": {
    owner: "cleared",
    module: "scripts/rcap-official-forms/rcap-platform-ready.mjs",
    nextAction: "done at 080c2013 — the gate reads canonical review records"
  },
  "RC-S-REVISION-DRIFT": {
    owner: "family",
    module: null,
    nextAction: "re-render the stale fixtures against the current source and hand the new hashes to the reviewer"
  },
  "RC-S-IDENTITY-UNRESOLVED": {
    owner: "source_lane",
    module: null,
    nextAction: "hold: no technical correction until the source lane returns a verified identity, revision, SHA and receipt"
  },
  "RC-E-VISUAL-EVIDENCE-ABSENT": {
    owner: "family",
    module: null,
    nextAction: "rasterize the family's committed contact sheet to its evidence path through the canonical writer"
  }
};

/** Jurisdiction → shard. Related caption work stays together; no family is in two shards. */
const SHARDS = {
  1: ["KY", "AK"],
  2: ["NC", "VA", "WI"],
  3: ["NE", "VT"]
};

const shardFor = (jurisdiction) => {
  for (const [shard, jurisdictions] of Object.entries(SHARDS)) {
    if (jurisdictions.includes(jurisdiction)) return Number(shard);
  }
  return null;
};

// ---------------------------------------------------------------------------

const packets = readJson(PACKETS);
const corpusIndex = readJson(CORPUS_INDEX);
const { byFamily } = loadReviewRecords(REVIEWS_DIR);

const corpusMounted = [
  process.env.OFFICIAL_FORMS_SOURCE_DIR || null,
  path.join(rootDir, "private/source-imports"),
  path.join(rootDir, "private/Nationwide Record Clearing")
].some((candidate) => candidate && fs.existsSync(candidate));

/** Every family's source bytes, if this container can read them at all. */
function sourceReadableAt(familyId, frozen) {
  if (!frozen?.sourceSha256) return null;
  // A committed receipt is the only place a source binary lives in this clone.
  const receipts = path.join(rootDir, "data/rcap-codex/remaining-tracks/source-receipts");
  if (fs.existsSync(receipts)) {
    for (const file of fs.readdirSync(receipts)) {
      const candidate = path.join(receipts, file);
      if (fs.statSync(candidate).isFile() && sha256File(candidate) === frozen.sourceSha256) {
        return path.relative(rootDir, candidate);
      }
    }
  }
  return null;
}

const rows = [];
const isolated = [];
for (const packet of packets.packets) {
  // Instruction 7: the source-identity family is held apart from the technical
  // corrections entirely. Touching its artifacts before the source lane
  // returns a verified identity would be correcting a document whose
  // provenance nobody can yet state.
  if (packet.verdict === "source_identity_unresolved") {
    isolated.push({
      familyId: packet.familyId,
      jurisdiction: packet.jurisdiction,
      familyPath: packet.familyPath,
      verdict: packet.verdict,
      finding: packet.finding,
      heldPendingFromTheSourceLane: [
        "verified official identity",
        "revision",
        "source SHA-256",
        "source receipt",
        "canonical source path"
      ],
      doNotCorrect: "No technical correction is permitted on this family until all five arrive."
    });
    continue;
  }
  if (packet.verdict !== "correction_required") continue;

  const records = byFamily.get(packet.familyId) ?? [];
  const frozen = records[records.length - 1]?.family ?? null;
  const jurisdiction = packet.jurisdiction;

  const causes = [...packet.rootCauseIds];

  // A cause the review named in prose but the packet did not carry as an id:
  // the rendered visual evidence the contract asks for is simply not on disk
  // for most of the batch. Measured here rather than asserted.
  const evidenceRel = frozen
    ? path.join(EVIDENCE_DIR, `${jurisdiction}-${frozen.familySlug}-contact-sheet-page-01.png`)
    : null;
  const evidencePresent = evidenceRel ? fs.existsSync(abs(evidenceRel)) : false;
  if (!evidencePresent) causes.push("RC-E-VISUAL-EVIDENCE-ABSENT");

  const ownerships = causes.map((cause) => CAUSE_OWNERSHIP[cause] ?? fail(`no ownership for ${cause}`));
  const blocking = causes.filter((cause) => CAUSE_OWNERSHIP[cause].owner === "shared_module");
  const familyOwned = causes.filter((cause) => CAUSE_OWNERSHIP[cause].owner === "family");
  const sourceLane = causes.filter((cause) => CAUSE_OWNERSHIP[cause].owner === "source_lane");

  // The single cause that decides this family's next action. A shared defect
  // outranks a family-owned one: correcting the family's evidence while its
  // participant mapping is still wrong produces a prettier picture of a wrong
  // document.
  const decidingCause = blocking[0] ?? sourceLane[0] ?? familyOwned[0] ?? causes[0];
  const owner = CAUSE_OWNERSHIP[decidingCause].owner;

  const sourceAt = sourceReadableAt(packet.familyId, frozen);
  const rerenderable = Boolean(sourceAt || corpusMounted);

  rows.push({
    shard: shardFor(jurisdiction),
    familyId: packet.familyId,
    jurisdiction,
    assetId: frozen?.documentId ?? null,
    familyPath: packet.familyPath,
    verdict: packet.verdict,
    sourceSha256: frozen?.sourceSha256 ?? null,
    currentArtifactSha256: packet.frozenArtifactSha256,
    rootCauseIds: causes,
    decidingCause,
    owner,
    correctionClass: owner === "shared_module"
      ? "canonical_shared_module"
      : owner === "family"
        ? (familyOwned.includes("RC-E-VISUAL-EVIDENCE-ABSENT") && familyOwned.length === 1
          ? "family_correction_evidence"
          : "family_artifact")
        : owner,
    nextAction: CAUSE_OWNERSHIP[decidingCause].nextAction,
    // What the reviewer actually wrote. Carried through verbatim so the lane
    // that does the work reads the measurement, not a summary of it.
    finding: packet.finding,
    evidencePaths: packet.evidencePaths,
    renderedEvidence: evidenceRel,
    renderedEvidencePresent: evidencePresent,
    sourceReadableAt: sourceAt,
    rerenderableHere: rerenderable,
    executableHere: owner === "family"
      && (familyOwned.includes("RC-E-VISUAL-EVIDENCE-ABSENT") ? true : rerenderable)
      && blocking.length === 0,
    blockedBy: blocking.length
      ? `${blocking.length} shared-module cause(s): ${blocking.join(", ")}`
      : (owner === "source_lane" ? "the source lane" : null)
  });
}

rows.sort((a, b) => a.shard - b.shard || a.familyId.localeCompare(b.familyId));

// Every family in exactly one shard, and every shard disjoint.
const seen = new Set();
for (const row of rows) {
  if (!row.shard) fail(`${row.familyId} has no shard`);
  if (seen.has(row.familyId)) fail(`${row.familyId} appears in the queue twice`);
  seen.add(row.familyId);
}
if (rows.length !== packets.totals.correctionRequired) {
  fail(`the queue holds ${rows.length} families and the review found ${packets.totals.correctionRequired}`);
}

const byCause = {};
for (const row of rows) {
  byCause[row.decidingCause] = byCause[row.decidingCause] ?? {
    ...CAUSE_OWNERSHIP[row.decidingCause],
    cause: row.decidingCause,
    families: []
  };
  byCause[row.decidingCause].families.push(row.familyId);
}

const queue = {
  schemaVersion: "rcap-pdf-correction-queue/v1",
  generatedBy: "scripts/generate-rcap-pdf-correction-queue.mjs",
  purpose:
    "One root cause and one next action per correction-required family, in three disjoint shards, with the family-owned work separated from the shared-module work that is frozen.",
  consumedRecords: {
    batch: "batch-1",
    manifest: "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json",
    groups: [1, 2, 3].map((g) => `data/rcap-all50/pdf-independent-reviews/batch-1-group-${g}.review.json`),
    rollup: "data/rcap-all50/pdf-independent-reviews/batch-1-verdicts.json",
    packets: PACKETS
  },
  theSplitThatDecidesTheWork: {
    statement:
      "20 of the 26 families are blocked by a shared-module cause. Their family-owned files are not wrong; the code that writes them is. Correcting them locally would be 20 workarounds for 4 bugs, and the next re-render would erase all 20.",
    sharedModulesAreFrozen: true,
    consequence: "Those families get an escalation, not an edit."
  },
  environment: {
    corpusMounted,
    sourcesReadableInThisClone: rows.filter((r) => r.sourceReadableAt).length,
    rasterizerAvailable: fs.existsSync(process.env.RCAP_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium"),
    whyThatMatters:
      "A family-owned artifact correction means re-rendering, and re-rendering needs the source bytes. Rasterizing a committed contact sheet does not, which is why the visual-evidence correction is workable here and the mapping corrections are not."
  },
  isolatedFromTheQueue: isolated,
  totals: {
    families: rows.length,
    isolatedSourceIdentityFamilies: isolated.length,
    shards: Object.keys(SHARDS).length,
    byShard: Object.fromEntries(Object.keys(SHARDS).map((s) => [s, rows.filter((r) => r.shard === Number(s)).length])),
    blockedBySharedModule: rows.filter((r) => r.owner === "shared_module").length,
    familyOwned: rows.filter((r) => r.owner === "family").length,
    executableHere: rows.filter((r) => r.executableHere).length,
    renderedEvidenceAbsent: rows.filter((r) => !r.renderedEvidencePresent).length,
    distinctDecidingCauses: Object.keys(byCause).length
  },
  decidingCauses: byCause,
  rows
};

/**
 * One escalation per proven shared defect.
 *
 * Each names the module, what it does now, what it has to do, which families
 * are waiting, the mutation that should fail until it is fixed, and why no
 * family-owned edit can substitute. That last field is the one that matters:
 * without it an escalation reads as a preference.
 */
const ESCALATIONS = [
  {
    id: "ESC-GEOMETRY-NOT-AN-INPUT",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs, scripts/implement-rcap-official-forms-d1.mjs",
    currentBehaviour:
      "decideBinding() receives { name, pdfType, effectiveLabel } and effectiveLabel is undefined for every field of every family, so `subject = effectiveLabel ?? name` resolves to the internal AcroForm field name. Widget rects are captured into field-census.json and never passed. Geometry is not an input to protection.",
    requiredBehaviour:
      "The widget rect and the printed caption above it are inputs to decideBinding, and a binding whose rect falls inside a court-owned page region is refused whatever the field is called.",
    mutationThatShouldFail:
      "Rename a protected field to an innocuous name and re-derive: the binder must still refuse it on geometry.",
    whyNoFamilyCorrectionSolvesIt:
      "The field maps are generated. A hand-edited map is overwritten by the next re-derivation, and hand-editing 20 of them would leave the defect live for every family added afterwards."
  },
  {
    id: "ESC-MANUAL-NOT-NEVER-WRITE",
    module: "scripts/implement-rcap-official-forms-d1.mjs:151, scripts/verify-rcap-official-forms-d1.mjs:206",
    currentBehaviour:
      "NEVER_WRITE is { prohibited, protected, signature, court_or_agency, outside_party }. `manual` is absent from both sets, so a field the classifier declined to classify can still be bound and written, and the verifier carries the identical omission so it cannot catch what the binder allowed.",
    requiredBehaviour: "`manual` is in NEVER_WRITE in both the binder and the verifier.",
    mutationThatShouldFail:
      "Classify a field `manual` and bind it: the binder must refuse, and the verifier must fail if it did not.",
    whyNoFamilyCorrectionSolvesIt:
      "The classification is correct — the field really is manual. What is wrong is that `manual` is not treated as unwritable, which is one constant in shared code."
  },
  {
    id: "ESC-NO-SSN-RULE",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    currentBehaviour:
      "PROTECT_RULES carries no SSN pattern, so a Defendant's SSN box is an ordinary writable field and takes the participant's full legal name.",
    requiredBehaviour: "\\bssn\\b|social\\s*security is a protect rule.",
    mutationThatShouldFail: "Offer full_legal_name to a field named `Def.VitalStats.SSN`: it must be refused.",
    whyNoFamilyCorrectionSolvesIt:
      "Three families hit this today and every future family with an SSN box hits it tomorrow. A local refusal in three field maps leaves the rule missing."
  },
  {
    id: "ESC-NO-REFUSE-WHEN",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    currentBehaviour:
      "Descriptor matchers are positive-only. street_address matches a City box and a bank-name box; full_legal_name matches an attorney-name line and a street line. The first pattern that hits wins, so the address prints twice and the petitioner is named as their own attorney.",
    requiredBehaviour:
      "Descriptors carry refuseWhen guards: street_address declines city/state/zip subjects, full_legal_name declines street and bank subjects.",
    mutationThatShouldFail:
      "Offer street_address to a field named `Def.Address.City`: it must be refused rather than matched.",
    whyNoFamilyCorrectionSolvesIt:
      "The guard belongs to the descriptor, which is shared. Eight families would each need the same local exception."
  },
  {
    id: "ESC-SERVICE-BLOCK-BY-NAME",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    currentBehaviour:
      "The service_block protect rule matches /certificate\\s*of\\s*service/ against the field NAME, while deterministic.filing_date matches /cert\\s*date/. A field called certDate under a printed 'Certificate of Service' heading is therefore filled by the platform, producing a half-completed sworn certification of service dated by a system that does not know when service occurred.",
    requiredBehaviour:
      "service_block fires from the block's printed heading, or cert-date is removed from the filing_date matcher.",
    mutationThatShouldFail: "Offer filing_date to `certDate` under a service heading: it must be refused.",
    whyNoFamilyCorrectionSolvesIt:
      "This is a sworn statement. A per-family suppression that a re-render can undo is not an acceptable control for it."
  },
  {
    id: "ESC-CAPTION-VARIANTS",
    module: "scripts/implement-rcap-official-forms-d1.mjs and the shared content-stream geometry module",
    currentBehaviour:
      "Every widget in a multi-purpose caption band is bound. After flattening, variants that JavaScript used to show and hide all render at once, overlapping, covering the court's own printed words, and unfilled dropdowns keep their prompt text ('Choose the court') as ink on a filed pleading.",
    requiredBehaviour:
      "Exactly one field per caption slot is bound and the rest refused; an unfilled dropdown's prompt is suppressed at flatten.",
    mutationThatShouldFail:
      "Flatten a form with an unselected dropdown: the prompt string must not appear in the page content stream.",
    whyNoFamilyCorrectionSolvesIt:
      "Five Nebraska families share one caption block. The selection rule is in the binder, not in any of their maps."
  },
  {
    id: "ESC-VALUE-NOT-VISIBLE",
    module: "scripts/rcap-official-forms/rcap-field-semantics.mjs",
    currentBehaviour:
      "VT 600-00228 names its fields as bare digits. With only the name channel available every descriptor refuses no_allowlisted_fact_matches, and the finished fee-waiver application carries none of the applicant's information.",
    requiredBehaviour: "The printed label is captured into effectiveLabel and matched.",
    mutationThatShouldFail:
      "Offer full_legal_name to a field named `2` sitting under a printed 'Name' caption: it must bind, not refuse.",
    whyNoFamilyCorrectionSolvesIt:
      "explicitFieldMappings for 15 numbered fields is exactly the local workaround the freeze forbids, and it is the same missing channel as ESC-GEOMETRY-NOT-AN-INPUT seen from the other side."
  },
  {
    id: "ESC-SIDECAR-NONCONFORMANT",
    module: "scripts/rcap-official-forms/rcap-artifact-provenance.mjs, scripts/verify-rcap-shared-pdf-contract.mjs",
    currentBehaviour:
      "0 of 27 committed sidecars carry the 20 fields the shared contract requires; 12 fields are null in a typical one. The contract's verifier proves its P-block against a sidecar it synthesises from a canary and never opens a committed one, so nothing had compared them.",
    requiredBehaviour:
      "The provenance module emits all 20 fields, and the contract verifier reads a committed sidecar.",
    mutationThatShouldFail: "Null one field in a committed sidecar: the contract verifier must go red.",
    whyNoFamilyCorrectionSolvesIt:
      "Hand-populating 27 sidecars would satisfy the count and leave the emitter and its verifier both wrong, so the 28th would be non-conformant again."
  }
];

/** Each shared-module root cause has exactly one escalation. */
const ESCALATION_FOR_CAUSE = {
  "RC-C-GEOMETRY-NOT-AN-INPUT": "ESC-GEOMETRY-NOT-AN-INPUT",
  "RC-C-MANUAL-NOT-NEVER-WRITE": "ESC-MANUAL-NOT-NEVER-WRITE",
  "RC-M-NO-SSN-RULE": "ESC-NO-SSN-RULE",
  "RC-M-NO-REFUSE-WHEN": "ESC-NO-REFUSE-WHEN",
  "RC-M-SERVICE-BLOCK-BY-NAME": "ESC-SERVICE-BLOCK-BY-NAME",
  "RC-G-CAPTION-VARIANTS": "ESC-CAPTION-VARIANTS",
  "RC-V-VALUE-NOT-VISIBLE": "ESC-VALUE-NOT-VISIBLE",
  "RC-P-SIDECAR-NONCONFORMANT": "ESC-SIDECAR-NONCONFORMANT"
};

for (const cause of Object.keys(CAUSE_OWNERSHIP)) {
  if (CAUSE_OWNERSHIP[cause].owner !== "shared_module") continue;
  if (!ESCALATION_FOR_CAUSE[cause]) fail(`the shared cause ${cause} has no escalation`);
}

for (const escalation of ESCALATIONS) {
  escalation.affectedFamilies = rows
    .filter((row) => row.rootCauseIds.some((cause) => ESCALATION_FOR_CAUSE[cause] === escalation.id))
    .map((row) => row.familyId);
  if (!escalation.affectedFamilies.length) fail(`${escalation.id} names a defect no family is waiting on`);
}

const escalations = {
  schemaVersion: "rcap-pdf-shared-module-escalation/v1",
  generatedBy: "scripts/generate-rcap-pdf-correction-queue.mjs",
  purpose:
    "The shared PDF modules are frozen and these are the defects that live in them. One escalation each, naming the module, the current behaviour, the required behaviour, the families waiting, the mutation that should fail, and why no family-owned edit substitutes.",
  handTo: "claude/rcap-problematic-pdf-full-remediation",
  freezeRespected: "This lane wrote no shared-module change and no family-local workaround for any of these.",
  totals: {
    escalations: ESCALATIONS.length,
    familiesWaiting: rows.filter((r) => r.owner === "shared_module").length
  },
  escalations: ESCALATIONS
};

// ---------------------------------------------------------------------------

function markdown() {
  const lines = [];
  lines.push("# RCAP PDF correction queue");
  lines.push("");
  lines.push(`${queue.totals.families} correction-required families, ${queue.totals.distinctDecidingCauses} deciding causes, ${queue.totals.shards} disjoint shards.`);
  lines.push("");
  lines.push(queue.theSplitThatDecidesTheWork.statement);
  lines.push("");
  lines.push("## Deciding cause");
  lines.push("");
  lines.push("| cause | owner | families |");
  lines.push("| --- | --- | ---: |");
  for (const [cause, body] of Object.entries(byCause)) {
    lines.push(`| ${cause} | ${body.owner} | ${body.families.length} |`);
  }
  lines.push("");
  lines.push("## Shards");
  lines.push("");
  for (const shard of Object.keys(SHARDS)) {
    const members = rows.filter((r) => r.shard === Number(shard));
    lines.push(`### Shard ${shard} — ${SHARDS[shard].join(", ")} (${members.length})`);
    lines.push("");
    lines.push("| family | deciding cause | owner | executable here | next action |");
    lines.push("| --- | --- | --- | :-: | --- |");
    for (const row of members) {
      lines.push(`| ${row.familyId} | ${row.decidingCause} | ${row.owner} | ${row.executableHere ? "yes" : "no"} | ${row.nextAction} |`);
    }
    lines.push("");
  }
  lines.push("## Shared-module escalations");
  lines.push("");
  for (const escalation of ESCALATIONS) {
    lines.push(`### ${escalation.id}`);
    lines.push("");
    lines.push(`**Module** — ${escalation.module}`);
    lines.push("");
    lines.push(`**Now** — ${escalation.currentBehaviour}`);
    lines.push("");
    lines.push(`**Required** — ${escalation.requiredBehaviour}`);
    lines.push("");
    lines.push(`**Mutation that should fail** — ${escalation.mutationThatShouldFail}`);
    lines.push("");
    lines.push(`**Why no family-owned correction solves it** — ${escalation.whyNoFamilyCorrectionSolvesIt}`);
    lines.push("");
    if (escalation.affectedFamilies.length) {
      lines.push(`**Families waiting** — ${escalation.affectedFamilies.join(", ")}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

const outputs = [
  [OUT_QUEUE, `${JSON.stringify(queue, null, 2)}\n`],
  [OUT_ESCALATIONS, `${JSON.stringify(escalations, null, 2)}\n`],
  [OUT_MD, markdown()]
];

let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-correction-queue.mjs`);

console.log(
  `OK PDF correction queue — ${queue.totals.families} families in ${queue.totals.shards} shards; ` +
    `${queue.totals.blockedBySharedModule} blocked by ${ESCALATIONS.length} shared-module escalations, ` +
    `${queue.totals.familyOwned} family-owned, ${queue.totals.executableHere} executable in this container`
);
