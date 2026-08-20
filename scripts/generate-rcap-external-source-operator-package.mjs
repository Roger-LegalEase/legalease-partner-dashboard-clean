#!/usr/bin/env node
// What an operator has to do, off this machine, to close the last source rows.
//
//   node scripts/generate-rcap-external-source-operator-package.mjs
//   node scripts/generate-rcap-external-source-operator-package.mjs --check
//
// Regenerated from the canonical inventory head (the one carrying abed7631,
// "the operational corpus consumed"). The denominator is that head's own live
// row count, not this lane's earlier one: both corpora were mounted there and
// consumed against real bytes, which this clone cannot repeat -- private/ is
// not mounted here, so the corpus is read through the committed resolution
// record rather than re-hashed.
//
// Every remaining row needs something that cannot happen in a clone: a download
// from a publisher, a form-link resolved off a landing page, or a person
// comparing two editions. Those are three different jobs, and a queue that does
// not separate them sends an operator to fetch a URL that was never going to
// resolve.
//
//   1. direct_acquisition       — the exact official binary URL is known.
//   2. landing_page_resolution  — the publisher's forms index is known, the link
//                                 to this form is not. A person resolves it
//                                 before anything is downloadable.
//   3. drift_comparison         — a different edition is already in hand.
//                                 Nothing is re-pinned until someone decides
//                                 whether the pinned edition is current,
//                                 superseded, or a wrong identity.
//   4. genuinely_unknown        — no official source identified by any route.
//
// Three things are preserved by name because they were established the hard way
// and must not be quietly reclassified by a regeneration:
//
//   - VA CC-1473 stays a DRIFT COMPARISON. The canonical resolution files it as
//     exact_form_and_revision_found, which is true of the form number and the
//     revision and false of the bytes: the pinned hash and the corpus hash are
//     different editions. Its sibling cc1473inst is worse -- an instruction
//     sheet offered a petition form, which is a wrong identity, not a match.
//   - NC cr297's recorded URL stays an explicit REFUSED INPUT until someone
//     reconstructs it from the official landing page.
//   - A LegalEase draft, sample or shadow-batch render is a PROHIBITED DECOY and
//     never an official source, however exactly its filename matches.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESOLUTION = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/source-resolution.json");
const DISPOSITIONS = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/missing-binary-dispositions.json");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");
const DETERMINATION = path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/external-source-operator-package.json");
const SCRIPT_OUT = path.join(rootDir, "data/rcap-all50/pdf-source-handoffs/acquire-official-sources.command");
const checkOnly = process.argv.includes("--check");

