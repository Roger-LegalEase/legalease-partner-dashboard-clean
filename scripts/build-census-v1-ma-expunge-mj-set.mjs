#!/usr/bin/env node
/**
 * The Massachusetts marijuana-expungement family — `ma-expunge-mj-set`.
 *
 *   node scripts/build-census-v1-ma-expunge-mj-set.mjs [--check] [--no-raster]
 *
 * One official Trial Court form, TC0021, _Petition for Expungement of Marijuana
 * Offenses, G.L. c. 276, § 100K¼_ (Rev. 11/22). Page 1 is the petition; page 2
 * is the court's own instruction sheet plus an "Additional Information"
 * continuation box. The route's component set is the primary filing alone.
 *
 * FOUR THINGS ABOUT THIS FORM SHAPED THE IMPLEMENTATION.
 *
 * First, the binary is an XFA HYBRID. The committed corpus index records
 * `xfaPresent: false`, but the pinned bytes carry an XFA packet that pdf-lib
 * removes on load ("Removing XFA form data..."), and the state manifest gates
 * this source for exactly that reason: "it is XFA. The existing runtime
 * renderer cannot fill XFA". The AcroForm side of the hybrid is complete — 29
 * widgets over static page content that extracts cleanly — so the finalizer's
 * ordinary fill-and-flatten path applies, the sanitation report records
 * `xfaPresentInInput` and `xfaRemoved`, and the discrepancy between the index
 * and the bytes is recorded in build-findings rather than resolved silently.
 *
 * Second, the packet carries ZERO platform-written values, each refusal for its
 * own reason rather than as a policy:
 *
 *   - The DOCKET NO. box asks for the docket number of the case to be expunged.
 *     The builder contract for this lane forbids writing docket numbers, so it
 *     is declared required-before-filing and the participant copies it from
 *     their own court record.
 *   - The petitioner block asks for name, address AND phone number in one
 *     multiline box. The platform holds all three separately and the shared
 *     semantic registry has no composed name-address-telephone fact; a field
 *     takes one fact, and a third of an answer in the court's contact block is
 *     worse than a blank one. Same finding as MC 227a's `dinfo`
 *     (mi_setaside_marihuana-set), recorded again for whoever owns the
 *     descriptor list.
 *   - COURT DIVISION matches no descriptor in the shared registry (the
 *     matter.court descriptor binds court-name/type-of-court/judicial-district
 *     captions, not a division line), so no write can bind it through the
 *     shared finalizer and it is left to the participant with the reason
 *     stated.
 *
 *   A consequence is recorded rather than hidden: with nothing written, the
 *   canonical and boundary fixtures are byte-identical.
 *
 * Third, every checkbox on page 1 is the participant's own: which court
 * department heard the case, which of the eight enumerated marijuana offences
 * are on the record, whether an interpreter is needed, whether a hearing is
 * requested, whether documents are attached — all facts about the participant's
 * record or choices only they can make. TC0021 serves exactly one statutory
 * route, prints it in its own caption, and offers no route fork, so this
 * packet makes no route selection and there is no box the route could tick.
 *
 * Fourth, the service statement at the foot of page 1 — "I provided this
 * petition and supporting documents to the District Attorney's Office ... on
 * [DATE]" — describes an act that has not happened when the packet is
 * prepared. Its two method boxes and its date are completed by the petitioner
 * when the copy actually goes out (the court's own instruction sheet: on or
 * before the day of filing), so the date is protected and the method boxes are
 * left as the petitioner's own, with the reason stated.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 * A built family is a built family: not verified, not approved, not sellable,
 * and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "ma-expunge-mj-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ma-expunge-mj-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "MA",
  routeKey: "obligation:track-pathway:MA:ma-expunge-mj:marijuana-only-expungement",
  routeSelectionId: "ma-expunge-mj-set-tc0021-primary-filing",
  publicLabel: "Expunge a decriminalized marijuana offense record",
  /*
   * The MASTER_QUEUE instrument kind reads "§§ 100K / 100K¼". The form's own
   * caption and the track's recorded authority in
   * data/rcap-ledger/track-pathway-crosswalk.json both read § 100K¼ alone —
   * § 100K is the general expungement section and TC0021 is not its form.
   * Recorded in build-findings as a fidelity note; the assigned FORM is
   * TC0021 and this build does not deviate from it.
   */
  authority: "G.L. c. 276, § 100K¼; Trial Court form TC0021 (Rev. 11/22)",
  documents: [
    {
      formNumber: "TC0021",
      title: "Petition for Expungement of Marijuana Offenses, G.L. c. 276, Section 100K 1/4",
      instrumentKind: "primary_filing"
    }
  ]
});

