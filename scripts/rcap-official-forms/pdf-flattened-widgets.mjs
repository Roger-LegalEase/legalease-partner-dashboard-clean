// What a flattened form artifact actually draws, and where.
//
// After an AcroForm is filled and flattened, the values are no longer field
// values: each becomes a form XObject drawn by the page at a point. So a claim
// like "the participant's name is printed in the blank that holds the offence"
// cannot be answered from the field map, which is the thing under suspicion. It
// has to be answered from the artifact, by finding the appearance drawn at that
// blank's own measured rectangle and reading it.
//
// The placement is not a single `cm`. The finalizer emits
// `q <cm> <cm> <cm> /FlatWidget-N Do Q`, and only the composed translation puts
// the appearance on the page -- a reader that matched one `cm` finds nothing and
// reports the page clean, which is the wrong answer in the dangerous direction.
import fs from "node:fs";
import zlib from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray, PDFRawStream } = require("pdf-lib");

const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

/** Text an appearance stream draws, literal and hex strings alike. */
function textOfStream(obj) {
  if (!(obj instanceof PDFRawStream)) return "";
  const source = inflate(Buffer.from(obj.contents)).toString("latin1");
  let out = "";
  for (const literal of source.match(/\((?:[^()\\]|\\.)*\)/g) ?? []) out += literal.slice(1, -1);
  for (const hex of source.match(/<[0-9A-Fa-f\s]{2,}>/g) ?? []) {
    const digits = hex.slice(1, -1).replace(/\s+/g, "");
    if (digits.length % 2 === 0) out += Buffer.from(digits, "hex").toString("latin1");
  }
  return out;
}

/** Every flattened widget appearance in `file`, with the page and point it lands at. */
export async function flattenedWidgets(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const found = [];
  doc.getPages().forEach((page, index) => {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) return;
    const dict = ctx.lookup(xObjects);
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let stream = "";
    for (const ref of refs) stream += inflate(Buffer.from(ctx.lookup(ref).contents)).toString("latin1");
    const placement = /q((?:\s*-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ cm)+)\s*\/(\S+)\s+Do/g;
    let match;
    while ((match = placement.exec(stream))) {
      let x = 0, y = 0;
      for (const cm of match[1].matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm/g)) {
        x += Number(cm[5]); y += Number(cm[6]);
      }
      const key = PDFName.of(match[2]);
      if (!dict.has(key)) continue;
      found.push({
        page: index + 1, x: +x.toFixed(2), y: +y.toFixed(2),
        appearance: match[2], text: textOfStream(ctx.lookup(dict.get(key))).trim()
      });
    }
  });
  return found;
}

/**
 * The text drawn at one measured rectangle, within `tolerance` points.
 *
 * Returns every appearance that lands there, so "nothing is drawn here" and
 * "something is drawn here and it is not what was expected" stay distinguishable.
 */
export function drawnAt(widgets, { page, rect, tolerance = 2 }) {
  return widgets.filter((w) => w.page === page
    && Math.abs(w.x - rect.x) <= tolerance && Math.abs(w.y - rect.y) <= tolerance);
}
