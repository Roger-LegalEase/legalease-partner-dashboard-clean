/** Bounded engineering copy only; this lookup changes no decision or legal authority. */
const MD_CANNABIS_PARTICIPANT_COPY = [
  ["The actual court record is already expunged. Do not purchase a duplicate petition; repository-only removal and Case Search absence are different facts.", "El expediente judicial real ya fue eliminado. No compre una petición duplicada; la eliminación solo del repositorio y la ausencia en Case Search son hechos distintos."],
  ["A different cannabis procedure cannot use this three-ground conviction petition.", "Un procedimiento de cannabis distinto no puede utilizar esta petición de condena con tres fundamentos."],
  ["An actual objection or contested hearing requires the separately supported assistance workflow.", "Una objeción real o una audiencia contenciosa requiere el procedimiento separado de asistencia disponible para esos casos."],
  ["Complete the actual other-charge or requested-waiver fields; unknown values never become qualifying answers or zero amounts.", "Complete los datos reales de los otros cargos o de la exención solicitada; los valores desconocidos nunca se convierten en respuestas que acrediten los requisitos ni en importes de cero."],
  ["Resolve the actual conviction, complete charge inventory, court status and filing choices before selecting any recital.", "Confirme la condena real, el inventario completo de cargos, el estado del expediente judicial y las opciones de presentación antes de seleccionar una declaración."],
  ["The express waiver request requires complete actual financial facts; missing inventories never become zeros or NONE.", "La solicitud expresa de exención requiere datos económicos reales y completos; los inventarios ausentes nunca se convierten en ceros ni en NINGUNO."],
  ["A mixed PWID incident requires a supported server determination of the other charges and exact required components. A participant answer about unit eligibility cannot authorize this branch. The source-native adapter remains separate from ordinary applicant answers.", "Un incidente con varios cargos que incluya posesión con intención de distribuir requiere una determinación admitida del servidor sobre los otros cargos y los documentos exactos requeridos. Una respuesta del participante sobre los requisitos del conjunto de cargos no puede autorizar esta rama. El adaptador basado en la fuente sigue separado de las respuestas ordinarias del solicitante."],
  ["Other incident charges require the actual structured charge inventory; no negative answer or unit eligibility is inferred.", "Los otros cargos del incidente requieren el inventario real y estructurado de cargos; no se deduce una respuesta negativa ni que el conjunto de cargos cumpla los requisitos."],
  ["Required actual case or requested-waiver facts remain unresolved.", "Siguen sin resolverse datos reales requeridos del caso o de la exención solicitada."],
  ["The selected conviction recital cannot yet be verified.", "Todavía no puede verificarse la declaración seleccionada sobre la condena."],
  ["The exact 072D cannabis conviction branch is supported. The court serves required recipients and enters its own order. The optional software charge is separate from the court's $30 eligible-guilty fee; an express waiver request selects the actual fee-waiver documents.", "Se admite esta rama específica de condena por cannabis del formulario 072D. El tribunal notifica a los destinatarios requeridos y dicta su propia orden. El cargo opcional del software es independiente de la tasa judicial de $30 para una resolución de culpabilidad que reúna los requisitos; una solicitud expresa de exención selecciona los documentos reales de exención de tasas."],
  ["The actual sentence-completion waiting period has not elapsed.", "No ha transcurrido el período de espera contado desde el cumplimiento real de la sentencia."],
  ["The matter's date is beyond the current source review; a targeted authority refresh is needed.", "La fecha del asunto supera el período cubierto por la revisión actual de las fuentes; se necesita actualizar las fuentes normativas pertinentes."],
  ["The preserved source adapter requires a precise leap-day anniversary determination before selecting the PWID recital.", "El adaptador de la fuente conservado exige determinar con precisión el aniversario de una fecha del 29 de febrero antes de seleccionar la declaración de posesión con intención de distribuir."],
  ["The other PWID unit charge needs its own actual eligibility and document component; it cannot inherit the simple-possession carve-out.", "El otro cargo del conjunto que incluye posesión con intención de distribuir requiere su propia determinación real de requisitos y su documento; no puede recibir la excepción de la posesión simple."],
  ["Actual sentence and supervision completion is required for this branch.", "Esta rama exige el cumplimiento real de la sentencia y de la supervisión."],
] as const;

