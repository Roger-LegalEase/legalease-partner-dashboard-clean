import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {prepareCaProp64ReviewAssembly:prepare,validateCaProp64ReviewComponents:validate,renderCaProp64ReviewAssembly:render}=await import('../src/lib/rcap/render/ca-prop64-review-assembly.ts');
const {packetInformationPatch}=await import('../src/lib/expungement-ai/packet-information.ts');
const {caProp64ParticipantInstructions}=await import('./lib/ca-prop64-form-ownership.mjs');
const {renderSupplementalGuidePdf}=await import('../src/lib/rcap/supplemental/guide-renderer.ts');
const {supplementalGuideFor}=await import('../src/lib/rcap/supplemental/guide-registry.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const hash=b=>createHash('sha256').update(b).digest('hex'),readBytes=p=>fs.readFileSync(path.resolve(p)),readJson=p=>JSON.parse(readBytes(p));
const normalize=s=>s.replace(/\s+/g,' ').trim();
const directory=process.argv[2],output=process.argv[3],mappingOnly=process.argv.includes('--mapping-only');
assert(directory&&path.isAbsolute(directory),'existing CA contact evidence directory required');
const specFile='data/record-clearing/packet-specifications/drafts/CA-prop64-adult-review.v1.json',guideFile='data/record-clearing/supplemental-guides/drafts/CA-prop64-adult-review.v1.json';
const spec=readJson(specFile),guide=readJson(guideFile),baseline=readJson(path.join(directory,'CONTACT-RENDER-BASELINE-v1.json'));
const checks=[],fixtures=[];
const successorIndex=process.argv.indexOf('--es-successor-of');
const predecessor=successorIndex>=0?readJson(process.argv[successorIndex+1]):null;
if(predecessor){assert.equal(predecessor.status,'PASS_BOUNDED_REVIEW_ASSEMBLY');assert.equal(predecessor.artifacts.length,12);for(const a of predecessor.artifacts)assert.equal(hash(readBytes(a.file)),a.sha256);}
function check(name,fn){fn();checks.push(name);}
function preserved(){for(const [file,sha]of Object.entries(baseline.artifacts))assert.equal(hash(readBytes(file)),sha,'original prior artifact '+file);for(const f of fixtures)for(const a of f.report.artifacts)assert.equal(hash(readBytes(a.outputFile)),a.sha256);}
for(const name of ['completed-self_represented','completed-attorney','currently-serving-self_represented','currently-serving-attorney']){
 const inputPath=path.join(directory,'CONTACT-RENDER-INPUT-'+name+(name==='completed-self_represented'?'-en-v2.json':'-en-v1.json')),input=readJson(inputPath);
 const record=readJson(input.protectedRecordFile),before=JSON.stringify(record);
 const oldDirectory=name==='completed-self_represented'?path.join(directory,'contact-'+name+'-en-v2'):input.outputDirectory;
 const reportPath=path.join(oldDirectory,'caption-review.json'),report=readJson(reportPath),proof=readJson(path.join(oldDirectory,'protected-preparation.json'));
 check(name+' original owner snapshot custody binding',()=>assert.equal(hash(readBytes(input.protectedRecordFile)),proof.recordFileSha256));
 const prepared=prepare(record,readBytes),options={variant:'full',locale:'en',componentReportPath:reportPath,componentReportSha256:hash(readBytes(reportPath)),readBytes};
 check(name+' facts equal protected source and preserved source finalizer',()=>{assert.deepEqual(prepared.facts,proof.facts);assert.deepEqual(prepared.facts,report.inputFacts);});
 const validated=await validate(prepared,options);check(name+' exact three official components',()=>assert.equal(validated.documents.length,3));
 check(name+' held flags remain',()=>{assert.equal(prepared.reviewOnly,true);for(const k of ['generationAllowed','runtimeSelectable','filingReady'])assert.equal(prepared[k],false);});
 check(name+' no registered packet or guide authority',()=>{assert.equal(packetSpecificationFor(prepared.routeKey),undefined);assert.equal(supplementalGuideFor(prepared.routeKey),undefined);});
 for(const change of [r=>r.draftHash='0'.repeat(64),r=>{r.draftSnapshot.packetAnswers.participant_full_legal_name='Different person';},r=>{r.draftSnapshot.profileSourceFingerprint='0'.repeat(64);}]){const r=structuredClone(record);change(r);check(name+' snapshot/source mutation refused '+checks.length,()=>assert.throws(()=>prepare(r,readBytes)));}
 const altered=structuredClone(prepared);await assert.rejects(()=>validate(altered,options));checks.push(name+' caller-created preparation refuses');
 const saved=packetInformationPatch({protectedVerification:record,answers:{ca_prop64_court_type:'juvenile'}})?.protectedTransition.nextVerification;
 check(name+' actual protected juvenile correction does not use adult forms',()=>{assert.ok(saved);assert.throws(()=>prepare(saved,readBytes));});
 for(const change of [r=>r.variantId='hs-11361-8-other',r=>r.recordSection='11360',r=>r.inputFacts['matter.case_number']='Other case',r=>r.sourceFidelity[0].sourceSha256Before='0'.repeat(64),r=>r.artifacts.reverse(),r=>r.artifacts[0].finalizerWritten.push({field:'CR-403[0].judicialSignature',factId:'participant.full_legal_name'}),r=>r.artifacts[0].finalizerWritten.pop(),r=>r.artifacts[1].selectionReport.selections.push({control:'CR-401[0].invented-service'}),r=>r.artifacts[2].formState.xfaPresent=true,r=>r.knownFactsNotWritten.push('participant.phone'),r=>r.unresolved.push({factId:'participant.phone'}),r=>r.sourceCodeSha256['unbound.mjs']='0'.repeat(64)]){
  const r=structuredClone(report);change(r);const bytes=Buffer.from(JSON.stringify(r));await assert.rejects(()=>validate(prepared,{...options,componentReportSha256:hash(bytes),readBytes:p=>p===reportPath?bytes:readBytes(p)}));checks.push(name+' semantic component mismatch refused '+checks.length);
 }
 for(const file of [reportPath,report.artifacts[0].outputFile,report.sourceFidelity[0].sourcePath,...Object.keys(spec.sourceInputs)]){await assert.rejects(()=>validate(prepared,{...options,readBytes:p=>p===file?Buffer.concat([readBytes(p),Buffer.from('changed')]):readBytes(p)}));checks.push(name+' changed bound bytes refuse '+file);}
 for(const change of [{locale:undefined},{locale:'fr'},{variant:undefined},{variant:'other'}]){await assert.rejects(()=>validate(prepared,{...options,...change}));checks.push(name+' explicit variant/locale refusal '+JSON.stringify(change));}
 check(name+' raw protected record preserved',()=>assert.equal(JSON.stringify(record),before));
 fixtures.push({name,record,prepared,options,report,proof,inputPath,recordPath:input.protectedRecordFile,reportPath});
}
preserved();
check('retained CR400 note actually makes RAP optional',()=>{const text=execFileSync('pdftotext',['-layout',fixtures[0].report.sourceFidelity[0].sourcePath,'-'],{encoding:'utf8'});assert.ok(normalize(text).includes('but this is not required'));assert.ok(guide.nextSteps.some(e=>e.text.includes('CR-400 expressly says this is not required')));assert.equal(guide.sourceDiscrepancies.length,1);});
const originalInstructions=readBytes('data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/participant-instructions.md').toString();
const updatedInstructions=caProp64ParticipantInstructions({routeKeys:spec.branches.map(b=>'CA:'+b.pathwayId)},fixtures[0].report.fieldMap,{heldGuidance:originalInstructions.slice(originalInstructions.indexOf("## Where you file this, and by when"),originalInstructions.indexOf("## Caption and record information"))});
check('actual neutral caption successor described honestly',()=>{assert.ok(updatedInstructions.includes('structured-contact successor fills only its known neutral caption'));assert.ok(!updatedInstructions.includes('current fixtures leave this form unchanged'));assert.ok(updatedInstructions.includes('court-owned body remains blank'));});
const missingTranslation=structuredClone(guide);delete missingTranslation.nextSteps[0].textEs;
await assert.rejects(()=>renderSupplementalGuidePdf(missingTranslation,{locale:'es',verifiedAt:fixtures[0].prepared.capturedAt}),/no Spanish text/);checks.push('missing consequential Spanish translation refuses');
if(mappingOnly){console.log(JSON.stringify({status:'PASS',checks:checks.length,scope:'Pure protected preparation/component bindings and refusals only; no new PDF rendered',preservedComponentPdfs:12,preservedPriorArtifacts:Object.keys(baseline.artifacts).length}));process.exit(0);}
// This isolated synthetic layout probe compares the actual prior renderer; it
// does not regenerate any accepted participant packet or official component.
if(predecessor){
 const {transpileModule,ModuleKind,ScriptTarget}=await import('typescript');
 const {pathToFileURL}=await import('node:url');
 const oldSource=execFileSync('git',['show','a707569c3:src/lib/rcap/supplemental/guide-renderer.ts'],{encoding:'utf8'})
  .replace('"../grade-a/renderer"',JSON.stringify(pathToFileURL(path.resolve('src/lib/rcap/grade-a/renderer.ts')).href))
  .replace('from "pdf-lib"','from '+JSON.stringify(import.meta.resolve('pdf-lib')));
 const compiled=transpileModule(oldSource,{compilerOptions:{module:ModuleKind.ESNext,target:ScriptTarget.ES2022}}).outputText;
 const oldRenderer=(await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))).renderSupplementalGuidePdf;
 const synthetic=structuredClone(guide);synthetic.routeKey='CA:isolated-layout-probe';
 const options={locale:'en',verifiedAt:'2026-10-13T00:00:00.000Z',matter:{preparedFor:'Synthetic layout probe'}};
 const original=await oldRenderer(synthetic,options),current=await renderSupplementalGuidePdf(synthetic,options),disabled=await renderSupplementalGuidePdf(synthetic,{...options,keepFilingChecklistItemsTogether:false});
 check('synthetic omitted and false defaults exactly match prior renderer bytes',()=>{assert.equal(hash(current),hash(original));assert.equal(hash(disabled),hash(original));});
 const {PDFDocument}=await import('pdf-lib');
 synthetic.filingChecklist=Array.from({length:35},(_,i)=>({text:`Checklist item ${i}: `+'Preserve the complete source paragraph. '.repeat(5),textEs:'Conserve todo el texto.',provenance:{kind:'authoritative_source',cite:'isolated layout probe'}}));
 const oversized=await renderSupplementalGuidePdf(synthetic,{...options,keepFilingChecklistItemsTogether:true});
 check('oversized checklist preserves readable multi-page fallback',()=>assert.ok(oversized.length));
 const pdf=await PDFDocument.load(oversized);check('oversized checklist actually creates continuation pages',()=>assert.ok(pdf.getPageCount()>4));
 const oversizedPages=execFileSync('pdftotext',['-layout','-','-'],{input:oversized,encoding:'utf8'}).split('\f');
 check('oversized group preserves every complete item on one page',()=>{for(const entry of synthetic.filingChecklist)assert.equal(oversizedPages.filter(page=>normalize(page).includes(normalize(entry.text))).length,1);});
 synthetic.filingChecklist=[{...synthetic.filingChecklist[0],text:'Long source paragraph. '.repeat(500)}];
 const longItem=await renderSupplementalGuidePdf(synthetic,{...options,keepFilingChecklistItemsTogether:true});
 const longText=execFileSync('pdftotext',['-layout','-','-'],{input:longItem,encoding:'utf8'});
 check('single over-page item preserves every word across page chrome without truncation',()=>{for(const word of ['Long','source','paragraph'])assert.equal((longText.match(new RegExp('\\b'+word+'\\b','g'))||[]).length,500);});
}
assert(output&&path.isAbsolute(output)&&!fs.existsSync(output),'fresh external output required');assert(!path.resolve(output).startsWith(fs.realpathSync('.')+path.sep));fs.mkdirSync(output,{recursive:true});
const artifacts=predecessor?predecessor.artifacts.filter(a=>a.locale!=='es'):[],pixels=[];
const combinations=predecessor?[['full','es']]:[['full','en'],['full','es'],['court_only','en']];
function raster(file,page,prefix){execFileSync('pdftoppm',['-f',String(page),'-l',String(page),'-singlefile','-r','96','-png',file,prefix]);return hash(readBytes(prefix+'.png'));}
for(const f of fixtures)for(const [variant,locale]of combinations){
 const assembled=await render(f.prepared,{...f.options,variant,locale}),name=f.name+'-'+variant+'-'+locale,file=path.join(output,name+'.pdf');
 fs.writeFileSync(file,assembled.bytes,{flag:'wx'});const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});fs.writeFileSync(file.replace(/\.pdf$/,'.txt'),text,{flag:'wx'});const pages=text.split('\f').filter(x=>x.trim());
 check(name+' page count',()=>assert.equal(pages.length,assembled.pages));
 check(name+' exact component order',()=>assert.deepEqual(assembled.coverage.filter(c=>c.filedWithCourt).map(c=>c.documentId),['CR-400','CR-401','CR-403']));
 const guideCoverage=assembled.coverage.find(c=>c.documentId==='participant-guide');
 check(name+' full versus court-only boundary',()=>{assert.equal(Boolean(guideCoverage),variant==='full');if(variant==='court_only'){assert.equal(pages.length,4);assert.ok(!text.includes('KEEP FOR YOUR RECORDS')&&!text.includes('CONSERVE ESTE DOCUMENTO'));}else{assert.ok(pages[0].includes(locale==='es'?'Su paquete para limpiar antecedentes':'Your record-clearing packet'));assert.ok(normalize(pages[0]).includes(f.prepared.facts['participant.full_legal_name']));assert.ok(normalize(pages[0]).includes(f.prepared.facts['matter.case_number']));assert.ok(normalize(pages[0]).includes('Yolo'));}});
 if(variant==='full'){
  if(predecessor)check(name+' every checklist item remains whole on one page',()=>{for(const entry of guide.filingChecklist){const expected=normalize(locale==='es'?entry.textEs:entry.text);assert.equal(pages.filter(page=>normalize(page).includes(expected)).length,1);}});
  check(name+' actual guide optional RAP and source actor guidance',()=>{assert.ok(normalize(text).includes(locale==='es'?'CR-400 indica expresamente que no es obligatorio':'CR-400 expressly says this is not required'));assert.ok(text.includes('CR-402'));});
  for(let page=1;page<=guideCoverage.throughPage;page++)raster(file,page,path.join(output,name+'-guide-'+page));
 }
 for(const coverage of assembled.coverage.filter(c=>c.filedWithCourt)){
  const old=f.report.artifacts.find(a=>a.formNumber===coverage.documentId),oldPages=execFileSync('pdftotext',['-layout',old.outputFile,'-'],{encoding:'utf8'}).split('\f').filter(p=>p.trim());
  for(let p=0;p<old.pageCount;p++){
   const actualPage=coverage.fromPage+p;
   check(name+' exact '+old.formNumber+' page '+(p+1)+' text',()=>assert.equal(normalize(pages[actualPage-1]),normalize(oldPages[p])));
   const original=raster(old.outputFile,p+1,path.join(output,name+'-'+old.formNumber+'-original-'+(p+1))),current=raster(file,actualPage,path.join(output,name+'-'+old.formNumber+'-assembled-'+(p+1)));
   check(name+' exact '+old.formNumber+' page '+(p+1)+' pixels',()=>assert.equal(current,original));pixels.push({name,formNumber:old.formNumber,componentPage:p+1,packetPage:actualPage,originalSha256:original,assembledSha256:current});
  }
 }
 artifacts.push({...assembled,bytes:undefined,sourcePreparation:undefined,name,file,sourceRecordPath:f.recordPath,sourceRecordSha256:hash(readBytes(f.recordPath))});
}
preserved();
const sourcePaths=[specFile,guideFile,'src/lib/rcap/render/ca-prop64-review-assembly.ts','scripts/test-ca-prop64-review-assembly.mjs','src/lib/expungement-ai/ca-prop64-document-preparation.ts','src/lib/expungement-ai/ca-prop64-caption-facts.ts','src/lib/expungement-ai/ca-prop64-contact-questions.ts','src/lib/expungement-ai/ca-prop64-contact-answer.ts','src/lib/expungement-ai/packet-information.ts','src/lib/rcap/supplemental/guide-renderer.ts','src/lib/rcap/supplemental/guide-contract.ts',...Object.keys(spec.sourceInputs)];
const receipt={status:'PASS_BOUNDED_REVIEW_ASSEMBLY',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:checks.length,details:checks,artifacts,pixels,sourceBindings:Object.fromEntries(sourcePaths.map(p=>[p,hash(readBytes(p))])),preservedPriorArtifacts:baseline.artifacts,preservedComponents:fixtures.flatMap(f=>f.report.artifacts.map(a=>({file:a.outputFile,sha256:a.sha256,formNumber:a.formNumber}))),translationProvenance:guide.translationProvenance,predecessor:predecessor?{file:process.argv[successorIndex+1],sha256:hash(readBytes(process.argv[successorIndex+1])),reusedArtifacts:8,newArtifacts:4,reason:'Spanish checklist orphan pagination; exact source paragraphs grouped without copy/font changes'}:null,limits:['Held review consumer only; no runtime registry, canonical admission, protected generation, worker execution, authorized delivery, payment or filing-ready claim.','Adult current-serving/completed branches and two filer roles only; juvenile sources and specific contact accommodations remain separate work.','Source-bound draft guide and exact output bytes require applicable independent and qualified legal/language/output review.','Original owner campaign is reused, not reexecuted; new outputs consume the original protected records and source-finalizer evidence.']};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:receipt.status,checks:receipt.checks,artifacts:artifacts.map(a=>({name:a.name,sha256:a.sha256,pages:a.pages})),pixelComparisons:pixels.length}));
