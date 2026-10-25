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

export async function runMississippiScreening(page) {
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
    if(await resultHeading.isVisible()) {
     assert.ok(evaluationStatuses.length&&evaluationStatuses.at(-1)>=200&&evaluationStatuses.at(-1)<300,'Result requires a successful original evaluation response');
     requireOriginalResponse(evaluations.at(-1),'evaluation');
     return {answeredQuestionIds,omittedQuestionIds,evaluationStatuses};
    }
    for(const choice of remaining.values())if(await heading(page,choice.prompt).isVisible()){shown=choice;break;}
    if(shown)break;
    const alert=page.getByRole('alert');
    assert.equal(await alert.first().isVisible(),false,'Screening reported an error; no retry or invented answer');
    await page.waitForTimeout(100);
   }
   assert.ok(shown,'No supported remaining question or accepted result appeared');
   remaining.delete(shown.id);await answerMississippiChoice(page,shown);(shown.leaveUnanswered?omittedQuestionIds:answeredQuestionIds).push(shown.id);
  }
  throw new Error('Screening did not reach its result within the bounded fixture sequence');
 }finally{page.off('response',observe);}
}
