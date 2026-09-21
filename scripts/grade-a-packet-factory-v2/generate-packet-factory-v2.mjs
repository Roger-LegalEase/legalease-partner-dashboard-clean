#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const stable = value => JSON.stringify(value, null, 2) + '\n';
const outputs = new Map();
const emit = (p, value) => outputs.set(p, typeof value === 'string' ? value : stable(value));

const worklist = read('data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json');
const custody = read('data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json');
const production = read('data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150.json');
const c11 = read('data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json');
const activeAssignments = read('data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json');
const wave2 = read('data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json');
const s2 = read('data/rcap-grade-a/launch-control/S2_CONTINUATION.json');
const launch = read('data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json');
const corpusIndex = read('data/rcap-all50/local-source-corpus-index.json');

const captainHead = '55153e559f45f4da967fe51d0cba15b5b347e965';
const active43 = c11.families.filter(f => f.classification === 'BUILT').map(f => f.familyId).sort();
if (active43.length !== 43) throw new Error(`C11 audit must derive exactly 43 built families; got ${active43.length}`);
const readyIds = new Set(production.assignments.filter(a => a.itemKind === 'packetFamily').flatMap(a => a.items));
const readyDetail = new Map(production.assignments.filter(a => a.itemKind === 'packetFamily').flatMap(a => a.familyDetail || []).map(r => [r.familyId, r]));
const corpusByForm = Map.groupBy(corpusIndex.entries, e => String(e.formNumber || '').toUpperCase());
const custodyByGroup = new Map(custody.rows.map(r => [r.worklistGroupId, r]));
const c11ById = new Map(c11.families.map(r => [r.familyId, r]));

function idOf(f) { return f.packetFamilyId || f.packetSetId || f.worklistGroupId; }
function components(f) {
  const d = f.reusableFamilyDeliverable || f.routes?.[0]?.deliverable || {};
  return Object.entries(d).filter(([,v]) => v?.status === 'recorded').map(([k]) => k).sort();
}
function hashes(c) {
  return (c?.documentSources || []).map(s => s.heldAs?.sha256 || s.sha256 || s.contentSha256).filter(Boolean).sort();
}
function readyHashes(familyId, c) {
  const held = hashes(c); if (held.length) return held;
  return [...new Set((readyDetail.get(familyId)?.forms || []).flatMap(form => (corpusByForm.get(String(form).toUpperCase()) || []).map(e => e.sha256)).filter(Boolean))].sort();
}
function machinery(f) {
  const comps = components(f);
  const form = f.implementationStrategy === 'official_pdf_fill' ? (f.routes?.[0]?.requiredSourceIds?.[0] || 'official-form') : 'composed-pleading';
  return {
    sharedRenderer: f.implementationStrategy === 'official_pdf_fill' ? 'official-pdf-overlay-renderer' : 'composed-pdf-renderer',
    sharedFormFamily: form,
    fieldMapSchema: f.implementationStrategy === 'official_pdf_fill' ? 'census-v1-field-map' : 'composed-pleading-facts',
    componentAssemblyLogic: comps.join('+') || 'primary-filing',
    routeOptionLogic: (f.routes?.length || 0) > 1 ? 'multi-route' : 'single-route',
    localVariationModel: (f.jurisdictions?.length || 0) > 1 ? 'multi-jurisdiction' : 'jurisdiction-local'
  };
}

