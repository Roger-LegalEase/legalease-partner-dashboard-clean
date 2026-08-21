#!/usr/bin/env node
// Does the byte this repository pinned still agree with everything that has
// seen that form?
//
//   node scripts/rcap-source-drift-compare.mjs
//   node scripts/rcap-source-drift-compare.mjs --check
//
// Every problematic-PDF asset carries a pinnedHistoricalSha256. Nothing has
// ever asked what that hash is a hash OF. It was recorded once, from a source
// nobody can now name, and it has been treated as the asset's identity ever
// since — the acquisition workflow passes it as the expected hash, and a
// mismatch is reported as though the publisher had changed something.
//
// That framing is backwards, and it matters. A pin and a live fetch that
// disagree is a fact about two byte strings. WHICH of them is the current
// official form is a separate question that no hash comparison answers.
//
// So this compares each pin against every independent witness the repository
// actually holds, and names the disagreements rather than adjudicating them:
//
//   live      — data/rcap-all50/source-observation-log.json, what an issuing
//               body served a CI runner
//   nationwide— data/rcap-all50/nationwide-source-inventory.json, the file-level
//               index of `private/Nationwide Record Clearing/`
//   corpus    — data/rcap-all50/local-source-corpus-index.json, the file-level
//               index of the installed Master Library
//
// The two archives are indices, not bytes: they record a path, a size and a
// SHA-256 observed when the archive was walked. That is enough to say whether
// the pinned bytes were present somewhere at that time, and not enough to say
// the archive is reachable now.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");
const NATIONWIDE = path.join(rootDir, "data/rcap-all50/nationwide-source-inventory.json");
const CORPUS = path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json");
const OBSERVED = path.join(rootDir, "data/rcap-all50/source-observation-log.json");
const OUT = path.join(rootDir, "data/rcap-all50/source-drift-comparison.json");

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const queue = read(QUEUE);
const nationwide = read(NATIONWIDE);
const corpus = read(CORPUS);
const observed = read(OBSERVED);

const isSha256 = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

// ---- identifiers ------------------------------------------------------------
// Shared with the landing-page resolver: separators become boundaries so
// CC-6-12 does not compare equal to CC-6-12-1, and the digit transition inside
// an unseparated stem is a boundary too.
const tokensOf = (value) =>
  String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .flatMap((run) => run.match(/[a-z]+|[0-9]+/g) ?? [])
    .filter(Boolean);

// Thirteen queue rows name the form by FILENAME rather than by form number —
// "cc1473.pdf", "CC-6-11.pdf", "cr287_1.pdf". Tokenising those as written puts
// "pdf" in the key, so they never line up with the same form recorded properly
// elsewhere, and a contradiction between them goes unreported. Which is the
// failure mode that matters here: a comparison that quietly cannot see a
// disagreement reads exactly like a comparison that found none.
const formKeyOf = (state, formNumber) => {
  const withoutExtension = String(formNumber ?? "").replace(/\.(pdf|html?|docx?|rtf)$/i, "");
  const tokens = tokensOf(withoutExtension);
  return tokens.length === 0 ? null : `${String(state).toUpperCase()}|${tokens.join("-")}`;
};

// ---- witnesses --------------------------------------------------------------
const bySha = { nationwide: new Map(), corpus: new Map() };
const byForm = { nationwide: new Map(), corpus: new Map() };

const remember = (which, sha, entry, formKey) => {
  if (isSha256(sha)) {
    if (!bySha[which].has(sha)) bySha[which].set(sha, []);
    bySha[which].get(sha).push(entry);
  }
  if (formKey) {
    if (!byForm[which].has(formKey)) byForm[which].set(formKey, []);
    byForm[which].get(formKey).push(entry);
  }
};

for (const state of nationwide.states ?? []) {
  for (const file of state.files ?? []) {
    const stem = file.fileName.replace(/\.[a-z0-9]+$/i, "");
    remember(
      "nationwide",
      String(file.sha256 ?? "").toLowerCase(),
      { archive: "nationwide", path: file.relativePath, byteLength: file.sizeBytes, sha256: String(file.sha256 ?? "").toLowerCase(), revision: null },
      formKeyOf(state.code, stem)
    );
  }
}
for (const entry of corpus.entries ?? []) {
  remember(
    "corpus",
    String(entry.sha256 ?? "").toLowerCase(),
    { archive: "corpus", path: entry.path, byteLength: entry.byteLength, sha256: String(entry.sha256 ?? "").toLowerCase(), revision: entry.revision ?? null },
    entry.formNumber ? formKeyOf(entry.state, entry.formNumber) : null
  );
}

