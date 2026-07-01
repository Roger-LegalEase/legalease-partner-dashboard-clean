import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROFILES_PATH = path.join(ROOT, "src/lib/expungement-ai/frontend/profiles/all51.json");
const LOCALIZATION_PATH = path.join(ROOT, "src/lib/expungement-ai/localization.ts");

const STATE_NAMES = {
  Alabama: "Alabama",
  Alaska: "Alaska",
  Arizona: "Arizona",
  Arkansas: "Arkansas",
  California: "California",
  Colorado: "Colorado",
  Connecticut: "Connecticut",
  Delaware: "Delaware",
  "District of Columbia": "el Distrito de Columbia",
  Florida: "Florida",
  Georgia: "Georgia",
  Hawaii: "Hawaii",
  Idaho: "Idaho",
  Illinois: "Illinois",
  Indiana: "Indiana",
  Iowa: "Iowa",
  Kansas: "Kansas",
  Kentucky: "Kentucky",
  Louisiana: "Louisiana",
  Maine: "Maine",
  Maryland: "Maryland",
  Massachusetts: "Massachusetts",
  Michigan: "Michigan",
  Minnesota: "Minnesota",
  Mississippi: "Mississippi",
  Missouri: "Missouri",
  Montana: "Montana",
  Nebraska: "Nebraska",
  Nevada: "Nevada",
  "New Hampshire": "New Hampshire",
  "New Jersey": "New Jersey",
  "New Mexico": "New Mexico",
  "New York": "Nueva York",
  "North Carolina": "North Carolina",
  "North Dakota": "North Dakota",
  Ohio: "Ohio",
  Oklahoma: "Oklahoma",
  Oregon: "Oregon",
  Pennsylvania: "Pennsylvania",
  "Rhode Island": "Rhode Island",
  "South Carolina": "South Carolina",
  "South Dakota": "South Dakota",
  Tennessee: "Tennessee",
  Texas: "Texas",
  Utah: "Utah",
  Vermont: "Vermont",
  Virginia: "Virginia",
  Washington: "Washington",
  "West Virginia": "West Virginia",
  Wisconsin: "Wisconsin",
  Wyoming: "Wyoming"
};

