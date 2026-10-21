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
import { PASS_COUNTERS, BLANK_DISPOSITIONS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { preserveGovernanceState, writeWiringChecked }
  from "./rcap-packet-completeness/governance-preservation.mjs";

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
    "matter.attach_deferred_order": "have not", "matter.discharge_dismissal_date": "02/28/2018",
    "matter.attach_discharge_order": "have not" })
});

// These values are derived from facts already held for the matter. They are
// recorded here so the field map can show the lineage instead of treating a
// court-number, address-composition or date component as a new intake fact.
const DERIVED_FACT_LINEAGE = Object.freeze({
  "matter.court_number": Object.freeze({
    derivedFrom: ["matter.court_name"],
    method: "take the trailing No. number from the held court name"
  }),
  "matter.court_type": Object.freeze({
    derivedFrom: ["matter.court_name"],
    method: "map the held court name's Court at Law wording to the printed County Court at Law option"
  }),
  "participant.complete_address": Object.freeze({
    derivedFrom: ["participant.street_address", "participant.city_state_zip"],
    method: "retain locality already present in the held street value; otherwise append the held city/state/ZIP"
  }),
  "participant.date_of_birth_month": Object.freeze({
    derivedFrom: ["participant.date_of_birth"],
    method: "split the held ISO date's month component"
  }),
  "participant.date_of_birth_day": Object.freeze({
    derivedFrom: ["participant.date_of_birth"],
    method: "split the held ISO date's day component"
  }),
  "participant.date_of_birth_year": Object.freeze({
    derivedFrom: ["participant.date_of_birth"],
    method: "split the held ISO date's year component"
  })
});

const STATEMENT_CUSTOM_WRITE_NAMES = new Set([
  "Mailing  Dirección Postal",
  "My address is  Mi domicilio es",
  "Court Number / Número del Tribunal",
  "Month / Mes",
  "Day / Día",
  "Year / Año"
]);

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
function completeParticipantAddress(facts) {
  const street = String(facts["participant.street_address"] ?? "").trim();
  const locality = String(facts["participant.city_state_zip"] ?? "").trim();
  assert.ok(street && locality, "participant address needs held street and city/state/ZIP");
  const normalize = (value) => value.toLowerCase().replace(/[\s,]+$/g, "").replace(/\s+/g, " ");
  return normalize(street).endsWith(normalize(locality)) ? street : `${street}, ${locality}`;
}
function heldCourtDetails(facts) {
  const courtName = String(facts["matter.court_name"] ?? "").trim();
  const number = /\bNo\.\s*(\d+)\s*$/i.exec(courtName)?.[1] ?? null;
  assert.ok(number, "held court name must end with its No. number before deriving the caption number");
  assert.match(courtName, /court\s+at\s+law/i, "held court name must support the printed County Court at Law option");
  return { number, type: "County Court at Law" };
}
function derivedFacts(facts) {
  const [year, month, day] = String(facts["participant.date_of_birth"]).split("-");
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(String(facts["participant.date_of_birth"])), "DOB must be ISO before deriving its boxes");
  const court = heldCourtDetails(facts);
  return { ...facts,
    "matter.court_number": court.number,
    "matter.court_type": court.type,
    "participant.complete_address": completeParticipantAddress(facts),
    "participant.date_of_birth_month": month,
    "participant.date_of_birth_day": day,
    "participant.date_of_birth_year": year };
}
function pageOfWidget(doc, widget) {
  for (const [i, page] of doc.getPages().entries()) {
    const annots = page.node.Annots();
    if (annots && annots.asArray().some((ref) => doc.context.lookup(ref) === widget.dict)) return i + 1;
  }
  return -1;
}
function decodedAppearance(stream) {
  const raw = Buffer.from(stream.contents);
  try { return zlib.inflateSync(raw); } catch { return raw; }
}
function authoredMarkFrom(normal, state) {
  if (!(normal instanceof PDFDict) || state === "Off") return null;
  const on = normal.lookup(PDFName.of(state)), off = normal.lookup(PDFName.of("Off"));
  if (!(on instanceof PDFRawStream) || !(off instanceof PDFRawStream)) return null;
  const onBytes = decodedAppearance(on), offBytes = decodedAppearance(off);
  if (!onBytes.subarray(0, offBytes.length).equals(offBytes)) return null;
  const mark = onBytes.subarray(offBytes.length);
  return mark.length ? mark : null;
}
function statementPolicy(name, kind) {
  const participantLabel = String(name).replace(/Row(\d+)$/, " — row $1").replaceAll("_", " ");
  const facts = {
    "My phone number  Mi número telefónico": "participant.phone",
    "My email I check often  Mi correo electrónico que reviso con frecuencia": "participant.email",
    "My full legal name is / Mi nombre legal completo es": "participant.full_legal_name",
    "My address is / Mi dirección es": "participant.street_address",
    "My name is  Mi nombre es": "participant.full_legal_name",
    "My address is  Mi domicilio es": "participant.complete_address",
    "Mailing  Dirección Postal": "participant.complete_address",
    "Your printed name": "participant.full_legal_name",
    "My date of birth / Mi fecha de nacimiento es": "participant.date_of_birth",
    "Court Number / Número del Tribunal": "matter.court_number",
    "Day / Día": "participant.date_of_birth_day",
    "Year / Año": "participant.date_of_birth_year"
  };
  if (facts[name]) return { policy: "write", fact: facts[name], label: participantLabel };
  if (name === "Choice 1") return { policy: "native_court_type_write", fact: "matter.court_type", label: "Court type on the Statement caption" };
  if (name === "Group10") return { policy: "native_two_question_write", label: "Two independent source questions sharing Group10" };
  if (name === "Cause Number / Número de Caso")
    return { policy: "protect", refusalClass: COURT_OWNED, label: "Cause number on the Statement caption",
      why: "the form says the Clerk's office will fill in the Cause Number when this form is filed" };
  if (name === "Month / Mes")
    return { policy: "write", fact: "participant.date_of_birth_month", label: "Month box of the date of birth on the Statement declaration" };
  if (/^Signature/.test(name) || ["Today", "Year"].includes(name))
    return { policy: "protect", refusalClass: SIGNATURE, label: participantLabel, why: "signature, declaration date, date-of-birth repetition, or notary field completed at signing" };
  const captionLabels = {
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
      const appearanceSha256ByState = {}, appearanceMarkSha256ByState = {}, appearanceMarkContentByState = {};
      if (normal instanceof PDFDict) for (const key of normal.keys()) {
        const stream = normal.lookup(key);
        if (stream instanceof PDFRawStream) {
          const state = key.decodeText(), mark = authoredMarkFrom(normal, state);
          appearanceSha256ByState[state] = sha256(Buffer.from(stream.contents));
          if (mark) {
            appearanceMarkSha256ByState[state] = sha256(mark);
            appearanceMarkContentByState[state] = mark;
          }
        }
      }
      const result = { index, page: pageOfWidget(doc, widget), rect: { x: +r.x.toFixed(4), y: +r.y.toFixed(4), width: +r.width.toFixed(4), height: +r.height.toFixed(4) },
        appearanceStates: Object.keys(appearanceSha256ByState).sort(), appearanceSha256ByState, appearanceMarkSha256ByState };
      Object.defineProperty(result, "appearanceMarkContentByState", { value: appearanceMarkContentByState });
      return result;
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
  const parseMdy = (key) => {
    const value = facts[key], match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value ?? ""));
    assert.ok(match, `${key} must be a complete MM/DD/YYYY calendar date`);
    const month = Number(match[1]), day = Number(match[2]), year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    assert.ok(date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day,
      `${key} is not a possible calendar date`);
    return date;
  };
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(facts["participant.date_of_birth"]);
  assert.ok(birth, "participant.date_of_birth must be a complete YYYY-MM-DD calendar date");
  const birthDate = new Date(Date.UTC(Number(birth[1]), Number(birth[2]) - 1, Number(birth[3])));
  assert.ok(birthDate.getUTCFullYear() === Number(birth[1]) && birthDate.getUTCMonth() === Number(birth[2]) - 1
    && birthDate.getUTCDate() === Number(birth[3]), "participant.date_of_birth is not a possible calendar date");
  const placed = parseMdy("matter.placement_date"), ended = parseMdy("matter.supervision_end_date");
  const dismissed = parseMdy("matter.discharge_dismissal_date");
  assert.ok(ended >= placed, "supervision end cannot precede placement");
  assert.ok(dismissed >= ended, "discharge and dismissal cannot precede the supervision end");
  assert.ok((ended - placed) / 86400000 >= 180, "the established deferred-supervision period must be at least 180 days");
  assert.ok(dismissed >= new Date(Date.UTC(2017, 8, 1)), "this route requires discharge and dismissal on or after September 1, 2017");
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
function courtTypeChoiceFor(facts) {
  const court = heldCourtDetails(facts);
  assert.equal(facts["matter.court_type"] ?? court.type, court.type, "derived court type must match the held court name");
  return { index: 2, state: "Choice3", label: court.type, number: court.number };
}

