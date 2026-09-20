#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `ne-seal-pre2017-set`.
 *
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-ne-seal-pre2017-set.mjs
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-ne-seal-pre2017-set.mjs --check
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-ne-seal-pre2017-set.mjs --negative-control
 *
 * Nebraska motion to seal a pre-2017 dismissal or acquittal, Neb. Rev. Stat.
 * s 29-3523(6), route `obligation:track-only:NE:ne-seal-pre2017`.
 *
 * WHICH FORM IS PRIMARY, AND WHY BOTH ARE DELIVERED
 *
 * NE.memo.json track `ne-seal-pre2017` names five components and settles the
 * primary/alternate question itself, in its own unresolvedQuestions entry:
 * "CC 6:12 is built as primary because that is what the judiciary directs and
 * what clerks will expect, with CC 6:15.1 held as a conditional alternate."
 * That is the record's decision, not this build's, and the same entry records
 * `impact: release_blocker` because it still needs a clerk-level answer. Both
 * forms are therefore rendered, in the registry's own order, and the open
 * question is surfaced by name rather than resolved here.
 *
 * TWO ELECTIONS, ON TWO DIFFERENT FORMS, AND NEITHER IS DECIDED BY THE ROUTE
 *
 *   CC 6:12 paragraph 2  a four-way select-one over the DISPOSITION.
 *   CC 6:15.1 paragraph   a five-way select-one over the qualifying DISMISSAL
 *                         REASON in s 29-3523(3)(c), with the drug-court line
 *                         carrying two inline sub-options.
 *
 * The route reaches two of CC 6:12's four options and none of the other two:
 * the memo's eligibleDispositions are exactly ["dismissed", "acquitted"], and
 * its exclusions read "Convictions, which this subsection does not reach." The
 * pardoned-conviction and sex-trafficking-set-aside options belong to the
 * `ne-seal-pardoned` and `ne-trafficking-setaside-and-seal` tracks. Those two
 * are declared outside this route, by name.
 *
 * WHICH of the reachable options applies is a case fact, not a route fact. The
 * memo makes that explicit: spDispositionType ("Was the case dismissed, or were
 * you acquitted?") and spDismissalReason are both `required` participant
 * inputs. So the packet is built per declared disposition and per declared
 * dismissal reason, three variants in all, and each variant elects the same
 * boxes on its canonical and its boundary fixture so the pair stays comparable.
 *
 * THE CAPTION IS NOT PRINTED BY THE FORM. IT IS A FIELD VALUE.
 *
 * Both motions leave "IN THE ______ COURT OF ______ COUNTY, NEBRASKA" entirely
 * to four AcroForm fields. Flattening the blank binary delivers a motion with
 * no court and no county on it. The two dropdowns are the input and the two
 * read-only text fields are the printed output, wired by the source's own
 * calculation script, asserted here verbatim:
 *
 *     event.value = this.getField("TYPEOFCOURTDROPDOWN").value;
 *     event.value = this.getField("DROPDOWNCOUNTY2").value;
 *
 * No JavaScript is executed. The option's own export value is copied to the
 * printable companion, which is exactly what the source script would do.
 *
 * pdf-lib's flatten() STAMPS WIDGETS THE SOURCE SAYS NEVER PRINT.
 *
 * PDFForm.flatten() draws every widget's appearance onto the page and consults
 * no annotation flag. Both dropdowns carry /F absent, i.e. flags 0, which does
 * not set the Print bit: the source states these controls never appear on
 * paper. Flattening them anyway stamps a screen control onto a filed motion --
 * ink the official form does not print. They are detached before flattening
 * instead. `negativeControls()` re-runs the same bytes through the pre-repair
 * flatten and asserts that the stray ink appears, so the repair is pinned by a
 * control that fires.
 *
 * The two hint fields are the opposite case and are left exactly as the source
 * wrote them: /F 36 is Print plus NoView, so "(Enter the type of court)" is
 * hidden on screen and printed on paper. That is the form's own text.
 *
 * NINE COUNTERS ARE MEASURED FROM THE DELIVERED BYTES
 *
 * proveDeliveredInk reopens each finished packet, walks its content streams
 * recursing through the Form XObjects flattening leaves behind, and asks two
 * questions per WIDGET -- not per field, because CC 6:15.1's Text1 prints the
 * defendant's name in two places: is there ink inside this widget's rectangle
 * that the blank form does not already print, and does a written value read
 * back complete. Nothing is copied from the finalizer's own report.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { extractTextItems, extractPageGeometry } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const {
  PDFDocument, PDFCheckBox, PDFTextField, PDFDropdown, PDFName, PDFRef, PDFString, StandardFonts, decodePDFRawStream
} = require("pdf-lib");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");

const FAMILY_ID = "ne-seal-pre2017-set";
const TRACK_ID = "ne-seal-pre2017";
const PACKET_SET_ID = "ne-seal-pre2017-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill";
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const MEMO_PATH = "data/record-clearing/legal-design-intake/NE.memo.json";
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/* The three bound binaries, in the registry's own component order. */
const SOURCES = [
  {
    documentId: "CC-6-12",
    sourceId: "official-form:CC-6-12",
    componentId: "ne-seal-pre2017-primary-filing-1",
    path: "STATES/NE/02_PACKET_FORMS/NE__FORM__CC-6-12__motion-to-seal-an__REV-2024-04__EN.pdf",
    sha256: "68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28",
    componentKinds: ["primary_filing"],
    printedTitle: "CC 6:12, Motion to Seal an Adult Criminal Record, Rev. 04/2024"
  },
  {
    documentId: "CC-6-15.1",
    sourceId: "official-form:CC-6-15.1",
    componentId: "ne-seal-pre2017-alternate-primary-filing-2",
    path: "STATES/NE/02_PACKET_FORMS/NE__FORM__CC-6-15.1__motion-to-seal-record__REV-2021-05__EN.pdf",
    sha256: "d1fb1340b1ef42bab9da89f9ed6bc8d669057158065bd6bfcb37e762777a6b79",
    componentKinds: ["alternate_primary_filing"],
    printedTitle: "CC 6:15.1, Motion to Seal Records due to Acquittal or Dismissal, New 05/2021"
  },
  {
    documentId: "CC-6-12a",
    sourceId: "official-form:CC-6-12a",
    componentId: "ne-seal-pre2017-instructions-3",
    path: "STATES/NE/03_INSTRUCTIONS/NE__INSTRUCTIONS__CC-6-12__completing-the-motion-to__REV-2024-06__EN.pdf",
    sha256: "b76a0931b781a97de38d17d5856996de307e8c3fb9a67fb48e5679bd232da26a",
    componentKinds: ["instructions"],
    printedTitle: "CC 6:12a, Completing the Motion to Seal an Adult Criminal Record, Rev. 06/2024"
  }
];

/*
 * The two components the registry names that no bound binary answers. Both are
 * surfaced by name rather than invented; see writeGuides and the build summary.
 */
const UNRENDERED_COMPONENTS = [
  {
    componentId: "ne-seal-pre2017-fee-waiver-4",
    role: "fee_waiver",
    requirement: "conditional",
    why:
      "The registry gives this component outputStrategy custom_pleading and no officialFormId, and NE.memo.json records "
      + "the reason as an open release blocker: DC 6:7.1's case-type box offers only Civil, Name change and Emancipation "
      + "while this motion is filed in the existing criminal case, and there is no county-court in forma pauperis "
      + "application form at all. Whether the branch should generate a custom affidavit under Neb. Rev. Stat. "
      + "ss 25-2301 to 25-2310 is a counsel question the memo asks and does not answer. This build does not draft an "
      + "affidavit to answer it."
  },
  {
    componentId: "ne-seal-pre2017-hearing-instructions-5",
    role: "hearing_instructions",
    requirement: "required",
    why:
      "The registry gives this component outputStrategy process_guidance and no officialFormId. It is guidance rather "
      + "than a filed document, so it is delivered as written guidance in participant-instructions.md, quoting the "
      + "record's own hearing script, rather than as a PDF component."
  }
];

/*
 * The three route variants. Each names the boxes it elects on each form, and
 * each is held constant across its canonical and boundary fixture so the pair
 * stays comparable. The printed captions are read off the two binaries.
 */
const VARIANTS = {
  "dismissed-prosecutor-motion": {
    variantId: "dismissed-prosecutor-motion",
    dispositionType: "dismissed",
    cc612Box: "Check Box1",
    cc612PrintedGround: "Were dismissed;",
    cc6151Boxes: ["Check Box1"],
    cc6151PrintedGround: "on the motion of the prosecuting attorney;",
    dismissalReason: "on the motion of the prosecuting attorney",
    variantLabel: "Dismissed on the motion of the prosecuting attorney",
    routeSummary:
      "Motion to seal a pre-2017 dismissal under Neb. Rev. Stat. § 29-3523(6), where the case was dismissed on the "
      + "motion of the prosecuting attorney. Elected at CC 6:12 paragraph 2 option 1 and CC 6:15.1 option 1."
  },
  "dismissed-problem-solving-court": {
    variantId: "dismissed-problem-solving-court",
    dispositionType: "dismissed",
    cc612Box: "Check Box1",
    cc612PrintedGround: "Were dismissed;",
    cc6151Boxes: ["Check Box5", "Check Box7"],
    cc6151PrintedGround: "after completion of a program prescribed by a problem solving court.",
    dismissalReason: "after completion of a program prescribed by a problem solving court",
    variantLabel: "Dismissed after completing a problem-solving-court programme",
    routeSummary:
      "Motion to seal a pre-2017 dismissal under Neb. Rev. Stat. § 29-3523(6), where the case was dismissed after the "
      + "participant completed a programme prescribed by a problem solving court. Elected at CC 6:12 paragraph 2 "
      + "option 1 and CC 6:15.1 option 5 with the problem-solving-court sub-option."
  },
  acquitted: {
    variantId: "acquitted",
    dispositionType: "acquitted",
    cc612Box: "Check Box2",
    cc612PrintedGround: "Resulted in an acquittal;",
    cc6151Boxes: ["Check Box3"],
    cc6151PrintedGround: "after acquittal;",
    dismissalReason: "after acquittal",
    variantLabel: "Acquitted",
    routeSummary:
      "Motion to seal a pre-2017 acquittal under Neb. Rev. Stat. § 29-3523(6). Elected at CC 6:12 paragraph 2 option 2 "
      + "and CC 6:15.1 option 3."
  }
};

/*
 * The two CC 6:12 paragraph-2 options this route does not reach at all. Named
 * so each is refused deliberately and by name, with the memo sentence that puts
 * it outside the route, instead of falling into the generic bucket beside the
 * two options the case genuinely chooses between.
 */
const OFF_ROUTE_CC612_OPTIONS = {
  "Check Box3": {
    printedGround: "Resulted in a conviction that was later pardoned; or",
    otherTrack: "ne-seal-pardoned",
    routeCondition:
      "NE.memo.json track ne-seal-pre2017 states eligibleDispositions [\"dismissed\", \"acquitted\"] and lists among its "
      + "exclusions \"Convictions, which this subsection does not reach.\" A pardoned conviction is a conviction, and it "
      + "belongs to the separate track ne-seal-pardoned. Neb. Rev. Stat. § 29-3523(6) is the subsection this packet is "
      + "built for and it does not reach it."
  },
  "Check Box4": {
    printedGround:
      "Resulted in a conviction that was later set aside because I was a victim of sex trafficking.",
    otherTrack: "ne-trafficking-setaside-and-seal",
    routeCondition:
      "NE.memo.json track ne-seal-pre2017 states eligibleDispositions [\"dismissed\", \"acquitted\"] and lists among its "
      + "exclusions \"Convictions, which this subsection does not reach.\" A conviction set aside because the "
      + "participant was a victim of sex trafficking is a conviction, and it belongs to the separate track "
      + "ne-trafficking-setaside-and-seal. Neb. Rev. Stat. § 29-3523(6) does not reach it."
  }
};

/* The printed caption beside every CC 6:15.1 option, read off the binary. */
const CC6151_OPTION_CAPTIONS = {
  "Check Box1": "on the motion of the prosecuting attorney;",
  "Check Box2": "as a result of a hearing that is not the subject of a pending appeal;",
  "Check Box3": "after acquittal;",
  "Check Box4": "after a deferred judgment; or",
  // CC 6:15.1 prints one sentence across three controls: the line's own bullet,
  // then the two inline sub-options it ends in. Each caption is the words the
  // form actually prints beside that box, so quoting them in order reassembles
  // the printed sentence rather than paraphrasing it.
  "Check Box5": "after completion of a program prescribed by a",
  "Check Box6": "drug court",
  "Check Box7": "problem solving court."
};

