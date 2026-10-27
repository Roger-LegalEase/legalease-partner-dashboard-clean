// Shared trust boundary: never retain an exception message, stack, URL or arbitrary name.
const phases=new Set(['browser_setup','preview_bootstrap','checkout_open','checkout_fill','before_final_pay','before_submit_checkpoint','submit_click','after_submit_checkpoint','return_observation','return_wait','return_challenge_probe','return_diagnostics','adapter_call']);
const classes=new Set(['Error','TimeoutError','TargetClosedError','TypeError','ReferenceError','RangeError','SyntaxError','AbortError','AssertionError']);
export function safeCheckoutBrowserDiagnostic(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 return {phase:phases.has(value.phase)?value.phase:'unclassified_phase',errorClass:classes.has(value.errorClass)?value.errorClass:'UnknownError'};
}
