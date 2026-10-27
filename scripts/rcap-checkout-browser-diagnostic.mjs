// Shared trust boundary: never retain an exception message, stack, URL or arbitrary name.
const phases=new Set(['browser_setup','preview_bootstrap','checkout_open','checkout_fill','before_final_pay','before_submit_checkpoint','submit_click','submit_obstruction_inspection','after_submit_checkpoint','return_observation','return_wait','return_challenge_probe','return_diagnostics','adapter_call']);
const classes=new Set(['Error','TimeoutError','TargetClosedError','TypeError','ReferenceError','RangeError','SyntaxError','AbortError','AssertionError','None']);
export function safeCheckoutBrowserDiagnostic(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 return {phase:phases.has(value.phase)?value.phase:'unclassified_phase',errorClass:classes.has(value.errorClass)?value.errorClass:'UnknownError',...(Object.hasOwn(value,'buttonGeometry')?{buttonGeometry:safeCheckoutButtonGeometry(value.buttonGeometry)}:{}),...(Object.hasOwn(value,'navigation')?{navigation:['expected_return','provider_checkout','unexpected_destination','unknown'].includes(value.navigation)?value.navigation:'unknown'}:{})};
}

export function safeCheckoutButtonGeometry(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const n=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=10000000?Math.round(x):null;
 const b=x=>typeof x==='boolean'?x:null;
 return{rect:{x:n(value.rect?.x),y:n(value.rect?.y),width:n(value.rect?.width),height:n(value.rect?.height)},viewport:{width:n(value.viewport?.width),height:n(value.viewport?.height)},intersectsViewport:b(value.intersectsViewport),centerHitRelation:['self','child','other','none'].includes(value.centerHitRelation)?value.centerHitRelation:'unknown',nativeDisabled:b(value.nativeDisabled),ariaDisabled:b(value.ariaDisabled)};
}
// Inspect URLs in memory; retain only a closed navigation category.
export function checkoutNavigationClass(actual,expectedReturnObserved){
 if(expectedReturnObserved===true)return 'expected_return';
 try{const url=new URL(actual);return url.protocol==='https:'&&url.hostname==='checkout.stripe.com'?'provider_checkout':'unexpected_destination';}catch{return 'unknown';}
}
