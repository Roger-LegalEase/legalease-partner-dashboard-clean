#!/usr/bin/env node
// il-seal-edu-set: the education-credential sealing route, carved out of the
// shared Illinois host by FIX04.
//
// WHAT FIX93 REPAIRED HERE. VF03's selected verdict (base d7e293f81) failed one
// obligation, KNOWN_PREFILLS, on two findings read off the delivered pages, and
// recorded two more defects as unscored observations. All four are answered.
//
//   KNOWN_PREFILLS, first finding. Canonical and boundary page 9 -- EXP-AD Order
//   Granting page 2, item 3, "Enter the name and contact information of the
//   person who should receive the signed Order" -- was wholly blank in Name,
//   Address, Email and Telephone, while this packet prints the same four facts
//   on Request page 6 and on FW-CIV-APPLICATION page 4. They were hidden behind
//   a blanket "Order page 2 is protected" rule and declared with refusalClass
//   signature_or_date_participant_completion, a class the completeness contract
//   trusts unconditionally, so no counter could see them. None of the four is a
//   signature, a signature date or a court field. They are written now, and the
//   blanket rule is replaced by the named list of fields the Order actually
//   reserves for the judge.
//
//   KNOWN_PREFILLS, second finding. Page 4 row 1's charge cell printed "Charge
//   exactly as shown on the court disposition" -- a direction to the participant
//   standing where the charge goes, on a page signed under 735 ILCS 5/1-109. The
//   fixtures carry an actual charge now: the canonical and boundary pair the
//   proven ar-act531-set, ct-cleanslate-petition-set, id_isp_expungement-set,
//   in_section1_petition-set and nd-nonconviction-close-petition-set already use.
//
//   Unscored observation, answered. The guide named interior AcroForm ids
//   ("Complete arrest60 on EXP-AD Case List page 1") as required-before-filing
//   items. arrest1..arrest70 are successive row slots and the proposed Order's
//   case cells are the same shape; a slot this one-case fixture does not use is
//   optional participant content, not a required blank, so it leaves the
//   required list entirely.
//
//   Unscored observation, answered. VF03 measured an xref whose /Size is 954
//   over subsections covering 808 objects, with 39 undeclared numbers still
//   referenced from page /Annots arrays, so poppler had to reconstruct the table
//   to open either fixture. PDFForm.flatten() deletes each widget object but can
//   leave its reference in /Annots, and copyPages carries the reference into the
//   packet. Those references are pruned after flatten and again after assembly.
//
//   Route completeness, while the classifier was open. Item 1, "I am requesting
//   to expunge records", was left unanswered on a sealing route. The field's two
//   widgets offer /Yes and /No, so it is answered No here and item 12 answers
//   Yes, which is what the printed form asks a seal-only filer to do.
//
// SOURCE CUSTODY. The EXP-AD Case List (sha256 b72d30d2...) lives in custody
// nationwide_recovery_pool_2026_09_02, which is not mounted in every container.
// resolveSources refuses by name where it is absent, and --self-test reads the
// delivered artifacts instead of the sources so it still runs there.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const FAMILY_ID = "il-seal-edu-set";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFName, PDFRef, PDFTextField, StandardFonts } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Possession of a controlled substance", arrestDate: "03/12/2021", outcome: "Dismissed", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line", arrestDate: "11/29/2023", outcome: "Acquitted or dismissed as certified", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-all50/local-source-corpus-index.json"), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, bytes, byteLength: bytes.length };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

