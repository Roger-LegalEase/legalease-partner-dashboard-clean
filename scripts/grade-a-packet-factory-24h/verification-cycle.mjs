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
