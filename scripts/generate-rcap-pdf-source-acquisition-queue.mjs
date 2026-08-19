#!/usr/bin/env node
// PDF source acquisition queue.
//
//   node scripts/generate-rcap-pdf-source-acquisition-queue.mjs
//   node scripts/generate-rcap-pdf-source-acquisition-queue.mjs --check
//
// Reconciles all 128 problematic-PDF assets against every source of official
// location evidence this repository already holds, and says for each one
// whether we know an exact official binary URL, only an official landing page,
// or genuinely nothing.
//
// Reconciled against:
//   * the official forms-links workbook   docs/record-clearing/official-source-download-checklist.md
//                                          docs/record-clearing/missing-official-forms-audit.json
//   * committed source receipts            the register's own sourceUrl / sourceSha256 / revision
//   * existing form inventories            data/rcap-all50/nationwide-source-inventory.json
//                                          data/rcap-all50/overlays/production/implementation-index.json
//   * existing first-party URLs            every http(s) URL committed under data/ and docs/,
//                                          plus each packet set's officialSourceUrl
//
// It downloads nothing. Acquisition happens in the branch-triggered Actions
// matrix, which is the only place in this system with egress to a court or
// agency host; this container's network policy denies those hosts outright.
//
// It changes no runtime, no route sellability and no package file.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const JSON_OUT = "data/rcap-ledger/pdf-source-acquisition-queue.json";
const MD_OUT = "docs/record-clearing/pdf-source-acquisition-queue.md";

// Session A's packet-set manifest is the largest first-party URL corpus. Read
// from the working tree when it is there, otherwise pinned at their commit.
const SESSION_A_COMMIT = "4072b6189c0cde20ab43673a9f0569d2b8d20752";
const PACKET_SETS = "data/record-clearing/legal-design-packet-set-manifests.json";

const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const register = readJson("data/rcap-all50/problematic-pdf-register.json");
const inventory = readJson("data/rcap-all50/nationwide-source-inventory.json");
const d1Index = readJson("data/rcap-all50/overlays/production/implementation-index.json");
const formsAudit = readJson("docs/record-clearing/missing-official-forms-audit.json");
const checklistText = read("docs/record-clearing/official-source-download-checklist.md");

let packetSetsRaw, packetSetsSource;
if (fs.existsSync(path.join(rootDir, PACKET_SETS))) {
  packetSetsRaw = read(PACKET_SETS);
  packetSetsSource = "working_tree";
} else {
  packetSetsRaw = git(["show", `${SESSION_A_COMMIT}:${PACKET_SETS}`]);
  packetSetsSource = `session_a_commit@${SESSION_A_COMMIT.slice(0, 8)}`;
}
const packetSets = JSON.parse(packetSetsRaw);

// --------------------------------------------------------------------------- URL corpus
// Every committed http(s) URL under data/ and docs/, with the files that carry
// it. A URL nobody wrote down here is not a source this lane may invent.
const URL_RE = /https?:\/\/[A-Za-z0-9._~:/?#[\]@!$&()*+,;=%-]+/g;
// This lane's own outputs are excluded from the corpus. Harvesting them would
// feed each run its previous answer, and the generator would never be
// reproducible — --check caught exactly that on the second run.
const LANE_OUTPUTS = new Set([
  "data/rcap-ledger/pdf-source-acquisition-queue.json",
  "data/rcap-ledger/pdf-retirement-dispositions.json",
  "docs/record-clearing/pdf-source-acquisition-queue.md",
  "docs/record-clearing/pdf-retirement-dispositions.md"
]);
const urlCorpus = new Map();
function harvest(dir, depth) {
  if (depth > 7) return;
  for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      harvest(rel, depth + 1);
      continue;
    }
    if (!/\.(json|md|csv|txt)$/i.test(entry.name)) continue;
    if (LANE_OUTPUTS.has(rel)) continue;
    let text;
    try { text = read(rel); } catch { continue; }
    for (const match of text.match(URL_RE) ?? []) {
      const url = match.replace(/[.,;:)\]}"'`]+$/, "");
      if (!urlCorpus.has(url)) urlCorpus.set(url, new Set());
      urlCorpus.get(url).add(rel);
    }
  }
}
harvest("data", 0);
harvest("docs", 0);
for (const match of packetSetsRaw.match(URL_RE) ?? []) {
  const url = match.replace(/[.,;:)\]}"'`]+$/, "");
  if (!urlCorpus.has(url)) urlCorpus.set(url, new Set());
  urlCorpus.get(url).add(PACKET_SETS);
}