const EXACT = new Map(Object.entries({
  "Are you asking about your own record?": "¿Está preguntando sobre su propio antecedente?",
  "Yes": "Sí",
  "No": "No",
  "I am helping someone complete their own check": "Estoy ayudando a alguien a completar su propia revisión",
  "State or local": "Estatal o local",
  "Federal": "Federal",
  "How did the case end?": "¿Cómo terminó el caso?",
  "I'm not sure": "No estoy seguro",
  "I am not sure": "No estoy seguro",
  "That's okay — we'll help you figure it out": "No pasa nada; le ayudaremos a entenderlo",
  "Do any of these sound like your situation?": "¿Alguna de estas opciones se parece a su situación?",
  "optional — helps us guide you": "opcional; nos ayuda a orientarle",
  "None of these / I am not sure": "Ninguna de estas / No estoy seguro",
  "Another kind of conviction": "Otro tipo de condena",
  "other conviction or adjudication": "otra condena o decisión del tribunal",
  "What kind of charge was it?": "¿Qué tipo de cargo fue?",
  "Misdemeanor": "Delito menor",
  "Felony": "Delito grave",
  "The case was dropped or thrown out": "El caso fue retirado o desestimado",
  "dismissed, no-billed, nolle prosequi, or not prosecuted": "desestimado, no acusado, retirado por la fiscalía o no procesado",
  "Do you have your court paperwork handy?": "¿Tiene a mano sus documentos del tribunal?",
  "Do you have your background check or court records handy?": "¿Tiene a mano su informe de antecedentes o documentos del tribunal?",
  "No worries if not — you can save and come back.": "No se preocupe si no los tiene; puede guardar y volver después.",
  "Which court or agency handled the case?": "¿Qué tribunal o agencia manejó el caso?",
  "What does the record say you were charged with?": "¿Qué cargo aparece en el registro?",
  "the charge name or code, however it's written": "el nombre o código del cargo, tal como aparece",
  "Traffic or driving matter": "Asunto de tránsito o manejo",
  "What's the case number?": "¿Cuál es el número de caso?",
  "also called a docket, cause, or arrest number — it's on your court paperwork": "también puede llamarse número de expediente, causa o arresto; aparece en sus documentos del tribunal",
  "also called a docket, cause, or arrest number": "también puede llamarse número de expediente, causa o arresto",
  "Found not guilty": "Fue declarado no culpable",
  "acquitted or found not guilty": "absuelto o declarado no culpable",
  "Convicted of a misdemeanor": "Condenado por un delito menor",
  "a less serious conviction": "una condena menos grave",
  "Convicted of a felony": "Condenado por un delito grave",
  "a more serious conviction": "una condena más grave",
  "Infraction or violation": "Infracción o violación",
  "Have you finished everything the court ordered?": "¿Terminó todo lo que ordenó el tribunal?",
  "jail/probation/parole, classes, community service, anything still owed": "cárcel, probation, parole, clases, servicio comunitario o cualquier pago pendiente",
  "It happened when I was a minor": "Ocurrió cuando era menor de edad",
  "juvenile adjudication or offense as a minor": "decisión juvenil u ofensa cometida como menor",
  "Completed a program instead of a conviction": "Completó un programa en lugar de una condena",
  "diversion, deferred disposition, supervision, or similar": "diversión, resolución diferida, supervisión o algo similar",
  "When did the case end or finish?": "¿Cuándo terminó el caso?",
  "Have you paid off everything the court charged?": "¿Pagó todo lo que cobró el tribunal?",
  "fines, court costs, restitution": "multas, costos del tribunal, restitución",
  "How old were you when this happened?": "¿Qué edad tenía cuando ocurrió?",
  "Have you gotten a pardon or similar official relief for this?": "¿Recibió un perdón u otra ayuda oficial similar para esto?",
  "Do you have any open cases right now?": "¿Tiene algún caso abierto ahora?",
  "a charge in progress, or current probation/parole": "un cargo en curso, o probation/parole actual",
  "Pardoned": "Con perdón oficial",
  "pardoned conviction": "condena con perdón oficial",
  "Did the case involve any of these?": "¿El caso incluyó alguna de estas situaciones?",
  "Some types follow special rules.": "Algunos tipos tienen reglas especiales.",
  "None of these": "Ninguna de estas",
  "Sex offense or registration": "Delito sexual o registro",
  "Other named excluded offense": "Otro delito excluido por nombre",
  "Municipal or ordinance matter": "Asunto municipal u ordenanza",
  "DUI/DWI or serious traffic": "DUI/DWI o infracción grave de tránsito",
  "Did this happen because you were a victim of human trafficking?": "¿Esto ocurrió porque fue víctima de trata de personas?",
  "Have you had a record cleared before, anywhere?": "¿Alguna vez le han limpiado un antecedente, en cualquier lugar?",
  "Arrested, but never charged": "Arrestado, pero nunca acusado",
  "arrest or citation with no charge filed": "arresto o citación sin cargos presentados",
  "Which county (or local area) handled the case?": "¿Qué condado o área local manejó el caso?",
  "Was this arrest a mistake — wrong person, identity theft, or an error?": "¿Este arresto fue un error, como persona equivocada, robo de identidad u otro error?",
  "Domestic violence": "Violencia doméstica",
  "Firearm or weapons": "Armas de fuego u otras armas",
  "Outcome unknown or record needed": "No sé el resultado o necesito el registro",
  "Juvenile expungement": "Expungement juvenil",
  "Human-trafficking-survivor vacatur and expungement": "Anulación y expungement para sobrevivientes de trata de personas",
  "Adult conviction sealing": "Sellado de condena adulta",
  "Juvenile sealing": "Sellado juvenil",
  "Pardon-based expungement": "Expungement basado en perdón oficial",
  "Conviction": "Condena",
  "No conviction / released without conviction": "Sin condena / liberado sin condena",
  "Arrest with no charges filed": "Arresto sin cargos presentados",
  "When did the arrest happen?": "¿Cuándo ocurrió el arresto?",
  "Violent offense": "Delito violento"
}));

