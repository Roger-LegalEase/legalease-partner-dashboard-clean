import crypto from 'node:crypto';
/** Temporary subjects for safeguards whose live defect population is now empty.
 * Callers restore every original file. These records are never generated or committed.
 */
export function prepareMutationSubjects(c, original) {
 const docs=Object.fromEntries(['master','active','ledger','verifierReturns','stale'].map(k=>[k,JSON.parse(original[k])]));
 const {master:m,active:a,ledger:l,verifierReturns:v,stale:s}=docs;
 const family=(id,state)=>{const f={...structuredClone(m.families[0]),familyId:id,worklistGroupId:id,state,activeOwner:null,activeOwnerLane:null,currentLegalResolution:null,legalInputBasis:null,legalInputStatus:'SETTLED',selectedIndependentVerdict:null,verificationLapsedBecause:null};m.families.push(f);m.byState[state]=(m.byState[state]??0)+1;return f;};
 const claim=(id,lane,kind,released=false)=>{const x={subjectType:'packet-family',subjectId:id,familyId:id,familyIds:[id],lane,laneKind:kind,operation:kind,released,releasedAt:released?'2026-09-01T00:00:00Z':null};l.claims.push(x);return x;};
 const fail=(f,verdict='FAIL_REPAIR_REQUIRED')=>{const r={familyId:f.familyId,isIndependentVerification:true,verdict,superseded:false,lane:'VF-SYNTHETIC',failedObligationNames:['KNOWN_PREFILLS']};v.rows.push(r);f.failedObligationNames=r.failedObligationNames;f.failedObligations=[{obligation:'KNOWN_PREFILLS'}];return r;};
 if(['F1','F2'].includes(c.id)&&c.on==='active'){
  const b=a.assignments.filter(x=>x.lane==='packet-build');
  for(let i=0;i<2;i++)if(!b[i].items.length){b[i].items=[`SYNTHETIC-BUILDER-${i}`];b[i].ownedPaths=[`synthetic/${i}/**`,`synthetic/${i}/builder.mjs`];}
 }
 if(['F16','F17'].includes(c.id)){
  const lanes=a.assignments.filter(x=>x.itemKind==='sourceObligation');
  for(let i=0;i<2;i++){lanes[i].items=[`SYNTHETIC-SOURCE-${i}`];lanes[i].familiesUnblocked=[`SYNTHETIC-RELEASE-${i}`];}
 }
 if((c.id==='F11'&&/effective source/.test(c.name))||(c.id==='F13'&&/no held byte/.test(c.name))){
  const f=family('SYNTHETIC-SOURCE-BLOCK','SOURCE_BLOCKED');f.sourceReadiness={ready:false,effectiveOfficialSourceIds:[],boundSources:[],boundCount:0,reasons:['missing fixture source']};f.sourceBound=false;
 }
 if(c.id==='F13'&&/held path|held SHA|zero bound sources/.test(c.name)){
  const template=m.families.find(f=>f.sourceReadiness?.boundSources?.length>0 && f.sourceReadiness.boundSources.every(s=>s.path&&s.sha256&&s.tier));
  if(!template)throw new Error('F13 requires current held-source schema evidence');
  const f=family('SYNTHETIC-F13-HELD','SOURCE_READY');f.sourceReadiness=structuredClone(template.sourceReadiness);f.sourceReadiness.directAttachment=false;f.sourceReadiness.ready=true;f.sourceReadiness.reasons=[];f.sourceReadiness.satisfiedByAuthority=[];f.implementationStrategy='official_pdf_fill';
 }
 if(c.id==='F27'&&/dropping a state/.test(c.name))family('SYNTHETIC-VOCABULARY','LEGAL_BLOCKED');
 if(c.id==='F26'&&c.on==='stale'){
  const f=family('SYNTHETIC-LANE-LEGAL','LEGAL_BLOCKED');f.legalInputBasis='LANE_RETURN_BLOCKED_LEGAL_INPUT';f.legalInputStatus='OPEN_LEGAL_INPUT';
  s.rows.unshift({familyId:f.familyId,destination:'LEGAL',lane:'SYNTHETIC'});
 }
 if(c.id==='F29'&&!/no verdicts/.test(c.name)){
  const f=family('SYNTHETIC-F29','FAIL_REPAIR_REQUIRED');fail(f);
  if(/source (wait|refusal)/i.test(c.name)){
   f.state='SOURCE_BLOCKED';f.sourceReadiness={ready:false,unresolvedObligations:['synthetic-source']};f.sourceReconciliation={disposition:'SOURCE_BLOCKED',unresolvedObligations:['synthetic-source']};
  }else if(/Captain/.test(c.name)){
   f.activeOwner='FIX-SYNTHETIC';claim(f.familyId,f.activeOwner,'repair');
   l.grants=[...(l.grants??[]),{subjectId:f.familyId,lane:f.activeOwner,laneKind:'repair',reason:'isolated test',grantedAt:'2026-09-14T00:00:00Z'}];
  }else{
   claim(f.familyId,'FIX-SYNTHETIC','repair');a.assignments.push({assignmentId:'FIX-SYNTHETIC',lane:'rapid-repair',items:[f.familyId],detail:[{familyId:f.familyId,failedObligationNames:['KNOWN_PREFILLS']}],ownedPaths:[],prohibitedPaths:[]});
  }
 }
 if(c.id==='F32'){
  const f=family('SYNTHETIC-F32','SOURCE_BLOCKED');f.sourceReadiness={ready:false};fail(f,'BLOCKED_SOURCE');claim(f.familyId,'VF-SYNTHETIC','independent-verification',true);
 }
 if(c.id==='F33'){
  const f=family('SYNTHETIC-F33','WRONG_DELIVERY_TYPE');f.ownerDeliveryTypeRefusal={refused:true,familyId:f.familyId};claim(f.familyId,'VF-SYNTHETIC','independent-verification',true);
 }
 l.claimsDigest=crypto.createHash('sha256').update(JSON.stringify(l.claims.map(c=>l.claimsDigestCovers.map(k=>c[k]??null)))).digest('hex');
 return {...original,...Object.fromEntries(Object.entries(docs).map(([k,v])=>[k,Buffer.from(JSON.stringify(v,null,2)+'\n')]))};
}