/** Flatten the source-authored court-type option while leaving every other option unmarked. */
export async function nativeCourtTypeDerivative(sourceBytes, facts) {
  validateFixture(facts);
  const choice = courtTypeChoiceFor(facts);
  const doc = await PDFDocument.load(sourceBytes, { updateMetadata: false }), form = doc.getForm();
  const group = form.getRadioGroup("Choice 1"), widgets = group.acroField.getWidgets();
  assert.equal(widgets.length, 5, "the Statement court-type group must carry five source options");
  const rows = [];
  for (const [index, widget] of widgets.entries()) {
    const pageNumber = pageOfWidget(doc, widget), page = doc.getPages()[pageNumber - 1], rect = widget.getRectangle();
    const normal = widget.getNormalAppearance(); assert.ok(normal instanceof PDFDict);
    const state = index === choice.index ? choice.state : "Off", ref = normal.get(PDFName.of(state)), stream = doc.context.lookup(ref);
    assert.ok(stream instanceof PDFRawStream, `missing native court-type /AP/N/${state} for widget ${index}`);
    if (index === choice.index) {
      const key = page.node.newXObject("NativeCourtTypeWidget", ref);
      page.pushOperators(pushGraphicsState(), translate(rect.x, rect.y), drawObject(key), popGraphicsState());
    }
    rows.push({ widgetIndex: index, option: index === choice.index ? choice.label : null, selected: index === choice.index,
      state, page: pageNumber, rect: { x: +rect.x.toFixed(4), y: +rect.y.toFixed(4), width: +rect.width.toFixed(4), height: +rect.height.toFixed(4) },
      sourceAppearanceSha256: sha256(Buffer.from(stream.contents)) });
  }
  for (const widget of widgets) {
    const page = doc.getPages()[pageOfWidget(doc, widget) - 1], widgetRef = doc.context.getObjectRef(widget.dict);
    assert.ok(widgetRef, "court-type widget must be an indirect annotation");
    page.node.removeAnnot(widgetRef);
  }
  form.removeField(group); stampDeterministic(doc);
  const bytes = Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, appearances: rows, selectedOption: choice.label, selectedState: choice.state, derivativeSha256: sha256(bytes) };
}

