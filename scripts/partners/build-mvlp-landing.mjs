#!/usr/bin/env node
// Derives public/mvlp-landing.html from the shipped We Must Vote co-branded
// template (public/wemustvote-landing.html) with an MVLP partner configuration.
//
// The We Must Vote page is the design system: header composition, hero, stats
// band, cards, promise, quote, comparison, how-it-works, dashboard preview,
// checklist, FAQ, final call to action and footer are preserved byte-for-byte
// except where a substitution below names them. Every substitution must match
// the template exactly once, so a template change that moves an anchor fails
// this build instead of silently producing a broken page.
//
//   node scripts/partners/build-mvlp-landing.mjs          # write the page
//   node scripts/partners/build-mvlp-landing.mjs --check  # verify it is current
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const templatePath = path.join(root, "public/wemustvote-landing.html");
const outputPath = path.join(root, "public/mvlp-landing.html");
const check = process.argv.includes("--check");

// Supplied MVLP identity. The purple is measured from the supplied wordmark
// (solid pixels #6D378F); the darker surfaces and the lavender highlight are
// implementation choices derived from it, not claimed official colors.
export const MVLP_PARTNER = Object.freeze({
  slug: "mvlp",
  shortName: "MVLP",
  fullName: "Mississippi Volunteer Lawyers Project",
  programName: "Self-Representation Expungement Clinics",
  purple: "#6D378F",
  purpleDeep: "#3A1E52",
  purpleDeep700: "#54307A",
  lavender: "#D7BFE8",
  footerInk: "#1E1129",
  logoUrl: "/assets/partners/mvlp/mvlp-logo.png",
  heroImg: "/assets/partners/wemustvote/assets/wemustvote/hero-record-clearing-path.png",
  quoteImg: "/assets/partners/wemustvote/assets/wemustvote/friendly_consultation_with_a_roadmap_of_guidance.png",
  registerUrl: "/p/mvlp/clinics",
  continueUrl: "/p/mvlp/continue",
  publicPhone: "601-960-9577",
  publicEmail: "mvlp@mvlp.org",
  canonicalUrl: "https://legaleasepartner.com/p/mvlp"
});

const P = MVLP_PARTNER;

