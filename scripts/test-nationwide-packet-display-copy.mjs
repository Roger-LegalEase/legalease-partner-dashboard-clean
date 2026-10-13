import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {packetDisplayCopy,packetMatterTitleCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
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
