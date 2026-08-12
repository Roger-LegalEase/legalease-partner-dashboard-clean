import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * The runtime registry for lane-B complete-guidance treatments.
 *
 * Guidance packets are authored as data (data/rcap-all50/guidance-packets/*.json)
 * and reach the participant through the authoritative route resolver, never as
 * a sellable packet: relief on these tracks is automatic or otherwise not
 * user-filed, so there is nothing to sell and no credit to consume. Loading is
 * fail-closed — a packet that declares paymentAllowed or sellable as anything
 * but false is rejected at load, so a bad edit cannot quietly become a paid
 * product through this registry.
 */

export type GuidancePacketSummary = {
  trackId: string;
  jurisdiction: string;
  treatment: "complete_guidance";
  /** Compiled pathway ids this track is reachable through, when any exist. */
  compiledPathwayIds: string[];
  paymentAllowed: false;
  sellable: false;
};

const PACKET_DIR = "data/rcap-all50/guidance-packets";

/**
 * Track → compiled-pathway binding, from the crosswalk's candidate resolution
 * (data/rcap-ledger/track-pathway-crosswalk.json). Tracks with no compiled
 * runtime pathway (IL 2028 act, both AK tracks) are reachable only at the
 * jurisdiction level and bind to no pathway id.
 */
const TRACK_COMPILED_PATHWAYS: Record<string, string[]> = {
  mi_auto_misd92: ["automatic-clean-slate-set-aside-under-mcl-780-621g"],
  mi_auto_misd93: ["automatic-clean-slate-set-aside-under-mcl-780-621g"],
  "ca-auto-conviction": ["tool-2-automatic-relief"],
  "il-auto-seal-2028": [],
  "ak-nonconviction-confidential": [],
  "ak-sej": []
};

let cache: Map<string, GuidancePacketSummary[]> | null = null;

function loadAll(): Map<string, GuidancePacketSummary[]> {
  if (cache) return cache;
  const byJurisdiction = new Map<string, GuidancePacketSummary[]>();
  const dir = path.join(process.cwd(), PACKET_DIR);
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json") || file.startsWith("_")) continue;
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as {
        jurisdiction?: string;
        packets?: Array<{ trackId?: string; treatment?: string; paymentAllowed?: unknown; sellable?: unknown }>;
      };
      const jurisdiction = String(parsed.jurisdiction ?? "").toUpperCase();
      if (!jurisdiction) continue;
      for (const packet of parsed.packets ?? []) {
        if (packet.treatment !== "complete_guidance" || !packet.trackId) continue;
        if (packet.paymentAllowed !== false || packet.sellable !== false) {
          throw new Error(
            `Guidance packet ${packet.trackId} in ${file} does not declare paymentAllowed=false and sellable=false; refusing to register a guidance treatment that could be sold.`
          );
        }
        const summary: GuidancePacketSummary = {
          trackId: packet.trackId,
          jurisdiction,
          treatment: "complete_guidance",
          compiledPathwayIds: TRACK_COMPILED_PATHWAYS[packet.trackId] ?? [],
          paymentAllowed: false,
          sellable: false
        };
        const list = byJurisdiction.get(jurisdiction) ?? [];
        list.push(summary);
        byJurisdiction.set(jurisdiction, list);
      }
    }
  }
  cache = byJurisdiction;
  return byJurisdiction;
}

export function guidanceTracksForJurisdiction(jurisdiction: string): GuidancePacketSummary[] {
  return loadAll().get(jurisdiction.toUpperCase()) ?? [];
}

export function guidanceTracksForPathway(jurisdiction: string, pathwayId: string): GuidancePacketSummary[] {
  if (!pathwayId) return [];
  return guidanceTracksForJurisdiction(jurisdiction).filter((packet) => packet.compiledPathwayIds.includes(pathwayId));
}

/* -------------------------------------------------------------------------
 * Component deferrals for composed routes.
 *
 * A composed route whose official-form component has not been acquired must
 * not behave like a sellable packet route. This extends the SAME non-sellable
 * guidance authority above rather than introducing a second system: one
 * loader, read by the evaluator, the packet-route resolver, the payment
 * adapter, the checkout route, the render-job contract and the Briefcase.
 *
 * The set is CLOSED and fails closed. For an affected track, every
 * official_form_dependency component named by its route.json must carry
 * exactly one valid deferral treatment. A missing, duplicated, extra,
 * identity-mismatched, payment-enabled, checkout-enabled or credit-enabled
 * treatment yields `invalid_component_deferral`, which callers must treat as
 * strictly as a valid deferral: refuse the packet, refuse payment, refuse
 * credit. Absence of evidence is never permission.
 * ---------------------------------------------------------------------- */

