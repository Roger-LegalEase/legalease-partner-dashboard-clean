"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, normalizeLocale, resolveRuntimeText, t, type Locale } from "@/lib/expungement-ai/localization";

type LocalizationContextValue = {
  locale: Locale;
  t: (key: string, fallback?: string, vars?: Record<string, string | number | undefined>) => string;
  text: (value: string, options?: { key?: string; vars?: Record<string, string | number | undefined> }) => string;
};

const LocalizationContext = createContext<LocalizationContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key, fallback, vars) => t(DEFAULT_LOCALE, key, fallback, vars),
  text: (value, options) => resolveRuntimeText(DEFAULT_LOCALE, value, options)
});

function initialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem("exp_lang");
    if (saved) return normalizeLocale(saved);
  } catch {
    // Ignore storage failures; default to English.
  }
  const docLang = document.documentElement.lang;
  if (docLang?.toLowerCase().startsWith("es")) return "es";
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : DEFAULT_LOCALE;
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    queueMicrotask(() => setLocale(initialLocale()));
    const onStorage = (event: StorageEvent) => {
      if (event.key === "exp_lang") setLocale(normalizeLocale(event.newValue));
    };
    const onLanguage = () => setLocale(initialLocale());

    window.addEventListener("storage", onStorage);
    window.addEventListener("expungement-ai:language-change", onLanguage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("expungement-ai:language-change", onLanguage);
    };
  }, []);

  const value = useMemo<LocalizationContextValue>(() => ({
    locale,
    t: (key, fallback, vars) => t(locale, key, fallback, vars),
    text: (text, options) => resolveRuntimeText(locale, text, options)
  }), [locale]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  return useContext(LocalizationContext);
}

export function LocalizedText({
  k,
  fallback,
  vars
}: {
  k: string;
  fallback: string;
  vars?: Record<string, string | number | undefined>;
}) {
  const { t: translate } = useLocalization();
  return <>{translate(k, fallback, vars)}</>;
}

export function LocalizedRuntimeText({
  text,
  k,
  vars
}: {
  text: string;
  k?: string;
  vars?: Record<string, string | number | undefined>;
}) {
  const { text: localize } = useLocalization();
  return <>{localize(text, { key: k, vars })}</>;
}
