import { AK_IDENTITY_ROUTE } from "@/lib/rcap-engine/alaska-identity-research";
import { GA_NONCONVICTION_ROUTE } from "@/lib/rcap-engine/georgia-nonconviction-research";
import { WEST_VIRGINIA_407_ROUTE } from "@/lib/rcap-engine/west-virginia-407-facts";
import { MASSACHUSETTS_ADULT_SEALING_ROUTE } from "@/lib/rcap-engine/massachusetts-adult-sealing-facts";

export const IOWA_MISDEMEANOR_COMPONENT_COPY = {
  form: ["Official Iowa Rule 2.86 Form 2 application, all three pages", "Solicitud oficial de Iowa del Formulario 2 de la Regla 2.86, las tres páginas"],
  aliases: ["Additional alias continuation sheet", "Hoja de continuación para alias adicionales"],
  paperService: ["Embedded paper-service certification, left unsigned until actual service", "Certificación de entrega en papel incluida, sin firmar hasta realizar la entrega"],
  instructions: ["Participant instructions for private completion and obtaining the actual DCI report separately", "Instrucciones para completar los datos en privado y obtener por separado el informe DCI real"]
} as const;

export const RESEARCH115_COMPONENT_COPY = {
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