const liveBySha = new Map();
const liveByForm = new Map();
for (const observation of observed.observations ?? []) {
  const key = formKeyOf(observation.jurisdiction, observation.formNumber);
  if (key) {
    if (!liveByForm.has(key)) liveByForm.set(key, []);
    liveByForm.get(key).push(observation);
  }
  if (isSha256(observation.observedSha256)) {
    if (!liveBySha.has(observation.observedSha256)) liveBySha.set(observation.observedSha256, []);
    liveBySha.get(observation.observedSha256).push(observation);
  }
}

// ---- per-asset comparison ---------------------------------------------------
//
// The verdict says what the witnesses agree about; it never says which byte
// string is the right one. `pin_contradicted_live` in particular is a prompt
// for a person, not a conclusion: the publisher may have revised the form, or
// the pin may have been of a different document all along.
const VERDICTS = {
  pin_is_not_a_hash: "the asset's pinned value is a placeholder, not a SHA-256, so nothing can be compared",
  pin_confirmed_live: "the issuing body served exactly these bytes",
  pin_contradicted_live: "the issuing body served different bytes under the same form number",
  pin_confirmed_archive_only: "no live observation; the pinned bytes are recorded in an archive index",
  pin_unwitnessed: "no live observation and no archive index records these bytes"
};

const rows = [];
for (const [setName, entries] of Object.entries(queue.sets ?? {})) {
  for (const entry of entries) {
    const pin = String(entry.pinnedHistoricalSha256 ?? "").toLowerCase();
    const formKey = formKeyOf(entry.jurisdiction, entry.formNumber);

    // Bytes are the identity, so a live observation confirms a pin whenever the
    // hashes agree — however the queue row happens to spell the form number.
    // One Vermont row calls the form "200-00132 – Stipulation to Seal Criminal
    // History Record + Order.pdf"; matching on the spelling would have reported
    // it unwitnessed while holding a byte-identical observation of it.
    const liveForThisForm = (liveByForm.get(formKey) ?? []).filter((o) => o.outcome === "acquired");
    const liveMatch = isSha256(pin) ? (liveBySha.get(pin) ?? []).find((o) => o.outcome === "acquired") ?? null : null;
    // The form key is still what finds a CONTRADICTION: the same form served
    // under different bytes is only visible by name, never by hash.
    const liveOther = liveForThisForm.filter((o) => o.observedSha256 !== pin);
    const inNationwide = bySha.nationwide.get(pin) ?? [];
    const inCorpus = bySha.corpus.get(pin) ?? [];

    let verdict;
    if (!isSha256(pin)) verdict = "pin_is_not_a_hash";
    else if (liveMatch) verdict = "pin_confirmed_live";
    else if (liveOther.length > 0) verdict = "pin_contradicted_live";
    else if (inNationwide.length > 0 || inCorpus.length > 0) verdict = "pin_confirmed_archive_only";
    else verdict = "pin_unwitnessed";

    // A witness that holds the same FORM under a different hash is the whole
    // point of the exercise: it is the only way this repository can see that
    // two of its own records disagree about what a form is.
    const contradictingArchives = [];
    if (isSha256(pin)) {
      for (const which of ["nationwide", "corpus"]) {
        for (const candidate of byForm[which].get(formKey) ?? []) {
          if (candidate.sha256 !== pin && isSha256(candidate.sha256)) contradictingArchives.push(candidate);
        }
      }
    }

    rows.push({
      acquisitionGroup: entry.acquisitionGroup,
      queueSet: setName,
      jurisdiction: entry.jurisdiction,
      formNumber: entry.formNumber,
      assetId: entry.assetId,
      acquisitionPriority: entry.acquisitionPriority,
      pinnedHistoricalSha256: entry.pinnedHistoricalSha256 ?? null,
      verdict,
      verdictMeans: VERDICTS[verdict],
      witnesses: {
        live: liveMatch
          ? {
              agrees: true,
              jobId: liveMatch.jobId,
              finalUrl: liveMatch.finalUrl,
              byteLength: liveMatch.observedByteLength,
              sha256: liveMatch.observedSha256,
              observedUnderFormNumber: liveMatch.formNumber,
              matchedOn: formKeyOf(liveMatch.jurisdiction, liveMatch.formNumber) === formKey
                ? "the same form number and the same bytes"
                : "the same bytes, recorded under a different spelling of the form number"
            }
          : liveOther.length > 0
            ? { agrees: false, observed: liveOther.map((o) => ({ jobId: o.jobId, finalUrl: o.finalUrl, byteLength: o.observedByteLength, sha256: o.observedSha256 })) }
            : null,
        nationwide: inNationwide.map((e) => ({ path: e.path, byteLength: e.byteLength })),
        corpus: inCorpus.map((e) => ({ path: e.path, byteLength: e.byteLength, revision: e.revision }))
      },
      sameFormDifferentBytes: contradictingArchives.map((e) => ({
        archive: e.archive, path: e.path, byteLength: e.byteLength, sha256: e.sha256, revision: e.revision
      }))
    });
  }
}

