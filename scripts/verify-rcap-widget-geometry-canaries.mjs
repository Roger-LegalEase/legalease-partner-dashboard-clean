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

import { captureWidgetContext, pageRegions, groupIntoLines, extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { decideBinding } from "./rcap-official-forms/rcap-field-semantics.mjs";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PDFDocument, StandardFonts } = require(path.join(rootDir, "node_modules/pdf-lib"));

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
  `OK widget-geometry canaries — ${CANARIES.length} canaries hold across 2 measured fixtures, ` +
    `${MUTATIONS.length} mutations each turn their canary, and the printed label cannot unprotect a court-owned slot`
);
