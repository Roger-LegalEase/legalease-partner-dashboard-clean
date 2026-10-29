import { AK_IDENTITY_ROUTE } from "@/lib/rcap-engine/alaska-identity-research";
import { GA_NONCONVICTION_ROUTE } from "@/lib/rcap-engine/georgia-nonconviction-research";
import { WEST_VIRGINIA_407_ROUTE } from "@/lib/rcap-engine/west-virginia-407-facts";
import { MASSACHUSETTS_ADULT_SEALING_ROUTE } from "@/lib/rcap-engine/massachusetts-adult-sealing-facts";
import { ND_NONCONVICTION_ROUTE } from "@/lib/rcap-engine/north-dakota-nonconviction-facts";

export const IOWA_MISDEMEANOR_COMPONENT_COPY = {
  form: ["Official Iowa Rule 2.86 Form 2 application, all three pages", "Solicitud oficial de Iowa del Formulario 2 de la Regla 2.86, las tres páginas"],
  aliases: ["Additional alias continuation sheet", "Hoja de continuación para alias adicionales"],
  paperService: ["Embedded paper-service certification, left unsigned until actual service", "Certificación de entrega en papel incluida, sin firmar hasta realizar la entrega"],
  instructions: ["Participant instructions for private completion and obtaining the actual DCI report separately", "Instrucciones para completar los datos en privado y obtener por separado el informe DCI real"]
} as const;

export const IOWA_ALCOHOL_COMPONENT_COPY = {
  form3: ["Official Iowa Rule 2.86 Form 3 public-intoxication application, both pages", "Solicitud oficial de Iowa del Formulario 3 de la Regla 2.86 para intoxicación en público, ambas páginas"],
  form4: ["Official Iowa Rule 2.86 Form 4 underage-alcohol application, both pages", "Solicitud oficial de Iowa del Formulario 4 de la Regla 2.86 para alcohol siendo menor de edad legal, ambas páginas"],
  instructions: ["Participant instructions for completing the actual conviction and two-year history statements before signing and filing", "Instrucciones para completar las declaraciones reales sobre la condena y los antecedentes durante dos años antes de firmar y presentar"]
} as const;

export const IOWA_ALCOHOL_FILING_NOTICES = [
  { en: "This is draft preparation only. Complete any missing contact details and personally review the official conviction and two-year history statements against your actual records before signing and dating the application. Nothing is signed or filed for you.", es: "Esto es solo la preparación de un borrador. Complete los datos de contacto que falten y revise personalmente las declaraciones oficiales sobre la condena y los antecedentes durante dos años, comparándolas con sus expedientes reales, antes de firmar y fechar la solicitud. No se firma ni presenta nada en su nombre." },
  { en: "For paper filing, provide the required copy to the county attorney and complete the embedded service certification only after actual service. For electronic filing, confirm the actual service procedure. Do not certify an event that did not occur. This packet does not require a DCI request or returned history report.", es: "Si presenta en papel, entregue la copia requerida al fiscal del condado y complete la certificación de entrega incluida solo después de realizar la entrega. Si presenta electrónicamente, confirme el procedimiento real de entrega. No certifique un hecho que no ocurrió. Este paquete no requiere una solicitud al DCI ni un informe de antecedentes recibido." }
] as const;

export const RESEARCH115_COMPONENT_COPY = {
  [ND_NONCONVICTION_ROUTE]: [
    ["Official North Dakota court-record closure instructions, both pages", "Instrucciones oficiales de Dakota del Norte para cerrar el expediente judicial, ambas páginas"],
    ["Official Petition to Close Nonconviction Records, both pages", "Petición oficial para cerrar expedientes sin condena, ambas páginas"],
    ["Official proposed Order to Close Nonconviction Records, both pages; judicial decisions and execution remain blank", "Propuesta oficial de orden para cerrar expedientes sin condena, ambas páginas; las decisiones y la firma judicial quedan en blanco"]
  ],
  [MASSACHUSETTS_ADULT_SEALING_ROUTE]: [
    ["Official Commissioner of Probation section100A sealing request", "Solicitud oficial de sellado de la sección100A al Comisionado de Libertad Condicional"],
    ["Applicable adult declaration with participant signature left blank", "Declaración de adulto aplicable con la firma del participante en blanco"],
    ["Whole-record submission instructions; obtain your own CORI before filing", "Instrucciones para presentar la solicitud sobre el registro completo; obtenga su propio CORI antes de presentar"]
  ],
  [AK_IDENTITY_ROUTE]: [
    ["Participant portions of the six-page Alaska DPS sealing application", "Partes del participante de la solicitud de sellado de seis páginas de Seguridad Pública de Alaska"],
    ["Participant explanation and continuation if needed", "Explicación del participante y continuación si hace falta"],
    ["Instructions for obtaining actual external records and official verifications before submission", "Instrucciones para obtener los registros externos y las verificaciones oficiales reales antes de presentar la solicitud"]
  ],
  [GA_NONCONVICTION_ROUTE]: [
    ["Applicant Section One of the four-page pre-2013 GCIC agency application", "Sección Uno del solicitante del formulario de cuatro páginas de GCIC para arrestos anteriores a 2013"],
    ["External disposition and agency/prosecutor completion checklist", "Lista de documentos externos de resolución y actuaciones pendientes de la agencia o fiscalía"],
    ["Participant agency-submission instructions", "Instrucciones del participante para presentar la solicitud a la agencia"]
  ],
  [WEST_VIRGINIA_407_ROUTE]: [
    ["Section 60A-4-407(b) application", "Solicitud conforme a la sección 60A-4-407(b)"],
    ["Supporting affidavit with blank signature and jurat", "Declaración jurada de respaldo con firma y certificación notarial en blanco"],
    ["Service certificate for the county prosecutor and supervising probation office", "Certificado de notificación al fiscal del condado y a la oficina de libertad condicional supervisora"],
    ["Checklist of actual orders and probation-expiration confirmation to obtain before filing", "Lista de órdenes reales y confirmación del vencimiento de la libertad condicional que se deben obtener antes de presentar"],
    ["Hearing and filing instructions", "Instrucciones para la audiencia y la presentación"]
  ]
} as const;

export const MD_CANNABIS_COMPONENT_COPY = {
  "CC-DC-CR-072D": ["Official Maryland cannabis petition CC-DC-CR-072D", "Petición oficial de Maryland para cannabis CC-DC-CR-072D"],
  "CC-DC-089": ["Express court-fee-waiver request CC-DC-089, all three pages", "Solicitud expresa de exención de tasas judiciales CC-DC-089, las tres páginas"],
  "MDJ-008": ["Restricted financial-information notice MDJ-008", "Aviso de información financiera restringida MDJ-008"],
  "participant_instructions": ["Court submission and external-record instructions; the court handles service and its order", "Instrucciones para presentar la solicitud al tribunal y obtener registros externos; el tribunal se encarga de la notificación y de su orden"]
} as const;


export const IOWA_ALCOHOL_FORM4_NOTICE = { en: "For Form 4, item 1 remains for your own confirmation of the actual section 123.47(3) conviction or a similar local ordinance. A general alcohol conviction is not enough.", es: "En el Formulario 4, el punto 1 queda para que usted confirme personalmente la condena real conforme a la sección 123.47(3) o una ordenanza local similar. Una condena general relacionada con alcohol no es suficiente." } as const;
