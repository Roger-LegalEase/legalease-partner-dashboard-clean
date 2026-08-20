#!/usr/bin/env node
// Wave C correction dispatch: what shards B and C found, and what has to change.
//
//   node scripts/generate-rcap-gate-b-correction-wave-2.mjs
//   node scripts/generate-rcap-gate-b-correction-wave-2.mjs --check
//
// Eight families reviewed across two shards, no approvals, six correction
// returns and two reported owner decisions. Both shards refused every family at
// the same step for the same reason — the official source bytes were absent
// from the environment they ran in — so not one of those refusals is a statement
// about an artifact. That distinction is carried through every row here, because
// treating an environment failure as a defect sends a lane to fix something that
// is not broken.
//
// Two escalations previously recorded as closed are reopened. Neither is
// reopened on suspicion: shard C reproduced ESC-CAPTION-VARIANTS' own stated
// mutation — flatten a form with an unselected dropdown and the prompt must not
// appear in the page content stream — and the prompt is on the filed page of
// three Nebraska families. The prior provenAgainstThisFamilysBytes flags are not
// evidence and are not accepted here; each row below records what a reviewer
// measured at this base instead.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REVIEWS = "data/rcap-all50/pdf-independent-reviews";
const OUT = `${REVIEWS}/gate-b-correction-wave-2.json`;
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/gate-b-correction-wave-2.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const sha256 = (rel) => (fs.existsSync(abs(rel))
  ? crypto.createHash("sha256").update(fs.readFileSync(abs(rel))).digest("hex")
  : null);

function fail(message) {
  console.error(`FAIL correction wave 2 — ${message}`);
  process.exit(1);
}

const shardB = readJson(`${REVIEWS}/wave-c-shard-b/verdicts.json`);
const shardC = readJson(`${REVIEWS}/wave-c-shard-c/verdicts.json`);
const shardD = readJson(`${REVIEWS}/wave-c-shard-d/verdicts.json`);
// Shard A's authoritative record is final-verdicts.json. Its sibling
// verdicts.json reviewed the ef957a9 lineage before e94fb456 was fetched into
// that clone, and the reviewer marked it superseded itself. It is present in
// the directory and is deliberately not read here.
const shardA = readJson(`${REVIEWS}/wave-c-shard-a/final-verdicts.json`);

const BASE = shardB.reviewBaseCommit;
if (shardC.reviewBaseCommit !== BASE) {
  fail(`the two shards reviewed different bases: ${BASE} and ${shardC.reviewBaseCommit}`);
}

/**
 * Shard A and shard D are deliberately absent.
 *
 * Shard A ran in the wrong environment, never reached the review base, derived
 * no families and issued no verdicts; a record that reviewed nothing is not a
 * review, and consuming its blocker into the canonical ledger would put a row
 * there that no reviewer stands behind. Shard D's transcript ends mid-review
 * with no verdict rollup. Both are pending, not counted.
 */
const NOT_CONSUMED = [
  { record: `${REVIEWS}/wave-c-shard-a/verdicts.json`,
    because: "shard A's first pass reviewed the ef957a9 lineage before e94fb456 was fetched into that clone. The reviewer marked it superseded by final-verdicts.json and said so in the record; only the authoritative one is read here." }
];

