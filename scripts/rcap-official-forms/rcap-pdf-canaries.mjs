// The shared PDF canaries: small documents that reproduce, exactly, the defects
// the corpus has actually produced.
//
// The real Wisconsin CR-266 binary lives under private/Nationwide Record
// Clearing/, which this worktree does not carry, so the CR-266 canary is
// SYNTHESIZED to the geometry the independent review recorded on that form —
// the 77.16pt Case No. rule ending at x=432.07, the caption box divider at
// x=464.26, the Date of Birth rule 7.5pt from its caption against the Case No.
// rule 6.6pt away, and the COUNTY venue rule. That is deliberate: the platform
// contract is what these canaries test, and a platform contract should be
// provable without any one family's binary. The PDF lane proves the same
// contract against the real bytes.
//
// Every canary is deterministic. No clock, no randomness, no network.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb, PDFName, PDFString, PDFArray, PDFDict } = require("pdf-lib");

export const CANARY_STAMP = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

/**
 * The CR-266 caption block, to the coordinates the review recorded.
 *
 * Reproduced here:
 *   * "Case No." prints beside its rule, which is 77.16pt and ends at x=432.07;
 *   * a vertical divider at x=464.26 separates the court-use cell;
 *   * "Date of Birth" sits 7.5pt above its own rule while the Case No. rule is
 *     6.6pt away on the far side of the page — the pair that made
 *     nearest-distance-alone hand the date field the case-number line;
 *   * "COUNTY" prints after its venue rule, the inline layout that an
 *     upward-only search misses entirely;
 *   * a signature rule, which must never be written to.
 */
export async function wisconsinCr266GeometryCanary() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(CANARY_STAMP);
  doc.setModificationDate(CANARY_STAMP);
  // The court's own metadata, which the finalizer must carry through untouched.
  doc.setTitle("CR-266, 05/24 Petition to Expunge Criminal Court Record of Conviction");
  doc.setAuthor("Terri Borrud");
  doc.setSubject("WI State Courts");
  doc.setKeywords(["expungement", "CR-266", "Wisconsin"]);
  doc.setCreator("Wisconsin Court System");
  doc.setProducer("Wisconsin Court System forms pipeline");

  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const rule = (x, y, width) => page.drawRectangle({ x, y, width, height: 0.5, color: rgb(0, 0, 0) });
  const caption = (text, x, y, size = 9) => page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });

  // Inline: caption, then its rule, on the same visual line.
  caption("Case No.", 320, 700);
  rule(354.91, 698.4, 77.16);                       // ends at 432.07
  page.drawRectangle({ x: 464.26, y: 660, width: 0.5, height: 80, color: rgb(0, 0, 0) });

  // The competing rule on the far side of the page, deliberately nearer in y.
  caption("Date of Birth", 72, 705);
  rule(140, 697.5, 150);                            // 7.5pt from its own caption

  // Inline, rule first: "________ COUNTY".
  rule(72, 738.4, 160);
  caption("COUNTY", 236, 740);

  caption("Defendant's Name", 72, 660);
  rule(180, 652.5, 240);

  caption("Signature", 72, 120);
  rule(150, 112.5, 200);

  return { bytes: await doc.save(), doc };
}

/** An AcroForm with a text field, a checkbox and a protected signature field. */
export async function acroFormCanary() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(CANARY_STAMP);
  doc.setModificationDate(CANARY_STAMP);
  doc.setTitle("Official AcroForm Petition");
  doc.setAuthor("State Court Administrator");
  doc.setSubject("Record clearing");
  doc.setKeywords(["petition"]);
  doc.setCreator("State forms office");
  doc.setProducer("State forms office pipeline");

  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  page.drawText("Petitioner Name", { x: 72, y: 700, size: 9, font });
  const name = form.createTextField("petitioner.name");
  name.addToPage(page, { x: 180, y: 694, width: 240, height: 16 });

  page.drawText("Email Address", { x: 72, y: 660, size: 9, font });
  const email = form.createTextField("email.address");
  email.addToPage(page, { x: 180, y: 654, width: 240, height: 16 });

  page.drawText("Judge Signature", { x: 72, y: 120, size: 9, font });
  const signature = form.createTextField("judge.signature");
  signature.addToPage(page, { x: 180, y: 114, width: 240, height: 16 });

  return { bytes: await doc.save(), doc };
}

/** A document carrying every kind of active content the sanitizer must strip. */
export async function activeContentCanary() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(CANARY_STAMP);
  doc.setModificationDate(CANARY_STAMP);
  doc.setTitle("Official Form With Active Content");
  doc.setAuthor("State Court Administrator");
  doc.setSubject("Record clearing");
  doc.setCreator("State forms office");

  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Official form body", { x: 72, y: 700, size: 10, font });

  const ctx = doc.context;
  // OpenAction: run JavaScript when the document opens.
  const js = ctx.obj({ S: PDFName.of("JavaScript"), JS: PDFString.of("app.alert('hello');") });
  doc.catalog.set(PDFName.of("OpenAction"), ctx.register(js));
  // A name tree of document-level JavaScript.
  const names = ctx.obj({
    JavaScript: ctx.obj({ Names: ctx.obj([PDFString.of("script0"), ctx.register(js)]) })
  });
  doc.catalog.set(PDFName.of("Names"), ctx.register(names));
  // Additional actions.
  doc.catalog.set(PDFName.of("AA"), ctx.register(ctx.obj({ WC: ctx.register(js) })));
  // An XFA entry on the AcroForm dictionary.
  const acro = ctx.obj({ Fields: ctx.obj([]), XFA: PDFString.of("<xdp:xdp/>") });
  doc.catalog.set(PDFName.of("AcroForm"), ctx.register(acro));
  // A link annotation whose action is JavaScript.
  const annot = ctx.obj({
    Type: PDFName.of("Annot"), Subtype: PDFName.of("Link"),
    Rect: ctx.obj([72, 690, 300, 710]), A: ctx.register(js)
  });
  const annots = ctx.obj([ctx.register(annot)]);
  page.node.set(PDFName.of("Annots"), ctx.register(annots));

  return { bytes: await doc.save(), doc, PDFName, PDFArray, PDFDict };
}

/** A flat form whose only two write lines are an email line and a street line. */
export async function emailSemanticsCanary() {
  const doc = await PDFDocument.create();
  doc.setCreationDate(CANARY_STAMP);
  doc.setModificationDate(CANARY_STAMP);
  doc.setTitle("Contact Information Sheet");
  doc.setCreator("State forms office");

  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const rule = (x, y, width) => page.drawRectangle({ x, y, width, height: 0.5, color: rgb(0, 0, 0) });

  page.drawText("Email Address", { x: 72, y: 700, size: 9, font });
  rule(150, 698.4, 240);

  page.drawText("Street Address", { x: 72, y: 660, size: 9, font });
  rule(150, 658.4, 240);

  return { bytes: await doc.save(), doc };
}
