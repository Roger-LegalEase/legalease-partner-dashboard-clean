// Deterministic canary forms for the D0 official-form factory.
//
// These are synthesized rather than copied from a state package, for three
// reasons: the factory must be testable without the private source bundle;
// every defect class F3 found needs a case that provably exercises it, and a
// real form happens to contain only some of them; and a synthesized source is
// byte-stable, so drift detection can be tested by deliberately perturbing it.
//
// Three canaries, matching the three shapes the factory has to handle:
//
//   acroform  a petition with widgets, including a value that must shrink, a
//             value that cannot be made readable at all, a multiline
//             narrative, a charge table with more rows than charges, and one
//             field for every protected category;
//   flat      a printed form with no widgets, whose values sit on rule lines;
//   scripted  an AcroForm carrying every kind of active content the sanitizer
//             is required to remove.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFString, PDFArray, PDFDict, StandardFonts, rgb } = require("pdf-lib");

const STAMP = new Date("2026-01-01T00:00:00Z");

function finishDeterministically(doc) {
  doc.setProducer("LegalEase RCAP D0 canary");
  doc.setCreator("LegalEase RCAP D0 canary");
  doc.setCreationDate(STAMP);
  doc.setModificationDate(STAMP);
}

/**
 * Canary 1 — an AcroForm petition.
 *
 * Widget widths are chosen deliberately: `petitionerName` is wide enough for a
 * short name but not the boundary name, so it must shrink; `crampedCaseNumber`
 * is too small for its value at any readable size, so it must be refused.
 */
export async function buildAcroFormCanary() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();

  page.drawText("PETITION TO SEAL A CRIMINAL RECORD", { x: 120, y: 745, size: 13, font: bold });
  page.drawText("D0 CANARY — NOT AN OFFICIAL FORM", { x: 170, y: 730, size: 8, font, color: rgb(0.45, 0.45, 0.45) });

  const label = (text, x, y) => page.drawText(text, { x, y, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
  const text = (name, x, y, w, h, opts = {}) => {
    label(opts.label ?? name, x, y + h + 2);
    const f = form.createTextField(name);
    if (opts.multiline) f.enableMultiline();
    if (opts.maxLength) f.setMaxLength(opts.maxLength);
    f.addToPage(page, { x, y, width: w, height: h, borderWidth: 0.5, borderColor: rgb(0.6, 0.6, 0.6) });
    return f;
  };

  // Participant block. petitionerName is intentionally narrow.
  text("petitionerName", 40, 690, 150, 14, { label: "Petitioner Name" });
  text("DateOfBirth", 210, 690, 110, 14, { label: "Date of Birth" });
  text("caseNumber", 340, 690, 150, 14, { label: "Case No." });
  text("PetitionerAddr1", 40, 655, 240, 14, { label: "Street Address" });
  text("PetitionerCity", 300, 655, 120, 14, { label: "City" });
  text("PetitionerZip", 435, 655, 60, 14, { label: "Zip" });
  text("countyName", 40, 620, 180, 14, { label: "County" });

  // Too small for its value at any readable size: must fail closed.
  text("crampedCaseNumber", 300, 620, 26, 9, { label: "Cramped Case No." });

  // Multiline narrative: must wrap rather than overflow.
  text("statementOfFacts", 40, 540, 460, 60, { label: "Statement (multiline)", multiline: true });

  // Charge table: three rows, and the canonical fact set supplies one charge.
  for (let i = 1; i <= 3; i += 1) {
    const y = 500 - (i - 1) * 22;
    text(`FileNumber${i}`, 40, y, 120, 14, { label: `Charge row ${i} — file no.` });
    text(`OffenseDescription${i}`, 175, y, 200, 14, { label: `Charge row ${i} — offense` });
    text(`DateOfArrest${i}`, 390, y, 110, 14, { label: `Charge row ${i} — arrest date` });
  }

  // One field per protected category. None of these may ever be written.
  const protectedFields = [
    ["totalFeesDue", "Total Fees Due ($)"],
    ["defendantRace", "Race"],
    ["judgeSignature", "Judge Signature"],
    ["clerkFileStamp", "Clerk File Stamp"],
    ["notaryCommissionExpires", "My Commission Expires"],
    ["certificateOfServiceDate", "Certificate of Service — Date Served"],
    ["arrestingAgencyAddress", "Arresting Agency Address"],
    ["licensingBoardName", "Licensing Board"],
    ["prosecutingAttorneyName", "Prosecuting Attorney"],
    ["petitionersAttorneyBarNo", "Attorney Bar No."],
    ["responsibleOfficialName", "Responsible Official"],
    ["victimName", "Victim Name"],
    ["dispositionOfPetition", "Disposition Of Petition"]
  ];
  protectedFields.forEach(([name, labelText], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    text(name, 40 + col * 165, 400 - row * 30, 150, 12, { label: labelText });
  });

  // A checkbox: an election, never a transcribed fact.
  label("I request a hearing", 40, 262);
  form.createCheckBox("requestHearing").addToPage(page, { x: 175, y: 258, width: 10, height: 10 });

  finishDeterministically(doc);
  return doc.save({ useObjectStreams: false });
}

/** Canary 2 — a flat printed form: rule lines, no widgets. */
export async function buildFlatOverlayCanary() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("MOTION TO SEAL — D0 FLAT CANARY", { x: 140, y: 745, size: 13, font: bold });
  const rule = (x, y, w) => page.drawRectangle({ x, y, width: w, height: 0.6, color: rgb(0, 0, 0) });

  page.drawText("IN THE CIRCUIT COURT OF", { x: 60, y: 690, size: 10, font });
  rule(200, 688, 150);
  page.drawText(", STATE OF EXAMPLE", { x: 356, y: 690, size: 10, font });

  page.drawText("Case No.", { x: 60, y: 660, size: 10, font });
  rule(112, 658, 160);

  page.drawText("Petitioner Name", { x: 60, y: 600, size: 8, font });
  rule(60, 612, 240);

  page.drawText("Date of Birth", { x: 330, y: 600, size: 8, font });
  rule(330, 612, 180);

  page.drawText("Address", { x: 60, y: 560, size: 8, font });
  rule(60, 572, 240);

  page.drawText("County", { x: 330, y: 560, size: 8, font });
  rule(330, 572, 180);

  // A signature rule the overlay must never write on.
  page.drawText("Signature of Petitioner", { x: 60, y: 500, size: 8, font });
  rule(60, 512, 240);

  finishDeterministically(doc);
  return doc.save({ useObjectStreams: false });
}

