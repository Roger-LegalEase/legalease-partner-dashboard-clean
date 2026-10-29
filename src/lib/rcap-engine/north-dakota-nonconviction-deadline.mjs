import {computeNdNonconvictionDeadline} from "../../../scripts/rcap-packet-recovery/nd-nonconviction-timing.mjs";

// Calendar coverage is a trusted caller dependency, never a participant eligibility answer.
export function northDakotaNonconvictionAutomaticDeadline(orderEntryDate, calendarCoverage = null) {
  return computeNdNonconvictionDeadline({orderEntryDate, calendarCoverage});
}

export const ND_NONCONVICTION_AUTOMATIC_TIMING_COPY = [
  "Automatic court-record closure uses a 61-day period from entry of the order, excluding the entry date and extending the last day for weekends and legal holidays under Rule 45. The first public-access check is the next court business day after that adjusted period expires; it is a LegalEase product step, not added statutory time. An exact check date requires verified North Dakota court-calendar coverage. No ordinary participant petition is needed; agency criminal-history errors use a separate correction process.",
  "El cierre automático del expediente judicial usa un plazo de 61 días desde el ingreso de la orden, excluyendo ese día y prorrogando el último día si cae en fin de semana o feriado legal conforme a la Regla 45. La primera comprobación del acceso público se hace el siguiente día hábil judicial después de que venza ese plazo ajustado; es un paso del producto de LegalEase, no un plazo legal adicional. Una fecha exacta de comprobación requiere cobertura verificada del calendario judicial de Dakota del Norte. No se necesita una petición ordinaria del participante; los errores en antecedentes de agencias usan un procedimiento de corrección separado."
];
