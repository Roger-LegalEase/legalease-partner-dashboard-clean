#!/usr/bin/env node
// Reconciles every problematic-PDF asset that has no pinned official source
// against the link inventory the repository already holds, and emits the
// acquisition queue the branch workflow consumes as a matrix.
//
// The point of the reconciliation is to stop re-researching forms. Where a
// family source-record, a sibling family for the same document, or another
// recorded artifact already names the issuing body's URL, that URL is the
// answer and no research is warranted. Only what survives that join is a
// genuine research question.
//
// Three sets come out, and they mean different things:
//   set 1  exact_official_url_known        - a direct binary URL is recorded;
//                                            fetch it now.
//   set 2  official_landing_page_known     - the issuing body's page is known
//                                            but the binary URL is not; fetch
//                                            the page so the binary can be
//                                            resolved from it.
//   set 3  no_official_source_identified   - nothing in the repository names an
//                                            official source. Research, not
//                                            fetching, is the next step.
//
// Nothing here decides currentness, edition, supersession or intended use. A
// URL recorded in this repository is a lead, not a proof that the bytes behind
// it are the current official form.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAYS = path.join(rootDir, "data/rcap-all50/overlays/production");
const MASTER = path.join(rootDir, "data/rcap-all50/problematic-pdf-master-list.json");
const OUT = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");

// Issuing bodies, per jurisdiction. A URL on any other host is not this
// jurisdiction's official source however plausible it looks, so the join
// refuses it rather than guessing.
const OFFICIAL_HOSTS = {
  AK: ["public.courts.alaska.gov", "courts.alaska.gov", "www.courts.alaska.gov"],
  AL: ["judicial.alabama.gov", "www.alacourt.gov", "alacourt.gov", "paroles.alabama.gov"],
  AR: ["www.arcourts.gov", "arcourts.gov", "courts.arkansas.gov", "www.courts.arkansas.gov"],
  KY: ["www.kycourts.gov", "kycourts.gov"],
  NC: ["www.nccourts.gov", "nccourts.gov"],
  NE: ["nebraskajudicial.gov", "www.nebraskajudicial.gov", "supremecourt.nebraska.gov"],
  VA: ["www.vacourts.gov", "vacourts.gov"],
  VT: ["www.vtcourts.gov", "vtcourts.gov"],
  WI: ["www.wicourts.gov", "wicourts.gov", "www.wisdoj.gov", "wisdoj.gov"]
};

const isDirectBinaryLink = (link) => isDirectBinary(link.url);
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// A URL is treated as a direct binary only when the path itself says so, or
// when a query parameter names the file. A landing page that happens to link a
// PDF is still a landing page.
function isDirectBinary(url) {
  try {
    const u = new URL(url);
    if (/\.(pdf|docx?|rtf)$/i.test(u.pathname)) return true;
    if (/\.(pdf|docx?)\?/i.test(url)) return true;
    return false;
  } catch { return false; }
}

// A URL with no extension can still be a binary: Vermont publishes forms as
// /media/<id>. The evidence that it is one is that a family source-record which
// names this URL also records a structural class read off inspected bytes. That
// is weaker than an extension and is labelled differently in the output.
const INSPECTED_URLS = new Map(); // url -> family path

