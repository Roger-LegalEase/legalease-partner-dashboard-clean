// Stroked rectangles in page coordinates, however they are constructed.
//
// WHY THIS EXISTS
//
// A previous detector scanned for `re` operators and reported that the Oregon
// set-aside form contains no checkboxes. It contains fourteen — three beside the
// options, and the rest beside the declaration statements. They are built like
// this:
//
//     q
//     1 0 0 1 127.08 403.68 cm
//     0.72 w 2 J
//     0 0 m  10.2 0 l  10.2 -10.2 l  0 -10.2 l  h  S
//     Q
//
// An explicit four-segment path, stroked, inside a translation. Two independent
// things defeated the old scan: there is no `re` to match, and every coordinate
// in the path is relative to the `cm`, so even a path-aware scan without a
// graphics-state machine would have reported a box at (0, 0) rather than at
// (127.08, 393.48).
//
// So this walks the content stream as a graphics-state machine: q/Q maintain a
// CTM stack, cm concatenates, and every constructed subpath is mapped through
// the CTM before it is judged. Both construction forms produce the same answer,
// in page coordinates, which is the only coordinate system anything downstream
// should be comparing in.
//
// It reports only STROKED paths (S, s, B, B*, b, b*). A filled rectangle is a
// rule or a shaded block; a stroked one that is nearly square is a control.

/** Multiply [a b c d e f] matrices, PDF order: m1 then m2. */
function mul(m1, m2) {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/**
 * Every stroked, axis-aligned rectangle in `content`, in page coordinates.
 * `construction` says how it was drawn, because "re" and "path" reaching the
 * same bounds is worth being able to see.
 */
export function strokedRectangles(content) {
  const toks = content.match(/\[(?:[^\][\\]|\\.)*\]|\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]*>|[-\d.]+|\/[^\s/<>\[\]()]+|<<|>>|[A-Za-z*'"]+/g) ?? [];
  const out = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let stand = [];          // operand stack
  let pts = [];            // current subpath, already in page coordinates
  let subpaths = [];       // completed subpaths of the current path
  let start = null;
  let lineWidth = 1;

  // Each subpath remembers how it was drawn, so a box built as an explicit
  // four-segment path is never reported as if it came from `re`.
  const flushSubpath = () => { if (pts.length > 1) { pts.kind = "explicit_path"; subpaths.push(pts); } pts = []; };

  const emit = () => {
    flushSubpath();
    for (const sp of subpaths) {
      const xs = sp.map((p) => p[0]);
      const ys = sp.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const w = x1 - x0, h = y1 - y0;
      if (!(w > 0.5 && h > 0.5)) continue;
      // Axis-aligned: every segment moves in only one axis.
      let axisAligned = true;
      for (let i = 1; i < sp.length; i++) {
        const dx = Math.abs(sp[i][0] - sp[i - 1][0]);
        const dy = Math.abs(sp[i][1] - sp[i - 1][1]);
        if (dx > 0.01 && dy > 0.01) { axisAligned = false; break; }
      }
      if (!axisAligned) continue;
      out.push({
        x0: +x0.toFixed(2), y0: +y0.toFixed(2), x1: +x1.toFixed(2), y1: +y1.toFixed(2),
        width: +w.toFixed(2), height: +h.toFixed(2),
        lineWidth: +lineWidth.toFixed(2),
        construction: sp.kind ?? "explicit_path",
        squareness: +(Math.min(w, h) / Math.max(w, h)).toFixed(3),
      });
    }
    subpaths = [];
  };

  for (const t of toks) {
    if (/^-?[\d.]+$/.test(t) || t.startsWith("/") || t.startsWith("[") || t.startsWith("(") || t.startsWith("<")) { stand.push(t); continue; }
    const n = (k) => +stand[stand.length - k];
    switch (t) {
      case "q": stack.push(ctm.slice()); break;
      case "Q": ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0]; break;
      case "cm": ctm = mul([n(6), n(5), n(4), n(3), n(2), n(1)], ctm); break;
      case "w": lineWidth = n(1); break;
      case "m": flushSubpath(); start = apply(ctm, n(2), n(1)); pts = [start]; break;
      case "l": if (pts.length) pts.push(apply(ctm, n(2), n(1))); break;
      case "h": if (pts.length && start) pts.push(start); break;
      case "re": {
        // The other construction, mapped through the same CTM so both forms
        // land in one coordinate system.
        flushSubpath();
        const [x, y, w, h] = [n(4), n(3), n(2), n(1)];
        const rect = [apply(ctm, x, y), apply(ctm, x + w, y), apply(ctm, x + w, y + h), apply(ctm, x, y + h), apply(ctm, x, y)];
        rect.kind = "re";
        subpaths.push(rect);
        break;
      }
      case "S": case "s": case "B": case "B*": case "b": case "b*":
        emit(); break;
      case "f": case "F": case "f*": case "n":
        // Filled or discarded: a rule or a clip, not a control.
        flushSubpath(); subpaths = []; break;
      default: break;
    }
    if (!/^-?[\d.]+$/.test(t)) stand = [];
  }
  return out;
}

/** Checkbox-shaped: stroked, near-square, and the size a control is drawn at. */
export function checkboxCandidates(content, { minSize = 6, maxSize = 20, minSquareness = 0.85 } = {}) {
  return strokedRectangles(content).filter(
    (r) => r.squareness >= minSquareness && Math.max(r.width, r.height) >= minSize && Math.max(r.width, r.height) <= maxSize,
  );
}