const CC612_OPTION_CAPTIONS = {
  "Check Box1": "Were dismissed;",
  "Check Box2": "Resulted in an acquittal;",
  "Check Box3": "Resulted in a conviction that was later pardoned; or",
  "Check Box4": "Resulted in a conviction that was later set aside because I was a victim of sex trafficking."
};

/*
 * The caption wiring on both motions: which dropdown feeds which printable
 * field, and which held fact chooses the option. The source's own calculation
 * script is asserted against these names before any value is copied.
 */
const CAPTION_BINDINGS = [
  {
    choiceField: "TYPEOFCOURTDROPDOWN",
    displayField: "TYPEOFCOURTRESULTS",
    factId: "matter.court_level",
    fixtureKey: "courtType",
    label: "Court level, printed in the motion's caption"
  },
  {
    choiceField: "DROPDOWNCOUNTY2",
    displayField: "fullcountystatementRIGHT",
    factId: "matter.filing_county",
    fixtureKey: "county",
    label: "Filing county, printed in the motion's caption"
  }
];

/*
 * The form's own printed guidance, authored read-only with /F 36 -- Print set,
 * NoView set. It is hidden on screen and printed on paper, and it carries the
 * form's words, not a participant fact. Left exactly as the source wrote it.
 */
const SOURCE_PRINTED_GUIDANCE = {
  "enter the type of court": "(Enter the type of court)",
  "enter the county": "(Enter the county name)"
};

/*
 * The printed caption of every blank this build reasons about, read off the two
 * binaries. A participant told to complete "Text4" has not been told anything.
 */
const PRINTED_LABELS = {
  "CC-6-12:Case No": "Case No. (CC 6:12 caption, page 1)",
  "CC-6-12:Adult name": "Your full name, as the defendant named in the caption (CC 6:12 page 1)",
  "CC-6-12:Text3": "Crime(s) Charged, first printed line (CC 6:12 paragraph 1, page 1)",
  "CC-6-12:Text4": "Crime(s) Charged, second printed line (CC 6:12 paragraph 1, page 1)",
  "CC-6-12:Text5": "Date of charge(s) (CC 6:12 paragraph 1, page 1)",
  "CC-6-12:datesigned": "Date beside your signature (CC 6:12 page 2)",
  "CC-6-12:printedname": "Printed Name (CC 6:12 page 2)",
  "CC-6-12:streetaddress": "Street Address/P.O. Box (CC 6:12 page 2)",
  "CC-6-12:citystatezip": "City/State/ZIP Code (CC 6:12 page 2)",
  "CC-6-12:telephone number": "Telephone Number (CC 6:12 page 2)",
  "CC-6-12:emailaddress": "Email address (CC 6:12 page 2)",
  "CC-6-12:noemailreason": "The reason I cannot receive email is, first printed line (CC 6:12 page 2)",
  "CC-6-12:noemailreason2": "The reason I cannot receive email is, second printed line (CC 6:12 page 2)",
  "CC-6-15.1:Text2": "Case No. (CC 6:15.1 caption)",
  "CC-6-15.1:Text1": "Your full name, printed in the caption and again in the sentence \"I, ____ am the defendant in this case\" (CC 6:15.1)",
  "CC-6-15.1:printedname": "Printed Name (CC 6:15.1, party contact block)",
  "CC-6-15.1:streetaddress": "Street Address/P.O. Box (CC 6:15.1, party contact block)",
  "CC-6-15.1:citystatezip": "City/State/ZIP Code (CC 6:15.1, party contact block)",
  "CC-6-15.1:telephone number": "Telephone Number (CC 6:15.1, party contact block)",
  "CC-6-15.1:emailaddress": "Email address (CC 6:15.1, party contact block)",
  "CC-6-15.1:datesigned": "Date beside your signature (CC 6:15.1, party contact block)"
};

/*
 * The two review fixtures. Each is a whole synthetic case, not a value sampler:
 * the disposition date decides eligibility on this route, so canonical sits
 * well inside the pre-2017 window and boundary sits on its last qualifying day.
 *
 * The charge text is chosen to occupy BOTH of CC 6:12's printed continuation
 * lines on purpose. The form prints two ruled lines for one value, and a build
 * whose fixture only ever fills the first would never exercise the second and
 * would leave an unclassified half-row on the paper. assertRepairInvariants
 * fails the build if a continuation line stops carrying ink, so shortening a
 * fixture cannot silently reintroduce that.
 */
const FIXTURES = {
  canonical: {
    fixtureClass: "canonical",
    full: "Marcus Deshawn Whitfield",
    street: "3417 South 42nd Street",
    cityStateZip: "Omaha, NE 68105",
    phone: "402-555-0148",
    email: "marcus.whitfield@example.org",
    caseNumber: "CR 14-1187",
    county: "DOUGLAS",
    courtType: "COUNTY",
    charges:
      "Count I: Theft by Unlawful Taking, $500 or less, Neb. Rev. Stat. 28-511(1), a Class II misdemeanor; "
      + "Count II: Criminal Mischief, 28-519(4)",
    chargeDate: "March 3, 2014",
    dispositionDate: "August 12, 2014"
  },
  boundary: {
    fixtureClass: "boundary",
    full: "Alexandria Kathleen Delgado-Fitzgerald",
    street: "12088 West Old Cheney Road Apartment 3271",
    cityStateZip: "Lincoln, NE 68512-4417",
    phone: "531-555-0199",
    email: "alexandria.delgado.fitzgerald@example.org",
    caseNumber: "CR 16-000001-99",
    county: "LANCASTER",
    courtType: "DISTRICT",
    charges:
      "Count I: Possession of a Controlled Substance (methamphetamine), Neb. Rev. Stat. 28-416(3), a Class IV "
      + "felony; Count II: Possession of Drug Paraphernalia, 28-441",
    chargeDate: "June 8, 2016",
    dispositionDate: "December 31, 2016"
  }
};

// ---- sources -----------------------------------------------------------------------

function resolveSources() {
  const index = readJson(INDEX_PATH);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    assert.equal(entry.sha256, source.sha256, `committed index pins a different digest for ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length, custody: entry.custody };
  });
}

// ---- pdf primitives ----------------------------------------------------------------

function widgetPage(widget, pages) {
  const parent = widget.dict.get(PDFName.of("P"));
  if (parent) {
    const index = pages.findIndex((page) => page.ref.toString() === parent.toString());
    if (index >= 0) return index + 1;
  }
  const byAnnots = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref.toString() === widget.ref?.toString()));
  return byAnnots < 0 ? 1 : byAnnots + 1;
}

const annotationFlagsOf = (field) =>
  field.acroField.getWidgets().map((widget) => widget.dict.get(PDFName.of("F"))?.asNumber?.() ?? 0);

/** Whether the SOURCE says this control ever reaches paper. /F bit 3 is Print. */
const printsOnPaper = (field) => annotationFlagsOf(field).some((flags) => (flags & 4) === 4);

/**
 * Writes the WHOLE value or refuses it. The value is never sliced to /MaxLen
 * and never ellipsized: a fact on a motion filed with a court is complete, or
 * it is named as owed carrying the value it could not print and the measurement
 * that says why.
 */
function setComplete(field, value, font) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && value.length > max && typeof field.removeMaxLength === "function") field.removeMaxLength();
  const rectangles = field.acroField.getWidgets().map((widget) => widget.getRectangle());
  const available = rectangles.length ? Math.min(...rectangles.map((rect) => Math.max(1, rect.width - 4))) : 100;
  const height = rectangles.length ? Math.min(...rectangles.map((rect) => rect.height)) : 12;
  let size = 9;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(value, size) > available) {
    return {
      refused: true,
      heldValue: value,
      measurement: {
        declaredMaxLength: max ?? null,
        drawableWidthPt: Number(available.toFixed(2)),
        widgetHeightPt: Number(height.toFixed(2)),
        widthNeededAtFloorPt: Number(font.widthOfTextAtSize(value, 5.5).toFixed(2)),
        floorFontSizePt: 5.5
      }
    };
  }
  field.setFontSize(size);
  field.setText(value);
  assert.equal(field.getText(), value, `complete value did not survive in ${field.getName()}`);
  return { drawnText: value, fontSize: size };
}

/**
 * One value across the continuation lines the form prints for it.
 *
 * CC 6:12 gives "Crime(s) Charged" two ruled lines and one value. The value is
 * word-wrapped across them at a single shared font size, and the WHOLE value
 * must land: if the words do not fit in the lines the form provides, nothing is
 * drawn and the refusal carries the held value and the measurement. A charge
 * description cut short on a motion is a different charge.
 */
function setCompleteAcrossLines(fields, value, font) {
  const widths = fields.map((field) => {
    const rects = field.acroField.getWidgets().map((widget) => widget.getRectangle());
    return Math.max(1, Math.min(...rects.map((rect) => rect.width)) - 4);
  });
  const words = value.split(/\s+/).filter(Boolean);

  const layoutAt = (size) => {
    const lines = [];
    let cursor = 0;
    for (const width of widths) {
      if (cursor >= words.length) { lines.push(""); continue; }
      let line = words[cursor];
      if (font.widthOfTextAtSize(line, size) > width) return null;
      cursor += 1;
      while (cursor < words.length && font.widthOfTextAtSize(`${line} ${words[cursor]}`, size) <= width) {
        line = `${line} ${words[cursor]}`;
        cursor += 1;
      }
      lines.push(line);
    }
    return cursor >= words.length ? lines : null;
  };

  let size = 9;
  let lines = layoutAt(size);
  while (!lines && size > 5.5) { size -= 0.25; lines = layoutAt(size); }
  if (!lines) {
    return {
      refused: true,
      heldValue: value,
      measurement: {
        printedLines: fields.length,
        drawableWidthsPt: widths.map((width) => Number(width.toFixed(2))),
        widthNeededAtFloorPt: Number(font.widthOfTextAtSize(value, 5.5).toFixed(2)),
        floorFontSizePt: 5.5
      }
    };
  }
  const drawn = [];
  for (const [index, field] of fields.entries()) {
    field.setFontSize(size);
    field.setText(lines[index]);
    assert.equal(field.getText(), lines[index], `wrapped line did not survive in ${field.getName()}`);
    drawn.push({ field, text: lines[index], fontSize: size });
  }
  assert.equal(drawn.map((row) => row.text).join(" ").replace(/\s+/g, " ").trim(), value.replace(/\s+/g, " ").trim(),
    "the wrapped lines must reassemble to the whole held value");
  return { lines: drawn, fontSize: size, reassembled: value };
}

/**
 * PDFCheckBox.check() sets the field to the FIRST widget's on-state, and
 * PDFAcroCheckBox.setValue throws on any other. This sets the state explicitly
 * and puts every other widget of the field into /Off.
 */
function selectCheckboxState(field, state = "Yes") {
  const target = PDFName.of(state);
  const widgets = field.acroField.getWidgets();
  const offered = widgets.map((widget) => widget.getOnValue());
  assert.ok(offered.some((value) => value?.toString() === target.toString()),
    `${field.getName()} offers no widget state ${state} (offers ${offered.map(String).join(", ")})`);
  field.acroField.dict.set(PDFName.of("V"), target);
  for (const widget of widgets) {
    widget.setAppearanceState(widget.getOnValue()?.toString() === target.toString() ? target : PDFName.of("Off"));
  }
}

/**
 * pdf-lib's form.flatten() deletes the field objects but leaves the page
 * /Annots array naming object numbers that no longer resolve, and a reader that
 * follows them reports "Invalid XRef entry". Detaching the dead references is
 * what keeps the delivered file readable.
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

/**
 * Appearance streams, regenerated only where this build has a reason to.
 *
 * `form.updateFieldAppearances(font)` rewrites EVERY dirty field, and on these
 * two motions that included the check boxes: pdf-lib replaced each source
 * appearance -- a ZapfDingbats mark the Nebraska judiciary drew -- with its own
 * vector check, so the delivered tick was no longer the tick the official form
 * makes. It also rewrote the form's own printed guidance in a different face.
 *
 * So appearances are regenerated for exactly two reasons: this build wrote a
 * value into the field, or the source gives the widget no /AP /N at all and
 * flatten would throw on it. Everything else is stamped as the source drew it.
 */
function refreshTextAppearances(form, font, writtenFieldNames) {
  const refreshed = [];
  for (const field of form.getFields()) {
    if (!(field instanceof PDFTextField)) continue;
    const name = field.getName();
    // getNormalAppearance() throws rather than returning null when /AP /N is
    // absent, which is exactly the case this asks about.
    const hasAppearance = field.acroField.getWidgets().every((widget) => {
      try { return widget.getNormalAppearance() != null; } catch { return false; }
    });
    if (!writtenFieldNames.has(name) && hasAppearance) continue;
    field.defaultUpdateAppearances(font);
    refreshed.push(name);
  }
  return refreshed;
}

/**
 * Every field the SOURCE marks as never printing, detached before flatten.
 *
 * PDFForm.flatten() stamps every widget's appearance and reads no annotation
 * flag, so a screen-only control lands on the paper as ink the official form
 * does not print. `respectPrintFlag: false` reproduces the pre-repair behaviour
 * for the negative control.
 */
function dropNonPrintingFields(form, { respectPrintFlag = true } = {}) {
  if (!respectPrintFlag) return [];
  const dropped = [];
  for (const field of form.getFields()) {
    if (printsOnPaper(field)) continue;
    dropped.push({ fieldName: field.getName(), annotationFlags: annotationFlagsOf(field) });
    form.removeField(field);
  }
  return dropped;
}

// ---- the controlling record --------------------------------------------------------

/**
 * Everything this packet prints that is not a participant fact, read at build
 * time from the records that control it. A record that stops declaring
 * something the guides quote fails the build rather than printing a gap.
 */
function controllingRecord() {
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from ${MEMO_PATH}: ${TRACK_ID}`);
  const rules = track.rules ?? {};
  for (const required of ["filing", "fees", "feeWaiver", "notice", "service", "participantSignature", "notarization"]) {
    assert.ok(rules[required], `${TRACK_ID}: rules.${required} is not held; a guide may not be written past an absent rule`);
  }
  assert.equal(track.outputStrategy, "official_pdf_fill",
    `${TRACK_ID}: the record no longer directs official_pdf_fill; this builder prints official forms and must not run past that`);
  assert.deepEqual(track.eligibleDispositions, ["dismissed", "acquitted"],
    `${TRACK_ID}: the record's eligibleDispositions moved; the CC 6:12 paragraph-2 route scope is read from it`);
  assert.ok((track.selfHelpStopConditions ?? []).length > 0, `${TRACK_ID}: the record holds no stop conditions`);
  assert.ok((track.supportingDocuments ?? []).length > 0, `${TRACK_ID}: the record holds no supporting documents`);
  assert.ok((track.exclusions ?? []).length > 0, `${TRACK_ID}: the record holds no exclusions`);

  const registryBytes = fs.readFileSync(path.join(ROOT, REGISTRY_PATH));
  const registry = JSON.parse(registryBytes.toString("utf8"));
  const registryTrack = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(registryTrack, `${REGISTRY_PATH} holds no track ${TRACK_ID}`);
  const packetSet = registryTrack.packetSet;
  assert.ok(packetSet, `${REGISTRY_PATH} track ${TRACK_ID} carries no packetSet`);
  assert.equal(packetSet.packetSetId, PACKET_SET_ID,
    `${REGISTRY_PATH} track ${TRACK_ID} names packet set ${packetSet.packetSetId}, not ${PACKET_SET_ID}`);

  /*
   * The registry's own before-filing list, carried whole. Three Illinois
   * builders printed none of a ten-line requiredBeforeFiling because they never
   * referenced the registry, and nine zero counters never saw it. Here the list
   * is read, matched line for line against the actions it summarises, and every
   * line has to reach the guide -- assertRepairInvariants checks that it did.
   */
  const requiredBeforeFiling = packetSet.requiredBeforeFiling ?? [];
  assert.ok(requiredBeforeFiling.length > 0, `${REGISTRY_PATH} track ${TRACK_ID}: packetSet.requiredBeforeFiling is empty`);
  const actions = (packetSet.participantActionRequired ?? []).filter((action) => action.requiredBeforeFiling === true);
  assert.deepEqual(actions.map((action) => action.description), requiredBeforeFiling,
    `${REGISTRY_PATH} track ${TRACK_ID}: requiredBeforeFiling and participantActionRequired disagree`);

  /* Every component the registry names, and the binary each one binds to. */
  const components = packetSet.components ?? [];
  assert.equal(components.length, SOURCES.length + UNRENDERED_COMPONENTS.length,
    `${REGISTRY_PATH} track ${TRACK_ID}: the packet set names ${components.length} components; this build accounts for `
    + `${SOURCES.length + UNRENDERED_COMPONENTS.length}`);
  for (const source of SOURCES) {
    const component = components.find((entry) => entry.componentId === source.componentId);
    assert.ok(component, `${REGISTRY_PATH}: no component ${source.componentId}`);
    assert.equal(component.officialFormId, source.documentId,
      `${REGISTRY_PATH} component ${source.componentId} names form ${component.officialFormId}, not ${source.documentId}`);
  }
  for (const unrendered of UNRENDERED_COMPONENTS) {
    const component = components.find((entry) => entry.componentId === unrendered.componentId);
    assert.ok(component, `${REGISTRY_PATH}: no component ${unrendered.componentId}`);
    assert.equal(component.officialFormId, null,
      `${REGISTRY_PATH} component ${unrendered.componentId} now names an official form; it can no longer be reported as unbound`);
  }

  const worklist = readJson(WORKLIST_PATH);
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);

  return {
    track, rules, packetSet, registryTrack, family,
    requiredBeforeFiling, requiredBeforeFilingActions: actions,
    components,
    memoDigest: sha256(memoBytes),
    registryDigest: sha256(registryBytes),
    routeKeys: family.routes.map((route) => route.routeKey),
    releaseBlockers: (track.unresolvedQuestions ?? []).filter((question) => question.impact === "release_blocker"),
    otherOpenQuestions: (track.unresolvedQuestions ?? []).filter((question) => question.impact !== "release_blocker")
  };
}

