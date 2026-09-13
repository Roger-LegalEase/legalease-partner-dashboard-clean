import test from 'node:test';import assert from 'node:assert/strict';import{FIXTURES,validateFacts,stopReasons,plan}from'./build-census-v1-nd-prohibit-remote-public-access-set.mjs';
for(const [name,f]of Object.entries(FIXTURES))test(name+' complete intake remains diagnostic',()=>{assert(validateFacts(f));assert(f.synthetic);assert.equal(stopReasons(f).length,0);assert(f.prosecutor);});
for(const k of ['hasConviction','municipalCourt','expectsSealing','strongerRouteAvailable','contestedBalancing'])test('adopted stop '+k+' refuses',()=>assert.throws(()=>validateFacts({...FIXTURES.canonical,[k]:true})));
test('missing prosecutor office refuses instead of claiming collected',()=>assert.throws(()=>validateFacts({...FIXTURES.canonical,prosecutor:undefined})));
test('unknown stronger-route eligibility refuses',()=>assert.throws(()=>validateFacts({...FIXTURES.canonical,strongerRouteAvailable:undefined})));
test('single facts use native one-line narrative channel without invented composite input',()=>{const names=['State Of North Dakota','In District Court','Criminal Case No','vs','Text1','Printed Name','Address','City State Zip Code'];const d={sourceId:'official-form:ND-NOTICE-MOTION-REMOTE-ACCESS',fields:names.map(name=>({name,type:'text',widgets:[{page:1,rect:{x:72,y:100,width:300,height:18}}]}))};const p=plan(d,FIXTURES.canonical);assert.deepEqual(p.mapped,{});assert.equal(p.narratives.length,8);assert(p.narratives.every(n=>n.fields.length===1&&typeof n.factId==='string'));assert.equal(p.census.find(f=>f.name==='Text1').effectiveLabel,'Printed Name');assert(p.narratives.every(n=>!n.allowProtectedCategories));});

test('triggered conditional fee waiver cannot be omitted',()=>assert.throws(()=>validateFacts({...FIXTURES.canonical,feeCharged:true,feeUnaffordable:true})));

test('other-harm election requires participant words',()=>assert.throws(()=>validateFacts({...FIXTURES.canonical,harmsSelected:['other'],otherHarms:''})));
test('no invented harm election when intake omitted',()=>assert.throws(()=>validateFacts({...FIXTURES.canonical,harmsSelected:undefined})));
