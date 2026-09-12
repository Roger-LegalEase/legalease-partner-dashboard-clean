import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {auditPreparedInputs} from './rcap-packet-completeness/verify-packet-completeness.mjs';
import {ROOT,ROUTES,SOURCES,canonicalFixture,boundaryFixture,importFacts,buildFamily,buildPacket} from './mo-610-140-packet-host.mjs';
let assertions=0;const ok=(v,m)=>{assertions++;assert.ok(v,m)};const eq=(a,b,m)=>{assertions++;assert.deepEqual(a,b,m)};const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fails=(fn,needle)=>{assertions++;assert.throws(fn,e=>String(e).includes(needle),needle)};
const text=file=>{const r=spawnSync('pdftotext',['-layout',file,'-'],{encoding:'utf8',maxBuffer:32e6});assert.equal(r.status,0,r.stderr);return r.stdout.replace(/\s+/g,' ')};
function negativeControls(){
 for(const kind of ['arrest','conviction']){
  const family=ROUTES[kind].familyId,base=canonicalFixture(kind);
  fails(()=>importFacts({...base,familyId:'wrong'},kind),'WRONG_FAMILY_OR_SCHEMA');
  fails(()=>importFacts({...base,participant:{...base.participant,ssn:''}},kind),'full SSN');
  fails(()=>importFacts({...base,participant:{...base.participant,sex:''}},kind),'SOURCE_SEX_SELECTION_REQUIRED');
  fails(()=>importFacts({...base,participant:{...base.participant,raceEthnicity:[]}},kind),'SOURCE_RACE_ETHNICITY_SELECTION_REQUIRED');
  fails(()=>importFacts({...base,court:{...base.court,caseNumber:'clerk-only'}},kind),'CLERK_ASSIGNED');
  fails(()=>importFacts({...base,judgeSignature:'Synthetic Judge'},kind),'PROTECTED_EXECUTION_INPUT');
  fails(()=>importFacts({...base,priorExpungement:{status:'previous',offenseLevels:[]}},kind),'prior expungement court');
  fails(()=>importFacts({...base,feeWaiverRequested:true},kind),'FEE_WAIVER_INPUTS_REQUIRED');
  const fw=boundaryFixture(kind);
  fails(()=>importFacts({...fw,feeWaiver:{...fw.feeWaiver,residencePaymentType:'unknown'}},kind),'INVALID_RESIDENCE_PAYMENT_TYPE');
  fails(()=>importFacts({...fw,feeWaiver:{...fw.feeWaiver,checking:-1}},kind),'INVALID_FINANCIAL_INPUT');
  eq(importFacts(base,kind).familyId,family,'valid fixture accepted');
 }
 const conviction=canonicalFixture('conviction');
 for(const flag of ['waitingPeriodConfirmed','cleanPeriodConfirmed','obligationsSatisfied','noPendingCharges','exclusionScreenCompleted','agencyListConfirmed'])fails(()=>importFacts({...conviction,[flag]:false},'conviction'),`SELF_HELP_STOP:${flag}`);
 fails(()=>importFacts({...conviction,cases:[...conviction.cases,{...conviction.cases[0],caseNumber:'SYNTH-OTHER',county:'Clay',countyMunicipality:'Clay County'}]},'conviction'),'MULTI_COUNTY_SELF_HELP_STOP');
 fails(()=>importFacts({...conviction,cases:[{...conviction.cases[0],completionDate:'2027-01-20'}]},'conviction'),'WAITING_PERIOD_NOT_ELAPSED');
 fails(()=>importFacts({...conviction,court:{...conviction.court,county:'Clay'}},'conviction'),'FILING_COUNTY_MISMATCH');
 const convictionWithSpouse=boundaryFixture('conviction');fails(()=>importFacts({...convictionWithSpouse,feeWaiver:{...convictionWithSpouse.feeWaiver,spouseName:''}},'conviction'),'spouse name');
 const arrest=canonicalFixture('arrest');
 for(const flag of ['noChargeEverFiled','eighteenMonthsElapsed','noChargesDuringPeriod','noGuiltyFindingDuringPeriod','eligibleCrimeScreenConfirmed','agencyListConfirmed'])fails(()=>importFacts({...arrest,[flag]:false},'arrest'),`ARREST_ROUTE_SELF_HELP_STOP:${flag}`);
 fails(()=>importFacts({...arrest,stronger610122RoutePossible:true},'arrest'),'REVIEW_STRONGER_610_122_ROUTE_FIRST');
 fails(()=>importFacts({...arrest,arrest:{...arrest.arrest,date:'2027-01-12'}},'arrest'),'WAITING_PERIOD_NOT_ELAPSED');
 fails(()=>importFacts({...arrest,court:{...arrest.court,county:'Clay'}},'arrest'),'FILING_COUNTY_MISMATCH');
}
function decode(s){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#39;/g,"'").replace(/&#x([0-9a-f]+);/gi,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#([0-9]+);/g,(_,x)=>String.fromCodePoint(Number(x)));}
function bboxPages(file){const r=spawnSync('pdftotext',['-bbox-layout',file,'-'],{encoding:'utf8',maxBuffer:32e6});assert.equal(r.status,0,r.stderr);const out=[];for(const pm of r.stdout.matchAll(/<page width="([^"]+)" height="([^"]+)">([\s\S]*?)<\/page>/g)){const words=[];for(const w of pm[3].matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/g))words.push({x0:+w[1],y0:+w[2],x1:+w[3],y1:+w[4],text:decode(w[5])});out.push({width:+pm[1],height:+pm[2],words});}return out;}
const norm=v=>String(v).toLowerCase().replace(/[^a-z0-9]/g,'');
function geometry(dir,map){const cache=new Map();let checked=0,selections=0;for(const row of map.writes){if(!row.rect||!row.value)continue;const documentName=row.documentId.split('/')[1],component=documentName.replace(/-copy-\d+$/,'');const file=path.join(dir,`${row.fixture}.${component}.pdf`);if(!fs.existsSync(file))continue;let pages=cache.get(file);if(!pages){pages=bboxPages(file);cache.set(file,pages)}let outputPage=row.page;const copyMatch=documentName.match(/^FI-05-copy-(\d+)$/);if(copyMatch){const copy=Number(copyMatch[1]),copyCount=pages.length-3;outputPage=row.page===1?copy:copy===copyCount?copyCount+row.page-1:null;}if(!outputPage)continue;const pg=pages[outputPage-1];ok(pg,`mapped page exists: ${row.fieldId}`);const [x,y,w,h]=row.rect;ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=pg.width+.1&&y+h<=pg.height+.1,`mapped rect on page: ${row.fieldId}`);const box={x0:x-3,x1:x+w+3,y0:pg.height-(y+h)-3,y1:pg.height-y+3};const inside=pg.words.filter(z=>z.x1>=box.x0&&z.x0<=box.x1&&z.y1>=box.y0&&z.y0<=box.y1);const got=inside.map(z=>z.text).join(' ');if(row.isSelectionControl){selections++;ok(/[x✓✔]/i.test(got),`selection appearance in source control: ${row.fieldId}`)}else ok(norm(got).includes(norm(row.value)),`exact value read in declared box: ${row.fieldId}`);checked++}
 for(const fixture of ['canonical','boundary']){const rows=map.writes.filter(r=>r.fixture===fixture&&r.documentId===`${fixture}/CR370`);const protectedRects=[[150,500,410,35]];for(const r of rows.filter(r=>r.page===2)){for(const p of protectedRects){const [x,y,w,h]=r.rect,[px,py,pw,ph]=p;const overlap=x<px+pw&&x+w>px&&y<py+ph&&y+h>py;ok(!overlap,`neutral CR370 overlay clears judge/date region: ${r.fieldId}`)}}}
 return {checked,selections,files:cache.size};}