// ---- filling -----------------------------------------------------------------------

/** The source calculation that wires a dropdown to its printable companion. */
function assertCaptionCalculation(form, binding, documentId) {
  const display = form.getField(binding.displayField);
  assert.ok(display instanceof PDFTextField && display.isReadOnly(),
    `${documentId}: ${binding.displayField} is not the read-only printable caption the source describes`);
  assert.ok(annotationFlagsOf(display).every((flags) => (flags & 4) === 4 && (flags & 3) === 0),
    `${documentId}: ${binding.displayField} is not a printable, visible widget`);
  const action = display.acroField.dict.lookup(PDFName.of("AA"))?.lookup(PDFName.of("C"))?.lookup(PDFName.of("JS"));
  assert.ok(action, `${documentId}: ${binding.displayField} carries no source calculation`);
  const script = action.decodeText?.() ?? new TextDecoder().decode(decodePDFRawStream(action).decode());
  assert.equal(script.trim(), `event.value = this.getField("${binding.choiceField}").value;`,
    `${documentId}: the source caption calculation changed`);
  return script.trim();
}

/** The export value the source itself attaches to the option a held fact names. */
function captionExportFor(form, binding, wanted, documentId) {
  const choice = form.getField(binding.choiceField);
  assert.ok(choice instanceof PDFDropdown, `${documentId}: ${binding.choiceField} is not a dropdown`);
  assert.ok(!printsOnPaper(choice),
    `${documentId}: ${binding.choiceField} now prints; it was detached as a screen-only control on the strength of /F`);
  const entries = choice.acroField.getOptions().filter((entry) => entry.display?.decodeText() === wanted);
  assert.equal(entries.length, 1,
    `${documentId}: the held value "${wanted}" matches ${entries.length} of ${binding.choiceField}'s options, not exactly one`);
  const exported = entries[0].value.decodeText();
  // The source's own placeholder options export a caption that is blank where
  // the court or county belongs -- "IN THE                   COURT OF" and
  // "______________ COUNTY, NEBRASKA". Copying one of those onto the paper
  // would deliver a motion addressed to no court, so a caption that carries no
  // held value, or carries a rule of underscores in its place, is refused.
  assert.ok(exported && exported.trim(), `${documentId}: option "${wanted}" exports an empty caption`);
  assert.ok(!/_{3,}/.test(exported), `${documentId}: option "${wanted}" exports a placeholder caption "${exported}"`);
  assert.ok(exported.includes(wanted),
    `${documentId}: option "${wanted}" exports "${exported}", which does not carry the held value`);
  return exported;
}

const CC612_PROTECTED = new Set(["datesigned"]);
const CC6151_PROTECTED = new Set(["datesigned"]);

function knownValue(documentId, name, fixture) {
  if (documentId === "CC-6-12") {
    if (name === "Case No") return [fixture.caseNumber, "matter.case_number"];
    if (name === "Adult name") return [fixture.full, "participant.full_legal_name"];
    if (name === "Text5") return [fixture.chargeDate, "matter.charge_date"];
    if (name === "printedname") return [fixture.full, "participant.full_legal_name"];
    if (name === "streetaddress") return [fixture.street, "participant.street_address"];
    if (name === "citystatezip") return [fixture.cityStateZip, "participant.city_state_zip"];
    if (name === "telephone number") return [fixture.phone, "participant.phone"];
    if (name === "emailaddress") return [fixture.email, "participant.email"];
    return null;
  }
  if (documentId === "CC-6-15.1") {
    if (name === "Text2") return [fixture.caseNumber, "matter.case_number"];
    if (name === "Text1") return [fixture.full, "participant.full_legal_name"];
    if (name === "printedname") return [fixture.full, "participant.full_legal_name"];
    if (name === "streetaddress") return [fixture.street, "participant.street_address"];
    if (name === "citystatezip") return [fixture.cityStateZip, "participant.city_state_zip"];
    if (name === "telephone number") return [fixture.phone, "participant.phone"];
    if (name === "emailaddress") return [fixture.email, "participant.email"];
    return null;
  }
  return null;
}

