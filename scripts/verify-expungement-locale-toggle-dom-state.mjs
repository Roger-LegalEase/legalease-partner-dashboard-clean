import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.NODE_ENV = "test";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) failures.push(message); };

const {
  applyExpungementLocale,
  EXPUNGEMENT_LOCALE_STORAGE_KEY,
  readSavedExpungementLocale
} = await import("../src/app/expungement-ai/landing-locale-controller.ts");

const landing = read("src/app/expungement-ai/ExpungementLandingInteractions.tsx");
const provider = read("src/components/expungement-ai/LocalizationProvider.tsx");
const controller = read("src/app/expungement-ai/landing-locale-controller.ts");

assert(controller.includes('EXPUNGEMENT_LOCALE_STORAGE_KEY = "exp_lang"'), "Controller must define exp_lang as the single authoritative key.");
assert(!controller.includes("navigator.language"), "Controller must not use browser language.");
assert(!provider.includes("navigator.language"), "Provider must not use browser language.");
assert(!provider.includes("document.documentElement.lang") || provider.includes("setAttribute(\"lang\""), "Provider must not read html lang as the effective locale.");
assert(landing.includes("applyExpungementLocale"), "Landing interactions must use the shared locale controller.");
assert(!landing.includes("window.localStorage.getItem(\"exp_lang\")"), "Landing interactions must not read exp_lang outside the controller.");

const dictionaries = {
  en: {
    hero_h1: "Prepare a self-help packet in English",
    nav_cta: "Check my path",
    hero_cta1: "Start free check",
    nav_login: "Log in"
  },
  es: {
    hero_h1: "Prepare un paquete de autoayuda en español",
    nav_cta: "Revisar mi ruta",
    hero_cta1: "Comenzar revisión gratis",
    nav_login: "Iniciar sesión"
  }
};

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
  constructor(tagName, attrs = {}, text = "", classes = []) {
    this.tagName = tagName;
    this.attrs = new Map(Object.entries(attrs));
    this.textContent = text;
    this.classList = new FakeClassList(classes);
    this.dataset = {};
  }
  hasAttribute(name) {
    return this.attrs.has(name);
  }
  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }
  setAttribute(name, value) {
    this.attrs.set(name, String(value));
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.textContent = String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }
  get innerHTML() {
    return this._innerHTML ?? this.textContent;
  }
}

function makeDom(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const nodes = [
    new FakeElement("h1", { "data-i18n-html": "hero_h1" }, "Prepare a self-help packet in English"),
    new FakeElement("a", { "data-i18n-html": "nav_cta" }, "Check my path"),
    new FakeElement("a", { "data-i18n-html": "hero_cta1" }, "Start free check"),
    new FakeElement("a", { "data-i18n": "nav_login" }, "Log in"),
    new FakeElement("button", { "data-lang": "en", "aria-pressed": "true" }, "EN", ["langbtn", "on"]),
    new FakeElement("button", { "data-lang": "es", "aria-pressed": "false" }, "ES", ["langbtn"])
  ];
  const documentElement = new FakeElement("html", { lang: "en" }, "");
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
        return nodes.find((node) => node.getAttribute("data-i18n-html") === "hero_h1" || node.getAttribute("data-i18n") === "hero_h1") ?? null;
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
    navigator: { language: "es-MX" }
  };
  globalThis.document = document;
  globalThis.window = window;
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true
  });
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  return { nodes, document, window, storage };
}

function assertEnglishState(label, dom) {
  const hero = heroText(dom);
  const nav = textForKey(dom, "nav_cta");
  const cta = textForKey(dom, "hero_cta1");
  const en = langButton(dom, "en");
  const es = langButton(dom, "es");
  assert(hero.includes("English"), `${label}: English hero copy not visible: ${hero}`);
  assert(nav === "Check my path", `${label}: English nav CTA not visible: ${nav}`);
  assert(cta === "Start free check", `${label}: English hero CTA not visible: ${cta}`);
  assert(!hero.includes("español") && nav !== "Revisar mi ruta" && cta !== "Comenzar revisión gratis", `${label}: Spanish copy visible while English expected.`);
  assert(en.classList.contains("on") && en.classList.contains("active"), `${label}: EN must be visually active.`);
  assert(!es.classList.contains("on") && !es.classList.contains("active"), `${label}: ES must be inactive.`);
  assert(en.getAttribute("aria-pressed") === "true", `${label}: EN aria-pressed must be true.`);
  assert(es.getAttribute("aria-pressed") === "false", `${label}: ES aria-pressed must be false.`);
}

