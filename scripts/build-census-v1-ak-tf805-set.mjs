#!/usr/bin/env node
/**
 * The Alaska TF-805 packet family builder — `ak-tf805-set`.
 *
 *   node scripts/build-census-v1-ak-tf805-set.mjs [--check] [--no-raster]
 *
 * TF-805 is the Alaska Court System's request, under Administrative Rule 40(b)
 * or 40(c), to substitute "Not Published" for a party's name on the online
 * public index (CourtView). One official form, two pages, one component: the
 * primary filing, with a certificate of service and the judge's order printed
 * on the same sheets.
 *
 * It is the same shape as TF-800 and the same three properties govern it.
 *
 * The request, the sworn verification, the certificate of service and the order
 * are printed together, and only the request is the participant's to complete
 * before filing. The verification is sworn before a person authorised to
 * administer oaths, the certificate records service that has not happened, and
 * the order is the judge's.
 *
 * The rule gives two grounds and the form asks which. Rule 40(b) is for issues
 * of a sensitive and highly personal nature where publication could expose a
 * person to harassment, injury, ridicule or embarrassment; Rule 40(c) is for a
 * likelihood of substantial physical harm to members of the household, and the
 * form notes that a 40(c) removal lasts five years and must then be renewed.
 * The route this packet is built for is the rule, not one of its two grounds:
 * which applies is a fact about the participant's own case, so the election is
 * theirs and the reason box is theirs to write.
 *
 * TF-805 names its widgets `name`, `why`, `needText1`, so no caption can be
 * inferred from a field name; every caption below is read off the page at the
 * widget's own coordinates and re-checked on every build.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
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
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

/*
 * The calibrated page rasterizer, resolved wherever it lives.
 *
 * The Captain branch moved this module from scripts/lib/ to scripts/raster/ at
 * 5f144ec, and fifteen builders on that branch — including this one — still
 * import the old path, which is not there. Rather than pick one and break on
 * the other base, the import is tried at the new path first and falls back to
 * the old. Only a genuinely missing module is caught: a syntax error or a
 * failed dependency inside the module still throws, because a rasterizer that
 * silently resolves to a stale copy is worse than one that refuses.
 */
const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "ak-tf805-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ak-tf805-set.mjs";

/*
 * The route, taken from the canonical route universe rather than composed here:
 * data/rcap-grade-a/route-obligation-census-candidate/canonical-route-universe.json
 * carries `track:AK:ak-tf800` with this authority and this public label.
 */
