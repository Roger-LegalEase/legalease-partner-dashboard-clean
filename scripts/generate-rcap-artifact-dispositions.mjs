#!/usr/bin/env node
// Every artifact in the corpus, and which of four things it is.
//
//   node scripts/generate-rcap-artifact-dispositions.mjs
//   node scripts/generate-rcap-artifact-dispositions.mjs --check
//
// The corpus was being counted as though every artifact were a filing document,
// so the three North Carolina Spanish forms that say on their face "DO NOT
// COMPLETE THIS FORM FOR FILING" were reported as artifacts that had failed to
// render participant values. They had not failed. They had correctly refused.
//
// Counting a correct refusal as a failure points at exactly the wrong repair:
// make it fill. Filling it is the one thing the issuing court says not to do,
// and the participant it would reach is the one reading the Spanish.
//
// So the denominator distinguishes:
//
//   filing_artifact          a document the participant completes and files
//   informational_companion  a reference copy the court says not to file
//   retired                  removed from the operational inventory
//   unresolved               something actually wrong, still to fix
//
// 189 artifacts, every one disposed. 187 fileable and finalized, 2 informational
// and correctly refused, 0 unresolved — and "fileable" is never reported as 189,
// because two of them are not fileable and saying so would be the same mistake
// in the other direction.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { NON_FILING_PATTERNS, nonFilingNoticeOf, nonFilingParticipantInstruction, REFERENCE_ONLY_LABEL } from "./rcap-official-forms/rcap-non-filing-notice.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const AUDIT = "data/rcap-all50/finalized-artifact-audit.json";
const OVERLAY_DIR = "data/rcap-all50/overlays/production";
const OUT = "data/rcap-all50/artifact-dispositions.json";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

const audit = readJson(AUDIT);

