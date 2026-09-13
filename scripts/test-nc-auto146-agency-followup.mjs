import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FAMILY,ROUTE,SOURCE,OUTPUT,FIXTURES,planFixture,classifySourceField,parseArgs,requireReadyPreflight,validateBuildInputs} from './build-census-v1-nc_auto_146_a4_agency_followup-set.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const inputs={route:read('data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json').routes.find(r=>r.routeKey===ROUTE),
 worklist:read('data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json').packetFamilies.find(r=>r.worklistGroupId===FAMILY),
 manifest:read('data/record-clearing/legal-design-packet-set-manifests.json').packetSets.find(r=>r.packetSetId===FAMILY),
 sourceBytes:fs.readFileSync(path.join(root,SOURCE)),prior:read('data/rcap-grade-a/packet-factory-24h/pf05/rows-pf05-nc-auto146-agency-followup-20260913.json')};
test('exact current route, source, four-component set and retained PF05 scope agree',()=>assert.equal(validateBuildInputs(inputs),true));
test('conditional certificate distinguishes ordinary letter from requested proof branch',()=>{
 const a=planFixture(FIXTURES[0]),b=planFixture(FIXTURES[1]);assert.equal(a.componentIds.length,3);assert.equal(b.componentIds.length,4);
 assert.deepEqual(a.applicationWrites,{});assert.equal(b.applicationWrites.ApplicantName,FIXTURES[1].name);
 assert(!Object.keys(b.applicationWrites).some(k=>/SignedDate|SignedName[23]|Date[2345]?|Search|Notary|SSN|License|Race|Sex/.test(k)));
});
for(const [name,mutate] of [
 ['missing identity',f=>delete f.name],['unknown holder',f=>delete f.holderAddress],['unconfirmed records',f=>f.supportingRecordsChecked=false],
 ['not still reported',f=>f.recordStillReported=false],['other disposition',f=>f.disposition='convicted'],
 ['window not elapsed',f=>f.dispositionDate='2026-09-12'],['invalid date',f=>f.dispositionDate='not-a-date'],
 ['impossible calendar date',f=>f.dispositionDate='2024-02-30'],['unknown certificate need',f=>delete f.certificateRequired],['real-person fulfillment',f=>f.syntheticFixture=false]
])test(`refuses ${name}`,()=>{const f=structuredClone(FIXTURES[1]);mutate(f);assert.throws(()=>planFixture(f));});
for(const [name,mutate] of [
 ['wrong route',x=>x.route.routeKey='other'],['new legal question',x=>x.route.requiresLegalReview=true],
 ['missing component',x=>x.manifest.components.pop()],['unconditional certificate',x=>x.manifest.components[2].requirement='required'],
 ['source substitution',x=>x.sourceBytes=Buffer.from('other source')],['other claim scope',x=>x.prior.assignmentId='PF01']
])test(`input guard refuses ${name}`,()=>{const x=structuredClone(inputs);x.sourceBytes=Buffer.from(x.sourceBytes);mutate(x);assert.throws(()=>validateBuildInputs(x));});
test('source-only PASS cannot bypass aggregate required preflight',()=>{
 assert.throws(()=>requireReadyPreflight(()=>({status:1,family:FAMILY,detail:'family sources pass; global required checks fail'})),/NOT_READY/);
 assert.throws(()=>requireReadyPreflight(()=>({status:0,family:'another-family'})),/exact family/);
 assert.equal(requireReadyPreflight(()=>({status:0,family:FAMILY})).status,0);
});
test('source oath, alternative branches, certificate and sensitive identifiers remain distinct',()=>{
 const writes=planFixture(FIXTURES[1]).applicationWrites;
 for(const field of ['SignedDate','AuthorizedName','Notary','Date3','Search','CertificateReport','FurtherCertify'])assert.equal(classifySourceField(field,writes),'PROTECTED_OATH_SIGNATURE_OR_OFFICIAL_FIELD');
 for(const field of ['SSN','DLicenseNo','FormerSSN'])assert.equal(classifySourceField(field,writes),'REQUIRED_BEFORE_FILING');
 assert.equal(classifySourceField('AtEmailAddressAbove2CkBox',writes),'UNUSED_ALTERNATIVE_APPLICATION');
 assert.equal(classifySourceField('AtEmailAddressAboveCkBox',writes),'PARTICIPANT_COMPLETES_SELECTED_APPLICATION');
});
test('CLI has no skip-preflight or arbitrary output escape',()=>{
 assert.throws(()=>parseArgs(['--skip-preflight']));assert.throws(()=>parseArgs(['--output','/tmp/escape']));
 assert.throws(()=>parseArgs([]));assert.equal(parseArgs(['--minimum-captain-sha','a'.repeat(40),'--no-raster']).preflightOnly,false);
});

// Regression: the printed name is a known fact, not the protected signature.
test('selected application printed applicant name repeats the known name',()=>{assert.equal(planFixture(FIXTURES[1]).applicationWrites.SignedName,FIXTURES[1].name);});
