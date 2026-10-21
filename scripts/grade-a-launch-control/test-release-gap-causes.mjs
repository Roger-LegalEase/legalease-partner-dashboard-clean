import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';import {groupReleaseGapCauses as group} from './release-gap-causes.mjs';
const gap=(dimension,reason)=>({familyId:'exact',obligationKey:'route',dimension,reason});
const gaps=[gap('runtime_product_reachability','No unambiguous exact runtime route mapping.'),gap('output_approval','Exact route fulfillment record absent or ambiguous.'),gap('fulfillment_authority','Exact route fulfillment record absent or ambiguous.'),gap('hosted_acceptance','No hosted proof'),gap('production_readiness','No production proof')];
let count=0;const r=group(gaps);assert.equal(r.repairCount,null);assert.equal(r.newTasksCreated,0);assert.ok(r.causeGroups.every(g=>g.status==='UNPROVEN'));count++;
const rec=r.causeGroups.find(g=>g.id==='EXACT_FULFILLMENT_RECORD');assert.equal(rec.affectedRouteOrObligationCount,1);assert.equal(rec.uniqueGapCount,2);count++;
const dup=group([...gaps,gaps[0]]);assert.equal(dup.duplicateGapEntries,1);assert.deepEqual(dup.causeGroups,r.causeGroups);count++;
assert.equal(group([gap('runtime_product_reachability','Native runtime gates: renderer legacy_retired')]).causeGroups[0].status,'UNPROVEN');count++;
assert.equal(group([gap('runtime_product_reachability','No exact native runtime proof of GUIDANCE_READY treatment delivery or exclusion')]).causeGroups[0].id,'NONPACKET_TREATMENT_PROOF');count++;
assert.equal(group([gap('output_approval','Approval artifact hash does not bind a current family packet report.')]).causeGroups[0].id,'APPROVED_ARTIFACT_BINDING');count++;
assert.deepEqual(group(gaps).externalDependencies,[]);count++;
const serviceReview={status:'FAILED_CURRENT_SERVICE_PREFLIGHT',serviceOnly:true,releaseAuthorityGranted:false,runId:34843210160,findings:{supabase:{managementProjectListHttpStatus:401,acceptanceProjectSelectHttpStatus:401},vercel:{reason:'PINNED_TEAM_NOT_VISIBLE'}}};
assert.equal(group([],{serviceReview}).externalDependencies.length,2);count++;
assert.equal(group([],{serviceReview:{...serviceReview,status:'PASS'}}).externalDependencies.length,0);count++;
assert.equal(group([],{serviceReview:{...serviceReview,releaseAuthorityGranted:true}}).externalDependencies.length,0);count++;
const ncInquiry={status:'NOT_SENT',familyId:'composed-treatment:nc_146_dismissal_petition'};
assert.equal(group([{...gap('terminal_treatment','exact application missing'),familyId:ncInquiry.familyId}],{ncInquiry}).externalDependencies[0].status,'OWNER_CONTACT_PENDING');count++;
assert.equal(group([],{ncInquiry}).externalDependencies.length,0);count++;
assert.equal(group([],{ncInquiry:{status:'SENT',familyId:'composed-treatment:nc_146_dismissal_petition'}}).externalDependencies.length,0);count++;
assert.equal(group(gaps).createsApproval,false);count++;

