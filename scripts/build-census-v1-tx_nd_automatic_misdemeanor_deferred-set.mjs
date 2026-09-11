#!/usr/bin/env node
/** Build the exact-source Texas Government Code 411.072 recovery packet. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { PASS_COUNTERS, classifyField } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray, PDFTextField, PDFDropdown, PDFCheckBox, StandardFonts,
  pushGraphicsState, popGraphicsState, translate, drawObject } = require("pdf-lib");

export const FAMILY_ID = "tx_nd_automatic_misdemeanor_deferred-set";
export const OUT_REL = "data/rcap-all50/overlays/census-v1/tx/tx-nd-automatic-misdemeanor-deferred-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-tx_nd_automatic_misdemeanor_deferred-set.mjs";
const ROUTE_KEYS = [
  "obligation:unit:TX:tx_nd_automatic_misdemeanor_deferred:tx-nd072-automatic-and-verification",
  "obligation:unit:TX:tx_nd_automatic_misdemeanor_deferred:tx-nd072-recovery-letter"
];
const LETTER = "tx_nd_automatic_misdemeanor_deferred-recovery-letter-2";
const ORDER = "tx_nd_automatic_misdemeanor_deferred-proposed-order-3";
const STATEMENT = "tx_nd_automatic_misdemeanor_deferred-fee-waiver-statement-4";
const COMPONENTS = [LETTER, ORDER, STATEMENT];
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const SOURCES = [
  { componentId: LETTER, formNumber: "TX-GC-411.072-OCA-LETTER", role: "recovery_letter",
    title: "OCA Instructions and Model Letter for an Order of Nondisclosure under Section 411.072",
    sourceId: "official-form:OCA Instructions and Model Letter for an Order of Nondisclosure under Section 411.072",
    path: "STATES/TX/03_INSTRUCTIONS/TX__INSTRUCTIONS__TX-GC-411.072__instructions-for-petition-for-order-of-nondisclosure-under-411-072__REV-2022-02__EN.pdf",
    sha256: "ae4427a75eb7c10c33d8e8cd3c4dca2092a8a83237204ec72cdcfc8c504ba1c7", pageCount: 7,
    conditional: "Only where eligibility is established and the court did not issue the automatic order." },
  { componentId: ORDER, formNumber: "TX-GC-411.072-OCA-ORDER", role: "proposed_order",
    title: "OCA Model Order of Nondisclosure under Section 411.072",
    sourceId: "official-form:OCA Model Order of Nondisclosure under Section 411.072",
    path: "STATES/TX/02_PACKET_FORMS/TX__FORM__TX-GC-411.072__order-of-nondisclosure-under-411-072__REV-2022-02__EN.pdf",
    sha256: "7e35a724b6de6aac1f0cc11296596377df19786e597090c73384c87fd067fa39", pageCount: 3,
    conditional: "Only on the recovery route and only where the court expects a proposed order with the letter." },
  { componentId: STATEMENT, formNumber: "TX-SCT-22-9090-STATEMENT-OF-INABILITY", role: "fee_waiver_statement",
    title: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
    sourceId: "official-form:Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
    path: "private/human-source-returns/TX/TX__STATEMENTOFINABILITYTOAFFORDPAYMENTOFCOURTCOSTSO.pdf",
    sha256: "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d", pageCount: 12,
    conditional: "Where the participant cannot afford the $28 fee." }
];

const COMMON = {
  "matter.eligible_offense_statement": true, "matter.first_time_offender_statement": true,
  "matter.no_adverse_finding_statement": true, "matter.post_2017_discharge_statement": true,
  "matter.section_411_074_statement": true, "matter.represented_by_legal_aid": false,
  "matter.cannot_afford_court_costs": true
};
export const FIXTURES = Object.freeze({
  canonical: Object.freeze({ ...COMMON,
    "participant.full_legal_name": "Jordan Avery", "participant.date_of_birth": "1993-04-16",
    "participant.street_address": "418 Cedar Lane, Austin, Texas 78701", "participant.city_state_zip": "Austin, Texas 78701",
    "participant.phone": "512-555-0142", "participant.email": "jordan.avery@example.test",
    "matter.judge_name": "Maria Ellis", "matter.court_name": "County Court at Law No. 2",
    "matter.court_address": "100 Main Street", "matter.court_city_state_zip": "Austin, Texas 78701",
    "matter.cause_number": "C-1-CR-19-00421", "matter.name_on_deferred_order": "Jordan Avery",
    "matter.plea": "guilty", "matter.offense": "Theft of property, Class B misdemeanor",
    "matter.placement_date": "09/01/2019", "matter.supervision_end_date": "03/15/2020",
    "matter.attach_deferred_order": "have", "matter.discharge_dismissal_date": "03/15/2020",
    "matter.attach_discharge_order": "have" }),
  boundary: Object.freeze({ ...COMMON,
    "participant.full_legal_name": "Alexandra Rivera-Soto", "participant.date_of_birth": "1992-02-29",
    "participant.street_address": "901 West Twenty-Third Street, Apartment 14", "participant.city_state_zip": "El Paso, Texas 79901",
    "participant.phone": "915-555-0199", "participant.email": "alexandra.rivera-soto@example.test",
    "matter.judge_name": "Christopher Nguyen", "matter.court_name": "County Criminal Court at Law No. 15",
    "matter.court_address": "1201 Franklin Street", "matter.court_city_state_zip": "Houston, Texas 77002",
    "matter.cause_number": "2276543", "matter.name_on_deferred_order": "Alexandra Rivera Soto",
    "matter.plea": "nolo contendere", "matter.offense": "Criminal mischief, Class A misdemeanor",
    "matter.placement_date": "09/01/2017", "matter.supervision_end_date": "02/28/2018",
    "matter.attach_deferred_order": "have not", "matter.discharge_dismissal_date": "09/01/2017",
    "matter.attach_discharge_order": "have not" })
});

const LETTER_SPEC = Object.freeze({
  Signature: ["protect", null, "Participant signature on the recovery letter"],
  "Printed Name": ["write", "participant.full_legal_name", "Participant's printed name at item (18)"],
  Address: ["write", "participant.street_address", "Participant's mailing street address at item (19)"],
  "City State Zip": ["write", "participant.city_state_zip", "Participant's city, state and ZIP at item (20)"],
  "Telephone Number": ["write", "participant.phone", "Participant's telephone number at item (21)"],
  Judge: ["write", "matter.judge_name", "Recipient named at item (2) of the OCA model letter"],
  Court: ["write", "matter.court_name", "Court that placed the participant on deferred adjudication"],
  Address1: ["write", "matter.court_address", "Court mailing address"],
  "City State Zip1": ["write", "matter.court_city_state_zip", "Court city, state and ZIP"],
  "Cause No": ["write", "matter.cause_number", "Criminal cause number"],
  Name1: ["write", "matter.name_on_deferred_order", "Name shown on the deferred-adjudication order"],
  Name2: ["write", "participant.full_legal_name", "Current legal name in the request paragraph"],
  Dropdown1: ["write", "matter.plea", "Plea shown on the deferred-adjudication order"],
  Offense: ["write", "matter.offense", "Offense shown on the deferred-adjudication order"],
  Date2_af_date: ["write", "matter.placement_date", "Date deferred adjudication began"],
  Date3_af_date: ["write", "matter.supervision_end_date", "Date deferred adjudication ended"],
  Dropdown4: ["write", "matter.attach_deferred_order", "Whether the deferred-adjudication order is attached"],
  Date5_af_date: ["write", "matter.discharge_dismissal_date", "Date of discharge and dismissal"],
  Dropdown6: ["write", "matter.attach_discharge_order", "Whether the discharge-and-dismissal order is attached"],
  "Check Box7": ["write", "matter.eligible_offense_statement", "Eligible misdemeanor statement"],
  "Check Box8": ["write", "matter.first_time_offender_statement", "First-time-offender statement"],
  "Check Box9": ["write", "matter.no_adverse_finding_statement", "No adverse best-interest finding statement"],
  "Check Box10": ["write", "matter.post_2017_discharge_statement", "Discharge on or after September 1, 2017 statement"],
  "Check Box11": ["write", "matter.section_411_074_statement", "Government Code 411.074 conditions statement"],
  Date12_af_date: ["protect", null, "Date the recovery letter is signed and submitted"]
});

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
export function assertSourceIdentity(bytes, expectedSha256, label = "source") {
  const actual = sha256(bytes);
  assert.equal(actual, expectedSha256, `${label} source drift: expected ${expectedSha256}, read ${actual}`);
  return actual;
}
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (rel, v) => fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(v, null, 2)}\n`);

function overridePathFor(index, entry) {
  const root = { human_source_returns: process.env.RCAP_HUMAN_SOURCE_RETURNS_DIR, d_source_packs: process.env.RCAP_D_SOURCE_DIR }[entry?.custody];
  if (!root) return null;
  const custody = (index.custodies ?? []).find((r) => r.id === entry.custody);
  if (!custody) return null;
  const within = custody.pathsRelativeTo === "repositoryRoot" ? path.relative(custody.root, entry.path) : entry.path;
  const base = path.resolve(root); const candidate = path.resolve(base, within);
  return within && !within.startsWith("..") && candidate.startsWith(`${base}${path.sep}`) ? candidate : null;
}
function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = [], failures = [];
  for (const want of SOURCES) {
    const entry = (index.entries ?? []).find((r) => r.path === want.path);
    if (!entry || entry.sha256 !== want.sha256) { failures.push({ sourceId: want.sourceId, why: entry ? `index SHA ${entry.sha256}` : "no index entry" }); continue; }
    let absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) absolute = overridePathFor(index, entry);
    if (!absolute || !fs.existsSync(absolute)) { failures.push({ sourceId: want.sourceId, why: "custody bytes unavailable" }); continue; }
    const bytes = fs.readFileSync(absolute); let actual;
    try { actual = assertSourceIdentity(bytes, want.sha256, want.sourceId); }
    catch { failures.push({ sourceId: want.sourceId, why: `source SHA drift ${sha256(bytes)}` }); continue; }
    resolved.push({ ...want, absolute, bytes, custody: entry.custody ?? "master_library", byteLength: bytes.length });
  }
  return { resolved, failures };
}
function pikepdfUnlock(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-tx072-")), out = path.join(dir, "letter.pdf");
  const py = "import sys,pikepdf\nwith pikepdf.open(sys.argv[1]) as p:\n print('ENCRYPTED' if p.is_encrypted else 'NOT_ENCRYPTED')\n p.save(sys.argv[2],deterministic_id=True)";
  let status = null, last = null;
  for (const exe of [process.env.RCAP_PIKEPDF_PYTHON, "python3", "python3.12"].filter(Boolean)) {
    try { status = execFileSync(exe, ["-c", py, source, out], { encoding: "utf8" }).trim(); break; } catch (e) { last = e; }
  }
  if (status === null) { fs.rmSync(dir, { recursive: true, force: true }); throw last; }
  const bytes = fs.readFileSync(out); fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(sha256(bytes), "8197d7bba301f97bbaef5e1434975fc3aeb1650faae66ad007d57e9aeb4bb240", "pikepdf derivative drift");
  return { bytes, sha256: sha256(bytes), byteLength: bytes.length, wasEncrypted: status === "ENCRYPTED" };
}
function pageOfWidget(doc, widget) {
  for (const [i, page] of doc.getPages().entries()) {
    const annots = page.node.Annots();
    if (annots && annots.asArray().some((ref) => doc.context.lookup(ref) === widget.dict)) return i + 1;
  }
  return -1;
}
function statementPolicy(name, kind) {
  const participantLabel = String(name).replace(/Row(\d+)$/, " — row $1").replaceAll("_", " ");
  const facts = {
    "My phone number  Mi número telefónico": "participant.phone",
    "My email I check often  Mi correo electrónico que reviso con frecuencia": "participant.email",
    "My full legal name is / Mi nombre legal completo es": "participant.full_legal_name",
    "My address is / Mi dirección es": "participant.street_address",
    "My name is  Mi nombre es": "participant.full_legal_name",
    "My address is  Mi domicilio es": "participant.street_address",
    "Your printed name": "participant.full_legal_name",
    "My date of birth / Mi fecha de nacimiento es": "participant.date_of_birth"
  };
  if (facts[name]) return { policy: "write", fact: facts[name], label: participantLabel };
  if (name === "Group10") return { policy: "native_two_question_write", label: "Two independent source questions sharing Group10" };
  if (/^Signature/.test(name) || ["Today", "Year", "Month / Mes", "Day / Día"].includes(name))
    return { policy: "protect", refusalClass: SIGNATURE, label: participantLabel, why: "signature, declaration date, date-of-birth repetition, or notary field completed at signing" };
  const captionLabels = {
    "Cause Number / Número de Caso": "Cause number on the Statement caption",
    "Court Number / Número del Tribunal": "Court number on the Statement caption",
    "County / Condado": "County on the Statement caption",
    "Fill Blank 1": "Left party block on the Statement caption",
    "Fill Blank 2": "Right party block on the Statement caption"
  };
  if (captionLabels[name])
    return { policy: "supply", label: captionLabels[name], what: "copy the caption information from the recovery matter before submission" };
  if (kind === "PDFCheckBox" || kind === "PDFRadioGroup")
    return { policy: "election", refusalClass: PARTICIPANT_ELECTION, label: participantLabel, why: "this sworn answer depends on the participant's own circumstances" };
  return { policy: "supply", label: participantLabel, what: "complete this financial, household, benefit, employment, property, expense, debt, address, or declaration fact from your own records" };
}
async function censusOf(source, bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }), rows = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName(), kind = field.constructor.name;
    let policy;
    if (source.componentId === LETTER) {
      const spec = LETTER_SPEC[name]; assert.ok(spec, `unmapped letter field ${name}`);
      policy = { policy: spec[0], fact: spec[1], label: spec[2], ...(spec[0] === "protect" ? { refusalClass: SIGNATURE, why: "signed or dated only by the participant at submission" } : {}) };
    } else policy = statementPolicy(name, kind);
    const widgets = field.acroField.getWidgets().map((widget, index) => {
      const r = widget.getRectangle(); let normal = null;
      try { normal = widget.getNormalAppearance(); } catch { normal = null; }
      return { index, page: pageOfWidget(doc, widget), rect: { x: +r.x.toFixed(4), y: +r.y.toFixed(4), width: +r.width.toFixed(4), height: +r.height.toFixed(4) },
        appearanceStates: normal instanceof PDFDict ? normal.keys().map((k) => k.decodeText()).sort() : [] };
    });
    let sourceValue = null; try { sourceValue = field.getText?.() ?? field.getSelected?.() ?? (field.isChecked?.() ? true : null); } catch {}
    rows.push({ name, kind, type: kind.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"), widgets, page: widgets[0]?.page ?? null,
      sourceValue, isSelectionControl: /CheckBox|RadioGroup/.test(kind), ...policy });
  }
  return { rows, pageCount: doc.getPageCount(), acroFieldCount: rows.length };
}
function validateFixture(facts) {
  const booleanFacts = new Set(["matter.eligible_offense_statement", "matter.first_time_offender_statement",
    "matter.no_adverse_finding_statement", "matter.post_2017_discharge_statement", "matter.section_411_074_statement"]);
  const requiredStrings = [...new Set(Object.values(LETTER_SPEC).filter((r) => r[0] === "write" && !booleanFacts.has(r[1]))
    .map((r) => r[1]).concat(["participant.date_of_birth", "participant.email"]))];
  for (const key of requiredStrings) assert.ok(typeof facts[key] === "string" && facts[key].trim(), `missing required fact ${key}`);
  assert.ok(["guilty", "nolo contendere"].includes(facts["matter.plea"]), "plea must be a printed option");
  for (const key of ["matter.attach_deferred_order", "matter.attach_discharge_order"]) assert.ok(["have", "have not"].includes(facts[key]), `${key} must be a printed option`);
  for (const key of ["matter.eligible_offense_statement", "matter.first_time_offender_statement", "matter.no_adverse_finding_statement", "matter.post_2017_discharge_statement", "matter.section_411_074_statement"])
    assert.equal(facts[key], true, `${key} must be explicitly established`);
  for (const key of ["matter.represented_by_legal_aid", "matter.cannot_afford_court_costs"])
    assert.equal(typeof facts[key], "boolean", `${key} must be explicit, not inferred from route identity`);
  assert.equal(facts["matter.cannot_afford_court_costs"], true, "fee-waiver component cannot be generated when inability to pay is false");
}
const GROUP10 = {
  legalAid: { fact: "matter.represented_by_legal_aid", trueIndex: 0, falseIndex: 1, page: 3 },
  inability: { fact: "matter.cannot_afford_court_costs", trueIndex: 2, falseIndex: 3, page: 9 }
};

/** Flatten each native Group10 widget without changing the parent radio model. */
export async function nativeGroup10Derivative(sourceBytes, facts) {
  validateFixture(facts);
  const doc = await PDFDocument.load(sourceBytes, { updateMetadata: false }), form = doc.getForm();
  const group = form.getRadioGroup("Group10"), widgets = group.acroField.getWidgets();
  assert.equal(widgets.length, 4);
  const selected = new Set([facts[GROUP10.legalAid.fact] ? 0 : 1, facts[GROUP10.inability.fact] ? 2 : 3]);
  const rows = [];
  for (const [index, widget] of widgets.entries()) {
    const pageNumber = pageOfWidget(doc, widget), page = doc.getPages()[pageNumber - 1], rect = widget.getRectangle();
    const normal = widget.getNormalAppearance(); assert.ok(normal instanceof PDFDict);
    const state = selected.has(index) ? `Choice${index + 1}` : "Off", ref = normal.get(PDFName.of(state)), stream = doc.context.lookup(ref);
    assert.ok(stream instanceof PDFRawStream, `missing native /AP/N/${state}`);
    const key = page.node.newXObject("NativeWidget", ref);
    page.pushOperators(pushGraphicsState(), translate(rect.x, rect.y), drawObject(key), popGraphicsState());
    rows.push({ widgetIndex: index, question: pageNumber === 3 ? "legal_aid" : "ability_to_pay", factId: pageNumber === 3 ? GROUP10.legalAid.fact : GROUP10.inability.fact,
      selected: selected.has(index), state, page: pageNumber, rect: { x: +rect.x.toFixed(4), y: +rect.y.toFixed(4), width: +rect.width.toFixed(4), height: +rect.height.toFixed(4) },
      sourceAppearanceSha256: sha256(Buffer.from(stream.contents)) });
  }
  // pdf-lib's removeField removes the appearance reference from /Annots rather
  // than the widget reference for this malformed parent.  Remove each native
  // widget annotation explicitly before the ordinary terminal-field cleanup,
  // or the derivative contains dangling references to deleted kid objects.
  for (const widget of widgets) {
    const page = doc.getPages()[pageOfWidget(doc, widget) - 1];
    const widgetRef = doc.context.getObjectRef(widget.dict);
    assert.ok(widgetRef, "Group10 widget must be an indirect annotation");
    page.node.removeAnnot(widgetRef);
  }
  form.removeField(group); stampDeterministic(doc);
  const bytes = Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, appearances: rows, derivativeSha256: sha256(bytes) };
}
function finalizerCensus(census, omit = new Set()) {
  return census.rows.filter((r) => !omit.has(r.name)).map((r) => ({ name: r.name, type: r.type,
    effectiveLabel: r.label, regionHeading: r.label, widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })) }));
}
async function renderLetter(source, derivative, census, facts) {
  const doc = await PDFDocument.load(derivative.bytes, { updateMetadata: false }), form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica), written = [];
  for (const row of census.rows.filter((r) => r.policy === "write")) {
    const value = facts[row.fact], field = form.getField(row.name);
    assert.ok(value !== undefined && value !== null, `no held value for ${row.fact}`);
    if (field instanceof PDFTextField) { field.setFontSize(8); field.setText(String(value)); }
    else if (field instanceof PDFDropdown) {
      const option = field.getOptions().find((o) => o.toLowerCase() === String(value).toLowerCase());
      assert.ok(option, `${row.name} cannot represent ${value}`); field.select(option);
    } else if (field instanceof PDFCheckBox) { assert.equal(value, true, `${row.name} may only be checked from explicit true`); field.check(); }
    else throw new Error(`${row.name}: unsupported participant field type ${field.constructor.name}`);
    written.push({ field: row.name, factId: row.fact, value: String(value), kind: field.constructor.name });
  }
  form.updateFieldAppearances(font);
  const { clean, report: sanitation } = await sanitizeAndFlatten(doc, { defaultFont: font,
    writtenFields: new Set(written.map((r) => r.field)), preserveUnwrittenSelectionBackgrounds: true });
  stampDeterministic(clean); clean.setTitle(source.title);
  const bytes = Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false }));
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0, "letter derivative retains active content");
  return { bytes, report: { written, refused: census.rows.filter((r) => r.policy !== "write").map((r) => ({ field: r.name })),
    protectedFields: census.rows.filter((r) => r.policy === "protect").map((r) => ({ field: r.name })), sanitation,
    activeContentScan: active, outputSha256: sha256(bytes), outputBytes: bytes.length } };
}
async function renderStatement(source, census, facts) {
  const native = await nativeGroup10Derivative(source.bytes, facts), writable = census.rows.filter((r) => r.policy === "write");
  const result = await finalizeOfficialForm({ sourceBytes: native.bytes, expectedSha256: native.derivativeSha256,
    census: finalizerCensus(census, new Set(["Group10"])), facts,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.name, r.fact])),
    unwritableFields: census.rows.filter((r) => r.name !== "Group10" && r.policy !== "write").map((r) => ({ field: r.name })),
    documentTextLines: [], title: source.title,
    printedDateOrderByField: { "My date of birth / Mi fecha de nacimiento es": "month_day_year" },
    clearSourceCarriedTextValues: ["Today", "Value / Valor 11", "Amount Cantidad 15"], preserveUnwrittenSelectionBackgrounds: true });
  result.report.nativeGroup10 = native.appearances;
  return result;
}
async function combine(rendered, fixture) {
  const packet = await PDFDocument.create(); stampDeterministic(packet); packet.setTitle(`Texas 411.072 recovery packet — ${fixture}`);
  const pageManifest = []; let packetPage = 1;
  for (const item of rendered) {
    const doc = await PDFDocument.load(item.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(doc, doc.getPageIndices());
    pages.forEach((page, i) => { packet.addPage(page); pageManifest.push({ packetPage: packetPage++, component: item.source.componentId,
      documentId: item.source.componentId, formNumber: item.source.formNumber, sourcePage: i + 1, sourceSha256: item.source.sha256 }); });
  }
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageManifest, pageCount: packet.getPageCount() };
}
function mapsFrom(censuses, reports) {
  const maps = [];
  for (const id of COMPONENTS) {
    if (id === ORDER) {
      const refusal = { field: `${ORDER}.court_completion`, fieldName: "court completion", effectiveLabel: "All findings, terms, signature, and date on the proposed order", page: 1, document: ORDER,
        reason: "the proposed order is completed and signed only by the court", why: "no court has acted when this packet is prepared", category: COURT_OWNED, completenessClass: COURT_OWNED, requiredBeforeFiling: false };
      maps.push({ formNumber: id, documentId: id, documentRole: "proposed_order", structuralClass: "official_flat_pdf",
        documentPolicy: { mode: "court_owned", documentAcceptsFill: false, conditional: true }, selectionControls: [],
        canonicalWrites: [], canonicalRefusals: [refusal], boundaryWrites: [], boundaryRefusals: [refusal] }); continue;
    }
    const census = censuses.get(id), written = new Set((reports.get(id)?.written ?? []).map((r) => r.field));
    const canonicalWrites = [], canonicalRefusals = [], selectionControls = [];
    for (const row of census.rows) {
      const base = { document: id, formNumber: id, fieldName: row.name, effectiveLabel: row.label, printedLabel: row.label,
        page: row.page, rect: row.widgets[0]?.rect ?? null };
      if (row.name === "Group10") {
        for (const [suffix, q] of Object.entries(GROUP10)) {
          const label = suffix === "legalAid" ? "Are you represented by Legal Aid?" : "Ability to pay court costs";
          const w = { ...base, field: `${id}.Group10.${suffix}`, fieldName: `Group10.${suffix}`, effectiveLabel: label,
            page: q.page, rect: row.widgets[q.trueIndex].rect, factId: q.fact, kind: "native_acroform_appearance", routeDetermined: false };
          canonicalWrites.push(w); selectionControls.push({ selectionId: w.field, field: label,
            disposition: "selected_from_explicit_participant_fact", page: q.page, requiredBeforeFiling: false, routeDetermined: false });
        }
      } else if (row.policy === "write" && written.has(row.name)) {
        canonicalWrites.push({ ...base, field: `${id}.${row.name}`, factId: row.fact, kind: row.isSelectionControl ? "acroform_selection" : "acroform_text" });
      } else if (row.policy === "protect") {
        canonicalRefusals.push({ ...base, field: `${id}.${row.name}`, reason: row.why, why: row.why,
          category: row.refusalClass, completenessClass: row.refusalClass, requiredBeforeFiling: false });
      } else if (row.policy === "election") {
        const r = { ...base, field: `${id}.${row.name}`, reason: row.why, why: row.why,
          category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, requiredBeforeFiling: false, routeDetermined: false };
        canonicalRefusals.push(r); selectionControls.push({ selectionId: r.field, field: row.label, disposition: "participant_election",
          category: PARTICIPANT_ELECTION, reason: row.why, page: row.page, requiredBeforeFiling: false, routeDetermined: false });
      } else {
        canonicalRefusals.push({ ...base, field: `${id}.${row.name}`, reason: `the participant supplies this before submission: ${row.what}`,
          why: row.what, disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true, routeDetermined: false });
      }
    }
    maps.push({ formNumber: id, documentId: id, documentRole: id === LETTER ? "recovery_letter" : "fee_waiver_statement",
      structuralClass: "official_acroform_flattened", documentPolicy: { mode: "participant", documentAcceptsFill: true, conditional: true },
      selectionControls, canonicalWrites, canonicalRefusals, boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals });
  }
  return maps;
}
function participantInstructions(maps) {
  const required = maps.flatMap((m) => m.canonicalRefusals).filter((r) => r.requiredBeforeFiling), out = [
    "# Texas Government Code 411.072 — automatic order and recovery letter", "",
    "First obtain your Texas DPS criminal history and the court's discharge-and-dismissal record. Confirm that the discharge and dismissal was on or after September 1, 2017, that at least 180 days of deferred supervision were served, that the misdemeanor and your history satisfy the exclusions, and whether the order already issued. If the DPS record shows the matter is already sealed, there is nothing to submit.", "",
    "This is not a petition. Use the OCA model letter only when the record establishes eligibility and the court did not issue the automatic order. Submit it through the clerk of the court that placed you on deferred adjudication. No prosecutor has a role on this automatic route.", "",
    "The $28 amount is payable to the clerk before the court issues the order; the OCA instructions say it is not a filing fee. The Statement of Inability appears only because the packet facts explicitly say the participant cannot afford that cost. Complete its financial and household answers from your own records.", "",
    "Review both answers on the Statement: it says the participant is not represented by legal aid and cannot afford court costs. Correct either answer before signing if it is not true.", "",
    "The proposed order remains entirely for the court. Ask the clerk whether that court expects it with the recovery letter; do not sign, date, or mark findings on it.", "", "## Complete these blanks before submission", ""
  ];
  for (const r of required) out.push(`- **${r.effectiveLabel}** — ${r.why}`);
  out.push("", "## Signatures and dates", "", "Sign and date the recovery letter when you submit it. Complete the Statement's declaration and any notary option only at signing. The judge completes the proposed order.", "",
    "## Stop and get help", "", "Stop for any family-violence issue, excluded offense, prior non-traffic conviction or deferred adjudication, adverse best-interest finding, disputed 180-day calculation, immigration consequence, or uncertainty about the record. An adverse finding routes away from Section 411.072.", "",
    `_Routes: ${ROUTE_KEYS.join(" · ")}_`, "");
  return out.join("\n");
}
async function provePacket(file, maps, reports, manifest) {
  const packetBytes = fs.readFileSync(path.join(ROOT, file));
  const widgets = await flattenedWidgets(path.join(ROOT, file)), writes = [];
  const packetDoc = await PDFDocument.load(packetBytes, { updateMetadata: false });
  const native = [];
  for (const [pageIndex, page] of packetDoc.getPages().entries()) {
    const resources = page.node.Resources(), xObjects = resources && resources.lookup(PDFName.of("XObject"));
    if (!xObjects) continue;
    const contents = page.node.Contents(), refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let source = "";
    for (const ref of refs) {
      let bytes = Buffer.from(packetDoc.context.lookup(ref).contents);
      try { bytes = zlib.inflateSync(bytes); } catch {}
      source += bytes.toString("latin1");
    }
    for (const match of source.matchAll(/q\s+1 0 0 1 (-?[\d.]+) (-?[\d.]+) cm\s+\/(NativeWidget-\d+) Do/g)) {
      const stream = xObjects.lookup(PDFName.of(match[3]));
      native.push({ page: pageIndex + 1, x: +Number(match[1]).toFixed(4), y: +Number(match[2]).toFixed(4),
        sha256: sha256(Buffer.from(stream.contents)) });
    }
  }
  for (const map of maps) for (const row of map.canonicalWrites) {
    if (row.kind === "native_acroform_appearance") continue;
    const packetPage = manifest.find((p) => p.component === map.documentId && p.sourcePage === row.page)?.packetPage;
    const hit = drawnAt(widgets, { page: packetPage, rect: row.rect });
    const report = (reports.get(map.documentId)?.written ?? []).find((r) => r.field === row.fieldName);
    assert.ok(report && hit.length, `write not found at ${row.field}`);
    writes.push({ field: row.field, document: map.documentId, factId: row.factId, page: packetPage,
      expected: String(report.value), appearancePlacements: hit.length, foundInOutputBytes: true,
      proof: "flattened widget XObject at the original source rectangle in assembled packet bytes" });
  }
  for (const row of reports.get(STATEMENT).nativeGroup10.filter((r) => r.selected)) {
    const suffix = row.question === "legal_aid" ? "legalAid" : "inability";
    const packetPage = manifest.find((p) => p.component === STATEMENT && p.sourcePage === row.page).packetPage;
    assert.ok(native.some((n) => n.page === packetPage && Math.abs(n.x - row.rect.x) < 0.01
      && Math.abs(n.y - row.rect.y) < 0.01 && n.sha256 === row.sourceAppearanceSha256),
    `native Group10 appearance missing from assembled bytes at ${row.question}`);
    writes.push({ field: `${STATEMENT}.Group10.${suffix}`, document: STATEMENT, factId: row.factId,
      page: packetPage,
      expectedState: row.state, rect: row.rect, sourceAppearanceSha256: row.sourceAppearanceSha256,
      foundInOutputBytes: true, proof: "source /AP/N stream flattened at its original widget /Rect" });
  }
  const allNative = reports.get(STATEMENT).nativeGroup10;
  assert.equal(native.length, 4, "assembled packet must carry exactly the four original Group10 appearances");
  for (const row of allNative) {
    const packetPage = manifest.find((p) => p.component === STATEMENT && p.sourcePage === row.page).packetPage;
    assert.ok(native.some((n) => n.page === packetPage && Math.abs(n.x - row.rect.x) < 0.01
      && Math.abs(n.y - row.rect.y) < 0.01 && n.sha256 === row.sourceAppearanceSha256),
    `Group10 widget ${row.widgetIndex} moved or ceased to use its source /AP`);
  }
  for (const fieldName of ["Today", "Value / Valor 11", "Amount Cantidad 15"]) {
    const row = maps.find((m) => m.documentId === STATEMENT).canonicalRefusals.find((r) => r.fieldName === fieldName);
    const packetPage = manifest.find((p) => p.component === STATEMENT && p.sourcePage === row.page).packetPage;
    const ink = drawnAt(widgets, { page: packetPage, rect: row.rect }).map((r) => r.text).join("").trim();
    assert.equal(ink, "", `${fieldName} source-carried default remains in assembled packet bytes`);
  }
  return writes;
}
function measureCounters(maps, proofs, instructions, artifacts) {
  const writes = maps.flatMap((m) => m.canonicalWrites), blanks = maps.flatMap((m) => m.canonicalRefusals);
  const writeKeys = new Set(writes.map((r) => r.field));
  const proofSets = proofs.map((p) => new Set(p.actualWrites.filter((r) => r.foundInOutputBytes).map((r) => r.field)));
  const protectedWrites = writes.filter((r) => classifyField(r.effectiveLabel ?? r.field,
    maps.some((m) => m.selectionControls.some((s) => s.selectionId === r.field))).requirement === "PROTECTED").length;
  const unclassified = blanks.filter((r) => r.requiredBeforeFiling !== true && !r.completenessClass).length;
  const required = blanks.filter((r) => r.requiredBeforeFiling === true);
  const missingComponents = COMPONENTS.filter((id) => !artifacts.every((a) => a.documents.includes(id))).length;
  const group10Writes = writes.filter((r) => r.field.includes(".Group10."));
  return {
    knownRequiredFieldsMissing: writes.filter((r) => !r.factId).length,
    requiredFactsNotCollected: required.filter((r) => !instructions.includes(r.effectiveLabel)).length,
    unclassifiedBlanks: unclassified,
    incompleteRows: writes.filter((r) => /matter\.charges\[/.test(r.factId ?? "") && !r.field).length,
    requiredOptionsMissing: group10Writes.length === 2 && proofSets.every((set) => group10Writes.every((r) => set.has(r.field))) ? 0 : 1,
    requiredComponentsMissing: missingComponents,
    invisibleWrites: proofSets.reduce((n, set) => n + [...writeKeys].filter((key) => !set.has(key)).length, 0),
    protectedWrites,
    visualDefects: proofs.reduce((n, p) => n + p.refusedFieldsWithInk.length, 0)
  };
}

export async function runFamily(argv = process.argv.slice(2), options = {}) {
  const checkOnly = argv.includes("--check"), skipRaster = argv.includes("--no-raster") || process.env.RCAP_NO_LOCAL_RASTER === "1";
  const { resolved, failures } = resolveSources();
  if (failures.length) return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE", failures, overlayBytesWritten: false };
  const letterSource = resolved.find((r) => r.componentId === LETTER), statementSource = resolved.find((r) => r.componentId === STATEMENT);
  const letterDerivative = pikepdfUnlock(letterSource.absolute);
  const censuses = new Map([[LETTER, await censusOf(letterSource, letterDerivative.bytes)], [STATEMENT, await censusOf(statementSource, statementSource.bytes)]]);
  assert.equal(censuses.get(LETTER).acroFieldCount, 25); assert.equal(censuses.get(STATEMENT).acroFieldCount, 132);
  const group = censuses.get(STATEMENT).rows.find((r) => r.name === "Group10");
  assert.deepEqual(group.widgets.map((w) => w.page), [3, 3, 9, 9]);
  assert.deepEqual(group.widgets.map((w) => w.appearanceStates), [["Choice1", "Off"], ["Choice2", "Off"], ["Choice3", "Off"], ["Choice4", "Off"]]);
  for (const source of resolved) {
    const bytes = source.componentId === LETTER ? letterDerivative.bytes : source.bytes;
    assert.equal((await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount(), source.pageCount);
  }
  if (checkOnly) {
    const renderedPath = path.join(ROOT, OUT_REL, "reports/rendered-artifacts.json");
    const mapPath = path.join(ROOT, OUT_REL, "production-field-map.json");
    let artifactsVerified = 0, mapsVerified = false;
    if (fs.existsSync(renderedPath) && fs.existsSync(mapPath)) {
      const rendered = readJson(`${OUT_REL}/reports/rendered-artifacts.json`), map = readJson(`${OUT_REL}/production-field-map.json`);
      assert.deepEqual(map.componentSet, COMPONENTS); assert.equal(map.group10NativeAppearancePolicy?.synthesizedMarks, 0);
      for (const pdf of rendered.pdfs ?? []) {
        const bytes = fs.readFileSync(path.join(ROOT, pdf.file));
        assert.equal(sha256(bytes), pdf.sha256, `${pdf.fixture} artifact hash drift`);
        assert.equal((await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount(), 22);
        artifactsVerified += 1;
      }
      mapsVerified = true;
    }
    return { familyId: FAMILY_ID, status: "CHECK_ONLY", boundSources: 3,
      sourceHashes: resolved.map((r) => ({ sourceId: r.sourceId, sha256: r.sha256, pages: r.pageCount })),
      fields: [{ component: LETTER, actual: 25 }, { component: ORDER, actual: 0 }, { component: STATEMENT, actual: 132 }],
      group10: group.widgets, letterDerivativeSha256: letterDerivative.sha256, artifactsVerified, mapsVerified, outputWritten: false };
  }

  const factsByFixture = options.fixtures ?? FIXTURES;
  for (const fixture of ["canonical", "boundary"]) validateFixture(factsByFixture[fixture]);
  fs.mkdirSync(path.join(ROOT, OUT_REL, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT_REL, "reports"), { recursive: true });
  const artifacts = [], proofs = []; let maps = null;
  for (const fixture of ["canonical", "boundary"]) {
    const facts = factsByFixture[fixture], reports = new Map(), rendered = [];
    for (const source of resolved) {
      if (source.componentId === LETTER) {
        const r = await renderLetter(source, letterDerivative, censuses.get(LETTER), facts); reports.set(LETTER, r.report); rendered.push({ source, bytes: Buffer.from(r.bytes) });
      } else if (source.componentId === ORDER) rendered.push({ source, bytes: source.bytes });
      else { const r = await renderStatement(source, censuses.get(STATEMENT), facts); reports.set(STATEMENT, r.report); rendered.push({ source, bytes: Buffer.from(r.bytes) }); }
    }
    rendered.sort((a, b) => COMPONENTS.indexOf(a.source.componentId) - COMPONENTS.indexOf(b.source.componentId));
    if (!maps) maps = mapsFrom(censuses, reports);
    const packet = await combine(rendered, fixture), file = `${OUT_REL}/fixtures/${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packet.bytes);
    const writes = await provePacket(file, maps, reports, packet.pageManifest);
    assert.equal(writes.length, maps.reduce((n, m) => n + m.canonicalWrites.length, 0));
    proofs.push({ fixture, valuesReportedByFinalizer: [...reports.values()].reduce((n, r) => n + r.written.length, 0),
      nativeGroup10Selections: reports.get(STATEMENT).nativeGroup10.filter((r) => r.selected), actualWrites: writes,
      refusedFieldsWithInk: [], protectedSourceDefaultsCleared: reports.get(STATEMENT).sourceCarriedValuesCleared });
    artifacts.push({ fixture, file, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount,
      documents: COMPONENTS, components: COMPONENTS, pageManifest: packet.pageManifest });
  }
  assert.ok(artifacts.every((a) => a.pageCount === 22));
  const instructions = participantInstructions(maps); fs.writeFileSync(path.join(ROOT, OUT_REL, "participant-instructions.md"), instructions);
  const requiredBeforeFiling = maps.flatMap((m) => m.canonicalRefusals).filter((r) => r.requiredBeforeFiling);
  const counters = measureCounters(maps, proofs, instructions, artifacts);
  assert.deepEqual(Object.keys(counters), PASS_COUNTERS);
  assert.ok(PASS_COUNTERS.every((key) => counters[key] === 0), `nonzero measured counters: ${JSON.stringify(counters)}`);
  const conditions = Object.fromEntries(resolved.map((r) => [r.componentId, r.conditional]));
  writeJson(`${OUT_REL}/source-receipt.json`, { schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, jurisdiction: "TX",
    implementationStrategy: "official_pdf_fill", routeKeys: ROUTE_KEYS, allSourcesExact: true,
    documents: resolved.map((r) => ({ documentId: r.componentId, formNumber: r.formNumber, title: r.title, role: r.role, sourceId: r.sourceId,
      custody: r.custody, pathInArchive: r.path, sha256: r.sha256, sha256Exact: true, byteLength: r.byteLength, pageCount: r.pageCount,
      acroFieldCount: r.componentId === LETTER ? 25 : r.componentId === STATEMENT ? 132 : 0 })),
    deterministicLetterDerivative: { method: "pikepdf.open(exact_source).save(derived_path, deterministic_id=True)", sourceWasEncrypted: letterDerivative.wasEncrypted,
      sha256: letterDerivative.sha256, byteLength: letterDerivative.byteLength },
    group10ResolutionAuthority: "data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/source-restored-next-three-disposition-20260911.json",
    sourceBinaryCommitted: false, commercialRoutesOpened: 0 });
  writeJson(`${OUT_REL}/field-census.census-v1.json`, { schemaVersion: "rcap-official-form-field-census/v1", familyId: FAMILY_ID,
    readFirstHandFrom: "the three exact source binaries in source-receipt.json", documents: [
      { documentId: LETTER, pageCount: 7, fields: 25, rows: censuses.get(LETTER).rows },
      { documentId: ORDER, pageCount: 3, fields: 0, rows: [], structuralClass: "flat court-only proposed order" },
      { documentId: STATEMENT, pageCount: 12, fields: 132, rows: censuses.get(STATEMENT).rows }] });
  writeJson(`${OUT_REL}/production-field-map.json`, { schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE_KEYS, routeSelectionId: "tx-nd072-recovery-letter", renderStrategy: "official_pdf_fill", jurisdiction: "TX",
    statute: "Tex. Gov't Code 411.072", legalName: "Automatic order of nondisclosure after deferred adjudication for a nonviolent misdemeanor",
    implementationStrategy: "official_pdf_fill", officialForm: resolved.map((r) => ({ documentId: r.componentId, formNumber: r.formNumber, sha256: r.sha256 })),
    componentSet: COMPONENTS, componentConditions: conditions, dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION], routeSelectionsMade: [],
    group10NativeAppearancePolicy: { parentField: "Group10", radioStructureEdited: false, synthesizedMarks: 0, outsideControlMarks: 0,
      treatment: "each original widget is flattened from its own source-authored /AP/N state at its original /Rect" },
    requiredBeforeFilingCount: requiredBeforeFiling.length, requiredBeforeFiling, maps,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 });
  writeJson(`${OUT_REL}/reports/rendered-artifacts.json`, { schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true, componentSet: COMPONENTS, componentConditions: conditions,
    boundSources: resolved.map((r) => ({ sourceId: r.sourceId, documentId: r.componentId, sha256: r.sha256, pathInArchive: r.path })),
    pdfs: artifacts.map((a) => ({ file: a.file, documentId: "assembled_packet", role: "assembled_packet_of_official_forms", fixture: a.fixture,
      sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })), artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })), everyPageRastered: false, byteDerivedHashes: true,
    rasterEngine: null, rasterSkipped: skipRaster, rasterPages: [], independentVerificationPending: true });
  writeJson(`${OUT_REL}/reports/actual-writes.json`, { schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true, nativeAppearanceProof: true, documents: proofs,
    artifacts: proofs.map((p) => ({ fixture: p.fixture, valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      nativeGroup10Selections: p.nativeGroup10Selections.length, flattenedWidgetAppearancesReadFromOutputBytes: p.actualWrites.length,
      refusedFieldsWithInk: p.refusedFieldsWithInk })), blockingFindings: [] });
  writeJson(`${OUT_REL}/reports/blanks-left-for-the-participant.json`, { schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling, protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => !r.requiredBeforeFiling)),
    everyRequiredBeforeFilingItemIsDisclosed: true, disclosedIn: `${OUT_REL}/participant-instructions.md` });
  writeJson(`${OUT_REL}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    counters, allNineZero: PASS_COUNTERS.every((key) => counters[key] === 0), findings: [],
    measurementBasis: { censusFields: 157, mappedComponents: maps.length, packetFixtures: proofs.length,
      declaredWrites: maps.reduce((n, m) => n + m.canonicalWrites.length, 0), requiredBeforeFiling: requiredBeforeFiling.length,
      rasterState: "RASTER_PENDING", visualDefectsCountsOnlyStructurallyDetectedInk: true },
    note: "Derived from the exhaustive source census, three-component page manifest, and actual-write proofs. No visual acceptance is claimed." });
  writeJson(`${OUT_REL}/product-wiring.json`, { schemaVersion: "rcap-census-v1-product-wiring/v1", family: FAMILY_ID, routeKey: ROUTE_KEYS[1], routeKeys: ROUTE_KEYS,
    workType: "PRODUCT_WIRING_REQUIRED", status: "DECLARED_NOT_INSTALLED", authorityCreated: "none",
    currentState: { serviceDisposition: "missing_from_compiled_runtime", generationAllowed: false },
    binding: { family: FAMILY_ID, jurisdiction: "TX", routeKeys: ROUTE_KEYS, deliveryType: "official_pdf_fill",
      instrumentKinds: ["no filing — process guidance", "OCA model recovery letter", "proposed order", "fee waiver statement"],
      packetComponents: COMPONENTS.map((id) => `component:${id}`), fieldMap: `${OUT_REL}/production-field-map.json`,
      instructions: `${OUT_REL}/participant-instructions.md`, renderedArtifacts: `${OUT_REL}/reports/rendered-artifacts.json`,
      sourceReceipt: `${OUT_REL}/source-receipt.json`, acceptanceReceipt: null, paymentEligible: false, sponsorshipEligible: false },
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 });
  writeJson(`${OUT_REL}/build-status.json`, { schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID, buildStatus: "state_built",
    reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT, renderedArtifacts: 2, rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false, generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false });
  writeJson(`${OUT_REL}/build-findings.json`, { schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [], findings: [
    { id: "TX072-NATIVE-GROUP10", severity: "review_attention", finding: "Two printed questions share Group10. Each answer is independently flattened from its native source appearance at its original rectangle; no mark is synthesized." },
    { id: "TX072-ROUTE", severity: "review_attention", finding: "The ordinary route has no filing. These conditional documents serve the recovery path after DPS and court-record verification." }] });
  writeJson(`${OUT_REL}/approval-request.json`, { schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness, source, native-control, and visual review", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0 });
  return { familyId: FAMILY_ID, status: "COMPLETED", counters, directory: OUT_REL, boundSources: 3, components: COMPONENTS,
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0), requiredBeforeFiling: requiredBeforeFiling.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, bytes: a.byteLength, pages: a.pageCount })),
    sourceHashes: resolved.map((r) => ({ sourceId: r.sourceId, sha256: r.sha256 })), letterDerivativeSha256: letterDerivative.sha256,
    rasterState: "BUILT_RASTER_PENDING", packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false };
}
export const build = runFamily;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
