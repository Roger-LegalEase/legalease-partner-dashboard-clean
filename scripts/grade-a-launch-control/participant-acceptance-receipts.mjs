import { createHash } from 'node:crypto';

// Pure release-control input evaluator: no filesystem, network, or authority writes.
// Callers supply exact bytes from the existing receipt/evidence paths. Historical
// schemas remain visible but cannot be promoted by translating prose into PASS.
export const EXISTING_PARTICIPANT_RECEIPTS = Object.freeze([
  'data/rcap-grade-a/participant-data-rights/hosted-acceptance.json',
  'data/rcap-grade-a/participant-data-rights/nonproduction-application-readiness.json',
]);
const main = [
  ['anonymous_boundary','Anonymous boundary'], ['claim_continuity','Claim continuity'],
  ['exact_redirect','Exact redirect'], ['idempotency','Idempotency'], ['ownership','Ownership'],
  ['cross_user_security','Cross-user security'], ['cross_tenant_security','Cross-tenant security'],
  ['staff_consent','Staff consent'], ['participant_authority','Participant authority'],
  ['stale_verification','Stale verification'], ['payment_integrity','Payment integrity'],
  ['sponsorship_integrity','Sponsorship integrity'], ['private_delivery','Private delivery'],
  ['clinic_reset','Clinic reset'], ['telemetry','Telemetry'], ['recovery','Recovery'],
  ['accessibility','Accessibility'], ['mobile','Mobile'],
  ['processing_integrity','Processing integrity'], ['auditability','Auditability'],
];
const privacy = [
  ['privacy_cross_user_denial','User A cannot request deletion for user B'],
  ['privacy_partner_staff_denial','Partner staff cannot delete a participant'],
  ['privacy_briefcase_access_removed','Deletion removes all active Briefcase access'],
  ['privacy_private_urls_dead','Private packet URLs stop working'],
  ['privacy_objects_removed','Uploads and generated objects are removed'],
  ['privacy_reminders_stopped','Reminders stop'],
  ['privacy_assisted_access_ended','Clinic and partner access ends'],
  ['privacy_accounting_preserved','Payment and sponsorship accounting remain accurate'],
  ['privacy_retention_minimized','Retained records are pseudonymised and access-restricted'],
  ['privacy_sessions_revoked','Auth sessions are revoked'],
  ['privacy_signin_denied','The deleted account cannot sign in'],
  ['privacy_idempotency','Repeated requests do not duplicate work'],
  ['privacy_resume','A failed step resumes safely'],
  ['privacy_backup_tombstone','Backup restoration does not reactivate the account'],
  ['privacy_accurate_receipt','The participant receives an accurate completion receipt'],
];
export const PARTICIPANT_GATE_CATALOG = Object.freeze([
  ...main.map(([id,label])=>Object.freeze({id,label,section:'15'})),
  ...privacy.map(([id,label])=>Object.freeze({id,label,section:'12A'})),
]);
export const ACCEPTANCE_SCHEMA = 'rcap-participant-hosted-gate-receipt/v1';
export const REVIEW_SCHEMA = 'rcap-participant-hosted-independent-review/v1';
export const CONTRACT_COUNT_NOTE = 'PRODUCT_CONTRACT section 15 enumerates 20 table rows; LAUNCH_SEQUENCE says 21. All 20 named rows plus all 15 section 12A deletion gates are required; no invented 21st row.';
export const REQUIRED_CHAIN_GAP = 'Existing hosted_full anti-skip contract requires nine infrastructure/payment/gallery steps, but no export, matter-deletion or account-deletion step. This evaluator does not execute or close that missing hosted coverage.';
const hex = (v,n)=>typeof v==='string' && new RegExp(`^[a-f0-9]{${n}}$`).test(v);
const nonempty = v=>typeof v==='string' && v.trim().length>0;
const digest = v=>typeof v==='string' && /^sha256:[a-f0-9]{64}$/.test(v);
export const sha256 = bytes=>createHash('sha256').update(bytes).digest('hex');
const safePath = p=>nonempty(p)&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(s=>s==='..'||s==='.'||s==='')&&!p.includes('\0');
// Canonical receipt digest avoids key-order dependence. Review signs the entire
// subject except its own pointer, so changing any verdict invalidates the review.
const canonical = value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export function reviewedSubjectSha256(receipt) {
  const { independentReview, ...subject }=receipt;
  return sha256(JSON.stringify(canonical(subject)));
}
function evidence(ref,bytesByPath) {
  if(!ref||!safePath(ref.path)||!hex(ref.sha256,64))return 'invalid evidence reference';
  const bytes=bytesByPath[ref.path];
  if(!(typeof bytes==='string'||bytes instanceof Uint8Array))return `missing evidence bytes: ${ref.path}`;
  return sha256(bytes)===ref.sha256?null:`changed evidence bytes: ${ref.path}`;
}
const ZERO_TARGETS=['genericDashboardRedirects','duplicateMatters','crossUserOrTenantExposures','paymentMatterMismatches','sponsorshipCreditDuplications','readyPacketsWithoutArtifact','sensitiveTelemetryValues','clinicResetLeaks','wrongFormSetsFromStaleVerification'];
function targetsValid(t) {
  return t&&Number.isSafeInteger(t.claimAttempts)&&t.claimAttempts>0&&Number.isSafeInteger(t.claimSuccesses)&&t.claimSuccesses>=0&&t.claimSuccesses<=t.claimAttempts&&t.claimSuccesses/t.claimAttempts>=0.999&&ZERO_TARGETS.every(k=>t[k]===0);
}
/**
 * Integration contract for the existing launch-control generator:
 * expected = { candidateSha, workerDigest, projectRef, productContractSha256,
 *              dataRightsMigration: {path, sha256}, reviewerIdentities: [...] }.
 * These values come from the Captain's current freeze and reviewer assignments,
 * never from the receipt under examination. receipts = [{path, bytes}], where
 * bytes are saved original UTF-8 JSON (undefined means absent). Supply referenced
 * original evidence bytes in evidenceBytesByPath; this function hashes them.
 * No filesystem reads, external calls, or generated control files are performed.
 * Existing historical schemas are retained as STALE/MISSING observations. A
 * successor must carry ACCEPTANCE_SCHEMA, explicit measured gates, and an
 * independent REVIEW_SCHEMA document binding reviewedSubjectSha256(receipt).
 * A passing result means only that supplied hosted evidence is current and
 * complete against this catalog; it grants no commercial or production power.
 */
