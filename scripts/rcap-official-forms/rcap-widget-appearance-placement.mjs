#!/usr/bin/env node
// Where a flattened widget's appearance LANDS on the page.
//
// PDF 32000-1 12.5.5 does not place an annotation's appearance stream by simply
// translating it to the annotation rectangle. It transforms the stream's /BBox
// by the stream's /Matrix, takes the bounding box of the result, and computes
// the matrix A that maps that box onto the annotation /Rect. A viewer therefore
// renders an appearance correctly whether its BBox is written origin-relative
// ([0 0 w h]) or in absolute page coordinates.
//
// pdf-lib's PDFForm.flatten() does not implement that algorithm. It emits
//
//     q  1 0 0 1 Rect.x Rect.y cm  /FlatWidget Do  Q
//
// which is right only for the origin-relative spelling. An appearance whose
// BBox is already in absolute page coordinates is then translated a second time
// and lands at twice its true offset -- far from the control it draws, painting
// its opaque interior over whatever printed text is there instead.
//
// Both spellings are legal and real forms mix them. SCA-C906 (WV) writes every
// text field origin-relative and every checkbox in absolute page coordinates,
// so on that form flatten() places the text correctly and throws every checkbox
// to double its true x and y.
//
// This module removes the difference before flattening, by pre-composing into
// each appearance stream's /Matrix exactly the correction 12.5.5 asks for, less
// the translate flatten() is about to add:
//
//     Matrix' = Matrix x A x translate(-Rect.x, -Rect.y)
//
// For an appearance already written origin-relative with an identity Matrix,
// A is exactly translate(Rect.x, Rect.y) and Matrix' is the identity: this is a
// no-op on a well-formed appearance, and touches only the malformed spelling.
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRef, PDFStream } from "pdf-lib";

const EPSILON = 1e-6;
// A correction is only worth making when it MOVES something. Rectangle widths
// and BBox widths that are meant to be identical differ in the last decimal
// place in real forms, which yields scale factors like 1.0000021 and corner
// displacements of a few ten-thousandths of a point. Well under a hundredth of
// a point is not a placement difference at any raster resolution, so it is
// left alone rather than rewritten.
const MIN_CORRECTION_POINTS = 0.01;
const IDENTITY = [1, 0, 0, 1, 0, 0];

/** Row-vector composition: apply `first`, then `second`. */
function compose(first, second) {
  const [a1, b1, c1, d1, e1, f1] = first;
  const [a2, b2, c2, d2, e2, f2] = second;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2
  ];
}

function applyMatrix([a, b, c, d, e, f], x, y) {
  return [a * x + c * y + e, b * x + d * y + f];
}

function numbersOf(context, value, length) {
  const array = value instanceof PDFRef ? context.lookup(value) : value;
  if (!(array instanceof PDFArray) || array.size() !== length) return null;
  const out = [];
  for (let index = 0; index < length; index += 1) {
    const entry = context.lookup(array.get(index));
    if (!(entry instanceof PDFNumber)) return null;
    out.push(entry.asNumber());
  }
  return out;
}

function normalizedRect(rect) {
  return {
    x: Math.min(rect.x, rect.x + rect.width),
    y: Math.min(rect.y, rect.y + rect.height),
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };
}

/** Every appearance stream reachable from a widget's /AP, with its state key. */
function appearanceStreams(context, widget) {
  const ap = widget.dict.lookupMaybe(PDFName.of("AP"), PDFDict);
  if (!ap) return [];
  const found = [];
  // /N only: pdf-lib's flatten draws the NORMAL appearance and nothing else,
  // so the down and rollover streams are never stamped onto the page and
  // rewriting them would change bytes no reader ever sees.
  for (const slot of ["N"]) {
    const entry = ap.get(PDFName.of(slot));
    if (entry === undefined) continue;
    const resolved = context.lookup(entry);
    if (resolved instanceof PDFStream) {
      found.push({ state: `/${slot}`, stream: resolved });
      continue;
    }
    if (resolved instanceof PDFDict) {
      for (const [key, value] of resolved.entries()) {
        const sub = context.lookup(value);
        if (sub instanceof PDFStream) found.push({ state: `/${slot}${key.toString()}`, stream: sub });
      }
    }
  }
  return found;
}

