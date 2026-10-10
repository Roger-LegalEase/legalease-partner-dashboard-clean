// Opt-in Vercel build verification. Uses the real server module and existing
// server-side environment; no HTTP test interface, database client, or secret export.
if(process.env.RCAP_VERIFY_SPANISH_PROVIDER==='true') {
 const requests=[];const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{const result=await originalFetch(input,init);const url=String(input instanceof Request?input.url:input);if(url==='https://api.openai.com/v1/responses')requests.push({status:result.status,requestId:result.headers.get('x-request-id')});return result;};
 const {register}=await import('node:module');register('./lib/ts-esm-loader.mjs',import.meta.url);
 const {draftProgramSpanish}=await import('../src/lib/partners/onboarding/program-spanish-provider.ts');
 const source={
  english:{
   headline:'Explore your next step with Fictional Recovery',
   subheadline:'Answer questions about your California record. Screening does not guarantee eligibility.',
   organizationDescription:'Fictional Recovery helps California residents access record-clearing screening.',
   primaryActionLabel:'Begin your California screening',
   participantSupportCopy:'Contact support@example.test for help. No legal representation or packet funding is included.',
   serviceArea:'For California residents only.',
   targetAudience:'California residents exploring their record-clearing options.'
  },identity:{organization:'Fictional Recovery',program:'Fictional Recovery'},jurisdictions:['CA'],services:'screening_only'
 };
 const copy=await draftProgramSpanish(source,Object.keys(source.english));
 if(requests.length!==1 || requests[0].status!==200 || !requests[0].requestId)throw new Error('A genuine OpenAI response receipt is required');
 if(Object.keys(copy).length!==7)throw new Error('Seven actual provider fields are required');
 console.log('RCAP_SPANISH_PROVIDER_VERIFIED '+JSON.stringify({environment:process.env.VERCEL_ENV,sourceSha:process.env.VERCEL_GIT_COMMIT_SHA,requests,model:process.env.RCAP_TRANSLATION_OPENAI_MODEL||'gpt-4.1-mini',source,copy,fields:7,validated:true,store:false,databaseWrites:0,databaseContacted:false,databaseTargetIsProduction:new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://unconfigured.invalid").hostname==="wwtwtsmywnckfkdaqqeg.supabase.co",probe:'real server module executed inside Vercel build environment'}));
}
