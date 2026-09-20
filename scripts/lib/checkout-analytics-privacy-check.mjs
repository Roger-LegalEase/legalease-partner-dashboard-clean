// Follow the real server import/call and execute the helper with isolated sinks.
import ts from 'typescript';
import vm from 'node:vm';
export async function checkoutAnalyticsPrivacyProblems(routeSource, helperSource) {
  const problems = [];
  if (!routeSource || !helperSource) return ['checkout analytics route or helper is missing'];
  const tree = ts.createSourceFile('route.ts', routeSource, ts.ScriptTarget.Latest, true);
  let imported = false, boundCalls = 0;
  const visit = node => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@/lib/expungement-ai/checkout-analytics') {
      imported = node.importClause?.namedBindings?.elements?.some(e => e.name.text === 'scheduleConsumerCheckoutCompleted' && (!e.propertyName || e.propertyName.text === e.name.text)) === true;
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'scheduleConsumerCheckoutCompleted') {
      boundCalls++;
      let p = node.parent, paidGuard = false;
      while (p) { if (ts.isIfStatement(p) && p.expression.getText(tree) === 'status.paid' && p.thenStatement.pos <= node.pos && p.thenStatement.end >= node.end) paidGuard = true; p = p.parent; }
      if (!paidGuard) problems.push('checkout analytics call is not guarded by confirmed paid status');
      if (ts.isAwaitExpression(node.parent)) problems.push('checkout analytics blocks the payment response');
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  if (!imported || boundCalls !== 1) problems.push('payment confirmation does not bind exactly one call to the real checkout analytics helper');
  const helperTree = ts.createSourceFile('helper.ts', helperSource, ts.ScriptTarget.Latest, true);
  const imports = helperTree.statements.filter(ts.isImportDeclaration);
  if (!imports.some(n => n.moduleSpecifier.text === 'server-only')) problems.push('checkout analytics helper is not server-only');
  if (!imports.some(n => n.moduleSpecifier.text === '@/lib/analytics/server-events' && n.importClause?.namedBindings?.elements?.some(e => e.name.text === 'recordServerFunnelEvent'))) problems.push('checkout analytics emitter import is unbound');
  for (const fallback of [false, true]) {
    const calls = [], logs = [], scheduled = [];
    const exports = {};
    const require = name => {
      if (name === 'server-only') return {};
      if (name === 'next/server') return { after: callback => { if (fallback) throw Error('outside request scope'); scheduled.push(callback); } };
      if (name === '@/lib/analytics/server-events') return { recordServerFunnelEvent: async (...args) => { calls.push(args); } };
      throw Error('unexpected helper dependency: ' + name);
    };
    try {
      const js = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      vm.runInNewContext(js, { exports, require, console: Object.fromEntries(['log','error','warn','info','debug'].map(k => [k, (...a) => logs.push(a)])) }, { timeout: 1000 });
      const options = { request: null, checkoutSessionId: 'cs_private_seed', state: 'IL', amountCents: 5000, mode: 'test', email: 'private@example.test', phone: '5551234567', caseNumber: 'private-case', token: 'private-token' };
      const result = exports.scheduleConsumerCheckoutCompleted(options);
      if (result !== undefined) problems.push('scheduled helper must return without awaiting analytics');
      if (!fallback) {
        if (calls.length !== 0 || scheduled.length !== 1) problems.push('analytics must schedule once after the response');
        for (const callback of scheduled) await callback();
      }
      await Promise.resolve();
      if (logs.length) problems.push('checkout analytics helper logs participant or payment data');
      if (calls.length !== 1) { problems.push('checkout analytics must emit exactly once'); continue; }
      const [request, event, payload] = calls[0];
      if (request !== null || event !== 'checkout_completed') problems.push('wrong trusted checkout event');
      const expected = { idempotencySeed: 'cs_private_seed', productSurface: 'expungement_ai', state: 'IL', meta: { result: 'paid', mode: 'test', amount_cents: 5000 } };
      if (JSON.stringify(payload) !== JSON.stringify(expected)) problems.push('checkout analytics payload differs from the allowed privacy fields');
    } catch (error) { problems.push('checkout analytics helper cannot be verified: ' + error.message); }
  }
  return [...new Set(problems)];
}
