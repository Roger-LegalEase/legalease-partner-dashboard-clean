import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {participantGuideMatter,renderParticipantPacketPdf,resolveDeliveryLocale}=await import('../src/lib/rcap/render/participant-packet-assembly.ts');
const {gaPardonDocumentFacts,GA_PERSONALIZED_DELIVERY_ROUTE:route}=await import('../src/lib/rcap/render/ga-pardon-facts.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {composeParticipantDeliveryPacket}=await import('../src/lib/rcap/grade-a/participant-packet.ts');
const {consumerMatterIdForItem}=await import('../src/lib/expungement-ai/consumer-identity.ts');
const {GA_PARDON_CAPTION_QUESTIONS}=await import('../src/lib/expungement-ai/ga-pardon-caption.ts');
const {recordFactConfirmationFor}=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const {supplementalGuideFor}=await import('../src/lib/rcap/supplemental/guide-registry.ts');
const {renderSupplementalGuidePdf}=await import('../src/lib/rcap/supplemental/guide-renderer.ts');
const {preparePersonalizedPacket}=await import('../src/lib/rcap/render/personalized-packet.ts');
const hash=b=>createHash('sha256').update(b).digest('hex');
const fixtureFile='scripts/test-ga-personalized-handoff.mjs';
const fixtureSource=fs.readFileSync(fixtureFile,'utf8');
assert.equal(hash(fixtureSource),'9691e52875f4e4e6bd9959cf59f2570e9c182da0a58d1322c8c08279ab43fb31');
// Reuse only the accepted fixture declaration. None of the old campaign runs.
const fixtureSlice=fixtureSource.slice(fixtureSource.indexOf('const specFile='),fixtureSource.indexOf('const checks=[]'));
const fixtureContext=vm.createContext({fs,hash,route,packetSpecificationFor,consumerMatterIdForItem,GA_PARDON_CAPTION_QUESTIONS,recordFactConfirmationFor});
vm.runInContext(fixtureSlice+';globalThis.fixture={spec,facts,snapshot,input,id,specFile};',fixtureContext);
const {spec,facts,snapshot,input,id,specFile}=fixtureContext.fixture;
const plainCopy=x=>JSON.parse(JSON.stringify(x));
const checks=[];
function check(name,fn){fn();checks.push(name);}
const predecessorSha='8af7a0641c8ff7ad126c40b1333994737e76dbe7';
const assemblyFile='src/lib/rcap/render/participant-packet-assembly.ts';
const predecessorSource=execFileSync('git',['show',predecessorSha+':'+assemblyFile],{encoding:'utf8'});
const predecessorJs=ts.transpileModule(predecessorSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const predecessor=await import('data:text/javascript;base64,'+Buffer.from(predecessorJs).toString('base64'));
const predecessorSpec=JSON.parse(execFileSync('git',['show',predecessorSha+':'+specFile],{encoding:'utf8'}));
check('demonstrated predecessor omits confirmed GA court and Spanish remedy',()=>{
 assert.equal(predecessorSpec.pathwayLabelEs,undefined);
 assert.equal(predecessor.participantGuideMatter(snapshot,id,'en',predecessorSpec).courtOrAgency,null);
 assert.equal(predecessor.participantGuideMatter(snapshot,id,'es',predecessorSpec).remedy,null);
});
const untouched=JSON.stringify(snapshot);
for(const locale of ['en','es'])check('exact confirmed GA cover '+locale,()=>{
 const actual=participantGuideMatter(snapshot,id,locale,spec);
 assert.equal(actual.courtOrAgency,facts.court);assert.equal(actual.remedy,(locale==='es'?spec.pathwayLabelEs:spec.pathwayLabel));
 assert.equal(actual.caseOrMatter,facts.case_number);assert.equal(actual.preparedFor,facts.participant_full_legal_name);
 assert.equal(actual.preparedOn,locale==='es'?'13 de octubre de 2026':'October 13, 2026');
});
for(const value of [undefined,null,'unknown',{unknown:true},['Municipal Court'],{value:'Municipal Court'}]){
 const s=plainCopy(snapshot);if(value===undefined)delete s.screeningAnswers.court;else s.screeningAnswers.court=value;
 check('missing/unknown/malformed court refuses '+JSON.stringify(value),()=>assert.throws(()=>participantGuideMatter(s,id,'en',spec),/document fact missing or unknown/));
}
for(const mutate of [s=>delete s.dependencies,s=>delete s.dependencies.recordFactConfirmations.court,s=>{s.dependencies.recordFactConfirmations.county.valueSha256='0'.repeat(64);},s=>{s.screeningAnswers.court='Superior Court';}]){
 const s=plainCopy(snapshot);mutate(s);
 check('unconfirmed/stale court refuses '+checks.length,()=>assert.throws(()=>participantGuideMatter(s,id,'es',spec),/caption is not confirmed/));
}
const conflicting=plainCopy(snapshot);conflicting.packetAnswers.court='Conflicting Court';
check('conflicting court refuses instead of map precedence',()=>assert.throws(()=>participantGuideMatter(conflicting,id,'en',spec),/document fact conflict/));
for(const selectedTrackId of [null,undefined,'ga-seal-m','other'])check('wrong or absent selected track refuses '+selectedTrackId,()=>assert.throws(()=>participantGuideMatter({...snapshot,selectedTrackId},id,'en',spec),/guide track mismatch/));
for(const change of [{jurisdiction:'MS'},{pathwayId:'other'}])check('wrong snapshot route refuses '+JSON.stringify(change),()=>assert.throws(()=>participantGuideMatter({...snapshot,...change},id,'es',spec),/document route mismatch/));
for(const other of [undefined,{...spec,trackId:'ga-seal-m'},{...spec,routeKey:'GA:other'}])for(const locale of ['en','es'])check('no GA inference from absent/sibling/wrong spec '+checks.length,()=>assert.deepEqual(participantGuideMatter(snapshot,id,locale,other),predecessor.participantGuideMatter(snapshot,id,locale,other)));
// Actual registered unrelated specifications, independent of their full PDF fixtures.
for(const file of fs.readdirSync('data/record-clearing/packet-specifications').filter(f=>/^(DC|IL|MS|WY)-/.test(f)&&f.endsWith('.json'))){
 const other=JSON.parse(fs.readFileSync(path.join('data/record-clearing/packet-specifications',file),'utf8'));
 if(!other.routeKey||!other.trackId)continue;
 const s={...snapshot,jurisdiction:other.jurisdiction,pathwayId:other.routeKey.split(':')[1],selectedTrackId:other.trackId,screeningAnswers:{...snapshot.screeningAnswers,court_name:'Existing court name',cause_number:'Existing cause',docket_number:'Existing docket'}};
 for(const locale of ['en','es'])check('unchanged generic projection '+file+' '+locale,()=>assert.deepEqual(participantGuideMatter(s,id,locale,other),predecessor.participantGuideMatter(s,id,locale,other)));
}
check('all protected source maps remain unchanged',()=>assert.equal(JSON.stringify(snapshot),untouched));
check('real protected generation still refuses absent authority',()=>assert.throws(()=>preparePersonalizedPacket(input),/NO_RECORD/));
const guide=supplementalGuideFor(route);assert.ok(guide);
const merged={...snapshot.screeningAnswers,...snapshot.prefilledAnswers,...snapshot.packetAnswers,...snapshot.serverFacts};
const projected={};for(const {factId}of spec.requiredFacts){const a=merged[factId],v=a&&typeof a==='object'&&!Array.isArray(a)?(a.unknown===true?undefined:a.value):a;if(typeof v==='string'||typeof v==='number')projected[factId]=String(v);}
const packet=composeParticipantDeliveryPacket(spec,{routeKey:route,jurisdiction:'GA',pathwayId:snapshot.pathwayId,verificationHash:input.verificationHash,verifiedAt:snapshot.verifiedAt,generationPurpose:'internal_review',facts:{...projected,...gaPardonDocumentFacts(snapshot)}});
for(const locale of [undefined,null,'fr']){
 await assert.rejects(()=>renderParticipantPacketPdf(packet,{routeKey:route,specification:spec,variant:'full',locale,verifiedAt:snapshot.verifiedAt}),/no delivery language/);
 checks.push('production assembly refuses missing/invalid locale '+locale);
}
for(const refs of [undefined,{}, {attribution:{locale:'fr'}}])check('durable locale absent/invalid refuses '+JSON.stringify(refs),()=>assert.throws(()=>resolveDeliveryLocale(refs)));
const untranslated=plainCopy(guide);let removed=false;
function removeFirstTranslation(value){if(!value||typeof value!=='object'||removed)return;for(const [key,child]of Object.entries(value)){if(key==='textEs'&&typeof child==='string'){delete value[key];removed=true;return;}removeFirstTranslation(child);if(removed)return;}}
removeFirstTranslation(untranslated);assert.ok(removed);
await assert.rejects(()=>renderSupplementalGuidePdf(untranslated,{locale:'es',verifiedAt:snapshot.verifiedAt}),/no Spanish text/);checks.push('actual guide renderer refuses missing consequential Spanish translation');
if(process.argv.includes('--mapping-only')){console.log(JSON.stringify({status:'PASS',scope:'pure mapping and assembly refusal controls; no successful PDF rendered',checks:checks.length}));process.exit(0);}
const output=process.argv[2],original=process.argv[3];
assert.ok(output&&original&&path.isAbsolute(output)&&path.isAbsolute(original),'fresh external output and preserved original output directory required');
assert.ok(!fs.existsSync(output),'fresh output directory required');assert.ok(!path.resolve(output).startsWith(fs.realpathSync('.')+path.sep));
const prior=JSON.parse(fs.readFileSync(path.join(original,'RESULTS.json'),'utf8'));
for(const artifact of prior.renders)assert.equal(hash(fs.readFileSync(artifact.file)),artifact.sha256);
const originalCourt=path.join(original,'court_only.pdf');
const originalText=execFileSync('pdftotext',['-layout',originalCourt,'-'],{encoding:'utf8'});
const originalPages=originalText.split('\f').filter(x=>x.trim());const historicalCourtPages=9;assert.ok(originalPages.length>0,'current corrected court output is nonempty; measured count and bbox/pixels require review');
fs.mkdirSync(output,{recursive:true});
const artifacts=[];
for(const locale of ['en','es']){
 const boundLocale=resolveDeliveryLocale({attribution:{locale}});assert.equal(boundLocale,locale);
 const matter=participantGuideMatter(snapshot,id,boundLocale,spec);
 // Actual production entry, once per locale. This is an internal synthetic
 // preparation, not an admitted worker claim or participant delivery.
 const bytes=await renderParticipantPacketPdf(packet,{routeKey:route,specification:spec,variant:'full',locale:boundLocale,verifiedAt:snapshot.verifiedAt,matter});
 const file=path.join(output,'participant-'+locale+'.pdf');fs.writeFileSync(file,bytes,{flag:'wx'});
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});fs.writeFileSync(path.join(output,'participant-'+locale+'.txt'),text,{flag:'wx'});
 const pages=text.split('\f').filter(x=>x.trim());
 const whole=text.replace(/\s+/g,' ');assert.ok(whole.includes('This order does not itself grant clerk-record sealing'));assert.ok(whole.includes('Until completed and signed, this page does not establish that service occurred.'));assert.ok(whole.includes('ACTUAL PROSECUTING ATTORNEY'));assert.ok(!whole.includes('needed for this order to be actionable by GCIC'));assert.ok(whole.includes((locale==='es')?'versión fiel en inglés':'faithful English rendering'));
 const courtStart=pages.findIndex(page=>page.includes('IN THE MUNICIPAL COURT') && page.includes('CLARKE COUNTY, STATE OF GEORGIA'));
 assert.ok(courtStart>0,'guide precedes court documents');
 const normalized=s=>s.replace(/\s+/g,' ').trim();
 const stopPages=spec.hearingAndObjectionStops.filter(stop=>stop.stopAndGetHelp).map(stop=>{
  const translated=locale==='es'?guide.stopConditionsEs[stop.situation]:stop;
  const found=pages.findIndex(page=>normalized(page).includes(normalized(translated.situation)));
  assert.ok(found>=0&&found<courtStart,'every help condition is in the guide');
  assert.ok(normalized(pages[found]).includes(normalized(translated.whatItMeans)),'condition and explanation stay together');
  return found;
 });
 assert.equal(stopPages.length,6);assert.equal(new Set(stopPages).size,1,'all six GA help conditions stay in one group');
 for(let i=0;i<originalPages.length;i++)assert.equal(normalized(pages[courtStart+i]),normalized(originalPages[i]),'preserved court page '+(i+1)+' '+locale);
 assert.equal(pages.length,courtStart+originalPages.length+1,'nine court pages plus existing provenance appendix only');
 assert.equal((text.match(locale==='es'?/Su paquete para limpiar antecedentes/g:/Your record-clearing packet/g)||[]).length,1,'guide cover exactly once');
 assert.ok(pages[0].includes('Municipal Court'));assert.ok(normalized(pages[0]).includes((locale==='es'?spec.pathwayLabelEs:spec.pathwayLabel)));
 for(const retired of spec.documents.filter(doc=>doc.supersededBy==='supplemental_guide'))assert.ok(!pages.slice(courtStart).some(page=>normalized(page).includes(retired.title)),'retired instruction absent '+retired.documentId);
 artifacts.push({locale,file,sha256:hash(bytes),byteLength:bytes.length,pages:pages.length,guidePages:courtStart,courtPagesPreserved:originalPages.length,historicalCourtPages,pageCountDeltaVsHistorical:originalPages.length-historicalCourtPages,matter});
}
for(const artifact of prior.renders)assert.equal(hash(fs.readFileSync(artifact.file)),artifact.sha256);
const sourcePaths=[assemblyFile,fixtureFile,specFile,'scripts/test-ga-participant-assembly.mjs','src/lib/rcap/render/ga-pardon-facts.ts','src/lib/rcap-engine/georgia-pardon-facts.ts','src/lib/expungement-ai/ga-pardon-caption.ts','src/lib/expungement-ai/record-fact-clarification.ts','src/lib/rcap/grade-a/composer.ts','src/lib/rcap/grade-a/participant-packet.ts','src/lib/rcap/grade-a/renderer.ts','src/lib/rcap/supplemental/guide-renderer.ts','src/lib/rcap/supplemental/guide-registry.ts','src/lib/rcap/render/personalized-packet.ts','data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json'];
const result={status:'PASS',sourceBase:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Synthetic exact accepted fixture through production participant assembly entry, not genuine protected generation/delivery',checks:checks.length,details:checks,fixtureSourceSha256:hash(fixtureSource),fixtureSliceSha256:hash(fixtureSlice),sourceBindings:Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))])),artifacts,preservedCourtArtifacts:prior.renders,translationProvenance:guide.translationProvenance,limits:['No authority, final verification, worker claim or delivery was created; current NO_RECORD remains.','English court instruments and unchanged English participant narrative remain English in both packets; Spanish guide uses existing draft translations, not qualified language approval.','Explicit source bindings cover this bounded correction and renderer contracts, not a full runtime import inventory.']};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,checks:result.checks,artifacts}));
