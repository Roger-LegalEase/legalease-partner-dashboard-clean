#!/usr/bin/env node
// Canaries for the widget-context channel, and the mutations that prove each
// one is load-bearing.
//
//   node scripts/verify-rcap-widget-geometry-canaries.mjs
//
// The field-semantics canaries next door test decideBinding against field
// NAMES, which is all the binder used to see. These test the two channels it
// could not see: the caption a form prints beside a widget, and the printed
// section the widget sits in. Both are measured out of a real PDF's content
// streams by the shared capture module, so every canary here is a document
// this file builds, saves, reloads and measures — not a hand-written label
// string asserted against a matcher.
//
// Each fixture is the shape of a family the reviewer objected to, reduced to
// the smallest page that still reproduces the failure:
//
//   * VT 600-00228 — fields named as bare digits under printed captions. With
//     only the name channel a fee-waiver application filled nothing.
//   * AK TF-800 / NE DC 1:15 — an ordinarily-named field under a printed
//     "Certificate of Service". With only the name channel, the platform
//     signed and dated a sworn certification of service.
//
// The mutation half is what makes the canaries mean something. A canary can
// pass because the correction works or because it was never discriminating,
// and those look identical from outside. So each channel is removed from a
// copy of the call and the suite requires the matching canary to go red.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { captureWidgetContext, pageRegions, groupIntoLines, extractTextItems, extractPageGeometry } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { decideBinding, selectOnePerSlot, isChooserPrompt } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { sanitizeAndFlatten } from "./rcap-official-forms/rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PDFDocument, StandardFonts, PDFName } = require(path.join(rootDir, "node_modules/pdf-lib"));

const failures = [];
const note = (message) => failures.push(message);

/**
 * Builds one page, saves it, reloads it from its own bytes and measures it.
 *
 * Reloading matters: a document still in memory can answer from objects that a
 * saved file would not carry, and the channel being tested reads a content
 * stream. Measuring the bytes is the only way the canary describes what a
 * later reader would actually see.
 */
async function fixture(build) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  build({
    page, form,
    print: (text, x, y, size = 10) => page.drawText(text, { x, y, size, font }),
    field: (name, x, y, width, height = 14) => {
      const f = form.createTextField(name);
      f.addToPage(page, { x, y, width, height });
      return f;
    }
  });
  const bytes = await doc.save();
  const reloaded = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const reloadedPage = reloaded.getPages()[0];
  const widgets = reloaded.getForm().getFields().map((f) => {
    const rect = f.acroField.getWidgets()[0].getRectangle();
    return { name: f.getName(), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  });
  const contexts = captureWidgetContext(reloadedPage, widgets);
  return {
    page: reloadedPage,
    widgets,
    byName: new Map(contexts.map((c) => [c.name, c])),
    lines: groupIntoLines(extractTextItems(reloadedPage)),
    regions: pageRegions(reloadedPage)
  };
}

// ---------------------------------------------------------------------------
// Fixture 1 — VT 600-00228: bare-digit field names under printed captions.
// ---------------------------------------------------------------------------

const vt = await fixture(({ print, field }) => {
  print("APPLICATION TO WAIVE FILING FEES", 60, 740, 12);
  print("Name:", 60, 700);            field("2", 110, 696, 200);
  print("Street Address:", 60, 676);  field("3", 150, 672, 200);
  print("City:", 60, 652);            field("4", 100, 648, 120);
  print("Email:", 60, 628);           field("5", 105, 624, 200);
  // The negative control, and the reason the label channel cannot simply be
  // trusted: a bare-digit field under a caption the protect rules own.
  print("Judge:", 60, 604);           field("29", 105, 600, 200);
});

// ---------------------------------------------------------------------------
// Fixture 2 — AK TF-800 / NE DC 1:15: an ordinary name under a service heading.
// ---------------------------------------------------------------------------

const service = await fixture(({ print, field }) => {
  print("PETITION FOR EXPUNGEMENT", 60, 740, 12);
  print("Printed name of petitioner", 60, 700);
  // Same field name, twice, in two different printed sections. This is the
  // whole point of the geometry channel: the name is identical, so anything
  // that decides from the name alone must treat them identically, and one of
  // them is a sworn certification the platform must not sign.
  field("printedname", 240, 696, 200);
  print("CERTIFICATE OF SERVICE", 60, 400, 11);
  print("I certify that on", 60, 360);
  field("printedname_service", 170, 356, 90);
  print("Printed name", 60, 330);
  field("printedname2", 130, 326, 200);
});

// ---------------------------------------------------------------------------
// The canaries.
// ---------------------------------------------------------------------------