// English copy for every translatable key the template renders. Present tense,
// plain English, finished-product language. No internal vocabulary.
export const MVLP_COPY = Object.freeze({
  poweredBy: "Powered by", navHow: "How it works", navDiff: "What to expect", navFaq: "FAQ",
  ctaStart: "Register for a clinic",
  ctaNav: "Register for a clinic",
  heroTitle: "Get help taking the next step with your record.",
  heroLead: "Register for an MVLP expungement clinic, complete your intake, and work with the MVLP team on your next steps.",
  selectLabel: "Choose your next step",
  ctaContinue: "Continue my application",
  heroMicro: "Free to register. Your application stays private. Registering is not a promise of legal help: MVLP reviews every application.",
  chipGeo: "Mississippi clinics", chipFree: "Free to register", chipKnow: "Save and return anytime",
  phHero: "Illustration", phHeroSub: "",
  phQuote: "Illustration", phQuoteSub: "",
  bandText: "MVLP brings the <strong>volunteer attorneys</strong>. LegalEase brings the <strong>system</strong>.",
  stat1n: "Free", stat1l: "to register", stat2l: "clinics led by MVLP", stat3n: "Minutes", stat3l: "to register",
  ebStart: "Where to begin",
  cardsTitle: "You do not need to have it all figured out.",
  cardsLead: "You can register even if you do not have your paperwork, do not remember every detail, or are not sure what is on your record.",
  card1t: "Old arrest", card1d: "You have an old arrest and want to know whether it may still matter.",
  card2t: "Charged, not convicted", card2d: "You were charged, but the case did not end in a conviction.",
  card3t: "Past conviction", card3d: "You have a conviction and want to understand whether there may be a path forward.",
  card4t: "Not sure what shows up", card4d: "You want to know what an employer, landlord, school, or licensing agency may see.",
  ebPromise: "The MVLP × LegalEase promise",
  promiseTitle: "Getting help with your record should be clear and respectful.",
  p1t: "Free to register", p1d: "Choose a clinic and tell us how to reach you. You do not need every answer before you start.",
  p2t: "Plain-English steps", p2d: "Your application asks simple questions, saves your progress, and shows what is still needed.",
  p3t: "Real people review your application", p3d: "MVLP staff and volunteer attorneys review your application and tell you what comes next.",
  quoteText: "Many people wait because the process feels confusing, expensive, or out of reach. MVLP clinics give Mississippians a trusted place to start, with volunteer attorneys and a clear plan for what happens next.",
  ebDiff: "What to expect",
  diffTitle: "A clear first step instead of guessing.",
  diffLead: "Register once, complete one private application, and let the MVLP team guide the rest.",
  colAloneT: "Trying to figure it out alone", colAlone1: "Confusing court language", colAlone2: "Not sure what appears on your record", colAlone3: "Missing paperwork", colAlone4: "No clear place to start",
  colUs1: "Free clinic registration", colUs2: "One private application, saved as you go", colUs3: "Review by MVLP staff and volunteer attorneys", colUs4: "Documents prepared for a supported Mississippi case", colUs5: "Clear instructions for signing, notarizing, and filing", colUs6: "Follow-up on what is still needed",
  colWaitT: "Waiting or guessing", colWait1: "Opportunities may be delayed", colWait2: "You may not know what others can see", colWait3: "Mistakes can slow things down", colWait4: "It can be hard to know what to do next",
  ebHow: "How it works",
  howTitle: "Register today. Leave your clinic with a clear next step.",
  howLead: "Start with what you know. The application gathers the basics so the MVLP team can review your case before clinic day.",
  s1t: "Register for a clinic", s1d: "Choose a clinic date and tell us how to reach you.",
  s2t: "Complete your application", s2d: "Answer the MVLP intake questions about your case, household, and income. Save and return anytime.",
  s3t: "MVLP review", s3d: "MVLP staff review your application, ask for anything missing, and a volunteer attorney reviews your case.",
  s4t: "Documents and next steps", s4d: "If MVLP can help with your case, you receive documents to review and sign, instructions for a notary where required, and clear next steps for filing.",
  howNote: "Registering does not guarantee MVLP assistance, eligibility, or any court outcome. MVLP decides whether it can help after reviewing your application.",
  ebPreview: "Your private page",
  previewTitle: "Your application, in one place.",
  previewLead: "After you register, your private page shows your application, what is still needed, your documents, and your next step in plain English.",
  bfNav1: "Briefcase", bfNav2: "My application", bfNav3: "Documents",
  bfHelpT: "Need help?", bfHelp: "Ask a clinic volunteer or the MVLP team at any step.",
  bfNew: "Register for a clinic",
  bfGreeting: "Welcome back, Alex", bfStatus: "Your application is in progress. Here is where things stand.",
  bfNextEb: "Your next step", bfNextTitle: "Finish your application", bfNextDesc: "Complete the MVLP intake questions so the team can review your case before clinic day.", bfNextCta: "Continue my application",
  bfStat1l: "Application", bfStat1s: "In progress", bfStat2l: "Items needed", bfStat2s: "Waiting on you", bfStat3l: "Documents", bfStat3s: "Prepared for you", bfStat4l: "Next steps", bfStat4s: "From MVLP",
  bfMatters: "Your application", bfViewAll: "View all",
  bfM1t: "Misdemeanor expungement", bfM1s: "Application submitted", bfM2t: "Clinic registration", bfM2s: "Seat requested",
  bfPillReady: "In MVLP review", bfPillCourt: "Application needed",
  bfS1: "Registered", bfS2: "Application", bfS3: "MVLP review", bfS4: "Documents", bfS5: "Next steps",
  previewCaption: "Sample page. Names and cases shown are examples. MVLP reviews your application; LegalEase keeps everything organized.",
  footColLegal: "Legal", footColTrust: "Trust", footImpact: "Impact reporting",
  footPrivacy: "Privacy", footTerms: "Terms", footDisclaimer: "Disclaimer",
  footSecurity: "Security", footDataReq: "Data request", footAccess: "Accessibility",
  footDisclaimerLine: "LegalEase is not a law firm and does not provide legal advice. MVLP decides whether it can help after reviewing each application. No court outcome is guaranteed.",
  ebNeed: "What you'll need",
  needTitle: "You can start with what you know.",
  needLead: "You do not need every document to register. The application tells you what is still needed, and the MVLP team can help you find records.",
  needNote: "Missing something? Register anyway and finish later.",
  needPanelT: "Helpful to have nearby",
  need1: "Your full legal name and date of birth", need2: "A phone number or email where MVLP can reach you", need3: "Case information: the county, the charge, and how the case ended, if you know it", need4: "Household and income information", need5: "Any court paperwork you already have",
  needPanelNote: "No paperwork? No problem. Register with what you know.",
  ebFaq: "Questions before you start",
  faqTitle: "Still unsure? That is normal.",
  faqLead: "Record clearing can be confusing. Registering gives you a simple, private first step, and the MVLP team explains the rest.",
  q1: "Who is this for?", q2: "Is it free?", q3: "Do I need court papers to register?", q4: "Will an attorney help me?", q5: "Will registering clear my record?", q6: "What if MVLP cannot take my case?", q7: "Is LegalEase a law firm?",
  a1: "People with a Mississippi arrest, charge, or conviction who want help with an expungement through an MVLP clinic.",
  a2: "Registration and the application are free. MVLP tells you about any court, record, or notary costs that apply to your case.",
  a3: "No. Court papers help, but you can register and start your application with what you know.",
  a4: "At the clinic, volunteer attorneys give legal advice, review your documents, and explain how to file. You file your own case; the clinic does not include courtroom representation.",
  a5: "No. Registering saves your place and starts your application. MVLP reviews every application and decides whether it can help. A court makes the final decision on your record.",
  a6: "MVLP tells you why and points you to other options where it can. A decision about MVLP's program is not a decision about whether your record can be cleared.",
  a7: "No. LegalEase provides the software MVLP uses to organize registrations, applications, documents, and follow-up. LegalEase does not provide legal advice.",
  ebReady: "Start here",
  finalTitle: "Ready to take the next step?",
  finalP: "Register for an MVLP clinic and start your application today.",
  finalMicro: "Registration does not guarantee assistance, eligibility, or any court outcome.",
  footLegal: "Legal boundaries",
  footContact: `Questions? Call MVLP at ${P.publicPhone} or email ${P.publicEmail}.`
});

