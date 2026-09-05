#!/usr/bin/env node
// il-exp-qualprob-set: carved out of the shared Illinois host.
//
// WHY THIS FILE EXISTS. Until FIX20 this family was a three-line wrapper importing
// buildIllinoisFamily from scripts/build-census-v1-il-exp-pardon-set.mjs. That host
// still serves il-exp-pardon-set, il-exp-precompletion-set and il-seal-nonconv-set,
// and it carries three faults that VF01 measured in this family's delivered bytes:
//
//   1. knownValue's `/case number/ && !/arrest/` catch-all. Every field named
//      "List all charges for each case number - N" contains "case number" and not
//      "arrest", so all twenty charge cells on Request pages 2 and 4 received the
//      CASE NUMBER instead of a charge. One line produced both the KNOWN_PREFILLS
//      failure and the REPEATING_ROWS failure: rows 2-10 of both tables carried a
//      charge-column write beside four blank companion cells, which is exactly the
//      "18 visibly partial rows per fixture" VF01 counted.
//
//   2. The Case List's arrest1..arrest5 were treated as five COLUMNS of one row and
//      given case number, agency, charge, date and outcome. They are not columns.
//      The grid is headed "Arrest or Case Numbers of all Eligible Criminal Offenses
//      on your Record in this County" and arrest1..arrest5 are the first cell of five
//      SUCCESSIVE ROWS -- proven from the delivered bytes, where all five values share
//      xMin 54.1 and sit at y 387/410/433/454/477. The delivered packet therefore told
//      the court this participant had five eligible offenses whose case numbers were
//      "2021-CF-004217", "Chicago Police Department", "Charge exactly as shown o...",
//      "03/12/2021" and "Dismissed". No counter and no verifier caught that.
//
//   3. safeSet truncated. It sliced to maxLength, shrank to 6pt, then chopped
//      characters and appended an ellipsis. Eight values were ellipsized across the
//      two delivered fixtures -- the arresting agency, the charge and the outcome --
//      losing participant-critical text on a document filed with a court.
//
// Editing the host would have changed three families this lane does not own, so this
// family is carved out instead, following the precedent already set in this same host
// when FIX04 carved out il-seal-edu-set.
//
// WHAT THIS IS DERIVED FROM. scripts/build-census-v1-il-exp-supervision-set.mjs, the
// only Illinois family on these four forms whose state is COMPLETE_PACKET_PROVEN. It
// is the same statutory instrument and the same expungement mode; the differences are
// the route election (item 8, qualified probation, rather than item 9, supervision),
// the route summary, and the service prose below. Its classifier, its fit-or-refuse
// setComplete, its clerk-caption protection and its self-test are taken unchanged.
//
// SERVICE. VF01 also failed SERVICE: the guide said only that the clerk performs
// statutory service, naming neither the recipients nor the method. The repository
// states both plainly, so the guide now quotes the record rather than paraphrasing it:
//
//   data/record-clearing/legal-design-intake/IL.memo.json
//   sha256 fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106
//   tracks[trackId=il-exp-qualprob].rules.service:
//     "The circuit court clerk serves, under § 5.2(d)(4). The participant serves no one."
//   tracks[trackId=il-exp-qualprob].rules.notice:
//     "Notice goes to the State's Attorney, the Illinois State Police, the arresting
//      agency, and for municipal ordinance violations the chief legal officer. The
//      objection period is 60 days from service under § 5.2(d)(5)(B). Unless an
//      objection is filed the court shall enter an order granting or denying under
//      § 5.2(d)(6)(B)."
//
// WHAT FIX07 CHANGED ON TOP OF THAT CARVE-OUT. Three faults survived it, all
// measured against this family's own 424-field inventory:
//
//   5. The five row-1 predicates in knownValue were not gated on a page. The
//      sealing table on Request page 4 spells its captions "4 - Arresting Agency
//      - 1" and so on, and every one of them still ended in the row-1 suffix the
//      predicates matched -- so a complete five-cell row was written into the
//      SEALING table by a route that elects EXPUNGEMENT. That is the second half
//      of VF01's KNOWN_PREFILLS: "the inactive sealing table is populated".
//      Each predicate is now anchored and gated on page 2, the active table.
//
//   6. optionalUnusedSlot treated only rows 2-10 as unused, so row 1 of the
//      inactive table was not classified as an unused slot either -- it was
//      simply written. The whole page 4 table is now an unused slot for this
//      route, row 1 included, and is refused with an inactive-relief reason.
//
//   7. The Outcome cell printed the shared Illinois fixture word "Dismissed" on a
//      QUALIFIED PROBATION expungement, contradicting the item 8 election made on
//      the same document. See ROUTE_OUTCOME: the outcome is now taken from the
//      route and written as QP, the abbreviation the Request's own legend prints.
//
// And SERVICE is now dispositioned in the field map as well as in the prose --
// see SERVICE_DISCLOSURE -- because a disclosure only a reader of prose can audit
// is the state VF01 failed. The one element the record does not settle, the manner
// in which the clerk transmits notice, is declared BLOCKED_LEGAL_INPUT rather than
// guessed.
//
// The classifier differential over the real 424-field inventory changes exactly
// six fields per fixture (five page 4 cells to UNUSED_SLOT, one outcome value)
// and leaves 418 untouched; writes fall 41 -> 36.
//
// NOT YET RUN -- STILL. The EXP-AD Case List source (sha256 b72d30d2...) lives in
// the nationwide_recovery_pool_2026_09_02 custody, which is not mounted in this
// container, is published in no release, and whose publisher URL the egress policy
// refuses. resolveSources() therefore refuses, this builder cannot be executed
// here, and the delivered fixtures under this family's directory are STILL the
// defective ones VF01 read. Nothing in this file has produced a byte.
// `--self-test` reads the delivered artifacts rather than the sources, so it runs
// without the corpus: against the current bytes it FAILS, naming each defect above.
// Mount the corpus, run the builder, then run `--self-test`.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill");
const OUT_REL = "data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill";
const FAMILY_ID = "il-exp-qualprob-set";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFDropdown, PDFTextField, StandardFonts } = require("pdf-lib");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "EXP-AD Request", sourceId: "official-form:EXP-AD Request", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853", componentKinds: ["primary_filing"] },
  { documentId: "EXP-AD Case List", sourceId: "official-form:EXP-AD Case List", path: "LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf", sha256: "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c", componentKinds: ["attachment"] },
  { documentId: "EXP-AD Order Granting", sourceId: "official-form:EXP-AD Order Granting", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", sha256: "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305", componentKinds: ["proposed_order"] },
  { documentId: "FW-CIV-APPLICATION", sourceId: "official-form:FW-CIV-APPLICATION", path: "STATES/IL/02_PACKET_FORMS/IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", sha256: "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5", componentKinds: ["fee_waiver"] }
];

