#!/usr/bin/env node
// What the committed official-form artifacts actually are.
//
//   node scripts/generate-rcap-finalized-artifact-audit.mjs
//   node scripts/generate-rcap-finalized-artifact-audit.mjs --check
//
// Lane D1 writes three artifacts per family: a canonical fixture, a boundary
// fixture and a blank-versus-filled contact sheet. The factory's contract is
// that each one is the FINALIZED participant artifact -- values materialized
// into page content, form flattened, active content stripped, serialized
// without object streams so the residue scan can see into it, and stamped with
// the factory's own producer string.
//
// Nothing had ever checked the committed bytes against that contract. This
// reads every artifact in the clone and records, per artifact, whether it
// meets it. Each field is observed from the file, never asserted.
//
// The four observations that decide finalization:
//
//   flattened            no AcroForm field survives, so no value hides in a
//                        widget appearance a viewer may decline to draw
//   byteInspectable      no object stream, so /JS, /XFA and the rest cannot be
//                        hidden from the residue scan inside compressed objects
//   factoryStamped       the producer string the current finalizer writes,
//                        which is how an artifact says which factory built it
//   valuesInPageContent  the fixture's participant values are extractable from
//                        page content rather than from field values alone
//
// An artifact failing any of them is not a finalized artifact, whatever the
// implementation index says about it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { visibleTextOfDocument } from "./rcap-official-forms/rcap-contact-sheet.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict, PDFTextField } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/finalized-artifact-audit.json");
const checkOnly = process.argv.includes("--check");

// Provenance is no longer read from the PDF. The finalizer used to stamp its
// own Producer, which put partner branding on a court form and destroyed the
// issuing court's metadata; the artifact now carries the court's identity and
// the factory records its own beside the file. So "which factory built this"
// is answered by the sidecar record and its hashes, not by an Info dictionary
// that whoever touched the file last could have written.
const PROVENANCE_SIDECAR = "artifact-provenance.json";

// Values from the committed canonical fact set. Their presence in extractable
// page content is what distinguishes a flattened artifact from one whose
// values live only in unflattened widget appearances.
const CANONICAL_MARKERS = [
  "Jordan Avery Reyes", "24-CR-001234", "118 Maple Street", "Example County", "Springfield"
];

const ARTIFACTS = [
  { rel: "fixtures/canonical-filled.pdf", kind: "canonical_fixture", expectsParticipantValues: true },
  { rel: "fixtures/boundary-filled.pdf", kind: "boundary_fixture", expectsParticipantValues: false },
  { rel: "contact-sheet/blank-vs-filled.pdf", kind: "contact_sheet", expectsParticipantValues: false }
];

const normalize = (s) => String(s).replace(/\s+/g, "").toLowerCase();
const sha256Of = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

async function inspect(bytes) {
  const out = {
    parses: false, pages: null, formFields: null, nonEmptyTextFields: null,
    provenanceRecorded: null, outputShaMatchesProvenance: null,
    xfaPresent: null, producer: null, creator: null, title: null,
    byteInspectable: null, activeContentHits: null,
    markersInPageContent: null, markersOnlyInFieldValues: null,
    protectedFieldsCarryingValues: null, protectedFieldsWrittenByFactory: null,
    protectedFieldsHoldingSourceDefaults: null, parseError: null
  };

  const scan = scanBytesForActiveContent(bytes);
  out.byteInspectable = scan.inspectable;
  out.activeContentHits = scan.hits;

  let doc;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (error) {
    out.parseError = String(error.message).slice(0, 200);
    return { out, doc: null };
  }
  out.parses = true;
  out.pages = doc.getPageCount();
  out.producer = doc.getProducer() ?? null;
  out.creator = doc.getCreator() ?? null;
  out.title = doc.getTitle() ?? null;

  const acro = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  out.xfaPresent = Boolean(acro && acro.get(PDFName.of("XFA")) !== undefined);
  const fields = acro ? doc.getForm().getFields() : [];
  out.formFields = fields.length;

  const textValues = new Map();
  for (const field of fields) {
    if (!(field instanceof PDFTextField)) continue;
    let value = null;
    try { value = field.getText(); } catch { value = null; }
    if (value && value.trim() !== "") textValues.set(field.getName(), value);
  }
  out.nonEmptyTextFields = textValues.size;

  const pageText = normalize(visibleTextOfDocument(doc));
  const fieldText = normalize([...textValues.values()].join("\n"));
  out.markersInPageContent = CANONICAL_MARKERS.filter((m) => pageText.includes(normalize(m)));
  out.markersOnlyInFieldValues = CANONICAL_MARKERS.filter(
    (m) => !pageText.includes(normalize(m)) && fieldText.includes(normalize(m))
  );

  return { out, doc, textValues };
}