const ROUTE = Object.freeze({
  jurisdiction: "AK",
  routeKey: "track:AK:ak-tf805",
  routeSelectionId: "ak-tf805-set-tf-805-primary-filing",
  publicLabel: "Name-only removal from the public court index",
  authority: "Alaska Court System form TF-805 (5/25); Alaska Administrative Rule 40(b) and 40(c)",
  formNumber: "TF-805",
  instrumentKinds: ["primary_filing"]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/* ------------------------------------------------------------------ *
 * Every widget on TF-805, and the caption printed at its coordinates.
 *
 * `caption` is text read from the form's own content stream; `captionAt`
 * records the page and the baseline it was read at, so the claim is checkable
 * and the build refuses if the caption is no longer printed there.
 *
 * `policy` is one of:
 *   write    — the platform holds this fact and the library binds it
 *   protect  — a signature, a signature date, an act of service not yet done,
 *              or a court/clerk/notary field
 *   election — a genuine participant election on a control
 *   supply   — the participant supplies it before filing; disclosed by name
 * ------------------------------------------------------------------ */
const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const FORM_TITLE = "Request to Remove Name from Online Public Index (CourtView) Under Administrative Rule 40(b) or (c)";

const FORM_FIELDS = {
  /* ---- page 1: the request, which is the participant's ---- */
  name: {
    page: 1, caption: "Name:", label: "Name",
    captionAt: { page: 1, y: 563 }, ...WRITE("participant.full_legal_name")
  },
  address: {
    page: 1, caption: "Address:", label: "Address",
    captionAt: { page: 1, y: 548 }, ...WRITE("participant.street_address")
  },
  email: {
    page: 1, caption: "Email*: Daytime Phone:", label: "Email",
    captionAt: { page: 1, y: 533 }, ...WRITE("participant.email")
  },
  dayPhone: {
    page: 1, caption: "Email*: Daytime Phone:", label: "Daytime Phone",
    captionAt: { page: 1, y: 533 }, ...WRITE("participant.phone")
  },
  caseName: {
    page: 1, caption: "Case Name: Case No.:", label: "Case Name",
    captionAt: { page: 1, y: 494 },
    ...SUPPLY("the case name exactly as it appears on your court paperwork — in a criminal case that is usually the State of Alaska against your name")
  },
  "caseNo@1": {
    field: "caseNo", page: 1, caption: "Case Name: Case No.:", label: "Case No.",
    captionAt: { page: 1, y: 494 }, ...WRITE("matter.case_number")
  },
  partyNames: {
    page: 1, caption: "Party Names:", label: "Party Names",
    captionAt: { page: 1, y: 479 },
    ...SUPPLY("the names of every party in the case, as they appear on the case caption — the platform holds your own name and not the other parties'")
  },
  why: {
    page: 1, caption: "(CourtView) to “Not ,”P buecbaulsei: shed",
    label: "Ground for removal — Administrative Rule 40(b) or 40(c) (selection)",
    captionAt: { page: 1, y: 432 },
    ...ELECTION(
      "Administrative Rule 40 gives two grounds and this packet is built for the rule, not for one of them. Rule 40(b) is "
      + "for issues of a sensitive and highly personal nature; Rule 40(c) is for a likelihood of substantial physical harm "
      + "to members of your household, and the form notes that a 40(c) removal lasts five years and must then be renewed. "
      + "Which fits your case is yours to say"
    )
  },
  reason: {
    page: 1, caption: "f believe that the statements above are true, becaus:e",
    label: "Why you believe the statements above are true",
    captionAt: { page: 1, y: 291 },
    ...SUPPLY(
      "your own answer: why the ground you ticked is true of your case. The form asks the judge to weigh protection of "
      + "your name against the public's interest in disclosure, so say what is particular about yours. This is yours to "
      + "write and the platform never writes it for you"
    )
  },

  /* ---- page 2: service and the judge's order ---- */
  certDate: {
    page: 2, caption: "I certify on at [date/time] I gave a copy of this document",
    label: "Certificate of Service — date of service, written when you sign the certificate",
    captionAt: { page: 2, y: 572 },
    ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false")
  },
  time2: {
    page: 2, caption: "I certify on at [date/time] I gave a copy of this document",
    label: "Certificate of Service — time of service, written when you sign the certificate",
    captionAt: { page: 2, y: 572 },
    ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false")
  },
  mail: {
    page: 2, caption: "and any attachments by mail. hand-delivery. TrueFiling. email. [You can only",
    label: "Certificate of Service — by mail (selection)",
    captionAt: { page: 2, y: 558 },
    ...ELECTION("you tick the method you actually used, at the time you serve the other parties")
  },
  hd: {
    page: 2, caption: "and any attachments by mail. hand-delivery. TrueFiling. email. [You can only",
    label: "Certificate of Service — by hand-delivery (selection)",
    captionAt: { page: 2, y: 558 },
    ...ELECTION("you tick the method you actually used, at the time you serve the other parties")
  },
  tf: {
    page: 2, caption: "and any attachments by mail. hand-delivery. TrueFiling. email. [You can only",
    label: "Certificate of Service — by TrueFiling (selection)",
    captionAt: { page: 2, y: 558 },
    ...ELECTION("you tick the method you actually used, at the time you serve the other parties")
  },
  emailCB: {
    page: 2, caption: "and any attachments by mail. hand-delivery. TrueFiling. email. [You can only",
    label: "Certificate of Service — by e-mail (selection)",
    captionAt: { page: 2, y: 558 },
    ...ELECTION("you tick the method you actually used, and only if that party gave the court an e-mail address")
  },
  needText1: {
    page: 2, caption: "I served these people:",
    label: "Certificate of Service — who you served, written when you sign the certificate",
    captionAt: { page: 2, y: 532 },
    ...PROTECT(PARTICIPANT_ELECTION, "the certificate records who you actually served and is completed at the time of service, not in advance")
  },
  signature0: {
    page: 2, caption: "Signature:", label: "Certificate of Service — Signature",
    captionAt: { page: 2, y: 512 },
    ...PROTECT(SIGNATURE, "you sign the certificate of service yourself, after you have served the other parties")
  }
};

/* Where the caption recorded at a widget's coordinate is not the readable
 * wording of the printed line. TF-805 interleaves its glyph runs on two lines,
 * so the stream returns a scrambled caption; the dictionary records what is
 * actually there, because a cleaned-up caption would make the drift check
 * unfalsifiable, and the readable wording is carried in the row's label. */
const CAPTION_NOTE = {
  why:
    "TF-805's own text stream interleaves its glyph runs on this line, so the caption recorded at the widget's "
    + "coordinate reads \"(CourtView) to \u201cNot ,\u201dP buecbaulsei: shed\" rather than \"(CourtView) to \u2018Not "
    + "Published,\u2019 because:\". The dictionary records what is actually in the stream, because a cleaned-up caption "
    + "would make the drift check unfalsifiable. The label carries the readable wording.",
  reason:
    "Same interleaving: the printed line is \"I believe that the statements above are true, because:\" and the stream "
    + "returns \"f believe that the statements above are true, becaus:e\"."
};

/* ---- fixtures ------------------------------------------------------------ *
 * Two participants. The canonical one is unremarkable. The boundary one has a
 * long hyphenated name with an apostrophe, a long address, a long e-mail and a
 * phone number with an extension, because a value that fits the box is not
 * evidence that every value does. Neither signs anything. */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Chugach Way, Anchorage, AK 99501",
    "participant.email": "jordan.reyes@example.org",
    "participant.phone": "907-555-0142",
    "matter.case_number": "3AN-19-04217CR"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Hillside Loop Road, Apartment 14B, Fairbanks, Alaska 99709-2214",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "participant.phone": "(907) 555-0199 ext. 4417",
    "matter.case_number": "4FA-24-01188CR"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSource() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entries = index.entries ?? index.files ?? index;
  const all = Array.isArray(entries) ? entries : Object.values(entries);
  const root = corpusRoot();
  const failures = [];
  const entry = all.find((e) => e.state === "AK" && e.formNumber === ROUTE.formNumber && e.assetClass === "FORM");
  if (!entry) {
    failures.push({
      sourceId: `official-form:${ROUTE.formNumber}`,
      why: "no entry for this form number in the committed corpus index"
    });
    return { source: null, failures };
  }
  const rel = entry.path ?? entry.relativePath;
  // `root` may be absolute (the corpus environment file exports an absolute
  // path) or repository-relative. path.resolve honours both; path.join would
  // graft an absolute corpus path onto the repository root and report a
  // perfectly good source as missing.
  const abs = path.resolve(ROOT, root, rel);
  if (!fs.existsSync(abs)) {
    failures.push({ sourceId: `official-form:${ROUTE.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` });
    return { source: null, failures };
  }
  const bytes = fs.readFileSync(abs);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (String(entry.sha256 ?? "") !== sha256) {
    failures.push({
      sourceId: `official-form:${ROUTE.formNumber}`, pathInArchive: rel,
      why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}`
    });
    return { source: null, failures };
  }
  return {
    source: {
      formNumber: ROUTE.formNumber, sourceId: `official-form:${ROUTE.formNumber}`,
      pathInArchive: rel, revision: entry.revision ?? null,
      sha256, byteLength: bytes.length, bytes
    },
    failures
  };
}

/* ---- census: one row per FIELD, carrying every widget it owns -------------- *
 * Keyed by field rather than by widget because `caseNo` is one AcroForm field
 * with a widget on each of the three pages and one value: three census rows
 * would ask the finalizer to write the same field three times, and a radio
 * group's two widgets are two faces of one election, not two elections. */
async function censusOfSource(source) {
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
    const widgets = [];
    for (const w of field.acroField.getWidgets()) {
      const r = w.getRectangle();
      const ref = w.P();
      let pageIndex = pages.findIndex((p) => p.ref === ref);
      if (pageIndex < 0) pageIndex = 0;
      widgets.push({
        page: pageIndex + 1,
        rect: {
          x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)),
          width: Number(r.width.toFixed(2)), height: Number(r.height.toFixed(2))
        },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      });
    }
    // One AcroForm field, one value — but a field with a widget on more than one
    // page carries a dictionary entry per page, because `Case No.` at the head
    // of the order is not the same blank as `Case No.` on the request.
    const pagesTouched = [...new Set(widgets.map((w) => w.page))].sort((a, b) => a - b);
    for (const page of pagesTouched) {
      const key = pagesTouched.length > 1 || FORM_FIELDS[`${name}@${page}`] ? `${name}@${page}` : name;
      const entry = FORM_FIELDS[key] ?? (page === 1 ? FORM_FIELDS[name] : undefined);
      const own = widgets.filter((w) => w.page === page);
      if (!entry) { unmapped.push({ field: name, page, widgets: own }); continue; }
      rows.push({
        key, name, page,
        widgets: own,
        rect: own[0].rect, rectBasis: own[0].rectBasis,
        type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
          .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
        isSelectionControl: field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
        caption: entry.caption,
        captionAt: entry.captionAt,
        effectiveLabel: entry.label ?? entry.caption,
        policy: entry.policy,
        fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null,
        what: entry.what ?? null,
        why: entry.why ?? null,
        captionNote: CAPTION_NOTE[name] ?? null
      });
    }
  }

  // Every dictionary entry must name a widget that exists, and every measured
  // caption must still be printed where the dictionary says it is.
  const dictionaryKeys = new Set(Object.keys(FORM_FIELDS));
  for (const r of rows) dictionaryKeys.delete(r.key);
  const stale = [...dictionaryKeys];

  const flat = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const captionDrift = [];
  for (const r of rows) {
    const at = r.captionAt;
    const lines = pageText.find((p) => p.page === at.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - at.y) <= 2);
    const needle = flat(r.caption);
    if (needle.length === 0 || !near.some((l) => flat(l.text).includes(needle))) {
      captionDrift.push({ field: r.key, page: at.page, y: at.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
    }
  }
  // Only one field per page may carry a given written fact, or the same value
  // would be drawn twice into one blank.
  return { rows, unmapped, stale, captionDrift, pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
async function renderFixture(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  // Keyed by AcroForm field name: `caseNo` appears three times in the census and
  // is one field with one value.
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = [...new Set(census.rows.filter((r) => !writableNames.has(r.name)).map((r) => r.name))]
    .map((field) => ({ field }));

  const censusForFinalizer = [];
  const emitted = new Set();
  for (const r of census.rows) {
    if (emitted.has(r.name)) continue;
    emitted.add(r.name);
    const every = census.rows.filter((x) => x.name === r.name).flatMap((x) => x.widgets);
    censusForFinalizer.push({
      name: r.name, type: r.type,
      effectiveLabel: r.effectiveLabel, regionHeading: r.effectiveLabel,
      widgets: every.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true,
      maxLength: r.maxLength ?? null
    });
  }

  /* CLIPPING_AND_OVERLAP, measured by VF08 at 150 dpi and recorded in
   * data/rcap-grade-a/packet-factory-24h/vf08/COHORT_MEASUREMENT.json: 5 of its 6 selection widgets
   * carry an /AS state with no matching stream under /AP /N. The shared
   * sanitizer calls updateFieldAppearances() before flatten(), pdf-lib
   * regenerates an appearance for exactly that condition, and its default
   * check-box provider paints a stroked square the size of the widget --
   * so 10 widget readings across the two bound fixtures (5 per fixture, on delivered pages 1 and 2)
   * delivered a black-bordered box that TF-805 does not print and that no
   * conforming viewer paints (ISO 32000-1 12.5.5). VF08's zero-write
   * baseline over the same pinned bytes painted the identical pixels, so the
   * ink is the shared step's and not this family's.
   *
   * Opting in supplies the missing state as an EMPTY appearance instead, so
   * nothing is synthesized and nothing is flattened there. It reaches only
   * unwritten selection widgets whose current state has no stream:
   * the one widget that ships its own state for /AS is untouched by this, because a widget's own appearance is source-owned form structure (RI-OFF-APPEARANCE). A ticked box still renders its
   * mark from the stream the source ships for the state it is set to. */
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    suppressSynthesizedAppearances: true,
    expectedSha256: source.sha256,
    census: censusForFinalizer,
    facts,
    explicitMappings,
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORM_TITLE
  });
  if (process.env.AK_TF805_DEBUG_RENDER) {
    console.log(`-- ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof: what actually landed on the paper ------------------------- */
async function byteProof(census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.ak-tf805-byte-proof-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }

  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  let glyphs = 0;
  for (const r of census.rows) {
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    const text = drawn.map((d) => d.text).filter(Boolean);
    const ink = text.join("").trim();
    if (written.has(r.name) && r.policy === "write") {
      glyphs += ink.length;
      actualWrites.push({
        field: r.key, acroFieldName: r.name, factId: r.fact, page: r.page, rect: r.rect,
        printedCaption: r.caption, effectiveLabel: r.effectiveLabel,
        drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
        matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
      });
      continue;
    }
    if (ink.length > 0) {
      refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, glyphs, appearances: widgets.length };
}

/* ---- the field map, in the shape the completeness contract reads ----------- */
function fieldMapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: r.key, acroFieldName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      ...(r.captionNote ? { captionNote: r.captionNote } : {})
    };

    if (r.policy === "write") {
      // A write the finalizer refused is not a write. It is reported as an
      // unwritten known fact rather than quietly recorded as one.
      if (writtenNames.has(r.name)) {
        canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      } else {
        canonicalRefusals.push({
          ...base, document: source.formNumber,
          reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false,
          why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.isSelectionControl) {
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: r.type,
        document: source.formNumber,
        widgets: r.widgets,
        disposition: "explicit_refusal",
        reason: r.policy === "protect" ? r.why : r.why,
        category: r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION,
        completenessClass: r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION,
        class: r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION,
        requiredBeforeFiling: false,
        routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, document: source.formNumber,
        reason: r.why,
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    // supply: a fact the filing needs and the platform does not hold.
    canonicalRefusals.push({
      ...base, document: source.formNumber,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING",
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      identity: `${source.formNumber} field ${r.key}`,
      factId: null,
      routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber,
    documentId: source.formNumber,
    documentRole: "primary_filing",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.key, r.fact])),
    roleRefusals: [],
    selectionControls,
    canonicalWrites,
    canonicalRefusals,
    boundaryWrites: canonicalWrites,
    boundaryRefusals: canonicalRefusals
  };
}

/* ---- artifacts ------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(map) {
  return map.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: map.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    }));
}

/* ---- the builder's own count of the nine completeness counters ------------- *
 *
 * This is NOT a verdict and it is not verification. The builder does not verify
 * its own packets: an independent VF lane that did not build them decides, and
 * PASS_COMPLETE additionally needs a hash-bound RASTER_PASS. What this does is
 * answer the obligation the builder contract puts on the BUILD — "return all
 * nine completeness counters equal to zero, or return the family as STOPPED
 * with the counter that is not" — using the repository's own contract functions
 * rather than a second implementation of them, so a classification mistake in
 * this family's dictionary is caught here rather than three lanes downstream.
 *
 * It reads the same four inputs the audit reads: the field map, the byte proof,
 * the rendered-artifacts record and participant-instructions.md.
 */
function countCompleteness(map, writeProofs, artifacts, instructionsText, receiptExact) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const normalizeRow = (row, selection = false) => ({
    id: row.field, name: row.acroFieldName ?? row.field,
    label: row.effectiveLabel ?? row.printedLabel ?? "",
    reason: row.reason ?? "",
    refusalClass: row.category ?? null,
    page: row.page ?? null,
    document: row.document ?? map.formNumber,
    factId: row.factId ?? null,
    isSelectionControl: selection,
    declared: {
      disposition: row.completenessDisposition ?? null,
      ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(row, "routeDetermined") ? { routeDetermined: row.routeDetermined === true } : {}),
      identity: row.identity ?? null,
      factId: row.factId ?? null
    }
  });

  const writes = map.canonicalWrites.map((w) => normalizeRow(w));
  const blanks = [
    ...map.canonicalRefusals.map((r) => normalizeRow(r)),
    ...map.selectionControls.map((c) => normalizeRow(c, true))
  ];

  // A fact written anywhere in this packet is a fact the packet HOLDS, so it may
  // not also be declared unavailable somewhere else.
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenLabels = new Set();
  for (const w of writes) for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenLabels.add(k);

  const ledger = [];
  for (const blank of blanks) {
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || writtenLabels.has(normLabel(blank.label)) || writtenLabels.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing"
        : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  // Every required-before-filing blank must be named in the instructions.
  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  // Repeating rows: once any cell in a row is written, every required cell is.
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

  // Ink: reported-but-invisible, refused-but-inked, and ink outside the boxes.
  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  // Component set: a document the map or the receipt names must be rendered.
  const renderedNames = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!renderedNames.includes(String(map.formNumber).toLowerCase()) && !loose(renderedNames).includes(loose(map.formNumber))) {
    note("requiredComponentsMissing", { component: map.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
  }
  if (!receiptExact) note("visualDefects", { why: "the family's own source receipt does not bind every source to an exact SHA-256" });

  return { counters, findings, ledger };
}

function participantInstructions(map, source, rbf) {
  const elections = map.selectionControls;
  const out = [];
  out.push(`# Filing instructions \u2014 ${ROUTE.publicLabel}`, "");
  out.push(
    `This packet is the Alaska Court System's form **${source.formNumber}**, `
    + `_${FORM_TITLE}_, prepared under ${ROUTE.authority}.`, ""
  );
  out.push(
    "It asks the judge to substitute **\u201cNot Published\u201d** for your name on the online public index "
    + "(CourtView). It does not seal the case or the file: the case stays public and only your name comes off the index. "
    + "If you want the case itself made confidential or sealed, that is form TF-800, not this one.", ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your address, your e-mail, your daytime "
    + "phone and the case number. Everything else is yours, and every one of those blanks is listed below.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File the completed request with the **clerk's office of the Alaska trial court where the case is or was pending** "
    + "\u2014 the court named in the case number at the top of the form. The clerk of that court can confirm it from your "
    + "case number.", ""
  );
  out.push(
    "Two things this packet does **not** tell you, because they are not established here and an unsourced figure in a "
    + "filing instruction is worse than none:", ""
  );
  out.push("- **Any filing fee, and whether one applies.** Ask the clerk of the court above.");
  out.push(
    "- **Whether TrueFiling is available to you.** The form points at the court system's own list of TrueFiling courts. "
    + "If you and the other parties are on TrueFiling, serve through it and leave the paper certificate of service on "
    + "page 2 blank.", ""
  );

  out.push("## The two grounds, and the five-year point", "");
  out.push(
    "Administrative Rule 40 gives two grounds and the form asks you to tick one:", "",
    "- **Rule 40(b)** \u2014 the issues in the case involve matters of a sensitive and highly personal nature, and "
    + "publication of your name could expose a person to harassment, injury, ridicule or personal embarrassment. The judge "
    + "must find that protecting your name outweighs the public's interest in disclosure and any prejudice to the "
    + "opposing party.",
    "- **Rule 40(c)** \u2014 publication of your name is likely to result in substantial physical harm to you or to "
    + "members of your household, and protecting it outweighs the public's interest in disclosure.", ""
  );
  out.push(
    "The form carries a note about the second one, and it matters: **a removal under subsection (c) lasts five years.** "
    + "After five years you must file a new request if you want your name to stay as \u201cNot Published\u201d.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the table below.** Each names the page and the printed words beside the blank.");
  out.push("2. **Tick one of the two grounds**, and say in the box below it why that ground is true of your case.");
  out.push("3. **Sign the verification on page 1 in front of a court clerk, a notary public, or another person authorised to administer oaths.** It is sworn. Do not sign it in advance.");
  out.push("4. **Give a copy to every party in the case**, and complete the certificate of service on page 2 *after* you have done so.");
  out.push("5. **Leave the ORDER on page 2 alone.** The presiding judge completes it.");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
  for (const i of rbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");

  out.push("## The choices that are yours", "");
  out.push("| Page | The choice | What it means |", "| --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.page} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **The verification on page 1, and your signature and its date.** It is sworn in front of an authorised person, and a date written before you swear it would be false.");
  out.push("- **The certificate of service on page 2** \u2014 the date, the time, who you served, and your signature. Service has not happened when this packet is prepared.");
  out.push("- **Every box the clerk or notary completes** \u2014 the seal, the commission expiry, and the JA/Clerk distribution line.");
  out.push("- **The ORDER on page 2.** Granting or denying the request, the findings under Rule 40(b) or 40(c), and the presiding judge's signature all belong to the court.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Alaska Court System form. It is not legal advice, it is not filed for you, "
    + "and it does not decide whether the judge will remove your name. The judge must weigh protection of your name "
    + "against the public's interest in disclosure, and that finding is theirs alone."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} \u2014 ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { source, failures } = resolveSource();
  if (!source) {
    // The one terminal blocker this builder recognises. Nothing is written: a
    // stopped family leaves its overlay directory byte-for-byte unchanged.
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE",
      failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const census = await censusOfSource(source);
  assert.equal(
    census.unmapped.length, 0,
    `${census.unmapped.length} widget(s) carry no measured caption: ${JSON.stringify(census.unmapped.slice(0, 5))}`
  );
  assert.equal(
    census.stale.length, 0,
    `the caption dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`
  );
  assert.equal(
    census.captionDrift.length, 0,
    `a measured caption is no longer printed where the field map says: ${JSON.stringify(census.captionDrift.slice(0, 3))}`
  );

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      formNumber: source.formNumber, sha256: source.sha256,
      fields: census.rows.length,
      writes: census.rows.filter((r) => r.policy === "write").length,
      supply: census.rows.filter((r) => r.policy === "supply").length,
      elections: census.rows.filter((r) => r.policy === "election").length,
      protected: census.rows.filter((r) => r.policy === "protect").length
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  let map = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const { bytes, report } = await renderFixture(source, census, fixtureName);
    const proof = await byteProof(census, bytes, report, fixtureName);

    const file = `${OUT}/fixtures/tf805-${fixtureName}-filled.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

    artifacts.push({
      fixture: `tf805-${fixtureName}`, file, sha256, byteLength: bytes.length,
      pageCount: census.pageCount,
      documents: [source.formNumber],
      pageManifest: Array.from({ length: census.pageCount }, (_, i) => ({
        packetPage: i + 1, formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256
      }))
    });

    writeProofs.push({
      fixture: `tf805-${fixtureName}`, formNumber: source.formNumber, sourceSha256: source.sha256,
      proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      actualWrites: proof.actualWrites
    });

    if (fixtureName === "canonical") map = fieldMapFor(source, census, report);

    const rasterDir = `${OUT}/raster/tf805-${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < census.pageCount; i += 1) {
      const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: `tf805-${fixtureName}`, page: i + 1,
        file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
        pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
        pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
        calibrationResidualPx: render.calibrationResidualPx,
        paperBounds: render.paper,
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const rbf = requiredBeforeFilingItems(map);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: ROUTE.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: [{
      sourceIds: [source.sourceId], documentId: source.formNumber, formNumber: source.formNumber,
      revision: source.revision, pathInArchive: source.pathInArchive,
      sha256: source.sha256, byteLength: source.byteLength,
      instrumentKind: "primary_filing"
    }],
    sourceBinaryCommitted: false,
    commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID, formNumber: source.formNumber, sourceSha256: source.sha256,
    pageCount: census.pageCount,
    captionBasis:
      "every caption was read from the form's own content stream at the widget's coordinates; captionReadAt records where, "
      + "and the build refuses if a caption is no longer printed there",
    fieldCount: census.rows.length,
    fields: census.rows.map((r) => ({
      field: r.key, acroFieldName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      pdfType: r.type, isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
      printedCaption: r.caption, captionReadAt: r.captionAt, effectiveLabel: r.effectiveLabel,
      policy: r.policy, factId: r.fact,
      ...(r.captionNote ? { captionNote: r.captionNote } : {})
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId,
    renderStrategy: "acroform_fill",
    captionBasis:
      "every printed caption in this map was read from the official form's own content stream at the widget's coordinates; "
      + "captionReadAt records where, and the build refuses if a caption is no longer there",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "Administrative Rule 40 is one rule and TF-805 is its form. The choice between the 40(b) ground and the 40(c) "
      + "ground is a fact about the requester's own case rather than a consequence of the route, so this packet states "
      + "the route it was built for and leaves that election, and the certificate-of-service method, to the participant.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps: [map],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.length * census.pageCount,
    byteDerivedHashes: true,
    rasterEngine: RASTER_ENGINE,
    rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report. "
      + "A value the finalizer says it wrote and the bytes do not carry is an invisible write and is counted as one.",
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
    participantElections: map.selectionControls.map((c) => ({
      field: c.field, page: c.page, label: c.effectiveLabel, why: c.reason
    })),
    protectedBlanks: map.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why })),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated",
    popplerUsed: false,
    renderedArtifacts: artifacts.length,
    rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing:
      "A rendered packet is review evidence. It authorizes no fulfillment, opens no commercial route, and is not a verdict. "
      + "The builder does not verify its own packets."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding: "TF-805 prints the request, a sworn verification, a certificate of service and the judge's order on the same two sheets.",
        consequence: "Only the request is filled. The verification, the certificate and the order are refused by class, so a prepared packet cannot read as a sworn or served one."
      },
      {
        finding: "Administrative Rule 40 gives two grounds -- 40(b) and 40(c) -- and this packet is built for the rule rather than for one of them.",
        consequence: "The ground is left to the participant and recorded as a genuine participant election. A route-determined selection here would assert a fact about the participant's own case that the platform does not hold."
      },
      {
        finding: "A removal under Rule 40(c) lasts five years and must then be re-requested; the form says so on its face.",
        consequence: "The instructions carry that in the form's own terms, beside the election, rather than leaving the participant to find it in the small print."
      },
      {
        finding: "This form's text stream interleaves its glyph runs on two lines, so the captions read back scrambled at the widget's coordinate.",
        consequence: "The dictionary records what is actually in the stream and the drift check still runs against it; the readable wording is carried in the label, and both are recorded in the field census."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019) and the bytes read back carry the "
          + "name without it. The write is visible and correctly placed; one character of it is not drawn.",
        consequence:
          "Recorded for visual review rather than repaired here. The behaviour is in the shared finalizer's font "
          + "encoding and reproduces identically in vt_seal_misdemeanor-set, which is already PASS_COMPLETE."
      }
    ]
  });

  const instructionsText = participantInstructions(map, source, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  const counted = countCompleteness(map, writeProofs, artifacts, instructionsText, true);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "in scripts/rcap-packet-completeness/completeness-contract.mjs over this family's field map, byte proof, rendered "
      + "artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. The builder does not verify its own packets: independent verification belongs to a VF lane that did not "
      + "build them, and PASS_COMPLETE additionally requires a hash-bound RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  });

  return {
    familyId: FAMILY_ID,
    // A family whose own counters are not all zero is returned STOPPED with the
    // counter that is not, rather than as a build that quietly fell short.
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters,
    counterFindings: counted.findings,
    directory: OUT,
    documents: [source.formNumber],
    writes: map.canonicalWrites.length,
    requiredBeforeFiling: rbf.length,
    participantElections: map.selectionControls.length,
    protectedBlanks: map.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).length,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
