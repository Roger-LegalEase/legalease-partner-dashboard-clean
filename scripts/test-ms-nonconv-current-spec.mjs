import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {FAMILY} from './build-census-v1-ms-nonconv-set.mjs';
import {sanitizePdfText,runComposedFamily} from './rcap-custom-pleading/composed-family-host.mjs';

// VF16 / RI-12: compare the actual family pages to the current specification.
const directory=path.join(process.cwd(),FAMILY.outDir),specPath=FAMILY.packetSpecification.path;
const specBytes=fs.readFileSync(specPath),spec=JSON.parse(specBytes),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const document=id=>spec.documents.find(d=>d.documentId===id),section=(id,kind)=>document(id).sections.find(s=>s.kind===kind);
const petition=document('ms-petition-for-expungement'),identity=section(petition.documentId,'pleading_identity_list');
const mcic=section('ms-proposed-order','confidential_identifier_addendum'),service=section('ms-service-and-attachments','service_certificate');
const facts=['case_caption_plaintiff_name','arrest_location','charge_classification','release_date_or_record_source','disposition_record_wording','name_used_at_arrest','aliases','social_security_number_last_four','race','sex','other_recordkeeping_agencies','mcic_identifier_delivery_method','mcic_identifier_method_confirmation_source'];
// Existing verification sheets, read from the rejected family before changing any builder/output byte.
const verificationHashes={canonical:'581070f2176dabbc91af9d1a92483b9d4d751aef1edf334bc10eefd8f9ef81a0',boundary:'69ae834bb3ba6839778ecbd35be181c0d8cbe0377a9ebe5573eaf2e8546308bf'};
const rows=[];const check=(name,value)=>rows.push({name,pass:Boolean(value)});
const normalize=s=>sanitizePdfText(s).replace(/\s+/g,' ').trim(),contains=(body,text)=>normalize(body).includes(normalize(text));
const bodyParts=(body,template)=>{let after=0;return template.split(/\{\{[^}]+\}\}/).filter(s=>s.trim()).every(part=>{const index=normalize(body).indexOf(normalize(part),after);if(index<0)return false;after=index+normalize(part).length;return true;});};
const maps=FAMILY.maps();
for(const fact of facts)for(const variant of ['canonicalRefusals','boundaryRefusals'])check(variant+' required-before-filing '+fact,maps.some(m=>m[variant].some(r=>r.field.endsWith('.'+fact)&&r.requiredBeforeFiling===true)));
// Lead 2026-10-19 16:48: impact is optional in every state, never a filing gate.
const originalFixtures=structuredClone(FAMILY.fixtures),marker='Synthetic participant-authored impact';
try {
 for(const [confirmed,narrative,printed,open]of [['Yes',marker,true,false],['No',marker,false,false],['No',undefined,false,false],['Yes','',false,true],['Yes',undefined,false,true],[undefined,marker,false,true],['I am not sure',marker,false,true]]){
  const facts={...originalFixtures.canonical,personal_impact_confirmed:confirmed,personal_impact_statement:narrative};
  FAMILY.fixtures.canonical=facts;FAMILY.fixtures.boundary=facts;
  const name='optional impact '+String(confirmed)+'/'+String(narrative),body=FAMILY.composedBody('primary_filing',facts),instructions=FAMILY.composedBody('instructions',facts),disclosures=FAMILY.participantInstructions([]),map=FAMILY.maps().find(m=>m.documentId==='primary_filing');
  check(name+' only confirmed supplied paragraph',body.includes(marker)===printed);
  check(name+' no placeholder',!body.includes('Your personal impact statement:'));
  check(name+' open item on instructions',instructions.includes('Optional personal impact statement not provided')===open);
  check(name+' open item in disclosures',disclosures.includes('Optional personal impact statement not provided')===open);
  check(name+' actual write only when supplied',map.canonicalWrites.some(w=>w.factId==='personal_impact_statement')===printed);
  check(name+' never required-before-filing',!map.canonicalRefusals.some(r=>r.field.endsWith('.personal_impact_statement')&&r.requiredBeforeFiling));
 }
} finally {FAMILY.fixtures.canonical=originalFixtures.canonical;FAMILY.fixtures.boundary=originalFixtures.boundary;}
const artifacts=JSON.parse(fs.readFileSync(path.join(directory,'reports/rendered-artifacts.json')));
for(const [fixture,values] of Object.entries(FAMILY.fixtures)){
 const bodies=Object.fromEntries(FAMILY.components.map(c=>[c.id,FAMILY.composedBody(c.id,values)]));
 const file=path.join(directory,'fixtures',fixture+'.pdf'),bytes=fs.readFileSync(file),text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
 const pages=text.split('\f');if(!pages.at(-1).trim())pages.pop();
 check(fixture+' no blank delivered pages',pages.every(page=>page.trim().length>0));
 const artifact=artifacts.artifacts.find(a=>a.fixture===fixture);assert(artifact);
 const output=Object.fromEntries(FAMILY.components.map(c=>[c.id,artifact.pageManifest.filter(p=>p.component===c.id).map(p=>pages[p.packetPage-1]).join('\n')]));
 check(fixture+' artifact digest from bytes',artifact.sha256===sha(bytes));check(fixture+' actual page count',artifact.pageCount===pages.length);
 for(const [surface,body] of [['builder',bodies],['saved PDF',output]]){
  const name=fixture+'/'+surface,p=body.primary_filing,o=body.proposed_order,a=body.attachment;
  for(const heading of ['What this packet is','Important limits'])check(name+' current cover '+heading,contains(body.cover_and_contents,document('ms-cover-and-contents').sections.find(s=>s.heading===heading).body));
  check(name+' Introduction',bodyParts(p,petition.sections.find(s=>s.heading==='Introduction').body));
  check(name+' Prayer',bodyParts(p,petition.sections.find(s=>s.heading==='Prayer for relief').body));
  check(name+' petition title',contains(p,'PETITION FOR EXPUNCTION OF RECORD'));
  check(name+' identity introduction',contains(p,identity.body));
  const identityList=normalize(p).split(normalize(identity.body))[1]?.split('THIRD.')[0]??'';
  for(const id of identity.fields)check(name+' identity label '+id,contains(identityList,identity.fieldLabels[id]));
  check(name+' both required exhibits',contains(p,'A certified copy of the disposition is attached as Exhibit A. A copy of the docket sheet is attached as Exhibit B.'));
  check(name+' docket Exhibit B',contains(a,'EXHIBIT B - IN EVERY CASE. A copy of the docket sheet'));
  check(name+' indictment no longer Exhibit B',!a.includes('EXHIBIT B - ONLY WHERE THE CASE WAS INDICTED'));
  check(name+' indictment conditional unlettered',contains(a,'CONDITIONAL, UNLETTERED: A copy of the indictment'));
  check(name+' clerk certification',contains(o,'CERTIFIED TRUE COPY')&&contains(o,section('ms-proposed-order','clerk_certification_block').body));
  const addendum=normalize(o).split(mcic.heading)[1]??'';
  check(name+' confidential processing warning',contains(addendum,mcic.body));
  check(name+' known date of birth reused in confidential addendum',contains(addendum,mcic.fieldLabels.date_of_birth+': '+values['participant.date_of_birth']));
  check(name+' Prayer does not duplicate field label',!normalize(p).includes('other recordkeeping agencies identified from the record: Other recordkeeping agencies identified from the record:'));
  for(const id of mcic.fields)check(name+' addendum label '+id,contains(addendum,mcic.fieldLabels[id]));
  check(name+' service current body',bodyParts(body.certificate_of_service,service.body));
  const orderIdentity=section('ms-proposed-order','pleading_identity_list');
  check(name+' order identity declaration',contains(o,orderIdentity.body));
  const orderIdentityList=normalize(o).split(normalize(orderIdentity.body))[1]?.split('IT IS THEREFORE ORDERED')[0]??'';
  for(const id of orderIdentity.fields)check(name+' public order identity '+id,contains(orderIdentityList,orderIdentity.fieldLabels[id]));
  check(name+' public order identity reuses date of birth',contains(orderIdentityList,orderIdentity.fieldLabels.date_of_birth+': '+values['participant.date_of_birth']));
  check(name+' public order SSN remains last-four/confidential reference',contains(orderIdentityList,'Provided in the confidential MCIC addendum; last four'));
  check(name+' certified transmission declaration',bodyParts(o,document('ms-proposed-order').sections.find(s=>s.heading==='Certified transmission').body));
  for(const id of ['primary_filing','proposed_order','certificate_of_service'])check(name+' plaintiff blank '+id,contains(body[id],'Plaintiff name exactly as shown on the docket:'));
  check(name+' no literal placeholders',!Object.values(body).some(s=>s.includes('{{')));
 }
 const verificationPages=pages.filter(page=>/^\s*VERIFICATION\s*$/m.test(page)&&page.trim().startsWith('IN THE'));
 check(fixture+' exactly one verification sheet',verificationPages.length===1);
 check(fixture+' verification caption uses docket plaintiff',verificationPages.length===1&&contains(verificationPages[0],'Plaintiff name exactly as shown on the docket:')&&!verificationPages[0].includes('STATE OF MISSISSIPPI'));
 // Only the explicitly repaired plaintiff caption may differ from the retained verification hash.
 const originalCaption=verificationPages[0]?.replace(/Plaintiff name exactly as shown on the docket:\s*\.{25}/,'STATE OF MISSISSIPPI');
 check(fixture+' verification oath and notarial sheet otherwise unchanged',verificationPages.length===1&&sha(originalCaption.replace(/\s+/g,' ').trim())===verificationHashes[fixture]);
}
const receipt=JSON.parse(fs.readFileSync(path.join(directory,'source-receipt.json'))),pin=receipt.compositionSources.find(s=>s.path===specPath);
check('receipt current specification',pin?.sha256===sha(specBytes)&&pin?.byteLength===specBytes.length);
check('artifact report current specification',artifacts.specificationConformance.specificationSha256===sha(specBytes)&&artifacts.specificationConformance.specificationByteLength===specBytes.length);
const orderMap=maps.find(m=>m.documentId==='proposed_order');
for(const variant of ['canonical','boundary']){
 check(variant+' verification plaintiff explicitly disclosed',maps.find(m=>m.documentId==='primary_filing')[variant+'Refusals'].some(r=>r.field.endsWith('.verification_plaintiff_name')&&r.requiredBeforeFiling));
 for(const id of section('ms-proposed-order','pleading_identity_list').fields.filter(id=>id!=='date_of_birth'))check(variant+' public order blank declared '+id,orderMap[variant+'Refusals'].some(r=>r.field.endsWith('.order_identity_'+id)&&r.requiredBeforeFiling));
 check(variant+' public order date of birth is owned fact',orderMap[variant+'Writes'].some(w=>w.field.endsWith('.order_identity_date_of_birth')&&w.factId==='participant.date_of_birth'));
}
const baseFailures=rows.filter(row=>!row.pass);
console.log(JSON.stringify({phase:'current-specification',checks:rows.length,failures:baseFailures}));
assert.equal(baseFailures.length,0,'default fixture/specification checks must pass before the mixed branch proof');
// Real saved-PDF counterexample: the boundary must not borrow canonical writes.
const branchDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'ms-nonconv-optional-branches-'));
console.log(JSON.stringify({optionalBranchDirectory:branchDirectory}));
const previousOutDir=FAMILY.outDir;
try {
 const narrative='My synthetic work history was affected by this record.';
 FAMILY.fixtures.canonical={...originalFixtures.canonical,personal_impact_confirmed:'Yes',personal_impact_statement:narrative};
 FAMILY.fixtures.boundary={...originalFixtures.boundary,personal_impact_confirmed:'No',personal_impact_statement:narrative};
 const held=structuredClone(FAMILY.fixtures);
 FAMILY.outDir=path.relative(process.cwd(),branchDirectory);
 const result=await runComposedFamily(FAMILY,[]);
 check('mixed optional branches complete without inventing a boundary write',result.status==='COMPLETED');
 check('mixed branch input answers preserved',JSON.stringify(FAMILY.fixtures)===JSON.stringify(held));
 for(const fixture of ['canonical','boundary']){
  const text=execFileSync('pdftotext',['-layout',path.join(branchDirectory,'fixtures',fixture+'.pdf'),'-'],{encoding:'utf8'});
  check(fixture+' confirmed narrative follows own branch in saved bytes',contains(text,narrative)===(fixture==='canonical'));
  check(fixture+' resolved branch has no optional-open-item disclosure',!text.includes('Optional personal impact statement not provided'));
 }
 const map=JSON.parse(fs.readFileSync(path.join(branchDirectory,'production-field-map.json')));
 check('mixed branch impact never becomes required-before-filing',!JSON.stringify(map.requiredBeforeFiling).includes('personal_impact_statement'));
} finally {FAMILY.outDir=previousOutDir;FAMILY.fixtures.canonical=originalFixtures.canonical;FAMILY.fixtures.boundary=originalFixtures.boundary;}
const failures=rows.filter(r=>!r.pass),report={status:failures.length?'FAIL':'PASS',checks:rows.length,failures,branchDirectory};
console.log(JSON.stringify(report));assert.equal(failures.length,0);
