import { caProp64ApplicationRequested } from "@/lib/rcap-engine/california-prop64-facts";
import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

export const CA_12034_ROUTE = "tool-1-dismissal-set-aside";
export const CA_12034_SOURCE = "CA.memo:ca-1203-4;CA:ca-1203-4-set;PC1203.4;GA17-Q-fa51657f98ce25890cc1";
/** The adopted after-probation contract, not every variant mentioned in Tool 1's label. */
export function ca12034Contract(profile: EngineProfile | undefined, pathwayId: string | null | undefined = CA_12034_ROUTE): boolean {
  const route = profile?.pathways.find(p => p.id === CA_12034_ROUTE);
  return profile?.jurisdiction.code === "CA" && pathwayId === CA_12034_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "0fddd0751f1ac9d006244dd220f5eb99ba7cf2bbc3e0b3d26ec70b4680f789ac"
    && route?.sourceRef === "pathways:71-114" && (route as {automatic?:boolean}).automatic === false;
}
export function ca12034KnownConviction(a: Record<string, unknown>): boolean {
  return typeof a.case_outcome === "string" && ["Misdemeanor conviction", "Felony conviction"].includes(a.case_outcome);
}
export function ca12034Context(profile: EngineProfile | undefined, pathway: string | null | undefined, a: Record<string, unknown>): boolean {
  if (!ca12034Contract(profile)) return false;
  if (pathway === CA_12034_ROUTE) return true;
  if (pathway != null) return false;
  const route = profile!.pathways.find(p => p.id === CA_12034_ROUTE)!;
  return a.possible_pathway_context === route.label || a.possible_pathway_context === route.id
    || CA_12034_FACT_IDS.some(id => Object.hasOwn(a, id))
    || (a.possible_pathway_context === undefined || a.possible_pathway_context === "") && ca12034KnownConviction(a) && !caProp64ApplicationRequested(a);
}
type Choice = [string, string, string];
const unsure: Choice = ["unknown", "I am not sure", "No estoy seguro"];
const note = "Use this case's actual conviction and probation record. These facts do not establish every statutory exclusion or what the court will grant. Do not infer an answer from a general completion answer.";
const noteEs = "Use el expediente real de la condena y la libertad condicional de este caso. Estos hechos no establecen todas las exclusiones legales ni lo que concederá el tribunal. No deduzca una respuesta de una respuesta general sobre el cumplimiento.";
function fact(id: string, prompt: string, es: string, choices?: Choice[], type: PublicQuestion["type"] = "single_choice"): PublicQuestion {
  return {id, prompt, helperText:note, type, stage:"pathway_routing", required:false, contextOnly:false,
    doesNotSelectPathway:true, ...(type === "multi_select" ? {exclusiveOptions:["none","unknown"]}:{}), lifecyclePhase:"prepay_route_splitter", options:choices?.map(c=>c[0]) ?? null,
    ...(choices ? {optionDisplay:Object.fromEntries(choices.map(([value,label,translated])=>[value,{label,translations:{es:{label:translated}}}]))} : {}),
    translations:{es:{prompt:es,helperText:noteEs}}};
}
export const CA_12034_QUESTIONS: PublicQuestion[] = [
  fact("ca_12034_probation_granted", "Were you placed on probation in this conviction case?", "¿Le impusieron libertad condicional en este caso de condena?", [["yes","Yes","Sí"],["no","No","No"],unsure]),
  fact("ca_12034_current_status", "Which of these are true now? Select all that apply.", "¿Cuáles de estas situaciones son ciertas ahora? Seleccione todas las que correspondan.", [["serving_sentence","I am serving a sentence","Estoy cumpliendo una sentencia"],["on_probation","I am on probation","Estoy en libertad condicional"],["charged","I am charged with a crime","Estoy acusado de un delito"],["none","None of these","Ninguna de estas"],unsure], "multi_select"),
  fact("ca_12034_probation_outcome", "What happened with probation in this case?", "¿Qué ocurrió con la libertad condicional en este caso?", [["fulfilled","I fulfilled probation for the whole period","Cumplí la libertad condicional durante todo el período"],["early_discharge","The court discharged me from probation early","El tribunal terminó mi libertad condicional anticipadamente"],["not_completed","I did not complete probation","No completé la libertad condicional"],unsure]),
  fact("ca_12034_relief_election", "Which basis are you asking the court to consider?", "¿Qué fundamento pide que considere el tribunal?", [["fulfilled","I fulfilled probation","Cumplí la libertad condicional"],["early_discharge","I was discharged early","Mi libertad condicional terminó anticipadamente"],["interests_of_justice","I am asking in the interests of justice","Lo solicito en interés de la justicia"],unsure]),
  fact("ca_12034_interests_narrative", "Explain in your own words why you ask for relief in the interests of justice.", "Explique con sus propias palabras por qué solicita la reparación en interés de la justicia.", undefined, "text_or_unknown"),
  fact("ca_12034_offense_sections", "Copy the offense code sections of conviction from your court record.", "Copie del expediente judicial los artículos legales de los delitos por los que fue condenado.", undefined, "text_or_unknown")
];
export const CA_12034_FACT_IDS = CA_12034_QUESTIONS.map(q=>q.id);
export function ca12034Text(raw: unknown): string | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const wrapper=raw as Record<string, unknown>;
    if (wrapper.unknown !== false || Object.keys(wrapper).some(k=>!['value','unknown'].includes(k))) return null;
    raw=wrapper.value;
  }
  return typeof raw === "string" && raw.trim() && !["unknown","i am not sure","i’m not sure","i'm not sure","not sure","unsure","not_sure","unavailable","not available","none","no disponible","no estoy seguro","no estoy segura","no lo sé","no lo se"].includes(raw.trim().toLowerCase()) ? raw.trim() : null;
}
function status(a: Record<string, unknown>): "clear" | "adverse" | "unknown" {
  const raw=a.ca_12034_current_status;
  if (!Array.isArray(raw) || !raw.length || new Set(raw).size!==raw.length || raw.some(v=>typeof v!=="string" || !["none","unknown","serving_sentence","on_probation","charged"].includes(v))) return "unknown";
  if (raw.includes("unknown") || raw.includes("none") && raw.length!==1) return "unknown";
  return raw.length===1 && raw[0]==="none" ? "clear" : "adverse";
}
export const CA_12034_COPY = {
  outcome:["This after-probation request concerns a conviction. An arrest without charges, a dismissed case, or an uncertain disposition does not establish that conviction. Correct an inaccurate disposition or clarify earlier context without changing a true outcome.","Esta solicitud después de la libertad condicional se refiere a una condena. Un arresto sin cargos, un caso desestimado o una resolución incierta no establece esa condena. Corrija una resolución inexacta o aclare el contexto anterior sin cambiar un resultado verdadero."],
  missing:["Confirm the actual probation record, current status and requested basis. Keep an unknown answer when you do not know.","Confirme el expediente real de libertad condicional, su situación actual y el fundamento solicitado. Conserve una respuesta desconocida cuando no lo sepa."],
  variant:["You reported no probation. That does not establish this after-probation procedure. The separate no-probation and other sentencing procedures need their own facts; no different route has been selected for you.","Indicó que no hubo libertad condicional. Eso no establece este procedimiento posterior a la libertad condicional. Los procedimientos sin libertad condicional y de otras sentencias requieren sus propios hechos; no se ha seleccionado otra vía por usted."],
  current:["The reported current sentence, probation or criminal charge does not satisfy this request's current-status condition. Preserve the facts and correct them only if they change or were inaccurate.","La sentencia, libertad condicional o acusación penal actual declarada no cumple la condición de situación actual de esta solicitud. Conserve los hechos y corríjalos solo si cambian o eran inexactos."],
  conflict:["The requested basis and the probation record do not agree. Correct the actual facts or choose the basis you are requesting; no completion or early discharge is inferred.","El fundamento solicitado y el expediente de libertad condicional no coinciden. Corrija los hechos reales o elija el fundamento que solicita; no se deduce cumplimiento ni terminación anticipada."],
  preparation:["Your stated probation facts and election support preparing this request for review, including an interests-of-justice request. This is not a finding that every statutory requirement is met or that relief will be granted. Unpaid debt alone does not bar this request. Filing, verification and commercial authority remain separate.","Los hechos de libertad condicional y el fundamento declarado permiten preparar esta solicitud para revisión, incluida una solicitud en interés de la justicia. Esto no determina que se cumplan todos los requisitos legales ni que se concederá la reparación. Una deuda impaga por sí sola no impide esta solicitud. La presentación, la verificación y la autorización comercial siguen siendo independientes."]
} as const;
type Decision = {status:"missing"|"review"|"not_yet"|"preparation";code:keyof typeof CA_12034_COPY;ids:string[]};
export function ca12034Facts(a: Record<string, unknown>): Decision {
  if (!ca12034KnownConviction(a)) return {status:"review",code:"outcome",ids:["case_outcome"]};
  const probation=ca12034Text(a.ca_12034_probation_granted);
  if (probation==="no") return {status:"review",code:"variant",ids:["ca_12034_probation_granted"]};
  if (probation!=="yes") return {status:"missing",code:"missing",ids:["ca_12034_probation_granted"]};
  const current=status(a);
  if (current!=="clear") return {status:current==="adverse"?"not_yet":"missing",code:current==="adverse"?"current":"missing",ids:["ca_12034_current_status"]};
  const election=ca12034Text(a.ca_12034_relief_election);
  if (!["fulfilled","early_discharge","interests_of_justice"].includes(election ?? "")) return {status:"missing",code:"missing",ids:["ca_12034_relief_election"]};
  const outcome=ca12034Text(a.ca_12034_probation_outcome);
  if (!["fulfilled","early_discharge","not_completed"].includes(outcome ?? "")) return {status:"missing",code:"missing",ids:["ca_12034_probation_outcome"]};
  if (election!=="interests_of_justice" && outcome!==election) return {status:outcome?"review":"missing",code:outcome?"conflict":"missing",ids:["ca_12034_probation_outcome","ca_12034_relief_election"]};
  if (election==="interests_of_justice" && !ca12034Text(a.ca_12034_interests_narrative)) return {status:"missing",code:"missing",ids:["ca_12034_interests_narrative"]};
  if (!ca12034Text(a.ca_12034_offense_sections)) return {status:"missing",code:"missing",ids:["ca_12034_offense_sections"]};
  return {status:"preparation",code:"preparation",ids:[]};
}
export function ca12034QuestionApplies(profile: EngineProfile, path: string | null | undefined, a: Record<string, unknown>, id: string): boolean {
  const context=ca12034Context(profile,path,a);
  if (!CA_12034_FACT_IDS.includes(id)) {
    if (context && ["financial_obligations","sentence_completion_date","court_requirements_completed","resolved_timing_bucket","special_preconditions_confirmed"].includes(id)) return false;
    return true;
  }
  if (!context || !ca12034KnownConviction(a)) return false;
  if (id==="ca_12034_probation_granted") return true;
  if (ca12034Text(a.ca_12034_probation_granted)==="no") return false;
  if (id==="ca_12034_current_status") return true;
  if (status(a)==="adverse") return false;
  return id!=="ca_12034_interests_narrative" || a.ca_12034_relief_election==="interests_of_justice";
}
