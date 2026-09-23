import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

export function syntax(file, source = fs.readFileSync(file, "utf8")) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (tree.parseDiagnostics.length) throw new Error(`${file}: syntax errors`);
  const nodes = [];
  function walk(n) { nodes.push(n); ts.forEachChild(n, walk); }
  walk(tree);
  return { tree, nodes, source };
}
export function initializer(parsed, name, index = 0) {
  const nodes = parsed.nodes.filter(n => ts.isVariableDeclaration(n) && n.name.getText() === name);
  if (!nodes[index]?.initializer) throw new Error(`missing declaration: ${name}[${index}]`);
  return nodes[index].initializer.getText();
}
export function evaluate(expression, context = {}) {
  return vm.runInNewContext(`(${expression})`, context, { timeout: 1000 });
}
export function literalCaseIds(parsed) {
  return [...new Set(parsed.nodes.filter(n => ts.isCallExpression(n) && n.expression.getText() === "record"
    && ts.isStringLiteral(n.arguments[0])).map(n => n.arguments[0].text))];
}
export function requiredHostedCases(root = ".", catalogProductId = "") {
  const read = name => syntax(`${root}/scripts/${name}`);
  const gallery = read("rcap-hosted-acceptance-gallery.mjs");
  return {
    "checkout-gate.json": [...literalCaseIds(read("rcap-hosted-checkout-gate.mjs")),
      ...literalCaseIds(read("rcap-hosted-final-verification.mjs"))],
    "matrix.json": Array.from(evaluate(initializer(read("rcap-hosted-acceptance-matrix.mjs"), "REQUIRED_CASES"))),
    "payment.json": Array.from(evaluate(initializer(read("rcap-hosted-acceptance-payment.mjs"), "REQUIRED_CASES"), { process: { env: { HOSTED_STRIPE_CATALOG_PRODUCT_ID: catalogProductId } }, CATALOG_PRODUCT_ID: catalogProductId })),
    "gallery.json": Array.from(evaluate(initializer(gallery, "REQUIRED_CASES"), {
      PRIORITY: evaluate(initializer(gallery, "PRIORITY"))
    }))
  };
}
