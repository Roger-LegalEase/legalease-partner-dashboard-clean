// Per-control adjudication. Scenario coverage alone never implies every control passed.
import fs from 'node:fs';import assert from 'node:assert/strict';
const root=process.env.RCAP_CAMPAIGN_DIR;assert.ok(root);
const rows=fs.readFileSync(root+'/control-ledger.jsonl','utf8').trim().split('\n').map(JSON.parse),cases=fs.readFileSync(root+'/acceptance-ledger.jsonl','utf8').trim().split('\n').map(JSON.parse);
function ids(text){return text.split(' ').flatMap(t=>{const m=/^([APCU]\d\d)-(\d\d)\.\.(\d\d)$/.exec(t);return m?Array.from({length:+m[3]-+m[2]+1},(_,i)=>`${m[1]}-${String(+m[2]+i).padStart(2,'0')}`):[t];});}
for(const row of rows){row.disposition=null;row.result='NOT_RUN';row.evidence=[];row.acceptanceReason='Individual control verification is not yet complete.';}
function assign(text,disposition,result,evidence,reason){assert.ok(evidence.length);for(const id of ids(text)){const row=rows.find(r=>r.controlId===id);assert.ok(row,id);Object.assign(row,{disposition,result,evidence:[...new Set(evidence)],acceptanceReason:reason});}}
function verify(text,caseIds,reason){const receipts=caseIds.split(' ').map(id=>{const c=cases.find(x=>x.caseId===id);assert.ok(c,id);return c;});const incomplete=receipts.filter(c=>c.result!=='PASS');assign(text,incomplete.length?'ACCEPTANCE_INCOMPLETE':'IMPLEMENTED_AND_VERIFIED',incomplete.some(c=>c.result==='FAIL')?'FAIL':incomplete.length?'BLOCKED':'PASS',receipts.flatMap(c=>c.evidence).concat(incomplete.length?['acceptance-ledger.jsonl']:[]),incomplete.length?'Not accepted: '+incomplete.map(c=>`${c.caseId} ${c.result}`).join(', '):reason);}
function disposition(text,kind,reason,caseIds){const receipts=caseIds.split(' ').map(id=>{const c=cases.find(x=>x.caseId===id);assert.ok(c);return c;});const incomplete=receipts.filter(c=>!['PASS','CONDITIONAL_NOT_OFFERED'].includes(c.result));assign(text,kind,incomplete.length?'BLOCKED':'DISPOSITIONED',receipts.flatMap(c=>c.evidence).concat(incomplete.length?['acceptance-ledger.jsonl']:[]),incomplete.length?'Scope exclusion still requires evidence: '+incomplete.map(c=>c.caseId).join(', '):reason);}
for(const file of ['navigation','configuration','clinic-staff','public-page','operational','account-recovery','consumer-support','admin-remaining','partner-fields','clinic-navigation','preview-contacts','publication-recovery','terminal-claim','diagnostic-revocation','clinic-empty-team','legacy-upgrade','program-capacity']){const path=`controls/${file}.json`;if(!fs.existsSync(root+'/'+path))continue;const report=JSON.parse(fs.readFileSync(root+'/'+path));if(report.result!=='PASS')continue;for(const proof of report.proofs)assign(proof.ids.join(' '),proof.conditional?'CONDITIONAL_NOT_OFFERED':'IMPLEMENTED_AND_VERIFIED',proof.conditional?'DISPOSITIONED':'PASS',[path],proof.action);}
verify('A02-15','A-T04','Actual canonical creation and exact replay yield one workspace.');
disposition('A01-06','REMOVED_FROM_NORMAL_UX','Optional row menu is not retained; Open program is the single current record destination.','A-T02');
disposition('A02-06','REMOVED_FROM_NORMAL_UX','Organization classification is not required to create a managed screening program.','A-T04');
disposition('A02-08','CONSOLIDATED_TO:A04-06','Primary contact editing belongs to the saved program contact collection; creation captures only the necessary administrator recipient for partner-managed access.','A-T12 A-T38');
disposition('A02-10','CONSOLIDATED_TO:A04-15','Counties are optional saved Configure details; they do not silently grant jurisdictions.','A-T13');
disposition('A02-11','CONSOLIDATED_TO:A04-24','Approved public description is configured and reviewed in the existing Participant Page workflow.','A-T10');
verify('A03-01 A03-04 A03-05 A03-08 A03-09 A03-10 P00-01 P00-03 P00-05 P00-07','A-T38 P-T01 P-T02 P-T03','Actual invitation, SMTP delivery, recipient authentication, replacement, revocation and replay evidence.');
verify('A03-02 A03-03','A-T38','Administrator identity entered in actual creation and read in the reviewed invitation; scoped recipient membership read back.');
verify('P00-02 P00-04','P-T01 P-T10','Actual account/password setup and recipient verification, not fabricated browser authentication.');
verify('P00-08','P-T03','Invalid invitation gives an actual support address and creates no membership.');
verify('A04-06 A04-34 A04-35','A-T12','Actual collection additions/removal preserve stable contact identities and reject ambiguous roles.');
verify('A04-07','A-T06 A-T08 A-T09','Draft choice and persisted operator transition work; genuine rights remain protected.');
verify('A04-13 A04-37','A-T13 P-T06','Actual multistate checkboxes/chips persist exact scope and reject unauthorized additions.');
verify('A04-17','A-T15','Disable and re-enable Spanish through Save preserves source-matched copy.');
verify('A04-18','P-T07','The same canonical access-policy field persists open, code, and partner-directed values without granting packet funding.');
verify('A04-36','A-T14','Actual geography discrepancy action changes the description to the selected states only.');
verify('A04-40 A05-02 A05-03 A05-04 A05-05 A05-08','A-T16 A-T17 A-T18 A-T19 A-T20 A-T25 A-T26 A-T28','Actual Save/Update workflow includes provider success and stage-specific failure/retry; current-material viewing makes no generation request.');
verify('A05-01','A-T21','Held in-flight preparation and concurrent actual Save expose truthful busy state and source conflict; no stale completion is accepted.');
disposition('A04-27..33 P01-27','CONSOLIDATED_TO:A05-04','Routine seven-field manual translation assignment removed. One Save/Update prepares source-bound Spanish for one final bilingual review.','A-T16 P-T08');
disposition('A04-38','CONDITIONAL_NOT_OFFERED','Optional separate Spanish editing workflow is not offered; automatic source-bound preparation and final review are the supported path.','A-T16 P-T08');
disposition('A04-42','REMOVED_FROM_NORMAL_UX','Optional Reset unsaved changes button is not retained. Draft conflicts preserve edits and offer explicit field reconciliation.','A-T22');
disposition('A05-06','CONSOLIDATED_TO:A07-09','Specific unresolved cause and its direct action are shown in the same Final Review; no extra diagnostics button for ordinary preparation.','A-T17 A-T33');
disposition('A05-07','CONDITIONAL_NOT_OFFERED','Optional standard-copy replacement is not offered. Provider failures preserve custom English and expose retry.','A-T17 A-T18');
verify('A06-01..08 A06-11 A06-12','A-T23 A-T24 A-T25 A-T27','Real exact-version documents, both direct View controls, bilingual preview, viewport controls and labeled incomplete draft are tested.');
verify('A06-13','A-T34','Actual Configure action restores editor focus from the continuous workspace.');
verify('A07-01..08','A-T29 A-T30 A-T31 A-T32','Final review follows current documents; exact scope/version confirmation is invalidated by edits and protected publication is idempotent.');
verify('A07-09','A-T33','A current but unauthorized program exposes its specific authority action; no silently disabled Start substitute.');
verify('A08-06 A08-07','A-T34','Published authoritative activity and actual Configure navigation remain in the same workspace.');
disposition('A08-08..10','CONDITIONAL_NOT_OFFERED','Optional program pause/resume/close is not offered by the current ordinary publication service. Clinic lifecycle remains independently supported.','A-T34 C-T10');
verify('A09-02 A09-08..13','A-T36','Scoped business decision selection, grant and revocation are actual UI operations; protected legal/financial requirements remain.');
verify('A09-03..06 A09-14..19 A09-28','P-T13','Actual private supporting PDF inspection/review, qualification, limited-service policy and expiring delegation are read back before partner publication. No signatures or funding are invented.');
assign('A09-20..24','ADVANCED_ONLY','BLOCKED',cases.find(c=>c.caseId==='U-T17').evidence,'Funded allocation positive acceptance requires genuine isolated financial evidence. Available synthetic authorization rows are not accepted as funding.');
assign('A09-26','ADVANCED_ONLY','BLOCKED',cases.find(c=>c.caseId==='A-T37').evidence,'Missing-document and signature safeguards passed. No genuine new executed isolated agreement is available for positive recording acceptance.');
verify('P01-01..09 P01-19 P01-28','P-T04 P-T05 P-T09 P-T11 P-T12','Actual five-step navigation, back/continue, optional team skip, confirmation and dashboard controls retain scoped saved state.');
verify('P01-12..18','P-T05 P-T08','Organization settings and current public identity were edited, saved and read back through actual partner controls.');
verify('P01-20','P-T06','Partner may reduce and restore the permitted multistate set; cannot add another state through a forged request.');
verify('P01-23 P01-26','P-T07','Access choices and funding readback stay distinct; access policy grants no packet benefit.');
verify('P01-25 P01-29..32','P-T08','Source-matched Spanish preparation and both exact-version preview documents are accessible through partner review.');
verify('P01-33','P-T11 P-T14','Partner factual confirmation saves exact materials while actual external authority still blocks publication.');
verify('P01-34 P01-35 P00-06','P-T13 P-T15','Scoped delegated authority permits one real protected partner Start and navigation to live dashboard.');
verify('P02-01 P02-03 P02-05..07 P03-01 P03-05 P03-06','P-T16 P-T10','Actual role navigation reaches distinct authorized pages; team invitations grant only scoped membership and Clinic permissions remain separate.');
verify('P02-04','P-T16','The actual Activity & Reporting destination is aggregate-only and role-scoped.');
disposition('P02-02 P02-20 P02-21','CONSOLIDATED_TO:P02-04','Activity & Reporting is the honest aggregate program destination. It exposes neither private participant matters nor an invented export.','P-T16 P-T19');
verify('P02-09','P-T17','Unpublished program gives a state-correct continuation action without pretending it is live.');
verify('P02-15..19','P-T15 P-T17','Authoritative aggregate counts and screening/funding availability are shown for both unpublished and live states.');
verify('P03-02..04','P-T10','Actual staff invitation reaches isolated mailbox, is accepted by the recipient, and creates only fixed-role membership.');
disposition('P03-07','CONDITIONAL_NOT_OFFERED','Optional partner-side staff resend/revoke controls are not advertised by this membership service; event grant revocation is separate and tested.','P-T10 C-T06');
verify('P04-01','P-T07','Code requirement is a canonical saved access policy, not a hidden code-manager side effect.');
verify('P04-02..12 P04-14','P-T18 U-T05 U-T06','Actual scoped code creation, bounded usage, disable, protected reactivation and one-redemption replay are evidenced; no funding is inferred.');
verify('P04-13','U-T05','One-time raw code copy is exercised and raw code disappears after refresh.');
verify('C00-02..05 C01-01..09 C01-12','C-T01 C-T02 C-T03 C-T04','Actual scoped event creation, timezone/date validation, authorized state set, capacity and draft readback.');
verify('C00-06','C-T11','Actual assigned-staff navigation reflects current permission grants.');
disposition('C00-07','CONSOLIDATED_TO:C00-03','One Create clinic event form is available in the index, including the empty state.','C-T01');
assign('C01-10 C01-11','CONDITIONAL_NOT_OFFERED','BLOCKED',cases.find(c=>c.caseId==='U-T17').evidence,'No genuine isolated sponsor allocation is available; screening-only event creation correctly omits the sponsorship limit.');
verify('C02-02..04','C-T11','Every current role-visible queue, follow-up and reporting link was followed under the assigned staff session.');
verify('C02-05 C02-06 C04-01 C04-06','C-T07 C-T09 C-T12','Actual reveal-once code and explicit Open clinic lead to its live entry; code/participant records are read back.');
verify('C02-07..10','C-T08 C-T10','Actual pause/resume/close/archive persist; paused and closed requests cannot redeem unspent codes.');
disposition('C02-12 C10-01..09','CONDITIONAL_NOT_OFFERED','Specialized legal-aid registration is not advertised for the standard RCAP event, and its protected setup route returns 404. No specialized-mode acceptance is claimed.','C-T23');
verify('C05-01..08','C-T12 C-T14 C-T15 C-T16','Actual event code, account verification, fixed state, staff selection and explicit consent lead to authenticated assistance; withheld consent and forged state are refused.');
disposition('C05-09','CONDITIONAL_NOT_OFFERED','Optional unassisted event bypass is not offered by this consent-required Clinic mode. Ordinary public screening remains separate.','C-T15');
verify('C06-01..04','C-T17 C-T18','Actual event queue reflects owned consent-scoped case and transitions; packet status is derived from genuine artifacts.');
assign('C06-05','IMPLEMENTED_AND_VERIFIED','BLOCKED',cases.find(c=>c.caseId==='C-T18').evidence,'Forged packet preparation is denied. A real sponsored delivered Clinic packet is required to verify the positive prepared transition.');
verify('C07-01..09','C-T19','Actual consent-scoped follow-up selection, save, exact retry and completion persist one record without pretending contact was sent.');
disposition('C07-10','CONDITIONAL_NOT_OFFERED','Optional editing of completed follow-up is not advertised. Actual scheduling and completion preserve audit.','C-T19');
verify('C08-01 C08-02','C-T20','Real authorized aggregate event reporting exposes no participant-owned private documents.');
disposition('C08-03 C08-04','CONDITIONAL_NOT_OFFERED','Unimplemented report filters and exports are not advertised as functioning controls.','C-T20');
verify('C09-01..05','C-T21 C-T22 U-T22 U-T23','Real authenticated session reset, retry/recovery and privacy lock prevent prior participant data on back navigation or next participant use.');
verify('U01-06','U-T03','Published current program CTA leads to the actual authorized intake.');
verify('U02-01..04 U02-11','U-T02 U-T03 U-T04','Current co-branded intake, jurisdiction picker and inactive/forged-state denials use server authorization.');
verify('U02-05..07 U02-12','U-T05 U-T06','Actual code failure, scoped reactivation, one-use replay and safe consumer alternative work in the mobile Spanish journey.');
verify('U02-08 U02-09','U-T08 U-T09','Actual saved-result account/sign-in continuation retains exactly the intended result.');
verify('U03-01 U03-02 U03-04..06','U-T07 U-T08 U-T09','Actual nationwide engine questions, answer review/result and saved-result continuation are exercised.');
disposition('U03-08','CONDITIONAL_NOT_OFFERED','Durable saved matter requires a verified account; no unsupported save-without-account action is advertised.','U-T08');
verify('U03-09 U06-06','U-T15','A real unsupported federal result displays explanatory guidance with no checkout or packet promise.');
verify('U04-01..03 U04-06 U04-07 U04-09','U-T08 U-T09 U-T10 U-T11','Actual new/existing account, email verification, interrupted continuation and idempotent owned-result claim.');
verify('U05-01..04 U05-06 U05-07 U06-01..05 U06-07','U-T12 U-T13 U-T14 U-T16','Owned Briefcase, canonical packet fields and edit/review invalidate stale verification and respect actual route/service eligibility.');
assign('U07-01 U07-02','IMPLEMENTED_AND_VERIFIED','BLOCKED',cases.find(c=>c.caseId==='U-T17').evidence,'No genuinely funded isolated sponsor allocation: positive sponsored generation is not claimed.');
verify('U07-03..08 U07-10 U08-07','U-T18 U-T19 U-T20 U-T21','Actual Stripe TEST settlement, signed event replay, worker recovery and private downloaded PDF readback use the same paid matter without a second charge.');
verify('U08-02..05','C-T14 C-T21 C-T22 U-T10','Explicit assisted consent, real session revocation, shared-device exit and authenticated result/matter continuation.');
disposition('A03-12','CONSOLIDATED_TO:A03-14','Admin navigation returns to the exact authorized program dashboard; it never pretends to be the invited Partner Admin.','A-T38');
disposition('A08-12','CONSOLIDATED_TO:A08-07','Configure is the single program-settings destination.','A-T34');
disposition('A08-03','REMOVED_FROM_NORMAL_UX','Optional launch-kit/QR download is not advertised in the ordinary workspace. Live participant link copy remains available; no unverified artifact is promised.','A-T34');
disposition('C04-08','CONDITIONAL_NOT_OFFERED','Optional code revocation is not exposed by this event-code service. Event lifecycle still revokes entry and code expiry/usage are enforced.','C-T08 C-T13');
disposition('C02-11','CONDITIONAL_NOT_OFFERED','The standard Clinic does not offer an unconfigured Legal Aid workflow; its direct route is protected and its ordinary event controls remain visible.','C-T23');
// Every control remains explicitly accountable, even where evidence is incomplete.
for(const row of rows){if(!row.disposition){row.disposition='FAIL';row.result='VERIFICATION_PENDING';row.acceptanceReason='No individual browser-action proof or explicit conditional disposition has yet been recorded. A passing related scenario is insufficient.';}row.reviewedBy='implementation_agent';row.independentBlindReview=false;}
fs.writeFileSync(root+'/control-ledger.jsonl',rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
const tally=rows.reduce((a,r)=>(a[r.result]=(a[r.result]??0)+1,a),{});console.log(JSON.stringify({controls:rows.length,tally,pending:rows.filter(x=>x.result==='VERIFICATION_PENDING').map(x=>x.controlId)}));
