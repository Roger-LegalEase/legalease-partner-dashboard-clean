import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {PDFDocument,PDFName,PDFDict,PDFRawStream} from 'pdf-lib';
import {ROOT,OUT,validateInput,checkSaved} from '../../../../../scripts/build-census-v1-oh-clean-tracks-current.mjs';
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p)));
const base=path.join(ROOT,OUT),evidence=path.dirname(new URL(import.meta.url).pathname);
const fixtures=read('data/rcap-grade-a/packet-factory-24h/pf08/oh-continuation-20260913/coherent-eight-fixture-inputs.json').fixtures;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const normalize=s=>String(s).replace(/\s+/g,' ').trim();
const outcomes=[];
for(const key of ['pendingCriminalProceedings','openWarrants','immigrationExposure','prosecutorObjection','victimObjection','excludedOffense']){const f=structuredClone(fixtures[0]);f[key]=true;assert.throws(()=>validateInput(f),new RegExp(key));outcomes.push({case:`refuse-${key}`,pass:true});}
for(const [key,value,error]of [['court','Another Court','RECORD_COURT_MISMATCH'],['indigent',true,'INDIGENCY_BRANCH'],['remedy',null,'UNRESOLVED_REMEDY'],['BCIRecordCompared',false,'BCI_COMPARISON_REQUIRED']]){const f=structuredClone(fixtures[0]);f[key]=value;assert.throws(()=>validateInput(f),new RegExp(error));outcomes.push({case:`refuse-${key}`,pass:true});}
const missing=structuredClone(fixtures[0]);missing.requiredInputProjection.ncvFullLegalName.value=null;assert.throws(()=>validateInput(missing),/REQUIRED_INPUT/);outcomes.push({case:'refuse-missing-required-projection',pass:true});
for(const f of fixtures)validateInput(f);
for(const [track,key,value,error]of [
 ['oh_2953_33_nonconviction','divisionCExclusions',true,'DIVISION_C'],
 ['oh_2953_32_sealing','earliestApplication','2099-01-01','WAITING_PERIOD'],
 ['oh_2953_32_sealing','registrationHistory',true,'registrationHistory'],
 ['oh_2953_35_firearm','offenseDate','2023-01-01','FORMER_PROVISION'],
]) {const f=structuredClone(fixtures.find(f=>f.trackId===track));f[key]=value;assert.throws(()=>validateInput(f),new RegExp(error));outcomes.push({case:`refuse-${track}-${key}`,pass:true});}
const report=read(`${OUT}/reports/rendered-artifacts.json`),map=read(`${OUT}/production-field-map.json`),texts=new Map(),fontChecks=[];
for(const f of fixtures){const dir=path.join(base,'continuation',f.trackId,f.fixture),coverage=JSON.parse(fs.readFileSync(path.join(dir,'coverage.json')));
 for(const c of coverage){const p=path.join(dir,`${c.documentId}.pdf`),bytes=fs.readFileSync(p);assert.equal(hash(bytes),c.sha256,`COMPONENT_HASH:${p}`);const t=spawnSync('pdftotext',['-layout',p,'-'],{encoding:'utf8'});assert.equal(t.status,0,t.stderr);texts.set(`${f.trackId}/${f.fixture}/${c.documentId}`,normalize(t.stdout));
  if(c.documentId!=='bci-transmission'){const fonts=spawnSync('pdffonts',[p],{encoding:'utf8'});assert.equal(fonts.status,0);assert.match(fonts.stdout,/ArialMT[^\n]*yes\s+(yes|no)\s+yes/);fontChecks.push({document:`${f.trackId}/${f.fixture}/${c.documentId}`,embeddedArialUnicode:true});}
  const packetText=spawnSync('pdftotext',['-layout','-f',String(c.firstPage),'-l',String(c.firstPage+c.pageCount-1),path.join(dir,'packet.pdf'),'-'],{encoding:'utf8'});assert.equal(packetText.status,0);assert.equal(normalize(packetText.stdout),normalize(t.stdout),`ASSEMBLED_TEXT:${p}`);
 }
}
for(const w of map.writes){assert.ok(texts.get(w.documentId)?.includes(normalize(w.value)),`MISSING_SAVED_WRITE:${w.fieldId}:${w.value}`);assert.ok(w.rect[0]>=0&&w.rect[1]>=0&&w.rect[0]+w.rect[2]<=612&&w.rect[1]+w.rect[3]<=792,`OUT_OF_PAGE:${w.fieldId}`);assert.equal(w.fontSize,12);}
function imageHashes(pdf,page){const result=[];const resources=page.node.Resources();const objects=resources.lookupMaybe(PDFName.of('XObject'),PDFDict);for(const [,ref]of objects?.entries()??[]){const obj=pdf.context.lookup(ref);if(obj instanceof PDFRawStream&&obj.dict.get(PDFName.of('Subtype'))?.toString()==='/Image')result.push(hash(obj.contents));}return result.sort();}
const src=await PDFDocument.load(fs.readFileSync(path.join(ROOT,'private/source-acquisition-20260913/oh-96c1/OH-SUPR-Superintendence-2026-08-06.pdf')));const sourceImages=imageHashes(src,src.getPage(474));assert.equal(sourceImages.length,1);
const sourceImageChecks=[];
for(const f of fixtures.filter(f=>f.trackId==='oh_2953_32_sealing')){const pdf=await PDFDocument.load(fs.readFileSync(path.join(base,'continuation',f.trackId,f.fixture,'96C1.pdf')));assert.deepEqual(imageHashes(pdf,pdf.getPage(0)),sourceImages);sourceImageChecks.push({fixture:f.fixture,sourcePage:475,sourceImageSha256:sourceImages[0],unchanged:true});}
const saved=await checkSaved();
const result={familyId:saved.familyId,negativeInputChecks:outcomes,savedPacketChecks:saved,componentTextCorrespondence:'ALL_PASS',knownWritesFoundInSavedComponentText:map.writes.length,allWritesInsidePage:true,originalDocumentsEmbeddedArialUnicode:fontChecks.length,sourceImageChecks,centralRaster:'PENDING',independentReview:'PENDING',scope:'Text, hashes, source-image custody and input refusals only; no page-raster or independent visual acceptance.'};
fs.writeFileSync(path.join(evidence,'saved-candidate-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({negativeInputChecks:outcomes.length,writes:map.writes.length,embeddedArialDocuments:fontChecks.length,packets:saved.packets.length,sourceImageChecks:sourceImageChecks.length}));
