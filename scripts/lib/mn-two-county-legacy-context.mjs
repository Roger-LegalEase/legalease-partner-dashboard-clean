import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

// Accepted a400b428 MN2 successor: only generic location and its two indices
// changed here. Reverse the exact descriptor, retaining the original full hash.
const routes = new Set(['petition-based-expungement-under-609a-02-03', 'prosecutor-agreed-sealing-without-a-full-petition-under-609a-025']);
const id = 'residency_or_location';
const predecessor = { factId: id, collection: 'unresolved', phase: 'prepay_confirmation', group: 'about_you',
  source: 'unresolved_route_rule_scope', reason: 'a rule references this required fact without an established route consumer; collect it without inferring a value or claiming it decides this route' };
const successor = { factId: id, collection: 'conditional', phase: 'known', group: null, active: false,
  source: 'mn_two_county_legacy_context', reason: 'Legacy location is retained unchanged. Distinct required case-county and prosecuting-authority facts replace its destination purpose; this value does not establish record origin, venue, agreement or a programme.' };

export function mnTwoCountyLegacyContextPredecessor(collection, routeId) {
  assert(routes.has(routeId), 'Only the two accepted MN2 sibling routes');
  assert.equal(collection.routeKey, 'MN:' + routeId); assert.equal(collection.pathwayId, routeId);
  assert.equal(collection.facts.filter(f => f.factId === id).length, 1, 'Exactly one legacy location fact');
  const fact = collection.facts[14]; assert.equal(fact?.factId, id, 'Original legacy fact position');
  if (isDeepStrictEqual(fact, predecessor)) return collection;
  assert.deepEqual(fact, successor, 'Exact accepted optional legacy-location descriptor');
  const sections = collection.groupedParticipantSections.filter(s => s.id === 'about_you');
  assert.equal(sections.length, 1); assert.equal(collection.groupedParticipantSections[0].id, 'about_you');
  assert.deepEqual(sections[0].factIds, ['contact_information', 'participant_full_legal_name'], 'Exact accepted location section removal');
  assert.deepEqual(collection.unresolvedRequiredFacts, [], 'Exact accepted unresolved-index removal');
  for (const section of collection.groupedParticipantSections) assert(!section.factIds.includes(id), 'Legacy location cannot enter another section');
  for (const key of ['prepayQuestions', 'renderQuestions', 'conditionalQuestions', 'filingReadinessItems', 'externalActorFields', 'pendingDerivations', 'hardBlockers'])
    assert(!JSON.stringify(collection[key]).includes(id), 'No other location index change: ' + key);
  for (const key of ['knownFacts', 'derivedFacts']) assert(!Object.hasOwn(collection[key], id), 'No invented legacy answer: ' + key);
  const restored = structuredClone(collection); restored.facts[14] = structuredClone(predecessor);
  restored.groupedParticipantSections[0].factIds.push(id); restored.unresolvedRequiredFacts.push(id);
  return restored;
}