const TERM_REPLACEMENTS = [
  [/expungement/gi, "expungement"],
  [/expunction/gi, "expunction"],
  [/erasure/gi, "borrado"],
  [/sealing/gi, "sellado"],
  [/record sealing/gi, "sellado de antecedentes"],
  [/record restriction/gi, "restricción de antecedentes"],
  [/record correction/gi, "corrección de antecedentes"],
  [/record removal/gi, "eliminación de antecedentes"],
  [/record clearing/gi, "limpieza de antecedentes"],
  [/non-conviction/gi, "sin condena"],
  [/conviction/gi, "condena"],
  [/misdemeanor/gi, "delito menor"],
  [/felony/gi, "delito grave"],
  [/juvenile/gi, "juvenil"],
  [/adult/gi, "adulto"],
  [/automatic/gi, "automático"],
  [/petition-based/gi, "por petición"],
  [/petitioned/gi, "por petición"],
  [/petition/gi, "petición"],
  [/court-ordered/gi, "ordenado por el tribunal"],
  [/court-record/gi, "registro del tribunal"],
  [/criminal-history/gi, "antecedentes penales"],
  [/arrest-record/gi, "registro de arresto"],
  [/arrest/gi, "arresto"],
  [/dismissal/gi, "desestimación"],
  [/dismissed/gi, "desestimado"],
  [/acquittal/gi, "absolución"],
  [/not-guilty/gi, "no culpable"],
  [/pardon-based/gi, "basado en perdón oficial"],
  [/pardon/gi, "perdón oficial"],
  [/pardoned/gi, "con perdón oficial"],
  [/vacatur/gi, "anulación"],
  [/vacated/gi, "anulada"],
  [/set-aside/gi, "set-aside"],
  [/deferred/gi, "diferido"],
  [/diversion/gi, "diversión"],
  [/probation/gi, "probation"],
  [/parole/gi, "parole"],
  [/marijuana/gi, "marihuana"],
  [/cannabis/gi, "cannabis"],
  [/human-trafficking/gi, "trata de personas"],
  [/trafficking/gi, "trata"],
  [/survivor/gi, "sobreviviente"],
  [/victim/gi, "víctima"],
  [/mistaken-identity/gi, "identidad equivocada"],
  [/identity-theft/gi, "robo de identidad"],
  [/factual-innocence/gi, "inocencia de hecho"],
  [/actual-innocence/gi, "inocencia de hecho"],
  [/clean slate/gi, "Clean Slate"],
  [/eligible/gi, "posible"],
  [/relief/gi, "opción"],
  [/route/gi, "ruta"],
  [/pathway/gi, "ruta"],
  [/path /gi, "ruta "],
  [/tool /gi, "herramienta "],
  [/remedy /gi, "opción "],
  [/situation /gi, "situación "],
  [/under /gi, "bajo "],
  [/after /gi, "después de "],
  [/before /gi, "antes de "],
  [/with /gi, "con "],
  [/without /gi, "sin "],
  [/for /gi, "para "],
  [/and /gi, "y "],
  [/or /gi, "o "],
  [/by /gi, "por "],
  [/of /gi, "de "]
];

const EXTERNAL_DOC_TRANSLATIONS = {
  "File the TF-810 request at your local Alaska trial court": "Presente la solicitud TF-810 en su tribunal local de primera instancia de Alaska",
  "Proof of SIS and/or the order setting aside charges (if applicable)": "Prueba del SIS y/o de la orden que dejó sin efecto los cargos, si aplica",
  "Certified disposition showing acquittal or dismissal (if requested)": "Resolución certificada que muestre absolución o desestimación, si se solicita",
  "SBI criminal-history / SBI eligibility letter": "Informe de antecedentes penales del SBI o carta de elegibilidad del SBI",
  "Certified case documents": "Documentos certificados del caso",
  "Superior Court filing fee": "Cuota de presentación del Tribunal Superior",
  "Current verified criminal-history record (CHR/SCOPE)": "Registro actual verificado de antecedentes penales (CHR/SCOPE)",
  "Certified dispositions / judgment of conviction": "Resoluciones certificadas / sentencia de condena",
  "Probation/parole/prison discharge paperwork": "Documentos de finalización de probation, parole o prisión",
  "Fingerprints where required": "Huellas digitales cuando se requieran",
  "Prosecutor review/stipulation step": "Paso de revisión o estipulación de la fiscalía",
  "Court/county filing fee": "Cuota de presentación del tribunal o condado",
  "PATCH / PSP criminal-history report": "Informe de antecedentes penales PATCH / PSP",
  "Expected PATCH fee": "Cuota esperada de PATCH"
};

