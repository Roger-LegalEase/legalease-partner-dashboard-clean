import fs from 'node:fs';
const file='scripts/build-census-v1-ut_pet_acquittal-set.mjs',code=fs.readFileSync(file,'utf8');
const start=code.indexOf('function isCourtTypeElection('),end=code.indexOf('function specialSelectionFact(');
const selected=new Function('round',code.slice(start,end)+';return selectedControl;')((n)=>Number(n.toFixed(2)));
const root='data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill';
const map=JSON.parse(fs.readFileSync(`${root}/production-field-map.json`));const petition=map.maps.find(x=>x.formNumber==='1001EX');
const tests=[];
const validFacts={'participant.self_represented':true,'matter.no_conviction_case_filed':true,'matter.no_conviction_disposition':'dismissed_with_prejudice',...Object.fromEntries(['waiting_period_elapsed','no_new_arrest_since_certificate','not_on_probation_or_parole','no_active_protective_or_stalking_order','no_disqualifying_conviction','no_pending_nontraffic_proceeding','no_pending_nontraffic_plea_in_abeyance','not_incarcerated_or_supervised','conviction_count_below_limits','all_obligations_paid'].map(k=>['matter.'+k,true]))};
for(const fixture of ['canonical','boundary']){
 const branch=fixture==='canonical'?'without_conviction':'with_conviction';
 for(const control of petition.selectionControls.filter(c=>c.selectedInFixtures?.includes(fixture)&&c.selectionId!=='p1-printed_bracket_pair-x126-y525.01'&&c.factId!=='matter.special_certificate_branch')){
  const actualFactId=control.selectionId==='p2-printed_bracket_pair-x453.6-y181.3'?'matter.not_incarcerated_or_supervised':control.factId;
  const facts={...validFacts,'matter.special_certificate_branch':branch,[actualFactId]:false};
  const result=selected(structuredClone(control),'1001EX',{specialCertificate:true,courtTypeElectionNotHeld:true,recordedFacts:facts});
  tests.push({fixture,selectionId:control.selectionId,sourceLabel:control.label,factId:actualFactId,reportedFactId:control.factId,probeFactValue:false,actualSelected:result,expectedSelected:false,contractMet:!result});
 }
}
for(const disposition of ['acquitted','unfiled']){
 const facts={...validFacts,'matter.special_certificate_branch':'without_conviction','matter.no_conviction_disposition':disposition==='acquitted'?'acquitted':null,'matter.no_conviction_case_filed':disposition!=='unfiled'};
 const selectedIds=petition.selectionControls.filter(c=>selected(structuredClone(c),'1001EX',{specialCertificate:true,courtTypeElectionNotHeld:true,recordedFacts:facts})).map(c=>({id:c.selectionId,label:c.label}));
 tests.push({id:`alternative-${disposition}`,facts,selectedIds,contractMet:selectedIds.some(c=>disposition==='acquitted'?/acquitted/i.test(c.label):/was not filed/i.test(c.label)),basis:'The same fixed filed-case and dismissed-with-prejudice selections persist; the alternate source-supported disposition is not honored.'});
}
const out={familyId:'ut_pet_special_certificate-set',sourceFile:file,method:'Evaluated exact unchanged pure selectedControl and its two helper declarations read from the production finalizer; no builder, PDF, filesystem mutation, or renderer called by those functions.',tests,probeCount:tests.length,contractFailures:tests.filter(t=>!t.contractMet).length};
fs.writeFileSync('data/rcap-grade-a/packet-factory-24h/vf62/ut-special-final-20260911/source-election-probes.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({probeCount:tests.length,contractFailures:out.contractFailures,probedFactIds:[...new Set(tests.map(t=>t.factId).filter(Boolean))]}));