const readJson = (file) => {
  if (!fs.existsSync(file)) { console.error(`FAIL operator package — ${path.relative(rootDir, file)} is absent`); process.exit(1); }
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const resolution = readJson(RESOLUTION);
const dispositions = readJson(DISPOSITIONS);
const queue = readJson(QUEUE);
const determination = readJson(DETERMINATION);
const officialHosts = queue.officialHostsByJurisdiction ?? {};

const dispositionByFamily = new Map((dispositions.rows ?? []).map((row) => [row.familyId, row]));
const queueByFamily = new Map();
for (const rows of Object.values(queue.sets ?? {})) {
  for (const row of rows) {
    for (const familyId of row.routeOrFamilyDependency?.formFamilyIds ?? []) {
      if (!queueByFamily.has(familyId)) queueByFamily.set(familyId, row);
    }
  }
}

/** Assets a LegalEase pipeline produced. Never a source, however well it matches. */
const PROHIBITED_DECOY = /legalease|sample|draft|shadow-batch|review-inbox|field-map-draft|canonical-filled|boundary-filled|blank-vs-filled/i;

/**
 * Whether a recorded URL is something an operator can actually fetch.
 *
 * NC cr297 carries a 531-character comma-joined record in its `url` -- a real
 * URL, then a host, a date, a revision, a hash, a private/source-imports corpus
 * path and several flags, run together. A runner handed that fails, and the
 * embedded corpus path is not a published location at all. So a URL must parse,
 * carry no comma, name no corpus path, sit on a host the publisher uses, and
 * not name a decoy.
 */
function urlUsability(jurisdiction, url) {
  if (!url) return { usable: false, reason: "no URL is recorded" };
  const text = String(url);
  if (PROHIBITED_DECOY.test(text)) return { usable: false, reason: "the recorded URL names a LegalEase-generated artifact; a draft or sample is a prohibited decoy, never an official source" };
  if (text.includes(",")) return { usable: false, reason: `the recorded URL is a joined record rather than a URL (${(text.match(/,/g) ?? []).length} commas, ${text.length} characters); it embeds a corpus path and flags and cannot be fetched` };
  if (/private\/source-imports|Nationwide Record Clearing/.test(text)) return { usable: false, reason: "the recorded URL is a local corpus path, not a published location" };
  let host;
  try { host = new URL(text).hostname.toLowerCase(); } catch { return { usable: false, reason: "the recorded URL does not parse" }; }
  if (!(officialHosts[jurisdiction] ?? []).some((h) => host === h.toLowerCase())) {
    return { usable: false, reason: `host ${host} is not on the official host list recorded for ${jurisdiction}` };
  }
  return { usable: true, host };
}

// Families preserved as drift regardless of how the resolution filed them, with
// the reason each is preserved. A regeneration must not quietly reclassify a
// finding that cost a comparison to establish.
const PRESERVED_AS_DRIFT = new Map([
  ["VA:cc1473", "The pinned edition and the corpus edition are different bytes under the same form number and revision. exact_form_and_revision_found is true of the identifiers and false of the document; re-pinning without comparing would silently change which edition was reviewed."],
  ["VA:cc1473inst", "This asset is the instruction sheet and the only CC-1473 asset in the corpus is the petition form. That is a wrong identity offered as a match, not a drift between editions, and accepting it would bind the family to a document it is not."]
]);

const assetByFamily = new Map();
for (const asset of determination.assets ?? []) {
  for (const familyId of asset.familyIds ?? []) assetByFamily.set(familyId, asset);
}

const rows = [];
const refusedInputs = [];
const excludedByTheCanonicalDenominator = [];

for (const row of resolution.rows ?? []) {
  const queueRow = queueByFamily.get(row.familyId) ?? {};
  const dispositionRow = dispositionByFamily.get(row.familyId) ?? {};
  const asset = assetByFamily.get(row.familyId) ?? null;
  const url = queueRow.url ?? null;
  const usability = urlUsability(row.jurisdiction, url);

  // The canonical denominator. The inventory head consumed both corpora with
  // them mounted; its liveness flag is the number of record, and this clone
  // cannot re-derive it against bytes it does not have.
  if (row.retiredFromOperationalInventory) {
    excludedByTheCanonicalDenominator.push({
      familyId: row.familyId,
      jurisdiction: row.jurisdiction,
      disposition: row.disposition,
      excludedBecause: "the canonical inventory head records this family as retired from the operational inventory",
      // Recorded, not argued: this lane's corrected probe disagrees, and the
      // disagreement is load-bearing for three of them.
      currentDeterminationSaysRetained: asset ? asset.determination === "retain_and_remediate" : null,
      namedByOperationalSurfaces: asset ? asset.useSites.map((s) => s.surface) : []
    });
    if (!usability.usable && url) {
      refusedInputs.push({ familyId: row.familyId, jurisdiction: row.jurisdiction, url: String(url).slice(0, 120), why: usability.reason, preserved: row.familyId === "NC:cr297" });
    }
    continue;
  }

  const base = {
    familyId: row.familyId,
    jurisdiction: row.jurisdiction,
    formNumber: queueRow.formNumber ?? row.formNumberCandidates?.[0] ?? null,
    formNumberCandidates: row.formNumberCandidates ?? [],
    officialPublisher: queueRow.publisher ?? null,
    expectedRevision: queueRow.expectedRevision ?? dispositionRow.pinnedRevision ?? null,
    pinnedHash: dispositionRow.pinnedSha256 ?? null,
    canonicalDisposition: row.disposition,
    identityProven: Boolean(row.identityProven),
    resolvedBy: row.resolvedBy ?? null,
    canonicalDestination: `private/Nationwide Record Clearing/ — the family's recorded relativePath`,
    receiptDestination: `data/rcap-all50/pdf-source-receipts/${row.jurisdiction.toLowerCase()}-${String(row.familyId.split(":")[1] ?? "form").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`
  };

  if (url && !usability.usable) {
    refusedInputs.push({ familyId: row.familyId, jurisdiction: row.jurisdiction, url: String(url).slice(0, 120), why: usability.reason, preserved: row.familyId === "NC:cr297" });
  }

  // ---- 3. drift comparison, including the preserved cases -------------------
  const preservedReason = PRESERVED_AS_DRIFT.get(row.familyId);
  if (row.disposition === "source_drift_requires_comparison" || preservedReason) {
    const competing = row.competingEditions ?? [];
    rows.push({
      ...base,
      partition: "drift_comparison",
      preservedAsDrift: Boolean(preservedReason),
      whyPreserved: preservedReason ?? null,
      oldPinnedSourceHash: dispositionRow.pinnedSha256 ?? null,
      oldPinnedRevision: dispositionRow.pinnedRevision ?? null,
      competingEditions: competing,
      newOfficialSourceHash: competing[0]?.sha256 ?? row.source?.sha256 ?? null,
      newVisibleRevision: competing[0]?.revision ?? row.source?.revision ?? null,
      substantiveComparisonRequired: [
        "page count of both editions",
        "field or anchor census of both, and every field that appears, disappears or moves",
        "the statutory citation printed on each",
        "the printed revision marker on each",
        "whether any participant-writable field changed meaning"
      ],
      currentnessQuestion: "Does the pinned edition remain current, is it superseded by the newer edition, or is the newer edition a different document sharing a form number?",
      provisionalDisposition: preservedReason && row.familyId === "VA:cc1473inst" ? "wrong_identity_offered" : "unresolved_pending_comparison",
      doNotDownloadOverIt: true,
      ...(queueRow.urlKind === "direct_binary" && usability.usable
        ? { officialUrlForComparison: url, comparisonFetchDestination: `drift-comparison/${path.basename(base.receiptDestination)}`, hostVerifiedOfficial: true }
        : { officialUrlForComparison: null, whyNoComparisonFetch: usability.usable ? "no exact official binary URL is recorded; the landing page must be resolved first" : usability.reason })
    });
    continue;
  }

  // ---- 1. direct acquisition -------------------------------------------------
  if (queueRow.urlKind === "direct_binary" && usability.usable) {
    rows.push({ ...base, partition: "direct_acquisition", officialUrl: url, urlKind: queueRow.urlKind, hostVerifiedOfficial: true });
    continue;
  }

  // ---- 4. genuinely unknown --------------------------------------------------
  if (row.disposition === "genuinely_no_official_source_identified") {
    rows.push({
      ...base,
      partition: "genuinely_unknown",
      whatWasChecked: resolution.searchOrder ?? dispositions.derivedFrom ?? [
        "the mounted Master Library, by exact pinned hash and by form number and revision",
        "the mounted Nationwide operational tree",
        "the acquisition queue's committed link inventory",
        "the official host list recorded for this jurisdiction"
      ],
      whatWouldResolveIt: "A publisher-confirmed URL for this exact document, or a determination that the asset is a captured web page with no underlying official form — in which case it is not an acquisition and should leave the source denominator.",
      likelyACapturedWebPage: /\.html?$/i.test(row.formNumberCandidates?.[0] ?? "")
    });
    continue;
  }

  // ---- 2. landing-page resolution -------------------------------------------
  rows.push({
    ...base,
    partition: "landing_page_resolution",
    officialLandingPage: usability.usable ? url : null,
    recordedUrlIsUnusable: usability.usable ? null : usability.reason,
    whatTheOperatorMustResolve: usability.usable
      ? `Find the link on ${url} that serves ${base.formNumber ?? row.familyId}, confirm the printed form number and revision on the served document, then record the exact binary URL. Do not download the landing page itself as the source.`
      : `The recorded URL cannot be used. Start from the ${row.jurisdiction} publisher's forms index (${(officialHosts[row.jurisdiction] ?? []).join(", ") || "no official host recorded"}), find the link that serves this form, and confirm the printed form number and revision on the served document.`,
    nothingIsDownloadableUntilResolved: true
  });
}

const partition = (name) => rows.filter((r) => r.partition === name);
const direct = partition("direct_acquisition");
const landing = partition("landing_page_resolution");
const drift = partition("drift_comparison");
const unknown = partition("genuinely_unknown");
const driftFetches = drift.filter((r) => r.officialUrlForComparison);

// ---- the operator's download script -----------------------------------------
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
  "# all are deliberately absent -- a script cannot do any of those, and",
  "# pretending it can is how a wrong edition gets pinned.",
  "#",
  "# No LegalEase draft, sample or shadow-batch render is ever fetched. Those are",
  "# prohibited decoys: they carry the right filenames and are not the form.",
  "set -u",
  "",
  'DEST="${1:-$HOME/Downloads/rcap-official-sources}"',
  'mkdir -p "$DEST/mismatched"',
  'echo "Downloading into: $DEST"',
  "echo",
  "",
  "ok=0; mismatched=0; failed=0",
  "",
  "fetch() {",
  '  local url="$1" out="$2" expected="$3" label="$4"',
  '  echo "==> $label"',
  "  if ! curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 \\",
  '       --connect-timeout 20 --max-time 180 --retry 2 --retry-delay 3 \\',
  '       -o "$DEST/$out" "$url"; then',
  '    echo "    FAILED to download $url"; failed=$((failed+1)); return',
  "  fi",
  '  if [ -n "$expected" ]; then',
  "    local actual; actual=$(shasum -a 256 \"$DEST/$out\" | awk '{print $1}')",
  '    if [ "$actual" != "$expected" ]; then',
  '      echo "    HASH MISMATCH — expected $expected"',
  '      echo "                    got      $actual"',
  '      echo "    A different edition. Moved to mismatched/ for the drift comparison."',
  '      mv "$DEST/$out" "$DEST/mismatched/$out"; mismatched=$((mismatched+1)); return',
  "    fi",
  '    echo "    ok — hash matches the pin"',
  "  else",
  '    echo "    downloaded (no pinned hash; record its sha256 before anything is pinned)"',
  "  fi",
  "  ok=$((ok+1))",
  "}",
  ""
];
if (direct.length > 0) {
  scriptLines.push('echo "--- Direct acquisitions: the pinned edition, hash-verified ---"', "echo");
  for (const row of direct) {
    scriptLines.push(`fetch "${row.officialUrl}" "${path.basename(row.receiptDestination)}" "${row.pinnedHash ?? ""}" "${row.jurisdiction} ${row.formNumber ?? row.familyId} — ${row.officialPublisher ?? "publisher not recorded"}"`);
  }
  scriptLines.push("");
}
if (driftFetches.length > 0) {
  // No expected hash on purpose: these fetch the CURRENT edition in order to
  // compare it against the pinned one, so the bytes are supposed to differ.
  // Verifying them against the old pin would move aside exactly the file the
  // comparison needs.
  scriptLines.push(
    'echo "--- Drift comparisons: the CURRENT official edition, for comparison only ---"',
    'echo "    NOT pinned. These are expected to differ from the pinned edition --"',
    'echo "    that is what the comparison is for. Nothing here replaces a pinned"',
    'echo "    source until someone has compared the two."',
    "echo",
    'mkdir -p "$DEST/drift-comparison"'
  );
  for (const row of driftFetches) {
    scriptLines.push(`fetch "${row.officialUrlForComparison}" "${row.comparisonFetchDestination}" "" "${row.jurisdiction} ${row.formNumber ?? row.familyId} — current edition for drift comparison (pinned: ${row.oldPinnedRevision ?? "revision unrecorded"})"`);
  }
  scriptLines.push("");
}
if (direct.length === 0 && driftFetches.length === 0) {
  scriptLines.push(
    'echo "No row in this package has an exact official binary URL on a verified"',
    'echo "publisher host, so there is nothing this script can download yet."',
    'echo "Resolve the landing pages first, then regenerate this script."');
}
scriptLines.push(
  "",
  "echo",
  'echo "Downloaded and verified : $ok"',
  'echo "Hash mismatches (drift) : $mismatched"',
  'echo "Failed                  : $failed"',
  "echo",
  'echo "Verified files are in $DEST. Hand them back with their sha256."',
  'echo "Anything in $DEST/mismatched is a DIFFERENT EDITION of the right form."',
  'echo "Do not pin it. It goes to the drift comparison."'
);
const scriptText = `${scriptLines.join("\n")}\n`;

