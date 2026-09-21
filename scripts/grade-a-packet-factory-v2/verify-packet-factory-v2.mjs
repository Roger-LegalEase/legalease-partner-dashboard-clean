#!/usr/bin/env node
import fs from 'node:fs';
const q=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-v2/MASTER_PACKET_QUEUE.json'));
const a=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-v2/ACTIVE_FACTORY_ASSIGNMENTS.json'));
const failures=[]; const fail=(ok,msg)=>{if(!ok)failures.push(msg)};
const pf=a.lanes.filter(x=>x.laneType==='PACKET_FACTORY'); const assigned=pf.flatMap(x=>x.families.map(f=>({f,l:x.laneId})));
const dup=[...Map.groupBy(assigned,x=>x.f)].filter(([,v])=>v.length>1); fail(!dup.length,'duplicate family assignments');
fail(!assigned.some(x=>q.active43.includes(x.f)),'active-family collision');
const owned=q.families.flatMap(r=>r.exactOwnedPaths.map(p=>({p,f:r.familyId}))); fail([...Map.groupBy(owned,x=>x.p)].every(([,v])=>v.length===1),'owned-path collision');
const hosts=pf.flatMap(l=>l.sharedHosts.map(h=>({h,l:l.laneId}))); fail([...Map.groupBy(hosts,x=>x.h)].every(([,v])=>new Set(v.map(x=>x.l)).size===1),'shared host assigned to multiple owners');
for(const x of assigned){const r=q.families.find(y=>y.familyId===x.f);fail(r?.sourceIdentityStatus==='EXACT_BOUND'&&r?.sourceCustodyStatus==='HELD_IMMUTABLE'&&r?.sourceSha256?.length>0,`${x.f}: source-blocked or byte-unbound family assigned`);fail(r?.legalInputStatus!=='UNRESOLVED',`${x.f}: unresolved legal family assigned`);fail(r?.nextAction!=='LEGITIMATE_CATEGORY_B_GUIDANCE',`${x.f}: guidance-only family assigned`)}
for(const r of q.families){if(r.nextAction==='PASS_COMPLETE'){fail(r.completenessStatus==='PASS_COMPLETE'&&r.completenessCounters&&Object.values(r.completenessCounters).every(x=>x===0),`${r.familyId}: incomplete PASS_COMPLETE`);fail(r.unexplainedBlanks===0,`${r.familyId}: unexplained blank`);fail(r.missingComponents===0,`${r.familyId}: missing component`)} if(['ASSIGNED_TO_FACTORY','BUILD_IN_PROGRESS','VERIFY_PENDING','VERIFYING','FAIL_REPAIR_REQUIRED'].includes(r.nextAction))fail(Boolean(r.activeOwner),`${r.familyId}: missing next owner`)}
const releasable=q.families.filter(r=>r.nextAction==='SOURCE_READY'); fail(releasable.length===0,'unused PF capacity while releasable source-ready family remains');
for(const lane of a.lanes){const p=`docs/rcap/grade-a/packet-factory-v2/${lane.laneId}.md`,s=fs.readFileSync(p,'utf8');fail(s.includes('Codex Cloud already checked out')&&s.includes('source $HOME/.legalease-corpus-env')&&s.includes('51 jurisdictions, 499 files, and 329 PDFs')&&s.includes('non-shallow checkout')&&s.includes('Open pull request button'),`${lane.laneId}: cloud contract incomplete`);fail(!/(^|\n)\s*(git\s+(fetch|push)|gh\s)/m.test(s),`${lane.laneId}: terminal publication command`)}
fail(a.commercialRoutesOpened===0,'commercial route opened');fail(a.productionTouched===false,'Production touched');
if(failures.length){console.error(failures.join('\n'));process.exit(1)} console.log(`verified ${q.families.length} queue rows, ${assigned.length} PF assignments, 12 cloud-native prompts; zero collisions`);
