// Local component behavior tests. Uses the repository's TS/CommonJS test pattern;
// only React hooks and external auth/browser ports are controlled. No network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const formFile = 'src/components/expungement-ai/ConsumerSignInForm.tsx';
function load(file, mocks = {}) {
  const resolved = path.resolve(file);
  const beforeFile = file === formFile ? process.env.SIGNUP_BEFORE_FILE : file === 'src/lib/expungement-ai/localization.ts' ? process.env.SIGNUP_BEFORE_LOCALIZATION : null;
  const source = beforeFile
    ? fs.readFileSync(beforeFile, 'utf8')
    : fs.readFileSync(resolved, 'utf8');
  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name]
    : name.startsWith('@/') ? load(`src/${name.slice(2)}.ts`, mocks) : require(name);
  mod._compile(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true}}).outputText, resolved);
  return mod.exports;
}
const {t, resolveRuntimeText} = load('src/lib/expungement-ai/localization.ts');
const email = 'synthetic@example.invalid';
const claim = 'synthetic_claim_capability_00000000000000';
const matter = '/briefcase/matters/11111111-1111-4111-8111-111111111111';
function setup(locale='en', search=`?mode=create&next=${encodeURIComponent(matter)}&claim=${claim}&locale=${locale}`) {
  const values=[]; let cursor=0, tree;
  const calls={signup:[], signin:[], claim:[], navigation:[], reset:0};
  let outcome={error:null,data:{user:{identities:[]},session:null}}, session=null;
  let gate=null;
  globalThis.window={location:{search,hostname:'localhost',origin:'http://localhost',assign:p=>calls.navigation.push(p)},
    history:{state:null,replaceState:(_s,_t,p)=>{window.location.search=new URL(p,'http://localhost').search;}}};
  Object.defineProperty(window.location,'href',{get:()=>`http://localhost/expungement-ai/sign-in${window.location.search}`});
  globalThis.document={title:'Local synthetic test'};
  const hooks={...React,useState(initial){const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;
    return [values[i],v=>{values[i]=typeof v==='function'?v(values[i]):v;}];},
    useRef(initial){const i=cursor++;return values[i]??(values[i]={current:initial});},
    useSyncExternalStore(_subscribe,snapshot){return snapshot();}};
  const auth={async signUp(input){calls.signup.push(input);if(gate)await gate;if(outcome instanceof Error)throw outcome;return outcome;},
    async signInWithPassword(input){calls.signin.push(input);if(gate)await gate;if(outcome instanceof Error)throw outcome;return outcome;},
    async getSession(){return {data:{session}};},
    async resetPasswordForEmail(){calls.reset++;throw Error('Unexpected automatic reset');}};
  globalThis.fetch=async (_url,options)=>{calls.claim.push(JSON.parse(options.body));return {ok:true,status:200,json:async()=>({redirectTo:matter})};};
  const {ConsumerSignInForm}=load(formFile,{
    react:hooks,'next/link':{__esModule:true,default:p=>React.createElement('a',p,p.children)},
    '@/components/auth/TurnstileWidget':{TurnstileWidget:()=>null},
    '@/lib/auth/captcha':{isAuthCaptchaRequired:()=>false,captchaOptions:()=>undefined,authCaptchaFailureMessage:'Security check required'},
    '@/lib/supabase/browser':{createBrowserSupabaseClient:()=>({auth})},
    '@/components/expungement-ai/LocalizationProvider':{useLocalization:()=>({t:(k,f)=>t(locale,k,f),text:v=>resolveRuntimeText(locale,v)})}
  });
  function render(){cursor=0;tree=ConsumerSignInForm();return tree;}
  function nodes(node=tree,visible=true){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(n=>nodes(n,visible));
    if(visible&&node.props?.hidden)return [];return [node,...nodes(node.props?.children ?? null,visible)];}
  function label(node){return renderToStaticMarkup(React.createElement(React.Fragment,null,React.Children.toArray(node.props.children))).replace(/<[^>]*>/g,'');}
  function button(name){const b=nodes().find(n=>n.type==='button'&&label(n)===name);assert.ok(b,`Visible button: ${name}`);return b;}
  function edit(value){const input=nodes(tree,false).find(n=>n.type==='input'&&n.props.name==='email');input.props.onChange?.({target:{value},currentTarget:{value}});render();}
  async function submit(){const form=nodes().find(n=>n.type==='form');assert.ok(form,'visible form');const original=globalThis.FormData;
    globalThis.FormData=class{get(k){return k==='email'?valuesEmail(): 'synthetic-noncredential';}};
    try {return await form.props.onSubmit({preventDefault(){},currentTarget:{}});} finally {globalThis.FormData=original;render();}}
  function valuesEmail(){return nodes(tree,false).find(n=>n.type==='input'&&n.props.name==='email')?.props.value??email;}
  render();edit(email);
  function visibleTree(node){if(!node||typeof node!=='object')return node;if(Array.isArray(node))return React.Children.toArray(node).map(visibleTree);if(node.props?.hidden)return null;return React.cloneElement(node,{children:visibleTree(node.props?.children)});}
  return {calls,render,nodes,button,edit,submit,getEmail:valuesEmail,html:()=>renderToStaticMarkup(visibleTree(tree)),
    setOutcome:v=>{outcome=v;},authenticate:()=>{session={user:{id:'synthetic'}};},hold:()=>{let release;gate=new Promise(r=>release=r);return ()=>{release();gate=null;};}};
}
for(const locale of ['en','es']) for(const account of ['confirmed-repeat','new-unconfirmed']) {
  test(`${locale}: ${account} has neutral guidance and explicit recovery`,async()=>{
    const s=setup(locale);
    s.setOutcome({error:null,data:account==='confirmed-repeat'
      ? {user:{id:'obfuscated',identities:[]},session:null}
      : {user:{id:'synthetic-new',identities:[{provider:'email'}]},session:null}});
    await s.submit();
    const html=s.html();
    assert.equal(html.includes(locale==='en'?'Check your email to finish creating your account.':'Revise su correo electrónico para terminar de crear su cuenta.'),false,'No-session signup must not tell the customer to wait for an email it may not generate');
    assert.match(html,locale==='en'?/If this email needs verification.*inbox and spam folder.*Already have an account/s:/Si este correo.*verificaci.n.*spam.*cuenta/s);
    assert.doesNotMatch(html,/Check your email to finish creating|Account created|Email sent|Delivered|already registered/i);
    s.button(locale==='en'?'Sign in':'Iniciar sesión');
    s.button(locale==='en'?'Edit email':'Editar correo electrónico');
    const reset=s.nodes().find(n=>n.props?.href?.startsWith('/auth/forgot-password?'));
    assert.ok(reset,'visible reset navigation');
    assert.equal(renderToStaticMarkup(reset).replace(/<[^>]*>/g,''),locale==='en'?'Reset password':'Restablecer contraseña');
    const q=new URL(reset.props.href,'http://localhost').searchParams;
    assert.equal(q.get('product'),'expungement');assert.equal(q.get('next'),matter);assert.equal(q.get('claim'),claim);assert.equal(q.get('locale'),locale);
    assert.equal(q.has('email'),false);assert.equal(q.has('password'),false);
    assert.equal(s.calls.signup.length,1);assert.equal(s.calls.signin.length,0);assert.equal(s.calls.claim.length,0);assert.equal(s.calls.reset,0);
    assert.ok(!s.nodes().some(n=>n.type==='button'&&n.props.type==='submit'),'signup is not primary recovery');
  });
}
test('returning customer retains email and claims exact matter once',async()=>{
  const s=setup();await s.submit();s.button('Sign in').props.onClick();s.render();assert.equal(s.getEmail(),email);
  assert.doesNotMatch(s.html(),/If this email needs verification|Check your email to finish creating your account/);s.authenticate();await s.submit();await s.submit();
  assert.equal(s.calls.signin.length,1);assert.deepEqual(s.calls.claim,[{claimToken:claim}]);assert.deepEqual(s.calls.navigation,[matter]);
});
test('edit email clears guidance and permits a corrected signup',async()=>{
  const s=setup();await s.submit();s.button('Edit email').props.onClick();s.render();s.edit('corrected@example.invalid');
  assert.doesNotMatch(s.html(),/If this email needs verification|Check your email to finish creating your account/);await s.submit();assert.equal(s.calls.signup[1].email,'corrected@example.invalid');
});
test('errors and thrown failures clear loading and permit retry in both modes',async()=>{
  for(const mode of ['create','signin']){
    const s=setup('en',`?mode=${mode}`);s.setOutcome({error:{message:'synthetic failure'}});await s.submit();
    assert.doesNotMatch(s.html(),/If this email needs verification|Check your email to finish creating your account/);assert.match(s.html(),/We could not/);
    assert.ok(!s.nodes().find(n=>n.type==='fieldset').props.disabled);
    s.setOutcome(new Error('Synthetic transport failure'));await s.submit();assert.doesNotMatch(s.html(),/If this email needs verification|Check your email to finish creating your account/);
    assert.ok(!s.nodes().find(n=>n.type==='fieldset').props.disabled);
    s.setOutcome({error:null});await s.submit();assert.equal(s.calls[mode==='create'?'signup':'signin'].length,3);
  }
});
test('submission lock prevents double requests; stale email response is ignored',async()=>{
  const s=setup();const release=s.hold();const first=s.submit();await s.submit();assert.equal(s.calls.signup.length,1);
  s.edit('different@example.invalid');release();await first;assert.doesNotMatch(s.html(),/If this email needs verification|Check your email to finish creating your account/);
  assert.equal(s.calls.claim.length,0);assert.ok(!s.nodes().find(n=>n.type==='fieldset').props.disabled);
});
test('mode/location change cannot receive stale signup guidance',async()=>{
  const s=setup();const release=s.hold();const first=s.submit();window.location.search='?mode=signin';s.render();release();await first;
  assert.doesNotMatch(s.html(),/If this email needs verification|Check your email to finish creating your account/);
});
test('authenticated signup preserves claim and exact matter continuation',async()=>{
  const s=setup();s.authenticate();await s.submit();assert.deepEqual(s.calls.claim,[{claimToken:claim}]);assert.deepEqual(s.calls.navigation,[matter]);
});
test('unsafe reset destination is sanitized by existing helper',async()=>{
  const s=setup('en','?mode=signin&next=https://evil.invalid');const reset=s.nodes().find(n=>n.props?.href?.startsWith('/auth/forgot-password?'));
  assert.equal(new URL(reset.props.href,'http://localhost').searchParams.get('next'),'/briefcase');
});

test('post-response location mode change clears visible guidance and restores form',async()=>{
  const s=setup();await s.submit();assert.match(s.html(),/If this email needs verification/);
  window.location.search='?mode=signin';s.render();
  assert.doesNotMatch(s.html(),/If this email needs verification/);
  assert.ok(s.nodes().some(n=>n.type==='form'),'sign-in form restored after mode changes');
  assert.equal(s.getEmail(),email);
});
