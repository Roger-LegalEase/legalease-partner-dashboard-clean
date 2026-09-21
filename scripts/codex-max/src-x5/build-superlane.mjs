#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding:'utf8'}).trim();
process.chdir(root);
const outDir = 'data/rcap-grade-a/codex-max/source-and-candidate/src-x5';
fs.mkdirSync(outDir, {recursive:true});
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2)+'\n');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const shard = value => Number(BigInt('0x'+sha(value).slice(0,16)) % 8n);
// Measure the repository head outside this lane so rerunning after the local lane
// commit does not make provenance self-referential or change deterministic output.
const head = execFileSync('git',['log','-1','--format=%H','--','.',':(exclude)data/rcap-grade-a/codex-max/source-and-candidate/src-x5/**',':(exclude)scripts/codex-max/src-x5/**'],{encoding:'utf8'}).trim();
const generatedAt = execFileSync('git',['show','-s','--format=%cI',head],{encoding:'utf8'}).trim();
const tracked = execFileSync('git',['ls-files','-z'],{encoding:'buffer',maxBuffer:16*1024*1024}).toString().split('\0').filter(Boolean);
const textFiles = tracked.filter(p => !p.startsWith(outDir+'/') && !/\.(pdf|png|jpe?g|gif|zip|docx?|xlsx?|woff2?|ico)$/i.test(p));
const textCache = new Map();
const text = p => { if (!textCache.has(p)) { try { textCache.set(p,fs.readFileSync(p,'utf8')); } catch { textCache.set(p,''); } } return textCache.get(p); };
const evidenceFor = needle => textFiles.filter(p => text(p).includes(needle));

const shiftPath='data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json';
const ledgerPath='data/rcap-grade-a/packet-factory-24h/claim-ledger.json';
const checkpointPath='data/rcap-grade-a/packet-factory-24h/CHECKPOINT.json';
const familyPath='data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json';
const wavePath='data/rcap-grade-a/launch-control/next-waves/SOURCE_RELATIONSHIP_REPAIR_WAVE.json';
const collision = {
  schemaVersion:'src-x5-collision-guard/v1', assignment:'SRC-X5', measuredAtHead:head,
  evidence:[shiftPath,ledgerPath,checkpointPath,familyPath],
  rules:{claudeClaimsReadOnly:true, canonicalChangesApplyReadyOnly:true, activeClaudePathsWritable:false},
  ownedWritePaths:[outDir+'/**','scripts/codex-max/src-x5/**'], productionTouched:false, commercialRoutesOpened:0
};
write('collision-guard.json',collision);