function assertSpanishState(label, dom) {
  const hero = heroText(dom);
  const nav = textForKey(dom, "nav_cta");
  const cta = textForKey(dom, "hero_cta1");
  const en = langButton(dom, "en");
  const es = langButton(dom, "es");
  assert(hero.includes("español"), `${label}: Spanish hero copy not visible: ${hero}`);
  assert(nav === "Revisar mi ruta", `${label}: Spanish nav CTA not visible: ${nav}`);
  assert(cta === "Comenzar revisión gratis", `${label}: Spanish hero CTA not visible: ${cta}`);
  assert(!hero.includes("English") && nav !== "Check my path" && cta !== "Start free check", `${label}: English copy visible while Spanish expected.`);
  assert(es.classList.contains("on") && es.classList.contains("active"), `${label}: ES must be visually active.`);
  assert(!en.classList.contains("on") && !en.classList.contains("active"), `${label}: EN must be inactive.`);
  assert(es.getAttribute("aria-pressed") === "true", `${label}: ES aria-pressed must be true.`);
  assert(en.getAttribute("aria-pressed") === "false", `${label}: EN aria-pressed must be false.`);
}

function heroText(dom) {
  return textForKey(dom, "hero_h1");
}

function textForKey(dom, key) {
  const node = dom.nodes.find((item) => item.getAttribute("data-i18n-html") === key || item.getAttribute("data-i18n") === key);
  return node?.textContent ?? "";
}

function langButton(dom, locale) {
  return dom.nodes.find((node) => node.getAttribute("data-lang") === locale);
}

function applyInitial() {
  const locale = readSavedExpungementLocale();
  applyExpungementLocale(locale, { dictionaries, persist: false, dispatch: false });
  return locale;
}

let dom = makeDom();
assert(applyInitial() === "en", "No saved locale must default to English.");
assertEnglishState("no-saved-locale", dom);

applyExpungementLocale("es", { dictionaries });
assertSpanishState("click-es", dom);
assert(dom.window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY) === "es", "Click ES must persist exp_lang=es.");

applyExpungementLocale("en", { dictionaries });
assertEnglishState("click-en", dom);
assert(dom.window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY) === "en", "Click EN must persist exp_lang=en.");

dom = makeDom({ exp_lang: "es" });
assert(applyInitial() === "es", "Saved exp_lang=es must load Spanish.");
assertSpanishState("saved-es", dom);

dom = makeDom({ exp_lang: "en" });
assert(applyInitial() === "en", "Saved exp_lang=en must load English.");
assertEnglishState("saved-en", dom);

dom = makeDom({ exp_lang: "en", locale: "es", lang: "es", preferredLocale: "es", i18nextLng: "es" });
assert(applyInitial() === "en", "exp_lang=en must beat stale legacy Spanish keys.");
assertEnglishState("legacy-stale-spanish", dom);
applyExpungementLocale("en", { dictionaries });
assert(dom.window.localStorage.getItem("locale") === null, "Click EN must clear stale locale key.");
assert(dom.window.localStorage.getItem("lang") === null, "Click EN must clear stale lang key.");
assert(dom.window.localStorage.getItem("preferredLocale") === null, "Click EN must clear stale preferredLocale key.");
assert(dom.window.localStorage.getItem("i18nextLng") === null, "Click EN must clear stale i18nextLng key.");

dom = makeDom();
dom.window.navigator.language = "es-MX";
assert(applyInitial() === "en", "Spanish browser language with no saved locale must still default to English.");
assertEnglishState("spanish-browser-default", dom);

dom = makeDom();
applyExpungementLocale("es", { dictionaries, persist: false, dispatch: false });
langButton(dom, "en").classList.add("on");
langButton(dom, "en").setAttribute("aria-pressed", "true");
applyExpungementLocale("en", { dictionaries });
assertEnglishState("recover-from-spanish-copy-en-active", dom);

if (failures.length) {
  console.error("Expungement.ai locale DOM state verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Expungement.ai locale DOM state verifier passed.");
console.log("DOM scenarios: default-en, click-es, click-en, saved-es, saved-en, stale-legacy, spanish-browser-default, mixed-state recovery.");
