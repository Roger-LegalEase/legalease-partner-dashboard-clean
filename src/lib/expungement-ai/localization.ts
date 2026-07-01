export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES = ["en", "es"] as const;

type CopyEntry = {
  en: string;
  es?: string;
};

export const EXPUNGEMENT_COPY: Record<string, CopyEntry> = {
  "common.free": { en: "Free", es: "Gratis" },
  "common.continue": { en: "Continue", es: "Continuar" },
  "common.back": { en: "Back", es: "Atrás" },
  "common.optional": { en: "Optional", es: "Opcional" },
  "common.next_steps": { en: "Next steps", es: "Próximos pasos" },
  "common.why": { en: "Why", es: "Por qué" },
  "common.download": { en: "Download", es: "Descargar" },
  "common.open_matter": { en: "Open matter", es: "Abrir asunto" },
  "common.ask_wilma": { en: "Ask Wilma", es: "Preguntar a Wilma" },
  "common.try_again": { en: "Try again", es: "Intentar de nuevo" },

  "screening.free_screening": { en: "Free screening", es: "Revisión gratis" },
  "screening.where_record": { en: "Where is the record?", es: "¿Dónde está el antecedente?" },
  "screening.state_picker_body": {
    en: "Choose the state or district where the case happened. We will ask a few plain questions for that place. This is legal information, not legal advice, and there is no payment to check.",
    es: "Elija el estado o distrito donde ocurrió el caso. Haremos unas preguntas sencillas para ese lugar. Esto es información legal, no asesoría legal, y no hay pago para revisar."
  },
  "screening.state_screening": { en: "{state} screening", es: "Revisión de {state}" },
  "screening.save_progress": { en: "Save progress", es: "Guardar progreso" },
  "screening.answer_required": { en: "Please answer this question to continue.", es: "Responda esta pregunta para continuar." },
  "screening.legal_info": {
    en: "This is legal information, not legal advice. The engine decides the result; we never do.",
    es: "Esto es información legal, no asesoría legal. El motor decide el resultado; nosotros no."
  },
  "screening.loading": { en: "Loading your state's questions...", es: "Cargando las preguntas de su estado..." },
  "screening.missing_state_title": { en: "We could not find that state.", es: "No pudimos encontrar ese estado." },
  "screening.choose_state": { en: "Choose your state", es: "Elija su estado" },
  "screening.malformed_title": { en: "Something went wrong loading these questions.", es: "Algo salió mal al cargar estas preguntas." },
  "screening.malformed_body": {
    en: "We could not load this state's screening questions correctly, so we stopped rather than show you something unreliable. Please try again in a moment.",
    es: "No pudimos cargar correctamente las preguntas de este estado, así que nos detuvimos en lugar de mostrar algo poco confiable. Intente de nuevo en un momento."
  },
  "screening.back_to_states": { en: "Back to states", es: "Volver a los estados" },
  "screening.question_unavailable": {
    en: "We could not show this question right now. You can continue, and a reviewer will follow up if this detail is needed.",
    es: "No pudimos mostrar esta pregunta ahora. Puede continuar, y alguien dará seguimiento si este detalle es necesario."
  },
  "screening.context_note": { en: "This helps us understand your situation, but it does not decide the result by itself.", es: "Esto nos ayuda a entender su situación, pero no decide el resultado por sí solo." },
  "answer.yes": { en: "Yes", es: "Sí" },
  "answer.no": { en: "No", es: "No" },
  "answer.not_sure": { en: "I'm not sure", es: "No estoy seguro" },
  "answer.i_am_not_sure": { en: "I am not sure", es: "No estoy seguro" },
  "answer.prefer_not": { en: "Prefer not to say", es: "Prefiero no decirlo" },
  "answer.dont_know_date": { en: "I don't know the date", es: "No sé la fecha" },

  "result.packet_title": { en: "You may be able to prepare an expungement packet.", es: "Es posible que pueda preparar un paquete de limpieza de antecedentes." },
  "result.path_available": { en: "A path may be available", es: "Puede haber una ruta disponible" },
  "result.path_available_caution": { en: "A path may be available, with cautions", es: "Puede haber una ruta disponible, con advertencias" },
  "result.more_details": { en: "A few more details needed", es: "Faltan algunos detalles" },
  "result.may_need_wait": { en: "You may need to wait", es: "Es posible que tenga que esperar" },
  "result.state_next_steps": { en: "Next steps for your state", es: "Próximos pasos para su estado" },
  "result.not_supported": { en: "Not supported yet", es: "Aún no compatible" },
  "result.may_not_qualify": { en: "This record may not qualify", es: "Es posible que este antecedente no califique" },
  "result.needs_review": { en: "This needs review", es: "Esto necesita revisión" },
  "result.cannot_help": { en: "We can't help with this record", es: "No podemos ayudar con este antecedente" },
  "result.cautions": { en: "Please read these cautions", es: "Lea estas advertencias" },
  "result.still_need": { en: "What we still need", es: "Lo que todavía necesitamos" },
  "result.packet_includes": { en: "What your packet would include", es: "Qué incluiría su paquete" },
  "result.edit_answers": { en: "Edit my answers", es: "Editar mis respuestas" },
  "result.add_details": { en: "Add these details", es: "Agregar estos detalles" },
  "result.save_briefcase": { en: "Save this result to Briefcase", es: "Guardar este resultado en el Maletín" },
  "result.reviewing": { en: "Reviewing your answers...", es: "Revisando sus respuestas..." },
  "result.reviewing_body": {
    en: "This only takes a moment. We are checking what you told us. We do not guess, and nothing here is a decision yet.",
    es: "Esto solo toma un momento. Estamos revisando lo que nos compartió. No adivinamos, y nada aquí es una decisión todavía."
  },
  "result.safe_stop": { en: "We stopped to keep this safe", es: "Nos detuvimos para mantener esto seguro" },
  "result.something_wrong": { en: "Something went wrong", es: "Algo salió mal" },
  "result.unreadable_title": { en: "We couldn't read this result reliably.", es: "No pudimos leer este resultado de forma confiable." },
  "result.check_failed_title": { en: "We couldn't check your record just now.", es: "No pudimos revisar su antecedente en este momento." },
  "result.unreadable_body": {
    en: "The result came back in a form we did not expect, so we stopped rather than show you something that might be wrong. Your answers are not lost. Please try again.",
    es: "El resultado llegó en un formato que no esperábamos, así que nos detuvimos en lugar de mostrar algo que podría estar incorrecto. Sus respuestas no se perdieron. Intente de nuevo."
  },
  "result.connection_body": {
    en: "This was a connection problem, not a decision about your record. Please try again in a moment.",
    es: "Esto fue un problema de conexión, no una decisión sobre su antecedente. Intente de nuevo en un momento."
  },
  "result.back_to_answers": { en: "Back to my answers", es: "Volver a mis respuestas" },
  "result.partner_no_pay": { en: "This screening started through a partner program. You will not be asked to pay here.", es: "Esta revisión comenzó por medio de un programa asociado. No se le pedirá pagar aquí." },
  "result.upl_disclaimer": {
    en: "Expungement.ai is not a law firm and this is not legal advice. We prepare self-help materials and information; court approval is not guaranteed. Review everything before filing.",
    es: "Expungement.ai no es un bufete de abogados y esto no es asesoría legal. Preparamos materiales e información de autoayuda; la aprobación del tribunal no está garantizada. Revise todo antes de presentar."
  },
  "missing.tell_more": { en: "Tell us more about {field}.", es: "Cuéntenos más sobre {field}." },

  "filing.ready_to_file": { en: "ready_to_file", es: "listo para presentar" },
  "filing.guidance_only": { en: "guidance_only", es: "solo guía" },
  "filing.needs_external_document": { en: "needs_external_document", es: "necesita un documento externo" },
  "filing.needs_court_or_agency_followup": { en: "needs_court_or_agency_followup", es: "necesita seguimiento con el tribunal o la agencia" },

  "payment.generate_packet": { en: "Generate my self-help packet - $50", es: "Generar mi paquete de autoayuda - $50" },
  "payment.step": { en: "Step 2 of 2", es: "Paso 2 de 2" },
  "payment.title": { en: "Generate your self-help packet.", es: "Genere su paquete de autoayuda." },
  "payment.support": {
    en: "The free check is complete. Based on your answers, we found a possible packet route.",
    es: "La revisión gratis está completa. Según sus respuestas, encontramos una posible ruta de paquete."
  },
  "payment.supporting_copy": {
    en: "The $50 covers Expungement.ai packet generation. Court, agency, or background-report fees are separate.",
    es: "Los $50 cubren la generación del paquete de Expungement.ai. Las cuotas del tribunal, de agencias o de informes de antecedentes son aparte."
  },
  "payment.one_time": { en: "one-time", es: "pago único" },
  "payment.fee_note": {
    en: "You are paying for self-help packet preparation and filing instructions. Court approval is not promised. Expungement.ai is not a law firm and does not provide legal advice.",
    es: "Usted paga por la preparación de un paquete de autoayuda y por instrucciones de presentación. No se promete la aprobación del tribunal. Expungement.ai no es un bufete de abogados y no brinda asesoría legal."
  },
  "payment.unavailable": { en: "Payment unavailable", es: "Pago no disponible" },
  "payment.no_paid_packet": { en: "This result does not include a paid packet.", es: "Este resultado no incluye un paquete pagado." },
  "payment.saved_matter": { en: "Saved matter", es: "Asunto guardado" },
  "payment.open_from_briefcase": { en: "Open this page from a packet-ready Briefcase result to start checkout.", es: "Abra esta página desde un resultado con paquete listo en el Maletín para empezar el pago." },
  "payment.starting": { en: "Starting checkout...", es: "Iniciando el pago..." },
  "payment.error": { en: "Checkout is not available right now.", es: "El pago no está disponible ahora." },

  "briefcase.label": { en: "Briefcase", es: "Maletín" },
  "briefcase.my_matters": { en: "My matters", es: "Mis asuntos" },
  "briefcase.documents": { en: "Documents", es: "Documentos" },
  "briefcase.account": { en: "Account", es: "Cuenta" },
  "briefcase.profile": { en: "Profile", es: "Perfil" },
  "briefcase.settings": { en: "Settings", es: "Configuración" },
  "briefcase.new_check": { en: "New record check", es: "Nueva revisión de antecedente" },
  "briefcase.guidance_saved": { en: "Guidance saved", es: "Guía guardada" },
  "briefcase.ready_to_file": { en: "Ready to file", es: "Listo para presentar" },
  "briefcase.needs_attention": { en: "Needs your attention", es: "Necesita su atención" },
  "briefcase.waiting_period": { en: "Waiting period", es: "Período de espera" },
  "briefcase.extra_care": { en: "Extra care", es: "Revisión cuidadosa" },
  "briefcase.saved": { en: "Saved", es: "Guardado" },

  "wilma.transport_fallback": { en: "I had trouble reaching the assistant just now - give it another try in a moment. The screening tool and your Briefcase are still right here.", es: "Tuve problemas para comunicarme con la asistente ahora. Intente de nuevo en un momento. La herramienta de revisión y su Maletín siguen aquí." },
  "wilma.challenge_pending": { en: "One sec - just finishing a quick security check, then send that again.", es: "Un segundo. Estamos terminando una revisión rápida de seguridad; luego envíe eso otra vez." },
  "wilma.rate_limit": { en: "I'm getting a lot of questions right at this moment - give me a few seconds and try again. The free screening tool is always available in the meantime.", es: "Estoy recibiendo muchas preguntas en este momento. Espere unos segundos e intente de nuevo. Mientras tanto, la revisión gratis siempre está disponible." },
  "wilma.bot": { en: "I couldn't verify this request. Refresh the page and try again, or head straight to the free screening tool.", es: "No pude verificar esta solicitud. Actualice la página e intente de nuevo, o vaya directamente a la revisión gratis." },
  "wilma.turns": { en: "We've covered a lot here. This is a great point to start the free screening - it checks your details against your state's rules and saves your place.", es: "Ya cubrimos bastante. Este es un buen momento para comenzar la revisión gratis: compara sus datos con las reglas de su estado y guarda su lugar." },
  "wilma.message_required": { en: "message is required.", es: "el mensaje es obligatorio." },
  "wilma.guide": { en: "Guide", es: "Guía" },
  "wilma.close": { en: "Close", es: "Cerrar" },
  "wilma.expand": { en: "Expand chat", es: "Ampliar chat" },
  "wilma.collapse": { en: "Collapse chat", es: "Contraer chat" },
  "wilma.your_state": { en: "Your state", es: "Su estado" },
  "wilma.select_state": { en: "Select a state (optional)", es: "Seleccione un estado (opcional)" },
  "wilma.thinking": { en: "Wilma is thinking...", es: "Wilma está pensando..." },
  "wilma.need_help": { en: "Need help? Ask Wilma to explain this in plain English.", es: "¿Necesita ayuda? Pida a Wilma que lo explique en lenguaje sencillo." },
  "wilma.reported": { en: "Reported, thank you. A reviewer will take a look.", es: "Reportado, gracias. Un revisor lo revisará." },
  "wilma.report_response": { en: "Report this response", es: "Reportar esta respuesta" },
  "wilma.message": { en: "Message Wilma", es: "Enviar mensaje a Wilma" },
  "wilma.ask_question": { en: "Ask Wilma about this question", es: "Preguntar a Wilma sobre esta pregunta" },
  "wilma.send": { en: "Send message", es: "Enviar mensaje" },
  "wilma.not_advice": { en: "Wilma is a guide, not legal advice.", es: "Wilma es una guía, no asesoría legal." },
  "wilma.resting": { en: "Wilma is resting", es: "Wilma está descansando" },
  "wilma.resting_body": { en: "Wilma is taking a quick break. The screening tool and your Briefcase still have what you need to keep going.", es: "Wilma está tomando una pausa breve. La herramienta de revisión y su Maletín siguen teniendo lo que necesita para continuar." },
  "wilma.prompt.landing": { en: "Want me to explain how this works?", es: "¿Quiere que explique cómo funciona?" },
  "wilma.prompt.pricing": { en: "Want to know what is included?", es: "¿Quiere saber qué está incluido?" },
  "wilma.prompt.start": { en: "Want me to explain the screening?", es: "¿Quiere que explique la revisión?" },
  "wilma.prompt.check": { en: "Want me to explain these questions?", es: "¿Quiere que explique estas preguntas?" },
  "wilma.prompt.results": { en: "Want me to explain this result?", es: "¿Quiere que explique este resultado?" },
  "wilma.prompt.pay": { en: "Want to know what's included?", es: "¿Quiere saber qué está incluido?" },
  "wilma.prompt.packet-ready": { en: "Want help with next steps?", es: "¿Quiere ayuda con los próximos pasos?" },
  "wilma.prompt.briefcase": { en: "Want me to explain this matter status?", es: "¿Quiere que explique el estado de este asunto?" },

  "external_doc.1": { en: "File the TF-810 request at your local Alaska trial court", es: "Presente la solicitud TF-810 en su tribunal local de primera instancia de Alaska" },
  "external_doc.2": { en: "Proof of SIS and/or the order setting aside charges (if applicable)", es: "Prueba del SIS y/o de la orden que dejó sin efecto los cargos, si aplica" },
  "external_doc.3": { en: "Certified disposition showing acquittal or dismissal (if requested)", es: "Resolución certificada que muestre absolución o desestimación, si se solicita" },
  "external_doc.4": { en: "SBI criminal-history / SBI eligibility letter", es: "Informe de antecedentes penales del SBI o carta de elegibilidad del SBI" },
  "external_doc.5": { en: "Certified case documents", es: "Documentos certificados del caso" },
  "external_doc.6": { en: "Superior Court filing fee", es: "Cuota de presentación del Tribunal Superior" },
  "external_doc.7": { en: "Current verified criminal-history record (CHR/SCOPE)", es: "Registro actual verificado de antecedentes penales (CHR/SCOPE)" },
  "external_doc.8": { en: "Certified dispositions / judgment of conviction", es: "Resoluciones certificadas / sentencia de condena" },
  "external_doc.9": { en: "Probation/parole/prison discharge paperwork", es: "Documentos de finalización de probation, parole o prisión" },
  "external_doc.10": { en: "Fingerprints where required", es: "Huellas digitales cuando se requieran" },
  "external_doc.11": { en: "Prosecutor review/stipulation step", es: "Paso de revisión o estipulación de la fiscalía" },
  "external_doc.12": { en: "Court/county filing fee", es: "Cuota de presentación del tribunal o condado" },
  "external_doc.13": { en: "PATCH / PSP criminal-history report", es: "Informe de antecedentes penales PATCH / PSP" },
  "external_doc.14": { en: "Expected PATCH fee", es: "Cuota esperada de PATCH" },

  "route.generic.record_clearing": { en: "{state} record-clearing", es: "limpieza de antecedentes de {state}" },
  "route.ak.courtview_removal": { en: "CourtView Removal", es: "Eliminación de CourtView (CourtView Removal)" },
  "route.nv.record_sealing": { en: "Record Sealing", es: "Sellado de antecedentes (Record Sealing)" },
  "route.ma.cori_sealing": { en: "CORI Sealing", es: "Sellado CORI (CORI Sealing)" },
  "route.ma.dismissed_case_sealing": { en: "Dismissed Case Sealing", es: "sellado de caso desestimado (Dismissed Case Sealing)" },
  "route.ma.marijuana_expungement": { en: "Marijuana Expungement", es: "expungement de marihuana (Marijuana Expungement)" },
  "route.pa.court_case_expungement": { en: "Court Case Expungement", es: "Expungement de caso judicial (Court Case Expungement)" },
  "route.pa.summary_expungement": { en: "Summary Expungement", es: "Expungement sumario (Summary Expungement)" },
  "route.pa.limited_access": { en: "Limited Access / Sealing", es: "Acceso limitado / sellado (Limited Access / Sealing)" },
  "route.hi.admin_application": { en: "Administrative Application", es: "Solicitud administrativa" },
  "route.de.discretionary_expungement": { en: "Discretionary Expungement Packet", es: "Paquete de expungement discrecional (Discretionary Expungement Packet)" }
};

