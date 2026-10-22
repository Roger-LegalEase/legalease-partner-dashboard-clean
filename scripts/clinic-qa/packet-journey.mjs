import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {startArtifactEvidence,acceptRealArtifact,artifactDenial,shouldAwaitArtifactStatus} from './artifact-journey.mjs';
import {MS_NONCONVICTION_SCREENING_ANSWERS,MS_NONCONVICTION_PACKET_ANSWERS} from '../lib/rcap-ms-nonconviction-fixture.mjs';

const originals=JSON.parse(fs.readFileSync(new URL('./ga22-original-manifestations.json',import.meta.url))).manifestations;
const copy=JSON.parse(fs.readFileSync(new URL('../../src/lib/expungement-ai/frontend/reviewed-assisted-contact-copy.json',import.meta.url)));

const reviewed=JSON.parse(fs.readFileSync(new URL('../../src/lib/expungement-ai/frontend/reviewed-question-spanish.json',import.meta.url)));

export function ownerPacketStatusAnswered({status,body,cacheControl,generationStatus,generationResultCode}) {
  return status===200 || (status===403 && generationStatus===403 && generationResultCode==='fulfillment_not_proven'
    && cacheControl==='private, no-store' && body?.resultCode==='fulfillment_not_proven'
    && body.error==='A packet is not available for this route yet. Your saved information remains available.'
    && Object.keys(body).length===2);
}

// The real screening controls, answered from an existing fixture; `beforeStep` lets a caller act between
// questions (the unassisted run switches language mid-screening). Returns the save button and the questions seen.
export async function answerScreening({page,answers,beforeStep=async()=>{}}) {
  const saveResult=page.getByRole('button',{name:/^(Save my result and continue|Guardar mi resultado y continuar)$/});
  const questionIds=[];
  for(let step=0;step<25;step++) {
    // The optional pathway-context question keeps its options under a closed "Show optional help" disclosure (6b4cd9c21); open it like a participant would.
    const optionalHelp=page.locator('[data-optional-pathway-help] > button[aria-expanded=false]');
    await page.locator('input[type=radio]:visible,input[type=checkbox]:visible').or(saveResult).or(optionalHelp).first().waitFor();
    if(await saveResult.count())break;
    if(await optionalHelp.count())await optionalHelp.click();
    await beforeStep(step);
    const names=await page.locator('input[type=radio],input[type=checkbox]').evaluateAll(nodes=>[...new Set(nodes.map(node=>node.name))]);
    for(const name of names) {
      const id=name.replace(/^q-/,'');let value=answers[id];if(value&&typeof value==='object')value=value.value;
      assert.equal(typeof value,'string',`Existing MS fixture must supply screening fact ${id}`);
      const choices=page.locator(`[name=${JSON.stringify(name)}]`);
      assert((await choices.evaluateAll(nodes=>nodes.map(node=>node.value))).includes(value),`Existing MS answer must match current ${id} options`);
      await page.locator(`[name=${JSON.stringify(name)}][value=${JSON.stringify(value)}]`).check();questionIds.push(id);
    }
    await page.getByRole('button',{name:/^(Continue|Continuar)$/}).click();
    await page.waitForFunction(old=>document.querySelector('input[type=radio],input[type=checkbox]')?.getAttribute('name')!==old,names[0]);
  }
  await saveResult.waitFor();
  return {saveResult,questionIds};
}

