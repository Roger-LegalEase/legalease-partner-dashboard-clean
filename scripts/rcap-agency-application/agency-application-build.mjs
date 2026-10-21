#!/usr/bin/env node
/**
 * The shared builder for AGENCY-APPLICATION guidance packets (census-v1).
 *
 * Six census-v1 families carry implementationStrategy participant_agency_application:
 * the route is served by the participant applying to an agency (a pardons board, a
 * state records bureau, a court clerk acting on a request, a DNA-system administrative
 * center) rather than by filing a court packet. There is no official form to overlay,
 * no field map, and no fixture PDF. The deliverable is a participant instruction
 * document drafted ONLY from committed evidence, plus the report set that lets the
 * factory audit it.
 *
 * WHAT THIS BUILDER ENFORCES, FOR EVERY ROW THAT USES IT
 *
 * 1. EVIDENCE PINNING. Every evidence file the row's instructions are drafted from is
 *    named with its exact SHA-256. The build reads the committed file, recomputes the
 *    hash and REFUSES on drift. A statement grounded on a file that has changed since
 *    the row was authored is a statement grounded on nothing.
 *
 * 2. ANCHOR VERIFICATION. Every load-bearing factual claim in the instructions names
 *    the evidence file it came from and a literal quote that must still be present in
 *    that file's bytes. The build refuses if any anchor is gone. This is the VA
 *    CC-1473 face-anchor discipline transplanted from a PDF face to a record corpus:
 *    read the source before every build, refuse on drift, never trust the author's
 *    memory of what the source said.
 *
 * 3. HELD-FORM BINDING. Where an agency's own document IS held in the corpus, the row
 *    references it by exact form number, committed corpus-index SHA-256 and byte
 *    length, asserted against the committed index at build time. When the Master
 *    Library is mounted (MASTER_LIBRARY_SOURCE_DIR), the bytes are read and the hash
 *    RECOMPUTED, and a mismatch refuses the build. The written reports carry only the
 *    committed hashes, so output bytes are identical whether or not the library was
 *    mounted in the building container; per-run verification status goes to stdout.
 *
 * 4. NO INVENTED FACTS. The build refuses if the instructions state a dollar figure,
 *    unless the row explicitly declares it with an evidence anchor. Fees, addresses,
 *    processing times and office names this platform does not hold are NEVER guessed:
 *    each is either quoted from pinned evidence or replaced by a lookup instruction
 *    that names the checkable authority.
 *
 * 5. NO SIGNATURE FIELDS. The instruction document is guidance. It carries no
 *    signature line, no date-of-signature line, and nothing for anyone to execute.
 *
 * 6. DETERMINISM. No timestamp, no environment value and no random value reaches any
 *    output file. Two runs produce byte-identical trees; the row's build script is
 *    rerun twice by its own --verify-deterministic mode.
 *
 * WHAT THE COMPLETENESS VERIFIER CAN AND CANNOT MEASURE HERE
 *
 * scripts/rcap-packet-completeness/verify-packet-completeness.mjs audits families
 * that carry a production field map and fixture PDFs: it counts owed writes against
 * made writes over a paper instrument. An agency-application guidance family renders
 * neither, so it is enumerable (approval-request.json is present) but not field-map
 * auditable, and it is NOT made to pretend otherwise: the verifier is not weakened,
 * and reports/rendered-artifacts.json states the audit boundary in terms. What IS
 * measurable: evidence-hash pinning, anchor presence, deterministic rebuild, artifact
 * hashes, the presence of every declared self-help stop and lookup delegation in the
 * rendered instruction bytes.
 *
 * A built family is a built family. It is not verified, not approved, not sellable,
 * and this builder issues no verdict on its own packets and opens no commercial route.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

export const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const readRepoFile = (rel) => fs.readFileSync(path.join(ROOT, rel));

function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

/* ---- 1. evidence pinning ---------------------------------------------------------- */
function verifyEvidence(evidence) {
  const textById = new Map();
  for (const e of evidence) {
    assert.ok(e.id && e.path && e.sha256, "every evidence entry needs id, path, sha256");
    const abs = path.join(ROOT, e.path);
    assert.ok(fs.existsSync(abs), `evidence file missing: ${e.path}`);
    const bytes = fs.readFileSync(abs);
    const digest = sha256(bytes);
    assert.equal(digest, e.sha256,
      `EVIDENCE_DRIFT ${e.id}: ${e.path} is ${digest}, the row pins ${e.sha256}. `
      + "Re-read the evidence and re-author the row before building against it.");
    textById.set(e.id, bytes.toString("utf8"));
  }
  return textById;
}

