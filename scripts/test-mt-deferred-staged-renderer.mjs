// Only new stage/scenario outputs. The accepted full-family PDFs are read-only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {protectedPacketDraftSeedFromAuthoritative:seedFor}=await import('../src/lib/expungement-ai/packet-information.ts');
const {renderMontanaDeferredDocumentReview:render}=await import('../src/lib/rcap/render/montana-deferred-document-renderer.ts');
const {MT_DEFERRED_CURRENT_DOCUMENT_CONTRACT:contract,montanaDeferredDocumentInputs:map}=await import('../src/lib/expungement-ai/mt-deferred-document-inputs.ts');
const {FIXTURES,OUTPUT,COMPONENTS}=await import('./build-census-v1-mt_deferred_dismissal-set.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
// Isolated provenance regression; keep original artifacts read-only and do not
// repeat an owner journey or the accepted stage campaign.
if(process.argv.includes('--contract-mutation-only')){
 const file=process.env.MT_RETAINED_OWNER_RECORD,artifact=process.env.MT_RETAINED_OWNER_ARTIFACT;
 assert(file&&artifact,'Exact retained protected record and artifact are required');
 const saved=read(file),before=structuredClone(saved),current={profile:getProfileByJurisdiction('MT'),profileAuthorityFingerprint:saved.draft.profileAuthorityFingerprint,contract:structuredClone(contract)};
 const originalHash=sha(JSON.stringify(current.contract)),pending=render(saved.draft,current);
 current.contract.track.untrustedMutation='caller changed after content binding';
 const mutatedHash=sha(JSON.stringify(current.contract)),result=await pending;
 assert.notEqual(mutatedHash,originalHash);assert.equal(result.contractSha256,originalHash);assert(result.bytes.equals(fs.readFileSync(artifact)));assert.deepEqual(saved,before);
 console.log(JSON.stringify({status:'PASS_ASYNC_CONTRACT_PROVENANCE',originalHash,mutatedHash,returned:result.contractSha256,retainedArtifactBytesIdentical:true,newArtifactsWritten:0}));process.exit(0);
}
// Reuse only a completed authenticated owner's protected records. No database,
// browser, source fixture installation or generation/delivery authorization.
if(process.argv.includes('--owner-es-successors')){
 const receiptPath=process.env.MT_OWNER_ES_RECEIPT,expectedReceiptSha=process.env.MT_OWNER_ES_RECEIPT_SHA256,output=process.env.MT_OWNER_ES_SUCCESSOR_OUTPUT;
 assert(receiptPath&&/^[a-f0-9]{64}$/.test(expectedReceiptSha??'')&&output,'Exact accepted ES owner receipt/hash and new output directory are required');
 const receiptBytes=fs.readFileSync(receiptPath);assert.equal(sha(receiptBytes),expectedReceiptSha);const owner=JSON.parse(receiptBytes);
 assert.equal(owner.status,'PASS');assert.equal(owner.restored,true);assert.deepEqual(owner.cleanupErrors,[]);for(const flag of ['headUnchanged','runtimeSourceUnchanged','runtimeFunctionUnchanged','runtimeFixtureUnchanged'])assert.equal(owner[flag],true,flag);
 assert.deepEqual(owner.beforeFingerprints,owner.afterFingerprints);assert.equal(Object.keys(owner.beforeFingerprints).length,3);
 assert.equal(owner.browserCorrection.status,'PASS');assert(owner.checks.every(c=>c.pass));
 const {protectedPacketDraftHash}=await import('../src/lib/expungement-ai/packet-information.ts');
 const {montanaDeferredParticipantInstructions:instructions}=await import('../src/lib/expungement-ai/mt-deferred-participant-instructions.ts');
 const expectedNames=['court-expired','court-terminated','doj-after-order'];assert.deepEqual(owner.internalReviewArtifacts.map(a=>a.name),expectedNames);
 fs.mkdirSync(output,{recursive:true});assert(!fs.existsSync(path.join(output,'receipt.json')),'Preserve previous ES successor evidence');
 const results=[],protectedSources=[];const normalize=s=>s.replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\s+/g,' ').trim();
 for(const prior of owner.internalReviewArtifacts){
  assert.equal(prior.origin,'current_authenticated_owner_record');assert.equal(prior.ownerReadHttp,200);assert.equal(prior.delivery,false);assert.equal(prior.admission,false);
  assert.equal(path.dirname(prior.privateEvidenceStem),path.dirname(receiptPath));
  const protectedPath=prior.privateEvidenceStem+'.protected.private.json',protectedBytes=fs.readFileSync(protectedPath),saved=JSON.parse(protectedBytes),oldPdfPath=prior.privateEvidenceStem+'.pdf',oldPdf=fs.readFileSync(oldPdfPath),oldMap=JSON.parse(fs.readFileSync(prior.privateEvidenceStem+'.mapping.private.json'));
  assert.equal(sha(JSON.stringify(saved)),prior.protectedRecordSha256);assert.equal(saved.draftHash,prior.protectedDraftHash);assert.equal(protectedPacketDraftHash(saved.draft),saved.draftHash);assert.equal(saved.revision,prior.protectedRevision);assert.notEqual(saved.status,'verified');assert.equal(saved.hash,null);assert.equal(saved.snapshot,null);assert.equal(saved.draft.paymentAllowed,false);assert.equal(sha(oldPdf),prior.artifactSha256);
  const current={profile:getProfileByJurisdiction('MT'),profileAuthorityFingerprint:saved.draft.profileAuthorityFingerprint,contract};
  const before=structuredClone(saved),english=await render(saved.draft,current),spanish=await render(saved.draft,current,{instructionLocale:'es'}),text=execFileSync('pdftotext',['-layout','-','-'],{input:spanish.bytes,encoding:'utf8'}),companion=instructions(saved.draft,current);
  assert.deepEqual(saved,before);assert(english.bytes.equals(oldPdf),'Default English bytes must equal the accepted owner artifact');assert.equal(english.inputSha256,prior.inputSha256);assert.equal(english.contractSha256,prior.contractSha256);assert.equal(spanish.inputSha256,prior.inputSha256);assert.equal(spanish.contractSha256,prior.contractSha256);assert.deepEqual(spanish.mapping.componentIds,prior.componentIds);assert.deepEqual(spanish.sourceBinding,prior.sourceBinding);
  assert.equal(spanish.instructionLocale,'es');assert.equal(spanish.instructionLanguageStatus,'draft_pending_qualified_language_review');assert.equal(spanish.qualifiedSpanishApproval,false);assert.equal(spanish.admissionGranted,false);assert.equal(spanish.generationAllowed,false);assert.equal(spanish.paymentAllowed,false);
  assert(text.includes('BORRADOR EN ESPAÑOL'));assert(text.includes('pendiente de revisión lingüística calificada'));for(const p of companion.paragraphs)assert(normalize(text).includes(normalize(p.es)),prior.name+': '+p.sourceId);
  const formPages=oldMap.pages.filter(p=>!p.component.endsWith('instructions-5'));assert.deepEqual(spanish.pages.filter(p=>!p.component.endsWith('instructions-5')),formPages);assert.deepEqual(spanish.writes,oldMap.writes);assert.deepEqual(spanish.blanks,oldMap.blanks);
  const file=path.join(output,prior.name+'-es.pdf');fs.writeFileSync(file,spanish.bytes,{flag:'wx',mode:0o600});fs.writeFileSync(path.join(output,prior.name+'-es.mapping.private.json'),JSON.stringify({...spanish,bytes:undefined},null,2)+'\n',{flag:'wx',mode:0o600});
  const raster=JSON.parse(execFileSync('python',['-c',`import pymupdf as fitz,json,sys,hashlib\na,b=map(fitz.open,sys.argv[1:3]);count=int(sys.argv[3]);rows=[]\nfor i in range(count):\n x=a[i].get_pixmap(alpha=False);y=b[i].get_pixmap(alpha=False);assert x.samples==y.samples,('court/DOJ page changed',i+1);rows.append({'page':i+1,'sha256':hashlib.sha256(x.samples).hexdigest()})\nfor i,p in enumerate(b):\n for x0,y0,x1,y1,word,*rest in p.get_text('words'):\n  assert x0>=0 and y0>=0 and x1<=p.rect.width+.1 and y1<=p.rect.height+.1,('outside page',i+1,word)\nprint(json.dumps(rows))`,oldPdfPath,file,String(formPages.length)],{encoding:'utf8'}));
  for(const[file,hash]of [[protectedPath,sha(protectedBytes)],[oldPdfPath,prior.artifactSha256]])assert.equal(sha(fs.readFileSync(file)),hash,'Retained owner evidence untouched');
  results.push({name:prior.name,sourceOwnerReceiptSha256:expectedReceiptSha,protectedRecordSha256:prior.protectedRecordSha256,protectedDraftHash:saved.draftHash,protectedRevision:saved.revision,currentMatterIdSha256:prior.currentMatterIdSha256,priorEnglishArtifactSha256:prior.artifactSha256,defaultEnglishBytesIdentical:true,spanishArtifactSha256:spanish.artifactSha256,file,inputSha256:spanish.inputSha256,contractSha256:spanish.contractSha256,instructionSource:spanish.instructionSource,instructionTextSha256:spanish.instructionTextSha256,unchangedFormPageRaster:raster,spanishInstructionPages:spanish.pages.filter(p=>p.component.endsWith('instructions-5')).map(p=>p.page)});
  protectedSources.push({path:protectedPath,sha256:sha(protectedBytes)});
  await assert.rejects(()=>render(saved.draft,current,{instructionLocale:'fr'}));
 }
 const result={status:'PASS_OWNER_BOUND_ES_INSTRUCTION_SUCCESSORS',sourceOwnerReceipt:receiptPath,sourceOwnerReceiptSha256:expectedReceiptSha,sourceOwnerCommit:owner.expectedHead,outputs:results,protectedSources,newAuthenticatedRuns:0,newDatabaseRuns:0,oldEnglishArtifactsRewritten:false,qualifiedSpanishApproval:false,independentVisualReview:'pending',delivery:false,admission:false};fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));process.exit(0);
}
const oldHashes=Object.fromEntries(['canonical','boundary','verdict-justice'].map(n=>[n,sha(fs.readFileSync(`${OUTPUT}/fixtures/${n}.pdf`))]));
assert.deepEqual(oldHashes,{canonical:'7352688df07d1181b2f584bb00909f1b785c570e330e855856088946daa098ac',boundary:'b2b116487cb07d3ceb3fe44d223faa56732ccd43c0b98c70d309bbfc69ac852f','verdict-justice':'158ba02a7934cdf9c9cf74748f108d1d86461ab77e3c59e69472d9c93c0a871b'});
const profile=getProfileByJurisdiction('MT'),group=read('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json').additionalSubgroups.find(g=>g.id==='MT-deferred-order-financial-witness-20261014');
const facts={...group.freshBaselineReproduction.base,financial_obligations:'No',mt_deferred_order_type:'deferred',mt_deferred_offense_grade:'felony',mt_deferred_term_status:'expired',mt_deferred_conditions_status:'yes',mt_deferred_financial_order_status:'paid',mt_deferred_revocation_petition:'no',mt_deferred_dismissal_order:'no'};
const seed=seedFor({authoritative:evaluate({jurisdiction:'MT',profileVersion:profile.profileVersion,matterId:'synthetic-mt-stage-output',answers:facts}),screeningAnswers:facts,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});
assert(seed);const current={profile,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint,contract};
const make=(fixture=FIXTURES[0])=>({...structuredClone(seed.snapshot),screeningAnswers:{...facts,mt_deferred_offense_grade:fixture.chargeClass},packetAnswers:{...Object.fromEntries(Object.entries(fixture).filter(([key])=>!['fixture','syntheticFixture'].includes(key))),revocationConfirmedByClerk:true}});
const out=process.env.MT_STAGED_OUTPUT_DIR??fs.mkdtempSync(path.join(os.tmpdir(),'mt-staged-document-'));
fs.mkdirSync(out,{recursive:true});assert(!fs.existsSync(path.join(out,'receipt.json')),'preserve prior output receipt');let controls=0;const receipts=[];
const normalize=s=>s.replace(/\s+/g,' ').trim();
async function output(name,snapshot){const raw=structuredClone(snapshot),r=await render(snapshot,current);assert.deepEqual(snapshot,raw);const file=path.join(out,name+'.pdf');fs.writeFileSync(file,r.bytes,{flag:'wx'});const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}),pages=text.split('\f');
 assert.equal(r.mapping.status,'mapped_for_review');for(const key of ['generationAllowed','paymentAllowed','verificationAuthority','admissionGranted'])assert.equal(r[key],false);
 assert(!text.includes('SYNTHETIC INTAKE FACTS'));assert(!text.includes('REVIEW ARTIFACT LIMIT'));assert(!text.includes('This record is sealed'));assert(!/DS-?100|DS-?200/.test(text));
 for(const w of r.writes){assert(normalize(pages[w.page-1]).includes(normalize(w.value)),name+':'+w.field);assert(w.x>=0&&w.y>=0&&w.width>0&&w.x+w.width<=613&&w.y+w.height<=793);}
 assert.deepEqual([...new Set(r.pages.map(p=>p.component))],r.mapping.componentIds);
 fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({...r,bytes:undefined},null,2)+'\n',{flag:'wx'});receipts.push({name,file,sha256:r.artifactSha256,stage:r.mapping.stage,pages:r.pages,writes:r.writes.length,blanks:r.blanks.length,sourceBinding:r.sourceBinding,inputSha256:r.inputSha256});controls++;return{r,text,file};}