export async function packetJourney({fixture,participant,session,locale,check,report,helperContext}) {
  assert.equal(fixture.jurisdiction,'MS','Use the jurisdiction-specific accepted journey adapter');
  const {context,page}=participant;
  const artifactEvidence=startArtifactEvidence(report,locale);
  let artifact;
  const answers={...MS_NONCONVICTION_SCREENING_ANSWERS,...MS_NONCONVICTION_PACKET_ANSWERS,
    ownership_scope:copy.canonicalHelperWire,ms_program_order:'no_program_order',state_exclusion_categories:'None of these',criminal_history:'No',record_documents:'Yes',pardon_status:'No'};
  const {saveResult,questionIds}=await answerScreening({page,answers});
  check(`${locale}-real-screening-controls-and-result`,questionIds.length>=7&&questionIds.includes('ownership_scope'));
  report.screening??=[];report.screening.push({locale,questionIds});
  const claimResponse=page.waitForResponse(response=>response.url().endsWith('/screening/pending/claim')&&response.request().method()==='POST');
  await saveResult.click();assert.equal((await claimResponse).status(),200,'Participant claims the actual browser result');
  await page.waitForURL(url=>/^\/briefcase\/(?:matters\/)?[a-f0-9-]{36}$/.test(url.pathname));
  const matterId=new URL(page.url()).pathname.split('/').at(-1);fixture.known.add(matterId);
  check(`${locale}-assisted-participant-claims-own-matter`,/^[0-9a-f-]{36}$/.test(matterId));
  const api=`/api/expungement-ai/briefcase/${matterId}/packet-information`;
  const initial=await context.request.get(api);assert.equal(initial.status(),200);
  let model=await initial.json();
  report.copyCoverage??=[];
  for(const original of originals){
    const successorId=original.question_id==='trafficking_status'?'ms_charged_trafficking_distribution_manufacture':original.question_id;
    const q=model.questions.find(q=>q.id===successorId);
    const approved=copy.entries.find(entry=>entry.questionId===original.question_id&&entry.rowKey.startsWith('GA22-'));
    const neutral=successorId==='ms_charged_trafficking_distribution_manufacture'?reviewed.entries.find(entry=>entry.questionId===successorId&&entry.scope.packetRouteIndexes.includes(165)):null;
    const expected=approved?.successor?.[locale]??(neutral&&(locale==='es'?neutral.spanish:neutral.english));
    const actual=q&&(locale==='es'?q.translations?.es:q);
    const passed=Boolean(q&&expected&&actual?.prompt===expected.prompt&&(actual.helperText??'')===(expected.helperText??''));
    report.copyCoverage.push({manifestationId:original.manifestation_id,questionId:original.question_id,successorQuestionId:successorId,locale,status:passed?'PASS':'NOT_VERIFIED',basis:approved?.rowKey??neutral?.signature??'MISSING_REVIEW_BINDING'});
  }
  check(`${locale}-all-38-original-manifestations-accounted`,report.copyCoverage.filter(row=>row.locale===locale).length===38);
  check(`${locale}-all-38-copy-successors-match-approved-strings`,report.copyCoverage.filter(row=>row.locale===locale).every(row=>row.status==='PASS'));
  const saved=await context.request.post(api,{data:{expectedRevision:model.revision,answers:MS_NONCONVICTION_PACKET_ANSWERS}});
  assert.equal(saved.status(),200,'Real protected answer save');model=await saved.json();
  check(`${locale}-protected-save-not-implicit-verification`,model.readyToGenerate===false);
  await page.goto(`/briefcase/${matterId}/packet-information`,{waitUntil:'networkidle'});
  const sections=page.locator('#packet-section-select');
  await sections.waitFor();
  const rendered=new Set();
  for(const section of await sections.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(value=>value!=='review'))) {
    await sections.selectOption(section);
    await page.waitForFunction(value=>document.querySelector('#packet-section-select')?.value===value,section);
    for(const row of report.copyCoverage.filter(row=>row.locale===locale)) {
      const field=page.locator(`[data-packet-question=${JSON.stringify(row.successorQuestionId)}]`);
      if(!await field.count())continue;
      const q=model.questions.find(q=>q.id===row.successorQuestionId);
      const expected=locale==='es'?q.translations.es:q;
      const text=await field.innerText();
      const passed=text.includes(expected.prompt)&&(!expected.helperText||text.includes(expected.helperText));
      row.renderedStatus=passed?'PASS':'FAIL';if(passed)rendered.add(row.manifestationId);
    }
  }
  check(`${locale}-all-38-copy-successors-rendered`,rendered.size===38);
  await page.goto(`/briefcase/${matterId}/packet-information?edit=participant_full_legal_name`,{waitUntil:'networkidle'});
  const control=page.locator('[data-packet-question=participant_full_legal_name]');
  await control.waitFor();
  const value='Synthetic Clinic Corrected';
  await control.locator('input').first().fill(value);
  const saveResponse=page.waitForResponse(response=>new URL(response.url()).pathname===api&&response.request().method()==='POST');
  await page.getByRole('button',{name:/^(Save|Guardar)$/}).click();
  assert.equal((await saveResponse).status(),200,'Browser explicit correction saved');
  await page.reload({waitUntil:'networkidle'});
  const reloaded=await context.request.get(api);const next=await reloaded.json();
  check(`${locale}-explicit-correction-save-reload`,reloaded.ok()&&next.answers.participant_full_legal_name===value&&next.revision>model.revision);
  const stale=await context.request.post(api,{data:{expectedRevision:model.revision,answers:{participant_full_legal_name:'Stale correction'}}});
  check(`${locale}-stale-revision-denied`,stale.status()===409);
  await page.goto(next.reviewPath,{waitUntil:'networkidle'});
  check(`${locale}-actual-review-shows-corrected-answer`,(await page.locator('main').innerText()).includes(value));
  for(const suffix of ['',`?participantId=${session.participant_user_id}&partnerSlug=${fixture.program}`]){
    const denied=await helperContext.request.get(api+suffix);
    check(`${locale}-staff-cannot-take-participant-ownership${suffix?'-tampered-identifiers':''}`,denied.status()===404);
  }
  const verified=await context.request.post(api,{data:{expectedRevision:next.revision,answers:{},verify:true}});
  const verifiedBody=await verified.json();
  report.delivery??=[];
  const delivery={locale,verificationHttp:verified.status(),readyToGenerate:verifiedBody.readyToGenerate??false,missingInputIds:verifiedBody.missingInputIds??[],status:'NOT_RUN'};
  report.delivery.push(delivery);
  if(verified.ok()&&verifiedBody.readyToGenerate) {
    const generation=await context.request.post('/api/expungement-ai/packet/generate',{data:{briefcaseItemId:matterId}});
    const generated=await generation.json().catch(()=>null);
    assert(generated,`Generation returned a non-JSON HTTP ${generation.status()}`);
    if(generation.status()===503) {
      const source=await fixture.admin.rpc('get_consumer_briefcase_presentation_source',{p_consumer_auth_user_id:session.participant_user_id,p_briefcase_item_id:matterId});
      const row=Array.isArray(source.data)?source.data[0]:source.data;
      const h=createHash('sha256').update(`rcap:consumer-matter:v1:${matterId}`).digest('hex');
      const expected=`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${((parseInt(h[16],16)&3)|8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;
      const funding=await fixture.admin.rpc('rcap_program_packet_scope_authorized',{p_slug:fixture.program,p_jurisdiction:'MS'});
      delivery.diagnostic={sourceErrorCode:source.error?.code??null,sourcePresent:!!row,product:row?.product??null,
        benefitActive:row?.partner_benefit_active??null,programMatches:row?.partner_slug===fixture.program,
        ownerMatches:row?.claimed_user_id===session.participant_user_id,matterMatches:row?.matter_id===expected,
        sourceIdentityPresent:typeof row?.source_identity==='string',packetScope:funding.data??null,fundingErrorCode:funding.error?.code??null};
    }
    delivery.generationHttp=generation.status();delivery.packetStatus=generated.packetStatus??null;
    delivery.refusal=generated.resultCode??generated.denialCode??generated.outcome??null;
    // Read the same participant-facing status used by the application. A
    // sponsored job exposes its real RCAP download path, not a DTC grant URL.
    const deadline=Date.now()+60000;
    let statusBody,statusResponse;
    do {
      statusResponse=await context.request.get(`/api/expungement-ai/packet/status?briefcaseItemId=${matterId}`,{maxRedirects:0});
      delivery.statusHttp=statusResponse.status();
      // Preserve denial testing after a refusal; only the adopted public fulfillment refusal is an answered status.
      if(statusResponse.status()!==200){statusBody=await statusResponse.json().catch(()=>null);delivery.status='OWNER_STATUS_REQUEST_FAILED';break;}
      statusBody=await statusResponse.json();
      if(!shouldAwaitArtifactStatus({generationHttp:generation.status(),generationPacketStatus:generated.packetStatus,
        status:statusBody,deadlineExpired:Date.now()>=deadline}))break;
      await new Promise(resolve=>setTimeout(resolve,1000));
    } while(true);
    const answered=ownerPacketStatusAnswered({status:statusResponse.status(),body:statusBody,cacheControl:statusResponse.headers()['cache-control'],
      generationStatus:generation.status(),generationResultCode:generated.resultCode});
    check(`${locale}-owner-packet-status-answers`,answered,{http:statusResponse.status()});
    if(answered&&statusResponse.status()===403)delivery.status='BLOCKED_FULFILLMENT_NOT_PROVEN';
    if(statusResponse.status()===200){
    delivery.statusHttp=statusResponse.status();delivery.canDownload=statusBody.canDownload===true;
    delivery.finalPacketStatus=statusBody.packetStatus??null;
    if(statusBody.packetStatus==='failed')check(`${locale}-actual-render-completed-without-failure`,false);
    if(statusBody.canDownload){
      assert.equal(typeof statusBody.artifact?.downloadPath,'string','Ready status must expose its actual protected download path');
      artifact=await acceptRealArtifact({fixture,context,matterId,ownerId:session.participant_user_id,
        downloadPath:statusBody.artifact.downloadPath,session,evidence:artifactEvidence,check});
      await artifactDenial({item:{artifact,matterId,actor:{id:session.participant_user_id},context},context:helperContext,id:'staff-owner-artifact-denied',check});
      delivery.status='ARTIFACT_AVAILABLE_ACCEPTANCE_IN_PROGRESS';
    } else delivery.status='BLOCKED_NO_OWNER_ARTIFACT';
    }
  } else delivery.status='BLOCKED_NOT_VERIFIED';
  const download=await helperContext.request.get(`/api/expungement-ai/packet/download-link?briefcaseItemId=${matterId}`,{maxRedirects:0});
  check(`${locale}-staff-unavailable-download-link-refused`,download.status()===404&&/no-store/.test(download.headers()['cache-control']??''));
  await page.goto(`/clinic/${(await fixture.admin.from('clinic_events').select('public_slug').eq('id',session.event_id).single()).data.public_slug}/screening/ms`,{waitUntil:'networkidle'});
  return {matterId,api,artifact};
}
