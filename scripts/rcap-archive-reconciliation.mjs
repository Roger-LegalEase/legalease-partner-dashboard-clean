#!/usr/bin/env node
// What the archives already hold for every asset the acquisition queue is
// still waiting on.
//
//   node scripts/rcap-archive-reconciliation.mjs
//   node scripts/rcap-archive-reconciliation.mjs --check
//
// The queue carries this caveat, and has since it was first generated:
//
//   "notReconciledAgainst": "the official forms-links workbook.
//    `private/Nationwide Record Clearing/` is not in this clone, so if that
//    workbook holds URLs these sources do not, group C is an overcount."
//
// The folder is still not in this clone. But an index of it IS committed —
// data/rcap-all50/nationwide-source-inventory.json, walked on the date it
// records, with a path, a byte length and a SHA-256 for all 425 files it found
// — and so is an index of the installed Master Library. Those two indices are
// enough to settle the caveat without mounting anything, because the question
// group C asks is "is there any record of an official source for this asset",
// and a file-level index is exactly such a record.
//
// Two things come out of the join, and they are different:
//
//   BINARIES.  An asset whose pinned hash appears in an archive index does not
//   need a URL researched. The bytes were at a named path in a named archive.
//   Its blocker is transport, not identification, and those are not the same
//   ask: one is "find this form", the other is "bring me the folder".
//
//   PAGES.  The archives also hold saved copies of issuing-body pages, named
//   after the URL slug they were saved from. Where a landing-page leg cannot be
//   fetched — Kentucky's page answers 404, every nccourts.gov URL answers 403 —
//   an archived copy of that same page is a candidate input for the resolver in
//   scripts/rcap-source-acquisition/landing-page-resolution.mjs, which is a
//   pure function of (html, url, form number) and needs no network at all.
//
// Nothing here promotes anything. An archive hit is a lead about where bytes
// were, not a determination that they are current, official or usable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");
const NATIONWIDE = path.join(rootDir, "data/rcap-all50/nationwide-source-inventory.json");
const CORPUS = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const OBSERVED = path.join(rootDir, "data/rcap-all50/source-observation-log.json");
const OUT = path.join(rootDir, "data/rcap-all50/archive-reconciliation.json");

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const queue = read(QUEUE);
const nationwide = read(NATIONWIDE);
const corpus = read(CORPUS);
const observed = read(OBSERVED);

const isSha256 = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const slugOf = (value) => String(value ?? "").toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---- what each archive holds ------------------------------------------------
const binaryByHash = new Map();
const pagesByState = new Map();
const PAGE_EXTENSIONS = new Set([".html", ".htm", ".aspx"]);

const rememberPage = (state, entry) => {
  if (!pagesByState.has(state)) pagesByState.set(state, []);
  pagesByState.get(state).push(entry);
};

for (const state of nationwide.states ?? []) {
  for (const file of state.files ?? []) {
    const sha = String(file.sha256 ?? "").toLowerCase();
    if (isSha256(sha)) {
      if (!binaryByHash.has(sha)) binaryByHash.set(sha, []);
      binaryByHash.get(sha).push({ archive: "nationwide", path: file.relativePath, byteLength: file.sizeBytes });
    }
    if (PAGE_EXTENSIONS.has(String(file.extension ?? "").toLowerCase())) {
      rememberPage(state.code, {
        archive: "nationwide",
        path: file.relativePath,
        byteLength: file.sizeBytes,
        capturedAt: file.mtime ?? null,
        slug: slugOf(file.fileName)
      });
    }
  }
}
for (const entry of corpus.entries ?? []) {
  const sha = String(entry.sha256 ?? "").toLowerCase();
  if (!isSha256(sha)) continue;
  if (!binaryByHash.has(sha)) binaryByHash.set(sha, []);
  binaryByHash.get(sha).push({ archive: "corpus", path: entry.path, byteLength: entry.byteLength });
}

const liveAcquired = new Set(
  (observed.observations ?? [])
    .filter((o) => o.outcome === "acquired" && isSha256(o.observedSha256))
    .map((o) => o.observedSha256)
);
// A refusal belongs to the URL, not to the leg. Five Kentucky legs share one
// Expungement page and six North Carolina legs share one document page, so a
// single observed 404 or 403 is evidence about every leg pointing at it.
const liveRefusalByUrl = new Map();
for (const observation of observed.observations ?? []) {
  if (observation.outcome === "acquired") continue;
  for (const url of [observation.requestedUrl, observation.finalUrl]) {
    if (url) liveRefusalByUrl.set(url, observation);
  }
}