export type ComponentDeferralClassification = "component_deferral" | "invalid_component_deferral";

export type LocalizedText = { en: string; es: string };

export type LocalizedList = { en: string[]; es: string[] };

export type ComponentDeferralDestination = {
  name: string;
  kind: string | null;
  url: string | null;
  en: string;
  es: string;
};

export type ComponentDeferralBriefcase = {
  preserved: LocalizedList;
  outstanding: LocalizedList;
  return: LocalizedText;
};

export type ComponentDeferralComponent = {
  componentId: string;
  unitId: string | null;
  role: string | null;
  absentComponent: LocalizedText;
  specificReason: LocalizedText;
  destination: ComponentDeferralDestination;
  nextAction: LocalizedText;
  gather: LocalizedList;
  doNot: LocalizedList;
  packetAbsenceDisclosure: LocalizedText;
  briefcase: ComponentDeferralBriefcase;
  escalation: LocalizedText | null;
  escalationActor: string | null;
  evidenceIds: string[];
};

export type ComponentDeferral = {
  trackId: string;
  classification: ComponentDeferralClassification;
  /** Always false. Payment never opens on a deferred composed route. */
  paymentAllowed: false;
  checkoutSuppressed: true;
  packetCreditConsumption: "none";
  partnerCreditConsumed: false;
  componentIds: string[];
  components: ComponentDeferralComponent[];
  /** Populated only when classification is invalid_component_deferral. */
  invalidReason?: string;
};

const COMPOSED_ROUTES_DIR = "data/rcap-all50/composed-routes";

let deferralCache: Map<string, ComponentDeferral> | null = null;

function localized(node: unknown): LocalizedText | null {
  if (!node || typeof node !== "object") return null;
  const { en, es } = node as { en?: unknown; es?: unknown };
  if (typeof en !== "string" || typeof es !== "string") return null;
  if (en.trim().length === 0 || es.trim().length === 0) return null;
  // Spanish that is byte-identical to English is untranslated copy, not a
  // Spanish surface, and the participant is entitled to the real thing.
  if (en.trim() === es.trim()) return null;
  return { en, es };
}

function localizedList(node: unknown): LocalizedList | null {
  if (!node || typeof node !== "object") return null;
  const { en, es } = node as { en?: unknown; es?: unknown };
  if (!Array.isArray(en) || !Array.isArray(es)) return null;
  if (en.length === 0 || en.length !== es.length) return null;
  if (en.some((line) => typeof line !== "string" || line.trim().length === 0)) return null;
  if (es.some((line) => typeof line !== "string" || line.trim().length === 0)) return null;
  return { en: en as string[], es: es as string[] };
}

function deferralDestination(node: unknown): ComponentDeferralDestination | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const copy = localized(record);
  if (!copy) return null;
  if (typeof record.name !== "string" || record.name.trim().length === 0) return null;
  return {
    name: record.name,
    kind: typeof record.kind === "string" ? record.kind : null,
    url: typeof record.url === "string" ? record.url : null,
    en: copy.en,
    es: copy.es
  };
}

function deferralBriefcase(node: unknown): ComponentDeferralBriefcase | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const preserved = localizedList(record.preserved);
  const outstanding = localizedList(record.outstanding);
  const returnTo = localized(record.return);
  if (!preserved || !outstanding || !returnTo) return null;
  return { preserved, outstanding, return: returnTo };
}

function invalid(trackId: string, reason: string): ComponentDeferral {
  return {
    trackId,
    classification: "invalid_component_deferral",
    paymentAllowed: false,
    checkoutSuppressed: true,
    packetCreditConsumption: "none",
    partnerCreditConsumed: false,
    componentIds: [],
    components: [],
    invalidReason: reason
  };
}

