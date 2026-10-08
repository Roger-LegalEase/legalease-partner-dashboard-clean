import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
register('./lib/internal-auth-test-loader.mjs',import.meta.url);
const {setInternalAuthTestState}=await import('./lib/internal-auth-test-doubles.mjs');
process.env.RCAP_PARTNER_ONBOARDING_ENABLED='true';
const {GET,POST}=await import('../src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/launch/route.ts');
const params={params:Promise.resolve({partnerSlug:'synthetic-alpha'})};
const makeRequest=()=>new Request('https://example.test/api/internal/launch',{method:'POST',headers:{origin:'https://example.test',host:'example.test','x-forwarded-proto':'https'}});
setInternalAuthTestState({});assert.equal((await GET(makeRequest(),params)).status,401);
for(const role of ['partner_admin','partner_staff']) {
 setInternalAuthTestState({user:{id:'synthetic-user',email:'a@example.test'},rows:[{auth_user_id:'synthetic-user',partner_slug:'synthetic-alpha',role,status:'active'}]});
 assert.equal((await GET(makeRequest(),params)).status,403);
 assert.equal((await POST(makeRequest(),params)).status,403);
}
setInternalAuthTestState({user:{id:'synthetic-user',email:'internal@example.test'},rows:[{auth_user_id:'synthetic-user',partner_slug:null,role:'internal_admin',status:'active'}]});
const held=await POST(makeRequest(),params);assert.equal(held.status,404);assert.equal((await held.json()).code,'feature_disabled');
console.log('6 actual launch-route authentication/role/held-operation cases PASS; no launch write or public claim.');