/**
 * Archived copies of the page a landing-page leg points at.
 *
 * The archive names a saved page after the slug it was saved from, so the last
 * path segment of the URL is the join. A bare index — /documents/forms — joins
 * on its own last segment too, which is how forms.html is found.
 *
 * Deliberately reported as candidates. A file named for a URL is evidence that
 * someone saved that page, not proof of what it contained on the day it was
 * saved, and the resolver still has to run over the bytes.
 */
function archivedPagesFor(jurisdiction, url) {
  if (!url) return [];
  let segment;
  try {
    segment = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return [];
  }
  const wanted = slugOf(segment);
  if (!wanted) return [];
  return (pagesByState.get(jurisdiction) ?? [])
    .filter((page) => page.slug === wanted || page.slug.startsWith(`${wanted}-`) || wanted.startsWith(`${page.slug}-`))
    .map((page) => ({
      ...page,
      matchedOn: page.slug === wanted ? "the page filename is the URL's last path segment" : "the page filename shares the URL's last path segment as a prefix"
    }));
}

// ---- per-asset reconciliation ----------------------------------------------
const ROUTES = {
  already_observed_live: "an issuing body served these exact bytes in a recorded run; the source is identified and reachable",
  fetch_the_recorded_url: "a URL is recorded for this asset and no run has tested it",
  resolve_from_an_archived_page: "the recorded page cannot be fetched, and the archive holds a saved copy of that same page to resolve from",
  restore_from_archive: "no usable official URL, but the pinned bytes are at a named path in an archive index",
  still_unlocated: "no recorded URL, no live observation, and no archive index holds these bytes"
};

const rows = [];
for (const [setName, entries] of Object.entries(queue.sets ?? {})) {
  for (const entry of entries) {
    const pin = String(entry.pinnedHistoricalSha256 ?? "").toLowerCase();
    const inArchives = isSha256(pin) ? binaryByHash.get(pin) ?? [] : [];
    const archivedPages = archivedPagesFor(entry.jurisdiction, entry.url);
    const refusal = entry.url ? liveRefusalByUrl.get(entry.url) ?? null : null;
    // Kentucky's archived page is called Kentucky-Expungement-Forms.html and
    // the URL that now 404s ends in Expungement.aspx. Those may well be the
    // same page, and the slug join cannot show it — so the other pages the
    // archive holds for the jurisdiction are listed WITHOUT being called
    // candidates. A lead a person can follow, not a match this script asserts.
    const otherPages = refusal && archivedPages.length === 0
      ? (pagesByState.get(entry.jurisdiction) ?? []).map((page) => ({ path: page.path, byteLength: page.byteLength, capturedAt: page.capturedAt }))
      : [];

    let route;
    if (isSha256(pin) && liveAcquired.has(pin)) route = "already_observed_live";
    else if (entry.url && refusal && archivedPages.length > 0) route = "resolve_from_an_archived_page";
    else if (entry.url && !refusal) route = "fetch_the_recorded_url";
    else if (inArchives.length > 0) route = "restore_from_archive";
    else route = "still_unlocated";

    rows.push({
      acquisitionGroup: entry.acquisitionGroup,
      queueSet: setName,
      jurisdiction: entry.jurisdiction,
      formNumber: entry.formNumber,
      assetId: entry.assetId,
      acquisitionPriority: entry.acquisitionPriority,
      disposition: entry.disposition,
      recordedUrl: entry.url,
      recordedUrlKind: entry.urlKind,
      pinnedHistoricalSha256: entry.pinnedHistoricalSha256 ?? null,
      pinnedBytesInArchive: inArchives,
      archivedPageCandidates: archivedPages,
      otherArchivedPagesInJurisdiction: otherPages,
      lastObservedRefusal: refusal ? { httpStatus: refusal.httpStatus ?? null, failure: refusal.failure ?? null, jobId: refusal.jobId } : null,
      acquisitionRoute: route,
      routeMeans: ROUTES[route]
    });
  }
}
rows.sort((a, b) =>
  `${a.acquisitionPriority}|${a.jurisdiction}|${a.formNumber}`.localeCompare(`${b.acquisitionPriority}|${b.jurisdiction}|${b.formNumber}`)
);

