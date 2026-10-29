import { AK_IDENTITY_ROUTE } from "@/lib/rcap-engine/alaska-identity-research";
import { GA_NONCONVICTION_ROUTE } from "@/lib/rcap-engine/georgia-nonconviction-research";
import { WEST_VIRGINIA_407_ROUTE } from "@/lib/rcap-engine/west-virginia-407-facts";

export const RESEARCH115_COMPONENT_COPY = {
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