const MD_CANNABIS_TECHNICAL_COPY = [
  ["NOT_A_CONVICTION_USE_ANOTHER_FORM", "El resultado registrado no es una condena; debe utilizarse el formulario correspondiente a ese resultado."],
  ["NOT_CANNABIS", "El cargo solicitado no está establecido como un cargo de cannabis; no puede utilizar esta declaración."],
  ["WRONG_STATUTE", "La disposición legal registrada no corresponde al fundamento seleccionado del formulario 072D."],
  ["WRONG_072D_BASIS", "El fundamento indicado no corresponde a los tres fundamentos de condena del formulario 072D."],
  ["CONDITION_NOT_MET: confirmations.pendingCriminalProceeding", "Existe un proceso penal pendiente; no se cumple esta condición de la petición de condena."],
  ["CONDITION_NOT_MET: confirmations.newConvictionNowEligible", "La nueva condena todavía no reúne los requisitos de eliminación exigidos para esta rama."],
  ["CONDITION_NOT_MET: confirmations.selectedRecitalTrue", "No se ha confirmado que la declaración seleccionada sea cierta para el caso real."],
  ["CONDITION_NOT_MET: confirmations.allIncidentChargesListed", "No se ha confirmado el inventario completo de cargos del mismo incidente."],
  ["CONDITION_NOT_MET: confirmations.conductNoLongerCrime", "No se ha confirmado que la conducta subyacente haya dejado de ser delito."],
  ["CONDITION_NOT_MET: records.caseSearchChecked", "No se ha confirmado la consulta real de Case Search; no se puede deducir el estado del expediente judicial."],
  ["CONDITION_NOT_MET: court.venueConfirmed", "No se ha confirmado el tribunal correcto para presentar la petición."],
  ["CONDITION_NOT_MET: court.receivingCourtConfirmed", "No se ha confirmado el tribunal receptor después de la transferencia."],
  ["CONDITION_NOT_MET: court.isAppellateFilingCourt", "No se ha confirmado el tribunal correcto para presentar el asunto apelado."],
  ["CONTESTED_MATTER_HANDOFF", "El asunto tiene una objeción o audiencia contenciosa y requiere el procedimiento separado de asistencia."],
  ["DISPUTED_RESTITUTION_HANDOFF", "La restitución está en disputa y requiere revisión separada; no se representa como pagada."],
  ["COMPLETION_BEFORE_CONVICTION", "La fecha de cumplimiento es anterior a la condena; confirme la cronología real."],
  ["EVENT_AFTER_CONVICTION", "La fecha del arresto, citación o emplazamiento es posterior a la condena; confirme la cronología real."],
  ["DOB_AFTER_EVENT", "La fecha de nacimiento es posterior al evento del caso; confirme las fechas reales."],
  ["DUPLICATE_CHARGE_ID", "El inventario contiene números de cargo duplicados; identifique los cargos reales por separado."],
  ["OTHER_OFFENSES_INVENTORY_MISMATCH", "La respuesta sobre otros cargos contradice el inventario del incidente; confirme los cargos reales."],
  ["ALL_CHARGES_REQUIRED", "Se necesita el inventario real de todos los cargos del incidente."],
  ["MIXED_072D_BASES_REQUIRE_SEPARATE_RECITALS", "Los cargos solicitados usan fundamentos distintos del formulario 072D y requieren declaraciones separadas."],
  ["MIXED_CONVICTION_DATES", "Los cargos solicitados tienen fechas de condena distintas; confirme las fechas y el alcance de la petición."],
  ["EXPLICIT_FEE_CHOICE_REQUIRED", "Debe indicar expresamente si pagará la tasa judicial o solicitará una exención."],
  ["EXPLICIT_WAIVER_REQUEST_REQUIRED", "Debe solicitar expresamente la exención; no se deduce de otros datos."],
  ["EXPLICIT_FINAL_COST_CHOICE_REQUIRED", "Debe indicar expresamente si solicita también la exención final de costos judiciales pendientes."],
  ["WAIVER_INPUT_ON_PAID_BRANCH", "Los datos de exención contradicen la opción de pagar la tasa judicial; confirme la opción real."],
  ["INCOME_TOTAL_MISMATCH", "El total de ingresos no coincide con los importes declarados; confirme los datos económicos reales."],
  ["HOUSEHOLD_SIZE_INVALID", "Confirme el número real de familiares del hogar, incluyéndose usted."],
  ["INCOME_PERIOD_INVALID", "Seleccione un único período válido para los importes de ingresos."],
  ["PROPERTY_EXCLUSIONS_NOT_CONFIRMED", "No se han confirmado las exclusiones de vivienda principal, un vehículo y artículos personales comunes."],
  ["SNAP_EXCLUSION_NOT_CONFIRMED", "No se ha confirmado que SNAP o los cupones de alimentos se excluyan de los ingresos declarados."],
  ["COURT_LEVEL", "Confirme si el tribunal correcto es de distrito o de circuito."],
  ["COURT_OPTION_LEVEL_MISMATCH", "El tribunal seleccionado no coincide con el nivel judicial indicado."],
  ["APPELLATE_CAPTION_REVIEW", "El asunto apelado requiere revisión del tribunal correcto antes de continuar."],
  ["TRANSFER_ROUTE_REVIEW", "La transferencia indicada requiere revisión del procedimiento correspondiente."],
  ["PROTECTED_OR_DIFFERENT_INSTRUMENT", "Los datos incluyen una firma, actuación oficial u otro instrumento que este preparador no puede crear."],
  ["INVALID_DATE: asOf", "Confirme una fecha válida para evaluar el asunto."],
  ["INVALID_DATE: case.convictionDate", "Confirme la fecha real y válida de la condena."],
  ["INVALID_DATE: case.completionDate", "Confirme la fecha real y válida de cumplimiento de la sentencia y supervisión."],
  ["FUTURE_CASE_FACT: case.convictionDate", "La fecha de condena indicada es futura; confirme la fecha real."],
  ["FUTURE_CASE_FACT: case.completionDate", "La fecha de cumplimiento indicada es futura; confirme la fecha real."],
  ["PLACEHOLDER_NOT_FACT: records.confirmationReference", "La referencia del expediente es un marcador provisional; indique la información real sin inventar un contacto."],
  ["PLACEHOLDER_NOT_FACT: id", "El número de cargo es un marcador provisional; indique el número real."],
  ["PLACEHOLDER_NOT_FACT: description", "La descripción del cargo es un marcador provisional; indique la descripción real."],
  ["PLACEHOLDER_NOT_FACT: statute", "La disposición legal es un marcador provisional; indique la disposición registrada real."],
  ["PLACEHOLDER_NOT_FACT: disposition", "La resolución es un marcador provisional; indique la resolución registrada real."],
] as const;

export const MD_CANNABIS_OUTCOME_COPY: ReadonlyArray<readonly [string, string]> = [
  ...MD_CANNABIS_PARTICIPANT_COPY,
  ...MD_CANNABIS_TECHNICAL_COPY,
  ...MD_CANNABIS_TECHNICAL_COPY.map(([english,spanish])=>[
    "The existing source predicate refused the supplied facts: "+english,
    "El criterio de la fuente no acepta los datos proporcionados. "+spanish
  ] as const)
];

export function marylandCannabisOutcomeSpanish(reason: string): string | null {
  return MD_CANNABIS_OUTCOME_COPY.find(([english])=>english===reason)?.[1] ?? null;
}
