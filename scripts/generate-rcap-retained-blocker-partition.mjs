#!/usr/bin/env node
// The retained-asset blocker partition: three buckets, one blocker each.
//
//   node scripts/generate-rcap-retained-blocker-partition.mjs
//   node scripts/generate-rcap-retained-blocker-partition.mjs --check
//
// Every retained asset lands in exactly one bucket and carries exactly one
// blocker, one owner and one next executable action. The buckets are ordered so
// the partition is total and disjoint by construction rather than by hope: an
// asset is tested against SOURCE_OR_RETIREMENT first, then RERENDER_REQUIRED,
// and only what survives both is REVIEW_ONLY. Nothing can fall into two, and
// nothing can fall into none.
//
// The ordering is not arbitrary. A missing binary cannot be re-rendered and
// cannot be reviewed, so asking whether it needs a rerender is meaningless; an
// asset with a live technical defect cannot be usefully reviewed, so asking a
// reviewer to look at it wastes the one scarce resource in this programme.
// Each bucket therefore names work that is executable today, on that asset,
// without waiting for another bucket to finish.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const OUT = "data/rcap-all50/pdf-independent-reviews/retained-blocker-partition.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/retained-blocker-partition.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL retained blocker partition — ${message}`);
  process.exit(1);
}

const register = readJson(REGISTER);
const ledger = readJson(LEDGER);

/** Defect categories that mean the artifact itself has to be produced again. */
const RERENDER_CATEGORIES = new Set([
  "flat_overlay_geometry_or_readback",
  "visually_unsafe",
  "xfa_javascript_or_active_content_residue",
  "stale_contact_sheet_manifest_or_review_evidence",
  "multi_widget_ambiguity",
  "contact_sheet_shows_no_fill",
  "unfinalized_rendered_artifact",
  "missing_required_packet_component"
]);

/** Defect categories that mean the question is about the source, not the render. */
const SOURCE_CATEGORIES = new Set([
  "missing_binary",
  "currentness_unverified",
  "stale_or_superseded"
]);

// Families carrying a current approved_platform_ready verdict that the gate
// refuses on the classification-counter clause. They are not REVIEW_ONLY: the
// review is done. What they are waiting for is a regenerated classification,
// which is the same lane and the same action as a rerender.
const APPROVED_BUT_GATE_BLOCKED = new Set([
  "AK:tf-800-form-en", "AK:tf-805-form-en",
  "NC:aoc-cr-287-form-en", "NC:aoc-cr-288-form-en"
]);

const platformReadyIdentities = new Set((register.platformReady ?? []).map((p) => p.identity));

const LANES = {
  REVIEW_ONLY: {
    lane: "LANE-REVIEW",
    owner: "independent review lane",
    why: "current source, current artifact and current evidence; the only thing not yet obtained is an independent approval the gate accepts"
  },
  RERENDER_REQUIRED: {
    lane: "LANE-RERENDER",
    owner: "implementation lane (RCAP overlay factory)",
    why: "the official source is in hand and something about what was produced from it has to be produced again"
  },
  SOURCE_OR_RETIREMENT: {
    lane: "LANE-SOURCE",
    owner: "source acquisition and retirement lane",
    why: "there is nothing to render or review until the source question or the retirement decision is settled"
  }
};

