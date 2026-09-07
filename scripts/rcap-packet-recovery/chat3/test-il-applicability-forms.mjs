#!/usr/bin/env node
/** Real held-form rendering. NOT a complete IL packet: two required source orders remain unavailable. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {buildPacket,fillDocument,resolveSources,FIXTURES} from "../../build-census-v1-il-seal-edu-set.mjs";
import {validateSealingRecord} from "./il-input-contract.mjs";
import {EDUCATION_FIELD,EDUCATION_COMPLETION,WAIVER_COMPLETION,fieldCompletionPolicy,
  assertFullComponentSet,expectedComponents} from "./il-field-applicability.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const out=process.env.IL_REPAIR_FORM_TEST_OUT;
assert.ok(out,"Set IL_REPAIR_FORM_TEST_OUT to a non-authoritative test-artifact directory.");
fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const yes=[],no=[],forms=[];
const pass=(name,fn)=>{fn();yes.push(name);};
const reject=(name,fn)=>{assert.throws(fn,{name:"AssertionError"});no.push(name);};
const sources=resolveSources(),sourceHashes=sources.map(s=>sha(s.bytes));
for(const email of [undefined,null,""," "]) pass(`optional-email:${String(email)}`,()=>validateSealingRecord({...FIXTURES.canonical,email}));
for(const outcome of ["unknown","Dismissed","Acquitted or dismissed as certified","",null])
  reject(`outcome:${String(outcome)}`,()=>validateSealingRecord({...FIXTURES.canonical,outcome}));
for(const charge of ["","unknown","Enter the actual charge","Charge exactly as shown on the court disposition",FIXTURES.canonical.caseNumber])
  reject(`bad-charge:${charge}`,()=>validateSealingRecord({...FIXTURES.canonical,charge}));
for(const flag of ["yes",1,{},null])
  reject(`waiver-request:${JSON.stringify(flag)}`,()=>validateSealingRecord({...FIXTURES.canonical,waiverRequested:flag}));
for(const status of ["SNAP",true,{},false])
  reject(`unconfirmed-benefit-state:${JSON.stringify(status)}`,()=>validateSealingRecord({...FIXTURES.canonical,feeBenefitStatus:status}));
pass("component-no-waiver",()=>assertFullComponentSet(expectedComponents({waiverRequested:false}).map(documentId=>({documentId})),{waiverRequested:false}));
pass("component-requested-waiver",()=>assertFullComponentSet(expectedComponents({waiverRequested:true}).map(documentId=>({documentId})),{waiverRequested:true}));
reject("missing-Denying-Order",()=>assertFullComponentSet(sources,FIXTURES.canonical));
for(const missing of ["EXP-AD Order Denying","FW-CIV-ORDER"])
  reject(`missing:${missing}`,()=>assertFullComponentSet(expectedComponents({waiverRequested:true}).filter(x=>x!==missing).map(documentId=>({documentId})),{waiverRequested:true}));
reject("unrequested-waiver",()=>assertFullComponentSet(expectedComponents({waiverRequested:true}).map(documentId=>({documentId})),{waiverRequested:false}));
reject("wrong-order",()=>assertFullComponentSet(expectedComponents({waiverRequested:true}).reverse().map(documentId=>({documentId})),{waiverRequested:true}));
pass("sponsorship-is-not-waiver",()=>assert.deepEqual(expectedComponents({sponsored:true,email:null}),expectedComponents({waiverRequested:false})));
for(const [base,existing] of Object.entries(FIXTURES)) {
  // Clearly synthetic felony-conviction field-fill scenario. Even these values
  // are NOT a permission to assert the attached-proof clause of item22.
  const facts={...existing,email:base==="boundary"?null:existing.email,
    syntheticEducationScenario:{lastSentenceCompleted:true,credential:"career certificate",
      duringLastSentence:true,felonySentenceType:"prison",firstCompletionOfSameGoal:true}};
  pass(`manual-compound-attestation:${base}`,()=>{
    const r=fieldCompletionPolicy("EXP-AD Request",EDUCATION_FIELD,facts);
    assert.equal(r.noAutomaticAttestation,true);assert.equal(r.routeDetermined,false);
    assert.equal(r.requiredBeforeFiling,true);
  });
  for(const id of ["EXP-AD Request","EXP-AD Order Granting","FW-CIV-APPLICATION"]) {
    const source=sources.find(s=>s.documentId===id);
    for(const status of id==="FW-CIV-APPLICATION"?[null,"qualifying","none"]:[null]) {
      const use={...facts,feeBenefitStatus:status};
      const name=`${base}-${id.replaceAll(" ","_")}-${status??"unknown"}`;
      const a=await fillDocument(source,name,use);
      const b=await fillDocument(source,name,use);
      const save=async x=>Buffer.from(await x.document.save({useObjectStreams:false,addDefaultPage:false,objectsPerTick:Infinity}));
      const x=await save(a),y=await save(b);
      assert.equal(sha(x),sha(y),"Two complete FORM renders differ; not a packet determinism claim");
      fs.writeFileSync(path.join(out,name+".pdf"),x);
      assert.ok(!a.writes.some(w=>w.fieldName===EDUCATION_FIELD));
      if(id==="EXP-AD Request"){
        assert.equal(a.writes.find(w=>w.fieldName==="Page 1 - Request to Expunge Records").drawnText,"No");
        assert.equal(a.writes.find(w=>w.fieldName==="12 - Seal Records").drawnText,"Yes");
        assert.equal(a.writes.find(w=>w.fieldName==="4 - Outcome - 1").drawnText,"FC");
        assert.ok(a.writes.some(w=>w.drawnText===facts.charge));
      }
      const emails=a.writes.filter(w=>/email/i.test(w.fieldName));
      assert.equal(emails.length,base==="boundary"?0:1);
      if(base==="boundary")assert.ok(a.refusals.some(r=>/email/i.test(r.fieldName)&&r.requiredBeforeFiling===false));
      if(id==="FW-CIV-APPLICATION"){
        const hardship=a.refusals.find(r=>r.fieldName==="107-110 - Hardship");
        assert.equal(hardship.requiredBeforeFiling,false);
        const financial=a.refusals.find(r=>r.fieldName==="19 - My Employment Total");
        assert.equal(financial.requiredBeforeFiling,status==="qualifying"?false:true);
        assert.ok(status==="qualifying"?financial.routeConditionThatMakesItInapplicable:financial.requiredWhen);
        assert.ok(!a.writes.some(w=>/SSI|AABD|SNAP|TANF|Checkboxes/i.test(w.fieldName)));
      }
      forms.push({file:name+".pdf",sourceId:id,fixture:base,status,sha256:sha(x),byteLength:x.length,
        pages:a.document.getPageCount(),writes:a.writes,refusals:a.refusals});
      yes.push(`actual-form-render:${name}`);
    }
  }
  await assert.rejects(buildPacket(sources,base,facts),/MISSING_REQUIRED_COMPONENT/);
  no.push(`actual-packet-refuses-missing-orders:${base}`);
  await assert.rejects(fillDocument(sources[0],"unknown-outcome",{...facts,outcome:"unknown"}),/WRONG_EDUCATION_ROUTE_OUTCOME/);
  no.push(`actual-form-rejects-unknown-outcome:${base}`);
}
pass("hardship-is-optional",()=>assert.equal(fieldCompletionPolicy("FW-CIV-APPLICATION","107-110 - Hardship",{feeBenefitStatus:"none"}).requiredBeforeFiling,false));
pass("known-hardship-not-discarded",()=>assert.equal(fieldCompletionPolicy("FW-CIV-APPLICATION","107-110 - Hardship",{feeBenefitStatus:"none",hardship:"Actual supplied narrative"}),null));
pass("unknown-benefit-not-auto-skipped",()=>assert.equal(fieldCompletionPolicy("FW-CIV-APPLICATION","19 - My Employment Total",{sponsored:true}).requiredBeforeFiling,true));
assert.deepEqual(sources.map(s=>sha(s.bytes)),sourceHashes);
const snapshot=()=>Object.fromEntries(fs.readdirSync(path.join(root,"data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures")).map(n=>[n,sha(fs.readFileSync(path.join(root,"data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures",n)))]));
const before=snapshot();
const cli=spawnSync(process.execPath,["scripts/build-census-v1-il-seal-edu-set.mjs"],{cwd:root,encoding:"utf8"});
assert.equal(cli.status,1);assert.match(cli.stderr,/MISSING_REQUIRED_COMPONENT/);
assert.deepEqual(snapshot(),before);
const result={scope:"Source-gated IL fact/applicability repair. Complete held-form renders only; NOT complete packet builds.",
  positiveCount:yes.length,negativeCount:no.length,positive:yes,negative:no,forms,
  blockedFullBuilder:{command:"node scripts/build-census-v1-il-seal-edu-set.mjs",exitCode:cli.status,expected:"MISSING_REQUIRED_COMPONENT",oldPacketBytesPreserved:true},
  sourceHashes,sourceBytesUnchanged:true,completePacketBuilds:0,independentApproval:false};
fs.writeFileSync(path.join(out,"form-tests.json"),JSON.stringify(result,null,2)+"\n");
fs.writeFileSync(path.join(out,"instruction-preview.md"),`# Source-gated instruction preview\n\n${EDUCATION_COMPLETION}\n\n${WAIVER_COMPLETION}\n\nEmail is optional when you do not have one. No contact value is invented.\n`);
console.log(JSON.stringify({positive:yes.length,negative:no.length,completeHeldFormRenders:forms.length,formPageInstances:forms.reduce((n,x)=>n+x.pages,0),fullPacketBuilds:0,oldPacketBytesPreserved:true},null,2));
