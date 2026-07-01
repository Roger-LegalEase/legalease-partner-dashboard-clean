import fs from "node:fs";
import path from "node:path";
import { ExpungementLandingInteractions } from "@/app/expungement-ai/ExpungementLandingInteractions";
import { SamplePacketModal } from "@/app/expungement-ai/sample-packet/SamplePacketModal";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";

const landingPath = path.join(
  process.cwd(),
  "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html"
);
const noScriptRevealFallback = `
  #how-it-works .jstep {
    opacity: 1 !important;
    transform: none !important;
  }

  #how-it-works .jline {
    transform: scaleY(1) !important;
  }
`;

// Live implementation fix (intentionally diverges from the design file).
// The hero "See a sample packet" secondary button (`.h-ghost`) ships as a
// translucent glass button with `backdrop-filter: blur()`. Sitting ~13px to the
// right of the primary CTA, its backdrop blur picked up that button's orange
// drop-shadow (`0 8px 24px rgba(255,59,0,.38)`) and smeared it into a red/orange
// bleed on the secondary button's left edge. This is a faithful reproduction of
// an artifact in the static mockup, not something to preserve.
//
// Render it as a clean dark-glass outline button instead: drop the backdrop blur
// (the smear amplifier) and use an opaque-enough fill so a neighbour's shadow
// can't bleed through. Scoped to `.hero-cta-row` so the design's other `.h-ghost`
// uses (e.g. the privacy section) are untouched. Cosmetic only — behaviour and
// the #sample anchor are unchanged.
const landingDesignFixes = `
  .hero-cta-row a.h-ghost {
    background: rgba(13, 21, 40, 0.6);
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }
  .hero-cta-row a.h-ghost:hover {
    background: rgba(13, 21, 40, 0.74);
    border-color: #fff;
  }
`;

// The Geist webfont is requested from a <head> <link> in the static mockup, but the loader only
// extracts <style> + <body>, so we re-add the stylesheet link here to keep the design's type.
const fontLinks = (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap"
    />
  </>
);

export function ExpungementLandingHandoff() {
  const source = fs.readFileSync(landingPath, "utf8");
  const dictionaries = extractLandingDictionaries(source);
  const styles = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
  const html = body
    // Remove the legacy scripted Wilma widget if present; the live <WilmaBubble mode="public" />
    // replaces it below. (The files-12 mockup ships no such block, so this is a safe no-op there.)
    .replace(/<div id="wilma-static"[\s\S]*?<\/div>\s*(?=<script)/i, "")
    // Strip inline scripts; nav/menu/anchor behaviour is owned by ExpungementLandingInteractions.
    .replace(/<script[\s\S]*?<\/script>/g, "")
    // Rewrite design-relative asset paths to the served /expungement-ai/* public assets.
    .replaceAll('src="hero-', 'src="/expungement-ai/hero-')
    .replaceAll('srcset="hero-', 'srcset="/expungement-ai/hero-')
    .replaceAll(", hero-", ", /expungement-ai/hero-")
    .replaceAll('src="shot-', 'src="/expungement-ai/shot-')
    .replaceAll('srcset="shot-', 'srcset="/expungement-ai/shot-')
    .replaceAll('src="wilma-avatar', 'src="/expungement-ai/wilma-avatar')
    .replaceAll('srcset="wilma-avatar', 'srcset="/expungement-ai/wilma-avatar')
    // files-20 adds the "cost of a record" evidence imagery and the testimonials section.
    .replaceAll('src="evidence-', 'src="/expungement-ai/evidence-')
    .replaceAll('srcset="evidence-', 'srcset="/expungement-ai/evidence-')
    .replaceAll('src="testimonial-', 'src="/expungement-ai/testimonial-')
    .replaceAll('srcset="testimonial-', 'srcset="/expungement-ai/testimonial-')
    // files-20 is a raw design: it ships several primary CTAs and the nav "Log in" as
    // placeholder href="#" stubs (files-12 wired these to real destinations). Re-map them to
    // the live targets so nothing ships as a dead link — same destinations as the prior build:
    //   nav "Log in"         -> /expungement-ai/sign-in
    //   "Start the free check" / "Preview the Briefcase" -> the screening funnel
    //   "View sample packet"  -> the isolated demo modal (carries [data-sample-packet-trigger])
    .replaceAll(
      '<a href="#" class="navlogin" data-i18n="nav_login">',
      '<a href="/expungement-ai/sign-in" class="navlogin" data-i18n="nav_login">'
    )
    .replaceAll(
      '<a href="#" data-i18n="nav_login">',
      '<a href="/expungement-ai/sign-in" data-i18n="nav_login">'
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
    // Primary funnel CTAs (the design's #elig anchors) enter the live screening flow.
    .replaceAll('href="#elig"', 'href="/expungement-ai/start"')
    // In-page section anchors become /expungement-ai#... so the smooth-scroll handler catches them.
    .replaceAll('href="#how-it-works"', 'href="/expungement-ai#how-it-works"')
    .replaceAll('href="#brief"', 'href="/expungement-ai#brief"')
    .replaceAll('href="#pricing"', 'href="/expungement-ai#pricing"')
    .replaceAll('href="#privacy"', 'href="/expungement-ai#privacy"')
    .replaceAll('href="#faq"', 'href="/expungement-ai#faq"')
    .replaceAll('href="#sample"', 'href="/expungement-ai#sample"')
    .replaceAll('href="#trust"', 'href="/expungement-ai#trust"')
    .replaceAll('href="#top"', 'href="/expungement-ai"');

  return (
    <>
      {fontLinks}
      <style dangerouslySetInnerHTML={{ __html: `${styles}\n${noScriptRevealFallback}\n${landingDesignFixes}` }} />
      <div
        data-handoff-source="design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ExpungementLandingInteractions dictionaries={dictionaries} />
      {/* DEMO-ONLY format preview. Opened by the [data-sample-packet-trigger] button in the
          "Sample packet" section. Fully isolated: no fetch, no packet pipeline, no payment. */}
      <SamplePacketModal />
      <WilmaBubble context="landing" mode="public" />
    </>
  );
}

function extractLandingDictionaries(source: string) {
  const en = readDictionary(source, "EN");
  const es = readDictionary(source, "ES");
  applyEnglishWorkflowOverrides(en);
  applySpanishSafetyOverrides(es);
  return {
    en,
    es
  };
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

function applyEnglishWorkflowOverrides(en: Record<string, string>) {
  Object.assign(en, {
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