const isBinaryUrl = (u) => /\.(pdf|docx?|rtf)(\?|#|$)/i.test(u);
const hostOf = (u) => { try { return new URL(u).host.toLowerCase(); } catch { return null; } };

/**
 * A publisher is first-party when its host is a government or court host. A
 * mirror, a law-firm copy or an aggregator is never an official source, so the
 * acquisition queue refuses to carry one.
 */
function publisherClass(url) {
  const host = hostOf(url);
  if (!host) return "unparseable";
  if (/(^|\.)(gov|mil)$/.test(host)) return "government";
  if (/(^|\.)us$/.test(host) && /court|judicial|state/.test(host)) return "government";
  if (/courts?\.|judicial|\.state\./.test(host) && /(^|\.)(org|net|us)$/.test(host)) return "court_or_judicial";
  return "third_party";
}

// --------------------------------------------------------------------------- normalization
const normalize = (v) => String(v ?? "").toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]/g, "");
const basenameOf = (u) => { try { return decodeURIComponent(new URL(u).pathname.split("/").filter(Boolean).pop() ?? ""); } catch { return ""; } };

/** Tokens strong enough to match a form on: a form number, not a stop word. */
function formTokens(record) {
  const out = new Set();
  for (const raw of [record.formId, record.formTitle]) {
    const n = normalize(raw);
    if (n.length >= 4) out.add(n);
  }
  // A form number like "TF-800" or "AOC-CR-287" also matches "tf800" / "aoccr287".
  const numberish = String(record.formId ?? "").match(/[A-Za-z]{1,6}[- ]?\d{2,5}[A-Za-z]?/g) ?? [];
  for (const n of numberish) { const t = normalize(n); if (t.length >= 4) out.add(t); }
  return [...out];
}

// --------------------------------------------------------------------------- indexes
const packetComponentsByTrack = new Map();
const packetComponentsByForm = new Map();
for (const set of packetSets.packetSets ?? []) {
  for (const component of set.components ?? []) {
    if (!component.officialSourceUrl && !component.officialFormId) continue;
    const row = { trackId: set.trackId, packetSetId: set.packetSetId, ...component };
    if (!packetComponentsByTrack.has(set.trackId)) packetComponentsByTrack.set(set.trackId, []);
    packetComponentsByTrack.get(set.trackId).push(row);
    const key = normalize(component.officialFormId);
    if (key.length >= 4) {
      if (!packetComponentsByForm.has(key)) packetComponentsByForm.set(key, []);
      packetComponentsByForm.get(key).push(row);
    }
  }
}

const inventoryBySha = new Map();
const inventoryByName = new Map();
for (const state of inventory.states ?? []) {
  for (const file of state.files ?? []) {
    inventoryBySha.set(file.sha256, { ...file, jurisdiction: state.code });
    const key = normalize(file.fileName);
    if (key.length >= 4) {
      if (!inventoryByName.has(key)) inventoryByName.set(key, []);
      inventoryByName.get(key).push({ ...file, jurisdiction: state.code });
    }
  }
}

const d1ByJurisdictionFamily = new Map();
for (const family of d1Index.families ?? []) {
  d1ByJurisdictionFamily.set(`${family.jurisdiction}|${normalize(family.family)}`, family);
}