const families = [];
for (const stateDir of fs.readdirSync(ROOT).sort()) {
  const statePath = path.join(ROOT, stateDir);
  if (!fs.statSync(statePath).isDirectory()) continue;
  for (const familyDir of fs.readdirSync(statePath).sort()) {
    const familyPath = path.join(statePath, familyDir);
    if (!fs.statSync(familyPath).isDirectory()) continue;
    const record = readJson(path.join(familyPath, "source-record.json"));
    if (!record) continue;

    // Every field this family's own policy says must never carry a value.
    const provenance = readJson(path.join(familyPath, PROVENANCE_SIDECAR));
    const protectedReport = readJson(path.join(familyPath, "reports/protected-fields.json"), {});
    const protectedNames = new Set([
      ...(protectedReport.unwritableFields ?? []).map((f) => f.field),
      ...(protectedReport.manualFields ?? [])
    ]);
    // Every field the factory actually bound. A protected field holding a
    // value the factory never wrote is holding the form's own preprinted
    // default, which is a different problem with a different owner: it
    // survives only because the artifact was never flattened, and finalizing
    // the artifact removes it. Conflating the two would report the factory as
    // writing into clerk and court fields when it did no such thing.
    const writtenByFactory = new Set(
      (readJson(path.join(familyPath, "reports/populated-fields.json"), []) ?? []).map((b) => b.field)
    );

    const artifacts = [];
    for (const spec of ARTIFACTS) {
      const file = path.join(familyPath, spec.rel);
      if (!fs.existsSync(file)) {
        artifacts.push({ ...spec, present: false });
        continue;
      }
      const bytes = fs.readFileSync(file);
      const { out, textValues } = await inspect(bytes);

      const protectedWithValues = textValues
        ? [...textValues.keys()].filter((name) => protectedNames.has(name)).sort()
        : [];
      out.protectedFieldsCarryingValues = protectedWithValues;
      out.protectedFieldsWrittenByFactory = protectedWithValues.filter((n) => writtenByFactory.has(n));
      out.protectedFieldsHoldingSourceDefaults = protectedWithValues.filter((n) => !writtenByFactory.has(n));

      // A finalized artifact is flattened, inspectable, clean, factory-stamped
      // and -- when it is meant to carry participant values -- carries them in
      // page content rather than in an unflattened widget.
      const failures = [];
      if (!out.parses) failures.push("does_not_parse");
      if (out.formFields > 0) failures.push("not_flattened_live_form_fields_survive");
      if (out.xfaPresent) failures.push("xfa_survives_in_output");
      if (!out.byteInspectable) failures.push("object_streams_hide_active_content_from_the_scan");
      if ((out.activeContentHits ?? []).length > 0) failures.push("active_content_residue");
      // The sidecar has to name this artifact and its hash has to match the
      // bytes on disk. That is a stronger claim than a producer string: a
      // stale artifact keeps its stamp, but its hash stops matching the moment
      // it or its inputs move.
      const provenanceRow = (provenance?.artifacts ?? []).find((a) => a.artifact === spec.rel) ?? null;
      out.provenanceRecorded = Boolean(provenanceRow);
      out.outputShaMatchesProvenance = provenanceRow ? provenanceRow.outputSha256 === sha256Of(bytes) : null;
      if (!provenanceRow) failures.push("no_provenance_record_names_this_artifact");
      else if (!out.outputShaMatchesProvenance) failures.push("provenance_hash_does_not_match_the_bytes_on_disk");
      if (spec.expectsParticipantValues && out.markersInPageContent.length === 0) {
        failures.push(out.markersOnlyInFieldValues.length > 0
          ? "participant_values_exist_only_in_unflattened_widget_appearances"
          : "participant_values_absent_from_the_artifact_entirely");
      }
      if (out.protectedFieldsWrittenByFactory.length > 0) failures.push("protected_field_written_by_the_factory");
      if (out.protectedFieldsHoldingSourceDefaults.length > 0) {
        failures.push("protected_field_holds_a_source_default_that_flattening_would_drop");
      }

      artifacts.push({
        ...spec, present: true,
        bytes: bytes.length,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        ...out,
        finalized: failures.length === 0,
        failures
      });
    }

    // A retired family has left the operational inventory. Its artifacts are
    // still described here -- deleting the observation would make the audit
    // lie about what is on disk -- but marked, so downstream checks do not
    // demand a register row for an asset the register deliberately excludes.
    const retirementMarker = readJson(path.join(familyPath, "retirement.json"));

    families.push({
      retired: Boolean(retirementMarker),
      retirementBasis: retirementMarker?.basis ?? null,
      familyId: `${String(record.jurisdiction ?? stateDir).toUpperCase()}:${familyDir}`,
      jurisdiction: String(record.jurisdiction ?? stateDir).toUpperCase(),
      familySlug: familyDir,
      relativePath: path.relative(rootDir, familyPath),
      documentId: record.documentId ?? record.fileName ?? familyDir,
      sourceSha256: record.sha256 ?? record.expectedSha256 ?? null,
      // A sheet the current builder wrote is accompanied by the proof that its
      // values are visible. A sheet without one was never proved to show them.
      contactSheetProofPresent: fs.existsSync(path.join(familyPath, "contact-sheet/contact-sheet-proof.json")),
      artifacts
    });
  }
}