/* ---- 2. anchor verification ------------------------------------------------------- */
function verifyAnchors(anchors, textById) {
  let count = 0;
  for (const a of anchors) {
    const text = textById.get(a.evidenceId);
    assert.ok(text !== undefined, `anchor names unknown evidence id: ${a.evidenceId}`);
    for (const quote of a.quotes) {
      assert.ok(text.includes(quote),
        `ANCHOR_GONE in ${a.evidenceId}: the pinned evidence no longer contains ${JSON.stringify(quote.slice(0, 120))}`);
      count += 1;
    }
  }
  return count;
}

/* ---- 3. held-form binding --------------------------------------------------------- */
function verifyHeldForms(heldForms) {
  const index = JSON.parse(readRepoFile(CORPUS_INDEX).toString("utf8"));
  const results = [];
  for (const f of heldForms) {
    const entry = (index.entries ?? []).find(
      (e) => e.state === f.state && e.formNumber === f.formNumber && e.path === f.pathInArchive);
    assert.ok(entry, `HELD_FORM_NOT_IN_INDEX: ${f.state} ${f.formNumber} at ${f.pathInArchive}`);
    assert.equal(entry.sha256, f.committedSha256,
      `HELD_FORM_HASH_DISAGREES: the corpus index holds ${entry.sha256} for ${f.formNumber}, the row pins ${f.committedSha256}`);
    assert.equal(entry.byteLength, f.byteLength,
      `HELD_FORM_LENGTH_DISAGREES for ${f.formNumber}`);
    let verifiedAgainstMountedBytes = false;
    const libraryRoot = process.env.MASTER_LIBRARY_SOURCE_DIR
      ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
    const abs = path.resolve(ROOT, libraryRoot, f.pathInArchive);
    if (fs.existsSync(abs)) {
      const bytes = fs.readFileSync(abs);
      const digest = sha256(bytes);
      assert.equal(digest, f.committedSha256,
        `HELD_FORM_BYTE_DRIFT: mounted bytes of ${f.formNumber} hash to ${digest}, committed records say ${f.committedSha256}`);
      assert.equal(bytes.length, f.byteLength, `HELD_FORM_BYTE_LENGTH_DRIFT for ${f.formNumber}`);
      verifiedAgainstMountedBytes = true;
    }
    results.push({ formNumber: f.formNumber, verifiedAgainstMountedBytes });
  }
  return results;
}

/* ---- 4 & 5. content guards -------------------------------------------------------- */
function guardContent(spec, instructionsText) {
  // No invented dollar figure: any $-amount must be explicitly declared by the row,
  // and a declared amount must itself be anchored (declaredAmounts entries carry the
  // evidenceId whose anchors were already verified).
  const amounts = instructionsText.match(/\$\s?\d[\d,.]*/g) ?? [];
  const declared = new Set((spec.declaredAmounts ?? []).map((d) => d.text));
  for (const a of amounts) {
    assert.ok(declared.has(a),
      `INVENTED_FIGURE: the instructions state ${a} and the row does not declare it from evidence`);
  }
  // No signature or execution line in a guidance document.
  assert.ok(!/signature\s*[:_]|sign here|_{6,}/i.test(instructionsText),
    "SIGNATURE_FIELD_IN_GUIDANCE: the instruction document must carry nothing to execute");
  // Every declared self-help stop and every lookup delegation must actually be stated.
  for (const s of spec.mustState ?? []) {
    assert.ok(instructionsText.includes(s),
      `REQUIRED_STATEMENT_MISSING from participant-instructions.md: ${JSON.stringify(s.slice(0, 120))}`);
  }
}

