import fs from 'node:fs';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {chromium,webkit} from 'playwright';
import {artifactSourceFixture} from './lib/rcap-onboarding-artifact-fixture.mjs';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {ONBOARDING_SCHEMA_REGISTRY:schema}=await import('../src/lib/partners/onboarding/schema.ts');
const origin='https://127.0.0.1:3140',out='/workspaces/training-modules-09-10/output/rcap-journey-20261009',results=[];
for(const [engine,type] of Object.entries({chromium,webkit}).filter(([name])=>!['chromium','webkit'].includes(process.env.BROWSER)||process.env.BROWSER===name)){
 const browser=await type.launch();const c=await browser.newContext({ignoreHTTPSErrors:true,storageState:'/tmp/rcap-journey-admin-session.json',viewport:{width:1440,height:1000}});const p=await c.newPage();p.setDefaultTimeout(25000);const errors=[];let step='create';p.on('pageerror',e=>errors.push({message:e.message,stack:e.stack,step}));p.on('requestfailed',r=>{if(process.env.JOURNEY_DEBUG)console.log('REQUEST FAILED',step,new URL(r.url()).pathname,r.failure()?.errorText);});const slug='practice-create-'+engine+'-'+Date.now().toString(36);
 try{
  await p.goto(origin+'/internal/partners/onboarding');await p.getByRole('link',{name:'Create partner',exact:true}).click();
  const values={organizationName:'Practice Community '+engine,legalOrganizationName:'Practice Community '+engine,partnerSlug:slug,programName:'Community Record Clearing',programPurpose:'Fictional program for isolated workflow practice.',administratorName:'Practice Administrator',administratorEmail:slug+'@example.test',clearanceReason:'Fictional local practice only; no commercial activation authority.'};
  for(const [name,value]of Object.entries(values))await p.locator(`[name="${name}"]`).fill(value);
  await p.getByRole('button',{name:'Review what will be created',exact:true}).click();await p.getByRole('button',{name:'Provision partner',exact:true}).click();await p.getByRole('button',{name:'Continue to program setup',exact:true}).click();await p.getByRole('heading',{name:'Configure program',exact:true}).waitFor();
  const editor=p.locator('#prefill-heading');await editor.getByRole('button',{name:'Use saved partner details',exact:true}).click();await editor.getByRole('status').filter({hasText:'Saved partner details reused.'}).waitFor();
  const data=artifactSourceFixture().data;Object.assign(data.organization_contacts,{public_organization_name:values.organizationName,legal_organization_name:values.legalOrganizationName,public_program_name:values.programName,partner_slug_preference:slug});
  for(const section of await editor.getByLabel('Program section').locator('option').evaluateAll(options=>options.map(o=>o.value))){
   step=section;await editor.getByLabel('Program section').selectOption(section);
   for(const field of schema.filter(f=>f.sectionKey===section&&!f.parentCollection&&f.ownership==='partner_editable')){
    const value=data[section]?.[field.dataKey];if(value==null)continue;
    if(field.dataType.endsWith('_collection')){
     const heading=editor.getByRole('heading',{name:field.label,exact:true});if(!await heading.count())continue;const collection=heading.locator('..');
     for(const row of value){await collection.getByRole('button',{name:'Add person',exact:true}).click();const group=collection.getByRole('group').last();for(const child of schema.filter(f=>f.parentCollection===field.dataKey&&f.ownership==='partner_editable')){const entry=row[child.dataKey];if(entry==null)continue;const control=group.getByLabel(child.label,{exact:true});if(child.enumValues&&child.dataType.endsWith('_array')){for(const option of entry)await group.getByRole('checkbox',{name:option.replaceAll('_',' '),exact:true}).check();}else if(await control.count()){if(child.dataType==='boolean')await control.setChecked(entry);else if(await control.evaluate(e=>e.tagName)==='SELECT')await control.selectOption(String(entry));else await control.fill(Array.isArray(entry)?entry.join(', '):String(entry));}}}
    }else{
     const control=editor.getByLabel(field.label,{exact:true});if(!await control.count())continue;
     if(field.dataType.endsWith('_reference')){if(await control.locator('option').count()>1)await control.selectOption({index:1});}
     else if(await control.evaluate(e=>e.tagName)==='SELECT')await control.selectOption(String(value));else await control.fill(Array.isArray(value)?value.join(', '):String(value));
    }
   }
   await editor.getByRole('button',{name:'Save section',exact:true}).click();await editor.getByRole('status').filter({hasText:'Program information saved.'}).waitFor();console.log(engine,'saved',section);
  }
  await p.waitForLoadState('networkidle');await p.reload();await editor.getByLabel('Legal organization name',{exact:true}).waitFor();assert.equal(await editor.getByLabel('Legal organization name',{exact:true}).inputValue(),values.legalOrganizationName);
  step='preview';await p.getByRole('link',{name:'Preview',exact:true}).click();await p.locator('#launch-prep-panel-co_branded_page').waitFor();await p.screenshot({path:`${out}/${engine}-new-program-preview.png`,fullPage:true});
  step='review';await p.getByRole('link',{name:'Review',exact:true}).click();await p.getByRole('button',{name:'Prepare current review package',exact:true}).click();await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Prepare current review package'&&!b.disabled));
  for(const row of await p.locator('[data-artifact-type]').all())if(await row.getByRole('button',{name:'Preview',exact:true}).count())await row.getByRole('button',{name:'Preview',exact:true}).click();
  for(const box of await p.getByRole('checkbox',{name:/I reviewed/}).all())await box.check();await p.getByRole('button',{name:'Approve reviewed launch package',exact:true}).click();await p.getByText('Current review package approved.',{exact:true}).waitFor();
  step='launch';await p.getByRole('link',{name:'Launch',exact:true}).click();await p.getByRole('button',{name:'Check practice package',exact:true}).click();await p.getByText('Practice package ready.',{exact:true}).waitFor();await p.getByRole('checkbox',{name:/I reviewed this fictional program/}).check();await p.getByRole('button',{name:'Simulate launch',exact:true}).click();await p.getByText(/Simulated launch verified\./).waitFor();await p.screenshot({path:`${out}/${engine}-new-program-verified.png`,fullPage:true});assert.deepEqual(errors,[]);results.push({engine,slug,passed:true});console.log('PASS',engine,slug);
 }catch(e){results.push({engine,slug,passed:false,error:e.message});console.log('FAIL',engine,e.message,(await p.locator('body').innerText()).slice(-2000));await p.screenshot({path:`${out}/${engine}-new-program-failure.png`,fullPage:true});}finally{await browser.close();fs.writeFileSync(out+'/rcap-create-browser-acceptance.json',JSON.stringify(results,null,2));}
}
if(results.some(r=>!r.passed))process.exitCode=1;