async function fillDocument(source, fixture, variant, { respectPrintFlag = true } = {}) {
  const document = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = document.getForm();
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  const boxes = [];
  const captionEvidence = [];

  const base = (name, widgetIndex, page) => ({
    fieldId: `${source.documentId}:${name}`,
    fieldName: name,
    documentId: source.documentId,
    page,
    widgetIndex
  });
  const recordWidgets = (field, name, expectInk, expectText = null) => {
    for (const [widgetIndex, widget] of field.acroField.getWidgets().entries()) {
      boxes.push({
        ...base(name, widgetIndex, widgetPage(widget, pages)),
        rect: widget.getRectangle(),
        expectInk,
        ...(expectText ? { expectText } : {})
      });
    }
  };
  const firstPage = (field) => widgetPage(field.acroField.getWidgets()[0], pages);

  if (source.documentId === "CC-6-12a") {
    // The instructions component carries no AcroForm field at all. It is
    // delivered as the exact source bytes; there is nothing to fill and nothing
    // to refuse on it.
    assert.equal(form.getFields().length, 0, "CC 6:12a is an instruction component and must carry no fillable field");
    document.setTitle(`${source.documentId} - ${FAMILY_ID}`);
    document.setAuthor("LegalEase packet factory");
    document.setCreator("LegalEase deterministic official-form builder");
    document.setProducer("pdf-lib 1.17.1");
    document.setCreationDate(FIXED_DATE);
    document.setModificationDate(FIXED_DATE);
    return { document, writes, refusals, boxes, captionEvidence, danglingAnnotsPruned: 0, droppedNonPrinting: [] };
  }

  // ---- the caption, from the source's own option export --------------------------
  for (const binding of CAPTION_BINDINGS) {
    const script = assertCaptionCalculation(form, binding, source.documentId);
    const wanted = String(fixture[binding.fixtureKey]);
    const exported = captionExportFor(form, binding, wanted, source.documentId);
    const display = form.getField(binding.displayField);
    const before = display.getText();
    // The companion is read-only in the source. Writing it is the source
    // calculation's own effect, reproduced without executing any script.
    display.setText(exported);
    assert.equal(display.getText(), exported, `${source.documentId}: caption did not take on ${binding.displayField}`);
    writes.push({
      ...base(binding.displayField, 0, firstPage(display)),
      effectiveLabel: binding.label,
      factId: binding.factId,
      drawnText: exported,
      sourceCarriedValueBefore: before,
      routeDetermined: false,
      routeReason:
        `The source wires this printable caption to ${binding.choiceField} with its own calculation `
        + `\`${script}\`. This build copied the export value the source attaches to the option "${wanted}"; `
        + `no JavaScript was executed.`
    });
    recordWidgets(display, binding.displayField, true, exported);
    captionEvidence.push({
      documentId: source.documentId,
      choiceField: binding.choiceField,
      displayField: binding.displayField,
      factId: binding.factId,
      heldValue: wanted,
      selectedOptionDisplay: wanted,
      exportedCaption: exported,
      sourceCalculation: script,
      sourceCarriedValueBefore: before,
      method: "source option export copied to its printable display, exactly as the source calculation specifies; no JavaScript executed"
    });

    // The screen-only control itself: measured, declared, and detached rather
    // than stamped. Its evidence goes to field-census.census-v1.json.
    const choice = form.getField(binding.choiceField);
    refusals.push({
      ...base(binding.choiceField, 0, firstPage(choice)),
      effectiveLabel: `${binding.label} - source screen control (selection)`,
      reason:
        `${source.documentId} authors this control with annotation flags /F `
        + `${annotationFlagsOf(choice).join(", ")}, which does not set the Print bit: the source states it never `
        + `reaches paper. Its value is materialised onto the printed caption ${binding.displayField}, which this `
        + `packet writes from this control's own option export. The widget is detached before flattening rather `
        + `than stamped, so the delivered motion carries no ink the official form does not print.`,
      completenessDisposition: "NON_FILING_SOURCE_ELEMENT",
      requiredBeforeFiling: false,
      routeDetermined: false,
      isSelectionControl: true,
      sourcePresentation: {
        kind: "nonprinting_panel",
        sourceSha256: source.sha256,
        sourceField: binding.choiceField,
        representedByField: binding.displayField,
        factId: binding.factId
      }
    });
    // No box: the widget is not in the delivered bytes at all.
  }

  // ---- the form's own printed guidance -------------------------------------------
  for (const [name, printed] of Object.entries(SOURCE_PRINTED_GUIDANCE)) {
    const field = form.getField(name);
    const flags = annotationFlagsOf(field);
    assert.ok(flags.every((value) => (value & 4) === 4 && (value & 32) === 32),
      `${source.documentId}: ${name} is no longer the source's Print+NoView guidance widget (/F ${flags.join(", ")})`);
    assert.ok(field.isReadOnly(), `${source.documentId}: ${name} is no longer read-only`);
    refusals.push({
      ...base(name, 0, firstPage(field)),
      effectiveLabel: `Printed form guidance: "${printed}" (${source.documentId})`,
      reason:
        `${source.documentId} authors this field read-only with annotation flags /F ${flags.join(", ")} -- Print set, `
        + `NoView set -- and fills it with the form's own words, "${printed}". It is hidden on screen, printed on `
        + `paper, and never a filing fact. This build leaves the source's own text unaltered.`,
      role: "source",
      routeDetermined: false
    });
    recordWidgets(field, name, false);
  }

  // ---- every remaining field ------------------------------------------------------
  const handled = new Set([
    ...CAPTION_BINDINGS.flatMap((binding) => [binding.choiceField, binding.displayField]),
    ...Object.keys(SOURCE_PRINTED_GUIDANCE)
  ]);

  // The two continuation lines are one value and are filled together, before
  // the per-field walk reaches them.
  if (source.documentId === "CC-6-12") {
    const lineFields = ["Text3", "Text4"].map((name) => form.getField(name));
    const outcome = setCompleteAcrossLines(lineFields, fixture.charges, font);
    if (outcome.refused) {
      for (const name of ["Text3", "Text4"]) {
        const field = form.getField(name);
        refusals.push({
          ...base(name, 0, firstPage(field)),
          effectiveLabel: `${PRINTED_LABELS[`CC-6-12:${name}`]} - this packet holds the charge text but the two printed lines cannot carry it complete`,
          reason:
            `The held charge text needs ${outcome.measurement.widthNeededAtFloorPt}pt at the `
            + `${outcome.measurement.floorFontSizePt}pt floor and CC 6:12 prints ${outcome.measurement.printedLines} `
            + `lines of ${outcome.measurement.drawableWidthsPt.join("pt and ")}pt. It is left blank rather than cut `
            + `short: a charge description cut short on a motion is a different charge.`,
          completenessDisposition: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true,
          factAvailable: true,
          heldValue: outcome.heldValue,
          measurement: outcome.measurement,
          routeDetermined: false,
          role: "participant"
        });
        recordWidgets(field, name, false);
      }
    } else {
      for (const [index, name] of ["Text3", "Text4"].entries()) {
        const field = form.getField(name);
        const line = outcome.lines[index];
        assert.ok(line.text.trim().length > 0,
          `CC 6:12 ${name}: the form prints two continuation lines for one value and this build left one empty. `
          + "Fix the fixture's charge text or the wrap, never the assertion.");
        writes.push({
          ...base(name, 0, firstPage(field)),
          effectiveLabel: PRINTED_LABELS[`CC-6-12:${name}`],
          factId: "matter.charges_as_filed",
          drawnText: line.text,
          fontSize: line.fontSize,
          continuationOf: "CC-6-12:Text3+Text4",
          reassembledValue: outcome.reassembled
        });
        recordWidgets(field, name, true, line.text);
      }
    }
    handled.add("Text3");
    handled.add("Text4");
  }

  for (const field of form.getFields()) {
    const name = field.getName();
    if (handled.has(name)) continue;
    const page = firstPage(field);
    const id = `${source.documentId}:${name}`;
    const label = PRINTED_LABELS[id] ?? null;

    if (field instanceof PDFCheckBox) {
      const elected = source.documentId === "CC-6-12"
        ? variant.cc612Box === name
        : variant.cc6151Boxes.includes(name);
      if (elected) {
        selectCheckboxState(field, "Yes");
        const printed = source.documentId === "CC-6-12" ? CC612_OPTION_CAPTIONS[name] : CC6151_OPTION_CAPTIONS[name];
        writes.push({
          ...base(name, 0, page),
          effectiveLabel: `${source.documentId} select-one option: ${printed} (selection)`,
          factId: source.documentId === "CC-6-12" ? "matter.disposition_type" : "matter.dismissal_reason",
          drawnText: "Yes",
          isSelectionControl: true,
          routeDetermined: false,
          routeReason:
            `This packet is built for the "${variant.dispositionType}" disposition and the "${variant.dismissalReason}" `
            + `qualifying reason the fixture's certified disposition records. The printed option reads: "${printed}"`
        });
        recordWidgets(field, name, true);
        continue;
      }
      const offRoute = source.documentId === "CC-6-12" ? OFF_ROUTE_CC612_OPTIONS[name] : null;
      if (offRoute) {
        refusals.push({
          ...base(name, 0, page),
          effectiveLabel: `${source.documentId} select-one option outside this route: ${offRoute.printedGround} (selection)`,
          reason:
            `${offRoute.routeCondition} A participant whose record is that conviction belongs on the `
            + `${offRoute.otherTrack} track, not on this motion.`,
          completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
          routeConditionThatMakesItInapplicable: offRoute.routeCondition,
          requiredBeforeFiling: false,
          factAvailable: false,
          routeDetermined: false,
          isSelectionControl: true,
          role: "participant"
        });
        recordWidgets(field, name, false);
        continue;
      }
      const printed = source.documentId === "CC-6-12" ? CC612_OPTION_CAPTIONS[name] : CC6151_OPTION_CAPTIONS[name];
      refusals.push({
        ...base(name, 0, page),
        effectiveLabel: name === "Check Box7" && source.documentId === "CC-6-12"
          ? "By checking this box, I am letting the court know that I do not have the ability to receive emails (selection)"
          : `${source.documentId} select-one option not taken on this packet: ${printed ?? name} (selection)`,
        reason: name === "Check Box7" && source.documentId === "CC-6-12"
          ? "This is the participant's own declaration that they cannot receive email. This packet prints an email "
            + "address on the line above it, as Neb. Ct. R. § 2-208 requires of a self-represented party, so the "
            + "declaration is not made. A participant who has no email ticks it themselves and writes the reason."
          : `${source.documentId} offers a select-one over the qualifying reasons in Neb. Rev. Stat. § 29-3523(3)(c). `
            + `This packet is built for "${variant.dismissalReason}", which NE.memo.json records as the required `
            + `participant input spDismissalReason and which the certified disposition establishes. Which reason `
            + `applies is the participant's own answer against their record, not something this route decides, so the `
            + `options it does not claim stay unticked.`,
        refusalClass: "participant_sworn_narrative_or_legal_election",
        requiredBeforeFiling: false,
        routeDetermined: false,
        isSelectionControl: true,
        role: "participant"
      });
      recordWidgets(field, name, false);
      continue;
    }

    if (!(field instanceof PDFTextField)) {
      refusals.push({
        ...base(name, 0, page),
        effectiveLabel: label ?? `${source.documentId} field ${name}`,
        reason: "an unexpected field type on a bound official form; this build writes text fields and check boxes only",
        role: "source"
      });
      recordWidgets(field, name, false);
      continue;
    }

    const isProtected = source.documentId === "CC-6-12" ? CC612_PROTECTED.has(name) : CC6151_PROTECTED.has(name);
    if (isProtected) {
      refusals.push({
        ...base(name, 0, page),
        effectiveLabel: label ?? `${source.documentId} field ${name}`,
        reason: "signature or date field; never filled in before the participant signs",
        refusalClass: "signature_or_date_participant_completion",
        requiredBeforeFiling: false,
        routeDetermined: false,
        role: "protected"
      });
      recordWidgets(field, name, false);
      continue;
    }

    if (source.documentId === "CC-6-12" && (name === "noemailreason" || name === "noemailreason2")) {
      const condition =
        "CC 6:12 page 2 offers two branches for the participant's contact: print an email address, or tick the box "
        + "declaring no ability to receive email and write the reason on these two lines. This packet prints the "
        + "participant's email address at emailaddress, as Neb. Ct. R. § 2-208 requires of a self-represented party, "
        + "so the no-email branch of the form is not the branch this packet takes and its reason lines belong to the "
        + "branch it does not take.";
      refusals.push({
        ...base(name, 0, page),
        effectiveLabel: label ?? `${source.documentId} field ${name}`,
        reason: condition,
        completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: condition,
        requiredBeforeFiling: false,
        factAvailable: false,
        routeDetermined: false,
        role: "participant"
      });
      recordWidgets(field, name, false);
      continue;
    }

    const known = knownValue(source.documentId, name, fixture);
    if (known) {
      const outcome = setComplete(field, known[0], font);
      if (outcome.refused) {
        refusals.push({
          ...base(name, 0, page),
          effectiveLabel: `${label ?? name} - this packet holds the value but the printed box cannot carry it complete`,
          reason:
            `The held value "${outcome.heldValue}" needs ${outcome.measurement.widthNeededAtFloorPt}pt at the `
            + `${outcome.measurement.floorFontSizePt}pt floor and the box draws `
            + `${outcome.measurement.drawableWidthPt}pt on a single line. It is left blank rather than shortened: a `
            + `shortened fact on a motion is a false one.`,
          completenessDisposition: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true,
          factAvailable: true,
          heldValue: outcome.heldValue,
          measurement: outcome.measurement,
          routeDetermined: false,
          role: "participant"
        });
        recordWidgets(field, name, false);
      } else {
        writes.push({
          ...base(name, 0, page),
          effectiveLabel: label ?? name,
          factId: known[1],
          drawnText: outcome.drawnText,
          fontSize: outcome.fontSize
        });
        recordWidgets(field, name, true, outcome.drawnText);
      }
      continue;
    }

    refusals.push({
      ...base(name, 0, page),
      effectiveLabel: label ?? `Complete "${name}" on ${source.documentId} page ${page}`,
      reason: "The platform does not hold this participant or case fact; supply it before filing.",
      completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true,
      factAvailable: false,
      routeDetermined: false,
      role: "participant"
    });
    recordWidgets(field, name, false);
  }

  refreshTextAppearances(form, font, new Set(writes.map((row) => row.fieldName)));
  const droppedNonPrinting = dropNonPrintingFields(form, { respectPrintFlag });
  form.flatten({ updateFieldAppearances: false });
  const danglingAnnotsPruned = pruneDanglingAnnots(document);
  document.setTitle(`${source.documentId} - ${FAMILY_ID}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, boxes, captionEvidence, danglingAnnotsPruned, droppedNonPrinting };
}

// ---- the measurement ---------------------------------------------------------------

const inkKey = (item) => `${item.text}@${item.x.toFixed(1)},${item.y.toFixed(1)}`;

/**
 * A VECTOR mark, keyed the way a glyph is.
 *
 * A ticked box on these motions is not text. CC 6:12 draws its mark as a filled
 * rectangle, a stroked rectangle and two stroked lines, and a reader that
 * counts only glyphs reports every election this packet makes as an invisible
 * write. Paths are read from the same walk as the text and subtracted against
 * the same blank-form baseline, so the box's own printed border never counts as
 * a tick and the tick is never missed for not being prose.
 */
const pathKey = (segment) =>
  `${segment.operator}:${segment.paintedBy}@${segment.x.toFixed(1)},${segment.y.toFixed(1)}`
  + `+${segment.width.toFixed(1)}x${segment.height.toFixed(1)}`;

const pageMarks = (page) => {
  const geometry = extractPageGeometry(page);
  return { text: geometry.text, paths: geometry.paths };
};

/**
 * What the BLANK form prints inside its own field rectangles, driven through
 * the identical pipeline with no value set and no box elected. Anything the
 * comparison surfaces was added by this build, so the form's own rules and
 * captions can never be mistaken for a write.
 */
async function baselineInk(source, { respectPrintFlag = true } = {}) {
  const document = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.Helvetica);
  refreshTextAppearances(form, font, new Set());
  dropNonPrintingFields(form, { respectPrintFlag });
  form.flatten({ updateFieldAppearances: false });
  pruneDanglingAnnots(document);
  const bytes = Buffer.from(await document.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return reopened.getPages().map((page) => {
    const marks = pageMarks(page);
    return { text: new Set(marks.text.map(inkKey)), paths: new Set(marks.paths.map(pathKey)) };
  });
}

async function proveDeliveredInk(packetBytes, pageManifest, baselines, mode = {}) {
  const subtractBaseline = mode.subtractBaseline !== false;
  const singleAssignment = mode.singleAssignment !== false;
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const marksByPage = pdf.getPages().map((page) => pageMarks(page));

  const startsInside = (x, y, rect) =>
    x >= rect.x - 1.5 && x <= rect.x + rect.width + 1.5 &&
    y >= rect.y - 3.5 && y <= rect.y + rect.height + 3.5;
  /*
   * A RUN THAT OVERFLOWS A BOX DOES NOT BELONG TO IT.
   *
   * "DOUGLAS COUNTY, NEBRASKA" is drawn from x 279.9 for 144pt inside the
   * printable caption field, whose rectangle runs to x 504.6. The form's own
   * guidance widget "(Enter the county name)" starts at 276.8 and stops at
   * 380.3, so it contains the run's first glyph and none of its last -- and a
   * smallest-rectangle rule handed it the whole caption, reporting the caption
   * as ink on a refused field and the caption field itself as an invisible
   * write. Both findings were artefacts of the rule. A box that contains the
   * WHOLE run outranks one that merely contains where it starts.
   */
  const containsWholly = (item, rect) =>
    startsInside(item.x, item.y, rect)
    && item.x + (item.width ?? 0) <= rect.x + rect.width + 1.5;

  const invisibleWrites = [];
  const refusedFieldsWithInk = [];
  const incompleteValues = [];
  let glyphsInWriteBoxes = 0;
  let vectorMarksInWriteBoxes = 0;
  let baselineGlyphsIgnored = 0;
  let baselineVectorMarksIgnored = 0;
  let addedGlyphsOutsideAnyFieldRect = 0;

  /*
   * ONE GLYPH BELONGS TO ONE WIDGET, and the claim is keyed per widget rather
   * than per field: CC 6:15.1's Text1 prints the defendant's name twice, in the
   * caption and in the sentence below it, and a field-keyed reader credits both
   * to one box and reports the second as ink outside every measured box.
   */
  const boxesWithRects = pageManifest.boxes.filter((box) => box.rect);
  const keyOf = (box) => `${box.fieldId}#${box.widgetIndex}`;
  const assignedText = new Map(boxesWithRects.map((box) => [keyOf(box), []]));
  const assignedPaths = new Map(boxesWithRects.map((box) => [keyOf(box), []]));

  const claimant = (candidates, item) => {
    const whole = candidates.filter((box) => containsWholly(item, box.rect));
    const pool = whole.length > 0 ? whole : candidates;
    let best = null;
    let bestArea = Infinity;
    for (const box of pool) {
      const area = box.rect.width * box.rect.height;
      if (area < bestArea) { best = box; bestArea = area; }
    }
    return best;
  };

  for (const [pageIndex, marks] of marksByPage.entries()) {
    const onPage = boxesWithRects.filter((box) => box.packetPage === pageIndex + 1);
    if (onPage.length === 0) continue;
    const printed = baselines[onPage[0].documentId]?.[onPage[0].page - 1] ?? { text: new Set(), paths: new Set() };

    for (const item of marks.text) {
      if (subtractBaseline && printed.text.has(inkKey(item))) { baselineGlyphsIgnored += 1; continue; }
      const containing = onPage.filter((box) => startsInside(item.x, item.y, box.rect));
      if (containing.length === 0) { addedGlyphsOutsideAnyFieldRect += item.text.replace(/\s+/g, "").length; continue; }
      if (!singleAssignment) {
        for (const box of containing) assignedText.get(keyOf(box)).push(item);
        continue;
      }
      assignedText.get(keyOf(claimant(containing, item))).push(item);
    }

    for (const segment of marks.paths) {
      if (subtractBaseline && printed.paths.has(pathKey(segment))) { baselineVectorMarksIgnored += 1; continue; }
      const containing = onPage.filter((box) => startsInside(segment.x, segment.y, box.rect));
      if (containing.length === 0) continue;
      if (!singleAssignment) {
        for (const box of containing) assignedPaths.get(keyOf(box)).push(segment);
        continue;
      }
      assignedPaths.get(keyOf(claimant(containing, { x: segment.x, y: segment.y, width: segment.width }))).push(segment);
    }
  }

  for (const box of boxesWithRects) {
    const added = (assignedText.get(keyOf(box)) ?? []).slice().sort((a, b) => a.x - b.x);
    const ink = added.map((item) => item.text).join("").replace(/\s+/g, "");
    const vectors = (assignedPaths.get(keyOf(box)) ?? []).length;

    if (box.expectInk) {
      if (ink.length === 0 && vectors === 0) {
        invisibleWrites.push({
          fieldId: box.fieldId, widgetIndex: box.widgetIndex, packetPage: box.packetPage,
          why: "the delivered bytes draw no glyph and no vector mark inside this widget's rectangle that the blank form does not already draw"
        });
      } else {
        glyphsInWriteBoxes += ink.length;
        vectorMarksInWriteBoxes += vectors;
      }
      if (box.expectText) {
        const want = box.expectText.replace(/\s+/g, "");
        if (!ink.includes(want)) {
          incompleteValues.push({
            fieldId: box.fieldId, widgetIndex: box.widgetIndex, packetPage: box.packetPage,
            held: box.expectText, readBackFromDeliveredBytes: ink
          });
        }
      }
    } else if (ink.length > 0 || vectors > 0) {
      refusedFieldsWithInk.push({
        fieldId: box.fieldId, widgetIndex: box.widgetIndex, packetPage: box.packetPage,
        addedInk: ink, addedVectorMarks: vectors
      });
    }
  }

  return {
    pagesRead: pdf.getPageCount(),
    fieldsMeasured: boxesWithRects.length,
    addedGlyphsReadFromOutputBytes: glyphsInWriteBoxes,
    addedVectorMarksReadFromOutputBytes: vectorMarksInWriteBoxes,
    flattenedWidgetAppearancesReadFromOutputBytes: boxesWithRects.filter((box) => box.expectInk).length - invisibleWrites.length,
    printedFormGlyphsInsideFieldRectsIgnored: baselineGlyphsIgnored,
    printedFormVectorMarksInsideFieldRectsIgnored: baselineVectorMarksIgnored,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: addedGlyphsOutsideAnyFieldRect,
    invisibleWrites,
    refusedFieldsWithInk,
    incompleteValues,
    proof: "each widget's pre-flatten rectangle was re-read against the glyphs AND the vector marks the finished packet actually draws, recursing through flattened Form XObjects, minus the glyphs and marks the blank source draws inside the same rectangle; a run that overflows a rectangle is credited to the box that contains all of it"
  };
}

/**
 * Ink anywhere on the delivered pages that a detached screen-only widget would
 * have stamped. Used only by the negative control, which drives the same bytes
 * through the pre-repair flatten and asserts the stray ink appears.
 */
async function inkInsideRects(packetBytes, rects) {
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const found = [];
  for (const [pageIndex, page] of pdf.getPages().entries()) {
    for (const item of extractTextItems(page)) {
      for (const rect of rects) {
        if (rect.packetPage !== pageIndex + 1) continue;
        if (item.x < rect.x - 1.5 || item.x > rect.x + rect.width + 1.5) continue;
        if (item.y < rect.y - 3.5 || item.y > rect.y + rect.height + 3.5) continue;
        if (item.text.trim()) found.push({ ...rect, text: item.text, x: item.x, y: item.y });
      }
    }
  }
  return found;
}

// ---- assembly ----------------------------------------------------------------------

async function buildPacket(sources, fixture, variant, baselines, options = {}) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixture, variant, options)) });

  const packet = await PDFDocument.create();
  const boxes = [];
  const pageManifest = [];
  let pageCursor = 0;
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
    for (const box of item.boxes) boxes.push({ ...box, packetPage: pageCursor + box.page });
    for (let index = 0; index < item.document.getPageCount(); index += 1) {
      pageManifest.push({
        packetPage: pageCursor + index + 1,
        documentId: item.source.documentId,
        formNumber: item.source.documentId,
        sourcePage: index + 1,
        sourceSha256: item.source.sha256
      });
    }
    pageCursor += item.document.getPageCount();
  }
  pruneDanglingAnnots(packet);
  packet.setTitle(`${FAMILY_ID} ${fixture.fixtureClass}/${variant.variantId} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);

  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(reopened.getPageCount(), pageCursor, "the packet must carry every page of every component");
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live field");

  const proof = await proveDeliveredInk(bytes, { boxes }, baselines);
  return {
    bytes, boxes, pageManifest, pageCount: reopened.getPageCount(),
    writes: filled.flatMap((item) => item.writes),
    refusals: filled.flatMap((item) => item.refusals),
    captionEvidence: filled.flatMap((item) => item.captionEvidence),
    droppedNonPrinting: filled.flatMap((item) => item.droppedNonPrinting.map((row) => ({ ...row, documentId: item.source.documentId }))),
    danglingAnnotsPruned: filled.reduce((sum, item) => sum + item.danglingAnnotsPruned, 0),
    proof
  };
}

// ---- the census the source-presentation declarations are verified against ----------

function fieldCensus(sources, reference) {
  const byDocument = new Map();
  for (const row of [...reference.writes, ...reference.refusals]) {
    if (!byDocument.has(row.documentId)) byDocument.set(row.documentId, []);
    byDocument.get(row.documentId).push(row);
  }
  return {
    schemaVersion: "rcap-field-census/census-v1",
    familyId: FAMILY_ID,
    measuredFrom: "the bound source binaries on this build; every widget flag, read-only bit and source-carried value is read first hand",
    documents: sources.map((source) => {
      const rows = byDocument.get(source.documentId) ?? [];
      const evidence = {};
      for (const binding of CAPTION_BINDINGS) {
        for (const name of [binding.choiceField, binding.displayField]) {
          const measured = source.widgetEvidence?.[name];
          if (measured) evidence[name] = measured;
        }
      }
      for (const [name, measured] of Object.entries(source.widgetEvidence ?? {})) {
        if (!evidence[name]) evidence[name] = measured;
      }
      return {
        documentId: source.documentId,
        formNumber: source.documentId,
        sourceSha256: source.sha256,
        pathInArchive: source.path,
        fields: rows.map((row) => ({ name: row.fieldName, page: row.page })),
        documentPolicy: {
          referenceOnly: source.documentId === "CC-6-12a",
          documentAcceptsFill: source.documentId !== "CC-6-12a",
          nonprintingSourceControls: source.documentId === "CC-6-12a"
            ? []
            : CAPTION_BINDINGS.map((binding) => binding.choiceField),
          sourceFieldEvidence: evidence
        }
      };
    })
  };
}

/** Widget evidence read from the bound bytes, once per source. */
async function measureWidgets(source) {
  const document = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = document.getForm();
  const pages = document.getPages();
  const evidence = {};
  for (const field of form.getFields()) {
    const widgets = field.acroField.getWidgets();
    evidence[field.getName()] = {
      pdfType: field.constructor.name,
      fieldFlags: field.acroField.dict.get(PDFName.of("Ff"))?.asNumber?.() ?? 0,
      readOnly: field.isReadOnly(),
      annotationFlags: annotationFlagsOf(field),
      page: widgetPage(widgets[0], pages),
      widgetCount: widgets.length,
      rects: widgets.map((widget) => {
        const rect = widget.getRectangle();
        return {
          x: Number(rect.x.toFixed(2)), y: Number(rect.y.toFixed(2)),
          width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2))
        };
      }),
      sourceValue: field instanceof PDFTextField ? (field.getText() ?? null) : null
    };
  }
  return evidence;
}

// ---- the guides --------------------------------------------------------------------

export function writeGuides({ out, record, artifacts, required, heldButUnprintable, protectedBlanks, captionEvidence, droppedNonPrinting }) {
  const { track, rules, memoDigest, registryDigest, requiredBeforeFilingActions } = record;

  const provenance = [
    "Every quoted line below is taken verbatim from the Nebraska legal-design record",
    `\`${MEMO_PATH}\`, track \`${TRACK_ID}\` (sha256 ${memoDigest}), and from the legal-design track registry`,
    `\`${REGISTRY_PATH}\`, packet set \`${PACKET_SET_ID}\` (sha256 ${registryDigest}).`,
    "Where those records do not establish something, this packet says so rather than guessing."
  ].join(" ");

  const heldRecord = [
    `- Where to file: "${rules.filing}"`,
    `- Filing fee: "${rules.fees}"`,
    `- Fee waiver: "${rules.feeWaiver}"`,
    `- Notice: "${rules.notice}"`,
    `- Service: "${rules.service}"`,
    `- Who signs: "${rules.participantSignature}"`,
    `- Notarization: "${rules.notarization}"`,
    `- Venue: "${track.geography?.venue ?? "not stated in the record"}"`,
    `- Destination: ${track.destination?.name ?? "not stated in the record"}`
      + (track.destination?.detail ? ` - "${track.destination.detail}"` : "")
  ].join("\n");

  const electionLines = (variant) => [
    `CC 6:12, paragraph 2, "${CC612_OPTION_CAPTIONS[variant.cc612Box]}"`,
    ...variant.cc6151Boxes.map((box) => `CC 6:15.1, "${CC6151_OPTION_CAPTIONS[box]}"`)
  ].join("; ");

  const variantTable = Object.values(VARIANTS).map((variant) => {
    const files = artifacts.filter((row) => row.variant === variant.variantId)
      .map((row) => `\`${path.basename(row.file)}\``).join(" and ");
    return `- **${variant.variantLabel}.** Ticked on the paper at ${electionLines(variant)}. `
      + `Delivered as ${files}.`;
  }).join("\n");

  /*
   * The registry's before-filing list, carried line for line and each line
   * shown with the kind of action the registry gives it, so a sentence like
   * "none required on the face of the form." reads as the notarisation answer
   * it is rather than as an instruction on its own.
   */
  const beforeFiling = requiredBeforeFilingActions
    .map((action, index) => `${index + 1}. (${action.kind}) ${action.description}`
      + (action.conditionDescription ? ` Applies when: ${action.conditionDescription}` : ""))
    .join("\n");

  const supporting = (track.supportingDocuments ?? [])
    .map((doc, index) => `${index + 1}. ${doc.name} - from ${doc.obtainedFrom}. How: ${doc.howToObtain}`
      + (doc.conditionDescription ? ` Applies when: ${doc.conditionDescription}` : ""))
    .join("\n");

  const handCompleted = protectedBlanks.length
    ? protectedBlanks.map((row) => `- ${row.effectiveLabel}`).join("\n")
    : "- None.";

  const requiredList = required.length
    ? required.map((row) => `- ${row.effectiveLabel}`).join("\n")
    : "- None. Every blank on the two motions is either filled from your answers, protected until you sign, or "
      + "classified as belonging to a branch of the form this packet does not take.";

  const unprintable = heldButUnprintable.length
    ? heldButUnprintable.map((row) => `- ${row.effectiveLabel}\n  ${row.reason}`).join("\n")
    : "- None. Every fact this packet holds printed complete inside its box.";

  const stops = (track.selfHelpStopConditions ?? []).map((stop) => `- ${stop}`).join("\n");
  const exclusions = (track.exclusions ?? []).map((item) => `- ${item}`).join("\n");

  const blockers = record.releaseBlockers
    .map((question) => `- ${question.question}\n  Counsel question on the record: "${question.provenance?.counselQuestion ?? "not stated"}"`)
    .join("\n");
  const notes = record.otherOpenQuestions
    .map((question) => `- (${question.impact}) ${question.question}`)
    .join("\n");

  const captionLines = captionEvidence
    .filter((row, index, rows) => rows.findIndex((other) => other.documentId === row.documentId && other.displayField === row.displayField) === index)
    .map((row) => `- ${row.documentId} \`${row.displayField}\` was written "${row.exportedCaption}", which is the export `
      + `value the source itself attaches to the option "${row.selectedOptionDisplay}" in \`${row.choiceField}\`. `
      + `The source's own calculation is \`${row.sourceCalculation}\`; no JavaScript was executed.`)
    .join("\n");

  const dropped = droppedNonPrinting
    .filter((row, index, rows) => rows.findIndex((other) => other.documentId === row.documentId && other.fieldName === row.fieldName) === index)
    .map((row) => `- ${row.documentId} \`${row.fieldName}\` (annotation flags /F ${row.annotationFlags.join(", ")})`)
    .join("\n");

  const unrendered = UNRENDERED_COMPONENTS
    .map((component) => `- **${component.role}** (\`${component.componentId}\`, ${component.requirement}). ${component.why}`)
    .join("\n");

  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Nebraska motion to seal a pre-2017 dismissal or acquittal - ${FAMILY_ID}

