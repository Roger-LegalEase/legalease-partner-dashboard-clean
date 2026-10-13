import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const G = await import('../src/lib/rcap-engine/georgia-pardon-facts.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { pathwayFromContext } = await import('../src/lib/rcap-engine/pathway-context.ts');
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { parseJurisdictionProfile } = await import('../src/lib/expungement-ai/frontend/schemas.ts');
const { packetDisplayCopy } = await import('../src/lib/expungement-ai/packet-display-copy.ts');
const { reviewedResultRouteLabel } = await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const { resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { sanitizeAnswersForQuestionIds, sanitizeResumedAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const { getStateLandingDataByCode } = await import('../src/lib/expungement-ai/state-landing/state-landing-data.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/conviction-fallback-predecessors.json', import.meta.url))).rows.find(r => r.id.startsWith('GA') && r.id.endsWith('/omitted'));
const p = getProfileByJurisdiction('GA'), pub = projectPublicProfile(p), parsed = parseJurisdictionProfile(pub);
const checks = []; const check = (id, pass) => checks.push({id,pass:!!pass});
const same = (a,b) => {try {assert.deepEqual(a,b);return true;} catch {return false;}};
const base = {...fixture.answers, case_outcome:'Misdemeanor conviction', ga_record_help:'pardon_record', pardon_status:'Yes'};
const complete = {...base, ga_board_pardon:'yes', ga_pardon_date:'2021-01-02', ga_pardoned_offense_section:'16-8-14(a)', ga_convictions_since_pardon:'none', ga_pardon_pending_charges:'no', pending_cases:'No'};
const evaluate = answers => evaluateScreening({jurisdiction:'GA',profileVersion:p.profileVersion,matterId:'synthetic-ga02-facts',answers});
check('strict-profile',parsed.ok);
check('neutral-canonical-label',p.pathways.find(q=>q.id===G.GA_PARDON_ROUTE).label===G.GA_PARDON_LABEL.en);
check('neutral-landing-label',getStateLandingDataByCode('GA').pathwayHighlights.includes(G.GA_PARDON_LABEL.en));
check('preserve-alabama-label',getStateLandingDataByCode('AL').pathwayHighlights.includes('Pardoned felony expungement under Ala. Code § 15-27-2(c)'));
for(const context of [G.GA_PARDON_OLD_LABEL.toLowerCase(),`  ${G.GA_PARDON_OLD_LABEL}  `]) {
 const a={...base,ga_board_pardon:'yes',possible_pathway_context:context};delete a.ga_record_help;
 const r=evaluate(a);
 check('legacy-context-required-facts/'+context,r.resultCode==='needs_more_info'&&same(r.missingQuestionIds,['ga_pardon_date','ga_pardoned_offense_section','ga_convictions_since_pardon','ga_pardon_pending_charges']));
}
for(const outcome of ['Pardoned conviction','Other conviction or adjudication','Dismissed',undefined]) {
 const a={...complete,case_outcome:outcome,possible_pathway_context:G.GA_PARDON_OLD_LABEL};delete a.ga_record_help;
 const r=evaluate(a);
 check('legacy-final-class/'+String(outcome),r.resultCode==='needs_more_info'&&r.missingQuestionIds.includes('case_outcome')&&!r.paymentAllowed&&!r.packetPlan);
}
for(const label of [G.GA_PARDON_ROUTE,G.GA_PARDON_OLD_LABEL,G.GA_PARDON_LABEL.en]) check('saved-context/'+label,pathwayFromContext(p,label)?.id===G.GA_PARDON_ROUTE);
for(const label of [G.GA_PARDON_OLD_LABEL,G.GA_PARDON_LABEL.en]) {
 check('result-label/'+label,same(reviewedResultRouteLabel('GA',G.GA_PARDON_ROUTE,label),G.GA_PARDON_LABEL));
 check('packet-label/'+label,same(packetDisplayCopy('route_label','GA',G.GA_PARDON_ROUTE,label),G.GA_PARDON_LABEL));
 check('not-global-rewrite/'+label,!G.georgiaPardonDisplay('AL',G.GA_PARDON_ROUTE,label));
}
const context=pub.questions.find(q=>q.id==='possible_pathway_context');
check('one-neutral-menu-entry',context.options.filter(v=>[G.GA_PARDON_OLD_LABEL,G.GA_PARDON_LABEL.en].includes(v)).length===1);
for(const value of context.options.filter(v=>[G.GA_PARDON_OLD_LABEL,G.GA_PARDON_LABEL.en].includes(v))) check('neutral-menu/'+value,context.optionDisplay[value].label===G.GA_PARDON_LABEL.en && context.optionDisplay[value].translations.es.label===G.GA_PARDON_LABEL.es);
for(const outcome of ['Misdemeanor conviction','Felony conviction']) {
 const a={...base,case_outcome:outcome},before=structuredClone(a),r=evaluate(a);
 check(outcome+'/specific-pardon',r.pathwayId===G.GA_PARDON_ROUTE && r.resultCode==='needs_more_info' && same(r.missingQuestionIds,['ga_board_pardon']));
 check(outcome+'/kept',same(a,before));check(outcome+'/no-sale',!r.paymentAllowed&&!r.packetPlan);
}
for(const q of G.GA_PARDON_QUESTIONS) {
 const conditional = {ga_pardon_assault_rape_intent:{ga_pardoned_offense_section:'16-5-21(a)(1)'},ga_pardon_imprisonment_under14:{ga_pardoned_offense_section:'16-5-41'},ga_pardon_imprisonment_own_child:{ga_pardoned_offense_section:'16-5-41',ga_pardon_imprisonment_under14:'yes'},ga_pardon_sexual_battery_repeat:{ga_pardoned_offense_section:'16-6-22.1'}}[q.id]??{};
 const a={...complete,...conditional,[q.id]:q.options?.[0]??(q.type==='date_or_unknown'?'2021-01-02':'16-8-14(a)')};
 check(q.id+'/bilingual',pub.questions.some(x=>x.id===q.id&&x.translations?.es?.prompt));
 if(parsed.ok) {
  check(q.id+'/inactive-preserved',same(sanitizeAnswersForQuestionIds(a,pub.questions.map(q=>q.id),[],parsed.data)[q.id],a[q.id]));
  check(q.id+'/reload-preserved',same(sanitizeResumedAnswersForQuestionIds(parsed.data,a,['ga_record_help'])[q.id],a[q.id]));
 }
 check(q.id+'/correction-control',P.factualPathwayCorrectionIds('GA',G.GA_PARDON_ROUTE,a,true).includes(q.id));
 for(const invalid of [undefined,null,{},[],['yes'],true,7,'unknown']) {
  const answers={...complete,...conditional,ga_convictions_since_pardon:q.id==='ga_post_pardon_traffic_records'?'traffic_only':'none',[q.id]:invalid};
  const d=G.georgiaPardonFacts(answers,'2026-10-13');check(q.id+'/invalid/'+JSON.stringify(invalid),d.status==='missing'&&d.ids.includes(q.id));
 }
}
for(const date of ['2026-02-30','2027-01-01','2026-1-1','yesterday']) check('date/'+date,G.georgiaPardonFacts({...complete,ga_pardon_date:date},'2026-10-13').ids.includes('ga_pardon_date'));
for(const [patch,code] of [[{ga_board_pardon:'no'},'no_board_pardon'],[{ga_convictions_since_pardon:'other'},'later_conviction'],[{ga_pardon_pending_charges:'yes',pending_cases:'Yes'},'pending'],[{pending_cases:'Yes'},'conflict']]) check(code,G.georgiaPardonFacts({...complete,...patch},'2026-10-13').code===code);
for(const a of [base,complete,{...complete,ga_convictions_since_pardon:'traffic_only'}]) {
 const r=evaluate(a),ids=selectScreeningQuestionIds(p,pub,a);
 check('visible/'+JSON.stringify(a),r.missingQuestionIds.every(id=>ids.includes(id)));
 check('no-automatic-acceptance/'+JSON.stringify(a),!r.paymentAllowed&&!r.packetPlan&&!r.resultCode.startsWith('packet_ready'));
 check('next-step-specific/'+JSON.stringify(a),same(r.nextSteps,[r.reasons[0].text]));
}
for(const [code,[en,es]] of Object.entries(G.GA_PARDON_COPY)) check(code+'/spanish-reason',resolveRuntimeText('es',en)===es);
for(const [id,section,other] of [
 ['ga_pardon_assault_rape_intent','16-5-21(a)(1)',{}],
 ['ga_pardon_imprisonment_under14','16-5-41',{}],
 ['ga_pardon_imprisonment_own_child','16-5-41',{ga_pardon_imprisonment_under14:'yes'}],
 ['ga_pardon_sexual_battery_repeat','16-6-22.1',{}]
]) {
 const a={...complete,...other,ga_pardoned_offense_section:{value:section,unknown:false}};
 check('protected-wrapper/'+id,G.georgiaPardonQuestionApplies('GA',a,id,G.GA_PARDON_ROUTE));
 check('protected-correction-visible/'+id,P.factualPathwayCorrectionIds('GA',G.GA_PARDON_ROUTE,a,false).includes(id));
 check('explicit-unknown-not-inferred/'+id,!G.georgiaPardonQuestionApplies('GA',{...a,ga_pardoned_offense_section:{value:section,unknown:true}},id,G.GA_PARDON_ROUTE));
}
const offenseCases = [
 ['16-8-14(a)','Misdemeanor conviction',{},'court_review'],
 ['O.C.G.A. § 16-8-14 (a)','Felony conviction',{},'court_review'],
 ['16–8–14(a)','Misdemeanor conviction',{},'court_review'],
 ...['16-5-1','16-8-41','16-5-40','16-6-1','16-6-22.2'].flatMap(section=>[
  [section,'Felony conviction',{},'excluded_offense'],[section,'Misdemeanor conviction',{},'offense_class_conflict']]),
 ['16-5-21(a)(1)','Felony conviction',{ga_pardon_assault_rape_intent:'yes'},'excluded_offense'],
 ['16-5-21(a)(1)','Felony conviction',{ga_pardon_assault_rape_intent:'no'},'court_review'],
 ['16-5-21(a)(1)','Felony conviction',{},'missing'],
 ['16-5-41','Felony conviction',{ga_pardon_imprisonment_under14:'yes',ga_pardon_imprisonment_own_child:'no'},'excluded_offense'],
 ['16-5-41','Felony conviction',{ga_pardon_imprisonment_under14:'yes',ga_pardon_imprisonment_own_child:'yes'},'court_review'],
 ['16-5-41','Felony conviction',{ga_pardon_imprisonment_under14:'no'},'court_review'],
 ['16-6-22.1','Misdemeanor conviction',{ga_pardon_sexual_battery_repeat:'no'},'court_review'],
 ['16-6-22.1','Felony conviction',{ga_pardon_sexual_battery_repeat:'yes'},'excluded_offense'],
 ...['16-6-2','16-6-4(a)','16-6-4(c)','16-6-5'].flatMap(section=>[
  [section,'Felony conviction',{},'excluded_offense'],[section,'Misdemeanor conviction',{},'exception_review']]),
 ...['16-6-2(d)','16-6-4(b)(2)','16-6-4(d)(2)','16-6-5(c)'].flatMap(section=>[
  [section,'Misdemeanor conviction',{},'court_review'],[section,'Felony conviction',{},'offense_class_conflict']]),
 ...['16-6-3','16-6-5.1','16-12-100'].map(section=>[section,'Felony conviction',{},'exception_review']),
 ['16-6-22','Felony conviction',{},'excluded_offense'],
 ['16-6-22','Misdemeanor conviction',{},'offense_class_conflict'],
 ['16-5-21','Misdemeanor conviction',{ga_pardon_assault_rape_intent:'yes'},'offense_class_conflict'],
 ['16-5-41','Misdemeanor conviction',{ga_pardon_imprisonment_under14:'yes',ga_pardon_imprisonment_own_child:'no'},'offense_class_conflict'],
 ['16-6-8','Misdemeanor conviction',{},'court_review'],
 ...['armed robbery','attempt 16-8-41','16-8-41,16-8-14','16-8-41 (not convicted)','18 USC 922','16-8-41 felony'].map(section=>[section,'Felony conviction',{},'citation_review'])
];
for(const [section,case_outcome,extra,expected] of offenseCases) {
 const a={...complete,ga_pardoned_offense_section:section,case_outcome,...extra};const before=structuredClone(a);
 const d=G.georgiaPardonFacts(a,'2026-10-13');const r=evaluate(a);
 const id='offense/'+JSON.stringify([section,case_outcome,extra]);
 check(id+'/expected',d.code===expected);
 check(id+'/preserved',same(a,before));
 check(id+'/visible',r.missingQuestionIds.every(id=>selectScreeningQuestionIds(p,pub,a).includes(id)));
 check(id+'/no-commercial-authority',!r.paymentAllowed&&!r.packetPlan);
 check(id+'/result',r.resultCode===(expected==='excluded_offense'?'likely_not_eligible':expected==='missing'?'needs_more_info':'needs_review'));
}
check('traffic-exception-not-inferred',G.georgiaPardonFacts({...complete,ga_convictions_since_pardon:'traffic_only',ga_post_pardon_traffic_records:'Traffic in another state'},'2026-10-13').code==='record_review');
check('stale-conditional-facts-not-applied',G.georgiaPardonFacts({...complete,ga_pardon_assault_rape_intent:'yes',ga_pardon_sexual_battery_repeat:'yes'},'2026-10-13').code==='court_review');
const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',checks:checks.length,failed:checks.filter(c=>!c.pass),details:checks,limits:['No qualified Spanish acceptance, record-specific exceptions/traffic and document acceptance remain outstanding, no authenticated result asserted by this suite.']};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:report.checks,failed:report.failed},null,2));assert.equal(report.failed.length,0);
