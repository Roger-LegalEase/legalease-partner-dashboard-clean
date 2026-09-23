import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const CHECKOUT_METADATA_GATES = ["scripts/rcap-hosted-checkout-gate.mjs", "scripts/rcap-github-acceptance-gate.mjs"];

function parsed(source) {
  const tree = ts.createSourceFile("contract.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const nodes = [];
  function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
  visit(tree);
  return { tree, nodes };
}
const text = node => node?.getText().replace(/\s+/g, "") ?? "";
function declaration(nodes, name) {
  const found = nodes.filter(n => ts.isVariableDeclaration(n) && n.name.getText() === name);
  return found.length === 1 ? found[0].initializer : undefined;
}
function properties(node) {
  if (!node || !ts.isObjectLiteralExpression(node)) return new Map();
  return new Map(node.properties.map(p => [p.name?.getText(), ts.isPropertyAssignment(p) ? text(p.initializer) : text(p)]));
}
function conjuncts(node) {
  if (node && ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return [...conjuncts(node.left), ...conjuncts(node.right)];
  }
  return [text(node)];
}

// Parse the exact objects/call sites. A key in a comment, a DB query, or an
// unrelated builder cannot satisfy these checks. Mutations pass altered source
// strings here, never edit an application or a concurrently used worktree.
export function checkoutMetadataContractFailures({ root = process.cwd(), sources = {} } = {}) {
  const read = file => sources[file] ?? fs.readFileSync(path.join(root, file), "utf8");
  const failures = [];
  const check = (yes, reason) => { if (!yes) failures.push(reason); };
  const contractPath = "scripts/rcap-checkout-metadata-contract.mjs";
  const helper = parsed(read(contractPath));
  const expected = properties(declaration(helper.nodes, "expected"));
  const mappings = {
    channel: '"expungement_ai_consumer"', user_id: "userId", briefcase_item_id: "stored.id",
    product_id: "productId", person_id: "personId", matter_id: "matterId",
    result_code: "stored.result_code", source_session_id: 'stored.source_session_id??""',
    jurisdiction: "stored.jurisdiction", packet_type: "stored.packet_type",
    pathway_id: "verification.snapshot.pathwayId", verification_hash: "verification.hash",
    render_input_hash: "renderInputHash"
  };
  for (const [key, value] of Object.entries(mappings)) check(expected.get(key) === value, `expectation.${key}: authoritative binding missing or changed`);
  check(expected.size === 13 && !expected.has("pathway_label"), "expectation.pathway_id: exact 13-key contract; pathway_label is not metadata");

  const returns = helper.nodes.filter(n => ts.isCallExpression(n) && text(n.expression) === "expectedCheckoutMetadata");
  const authorityArgs = properties(returns.length === 1 ? returns[0].arguments[0] : undefined);
  for (const [key, value] of Object.entries({ userId: "userId", stored: "stored", personId: "personRow.id",
    matterId: "consumerMatterIdForItem(stored.id)", productId: "CONSUMER_PACKET_PRODUCT_ID",
    verification: "verification", renderInputHash: "preflight.renderInputHash" })) {
    check(authorityArgs.get(key) === value, `authority.${key}: canonical source missing or changed`);
  }
  check(text(declaration(helper.nodes, "verification")) === "requireCurrentPacketVerificationRecord({id:stored.id,state:stored.jurisdiction,artifactRefs:{}},protectedVerification)",
    "authority.verification_hash: protected record must be validated");
  check(text(declaration(helper.nodes, "preflight")) === "readyToPurchase({snapshot,verificationHash:verification.hash,facts:{...snapshot.screeningAnswers,...snapshot.prefilledAnswers,...snapshot.packetAnswers,...snapshot.serverFacts}})",
    "authority.render_input_hash: use the application's full verified-input preflight");

  const adapter = parsed(read("src/lib/expungement-ai/payment-adapter.ts"));
  const builder = adapter.nodes.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "checkoutMetadata");
  const returned = builder?.body?.statements.find(ts.isReturnStatement)?.expression;
  const actual = properties(returned);
  const appMappings = {
    channel: '"expungement_ai_consumer"', user_id: "binding.userId", briefcase_item_id: "binding.briefcaseItemId",
    product_id: "binding.productId", person_id: "binding.personId", matter_id: "binding.matterId",
    result_code: 'item.resultCode??""', source_session_id: 'item.sourceSessionId??""', jurisdiction: "item.state",
    packet_type: 'item.packetType??""', pathway_id: "binding.pathwayId", verification_hash: "binding.verificationHash"
  };
  for (const [key, value] of Object.entries(appMappings)) check(actual.get(key) === value, `application.${key}: checkoutMetadata builder differs`);
  check(actual.size === 12 && !actual.has("pathway_label"), "application.pathway_id: exact metadata builder required");
  const emitted = properties(declaration(adapter.nodes, "metadata"));
  check(emitted.get("render_input_hash") === "renderInputHashAtCheckout"
    && text(declaration(adapter.nodes, "renderInputHashAtCheckout")) === "purchaseReadiness.renderInputHash",
  "application.render_input_hash: Checkout-time preflight binding required");

  for (const file of CHECKOUT_METADATA_GATES) {
    const { nodes } = parsed(read(file));
    const expectedCall = declaration(nodes, "expectedMetadata");
    check(text(expectedCall) === "awaitcheckoutMetadataExpectation({userId:A.id,stored,personRow,protectedVerification})",
      `${file}: metadata authority must use the owned row, resolved person and protected verification`);
    check(text(declaration(nodes, "metadataProof")) === "checkoutMetadataEvidence(session?.metadata,expectedMetadata)",
      `${file}: compare actual Stripe metadata with the independent expectation`);
    check(text(declaration(nodes, "metadataExact")) === "metadataProof.passed", `${file}: metadataExact must use the exact verdict`);
    for (const name of ["sessionExact", "personMatterProductBound"]) {
      check(conjuncts(declaration(nodes, name)).includes("metadataExact"), `${file}: ${name} must require metadataExact`);
    }
    const records = nodes.filter(n => ts.isCallExpression(n) && text(n.expression) === "record"
      && n.arguments[0] && ts.isStringLiteral(n.arguments[0])
      && n.arguments[0].text === "stripe_session_amount_mode_metadata_and_product_exact");
    check(records.length === 1 && text(records[0].arguments[1]) === "sessionExact", `${file}: recorded verdict must require sessionExact`);
    check(expectedCall?.pos < declaration(nodes, "checkoutResponse")?.pos, `${file}: derive expectations before Checkout creates the Session`);
    check(/\bsource_session_id\b/.test(declaration(nodes, "reread")?.getText() ?? ""), `${file}: source_session_id must be selected from the item`);
    const oldReferences = nodes.filter(n => ts.isPropertyAccessExpression(n) && n.name.text === "pathway_label"
      && text(n.expression) === "session.metadata");
    check(oldReferences.length === 0, `${file}: pathway_label is not Checkout metadata`);
    const imports = nodes.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === "./rcap-checkout-metadata-contract.mjs");
    check(imports.length === 1 && ["checkoutMetadataExpectation", "checkoutMetadataEvidence"].every(name =>
      imports[0].importClause?.namedBindings?.elements.some(e => e.name.text === name && !e.propertyName)),
    `${file}: use the shared checked metadata contract`);
  }
  return failures;
}