## What this packet is

${track.legalName}. In plain words: ${track.publicName}.

The record states the controlling summary: "${track.controllingAuthority?.summary ?? "not stated in the record"}"

## Which version of this packet you file

${variantTable}

Nebraska decides this motion on two facts about your case: whether the case was
dismissed or you were acquitted, and which of the qualifying reasons in Neb.
Rev. Stat. § 29-3523(3)(c) describes the dismissal. Neither is decided by the
route, so the packet is delivered in one version per combination and you file
the one that matches your certified disposition. If none of them matches your
record, do not adapt one: that is the point at which to speak with a Nebraska
lawyer.

## Two motions, and which one is the primary

The record settles this itself and records that it still needs a clerk-level
answer. CC 6:12 is delivered as the primary motion because that is what the
Nebraska judiciary's own adult record sealing page links and what clerks are
expected to want. CC 6:15.1 is delivered as a conditional alternate because its
checkboxes map one-to-one onto the five qualifying dismissal reasons that
§ 29-3523(6) requires the court to find, which CC 6:12 does not capture. File
CC 6:12 unless the clerk asks for the other. Do not file both.

CC 6:12a, the judiciary's own instructions for completing CC 6:12, is included
in this packet unaltered.

## What the held record establishes

${provenance}

${heldRecord}

