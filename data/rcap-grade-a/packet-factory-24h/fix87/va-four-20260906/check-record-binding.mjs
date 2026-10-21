import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=process.cwd();const read=fs.readFileSync.bind(fs);const write=fs.writeFileSync.bind(fs);const family='va_seal_petition_misdemeanor-set';const track=family.replace(/-set$/,'');
const {runFamilyById}=await import(path.join(root,'scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs'));
const mutations=[
 ['mismatch',/disagree on record obtain\/confirm requirements/, (set,isRegistry)=>{if(isRegistry)set.participantActionRequired=set.participantActionRequired.filter(a=>a.kind!=='obtain_document');}],
 ['missing_condition',/conditional record action has no stated condition/,(set)=>{const action=set.participantActionRequired.find(a=>a.kind==='obtain_document'&&a.requirement==='conditional');delete action.conditionDescription;}],
 ['wrong_packet_set',/record requirements must bind to this packet set/,(set,isRegistry)=>{if(isRegistry)set.packetSetId='wrong-family-set';}],
 ['missing_typed_actions',/no record obtain\/confirm actions are held/,(set)=>{set.participantActionRequired=set.participantActionRequired.filter(a=>!['obtain_document','confirm_answer'].includes(a.kind));}]
];
const results=[];
for(const [name,expected,mutate]of mutations){let writes=0;fs.readFileSync=(file,options)=>{const bytes=read(file,options);const f=String(file);const reg=f===path.join(root,'data/record-clearing/legal-design-track-registry.json');const manifest=f===path.join(root,'data/record-clearing/legal-design-packet-set-manifests.json');if(!reg&&!manifest)return bytes;const doc=JSON.parse(bytes.toString());const set=reg?doc.tracks.find(t=>t.trackId===track).packetSet:doc.packetSets.find(p=>p.packetSetId===family);mutate(set,reg);const out=JSON.stringify(doc);return typeof bytes==='string'?out:Buffer.from(out);};fs.writeFileSync=()=>{writes++;throw Error('unexpected write in check-only binding test');};
 try{await assert.rejects(()=>runFamilyById(family,['--check']),expected);assert.equal(writes,0);results.push({name,expected:String(expected),result:'PASS',writes});}finally{fs.readFileSync=read;fs.writeFileSync=write;}}
const real=await runFamilyById(family,['--check']);assert.equal(real.status,'CHECK_ONLY');results.push({name:'unmodified_current_records',result:'PASS',status:real.status});
fs.writeFileSync('/tmp/codex-fix87-20260906/record-binding-checks.json',JSON.stringify({status:'PASS',boundary:'fs.readFileSync for two legal-record files replaced in process memory in negative cases only; no repository source/record bytes changed. Real original source binding in unmodified control.',results},null,2)+'\n');console.log(JSON.stringify({status:'PASS',tests:results.length}));
