import { createHash } from 'node:crypto';
export const STATIC_AUTHORITY_PATH = 'data/rcap-grade-a/worker-static-authority.json';
const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(stable).join(',')}]` : `{${Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')}}`;
export const staticAuthorityHash = v => createHash('sha256').update(stable(v)).digest('hex');
/** A derived render-only projection. Original version/history remain in the
 * controlling server registry. No publication-dependent value enters this file. */
export function createStaticWorkerAuthority(registry, observation) {
  const entries = registry.records.map(original => {
    const record = structuredClone(original);
    record.version = 1; // Projection schema revision, not an owner approval version.
    record.history = [];
    record.provider.imageDigest = '';
    if (record.evidenceBindings) {
      delete record.evidenceBindings.providerPublication;
      if (record.evidenceBindings.provider) {
        delete record.evidenceBindings.provider.deliveryProviderEvidencePath;
        delete record.evidenceBindings.provider.deliveryProviderEvidenceSha256;
        delete record.evidenceBindings.provider.deliveryProvider;
      }
    }
    const observed = structuredClone(observation.routes[record.routeId]);
    if (!observed) throw new Error(`Missing static observation: ${record.routeId}`);
    delete observed.externalPublication;
    observed.provider.imageDigest = '';
    const entry = { record, observation: observed };
    return { ...entry, sha256: staticAuthorityHash(entry) };
  }).sort((a,b)=>a.record.routeId.localeCompare(b.record.routeId));
  return { schemaVersion:'rcap-worker-static-authority/v1', generatedBy:'scripts/generate-rcap-grade-a-fulfillment-authority.mjs', purpose:'Render-only static legal/source/packet authority. Grants no checkout, dispatch, deployment or publication authority.', entries };
}