// ---- archive against archive ------------------------------------------------
// Independent of the queue: the two archives were captured separately, so where
// they hold the same form the comparison is a straight test of whether this
// repository's own records agree with each other.
const archiveComparison = [];
for (const [formKey, corpusEntries] of byForm.corpus) {
  const nationwideEntries = byForm.nationwide.get(formKey);
  if (!nationwideEntries) continue;
  const corpusHashes = new Set(corpusEntries.map((e) => e.sha256).filter(isSha256));
  const nationwideHashes = new Set(nationwideEntries.map((e) => e.sha256).filter(isSha256));
  const shared = [...corpusHashes].some((h) => nationwideHashes.has(h));
  archiveComparison.push({
    formKey,
    agrees: shared,
    corpus: corpusEntries.map((e) => ({ path: e.path, byteLength: e.byteLength, sha256: e.sha256, revision: e.revision })),
    nationwide: nationwideEntries.map((e) => ({ path: e.path, byteLength: e.byteLength, sha256: e.sha256 }))
  });
}
archiveComparison.sort((a, b) => a.formKey.localeCompare(b.formKey));

const countBy = (list, key) => list.reduce((acc, row) => ({ ...acc, [row[key]]: (acc[row[key]] ?? 0) + 1 }), {});

const payload = {
  schemaVersion: "rcap-source-drift-comparison/v1",
  generatedBy: "scripts/rcap-source-drift-compare.mjs",
  purpose: "Compare every pinned source hash against every independent witness this repository holds, and name the disagreements.",
  witnesses: {
    live: { file: "data/rcap-all50/source-observation-log.json", records: (observed.observations ?? []).length, isNotComplete: observed.coverage?.whyNotAll ?? null },
    nationwide: { file: "data/rcap-all50/nationwide-source-inventory.json", capturedAt: nationwide.generatedAt ?? null, files: [...bySha.nationwide.values()].reduce((n, v) => n + v.length, 0) },
    corpus: { file: "data/rcap-all50/local-source-corpus-index.json", entries: (corpus.entries ?? []).length }
  },
  whatADisagreementDoesNotEstablish: [
    "which of the two byte strings is the current official form",
    "that the publisher revised anything — the pin may never have been of this document",
    "that an asset with no witness is wrong; it is unwitnessed, which is a different problem",
    "that an archive index hit means the bytes can be obtained today — the archives are not in this clone"
  ],
  verdictVocabulary: VERDICTS,
  totals: {
    queueRows: rows.length,
    ...countBy(rows, "verdict"),
    rowsWhereAnArchiveHoldsTheSameFormUnderDifferentBytes: rows.filter((r) => r.sameFormDifferentBytes.length > 0).length,
    formsHeldByBothArchives: archiveComparison.length,
    formsWhereTheArchivesAgree: archiveComparison.filter((c) => c.agrees).length,
    formsWhereTheArchivesDisagree: archiveComparison.filter((c) => !c.agrees).length
  },
  assets: rows.sort((a, b) =>
    `${a.acquisitionPriority}|${a.jurisdiction}|${a.formNumber}`.localeCompare(`${b.acquisitionPriority}|${b.jurisdiction}|${b.formNumber}`)
  ),
  archiveAgainstArchive: archiveComparison
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;
if (CHECK) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (existing !== serialized) {
    console.error("FAIL data/rcap-all50/source-drift-comparison.json is not what its generator produces. Run: node scripts/rcap-source-drift-compare.mjs");
    process.exit(1);
  }
  console.log("OK the committed drift comparison matches its generator.");
} else {
  fs.writeFileSync(OUT, serialized);
  console.log(JSON.stringify(payload.totals, null, 1));
}