const EXACT_ENGLISH_INDEX = new Map<string, string>();
for (const [key, entry] of Object.entries(EXPUNGEMENT_COPY)) {
  EXACT_ENGLISH_INDEX.set(normalize(entry.en), key);
}

export function normalizeLocale(input: string | null | undefined): Locale {
  return input === "es" ? "es" : "en";
}

export function interpolate(text: string, vars?: Record<string, string | number | undefined>) {
  if (!vars) return text;
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function t(locale: Locale, key: string, fallback?: string, vars?: Record<string, string | number | undefined>) {
  const entry = EXPUNGEMENT_COPY[key];
  const value = locale === "es" ? entry?.es ?? entry?.en ?? fallback ?? key : entry?.en ?? fallback ?? key;
  return interpolate(value, vars);
}

export function resolveRuntimeText(locale: Locale, text: string, options?: { key?: string; vars?: Record<string, string | number | undefined> }) {
  if (options?.key) return t(locale, options.key, text, options.vars);
  const key = EXACT_ENGLISH_INDEX.get(normalize(text));
  if (key) return t(locale, key, text, options?.vars);
  if (locale === "es") return resolveSpanishPattern(text, options?.vars);
  return interpolate(text, options?.vars);
}

export function runtimeCopyKeyForText(text: string) {
  return EXACT_ENGLISH_INDEX.get(normalize(text)) ?? `runtime.${slugify(text).slice(0, 80)}`;
}

export function localizeProfileText(locale: Locale, text: string, meta: { state?: string; questionId?: string; part?: string }) {
  const key = `profile.${meta.state ?? "all"}.${meta.questionId ?? "unknown"}.${meta.part ?? "text"}`;
  return t(locale, key, text);
}

export function routeLabelKeyForState(stateName: string, pathwayId?: string) {
  const state = stateName.toLowerCase();
  const pathway = (pathwayId ?? "").toLowerCase();
  if (state === "alaska") return "route.ak.courtview_removal";
  if (state === "nevada") return "route.nv.record_sealing";
  if (state === "hawaii") return "route.hi.admin_application";
  if (state === "delaware") return "route.de.discretionary_expungement";
  if (state === "massachusetts") {
    if (pathway.includes("marijuana")) return "route.ma.marijuana_expungement";
    if (pathway.includes("dismiss") || pathway.includes("non-conviction")) return "route.ma.dismissed_case_sealing";
    return "route.ma.cori_sealing";
  }
  if (state === "pennsylvania") {
    if (pathway.includes("summary") || pathway.includes("490")) return "route.pa.summary_expungement";
    if (pathway.includes("limited") || pathway.includes("seal") || pathway.includes("791")) return "route.pa.limited_access";
    return "route.pa.court_case_expungement";
  }
  return "route.generic.record_clearing";
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function slugify(text: string) {
  return normalize(text).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function resolveSpanishPattern(text: string, vars?: Record<string, string | number | undefined>) {
  const normalized = interpolate(normalize(text), vars);
  const possibleRoute = normalized.match(/^Based on your answers, there may be a (.+) route for this case\.$/);
  if (possibleRoute) return `Según lo que compartió, puede haber una ruta de ${possibleRoute[1]} para este caso.`;

  const mississippi = normalized.match(/^Based on your answers, Mississippi may have a record-clearing path for a case that was dismissed, had no final disposition, or ended in acquittal\.$/);
  if (mississippi) return "Según lo que compartió, Mississippi puede tener una ruta de limpieza de antecedentes para un caso desestimado, sin resultado final o terminado en absolución.";

  const nonConviction = normalized.match(/^Your answers match a (.+) path for cases that did not end in a conviction\.$/);
  if (nonConviction) return `Sus respuestas coinciden con una ruta de ${nonConviction[1]} para casos que no terminaron en condena.`;

  const possible = normalized.match(/^This looks like a possible (.+) route based on the information you provided\.$/);
  if (possible) return `Esto parece una posible ruta de ${possible[1]} según la información que compartió.`;

  const packet = normalized.match(/^We’ll prepare a (.+) self-help packet for you to review, including the documents and filing steps that match the information you provided\.$/);
  if (packet) return `Prepararemos un paquete de autoayuda de ${packet[1]} para que lo revise, incluyendo los documentos y pasos de presentación que correspondan a la información que compartió.`;

  if (normalized === "We’ll help you confirm automatic relief and what to do next.") {
    return "Le ayudaremos a confirmar la opción automática y qué hacer después.";
  }

  return normalized;
}
