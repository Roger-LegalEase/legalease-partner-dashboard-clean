import assert from 'node:assert/strict';
import {artifactDenial} from './artifact-journey.mjs';

/** Only run-owned state is conditioned by setup credentials. Every measured
 * denial is an ordinary authenticated application or PostgREST request. */
export async function securityJourney({fixture,event,owned,staff,otherStaff,outsider,outsiderDb,check}) {
  const queuePath=`/api/clinic/events/${event.id}/queue`;
  for(const item of owned) {
    const prefix=item.locale;
    const selected=item.locale==='en'?staff:otherStaff;
    const row=()=>item.selectedDb.from('clinic_cases').select('id').eq('id',item.caseId);
    const visible=await row();
    assert(!visible.error&&visible.data.length===1,'Security controls require a positive selected-staff baseline');
    const changed=await item.selectedHelper.context.request.patch(queuePath,{headers:{Origin:fixture.origin},data:{caseId:item.caseId,queueStatus:'in_progress'}});
    check(`${prefix}-authorized-staff-queue-write`,changed.ok());
    const cross=await outsiderDb.from('clinic_cases').select('id').eq('id',item.caseId);
    check(`${prefix}-cross-program-rls-denied`,!cross.error&&cross.data.length===0);
    const crossApi=await outsider.context.request.get(queuePath+`?partnerSlug=${fixture.program}&participantId=${item.actor.id}`);
    check(`${prefix}-cross-program-tampered-identifiers-api-denied`,[403,404].includes(crossApi.status()));

    await fixture.assign(event,selected,['queue']);
    try {
      await artifactDenial({item,context:item.selectedHelper.context,id:'no-assist-staff-denied',check});
      const denied=await row();
      const api=await item.selectedHelper.context.request.get(queuePath);
      check(`${prefix}-selected-staff-assist-permission-removed-rls`,!denied.error&&denied.data.length===0);
      check(`${prefix}-selected-staff-assist-permission-removed-api`,api.ok()&&!(await api.json()).cases.some(c=>c.id===item.caseId));
      const update=await item.selectedHelper.context.request.patch(queuePath,{headers:{Origin:fixture.origin},data:{caseId:item.caseId,queueStatus:'needs_information'}});
      check(`${prefix}-no-assist-queue-write-denied`,[403,404].includes(update.status()));
    } finally { await fixture.assign(event,selected,['assist','queue']); }

    const queuePage=`/clinic/staff/${event.id}/queue`;
    await item.selectedHelper.page.goto(queuePage,{waitUntil:'networkidle'});
    check(`${prefix}-authorized-staff-queue-page`,await item.selectedHelper.page.getByRole('combobox').count()>0);
    await fixture.assign(event,selected,['assist','queue'],'suspended');
    try {
      await artifactDenial({item,context:item.selectedHelper.context,id:'suspended-staff-denied',check});
      const denied=await row();
      const api=await item.selectedHelper.context.request.get(queuePath);
      check(`${prefix}-suspended-staff-rls-denied`,!denied.error&&denied.data.length===0);
      check(`${prefix}-suspended-staff-api-denied`,[403,404].includes(api.status())&&/no-store/.test(api.headers()['cache-control']??''));
      await item.selectedHelper.page.reload({waitUntil:'networkidle'});
      check(`${prefix}-suspended-staff-cached-page-denied`,await item.selectedHelper.page.getByRole('combobox').count()===0);
    } finally { await fixture.assign(event,selected,['assist','queue']); }

    const session=fixture.checked(await fixture.admin.from('clinic_assisted_sessions').select('started_at,expires_at').eq('id',item.session.id).single());
    // Advance only this synthetic fixture's expiry; never alter the server clock
    // or an existing participant session. The original active values are restored.
    assert.match(item.session.id,/^[0-9a-f-]{36}$/);
    assert(fixture.actors.some(actor=>actor.id===item.actor.id),'Expiry conditioning is limited to run-created participants');
    fixture.sql(`update clinic_assisted_sessions set started_at=now()-interval '2 minutes',expires_at=now()-interval '1 second' where id='${item.session.id}' and participant_user_id='${item.actor.id}';`);
    try {
      await artifactDenial({item,context:item.selectedHelper.context,id:'expired-consent-staff-denied',check});
      const denied=await row();
      const api=await item.selectedHelper.context.request.get(queuePath);
      check(`${prefix}-expired-consent-rls-denied`,!denied.error&&denied.data.length===0);
      check(`${prefix}-expired-consent-api-denied`,api.ok()&&!(await api.json()).cases.some(c=>c.id===item.caseId));
      await item.page.goto(`/clinic/${event.eventSlug}/screening/ms`,{waitUntil:'networkidle'});
      check(`${prefix}-expired-consent-screening-denied`,await item.page.locator('[data-clinic-locked=true]').count()===1&&await item.page.locator('input[type=radio]').count()===0);
    } finally {
      for(const value of Object.values(session))assert(Number.isFinite(Date.parse(value)),'Original synthetic timestamps required');
      fixture.sql(`update clinic_assisted_sessions set started_at='${new Date(session.started_at).toISOString()}',expires_at='${new Date(session.expires_at).toISOString()}' where id='${item.session.id}' and participant_user_id='${item.actor.id}';`);
      await item.page.reload({waitUntil:'networkidle'});
    }
    const restored=await row();
    check(`${prefix}-selected-staff-positive-control-restored`,!restored.error&&restored.data.length===1);
  }
}
