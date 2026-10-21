// Independent bounded VM component behavior review. No DOM hydration or live auth claimed.
(async()=>{
const {default:fs}=await import('node:fs');
const {default:path}=await import('node:path');
const {default:vm}=await import('node:vm');
const {default:assert}=await import('node:assert/strict');
const {default:crypto}=await import('node:crypto');
const {default:cp}=await import('node:child_process');
const {default:ts}=await import('typescript');
const realReact=await import('react');
const realJsx=await import('react/jsx-runtime');
const realReactServer=await import('react-dom/server');
const root=process.cwd();
const file='src/components/expungement-ai/ConsumerSignInForm.tsx';let src=fs.readFileSync(file,'utf8');const omittedPasswordlessDismissal=process.argv.includes('--omit-passwordless-dismissal');if(omittedPasswordlessDismissal){for(const kind of ['magic','oauth']){const before='setPasswordlessState("'+kind+'");\n    setErrorMessage("");\n    setPendingClaimFailed(false);';assert(src.includes(before),'Mutation anchor '+kind);src=src.replace(before,'setPasswordlessState("'+kind+'");\n    setErrorMessage("");')}}const old=cp.execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),valid='A'.repeat(40),checks=[];
const tick=()=>new Promise(r=>setImmediate(r));
function rig(source,search,server=false){
 let loc=new URL('https://example.invalid/sign-in'+search),locale='en',pendingFetch,pendingOtp,pendingOauth,states=[],index=0,dirty=false,effects=[],hydrating=server; const handlers=new Map(),calls=[];
 const window={location:{get search(){return loc.search},get href(){return loc.href},get hostname(){return loc.hostname},get origin(){return loc.origin},assign:p=>calls.push({type:'redirect',path:p})},history:{state:{},replaceState:(_s,_t,p)=>{loc=new URL(p,loc)}},addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:(n,f)=>{if(handlers.get(n)===f)handlers.delete(n)}};
 const translate=(key,fallback)=>key==='signin.pending_claim_error'?locale+':pending-claim':fallback;
 const deps={
  react:{useState:initial=>{const n=index++;if(!(n in states))states[n]=typeof initial==='function'?initial():initial;return [states[n],x=>{states[n]=typeof x==='function'?x(states[n]):x;dirty=true}]},useEffect:(f,ds)=>{const n=index++;if(!states[n]||ds.some((x,i)=>x!==states[n][i])){states[n]=ds;effects.push(f)}},useSyncExternalStore:(_sub,get,ss)=>hydrating?ss():get()},
  'react/jsx-runtime':{Fragment:'fragment',jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  'next/link':{default:'link'},
  '@/components/auth/TurnstileWidget':{TurnstileWidget:'captcha'},
  '@/lib/auth/captcha':{authCaptchaFailureMessage:'captcha-error',captchaOptions:()=>({}),isAuthCaptchaRequired:()=>false},
  '@/lib/app-url':{absoluteExpungementAiUrl:p=>'https://example.invalid'+p},
  '@/lib/supabase/browser':{createBrowserSupabaseClient:()=>({auth:{signInWithOtp:()=>new Promise(r=>{pendingOtp=r;calls.push({type:'otp'})}),signInWithOAuth:()=>new Promise(r=>{pendingOauth=r;calls.push({type:'oauth'})})}})},
  '@/components/expungement-ai/LocalizationProvider':{useLocalization:()=>({t:translate})}
 };
 if(server==='real'){deps.react=realReact;deps['react/jsx-runtime']=realJsx;deps['next/link']=props=>realReact.createElement('a',props,props.children)}
 const cache=new Map();
 function load(relative,text){
  if(cache.has(relative))return cache.get(relative);
  const mod={exports:{}};cache.set(relative,mod.exports);
  const out=ts.transpileModule(text??fs.readFileSync(path.join(root,relative),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInNewContext(out,{module:mod,exports:mod.exports,require:name=>{if(name in deps)return deps[name];if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');throw Error('Unrecognized dependency '+name)},window:server?undefined:window,URL,URLSearchParams,FormData:class{constructor(form){this.form=form||{}}get(k){return this.form[k]}},fetch:async(_url,options)=>{calls.push({type:'claim',body:JSON.parse(options.body)});return new Promise(r=>{pendingFetch=r})},console,process});return mod.exports;
 }
 const component=load(file,source);
 function render(){let tree;for(let n=0;n<5;n++){dirty=false;index=0;tree=component.ConsumerSignInForm();let es=effects;effects=[];for(const f of es)f();if(!dirty)return tree}throw Error('Render did not converge')}
 function all(node,results=[]){if(!node||typeof node!=='object')return results;if(Array.isArray(node)){for(const n of node)all(n,results);return results}results.push(node);all(node.props?.children,results);return results}
 function text(node){if(node==null||node===false)return '';if(typeof node!=='object')return String(node);if(Array.isArray(node))return node.map(text).join('');return text(node.props?.children)}
 const api={serverRender:()=>realReactServer.renderToString(realReact.createElement(component.ConsumerSignInForm)),render,all,text,calls,window,get location(){return loc},setLocale:s=>{locale=s},clientSnapshot:()=>{hydrating=false},retry:tree=>all(tree).find(n=>n.props?.['data-pending-claim-retry']),button:(tree,label)=>all(tree).find(n=>n.type==='button'&&text(n).includes(label)),notice:tree=>text(tree).includes('Check your email for a secure sign-in link'),resolveClaim:status=>pendingFetch({status,ok:status>=200&&status<300,json:async()=>status===200?{redirectTo:'/briefcase/matters/11111111-1111-4111-8111-111111111111'}:{}}),resolveOtp:error=>pendingOtp({error}),resolveOauth:error=>pendingOauth({error})};
 return api;
}
async function check(name,fn){try{checks.push({name,passed:true,...await fn()})}catch(e){checks.push({name,passed:false,error:e.message})}}
 await check('Real React server render does not expose browser claim retry state',()=>{const r=rig(src,'?claimRetry=1&claim='+valid,'real');const html=r.serverRender();assert(!html.includes('data-pending-claim-retry'));assert(!html.includes('pending-claim'));assert(html.includes('Sign in to continue'));return {actualReactServerRenderer:true,browserHydrationExercised:false}});
 await check('Malformed or absent claim tokens never enable retry',()=>{for(const query of ['?claimRetry=1','?claimRetry=1&claim=short','?claimRetry=1&claim='+encodeURIComponent('!'.repeat(40)),'?claim='+valid]){const r=rig(src,query);assert.equal(Boolean(r.retry(r.render())),false)}return {cases:4}});
 await check('Server snapshot omits URL retry state; client snapshot admits validated token',()=>{const r=rig(src,'?claimRetry=1&claim='+valid); // Hook contract simulation, no browser hydration.
 const ss=rig(src,'?claimRetry=1&claim='+valid,true);assert.equal(Boolean(ss.retry(ss.render())),false);assert.equal(Boolean(r.retry(r.render())),true);return {actualBrowserHydration:false}});
 await check('Pending claim copy follows locale; explicit mode dismissal persists',()=>{const r=rig(src,'?claimRetry=1&claim='+valid);assert(r.text(r.render()).includes('en:pending-claim'));r.setLocale('es');assert(r.text(r.render()).includes('es:pending-claim'));r.button(r.render(),'New here?').props.onClick();assert(!r.retry(r.render()));r.setLocale('fr');assert(!r.retry(r.render()));return {localeChanges:2}});
 await check('Claim retry disables submission while in flight and restores retry after503',async()=>{const r=rig(src,'?claimRetry=1&claim='+valid);r.retry(r.render()).props.onClick();let t=r.render();assert(!r.retry(t));assert(r.all(t).find(n=>n.type==='button'&&n.props?.type==='submit').props.disabled);assert.equal(r.calls.filter(c=>c.type==='claim').length,1);r.resolveClaim(503);await tick();t=r.render();assert(r.retry(t));assert.equal(r.location.search.includes('claim='),true);return {networkAndAuth:'synthetic'}});
 await check('Definitive400 strips token and removes retry action',async()=>{const r=rig(src,'?claimRetry=1&claim='+valid);r.retry(r.render()).props.onClick();r.resolveClaim(400);await tick();assert(!r.retry(r.render()));assert(!r.location.search.includes('claim='));return {remainingErrorCopy:'Existing generic pending-claim copy retained; no usable retry action'}});
 for(const kind of ['magic','oauth'])await check('Compare old/new pending retry during '+kind,async()=>{
  const result={};for(const [label,source]of[['before',old],['after',src]]){const r=rig(source,'?claimRetry=1&claim='+valid);assert(r.retry(r.render()));const t=r.render();if(kind==='magic')r.button(t,'Email me').props.onClick({currentTarget:{form:{email:'review@example.invalid'}}});else r.button(t,'Continue with Google').props.onClick();await tick();const during=r.render();result[label]={retryVisibleDuring:Boolean(r.retry(during)),retryEnabledDuring:Boolean(r.retry(during)&&!r.retry(during).props.disabled)};if(kind==='magic'){r.resolveOtp(null);await tick();const end=r.render();result[label].noticeAfterSuccess=r.notice(end);result[label].retryAfterSuccess=Boolean(r.retry(end))}}
  assert.deepEqual(result.after,result.before,'Passwordless action must preserve explicit dismissal behavior');return {comparison:result,behaviorChange:false};
 });
 const report={inMemoryPasswordlessDismissalMutation:omittedPasswordlessDismissal,reviewer:'/root/release_path_review',sourceSha256:sha(src),baselineSourceSha256:sha(old),checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,boundary:'Actual TSX and actual URL/claim helpers execute in VM with controlled hooks, JSX and synthetic network/auth ports. No React DOM hydration, browser, Supabase or production execution.'};
 fs.writeFileSync(path.join(__dirname,omittedPasswordlessDismissal?'signin-behavior-passwordless-mutation.json':'signin-behavior-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,changes:checks.filter(c=>c.behaviorChange),failures:checks.filter(c=>!c.passed)}));if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