const courtWithoutDojDates=make();delete courtWithoutDojDates.packetAnswers.dateOfBirth;delete courtWithoutDojDates.packetAnswers.arrestDate;
const canonical=await output('court-expired-canonical',courtWithoutDojDates);
assert(!canonical.r.pages.some(p=>p.component===COMPONENTS[3]));assert(canonical.text.includes('The period of deferral has expired.'));
for(const id of ['signature','date','executionPlace','serviceDate','serviceMethod','serverName','serverSignature','goodCause','statutoryFindings','orderDate','judgeSignature'])assert(canonical.r.blanks.some(b=>b.field===id));
// Actual final PDF rendering preserves all three accepted canonical court pages.
const raster=JSON.parse(execFileSync('python',['-c',`import pymupdf as fitz,json,sys,hashlib\na,b=map(fitz.open,sys.argv[1:]); r=[]\nfor i in range(3):\n x=a[i].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);y=b[i].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);assert x.samples==y.samples,('court page changed',i+1);r.append(hashlib.sha256(x.samples).hexdigest())\nprint(json.dumps(r))`,`${OUTPUT}/fixtures/canonical.pdf`,canonical.file],{encoding:'utf8'}));controls++;
for(const fixture of [FIXTURES[0],FIXTURES[2]]){const s=make(fixture);s.screeningAnswers.mt_deferred_term_status='terminated_by_order';s.packetAnswers.terminationOrderDate={value:'2024-05-06',unknown:false};const r=await output('court-terminated-'+fixture.chargeClass,s);assert(r.text.includes('05/06/2024'));assert(!r.text.includes('The period of deferral has expired.'));assert(r.text.includes('court already terminated'));assert(r.text.includes(fixture.chargeClass==='felony'?'FELONY BASIS':'MISDEMEANOR BASIS'));assert(r.r.blanks.some(b=>b.field==='orderDate'));
 for(const value of [undefined,'', {value:'2024-05-06',unknown:true},'2020-01-01','2030-01-01']){const broken=structuredClone(s);broken.packetAnswers.terminationOrderDate=value;await assert.rejects(()=>render(broken,current));controls++;}}
