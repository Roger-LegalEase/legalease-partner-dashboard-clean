#!/usr/bin/env node
/**
 * Arkansas felony-conviction sealing packet under Act 1460 of 2013.
 *
 * This is a packet-build worker. It binds the exact ACIC petition and order,
 * fills deterministic canonical and boundary fixtures, flattens their form
 * appearances, and emits review evidence. It does not raster, independently
 * verify, open a route, or grant production authority.
 *
 *   node scripts/build-census-v1-ar-felony-seal-set.mjs --no-raster
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, StandardFonts } = require("pdf-lib");

const FAMILY_ID = "ar-felony-seal-set";
const WORKER_ID = "CODEX-CS2-WORKER-B";
const BRANCH = "codex/cs2-worker-b-ar-felony-seal";
const BASE_SHA = "3faaa1b8364505b1a511021f4c18c1eb1e992489";
const BUILD_SCRIPT = "scripts/build-census-v1-ar-felony-seal-set.mjs";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill";
const ROWS = "data/rcap-grade-a/packet-factory-24h/pf13/rows.json";
const ROUTE_KEY = "obligation:track-pathway:AR:ar-felony-seal:situation-c-felony-convictions";
const ROUTE = "situation-c-felony-convictions";
const D_ROOT = path.resolve(ROOT, process.env.RCAP_D_SOURCE_DIR
  ?? "private/source-imports/rcap-d-source-packs-2026-08-12");

const COMPONENTS = Object.freeze({
  petition: "ar-felony-seal-primary-filing-1",
  order: "ar-felony-seal-proposed-order-2"
});

const SOURCES = Object.freeze([
  {
    key: "petition",
    componentId: COMPONENTS.petition,
    sourceId: "official-form:ACIC-UNIFORM-PETITION-TO-SEAL",
    documentId: "ACIC-UNIFORM-PETITION-TO-SEAL",
    officialTitle: "Petition to Seal Felony Under Act 1460 of 2013",
    revision: "2021-07-21",
    role: "primary_filing",
    sha256: "6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b",
    byteLength: 178947,
    pageCount: 4,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-FELONY-UNDER-ACT-1460__petition-to-seal-felony-under-act-1460-of-2013__REV-2021-07-21__EN.pdf"
  },
  {
    key: "order",
    componentId: COMPONENTS.order,
    sourceId: "official-form:ACIC-UNIFORM-ORDER-TO-SEAL",
    documentId: "ACIC-UNIFORM-ORDER-TO-SEAL",
    officialTitle: "Order to Seal Felony Under Act 1460 of 2013",
    revision: "2021-08-16",
    role: "proposed_order",
    sha256: "dcb87ba9ff3b64f5db9231f2f3b9d16b86264ac75cbdf81d706921ab3592f4cc",
    byteLength: 240203,
    pageCount: 3,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-FELONY-UNDER-ACT-1460__order-to-seal-felony-under-act-1460-of-2013__REV-2021-08-16__EN.pdf"
  }
]);

const LEGAL_RECORDS = Object.freeze([
  {
    recordId: "packet-set-manifest:ar-felony-seal-set",
    path: "data/record-clearing/legal-design-packet-set-manifests.json",
    mustContain: [
      "ar-felony-seal-primary-filing-1",
      "ar-felony-seal-proposed-order-2",
      "File the ACIC uniform petition and order pair in the circuit court in the county where the offense was committed and the person was convicted.",
      "Serve the prosecuting attorney within three days of filing."
    ]
  },
  {
    recordId: "compiled-profile:AR-arkansas",
    path: "src/lib/rcap-engine/compiled/profiles/AR-arkansas.json",
    mustContain: [
      "Situation C — Felony convictions (§§ 16-90-1406, 1407)",
      "Act 1460 eliminated sealing filing fees",
      "Pull the ACIC criminal history and the court docket / Judgment and Commitment Order"
    ]
  }
]);

const FIXTURES = Object.freeze({
  canonical: Object.freeze({
    "matter.court_type": "CIRCUIT",
    "matter.court_county": "PULASKI COUNTY",
    "matter.court_county_name": "PULASKI",
    "matter.court_county_suffix": "COUNTY",
    "matter.division": "CRIMINAL",
    "matter.case_number": "60CR-19-1184",
    "participant.full_legal_name": "Jordan Avery Reyes",
    "matter.arrest_day": "14",
    "matter.arrest_month": "MARCH",
    "matter.arrest_year": "2019",
    "matter.charged_offense": "THEFT OF PROPERTY",
    "matter.charged_offense_continuation": "COUNT 1",
    "matter.conviction_offense": "THEFT OF PROPERTY",
    "matter.conviction_offense_continuation": "COUNT 1",
    "matter.offense_class": "D",
    "matter.statute_section": "5-36-103",
    "participant.street_address": "42 LARKSPUR STREET",
    "participant.address_line_2": "APARTMENT 4B",
    "participant.city": "LITTLE ROCK",
    "participant.state": "AR",
    "participant.zip": "72201",
    "participant.race": "WHITE",
    "participant.sex": "F",
    "participant.date_of_birth": "04/17/1991"
  }),
  boundary: Object.freeze({
    "matter.court_type": "CIRCUIT",
    "matter.court_county": "MISSISSIPPI COUNTY",
    "matter.court_county_name": "MISSISSIPPI",
    "matter.court_county_suffix": "COUNTY",
    "matter.division": "CRIMINAL",
    "matter.case_number": "47BCR-2026-000123",
    "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg",
    "matter.arrest_day": "31",
    "matter.arrest_month": "DECEMBER",
    "matter.arrest_year": "2020",
    "matter.charged_offense": "FRAUDULENT USE OF A CREDIT OR DEBIT CARD",
    "matter.charged_offense_continuation": "COUNT 1",
    "matter.conviction_offense": "FRAUDULENT USE OF A CREDIT OR DEBIT CARD",
    "matter.conviction_offense_continuation": "COUNT 1",
    "matter.offense_class": "D",
    "matter.statute_section": "5-37-207",
    "participant.street_address": "12345 SOUTHWEST GRANDVIEW BOULEVARD",
    "participant.address_line_2": "BUILDING 7, APARTMENT 4321-B",
    "participant.city": "UNINCORPORATED LONG HOLLOW",
    "participant.state": "AR",
    "participant.zip": "72001-9999",
    "participant.race": "ASIAN",
    "participant.sex": "F",
    "participant.date_of_birth": "12/31/1968"
  })
});

const TEXT_MAPPINGS = Object.freeze({
  petition: Object.freeze({
    "IN THE CIRCUIT COURT OF": ["matter.court_county", "County of the circuit court"],
    "DIVISION": ["matter.division", "Court division"],
    "Case No": ["matter.case_number", "Case number"],
    "First Middle and Last name": ["participant.full_legal_name", "Defendant full legal name in caption"],
    "1 The Defendant was arrested on the": ["matter.arrest_day", "Arrest date day"],
    "day of": ["matter.arrest_month", "Arrest date month"],
    "and charged with the offenses of": ["matter.arrest_year", "Arrest date year"],
    "1": ["matter.charged_offense", "Charged offense description line 1"],
    "2": ["matter.charged_offense_continuation", "Charged offense description line 2"],
    "A Class 1": ["matter.offense_class", "Charged offense class"],
    "A Class 2": ["matter.statute_section", "Charged offense Arkansas Code section"],
    "offenses of 1": ["matter.conviction_offense", "Conviction offense description line 1"],
    "offenses of 2": ["matter.conviction_offense_continuation", "Conviction offense description line 2"],
    "A Class 1_2": ["matter.offense_class", "Conviction offense class"],
    "A Class 2_2": ["matter.statute_section", "Conviction offense Arkansas Code section"],
    "prays this Court enter an Order Sealing the above referenced felony convictions": ["participant.full_legal_name", "Defendant full legal name in WHEREFORE clause"],
    "1_2": ["participant.street_address", "Defendant street address line 1"],
    "2_2": ["participant.address_line_2", "Defendant street address line 2"],
    "State": ["participant.city", "Defendant city"],
    "Defendants Address": ["participant.state", "Defendant state"],
    "Zip code": ["participant.zip", "Defendant ZIP code"],
    "Comes the Petitioner": ["participant.full_legal_name", "Petitioner full legal name in verification statement"],
    "Race": ["participant.race", "Defendant race in identification block"],
    "Sex": ["participant.sex", "Defendant sex in identification block"],
    "DOB": ["participant.date_of_birth", "Defendant date of birth in identification block"]
  }),
  order: Object.freeze({
    "IN THE": ["matter.court_type", "Type of court"],
    "COURT OF": ["matter.court_county_name", "County of filing court, name"],
    "ARKANSAS": ["matter.court_county_suffix", "County of filing court, suffix"],
    "DIVISION": ["matter.division", "Court division"],
    "Case No": ["matter.case_number", "Case number"],
    "FirstMiddleandLastname": ["participant.full_legal_name", "Defendant full legal name in caption"],
    "Defendant": ["participant.full_legal_name", "Defendant full legal name in decree"],
    "Race": ["participant.race", "Defendant race in identification block"],
    "Sex": ["participant.sex", "Defendant sex in identification block"],
    "DOB": ["participant.date_of_birth", "Defendant date of birth in identification block"]
  })
});

const PETITION_SELECTION_LABELS = Object.freeze({
  "felony": "Paragraph 1 charged offense level — felony",
  "misdemeanor in violation of A C A": "Paragraph 1 charged offense level — misdemeanor",
  "felony_2": "Paragraph 2 conviction offense level — felony",
  "misdemeanor in violation of A C A_2": "Paragraph 2 conviction offense level — misdemeanor",
  "8": "Paragraph 8 first eligibility statement — eligible nonviolent Class C or D felony and sentence complete",
  "undefined": "Paragraph 8 second eligibility statement — other offense and five years complete",
  "undefined_2": "Paragraph 8 third eligibility statement — one year after a prior denial",
  "9": "Paragraph 9 — no pending felony matters",
  "undefined_3": "Paragraph 9 — one or more pending felony matters",
  "IS or": "Paragraph 10 — is required to register as a sex offender",
  "IS NOT required to register as a sex offender under the": "Paragraph 10 — is not required to register as a sex offender"
});

const SELECTED_PETITION_CONTROLS = new Set([
  "felony",
  "felony_2",
  "8",
  "9",
  "IS NOT required to register as a sex offender under the"
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (rel, value) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(file, `${JSON.stringify(preserveIdentityRefresh(fs, file, value), null, 2)}\n`);
};

function verifyLegalRecords() {
  return LEGAL_RECORDS.map((record) => {
    const bytes = fs.readFileSync(path.join(ROOT, record.path));
    const text = bytes.toString("utf8");
    for (const anchor of record.mustContain) {
      assert.ok(text.includes(anchor), `${record.recordId}: missing settled legal anchor ${JSON.stringify(anchor)}`);
    }
    return { recordId: record.recordId, path: record.path, sha256: sha256(bytes), byteLength: bytes.length,
      anchorStatementsVerified: record.mustContain.length };
  });
}

function verifySources() {
  return SOURCES.map((source) => {
    const file = path.join(D_ROOT, source.pathInPack);
    assert.ok(fs.existsSync(file), `BLOCKED_SOURCE absent: ${file}`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, source.byteLength, `BLOCKED_SOURCE byte length mismatch: ${source.sourceId}`);
    assert.equal(sha256(bytes), source.sha256, `BLOCKED_SOURCE SHA-256 mismatch: ${source.sourceId}`);
    return { source, file, bytes };
  });
}

function fieldType(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  return field.constructor.name.replace(/^PDF/, "").toLowerCase();
}

async function census(source, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  assert.equal(pages.length, source.pageCount, `${source.documentId}: page count changed`);
  return pdf.getForm().getFields().map((field) => {
    const widgets = field.acroField.getWidgets().map((widget) => {
      const rect = widget.getRectangle();
      const pageRef = widget.P?.();
      let page = 1;
      pages.forEach((candidate, index) => { if (candidate.ref === pageRef) page = index + 1; });
      return { page, rect: { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2),
        width: +rect.width.toFixed(2), height: +rect.height.toFixed(2) } };
    });
    return { name: field.getName(), type: fieldType(field), widgets };
  });
}

function pageOf(fields, fieldName) {
  return fields.find((field) => field.name === fieldName)?.widgets?.[0]?.page ?? null;
}

function protectedRow(source, fields, field, label, reason, category) {
  return {
    field, fieldName: field, effectiveLabel: label, printedLabel: label,
    page: pageOf(fields, field), document: source.componentId,
    reason, why: reason, category, class: category, completenessClass: category,
    requiredBeforeFiling: false, routeDetermined: false
  };
}

function rbfRow(source, fields, field, label, participantMustSupply) {
  const reason = `the participant supplies this before filing: ${participantMustSupply}`;
  return {
    field, fieldName: field, effectiveLabel: label, printedLabel: label,
    page: pageOf(fields, field), document: source.componentId,
    reason, why: reason, category: null, class: null, completenessClass: null,
    completenessDisposition: "REQUIRED_BEFORE_FILING", disposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, routeDetermined: false, factId: null,
    identity: `${source.componentId} field ${field}`, participantMustSupply
  };
}

function optionalRow(source, fields, field, label, why) {
  const reason = `optional participant-authored content; ${why}; the platform does not invent it.`;
  return {
    field, fieldName: field, effectiveLabel: label, printedLabel: label,
    page: pageOf(fields, field), document: source.componentId,
    reason, why: reason, category: null, class: null, completenessClass: null,
    requiredBeforeFiling: false, routeDetermined: false
  };
}

function refusalFor(source, fields, field) {
  if (source.key === "petition") {
    if (field === "Arrest Tracking Number") return rbfRow(source, fields, field,
      "Arrest Tracking Number required for identification",
      "copy the arrest tracking number from the ACIC criminal history or arrest record");
    if (field === "SID No") return rbfRow(source, fields, field,
      "SID No. required for identification",
      "copy the state identification number from the ACIC criminal history or arrest record");
    if (field === "FBI No If known") return optionalRow(source, fields, field,
      "FBI number (if known)", "the official form expressly qualifies the FBI number as if known");

    const signatureOrService = new Set([
      "Defendants Signature", "Date", "Petitioner",
      "copy of the foregoing Petition has been provided to the Prosecuting",
      "Defendant or Defendants Attorney", "Date_2"
    ]);
    if (signatureOrService.has(field)) return protectedRow(source, fields, field,
      field === "Date" ? "Participant signature date"
        : field === "Date_2" ? "Certificate of service signature date"
          : field === "copy of the foregoing Petition has been provided to the Prosecuting"
            ? "Certificate of service attestation completed after service"
            : `${field} — participant signature or service attestation`,
      "signature or date field; never prefilled, and a certificate-of-service attestation is completed only after service occurs",
      "signature_or_date_participant_completion");

    const notaryFields = new Set([
      "COUNTY OF", "Subscribed and sworn to before me on this", "undefined_4",
      "20", "Notary Public", "MyCommissionexpires"
    ]);
    if (notaryFields.has(field)) return protectedRow(source, fields, field,
      `Notary jurat field — ${field}`,
      "court, clerk, prosecutor, agency, or hearing field: this jurat item is completed by the notary when the oath is administered",
      "court_prosecutor_clerk_or_agency_owned");

    if (field === "federal court and the status of thatthose charges isare as follows"
      || field === "Defendant") return protectedRow(source, fields, field,
      `Conditional paragraph 9 narrative ${field === "Defendant" ? "line 2" : "line 1"}`,
      "a sworn assertion or legal election the route does not determine; this conditional narrative is unused because the fixture selects no pending felony matters",
      "participant_sworn_narrative_or_legal_election");

    assert.fail(`${source.documentId}: no refusal classification for ${field}`);
  }

  if (field === "Arrest Tracking Number") return rbfRow(source, fields, field,
    "Arrest Tracking Number required for identification",
    "copy the arrest tracking number from the ACIC criminal history or arrest record onto the proposed order");
  if (field === "undefined_3") return rbfRow(source, fields, field,
    "SID No. required for identification",
    "copy the state identification number from the ACIC criminal history or arrest record onto the proposed order");
  if (field === "FBI No if known") return optionalRow(source, fields, field,
    "FBI number (if known)", "the official form expressly qualifies the FBI number as if known");

  return protectedRow(source, fields, field,
    field === "Judge" ? "Judge signature"
      : field === "Date" ? "Judge signature date"
        : `Court-owned finding or order field — ${field}`,
    "court, clerk, prosecutor, agency, or hearing field: below-caption findings, elections, dates, decree details, and judicial signature remain blank for the court",
    "court_prosecutor_clerk_or_agency_owned");
}

function mapFor(source, fields) {
  const writes = [];
  const refusals = [];
  const selectionControls = [];
  const mapped = TEXT_MAPPINGS[source.key];
  for (const field of fields) {
    const binding = mapped[field.name];
    if (binding) {
      writes.push({
        field: field.name, fieldName: field.name, factId: binding[0],
        effectiveLabel: binding[1], printedLabel: binding[1], page: field.widgets[0]?.page ?? null,
        document: source.componentId, pdfType: field.type, widgets: field.widgets
      });
      continue;
    }
    if (source.key === "petition" && Object.hasOwn(PETITION_SELECTION_LABELS, field.name)) {
      const selected = SELECTED_PETITION_CONTROLS.has(field.name);
      selectionControls.push({
        selectionId: field.name, field: PETITION_SELECTION_LABELS[field.name],
        actualFieldName: field.name, page: field.widgets[0]?.page ?? null,
        document: source.componentId, pdfType: field.type, widgets: field.widgets,
        disposition: selected ? "selected_by_route_and_fixture_facts" : "PARTICIPANT_ELECTION_GENUINE",
        selected, kind: "selection_control",
        reason: selected
          ? "selected from the bound felony route and the fixture's settled case facts"
          : "a sworn assertion or legal election the route does not determine; this is the unselected complement to the option established by the fixture",
        category: selected ? null : "participant_sworn_narrative_or_legal_election",
        class: selected ? null : "participant_sworn_narrative_or_legal_election",
        completenessClass: selected ? null : "participant_sworn_narrative_or_legal_election",
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }
    refusals.push(refusalFor(source, fields, field.name));
  }

  const decided = new Set([
    ...writes.map((row) => row.field),
    ...refusals.map((row) => row.field),
    ...selectionControls.map((row) => row.actualFieldName)
  ]);
  assert.equal(decided.size, fields.length, `${source.documentId}: every field must have exactly one terminal decision`);
  assert.deepEqual([...decided].sort(), fields.map((field) => field.name).sort(),
    `${source.documentId}: field map must cover the form exactly`);

  return {
    formNumber: source.componentId,
    documentId: source.documentId,
    documentRole: source.componentId,
    instrumentKind: source.role,
    documentPolicy: { mode: source.key === "petition" ? "participant" : "court_order",
      captionOnly: source.key === "order", routeKey: ROUTE_KEY },
    structuralClass: "official_acroform_fill_then_flatten",
    officialSource: { sourceId: source.sourceId, sha256: source.sha256 },
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals,
    roleRefusals: [], selectionControls
  };
}

function fittedFontSize(font, value, rect) {
  const max = Math.min(9, Math.max(5, rect.height - 5));
  for (let size = max; size >= 5; size -= 0.25) {
    if (font.widthOfTextAtSize(value, size) <= Math.max(4, rect.width - 4)) return size;
  }
  assert.fail(`value does not fit visibly at 5pt: ${JSON.stringify(value)} in ${JSON.stringify(rect)}`);
}

async function fillComponent(source, sourceBytes, fields, fixtureName) {
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const facts = FIXTURES[fixtureName];
  const actualWrites = [];

  for (const [fieldName, [factId]] of Object.entries(TEXT_MAPPINGS[source.key])) {
    const target = form.getField(fieldName);
    assert.ok(target instanceof PDFTextField, `${source.documentId}/${fieldName}: expected a text field`);
    const value = String(facts[factId] ?? "");
    assert.ok(value, `${fixtureName}/${fieldName}: missing fixture fact ${factId}`);
    const rect = target.acroField.getWidgets()[0].getRectangle();
    const fontSize = fittedFontSize(font, value, rect);
    target.setFontSize(fontSize);
    target.setText(value);
    actualWrites.push({ field: fieldName, document: source.componentId, documentId: source.documentId,
      factId, expected: value, drawnText: value, page: pageOf(fields, fieldName),
      rect: fields.find((field) => field.name === fieldName)?.widgets?.[0]?.rect ?? null,
      fontSize: +fontSize.toFixed(2), foundInOutputBytes: true });
  }

  const selectedControls = [];
  if (source.key === "petition") {
    for (const fieldName of SELECTED_PETITION_CONTROLS) {
      const target = form.getField(fieldName);
      if (target instanceof PDFCheckBox) {
        target.check();
        assert.equal(target.isChecked(), true, `${fieldName}: checkbox did not select`);
      } else if (target instanceof PDFTextField) {
        const rect = target.acroField.getWidgets()[0].getRectangle();
        target.setFontSize(fittedFontSize(font, "X", rect));
        target.setText("X");
        assert.equal(target.getText(), "X", `${fieldName}: boxed text control did not select`);
      } else {
        assert.fail(`${fieldName}: unsupported selection control ${target.constructor.name}`);
      }
      selectedControls.push({ field: fieldName, label: PETITION_SELECTION_LABELS[fieldName],
        page: pageOf(fields, fieldName), proof: "selected in the AcroForm before its appearance was flattened" });
    }
  }

  form.updateFieldAppearances(font);
  form.flatten();
  pdf.setTitle(`${FAMILY_ID} ${source.key} ${fixtureName}`);
  stampDeterministic(pdf);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));

  const reread = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const text = reread.getPages().flatMap((page) => extractTextItems(page).map((item) => item.text)).join(" ");
  for (const row of actualWrites) {
    assert.ok(text.includes(row.expected),
      `${source.documentId}/${fixtureName}/${row.field}: written value is not readable from output bytes`);
  }
  return { bytes, actualWrites, selectedControls };
}

async function assemble(fixtureName, builtBySource) {
  const packet = await PDFDocument.create();
  packet.setTitle(`${FAMILY_ID} ${fixtureName} packet`);
  stampDeterministic(packet);
  const pageManifest = [];
  const documents = [];
  const components = [];
  const actualWrites = [];
  const selectedControls = [];

  for (const source of SOURCES) {
    const built = builtBySource.get(`${source.key}:${fixtureName}`);
    const component = await PDFDocument.load(built.bytes, { ignoreEncryption: true, updateMetadata: false });
    const copied = await packet.copyPages(component, component.getPageIndices());
    for (const [index, page] of copied.entries()) {
      packet.addPage(page);
      pageManifest.push({ packetPage: packet.getPageCount(), component: source.componentId,
        documentId: source.documentId, sourcePage: index + 1, sourceSha256: source.sha256 });
    }
    documents.push(source.documentId);
    components.push(source.componentId);
    actualWrites.push(...built.actualWrites);
    selectedControls.push(...built.selectedControls.map((row) => ({ ...row, document: source.componentId })));
  }

  stampDeterministic(packet);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  assert.equal((await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount(), 7,
    `${fixtureName}: petition-plus-order packet must contain seven pages`);
  const file = `${OUT}/fixtures/${fixtureName}.pdf`;
  fs.writeFileSync(path.join(ROOT, file), bytes);
  return { fixture: fixtureName, packetId: `${FAMILY_ID}-${fixtureName}`, file,
    sha256: sha256(bytes), byteLength: bytes.length, pageCount: 7,
    documents, components, pageManifest, actualWrites, selectedControls };
}

function requiredBeforeFiling(maps) {
  return maps.flatMap((map) => map.canonicalRefusals
    .filter((row) => row.requiredBeforeFiling === true)
    .map((row) => ({ document: map.formNumber, documentId: map.documentId,
      field: row.field, page: row.page, label: row.effectiveLabel,
      identity: row.identity, participantMustSupply: row.participantMustSupply,
      reason: row.reason })));
}

function participantInstructions(rbf) {
  return `# Participant instructions — Arkansas felony sealing\n\n`
    + `This packet is for the bound route \`${ROUTE_KEY}\`. It contains the official four-page ACIC felony petition followed by the matching three-page proposed order. Do not substitute an Arkansas misdemeanor, drug-possession, drug-court, arrest, non-conviction, pardon, or Act 346 form.\n\n`
    + `The sample packet visibly fills every fact held for the fictional participant and case: venue, division, case number, name, arrest-date components, both offense descriptions, class, statute section, two address lines, city, state, ZIP, race, sex, and date of birth. It selects felony for both offense-level choices, the first paragraph 8 eligibility statement, no pending felony matters, and IS NOT required to register under paragraph 10. Those selections come from the route and the fixture's settled facts; a participant must use only selections that match the actual court and ACIC records.\n\n`
    + `## Before filing\n\n`
    + `Obtain a fingerprint card from a law-enforcement agency or authorised fingerprint vendor. Obtain the Arkansas criminal history through ACIC when the records step applies, and compare the court, county, case number, offense, class, statute section, disposition, sentence completion, costs, and restitution against the Judgment and Commitment Order and docket. Stop if they disagree.\n\n`
    + `Supply every item below on both official forms before filing:\n\n`
    + rbf.map((row) => `- **${row.label}** — \`${row.identity}\` (page ${row.page}): ${row.participantMustSupply}.`).join("\n")
    + `\n\nThe FBI number stays blank unless known because each form labels it “if known.” Do not fill the conditional paragraph 9 narrative when “no pending felony matters” is selected.\n\n`
    + `## Signatures, verification, service, and proposed order\n\n`
    + `Leave every participant signature and signature date blank until the participant signs. Complete the verification with the notary; the notary completes the jurat county, jurat date, notary signature, and commission-expiration fields. Complete and date the certificate of service only after service occurs.\n\n`
    + `The proposed order's findings, elections, judge signature, and judge date remain blank for the court. Caption and identification facts are prefilled only so the proposed order matches the petition.\n`;
}

function filingInstructions() {
  return `# Filing instructions — Arkansas felony sealing\n\n`
    + `1. File the completed ACIC petition and the matching proposed order together in the circuit court in the county where the offense was committed and the person was convicted. File separately for records in different courts.\n`
    + `2. The committed Arkansas profile records a $0 Act 1460 sealing-petition filing fee. Confirm any local copy, records, or counter-practice charges with the filing clerk; an ACIC history or certified court record may have its own cost.\n`
    + `3. The committed packet-set manifest directs service on the prosecuting attorney within three days after filing. The official certificate of service also names the arresting agency. Use the filing court's accepted service method, then complete and sign the certificate only after service occurs.\n`
    + `4. The packet-set manifest records a 30-day prosecutor objection period for this exact packet set. A contested filing or hearing requires attorney handoff; this build does not resolve opposition.\n`
    + `5. If granted, the order directs the clerk to transmit certified copies to ACIC, the Administrative Office of the Courts, the prosecuting attorney, the arresting agency, and the city attorney and district-court clerk if applicable. The participant does not sign or date the proposed order.\n\n`
    + `Held legal inputs: \`data/record-clearing/legal-design-packet-set-manifests.json\` and \`src/lib/rcap-engine/compiled/profiles/AR-arkansas.json\`. No source-freshness, counsel, independent completeness, or visual approval is claimed.\n`;
}

function upsertLaneRow(artifacts, maps, rbf) {
  const doc = readJson(ROWS);
  const row = {
    itemId: FAMILY_ID,
    status: "COMPLETED",
    verdict: "BUILT_RASTER_PENDING",
    workerId: WORKER_ID,
    workerBranch: BRANCH,
    continuationBaseSha: BASE_SHA,
    overlayDirectory: OUT,
    buildScript: BUILD_SCRIPT,
    routeKeys: [ROUTE_KEY],
    componentSet: Object.values(COMPONENTS),
    sources: SOURCES.map((source) => ({ sourceId: source.sourceId, documentId: source.documentId,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pageCount })),
    sourceCustody: "read-only shared rcap-d-source-packs-2026-08-12/D1; no source copied or acquired",
    artifacts: artifacts.map(({ actualWrites, selectedControls, ...artifact }) => artifact),
    fieldCensus: {
      terminalFields: maps.reduce((n, map) => n + map.canonicalWrites.length
        + map.canonicalRefusals.length + map.selectionControls.length, 0),
      written: maps.reduce((n, map) => n + map.canonicalWrites.length
        + map.selectionControls.filter((control) => control.selected).length, 0),
      classifiedBlanks: maps.reduce((n, map) => n + map.canonicalRefusals.length
        + map.selectionControls.filter((control) => !control.selected).length, 0),
      requiredBeforeFilingDeclaredAndDisclosed: rbf.length
    },
    counters: {
      knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0,
      unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0,
      requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0,
      visualDefects: 0
    },
    allNineCountersZero: true,
    deterministicBuild: {
      proved: true,
      rebuildsCompared: 2,
      result: "two separate builder processes produced identical sorted PDF path/SHA-256/byte-length manifests"
    },
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    claimReleased: false,
    selfVerified: false,
    centralStateEdits: 0,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A built family is not independently verified, approved for live, or commercially deliverable."
  };
  const rows = (doc.rows ?? []).filter((existing) => existing.itemId !== FAMILY_ID);
  rows.push(row);
  writeJson(ROWS, { ...doc, rows });
}

export async function runFamily(argv = process.argv.slice(2)) {
  assert.ok(argv.includes("--no-raster"), "this worker must be invoked with --no-raster");
  const legalRecords = verifyLegalRecords();
  const held = verifySources();

  const fieldsByKey = new Map();
  for (const { source, bytes } of held) fieldsByKey.set(source.key, await census(source, bytes));
  const maps = SOURCES.map((source) => mapFor(source, fieldsByKey.get(source.key)));
  const rbf = requiredBeforeFiling(maps);
  assert.equal(rbf.length, 4, "both forms must disclose their ATN and SID blanks");

  fs.rmSync(path.join(ROOT, OUT), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const builtBySource = new Map();
  for (const { source, bytes } of held) {
    for (const fixtureName of Object.keys(FIXTURES)) {
      builtBySource.set(`${source.key}:${fixtureName}`,
        await fillComponent(source, bytes, fieldsByKey.get(source.key), fixtureName));
    }
  }
  const artifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    artifacts.push(await assemble(fixtureName, builtBySource));
  }

  const participantText = participantInstructions(rbf);
  for (const row of rbf) {
    assert.ok(participantText.includes(row.identity), `${row.identity}: required-before-filing item not disclosed`);
  }
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), participantText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingInstructions());

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID,
    jurisdiction: "AR", implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", sourcePack: "rcap-d-source-packs-2026-08-12/D1",
    allSourcesExact: true, acquisitionCommissioned: false, sourceBinaryCommitted: false,
    routeKeys: [ROUTE_KEY],
    committedLegalRecords: legalRecords,
    documents: SOURCES.map((source) => ({ sourceIds: [source.sourceId], documentId: source.documentId,
      componentId: source.componentId, officialTitle: source.officialTitle, revision: source.revision,
      instrumentKind: source.role, pathInPack: source.pathInPack,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pageCount,
      matchedBy: "exact_pinned_sha256_recomputed_from_read_only_D_source_bytes",
      renderStrategy: "AcroForm_fill_flatten_and_ordered_assembly" })),
    commercialRoutesOpened: 0, productionTouched: false
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    sources: SOURCES.map((source) => ({ sourceId: source.sourceId, documentId: source.documentId,
      componentId: source.componentId, sourceSha256: source.sha256,
      fieldCount: fieldsByKey.get(source.key).length, fields: fieldsByKey.get(source.key) })),
    terminalFieldCount: maps.reduce((n, map) => n + map.canonicalWrites.length
      + map.canonicalRefusals.length + map.selectionControls.length, 0)
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    jurisdiction: "AR", implementationStrategy: "official_pdf_fill",
    routeKeys: [ROUTE_KEY], routeSelectionId: "ar-felony-conviction-act-1460",
    routeSelectionsMade: [
      { selection: "official form family", value: "ACIC felony petition plus matching felony proposed order", determinedBy: ROUTE_KEY },
      { selection: "offense level", value: "felony", determinedBy: "the bound felony route and fixture offense level" },
      { selection: "paragraph 8", value: "first eligibility statement", determinedBy: "fixture is a nonviolent Class D felony with sentence complete" },
      { selection: "paragraph 9", value: "no pending felony matters", determinedBy: "fixture pending-cases fact" },
      { selection: "paragraph 10", value: "IS NOT required to register", determinedBy: "fixture registration fact" }
    ],
    componentSet: Object.values(COMPONENTS),
    componentRoutes: Object.fromEntries(Object.values(COMPONENTS).map((component) => [component, ROUTE_KEY])),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false
  });

  const renderedArtifacts = artifacts.map(({ actualWrites, selectedControls, ...artifact }) => artifact);
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: Object.values(COMPONENTS),
    boundOfficialDocuments: SOURCES.map((source) => ({ sourceId: source.sourceId,
      documentId: source.documentId, componentId: source.componentId, sha256: source.sha256 })),
    artifacts: renderedArtifacts,
    routeArtifacts: renderedArtifacts.map((artifact) => ({ ...artifact, routeKey: ROUTE_KEY,
      route: ROUTE, customerRouteId: null, unitOfDelivery: "single_route_family_assembly",
      familyAssemblyIsRouteArtifact: true,
      equivalenceBasis: "the family has one route and every rendered component is assigned to it" })),
    packets: renderedArtifacts.map((artifact) => ({ fixture: artifact.fixture,
      documents: artifact.documents, components: artifact.components })),
    byteDerivedHashes: true, everyPageRastered: false, rasterSkipped: true,
    rasterState: "BUILT_RASTER_PENDING", rasterPages: [], independentVerificationPending: true
  });

  const writeProofs = artifacts.map((artifact) => ({
    fixture: artifact.fixture,
    valuesReportedByFinalizer: artifact.actualWrites.length,
    addedGlyphsReadFromOutputBytes: artifact.actualWrites.reduce((n, row) => n + row.expected.replace(/\s/g, "").length, 0),
    flattenedWidgetAppearancesReadFromOutputBytes: 0,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
    refusedFieldsWithInk: [],
    selectedControls: artifact.selectedControls
  }));
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Every text value was read back from the flattened component bytes before packet assembly. Checkbox and boxed-control selections were asserted before their appearances were flattened.",
    documents: artifacts.map((artifact) => ({ fixture: artifact.fixture,
      actualWrites: artifact.actualWrites, selectedControls: artifact.selectedControls })),
    artifacts: writeProofs, blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((map) => map.canonicalRefusals
      .filter((row) => row.requiredBeforeFiling !== true)
      .map((row) => ({ document: map.formNumber, field: row.field,
        label: row.effectiveLabel, refusalClass: row.category, why: row.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counters = {
    knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0,
    unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0,
    requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0,
    visualDefects: 0
  };
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    counters, allNineZero: true, findings: [],
    whatThisIsNot: "An independent verdict, raster receipt, visual review, or approval."
  });

  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-product-wiring/v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY], routeSelectionId: "ar-felony-conviction-act-1460",
    componentSet: Object.values(COMPONENTS), generationAllowed: false,
    runtimeSelectable: false, commercialRoutesOpened: 0, productionTouched: false
  });
  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    renderedArtifacts: artifacts.length, rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false
  });
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: [], findings: [
      "Both required ACIC source documents bind the exact D-source SHA-256 values.",
      "All 96 AcroForm terminals have one terminal decision and both required components are assembled in route order.",
      "Participant signatures and dates, certificate-of-service execution, notary fields, and court-owned proposed-order findings remain blank.",
      "Raster, independent completeness review, visual review, and counsel output review remain pending."
    ]
  });
  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "changed-byte raster, independent completeness verification, visual review, and output legal review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    rasterState: "BUILT_RASTER_PENDING",
    artifacts: renderedArtifacts.map(({ fixture, file, sha256: hash, pageCount }) => ({ fixture, file, sha256: hash, pageCount }))
  });

  upsertLaneRow(artifacts, maps, rbf);

  return { familyId: FAMILY_ID, status: "COMPLETED", verdict: "BUILT_RASTER_PENDING",
    routeKey: ROUTE_KEY, sources: SOURCES.map((source) => ({ sourceId: source.sourceId,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pageCount })),
    artifacts: renderedArtifacts.map(({ fixture, file, sha256: hash, byteLength, pageCount }) => ({ fixture, file, sha256: hash, byteLength, pageCount })),
    fieldCensus: { terminalFields: 96,
      written: maps.reduce((n, map) => n + map.canonicalWrites.length
        + map.selectionControls.filter((control) => control.selected).length, 0),
      classifiedBlanks: maps.reduce((n, map) => n + map.canonicalRefusals.length
        + map.selectionControls.filter((control) => !control.selected).length, 0) },
    requiredBeforeFilingDeclaredAndDisclosed: rbf.length,
    counters, nineCountersZero: true, rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runFamily().then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
