// Existing39318/F660–678 bounded operator custody; never a claim of all-universe absence.
// Root/C must independently qualify the ACTUAL native records before freezing expectedSha256 in the carrier.
import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
const SHA=/^[a-f0-9]{64}$/;
export const REQUIRED_CONTROL_RECORDS=Object.freeze(['captainLeaseAndOperationLog','activeQueuedReleaseOperations','knownQaProducerContexts','knownAcceptanceConsumers','globalAllKindPreRetargetSnapshot']);
export function requireFrozenPaidWindow(bytes,{expectedSha256,now=Date.now(),phase}){
 assert.match(expectedSha256??'',SHA,'actual root/C-qualified native custody record is not bound');assert.equal(createHash('sha256').update(bytes).digest('hex'),expectedSha256);const r=JSON.parse(bytes);
 assert.equal(r.schemaVersion,'original-controlled-paid-dtc-window/v1');assert.equal(r.operator,'root');assert.equal(r.captain,'Release Captain A');assert.equal(r.projectRef,'hyflxnlhpmiqxvvcoiia');assert.equal(r.applicationSha,'c0052e13d9801d24080275aab02c70c6ea213fa3');assert.equal(r.workerSourceSha,'32499751569359315248c2048fa111064a47c67f');assert.equal(r.workerDigest,'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494');
 assert.equal(r.savedCaseSha256,'6b280ecd45c49aefc52d0e540ccd2ee3077c954d70dd3f47dd08443d59864171');assert.equal(r.ownerSha256,'da8d2556ebe1c462a3892d4f17799458724ab301a94323c1e1eccaca48aae038');
 assert.equal(r.controlScope,'KNOWN_ORIGINAL_QA_CONTEXTS_AND_RELEASE_OPERATORS');assert.equal(r.firstControlledBoundary,'BEFORE_WEBHOOK_RETARGET_OR_ANY_RETRY_CAPABLE_INGRESS');
 assert.equal(r.pendingPrewriteReceiptSha256,'9c313adb77b76801b3fec6b9f12d4d55ec6f8b2486b80fc4e341e0ec65b06137');assert.equal(r.savedCaseBirthReceiptSha256,'868a2eed0e4ca8fd945bbc2ada7bb1464b66d7b09694e843bd178f71f2de173f');assert.equal(r.savedCaseProviderInventorySha256,'51beec4cbb7efa6c1a3de3c30a072a64e1ad932e62f949751ae0e198374bb832');
 assert.deepEqual(Object.keys(r.nativeControlRecords).sort(),[...REQUIRED_CONTROL_RECORDS].sort());for(const value of Object.values(r.nativeControlRecords))assert.match(value,SHA);
 const start=Date.parse(r.startedAt),end=Date.parse(r.endsAt);assert(Number.isFinite(start)&&Number.isFinite(end)&&start<=now&&end>now&&end-start<=45*60*1000);assert(Number.isSafeInteger(r.remainingRetargetAndCustomerBudgetMs)&&r.remainingRetargetAndCustomerBudgetMs>=305000);
 if(phase==='before_retarget')assert(end-now>=r.remainingRetargetAndCustomerBudgetMs,'finite window no longer contains the actual planned phase budget');else if(phase==='before_once')assert(end-now>305000,'existing five-minute once plus observation must fit');else assert(['during_fulfillment','poststate'].includes(phase));
 return Object.freeze({operator:'root',projectRef:r.projectRef,startedAt:r.startedAt,endsAt:r.endsAt,custodyReceiptSha256:expectedSha256});
}
export function buildRootPaidWindowRecord({startedAt,endsAt,remainingRetargetAndCustomerBudgetMs,nativeControlFiles}){
 assert.deepEqual(Object.keys(nativeControlFiles).sort(),[...REQUIRED_CONTROL_RECORDS].sort());
 const nativeControlRecords=Object.fromEntries(Object.entries(nativeControlFiles).map(([name,file])=>{assert(path.isAbsolute(file));assert(!fs.realpathSync(file).startsWith('/tmp/'),'unique native custody remains persistent');const st=fs.statSync(file);assert(st.isFile()&&st.size>0&&(st.mode&0o777)===0o600);return[name,createHash('sha256').update(fs.readFileSync(file)).digest('hex')];}));
 // These bytes bind actual existing custody, not invented actor absence or new execution authority.
 const r={schemaVersion:'original-controlled-paid-dtc-window/v1',operator:'root',captain:'Release Captain A',projectRef:'hyflxnlhpmiqxvvcoiia',applicationSha:'c0052e13d9801d24080275aab02c70c6ea213fa3',workerSourceSha:'32499751569359315248c2048fa111064a47c67f',workerDigest:'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494',savedCaseSha256:'6b280ecd45c49aefc52d0e540ccd2ee3077c954d70dd3f47dd08443d59864171',ownerSha256:'da8d2556ebe1c462a3892d4f17799458724ab301a94323c1e1eccaca48aae038',controlScope:'KNOWN_ORIGINAL_QA_CONTEXTS_AND_RELEASE_OPERATORS',firstControlledBoundary:'BEFORE_WEBHOOK_RETARGET_OR_ANY_RETRY_CAPABLE_INGRESS',pendingPrewriteReceiptSha256:'9c313adb77b76801b3fec6b9f12d4d55ec6f8b2486b80fc4e341e0ec65b06137',savedCaseBirthReceiptSha256:'868a2eed0e4ca8fd945bbc2ada7bb1464b66d7b09694e843bd178f71f2de173f',savedCaseProviderInventorySha256:'51beec4cbb7efa6c1a3de3c30a072a64e1ad932e62f949751ae0e198374bb832',startedAt,endsAt,remainingRetargetAndCustomerBudgetMs,nativeControlRecords,limitations:['Native records qualify known controllable actors/custody; no all-universe absence asserted','Endpoint-specific provider retry schedule remains unavailable; exact known pending subject cannot reach writes while its owner/item stays absent under other-DB-writer hold','No other-case mutation, general queue drain, second worker cycle, Clinic consent renewal or Production operation is released']};
 const bytes=Buffer.from(JSON.stringify(r,null,2)+'\n'),sha256=createHash('sha256').update(bytes).digest('hex');requireFrozenPaidWindow(bytes,{expectedSha256:sha256,phase:'during_fulfillment'});return Object.freeze({bytes,sha256});
}
// Supply an existing root-owned custody reader, not an environment approval switch or default live client.
export function createPaidDtcContinuousWindowPort({receiptBytes,expectedSha256,assertRootStillHoldsKnownControls}){
 assert.equal(typeof assertRootStillHoldsKnownControls,'function');
 return async({phase='during_fulfillment',stage}={})=>{
  const when=phase==='before_retarget'?'before_retarget':String(stage??phase).includes('before_once')?'before_once':phase==='poststate'||stage==='poststate'?'poststate':'during_fulfillment';
  const window=requireFrozenPaidWindow(receiptBytes,{expectedSha256,phase:when});
  // Existing root lease/known QA holds persist; unknown actor/ingress/consumer makes this port throw.
  await assertRootStillHoldsKnownControls({window,phase,stage});return window;
 };
}