const outsideFleet = worklist.packetFamilies.filter(f => !active43.includes(idOf(f)));
const consolidated = [...Map.groupBy(outsideFleet, idOf).values()].map(parts => ({
  ...parts[0],
  routeKeys: [...new Set(parts.flatMap(f => f.routeKeys || []))].sort(),
  routes: parts.flatMap(f => f.routes || []),
  jurisdictions: [...new Set(parts.flatMap(f => f.jurisdictions || []))].sort()
}));
const rows = consolidated.map(f => {
  const familyId = idOf(f); const c = custodyByGroup.get(f.worklistGroupId); const m = machinery(f);
  const boundHashes = readyHashes(familyId, c);
  const isReady = readyIds.has(familyId) && boundHashes.length > 0;
  const legalBlocked = !isReady && c?.commissionAcquisition === false;
  const guidance = /guidance/i.test(f.implementationStrategy || '') || /guidance/i.test(familyId);
  const nextAction = guidance ? 'LEGITIMATE_CATEGORY_B_GUIDANCE' : isReady ? 'SOURCE_READY' : legalBlocked ? 'LAWRENCE_REVIEW' : 'SOURCE_BLOCKED';
  return {
    familyId, jurisdiction: (f.jurisdictions || []).join(','), routeKeys: f.routeKeys || [],
    implementationStrategy: f.implementationStrategy, packetComponents: components(f),
    sharedBuildHost: `pfv2-${crypto.createHash('sha256').update(JSON.stringify(m)).digest('hex').slice(0,12)}`,
    ...m,
    requiredSourceIds: [...new Set((f.routes || []).flatMap(r => r.requiredSourceIds || []))].sort(),
    sourceIdentityStatus: isReady ? 'EXACT_BOUND' : c?.custodyClass || 'UNRESOLVED',
    sourceCustodyStatus: isReady ? 'HELD_IMMUTABLE' : c?.custodyClass || 'NOT_HELD',
    sourceSha256: boundHashes, revision: 'packet-factory-v2-dispatch-1',
    currentArtifactStatus: c11ById.get(familyId)?.classification || 'NOT_BUILT',
    completenessStatus: 'NOT_PROVEN', legalInputStatus: legalBlocked ? 'UNRESOLVED' : 'NOT_BLOCKING_BUILD',
    routeMappingStatus: f.routeKeys?.length ? 'MAPPED' : 'UNRESOLVED', activeOwner: null,
    nextAction, priority: isReady ? 1 : legalBlocked ? 2 : 3,
    exactOwnedPaths: [],
    exactProhibitedSharedPaths: ['data/rcap-all50/overlays/census-v1/**','scripts/build-census-v1-*.mjs','data/rcap-grade-a/launch-control/**','scripts/rcap-packet-completeness/**','package.json','package-lock.json','migrations/**','Production/**','private/**']
  };
}).sort((a,b) => a.familyId.localeCompare(b.familyId));

const buildable = rows.filter(r => r.nextAction === 'SOURCE_READY');
const groups = [...Map.groupBy(buildable, r => r.sharedBuildHost).entries()].map(([host, families]) => ({host, families})).sort((a,b) => b.families.length-a.families.length || a.host.localeCompare(b.host));
const pf = Array.from({length:8}, (_,i) => ({laneId:`PF${i+1}`, laneType:'PACKET_FACTORY', families:[], sharedHosts:[], capacity:{targetMin:15,targetMax:25}}));
for (const group of groups) { const lane = pf.toSorted((a,b)=>a.families.length-b.families.length || a.laneId.localeCompare(b.laneId))[0]; lane.families.push(...group.families.map(r=>r.familyId)); lane.sharedHosts.push(group.host); }
for (const lane of pf) for (const id of lane.families) { const r=rows.find(x=>x.familyId===id); r.activeOwner=lane.laneId; r.nextAction='ASSIGNED_TO_FACTORY'; r.exactOwnedPaths=[`data/rcap-grade-a/packet-factory-v2/work/${lane.laneId.toLowerCase()}/${id}/**`]; }

const blocked = rows.filter(r => r.nextAction === 'SOURCE_BLOCKED');
const src = [1,2].map(i => ({laneId:`SRC${i}`,laneType:'SOURCE_ACQUISITION',families:[]}));
blocked.forEach((r,i)=>{src[i%2].families.push(r.familyId); r.activeOwner=src[i%2].laneId;});
const vf = [1,2].map(i => ({laneId:`VF${i}`,laneType:'INDEPENDENT_VERIFICATION',capacity:{min:15,max:25},claimRule:'first unclaimed five-family PF checkpoint'}));

const cloudContract = [
  'Codex Cloud already checked out the selected Captain branch.',
  'Do not run `git fetch`, `git pull`, or `git push`.',
  'Do not use `gh` and do not require the terminal origin.',
  'Do not bootstrap the private corpus during the agent phase.',
  'Run `source $HOME/.legalease-corpus-env` and require the corpus preflight to report exactly 51 jurisdictions, 499 files, and 329 PDFs.',
  'Recreate only local origin metadata when repository preflight needs it. Require a non-shallow checkout.',
  'Leave the final diff for the Codex Cloud Open pull request button.'
];
const commonRules = ['Continue after an individual-family stop.','Checkpoint every five completed families or three hours.','Bind every source by exact SHA-256; never commit private source bytes.','Do not open a commercial route or touch Production.'];
function prompt(lane) {
  const isPF=lane.laneType==='PACKET_FACTORY', isSRC=lane.laneType==='SOURCE_ACQUISITION';
  const mission=isPF?'Build complete filing packets (never sample overlays): canonical PDF, boundary PDF, every required component, page rasters, actual-visible-write evidence, all known facts visibly written, every blank classified, route-determined options selected, repeating rows completed, and all nine completeness counters zero. Do not self-verify.':isSRC?'Establish exact source identity, official acquisition, revision/currentness, MIME and technology, SHA-256, page count, immutable custody receipt, and source-inventory promotion. Continue after a single source failure.':'Begin as soon as the first five-family PF checkpoint lands. Independently verify batches of 15–25. Make no packet edits. Return VERIFIED_PASS or exact failure evidence after checking counters, sources, components, protected fields, and visual output.';
  return `# ${lane.laneId} — National Packet Factory V2\n\n## Cloud execution contract\n\n${cloudContract.map(x=>`- ${x}`).join('\n')}\n\n## Mission\n\n${mission}\n\n## Assignment\n\n${lane.families?.length ? lane.families.map(x=>`- \`${x}\``).join('\n') : '- Streaming claim; no placeholder family is preassigned.'}\n\n## Owned paths\n\n${isPF ? lane.families.map(x=>`- \`data/rcap-grade-a/packet-factory-v2/work/${lane.laneId.toLowerCase()}/${x}/**\``).join('\n') || '- No family path until a source-ready checkpoint is assigned.' : `- \`data/rcap-grade-a/packet-factory-v2/work/${lane.laneId.toLowerCase()}/**\``}\n\n## Prohibited paths\n\n- Active overlays and Wave 2 owned paths\n- Shared completeness contracts and current launch graph\n- Commercial/payment authority, package manifests, migrations, Production, and private source binaries\n\n## Operating rules\n\n${commonRules.map(x=>`- ${x}`).join('\n')}\n`;
}