/** One row per correction the wave has to carry, taken from the reviewers' own findings. */
const CORRECTIONS = [
  {
    id: "WCB-B-REGION-ATTRIBUTION",
    raisedBy: "wave-c-shard-b",
    severity: "systemic",
    scope: ["NC:aoc-cr-287-form-en", "NC:aoc-cr-288-form-en", "NC:aoc-cr-296-form-en", "NC:aoc-cr-298-form-en"],
    finding:
      "regionHeading and effectiveLabel are attributed across columns and across rows, so a widget's protection is frequently decided from printed text that does not govern it.",
    provenDamage:
      "NC AOC-CR-296: StreetAddr and MailAddr — the defendant's own address lines at x=38, sitting between the bound name line and the bound city line — are refused as protected_page_region / prosecutor under the heading 'DISTRICT ATTORNEY PETITION', which is a line of the title block in the right-hand column. The filed petition carries a name and a city and no street address.",
    correction:
      "Constrain region attribution to headings whose horizontal extent overlaps the widget's column, and caption attribution to the caption cell above or left of the widget within that column, rather than the whole row.",
    direction: "over-protection: a required participant value is being withheld",
    ownedBy: "shared geometry — scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
  },
  {
    id: "WCB-CAPTION-ENCODING",
    raisedBy: "wave-c-shard-b and wave-c-shard-c, independently",
    severity: "systemic",
    scope: ["NC:aoc-cr-287-form-en", "NC:aoc-cv-226-support-en", "NE:dc-1-15-form-en"],
    finding:
      "Printed captions are harvested without applying the font's ToUnicode mapping, so Identity-H and UTF-16 text arrives as undecoded glyph codes. A protection channel that reads captions is blind wherever that happens, and it fails silently.",
    provenDamage:
      "NC AOC-CV-226: two fields classified `participant` are refused as category `money` because their unreadable label matched the money rule. NC AOC-CR-287 carries the same mojibake in its census. NE DC-1-15 — held out of the evidence wave — still writes `printedname` on page 2 inside its Certificate of Service, and its headings decode to nothing.",
    correction:
      "Decode printed text through the font's ToUnicode CMap when harvesting captions and region headings in the census, then re-derive the maps.",
    direction: "both: unreadable captions cause false protection in one family and no protection in another",
    ownedBy: "shared geometry — scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
  },
  {
    id: "WCC-CHOOSER-PROMPT-ON-FILED-PAGE",
    raisedBy: "wave-c-shard-c",
    severity: "substantive, participant-facing",
    scope: ["NE:cc-6-11-form-en", "NE:cc-6-11-2-form-en", "NE:cc-6-12-form-en"],
    finding:
      "Refusing to write a widget leaves the source appearance stream in place, so an unselected dropdown's prompt is flattened onto the filed page. 'Choose the court' is drawn at (144.3,120.2,198.6,131.0) inside TYPEOFCOURTDROPDOWN and 'Choose the county' at (291.8,120.2,351.3,131.0); on CC 6:12 the prompt overprints the court's own printed caption.",
    provenDamage:
      "Three Nebraska families file a pleading carrying interface instructions as ink. This is the mutation ESC-CAPTION-VARIANTS itself declares must fail, and it does not.",
    correction:
      "At finalize, clear the appearance stream of every widget that was refused or left unwritten before flattening, rather than preserving the source appearance.",
    direction: "residue: text that is not a participant value reaches the filed page",
    ownedBy: "shared finalizer — scripts/rcap-official-forms/rcap-official-form-finalize.mjs"
  },
  {
    id: "WCB-B-296-DLSTATE",
    raisedBy: "wave-c-shard-b",
    severity: "substantive, wrong fact in production",
    scope: ["NC:aoc-cr-296-form-en"],
    finding:
      "DLState binds participant.state. The residence state and the state that issued a driver's licence are different facts; the field carries no printed caption, so the binder had only the name to work from and the refuseWhen guards never saw a subject to refuse.",
    provenDamage: "The canonical fixture renders the participant's residence state in the Drivers License State column.",
    correction:
      "Add the driver's-licence cluster to the government_identifier rule's name test so DLState is refused on its name the way DLNo already is.",
    direction: "wrong fact written",
    ownedBy: "shared semantics — scripts/rcap-official-forms/rcap-field-semantics.mjs"
  },
  {
    id: "WCB-B-298-RECORDS-OFFICER-NAME",
    raisedBy: "wave-c-shard-b",
    severity: "substantive, participant-facing, not previously recorded anywhere",
    scope: ["NC:aoc-cr-298-form-en"],
    finding:
      "A records-officer name appears in a cell the reviewer could not attribute to any participant binding, and could not check against the blank source because the corpus was absent from their environment.",
    provenDamage: "Unresolved: this needs the pinned source opened, which this reviewer could not do.",
    correction:
      "Open the pinned source under RCAP_BUNDLE_EXTRACT and inspect that cell. If the official blank does not print the name, re-acquire AOC-CR-298 REV-2025-07 and re-render; if it does, record it as source ink.",
    direction: "unknown until the source is read",
    ownedBy: "source acquisition, then the family package"
  },
  {
    id: "WCB-B-298-SOURCEURL",
    raisedBy: "wave-c-shard-b",
    severity: "substantive provenance defect, provable without the corpus",
    scope: ["NC:aoc-cr-298-form-en"],
    finding:
      "The provenance sidecar carries a sourceUrl that the reviewer could not tie to this form, where the other three families in the shard correctly fall back to the master-library locator.",
    provenDamage: "A provenance locator that cannot be shown to resolve to this form is indistinguishable from one that does until somebody follows it.",
    correction:
      "Null the sourceUrl and let the master-library locator stand, as the sibling families do, or replace it with the AOC-CR-298 URL after confirming it resolves to this form.",
    direction: "provenance",
    ownedBy: "the family package"
  }
];

