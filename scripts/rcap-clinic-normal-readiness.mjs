import assert from 'node:assert/strict';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
export async function readNormalClinicSurfaces(page) {
  const event=`/api/clinic/events/${CLINIC_SETUP.event}`;
  const probes=[{id:'general_clinic_list',path:'/partner/clinic',kind:'html',tag:'h1',marker:'Clinic Mode administration'},
    {id:'clinic_follow_up_page',path:`/partner/clinic/${CLINIC_SETUP.event}/follow-up`,kind:'html',tag:'h2',marker:'Follow-up queue'},
    {id:'clinic_queue',path:event+'/queue',key:'cases'},
    {id:'clinic_follow_up',path:event+'/follow-ups',key:'followUps'},
    {id:'clinic_reporting',path:event+'/reporting',key:'report'}];
  return page.evaluate(async ({probes,eventId})=>Promise.all(probes.map(async probe=>{
    try {
      const response=await fetch(probe.path,{credentials:'same-origin',cache:'no-store'});
      let valid=false,state='unknown';
      if(probe.kind==='html') {
        const document=new DOMParser().parseFromString(await response.text(),'text/html');
        valid=[...document.querySelectorAll(probe.tag)].some(node=>node.textContent?.trim()===probe.marker);
        state=probe.id==='clinic_follow_up_page'&&document.body?.textContent?.includes('No participant cases are available under current consent')?'empty_consent_scope':'surface_rendered';
      } else {
        const body=await response.json();valid=body?.success===true&&(probe.key==='report'
          ?body.report?.eventId===eventId:Array.isArray(body[probe.key]));
        state=probe.key==='report'?'aggregate_readable':Array.isArray(body?.[probe.key])&&body[probe.key].length===0?'empty':'readable';
      }
      return {id:probe.id,httpStatus:response.status,state,ok:response.status===200&&valid,
        reason:response.status===200?(valid?null:'surface_contract_unproven'):[401,403].includes(response.status)?'current_actor_access_denied':'surface_http_error'};
    } catch{return {id:probe.id,httpStatus:null,ok:false,reason:'surface_transport_unproven'};}
  })),{probes,eventId:CLINIC_SETUP.event});
}
export function assertNormalClinicSurfaces(checks) {
  assert.deepEqual(checks.map(check=>check.id).sort(),['general_clinic_list','clinic_follow_up_page','clinic_queue','clinic_follow_up','clinic_reporting'].sort());
  assert.ok(checks.every(check=>check.ok===true),'All applicable normal Clinic surfaces must pass before code issuance');
}