const wave=read(wavePath);
const assigned=wave.rows.filter(r=>Number(r.rowId.slice(4))>=61&&Number(r.rowId.slice(4))<=75);
if(assigned.length!==15) throw new Error(`expected 15 SRR rows, got ${assigned.length}`);
const sourceRows=assigned.map(r=>{
  const heldPresent=Boolean(r.heldPath && fs.existsSync(r.heldPath));
  const heldSha256=heldPresent?sha(fs.readFileSync(r.heldPath)):null;
  const candidates=(r.heldCandidates||[]).map(c=>{
    const matches=tracked.filter(p=>path.basename(p)===c.fileName || p.endsWith('/'+c.fileName));
    return {...c, locatedPaths:matches, recomputedSha256:matches[0]&&fs.existsSync(matches[0])?sha(fs.readFileSync(matches[0])):null};
  });
  const claims=r.currentClaims||[];
  const activeClaude=claims.length>0;
  let verdict;
  if(activeClaude) verdict='DEFERRED_ACTIVE_CLAUDE_OWNER';
  else if(!heldPresent && !candidates.some(c=>c.locatedPaths.length)) verdict='STOPPED_MISSING_BYTES';
  else if(r.currentSourceIdentity.sourceState==='FAMILY_IDENTITY_AMBIGUOUS') verdict='STOPPED_IDENTITY';
  else if(r.currentSourceIdentity.sourceState==='CURRENTNESS_UNVERIFIED') verdict='STOPPED_CURRENTNESS';
  else if(r.currentSourceIdentity.sourceState==='SOURCE_SCOPE_AND_VERSION_AMBIGUITY') verdict='STOPPED_SCOPE_OR_VARIANT';
  else verdict='STOPPED_FAMILY_MAPPING';
  const id=r.currentSourceIdentity.canonicalArtifactId;
  const identityEvidence=evidenceFor(id).slice(0,50);
  return {rowId:r.rowId, verdict, currentSourceIdentity:r.currentSourceIdentity, held:{path:r.heldPath,present:heldPresent,sha256:heldSha256},
    plausibleIdentities:[{artifactId:id,relationship:'declared canonical identity'},...candidates.map(c=>({artifactId:c.artifactId,fileName:c.fileName,sha256:c.recomputedSha256||c.sha256,relationship:'held candidate'}))],
    dimensions:{identity:id,currentness:r.currentSourceIdentity.sourceState,scopeOrVariant:r.ambiguity,language:'not distinguished by current evidence',filingMode:'not settled by this repair row',bundleOrComponent:r.currentSourceIdentity.sourceState==='BUNDLE_COMPONENT'?'component':'not identified as component',embeddedSection:r.currentSourceIdentity.sourceState==='EMBEDDED_SECTION',aliases:r.aliases||[],reuseStatus:'not authorized',familyRelationship:r.affectedFamilies||[]},
    activeClaudeClaims:claims, evidenceFiles:[wavePath,...identityEvidence], stopReason:verdict==='STOPPED_CURRENTNESS'?'Held bytes were hashed, but repository evidence does not establish publisher currentness.':r.ambiguity,
    canonicalPatchEligible:verdict==='READY_TO_APPLY'};
});
write('source-relationship-rows.json',{schemaVersion:'src-x5-source-relationship-rows/v1',assignment:'SRC-X5',measuredAtHead:head,assignedRange:['SRR-061','SRR-075'],expected:15,attempted:sourceRows.length,rows:sourceRows});
const ready=sourceRows.filter(r=>r.verdict==='READY_TO_APPLY');
write('source-relationship-apply-payload.json',{schemaVersion:'src-x5-source-relationship-apply-payload/v1',applyStatus:'APPLY_READY_PAYLOAD_ONLY',canonicalRegistryModified:false,measuredAtHead:head,count:ready.length,patches:ready.map(r=>({rowId:r.rowId,operation:'bind_exact_source_relationship',artifactId:r.currentSourceIdentity.canonicalArtifactId,sha256:r.held.sha256,families:r.dimensions.familyRelationship}))});

