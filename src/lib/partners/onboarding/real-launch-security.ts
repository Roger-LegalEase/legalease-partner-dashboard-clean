import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
/** Exact per-deployment Acceptance authority; it grants no database role or program decision. */
export function acceptancePreviewLaunchBinding(env:Readonly<Record<string,string|undefined>>=process.env){
 if(env.VERCEL_ENV!=="preview"||env.VERCEL!=="1"||env.RCAP_PARTNER_LAUNCH_ENABLED!=="true")return null;
 if(!env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()||/[\r\n]/.test(env.VERCEL_AUTOMATION_BYPASS_SECRET))return null;
 try{
  const binding=JSON.parse(env.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION??"");
  const fields=["schema","applicationSha","projectId","supabaseProjectRef","partnerSlug","adminAuthUserId"];
  if(!binding||typeof binding!=="object"||Array.isArray(binding)||Object.keys(binding).sort().join()!==fields.sort().join()
   ||Object.values(binding).some(value=>typeof value!=="string"))return null;
  if(binding.schema!=="rcap-partner-acceptance-launch/v1"||!/^[a-f0-9]{40}$/.test(binding.applicationSha)
   ||binding.applicationSha!==env.VERCEL_GIT_COMMIT_SHA||binding.applicationSha!==env.NEXT_PUBLIC_RCAP_BUILD_SHA
   ||binding.projectId!=="prj_cdgwGzFqIHgEUlzEburSLaZETdQV"||binding.projectId!==env.VERCEL_PROJECT_ID
   ||binding.supabaseProjectRef!=="hyflxnlhpmiqxvvcoiia"
   ||env.SUPABASE_URL!=="https://hyflxnlhpmiqxvvcoiia.supabase.co"||env.NEXT_PUBLIC_SUPABASE_URL!==env.SUPABASE_URL
   ||binding.partnerSlug!=="legalease-ordinary-qa-20261024"
   ||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(binding.adminAuthUserId)
   ||!/^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID??"")||!/^[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL??""))return null;
  const origin=`https://${env.VERCEL_URL}`;
  if(env.RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN&&env.RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN!==origin)return null;
  return {applicationSha:binding.applicationSha as string,projectId:binding.projectId as string,
   supabaseProjectRef:binding.supabaseProjectRef as string,partnerSlug:binding.partnerSlug as string,
   adminAuthUserId:binding.adminAuthUserId as string,deploymentId:env.VERCEL_DEPLOYMENT_ID!,origin};
 }catch{return null;}
}
/** Separate owner-controlled release gate; neither synthetic registration nor UI confirmation enables it. */
export function realLaunchOrigin(env:Readonly<Record<string,string|undefined>>=process.env,context?:{partnerSlug:string;authUserId:string;role:string}):string|null {
 if(env.RCAP_PARTNER_LAUNCH_ENABLED!=="true" || !env.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION?.trim())return null;
 const preview=acceptancePreviewLaunchBinding(env);
 if(preview)return context?.role==="internal_admin"&&context.partnerSlug===preview.partnerSlug&&context.authUserId===preview.adminAuthUserId?preview.origin:null;
 try{const url=new URL(env.RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN??"");
 if(url.username||url.password||url.pathname!=="/"||url.search||url.hash)return null;
 if(url.protocol==="https:" && !url.port && env.VERCEL_ENV==="production" && /^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA??"") && env.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION===`release:${env.VERCEL_GIT_COMMIT_SHA}` && ["expungement.ai","www.expungement.ai","legaleasepartner.com","www.legaleasepartner.com"].includes(url.hostname))return url.origin;
 if(env.VERCEL_ENV!=="production" && url.protocol==="http:" && url.hostname==="127.0.0.1" && new URL(env.NEXT_PUBLIC_SUPABASE_URL??"").hostname==="127.0.0.1")return url.origin;
 }catch{/* A malformed origin must hold publication. */}return null;
}
export function realLaunchSourceBound(env:Readonly<Record<string,string|undefined>>=process.env){
 return Boolean(realLaunchOrigin(env)||acceptancePreviewLaunchBinding(env));
}
export function realVerificationToken(slug:string,operation:string){
 const preview=acceptancePreviewLaunchBinding();
 if(preview){
  if(slug!==preview.partnerSlug||!process.env.SUPABASE_SERVICE_ROLE_KEY)return "";
  return createHmac("sha256",process.env.SUPABASE_SERVICE_ROLE_KEY).update(JSON.stringify(["rcap-real-preview-staged",preview.applicationSha,preview.deploymentId,preview.adminAuthUserId,slug,operation])).digest("hex");
 }
 if(!realLaunchOrigin()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return "";
 return createHmac("sha256",process.env.SUPABASE_SERVICE_ROLE_KEY).update(`rcap-real-staged:${slug}:${operation}`).digest("hex");
}
export function acceptsRealVerification(slug:string,operation:string,token:string|null){const expected=realVerificationToken(slug,operation);return Boolean(expected&&token&&/^[a-f0-9]{64}$/.test(token)&&token.length===expected.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(token)));}

/** An interrupted verification must not leave an uncompleted publication open. */
export function realLaunchLeaseActive(createdAt:string,now=Date.now()){
 const age=now-Date.parse(createdAt);return Number.isFinite(age)&&age>=0&&age<15*60*1000;
}
