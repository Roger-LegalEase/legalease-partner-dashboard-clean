#!/usr/bin/env node
// Read-only direct probes of the exact candidate helper. No packet host imports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [helperPath,outPath]=process.argv.slice(2);
assert.ok(helperPath && outPath,'Usage: node al-ssn-helper-probes.mjs helper.mjs result.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(helperPath);
const {ssnLastFour}=await import(pathToFileURL(helperPath));
const checks=[];
for(const [name,facts,value] of [
 ['no_fact',{},null],['explicit_null',{ssnLast4:null},null],['empty_string',{ssnLast4:''},null],
 ['case_looks_like_digits',{caseNumber:'0042'},null],['full_ssn_not_dedicated',{socialSecurityNumber:'123-45-0091'},null],
 ['snake_case_not_bound',{ssn_last_four:'0091'},null],
 ['separate_case_and_last4',{caseNumber:'CC-2099-765432.10',ssnLast4:'0091'},'0091'],
 ['different_case_same_last4',{caseNumber:'CC-2021-004217',ssnLast4:'0091'},'0091'],
 ['same_case_different_last4',{caseNumber:'CC-2099-765432.10',ssnLast4:'0428'},'0428'],
 ['canonical_leading_zero',{ssnLast4:'0428'},'0428'],['boundary_leading_zeros',{ssnLast4:'0073'},'0073'],
 ['all_zero_is_format_valid_not_identity_proof',{ssnLast4:'0000'},'0000']]) {
 const actual=ssnLastFour(facts);assert.equal(actual,value);checks.push({case:name,actual,expected:value,passed:true});
}
for(const value of ['CC-2021-004217','123456789','123-45-6789','428',428,' 0428','0428 ','１２３４','unknown',true,{},['0428']]) {
 assert.throws(()=>ssnLastFour({ssnLast4:value}),/INVALID_SSN_LAST_FOUR/);
 checks.push({case:'invalid_dedicated_value',value,type:typeof value,rejected:true,passed:true});
}
assert.equal(hash(original),hash(fs.readFileSync(helperPath)));
const result={schemaVersion:'chatb-al-ssn-helper-probes/v1',helperSha256Measured:hash(original),nodeVersion:process.version,
 scope:'Direct helper behavior only, not full rendering, form cross-binding, legal eligibility or production authority.',
 tests:checks,summary:{cases:checks.length,acceptedOrMissingCases:12,rejectedInvalidCases:12,sourceUnchanged:true,packetBuilderExecutions:0}};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));
