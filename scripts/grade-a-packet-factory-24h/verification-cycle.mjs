import {createHash} from 'node:crypto';

/** A new loss of previously accepted identity is a new verification work
 * cycle. A still-pending, just-released cycle is not. Keep both the original
 * acceptance and the measured reason in the dispatch's existing reissue log. */
export function changedAcceptanceCycle(previous, current) {
  if (!previous || previous.familyId !== current?.familyId
    || !['COMPLETE_PACKET_PROVEN','GUIDANCE_READY'].includes(previous.state)
    || current.state !== 'VERIFY_PENDING') return null;
  const evidence=current.verificationLapsedBecause
    ?? (current.reviewedGuidanceAdmission?.eligible===false ? current.reviewedGuidanceAdmission : null);
  if (!evidence || typeof evidence!=='object' || (!evidence.lapse&&!evidence.reason)) return null;
  return {previousState:previous.state,currentState:current.state,evidence,
    evidenceSha256:createHash('sha256').update(JSON.stringify(evidence)).digest('hex')};
}

/** Keep occupied ordinary elastic lanes when the queue shrinks. Exceptional
 * captain-granted lanes remain off-roster under their existing contracts. */
export function retainedVerificationLaneCount(base, elasticMaximum, claims, families) {
  const pending=new Set(families.filter(f=>['VERIFY_PENDING','VERIFYING'].includes(f.state)).map(f=>f.familyId));
  let count=base;
  for(const claim of claims??[]) {
    const match=/^VF(\d{2})$/.exec(claim.lane??'');
    if(!match||claim.released||claim.subjectType!=='packet-family'
      ||claim.operation!=='independent-verification'||claim.laneKind!=='independent-verification'
      ||!pending.has(claim.subjectId))continue;
    const lane=Number(match[1]);
    if(lane<=elasticMaximum)count=Math.max(count,lane);
  }
  return count;
}