function loadComponentDeferrals(): Map<string, ComponentDeferral> {
  if (deferralCache) return deferralCache;
  const byTrack = new Map<string, ComponentDeferral>();
  const root = path.join(process.cwd(), COMPOSED_ROUTES_DIR);
  if (!fs.existsSync(root)) {
    deferralCache = byTrack;
    return byTrack;
  }

  for (const state of fs.readdirSync(root)) {
    const stateDir = path.join(root, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const dir of fs.readdirSync(stateDir)) {
      const routePath = path.join(stateDir, dir, "route.json");
      if (!fs.existsSync(routePath)) continue;

      let route: { trackId?: string; units?: Array<{ requiredOutput?: string; componentId?: string; unitId?: string }> };
      try {
        route = JSON.parse(fs.readFileSync(routePath, "utf8"));
      } catch {
        continue;
      }
      const trackId = route.trackId ?? dir;
      const dependencyUnits = (route.units ?? []).filter((unit) => unit.requiredOutput === "official_form_dependency");
      if (dependencyUnits.length === 0) continue;

      const expected = dependencyUnits.map((unit) => unit.componentId).filter((id): id is string => Boolean(id));
      if (expected.length !== dependencyUnits.length) {
        byTrack.set(trackId, invalid(trackId, "a dependency unit names no componentId"));
        continue;
      }
      if (new Set(expected).size !== expected.length) {
        byTrack.set(trackId, invalid(trackId, "duplicate componentId in the route unit set"));
        continue;
      }

      const componentsDir = path.join(stateDir, dir, "components");
      const present = fs.existsSync(componentsDir)
        ? fs.readdirSync(componentsDir).filter((component) =>
          fs.existsSync(path.join(componentsDir, component, "deferral-treatment.json")))
        : [];
      const extra = present.filter((id) => !expected.includes(id));
      if (extra.length > 0) {
        byTrack.set(trackId, invalid(trackId, `deferral treatment present for a component the route does not name: ${extra.join(", ")}`));
        continue;
      }

      const components: ComponentDeferralComponent[] = [];
      let failure: string | null = null;
      for (const unit of dependencyUnits) {
        const componentId = unit.componentId as string;
        const treatmentPath = path.join(componentsDir, componentId, "deferral-treatment.json");
        if (!fs.existsSync(treatmentPath)) {
          failure = `no deferral treatment for component ${componentId}`;
          break;
        }
        let treatment: Record<string, unknown>;
        try {
          treatment = JSON.parse(fs.readFileSync(treatmentPath, "utf8"));
        } catch {
          failure = `malformed deferral treatment for component ${componentId}`;
          break;
        }
        if (treatment.trackId !== trackId || treatment.componentId !== componentId) {
          failure = `deferral treatment identity mismatch at ${componentId}`;
          break;
        }
        const contract = (treatment.runtimeContract ?? {}) as Record<string, unknown>;
        if (
          contract.classification !== "component_deferral"
          || contract.paymentAllowed !== false
          || contract.checkoutSuppressed !== true
          || contract.packetCreditConsumption !== "none"
          || contract.partnerCreditConsumed !== false
          || contract.briefcaseHandoffRequired !== true
        ) {
          failure = `deferral treatment at ${componentId} does not declare the suppressed runtime contract`;
          break;
        }
        const pt = (treatment.participantTreatment ?? {}) as Record<string, unknown>;
        const absent = localized(pt.absentComponent);
        const reason = localized(pt.specificReason);
        const next = localized(pt.nextAction);
        const disclosure = localized(pt.packetAbsenceDisclosure);
        const gather = localizedList(pt.gather);
        const doNot = localizedList(pt.doNot);
        const briefcase = deferralBriefcase(pt.briefcase);
        const destination = deferralDestination(pt.destination);
        const escalationNode = (pt.escalation ?? null) as Record<string, unknown> | null;
        const escalation = escalationNode ? localized(escalationNode) : null;
        if (!absent || !reason || !next || !disclosure) {
          failure = `deferral treatment at ${componentId} is missing complete English/Spanish participant copy`;
          break;
        }
        if (!gather) {
          failure = `deferral treatment at ${componentId} carries no complete English/Spanish gathering instructions`;
          break;
        }
        if (!doNot) {
          failure = `deferral treatment at ${componentId} carries no complete English/Spanish what-not-to-file guidance`;
          break;
        }
        if (!briefcase) {
          failure = `deferral treatment at ${componentId} carries no complete Briefcase handoff`;
          break;
        }
        if (!destination) {
          failure = `deferral treatment at ${componentId} names no complete destination`;
          break;
        }
        const payment = (pt.payment ?? {}) as Record<string, unknown>;
        const credit = (pt.credit ?? {}) as Record<string, unknown>;
        if (payment.paymentAllowed !== false || payment.checkoutSuppressed !== true) {
          failure = `deferral treatment at ${componentId} does not tell the participant that payment and checkout are closed`;
          break;
        }
        if (credit.packetCreditConsumption !== "none" || credit.partnerCreditConsumed !== false) {
          failure = `deferral treatment at ${componentId} does not tell the participant that no packet or partner credit is consumed`;
          break;
        }
        const evidence = Array.isArray(treatment.evidence) ? (treatment.evidence as Array<{ id?: string; path?: string }>) : [];
        if (evidence.length === 0) {
          failure = `deferral treatment at ${componentId} carries no evidence`;
          break;
        }
        for (const carrier of evidence) {
          if (!carrier?.path || !fs.existsSync(path.join(process.cwd(), carrier.path))) {
            failure = `deferral treatment at ${componentId} cites an evidence carrier that does not resolve`;
            break;
          }
        }
        if (failure) break;
        components.push({
          componentId,
          unitId: unit.unitId ?? null,
          role: (treatment.role as string) ?? null,
          absentComponent: absent,
          specificReason: reason,
          destination,
          nextAction: next,
          gather,
          doNot,
          packetAbsenceDisclosure: disclosure,
          briefcase,
          escalation,
          escalationActor: typeof escalationNode?.actor === "string" ? escalationNode.actor : null,
          evidenceIds: evidence.map((carrier) => String(carrier.id ?? ""))
        });
      }

      if (failure) {
        byTrack.set(trackId, invalid(trackId, failure));
        continue;
      }
      byTrack.set(trackId, {
        trackId,
        classification: "component_deferral",
        paymentAllowed: false,
        checkoutSuppressed: true,
        packetCreditConsumption: "none",
        partnerCreditConsumed: false,
        componentIds: expected,
        components
      });
    }
  }

  deferralCache = byTrack;
  return byTrack;
}

