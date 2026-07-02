import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.NODE_ENV = "test";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const landingPath = path.join(root, "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html");
const source = fs.readFileSync(landingPath, "utf8");

const {
  buildExpungementLandingHtml,
  extractLandingDictionaries
} = await import("../src/app/expungement-ai/landing-handoff-utils.ts");
const {
  applyExpungementLocale,
  EXPUNGEMENT_LOCALE_STORAGE_KEY,
  readSavedExpungementLocale
} = await import("../src/app/expungement-ai/landing-locale-controller.ts");

const renderedHtml = buildExpungementLandingHtml(source);
const dictionaries = extractLandingDictionaries(source, renderedHtml);
const failures = [];

function assert(condition, message, dom) {
  if (condition) return;
  failures.push(dom ? `${message}\n${formatDebug(dom)}` : message);
}

class FakeClassList {
  constructor(initial = []) {
    this.values = new Set(initial);
  }
  add(value) {
    this.values.add(value);
  }
  toggle(value, force) {
    if (force) this.values.add(value);
    else this.values.delete(value);
  }
  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor(tagName, attrs = {}, body = "") {
    this.tagName = tagName;
    this.attrs = new Map(Object.entries(attrs));
    this.classList = new FakeClassList((attrs.class ?? "").split(/\s+/).filter(Boolean));
    this.dataset = {};
    this._innerHTML = body;
    this.textContent = htmlToText(body);
  }
  hasAttribute(name) {
    return this.attrs.has(name);
  }
  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }
  setAttribute(name, value) {
    const nextValue = String(value);
    this.attrs.set(name, nextValue);
    if (name === "class") this.classList = new FakeClassList(nextValue.split(/\s+/).filter(Boolean));
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.textContent = htmlToText(String(value));
  }
  get innerHTML() {
    return this._innerHTML;
  }
}

function parseAttrs(rawAttrs) {
  const attrs = {};
  for (const match of rawAttrs.matchAll(/([a-zA-Z0-9:_-]+)(?:="([^"]*)")?/g)) {
    attrs[match[1]] = match[2] ?? "";
  }
  return attrs;
}

function parseLandingNodes(html) {
  const nodes = [];
  const elementPattern = /<(?<tag>[a-z0-9-]+)\b(?<attrs>[^>]*(?:data-i18n(?:-html)?|data-lang)[^>]*)>(?<body>[\s\S]*?)<\/\k<tag>>/gi;
  for (const match of html.matchAll(elementPattern)) {
    const groups = match.groups;
    if (!groups) continue;
    nodes.push(new FakeElement(groups.tag, parseAttrs(groups.attrs), groups.body));
  }
  return nodes;
}

function makeDom(initialStorage = {}, options = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const nodes = parseLandingNodes(renderedHtml);
  const documentElement = new FakeElement("html", { lang: options.htmlLang ?? "en" }, "");
  documentElement.dataset.locale = options.datasetLocale;
  const document = {
    documentElement,
    querySelectorAll(selector) {
      if (selector === "[data-i18n]") return nodes.filter((node) => node.hasAttribute("data-i18n"));
      if (selector === "[data-i18n-html]") return nodes.filter((node) => node.hasAttribute("data-i18n-html"));
      if (selector === "[data-lang]") return nodes.filter((node) => node.hasAttribute("data-lang"));
      return [];
    },
    querySelector(selector) {
      if (selector === '[data-lang="en"]') return nodes.find((node) => node.getAttribute("data-lang") === "en") ?? null;
      if (selector === '[data-lang="es"]') return nodes.find((node) => node.getAttribute("data-lang") === "es") ?? null;
      if (selector === '[data-i18n-html="hero_h1"], [data-i18n="hero_h1"]') {
        return nodeForKey(nodes, "hero_h1") ?? null;
      }
      return null;
    }
  };
  const window = {
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    },
    dispatchEvent(event) {
      window.lastEvent = event;
      return true;
    },
    navigator: { language: options.navigatorLanguage ?? "es-MX", languages: [options.navigatorLanguage ?? "es-MX"] }
  };
  globalThis.document = document;
  globalThis.window = window;
  Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  return { nodes, document, window, storage };
}

function applyInitial(dom) {
  const locale = readSavedExpungementLocale();
  applyExpungementLocale(locale, { dictionaries, persist: false, dispatch: false });
  assertNoProductionScreenshotBug("after initial apply", dom);
  return locale;
}

function clickLocale(locale, dom) {
  applyExpungementLocale(locale, { dictionaries, persist: true, dispatch: true });
  assertNoProductionScreenshotBug(`after click ${locale}`, dom);
}

