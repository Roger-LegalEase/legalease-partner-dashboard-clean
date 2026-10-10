import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {actorBrowser,record,origin,root,fixture,db,checked,write} from './campaign-support.mjs';
const {matterId}=JSON.parse(fs.readFileSync(`${root}/server/participant-packet-fixture.json`));
const account=fixture('clinic-participant-development-access.private'),a=await actorBrowser('participant',account),p=a.page;
let other;
try{
 await p.goto(`${origin}/briefcase/${matterId}`);await p.locator('[data-packet-ready]').getByRole('heading',{name:'Packet ready',exact:true}).waitFor();
 const link=p.getByRole('link',{name:/^Download /}).first();const downloadPath=await link.getAttribute('href');assert.ok(downloadPath.startsWith('/api/'));
 const response=p.waitForResponse(r=>r.url().includes('/api/')&&r.headers()['content-type']?.includes('application/pdf'));const download=p.waitForEvent('download');await link.click();const r=await response,d=await download;assert.equal(r.status(),200);assert.match(r.headers()['cache-control'],/no-store/);assert.match(r.headers()['content-type'],/application\/pdf/);const file=`${root}/journeys/participant/paid-packet.pdf`;await d.saveAs(file);const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');const sha256=createHash('sha256').update(bytes).digest('hex');
 const stored=checked(await db.from('packet_render_jobs').select('id,status,attempt_count,output_sha256,consumer_briefcase_item_id,accounting_result').eq('consumer_briefcase_item_id',matterId).order('created_at',{ascending:false}));assert.ok(stored.length);assert.equal(stored[0].output_sha256,sha256);assert.ok(['artifact_validated','delivered'].includes(stored[0].status));
 other=await actorBrowser('participant',JSON.parse(fs.readFileSync(`${root}/server/clinic-participant-development-access.private.json`)));
 await other.page.goto(`${origin}/briefcase/${matterId}`);await other.page.getByText('This matter is not in your Briefcase.',{exact:true}).waitFor();
 const denied=await other.context.request.get(origin+downloadPath);assert.equal(denied.status(),404);assert.match(denied.headers()['cache-control'],/no-store/);assert.equal((await denied.text()).includes(account.email),false);
 const anonymous=await a.browser.newContext();assert.ok([401,404].includes((await anonymous.request.get(origin+downloadPath)).status()));await anonymous.close();
 await record(other,['U-T12'],['Sign in as a different verified participant','Open another participant’s matter','Attempt its private download'],'The other account cannot read matter details or download its artifact.',{fixture:matterId,downloadStatus:denied.status()});
 await p.reload();await p.locator('[data-packet-ready]').getByRole('heading',{name:'Packet ready',exact:true}).waitFor();
 await record(a,['U-T21'],['Return to owned paid matter','Download through visible packet link','Validate PDF bytes against stored output hash','Refresh matter'],'The real worker PDF is available only through authenticated owner delivery with no-store caching.',{fixture:matterId,bytes:bytes.length,sha256,jobs:stored});
 write('server/packet-delivery.json',{matterId,bytes:bytes.length,sha256,jobs:stored});
}catch(error){write('server/packet-delivery-failure.json',{error:error.message,route:new URL(p.url()).pathname,text:(await p.locator('body').innerText()).slice(-6000)});throw error;}finally{await a.browser.close();if(other)await other.browser.close();}
