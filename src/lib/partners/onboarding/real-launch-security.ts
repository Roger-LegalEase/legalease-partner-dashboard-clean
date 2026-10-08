import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
/** Separate owner-controlled release gate; neither synthetic registration nor UI confirmation enables it. */
export function realLaunchOrigin(env:Readonly<Record<string,string|undefined>>=process.env):string|null {
 if(env.RCAP_PARTNER_LAUNCH_ENABLED!=="true" || !env.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION?.trim())return null;
 try{const url=new URL(env.RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN??"");
 if(url.username||url.password||url.pathname!=="/"||url.search||url.hash)return null;
 if(url.protocol==="https:" && !url.port && env.VERCEL_ENV==="production" && /^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA??"") && env.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION===`release:${env.VERCEL_GIT_COMMIT_SHA}` && ["expungement.ai","www.expungement.ai","legaleasepartner.com","www.legaleasepartner.com"].includes(url.hostname))return url.origin;
 if(env.VERCEL_ENV!=="production" && url.protocol==="http:" && url.hostname==="127.0.0.1" && new URL(env.NEXT_PUBLIC_SUPABASE_URL??"").hostname==="127.0.0.1")return url.origin;
 }catch{/* A malformed origin must hold publication. */}return null;
}
export function realVerificationToken(slug:string,operation:string){
 if(!realLaunchOrigin()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return "";
 return createHmac("sha256",process.env.SUPABASE_SERVICE_ROLE_KEY).update(`rcap-real-staged:${slug}:${operation}`).digest("hex");
}
export function acceptsRealVerification(slug:string,operation:string,token:string|null){const expected=realVerificationToken(slug,operation);return Boolean(expected&&token&&/^[a-f0-9]{64}$/.test(token)&&token.length===expected.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(token)));}

/** An interrupted verification must not leave an uncompleted publication open. */
export function realLaunchLeaseActive(createdAt:string,now=Date.now()){
 const age=now-Date.parse(createdAt);return Number.isFinite(age)&&age>=0&&age<15*60*1000;
}
