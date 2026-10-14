import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {PDFDocument,PDFName} from 'pdf-lib';
import sharp from 'sharp';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {prepareCaProp64JuvenileReviewAssembly:prepare,renderCaProp64JuvenileReviewAssembly:render,validateCaProp64JuvenileReviewComponents:validate}=await import('../src/lib/rcap/render/ca-prop64-juvenile-review-assembly.ts');
const {packetInformationPatch,protectedPacketDraftHash}=await import('../src/lib/expungement-ai/packet-information.ts');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(f),json=f=>JSON.parse(read(f)),normalize=s=>s.replace(/\s+/g,' ').trim();
const evidence=process.argv[2],output=process.argv[3];
assert(evidence&&path.isAbsolute(evidence)&&output&&path.isAbsolute(output),'existing evidence and fresh external output directories required');
assert(!path.resolve(output).startsWith(process.cwd()+path.sep));assert(!fs.existsSync(output),'preserve every existing output');
const physicalOutput=path.join(fs.realpathSync(path.dirname(output)),path.basename(output));assert(!physicalOutput.startsWith(fs.realpathSync(process.cwd())+path.sep));
const spec=json('data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json');
const sources=Object.fromEntries(spec.documents.map(d=>[d.documentId,path.join(evidence,d.documentId.toLowerCase().replace('-','')+'-official-v1.pdf')]));
const bytes=Object.fromEntries(Object.entries(sources).map(([k,p])=>[k,read(p)]));
for(const d of spec.documents)assert.equal(hash(bytes[d.documentId]),d.sourceSha256);
const host='scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs',hostHash=hash(read(host));
// Test-only visibility of the EXACT existing transport/finalizer bodies. No
// source rewrite, body substitution, new transport or production module export.
const shim='\nexport { runPikepdfBridge, enhancedFidelityContract, caFinalizerCensus, finalizeCaPrimaryFixture, strokedLineSegmentsFromBytes, proveStatutorySelectionsFromOutput };\n';
const loader=`let target,expected,shim;export function initialize(d){({target,expected,shim}=d)}export async function load(url,context,next){const result=await next(url,context);if(url!==target)return result;const{createHash}=await import('node:crypto');const original=String(result.source);if(createHash('sha256').update(original).digest('hex')!==expected)throw Error('Exact source exposure refused');return{...result,source:original+shim}}`;
register('data:text/javascript,'+encodeURIComponent(loader),{data:{target:pathToFileURL(path.resolve(host)).href,expected:hostHash,shim}});
const bridge=await import('../'+host);
const checks=[],artifacts=[],components=[],pixelComparisons=[];const check=(name,fn)=>{fn();checks.push(name);};
fs.mkdirSync(output);
const transport=bridge.runPikepdfBridge({mode:'create',writeScratch:true,scratchDir:path.join(output,'official-content-streams'),targets:spec.documents.map(d=>({formNumber:d.documentId,sourcePath:sources[d.documentId],sha256:d.sourceSha256,derivedPath:path.join(output,'derived-sources',d.documentId+'.pdf')}))});
for(const d of transport.derivatives){bridge.enhancedFidelityContract(d);check('source field matrix '+d.formNumber,()=>assert.deepEqual(transport.forms[d.formNumber].fields.map(f=>f.name).sort(),spec.documents.find(s=>s.documentId===d.formNumber).fields.map(f=>f.field).sort()));}
for(const d of transport.derivatives)for(let page=1;page<=transport.forms[d.formNumber].pageCount;page++)raster(d.derivedPath,page,path.join(output,`${d.formNumber}-source-${page}`));
fs.writeFileSync(path.join(output,'transport.json'),JSON.stringify({originalModule:host,originalModuleSha256:hostHash,exposureShim:shim,exposureShimSha256:hash(shim),loaderSha256:hash(loader),...transport},null,2)+'\n',{flag:'wx'});
function raster(file,page,prefix){execFileSync('pdftoppm',['-f',String(page),'-singlefile','-r','90','-png',file,prefix],{stdio:'pipe'});return hash(read(prefix+'.png'));}
const cohorts=[['completed','self_represented',0],['completed','attorney',7],['currently-serving','self_represented',2],['currently-serving','attorney',0]];
for(const [branch,role,additionalCount]of cohorts){
 const name=branch+'-'+role,dir=path.join(output,name);fs.mkdirSync(dir);
 const priorPath=path.join(evidence,`CONTACT-OWNER-RECORD-${branch}-${role}-en-v4.json`),prior=json(priorPath),priorHash=hash(read(priorPath));
 const transition=packetInformationPatch({protectedVerification:prior,answers:{ca_prop64_court_type:'juvenile',ca_prop64_age_at_offense:17}});assert(transition);
 const record=structuredClone(transition.protectedTransition.nextVerification);
 // Declared prospective fixture only, NOT an actual new owner save.
 Object.assign(record.draftSnapshot.packetAnswers,{ca_prop64_juvenile_case_name:'In the Matter of Jordan Avery Reyes',ca_prop64_juvenile_case_number:'0012-CR-0099',ca_prop64_juvenile_full_name:'Jordan Avery Reyes',ca_prop64_juvenile_date_of_birth:'1983-01-01',ca_prop64_juvenile_disposition:branch==='completed'?'completed':'probation',ca_prop64_juvenile_finding_date:'2000-02-01',ca_prop64_juvenile_finding_sections:['11357','11358'],ca_prop64_juvenile_additional_scope:additionalCount?'same_case_remedy':'none',...(additionalCount?{ca_prop64_juvenile_additional_count:additionalCount}:{})});
 for(let i=1;i<=additionalCount;i++)Object.assign(record.draftSnapshot.packetAnswers,{[`ca_prop64_juvenile_additional_${i}_date`]:`2000-03-${String(i).padStart(2,'0')}`,[`ca_prop64_juvenile_additional_${i}_conduct_date`]:`2000-02-${String(i).padStart(2,'0')}`,[`ca_prop64_juvenile_additional_${i}_sections`]:[i%2?'11360':'11359']});
 record.draftHash=protectedPacketDraftHash(record.draftSnapshot);const prepared=prepare(record,bytes,read);
 fs.writeFileSync(path.join(dir,'prospective-preparation.json'),JSON.stringify({classification:'SYNTHETIC_PROSPECTIVE_FACTS_NOT_OWNER_SAVE',priorPath,priorSha256:priorHash,record,prepared},null,2)+'\n',{flag:'wx'});
 const expected=[{documentId:'JV-744',instance:0},...Array.from({length:prepared.mapping.attachmentCount},(_,instance)=>({documentId:'JV-744A',instance})),{documentId:'JV-746',instance:0}],reportArtifacts=[];
 for(const item of expected){
  const {documentId,instance}=item,contract=spec.documents.find(d=>d.documentId===documentId),formCensus=transport.forms[documentId],derived=transport.derivatives.find(d=>d.formNumber===documentId);
  const written=prepared.mapping.sourceWrites.filter(w=>w.documentId===documentId&&w.instance===instance).map(({field,value,sourceFactId})=>({field,value,sourceFactId}));
  const textWrites=written.filter(w=>typeof w.value==='string'),facts=Object.fromEntries(textWrites.map((w,i)=>['juvenile.value_'+i,w.value])),explicitMappings=Object.fromEntries(textWrites.map((w,i)=>[w.field,'juvenile.value_'+i]));
  const variant={variantId:name+'-'+documentId+'-'+instance,routeKey:'CA:'+prepared.mapping.pathwayId,textControls:{},controlFacts:{},selections:written.filter(w=>w.value===true).map(w=>{const f=formCensus.fields.find(f=>f.name===w.field);const states=f.widgets.flatMap(w=>w.onStates??[]).filter(s=>s!=='Off');assert.equal(new Set(states).size,1);return{fieldName:w.field,onState:states[0]};})};
  const census=bridge.caFinalizerCensus(formCensus);
  const result=await bridge.finalizeCaPrimaryFixture({formCensus,variant,officialOptions:{sourceBytes:read(derived.derivedPath),expectedSha256:derived.derivedSha256,census,facts,explicitMappings,unwritableFields:census.filter(f=>!Object.hasOwn(explicitMappings,f.name)).map(f=>({field:f.name})),captionOnly:false,documentAcceptsFill:true,documentTextLines:[],maxFontSize:9,minFontSize:6,title:documentId,appearanceDispositions:new Map()}});
  const file=path.join(dir,`${documentId}-${instance}.pdf`);fs.writeFileSync(file,result.bytes,{flag:'wx'});
  const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}),selected=result.selectionReport.selections.map(s=>s.control);
  check(name+' exact written fields '+documentId+instance,()=>assert.deepEqual(result.report.written.map(w=>w.field).sort(),textWrites.map(w=>w.field).sort()));
  for(const w of textWrites)check(name+' printed '+w.sourceFactId+' '+documentId+instance,()=>assert.ok(normalize(text).includes(normalize(w.value))));
  const selectionProof=bridge.proveStatutorySelectionsFromOutput({outputSegments:await bridge.strokedLineSegmentsFromBytes(result.bytes),formCensus,variant,selectionReport:result.selectionReport,label:name+'/'+documentId+'/'+instance});
  const reserved=contract.fields.filter(f=>!written.some(w=>w.field===f.field)).map(f=>f.field);
  check(name+' reserved fields refused '+documentId+instance,()=>{for(const field of reserved)assert.ok(result.report.refused.some(r=>r.field===field));});
  const pdf=await PDFDocument.load(result.bytes,{updateMetadata:false});check(name+' static final form '+documentId+instance,()=>{assert.equal(pdf.getForm().getFields().length,0);assert(!pdf.catalog.has(PDFName.of('OpenAction')));assert(pdf.getPages().every(p=>(p.node.Annots()?.size()??0)===0));});
  const art={documentId,instance,file,sha256:hash(result.bytes),pages:pdf.getPageCount(),written,reservedFields:reserved,selectedControls:selected,sourceFieldCount:contract.fields.length,textObserved:true,reservedFieldsPreserved:true,selectionInkObserved:true};reportArtifacts.push(art);components.push(art);
  fs.writeFileSync(path.join(dir,`${documentId}-${instance}-finalizer.json`),JSON.stringify({report:result.report,selectionProof,sourceFidelity:derived,sourceWrites:written},null,2)+'\n',{flag:'wx'});
  for(let p=1;p<=pdf.getPageCount();p++)raster(file,p,path.join(dir,`${documentId}-${instance}-page-${p}`));
  const reservedPixels=[];
  for(const field of formCensus.fields.filter(f=>reserved.includes(f.name)&&!f.flags?.includes('pushButton'))){
   for(const widget of field.widgets){
    if(!Number.isInteger(widget.pageIndex))continue;
    const page=widget.pageIndex+1,original=path.join(output,`${documentId}-source-${page}.png`),current=path.join(dir,`${documentId}-${instance}-page-${page}.png`),meta=await sharp(original).metadata();
    const [x0,y0,x1,y1]=widget.rect,scale=90/72;
    const left=Math.max(0,Math.ceil(x0*scale)+1),top=Math.max(0,Math.ceil(meta.height-y1*scale)+1),width=Math.min(meta.width-left,Math.floor((x1-x0)*scale)-2),height=Math.min(meta.height-top,Math.floor((y1-y0)*scale)-2);if(width<=0||height<=0)continue;
    const rect={left,top,width,height},a=await sharp(original).extract(rect).removeAlpha().raw().toBuffer(),b=await sharp(current).extract(rect).removeAlpha().raw().toBuffer();
    check(name+' reserved widget actual pixels '+field.name+page,()=>assert.equal(hash(b),hash(a)));
    reservedPixels.push({field:field.name,page,rect,sha256:hash(a)});
   }
  }
  fs.writeFileSync(path.join(dir,`${documentId}-${instance}-reserved-pixels.json`),JSON.stringify(reservedPixels,null,2)+'\n',{flag:'wx'});
 }
 const report={reviewOnly:true,generationAllowed:false,runtimeSelectable:false,protectedGenerationEstablished:false,recordSha256:prepared.recordSha256,mappingSha256:hash(JSON.stringify(prepared.mapping)),sourceInputs:prepared.sourceInputs,sources:transport.derivatives.map(d=>({documentId:d.formNumber,sourcePath:sources[d.formNumber],sourceSha256:spec.documents.find(s=>s.documentId===d.formNumber).sourceSha256,derivedSha256:d.derivedSha256,sourceUnchanged:d.sourceUnchanged,sourceGeometryUnchanged:d.comparison.pageGeometryIdentical,sourceFieldsUnchanged:d.comparison.enhancedTerminalSemanticsIdentical,sourceXfaUnchanged:d.comparison.officialXfa.sha256===d.comparison.derivedXfa.sha256})),artifacts:reportArtifacts};
 const reportPath=path.join(dir,'component-report.json');fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 const options={reportPath,reportSha256:hash(read(reportPath)),readBytes:read};
 for(const mutate of [r=>r.generationAllowed=true,r=>r.artifacts[0].written.pop(),r=>r.artifacts.reverse(),r=>r.sources[0].sourceGeometryUnchanged=false,r=>r.recordSha256='0'.repeat(64)]){const bad=structuredClone(report);mutate(bad);const data=Buffer.from(JSON.stringify(bad));await assert.rejects(()=>validate(prepared,{...options,variant:'full',locale:'en',reportSha256:hash(data),readBytes:f=>f===reportPath?data:read(f)}));checks.push(name+' refuses changed report');}
 await assert.rejects(()=>validate({...prepared},{...options,variant:'full',locale:'en'}));checks.push(name+' refuses invented preparation');
 for(const [variant,locale]of [['full','en'],['full','es'],['court_only','en']]){
  const result=await render(prepared,{...options,variant,locale}),file=path.join(dir,`${variant}-${locale}.pdf`);fs.writeFileSync(file,result.bytes,{flag:'wx'});
  check(name+' correct assembly '+variant+locale,()=>{assert.equal(result.coverage.some(c=>c.documentId==='participant-guide'),variant==='full');assert.equal(result.coverage.filter(c=>c.documentId==='JV-744A').length,prepared.mapping.attachmentCount);assert(!result.coverage.some(c=>c.documentId==='JV-745'||c.documentId.startsWith('CR-')));});
  for(const component of result.coverage.filter(c=>c.filedWithCourt)){const original=reportArtifacts.find(a=>a.documentId===component.documentId&&a.instance===component.instance);for(let p=1;p<=original.pages;p++){const prefix=path.join(dir,`${variant}-${locale}-${component.documentId}-${component.instance}-${p}`),actual=raster(file,component.fromPage+p-1,prefix),baseline=hash(read(path.join(dir,`${component.documentId}-${component.instance}-page-${p}.png`)));check(name+' court pixels '+prefix,()=>assert.equal(actual,baseline));pixelComparisons.push({file,page:component.fromPage+p-1,original:original.file,componentPage:p,sha256:actual});}}
  const guide=result.coverage.find(c=>c.documentId==='participant-guide');if(guide)for(let p=guide.fromPage;p<=guide.throughPage;p++)raster(file,p,path.join(dir,`${variant}-${locale}-guide-${p}`));
  artifacts.push({...result,bytes:undefined,file});
 }
 assert.equal(hash(read(priorPath)),priorHash);
}
for(const d of spec.documents)assert.equal(hash(read(sources[d.documentId])),d.sourceSha256);assert.equal(hash(read(host)),hostHash);
const receipt={status:'PASS_HELD_JUVENILE_REVIEW_ASSEMBLY',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingSourceChanges:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim().split('\n'),checks:checks.length,details:checks,artifacts,components,pixelComparisons,transportPath:path.join(output,'transport.json'),transportSha256:hash(read(path.join(output,'transport.json'))),sourceInputs:artifacts[0]?.coverage?Object.fromEntries(['src/lib/rcap/render/ca-prop64-juvenile-review-assembly.ts','scripts/test-ca-prop64-juvenile-review-assembly.mjs'].map(f=>[f,hash(read(f))])):{},limits:['Prospective synthetic document inputs are not protected owner saves.','Test-only exports reuse exact existing finalizer; no public worker consumer established.','No generation/admission/payment/delivery authority or qualified output/language approval.']};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:receipt.status,checks:checks.length,outputs:artifacts.length,courtPixelComparisons:pixelComparisons.length}));