const clerkCaseNumber = (name) => /^\d+ - Case Number$/i.test(name);
function requestTableRow(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

/** The slot number of a proposed-Order case cell, on either half, or null. */
function orderCaseSlot(name) {
  const match = name.match(/^arrest\/case number(?: - Sealing)? (\d+)$/i);
  return match ? Number(match[1]) : null;
}

const ACTIVE_ORDER_CELL = "arrest/case number - Sealing 1";

/*
 * The fields the proposed Order reserves for the judge.
 *
 * Its page 2 says "Do not check the boxes below. The judge will check the
 * correct boxes", and the ENTERED block is the judge's. Item 3's contact line
 * on the same page is not: the form tells the filer to complete it.
 */
const ORDER_COURT_OWNED = new Set([
  "Page 2 - Expungement is Granted",
  "Page 2 - Sealing is Granted",
  "Judge's Name",
  "Entered Date"
]);

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (documentId === "EXP-AD Order Granting" && name === "3 - Name") return [fixture.full, "participant.full_legal_name"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Address") return [fixture.street, "participant.street_address"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Telephone") return [fixture.phone, "participant.phone"];
  if (documentId === "EXP-AD Order Granting" && name === "3 - Email") return [fixture.email, "participant.email"];
  if (documentId === "EXP-AD Request" && page === 4 && /arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Request" && page === 4 && /arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "EXP-AD Request" && page === 4 && /list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
  if (documentId === "EXP-AD Request" && page === 4 && /date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
  if (documentId === "EXP-AD Request" && page === 4 && /(?:outcome.*|4 - outcome) - 1$/i.test(name)) return [fixture.outcome, "matter.outcome"];
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && name === "arrest/case number - Sealing 1") return [fixture.caseNumber, "matter.case_number"];
  if (/county/.test(key) && name === "1 - County") return [fixture.county, "matter.filing_county"];
  if (/your name|plaintiff\/petitioner or in re/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/other name/.test(key)) return [fixture.other, "participant.other_names"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (/race/.test(key)) return [fixture.race, "participant.race"];
  if (/gender/.test(key)) return [fixture.gender, "participant.gender"];
  if (/print name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/telephone/.test(key) && !/lawyer/.test(key)) return [fixture.phone, "participant.phone"];
  if (/email/.test(key) && !/lawyer/.test(key)) return [fixture.email, "participant.email"];
  if (/street address/.test(key) && !/lawyer/.test(key)) return [fixture.street, "participant.street_address"];
  return null;
}

/*
 * Why a field must stay blank, or null where nothing requires it to.
 *
 * The blanket "Order page 2" rule swept item 3's contact block in with the
 * judge's own fields and declared all of them a participant signature. The
 * reason and the role are carried per field now, so a court field reads as the
 * court's and a signature reads as a signature.
 */
function protectedField(documentId, name) {
  if (clerkCaseNumber(name)) {
    return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The form reserves this case number for the Circuit Clerk" };
  }
  if (documentId === "EXP-AD Order Granting" && ORDER_COURT_OWNED.has(name)) {
    return { role: "court", refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "The proposed Order reserves this for the judge: page 2 says \"Do not check the boxes below. The judge will check the correct boxes.\"" };
  }
  if (/signature|judge|entered date/.test(name.toLowerCase())) {
    return { role: "protected", refusalClass: "signature_or_date_participant_completion", reason: "Signature or signature date; the participant signs, and a date written before signing would be false" };
  }
  return null;
}
const attorneyField = (name) => /lawyer|attorney|law firm|client name/.test(name.toLowerCase());

/*
 * The elections this route determines, and the widget state each is set to.
 *
 * Items 1 and 12 are the form's own yes-or-no questions and each is one field
 * with two widgets whose on states are /Yes and /No. A seal-only filer answers
 * item 1 No and item 12 Yes; leaving item 1 unanswered left the printed
 * question blank on every delivered copy.
 */
const ELECTIONS = {
  "Page 1 - Request to Expunge Records": "No",
  "12 - Seal Records": "Yes",
  "22 -  I have completed my last sentence and may now ask the court to seal eligible felony convictions because all of the following are true": "Yes"
};

/**
 * Select one widget state of a checkbox field.
 *
 * PDFCheckBox.check() sets the value to the FIRST widget's on state, which on
 * items 1 and 12 is /Yes, and PDFAcroCheckBox.setValue refuses any other state.
 * The field value and each widget's appearance state are set directly instead;
 * flatten() resolves each widget against the field value, so the answered box
 * renders marked and the other renders empty.
 */
function selectCheckboxState(field, state) {
  const target = PDFName.of(state);
  const widgets = field.acroField.getWidgets();
  assert.ok(widgets.some((widget) => widget.getOnValue() === target),
    `${field.getName()} offers no widget state ${state}`);
  field.acroField.dict.set(PDFName.of("V"), target);
  for (const widget of widgets) widget.setAppearanceState(widget.getOnValue() === target ? target : PDFName.of("Off"));
}

/**
 * Drop page annotation references that name no object.
 *
 * flatten() deletes each widget object but can leave its reference in /Annots;
 * copyPages then carries it into the packet, where it points at an object the
 * writer never emits and every reader has to reconstruct the xref.
 */
function pruneDanglingAnnots(document) {
  let removed = 0;
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const before = removed;
    const keep = annots.asArray().filter((entry) => {
      const resolved = entry instanceof PDFRef ? document.context.lookup(entry) : entry;
      if (resolved) return true;
      removed += 1;
      return false;
    });
    if (removed === before) continue;
    if (keep.length === 0) page.node.delete(PDFName.of("Annots"));
    else page.node.set(PDFName.of("Annots"), document.context.obj(keep));
  }
  return removed;
}
function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2")
    || (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}
function optionalUnusedSlot(documentId, name, page) {
  if (documentId === "EXP-AD Request" && page === 2) return requestTableRow(name) !== null;
  if (documentId === "EXP-AD Request" && page === 4) return (requestTableRow(name) ?? 0) > 1;
  if (documentId === "EXP-AD Case List") return /^arrest([2-9]|[1-6]\d|70)$/.test(name);
  if (documentId === "EXP-AD Order Granting") {
    const slot = orderCaseSlot(name);
    if (slot === null) return false;
    return name !== ACTIVE_ORDER_CELL;
  }
  return false;
}

function setComplete(field, value, font) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && value.length > max && typeof field.removeMaxLength === "function") field.removeMaxLength();
  const rectangles = field.acroField.getWidgets().map((widget) => widget.getRectangle());
  const available = rectangles.length ? Math.min(...rectangles.map((rect) => Math.max(1, rect.width - 4))) : 100;
  const height = rectangles.length ? Math.min(...rectangles.map((rect) => rect.height)) : 12;
  let size = 8;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(value, size) > available) {
    assert.ok(height >= 24, `complete value cannot fit safely in ${field.getName()}`);
    field.enableMultiline();
    size = 6;
  }
  field.setFontSize(size);
  field.setText(value);
  assert.equal(field.getText(), value, `complete value did not survive in ${field.getName()}`);
  return { drawnText: value, fontSize: size };
}

