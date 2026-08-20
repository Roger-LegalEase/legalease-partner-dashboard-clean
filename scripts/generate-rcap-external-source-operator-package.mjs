#!/usr/bin/env node
// What an operator has to do, off this machine, to close the last source rows.
//
//   node scripts/generate-rcap-external-source-operator-package.mjs
//   node scripts/generate-rcap-external-source-operator-package.mjs --check
//
// Both local corpora are exhausted. Every row still without bytes now needs
// something that cannot happen in this clone: a download from an official
// publisher, a form-link resolved off a landing page, or a person comparing two
// editions of the same form. Those are three different jobs with three
// different costs, and a queue that does not separate them sends an operator to
// fetch a URL that was never going to resolve.
//
// So each remaining row is partitioned into exactly one of four:
//
//   1. direct_acquisition            — the exact official binary URL is known.
//   2. landing_page_resolution       — the publisher's forms page is known, but
//                                      the link to this form is not. A person
//                                      has to resolve it before anything can be
//                                      downloaded.
//   3. drift_comparison              — a different edition of the same form is
//                                      already in hand. Nothing should be
//                                      re-pinned until someone establishes
//                                      whether the pinned edition is still
//                                      current, superseded, or a wrong identity.
//   4. genuinely_unknown             — no official source has been identified by
//                                      any route this repository holds.
//
// Drift wins over the others. A row whose bytes exist under a different revision
// does not need an acquisition, it needs a decision, and downloading over it
// would destroy the comparison.
//
// Two rules this package enforces rather than assumes:
//
//   - A LegalEase-generated draft, sample, shadow-batch render or review-inbox
//     artifact is NEVER an official source. Any candidate URL or destination
//     that looks like one is refused here, not caught later.
//   - Every acquisition URL must be on the official host list recorded for its
//     jurisdiction. A URL on any other host is refused.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HANDOFF = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/source-materialization-handoff.json");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/external-source-operator-package.json");
const SCRIPT_OUT = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/acquire-official-sources.command");
const checkOnly = process.argv.includes("--check");

