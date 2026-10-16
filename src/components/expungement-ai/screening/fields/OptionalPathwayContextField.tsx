"use client";

import { useId, useState } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { localizeProfileText, runtimeCopyKeyForText } from "@/lib/expungement-ai/localization";
import { OptionGroup, type OptionGroupProps } from "./OptionGroup";

type Props = Extract<OptionGroupProps, { mode: "single" }>;

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
  const query = search.trim().toLocaleLowerCase(locale);
  const visibleOptions = props.options.filter(option => !query || labelFor(option).toLocaleLowerCase(locale).includes(query));

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
