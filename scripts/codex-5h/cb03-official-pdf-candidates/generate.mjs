#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outRel = 'data/rcap-grade-a/codex-5h/cb03-official-pdf-candidates';
const out = path.join(root, outRel);
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const writeJson = async (name, value) => writeFile(path.join(out, name), `${JSON.stringify(value, null, 2)}\n`);
const sha = (value) => createHash('sha256').update(value).digest('hex');

await mkdir(out, { recursive: true });

const promptDir = path.join(root, 'docs/rcap/grade-a/packet-factory-24h');
const lanePattern = /^(?:PF(?:0[1-9]|1[0-6])|FIX0[1-8]|VF(?:0[1-9]|1[0-2])|DISC0[1-6]|SRC0[1-4]|ACQ0[1-3]|PROMO0[1-3])\.md$/;
const promptFiles = (await readdir(promptDir)).filter((name) => lanePattern.test(name)).sort();
const forbidden = new Set();
for (const name of promptFiles) {
  const body = await readFile(path.join(promptDir, name), 'utf8');
  for (const match of body.matchAll(/`((?:data|docs|scripts|src)\/[^`\n]+)`/g)) {
    const candidate = match[1].replace(/\/$/, '/**');
    if (candidate.includes('/') && !candidate.includes('<')) forbidden.add(candidate);
  }
}

const active = await readJson('data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json');
for (const assignment of active.assignments) {
  for (const ownedPath of assignment.ownedPaths ?? []) forbidden.add(ownedPath);
  if (assignment.returnDirectory) forbidden.add(`${assignment.returnDirectory}/**`);
}
const claims = await readJson('data/rcap-grade-a/packet-factory-24h/claim-ledger.json');
const claudeFamilies = new Set(claims.claims.filter((claim) => !claim.released).flatMap((claim) => claim.familyIds ?? [claim.familyId]).filter(Boolean));

await writeJson('collision-guard.json', {
  schemaVersion: 'cb03-collision-guard/v1',
  assignment: 'CB03_OFFICIAL_PDF_NEXT_WAVE_CANDIDATES',
  derivedFromCommittedPrompts: promptFiles.map((name) => path.posix.join('docs/rcap/grade-a/packet-factory-24h', name)),
  laneIds: promptFiles.map((name) => name.slice(0, -3)),
  forbiddenPaths: [...forbidden].sort(),
  claudeOwnedFamilies: [...claudeFamilies].sort(),
  enforcement: 'No CB03 output or proposal may modify a listed path or family.'
});

const inputs = {
  r1: await readJson('data/rcap-grade-a/wave-2/r1-branch-identity-remainder/rows.json'),
  r2: await readJson('data/rcap-grade-a/wave-2/r2-already-answered-engineering/rows.json'),
  r3: await readJson('data/rcap-grade-a/wave-2/r3-route-mapping-remainder/rows.json'),
  r6: await readJson('data/rcap-grade-a/wave-2/r6-counsel-determination-implementation/rows.json'),
  worklist: await readJson('data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json'),
  ratification: await readJson('data/record-clearing/legal-decisions/route-ratification-registry.json'),
  sourceRelationships: await readJson('data/record-clearing/legal-design-track-source-relationships.json')
};
const derivedRoutes = new Set();
const collectRoutes = (value) => {
  if (Array.isArray(value)) return value.forEach(collectRoutes);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if ((key === 'routeKey' || key === 'participantARouteKeys') && typeof child === 'string') derivedRoutes.add(child);
    if (key === 'participantARouteKeys' && Array.isArray(child)) child.forEach((route) => derivedRoutes.add(route));
    collectRoutes(child);
  }
};
for (const group of [inputs.r1.rows, inputs.r2.rows, inputs.r3.rows, inputs.r6.rows]) collectRoutes(group);
const categoryBFiles = [];
for (const lane of ['c1-split-automatic-correction-status', 'c2-split-automatic-court-petition', 'c3-split-agency-prosecutor-application', 'c4-split-objection-hearing-appeal', 'c5-split-post-order-enforcement', 'c6-convert-all-to-a', 'c7-confirm-b-guidance']) {
  const file = `data/rcap-grade-a/category-b-integration/${lane}/branch-identities.json`;
  categoryBFiles.push(file);
  collectRoutes(await readJson(file));
}
const ratified = new Set(inputs.ratification.routes.filter((route) => route.status === 'ratified_deployable').map((route) => route.routeKey));

const stopped = [];
const candidates = [];
for (const family of inputs.worklist.packetFamilies) {
  const routes = family.routeKeys ?? [];
  if (!routes.some((route) => derivedRoutes.has(route) || ratified.has(route))) continue;
  const id = family.packetFamilyId;
  if (family.implementationStrategy !== 'official_pdf_fill') continue;
  const required = [...new Set(family.routes.flatMap((route) => route.requiredSourceIds ?? []))];
  let reason = null;
  if (!id) reason = 'NO_EXACT_PACKET_FAMILY_ID';
  else if (claudeFamilies.has(id)) reason = 'CLAUDE_OWNED_FAMILY';
  else if (id.includes('custom-pleading')) reason = 'CUSTOM_PLEADING_EXCLUDED';
  else if (!required.some((source) => /^source-sha256:[a-f0-9]{64}$/.test(source))) reason = 'NO_EXACT_SHA256_SOURCE_BINDING';
  if (reason) {
    stopped.push({ packetFamilyId: id, worklistGroupId: family.worklistGroupId, routeKeys: routes, reason });
    continue;
  }
  // No current row reaches this point. Keeping the gate explicit prevents an
  // unbound or concurrently owned family from becoming a candidate by accident.
  candidates.push({ packetFamilyId: id, routeKeys: routes, status: 'CANDIDATE_RASTER_PENDING' });
}

const provenance = {
  branchSources: ['wave-2/R1', 'wave-2/R2', 'wave-2/R3', 'wave-2/R6', 'Category B integrated branch splits', 'route ratification registry', 'packet-family source relationships'],
  derivedRouteCount: derivedRoutes.size,
  ratifiedRouteCount: ratified.size,
  categoryBInputs: categoryBFiles,
  sourceRelationshipInput: 'data/record-clearing/legal-design-track-source-relationships.json',
  sourceRelationshipDigest: sha(JSON.stringify(inputs.sourceRelationships))
};
await writeJson('candidates.json', { schemaVersion: 'cb03-candidates/v1', ...provenance, candidates });
await writeJson('source-bindings.json', { schemaVersion: 'cb03-source-bindings/v1', bindings: [], sourceBodiesCommitted: 0, rule: 'Only source-sha256:<64 lowercase hex> identities qualify.' });
await writeJson('stopped.json', { schemaVersion: 'cb03-stopped/v1', stopped });
await writeJson('state.json', {
  schemaVersion: 'cb03-state/v1', assignment: 'CB03_OFFICIAL_PDF_NEXT_WAVE_CANDIDATES',
  status: 'CANDIDATE_RASTER_PENDING', baseSha: 'be1824b366bdbc45bd8503bd5aa9e38e0621f6d2',
  branchesDerived: derivedRoutes.size, sourceBoundCandidates: candidates.length,
  candidateFamiliesBuilt: 0, candidatesStopped: stopped.length, nonvisualCountersZeroOn: 0,
  sourceBodiesCommitted: 0, canonicalOverlaysModified: 0, commercialRoutesOpened: 0, productionTouched: false
});
const manifestHash = sha(JSON.stringify({ candidates, stopped }));
await writeFile(path.join(out, 'progress.md'), `# CB03 progress\n\n- Derived ${derivedRoutes.size} participant route identities.\n- Source-bound candidates: ${candidates.length}.\n- Stopped rows: ${stopped.length}.\n- Candidate manifest digest: \`${manifestHash}\`.\n- No source bodies, canonical overlays, active scripts, claims, or routes were modified.\n`);
console.log(`CB03_CANDIDATES_READY candidates=${candidates.length} stopped=${stopped.length} digest=${manifestHash}`);
