import crypto from 'node:crypto';
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
export function groupReleaseGapCauses(gaps, { serviceReview = null, serviceReviewPath = null, ncInquiry = null, ncInquiryPath = null, vercelReview = null, vercelReviewPath = null, readSuccessorBytes = null, reconciledFamilies = [], ncOwnerScope = null, ncOwnerScopePath = null, currentQueueSha256 = null } = {}) {
  const ncCoreAndConditionalSupplement = validatedNcScope(ncOwnerScope, ncOwnerScopePath, currentQueueSha256, reconciledFamilies);
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
  const vercelSuccessor = verifiedVercelSuccessor(vercelReview, vercelReviewPath, readSuccessorBytes);
  if (serviceReview?.status === 'FAILED_CURRENT_SERVICE_PREFLIGHT' && serviceReview.serviceOnly === true && serviceReview.releaseAuthorityGranted === false) {
    if (serviceReview.findings?.supabase?.managementProjectListHttpStatus === 401 && serviceReview.findings?.supabase?.acceptanceProjectSelectHttpStatus === 401) externalDependencies.push({id:'SUPABASE_ACCEPTANCE_ACCESS',status:'OBSERVED_FAILED_ACCESS',evidence:serviceReviewPath,runId:serviceReview.runId,meaning:'One credential/access cause underlies multiple failed preflight checks; project and SQL safety checks remain unproven, not separately diagnosed defects.',nextStep:serviceReview.findings.supabase.intervention});
    if (!vercelSuccessor && serviceReview.findings?.vercel?.reason === 'PINNED_TEAM_NOT_VISIBLE') externalDependencies.push({id:'VERCEL_TEAM_LOOKUP',status:'ACCESS_OR_LOOKUP_UNRESOLVED',evidence:serviceReviewPath,runId:serviceReview.runId,meaning:'One-page team absence cannot establish lost access. Any subsequent resolver repair still needs the applicable retest.',nextStep:serviceReview.findings.vercel.intervention});
  }
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
    if (review.outcome === 'IDENTITY_PASS' && original.passed === true && original.teamPaginationExhausted === true && original.identity?.teamSlug === 'roger947s-projects' && typeof original.identity.teamId === 'string' && original.identity.teamId.length > 0 && original.identity.projectId === 'prj_cdgwGzFqIHgEUlzEburSLaZETdQV' && original.identity.projectName === 'legalease-partner-dashboard-clean' && original.reads.some(r=>r.endpoint==='VERCEL_PINNED_PROJECT' && r.httpStatus===200)) return {...common,status:'IDENTITY_VERIFIED_ONLY',meaning:'The independently reviewed successor resolves the prior team-lookup uncertainty. Hosted, application, worker and Production acceptance remain unproven.'};
    if (original.passed !== false) return null;
    if (review.outcome === 'PINNED_TEAM_NOT_VISIBLE_COMPLETE_PAGINATION' && original.failure?.reason === 'PINNED_TEAM_NOT_VISIBLE' && original.teamPaginationExhausted === true && original.reads.length > 0 && original.reads.every(r=>r.endpoint==='VERCEL_TEAMS' && r.httpStatus===200) && original.reads.at(-1).nextPagePresent === false) return {...common,status:'TEAM_NOT_VISIBLE_AFTER_COMPLETE_LOOKUP',meaning:'The pinned team was absent after completed pagination using this credential. Owner access/scope verification is needed; the old incomplete-pagination question is superseded.'};
    if (review.outcome === 'IDENTITY_LOOKUP_FAILED' && typeof original.failure?.reason === 'string' && original.failure.reason !== 'PINNED_TEAM_NOT_VISIBLE') return {...common,status:'IDENTITY_LOOKUP_FAILED',reason:original.failure.reason,meaning:'The successor lookup failed; team absence and hosted acceptance are not established.'};
  } catch { return null; }
  return null;
}

function validatedNcScope(record, recordPath, queueSha256, families) {
  if (record?.schemaVersion !== 'rcap-owner-product-scope-clarification/v1' || record.status !== 'ADOPTED_OWNER_PRODUCT_SCOPE_ONLY' || record.decisionId !== 'NC-146-CORE-AND-CONDITIONAL-DNA-SCOPE-20260914' || !/^[a-f0-9]{64}$/.test(queueSha256 ?? '') || record.baseline?.queueSha256 !== queueSha256) return null;
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
