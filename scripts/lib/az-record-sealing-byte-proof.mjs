import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { extractTextItems } from '../rcap-official-forms/rcap-pdf-anchor-capture.mjs';

const textWrites = writes => writes.filter(w => !w.printedSituationState && !w.printedSourceSelection);
export async function measureAzActualWrites({ sourceBytes, outputBytes, writes }) {
  const source = await PDFDocument.load(sourceBytes);
  const output = await PDFDocument.load(outputBytes);
  const pages = output.getPages().map(page => extractTextItems(page));
  const proofs = [];
  let actualChars = 0;
  let outsideCount = 0;
  for (const write of textWrites(writes)) {
    const field = source.getForm().getField(write.field);
    const widgets = field.acroField.getWidgets();
    const widgetProofs = widgets.map((widget, index) => {
      const page = source.getPages().findIndex(p => p.ref?.toString() === widget.P()?.toString());
      const rect = widget.getRectangle();
      const expected = String(write.value);
      const matches = (pages[page] ?? []).filter(item =>
        item.text === expected && item.x >= rect.x - 1 && item.x <= rect.x + rect.width + 1
        && item.y >= rect.y - 1 && item.y <= rect.y + rect.height + 1);
      // A missing coordinate match is retained as an explicit proof gap; callers may not promote it.
      if (!matches.length) return { page: page + 1, rect, matches: [], actualChars: 0, proofGap: 'NO_TEXT_WITHIN_SOURCE_WIDGET' };
      const chars = matches.flatMap(item => item.chars ?? []).filter(c => /\S/.test(c.c));
      actualChars += chars.length;
      for (const c of chars) if (c.w !== null && (c.x + c.w > rect.x + rect.width + 1 || c.x < rect.x - 1)) outsideCount++;
      return { page: page + 1, rect, matches: matches.map(m => ({ text: m.text, x: m.x, y: m.y, width: m.width, size: m.size, metricsExact: m.metricsExact })), actualChars: chars.length };
    });
    proofs.push({ field: write.field, expected: String(write.value), widgets: widgetProofs });
  }
  return { schemaVersion: 'az-actual-byte-proof/v1', geometryScope: 'Actual glyph advance bounds horizontally; actual text baseline inside source rectangle. Visible glyph shapes and vertical clipping require original raster review.', metricsExact: proofs.every(p => p.widgets.every(w => !w.proofGap && w.matches.length === 1 && w.matches.every(m => m.metricsExact))), actualChars, outsideCount, proofs };
}
