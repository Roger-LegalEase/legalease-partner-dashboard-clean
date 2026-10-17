import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { reviewedResultRouteLabel, reviewedResultText } = await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const source = JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-question-spanish.json', 'utf8'));
const result = JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', 'utf8'));
let routes = 0, reused = 0;
const states = new Set();
for (const file of readdirSync('src/lib/rcap-engine/compiled/profiles').filter(f => f.endsWith('.json'))) {
  const profile = JSON.parse(readFileSync('src/lib/rcap-engine/compiled/profiles/' + file, 'utf8'));
  const state = profile.jurisdiction.code;states.add(state);
  for (const pathway of profile.pathways) {
    const english = profile.packetGenerator.pathways.find(p => p.pathwayId === pathway.id)?.pathwayLabel ?? pathway.label;
    const entries = result.entries.filter(e => e.kind === 'route_display_label' && e.jurisdiction === state && e.pathwayId === pathway.id && e.originalEnglish === english);
    assert.equal(entries.length, 1);
    const [entry] = entries;
    assert.deepEqual(reviewedResultRouteLabel(state, pathway.id, english), { en: entry.en, es: entry.es });
    if (!['CA-RESULT-COPY-08', 'CA-RESULT-COPY-09', 'CA-RESULT-COPY-10'].includes(entry.id)) {
      const matches = source.entries.filter(e => e.questionId === 'possible_pathway_context' && e.scope.publicStates.includes(state))
        .flatMap(e => e.spanish.optionDisplay).filter(o => o.value === english);
      assert.equal(matches.length, 1);assert.equal(entry.es, matches[0].label);assert.equal(entry.en, english);reused++;
    }
    assert.equal(reviewedResultRouteLabel('ZZ', pathway.id, english), null);
    assert.equal(reviewedResultRouteLabel(state, pathway.id + '-unreviewed', english), null);
    assert.equal(reviewedResultRouteLabel(state, pathway.id, english + ' '), null);
    assert.equal(reviewedResultText(english), null, 'route display labels must never become generic reason translations');
    routes++;
  }
}
assert.equal(states.size, 51);assert.equal(routes, 344);assert.equal(reused, 341);
console.log(JSON.stringify({ status: 'PASS', jurisdictions: states.size, routes, reusedExistingSpanishOptionLabels: reused, preservedPriorReviewedLabels: 3, scope: 'Exact display binding; no evaluator or option wire mutation, protected or browser acceptance claimed.' }));
