"use client";

import { useId, useState } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { localizeProfileText, runtimeCopyKeyForText, type Locale } from "@/lib/expungement-ai/localization";
import { OptionGroup, type OptionGroupProps } from "./OptionGroup";

type Props = Extract<OptionGroupProps, { mode: "single" }>;

const SEARCH_SYNONYMS: Record<Locale, Record<string, string[]>> = {
  en: {
    dui: ["dwi", "owi", "driving", "impaired", "influence", "intoxicat"],
    drunk: ["dui", "dwi", "driving", "impaired", "influence", "intoxicat", "alcohol"],
    drug: ["controlled substance", "narcotic", "marijuana", "cannabis", "possession"],
    weed: ["marijuana", "cannabis"], pot: ["marijuana", "cannabis"], marijuana: ["cannabis"],
    juvenile: ["youth", "minor", "under 18", "under 21"], kid: ["juvenile", "youth", "minor"], minor: ["juvenile", "youth"],
    "not guilty": ["acquittal"], shoplifting: ["theft", "larceny"],
    probation: ["deferred", "diversion"], diversion: ["deferred"],
    "first offense": ["first"], "first time": ["first"], victim: ["trafficking"],
    identity: ["mistaken", "misattribut", "wrong person"], "wrong person": ["identity", "mistaken", "misattribut"],
    "clean slate": ["automatic"], automatic: ["clean slate"],
  },
  es: {
    dui: ["dwi", "conducir", "ebri", "alcohol", "influencia", "intoxic"],
    alcohol: ["ebri", "dui", "dwi", "conducir"], ebrio: ["alcohol", "dui", "conducir"],
    droga: ["sustancia", "narc", "marihuana", "cannabis", "posesi"], drogas: ["sustancia", "narc", "marihuana", "cannabis"],
    marihuana: ["cannabis", "mariguana"], mariguana: ["marihuana", "cannabis"], hierba: ["marihuana", "cannabis"],
    menor: ["juvenil", "joven"], juvenil: ["menor", "joven"],
    absuelto: ["absolucion", "no culpable"], inocente: ["absuel", "no culpable"],
    falta: ["delito menor"], trafico: ["transito", "trata"], hurto: ["robo"], indulto: ["perdon", "clemencia"],
    "libertad condicional": ["probatoria", "diferid", "desv"], probatoria: ["libertad condicional", "diferid"],
    borrar: ["elimin", "cancel", "expung", "destru"], eliminar: ["borr", "cancel", "expung", "destru"],
    victima: ["trata"], identidad: ["equivoc", "error"], "persona equivocada": ["identidad", "equivoc", "error"],
    prostitucion: ["sexual"], perdon: ["indulto", "clemencia"], "primera vez": ["primer"], "primer delito": ["primer"],
  },
};
const normalizeSearch = (value: string, locale: Locale) => value.trim().toLocaleLowerCase(locale).normalize("NFD").replace(/\p{M}/gu, "");

/** Search suggestions only; vocabulary matches never select a pathway or establish eligibility. */
export function optionalPathwaySearchMatches(label: string, search: string, locale: Locale): boolean {
  const query = normalizeSearch(search, locale);
  const normalizedLabel = normalizeSearch(label, locale);
  if (!query || normalizedLabel.includes(query)) return true;
  const labelTokens = normalizedLabel.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const synonyms = Object.hasOwn(SEARCH_SYNONYMS[locale], query) ? SEARCH_SYNONYMS[locale][query] : [];
  return [query, ...synonyms].some(term => {
    if (normalizedLabel.includes(term)) return true;
    const tokens = term.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return tokens.length > 0 && tokens.every(token => labelTokens.some(labelToken => token === labelToken
      || token.length >= 5 && labelToken.length >= 5 && token.slice(0, 5) === labelToken.slice(0, 5)));
  });
}

/** Optional help only. Opening, searching and closing never write an answer. */
export function OptionalPathwayContextField(props: Props) {
  const { locale, text: localize } = useLocalization();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const panelId = useId();
  const searchId = useId();
  const labelFor = (option: string) => {
    const display = props.optionDisplay?.[option];
    return display?.label
      ? locale === "es" && display.translations?.es?.label
        ? display.translations.es.label
        : localizeProfileText(locale, display.label, { state: props.stateCode, questionId: props.questionId, part: `option.${option}.label` })
      : localize(option, { key: runtimeCopyKeyForText(option) });
  };
  const visibleOptions = props.options.filter(option => optionalPathwaySearchMatches(labelFor(option), search, locale));

  return <div className="grid min-w-0 gap-3" data-optional-pathway-help>
    {props.value ? <p className="break-words text-sm" data-current-optional-context>
      {locale === "es" ? "Selección actual:" : "Current choice:"} {labelFor(props.value)}
    </p> : null}
    <button type="button" aria-expanded={open} aria-controls={panelId}
      className="min-h-[48px] rounded-xl border border-[#D1D5DB] px-4 py-3 text-left font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]"
      onClick={() => setOpen(value => !value)}>
      {open ? locale === "es" ? "Ocultar ayuda opcional" : "Hide optional help"
        : locale === "es" ? "Mostrar ayuda opcional" : "Show optional help"}
    </button>
    <div id={panelId} hidden={!open}>
      <div className="grid min-w-0 gap-3">
        <label htmlFor={searchId} className="grid gap-1 text-sm font-semibold">
          {locale === "es" ? "Buscar una opción" : "Find an option"}
          <input id={searchId} type="search" value={search} onChange={event => setSearch(event.target.value)}
            className="min-h-[48px] min-w-0 rounded-xl border border-[#D1D5DB] px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]" />
        </label>
        {search ? <button type="button" onClick={() => setSearch("")}
          className="min-h-[48px] rounded-xl border px-3 py-2 text-left font-semibold focus-visible:ring-2 focus-visible:ring-[#00A99D]">
          {locale === "es" ? "Mostrar todas las opciones" : "Show all options"}
        </button> : null}
        {visibleOptions.length ? <OptionGroup {...props} options={visibleOptions} />
          : <p role="status">{locale === "es" ? "No hay opciones que coincidan con la búsqueda." : "No options match your search."}</p>}
      </div>
    </div>
  </div>;
}
