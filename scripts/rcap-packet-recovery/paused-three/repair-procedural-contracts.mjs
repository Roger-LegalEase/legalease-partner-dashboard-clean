#!/usr/bin/env node
/** Source-bound implementation of Chat6 Groups09/10/11. No approval/state writes.
 * node scripts/rcap-packet-recovery/paused-three/repair-procedural-contracts.mjs --root <checkout> [--apply]
 * Dry-run is default. Preflight all four documents before any atomic file write.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const TRACKS = ['la-987-set-aside-and-dismiss','ky_felony_expungement_after_pardon','nh_petition_vacated'];
export const FILES = ['data/record-clearing/legal-design-track-registry.json',
  ...['LA','KY','NH'].map(s=>`data/record-clearing/legal-design-intake/${s}.memo.json`)];
export const LA_TEXT = 'reference/chat-parallel-2026-09-07/chat6/la-987/articles-986-987-web-text.txt';
export const LA_SHA256 = '5e2bb2ee372d01c819b4466a222cd61fc5b931b3e4a1e9a93d34a5c549820900';
export const FALSE_KY_STOP = 'Any case where the underlying offence falls outside KRS 431.073(1)(a) and (1)(d), so that the pardon is the only route.';
export const LA_FEE_RELIEF = 'Article 987 prescribes no fee-waiver instrument, and Article 988 is not automatically the fee-relief procedure for this antecedent motion. If you cannot pay, ask the clerk of the actual sentencing court what local cost-relief procedure is available. No amount, form, exemption or judicial grant is assumed.';
export const NH_FEES = 'The retained court schedule lists $125.00 per court location; confirm the current court filing charge or submit the applicable court-fee motion at filing. Any Department of Corrections investigation charge arises with the court-ordered investigation under RSA 651:5, IX. Any Department of Safety/state-police correction charge arises after annulment is granted under IX/X(d). Actual agency applicability and indigency treatment for this vacatur remain unresolved. Do not require later agency payments before filing or count the overlapping DOS/state-police provisions as two established charges.';
export const NH_RELIEF = 'For a requested court filing-fee waiver, use the applicable NHJB-2311 motion and supporting NHJB-2328 financial statement in the actual court/channel. The court decides the request. RSA 651:5, IX and X(d) separately address agency indigency relief; filing a court-fee request does not establish that any court or agency has granted relief.';
const LA_SOURCE = `Previously recorded source absence is historical. Chat6 supplied the prescribed Articles 986/987 text at ${LA_TEXT}, SHA-256 ${LA_SHA256} (5,286 bytes), source commit fffb82185b3444d62af7362d99f1866cab6e9caa. This is a labeled UTF-8 transcription of Legislature text, not original HTML or an official PDF. It supplies text for the existing COMPOSE_FROM_AUTHORITY repair; full instrument fidelity, current output review and local cost/service inputs remain separate.`;
export const hash = b=>crypto.createHash('sha256').update(b).digest('hex');
const exactlyOne = (rows,predicate,label)=>{const matches=rows.filter(predicate);assert.equal(matches.length,1,`Expected exactly one ${label}, found ${matches.length}`);return matches[0];};
const isCourtLA = text=>/^The return date, time and place on the Rule|^Every finding, decretal paragraph|^The judge's signature on the Rule|^The district attorney's response|^The rule to show cause return date/.test(text);

function reviseLA(t) {
  assert.ok(t.rules?.researchTwoFieldResolution?.largerDefect,'Missing adopted LA whole-instrument repair');
  assert.ok(t.rules.researchTwoFieldResolution.sourceRequirement.includes('codified text') || t.rules.researchTwoFieldResolution.sourceRequirement===LA_SOURCE,'Unexpected LA source preimage');
  t.rules.researchTwoFieldResolution.sourceRequirement=LA_SOURCE;
  assert.ok(t.rules.feeWaiver.startsWith('none prescribed by Article 987') || t.rules.feeWaiver===LA_FEE_RELIEF,'Unexpected LA waiver preimage');
  t.rules.feeWaiver=LA_FEE_RELIEF;
  for(const row of t.manualCompletionItems??[]) if(isCourtLA(row.item)) {
    row.requiredBeforeFiling=false;
    row.completionActor=row.item.startsWith("The district attorney's")?'district_attorney':'court';
    if(row.why==='Counsel classified this as an item the participant completes.') row.why='The court assigns this information after filing; it is not a participant-completed prerequisite.';
  }
  if(!t.packetSet) return;
  const rows=t.packetSet.participantActionRequired;
  for(const row of rows) if(row.kind==='complete_field' && isCourtLA(row.description)) {
    row.requiredBeforeFiling=false;
    row.completionActor=row.description.startsWith("The district attorney's")?'district_attorney':'court';
  }
  const fee=exactlyOne(rows,x=>x.kind==='pay_fee'||x.actionId==='la987-local-cost-inquiry','LA cost action');
  Object.assign(fee,{kind:'confirm_answer',actionId:'la987-local-cost-inquiry',description:'Ask the clerk of the actual sentencing court what filing cost, if any, applies to this Article 987 motion. No Article 983 expungement charge or unknown sum is treated as already payable.',requiredBeforeFiling:true});
  const relief=exactlyOne(rows,x=>x.kind==='apply_fee_waiver'||x.actionId==='la987-local-relief-inquiry','LA relief action');
  Object.assign(relief,{kind:'confirm_answer',actionId:'la987-local-relief-inquiry',description:LA_FEE_RELIEF,requirement:'conditional',conditionDescription:'Only when the participant requests relief from an applicable local filing cost.',requiredBeforeFiling:true});
  t.packetSet.requiredBeforeFiling=rows.filter(x=>x.requiredBeforeFiling===true).map(x=>x.description);
}

function reviseKY(t) {
  assert.ok(t.rules?.fullPardonResearch || JSON.stringify(t.rules).includes('431.073(1)(c)'),'Missing adopted independent full-pardon ground');
  assert.ok(Array.isArray(t.selfHelpStopConditions));
  const found=t.selfHelpStopConditions.filter(x=>x===FALSE_KY_STOP);
  assert.ok(found.length<=1,'Duplicate false KY stop');
  t.selfHelpStopConditions=t.selfHelpStopConditions.filter(x=>x!==FALSE_KY_STOP);
  if (Array.isArray(t.selfHelpBoundaries)) {
    t.selfHelpBoundaries=t.selfHelpBoundaries.filter(x=>x!==FALSE_KY_STOP);
  }
  // No new eligibility logic: leave common timing, document, verification,
  // IFP, service, immigration and ambiguous-pardon conditions byte-equivalent.
}

function reviseNH(t) {
  assert.ok(t.rules?.serviceCertificateOnNhjb2328?.includes('electronically sending'),'Missing adopted NH financial-statement service caveat');
  assert.ok(t.rules.fees.includes('125') && (t.rules.fees.includes('should assume')||t.rules.fees===NH_FEES),'Unexpected NH fee preimage');
  t.rules.fees=NH_FEES;t.rules.feeWaiver=NH_RELIEF;
  for(const row of t.manualCompletionItems??[]) {
    if(row.item==='Everything in the FOR COURT USE ONLY section') {row.requiredBeforeFiling=false;row.completionActor='court';}
    if(row.item.startsWith('Payment of the $125.00 filing fee')) {
      row.item='Court filing charge or requested court-fee relief, separate from later agency charges';
      row.whereInPacket='Court filing stage; actual agency charges are addressed with the agency at their later statutory stage.';
      row.why='Confirm the current filing charge or request court-fee relief. Do not infer agency-fee applicability, advance payment or a granted waiver.';
    }
  }
  if(!t.packetSet)return;
  const rows=t.packetSet.participantActionRequired;
  const court=exactlyOne(rows,x=>x.description.startsWith('Everything in the FOR COURT USE ONLY'),'NH court-use action');
  court.requiredBeforeFiling=false;court.completionActor='court';
  const payment=exactlyOne(rows,x=>x.description.startsWith('Payment of the $125.00 filing fee')||x.actionId==='nh-vacated-court-cost','NH filing-cost field');
  Object.assign(payment,{kind:'confirm_answer',actionId:'nh-vacated-court-cost',description:'Confirm the current court filing charge for this location, or include the applicable requested court-fee relief papers. DOC/DOS/state-police payments are not initial-filing prerequisites.',requiredBeforeFiling:true});
  const notarize=rows.filter(x=>x.kind==='notarize');
  assert.ok(notarize.every(x=>x.description==='None identified.'),'Do not remove a source-supported notarization act');
  t.packetSet.participantActionRequired=rows.filter(x=>x.kind!=='notarize');
  const kept=t.packetSet.participantActionRequired;
  const fee=exactlyOne(kept,x=>x.kind==='pay_fee'||x.actionId==='nh-vacated-agency-cost-stages','NH agency cost action');
  Object.assign(fee,{kind:'confirm_answer',actionId:'nh-vacated-agency-cost-stages',description:'If the court orders a DOC investigation, confirm the investigation charge and any agency indigency procedure at that stage. After an actual grant, confirm any DOS/state-police correction charge and available relief. Do not treat IX and X(d) as two independently established correction charges.',requiredBeforeFiling:false});
  const waiver=exactlyOne(kept,x=>x.kind==='apply_fee_waiver','NH fee-waiver action');
  waiver.description=NH_RELIEF;
  t.packetSet.requiredBeforeFiling=kept.filter(x=>x.requiredBeforeFiling===true).map(x=>x.description);
}

export function repairDocument(input,relativePath) {
  assert.ok(FILES.includes(relativePath),'Out-of-scope document');
  assert.ok(Array.isArray(input.tracks),'Missing tracks');
  const out=structuredClone(input), ids=relativePath.endsWith('registry.json')?TRACKS:
    [TRACKS[{LA:0,KY:1,NH:2}[path.basename(relativePath,'.memo.json')]]];
  for(const id of ids) {
    const t=exactlyOne(out.tracks,x=>x.trackId===id,`track ${id}`);
    if(id===TRACKS[0])reviseLA(t);else if(id===TRACKS[1])reviseKY(t);else reviseNH(t);
  }
  return out;
}

export function run(root,{apply=false}={}) {
  root=fs.realpathSync(root);const originals=new Map(),plans=[];
  const source=path.join(root,LA_TEXT);
  assert.ok(fs.existsSync(source),'Retained LA statutory text must be installed first');
  assert.equal(hash(fs.readFileSync(source)),LA_SHA256,'LA statutory transcription bytes differ');
  for(const rel of FILES) {
    const abs=path.join(root,rel);assert.equal(fs.realpathSync(abs),abs,'Refuse symlink destination');
    const bytes=fs.readFileSync(abs);originals.set(abs,bytes);
    const next=Buffer.from(JSON.stringify(repairDocument(JSON.parse(bytes),rel),null,2)+'\n');
    plans.push({rel,abs,bytes,next});
  }
  const written=[];
  try {if(apply)for(const x of plans)if(!x.bytes.equals(x.next)) {
    const temp=`${x.abs}.paused-three-${process.pid}.tmp`;
    fs.writeFileSync(temp,x.next,{flag:'wx'});fs.renameSync(temp,x.abs);written.push(x.abs);
  }}catch(error){for(const abs of written)fs.writeFileSync(abs,originals.get(abs));throw error;}
  return {mode:apply?'applied':'dry-run',createsApproval:false,terminalDelta:0,
    files:plans.map(x=>({path:x.rel,changed:!x.bytes.equals(x.next),beforeSha256:hash(x.bytes),afterSha256:hash(x.next)}))};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const a=process.argv.slice(2),i=a.indexOf('--root');
  assert.ok(i>=0&&a[i+1],'Usage: --root <checkout> [--apply]');
  assert.ok(a.every((x,j)=>x==='--root'||j===i+1||x==='--apply'),'Unknown argument');
  console.log(JSON.stringify(run(a[i+1],{apply:a.includes('--apply')}),null,2));
}
