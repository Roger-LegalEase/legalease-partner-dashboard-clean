/** Read the existing parallel reviewers' returns without treating builds or
 * source-preparation notes as packet approvals. Original records stay intact. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {readDeclaredWholeReviewAnchor} from '../rcap-packet-recovery/chat1/declared-whole-review-anchor.mjs';

export const CHAT_REVIEW_ROOTS = [
  'data/rcap-grade-a/chat-parallel-2026-09-07/review',
  'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review',
  'data/rcap-grade-a/chat-parallel-2026-09-07/chat10-review',
];
export const CHAT_SCHEMA = 'rcap-independent-verification-rows/v1';
// A reviewer may put supersession on the affected row of a multi-family
// return. Read that declaration before the document-wide default, just as
// the extractor does for the review base; never infer it from a filename.
export function supersededChatEvidencePath(base, doc, row) {
  const name = row.supersedesSubmittedDisposition ?? doc.supersedesSubmittedDisposition;
  return typeof name === 'string' && name.endsWith('.json')
    && path.basename(name) === name && !name.includes('\\')
    ? `${base}/${name}` : null;
}
export function chatReviewInputs(root) {
  const entries = [];
  for (const base of CHAT_REVIEW_ROOTS) {
    if (!fs.existsSync(path.join(root, base))) continue;
    for (const name of fs.readdirSync(path.join(root, base)).sort()) {
      if (!name.endsWith('.json')) continue;
      const file = `${base}/${name}`;
      const bytes = fs.readFileSync(path.join(root, file));
      let doc;
      try { doc = JSON.parse(bytes); } catch { continue; }
      // Audit results, planning notes and source-only addenda are evidence,
      // not this schema's fifteen-obligation packet-verdict rows.
      if (doc.schemaVersion !== CHAT_SCHEMA && !(doc.schemaVersion === 'rcap-independent-review-findings/v1'
          && !doc.extendsReview && Array.isArray(doc.rows) && doc.rows.length
          && doc.rows.every(r => r.verdict === 'FAIL_REPAIR_REQUIRED'))) continue;
      entries.push({base, name: name.slice(0, -5), file, chat: true,
        inputSha256: crypto.createHash('sha256').update(bytes).digest('hex')});
    }
  }
  return entries;
}

export function chatRowProblem(doc, row, obligations) {
  const bounded = doc.schemaVersion === 'rcap-independent-review-findings/v1' && !doc.extendsReview
    && row.verdict === 'FAIL_REPAIR_REQUIRED' && typeof row.reviewBaseSource === 'string';
  if (doc.schemaVersion !== CHAT_SCHEMA && !bounded) return 'not an independent packet-review schema';
  if (!Array.isArray(doc.rows) || (!doc.rows.includes(row) && !(bounded && doc.rows.some(r => r.familyId === row.familyId)))) return 'row is not in this review';
  if (typeof doc.reviewer !== 'string' || !doc.reviewer.trim()
      || typeof doc.sessionIdentity !== 'string' || !doc.sessionIdentity.trim())
    return 'reviewer and separate review-session identity are required';
  if (doc.laneKind != null && doc.laneKind !== 'independent-verification')
    return 'the declared lane is not independent verification';
  if (doc.packetFilesEdited === true || doc.buildersExecutedOrEdited === true
      || doc.overlayDirectoriesModified > 0) return 'review does not preserve author/reviewer separation';
  if (typeof row.familyId !== 'string' || !row.familyId
      || (row.itemId && row.itemId !== row.familyId)) return 'exact family identity is required';
  if (!/^[0-9a-f]{40}$/.test(row.verifiedAtBase ?? '')) return 'the row must name its actual immutable review base';
  const positive = row.verdict === 'PASS_COMPLETE_INDEPENDENT';
  if (!positive) return null; // Existing extractor preserves measured failures and unmeasured scope.
  if (doc.laneKind !== 'independent-verification') return 'a complete pass must explicitly declare an independent lane';
  if (obligations.some(k => row.proofObligations?.[k]?.result !== 'PASS'
      || row.proofObligations?.[k]?.measured !== true))
    return 'a complete pass requires all fifteen obligations measured PASS in this row';
  if (row.failedObligations?.length || row.unmeasuredObligations?.length)
    return 'a complete pass conflicts with declared failures or unmeasured scope';
  const counters = ['knownRequiredFieldsMissing', 'requiredFactsNotCollected', 'unclassifiedBlanks',
    'incompleteRows', 'requiredOptionsMissing', 'requiredComponentsMissing', 'invisibleWrites',
    'protectedWrites', 'visualDefects'];
  if (row.nineCounters?.measuredHere !== true || row.nineCounters?.allZero !== true
      || counters.some(k => row.nineCounters?.[k] !== 0))
    return 'a complete pass requires the reviewer’s measured nine zero counters';
  if ((doc.candidateCodeCommit || row.candidateCodeCommit) && !row.packetPublicationCommit)
    return 'an unpublished candidate cannot become a current published-output approval';
  if (['canonical','boundary'].some(k => !/^[0-9a-f]{40}$/.test(row.anchors?.[k]?.gitBlobSha ?? '')
      || !/^[0-9a-f]{64}$/.test(row.anchors?.[k]?.centralAndInventorySha256 ?? '')))
    return 'a complete chat pass must bind its whole output identities';
  return null;
}

/** A completed bounded failure needs no invented fifteen-obligation PASS.
 * This document declares one frozen snapshot for all its rows. It may supply
 * that base only when both current whole PDFs match the explicitly recorded
 * Git identities, not merely because a document has a recent timestamp. */
