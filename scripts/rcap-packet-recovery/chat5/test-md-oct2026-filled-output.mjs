import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
// A46: filled-output regression for the Oct-2026 MD sources. Reads each actual (flattened) packet back by the
// official widget NAME and RECT, never by tooltip: the official 072A No Finding/Compromised tooltips are crossed,
// and four pinned 072B names describe other boxes. Fixture dates stay historical; date guards are not exercised.
const root=fileURLToPath(new URL('../../../',import.meta.url));
const evidence=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
if(evidence)fs.mkdirSync(path.join(evidence,'filled'),{recursive:true});
const {PDFDocument}=createRequire(path.join(root,'package.json'))('pdf-lib');
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const COURT={circuit:'CIRCUIT COURT',district:'DISTRICT COURT OF MARYLAND'};
// Expected text per official field, from the fixture FACTS (not the builder's map or writes); [path,'date'] prints MM/DD/YYYY.
const PERSON={'Defendant Name':'person.name','Printed Name of Defendant':'person.name',"Court's City/County":'court.option',"Court's Address":'court.address',
 "Court's Telephone Number":'court.phone','Tracking Number':'case.tracking','Date':['case.eventDate','date']};
// Official bytes verified by Storage (storage/md-forms-oct2026-20261021, ga20-source-inputs-20261021/md/oct-2026-check).
// Phrases are the printed statement to the right of each box on the official page.
const FORMS=[
 {name:'favorable',form:'CC-DC-CR-072A',sha:'04cb4661a198f7d4036a3cdf359d65db0f28b419fba7b18940322d67185b5e90',rev:'10/01/2026',census:48,
  text:{'Case Number':'case.number','Tracking Number':'case.trackingNumber',"Defendant's Name":'participant.fullName',"Defendant's Date of Birth":['participant.dob','date'],
   'Date Arrested or Served':['case.arrestOrServiceDate','date'],'Law Enforcement Agency':'case.agency','City/County':'case.incidentLocation',
   'Date the charge was Disposed of':['case.dispositionDate','date'],'Defendant Printed Name':'participant.fullName',
   'Defendant Address':'participant.street','Defendant City, State, Zip':'participant.cityStateZip','Defendant Telephone Number':'participant.phone',
   'Defendant E-mail':'participant.email','Defendant Fax':'participant.fax',"Court's City/County":'court.sourceOption',"Court's Address":'court.address'},
  pair:['List the Incident','Incident Continued','case.incidentNarrative'],
  contains:{'List the Offense you were charged with':f=>f.case.chargesInIncident.map(c=>c.description)},receipt:'md-10105-favorable-set',edition:r=>r.edition,
  fixtures:'fixtures',render:'renderMdFavorable',source:m=>m.SOURCE,primary:r=>r,
  phrases:f=>[COURT[f.court.level],{arrest:'arrested',summons:'served with a summons',citation:'served with a citation'}[f.case.event],
   {acquittal:'I was acquitted',dismissal:'the charge was otherwise dismissed',pbj_no_longer_crime:'a probation before judgment was entered on the charge, but',
    pbj:'a probation before judgment was entered on the charge, and',pbj_dui:'a probation before judgment was entered on violation of Transportation',
    nolle:'a nolle prosequi was entered',stet:'a stet was entered',ncr:'I was found not criminally responsible',compromise:'The case was compromised',
    juvenile_transfer:'The case was transferred to the juvenile court'}[f.case.basis],
   f.court.transfer==='adult'&&'The case began in one court and was transferred to another court']},
 {name:'conviction',form:'CC-DC-CR-072B',sha:'47bc720acea515896943e94e1d228b3e8cc380b0ae1d4762dd1928f60f903667',rev:'10/01/2025-2',census:48,
  text:{...PERSON,'Case No':'case.number','Date of Birth':['person.dob','date'],'Law Enforcement Agency':'case.agency','City/County of Law Enforcement Agency':'case.locality',
   'Date of conviction':['case.convictionDate','date'],'Defendant Address':'person.street','City State Zip_2':'person.cityStateZip','Defendant Telephone':'person.phone','Defendant Email':'person.email'},
  pair:['Charged  with the following incident','Charged  with the following incident_1','case.incident'],
  contains:{'charged with the following offense':f=>f.case.charges.flatMap(c=>[c.description,c.statute])},receipt:'md-10110-conviction-set',edition:r=>r.sourceCatalog['CC-DC-CR-072B'].edition,
  fixtures:'convictionFixtures',render:'renderMdConviction',source:m=>m.SOURCES['CC-DC-CR-072B'].path,primary:r=>r.components.find(c=>c.documentId==='CC-DC-CR-072B'),
  phrases:f=>[COURT[f.court.level],{arrest:'arrested',summons:'served with a summons',citation:'or served with'}[f.case.event],
   {no_longer_crime:'the charge/offense, but the conduct',repealed_sexual:'the conviction was for sodomy',nuisance:'a crime specified in Criminal Procedure Article, § 10-105(a)(9)',
    misdemeanor:'a misdemeanor crime specified',assault_battery:'a felony crime specified',felony:'a felony crime specified',
    burglary_theft:'first or second degree burglary',domestic:'a domestically related crime'}[f.case.basis],
   // md-conviction.mjs marks both 10-105(a)(11) statements for a repealed sexual offense
   (f.case.basis==='repealed_sexual'&&'the charge/offense, but the conduct'),(f.case.basis==='no_longer_crime'&&f.case.formerSexualOffense===true&&'the conviction was for sodomy'),
   f.court.transfer==='adult'&&'The case began in one court and was transferred',f.court.appealed===true&&'The case was appealed']},
 {name:'cannabis',form:'CC-DC-CR-072D',sha:'87465cb08d93f3469dc4fe7288360aaa650f21e2dee06ebd4f7f05a4998d2703',rev:'10/2025',census:39,
  text:{...PERSON,'Case Number':'case.number','DOB':['person.dob','date'],'law enforcement agency':'case.agency','City/County':'case.locality',
   'Address of Defendant':'person.street','City, State, Zip_1':'person.cityStateZip','Defendant Telephone No':'person.phone','Defendant Email Address':'person.email'},
  pair:['as a result of the following incident','as a result of the following incident_1','case.incident'],receipt:'md-cannabis-petition-set',edition:r=>r.sourceCatalog['CC-DC-CR-072D'].edition,
  fixtures:'cannabisFixtures',render:'renderMdCannabis',source:m=>m.SOURCE.path,primary:r=>r.components.find(c=>c.documentId==='CC-DC-CR-072D'),
  phrases:f=>[COURT[f.court.level],{arrest:'arrested',summons:'served with a summons',citation:'or served with a citation'}[f.case.event],
   {no_longer_crime:'possession of a controlled dangerous substance (marijuana)',possession:'possession of cannabis under',pwid:'possession with intent to distribute cannabis'}[f.case.basis],
   f.case.otherOffenses===true&&'I was also charged with other offenses']}
];
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'md-oct2026-filled-'));
function words(pdf,page){ // [{x0,y0,x1,y1,text}] in PDF user space (bottom-left origin)
 const xml=execFileSync('pdftotext',['-f',String(page),'-l',String(page),'-bbox',pdf,'-'],{encoding:'utf8',maxBuffer:8<<20});
 const h=Number(/<page width="[\d.]+" height="([\d.]+)"/.exec(xml)[1]);
 return [...xml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)<\/word>/g)].map(([,a,b,c,d,t])=>
  ({x0:+a,y0:h-d,x1:+c,y1:h-b,text:t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")}));
}
function gray(pdf,page,tag){ // 100 dpi PGM -> {w,h,px}
 const base=path.join(tmp,tag);execFileSync('pdftoppm',['-f',String(page),'-l',String(page),'-r','100','-gray','-singlefile',pdf,base]);
 const b=fs.readFileSync(base+'.pgm'),m=/^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(b.toString('latin1',0,40));
 return {w:+m[1],h:+m[2],px:b.subarray(m[0].length)};
}
const k=100/72;
function ink(img,[x0,y0,x1,y1]){ // dark fraction of the inner half of a box
 const dx=(x1-x0)/4,dy=(y1-y0)/4,X0=Math.round((x0+dx)*k),X1=Math.round((x1-dx)*k),Y0=Math.round(img.h-(y1-dy)*k),Y1=Math.round(img.h-(y0+dy)*k);
 let n=0,dark=0;for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){n++;if(img.px[y*img.w+x]<128)dark++;}return dark/Math.max(1,n);
}
const inside=([x0,y0,x1,y1],w)=>{const cx=(w.x0+w.x1)/2,cy=(w.y0+w.y1)/2;return cx>=x0-1&&cx<=x1+1&&cy>=y0-1&&cy<=y1+1;};
function minus(a,b){const left=[...b.map(w=>w.text)];return a.filter(w=>{const i=left.indexOf(w.text);if(i<0)return true;left.splice(i,1);return false;});}
const beside=(ws,[,y0,x1,y1])=>norm(ws.filter(w=>w.x0>=x1-1&&w.y0-2<=(y0+y1)/2&&(y0+y1)/2<=w.y1+2).sort((a,b)=>a.x0-b.x0).map(w=>w.text).join(' '));
const rows=[];let failures=0;
for(const F of FORMS){
 const m=await import(pathToFileURL(path.join(root,'scripts/rcap-packet-recovery/chat5/md-'+F.name+'.mjs')));
 const sourcePath=path.join(root,F.source(m)),source=fs.readFileSync(sourcePath);
 const check=(label,fn)=>{try{fn();rows.push({builder:F.name,check:label,status:'PASS'});}catch(e){failures++;rows.push({builder:F.name,check:label,status:'FAIL',error:e.message.split('\n')[0]});}};
 check('builder source is the verified Oct-2026 official bytes',()=>assert.equal(hash(source),F.sha,F.form+' source '+F.source(m)));
 if(hash(source)!==F.sha)continue;
 const fields=(await PDFDocument.load(source)).getForm().getFields();
 check('official census: '+F.census+' fields, one widget each',()=>{assert.equal(fields.length,F.census);for(const f of fields)assert.equal(f.acroField.getWidgets().length,1,f.getName());});
 const widgets=new Map(fields.map(f=>{const r=f.acroField.getWidgets()[0].getRectangle();
  return [f.getName(),{type:f.constructor.name,rect:[r.x,r.y,r.x+r.width,r.y+r.height]}];}));
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'data/rcap-all50/overlays/census-v1/md',F.receipt+'--official-pdf-fill/source-receipt.json'),'utf8'));
 check('committed family receipt edition is '+F.rev,()=>assert.equal(F.edition(receipt),F.rev));
 const blankWords=words(sourcePath,1),blankInk=gray(sourcePath,1,F.name+'-blank');
 for(const [key,original] of Object.entries(m[F.fixtures]())){
  const facts=structuredClone(original),saved=structuredClone(facts);
  const r=await m[F.render](facts),primary=F.primary(r);
  check(key+': input preserved',()=>assert.deepEqual(facts,saved));
  const page=F.name==='favorable'?1:r.pageManifest.find(p=>p.documentId===F.form&&p.sourcePage===1).packetPage;
  const out=path.join(tmp,F.name+'-'+key.replaceAll('/','-')+'.pdf');fs.writeFileSync(out,r.bytes);
  if(evidence)fs.copyFileSync(out,path.join(evidence,'filled',path.basename(out)));
  const ws=words(out,page),img=gray(out,page,F.name+'-out');
  check(key+': form page renders '+F.form+' (Rev. '+F.rev+')',()=>assert.ok(norm(ws.map(w=>w.text).join(' ')).includes(F.form+' (Rev. '+F.rev+')')));
  check(key+': every page states only revision '+F.rev+' for '+F.form,()=>{
   const all=norm(execFileSync('pdftotext',['-layout',out,'-'],{encoding:'utf8',maxBuffer:8<<20}));
   const stated=[...all.matchAll(new RegExp(F.form+'\\W{0,3}(?:\\(Rev\\.|revision)\\s*([0-9][0-9/-]*[0-9])','gi'))].map(x=>x[1]);
   assert.ok(stated.length>0,'no revision stated');assert.deepEqual([...new Set(stated)],[F.rev],'stated revisions '+JSON.stringify(stated));});
  check(key+': page size equals the official page',()=>assert.deepEqual([img.w,img.h],[blankInk.w,blankInk.h]));
  const text=primary.writes.filter(w=>widgets.get(w.field)?.type!=='PDFCheckBox'),boxes=primary.writes.filter(w=>widgets.get(w.field)?.type==='PDFCheckBox');
  check(key+': every write names an official widget',()=>{for(const w of primary.writes)assert.ok(widgets.has(w.field),'unknown widget '+w.field);});
  check(key+': text values are distinguishable sentinels (one value per fact)',()=>{const by=new Map();
   for(const w of text){const v=norm(w.value);assert.ok(v,'empty write '+w.field);assert.ok(!by.has(v)||by.get(v)===w.factId,`value shared by ${by.get(v)} and ${w.factId}`);by.set(v,w.factId);}});
  const readback={};
  for(const [name,wd] of widgets){
   if(wd.type==='PDFCheckBox'){readback[name]=ink(img,wd.rect)-ink(blankInk,wd.rect)>0.15;continue;}
   readback[name]=norm(minus(ws.filter(w=>inside(wd.rect,w)),blankWords.filter(w=>inside(wd.rect,w))).map(w=>w.text).join(' '));
  }
  check(key+': each text value reads back inside its own widget rect',()=>{for(const w of text)assert.equal(readback[w.field],norm(w.value),`${w.field} reads ${JSON.stringify(readback[w.field])}`);});
  check(key+': each text widget shows the fact the official field asks for (independent table)',()=>{
   const at=k=>k.split('.').reduce((o,x)=>o?.[x],facts),fmt=e=>{const [k,kind]=Array.isArray(e)?e:[e],v=at(k);
    return v===undefined||v===null||v===''?'':kind==='date'?`${v.slice(5,7)}/${v.slice(8,10)}/${v.slice(0,4)}`:norm(v);};
   for(const [field,e] of Object.entries(F.text)){assert.ok(widgets.has(field),'table names no official field: '+field);assert.equal(readback[field],fmt(e),`${field} reads ${JSON.stringify(readback[field])}`);}
   const [a,b,k]=F.pair;assert.equal(norm(readback[a]+' '+readback[b]),fmt(k),`${a}+${b}`);
   for(const [field,want] of Object.entries(F.contains??{}))for(const part of want(facts))assert.ok(readback[field].includes(norm(part)),`${field} lacks ${part}`);
   const covered=new Set([...Object.keys(F.text),a,b,...Object.keys(F.contains??{})]);
   for(const w of text)assert.ok(covered.has(w.field),'write outside the independent table: '+w.field);});
  check(key+': every unwritten text widget stays blank',()=>{const written=new Set(text.map(w=>w.field));
   for(const [name,wd] of widgets)if(wd.type!=='PDFCheckBox'&&!written.has(name))assert.equal(readback[name],'',`${name} reads ${JSON.stringify(readback[name])}`);});
  check(key+': ticked boxes are exactly the written boxes',()=>assert.deepEqual(
   [...widgets].filter(([n,wd])=>wd.type==='PDFCheckBox'&&readback[n]).map(([n])=>n).sort(),[...new Set(boxes.map(w=>w.field))].sort(),'ticked vs written'));
  check(key+': each ticked box sits beside its selected printed statement',()=>{
   const want=F.phrases(facts).filter(Boolean),hit=new Set();
   for(const w of boxes){const b=beside(ws,widgets.get(w.field).rect).toLowerCase(),match=want.filter(p=>b.startsWith(p.toLowerCase()));
    assert.equal(match.length,1,`${w.field} beside "${b.slice(0,80)}" matches ${JSON.stringify(match)}`);hit.add(match[0]);}
   const missing=r.missing??primary.blanks.filter(b=>b.requiredBeforeFiling);
   for(const p of want)if(!hit.has(p))assert.ok(missing.length>0,'selected statement not ticked: '+p);});
  if(key==='canonical'){const again=await m[F.render](JSON.parse(JSON.stringify(saved)));
   check(key+': saved-answer save/reload output is byte-identical',()=>assert.equal(again.sha256,r.sha256));}
  if(evidence)fs.writeFileSync(path.join(evidence,'filled',path.basename(out,'.pdf')+'.readback.json'),JSON.stringify({builder:F.name,fixture:key,form:F.form,page,sha256:r.sha256,writes:primary.writes.map(w=>({field:w.field,value:w.value})),readback},null,1)+'\n');
 }
}
fs.rmSync(tmp,{recursive:true,force:true});
const result={status:failures?'RED':'PASS',checks:rows.length,failures,scope:'Oct-2026 072A/072B/072D filled-output placement by official name+rect; historical fixture dates; no legal-eligibility or date-guard claim.',rows};
if(evidence)fs.writeFileSync(path.join(evidence,'filled-output-results.json'),JSON.stringify(result,null,1)+'\n');
console.log(JSON.stringify({status:result.status,checks:rows.length,failures,failed:rows.filter(r=>r.status==='FAIL').slice(0,12)},null,1));
process.exitCode=failures?1:0;
