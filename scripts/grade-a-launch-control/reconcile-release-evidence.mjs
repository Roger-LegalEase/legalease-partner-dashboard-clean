import { conditionalFamilyScope } from './conditional-family-scope.mjs';
/** Pure reporting: never grants admission, changes evidence or invents a route. */
export const RELEASE_DIMENSIONS = ['terminal_treatment', 'runtime_product_reachability', 'output_approval', 'fulfillment_authority', 'hosted_acceptance', 'production_readiness'];
const TERMINAL = new Set(['COMPLETE_PACKET_PROVEN', 'GUIDANCE_READY', 'HANDOFF_READY', 'OUT_OF_SCOPE']);
const NON_PACKET = new Set(['GUIDANCE_READY', 'HANDOFF_READY', 'OUT_OF_SCOPE']);
const result = (ok, reason, evidence = []) => ({status: ok ? 'SATISFIED' : 'MISSING', reason, evidence});
const unique = (rows) => rows.length === 1 ? rows[0] : null;
const evidence = (path, identity) => ({path, identity});
const Q = 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json';
const G = 'data/rcap-ledger/launch-graph.json';
const R = 'data/rcap-grade-a/fulfillment-authority-registry.json';
const P = 'data/rcap-grade-a/fulfillment-authority-projection.json';

export function resolveRuntimeRoute(family, obligationKey, graphRows) {
  // A research/track-only identifier is not silently shortened to a runtime route.
  let match = /^obligation:(?:track-pathway|research-decision-route):([A-Z]{2}):[^:]+:(.+)$/.exec(obligationKey);
  if (!match) match = /^obligation:runtime-only:([A-Z]{2}):(.+)$/.exec(obligationKey);
  if (match) return `${match[1]}:${match[2]}`;
  match = /^obligation:track-only:([A-Z]{2}):(.+)$/.exec(obligationKey);
  if (match) return unique(graphRows.filter(r => r.jurisdiction === match[1]
    && r.registryTracks?.includes(match[2])
    && r.packetSets?.some(p => p.packetSetId === family.familyId)))?.pathwayKey ?? null;
  return null;
}