function js(value) {
  return JSON.stringify(value);
}

function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`Template anchor ${label} matched ${count} times (expected 1).`);
  }
  return source.replace(from, () => to);
}

export function buildMvlpLanding(template) {
  let html = template;

  // ---- document identity -------------------------------------------------
  html = replaceOnce(html,
    "<title>We Must Vote Record Clearing Access Program | Powered by LegalEase</title>",
    `<title>${P.shortName} ${P.programName} | Powered by LegalEase</title>`, "title");
  html = replaceOnce(html,
    '<meta name="description" content="We Must Vote and LegalEase are partnering to help justice-impacted Mississippians understand possible record-clearing options and take a clear first step." />',
    `<meta name="description" content="Register for a ${P.fullName} expungement clinic, complete your application, and work with the MVLP team on your next steps." />`, "description");
  html = replaceOnce(html, '<meta name="theme-color" content="#0F1F5C" />', `<meta name="theme-color" content="${P.purple}" />`, "theme-color");
  html = replaceOnce(html,
    '<meta property="og:title" content="We Must Vote Record Clearing Access Program | Powered by LegalEase" />',
    `<meta property="og:title" content="${P.shortName} ${P.programName} | Powered by LegalEase" />`, "og:title");
  html = replaceOnce(html,
    '<meta property="og:description" content="A free guided record-clearing screening, built with We Must Vote and LegalEase." />',
    `<meta property="og:description" content="Free clinic registration and a private application, built with ${P.fullName} and LegalEase." />`, "og:description");
  // No MVLP social image exists; the RCAP image is not MVLP's, so the tags are dropped.
  html = replaceOnce(html, '<meta property="og:image" content="https://legaleasepartner.com/og-rcap.png" />\n', "", "og:image");
  html = replaceOnce(html, '<meta name="twitter:image" content="https://legaleasepartner.com/og-rcap.png" />\n', "", "twitter:image");
  html = html.split("https://legaleasepartner.com/p/we-must-vote").join(P.canonicalUrl);

  // ---- scoped theme --------------------------------------------------------
  // Appended after the template's own variables so every dark surface, accent
  // and highlight follows the MVLP purple without editing the shared rules.
  html = replaceOnce(html, "  [hidden]{display:none!important}\n</style>",
    `  [hidden]{display:none!important}

  /* ---------- MVLP partner theme (scoped to this page) ---------- */
  :root{
    --navy:${P.purpleDeep};
    --navy-700:${P.purpleDeep700};
    --navy-300:#6B5F78;
    --accent:${P.purple};
    --accent-ink:#FFFFFF;
    --orange:${P.purple};
    --teal:${P.purple};
    --teal-2:${P.lavender};
    --good:#5E2E7E;
    --shadow:0 18px 44px -22px rgba(58,30,82,.34);
    --shadow-sm:0 10px 30px rgba(58,30,82,.06);
  }
  footer.site{background:${P.footerInk}}
  .cobrand .plogo{height:56px}
  @media (max-width:600px){.cobrand .plogo{height:38px}}
  .selector .btn-ghost{width:100%;justify-content:center;margin-top:10px}
  .lang{display:none}
  .bf-wilma{display:none}
  .foot-contact{color:rgba(255,255,255,.7);font-size:.84rem;margin-top:10px}
</style>`, "theme");

  // ---- header ----------------------------------------------------------------
  html = replaceOnce(html, '<span class="pname" id="brand-partner-name">We Must Vote</span>',
    `<span class="pname" id="brand-partner-name">${P.shortName}</span>`, "header name");
  html = replaceOnce(html, '<a href="#difference" data-i18n="navDiff">The difference</a>',
    '<a href="#difference" data-i18n="navDiff">What to expect</a>', "nav diff");

  // ---- hero: the county selector becomes the clinic next-step panel --------
  html = replaceOnce(html, '<span class="eyebrow" id="brand-eyebrow">WE MUST VOTE &times; LEGALEASE</span>',
    `<span class="eyebrow" id="brand-eyebrow">${P.shortName.toUpperCase()} &times; LEGALEASE</span>`, "hero eyebrow");
  html = replaceOnce(html,
    `      <div class="selector">
        <label for="county" data-i18n="selectLabel">Where did the arrest or charge happen?</label>
        <select id="county" aria-label="County"></select>
        <a class="btn btn-primary" id="cta-hero" href="#" data-i18n="ctaStart">Start free screening</a>
      </div>`,
    `      <div class="selector" aria-labelledby="next-step-label">
        <span class="eyebrow" id="next-step-label" data-i18n="selectLabel" style="display:block;margin-bottom:12px">Choose your next step</span>
        <a class="btn btn-primary" id="cta-hero" href="${P.registerUrl}" data-i18n="ctaStart">Register for a clinic</a>
        <a class="btn btn-ghost" id="continue-hero" href="${P.continueUrl}" data-i18n="ctaContinue">Continue my application</a>
      </div>`, "hero selector");
  html = replaceOnce(html,
    '<div class="stat"><div class="n" id="stat-geo-n">82</div><div class="l" data-i18n="stat2l">counties covered</div></div>',
    `<div class="stat"><div class="n" id="stat-geo-n">${P.shortName}</div><div class="l" data-i18n="stat2l">clinics led by MVLP</div></div>`, "stat2");

  // ---- quote / comparison / final / footer brand lines ----------------------
  html = replaceOnce(html, '<span class="eyebrow" id="brand-quote-eb">WMV &times; LE</span>',
    `<span class="eyebrow" id="brand-quote-eb">${P.shortName} &times; LE</span>`, "quote eyebrow");
  html = replaceOnce(html, '<p id="brand-final-p">Start your free guided screening through We Must Vote and LegalEase.</p>',
    `<p id="brand-final-p" data-i18n="finalP">${MVLP_COPY.finalP}</p>`, "final paragraph");
  html = replaceOnce(html,
    '<span class="micro" id="brand-footer" style="color:rgba(255,255,255,.55);font-size:.8rem">We Must Vote &times; LegalEase &middot; Record Clearing Access Program</span>',
    `<span class="micro" id="brand-footer" style="color:rgba(255,255,255,.55);font-size:.8rem">${P.fullName} &times; LegalEase &middot; ${P.programName}</span>
        <span class="foot-contact" data-i18n="footContact">${MVLP_COPY.footContact}</span>`, "footer brand");

  // ---- the FAQ answer the template computes in script becomes static copy --
  html = replaceOnce(html, '<p id="faq-a1">People in Mississippi who have an arrest, charge, conviction, dismissal, or old record and want to understand possible record-clearing options.</p>',
    `<p id="faq-a1" data-i18n="a1">${MVLP_COPY.a1}</p>`, "faq a1");

  // ---- PARTNER object ----------------------------------------------------------
  const partnerStart = html.indexOf("const PARTNER = {");
  const partnerEnd = html.indexOf("\n};", partnerStart);
  if (partnerStart < 0 || partnerEnd < 0) throw new Error("PARTNER object not found");
  const partnerObject = `const PARTNER = {
  name: ${js(P.shortName)},
  fullName: ${js(P.fullName)},
  programName: ${js(P.programName)},
  logoUrl: ${js(P.logoUrl)},
  partnerLogoFooter: ${js(P.logoUrl)},
  accent: ${js(P.purple)},
  accentInk: "#FFFFFF",
  state: "Mississippi",
  stateEs: "Misisipi",
  countyCount: ${js(P.shortName)},
  heroImg: ${js(P.heroImg)},
  quoteImg: ${js(P.quoteImg)},
  quoteAlt: "Illustration of a checklist and a friendly conversation",
  heroAlt: "Illustration of a person holding a checklist and looking down a path marked with Mississippi",
  leWhiteLogo: "",
  intakeUrl: ${js(P.registerUrl)},
  continueUrl: ${js(P.continueUrl)},
  counties: []
};`;
  html = html.slice(0, partnerStart) + partnerObject + html.slice(partnerEnd + 3);

  // The template keeps the white LegalEase wordmark inside PARTNER; carry it over
  // from the We Must Vote object so the dark footer still shows LegalEase.
  const leWhite = /leWhiteLogo: "(data:image\/png;base64,[^"]+)"/.exec(template)?.[1];
  if (!leWhite) throw new Error("template leWhiteLogo not found");
  html = replaceOnce(html, 'leWhiteLogo: "",', `leWhiteLogo: ${js(leWhite)},`, "leWhiteLogo");

  // ---- copy: replace the English block, drop the Spanish block ----------------
  const i18nStart = html.indexOf("const I18N = {");
  const i18nEnd = html.indexOf("\n};", i18nStart);
  if (i18nStart < 0 || i18nEnd < 0) throw new Error("I18N object not found");
  const copyLines = Object.entries(MVLP_COPY).map(([key, value]) => `    ${key}: ${js(value)}`).join(",\n");
  html = html.slice(0, i18nStart) + `const I18N = {\n  en: {\n${copyLines}\n  }\n};` + html.slice(i18nEnd + 3);

  // ---- script: no county selector, interpolations use the full name ----------
  html = replaceOnce(html,
    `  // County dropdown
  const sel = document.getElementById('county');
  sel.innerHTML = '';
  const ph = document.createElement('option');
  ph.value=''; ph.disabled=true; ph.selected=true;
  sel.appendChild(ph);
  PARTNER.counties.forEach(c=>{
    const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o);
  });
`, "", "county dropdown");
  html = replaceOnce(html,
    `function bindCTAs(){
  const sel = document.getElementById('county');
  document.querySelectorAll('[id^="cta-"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const base = PARTNER.intakeUrl;
      const c = sel && sel.value ? ('?county='+encodeURIComponent(sel.value)) : '';
      a.setAttribute('href', base + c);
    });
  });
}`,
    `function bindCTAs(){
  document.querySelectorAll('[id^="cta-"]').forEach(a=>{ a.setAttribute('href', PARTNER.intakeUrl); });
  document.querySelectorAll('[id^="continue-"]').forEach(a=>{ a.setAttribute('href', PARTNER.continueUrl); });
}`, "bindCTAs");
  html = replaceOnce(html,
    "  document.getElementById('brand-quote-cite').textContent =\n    `${PARTNER.name} ${x} LegalEase \\u00b7 ` + (lang==='es'?'Programa de Acceso a la Eliminaci\\u00f3n de Antecedentes':'Record Clearing Access Program');",
    "  document.getElementById('brand-quote-cite').textContent = `${PARTNER.fullName} ${x} LegalEase \\u00b7 ${PARTNER.programName}`;", "quote cite");
  html = replaceOnce(html,
    "  document.getElementById('faq-a1').textContent = lang==='es'\n    ? `Esto es para residentes de ${PARTNER.stateEs} que quieren entender si un arresto, cargo o condena puede tener una opci\\u00f3n para eliminar antecedentes.`\n    : `This is for ${PARTNER.state} residents who want to understand whether an arrest, charge, or conviction may have a record-clearing option.`;\n",
    "", "faq a1 script");
  html = replaceOnce(html,
    "  document.getElementById('brand-final-p').textContent = lang==='es'\n    ? `Comience su evaluaci\\u00f3n guiada gratuita a trav\\u00e9s de ${PARTNER.name} y LegalEase.`\n    : `Start your free guided screening through ${PARTNER.name} and LegalEase.`;\n",
    "", "final paragraph script");
  html = replaceOnce(html,
    "  document.getElementById('brand-footer').innerHTML = `${PARTNER.name} ${x} LegalEase \\u00b7 ` + (lang==='es'?'Programa de Acceso a la Eliminaci\\u00f3n de Antecedentes':'Record Clearing Access Program');",
    "  document.getElementById('brand-footer').innerHTML = `${PARTNER.fullName} ${x} LegalEase \\u00b7 ${PARTNER.programName}`;", "footer script");
  // English only: the language switch is hidden by the theme and the saved
  // preference is ignored, so a visitor who chose Spanish on another partner
  // page never sees untranslated keys here.
  html = replaceOnce(html,
    "let saved='en';\ntry{ saved = localStorage.getItem('le_partner_lang') || 'en'; }catch(e){}\nsetLang(saved);",
    "setLang('en');", "language bootstrap");
  html = replaceOnce(html, "  try{ localStorage.setItem('le_partner_lang', lang); }catch(e){}\n", "", "language persistence");

  // ---- static defaults: every data-i18n element carries the MVLP copy in the
  // source too, so the page reads correctly before the script runs and no
  // We Must Vote or Wilma wording survives in the markup.
  for (const [key, value] of Object.entries(MVLP_COPY)) {
    const pattern = new RegExp(`(data-i18n="${key}"[^>]*>)([^<]*)(<)`, "g");
    html = html.replace(pattern, (_match, open, _old, close) => `${open}${value}${close}`);
  }
  html = replaceOnce(html, '<h3 id="brand-feature-t">We Must Vote &times; LegalEase</h3>',
    `<h3 id="brand-feature-t">${P.shortName} &times; LegalEase</h3>`, "feature column title");
  html = replaceOnce(html, '<cite id="brand-quote-cite">We Must Vote &times; LegalEase · Record Clearing Access Program</cite>',
    `<cite id="brand-quote-cite">${P.fullName} &times; LegalEase · ${P.programName}</cite>`, "quote cite");
  html = replaceOnce(html, "<button>Ask Wilma</button>", "<button>Get help</button>", "help button");
  html = html.replace(/<div class="bf-wilma">.*?<\/div>\n/s, "");
  if (html.includes('class="bf-wilma"')) throw new Error("dashboard preview assistant chip was not removed");

  // ---- guards: nothing We Must Vote-specific may survive --------------------------
  for (const forbidden of ["We Must Vote", "WE MUST VOTE", "WMV", "wemustvote-landing", "/intake/we-must-vote", "Wilma", "Grade A", "tenant", "release candidate"]) {
    if (html.includes(forbidden)) throw new Error(`Generated MVLP page still contains "${forbidden}".`);
  }
  return html;
}

const template = fs.readFileSync(templatePath, "utf8");
const generated = buildMvlpLanding(template);
if (check) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== generated) {
    console.error("public/mvlp-landing.html is stale; run node scripts/partners/build-mvlp-landing.mjs");
    process.exit(1);
  }
  console.log("public/mvlp-landing.html is current");
} else {
  fs.writeFileSync(outputPath, generated);
  console.log(`wrote ${path.relative(root, outputPath)} (${generated.length} bytes)`);
}
