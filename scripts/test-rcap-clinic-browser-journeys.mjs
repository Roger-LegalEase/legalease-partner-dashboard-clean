import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const origin='https://127.0.0.1:3140';
const out='/workspaces/training-modules-09-10/output/rcap-journey-20261009';
const {slug}=JSON.parse(fs.readFileSync('/tmp/rcap-journey-program.json'));
assert.match(slug,/^practice-/);
const results=[];
const fixtureIdentity=JSON.parse(fs.readFileSync(process.env.RCAP_CLINIC_BROWSER_IDENTITY_FILE??'/tmp/rcap-clinic-browser-identity.json'));
assert.match(fixtureIdentity.participant.email,/@[^@]+\.test$/);
assert.match(fixtureIdentity.partnerAdminEmail,/@[^@]+\.test$/);
const staffCase=Boolean(process.env.STAFF_CASE);
const staffIdentity=staffCase?JSON.parse(fs.readFileSync('/tmp/rcap-journey-staff.json')):null;
for(const [engine,type] of Object.entries({chromium,webkit}).filter(([name])=>!['chromium','webkit'].includes(process.env.BROWSER)||process.env.BROWSER===name))for(const mobile of (process.env.ONE_CASE?[false]:[false,true]))for(const locale of (process.env.ONE_CASE?['en']:['en','es'])){
 const label=`${engine}-${mobile?'mobile':'desktop'}-${locale}${staffCase?'-scoped-staff':''}`;
 const b=await type.launch();const options={ignoreHTTPSErrors:true,viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,locale:locale==='es'?'es-US':'en-US'};
 const owner=await b.newContext({...options,storageState:'/tmp/rcap-journey-admin-session.json'});
 const partner=await b.newContext({...options,storageState:'/tmp/rcap-journey-partner-session.json'});
 const participant=await b.newContext(options);
 const staff=staffCase?await b.newContext(options):null; const s=staff?await staff.newPage():null;
 const o=await owner.newPage(),p=await partner.newPage(),u=await participant.newPage();
 const q=s??p;
 for(const page of [o,p,u,...(s?[s]:[])])page.setDefaultTimeout(20000);
 const failures=[];for(const page of [o,p,u,...(s?[s]:[])])page.on('pageerror',e=>failures.push(e.message));
 const t=(en,es)=>locale==='es'?es:en;let caseReference;
 try{
  await p.goto(origin+'/partner/onboarding');await p.waitForLoadState('networkidle');
  if(locale==='es')await p.getByRole('button',{name:'Español',exact:true}).click();
  await p.getByRole('navigation',{name:t('Program navigation','Navegación del programa')}).getByRole('link',{name:t('Program setup','Configurar programa'),exact:true}).click();
  await p.screenshot({path:out+'/'+label+'-partner-setup.png',fullPage:true});
  await p.getByRole('link',{name:t('Clinics','Clínicas'),exact:true}).click();
  const eventName='Practice Clinic '+label+' '+Date.now().toString(36);
  const start=new Date(Date.now()-60000).toISOString().slice(0,16),end=new Date(Date.now()+3*60*60*1000).toISOString().slice(0,16);
  for(const [name,value] of Object.entries({name:eventName,startsAt:start,endsAt:end,locationName:'Fictional Community Center',capacity:'6'}))await p.locator(`[name="${name}"]`).fill(value);
  assert((await p.locator('[name=geography]').inputValue()).length>0,'Program geography reused');await p.locator('[name=timezone]').selectOption('UTC');await p.locator('[name=jurisdiction]').selectOption('MS');
  await p.getByRole('button',{name:t('Create clinic event','Crear evento de clínica'),exact:true}).click();await p.getByRole('heading',{name:eventName,exact:true}).waitFor();
  await p.getByLabel(t('Staff email','Correo del personal'),{exact:true}).selectOption({label:staffIdentity?.email??fixtureIdentity.partnerAdminEmail});
  for(const permission of (staffCase?['follow_up']:['follow_up','reporting','incident']))await p.locator(`input[value="${permission}"]`).check();
  await p.getByRole('button',{name:t('Save staff authorization','Guardar autorización del personal'),exact:true}).click();await p.getByText(t('Approved event staff updated.','Se actualizó el personal autorizado.'),{exact:true}).waitFor();
  await p.getByRole('button',{name:t('Open clinic','Abrir clínica'),exact:true}).click();await p.waitForFunction(()=>document.querySelector('button')!==null);await p.getByRole('button',{name:t('Pause event','Pausar evento'),exact:true}).waitFor();
  await p.getByRole('button',{name:t('Generate event access code','Generar código de acceso'),exact:true}).click();const notice=p.locator('[aria-live="polite"]').filter({hasText:t('Event access code (shown once):','Código de acceso (se muestra una vez):')});await notice.waitFor();const code=(await notice.innerText()).split(': ').at(-1).trim();
  const entry=await p.locator(`a[href^="${origin}/clinic/"]`).getAttribute('href');const eventSlug=new URL(entry).pathname.split('/').at(-1);assert.equal(new URL(entry).origin,origin);assert(await p.locator('img[alt^="QR code"]').isVisible());
  await p.screenshot({path:out+'/'+label+'-event-ready.png',fullPage:true,mask:[notice]});
  if(staffCase){await p.reload();await p.getByRole('heading',{name:eventName,exact:true}).waitFor();assert.equal(await p.locator(`a[href^="${origin}/clinic/"]`).getAttribute('href'),entry,'Saved event entry survives refresh');}
  await participant.addInitScript(locale=>localStorage.setItem('exp_lang',locale),locale);
  await u.goto(entry);await u.getByLabel(t('Event access code','Código de acceso al evento'),{exact:true}).fill(code);await u.getByRole('button',{name:t('Continue to participant consent','Continuar al consentimiento del participante'),exact:true}).click();await u.waitForURL(/sign-in/);
  const switchMode=u.getByRole('link',{name:/Already have an account|¿Ya tiene una cuenta/});
  if(await switchMode.count())await switchMode.click();else await u.getByText(t('Already have an account? Sign in','¿Ya tiene una cuenta? Inicie sesión'),{exact:true}).click();
  await u.locator('input[name=email]').fill(fixtureIdentity.participant.email);await u.locator('input[name=password]').fill(fixtureIdentity.participant.password);await u.getByRole('button',{name:t('Sign in','Iniciar sesión'),exact:true}).click();await u.waitForURL('**/assist');
  await u.locator('select[name=eventStaffId]').selectOption({index:1});await u.locator('input[name=consent]').check();await u.getByRole('button',{name:t('Start assisted nationwide screening','Iniciar la evaluación con asistencia en todo el país'),exact:true}).click();await u.waitForURL('**/screening/ms');await u.getByRole('button',{name:t('End clinic session / Reset device','Finalizar sesión de la clínica / Restablecer dispositivo'),exact:true}).waitFor();await u.screenshot({path:out+'/'+label+'-assisted-session.png',fullPage:true});
  const detail=p.url();
  if(s){
   await s.goto(origin+'/sign-in?mode=signin&next=/partner/clinic');await s.locator('input[name=email]').fill(staffIdentity.email);await s.locator('input[name=password]').fill(staffIdentity.password);await s.getByRole('button',{name:'Sign in',exact:true}).click();await s.waitForURL('**/partner/clinic');
   await s.getByRole('navigation',{name:'Program navigation'}).getByRole('link',{name:'Clinics',exact:true}).click();
   assert.equal(await s.getByRole('button',{name:'Create clinic event',exact:true}).count(),0);
   await s.getByRole('article').filter({has:s.getByRole('heading',{name:eventName,exact:true})}).getByRole('link',{name:'Staff case queue',exact:true}).click();
  }else await p.getByRole('link',{name:t('Staff case queue','Lista de casos del personal'),exact:true}).click();await q.getByRole('combobox',{name:locale==='es'?/^Estado del paquete — Caso /:/^Packet status — Case /}).selectOption('needs_information');caseReference=(await q.getByRole('combobox',{name:locale==='es'?/^Estado del paquete — Caso /:/^Packet status — Case /}).getAttribute('aria-label')).match(/C-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}/)[0];await q.getByText(t('Queue status updated.','Se actualizó el estado del caso.'),{exact:true}).waitFor();await q.screenshot({path:out+'/'+label+'-staff-queue.png',fullPage:true});
  await q.getByRole('link',{name:s?'Back to clinics':t('Back to event controls','Volver a los controles del evento'),exact:true}).click();
  if(s)await s.getByRole('article').filter({has:s.getByRole('heading',{name:eventName,exact:true})}).getByRole('link',{name:'Follow-up',exact:true}).click();else await p.getByRole('link',{name:t('Follow-up','Seguimiento'),exact:true}).click();await q.getByLabel(t('Clinic case','Caso de la clínica'),{exact:true}).selectOption({index:1});await q.getByLabel(t('Owner','Responsable'),{exact:true}).selectOption({label:staffIdentity?.email??fixtureIdentity.partnerAdminEmail});await q.locator('[name=participantSafeMessage]').fill(t('Fictional practice follow-up.','Seguimiento ficticio de práctica.'));await q.getByRole('button',{name:t('Save follow-up','Guardar seguimiento'),exact:true}).click();await q.getByText(t('Follow-up saved in this event.','Se guardó el seguimiento de este evento.'),{exact:true}).waitFor();if(!staffCase){await q.getByRole('button',{name:t('Mark completed','Marcar como completado'),exact:true}).click();await q.getByRole('button',{name:t('Mark completed','Marcar como completado'),exact:true}).waitFor({state:'detached'});}await q.screenshot({path:out+'/'+label+'-follow-up.png',fullPage:true});
  await u.getByRole('button',{name:t('End clinic session / Reset device','Finalizar sesión de la clínica / Restablecer dispositivo'),exact:true}).click();await u.waitForURL(url=>url.pathname==='/clinic/'+eventSlug||url.pathname==='/clinic',{timeout:30000});assert.equal((await participant.cookies()).some(cookie=>cookie.name==='clinic_session'),false);await u.screenshot({path:out+'/'+label+'-reset-complete.png',fullPage:true});
  if(s){await s.goto(detail.replace('/partner/clinic/','/clinic/staff/')+'/queue');await s.getByRole('heading',{name:eventName+' case queue',exact:true}).waitFor();assert.equal(await s.getByRole('combobox').count(),0,'Reset ends staff case access');}else await p.getByRole('link',{name:t('Back to event controls','Volver a los controles del evento'),exact:true}).click();await p.getByRole('main').getByRole('link',{name:t('Reporting','Informes'),exact:true}).click();await p.getByRole('heading',{name:t('Aggregate event reporting','Informe agregado del evento'),exact:true}).waitFor();await p.screenshot({path:out+'/'+label+'-report.png',fullPage:true});
  await p.getByRole('link',{name:t('Back to event controls','Volver a los controles del evento'),exact:true}).click();await p.getByRole('button',{name:t('Close event','Cerrar evento'),exact:true}).click();await p.getByRole('button',{name:t('Archive event','Archivar evento'),exact:true}).waitFor();await p.screenshot({path:out+'/'+label+'-closed.png',fullPage:true});
  await u.goto(entry);await u.getByRole('heading',{name:t('This clinic is not open','Esta clínica no está abierta'),exact:true}).waitFor();assert.equal(await u.locator('[name=eventCode]').count(),0);
  await o.goto(detail.replace('/partner/clinic/','/internal/clinic/'));await o.getByRole('link',{name:'Staff case queue',exact:true}).click();await o.getByRole('link',{name:'Back to event controls',exact:true}).click();await o.waitForURL(url=>url.pathname.startsWith('/internal/clinic/'));assert(new URL(o.url()).pathname.startsWith('/internal/clinic/'));
  if(s){
   await s.goto(origin+'/partner/clinic');await s.getByRole('article').filter({has:s.getByRole('heading',{name:eventName,exact:true})}).getByRole('link',{name:'Follow-up',exact:true}).click();await s.getByRole('button',{name:'Mark completed',exact:true}).waitFor();assert((await s.locator('main').innerText()).includes(caseReference),'Authorized follow-up retains its case reference after reset and closure');await s.getByText('No participant cases are available to you. You can still complete existing follow-up here.',{exact:true}).waitFor();assert.equal(await s.getByRole('button',{name:'Save follow-up',exact:true}).count(),0,'No unusable scheduling form after case access ends');await s.getByRole('button',{name:'Mark completed',exact:true}).click();await s.getByRole('button',{name:'Mark completed',exact:true}).waitFor({state:'detached'});await s.screenshot({path:out+'/'+label+'-post-close-follow-up.png',fullPage:true});
   await s.goto(detail);await s.getByRole('heading',{name:'Clinic event unavailable',exact:true}).waitFor();assert(!(await s.locator('main').innerText()).includes(eventName));
   await s.goto(detail+'/reporting');await s.getByRole('heading',{name:'Reporting unavailable',exact:true}).waitFor();assert(!(await s.locator('main').innerText()).includes(eventName));await s.screenshot({path:out+'/'+label+'-report-denied.png',fullPage:true});
   const other=await b.newContext({...options,storageState:'/tmp/rcap-webkit-partner-session.json'});const x=await other.newPage();
   for(const [url,heading] of [[detail,'Clinic event unavailable'],[detail+'/follow-up','Follow-up unavailable'],[detail+'/reporting','Reporting unavailable'],[detail.replace('/partner/clinic/','/clinic/staff/')+'/queue','Clinic queue unavailable']]){await x.goto(url);await x.getByRole('heading',{name:heading,exact:true}).waitFor();assert(!(await x.locator('main').innerText()).includes(eventName));}
   await x.screenshot({path:out+'/'+label+'-other-tenant-denied.png',fullPage:true});await other.close();
   const anonymous=await b.newContext(options);const a=await anonymous.newPage();await a.goto(detail);await a.waitForURL(/sign-in/);await anonymous.close();
  }
  assert.deepEqual(failures,[],'No browser runtime or hydration errors');results.push({label,passed:true,journeys:['partner-program-to-clinic','clinic-create-staff-entry-assistance-queue-followup-reset-report-close','owner-queue-return',...(staffCase?['named-staff-assignment','event-refresh-preserves-entry','scoped-staff-queue-and-follow-up','device-reset-removes-staff-case-access','authorized-follow-up-reference-and-completion-after-close','ungranted-report-and-administration-denied','other-tenant-event-queue-follow-up-report-denied','anonymous-administration-requires-sign-in']:[])]});console.log('PASS',label);
 }catch(error){console.log('FAIL',label,error.message);results.push({label,passed:false,error:error.message});for(const [role,page] of [['owner',o],['partner',p],['participant',u]]){console.log(role,page.url(),(await page.locator('body').innerText()).slice(-1300));await page.screenshot({path:out+'/'+label+'-'+role+'-failure.png',fullPage:true}).catch(()=>{});}}
 finally{await b.close();fs.writeFileSync(out+(staffCase?'/scoped-staff-browser-journeys.json':'/complete-browser-journeys.json'),JSON.stringify(results,null,2));}
}
assert(results.length>0,'At least one browser journey must execute');
if(results.some(result=>!result.passed))process.exitCode=1;
