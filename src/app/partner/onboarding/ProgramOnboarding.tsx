"use client";
import Link from "next/link";
import { useCallback,useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { ArtifactDocumentView } from "@/components/partners/onboarding/ArtifactDocumentView";
import { CoBrandedPageView } from "@/components/partners/onboarding/CoBrandedPageView";
import { PROGRAM_STEPS,firstProgramStep,type ProgramExperience,type ProgramStep } from "@/lib/partners/onboarding/program-experience";
import type { OnboardingPartnerData,OnboardingSectionKey } from "@/lib/partners/onboarding/types";
import { ONBOARDING_JURISDICTIONS } from "@/lib/partners/onboarding/jurisdictions";
import { PartnerTeamInviteForm } from "../team/PartnerTeamInviteForm";
const control="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30";
const primary="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0F6E56] px-6 py-3 font-bold text-white disabled:opacity-50";
export function ProgramOnboarding({initial,requestedStep,settings=false}:{initial:ProgramExperience;requestedStep?:string;settings?:boolean}){
 const router=useRouter();const {locale}=useLocalization();const es=locale==="es";const t=(en:string,spanish:string)=>es?spanish:en;
 const [view,setView]=useState(initial),[draft,setDraft]=useState(initial.data),[step,setStep]=useState<ProgramStep>(PROGRAM_STEPS.includes(requestedStep as ProgramStep)?requestedStep as ProgramStep:firstProgramStep(initial.data));
 const [saveState,setSaveState]=useState<"saved"|"saving"|"error">("saved"),[error,setError]=useState(""),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false);
 const latest=useRef(initial),draftRef=useRef(initial.data),lock=useRef<Promise<void>|null>(null),request=useRef<{payload:string;id:string}|null>(null),reviewAttempt=useRef<string|null>(null);
 const heading=useRef<HTMLHeadingElement>(null); const content=useRef<HTMLDivElement>(null);
 const dirty=JSON.stringify(draft)!==JSON.stringify(view.data);
 const update=useCallback((section:OnboardingSectionKey,key:string,value:unknown)=>{setConfirmed(false);setDraft(previous=>{const next={...previous,[section]:{...previous[section],[key]:value}};draftRef.current=next;return next;});setSaveState("saving");},[]);
 const call=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
  const payload=JSON.stringify({action,...extra});if(request.current?.payload!==payload)request.current={payload,id:crypto.randomUUID()};
  const response=await fetch("/api/partners/onboarding/program",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,...extra,requestId:request.current.id})});
  const body=await response.json();if(!response.ok||!body.view)throw new Error(typeof body.error==="string"?body.error:"Your information could not be saved. Retry.");
  return body.view as ProgramExperience;
 },[]);
 const adopt=useCallback((next:ProgramExperience,sent:OnboardingPartnerData)=>{
  const pending=draftRef.current;const merged:OnboardingPartnerData=structuredClone(next.data);
  for(const [section,values] of Object.entries(pending))for(const [key,value] of Object.entries(values??{})){
   if(JSON.stringify(value)!==JSON.stringify((sent[section as OnboardingSectionKey] as Record<string,unknown>|undefined)?.[key])){
    const k=section as OnboardingSectionKey;merged[k]??={};Object.assign(merged[k]!,{[key]:value});
   }
  }
  latest.current=next;draftRef.current=merged;setView(next);setDraft(merged);setSaveState(JSON.stringify(merged)===JSON.stringify(next.data)?"saved":"saving");
 },[]);
 const flush=useCallback(async()=>{
  if(lock.current)await lock.current;
  const sent=structuredClone(draftRef.current),base=latest.current.data;
  const patches=Object.entries(sent).flatMap(([section,values])=>{
   const before=(base[section as OnboardingSectionKey]??{}) as Record<string,unknown>;
   const changed=Object.fromEntries(Object.entries(values??{}).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(before[key])));
   return Object.keys(changed).length?[{section,values:changed,base:before}]:[];
  });
  if(!patches.length)return;
  const promise=(async()=>{try{setSaveState("saving");setError("");adopt(await call("save",{patches}),sent);}catch(e){setSaveState("error");setError(e instanceof Error?e.message:"Could not save. Retry.");throw e;}})();
  lock.current=promise;try{await promise;}finally{lock.current=null;}
 },[adopt,call]);
 useEffect(()=>{if(!dirty||busy||saveState==="error")return;const timeout=setTimeout(()=>{void flush().catch(()=>{});},750);return()=>clearTimeout(timeout);},[dirty,draft,busy,flush,saveState]);
 useEffect(()=>{const beforeUnload=(e:BeforeUnloadEvent)=>{if(JSON.stringify(draftRef.current)!==JSON.stringify(latest.current.data)){e.preventDefault();}};window.addEventListener("beforeunload",beforeUnload);return()=>window.removeEventListener("beforeunload",beforeUnload);},[]);
 useEffect(()=>{heading.current?.focus();},[step]);
 useEffect(()=>{const pop=()=>{const next=new URL(location.href).searchParams.get("step");if(PROGRAM_STEPS.includes(next as ProgramStep))setStep(next as ProgramStep);};window.addEventListener("popstate",pop);return()=>window.removeEventListener("popstate",pop);},[]);
 async function go(next:ProgramStep){setBusy(true);setError("");try{
  if(PROGRAM_STEPS.indexOf(next)>PROGRAM_STEPS.indexOf(step)){const invalid=content.current?.querySelector<HTMLInputElement>("input:invalid,select:invalid");if(invalid){invalid.reportValidity();invalid.focus();return;}}
  await flush();
  if(!settings&&!latest.current.decision.setupComplete&&["join","organization","program"].includes(step)){const sent=draftRef.current;adopt(await call("initialize"),sent);}
  if(next==="start"&&!latest.current.decision.setupComplete){const sent=draftRef.current;adopt(await call("review"),sent);}
  setStep(next);window.history.pushState({},"",`${settings?"/partner/settings":"/partner/onboarding"}?step=${next}`);
 }catch(e){setError(e instanceof Error?e.message:t("Please retry.","Inténtelo de nuevo."));}finally{setBusy(false);}}
 useEffect(()=>{
  if(step!=="start"||view.reviewToken||view.decision.setupComplete||!view.decision.configurationComplete||reviewAttempt.current===String(view.version))return;
  reviewAttempt.current=String(view.version);let active=true;
  call("review").then(next=>{if(active)adopt(next,draftRef.current);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Review unavailable.");});
  return()=>{active=false;};
 },[step,view.reviewToken,view.decision.setupComplete,view.decision.configurationComplete,view.version,call,adopt]);
 async function finish(){setBusy(true);setError("");try{await flush();const next=await call("finish",{reviewToken:view.reviewToken,confirmed});adopt(next,draftRef.current);if(!next.decision.setupComplete)throw new Error(t("Your program changed. Review the updated information.","Su programa cambió. Revise la información actualizada."));router.push("/partner/dashboard");router.refresh();}catch(e){setError(e instanceof Error?e.message:t("Please retry.","Inténtelo de nuevo."));}finally{setBusy(false);}}
 const names=es?["Unirse","Organización","Programa","Equipo","Comenzar"]:["Join","Organization","Program","Team","Start"];
 const titles=es?["Bienvenido a RCAP.","Cuéntenos sobre su organización.","¿Cómo funcionará su programa?","¿Alguien más ayuda a dirigir su programa?","Revise su programa."]:["Welcome to RCAP.","Tell us about your organization.","How will your program work?","Anyone else helping run your program?","Review your program."];
 const geo=draft.geography_audience_language_accessibility??{};
 const field=(section:OnboardingSectionKey,key:string,label:string,type="text",required=false)=>{
  const value=(draft[section] as Record<string,unknown>|undefined)?.[key];return <label className="block text-sm font-semibold">{label}{required?" *":""}<input className={control} value={typeof value==="string"?value:""} type={type} required={required} maxLength={type==="url"?2048:500} autoComplete={key==="legal_organization_name"?"organization":key==="website"?"url":key.includes("email")?"email":undefined} disabled={!view.canEdit||key==="legal_organization_name"&&view.legalIdentityLocked} onChange={e=>update(section,key,e.target.value)}/></label>;
 };
 const choice=(section:OnboardingSectionKey,key:string,label:string,options:[string,string][])=> <label className="block text-sm font-semibold">{label}<select className={control} value={String((draft[section] as Record<string,unknown>|undefined)?.[key]??"")} disabled={!view.canEdit} onChange={e=>update(section,key,e.target.value)}><option value="">{t("Choose an option","Elija una opción")}</option>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>;
 return <main className="min-h-screen bg-[#F7F4EE] px-4 py-8 text-[#071B33] sm:px-6"><div className="mx-auto max-w-5xl">
  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold tracking-wide">{view.organizationName}</p><Link href="/partner/dashboard" className="inline-flex min-h-11 items-center underline">{t("Dashboard","Panel")}</Link></div>
  <ol aria-label={t("Program setup","Configuración del programa")} className="my-6 grid grid-cols-5 gap-1 sm:gap-3">{PROGRAM_STEPS.map((item,index)=><li key={item} aria-current={item===step?"step":undefined}><button disabled={busy} onClick={()=>void go(item)} className={`min-h-12 w-full rounded-lg px-1 text-xs font-bold sm:text-sm ${item===step?"bg-[#0F6E56] text-white":"border border-slate-300 bg-white text-slate-700"}`}><span className="block text-xs opacity-75">{index+1}</span>{names[index]}</button></li>)}</ol>
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-9"><h1 ref={heading} tabIndex={-1} className="text-2xl font-extrabold outline-none sm:text-3xl">{titles[PROGRAM_STEPS.indexOf(step)]}</h1>
   <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm text-slate-600">{saveState==="saving"?t("Saving…","Guardando…"):saveState==="error"?t("Could not save. Retry","No se pudo guardar. Reintentar"):t("Saved","Guardado")}</p>
   {error?<div role="alert" className="my-4 rounded-lg border border-orange/30 bg-orange/10 p-4"><p>{error}</p>{saveState==="error"?<button className="mt-2 min-h-11 underline" onClick={()=>void flush().catch(()=>{})}>{t("Retry saving","Volver a guardar")}</button>:null}</div>:null}
   <div ref={content} className="mt-6 space-y-6">
    {step==="join"?<p className="max-w-2xl leading-7">{t("Your administrator account is connected to this organization. We will save your progress as you prepare your program.","Su cuenta de administrador está vinculada a esta organización. Guardaremos su progreso mientras prepara su programa.")}</p>:null}
    {step==="organization"?<div className="grid gap-5 sm:grid-cols-2">
     {field("organization_contacts","legal_organization_name",t("Legal organization name","Nombre legal de la organización"),"text",true)}
     {field("organization_contacts","public_organization_name",t("Public organization name","Nombre público de la organización"),"text",true)}
     {field("organization_contacts","public_program_name",t("Program name","Nombre del programa"),"text",true)}
     {field("organization_contacts","website",t("Website (optional)","Sitio web (opcional)"),"url")}
     <fieldset className="sm:col-span-2 rounded-xl border p-4"><legend className="px-2 font-bold">{t("Primary program contact","Contacto principal del programa")}</legend><div className="grid gap-4 sm:grid-cols-2">{([['name',t('Name','Nombre')],['work_email',t('Work email','Correo laboral')],['title',t('Title (optional)','Cargo (opcional)')]] as const).map(([key,label])=><label key={key} className="text-sm font-semibold">{label}<input className={control} type={key==='work_email'?'email':'text'} autoComplete={key==='work_email'?'email':key==='name'?'name':'organization-title'} value={draft.organization_contacts?.contacts?.[0]?.[key]??''} onChange={e=>{const contacts=[...(draftRef.current.organization_contacts?.contacts??[])];contacts[0]={...(contacts[0]??{stable_row_id:crypto.randomUUID(),role:'program_operator' as const,name:'',title:'',work_email:''}),[key]:e.target.value};update('organization_contacts','contacts',contacts);}}/></label>)}</div></fieldset>
     <div className="sm:col-span-2"><p className="text-sm text-slate-600">{t("A logo is optional. Your program can use the RCAP text identity.","El logotipo es opcional. Su programa puede usar la identidad de texto de RCAP.")}</p></div>
    </div>:null}
    {step==="program"?<>
     <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">{t("Where will you help people?","¿Dónde ayudará a las personas?")}<select className={control} value={geo.jurisdictions?.[0]??""} onChange={e=>update("geography_audience_language_accessibility","jurisdictions",e.target.value?[e.target.value]:[])}><option value="">{t("Choose one active jurisdiction","Elija una jurisdicción activa")}</option>{ONBOARDING_JURISDICTIONS.map(j=><option key={j.code} value={j.code}>{j.name}</option>)}</select></label>
      {field("geography_audience_language_accessibility","service_area_description",t("Service area","Área de servicio"),"text",true)}
      {choice("program_goals","participation_mode",t("How will people participate?","¿Cómo participarán las personas?"),[["online",t("Online","En línea")],["clinics",t("At clinics or events","En clínicas o eventos")],["both",t("Both","Ambas opciones")]])}
      {choice("access_sponsorship_capacity","participant_access_model",t("Who can join?","¿Quién puede participar?"),[["open",t("Anyone with the link","Cualquier persona con el enlace")],["required_code",t("People with an access code","Personas con código de acceso")],["invite_only",t("Invited participants only","Solo participantes invitados")]])}
      {field("support_referrals_reporting","participant_support_email",t("Participant support email","Correo de soporte para participantes"),"email")}
      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={geo.enable_spanish===true} onChange={e=>update("geography_audience_language_accessibility","enable_spanish",e.target.checked)}/>{t("Offer English and Spanish","Ofrecer inglés y español")}</label>
     </div>
     <aside className="rounded-xl bg-slate-50 p-5"><h2 className="font-bold">{t("Who pays for packets?","¿Quién paga los paquetes?")}</h2><p className="mt-2">{view.commercial.label}</p><p className="mt-2 text-sm">{t("Screenings available","Evaluaciones disponibles")}: {view.commercial.screenings??t("Unavailable","No disponible")} · {t("Sponsored packets available","Paquetes patrocinados disponibles")}: {view.commercial.packets??t("Unavailable","No disponible")}</p></aside>
     <p className="text-sm leading-6 text-slate-600">{t("For contested hearings, prosecutor objections, or requests for representation, stop the self-help process and contact program support. LegalEase does not provide representation.","Si hay audiencias disputadas, objeciones del fiscal o solicitudes de representación, detenga el proceso de autoayuda y contacte al soporte del programa. LegalEase no brinda representación.")}</p>
     {geo.enable_spanish?<fieldset className="rounded-xl border p-5"><legend className="px-2 font-bold">{t("Spanish page content","Contenido de la página en español")}</legend><p className="mb-4 text-sm">{t("Provide the Spanish content your organization authorizes. Review it with your page in Start.","Proporcione el contenido en español autorizado por su organización. Revíselo con su página en Comenzar.")}</p><div className="grid gap-4 sm:grid-cols-2">{[["program_headline_es","Título"],["program_subheadline_es","Subtítulo"],["approved_organization_description_es","Descripción de la organización"],["primary_cta_label_es","Texto del botón"],["participant_support_copy_es","Ayuda al participante"],["service_area_es","Área de servicio"],["target_audience_es","Público del programa"]].map(([key,label])=><div key={key}>{field("brand_public_page",key,label,"text",true)}</div>)}</div></fieldset>:null}
    </>:null}
    {step==="team"?<><p className="leading-7">{t("You are already an active administrator. Invite a colleague as Partner Staff, or continue on your own. Clinic permissions are assigned when you create an event.","Usted ya es administrador activo. Invite a un colega como personal del programa o continúe sin ayuda. Los permisos de clínica se asignan al crear un evento.")}</p><details><summary className="min-h-12 cursor-pointer font-bold">{t("Invite team","Invitar al equipo")}</summary><div className="mt-4 max-w-xl"><PartnerTeamInviteForm partnerSlug={view.partnerSlug} partnerName={view.organizationName}/></div></details></>:null}
    {step==="start"?<>
     {view.decision.setupComplete?<div className="rounded-xl bg-[#EFF8F3] p-6"><h2 className="text-xl font-bold">{view.decision.live?t("Your program is live.","Su programa está activo."):t("Your program is set up.","Su programa está configurado.")}</h2>{!view.decision.live?<p className="mt-3">{t("LegalEase is finalizing your program terms. Your information is saved, and you can return to your dashboard.","LegalEase está finalizando las condiciones de su programa. Su información está guardada y puede volver a su panel.")}</p>:null}</div>:<>
      <p className="leading-7">{t("Review the program information and participant page below. Your confirmation covers these current versions.","Revise la información del programa y la página del participante a continuación. Su confirmación cubre estas versiones actuales.")}</p>
      {view.materials.map(material=><div key={material.type}><ArtifactDocumentView document={material.document} versionNumber={material.version}/>{material.document.pagePreview?<div className="mt-4 overflow-hidden rounded-xl border"><CoBrandedPageView preview={material.document.pagePreview} variant="desktop" logoSrc={material.document.pagePreview.logo.assetId?`/api/partners/onboarding/assets/${material.document.pagePreview.logo.assetId}`:null}/></div>:null}</div>)}
      {!view.reviewToken?<button type="button" className={primary} disabled={busy} onClick={()=>void go("start")}>{t("Prepare my review","Preparar mi revisión")}</button>:<label className="flex items-start gap-3 rounded-xl border border-slate-300 p-5 leading-6"><input className="mt-1 h-5 w-5" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>{t("I confirm that the organization, program, support route, and participant page shown above are accurate and authorized for use. I understand that results are not guaranteed, LegalEase does not provide representation, and packet services depend on the program's actual terms.","Confirmo que la organización, el programa, la vía de soporte y la página del participante que se muestran son correctos y están autorizados. Entiendo que los resultados no están garantizados, LegalEase no brinda representación y los servicios de paquetes dependen de las condiciones reales del programa.")}</span></label>}
     </>}
    </>:null}
   </div>
   <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
    {step!=="join"?<button disabled={busy} className="min-h-12 px-3 font-semibold underline" onClick={()=>void go(PROGRAM_STEPS[Math.max(0,PROGRAM_STEPS.indexOf(step)-1)])}>{t("Back","Atrás")}</button>:<span/>}
    {step==="start"?view.decision.setupComplete?<Link className={primary} href="/partner/dashboard">{t("Go to my dashboard","Ir a mi panel")}</Link>:view.reviewToken?<button className={primary} disabled={busy||!confirmed||!view.canEdit} onClick={()=>void finish()}>{busy?t("Saving…","Guardando…"):view.decision.delegated?t("Start my program","Iniciar mi programa"):t("Confirm my program","Confirmar mi programa")}</button>:null:<button className={primary} disabled={busy||!view.canEdit} onClick={()=>void go(PROGRAM_STEPS[PROGRAM_STEPS.indexOf(step)+1])}>{busy?t("Saving…","Guardando…"):step==="team"?t("I'll do this later","Lo haré después"):t("Continue","Continuar")}</button>}
   </footer>
  </section><p className="mt-5 text-sm text-slate-600">{t("Your progress stays with your organization's account.","Su progreso permanece en la cuenta de su organización.")}</p>
 </div></main>;
}
