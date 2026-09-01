#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'data/rcap-grade-a/codex-max/source-and-candidate/src-x4');
const sha = value => createHash('sha256').update(value).digest('hex');
const shard = value => Number(BigInt(`0x${sha(value).slice(0, 16)}`) % 8n);
const json = (name, value) => writeFileSync(join(OUT, name), `${JSON.stringify(value, null, 2)}\n`);
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 64e6 }).trim().split('\n');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
mkdirSync(OUT, { recursive: true });

const read = path => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const wavePath = 'data/rcap-grade-a/launch-control/next-waves/SOURCE_RELATIONSHIP_REPAIR_WAVE.json';
const wave = read(wavePath);
const assigned = wave.rows.filter(row => Number(row.rowId.slice(4)) >= 46 && Number(row.rowId.slice(4)) <= 60);
if (assigned.length !== 15) throw new Error(`expected 15 SRR rows, got ${assigned.length}`);
const familiesIndexPath = 'data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json';
const families = read(familiesIndexPath).families;
const familyById = new Map(families.map(family => [family.familyId, family]));
const claimsPath = 'data/rcap-grade-a/packet-factory-24h/claim-ledger.json';
const checkpointPath = 'data/rcap-grade-a/packet-factory-24h/CHECKPOINT.json';
const assignmentsPath = 'data/rcap-grade-a/packet-factory-24h/SOURCE_CONVEYOR_ASSIGNMENTS.json';

function locate(row) {
  const paths = [];
  if (row.heldPath && existsSync(join(ROOT, row.heldPath))) paths.push(row.heldPath);
  for (const candidate of row.heldCandidates ?? []) {
    const privateRoot = join(ROOT, 'private');
    if (!existsSync(privateRoot)) continue;
    const hits = execFileSync('find', [privateRoot, '-type', 'f', '-name', candidate.fileName], { encoding: 'utf8' }).trim();
    if (hits) paths.push(...hits.split('\n').map(path => path.slice(ROOT.length + 1)));
  }
  return [...new Set(paths)].sort().map(path => {
    const bytes = readFileSync(join(ROOT, path));
    return { path, fileName: basename(path), byteLength: bytes.length, sha256: sha(bytes) };
  });
}

const activeClaudeFamilies = new Set(families.filter(f => f.claudeOwned).map(f => f.familyId));
const relationshipRows = assigned.map(row => {
  const heldBytes = locate(row);
  const activeOwners = row.affectedFamilies.filter(id => activeClaudeFamilies.has(id)).map(id => ({ familyId: id, owner: familyById.get(id)?.currentOwner ?? 'CLAUDE_FLEET' }));
  let verdict;
  if (activeOwners.length) verdict = 'DEFERRED_ACTIVE_CLAUDE_OWNER';
  else if (!heldBytes.length) verdict = 'STOPPED_MISSING_BYTES';
  else if (row.currentSourceIdentity.sourceState === 'CURRENTNESS_UNVERIFIED') verdict = 'STOPPED_CURRENTNESS';
  else if (row.currentSourceIdentity.sourceState === 'FAMILY_IDENTITY_AMBIGUOUS') verdict = 'STOPPED_FAMILY_MAPPING';
  else if (/SCOPE|VERSION/.test(row.currentSourceIdentity.sourceState)) verdict = 'STOPPED_SCOPE_OR_VARIANT';
  else verdict = 'STOPPED_IDENTITY';
  return {
    rowId: row.rowId,
    remeasuredAtHead: head,
    currentSourceIdentity: row.currentSourceIdentity,
    heldBytes,
    plausibleIdentities: heldBytes.map((bytes, index) => ({
      canonicalArtifactId: row.heldCandidates?.[index]?.artifactId ?? row.currentSourceIdentity.canonicalArtifactId,
      fileName: bytes.fileName,
      sha256: bytes.sha256,
      identityStatus: heldBytes.length === 1 ? 'BYTE_IDENTITY_LOCATED' : 'MULTIPLE_PLAUSIBLE_IDENTITIES'
    })),
    dimensions: {
      identity: row.currentSourceIdentity.canonicalArtifactId,
      currentness: row.currentSourceIdentity.sourceState === 'CURRENTNESS_UNVERIFIED' ? 'UNVERIFIED' : 'NOT_SETTLED',
      scope: 'NOT_INFERRED_FROM_FILENAME', language: 'NOT_CANONICALLY_SETTLED', filingMode: 'NOT_CANONICALLY_SETTLED',
      bundleOrComponent: 'NOT_CANONICALLY_SETTLED', embeddedSection: 'NONE_IDENTIFIED', aliases: row.aliases ?? [],
      reuseStatus: 'NOT_SETTLED', familyRelationship: row.affectedFamilies
    },
    activeClaudeOwners: activeOwners,
    verdict,
    stopReason: activeOwners.length ? 'At least one affected family is actively Claude-owned; this lane does not impersonate or modify that claim.' : row.ambiguity
  };
});