const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const original={schemaVersion:'rcap-vercel-identity-recheck/v1',operation:'VERCEL_IDENTITY_ONLY',runId:'123',toolsSha:'a'.repeat(40),passed:true,teamPaginationExhausted:true,identity:{teamSlug:'roger947s-projects',teamId:'team_test',projectName:'legalease-partner-dashboard-clean',projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV'},reads:[{endpoint:'VERCEL_TEAMS',httpStatus:200,nextPagePresent:false},{endpoint:'VERCEL_PINNED_PROJECT',httpStatus:200}],mutations:Object.fromEntries(['deploy','migration','auth','stripe','worker','browser','supabase','productionInspection'].map(k=>[k,false])),candidateAcceptance:false};
function successor(mutate=()=>{},reviewMutate=()=>{},changeBytes=false){const o=structuredClone(original);mutate(o);const raw=Buffer.from(JSON.stringify(o)),archive=Buffer.from('synthetic archive');const review={schemaVersion:'rcap-vercel-identity-independent-review/v1',custodyVerified:true,runId:'123',toolsSha:'a'.repeat(40),candidateAcceptance:false,mutationOccurred:false,paginationComplete:o.teamPaginationExhausted,outcome:o.passed?'IDENTITY_PASS':o.failure.reason==='PINNED_TEAM_NOT_VISIBLE'?'PINNED_TEAM_NOT_VISIBLE_COMPLETE_PAGINATION':'IDENTITY_LOOKUP_FAILED',originalReceipt:{path:'private/transfers/original.json',sha256:digest(raw)},archive:{path:'private/transfers/original.zip',sha256:digest(archive)}};reviewMutate(review);return group([],{serviceReview,vercelReview:review,vercelReviewPath:'review.json',readSuccessorBytes:p=>p.endsWith('.json')?(changeBytes?Buffer.from('changed'):raw):archive});}
assert.equal(successor().externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'IDENTITY_VERIFIED_ONLY');count++;
assert.equal(successor(o=>{o.passed=false;o.identity=null;o.reads.pop();o.failure={reason:'PINNED_TEAM_NOT_VISIBLE'};}).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'TEAM_NOT_VISIBLE_AFTER_COMPLETE_LOOKUP');count++;
assert.equal(successor(o=>{o.passed=false;o.identity=null;o.teamPaginationExhausted=false;o.failure={reason:'HTTP_FORBIDDEN'};}).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'IDENTITY_LOOKUP_FAILED');count++;
for(const mutate of [o=>o.identity.projectId='sibling',o=>o.identity.projectName='sibling',o=>o.candidateAcceptance=true,o=>o.mutations.deploy=true,o=>o.runId='456',o=>o.toolsSha='b'.repeat(40),o=>o.teamPaginationExhausted=false]){assert.equal(successor(mutate).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'ACCESS_OR_LOOKUP_UNRESOLVED');count++;}
for(const mutate of [r=>r.custodyVerified=false,r=>r.archive.sha256='0'.repeat(64),r=>r.originalReceipt.path='private/transfers/../escape.json']){assert.equal(successor(()=>{},mutate).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'ACCESS_OR_LOOKUP_UNRESOLVED');count++;}
assert.equal(successor(()=>{},()=>{},true).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'ACCESS_OR_LOOKUP_UNRESOLVED');count++;
const pinnedReceipt = o => {
  delete o.teamPaginationExhausted;
  o.teamIdentitySource='canonical_pin';
  o.identity.teamId='team_4qLmZK9WI6xIy5vjYC0IF3ae';
  o.reads=[{endpoint:'VERCEL_PINNED_PROJECT',httpStatus:200}];
};
const pinnedReview = r => { delete r.paginationComplete; r.teamIdentitySource='canonical_pin'; };
assert.equal(successor(pinnedReceipt,pinnedReview).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'IDENTITY_VERIFIED_ONLY');count++;
for (const mutate of [o=>o.identity.teamId='team_other',o=>o.identity.projectId='prj_other',o=>o.reads[0].httpStatus=403,o=>o.reads.push({endpoint:'VERCEL_TEAMS',httpStatus:200}),o=>o.mutations.deploy=true]) {
  assert.equal(successor(o=>{pinnedReceipt(o);mutate(o);},pinnedReview).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'ACCESS_OR_LOOKUP_UNRESOLVED');count++;
}
assert.equal(successor(pinnedReceipt).externalDependencies.find(g=>g.id==='VERCEL_TEAM_LOOKUP').status,'ACCESS_OR_LOOKUP_UNRESOLVED');count++;
const recognized={familyId:'wy_fel_1502-set',evidenceBindings:{artifactReport:{bytesVerified:true,path:'report'}},routes:[{dimensions:{output_approval:{status:'SATISFIED'},fulfillment_authority:{status:'SATISFIED'}}}]};
assert.equal(group([],{reconciledFamilies:[recognized]}).recognizedExistingBindings.length,1);count++;
assert.equal(group([],{reconciledFamilies:[{...recognized,evidenceBindings:{artifactReport:{bytesVerified:false}}}]}).recognizedExistingBindings.length,0);count++;
assert.equal(group([],{reconciledFamilies:[{...recognized,familyId:'sibling'}]}).recognizedExistingBindings.length,0);count++;
console.log(`${count} shared-cause grouping controls PASS; no repair count or runtime defects inferred.`);
// Bind the actual owner clarification to current native identities, without regeneration.
const fs = await import('node:fs');
const scopePath='data/record-clearing/legal-decisions/2026-09-14-nc-146-core-and-conditional-dna-scope.json';
const queueBytes=fs.readFileSync('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json');
const queue=JSON.parse(queueBytes);const owner=JSON.parse(fs.readFileSync(scopePath));
const nativeFamilies=queue.families.map(f=>({familyId:f.familyId,disposition:f.state,terminal:f.state==='COMPLETE_PACKET_PROVEN',routeKeys:f.routeKeys,evidenceBindings:{sourceHashes:f.sourceHashes,selectedIndependentVerdict:f.selectedIndependentVerdict}}));
const ncGap={familyId:owner.supplement.familyId,obligationKey:owner.supplement.routeKey,dimension:'terminal_treatment',reason:'Native supplement remains source-ready'};
const scopeArgs={ncOwnerScope:owner,ncOwnerScopePath:scopePath,currentQueueSha256:digest(queueBytes),reconciledFamilies:nativeFamilies,readScopeBaselineBytes:b=>execFileSync('git',['show',`${b.commitSha}:${b.queuePath}`],{maxBuffer:64*1024*1024})};
assert.equal(group([ncGap],{...scopeArgs,currentQueueSha256:'a'.repeat(64),readScopeBaselineBytes:undefined}).ncCoreAndConditionalSupplement,null);
assert.equal(group([ncGap],{...scopeArgs,currentQueueSha256:'a'.repeat(64)}).ncCoreAndConditionalSupplement.status,'BOUND_OWNER_PRODUCT_SCOPE');
assert.equal(group([ncGap],{...scopeArgs,currentQueueSha256:'a'.repeat(64),readScopeBaselineBytes:()=>Buffer.from('tampered')}).ncCoreAndConditionalSupplement,null);
const scoped=group([ncGap],scopeArgs);assert.equal(scoped.ncCoreAndConditionalSupplement.status,'BOUND_OWNER_PRODUCT_SCOPE');assert.equal(scoped.causeGroups[0].id,'CONDITIONAL_DNA_INSTRUMENT');
for(const mutate of [o=>o.coreFamilies[0].familyId='sibling',o=>o.coreFamilies[0].selectedIndependentVerdict.verifiedAtBase='changed',o=>o.supplement.blocksCoreExpunction=true,o=>o.supplement.routeKey='sibling',o=>o.baseline.queueSha256='0'.repeat(64)]){const ncOwnerScope=structuredClone(owner);mutate(ncOwnerScope);assert.equal(group([ncGap],{...scopeArgs,ncOwnerScope}).ncCoreAndConditionalSupplement,null);}
const reviewPath='data/rcap-grade-a/participant-data-rights/vercel-identity-independent-review-20260914.json';
const verified=group([],{vercelReview:JSON.parse(fs.readFileSync(reviewPath)),vercelReviewPath:reviewPath,readSuccessorBytes:p=>fs.readFileSync(p)});
assert.equal(verified.externalDependencies[0].status,'TEAM_NOT_VISIBLE_AFTER_COMPLETE_LOOKUP');
console.log('10 actual NC/Vercel scope and historical binding controls PASS; native statuses untouched.');