function classify(record) {
  const categories = new Set(record.defectCategories ?? []);
  const familyIds = record.familyIds ?? [];

  // 1 — source or retirement, tested first: a missing binary can be neither
  //     re-rendered nor reviewed.
  if (record.binaryPresent === false || categories.has("missing_binary")) {
    return {
      bucket: "SOURCE_OR_RETIREMENT",
      blocker: "the official binary is not present in the clone, so no artifact can be produced and no review can be performed",
      nextAction: record.exactNextAction
        ?? "acquire the official source binary, or record a retirement or repoint decision proving no operational reference survives"
    };
  }
  const sourceOnly = [...categories].filter((c) => c !== "held_on_source_or_design" && c !== "never_independently_approved");
  if (sourceOnly.length > 0 && sourceOnly.every((c) => SOURCE_CATEGORIES.has(c))) {
    return {
      bucket: "SOURCE_OR_RETIREMENT",
      blocker: `the source itself is unsettled (${sourceOnly.join(", ")}); the artifact cannot be trusted until the source identity or currentness is resolved`,
      nextAction: record.exactNextAction
        ?? "confirm the official revision against the publisher, or record a supersession or retirement decision"
    };
  }

  // 2 — an approval that exists and cannot be accepted is a regeneration
  //     problem, not a review problem.
  const gateBlocked = familyIds.find((f) => APPROVED_BUT_GATE_BLOCKED.has(f));
  if (gateBlocked) {
    return {
      bucket: "RERENDER_REQUIRED",
      blocker: "an independent approval exists and the gate refuses it: field-classification.json carries no classifiedFieldsOrAnchors / discoveredFieldsOrAnchors counters, which the platform-ready contract requires",
      nextAction: "have the D1 driver emit the two classification counters its own contract defines, regenerate this family's classification, and re-run the gate — no re-review is needed"
    };
  }

  // 3 — a live technical or visual defect: the artifact has to be produced again.
  const rerenderHits = [...categories].filter((c) => RERENDER_CATEGORIES.has(c));
  if (rerenderHits.length) {
    return {
      bucket: "RERENDER_REQUIRED",
      blocker: `the produced artifact carries ${rerenderHits.join(", ")}`,
      nextAction: record.exactNextAction
        ?? "apply the recorded correction, re-render this family against the corrected binder, and regenerate its all-page evidence"
    };
  }

  // 4 — everything that survives: only the approval is missing.
  return {
    bucket: "REVIEW_ONLY",
    blocker: "no technical, visual or source defect is recorded against this asset; it has never carried an independent approval the gate accepts",
    nextAction: "assign to an independent reviewer in a worktree with the Edition 1 extract mounted, and have the verdict emitted as a canonical batch manifest and group review file"
  };
}

const assets = [];
for (const record of register.records ?? []) {
  if (platformReadyIdentities.has(record.identity)) continue;
  const decided = classify(record);
  const lane = LANES[decided.bucket];
  assets.push({
    identity: record.identity,
    jurisdiction: record.jurisdiction,
    formId: record.formId,
    familyIds: record.familyIds ?? [],
    binaryPresent: record.binaryPresent === true,
    bucket: decided.bucket,
    blocker: decided.blocker,
    owner: lane.owner,
    lane: lane.lane,
    nextExecutableAction: decided.nextAction,
    acceptanceCondition: record.exactAcceptanceCondition ?? null,
    defectCategories: record.defectCategories ?? []
  });
}

// The partition has to be total and disjoint, and has to agree with the
// canonical denominator. All three are checked rather than asserted, because a
// partition that quietly drops an asset is worse than no partition: it reads as
// coverage.
const expected = ledger.equation.retainedProblematic;
if (assets.length !== expected) {
  fail(`partitioned ${assets.length} assets and the canonical denominator says ${expected} are retained_problematic`);
}
const seen = new Set();
for (const a of assets) {
  if (seen.has(a.identity)) fail(`${a.identity} appears twice`);
  seen.add(a.identity);
  if (!a.bucket || !a.blocker || !a.owner || !a.nextExecutableAction) {
    fail(`${a.identity} is missing a bucket, blocker, owner or next action`);
  }
}

const buckets = ["REVIEW_ONLY", "RERENDER_REQUIRED", "SOURCE_OR_RETIREMENT"];
const byBucket = Object.fromEntries(buckets.map((b) => [b, assets.filter((a) => a.bucket === b)]));