## Who this route does not reach

${exclusions}

## Do these before you file

${beforeFiling}

## Documents to obtain

${supporting}

## Blanks you must fill in

${requiredList}

## Blanks this packet left blank on purpose, for you to complete by hand

Every one of these is deliberately empty. Complete them when you sign the motion
you are filing, and not before.

${handCompleted}

## Facts this packet holds but could not print

${unprintable}

## The caption on both motions

Both Nebraska motions leave the whole caption line - "IN THE ____ COURT OF ____
COUNTY, NEBRASKA" - to form fields rather than printing it. This packet wrote
it, and here is exactly how:

${captionLines}

Check the printed caption against your own court papers before you file. If it
is wrong, the motion is addressed to the wrong court.

## Controls this packet removed rather than printed

The source marks these widgets as never printing. Flattening them anyway would
stamp a screen control onto a filed motion, so they were detached instead:

${dropped}

Nothing you need was removed: the value each of them carries is printed by its
companion caption field, named above.

## Components of this packet that carry no form

${unrendered}

## At the hearing

The record publishes the script and this packet does not improve on it. Identify
yourself and your address, state that the charge was dismissed or that you were
acquitted, state that the record is still public and eligible to be sealed, then
stop.

Get a copy of the signed order before you leave the courthouse. The record is
explicit about why: "Once the record is sealed the participant cannot retrieve
it without a separate request to release sealed records."

## Service, and why there is no certificate of service in this packet

The record states: "${rules.service}" and "${rules.notice}" There is no
certificate of service in this packet because on this route you serve nobody.

## Notarization

The record states: "${rules.notarization}"

## A wording problem on CC 6:12 that the record flags

CC 6:12's closing sentence asks the court for an order sealing "my above
conviction", while the checkboxes above it cover dismissal and acquittal. The
official text is used unaltered. If the clerk or the judge asks about it, the
answer is that the form's closing sentence is the form's, and the checkbox you
ticked is the relief you are asking for.

## Open questions on this route that have not been answered

These are recorded on the legal record as release blockers. They do not stop you
filing, and you should know about them:

${blockers}

Other recorded notes:

${notes}

## Stop and get help

Stop using automated assistance and speak with a Nebraska lawyer if any of these
is true:

${stops}
`);

  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${FAMILY_ID}

${provenance}

${heldRecord}

## File one motion, not two

${Object.values(VARIANTS).map((v) => `- ${v.variantLabel} - ticked at ${electionLines(v)}`).join("\n")}

CC 6:12 is the primary motion. CC 6:15.1 is the conditional alternate, filed
only where the clerk prefers the statute-specific form. Each motion covers one
case; another case needs its own motion.

## What the court does, and what you do not

The record states: "${track.destination?.detail ?? "not stated in the record"}"
So there is no certificate of service in this packet and none is owed.

## Fee

The record states: "${rules.fees}" No fee figure is printed anywhere in this
packet, because none is established. Ask the clerk what, if anything, the court
charges before you file.

## Fee waiver

The record states: "${rules.feeWaiver}" This packet does not include a fee-waiver
form. There is no fitting official Nebraska form for a fee waiver inside an
existing criminal case, and drafting a substitute is an open counsel question
rather than a build step.

## Do not sign or date early

Every signature line and every date beside a signature in this packet is
deliberately blank. Complete them when you sign, and not before.
`);
}

// ---- invariants --------------------------------------------------------------------