// The filename stem, so a form published as 334.pdf matches AOC-334 even though
// the numeric token alone is too short to search a whole path for.
function stemOf(url) {
  try { return norm(path.basename(new URL(url).pathname).replace(/\.[a-z0-9]+$/i, "")); }
  catch { return ""; }
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

// Every distinguishable way this asset might be named in a URL. Tokens shorter
// than four characters are dropped: "29" would match any URL containing 29.
function tokensFor(row, record) {
  const raw = [row.formNumber, row.formName, record?.documentId, path.basename(row.formName ?? "", path.extname(row.formName ?? ""))];
  const out = new Set();
  for (const r of raw) {
    if (!r) continue;
    const base = String(r).replace(/\.(pdf|html?|docx?)$/i, "");
    const n = norm(base);
    if (n.length >= 4) out.add(n);
    out.add(`stem:${n}`);
    // AOC-CR-287 is published as cr287 on the issuing body's site; the agency
    // prefix is how the court names it, not how the file is named.
    const stripped = n.replace(/^aoc(cr|cv|e)?/, "");
    if (stripped.length >= 4 && stripped !== n) out.add(stripped);
    if (stripped.length >= 2 && stripped !== n) out.add(`stem:${stripped}`);
  }
  return [...out].sort();
}

// ---- link inventory ---------------------------------------------------------
// Everything the repository already knows about official URLs, gathered once
// and keyed by host so a match can never cross jurisdictions.
function harvestLinkInventory() {
  const links = new Map(); // url -> Set(source paths)
  const record = (url, from) => {
    const clean = String(url).replace(/[).,;"'\]]+$/, "");
    if (!/^https?:\/\//.test(clean)) return;
    if (!links.has(clean)) links.set(clean, new Set());
    links.get(clean).add(from);
  };

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir).sort()) {
      const abs = path.join(dir, entry);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) { walk(abs); continue; }
      if (!/\.(json|csv|md)$/i.test(entry)) continue;
      if (stat.size > 4_000_000) continue;
      // This generator's own output must never be an input. An earlier run's
      // unverified pattern candidates would otherwise be read back as recorded
      // official URLs, and a guess would launder itself into a source of truth.
      if (path.resolve(abs) === path.resolve(OUT)) continue;
      const rel = path.relative(rootDir, abs);
      const text = fs.readFileSync(abs, "utf8");
      // Any file this lane generates that carries URLs copied out of the queue
      // is the queue talking to itself. The recovery record does exactly that,
      // and reading it back promoted three unverified pattern candidates into
      // "recorded official URLs" a second time -- the same laundering the queue
      // exclusion was added to stop, through a different file.
      if (/rcap-source-acquisition-queue\/|rcap-acquisition-recovery\/|rcap-source-acquisition-run-log\//.test(text)) continue;
      for (const m of text.matchAll(/https?:\/\/[A-Za-z0-9._~:/?#@!$&*+,;=%-]+/g)) record(m[0], rel);
    }
  };
  walk(path.join(rootDir, "data/rcap-all50"));
  walk(path.join(rootDir, "data/rcap-ledger"));
  walk(path.join(rootDir, "data/rcap-codex"));
  walk(path.join(rootDir, "docs/record-clearing"));

  const byJurisdiction = {};
  for (const [jurisdiction, hosts] of Object.entries(OFFICIAL_HOSTS)) {
    const set = new Set(hosts);
    byJurisdiction[jurisdiction] = [...links.entries()]
      .filter(([url]) => set.has(hostOf(url) ?? ""))
      .map(([url, from]) => ({ url, recordedIn: [...from].sort() }))
      .sort((a, b) => a.url.localeCompare(b.url));
  }
  return byJurisdiction;
}

// ---- family records ---------------------------------------------------------
const familyRecords = new Map(); // "<STATE>/<family>" -> record
const recordsByDocument = new Map(); // "<STATE>|<normalized document id>" -> [record]
for (const state of fs.existsSync(OVERLAYS) ? fs.readdirSync(OVERLAYS).sort() : []) {
  const stateDir = path.join(OVERLAYS, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const family of fs.readdirSync(stateDir).sort()) {
    const file = path.join(stateDir, family, "source-record.json");
    if (!fs.existsSync(file)) continue;
    const record = JSON.parse(fs.readFileSync(file, "utf8"));
    record.__family = `${state}/${family}`;
    if (record.sourceUrl && record.structuralClassObserved) {
      INSPECTED_URLS.set(record.sourceUrl, `data/rcap-all50/overlays/production/${state}/${family}/source-record.json`);
    }
    familyRecords.set(`${record.jurisdiction}|${family}`, record);
    for (const token of [record.documentId, family].filter(Boolean)) {
      const key = `${record.jurisdiction}|${norm(String(token).replace(/-(form|instructions?|summary)?-?(en|es)$/i, ""))}`;
      if (!recordsByDocument.has(key)) recordsByDocument.set(key, []);
      recordsByDocument.get(key).push(record);
    }
  }
}

const inventory = harvestLinkInventory();
const master = JSON.parse(fs.readFileSync(MASTER, "utf8"));

const set1 = [];
const set2 = [];
const set3 = [];

for (const row of master.rows) {
  const jurisdiction = row.jurisdiction;
  const familyKey = (row.formFamilyIds ?? [])[0] ?? null;
  const familySlug = familyKey ? familyKey.split(":")[1] : null;
  const record = familySlug ? familyRecords.get(`${jurisdiction}|${familySlug}`) ?? null : null;
  const tokens = tokensFor(row, record);
  const pool = inventory[jurisdiction] ?? [];

  const entry = {
    // Group is assigned at the end, once the URL is known: A direct binary,
    // B issuing-body page needing resolution, C nothing identified.
    acquisitionGroup: null,
    jurisdiction,
    assetId: row.assetId,
    formName: row.formName,
    formNumber: row.formNumber,
    // The issuing body, and the edition this repository already has on record.
    // Both are what an acquired file has to be compared against; neither is
    // established by fetching.
    publisher: row.sourcePublisher ?? record?.sourceUrl ? (row.sourcePublisher ?? null) : null,
    expectedRevision: row.sourceRevision ?? record?.revision ?? null,
    pinnedHistoricalSha256: row.sourceSha256 ?? null,
    routeOrFamilyDependency: {
      compiledPathwayIds: row.affectedCompiledPathwayIds ?? [],
      trackIds: row.affectedTrackIds ?? [],
      formFamilyIds: row.formFamilyIds ?? [],
      legalDesignFormId: row.candidateRegistryFormId ?? null,
      anyIntendedPaidPathway: Boolean(row.sellable || row.publicPacketRoute || row.packetCapable)
    },
    acquisitionPriority: row.acquisitionPriority,
    acquisitionRule: row.acquisitionRule,
    disposition: row.disposition,
    sourceSha256: row.sourceSha256 ?? null,
    sourceBinaryPresentInClone: row.sourceBinaryPresentInClone === true,
    matchTokens: tokens,
    url: null,
    urlKind: null,
    reconciliation: null,
    reconciledFrom: []
  };

  // 1. The asset's own recorded source. Nothing to reconcile.
  if (row.officialSourceUrl) {
    // Several rows record more than one URL in a single cell, pipe-separated.
    // Fetching the literal cell would request a URL that does not exist.
    const recorded = String(row.officialSourceUrl)
      .split(/\s*\|\s*|\s+/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//.test(u));
    const preferred = recorded.find(isDirectBinary) ?? recorded[0] ?? null;
    if (preferred) {
      entry.url = preferred;
      if (recorded.length > 1) entry.additionalRecordedUrls = recorded.filter((u) => u !== preferred);
      entry.reconciliation = "already_recorded_on_this_asset";
      entry.reconciledFrom = ["data/rcap-all50/problematic-pdf-master-list.json"];
    }
  }

  // 2. A sibling family for the same document already carries the URL. The
  //    instructions sheet and the form are published from one page; when one
  //    of them is pinned the other is not a research question.
  if (!entry.url && record?.documentId) {
    const key = `${jurisdiction}|${norm(String(record.documentId))}`;
    const sibling = (recordsByDocument.get(key) ?? []).find((r) => r.sourceUrl);
    if (sibling) {
      entry.url = sibling.sourceUrl;
      entry.reconciliation = "inherited_from_sibling_family_for_the_same_document";
      entry.reconciledFrom = [`data/rcap-all50/overlays/production/${sibling.__family}/source-record.json`];
    }
  }

  // 3. The link inventory names a URL on this jurisdiction's issuing body whose
  //    path carries this asset's form token.
  if (!entry.url && tokens.length > 0) {
    const hits = pool.filter((link) => {
      const p = norm(new URL(link.url).pathname + new URL(link.url).search);
      const stem = stemOf(link.url);
      return tokens.some((t) => (t.startsWith("stem:") ? stem === t.slice(5) : p.includes(t)));
    });
    // CC-6-12 is a substring of CC-6-12-a, which is a different form. An exact
    // filename match outranks a containment match every time.
    const exactStems = new Set(tokens.filter((t) => t.startsWith("stem:")).map((t) => t.slice(5)));
    const rank = (h) => (exactStems.has(stemOf(h.url)) ? 0 : 2) + (isDirectBinary(h.url) ? 0 : 1);
    const ordered = [...hits].sort((a, b) => rank(a) - rank(b) || a.url.localeCompare(b.url));
    const chosen = ordered[0];
    if (chosen) {
      entry.url = chosen.url;
      entry.reconciliation = "matched_against_the_repository_link_inventory_by_form_token";
      entry.reconciledFrom = chosen.recordedIn;
      entry.allMatches = ordered.map((h) => h.url);
    }
  }

  // 4. No form-level match, but the issuing body's forms index is known. That
  //    resolves to a binary only after the page is read, so it is set 2.
  if (!entry.url) {
    const landing = pool
      .filter((link) => !isDirectBinary(link.url))
      .filter((link) => /form|expung|seal|record|relief|clear/i.test(link.url))
      .sort((a, b) => a.url.length - b.url.length)[0];
    if (landing) {
      entry.url = landing.url;
      entry.urlKind = "official_landing_page";
      entry.reconciliation = "no_form_level_url_recorded_falling_back_to_the_issuing_bodys_index_page";
      entry.reconciledFrom = landing.recordedIn;
    }
  }

  if (!entry.url) {
    entry.acquisitionGroup = "C";
    entry.reconciliation = "no_official_url_for_this_jurisdiction_is_recorded_anywhere_in_the_repository";
    // A sibling form published in the same directory of the same issuing body
    // suggests where this one would live. That is a guess about a URL, not an
    // identification of a source, so it stays in set 3 and is never treated as
    // a recorded official source.
    const stem = norm(String(row.formNumber ?? "").replace(/\.(pdf|html?)$/i, ""));
    const sibling = stem.length >= 3
      ? pool.filter(isDirectBinaryLink).find((link) => {
          const s = stemOf(link.url);
          return s.length >= 3 && s !== stem && s.slice(0, 2) === stem.slice(0, 2);
        })
      : null;
    if (sibling) {
      try {
        const u = new URL(sibling.url);
        const dir = u.pathname.replace(/[^/]*$/, "");
        const ext = (u.pathname.match(/\.[a-z0-9]+$/i) ?? [".pdf"])[0];
        // Mirror how the issuing body actually names files in that directory:
        // Nebraska publishes CC-6-15.1 as CC-6-15-1.pdf, Alaska publishes
        // TF-800 as tf-800.pdf. Guessing the number but not the convention
        // produces a URL that is wrong for a reason we already knew.
        const siblingStemRaw = path.basename(new URL(sibling.url).pathname).replace(/\.[a-z0-9]+$/i, "");
        const lowercased = siblingStemRaw === siblingStemRaw.toLowerCase();
        const dotted = siblingStemRaw.includes(".");
        let candidateStem = String(row.formNumber).replace(/\.(pdf|html?)$/i, "");
        if (!dotted) candidateStem = candidateStem.replace(/\./g, "-");
        candidateStem = lowercased ? candidateStem.toLowerCase() : candidateStem.toUpperCase();
        entry.unverifiedPatternCandidateUrl = `${u.origin}${dir}${candidateStem}${ext}`;
        entry.unverifiedPatternCandidateBasis = `${sibling.url} is published by the same issuing body from the same directory; this candidate is derived from that shape and has not been confirmed to exist`;
      } catch { /* leave the candidate unset */ }
    }
    set3.push(entry);
    continue;
  }

  // Only the URL itself may say it is a binary. A source-record that inspected
  // bytes and named this URL as their provenance is a useful hint, but it does
  // not establish that a GET of this URL returns those bytes rather than a page
  // linking to them. The hint is recorded; the classification stays honest, and
  // set 2 runs immediately anyway, so nothing is delayed by the caution.
  if (!entry.urlKind) {
    entry.urlKind = isDirectBinary(entry.url) ? "direct_binary" : "official_landing_page";
  }
  if (entry.urlKind === "official_landing_page" && INSPECTED_URLS.has(entry.url)) {
    entry.priorInspectionSuggestsBinary = true;
    entry.priorInspectionBasis = `${INSPECTED_URLS.get(entry.url)} names this URL as the provenance of bytes whose structural class was inspected; the fetch receipt's content type will settle whether the URL itself serves them`;
  }
  entry.acquisitionGroup = entry.urlKind === "direct_binary" ? "A" : "B";
  (entry.urlKind === "direct_binary" ? set1 : set2).push(entry);
}

const sortKey = (e) => `${e.acquisitionPriority}|${e.jurisdiction}|${e.formNumber}|${e.assetId}`;
for (const set of [set1, set2, set3]) set.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

// The matrix the workflow runs. Priority 4 is excluded by its own rule: those
// assets are orphaned or reference-only and must not be acquired without a
// named current use, so fetching them would be work nobody asked for.
const runnable = [...set1, ...set2].filter((e) => e.acquisitionPriority !== 4);

const payload = {
  schemaVersion: "rcap-source-acquisition-queue/v1",
  generatedBy: "scripts/generate-rcap-source-acquisition-queue.mjs",
  purpose: "Reconcile assets with no pinned official source against the link inventory this repository already holds, then emit the runnable acquisition matrix.",
  reconciliationOrder: [
    "already_recorded_on_this_asset",
    "inherited_from_sibling_family_for_the_same_document",
    "matched_against_the_repository_link_inventory_by_form_token",
    "no_form_level_url_recorded_falling_back_to_the_issuing_bodys_index_page"
  ],
  whatAUrlHereDoesNotEstablish: [
    "that the bytes behind it are the current official edition",
    "that it has not been superseded",
    "that this asset has a named current use"
  ],
  officialHostsByJurisdiction: OFFICIAL_HOSTS,
  totals: {
    masterListRows: master.rows.length,
    exactOfficialUrlKnown: set1.length,
    officialLandingPageKnown: set2.length,
    noOfficialSourceIdentified: set3.length,
    runnableNow: runnable.length,
    withheldByPriority4Rule: set1.length + set2.length - runnable.length,
    unverifiedPatternCandidatesToProbe: set3.filter((e) => e.unverifiedPatternCandidateUrl && e.acquisitionPriority !== 4).length
  },
  groups: {
    A: "direct official PDF URL known",
    B: "official landing page known, direct PDF resolution required",
    C: "no official source identified after reconciliation against every source record in this clone"
  },
  reconciledAgainst: [
    "each asset's own family source-record",
    "sibling families for the same document",
    "committed source receipts under data/rcap-codex",
    "the D-track queue and ledger evidence",
    "documentation under docs/record-clearing"
  ],
  notReconciledAgainst: "the official forms-links workbook. `private/Nationwide Record Clearing/` is not in this clone, so if that workbook holds URLs these sources do not, group C is an overcount. Mount it and re-run this generator.",
  sets: {
    exact_official_url_known: set1,
    official_landing_page_known: set2,
    no_official_source_identified: set3
  },
  probeMatrix: set3
    .filter((e) => e.unverifiedPatternCandidateUrl && e.acquisitionPriority !== 4)
    .map((e) => ({
      jurisdiction: e.jurisdiction,
      formNumber: e.formNumber,
      url: e.unverifiedPatternCandidateUrl,
      urlKind: "unverified_pattern_candidate",
      expectedSha256: "",
      assetId: e.assetId
    })),
  matrix: runnable.map((e) => ({
    jurisdiction: e.jurisdiction,
    formNumber: e.formNumber,
    url: e.url,
    urlKind: e.urlKind,
    expectedSha256: e.sourceSha256 ?? "",
    assetId: e.assetId
  }))
};

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
console.log(JSON.stringify(payload.totals, null, 1));
