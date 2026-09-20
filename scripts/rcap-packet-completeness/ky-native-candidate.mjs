/** Read the retained, independently reviewed Kentucky native report schema.
 * This is an adapter into the EXISTING field-completeness classifier, not a new
 * renderer, legal rule engine, independent review, or runtime authority.
 * Each fixture has its own fact set and optional component set. In particular,
 * canonical phone facts never make a boundary phone look like a dropped write.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PASS_COUNTERS} from './completeness-contract.mjs';
export const KY_NATIVE_FAMILY='ky_nonconviction_expungement-set';
export const KY_NATIVE_DIRECTORY='data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill';
const BINDING_SHA='d88f6878045063310552790a70c2fa514b11572ea585b962e4638fec5e1d572f';
const BINDING=path.join(path.dirname(fileURLToPath(import.meta.url)),'ky-reviewed-candidate-inputs.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const KNOWN = {
 'AOC-497.2':{sha256:'080acd68f99ff84afb9b1d08721b5dbff516b8531f0ce53ca7ffc030e80f19e4',fields:29},
 'AOC-497':{sha256:'715c00db62e19f07f7dedde68e89309027f4ed9566198a3617cb9bb34a98368b',fields:32}
};
function read(root,rel){
 if(typeof rel!=='string'||path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw Error('unsafe candidate path');
 const realRoot=fs.realpathSync(root),p=path.resolve(realRoot,rel);
 if(fs.lstatSync(p).isSymbolicLink()||!fs.realpathSync(p).startsWith(realRoot+path.sep))throw Error('candidate path escapes checkout');
 return fs.readFileSync(p);
}
function fail(dir,familyId,why){return {familyId,directory:dir,result:'FAIL_COMPONENT_SET',auditable:false,
 counters:Object.fromEntries(PASS_COUNTERS.map(k=>[k,k==='requiredComponentsMissing'?1:null])),
 totals:{terminalFields:0,written:0,blank:0,blanksByDisposition:{},rowsInspected:0},
 findings:[{counter:'requiredComponentsMissing',why}],findingsTruncated:0,
 runtimeIntakeCounters:null,independentReviewReused:false,publicationOrFulfillmentClaimed:false};}
export function isKyNativeCandidate(familyId,map){return familyId===KY_NATIVE_FAMILY && map?.familyId===KY_NATIVE_FAMILY
 && map?.schemaVersion==='rcap-official-form-field-map/v1-census-v1' && map.sourceCensuses && !map.writes && !map.maps;}

/** Exact saved work only. A changed byte is refused and is never silently
 * assigned the old candidate's PASS. Tests may supply an isolated checkout root. */