const decide = (fx, name) => {
  const context = fx.byName.get(name) ?? {};
  return decideBinding(
    { name, pdfType: "text", effectiveLabel: context.effectiveLabel, regionHeading: context.regionHeading,
      regionIsDocumentTitle: context.regionIsDocumentTitle },
    {}
  );
};

const CANARIES = [
  {
    id: "LABEL-VT-NAME", family: "VT:600-00228-support-en", fx: vt, field: "2",
    expect: (r) => r.writable === true && r.factId === "participant.full_legal_name" && r.factBasis === "printed_label",
    consequence: "a fee-waiver application carrying none of the applicant's information — no name, no address, no explanation"
  },
  {
    id: "LABEL-VT-STREET", family: "VT:600-00228-support-en", fx: vt, field: "3",
    expect: (r) => r.writable === true && r.factId === "participant.street_address" && r.factBasis === "printed_label",
    consequence: "the applicant's street address blank on a form that requires it"
  },
  {
    id: "LABEL-VT-CITY", family: "VT:600-00228-support-en", fx: vt, field: "4",
    expect: (r) => r.writable === true && r.factId === "participant.city",
    consequence: "the applicant's city blank"
  },
  {
    id: "LABEL-VT-EMAIL", family: "VT:600-00228-support-en", fx: vt, field: "5",
    expect: (r) => r.writable === true && r.factId === "participant.email",
    consequence: "the applicant's email blank on a form whose rules require a contact address"
  },
  {
    // The label channel must not become a way around the protect rules. A
    // caption that names the court's own slot protects the widget exactly as a
    // field name would.
    id: "LABEL-DOES-NOT-UNPROTECT", family: "control", fx: vt, field: "29",
    expect: (r) => r.writable === false && r.category === "court",
    consequence: "the participant's name printed on the judge's line, reached through the new channel"
  },
  {
    id: "GEOMETRY-SERVICE-BLOCK", family: "NE:dc-1-15-form-en", fx: service, field: "printedname_service",
    expect: (r) => r.writable === false && (r.reason === "protected_page_region" || r.reason === "protected_category") && r.category === "service_block",
    consequence: "the participant's name written into a sworn certification of service the platform has no knowledge of"
  },
  {
    id: "GEOMETRY-SERVICE-BLOCK-INNOCUOUS", family: "AK:tf-800-form-en", fx: service, field: "printedname2",
    expect: (r) => r.writable === false && r.reason === "protected_page_region" && r.category === "service_block",
    consequence: "an innocuously-named field under a Certificate of Service heading taking the participant's name — the exact case a rename would hide from a name-only rule"
  },
  {
    // The other direction. A correction that refuses everything is an outage.
    id: "GEOMETRY-STILL-BINDS", family: "control", fx: service, field: "printedname",
    expect: (r) => r.writable === true && r.factId === "participant.full_legal_name",
    consequence: "the petitioner's name would stop printing on the petition itself"
  }
];

console.log("  measured channels");
for (const [label, fx, name] of [["VT bare-digit 2", vt, "2"], ["service printedname2", service, "printedname2"]]) {
  const c = fx.byName.get(name);
  console.log(`    ${label.padEnd(24)} label=${JSON.stringify(c.effectiveLabel)} (${c.labelBasis}) region=${JSON.stringify(c.regionHeading)}`);
}

console.log("  canaries");
for (const canary of CANARIES) {
  const result = decide(canary.fx, canary.field);
  const passed = canary.expect(result);
  console.log(`    ${passed ? "ok  " : "FAIL"} ${canary.id.padEnd(32)} ${canary.field.padEnd(20)} → ${result.writable ? `writes ${result.factId} via ${result.factBasis}` : `refused ${result.reason}${result.category ? `/${result.category}` : ""}`}`);
  if (!passed) note(`${canary.id} (${canary.family}): ${canary.consequence}`);
}

// ---------------------------------------------------------------------------
// Mutations. Each removes one channel and requires its canary to go red.
//
// These mutate the CALL, not the repository: the channel is withheld from
// decideBinding exactly as the pre-correction driver withheld it. Nothing on
// disk is touched, so there is no tracked byte to restore and no way for a
// repository mutation lock to be mistaken for a detection.
// ---------------------------------------------------------------------------