/**
 * Canary 3 — an AcroForm carrying every active-content form the sanitizer must
 * remove: document-level JavaScript and OpenAction, a field additional-actions
 * script, Launch/SubmitForm/ImportData actions, a URI link annotation and an
 * XFA key.
 */
export async function buildScriptedCanary() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 400]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  page.drawText("RECORD REQUEST — D0 SCRIPTED CANARY", { x: 120, y: 350, size: 12, font });
  page.drawText("Petitioner Name", { x: 40, y: 300, size: 8, font });
  const nameField = form.createTextField("petitionerName");
  nameField.addToPage(page, { x: 40, y: 280, width: 240, height: 16 });
  page.drawText("Case No.", { x: 320, y: 300, size: 8, font });
  form.createTextField("caseNumber").addToPage(page, { x: 320, y: 280, width: 160, height: 16 });

  const ctx = doc.context;
  const jsAction = ctx.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("app.alert('canary');") });

  // Document-level JavaScript, reachable through the name tree.
  const jsName = ctx.obj({
    Names: ctx.obj([PDFString.of("canaryScript"), ctx.register(jsAction)])
  });
  doc.catalog.set(PDFName.of("Names"), ctx.obj({ JavaScript: ctx.register(jsName) }));

  // Fires on open.
  doc.catalog.set(PDFName.of("OpenAction"), ctx.register(ctx.obj({
    S: PDFName.of("JavaScript"), JS: PDFString.of("this.print();")
  })));

  // Document-level additional actions.
  doc.catalog.set(PDFName.of("AA"), ctx.obj({
    WC: ctx.register(ctx.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("app.alert('closing');") }))
  }));

  // Field-level keystroke and calculate scripts on a real widget.
  const widgets = nameField.acroField.getWidgets();
  if (widgets.length > 0) {
    widgets[0].dict.set(PDFName.of("AA"), ctx.obj({
      K: ctx.register(ctx.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("event.value = event.value.toUpperCase();") })),
      C: ctx.register(ctx.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("AFSimple_Calculate('SUM', ['a']);") }))
    }));
  }
  const acro = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (acro) {
    // A calculation order list, and an XFA packet.
    acro.set(PDFName.of("CO"), ctx.obj([nameField.acroField.ref]));
    acro.set(PDFName.of("XFA"), ctx.obj([
      PDFString.of("preamble"),
      ctx.register(ctx.flateStream("<xdp:xdp xmlns:xdp='http://ns.adobe.com/xdp/'></xdp:xdp>"))
    ]));
  }

  // Launch, SubmitForm, ImportData and a URI link, as page annotations.
  const annots = [
    { S: PDFName.of("Launch"), F: PDFString.of("payload.exe") },
    { S: PDFName.of("SubmitForm"), F: PDFString.of("https://example.invalid/collect") },
    { S: PDFName.of("ImportData"), F: PDFString.of("data.fdf") },
    { S: PDFName.of("URI"), URI: PDFString.of("https://example.invalid/help") }
  ].map((action, i) => ctx.register(ctx.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of("Link"),
    Rect: ctx.obj([40 + i * 120, 200, 150 + i * 120, 216]),
    A: ctx.register(ctx.obj(action))
  })));

  const existing = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  if (existing) for (const a of annots) existing.push(a);
  else page.node.set(PDFName.of("Annots"), ctx.obj(annots));

  finishDeterministically(doc);
  return doc.save({ useObjectStreams: false });
}