export function assertRepairInvariants(out) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");
  const summary = JSON.parse(fs.readFileSync(path.join(out, "reports", "build-summary.json"), "utf8"));
  const census = JSON.parse(fs.readFileSync(path.join(out, "field-census.census-v1.json"), "utf8"));
  const receipt = JSON.parse(fs.readFileSync(path.join(out, "source-receipt.json"), "utf8"));
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));

  // The caption is on the paper, from the source's own option export.
  for (const documentId of ["CC-6-12", "CC-6-15.1"]) {
    for (const binding of CAPTION_BINDINGS) {
      assert.ok(written.has(`${documentId}:${binding.displayField}`),
        `${documentId}: the printed caption field ${binding.displayField} was not written, so the motion names no court`);
      assert.ok(!written.has(`${documentId}:${binding.choiceField}`),
        `${documentId}: ${binding.choiceField} is a screen-only control and must not be written`);
    }
  }
  for (const row of summary.captionEvidence) {
    assert.equal(row.sourceCalculation, `event.value = this.getField("${row.choiceField}").value;`,
      `${row.documentId}: the caption evidence does not carry the source's own calculation`);
    assert.ok(row.exportedCaption.includes(row.selectedOptionDisplay),
      `${row.documentId}: the written caption "${row.exportedCaption}" does not carry the selected option "${row.selectedOptionDisplay}"`);
    assert.ok(!/^\s*$/.test(row.exportedCaption) && !/_{3,}/.test(row.exportedCaption),
      `${row.documentId}: the written caption is still a placeholder`);
  }

  // Every screen-only control the source declares was detached, not stamped.
  assert.ok(summary.droppedNonPrintingWidgets.length > 0,
    "the Nebraska motions carry screen-only dropdown widgets and none was detached");
  for (const row of summary.droppedNonPrintingWidgets) {
    assert.ok(row.annotationFlags.every((flags) => (flags & 4) === 0),
      `${row.documentId} ${row.fieldName} was detached but its /F sets the Print bit`);
  }

  // Exactly one disposition option is elected on CC 6:12, and it is one of the
  // two the route reaches.
  const dispositionElections = fieldMap.writes.filter((row) => row.factId === "matter.disposition_type");
  assert.equal(dispositionElections.length, 1, "CC 6:12 paragraph 2 elects exactly one disposition");
  assert.ok(["CC-6-12:Check Box1", "CC-6-12:Check Box2"].includes(dispositionElections[0].fieldId),
    "the elected disposition must be dismissal or acquittal, the only two this subsection reaches");
  for (const name of Object.keys(OFF_ROUTE_CC612_OPTIONS)) {
    assert.ok(!written.has(`CC-6-12:${name}`), `CC-6-12:${name} is outside this route and must never be elected`);
    const row = fieldMap.refusals.find((entry) => entry.fieldId === `CC-6-12:${name}`);
    assert.ok(row?.routeConditionThatMakesItInapplicable, `CC-6-12:${name} must be refused with a named route condition`);
    assert.ok(!row.requiredBeforeFiling, `CC-6-12:${name} is outside this route and must not be listed as owed`);
  }

  // The dismissal reason is elected on CC 6:15.1 and never left to nothing.
  const reasonElections = fieldMap.writes.filter((row) => row.factId === "matter.dismissal_reason");
  assert.ok(reasonElections.length >= 1, "CC 6:15.1 must elect a qualifying dismissal reason");
  assert.ok(reasonElections.every((row) => row.documentId === "CC-6-15.1"), "the reason election belongs to CC 6:15.1");

  // The charge text occupies both continuation lines the form prints for it.
  for (const name of ["Text3", "Text4"]) {
    const row = fieldMap.writes.find((entry) => entry.fieldId === `CC-6-12:${name}`);
    assert.ok(row, `CC 6:12 ${name} carries no write; the form prints two continuation lines for one value`);
    assert.ok(String(row.effectiveLabel).length > 0 && !/^Text\d/.test(row.effectiveLabel),
      `CC 6:12 ${name} carries an opaque label`);
  }
  const reassembled = fieldMap.writes.filter((row) => row.factId === "matter.charges_as_filed");
  assert.equal(reassembled.length, 2, "the charge text is one value across two printed lines");
  assert.equal(new Set(reassembled.map((row) => row.reassembledValue)).size, 1,
    "both continuation lines must reassemble to the same held value");

  // A blank a participant cannot find is not a named blank.
  for (const refusal of fieldMap.refusals.filter((row) => row.requiredBeforeFiling)) {
    assert.ok(!/\b(?:Text\d+|Check Box\d+|undefined(?:_\d+)?)\b/.test(refusal.effectiveLabel),
      `opaque required-before-filing label remains: ${refusal.fieldId}`);
  }

  // Protected fields are blank in the map and carry no ink in the bytes.
  for (const documentId of ["CC-6-12", "CC-6-15.1"]) {
    assert.ok(!written.has(`${documentId}:datesigned`), `${documentId}: the date beside the signature must stay blank`);
  }

  // The source-presentation declarations bind the exact census and receipt.
  for (const row of fieldMap.refusals.filter((entry) => entry.sourcePresentation)) {
    const claim = row.sourcePresentation;
    const doc = census.documents.find((entry) => entry.formNumber === row.documentId);
    const source = receipt.documents.find((entry) => entry.formNumber === row.documentId);
    assert.ok(doc && source, `${row.fieldId}: source presentation names a document neither census nor receipt carries`);
    assert.equal(doc.sourceSha256, claim.sourceSha256, `${row.fieldId}: census digest does not bind the claim`);
    assert.equal(source.sha256, claim.sourceSha256, `${row.fieldId}: receipt digest does not bind the claim`);
    assert.equal(claim.sourceField, row.fieldName, `${row.fieldId}: source presentation names a different field`);
    const measured = doc.documentPolicy.sourceFieldEvidence[claim.sourceField];
    assert.ok(measured?.annotationFlags?.length, `${row.fieldId}: no first-hand widget evidence`);
    assert.ok(measured.annotationFlags.every((flags) => (flags & 4) === 0),
      `${row.fieldId}: declared a non-printing panel and its /F sets the Print bit`);
    assert.ok(doc.documentPolicy.nonprintingSourceControls.includes(claim.sourceField),
      `${row.fieldId}: not listed among the document's non-printing source controls`);
  }

  // The record's own words, quoted rather than retyped.
  const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === TRACK_ID);
  for (const stop of track.selfHelpStopConditions ?? []) {
    assert.ok(instructions.includes(stop), `stop condition missing from the guide: ${stop}`);
  }
  for (const item of track.exclusions ?? []) {
    assert.ok(instructions.includes(item), `exclusion missing from the guide: ${item}`);
  }
  for (const doc of track.supportingDocuments ?? []) {
    assert.ok(instructions.includes(doc.name), `supporting document missing from the guide: ${doc.name}`);
  }
  for (const rule of ["filing", "fees", "feeWaiver", "notice", "service", "notarization"]) {
    assert.ok(instructions.includes(track.rules[rule]), `the guide must quote the record's ${rule} sentence`);
  }
  assert.ok(filing.includes(track.rules.fees), "the filing guide must quote the record's fee sentence");

  // The registry's own before-filing list, every line of it.
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const packetSet = registry.tracks.find((entry) => entry.trackId === TRACK_ID).packetSet;
  for (const line of packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(line),
      `packetSet.requiredBeforeFiling line missing from the guide: ${line}`);
  }
  assert.equal(summary.registryRequiredBeforeFilingLinesCarried, packetSet.requiredBeforeFiling.length,
    "the build summary must record every registry before-filing line the guide carries");

  // Every component the registry names is either rendered or reported unbound.
  for (const component of packetSet.components) {
    const rendered = SOURCES.find((source) => source.componentId === component.componentId);
    const unbound = UNRENDERED_COMPONENTS.find((entry) => entry.componentId === component.componentId);
    assert.ok(rendered || unbound, `registry component unaccounted for: ${component.componentId}`);
    if (unbound) assert.ok(instructions.includes(unbound.componentId),
      `unbound component not surfaced to the participant: ${component.componentId}`);
  }

  // The record's release blockers reach the participant rather than the drawer.
  for (const question of (track.unresolvedQuestions ?? []).filter((entry) => entry.impact === "release_blocker")) {
    assert.ok(instructions.includes(question.question), `release blocker missing from the guide: ${question.question}`);
  }

  // No guide may direct notarization while the record says none is required.
  for (const [name, text] of [["participant-instructions.md", instructions], ["filing-instructions.md", filing]]) {
    assert.doesNotMatch(text, /(?:must|shall) (?:be |have (?:it|this|the motion) )?notariz/i, `${name} directs notarization`);
    assert.doesNotMatch(text, /have (?:it|this|the motion) notarized/i, `${name} directs notarization`);
  }

  // A guide that quotes an empty record, quotes it twice, or leaks an escape is
  // a guide nobody read. Checked on the delivered file, by hand and by rule.
  for (const [name, text] of [["participant-instructions.md", instructions], ["filing-instructions.md", filing]]) {
    assert.doesNotMatch(text, /""/, `${name} presents an empty quotation as the record speaking`);
    assert.doesNotMatch(text, /\\n|\\t|\\"/, `${name} carries a raw escape inside quoted text`);
    assert.doesNotMatch(text, /undefined|\[object Object\]|\bnull\b/, `${name} carries an unresolved value`);
    assert.doesNotMatch(text, /^(.+)\n\1$/m, `${name} carries a doubled line`);
    const headings = text.split("\n").filter((line) => /^#{1,6} /.test(line));
    assert.equal(new Set(headings).size, headings.length, `${name} carries a duplicated heading`);
  }

  // Nothing invisible, nothing on a refused field, nothing shortened -- and
  // these are read from the delivered bytes, not from the finalizer's report.
  for (const artifact of summary.deliveredInk) {
    assert.equal(artifact.invisibleWrites.length, 0, `${artifact.fixture}: a write is not visible in the delivered bytes`);
    assert.equal(artifact.refusedFieldsWithInk.length, 0, `${artifact.fixture}: a refused field carries ink in the delivered bytes`);
    assert.equal(artifact.incompleteValues.length, 0, `${artifact.fixture}: a held value did not read back complete from the delivered bytes`);
    assert.ok(artifact.addedGlyphsReadFromOutputBytes > 0, `${artifact.fixture}: no glyph was measured in any write box`);
    assert.equal(artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0,
      `${artifact.fixture}: this build added ink outside every measured write box`);
  }
}

// ---- build -------------------------------------------------------------------------

export async function build() {
  const record = controllingRecord();
  const sources = resolveSources();
  for (const source of sources) source.widgetEvidence = await measureWidgets(source);
  const out = path.join(ROOT, OUT_REL);

  const baselines = {};
  for (const source of sources) baselines[source.documentId] = await baselineInk(source);

  const packets = [];
  for (const variant of Object.values(VARIANTS)) {
    for (const fixture of Object.values(FIXTURES)) {
      const name = `${fixture.fixtureClass}--${variant.variantId}`;
      packets.push({ name, variant, fixture, ...(await buildPacket(sources, fixture, variant, baselines)) });
    }
  }

  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const packet of packets) fs.writeFileSync(path.join(out, "fixtures", `${packet.name}.pdf`), packet.bytes);

  const artifacts = packets.map((packet) => ({
    fixture: packet.name,
    fixtureClass: packet.fixture.fixtureClass,
    variant: packet.variant.variantId,
    dispositionType: packet.variant.dispositionType,
    dismissalReason: packet.variant.dismissalReason,
    electedAt: `CC-6-12 ${packet.variant.cc612Box}; CC-6-15.1 ${packet.variant.cc6151Boxes.join(" + ")}`,
    file: `${OUT_REL}/fixtures/${packet.name}.pdf`,
    sha256: sha256(packet.bytes),
    byteLength: packet.bytes.length,
    pageCount: packet.pageCount,
    pageManifest: packet.pageManifest
  }));

  const reference = packets.find((packet) => packet.name === "canonical--dismissed-prosecutor-motion");
  assert.ok(reference, "the canonical prosecutor-motion packet must exist");

  writeJson(path.join(out, "field-census.census-v1.json"), fieldCensus(sources, reference));

  writeJson(path.join(out, "production-field-map.json"), {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    describesFixture: reference.name,
    routeKeys: record.routeKeys,
    routeSummary: reference.variant.routeSummary,
    routeVariants: Object.values(VARIANTS).map((variant) => ({
      variantId: variant.variantId,
      dispositionType: variant.dispositionType,
      dismissalReason: variant.dismissalReason,
      cc612Election: `CC-6-12:${variant.cc612Box}`,
      cc6151Elections: variant.cc6151Boxes.map((box) => `CC-6-15.1:${box}`)
    })),
    writes: reference.writes.map(({ drawnText, ...row }) => row),
    refusals: reference.refusals
  });

  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2",
    familyId: FAMILY_ID,
    allSourcesExact: true,
    sources: sources.map(({ documentId, sourceId, componentId, path: sourcePath, sha256: digest, byteLength, componentKinds, custody, printedTitle }) => ({
      documentId, formNumber: documentId, sourceId, componentId, path: sourcePath, pathInArchive: sourcePath,
      sha256: digest, sha256Exact: true, byteLength, custody, componentKinds, printedTitle
    })),
    documents: sources.map(({ documentId, path: sourcePath, sha256: digest, byteLength }) => ({
      documentId, formNumber: documentId, pathInArchive: sourcePath, sha256: digest, byteLength
    })),
    controllingRecords: [
      { path: MEMO_PATH, sha256: record.memoDigest, trackId: TRACK_ID },
      { path: REGISTRY_PATH, sha256: record.registryDigest, packetSetId: PACKET_SET_ID }
    ]
  });

  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    documents: SOURCES.map((source) => ({
      documentId: source.documentId,
      formNumber: source.documentId,
      actualWrites: reference.writes.filter((row) => row.documentId === source.documentId)
    })),
    artifacts: packets.map((packet) => ({
      fixture: packet.name,
      valuesReportedByFinalizer: packet.writes.length,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      printedFormGlyphsInsideFieldRectsIgnored: packet.proof.printedFormGlyphsInsideFieldRectsIgnored,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues,
      danglingAnnotsPruned: packet.danglingAnnotsPruned,
      proof: packet.proof.proof
    }))
  });

  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2",
    familyId: FAMILY_ID,
    rasterState: "BUILT_RASTER_PENDING",
    whyRasterPending:
      "This container cannot resolve or fetch a Chromium the page rasterizer can execute (ENV-RAS01). Rendering is "
      + "central; visualDefects stays null because nobody has looked, not because there is nothing to see.",
    packets: packets.map((packet) => ({
      fixture: packet.name,
      file: `${OUT_REL}/fixtures/${packet.name}.pdf`,
      sha256: sha256(packet.bytes),
      byteLength: packet.bytes.length,
      pageCount: packet.pageCount,
      documents: SOURCES.map((source) => ({
        documentId: source.documentId,
        formNumber: source.documentId,
        componentId: source.componentId,
        componentKinds: source.componentKinds
      }))
    })),
    artifacts
  });

  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2",
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    implementationStrategy: "official_pdf_fill",
    routeKeys: record.routeKeys,
    components: [
      ...SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({
        kind, componentId: source.componentId, documentId: source.documentId, rendered: true
      }))),
      ...UNRENDERED_COMPONENTS.map((component) => ({
        kind: component.role, componentId: component.componentId, documentId: null, rendered: false, why: component.why
      }))
    ],
    artifacts,
    ownerDeterminationsSurfaced: [
      ...record.releaseBlockers.map((question) => ({
        what: `Release blocker recorded in ${MEMO_PATH}, track ${TRACK_ID}`,
        why: question.question,
        counselQuestion: question.provenance?.counselQuestion ?? null
      })),
      ...UNRENDERED_COMPONENTS.map((component) => ({
        what: `Registry component ${component.componentId} (${component.role}) is not rendered`,
        why: component.why
      }))
    ],
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    commercialRoutesOpened: 0,
    productionTouched: false
  });

  const required = reference.refusals.filter((row) => row.requiredBeforeFiling);
  const heldButUnprintable = required.filter((row) => row.factAvailable);
  const protectedBlanks = reference.refusals.filter((row) => row.refusalClass === "signature_or_date_participant_completion");
  assert.ok(protectedBlanks.length > 0,
    "both motions carry a signature date this packet must leave blank; none was classified as protected");
  writeGuides({
    out, record, artifacts, required, heldButUnprintable, protectedBlanks,
    captionEvidence: packets.flatMap((packet) => packet.captionEvidence),
    droppedNonPrinting: packets.flatMap((packet) => packet.droppedNonPrinting)
  });

  writeJson(path.join(out, "reports", "blanks-left-for-the-participant.json"), {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    describesFixture: reference.name,
    blanks: reference.refusals.map((row) => ({
      fieldId: row.fieldId,
      documentId: row.documentId,
      page: row.page,
      printedLabel: row.effectiveLabel,
      requiredBeforeFiling: row.requiredBeforeFiling === true,
      completenessDisposition: row.completenessDisposition ?? null,
      refusalClass: row.refusalClass ?? null,
      reason: row.reason
    }))
  });

  const counters = {
    knownRequiredFieldsMissing: 0,
    requiredFactsNotCollected: 0,
    unclassifiedBlanks: reference.refusals.filter((row) =>
      !row.refusalClass && !row.completenessDisposition && !row.role).length,
    incompleteRows: packets.reduce((sum, packet) => sum + packet.proof.incompleteValues.length, 0),
    requiredOptionsMissing: 0,
    requiredComponentsMissing: 0,
    invisibleWrites: packets.reduce((sum, packet) => sum + packet.proof.invisibleWrites.length, 0),
    protectedWrites: packets.reduce((sum, packet) => sum + packet.proof.refusedFieldsWithInk.length, 0),
    visualDefects: null
  };

  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId: FAMILY_ID,
    result: "BUILT_RASTER_PENDING",
    counters,
    countersMeasuredFrom:
      "invisibleWrites, protectedWrites and incompleteRows are read from the delivered packet bytes by "
      + "proveDeliveredInk; visualDefects is null because no raster was produced in this container",
    routeVariantsDelivered: Object.values(VARIANTS).map((variant) => variant.routeSummary),
    registryRequiredBeforeFilingLinesCarried: record.requiredBeforeFiling.length,
    captionEvidence: packets.flatMap((packet) => packet.captionEvidence),
    droppedNonPrintingWidgets: packets.flatMap((packet) => packet.droppedNonPrinting)
      .filter((row, index, rows) => rows.findIndex((other) => other.documentId === row.documentId && other.fieldName === row.fieldName) === index),
    unrenderedComponents: UNRENDERED_COMPONENTS,
    releaseBlockersSurfaced: record.releaseBlockers.map((question) => question.question),
    deliveredInk: packets.map((packet) => ({
      fixture: packet.name,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues
    })),
    artifacts,
    selfVerified: false
  });

  for (const packet of packets) {
    console.log(`${FAMILY_ID}/${packet.name}: ${packet.writes.length} writes, ${packet.refusals.length} classified blanks, `
      + `${packet.proof.addedGlyphsReadFromOutputBytes} glyphs measured in write boxes, `
      + `${packet.proof.invisibleWrites.length} invisible, ${packet.proof.refusedFieldsWithInk.length} refused-with-ink, `
      + `${packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes} outside every box, sha256=${sha256(packet.bytes)}`);
  }
  return { out, packets, artifacts };
}

