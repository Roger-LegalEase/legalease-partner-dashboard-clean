import {requireOriginalResponse} from './rcap-clinic-original-response.mjs';
import assert from 'node:assert/strict';

// Existing synthetic facts only. The application's progress response chooses which questions appear.
export const MISSISSIPPI_SCREENING_CHOICES=Object.freeze([
 {id:'ownership_scope',prompt:'Are you asking about your own record?',option:'Yes'},
 {id:'jurisdiction_scope',prompt:'Did this case happen in Mississippi (not a federal case)?',option:'State or local'},
 {id:'case_outcome',prompt:'How did the case end?',option:'The case was dropped or thrown out'},
 {id:'offense_level',prompt:'What kind of charge was it?',option:'Misdemeanor'},
 {id:'possible_pathway_context',prompt:'Do any of these sound like your situation?',option:'Non-conviction expungement for dismissal, no disposition, or acquittal'},
 // No program-order fact exists in the accepted fixture; preserve absence through the normal optional UI.
 {id:'ms_program_order',prompt:"Which program is named in this case's order or written admission request?",leaveUnanswered:true},
 {id:'resolved_timing_bucket',prompt:'About how long ago did this case end or get resolved?',option:'More than 10 years ago'},
 {id:'court_requirements_completed',prompt:'Have you completed everything the court ordered in this case?',option:'Yes'}
]);
const escape=RegExp.escape;
const heading=(page,prompt)=>page.getByRole('heading',{name:new RegExp(`^${escape(prompt)}(?:\\s*Optional)?$`,'i')});
export const saveScreeningResultButton=page=>page.getByRole('button',{name:'Save my result and continue',exact:true});
export const mississippiResultHeading=page=>page.getByRole('heading',{name:/path may be available|You may be able to prepare an expungement packet/i});

export async function answerMississippiChoice(page,choice) {
 await heading(page,choice.prompt).waitFor({state:'visible'});
 let controls=page;
 if(choice.id==='possible_pathway_context') {
  controls=page.locator('[data-optional-pathway-help]');
  await controls.waitFor({state:'visible'});
  const toggle=controls.getByRole('button',{name:/^(Show|Hide) optional help$/});
  const expanded=await toggle.getAttribute('aria-expanded');
  assert.ok(expanded==='true'||expanded==='false','Optional help expansion state is unreadable');
  if(expanded==='false')await controls.getByRole('button',{name:'Show optional help',exact:true}).click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'true','Optional help did not open');
  const search=controls.getByRole('searchbox',{name:'Find an option',exact:true});
  if(await search.inputValue())await search.fill('');
 }
 // The exact visible option label is stable even when helper-copy layout changes spacing.
 if(choice.leaveUnanswered) {
  assert.equal(choice.id,'ms_program_order','Only the reviewed optional omission is permitted');
  assert.match(await heading(page,choice.prompt).innerText(),/Optional$/,'Program-order omission requires the actual optional UI');
  assert.equal(await page.getByRole('radio',{checked:true}).count(),0,'Do not erase or overwrite an existing program-order answer');
 } else await controls.locator('label').filter({has:page.getByText(choice.option,{exact:true})}).getByRole('radio').check();
 await page.getByRole('button',{name:/^Continue(?:\s|$)/}).click();
}

const publicScreeningCopy=[...MISSISSIPPI_SCREENING_CHOICES.map(q=>q.prompt),
  'Something went wrong loading these questions.',
  "We could not load this state's screening questions correctly, so we stopped rather than show you something unreliable. Please try again in a moment.",
  'We could not load the next question. Your answers are still here; try continuing again.',
  'LegalEase Partner Dashboard','Expungement.ai | Free guided record-clearing check'];