/**
 * Canary 4 — a hand-assembled PDF carrying the residue pdf-lib refuses to
 * write.
 *
 * pdf-lib drops the XFA packet when it saves ("Removing XFA form data..."), so
 * an XFA-bearing source cannot be produced through its API at all. Rather than
 * leave XFA, remote-goto and rich-media residue untested, this assembles the
 * file directly: object bodies are emitted in order, their byte offsets
 * recorded, and a correct xref table written from those offsets. The result is
 * a real PDF that PDFDocument.load accepts.
 */
export function buildXfaResidueCanary() {
  const objects = [
    // 1: catalog
    `<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [] /XFA [ (preamble) 6 0 R ] >> `
      + `/Names << /JavaScript 7 0 R >> /OpenAction << /S /JavaScript /JS (app.alert\('x'\);) >> >>`,
    // 2: page tree
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    // 3: page, with a remote-goto and a rich-media annotation
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> `
      + `/Annots [ << /Type /Annot /Subtype /Link /Rect [10 10 90 30] /A << /S /GoToR /F (other.pdf) >> >> `
      + `<< /Type /Annot /Subtype /RichMedia /Rect [100 10 180 30] >> ] >>`,
    // 4: content stream
    `<< /Length 62 >>\nstream\nBT /F1 10 Tf 20 150 Td (D0 XFA RESIDUE CANARY) Tj ET\nendstream`,
    // 5: font
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    // 6: the XFA packet itself
    `<< /Length 48 >>\nstream\n<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"/>\nendstream`,
    // 7: document JavaScript name tree
    `<< /Names [ (canary) << /S /JavaScript /JS (this.print\(\);) >> ] >>`
  ];

  let pdf = "%PDF-1.7\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

// Text that must never reach a filed artifact, and text that must always
// survive to it. Both are asserted by name, so a change in either direction is
// a test failure rather than a judgement call.
export const PRINT_FLAG_CANARY = {
  officialPrintedText: "PETITION FOR EXPUNGEMENT OF ARREST RECORDS",
  officialPrintedLabel: "Petitioner Name",
  hiddenHelperText: "The items in this box will NOT print on your form.",
  noViewHelperText: "Internal routing code QX-7741",
  resetCaption: "Reset",
  clearFormCaption: "Clear Form",
  printCaption: "Print Form",
  printableFieldName: "petitionerName",
  hiddenFieldName: "helperNotice",
  noViewFieldName: "internalRouting"
};

/**
 * Canary 5 — a form whose widgets disagree about whether they print.
 *
 * Real official forms carry helper text and control buttons that the issuing
 * authority marked as non-printing, and the D wave's review found them
 * flattened into filed artifacts: Nebraska's DC-6-7-2 printed "The items in
 * this box will NOT print on your form." onto a court filing, and eight forms
 * printed a "Reset" caption. This reproduces that shape.
 *
 * The official text drawn into page content is the control: flattening must
 * never remove it, so a fix that suppresses too much fails here too.
 */
export async function buildPrintFlagCanary() {
  const C = PRINT_FLAG_CANARY;
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 500]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();

  // Legitimate printed official text: page content, not an annotation. No
  // flag logic may touch it.
  page.drawText(C.officialPrintedText, { x: 90, y: 450, size: 12, font: bold });
  page.drawText(C.officialPrintedLabel, { x: 40, y: 405, size: 8, font });
  page.drawText("Case No.", { x: 340, y: 405, size: 8, font });

  // The /F entry is set on the widget after it is placed, because pdf-lib
  // writes its own flags when it adds an annotation to a page.
  const flag = (field, value) => {
    for (const w of field.acroField.getWidgets()) w.dict.set(PDFName.of("F"), doc.context.obj(value));
  };

  // Printable participant fields: Print (4) set, as 99.4% of real text widgets
  // in the source corpus have it.
  const name = form.createTextField(C.printableFieldName);
  name.addToPage(page, { x: 40, y: 385, width: 240, height: 16 });
  flag(name, 4);

  const caseNo = form.createTextField("caseNumber");
  caseNo.addToPage(page, { x: 340, y: 385, width: 160, height: 16 });
  flag(caseNo, 4);

  // A hidden helper: Hidden (2) and Print (4) both set, which is how a form
  // marks guidance that is visible on screen only. Honoring Print alone would
  // let this through, so the Hidden bit has to be tested independently.
  const helper = form.createTextField(C.hiddenFieldName);
  helper.setText(C.hiddenHelperText);
  helper.enableMultiline();
  helper.addToPage(page, { x: 40, y: 300, width: 460, height: 40 });
  flag(helper, 2 | 4);

  // A NoView field: it prints but is never displayed. Present so the flag test
  // cannot be reduced to "Print is set".
  const routing = form.createTextField(C.noViewFieldName);
  routing.setText(C.noViewHelperText);
  routing.addToPage(page, { x: 40, y: 270, width: 240, height: 16 });
  flag(routing, 32 | 4);

  // Control buttons: no /F entry at all, which means zero, which means they do
  // not print. This is exactly how the Arizona, Nebraska and New Hampshire
  // forms in the corpus mark theirs.
  const reset = form.createButton("resetButton");
  reset.addToPage(C.resetCaption, page, { x: 40, y: 220, width: 72, height: 20, font });
  for (const w of reset.acroField.getWidgets()) w.dict.delete(PDFName.of("F"));

  const clear = form.createButton("clearFormButton");
  clear.addToPage(C.clearFormCaption, page, { x: 130, y: 220, width: 90, height: 20, font });
  for (const w of clear.acroField.getWidgets()) w.dict.delete(PDFName.of("F"));

  const print = form.createButton("printButton");
  print.addToPage(C.printCaption, page, { x: 240, y: 220, width: 82, height: 20, font });
  for (const w of print.acroField.getWidgets()) w.dict.set(PDFName.of("F"), doc.context.obj(0));

  finishDeterministically(doc);
  return doc.save({ useObjectStreams: false });
}

