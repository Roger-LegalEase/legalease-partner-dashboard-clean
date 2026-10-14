import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const R=await import('../src/lib/expungement-ai/ny-16059-case-records.ts');
const C=await import('../src/lib/expungement-ai/ny-16059-case-classification.ts');
const Q=await import('../src/lib/expungement-ai/ny-16059-case-questions.ts');
const H=await import('../src/lib/expungement-ai/ny-16059-sealing-history.ts');
const F=await import('../src/lib/expungement-ai/ny-16059-future-applications.ts');
const {ny16059ProtectedDocumentPreparation:before}=await import('../src/lib/expungement-ai/ny-16059-document-preparation.ts');
const {ny16059CurrentDocumentInputs:map,NY_CURRENT_REVIEW_SOURCE:source}=await import('../src/lib/expungement-ai/ny-16059-current-document-inputs.ts');
const {renderNewYork16059DocumentReview:render}=await import('../src/lib/rcap/render/new-york-16059-document-review.ts');
const sha=b=>createHash('sha256').update(b).digest('hex');
const original=JSON.parse(fs.readFileSync('scripts/fixtures/ny-16059-pre-case-records.json')).rows[0].verifiedRecord;
const item={id:'synthetic-ny-current-document-review',jurisdiction:'NY',artifactRefs:{}};
const patch=(record,answers)=>P.packetInformationPatch({existingItem:item,protectedVerification:record,answers})?.protectedTransition.nextVerification;
const makeCase=(id,number,county='Albany')=>{const c={...R.emptyNyCourtCaseRecord(id),caseNumbers:number,courtName:'Albany City Court',courtCounty:county,certificateStatus:'request_needed',convictions:[{...R.emptyNyConvictionRecord(id+'-conviction'),charge:'Petit larceny',section:'PL 155.25',grade:'Misdemeanor',convictionDate:'2009-12-01',sentences:[{...R.emptyNySentenceEvent(id+'-sentence'),sentenceDate:'2010-01-01',sentenceTerms:'Fine; no imprisonment',postSentenceCustody:'no'}]}]};for(const v of c.convictions){v.classification=C.withNyClassificationAnswer(v,'recordClass','misdemeanor');v.classification=C.withNyClassificationAnswer(v,'excluded',['none']);}return c;};
const first=makeCase('first',original.snapshot.packetAnswers.ny_16059_first_case_numbers);first.priorCaseReference='first';
const baseAnswers={ny_16059_additional_cases:'No',ny_16059_case_alias:'No',ny_16059_nysid_known:'No',ny_16059_future_application:'No',[H.NY_SEALING_HISTORY_ID]:H.encodeNySealingHistory({...H.emptyNySealingHistory(),prior16058Application:'no'}),[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords([first]),[Q.NY_FILING_CASE_ID]:'case:first',[R.NY_STATEMENT_ID]:{value:'I have supported my family and completed training.\nThese are my own reasons.',unknown:false}};
const current=patch(original,baseAnswers);assert(current);const raw=structuredClone(current),old=before(current),mapped=map(current);assert.equal(old.casePreparation.printedRowAssignments,null);assert.equal(old.casePreparation.widgetBindings,null);assert(mapped.writes.length);assert.deepEqual(current,raw);
let checks=0;const check=(fn)=>{fn();checks++;};
check(()=>{assert.equal(mapped.nysidDisposition,'not_supplied_follow_receiving_court_instructions');assert(!mapped.writes.some(w=>w.field==='NYSID'));assert.equal(mapped.eligibilityEstablished,false);assert.equal(mapped.legalTransactionCount,null);});
check(()=>{assert.equal(mapped.caseIds.length,1);assert(mapped.writes.some(w=>w.field.startsWith('5 Case')&&w.value===first.caseNumbers));assert(mapped.continuations[0].text.includes('PL 155.25'));});
check(()=>{assert(mapped.serviceObligations.every(o=>o.actualServer===null&&o.servicePerformed===null));assert(!mapped.writes.some(w=>/Server|Service|Affirmation/.test(w.field)));});
const known=patch(current,{ny_16059_case_alias:'Yes',ny_16059_case_alias_names:'Alex Example',ny_16059_nysid_known:'Yes',ny_16059_nysid_number:'00123456X'});
check(()=>{assert.equal(map(known).writes.find(w=>w.field==='NYSID').value,'00123456X');assert.equal(map(known).writes.find(w=>w.field==='AKA').value,'Alex Example');});
const hidden=patch(known,{ny_16059_case_alias:'No',ny_16059_nysid_known:'I am not sure'});
check(()=>{assert(!map(hidden).writes.some(w=>['AKA','NYSID'].includes(w.field)));assert.equal(hidden.draftSnapshot.packetAnswers.ny_16059_nysid_number,'00123456X');});
const second=makeCase('second','00002-A','Kings'),third=makeCase('third','SCI-00003B','Queens');third.certificateStatus='unavailable';third.certificateExplanation='The clerk could not locate the old disposition. I requested it twice.';
const many=patch(current,{ny_16059_additional_cases:'Yes',ny_16059_additional_case_numbers:'00002-A; SCI-00003B',[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords([first,second,third])});
check(()=>{assert.deepEqual(map(many).caseIds,['first','second','third']);assert(map(many).unresolved.includes('transaction_grouping_and_printed_row_allocation'));assert(map(many).continuations.find(c=>c.id==='case:third').text.includes(third.certificateExplanation));assert.equal(map(many).serviceObligations.length,3);});
const unknown=structuredClone(first);unknown.convictions[0].sentences[0].postSentenceCustody='unknown';unknown.convictions[0].sentences[0].releases=[{id:'inactive-release',releaseDate:'2015-01-01'}];
check(()=>assert(!map(patch(current,{[R.NY_CASE_RECORDS_ID]:R.encodeNyCourtCaseRecords([unknown])})).continuations[0].text.includes('2015-01-01')));
for(const mutation of [r=>r.draftHash='wrong',r=>{r.draftSnapshot.profileSourceFingerprint='wrong';r.draftHash=P.protectedPacketDraftHash(r.draftSnapshot);},r=>{r.draftSnapshot.jurisdiction='CA';r.draftHash=P.protectedPacketDraftHash(r.draftSnapshot);},r=>{r.draftSnapshot.pathwayId='wrong';r.draftHash=P.protectedPacketDraftHash(r.draftSnapshot);}])check(()=>{const bad=structuredClone(current);mutation(bad);assert.equal(map(bad),null);});
for(const[id,firstValue,secondValue,field]of [['participant_full_legal_name','Alex Current','Different Applicant','ApplicantName'],['participant_full_legal_name',{value:'Alex Current',unknown:false},'Different Applicant','ApplicantName'],['ny_16059_nysid_number','00123456X','00999999Y','NYSID'],['ny_16059_case_alias_names','Alex Example','Other Example','AKA']])check(()=>{const bad=structuredClone(known);bad.draftSnapshot.packetAnswers[id]=firstValue;bad.draftSnapshot.prefilledAnswers[id]=secondValue;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);const preserved=structuredClone(bad),m=map(bad);assert(m.conflictingOwnedFactIds.includes(id));assert(!m.writes.some(w=>w.field===field));assert.deepEqual(bad,preserved);});
for(const value of [{value:'Residual unknown',unknown:true},{value:'Invented known',unknown:false,unowned:true},['Array name']])check(()=>{const bad=structuredClone(current);bad.draftSnapshot.packetAnswers.participant_full_legal_name=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);assert(!map(bad)?.writes.some(w=>w.field==='ApplicantName'));});
const futureDetails={ny_16059_future_application:'Yes',ny_16059_future_case_numbers:'00004-F',ny_16059_future_court:'Albany City Court'};const fc={...F.emptyNyFutureCase('future-case'),source:'saved_future'};fc.savedReview=F.nyFutureCaseReview(F.nyFutureReferences(futureDetails),fc);
const future=patch(many,{...futureDetails,[F.NY_FUTURE_ID]:F.encodeNyFutureApplications({version:F.NY_FUTURE_CONTRACT,applications:[{id:'future-app',laws:['16059'],cases:[fc,{...F.emptyNyFutureCase('other-future'),caseNumbers:'00005-G',courtName:'Kings Criminal Court'}]}]})});
check(()=>{const v=map(future).continuations.find(c=>c.id==='future:future-app');assert(v.text.includes('00004-F')&&v.text.includes('00005-G'));assert.deepEqual(v.caseIds,['future-case','other-future']);assert.equal(v.execution,'unsigned_undated_unaffirmed');});
const longText=Array.from({length:90},(_,i)=>`Statement paragraph ${i+1}: I describe my own work, family responsibilities and education accurately.`).join('\n\n');
const long=patch(future,{[R.NY_STATEMENT_ID]:{value:longText,unknown:false}});
if(process.argv.includes('--inputs-only')){console.log(JSON.stringify({status:'PASS_NY_CURRENT_DOCUMENT_INPUTS',checks}));process.exit(0);}
const output=process.env.NY_CURRENT_REVIEW_OUTPUT??fs.mkdtempSync(path.join(os.tmpdir(),'ny-current-document-'));fs.mkdirSync(output,{recursive:true});const results=[];
const sourceHashBefore=sha(fs.readFileSync(source.path)),mapHashBefore=sha(fs.readFileSync(source.mappingPath));
const ownerBindings=[];
let scenarios=[['single-case',current],['many-cases-statement-continuation',long]];
if(process.argv.includes('--retained-owner-records')){
 const checkpoint=process.env.NY_RETAINED_OWNER_CHECKPOINT;assert(checkpoint,'Retained accepted NY checkpoint required');scenarios=[];
 const pins={en:{receipt:'3bc01a3b6af6dcada64495e9ccad70bea07f427b528c8d96ba73e56fb1af435d',record:'ed2e8b044611e661f87f1dbefdd7a83650e4fa95ac0b17c9aea63f77f6a39ff5'},es:{receipt:'98efb9a4b4bff99b1080c7dde1941d2d810cdbc2b6846db3def33f6dd9183918',record:'9886984fd3b933a261cf4045ba9e6cbc4c8191d1ce1a1905fa3af9a9139245a6'}};
 for(const[locale,pin]of Object.entries(pins)){
  const receiptPath=path.join(checkpoint,`NY-VENUE-OWNER-NY-${locale}-v8.json`),recordPath=path.join(checkpoint,`NY-VENUE-OWNER-RECORD-${locale}-v8.json`),receiptBytes=fs.readFileSync(receiptPath),recordBytes=fs.readFileSync(recordPath),receipt=JSON.parse(receiptBytes),record=JSON.parse(recordBytes);
  assert.equal(sha(receiptBytes),pin.receipt);assert.equal(sha(recordBytes),pin.record);assert.equal(receipt.status,'PASS');assert.equal(receipt.restored,true);assert(receipt.checks.every(c=>c.pass));assert.deepEqual(receipt.beforeFingerprints,receipt.afterFingerprints);assert.equal(receipt.runtimeSourceUnchanged,true);assert.equal(receipt.runtimeFunctionUnchanged,true);assert.equal(record.hash,receipt.preparation.recordHash);
  const manifestPath=path.join(checkpoint,receipt.runtimeManifest),manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);assert.equal(manifest.sourceManifestSha256,receipt.sourceManifestSha256);
  assert(P.protectedPacketInformationModelFor(record));assert(map(record));scenarios.push([`retained-owner-${locale}`,record]);ownerBindings.push({locale,classification:'reuse_of_previously_accepted_authenticated_owner_record_not_new_owner_journey',receiptPath,receiptSha256:pin.receipt,recordPath,recordSha256:pin.record,recordHash:record.hash,revision:record.revision,originalSourceCommit:receipt.source,manifestPath,manifestSha256:sha(manifestBytes),sourceManifestSha256:receipt.sourceManifestSha256});
 }
}
for(const[name,record]of scenarios){
 const oldRecord=structuredClone(record),r=await render(record),file=path.join(output,name+'.pdf');assert.deepEqual(record,oldRecord);fs.writeFileSync(file,r.bytes,{flag:'wx',mode:0o600});fs.writeFileSync(path.join(output,name+'.mapping.private.json'),JSON.stringify({...r,bytes:undefined},null,2)+'\n',{flag:'wx',mode:0o600});
 const geometry=JSON.parse(execFileSync('python',['-c',`import json,sys,pymupdf as fitz
from PIL import Image,ImageDraw,ImageChops
source=fitz.open(sys.argv[1]);target=fitz.open(sys.argv[2]);meta=json.load(open(sys.argv[3]));mapping=json.load(open(sys.argv[4]));rows=[]
fitz.TOOLS.mupdf_warnings(reset=True)
for i,page in enumerate(target):
 sourceindex=i if i<14 else (12 if any(s['page']==i+1 for s in meta['servicePages']) else 13)
 a=source[sourceindex].get_pixmap(alpha=False);b=page.get_pixmap(alpha=False);diff=ImageChops.difference(Image.frombytes('RGB',(a.width,a.height),a.samples),Image.frombytes('RGB',(b.width,b.height),b.samples));mask=Image.new('RGB',(a.width,a.height),'white');draw=ImageDraw.Draw(mask);draw.rectangle((0,a.height-20,a.width,a.height),fill='black')
 for f in meta['excludedPublisherControls']:
  if f['page']==sourceindex+1:
   x,y,r,b=f['rect'];draw.rectangle((x-1,y-1,r+1,b+1),fill='black')
 for w in meta['writes']:
  if w['page']==i+1:
   x,y,r,b=w['rect'];draw.rectangle((x-2,y-2,r+2,b+2),fill='black')
 assert ImageChops.multiply(diff,mask).getbbox() is None,('source ink changed',i+1)
 for x0,y0,x1,y1,word,*rest in page.get_text('words'):
  assert x0>=0 and y0>=0 and x1<=page.rect.width+.1 and y1<=page.rect.height+.1,('text clipped',i+1,word)
 rows.append({'page':i+1,'sourcePage':sourceindex+1,'outsideWriteReviewLabelAndNonprintingControlPixelsChanged':0})
 warnings=fitz.TOOLS.mupdf_warnings(reset=True);assert not warnings,warnings
print(json.dumps({'pages':rows,'warnings':warnings,'widgetAppearanceScope':'exact_original_source_vector_appearances'}))`,source.path,file,path.join(output,name+'.mapping.private.json'),source.mappingPath],{encoding:'utf8'}));
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});assert(text.includes('HELD REVIEW DRAFT'));assert(!text.includes('Reset Form'));assert(!text.includes('Print Form'));for(const service of r.servicePages)if(service.obligation)assert(text.includes(`Prospective service: ${service.obligation.county} County`));assert(r.input.caseIds.length>0);for(const c of r.input.prepared.casePreparation.records??[])assert(text.replace(/\s+/g,' ').includes(c.caseNumbers.replace(/\s+/g,' ')));assert.equal(r.sourceWidgetCount,84);assert.equal(r.preservedSourcePages,14);assert.equal(r.executionFieldsFilled,false);assert.equal(r.filingReady,false);assert.equal(r.deliveryAllowed,false);assert(!r.writes.some(w=>/AffirmationDay|AffirmationMonth|AffirmationYear|ServerName|ServerAddress|ServiceDate/.test(w.field)));
 if(name.startsWith('many')){for(const n of ['00002-A','SCI-00003B','00004-F','00005-G'])assert(text.includes(n));for(let i=1;i<=90;i++)assert(text.includes(`Statement paragraph ${i}:`));assert.equal(r.servicePages.length,3);assert(r.continuations.every(c=>c.execution==='unsigned_undated_unaffirmed'));assert(text.includes('The clerk could not locate'));}
 results.push({name,file,artifactSha256:r.artifactSha256,inputSha256:r.inputSha256,sourceSha256:r.sourceSha256,pages:r.preservedSourcePages+r.continuations.length+r.servicePages.length-1,continuations:r.continuations.map(c=>({sourceId:c.sourceId,page:c.page,caseIds:c.caseIds})),writes:r.writes.length,normalizedSourceSha256:r.normalizedSourceSha256,normalizationTool:r.normalizationTool,transport:r.transport,excludedPublisherControls:r.excludedPublisherControls,participantFieldAvailability:r.input.participantFieldAvailability,unresolved:r.input.unresolved,missingFactIds:r.input.missingFactIds,geometry});checks++;
}
assert.equal(sha(fs.readFileSync(source.path)),sourceHashBefore);assert.equal(sha(fs.readFileSync(source.mappingPath)),mapHashBefore);
for(const b of ownerBindings){assert.equal(sha(fs.readFileSync(b.recordPath)),b.recordSha256);assert.equal(sha(fs.readFileSync(b.receiptPath)),b.receiptSha256);}
const receipt={ownerBindings,status:'PASS_HELD_NY_CURRENT_SOURCE_DOCUMENT_REVIEW',checks,originalProtectedFixture:'scripts/fixtures/ny-16059-pre-case-records.json',originalFixtureSha256:sha(fs.readFileSync('scripts/fixtures/ny-16059-pre-case-records.json')),sourceHashBefore,mapHashBefore,outputs:results,newAuthenticatedRuns:0,sourceHostedEquivalence:false,qualifiedApproval:false,admission:false,delivery:false};fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt,null,2));
