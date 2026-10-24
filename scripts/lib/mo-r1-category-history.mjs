import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

// Accepted R1 optional-history successor for Missouri (GA1217 f511aec19, six routes; GA17 NC batch 4, Article XIV),
// following the a9e4 exact-descriptor inverse: only these routes' offense_category moved, from a route-decision
// confirmation to optional literal history. Every other fact stays compared at the original frozen hash.
export const MO_R1_CATEGORY_ROUTES = new Set([
  'general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140',
  'closed-record-outcome-under-rsmo-610-105',
  'false-information-or-qualifying-arrest-record-expungement-under-610-122-123',
  'first-intoxication-related-traffic-or-boating-expungement-under-610-130',
  'stolen-or-mistaken-identity-expungement-under-610-145',
  'first-minor-in-possession-alcohol-expungement-under-311-326',
  'marijuana-expungement-under-missouri-constitution-article-xiv',
]);
export const MO_R1_CATEGORY_HISTORY = {
  factId: 'offense_category', collection: 'conditional', phase: 'known', group: null, active: false, optional: true,
  source: 'r1_category_history',
  reason: "Earlier Missouri categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged."
};
const PREDECESSOR = {
  factId: 'offense_category', collection: 'prepay_confirmation', phase: 'prepay_confirmation', group: 'your_case',
  source: 'route_decision_facts', reason: 'the evaluator reads this fact, so it is asked rather than computed'
};

/** Clone with only the exact accepted history descriptor restored on a listed route; refuses any other descriptor. */
export function moR1CategoryPredecessor(collection, routeId) {
  const at = collection.facts.findIndex(fact => fact.factId === 'offense_category');
  if (at < 0 || isDeepStrictEqual(collection.facts[at], PREDECESSOR)) return collection;
  assert(MO_R1_CATEGORY_ROUTES.has(routeId), 'offense_category moved on a route outside the R1 list: ' + routeId);
  assert.deepEqual(collection.facts.filter(fact => fact.factId === 'offense_category'), [MO_R1_CATEGORY_HISTORY], 'exact R1 category history: ' + routeId);
  const restored = structuredClone(collection);
  restored.facts[at] = structuredClone(PREDECESSOR);
  // The predecessor also listed the fact for prepay and in its case section, in fact order.
  const factOrder = id => restored.facts.findIndex(fact => fact.factId === id);
  const reinsert = ids => {
    assert(!ids.includes('offense_category'), 'offense_category still listed: ' + routeId);
    const before = ids.findIndex(id => factOrder(id) > at);
    ids.splice(before < 0 ? ids.length : before, 0, 'offense_category');
  };
  reinsert(restored.prepayQuestions);
  const section = restored.groupedParticipantSections.find(s => s.id === PREDECESSOR.group);
  assert(section, 'no ' + PREDECESSOR.group + ' section: ' + routeId);
  reinsert(section.factIds);
  return restored;
}

/** Every descriptor dimension and an unlisted route must be refused; requires a listed route carrying the history. */
export function moR1CategoryDriftRefusals(collection, routeId) {
  assert.deepEqual(collection.facts.filter(fact => fact.factId === 'offense_category'), [MO_R1_CATEGORY_HISTORY]);
  const refuses = (c, id) => { try { moR1CategoryPredecessor(c, id); return false; } catch { return true; } };
  return [...Object.keys(MO_R1_CATEGORY_HISTORY).filter(key => key !== 'factId').map(key => {
    const changed = structuredClone(collection);
    changed.facts.find(f => f.factId === 'offense_category')[key] = 'unexpected-drift';
    return [key, refuses(changed, routeId)];
  }), ['unlisted-route', refuses(collection, 'state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141')]];
}
