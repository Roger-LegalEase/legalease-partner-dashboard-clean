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
    hero_h1: "Prepare a self-help packet for <span class=\"price\">$50</span>, not <span class=\"strike\">$2,500</span>, without hiring a lawyer.",
    nav_pricing: "Price",
    nav_faq: "Questions",
    nav_cta: "Start my free check &#8594;",
    m_cta: "Start my free check &#8594;",
    hero_cta1: "Start my free check <span class=\"arr\">&#8594;</span>",
    elig_cta: "Start free check <span class=\"arr\">&#8594;</span>"
  });
}

function applySpanishSafetyOverrides(es: Record<string, string>) {
  Object.assign(es, {
    nav_cta: "Revisar mi ruta &#8594;",
    m_cta: "Revisar gratis &#8594;",
    hero_h1: "Prepare un paquete de autoayuda por <span class=\"price\">$50</span>, no <span class=\"strike\">$2,500</span>, sin contratar a un abogado.",
    hero_sub: "Responda unas preguntas sencillas. Revisamos si puede haber una ruta para su antecedente, preparamos documentos de autoayuda y le mostramos cómo presentarlos usted mismo. Gratis hasta que su paquete esté listo.",
    hero_cta1: "Revisar mi ruta gratis <span class=\"arr\">&#8594;</span>",
    strip_p0: "Vea si puede haber una ruta antes de pagar.",
    prob_lead: "Arrestos antiguos, cargos desestimados, delitos menores y algunas condenas pueden crear obstáculos al solicitar trabajo, vivienda, estudios, licencias o un nuevo comienzo. Expungement.ai le ayuda a ver si puede haber una vía legal, y luego le ayuda a dar el siguiente paso.",
    fade3: "¿Puede haber una ruta?",
    how_h0: "Revise si puede haber una ruta",
    how_p0: "Responda preguntas sencillas sobre su caso, estado y resultado. Le mostramos si puede haber una ruta antes de que pague.",
    how_cta: "Revisar mi ruta gratis <span class=\"arr\">&#8594;</span>",
    pc_p0: "Su solicitud de limpieza de antecedentes",
    prx2: "La decisión final la toma el tribunal o la agencia",
    pr_cta: "Revisar mi ruta gratis <span class=\"arr\">&#8594;</span>",
    pv4: "Opciones de descarga y exportación en su cuenta",
    ev_note: "Estos estudios muestran por qué importa la limpieza de antecedentes. No prometen ningún resultado legal, laboral, de vivienda o financiero individual.",
    fq_a0: "Sí. Con frecuencia las personas pueden presentar ellas mismas papeleo de limpieza de antecedentes. Expungement.ai es un producto de preparación de documentos de autoayuda: revisamos sus respuestas, preparamos el papeleo y le guiamos con la presentación. No somos un bufete de abogados y no le representamos.",
    fq_a4: "Nadie puede prometer un resultado del tribunal. Nuestra meta es ayudarle a evitar presentar algo que claramente no aplica y a que su paquete esté completo, organizado y listo para revisar antes de presentar.",
    fn_p: "Revise si puede haber una ruta en unos 3 minutos. Es gratis revisar, privado para empezar, y solo paga si hay una posible ruta de paquete.",
    fn_cta: "Revisar mi ruta gratis <span class=\"arr\">&#8594;</span>",
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