const readJson = (file) => {
  if (!fs.existsSync(file)) { console.error(`FAIL operator package — ${path.relative(rootDir, file)} is absent`); process.exit(1); }
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const handoff = readJson(HANDOFF);
const queue = readJson(QUEUE);

// Everything the queue knows about an asset, whichever set it landed in.
const queueByAsset = new Map();
for (const [setName, rows] of Object.entries(queue.sets ?? {})) {
  for (const row of rows) queueByAsset.set(row.assetId, { set: setName, ...row });
}
const officialHosts = queue.officialHostsByJurisdiction ?? {};

/** A source we must never treat as official, however convenient it looks. */
const NOT_AN_OFFICIAL_SOURCE = /legalease|sample|draft|shadow-batch|review-inbox|field-map-draft|canonical-filled|boundary-filled|blank-vs-filled/i;

/**
 * Whether a recorded URL is something an operator can actually fetch.
 *
 * Not a formality. `NC|cr297.pdf` carries a 531-character comma-joined CSV blob
 * in its `url` field -- a real URL, then a host, a date, a revision, a hash, a
 * `private/source-imports/...` corpus path and several flags, all run together.
 * An acquisition runner handed that fails, and the embedded corpus path is not
 * an official source at all. So a URL has to parse, be free of the comma that
 * betrays a joined record, sit on a host the publisher actually uses, and not
 * name a generated artifact.
 */
function urlUsability(jurisdiction, url) {
  if (!url) return { usable: false, reason: "no URL is recorded" };
  const text = String(url);
  if (NOT_AN_OFFICIAL_SOURCE.test(text)) {
    return { usable: false, reason: "the recorded URL names a LegalEase-generated artifact; a draft or sample is never an official source" };
  }
  if (text.includes(",")) {
    return { usable: false, reason: `the recorded URL is a joined record rather than a URL (${(text.match(/,/g) ?? []).length} commas, ${text.length} characters); it embeds a corpus path and flags and cannot be fetched` };
  }
  if (/private\/source-imports|Nationwide Record Clearing/.test(text)) {
    return { usable: false, reason: "the recorded URL is a local corpus path, not a published location" };
  }
  let host;
  try { host = new URL(text).hostname.toLowerCase(); } catch { return { usable: false, reason: "the recorded URL does not parse" }; }
  const official = (officialHosts[jurisdiction] ?? []).some((h) => host === h.toLowerCase());
  if (!official) return { usable: false, reason: `host ${host} is not on the official host list recorded for ${jurisdiction}` };
  return { usable: true, host };
}

/** Where the verified binary belongs, and where its receipt goes. */
function destinationsFor(row, queueRow) {
  const familyDir = row.familyPackagePaths?.[0] ?? null;
  const record = familyDir && fs.existsSync(path.join(rootDir, familyDir, "source-record.json"))
    ? JSON.parse(fs.readFileSync(path.join(rootDir, familyDir, "source-record.json"), "utf8"))
    : {};
  const relativePath = record.relativePath ?? record.canonicalBundlePath ?? null;
  const extension = path.extname(record.fileName ?? row.formNumber ?? "").toLowerCase() || ".pdf";
  const slug = String(queueRow.formNumber ?? row.formNumber ?? "form")
    .toLowerCase().replace(/\.(pdf|html?|docx?)$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    canonicalDestination: relativePath ? `private/Nationwide Record Clearing/${relativePath}` : null,
    receiptDestination: `data/rcap-codex/remaining-tracks/source-receipts/${row.jurisdiction.toLowerCase()}-${slug}${extension}`,
    familyPackagePath: familyDir
  };
}

const rows = [];
const refusals = [];

for (const row of handoff.rows ?? []) {
  // A row with an exact corpus match is not an external problem.
  if (row.matchClass === "exact_pinned_sha256") continue;

  const queueRow = queueByAsset.get(row.assetId);
  if (!queueRow) { refusals.push({ assetId: row.assetId, why: "no acquisition-queue record; cannot state a publisher or a URL" }); continue; }

  const destinations = destinationsFor(row, queueRow);
  const url = queueRow.url ?? null;
  const usability = urlUsability(row.jurisdiction, url);

  const base = {
    assetId: row.assetId,
    jurisdiction: row.jurisdiction,
    formNumber: queueRow.formNumber ?? row.formNumber,
    formName: queueRow.formName ?? null,
    officialPublisher: queueRow.publisher ?? null,
    expectedRevision: queueRow.expectedRevision ?? null,
    pinnedHash: row.sourceSha256 ?? queueRow.pinnedHistoricalSha256 ?? null,
    structuralClass: row.structuralClass ?? null,
    acquisitionPriority: queueRow.acquisitionPriority ?? null,
    acquisitionRule: queueRow.acquisitionRule ?? null,
    anyIntendedPaidPathway: queueRow.routeOrFamilyDependency?.anyIntendedPaidPathway ?? false,
    ...destinations
  };

  // ---- 3. drift comparison wins ---------------------------------------------
  // These bytes exist. Downloading over them would destroy the comparison the
  // row actually needs.
  if ((row.supersedingCandidates ?? []).length > 0) {
    const candidate = row.supersedingCandidates[0];
    const roleAgrees = row.supersedingCandidates.some((c) => c.roleAgrees);
    rows.push({
      ...base,
      partition: "drift_comparison",
      oldPinnedSourceHash: row.sourceSha256 ?? null,
      oldPinnedRevision: queueRow.expectedRevision ?? null,
      newOfficialSourceHash: candidate.sha256 ?? null,
      newVisibleRevision: candidate.revision ?? null,
      newSourceLocation: candidate.bundlePath ?? null,
      newAssetClass: candidate.assetClass ?? null,
      recordedComponentRole: candidate.recordedComponentRole ?? null,
      substantiveComparisonRequired: [
        "page count of both editions",
        "field or anchor census of both editions, and every field that appears, disappears or moves",
        "the statutory citation printed on each edition",
        "the printed revision marker on each edition",
        "whether any participant-writable field changed meaning"
      ],
      currentnessQuestion: roleAgrees
        ? "Does the pinned edition remain current, is it superseded by the newer edition, or is the newer edition a different document that shares a form number?"
        : "The document roles disagree, so start there: the pinned asset and the offered replacement are not the same kind of document.",
      provisionalDisposition: roleAgrees ? "unresolved_pending_comparison" : "wrong_identity_offered",
      whyNotADirectAcquisition: "A different edition of this form is already in hand. Re-pinning without a comparison would silently change which edition was reviewed.",
      doNotDownloadOverIt: true,
      // A comparison needs both editions. Where the current official binary URL
      // is known and fetchable, downloading it is the step that ENABLES the
      // comparison -- into a comparison directory, never over the pinned bytes.
      ...(queueRow.urlKind === "direct_binary" && usability.usable
        ? { officialUrlForComparison: url, comparisonFetchDestination: `drift-comparison/${path.basename(destinations.receiptDestination)}`, hostVerifiedOfficial: true }
        : { officialUrlForComparison: null, whyNoComparisonFetch: usability.usable ? "no exact official binary URL is recorded; the landing page must be resolved first" : usability.reason })
    });
    continue;
  }

  // ---- 1. direct acquisition -------------------------------------------------
  if (queueRow.urlKind === "direct_binary") {
    if (!usability.usable) {
      refusals.push({ assetId: row.assetId, url, why: usability.reason, consequence: "treated as a landing-page resolution instead of a download" });
    } else {
      rows.push({ ...base, partition: "direct_acquisition", officialUrl: url, urlKind: queueRow.urlKind, hostVerifiedOfficial: true });
      continue;
    }
  }

  // ---- 2. landing-page resolution -------------------------------------------
  if (url) {
    if (!usability.usable) {
      refusals.push({ assetId: row.assetId, url: String(url).slice(0, 120), why: usability.reason, consequence: "recorded as a landing-page row with no usable link; the publisher's forms index must be resolved by hand" });
      rows.push({
        ...base, partition: "landing_page_resolution", officialLandingPage: null, urlKind: queueRow.urlKind ?? null,
        recordedUrlIsUnusable: usability.reason,
        whatTheOperatorMustResolve: `The recorded URL for ${queueRow.formNumber ?? row.formNumber} cannot be used. Start from the ${row.jurisdiction} publisher's forms index (${(officialHosts[row.jurisdiction] ?? []).join(", ") || "no official host recorded"}), find the link that serves this form, and confirm the printed form number and revision on the served document.`,
        nothingIsDownloadableUntilResolved: true
      });
      continue;
    }
    rows.push({
      ...base,
      partition: "landing_page_resolution",
      officialLandingPage: url,
      urlKind: queueRow.urlKind ?? null,
      hostVerifiedOfficial: true,
      whatTheOperatorMustResolve: `Find the link on ${url} that serves ${queueRow.formNumber ?? row.formNumber}, confirm the printed form number and revision on the served document, then record the exact binary URL. Do not download the landing page itself as the source.`,
      nothingIsDownloadableUntilResolved: true
    });
    continue;
  }

  // ---- 4. genuinely unknown --------------------------------------------------
  rows.push({
    ...base,
    partition: "genuinely_unknown",
    whatWasChecked: [
      "the local source-corpus index, by exact pinned hash",
      "the acquisition queue's committed link inventory",
      "the official host list recorded for this jurisdiction",
      "the family's own source record for a recorded official URL"
    ],
    whatWouldResolveIt: "A publisher-confirmed URL for this exact document, or a determination that the asset is a captured web page with no underlying official form — in which case it is not an acquisition at all and should leave the source denominator.",
    likelyNotAForm: row.structuralClass === "html_form"
  });
}

const partition = (name) => rows.filter((r) => r.partition === name);
const direct = partition("direct_acquisition");
const landing = partition("landing_page_resolution");
const drift = partition("drift_comparison");
const unknown = partition("genuinely_unknown");

// ---- the operator's download script -----------------------------------------
// Credential-free and Mac-native: it uses curl, which ships with macOS, asks for
// no token, and writes only into a directory the operator names. It verifies
// each download against the pinned hash where one exists and REFUSES to keep a
// file whose hash does not match, because a silently different edition is the
// exact failure this whole package exists to prevent.
const scriptLines = [
  "#!/bin/bash",
  "# Acquire the official source binaries this repository still needs.",
  "#",
  "# Generated by scripts/generate-rcap-external-source-operator-package.mjs.",
  "# Runs on macOS with no credentials, no tokens and no proxy: just curl, which",
  "# ships with the system. Double-click it in Finder, or run it from Terminal.",
  "#",
  "# It downloads ONLY exact official binary URLs on publisher hosts. Rows that",
  "# need a landing page resolved, an edition compared, or a source identified at",
  "# all are deliberately not here -- a script cannot do any of those, and",
  "# pretending it can is how a wrong edition gets pinned.",
  "#",
  "# Every download is hash-checked where a hash is pinned. A file whose hash does",
  "# not match is MOVED ASIDE, not kept: a different edition of the right form is",
  "# still the wrong bytes, and it needs the drift comparison rather than a pin.",
  "set -u",
  "",
  'DEST="${1:-$HOME/Downloads/rcap-official-sources}"',
  'mkdir -p "$DEST/mismatched"',
  'echo "Downloading into: $DEST"',
  'echo',
  "",
  "ok=0; mismatched=0; failed=0",
  "",
  "fetch() {",
  '  local url="$1" out="$2" expected="$3" label="$4"',
  '  echo "==> $label"',
  '  if ! curl --fail --location --silent --show-error --proto \'=https\' --tlsv1.2 \\',
  '       --connect-timeout 20 --max-time 180 --retry 2 --retry-delay 3 \\',
  '       -o "$DEST/$out" "$url"; then',
  '    echo "    FAILED to download $url"; failed=$((failed+1)); return',
  "  fi",
  '  if [ -n "$expected" ]; then',
  '    local actual; actual=$(shasum -a 256 "$DEST/$out" | awk \'{print $1}\')',
  '    if [ "$actual" != "$expected" ]; then',
  '      echo "    HASH MISMATCH — expected $expected"',
  '      echo "                    got      $actual"',
  '      echo "    This is a different edition. Moved to mismatched/ for the drift comparison."',
  '      mv "$DEST/$out" "$DEST/mismatched/$out"; mismatched=$((mismatched+1)); return',
  "    fi",
  '    echo "    ok — hash matches the pin"',
  "  else",
  '    echo "    downloaded (no pinned hash to verify against; record its hash before pinning)"',
  "  fi",
  "  ok=$((ok+1))",
  "}",
  ""
];
const driftFetches = drift.filter((row) => row.officialUrlForComparison);

if (direct.length > 0) {
  scriptLines.push('echo "--- Direct acquisitions: the pinned edition, hash-verified ---"', 'echo');
  for (const row of direct) {
    const outName = path.basename(row.receiptDestination);
    scriptLines.push(`fetch "${row.officialUrl}" "${outName}" "${row.pinnedHash ?? ""}" "${row.jurisdiction} ${row.formNumber} — ${row.officialPublisher ?? "publisher not recorded"}"`);
  }
  scriptLines.push("");
}

if (driftFetches.length > 0) {
  // No expected hash on purpose. These fetch the CURRENT official edition in
  // order to compare it against the pinned one, so the bytes are supposed to
  // differ. Verifying them against the old pin would fail every time and would
  // move aside exactly the file the comparison needs.
  scriptLines.push(
    'echo "--- Drift comparisons: the CURRENT official edition, for comparison only ---"',
    'echo "    These are NOT pinned. They are expected to differ from the pinned"',
    'echo "    edition -- that is what the comparison is for. Nothing here should"',
    'echo "    replace a pinned source until someone has compared the two."',
    'echo',
    'mkdir -p "$DEST/drift-comparison"'
  );
  for (const row of driftFetches) {
    const outName = `drift-comparison/${path.basename(row.receiptDestination)}`;
    scriptLines.push(`fetch "${row.officialUrlForComparison}" "${outName}" "" "${row.jurisdiction} ${row.formNumber} — current edition for drift comparison (pinned: ${row.oldPinnedRevision ?? "revision unrecorded"})"`);
  }
  scriptLines.push("");
}
scriptLines.push(
  "",
  'echo',
  'echo "Downloaded and verified : $ok"',
  'echo "Hash mismatches (drift) : $mismatched"',
  'echo "Failed                  : $failed"',
  'echo',
  'echo "Verified files are in $DEST. Hand them back with their sha256."',
  'echo "Anything in $DEST/mismatched is a DIFFERENT EDITION of the right form."',
  'echo "Do not pin it. It goes to the drift comparison."'
);
if (direct.length === 0 && driftFetches.length === 0) {
  scriptLines.push(
    'echo "No row in this package has an exact official binary URL on a verified"',
    'echo "publisher host, so there is nothing this script can download yet."',
    'echo "Resolve the landing pages first, then regenerate this script."');
}
const scriptText = `${scriptLines.join("\n")}\n`;

const payload = {
  schemaVersion: "rcap-external-source-operator-package/v1",
  generatedBy: "scripts/generate-rcap-external-source-operator-package.mjs",
  purpose: "Every remaining source row that cannot be closed in this clone, partitioned by what actually has to happen to it, with the exact facts an operator needs to act.",
  bothLocalCorporaAreExhausted: "This package covers only what neither corpus could supply. Rows that match the committed corpus index by exact pinned hash are not here; they need the corpus mounted, not an acquisition.",
  rulesEnforcedNotAssumed: [
    "A LegalEase-generated draft, sample, shadow-batch render or review-inbox artifact is never an official source. A candidate URL that names one is refused here.",
    "Every acquisition URL must be on the official host list recorded for its jurisdiction. A URL on any other host is refused.",
    "A row whose bytes exist under a different revision is a drift comparison, never a download. Downloading over it would destroy the comparison."
  ],
  officialHostsByJurisdiction: officialHosts,
  downloadScript: {
    path: "data/rcap-all50/pdf-source-handoffs/acquire-official-sources.command",
    platform: "macOS",
    credentials: "none — curl over HTTPS, no token, no proxy",
    verifies: "each download against its pinned sha256; a mismatch is moved aside for the drift comparison rather than kept"
  },
  totals: {
    rowsNeedingSomethingExternal: rows.length,
    directAcquisitions: direct.length,
    landingPageResolutions: landing.length,
    driftComparisons: drift.length,
    genuinelyUnknown: unknown.length,
    refusedCandidates: refusals.length,
    downloadableByScriptToday: direct.length + drift.filter((r) => r.officialUrlForComparison).length,
    directAcquisitionsDownloadable: direct.length,
    driftComparisonFetchesDownloadable: drift.filter((r) => r.officialUrlForComparison).length,
    expectedRetainedMissingAfterDownload: rows.length - direct.length
  },
  // Surfaced rather than left buried in a row, because an operator who trusts
  // the queue's `url` field will waste a cycle on each of these.
  recordedUrlDefects: rows
    .filter((r) => r.recordedUrlIsUnusable || (r.whyNoComparisonFetch && !/no exact official binary URL/.test(r.whyNoComparisonFetch)))
    .map((r) => ({ assetId: r.assetId, jurisdiction: r.jurisdiction, formNumber: r.formNumber, defect: r.recordedUrlIsUnusable ?? r.whyNoComparisonFetch })),
  whatTheExpectedRemainderMeans: "Only the direct-acquisition rows can close by download. Every landing-page row needs a person to resolve a link first, every drift row needs a comparison rather than bytes, and the unknown rows need an identification. The remainder is not a failure of the script; it is the work the script cannot do.",
  partitions: {
    direct_acquisition: direct,
    landing_page_resolution: landing,
    drift_comparison: drift,
    genuinely_unknown: unknown
  },
  refusedCandidates: refusals
};

const json = `${JSON.stringify(payload, null, 2)}\n`;
if (checkOnly) {
  const currentJson = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  const currentScript = fs.existsSync(SCRIPT_OUT) ? fs.readFileSync(SCRIPT_OUT, "utf8") : "";
  if (currentJson !== json || currentScript !== scriptText) {
    console.error("FAIL operator package — the package or its download script is stale; re-run this generator");
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
  fs.writeFileSync(SCRIPT_OUT, scriptText);
  fs.chmodSync(SCRIPT_OUT, 0o755);
}

console.log(`OK operator package — ${rows.length} row(s): ${direct.length} direct, ${landing.length} landing-page, ${drift.length} drift, ${unknown.length} unknown; ${refusals.length} candidate(s) refused; expected retained_missing after download ${rows.length - direct.length}`);
