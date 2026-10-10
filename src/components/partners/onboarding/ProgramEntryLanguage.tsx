"use client";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function ProgramEntryText({enabled, en, es}: {enabled: boolean; en: string; es: string}) {
  const {locale} = useLocalization();
  return <>{enabled && locale === "es" ? es : en}</>;
}
export function ProgramEntryLanguage({enabled}: {enabled: boolean}) {
  const {locale, setLocale} = useLocalization();
  if (!enabled) return null;
  return <div role="group" aria-label="Page language" className="my-4 flex justify-center gap-2">{(["en", "es"] as const).map(language => <button type="button" key={language} aria-pressed={locale === language} onClick={() => setLocale(language)} className="min-h-11 rounded border px-3 font-bold">{language === "es" ? "Español" : "English"}</button>)}</div>;
}