/** True when the exact track is a composed route carrying component deferrals. */
export function hasComponentDeferral(trackId: string | null | undefined): boolean {
  if (!trackId) return false;
  return loadComponentDeferrals().has(trackId);
}

/**
 * The component-deferral record for an exact track id, or null when the track
 * is not an affected composed route. An invalid record is still returned — and
 * still suppresses payment, checkout and credit — because a broken treatment
 * must never read as permission.
 */
export function componentDeferralForTrack(trackId: string | null | undefined): ComponentDeferral | null {
  if (!trackId) return null;
  return loadComponentDeferrals().get(trackId) ?? null;
}

export type DeferralLocale = "en" | "es";

export type ComponentDeferralComponentCopy = {
  componentId: string;
  absentComponent: string;
  specificReason: string;
  packetAbsenceDisclosure: string;
  destinationName: string;
  destinationUrl: string | null;
  destination: string;
  nextAction: string;
  gather: string[];
  doNot: string[];
  briefcasePreserved: string[];
  briefcaseOutstanding: string[];
  briefcaseReturn: string;
  escalationActor: string | null;
  escalation: string | null;
  evidenceIds: string[];
};

export type ComponentDeferralBundle = {
  trackId: string;
  locale: DeferralLocale;
  classification: ComponentDeferralClassification;
  paymentAllowed: false;
  checkoutSuppressed: true;
  packetCreditConsumption: "none";
  partnerCreditConsumed: false;
  componentIds: string[];
  summary: string;
  nextSteps: string[];
  components: ComponentDeferralComponentCopy[];
};

