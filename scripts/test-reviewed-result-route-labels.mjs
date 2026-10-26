import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { reviewedResultRouteLabel, reviewedResultText } = await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const source = JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-question-spanish.json', 'utf8'));
const result = JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json', 'utf8'));
let routes = 0, reused = 0, adoptedGeorgiaPardon = 0, sourceStageSuccessors = 0;
const nySuccessors = {
  'automatic-non-conviction-sealing-under-cpl-160-50-160-55': ['NY16055-CURRENT-ROUTE-DISPLAY', 'ny.partial_seal_guidance'],
  'marijuana-record-destruction-under-the-mrta': ['NYMRTA-CURRENT-STAGE-DISPLAY', 'ny.mrta_stage_guidance']
};
const states = new Set();
for (const file of readdirSync('src/lib/rcap-engine/compiled/profiles').filter(f => f.endsWith('.json'))) {
  const profile = JSON.parse(readFileSync('src/lib/rcap-engine/compiled/profiles/' + file, 'utf8'));
  const state = profile.jurisdiction.code;states.add(state);
  for (const pathway of profile.pathways) {
    const english = profile.packetGenerator.pathways.find(p => p.pathwayId === pathway.id)?.pathwayLabel ?? pathway.label;
    const entries = result.entries.filter(e => e.kind === 'route_display_label' && e.jurisdiction === state && e.pathwayId === pathway.id && e.originalEnglish === english);
    // 73766e468 / 0e8c94917 retain historical NY labels alongside exact reason-bound successors.
    const successorBinding = state === 'NY' ? nySuccessors[pathway.id] : undefined;
    assert.equal(entries.length, successorBinding ? 2 : 1);
    const historical = entries.filter(e => e.supersedesDisplayEntryId === undefined && e.requiredReasonCode === undefined);
    assert.equal(historical.length, 1);
    const [entry] = historical;
    if (successorBinding) {
      const successor = entries.find(e => e.id === successorBinding[0]);
      assert(successor);
      assert.equal(successor.supersedesDisplayEntryId, entry.id);
      assert.equal(successor.requiredReasonCode, successorBinding[1]);
      assert.deepEqual(reviewedResultRouteLabel(state, pathway.id, english, [successorBinding[1]]), { en: successor.en, es: successor.es });
      assert.deepEqual(reviewedResultRouteLabel(state, pathway.id, english, ['unrelated.reason']), { en: entry.en, es: entry.es });
      sourceStageSuccessors++;
    }
    // fec772fc0 adopted conviction wording while retaining the historical felony wire label.
    const georgiaPardon = state === 'GA' && pathway.id === 'restriction-and-sealing-of-a-pardoned-felony';
    const expected = georgiaPardon
      ? { en: 'Restriction and sealing of a pardoned conviction', es: 'Restricción y sellado de una condena indultada' }
      : { en: entry.en, es: entry.es };
    assert.deepEqual(reviewedResultRouteLabel(state, pathway.id, english), expected);
    if (georgiaPardon) {
      adoptedGeorgiaPardon++;
      assert.deepEqual(reviewedResultRouteLabel(state, pathway.id, expected.en), expected);
    }
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
assert.equal(states.size, 51);assert.equal(routes, 344);assert.equal(reused, 341);assert.equal(adoptedGeorgiaPardon, 1);assert.equal(sourceStageSuccessors, 2);
console.log(JSON.stringify({ status: 'PASS', jurisdictions: states.size, routes, reusedExistingSpanishOptionLabels: reused, preservedPriorReviewedLabels: 3, adoptedGeorgiaPardon, sourceStageSuccessors, scope: 'Exact display binding; no evaluator or option wire mutation, protected or browser acceptance claimed.' }));