function translate(text) {
  if (!text) return "";
  if (EXACT.has(text)) return EXACT.get(text);

  const stateQuestion = text.match(/^Did this case happen in (.+) \(not a federal case\)\?$/);
  if (stateQuestion) return `¿Este caso ocurrió en ${STATE_NAMES[stateQuestion[1]] ?? stateQuestion[1]} y no fue un caso federal?`;

  const stateWhere = text.match(/^Where in (.+) did the case happen\?$/);
  if (stateWhere) return `¿En qué parte de ${STATE_NAMES[stateWhere[1]] ?? stateWhere[1]} ocurrió el caso?`;

  const prefixed = text.match(/^(Path|Pathway|Tool|Remedy|Situation) ([A-Z0-9]+) — (.+)$/);
  if (prefixed) return `${translatePrefix(prefixed[1])} ${prefixed[2]} — ${translateRouteLabel(prefixed[3])}`;

  return translateRouteLabel(text);
}

function translatePrefix(prefix) {
  return {
    Path: "Ruta",
    Pathway: "Ruta",
    Tool: "Herramienta",
    Remedy: "Opción",
    Situation: "Situación"
  }[prefix] ?? prefix;
}

function translateRouteLabel(text) {
  let out = text;
  out = out.replace(/\(([^)]*)\)/g, "($1)");
  for (const [pattern, replacement] of TERM_REPLACEMENTS) out = out.replace(pattern, replacement);
  out = out
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function applyProfileTranslations() {
  const profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, "utf8"));
  let prompts = 0;
  let helpers = 0;
  let options = 0;
  let optionHelpers = 0;

  for (const profile of Object.values(profiles)) {
    for (const question of profile.questions ?? []) {
      question.translations ??= {};
      question.translations.es ??= {};
      question.translations.es.prompt = translate(question.prompt);
      prompts += 1;
      if (question.helperText) {
        question.translations.es.helperText = translate(question.helperText);
        helpers += 1;
      }
      if (question.options?.length) question.optionDisplay ??= {};
      for (const option of question.options ?? []) {
        question.optionDisplay[option] ??= { label: option };
        const display = question.optionDisplay[option];
        display.translations ??= {};
        display.translations.es ??= {};
        display.translations.es.label = translate(display.label ?? option);
        options += 1;
        if (display.helperText) {
          display.translations.es.helperText = translate(display.helperText);
          optionHelpers += 1;
        }
      }
    }
  }

  fs.writeFileSync(PROFILES_PATH, `${JSON.stringify(profiles, null, 2)}\n`);
  return { prompts, helpers, options, optionHelpers };
}

function applyExternalDocumentCatalog() {
  let source = fs.readFileSync(LOCALIZATION_PATH, "utf8");
  const marker = "\n  \"route.ak.courtview_removal\"";
  if (source.includes("\"external_doc.1\"")) return { externalDocuments: 0 };

  const entries = Object.entries(EXTERNAL_DOC_TRANSLATIONS)
    .map(([en, es], index) => `  "external_doc.${index + 1}": { en: ${JSON.stringify(en)}, es: ${JSON.stringify(es)} },`)
    .join("\n");
  source = source.replace(marker, `\n${entries}\n${marker}`);
  fs.writeFileSync(LOCALIZATION_PATH, source);
  return { externalDocuments: Object.keys(EXTERNAL_DOC_TRANSLATIONS).length };
}

const profileCounts = applyProfileTranslations();
const catalogCounts = applyExternalDocumentCatalog();
console.log(JSON.stringify({ ok: true, profileCounts, catalogCounts }, null, 2));
