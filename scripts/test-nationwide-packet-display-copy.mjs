import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {packetDisplayCopy,packetMatterTitleCopy,packetMatterSubtitleCopy,packetMatterSummaryCopy,packetMatterSentenceCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {reviewedPacketQuestion}=await import('../src/lib/expungement-ai/reviewed-question-copy.ts');
const catalog=JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-packet-display-copy.json'));
let count=0;const eq=(actual,expected,why)=>{assert.deepEqual(actual,expected,why);count++;};
for(const entry of catalog.entries){
 for(const route of entry.routeKeys){const [state,pathway]=route.split(':');
  eq(packetDisplayCopy(entry.kind,state,pathway,entry.english),{en:entry.english,es:entry.spanish});
  for(const text of [entry.english+' ',entry.english.toUpperCase(),'Entered title: '+entry.english])eq(packetDisplayCopy(entry.kind,state,pathway,text),{en:text},'exact original metadata required');
  eq(packetDisplayCopy(entry.kind,state,'unreviewed',entry.english),{en:entry.english});
  eq(packetDisplayCopy(entry.kind,null,pathway,entry.english),{en:entry.english});
 }
}
const routeEntries = [...catalog.entries.filter(e=>e.kind==='route_label').flatMap(e=>e.routeKeys.map(key=>{const [jurisdiction,pathwayId]=key.split(':');return {jurisdiction,pathwayId,title:e.english,es:e.spanish};})), ...JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json')).entries.filter(e=>e.kind==='route_display_label').map(e=>({jurisdiction:e.jurisdiction,pathwayId:e.pathwayId,title:e.originalEnglish,es:e.es}))];
for(const route of routeEntries){
 const item={...route,pathwayLabel:route.title,authorityStatus:'protected_draft'};const before=JSON.stringify(item);
 for(const authorityStatus of ['protected_draft','protected_verified','trusted_source'])eq(packetMatterTitleCopy({...item,authorityStatus}),packetDisplayCopy('route_label',route.jurisdiction,route.pathwayId,route.title),'only existing exact route copy is reused');
 eq(packetMatterTitleCopy({...item,authorityStatus:'unavailable'}),{en:route.title},'unavailable authority does not localize claimed route');
 for(const title of ['My own title '+route.title,route.title+' ', 'Calle Peña {count}', '<script>literal</script>'])eq(packetMatterTitleCopy({...item,title}),{en:title},'other title remains literal');
 for(const changes of [{jurisdiction:null},{pathwayId:null},{pathwayId:'not-a-reviewed-route'},{pathwayLabel:null},{pathwayLabel:'different label'}])eq(packetMatterTitleCopy({...item,...changes}),{en:route.title},'missing/mismatched identity preserves original');
 eq(JSON.stringify(item),before,'display lookup does not mutate facts or authority');
}
const templates = [
 ["Finish your {title} check", "Termine la revisión de {title}"],
 ["Your packet for {title} is ready with filing next steps.", "Su paquete para {title} está listo con los próximos pasos para presentarlo."],
 ["{title} is filed and waiting on a decision. There's nothing to do right now. We'll help you keep track.", "{title} fue presentado y está esperando una decisión. No tiene que hacer nada ahora. Le ayudaremos a darle seguimiento."],
 ["We saved step-by-step guidance for {title}. Open it whenever you're ready.", "Guardamos una guía paso a paso para {title}. Ábrala cuando esté listo."],
 ["Open {title} ({where}) to review what we found and what you can do next.", "Abra {title} ({where}) para revisar lo que encontramos y qué puede hacer después."]
];
const insert = (template,vars) => template.replace(/\{(title|where)\}/g, (_,key)=>vars[key]);
for(const route of routeEntries){
 const item = {...route, pathwayLabel:route.title, authorityStatus:'protected_draft', createdAt:'2020-07-01T12:00:00Z', summary:null};
 const before = JSON.stringify(item), label = packetDisplayCopy('route_label',item.jurisdiction,item.pathwayId,item.pathwayLabel);
 const where = {en:[item.jurisdiction,label.en,'2020'].join(', '),es:[item.jurisdiction,label.es??label.en,'2020'].join(', ')};
 eq(packetMatterSubtitleCopy(item),where,'subtitle uses exact reviewed label and unchanged jurisdiction/year');
 for(const [en,es] of templates){
  eq(packetMatterSentenceCopy(item,en),{en:insert(en,{title:label.en,where:where.en}),es:insert(es,{title:label.es??label.en,where:where.es})},'generated sentence uses its actual reviewed route label');
  for(const title of ['Calle Peña {where} {title}', '<script>literal</script>', 'My saved\nline']){
   eq(packetMatterSentenceCopy({...item,title},en),{en:insert(en,{title,where:where.en}),es:insert(es,{title,where:where.es})},'participant title is inserted once, without translating or interpreting it');
  }
 }
 eq(JSON.stringify(item),before,'generated presentation does not mutate authority or saved facts');
 const unmatched = {...item,pathwayId:'not-registered'};
 eq(packetMatterSubtitleCopy(unmatched),{en:[item.jurisdiction,item.pathwayLabel,'2020'].join(', '),es:[item.jurisdiction,item.pathwayLabel,'2020'].join(', ')},'unmatched route label remains literal');
}
eq(packetMatterSubtitleCopy({authorityStatus:'unavailable',jurisdiction:null,pathwayId:null,pathwayLabel:null,title:'Untouched',summary:null,createdAt:'invalid'}),{en:''});
const summaryEntry=JSON.parse(readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json')).entries.find(entry=>entry.kind!=='route_display_label');
eq(packetMatterSummaryCopy({authorityStatus:'protected_draft',summary:summaryEntry.originalEnglish}),{en:summaryEntry.originalEnglish,es:summaryEntry.es},'exact registered summary copy');
for(const summary of [null,'Private participant text {title}',summaryEntry.originalEnglish+' changed'])eq(packetMatterSummaryCopy({authorityStatus:'protected_draft',summary}),{en:summary??''},'unknown summary is literal');
eq(packetMatterSummaryCopy({authorityStatus:'unavailable',summary:summaryEntry.originalEnglish}),{en:summaryEntry.originalEnglish},'unavailable authority does not assert reviewed summary');
for(const name of ['Yes.pdf' ,'My matters.pdf','Calle Peña {count}.pdf','not_sure.pdf']){
 eq(resolveRuntimeText('es','Download {fileName}',{vars:{fileName:name}}),'Descargar '+name,'filename must remain verbatim including braces');
 eq(resolveRuntimeText('en','Download {fileName}',{vars:{fileName:name}}),'Download '+name);
}
eq(resolveRuntimeText('es','{count} page.',{vars:{count:1}}),'1 página.');
eq(resolveRuntimeText('es','{count} pages.',{vars:{count:2}}),'2 páginas.');
const q={id:'residency_or_location',type:'text_or_unknown',prompt:'What city or location belongs with this matter?',helperText:'',options:null,required:true,contextOnly:false};
const context={state:'ND',pathwayId:'first-offense-possession-sealing',participantOwnsRecord:true};
const transformed=reviewedPacketQuestion(q,context);
eq(transformed.prompt,'Which county or judicial district belongs in the court caption for this case?');
eq(transformed.translations.es.prompt,'¿Qué condado o distrito judicial debe figurar en el encabezado de este caso?');
for(const key of ['id','type','options','required','contextOnly'])eq(transformed[key],q[key]);
for(const c of [{...context,participantOwnsRecord:false},{...context,pathwayId:'another-route'},{...context,state:'MS'}])eq(reviewedPacketQuestion(q,c).prompt,q.prompt,'unreviewed audience/route retains original');
eq(reviewedPacketQuestion({...q,prompt:'Current residence'},context).prompt,'Current residence','ID alone is not meaning');
console.log(JSON.stringify({status:'PASS',checks:count,metadataEntries:catalog.entries.length,protectedRuntime:false,scope:'Exact bilingual metadata; unreviewed source/route and entered filename boundaries; ND caption distinct from residence.'}));
