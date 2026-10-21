import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyBlank,BLANK_DISPOSITIONS} from '../../../../../scripts/rcap-packet-completeness/completeness-contract.mjs';
const directory='data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill';
const map=JSON.parse(fs.readFileSync(directory+'/production-field-map.json'));
const instructions=fs.readFileSync(directory+'/participant-instructions.md','utf8');
function verdict(row,completenessClass=row.completenessClass){
 return classifyBlank({label:row.effectiveLabel,isSelectionControl:row.isSelectionControl===true},row.reason,completenessClass,{
  disposition:row.completenessDisposition??null,
  ...(Object.hasOwn(row,'requiredBeforeFiling')?{requiredBeforeFiling:row.requiredBeforeFiling===true}:{}),
  routeDetermined:row.routeDetermined===true,factAvailable:row.factAvailable===true,
  routeConditionThatMakesItInapplicable:row.routeConditionThatMakesItInapplicable??null,
  determinedByTheCaseNotTheRoute:row.determinedByTheCaseNotTheRoute===true,
  whyTheRouteCannotDetermineIt:row.whyTheRouteCannotDetermineIt??null,
  factId:row.factId??null,identity:row.field
 });
}
const fixtures=[];
for(const fixture of ['canonical','boundary']){
 const counts={};let written=0,blanks=0;
 for(const document of map.maps){
  written+=document[fixture+'Writes'].length;
  for(const row of document[fixture+'Refusals']){
   assert.ok(Object.hasOwn(row,'completenessClass'),'The actual reader typed channel must exist.');
   const actual=verdict(row);assert.equal(BLANK_DISPOSITIONS[actual.disposition]?.allowed,true,document.documentId+' '+row.field+' '+actual.disposition);
   counts[actual.disposition]=(counts[actual.disposition]??0)+1;blanks++;
   if(actual.disposition==='REQUIRED_BEFORE_FILING')assert.ok(instructions.includes('`'+row.field+'`'),row.field+' disclosure missing');
  }
 }
 assert.equal(written+blanks,216);fixtures.push({fixture,terminalFields:216,written,blanks,blanksByDisposition:counts});
}
// Guard both edges of the family repair: the lost typed channel must fail,
// and an unavailable-fact declaration cannot excuse a fact the packet holds.
const courtNumber=map.maps[0].canonicalRefusals.find(r=>r.field==='Court Case Number');
assert.equal(verdict(courtNumber).disposition,'PROTECTED_FIELD');
assert.equal(verdict(courtNumber,null).disposition,'KNOWN_FACT_NOT_WRITTEN');
const financial=map.maps[1].canonicalRefusals.find(r=>r.field==='undefined_2');
assert.equal(verdict(financial).disposition,'REQUIRED_BEFORE_FILING');
assert.equal(verdict({...financial,factAvailable:true}).disposition,'KNOWN_FACT_NOT_WRITTEN');
const selection=map.maps[0].canonicalRefusals.find(r=>r.field==='Check Box8.1');
assert.equal(verdict({...selection,routeDetermined:true}).disposition,'ROUTE_OPTION_NOT_SELECTED');
console.log(JSON.stringify({result:'PASS',fixtures,negativeControls:3,scope:'Exact-family canonical and boundary refusal classifications and explicit required-before-filing disclosure; no independent packet acceptance.'},null,2));
