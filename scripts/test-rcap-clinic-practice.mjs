import assert from 'node:assert/strict';import {register} from 'node:module';import {rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';register('./lib/ts-esm-loader.mjs',import.meta.url);
const {clinicEventTime}=await import('../src/lib/clinic-mode/event-time.ts');
assert.equal(clinicEventTime('2026-10-09T09:00','America/Chicago'),'2026-10-09T14:00:00.000Z');
assert.equal(clinicEventTime('2026-01-09T09:00','America/Chicago'),'2026-01-09T15:00:00.000Z');
assert.throws(()=>clinicEventTime('2026-03-08T02:30','America/Chicago'),/does not exist/);
assert.throws(()=>clinicEventTime('2026-10-09T09:00','not-a-timezone'),/valid timezone/);
const {recordPracticeProgram,canUseClinicPractice}=await import('../src/lib/partners/onboarding/practice-receipt.ts');
const slug='practice-boundary-'+process.pid;Object.assign(process.env,{VERCEL_ENV:'development',RCAP_SYNTHETIC_LAUNCH_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',RCAP_SYNTHETIC_PUBLIC_ORIGIN:'http://127.0.0.1:3139'});
const receipt={mode:'simulation',partnerSlug:slug,activated:false,paymentRecorded:false,consentRecorded:false,publicStatus:404,verifiedAt:new Date().toISOString()};
try{
assert.equal(await canUseClinicPractice(slug,{isVerified:true,email:'fiction@example.test'}),false);
await recordPracticeProgram(slug,receipt);
assert.equal(await canUseClinicPractice(slug,{isVerified:true,email:'fiction@example.test'}),true);
assert.equal(await canUseClinicPractice(slug,{isVerified:false,email:'fiction@example.test'}),false);
assert.equal(await canUseClinicPractice(slug,{isVerified:true,email:'real@example.com'}),false);
assert.equal(await canUseClinicPractice(slug+'-other',{isVerified:true,email:'fiction@example.test'}),false);
await recordPracticeProgram(slug,{...receipt,verifiedAt:new Date(Date.now()-25*60*60*1000).toISOString()});assert.equal(await canUseClinicPractice(slug,{isVerified:true,email:'fiction@example.test'}),false);
await recordPracticeProgram(slug,{...receipt,paymentRecorded:true});assert.equal(await canUseClinicPractice(slug,{isVerified:true,email:'fiction@example.test'}),false);
await recordPracticeProgram(slug,receipt);
process.env.VERCEL_ENV='production';assert.equal(await canUseClinicPractice(slug,{isVerified:true,email:'fiction@example.test'}),false);await assert.rejects(recordPracticeProgram(slug,receipt),/unavailable/);
process.env.VERCEL_ENV='preview';process.env.NEXT_PUBLIC_SUPABASE_URL='https://production.supabase.co';assert.equal(await canUseClinicPractice(slug,{isVerified:true,email:'fiction@example.test'}),false);
console.log('PASS: timezone conversion, DST gap rejection, unverified/real-account exclusion, tenant binding, expiry, no-payment evidence, production and external-database rejection.');
}finally{await rm(join(tmpdir(),'legalease-launch-practice',`program-${slug}.json`),{force:true});}