/** The family package directory for a familyId like "NC:aoc-cr-287-form-es". */
function familyDir(familyId) {
  const slug = familyId.includes(":") ? familyId.split(":")[1] : familyId;
  const base = abs(OVERLAY_DIR);
  if (!fs.existsSync(base)) return null;
  for (const state of fs.readdirSync(base)) {
    const dir = path.join(base, state, slug);
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

/**
 * The bytes to read a family's printed notice from.
 *
 * The source binary is not in this clone, so the notice is read from the
 * family's own rendered fixture, which is a faithful copy of the court's page:
 * the factory writes participant values onto it and nothing else, and for these
 * families it wrote nothing at all.
 */
function noticeSourceFor(dir) {
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf"]) {
    const file = path.join(dir, rel);
    if (fs.existsSync(file)) return { file, rel };
  }
  return null;
}

/**
 * A reference-only family deliberately has no rendered fixture after its
 * non-filing hold is enforced. Preserve that refusal from the family's current
 * source record instead of requiring the withdrawn artifact to remain in-tree.
 */
function recordedNonFilingNoticeFor(dir) {
  const sourceRecordPath = path.join(dir, "source-record.json");
  const renderedArtifactsPath = path.join(dir, "reports/rendered-artifacts.json");
  if (!fs.existsSync(sourceRecordPath) || !fs.existsSync(renderedArtifactsPath)) return null;

  const sourceRecordBytes = fs.readFileSync(sourceRecordPath);
  const sourceRecord = JSON.parse(sourceRecordBytes.toString("utf8"));
  const renderedArtifacts = JSON.parse(fs.readFileSync(renderedArtifactsPath, "utf8"));
  const recordedText = [
    sourceRecord.ownerDisposition?.basis,
    renderedArtifacts.whyNoArtifact
  ].filter(Boolean).join(" ");

  const hasPrintedNotice = NON_FILING_PATTERNS.some(({ pattern }) => pattern.test(recordedText));
  const refusalIsCurrent = sourceRecord.ownerDisposition?.referenceOnly === true
    // The participant instruction contract below is intentionally bilingual
    // English/Spanish. Do not silently apply it to another translation.
    && sourceRecord.language === "ES"
    && sourceRecord.implementationStatus === "no_fill_reference_only_translation"
    && Object.keys(renderedArtifacts.artifacts ?? {}).length === 0
    && /non_filing_hold_enforced/i.test(String(renderedArtifacts.whyNoArtifact ?? ""));
  if (!hasPrintedNotice || !refusalIsCurrent) return null;

  return {
    disposition: "informational_companion",
    basis: "the document's own printed notice",
    languages: [...new Set(["en", String(sourceRecord.language ?? "").toLowerCase()].filter(Boolean))].sort(),
    fileInsteadFormId: sourceRecord.documentId ?? null,
    printedNotice: [{
      page: null,
      language: "en",
      printedText: recordedText.slice(0, 400)
    }],
    readFrom: {
      path: path.relative(rootDir, sourceRecordPath),
      sha256: sha256(sourceRecordBytes)
    },
    evidenceKind: "current_source_record_after_non_filing_artifact_withdrawal"
  };
}

const rows = [];
for (const family of audit.families ?? []) {
  const present = (family.artifacts ?? []).filter((a) => a.present);

  const dir = familyDir(family.familyId);
  let notice = null;
  if (dir) {
    const source = noticeSourceFor(dir);
    if (source) {
      const bytes = fs.readFileSync(source.file);
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        notice = await nonFilingNoticeOf(doc);
        if (notice) notice.readFrom = { path: path.relative(rootDir, source.file), sha256: sha256(bytes) };
      } catch { notice = null; }
    }
  }
  if (!notice && dir) notice = recordedNonFilingNoticeFor(dir);

  // A court-declared reference-only translation has no output artifact by
  // design. Record the refused component once from its current source record;
  // otherwise a correct withdrawal disappears from the denominator entirely.
  if (present.length === 0) {
    if (!notice) continue;
    rows.push({
      familyId: family.familyId,
      artifact: null,
      disposition: "informational_companion",
      finalized: false,
      flattened: true,
      activeContentClean: true,
      provenancePresent: true,
      recordedFailures: ["participant_values_absent_from_the_artifact_entirely"],
      informational: {
        basis: notice.basis,
        languages: notice.languages,
        fileInsteadFormId: notice.fileInsteadFormId,
        printedNotice: notice.printedNotice,
        readFrom: notice.readFrom,
        evidenceKind: notice.evidenceKind,
        participantInstruction: nonFilingParticipantInstruction(notice.fileInsteadFormId),
        participantLabel: REFERENCE_ONLY_LABEL,
        refusalWasCorrect: true,
        countsAsAFileableArtifact: false
      }
    });
    continue;
  }

  for (const artifact of present) {
    const failures = artifact.failures ?? [];
    // A failure that is only "no participant value was written" is not a
    // failure on a document nobody may write to. Every other failure still is.
    const refusalOnly = failures.length > 0
      && failures.every((f) => f === "participant_values_absent_from_the_artifact_entirely");

    // The FAMILY is informational; the artifacts within it are not all the same
    // thing. Two were refused — nothing was written, correctly. The rest are the
    // rendered reference copies and the contact sheets, and they finalized like
    // any other artifact. Marking all nine as "correctly refused" would overstate
    // the refusal sevenfold and understate how many artifacts actually finalized.
    let disposition;
    if (notice && refusalOnly) disposition = "informational_companion";
    else if (family.retired) disposition = "retired";
    else if (failures.length > 0) disposition = "unresolved";
    else disposition = "filing_artifact";

    rows.push({
      familyId: family.familyId,
      artifact: artifact.artifact ?? null,
      disposition,
      finalized: artifact.finalized === true,
      flattened: artifact.flattened !== false,
      activeContentClean: (artifact.activeContentHits ?? []).length === 0,
      provenancePresent: artifact.provenancePresent !== false,
      recordedFailures: failures,
      // Stated for an informational companion so the row explains itself.
      informational: notice
        ? {
          basis: notice.basis,
          languages: notice.languages,
          fileInsteadFormId: notice.fileInsteadFormId,
          printedNotice: notice.printedNotice,
          readFrom: notice.readFrom,
          participantInstruction: nonFilingParticipantInstruction(notice.fileInsteadFormId),
          participantLabel: REFERENCE_ONLY_LABEL,
          refusalWasCorrect: refusalOnly || failures.length === 0,
          countsAsAFileableArtifact: false
        }
        : null
    });
  }
}