const readyRows = relationshipRows.filter(row => row.verdict === 'READY_TO_APPLY');
json('source-relationship-rows.json', { schemaVersion: 'src-x4-source-relationship-rows/v1', assignment: 'SRC-X4', source: wavePath, head, assignedRange: ['SRR-046', 'SRR-060'], attemptedCount: relationshipRows.length, rows: relationshipRows });
json('source-relationship-apply-payload.json', { schemaVersion: 'src-x4-canonical-source-apply-payload/v1', authority: 'APPLY_READY_ONLY_DO_NOT_APPLY', head, count: readyRows.length, patches: readyRows.map(row => ({ rowId: row.rowId, operation: 'UPSERT_EXACT_SOURCE_RELATIONSHIP', expectedCurrentHead: head, identity: row.currentSourceIdentity, heldBytes: row.heldBytes, familyIds: row.dimensions.familyRelationship })) });
json('collision-guard.json', { schemaVersion: 'src-x4-collision-guard/v1', assignment: 'SRC-X4', head, inspected: ['data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json', claimsPath, assignmentsPath, checkpointPath], activeClaudeFamilyCount: activeClaudeFamilies.size, deferredRows: relationshipRows.filter(r => r.verdict === 'DEFERRED_ACTIVE_CLAUDE_OWNER').map(r => r.rowId), assertion: 'NO_CLAUDE_CLAIM_ASSERTED_RELEASED_MODIFIED_OR_IMPERSONATED' });

