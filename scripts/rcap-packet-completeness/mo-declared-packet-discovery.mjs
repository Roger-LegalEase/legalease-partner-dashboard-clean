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
  const family = directory === MO_DISCOVERY_DIRECTORY ? MO_DISCOVERY_FAMILY :
    ['mo-610-140-arrest-set', 'mo-610-140-conviction-set'].find(id =>
      directory === `data/rcap-all50/overlays/census-v1/mo/${id}--official-pdf-fill`);
  if (!family) return false;
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
    let manifest = json(family === MO_DISCOVERY_FAMILY ? 'packet-manifest.json' : 'packet-set-manifest.json');
    let rendered = json('reports/rendered-artifacts.json');
    if ([approval, fieldMap, manifest, rendered].some(value => value?.familyId !== family)) return false;
    if (family !== MO_DISCOVERY_FAMILY) {
      if (manifest.schemaVersion !== 'rcap-composed-packet-set/v1'
        || !Array.isArray(manifest.components) || !manifest.components.length
        || rendered.schemaVersion !== 'rcap-rendered-artifacts/v1'
        || !Array.isArray(rendered.packets) || rendered.packets.length !== 2
        || !Array.isArray(rendered.artifacts) || rendered.artifacts.length !== 2
        || rendered.packets.map(p => p.fixture).sort().join(',') !== 'boundary,canonical') return false;
      for (const packet of rendered.packets) {
        if (packet.file !== `${packet.fixture}.packet.pdf`) return false;
        const matching = rendered.artifacts.filter(a => a.fixture === packet.fixture);
        if (matching.length !== 1 || matching[0].file !== packet.file
          || matching[0].sha256 !== packet.sha256 || matching[0].pageCount !== packet.pageCount) return false;
      }
      manifest = {...manifest, schemaVersion: 1, variants: rendered.packets.map(p =>
        ({id: p.fixture, packet: p.file, sha256: p.sha256, pages: p.pageCount}))};
      rendered = {...rendered, schemaVersion: 1, artifacts: rendered.artifacts.map(a =>
        ({...a, file: `${directory}/${a.file}`}))};
    }
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
