import assert from 'node:assert/strict';import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {standardProgramSpanish,approvedProgramSpanish,publicCopySource,programGeographyIssue,SPANISH_FIELDS}=await import('../src/lib/partners/onboarding/program-defaults.ts');
const {validateSpanishDraft}=await import('../src/lib/partners/onboarding/program-spanish-provider.ts');
const data={organization_contacts:{public_organization_name:'Fictional Recovery',public_program_name:'Fictional Recovery'},program_goals:{service_mode:'screening_only',target_population:'Residents seeking screening.'},geography_audience_language_accessibility:{jurisdictions:['CA'],service_area_description:'California',enable_spanish:true},brand_public_page:{program_headline:'Fictional Recovery screening',program_subheadline:'Screening does not guarantee eligibility.',approved_organization_description:'Fictional Recovery serves California.',primary_cta_label:'Begin screening',participant_support_copy:'Contact help@example.test. No representation is provided.'}};
const copy={headline:'Evaluación de Fictional Recovery',subheadline:'La evaluación no garantiza la elegibilidad.',organizationDescription:'Fictional Recovery atiende a California.',primaryActionLabel:'Comenzar evaluación',participantSupportCopy:'Contacte con help@example.test. No se proporciona representación.',serviceArea:'California',targetAudience:'Residentes que buscan una evaluación.'};
validateSpanishDraft(publicCopySource(data),copy,Object.keys(SPANISH_FIELDS));
for(const [key,value]of Object.entries(copy))data.brand_public_page[SPANISH_FIELDS[key]]=value;
assert.equal(standardProgramSpanish(data).headline,undefined,'unbound strings do not establish source currency');
data.brand_public_page.spanish_preparation={source:structuredClone(publicCopySource(data)),copy:structuredClone(copy)};
assert.deepEqual(standardProgramSpanish(data),copy);
const edited=structuredClone(data);edited.brand_public_page.program_headline+=' today';assert.equal(standardProgramSpanish(edited).headline,undefined);assert.equal(standardProgramSpanish(edited).subheadline,copy.subheadline);
for(const enabled of [false,true]){data.geography_audience_language_accessibility.enable_spanish=enabled;assert.deepEqual(standardProgramSpanish(data),copy);}
const standard=structuredClone(data);standard.brand_public_page.program_headline='Explore your record-clearing options';assert.equal(standardProgramSpanish(standard).headline,approvedProgramSpanish(standard).headline);
for(const [english,spanish]of [['Free screening for 2 days','Evaluación gratuita durante 3 días'],['Contact help@example.test. No representation is provided.','Contacte con other@example.test. No se proporciona representación.'],['Screening does not guarantee eligibility.','La evaluación garantiza la elegibilidad.'],['Fictional Recovery screening','Otra organización ofrece evaluación'],['Begin screening','Garantizamos la eliminación de antecedentes.'],['Begin screening','Evaluación en Texas']]){
 const source=publicCopySource(data);source.english.headline=english;assert.throws(()=>validateSpanishDraft(source,{headline:spanish},['headline']));
}
assert.equal(programGeographyIssue(data),null);data.geography_audience_language_accessibility.service_area_description='Multi-State';assert.match(programGeographyIssue(data),/California/);data.geography_audience_language_accessibility.jurisdictions=['CA','NY'];assert.equal(programGeographyIssue(data),null);data.geography_audience_language_accessibility.service_area_description='Nationwide';assert.ok(programGeographyIssue(data));
console.log('PASS approved standards, source-matched reuse, per-field invalidation, Spanish toggle, identity/number/support/limitation/jurisdiction validation and geography discrepancy');

