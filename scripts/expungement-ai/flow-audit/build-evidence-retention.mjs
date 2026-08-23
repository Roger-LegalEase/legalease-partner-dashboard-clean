#!/usr/bin/env node
// Where every browser capture is, and its hash.
//
//   node scripts/expungement-ai/flow-audit/build-evidence-retention.mjs
//   node scripts/expungement-ai/flow-audit/build-evidence-retention.mjs --check
//
// Phase 1 committed 47 captures and pruned 285, keeping only their hashes. That
// is defensible for a repository and useless to anyone who needs to look at a
// pruned screen. Phase 1B retakes the whole set at the same HEAD and retains it
// outside Git, so the hashes in the committed index point at files that exist
// somewhere a person can reach.
//
// The retained path is deliberately outside the repository and is never
// committed. This file records where it is and what is in it; it does not copy
// any of it back in.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT_DIR, read, readJson, exists, gitSha, writeArtifact, stableJson } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/evidence-retention.json";
const RAW_ROOT = process.env.EXPAI_FLOW_AUDIT_RAW_ROOT
  ?? path.join(process.env.HOME ?? "/root", "LegalEase-Audit-Artifacts/expai-flow-audit/phase1b-raw");

const committedIndex = readJson("data/expungement-ai/flow-audit/screenshot-index.json");
const committedCuration = readJson("data/expungement-ai/flow-audit/evidence/curation.json");

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/* --- the committed subset -------------------------------------------- */

const committed = committedIndex.screenshots.map((shot) => {
  const absolute = path.join(ROOT_DIR, shot.file);
  const present = fs.existsSync(absolute);
  return {
    file: shot.file,
    sha256: shot.sha256,
    bytes: shot.bytes,
    viewport: shot.viewport,
    flowId: shot.flowId,
    jurisdiction: shot.jurisdiction,
    label: shot.label,
    presentInGit: present,
    hashVerified: present ? sha256File(absolute) === shot.sha256 : null
  };
});

/* --- the retained raw set -------------------------------------------- */

const rawShotsDir = path.join(RAW_ROOT, "screenshots");
const rawPresent = fs.existsSync(rawShotsDir);
const rawFiles = rawPresent ? fs.readdirSync(rawShotsDir).filter((name) => name.endsWith(".png")).sort() : [];
const raw = rawFiles.map((name) => {
  const absolute = path.join(rawShotsDir, name);
  const stat = fs.statSync(absolute);
  return {
    file: name,
    sha256: sha256File(absolute),
    bytes: stat.size,
    viewport: /__mobile-/.test(name) ? "mobile-390x844" : "desktop-1440x1000",
    flowId: name.split("__")[0] ?? null,
    label: name.replace(/\.png$/, "").split("__").slice(2).join("__") || null
  };
});

const rawReportPath = path.join(RAW_ROOT, "crawl-report.json");
const rawReport = fs.existsSync(rawReportPath) ? JSON.parse(fs.readFileSync(rawReportPath, "utf8")) : null;

const rawHashes = new Set(raw.map((shot) => shot.sha256));
const committedAlsoRetained = committed.filter((shot) => rawHashes.has(shot.sha256)).length;

const packet = {
  schemaVersion: "expai-evidence-retention/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-evidence-retention.mjs",
  baseSha: gitSha("origin/main"),
  auditHead: gitSha("HEAD"),
  changesNoProductBehavior: true,
  rawRetentionPath: RAW_ROOT,
  rawRetentionIsOutsideGit: !RAW_ROOT.startsWith(ROOT_DIR),
  rawRetentionIsCommitted: false,
  captureOrigin: rawReport?.baseOrigin ?? committedIndex.captureOrigin ?? null,
  determinismNote:
    "The crawl's terminals are deterministic; its capture SET is not. Duplicate captures are suppressed by content hash at capture time, so a render that differs by a pixel between runs produces one more or one fewer retained file. The Phase 1 committed index was produced by that phase's final run; this retention record was produced by a re-capture at the same HEAD, and the two capture counts differ for that reason and no other. Terminal agreement between the two runs is unchanged.",
  totals: {
    committedCaptures: committed.length,
    committedPresentInGit: committed.filter((shot) => shot.presentInGit).length,
    committedHashesVerified: committed.filter((shot) => shot.hashVerified === true).length,
    committedHashMismatches: committed.filter((shot) => shot.hashVerified === false).length,
    prunedFromTheCommittedRunButHashRecorded: committedCuration.totals.pruned,
    retainedRawCaptures: raw.length,
    desktopCaptures: raw.filter((shot) => shot.viewport.startsWith("desktop")).length,
    mobileCaptures: raw.filter((shot) => shot.viewport.startsWith("mobile")).length,
    retainedRawBytes: raw.reduce((sum, shot) => sum + shot.bytes, 0),
    committedCapturesAlsoPresentInTheRetainedSet: committedAlsoRetained,
    rawCrawlFlows: rawReport?.totals?.flowsCrawled ?? null,
    rawCrawlDesktopCaptures: rawReport?.totals?.desktopCaptures ?? null,
    rawCrawlMobileCaptures: rawReport?.totals?.mobileCaptures ?? null
  },
  committedCaptures: committed,
  retainedRawCaptures: raw,
  prunedFromTheCommittedRun: committedCuration.pruned.map((shot) => ({
    sha256: shot.sha256,
    flowId: shot.flowId,
    viewport: shot.viewport,
    label: shot.label,
    note: shot.note
  }))
};

const text = stableJson(packet);
if (CHECK) {
  if (!exists(OUT) || read(OUT) !== text) {
    console.error(`${OUT} is stale or the retained evidence set has changed; re-run without --check.`);
    process.exit(1);
  }
  console.log(`evidence retention current: ${raw.length} raw capture(s) retained.`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  committed: ${committed.length} (${packet.totals.committedHashesVerified} hashes verified, ${packet.totals.committedHashMismatches} mismatches)`);
console.log(`  retained outside Git at ${RAW_ROOT}: ${raw.length} captures, ${packet.totals.desktopCaptures} desktop / ${packet.totals.mobileCaptures} mobile, ${Math.round(packet.totals.retainedRawBytes / 1024 / 1024)} MiB`);