async function verifyCandidate(kind){const base=fs.mkdtempSync(path.join(os.tmpdir(),`mo-610-140-${kind}-test-`));const built=await buildFamily(kind,{outDir:base});const dir=built.outDir;const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));const map=read('production-field-map.json');const receipt=read('source-receipt.json');const rendered=read('reports/rendered-artifacts.json');const approval=read('approval-request.json');
 const audit=auditPreparedInputs(dir,ROUTES[kind].familyId,{fieldMap:map,actualWrites:read('reports/actual-writes.json'),rendered,receipt,approval,instructions:fs.readFileSync(path.join(dir,'participant-instructions.md'),'utf8')});eq(audit.result,'PASS_COMPLETE',`${kind} native completeness`);for(const [name,count] of Object.entries(audit.counters))eq(count,0,`${kind} ${name}`);
 eq(receipt.allSourcesExact,true);eq(receipt.documents.length,4);for(const source of receipt.documents){const expected=Object.values(SOURCES).find(s=>s.sourceId===source.sourceId);ok(expected,`known source ${source.sourceId}`);eq(sha(fs.readFileSync(path.join(ROOT,source.path))),expected.sha256,`${source.sourceId} exact hash`)}
 const canonical=text(path.join(dir,'canonical.packet.pdf')),boundary=text(path.join(dir,'boundary.packet.pdf'));for(const body of [canonical,boundary]){ok(body.includes('Petition for Expungement'),`${kind} CR360 present`);ok(body.includes('Confidential Case Filing Information Sheet'),`${kind} FI-05 present`);ok(body.includes('Judgment and Order of Expungement'),`${kind} CR370 present`);ok(body.includes('thirty days'),`${kind} notice guidance present`);for(const forbidden of [ROUTES[kind].routeKey,'obligation:','SOURCE_BLOCKED','internal route','repository’s held legal record'])ok(!body.includes(forbidden),`${kind} internal copy absent`)}
 const guideTokens=kind==='arrest'?['Case.net','sign this continuation separately from CR360','sixty days','six months','immigration','firearm','licensing','employment']:['three imprisonable misdemeanors','two felonies','same course of conduct','sixty days','six months','professional license','court or sentencing','one-year refiling','automatic','immigration','firearm','employment'];for(const token of guideTokens)ok(canonical.includes(token),`${kind} guide obligation: ${token}`);
 if(kind==='arrest'){ok(canonical.includes('arrest-only facts under section 610.140.7'));ok(canonical.includes('no charge was ever filed'));ok(canonical.includes('eighteen months'));ok(canonical.includes('Signature:'));ok(!canonical.includes('Synthetic felony property offense'));}else{ok(canonical.includes('Synthetic misdemeanor property offense'));ok(canonical.includes('Synthetic felony property offense'));ok(boundary.includes('All 11 records listed in CR360 and its attached continuation'));for(const token of ['OCN-206','OCN-207','OCN-208','OCN-209','OCN-210'])ok(boundary.includes(token),`${kind} continuation OCN: ${token}`);}
 ok(!canonical.includes('Motion and Affidavit in Support of Request to Proceed As a Poor Person'),`${kind} no unrequested fee waiver`);for(const token of ['Motion and Affidavit in Support of Request to Proceed As a Poor Person','Gross salary (before deductions)','Bank Accounts: Checking','Approximate value of automobile(s)','Approximate value of personal Possessions (list)','Other debts to be considered','PAGE 1 of 1','(Date File Stamp)'])ok(boundary.includes(token),`${kind} GN10 source text: ${token}`);
 for(const fixture of ['canonical','boundary'])for(const field of ['Submitted by','Phone','Email Address_4'])ok(map.writes.some(r=>r.fixture===fixture&&r.field===field),`${kind} FI-05 page 2 write: ${fixture}/${field}`);
 ok(map.writes.some(r=>r.fixture==='boundary'&&r.field==='Defendant police detail'),`${kind} CR370 police agency write`);ok(map.writes.some(r=>r.fixture==='boundary'&&r.field==='Defendant other detail'),`${kind} CR370 overflow agency write`);
 const custom=boundaryFixture(kind);custom.respondents.push({kind:'police',organization:'Second Synthetic Police Agency'},{kind:'records-unknown',organization:'Unknown Records Agency'});const customResult=await buildPacket(custom,kind,'boundary',ROOT),customFile=path.join(base,`custom-${kind}.pdf`);fs.writeFileSync(customFile,customResult.packet.bytes);const customBody=text(customFile);ok(customBody.includes('Second Synthetic Police Agency'),`${kind} duplicate police preserved`);ok(customBody.includes('Unknown Records Agency'),`${kind} unknown agency preserved`);
 const manifest=read('packet-set-manifest.json');ok(manifest.components.some(x=>x.formNumber==='CR360'&&x.required));ok(manifest.components.some(x=>x.formNumber==='FI-05'&&x.required));ok(manifest.components.some(x=>x.formNumber==='CR370'&&x.conditional));ok(manifest.components.some(x=>x.formNumber==='GN10'&&x.conditional));
 const protectedRows=map.refusals.filter(r=>r.completenessDisposition==='PROTECTED_FIELD');ok(protectedRows.some(r=>/Judge signature/i.test(r.label)));ok(protectedRows.some(r=>/Case Number/i.test(r.label)));ok(protectedRows.every(r=>r.decision!=='write'));
 const g=geometry(dir,map);ok(g.checked>150,`${kind} all known placements geometry`);ok(g.selections>20,`${kind} source choice appearances`);
 for(const fixture of ['canonical','boundary']){const packet=await PDFDocument.load(fs.readFileSync(path.join(dir,`${fixture}.packet.pdf`)));eq(packet.getPageCount(),rendered.packets.find(x=>x.fixture===fixture).pageCount);}
 return {kind,dir,auditCounters:audit.counters,geometry:g,packetHashes:Object.fromEntries(rendered.packets.map(x=>[x.fixture,x.sha256]))};
}
negativeControls();const results=[];for(const kind of ['arrest','conviction'])results.push(await verifyCandidate(kind));console.log(JSON.stringify({status:'PASS',assertions,results},null,2));
