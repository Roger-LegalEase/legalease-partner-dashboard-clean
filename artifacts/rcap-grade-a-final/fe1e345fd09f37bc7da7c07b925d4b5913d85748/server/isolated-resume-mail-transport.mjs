// Test-only local email transport. This is Mailpit evidence, not a real Resend delivery claim.
if(process.env.NEXT_PUBLIC_SUPABASE_URL!=="http://127.0.0.1:54321" || process.env.VERCEL_ENV!=="development" || process.env.RESEND_API_KEY!=="local-mailpit-only") throw Error("Isolated email transport only");
const actualFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const url=String(input instanceof Request?input.url:input);
 return actualFetch(url==="https://api.resend.com/emails"?"http://127.0.0.1:54326/emails":input,init);
};