function assertEnglishState(label, dom) {
  const state = stateSnapshot(dom);
  assert(state.expLang === "en" || state.expLang === null, `${label}: exp_lang should be en or absent on non-persisting initial load.`, dom);
  assert(state.htmlLang?.startsWith("en"), `${label}: html lang must be en.`, dom);
  assert(state.datasetLocale === "en", `${label}: dataset locale must be en.`, dom);
  assert(state.enPressed === "true", `${label}: EN aria-pressed must be true.`, dom);
  assert(state.esPressed === "false", `${label}: ES aria-pressed must be false.`, dom);
  assert(langButton(dom, "en")?.classList.contains("on"), `${label}: EN button must have active visual class.`, dom);
  assert(!langButton(dom, "es")?.classList.contains("on"), `${label}: ES button must not have active visual class.`, dom);
  assert(state.hero.includes("Prepare a self-help packet for $50"), `${label}: English hero headline not visible.`, dom);
  assert(state.navHow === "How it works", `${label}: English nav How it works not visible.`, dom);
  assert(state.navBrief === "What you get", `${label}: English nav What you get not visible.`, dom);
  assert(state.navPricing === "Price", `${label}: English nav Price not visible.`, dom);
  assert(state.navPrivacy === "Trust & privacy", `${label}: English nav privacy not visible.`, dom);
  assert(state.navFaq === "Questions", `${label}: English nav Questions not visible.`, dom);
  assert(state.navLogin === "Log in", `${label}: English sign-in copy not visible.`, dom);
  assert(!spanishLandingTextVisible(dom), `${label}: Spanish hero/nav/CTA text is visible while English is active.`, dom);
}

function assertSpanishState(label, dom) {
  const state = stateSnapshot(dom);
  assert(state.expLang === "es" || state.expLang === null, `${label}: exp_lang should be es or absent on non-persisting initial load.`, dom);
  assert(state.htmlLang?.startsWith("es"), `${label}: html lang must be es.`, dom);
  assert(state.datasetLocale === "es", `${label}: dataset locale must be es.`, dom);
  assert(state.esPressed === "true", `${label}: ES aria-pressed must be true.`, dom);
  assert(state.enPressed === "false", `${label}: EN aria-pressed must be false.`, dom);
  assert(langButton(dom, "es")?.classList.contains("on"), `${label}: ES button must have active visual class.`, dom);
  assert(!langButton(dom, "en")?.classList.contains("on"), `${label}: EN button must not have active visual class.`, dom);
  assert(state.hero.includes("Prepare un paquete de autoayuda por $50"), `${label}: Spanish hero headline not visible.`, dom);
  assert(state.navHow === "Cómo funciona", `${label}: Spanish nav Cómo funciona not visible.`, dom);
  assert(state.navBrief === "Qué recibes", `${label}: Spanish nav Qué recibes not visible.`, dom);
  assert(state.navPricing === "Precio", `${label}: Spanish nav Precio not visible.`, dom);
  assert(state.navPrivacy === "Confianza y privacidad", `${label}: Spanish nav privacy not visible.`, dom);
  assert(state.navFaq === "Preguntas", `${label}: Spanish nav Preguntas not visible.`, dom);
  assert(state.navLogin === "Iniciar sesión", `${label}: Spanish sign-in copy not visible.`, dom);
  assert(!englishLandingTextVisible(dom), `${label}: English hero/nav/CTA text is visible while Spanish is active.`, dom);
}

function assertNoProductionScreenshotBug(label, dom) {
  const state = stateSnapshot(dom);
  if ((state.enPressed === "true" || langButton(dom, "en")?.classList.contains("on")) && spanishLandingTextVisible(dom)) {
    assert(false, `${label}: production bug reproduced, Spanish visible while EN is active.`, dom);
  }
  if ((state.esPressed === "true" || langButton(dom, "es")?.classList.contains("on")) && englishLandingTextVisible(dom)) {
    assert(false, `${label}: mixed language, English visible while ES is active.`, dom);
  }
}

function englishLandingTextVisible(dom) {
  const state = stateSnapshot(dom);
  return [
    "Prepare a self-help packet for $50",
    "How it works",
    "What you get",
    "Trust & privacy",
    "Start free check",
    "Log in"
  ].some((text) => [state.hero, state.navHow, state.navBrief, state.navPrivacy, state.primaryCta, state.navLogin].some((value) => value.includes(text)));
}

function spanishLandingTextVisible(dom) {
  const state = stateSnapshot(dom);
  return [
    "Prepare un paquete de autoayuda por $50",
    "Cómo funciona",
    "Qué recibes",
    "Confianza y privacidad",
    "Revisar mi ruta",
    "Iniciar sesión"
  ].some((text) => [state.hero, state.navHow, state.navBrief, state.navPrivacy, state.primaryCta, state.navLogin].some((value) => value.includes(text)));
}