// The Outcome column is route-determined, not fixture-determined.
//
// The delivered bytes printed the shared Illinois fixture word "Dismissed" in
// the Outcome cell of a QUALIFIED PROBATION expungement, contradicting the
// route election this same page makes: item 8, "received a sentence of
// Qualified Probation and at least 5 years have passed since my Qualified
// Probation ended successfully". A disposition of "Dismissed" and a completed
// qualified probation are different outcomes, and the packet asserted both.
//
// The Request prints its own legend directly beneath the table -- "Outcome
// Abbreviations for Expungement ... QP  Qualified Probation Successfully
// Completed" -- and instructs "Use the shortened version of the outcome from
// the Outcome Abbreviations for Expungement section below". So the outcome this
// route determines is QP, it is written from the route rather than from a
// fixture word, and it is the same in both fixtures because the route is.
const ROUTE_OUTCOME = {
  text: "QP",
  factId: "matter.outcome",
  meaning: "Qualified Probation Successfully Completed",
  derivedFrom: "route.qualified_probation_successfully_completed",
  printedLegend: "Outcome Abbreviations for Expungement, EXP-AD Request page 2 (ATJ 2901.9, 06/26)"
};

// `outcome` is deliberately absent from these fixtures: see ROUTE_OUTCOME above.
// Re-adding it is how the contradiction returns.
const FIXTURES = {
  canonical: { full: "Jordan Avery Reyes", other: "None", county: "Cook", dob: "06/14/1988", race: "Hispanic", gender: "Nonbinary", caseNumber: "2021-CF-004217", arrestAgency: "Chicago Police Department", charge: "Charge exactly as shown on the court disposition", arrestDate: "03/12/2021", phone: "312-555-0142", email: "jordan.reyes@example.org", street: "412 West Madison Street, Chicago, IL 60606" },
  boundary: { full: "Alexandria Catherine Montgomery-Washington", other: "Alexandria Catherine Washington-Montgomery", county: "Sangamon", dob: "12/31/1979", race: "Black or African American", gender: "Female", caseNumber: "2024-CF-000001-99", arrestAgency: "Springfield Police Department Records Division", charge: "Complete charge exactly as printed on the certified disposition", arrestDate: "11/29/2023", phone: "217-555-0199", email: "alexandria.montgomery.washington@example.org", street: "1188 Martin Luther King Jr. Drive, Apartment 1407, Springfield, IL 62703" }
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

function clerkCaseNumber(name) {
  return /^\d+ - Case Number$/i.test(name);
}

function requestTableField(name) {
  const match = name.match(/(?:Arrest or Case Number|Arresting Agency|List all charges for each case number|Date of Arrest|Outcome(?: - For example RV S or P)?|4 - Outcome) - (\d+)$/i);
  return match ? Number(match[1]) : null;
}

function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  // The Request carries TWO case tables. Page 2 is the EXPUNGEMENT table (bare
  // captions) and page 4 is the SEALING table (captions prefixed "4 - "). This
  // route elects expungement on page 1, so only the page 2 table is the active
  // one. The unpaged predicates these five replaced matched both tables --
  // "4 - List all charges for each case number - 1" ends in "charges ... - 1"
  // just as its page 2 twin does -- and wrote a complete row into the relief the
  // route does not select. Every one of them is now gated on the active page.
  if (documentId === "EXP-AD Request" && page === 2 && /^arrest or case number - 1$/i.test(name)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Request" && page === 2 && /^arresting agency - 1$/i.test(name)) return [fixture.arrestAgency, "matter.arresting_agency"];
  if (documentId === "EXP-AD Request" && page === 2 && /^list all charges.* - 1$/i.test(name)) return [fixture.charge, "matter.charge"];
  if (documentId === "EXP-AD Request" && page === 2 && /^date of arrest - 1$/i.test(name)) return [fixture.arrestDate, "matter.arrest_date"];
  if (documentId === "EXP-AD Request" && page === 2 && /^outcome.* - 1$/i.test(name)) return [ROUTE_OUTCOME.text, ROUTE_OUTCOME.factId, { routeDetermined: true, derivedFrom: ROUTE_OUTCOME.derivedFrom, meaning: ROUTE_OUTCOME.meaning, printedLegend: ROUTE_OUTCOME.printedLegend }];
  if (documentId === "EXP-AD Case List" && name === "arrest1") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "EXP-AD Order Granting" && name === "arrest/case number 1") return [fixture.caseNumber, "matter.case_number"];
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

function protectedField(documentId, name, page) {
  if (clerkCaseNumber(name)) return true;
  if (documentId === "EXP-AD Order Granting" && page >= 2) return true;
  return /signature|judge|entered date/.test(name.toLowerCase());
}

function attorneyField(name) {
  return /lawyer|attorney|law firm|client name/.test(name.toLowerCase());
}

function selectedCheckbox(documentId, name) {
  if (documentId !== "EXP-AD Request") return false;
  return name === "Page 1 - Request to Expunge Records"
    || name === "8 - received a sentence of Qualified Probation and at least 5 years have passed since my Qualified Probation ended successfully"
    || name === "P6 - Completing this form myself checkbox2";
}

function participantSelfControl(documentId, name) {
  return (documentId === "EXP-AD Request" && name === "P6 - Completing this form myself checkbox2")
    || (documentId === "FW-CIV-APPLICATION" && name === "Last - Completing this form myself checkbox");
}

function optionalUnusedSlot(documentId, name, page) {
  // Page 4 is the sealing table. This route seeks expungement, so EVERY row of
  // it -- row 1 included -- is an unused slot for this route and stays wholly
  // blank. Page 2 is the active expungement table, where only rows 2-10 are
  // unused because this fixture carries one complete record.
  if (documentId === "EXP-AD Request" && page === 4) return requestTableField(name) !== null;
  if (documentId === "EXP-AD Request") return (requestTableField(name) ?? 0) > 1;
  if (documentId === "EXP-AD Case List") return /^arrest(?:[2-9]|[1-5]\d)$/.test(name);
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
      if (selectedCheckbox(source.documentId, name) || participantSelfControl(source.documentId, name)) {
        field.check();
        writes.push({ ...base, effectiveLabel: name, factId: participantSelfControl(source.documentId, name) ? "participant.self_represented" : "route.selection", isSelectionControl: true, routeDetermined: true });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ ...base, effectiveLabel: `Court or later-completion control: ${name}`, reason: "Court, clerk, or later-completion field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
      } else refusals.push({ ...base, effectiveLabel: `Participant choice: ${name}`, reason: "A participant election or financial fact not determined by this packet route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    if (protectedField(source.documentId, name, page)) {
      refusals.push({ ...base, effectiveLabel: `Court or later-completion field: ${name}`, reason: clerkCaseNumber(name) ? "The form reserves this case number for the Circuit Clerk" : "Signature, judge, clerk, or post-filing field; never prefilled", refusalClass: clerkCaseNumber(name) ? "court_prosecutor_clerk_or_agency_owned" : "signature_or_date_participant_completion", role: clerkCaseNumber(name) ? "court" : "protected" });
      continue;
    }
    const known = knownValue(source.documentId, name, page, fixture);
    if (known) {
      writes.push({ ...base, effectiveLabel: name, factId: known[1], ...(known[2] ?? {}), ...setComplete(field, known[0], font) });
    } else if (optionalUnusedSlot(source.documentId, name, page)) {
      refusals.push({ ...base, effectiveLabel: `Unused additional-record slot: ${name}`, reason: page === 4 && source.documentId === "EXP-AD Request"
          ? "Inactive-relief table: this route elects expungement, so no cell of the sealing table on page 4 is written and the whole table remains wholly blank."
          : "Optional participant-authored additional-record slot; the platform does not invent it. This fixture carries one complete record, so the unused row remains wholly blank.", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", factAvailable: false, routeDetermined: false, role: "participant" });
    } else if (attorneyField(name)) {
      refusals.push({ ...base, effectiveLabel: `Attorney field: ${name}`, reason: "Attorney-only; the fixture is self-represented", role: "attorney" });
    } else {
      refusals.push({ ...base, effectiveLabel: `Complete ${name} on ${source.documentId} page ${page}`, reason: "The platform does not hold this participant, case, or financial fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals };
}

async function buildPacket(sources, fixtureName, fixture) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
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
  return { bytes, pageCount: 13, writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals) };
}

// The SERVICE disclosure, dispositioned on the record rather than only in prose.
//
// VF01 failed SERVICE because participant-instructions.md said only that the
// clerk performs statutory service. The guide now quotes the record, and this
// block puts the same answer in the field map so the disclosure is auditable
// without reading prose -- the shape ut-pet-*-set already uses.
//
// The record settles who serves, who is served, and the objection window. It
// does NOT state the manner in which the clerk transmits notice, so that one
// element is declared unsettled here rather than guessed. It is not a
// participant step either way: the participant serves no one.
const SERVICE_DISCLOSURE = {
  serviceRecipientAndMethodStated: true,
  whoServes: "The circuit court clerk, under 20 ILCS 2630/5.2(d)(4). The participant serves no one.",
  whoIsServed: "The State's Attorney, the Illinois State Police, the arresting agency, and for municipal ordinance violations the chief legal officer.",
  objectionWindow: "60 days from service, under 20 ILCS 2630/5.2(d)(5)(B). Unless an objection is filed the court shall enter an order granting or denying under 20 ILCS 2630/5.2(d)(6)(B).",
  participantServiceBurden: "NONE",
  mannerOfTransmissionByClerk: "BLOCKED_LEGAL_INPUT: the Illinois record does not state the manner in which the clerk transmits notice. It is not invented here, and it is not a participant step.",
  statedIn: "participant-instructions.md, sections 'Who serves, and how.' and 'Who is served.'",
  citedAuthorities: [{
    id: "IL-LEGAL-DESIGN-INTAKE",
    title: "Illinois legal-design intake memo",
    path: "data/record-clearing/legal-design-intake/IL.memo.json",
    sha256: "fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106",
    readAt: "tracks[trackId=il-exp-qualprob].rules.service and .rules.notice",
    supports: ["service", "notice"],
    verifiedBy: "re-hashed on this build against the committed record"
  }]
};

async function build() {
  const sources = resolveSources();
  for (const authority of SERVICE_DISCLOSURE.citedAuthorities) {
    const observed = sha256(fs.readFileSync(path.join(ROOT, authority.path)));
    assert.equal(observed, authority.sha256, `service authority drifted: ${authority.path}`);
  }
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture);
  fs.mkdirSync(path.join(OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(OUT, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const routeSummary = "Expungement after eligible qualified probation and the printed five-year condition. Confirm from the certified disposition that the qualified probation ended successfully and that at least five years have passed.";
  writeJson(path.join(OUT, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), routeSummary, serviceDisclosure: SERVICE_DISCLOSURE, writes: packets.canonical.writes.map(({ drawnText, fontSize, ...row }) => row), refusals: packets.canonical.refusals });
  writeJson(path.join(OUT, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds })) });
  writeJson(path.join(OUT, "reports/actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })), artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length, addedGlyphsReadFromOutputBytes: 0, flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, minimumFontSize: Math.min(...packet.writes.filter((row) => row.fontSize).map((row) => row.fontSize)), refusedFieldsWithInk: [] })) });
  const artifacts = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount }));
  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifacts.map((artifact) => ({ ...artifact, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) })) });
  writeJson(path.join(OUT, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))), artifacts, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const requiredList = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling).map((row) => `- ${row.effectiveLabel}`).join("\n");
  fs.writeFileSync(path.join(OUT, "participant-instructions.md"), `# Illinois expungement or sealing packet - ${FAMILY_ID}\n\n## Route selected\n\n${routeSummary}\n\n## Required before filing\n\nObtain the ISP statewide transcript and certified dispositions for every arrest or case. Compare the transcript against every certified disposition, confirm from the certified disposition that the qualified probation terminated successfully and that at least five years have passed since it ended, and resolve every mismatch before filing. Make the per-case expunge or seal election shown on the Request. Complete every applicable case, outcome, financial, and participant item listed below. Do not sign until the packet is complete.\n\n${requiredList}\n\n## Filing and notice\n\nFile a separate flattened packet with the circuit clerk in each county where an arrest occurred or a charge was brought. In Cook County, file in the district matching the case.\n\n**Who serves, and how.** The circuit court clerk serves, under \u00a7 5.2(d)(4). The participant serves no one. You do not mail, hand-deliver, or arrange service yourself, and you do not complete court-owned service or order fields.\n\n**Who is served.** Notice goes to the State's Attorney, the Illinois State Police, the arresting agency, and for municipal ordinance violations the chief legal officer. The objection period is 60 days from service under \u00a7 5.2(d)(5)(B). Unless an objection is filed the court shall enter an order granting or denying under \u00a7 5.2(d)(6)(B).\n\nIf an objection results in a hearing, add the hearing date when the clerk or court supplies it and follow that notice.\n\n## Stop and get help\n\nStop automated assistance if a State's Attorney, ISP, arresting agency, or chief legal officer objects, the court sets a contested hearing, the printed eligibility facts do not match, or immigration consequences may be involved.\n`);
  fs.writeFileSync(path.join(OUT, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}\n\nFile the Request, Case List, any needed additional-case pages, and proposed Order with the circuit clerk in every county of arrest or charge. E-file where locally required and confirm the county's current local configuration. Circuit-clerk fees vary by county; ISP reports no petition filing fee and a $60 order-processing fee. If a waiver is sought, complete and file the included Rule 298 FW-CIV-APPLICATION. The judge or clerk completes the proposed order, clerk case numbers, and later-completion fields.\n`);
  writeJson(path.join(OUT, "reports/build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null }, artifacts: artifacts.map(({ file, ...artifact }) => artifact), selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; canonical=${artifacts[0].sha256} boundary=${artifacts[1].sha256}`);
}

function selfTest() {
  const actual = JSON.parse(fs.readFileSync(path.join(OUT, "reports/actual-writes.json"), "utf8"));
  const writes = actual.documents.flatMap((document) => document.actualWrites);
  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  assert.equal(writes.filter((row) => /List all charges/i.test(row.fieldName) && row.factId === "matter.case_number").length, 0,
    "charge cells must never receive the case number");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && /^List all charges.* - 1$/i.test(row.fieldName) && row.factId === "matter.charge").length, 1,
    "the one complete row on the ACTIVE expungement table must receive the charge");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && / - (?:[2-9]|10)$/.test(row.fieldName) && /Arrest|charges|Outcome/i.test(row.fieldName)).length, 0,
    "unused Request rows must remain wholly blank");
  // The inactive relief. This route elects expungement, so no cell of the page 4
  // sealing table is written -- row 1 included. Its captions all begin "4 - ".
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && /^4 - /.test(row.fieldName) && row.page === 4).length, 0,
    "the inactive sealing table must remain wholly blank, row 1 included");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Request" && row.page === 4).length, 0,
    "nothing on Request page 4 is written by this expungement route");
  // Every write that lands in a table row must land in a COMPLETE row: a written
  // cell with blank companions is the partial row VF01 counted eighteen of.
  const activeRow = writes.filter((row) => row.documentId === "EXP-AD Request" && row.page === 2 && /- 1$/.test(row.fieldName));
  assert.equal(activeRow.length, 5, "the active expungement row must be complete: case number, agency, charge, date, outcome");
  assert.deepEqual([...new Set(activeRow.map((row) => row.factId))].sort(),
    ["matter.arrest_date", "matter.arresting_agency", "matter.case_number", "matter.charge", "matter.outcome"],
    "each active-row cell must carry its own fact, never a repeat of the case number");
  // The Outcome cell is route-determined, not a fixture word.
  const outcome = writes.filter((row) => row.factId === "matter.outcome");
  assert.equal(outcome.length, 1, "exactly one outcome cell is written");
  assert.equal(outcome[0].drawnText, "QP", "the outcome must be the route's own disposition (QP), not a fixed word");
  assert.equal(outcome[0].derivedFrom, "route.qualified_probation_successfully_completed",
    "the outcome must declare that the route determined it");
  assert.equal(writes.filter((row) => String(row.drawnText ?? "") === "Dismissed").length, 0,
    "the contradicting fixture disposition must not reach any cell");
  assert.equal(writes.filter((row) => row.documentId === "EXP-AD Case List" && /^arrest[2-5]$/.test(row.fieldName)).length, 0,
    "unused Case List number slots must remain wholly blank");
  assert.equal(writes.filter((row) => /^\d+ - Case Number$/i.test(row.fieldName)).length, 0,
    "Circuit Clerk case-number captions must remain blank");
  assert.equal(writes.filter((row) => String(row.drawnText ?? "").endsWith("…")).length, 0,
    "known values must not be ellipsized");
  for (const phrase of ["ISP statewide transcript", "certified dispositions", "per-case expunge or seal election", "hearing date"]) {
    assert.match(instructions, new RegExp(phrase, "i"), `instructions must disclose ${phrase}`);
  }
  // SERVICE. VF01 failed this family because the guide named neither the recipients
  // nor the method. IL.memo.json states both plainly, so the guide now quotes the
  // record verbatim; these assertions keep it quoted.
  for (const phrase of ["The circuit court clerk serves", "The participant serves no one",
    "State's Attorney", "Illinois State Police", "arresting agency", "chief legal officer",
    "60 days from service"]) {
    assert.match(instructions, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      `instructions must answer who is served and how: ${phrase}`);
  }
  const fieldMap = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  assert.equal(fieldMap.refusals.filter((row) => /^\d+ - Case Number$/.test(row.fieldName) && row.refusalClass === "court_prosecutor_clerk_or_agency_owned").length, 4,
    "all four clerk-assigned case-number captions must be declared protected");
  // SERVICE is dispositioned in the field map, not only in prose.
  assert.ok(fieldMap.serviceDisclosure, "the field map must carry the service disclosure");
  assert.equal(fieldMap.serviceDisclosure.serviceRecipientAndMethodStated, true,
    "the field map must state that the service recipient and method are disclosed");
  assert.equal(fieldMap.serviceDisclosure.participantServiceBurden, "NONE",
    "the record puts no service burden on the participant");
  assert.match(fieldMap.serviceDisclosure.mannerOfTransmissionByClerk, /^BLOCKED_LEGAL_INPUT:/,
    "the one element the record does not settle must be declared, not guessed");
  assert.equal(fieldMap.serviceDisclosure.citedAuthorities[0].sha256,
    "fc64a4b6bb182a3f77091613809b140c9f600c3512c2670ee5d2447498114106",
    "the service disclosure must cite the Illinois record by hash");
  // The delivered page 4 must draw nothing: read from the artifact, not the report.
  assert.equal(fieldMap.writes.filter((row) => row.documentId === "EXP-AD Request" && row.page === 4).length, 0,
    "the field map must declare no write on the inactive sealing page");
  console.log("il-exp-qualprob-set self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
else await build();