const MUTATIONS = [
  {
    id: "withhold the printed label", fx: vt, field: "2",
    run: (fx, name) => decideBinding({ name, pdfType: "text", regionHeading: fx.byName.get(name)?.regionHeading,
      regionIsDocumentTitle: fx.byName.get(name)?.regionIsDocumentTitle }, {}),
    detected: (r) => r.writable === false && r.reason === "no_allowlisted_fact_matches",
    proves: "the label channel is the only reason VT 600-00228's numbered fields bind at all"
  },
  {
    id: "withhold the printed label", fx: vt, field: "3",
    run: (fx, name) => decideBinding({ name, pdfType: "text", regionHeading: fx.byName.get(name)?.regionHeading,
      regionIsDocumentTitle: fx.byName.get(name)?.regionIsDocumentTitle }, {}),
    detected: (r) => r.writable === false && r.reason === "no_allowlisted_fact_matches",
    proves: "the same, on the street-address line"
  },
  {
    id: "withhold the region heading", fx: service, field: "printedname2",
    run: (fx, name) => decideBinding({ name, pdfType: "text", effectiveLabel: fx.byName.get(name)?.effectiveLabel }, {}),
    detected: (r) => r.writable === true && r.factId === "participant.full_legal_name",
    proves: "geometry is the only thing standing between the platform and a signed certification of service"
  },
  {
    // The reviewer's own mutation, run as they specified it: rename a
    // protected field to something innocuous and re-derive. Under a name-only
    // rule the rename wins; under the geometry channel it changes nothing.
    id: "rename the protected field", fx: service, field: "printedname_service",
    run: (fx) => decideBinding({ name: "f0042", pdfType: "text", effectiveLabel: null,
      regionHeading: fx.byName.get("printedname_service")?.regionHeading,
      regionIsDocumentTitle: fx.byName.get("printedname_service")?.regionIsDocumentTitle }, {}),
    detected: (r) => r.writable === false && r.reason === "protected_page_region" && r.category === "service_block",
    inverted: true,
    proves: "renaming a protected field does not move it off the page — the refusal survives the rename"
  }
];

console.log("  mutations");
for (const mutation of MUTATIONS) {
  const mutated = mutation.run(mutation.fx, mutation.field);
  const detected = mutation.detected(mutated);
  const verb = mutation.inverted ? "holds" : "goes red";
  console.log(`    ${detected ? "ok  " : "FAIL"} ${mutation.id.padEnd(30)} ${mutation.field.padEnd(20)} ${verb} → ${mutated.writable ? `writes ${mutated.factId}` : `refused ${mutated.reason}`}`);
  if (!detected) {
    note(`mutation "${mutation.id}" on ${mutation.field} did not ${verb} — ${mutation.proves}, and this mutation does not show it, so the canary that covers it proves nothing`);
  }
}

// ---------------------------------------------------------------------------
// The caption band — ESC-CAPTION-VARIANTS.
//
// Nebraska's five families share one caption block. CC 6:12 carries three
// widgets that all legitimately match matter.court, overlapping between x 138
// and x 242, and the page rendered "District Court" twice about 5pt apart over
// the court's own printed words. The rects below are CC 6:12's, read from its
// committed field census.
// ---------------------------------------------------------------------------

const NE_CAPTION_BAND = [
  { name: "TYPEOFCOURTRESULTS", factId: "matter.court", pdfType: "text", page: 1, rect: { x: 43, y: 672, width: 237, height: 18 } },
  { name: "TYPEOFCOURTDROPDOWN", factId: "matter.court", pdfType: "dropdown", page: 1, rect: { x: 142, y: 659, width: 79, height: 14 } },
  { name: "enter the type of court", factId: "matter.court", pdfType: "text", page: 1, rect: { x: 138, y: 659, width: 104, height: 27 } },
  { name: "enter the county", factId: "matter.county", pdfType: "text", page: 1, rect: { x: 277, y: 659, width: 104, height: 27 } },
  // The negative control, and it is the reason the rule is overlap rather than
  // "one widget per fact". A form that prints the filer's name in the caption
  // and again above the signature line is not defective, and both must survive.
  { name: "printedname", factId: "participant.full_legal_name", pdfType: "text", page: 1, rect: { x: 60, y: 200, width: 200, height: 14 } },
  { name: "signatureprintedname", factId: "participant.full_legal_name", pdfType: "text", page: 1, rect: { x: 60, y: 120, width: 200, height: 14 } }
];

