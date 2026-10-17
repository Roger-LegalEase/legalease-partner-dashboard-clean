// AT-GA-49: reconnect the existing adult factory family, not an admission or
// legal-approval record. Tool 5 and juvenile instruments are not adult aliases.
export const CA_PROP64_FAMILY = 'ca-prop64-set';
export const CA_PROP64_ROUTES = Object.freeze([
  'CA:prop-64-completed-sentence-application-11361-8',
  'CA:prop-64-currently-serving-petition-11361-8'
]);
export const CA_PROP64_BRIDGE_INPUTS = Object.freeze({
  queue: 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json',
  manifests: 'data/record-clearing/legal-design-packet-set-manifests.json',
  wiring: 'data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/product-wiring.json'
});
const componentIds = ['ca-prop64-primary-filing-1', 'ca-prop64-proof-of-service-2', 'ca-prop64-proposed-order-3'];
const roles = ['primary_filing', 'proof_of_service', 'proposed_order'];
const forms = ['CR-400', 'CR-401', 'CR-403'];
const sourceHashes = [
  'd325bb75f5a90b7864eab8fa43a905db7f2a9c233bb89fe412f609dee9ab35a1',
  '394421959966e27833ddd481cc39b969abd788b4119b47a3670de2d2ddb05d01',
  'b0ecaeb4fc761feb6afe22b7c848e811a1028c8b4d1432e803c67112a347baff'
];
const exact = (actual, expected) => Array.isArray(actual)
  && actual.length === expected.length && actual.every((item, i) => item === expected[i]);
const obligation = route => `obligation:track-pathway:CA:ca-prop64:${route.slice(3)}`;

/** Read identity only. Queue state, verdict and approval labels grant nothing. */
export function caProp64FamilyBridge(route, { queue, manifests, wiring }) {
  if (route?.jurisdiction !== 'CA' || !CA_PROP64_ROUTES.includes(route.pathwayKey)
    || !exact(route.registryTrackIds, ['ca-prop64'])) return null;
  if (!Array.isArray(queue?.families) || !Array.isArray(manifests?.packetSets)) return null;
  const families = queue.families.filter(row => row?.familyId === CA_PROP64_FAMILY);
  const sets = manifests.packetSets.filter(row => row?.packetSetId === CA_PROP64_FAMILY || row?.trackId === 'ca-prop64');
  if (families?.length !== 1 || sets?.length !== 1) return null;
  const family = families[0], set = sets[0];
  const keys = CA_PROP64_ROUTES.map(obligation);
  if (family.jurisdiction !== 'CA' || family.implementationStrategy !== 'official_pdf_fill'
    || !exact(family.routeKeys, [...keys, 'obligation:track-pathway:CA:ca-prop64:tool-5-proposition-64-marijuana-relief'])
    || !exact(family.packetComponents, componentIds.map(id => `component:${id}`))
    || !exact(family.forms, forms) || !exact(family.instrumentKinds, roles)
    || set.packetSetId !== CA_PROP64_FAMILY || set.jurisdiction !== 'CA' || set.trackId !== 'ca-prop64'
    || set.version !== '1.0.0' || !Array.isArray(set.components) || set.components.length !== 3) return null;
  for (let i = 0; i < 3; i++) {
    const c = set.components[i];
    if (c?.componentId !== componentIds[i] || c.role !== roles[i] || c.order !== i + 1
      || c.requirement !== 'required' || c.outputStrategy !== 'official_pdf_fill'
      || c.officialFormId !== forms[i] || c.officialSourceUrl !== 'https://selfhelp.courts.ca.gov/find-forms') return null;
  }
  if (wiring?.familyId !== CA_PROP64_FAMILY || !exact(wiring.routeKeys, keys)
    || wiring.implementationStrategy !== 'official_pdf_fill'
    || wiring.generationAllowed !== false || wiring.runtimeSelectable !== false
    || wiring.createsFulfillmentRecord !== false || wiring.opensCommercialRoute !== false
    || wiring.commercialRoutesOpened !== 0) return null;
  const binding = wiring.binding;
  if (binding?.family !== CA_PROP64_FAMILY || binding.jurisdiction !== 'CA'
    || binding.deliveryType !== 'official_pdf_fill'
    || !exact(binding.routeKeys, family.routeKeys)
    || !exact(binding.packetComponents, family.packetComponents)
    || !exact(binding.instrumentKinds, roles)
    || binding.paymentEligible !== false || binding.sponsorshipEligible !== false) return null;
  for (const sources of [family.sourceHashes, binding.sourceVersion]) {
    if (!Array.isArray(sources) || sources.length !== 3) return null;
    for (let i = 0; i < 3; i++) {
      if (sources[i]?.sourceId !== `official-form:${forms[i]}` || sources[i].sha256 !== sourceHashes[i]
        || sources[i].tier !== 'exact_form_number') return null;
    }
  }
  return CA_PROP64_FAMILY;
}

/** Stable crosscheck only: never hash the generated queue's downstream inputs,
 * status, verdicts or unrelated families back into its upstream legal join. */
export function caProp64QueueIdentity(queue) {
  if (!Array.isArray(queue?.families)) return null;
  const matches = queue.families.filter(row => row?.familyId === CA_PROP64_FAMILY);
  if (matches.length !== 1) return null;
  const row = matches[0];
  return Object.fromEntries(['familyId', 'jurisdiction', 'implementationStrategy',
    'routeKeys', 'packetComponents', 'forms', 'instrumentKinds', 'sourceHashes']
    .map(key => [key, row[key]]));
}
