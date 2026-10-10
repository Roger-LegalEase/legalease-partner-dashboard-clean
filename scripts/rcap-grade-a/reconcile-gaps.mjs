// Adjudication of the controlling plan's existing gaps. Does not manufacture acceptance.
import fs from 'node:fs';import assert from 'node:assert/strict';
const root=process.env.RCAP_CAMPAIGN_DIR;assert.ok(root,'Set the existing campaign directory');
const cases=fs.readFileSync(root+'/acceptance-ledger.jsonl','utf8').trim().split('\n').map(JSON.parse),rows=JSON.parse(fs.readFileSync(root+'/ux-gap-ledger.json'));
const conclusions={
'G-01':['A-T16','A-T17','A-T18','A-T19','A-T20','Exact-source OpenAI executions and persisted seven-field readback pass. Provider, timeout, malformed response and semantic failures remain separately actionable.'],
'G-02':['A-T24','A-T25','A-T26','Incomplete bilingual Page is labeled as a draft; Update preserves the current Summary, creates only a complete affected Page, and retries reuse the completed operation.'],
'G-03':['A-T29','A-T30','A-T31','A-T32','One version-bound review and protected idempotent publication pass in the isolated application. Production owner acceptance remains pending an authorized finished release.'],
'G-04':['A-T06','A-T08','A-T09','Membership alone no longer invents third-party operating rights. Actual agreement-protected configuration changes remain refused.'],
'G-05':['A-T13','P-T06','U-T04','U-T05','C-T16','Program state sets persist across roles; ordinary/code intake and Clinic assistance enforce their actual scope, including direct-request denials.'],
'G-06':['A-T07','A-T10','A-T28','Configure uses grouped fields and one canonical Save; its immediate Review Program Materials action opens the authoritative previews.'],
'G-07':['A-T04','A-T05','One canonical creation flow retains the old route as a compatibility redirect. Exact creation replay does not duplicate the program.'],
'G-08':['A-T31','A-T33','A-T35','A-T36','A-T37','Managed screening launches from the workspace. Applicable external arrangements link directly to scoped diagnostics; fake executed agreements are refused.'],
'G-09':['P-T06','The Partner selects multiple permitted jurisdictions through checkboxes and receives authoritative refresh/readback. Forged jurisdictions are denied.'],
'G-10':['P-T08','Partner preparation uses real source-matched OpenAI output for custom public copy and approved Spanish for standard fields; no manual seven-field assignment.'],
'G-11':['P-T16','P-T19','Activity & Reporting is accurately labeled, tenant-scoped and aggregate-only. It does not advertise a fabricated export or participant-owned Briefcase.'],
'G-12':['C-T03','C-T14','C-T16','Assisted screening names the actual event jurisdiction and the database refuses any other parent-authorized state.'],
'G-13':['C-T21','C-T22','U-T22','U-T23','Interrupted reset remains locked; actual server revocation, BFCache/back navigation and a second authenticated participant show no previous-participant leakage.'],
'G-14':['C-T23','Standard event/code entry remains separate from specialized legal-aid registration. The inapplicable setup route returns protected 404.'],
'G-15':['P-T07','U-T05','U-T06','Access policy uses canonical configuration; actual code lifecycle, publication guards and one-use replay protect the separate access manager.'],
'G-16':['C-T01','C-T04','C-T07','C-T08','C-T10','U-T17','Creation stays draft; real event prerequisites and lifecycle apply. Capacity is not funding. Positive funded sponsorship acceptance is blocked by the absence of genuinely funded isolated evidence.'],
'G-17':['A-T10','P-T08','The canonical public CTA is action-sized; partner custom translation reuses an approved concise bilingual CTA without silently replacing custom prose.'],
'G-18':['A-T13','P-T06','Jurisdictions use searchable checkboxes and selected-state chips with direct removal; no modifier-key multiselect.'],
'G-19':['A-T34','P-T14','P-T15','Live programs open operational destinations; unpublished partner state identifies its actual authority dependency.'],
'G-20':['A-T05','P-T16','Compatibility URLs remain deliberate redirects to one current workspace; retained role navigation reaches distinct, authorized destinations.'],
'G-21':['A-T16','U-T18','U-T17','Evidence separately identifies actual protected OpenAI, actual Stripe TEST, isolated application interactions, simulated provider failures, and unperformed Production owner acceptance. No Production cutover is claimed.']
};
for(const row of rows){const list=conclusions[row.gapId];assert.ok(list);const note=list.at(-1),ids=list.slice(0,-1),found=ids.map(id=>{const c=cases.find(r=>r.caseId===id);assert.ok(c);return c;});row.before=row.contract[1];row.after=note;row.caseIds=ids;row.evidence=[...new Set(found.flatMap(c=>c.evidence??[]))];row.status=found.some(c=>['BLOCKED','FAIL','NOT_RUN'].includes(c.result))?'ACCEPTANCE_BLOCKED':row.gapId==='G-03'?'ISOLATED_VERIFIED_PRODUCTION_OWNER_PENDING':row.gapId==='G-14'?'CONDITIONAL_NOT_OFFERED':row.gapId==='G-21'?'EVIDENCE_BOUNDARIES_RECORDED':'RESOLVED_IN_ISOLATED_APPLICATION';row.releaseAcceptance='NOT_CLAIMED';}
fs.writeFileSync(root+'/ux-gap-ledger.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify({gaps:rows.length,statuses:rows.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{})}));
