import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Filled-output regression for CO JDF 612 and JDF 615 at R: July 1, 2025. Reads the committed packets back by the
// official widget NAME and RECT (every widget of every field), against a fact table written here from the fixture
// facts, not from the builder's map or its own write report. Run with --output=<dir> to keep the read-back evidence.
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
if(evidence)fs.mkdirSync(evidence,{recursive:true});
const {PDFDocument}=createRequire(path.join(root,'package.json'))('pdf-lib');
const {factsForFixture}=await import('./build-census-v1-co_motion_seal_conviction-set.mjs');
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const OUT='data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill';
const read=rel=>fs.readFileSync(path.join(root,rel));
const mdy=iso=>`${iso.slice(5,7)}/${iso.slice(8,10)}/${iso.slice(0,4)}`;
const csz=f=>`${f['participant.city']}, ${f['participant.state']} ${f['participant.zip']}`;
// The fact each official text widget must show; every other text widget on the form must read back blank.
// JDF 615: only the caption county and case number. Its `∆` is one field with section 2(a), which the court completes.
const FORMS=[
 {form:'JDF-612',file:'reference/co-jdf-2025-07-01/JDF612.pdf',fields:64,pages:5,
  text:{County:f=>f['matter.county'],'Case Number':f=>f['matter.case_number'],'3Z.1':f=>f['matter.case_number'],
   '∆':f=>f['participant.full_legal_name'],'∆ DoB':f=>mdy(f['participant.date_of_birth']),'∆ Street Address':f=>f['participant.street_address'],
   '∆ CSZ':csz,'∆ Phone':f=>f['participant.phone'],'∆ Email':f=>f['participant.email']}},
 {form:'JDF-615',file:'reference/co-jdf-2025-07-01/JDF615.pdf',fields:21,pages:3,
  text:{County:f=>f['matter.county'],'Case Number':f=>f['matter.case_number']}}
];
const registry=JSON.parse(read('data/record-clearing/legal-design-track-registry.json'));
const bindings=registry.tracks.find(t=>t.trackId==='co_motion_seal_conviction').sourceBindings;
const receipt=JSON.parse(read(`${OUT}/source-receipt.json`));
const rendered=JSON.parse(read(`${OUT}/reports/rendered-artifacts.json`));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'co-jdf612-615-filled-'));
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
const rows=[];let failures=0;
const check=(scope,label,fn)=>{try{fn();rows.push({scope,check:label,status:'PASS'});}catch(e){failures++;rows.push({scope,check:label,status:'FAIL',error:e.message.split('\n')[0]});}};
for(const F of FORMS){
 const source=read(F.file),want=bindings.find(b=>b.sourceId===`official-form:${F.form}`);
 check(F.form,'source bytes equal the track registry R: July 1, 2025 digest',()=>{assert.equal(want.revision,'2025-07-01');assert.equal(hash(source),want.sha256);});
 check(F.form,'source receipt binds those bytes at REV-2025-07-01',()=>{const d=receipt.documents.find(x=>x.formNumber===F.form);
  assert.equal(d.sha256,want.sha256);assert.equal(d.revision,'REV-2025-07-01');assert.equal(d.pathInArchive,F.file);});
 const doc=await PDFDocument.load(source),pages=doc.getPages(),fields=doc.getForm().getFields();
 check(F.form,`official census: ${F.fields} fields, ${F.pages} pages`,()=>{assert.equal(fields.length,F.fields);assert.equal(pages.length,F.pages);});
 const widgets=fields.flatMap(f=>f.acroField.getWidgets().map((w,i)=>{const r=w.getRectangle();
  return {name:f.getName(),i,type:f.constructor.name,page:pages.findIndex(p=>p.ref===w.P())+1,rect:[r.x,r.y,r.x+r.width,r.y+r.height]};}));
 check(F.form,'every expected field is an official text field',()=>{for(const n of Object.keys(F.text))assert.ok(widgets.some(w=>w.name===n&&w.type==='PDFTextField'),n);});
 const srcPath=path.join(root,F.file),blank={};
 for(let p=1;p<=F.pages;p++)blank[p]={ws:words(srcPath,p),img:gray(srcPath,p,`${F.form}-blank-${p}`)};
 for(const artifact of rendered.artifacts){
  const scope=`${F.form} ${artifact.fixture}`,facts=factsForFixture(artifact.fixture),out=path.join(root,artifact.file);
  check(scope,'committed packet bytes are the bytes the build reported',()=>assert.equal(hash(fs.readFileSync(out)),artifact.sha256));
  const manifest=artifact.pageManifest.filter(m=>m.formNumber===F.form);
  check(scope,'packet carries every page of the bound source',()=>{assert.deepEqual(manifest.map(m=>m.sourcePage),pages.map((_,i)=>i+1));
   for(const m of manifest)assert.equal(m.sourceSha256,want.sha256);});
  if(manifest.length!==F.pages)continue;
  const packetPage=p=>manifest.find(m=>m.sourcePage===p).packetPage,got={};
  for(let p=1;p<=F.pages;p++){
   const ws=words(out,packetPage(p)),img=gray(out,packetPage(p),`${F.form}-${artifact.fixture}-${p}`);
   check(scope,`page ${p} prints R: July 1, 2025 and no other revision`,()=>{const t=norm(ws.map(w=>w.text).join(' '));
    assert.ok(t.includes('R: July 1, 2025'),'no R: July 1, 2025');assert.ok(!/R: [A-Z][a-z]+ \d{1,2}, 20\d\d/.test(t.replaceAll('R: July 1, 2025','')),'another revision');});
   check(scope,`page ${p} size equals the official page`,()=>assert.deepEqual([img.w,img.h],[blank[p].img.w,blank[p].img.h]));
   for(const w of widgets.filter(x=>x.page===p)){
    const key=`${w.name}#${w.i}`;
    got[key]=w.type==='PDFTextField'||w.type==='PDFDropdown'
     ? norm(minus(ws.filter(x=>inside(w.rect,x)),blank[p].ws.filter(x=>inside(w.rect,x))).map(x=>x.text).join(' '))
     : ink(img,w.rect)-ink(blank[p].img,w.rect)>0.15;
   }
  }
  check(scope,'each text widget shows exactly the fact the official field asks for, inside its own rect',()=>{
   for(const w of widgets.filter(x=>x.type==='PDFTextField')){const fn=F.text[w.name];
    assert.equal(got[`${w.name}#${w.i}`],fn?norm(fn(facts)):'',`${w.name} widget ${w.i} on page ${w.page} reads ${JSON.stringify(got[`${w.name}#${w.i}`])}`);}});
  check(scope,'no dropdown carries a value (court type and appellate court are the participant’s)',()=>{
   for(const w of widgets.filter(x=>x.type==='PDFDropdown'))assert.equal(got[`${w.name}#${w.i}`],'',w.name);});
  check(scope,'no box or radio is ticked (every selection is the participant’s or the court’s)',()=>{
   for(const w of widgets.filter(x=>x.type==='PDFCheckBox'||x.type==='PDFRadioGroup'))assert.equal(got[`${w.name}#${w.i}`],false,`${w.name} widget ${w.i}`);});
  check(scope,'the fixture facts are distinguishable sentinels (one value per fact)',()=>{
   const v=[facts['matter.county'],facts['matter.case_number'],facts['participant.full_legal_name'],mdy(facts['participant.date_of_birth']),
    facts['participant.street_address'],csz(facts),facts['participant.phone'],facts['participant.email']].map(norm);
   assert.equal(new Set(v).size,v.length,JSON.stringify(v));});
  // Save and reload: the flattened packet survives a pdf-lib round trip with the same read-back.
  const again=path.join(tmp,`${F.form}-${artifact.fixture}-resaved.pdf`);
  fs.writeFileSync(again,await (await PDFDocument.load(fs.readFileSync(out))).save({useObjectStreams:false}));
  check(scope,'save and reload keeps every read-back text value',()=>{for(let p=1;p<=F.pages;p++){
   const ws=words(again,packetPage(p));
   for(const w of widgets.filter(x=>x.page===p&&x.type==='PDFTextField'))assert.equal(norm(minus(ws.filter(x=>inside(w.rect,x)),blank[p].ws.filter(x=>inside(w.rect,x))).map(x=>x.text).join(' ')),got[`${w.name}#${w.i}`],w.name);}});
  if(evidence)fs.writeFileSync(path.join(evidence,`${F.form}-${artifact.fixture}.readback.json`),JSON.stringify({form:F.form,fixture:artifact.fixture,packet:artifact.file,sha256:artifact.sha256,packetPages:manifest.map(m=>m.packetPage),readback:got},null,1)+'\n');
 }
}
fs.rmSync(tmp,{recursive:true,force:true});
const result={status:failures?'RED':'PASS',checks:rows.length,failures,scope:'CO JDF 612/615 R: July 1, 2025 filled-output placement by official name+rect in the committed canonical and boundary packets.',rows};
if(evidence)fs.writeFileSync(path.join(evidence,'filled-output-results.json'),JSON.stringify(result,null,1)+'\n');
console.log(JSON.stringify({status:result.status,checks:rows.length,failures,failed:rows.filter(r=>r.status==='FAIL').slice(0,12)},null,1));
process.exitCode=failures?1:0;
