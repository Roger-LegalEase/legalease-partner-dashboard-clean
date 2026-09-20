import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PDFDocument,PDFDict,PDFName,PDFArray,decodePDFRawStream} from 'pdf-lib';
import {skeleton} from '../../../../../scripts/grade-a-packet-factory-24h/stroke-fill-skeleton.mjs';
const OUT='data/rcap-grade-a/packet-factory-24h/vf08/tx-eight-current-20260911';
const scope=JSON.parse(fs.readFileSync(`${OUT}/scope.json`));
const acc=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/vf90/tx-current-stream-accounting-20260911/accounting.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const decode=o=>{try{return Buffer.from(decodePDFRawStream(o).decode());}catch{return null;}};
const load=b=>PDFDocument.load(b,{updateMetadata:false,ignoreEncryption:true});
const results=[];
for(const family of scope.families){
 const dir=scope.directories[family], af=acc.families.find(f=>f.familyId===family), pool=new Map(),sources=[];
 for(const s of af.sourceFiles){
  const p=s.path.replace('/workspaces/legalease-partner-dashboard-clean/',`${process.cwd()}/`);const b=fs.readFileSync(p);if(sha(b)!==s.expectedSha256)throw Error(`source changed ${p}`);
  const doc=await load(b);let streamCount=0;
  for(const [ref,o] of doc.context.enumerateIndirectObjects())if(o?.dict instanceof PDFDict && o.dict.has(PDFName.of('BBox'))){const bytes=decode(o);if(bytes){const h=sha(bytes);if(!pool.has(h))pool.set(h,[]);pool.get(h).push({sourceSha256:sha(b),sourcePath:p,ref:ref.toString(),bytes:bytes.length,skeletonSha256:skeleton(bytes).sha256});streamCount++;}}
  sources.push({path:p,sha256:sha(b),expectedSha256:s.expectedSha256,byteLength:b.length,pages:doc.getPageCount(),appearanceStreamCount:streamCount});
 }
 const priorBase=family.includes('acquittal')||['tx_nd_conviction_no_supervision-set','tx_nd_dwi_deferred-set','tx_nd_probation_misdemeanor-set'].includes(family)?'648d8cf381296faee39f53777d3ec0ad36558504':'d2b19ffd3883d1c1ff18e17c9c18489eb14db242';
 const fixtures=[];
 async function measure(b,full){
  const doc=await load(b); const pages=[];let undecode=0;
  for(const [i,p] of doc.getPages().entries()){
   const x=p.node.Resources()?.lookup(PDFName.of('XObject'));const appearances=[];const allX=[];
   if(x instanceof PDFDict)for(const [name,ref]of x.entries()){
    const o=doc.context.lookup(ref),bytes=decode(o);if(!bytes){undecode++;continue;}allX.push(sha(bytes));
    if(!/^\/(FlatWidget|ExactFactOverlay)-\d+$/.test(name.toString()))continue;
    const t=bytes.toString('latin1');const draws=[...t.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)].map(m=>m[1]).join('')+[...t.matchAll(/<([0-9A-Fa-f\s]*)>\s*Tj/g)].map(m=>m[1].replace(/\s/g,'')).join('');
    const paints=/(^|[\s\]>)])(S|s|f|F|f\*|B|B\*|b|b\*|sh)(?=[\s[<(/%]|$)/.test(t);
    const kind=draws.replace(/\s/g,'').length?'text':paints?'stroke-only':'blank';
    const h=sha(bytes), sk=skeleton(bytes),match=pool.get(h)??[];
    appearances.push({name:name.toString(),kind,sha256:h,bytes:bytes.length,sourceMatches:kind==='stroke-only'?match.slice(0,1):undefined,sourceMatchingStreamCount:kind==='stroke-only'?match.length:undefined,hadLeadingFill:kind==='stroke-only'?sk.changed:undefined});
   }
   let c=p.node.Contents();if(!(c instanceof PDFArray))c=c?[c]:[];else c=c.asArray();
   const contents=c.map(ref=>decode(doc.context.lookup(ref))).filter(Boolean).map(b=>b.toString('latin1').replace(/\/(FlatWidget|ExactFactOverlay)-\d+/g,'/$1-ID'));
   pages.push({page:i+1,width:p.getWidth(),height:p.getHeight(),annots:p.node.Annots()?.size()??0,contentSha256:sha(contents.join('\n')),appearanceMultisetSha256:sha(allX.sort().join('\n')),appearances:full?appearances:undefined});
  }
  return {sha256:sha(b),bytes:b.length,pages,undecodableXobjects:undecode,fields:doc.getForm().getFields().length};
 }
 for(const fixture of ['canonical','boundary']){
  const file=`${dir}/fixtures/${fixture}.pdf`,b=fs.readFileSync(file),current=await measure(b,true);
  let old=null,priorError=null;try{old=await measure(execFileSync('git',['show',`${priorBase}:${file}`],{maxBuffer:15e6}),false);}catch(e){priorError=e.message;}
  const changes=current.pages.map((p,i)=>({page:p.page,contentUnchanged:p.contentSha256===old?.pages[i]?.contentSha256,appearanceBytesUnchanged:p.appearanceMultisetSha256===old?.pages[i]?.appearanceMultisetSha256}));
  const apps=current.pages.flatMap(p=>p.appearances.map(a=>({...a,page:p.page}))),stroke=apps.filter(a=>a.kind==='stroke-only');
  fixtures.push({fixture,file,priorBase,priorSha256:old?.sha256,priorError,...current,changes,counts:{flattenedAppearances:apps.length,textAppearances:apps.filter(a=>a.kind==='text').length,blankAppearances:apps.filter(a=>a.kind==='blank').length,strokeOnly:stroke.length,exactSourceMatches:stroke.filter(a=>a.sourceMatches.length).length,unmatched:stroke.filter(a=>!a.sourceMatches.length).length}});
 }
 results.push({familyId:family,dir,priorBase,sources,sourcePoolDistinct:pool.size,fixtures});
 console.log(family,JSON.stringify(fixtures.map(f=>({fixture:f.fixture,...f.counts,changedPages:f.changes.filter(p=>!p.contentUnchanged||!p.appearanceBytesUnchanged).map(p=>p.page)}))));
}
fs.writeFileSync(`${OUT}/stream-measurements.json`,JSON.stringify(results,null,2)+'\n');
