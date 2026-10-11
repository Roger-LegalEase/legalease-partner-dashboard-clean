"use client";
import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import type { getProgramOperations } from "@/lib/partners/onboarding/program-operations-service";
import { ArtifactDocumentView } from "@/components/partners/onboarding/ArtifactDocumentView";
import { CoBrandedPageView } from "@/components/partners/onboarding/CoBrandedPageView";
import type { InternalOnboardingSnapshot } from "@/lib/partners/onboarding/service";
import { ProgramAgreements } from "../ProgramAgreements";
type Operations=Awaited<ReturnType<typeof getProgramOperations>>;
const control="mt-1 min-h-11 w-full rounded border border-slate-300 bg-white p-2";
const button="min-h-11 rounded border border-slate-300 px-4 py-2 font-bold disabled:opacity-50";
export function ProgramDiagnostics({initial,documents}:{initial:Operations;documents?:InternalOnboardingSnapshot|null}){
 const router=useRouter();const [ops,setOps]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [reason,setReason]=useState(""),[expires,setExpires]=useState(""),[confirmed,setConfirmed]=useState(false),[keys,setKeys]=useState<string[]>([]),[resolution,setResolution]=useState("not_applicable");
 const [documentId,setDocument]=useState(initial.preflight?.commercialDocuments.length===1?initial.preflight.commercialDocuments[0].id:""),[screenings,setScreenings]=useState(""),[policy,setPolicy]=useState(""),[conditions,setConditions]=useState(""),[termination,setTermination]=useState(""),[agreement,setAgreement]=useState("executed");
 const [kind,setKind]=useState(initial.identity.policyVersion==="legacy"?"sponsored":"screening_only"),[packetId,setPacketId]=useState(""),[packetCap,setPacketCap]=useState("");
 const [serverSnapshot,setServerSnapshot]=useState(initial);
 if(initial!==serverSnapshot){setServerSnapshot(initial);if(initial.identity.version>=ops.identity.version)setOps(initial);}
 useEffect(()=>{
  const reveal=()=>{const target=document.getElementById(window.location.hash.slice(1));if(target instanceof HTMLDetailsElement)target.open=true;};
  reveal();window.addEventListener("hashchange",reveal);return()=>window.removeEventListener("hashchange",reveal);
 },[]);
 const request=useRef<{payload:string;id:string}|null>(null);
 const [capability,setCapability]=useState("publish_partner_page");
 const eligible=(ops.policies[capability]?.requirements??[]).filter(r=>r.owner_domain==="legalease_business"&&r.classification==="EXCEPTION_ELIGIBLE");
 const decisions=(ops.decisions??[]).filter(d=>d.approval_type==="standing_launch_authorization");
 const grants=(ops.exceptions??[]).filter(e=>e.kind==="grant"&&!(ops.exceptions??[]).some(r=>r.kind==="revoke"&&r.grant_id===e.id));
 async function run(action:string,extra:Record<string,unknown>={}){
  if(!ops.view)return;
  setBusy(true);setMessage("");try{
   const payload=JSON.stringify({action,version:ops.view.version,scopeHash:ops.view.decision.scopeHash,reason,expiresAt:expires?new Date(expires).toISOString():null,confirmed,...extra});
   if(request.current?.payload!==payload)request.current={payload,id:crypto.randomUUID()};
   const response=await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(ops.view.partnerSlug)}/program`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...JSON.parse(payload),requestId:request.current.id})});
   const body=await response.json();if(!response.ok||!body.operations)throw new Error(typeof body.error==="string"?body.error:"Program operation failed. Retry.");
   setOps(body.operations);request.current=null;setConfirmed(false);setMessage(body.operations.view?.decision.live?"Program is live and publication is verified.":"Saved. The current program status is shown below.");router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Please retry.");}finally{setBusy(false);}
 }
 async function commercial(action:"capacity"|"authority"){
  if(!ops.preflight)return;setBusy(true);setMessage("");
  try{
   const payload={workspaceVersion:ops.preflight.workspaceVersion,documentId,authorityReference:reason,confirmed,kind,packetEntitlementId:packetId,expiresAt:expires?new Date(expires).toISOString():null,screeningsAllowed:Number(screenings),packetCap:Number(packetCap)};
   const key=JSON.stringify({action,...payload});if(request.current?.payload!==key)request.current={payload:key,id:crypto.randomUUID()};
   const response=await fetch(`/api/internal/partners/onboarding/phase1/${ops.identity.partnerSlug}/${action==="capacity"?"launch-capacity":"commercial-authority"}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...payload,requestId:request.current.id})});
   const body=await response.json();if(!response.ok)throw new Error(body.error??"Authority could not be recorded.");request.current=null;setConfirmed(false);setMessage(action==="capacity"?"Documented allocation saved. Record the associated service authority.":"Service authority recorded. Current publication requirements are shown above.");router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Please retry.");}finally{setBusy(false);}
 }
 async function qualify(){
  setBusy(true);setMessage("");try{
   const response=await fetch("/api/internal/partners/admin-action",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"mark_qualified",partnerSlug:ops.identity.partnerSlug})});
   const body=await response.json();if(!response.ok||!body.persisted)throw new Error(body.error??"Partner qualification could not be saved.");router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Please retry.");}finally{setBusy(false);}
 }
 const issues=ops.issues.length?<div role="alert" className="rounded border border-amber-300 bg-amber-50 p-4">{ops.issues.map(issue=><p key={issue.loader}>{issue.message}</p>)}<button className={button} onClick={()=>window.location.reload()}>Reload workspace</button></div>:null;
 if(!ops.view)return <section aria-label="Program operations">{issues}{!issues?<p role="alert">Program readiness could not be loaded. <button className={button} onClick={()=>window.location.reload()}>Reload workspace</button></p>:null}<a className="underline" href={`/internal/partners/onboarding/${ops.identity.partnerSlug}`}>Return to program workspace</a></section>;
 const view=ops.view;
 const legacy=ops.identity.policyVersion==="legacy";
 const limitedAuthorityLocked=ops.identity.landingPageReady||["live","closed"].includes(ops.identity.status);
 const authorized=confirmed&&reason.trim().length>=10&&!!expires;
 return <section className="mt-6 space-y-6" aria-label="Program operations">
  {issues}
  <div className="rounded-xl border bg-white p-6"><h1 className="text-2xl font-bold">Administrative diagnostics</h1><p>Use these tools only for documented external arrangements, exceptions or recovery. Start Program remains in the program workspace.</p>
   <a className="underline" href={`/internal/partners/onboarding/${view.partnerSlug}`}>Return to program workspace</a>
   <label className="mt-4 block">Decision basis<textarea className={control} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <label className="mt-4 block">Contract or delegation expiration<input type="datetime-local" className={control} value={expires} onChange={e=>setExpires(e.target.value)}/></label>
   <label className="mt-4 flex gap-3"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed the evidence and authorize this administrative action.</label>
   <p role="status">{message}</p>
   {ops.preflight&&!ops.preflight.qualificationVerified?<button className={button} disabled={busy||!confirmed||reason.trim().length<10} onClick={qualify}>Confirm partner qualification</button>:null}
   {!legacy?<button className={button} disabled={busy||!authorized||!ops.preflight?.commercialValid||view.decision.operatingModel==="legalease_managed"} onClick={()=>run("delegate")}>Record scoped partner publication delegation</button>:null}
   {decisions[0]?.decision==="approve"?<button className={button} disabled={busy||reason.trim().length<10} onClick={()=>run("withdraw_delegation")}>Revoke standing authorization</button>:null}
  </div>
  <fieldset disabled={busy||!ops.launchDecision}>{!legacy?<details className="rounded-xl border bg-white p-6"><summary className="min-h-11 cursor-pointer text-xl font-bold">Business policy and scoped exceptions</summary><p className="mt-2">Standard business defaults apply automatically. Select any eligible requirements for a documented alternative or exception. Legal, financial, security, and participant-consent requirements remain enforced.</p>
   <label className="mt-4 block">Capability<select className={control} value={capability} onChange={e=>{setCapability(e.target.value);setKeys([]);}}><option value="publish_partner_page">Publish the program page</option><option value="publish_clinic">Open a clinic</option><option value="view_reporting">View reporting</option></select></label><div className="mt-4 space-y-3">{eligible.map(r=><label key={r.key} className="flex gap-3"><input type="checkbox" checked={keys.includes(r.key)} onChange={e=>setKeys(current=>e.target.checked?[...current,r.key]:current.filter(k=>k!==r.key))}/><span>{r.label}<span className="block text-sm">{r.default_applied?"Standard default applies":r.exception_id?"Scoped exception applies":"Original requirement applies"}</span></span></label>)}</div>
   <label className="mt-4 block">Decision<select className={control} value={resolution} onChange={e=>setResolution(e.target.value)}><option value="not_applicable">Not applicable to this program</option><option value="alternative_authorized">Documented alternative authorized</option><option value="exception_granted">Scoped exception granted</option></select></label>
   <button className={`mt-4 ${button}`} disabled={busy||!ops.policies[capability]||!keys.length||reason.trim().length<10} onClick={()=>run("exception",{capability,keys,resolution,hashes:Object.fromEntries(eligible.filter(r=>keys.includes(r.key)).map(r=>[r.key,r.dependency_hash]))})}>Apply selected business decisions</button>
   {grants.map(g=><div key={g.id} className="mt-4 border-t pt-3"><p>{g.reason} · {g.resolution.replaceAll("_"," ")}</p><button className={button} disabled={busy||!ops.policies[g.requested_action]||reason.trim().length<10} onClick={()=>run("exception",{grantId:g.id,capability:g.requested_action,keys:g.requirement_keys,resolution:g.resolution,hashes:Object.fromEntries((ops.policies[g.requested_action]?.requirements??[]).filter(r=>g.requirement_keys.includes(r.key)).map(r=>[r.key,r.dependency_hash]))})}>Revoke this decision</button></div>)}
  </details>:null}
  <details id="program-service-authority" className="rounded-xl border bg-white p-6"><summary className="min-h-11 cursor-pointer text-xl font-bold">Service authority and agreements</summary><p className="mt-2">Record the actual agreement, documented allocation and service authority here. These actions do not record a payment or sign on anyone’s behalf.</p>
   {documents?<ProgramAgreements partnerSlug={view.partnerSlug} snapshot={documents}/>:<p>Agreement details are unavailable. Reload to retry.</p>}
   <h3 className="mt-6 text-lg font-bold">Record service authority</h3>
   <label className="mt-4 block">Service arrangement<select className={control} value={kind} onChange={e=>setKind(e.target.value)}>{!legacy?<option value="screening_only">Screening only</option>:null}<option value="sponsored">Documented sponsorship</option><option value="purchase_order">Approved purchase order</option><option value="verified_paid">Verified payment</option></select></label>
   <label className="mt-4 block">Reviewed supporting document<select className={control} value={documentId} onChange={e=>setDocument(e.target.value)}><option value="">Choose a document</option>{(ops.preflight?.commercialDocuments??[]).map(d=><option key={d.id} value={d.id}>{d.original_filename}</option>)}</select></label>
   {kind==="screening_only"&&!legacy?limitedAuthorityLocked?<p className="mt-4">Limited-service authority cannot be replaced while this program is published or closed. <a className="underline" href={`/internal/partners/onboarding/${view.partnerSlug}#configure-program`}>Review the program configuration</a> before changing its service arrangement. Current authority can still be revoked below.</p>:<><label className="mt-4 block">Agreement basis<select className={control} value={agreement} onChange={e=>setAgreement(e.target.value)}><option value="executed">Genuine executed agreement</option><option value="not_required">Documented policy does not require an agreement</option></select></label>
   <label className="mt-4 block">Policy or authority reference<textarea className={control} value={policy} onChange={e=>setPolicy(e.target.value)}/></label>
   <label className="mt-4 block">Effective conditions<textarea className={control} value={conditions} onChange={e=>setConditions(e.target.value)}/></label>
   <label className="mt-4 block">Termination or revocation rule<textarea className={control} value={termination} onChange={e=>setTermination(e.target.value)}/></label>
   <label className="mt-4 block">Documented screening allowance<input className={control} type="number" min="1" value={screenings} onChange={e=>setScreenings(e.target.value)}/></label>
   <button className={`mt-4 ${button}`} disabled={busy||!ops.preflight||!authorized||!documentId||Number(screenings)<1||[policy,conditions,termination].some(v=>v.trim().length<10)} onClick={()=>run("limited_authority",{documentId,screenings:Number(screenings),basis:{agreement_requirement:agreement,funding_obligation:"none",policy_reference:policy,effective_conditions:conditions,termination_rule:termination}})}>Record limited-service authority</button></>:<>
    <label className="mt-4 block">Existing packet allocation<select className={control} value={packetId} onChange={e=>setPacketId(e.target.value)}><option value="">Choose the documented allocation</option>{(ops.preflight?.packetAllocations??[]).map(p=><option key={p.id} value={p.id}>{p.packet_cap} sponsored packets</option>)}</select></label>
    <button className={`mt-4 ${button}`} disabled={busy||!ops.preflight||!authorized||!documentId||!packetId} onClick={()=>commercial("authority")}>Record funded service authority</button>
    <details className="mt-4"><summary className="min-h-11 cursor-pointer font-bold">Record a documented allocation</summary><p>Use the amounts supported by the approved arrangement. This creates an auditable allocation and does not mark an invoice paid.</p>
     <label className="mt-3 block">Documented screening allowance<input className={control} type="number" min="1" value={screenings} onChange={e=>setScreenings(e.target.value)}/></label>
     <label className="mt-3 block">Documented packet allowance<input className={control} type="number" min="1" value={packetCap} onChange={e=>setPacketCap(e.target.value)}/></label>
     <button className={`mt-3 ${button}`} disabled={busy||!ops.preflight||!confirmed||reason.trim().length<10||!documentId||Number(screenings)<1||Number(packetCap)<1} onClick={()=>commercial("capacity")}>Save documented allocation</button>
    </details></>}
   {view.decision.authorityId?<button className={`mt-4 ml-3 ${button}`} disabled={busy||!confirmed||reason.trim().length<10} onClick={()=>run("revoke_authority")}>Revoke current service authority</button>:null}
  </details></fieldset>
  <details className="rounded-xl border bg-white p-6"><summary className="min-h-11 cursor-pointer text-xl font-bold">View audit/history</summary><p className="mt-2">Recorded program decisions remain in the audit history when superseded or revoked.</p><ol className="mt-4 space-y-4">{(ops.decisions??[]).map(d=><li key={d.id} className="break-words border-t pt-3"><p className="font-bold">{d.approval_type.replaceAll("_"," ")} · {d.decision}{d.invalidated_at?" · superseded":""}</p><p>Recorded {new Date(d.recorded_at).toLocaleString()} · Actor {d.reviewer_user_id}</p>{typeof d.policy_details?.scope_hash==="string"?<p className="break-all text-sm">Program scope: {d.policy_details.scope_hash}</p>:null}{typeof d.policy_details?.materials_hash==="string"?<p className="break-all text-sm">Material versions: {d.policy_details.materials_hash}</p>:null}</li>)}</ol>{!ops.decisions?.length?<p className="mt-3">No program review decisions have been recorded.</p>:null}</details>
 </section>;
}
