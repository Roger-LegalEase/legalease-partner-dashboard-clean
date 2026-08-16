import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.NODE_ENV = "test";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const failures = [];
const {
  APPROVED_LANDING_COPY_EN,
  APPROVED_LANDING_COPY_ES
} = await import("../src/app/expungement-ai/landing-approved-copy.ts");
const {
  applyExpungementLocale,
  EXPUNGEMENT_LOCALE_STORAGE_KEY,
  readSavedExpungementLocale
} = await import("../src/app/expungement-ai/landing-locale-controller.ts");

const dictionaries = { en: APPROVED_LANDING_COPY_EN, es: APPROVED_LANDING_COPY_ES };
const V3_SOURCES = [
  "src/app/expungement-ai/home-v3/ExpungementHomeV3.tsx",
  "src/app/expungement-ai/home-v3/HeroVideo.tsx",
  "src/app/expungement-ai/home-v3/HomepageHeader.tsx",
  "src/app/expungement-ai/home-v3/PacketDocumentSet.tsx",
  "src/app/expungement-ai/home-v3/PrivacyLedger.tsx",
  "src/app/expungement-ai/home-v3/WilmaPreview.tsx",
  "src/app/expungement-ai/home-v3/CoverageMatrix.tsx",
  "src/app/expungement-ai/home-v3/FaqAccordion.tsx"
];

function assert(condition, message, dom) {
  if (!condition) failures.push(dom ? `${message}\n${formatDebug(dom)}` : message);
}

