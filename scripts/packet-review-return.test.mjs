import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = require('react/jsx-runtime');
function load(file, mocks, suffix = '') {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8') + suffix, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => mocks[name] ??
    (name === 'react/jsx-runtime' ? jsx : {}), mod, mod.exports);
  return mod.exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const row = { key: 'packetAnswers:county', editId: 'county', label: 'County', value: 'Hinds' };
const target = '/briefcase/matter/review#review-packetAnswers%3Acounty';
test('packet-information page carries row identity to the single-question editor', async () => {
  const Builder = () => null;
  const question = { id: 'county', prompt: 'County' };
  const item = { id: 'matter', jurisdiction: 'MS', resultCode: 'packet_ready', paymentState: 'unpaid',
    packetDraft: { status: 'available', questions: [question], builderQuestions: [question],
      initialAnswers: { county: 'Hinds' }, missingInputIds: [] } };
  const { default: Page } = load('src/app/briefcase/[packetId]/packet-information/page.tsx', {
    '@/components/expungement-ai/PacketInformationBuilder': { PacketInformationBuilder: Builder },
    '@/lib/expungement-ai/auth': { requireConsumerBriefcaseSession: async () => ({ userId: 'owner' }) },
    '@/lib/expungement-ai/briefcase': { getBriefcaseItem: async () => item },
    '@/lib/expungement-ai/briefcase-presentation-authority': { decorateBriefcaseItemForPresentation: async () => item }
  });
  const tree = await Page({ params: Promise.resolve({ packetId: 'matter' }),
    searchParams: Promise.resolve({ edit: 'county', returnRow: row.key }) });
  const editor = nodes(tree).find(n => n.type === Builder);
  assert.equal(editor.props.reviewReturnRow, row.key);
  assert.equal(editor.props.editingFromReview, true);
  assert.deepEqual(editor.props.questions, [question]);
  assert.deepEqual(editor.props.initialAnswers, { county: 'Hinds' });
});
test('review edit links retain the exact originating row, even for repeated fact IDs', () => {
  const { AnswerSection } = load('src/app/briefcase/[packetId]/review/page.tsx', {}, '\nexport { AnswerSection };');
  const tree = AnswerSection({ title: 'Facts', itemId: 'matter', rows: [row, { ...row, key: 'prefilledAnswers:county' }] });
  const rendered = nodes(tree);
  const links = rendered.filter(n => n.props?.href);
  assert.equal(links.length, 2);
  for (const link of links) {
    const url = new URL(link.props.href, 'https://local.test');
    assert.equal(url.searchParams.get('edit'), 'county');
    const key = url.searchParams.get('returnRow');
    assert.ok(key);
    assert.equal(rendered.filter(n => n.props?.id === `review-${key}`).length, 1);
  }
  assert.notEqual(links[0].props.href, links[1].props.href);
});
for (const action of ['save', 'back', 'failed-save', 'ordinary-save']) {
  test(`${action} preserves the appropriate review destination`, async () => {
    const pushes = [];
    let fetches = 0;
    const priorFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetches++;
      return { ok: action !== 'failed-save', json: async () => ({ reviewPath: '/briefcase/matter/review', missingInputIds: [] }) };
    };
    try {
      const { PacketInformationBuilder } = load('src/components/expungement-ai/PacketInformationBuilder.tsx', {
        react: { useMemo: fn => fn(), useState: initial => [initial, () => {}] },
        'next/navigation': { useRouter: () => ({ push: url => pushes.push(url) }) },
        '@/components/expungement-ai/LocalizationProvider': { useLocalization: () => ({ t: (_key, fallback) => fallback }) },
        '@/components/expungement-ai/screening/answers': { blocksContinue: () => false }
      });
      const tree = PacketInformationBuilder({ itemId: 'matter', stateCode: 'MS',
        questions: [{ id: 'county', label: 'County' }], initialAnswers: { county: 'Hinds' }, initiallyMissing: [],
        editingFromReview: action !== 'ordinary-save', reviewReturnRow: row.key });
      const buttons = nodes(tree).filter(n => n.type === 'button');
      const label = action === 'back' ? 'Back' : action === 'ordinary-save' ? 'Review packet facts' : 'Save and return to review';
      const button = buttons.find(n => n.props.children === label);
      assert.ok(button, label);
      button.props.onClick();
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(pushes, action === 'failed-save' ? [] : [action === 'ordinary-save' ? '/briefcase/matter/review' : target]);
      assert.equal(fetches, action === 'back' ? 0 : 1);
    } finally { globalThis.fetch = priorFetch; }
  });
}