const record = {
  schemaVersion: "rcap-retained-blocker-partition/v1",
  generatedBy: "scripts/generate-rcap-retained-blocker-partition.mjs",
  derivedFrom: [REGISTER, LEDGER],
  head: ledger.head ?? null,
  purpose:
    "Every retained asset in exactly one bucket, with one blocker, one owner and one next executable action, so three lanes can run against it at once without waiting for each other.",
  denominatorAtGeneration: {
    platform_ready: ledger.equation.platformReady,
    retired: ledger.equation.retired,
    retained_problematic: ledger.equation.retainedProblematic,
    retained_missing: ledger.retainedBreakdown.retainedMissing
  },
  whyThisIsNot81:
    "The partition covers the retained assets the canonical generator reports today. Four families carry a current approved_platform_ready verdict from an independent reviewer, and the gate refuses all four on one clause: field-classification.json must carry classifiedFieldsOrAnchors equal to discoveredFieldsOrAnchors, and the D1 driver writes neither. One family in 114 carries those counters. Until the driver emits them the four cannot be accepted, so retained_problematic is what it is rather than four lower. Those four are bucketed RERENDER_REQUIRED, because what they need is a regenerated classification and not another review.",
  partitionRules: [
    "tested in order, so the partition is disjoint by construction",
    "1. SOURCE_OR_RETIREMENT — the binary is absent, or every remaining defect is about the source itself; nothing can be rendered or reviewed",
    "2. RERENDER_REQUIRED — the source is in hand and something produced from it has to be produced again",
    "3. REVIEW_ONLY — nothing else is open; only an independent approval the gate accepts is missing"
  ],
  totals: {
    partitioned: assets.length,
    REVIEW_ONLY: byBucket.REVIEW_ONLY.length,
    RERENDER_REQUIRED: byBucket.RERENDER_REQUIRED.length,
    SOURCE_OR_RETIREMENT: byBucket.SOURCE_OR_RETIREMENT.length,
    approvedButGateBlocked: assets.filter((a) => a.familyIds.some((f) => APPROVED_BUT_GATE_BLOCKED.has(f))).length,
    everyAssetHasOneBlockerOwnerAndAction: true
  },
  lanes: buckets.map((b) => ({
    lane: LANES[b].lane,
    bucket: b,
    owner: LANES[b].owner,
    why: LANES[b].why,
    assetCount: byBucket[b].length,
    runsIndependentlyOfTheOtherTwo: true
  })),
  assets
};

function markdown() {
  const lines = [];
  lines.push("# Retained-asset blocker partition");
  lines.push("");
  lines.push(record.purpose);
  lines.push("");
  lines.push(`Denominator at generation: **${record.denominatorAtGeneration.platform_ready} platform_ready / ${record.denominatorAtGeneration.retired} retired / ${record.denominatorAtGeneration.retained_problematic} retained_problematic / ${record.denominatorAtGeneration.retained_missing} retained_missing**.`);
  lines.push("");
  lines.push(record.whyThisIsNot81);
  lines.push("");
  lines.push("| lane | bucket | assets | owner |");
  lines.push("| --- | --- | ---: | --- |");
  for (const l of record.lanes) lines.push(`| ${l.lane} | ${l.bucket} | ${l.assetCount} | ${l.owner} |`);
  lines.push("");
  for (const b of buckets) {
    lines.push(`## ${b} — ${byBucket[b].length} asset(s), ${LANES[b].lane}`);
    lines.push("");
    lines.push(LANES[b].why);
    lines.push("");
    lines.push("| jurisdiction | form | blocker | next executable action |");
    lines.push("| --- | --- | --- | --- |");
    for (const a of byBucket[b]) {
      const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| ${a.jurisdiction} | ${cell(a.formId)} | ${cell(a.blocker).slice(0, 160)} | ${cell(a.nextExecutableAction).slice(0, 160)} |`);
    }
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-retained-blocker-partition.mjs`);

console.log(
  `OK retained blocker partition — ${record.totals.partitioned} assets in 3 disjoint buckets: ` +
    `REVIEW_ONLY ${record.totals.REVIEW_ONLY}, RERENDER_REQUIRED ${record.totals.RERENDER_REQUIRED}, ` +
    `SOURCE_OR_RETIREMENT ${record.totals.SOURCE_OR_RETIREMENT}; every asset carries one blocker, one owner and one next action`
);
