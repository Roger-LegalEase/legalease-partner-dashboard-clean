#!/usr/bin/env node
/** Read-only examination of the original RI host's form renderer.
 * The export-only VM suffix exposes existing functions without altering them.
 * Extra row dictionaries are diagnostic inputs, NOT a claimed supported API.
 * Never invokes the file-writing public runner or changes a packet/host/map.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const [root,sourceDir,out]=process.argv.slice(2);
assert(root&&sourceDir&&out,'Usage: node --experimental-vm-modules probe.mjs root sources output');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitblob=b=>crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const host=path.join(root,'scripts/build-census-v1-ri_decriminalized-set.mjs');
const raw=fs.readFileSync(host);
assert.equal(gitblob(raw),'2bb4b8290892588bdb39302dc0f7939126ea62ed');
const names=['ri_first_offender_felony-set','ri_first_offender_misdemeanor-set','ri_deferred_sentence-set'];
const sources={
 'DC-33':'RI__FORM__DC-33__district-court-motion-affidavit-and-instructions-to-expunge-or-seal-record__REV-2025-02__EN.pdf',
 'Superior-55':'RI__FORM__SUPERIOR-55__superior-court-motion-affidavit-and-instructions-to-expunge-or-seal-record-felony__REV-2025-02__EN.pdf'};
const watched=[host,...Object.values(sources).map(n=>path.join(sourceDir,n))];
const before=watched.map(p=>sha(fs.readFileSync(p)));
const deps=[];const hostURL=pathToFileURL(host).href;
const suffix='\nexport {FORMS,FAMILIES,fieldSpecFor,censusOf,renderOfficialForm,proposedOrderBody};\n';
const mod=new vm.SourceTextModule(raw.toString()+suffix,{
 identifier:hostURL,initializeImportMeta(meta){meta.url=hostURL;},
 importModuleDynamically(spec){return import(new URL(spec,hostURL).href);}});
await mod.link(async spec=>{
 const id=spec.startsWith('.')?new URL(spec,hostURL).href:spec;
 if(spec.startsWith('.')){const p=new URL(id);deps.push({path:spec,sha256:sha(fs.readFileSync(p)),gitBlob:gitblob(fs.readFileSync(p))});}
 const m=await import(id);const keys=Object.keys(m);
 return new vm.SyntheticModule(keys,function(){for(const k of keys)this.setExport(k,m[k]);},{identifier:id});
});
await mod.evaluate();
const {FORMS,FAMILIES,fieldSpecFor,censusOf,renderOfficialForm,proposedOrderBody}=mod.namespace;
const cases=[];const negative=[];fs.mkdirSync(out,{recursive:true});
for(const family of names){
 const dir=path.join(root,'data/rcap-all50/overlays/census-v1/ri',family.replaceAll('_','-')+'--official-pdf-fill');
 const map=JSON.parse(fs.readFileSync(path.join(dir,'production-field-map.json')));
 const cfg=FAMILIES[family];const form=FORMS[cfg.form];
 assert.deepEqual(map.routeKeys,cfg.routeKeys);
 const route={...cfg,form,legalName:map.legalName};
 const sb=fs.readFileSync(path.join(sourceDir,sources[cfg.form]));assert.equal(sha(sb),form.sha256);
 const source={...form,bytes:sb,pathInArchive:sources[cfg.form]};
 const census=await censusOf(source,fieldSpecFor(route));
 const facts={'participant.full_legal_name':'Jordan Avery Reyes','participant.date_of_birth':'1994-04-17'};
 const outDir=path.join(out,family);fs.mkdirSync(outDir,{recursive:true});
 for(const count of [0,1,2,4,5]){
  const rows=Array.from({length:count},(_,i)=>({count:String(i+1),charge:`REVIEW-CHARGE-${i+1}-SYNTHETIC`,disposition:`REVIEW-RESULT-${i+1}-SYNTHETIC`}));
  const f={...facts};
  if(count){f['case.selected_rows']=rows;f.selectedRows=rows;f['matter.case_number']='REVIEW-CASE-ONLY';
   for(const [i,r]of rows.entries())for(const [col,key]of [['1 Counts','count'],['2 Charges','charge'],['3 Dispositions','disposition']])f[`${col} ${i+1}`]=r[key];}
  const result=await renderOfficialForm(source,census,f,family);
  const output=path.join(outDir,`diagnostic-${count}-rows.pdf`);fs.writeFileSync(output,result.bytes);
  const body=proposedOrderBody({...route,partPrintedName:map.affidavitPartOnThisRoute},f);
  const rowPolicies=census.rows.filter(r=>/^[123] (Counts|Charges|Dispositions) [1-4]$/.test(r.name)).map(r=>({name:r.name,policy:r.policy,fact:r.fact??null}));
  cases.push({family,suppliedDiagnosticRows:count,sourceSha256:form.sha256,output:path.relative(out,output),sha256:sha(result.bytes),bytes:result.bytes.length,rows,rowPolicies,
    composedOrderContainsSuppliedRowTokens:rows.some(r=>body.includes(r.charge)),returnedKeys:Object.keys(result)});
 }
 for(const key of Object.keys(facts)){
  const f={...facts};delete f[key];let err=null;
  try{await renderOfficialForm(source,census,f,family);}catch(e){err=String(e.message);}
  assert(err);negative.push({family,missingSupportedFact:key,rejected:true,message:err});
 }
}
assert.deepEqual(watched.map(p=>sha(fs.readFileSync(p))),before);
const result={schemaVersion:'chatb-ri-retained-renderer-probes/v1',host:{gitBlob:gitblob(raw),sha256:sha(raw)},exportOnlySuffixSha256:sha(Buffer.from(suffix)),nodeVersion:process.version,
 runtimeScope:'Original host and exact sources; dependencies from checksum-verified retained runtime kit. Route descriptors checked against current byte-identical family maps; stale kit legal registry is not used through routeOf. This is the actual existing internal four-page form renderer, not a complete public packet build, simulated renderer or modified row policy.',
 interpretation:'Extra row dictionaries and source-field-name values are diagnostic unbound inputs. The renderer has no declared row fact contract. Their output cannot establish supported populated-row assembly, production silent truncation, fifth-row loss or a legal eligibility result. Whole-output PDF comparison and text inspection are separate read-only measurements.',
 cases,negativeControls:negative,directDependencies:deps,readInputsUnchanged:watched.length,publicRunnerExecutions:0,packetOrHostFilesEdited:0};
fs.writeFileSync(path.join(out,'renderer-probes.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,negativeControls:negative.length,hostUnchanged:true}));
