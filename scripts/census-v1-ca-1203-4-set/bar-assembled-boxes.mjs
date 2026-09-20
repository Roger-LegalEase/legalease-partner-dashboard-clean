// Boxes drawn as four separate thin bars, in page coordinates.
//
// A COMPLEMENT TO scripts/lib/pdf-stroked-boxes.mjs, NOT A REPLACEMENT.
//
// That instrument reports STROKED closed rectangles, however constructed -- an
// `re`, or an explicit four-segment path -- and deliberately discards filled
// paths, on the sound reasoning that a filled rectangle is usually a rule or a
// shaded block rather than a control.
//
// MC-031 (rev. 2005) draws its checkboxes a third way, which neither branch
// catches: each side of the box is its OWN degenerate rectangle, about 0.36pt
// thick, and the sides are painted with a mix of `f` and `S`. For example, one
// box on page 1 is these four:
//
//     389.88 89.40  0.36 9.36 re f      <- left edge
//     389.88 98.40 11.58 0.36 re f      <- top edge
//     401.10 89.40  0.36 9.36 re f      <- right edge
//     389.88 89.40 11.58 0.36 re f      <- bottom edge
//
// No single subpath is box-shaped, so the shared instrument correctly reports
// nothing: there is no stroked rectangle there. The box is real all the same,
// and a mark still has to land inside it. This assembles such frames from their
// bars, using the same CTM-tracking discipline, so that a box built this way is
// measured rather than assumed.
//
// It keeps FILLED rectangles, which is exactly why it must not be used as a
// general box detector: on a page of ruled tables it would report every cell.
// It is applied only where a checkable widget already sits and the shared
// instrument found no box.
//
// Reported to the Captain: the shared instrument probably wants this third
// construction absorbed into it, so every family gets it. Not done here --
// scripts/lib is shared, and this family does not own it.

const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Every axis-aligned rectangle in `content`, painted or stroked, in page coordinates. */
export function allRectangles(content) {
  const toks = content.match(
    /\[(?:[^\][\\]|\\.)*\]|\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]*>|[-\d.]+|\/[^\s/<>\[\]()]+|<<|>>|[A-Za-z*'"]+/g,
  ) ?? [];
  const out = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let stand = [];
  let pending = [];

  const emit = (painted) => {
    for (const corners of pending) {
      const xs = corners.map((p) => p[0]);
      const ys = corners.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const w = x1 - x0, h = y1 - y0;
      if (w <= 0 || h <= 0) continue;
      out.push({
        x0: +x0.toFixed(2), y0: +y0.toFixed(2), x1: +x1.toFixed(2), y1: +y1.toFixed(2),
        width: +w.toFixed(2), height: +h.toFixed(2), paint: painted,
      });
    }
    pending = [];
  };

  for (const t of toks) {
    if (/^-?[\d.]+$/.test(t) || t.startsWith("/") || t.startsWith("[") || t.startsWith("(") || t.startsWith("<")) {
      stand.push(t);
      continue;
    }
    const n = (k) => +stand[stand.length - k];
    switch (t) {
      case "q": stack.push(ctm.slice()); break;
      case "Q": ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0]; break;
      case "cm": ctm = mul([n(6), n(5), n(4), n(3), n(2), n(1)], ctm); break;
      case "re": {
        // Width and height may be negative; the corners are normalised on emit.
        const [x, y, w, h] = [n(4), n(3), n(2), n(1)];
        pending.push([
          apply(ctm, x, y), apply(ctm, x + w, y),
          apply(ctm, x + w, y + h), apply(ctm, x, y + h),
        ]);
        break;
      }
      case "f": case "F": case "f*": emit("fill"); break;
      case "S": case "s": emit("stroke"); break;
      case "B": case "B*": case "b": case "b*": emit("fill_stroke"); break;
      case "n": pending = []; break;
      default: break;
    }
    if (!/^-?[\d.]+$/.test(t)) stand = [];
  }
  return out;
}

/**
 * The frame assembled from thin bars around `widgetRect`, or null.
 *
 * A bar is a rectangle thin on one axis and control-length on the other. Bars
 * are accepted only if they lie within `padPt` of the widget, and a frame is
 * returned only when at least three of the four sides are present -- three
 * because a box sharing an edge with a neighbouring rule is drawn with three.
 */
export function barAssembledBox(rects, widgetRect, {
  maxThicknessPt = 2.0,
  minLengthPt = 3,
  maxLengthPt = 40,
  padPt = 2.5,
} = {}) {
  const [wx0, wy0, wx1, wy1] = widgetRect;
  const near = rects.filter((r) => {
    const thin = Math.min(r.width, r.height) <= maxThicknessPt;
    const long = Math.max(r.width, r.height);
    if (!thin || long < minLengthPt || long > maxLengthPt) return false;
    return r.x0 >= wx0 - padPt && r.y0 >= wy0 - padPt
        && r.x1 <= wx1 + padPt && r.y1 <= wy1 + padPt;
  });
  if (near.length < 3) return null;

  const x0 = Math.min(...near.map((r) => r.x0));
  const y0 = Math.min(...near.map((r) => r.y0));
  const x1 = Math.max(...near.map((r) => r.x1));
  const y1 = Math.max(...near.map((r) => r.y1));

  const eps = 0.75;
  const sides = {
    left: near.some((r) => r.width <= maxThicknessPt && Math.abs(r.x0 - x0) <= eps),
    right: near.some((r) => r.width <= maxThicknessPt && Math.abs(r.x1 - x1) <= eps),
    bottom: near.some((r) => r.height <= maxThicknessPt && Math.abs(r.y0 - y0) <= eps),
    top: near.some((r) => r.height <= maxThicknessPt && Math.abs(r.y1 - y1) <= eps),
  };
  const present = Object.values(sides).filter(Boolean).length;
  if (present < 3) return null;

  return {
    rect: [+x0.toFixed(2), +y0.toFixed(2), +x1.toFixed(2), +y1.toFixed(2)],
    width: +(x1 - x0).toFixed(2),
    height: +(y1 - y0).toFixed(2),
    barCount: near.length,
    sidesPresent: sides,
    paints: [...new Set(near.map((r) => r.paint))].sort(),
  };
}
