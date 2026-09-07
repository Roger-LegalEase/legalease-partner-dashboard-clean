#!/usr/bin/env node
/** Exercises the actual complete packet renderer, every new fixture and controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath}from'node:url';
import {packetVariants,validateAlCompletion,assignedPetitionNumber,isPetitionHeader,isLastFour,completenessFromLedger,normalizeCr65Appearance}from'./al-current-completion.mjs';
import {PDFDocument}from'pdf-lib';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const cases=[],controls=[];
const rebind=a=>{a.evidence.sha256=hash(a.evidence.content);return a;};
for(const family of ['al-felony-dwop-set','al-felony-nonconviction-90-set']){
  const h=await import(`../../build-census-v1-${family}.mjs`),sources=h.resolveSources(),pins=sources.map(s=>hash(s.bytes)),config={...h.FAMILY_CONFIG[family],familyId:family};
  const out=path.join(ROOT,`data/rcap-all50/overlays/census-v1/al/${family}--official-pdf-fill`);
  const variants=packetVariants(h.FIXTURES),inventory=JSON.parse(fs.readFileSync(path.join(out,'reports/rendered-artifacts.json'))).packets;
  const maps=JSON.parse(fs.readFileSync(path.join(out,'production-field-map.json'))),summaries=JSON.parse(fs.readFileSync(path.join(out,'reports/build-summary.json')));
  assert.equal(inventory.length,16);
  for(const[name,facts]of Object.entries(variants)){
    const p=await h.buildPacket(sources,name,facts,config),b=fs.readFileSync(path.join(out,'fixtures',name+'.pdf'));
    assert.equal(hash(p.bytes),hash(b),`${name}: actual render differs`);
    assert.equal(p.pageCount,facts.requestFeeWaiver?11:8);
    const expected=[...Array.from({length:8},(_,i)=>`CR-65:${i+1}`),...(facts.requestFeeWaiver?Array.from({length:3},(_,i)=>`C-10-CRIMINAL:${i+1}`):[])];
    assert.deepEqual(p.pageManifest.map(x=>`${x.documentId}:${x.sourcePage}`),expected);
    const ssn=p.writes.filter(w=>isLastFour(w.documentId,w.fieldName)),missing=p.refusals.filter(w=>isLastFour(w.documentId,w.fieldName));
    assert.equal(ssn.length,facts.ssnLast4?(facts.requestFeeWaiver?2:1):0);
    assert.equal(missing.length,facts.ssnLast4?0:(facts.requestFeeWaiver?2:1));
    for(const w of ssn){assert.equal(w.drawnText,facts.ssnLast4);assert.equal(w.factId,'participant.ssn_last_four');}
    for(const r of missing){assert.equal(r.factAvailable,false);assert.equal(r.requiredBeforeFiling,true);}
    const headers=p.writes.filter(w=>isPetitionHeader(w.documentId,w.fieldName));
    assert.equal(headers.length,facts.petitionAssignment?(facts.requestFeeWaiver?11:8):0);
    for(const w of headers){assert.equal(w.drawnText,facts.petitionAssignment.number);assert.equal(w.provenance.sha256,facts.petitionAssignment.evidence.sha256);assert.notEqual(w.drawnText,facts.caseNumber);}
    assert.equal(p.writes.find(w=>w.fieldId==='CR-65:Text3').drawnText,facts.caseNumber);
    const counts=completenessFromLedger(p);assert.deepEqual(summaries.fixtureCounters[name],counts);assert.ok(counts.requiredFactsNotCollected>0);assert.equal(counts.knownRequiredFieldsMissing,0);
    assert.deepEqual(maps.fixtureMaps[name].refusals,p.refusals);assert.equal(inventory.find(x=>x.fixture===name).sha256,hash(b));
    assert.equal(p.appearanceRepairs.length,1);assert.equal(p.appearanceRepairs[0].field,'Check Box10.2');assert.equal(p.appearanceRepairs[0].sourceAppearanceRewritten,false);
    for(const name of ['Check Box2.0','Check Box2.1','Check Box3.1.1'])assert.ok(!p.writes.some(w=>w.fieldId===`CR-65:${name}`),'prior history/pro-se auto-asserted');
    if(facts.requestFeeWaiver){
      const r=p.refusals.find(r=>r.fieldId==='C-10-CRIMINAL:MUNICIPALITY OF');assert.equal(r.completenessDisposition,'NOT_APPLICABLE_ON_THIS_ROUTE');assert.equal(r.requiredBeforeFiling,false);
      assert.ok(p.writes.some(w=>w.fieldId==='C-10-CRIMINAL:Check Box1.0'));
      assert.ok(!p.writes.some(w=>w.fieldId==='C-10-CRIMINAL:Check Box2.2'));
      assert.ok(p.refusals.find(w=>w.fieldId==='C-10-CRIMINAL:Check Box2.2').requiredBeforeFiling);
      for(const[fid,fact]of [['Spouses Full Name if married','spouseName'],['undefined_3','spouseMonthlyGross'],['If so describe','otherPropertyDescription'],['undefined_30','otherPropertyValue']]){
        const w=p.writes.find(w=>w.fieldId===`C-10-CRIMINAL:${fid}`);
        if(facts.finances?.[fact])assert.equal(w?.drawnText,facts.finances[fact]);
        else{assert.equal(w,undefined);const r=p.refusals.find(r=>r.fieldId===`C-10-CRIMINAL:${fid}`);assert.ok(r.requiredWhen,'missing explicit applicability');}
      }
      if(facts.finances?.married===false)assert.equal(p.refusals.find(r=>r.fieldName==='Spouses Full Name if married').requiredBeforeFiling,false);
      if(facts.finances?.maritalOffense===true)assert.equal(p.refusals.find(r=>r.documentId==='C-10-CRIMINAL'&&r.fieldName==='undefined_3').requiredBeforeFiling,false);
      if(facts.finances?.ownsOtherProperty===false)assert.equal(p.refusals.find(r=>r.fieldName==='If so describe').requiredBeforeFiling,false);
    }else{assert.ok(!p.writes.some(w=>w.documentId==='C-10-CRIMINAL'));assert.ok(!p.refusals.some(w=>w.documentId==='C-10-CRIMINAL'));}
    cases.push({family,fixture:name,pages:p.pageCount,sha256:hash(p.bytes),counters:counts});
  }
  // Actual renderer refuses unsupported or provenance-free data before writing output.
  const base=variants.canonical;
  const invalid=[
    ['case is not SSN',{...base,ssnLast4:base.caseNumber}],['full SSN',{...base,ssnLast4:'123-45-6789'}],['number loses zeros',{...base,ssnLast4:73}],['whitespace',{...base,ssnLast4:' 0073'}],
    ['bare assigned number',{...base,petitionAssignment:{number:'CV-2026-1234'}}],
    ['implicit waiver',{...base,requestFeeWaiver:undefined}],['sponsorship is not waiver',{...base,requestFeeWaiver:undefined,sponsored:true}],['municipal alternative',{...base,captionParty:'municipal'}],
    ['spouse without marriage',{...base,finances:{married:false,spouseName:'Invented'}}],['income without exception resolved',{...base,finances:{married:true,spouseMonthlyGross:'75.00'}}],
    ['income on marital offense',{...base,finances:{married:true,maritalOffense:true,spouseMonthlyGross:'75.00'}}],['property without yes',{...base,finances:{ownsOtherProperty:false,otherPropertyDescription:'Boat'}}],
    ['unknown property with value',{...base,finances:{otherPropertyValue:'25.00'}}],['negative spouse income',{...base,finances:{married:true,maritalOffense:false,spouseMonthlyGross:'-1'}}],['string boolean',{...base,finances:{married:'false'}}]
  ];
  const a=variants['canonical-assigned'].petitionAssignment;
  for(const [name,mutate]of [
    ['mismatched digest',x=>x.evidence.sha256='0'.repeat(64)],['number differs',x=>x.number='OTHER'],['missing verification',x=>x.evidence.status='unverified'],['missing verification reference',x=>x.evidence.verificationReference=''],
    ['wrong underlying',x=>{let r=JSON.parse(x.evidence.content);r.underlyingCaseNumber='OTHER';x.evidence.content=JSON.stringify(r);rebind(x);}],
    ['wrong county',x=>{let r=JSON.parse(x.evidence.content);r.county='OTHER';x.evidence.content=JSON.stringify(r);rebind(x);}],
    ['participant invented clerk action',x=>{let r=JSON.parse(x.evidence.content);r.issuingActor='participant';x.evidence.content=JSON.stringify(r);rebind(x);}],
    ['absent source reference',x=>{let r=JSON.parse(x.evidence.content);r.sourceReference='';x.evidence.content=JSON.stringify(r);rebind(x);}],
  ]){let changed=structuredClone(a);mutate(changed);invalid.push([name,{...base,petitionAssignment:changed}]);}
  invalid.push(['synthetic clerk record outside test',{...base,synthetic:false,petitionAssignment:structuredClone(a)}]);
  for(const[name,facts]of invalid){await assert.rejects(h.buildPacket(sources,'invalid',facts,config));controls.push({family,name,rejected:true});}
  for(const[name,s]of [['missing CR65',sources.slice(1)],['missing requested C10',sources.slice(0,1)],['duplicate source',[...sources,sources[0]]],['wrong order',[...sources].reverse()],['corrupt source',sources.map((s,i)=>i? s:{...s,bytes:Buffer.concat([s.bytes,Buffer.from('x')])})]]){
    await assert.rejects(h.buildPacket(s,'invalid',base,config));controls.push({family,name,rejected:true});
  }
  // Matching underlying/assigned values are legal only when the retained record agrees.
  const equal=structuredClone(a),record=JSON.parse(equal.evidence.content);record.petitionNumber=base.caseNumber;equal.number=base.caseNumber;equal.evidence.content=JSON.stringify(record);rebind(equal);
  const same=await h.buildPacket(sources,'actual-record-equal-numbers',{...base,petitionAssignment:equal},config);
  assert.equal(same.writes.find(w=>w.fieldId==='CR-65:Text1').drawnText,base.caseNumber);cases.push({family,case:'equal identifiers only with bound assignment evidence',pages:same.pageCount});
  // No case/full-SSN/alternate property fallback when the dedicated fact is absent.
  const missing=await h.buildPacket(sources,'no-fallback',{...base,ssnLast4:null,caseNumber:'0042',ssn:'123-45-0073'},config);
  assert.equal(missing.writes.filter(w=>isLastFour(w.documentId,w.fieldName)).length,0);cases.push({family,case:'no alternate ID fallback on either form',pages:missing.pageCount});
  assert.deepEqual(sources.map(s=>hash(s.bytes)),pins);
  h.assertRepairInvariants(out);
}
console.log(JSON.stringify({suite:'AL current four-finding complete-renderer regression',completeFixtures:32,positiveCount:cases.length,rejectionCount:controls.length,cases,controls,independentApproval:false},null,2));