export function evaluateParticipantAcceptance({expected,receipts=[],evidenceBytesByPath={}}={}) {
  const expectedErrors=[];
  if(!hex(expected?.candidateSha,40))expectedErrors.push('exact candidate SHA required');
  if(!digest(expected?.workerDigest))expectedErrors.push('exact worker digest required');
  if(!/^[a-z]{20}$/.test(expected?.projectRef??''))expectedErrors.push('exact synthetic project ref required');
  if(!Array.isArray(expected?.reviewerIdentities)||expected.reviewerIdentities.length===0||expected.reviewerIdentities.some(x=>!nonempty(x)))expectedErrors.push('trusted independent reviewer identities required');
  if(!hex(expected?.productContractSha256,64))expectedErrors.push('current PRODUCT_CONTRACT hash required');
  if(!safePath(expected?.dataRightsMigration?.path)||!hex(expected?.dataRightsMigration?.sha256,64))expectedErrors.push('exact data-rights migration path/hash required');
  const known=new Set(PARTICIPANT_GATE_CATALOG.map(g=>g.id));
  const evaluated=receipts.map(input=>{
    const out={path:input.path,status:'MISSING',reason:'No current hosted gate receipt',gates:[],acceptanceRunId:null};
    if(!safePath(input.path))return {...out,status:'INVALID',reason:'Unsafe receipt path'};
    if(input.bytes===undefined)return out;
    let r;try{r=JSON.parse(Buffer.from(input.bytes).toString('utf8'));}catch{return {...out,status:'INVALID',reason:'Receipt is not JSON'};}
    if(!r||typeof r!=='object'||Array.isArray(r))return {...out,status:'INVALID',reason:'Receipt is not an object'};
    out.observedSchema=r.schemaVersion??null;out.observedStatus=r.status??r.verdict??null;
    if(r.schemaVersion!==ACCEPTANCE_SCHEMA){
      const oldSha=r.baseSha??r.recorded?.captainSha??r.candidateSha;
      return {...out,status:hex(oldSha,40)&&oldSha!==expected?.candidateSha?'STALE':'MISSING',reason:'Historical or preparatory schema has no complete current hosted gate evidence; prior status retained',observedCandidateSha:oldSha??null};
    }
    const fail=(status,reason)=>({...out,status,reason,gates:(Array.isArray(r.gates)?r.gates:[]).filter(g=>known.has(g?.id)).map(g=>({id:g.id,status,reason}))});
    if(expectedErrors.length)return fail('INVALID',expectedErrors.join('; '));
    for(const k of ['candidateSha','workerDigest','projectRef','productContractSha256'])if(r[k]!==expected[k])return fail('STALE',`${k} differs from current required identity`);
    out.acceptanceRunId=r.acceptanceRunId;
    if(r.environment!=='synthetic_nonproduction'||!nonempty(r.acceptanceRunId)||!nonempty(r.author)||!Array.isArray(r.gates))return fail('INVALID','Synthetic hosted run identity, author and gates required');
    const ids=r.gates.map(g=>g?.id);
    if(new Set(ids).size!==ids.length||ids.some(id=>!known.has(id)))return fail('INVALID','Duplicate or unknown gate identity');
    if(r.status!=='COMPLETED')return fail(r.status==='FAILED'?'FAILED':'MISSING','Hosted execution did not complete');
    const refError=evidence(r.independentReview,evidenceBytesByPath);if(refError)return fail('INVALID',refError);
    let review;try{review=JSON.parse(Buffer.from(evidenceBytesByPath[r.independentReview.path]).toString('utf8'));}catch{return fail('INVALID','Independent review is not JSON');}
    if(!review||review.schemaVersion!==REVIEW_SCHEMA||review.verdict!=='PASS'||!nonempty(review.reviewer)||review.reviewer===r.author||!expected.reviewerIdentities.includes(review.reviewer)||review.author!==r.author||review.reviewedSubjectSha256!==reviewedSubjectSha256(r)||review.acceptanceRunId!==r.acceptanceRunId||['candidateSha','workerDigest','projectRef','productContractSha256'].some(k=>review[k]!==r[k]))return fail('INVALID','Independent review does not bind this exact run, author and complete receipt');
    if(!Array.isArray(review.gateIds)||new Set(review.gateIds).size!==review.gateIds.length||ids.some(id=>!review.gateIds.includes(id)))return fail('INVALID','Independent review omits a reported gate');
    const runEvidenceError=evidence(r.hostedRunEvidence,evidenceBytesByPath);if(runEvidenceError)return fail('INVALID',runEvidenceError);
    const privacyPresent=ids.some(id=>id.startsWith('privacy_'));
    if(privacyPresent){
      const m=r.dataRightsMigration;
      if(m?.path!==expected.dataRightsMigration.path||m?.sha256!==expected.dataRightsMigration.sha256)return fail('STALE','Data-rights migration identity differs');
      if(m.applied!==true||evidence(m.readbackEvidence,evidenceBytesByPath))return fail('INVALID','Exact hosted migration application/readback not proven');
      const journeyIds=['participant_export','single_matter_deletion','account_deletion'];
      const processorKeys=['email_delivery','payment_processor','product_analytics','packet_render_worker'];
      const exactUniqueKeys=(rows,key,allowed)=>Array.isArray(rows)&&rows.length===allowed.length&&new Set(rows.map(row=>row?.[key])).size===rows.length&&rows.every(row=>allowed.includes(row?.[key]));
      if(!exactUniqueKeys(r.privacyJourneys,'id',journeyIds))return fail('INVALID','Exactly one entry per known privacy journey required, regardless of verdict');
      if(!exactUniqueKeys(r.processorOutcomes,'key',processorKeys))return fail('INVALID','Exactly one entry per known processor required, regardless of status');
      if(!Array.isArray(r.privacyJourneys)||!['participant_export','single_matter_deletion','account_deletion'].every(id=>r.privacyJourneys.filter(c=>c?.id===id&&c.passed===true&&c.measured===true&&!evidence(c.evidence,evidenceBytesByPath)).length===1))return fail('MISSING','Three measured hosted privacy journeys required');
      if(!Array.isArray(r.processorOutcomes)||!['email_delivery','payment_processor','product_analytics','packet_render_worker'].every(key=>r.processorOutcomes.filter(p=>p?.key===key&&['acknowledged','not_applicable'].includes(p.status)&&nonempty(p.basis)&&!evidence(p.evidence,evidenceBytesByPath)).length===1))return fail('MISSING','Settled, evidenced processor outcomes and retention bases required');
    }
    out.gates=r.gates.map(g=>{
      const result={id:g.id,status:'ACCEPTED_CURRENT',reason:null,acceptanceRunId:r.acceptanceRunId,receiptPath:input.path,reviewer:review.reviewer};
      if(g.passed===false)return {...result,status:'FAILED',reason:'Measured hosted gate failed'};
      if(g.passed!==true||g.measured!==true||!nonempty(g.observation))return {...result,status:'MISSING',reason:'Explicit measured boolean pass and observation required'};
      if(!Array.isArray(g.evidence)||g.evidence.length===0)return {...result,status:'MISSING',reason:'Gate evidence required'};
      const err=g.evidence.map(ref=>evidence(ref,evidenceBytesByPath)).find(Boolean);if(err)return {...result,status:'INVALID',reason:err};
      if(g.id==='accessibility'&&(!g.evidence.some(e=>e.kind==='automated_wcag_2_2_aa')||!g.evidence.some(e=>e.kind==='manual_keyboard_screenreader')))return {...result,status:'MISSING',reason:'Both automated and manual WCAG evidence required'};
      if(g.id==='auditability'&&(!targetsValid(r.operationalTargets)||evidence(r.operationalTargets?.evidence,evidenceBytesByPath)))return {...result,status:'MISSING',reason:'Measured operational targets required'};
      return result;
    });
    const bad=out.gates.find(g=>g.status!=='ACCEPTED_CURRENT');
    return {...out,status:bad?.status??'ACCEPTED_CURRENT',reason:bad?.reason??null};
  });
  // Never combine different hosted runs to manufacture the one Phase 8 event.
  const priorities={FAILED:5,INVALID:4,ACCEPTED_CURRENT:3,STALE:2,MISSING:1};
  const gates=PARTICIPANT_GATE_CATALOG.map(g=>{
    const candidates=evaluated.flatMap(r=>r.gates.filter(x=>x.id===g.id));
    candidates.sort((a,b)=>priorities[b.status]-priorities[a.status]);
    return {...g,...(candidates[0]??{status:'MISSING',reason:'No current receipt reports this gate'})};
  });
  const runIds=[...new Set(gates.filter(g=>g.status==='ACCEPTED_CURRENT').map(g=>g.acceptanceRunId))];
  const accepted=expectedErrors.length===0&&gates.every(g=>g.status==='ACCEPTED_CURRENT')&&runIds.length===1;
  return {schemaVersion:'rcap-participant-acceptance-evaluation/v1',expected,acceptedCurrent:accepted,gateCounts:Object.fromEntries(['ACCEPTED_CURRENT','MISSING','STALE','FAILED','INVALID'].map(s=>[s,gates.filter(g=>g.status===s).length])),gates,receipts:evaluated,inputErrors:expectedErrors,acceptanceRunIds:runIds,coherentHostedRun:runIds.length===1,contractCountNote:CONTRACT_COUNT_NOTE,requiredChainGap:REQUIRED_CHAIN_GAP,commercialAuthorityGranted:false,productionAuthorityGranted:false};
}
