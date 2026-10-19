import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 guard:['jurisdiction === "HI" && pathway.id === "dui-under-21-conviction"','false'],
 own_rule:['!compiledRouteRuleMatchesPathway(route.rule, pathway)','true'],
 citation:['"dui_pathway_context", "The Hawaii DUI-under-21 pathway was selected for this packet decision.", pathway.sourceRef','"dui_pathway_context", "The Hawaii DUI-under-21 pathway was selected for this packet decision.", route.rule.sourceRef']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`import {writeSync} from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/rcap-engine/evaluator.ts')){const [a,b,name]=d;if(!r.source.includes(a))throw Error('mutation target absent');writeSync(2,JSON.stringify({appliedMutation:name})+'\\n');return {...r,source:r.source.replace(a,b)}}return r}`),{data:[...mutations[mutation],mutation]});}
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {contactRepresentationHash:hash}=await import('../src/lib/expungement-ai/contact-representation.ts');
const {safeUserFacingEngineText}=await import('../src/lib/expungement-ai/missing-fields.ts');
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
// Declared reason-only successor for GA17 Q-4c4d60127b04b08d3f41 / GA12 Q-4b42a49baff24e9dcae6.
// Original reasons remain below; every captured semantic/draft hash must remain unchanged.
const successor={"code": "hi.dui_pathway_context", "text": "The Hawaii DUI-under-21 pathway was selected for this packet decision.", "sourceRef": "manual_source_conversion:HI"};
const cases=[
  {
    "name": "public",
    "route": "dui-under-21-conviction",
    "delta": {
      "hi_court_order_confirmed": "Yes"
    },
    "change": true,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.compiled_rule_match.rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first",
        "text": "Compiled source rule rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first matches DUI under age 21 conviction expungement.",
        "sourceRef": "manual_source_conversion:HI:first-time-drug-conviction"
      }
    ],
    "semanticHash": "154ae927ea01ee077b007b687170a1c31f4df02ec5b2b94dd476fb553309507f",
    "draftHash": "86cbe3ca2d874c91b82d355a1aa87fc4726369f28877ca706052efb4308b2abe"
  },
  {
    "name": "adopted",
    "route": "dui-under-21-conviction",
    "delta": {
      "case_outcome": "Misdemeanor conviction",
      "age_at_offense": 20,
      "hi_court_order_confirmed": "Yes"
    },
    "change": true,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.compiled_rule_match.rule-01-a-written-hcjdc-application-may-cover-qualifying-arrest",
        "text": "Compiled source rule rule-01-a-written-hcjdc-application-may-cover-qualifying-arrest matches DUI under age 21 conviction expungement.",
        "sourceRef": "manual_source_conversion:HI:nonconviction-arrest-expungement"
      }
    ],
    "semanticHash": "9f3ee42a86135589597bc319518781ca50da3b34f2123aca692e624abd697dad",
    "draftHash": "fbb0c7a9d73e10c4e587d2d4edd352cb8642637279118ad8d6f07045a6b6c6dd"
  },
  {
    "name": "own_rule",
    "route": "dui-under-21-conviction",
    "delta": {
      "case_outcome": "Misdemeanor conviction",
      "age_at_offense": 20,
      "court": "Synthetic district court",
      "hi_court_order_confirmed": "Yes"
    },
    "change": false,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.compiled_rule_match.route-dui-under-21-conviction",
        "text": "Compiled source rule route-dui-under-21-conviction matches DUI under age 21 conviction expungement.",
        "sourceRef": "manual_source_conversion:HI"
      }
    ],
    "semanticHash": "c8ac6ab6fa34afdee144d1d5c74691948c6c653641db9d4a5a6b6630c844efa2",
    "draftHash": "ad083785e2eee6bb19b40f646ba3aa4b16fcfac61e6302c8c7d6a971fb05b7cd"
  },
  {
    "name": "juvenile_foreign",
    "route": "dui-under-21-conviction",
    "delta": {
      "case_outcome": "Juvenile adjudication or offense committed as a minor",
      "age_at_offense": 20,
      "hi_court_order_confirmed": "Yes"
    },
    "change": true,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.compiled_rule_match.rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first",
        "text": "Compiled source rule rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first matches DUI under age 21 conviction expungement.",
        "sourceRef": "manual_source_conversion:HI:first-time-drug-conviction"
      }
    ],
    "semanticHash": "7f879f3e400985e9c17df04ffb99370fba2d0f65a0ce4252ad25588867ade5f6",
    "draftHash": "5c593ab73f30ab086d6217a5d261356584c5bfa2535c934a9297b26a362b5f14",
    "matterName": "own_source_rule"
  },
  {
    "name": "no_order",
    "route": "dui-under-21-conviction",
    "delta": {
      "case_outcome": "Misdemeanor conviction",
      "age_at_offense": 20,
      "hi_court_order_confirmed": "No"
    },
    "change": false,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.hi_court_order_not_confirmed_not_eligible",
        "text": "The Hawaii HCJDC conviction-expungement application cannot be assembled without a Court Order Granting Expungement to attach. Obtain that order from the sentencing court first; this is guidance only until the order exists.",
        "sourceRef": "manual_source_conversion:HI"
      }
    ],
    "semanticHash": "f58a140d7bad2eb267a27ef0d4ea65bf2a138ef871734922f2126cddc8b5968e",
    "draftHash": "b5a64830f6c89fb49184331ad7949d6c0756c6815cc3e1d936117bfd3d7ed384"
  },
  {
    "name": "unknown_order",
    "route": "dui-under-21-conviction",
    "delta": {
      "case_outcome": "Misdemeanor conviction",
      "age_at_offense": 20,
      "hi_court_order_confirmed": "I am not sure"
    },
    "change": false,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.source_fact_unknown",
        "text": "hi_court_order_confirmed is uncertain and requires source review."
      }
    ],
    "semanticHash": "8b9c05c1ab0f6457bd739f928cb3b4cce0ec5bd13ffdd71d75c80a6bfafe6ecb",
    "draftHash": "cdfc230f7820a828d029e4a5a5c23000dccb6228bc106a5b683d45159eee4a39"
  },
  {
    "name": "missing_order",
    "route": "dui-under-21-conviction",
    "delta": {
      "case_outcome": "Misdemeanor conviction",
      "age_at_offense": 20,
      "hi_court_order_confirmed": null
    },
    "change": false,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.hi_court_order_confirmation_missing",
        "text": "The Hawaii HCJDC conviction-expungement application requires an attached Court Order Granting Expungement; confirm whether you already have that order before an application packet can open.",
        "sourceRef": "manual_source_conversion:HI"
      }
    ],
    "semanticHash": "25c46e5718421f3f6474d29a27e9c92a26af28628d185b158ad7d5d961448ffe",
    "draftHash": "ec5dbabea31b13becd76813ad36d499f3dabdf94cf95fef0fca62eff9af85de0"
  },
  {
    "name": "drug_sibling",
    "route": "first-time-drug-conviction",
    "delta": {
      "hi_court_order_confirmed": "Yes"
    },
    "change": false,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.compiled_rule_match.rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first",
        "text": "Compiled source rule rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first matches First-time drug-offender conviction expungement.",
        "sourceRef": "manual_source_conversion:HI:first-time-drug-conviction"
      }
    ],
    "semanticHash": "a0e5116f314c070b8a77a59881521473d4caf371ec628321ac894397aa6a4f07",
    "draftHash": "06d1a521651842997bde3fc814f95796840992473e2f5d90b883c1894beb06e1"
  },
  {
    "name": "nonconviction_sibling",
    "route": "nonconviction-arrest-expungement",
    "delta": {},
    "change": false,
    "profileVersion": "2026-06-19-source-conversion-1",
    "reason": [
      {
        "code": "hi.compiled_rule_match.rule-04-a-complete-application-valid-government-photo-id-paymen",
        "text": "Compiled source rule rule-04-a-complete-application-valid-government-photo-id-paymen matches Non-conviction arrest-information expungement under HRS \u00a7 831-3.2.",
        "sourceRef": "manual_source_conversion:HI:nonconviction-arrest-expungement"
      }
    ],
    "semanticHash": "4bd900537912603808c39650708a06d27ea985388a1f0eb963751a2dba19f9f4",
    "draftHash": "3edb41f3f309e3806241864e725542e9c02604d7520c291184bd69d9abff692f"
  }
];

