import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {PDFDocument,PDFName,rgb} from 'pdf-lib';
import sharp from 'sharp';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {prepareCaProp64JuvenileReviewAssembly:prepare,renderCaProp64JuvenileReviewAssembly:render,validateCaProp64JuvenileReviewComponents:validate,CA_JUVENILE_REVIEW_SOURCE_PATHS:reviewSourcePaths}=await import('../src/lib/rcap/render/ca-prop64-juvenile-review-assembly.ts');
const {packetInformationPatch,protectedPacketDraftHash}=await import('../src/lib/expungement-ai/packet-information.ts');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(f),json=f=>JSON.parse(read(f)),normalize=s=>s.replace(/\s+/g,' ').trim();
const existingIndex=process.argv.indexOf('--validate-existing');
if(existingIndex>=0){
 const resultPath=process.argv[existingIndex+1],prior=json(resultPath),root=path.dirname(resultPath),cohort='completed-attorney';
 const snapshot=json(path.join(root,cohort,'prospective-preparation.json')),priorReport=json(path.join(root,cohort,'component-report.json'));
 const sourceBytes=Object.fromEntries(priorReport.sources.map(s=>[s.documentId,read(s.sourcePath)]));
 const expected=prior.artifacts.find(a=>path.basename(path.dirname(a.file))===cohort&&a.variant==='full'&&a.locale==='en');assert(expected);
 const prepared=prepare(snapshot.record,sourceBytes,read),reportPath=path.join(root,cohort,'component-report.json');
 // Synthetic current-source mutation control, not a rewritten actual report or
 // a new output approval. All existing component bytes remain immutable.
 const currentReport={...priorReport,sourceInputs:prepared.sourceInputs},reportBytes=Buffer.from(JSON.stringify(currentReport));
 let mutated=false;
 const options={variant:'full',locale:'en',reportPath,reportSha256:hash(reportBytes),readBytes:file=>{
  if(file===reportPath)return reportBytes;
  const bytes=read(file);
  if(!mutated&&file===priorReport.artifacts[0].file){mutated=true;queueMicrotask(()=>{prepared.mapping.facts['participant.full_legal_name']='MUTATED AFTER VALIDATION';prepared.mapping.capturedAt='1990-01-01T00:00:00.000Z';options.locale='es';options.variant='court_only';options.readBytes=()=>Buffer.from('mutated reader');bytes.fill(0);});}
  return bytes;
 }};
 const rendered=await render(prepared,options);assert(mutated);assert.equal(rendered.locale,'en');assert.equal(rendered.variant,'full');assert.equal(rendered.sha256,expected.sha256);assert.equal(hash(read(expected.file)),expected.sha256);
 await assert.rejects(()=>validate(prepared,{...options,readBytes:read}));
 for(const [key,value]of [['locale',undefined],['locale','fr'],['variant',undefined],['variant','other']]){const fresh=prepare(snapshot.record,sourceBytes,read);await assert.rejects(()=>validate(fresh,{variant:'full',locale:'en',reportPath,reportSha256:hash(reportBytes),readBytes:f=>f===reportPath?reportBytes:read(f),[key]:value}));}
 console.log(JSON.stringify({status:'PASS_ASYNC_CALLER_MUTATION_AND_EXPLICIT_SCOPE',storedOutputsUnchanged:true,transportRerun:false,finalizerRerun:false,baselineOutput:expected.sha256,sourceHash:hash(read('src/lib/rcap/render/ca-prop64-juvenile-review-assembly.ts'))}));process.exit(0);
}
const evidence=process.argv[2],output=process.argv[3],polishIndex=process.argv.indexOf('--polish-of');
const arg=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1]};
const ownerPath=arg('--owner-receipt'),ownerSha=arg('--owner-receipt-sha256'),retainedPath=arg('--retained-transport');
const ownerFinalFullOnly=process.argv.includes('--owner-final-full-only');
const ownerSourceReviewPath=arg('--owner-source-review'),ownerSourceReviewSha=arg('--owner-source-review-sha256');
assert(!ownerFinalFullOnly||ownerPath,'final/full-only requires an actual owner receipt');
assert(Boolean(ownerSourceReviewPath)===Boolean(ownerSourceReviewSha),'source applicability review and SHA must be paired');
assert(!ownerSourceReviewPath||(ownerPath&&ownerFinalFullOnly),'source applicability is limited to final/full actual-owner scope');
let ownerSourceApplicability=null,ownerApplicabilityReview=null;
const NY_OWNER_SOURCE='7ee8427fecb0f72d76193cb7e71e816ee8b2cff4';
const NY_CURRENT_SOURCE='15148248604d148aae05ecebf63f691007a8d986';
const NY_REVIEW_SHA='4629543501c155d733c0234c6483a0d76984c435710554acdd4f7bff63c68ccf';
const NY_SOURCE_PATHS=['src/lib/expungement-ai/ny-16059-transaction-associations.ts','src/lib/expungement-ai/packet-information.ts','src/lib/expungement-ai/types.ts'];
function verifyOwnerRuntime(owner,manifest){
 const currentFiles=[...new Set(['--cached','--others'].flatMap(mode=>execFileSync('git',['ls-files',mode,'--exclude-standard','src','data'],{encoding:'utf8',maxBuffer:64*1024*1024}).trim().split('\n').filter(Boolean)))].sort();
 assert.deepEqual(currentFiles,Object.keys(manifest.before).sort(),'owner runtime pathset changed');
 let reviewed=new Map();
 if(ownerSourceReviewPath){
  assert(path.isAbsolute(ownerSourceReviewPath));assert.equal(ownerSourceReviewSha,NY_REVIEW_SHA);assert.equal(hash(read(ownerSourceReviewPath)),NY_REVIEW_SHA);
  const review=json(ownerSourceReviewPath);assert.equal(review.status,'PASS_BOUNDED_CA_OWNER_SOURCE_APPLICABILITY');assert.equal(review.originalSource,NY_OWNER_SOURCE);assert.equal(review.currentSource,NY_CURRENT_SOURCE);ownerApplicabilityReview=review;
  assert.equal(owner.source,NY_OWNER_SOURCE);
  assert.deepEqual(execFileSync('git',['diff','--name-only',NY_OWNER_SOURCE,NY_CURRENT_SOURCE,'--','src','data'],{encoding:'utf8'}).trim().split('\n').sort(),NY_SOURCE_PATHS);
  for(const file of NY_SOURCE_PATHS){
   const entries=review.sourcePaths.filter(row=>row.path===file);assert.equal(entries.length,1);
   const originalHash=hash(execFileSync('git',['show',NY_OWNER_SOURCE+':'+file],{maxBuffer:10*1024*1024}));
   assert.equal(originalHash,manifest.before[file],'reviewed predecessor is not the actual owner source');assert.equal(originalHash,entries[0].originalSha256);
   assert.equal(hash(execFileSync('git',['show',NY_CURRENT_SOURCE+':'+file],{maxBuffer:10*1024*1024})),entries[0].currentSha256,'reviewed successor source differs');
   reviewed.set(file,entries[0].currentSha256);
  }
  assert.deepEqual(review.sourcePaths.map(row=>row.path).sort(),NY_SOURCE_PATHS);
  assert.deepEqual(review.sourceInputs.map(row=>row.path).sort(),[...reviewSourcePaths].sort());
  for(const entry of review.sourceInputs){
   assert.equal(entry.originalSha256,entry.currentSha256,'CA source inputs cannot change');
   for(const source of [NY_OWNER_SOURCE,NY_CURRENT_SOURCE])assert.equal(hash(execFileSync('git',['show',source+':'+entry.path],{maxBuffer:10*1024*1024})),entry.currentSha256);
   assert.equal(hash(read(entry.path)),entry.currentSha256,'CA source input drift');
  }
  const manifests=review.ownerManifests.filter(row=>row.path===path.join(path.dirname(ownerPath),owner.runtimeManifest));assert.equal(manifests.length,1);assert.equal(hash(read(manifests[0].path)),manifests[0].sha256);
  const records=review.records.filter(row=>row.ownerReceipt.path===ownerPath&&row.ownerReceipt.sha256===ownerSha);assert.equal(records.length,1);assert.equal(records[0].locale,owner.browserCorrection.cohort.locale);
  ownerSourceApplicability={review:{path:ownerSourceReviewPath,sha256:NY_REVIEW_SHA},ownerSource:NY_OWNER_SOURCE,currentSource:NY_CURRENT_SOURCE,
   changedSourcePaths:NY_SOURCE_PATHS.map(file=>({file,ownerSha256:manifest.before[file],currentSha256:reviewed.get(file)})),
   scope:'Only the exact independently reviewed NY-only source transition; all other original owner runtime files and CA source/mapping/template bytes remain exact. No output, approval or delivery authority.'};
 }
 for(const[file,sha]of Object.entries(manifest.before))assert.equal(hash(read(file)),reviewed.get(file)??sha,'owner runtime source drift: '+file);
}

