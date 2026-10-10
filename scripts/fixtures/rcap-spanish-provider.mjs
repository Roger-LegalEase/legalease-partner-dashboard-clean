// Explicit dependency injection for the existing loopback browser harness ONLY.
// This is not evidence of genuine provider execution. No application test route.
import fs from 'node:fs';
if(process.env.VERCEL_ENV!=='development'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321'||process.env.OPENAI_API_KEY!=='rcap-isolated-provider-fixture')throw new Error('Deterministic provider requires the isolated local application');
const original=globalThis.fetch;
const translations={
 'Explore your next step with Fictional Recovery':'Explore su próximo paso con Fictional Recovery',
 'Explore your next step with Fictional Recovery today':'Explore su próximo paso con Fictional Recovery hoy',
 'Answer questions about your California record. Screening does not guarantee eligibility.':'Responda preguntas sobre sus antecedentes de California. La evaluación no garantiza la elegibilidad.',
 'Fictional Recovery helps California residents access record-clearing screening.':'Fictional Recovery ayuda a los residentes de California a acceder a una evaluación para la eliminación de antecedentes.',
 'Begin your California screening':'Comience su evaluación de California',
 'Contact support@example.test for help. No legal representation or packet funding is included.':'Contacte con support@example.test para obtener ayuda. No se incluye representación legal ni financiación de paquetes.',
 'California residents exploring their record-clearing options.':'Residentes de California que exploran sus opciones para la eliminación de antecedentes.',
 'For California residents only.':'Solo para residentes de California.'
};
globalThis.fetch=async(input,init)=>{
 const url=String(input instanceof Request?input.url:input);
 if(!url.startsWith('https://api.openai.com/'))return original(input,init);
 if(url!=='https://api.openai.com/v1/responses')throw new Error('Unexpected provider path');
 const body=JSON.parse(init.body),payload=JSON.parse(body.input);
 const mode=fs.readFileSync('artifacts/rcap-spanish-launch-recovery/provider-mode','utf8').trim();
 fs.appendFileSync('artifacts/rcap-spanish-launch-recovery/provider-calls.jsonl',JSON.stringify({mode,keys:Object.keys(payload.publicText),store:body.store,model:body.model})+'\n');
 if(mode==='unavailable')return new Response(JSON.stringify({error:{message:'Synthetic provider unavailable',type:'server_error'}}),{status:503,headers:{'content-type':'application/json'}});
 if(mode==='timeout'){const e=new Error('Synthetic provider timeout');e.name='TimeoutError';throw e;}
 const output={headline:null,subheadline:null,organizationDescription:null,primaryActionLabel:null,participantSupportCopy:null,serviceArea:null,targetAudience:null};
 const verified=mode==='verified-output'?JSON.parse(fs.readFileSync('artifacts/rcap-spanish-launch-recovery/real-provider.json','utf8')):null;
 for(const [key,text] of Object.entries(payload.publicText)){
  if(verified){if(verified.source.english[key]!==text)throw new Error('Verified provider source differs');output[key]=verified.copy[key];}
  else {if(!translations[text])throw new Error('Fixture has no translation for this source');output[key]=translations[text];}
 }
 const text=mode==='malformed'?'not-json':JSON.stringify(output);
 return new Response(JSON.stringify({id:'resp_isolated_fixture',object:'response',status:'completed',model:body.model,output:[{id:'msg_fixture',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]}],usage:{input_tokens:0,output_tokens:0,total_tokens:0}}),{status:200,headers:{'content-type':'application/json'}});
};