function existingHelveticaRef(doc) {
  for (const page of doc.getPages()) {
    const pageResources = page.node.Resources();
    const pageFonts = pageResources?.lookup(PDFName.of("Font"));
    const pageHelvetica = pageFonts instanceof PDFDict ? pageFonts.get(PDFName.of("Helvetica")) : null;
    if (pageHelvetica) return pageHelvetica;
    const xObjects = pageResources?.lookup(PDFName.of("XObject"));
    if (!(xObjects instanceof PDFDict)) continue;
    for (const key of xObjects.keys()) {
      const object = xObjects.lookup(key);
      if (!(object instanceof PDFRawStream)) continue;
      const resources = object.dict.lookup(PDFName.of("Resources"));
      const fonts = resources?.lookup(PDFName.of("Font"));
      const helvetica = fonts instanceof PDFDict ? fonts.get(PDFName.of("Helvetica")) : null;
      if (helvetica) return helvetica;
    }
  }
  return null;
}

function asciiHex(value) {
  const text = String(value);
  assert.ok(/^[\x20-\x7e]*$/.test(text), "TX derived statement writes must be printable ASCII");
  return Buffer.from(text, "latin1").toString("hex").toUpperCase();
}

/**
 * Write the six source fields whose held values are intentionally derived but
 * cannot bind through the shared semantic registry. The source fields remain
 * blank and are flattened by the ordinary finalizer; these XObjects are then
 * placed at the same measured rectangles, using the finalizer's Helvetica
 * resource and the same FlatWidget proof vocabulary.
 */
