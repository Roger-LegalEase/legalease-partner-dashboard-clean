import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyRegistryImage, inspectRegistryImage} from './registry-image.mjs';

const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const bytes = value => Buffer.from(JSON.stringify(value));
// Independent, deliberately synthetic registry fixture: no claimed production hash.
function fixture({changeConfig = () => {}, changeManifest = () => {}, docker = false} = {}) {
  const source = '1'.repeat(40);
  const config = {architecture: 'amd64', os: 'linux', config: {Labels: {'org.opencontainers.image.revision': source, unrelated: 'SYNTHETIC_CONFIG_ONLY'}, Env: ['SYNTHETIC_CONFIG_ONLY=do-not-export']}, rootfs: {type: 'layers', diff_ids: Array.from({length: 153}, (_, i) => sha256(`synthetic uncompressed layer ${i}`))}};
  changeConfig(config);
  const configBytes = bytes(config);
  const manifest = {schemaVersion: 2, mediaType: docker ? 'application/vnd.docker.distribution.manifest.v2+json' : 'application/vnd.oci.image.manifest.v1+json', config: {mediaType: docker ? 'application/vnd.docker.container.image.v1+json' : 'application/vnd.oci.image.config.v1+json', digest: sha256(configBytes), size: configBytes.length}, layers: Array.from({length: 153}, (_, i) => ({mediaType: docker ? 'application/vnd.docker.image.rootfs.diff.tar.gzip' : 'application/vnd.oci.image.layer.v1.tar+gzip', digest: sha256(`synthetic compressed layer ${i}`), size: i + 1}))};
  changeManifest(manifest);
  const manifestBytes = bytes(manifest);
  return {manifest, config, manifestBytes, configBytes, expected: {digest: sha256(manifestBytes), config: sha256(configBytes), source, layers: 153}};
}
const verify = f => verifyRegistryImage(f.manifestBytes, f.configBytes, f.expected);

test('raw OCI and Docker manifests with all 153 layers verify without unpacking or exposing config', () => {
  for (const docker of [false, true]) {
    const f = fixture({docker}), image = verify(f);
    assert.equal(image.Id, f.expected.config); assert.equal(image.ManifestDigest, f.expected.digest);
    assert.deepEqual(image.RootFS.Layers, f.config.rootfs.diff_ids);
    assert.equal(image.Config.Labels['org.opencontainers.image.revision'], f.expected.source);
    assert(!JSON.stringify(image).includes('SYNTHETIC_CONFIG_ONLY'));
  }
});

test('tampered, reordered or reformatted registry bytes cannot borrow accepted digest claims', () => {
  const f = fixture();
  for (const manifestBytes of [Buffer.concat([f.manifestBytes, Buffer.from('\n')]), bytes({...f.manifest, layers: [...f.manifest.layers].reverse()})])
    assert.throws(() => verifyRegistryImage(manifestBytes, f.configBytes, f.expected), /registry_manifest_digest_mismatch/);
  for (const configBytes of [Buffer.from(JSON.stringify(f.config, null, 2)), bytes({...f.config, rootfs: {...f.config.rootfs, diff_ids: [...f.config.rootfs.diff_ids].reverse()}}), bytes({...f.config, config: {...f.config.config, Env: ['changed']}})])
    assert.throws(() => verifyRegistryImage(f.manifestBytes, configBytes, f.expected), /registry_config_digest_mismatch/);
  assert.throws(() => verifyRegistryImage(f.manifestBytes.toString(), f.configBytes, f.expected), /registry_raw_bytes_required/);
});

test('matching JSON digests still require descriptor binding, platform, source and exact ordered layer inventory', () => {
  const cases = [
    [{changeManifest: m => m.config.digest = sha256('wrong config')}, /registry_config_descriptor_mismatch/],
    [{changeManifest: m => m.config.size++}, /registry_config_descriptor_mismatch/],
    [{changeManifest: m => m.mediaType = 'application/vnd.oci.image.index.v1+json'}, /registry_single_image_manifest_required/],
    [{changeConfig: c => c.architecture = 'arm64'}, /registry_platform_mismatch/],
    [{changeConfig: c => c.os = 'windows'}, /registry_platform_mismatch/],
    [{changeConfig: c => c.config.Labels['org.opencontainers.image.revision'] = '2'.repeat(40)}, /registry_source_mismatch/],
    [{changeConfig: c => c.rootfs.diff_ids.pop()}, /registry_diffids_mismatch/],
    [{changeConfig: c => c.rootfs.diff_ids.push(sha256('extra'))}, /registry_diffids_mismatch/],
    [{changeConfig: c => c.rootfs.diff_ids[0] = 'not-a-digest'}, /registry_diffids_mismatch/],
    [{changeManifest: m => m.layers.pop()}, /registry_layer_descriptors_mismatch/],
    [{changeManifest: m => m.layers[0].digest = 'not-a-digest'}, /registry_layer_descriptors_mismatch/],
    [{changeManifest: m => m.layers[0].size = -1}, /registry_layer_descriptors_mismatch/],
  ];
  for (const [changes, error] of cases) assert.throws(() => verify(fixture(changes)), error);
});

test('registry transport reads raw bytes by immutable digest using the existing explicit auth file', () => {
  const f = fixture(), calls = [], reference = `registry.example.test/worker@${f.expected.digest}`;
  const result = inspectRegistryImage(reference, f.expected, {authFile: '/isolated/config.json', command: (name, args, options) => {
    calls.push({name, args, options}); return args.includes('--config') ? f.configBytes : f.manifestBytes;
  }});
  assert.equal(result.ManifestDigest, f.expected.digest); assert.equal(calls.length, 2);
  for (const c of calls) { assert.equal(c.name, 'skopeo'); assert.deepEqual(c.options.stdio, ['ignore', 'pipe', 'pipe']); assert.equal(c.options.encoding, null); assert(c.args.includes('--raw')); assert(c.args.includes('/isolated/config.json')); assert.equal(c.args.at(-1), `docker://${reference}`); }
  assert.deepEqual(calls[1].args, ['inspect', '--authfile', '/isolated/config.json', '--raw', '--config', `docker://${reference}`]);
  for (const ref of ['registry.example.test/worker:latest', `docker://${reference}`]) assert.throws(() => inspectRegistryImage(ref, f.expected, {authFile: '/isolated/config.json', command: () => assert.fail('must not run')}), /registry_reference_not_pinned/);
});

test('registry command failures expose no captured credential/config output and never fall back to Docker', () => {
  const f = fixture(); let calls = 0;
  assert.throws(() => inspectRegistryImage(`registry.example.test/worker@${f.expected.digest}`, f.expected, {authFile: '/isolated/config.json', command: name => {calls++; assert.equal(name, 'skopeo'); throw Error('SYNTHETIC_SECRET_STDERR');}}), error => error.message === 'registry_inspection_failed');
  assert.equal(calls, 1);
});