function stateSnapshot(dom) {
  return {
    effectiveLocale: dom.document.documentElement.dataset.expungementAiLocale,
    expLang: dom.window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY),
    htmlLang: dom.document.documentElement.getAttribute("lang"),
    datasetLocale: dom.document.documentElement.dataset.locale,
    enPressed: langButton(dom, "en")?.getAttribute("aria-pressed"),
    esPressed: langButton(dom, "es")?.getAttribute("aria-pressed"),
    hero: textForKey(dom, "hero_h1"),
    navHow: textForKey(dom, "nav_how"),
    navBrief: textForKey(dom, "nav_brief"),
    navPricing: textForKey(dom, "nav_pricing"),
    navPrivacy: textForKey(dom, "nav_privacy"),
    navFaq: textForKey(dom, "nav_faq"),
    navLogin: textForKey(dom, "nav_login"),
    primaryCta: textForKey(dom, "hero_cta1") || textForKey(dom, "nav_cta")
  };
}

function formatDebug(dom) {
  const state = stateSnapshot(dom);
  return [
    `  effective locale: ${state.effectiveLocale}`,
    `  exp_lang: ${state.expLang}`,
    `  html lang: ${state.htmlLang}`,
    `  dataset locale: ${state.datasetLocale}`,
    `  EN aria-pressed: ${state.enPressed}`,
    `  ES aria-pressed: ${state.esPressed}`,
    `  hero: ${state.hero}`,
    `  primary CTA: ${state.primaryCta}`,
    `  legacy locale: ${dom.window.localStorage.getItem("locale")}`,
    `  legacy lang: ${dom.window.localStorage.getItem("lang")}`,
    `  legacy preferredLocale: ${dom.window.localStorage.getItem("preferredLocale")}`,
    `  legacy i18nextLng: ${dom.window.localStorage.getItem("i18nextLng")}`
  ].join("\n");
}

function nodeForKey(nodes, key) {
  return nodes.find((node) => node.getAttribute("data-i18n-html") === key || node.getAttribute("data-i18n") === key);
}

function textForKey(dom, key) {
  return nodeForKey(dom.nodes, key)?.textContent ?? "";
}

function langButton(dom, locale) {
  return dom.nodes.find((node) => node.getAttribute("data-lang") === locale);
}

function htmlToText(value) {
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

assert(Object.keys(dictionaries.en).length > 100, "Real English landing dictionary must be extracted from rendered handoff HTML.");
assert(dictionaries.en.hero_h1?.includes("Prepare a self-help packet for"), "English hero dictionary must include the production hero headline.");
assert(dictionaries.es.hero_h1?.includes("Prepare un paquete de autoayuda por"), "Spanish hero dictionary must include the Spanish hero headline.");

let dom = makeDom({}, { navigatorLanguage: "es-MX" });
assert(applyInitial(dom) === "en", "Fresh/private browser must default to English.", dom);
assertEnglishState("fresh/private default", dom);

dom = makeDom({ exp_lang: "es" });
assert(applyInitial(dom) === "es", "Saved exp_lang=es must load Spanish.", dom);
assertSpanishState("saved Spanish", dom);

dom = makeDom({ exp_lang: "es" });
applyInitial(dom);
clickLocale("en", dom);
assert(dom.window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY) === "en", "Click EN must persist exp_lang=en.", dom);
assertEnglishState("switch back to English", dom);

dom = makeDom({
  exp_lang: "en",
  "expungement-ai:locale": "es",
  "expungement.locale": "es",
  locale: "es",
  lang: "es",
  preferredLocale: "es",
  i18nextLng: "es"
}, { htmlLang: "es", datasetLocale: "es", navigatorLanguage: "es-MX" });
assert(applyInitial(dom) === "en", "Saved exp_lang=en must beat stale Spanish keys/html/browser language.", dom);
assertEnglishState("saved English with stale Spanish keys", dom);
clickLocale("en", dom);
for (const key of ["expungement-ai:locale", "expungement.locale", "locale", "lang", "preferredLocale", "i18nextLng"]) {
  assert(dom.window.localStorage.getItem(key) === null, `Click EN must clear stale ${key}.`, dom);
}

dom = makeDom();
applyInitial(dom);
clickLocale("es", dom);
assertSpanishState("click sequence ES", dom);
clickLocale("en", dom);
assertEnglishState("click sequence EN", dom);
clickLocale("es", dom);
assertSpanishState("click sequence ES again", dom);
clickLocale("en", dom);
assertEnglishState("click sequence EN again", dom);

dom = makeDom();
applyExpungementLocale("es", { dictionaries, persist: false, dispatch: false });
langButton(dom, "en")?.classList.add("on");
langButton(dom, "en")?.setAttribute("aria-pressed", "true");
clickLocale("en", dom);
assertEnglishState("explicit production screenshot recovery", dom);

if (failures.length) {
  console.error("Expungement.ai rendered landing locale verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai rendered landing locale verifier passed.");
console.log("Rendered scenarios: fresh default, saved-es, switch-en, stale-legacy, EN/ES click sequence, production screenshot guard.");
