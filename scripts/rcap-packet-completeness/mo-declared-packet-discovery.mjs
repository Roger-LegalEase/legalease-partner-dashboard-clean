import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const MO_DISCOVERY_FAMILY = 'mo-610-145-mistaken-identity-set';
export const MO_DISCOVERY_DIRECTORY =
  'data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill';

// Discovery only. The existing audit, review and acceptance rules still decide
// completeness. A root-level native packet set must not be mistaken for no build.
// This does not add a generic "any PDF means complete" fallback.
export function hasDeclaredMoPacketSet(root, directory) {
  if (directory !== MO_DISCOVERY_DIRECTORY) return false;
  try {
    const read = relative => {
      let current = path.resolve(root);
      for (const segment of relative.split('/')) {
        if (!segment || segment === '.' || segment === '..' || segment.includes('\\')) return null;
        current = path.join(current, segment);
        if (fs.lstatSync(current).isSymbolicLink()) return null;
      }
      return fs.statSync(current).isFile() ? fs.readFileSync(current) : null;
    };
    const json = relative => {
      const bytes = read(`${directory}/${relative}`);
      return bytes === null ? null : JSON.parse(bytes.toString('utf8'));
    };
    const approval = json('approval-request.json');
    const fieldMap = json('production-field-map.json');
    const manifest = json('packet-manifest.json');
    const rendered = json('reports/rendered-artifacts.json');
    if ([approval, fieldMap, manifest, rendered].some(value => value?.familyId !== MO_DISCOVERY_FAMILY)) return false;
    if (manifest.schemaVersion !== 1 || rendered.schemaVersion !== 1
      || !Array.isArray(manifest.variants) || manifest.variants.length === 0
      || !Array.isArray(rendered.artifacts)
      || manifest.variants.length !== rendered.artifacts.length) return false;
    const ids = new Set(), paths = new Set();
    for (const variant of manifest.variants) {
      if (typeof variant?.id !== 'string' || !variant.id.trim() || ids.has(variant.id)
        || typeof variant.packet !== 'string'
        || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.packet\.pdf$/.test(variant.packet)
        || paths.has(variant.packet) || !/^[a-f0-9]{64}$/.test(variant.sha256 ?? '')
        || !Number.isSafeInteger(variant.pages) || variant.pages < 1) return false;
      ids.add(variant.id); paths.add(variant.packet);
      const entries = rendered.artifacts.filter(item => item?.fixture === variant.id);
      if (entries.length !== 1 || entries[0].file !== `${directory}/${variant.packet}`
        || entries[0].sha256 !== variant.sha256 || entries[0].pageCount !== variant.pages) return false;
      const bytes = read(`${directory}/${variant.packet}`);
      if (!bytes || bytes.subarray(0, 5).toString('ascii') !== '%PDF-'
        || createHash('sha256').update(bytes).digest('hex') !== variant.sha256) return false;
    }
    return true;
  } catch (error) {
    // Invalid/missing inputs are undiscoverable, not an approved empty audit.
    // Unexpected infrastructure/programming errors must remain visible.
    if (error instanceof SyntaxError || ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error?.code)) return false;
    throw error;
  }
}