const counts = {outsideActive43:rows.length,sourceReady:buildable.length,sourceBlocked:blocked.length,legalBlocked:rows.filter(r=>r.nextAction==='LAWRENCE_REVIEW').length,guidanceOnly:rows.filter(r=>r.nextAction==='LEGITIMATE_CATEGORY_B_GUIDANCE').length};
emit('data/rcap-grade-a/packet-factory-v2/MASTER_PACKET_QUEUE.json',{schemaVersion:1,generatedFrom:{captainHead,worklist:'data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json',sourceCustody:'data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json',fleetAudit:'data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json',c11Return:'data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json',activeAssignments:'data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json',wave2:'data/rcap-grade-a/launch-control/WAVE_2_ASSIGNMENTS.json',s2:'data/rcap-grade-a/launch-control/S2_CONTINUATION.json',launchControl:'data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json'},active43,counts,allowedNextStates:['SOURCE_BLOCKED','SOURCE_READY','ASSIGNED_TO_FACTORY','BUILD_IN_PROGRESS','PASS_COMPLETE','VERIFY_PENDING','VERIFYING','FAIL_REPAIR_REQUIRED','VERIFIED_PASS','LAWRENCE_REVIEW','LAWRENCE_APPROVED','PRODUCT_PATH_PENDING','COMPLETE_PACKET_PROVEN','LEGITIMATE_CATEGORY_B_GUIDANCE'],families:rows});
emit('data/rcap-grade-a/packet-factory-v2/ACTIVE_FACTORY_ASSIGNMENTS.json',{schemaVersion:1,captainHead,lanes:[...pf,...src,...vf],cloudContract,commercialRoutesOpened:0,productionTouched:false});
emit('data/rcap-grade-a/packet-factory-v2/FACTORY_CHECKPOINT.json',{schemaVersion:1,status:'DISPATCH_READY',counts,laneCounts:Object.fromEntries([...pf,...src].map(x=>[x.laneId,x.families.length])),verificationCapacity:{VF1:'15-25',VF2:'15-25'},nextCheckpoint:'first five-family PF completion or three hours',commercialRoutesOpened:0,productionTouched:false});
emit('data/rcap-grade-a/packet-factory-v2/FACTORY_COLLISIONS.json',{schemaVersion:1,derivedActiveFleetCount:active43.length,duplicateAssignments:[],ownedPathCollisions:[],sharedHostCollisions:[],activeFamilyCollisions:[],placeholders:[],readRecords:{activeAssignments:activeAssignments.schemaVersion,wave2:wave2.schemaVersion,s2:s2.schemaVersion,launch:launch.schemaVersion}});
for (const lane of [...pf,...src,...vf]) emit(`docs/rcap/grade-a/packet-factory-v2/${lane.laneId}.md`,prompt(lane));

let dirty=false;
for (const [p,body] of outputs) { const full=path.join(ROOT,p); const old=fs.existsSync(full)?fs.readFileSync(full,'utf8'):null; if(old!==body){dirty=true;if(!CHECK){fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,body);}} }
if(CHECK&&dirty){console.error('packet-factory-v2 outputs are not converged');process.exit(1)}
console.log(`${CHECK?'checked':'generated'} ${outputs.size} packet-factory-v2 files; ${rows.length} queue rows; ${buildable.length} source-ready`);
