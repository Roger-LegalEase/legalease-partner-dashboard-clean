// F-D1-SAVED: Lead 2026-10-21 22:26:47, four recorded payment-only predecessors.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
process.env.RCAP_EVALUATOR_TODAY = '2026-10-18';
globalThis.fetch = () => { throw Error('NETWORK_FORBIDDEN'); };
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mode = process.argv[2] ?? 'candidate';
assert(['candidate','removed','left_paid','briefcase_removed','allowlist_removed'].includes(mode) || mode.startsWith('remove-route:'));
if (mode.startsWith('remove-route:') || mode === 'allowlist_removed') register('data:text/javascript,'+encodeURIComponent(`let mode;export function initialize(m){mode=m}export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/packet-information.ts'))return r;let s=String(r.source);if(mode==='allowlist_removed'){const a='!PAYMENT_ONLY_DRAFT_ROUTES.has(\`\${snapshot.jurisdiction}:\${snapshot.pathwayId}\`)';if(s.split(a).length!==2)throw Error('nonunique allowlist anchor');s=s.replace(a,'false')}else{const a=s.indexOf('const PAYMENT_ONLY_DRAFT_ROUTES = new Set(['),b=s.indexOf(']);',a);if(a<0||b<a)throw Error('list not found');const list=s.slice(a,b),key=JSON.stringify(mode.slice('remove-route:'.length));if(list.split(key).length!==2)throw Error('nonunique route');s=s.slice(0,a)+list.replace(key,JSON.stringify('test-only-removed-route'))+s.slice(b)}return {...r,source:s};}`),{data:mode});
if (mode === 'briefcase_removed') register('data:text/javascript,'+encodeURIComponent(`export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/briefcase-presentation-authority.ts'))return r;const s=String(r.source),a='paymentOnlyDraftSuccessor(snapshot, authoritative, verification.status) ??';if(s.split(a).length!==2)throw Error('nonunique anchor');return {...r,source:s.replace(a,'')};}`));
if (['removed','left_paid'].includes(mode)) register('data:text/javascript,' + encodeURIComponent(`let mode;export function initialize(m){mode=m}export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/packet-information.ts'))return r;const s=String(r.source),anchor=mode==='removed'?'const paymentOnlyProjection = { ...snapshot, paymentAllowed: false };':'? paymentOnlyProjection : null;';if(s.split(anchor).length!==2)throw Error('nonunique mutation anchor');return {...r,source:s.replace(anchor,mode==='removed'?'return null;':'? snapshot : null;')};}`), {data:mode});
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const B = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {evaluateAuthoritativeScreeningResult} = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const rows = JSON.parse(fs.readFileSync(new URL('./fixtures/payment-only-draft-predecessors.json',import.meta.url))).rows;
let checks = 0; const failures = [];
const check = (name,fn) => {checks++;try {fn();}catch(e){failures.push({name,error:e.message});}};
const patch = record => P.packetInformationPatch({protectedVerification:record,answers:{}});
// O-OD-SAVED exact approved nine-route list; every route also has a native consumer test below.
const expectedRoutes = [
  "FL:court-ordered-expunction-943-0585",
  "HI:dui-under-21-conviction",
  "HI:first-time-drug-conviction",
  "IL:adult-conviction-sealing",
  "LA:non-conviction-arrest-expungement",
  "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8",
  "MN:petition-based-expungement-under-609a-02-03",
  "NE:set-aside-incarceration-one-year-or-less",
  "NM:cannabis-sentence-dismissal-incarcerated-person-pathway"
];
const policySource=fs.readFileSync(new URL('../src/lib/expungement-ai/packet-information.ts',import.meta.url),'utf8');
const listBody=policySource.match(/const PAYMENT_ONLY_DRAFT_ROUTES = new Set\(\[([\s\S]*?)\]\)/)[1];
check('approved-route-set',()=>assert.deepEqual([...listBody.matchAll(/"([^"]+)"/g)].map(m=>m[1]).sort(),expectedRoutes));
check('native-fixture-route-set',()=>assert.deepEqual(rows.map(r=>r.key).sort(),expectedRoutes));
// A fabricated paid bit on an unrelated held draft never qualifies for this allowlist.
const outside=JSON.parse(fs.readFileSync(new URL('./fixtures/il1b-native-predecessors.json',import.meta.url))).rows.find(r=>r.name==='legacy-unknown').verification;
const outsideSnapshot={...outside.draftSnapshot,paymentAllowed:true};
check('unlisted-paid-bit-tamper-refused',()=>assert.equal(P.paymentOnlyDraftSuccessor(outsideSnapshot,P.evaluateProtectedPacketFacts(outsideSnapshot),'unverified'),null));

async function present(record) {
  const s=record.draftSnapshot,item={id:'00000000-0000-4000-8000-000000000037',jurisdiction:s.jurisdiction,createdAt:s.capturedAt,artifactRefs:{}};
  let reevaluatedPayment;
  const presented = await B.decorateBriefcaseItemForPresentationWithDependencies({consumerAuthUserId:item.id,item},{
    readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),
    readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:s.jurisdiction,profileVersion:s.profileVersion,matterId:item.id,answers:P.protectedPacketScreeningAnswers(s),product:'expungement_ai_dtc',sourceSessionId:'synthetic-only',claimedAt:s.capturedAt,partnerBenefitActive:false,partnerSlug:null}}),
    readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:request=>{const a=evaluateAuthoritativeScreeningResult(request);reevaluatedPayment=a.evaluation.paymentAllowed;return a;},
    readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})
  });
  return {...presented,reevaluatedPayment};
}

