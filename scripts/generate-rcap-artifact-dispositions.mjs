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

import { nonFilingNoticeOf, nonFilingParticipantInstruction, REFERENCE_ONLY_LABEL } from "./rcap-official-forms/rcap-non-filing-notice.mjs";

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

const rows = [];
for (const family of audit.families ?? []) {
  const present = (family.artifacts ?? []).filter((a) => a.present);
  if (present.length === 0) continue;

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
  const current = fs.existsSync(abs(OUT)) ? fs.readFileSync(abs(OUT), "utf8") : "";
  if (current !== serialized) {
    console.error(`${OUT} is stale; re-run without --check`);
    process.exit(1);
  }
  console.log(`artifact dispositions current: ${payload.totals.artifactDispositionsComplete} disposed, ${payload.totals.unresolvedArtifactFailures} unresolved.`);
  process.exit(0);
}

fs.writeFileSync(abs(OUT), serialized);
const t = payload.totals;
console.log(`wrote ${OUT}`);
console.log(`  artifact dispositions complete: ${t.artifactDispositionsComplete}`);
console.log(`  fileable artifacts finalized:   ${t.fileableArtifactsFinalized}`);
console.log(`  informational, correctly refused: ${t.informationalComponentsCorrectlyRefused}`);
console.log(`  unresolved artifact failures:   ${t.unresolvedArtifactFailures}`);
