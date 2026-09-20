import assert from 'node:assert/strict';
import {fixtures,validateInput,TABLE} from './build-census-v1-ca-diversion-seal-set.mjs';
const f=fixtures().canonical;let checks=0;
function pass(x){assert.doesNotThrow(()=>validateInput(x));checks++;}
function refuse(k,v){const x=structuredClone(f);x[k]=v;assert.throws(()=>validateInput(x),k);checks++;}
pass(f);pass(fixtures().boundary);
for(const k of ['successfulCompletion','completionProofAvailable','dismissed','recordsVerified'])refuse(k,false);
for(const k of ['oppositionKnown','contestedHearing','disputedCompletion'])refuse(k,true);
refuse('county','Kern');refuse('program','OTHER');refuse('dismissalDate','unknown');refuse('specificCourtAdditionalRequest',{kind:'proposed order'});refuse('appearanceWaiver',true);
pass({...f,appearanceWaiver:true,appearanceWaiverExplicitConsent:true});
pass({...f,courtDecision:'GRANTED',issuedOrder:null});
refuse('issuedOrder',{actualCourtIssued:true,documentPath:'invented.pdf',sha256:'x'});
assert.equal(validateInput(f).orderRequiredForInitialRender,false);checks++;
assert.equal(validateInput({...f,courtDecision:'GRANTED'}).sealedEstablished,false);checks++;
const ready={...f,synthetic:false,participantSigned:true,actualServiceComplete:true,allPartiesNoticeResolved:true};assert.doesNotThrow(()=>validateInput(ready,{filing:true}));checks++;
for(const k of ['participantSigned','actualServiceComplete','allPartiesNoticeResolved']){assert.throws(()=>validateInput({...ready,[k]:false},{filing:true}));checks++;}
for(const k of ['hearing','lawEnforcement']){assert.throws(()=>validateInput({...ready,[`${k}NoticeRequired`]:true},{filing:true}));checks++;}
assert.throws(()=>validateInput({...ready,synthetic:true},{filing:true}));checks++;
for(const program of ['PC1000.5','PC1000.8'])pass({...f,program});
for(const key of ['hearingNoticeRequired','lawEnforcementNoticeRequired'])refuse(key,undefined);
const badDate=structuredClone(f);badDate.arrests[0].date='unknown';assert.throws(()=>validateInput(badDate));checks++;
assert.equal(TABLE.rowTops.length,3);assert(TABLE.rowTops.every((v,i)=>TABLE.rowBottoms[i]-v>19));checks++;
console.log(JSON.stringify({status:'PASS',checks}));
