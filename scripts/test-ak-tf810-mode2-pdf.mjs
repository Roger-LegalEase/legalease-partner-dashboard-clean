// AK TF-810 MODE 2 official-source proof; moved from test-ak-courtview-contact.mjs.
// This suite requires the verified private corpus and refuses when it is absent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const C=await import('../src/lib/expungement-ai/ak-courtview-contact.ts');
const expectedGroundBoxes={"1":"Check Box1.0","2":"Check Box2.0","2a":"Check Box2.1","2b":"Check Box2.2","3":"Check Box3.0","3a":"Check Box3.1","3b":"Check Box3.2","4":"Check Box4.0","5":"Check Box5.0","6":"Check Box6.0","7":"Check Box7.0","8":"Check Box8.0","9":"Check Box8.1","10":"Check Box8.2"};
const B=await import('./build-census-v1-ak-courtview-set.mjs');
const {PDFDocument,PDFName,decodePDFRawStream}=await import('pdf-lib');
const {flattenedWidgets,drawnAt}=await import('./rcap-official-forms/pdf-flattened-widgets.mjs');
const {source:pdfSource,failures:sourceFailures}=B.resolveSource();assert(pdfSource,JSON.stringify(sourceFailures));
assert.equal(pdfSource.sha256,C.AK_TF810_CONTACT_SOURCE.sourceSha256);
const census=await B.censusOfSource(pdfSource);assert.deepEqual(census.unmapped,[]);assert.deepEqual(census.captionDrift,[]);
const {default:path}=await import('node:path'),{default:os}=await import('node:os');
const output=process.env.AK_TF810_TEST_OUTPUT_DIR??fs.mkdtempSync(path.join(os.tmpdir(),'ak-tf810-mode2-'));fs.mkdirSync(output,{recursive:true});
const reports=[];
async function inspectPdf(label,answers,expected,rule=null){
 const rendered=await B.renderFixture(pdfSource,census,'canonical',answers);
 const file=path.join(output,label+'.pdf');fs.writeFileSync(file,rendered.bytes);
 const appearances=await flattenedWidgets(file),marked=[];
 const originalPdf=await PDFDocument.load(pdfSource.bytes,{updateMetadata:false}),resultPdf=await PDFDocument.load(rendered.bytes,{updateMetadata:false});
 const decoded=(doc,ref)=>Buffer.from(decodePDFRawStream(doc.context.lookup(ref)).decode());
 for(const row of census.rows){
  const text=drawnAt(appearances,{page:row.page,rect:row.rect}).map(a=>new TextDecoder('windows-1252').decode(Buffer.from(a.text,'latin1'))).join('').trim();
  if(Object.values(expectedGroundBoxes).includes(row.name)){
   const at=drawnAt(appearances,{page:row.page,rect:row.rect});assert.equal(at.length,1);
   const normal=originalPdf.getForm().getCheckBox(row.name).acroField.getWidgets()[0].getAppearances().normal;
   const on=normal.entries().find(([key])=>key.toString()!=="/Off")[1],off=normal.get(PDFName.of('Off'));
   const page=resultPdf.getPage(at[0].page-1),resources=resultPdf.context.lookup(page.node.get(PDFName.of('Resources'))),objects=resultPdf.context.lookup(resources.get(PDFName.of('XObject')));
   const actual=decoded(resultPdf,objects.get(PDFName.of(at[0].appearance))),isOn=actual.equals(decoded(originalPdf,on));
   assert(actual.equals(decoded(originalPdf,expected.includes(row.name)?on:off)),label+'/'+row.name+'/exact official appearance');
   if(isOn)marked.push(row.name);
  }
  if(row.policy==='protect')assert.equal(text,'',label+'/protected/'+row.name);
  if(row.name==='rule')assert.equal(text,rule??'',label+'/rule');
 }
 assert.deepEqual(marked.sort(),[...expected].sort());
 assert.deepEqual(rendered.report.selectionsMarked.map(x=>x.field).sort(),[...expected].sort());
 reports.push({label,file,sha256:createHash('sha256').update(rendered.bytes).digest('hex'),marked,rule,unresolvedIds:rendered.ground.unresolvedIds});
 return rendered;
}
for(const choice of Object.keys(expectedGroundBoxes)){
 const main=choice.length===2&&/[ab]$/.test(choice)?choice[0]:choice;
 const expected=[expectedGroundBoxes[main],...(choice!==main?[expectedGroundBoxes[choice]]:[])];
 const explicit={ak_tf810_case_still_public:'Yes',ak_tf810_ground:main,...(choice!==main?{['ak_tf810_ground_'+main+'_detail']:choice}:{}),...(main==='10'?{ak_tf810_ground_rule:'Alaska Administrative Rule 40(a)'}:{})};
 const before=structuredClone(explicit),actual=await inspectPdf('ground-'+choice,explicit,expected,main==='10'?'Alaska Administrative Rule 40(a)':null);assert.deepEqual(explicit,before);
 if(main==='2'||main==='3')assert.equal(actual.ground.unresolvedIds.includes('ak_tf810_ground_'+main+'_detail'),choice===main);
}
for(const raw of ['', 'I am not sure', {value:'1',unknown:true}, ['1','2'], {value:'1',unknown:false,unexpected:true}]){
 const input={ak_tf810_case_still_public:'Yes',ak_tf810_ground:raw,case_outcome:'Acquitted',court_requirements_completed:'yes',ak_tf810_ground_2_detail:'2a'};
 const before=structuredClone(input);const out=await inspectPdf('unknown-'+reports.length,input,[]);
 assert(out.ground.unresolvedIds.includes(C.AK_TF810_GROUND_ID));assert.deepEqual(input,before);
}
await inspectPdf('no-explicit-choice',{ak_tf810_case_still_public:'Yes',case_outcome:'Acquitted',court_requirements_completed:'yes'},[]);
await inspectPdf('not-public-retained-choice',{ak_tf810_case_still_public:'No',ak_tf810_ground:'1'},[]);
const wrongSub=await inspectPdf('wrong-parent',{ak_tf810_case_still_public:'Yes',ak_tf810_ground:'2',ak_tf810_ground_2_detail:'3a'},['Check Box2.0']);assert(wrongSub.ground.unresolvedIds.includes('ak_tf810_ground_2_detail'));
const missingRule=await inspectPdf('missing-rule',{ak_tf810_case_still_public:'Yes',ak_tf810_ground:'10',ak_tf810_ground_rule:{value:'rule supplied but unknown',unknown:true}},['Check Box8.2']);assert(missingRule.ground.unresolvedIds.includes('ak_tf810_ground_rule'));
const longRule={ak_tf810_case_still_public:'Yes',ak_tf810_ground:'10',ak_tf810_ground_rule:'AS '+('participant-supplied citation '.repeat(100))};
const longRuleBefore=structuredClone(longRule),overflow=await inspectPdf('overlong-rule',longRule,['Check Box8.2']);
assert(overflow.ground.unresolvedIds.includes('ak_tf810_ground_rule'));assert.deepEqual(longRule,longRuleBefore);
// The protected save/history sequence is checked in the corpus-free companion.
await inspectPdf('changed-saved-choice',{ak_tf810_case_still_public:'Yes',ak_tf810_ground:'9',ak_tf810_ground_2_detail:'2b',ak_tf810_ground_3_detail:'3b',ak_tf810_ground_rule:'Alaska Administrative Rule 40(a)'},['Check Box8.1']);
assert.equal(reports.length,25);
fs.writeFileSync(path.join(output,'ground-readbacks.json'),JSON.stringify({sourceSha256:pdfSource.sha256,reports},null,2)+'\n');
console.log(JSON.stringify({status:'PASS_AK_TF810_MODE2_PDF',pdfCases:reports.length,output,sourceSha256:pdfSource.sha256,signatureAndClerkFieldsBlank:true,noInference:true,noPaymentOrFilingAuthority:true}));