let checks=0,failures=0;
for(const c of cases){
 const w=fixtures.find(f=>f.pathwayKey==='HI:'+c.route);assert(w);
 const answers={...w.answers,...c.delta},before=structuredClone(answers);
 const a=evaluate({jurisdiction:'HI',profileVersion:c.profileVersion,matterId:'synthetic-hi-citation-'+(c.matterName??c.name),answers});
 const {reasons,...rest}=a.evaluation;
 assert.equal(hash(rest),c.semanticHash,c.name+': outcome/payment/gates/plan unchanged');checks++;
 assert.deepEqual(answers,before);checks++;
 try{assert.deepEqual(reasons,c.change?[successor]:c.reason,c.name+': exact declared reason successor');checks++;}
 catch(error){if(!process.argv.includes('--regression-only'))throw error;failures++;console.error(JSON.stringify({name:c.name,wrongReason:reasons[0],error:error.message}));}
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-19T00:00:00Z'});
 assert.equal(seed?.hash??null,c.draftHash,c.name+': captured predecessor draft hash unchanged');checks++;
 if(process.argv.includes('--regression-only'))continue;
 if(c.change)for(const locale of ['en','es']){assert.equal(safeUserFacingEngineText(reasons[0].text,{locale}),safeUserFacingEngineText(c.reason[0].text,{locale}));checks++;}
 if(seed)for(const raw of [['Arrest or charge','Court case','Conviction'],{unknown:true,value:'Court case'}]){
  const snapshot=structuredClone(seed.snapshot);snapshot.packetAnswers.record_type=structuredClone(raw);snapshot.packetAnswers.offense_category={unknown:true,value:'Saved literal category'};
  const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)},saved=structuredClone(record);
  const next=P.evaluateProtectedPacketFacts(snapshot).evaluation;assert.equal(next.resultCode,a.evaluation.resultCode);assert.equal(next.paymentAllowed,a.evaluation.paymentAllowed);assert.deepEqual(next.reasons,reasons);checks++;
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);assert.deepEqual(record,saved);checks++;
 }
}
if(process.argv.includes('--regression-only')){console.log(JSON.stringify({checks,failures}));process.exitCode=failures?1:0;}
else console.log(JSON.stringify({status:'PASS_HI_DUI_REASON_SUCCESSOR',checks,cases:cases.length,changed:cases.filter(c=>c.change).map(c=>c.name),scope:'Reason only; unchanged captured semantic and draft hashes, no-op saved history and existing EN/ES sanitizer. No delivery or hosted authority proof.'}));