export async function checkoutMetadataBehaviorFailures() {
  const { captureCheckoutMetadataFixture } = await import("./test-expungement-checkout-guards.mjs");
  const { expectedCheckoutMetadata, checkoutMetadataEvidence } = await import("./rcap-checkout-metadata-contract.mjs");
  const { actual, authority } = await captureCheckoutMetadataFixture();
  const expected = expectedCheckoutMetadata(authority);
  const failures = [];
  if (!checkoutMetadataEvidence(actual, expected).passed) failures.push("actual adapter metadata must satisfy the acceptance expectation");
  for (const key of Object.keys(expected)) {
    const changed = { ...actual, [key]: "wrong-binding" };
    const proof = checkoutMetadataEvidence(changed, expected);
    if (proof.passed || !proof.failures.some(f => f.startsWith(`${key}:`))) failures.push(`${key}: substituted metadata was not refused`);
  }
  const unexpected = checkoutMetadataEvidence({ ...actual, pathway_label: "display value" }, expected);
  if (unexpected.passed) failures.push("pathway_label: extra display metadata must refuse");
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = [...checkoutMetadataContractFailures(), ...await checkoutMetadataBehaviorFailures()];
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else console.log("OK Checkout metadata contract: 2 gates, exact 13 keys, protected source bindings");
}
