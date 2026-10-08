"use client";
import {ArtifactDocumentView} from "@/components/partners/onboarding/ArtifactDocumentView";
import type {RenderedDocument} from "@/lib/partners/onboarding/artifact-generator";
import {useState} from "react";
export function OperationalReview({partnerSlug,versions}:{partnerSlug:string;versions:Array<{id:string;rendered_content:RenderedDocument;approval_status:string;version_number:number}>}) {
 const [message,setMessage]=useState(""); const [pending,setPending]=useState(false);
 async function approve(id:string){setPending(true);try{const response=await fetch(`/api/partner-studio/${encodeURIComponent(partnerSlug)}/operational-review`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({versionId:id,requestId:crypto.randomUUID(),decision:"approve"})});const body=await response.json();setMessage(response.ok?"Operational review saved with your operator identity.":body.error??"Review unavailable.");}catch{setMessage("Review unavailable. Try again.");}finally{setPending(false);}}
 return <section className="mt-8"><h2 className="text-2xl font-bold">Operational materials</h2><p role="status">{message}</p>{versions.length===0?<p>No current operational materials have been generated.</p>:versions.map(version=><details key={version.id} className="mt-4 rounded-xl border p-5"><summary className="min-h-11 cursor-pointer font-bold">{version.rendered_content.documentTitle??"Operational document"}</summary><ArtifactDocumentView document={version.rendered_content} versionNumber={version.version_number}/><button disabled={pending} className="mt-5 min-h-11 rounded bg-navy px-4 text-white" onClick={()=>approve(version.id)}>Approve reviewed operational material</button></details>)}</section>;
}
