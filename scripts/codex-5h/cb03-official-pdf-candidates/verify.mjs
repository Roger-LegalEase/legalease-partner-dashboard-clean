#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'data/rcap-grade-a/codex-5h/cb03-official-pdf-candidates');
const json = async (name) => JSON.parse(await readFile(path.join(out, name), 'utf8'));
const [guard, candidates, bindings, stopped, state] = await Promise.all([
  json('collision-guard.json'), json('candidates.json'), json('source-bindings.json'),
  json('stopped.json'), json('state.json')
]);
const fail = (message) => { throw new Error(message); };
if (guard.laneIds.length !== 52) fail(`expected 52 Claude lane prompts, got ${guard.laneIds.length}`);
if (new Set(guard.laneIds).size !== guard.laneIds.length) fail('duplicate lane in collision guard');
if (candidates.candidates.length !== state.sourceBoundCandidates) fail('candidate count mismatch');
if (stopped.stopped.length !== state.candidatesStopped) fail('stopped count mismatch');
if (bindings.sourceBodiesCommitted !== 0 || state.sourceBodiesCommitted !== 0) fail('source body invariant failed');
for (const binding of bindings.bindings) {
  if (!/^[a-f0-9]{64}$/.test(binding.sha256 ?? '')) fail(`invalid exact source hash for ${binding.packetFamilyId}`);
}
for (const candidate of candidates.candidates) {
  if (candidate.status !== 'CANDIDATE_RASTER_PENDING') fail(`invalid candidate status for ${candidate.packetFamilyId}`);
  if (guard.claudeOwnedFamilies.includes(candidate.packetFamilyId)) fail(`collision: ${candidate.packetFamilyId}`);
}
if (state.candidateFamiliesBuilt !== candidates.candidates.length) {
  // A manifest-only derivation can have zero candidates and therefore zero builds.
  if (candidates.candidates.length !== 0 || state.candidateFamiliesBuilt !== 0) fail('build count mismatch');
}
if (state.canonicalOverlaysModified || state.commercialRoutesOpened || state.productionTouched) fail('authority invariant failed');
console.log(`CB03_VERIFIED candidates=${candidates.candidates.length} stopped=${stopped.stopped.length} exactBindings=${bindings.bindings.length}`);
