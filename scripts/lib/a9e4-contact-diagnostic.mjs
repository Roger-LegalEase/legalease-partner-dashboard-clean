import assert from 'node:assert/strict';

// Accepted shared materialization diagnostic successor (a9e4ee852), following
// the MD/OH exact-descriptor inverse: the protected contact fact is not an
// actual route-deciding fact. Only source/reason changed; collection, phase,
// group, value and every other fact stay compared at the original frozen hash.
export const A9E4_CONTACT_DIAGNOSTIC = {
  factId: 'contact_information', collection: 'prepay_confirmation', phase: 'prepay_confirmation',
  group: 'about_you', source: 'materialization_protection',
  reason: 'this fact is protected against inference, so it is asked rather than computed'
};

/** Clone with only the exact accepted diagnostic restored; refuses any other contact descriptor. */
export function a9e4ContactPredecessor(collection, label) {
  const contact = collection.facts.filter(fact => fact.factId === 'contact_information');
  if (contact.length === 0) return collection;
  assert.deepEqual(contact, [A9E4_CONTACT_DIAGNOSTIC], 'exact accepted a9e4 contact diagnostic: ' + label);
  const restored = structuredClone(collection);
  const fact = restored.facts.find(f => f.factId === 'contact_information');
  fact.source = 'route_decision_facts';
  fact.reason = 'the evaluator reads this fact, so it is asked rather than computed';
  return restored;
}

export const a9e4SiblingPredecessors = siblings =>
  Object.fromEntries(Object.entries(siblings).map(([id, collection]) => [id, a9e4ContactPredecessor(collection, id)]));

const assertExactDiagnostic = collection =>
  assert.deepEqual(collection.facts.filter(fact => fact.factId === 'contact_information'), [A9E4_CONTACT_DIAGNOSTIC]);

/**
 * The scoped inversion must reject altered diagnostics and every protected
 * descriptor/value dimension. Requires a collection that carries the exact
 * accepted diagnostic, so each refusal is non-vacuous.
 */
export function a9e4DiagnosticDriftRefusals(collection) {
  assertExactDiagnostic(collection);
  return ['source', 'reason', 'collection', 'phase', 'group', 'factId', 'active', 'value'].map(key => {
    const changed = structuredClone(collection), fact = changed.facts.find(f => f.factId === 'contact_information');
    fact[key] = key === 'active' ? true : 'unexpected-drift';
    try { assertExactDiagnostic(changed); return [key, false]; } catch { return [key, true]; }
  });
}