/**
 * Canary 6 — a blank source whose widgets carry additional-action JavaScript.
 *
 * The contact sheet embeds the blank form beside the finalized one. `embedPdf`
 * reaches into the source document for what the page references, so an
 * unsanitized blank carries its /AA and /JS objects into the sheet, where
 * saving with object streams then hides them from the residue scan. Seven of
 * the 252 source PDFs in the D packs do exactly this.
 */
export async function buildScriptedBlankCanary() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 400]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  const ctx = doc.context;

  page.drawText("APPLICATION TO SEAL — D0 SCRIPTED BLANK CANARY", { x: 90, y: 350, size: 11, font });
  page.drawText("Applicant Name", { x: 40, y: 300, size: 8, font });

  const applicant = form.createTextField("applicantName");
  applicant.addToPage(page, { x: 40, y: 280, width: 260, height: 16 });
  for (const w of applicant.acroField.getWidgets()) {
    w.dict.set(PDFName.of("F"), ctx.obj(4));
    // /AA -> /JS on the widget: the exact shape the review found in 20 sheets.
    w.dict.set(PDFName.of("AA"), ctx.obj({
      K: ctx.register(ctx.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("event.value = event.value.toUpperCase();") })),
      F: ctx.register(ctx.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("AFNumber_Format(0,0,0,0,'',true);") }))
    }));
  }

  doc.catalog.set(PDFName.of("Names"), ctx.obj({
    JavaScript: ctx.register(ctx.obj({
      Names: ctx.obj([PDFString.of("blankCanary"), ctx.register(ctx.obj({
        S: PDFName.of("JavaScript"), JS: PDFString.of("app.alert('blank canary');")
      }))])
    }))
  }));
  doc.catalog.set(PDFName.of("OpenAction"), ctx.register(ctx.obj({
    S: PDFName.of("JavaScript"), JS: PDFString.of("this.print();")
  })));

  finishDeterministically(doc);
  return doc.save({ useObjectStreams: false });
}

