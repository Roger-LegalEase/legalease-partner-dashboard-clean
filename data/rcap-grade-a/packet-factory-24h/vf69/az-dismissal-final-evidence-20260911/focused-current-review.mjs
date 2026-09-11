import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {measureAzActualWrites} from '../../../../../scripts/lib/az-record-sealing-byte-proof.mjs';
import {mapArizonaRecordSealingCourt} from '../../../../../scripts/lib/az-record-sealing-court-mapping.mjs';
const family='az_record_sealing_dismissal_not_guilty-set';
const base='data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill';
const ev='data/rcap-grade-a/packet-factory-24h/vf69/az-dismissal-final-evidence-20260911';
const run='data/rcap-grade-a/packet-factory-24h/raster-runs/34589144801';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const result={familyId:family,baseSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime:{node:process.version,platform:process.platform,arch:process.arch},commands:['node scripts/grade-a-packet-factory-24h/claim.mjs --assert VF69 '+family,'node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family '+family,'node '+ev+'/focused-current-review.mjs'],sources:[],pdfs:[],pngs:[],byteProofs:[],sourceCensus:[],assemblyMappings:[],courtCases:[]};
const receipt=read(base+'/source-receipt.json'),map=read(base+'/production-field-map.json'),manifest=read(base+'/packet-set-manifest.json'),rendered=read(base+'/reports/rendered-artifacts.json'),wiring=read(base+'/product-wiring.json'),writes=read(base+'/reports/actual-writes.json'),raster=read(run+'/'+family+'.verdict.json');
const track=read('data/record-clearing/legal-design-track-registry.json').tracks.find(t=>t.trackId===map.trackId);
assert.equal(map.familyId,family);assert.equal(manifest.familyId,family);assert.equal(wiring.familyId,family);
assert.deepEqual(map.routeKeys,manifest.routeKeys);assert.deepEqual(wiring.routeKeys,map.routeKeys);assert.deepEqual(manifest.authority,track.authority);
assert.deepEqual(manifest.components.map(c=>c.componentId),track.packetSet.components.map(c=>c.componentId));assert.deepEqual(rendered.componentSet,manifest.components.map(c=>c.componentId));
assert.equal(wiring.commercialAuthority,false);assert.equal(wiring.runtimeSelectable,false);assert.equal(wiring.generationAllowed,false);
const sourceDocs={};
for(const [i,s] of receipt.sources.entries()){
 const b=fs.readFileSync(s.path),role=i?'order':'petition';assert.equal(sha(b),s.sha256);assert.equal(b.length,s.byteLength);sourceDocs[role]={bytes:b,doc:await PDFDocument.load(b)};
 result.sources.push({...s,recomputedSha256:sha(b),actualByteLength:b.length});
 const census=map.sourceFieldCensus[role],fields=sourceDocs[role].doc.getForm().getFields();assert.equal(fields.length,census.length);assert.deepEqual(fields.map(f=>f.getName()).sort(),census.map(f=>f.name).sort());
 const mp=map.maps.find(m=>m.documentRole===role),classified=new Set([...mp.canonicalWrites.map(w=>w.fieldName),...mp.canonicalRefusals.map(w=>w.fieldName),...mp.selectionControls.map(w=>w.fieldName)]);
 assert.equal(classified.size,fields.length);for(const f of fields)assert(classified.has(f.getName()));
 for(const f of fields){const stored=census.find(c=>c.name===f.getName());assert.deepEqual(stored.widgets, f.acroField.getWidgets().map(w=>({rect:w.getRectangle(),page:sourceDocs[role].doc.getPages().findIndex(p=>p.ref?.toString()===w.P()?.toString())+1})));}
 result.sourceCensus.push({role,total:fields.length,protected:census.filter(c=>c.classification==='court_owned_or_judicial').length,fullyPartitioned:true,widgetsRecomputedMatch:true});
}
for(const d of raster.documentsRendered){
 const b=fs.readFileSync(d.path);assert.equal(sha(b),d.pinned);const pdf=await PDFDocument.load(b);assert.equal(pdf.getPageCount(),d.document.endsWith('packet-assembly.pdf')?8:d.document.endsWith('petition.pdf')?5:3);assert.equal(pdf.getForm().getFields().length,0);
 assert(pdf.getPages().every(p=>p.getWidth()===612&&p.getHeight()===792));
 const txt=execFileSync('pdftotext',['-layout',d.path,'-'],{encoding:'utf8'});fs.writeFileSync(ev+'/'+d.document.replace('/','-')+'.txt',txt);
 result.pdfs.push({...d,recomputedSha256:sha(b),byteLength:b.length,pages:pdf.getPageCount(),flattenedFormFields:0,allPagesLetter:true,textLayoutSha256:sha(Buffer.from(txt))});
}
const imageManifest=read(run+'/'+family+'.PAGE_IMAGES_SHA256.json');
for(const i of imageManifest){const p=run+'/'+family+'/'+i.member;const b=fs.readFileSync(p);assert.equal(sha(b),i.sha256);assert.equal(b.length,i.bytes);const measure=raster.measurements.find(m=>m.png===i.member);assert(measure);assert.equal(measure.pngSha256,i.sha256);result.pngs.push({path:p,sha256:sha(b),byteLength:b.length,document:measure.document,page:measure.page});}
assert.equal(result.pngs.length,32);assert.equal(new Set(result.pngs.map(p=>p.sha256)).size,12);
for(const fixture of ['canonical','boundary']){
 const assembly=rendered.artifacts.find(a=>a.fixture===fixture);assert.equal(assembly.pageCount,8);assert.deepEqual(assembly.components,manifest.components.map(c=>c.componentId));
 for(let p=1;p<=8;p++){
  const componentDoc=p<=5?'petition.pdf':'order.pdf',componentPage=p<=5?p:p-5;
  const a=result.pngs.find(i=>i.document===fixture+'/packet-assembly.pdf'&&i.page===p),c=result.pngs.find(i=>i.document===fixture+'/'+componentDoc&&i.page===componentPage);assert.equal(a.sha256,c.sha256);
  assert.equal(assembly.pageManifest[p-1].component,manifest.components[p<=5?0:1].componentId);
  result.assemblyMappings.push({fixture,assemblyPage:p,component:componentDoc,componentPage,pngSha256:a.sha256,exactPixelHashMatch:true});
 }
 for(const role of ['petition','order']){
  const rec=writes.documents.find(d=>d.fixture===fixture&&d.formNumber.endsWith(role==='petition'?'primary-filing-1':'proposed-order-2'));
  const offered=rec.actualWrites.map(w=>({field:w.field,value:w.expected,...(sourceDocs[role].doc.getForm().getField(w.field).constructor.name==='PDFCheckBox'?{printedSourceSelection:true}:{})}));
  const proof=await measureAzActualWrites({sourceBytes:sourceDocs[role].bytes,outputBytes:fs.readFileSync(base+'/fixtures/'+fixture+'/'+role+'.pdf'),writes:offered});assert.equal(proof.metricsExact,true);assert.equal(proof.outsideCount,0);
  const protectedFields=new Set(map.sourceFieldCensus[role].filter(f=>f.classification==='court_owned_or_judicial').map(f=>f.name));assert(offered.every(w=>!protectedFields.has(w.field)));assert(!offered.some(w=>w.field==='Date'));
  result.byteProofs.push({fixture,role,actualChars:proof.actualChars,outsideCount:proof.outsideCount,metricsExact:proof.metricsExact,protectedReportedWrites:0,proof});
 }
}
const calls=[
 {name:'canonical direct charging court',record:{chargingInstrumentProgression:'direct_charging_document',justiceCourtComplaintFollowedByInformation:false,chargingDocumentCourt:'PIMA COUNTY SUPERIOR COURT'},status:'ROUTED',court:'PIMA COUNTY SUPERIOR COURT'},
 {name:'boundary justice to superior information',record:{chargingInstrumentProgression:'justice_complaint_then_information',justiceCourtComplaintFollowedByInformation:true,superiorCourt:'MARICOPA COUNTY SUPERIOR COURT'},status:'ROUTED',court:'MARICOPA COUNTY SUPERIOR COURT'},
 {name:'missing history',record:{},status:'AMBIGUOUS'},
 {name:'contradictory direct history',record:{chargingInstrumentProgression:'direct_charging_document',justiceCourtComplaintFollowedByInformation:true,chargingDocumentCourt:'PIMA COUNTY SUPERIOR COURT'},status:'AMBIGUOUS'},
 {name:'missing superior court',record:{chargingInstrumentProgression:'justice_complaint_then_information',justiceCourtComplaintFollowedByInformation:true},status:'AMBIGUOUS'},
 {name:'missing direct court',record:{chargingInstrumentProgression:'direct_charging_document',justiceCourtComplaintFollowedByInformation:false},status:'AMBIGUOUS'}
];
for(const c of calls){const out=mapArizonaRecordSealingCourt({familyId:family,record:c.record});assert.equal(out.status,c.status);if(c.court)assert.equal(out.court,c.court);result.courtCases.push({name:c.name,input:c.record,result:out});}
result.guidanceRulesMatchRegistry=Object.entries(track.rules).every(([when,statement])=>map.registryGuidance.rules.some(r=>r.when===when&&r.statement===statement));assert(result.guidanceRulesMatchRegistry);
result.filingChecklistDefects=read(ev+'/source-conditioned-requirement-defects.json').fieldsWithUnsupportedUnconditionalRequirements;
result.checksPassed=true;
fs.writeFileSync(ev+'/focused-current-review.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({checksPassed:true,sources:result.sources.length,pdfPins:result.pdfs.length,pages:result.pngs.length,uniquePageHashes:new Set(result.pngs.map(p=>p.sha256)).size,byteProofs:result.byteProofs.map(({fixture,role,actualChars,outsideCount,metricsExact})=>({fixture,role,actualChars,outsideCount,metricsExact})),sourceCensus:result.sourceCensus,assemblyMappings:result.assemblyMappings.length,venueChecks:result.courtCases.length,filingChecklistDefects:result.filingChecklistDefects},null,2));