// Per-route mutants replay the affected native record; candidate still replays all nine.
for (const row of mode.startsWith('remove-route:') ? rows.filter(r=>r.key===mode.slice('remove-route:'.length)) : rows) {
  const record = structuredClone(row.record), before = structuredClone(record), snapshot = record.draftSnapshot;
  check(`${row.key}:recorded-hash`,()=>assert.equal(P.protectedPacketDraftHash(snapshot),record.draftHash));
  const authority = P.evaluateProtectedPacketFacts(snapshot), model = P.protectedPacketInformationModelFor(record), saved = patch(record);
  check(`${row.key}:current-unpaid`,()=>assert.equal(authority.evaluation.paymentAllowed,false));
  check(`${row.key}:loads`,()=>assert(model));
  check(`${row.key}:not-ready`,()=>assert(model && model.stage!=='ready_to_generate' && model.reviewSafety.safe===false));
  check(`${row.key}:successor-payment-only`,()=>assert.deepEqual(P.paymentOnlyDraftSuccessor(snapshot,authority,'unverified'),{...snapshot,paymentAllowed:false}));
  check(`${row.key}:noop`,()=>{assert(saved);assert.equal(saved.readyToGenerate,false);assert.deepEqual(saved.protectedTransition.nextVerification,record);});
  const edited=P.packetInformationPatch({protectedVerification:record,answers:{participant_full_legal_name:'Synthetic Updated Name'}});
  check(`${row.key}:explicit-save-held`,()=>{assert(edited);assert.equal(edited.readyToGenerate,false);assert.equal(edited.protectedTransition.nextVerification.draftSnapshot.paymentAllowed,false);assert.equal(edited.protectedTransition.nextVerification.draftSnapshot.packetAnswers.participant_full_legal_name,'Synthetic Updated Name');});
  check(`${row.key}:read-immutable`,()=>assert.deepEqual(record,before));
  check(`${row.key}:fresh-readable`,()=>assert(P.protectedPacketInformationModelFor(row.freshRecord)));
  const presented=await present(record);
  check(`${row.key}:briefcase`,()=>{assert.equal(presented.authorityStatus,'protected_draft');assert.equal(presented.packetDraft.status,'available');assert.equal(presented.resultCode,authority.evaluation.resultCode);assert.equal(presented.reevaluatedPayment,false);assert(Object.values(presented.commercialActions).every(value=>value===false));assert.deepEqual(record,before);});
  for (const field of ['resultCode','pathwayId','packetType','selectedTrackId','treatmentClassification','deferralComponentIds','packetPlan','requiredInputIds','packetFamilyIdentifiers','serverFacts','profileVersion','profileSourceFingerprint','profileAuthorityFingerprint']) {
    const bad=structuredClone(record);
    if (field==='packetPlan') bad.draftSnapshot.packetPlan.sourceFormIds=['unapproved'];
    else if (field==='packetFamilyIdentifiers') bad.draftSnapshot.packetFamilyIdentifiers.sourceFormIds=['unapproved'];
    else if (field==='serverFacts') bad.draftSnapshot.serverFacts.pathway_id='unapproved';
    else bad.draftSnapshot[field]=Array.isArray(bad.draftSnapshot[field])?['unapproved']:'unapproved';
    bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
    if (['resultCode','pathwayId'].includes(field)) { const refused=await present(bad); check(`${row.key}:briefcase-${field}-refused`,()=>assert.equal(refused.authorityStatus,'unavailable')); }
    check(`${row.key}:authority-${field}-refused`,()=>{assert.equal(P.protectedPacketInformationModelFor(bad),null);assert.equal(patch(bad),null);});
  }
  check(`${row.key}:verified-refused`,()=>assert.equal(P.paymentOnlyDraftSuccessor(snapshot,authority,'verified'),null));
  check(`${row.key}:current-paid-refused`,()=>{const paid=structuredClone(authority);paid.evaluation.paymentAllowed=true;assert.equal(P.paymentOnlyDraftSuccessor(snapshot,paid,'unverified'),null);});
  check(`${row.key}:already-held-no-successor`,()=>assert.equal(P.paymentOnlyDraftSuccessor({...snapshot,paymentAllowed:false},authority,'unverified'),null));
}
console.log(JSON.stringify({mode,checks,passed:checks-failures.length,failures},null,2));
process.exitCode=failures.length?1:0;
