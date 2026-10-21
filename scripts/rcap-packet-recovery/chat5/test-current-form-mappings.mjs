import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
// A46(a): current-source field mapping only. Existing law-version holds remain.
const root=fileURLToPath(new URL('../../../',import.meta.url));
const evidence=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);
if(evidence)fs.mkdirSync(evidence,{recursive:true});
const mode='current';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourcePins={
 '072A':'04cb4661a198f7d4036a3cdf359d65db0f28b419fba7b18940322d67185b5e90',
 '072B':'47bc720acea515896943e94e1d228b3e8cc380b0ae1d4762dd1928f60f903667',
 '072D':'87465cb08d93f3469dc4fe7288360aaa650f21e2dee06ebd4f7f05a4998d2703'
};
const require=createRequire(root+'/package.json');const {PDFDocument}=require('pdf-lib');
const rows=[];const negative=[];let failures=0;
const defs=[['favorable','072A','fixtures','validateMdFavorable','renderMdFavorable'],['conviction','072B','convictionFixtures','validateMdConviction','renderMdConviction'],['cannabis','072D','cannabisFixtures','validateMdCannabis','renderMdCannabis']];
for(const [name,id,fixtureName,validate,render] of defs){
 const m=await import(pathToFileURL(root+'/scripts/rcap-packet-recovery/chat5/md-'+name+'.mjs'));
 const source=fs.readFileSync(root+'/reference/md-law-2026-10-21/CC-DC-CR-'+id+'.pdf');assert.equal(hash(source),sourcePins[id]);
 const official=await PDFDocument.load(source),names=new Set(official.getForm().getFields().map(f=>f.getName()));
 const renderWith=f=>m[render](f,name==='favorable'?source:{['CC-DC-CR-'+id]:source});
 const fixtures=m[fixtureName]();
 for(const [key,original] of Object.entries(fixtures)){
  const f=structuredClone(original),saved=structuredClone(f);
  try{
   const r=await renderWith(f);assert.deepEqual(f,saved);
   const primary=name==='favorable'?r:r.components.find(c=>c.documentId==='CC-DC-CR-'+id);
   const writes=primary.writes;assert(writes.length>0);for(const w of writes)assert(names.has(w.field),'Mapped field must exist: '+w.field);
   assert(!writes.some(w=>/signature|attorney|signed/i.test(w.field)),'No protected execution written');
   if(name==='favorable'){assert.equal(r.census.length,48);assert(!writes.some(w=>w.field==='No Finding'),'Unresolved new legal branch must remain unselected');}
   else for(const b of primary.blanks)assert(names.has(b.field),'Classified blank must exist: '+b.field);
   assert.equal((await PDFDocument.load(r.bytes)).getForm().getFields().length,0);
   const retained=key==='canonical'||key==='boundary'||key.endsWith('-paid')||name==='favorable';
   let output=null;if(retained&&evidence){output=mode+'-outputs/'+name+'-'+key.replaceAll('/','-')+'.pdf';fs.mkdirSync(evidence+'/'+mode+'-outputs',{recursive:true});fs.writeFileSync(evidence+'/'+output,r.bytes);}
   if(key==='canonical')assert.equal((await renderWith(JSON.parse(JSON.stringify(saved)))).sha256,r.sha256,'Save/reload preserves generated output');
   rows.push({builder:name,fixture:key,status:'PASS',asOf:f.asOf,sha256:r.sha256,bytes:r.bytes.length,pages:r.pageCount,output,writes:writes.map(w=>({field:w.field,value:w.value,factId:w.factId})),missing:r.missing??r.blanks.filter(b=>b.requiredBeforeFiling),inputPreserved:true});
  }catch(e){assert.deepEqual(f,saved);failures++;rows.push({builder:name,fixture:key,status:'FAIL',error:e.message,inputPreserved:true});}
 }
 const canonical=fixtures.canonical;
 for(const date of ['2026-10-01','2026-10-21']){
  const f=structuredClone(canonical);f.asOf=date;const saved=structuredClone(f);
  assert.throws(()=>m[validate](f),/LAW_VERSION_REVIEW/);await assert.rejects(()=>renderWith(f),/LAW_VERSION_REVIEW/);assert.deepEqual(f,saved);
  negative.push({builder:name,case:'current date remains restricted',asOf:date,status:'PASS'});
 }
 const bad=structuredClone(canonical);bad.confirmations.selectedRecitalTrue=false;if(name==='favorable'){delete bad.confirmations.selectedRecitalTrue;bad.confirmations.selectedStatementTrue=false;}const savedBad=structuredClone(bad);
 await assert.rejects(()=>renderWith(bad),/CONDITION_NOT_MET/);assert.deepEqual(bad,savedBad);negative.push({builder:name,case:'expressly false required recital refused',status:'PASS'});
 const unknown=structuredClone(canonical);delete unknown.confirmations[name==='favorable'?'selectedStatementTrue':'selectedRecitalTrue'];const savedUnknown=structuredClone(unknown);const u=await renderWith(unknown);assert.deepEqual(unknown,savedUnknown);
 if(name==='favorable')assert(!u.writes.some(w=>Object.values(m.BASIS_FIELDS).includes(w.field)));
 else assert.equal(u.mayMarkBasis,false);
 assert((u.missing??u.blanks).some(b=>b.requiredBeforeFiling));negative.push({builder:name,case:'unknown required fact remains missing and blocks selection',status:'PASS'});
 const badSource=Buffer.from(source);badSource[100]^=1;
 await assert.rejects(()=>m[render](canonical,name==='favorable'?badSource:{['CC-DC-CR-'+id]:badSource}),/SOURCE_HASH_DRIFT/);
 negative.push({builder:name,case:'same-length changed source refused',status:'PASS'});
 if(name==='favorable'){
  const f=structuredClone(canonical);f.case.basis='no_finding';await assert.rejects(()=>renderWith(f),/WRONG_INSTRUMENT/);negative.push({builder:name,case:'unadopted No Finding route remains refused',status:'PASS'});
 }
}
const result={mode,status:failures?'RED':'PASS',scope:'Current-form field mapping only. Fixture dates are existing historical synthetic dates, not proof of current legal eligibility. Date guards and legal holds retained.',sourcePins,rows,negative,failures};
if(evidence)fs.writeFileSync(evidence+'/'+mode+'-mapping-results.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({mode,status:result.status,fixtures:rows.length,negative:negative.length,failures}));
process.exitCode=failures?1:0;