// What the subset-font canary draws, and what a correct decoder must read back.
export const SUBSET_FONT_CANARY = {
  // Mapped code by code with bfchar, because real label text is not a
  // contiguous run of codepoints.
  identityText: "PETITION TO SEAL",
  // Mapped with a single bfrange. A bfrange assigns consecutive codepoints, so
  // it is only correct for text that is itself consecutive -- which is exactly
  // why it needs its own case rather than being folded into the label above.
  rangeText: "ABCDEF",
  differencesText: "CASE NO",
  undecodableCode: 0x00ff
};

/**
 * Canary 7 — a subset-font text layer.
 *
 * pdf-lib cannot author a Type0 font, so this is assembled directly: object
 * bodies emitted in order, byte offsets recorded, and an xref written from
 * those offsets. Washington's BLAKE-006 and BLAKE-008 draw their whole text
 * layer this way, and reading their two-byte codes one byte at a time returned
 * nothing legible, so both were dispositioned as having no extractable text.
 *
 * Three code spaces in one file: an Identity-H run decoded through a /ToUnicode
 * CMap, a simple-font run decoded through /Encoding /Differences, and one code
 * the CMap does not cover, which must be refused rather than guessed.
 */
export function buildSubsetFontCanary() {
  const C = SUBSET_FONT_CANARY;
  const hex4 = (n) => n.toString(16).padStart(4, "0");
  // Codes 1..n carry the label; the range text follows in its own block of
  // codes so the two CMap constructs cannot mask each other.
  const identityCodes = [...C.identityText].map((_, i) => i + 1);
  const rangeCodes = [...C.rangeText].map((_, i) => identityCodes.length + 1 + i);
  const hexRun = identityCodes.map(hex4).join("");
  const hexRange = rangeCodes.map(hex4).join("");
  const unmapped = hex4(C.undecodableCode);

  const bfchars = identityCodes
    .map((code, i) => `<${hex4(code)}> <${hex4(C.identityText.charCodeAt(i))}>`)
    .join("\n");

  const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n`
    + `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n`
    + `1 beginbfrange\n<${hex4(rangeCodes[0])}> <${hex4(rangeCodes[rangeCodes.length - 1])}> `
      + `<${hex4(C.rangeText.charCodeAt(0))}>\nendbfrange\n`
    + `${identityCodes.length} beginbfchar\n${bfchars}\nendbfchar\n`
    + `endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;

  const diffNames = [...C.differencesText].map((ch) => (ch === " " ? "/space" : `/${ch}`)).join(" ");
  const diffCodes = [...C.differencesText].map((_, i) => i + 1);
  const diffRun = diffCodes.map((c) => c.toString(16).padStart(2, "0")).join("");

  const content = `BT /F1 14 Tf 60 700 Td <${hexRun}> Tj ET\n`
    + `BT /F1 14 Tf 60 685 Td <${hexRange}> Tj ET\n`
    + `BT /F1 14 Tf 60 670 Td <${unmapped}> Tj ET\n`
    + `BT /F2 12 Tf 60 640 Td <${diffRun}> Tj ET\n`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R `
      + `/Resources << /Font << /F1 5 0 R /F2 9 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    `<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+Canary /Encoding /Identity-H `
      + `/DescendantFonts [6 0 R] /ToUnicode 8 0 R >>`,
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+Canary `
      + `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> `
      + `/FontDescriptor 7 0 R /DW 1000 /W [1 [${[...identityCodes, ...rangeCodes].map(() => 600).join(" ")}]] >>`,
    `<< /Type /FontDescriptor /FontName /AAAAAA+Canary /Flags 4 /ItalicAngle 0 `
      + `/Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 /FontBBox [0 -200 1000 800] /MissingWidth 600 >>`,
    `<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /FirstChar 1 /LastChar ${diffCodes.length} `
      + `/Widths [${diffCodes.map(() => 500).join(" ")}] `
      + `/Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [1 ${diffNames}] >> >>`
  ];

  let pdf = "%PDF-1.7\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export const RICH_TEXT_CANARY = {
  // pdf-lib raises RichTextFieldReadError only when /V is empty and /RV is
  // present, which is the shape Missouri's CR-145 actually has. A field
  // carrying both reads fine and would not reproduce the defect, so the canary
  // carries one of each: the first aborts the render, the second proves the
  // plain value is not collateral damage of fixing the first.
  packetOnlyFieldName: "narrativePacketOnly",
  packetOnlyText: "Arrested on the date stated in the attached record.",
  bothFieldName: "narrativeWithPlainValue",
  bothPlainValue: "Charges were dismissed before trial.",
  plainFieldName: "petitionerName",
  officialPrintedText: "PETITION D0-V3 RICH TEXT CANARY"
};

/**
 * Canary 8 — an AcroForm carrying a rich-text field.
 *
 * pdf-lib throws `Reading rich text fields is not supported` the moment
 * appearances are generated, so one such field aborts an entire family before a
 * page is written. Missouri's CR-145 declares two and produced no artifact of
 * any kind. This field carries a plain /V beside its /RV packet, so the canary
 * can also prove the participant-visible value survives the conversion.
 */
export async function buildRichTextCanary() {
  const C = RICH_TEXT_CANARY;
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 500]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  const ctx = doc.context;

  page.drawText(C.officialPrintedText, { x: 90, y: 450, size: 12, font });
  page.drawText("Petitioner Name", { x: 40, y: 405, size: 8, font });
  page.drawText("Narrative", { x: 40, y: 345, size: 8, font });

  const name = form.createTextField(C.plainFieldName);
  name.addToPage(page, { x: 40, y: 385, width: 260, height: 16 });
  for (const w of name.acroField.getWidgets()) w.dict.set(PDFName.of("F"), ctx.obj(4));

  const packet = (text) => PDFString.of(
    `<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml">`
    + `<p><span style="font-weight:bold">${text}</span></p></body>`);
  const makeRich = (field, { plainValue, packetText }) => {
    const dict = field.acroField.dict;
    const ff = Number(dict.get(PDFName.of("Ff"))?.asNumber?.() ?? 0);
    dict.set(PDFName.of("Ff"), ctx.obj(ff | (1 << 25)));
    if (plainValue !== null) dict.set(PDFName.of("V"), PDFString.of(plainValue));
    else dict.delete(PDFName.of("V"));
    dict.set(PDFName.of("RV"), packet(packetText));
    dict.set(PDFName.of("DS"), PDFString.of("font: 12pt Helvetica"));
    // A rich-text field as an issuing authority ships it has no pdf-lib-shaped
    // appearance, so pdf-lib considers it in need of one and tries to read the
    // value to build it -- which is the moment the render dies. Leaving the
    // appearance pdf-lib generated on addToPage would make the field look
    // up-to-date and the canary would reproduce nothing.
    for (const w of field.acroField.getWidgets()) w.dict.delete(PDFName.of("AP"));
  };

  // Packet only, no /V: the shape that aborts the render.
  const packetOnly = form.createTextField(C.packetOnlyFieldName);
  packetOnly.enableMultiline();
  packetOnly.addToPage(page, { x: 40, y: 280, width: 460, height: 55 });
  for (const w of packetOnly.acroField.getWidgets()) w.dict.set(PDFName.of("F"), ctx.obj(4));
  makeRich(packetOnly, { plainValue: null, packetText: C.packetOnlyText });

  // Packet and /V together: reads fine, and must come through unchanged.
  const both = form.createTextField(C.bothFieldName);
  both.enableMultiline();
  both.addToPage(page, { x: 40, y: 210, width: 460, height: 55 });
  for (const w of both.acroField.getWidgets()) w.dict.set(PDFName.of("F"), ctx.obj(4));
  makeRich(both, { plainValue: C.bothPlainValue, packetText: C.bothPlainValue });

  finishDeterministically(doc);
  // pdf-lib regenerates field appearances on save, which walks straight into
  // the very error this canary exists to reproduce. Writing the source without
  // that pass is what lets the file exist at all -- and it is faithful to the
  // real forms, whose appearances were generated by the issuing authority's
  // own tooling rather than by pdf-lib.
  return doc.save({ useObjectStreams: false, updateFieldAppearances: false });
}

export const CANARIES = [
  { id: "acroform", build: buildAcroFormCanary, structuralClass: "acroform" },
  { id: "flat", build: buildFlatOverlayCanary, structuralClass: "flat" },
  { id: "scripted", build: buildScriptedCanary, structuralClass: "acroform" },
  { id: "xfa-residue", build: async () => buildXfaResidueCanary(), structuralClass: "acroform" },
  { id: "subset-font", build: async () => buildSubsetFontCanary(), structuralClass: "flat" },
  { id: "rich-text", build: buildRichTextCanary, structuralClass: "acroform" },
  { id: "print-flags", build: buildPrintFlagCanary, structuralClass: "acroform" },
  { id: "scripted-blank", build: buildScriptedBlankCanary, structuralClass: "acroform" }
];
