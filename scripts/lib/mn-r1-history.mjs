import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

// Accepted R1 optional-history successor for Minnesota (GA1217 64149ecc9, all six routes, GA-12 + GA-17), following
// the a9e4/MO exact-descriptor inverse: only offense_category and record_type moved, in place, from asked route facts
// to optional literal history. Every other fact and index stays compared at the original frozen hash.
export const MN_R1_HISTORY_ROUTES = new Set([
  'arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11',
  'automatic-clean-slate-expungement-under-609a-015',
  'automatic-mistaken-identity-expungement-under-609a-017',
  'cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06',
  'petition-based-expungement-under-609a-02-03',
  'prosecutor-agreed-sealing-without-a-full-petition-under-609a-025',
]);
export const MN_R1_HISTORY = {
  offense_category: { factId: 'offense_category', collection: 'conditional', phase: 'known', group: null, active: false, optional: true,
    source: 'r1_category_history',
    reason: "Earlier Minnesota categories remain optional literal history. A category is not evaluated as an offense type, and the route's existing result and payment decision are unchanged." },
  record_type: { factId: 'record_type', collection: 'conditional', phase: 'known', group: null, active: false, optional: true,
    source: 'dc_fl_petition_record_type_history',
    reason: 'Earlier overlapping labels do not establish a disposition or select a procedure. They remain optional history; the existing route result and fulfillment refusal remain unchanged.' },
};
const CATEGORY_PREDECESSOR = {
  factId: 'offense_category', collection: 'prepay_confirmation', phase: 'prepay_confirmation', group: 'your_case',
  source: 'route_decision_facts', reason: 'the evaluator reads this fact, so it is asked rather than computed'
};
// record_type had two predecessor shapes: a rendered profile input on 299C.11 / 609A.015, a prepay route fact elsewhere.
const RENDERED_RECORD_ROUTES = new Set(['arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11', 'automatic-clean-slate-expungement-under-609a-015']);
const RECORD_PREDECESSOR = {
  rendered: { factId: 'record_type', collection: 'render_required', phase: 'render', group: 'your_case',
    source: 'profile_required_input', reason: 'a profile-required packet input with no specification statement; asked in its section' },
  prepay: { factId: 'record_type', collection: 'prepay_confirmation', phase: 'prepay_confirmation', group: 'your_case',
    source: 'route_decision_facts', reason: 'the evaluator or a route-safety gate reads this fact, so it confirms the paid route' },
};

/** Clone with only the exact accepted history descriptors restored on a listed route; refuses any other descriptor. */
export function mnR1HistoryPredecessor(collection, routeId) {
  const record = RENDERED_RECORD_ROUTES.has(routeId) ? RECORD_PREDECESSOR.rendered : RECORD_PREDECESSOR.prepay;
  const current = collection.facts.filter(fact => Object.hasOwn(MN_R1_HISTORY, fact.factId));
  if (isDeepStrictEqual(current, [CATEGORY_PREDECESSOR, record])) return collection;
  assert(MN_R1_HISTORY_ROUTES.has(routeId), 'R1 history descriptor on a route outside the MN R1 list: ' + routeId);
  assert.deepEqual(current, [MN_R1_HISTORY.offense_category, MN_R1_HISTORY.record_type], 'exact MN R1 history descriptors: ' + routeId);
  const restored = structuredClone(collection);
  const factOrder = id => restored.facts.findIndex(fact => fact.factId === id);
  // The predecessor listed each fact in its own index lists, in fact order.
  const reinsert = (ids, id) => {
    assert(!ids.includes(id), id + ' still listed: ' + routeId);
    const before = ids.findIndex(other => factOrder(other) > factOrder(id));
    ids.splice(before < 0 ? ids.length : before, 0, id);
  };
  const section = restored.groupedParticipantSections.find(s => s.id === 'your_case');
  assert(section, 'no your_case section: ' + routeId);
  for (const predecessor of [CATEGORY_PREDECESSOR, record]) {
    restored.facts[factOrder(predecessor.factId)] = structuredClone(predecessor);
    reinsert(predecessor.collection === 'render_required' ? restored.renderQuestions : restored.prepayQuestions, predecessor.factId);
    reinsert(section.factIds, predecessor.factId);
  }
  return restored;
}

export const mnR1HistorySiblingPredecessors = siblings =>
  Object.fromEntries(Object.entries(siblings).map(([id, collection]) => [id, mnR1HistoryPredecessor(collection, id)]));

/** Every descriptor dimension of both facts and an unlisted route must be refused; requires a listed route carrying the history. */
export function mnR1HistoryDriftRefusals(collection, routeId) {
  const refuses = (c, id) => { try { mnR1HistoryPredecessor(c, id); return false; } catch { return true; } };
  assert(!refuses(collection, routeId) && mnR1HistoryPredecessor(collection, routeId) !== collection, 'needs the exact accepted history: ' + routeId);
  return [...Object.keys(MN_R1_HISTORY).flatMap(factId => Object.keys(MN_R1_HISTORY[factId]).filter(key => key !== 'factId').map(key => {
    const changed = structuredClone(collection);
    changed.facts.find(f => f.factId === factId)[key] = 'unexpected-drift';
    return [factId + '-' + key, refuses(changed, routeId)];
  })), ['unlisted-route', refuses(collection, 'not-a-minnesota-r1-route')]];
}
