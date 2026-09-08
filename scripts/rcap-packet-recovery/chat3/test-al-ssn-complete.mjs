#!/usr/bin/env node
/** Real complete-renderer regressions for CR-65 Text2, not a metric test double. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {ssnLastFour, SSN_LAST_FOUR_FACT} from "./al-ssn-last-four.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const positive=[], negative=[];
for (const facts of [{}, {ssnLast4:null},{ssnLast4:""}, {caseNumber:"CC-2099-765432.10"}, {ssn:"123-45-6789"}, {ssn_last_four:"6789"}, {otherId:"1234"}]) {
  assert.equal(ssnLastFour(facts),null);
  positive.push({scope:"input-contract",case:"absent dedicated fact stays missing"});
}
for (const value of ["0428","0073","0000","9999"]) {
  assert.equal(ssnLastFour({ssnLast4:value}),value);
  positive.push({scope:"input-contract",case:"four-digit string preserves leading zeros"});
}
const invalid=["CC-2021-004217","004217","428",428,0," 0428","0428 ","12-34","123-45-6789","123456789","unknown","１２３４",true,{},["0428"]];
for (const value of invalid) {
  assert.throws(()=>ssnLastFour({ssnLast4:value}),/INVALID_SSN_LAST_FOUR/);
  negative.push({scope:"input-contract",case:"non-four-digit value rejected",type:typeof value});
}
for (const family of ["al-felony-dwop-set","al-felony-nonconviction-90-set"]) {
  const host=await import(`../../build-census-v1-${family}.mjs`);
  const sources=host.resolveSources(), original=sources.map(s=>sha(s.bytes));
  const out=path.join(ROOT,`data/rcap-all50/overlays/census-v1/al/${family}--official-pdf-fill`);
  const config={familyId:family,...host.FAMILY_CONFIG[family]};
  const maps=JSON.parse(fs.readFileSync(path.join(out,"production-field-map.json")));
  const inventory=JSON.parse(fs.readFileSync(path.join(out,"reports/rendered-artifacts.json"))).packets;
  const instructions=fs.readFileSync(path.join(out,"participant-instructions.md"),"utf8");
  assert.equal(inventory.length,4);
  assert.match(instructions,/If it is blank, supply those four digits before filing/);
  assert.match(instructions,/Never enter the case number, a full SSN, or another identifier/);
  for(const [base,facts] of Object.entries(host.FIXTURES)) {
    for(const missing of [false,true]) {
      const fixture=base+(missing?"-ssn-missing":"");
      const supplied={...facts,...(missing?{ssnLast4:null}:{})};
      const p=await host.buildPacket(sources,fixture,supplied,config);
      assert.equal(sha(p.bytes),sha(fs.readFileSync(path.join(out,"fixtures",fixture+".pdf"))));
      assert.equal(p.pageCount,11);
      assert.deepEqual(p.pageManifest.map(x=>`${x.documentId}:${x.sourcePage}`),[
        ...Array.from({length:8},(_,i)=>`CR-65:${i+1}`),
        ...Array.from({length:3},(_,i)=>`C-10-CRIMINAL:${i+1}`)]);
      const writes=p.writes.filter(w=>w.fieldId==="CR-65:Text2");
      const refusals=p.refusals.filter(w=>w.fieldId==="CR-65:Text2");
      assert.equal(writes.length,missing?0:1);
      if(missing) {
        assert.equal(refusals.length,1);
        assert.equal(refusals[0].factId,SSN_LAST_FOUR_FACT);
        assert.equal(refusals[0].factAvailable,false);
        assert.equal(refusals[0].requiredBeforeFiling,true);
      } else {
        assert.equal(refusals.length,0);
        assert.equal(writes[0].drawnText,facts.ssnLast4);
        assert.equal(writes[0].factId,SSN_LAST_FOUR_FACT);
        assert.notEqual(writes[0].drawnText,facts.caseNumber);
        assert.match(writes[0].effectiveLabel,/last four digits only/);
      }
      const caseRow=p.writes.find(w=>w.fieldId==="CR-65:Text3");
      assert.equal(caseRow?.drawnText,facts.caseNumber);
      const record=inventory.find(x=>x.fixture===fixture);
      assert.equal(record.sha256,sha(p.bytes));
      assert.equal(maps.fixtureMaps[fixture].writes.some(x=>x.fieldId==="CR-65:Text2"),!missing);
      positive.push({family,fixture,sha256:sha(p.bytes),pages:p.pageCount,ssnState:missing?"missing":"separately-held"});
    }
    const other=await host.buildPacket(sources,"distinct-identifiers",{...facts,caseNumber:"CC-2099-765432.10",ssnLast4:"0091"},config);
    assert.equal(other.writes.find(w=>w.fieldId==="CR-65:Text2").drawnText,"0091");
    assert.equal(other.writes.find(w=>w.fieldId==="CR-65:Text3").drawnText,"CC-2099-765432.10");
    positive.push({family,fixture:base,case:"changing case ID cannot change SSN",pages:other.pageCount});
    const notHeld={...facts,caseNumber:"0042",socialSecurityNumber:"123-45-0091"};
    delete notHeld.ssnLast4;
    const absent=await host.buildPacket(sources,"no-dedicated-fact",notHeld,config);
    assert.ok(!absent.writes.some(w=>w.fieldId==="CR-65:Text2"));
    negative.push({family,fixture:base,case:"no fallback from four-digit case or full SSN",rejected:true});
    for(const value of [facts.caseNumber, "123456789", 428, " 0428"]) {
      await assert.rejects(host.buildPacket(sources,"invalid-last-four",{...facts,ssnLast4:value},config),/INVALID_SSN_LAST_FOUR/);
      negative.push({family,fixture:base,case:"actual renderer rejects invalid SSN fact",type:typeof value});
    }
  }
  assert.deepEqual(sources.map(s=>sha(s.bytes)),original);
  host.assertRepairInvariants(out);
}
console.log(JSON.stringify({suite:"al-ssn-complete-renderer",positive,negative,
  positiveCount:positive.length,negativeCount:negative.length,
  sourceBytesUnchanged:true,independentApproval:false},null,2));