class FakeClassList {
  constructor(initial = []) { this.values = new Set(initial); }
  add(value) { this.values.add(value); }
  toggle(value, force) { if (force) this.values.add(value); else this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class FakeElement {
  constructor(tagName, attrs = {}, body = "") {
    this.tagName = tagName;
    this.attrs = new Map(Object.entries(attrs));
    this.classList = new FakeClassList();
    this.dataset = {};
    this.textContent = body;
  }
  hasAttribute(name) { return this.attrs.has(name); }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  set content(value) { this.attrs.set("content", String(value)); }
  get content() { return this.attrs.get("content") ?? ""; }
  set innerHTML(value) { this.textContent = String(value).replace(/<[^>]+>/g, ""); }
  get innerHTML() { return this.textContent; }
}

const visibleKeys = ["hero_h1", "nav_how", "nav_brief", "nav_pricing", "nav_privacy", "nav_faq", "nav_login", "hero_cta1", "prob_h2", "fn_h2"];

function makeDom(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const nodes = visibleKeys.map((key) => new FakeElement("span", { "data-i18n": key }, APPROVED_LANDING_COPY_EN[key]));
  nodes.push(new FakeElement("a", { "data-i18n-aria-label": "home_label", "aria-label": APPROVED_LANDING_COPY_EN.home_label }));
  nodes.push(new FakeElement("img", { "data-i18n-alt": "guided_check_alt", alt: APPROVED_LANDING_COPY_EN.guided_check_alt }));
  nodes.push(new FakeElement("button", { "data-lang": "en", "aria-pressed": "true" }, "EN"));
  nodes.push(new FakeElement("button", { "data-lang": "es", "aria-pressed": "false" }, "ES"));
  const documentElement = new FakeElement("html", { lang: "en" });
  const metadata = {
    description: new FakeElement("meta", { name: "description", content: APPROVED_LANDING_COPY_EN._desc }),
    ogDescription: new FakeElement("meta", { property: "og:description", content: APPROVED_LANDING_COPY_EN._desc }),
    twitterDescription: new FakeElement("meta", { name: "twitter:description", content: APPROVED_LANDING_COPY_EN._desc }),
    ogTitle: new FakeElement("meta", { property: "og:title", content: APPROVED_LANDING_COPY_EN._title }),
    twitterTitle: new FakeElement("meta", { name: "twitter:title", content: APPROVED_LANDING_COPY_EN._title })
  };
  const document = {
    title: APPROVED_LANDING_COPY_EN._title,
    documentElement,
    querySelectorAll(selector) {
      if (selector === "[data-i18n]") return nodes.filter((node) => node.hasAttribute("data-i18n"));
      if (selector === "[data-i18n-html]") return [];
      if (selector === "[data-lang]") return nodes.filter((node) => node.hasAttribute("data-lang"));
      const attributeMatch = selector.match(/^\[data-i18n-(aria-label|alt|title)\]$/);
      if (attributeMatch) return nodes.filter((node) => node.hasAttribute(`data-i18n-${attributeMatch[1]}`));
      return [];
    },
    querySelector(selector) {
      if (selector === '[data-lang="en"]') return langButton({ nodes }, "en");
      if (selector === '[data-lang="es"]') return langButton({ nodes }, "es");
      if (selector === '[data-i18n-html="hero_h1"], [data-i18n="hero_h1"]') return nodeForKey(nodes, "hero_h1");
      if (selector === 'meta[name="description"]') return metadata.description;
      if (selector === 'meta[property="og:description"]') return metadata.ogDescription;
      if (selector === 'meta[name="twitter:description"]') return metadata.twitterDescription;
      if (selector === 'meta[property="og:title"]') return metadata.ogTitle;
      if (selector === 'meta[name="twitter:title"]') return metadata.twitterTitle;
      return null;
    }
  };
  const window = {
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    dispatchEvent(event) { window.lastEvent = event; return true; }
  };
  globalThis.document = document;
  globalThis.window = window;
  globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  return { nodes, document, window, storage, metadata };
}

function applyInitial() {
  const locale = readSavedExpungementLocale();
  applyExpungementLocale(locale, { dictionaries, persist: false, dispatch: false });
  return locale;
}

function clickLocale(locale) {
  applyExpungementLocale(locale, { dictionaries, persist: true, dispatch: true });
}

function stateSnapshot(dom) {
  return {
    expLang: dom.window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY),
    htmlLang: dom.document.documentElement.getAttribute("lang"),
    datasetLocale: dom.document.documentElement.dataset.locale,
    expungementDatasetLocale: dom.document.documentElement.dataset.expungementAiLocale,
    enPressed: langButton(dom, "en")?.getAttribute("aria-pressed"),
    esPressed: langButton(dom, "es")?.getAttribute("aria-pressed"),
    hero: textForKey(dom, "hero_h1"),
    navHow: textForKey(dom, "nav_how"),
    navBrief: textForKey(dom, "nav_brief"),
    navPricing: textForKey(dom, "nav_pricing"),
    navPrivacy: textForKey(dom, "nav_privacy"),
    navFaq: textForKey(dom, "nav_faq"),
    navLogin: textForKey(dom, "nav_login"),
    primaryCta: textForKey(dom, "hero_cta1"),
    homeLabel: dom.nodes.find((node) => node.hasAttribute("data-i18n-aria-label"))?.getAttribute("aria-label"),
    guidedAlt: dom.nodes.find((node) => node.hasAttribute("data-i18n-alt"))?.getAttribute("alt")
  };
}

function assertState(locale, label, dom) {
  const state = stateSnapshot(dom);
  const expected = dictionaries[locale];
  assert(state.htmlLang === locale && state.datasetLocale === locale && state.expungementDatasetLocale === locale, `${label}: root locale state is inconsistent.`, dom);
  assert(state.enPressed === String(locale === "en") && state.esPressed === String(locale === "es"), `${label}: language button state is inconsistent.`, dom);
  assert(state.hero === expected.hero_h1 && state.navHow === expected.nav_how && state.navBrief === expected.nav_brief, `${label}: primary visible copy is mixed or stale.`, dom);
  assert(state.navPricing === expected.nav_pricing && state.navPrivacy === expected.nav_privacy && state.navFaq === expected.nav_faq && state.navLogin === expected.nav_login, `${label}: navigation is mixed or stale.`, dom);
  assert(state.primaryCta === expected.hero_cta1, `${label}: primary CTA is mixed or stale.`, dom);
  assert(state.homeLabel === expected.home_label && state.guidedAlt === expected.guided_check_alt, `${label}: accessible labels or image alternatives are mixed or stale.`, dom);
  assert(dom.document.title === expected._title && dom.metadata.description.getAttribute("content") === expected._desc, `${label}: metadata is mixed or stale.`, dom);
}

function formatDebug(dom) {
  const state = stateSnapshot(dom);
  return Object.entries(state).map(([key, value]) => `  ${key}: ${value}`).join("\n");
}

function nodeForKey(nodes, key) { return nodes.find((node) => node.getAttribute("data-i18n") === key); }
function textForKey(dom, key) { return nodeForKey(dom.nodes, key)?.textContent ?? ""; }
function langButton(dom, locale) { return dom.nodes.find((node) => node.getAttribute("data-lang") === locale); }

const enKeys = Object.keys(APPROVED_LANDING_COPY_EN).sort();
const esKeys = Object.keys(APPROVED_LANDING_COPY_ES).sort();
assert(JSON.stringify(enKeys) === JSON.stringify(esKeys), "English and Spanish dictionary keys differ.");

const v3Source = V3_SOURCES.map((relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8")).join("\n");
const referencedKeys = new Set([
  ...[...v3Source.matchAll(/data-i18n(?:-aria-label|-alt|-title)?="([^"]+)"/g)].map((match) => match[1]),
  ...[...v3Source.matchAll(/copy\("([^"]+)"\)/g)].map((match) => match[1])
]);
for (const key of referencedKeys) {
  assert(Boolean(APPROVED_LANDING_COPY_EN[key]?.trim()), `V3 references missing English key ${key}.`);
  assert(Boolean(APPROVED_LANDING_COPY_ES[key]?.trim()), `V3 references missing Spanish key ${key}.`);
}

let dom = makeDom();
assert(applyInitial() === "en", "Fresh browser must default to English.", dom);
assertState("en", "fresh English", dom);

dom = makeDom({ exp_lang: "es" });
assert(applyInitial() === "es", "Saved exp_lang=es must load Spanish.", dom);
assertState("es", "saved Spanish", dom);

dom = makeDom({ exp_lang: "en", locale: "es", lang: "es", preferredLocale: "es", i18nextLng: "es" });
applyInitial();
clickLocale("en");
assertState("en", "English beats stale locale keys", dom);
for (const key of ["locale", "lang", "preferredLocale", "i18nextLng"]) assert(dom.window.localStorage.getItem(key) === null, `Switching language must clear stale ${key}.`, dom);

dom = makeDom();
applyInitial();
for (const locale of ["es", "en", "es", "en"]) {
  clickLocale(locale);
  assert(dom.window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY) === locale, `Switch to ${locale} did not persist exp_lang.`, dom);
  assertState(locale, `switch ${locale}`, dom);
}

if (failures.length) {
  console.error("Expungement.ai V3 locale DOM-state verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  dictionaryKeys: enKeys.length,
  v3ReferencedKeys: referencedKeys.size,
  scenarios: ["fresh English", "saved Spanish", "stale-key recovery", "EN/ES repeat switching"],
  accessibleCopy: "localized",
  metadata: "localized"
}, null, 2));
