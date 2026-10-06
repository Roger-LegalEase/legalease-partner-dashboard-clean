// Real loopback database/Auth tests for the WP-02 index and invitation boundary.
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname,'127.0.0.1','Loopback only');
const client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const originalFetch=globalThis.fetch;let mode='normal',reads=0;
globalThis.fetch=async (input,options)=>{
 const u=new URL(typeof input==='string'?input:input.url??input.toString());
 if(u.origin===url&&['/rest/v1/partner_records','/rest/v1/partner_onboarding'].includes(u.pathname)&&(!options?.method||options.method==='GET')){
  if(mode==='failure')return new Response('{"message":"Synthetic read failure"}',{status:503,headers:{'content-type':'application/json'}});
  if(mode==='small-pages'){u.searchParams.set('limit','2');reads++;return originalFetch(u,options);}
 }
 const response = await originalFetch(input,options);
 return response;
};
const {listInternalProvisioningRecords}=await import('../src/lib/partners/partner-repository.ts');
const {provisionPartner}=await import('../src/lib/partners/partner-provisioning-service.ts');
const first=await import('../src/lib/partners/first-admin-service.ts');
const review=await import('../src/lib/partners/onboarding/service.ts');
const domain=await import('../src/lib/partners/partner-provisioning-domain.ts');
const run=Date.now().toString(36),slugs=[],users=[];
async function user(name,confirmed=true){const r=await client.auth.admin.createUser({email:`${name}-${run}@example.test`,password:`Test-${randomBytes(16).toString('hex')}!9`,email_confirm:confirmed});assert.equal(r.error,null);users.push(r.data.user.id);return r.data.user;}
async function events(slug){const r=await client.from('partner_events').select('event_payload').eq('partner_slug',slug).eq('event_type','first_admin_invitation_record');assert.equal(r.error,null);return r.data;}
try{
 const operator=await user('operator');assert.equal((await client.from('partner_users').insert({auth_user_id:operator.id,partner_slug:null,role:'internal_admin',status:'active'})).error,null);
 const before=await listInternalProvisioningRecords();
 for(let i=0;i<4;i++){
  const slug=`index-${i}-${run}`;slugs.push(slug);
  const values={organizationName:`Index Organization ${i}`,legalOrganizationName:`Index Org ${i} LLC`,partnerSlug:slug,programName:'Synthetic program',programPurpose:'Isolated hotfix boundary verification.',administratorName:'Synthetic Administrator',administratorEmail:`unissued-${i}-${run}@example.test`,clearanceReason:'Isolated authorized override fixture.',idempotencyKey:crypto.randomUUID()};
  const r=await provisionPartner({values,operatorUserId:operator.id});assert.equal(r.created,true);
  if(i===0){
   const workspace=await client.from('partner_onboarding').select('id,aggregate_version').eq('partner_slug',slug).single();assert.equal(workspace.error,null);
   await review.applyInternalOnboardingReview({authUserId:operator.id,partnerSlug:slug,role:'internal_admin'},{workspaceId:workspace.data.id,expectedWorkspaceVersion:workspace.data.aggregate_version,requestId:crypto.randomUUID(),operation:{action:'commercial_gate',outcome:'cleared_by_authorized_internal_override',overrideReason:'Isolated WP-02 invoice/clearance display test.'}});
   await assert.rejects(provisionPartner({values:{...values,idempotencyKey:crypto.randomUUID()},operatorUserId:operator.id}),e=>e.code==='slug_conflict');
   assert.equal(domain.validatePartnerProvisioningInput({...values,partnerSlug:'UPPERCASE'}).value.partnerSlug,'uppercase');
   for(const invalid of ['has spaces','contains/slash','https://example.test'])assert.equal(domain.validatePartnerProvisioningInput({...values,partnerSlug:invalid}).ok,false);
  }
 }
 mode='small-pages';const index=await listInternalProvisioningRecords();mode='normal';
 assert.equal(index.length,before.length+4);assert.equal(new Set(index.map(r=>r.partner_slug)).size,index.length);assert.ok(reads>=4,'Both database tables read every capped page');
 const item=index.find(r=>r.partner_slug===slugs[0]);assert.equal(item.payment_status,'unpaid');assert.equal(item.commercial_gate_status,'cleared_by_authorized_internal_override');
 mode='failure';await assert.rejects(listInternalProvisioningRecords());mode='normal';assert.equal((await listInternalProvisioningRecords()).length,index.length);
 console.log('Real provisioning index: capped pages, exact totals, no duplicates, unpaid/cleared distinction, failure refusal and retry PASS');
 const slug=slugs[0],existing=await user('confirmed'),unconfirmed=await user('unconfirmed',false),disabled=await user('disabled'),other=await user('other-tenant'),changed=await user('changed');
 assert.equal((await client.from('partner_users').insert([{auth_user_id:disabled.id,partner_slug:slugs[1],role:'partner_admin',status:'disabled'},{auth_user_id:other.id,partner_slug:slugs[1],role:'partner_admin',status:'active'}])).error,null);
 assert.equal((await first.validateFirstAdminInvitationRecipient({partnerSlug:slug,email:`new-${run}@example.test`})).accountPath,'create_new_account');
 assert.equal((await first.validateFirstAdminInvitationRecipient({partnerSlug:slug,email:existing.email})).accountPath,'existing_confirmed_account');
 for(const u of [operator,disabled,other])await assert.rejects(first.validateFirstAdminInvitationRecipient({partnerSlug:slug,email:u.email}),e=>e.code==='auth_conflict');
 await assert.rejects(first.validateFirstAdminInvitationRecipient({partnerSlug:slug,email:unconfirmed.email}),e=>e.code==='auth_ambiguous');
 const invite=await first.createFirstAdminInvitation({partnerSlug:slug,operatorUserId:operator.id,values:{fullName:'Existing Customer',email:existing.email,expirationHours:72,idempotencyKey:crypto.randomUUID()}});
 const prior=await events(slug);
 await assert.rejects(first.createFirstAdminInvitation({partnerSlug:slug,operatorUserId:operator.id,replaceCurrent:true,values:{fullName:'Rejected Replacement',email:operator.email,expirationHours:72,idempotencyKey:crypto.randomUUID()}}),e=>e.code==='auth_conflict');assert.deepEqual(await events(slug),prior,'Rejected replacement preserves prior invitation including token/account state');
 await first.validateFirstAdminInvitationRecipient({partnerSlug:slugs[2],email:changed.email});
 assert.equal((await client.from('partner_users').insert({auth_user_id:changed.id,partner_slug:null,role:'internal_admin',status:'active'})).error,null);
 await assert.rejects(first.createFirstAdminInvitation({partnerSlug:slugs[2],operatorUserId:operator.id,values:{fullName:'Changed Role',email:changed.email,expirationHours:72,idempotencyKey:crypto.randomUUID()}}),e=>e.code==='auth_conflict');assert.deepEqual(await events(slugs[2]),[]);
 assert.equal((await client.from('partner_users').insert({auth_user_id:existing.id,partner_slug:slugs[3],role:'partner_admin',status:'active'})).error,null);
 await assert.rejects(first.sendFirstAdminInvitationEmail({partnerSlug:slug,operatorUserId:operator.id,invitationId:invite.invitation.invitationId,setupLink:invite.setupLink,deliveryIdempotencyKey:crypto.randomUUID()}),e=>e.code==='auth_conflict');assert.deepEqual(await events(slug),prior);
 console.log('Invitation preflight/create/replace/delivery: new and confirmed paths; internal/other-tenant/disabled/unconfirmed refusal; unchanged rejected replacement; changed-role race refusal PASS');
}finally{
 mode='normal';globalThis.fetch=originalFetch;
 for(const slug of slugs){await client.from('partner_users').delete().eq('partner_slug',slug);await client.from('partner_records').delete().eq('partner_slug',slug);}
 for(const id of users)await client.auth.admin.deleteUser(id);
}
