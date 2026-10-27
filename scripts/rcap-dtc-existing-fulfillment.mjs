// Source qualification and same-session reconciliation are evidence, never Pay authorization.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DTC,hash} from './rcap-hosted-saved-dtc-contracts.mjs';
import {SESSION_SHA,classifyExistingSession} from './rcap-dtc-existing-session-readonly.mjs';
// This guard runs before npm ci; keep the accepted projection free of browser imports.
const SAFE_NAMES=new Set(['unrecognized_control','email','cardNumber','cardExpiry','cardCvc','cardCountry','cardPostalCode','billingName','billingAddressLine1','billingAddressLine2','billingLocality','billingAdministrativeArea','billingPostalCode','billingCountry','phoneNumber','name','country','addressLine1','addressLine2','postalCode','city','state','termsOfServiceConsentCheckbox','cc-name','cc-number','cc-exp','cc-csc','country-name','street-address','address-line1','address-line2','address-level1','address-level2','postal-code','tel']);
function safeSubmitInspection(value){
 if(value===null||value===undefined)return null;
 assert(typeof value.inspectionComplete==='boolean');assert.equal(typeof value.pageTotalClassifiedFree,'boolean');assert(value.submitDisabled===null||typeof value.submitDisabled==='boolean');assert(Array.isArray(value.controls)&&value.controls.length<=60);
 return {pageTotalClassifiedFree:value.pageTotalClassifiedFree,submitDisabled:value.submitDisabled,inspectionComplete:value.inspectionComplete,controls:value.controls.map(c=>{
  assert(['input','select','checkbox','radio'].includes(c.type));for(const k of ['required','missing','invalid','unknownRequiredCheckbox'])assert.equal(typeof c[k],'boolean');assert(c.checked===null||typeof c.checked==='boolean');
  return {name:SAFE_NAMES.has(c.name)?c.name:'unrecognized_control',type:c.type,required:c.required,missing:c.missing,invalid:c.invalid,checked:c.checked,unknownRequiredCheckbox:c.unknownRequiredCheckbox};
 })};
}
export const EXISTING_MODE='dtc_saved_existing_fulfillment';
export const NO_PAY_RESULT_SHA='7f86e1bca776f3cfef11792c8baa49dc0c744acad0761fc5cd15ab420583aac4';
export const NO_PAY_ACCEPTANCE_SHA='b5d8b60d318ccc98b38a7a0d60fddcee9e9da9b08356232c09096773704839ab';
export const EXISTING_HISTORY=Object.freeze({checkoutAttempted:true,providerAttempted:true,historicalSubmitAttempted:null,noInterveningPurchaseActor:false,priorReceiptLabels:Object.freeze(['checkout-created'])});
export function assertExistingMode(mode){assert(['dtc_saved_fulfillment',EXISTING_MODE].includes(mode),'Unsupported saved DTC mode');}
export function assertReadyExistingCheckout(value){
 const inspection=safeSubmitInspection(value);assert(inspection,'Current Checkout inspection required');
 assert.equal(inspection.inspectionComplete,true);assert.equal(inspection.submitDisabled,false);assert.equal(inspection.pageTotalClassifiedFree,false);
 assert(inspection.controls.length>0);for(const c of inspection.controls){assert.equal(c.unknownRequiredCheckbox,false);if(c.required){assert.notEqual(c.name,'unrecognized_control');assert.equal(c.missing,false);assert.equal(c.invalid,false);if(['checkbox','radio'].includes(c.type))assert.equal(c.checked,true);}}
 return inspection;
}
export function assertFrozenExistingNoPay(bytes,sidecar){
 assert(Buffer.isBuffer(bytes));assert.equal(sidecar.trim(),NO_PAY_RESULT_SHA,'Fixed actual no-Pay sidecar required');assert.equal(hash(bytes),NO_PAY_RESULT_SHA,'Actual no-Pay bytes changed');const r=JSON.parse(bytes);
 assert.equal(r.schemaVersion,'exact-existing-dtc-no-pay-inspection/v1');assert.equal(r.status,'EXISTING_SESSION_INSPECTED_NO_PAY');assert.equal(r.caseSha256,hash(DTC.item));assert.equal(r.sessionSha256,SESSION_SHA);
 for(const k of ['newCheckout','payAllowed','enqueueAllowed','workerAllowed','paymentIntentPresent','completed','humanInteractionRequired','submitAttempted'])assert.equal(r[k],false);
 assert.equal(r.providerExpectedAmountCents,5000);assert.equal(r.providerSessionStatus,'open');assert.equal(r.providerPaymentStatus,'unpaid');assert.equal(r.jobCount,0);assert.equal(r.beforePayObserved,true);assert.equal(r.failureReason,'diagnostic_stop_before_pay');assertReadyExistingCheckout(r.inspection);return r;
}
export async function loadExistingNoPayEvidence(){
 const bytes=await fs.readFile(new URL('./dtc-existing-session-no-pay-result.json',import.meta.url));const sidecar=await fs.readFile(new URL('./dtc-existing-session-no-pay-result.sha256',import.meta.url),'utf8');assertFrozenExistingNoPay(bytes,sidecar);return {bytes,sha256:NO_PAY_RESULT_SHA};
}
export function assertExistingHistory(custody){
 for(const [key,value]of Object.entries(EXISTING_HISTORY))assert.deepEqual(custody[key],value,'Actual prior Checkout history must remain conservative');
 assert.equal(custody.checkoutSessionId,null,'Raw provider session is read privately, never frozen in public custody');assert.equal(custody.checkoutSessionSha256,SESSION_SHA);assert.equal(custody.noPayResultSha256,NO_PAY_RESULT_SHA);assert.equal(custody.noPayAcceptanceSha256,NO_PAY_ACCEPTANCE_SHA);
 assert.equal(custody.enqueueAttempted,false);assert.equal(custody.workerAttempted,false);
}
export function assertExistingWindowBudget(window,now=Date.now()){
 const remainingBudgetMs=Date.parse(window.endsAt)-now;assert(Number.isFinite(remainingBudgetMs)&&remainingBudgetMs>25*60*1000,'Existing-session continuation requires strictly more than 25 minutes remaining');return {remainingBudgetMs,minimumBudgetMs:25*60*1000};
}
export function assertExistingCurrentState({state,jobs,session}){
 assert.equal(hash(state.checkout_session_id??''),SESSION_SHA,'Only the already existing Checkout is admissible');assert.equal(state.payment_status,'unpaid');assert.equal(state.payment_valid,false);assert.equal(state.provider_event_id,null);assert.equal(state.job_count,0);assert.deepEqual(jobs,[]);assert.equal(session.payment_intent,null);
 const result=classifyExistingSession(state,session,null);assert.equal(result.providerSessionStatus,'open');assert.equal(result.providerPaymentStatus,'unpaid');assert.equal(result.paymentIntentPresent,false);assert.equal(new URL(session.url).origin,'https://checkout.stripe.com');return result;
}