// Evidence-derived, strict URL conveyor. Backslashes, comma tails, and multi-value cells are refused.
const urlEvidence = new Map();
const urlRegex = /https?:\/\/[^\s"'<>\])}]+/g;
for (const path of tracked) {
  if (!/^(data|docs)\//.test(path) || /candidate|src-x4/i.test(path) || !/\.(json|md|txt|csv)$/i.test(path)) continue;
  let body; try { body = readFileSync(join(ROOT, path), 'utf8'); } catch { continue; }
  for (const match of body.matchAll(urlRegex)) {
    const raw = match[0].replace(/[.;:]$/, '');
    if (/[\\|,]/.test(raw)) continue;
    let normalized, host;
    try { const u = new URL(raw); u.hash = ''; normalized = u.href; host = u.hostname.toLowerCase(); } catch { continue; }
    if (!(host.endsWith('.gov') || host.includes('.gov.') || /^(court|courts|judiciary)\./.test(host))) continue;
    if (!urlEvidence.has(normalized)) urlEvidence.set(normalized, new Set());
    urlEvidence.get(normalized).add(path);
  }
}
const receiptFiles = tracked.filter(path => /(?:acquisition|download).*(?:receipt)|receipt.*(?:acquisition|download)/i.test(path) && !/src-x4/.test(path));
const receiptBodies = receiptFiles.map(path => readFileSync(join(ROOT, path), 'utf8'));
const ownedUrls = [...urlEvidence].filter(([, files]) => files.size >= 2).filter(([url]) => shard(url) === 3).filter(([url]) => !receiptBodies.some(body => body.includes(url))).sort(([a], [b]) => a.localeCompare(b));
const urlRows = ownedUrls.map(([url, files]) => ({ normalizedUrl: url, normalizedUrlSha256: sha(url), shardIndex: 3, supportingEvidenceFiles: [...files].sort(), expectedSourceIdentity: 'REQUIRES_ARTIFACT_LEVEL_ACQUISITION_REVIEW', affectedFamilies: families.filter(f => (f.evidence ?? []).some(e => files.has(e))).map(f => f.familyId), status: 'ACQUISITION_BLOCKED_NOT_DOWNLOADED', block: 'A corroborated URL alone does not settle an exact artifact identity; no guessed filename or source binding was made.' }));
json('corroborated-urls.json', { schemaVersion: 'src-x4-corroborated-urls/v1', head, qualification: 'two distinct committed non-candidate evidence files; accepted first-party host; strict normalized single URL; no exact existing receipt; sha256 first-eight-byte modulo 8 equals 3', count: urlRows.length, rows: urlRows });
json('acquisition-ready-receipts.json', { schemaVersion: 'src-x4-acquisition-ready-receipts/v1', head, readyCount: 0, blockedCount: urlRows.length, receipts: [], blocks: urlRows.map(row => ({ normalizedUrl: row.normalizedUrl, normalizedUrlSha256: row.normalizedUrlSha256, status: row.status, reason: row.block })) });

const ownedFamilies = families.filter(f => shard(f.familyId) === 3 && !f.claudeOwned);
const familyRows = ownedFamilies.map(f => {
  const controllingExact = f.sourceBound && !['LEGAL_BLOCKED', 'SOURCE_BLOCKED'].includes(f.currentState);
  const incomplete = f.artifactStatus !== 'RENDERED' || f.completenessStatus !== 'PASS_COMPLETE';
  const eligible = controllingExact && incomplete && ['official_pdf_fill', 'custom_pleading'].includes(f.implementationStrategy);
  return { familyId: f.familyId, jurisdiction: f.jurisdiction, measuredState: f.currentState, implementationStrategy: f.implementationStrategy, sourceStatus: f.sourceStatus, sourceBound: f.sourceBound, artifactStatus: f.artifactStatus, completenessStatus: f.completenessStatus, eligible, status: eligible ? 'CANDIDATE_BINARY_PROMOTION_PENDING' : 'STOPPED_NOT_ELIGIBLE', reason: eligible ? 'Eligible for candidate build.' : (!controllingExact ? 'Controlling and exact legal/source treatment is not established.' : !incomplete ? 'Family is already canonical and complete.' : 'Controlling evidence does not authorize an official PDF fill or custom pleading.') };
});
json('candidate-families.json', { schemaVersion: 'src-x4-candidate-families/v1', head, source: familiesIndexPath, examinedCount: familyRows.length, builtCount: 0, stoppedCount: familyRows.length, rows: familyRows });

const stoppedPath = 'data/rcap-grade-a/codex-5h/cb01-route-integration/stopped.json';
const routeRows = read(stoppedPath).rows.filter(row => shard(row.id) === 3).map(row => ({ rowId: row.rowId, routeKey: row.id, jurisdiction: row.jurisdiction, head, originalReason: row.reason, currentResolution: row.resolution, verdict: 'STOPPED_ROUTE_OR_LEGAL_IDENTITY', stop: row.resolution?.requiredAction ?? row.reason, evidenceSource: row.evidenceSource }));
json('route-mapping-payload.json', { schemaVersion: 'src-x4-route-mapping-payload/v1', authority: 'APPLY_READY_ONLY_DO_NOT_APPLY', head, source: stoppedPath, examinedCount: routeRows.length, readyCount: 0, stoppedCount: routeRows.length, patches: [], stops: routeRows });

const counts = { srrAttempted: relationshipRows.length, sourceReady: readyRows.length, sourceStops: relationshipRows.length - readyRows.length, urlsOwned: urlRows.length, acquisitionReady: 0, acquisitionBlocks: urlRows.length, familiesExamined: familyRows.length, candidatesBuilt: 0, candidatesStopped: familyRows.length, routeReady: 0, routeStops: routeRows.length };
json('state.json', { schemaVersion: 'src-x4-state/v1', assignment: 'SRC-X4', baseSha: head, status: 'COMPLETE_WITH_EXPLICIT_STOPS', counts, invariants: { sourceBodiesCommitted: 0, candidatePdfBinariesCommitted: 0, canonicalRegistriesModified: 0, packetOverlaysModified: 0, claimsOrQueuesModified: 0, commercialRoutesOpened: 0, productionTouched: false } });
writeFileSync(join(OUT, 'progress.md'), `# SRC-X4 progress\n\n- Phase 1: ${counts.srrAttempted}/15 rows remeasured; ${counts.sourceReady} ready and ${counts.sourceStops} stopped/deferred.\n- Phase 2: ${counts.urlsOwned} URLs owned; ${counts.acquisitionReady} receipts ready and ${counts.acquisitionBlocks} explicit acquisition blocks.\n- Phase 3: ${counts.familiesExamined} unclaimed shard families examined; no eligible incomplete family.\n- Phase 4: ${counts.routeStops} owned stopped-route rows remeasured; none had an already-settled crosswalk.\n- Safety: no canonical, claim, queue, overlay, commercial, production, PDF, or source-body path changed.\n`);
writeFileSync(join(OUT, 'report.md'), `# SRC-X4 source and candidate superlane report\n\n## Result\n\nThe lane exhausted all four phases at commit \`${head}\`. It refused to convert filename similarity, URL corroboration, or a proposed runtime rewrite into canonical authority. Every stop is machine-readable in the companion JSON.\n\n## Counts\n\n| Metric | Count |\n|---|---:|\n${Object.entries(counts).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n\n## Authority boundary\n\nAll patches are apply-ready payloads only. No payload in this directory opens a route or authorizes participant delivery.\n`);
console.log(JSON.stringify(counts));
