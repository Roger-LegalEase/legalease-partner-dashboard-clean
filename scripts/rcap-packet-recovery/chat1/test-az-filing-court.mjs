#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AZ_SEALING_ROUTES,arizonaFilingCourtBinding,resolveArizonaSealingFilingCourt as resolve} from './az-filing-court.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/record-clearing/legal-design-track-registry.json'),'utf8'));
const uncharged='az_record_sealing_arrest_no_charges-set',dismissed='az_record_sealing_dismissal_not_guilty-set';
const recordKey='synthetic-arrest-001';
const evidence=(extra={})=>({complete:true,consistent:true,recordReference:'synthetic-record-reference',recordKey,...extra});
const justice={id:'synthetic-justice',name:'Synthetic Justice Court',county:'Pima',jurisdiction:'AZ',level:'justice'};
const superior={id:'synthetic-superior',name:'Synthetic Superior Court',county:'Pima',jurisdiction:'AZ',level:'superior'};
const base=()=>({familyId:uncharged,routeKey:AZ_SEALING_ROUTES[uncharged],recordKey,
 chargingHistory:evidence({chargesFiled:false,instruments:[]}),initialAppearance:evidence({occurred:true,court:justice,caseNumber:'TEST-IA-1'})});
const none=()=>({...base(),initialAppearance:evidence({occurred:false}),arrestRecord:evidence({countyOfArrest:'Pima'}),superiorCourtDirectoryEntry:evidence({court:superior})});
const filed=()=>({...base(),familyId:dismissed,routeKey:AZ_SEALING_ROUTES[dismissed],chargingHistory:evidence({chargesFiled:true,laterInformationSearchComplete:true,instruments:[{id:'doc-1',recordKey,sequence:1,type:'complaint',court:justice,caseNumber:'TEST-CR-1',recordReference:'synthetic-complaint'}]})});
const transferred=()=>{const x=filed();x.chargingHistory.instruments.push({id:'doc-2',recordKey,sequence:2,type:'information',court:superior,caseNumber:'TEST-SUP-1',followsInstrumentId:'doc-1',recordReference:'synthetic-information'});return x;};
const results=[];let positives=0,negatives=0;
const nonGrants=r=>{assert.equal(r.grantsEligibility,false);assert.equal(r.generationAllowed,false);assert.equal(r.grantsDeliveryAuthority,false);};
const accept=(name,x,code,expectedId)=>{const before=JSON.stringify(x);const r=resolve(x);assert.equal(r.status,'SELECTED',name);assert.equal(r.code,code);assert.equal(r.court.id,expectedId);nonGrants(r);assert.equal(JSON.stringify(x),before);positives++;results.push({name,result:'PASS'});};
accept('No charges: actual initial-appearance court',base(),'SELECT_INITIAL_APPEARANCE_COURT',justice.id);
accept('No charges and established no appearance: arrest-county superior court',none(),'SELECT_SUPERIOR_COURT_IN_COUNTY_OF_ARREST',superior.id);
accept('Complaint followed by information: information court and case',transferred(),'SELECT_SUPERIOR_COURT_NAMED_BY_INFORMATION',superior.id);
assert.equal(resolve(transferred()).caseNumber,'TEST-SUP-1');
for(const type of ['complaint','citation','indictment','information']) {const x=filed();x.chargingHistory.instruments[0].type=type;if(['indictment','information'].includes(type))x.chargingHistory.instruments[0].court=superior;accept(`Filed ${type}: actual filing court`,x,'SELECT_COURT_WHERE_CHARGING_INSTRUMENT_WAS_FILED',x.chargingHistory.instruments[0].court.id);}
const changedResidence=base();changedResidence.participant={city:'Phoenix',county:'Maricopa',address:'Synthetic residence'};accept('Residence does not replace recorded filing court',changedResidence,'SELECT_INITIAL_APPEARANCE_COURT',justice.id);
const cases=[
 ['Null input',()=>null],['Array input',()=>[]],
 ['Missing record identity',()=>({...base(),recordKey:null})],
 ['Other family',()=>({...base(),familyId:'other'})],
 ['Other route',()=>({...base(),routeKey:AZ_SEALING_ROUTES[dismissed]})],
 ['Missing charging record',()=>({...base(),chargingHistory:null})],
 ['Incomplete charging record',()=>{const x=base();x.chargingHistory.complete=false;return x;}],
 ['Inconsistent charging record',()=>{const x=base();x.chargingHistory.consistent=false;return x;}],
 ['Missing charging reference',()=>{const x=base();x.chargingHistory.recordReference='';return x;}],
 ['Charging record for different arrest',()=>{const x=base();x.chargingHistory.recordKey='other';return x;}],
 ['Unknown charges status',()=>{const x=base();x.chargingHistory.chargesFiled=null;return x;}],
 ['String false is not false',()=>{const x=base();x.chargingHistory.chargesFiled='false';return x;}],
 ['Contradictory no-charge history',()=>{const x=base();x.chargingHistory.instruments=filed().chargingHistory.instruments;return x;}],
 ['Filed charge on no-charge route',()=>{const x=base();x.chargingHistory=filed().chargingHistory;return x;}],
 ['Appearance not established',()=>({...base(),initialAppearance:null})],
 ['Appearance from different arrest',()=>{const x=base();x.initialAppearance.recordKey='other';return x;}],
 ['Unknown initial appearance',()=>{const x=base();x.initialAppearance.occurred=null;return x;}],
 ['Appearance court missing',()=>{const x=base();x.initialAppearance.court=null;return x;}],
 ['Appearance court outside AZ',()=>{const x=structuredClone(base());x.initialAppearance.court.jurisdiction='NM';return x;}],
 ['Appearance case missing',()=>{const x=base();x.initialAppearance.caseNumber='unknown';return x;}],
 ['No appearance conflicts with court data',()=>{const x=none();x.initialAppearance.court=justice;return x;}],
 ['Arrest county missing',()=>{const x=none();x.arrestRecord.countyOfArrest='';return x;}],
 ['Arrest county from another record',()=>{const x=none();x.arrestRecord.recordKey='other';return x;}],
 ['No directory evidence',()=>({...none(),superiorCourtDirectoryEntry:null})],
 ['Wrong county directory',()=>{const x=structuredClone(none());x.superiorCourtDirectoryEntry.court.county='Maricopa';return x;}],
 ['Wrong court level',()=>{const x=none();x.superiorCourtDirectoryEntry.court=justice;return x;}],
 ['Filed-route mismatch',()=>{const x=filed();x.chargingHistory=base().chargingHistory;return x;}],
 ['No filed instruments',()=>{const x=filed();x.chargingHistory.instruments=[];return x;}],
 ['Later information search not complete',()=>{const x=filed();delete x.chargingHistory.laterInformationSearchComplete;return x;}],
 ['Unrecognized instrument',()=>{const x=filed();x.chargingHistory.instruments[0].type='email';return x;}],
 ['Missing instrument case',()=>{const x=filed();x.chargingHistory.instruments[0].caseNumber='';return x;}],
 ['Different instrument record',()=>{const x=filed();x.chargingHistory.instruments[0].recordKey='other';return x;}],
 ['Unordered history',()=>{const x=transferred();x.chargingHistory.instruments.reverse();return x;}],
 ['Duplicate instrument',()=>{const x=transferred();x.chargingHistory.instruments[1].id='doc-1';return x;}],
 ['Unlinked information',()=>{const x=transferred();delete x.chargingHistory.instruments[1].followsInstrumentId;return x;}],
 ['Information not in superior court',()=>{const x=transferred();x.chargingHistory.instruments[1].court=justice;return x;}],
 ['Multiple later informations',()=>{const x=transferred();x.chargingHistory.instruments.push({...x.chargingHistory.instruments[1],id:'doc-3',sequence:3});return x;}],
 ['Mixed post-transfer destination',()=>{const x=transferred();x.chargingHistory.instruments.push({...x.chargingHistory.instruments[0],id:'doc-3',sequence:3});return x;}],
 ['Multiple unrelated filed courts',()=>{const x=filed();x.chargingHistory.instruments.push({...x.chargingHistory.instruments[0],id:'doc-2',sequence:2,court:superior});return x;}]
];
for(const [name,make] of cases){const x=make(),before=JSON.stringify(x),r=resolve(x);assert.equal(r.status,'STOPPED',name);assert.equal(r.court,null,name);nonGrants(r);assert.equal(JSON.stringify(x),before);negatives++;results.push({name,result:'STOPPED',code:r.code});}
const observed=new Set(results.filter(r=>r.result==='PASS').map(r=>r.name));assert.equal(observed.size,positives);
for(const family of [uncharged,dismissed]){const t=registry.tracks.find(t=>t.trackId===family.replace(/-set$/,''));assert.equal(t.recordDrivenFilingCourtSelection.status,'MAPPED');for(const rule of t.recordDrivenFilingCourtSelection.rules)assert.ok(['SELECT_INITIAL_APPEARANCE_COURT','SELECT_SUPERIOR_COURT_IN_COUNTY_OF_ARREST','STOP_TRACK_MISMATCH','SELECT_SUPERIOR_COURT_NAMED_BY_INFORMATION','SELECT_COURT_WHERE_CHARGING_INSTRUMENT_WAS_FILED'].includes(rule.result));}
for(const familyId of [uncharged,dismissed]) {
 const binding=arizonaFilingCourtBinding({familyId,routeKeys:[AZ_SEALING_ROUTES[familyId]]});
 assert.equal(binding.export,'resolveArizonaSealingFilingCourt');assert.equal(binding.status,'IMPLEMENTED_NOT_INSTALLED');nonGrants(binding);
 positives++;results.push({name:`${familyId} exact executable metadata binding`,result:'PASS'});
}
assert.equal(arizonaFilingCourtBinding({familyId:'unrelated',routeKeys:[]}),null);
assert.throws(()=>arizonaFilingCourtBinding({familyId:uncharged,routeKeys:[AZ_SEALING_ROUTES[uncharged],'another']}));
negatives++;results.push({name:'Metadata cannot broaden route scope',result:'STOPPED'});
console.log(JSON.stringify({positiveCases:positives,rejectedCases:negatives,exactFamilies:[uncharged,dismissed],existingRegistryRulesChecked:true,packetRebuilds:0,installedInRuntime:false,productionTouched:false,terminalPromotions:0,results},null,2));
