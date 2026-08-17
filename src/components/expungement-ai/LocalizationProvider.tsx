"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  EXPUNGEMENT_LOCALE_EVENT_NAME,
  EXPUNGEMENT_LOCALE_STORAGE_KEY,
  persistExpungementLocaleValue,
  readSavedExpungementLocale
} from "@/app/expungement-ai/landing-locale-controller";
import { DEFAULT_LOCALE, normalizeLocale, resolveRuntimeText, t, type Locale } from "@/lib/expungement-ai/localization";

type LocalizationContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string, vars?: Record<string, string | number | undefined>) => string;
  text: (value: string, options?: { key?: string; vars?: Record<string, string | number | undefined> }) => string;
};

const LocalizationContext = createContext<LocalizationContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key, fallback, vars) => t(DEFAULT_LOCALE, key, fallback, vars),
  text: (value, options) => resolveRuntimeText(DEFAULT_LOCALE, value, options)
});

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeToLocale, readSavedExpungementLocale, () => DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.expungementAiLocale = locale;
  }, [locale]);

  const persistLocale = useCallback((nextLocale: Locale) => {
    persistExpungementLocale(nextLocale);
  }, []);

  const value = useMemo<LocalizationContextValue>(() => ({
    locale,
    setLocale: persistLocale,
    t: (key, fallback, vars) => t(locale, key, fallback, vars),
    text: (text, options) => resolveRuntimeText(locale, text, options)
  }), [locale, persistLocale]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

function subscribeToLocale(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === EXPUNGEMENT_LOCALE_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EXPUNGEMENT_LOCALE_EVENT_NAME, onStoreChange);
  };
}

export function useLocalization() {
  return useContext(LocalizationContext);
}

export function persistExpungementLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  const nextLocale = normalizeLocale(locale);
  persistExpungementLocaleValue(nextLocale);
  document.documentElement.setAttribute("lang", nextLocale);
  document.documentElement.dataset.locale = nextLocale;
  document.documentElement.dataset.expungementAiLocale = nextLocale;
  window.dispatchEvent(new CustomEvent(EXPUNGEMENT_LOCALE_EVENT_NAME, { detail: { locale: nextLocale } }));
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