const publicText=text=>{if(text==='')return [''];const found=publicScreeningCopy.filter(copy=>text.includes(copy));return found.length?found:['unrecognized text redacted'];};
export async function screeningAlertDetails(page) {
 const details=[];
 for(const alert of await page.getByRole('alert').all()) {
  if(!await alert.isVisible())continue;
  const framework=await alert.evaluate(node=>{
   const root=node.getRootNode();
   return node.tagName==='DIV'&&node.id==='__next-route-announcer__'&&node.getAttribute('aria-live')==='assertive'
    &&root instanceof ShadowRoot&&root.mode==='open'&&root.host.tagName==='NEXT-ROUTE-ANNOUNCER';
  });
  details.push({source:framework?'next_route_announcer':'application',visible:true,text:publicText(await alert.innerText())});
 }
 return details;
}
export async function screeningFailureDiagnostics(page,{observations=[],stages=[]}={}) {
 const alertDetails=await screeningAlertDetails(page);
 const headings=await page.locator('h1:visible,h2:visible,h3:visible').allInnerTexts().catch(()=>[]);
 const path=new URL(page.url()).pathname;
 const pathname=['/','/clinic/local-screening-fixture/screening/ms','/clinic/mississippi-volunteer-lawyers-demo/screening/ms','/expungement-ai/screening/ms'].includes(path)?path:/^\/briefcase\/matters\/[a-f0-9-]{36}$/.test(path)?'/briefcase/matters/[matter-id]':'[unrecognized_path]';
 return {pathname,alerts:alertDetails.filter(a=>a.source==='application').map(a=>a.text),alertDetails,headings:headings.map(publicText),
  apiObservations:observations.filter(o=>['profile','progress','evaluation','completion','pending','claim'].includes(o.operation)).slice(-10),
  apiStages:stages.filter(o=>['profile','progress','evaluation','completion','pending','claim'].includes(o.operation)).slice(-10)};
}

export async function runMississippiScreening(page,diagnostics={}) {
 const origin=new URL(page.url()).origin,remaining=new Map(MISSISSIPPI_SCREENING_CHOICES.map(q=>[q.id,q]));
 const answeredQuestionIds=[],omittedQuestionIds=[],evaluationStatuses=[],evaluations=[],resultHeading=mississippiResultHeading(page);
 const observe=response=>{
  const url=new URL(response.url());
  if(url.origin===origin&&url.pathname==='/api/expungement-ai/evaluate'&&response.request().method()==='POST'){evaluationStatuses.push(response.status());evaluations.push(response);}
 };
 page.on('response',observe);
 try {
  // Register evaluation observation before the first answer: conditional omission can finish early.
  for(let step=0;step<=MISSISSIPPI_SCREENING_CHOICES.length;step++) {
   const deadline=Date.now()+45000;let shown=null;
   while(Date.now()<deadline) {
    const alerts=await screeningAlertDetails(page);
    assert.deepEqual(alerts.filter(a=>a.source==='application'),[],'Screening application alert; no retry or invented answer');
    if(await resultHeading.isVisible()) {
     assert.ok(evaluationStatuses.length&&evaluationStatuses.at(-1)>=200&&evaluationStatuses.at(-1)<300,'Result requires a successful original evaluation response');
     requireOriginalResponse(evaluations.at(-1),'evaluation');
     return {answeredQuestionIds,omittedQuestionIds,evaluationStatuses};
    }
    for(const choice of remaining.values())if(await heading(page,choice.prompt).isVisible()){shown=choice;break;}
    if(shown)break;
    await page.waitForTimeout(100);
   }
   assert.ok(shown,'No supported remaining question or accepted result appeared');
   remaining.delete(shown.id);await answerMississippiChoice(page,shown);(shown.leaveUnanswered?omittedQuestionIds:answeredQuestionIds).push(shown.id);
  }
  throw new Error('Screening did not reach its result within the bounded fixture sequence');
 }catch(error){
  error.screeningDiagnostics=await screeningFailureDiagnostics(page,diagnostics);
  error.message+=` | ${JSON.stringify(error.screeningDiagnostics)}`;throw error;
 }finally{page.off('response',observe);}
}