// The workbook's per-state landing pages, harvested from the checklist prose.
const checklistUrlsByState = new Map();
for (const section of checklistText.split(/\n## /).slice(1)) {
  const stateName = section.split("\n")[0].trim();
  const urls = [...new Set((section.match(URL_RE) ?? []).map((u) => u.replace(/[.,;:)\]}"'`]+$/, "")))];
  if (urls.length) checklistUrlsByState.set(stateName.toLowerCase(), urls);
}
const stateNameToCode = new Map((inventory.states ?? []).map((s) => [s.name.toLowerCase(), s.code]));
const checklistUrlsByCode = new Map();
for (const [name, urls] of checklistUrlsByState) {
  const code = stateNameToCode.get(name);
  if (code) checklistUrlsByCode.set(code, urls);
}

// --------------------------------------------------------------------------- candidate resolution
function candidatesFor(record) {
  const tokens = formTokens(record);
  const out = [];
  const push = (url, how, evidence) => {
    if (!url) return;
    out.push({
      url,
      binary: isBinaryUrl(url),
      publisher: publisherClass(url),
      host: hostOf(url),
      matchedBy: how,
      evidence
    });
  };

  // 1. the committed source receipt on the register row itself
  if (record.sourceUrl) push(record.sourceUrl, "register_source_receipt", "data/rcap-all50/problematic-pdf-register.json:records[].sourceUrl");

  // 2. a packet-set component naming this exact official form id
  for (const token of tokens) {
    for (const component of packetComponentsByForm.get(token) ?? []) {
      push(component.officialSourceUrl, "packet_set_official_form_id", `${PACKET_SETS}:${component.packetSetId}/${component.componentId}`);
    }
  }

  // 3. a URL in the committed corpus whose file name is this form
  for (const [url, files] of urlCorpus) {
    const base = normalize(basenameOf(url));
    if (base.length < 4) continue;
    if (tokens.some((t) => base === t || base.includes(t) || t.includes(base))) {
      push(url, "committed_url_filename_match", [...files].sort().slice(0, 3).join(", "));
    }
  }

  // 4. a packet-set component on one of this asset's own tracks
  for (const trackId of record.affectedTrackIds ?? []) {
    for (const component of packetComponentsByTrack.get(trackId) ?? []) {
      push(component.officialSourceUrl, "packet_set_same_track", `${PACKET_SETS}:${component.packetSetId}/${component.componentId} (track ${trackId})`);
    }
  }

  // 5. the workbook's landing page for this jurisdiction
  for (const url of checklistUrlsByCode.get(record.jurisdiction) ?? []) {
    push(url, "forms_links_workbook", "docs/record-clearing/official-source-download-checklist.md");
  }

  // Official publishers only, deduplicated, strongest match first.
  const seen = new Set();
  const rank = { register_source_receipt: 0, packet_set_official_form_id: 1, committed_url_filename_match: 2, packet_set_same_track: 3, forms_links_workbook: 4 };
  return out
    .filter((c) => c.publisher === "government" || c.publisher === "court_or_judicial")
    .filter((c) => (seen.has(c.url + c.matchedBy) ? false : seen.add(c.url + c.matchedBy)))
    .sort((a, b) => (Number(b.binary) - Number(a.binary)) || (rank[a.matchedBy] - rank[b.matchedBy]));
}

// --------------------------------------------------------------------------- build
const assets = [];
for (const record of register.records) {
  const candidates = candidatesFor(record);
  const exact = candidates.filter((c) => c.binary);
  const landing = candidates.filter((c) => !c.binary);

  const classification = exact.length > 0
    ? "exact_official_binary_url"
    : landing.length > 0
      ? "official_landing_page"
      : "no_source_identified";

  const localCopy = record.sourceSha256 ? inventoryBySha.get(record.sourceSha256) ?? null : null;
  const namedCopies = formTokens(record).flatMap((t) => inventoryByName.get(t) ?? []);

  assets.push({
    assetId: record.identity,
    jurisdiction: record.jurisdiction,
    formId: record.formId,
    formTitle: record.formTitle,
    revision: record.revision ?? null,
    declaredSourceSha256: record.sourceSha256 ?? null,
    binaryPresentInClone: record.binaryPresent === true,
    structuralClass: record.structuralClass,
    section: record.section,
    postLaunchPriority: record.postLaunchPriority ?? null,
    affectedTrackIds: record.affectedTrackIds ?? [],
    familyIds: record.familyIds ?? [],
    classification,
    acquisition: classification === "exact_official_binary_url"
      ? {
        url: exact[0].url,
        publisher: exact[0].publisher,
        host: exact[0].host,
        matchedBy: exact[0].matchedBy,
        evidence: exact[0].evidence,
        alternates: exact.slice(1, 4).map((c) => c.url)
      }
      : null,
    landingPages: landing.slice(0, 4).map((c) => ({ url: c.url, host: c.host, matchedBy: c.matchedBy, evidence: c.evidence })),
    inventoryEvidence: {
      exactShaInNationwideInventory: localCopy ? { relativePath: localCopy.relativePath, sizeBytes: localCopy.sizeBytes } : null,
      sameNameFilesInNationwideInventory: [...new Set(namedCopies.map((f) => f.relativePath))].slice(0, 4),
      d1ImplementationPackage: [...(record.familyIds ?? [])]
        .map((f) => d1ByJurisdictionFamily.get(`${record.jurisdiction}|${normalize(String(f).split(":").pop())}`))
        .filter(Boolean)
        .map((f) => ({ family: f.family, mapKind: f.mapKind, status: f.status, holds: f.holds }))
    },
    formsAuditBucket: (formsAudit.needsOfficialSourceConfirmation ?? []).some((s) => String(s).toUpperCase().startsWith(record.jurisdiction))
      ? "needs_official_source_confirmation"
      : null
  });
}

const tally = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const byClassification = tally(assets, (a) => a.classification);
const acquirable = assets.filter((a) => a.classification === "exact_official_binary_url");

const queue = {
  schemaVersion: "rcap-pdf-source-acquisition-queue/v1",
  generatedBy: "scripts/generate-rcap-pdf-source-acquisition-queue.mjs",
  downloadsNothing:
    "This generator resolves locations only. Every acquisition happens in .github/workflows/rcap-pdf-source-acquisition.yml, which is the only place in this system with egress to a court or agency host — the agent container's network policy answers 403 to those hosts at CONNECT.",
  changesNoRuntime: true,
  changesNoRouteSellability: true,
  reconciledAgainst: {
    officialFormsLinksWorkbook: ["docs/record-clearing/official-source-download-checklist.md", "docs/record-clearing/missing-official-forms-audit.json"],
    committedSourceReceipts: "data/rcap-all50/problematic-pdf-register.json (sourceUrl, sourceSha256, revision)",
    formInventories: ["data/rcap-all50/nationwide-source-inventory.json", "data/rcap-all50/overlays/production/implementation-index.json"],
    firstPartyUrls: { corpus: "every http(s) URL committed under data/ and docs/", packetSets: PACKET_SETS, packetSetsSource, distinctUrls: urlCorpus.size }
  },
  publisherRule: "Only a government or court/judicial host may enter the queue. A mirror, a law-firm copy or an aggregator is not an official source and is dropped before classification.",
  totals: {
    assets: assets.length,
    byClassification,
    assetsMatchedToExistingOfficialSources: assets.filter((a) => a.classification !== "no_source_identified").length,
    acquirableNow: acquirable.length,
    landingPagesNeedingDirectPdfResolution: byClassification.official_landing_page ?? 0,
    genuinelySourceless: byClassification.no_source_identified ?? 0,
    byJurisdiction: tally(acquirable, (a) => a.jurisdiction)
  },
  matrix: {
    note: "One matrix entry per acquirable asset. The workflow shards this list and downloads concurrently.",
    entries: acquirable.map((a) => ({
      assetId: a.assetId,
      jurisdiction: a.jurisdiction,
      formId: a.formId,
      url: a.acquisition.url,
      expectedSha256: a.declaredSourceSha256,
      expectedRevision: a.revision,
      publisher: a.acquisition.publisher,
      outputPath: `data/record-clearing/official-sources/${a.jurisdiction}/${String(a.formId).replace(/[^A-Za-z0-9._-]/g, "-")}${/\.[A-Za-z0-9]+$/.test(a.formId) ? "" : ".pdf"}`
    }))
  },
  assets
};

function md() {
  const l = [];
  l.push("# PDF source acquisition queue");
  l.push("");
  l.push(`All **${assets.length}** problematic-PDF assets, reconciled against the official forms-links`);
  l.push("workbook, the committed source receipts, the existing form inventories and every");
  l.push("first-party URL this repository already holds.");
  l.push("");
  l.push("| Classification | Assets |");
  l.push("|---|---|");
  for (const k of ["exact_official_binary_url", "official_landing_page", "no_source_identified"]) {
    l.push(`| \`${k}\` | ${byClassification[k] ?? 0} |`);
  }
  l.push("");
  l.push(`**${queue.totals.assetsMatchedToExistingOfficialSources}** of ${assets.length} matched to an existing official source.`);
  l.push("");
  l.push("## Publisher rule");
  l.push("");
  l.push("Only a government or court/judicial host enters the queue. A mirror, a law-firm copy or");
  l.push("an aggregator is not an official source and is dropped before classification, so a");
  l.push("convenient copy can never become the thing we hand a participant.");
  l.push("");
  l.push("## Acquisition happens in Actions, not here");
  l.push("");
  l.push("This container's network policy answers `403` to court and agency hosts at CONNECT —");
  l.push("`public.courts.alaska.gov` and `www.courts.ca.gov` were both refused at the gateway. The");
  l.push("branch-triggered workflow `.github/workflows/rcap-pdf-source-acquisition.yml` runs the");
  l.push("matrix where egress exists, and accepts a binary only after publisher, URL, revision,");
  l.push("content type, page count and SHA-256 all check out.");
  l.push("");
  l.push(`Matrix entries: **${acquirable.length}**, across ${Object.keys(queue.totals.byJurisdiction).length} jurisdictions.`);
  l.push("");
  l.push("| Jurisdiction | Acquirable now |");
  l.push("|---|---|");
  for (const [k, v] of Object.entries(queue.totals.byJurisdiction).sort((a, b) => b[1] - a[1])) l.push(`| ${k} | ${v} |`);
  l.push("");
  l.push("## Landing pages needing direct-PDF resolution");
  l.push("");
  l.push(`**${queue.totals.landingPagesNeedingDirectPdfResolution}** assets have an official landing page but no direct binary URL. The workflow`);
  l.push("does not guess a binary from a landing page; resolving those is a named follow-up.");
  l.push("");
  l.push("## Genuinely sourceless");
  l.push("");
  l.push(`**${queue.totals.genuinelySourceless}** assets have no official URL anywhere in this repository. Each is either a`);
  l.push("retirement candidate or a source-research obligation — the retirement lane decides which,");
  l.push("in `data/rcap-ledger/pdf-retirement-dispositions.json`.");
  l.push("");
  l.push("Regenerate with `node scripts/generate-rcap-pdf-source-acquisition-queue.mjs`.");
  return l.join("\n") + "\n";
}

const jsonText = JSON.stringify(queue, null, 2) + "\n";
const mdText = md();

if (CHECK) {
  const problems = [];
  if (read(JSON_OUT) !== jsonText) problems.push(`${JSON_OUT} is stale.`);
  if (read(MD_OUT) !== mdText) problems.push(`${MD_OUT} is stale.`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`acquisition queue current: ${assets.length} asset(s), ${acquirable.length} acquirable.`);
  process.exit(0);
}

fs.mkdirSync(path.join(rootDir, path.dirname(JSON_OUT)), { recursive: true });
fs.writeFileSync(path.join(rootDir, JSON_OUT), jsonText);
fs.writeFileSync(path.join(rootDir, MD_OUT), mdText);
console.log(`wrote ${JSON_OUT} and ${MD_OUT}`);
console.log(`  classification: ${JSON.stringify(byClassification)}`);
console.log(`  matrix entries: ${acquirable.length}`);
console.log(`  url corpus: ${urlCorpus.size} distinct committed URLs (packet sets from ${packetSetsSource})`);