async function appendDerivedStatementWrites(bytes, census, facts) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const fontRef = existingHelveticaRef(doc);
  assert.ok(fontRef, "finalized Statement must expose the existing Helvetica resource for derived writes");
  const overlays = [];
  for (const fieldName of STATEMENT_CUSTOM_WRITE_NAMES) {
    const row = census.rows.find((candidate) => candidate.name === fieldName);
    assert.ok(row, `derived Statement write is absent from the source census: ${fieldName}`);
    const widget = fieldName === "Month / Mes"
      ? row.widgets.find((candidate) => candidate.page === 11)
      : row.widgets[0];
    assert.ok(widget, `${fieldName}: derived Statement write has no measured participant widget`);
    const value = facts[row.fact];
    assert.ok(value !== undefined && value !== null && String(value).trim() !== "", `${fieldName}: no held value for ${row.fact}`);
    overlays.push({ field: fieldName, factId: row.fact, page: widget.page, rect: widget.rect, value: String(value) });
  }
  const customWrites = [];
  for (const overlay of overlays) {
    const page = doc.getPages()[overlay.page - 1];
    assert.ok(page, `${overlay.field}: measured page is absent from the derived Statement`);
    const { x, y, width, height } = overlay.rect;
    // The longest held address is 241.44pt at 8pt Helvetica in its 246.96pt
    // mailing box. Keep one point of inset on each side and fail closed if a
    // future fixture exceeds this exact source geometry.
    const fontSize = 8;
    const estimatedWidth = String(overlay.value).length * fontSize * 0.47;
    assert.ok(estimatedWidth + 2 <= width, `${overlay.field}: held value does not fit its measured source box at the readable size`);
    const baseline = Math.max(1, (height - fontSize) / 2);
    const body = [
      "q", "BT", "0 g", `/Helvetica ${fontSize} Tf`,
      `1 0 0 1 1 ${baseline.toFixed(3)} Tm`, `<${asciiHex(overlay.value)}> Tj`,
      "ET", "Q", ""
    ].join("\n");
    const resources = doc.context.obj({ Font: doc.context.obj({ Helvetica: fontRef }) });
    const appearance = doc.context.flateStream(body, {
      Type: "XObject", Subtype: "Form", FormType: 1,
      BBox: doc.context.obj([0, 0, width, height]),
      Matrix: doc.context.obj([1, 0, 0, 1, 0, 0]), Resources: resources
    });
    const ref = doc.context.register(appearance);
    const key = page.node.newXObject("FlatWidget", ref);
    page.pushOperators(pushGraphicsState(), translate(x, y), drawObject(key), popGraphicsState());
    customWrites.push({ ...overlay, kind: "flattened_text_overlay", fontSize, appearance: key.decodeText(), derivedFrom: DERIVED_FACT_LINEAGE[overlay.factId] ?? null });
  }
  stampDeterministic(doc);
  const output = Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes: output, customWrites };
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
  const group10 = await nativeGroup10Derivative(source.bytes, facts);
  const courtType = await nativeCourtTypeDerivative(group10.bytes, facts);
  const writable = census.rows.filter((r) => r.policy === "write" && !STATEMENT_CUSTOM_WRITE_NAMES.has(r.name));
  const omitted = new Set(["Group10", "Choice 1", ...STATEMENT_CUSTOM_WRITE_NAMES]);
  const result = await finalizeOfficialForm({ sourceBytes: courtType.bytes, expectedSha256: courtType.derivativeSha256,
    census: finalizerCensus(census, omitted), facts,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.name, r.fact])),
    unwritableFields: census.rows.filter((r) => !omitted.has(r.name) && r.policy !== "write").map((r) => ({ field: r.name })),
    documentTextLines: [], title: source.title,
    printedDateOrderByField: { "My date of birth / Mi fecha de nacimiento es": "month_day_year" },
    clearSourceCarriedTextValues: ["Today", "Value / Valor 11", "Amount Cantidad 15"], preserveUnwrittenSelectionBackgrounds: true });
  const derived = await appendDerivedStatementWrites(result.bytes, census, facts);
  result.bytes = derived.bytes;
  const finalizerWrittenCount = result.report.written.length;
  result.report.written.push(...derived.customWrites.map((r) => ({ field: r.field, factId: r.factId, value: r.value,
    kind: r.kind, fontSize: r.fontSize, derivedFrom: r.derivedFrom })));
  result.report.customWrites = derived.customWrites;
  result.report.finalizerWrittenCount = finalizerWrittenCount;
  result.report.sharedWidgetScopedWrite = { field: "Month / Mes", writtenWidgetPage: 11, writtenWidgetIndex: 0,
    preservedWidgetPage: 12, preservedWidgetIndex: 1, preservedPlacementCount: 0,
    treatment: "DOB widget only; notary subscription date widget remains blank" };
  result.report.nativeGroup10 = group10.appearances;
  result.report.nativeCourtType = courtType.appearances;
  result.report.outputSha256 = sha256(result.bytes);
  result.report.outputBytes = result.bytes.length;
  result.report.activeContentScan = scanBytesForActiveContent(result.bytes);
  assert.ok(result.report.activeContentScan.inspectable && result.report.activeContentScan.hits.length === 0,
    "statement derivative retains active content after shared-widget scoping");
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
    const census = censuses.get(id), report = reports.get(id), written = new Set((report?.written ?? []).map((r) => r.field));
    const customWritten = new Map((report?.customWrites ?? []).map((r) => [r.field, r]));
    const canonicalWrites = [], canonicalRefusals = [], selectionControls = [];
    for (const row of census.rows) {
      const base = { document: id, formNumber: id, fieldName: row.name, effectiveLabel: row.label, printedLabel: row.label,
        page: row.page, rect: row.widgets[0]?.rect ?? null };
      if (row.name === "Choice 1") {
        const selectedWidget = row.widgets[2];
        assert.ok(selectedWidget, "Choice 1 must expose the measured County Court at Law widget");
        const w = { ...base, field: `${id}.Choice 1.courtType`, fieldName: "Choice 1", effectiveLabel: "County Court at Law court-type option",
          page: selectedWidget.page, rect: selectedWidget.rect, factId: "matter.court_type", kind: "native_acroform_appearance",
          selectedState: "Choice3", routeDetermined: true };
        canonicalWrites.push(w); selectionControls.push({ selectionId: w.field, field: w.effectiveLabel,
          disposition: "selected_from_explicit_held_court_fact", page: selectedWidget.page, requiredBeforeFiling: false, routeDetermined: true,
          factId: w.factId, selectedState: w.selectedState });
      } else if (row.name === "Group10") {
        for (const [suffix, q] of Object.entries(GROUP10)) {
          const label = suffix === "legalAid" ? "Are you represented by Legal Aid?" : "Ability to pay court costs";
          const w = { ...base, field: `${id}.Group10.${suffix}`, fieldName: `Group10.${suffix}`, effectiveLabel: label,
            page: q.page, rect: row.widgets[q.trueIndex].rect, factId: q.fact, kind: "native_acroform_appearance", routeDetermined: false };
          canonicalWrites.push(w); selectionControls.push({ selectionId: w.field, field: label,
            disposition: "selected_from_explicit_participant_fact", page: q.page, requiredBeforeFiling: false, routeDetermined: false });
        }
      } else if (row.policy === "write" && written.has(row.name)) {
        const custom = customWritten.get(row.name);
        canonicalWrites.push({ ...base, field: `${id}.${row.name}`, factId: row.fact, kind: row.isSelectionControl ? "acroform_selection" : "acroform_text",
          ...(custom ? { kind: "flattened_text_overlay", derivedFrom: custom.derivedFrom, fontSize: custom.fontSize } : {}),
          ...(row.name === "Month / Mes" ? { widgetScope: { writtenWidgetIndexes: [0], preservedWidgetIndexes: [1],
            treatment: "DOB widget only; notary subscription date widget remains blank" } } : {}) });
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
    "The Statement caption is prefilled with the held court number and the County Court at Law court-type selection. Verify those entries against the court named in the recovery letter before signing.", "",
    "The Statement declaration's three date-of-birth boxes are prefilled from the date already printed on page 2. Leave the separate notary subscription date blank for the notary and do not enter the date you sign in that notary field.", "",
    "The Statement's mailing and declaration address blanks carry the complete held street, city, state, and ZIP. Correct them before signing only if the held record has changed; do not add an unsupported country.", "",
    "Review the two separate selections on the Statement: legal-aid representation and ability to pay court costs. Each selection comes from the participant's supplied answer; correct either one before signing if it is not true.", "",
    "The proposed order remains entirely for the court. Ask the clerk whether that court expects it with the recovery letter; do not sign, date, or mark findings on it.", "", "## Complete these blanks before submission", ""
  ];
  for (const r of required) out.push(`- **${r.effectiveLabel}** — ${r.why}`);
  out.push("", "## Signatures and dates", "", "Sign and date the recovery letter when you submit it. Complete the Statement's declaration and any notary option only at signing. The judge completes the proposed order.", "",
    "## Stop and get help", "", "Stop for any family-violence issue, excluded offense, prior non-traffic conviction or deferred adjudication, adverse best-interest finding, disputed 180-day calculation, immigration consequence, or uncertainty about the record. An adverse finding routes away from Section 411.072.", "",
    `_Routes: ${ROUTE_KEYS.join(" · ")}_`, "");
  return out.join("\n");
}
function normalizedText(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
export function assertAppearanceMatches({ field, expectedText = null, observedText = null, expectedSha256 = null, observedSha256 = null }) {
  if (expectedSha256 !== null) {
    assert.equal(observedSha256, expectedSha256, `${field}: flattened selection does not use the expected source-authored appearance`);
    return true;
  }
  assert.equal(normalizedText(observedText), normalizedText(expectedText), `${field}: flattened appearance value disagrees with the held fact`);
  return true;
}
export function refusedInkFinding({ field, selection = false, observedText = "", selectedMarkPresent = false }) {
  if (selection) {
    if (!selectedMarkPresent) return null;
    return { fieldId: field, why: "refused selection carries a source-authored selected mark in final bytes" };
  }
  return normalizedText(observedText) === "" ? null : { fieldId: field, why: "refused text field carries text in final bytes", drawnText: normalizedText(observedText) };
}
function pageAppearancePlacements(doc) {
  const rows = [];
  for (const [pageIndex, page] of doc.getPages().entries()) {
    const resources = page.node.Resources(), xObjects = resources && resources.lookup(PDFName.of("XObject"));
    if (!xObjects) continue;
    const contents = page.node.Contents(), refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let source = "";
    for (const ref of refs) {
      let bytes = Buffer.from(doc.context.lookup(ref).contents);
      try { bytes = zlib.inflateSync(bytes); } catch {}
      source += bytes.toString("latin1");
    }
    const placement = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/((?:FlatWidget|NativeWidget|NativeCourtTypeWidget)-\d+)\s+Do/g;
    let match;
    while ((match = placement.exec(source))) {
      let x = 0, y = 0;
      for (const cm of match[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)) {
        x += Number(cm[5]); y += Number(cm[6]);
      }
      const stream = xObjects.lookup(PDFName.of(match[2]));
      rows.push({ page: pageIndex + 1, x: +x.toFixed(4), y: +y.toFixed(4), name: match[2],
        sha256: sha256(Buffer.from(stream.contents)), decoded: decodedAppearance(stream) });
    }
  }
  return rows;
}
function placementAt(placements, page, rect, prefix = null) {
  return placements.filter((r) => r.page === page && Math.abs(r.x - rect.x) < 0.01 && Math.abs(r.y - rect.y) < 0.01
    && (prefix === null || r.name.startsWith(prefix)));
}
async function provePacket(file, maps, reports, manifest, censuses, facts) {
  const packetBytes = fs.readFileSync(path.join(ROOT, file));
  const widgets = await flattenedWidgets(path.join(ROOT, file)), writes = [];
  const packetDoc = await PDFDocument.load(packetBytes, { updateMetadata: false });
  const placements = pageAppearancePlacements(packetDoc), native = placements.filter((r) => r.name.startsWith("NativeWidget") || r.name.startsWith("NativeCourtTypeWidget"));
  for (const map of maps) for (const row of map.canonicalWrites) {
    if (row.kind === "native_acroform_appearance") continue;
    const packetPage = manifest.find((p) => p.component === map.documentId && p.sourcePage === row.page)?.packetPage;
    const hit = drawnAt(widgets, { page: packetPage, rect: row.rect }), flat = placementAt(placements, packetPage, row.rect, "FlatWidget");
    const report = (reports.get(map.documentId)?.written ?? []).find((r) => r.field === row.fieldName);
    assert.ok(report && hit.length, `write not found at ${row.field}`);
    const censusRow = censuses.get(map.documentId).rows.find((r) => r.name === row.fieldName);
    let expected = report.value ?? facts[row.factId];
    if (row.factId === "participant.date_of_birth") {
      const [year, month, day] = String(expected).split("-"); expected = `${month}/${day}/${year}`;
    }
    let expectedAppearanceSha256 = null, observedAppearanceSha256 = null;
    if (row.kind === "acroform_selection") {
      const authoredOnStates = Object.keys(censusRow.widgets[0].appearanceSha256ByState).filter((state) => state !== "Off");
      assert.equal(authoredOnStates.length, 1, `${row.field}: source checkbox must have exactly one authored on state`);
      const state = authoredOnStates[0], mark = censusRow.widgets[0].appearanceMarkContentByState[state] ?? Buffer.alloc(0);
      assert.ok(mark.length, `${row.field}: source-authored selected-mark content could not be isolated`);
      expectedAppearanceSha256 = censusRow.widgets[0].appearanceMarkSha256ByState[state];
      assert.equal(flat.length, 1, `${row.field}: expected one flattened selection appearance`);
      assert.ok(flat[0].decoded.includes(mark), `${row.field}: flattened appearance does not contain the source-authored selected mark`);
      observedAppearanceSha256 = sha256(mark);
      assertAppearanceMatches({ field: row.field, expectedSha256: expectedAppearanceSha256, observedSha256: observedAppearanceSha256 });
    } else {
      const observed = hit.map((r) => r.text).join("");
      assertAppearanceMatches({ field: row.field, expectedText: String(expected), observedText: observed });
    }
    writes.push({ field: row.field, document: map.documentId, factId: row.factId, page: packetPage,
      expected: String(expected), drawnText: hit.map((r) => r.text).join(""), appearancePlacements: hit.length,
      expectedAppearanceSha256, observedAppearanceSha256, foundInOutputBytes: true,
      ...(row.derivedFrom ? { derivedFrom: row.derivedFrom } : {}),
      proof: row.kind === "acroform_selection" ? "flattened XObject contains the exact source-authored checked-mark content at the original rectangle"
        : "flattened widget text equals the held value at the original source rectangle" });
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
  for (const row of reports.get(STATEMENT).nativeCourtType.filter((r) => r.selected)) {
    const packetPage = manifest.find((p) => p.component === STATEMENT && p.sourcePage === row.page).packetPage;
    assert.ok(native.some((n) => n.page === packetPage && Math.abs(n.x - row.rect.x) < 0.01
      && Math.abs(n.y - row.rect.y) < 0.01 && n.sha256 === row.sourceAppearanceSha256),
    "source-authored County Court at Law appearance is missing from assembled bytes");
    writes.push({ field: `${STATEMENT}.Choice 1.courtType`, document: STATEMENT, factId: "matter.court_type",
      page: packetPage, expectedState: row.state, rect: row.rect, sourceAppearanceSha256: row.sourceAppearanceSha256,
      foundInOutputBytes: true, proof: "source /AP/N/Choice3 stream flattened at its original widget /Rect" });
  }
  const allNative = [...reports.get(STATEMENT).nativeGroup10, ...reports.get(STATEMENT).nativeCourtType];
  assert.equal(native.length, 5, "assembled packet must carry four Group10 appearances and one court-type appearance");
  for (const row of allNative) {
    const packetPage = manifest.find((p) => p.component === STATEMENT && p.sourcePage === row.page).packetPage;
    const matches = native.filter((n) => n.page === packetPage && Math.abs(n.x - row.rect.x) < 0.01
      && Math.abs(n.y - row.rect.y) < 0.01 && n.sha256 === row.sourceAppearanceSha256);
    const expectedPlacements = row.question ? 1 : (row.selected ? 1 : 0);
    assert.equal(matches.length, expectedPlacements,
      `${row.question ?? "court-type"} widget ${row.widgetIndex} selected-state placement drift`);
  }
  const courtNumber = maps.find((m) => m.documentId === STATEMENT).canonicalWrites.find((r) => r.fieldName === "Court Number / Número del Tribunal");
  assert.ok(courtNumber && courtNumber.factId === "matter.court_number", "held court number must be a mapped participant-completable write");
  const cause = maps.find((m) => m.documentId === STATEMENT).canonicalRefusals.find((r) => r.fieldName === "Cause Number / Número de Caso");
  assert.ok(cause && cause.category === COURT_OWNED && cause.requiredBeforeFiling === false, "clerk-owned Cause Number must remain a protected blank");
  const month = censuses.get(STATEMENT).rows.find((r) => r.name === "Month / Mes");
  const notaryPage = manifest.find((p) => p.component === STATEMENT && p.sourcePage === 12).packetPage;
  const notaryInk = drawnAt(widgets, { page: notaryPage, rect: month.widgets.find((w) => w.page === 12).rect }).map((r) => r.text).join("").trim();
  assert.equal(notaryInk, "", "notary Month / Mes widget received the participant DOB");
  for (const fieldName of ["Today", "Value / Valor 11", "Amount Cantidad 15"]) {
    const row = maps.find((m) => m.documentId === STATEMENT).canonicalRefusals.find((r) => r.fieldName === fieldName);
    const packetPage = manifest.find((p) => p.component === STATEMENT && p.sourcePage === row.page).packetPage;
    const ink = drawnAt(widgets, { page: packetPage, rect: row.rect }).map((r) => r.text).join("").trim();
    assert.equal(ink, "", `${fieldName} source-carried default remains in assembled packet bytes`);
  }
  const refusedFieldsWithInk = []; let refusedWidgetsMeasured = 0;
  for (const [componentId, census] of censuses) for (const row of census.rows) {
    if (row.policy === "write" || row.name === "Group10" || row.name === "Choice 1") continue;
    for (const widget of row.widgets) {
      refusedWidgetsMeasured += 1;
      const packetPage = manifest.find((p) => p.component === componentId && p.sourcePage === widget.page)?.packetPage;
      const observedText = drawnAt(widgets, { page: packetPage, rect: widget.rect }).map((r) => r.text).join("");
      const flat = placementAt(placements, packetPage, widget.rect, "FlatWidget");
      const selectedMarks = Object.values(widget.appearanceMarkContentByState);
      if (row.isSelectionControl) assert.ok(selectedMarks.length, `${componentId}.${row.name}: selected-mark content is not measurable`);
      const finding = refusedInkFinding({ field: `${componentId}.${row.name}[${widget.index}]`, selection: row.isSelectionControl,
        observedText, selectedMarkPresent: flat.some((appearance) => selectedMarks.some((mark) => appearance.decoded.includes(mark))) });
      if (finding) refusedFieldsWithInk.push({ ...finding, refusalClass: row.refusalClass ?? null });
    }
  }
  assert.equal(refusedFieldsWithInk.length, 0,
    `refused or protected fields carry ink: ${refusedFieldsWithInk.map((r) => r.fieldId).join(", ")}`);
  return { actualWrites: writes, refusedFieldsWithInk, refusedWidgetsMeasured, nativeAppearancesMeasured: native.length };
}
function measureCounters(maps, proofs, instructions, artifacts) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((key) => [key, 0])), findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const selectionIds = new Set(maps.flatMap((m) => m.selectionControls.map((s) => s.selectionId)));
  const normalize = (r) => ({ id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "",
    reason: r.reason ?? "", refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selectionIds.has(r.field),
    declared: { disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.field, factId: r.factId ?? null } });
  const writes = maps.flatMap((m) => m.canonicalWrites.map(normalize));
  const blanks = maps.flatMap((m) => m.canonicalRefusals.map(normalize));
  const availableFacts = new Set(writes.map((r) => r.factId).filter(Boolean));
  const norm = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenByDocument = new Map();
  for (const row of writes) {
    if (!writtenByDocument.has(row.document)) writtenByDocument.set(row.document, new Set());
    writtenByDocument.get(row.document).add(norm(row.label)); writtenByDocument.get(row.document).add(norm(row.name));
  }
  const ledger = [];
  for (const blank of blanks) {
    const here = writtenByDocument.get(blank.document) ?? new Set();
    const declared = { ...blank.declared,
      factAvailable: (blank.factId ? availableFacts.has(blank.factId) : false) || here.has(norm(blank.label)) || here.has(norm(blank.name)) };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared); ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition]?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
  }
  const hay = instructions.toLowerCase();
  for (const blank of ledger.filter((r) => r.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (!needles.some((needle) => hay.includes(needle.toLowerCase().slice(0, 60))))
      note("requiredFactsNotCollected", { field: blank.id, why: "required item is absent from participant instructions" });
  }
  const rows = new Map();
  for (const field of [...writes.map((r) => ({ ...r, written: true })), ...blanks.map((r) => ({ ...r, written: false }))]) {
    const key = rowKeyOf(field); if (!key) continue;
    if (!rows.has(key)) rows.set(key, []); rows.get(key).push(field);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((r) => r.written)) continue;
    const missing = cells.filter((r) => !r.written && classifyField(r.label, r.isSelectionControl).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, missingCells: missing.map((r) => r.label) });
  }
  for (const row of writes) if (classifyField(row.label, row.isSelectionControl).requirement === "PROTECTED")
    note("protectedWrites", { field: row.id, why: "a protected field was written" });
  const expectedWriteIds = new Set(writes.map((r) => r.id));
  for (const proof of proofs) {
    const proven = new Set(proof.actualWrites.filter((r) => r.foundInOutputBytes).map((r) => r.field));
    for (const id of expectedWriteIds) if (!proven.has(id)) note("invisibleWrites", { fixture: proof.fixture, field: id });
    for (const refused of proof.refusedFieldsWithInk) {
      note("visualDefects", { fixture: proof.fixture, field: refused.fieldId, why: refused.why });
      if (refused.refusalClass === SIGNATURE || refused.refusalClass === COURT_OWNED)
        note("protectedWrites", { fixture: proof.fixture, field: refused.fieldId, why: refused.why });
    }
  }
  for (const component of COMPONENTS) if (!artifacts.every((artifact) => artifact.documents.includes(component)))
    note("requiredComponentsMissing", { component });
  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

