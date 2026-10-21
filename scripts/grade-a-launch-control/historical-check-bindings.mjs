import {createHash} from 'node:crypto';
export const PRESERVATION_BASE='41db064ec6f25149802504f410fab7ece2c61b96';
export const WAVE2_C11_SHA256='e4b0eb4c9bb945009527401acd8968d472bd170b838774cec110abd66ac6c041';
export const REVOCATION_MATRIX_SHA256='0d194f75180ebc210795ece7f412d3045de0de3c9bf2ab394e14c0f0b04d03e8';
export const REVOCATION_PLAN_SHA256='415ed3abf10d1a6ffc33590754f8b131b820345920cde77d5f0f1f0a13d19216';
export const MASS_MATRIX_COMMIT='7476708c6236b7b2ce1b1112dbeef434d3957c59';
export function assertPinnedJson(bytes,sha){if(createHash('sha256').update(bytes).digest('hex')!==sha)throw new Error('Historical input hash differs from its immutable pin');return JSON.parse(bytes);}
export function corpusPreservationDelta(baseline,current){
 const old=new Map(baseline.map(x=>[x.path,x.sha256])),now=new Map(current.map(x=>[x.path,x.sha256]));
 const duplicate=old.size!==baseline.length||now.size!==current.length;
 const addedOrChanged=current.filter(x=>old.get(x.path)!==x.sha256),missingOrChanged=baseline.filter(x=>now.get(x.path)!==x.sha256);
 return {passed:!duplicate&&!addedOrChanged.length&&!missingOrChanged.length,addedOrChanged,missingOrChanged,duplicate,historicalPolicyCount:10,preservedBaselineCount:baseline.length,historicalDiscrepancy:baseline.length-10,governanceApproved:false};
}
export function historicalDispatchCoverage(built,assigned){return new Set(built).size===built.length&&new Set(assigned).size===assigned.length&&built.length===assigned.length&&built.every(id=>assigned.includes(id));}
export function historicalRevocationValid(currentPlan,historicalPlan,historicalMatrix){
 const current=currentPlan?.passRevocation,prior=historicalPlan?.passRevocation;
 if(!Array.isArray(current?.families)||!Array.isArray(prior?.families)||current.families.length!==4||new Set(current.families).size!==4||prior.families.length!==4||new Set(prior.families).size!==4)return false;
 return current.newClassification==='PASS_REVOKED_PENDING_COMPLETENESS_RECHECK'&&current.lawrenceReviewPackagesPrepared===0&&prior.lawrenceReviewPackagesPrepared===0&&current.families.every(id=>prior.families.includes(id)&&historicalMatrix.results.filter(r=>r.familyId===id&&r.result?.startsWith('FAIL_')).length===1);
}
const COUNTERS=['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects'];
const OBLIGATIONS=['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
export function independentlyRestored({family,row,raster}){
 const selected=family?.selectedIndependentVerdict,counters=row?.nineCounters??row?.countersAfter??row?.counters;
 const expectedId=family?.familyId,actualId=row?.familyId??row?.itemId;
 if(!selected||family.state!=='COMPLETE_PACKET_PROVEN'||family.allNineCountersZero!==true||selected.verdict!=='PASS_COMPLETE_INDEPENDENT'||row?.verdict!=='PASS_COMPLETE_INDEPENDENT'||actualId!==expectedId)return false;
 if(String(row.lane).toLowerCase()!==String(selected.lane).toLowerCase()||row.verifiedAtBase!==selected.verifiedAtBase)return false;
 if(!COUNTERS.every(k=>counters?.[k]===0&&family.counters?.[k]===0)||!OBLIGATIONS.every(k=>row.proofObligations?.[k]?.measured===true&&row.proofObligations[k].result==='PASS'))return false;
 if((row.failedObligationNames??[]).length||(row.unmeasuredObligations??[]).length||(row.overlayDirectoriesModified??[]).length||row.productionTouched!==false||row.commercialRoutesOpened!==0)return false;
 if(!raster?.proven||raster.status!=='PROVEN_ON_CURRENT_BYTES')return false;
 const rr=row.rasterReceipt,actual=raster.row;
 const canonical=rr?.boundCanonicalSha256??rr?.canonicalPdfSha256,boundary=rr?.boundBoundarySha256??rr?.boundaryPdfSha256;
 return Boolean(canonical&&boundary&&canonical===actual?.canonicalPdfSha256&&boundary===actual?.boundaryPdfSha256);
}