// ---- negative controls -------------------------------------------------------------

/**
 * Each repair re-run against the SAME delivered bytes with the repair removed.
 * A control that cannot fail proves nothing about the reader that passes, so
 * every one of these asserts that the pre-repair behaviour FIRES.
 */
export async function negativeControls() {
  const sources = resolveSources();
  const baselines = {};
  for (const source of sources) baselines[source.documentId] = await baselineInk(source);
  const preRepairBaselines = {};
  for (const source of sources) preRepairBaselines[source.documentId] = await baselineInk(source, { respectPrintFlag: false });

  const results = [];
  for (const variant of Object.values(VARIANTS)) {
    for (const fixture of Object.values(FIXTURES)) {
      const name = `${fixture.fixtureClass}--${variant.variantId}`;
      const packet = await buildPacket(sources, fixture, variant, baselines);
      const manifest = { boxes: packet.boxes };

      const repaired = await proveDeliveredInk(packet.bytes, manifest, baselines);
      const noBaseline = await proveDeliveredInk(packet.bytes, manifest, baselines, { subtractBaseline: false });

      assert.equal(repaired.refusedFieldsWithInk.length, 0, `${name}: the repaired reader must report no refused field carrying ink`);
      assert.ok(noBaseline.refusedFieldsWithInk.length > 0,
        `${name}: CONTROL DID NOT FIRE - dropping the blank-form baseline must make the form's own printed ink read as writes`);

      /*
       * The flatten repair. The same fixture, the same variant, driven through
       * the pre-repair flatten that stamps every widget whatever its /F says.
       * The dropdown rectangles must then carry ink they do not carry now.
       */
      const stamped = await buildPacket(sources, fixture, variant, preRepairBaselines, { respectPrintFlag: false });
      const dropdownRects = [];
      for (const source of sources) {
        if (source.documentId === "CC-6-12a") continue;
        for (const binding of CAPTION_BINDINGS) {
          const measured = (await measureWidgets(source))[binding.choiceField];
          const offset = stamped.pageManifest.find((entry) => entry.documentId === source.documentId && entry.sourcePage === measured.page);
          for (const rect of measured.rects) {
            dropdownRects.push({ ...rect, packetPage: offset.packetPage, documentId: source.documentId, fieldName: binding.choiceField });
          }
        }
      }
      /*
       * A dropdown's rectangle also sits over the form's OWN printed guidance
       * and part of the printed caption, so ink inside it is not by itself the
       * defect. The defect is ink the repaired packet does not have. The two
       * builds are differenced run by run, and the control fires on what the
       * pre-repair flatten ADDS.
       */
      const runKey = (row) => `${row.packetPage}|${row.documentId}:${row.fieldName}|${row.text}@${row.x.toFixed(1)},${row.y.toFixed(1)}`;
      const stampedInk = await inkInsideRects(stamped.bytes, dropdownRects);
      const repairedInk = await inkInsideRects(packet.bytes, dropdownRects);
      const repairedKeys = new Set(repairedInk.map(runKey));
      const stampedKeys = new Set(stampedInk.map(runKey));
      const addedByPreRepairFlatten = stampedInk.filter((row) => !repairedKeys.has(runKey(row)));
      const lostByRepair = repairedInk.filter((row) => !stampedKeys.has(runKey(row)));
      assert.ok(addedByPreRepairFlatten.length > 0,
        `${name}: CONTROL DID NOT FIRE - a flatten that ignores /F must stamp the screen-only dropdowns onto the paper`);
      assert.equal(lostByRepair.length, 0,
        `${name}: detaching the screen-only controls removed ink the official form does print`);

      results.push({
        fixture: name,
        repairedReaderRefusedFieldsWithInk: repaired.refusedFieldsWithInk.length,
        preRepairNoBaselineSubtraction: noBaseline.refusedFieldsWithInk.length,
        preRepairFlattenAddedRuns: addedByPreRepairFlatten.length,
        preRepairFlattenAddedText: [...new Set(addedByPreRepairFlatten.map((row) => `${row.documentId}:${row.fieldName}="${row.text.trim()}"`))],
        repairRemovedInkTheFormDoesPrint: lostByRepair.length
      });
      console.log(`${name}: repaired=${repaired.refusedFieldsWithInk.length} refused-with-ink, `
        + `no-baseline=${noBaseline.refusedFieldsWithInk.length} (control fires), `
        + `pre-repair-flatten added ${addedByPreRepairFlatten.length} screen-control glyph runs the repaired packet does not carry `
        + `(control fires): ${[...new Set(addedByPreRepairFlatten.map((row) => `"${row.text.trim()}"`))].join(", ")}`);
    }
  }

  /*
   * Fit-or-refuse, in both shapes this build uses. A value that cannot be
   * printed complete is refused carrying its whole value, never shortened.
   */
  const cc612 = sources.find((source) => source.documentId === "CC-6-12");
  const probe = await PDFDocument.load(cc612.bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await probe.embedFont(StandardFonts.Helvetica);
  const narrow = probe.getForm().getField("Text5");
  const overlong = "X".repeat(400);
  const single = setComplete(narrow, overlong, font);
  assert.ok(single.refused, "CONTROL DID NOT FIRE - a value that cannot fit must be refused, not drawn");
  assert.equal(single.heldValue, overlong, "the refusal must carry the whole held value");
  assert.ok(!single.drawnText, "a refused value must not be drawn at all");
  assert.equal(narrow.getText() ?? "", "", "a refused value must leave the box empty rather than shortened");

  const lines = ["Text3", "Text4"].map((name) => probe.getForm().getField(name));
  const overlongCharges = "Aggravated".padEnd(11) .repeat(0) + Array.from({ length: 120 }, (_, i) => `Count${i}`).join(" ");
  const wrapped = setCompleteAcrossLines(lines, overlongCharges, font);
  assert.ok(wrapped.refused, "CONTROL DID NOT FIRE - a charge text that cannot fit two lines must be refused, not cut");
  assert.equal(wrapped.heldValue, overlongCharges, "the refusal must carry the whole held charge text");
  for (const field of lines) assert.equal(field.getText() ?? "", "", "a refused charge text must leave both lines empty");

  /* The election must follow the declared disposition and never double-elect. */
  for (const variant of Object.values(VARIANTS)) {
    const packet = await buildPacket(sources, FIXTURES.canonical, variant, baselines);
    const elected = packet.writes.filter((row) => row.factId === "matter.disposition_type").map((row) => row.fieldName);
    assert.deepEqual(elected, [variant.cc612Box], `${variant.variantId} must elect exactly ${variant.cc612Box} on CC 6:12`);
    const reasons = packet.writes.filter((row) => row.factId === "matter.dismissal_reason").map((row) => row.fieldName);
    assert.deepEqual(reasons.sort(), [...variant.cc6151Boxes].sort(),
      `${variant.variantId} must elect exactly ${variant.cc6151Boxes.join(" + ")} on CC 6:15.1`);
    for (const offRoute of Object.keys(OFF_ROUTE_CC612_OPTIONS)) {
      assert.ok(!elected.includes(offRoute), `${variant.variantId} must never elect the off-route option ${offRoute}`);
    }
  }

  console.log(`${FAMILY_ID}: ${results.length * 3 + Object.values(VARIANTS).length + 2} negative controls fired as designed`);
  return results;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const out = path.join(ROOT, OUT_REL);
  if (process.argv.includes("--negative-control")) {
    await negativeControls();
  } else if (process.argv.includes("--check")) {
    assertRepairInvariants(out);
    console.log(`${FAMILY_ID}: repair invariants PASS`);
  } else {
    await build();
    assertRepairInvariants(out);
    console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; repair invariants PASS`);
  }
}

export { FAMILY_ID, OUT_REL, VARIANTS, SOURCES, UNRENDERED_COMPONENTS, CAPTION_BINDINGS, setComplete, setCompleteAcrossLines };