// NC AOC-CR-287, from its committed field census. The previous lane closed
// seven of its eight drifting families and left this one open in writing: a
// refuseWhen guard cannot fix two widgets competing for one fact, and it named
// ESC-GEOMETRY-NOT-AN-INPUT as whose territory that was. Address line 1 and
// address line 2 are stacked and share a point of vertical overlap, so the
// slot pass reaches them and the street address prints once, on line 1.
const NC_ADDRESS_LINES = [
  { name: "PetitionerAddr1", factId: "participant.street_address", pdfType: "text", page: 1, rect: { x: 37, y: 667, width: 278, height: 13 } },
  { name: "PetitionerAddr2", factId: "participant.street_address", pdfType: "text", page: 1, rect: { x: 37, y: 655, width: 278, height: 13 } },
  { name: "PetitionerCity", factId: "participant.city", pdfType: "text", page: 1, rect: { x: 37, y: 640, width: 120, height: 13 } }
];
const ncArbitrated = selectOnePerSlot(NC_ADDRESS_LINES);

const arbitrated = selectOnePerSlot(NE_CAPTION_BAND);
const keptNames = arbitrated.kept.map((k) => k.name);

console.log("  caption slots");
console.log(`    kept    ${keptNames.join(", ")}`);
console.log(`    refused ${arbitrated.refused.map((r) => `${r.name} → kept ${r.keptInstead}`).join("; ") || "(none)"}`);

const SLOT_CANARIES = [
  {
    id: "SLOT-ONE-COURT-VALUE", family: "NE:cc-6-12-form-en",
    holds: () => arbitrated.kept.filter((k) => k.factId === "matter.court").length === 1,
    consequence: "\"District Court\" printed twice about 5pt apart, over the court's own printed caption words"
  },
  {
    id: "SLOT-DROPDOWN-LOSES", family: "NE:cc-6-12-form-en",
    holds: () => arbitrated.refused.some((r) => r.name === "TYPEOFCOURTDROPDOWN"),
    consequence: "the slot decided in favour of a widget that renders from the source's own appearance stream, which is what carries the placeholder"
  },
  {
    id: "SLOT-COUNT-CONSERVED", family: "NE:cc-6-12-form-en",
    holds: () => arbitrated.kept.length + arbitrated.refused.length === NE_CAPTION_BAND.length,
    consequence: "a field silently dropped from the map, so the family package no longer accounts for every widget"
  },
  {
    id: "SLOT-NON-OVERLAPPING-SURVIVE", family: "control",
    holds: () => keptNames.includes("printedname") && keptNames.includes("signatureprintedname"),
    consequence: "the signature-block name would stop printing because the caption already carries one"
  },
  {
    id: "SLOT-OTHER-FACTS-UNTOUCHED", family: "control",
    holds: () => keptNames.includes("enter the county"),
    consequence: "the county would stop printing"
  },
  {
    id: "SLOT-NC-287-ADDRESS-ONCE", family: "NC:aoc-cr-287-form-en",
    holds: () => ncArbitrated.kept.filter((k) => k.factId === "participant.street_address").length === 1
      && ncArbitrated.kept.some((k) => k.name === "PetitionerAddr1"),
    consequence: "the petitioner's street address printed on both address lines — the finding the previous lane could not close and deferred to this one"
  },
  {
    id: "SLOT-NC-287-CITY-KEPT", family: "NC:aoc-cr-287-form-en",
    holds: () => ncArbitrated.kept.some((k) => k.name === "PetitionerCity"),
    consequence: "the city line silenced by an arbitration that reached past the fact it was deciding"
  }
];

for (const canary of SLOT_CANARIES) {
  const passed = canary.holds();
  console.log(`    ${passed ? "ok  " : "FAIL"} ${canary.id}`);
  if (!passed) note(`${canary.id} (${canary.family}): ${canary.consequence}`);
}

// ---------------------------------------------------------------------------
// The chooser prompt, proven on flattened bytes rather than asserted.
// ---------------------------------------------------------------------------

async function flattenedTextAfter(mutate) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  const dropdown = form.createDropdown("TYPEOFCOURTDROPDOWN");
  dropdown.addOptions(["Choose the court", "DISTRICT", "COUNTY"]);
  dropdown.select("Choose the court");
  dropdown.addToPage(page, { x: 142, y: 659, width: 79, height: 14, font });
  const source = await doc.save();

  const loaded = await PDFDocument.load(source, { ignoreEncryption: true, updateMetadata: false });
  const helvetica = await loaded.embedFont(StandardFonts.Helvetica);
  mutate(loaded.getForm(), loaded);
  const { clean } = await sanitizeAndFlatten(loaded, { defaultFont: helvetica });
  const out = await clean.save({ useObjectStreams: false, updateMetadata: false });
  const reloaded = await PDFDocument.load(out, { ignoreEncryption: true });
  return groupIntoLines(extractPageGeometry(reloaded.getPages()[0]).text).map((l) => l.text);
}

