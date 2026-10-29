/** Exact WV407 draft preparation; commercial authority and private delivery remain separate. */
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { evaluateWestVirginia407, WEST_VIRGINIA_407_ROUTE } from "@/lib/rcap-engine/west-virginia-407-facts";
export const WEST_VIRGINIA_407_PACKET_ROUTE=WEST_VIRGINIA_407_ROUTE;
export type WestVirginia407Matter={
  matterId:string;verifiedAt:string;
  participant:{fullLegalName:string;dateOfBirth:string;mailingAddress:string};
  courtName:string;county:string;caseNumber:string;chargeDescription:string;chargeStatute:string;
  facts:Readonly<Record<string,unknown>>;
  prosecutorAddress?:string;probationOfficeAddress?:string;
};
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
function answer(f:Readonly<Record<string,unknown>>,id:string):unknown{const v=f[id];if(v&&typeof v==='object'&&!Array.isArray(v)){const w=v as{unknown?:boolean;value?:unknown};return w.unknown===true?undefined:w.value;}return v;}
function field(v:unknown,id:string):asserts v is string{if(typeof v!=='string'||!v.trim()||/\{\{|\}\}|Morgan Sample|Acceptance Consumer|placeholder/i.test(v))throw new Error(`WV407: missing/unresolved ${id}`);}
function date(v:unknown):v is string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
function paragraph(p:PDFPage,font:PDFFont,text:string,y:number){let line='';for(const word of text.split(/\s+/)){if(font.widthOfTextAtSize(word,10)>516)throw new Error('WV407: unbroken token exceeds page width; clipping refused');const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,10)>516&&line){p.drawText(line,{x:48,y,size:10,font});y-=14;line=word;}else line=next;if(y<85)throw new Error('WV407: text would clip; shorten the supplied field or use reviewed continuation');}if(line){p.drawText(line,{x:48,y,size:10,font});y-=14;}return y-10;}
/** Exact existing WV.memo five-component design. No proposed order or external record is fabricated. */
export async function renderWestVirginia407Packet(matter:WestVirginia407Matter,locale:'en'|'es'='en'){
  const m=structuredClone(matter),f=m.facts,asOf=m.verifiedAt.slice(0,10);
  for(const[id,v]of Object.entries({matterId:m.matterId,name:m.participant.fullLegalName,address:m.participant.mailingAddress,court:m.courtName,county:m.county,case:m.caseNumber,charge:m.chargeDescription,statute:m.chargeStatute}))field(v,id);
  const text=(id:string)=>{const v=answer(f,id);field(v,id);return v.trim();};
  const arrest=text('wv_407_arrest_date'),order=text('wv_407_probation_order_date'),expiration=text('wv_407_probation_expiration_date'),dismissal=text('wv_407_dismissal_date');
  const term=text('wv_407_probation_term'),arresting=text('wv_407_arresting_agency'),prosecutor=text('wv_407_prosecutor_office'),probation=text('wv_407_probation_office'),costs=text('wv_407_court_costs_status');
  if(![asOf,m.participant.dateOfBirth,arrest,order,expiration,dismissal].every(date)||m.participant.dateOfBirth>=arrest||arrest>order||order>expiration||expiration>dismissal||dismissal>asOf)throw new Error('WV407: birth/arrest/probation/discharge/verification chronology is contradictory');
  const statute=m.chargeStatute.replace(/W\.?\s*Va\.?\s*Code|§|\s/g,'');
  if(statute!=='60A-4-401(c)'||!/possession/i.test(m.chargeDescription)||/intent|distribut|deliver|sale/i.test(m.chargeDescription))throw new Error('WV407: charge contradicts the supported section 401(c) possession product');
  if(!['paid','unpaid','not_assessed','unknown'].includes(costs))throw new Error('WV407: court cost status is not a known supported answer');
  for(const[id,v]of Object.entries({prosecutorAddress:m.prosecutorAddress,probationOfficeAddress:m.probationOfficeAddress}))if(v!==undefined)field(v,id);
  const eligibility=evaluateWestVirginia407(WEST_VIRGINIA_407_PACKET_ROUTE,f,asOf);if(eligibility?.status!=='qualifying')throw new Error(`WV407: eligibility ${eligibility?.status}`);
  const due=eligibility.eligibleOn!;
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),clock=new Date(asOf+'T00:00:00Z');pdf.setCreationDate(clock);pdf.setModificationDate(clock);pdf.setTitle('West Virginia407 prepared application');
  const manifest:Array<{documentId:string;pages:number[];courtFacing:boolean;manualCompletion:string[]}>=[];
  const page=(title:string,courtFacing:boolean,id:string,manualCompletion:string[]=[])=>{const p=pdf.addPage([612,792]);let y=742;y=paragraph(p,bold,courtFacing?`${m.courtName}; ${m.county} County, West Virginia`:locale==='es'?'Material exclusivo del participante - NO PRESENTAR':'Participant-only material - DO NOT FILE',y);y=paragraph(p,font,`State of West Virginia v. ${m.participant.fullLegalName}; Case No. ${m.caseNumber}`,y);y=paragraph(p,bold,title,y);manifest.push({documentId:id,pages:[pdf.getPageCount()],courtFacing,manualCompletion});return{p,y};};
  const app=page('APPLICATION TO EXPUNGE RECORDS - W. Va. Code 60A-4-407(b)',true,'407_application',['Actual applicant signature/date','Receiving-court caption and filing mechanics']);
  for(const t of[
    `Applicant ${m.participant.fullLegalName}, born ${m.participant.dateOfBirth}, applies to the court that entered the conditional discharge and imposed probation in case ${m.caseNumber}. Applicant mailing address: ${m.participant.mailingAddress}.`,
    `The arrest occurred on ${arrest}, by ${arresting}. The charge was ${m.chargeDescription}, under ${m.chargeStatute}. On ${order}, this court deferred further proceedings and imposed probation under section 60A-4-407. The probation term in the actual order was: ${term}.`,
    `That probation term expired on ${expiration}. The court entered the final order of discharge and dismissal on ${dismissal}. The six-month period from probation expiration reaches ${due}; it is not measured from arrest or dismissal.`,
    'Applicant states that this was the qualifying first possession matter under section 401(c), that before this case there was no prior drug conviction of the kinds specified in section 407(a), and that there was no earlier discharge and dismissal under this once-only provision.',
    'Applicant requests the court to determine after a hearing whether there was a serious or repeated violation of the probation conditions during probation or before this application, as required by section 407(b). Applicant asks the court to decide the statutory conditions and order expungement of the covered arrest, trial and conviction recordations.',
    'The supporting affidavit accompanies this application and awaits actual execution. The original court orders, certified copies and probation-office records are not generated or represented as attached. No judicial determination or records removal is represented as completed.'
  ])app.y=paragraph(app.p,font,t,app.y);
  if(app.y<135)throw new Error('WV407: applicant signature space is insufficient');paragraph(app.p,font,'Date: __________________  Applicant signature: ______________________________',app.y-15);
  const affidavit=page('SUPPORTING AFFIDAVIT - UNSWORN UNTIL ACTUAL EXECUTION',true,'407_supporting_affidavit',['Applicant oath/signature before notary or authorized official','Actual jurat venue/date, official signature, seal and commission details']);
  for(const t of[
    `I, ${m.participant.fullLegalName}, state on oath that I am the applicant in case ${m.caseNumber}. I was arrested on ${arrest} and charged with ${m.chargeDescription} under ${m.chargeStatute}.`,
    `The court's order deferring proceedings and imposing probation was entered on ${order}. It imposed this actual term: ${term}. The probation term expired on ${expiration}; the final discharge and dismissal was entered on ${dismissal}. At least six months from probation expiration will have run on ${due}.`,
    'I ask the court to consider the actual orders, probation expiration information and the six-month calculation. The court determines the statutory probation-violation question at the required hearing; this affidavit does not make a finding or an assertion about my probation-violation history.',
    'The dates above come from the actual matter information I provided. No certified court order or government-issued confirmation has been created by this affidavit.'
  ])affidavit.y=paragraph(affidavit.p,font,t,affidavit.y);
  paragraph(affidavit.p,font,'Applicant signature: __________________________________________________',affidavit.y-10);
  paragraph(affidavit.p,font,'State of __________________; County of __________________',affidavit.y-60);
  paragraph(affidavit.p,font,'Subscribed and sworn before me on __________________ by the applicant above.',affidavit.y-92);
  paragraph(affidavit.p,font,'Notary/authorized official: __________________  Commission expires: __________',affidavit.y-124);
  paragraph(affidavit.p,font,'Seal: __________________',affidavit.y-165);
  const service=page('CERTIFICATE OF SERVICE - COMPLETE ONLY AFTER ACTUAL SERVICE',true,'407_certificate_of_service',['Current prosecutor and probation-office addresses','Actual served documents, method, date and signature']);
  for(const t of[
    `Applicant: ${m.participant.fullLegalName}; underlying case ${m.caseNumber}.`,
    'I certify that I served the documents actually identified below, by the method and on the date entered after service occurred:',
    `County prosecuting attorney: ${prosecutor}. Address: ${m.prosecutorAddress??'________________________________________________'}.`,
    `Supervising probation office: ${probation}. Address: ${m.probationOfficeAddress??'________________________________________________'}.`,
    'Documents actually served: __________________________________________________',
    'Service method: __________________  Actual service date: __________________',
    'Applicant signature: __________________________  Date signed: ______________'
  ])service.y=paragraph(service.p,font,t,service.y);
  const court=await PDFDocument.create();court.setCreationDate(clock);court.setModificationDate(clock);for(const p of await court.copyPages(pdf,[0,1,2]))court.addPage(p);
  const checklist=page(locale==='es'?'Registros que debe obtener por separado':'Records to obtain separately',false,'407_external_records_checklist');
  const records=locale==='es'?[
    `Fechas proporcionadas: orden inicial ${order}; vencimiento ${expiration}; alta y desestimación ${dismissal}. Compare cada fecha con sus registros reales.`,
    '[ ] Solicite a la secretaría copias certificadas de la orden que aplazó el procedimiento e impuso libertad condicional y de la orden final de alta y desestimación. Son órdenes distintas; LegalEase no las crea ni certifica.',
    `[ ] Solicite a ${probation} confirmación escrita de la fecha en que venció el período de libertad condicional. El plazo de seis meses usa esa fecha.`,
    `[ ] Estado declarado de costas: ${{paid:'pagadas',unpaid:'sin pagar',not_assessed:'no se impusieron',unknown:'desconocido'}[costs]}. Confirme las costas reales conforme a 407(c) y obtenga recibo o historial si hace falta. No se afirma que estén pagadas cuando no lo están.`,
    '[ ] Antes de presentar, adjunte la orden real de alta condicional, la orden final de alta y desestimación y la confirmación escrita de la oficina de libertad condicional sobre la fecha de vencimiento. Obtenga estos registros por separado; no se afirma que ya estén adjuntos.',
    '[ ] Compare el caso, delito, fechas y condiciones con las órdenes. Obtenga de las oficinas sus domicilios vigentes para notificación. Ningún registro de esta lista se describe como adjunto.',
    'Estos documentos externos y pasos pendientes no son documentos oficiales generados por LegalEase. Prepare el borrador con sus respuestas; obtenga y revise los registros necesarios antes de presentar, como exige el diseño del paquete.'
  ]:[
    `Supplied dates: probation order ${order}; expiration ${expiration}; discharge and dismissal ${dismissal}. Compare each with your actual records.`,
    '[ ] Ask the clerk for certified copies of the order deferring proceedings and imposing probation, and the final order of discharge and dismissal. These are distinct orders; LegalEase does not create or certify them.',
    `[ ] Ask ${probation} for written confirmation of the actual probation expiration date. The six-month period uses that date.`,
    `[ ] Reported court-cost status: ${costs.replaceAll('_',' ')}. Confirm actual section 407(c) costs and obtain a receipt/payment history if needed. Unpaid or unknown costs are not represented as paid.`,
    "[ ] Before filing, attach the actual conditional discharge order, the final order of discharge and dismissal, and the probation office's written confirmation of the expiration date. These records must be obtained separately; none is described as already attached.",
    '[ ] Compare the case, offense, dates and conditions with the actual orders. Obtain current service addresses from the offices. No record on this checklist is described as attached.',
    'The external documents and remaining steps are not official documents generated by LegalEase. This draft uses your answers; obtain and check the necessary records before filing under the packet design.'
  ];for(const t of records)checklist.y=paragraph(checklist.p,font,t,checklist.y);
  const instructions=page(locale==='es'?'Presentación, audiencia y notificación':'Filing, hearing and service instructions',false,'407_filing_instructions');
  for(const t of locale==='es'?[
    `Presente la solicitud y declaración jurada ante ${m.courtName}, el tribunal que impuso la libertad condicional, a partir de ${due}. No es el procedimiento ordinario de condenas 61-11-26 ni el formulario SCA-C903 para desestimaciones sin declaración de culpabilidad.`,
    'Revise todos los hechos. Firme la solicitud y jure la declaración ante notario u otro funcionario autorizado. Deje la fecha, firma, sello y jurat para la ejecución real. La constancia de notificación queda sin fecha ni firma hasta efectuar la notificación.',
    `El diseño del paquete exige notificar a ${prosecutor} y a ${probation}. Confirme con la secretaría los domicilios, copias, método, requisitos locales y cualquier formulario local obligatorio. Use ese formulario donde corresponda. No se inventa una audiencia ni un plazo de oposición de 30 días para 407.`,
    'El tribunal debe celebrar una audiencia y determinar si hubo infracciones graves o repetidas durante la libertad condicional o antes de la solicitud. Si hay alegaciones, oposición, revocación o adjudicación de culpabilidad, consulte a un abogado; este borrador no resuelve esos hechos.',
    'La sección 407a permite condiciones adicionales de tratamiento antes de la orden final de alta y desestimación. Use la orden final real. El límite de una sola alta de 407 es distinto del asunto pendiente sobre la interacción con un futuro beneficio 61-11-26; obtenga revisión específica si también considera ese beneficio.',
    'La sección 407 no fija una tasa de solicitud; 407(c) mantiene la responsabilidad por costas. Confirme con la secretaría cualquier tasa local y sus opciones. Cualquier cargo opcional de software es separado de las costas judiciales, registros y envío. No tiene que pagar a LegalEase para pedir el beneficio público.',
    'Se entregan tres documentos judiciales sin ejecutar y esta lista de registros e instrucciones. No se incluyen órdenes certificadas, consentimiento fiscal, decisiones ni documentos de otra persona. No está listo para presentar hasta completar los registros, firmas y requisitos locales necesarios.'
  ]:[
    `File the application and affidavit with ${m.courtName}, the court that imposed probation, once the six-month period has reached ${due}. This is not ordinary conviction expungement under 61-11-26 or the SCA-C903 dismissal-without-plea procedure.`,
    'Review every fact. Sign the application and swear the supporting affidavit before a notary or authorized official. The date, signature, seal and jurat await actual execution. Leave the service certificate undated and unsigned until actual service.',
    `The packet design calls for service on ${prosecutor} and ${probation}. Ask the clerk about current addresses, copies, method, local requirements and any controlling local form. Use that form where applicable. No hearing date or 30-day opposition period is invented for 407.`,
    'The court must hold a hearing and determine whether serious or repeated violations occurred during probation or before the application. Allegations, opposition, revocation or adjudication require counsel review; this draft does not resolve disputed facts.',
    'Section 407a permits added treatment conditions before the final discharge and dismissal order. Use the actual final order. The one-discharge limit in 407 is distinct from the unresolved interaction with a future 61-11-26 petition; seek targeted review if also considering that relief.',
    'Section 407 sets no application fee; 407(c) preserves liability for court costs. Confirm any local filing fee and options with the clerk. Any optional software charge is separate from court, record and postage costs. Paying LegalEase is not required to seek public relief.',
    'Provided: three unexecuted court documents and this records checklist/instruction set. Not provided: certified orders, prosecutor consent, judicial decisions or another participant\'s records. This draft requires actual records, signatures and necessary local steps before filing.'
  ])instructions.y=paragraph(instructions.p,font,t,instructions.y);
  const fullPacket=Buffer.from(await pdf.save({useObjectStreams:false})),courtOnly=Buffer.from(await court.save({useObjectStreams:false}));return{fullPacket,courtOnly,manifest,checksums:{fullPacket:sha(fullPacket),courtOnly:sha(courtOnly)},frozenInputSha256:sha(JSON.stringify(m)),filingReady:false as const,verificationLevel:'LOCAL_GENERATED'as const};
}