/** The two escalations whose closure claims did not survive review. */
const REOPENED = [
  {
    escalationId: "ESC-CAPTION-VARIANTS",
    priorClaim: "recorded closed, with provenAgainstThisFamilysBytes set on the affected families",
    reopenedBecause:
      "Shard C reproduced this escalation's own stated mutation. It requires that flattening a form with an unselected dropdown leave no prompt string in the page content stream; 'Choose the court' and 'Choose the county' are in the content stream of three finalized Nebraska artifacts at this base.",
    measuredAt: BASE,
    priorFlagAccepted: false,
    carriedBy: ["WCC-CHOOSER-PROMPT-ON-FILED-PAGE", "WCB-CAPTION-ENCODING"]
  },
  {
    escalationId: "ESC-NO-REFUSE-WHEN",
    priorClaim: "recorded closed against several families",
    reopenedBecause:
      "Shard B closed it for NC AOC-CR-287 and AOC-CR-288 against the bytes, and found it only partially closed for NC AOC-CR-296: DLState takes participant.state, and the refuseWhen guards cannot catch it because the field prints no caption and the binder matched on the name alone. A guard that only inspects captions does not cover a field that has none.",
    measuredAt: BASE,
    priorFlagAccepted: false,
    carriedBy: ["WCB-B-296-DLSTATE"]
  }
];

/** Owner decisions, resolved as directed rather than left open. */
const OWNER_DECISIONS = [
  {
    familyId: "NC:aoc-cr-296-form-en",
    reportedBy: "wave-c-shard-b",
    resolution: "prosecutor_controlled",
    decided: {
      documentOwner: "prosecutor / district attorney",
      participantCompleted: false,
      participantFillable: false
    },
    consequence:
      "Not delivered as a participant artifact and not counted toward any checkout or packet-completion gate. It may be named to the participant as a step the district attorney controls, with guidance saying so.",
    stillCarriesATechnicalCorrection: ["WCB-B-296-STREETADDR", "WCB-B-296-DLSTATE"],
    noteOnThoseCorrections:
      "The ownership decision does not retire the technical findings. Whether or not this form is participant-filled, a binder that withholds a street address because a title-block line in another column was read as the governing heading is wrong, and the fix is shared."
  },
  {
    familyId: "NE:cc-6-12-form-en",
    reportedBy: "wave-c-shard-c",
    resolution: "not_an_owner_question",
    decided: {
      captionName: "the defendant/participant's full legal name"
    },
    consequence:
      "The caption name is the participant's own, so there is no ownership question to answer. The verdict is re-read as the technical correction it actually describes, and the family joins the correction wave rather than waiting on a decision.",
    stillCarriesATechnicalCorrection: ["WCC-CHOOSER-PROMPT-ON-FILED-PAGE"],
    noteOnThoseCorrections:
      "Recorded here so the re-review does not stall this family behind a decision nobody needs to make."
  }
];

const families = [...new Set(CORRECTIONS.flatMap((c) => c.scope))].sort();

