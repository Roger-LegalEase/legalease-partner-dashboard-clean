// Reads back the text LegalEase wrote on a page, with the coordinate it was
// written at.
//
// This is deliberately NOT a general PDF text extractor. It is pointed only at
// the appended overlay layer -- the stream this factory itself produced -- so
// it only has to understand the operators the factory emits: a text object with
// a translation-only text matrix, or a form XObject placed by a translation-only
// CTM. Anything else it declines to read rather than approximate.
//
// Reading the value back matters because the pixel side of the proof can see
// that SOMETHING was drawn in a box but cannot say what. "A mark landed in the
// Case No. rule" and "the case number landed in the Case No. rule" are different
// findings, and only the second one clears a family.
import { decodeStream } from "./rcap-page-layers.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PDFName, PDFDict } = require("pdf-lib");

/** PDF string literal `(...)` with its escapes resolved. */
function decodeLiteral(body) {
  let out = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch !== "\\") { out += ch; continue; }
    const next = body[i + 1];
    i += 1;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else if (next === "b") out += "\b";
    else if (next === "f") out += "\f";
    else if (next >= "0" && next <= "7") {
      let oct = next;
      while (oct.length < 3 && body[i + 1] >= "0" && body[i + 1] <= "7") { oct += body[i + 1]; i += 1; }
      out += String.fromCharCode(parseInt(oct, 8));
    } else out += next;
  }
  return out;
}

const decodeHex = (body) => {
  const clean = body.replace(/[^0-9a-fA-F]/g, "");
  const padded = clean.length % 2 ? `${clean}0` : clean;
  let out = "";
  for (let i = 0; i < padded.length; i += 2) out += String.fromCharCode(parseInt(padded.slice(i, i + 2), 16));
  return out;
};

/** Splits a content stream into operands-plus-operator steps. */
function* tokenize(text) {
  const re = /<([0-9a-fA-F\s]*)>|\(((?:\\.|[^\\()])*)\)|\/([^\s/<>\[\]()]+)|(-?\d*\.?\d+)|(\[|\])|([A-Za-z'"*]+)/g;
  let operands = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match[1] !== undefined) { operands.push({ kind: "string", value: decodeHex(match[1]) }); continue; }
    if (match[2] !== undefined) { operands.push({ kind: "string", value: decodeLiteral(match[2]) }); continue; }
    if (match[3] !== undefined) { operands.push({ kind: "name", value: match[3] }); continue; }
    if (match[4] !== undefined) { operands.push({ kind: "number", value: Number(match[4]) }); continue; }
    if (match[5] !== undefined) { operands.push({ kind: "delim", value: match[5] }); continue; }
    yield { operator: match[6], operands };
    operands = [];
  }
}

/**
 * Every text run in `streamText`, as `{ text, x, y, fontSize }` in page points.
 *
 * `resources` is the dictionary the stream draws against, used to follow a
 * `Do` into a form XObject; `offset` is the translation already applied by an
 * enclosing CTM. Recursion is depth-limited because a malformed resource graph
 * can be cyclic.
 */
export function textRuns(context, streamText, resources, offset = { x: 0, y: 0 }, depth = 0) {
  if (depth > 4) return [];
  const runs = [];
  let ctm = { x: offset.x, y: offset.y };
  const ctmStack = [];
  let tm = null;
  let leading = 0;
  let fontSize = 0;
  let pendingText = null;

  const flush = () => {
    if (!pendingText || !pendingText.text) { pendingText = null; return; }
    runs.push(pendingText);
    pendingText = null;
  };
  const place = (value) => {
    if (!tm) return;
    if (pendingText && pendingText.tmX === tm.x && pendingText.tmY === tm.y) { pendingText.text += value; return; }
    flush();
    pendingText = { text: value, x: ctm.x + tm.x, y: ctm.y + tm.y, fontSize, tmX: tm.x, tmY: tm.y };
  };

  for (const { operator, operands } of tokenize(streamText)) {
    const nums = operands.filter((o) => o.kind === "number").map((o) => o.value);
    switch (operator) {
      case "q": ctmStack.push({ ...ctm }); break;
      case "Q": { flush(); const popped = ctmStack.pop(); if (popped) ctm = popped; break; }
      case "cm":
        // Only translation is followed. A scaled or rotated placement would
        // move and resize every coordinate below it, and reporting a point
        // position for it as though it were unscaled would be a lie.
        if (nums.length === 6) {
          if (nums[0] === 1 && nums[1] === 0 && nums[2] === 0 && nums[3] === 1) {
            ctm = { x: ctm.x + nums[4], y: ctm.y + nums[5] };
          } else {
            ctm = { x: ctm.x + nums[4], y: ctm.y + nums[5], unsupportedTransform: true };
          }
        }
        break;
      case "BT": tm = { x: 0, y: 0 }; break;
      case "ET": flush(); tm = null; break;
      case "Tf": if (nums.length) fontSize = nums[nums.length - 1]; break;
      case "TL": if (nums.length) leading = nums[0]; break;
      case "Tm": if (nums.length === 6) { flush(); tm = { x: nums[4], y: nums[5] }; } break;
      case "Td": if (nums.length === 2 && tm) { flush(); tm = { x: tm.x + nums[0], y: tm.y + nums[1] }; } break;
      case "TD": if (nums.length === 2 && tm) { flush(); leading = -nums[1]; tm = { x: tm.x + nums[0], y: tm.y + nums[1] }; } break;
      case "T*": if (tm) { flush(); tm = { x: tm.x, y: tm.y - leading }; } break;
      case "Tj": case "'": case "\"": {
        const str = operands.filter((o) => o.kind === "string").pop();
        if (operator !== "Tj" && tm) { flush(); tm = { x: tm.x, y: tm.y - leading }; }
        if (str) place(str.value);
        break;
      }
      case "TJ":
        for (const operand of operands) if (operand.kind === "string") place(operand.value);
        break;
      case "Do": {
        flush();
        const name = operands.filter((o) => o.kind === "name").pop();
        if (!name || !resources) break;
        const xobjects = context.lookup(resources.get(PDFName.of("XObject")));
        if (!(xobjects instanceof PDFDict)) break;
        const ref = xobjects.get(PDFName.of(name.value));
        if (!ref) break;
        const nested = decodeStream(context, ref);
        if (nested === null) break;
        const nestedDict = context.lookup(ref)?.dict;
        const nestedResources = nestedDict ? context.lookup(nestedDict.get(PDFName.of("Resources"))) : null;
        runs.push(...textRuns(context, nested, nestedResources instanceof PDFDict ? nestedResources : resources, ctm, depth + 1));
        break;
      }
      default: break;
    }
  }
  flush();
  return runs.map(({ text, x, y, fontSize: size }) => ({ text, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), fontSize: size }));
}