const OpenAI=(await import('openai')).default;
const {draftProgramSpanish,spanishFailureDiagnostic,spanishDraftSchema}=await import('../src/lib/partners/onboarding/program-spanish-provider.ts');
const {zodTextFormat}=await import('openai/helpers/zod');
const requestKeys=Object.keys(SPANISH_FIELDS).filter(key=>key!=='serviceArea');
const contract=zodTextFormat(spanishDraftSchema(requestKeys),'rcap_public_spanish').schema;
assert.equal(contract.properties.serviceArea.type,'null','Approved California copy must be excluded by the schema, not just the prompt');
for(const key of requestKeys)assert.equal(contract.properties[key].type,'string');
assert.equal(contract.required.length,7);assert.equal(contract.additionalProperties,false);
assert.equal(spanishDraftSchema(requestKeys).safeParse({...copy,serviceArea:'CA'}).success,false,'The exact incident response shape is rejected by the requested provider contract');
assert.equal(spanishDraftSchema(requestKeys).safeParse({...copy,serviceArea:null}).success,true);
for(const[status,code]of [[401,'provider_authentication'],[403,'provider_authentication'],[429,'provider_rate_limit'],[404,'provider_model_unavailable'],[500,'provider_request']]){
 const error=OpenAI.APIError.generate(status,{message:'PRIVATE_SOURCE_SENTINEL',code:'test'},'PRIVATE_SOURCE_SENTINEL',new Headers({'x-request-id':'req_safe_receipt','authorization':'SECRET_SENTINEL'}));
 const diagnostic=spanishFailureDiagnostic(error,'request');assert.equal(diagnostic.code,code);assert.equal(diagnostic.providerStatus,status);assert.equal(diagnostic.providerRequestId,'req_safe_receipt');assert.doesNotMatch(JSON.stringify(diagnostic),/SENTINEL/);
}
assert.equal(spanishFailureDiagnostic(new OpenAI.APIConnectionTimeoutError(),'request').code,'provider_timeout');
assert.equal(spanishFailureDiagnostic(new OpenAI.APIConnectionError({message:'PRIVATE_SOURCE_SENTINEL'}),'request').code,'provider_connection');
assert.equal(spanishFailureDiagnostic(new Error('SECRET_SENTINEL'),'validation').code,'unexpected_failure');
const originalFetch=globalThis.fetch,originalError=console.error,originalKey=process.env.OPENAI_API_KEY,logs=[];
console.error=line=>logs.push(line);process.env.OPENAI_API_KEY='SECRET_SENTINEL';
try{
 const input=publicCopySource(data);input.english.headline='Begin screening';
 const response=(text,status='completed')=>new Response(JSON.stringify({id:'resp_test',object:'response',status,output:[{type:'message',role:'assistant',content:[{type:'output_text',text,annotations:[]}]}]}),{headers:{'content-type':'application/json','x-request-id':'req_safe_receipt'}});
 for(const[text,stage,code]of [['PRIVATE_SOURCE_SENTINEL','json','invalid_json'],[JSON.stringify({headline:42,private:'PRIVATE_SOURCE_SENTINEL'}),'schema','invalid_schema'],[JSON.stringify(Object.fromEntries(Object.keys(SPANISH_FIELDS).map(k=>[k,k==='headline'?'Garantizamos la eliminación de antecedentes.':null]))),'validation','unsupported_claim']]){
  globalThis.fetch=async()=>response(text);
  await assert.rejects(draftProgramSpanish(input,['headline'],'safe_attempt'),error=>error.diagnostic?.stage===stage&&error.diagnostic.code===code&&error.diagnostic.providerRequestId==='req_safe_receipt');
 }
 globalThis.fetch=async()=>response('', 'incomplete');await assert.rejects(draftProgramSpanish(input,['headline']),error=>error.diagnostic?.code==='provider_incomplete');
 assert.equal(logs.length,4);for(const line of logs){assert.doesNotMatch(line,/SENTINEL|Garantizamos|antecedentes|authorization|output_text/);assert.equal(JSON.parse(line).event,'rcap_spanish_preparation_failed');}
}finally{globalThis.fetch=originalFetch;console.error=originalError;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;}
console.log('PASS typed provider, response, JSON, schema, field-validation and unexpected failure diagnostics; no source, translation, headers or credentials in logs');
