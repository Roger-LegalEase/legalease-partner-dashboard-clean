/** Exact five research NO entries: ordinary-packet restriction and conditional procedural guidance, never attorney rejection or individual eligibility. */
export const RESEARCH115_NO_ROUTES = [
  {
    reviewId: "R059", routeId: "NV:deferred-judgment-dismissal-and-sealing-under-nrs-176-211",
    relief: "deferred_judgment_dismissal_and_sealing",
    authorityUrl: "https://www.leg.state.nv.us/NRS/NRS-176.html#NRS176Sec211",
    guidance: {
      en: "After the court finds the deferred-judgment conditions completed, it discharges the defendant and dismisses the proceeding. The court orders sealing under NRS 176.211(6), subject to subsection (7) and any Division or prosecutor objection. Ask the original court about the completion and sealing orders. LegalEase does not sell an ordinary petition for this procedure.",
      es: "Cuando el tribunal determina que se cumplieron las condiciones del juicio diferido, da de alta al acusado y desestima el proceso. El tribunal ordena el sellado conforme a NRS 176.211(6), sujeto al apartado (7) y a cualquier objeción de la División o del fiscal. Consulte al tribunal original sobre las órdenes de cumplimiento y sellado. LegalEase no vende una petición ordinaria para este procedimiento."
    }
  },
  {
    reviewId: "R082", routeId: "RI:path-e-filed-complaint-relief-under-12-10-12",
    relief: "filed_complaint_automatic_expungement",
    authorityUrl: "https://webserver.rilegislature.gov/Statutes/TITLE12/12-10/12-10-12.htm",
    guidance: {
      en: "A filed complaint is automatically expunged if no action is taken during its filing period and the statutory conditions are met. Domestic-violence complaints have separate three-year and later-charge rules. Check the filing order, conditions and court record; no ordinary paid petition is offered under section 12-10-12.",
      es: "Una denuncia archivada conforme a esta disposición se elimina automáticamente si no se toma ninguna medida durante el plazo fijado y se cumplen las condiciones legales. Las denuncias por violencia doméstica tienen reglas distintas de tres años y sobre cargos posteriores. Revise la orden, las condiciones y el expediente judicial; no se ofrece una petición ordinaria de pago conforme a la sección 12-10-12."
    }
  },
  {
    reviewId: "R088", routeId: "SD:controlled-substance-deferred-disposition-route",
    relief: "charge_reduction_after_deferred_disposition",
    authorityUrl: "https://sdlegislature.gov/api/Statutes/23A-27.html?all=true",
    guidance: {
      en: "SDCL 23A-27-53 concerns deferred sentencing and, after one year of successful treatment and probation compliance, dismissal of the original charge upon a guilty plea to the specified lesser charge. It does not create an expungement petition. Confirm completion and the resulting disposition with the sentencing court or counsel.",
      es: "SDCL 23A-27-53 trata de una sentencia diferida y, tras un año de tratamiento satisfactorio y cumplimiento de la libertad a prueba, de la desestimación del cargo original al declararse culpable del cargo menor indicado. No establece una petición de eliminación de antecedentes. Confirme el cumplimiento y el resultado con el tribunal que impuso la sentencia o con un abogado."
    }
  },
  {
    reviewId: "R089", routeId: "SD:diversion-expungement",
    relief: "prosecutor_initiated_diversion_expungement",
    authorityUrl: "https://sdlegislature.gov/api/Statutes/23A-3.html?all=true",
    guidance: {
      en: "After successful diversion, SDCL 23A-3-35 requires one year and 30 days without a new charge other than the listed petty-offense or minor-traffic exceptions. The state's attorney files the dismissal and completion notice, and the court expunges without a participant motion. Ask the prosecutor about the notice and check the court record. No ordinary paid packet is offered.",
      es: "Después de completar satisfactoriamente la desviación, SDCL 23A-3-35 exige un año y 30 días sin un nuevo cargo, salvo las infracciones menores o de tránsito indicadas. El fiscal presenta la desestimación y el aviso de cumplimiento, y el tribunal elimina los antecedentes sin una moción del participante. Consulte al fiscal sobre el aviso y revise el expediente judicial. No se ofrece un paquete ordinario de pago."
    }
  },
  {
    reviewId: "R110", routeId: "WV:juvenile-record-relief",
    relief: "juvenile_record_confidentiality",
    authorityUrl: "https://code.wvlegislature.gov/49-5-104/",
    guidance: {
      en: "West Virginia juvenile confidentiality depends on the statutory event and record category. Section 49-5-104 generally addresses one year after age 18 or termination of jurisdiction, whichever is later, and has separate adult-transfer rules and exclusions. Ask the original juvenile court about confidential treatment and any record error. LegalEase does not offer an ordinary paid expungement petition for this route.",
      es: "La confidencialidad de los antecedentes juveniles de Virginia Occidental depende del momento y la categoría del expediente establecidos por ley. La sección 49-5-104 generalmente contempla un año después de cumplir 18 años o de terminar la jurisdicción, lo que ocurra más tarde, y contiene reglas y exclusiones distintas para casos transferidos a la jurisdicción penal de adultos. Consulte al tribunal juvenil original sobre la confidencialidad y cualquier error del expediente. LegalEase no ofrece una petición ordinaria de pago para esta vía."
    }
  }
] as const;

export function research115NoRoute(routeKey: string) {
  return RESEARCH115_NO_ROUTES.find((route) => route.routeId === routeKey) ?? null;
}

