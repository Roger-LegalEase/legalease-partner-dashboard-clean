import {createHash} from 'node:crypto';

// Explicit metadata projection: never enumerate or serialize an environment
// entry, or access its value, legacyValue, content hints or decryption fields.
const invalid = () => { throw new Error('Production environment metadata is incomplete or invalid'); };
function optionalString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return invalid();
  return value;
}
function strings(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item)) return invalid();
  return [...new Set(value)].sort();
}

export function productionEnvironmentMetadataSha256(entries) {
  if (!Array.isArray(entries)) return invalid();
  const safe = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return invalid();
    const target = strings(typeof entry.target === 'string' ? [entry.target] : entry.target);
    if (!target.includes('production')) continue;
    const id = optionalString(entry.id), configurationId = optionalString(entry.configurationId);
    const key = optionalString(entry.key), type = optionalString(entry.type);
    const stamp = entry.updatedAt;
    const updatedAt = typeof stamp === 'string' && /^\d+$/.test(stamp) ? Number(stamp) : stamp;
    if ((!id && !configurationId) || !key || !type || !Number.isSafeInteger(updatedAt) || updatedAt < 0) return invalid();
    safe.push({id, configurationId, key, type, target,
      gitBranch: optionalString(entry.gitBranch),
      customEnvironmentIds: strings(entry.customEnvironmentIds), updatedAt});
  }
  // Code-point sorting is stable across runner locales and API list order.
  const canonical = safe.map(entry => JSON.stringify(entry)).sort();
  return createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}

export async function readProductionEnvironmentMetadataSha256(vercel, projectId) {
  const response = await vercel(`/v9/projects/${encodeURIComponent(projectId)}/env?decrypt=false`);
  if (response.status !== 200 || !Array.isArray(response.json?.envs)) {
    throw new Error('Production environment metadata inventory could not be read');
  }
  return productionEnvironmentMetadataSha256(response.json.envs);
}
