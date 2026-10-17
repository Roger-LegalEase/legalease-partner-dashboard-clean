import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {changedPacketAnswers,reconcileSavedAnswers,isPacketSaveReceipt,packetSaveErrorCopy}=await import('../src/lib/expungement-ai/packet-save-contract.ts');
const {sameKnownQuestionAnswer}=await import('../src/lib/expungement-ai/question-answer-state.ts');
const question={id:'name',stage:'packet',type:'text_or_unknown',prompt:'Name',required:true,contextOnly:false,options:null};
const receipt={ok:true,revision:4,answers:{name:'Synthetic'},questions:[question],reviewQuestions:[question],sections:[],missingInputIds:[],pendingDerivations:[],resumeSectionId:null,reviewPath:'/briefcase/synthetic/review',readyToGenerate:false,reviewReason:'final_verification_required',nextAction:'review_packet'};
assert.equal(isPacketSaveReceipt(receipt),true);
for(const mutation of [null,{}, {...receipt,revision:-1},{...receipt,revision:'4'},{...receipt,questions:[{...question,options:{invalid:true}}]},{...receipt,reviewQuestions:[{...question,optionDisplay:{bad:'bad'}}]},{...receipt,sections:[{}]},{...receipt,questions:[question,question]},{...receipt,answers:{name:{value:{bad:true}}}},{...receipt,questions:[{...question,optionDisplay:{Yes:{label:'Yes',helperText:{bad:true}}}}]},{...receipt,questions:[{...question,translations:{es:{prompt:{bad:true}}}}]},{...receipt,questions:[{...question,optionDisplay:{Yes:{label:'Yes',translations:{es:{helperText:{bad:true}}}}}}]},{...receipt,sections:[{id:'names',heading:'Names',description:{bad:true},questionIds:['name'],translations:{es:{heading:'Nombres',description:''}}}]},{...receipt,pendingDerivations:[{factId:'x',inputFactIds:[7]}]},{...receipt,nextAction:'checkout'},{...receipt,reviewPath:'https://invalid.test'}]) assert.equal(isPacketSaveReceipt(mutation),false);
assert.deepEqual(reconcileSavedAnswers({name:'submitted',another:'old'},{name:'newer',another:'old'},{name:'submitted',another:'server',derived:'computed'}),{name:'newer',another:'server',derived:'computed'});
assert.deepEqual(changedPacketAnswers({name:'same',value:{value:0,unknown:false}},{name:'same',value:{unknown:false,value:0}}),{});
assert.equal(sameKnownQuestionAnswer(question,'None',{value:'None',unknown:false}),true);
assert.equal(sameKnownQuestionAnswer(question,'None',{value:'None',unknown:true}),false);
assert.equal(sameKnownQuestionAnswer({...question,type:'number_or_range'},0,{value:'0',unknown:false}),true);
assert.equal(sameKnownQuestionAnswer({...question,type:'date_or_unknown'},'2000-02-29',{value:'2000-02-29',unknown:false}),true);
assert.equal(sameKnownQuestionAnswer({...question,type:'date_or_unknown'},'2000-02-30',{value:'2000-02-30',unknown:false}),false);
assert.equal(sameKnownQuestionAnswer({...question,type:'multi_select',options:['A','B']},['A','B'],['B','A']),true);
for(const status of [0,400,401,403,404,409,422,428,429,503]) {const message=packetSaveErrorCopy(status);assert.ok(message.en&&message.es&&message.en!==message.es);}
console.log('PASS: canonical receipt negative mutations; in-flight edit preservation; typed legacy/no-op equality; all save failure classes have EN/ES copy. Browser/API persistence requires separate evidence.');
const {packetScreensFor,packetNavigationDestination}=await import('../src/lib/expungement-ai/packet-navigation.ts');
const section=(id,questionIds)=>({id,heading:id,description:'',translations:{es:{heading:id,description:''}},questionIds});
const first={...question,id:'first'}, child={...question,id:'child'}, last={...question,id:'last'};
const before=packetScreensFor([first,last],[section('first-section',['first']),section('last-section',['last'])]);
const after=packetScreensFor([first,child,last],[section('first-section',['first','child']),section('last-section',['last'])]);
assert.equal(packetNavigationDestination(before,after,'first-section','next',{first:'known'}),'first-section','newly required child must be visited before continuing');
assert.equal(packetNavigationDestination(before,after,'first-section','next',{first:'known',child:'known'}),'last-section');
assert.equal(packetNavigationDestination(before,after.filter(s=>s.id!=='first-section'),'first-section','next',{}),'last-section','removed section uses surviving successor');
const {requestPacketVerification}=await import('../src/components/expungement-ai/packet-verification-client.ts');
const actions={fulfillmentAvailable:true,checkoutAllowed:true,generationAllowed:false};
const verified={...receipt,readyToGenerate:true,commercialActions:actions};
for(const [status,payload,allowed] of [[200,verified,true],[200,{readyToGenerate:true,commercialActions:actions},false],[200,{...verified,revision:2},false],[401,{ok:false,error:'auth_required'},false],[409,{ok:false,error:'revision_conflict'},false],[422,{ok:false,error:'invalid_packet_answers'},false],[503,{ok:false},false]]){
 const response=await requestPacketVerification({itemId:'synthetic',expectedRevision:3,answers:{},fetchImpl:async(_url,init)=>{assert.equal(JSON.parse(init.body).expectedRevision,3);return new Response(JSON.stringify(payload),{status});}});
 assert.equal(response.ok,allowed);assert.equal(response.readyToGenerate,allowed);assert.equal(response.commercialActions.checkoutAllowed,allowed);if(status!==200)assert.equal(response.status,status);
}
console.log('PASS: canonical conditional navigation and final-verification malformed/stale/error receipts fail closed.');
