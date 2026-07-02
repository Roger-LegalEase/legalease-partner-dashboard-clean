import { normalizeLocale, type Locale } from "@/lib/expungement-ai/localization";

export const EXPUNGEMENT_LOCALE_STORAGE_KEY = "exp_lang";
export const EXPUNGEMENT_LOCALE_EVENT_NAME = "expungement-ai:language-change";

const LEGACY_LOCALE_KEYS = [
  "expungement-ai:locale",
  "expungement.locale",
  "locale",
  "lang",
  "preferredLocale",
  "i18nextLng"
];

type LandingDictionaries = {
  en: Record<string, string>;
  es: Record<string, string>;
};

type ApplyLocaleOptions = {
  dictionaries: LandingDictionaries;
  persist?: boolean;
  dispatch?: boolean;
};

type ExpungementLocaleDebug = {
  effectiveLocale: Locale;
  expLang: string | null;
  htmlLang: string | null;
  datasetLocale: string | undefined;
  expungementDatasetLocale: string | undefined;
  enAriaPressed: string | null | undefined;
  esAriaPressed: string | null | undefined;
  heroHeadlineText: string;
};

declare global {
  interface Window {
    __expungementLocaleDebug?: () => ExpungementLocaleDebug;
  }
}

export function readSavedExpungementLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY);
    return saved === "es" ? "es" : "en";
  } catch {
    return "en";
  }
}

export function persistExpungementLocaleValue(locale: Locale) {
  if (typeof window === "undefined") return;
  const nextLocale = normalizeLocale(locale);
  try {
    window.localStorage.setItem(EXPUNGEMENT_LOCALE_STORAGE_KEY, nextLocale);
    for (const key of LEGACY_LOCALE_KEYS) {
      if (key === EXPUNGEMENT_LOCALE_STORAGE_KEY) continue;
      window.localStorage.removeItem(key);
    }
  } catch {
    // Visible copy still updates even when storage is blocked.
  }
}

export function applyExpungementLocale(locale: Locale, options: ApplyLocaleOptions): Locale {
  const normalizedLocale = normalizeLocale(locale);
  const root = document.documentElement;
  const dictionary = normalizedLocale === "es" ? options.dictionaries.es : options.dictionaries.en;

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n") ?? "";
    const value = dictionary[key];
    if (typeof value === "string") element.textContent = value;
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((element) => {
    const key = element.getAttribute("data-i18n-html") ?? "";
    const value = dictionary[key];
    if (typeof value === "string") element.innerHTML = value;
  });

  root.setAttribute("lang", normalizedLocale);
  root.dataset.locale = normalizedLocale;
  root.dataset.expungementAiLocale = normalizedLocale;

  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((button) => {
    const active = button.getAttribute("data-lang") === normalizedLocale;
    button.classList.toggle("on", active);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (options.persist !== false) {
    persistExpungementLocaleValue(normalizedLocale);
  }

  installLocaleDebug(normalizedLocale);

  if (options.dispatch !== false && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EXPUNGEMENT_LOCALE_EVENT_NAME, { detail: { locale: normalizedLocale } }));
  }

  return normalizedLocale;
}

function installLocaleDebug(effectiveLocale: Locale) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  window.__expungementLocaleDebug = () => {
    const enButton = document.querySelector<HTMLButtonElement>('[data-lang="en"]');
    const esButton = document.querySelector<HTMLButtonElement>('[data-lang="es"]');
    const heroHeadline = document.querySelector<HTMLElement>('[data-i18n-html="hero_h1"], [data-i18n="hero_h1"]');
    let expLang: string | null = null;
    try {
      expLang = window.localStorage.getItem(EXPUNGEMENT_LOCALE_STORAGE_KEY);
    } catch {
      expLang = null;
    }
    return {
      effectiveLocale,
      expLang,
      htmlLang: document.documentElement.getAttribute("lang"),
      datasetLocale: document.documentElement.dataset.locale,
      expungementDatasetLocale: document.documentElement.dataset.expungementAiLocale,
      enAriaPressed: enButton?.getAttribute("aria-pressed"),
      esAriaPressed: esButton?.getAttribute("aria-pressed"),
      heroHeadlineText: heroHeadline?.textContent?.replace(/\s+/g, " ").trim() ?? ""
    };
  };
}
