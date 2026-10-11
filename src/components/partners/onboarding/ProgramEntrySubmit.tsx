"use client";
import { useFormStatus } from "react-dom";
import { ProgramEntryText } from "./ProgramEntryLanguage";
export function ProgramEntrySubmit({spanishEnabled,code=false}:{spanishEnabled:boolean;code?:boolean}){
 const {pending}=useFormStatus();
 return <button type="submit" disabled={pending} className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#B94622] px-6 py-3.5 text-base font-extrabold text-white focus-visible:ring-2 focus-visible:ring-navy disabled:opacity-60 sm:w-auto sm:min-w-[260px]"><ProgramEntryText enabled={spanishEnabled} en={pending?"Starting screening…":code?"Continue with access code":"Start free screening"} es={pending?"Iniciando evaluación…":code?"Continuar con código de acceso":"Comenzar evaluación gratuita"}/></button>;
}