export async function verifyBuiltOutputs(directory = path.join(ROOT, OUT_REL)) {
  const renderedPath = path.join(directory, "reports/rendered-artifacts.json");
  const mapPath = path.join(directory, "production-field-map.json");
  const receiptPath = path.join(directory, "source-receipt.json");
  for (const required of [renderedPath, mapPath, receiptPath])
    assert.ok(fs.existsSync(required), `required build artifact missing: ${path.relative(directory, required)}`);
  const rendered = JSON.parse(fs.readFileSync(renderedPath, "utf8"));
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  assert.equal(rendered.familyId, FAMILY_ID, "rendered artifact family drift");
  assert.equal(map.familyId, FAMILY_ID, "field-map family drift");
  assert.equal(receipt.familyId, FAMILY_ID, "source-receipt family drift");
  assert.deepEqual(map.componentSet, COMPONENTS, "field-map component set drift");
  assert.deepEqual(rendered.componentSet, COMPONENTS, "artifact component set drift");
  assert.equal(map.group10NativeAppearancePolicy?.synthesizedMarks, 0);
  assert.equal(map.group10NativeAppearancePolicy?.outsideControlMarks, 0);
  const receiptSources = new Map((receipt.documents ?? []).map((row) => [row.documentId, row.sha256]));
  for (const source of SOURCES)
    assert.equal(receiptSources.get(source.componentId), source.sha256, `${source.componentId} receipt source drift`);
  const expectedFixtures = ["boundary", "canonical"];
  const pdfs = rendered.pdfs ?? [];
  assert.deepEqual(pdfs.map((row) => row.fixture).sort(), expectedFixtures, "rendered artifacts must bind canonical and boundary PDFs exactly once");
  for (const fixture of expectedFixtures) {
    const pdf = pdfs.find((row) => row.fixture === fixture);
    const actualPath = path.join(directory, "fixtures", `${fixture}.pdf`);
    assert.ok(fs.existsSync(actualPath), `required ${fixture} PDF missing`);
    const bytes = fs.readFileSync(actualPath);
    assert.equal(sha256(bytes), pdf.sha256, `${fixture} artifact hash drift`);
    assert.equal(bytes.length, pdf.byteLength, `${fixture} artifact byte-length drift`);
    assert.equal((await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount(), 22, `${fixture} page-count drift`);
    assert.deepEqual(pdf.documents ?? rendered.artifacts?.find((row) => row.fixture === fixture)?.documents,
      COMPONENTS, `${fixture} component coverage drift`);
  }
  return { artifactsVerified: 2, mapsVerified: true, sourceReceiptVerified: true };
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
    const { artifactsVerified, mapsVerified, sourceReceiptVerified } = await verifyBuiltOutputs();
    return { familyId: FAMILY_ID, status: "CHECK_ONLY", boundSources: 3,
      sourceHashes: resolved.map((r) => ({ sourceId: r.sourceId, sha256: r.sha256, pages: r.pageCount })),
      fields: [{ component: LETTER, actual: 25 }, { component: ORDER, actual: 0 }, { component: STATEMENT, actual: 132 }],
      group10: group.widgets, letterDerivativeSha256: letterDerivative.sha256, artifactsVerified, mapsVerified, sourceReceiptVerified,
      outputWritten: false };
  }

  const factsByFixture = options.fixtures ?? FIXTURES;
  for (const fixture of ["canonical", "boundary"]) validateFixture(factsByFixture[fixture]);
  fs.mkdirSync(path.join(ROOT, OUT_REL, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT_REL, "reports"), { recursive: true });
  const artifacts = [], proofs = []; let maps = null;
  for (const fixture of ["canonical", "boundary"]) {
    const facts = derivedFacts(factsByFixture[fixture]), reports = new Map(), rendered = [];
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
    const proof = await provePacket(file, maps, reports, packet.pageManifest, censuses, facts);
    assert.equal(proof.actualWrites.length, maps.reduce((n, m) => n + m.canonicalWrites.length, 0));
    proofs.push({ fixture, valuesReportedByFinalizer: [...reports.values()].reduce((n, r) => n + (r.finalizerWrittenCount ?? r.written.length), 0),
      valuesReportedByRenderer: [...reports.values()].reduce((n, r) => n + r.written.length, 0),
      nativeGroup10Selections: reports.get(STATEMENT).nativeGroup10.filter((r) => r.selected),
      nativeCourtTypeSelections: reports.get(STATEMENT).nativeCourtType.filter((r) => r.selected),
      sharedWidgetScopedWrite: reports.get(STATEMENT).sharedWidgetScopedWrite,
      protectedSourceDefaultsCleared: reports.get(STATEMENT).sourceCarriedValuesCleared, ...proof });
    artifacts.push({ fixture, file, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount,
      documents: COMPONENTS, components: COMPONENTS, pageManifest: packet.pageManifest });
  }
  assert.ok(artifacts.every((a) => a.pageCount === 22));
  const instructions = participantInstructions(maps); fs.writeFileSync(path.join(ROOT, OUT_REL, "participant-instructions.md"), instructions);
  const requiredBeforeFiling = maps.flatMap((m) => m.canonicalRefusals).filter((r) => r.requiredBeforeFiling);
  const counted = measureCounters(maps, proofs, instructions, artifacts), counters = counted.counters;
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
    courtTypeNativeAppearancePolicy: { parentField: "Choice 1", selectedState: "Choice3", selectedLabel: "County Court at Law",
      radioStructureEdited: false, synthesizedMarks: 0, outsideControlMarks: 0,
      treatment: "the held court selects the source-authored County Court at Law appearance at its original /Rect" },
    derivedFactLineage: DERIVED_FACT_LINEAGE,
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
      valuesReportedByRenderer: p.valuesReportedByRenderer,
      nativeGroup10Selections: p.nativeGroup10Selections.length, flattenedWidgetAppearancesReadFromOutputBytes: p.actualWrites.length,
      nativeCourtTypeSelections: p.nativeCourtTypeSelections.length, sharedWidgetScopedWrite: p.sharedWidgetScopedWrite,
      refusedWidgetsMeasured: p.refusedWidgetsMeasured, nativeAppearancesMeasured: p.nativeAppearancesMeasured,
      refusedFieldsWithInk: p.refusedFieldsWithInk })), blockingFindings: [] });
  writeJson(`${OUT_REL}/reports/blanks-left-for-the-participant.json`, { schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling, protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => !r.requiredBeforeFiling)),
    everyRequiredBeforeFilingItemIsDisclosed: true, disclosedIn: `${OUT_REL}/participant-instructions.md` });
  writeJson(`${OUT_REL}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    counters, allNineZero: PASS_COUNTERS.every((key) => counters[key] === 0), findings: counted.findings,
    measurementBasis: { censusFields: 157, mappedComponents: maps.length, packetFixtures: proofs.length,
      declaredWrites: maps.reduce((n, m) => n + m.canonicalWrites.length, 0), requiredBeforeFiling: requiredBeforeFiling.length,
      terminalFieldsClassified: counted.terminalFields, blankDispositionLedgerEntries: counted.ledger.length,
      refusedWidgetsMeasuredFromFinalBytes: proofs.reduce((n, p) => n + p.refusedWidgetsMeasured, 0),
      rasterState: "RASTER_PENDING", visualDefectsCountsOnlyStructurallyDetectedInk: true },
    note: "Derived from the exhaustive source census, three-component page manifest, and actual-write proofs. No visual acceptance is claimed." });
  const wiringPath = path.join(ROOT, OUT_REL, "product-wiring.json");
  const productWiring = { schemaVersion: "rcap-census-v1-product-wiring/v1", family: FAMILY_ID, routeKey: ROUTE_KEYS[1], routeKeys: ROUTE_KEYS,
    workType: "PRODUCT_WIRING_REQUIRED", status: "DECLARED_NOT_INSTALLED", authorityCreated: "none",
    currentState: { serviceDisposition: "missing_from_compiled_runtime", generationAllowed: false },
    binding: { family: FAMILY_ID, jurisdiction: "TX", routeKeys: ROUTE_KEYS, deliveryType: "official_pdf_fill",
      instrumentKinds: ["no filing — process guidance", "OCA model recovery letter", "proposed order", "fee waiver statement"],
      packetComponents: COMPONENTS.map((id) => `component:${id}`), fieldMap: `${OUT_REL}/production-field-map.json`,
      instructions: `${OUT_REL}/participant-instructions.md`, renderedArtifacts: `${OUT_REL}/reports/rendered-artifacts.json`,
      sourceReceipt: `${OUT_REL}/source-receipt.json`, acceptanceReceipt: null, paymentEligible: false, sponsorshipEligible: false },
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 };
  preserveGovernanceState(fs, wiringPath, productWiring, { canonicalSha256: artifacts.map((a) => a.sha256),
    log: (line) => console.error(line) });
  writeWiringChecked(fs, wiringPath, productWiring);
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
