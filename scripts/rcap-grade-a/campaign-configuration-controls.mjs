import fs from 'node:fs';import assert from 'node:assert/strict';
import {actorBrowser,origin,root,save,write,sourceIdentity} from './campaign-support.mjs';
const {slug}=JSON.parse(fs.readFileSync(root+'/server/ten-program-scale.json')).receipts.find(x=>x.code==='WA');
const a=await actorBrowser('admin'),p=a.page,api=origin+'/api/internal/partners/onboarding/phase1/'+slug,proofs=[];
const fields=[
 ['A04-01','organization_contacts','legal_organization_name','Isolated Washington Readiness Organization'],
 ['A04-02','organization_contacts','public_organization_name','Washington Readiness Program'],
 ['A04-03','organization_contacts','public_program_name','Washington Screening Access'],
 ['A04-04','organization_contacts','website','https://example.test/washington'],
 ['A04-08','program_goals','operator_authority_reference','Owner-directed isolated application acceptance only; no Production or external agreement.'],
 ['A04-12','program_goals','target_population','Adults seeking general information about Washington records.'],
 ['A04-14','geography_audience_language_accessibility','service_area_description','Washington'],
 ['A04-15','geography_audience_language_accessibility','counties','King, Pierce'],
 ['A04-16','geography_audience_language_accessibility','primary_language','English'],
 ['A04-19','support_referrals_reporting','participant_support_email','washington-support@example.test'],
 ['A04-21','support_referrals_reporting','contested_matter_procedure','Stop self-help work if there is prosecutor opposition, a contested hearing, or a need for individualized legal advocacy. Explain the limit and refer the participant to independent legal assistance.'],
 ['A04-22','brand_public_page','program_headline','Understand your Washington screening options'],
 ['A04-23','brand_public_page','program_subheadline','Start with preliminary information and verify your next steps.'],
 ['A04-24','brand_public_page','approved_organization_description','Washington Readiness Program provides access to self-help screening information.'],
 ['A04-25','brand_public_page','primary_cta_label','Start free screening'],
 ['A04-26','brand_public_page','participant_support_copy','Email washington-support@example.test for help using this program. Legal representation is not included.']];
try{
 await p.goto(origin+'/internal/partners/onboarding/'+slug);const initial=await(await a.context.request.get(api+'/program')).json();assert.equal(initial.operations.view.decision.live,false);assert.equal(initial.operations.view.data.geography_audience_language_accessibility.enable_spanish,false);
 for(const d of await p.locator('#configure-program details').all())if(!await d.getAttribute('open'))await d.locator('summary').click();
 for(const[id,section,key,value]of fields){const field=p.locator('#program-field-'+key).locator('input,textarea').first();await field.fill(value);}
 const address=['900 Isolated Test Street','Suite 4','Seattle, WA 98101','United States'];for(const[label,i]of [['Street address or PO box',0],['Unit, building, or second address line',1],['City, region, and postal code',2],['Country or additional address lines',3]])await p.getByLabel(label,{exact:true}).fill(address[i]);
 await p.getByLabel('How people participate',{exact:true}).selectOption('both');await p.getByLabel('External agreement',{exact:true}).selectOption('not_applicable');
 const result=await save(p);assert.equal(result.preparationError,null);const after=await(await a.context.request.get(api+'/configuration')).json();for(const[id,section,key,value]of fields){const expected=key==='counties'?['King','Pierce']:value;assert.deepEqual(after.configuration.data[section][key],expected);proofs.push({ids:[id],action:'Edit actual field, Save once, and read canonical persisted value',section,key,expected});}
 assert.equal(after.configuration.data.organization_contacts.primary_address,address.join('\n'));assert.equal(after.configuration.data.program_goals.participation_mode,'both');assert.equal(after.configuration.data.program_goals.external_agreement_applicability,'not_applicable');
 await p.reload();for(const d of await p.locator('#configure-program details').all())if(!await d.getAttribute('open'))await d.locator('summary').click();for(const[id,section,key,value]of fields)assert.equal(await p.locator('#program-field-'+key).locator('input,textarea').first().inputValue(),value);
 const current=await(await a.context.request.get(api+'/program')).json();assert.equal(current.operations.view.materials.length,2);assert.equal(current.operations.view.decision.live,false);proofs.push({ids:['A04-05','A04-09','A04-11','A04-39'],action:'Save address, agreement applicability and participation mode with the complete configuration; refresh current material identities',address,materials:current.operations.view.materials.map(m=>({id:m.id,version:m.version,hash:m.hash}))});
 write('controls/configuration.json',{sourceIdentity,result:'PASS',fixture:slug,proofs});console.log(JSON.stringify({result:'PASS',controls:proofs.flatMap(x=>x.ids).length}));
}catch(e){write('controls/configuration-error.json',{sourceIdentity,error:e.message,proofs,text:(await p.locator('body').innerText()).slice(-1600)});throw e;}finally{await a.browser.close();}