const operational = families.filter((f) => !f.retired);
const withArtifacts = families.filter((f) => f.artifacts.some((a) => a.present));
const allArtifacts = families.flatMap((f) => f.artifacts.filter((a) => a.present));
const failureCount = (key) => allArtifacts.filter((a) => a.failures.includes(key)).length;

const totals = {
  familiesInspected: families.length,
  familiesRetiredFromOperationalInventory: families.length - operational.length,
  operationalFamilies: operational.length,
  familiesCarryingArtifacts: withArtifacts.length,
  artifactsInspected: allArtifacts.length,
  artifactsFinalized: allArtifacts.filter((a) => a.finalized).length,
  artifactsNotFinalized: allArtifacts.filter((a) => !a.finalized).length,
  familiesWithNoFinalizedArtifact: withArtifacts.filter((f) => !f.artifacts.some((a) => a.present && a.finalized)).length,
  contactSheetsPresent: allArtifacts.filter((a) => a.kind === "contact_sheet").length,
  contactSheetsWithVisibilityProof: families.filter((f) => f.contactSheetProofPresent).length,
  notFlattened: failureCount("not_flattened_live_form_fields_survive"),
  notByteInspectable: failureCount("object_streams_hide_active_content_from_the_scan"),
  withoutAProvenanceRecord: failureCount("no_provenance_record_names_this_artifact"),
  provenanceHashMismatch: failureCount("provenance_hash_does_not_match_the_bytes_on_disk"),
  activeContentResidue: failureCount("active_content_residue"),
  xfaSurvives: failureCount("xfa_survives_in_output"),
  valuesOnlyInWidgetAppearances: failureCount("participant_values_exist_only_in_unflattened_widget_appearances"),
  valuesAbsentEntirely: failureCount("participant_values_absent_from_the_artifact_entirely"),
  protectedFieldWrittenByTheFactory: failureCount("protected_field_written_by_the_factory"),
  protectedFieldHoldingASourceDefault: failureCount("protected_field_holds_a_source_default_that_flattening_would_drop"),
  doesNotParse: failureCount("does_not_parse")
};

const payload = {
  schemaVersion: "rcap-finalized-artifact-audit/v1",
  generatedBy: "scripts/generate-rcap-finalized-artifact-audit.mjs",
  purpose: "Whether each committed lane-D1 artifact is the finalized participant artifact its factory contract describes, observed from the bytes in the clone.",
  finalizationContract: {
    flattened: "No AcroForm field survives, so no value depends on a viewer choosing to draw a widget appearance.",
    byteInspectable: "Serialized without object streams, so the active-content residue scan can see into every object it judges.",
    activeContentClean: "No JavaScript, XFA, OpenAction, additional-action, launch, submit, import, remote-goto or rich-media residue.",
    provenanceRecorded: "A sidecar artifact-provenance.json names this artifact and its output hash matches the bytes on disk. Provenance is external because the PDF carries the court's own metadata, not ours.",
    valuesInPageContent: "A fixture meant to carry participant values carries them in extractable page content.",
    protectedFieldsBlank: "No field this family's own policy marks unwritable or manual carries a value. A value the factory wrote there is a factory defect; a value it did not write is the form's own preprinted default, surviving because the artifact was never flattened."
  },
  readingThisAudit: "An artifact that is not finalized cannot be treated as review evidence. A contact sheet built from an unflattened artifact shows two blank panels: the values are in widget appearances the sheet's page-copy does not carry. Presence of a contact sheet is therefore not proof that anything is visible in it.",
  totals,
  families
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) {
    console.error(`FAIL finalized-artifact audit — ${path.relative(rootDir, OUT)} is stale; re-run scripts/generate-rcap-finalized-artifact-audit.mjs`);
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
}

console.log(`OK finalized-artifact audit — ${totals.artifactsInspected} artifacts across ${totals.familiesCarryingArtifacts} families; finalized ${totals.artifactsFinalized}, not finalized ${totals.artifactsNotFinalized}`);
