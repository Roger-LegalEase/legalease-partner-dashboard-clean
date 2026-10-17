import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {participantGuideMatter,renderParticipantPacketPdf,resolveDeliveryLocale}=await import('../src/lib/rcap/render/participant-packet-assembly.ts');
const {gaPardonDocumentFacts,GA_PERSONALIZED_DELIVERY_ROUTE:route}=await import('../src/lib/rcap/render/ga-pardon-facts.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const {composeParticipantDeliveryPacket}=await import('../src/lib/rcap/grade-a/participant-packet.ts');
const {consumerMatterIdForItem}=await import('../src/lib/expungement-ai/consumer-identity.ts');
const {GA_PARDON_CAPTION_QUESTIONS}=await import('../src/lib/expungement-ai/ga-pardon-caption.ts');
const {recordFactConfirmationFor}=await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const {supplementalGuideFor}=await import('../src/lib/rcap/supplemental/guide-registry.ts');
const {preparePersonalizedPacket}=await import('../src/lib/rcap/render/personalized-packet.ts');
const hash=b=>createHash('sha256').update(b).digest('hex');
const normalized=s=>s.replace(/\s+/g,' ').trim();
const clone=x=>JSON.parse(JSON.stringify(x));
const fixtureFile='scripts/test-ga-personalized-handoff.mjs';
const fixtureSource=fs.readFileSync(fixtureFile,'utf8');
assert.equal(hash(fixtureSource),'9691e52875f4e4e6bd9959cf59f2570e9c182da0a58d1322c8c08279ab43fb31');
// Extract declarations only. Neither the old six-output campaign nor the two
// accepted known-OTN production assemblies are executed by this harness.
const fixtureSlice=fixtureSource.slice(fixtureSource.indexOf('const specFile='),fixtureSource.indexOf('const checks=[]'));
const context=vm.createContext({fs,hash,route,packetSpecificationFor,consumerMatterIdForItem,GA_PARDON_CAPTION_QUESTIONS,recordFactConfirmationFor});
vm.runInContext(fixtureSlice+';globalThis.fixture={spec,facts,snapshot,input,id,specFile};',context);
const {spec,snapshot,input,id,specFile}=context.fixture;
function project(s){
 const merged={...s.screeningAnswers,...s.prefilledAnswers,...s.packetAnswers,...s.serverFacts};
 const projected={};
 for(const {factId}of spec.requiredFacts){const a=merged[factId],v=a&&typeof a==='object'&&!Array.isArray(a)?(a.unknown===true?undefined:a.value):a;if(typeof v==='string'||typeof v==='number')projected[factId]=String(v);}
 return {...projected,...gaPardonDocumentFacts(s)};
}
const currentFacts=project(snapshot);
const boundarySlice=fixtureSource.slice(fixtureSource.indexOf('const boundaryFacts='),fixtureSource.indexOf('const boundaryPacket='));
assert.ok(boundarySlice.startsWith('const boundaryFacts=')&&boundarySlice.trim().endsWith(';'));
context.currentFacts=currentFacts;
vm.runInContext(boundarySlice+';globalThis.boundaryFixture=boundaryFacts;',context);
const boundaryFacts=clone(context.boundaryFixture);
const unknown=clone(snapshot);delete unknown.screeningAnswers.otn;
const boundary=clone(snapshot);
for(const key of ['otn','court','participant_narrative'])boundary.screeningAnswers[key]=boundaryFacts[key];
boundary.dependencies.recordFactConfirmations=Object.fromEntries(GA_PARDON_CAPTION_QUESTIONS.map(q=>[q.id,recordFactConfirmationFor(route,q.id,boundaryFacts,q)]));
assert.deepEqual(project(boundary),boundaryFacts,'exact old boundary facts, no shortening or translation');
const unknownFacts={...currentFacts};delete unknownFacts.otn;
assert.deepEqual(project(unknown),unknownFacts,'exact old unknown-OTN facts');
const cases=[{name:'unknown-otn-en',locale:'en',snapshot:unknown,reference:'unknown-otn-court_only',courtPages:9},{name:'unknown-otn-es',locale:'es',snapshot:unknown,reference:'unknown-otn-court_only',courtPages:9},{name:'boundary-es',locale:'es',snapshot:boundary,reference:'boundary-es-court_only',courtPages:10}];
const [output,original,known,historicalKnown]=process.argv.slice(2);
assert.ok(output&&original&&known&&[output,original,known].every(path.isAbsolute),'fresh external output, original six-output directory and accepted known-assembly directory required');
assert.ok(!fs.existsSync(output),'fresh output directory required');
assert.ok(!path.resolve(output).startsWith(fs.realpathSync('.')+path.sep),'outputs must stay outside the repository');
const originalReceipt=path.join(original,'RESULTS.json'),knownReceipt=path.join(known,'RESULTS.json');
const originalKnownReceiptSha256='37bf4a3c2cd7419eb9bd4d60876e65d848f0bce9271c2435d850dacc46b8c475';
const prior=JSON.parse(fs.readFileSync(originalReceipt,'utf8')),accepted=JSON.parse(fs.readFileSync(knownReceipt,'utf8'));
let historicalKnownReceipt=null,historicalKnownArtifacts=[];
if(hash(fs.readFileSync(knownReceipt))!==originalKnownReceiptSha256){
 assert.ok(historicalKnown&&path.isAbsolute(historicalKnown),'current successor requires explicit preserved historical known receipt directory');
 historicalKnownReceipt=path.join(historicalKnown,'RESULTS.json');
 assert.equal(hash(fs.readFileSync(historicalKnownReceipt)),originalKnownReceiptSha256,'original known proof remains exact historical evidence');
 const historical=JSON.parse(fs.readFileSync(historicalKnownReceipt,'utf8'));historicalKnownArtifacts=historical.artifacts;
 assert.equal(historicalKnownArtifacts.length,2);
 assert.equal(accepted.status,'PASS');assert.equal(accepted.fixtureSourceSha256,hash(fixtureSource));assert.equal(accepted.fixtureSliceSha256,hash(fixtureSlice));
 assert.deepEqual(accepted.preservedCourtArtifacts,prior.renders,'current known proof binds this exact current six-output proof');
 assert.deepEqual(accepted.artifacts.map(a=>a.locale),['en','es'],'same two known case/locale identities');
 for(const artifact of accepted.artifacts){
  assert.equal(path.resolve(artifact.file),path.join(path.resolve(known),'participant-'+artifact.locale+'.pdf'));
  assert.deepEqual(artifact.matter,participantGuideMatter(snapshot,id,artifact.locale,spec),'current exact known fixture/cover input');
  const bytes=fs.readFileSync(artifact.file);assert.equal(hash(bytes),artifact.sha256);assert.equal(bytes.length,artifact.byteLength);
 }
 const requiredKnownSources=['src/lib/rcap/render/participant-packet-assembly.ts',fixtureFile,specFile,'scripts/test-ga-participant-assembly.mjs','src/lib/rcap/render/ga-pardon-facts.ts','src/lib/rcap-engine/georgia-pardon-facts.ts','src/lib/expungement-ai/ga-pardon-caption.ts','src/lib/expungement-ai/record-fact-clarification.ts','src/lib/rcap/grade-a/composer.ts','src/lib/rcap/grade-a/participant-packet.ts','src/lib/rcap/grade-a/renderer.ts','src/lib/rcap/supplemental/guide-renderer.ts','src/lib/rcap/supplemental/guide-registry.ts','src/lib/rcap/render/personalized-packet.ts','data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json'];
 assert.deepEqual(Object.keys(accepted.sourceBindings).sort(),requiredKnownSources.sort(),'no missing/substitute current source-binding set');
}

assert.equal(prior.renders.length,6);assert.equal(accepted.artifacts.length,2);
const preserved=[...prior.renders,...accepted.artifacts,...historicalKnownArtifacts];
function verifyPreserved(){for(const a of preserved)assert.equal(hash(fs.readFileSync(a.file)),a.sha256,'preserved artifact '+a.file);}
verifyPreserved();
for(const [file,sha256]of Object.entries(accepted.sourceBindings))assert.equal(hash(fs.readFileSync(file)),sha256,'accepted known-assembly source remains unchanged '+file);
const guide=supplementalGuideFor(route);assert.ok(guide);
assert.equal(guide.translationProvenance.status,'SOURCE_PARALLEL_DRAFT_INDEPENDENT_LANGUAGE_REVIEW_PENDING');
fs.mkdirSync(output,{recursive:true});
const checks=[],artifacts=[],pixelComparisons=[];
function check(name,fn){fn();checks.push(name);}
function raster(file,page,prefix){execFileSync('pdftoppm',['-f',String(page),'-l',String(page),'-singlefile','-r','96','-png',file,prefix]);return hash(fs.readFileSync(prefix+'.png'));}
for(const item of cases){
 const s=item.snapshot,before=JSON.stringify(s),facts=project(s);
 const boundLocale=resolveDeliveryLocale({attribution:{locale:item.locale}});
 check(item.name+' durable locale binding',()=>assert.equal(boundLocale,item.locale));
 const matter=participantGuideMatter(s,id,boundLocale,spec);
 const packet=composeParticipantDeliveryPacket(spec,{routeKey:route,jurisdiction:'GA',pathwayId:s.pathwayId,verificationHash:input.verificationHash,verifiedAt:s.verifiedAt,generationPurpose:'internal_review',facts});
 check(item.name+' genuine generation remains NO_RECORD',()=>assert.throws(()=>preparePersonalizedPacket({...input,snapshot:s,deliveryLocale:boundLocale}),/NO_RECORD/));
 const reference=prior.renders.find(a=>a.variant===item.reference);assert.ok(reference);
 const oldPages=execFileSync('pdftotext',['-layout',reference.file,'-'],{encoding:'utf8'}).split('\f').filter(x=>x.trim());
 const historicalCourtPages=item.courtPages;item.courtPages=oldPages.length;assert.ok(item.courtPages>0,'current corrected boundary court output nonempty');
 // Exactly one successful production-entry render for this previously unrun
 // variant. This synthetic preparation grants no worker or delivery authority.
 const bytes=await renderParticipantPacketPdf(packet,{routeKey:route,specification:spec,variant:'full',locale:boundLocale,verifiedAt:s.verifiedAt,matter});
 const file=path.join(output,'participant-'+item.name+'.pdf');fs.writeFileSync(file,bytes,{flag:'wx'});
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});fs.writeFileSync(file.replace(/\.pdf$/,'.txt'),text,{flag:'wx'});
 const pages=text.split('\f').filter(x=>x.trim());
 const whole=text.replace(/\s+/g,' ');assert.ok(whole.includes('This order does not itself grant clerk-record sealing'));assert.ok(whole.includes('Until completed and signed, this page does not establish that service occurred.'));assert.ok(whole.includes('ACTUAL PROSECUTING ATTORNEY'));assert.ok(!whole.includes('needed for this order to be actionable by GCIC'));assert.ok(whole.includes((boundLocale==='es')?'versión fiel en inglés':'faithful English rendering'));
 const courtStart=pages.findIndex(page=>normalized(page)===normalized(oldPages[0]));
 check(item.name+' guide precedes exact court documents',()=>assert.ok(courtStart>0));
 check(item.name+' guide cover once',()=>assert.equal((text.match(boundLocale==='es'?/Su paquete para limpiar antecedentes/g:/Your record-clearing packet/g)||[]).length,1));
 // Every source-bound cover value must be present in full, including the long
 // court. Pixel inspection separately assesses wrapping, spacing and clipping.
 for(const [key,value]of Object.entries(matter).filter(([key,value])=>key!=='packetId'&&value))check(item.name+' complete cover '+key,()=>assert.ok(normalized(pages[0]).includes(normalized(value))));
 check(item.name+' adopted remedy language',()=>assert.equal(matter.remedy,(boundLocale==='es'?spec.pathwayLabelEs:spec.pathwayLabel)));
 const stopPages=spec.hearingAndObjectionStops.filter(stop=>stop.stopAndGetHelp).map(stop=>{
  const translated=boundLocale==='es'?guide.stopConditionsEs[stop.situation]:stop;
  const found=pages.findIndex(page=>normalized(page).includes(normalized(translated.situation)));
  assert.ok(found>=0&&found<courtStart);assert.ok(normalized(pages[found]).includes(normalized(translated.whatItMeans)));
  return found;
 });
 check(item.name+' all six help conditions and explanations grouped',()=>{assert.equal(stopPages.length,6);assert.equal(new Set(stopPages).size,1);});
 for(let page=0;page<item.courtPages;page++){
  check(item.name+' exact court text page '+(page+1),()=>assert.equal(normalized(pages[courtStart+page]),normalized(oldPages[page])));
  const originalSha256=raster(reference.file,page+1,path.join(output,item.name+'-old-court-'+(page+1)));
  const assembledSha256=raster(file,courtStart+page+1,path.join(output,item.name+'-assembled-court-'+(page+1)));
  check(item.name+' exact court pixels page '+(page+1),()=>assert.equal(assembledSha256,originalSha256));
  pixelComparisons.push({case:item.name,courtPage:page+1,assemblyPage:courtStart+page+1,originalSha256,assembledSha256});
 }
 check(item.name+' only original court pages and provenance after guide',()=>assert.equal(pages.length,courtStart+item.courtPages+1));
 for(const retired of spec.documents.filter(doc=>doc.supersededBy==='supplemental_guide'))check(item.name+' retired component absent '+retired.documentId,()=>assert.ok(!pages.slice(courtStart).some(page=>normalized(page).includes(retired.title))));
 if(item.name==='boundary-es'){
  check('complete long OTN survives assembly',()=>assert.ok(text.replace(/\s+/g,'').includes(boundaryFacts.otn)));
  check('complete Spanish-authored narrative survives without translation',()=>assert.ok(normalized(text).includes(boundaryFacts.participant_narrative)));
 }else check(item.name+' unknown OTN remains absent rather than invented',()=>{assert.equal(facts.otn,undefined);assert.ok(!text.includes('Synthetic otn'));});
 check(item.name+' protected-shape source maps unchanged',()=>assert.equal(JSON.stringify(s),before));
 const coverSha256=raster(file,1,path.join(output,item.name+'-cover'));
 const stopPage=stopPages[0]+1,stopPageSha256=raster(file,stopPage,path.join(output,item.name+'-help'));
 artifacts.push({case:item.name,locale:boundLocale,file,sha256:hash(bytes),byteLength:bytes.length,pages:pages.length,guidePages:courtStart,courtPagesPreserved:item.courtPages,historicalCourtPages,pageCountDeltaVsHistorical:item.courtPages-historicalCourtPages,reference,matter,coverSha256,stopPage,stopPageSha256,sourceFactsSha256:hash(JSON.stringify(facts))});
}
verifyPreserved();
const sourcePaths=[...Object.keys(accepted.sourceBindings),'scripts/test-ga-participant-assembly-boundaries.mjs'];
const result={status:'PASS',sourceBase:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Previously unrun synthetic unknown-OTN EN/ES and exact long-boundary ES through the production participant-assembly entry; no protected generation or delivery',checks:checks.length,details:checks,fixtureSourceSha256:hash(fixtureSource),fixtureSliceSha256:hash(fixtureSlice),boundarySliceSha256:hash(boundarySlice),sourceBindings:Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))])),artifacts,pixelComparisons,preservedKnownAssemblyReceipt:{file:knownReceipt,sha256:hash(fs.readFileSync(knownReceipt))},historicalKnownAssemblyReceipt:historicalKnownReceipt?{file:historicalKnownReceipt,sha256:originalKnownReceiptSha256}:null,preservedArtifacts:preserved,translationProvenance:guide.translationProvenance,limits:['No authority, final verification, worker claim, protected generation or authorized delivery created; current NO_RECORD remains.','Existing Spanish guide remains a source-parallel draft pending qualified language review. Court instruments remain English; the boundary participant narrative remains the exact Spanish-authored original, without approving its filing language.','These three new assemblies supplement two previously accepted known-OTN assemblies; the six old bare/composer outputs are preserved separately, not substituted for assembled delivery artifacts.']};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,checks:result.checks,artifacts:artifacts.map(({case:name,locale,file,sha256,pages,guidePages,courtPagesPreserved})=>({case:name,locale,file,sha256,pages,guidePages,courtPagesPreserved}))}));
