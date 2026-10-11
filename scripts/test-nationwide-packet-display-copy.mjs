import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {packetDisplayCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
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
for(const name of ['Yes.pdf','My matters.pdf','Calle Peña {count}.pdf','not_sure.pdf']){
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