/** What the finalizer now does to an unselected chooser: value AND appearance. */
const suppressPrompt = (form) => {
  const handle = form.getDropdown("TYPEOFCOURTDROPDOWN");
  if (!handle.getSelected().some((v) => isChooserPrompt(v, handle.getOptions()))) return;
  handle.acroField.dict.delete(PDFName.of("V"));
  for (const widget of handle.acroField.getWidgets()) widget.dict.delete(PDFName.of("AP"));
};

const promptLeftAlone = await flattenedTextAfter(() => {});
const promptSuppressed = await flattenedTextAfter(suppressPrompt);
const promptValueOnly = await flattenedTextAfter((form) => {
  form.getDropdown("TYPEOFCOURTDROPDOWN").acroField.dict.delete(PDFName.of("V"));
});
const realSelection = await flattenedTextAfter((form) => form.getDropdown("TYPEOFCOURTDROPDOWN").select("DISTRICT"));

console.log("  chooser prompt, on flattened bytes");
console.log(`    left alone     → ${JSON.stringify(promptLeftAlone)}`);
console.log(`    suppressed     → ${JSON.stringify(promptSuppressed)}`);
console.log(`    value only     → ${JSON.stringify(promptValueOnly)}`);
console.log(`    real selection → ${JSON.stringify(realSelection)}`);

if (promptSuppressed.some((t) => /choose the court/i.test(t))) {
  note("PROMPT-SUPPRESSED: the source's chooser prompt survives finalization and is drawn onto the filed page as ordinary ink");
}
if (!realSelection.includes("DISTRICT")) {
  note("PROMPT-STILL-WRITES: a dropdown the finalizer selected does not render its value — suppression has broken the ordinary path");
}
if (!isChooserPrompt("Choose the court", ["Choose the court", "DISTRICT"]) || isChooserPrompt("DISTRICT", ["Choose the court", "DISTRICT"])) {
  note("PROMPT-RECOGNITION: isChooserPrompt no longer separates a prompt from a selection");
}

console.log("  mutations, caption band");
const SLOT_MUTATIONS = [
  {
    id: "arbitrate by fact alone, ignoring overlap",
    detected: () => {
      const byFact = new Map();
      for (const c of NE_CAPTION_BAND) if (!byFact.has(c.factId)) byFact.set(c.factId, c);
      return !([...byFact.values()].map((c) => c.name).includes("signatureprintedname"));
    },
    proves: "overlap is what separates a duplicate from a legitimate repeat; dropping it takes the signature-block name with it"
  },
  {
    id: "withhold the widget rectangles",
    detected: () => {
      const blind = selectOnePerSlot(NE_CAPTION_BAND.map((c) => ({ ...c, rect: null })));
      return blind.refused.length === 0 && blind.kept.length === NE_CAPTION_BAND.length;
    },
    proves: "the arbitration is geometric; with no rectangles it correctly refuses nothing, which is exactly the pre-correction behaviour"
  },
  {
    id: "clear the prompt value but keep its appearance stream",
    detected: () => promptValueOnly.some((t) => /choose the court/i.test(t)),
    proves: "deleting /V alone leaves the prompt rendering from the stale appearance stream, so the appearance must go too"
  },
  {
    id: "leave the unselected chooser alone",
    detected: () => promptLeftAlone.some((t) => /choose the court/i.test(t)),
    proves: "without suppression the prompt reaches the filed page — the baseline failure the reviewer read on five Nebraska families"
  }
];
for (const mutation of SLOT_MUTATIONS) {
  const detected = mutation.detected();
  console.log(`    ${detected ? "ok  " : "FAIL"} ${mutation.id}`);
  if (!detected) note(`mutation "${mutation.id}" changed nothing — ${mutation.proves}, and this mutation does not show it`);
}

// The capture itself has to be reaching the document, not returning empty and
// passing by vacuum. A suite whose fixtures measure nothing would report every
// "refused" canary green.
if (!vt.byName.get("2")?.effectiveLabel) note("the capture module read no caption for VT's field 2; the fixtures are not being measured");
if (!service.regions.some((r) => /certificate of service/i.test(r.heading))) {
  note("the capture module found no Certificate of Service region in the service fixture; the fixtures are not being measured");
}

if (failures.length) {
  console.error(`FAIL widget-geometry canaries — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK widget-geometry canaries — ${CANARIES.length + SLOT_CANARIES.length} canaries hold across 3 measured fixtures, ` +
    `${MUTATIONS.length + SLOT_MUTATIONS.length} mutations each turn their canary, the printed label cannot unprotect a ` +
    `court-owned slot, and no chooser prompt survives onto a filed page`
);
