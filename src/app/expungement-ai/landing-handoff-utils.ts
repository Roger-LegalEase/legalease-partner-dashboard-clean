export function buildExpungementLandingHtml(source: string) {
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
  return body
    .replace(/<div id="wilma-static"[\s\S]*?<\/div>\s*(?=<script)/i, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replaceAll('src="hero-', 'src="/expungement-ai/hero-')
    .replaceAll('srcset="hero-', 'srcset="/expungement-ai/hero-')
    .replaceAll(", hero-", ", /expungement-ai/hero-")
    .replaceAll('src="shot-', 'src="/expungement-ai/shot-')
    .replaceAll('srcset="shot-', 'srcset="/expungement-ai/shot-')
    .replaceAll('src="wilma-avatar', 'src="/expungement-ai/wilma-avatar')
    .replaceAll('srcset="wilma-avatar', 'srcset="/expungement-ai/wilma-avatar')
    .replaceAll('src="evidence-', 'src="/expungement-ai/evidence-')
    .replaceAll('srcset="evidence-', 'srcset="/expungement-ai/evidence-')
    .replaceAll('src="testimonial-', 'src="/expungement-ai/testimonial-')
    .replaceAll('srcset="testimonial-', 'srcset="/expungement-ai/testimonial-')
    .replaceAll(
      '<a href="#" class="navlogin" data-i18n="nav_login">',
      '<a href="/expungement-ai/sign-in?mode=signin" class="navlogin" data-i18n="nav_login">'
    )
    .replaceAll(
      '<a href="#" data-i18n="nav_login">',
      '<a href="/expungement-ai/sign-in?mode=signin" data-i18n="nav_login">'
    )
    .replaceAll(
      '<a href="#" class="btn btn-primary" data-i18n-html="elig_cta">',
      '<a href="/expungement-ai/start" class="btn btn-primary" data-i18n-html="elig_cta">'
    )
    .replaceAll(
      '<a href="#" class="btn btn-primary" data-i18n-html="brief_cta">',
      '<a href="/expungement-ai/start" class="btn btn-primary" data-i18n-html="brief_cta">'
    )
    .replaceAll(
      '<a href="#" class="btn btn-primary" data-i18n-html="sm_cta">',
      '<a href="#sample" data-sample-packet-trigger="true" class="btn btn-primary" data-i18n-html="sm_cta">'
    )
    .replaceAll('href="#elig"', 'href="/expungement-ai/start"')
    .replaceAll('href="#how-it-works"', 'href="/expungement-ai#how-it-works"')
    .replaceAll('href="#brief"', 'href="/expungement-ai#brief"')
    .replaceAll('href="#pricing"', 'href="/expungement-ai#pricing"')
    .replaceAll('href="#privacy"', 'href="/expungement-ai#privacy"')
    .replaceAll('href="#faq"', 'href="/expungement-ai#faq"')
    .replaceAll('href="#sample"', 'href="/expungement-ai#sample"')
    .replaceAll('href="#trust"', 'href="/expungement-ai#trust"')
    .replaceAll('href="#top"', 'href="/expungement-ai"');
}

export function extractLandingDictionaries(source: string, renderedHtml = buildExpungementLandingHtml(source)) {
  const en = extractEnglishDictionary(renderedHtml);
  const es = readDictionary(source, "ES");
  applyEnglishWorkflowOverrides(en);
  applySpanishSafetyOverrides(es);
  return { en, es };
}

function readDictionary(source: string, name: "EN" | "ES") {
  const nextName = name === "ES" ? "EN" : "";
  const pattern = nextName
    ? new RegExp(`var ${name} = (\\{[\\s\\S]*?\\});\\s*var ${nextName} =`)
    : new RegExp(`var ${name} = (\\{[\\s\\S]*?\\});`);
  const match = source.match(pattern);
  if (!match) return {};
  try {
    return JSON.parse(match[1]) as Record<string, string>;
  } catch {
    return {};
  }
}

function extractEnglishDictionary(renderedHtml: string) {
  const english: Record<string, string> = {};
  const elementPattern = /<([a-z0-9-]+)\b([^>]*\bdata-i18n(?:-html)?="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of renderedHtml.matchAll(elementPattern)) {
    const attrs = match[2] ?? "";
    const key = match[3] ?? "";
    const body = match[4] ?? "";
    if (Object.prototype.hasOwnProperty.call(english, key)) continue;
    english[key] = attrs.includes("data-i18n-html")
      ? body.trim()
      : htmlToText(body);
  }
  return english;
}

function applyEnglishWorkflowOverrides(en: Record<string, string>) {
  Object.assign(en, {
    hero_eyebrow: "PRIVATE RECORD-CLEARING CHECK",
    hero_h1: "Find out if your record can be cleared. Then get the paperwork to file it yourself for <span class=\"price\">$50</span>.",
    hero_sub: "Answer a few plain-English questions. Expungement.ai checks whether your case may qualify, prepares your state-specific self-help court documents, and gives you step-by-step filing instructions. Free to start. No payment unless your packet is ready.",
    nav_pricing: "Price",
    nav_faq: "Questions",
    nav_cta: "Check my record free &#8594;",
    m_cta: "Check my record free &#8594;",
    hero_cta1: "Check my record free <span class=\"arr\">&#8594;</span>",
    hero_cta2: "See a sample packet",
    hero_micro: "About 3 minutes &nbsp;&middot;&nbsp; No account required &nbsp;&middot;&nbsp; No payment to start &nbsp;&middot;&nbsp; Private &nbsp;&middot;&nbsp; All 50 states + DC",
    hero_disclaimer: "Self-help document preparation. Not a law firm. No guaranteed court outcome.",
    strip_h0: "Free eligibility check",
    strip_p0: "See whether your case may qualify before you spend anything.",
    strip_h1: "Start privately",
    strip_p1: "No account required to begin.",
    strip_h2: "Filing steps for your court",
    strip_p2: "Know what to file, where to file, and what fees or waivers may apply.",
    strip_h3: "$50 when your packet is ready",
    strip_p3: "No subscription. Court filing fees, if any, are separate.",
    elig_cta: "Check my record free <span class=\"arr\">&#8594;</span>"
  });
}

function applySpanishSafetyOverrides(es: Record<string, string>) {
  Object.assign(es, {
    nav_cta: "Revisar mi antecedente gratis &#8594;",
    m_cta: "Revisar mi antecedente gratis &#8594;",
    hero_eyebrow: "REVISION PRIVADA DE LIMPIEZA DE ANTECEDENTES",
    hero_h1: "Vea si su antecedente puede limpiarse, luego obtenga los documentos para presentarlos usted mismo por <span class=\"price\">$50</span>.",
    hero_sub: "Responda unas preguntas sencillas en lenguaje claro. Expungement.ai revisa si su caso puede calificar, prepara documentos judiciales de autoayuda específicos para su estado y le da instrucciones paso a paso para presentar. Gratis para empezar. No paga a menos que su paquete esté listo.",
    hero_cta1: "Revisar mi antecedente gratis <span class=\"arr\">&#8594;</span>",
    hero_cta2: "Ver un paquete de ejemplo",
    hero_micro: "Unos 3 minutos &nbsp;&middot;&nbsp; Sin cuenta &nbsp;&middot;&nbsp; Sin pago para empezar &nbsp;&middot;&nbsp; Privado &nbsp;&middot;&nbsp; Los 50 estados + DC",
    hero_disclaimer: "Preparacion de documentos de autoayuda. No somos un bufete de abogados. Sin resultado garantizado del tribunal.",
    strip_h0: "Revision de elegibilidad gratis",
    strip_p0: "Vea si su caso puede calificar antes de gastar dinero.",
    strip_h1: "Empiece en privado",
    strip_p1: "No necesita cuenta para empezar.",
    strip_h2: "Pasos de presentacion para su tribunal",
    strip_p2: "Sepa que presentar, donde presentarlo y que tasas o exenciones pueden aplicar.",
    strip_h3: "$50 cuando su paquete este listo",
    strip_p3: "Sin suscripcion. Las tasas de presentacion del tribunal, si las hay, son aparte.",
    prob_lead: "Arrestos antiguos, cargos desestimados, delitos menores y algunas condenas pueden crear obstáculos al solicitar trabajo, vivienda, estudios, licencias o un nuevo comienzo. Expungement.ai le ayuda a ver si puede haber una vía legal, y luego le ayuda a dar el siguiente paso.",
    fade3: "¿Puede haber una ruta?",
    how_h0: "Revise si puede haber una ruta",
    how_p0: "Responda preguntas sencillas sobre su caso, estado y resultado. Le mostramos si puede haber una ruta antes de que pague.",
    how_cta: "Revisar mi antecedente gratis <span class=\"arr\">&#8594;</span>",
    pc_p0: "Su solicitud de limpieza de antecedentes",
    prx2: "La decisión final la toma el tribunal o la agencia",
    pr_cta: "Revisar mi antecedente gratis <span class=\"arr\">&#8594;</span>",
    pv4: "Opciones de descarga y exportación en su cuenta",
    ev_note: "Estos estudios muestran por qué importa la limpieza de antecedentes. No prometen ningún resultado legal, laboral, de vivienda o financiero individual.",
    fq_a0: "Sí. Con frecuencia las personas pueden presentar ellas mismas papeleo de limpieza de antecedentes. Expungement.ai es un producto de preparación de documentos de autoayuda: revisamos sus respuestas, preparamos el papeleo y le guiamos con la presentación. No somos un bufete de abogados y no le representamos.",
    fq_a4: "Nadie puede prometer un resultado del tribunal. Nuestra meta es ayudarle a evitar presentar algo que claramente no aplica y a que su paquete esté completo, organizado y listo para revisar antes de presentar.",
    fn_p: "Revise si puede haber una ruta en unos 3 minutos. Es gratis revisar, privado para empezar, y solo paga si hay una posible ruta de paquete.",
    fn_cta: "Revisar mi antecedente gratis <span class=\"arr\">&#8594;</span>",
    ft_blurb: "Expungement.ai ayuda a las personas a preparar documentos de autoayuda para limpieza de antecedentes y guía de presentación.",
    ft_check: "Revisar mi ruta",
    _title: "Expungement.ai — Paquete de autoayuda por $50, sin contratar un abogado",
    _desc: "Revise si puede haber una ruta, reciba su paquete de autoayuda y preséntelo usted mismo con guía paso a paso. Gratis para revisar. $50 por caso.",
    ev_head: "Limpiar un antecedente puede cambiar lo que viene después.",
    ts_h2: "Personas que prepararon una solicitud de limpieza de antecedentes con Expungement.ai.",
    ts_note: "Los testimonios reflejan experiencias individuales y no prometen ningún resultado legal, laboral, de vivienda o financiero."
  });
}

function htmlToText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&#8594;/g, "→")
    .replace(/&#10003;/g, "✓")
    .replace(/&copy;/g, "©")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
