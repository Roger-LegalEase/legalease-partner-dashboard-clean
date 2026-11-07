import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const check = (ok, code) => { if (!ok) throw new Error(code); };
const digest = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const manifestTypes = new Set(['application/vnd.oci.image.manifest.v1+json', 'application/vnd.docker.distribution.manifest.v2+json']);
const configTypes = new Set(['application/vnd.oci.image.config.v1+json', 'application/vnd.docker.container.image.v1+json']);
const layerTypes = new Set(['application/vnd.oci.image.layer.v1.tar', 'application/vnd.oci.image.layer.v1.tar+gzip', 'application/vnd.oci.image.layer.v1.tar+zstd', 'application/vnd.docker.image.rootfs.diff.tar.gzip']);

// Hash the actual registry bytes before parsing: JSON formatting and layer order
// are part of the accepted identities. No Docker daemon or filesystem unpacking.
export function verifyRegistryImage(manifestBytes, configBytes, expected) {
  check(Buffer.isBuffer(manifestBytes) && Buffer.isBuffer(configBytes), 'registry_raw_bytes_required');
  check(digest(expected?.digest) && digest(expected?.config) && typeof expected.source === 'string' && Number.isSafeInteger(expected.layers) && expected.layers > 0, 'registry_expected_identity_invalid');
  check(sha256(manifestBytes) === expected.digest, 'registry_manifest_digest_mismatch');
  check(sha256(configBytes) === expected.config, 'registry_config_digest_mismatch');
  let manifest, config;
  try { manifest = JSON.parse(manifestBytes); config = JSON.parse(configBytes); }
  catch { throw new Error('registry_json_invalid'); }
  check(manifest?.schemaVersion === 2 && manifestTypes.has(manifest.mediaType) && !manifest.manifests, 'registry_single_image_manifest_required');
  check(manifest.config?.digest === expected.config && manifest.config.size === configBytes.length && configTypes.has(manifest.config.mediaType), 'registry_config_descriptor_mismatch');
  check(config?.os === 'linux' && config.architecture === 'amd64', 'registry_platform_mismatch');
  check(config.config?.Labels?.['org.opencontainers.image.revision'] === expected.source, 'registry_source_mismatch');
  check(config.rootfs?.type === 'layers' && Array.isArray(config.rootfs.diff_ids) && config.rootfs.diff_ids.length === expected.layers && config.rootfs.diff_ids.every(digest), 'registry_diffids_mismatch');
  check(Array.isArray(manifest.layers) && manifest.layers.length === expected.layers && manifest.layers.every(layer => layer && digest(layer.digest) && Number.isSafeInteger(layer.size) && layer.size >= 0 && layerTypes.has(layer.mediaType)), 'registry_layer_descriptors_mismatch');
  // Expose only nonsecret image identity, never the raw config (which can hold env).
  return {
    Id: sha256(configBytes), Os: config.os, Architecture: config.architecture,
    Config: {Labels: {'org.opencontainers.image.revision': config.config.Labels['org.opencontainers.image.revision']}},
    RootFS: {Layers: [...config.rootfs.diff_ids]},
    ManifestDigest: sha256(manifestBytes),
  };
}

export function inspectRegistryImage(reference, expected, {authFile, command = execFileSync, env = process.env} = {}) {
  check(typeof reference === 'string' && reference.endsWith(`@${expected.digest}`) && !reference.includes('://'), 'registry_reference_not_pinned');
  check(typeof authFile === 'string' && authFile.startsWith('/'), 'registry_authfile_reference_required');
  const inspect = config => {
    try {
      return command('skopeo', ['inspect', '--authfile', authFile, '--raw', ...(config ? ['--config'] : []), `docker://${reference}`], {encoding: null, env, stdio: ['ignore', 'pipe', 'pipe']});
    } catch { throw new Error('registry_inspection_failed'); }
  };
  return verifyRegistryImage(inspect(false), inspect(true), expected);
}
