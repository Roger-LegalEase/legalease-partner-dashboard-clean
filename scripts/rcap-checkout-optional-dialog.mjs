import {readCheckoutSubmitObstruction} from './rcap-checkout-submit-obstruction.mjs';
function redact(value){return String(value??'').replace(/https?:\/\/\S+|www\.\S+/gi,'[url]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]').replace(/\b(?:sk|pk)_(?:test|live)_\w+|\b(?:whsec|sbp)_\w+|\bBearer\s+\S+|\beyJ[\w.-]+/gi,'[secret]').replace(/\b(secret|password|token|otp|code)\s*[:=]\s*\S+/gi,'$1 [redacted]').replace(/[A-Za-z0-9_-]{28,}/g,'[identifier]').replace(/\p{N}+/gu,'[number]').replace(/\s+/g,' ').trim().slice(0,180);}
export function safeOptionalDialogReport(v){return{status:['inspected','dismissed','hold','no_dialog','unavailable'].includes(v?.status)?v.status:'unavailable',decision:['optional','mandatory','unknown'].includes(v?.decision)?v.decision:'unknown',optionalEvidence:['guest','alternative_payment','explicit_optional','none'].includes(v?.optionalEvidence)?v.optionalEvidence:'none',accessibleName:redact(v?.accessibleName),ariaLabel:redact(v?.ariaLabel),labelledbyText:redact(v?.labelledbyText),headings:Array.isArray(v?.headings)?v.headings.slice(0,6).map(redact):[],providerBranding:Array.isArray(v?.providerBranding)?v.providerBranding.slice(0,4).map(redact):[],controls:Array.isArray(v?.controls)?v.controls.slice(0,12).map(redact):[],closeCandidateCount:Number.isSafeInteger(v?.closeCandidateCount)?v.closeCandidateCount:null,dismissed:v?.dismissed===true,overlayGone:v?.overlayGone===true,humanRequirement:redact(v?.humanRequirement)};}
export async function inspectOptionalCheckoutDialog({page,checkpoint,beforeInteraction}){
 const report={status:'unavailable',decision:'unknown',optionalEvidence:'none',dismissed:false,overlayGone:false};
 try{
  const visible=[];for(const d of await page.locator('dialog,[role="dialog"],[role="alertdialog"]').all())if(await d.isVisible())visible.push(d);
  if(visible.length!==1)return safeOptionalDialogReport({...report,status:visible.length?'hold':'no_dialog',humanRequirement:visible.length?'Multiple visible dialogs; no unique safe action.':'No visible dialog; no action attempted.'});
  const dialog=visible[0];Object.assign(report,await dialog.evaluate(el=>{
   const clean=value=>String(value??'').replace(/https?:\/\/\S+|www\.\S+/gi,'[url]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]').replace(/\b(?:sk|pk)_(?:test|live)_\w+|\b(?:whsec|sbp)_\w+|\bBearer\s+\S+|\beyJ[\w.-]+/gi,'[secret]').replace(/\b(secret|password|token|otp|code)\s*[:=]\s*\S+/gi,'$1 [redacted]').replace(/[A-Za-z0-9_-]{28,}/g,'[identifier]').replace(/\p{N}+/gu,'[number]').replace(/\s+/g,' ').trim().slice(0,180);
   const visible=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
   const aria=el.getAttribute('aria-label')??'',refs=(el.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean).slice(0,4);const labelledby=refs.map(id=>el.ownerDocument.getElementById(id)?.textContent??'').join(' ');
   const headings=Array.from(el.querySelectorAll('h1,h2,h3,[role="heading"]')).filter(visible).slice(0,6).map(n=>n.innerText??n.textContent??'');
   const branding=Array.from(el.querySelectorAll('img,svg,[role="img"]')).filter(visible).slice(0,4).map(n=>n.getAttribute('aria-label')||n.getAttribute('alt')||(n.tagName.toLowerCase()==='svg'?n.querySelector('title')?.textContent:'')||'');
   const controls=Array.from(el.querySelectorAll('button,[role="button"],a')).filter(visible).slice(0,12).map(n=>n.getAttribute('aria-label')||n.getAttribute('title')||n.innerText||n.textContent||'');
   const names=controls.map(x=>x.replace(/\s+/g,' ').trim().toLowerCase()),cues=[aria,labelledby,...headings].join(' ').toLowerCase();
   const mandatory=/3[ -]?d[ -]?secure|\b3ds\b|captcha|verification (?:is )?(?:required|mandatory)|must (?:verify|authenticate)|authentication (?:is )?required/.test(cues);
   const guest=names.some(x=>['pay as guest','pay as a guest','continue as guest','continue as a guest','pay without link','continue without link'].includes(x));
   const alternative=names.some(x=>['use a different payment method','use another payment method','choose a different payment method'].includes(x));
   const optional=/signing in is optional|you can (?:also )?(?:pay|continue) as (?:a )?guest|continue without signing in/.test(cues);
   const evidence=guest?'guest':alternative?'alternative_payment':optional?'explicit_optional':'none';
   return{status:'inspected',decision:mandatory?'mandatory':evidence!=='none'?'optional':'unknown',optionalEvidence:evidence,accessibleName:clean(aria||labelledby||headings[0]||''),ariaLabel:clean(aria),labelledbyText:clean(labelledby),headings:headings.map(clean),providerBranding:branding.map(clean),controls:controls.map(clean)};
  }));
  const snapshot=await readCheckoutSubmitObstruction(page,null);if(snapshot.signals.captchaFrame||snapshot.signals.challengeFrame)report.decision='mandatory';
  await checkpoint({phase:'provider_checkout_optional_dialog_inspected',diagnosticOnly:true,trial:false,realSubmitAttempted:false,optionalDialog:safeOptionalDialogReport(report)});
  if(report.decision!=='optional')return safeOptionalDialogReport({...report,status:'hold',humanRequirement:'Verification is mandatory or optionality is unproven; do not enter a code or dismiss.'});
  const candidates=[];for(const b of await dialog.getByRole('button',{name:/^(?:close|close dialog|close modal|cancel|back)$/i}).all())if(await b.isVisible()&&await b.evaluate(el=>el.tagName==='BUTTON'&&el.type==='button'))candidates.push(b);
  report.closeCandidateCount=candidates.length;if(candidates.length!==1)return safeOptionalDialogReport({...report,status:'hold',humanRequirement:'Optional route offered, but no unique nonfinancial Close/Cancel/Back button.'});
  await beforeInteraction();
  await checkpoint({phase:'provider_checkout_optional_dialog_before_close',diagnosticOnly:true,trial:false,realSubmitAttempted:false,optionalDialog:safeOptionalDialogReport(report)});
  await candidates[0].click({timeout:5000});report.dismissed=true;
  await dialog.waitFor({state:'hidden',timeout:5000});const after=await readCheckoutSubmitObstruction(page,null);
  report.overlayGone=after.status==='inspected'&&Object.values(after.signals).every(v=>v===false);
  return safeOptionalDialogReport({...report,status:report.overlayGone?'dismissed':'hold',humanRequirement:report.overlayGone?'':'Dialog or challenge remains; no trial permitted.'});
 }catch{return safeOptionalDialogReport({...report,status:'hold',humanRequirement:report.dismissed?'Dismissal uncertain or overlay remains; no retry.':'Dialog inspection/action uncertain; no retry.'});}
}
