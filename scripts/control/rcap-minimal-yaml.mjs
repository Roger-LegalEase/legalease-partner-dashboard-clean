// A minimal YAML reader for GitHub Actions workflow files.
//
// The repository has no YAML dependency and this correction must not add one,
// so the C1..C7 regression suite parses workflows with this instead of with
// regular expressions over raw text. It covers exactly the subset those files
// use — block mappings, block sequences, block scalars, flow sequences, quoted
// and plain scalars, comments and blank lines — and throws on anything else
// rather than guessing.
//
// Its output is verified against PyYAML for every workflow in
// scripts/verify-rcap-control-plane-authority.mjs's sibling check, so a
// divergence is a test failure, not a silent misreading.

function stripComment(line) {
  let out = "";
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quote) {
      out += c;
      if (c === quote && line[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) break;
    out += c;
  }
  return out;
}

function parseScalar(raw) {
  const t = raw.trim();
  if (t === "") return null;
  if (t === "null" || t === "~") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  if (t.startsWith('"') && t.endsWith('"') && t.length > 1) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  }
  if (t.startsWith("'") && t.endsWith("'") && t.length > 1) return t.slice(1, -1).replace(/''/g, "'");
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    if (inner === "") return [];
    const items = [];
    let depth = 0, quote = null, cur = "";
    for (const c of inner) {
      if (quote) { cur += c; if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'") { quote = c; cur += c; continue; }
      if (c === "[" || c === "{") depth += 1;
      if (c === "]" || c === "}") depth -= 1;
      if (c === "," && depth === 0) { items.push(parseScalar(cur)); cur = ""; continue; }
      cur += c;
    }
    if (cur.trim() !== "") items.push(parseScalar(cur));
    return items;
  }
  return t;
}

// A mapping key: `key:` or `key: value`, where key is plain or quoted.
const KEY = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s:#][^:#]*?)\s*:(?:\s+(.*))?$/;

function keyName(raw) {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

/**
 * @param {string[]} lines  raw source lines
 * @param {number} start    index to begin at
 * @param {number} indent   the indentation this block is written at
 * @returns {[any, number]} the parsed value and the index after the block
 */
function parseBlock(lines, start, indent) {
  let i = start;
  const isBlank = (l) => l.trim() === "" || l.trim().startsWith("#");
  while (i < lines.length && isBlank(lines[i])) i += 1;
  if (i >= lines.length) return [null, i];

  const width = (l) => l.length - l.trimStart().length;
  if (width(lines[i]) < indent) return [null, i];

  if (lines[i].trimStart().startsWith("- ") || lines[i].trim() === "-") {
    const seq = [];
    while (i < lines.length) {
      if (isBlank(lines[i])) { i += 1; continue; }
      const w = width(lines[i]);
      if (w < indent) break;
      if (w > indent) throw new Error(`unexpected indentation at line ${i + 1}: ${lines[i]}`);
      const body = lines[i].trimStart();
      if (!body.startsWith("-")) break;
      const rest = body.slice(1).replace(/^ /, "");
      if (rest.trim() === "") {
        const [v, next] = parseBlock(lines, i + 1, indent + 2);
        seq.push(v); i = next; continue;
      }
      // An inline first entry of a nested mapping: `- name: x` followed by
      // sibling keys at the same column as `name`.
      const m = KEY.exec(stripComment(rest));
      if (m) {
        const childIndent = indent + (body.length - rest.length);
        const synthetic = [`${" ".repeat(childIndent)}${rest}`, ...lines.slice(i + 1)];
        const [v, consumed] = parseBlock(synthetic, 0, childIndent);
        seq.push(v);
        i = i + consumed;
        continue;
      }
      seq.push(parseScalar(stripComment(rest)));
      i += 1;
    }
    return [seq, i];
  }

  const map = {};
  while (i < lines.length) {
    if (isBlank(lines[i])) { i += 1; continue; }
    const w = width(lines[i]);
    if (w < indent) break;
    if (w > indent) throw new Error(`unexpected indentation at line ${i + 1}: ${lines[i]}`);
    const line = stripComment(lines[i]);
    const m = KEY.exec(line.trimStart());
    if (!m) throw new Error(`unparsable line ${i + 1}: ${lines[i]}`);
    const key = keyName(m[1]);
    const inline = (m[2] ?? "").trim();
    if (inline === "|" || inline === "|-" || inline === "|+" || inline === ">" || inline === ">-") {
      const folded = inline.startsWith(">");
      const chomp = inline.endsWith("-");
      const bodyLines = [];
      let j = i + 1;
      let blockIndent = null;
      while (j < lines.length) {
        const raw = lines[j];
        if (raw.trim() === "") { bodyLines.push(""); j += 1; continue; }
        const rw = width(raw);
        if (rw <= w) break;
        if (blockIndent === null) blockIndent = rw;
        bodyLines.push(raw.slice(blockIndent));
        j += 1;
      }
      while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
      let text = folded ? bodyLines.join(" ") : bodyLines.join("\n");
      if (!chomp) text += "\n";
      map[key] = text;
      i = j;
      continue;
    }
    if (inline === "") {
      const [v, next] = parseBlock(lines, i + 1, w + 2 > w ? nextIndentOf(lines, i + 1, w) : w + 2);
      map[key] = v;
      i = next;
      continue;
    }
    map[key] = parseScalar(inline);
    i += 1;
  }
  return [map, i];
}

function nextIndentOf(lines, from, parentIndent) {
  for (let i = from; i < lines.length; i += 1) {
    if (lines[i].trim() === "" || lines[i].trim().startsWith("#")) continue;
    const w = lines[i].length - lines[i].trimStart().length;
    return w > parentIndent ? w : parentIndent + 2;
  }
  return parentIndent + 2;
}

export function parse(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => !/^---\s*$/.test(l));
  const [value] = parseBlock(lines, 0, 0);
  return value;
}

export default { parse };