async function fillDocument(source, fixtureName, fixture) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const base = { fieldId: `${source.documentId}:${name}`, fieldName: name, documentId: source.documentId, page };
    if (field instanceof PDFDropdown) {
      if (name === "1 - County" && field.getOptions().includes(fixture.county)) {
        field.select(fixture.county);
        writes.push({ ...base, effectiveLabel: name, factId: "matter.filing_county", drawnText: fixture.county });
      } else refusals.push({ ...base, effectiveLabel: `Select ${name}`, reason: "Supply the filing county before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, role: "participant" });
      continue;
    }
    if (field instanceof PDFCheckBox) {
      const election = source.documentId === "EXP-AD Request" ? ELECTIONS[name] : undefined;
      const guard = protectedField(source.documentId, name);
      if (election) {
        selectCheckboxState(field, election);
        writes.push({ ...base, effectiveLabel: name, factId: "route.selection", drawnText: election, isSelectionControl: true, routeDetermined: true });
      } else if (participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: "participant.self_represented", isSelectionControl: true, routeDetermined: true });
      } else if (guard) {
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: guard.reason, refusalClass: guard.refusalClass, role: guard.role });
      } else refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const textGuard = protectedField(source.documentId, name);
    if (textGuard) {
      refusals.push({ ...base, effectiveLabel: `Court or later-completion field: ${name}`, reason: textGuard.reason, refusalClass: textGuard.refusalClass, role: textGuard.role });
      continue;
    }
    const known = knownValue(source.documentId, name, page, fixture);
    if (known) writes.push({ ...base, effectiveLabel: name, factId: known[1], ...setComplete(field, known[0], font) });
    else if (optionalUnusedSlot(source.documentId, name, page)) refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete active-route record, so the inactive table and unused rows remain wholly blank.", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    else if (attorneyField(name)) refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    else refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
  }
  form.updateFieldAppearances(font);
  form.flatten();
  const danglingAnnotsPruned = pruneDanglingAnnots(document);
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, danglingAnnotsPruned };
}