for(const fixture of [FIXTURES[0],FIXTURES[1]]){const s=make(fixture);s.screeningAnswers.mt_deferred_dismissal_order='yes';for(const id of ['sentencingDate','courtName','caseNumber','prosecutorAddress','prosecutorEmail','pleaOrVerdict'])delete s.packetAnswers[id];const r=await output('doj-after-order-'+fixture.fixture,s);assert.equal(r.r.pages.filter(p=>p.component===COMPONENTS[3]).length,2);assert(!r.text.includes('PROPOSED ORDER'));assert(!r.text.includes('FILE FIRST, THEN SERVE.'));assert(!r.r.writes.some(w=>['signature','signatureDate','optionalLast4SSN','misdemeanorExpungement','marijuanaExpungement','nonConvictionRemoval'].includes(w.field)));assert(r.r.writes.some(w=>w.field==='deferredImposition'&&w.value==='X'));
 const address=r.r.writes.filter(w=>w.field.startsWith('address')).map(w=>w.value).join(' ');assert.equal(normalize(address),normalize(fixture.mailingAddress));assert(r.text.includes('Original Court Judgment'));assert(r.text.includes('Court Order Dismissing'));assert(r.text.includes('2225 11th'));}
for(const[id,value]of [['citizenshipConfirmed',false],['denialQuestion',true],['earlyTermination',true],['localFormOverride',true],['disputedCompletion',true],['revocationConfirmedByClerk',false]]){const s=make();s.packetAnswers[id]=value;await assert.rejects(()=>render(s,current));controls++;}
const unsupported=make();unsupported.profileSourceFingerprint='changed';await assert.rejects(()=>render(unsupported,current));controls++;
const protectedBlanks=make();Object.assign(protectedBlanks.packetAnswers,{judgeSignature:'UNAUTHORIZED_SIGNATURE',signature:'UNAUTHORIZED_SIGNATURE',serviceDate:'UNAUTHORIZED_DATE',optionalLast4SSN:'UNAUTHORIZED_SSN'});const r=await render(protectedBlanks,current);assert.equal(r.artifactSha256,canonical.r.artifactSha256);controls++;
// Compare saved DOJ pixels outside measured writes to the exact retained blank
// source. Reserved signatures/SSN/other checkbox ink must remain untouched.
const sourceInk=JSON.parse(execFileSync('python',['-c',`import pymupdf as fitz,json,sys,hashlib
from PIL import Image,ImageChops,ImageDraw
source=fitz.open(sys.argv[1]);results=[]
for target in sys.argv[2:]:
 d=fitz.open(target);meta=json.load(open(target[:-4]+'.json'));counts=[]
 for i in range(2):
  a=source[i].get_pixmap(alpha=False);b=d[i].get_pixmap(alpha=False)
  original=Image.frombytes('RGB',(a.width,a.height),a.samples);actual=Image.frombytes('RGB',(b.width,b.height),b.samples)
  diff=ImageChops.difference(original,actual);mask=Image.new('L',original.size,255);draw=ImageDraw.Draw(mask)
  for w in meta['writes']:
   if w['page']==i+1 and w['component'].endswith('primary-filing-4'):
    x,y,width,height=w['x'],w['y'],w['width'],w['height'];draw.rectangle([x-1,a.height-y-height-2,x+width+1,a.height-y+2],fill=0)
  diff.putalpha(mask);outside=ImageChops.multiply(diff.convert('RGB'),Image.merge('RGB',(mask,mask,mask)));assert not outside.getbbox(),('source ink changed outside writes',target,i+1)
  counts.append(hashlib.sha256(a.samples).hexdigest())
 results.append({'file':target,'sourcePages':counts,'outsideWritePixelsChanged':0})
print(json.dumps(results))`,`${OUTPUT}/source-derived/doj-unfilled.pdf`,...receipts.filter(r=>r.stage==='doj_after_order').map(r=>r.file)],{encoding:'utf8'}));controls++;
for(const[n,hash]of Object.entries(oldHashes))assert.equal(sha(fs.readFileSync(`${OUTPUT}/fixtures/${n}.pdf`)),hash);
const receipt={status:'PASS_INTERNAL_MT_STAGED_OUTPUTS',controls,outputs:receipts,retainedCourtRasterSha256:raster,sourceInk,originalArtifactsPreserved:oldHashes,sourceMappingOnly:true,admissionGranted:false,authenticatedDelivery:false,independentVisualReview:'pending'};fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({...receipt,outputs:receipts.map(r=>({name:r.name,file:r.file,sha256:r.sha256}))},null,2));
