"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InternalOnboardingSnapshot } from "@/lib/partners/onboarding/service";
import { AssetReviewControl } from "./AssetReviewControl";
const control = "mt-2 min-h-11 w-full rounded border bg-white p-2";
export function ProgramAgreements({partnerSlug, snapshot}:{partnerSlug:string;snapshot:InternalOnboardingSnapshot}) {
 const router=useRouter(), formRef=useRef<HTMLFormElement>(null);
 const request=useRef<{key:string;id:string}|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!snapshot.workspace)return;setBusy(true);setMessage("");
  try{
   const form=new FormData(event.currentTarget);
   const file=form.get("file");const digest=file instanceof File?Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,"0")).join(""):"";
   const key=JSON.stringify([snapshot.workspace.aggregateVersion,form.get("agreementType"),form.get("effectiveDate"),form.get("reviewReason"),form.get("confirmed"),digest]);
   if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
   form.set("requestId",request.current.id);form.set("expectedWorkspaceVersion",String(snapshot.workspace.aggregateVersion));form.set("confirmed",form.get("confirmed")==="on"?"true":"false");
   const response=await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}/signed-agreement`,{method:"POST",body:form});
   const body=await response.json();if(!response.ok)throw new Error(body.error??"The agreement could not be recorded.");
   request.current=null;setMessage("Executed agreement and private document recorded.");formRef.current?.reset();router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Please retry.");}finally{setBusy(false);}
 }
 async function updateMetadata(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!snapshot.workspace)return;setBusy(true);setMessage("");
  const form=new FormData(event.currentTarget);
  try{const response=await fetch(`/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"agreement",workspaceId:snapshot.workspace.id,expectedWorkspaceVersion:snapshot.workspace.aggregateVersion,requestId:crypto.randomUUID(),payload:{agreementType:form.get("agreementType"),status:form.get("status"),required:form.get("required")==="on",partnerSafeDetail:form.get("detail"),finalizedAssetId:form.get("asset")||null,effectiveDate:form.get("date")||null}})});const body=await response.json();if(!response.ok)throw new Error(body.error);setMessage("Agreement evidence updated.");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Please retry.");}finally{setBusy(false);}
 }
 return <div className="space-y-5">
  <h3 className="text-lg font-bold">Agreements and supporting documents</h3>
  <ul>{snapshot.agreements.map(a=><li key={a.type} className="mt-2">{a.type.replaceAll("_"," ")}: {a.status.replaceAll("_"," ")}{a.required?" · Required":""}{a.finalizedAssetId?<a className="ml-3 underline" href={`/api/internal/partners/onboarding/phase1/${partnerSlug}/assets/${a.finalizedAssetId}`} target="_blank" rel="noreferrer">Inspect document</a>:null}</li>)}</ul>
  <details><summary className="min-h-11 cursor-pointer font-bold">Record an executed agreement</summary>
   <form ref={formRef} onSubmit={save} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
    <label className="block">Executed agreement type<select name="agreementType" className={control}><option value="order_form">Order form</option><option value="master_services_agreement">Master services agreement</option></select></label>
    <label className="block">Signed PDF or DOCX<input name="file" className={control} type="file" accept=".pdf,.docx" required /></label>
    <label className="block">Agreement effective date<input name="effectiveDate" className={control} type="date" max={new Date().toISOString().slice(0,10)} required /></label>
    <label className="block">Agreement review basis<textarea name="reviewReason" className={control} minLength={10} required /></label>
    <label className="flex gap-3"><input name="confirmed" type="checkbox" required/>I inspected the executed document and verified the parties and signatures. This records existing evidence and does not sign for anyone.</label>
    <button className="min-h-11 rounded border px-4" type="submit">Record executed agreement</button>
   </fieldset></form>
  </details>
  <details><summary className="min-h-11 cursor-pointer font-bold">Record privacy or procurement evidence</summary>
   <form onSubmit={updateMetadata}><fieldset disabled={busy} className="space-y-3">
    <label className="block">Evidence type<select className={control} name="agreementType"><option value="data_privacy_security_addendum">Data privacy and security addendum</option><option value="procurement_requirements">Procurement requirements</option></select></label>
    <label className="block">Evidence status<select name="status" className={control}>{["not_started","requested","under_review","finalized","executed","approved","not_required"].map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}</select></label>
    <label className="flex gap-3"><input name="required" type="checkbox" defaultChecked/>Required for this arrangement</label>
    <label className="block">Reviewed document<select name="asset" className={control}><option value="">No finalized document</option>{snapshot.assets.filter(a=>a.category==="procurement_document").map(a=><option key={a.id} value={a.id}>{a.originalFileName}</option>)}</select></label>
    <label className="block">Effective date<input name="date" type="date" className={control}/></label>
    <label className="block">Evidence or policy basis<textarea name="detail" className={control} required minLength={10}/></label>
    <button className="min-h-11 rounded border px-4" type="submit">Save agreement evidence</button>
   </fieldset></form>
  </details>
  <p role="status">{message}</p>
  <AssetReviewControl partnerSlug={partnerSlug} assets={snapshot.assets}/>
 </div>;
}