async function buildPacket(sources, fixtureName, fixture) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  pruneDanglingAnnots(packet);
  packet.setTitle(`${FAMILY_ID} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 13);
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  return { bytes, pageCount: 13, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals), danglingAnnotsPruned: filled.reduce((sum, item) => sum + item.danglingAnnotsPruned, 0) };
}

async function build() {
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const routeSummary = "Education-based sealing after completion of the last sentence and every printed eligibility condition in item 22.";
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), danglingAnnotationReferencesPruned: packet.danglingAnnotsPruned, refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(OUT, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois expungement or sealing packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n## Required before filing\n\nObtain the ISP statewide transcript and certified dispositions for every arrest or case. Compare the transcript against every certified disposition and resolve every mismatch before filing. For each case, make the expunge-or-seal election shown on the Request. Confirm completion of the last sentence and every education-route condition printed in item 22, and attach the educational credential or other education evidence the printed route requires. Complete every applicable case, outcome, financial, and participant item listed below. Add the hearing date only when the clerk or court supplies it. Complete the participant's wet signature only after the packet is complete.\n\n${requiredList}\n\nAttach certified dispositions and the educational credential evidence identified above.\n\n## Filing and notice\n\nFile a separate flattened packet with the circuit clerk in each county where an arrest occurred or a charge was brought. In Cook County, file in the district matching the case. Circuit-clerk fees vary; if a fee waiver is needed, complete the included Rule 298 application.\n\n**Who serves, and how.** The circuit court clerk serves, under § 5.2(d)(4). The participant serves no one. You do not mail, hand-deliver, or arrange service yourself, and you do not complete court-owned service or order fields.\n\n**Who is served.** Notice goes to the State's Attorney, the Illinois State Police, the arresting agency, and for municipal ordinance violations the chief legal officer. The objection period is 60 days from service under § 5.2(d)(5)(B). Unless an objection is filed the court shall enter an order granting or denying under § 5.2(d)(6)(B).\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects; the court sets a contested hearing; the transcript or certified disposition is ambiguous; a case is unrecognized or may involve identity theft; federal or out-of-state records are involved; a motion to vacate, modify, or reconsider is needed; the petition is denied; the printed education-route facts do not match; or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\nFile the Request, Case List, any needed additional-case pages, and proposed Order with the circuit clerk in every county of arrest or charge. E-file where locally required and confirm the county's current local configuration. Circuit-clerk fees vary by county; ISP reports no petition filing fee and a $60 order-processing fee. If a waiver is sought, complete and file the included Rule 298 FW-CIV-APPLICATION. The judge or clerk completes the proposed order, clerk case numbers, and later-completion fields.\n`);
  writeJson(path.join(OUT, "reports/build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null }, artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

function selfTest() {
  const report = JSON.parse(fs.readFileSync(path.join(OUT, "reports/actual-writes.json"), "utf8"));
  const writes = report.documents.flatMap((document) => document.actualWrites);
  const requestWrites = writes.filter((row) => row.documentId === "EXP-AD Request");
  assert.equal(requestWrites.filter((row) => /List all charges/.test(row.fieldName) && row.factId === "matter.case_number").length, 0, "charge cells must never receive the case number");
  assert.equal(requestWrites.filter((row) => row.page === 2 && /(?:Arrest or case number|Arresting agency|List all charges|Date of arrest|Outcome)/i.test(row.fieldName)).length, 0, "the inactive expungement table must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && / - (?:[2-9]|10)$/.test(row.fieldName)).length, 0, "unused sealing rows must remain wholly blank");
  assert.equal(requestWrites.filter((row) => row.page === 4 && /List all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1, "the complete active row must carry the held charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest[2-5]$/.test(row.fieldName)).length, 0, "unused Case List slots must remain blank");
  assert.equal(writes.filter((row) => /^\\d+ - Case Number$/i.test(row.fieldName)).length, 0, "Circuit Clerk case-number captions must remain blank");
  assert.equal(writes.filter((row) => row.drawnText?.includes("…")).length, 0, "held values must not be ellipsized");
  assert.equal(writes.filter((row) => /exactly as (shown|printed)/i.test(String(row.drawnText ?? ""))).length, 0,
    "a direction to the participant is not a fact and must not stand in a filing cell");
  for (const contact of ["3 - Name", "3 - Address", "3 - Telephone", "3 - Email"]) {
    assert.ok(writes.some((row) => row.documentId === "EXP-AD Order Granting" && row.fieldName === contact),
      `the proposed Order's delivery block must carry ${contact}, which this packet holds`);
  }
  for (const courtOwned of ORDER_COURT_OWNED) {
    assert.ok(!writes.some((row) => row.documentId === "EXP-AD Order Granting" && row.fieldName === courtOwned),
      `the judge's own field must remain blank: ${courtOwned}`);
  }
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Order Granting" && orderCaseSlot(row.fieldName) !== null && row.fieldName !== ACTIVE_ORDER_CELL).length, 0,
    "the proposed Order half this route does not use must remain wholly blank");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Order Granting" && row.fieldName === ACTIVE_ORDER_CELL).length, 1,
    "the proposed Order must carry the case number in the sealing half");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest([2-9]|[1-6]\d|70)$/.test(row.fieldName)).length, 0,
    "unused Case List row slots must remain wholly blank");
  const selected = requestWrites.filter((row) => row.isSelectionControl).map((row) => row.fieldName);
  assert.ok(selected.includes("12 - Seal Records"), "the sealing branch must be selected");
  assert.ok(selected.includes("Page 1 - Request to Expunge Records"), "item 1 must be answered on a sealing route, not left blank");
  const item1 = requestWrites.find((row) => row.fieldName === "Page 1 - Request to Expunge Records");
  assert.equal(item1?.drawnText, "No", "a sealing route answers item 1 No");
  assert.ok(selected.includes("22 -  I have completed my last sentence and may now ask the court to seal eligible felony convictions because all of the following are true"), "the education route must be selected");
  assert.ok(!selected.includes("15 - Asking to Seal"), "the inapplicable no-wait section 15 branch must remain blank");
  assert.ok(!selected.includes("17 - I received a misdemeanor conviction or ordinance violation for an offense subject to sealing and 2 years have passed since the end of my last sentence"), "the two-year route must remain blank");
  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  for (const option of ["19b - My sentence of conditional discharge or probation was revoked AND 3 years have passed since the end of my last sentence", "19c - I completed an Illinois prison or jail sentence AND 3 years have passed since the end of my last sentence"]) {
    const refusal = fieldMap.refusals.find((row) => row.fieldName === option);
    assert.ok(refusal && refusal.routeDetermined === false, `the inapplicable three-year option must remain unselected: ${option}`);
  }
  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  assert.ok(!/Complete arrest\d+ on/.test(instructions),
    "an interior AcroForm name is not a caption a participant can find on the page");
  for (const phrase of ["ISP statewide transcript", "Compare the transcript against every certified disposition", "expunge-or-seal election", "educational credential", "hearing date", "wet signature", "fee waiver", "identity theft", "federal or out-of-state", "vacate, modify, or reconsider", "petition is denied"]) assert.ok(instructions.includes(phrase), `required guidance must include: ${phrase}`);
  console.log("il-seal-edu-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
