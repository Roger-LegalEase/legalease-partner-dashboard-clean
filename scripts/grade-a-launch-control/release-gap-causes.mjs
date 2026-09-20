import { verifiedCurrentServicePreflight } from './verified-current-service-preflight.mjs';
import crypto from 'node:crypto';
import { HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID, HOSTED_VERCEL_PROJECT_NAME, HOSTED_VERCEL_TEAM_SLUG } from '../rcap-hosted-acceptance-vercel-identity.mjs';
// Descriptive aggregation of existing evidence gaps, never a repair/task count.
const classify = gap => {
  if (gap.dimension === 'terminal_treatment') return ['FAMILY_INPUT_PREREQUISITE', 'UNRESOLVED', 'Resolve the exact remaining family input.'];
  if (gap.dimension === 'hosted_acceptance') return ['HOSTED_ACCEPTANCE', 'UNPROVEN', 'Execute and independently accept the current hosted candidate; repeated route entries share this acceptance work.'];
  if (gap.dimension === 'production_readiness') return ['PRODUCTION_READINESS', 'UNPROVEN', 'Current Production evidence and exact authorization remain separate; no deployment action is implied.'];
  if (gap.dimension === 'runtime_product_reachability') {
    if (/runtime route mapping|native launch-graph row/.test(gap.reason)) return ['RUNTIME_ROUTE_BINDING', 'UNPROVEN', 'Reconcile exact route identity with existing runtime evidence before deciding whether implementation is missing.'];
    if (/does not bind this exact family/.test(gap.reason)) return ['RUNTIME_FAMILY_BINDING', 'UNPROVEN', 'Resolve the exact route-to-family proof mismatch; do not infer authority from a sibling.'];
    if (/treatment delivery or exclusion/.test(gap.reason)) return ['NONPACKET_TREATMENT_PROOF', 'UNPROVEN', 'Prove the adopted guidance, handoff, or exclusion behavior; no packet-sale requirement is created.'];
    return ['NATIVE_RUNTIME_GATE', 'UNPROVEN', 'Inspect the named native gate. A retired or guidance-only renderer is not by itself evidence of a product defect.'];
  }
  if (['output_approval','fulfillment_authority'].includes(gap.dimension)) {
    if (/record absent or ambiguous/.test(gap.reason)) return ['EXACT_FULFILLMENT_RECORD', 'UNPROVEN', 'Find and bind existing exact-route evidence or identify the genuinely missing approval. Absence of a record does not prove absence of a legal decision.'];
    if (/Approval artifact hash/.test(gap.reason) || /"currentArtifact":false/.test(gap.reason)) return ['APPROVED_ARTIFACT_BINDING', 'UNRESOLVED', 'Compare approved and saved artifact identities. Reuse valid evidence where identical; changed shipping bytes require the applicable owner re-review, never a blind repin.'];
    return ['EXISTING_NATIVE_AUTHORITY_GAP', 'UNRESOLVED', 'Resolve the specific native refusal or incomplete evidence; keep revocations and approval scope intact.'];
  }
  return ['OTHER_EXACT_GAP', 'UNPROVEN', 'Inspect the existing exact gap; no new task or defect is inferred.'];
};
export function groupReleaseGapCauses(gaps, { serviceReview = null, serviceReviewPath = null, ncInquiry = null, ncInquiryPath = null, vercelReview = null, vercelReviewPath = null, readSuccessorBytes = null, reconciledFamilies = [], ncOwnerScope = null, ncOwnerScopePath = null, currentQueueSha256 = null, readScopeBaselineBytes = null, supabaseReview = null, supabaseReviewPath = null, currentServiceReview = null } = {}) {
  const ncCoreAndConditionalSupplement = validatedNcScope(ncOwnerScope, ncOwnerScopePath, currentQueueSha256, reconciledFamilies, readScopeBaselineBytes);
  const groups = new Map(), seen = new Set();
  let duplicates = 0;
  gaps.forEach((gap, index) => {
    const identity = JSON.stringify([gap.familyId,gap.obligationKey,gap.runtimeRouteId,gap.dimension,gap.reason]);
    if (seen.has(identity)) { duplicates++; return; } seen.add(identity);
    const [id,status,nextStep] = ncCoreAndConditionalSupplement && gap.familyId === ncCoreAndConditionalSupplement.supplement.familyId && gap.dimension === 'terminal_treatment'
      ? ['CONDITIONAL_DNA_INSTRUMENT', 'UNRESOLVED', 'The conditional DNA supplement needs its participant instrument or authoritative acceptance procedure; it does not block the already-terminal NC core expunction families.'] : classify(gap);
    if (!groups.has(id)) groups.set(id,{id,status,nextStep,gapIndexes:[],families:new Set(),routes:new Set(),dimensions:new Set()});
    const g=groups.get(id);g.gapIndexes.push(index);g.families.add(gap.familyId);g.routes.add(gap.obligationKey ?? gap.runtimeRouteId ?? gap.familyId);g.dimensions.add(gap.dimension);
  });
  const causeGroups=[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(({families,routes,dimensions,...g})=>({...g,affectedFamilyCount:families.size,affectedRouteOrObligationCount:routes.size,dimensions:[...dimensions].sort(),uniqueGapCount:g.gapIndexes.length}));
  const externalDependencies=[];
  const currentService = verifiedCurrentServicePreflight(currentServiceReview, readSuccessorBytes);
  const serviceSuccessor = (id, service) => currentService ? {id,service,status:"SERVICE_PREFLIGHT_PASSED_ONLY",runId:currentService.runId,evidence:currentService.review,passedChecks:currentService.services[service].passedChecks,candidateAcceptance:false,migrationAuthorized:false,releaseAuthorityGranted:false,meaning:"Current service access and designed boundary checks verified; no application, worker or participant acceptance."} : null;
  const supabaseSuccessor = serviceSuccessor("SUPABASE_ACCEPTANCE_ACCESS", "supabase") ?? verifiedSupabaseServiceSuccessor(supabaseReview, supabaseReviewPath, readSuccessorBytes);
  const vercelSuccessor = serviceSuccessor("VERCEL_TEAM_LOOKUP", "vercel") ?? verifiedVercelSuccessor(vercelReview, vercelReviewPath, readSuccessorBytes);
  if (serviceReview?.status === 'FAILED_CURRENT_SERVICE_PREFLIGHT' && serviceReview.serviceOnly === true && serviceReview.releaseAuthorityGranted === false) {
    if (!supabaseSuccessor && serviceReview.findings?.supabase?.managementProjectListHttpStatus === 401 && serviceReview.findings?.supabase?.acceptanceProjectSelectHttpStatus === 401) externalDependencies.push({id:'SUPABASE_ACCEPTANCE_ACCESS',status:'OBSERVED_FAILED_ACCESS',evidence:serviceReviewPath,runId:serviceReview.runId,meaning:'One credential/access cause underlies multiple failed preflight checks; project and SQL safety checks remain unproven, not separately diagnosed defects.',nextStep:serviceReview.findings.supabase.intervention});
    if (!vercelSuccessor && serviceReview.findings?.vercel?.reason === 'PINNED_TEAM_NOT_VISIBLE') externalDependencies.push({id:'VERCEL_TEAM_LOOKUP',status:'ACCESS_OR_LOOKUP_UNRESOLVED',evidence:serviceReviewPath,runId:serviceReview.runId,meaning:'One-page team absence cannot establish lost access. Any subsequent resolver repair still needs the applicable retest.',nextStep:serviceReview.findings.vercel.intervention});
  }
  if (supabaseSuccessor) externalDependencies.push(supabaseSuccessor);
  if (vercelSuccessor) externalDependencies.push(vercelSuccessor);
  if (ncInquiry?.status === 'NOT_SENT' && ncInquiry.familyId === 'composed-treatment:nc_146_dismissal_petition' && gaps.some(g => g.familyId === ncInquiry.familyId && g.dimension === 'terminal_treatment')) externalDependencies.push({id:'NC_INSTITUTIONAL_INPUT',status:'OWNER_CONTACT_PENDING',evidence:ncInquiryPath,meaning:ncCoreAndConditionalSupplement ? 'Conditional DNA supplement instrument/procedure remains unresolved; core expunction is terminal. The inquiry stays unsent for owner contact with NCAOC; no agent contact is authorized.' : 'The exact application/acceptance-procedure question remains unanswered. The inquiry stays unsent; the owner will contact NCAOC. No agent contact is authorized.'});
  const recognizedExistingBindings = reconciledFamilies.filter(f => ['wy_fel_1502-set','dc_innocence_expungement-set'].includes(f.familyId)
    && f.evidenceBindings?.artifactReport?.bytesVerified === true && f.routes?.length > 0
    && f.routes.every(r => r.dimensions?.output_approval?.status === 'SATISFIED' && r.dimensions?.fulfillment_authority?.status === 'SATISFIED'))
    .map(f => ({familyId:f.familyId,status:'EXISTING_EVIDENCE_BOUND',artifactReport:f.evidenceBindings.artifactReport.path,meaning:'Existing approved native artifact evidence is now recognized by the report adapter; no approval or packet bytes were changed.'})).sort((a,b)=>a.familyId.localeCompare(b.familyId));
  return {ncCoreAndConditionalSupplement,recognizedExistingBindings,schemaVersion:'rcap-release-shared-causes/v1',meaning:'Cause groups summarize existing gaps; dimensions and affected routes are not additive repair counts. UNPROVEN means evidence is absent or not bound, not an established runtime defect.',repairCount:null,newTasksCreated:0,sourceGapCount:gaps.length,uniqueGapCount:seen.size,duplicateGapEntries:duplicates,causeGroups,externalDependencies,createsApproval:false};
}

function verifiedVercelSuccessor(review, reviewPath, readBytes) {
  if (!review || typeof readBytes !== 'function') return null;
  if (review.schemaVersion !== 'rcap-vercel-identity-independent-review/v1' || review.custodyVerified !== true || review.candidateAcceptance !== false || review.mutationOccurred !== false) return null;
  try {
    const load = ref => {
      if (!ref || typeof ref.path !== 'string' || !ref.path.startsWith('private/transfers/') || ref.path.includes('\\') || ref.path.split('/').some(s=>['','.','..'].includes(s)) || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) throw Error('Invalid custody reference');
      const bytes = readBytes(ref.path);
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw Error('Changed custody bytes');
      return bytes;
    };
    const original = JSON.parse(load(review.originalReceipt)); load(review.archive);
    if (original.schemaVersion !== 'rcap-vercel-identity-recheck/v1' || original.operation !== 'VERCEL_IDENTITY_ONLY' || original.candidateAcceptance !== false || String(original.runId) !== String(review.runId) || !/^\d+$/.test(String(review.runId)) || !/^[a-f0-9]{40}$/.test(review.toolsSha ?? '') || original.toolsSha !== review.toolsSha) return null;
    const mutationKeys=['deploy','migration','auth','stripe','worker','browser','supabase','productionInspection'];
    if (Object.keys(original.mutations ?? {}).length !== mutationKeys.length || mutationKeys.some(k=>original.mutations[k] !== false)) return null;
    if (review.paginationComplete !== original.teamPaginationExhausted || !Array.isArray(original.reads) || original.reads.some(r=>!['VERCEL_TEAMS','VERCEL_PINNED_PROJECT'].includes(r.endpoint))) return null;
    const common={id:'VERCEL_TEAM_LOOKUP',evidence:reviewPath,runId:review.runId,identityOnly:true,candidateAcceptance:false};
    if (original.teamIdentitySource === 'canonical_pin') {
      if (review.teamIdentitySource !== 'canonical_pin' || original.teamPaginationExhausted !== undefined || review.paginationComplete !== undefined) return null;
      if (review.outcome === 'IDENTITY_PASS' && original.passed === true
          && original.identity?.teamSlug === HOSTED_VERCEL_TEAM_SLUG
          && original.identity.teamId === HOSTED_VERCEL_TEAM_ID
          && original.identity.projectId === HOSTED_VERCEL_PROJECT_ID
          && original.identity.projectName === HOSTED_VERCEL_PROJECT_NAME
          && original.reads.length === 1 && original.reads[0].endpoint === 'VERCEL_PINNED_PROJECT' && original.reads[0].httpStatus === 200) {
        return {...common,status:'IDENTITY_VERIFIED_ONLY',meaning:'The independently reviewed scoped project read verifies the exact pinned team and project. Hosted, application, worker and Production acceptance remain unproven.'};
      }
      if (original.passed !== false) return null;
    }
    if (review.outcome === 'IDENTITY_PASS' && original.passed === true && original.teamPaginationExhausted === true && original.identity?.teamSlug === 'roger947s-projects' && typeof original.identity.teamId === 'string' && original.identity.teamId.length > 0 && original.identity.projectId === 'prj_cdgwGzFqIHgEUlzEburSLaZETdQV' && original.identity.projectName === 'legalease-partner-dashboard-clean' && original.reads.some(r=>r.endpoint==='VERCEL_PINNED_PROJECT' && r.httpStatus===200)) return {...common,status:'IDENTITY_VERIFIED_ONLY',meaning:'The independently reviewed successor resolves the prior team-lookup uncertainty. Hosted, application, worker and Production acceptance remain unproven.'};
    if (original.passed !== false) return null;
    if (review.outcome === 'PINNED_TEAM_NOT_VISIBLE_COMPLETE_PAGINATION' && original.failure?.reason === 'PINNED_TEAM_NOT_VISIBLE' && original.teamPaginationExhausted === true && original.reads.length > 0 && original.reads.every(r=>r.endpoint==='VERCEL_TEAMS' && r.httpStatus===200) && original.reads.at(-1).nextPagePresent === false) return {...common,status:'TEAM_NOT_VISIBLE_AFTER_COMPLETE_LOOKUP',meaning:'The pinned team was absent after completed pagination using this credential. Owner access/scope verification is needed; the old incomplete-pagination question is superseded.'};
    if (review.outcome === 'IDENTITY_LOOKUP_FAILED' && typeof original.failure?.reason === 'string' && original.failure.reason !== 'PINNED_TEAM_NOT_VISIBLE') return {...common,status:'IDENTITY_LOOKUP_FAILED',reason:original.failure.reason,meaning:'The successor lookup failed; team absence and hosted acceptance are not established.'};
  } catch { return null; }
  return null;
}

function validatedNcScope(record, recordPath, queueSha256, families, readBaselineBytes) {
  if (record?.schemaVersion !== 'rcap-owner-product-scope-clarification/v1' || record.status !== 'ADOPTED_OWNER_PRODUCT_SCOPE_ONLY' || record.decisionId !== 'NC-146-CORE-AND-CONDITIONAL-DNA-SCOPE-20260914' || !/^[a-f0-9]{64}$/.test(queueSha256 ?? '')) return null;
  // The owner signed a historical queue. Regenerated scheduling metadata may
  // change its current hash; authenticate that original instead of repinning it.
  if (record.baseline?.queueSha256 !== queueSha256) {
    if (typeof readBaselineBytes !== 'function' || !/^[a-f0-9]{40}$/.test(record.baseline?.commitSha ?? '')
      || record.baseline?.queuePath !== 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json') return null;
    try {
      const bytes=readBaselineBytes(record.baseline);
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== record.baseline.queueSha256) return null;
    } catch { return null; }
  }
  const ids=['nc_146_acquittal_petition-set','nc_146_dismissal_petition-set'];
  if (!Array.isArray(record.coreFamilies) || record.coreFamilies.length !== 2 || new Set(record.coreFamilies.map(f=>f.familyId)).size !== 2 || record.coreFamilies.some(f=>!ids.includes(f.familyId))) return null;
  for (const bound of record.coreFamilies) {
    const current=families.filter(f=>f.familyId===bound.familyId);
    if (current.length !== 1 || current[0].terminal !== true || current[0].disposition !== 'COMPLETE_PACKET_PROVEN' || bound.state !== current[0].disposition || JSON.stringify(bound.selectedIndependentVerdict) !== JSON.stringify(current[0].evidenceBindings?.selectedIndependentVerdict) || JSON.stringify(bound.sourceHashes) !== JSON.stringify(current[0].evidenceBindings?.sourceHashes)) return null;
  }
  const supplement=record.supplement;
  if (supplement?.familyId !== 'composed-treatment:nc_146_dismissal_petition' || supplement.routeKey !== 'obligation:track-branch:NC:nc_146_dismissal_petition:dna-expunction-application-15a-146-b1' || supplement.conditional !== true || supplement.blocksCoreExpunction !== false || supplement.participantInstrumentOrAcceptanceProcedure !== 'UNRESOLVED') return null;
  const currentSupplement=families.filter(f=>f.familyId===supplement.familyId);
  if (currentSupplement.length !== 1 || !currentSupplement[0].routeKeys.includes(supplement.routeKey)) return null;
  return {status:'BOUND_OWNER_PRODUCT_SCOPE',evidence:recordPath,decisionId:record.decisionId,currentQueueSha256:queueSha256,
    coreFamilies:record.coreFamilies.map(f=>({familyId:f.familyId,state:f.state,selectedIndependentVerdict:f.selectedIndependentVerdict,sourceHashes:f.sourceHashes})),
    supplement:{familyId:supplement.familyId,routeKey:supplement.routeKey,conditional:true,blocksCoreExpunction:false,participantInstrumentOrAcceptanceProcedure:'UNRESOLVED',nativeState:currentSupplement[0].disposition},
    meaning:'Core expunction is already terminal. Only the conditional DNA participant instrument/procedure remains unresolved. No native state, denominator, legal entitlement, packet approval or Production authority changes.'};
}

export function verifiedSupabaseServiceSuccessor(review, reviewPath, readBytes) {
  const runId=34857707932, prefix='private/transfers/national-release-preservation-20260914/service-preflight-'+runId;
  const app='41db064ec6f25149802504f410fab7ece2c61b96', tools='308f7c655779621b9ea72986bb696e01fad15d45';
  const flags=['applicationAccepted','workerImageAccepted','participantAcceptanceEstablished','releaseAuthorityGranted'];
  const gates=['supabase_token_usable','acceptance_project_resolves','acceptance_project_identity_is_exact','acceptance_project_reachable_for_sql','acceptance_project_carries_no_production_data'];
  if (typeof readBytes!=='function' || review?.schemaVersion!=='rcap-independent-service-preflight-review/v1' || review.runId!==runId || review.supersedes!==34843210160 || review.serviceOnly!==true || review.reviewerIndependentOfImplementation!==true || typeof review.reviewer!=='string' || !review.reviewer || flags.some(k=>review[k]!==false) || review.applicationSha!==app || review.toolsSha!==tools || review.originalFilesEqualArchiveMembers!==true || review.originalZipDigestMatchesGitHubArtifactMetadata!==true) return null;
  const paths=['/original.zip','/artifacts.json','/original/preflight.json','/original/worker-input-plan.json','/job.log'].map(s=>prefix+s);
  if (!Array.isArray(review.custody) || review.custody.length!==5 || new Set(review.custody.map(c=>c.path)).size!==5 || review.custody.some(c=>!paths.includes(c.path))) return null;
  try {
    const bytes=new Map();
    for (const ref of review.custody) {
      const b=readBytes(ref.path);
      if (!Buffer.isBuffer(b) || !Number.isSafeInteger(ref.byteLength) || ref.byteLength!==b.length || crypto.createHash('sha256').update(b).digest('hex')!==ref.sha256) return null;
      bytes.set(ref.path,b);
    }
    const original=JSON.parse(bytes.get(prefix+'/original/preflight.json')), plan=JSON.parse(bytes.get(prefix+'/original/worker-input-plan.json')), metadata=JSON.parse(bytes.get(prefix+'/artifacts.json'));
    const artifacts=(metadata.artifacts??[]).filter(a=>a.id===review.artifactId);
    if (artifacts.length!==1 || artifacts[0].digest!=='sha256:'+crypto.createHash('sha256').update(bytes.get(prefix+'/original.zip')).digest('hex') || String(artifacts[0].workflow_run?.id)!==String(runId) || artifacts[0].workflow_run?.head_sha!==tools) return null;
    if (original.schemaVersion!=='rcap-hosted-acceptance-preflight/v1' || original.serviceOnly!==true || original.applicationSha!==app || original.toolsSha!==tools || original.applicationAccepted!==false || original.workerImageAccepted!==false || original.releaseAuthorityGranted!==false || original.acceptanceProjectRef!=='hyflxnlhpmiqxvvcoiia' || plan.candidateSha!==app || typeof plan.rebuildRequired!=='boolean' || original.workerRebuildRequired!==plan.rebuildRequired || review.workerRebuildRequired!==plan.rebuildRequired) return null;
    const verdicts=original.cases?.verdicts;
    if (!verdicts || gates.some(k=>typeof verdicts[k]!=='boolean') || !Array.isArray(original.requiredCases) || new Set(original.requiredCases).size!==original.requiredCases.length || gates.some(k=>!original.requiredCases.includes(k)) || !Array.isArray(original.missingCases) || gates.some(k=>original.missingCases.includes(k)) || !Array.isArray(original.failedCases) || gates.some(k=>original.failedCases.includes(k)!==(verdicts[k]===false))) return null;
    const passed=gates.every(k=>verdicts[k]===true);
    if (review.services?.supabase?.status!==(passed?'PASS_SERVICE_ONLY':'FAILED_SERVICE_PREFLIGHT')) return null;
    const vercelGates=['vercel_token_usable','vercel_project_resolves','production_environment_shape_snapshotted_without_values','preview_binding_is_per_deployment_only'];
    if (review.services.supabase.passedChecks!==gates.filter(k=>verdicts[k]).length || review.services.supabase.requiredChecks!==gates.length
      || vercelGates.some(k=>typeof verdicts[k]!=='boolean' || !original.requiredCases.includes(k) || original.missingCases.includes(k) || original.failedCases.includes(k)!==(verdicts[k]===false))
      || review.services.vercel?.passedChecks!==vercelGates.filter(k=>verdicts[k]).length || review.services.vercel?.requiredChecks!==vercelGates.length
      || review.services.vercel?.status!==(vercelGates.every(k=>verdicts[k])?'PASS_SERVICE_ONLY':'FAILED_SERVICE_PREFLIGHT')) return null;
    if (passed) {
      const identity=original.cases.projectIdentity, proof=original.cases.emptinessProof;
      if (identity?.name!=='legalease-rcap-acceptance' || identity.region!=='us-west-2' || identity.status!=='ACTIVE_HEALTHY' || proof?.completePresence!==true || proof.completeCounts!==true) return null;
      if (proof.provenBy==='acceptance_marker') { if (proof.marker?.projectRef!=='hyflxnlhpmiqxvvcoiia') return null; }
      else if (proof.provenBy==='no_participant_data') {
        if (!Array.isArray(proof.participantWitnesses) || proof.participantWitnesses.length<3 || new Set(proof.participantWitnesses).size!==proof.participantWitnesses.length || !Array.isArray(proof.absent) || !Array.isArray(proof.presentWithCounts)) return null;
        for (const table of proof.participantWitnesses) {
          const counts=proof.presentWithCounts.filter(r=>r.table===table);
          if (proof.absent.includes(table) ? counts.length!==0 : counts.length!==1 || counts[0].rows!==0) return null;
        }
      } else return null;
    }
    return {id:'SUPABASE_ACCEPTANCE_ACCESS',status:passed?'SERVICE_PREFLIGHT_PASSED_ONLY':'OBSERVED_FAILED_ACCESS',evidence:reviewPath,runId,supersedesRunId:34843210160,projectRef:original.acceptanceProjectRef,passedChecks:gates.filter(k=>verdicts[k]).length,failedChecks:gates.filter(k=>!verdicts[k]),gates:Object.fromEntries(gates.map(k=>[k,verdicts[k]])),candidateAcceptance:false,migrationAuthorized:false,
      nextStep:passed?'Preserve the verified service result; check candidate, worker and exact existing nonproduction authorization prerequisites separately before any next action.':'Investigate the existing workflow authentication binding and account/project authorization after billing restoration; no credential replacement or additional preflight is prescribed by this receipt.',
      meaning:passed?'The five Supabase service predicates passed in the independently reviewed successor. The historical credential failure is superseded for this service only; Vercel, worker, hosted participant acceptance and migration authorization are separate.':'The current Supabase service predicates still fail; the historical run remains preserved but is not the current diagnosis.'};
  } catch { return null; }
}