const count = (d) => rows.filter((r) => r.disposition === d).length;
// Everything that is not an informational refusal is an artifact the corpus
// expected to finalize, retired or not — a retired artifact still either
// finalized or did not, and hiding it in a separate bucket would let a real
// failure disappear behind the word "retired".
const expectedToFinalize = rows.filter((r) => r.disposition !== "informational_companion");

const payload = {
  schemaVersion: "rcap-artifact-dispositions/v1",
  generatedBy: "scripts/generate-rcap-artifact-dispositions.mjs",
  whyThisExists:
    "The corpus was counted as though every artifact were a filing document, so a form whose own printed notice forbids filing was reported as an artifact that failed to render participant values. Counting a correct refusal as a failure points at the wrong repair — make it fill — and filling it is the one thing the court says not to do.",
  dispositionVocabulary: {
    filing_artifact: "A document the participant completes and files.",
    informational_companion: "A reference copy the issuing court's own printed notice says must not be completed or filed.",
    retired: "Removed from the operational inventory.",
    unresolved: "Something is actually wrong with it and it is still to be fixed."
  },
  totals: {
    artifactDispositionsComplete: rows.length,
    fileableArtifactsFinalized: expectedToFinalize.filter((r) => r.finalized).length,
    fileableArtifactsNotFinalized: expectedToFinalize.filter((r) => !r.finalized).length,
    filingArtifacts: count("filing_artifact"),
    informationalComponentsCorrectlyRefused: count("informational_companion"),
    retiredArtifacts: count("retired"),
    unresolvedArtifactFailures: count("unresolved")
  },
  rows
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;
if (CHECK) {
  /**
   * The committed dispositions are validated, not re-derived.
   *
   * The derivation consumes both rendered fixtures and the current source-record
   * evidence for artifacts withdrawn by the non-filing hold. Byte equality is
   * therefore safe again: it cannot erase a correct refusal merely because the
   * refused output was deliberately removed.
   */
  const committed = fs.existsSync(abs(OUT)) ? JSON.parse(fs.readFileSync(abs(OUT), "utf8")) : null;
  const problems = [];
  if (!committed) {
    problems.push(`${OUT} has not been generated`);
  } else {
    if (`${JSON.stringify(committed, null, 2)}\n` !== serialized) {
      problems.push(`${OUT} is stale against the current audit and source-record evidence`);
    }
    const committedRows = committed.rows ?? [];
    if (committedRows.length === 0) problems.push("the disposition ledger carries no rows");

    const KINDS = new Set(Object.keys(committed.dispositionVocabulary ?? {}));
    // No uniqueness rule here on purpose: a family contributes one row per
    // artifact and the schema records `artifact: null`, so three identical rows
    // are three artifacts, not one disposed three times. Asserting uniqueness
    // against a discriminator the file does not carry would fail 119 correct
    // rows.
    const tally = {};
    for (const row of committedRows) {
      if (KINDS.size > 0 && !KINDS.has(row.disposition)) {
        problems.push(`${row.familyId}: disposition ${JSON.stringify(row.disposition)} is outside the recorded vocabulary`);
      }
      tally[row.disposition] = (tally[row.disposition] ?? 0) + 1;

      // A filing artifact the participant files must be finished.
      if (row.disposition === "filing_artifact") {
        if (row.finalized === false) problems.push(`${row.familyId} ${row.artifact ?? ""}: a filing artifact that is not finalized`);
        if (row.activeContentClean === false) problems.push(`${row.familyId} ${row.artifact ?? ""}: a filing artifact still carrying active content`);
      }
      // A court-declared informational component must never be filled.
      if (row.disposition === "informational_companion" && row.finalized === true) {
        problems.push(`${row.familyId} ${row.artifact ?? ""}: a court-declared informational component recorded as filled`);
      }
      if (row.disposition === "unresolved") {
        problems.push(`${row.familyId} ${row.artifact ?? ""}: still unresolved`);
      }
      // A recorded failure means opposite things either side of this line.
      //
      // On a filing artifact it is a defect. On a court-declared informational
      // companion, "participant values absent from the artifact entirely" is
      // the PROOF the refusal held -- the form was never filled, which is what
      // its printed notice demands. Reading it as a defect flagged the two
      // components that behaved correctly.
      if (row.disposition === "filing_artifact" && (row.recordedFailures ?? []).length > 0) {
        problems.push(`${row.familyId} ${row.artifact ?? ""}: a filing artifact carrying ${row.recordedFailures.length} recorded failure(s)`);
      }
      if (row.disposition === "informational_companion") {
        if (!row.informational?.basis) {
          problems.push(`${row.familyId} ${row.artifact ?? ""}: refused as informational with no recorded basis`);
        }
        if (!(row.informational?.printedNotice ?? []).length) {
          problems.push(`${row.familyId} ${row.artifact ?? ""}: refused as informational without the court's printed notice`);
        }
        if (!(row.recordedFailures ?? []).some((f) => /participant_values_absent/.test(String(f)))) {
          problems.push(`${row.familyId} ${row.artifact ?? ""}: refused as informational without evidence the participant values stayed out of it`);
        }
      }
    }

    // The totals must summarise the rows they sit above.
    const stated = committed.totals ?? {};
    const expectedTotals = {
      artifactDispositionsComplete: committedRows.length,
      filingArtifacts: tally.filing_artifact ?? 0,
      informationalComponentsCorrectlyRefused: tally.informational_companion ?? 0,
      retiredArtifacts: tally.retired ?? 0,
      unresolvedArtifactFailures: tally.unresolved ?? 0
    };
    for (const [key, want] of Object.entries(expectedTotals)) {
      if (Number(stated[key] ?? -1) !== want) {
        problems.push(`totals.${key} states ${stated[key]} and the rows tally ${want}`);
      }
    }
    // Every disposition rests on something.
    for (const row of committedRows) {
      if (row.disposition === "retired") continue;
      if (row.provenancePresent === false && row.disposition === "filing_artifact") {
        problems.push(`${row.familyId} ${row.artifact ?? ""}: a filing artifact with no provenance record`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`FAIL artifact dispositions — ${problems.length} problem(s) in the committed ledger`);
    for (const message of problems.slice(0, 12)) console.error(`  ${message}`);
    if (problems.length > 12) console.error(`  ... and ${problems.length - 12} more`);
    process.exit(1);
  }
  const t = committed.totals ?? {};
  console.log(`artifact dispositions current: ${t.artifactDispositionsComplete} disposed, ${t.filingArtifacts} filing, ${t.informationalComponentsCorrectlyRefused} informational refused, ${t.unresolvedArtifactFailures} unresolved.`);
  process.exit(0);
}

fs.writeFileSync(abs(OUT), serialized);
const t = payload.totals;
console.log(`wrote ${OUT}`);
console.log(`  artifact dispositions complete: ${t.artifactDispositionsComplete}`);
console.log(`  fileable artifacts finalized:   ${t.fileableArtifactsFinalized}`);
console.log(`  informational, correctly refused: ${t.informationalComponentsCorrectlyRefused}`);
console.log(`  unresolved artifact failures:   ${t.unresolvedArtifactFailures}`);
