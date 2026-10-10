"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { getProgramOperations } from "@/lib/partners/onboarding/program-operations-service";
import { ArtifactDocumentView } from "@/components/partners/onboarding/ArtifactDocumentView";
import { CoBrandedPageView } from "@/components/partners/onboarding/CoBrandedPageView";

type Operations=Awaited<ReturnType<typeof getProgramOperations>>;
const button="min-h-11 rounded border px-5 py-2 font-bold disabled:opacity-50";
export function ProgramOperations({initial}:{initial:Operations}){
 const router=useRouter();const [ops,setOps]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[confirmed,setConfirmed]=useState(false),[preview,setPreview]=useState(false);
 const [serverSnapshot,setServerSnapshot]=useState(initial);
 if(initial!==serverSnapshot){setServerSnapshot(initial);if(initial.identity.version>=ops.identity.version){setOps(initial);setConfirmed(false);}}
 const [refreshing,startRefresh]=useTransition();
 const pendingOperation=busy||refreshing;
 const request=useRef<{payload:string;id:string}|null>(null);
 async function run(action:string){
  if(!ops.view)return;setBusy(true);setMessage("");
  try{
   const payload=JSON.stringify({action,version:ops.view.version,scopeHash:ops.view.decision.scopeHash,reviewToken:ops.view.reviewToken,confirmed:action==="upgrade_policy"?true:confirmed,reason:"Platform Admin confirms current program scope and reviewed materials",expiresAt:ops.preflight?.commercialAuthority?.expires_at});
   if(request.current?.payload!==payload)request.current={payload,id:crypto.randomUUID()};
   const response=await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(ops.identity.partnerSlug)}/program`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...JSON.parse(payload),requestId:request.current.id})});
   const body=await response.json();if(!response.ok||!body.operations)throw new Error(body.error??"This operation could not be completed.");
   setOps(body.operations);request.current=null;setConfirmed(false);
   if(action==="prepare")setPreview(true);
   if(body.operations.view?.decision.live){setMessage("Program is live. Published routing has been verified.");document.getElementById("program-dashboard")?.scrollIntoView({behavior:"smooth"});}
   else setMessage("Current materials are ready to preview.");
   startRefresh(()=>router.refresh());
  }catch(error){setMessage(error instanceof Error?error.message:"Reload and retry.");}finally{setBusy(false);}
 }
 const view=ops.view,managed=view?.decision.operatingModel==="legalease_managed",live=view?.decision.live;
 const pending=(ops.launchDecision?.blockers??[]).filter(b=>!managed||!["commercial_gate_cleared","access_model_and_capacity_present","legalease_final_review_complete"].includes(b.key));
 return <section className="mt-6 space-y-6" aria-label="Program operations">
  {ops.issues.length?<div role="alert" className="rounded border border-orange p-4">{ops.issues.map(i=><p key={i.loader}>{i.message}</p>)}<button className={button} onClick={()=>window.location.reload()}>Reload workspace</button></div>:null}
  <div id="program-dashboard" className="rounded-xl border bg-white p-6"><h2 className="text-2xl font-bold">{live?"Program dashboard":"Program status"}</h2>
   <dl className="mt-4 grid gap-5 sm:grid-cols-2" aria-label="Program status">
    <div><dt className="font-bold">Program setup</dt><dd>{view?.decision.configurationComplete?"Saved program details complete":"Save the required program details"}</dd></div>
    <div><dt className="font-bold">Operating authority</dt><dd>{managed?view?.decision.authorityId?"LegalEase operating decision recorded":"LegalEase-managed · Confirm with Start Program":ops.preflight?.commercialValid?"Current documented partner authority":"Partner-managed · Existing consent and contract requirements apply"}</dd></div>
    <div><dt className="font-bold">Publication</dt><dd>{live?"Published and routing verified":ops.canStart?"Ready for your final confirmation":"Preparation in progress"}</dd></div>
    <div><dt className="font-bold">Sponsored packets</dt><dd>{view?.capabilities.issue_sponsored_packet?`${view.commercial.packets??0} available under funded authority`:"No sponsored packets authorized"}</dd></div>
   </dl>
   {live?<div className="mt-5 flex flex-wrap gap-4"><a className={button} href={`/p/${ops.identity.partnerSlug}`}>Open participant page</a><a className={button} href={`/internal/clinic?partner=${ops.identity.partnerSlug}`}>Manage program clinics</a><a className={button} href="#program-activity">Program activity</a></div>:null}
  </div>
  {!live?<div id="program-materials" className="rounded-xl border bg-white p-6"><h2 className="text-2xl font-bold">Preview</h2><p className="mt-2">Generate current materials from the saved program. Only changed materials are regenerated.</p>
   {ops.identity.policyVersion==="legacy"?<div className="mt-4 rounded border p-4"><p>This workspace retains its existing policy and approvals. Selecting LegalEase-managed in configuration is an explicit operating-policy change. For a partner-managed program, choose the current workflow explicitly; existing contracts and consent remain required.</p><button className={button} disabled={pendingOperation} onClick={()=>run("upgrade_policy")}>Use five-step setup</button></div>:null}
   <button className={`mt-4 ${button}`} disabled={pendingOperation||!view||ops.identity.policyVersion==="legacy"} onClick={()=>run("prepare")}>{busy?"Preparing…":"Generate and preview materials"}</button>
   {preview&&view?.materials.length===2?<div className="mt-6 space-y-6" aria-label="Current program preview">{view.materials.map(material=><article key={material.type}><h3 className="mb-3 text-xl font-bold">{material.type==="implementation_brief"?"Program summary":"Participant page"} · Version {material.version}</h3>{material.document.pagePreview?<CoBrandedPageView preview={material.document.pagePreview} variant="desktop" logoSrc={material.document.pagePreview.logo.assetId?`/api/internal/partners/onboarding/phase1/${view.partnerSlug}/assets/${material.document.pagePreview.logo.assetId}`:null}/>:<ArtifactDocumentView document={material.document} versionNumber={material.version}/>}</article>)}</div>:null}
   {pending.length?<ul className="mt-5 list-disc pl-5">{pending.map(b=><li key={b.key}>{b.label}</li>)}</ul>:null}
   {preview&&view?.materials.length===2?<div className="mt-6 rounded border p-4"><h3 className="text-lg font-bold">Start Program</h3><p className="mt-2">{managed?"LegalEase operates this program.":"This program retains its documented partner operating authority."} Authorized jurisdictions: {view.data.geography_audience_language_accessibility?.jurisdictions?.join(", ")}. Services: {(view.data.program_goals?.service_mode??ops.preflight?.commercialAuthority?.kind??"documented services").replaceAll("_"," ")}. Spanish: {view.data.geography_audience_language_accessibility?.enable_spanish?"enabled":"disabled"}.</p>
    <label className="mt-4 flex gap-3"><input aria-label="Confirm operating scope and current materials" type="checkbox" disabled={pendingOperation} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm the actual operator, authorized jurisdictions, service capabilities and these exact materials. I authorize publication within this scope. This decision does not sign an external agreement, record a payment or create packet funding.</label>
    <button className={`mt-4 ${button} bg-navy text-white`} disabled={pendingOperation||!confirmed||!ops.canStart} onClick={()=>run("start")}>Start Program</button>
   </div>:null}
   {(!preview||view?.materials.length!==2)?<button className={`mt-4 ${button}`} disabled>Start Program</button>:null}
  </div>:null}
  <p role="status" className="whitespace-pre-wrap">{message}</p>
  <a className="inline-flex min-h-11 items-center text-sm underline" href={`/internal/partners/onboarding/${ops.identity.partnerSlug}/diagnostics`}>Administrative diagnostics and documented exceptions</a>
 </section>;
}
