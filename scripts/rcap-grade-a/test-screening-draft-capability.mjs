// Pure capability boundary test. No database or provider access.
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('../lib/ts-esm-loader.mjs',import.meta.url);
process.env.SUPABASE_SERVICE_ROLE_KEY='isolated-QA-signing-material-no-runtime-authority';
const {sealRcapDraft,permitsRcapDraft}=await import('../../src/lib/expungement-ai/rcap-screening-draft.ts');
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',now=1_000_000;
const t=sealRcapDraft(a,now);
assert.equal(permitsRcapDraft(t,a,now),true);
for(const [token,id,time] of [[t,b,now],[t,a,now+1800000],[t+'x',a,now],[t.replace(a,b),b,now],[undefined,a,now],['junk',a,now],[t+'.extra',a,now]])assert.equal(permitsRcapDraft(token,id,time),false);
delete process.env.SUPABASE_SERVICE_ROLE_KEY;assert.equal(permitsRcapDraft(t,a,now),false);assert.throws(()=>sealRcapDraft(a,now));
console.log('PASS exact session, signature, expiry, malformed/absent cookie and missing signing configuration fail closed');

process.env.NEXT_PUBLIC_LEGALEASE_PARTNER_URL='https://legaleasepartner.com';
process.env.NEXT_PUBLIC_EXPUNGEMENT_AI_URL='https://expungement.ai';
const {screeningResumeUrl}=await import('../../src/lib/expungement-ai/screening-resume-email.ts');
assert.equal(screeningResumeUrl('qa-token','rcap'),'https://legaleasepartner.com/expungement-ai/screening/resume?token=qa-token');
assert.equal(screeningResumeUrl('qa-token','dtc'),'https://expungement.ai/screening/resume?token=qa-token');
assert.equal(screeningResumeUrl('qa-token'),'https://expungement.ai/screening/resume?token=qa-token');
console.log('PASS authoritative RCAP resume origin and unchanged DTC origin');