const groupC = rows.filter((row) => row.acquisitionGroup === "C");
const countBy = (list, key) => list.reduce((acc, row) => ({ ...acc, [row[key]]: (acc[row[key]] ?? 0) + 1 }), {});

const nationwideExtensions = {};
for (const state of nationwide.states ?? []) {
  for (const file of state.files ?? []) {
    const extension = String(file.extension ?? "").toLowerCase() || "(none)";
    nationwideExtensions[extension] = (nationwideExtensions[extension] ?? 0) + 1;
  }
}

const payload = {
  schemaVersion: "rcap-archive-reconciliation/v1",
  generatedBy: "scripts/rcap-archive-reconciliation.mjs",
  purpose: "Settle the acquisition queue's own caveat — that group C was never reconciled against the Nationwide folder — using the committed file-level indices of that folder and of the Master Library.",
  theWorkbookQuestion: {
    theQueueSays: queue.notReconciledAgainst,
    whatTheIndexShows: `The committed index of that folder, walked ${nationwide.generatedAt ?? "on the date it records"}, lists ${Object.values(nationwideExtensions).reduce((a, b) => a + b, 0)} files across ${(nationwide.states ?? []).length} jurisdictions, by extension: ${Object.entries(nationwideExtensions).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}. There is no spreadsheet in it — no .xlsx, .xls, .csv or .tsv — so no forms-links workbook was present in the folder as walked.`,
    thereforeGroupCIs: "not an overcount because of a workbook. It is an overcount for a different and better-evidenced reason: the folder holds the FORMS themselves, and the pinned bytes of most group C assets are in it.",
    whatTheIndexCannotSettle: [
      "whether a workbook exists outside the walked folder, or was added after the walk",
      "whether the two folders the walk could not classify — " + JSON.stringify(nationwide.unknownFolders ?? []) + " — contain one",
      "whether any archived file is the current official edition"
    ]
  },
  whatAnArchiveHitEstablishes: [
    "that a file with these exact bytes existed at this path when the archive was walked"
  ],
  whatAnArchiveHitDoesNotEstablish: [
    "that the file can be obtained now — neither archive is in this clone",
    "that it is the current official edition, or was official when it was saved",
    "that a saved page's contents on the day it was saved match what its filename suggests"
  ],
  routeVocabulary: ROUTES,
  totals: {
    queueRows: rows.length,
    ...countBy(rows, "acquisitionRoute"),
    rowsWhosePinnedBytesAreInAnArchive: rows.filter((r) => r.pinnedBytesInArchive.length > 0).length,
    rowsWithAnArchivedPageCandidate: rows.filter((r) => r.archivedPageCandidates.length > 0).length,
    rowsRefusedWithNoPageCandidateButOtherArchivedPages: rows.filter((r) => r.archivedPageCandidates.length === 0 && r.otherArchivedPagesInJurisdiction.length > 0).length
  },
  groupCCorrection: {
    rowsInGroupC: groupC.length,
    groupCRowsWhosePinnedBytesAreInAnArchive: groupC.filter((r) => r.pinnedBytesInArchive.length > 0).length,
    groupCRowsStillUnlocated: groupC.filter((r) => r.acquisitionRoute === "still_unlocated").length,
    groupCPriority2RowsLocated: groupC.filter((r) => r.acquisitionPriority === 2 && r.pinnedBytesInArchive.length > 0).length,
    reading: "Group C means 'no official source identified after reconciliation against every source record in this clone'. It never meant the bytes were unknown, and for all but a few of these rows the bytes are indexed at a named path. The remaining work on those rows is to bring the archive, not to research a form."
  },
  assets: rows
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;
if (CHECK) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (existing !== serialized) {
    console.error("FAIL data/rcap-all50/archive-reconciliation.json is not what its generator produces. Run: node scripts/rcap-archive-reconciliation.mjs");
    process.exit(1);
  }
  console.log("OK the committed archive reconciliation matches its generator.");
} else {
  fs.writeFileSync(OUT, serialized);
  console.log(JSON.stringify({ totals: payload.totals, groupC: payload.groupCCorrection }, null, 1));
}