function verifyOwnerPreparation(prepared,capture){
 if(!ownerApplicabilityReview)return;
 const matches=ownerApplicabilityReview.records.filter(row=>row.protectedRecordPath===capture.protectedRecordPath&&row.protectedRecordSha256===capture.protectedRecordSha256);
 assert.equal(matches.length,1);const reviewed=matches[0];assert.equal(reviewed.ownerReceipt.path,ownerPath);assert.equal(reviewed.ownerReceipt.sha256,ownerSha);
 assert.equal(prepared.recordSha256,reviewed.recordSha256);assert.equal(hash(JSON.stringify(prepared.mapping)),reviewed.mappingSha256,'actual owner mapping differs from reviewed original/current mapping');
 assert.deepEqual(prepared.sourceInputs,reviewed.sourceInputs);assert.equal(prepared.mapping.sourceWrites.length,reviewed.sourceWriteCount);
}
assert(Boolean(ownerPath)===Boolean(ownerSha)&&Boolean(ownerPath)===Boolean(retainedPath),'owner receipt, exact SHA and retained transport must be supplied together');
let owner=null,ownerManifest=null,ownerCaptures=null,retained=null;
if(ownerPath){
 assert(polishIndex<0,'owner outputs cannot reuse previously filled components');assert(path.isAbsolute(ownerPath)&&path.isAbsolute(retainedPath)&&/^[0-9a-f]{64}$/.test(ownerSha));assert.equal(hash(read(ownerPath)),ownerSha);owner=json(ownerPath);
 for(const key of ['restored','headUnchanged','runtimeSourceUnchanged','runtimeFixtureUnchanged','runtimeFunctionUnchanged'])assert.equal(owner[key],true,'owner receipt lacks '+key);
 assert.equal(owner.status,'PASS');assert.deepEqual(owner.cleanupErrors,[]);assert(owner.checks.length&&owner.checks.every(c=>c.pass===true));assert.equal(owner.browserCorrection?.status,'PASS');
 const cohort=owner.browserCorrection.cohort;assert(['en','es'].includes(cohort?.locale));assert.equal(cohort.juvenileRemedy,cohort.locale==='en'?'completed':'probation');assert.equal(cohort.filingRole,cohort.locale==='en'?'self_represented':'attorney');
 assert.equal(owner.source,owner.expectedHead);assert.equal(owner.finalHead,owner.expectedHead);assert(/^[0-9a-f]{40}$/.test(owner.source));
 assert.equal(path.basename(owner.runtimeManifest),owner.runtimeManifest);ownerManifest=json(path.join(path.dirname(ownerPath),owner.runtimeManifest));assert.equal(hash(JSON.stringify(ownerManifest.before)),owner.sourceManifestSha256);
 verifyOwnerRuntime(owner,ownerManifest);
 ownerCaptures=(ownerFinalFullOnly?['final']:['primary','final']).map(label=>{const matches=owner.savedOwnerMappings.filter(c=>c.label===label);assert.equal(matches.length,1);const capture=matches[0];assert.equal(capture.status,'mapped_for_review');assert.equal(capture.generationAllowed,false);assert.equal(capture.authorizedDeliveryEstablished,false);assert.equal(hash(read(capture.protectedRecordPath)),capture.protectedRecordSha256);const record=json(capture.protectedRecordPath);assert.equal(record.draftHash,protectedPacketDraftHash(record.draftSnapshot));assert.equal(record.draftHash,capture.protectedDraftHash);assert.equal(record.revision,capture.revision);assert.notEqual(record.status,'verified');assert(!record.hash&&!record.snapshot);return{...capture,record};});
 assert.equal(hash(read(retainedPath)),'e0a6906fc71187d0e695002593b7819f4ecdc63943266e83879948866bbb7db9');retained=json(retainedPath);assert.equal(retained.status,'PASS_HELD_JUVENILE_REVIEW_ASSEMBLY');assert.equal(hash(read(retained.transportPath)),retained.transportSha256);
}
const predecessor=polishIndex<0?null:json(process.argv[polishIndex+1]),predecessorRoot=predecessor?path.dirname(process.argv[polishIndex+1]):null;
if(predecessor)for(const a of [...predecessor.artifacts,...predecessor.components])assert.equal(hash(read(a.file)),a.sha256);
assert(evidence&&path.isAbsolute(evidence)&&output&&path.isAbsolute(output),'existing evidence and fresh external output directories required');
assert(!path.resolve(output).startsWith(process.cwd()+path.sep));assert(!fs.existsSync(output),'preserve every existing output');
const physicalOutput=path.join(fs.realpathSync(path.dirname(output)),path.basename(output));assert(!physicalOutput.startsWith(fs.realpathSync(process.cwd())+path.sep));
const spec=json('data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json');
const sources=Object.fromEntries(spec.documents.map(d=>[d.documentId,path.join(evidence,d.documentId.toLowerCase().replace('-','')+'-official-v1.pdf')]));
const bytes=Object.fromEntries(Object.entries(sources).map(([k,p])=>[k,read(p)]));
for(const d of spec.documents)assert.equal(hash(bytes[d.documentId]),d.sourceSha256);
if(ownerSourceApplicability)for(const capture of ownerCaptures)verifyOwnerPreparation(prepare(capture.record,bytes,read),capture);
const host='scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs',hostHash=hash(read(host));
// Test-only visibility of the EXACT existing transport/finalizer bodies. No
// source rewrite, body substitution, new transport or production module export.
const shim='\nexport { runPikepdfBridge, enhancedFidelityContract, caFinalizerCensus, finalizeCaPrimaryFixture, strokedLineSegmentsFromBytes, proveStatutorySelectionsFromOutput };\n';
const loader=`let target,expected,shim;export function initialize(d){({target,expected,shim}=d)}export async function load(url,context,next){const result=await next(url,context);if(url!==target)return result;const{createHash}=await import('node:crypto');const original=String(result.source);if(createHash('sha256').update(original).digest('hex')!==expected)throw Error('Exact source exposure refused');return{...result,source:original+shim}}`;
register('data:text/javascript,'+encodeURIComponent(loader),{data:{target:pathToFileURL(path.resolve(host)).href,expected:hostHash,shim}});
const bridge=await import('../'+host);
const checks=[],artifacts=[],components=[],pixelComparisons=[];const check=(name,fn)=>{fn();checks.push(name);};
fs.mkdirSync(output);
const transport=retained?json(retained.transportPath):predecessor?json(predecessor.transportPath):bridge.runPikepdfBridge({mode:'create',writeScratch:true,scratchDir:path.join(output,'official-content-streams'),targets:spec.documents.map(d=>({formNumber:d.documentId,sourcePath:sources[d.documentId],sha256:d.sourceSha256,derivedPath:path.join(output,'derived-sources',d.documentId+'.pdf')}))});
for(const d of transport.derivatives){bridge.enhancedFidelityContract(d);check('source field matrix '+d.formNumber,()=>assert.deepEqual(transport.forms[d.formNumber].fields.map(f=>f.name).sort(),spec.documents.find(s=>s.documentId===d.formNumber).fields.map(f=>f.field).sort()));}
const sourceRasterRoot=retained?path.dirname(path.dirname(transport.derivatives[0].derivedPath)):predecessorRoot??output;
if(!predecessor&&!retained)for(const d of transport.derivatives)for(let page=1;page<=transport.forms[d.formNumber].pageCount;page++)raster(d.derivedPath,page,path.join(output,`${d.formNumber}-source-${page}`));
if(predecessor||retained){const origin=predecessor??retained;assert.equal(hash(read(origin.transportPath)),origin.transportSha256);assert.equal(transport.originalModuleSha256,hostHash);assert.equal(transport.exposureShim,shim);for(const d of transport.derivatives){assert.equal(hash(read(d.derivedPath)),d.derivedSha256);assert.equal(hash(read(sources[d.formNumber])),d.sourceSha256Before);}}
if(retained)for(const c of retained.components){const ink=json(path.join(path.dirname(c.file),`${c.documentId}-${c.instance}-source-ink.json`));for(const page of ink)assert.equal(hash(read(path.join(sourceRasterRoot,`${c.documentId}-source-${page.page}.png`))),page.sourceImageSha256);}
fs.writeFileSync(path.join(output,'transport.json'),JSON.stringify({originalModule:host,originalModuleSha256:hostHash,exposureShim:shim,exposureShimSha256:hash(shim),loaderSha256:hash(loader),...transport},null,2)+'\n',{flag:'wx'});
function raster(file,page,prefix){execFileSync('pdftoppm',['-f',String(page),'-singlefile','-r','90','-png',file,prefix],{stdio:'pipe'});return hash(read(prefix+'.png'));}
const cohorts=owner?ownerCaptures.map(capture=>[owner.browserCorrection.cohort.juvenileRemedy==='completed'?'completed':'currently-serving',owner.browserCorrection.cohort.filingRole,null,capture]):[['completed','self_represented',0],['completed','attorney',7],['currently-serving','self_represented',2],['currently-serving','attorney',0]];
for(const [branch,role,additionalCount,ownerCapture]of cohorts){
 const name=branch+'-'+role+(ownerCapture?'-'+ownerCapture.label:''),dir=path.join(output,name);fs.mkdirSync(dir);
 const priorPath=ownerCapture?ownerCapture.protectedRecordPath:path.join(evidence,`CONTACT-OWNER-RECORD-${branch}-${role}-en-v4.json`),prior=json(priorPath),priorHash=hash(read(priorPath));
 let record;
 if(ownerCapture)record=structuredClone(ownerCapture.record);else {
 const transition=packetInformationPatch({protectedVerification:prior,answers:{ca_prop64_court_type:'juvenile',ca_prop64_age_at_offense:17}});assert(transition);
 record=structuredClone(transition.protectedTransition.nextVerification);
 // Declared prospective fixture only, NOT an actual new owner save.
 Object.assign(record.draftSnapshot.packetAnswers,{ca_prop64_juvenile_case_name:'In the Matter of Jordan Avery Reyes',ca_prop64_juvenile_case_number:'0012-CR-0099',ca_prop64_juvenile_full_name:'Jordan Avery Reyes',ca_prop64_juvenile_date_of_birth:'1983-01-01',ca_prop64_juvenile_disposition:branch==='completed'?'completed':'probation',ca_prop64_juvenile_finding_date:'2000-02-01',ca_prop64_juvenile_finding_sections:['11357','11358'],ca_prop64_juvenile_additional_scope:additionalCount?'same_case_remedy':'none',...(additionalCount?{ca_prop64_juvenile_additional_count:additionalCount}:{})});
 for(let i=1;i<=additionalCount;i++)Object.assign(record.draftSnapshot.packetAnswers,{[`ca_prop64_juvenile_additional_${i}_date`]:`2000-03-${String(i).padStart(2,'0')}`,[`ca_prop64_juvenile_additional_${i}_conduct_date`]:`2000-02-${String(i).padStart(2,'0')}`,[`ca_prop64_juvenile_additional_${i}_sections`]:[i%2?'11360':'11359']});
 record.draftHash=protectedPacketDraftHash(record.draftSnapshot);}
 if(predecessor)record=json(path.join(predecessorRoot,name,'prospective-preparation.json')).record;const prepared=prepare(record,bytes,read);
 if(ownerCapture){verifyOwnerPreparation(prepared,ownerCapture);assert.equal(prepared.mapping.sourceWrites.length,ownerCapture.sourceWriteCount);assert.deepEqual(prepared.mapping.findings,ownerCapture.findings);assert.equal(prepared.mapping.serviceActor,ownerCapture.serviceActor);assert.deepEqual(prepared.mapping.sourceDocuments,ownerCapture.sourceDocuments);}
 fs.writeFileSync(path.join(dir,ownerCapture?'owner-preparation.json':'prospective-preparation.json'),JSON.stringify({classification:ownerCapture?'ACTUAL_OWNER_SAVED_FACTS_INTERNAL_HELD_REVIEW_NOT_WORKER_GENERATION':'SYNTHETIC_PROSPECTIVE_FACTS_NOT_OWNER_SAVE',...(ownerCapture?{ownerReceipt:{path:ownerPath,sha256:ownerSha,label:ownerCapture.label}}:{}),priorPath,priorSha256:priorHash,record,prepared},null,2)+'\n',{flag:'wx'});
 const expected=[{documentId:'JV-744',instance:0},...Array.from({length:prepared.mapping.attachmentCount},(_,instance)=>({documentId:'JV-744A',instance})),{documentId:'JV-746',instance:0}],reportArtifacts=[];
 for(const item of expected){
  const {documentId,instance}=item,contract=spec.documents.find(d=>d.documentId===documentId),formCensus=transport.forms[documentId],derived=transport.derivatives.find(d=>d.formNumber===documentId);
  const written=prepared.mapping.sourceWrites.filter(w=>w.documentId===documentId&&w.instance===instance).map(({field,value,sourceFactId})=>({field,value,sourceFactId}));
  const textWrites=written.filter(w=>typeof w.value==='string'),facts=Object.fromEntries(textWrites.map((w,i)=>['juvenile.value_'+i,w.value])),explicitMappings=Object.fromEntries(textWrites.map((w,i)=>[w.field,'juvenile.value_'+i]));
  const variant={variantId:name+'-'+documentId+'-'+instance,routeKey:'CA:'+prepared.mapping.pathwayId,textControls:{},controlFacts:{},selections:written.filter(w=>w.value===true).map(w=>{const f=formCensus.fields.find(f=>f.name===w.field);const states=f.widgets.flatMap(w=>w.onStates??[]).filter(s=>s!=='Off');assert.equal(new Set(states).size,1);return{fieldName:w.field,onState:states[0]};})};
  const census=bridge.caFinalizerCensus(formCensus);
  let result;const priorArtifact=predecessor?.components.find(a=>a.documentId===documentId&&a.instance===instance&&path.basename(path.dirname(a.file))===name);
  if(priorArtifact){const priorFinalizer=json(path.join(predecessorRoot,name,`${documentId}-${instance}-finalizer.json`));assert.deepEqual(priorArtifact.written,written);assert.equal(hash(read(priorArtifact.file)),priorArtifact.sha256);result={bytes:read(priorArtifact.file),report:priorFinalizer.report,selectionReport:{selections:priorFinalizer.selectionProof.selectedControls.map(row=>({control:row.fieldName,inset:row.expectedSegments[0].x0-row.box.x0})),selectionsRefused:[]}};}
  else result=await bridge.finalizeCaPrimaryFixture({formCensus,variant,officialOptions:{sourceBytes:read(derived.derivedPath),expectedSha256:derived.derivedSha256,census,facts,explicitMappings,unwritableFields:census.filter(f=>!Object.hasOwn(explicitMappings,f.name)).map(f=>({field:f.name})),captionOnly:false,documentAcceptsFill:true,documentTextLines:[],maxFontSize:9,minFontSize:6,title:documentId,detachNestedControlFields:true,suppressSynthesizedAppearances:true,appearanceDispositions:new Map()}});
  // Remove only exact-source viewer chrome, including its noninteractive
  // background. Never enlarge the source rectangles to hide layout drift.
  const polished=await PDFDocument.load(result.bytes,{updateMetadata:false}),removedUi=[];
  const sourceBbox=execFileSync('pdftotext',['-bbox',derived.derivedPath,'-'],{encoding:'utf8'});
  const sourcePages=[...sourceBbox.matchAll(/<page[^>]*>([\s\S]*?)<\/page>/g)].map(m=>m[1]);
  const overlaps=(a,b)=>Math.min(a[2],b[2])>Math.max(a[0],b[0])&&Math.min(a[3],b[3])>Math.max(a[1],b[1]);
  for(const field of formCensus.fields.filter(f=>contract.fields.find(c=>c.field===f.name)?.actor==='source_ui_removed_at_finalization')){
   assert(field.flags.includes('pushButton'));
   assert(/(?:Print_bt|Save_bt|Reset_bt|T23)\[0\]$/.test(field.name));
   for(const w of field.widgets){assert(Number.isInteger(w.pageIndex));for(const other of formCensus.fields.filter(f=>contract.fields.find(c=>c.field===f.name)?.actor!=='source_ui_removed_at_finalization'))for(const ow of other.widgets)if(ow.pageIndex===w.pageIndex)assert(!overlaps(w.rect,ow.rect),'source UI overlaps a retained field');
    const words=[...sourcePages[w.pageIndex].matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]*)<\/word>/g)].filter(m=>overlaps(w.rect,[Number(m[1]),polished.getPage(w.pageIndex).getHeight()-Number(m[4]),Number(m[3]),polished.getPage(w.pageIndex).getHeight()-Number(m[2])])).map(m=>m[5]);
    assert.equal(normalize(words.join(' ')),normalize(field.tooltip),'viewer rectangle includes unexpected source text');
    const [x0,y0,x1,y1]=w.rect;assert(y1<=24,'viewer footer intersects legal body');polished.getPage(w.pageIndex).drawRectangle({x:x0,y:y0,width:x1-x0,height:y1-y0,color:rgb(1,1,1),borderWidth:0});removedUi.push({field:field.name,page:w.pageIndex+1,rect:w.rect,sourceText:words.join(' ')});
   }
  }
  result.bytes=Buffer.from(await polished.save({useObjectStreams:false}));
  const file=path.join(dir,`${documentId}-${instance}.pdf`);fs.writeFileSync(file,result.bytes,{flag:'wx'});
  const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}),selected=result.selectionReport.selections.map(s=>s.control);
  check(name+' source viewer UI absent '+documentId+instance,()=>assert.ok(!/Print this form|Save this form|Clear this form/.test(text)));
  check(name+' exact written fields '+documentId+instance,()=>assert.deepEqual(result.report.written.map(w=>w.field).sort(),textWrites.map(w=>w.field).sort()));
  for(const w of textWrites)check(name+' printed '+w.sourceFactId+' '+documentId+instance,()=>assert.ok(normalize(text).includes(normalize(w.value))));
  const selectionProof=bridge.proveStatutorySelectionsFromOutput({outputSegments:await bridge.strokedLineSegmentsFromBytes(result.bytes),formCensus,variant,selectionReport:result.selectionReport,label:name+'/'+documentId+'/'+instance});
  const reserved=contract.fields.filter(f=>!written.some(w=>w.field===f.field)).map(f=>f.field);
  check(name+' reserved fields refused '+documentId+instance,()=>{for(const field of reserved)assert.ok(result.report.refused.some(r=>r.field===field));});
  const pdf=await PDFDocument.load(result.bytes,{updateMetadata:false});check(name+' static final form '+documentId+instance,()=>{assert.equal(pdf.getForm().getFields().length,0);assert(!pdf.catalog.has(PDFName.of('OpenAction')));assert(pdf.getPages().every(p=>(p.node.Annots()?.size()??0)===0));});
  const art={documentId,instance,file,sha256:hash(result.bytes),pages:pdf.getPageCount(),written,reservedFields:reserved,selectedControls:selected,sourceFieldCount:contract.fields.length,textObserved:true,reservedFieldsPreserved:true,selectionInkObserved:true,sourceInkOutsideWritesPreserved:true,sourceViewerChromeRemoved:true,removedUi,finalizerOptions:{detachNestedControlFields:true,suppressSynthesizedAppearances:true}};reportArtifacts.push(art);components.push(art);
  fs.writeFileSync(path.join(dir,`${documentId}-${instance}-finalizer.json`),JSON.stringify({report:result.report,selectionProof,sourceFidelity:derived,sourceWrites:written,reusedFinalizer:priorArtifact?{file:priorArtifact.file,sha256:priorArtifact.sha256}:null,removedUi},null,2)+'\n',{flag:'wx'});
  for(let p=1;p<=pdf.getPageCount();p++)raster(file,p,path.join(dir,`${documentId}-${instance}-page-${p}`));
  const reservedPixels=[];
  for(const field of formCensus.fields.filter(f=>reserved.includes(f.name)&&!f.flags?.includes('pushButton'))){
   for(const widget of field.widgets){
    if(!Number.isInteger(widget.pageIndex))continue;
    const page=widget.pageIndex+1,original=path.join(sourceRasterRoot,`${documentId}-source-${page}.png`),current=path.join(dir,`${documentId}-${instance}-page-${page}.png`),meta=await sharp(original).metadata();
    const [x0,y0,x1,y1]=widget.rect,scale=90/72;
    const left=Math.max(0,Math.ceil(x0*scale)+1),top=Math.max(0,Math.ceil(meta.height-y1*scale)+1),width=Math.min(meta.width-left,Math.floor((x1-x0)*scale)-2),height=Math.min(meta.height-top,Math.floor((y1-y0)*scale)-2);if(width<=0||height<=0)continue;
    const rect={left,top,width,height},a=await sharp(original).extract(rect).removeAlpha().raw().toBuffer(),b=await sharp(current).extract(rect).removeAlpha().raw().toBuffer();
    check(name+' reserved widget actual pixels '+field.name+page,()=>assert.equal(hash(b),hash(a)));
    reservedPixels.push({field:field.name,page,rect,sha256:hash(a)});
   }
  }
  const sourceInk=[];
  for(let page=1;page<=pdf.getPageCount();page++){
   const original=path.join(sourceRasterRoot,`${documentId}-source-${page}.png`),current=path.join(dir,`${documentId}-${instance}-page-${page}.png`),a=await sharp(original).removeAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(current).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual(a.info,b.info);
   const allowed=formCensus.fields.filter(f=>written.some(w=>w.field===f.name)||contract.fields.find(c=>c.field===f.name)?.actor==='source_ui_removed_at_finalization').flatMap(f=>f.widgets.filter(w=>w.pageIndex===page-1).map(w=>w.rect));
   const {width,height,channels}=a.info,scale=90/72,rects=allowed.map(([x0,y0,x1,y1])=>({x0:Math.floor(x0*scale)-2,x1:Math.ceil(x1*scale)+2,y0:Math.floor(height-y1*scale)-2,y1:Math.ceil(height-y0*scale)+2}));let differences=0;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(rects.some(r=>x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1))continue;const offset=(y*width+x)*channels;for(let c=0;c<channels;c++)if(a.data[offset+c]!==b.data[offset+c]){differences++;break;}}
   check(name+' unchanged source ink outside explicit writes/UI '+documentId+instance+page,()=>assert.equal(differences,0));sourceInk.push({page,sourceImageSha256:hash(read(original)),currentImageSha256:hash(read(current)),allowedRectangles:rects,differentPixelsOutsideAllowed: differences});
  }
  fs.writeFileSync(path.join(dir,`${documentId}-${instance}-source-ink.json`),JSON.stringify(sourceInk,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(dir,`${documentId}-${instance}-reserved-pixels.json`),JSON.stringify(reservedPixels,null,2)+'\n',{flag:'wx'});
 }
 const report={reviewOnly:true,generationAllowed:false,runtimeSelectable:false,protectedGenerationEstablished:false,recordSha256:prepared.recordSha256,mappingSha256:hash(JSON.stringify(prepared.mapping)),sourceInputs:prepared.sourceInputs,sources:transport.derivatives.map(d=>({documentId:d.formNumber,sourcePath:sources[d.formNumber],sourceSha256:spec.documents.find(s=>s.documentId===d.formNumber).sourceSha256,derivedSha256:d.derivedSha256,sourceUnchanged:d.sourceUnchanged,sourceGeometryUnchanged:d.comparison.pageGeometryIdentical,sourceFieldsUnchanged:d.comparison.enhancedTerminalSemanticsIdentical,sourceXfaUnchanged:d.comparison.officialXfa.sha256===d.comparison.derivedXfa.sha256})),artifacts:reportArtifacts};
 const reportPath=path.join(dir,'component-report.json');fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 const options={reportPath,reportSha256:hash(read(reportPath)),readBytes:read};
 for(const mutate of [r=>r.generationAllowed=true,r=>r.artifacts[0].written.pop(),r=>r.artifacts.reverse(),r=>r.sources[0].sourceGeometryUnchanged=false,r=>r.recordSha256='0'.repeat(64)]){const bad=structuredClone(report);mutate(bad);const data=Buffer.from(JSON.stringify(bad));await assert.rejects(()=>validate(prepared,{...options,variant:'full',locale:'en',reportSha256:hash(data),readBytes:f=>f===reportPath?data:read(f)}));checks.push(name+' refuses changed report');}
 await assert.rejects(()=>validate({...prepared},{...options,variant:'full',locale:'en'}));checks.push(name+' refuses invented preparation');
 for(const [variant,locale]of owner?(ownerFinalFullOnly?[['full',owner.browserCorrection.cohort.locale]]:[['full',owner.browserCorrection.cohort.locale],['court_only',owner.browserCorrection.cohort.locale]]):[['full','en'],['full','es'],['court_only','en']]){
  const result=await render(prepared,{...options,variant,locale}),file=path.join(dir,`${variant}-${locale}.pdf`);fs.writeFileSync(file,result.bytes,{flag:'wx'});
  check(name+' correct assembly '+variant+locale,()=>{assert.equal(result.coverage.some(c=>c.documentId==='participant-guide'),variant==='full');assert.equal(result.coverage.filter(c=>c.documentId==='JV-744A').length,prepared.mapping.attachmentCount);assert(!result.coverage.some(c=>c.documentId==='JV-745'||c.documentId.startsWith('CR-')));});
  for(const component of result.coverage.filter(c=>c.filedWithCourt)){const original=reportArtifacts.find(a=>a.documentId===component.documentId&&a.instance===component.instance);for(let p=1;p<=original.pages;p++){const prefix=path.join(dir,`${variant}-${locale}-${component.documentId}-${component.instance}-${p}`),actual=raster(file,component.fromPage+p-1,prefix),baseline=hash(read(path.join(dir,`${component.documentId}-${component.instance}-page-${p}.png`)));check(name+' court pixels '+prefix,()=>assert.equal(actual,baseline));pixelComparisons.push({file,page:component.fromPage+p-1,original:original.file,componentPage:p,sha256:actual});}}
  const guide=result.coverage.find(c=>c.documentId==='participant-guide');if(guide)for(let p=guide.fromPage;p<=guide.throughPage;p++)raster(file,p,path.join(dir,`${variant}-${locale}-guide-${p}`));
  artifacts.push({...result,bytes:undefined,file});
 }
 assert.equal(hash(read(priorPath)),priorHash);
}
for(const d of spec.documents)assert.equal(hash(read(sources[d.documentId])),d.sourceSha256);assert.equal(hash(read(host)),hostHash);
if(owner){assert.equal(hash(read(ownerPath)),ownerSha);assert.equal(hash(read(retainedPath)),'e0a6906fc71187d0e695002593b7819f4ecdc63943266e83879948866bbb7db9');verifyOwnerRuntime(owner,ownerManifest);if(ownerSourceApplicability)for(const capture of ownerCaptures)verifyOwnerPreparation(prepare(capture.record,bytes,read),capture);}
const receipt={status:'PASS_HELD_JUVENILE_REVIEW_ASSEMBLY',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingSourceChanges:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim().split('\n'),checks:checks.length,details:checks,artifacts,components,pixelComparisons,predecessor:predecessor?{path:process.argv[polishIndex+1],sha256:hash(read(process.argv[polishIndex+1])),scope:'Targeted viewer-chrome polish; existing transport and finalized components reused without rerunning either.'}:null,transportPath:path.join(output,'transport.json'),transportSha256:hash(read(path.join(output,'transport.json'))),sourceInputs:artifacts[0]?.coverage?Object.fromEntries(['src/lib/rcap/render/ca-prop64-juvenile-review-assembly.ts','scripts/test-ca-prop64-juvenile-review-assembly.mjs'].map(f=>[f,hash(read(f))])):{},...(owner?{ownerReceipt:{path:ownerPath,sha256:ownerSha,source:owner.source,labels:ownerCaptures.map(c=>c.label)},ownerOutputScope:ownerFinalFullOnly?'FINAL_RECORD_FULL_ACTUAL_LOCALE_ONLY':'PRIMARY_AND_FINAL_FULL_AND_COURT_ONLY',...(ownerSourceApplicability?{ownerSourceApplicability}:{}),retainedTransport:{path:retainedPath,sha256:hash(read(retainedPath)),scope:'Only exact unfilled derived sources and original source rasters reused. Every owner-filled component newly finalized.'}}:{}),limits:[owner?'Actual owner-saved records consumed only by this internal held review caller; no protected worker generation or authorized participant delivery established.':'Prospective synthetic document inputs are not protected owner saves.','Test-only exports reuse exact existing finalizer; no public worker consumer established.','No generation/admission/payment/delivery authority or qualified output/language approval.']};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:receipt.status,checks:checks.length,outputs:artifacts.length,courtPixelComparisons:pixelComparisons.length}));