export function normalizeBoundedChatFailure(root, doc, raw) {
  if (doc.schemaVersion === CHAT_SCHEMA && raw.verdict === 'PASS_COMPLETE_INDEPENDENT') {
    if (typeof raw.familyDirectory !== 'string' || !raw.familyDirectory.startsWith('data/rcap-all50/overlays/')
        || raw.familyDirectory.split('/').includes('..')) throw new Error('invalid reviewed output directory');
    for (const fixture of ['canonical','boundary']) {
      const b = readDeclaredWholeReviewAnchor(root,raw,fixture);
      const h = crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
      const digest = crypto.createHash('sha256').update(b).digest('hex');
      if (h !== raw.anchors?.[fixture]?.gitBlobSha || digest !== raw.anchors?.[fixture]?.centralAndInventorySha256)
        throw new Error('complete chat pass does not bind both current whole PDFs');
    }
    return raw;
  }
  if (doc.schemaVersion !== 'rcap-independent-review-findings/v1' || doc.extendsReview) return raw;
  if (raw.verdict !== 'FAIL_REPAIR_REQUIRED') throw new Error('bounded findings never authorize a pass');
  for (const k of ['packetBytesEdited','mapsEdited','instructionsEdited','buildersExecutedOrEdited'])
    if (doc.independence?.[k] !== false) throw new Error('bounded reviewer independence is not established');
  if (!/^[0-9a-f]{40}$/.test(doc.currentPacketSnapshot ?? '')) throw new Error('bounded review has no frozen packet snapshot');
  const master = JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json')));
  const family = master.families.find(f => f.familyId === raw.familyId);
  if (!family) throw new Error('bounded review names no current family');
  for (const fixture of ['canonical','boundary']) {
    const b = fs.readFileSync(path.join(root,family.directory,'fixtures',fixture+'.pdf'));
    const h = crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
    if (h !== raw[fixture]?.gitBlobShaAtBothSnapshots) throw new Error('bounded review no longer describes both current PDFs');
  }
  if (!raw.failedObligations?.length) throw new Error('bounded failure names no failed obligation');
  const findings=(raw.findings ?? []).map(id=>doc.findings?.find(f=>f.id===id));
  if (!findings.length || findings.some(f=>!f)) throw new Error('bounded failure findings are not present');
  return {...raw,itemId:raw.familyId,verifiedAtBase:doc.currentPacketSnapshot,
    reviewBaseSource:'Document frozen packet snapshot, independently bound here to both current whole-PDF Git identities',
    reviewScope:doc.scope,
    proofObligations:Object.fromEntries(raw.failedObligations.map(k=>[k,{result:'FAIL',measured:true,
      finding:findings.map(f=>`${f.id}: ${f.finding}`).join(' | ')}]))};
}

/** Supplemental source measurements enrich their exact existing negative
 * review; they do not replace it, erase failures, or grant SOURCE_IDENTITY. */
export function attachChatReviewAddenda(root, rows) {
  for (const base of CHAT_REVIEW_ROOTS) {
    if (!fs.existsSync(path.join(root,base))) continue;
    for (const name of fs.readdirSync(path.join(root,base)).filter(x=>x.endsWith('.json')).sort()) {
      const file=`${base}/${name}`,bytes=fs.readFileSync(path.join(root,file));
      let doc;try{doc=JSON.parse(bytes);}catch{continue;}
      if (doc.schemaVersion!=='rcap-independent-review-findings/v1'||!doc.extendsReview?.path)continue;
      const targetPath=doc.extendsReview.path;
      if (!CHAT_REVIEW_ROOTS.some(p=>targetPath.startsWith(p+'/')) || targetPath.includes('..')) continue;
      const original=fs.readFileSync(path.join(root,targetPath));
      const h=crypto.createHash('sha1').update(Buffer.from(`blob ${original.length}\0`)).update(original).digest('hex');
      if(h!==doc.extendsReview.blob)continue;
      for(const r of doc.rows??[]) {
        const target=rows.find(x=>x.evidencePath===targetPath&&x.familyId===r.familyId
          &&x.verdict==='FAIL_REPAIR_REQUIRED'&&x.candidateCodeCommit===r.candidateCodeCommit);
        if(!target||r.verdict!=='FAIL_REPAIR_REQUIRED')continue;
        (target.supplementalEvidence??=[]).push({path:file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
          candidateCodeCommit:r.candidateCodeCommit,findings:r.findings??[],
          obligationEvidenceUpdates:r.obligationEvidenceUpdates??[],
          replacesOriginalReview:false,grantsWholeObligationPass:false});
      }
    }
  }
}
