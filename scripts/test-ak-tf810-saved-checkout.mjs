// AK-TF810-SALES-POLICY-S2: real save, verification, reload and checkout handlers.
// Only transport/authority/render prerequisites are process-local fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire, register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const C = await import('../src/lib/expungement-ai/ak-courtview-contact.ts');
const F = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const A = await import('../src/lib/rcap/fulfillment/grade-a-authority.ts');
const {evaluateAuthoritativeScreeningResult: evaluate} = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {StripeConfigurationError} = await import('../src/lib/stripe/server.ts');
const {getCurrentFulfillmentRecord} = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const root = process.cwd(), route = C.AK_COURTVIEW_PATHWAY, id = C.AK_TF810_PUBLIC_ID;
const routeId = `AK:${route}`, owner = 'TEST-ak-saved-owner';
const item = {id:'TEST-ak-saved-matter', state:'AK', jurisdiction:'AK', paymentStatus:'unpaid', artifactRefs:{}};
const witness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey===routeId);
let stored, mode = 'valid', trace = [], bindings = [], writes = 0, providerAttempts = 0;
const urlFor = file => pathToFileURL(path.join(root,file)).href;
const dataUrl = source => 'data:text/javascript,'+encodeURIComponent(source);
const readerModule = (file,names) => dataUrl(`export * from ${JSON.stringify(urlFor(file))};\n`+names.map(name=>`export const ${name}=(...args)=>globalThis.__akSavedTransport.${name}(...args);`).join('\n'));
const install = async (file, replacements, mutate = source=>source) => {
  let source = fs.readFileSync(file,'utf8');
  for (const [name,url] of replacements) {
    const target = `from "${name}";`; assert(source.includes(target),target);
    source = source.replaceAll(target,`from ${JSON.stringify(url)};`);
  }
  const url = urlFor(file)+'?TEST-ak-saved-checkout';
  const compiled = ts.transpileModule(mutate(source),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  register(dataUrl('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url,source:compiled}});
  return {url,module:await import(url)};
};
const transport = {
  getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner,userEmail:'test@example.test'}),
  requireConsumerBriefcaseSession:async()=>({userId:owner}),
  getBriefcaseItem:async(user,key)=>user===owner&&key===item.id?item:null,
  isPartnerSponsoredPacketItem:async()=>false,
  readProtectedPacketVerification:async input=>{
    assert.equal(input.consumerAuthUserId,owner);assert.equal(input.briefcaseItemId,item.id);
    trace.push({step:'protected_read',revision:stored.revision,status:stored.status});
    return {ok:true,value:structuredClone(stored)};
  },
  persistProtectedPacketVerification:async({consumerAuthUserId,briefcaseItemId,transition})=>{
    assert.equal(consumerAuthUserId,owner);assert.equal(briefcaseItemId,item.id);
    assert.equal(transition.expectedPriorRevision,stored.revision);
    assert.equal(transition.expectedPriorHash,stored.status==='verified'?stored.hash:null);
    stored=structuredClone(transition.nextVerification);writes++;
    trace.push({step:'protected_save',revision:stored.revision,status:stored.status});
    return {ok:true,value:structuredClone(stored)};
  },
  decorateBriefcaseItemForPresentation:async()=>({commercialActions:{fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false}}),
  protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('unexpected substitute seed');},
  readTrustedBriefcasePresentationSource:()=>{throw Error('unexpected substitute source');},
  assertPacketFulfillmentProven:(state,pathway,surface,binding)=>{
    assert.equal(state,'AK');assert.equal(pathway,route);assert.equal(binding.trackId,stored.snapshot.selectedTrackId);
    assert(['participant delivery','checkout creation','consumer payment authority'].includes(surface));
    trace.push({step:'fulfillment',mode,surface});
    try {
      if(mode==='missing') return F.assertPacketFulfillmentProven(state,pathway,surface,binding);
      if(mode==='invalid') {
        const decision=A.evaluateFulfillmentAuthority({schemaVersion:'TEST_INVALID_SCHEMA',routeId},null,routeId);
        throw new F.PacketFulfillmentNotProvenError(routeId,[`canonical authority: ${decision.state}`],surface,`${routeId}: ${decision.state}. ${decision.reason}`);
      }
    } catch(error) {
      trace.push({step:'authority_refusal',reason:error.detail,missing:error.missing});
      throw error;
    }
  },
  isOperationallySellable:key=>{assert.equal(key,routeId);return mode==='valid';},
  governCommercialAdmission:(point,identity,context)=>{
    assert.equal(point,'consumer_checkout');assert.equal(identity.routeId,routeId);
    assert.equal(context.participantUserId,owner);assert.equal(context.matterOwnerUserId,owner);
    trace.push({step:'admission',point});
  },
  readyToPurchase:input=>{
    assert.deepEqual(input.snapshot,stored.snapshot);assert.equal(input.verificationHash,stored.hash);
    trace.push({step:'render_readiness',hash:input.verificationHash,publicCopies:['screeningAnswers','prefilledAnswers','packetAnswers'].map(map=>input.snapshot[map][id]??null)});
    return {ready:true,renderInputHash:createHash('sha256').update(JSON.stringify(input.facts)).digest('hex')};
  },
  resolveConsumerPersonId:async user=>{assert.equal(user,owner);return {ok:true,personId:'TEST-existing-owner-person'};},
  getStripeServerClient:()=>{providerAttempts++;throw new StripeConfigurationError('TEST: no Stripe client','TEST_ONLY');},
  isProductionRuntime:()=>false,
  persistConsumerCheckoutBinding:async binding=>{
    assert.equal(binding.userId,owner);assert.equal(binding.briefcaseItemId,item.id);
    assert.equal(binding.expectedVerificationHash,stored.hash);assert.equal(binding.paymentProvider,'dry_run');
    assert(binding.checkoutSessionId.startsWith('dryrun_'));bindings.push(structuredClone(binding));
    return {outcome:'bound'};
  },
  readStoredConsumerCheckoutSession:()=>{throw Error('unexpected provider/session read');},
  replaceConsumerCheckoutSession:()=>{throw Error('unexpected session replacement');}
};
globalThis.__akSavedTransport = transport;
const cas = readerModule('src/lib/expungement-ai/verification-cas.ts',['readProtectedPacketVerification','persistProtectedPacketVerification']);
const {url:pUrl,module:P} = await install('src/lib/expungement-ai/packet-information.ts', [['@/lib/expungement-ai/verification-cas',cas]]);
const verificationReader = dataUrl(`export * from ${JSON.stringify(pUrl)}; import {requireCurrentPacketVerification as read} from ${JSON.stringify(pUrl)}; export async function requireCurrentPacketVerification(...args){const value=await read(...args);globalThis.__akSavedVerifiedRead(value);return value;}`);
globalThis.__akSavedVerifiedRead = value=>{
  assert.equal(value.hash,stored.hash);assert.deepEqual(value.snapshot,stored.snapshot);
  trace.push({step:'verified_snapshot',hash:value.hash,revision:value.revision,publicCopies:['screeningAnswers','prefilledAnswers','packetAnswers'].map(map=>value.snapshot[map][id]??null)});
};
const briefcase = readerModule('src/lib/expungement-ai/briefcase.ts',['getBriefcaseItem','isPartnerSponsoredPacketItem']);
const {module:saveApi} = await install('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts',[
  ['@/lib/rcap/briefcase/auth',readerModule('src/lib/rcap/briefcase/auth.ts',['getRcapBriefcaseAuthState'])],
  ['@/lib/expungement-ai/briefcase',briefcase],['@/lib/expungement-ai/verification-cas',cas],['@/lib/expungement-ai/packet-information',pUrl],
  ['@/lib/expungement-ai/briefcase-presentation-authority',readerModule('src/lib/expungement-ai/briefcase-presentation-authority.ts',['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'])]
]);
const {url:paymentUrl} = await install('src/lib/expungement-ai/payment-adapter.ts',[
  ['@/lib/expungement-ai/packet-information',verificationReader],['@/lib/expungement-ai/briefcase',briefcase],
  ['@/lib/expungement-ai/packet-fulfillment-authority',readerModule('src/lib/expungement-ai/packet-fulfillment-authority.ts',['assertPacketFulfillmentProven'])],
  ['@/lib/rcap/render/commercial-admission',readerModule('src/lib/rcap/render/commercial-admission.ts',['governCommercialAdmission','isOperationallySellable'])],
  ['@/lib/expungement-ai/render-preflight',readerModule('src/lib/expungement-ai/render-preflight.ts',['readyToPurchase'])],
  ['@/lib/expungement-ai/consumer-identity',readerModule('src/lib/expungement-ai/consumer-identity.ts',['resolveConsumerPersonId'])],
  ['@/lib/stripe/server',readerModule('src/lib/stripe/server.ts',['getStripeServerClient','isProductionRuntime'])],
  ['@/lib/expungement-ai/consumer-payment-authority',readerModule('src/lib/expungement-ai/consumer-payment-authority.ts',['persistConsumerCheckoutBinding','readStoredConsumerCheckoutSession','replaceConsumerCheckoutSession'])]
],source=>{
  if(!process.argv.includes('--mutation=checkout'))return source;
  const target='if (salesPolicy?.allowed === false)';
  assert.equal(source.split(target).length,2,'mutate exactly the final sales policy gate');
  return source.replace(target,'if (false)');
});
const {module:checkoutApi} = await install('src/app/api/expungement-ai/checkout/route.ts',[
  ['@/lib/expungement-ai/auth',readerModule('src/lib/expungement-ai/auth.ts',['requireConsumerBriefcaseSession'])],
  ['@/lib/expungement-ai/briefcase',briefcase],['@/lib/expungement-ai/payment-adapter',paymentUrl],['@/lib/expungement-ai/packet-information',pUrl]
]);
const seed = P.protectedPacketDraftSeedFromAuthoritative({authoritative:evaluate({jurisdiction:'AK',profileVersion:witness.profileVersion,matterId:item.id,answers:witness.answers}),screeningAnswers:witness.answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});
assert.equal(routeId,'AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40');
assert.equal(id,'ak_tf810_case_still_public');
assert(seed);assert.equal(seed.snapshot.pathwayId,route);assert.equal(getCurrentFulfillmentRecord(routeId),null);
const original={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
const common={participant_full_legal_name:'TEST Requester',contact_information:'TEST requester contact',residency_or_location:'TEST Anchorage',charge:'TEST dismissed misdemeanor',court:'TEST Anchorage District Court',criminal_history:'No'};
const contact={ak_tf810_case_number:'TEST-3AN-00001',ak_tf810_contact_address:'TEST 10 Example Lane',ak_tf810_contact_phone:'+1 907 555 0100'};
const saveUrl=`http://local.test/api/expungement-ai/briefcase/${item.id}/packet-information`, context={params:Promise.resolve({itemId:item.id})};
const save = async(answers,verify=false)=>{
  const response=await saveApi.POST(new Request(saveUrl,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,verify})}),context);
  return {status:response.status,body:await response.json()};
};
const reload = async()=>{
  const response=await saveApi.GET(new Request(saveUrl),context);
  const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));
  const question=body.questions.find(q=>q.id===id);assert(question,'reload publishes the TF-810 question');
  return {question,value:body.answers[id]};
};
const conflictText='Your saved answers to this question do not match each other, so no payment is taken. Your answers have not been changed.';
const conflictTextEs='Sus respuestas guardadas para esta pregunta no coinciden entre sí, así que no se cobra. Sus respuestas no se han cambiado.';
// Spanish interaction through the real QuestionField/OptionGroup in Chromium (house pattern: test-ga21-optional-context-ui.mjs).
let browser,page;
const spanishUi = async(question,saved)=>{
  if(!page){
    const require=createRequire(import.meta.url),{webpack}=require('next/dist/compiled/webpack/webpack'),{chromium}=require('playwright');
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ak-tf810-spanish-ui-'));
    try {
      fs.writeFileSync(path.join(temp,'loader.cjs'),`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}`);
      fs.writeFileSync(path.join(temp,'entry.tsx'),`import React,{useState} from 'react';import{createRoot}from 'react-dom/client';import{QuestionField}from ${JSON.stringify(root+'/src/components/expungement-ai/screening/QuestionField.tsx')};import{LocalizationProvider,useLocalization}from ${JSON.stringify(root+'/src/components/expungement-ai/LocalizationProvider.tsx')};function Case(){const{locale,setLocale}=useLocalization();const[c,setCase]=useState(null);const[value,setValue]=useState(undefined);window.__mount=(question,saved)=>{setCase({question,seq:Math.random()});setValue(saved)};window.__raw=()=>value;return <><button onClick={()=>setLocale('es')}>Spanish test locale</button>{c?<section data-test-question><QuestionField key={c.seq} question={c.question} stateCode="AK" value={value} onChange={setValue}/></section>:null}<output data-locale>{locale}</output></>};createRoot(document.getElementById('root')).render(<LocalizationProvider><Case/></LocalizationProvider>);`);
      await new Promise((resolve,reject)=>{const compiler=webpack({mode:'none',devtool:false,entry:path.join(temp,'entry.tsx'),target:'web',output:{path:temp,filename:'browser.js'},resolve:{extensions:['.tsx','.ts','.js','.json'],alias:{'@':root+'/src'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(temp,'loader.cjs')}]},plugins:[new webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development'),'process.env':JSON.stringify({NODE_ENV:'development'})})],optimization:{minimize:false}});compiler.run((e,stats)=>compiler.close(close=>e||close||stats.hasErrors()?reject(e||close||Error(stats.toString({all:false,errors:true}))):resolve()));});
      browser=await chromium.launch({headless:true});
      const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
      await ctx.route('**/*',r=>r.request().url()==='https://ak-tf810-component.invalid/'?r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}):r.abort());
      page=await ctx.newPage();await page.goto('https://ak-tf810-component.invalid/');
      await page.addScriptTag({content:fs.readFileSync(path.join(temp,'browser.js'),'utf8')});
      await page.waitForFunction(()=>typeof window.__mount==='function');
      await page.getByRole('button',{name:'Spanish test locale',exact:true}).click();
      await page.locator('output[data-locale]').filter({hasText:'es'}).waitFor();
    } finally {fs.rmSync(temp,{recursive:true,force:true});}
  }
  await page.evaluate(([q,v])=>window.__mount(q,v),[question,saved]);
  await page.locator('[data-test-question]').waitFor();
  return page;
};
const rows=[];
const selected = process.argv.find(a=>a.startsWith('--case='))?.slice(7);
if(selected)assert(['yes','no','unsure','spanish-unsure','spanish-legacy','missing','conflicting','spanish-label-post'].includes(selected),'unknown case selector');
// The control submits the canonical option, never its Spanish label; no adopted contract
// accepts localized values, so a raw label submission stays an explicit refusal.
if(!selected||selected==='spanish-label-post'){
  stored=structuredClone(original);writes=0;
  const literal=await save({[id]:'No estoy seguro'});
  console.log(JSON.stringify({step:'answer_save',name:'spanish-label-post',status:literal.status,error:literal.body.error??null,invalidFactIds:literal.body.invalidFactIds??[]}));
  assert.equal(literal.status,422);assert.equal(literal.body.error,'invalid_packet_answers');assert.deepEqual(literal.body.invalidFactIds,[id]);
  assert.deepEqual(stored,original,'a refused label submission saves nothing');assert.equal(writes,0);
}
const priorDryRun=process.env.EXPUNGEMENT_AI_CHECKOUT_DRY_RUN;
process.env.EXPUNGEMENT_AI_CHECKOUT_DRY_RUN='true';
try {
  for (let [name,raw,conflict] of [['yes','Yes'],['no','No'],['unsure','I am not sure'],['spanish-unsure',null],['spanish-legacy','No estoy seguro'],['missing',undefined],['conflicting','Yes',true]]) {
    if(selected&&selected!==name)continue;
    stored=structuredClone(original);trace=[];bindings=[];providerAttempts=0;writes=0;
    if(name==='spanish-unsure'){
      const ui=await spanishUi((await reload()).question,undefined);
      await ui.getByRole('radio',{name:'No estoy seguro',exact:true}).click();
      await ui.waitForFunction(()=>window.__raw()!==undefined);
      raw=await ui.evaluate(()=>window.__raw());
      console.log(JSON.stringify({step:'spanish_control',name,displayed:'No estoy seguro',submitted:raw}));
      assert.equal(raw,'I am not sure','the Spanish control submits its canonical option');
    }
    if(conflict){stored.draftSnapshot.prefilledAnswers[id]='No';stored.draftSnapshot.packetAnswers[id]='Yes';stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);}
    if(name==='spanish-legacy'){stored.draftSnapshot.packetAnswers[id]=raw;stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);}
    const answerSave=await save(raw===undefined||name==='spanish-legacy'?{}:{[id]:raw});
    console.log(JSON.stringify({step:'answer_save',name,status:answerSave.status,error:answerSave.body.error??null,invalidFactIds:answerSave.body.invalidFactIds??[]}));
    assert.equal(answerSave.status,200,`${name}: answer save`);
    if(raw!==undefined)assert.equal(stored.draftSnapshot.packetAnswers[id],raw);
    const savedPublicCopies=['screeningAnswers','prefilledAnswers','packetAnswers'].map(map=>stored.draftSnapshot[map][id]);
    if(conflict)assert.deepEqual(savedPublicCopies,[undefined,'No','Yes']);
    if(name==='missing')assert.deepEqual(savedPublicCopies,[undefined,undefined,undefined]);
    const detailSave=await save({...common,...(raw==='Yes'?contact:{})});assert.equal(detailSave.status,200,JSON.stringify(detailSave));
    const verify=await save({},true);
    console.log(JSON.stringify({step:'verification',name,status:verify.status,ready:verify.body.readyToGenerate,missing:verify.body.missingInputIds,reason:verify.body.reviewReason}));
    assert.equal(verify.status,200);assert.equal(stored.status,'verified',JSON.stringify(verify));
    assert.deepEqual(stored.snapshot.packetAnswers,stored.draftSnapshot.packetAnswers);
    assert.deepEqual(['screeningAnswers','prefilledAnswers','packetAnswers'].map(map=>stored.snapshot[map][id]),savedPublicCopies,'save and verification preserve each raw answer copy');
    assert.equal(P.requireCurrentPacketVerificationRecord(item,stored).hash,stored.hash);
    if(name==='spanish-unsure'){
      const again=await reload();assert.equal(again.value,'I am not sure','reload keeps the saved uncertainty');
      const ui=await spanishUi(again.question,again.value);
      assert.equal(await ui.locator('input[type=radio]:checked').count(),1);
      assert.equal(await ui.locator('input[type=radio]:checked').getAttribute('value'),'I am not sure');
      assert((await ui.locator('label:has(input[type=radio]:checked)').innerText()).includes('No estoy seguro'),'reloaded answer displays its Spanish label');
      assert((await ui.locator('[data-test-question]').innerText()).includes('No se cobra hasta que lo confirme'),'Spanish payment guidance shown for the unsure answer');
      console.log(JSON.stringify({step:'spanish_reload_display',name,reloaded:again.value,displayed:'No estoy seguro'}));
    }
    if(name==='conflicting'){
      const again=await reload();
      assert(again.question.helperText.includes(conflictText),'reload explains the disagreeing copies');
      assert(again.question.translations.es.helperText.includes(conflictTextEs));
      const ui=await spanishUi(again.question,again.value);
      assert((await ui.locator('[data-test-question]').innerText()).includes(conflictTextEs),'Spanish UI shows the disagreement');
      console.log(JSON.stringify({step:'conflict_reload_display',name,explained:true}));
    }
    if(name==='spanish-legacy'){
      const again=await reload();assert.equal(again.value,'No estoy seguro','reload keeps the older raw answer');
      assert.equal(again.question.savedAnswerNeedsClarification,true);
      const ui=await spanishUi(again.question,again.value);
      assert.equal(await ui.locator('input[type=radio]:checked').count(),0,'an unreadable older answer is never shown as a guessed choice');
      const notice=await ui.locator('[data-saved-answer-clarification]').innerText();
      assert(notice.includes('Una respuesta anterior no se puede mostrar aquí')&&notice.includes('indicar que no lo sabe'),'actionable clarification in Spanish');
      console.log(JSON.stringify({step:'legacy_reload_display',name,reloaded:again.value,clarification:true}));
    }
    const verifiedBefore=structuredClone(stored);
    for(mode of ['valid','missing','invalid']) {
      trace=[];bindings=[];providerAttempts=0;
      const response=await checkoutApi.POST(new Request('http://local.test/api/expungement-ai/checkout',{method:'POST',body:JSON.stringify({briefcaseItemId:item.id})}));
      const body=await response.json();
      const row={name,mode,protectedSaveWrites:writes,saveStatus:answerSave.status,verificationStatus:verify.status,storedStatus:stored.status,checkoutStatus:response.status,resultCode:body.resultCode??null,outcome:body.outcome??null,failureClass:body.failureClass??null,amountCents:body.amountCents??null,trace:structuredClone(trace),dryRunBindings:bindings.length,providerAttempts};rows.push(row);
      console.log(JSON.stringify(row));
      assert(trace.some(t=>t.step==='verified_snapshot'));
      assert.deepEqual(stored,verifiedBefore,'checkout must not change the saved answers or verification');
      if(mode!=='valid') {
        const expected = mode==='missing' ? `${routeId}: NO_RECORD. No Grade-A fulfillment record binds ${routeId}; a route nobody has written a record for fails closed.`
          : `${routeId}: UNSUPPORTED_ROUTE. The record for ${routeId} declares schema TEST_INVALID_SCHEMA, which this authority does not evaluate.`;
        assert.equal(trace.find(t=>t.step==='authority_refusal')?.reason,expected);
        assert.equal(response.status,503);assert.equal(body.resultCode,'checkout_failed');assert.equal(body.failureClass,'PacketFulfillmentNotProvenError');assert.equal(bindings.length,0);assert.equal(providerAttempts,0);
      } else if(name==='yes') {
        assert.equal(response.status,200);assert.equal(body.mode,'dry_run');assert.equal(body.amountCents,5000);assert.equal(body.outcome,'checkout_created');assert.equal(bindings.length,1);assert.equal(providerAttempts,1);
      } else {
        assert.equal(response.status,403,`${name}: actual checkout HTTP policy refusal`);
        assert.equal(body.resultCode,name==='no'?'ak_tf810_request_not_needed':'ak_tf810_public_status_unconfirmed');assert.equal(body.amountCents,undefined);assert.equal(bindings.length,0);assert.equal(providerAttempts,0);
        if(name==='conflicting')assert.equal(body.error,conflictText,'checkout refusal explains the disagreeing copies');
      }
    }
    if(name==='spanish-legacy'){
      // The clarification is actionable: an explicit choice through the real control replaces the older value.
      const ui=await spanishUi((await reload()).question,'No estoy seguro');
      await ui.getByRole('radio',{name:'No estoy seguro',exact:true}).click();
      await ui.waitForFunction(()=>window.__raw()==='I am not sure');
      const replaced=await save({[id]:await ui.evaluate(()=>window.__raw())});assert.equal(replaced.status,200);
      const after=await reload();assert.equal(after.value,'I am not sure');assert.notEqual(after.question.savedAnswerNeedsClarification,true);
      const shown=await spanishUi(after.question,after.value);
      assert((await shown.locator('label:has(input[type=radio]:checked)').innerText()).includes('No estoy seguro'));
      assert.equal(await shown.locator('[data-saved-answer-clarification]').count(),0);
      console.log(JSON.stringify({step:'legacy_explicit_replacement',name,saved:after.value}));
    }
  }
} finally {
  await browser?.close();
  if(priorDryRun===undefined)delete process.env.EXPUNGEMENT_AI_CHECKOUT_DRY_RUN;else process.env.EXPUNGEMENT_AI_CHECKOUT_DRY_RUN=priorDryRun;
}
assert.equal(rows.length,selected==='spanish-label-post'?0:selected?3:21,'all requested observed HTTP cases ran');
console.log(JSON.stringify({status:'PASS',cases:rows.length,rows,liveCalls:0,registryWrites:0,stripeSessions:0,entitlements:0,verification:'real save verify transition, hash check and protected reload; transport only in memory'}));