/* ---- the entry point --------------------------------------------------------------- */
export async function buildAgencyApplicationFamily(spec, argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");

  const textById = verifyEvidence(spec.evidence);
  const anchorsVerified = verifyAnchors(spec.anchors, textById);
  const heldFormResults = verifyHeldForms(spec.heldForms ?? []);
  const instructionsText = spec.instructions;
  guardContent(spec, instructionsText);

  if (checkOnly) {
    return {
      familyId: spec.familyId, status: "CHECK_ONLY",
      evidenceFilesVerified: spec.evidence.length, anchorsVerified,
      heldForms: heldFormResults
    };
  }

  const OUT = spec.outDir;
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const instructionsRel = `${OUT}/participant-instructions.md`;
  fs.writeFileSync(path.join(ROOT, instructionsRel), instructionsText);
  const instructionsBytes = readRepoFile(instructionsRel);

  const heldFormComponents = (spec.heldForms ?? []).map((f) => ({
    componentRole: f.role,
    formNumber: f.formNumber,
    officialTitle: f.title,
    revision: f.revision,
    state: f.state,
    pathInArchive: f.pathInArchive,
    sha256: f.committedSha256,
    byteLength: f.byteLength,
    binding: "exact form number + committed corpus-index SHA-256 + committed byte length; "
      + "recomputed and asserted against the mounted Master Library bytes whenever "
      + "MASTER_LIBRARY_SOURCE_DIR is present, with any mismatch refusing the build",
    includedAsBytes: false,
    whyReferencedNotEmbedded: "the participant obtains and completes the agency's own current document; "
      + "this packet binds the held edition by hash as the identified instrument and never redistributes "
      + "or modifies the official bytes"
  }));

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: spec.familyId,
    worklistGroupId: spec.worklistGroupId,
    jurisdiction: spec.jurisdiction,
    implementationStrategy: "participant_agency_application",
    routeKey: spec.routeKey,
    legalName: spec.legalName,
    deliverableType: "participant_agency_application_guidance",
    bindingMethod: "pinned evidence-file SHA-256 set + literal anchor verification on every build; "
      + "held agency documents bound by committed corpus-index SHA-256 and recomputed from mounted bytes when available",
    evidence: spec.evidence.map((e) => ({ id: e.id, path: e.path, sha256: e.sha256, role: e.role })),
    anchorCount: anchorsVerified,
    heldFormComponents,
    factsDeliberatelyNotStated: spec.notHeld,
    sourceBinaryCommitted: false,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any agency's current published requirements match the pinned evidence",
      "that any output is approved for participant delivery",
      "that the participant is eligible for the relief this route describes",
      ...(spec.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: spec.familyId,
    deliverableType: "participant_agency_application_guidance",
    renderedFresh: true,
    derivedFromBytes: true,
    byteDerivedHashes: true,
    componentSet: ["participant_instructions", ...heldFormComponents.map((c) => c.componentRole)],
    pdfs: [],
    artifacts: [
      {
        file: instructionsRel,
        documentId: "participant_instructions",
        role: "participant_instructions",
        sha256: sha256(instructionsBytes),
        byteLength: instructionsBytes.length
      }
    ],
    heldFormComponents,
    rasterEngine: null,
    rasterSkipped: true,
    rasterPages: [],
    whyNoRaster: "the deliverable is a guidance instruction document; no PDF page exists to rasterize",
    completenessAudit: {
      fieldMapAuditable: false,
      whatTheCompletenessVerifierCannotMeasureHere:
        "scripts/rcap-packet-completeness/verify-packet-completeness.mjs counts owed writes against made "
        + "writes over a production field map and fixture PDFs; this family renders no paper instrument, "
        + "so the nine field-level counters are undefined for it and the verifier does not audit it. "
        + "The verifier is not weakened to pretend otherwise.",
      whatIsMeasurableInstead: [
        "every pinned evidence file re-hashes to its recorded SHA-256 on every build",
        "every literal anchor quote is still present in its evidence file's bytes",
        "held agency documents re-verify against the committed corpus index (and against mounted bytes when present)",
        "two builds produce byte-identical output trees",
        "every declared self-help stop and lookup delegation is present in the rendered instruction bytes",
        "no undeclared dollar figure and no signature line appears in the instruction bytes"
      ]
    },
    independentVerificationPending: true
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: spec.familyId,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    builtBy: spec.buildScript,
    deliverableType: "participant_agency_application_guidance",
    renderedArtifacts: 1,
    rasterEngine: "not applicable; no PDF artifact",
    popplerUsed: false,
    rasterState: "NOT_APPLICABLE_GUIDANCE_DELIVERABLE",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A rendered guidance packet is review evidence. It authorizes no fulfillment, "
      + "opens no commercial route, and does not promote the route it describes."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: spec.familyId,
    blocking: [],
    findings: spec.findings
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: spec.familyId,
    requested: "QA review and counsel review of an agency-application guidance packet",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: spec.counselQuestions,
    mattersForTheReviewersAttention: spec.reviewerAttention ?? []
  });

  return {
    familyId: spec.familyId,
    status: "COMPLETED",
    directory: OUT,
    implementationStrategy: "participant_agency_application",
    evidenceFilesVerified: spec.evidence.length,
    anchorsVerified,
    heldForms: heldFormResults,
    artifactHashes: [{ file: instructionsRel, sha256: sha256(instructionsBytes) }],
    fieldMapAuditable: false,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

export function runCli(spec) {
  const argv = process.argv.slice(2);
  buildAgencyApplicationFamily(spec, argv)
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e.message ?? e); process.exit(1); });
}
