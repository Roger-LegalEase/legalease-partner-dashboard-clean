import assert from 'node:assert/strict';
import {matchesOriginalResponse,requireOriginalResponse} from './rcap-clinic-original-response.mjs';
import {runMississippiScreening,saveScreeningResultButton} from './rcap-ms-screening-browser.mjs';

// Arm before the effect; bound the wait when its phase is reached, not during a preceding phase.
export function captureOriginalResponseOnce(page,operation,config,{timeout=45000}={}) {
 assert.ok(Number.isFinite(timeout)&&timeout>0,'Original response wait must be bounded');
 let resolve;
 const settled=new Promise(done=>{resolve=done;});
 const dispose=()=>{page.off('response',onResponse);page.off('close',onClose);};
 const onResponse=response=>{if(matchesOriginalResponse(response,operation,config)){dispose();resolve(response);}};
 const onClose=()=>{dispose();resolve(null);};
 page.on('response',onResponse);page.once('close',onClose);
 return Object.freeze({
  async read() {
   let timer;
   try {
    const response=await Promise.race([settled,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`${operation}: original response missing or timed out`)),timeout);})]);
    assert.ok(response,`${operation}: page closed before original response`);
    return requireOriginalResponse(response,operation);
   }finally{clearTimeout(timer);dispose();}
  },
  dispose
 });
}

export function captureScreeningProfileOnce(page,config,options) {
 const captured=captureOriginalResponseOnce(page,'profile',config,options);
 return Object.freeze({
  async read() {
   const {profile}=await captured.read();
   assert.equal(profile?.jurisdiction?.code,'MS','Original screening profile jurisdiction mismatch');
   assert.ok(typeof profile.profileVersion==='string'&&profile.profileVersion.length>0,'Original screening profile version missing');
   const questions=profile.questions?.filter(question=>question?.id==='ms_program_order');
   assert.equal(questions?.length,1,'Original profile must contain the program-order metadata once');
   assert.equal(questions[0].type,'single_choice');
   assert.equal(questions[0].required,false);
   assert.equal(questions[0].contextOnly,false);
   return profile;
  },
  dispose:captured.dispose
 });
}

export async function openScreeningWithProfile(page,config,open,options) {
 const captured=captureScreeningProfileOnce(page,config,options);
 try{await open();return captured;}catch(error){captured.dispose();throw error;}
}

export async function runScreeningFromOriginalProfile(page,captured,diagnostics={}) {
 assert.ok(captured,'Original screening profile capture was not armed');
 const profile=await captured.read();
 return runMississippiScreening(page,{...diagnostics,profile});
}

export async function saveScreeningAndClaim(page,config,{pendingTimeout=20000,claimTimeout=20000}={}) {
 const pending=captureOriginalResponseOnce(page,'pending',config,{timeout:pendingTimeout});
 const claim=captureOriginalResponseOnce(page,'claim',config,{timeout:claimTimeout});
 try {
  await saveScreeningResultButton(page).click();
  const pendingResult=await pending.read();
  const claimed=await claim.read();
  return {pending:pendingResult,claimed};
 }finally{pending.dispose();claim.dispose();}
}