const BUNDLE_FRAME: Record<DeferralLocale, {
  summaryValid: (count: number) => string;
  summaryInvalid: string;
  preserved: string;
  noCharge: string;
  outstanding: string;
  returnHere: string;
  askLabel: (actor: string) => string;
  gatherLabel: string;
  doNotLabel: string;
}> = {
  en: {
    summaryValid: (count) =>
      count === 1
        ? "This route needs one official form we do not supply, so your packet is not complete and nothing is charged for it."
        : `This route needs ${count} official forms we do not supply, so your packet is not complete and nothing is charged for it.`,
    summaryInvalid: "This route's deferred-component record did not validate, so it is saved as guidance with payment and credit closed.",
    preserved: "Your saved work stays in your Briefcase.",
    noCharge: "No payment is taken and no packet credit or partner credit is used.",
    outstanding: "Still outstanding:",
    returnHere: "Return to this Briefcase item once you have what is outstanding.",
    askLabel: (actor) => `Ask ${actor}:`,
    gatherLabel: "Gather:",
    doNotLabel: "Do not:"
  },
  es: {
    summaryValid: (count) =>
      count === 1
        ? "Esta ruta necesita un formulario oficial que no proporcionamos, por lo que su paquete no está completo y no se cobra nada por él."
        : `Esta ruta necesita ${count} formularios oficiales que no proporcionamos, por lo que su paquete no está completo y no se cobra nada por él.`,
    summaryInvalid: "El registro de componentes aplazados de esta ruta no se validó, por lo que se guarda como orientación, sin pago ni crédito.",
    preserved: "Su trabajo guardado permanece en su Briefcase.",
    noCharge: "No se cobra ningún pago ni se usa crédito de paquete o de socio.",
    outstanding: "Pendiente:",
    returnHere: "Vuelva a este elemento del Briefcase cuando tenga lo pendiente.",
    askLabel: (actor) => `Pregunte a ${actor}:`,
    gatherLabel: "Reúna:",
    doNotLabel: "No haga lo siguiente:"
  }
};

export function normalizeDeferralLocale(value: unknown): DeferralLocale {
  return String(value ?? "").trim().toLowerCase().startsWith("es") ? "es" : "en";
}

/**
 * The single source of participant-facing component-deferral copy.
 *
 * Everything the Briefcase shows for an affected route is assembled here, in
 * the requested locale, from the committed treatment files: what is preserved,
 * which component is absent and why, where to get it, what to gather, what not
 * to file or assume, and how to come back. Nothing downstream composes its own
 * version of this text.
 */
export function componentDeferralBundle(
  trackId: string | null | undefined,
  locale: unknown
): ComponentDeferralBundle | null {
  const deferral = componentDeferralForTrack(trackId);
  if (!deferral) return null;
  const lang = normalizeDeferralLocale(locale);
  const frame = BUNDLE_FRAME[lang];
  const valid = deferral.classification === "component_deferral";

  const components: ComponentDeferralComponentCopy[] = deferral.components.map((component) => ({
    componentId: component.componentId,
    absentComponent: component.absentComponent[lang],
    specificReason: component.specificReason[lang],
    packetAbsenceDisclosure: component.packetAbsenceDisclosure[lang],
    destinationName: component.destination.name,
    destinationUrl: component.destination.url,
    destination: component.destination[lang],
    nextAction: component.nextAction[lang],
    gather: component.gather[lang],
    doNot: component.doNot[lang],
    briefcasePreserved: component.briefcase.preserved[lang],
    briefcaseOutstanding: component.briefcase.outstanding[lang],
    briefcaseReturn: component.briefcase.return[lang],
    escalationActor: component.escalationActor,
    escalation: component.escalation ? component.escalation[lang] : null,
    evidenceIds: component.evidenceIds
  }));

  const nextSteps: string[] = [`${frame.preserved} ${frame.noCharge}`];
  for (const component of components) {
    nextSteps.push(`${component.absentComponent} ${component.specificReason}`);
    nextSteps.push(`${component.packetAbsenceDisclosure} ${component.destination}`);
    nextSteps.push(`${frame.gatherLabel} ${component.gather.join(" ")}`);
    nextSteps.push(`${frame.doNotLabel} ${component.doNot.join(" ")}`);
    if (component.escalation) {
      nextSteps.push(`${frame.askLabel(component.escalationActor ?? component.destinationName)} ${component.escalation}`);
    }
    nextSteps.push(`${frame.outstanding} ${component.briefcaseOutstanding.join(" ")}`);
    nextSteps.push(component.nextAction);
    nextSteps.push(component.briefcaseReturn);
  }
  nextSteps.push(frame.returnHere);

  return {
    trackId: deferral.trackId,
    locale: lang,
    classification: deferral.classification,
    paymentAllowed: false,
    checkoutSuppressed: true,
    packetCreditConsumption: "none",
    partnerCreditConsumed: false,
    componentIds: deferral.componentIds,
    summary: valid ? frame.summaryValid(deferral.componentIds.length) : frame.summaryInvalid,
    nextSteps,
    components
  };
}