export function auditKyNativeCandidate({root,directory,familyId},auditPrepared){
 try{
  const bindingBytes=fs.readFileSync(BINDING);if(sha(bindingBytes)!==BINDING_SHA)throw Error('review-input binding changed');
  const binding=JSON.parse(bindingBytes);if(familyId!==KY_NATIVE_FAMILY || directory!==KY_NATIVE_DIRECTORY)throw Error('native candidate family/directory mismatch');
  for(const f of binding.files){const b=read(root,f.path);if(b.length!==f.byteLength||sha(b)!==f.sha256)throw Error('reviewed input mismatch: '+f.path);}
  const get=rel=>JSON.parse(read(root,directory+'/'+rel));
  const fieldMap=get('production-field-map.json'),censuses=get('official-field-census.json'),receipt=get('source-receipt.json');
  const index=get('reports/rendered-artifacts.json').pdfs;
  if(!isKyNativeCandidate(familyId,fieldMap)||!equal(fieldMap.sourceCensuses,censuses))throw Error('native map/census mismatch');
  if(!Array.isArray(index)||index.length!==13||new Set(index.map(x=>x.fixture)).size!==13)throw Error('incomplete or duplicate fixture inventory');
  const sources=Object.entries(receipt.sources).map(([formNumber,s])=>({formNumber,...s}));
  for(const [id,expected] of Object.entries(KNOWN)){
   const source=sources.find(s=>s.formNumber===id);
   if(!source||source.sha256!==expected.sha256||censuses[id]?.length!==expected.fields)throw Error('exact source/census does not match '+id);
   if(sha(read(root,source.path))!==expected.sha256)throw Error('raw source mismatch '+id);
   if(new Set(censuses[id].map(f=>f.field)).size!==expected.fields)throw Error('duplicate source field '+id);
  }
  const facts=index.map(a=>get('fixtures/'+a.fixture+'.facts.json'));
  // Execute the actual unchanged validator, once for this fixture array. It
  // imports rendering dependencies but calls no renderer and creates no files.
  const helper=pathToFileURL(path.join(root,'scripts/rcap-packet-recovery/chat5/ky-nonconviction.mjs')).href;
  const code=`import fs from 'node:fs';import {validateKy} from ${JSON.stringify(helper)};console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(validateKy)));`;
  const reviews=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{input:JSON.stringify(facts),encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024}));
  const fixtures=[];
  for(const [i,a] of index.entries()){
   const factsBytes=read(root,directory+'/fixtures/'+a.fixture+'.facts.json'),report=get('reports/'+a.fixture+'.json'),f=facts[i],review=reviews[i];
   if(report.inputSha256!==sha(factsBytes)||report.fixture!==a.fixture||report.familyId!==familyId
      ||report.output.sha256!==a.sha256||!equal(report.eligibility,review.eligibility)||!equal(report.selectedBases,review.selectable))throw Error('facts/report/validator disagree: '+a.fixture);
   const ids=['AOC-497.2','charge-agency-schedule',...(f.options.includeProposedOrder?['AOC-497']:[]),'participant-instructions'];
   if(!equal(a.componentPages.map(p=>p.documentId),ids)||!equal(a.componentPages,report.componentPages)
      ||a.pageCount!==(f.options.includeProposedOrder?8:6))throw Error('selected component set differs: '+a.fixture);
   let next=1;for(const c of a.componentPages){if(c.firstPage!==next)throw Error('component sequence mismatch');next+=c.pageCount;
    if(KNOWN[c.documentId]&&(c.pageCount!==2||c.sourceSha256!==KNOWN[c.documentId].sha256))throw Error('source component mismatch');}
   if(next-1!==a.pageCount)throw Error('component page total mismatch');
   const guidePart=a.componentPages.at(-1),pdf=path.join(root,a.file);
   const instructions=execFileSync('pdftotext',['-f',String(guidePart.firstPage),'-l',String(a.pageCount),'-layout',pdf,'-'],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
   const map={writes:[],refusals:[]}, ledger=[];
   const included=f.options.includeProposedOrder?['AOC-497.2','AOC-497']:['AOC-497.2'];
   for(const id of included){
    const recorded=new Map();for(const w of report.writes.filter(w=>w.documentId===id)){
     if(recorded.has(w.field))throw Error('duplicate native write '+id+'/'+w.field);recorded.set(w.field,w);
    }
    for(const sourceField of censuses[id]){
     const name=sourceField.field,w=recorded.get(name),blank=report.blanks.find(b=>b.documentId===id&&b.field===name);
     const row={fieldId:name,fieldName:name,label:name,documentId:id,page:sourceField.widgets[0]?.page,
       factId:id+'/'+name,sourceIdentity:name};
     let disposition,why;
     if(w){
      if(!equal(w.widgets,sourceField.widgets))throw Error('native write/census geometry differs');
      if(sourceField.type==='PDFButton'||(id==='AOC-497'&&sourceField.type==='PDFCheckBox')
         ||['signature date','signature year','other charges','2_2','undefined_2'].includes(name))throw Error('protected field recorded written');
      map.writes.push({...row,value:w.value});recorded.delete(name);disposition='WRITTEN';why='Exact native write and source geometry; held facts/validator/report hashes agree.';
     }else if(sourceField.type==='PDFButton'){
      map.refusals.push({...row,reason:'Viewer UI control; never a filing fact'});disposition='NON_FILING_SOURCE_ELEMENT';why='Exact source PDFButton, not a missing participant value.';
     }else if((id==='AOC-497'&&(sourceField.type==='PDFCheckBox'||['other charges','2_2','undefined_2'].includes(name)))||['signature date','signature year'].includes(name)){
      map.refusals.push({...row,refusalClass:id==='AOC-497'?'court_prosecutor_clerk_or_agency_owned':'signature_or_date_participant_completion',reason:'Source-reserved execution or official finding; no act performed.'});disposition='PROTECTED_FIELD';why='Exact source execution/findings field; retained independent review confirms protected output.';
     }else if(blank?.requiredBeforeFiling===true){
      if(blank.heldValue!==null&&blank.heldValue!==undefined&&blank.heldValue!=='')throw Error('held field cannot be represented as unavailable');
      map.refusals.push({...row,reason:blank.reason,requiredBeforeFiling:true,completenessDisposition:'REQUIRED_BEFORE_FILING',factAvailable:false});disposition='REQUIRED_BEFORE_FILING';why=blank.reason;
     }else if(blank?.kind==='optional_blank'&&['Jail ID Number','Division'].includes(name)){
      const condition='No '+name+' supplied for this exact fixture; this source component makes that field conditional.';
      map.refusals.push({...row,reason:condition,completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:condition});disposition='NOT_APPLICABLE_ON_THIS_ROUTE';why=condition;
     }else if(/^CHARGE(?:_\d+)?$/.test(name)){
      const rowNumber=name==='CHARGE'?1:Number(name.split('_')[1]);if(rowNumber<=Math.min(f.charges.length,6))throw Error('actual charge row missing '+name);
      const condition='Unused source charge line '+rowNumber+'; this exact case has '+f.charges.length+' charges, all carried in its schedule.';
      map.refusals.push({...row,reason:condition,completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:condition});disposition='NOT_APPLICABLE_ON_THIS_ROUTE';why=condition;
     }else if(id==='AOC-497.2'&&sourceField.type==='PDFCheckBox'){
      const basis=Object.entries(fieldMap.dispositionMap).find(([,field])=>field===name)?.[0];
      if(!basis||review.selectable.includes(basis))throw Error('required basis selection missing '+name);
      if(f.charges.some(c=>c.basis===basis))throw Error('unresolved selected-charge facts require separate review');
      const condition='No charge in this exact case invokes '+basis+'; other charge-specific alternatives are selected where supported.';
      map.refusals.push({...row,isSelectionControl:true,reason:condition,completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:condition});disposition='NOT_APPLICABLE_ON_THIS_ROUTE';why=condition;
     }else throw Error('unclassified source blank '+id+'/'+name);
     ledger.push({fixture:a.fixture,documentId:id,field:name,sourcePage:row.page,packetPages:sourceField.widgets.map(w=>w.page+a.componentPages.find(c=>c.documentId===id).firstPage-1),disposition,why});
    }
    if(recorded.size)throw Error('native report contains non-source fields');
   }
   const result=auditPrepared({fieldMap:map,receipt:{allSourcesExact:true,documents:sources.filter(s=>included.includes(s.formNumber))},
    census:null,actualWrites:null,rendered:{componentIdentityMode:'exact',packets:[{documents:ids}]},approval:{status:'INDEPENDENT_CANDIDATE_PASS_NOT_ADMITTED'},instructions});
   fixtures.push({fixture:a.fixture,pdfSha256:a.sha256,pageCount:a.pageCount,selectedComponentIds:ids,ledger,...result});
  }
  const counters=Object.fromEntries(PASS_COUNTERS.map(k=>[k,fixtures.reduce((n,r)=>n+r.counters[k],0)]));
  const failed=fixtures.find(r=>r.result!=='PASS_COMPLETE');
  const byDisposition={};for(const f of fixtures)for(const [k,v] of Object.entries(f.totals.blanksByDisposition))byDisposition[k]=(byDisposition[k]??0)+v;
  return {familyId,directory,result:failed?.result??'PASS_COMPLETE',auditable:true,counters,
   totals:{terminalFields:fixtures.reduce((n,f)=>n+f.totals.terminalFields,0),written:fixtures.reduce((n,f)=>n+f.totals.written,0),blank:fixtures.reduce((n,f)=>n+f.totals.blank,0),blanksByDisposition:byDisposition,rowsInspected:fixtures.reduce((n,f)=>n+f.totals.rowsInspected,0),fieldMapSchema:'native-ky-per-fixture-source-census'},
   findings:fixtures.flatMap(f=>f.findings.map(x=>({...x,fixture:f.fixture}))),findingsTruncated:0,sourceCurrentness:'EXACT',
   fixtureResults:fixtures,reviewInputFilesMatched:binding.files.length,independentReviewReused:binding.review,
   staticCounterScope:'Exhaustive source-widget classification and actual guide disclosures for the exact retained fixtures. Visual/ink integrity reuses the independently passed unchanged bytes, not a new raster review.',
   visualProofReuse:{source:'PR238',unchangedPdfs:13,unchangedPages:90,normalBlankRegions:63,explainedSourceUnderlayRegions:6,freshVisualReview:false},
   runtimeIntakeCounters:null,runtimeInstalled:false,centralRasterAdmission:false,terminalPromotions:0,packetRebuilds:0};
 }catch(e){return fail(directory,familyId,e instanceof Error?e.message:String(e));}
}