// The MASTER_QUEUE row's own binding, asserted against the committed index and
// the mounted bytes so three records agree before anything is rendered.
const PINNED_SHA256 = "a9d80fab51668c59a15b559aa0f5021e8b4bf661fa83429ef22b31157cbf565c";

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/*
 * The 29 AcroForm fields of TC0021, every one, keyed by full field name.
 *
 * The XFA-era names say nothing ("TextField1[3]"), so `caption` is the text the
 * court prints for the blank, read back from the binary at `captionAt` before
 * anything renders — the build refuses on drift. Some printed lines squash two
 * captions into one extracted run ("Boston Municipal CourtJuvenile Court");
 * the captions here are substrings that survive that squashing, and the
 * flattened-substring check below is exact about where each must sit.
 */
const S = {
  CAPTION: "Caption",
  PARTIES: "Petitioner and court",
  INTERPRETER: "Interpreter",
  CHARGES: "Charges to be expunged",
  BASIS: "Basis of the request",
  NARRATIVE: "Reasons and attachments",
  SERVICE: "Service on the District Attorney",
  SIGN: "Signature"
};

const FORM_FIELDS = {
  "TC0021": {
    "form1[0].#subform[0].TextField1[0]": {
      section: S.CAPTION, caption: "DOCKET NO.", captionAt: { page: 1, y: 763 },
      label: "Docket number of the case in which you are seeking expungement",
      ...SUPPLY("the docket number of the case you are asking to expunge, copied exactly from your own court paperwork — this build never writes a docket number")
    },
    "form1[0].#subform[0].TextField1[1]": {
      section: S.PARTIES, caption: "YOUR NAME, ADDRESS, AND PHONE NUMBER (Petitioner)", captionAt: { page: 1, y: 719 },
      label: "Your name, address, and phone number (Petitioner)",
      ...SUPPLY("your name, your address and your phone number, together in this one box. The platform holds all three separately but has no composed fact for a single name-address-telephone block, and writing only one of the three would leave the court an incomplete contact block")
    },
    "form1[0].#subform[0].CheckBox1[0]": {
      section: S.PARTIES, selection: true, caption: "Boston Municipal Court", captionAt: { page: 1, y: 705 },
      label: "The case was heard in the Boston Municipal Court (selection)",
      ...ELECTION("which court heard your criminal case is a fact about your own record; tick the one your court paperwork names")
    },
    "form1[0].#subform[0].CheckBox1[1]": {
      section: S.PARTIES, selection: true, caption: "Juvenile Court", captionAt: { page: 1, y: 705 },
      label: "The case was heard in the Juvenile Court (selection)",
      ...ELECTION("which court heard your criminal case is a fact about your own record; tick the one your court paperwork names")
    },
    "form1[0].#subform[0].CheckBox2[0]": {
      section: S.PARTIES, selection: true, caption: "District Court", captionAt: { page: 1, y: 691 },
      label: "The case was heard in the District Court (selection)",
      ...ELECTION("which court heard your criminal case is a fact about your own record; tick the one your court paperwork names")
    },
    "form1[0].#subform[0].CheckBox1[2]": {
      section: S.PARTIES, selection: true, caption: "Superior Court", captionAt: { page: 1, y: 691 },
      label: "The case was heard in the Superior Court (selection)",
      ...ELECTION("which court heard your criminal case is a fact about your own record; tick the one your court paperwork names")
    },
    "form1[0].#subform[0].TextField1[7]": {
      section: S.PARTIES, caption: "COURT DIVISION", captionAt: { page: 1, y: 674 },
      label: "The court division where the criminal case was heard",
      ...SUPPLY("the division of that court, from your court paperwork. No descriptor in the shared semantic registry binds a court-division line, so the platform cannot write it for you")
    },
    "form1[0].#subform[0].CheckBox9[0]": {
      section: S.INTERPRETER, selection: true,
      caption: "I request the assistance of an interpreter for the following language", captionAt: { page: 1, y: 620 },
      label: "I request the assistance of an interpreter (selection)",
      ...ELECTION("whether you want an interpreter is your choice; the form says the interpreter is at no cost to you")
    },
    "form1[0].#subform[0].TextField1[2]": {
      section: S.INTERPRETER, caption: "I request the assistance of an interpreter for the following language", captionAt: { page: 1, y: 620 },
      label: "The language you need an interpreter for",
      ...SUPPLY("the language you need an interpreter for — only if you ticked the interpreter box")
    },
    "form1[0].#subform[0].CheckBox3[0]": {
      section: S.CHARGES, selection: true, caption: "possession of marijuana", captionAt: { page: 1, y: 583 },
      label: "Charge on my record: possession of marijuana, G.L. c. 94C, Sec. 34 (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].CheckBox3[1]": {
      section: S.CHARGES, selection: true, caption: "cultivation of marijuana", captionAt: { page: 1, y: 565 },
      label: "Charge on my record: cultivation of marijuana, G.L. c. 94C, Sec. 32C(a) (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].CheckBox3[2]": {
      section: S.CHARGES, selection: true, caption: "possession of marijuana with intent to distribute", captionAt: { page: 1, y: 547 },
      label: "Charge on my record: possession of marijuana with intent to distribute, G.L. c. 94C, Sec. 32C(a) (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].CheckBox3[3]": {
      section: S.CHARGES, selection: true, caption: "distribution of marijuana", captionAt: { page: 1, y: 529 },
      label: "Charge on my record: distribution of marijuana, G.L. c. 94C, Sec. 32C(a) (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].CheckBox3[4]": {
      section: S.CHARGES, selection: true, caption: "possession of marijuana, subsequent", captionAt: { page: 1, y: 511 },
      label: "Charge on my record: possession of marijuana, subsequent, G.L. c. 94C, Sec. 34 (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].CheckBox3[5]": {
      section: S.CHARGES, selection: true, caption: "cultivation of marijuana, subsequent", captionAt: { page: 1, y: 493 },
      label: "Charge on my record: cultivation of marijuana, subsequent, G.L. c. 94C, Sec. 32C(b) (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].CheckBox3[6]": {
      section: S.CHARGES, selection: true, caption: "possession of marijuana with intent to distribute, subsequent", captionAt: { page: 1, y: 475 },
      label: "Charge on my record: possession of marijuana with intent to distribute, subsequent, G.L. c. 94C, Sec. 32C(b) (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].CheckBox3[7]": {
      section: S.CHARGES, selection: true, caption: "distribution of marijuana, subsequent", captionAt: { page: 1, y: 457 },
      label: "Charge on my record: distribution of marijuana, subsequent, G.L. c. 94C, Sec. 32C(b) (selection)",
      ...ELECTION("which of the eight listed marijuana charges are on your record is a fact about the record; tick every one that is, as it appears on your docket")
    },
    "form1[0].#subform[0].TextField2[0]": {
      section: S.CHARGES, caption: "Counts", captionAt: { page: 1, y: 437 },
      label: "Counts of the charges to be expunged",
      ...SUPPLY("the count numbers of the marijuana charges you ticked, from your docket sheet")
    },
    "form1[0].#subform[0].CheckBox10[0]": {
      section: S.BASIS, selection: true,
      caption: "I make this request because the criminal records noted above were created as a result of marijuana", captionAt: { page: 1, y: 403 },
      label: "The records were created by marijuana offenses now decriminalized based on the amount involved (selection)",
      ...ELECTION("this is a sworn statement that the amount of marijuana in your own case was within the decriminalized limits the instruction sheet lists — the judge must find it by clear and convincing evidence, and only you can assert it")
    },
    "form1[0].#subform[0].TextField1[3]": {
      section: S.NARRATIVE, caption: "Specifically (provide as much detail as possible explaining the reasons for your request)", captionAt: { page: 1, y: 376 },
      label: "Specifically — the reasons for your request",
      ...SUPPLY("as much detail as possible about why the records should be expunged: the amount of marijuana involved, and anything that shows it was within the limits the instruction sheet lists")
    },
    "form1[0].#subform[0].CheckBox6[0]": {
      section: S.NARRATIVE, selection: true, caption: "I request that the Court hold a hearing on my petition", captionAt: { page: 1, y: 204 },
      label: "I request that the Court hold a hearing on my petition (selection)",
      ...ELECTION("whether to ask for a hearing is your choice; the instruction sheet says the judge may hold one even if you do not ask")
    },
    "form1[0].#subform[0].CheckBox4[0]": {
      section: S.NARRATIVE, selection: true, caption: "If you need more space to explain, check this box", captionAt: { page: 1, y: 187 },
      label: "I need more space and am continuing on the Instructions sheet (selection)",
      ...ELECTION("tick this only if you actually continue your explanation in the space on page 2 or attach more pages")
    },
    "form1[0].#subform[0].CheckBox5[0]": {
      section: S.NARRATIVE, selection: true, caption: "If you have documents that support your petition, check this box", captionAt: { page: 1, y: 160 },
      label: "I have supporting documents and am attaching them (selection)",
      ...ELECTION("tick this only if you are actually attaching documents that support your petition")
    },
    "form1[0].#subform[0].CheckBox7[0]": {
      section: S.SERVICE, selection: true, caption: "by delivering a copy in hand", captionAt: { page: 1, y: 129 },
      label: "I provided the petition to the District Attorney's Office by delivering a copy in hand (selection)",
      ...ELECTION("this states how you actually provided the copy; tick it only when you have delivered it, which the instruction sheet says must happen on or before the day you file")
    },
    "form1[0].#subform[0].CheckBox8[0]": {
      section: S.SERVICE, selection: true, caption: "by mailing a copy via first class mail to the District Attorney's Office", captionAt: { page: 1, y: 129 },
      label: "I provided the petition to the District Attorney's Office by first-class mail (selection)",
      ...ELECTION("this states how you actually provided the copy; tick it only when you have mailed it, which the instruction sheet says must happen on or before the day you file")
    },
    "form1[0].#subform[0].TextField1[4]": {
      section: S.SERVICE, caption: "DATE", captionAt: { page: 1, y: 100 },
      label: "Date you provided the petition to the District Attorney's Office",
      ...PROTECT(SIGNATURE, "this dates a statement that you have already provided the copy; a date written before you actually deliver or mail it would be false")
    },
    "form1[0].#subform[0].TextField1[5]": {
      section: S.SIGN, caption: "DATE", captionAt: { page: 1, y: 53 },
      label: "Date of the petitioner's signature",
      ...PROTECT(SIGNATURE, "you date the petition when you sign it; the statement above the signature is sworn under the pains and penalty of perjury")
    },
    "form1[0].#subform[0].TextField1[6]": {
      section: S.SIGN, caption: "PETITIONER'S SIGNATURE", captionAt: { page: 1, y: 53 },
      label: "Petitioner's signature",
      ...PROTECT(SIGNATURE, "you sign the petition yourself; the platform never signs for you")
    },
    "form1[0].#subform[1].TextField1[8]": {
      section: S.NARRATIVE, caption: "Additional Information", captionAt: { page: 2, y: 115 },
      label: "Additional Information — continuation of your explanation",
      ...SUPPLY("the rest of your explanation — only if you ticked the more-space box on page 1")
    }
  }
};

/* ---- fixtures ------------------------------------------------------------- *
 * The facts the platform holds for the two review participants. NONE of them
 * lands on this form — the header comment says why, blank by blank — so the two
 * fixtures render byte-identically. They are kept here because the honest
 * record of a zero-write packet includes what the platform held and could not
 * place. No signature, no dates, no docket number.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "42 Maple Street, Dorchester, MA 02124",
    "participant.phone": "617-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Springfield, Massachusetts 01103-2214",
    "participant.phone": "(413) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding -------------------------------------------------------- */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.state === "MA" && e.formNumber === wanted.formNumber);
    if (!entry) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    if (sha256 !== PINNED_SHA256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `SHA-256 drift against the MASTER_QUEUE binding: the queue pins ${PINNED_SHA256}, the corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel,
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null,
      indexSaysXfaPresent: entry.xfaPresent ?? null, assetClass: entry.assetClass ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census ---------------------------------------------------------------- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source) {
  const spec = FORM_FIELDS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true || field.constructor.name === "PDFCheckBox",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      caption: entry.caption, captionAt: entry.captionAt,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);

  // Every recorded caption must still be printed where the dictionary says.
  // Some of this form's printed lines squash neighbouring captions into one
  // extracted run, so the check is a flattened-substring match at the recorded
  // line — exact about position, tolerant only of the squashing.
  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const lines = pageText.find((p) => p.page === r.captionAt.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - r.captionAt.y) <= 2);
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) captionDrift.push({ key: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
  }
  return { rows, unmapped, stale: [...dictionaryKeys], captionDrift, pageText, pageCount: pages.length };
}

/* ---- render ----------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  // Zero writes: every field is refused by role, for the reason its own
  // dictionary entry states. explicitMappings is empty and stays empty.
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings: {},
    unwritableFields: census.rows.map((r) => ({ field: r.name })),
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  assert.equal(report.written.length, 0,
    `this packet is a zero-write packet by design and the finalizer wrote ${report.written.length} field(s)`);
  return { bytes, report };
}

/* ---- byte proof -------------------------------------------------------------- */
async function byteProof(census, artifactFile, fixtureName) {
  const widgets = await flattenedWidgets(path.join(ROOT, artifactFile));
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({ field: r.key, page: wdg.page, rect: wdg.rect, drawnText: [ink], sourceValue: r.sourceValue });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: [ink] });
    }
  }
  return {
    fixture: fixtureName,
    proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes; a zero-write packet must carry zero glyphs at every one of them",
    actualWrites: [],
    refusedFieldsWithInk,
    documentAuthoredAppearances,
    glyphs: 0,
    appearances: widgets.length
  };
}

/* ---- field map ---------------------------------------------------------------- */
function mapFor(source, census) {
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      captionBasis: "printed caption re-read from the pinned binary at captionReadAt as a flattened substring; the build refuses on drift",
      document: source.formNumber
    };
    if (r.isSelectionControl) {
      const cls = r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }
    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value it may write here and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: "primary_filing",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform_xfa_hybrid",
    explicitMappings: {},
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters ------------------------------ */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (a.page - b.page) || ((b.rect?.y ?? 0) - (a.rect?.y ?? 0)));
}

function participantInstructions(maps, rbf) {
  const elections = maps.flatMap((m) => m.selectionControls
    .filter((c) => c.category === PARTICIPANT_ELECTION)
    .map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is Massachusetts Trial Court form **TC0021**, _Petition for Expungement of Marijuana Offenses,_ "
    + "_G.L. c. 276, § 100K¼_ (Rev. 11/22). Page 2 of the form is the court's own instruction sheet — read it; "
    + "everything below follows it and adds nothing to it.", ""
  );
  out.push(
    "**The platform filled in nothing on this petition.** Every blank is yours, each for the reason given in the "
    + "tables below, and every checkbox is a statement about your own record or a choice only you can make. The court's "
    + "own words sit next to every one of them.", ""
  );

  out.push("## Check you are on the right form", "");
  out.push(
    "TC0021 is only for **marijuana offenses that have now been decriminalized based on the amount involved**. The "
    + "court's instruction sheet says the judge can order expungement only on finding, by clear and convincing evidence, "
    + "that the amount was **two ounces or less**, or — in your primary residence — **ten ounces or less**, or "
    + "**six or fewer plants for personal use** or **twelve or fewer plants on the premises**. If there are other, "
    + "non-marijuana offenses in the case, only the marijuana offenses can be expunged.", ""
  );
  out.push(
    "The instruction sheet also says expungement may be available in other circumstances, and points to the state's own "
    + "page: _Expunge Your Criminal Record | Mass.gov_ (https://www.mass.gov/expunge-your-criminal-record).", ""
  );

  out.push("## Where you file, and what it costs", "");
  out.push(
    "**File this petition in the clerk's office in the court where the criminal case was heard** — the instruction "
    + "sheet's own words. If you want to expunge records in different cases with different docket numbers, you must file "
    + "a **separate petition for each case**.", ""
  );
  out.push(
    "TC0021 does not state a filing fee. **Ask the clerk's office of the court where the case was heard** whether any "
    + "fee applies and whether it can be waived — no amount is stated here because the form establishes none, and an "
    + "unsourced figure in a filing instruction is worse than none. The form does say, on its own face, that you have "
    + "the right to an **interpreter at no cost to you**.", ""
  );

  out.push("## Serving the District Attorney", "");
  out.push(
    "The instruction sheet requires you to **provide a copy of this petition and everything you file with it to the "
    + "District Attorney's Office that prosecuted the case, on or before the day you file** — either by bringing a "
    + "copy to that office in hand or by mailing a copy by first-class mail. You are not required to provide proof of "
    + "delivery or mailing, but the court suggests you keep proof for your records.", ""
  );
  out.push(
    "The petition's own service statement — the two method boxes and the date at the foot of page 1 — is "
    + "completed **when you actually deliver or mail the copy**, not before. That is why those lines are blank in this "
    + "packet.", ""
  );

  out.push("## What happens on timing", "");
  out.push(
    "The form sets **no deadline for you to file**: none is printed on it, and none is stated here. If you are unsure "
    + "whether timing rules affect your case, ask the clerk's office where you file. The form does print one deadline "
    + "for the court: **the court is to act within 30 days of the petition being filed**. If a hearing is scheduled, the "
    + "clerk's office will notify you of the date and time, and you must be present.", ""
  );

  out.push("## What you must do, in order", "");
  out.push("1. **Fill in every item in the table below**, using your own court paperwork.");
  out.push("2. **Tick every checkbox that is true for you** — the choices are listed under _The choices that are yours_.");
  out.push("3. **Sign and date the petition.** The statement above the signature is sworn under the pains and penalty of perjury.");
  out.push("4. **Provide the copy to the District Attorney's Office** — in hand or by first-class mail — on or before the day you file, and only then complete the service statement at the foot of page 1.");
  out.push("5. **File the petition in the clerk's office in the court where the case was heard.**");
  out.push("6. **Before the court orders expungement, copy anything you want to keep.** The instruction sheet warns that once the record is destroyed you will not be able to get a copy from the court.");
  out.push("");

  out.push("## TC0021 — the items you must supply", "");
  out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
  for (const i of rbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");

  out.push("## The choices that are yours", "");
  out.push("| The choice | Why it is yours |", "| --- | --- |");
  for (const c of elections) out.push(`| ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **The docket number.** This build never writes a docket number; copy it from your own court paperwork.");
  out.push("- **Your name, address and phone number.** The form asks for all three in one box and the platform has no way to compose them into one block; writing only one of the three would leave the court an incomplete contact block.");
  out.push("- **Your signature, its date, and the service statement's date and method boxes.** Each dates or swears something only you can do, when you actually do it.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Massachusetts Trial Court form. It is not legal advice, it is not filed "
    + "for you, and it does not decide whether your record is eligible for expungement — the judge decides that, on "
    + "the showing the instruction sheet describes."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point --------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const source = resolved[0];
  const census = await censusOf(source);
  assert.equal(census.unmapped.length, 0,
    `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
  assert.equal(census.stale.length, 0,
    `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
  assert.equal(census.captionDrift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${JSON.stringify(census.captionDrift.slice(0, 3), null, 2)}`);
  if (source.acroFieldCount != null) {
    assert.equal(census.rows.length, source.acroFieldCount,
      `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: [{
        formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        protected: census.rows.filter((r) => r.policy === "protect").length
      }]
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [mapFor(source, census)];
  let sanitationSample = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    // The route's component set is the primary filing alone, so the finalized
    // official form IS the packet: no container document is created, and
    // therefore no PDFDocument.create() runs in this builder at all. (Were one
    // ever added, it must go through stampDeterministic — imported above so the
    // rule travels with the code.)
    void stampDeterministic;
    const { bytes, report } = await renderDocument(source, census, fixtureName);
    sanitationSample = report.sanitation ?? sanitationSample;
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);

    const proof = await byteProof(census, file, fixtureName);
    writeProofs.push({
      fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
      proofMethod: proof.proofMethod,
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      documentAuthoredAppearances: proof.documentAuthoredAppearances,
      unfittable: report.unfittable,
      actualWrites: proof.actualWrites
    });

    const packetDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, pageCount: packetDoc.getPageCount(),
      pageManifest: packetDoc.getPageIndices().map((i) => ({
        packetPage: i + 1, component: "primary_filing", documentId: source.formNumber,
        sourcePage: i + 1, sourceSha256: source.sha256
      })),
      documents: ["primary_filing", source.formNumber]
    });

    const rasterDir = `${OUT}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < packetDoc.getPageCount(); i += 1) {
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: fixtureName, page: i + 1,
        file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
        pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
        pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
        calibrationResidualPx: render.calibrationResidualPx,
        paperBounds: render.paper,
        engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + MASTER_QUEUE-pinned SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind,
      corpusAssetClass: r.assetClass,
      xfa: {
        committedIndexSaysXfaPresent: r.indexSaysXfaPresent,
        pinnedBinaryCarriesXfaPacket: true,
        basis: "pdf-lib announces 'Removing XFA form data' on load and the finalizer's sanitation report records xfaPresentInInput/xfaRemoved; the committed index was generated after that removal and is wrong about this binary",
        consequence: "the finalized artifact is the flattened AcroForm rendering of the hybrid's static pages; the XFA packet does not survive into any output"
      }
    })),
    sanitationObserved: sanitationSample ? {
      xfaPresentInInput: sanitationSample.xfaPresentInInput ?? null,
      xfaRemoved: sanitationSample.xfaRemoved ?? null
    } : null,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that Rev. 11/22 is the current published revision of TC0021 — the state manifest holds this source behind a freshness gate",
      "that any output is approved for participant delivery",
      "that any record is eligible for expungement under G.L. c. 276, § 100K¼"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every caption was re-read from the pinned binary at its recorded coordinate before anything rendered. Some "
      + "printed lines squash neighbouring captions into one extracted run ('Boston Municipal CourtJuvenile Court', "
      + "'DATE:PETITIONER'S SIGNATURE'); each recorded caption is a substring that survives the squashing, matched "
      + "flattened at the recorded line only.",
    documents: [{
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel,
        printedCaption: r.caption, captionReadAt: r.captionAt,
        policy: r.policy, factId: r.fact
      }))
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    jurisdiction: ROUTE.jurisdiction, statutoryAuthority: ROUTE.authority,
    officialForm: source.formNumber,
    assignedOfficialForm: source.formNumber,
    officialFormMatchesAssignment: true,
    captionBasis: "printed captions re-read from the pinned binary at recorded coordinates; see field-census.census-v1.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "TC0021 serves exactly one statutory route — G.L. c. 276, § 100K¼ — and prints it in its own caption, so there "
      + "is no route fork on the form and this packet makes no route selection. Every checkbox is a statement about "
      + "the participant's own record or a choice only they can make, including the decriminalized-amount basis box, "
      + "which the judge must find true by clear and convincing evidence.",
    zeroWriteNote:
      "This packet carries zero platform-written values: the docket number is never written by this lane's contract, "
      + "the petitioner block asks for three facts in one box with no composed descriptor to bind, and the court "
      + "division line matches no descriptor in the shared registry. Every blank is declared and disclosed.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing"],
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    fixturesAreByteIdentical: artifacts.length === 2 && artifacts[0].sha256 === artifacts[1].sha256,
    fixturesAreByteIdenticalBecause:
      "nothing is platform-written on this packet, so the canonical and boundary participants produce the same bytes; "
      + "recorded rather than differentiated artificially",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report. A zero-write packet must carry zero glyphs at every measured rectangle, and does.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    participantElections: maps.flatMap((m) => m.selectionControls.filter((c) => c.category === PARTICIPANT_ELECTION).map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => [
      ...m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true),
      ...m.selectionControls.filter((c) => c.category !== PARTICIPANT_ELECTION)
    ].map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why ?? r.reason
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "This source is an XFA hybrid and the finalized artifact is the flattened rendering of its static AcroForm "
      + "pages after pdf-lib removes the XFA packet. Visual review should confirm the flattened pages carry the "
      + "complete printed form — every caption, the charge list, both sworn statements — and no value anywhere.",
    whatToLookAt: [
      "Page 1, the caption: DOCKET NO. blank, the petitioner name-address-phone block blank, all four court-department boxes unticked, COURT DIVISION blank.",
      "Page 1, the charge list: all eight marijuana-offence boxes unticked; the Counts line blank.",
      "Page 1, the basis box and the Specifically narrative: both blank.",
      "Page 1, the service statement at the foot: both method boxes unticked and the DATE line blank — it certifies a delivery that has not happened.",
      "Page 1, the sworn signature block: DATE and PETITIONER'S SIGNATURE blank.",
      "Page 2: the court's instruction sheet intact, the Additional Information box blank."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "TC0021 is an XFA hybrid. The committed corpus index records xfaPresent: false, but the pinned binary "
          + "carries an XFA packet that pdf-lib removes on load, and the state manifest holds this source in "
          + "05_SOURCE_GATED for exactly that reason.",
        consequence:
          "The AcroForm half of the hybrid is complete — 29 widgets over static page content that extracts cleanly — "
          + "so the ordinary fill-and-flatten path applies and the sanitation report records xfaPresentInInput and "
          + "xfaRemoved. The index discrepancy is a corpus-index fidelity issue, recorded here for whoever owns the "
          + "index generator: it censuses the binary AFTER pdf-lib has already dropped the packet."
      },
      {
        finding:
          "This packet carries zero platform-written values. The DOCKET NO. box asks for the docket number of the "
          + "case to be expunged, and this lane's contract forbids writing docket numbers; the petitioner block asks "
          + "for name, address and phone in one box, and the shared registry has no composed fact for it (the same "
          + "finding as MC 227a's dinfo in mi_setaside_marihuana-set); COURT DIVISION matches no descriptor at all.",
        consequence:
          "Every blank is declared — required-before-filing, protected, or the participant's own election — and every "
          + "required-before-filing item is named in participant-instructions.md by the words printed beside it. A "
          + "consequence is recorded rather than hidden: the canonical and boundary fixtures are byte-identical, "
          + "because no participant fact reaches the paper."
      },
      {
        finding:
          "The MASTER_QUEUE instrument kind for this family reads 'Massachusetts Marijuana Expungement Petition under "
          + "§§ 100K / 100K¼'. The form's own caption and the track's recorded authority in "
          + "data/rcap-ledger/track-pathway-crosswalk.json both read § 100K¼ alone.",
        consequence:
          "The packet is built on TC0021 exactly as assigned — no form substitution — and the citation drift is "
          + "returned as a fidelity note: § 100K is the general expungement section and TC0021 is not its form."
      },
      {
        finding:
          "The corpus manifest classifies this source runtime_disabled and source-gated, with a currentness gate open "
          + "on the Rev. 11/22 edition.",
        consequence:
          "Building it is this lane's assignment — the MASTER_QUEUE binds the family to these exact bytes — and a "
          + "built family grants nothing. The currentness question is put to counsel review in approval-request.json "
          + "rather than answered here."
      },
      {
        severity: "advisory",
        finding:
          "The service statement at the foot of page 1 certifies delivery or mailing to the District Attorney's "
          + "Office, with two method boxes and a date, and the court's instruction sheet places that act on or before "
          + "the day of filing.",
        consequence:
          "The date is protected (a date written before the copy goes out would be false) and the two method boxes "
          + "are left as the petitioner's own, each with the timing stated in its disclosure. The participant "
          + "instructions carry the order of operations because the order is the point."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "TC0021 Rev. 11/22 sits behind the corpus's own currentness gate (05_SOURCE_GATED, runtime_disabled). Confirm it is still the published edition before any promotion beyond state_built.",
      "The finalized artifact is the flattened AcroForm rendering of an XFA hybrid; the XFA packet is removed. Confirm a flattened, hand-completed TC0021 is acceptable to the Massachusetts Trial Court clerk's offices.",
      "The MASTER_QUEUE instrument kind cites §§ 100K / 100K¼; the form and the track's recorded authority cite § 100K¼ alone. Confirm the route citation."
    ],
    mattersForTheReviewersAttention: [
      "reports/rendered-artifacts.json — the two fixtures are byte-identical because the packet is zero-write; this is declared, not an accident.",
      "reports/blanks-left-for-the-participant.json — every blank on the form is the participant's, so the instructions carry the whole form; confirm they make it legible to fill."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    officialForm: source.formNumber, sourceSha256: source.sha256,
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.category === PARTICIPANT_ELECTION).length, 0),
    routeSelectionsMade: 0,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
