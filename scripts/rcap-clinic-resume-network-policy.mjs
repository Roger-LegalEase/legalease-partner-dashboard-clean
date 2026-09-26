// Bounded resume traffic only. Analytics is acknowledged locally, never sent
// to Acceptance, so ordinary navigation does not create analytics records.
export async function handleResumeRequest(route,{origin,bypass,violations}){
 const request=route.request(),url=new URL(request.url()),method=request.method();
 if(url.origin===origin){
  if(method==='POST'&&url.pathname==='/api/analytics/web')return route.fulfill({status:204});
  if(method==='GET'||method==='HEAD'||(method==='POST'&&url.pathname==='/api/clinic/session/reset'))return route.continue({headers:{...request.headers(),'x-vercel-protection-bypass':bypass}});
  violations.push(`${method} ${url.pathname}`);return route.abort();
 }
 if(url.origin==='https://hyflxnlhpmiqxvvcoiia.supabase.co'&&url.pathname.startsWith('/auth/v1/'))return route.continue();
 violations.push(`${method} ${url.origin}${url.pathname}`);return route.abort();
}