/**
 * Rewrite every widget appearance stream's /Matrix so that pdf-lib's flatten()
 * places it where PDF 12.5.5 says it belongs.
 *
 * Returns { widgetsInspected, appearanceStreamsInspected, corrected: [...] }.
 * `corrected` is empty when every appearance was already spelled the way
 * flatten() assumes, which is the report a well-formed source produces.
 */
export function normalizeWidgetAppearancePlacement(pdfDoc) {
  const context = pdfDoc.context;
  const report = { widgetsInspected: 0, appearanceStreamsInspected: 0, corrected: [] };
  const form = pdfDoc.getForm();
  for (const field of form.getFields()) {
    const name = field.getName();
    for (const widget of field.acroField.getWidgets()) {
      report.widgetsInspected += 1;
      const rect = normalizedRect(widget.getRectangle());
      if (!(rect.width > EPSILON) || !(rect.height > EPSILON)) continue;
      for (const { state, stream } of appearanceStreams(context, widget)) {
        report.appearanceStreamsInspected += 1;
        const dict = stream.dict;
        const bbox = numbersOf(context, dict.get(PDFName.of("BBox")), 4);
        if (!bbox) continue;
        const matrix = numbersOf(context, dict.get(PDFName.of("Matrix")), 6) ?? IDENTITY;

        // 12.5.5 step 1-2: transform the BBox corners, take the bounding box.
        const corners = [
          applyMatrix(matrix, bbox[0], bbox[1]),
          applyMatrix(matrix, bbox[2], bbox[1]),
          applyMatrix(matrix, bbox[2], bbox[3]),
          applyMatrix(matrix, bbox[0], bbox[3])
        ];
        const xs = corners.map((point) => point[0]);
        const ys = corners.map((point) => point[1]);
        const boxWidth = Math.max(...xs) - Math.min(...xs);
        const boxHeight = Math.max(...ys) - Math.min(...ys);
        if (!(boxWidth > EPSILON) || !(boxHeight > EPSILON)) continue;

        // 12.5.5 step 3: the matrix A that maps that box onto /Rect.
        const scaleX = rect.width / boxWidth;
        const scaleY = rect.height / boxHeight;
        const a = [scaleX, 0, 0, scaleY, rect.x - scaleX * Math.min(...xs), rect.y - scaleY * Math.min(...ys)];

        // flatten() will prepend translate(Rect.x, Rect.y); cancel it here.
        const corrected = compose(compose(matrix, a), [1, 0, 0, 1, -rect.x, -rect.y]);
        const displacement = Math.max(...[
          [bbox[0], bbox[1]], [bbox[2], bbox[1]], [bbox[2], bbox[3]], [bbox[0], bbox[3]]
        ].map(([x, y]) => {
          const [oldX, oldY] = applyMatrix(matrix, x, y);
          const [newX, newY] = applyMatrix(corrected, x, y);
          return Math.hypot(newX - oldX, newY - oldY);
        }));
        if (displacement < MIN_CORRECTION_POINTS) continue;

        dict.set(PDFName.of("Matrix"), context.obj(corrected.map((value) => Number(value.toFixed(6)))));
        report.corrected.push({
          field: name,
          appearanceState: state,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          bbox,
          matrixBefore: matrix,
          matrixAfter: corrected,
          maxCornerDisplacementPoints: Number(displacement.toFixed(4)),
          reason: "appearance BBox is expressed in absolute page coordinates, so flatten() would translate it a second time"
        });
      }
    }
  }
  return report;
}