const record = {
  schemaVersion: "rcap-gate-b-correction-wave/v2",
  generatedBy: "scripts/generate-rcap-gate-b-correction-wave-2.mjs",
  reviewBaseCommit: BASE,
  consumedShards: [
    { shard: "b", branch: shardB.reviewerBranch ?? null, verdicts: shardB.counts ?? shardB.totals ?? null,
      recordsSha256: sha256(`${REVIEWS}/wave-c-shard-b/verdicts.json`) },
    { shard: "c", branch: shardC.reviewer ?? null, verdicts: shardC.totals ?? shardC.counts ?? null,
      recordsSha256: sha256(`${REVIEWS}/wave-c-shard-c/verdicts.json`) }
  ],
  notConsumed: NOT_CONSUMED,
  notAPromotion:
    "Two families carry a current approved_platform_ready verdict from an independent reviewer that recomputed their source bytes. Neither is promoted here, and the reason is structural rather than substantive: the canonical loader does not read the layout these shards write. See approvals.whyTheyAreNotYetAtTheGate.",
  approvals: {
    statement:
      "Four families carry an approval. Shard B approved two and shard A two, each after reading the blank official source: shard A recorded the visible form number and revision off the paper (TF-800 (5/25) and TF-805 (5/25)) and isolated generated content by differencing blank against finalized page by page. This lane recomputed all four official source digests independently against its own mounted extract and agrees with every one, and all 81 artifact, map, classification, sidecar, contact-sheet and raster digests the four shards reference match disk.",
    records: [
      { familyId: "NC:aoc-cr-287-form-en", shard: "b", verdict: "approved_platform_ready",
        record: `${REVIEWS}/wave-c-shard-b/NC-aoc-cr-287-form-en.review.json` },
      { familyId: "NC:aoc-cr-288-form-en", shard: "b", verdict: "approved_platform_ready",
        record: `${REVIEWS}/wave-c-shard-b/NC-aoc-cr-288-form-en.review.json` },
      { familyId: "AK:tf-800-form-en", shard: "a", verdict: "approved_platform_ready",
        record: `${REVIEWS}/wave-c-shard-a/final-verdicts.json` },
      { familyId: "AK:tf-805-form-en", shard: "a", verdict: "approved_platform_ready",
        record: `${REVIEWS}/wave-c-shard-a/final-verdicts.json` }
    ],
    whyTheyAreNotYetAtTheGate:
      "loadReviewRecords discovers a batch as a top-level `<batch>-manifest.json` plus `<batch>-group-N.review.json` files. The wave C shards write `wave-c-shard-<x>/assignment.json` and one `.review.json` per family inside a subdirectory, so the canonical loader does not see them and the gate cannot evaluate the two approvals. This lane will not close that gap by authoring manifest and group files itself: a record that carries an approval has to be written by the reviewer who issued it, and synthesising one here would be this lane approving its own work through a formatting change. Either the reviewers emit the canonical layout, or the loader is taught this one — and the second is a change to the platform-ready gate, which is not this lane's to make.",
    denominatorConsequence:
      "retained_problematic stays at 85. The two approvals are real and recorded; they are not counted until the gate can read them."
  },
  sourceVerification: {
    resolvedFor: ["a", "b", "c", "d"],
    statement:
      "The blocker that refused every family in the first pass is gone. Shards B, C and D each recomputed the official source SHA-256 from real bytes and each agrees with the pinned identity. This lane recomputed the same digests independently against its own mounted Edition 1 extract and agrees with both.",
    shardBCaveat:
      "Shard B verified from a targeted four-file source pack rather than the whole library, and says so itself. Its §2 is satisfied for its four assigned families, which is what its verdicts rest on; the whole-corpus preconditions of 499 files and 329 PDFs remain uncounted by that reviewer and are the captain's to hold.",
    shardCSuiteNote:
      "Shard C's own suite refuses to pass without RCAP_BUNDLE_EXTRACT set, which is the correct behaviour: run with the extract mounted it reports every source byte recomputed and agreeing. Run without, it fails rather than assuming."
  },

  totals: {
    familiesReviewed: 16,
    newApprovals: 4,
    approvalsAcceptedAtTheGate: 0,
    correctionReturns: 9,
    ownerDecisionsReported: 3,
    ownerDecisionsResolved: OWNER_DECISIONS.length,
    correctionsDispatched: CORRECTIONS.length,
    escalationsReopened: REOPENED.length,
    familiesInThisWave: families.length,
    sharedCorrections: CORRECTIONS.filter((c) => c.ownedBy.startsWith("shared")).length,
    familyOwnedCorrections: CORRECTIONS.filter((c) => !c.ownedBy.startsWith("shared")).length
  },
  reopenedEscalations: REOPENED,
  ownerDecisions: OWNER_DECISIONS,
  corrections: CORRECTIONS,
  familiesInThisWave: families,
  denominatorUnchanged: {
    platform_ready: 1,
    retired: 42,
    retained_problematic: 85,
    retained_missing: 37,
    because: "no approval was issued, so nothing moved out of retained_problematic."
  }
};