const runtimeBound = excludedByTheCanonicalDenominator.filter((r) => r.currentDeterminationSaysRetained);

const payload = {
  schemaVersion: "rcap-external-source-operator-package/v2",
  generatedBy: "scripts/generate-rcap-external-source-operator-package.mjs",
  purpose: "Every live source row that cannot be closed in this clone, partitioned by what actually has to happen to it, regenerated from the canonical inventory head.",
  canonicalInventoryHead: {
    branch: "claude/rcap-pdf-inventory-closure-ty4m7x",
    contains: "abed7631 — the operational corpus consumed",
    denominator: "source-resolution.json liveRowsStillOutstanding",
    supersedes: "the 26-row denominator this lane emitted at 15894478, which predates the corpus being consumed"
  },
  corporaReconciliation: {
    masterLibraryMounted: dispositions.corpusMount?.masterLibraryMounted ?? null,
    nationwideSourceMounted: dispositions.corpusMount?.nationwideSourceMounted ?? null,
    mountedWhere: "the canonical inventory head, not this clone",
    thisCloneHasNoCorpus: !fs.existsSync(path.join(rootDir, "private")),
    consequence: "Both corpora were consumed against real bytes at the inventory head and the result is committed. This clone cannot re-hash them, so the corpus is reconciled through that committed record rather than re-read. Nothing here re-derives a corpus fact; it consumes one.",
    operationalManifestReconciled: dispositions.corpusMount?.nationwideCompleteness ?? null
  },
  egress: dispositions.egress ?? null,
  doNotRetryTheProxy: "The blocked proxy is not retried anywhere in this package or its script. Every download is written to be run by an operator on their own machine.",
  preservedByName: {
    "VA:cc1473": PRESERVED_AS_DRIFT.get("VA:cc1473"),
    "VA:cc1473inst": PRESERVED_AS_DRIFT.get("VA:cc1473inst"),
    "NC:cr297": "Its recorded URL stays an explicit refused input until reconstructed from the official landing page.",
    prohibitedDecoys: "A LegalEase draft, sample or shadow-batch render is never an official source. Enforced in urlUsability(), not left to judgement."
  },
  totals: {
    canonicalLiveRows: rows.length,
    directAcquisitions: direct.length,
    landingPageResolutions: landing.length,
    driftComparisons: drift.length,
    genuinelyUnknown: unknown.length,
    downloadableByScriptToday: direct.length + driftFetches.length,
    refusedInputs: refusedInputs.length,
    excludedByTheCanonicalDenominator: excludedByTheCanonicalDenominator.length
  },
  refusedInputs,
  denominatorDisagreement: {
    statement: `${excludedByTheCanonicalDenominator.length} rows are excluded because the canonical inventory head records them retired. This lane's corrected retirement probe says ${runtimeBound.length} of them are still named by an operational surface.`,
    why: "The inventory head's application_source probe reads only .ts/.tsx/.mjs/.js, so it never opens src/lib/rcap-engine/compiled/profiles/*.json — the compiled engine profiles that packet-planner.ts turns into a packet plan's sourceFormIds. This lane fixed that probe at 9b520a95; the fix is not in the inventory head's own generator.",
    highestStakes: "AR:7-nolle-prosequi-dismissed-acquittal-petition-2020-f, AR:3-misdemeanor-petition-8-01-2023 and AR:felony-petition-form-f are each named by exact source hash inside a formCandidates block of src/lib/rcap-engine/compiled/profiles/AR-arkansas.json, under pathwayIds situation-a-non-convictions, situation-b-misdemeanor-convictions and situation-c-felony-convictions, all mode official_form_overlay_or_source_form_set. Retiring an asset a paid pathway plans around is the one direction a retirement must never fail in.",
    recommendation: "Re-run the retirement determination with the corrected probe on the inventory head, then re-derive the live denominator. Until that happens these rows are excluded from the partitions above and listed here instead of being dropped.",
    rows: excludedByTheCanonicalDenominator
  },
  officialHostsByJurisdiction: officialHosts,
  downloadScript: {
    path: "data/rcap-all50/pdf-source-handoffs/acquire-official-sources.command",
    platform: "macOS",
    credentials: "none — curl over HTTPS, no token, no proxy",
    verifies: "each pinned download against its sha256; a mismatch is moved aside for the drift comparison rather than kept"
  },
  partitions: { direct_acquisition: direct, landing_page_resolution: landing, drift_comparison: drift, genuinely_unknown: unknown }
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

console.log(`OK operator package — ${rows.length} live row(s): ${direct.length} direct, ${landing.length} landing-page, ${drift.length} drift, ${unknown.length} unknown; ${refusedInputs.length} refused input(s); ${excludedByTheCanonicalDenominator.length} excluded by the canonical denominator (${runtimeBound.length} of them still named by an operational surface)`);
