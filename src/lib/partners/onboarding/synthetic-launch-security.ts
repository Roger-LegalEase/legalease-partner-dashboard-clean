import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
export function isDisposableLaunchEnvironment(environment:Readonly<Record<string,string|undefined>>=process.env){
 try{return environment.VERCEL_ENV!=="production" && environment.NODE_ENV!=="test-production" && environment.RCAP_SYNTHETIC_LAUNCH_ENABLED==="true" && new URL(environment.NEXT_PUBLIC_SUPABASE_URL??"").hostname==="127.0.0.1" && new URL(environment.RCAP_SYNTHETIC_PUBLIC_ORIGIN??"").hostname==="127.0.0.1";}catch{return false;}
}
export function syntheticVerificationToken(slug:string,operationId:string){
 if(!isDisposableLaunchEnvironment() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return "";
 return createHmac("sha256",process.env.SUPABASE_SERVICE_ROLE_KEY).update(`rcap-staged:${slug}:${operationId}`).digest("hex");
}
export function acceptsSyntheticVerification(slug:string,operationId:string,token:string|null){const expected=syntheticVerificationToken(slug,operationId);return Boolean(expected && token && token.length===expected.length && timingSafeEqual(Buffer.from(expected),Buffer.from(token)));}
