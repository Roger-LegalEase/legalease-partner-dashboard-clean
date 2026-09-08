/** Chat8 actual FLAT Form4 only. Geometry is measured from Form4, not Form3. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {ROOT,sha256,pretty,finalizedBytes,proseDocument} from './ia-901c3.mjs';
import {validateAlcoholFacts,alcoholFixtures,labels,fieldFacts,alcoholBindings,alcoholBlank,alcoholInstructions,assembleAlcohol,buildAlcoholFamily,authorities as baseAuthorities} from './ia-12346.mjs';
import {fitTextToWidget} from '../../rcap-official-forms/rcap-text-fitting.mjs';
import {sanitizeAndFlatten} from '../../rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata,carryDates} from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
export {ROOT,sha256,pretty};
export const FAMILY='ia-12347-set';
export const OUTPUT='data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill';
export const SOURCE='reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-4-2024-08.pdf';
export const SOURCE_SHA256='279eefe8c5f6b51ec73eb943c9a479757ff3d2c439177bfbf3044e7e71f66c45';
export const MAP='scripts/rcap-packet-recovery/chat8/form4-source-map.json';
export const authorities={...baseAuthorities,form:'https://www.iowacourts.gov/browse/files/0931114ef0c149baac1e450ac738ec7a/download',statute:'https://www.legis.iowa.gov/docs/code/2026/123.47.pdf'};
export const fixtureFacts=()=>alcoholFixtures('123.47(3)');
export const validateFacts=f=>validateAlcoholFacts(f,'123.47(3)');
export async function renderFixture(input,{sourceBytes,sourceMap}={}) {
 const v=validateFacts(input),raw=sourceBytes??await fs.readFile(path.join(ROOT,SOURCE));if(sha256(raw)!==SOURCE_SHA256)throw Error('Wrong/stale Form4 source');
 const profile=sourceMap??JSON.parse(await fs.readFile(path.join(ROOT,MAP),'utf8'));
 if(profile.sourceSha256!==SOURCE_SHA256||profile.areas.length!==46||new Set(profile.areas.map(x=>x.key)).size!==46)throw Error('Form4 measured source-map identity/inventory drift');
 const doc=await PDFDocument.load(raw,{updateMetadata:false});if(doc.getPageCount()!==2||doc.getForm().getFields().length!==0)throw Error('Expected actual flat two-page Form4');
 const font=await doc.embedFont(StandardFonts.Helvetica),bindings=alcoholBindings(v,{manualGround:true}),actualWrites=[],blanks=[],fieldMap=[],sourceFields=[];
 for(const area of profile.areas) {
  const key=area.key,id=key==='printed.signature'?key:'2.86-4.'+key;
  const widgets=area.widgets??[{page:area.page,rect:area.rect}];
  for(const z of widgets){const r=z.rect;if(![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<5||r.height<5||r.x+r.width>612||r.y+r.height>792||![1,2].includes(z.page))throw Error('Invalid measured Form4 area '+key);}
  const row={fieldId:id,sourceFieldId:id,fact:fieldFacts[key]??null,label:labels[key]??(key.startsWith('sig.b.')?'Attorney-only block B '+key:'Participant signature'),type:area.type,widgets,isSelectionControl:['printed_checkbox','printed_selection'].includes(area.type),measurement:area.method};
  sourceFields.push({name:id,pdfType:area.type,widgets});const w=bindings.get(key);
  if(w) {
   const z=widgets[0],r=z.rect,p=doc.getPage(z.page-1);let fit=null;
   if(area.type==='printed_text'){
    fit=fitTextToWidget({font,text:String(w.value),rect:r,multiline:false,maxFontSize:11,minFontSize:8,evaluateDeclaredMinimumSize:true});
    if(fit.outcome==='refused')throw Error('Unreadable known Form4 fact '+id);
    p.drawText(String(w.value),{x:r.x+2,y:r.y+2,size:fit.fontSize,font,color:rgb(0,0,0)});
   } else if(area.type==='printed_checkbox'){
    p.drawLine({start:{x:r.x+2,y:r.y+2},end:{x:r.x+r.width-2,y:r.y+r.height-2},thickness:.85,color:rgb(0,0,0)});
    p.drawLine({start:{x:r.x+2,y:r.y+r.height-2},end:{x:r.x+r.width-2,y:r.y+2},thickness:.85,color:rgb(0,0,0)});
   } else throw Error('Unpermitted Form4 execution write '+id);
   actualWrites.push({...row,...w,fit});fieldMap.push({...row,action:'WRITE',fact:w.fact});
  } else {const b={...row,...alcoholBlank(key,area.type,v,{manualGround:true})};blanks.push(b);fieldMap.push({...b,action:'BLANK'});}
 }
 if(actualWrites.length+blanks.length!==46||actualWrites.some(w=>w.fieldId==='2.86-4.01.00'))throw Error('Incomplete or falsely executed Form4 source');
 const {clean,report:sanitation}=await sanitizeAndFlatten(doc,{defaultFont:font,suppressSynthesizedAppearances:true});preserveSourceMetadata(doc,clean);carryDates(doc,clean);
 const application=await finalizedBytes(clean),instructions=alcoholInstructions(v,blanks,{formNumber:4,section:'123.47(3)',manualGround:true});
 const guide=await proseDocument('Iowa underage alcohol possession: next steps',instructions,{synthetic:v.facts.synthetic,subtitle:`${v.facts.name} | ${v.facts.county} County | ${v.facts.caseNumber}`});
 return assembleAlcohol({v,application,instructions,guide,actualWrites,blanks,fieldMap,sourceFields,sanitation,formNumber:4});
}
export const buildFamily=options=>buildAlcoholFamily({family:FAMILY,output:OUTPUT,source:SOURCE,sourceSha:SOURCE_SHA256,formNumber:4,renderer:renderFixture,fixtures:fixtureFacts(),authorityBindings:authorities,...options});
