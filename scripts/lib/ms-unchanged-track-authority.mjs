// Reconcile only an unchanged additional-misdemeanor track. This supplies no
// artifact approval and cannot clear a revocation caused by changed PDFs.
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export const MS_TRACK_CONTAINER={path:'data/record-clearing/legal-design-intake/MS.memo.json',approvedCommit:'ff9705a240c004ed7b9d2f022113abe865442d3f',approvedSha256:'6982ae0c69373c196b763c84ebd8f8ff85ce1a6954a2806953591f82ff7845f2',currentSha256:'01c4a9586cf2eeae96b3da17437bb407e1e70f042a0a0785ace5353802022bb2',familyId:'ms-misd-addl-set',trackId:'ms-misd-addl',routes:['MS:additional-justice-court-misdemeanor-relief-9-11-15-3','MS:additional-municipal-court-misdemeanor-relief-21-23-7-6']};
export function reconcileMsUnchangedTrack({familyId,routeId,approvedBytes,currentBytes}){
 const c=MS_TRACK_CONTAINER;
 assert.equal(familyId,c.familyId);assert.ok(c.routes.includes(routeId),'wrong route');
 assert.equal(hash(approvedBytes),c.approvedSha256,'wrong approved memo');assert.equal(hash(currentBytes),c.currentSha256,'unreviewed memo container');
 const before=JSON.parse(approvedBytes),after=JSON.parse(currentBytes);
 const {tracks:oldTracks,...oldShared}=before,{tracks:newTracks,...newShared}=after;
 assert.deepEqual(oldShared,newShared,'shared legal authority changed');assert.equal(oldTracks.length,newTracks.length);
 for(const old of oldTracks.filter(t=>t.trackId!=='ms-nonconv')){
  const matches=newTracks.filter(t=>t.trackId===old.trackId);assert.equal(matches.length,1);assert.deepEqual(matches[0],old,'pre-existing sibling changed');
 }
 const selected=newTracks.filter(t=>t.trackId===c.trackId);assert.equal(selected.length,1);
 return {contract:'rcap-ms-unchanged-track-container/v1',familyId,routeId,trackId:c.trackId,
  approvedMemo:{path:c.path,commit:c.approvedCommit,sha256:c.approvedSha256},currentMemo:{path:c.path,sha256:c.currentSha256},selectedTrackSha256:hash(JSON.stringify(selected[0])),
  delta:'Only the separate ms-nonconv track changed; shared authority and ms-misd-addl are identical.',artifactApprovalGranted:false,revocationCleared:false};
}
