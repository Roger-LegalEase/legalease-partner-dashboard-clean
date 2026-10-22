import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./lib/ts-esm-loader.mjs', import.meta.url);
// Test-only module interception. Production exposes no authority override. The
// real server gates are used until this process explicitly enables simulation.
const root = pathToFileURL(process.cwd() + '/').href;
const loader = `export async function resolve(s,c,n){
 if(c.parentURL?.endsWith('/ga-pardon-petition-readiness.ts')) {
  const k=s==='@/lib/expungement-ai/packet-fulfillment-authority'?'fulfillment':s==='@/lib/legal-authority/resolve-route'?'resolution':null;
  if(k){const name=k==='fulfillment'?'packetFulfillmentAuthority':'resolveRoute';const file=k==='fulfillment'?'src/lib/expungement-ai/packet-fulfillment-authority.ts':'src/lib/legal-authority/resolve-route.ts';
   return {url:'data:text/javascript,'+encodeURIComponent('import { '+name+' as real } from '+JSON.stringify(${JSON.stringify(root)}+file)+'; export function '+name+'(...args){ const control=globalThis.__gaReadinessTest; if(control?.["'+k+'"]) return control["'+k+'"](real,...args); return real(...args); }'),shortCircuit:true};}
 } return n(s,c);
}`;
register('data:text/javascript,' + encodeURIComponent(loader), import.meta.url);
const G = await import('../src/lib/rcap-engine/georgia-pardon-facts.ts');
const { georgiaPardonPetitionPlan } = await import('../src/lib/expungement-ai/ga-pardon-petition-readiness.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { default: registry } = await import('../data/record-clearing/legal-decisions/route-ratification-registry.json');
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/conviction-fallback-predecessors.json', import.meta.url))).rows.find(r => r.id.startsWith('GA') && r.id.endsWith('/omitted'));
const profile = getProfileByJurisdiction('GA'), today = new Date('2026-10-14T00:00:00Z');
const base = { ...fixture.answers, case_outcome: 'Misdemeanor conviction', ga_record_help: 'pardon_record', pardon_status: 'Yes', ga_board_pardon: 'yes', ga_pardon_date: '2021-01-02', ga_pardoned_offense_section: '16-8-14(a)', ga_convictions_since_pardon: 'none', ga_pardon_pending_charges: 'no', pending_cases: 'No' };
const routeKey = `GA:${G.GA_PARDON_ROUTE}`;
const entry = registry.routes.find(r => r.routeKey === routeKey), originalStatus = entry.status;
const authorityPaths = ['data/record-clearing/legal-decisions/route-ratification-registry.json','data/rcap-grade-a/fulfillment-observation-snapshot.json','data/rcap-grade-a/fulfillment-authority-registry.json'];
const hashes = () => authorityPaths.map(p => [p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]);
const beforeHashes = hashes(); let checks = 0;
const check = (name, condition) => {assert.ok(condition,name); checks++;};
const same = (name,a,b) => {assert.deepEqual(a,b,name);checks++;};
const plan = (a = base, p = profile, date = today) => georgiaPardonPetitionPlan(p,a,date);
const evaluate = a => evaluateScreening({jurisdiction:'GA',profileVersion:profile.profileVersion,matterId:'synthetic-ga02-petition',answers:a});
const current = evaluate(base);
check('actual authority preserves needs_review/no plan/no payment',current.resultCode==='needs_review'&&!current.packetPlan&&!current.paymentAllowed);
check('actual authority cannot create petition readiness',plan()===null);
const allowed = (_real,jurisdiction,pathway,surface,binding) => {
 same('server asks exact source track/consumer surface',[jurisdiction,pathway,surface,binding],['GA',G.GA_PARDON_ROUTE,'consumer payment authority',{trackId:'ga-pardon-j7'}]);
 return {allowed:true,record:{routeKey}};
};
try {
 globalThis.__gaReadinessTest = {fulfillment:allowed};
 check('adopted GA02 implementation succeeds exact legacy named-gate projection only with output authority',plan()?.pathwayId===G.GA_PARDON_ROUTE);
 const originalEntry=structuredClone(entry);
 for(const [key,value] of Object.entries(originalEntry)){
  if(key==='routeKey') continue;
  entry[key]=typeof value==='boolean'?!value:value===null?'changed':String(value)+' changed';
  check('changed original legacy gate refuses '+key,plan()===null);
  Object.assign(entry,originalEntry);
 }
 entry.extraUnreviewedCondition='new'; check('new legacy condition refuses',plan()===null);delete entry.extraUnreviewedCondition;
 registry.routes.push(structuredClone(entry));check('duplicate authority row refuses',plan()===null);registry.routes.pop();
 for(const status of ['held','withdrawn','corrected_awaiting_reconfirm']){entry.status=status;check(status+' refuses',plan()===null);}entry.status=originalStatus;
 entry.status='ratified_deployable'; // In-memory hypothetical future authority, never an approval artifact.
 delete globalThis.__gaReadinessTest.fulfillment;
 check('ratification alone never bypasses genuine NO_RECORD',plan()===null);
 globalThis.__gaReadinessTest.fulfillment=allowed;
 const contradictory={...base,case_outcome:'Felony conviction'},contradictorySaved=structuredClone(contradictory);
 const contradictoryResult=evaluate(contradictory);
 check('contradictory felony/misdemeanor stays unpaid despite simulated authority',contradictoryResult.resultCode==='packet_ready_with_caution'&&!contradictoryResult.paymentAllowed&&contradictoryResult.packetPlan?.pathwayId===G.GA_PARDON_ROUTE);
 same('contradictory raw facts retained',contradictory,contradictorySaved);
 const qualifying = [
  ['misdemeanor',base],
  ['felony',{...base,case_outcome:'Felony conviction',offense_level:'Felony'}],
  ['nonserious traffic',{...base,ga_convictions_since_pardon:'traffic_only',ga_post_pardon_traffic_jurisdictions:'all_georgia',ga_post_pardon_traffic_citations:'40-6-181(a)',ga_post_pardon_traffic_records:'Saved speeding conviction'}],
  ['historical route label',Object.fromEntries(Object.entries({...base,possible_pathway_context:G.GA_PARDON_OLD_LABEL}).filter(([key])=>key!=='ga_record_help'))],
  ['source misdemeanor exception',{...base,ga_pardoned_offense_section:'16-6-4(b)(2)'}]
 ];
 for(const [name,a] of qualifying){
  const saved=structuredClone(a), r=evaluate(a), d=G.georgiaPardonFacts(a,'2026-10-14');
  check(name+' reaches source plan with caution only',r.resultCode==='packet_ready_with_caution'&&r.paymentAllowed&&r.packetPlan?.pathwayId===G.GA_PARDON_ROUTE);
  check(name+' retains discretionary court merits warning',r.reasons.some(x=>x.text===G.GA_PARDON_COPY[d.code][0]));
  same(name+' preserves raw facts',a,saved);
 }
 for(const id of ['pending_cases','case_outcome']) for(const value of ['unknown','I am not sure','',null,undefined,[],[base[id]],{}, {value:base[id],unknown:false}, {value:base[id],unknown:true},7]) {
  const a={...base,[id]:value},saved=structuredClone(a),r=evaluate(a);
  check(id+' malformed/uncertain '+JSON.stringify(value),plan(a)===null&&!r.paymentAllowed&&r.packetPlan?.pathwayId!==G.GA_PARDON_ROUTE&&!r.resultCode.startsWith('packet_ready'));
  same(id+' malformed raw retained',a,saved);
 }
 const refusing = [
  ['generic historical pardon',{...base,ga_board_pardon:undefined}],
  ['unknown Board pardon',{...base,ga_board_pardon:'unknown'}],
  ['no Board pardon',{...base,ga_board_pardon:'no'}],
  ['future pardon',{...base,ga_pardon_date:'2099-01-01'}],
  ['ambiguous citation',{...base,ga_pardoned_offense_section:'theft'}],
  ['excluded murder',{...base,case_outcome:'Felony conviction',ga_pardoned_offense_section:'16-5-1(a)'}],
  ['conflicting class',{...base,ga_pardoned_offense_section:'16-5-1(a)'}],
  ['later conviction',{...base,ga_convictions_since_pardon:'other'}],
  ['pending charge',{...base,ga_pardon_pending_charges:'yes'}],
  ['conflicting pending history',{...base,pending_cases:'Yes'}],
  ['traffic jurisdiction uncertain',{...base,ga_convictions_since_pardon:'traffic_only',ga_post_pardon_traffic_jurisdictions:'unknown',ga_post_pardon_traffic_citations:'40-6-181(a)',ga_post_pardon_traffic_records:'Saved record'}],
  ['serious traffic',{...base,ga_convictions_since_pardon:'traffic_only',ga_post_pardon_traffic_jurisdictions:'all_georgia',ga_post_pardon_traffic_citations:'40-6-391(a)',ga_post_pardon_traffic_records:'Saved record'}],
  ['historical classification',{...base,case_outcome:'Pardoned conviction'}],
  ['unresolved punishment exception',{...base,ga_pardoned_offense_section:'16-6-5.1(g)(2)'}],
 ];
 for(const [name,a] of refusing){const saved=structuredClone(a),r=evaluate(a);check(name+' refuses despite simulated authority',plan(a)===null&&!r.paymentAllowed&&!r.packetPlan&&!r.resultCode.startsWith('packet_ready'));same(name+' raw retained',a,saved);}
 for(const [name,mutate] of [
  ['wrong state',p=>p.jurisdiction.code='AL'],['wrong version',p=>p.profileVersion='unreviewed'],['wrong source',p=>p.source.sourceCorpusSha256='0'.repeat(64)],['missing source plan',p=>p.packetGenerator.pathways=[]]
 ]){const p=structuredClone(profile);mutate(p);check(name,plan(base,p)===null);}
 check('invalid evaluation date',plan(base,profile,new Date(NaN))===null);
 for(const [name,mutate] of [
  ['wrong route',r=>r.routeKey='GA:sibling'],['wrong contract',r=>r.contract.routeKey='GA:sibling'],['guidance',r=>r.serviceDisposition='process_guidance'],['no filing',r=>r.outcomeMode='automatic_relief'],['closed payment',r=>r.paymentAuthority='closed'],['closed generation',r=>r.generationAuthority='closed'],['unresolved law',r=>r.delivery.legallyResolved=false],['held delivery',r=>r.delivery.commerciallyDeliverable=false],['held artifact',r=>r.delivery.paymentAllowed=false],['unavailable generator',r=>r.delivery.generationAllowed=false],['missing fact',r=>r.missingFacts=['actual_required_fact']],['foreign fact',r=>r.rejectedFacts=[{factId:'actual',reason:'wrong owner'}]],['unsatisfied precondition',r=>r.unsatisfiedPreconditions=[{}]],['later-phase precondition',r=>r.notYetApplicablePreconditions=[{}]],['failure disposition',r=>r.selectedFailureDisposition={}]
 ]) {globalThis.__gaReadinessTest.resolution=(real,input)=>{const r=structuredClone(real(input));mutate(r);return r;};check(name+' remains closed',plan()===null);}
 delete globalThis.__gaReadinessTest.resolution;
 globalThis.__gaReadinessTest.fulfillment=()=>({allowed:true,record:{routeKey:'GA:sibling'}});
 check('wrong fulfilled route refused',plan()===null);
} finally { entry.status=originalStatus; delete globalThis.__gaReadinessTest; }
same('actual current held result exactly restored',evaluate(base),current);
same('no authority file changed',hashes(),beforeHashes);
console.log(JSON.stringify({status:'PASS',checks,scope:'GA02 petition readiness with hypothetical in-memory authority; actual NO_RECORD remains held; no generation, delivery or approval claimed'}));
