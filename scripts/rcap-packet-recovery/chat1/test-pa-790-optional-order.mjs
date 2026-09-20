#!/usr/bin/env node
// Scope: optional-order filing and court/participant task ownership, not full packet approval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/record-clearing/legal-design-track-registry.json'),'utf8'));
const track=registry.tracks.find(t=>t.trackId==='pa_790_nonconviction');
function validate(t) {
 assert.equal(t.trackId,'pa_790_nonconviction');
 const action=t.packetSet.participantActionRequired.filter(a=>a.kind==='file');assert.equal(action.length,1);
 assert.equal(action[0].description,t.rules.filing,'All participant filing projections must agree');
 assert.match(t.rules.filing,/proposed expungement order is optional, not a filing prerequisite/);
 assert.match(t.rules.filing,/include it only when selected/);
 assert.match(t.rules.filing,/judicial findings and execution fields left blank/);
 assert.match(t.rules.filing,/judicial district in which the charges were disposed/);
 const order=t.packetSet.components.filter(c=>c.officialFormId==='PA-RCRIM-P-790-ORDER');assert.equal(order.length,1);
 assert.equal(order[0].requirement,'conditional');assert.match(t.rules.proposedOrder,/optional, not a filing prerequisite/);
 const petition=t.packetSet.components.find(c=>c.officialFormId==='PA-RCRIM-P-790-PETITION');assert.equal(petition.requirement,'required');
 const waiver=t.packetSet.components.find(c=>c.officialFormId==='PA-IFP-CCP');assert.equal(waiver.requirement,'conditional');
 assert.ok(!t.packetSet.participantActionRequired.some(a=>a.kind==='complete_field'&&/^Judge name and order date/.test(a.description)), 'Court-only actions are not participant completion requirements');
 assert.ok(!t.packetSet.requiredBeforeFiling.some(a=>/^Judge name and order date/.test(a)), 'Court cannot be required to execute an order before filing');
 const agency=t.packetSet.participantActionRequired.find(a=>a.description.startsWith('When including the optional proposed order, identify'));
 assert.equal(agency?.requirement,'conditional');assert.match(agency.conditionDescription,/Only when the participant includes/);
 assert.ok(t.manualCompletionItems.some(i=>i.item.startsWith('Leave the judge name')&&/court alone completes/.test(i.why)));
}

validate(track);
const cases=[
 ['Mandatory order restored',t=>{t.rules.filing=t.rules.filing.replace('is optional, not a filing prerequisite','is mandatory');t.packetSet.participantActionRequired.find(a=>a.kind==='file').description=t.rules.filing;}],
 ['Stale action projection',t=>{t.packetSet.participantActionRequired.find(a=>a.kind==='file').description='File the order';}],
 ['Order becomes required component',t=>{t.packetSet.components.find(c=>c.officialFormId==='PA-RCRIM-P-790-ORDER').requirement='required';}],
 ['Selection language deleted',t=>{t.rules.filing=t.rules.filing.replace('include it only when selected','include it always');t.packetSet.participantActionRequired.find(a=>a.kind==='file').description=t.rules.filing;}],
 ['Judicial blank protection deleted',t=>{t.rules.filing=t.rules.filing.replace('judicial findings and execution fields left blank','fill every field');t.packetSet.participantActionRequired.find(a=>a.kind==='file').description=t.rules.filing;}],
 ['Wrong filing destination',t=>{t.rules.filing=t.rules.filing.replace('judicial district in which the charges were disposed','county of residence');t.packetSet.participantActionRequired.find(a=>a.kind==='file').description=t.rules.filing;}],
 ['IFP made unconditional',t=>{t.packetSet.components.find(c=>c.officialFormId==='PA-IFP-CCP').requirement='required';}],
 ['Judge pre-filing task restored',t=>{t.packetSet.participantActionRequired.push({kind:'complete_field',description:'Judge name and order date',requiredBeforeFiling:true});}],
 ['Judge pre-filing list restored',t=>{t.packetSet.requiredBeforeFiling.push('Judge name and order date');}],
 ['Optional order recipients required unconditionally',t=>{t.packetSet.participantActionRequired.find(a=>a.description.startsWith('When including the optional proposed order, identify')).requirement='required';}],
 ['Required petition omitted',t=>{t.packetSet.components.find(c=>c.officialFormId==='PA-RCRIM-P-790-PETITION').requirement='conditional';}]
];
for(const [name,mutate] of cases){const candidate=structuredClone(track);mutate(candidate);assert.throws(()=>validate(candidate),{name:'AssertionError'},name);}
// Report an independently observable remaining issue rather than mislabeling
// this two-sentence correction as a complete registry or packet repair.
const remaining=track.packetSet.participantActionRequired.filter(a=>a.kind==='complete_field'&&/Judge name and order date/.test(a.description)&&a.requiredBeforeFiling===true).map(a=>({issue:'Court-only completion still appears as a participant pre-filing task',description:a.description}));
console.log(JSON.stringify({positiveCases:1,rejectedCases:cases.length,scope:'Optional-order filing instructions and court/participant task ownership',remainingIssues:remaining,wholeRegistryPass:false,packetRebuilds:0,terminalPromotions:0,productionTouched:false},null,2));