export function reconcileReleaseEvidence({masterQueue, registry, projection, launchGraph, baseline = null, artifactBindings = {}, ownerScope = null}) {
  if (!Array.isArray(masterQueue?.families)) throw new Error('MASTER_QUEUE families required');
  const ids = masterQueue.families.map(f => f.familyId);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('Duplicate or missing exact family ID');
  const graphRows = launchGraph?.rows ?? [], records = registry?.records ?? [], projections = projection?.routes ?? [];
  const baselineStatus = baseline?.verified === true ? {status:'BOUND', ...baseline} : {status:'UNBOUND', reason:baseline?.reason ?? 'Authoritative release baseline not supplied; current local queue is an observation only.'};
  const scopes = conditionalFamilyScope(ownerScope, masterQueue.families);
  const families = masterQueue.families.map(f => {
    const nonPacket = NON_PACKET.has(f.state);
    const terminal = result(TERMINAL.has(f.state), `Native MASTER_QUEUE state: ${f.state}`, [evidence(Q,f.familyId)]);
    const routes = (f.routeKeys?.length ? f.routeKeys : [null]).map(key => {
      const routeId = key ? resolveRuntimeRoute(f,key,graphRows) : null;
      const graph = routeId ? unique(graphRows.filter(r => r.pathwayKey === routeId)) : null;
      const record = routeId ? unique(records.filter(r => r.routeId === routeId && !r.supersededBy && !r.supersededAt)) : null;
      const projected = routeId ? unique(projections.filter(r => r.routeId === routeId)) : null;
      const boundFamily = record?.packetFamilyId === f.familyId;
      const graphFamily = graph?.packetSets?.some(p => p.packetSetId === f.familyId) || graph?.packetFamilies?.some(p => (typeof p === 'string' ? p : p.packetFamilyId ?? p.familyId) === f.familyId);
      const runtime = result(Boolean(graph && graphFamily && graph.compiledPathway?.present === true && graph.renderer?.routeKind === 'factory_v2'
        && graph.renderer?.rendererKind && graph.packetSpecification?.complete === true && graph.publicWitness?.reachesThisPathway === true && graph.publicWitness?.settled === true),
        !routeId ? 'No unambiguous exact runtime route mapping.' : !graph ? `No unique native launch-graph row for ${routeId}.` : !graphFamily ? 'Runtime graph does not bind this exact family.' : `Native runtime gates: ${JSON.stringify({compiled:graph.compiledPathway?.present,specification:graph.packetSpecification?.complete,renderer:graph.renderer?.routeKind,witness:graph.publicWitness})}`,
        graph ? [evidence(G,routeId)] : []);
      const currentArtifact = (artifactBindings[f.familyId]?.packets ?? []).some(p => p.sha256 && p.sha256 === record?.artifactValidation?.artifactSha256);
      const approval = record?.outputLegalApproval;
      const output = result(Boolean(boundFamily && currentArtifact && approval?.state === 'passed' && approval.reviewerId && approval.decidedAt && approval.scopeSha256),
        !record ? 'Exact route fulfillment record absent or ambiguous.' : !boundFamily ? 'Fulfillment record names a different or absent family.' : !currentArtifact ? 'Approval artifact hash does not bind a current family packet report.' : `Native output legal approval: ${approval?.state ?? 'absent'}.`, record ? [evidence(R,record.recordId)] : []);
      const authority = result(Boolean(boundFamily && currentArtifact && record.schemaVersion === 'rcap-grade-a-fulfillment-authority/v2' && !record.revocation?.revoked
        && projected?.packetFamilyId === f.familyId && projected.recordVersion === record.version && projected.state === 'COMPLETE_PACKET_PROVEN'
        && projected.commercialStatus === 'commercially_eligible' && projected.missingProof?.length === 0 && projected.stalenessReasons?.length === 0),
        !record ? 'Exact route fulfillment record absent or ambiguous.' : !projected ? 'Exact native fulfillment projection absent or ambiguous.' : JSON.stringify({schema:record.schemaVersion,familyBound:boundFamily,currentArtifact,revoked:record.revocation?.revoked,state:projected.state,missingProof:projected.missingProof,stalenessReasons:projected.stalenessReasons}),
        record ? [evidence(R,record.recordId),evidence(P,routeId)] : []);
      const dimensions = {terminal_treatment:terminal,runtime_product_reachability:runtime,output_approval:output,fulfillment_authority:authority,
        hosted_acceptance:result(false,'No exact current route/family/provider-bound hosted participant payment, sponsorship, render and private-delivery acceptance admitted by this reporting adapter.'),
        production_readiness:result(false,'No exact current Production deployment, authorization and all-51 launch acceptance admitted by this reporting adapter.')};
      if (nonPacket) {
        for (const name of ['output_approval','fulfillment_authority']) dimensions[name] = {status:'NOT_APPLICABLE',reason:`Native ${f.state} is a terminal non-packet disposition; packet-sale approval and fulfillment do not apply.`,evidence:[evidence(Q,f.familyId)]};
        dimensions.runtime_product_reachability=result(false,`No exact native runtime proof of ${f.state} treatment delivery or exclusion admitted by this adapter. A packet renderer is not that proof.`);
        dimensions.hosted_acceptance=result(false,`No exact hosted acceptance of ${f.state} treatment delivery/exclusion admitted; no payment proof is required for this non-packet disposition.`);
      }
      return {obligationKey:key,runtimeRouteId:routeId,dimensions,missingObligations:RELEASE_DIMENSIONS.filter(d=>dimensions[d].status==='MISSING').map(d=>({familyId:f.familyId,obligationKey:key,runtimeRouteId:routeId,dimension:d,reason:dimensions[d].reason})),commercialAuthorityGranted:false};
    });
    return {familyId:f.familyId,launchRequired:!scopes.has(f.familyId),conditionalScope:scopes.get(f.familyId) ?? null,worklistGroupId:f.worklistGroupId,jurisdiction:f.jurisdiction,routeKeys:f.routeKeys ?? [],disposition:f.state,terminal:terminal.status==='SATISFIED',packetSaleApplicable:!nonPacket,
      evidenceBindings:{sourceIds:f.sourceIds,sourceHashes:f.sourceHashes,sourceReadiness:f.sourceReadiness,selectedIndependentVerdict:f.selectedIndependentVerdict,terminalTreatment:f.terminalTreatment,treatmentReconciliation:f.treatmentReconciliation,reviewedTreatmentGuidance:f.reviewedTreatmentGuidance,ownerDeliveryTypeRefusal:f.ownerDeliveryTypeRefusal,artifactReport:artifactBindings[f.familyId] ?? null},routes,
      missingObligations:routes.flatMap(r=>r.missingObligations),launchReady:false,commercialAuthorityGranted:false};
  });
  const gaps = families.filter(f=>f.launchRequired).flatMap(f=>f.missingObligations);
  const supplementalGaps = families.filter(f=>!f.launchRequired).flatMap(f=>f.missingObligations);
  return {baseline:baselineStatus,dimensions:RELEASE_DIMENSIONS,families,gaps,supplementalGaps,counts:{families:families.length,launchRequired:families.filter(f=>f.launchRequired).length,conditionalSupplemental:scopes.size,terminal:families.filter(f=>f.terminal).length,packetSaleApplicable:families.filter(f=>f.packetSaleApplicable).length,nonPacketTerminal:families.filter(f=>!f.packetSaleApplicable).length,missingObligations:gaps.length,byDimension:Object.fromEntries(RELEASE_DIMENSIONS.map(d=>[d,gaps.filter(g=>g.dimension===d).length]))},launchGate:{open:false,reason:baselineStatus.status==='UNBOUND' ? baselineStatus.reason : 'Reporting never grants launch; route-bound hosted/Production proof and separately authorized all-51 release remain required.'},commercialAuthorityGranted:false};
}
