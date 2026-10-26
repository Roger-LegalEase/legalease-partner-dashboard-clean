import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { courtFacingRows } from './court-facing-rows.mjs';
import { stripMarkdownEmphasis } from './composed-page-markdown.mjs';

export const WA_ACCEPTED_RENDERER = 'scripts/build-census-v1-wa_vac_substance_use_disorder-custom-pleading.mjs';

// Exact accepted-family exception to the shared-wrapper structural test. No
// current or future arbitrary builder can acquire this exception by its name.
export function verifyWaAcceptedRenderer(source) {
  assert.equal(createHash('sha256').update(source).digest('hex'),
    'fd2ffce4a60ded8fc0fd77cfc30944b2b1550b8ba121ee0b817671c6006c16b5');
  const ast = ts.createSourceFile(WA_ACCEPTED_RENDERER, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let spec;
  const functions = [];
  for (const statement of ast.statements) {
    if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) {
      if (d.name.getText(ast) === 'SPEC') spec = JSON.parse(d.initializer.getText(ast));
    }
    if (ts.isFunctionDeclaration(statement) && ['composedBody', 'sanitizePdfText'].includes(statement.name?.text)) {
      functions.push(statement.getText(ast));
    }
  }
  assert(spec && functions.length === 2);
  const context = {SPEC:spec,assert,stripMarkdownEmphasis,DOTS:(n=84)=>'.'.repeat(n),
    COMPONENT:Object.fromEntries(spec.components.map(c=>[c.id,c]))};
  vm.createContext(context);
  vm.runInContext(functions.join('\n'), context);
  let componentFixtures = 0, lines = 0;
  for (const fixture of ['canonical','boundary']) for (const component of spec.components) {
    const body = context.sanitizePdfText(context.composedBody(component.id, spec.fixtures[fixture]));
    for (const line of body.split('\n')) {
      const wrapped = [line, 'second wrapped row'];
      assert.strictEqual(courtFacingRows(()=>wrapped)(line), wrapped);
      lines++;
    }
    componentFixtures++;
  }
  assert.equal(componentFixtures,10);
  assert.equal(lines,488);
  return {componentFixtures,lines};
}
