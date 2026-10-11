"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function PartnerWorkspaceNav({ launchPrepEnabled, helpHref,programMode=false,canManage=false,codesEnabled=false }: { launchPrepEnabled: boolean; helpHref: string;programMode?:boolean;canManage?:boolean;codesEnabled?:boolean }) {
  const pathname = usePathname();
  const { locale, setLocale } = useLocalization();
  const es = locale === "es";
  const links = programMode ? [["/partner/dashboard",es?"Inicio":"Home"],["/partner/reporting",es?"Actividad e informes":"Activity & Reporting"],["/partner/clinic",es?"Clínicas":"Clinics"],...(canManage?[["/partner/team",es?"Equipo":"Team"],["/partner/settings",es?"Configuración":"Settings"]]:[]),...(canManage&&codesEnabled?[["/partner/access-codes",es?"Códigos de acceso":"Access codes"]]:[]),[helpHref,es?"Ayuda":"Help"]] : [
    ["/partner/dashboard", es ? "Inicio" : "Home"],
    ["/partner/onboarding", es ? "Configurar programa" : "Program setup"],
    ...(launchPrepEnabled ? [["/partner/onboarding/artifacts#your-page", es ? "Su página" : "Your page"], ["/partner/onboarding/resources", es ? "Lanzamiento y recursos" : "Launch & resources"]] : []),
    ["/partner/clinic", es ? "Clínicas" : "Clinics"],
    ["/partner/reporting", es ? "Informes" : "Reporting"],
    [helpHref, es ? "Ayuda" : "Help"]
  ];
  return <header className="border-b border-grayWilma-200 bg-white px-4 py-3 md:px-6">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><p className="font-black text-navy">RCAP <span className="font-normal">by LegalEase</span></p>
      <button type="button" onClick={()=>setLocale(es ? "en" : "es")} className="min-h-11 rounded-md border border-grayWilma-200 px-4 font-bold text-navy">{es ? "English" : "Español"}</button>
    </div>
    <nav aria-label={es ? "Navegación del programa" : "Program navigation"} className="mx-auto mt-2 flex max-w-7xl flex-wrap gap-x-4 gap-y-1">{links.map(([href,label])=><Link prefetch={false} key={href} href={href} aria-current={pathname===href ? "page" : undefined} className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-bold text-navy hover:text-teal focus-visible:ring-2 focus-visible:ring-teal">{label}</Link>)}</nav>
  </header>;
}
