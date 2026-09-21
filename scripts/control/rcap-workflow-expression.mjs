// A small, exact evaluator for the GitHub Actions expression subset this
// repository's workflows actually use.
//
// It exists so a test can SIMULATE a phase — "run payment_environment_probe and
// tell me which steps execute" — instead of asserting on regular expressions
// over YAML. Anything outside the supported subset throws rather than guessing,
// so a workflow that grows a construct this cannot model fails loudly.
//
// Supported: string/number/boolean literals, `null`, parentheses, `!`, `==`,
// `!=`, `&&`, `||`, property paths on the standard contexts, and the functions
// always(), success(), failure(), cancelled(), contains(), startsWith(),
// endsWith(), fromJSON(), format(), toJSON().

const CONTEXTS = new Set([
  "inputs", "steps", "needs", "github", "vars", "secrets", "env", "job", "runner", "matrix", "strategy"
]);

function tokenize(src) {
  const t = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === "'") {
      let j = i + 1, out = "";
      while (j < src.length) {
        if (src[j] === "'" && src[j + 1] === "'") { out += "'"; j += 2; continue; }
        if (src[j] === "'") break;
        out += src[j]; j += 1;
      }
      if (j >= src.length) throw new Error(`unterminated string in ${src}`);
      t.push({ k: "str", v: out }); i = j + 1; continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === "&&" || two === "||" || two === ">=" || two === "<=") {
      t.push({ k: "op", v: two }); i += 2; continue;
    }
    if ("()!,<>".includes(c)) { t.push({ k: "op", v: c }); i += 1; continue; }
    if (c === "[") {
      // Index access, e.g. matrix.entry.ids[0]. Folded into the preceding path
      // token so lookup() sees one dotted path.
      const close = src.indexOf("]", i);
      if (close === -1) throw new Error(`unterminated index in ${src}`);
      const inner = src.slice(i + 1, close).trim().replace(/^'|'$/g, "");
      const prev = t[t.length - 1];
      if (!prev || prev.k !== "word") throw new Error(`index without a path in ${src}`);
      prev.v = `${prev.v}.${inner}`;
      i = close + 1;
      continue;
    }
    const m = /^[A-Za-z_][A-Za-z0-9_.\-*]*|^-?[0-9]+(?:\.[0-9]+)?/.exec(src.slice(i));
    if (!m) throw new Error(`unexpected character ${JSON.stringify(c)} in ${src}`);
    t.push({ k: "word", v: m[0] }); i += m[0].length; continue;
  }
  return t;
}

/**
 * @param {string} src   expression source, without the ${{ }} wrapper
 * @param {object} ctx   { inputs, steps, needs, github, vars, secrets, env }
 * @param {object} opts  { stepStatus: "success" | "failure" | "cancelled" }
 */
export function evaluateExpression(src, ctx, opts = {}) {
  const tokens = tokenize(src);
  let p = 0;
  const peek = () => tokens[p];
  const eat = (v) => {
    const t = tokens[p];
    if (!t || (v !== undefined && t.v !== v)) throw new Error(`expected ${v} in ${src}`);
    p += 1;
    return t;
  };
  const status = opts.stepStatus ?? "success";

  const lookup = (pathStr) => {
    const parts = pathStr.split(".");
    if (!CONTEXTS.has(parts[0])) throw new Error(`unsupported context ${parts[0]} in ${src}`);
    let cur = ctx[parts[0]];
    for (const seg of parts.slice(1)) {
      if (cur === undefined || cur === null) return "";
      cur = cur[seg];
    }
    return cur === undefined || cur === null ? "" : cur;
  };

  function primary() {
    const t = peek();
    if (!t) throw new Error(`unexpected end of ${src}`);
    if (t.k === "op" && t.v === "(") { eat("("); const v = orExpr(); eat(")"); return v; }
    if (t.k === "op" && t.v === "!") { eat("!"); return !truthy(primary()); }
    if (t.k === "str") { eat(); return t.v; }
    if (t.k === "word") {
      const next = tokens[p + 1];
      if (next && next.k === "op" && next.v === "(") return call(eat().v);
      eat();
      if (t.v === "true") return true;
      if (t.v === "false") return false;
      if (t.v === "null") return null;
      if (/^-?[0-9]/.test(t.v)) return Number(t.v);
      return lookup(t.v);
    }
    throw new Error(`unexpected token ${JSON.stringify(t)} in ${src}`);
  }

  function call(name) {
    eat("(");
    const args = [];
    if (!(peek() && peek().v === ")")) {
      args.push(orExpr());
      while (peek() && peek().v === ",") { eat(","); args.push(orExpr()); }
    }
    eat(")");
    switch (name) {
      case "always": return true;
      case "success": return status === "success";
      case "failure": return status === "failure";
      case "cancelled": return status === "cancelled";
      case "fromJSON": return JSON.parse(String(args[0]));
      case "toJSON": return JSON.stringify(args[0]);
      case "contains":
        return Array.isArray(args[0])
          ? args[0].some((x) => String(x) === String(args[1]))
          : String(args[0]).includes(String(args[1]));
      case "startsWith": return String(args[0]).startsWith(String(args[1]));
      case "endsWith": return String(args[0]).endsWith(String(args[1]));
      case "format": {
        let out = String(args[0]);
        args.slice(1).forEach((a, idx) => { out = out.split(`{${idx}}`).join(String(a)); });
        return out;
      }
      default: throw new Error(`unsupported function ${name}() in ${src}`);
    }
  }

  const truthy = (v) => !(v === false || v === "" || v === 0 || v === null || v === undefined);
  const loose = (a, b) => (typeof a === typeof b ? a === b : String(a) === String(b));

  function eqExpr() {
    let left = primary();
    while (peek() && peek().k === "op" && ["==", "!="].includes(peek().v)) {
      const op = eat().v;
      const right = primary();
      left = op === "==" ? loose(left, right) : !loose(left, right);
    }
    return left;
  }
  function andExpr() {
    let left = eqExpr();
    while (peek() && peek().v === "&&") { eat("&&"); const r = eqExpr(); left = truthy(left) ? r : left; }
    return left;
  }
  function orExpr() {
    let left = andExpr();
    while (peek() && peek().v === "||") { eat("||"); const r = andExpr(); left = truthy(left) ? left : r; }
    return left;
  }

  const value = orExpr();
  if (p !== tokens.length) {
    throw new Error(`parser did not reach end of input after parsing the expression; ${tokens.length - p} remaining token(s): ${tokens.slice(p).map((x) => x.v).join(" ")}`);
  }
  return value;
}

export function isTrue(src, ctx, opts) {
  const v = evaluateExpression(src, ctx, opts);
  return !(v === false || v === "" || v === 0 || v === null || v === undefined);
}

/** Every `${{ ... }}` fragment in a YAML text, with its 1-based line number. */
export function extractExpressions(text) {
  const out = [];
  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    const re = /\$\{\{([\s\S]*?)\}\}/g;
    let m;
    while ((m = re.exec(line)) !== null) out.push({ line: idx + 1, source: m[1].trim() });
  });
  return out;
}
