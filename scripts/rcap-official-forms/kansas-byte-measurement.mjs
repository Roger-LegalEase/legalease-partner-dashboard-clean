import crypto from 'node:crypto';
import { PDFDocument, PDFName, PDFDict, PDFObjectCopier, decodePDFRawStream } from 'pdf-lib';
import { drawnTextOf, readOutputGlyphs } from './rcap-output-glyph-reading.mjs';

const decode = stream => Buffer.from(decodePDFRawStream(stream).decode());
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// Consume operands before counting paint operations: path construction, an
// empty text operation, and operator-like letters inside strings are not ink.
export function describeKansasAppearance(stream) {
  const bytes = decode(stream);
  const text = bytes.toString('latin1');
  const operators = text.replace(/\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]*>|%[^\r\n]*/g, ' ');
  const paintingOperators = (operators.match(/(?:^|\s)(?:S|s|f\*?|F|B\*?|b\*?|sh)(?=\s|$)/g) ?? []).length;
  return { sha256: hash(bytes), drawnText: drawnTextOf(text), paintingOperators };
}

/** Keep the court's original blank writing box, including its white background.
 * The generic finalizer regenerates this unwritten text appearance and loses
 * the source's fill. Only this pinned, empty court-owned field is restored.
 */
export async function preserveKansasOrderBlank(bytes, sourceBytes, rows) {
  const row = rows.find(r => (r.documentId === 'KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022' && r.field === 'Text2') || (r.documentId === 'KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016' && r.field === 'undefined_2'));
  if (!row || row.decision !== 'refuse') return bytes;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption:true, updateMetadata:false });
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption:true, updateMetadata:false });
  const field = source.getForm().getField(row.field);
  const blank = source.context.lookup(field.acroField.getWidgets()[0].getNormalAppearance());
  if (describeKansasAppearance(blank).drawnText.trim()) throw new Error('Kansas order source writing box is not blank');
  const page = doc.getPages()[row.widgets[0].page-1];
  const objects = page.node.Resources().lookup(PDFName.of('XObject'));
  // Each source widget has a unique finalizer appearance; match its local box
  // and never replace a participant write or another court field.
  const target = row.widgets[0].rect;
  let replaced = 0;
  for (const [name, ref] of objects.entries()) {
    if (!/^\/FlatWidget-\d+$/.test(name.toString())) continue;
    const stream = doc.context.lookup(ref);
    const bbox = stream.dict.lookup(PDFName.of('BBox'))?.asArray().map(n=>n.asNumber());
    if (!bbox || Math.abs(bbox[2]-bbox[0]-target.width)>0.01 || Math.abs(bbox[3]-bbox[1]-target.height)>0.01) continue;
    if (describeKansasAppearance(stream).drawnText.trim()) throw new Error('Kansas protected order field unexpectedly contains text');
    doc.context.assign(ref, PDFObjectCopier.for(source.context, doc.context).copy(blank));
    replaced++;
  }
  if (replaced !== 1) throw new Error(`Kansas order blank restoration expected one appearance, got ${replaced}`);
  return Buffer.from(await doc.save({useObjectStreams:false,updateMetadata:false}));
}

export async function measureKansasDocument(bytes, sourceBytes, rows, appearances) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const originalFields = new Map(source.getForm().getFields().map(f => [f.getName(), f]));
  const measured = [];
  const violations = [];
  for (const row of rows) {
    for (const [index, widget] of row.widgets.entries()) {
      const at = appearances.filter(a => a.page === widget.page && Math.abs(a.x-widget.rect.x)<0.1 && Math.abs(a.y-widget.rect.y)<0.1);
      const descriptions = at.map(a => {
        const resources = doc.getPages()[a.page-1].node.Resources();
        const objects = resources.lookup(PDFName.of('XObject'));
        return describeKansasAppearance(objects.lookup(PDFName.of(a.appearance)));
      });
      const originalWidget = originalFields.get(row.field).acroField.getWidgets()[index];
      const ap = originalWidget.dict.lookupMaybe(PDFName.of('AP'), PDFDict);
      const normal = ap?.lookup(PDFName.of('N'));
      const off = normal instanceof PDFDict ? normal.lookup(PDFName.of('Off')) : normal;
      const originalBlank = off?.contents ? describeKansasAppearance(off) : null;
      const additions = descriptions.filter(a => a.drawnText.trim() || (a.paintingOperators && a.sha256 !== originalBlank?.sha256));
      const selected = row.decision === 'select';
      const refused = row.decision === 'refuse';
      if (selected && !additions.length) violations.push({ field:row.field,page:widget.page,defect:'selected control has no added ink' });
      if (refused && additions.length) violations.push({ field:row.field,page:widget.page,defect:'refused field gained text or vector ink', additions, originalBlank });
      measured.push({ field:row.field,page:widget.page,decision:row.decision,appearances:descriptions,originalBlank,addedInkAppearances:additions.length });
    }
  }
  const placement = await readOutputGlyphs(bytes, { sourceBytes });
  return { measured, violations, placement, sourceSha256:hash(sourceBytes), outputSha256:hash(bytes),
    scope:'Builder measurement of final component bytes, text and vector selections, refusal ink and source-widget placement. Central raster and independent review still required.' };
}