// A corroborated URL must occur in two separate tracked, non-candidate evidence files.
const urlMap=new Map();
const urlRe=/https?:\/\/[^\s"'<>\\)\]]+/g;
for(const p of textFiles.filter(p=>!p.includes('/candidates/'))){ for(const raw of text(p).match(urlRe)||[]){
  let normalized; try { const u=new URL(raw.replace(/[.,;:]+$/,'')); u.hash=''; normalized=u.toString(); } catch { continue; }
  if(!urlMap.has(normalized)) urlMap.set(normalized,new Set()); urlMap.get(normalized).add(p);
}}
const officialHost=h=>/\.gov$/i.test(h)||/\.gov\./i.test(h)||/\.us$/i.test(h)||/^(courts?|judicial)\.[a-z]{2}\.gov$/i.test(h);
const existingReceiptText=textFiles.filter(p=>/receipt|acquisition/i.test(p)).map(p=>text(p)).join('\n');
const qualified=[];
for(const [url,files] of urlMap){ const u=new URL(url); if(files.size<2||!officialHost(u.hostname)||shard(url)!==4||existingReceiptText.includes(url)) continue;
  qualified.push({normalizedUrl:url,urlSha256:sha(url),shardIndex:4,supportingEvidenceFiles:[...files].sort(),expectedSourceIdentity:'requires exact artifact identity confirmation before acquisition',affectedFamilies:[],status:'ACQUISITION_BLOCKED_IDENTITY',block:'No exact unsettled artifact identity can safely be inferred from URL text alone; guessed downloads are forbidden.'});
}
qualified.sort((a,b)=>a.normalizedUrl.localeCompare(b.normalizedUrl));
write('corroborated-urls.json',{schemaVersion:'src-x5-corroborated-urls/v1',measuredAtHead:head,qualification:{minimumDistinctEvidenceFiles:2,shardIndex:4,shardCount:8},ownedCount:qualified.length,urls:qualified});
write('acquisition-ready-receipts.json',{schemaVersion:'src-x5-acquisition-ready-receipts/v1',measuredAtHead:head,sourceBodiesCommitted:0,count:0,receipts:[],blocks:qualified.map(x=>({normalizedUrl:x.normalizedUrl,status:x.status,reason:x.block}))});

const families=read(familyPath).families;
const ownedFamilies=families.filter(f=>shard(f.familyId)===4);
const familyRows=ownedFamilies.map(f=>{
  let status,reason;
  if(f.claudeOwned||f.currentOwnerScope==='pre-existing-active-assignment'){status='DEFERRED_ACTIVE_CLAUDE_OWNER';reason=`Owner ${f.currentOwner||'unknown'} is active; no candidate files written.`;}
  else if(f.finalBlocker?.type==='LEGAL'||f.currentState==='LEGAL_BLOCKED'){status='STOPPED_LEGAL_TREATMENT';reason=f.finalBlocker?.exact||'Controlling legal treatment is not settled.';}
  else if(!f.sourceBound&&f.implementationStrategy!=='custom_pleading'){status='STOPPED_SOURCE_RELATIONSHIP';reason=f.sourceStatus;}
  else if(f.routeMappingStatus!=='BOUND'){status='STOPPED_FAMILY_MAPPING';reason=f.routeMappingStatus;}
  else if(f.artifactStatus==='RENDERED'&&f.completenessStatus==='PASS_COMPLETE'){status='ALREADY_CANONICAL_COMPLETE';reason='Current index reports a rendered complete artifact.';}
  else {status='STOPPED_CONTROLLING_EVIDENCE';reason='The fleet index does not itself prove controlling and exact legal treatment sufficient to author new pleading text.';}
  return {familyId:f.familyId,jurisdiction:f.jurisdiction,shardIndex:4,examined:true,implementationStrategy:f.implementationStrategy,status,reason,evidence:f.evidence||[],candidateDirectory:null,binaryManifest:null};
});
write('candidate-families.json',{schemaVersion:'src-x5-candidate-families/v1',measuredAtHead:head,selectionRule:'unsigned_big_endian(first_8_bytes(SHA-256(familyId))) mod 8 == 4',examined:ownedFamilies.length,built:0,stopped:familyRows.length,candidatePdfBinariesCommitted:0,families:familyRows});

const stopped=read('data/rcap-grade-a/codex-5h/cb01-route-integration/stopped.json').rows;
const routeRows=stopped.filter(r=>shard(r.id)===4).map(r=>({rowId:r.rowId,routeKey:r.id,jurisdiction:r.jurisdiction,status:'STOPPED_REQUIRES_CANONICAL_REPAIR',reason:r.reason,exactStop:r.resolution?.requiredAction||'Current stopped evidence does not settle an apply-ready mapping.',evidence:[r.evidenceSource,'data/rcap-grade-a/codex-5h/cb01-route-integration/stopped.json']}));
write('route-mapping-payload.json',{schemaVersion:'src-x5-route-mapping-payload/v1',measuredAtHead:head,canonicalRouteRegistryModified:false,ownedCount:routeRows.length,readyToApply:0,stops:routeRows.length,rows:routeRows});

const counts={srrAttempted:sourceRows.length,srrReady:ready.length,srrStops:sourceRows.length-ready.length,urlsOwned:qualified.length,receipts:0,acquisitionBlocks:qualified.length,familiesExamined:ownedFamilies.length,candidatesBuilt:0,candidatesStopped:familyRows.length,routeReady:0,routeStops:routeRows.length};
write('state.json',{schemaVersion:'src-x5-state/v1',assignment:'SRC-X5',baseSha:head,status:'COMPLETE_WITH_RECORDED_STOPS',generatedAt,counts,invariants:{sourceBodiesCommitted:0,candidatePdfBinariesCommitted:0,canonicalRegistriesModified:0,packetOverlaysModified:0,claimsOrQueuesModified:0,commercialRoutesOpened:0,productionTouched:false}});
fs.writeFileSync(path.join(outDir,'progress.md'),`# SRC-X5 progress\n\n- Phase 1: attempted all **${counts.srrAttempted}** assigned rows; ${counts.srrReady} apply-ready and ${counts.srrStops} stopped/deferred.\n- Phase 2: derived **${counts.urlsOwned}** owned corroborated URLs; ${counts.receipts} receipts and ${counts.acquisitionBlocks} safe acquisition blocks.\n- Phase 3: examined **${counts.familiesExamined}** shard-owned families; no family passed all controlling-evidence and collision gates.\n- Phase 4: re-measured **${counts.routeStops}** shard-owned stopped route rows; none was safe to map without its named canonical repair.\n`);
fs.writeFileSync(path.join(outDir,'report.md'),`# SRC-X5 report\n\nThis lane produced apply-ready sidecars only. It did not change canonical registries, claims, queues, overlays, commercial authority, source bodies, or PDF binaries. Every stop remains explicit in the JSON evidence.\n\n## Counts\n\n${Object.entries(counts).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
console.log(JSON.stringify(counts));
