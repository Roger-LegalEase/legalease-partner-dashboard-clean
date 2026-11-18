// Paste into DevTools only on the private LOCAL forwarded signup page.
// Browser ports are mocked; neither confirmation nor reset email is sent.
(() => {
  const allowedHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    || location.hostname === 'silver-succotash-vp66wg75pqv4h695g-3199.app.github.dev';
  if (!allowedHost) throw Error('LOCAL preview required');
  const originalFetch = window.fetch.bind(window);
  const user = {id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid',aud:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
  window.localSignupCheck = {signup:0,signin:0,claim:0,reset:0,failNext:false};
  const respond = (body,status=200) => Promise.resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
  window.fetch = (input,init) => {
    const url = new URL(input instanceof Request ? input.url : String(input),location.href);
    const state = window.localSignupCheck;
    if(url.origin==='http://127.0.0.1:4599') {
      if(url.pathname==='/auth/v1/signup') {
        state.signup++;
        if(state.failNext){state.failNext=false;return respond({code:'synthetic_failure',msg:'Synthetic refusal'},400);}
        return respond({user:{...user,identities:[]},session:null});
      }
      if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password') {
        state.signin++;
        if(state.failNext){state.failNext=false;return respond({code:'invalid_credentials',msg:'Synthetic refusal'},400);}
        const enc=v=>btoa(JSON.stringify(v)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
        const exp=Math.floor(Date.now()/1000)+3600;
        return respond({access_token:`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:user.id,exp,aud:'authenticated',role:'authenticated'})}.synthetic`,refresh_token:'synthetic-only',token_type:'bearer',expires_in:3600,expires_at:exp,user});
      }
      if(url.pathname==='/auth/v1/recover'){state.reset++;return respond({});}
      if(url.pathname==='/auth/v1/user')return respond(user);
      return Promise.reject(Error('Unexpected LOCAL auth request'));
    }
    if(url.origin!==location.origin)return Promise.reject(Error('External requests blocked by LOCAL fixture'));
    if(url.pathname==='/api/expungement-ai/screening/pending/claim') {
      state.claim++;
      // Do not contact the server. This confirms invocation of the real browser
      // handoff and its exact-matter validation, not database ownership.
      return respond({redirectTo:'/briefcase/matters/11111111-1111-4111-8111-111111111111'});
    }
    return originalFetch(input,init);
  };
})();