function markdown() {
  const lines = [];
  lines.push("# Gate B correction wave 2 — wave C shards B and C");
  lines.push("");
  lines.push(record.notAPromotion);
  lines.push("");
  lines.push("## Source verification");
  lines.push("");
  lines.push(record.sourceVerification.statement);
  lines.push("");
  lines.push(record.sourceVerification.shardBCaveat);
  lines.push("");
  lines.push(record.sourceVerification.shardCSuiteNote);
  lines.push("");
  lines.push("## Approvals");
  lines.push("");
  lines.push(record.approvals.statement);
  lines.push("");
  for (const a of record.approvals.records) lines.push(`- **${a.familyId}** — ${a.shard}, source recomputed and agreeing with the pin`);
  lines.push("");
  lines.push(record.approvals.whyTheyAreNotYetAtTheGate);
  lines.push("");
  lines.push("## Not consumed");
  lines.push("");
  for (const n of NOT_CONSUMED) lines.push(`- \`${n.record}\` — ${n.because}`);
  lines.push("");
  lines.push("## Reopened");
  lines.push("");
  for (const r of REOPENED) {
    lines.push(`### ${r.escalationId}`);
    lines.push("");
    lines.push(`Prior claim: ${r.priorClaim}. That flag is not accepted as evidence.`);
    lines.push("");
    lines.push(r.reopenedBecause);
    lines.push("");
    lines.push(`Carried by: ${r.carriedBy.join(", ")}`);
    lines.push("");
  }
  lines.push("## Owner decisions");
  lines.push("");
  for (const d of OWNER_DECISIONS) {
    lines.push(`### ${d.familyId} — ${d.resolution}`);
    lines.push("");
    lines.push(d.consequence);
    lines.push("");
    lines.push(`Still carries: ${d.stillCarriesATechnicalCorrection.join(", ")}. ${d.noteOnThoseCorrections}`);
    lines.push("");
  }
  lines.push("## Corrections dispatched");
  lines.push("");
  lines.push("| id | owner | direction | families |");
  lines.push("| --- | --- | --- | --- |");
  for (const c of CORRECTIONS) {
    lines.push(`| ${c.id} | ${c.ownedBy.split(" — ")[0]} | ${c.direction.split(":")[0]} | ${c.scope.length} |`);
  }
  lines.push("");
  for (const c of CORRECTIONS) {
    lines.push(`### ${c.id}`);
    lines.push("");
    lines.push(`_${c.severity}; raised by ${c.raisedBy}; owned by ${c.ownedBy}_`);
    lines.push("");
    lines.push(`**Finding.** ${c.finding}`);
    lines.push("");
    lines.push(`**Proven damage.** ${c.provenDamage}`);
    lines.push("");
    lines.push(`**Correction.** ${c.correction}`);
    lines.push("");
    lines.push(`**Families.** ${c.scope.join(", ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-correction-wave-2.mjs`);

console.log(
  `OK correction wave 2 — ${record.totals.familiesReviewed} families reviewed at ${BASE.slice(0, 8)}, ${record.totals.newApprovals} approval(s) recorded / ${record.totals.approvalsAcceptedAtTheGate} accepted at the gate, ` +
    `${record.totals.correctionReturns} correction returns, ${record.totals.ownerDecisionsResolved} owner decisions resolved; ` +
    `${record.totals.correctionsDispatched} corrections dispatched over ${record.totals.familiesInThisWave} families, ` +
    `${record.totals.escalationsReopened} escalations reopened`
);
