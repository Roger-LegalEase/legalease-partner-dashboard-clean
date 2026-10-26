import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { stripMarkdownEmphasis, assertNoMarkdownDelimitersOnDeliveredPages } from './rcap-custom-pleading/composed-page-markdown.mjs';

const builder = 'scripts/build-census-v1-rcap-ga-guidance-implementation.mjs';
const directory = 'data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading';
const base = 'bf02d807328f4edfe1ff2541127563bb8b371086';
const oldSource = execFileSync('git', ['show', `${base}:${builder}`], { encoding: 'utf8' });
const source = fs.readFileSync(builder, 'utf8');
const specFrom = text => JSON.parse(text.slice(text.indexOf('const SPEC = ') + 13, text.indexOf('\n};') + 2));
const spec = specFrom(source);
const composeFrom = text => runInNewContext(text.slice(text.indexOf('function composedBody('), text.indexOf('/* ---- field-map helpers')) + '\ncomposedBody', {
  COMPONENT: Object.fromEntries(spec.components.map(c => [c.id, c])), DOTS: (n = 84) => '.'.repeat(n), assert, stripMarkdownEmphasis
});
const before = composeFrom(oldSource), compose = composeFrom(source);
let passed = 0;
const check = (name, run) => { run(); passed++; console.log(`PASS ${name}`); };
check('all source statements, route boundaries, fields and saved fixture facts unchanged', () => assert.deepEqual(spec, specFrom(oldSource)));
for (const [fixture, facts] of Object.entries(spec.fixtures)) {
  for (const component of spec.components) check(`${fixture}: only authored delimiters removed in ${component.id}`, () => {
    assert.equal(compose(component.id, facts), stripMarkdownEmphasis(before(component.id, facts)));
  });
  const pdf = `${directory}/fixtures/${fixture}.pdf`;
  const originalBytes = execFileSync('git', ['show', `${base}:${pdf}`]);
  const original = execFileSync('pdftotext', ['-layout', '-', '-'], { input: originalBytes, encoding: 'utf8' });
  const current = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' });
  check(`${fixture}: reviewer counterexample fails on rejected candidate`, () => {
    assert.equal((original.match(/\*\*/g) ?? []).length, 16);
    assert.throws(() => assertNoMarkdownDelimitersOnDeliveredPages(original.split('\f'), fixture), /markdown emphasis delimiters/);
  });
  check(`${fixture}: current saved pages contain no authored markup and lose no words`, () => {
    assertNoMarkdownDelimitersOnDeliveredPages(current.split('\f'), fixture);
    const words = text => text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    assert.equal(words(current), words(original));
    assert.equal(current.split('\f').length, original.split('\f').length);
  });
  check(`${fixture}: first two factual-record pages unchanged`, () => {
    assert.deepEqual(current.split('\f').slice(0, 2), original.split('\f').slice(0, 2));
  });
}
check('saved participant facts remain literal, including emphasis-like characters', () => {
  const facts = { ...spec.fixtures.canonical, 'participant.full_legal_name': 'Jordan **literal** __name__' };
  const saved = JSON.stringify(facts);
  for (const component of spec.components) assert.ok(compose(component.id, facts).includes(facts['participant.full_legal_name']));
  assert.equal(JSON.stringify(facts), saved);
});
check('missing owned fact still refuses rather than inventing an answer', () => {
  const facts = { ...spec.fixtures.canonical }; delete facts['participant.full_legal_name'];
  assert.throws(() => compose(spec.components[0].id, facts), /fixture does not hold/);
});
check('current nine measured counters zero; independent acceptance remains pending', () => {
  const counters = JSON.parse(fs.readFileSync(`${directory}/reports/completeness-counters.json`));
  assert.equal(Object.keys(counters.counters).length, 9);
  for (const count of Object.values(counters.counters)) assert.equal(count, 0);
  const status = JSON.parse(fs.readFileSync(`${directory}/build-status.json`));
  assert.equal(status.independentVerificationStatus, 'PENDING');
  assert.equal(status.generationAllowed, false);
});
console.log(JSON.stringify({ passed, failed: 0 }));
