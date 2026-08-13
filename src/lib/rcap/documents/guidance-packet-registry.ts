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

/**
 * A complete-guidance treatment looked up by exact track id.
 *
 * Pathway lookup is not enough on its own. Several guidance tracks bind to no
 * compiled pathway at all — the Illinois 2028 automatic-sealing act and both
 * Alaska tracks among them — so a caller holding the server-owned track id and
 * nothing else found no treatment here and fell through to the jurisdiction's
 * classification. In Illinois and Texas that classification is legacy_verified,
 * which is sellable, so a route whose accepted treatment says the participant
 * files nothing could still be offered a packet for $50.
 *
 * This is the track-scoped half of the same authority, and it exists so the
 * resolver can answer "is this exact track sellable" without needing a pathway.
 */
export function completeGuidanceForTrack(trackId: string | null | undefined): GuidancePacketSummary | null {
  if (!trackId) return null;
  for (const packets of loadAll().values()) {
    const match = packets.find((packet) => packet.trackId === trackId);
    if (match) return match;
  }
  return null;
}

/** Every registered complete-guidance track, for verifiers and reviewers. */
export function allCompleteGuidanceTracks(): GuidancePacketSummary[] {
  return [...loadAll().values()].flat().sort((a, b) => a.trackId.localeCompare(b.trackId));
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

/* -------------------------------------------------------------------------
 * Lane-B exact supported deferrals.
 *
 * The third non-sellable treatment on the SAME authority as the two above.
 * An exact supported deferral tells the participant, in their own language,
 * that no packet is currently prepared or sold for the route and exactly what
 * to do instead. Until now the runtime could not see that: a Texas participant
 * on the qualifying-dismissal route was handed a $50 checkout for a
 * Harris-County-templated packet on a route whose own accepted treatment says
 * nothing is being prepared, because LEGACY_VERIFIED classifies by
 * jurisdiction and nothing consulted the packet.
 *
 * The set is CLOSED and fails closed. A packet declaring this treatment must
 * carry the complete participant treatment in substantive English and Spanish,
 * an exact destination, supporting authority, and payment and sale prohibited.
 * A packet that declares the treatment and fails validation yields
 * `invalid_exact_supported_deferral`, which suppresses exactly as hard: a
 * broken treatment is not permission to sell.
 * ---------------------------------------------------------------------- */

export type ExactDeferralClassification = "exact_supported_deferral" | "invalid_exact_supported_deferral";

export type ExactSupportedDeferral = {
  trackId: string;
  jurisdiction: string;
  classification: ExactDeferralClassification;
  paymentAllowed: false;
  checkoutSuppressed: true;
  packetCreditConsumption: "none";
  partnerCreditConsumed: false;
  /** Every compiled pathway the track is reachable through, from the crosswalk. */
  compiledPathwayIds: string[];
  evidencePath: string;
  /** The participant treatment, kept bilingual for the Briefcase. */
  routeLabel: LocalizedText;
  exactReason: LocalizedText;
  destinationName: string;
  destinationUrl: string | null;
  destination: LocalizedText;
  nextAction: LocalizedText;
  gather: LocalizedList;
  whatNotToFileOrAssume: LocalizedText;
  handoff: LocalizedText;
  briefcaseSaved: LocalizedList;
  afterNextStep: LocalizedText;
  authorityCount: number;
  invalidReason?: string;
};

const CROSSWALK_PATH = "data/rcap-ledger/track-pathway-crosswalk.json";

let exactDeferralCache: {
  byTrack: Map<string, ExactSupportedDeferral>;
  byPathway: Map<string, string[]>;
} | null = null;

function invalidExact(trackId: string, jurisdiction: string, evidencePath: string, pathwayIds: string[], reason: string): ExactSupportedDeferral {
  const empty: LocalizedText = { en: "", es: "" };
  const emptyList: LocalizedList = { en: [], es: [] };
  return {
    trackId,
    jurisdiction,
    classification: "invalid_exact_supported_deferral",
    paymentAllowed: false,
    checkoutSuppressed: true,
    packetCreditConsumption: "none",
    partnerCreditConsumed: false,
    compiledPathwayIds: pathwayIds,
    evidencePath,
    routeLabel: empty,
    exactReason: empty,
    destinationName: "",
    destinationUrl: null,
    destination: empty,
    nextAction: empty,
    gather: emptyList,
    whatNotToFileOrAssume: empty,
    handoff: empty,
    briefcaseSaved: emptyList,
    afterNextStep: empty,
    authorityCount: 0,
    invalidReason: reason,
  };
}

function loadExactDeferrals() {
  if (exactDeferralCache) return exactDeferralCache;
  const byTrack = new Map<string, ExactSupportedDeferral>();
  // A pathway may be shared by more than one deferred track — Kentucky's two
  // felony routes and West Virginia's three conviction routes each compile to
  // a single pathway. The index keeps every claimant rather than the last one
  // written, because picking one arbitrarily would hand a participant another
  // route's legal treatment.
  const byPathway = new Map<string, string[]>();

  // The track → compiled-pathway mapping comes from the canonical crosswalk,
  // the same artifact the ledger derives coverage from. A deferral with no
  // mapped pathway is still registered by track id; it simply has no pathway
  // the resolver can be asked about.
  const pathwaysByTrack = new Map<string, string[]>();
  const crosswalkPath = path.join(process.cwd(), CROSSWALK_PATH);
  if (fs.existsSync(crosswalkPath)) {
    const crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, "utf8")) as {
      registryTracks?: Array<{ jurisdiction?: string; registryTrackId?: string; mappedCompiledPathwayIds?: string[] }>;
    };
    for (const entry of crosswalk.registryTracks ?? []) {
      if (!entry.jurisdiction || !entry.registryTrackId) continue;
      pathwaysByTrack.set(
        `${entry.jurisdiction.toUpperCase()}:${entry.registryTrackId}`,
        Array.isArray(entry.mappedCompiledPathwayIds) ? entry.mappedCompiledPathwayIds : []
      );
    }
  }

  const dir = path.join(process.cwd(), PACKET_DIR);
  if (!fs.existsSync(dir)) {
    exactDeferralCache = { byTrack, byPathway };
    return exactDeferralCache;
  }

  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".json") || file.startsWith("_")) continue;
    const evidencePath = `${PACKET_DIR}/${file}`;
    let parsed: { jurisdiction?: string; packets?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch {
      continue;
    }
    const jurisdiction = String(parsed.jurisdiction ?? "").toUpperCase();
    for (const packet of parsed.packets ?? []) {
      if (packet.treatment !== "exact_supported_deferral") continue;
      const trackId = typeof packet.trackId === "string" ? packet.trackId : "";
      if (!trackId || !jurisdiction) continue;
      const pathwayIds = pathwaysByTrack.get(`${jurisdiction}:${trackId}`) ?? [];

      const record = buildExactDeferral(packet, trackId, jurisdiction, evidencePath, pathwayIds);

      // One deferral per track. Two records claiming a track is a
      // contradiction between owners, not something to resolve silently.
      if (byTrack.has(trackId)) {
        byTrack.set(trackId, invalidExact(trackId, jurisdiction, evidencePath, pathwayIds, "two packets declare an exact supported deferral for this track"));
      } else {
        byTrack.set(trackId, record);
      }
      for (const pathwayId of pathwayIds) {
        const key = `${jurisdiction}:${pathwayId}`;
        const existing = byPathway.get(key) ?? [];
        existing.push(trackId);
        byPathway.set(key, existing);
      }
    }
  }

  exactDeferralCache = { byTrack, byPathway };
  return exactDeferralCache;
}

function buildExactDeferral(
  packet: Record<string, unknown>,
  trackId: string,
  jurisdiction: string,
  evidencePath: string,
  pathwayIds: string[]
): ExactSupportedDeferral {
  const invalid = (reason: string) => invalidExact(trackId, jurisdiction, evidencePath, pathwayIds, reason);

  // Payment and sale prohibited. A deferral that could be sold is not one, and
  // a packet saying otherwise is refused rather than quietly corrected.
  if (packet.paymentAllowed !== false || packet.sellable !== false) {
    return invalid("the packet does not declare paymentAllowed=false and sellable=false");
  }

  const routeLabel = localized(packet.routeLabel);
  const exactReason = localized(packet.stopReason);
  const nextAction = localized(packet.nextStep);
  const whatNotToFileOrAssume = localized(packet.participantFiles);
  const handoff = localized(packet.handoff);
  const afterNextStep = localized(packet.afterNextStep);
  const gather = localizedList(packet.gather);
  const briefcaseSaved = localizedList(packet.briefcaseSaved);
  const destinationNode = (packet.destination ?? null) as Record<string, unknown> | null;
  const destination = destinationNode ? localized(destinationNode) : null;

  if (!routeLabel) return invalid("no substantive bilingual route label");
  if (!exactReason) return invalid("no substantive bilingual exact reason");
  if (!nextAction) return invalid("no substantive bilingual next action");
  if (!whatNotToFileOrAssume) return invalid("no substantive bilingual statement of what not to file or assume");
  if (!handoff) return invalid("no substantive bilingual handoff");
  if (!afterNextStep) return invalid("no substantive bilingual after-next-step");
  if (!gather) return invalid("no complete bilingual gathering instructions");
  if (!briefcaseSaved) return invalid("no complete bilingual Briefcase preservation list");
  if (!destination || typeof destinationNode?.name !== "string" || destinationNode.name.trim().length === 0) {
    return invalid("no exact destination");
  }
  if (!Array.isArray(packet.authority) || packet.authority.length === 0) {
    return invalid("no supporting authority");
  }

  return {
    trackId,
    jurisdiction,
    classification: "exact_supported_deferral",
    paymentAllowed: false,
    checkoutSuppressed: true,
    packetCreditConsumption: "none",
    partnerCreditConsumed: false,
    compiledPathwayIds: pathwayIds,
    evidencePath,
    routeLabel,
    exactReason,
    destinationName: destinationNode.name,
    destinationUrl: typeof destinationNode.url === "string" ? destinationNode.url : null,
    destination,
    nextAction,
    gather,
    whatNotToFileOrAssume,
    handoff,
    briefcaseSaved,
    afterNextStep,
    authorityCount: packet.authority.length,
  };
}

/** The exact supported deferral for a track id, or null when the track has none. */
export function exactDeferralForTrack(trackId: string | null | undefined): ExactSupportedDeferral | null {
  if (!trackId) return null;
  return loadExactDeferrals().byTrack.get(trackId) ?? null;
}

/**
 * The exact supported deferral serving a compiled pathway, or null.
 *
 * This is the lookup the route resolver uses, because a participant arrives
 * through a pathway rather than through a track id.
 */
export function exactDeferralForPathway(
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined
): ExactSupportedDeferral | null {
  if (!jurisdiction || !pathwayId) return null;
  const state = String(jurisdiction).toUpperCase();
  const loaded = loadExactDeferrals();
  const trackIds = loaded.byPathway.get(`${state}:${pathwayId}`) ?? [];
  if (trackIds.length === 0) return null;
  if (trackIds.length === 1) return loaded.byTrack.get(trackIds[0]) ?? null;

  // Several deferred tracks compile to this one pathway. They agree on the
  // thing that matters here — nothing is prepared or sold — so the route is
  // still suppressed. What cannot be answered from a pathway alone is WHICH
  // legal treatment the participant should read, so none is asserted: the
  // record fails closed and the caller must supply an exact track id to get
  // the treatment itself.
  const first = loaded.byTrack.get(trackIds[0]);
  return invalidExact(
    trackIds.join(" | "),
    state,
    first?.evidencePath ?? "",
    [pathwayId],
    `${trackIds.length} exact supported deferrals serve this pathway (${trackIds.join(", ")}); an exact track id is required to select the participant treatment`
  );
}

/** Every deferred track serving a compiled pathway, in load order. */
export function exactDeferralTrackIdsForPathway(
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined
): string[] {
  if (!jurisdiction || !pathwayId) return [];
  return loadExactDeferrals().byPathway.get(`${String(jurisdiction).toUpperCase()}:${pathwayId}`) ?? [];
}

/** Every registered exact supported deferral, for verifiers and audits. */
export function allExactDeferrals(): ExactSupportedDeferral[] {
  return [...loadExactDeferrals().byTrack.values()].sort((a, b) => a.trackId.localeCompare(b.trackId));
}

export type ExactDeferralBundle = {
  trackId: string;
  locale: DeferralLocale;
  classification: ExactDeferralClassification;
  paymentAllowed: false;
  checkoutSuppressed: true;
  packetCreditConsumption: "none";
  partnerCreditConsumed: false;
  summary: string;
  exactReason: string;
  destinationName: string;
  destinationUrl: string | null;
  destination: string;
  nextAction: string;
  gather: string[];
  whatNotToFileOrAssume: string;
  handoff: string;
  briefcaseSaved: string[];
  nextSteps: string[];
};

/**
 * The participant-facing treatment for a deferred route, in one locale.
 * Everything the Briefcase preserves for these routes is assembled here from
 * the committed packet; nothing downstream writes its own version.
 */
export function exactDeferralBundle(
  trackId: string | null | undefined,
  locale: unknown
): ExactDeferralBundle | null {
  const deferral = exactDeferralForTrack(trackId);
  if (!deferral) return null;
  const lang = normalizeDeferralLocale(locale);
  const valid = deferral.classification === "exact_supported_deferral";

  const nextSteps = valid
    ? [
      deferral.exactReason[lang],
      deferral.whatNotToFileOrAssume[lang],
      deferral.destination[lang],
      ...deferral.gather[lang],
      deferral.nextAction[lang],
      deferral.afterNextStep[lang],
      deferral.handoff[lang],
      ...deferral.briefcaseSaved[lang],
    ]
    : [lang === "es"
      ? "El registro de aplazamiento de esta ruta no se validó, por lo que se guarda como orientación, sin pago ni crédito."
      : "This route's deferral record did not validate, so it is saved as guidance with payment and credit closed."];

  return {
    trackId: deferral.trackId,
    locale: lang,
    classification: deferral.classification,
    paymentAllowed: false,
    checkoutSuppressed: true,
    packetCreditConsumption: "none",
    partnerCreditConsumed: false,
    summary: valid ? deferral.routeLabel[lang] : (lang === "es" ? "Ruta aplazada" : "Deferred route"),
    exactReason: valid ? deferral.exactReason[lang] : "",
    destinationName: deferral.destinationName,
    destinationUrl: deferral.destinationUrl,
    destination: valid ? deferral.destination[lang] : "",
    nextAction: valid ? deferral.nextAction[lang] : "",
    gather: valid ? deferral.gather[lang] : [],
    whatNotToFileOrAssume: valid ? deferral.whatNotToFileOrAssume[lang] : "",
    handoff: valid ? deferral.handoff[lang] : "",
    briefcaseSaved: valid ? deferral.briefcaseSaved[lang] : [],
    nextSteps,
  };
}

/* -------------------------------------------------------------------------
 * TERMINAL TREATMENTS — the emergency 497/497 terminalization window.
 *
 * Roger authorized every track that was still nonterminal to receive the
 * strongest complete, safe, repository-supported treatment available now,
 * rather than waiting for a preferred packet that is not ready. This loader is
 * where that authorization meets the runtime.
 *
 * A track reaching this loader has no production packet, so the only question
 * left is whether the participant is told the truth well: the exact reason, the
 * exact place to go, the exact next action, what to gather, what not to sign or
 * file, an escalation that helps, and a Briefcase they can close and reopen —
 * in English and in Spanish. A treatment that does not do all of that is not a
 * softer treatment, it is a broken one, and this loader refuses it.
 *
 * These are CANDIDATES. Registration stops the runtime from behaving as though
 * the track were sellable and lets a reviewer exercise the real thing rather
 * than read a JSON file, but `reviewState` is pending_independent_review on
 * every one of them and nothing here makes a track terminal. Only an accepted
 * independent review does that, and the session that authored a treatment is
 * never the session that reviews it.
 *
 * Fail-closed throughout. A refused treatment still suppresses the route: a
 * broken promise to the participant is a reason to close payment, never a
 * reason to fall through to a sibling packet route.
 * ---------------------------------------------------------------------- */

const TERMINAL_TREATMENT_DIR = "data/rcap-all50/terminalization-treatments";

export type TerminalTreatmentKind =
  | "complete_guidance"
  | "exact_supported_deferral"
  | "deliberate_scope_exclusion";

export type TerminalTreatment = {
  trackId: string;
  jurisdiction: string;
  treatment: TerminalTreatmentKind;
  classification: "terminal_treatment_candidate" | "invalid_terminal_treatment_candidate";
  reviewState: "pending_independent_review";
  sellable: false;
  paymentAllowed: false;
  checkoutSuppressed: true;
  renderJobAllowed: false;
  packetPromise: "none";
  packetCreditConsumption: "none";
  partnerCreditConsumption: "none";
  partnerCreditConsumed: false;
  destinationName: string | null;
  destinationKind: string | null;
  authorityCitations: string[];
  evidenceRefs: string[];
  raw: Record<string, unknown>;
  invalidReason?: string;
};

let terminalTreatmentCache: Map<string, TerminalTreatment> | null = null;

function invalidTerminalTreatment(
  trackId: string,
  jurisdiction: string,
  treatment: TerminalTreatmentKind,
  reason: string
): TerminalTreatment {
  return {
    trackId,
    jurisdiction,
    treatment,
    classification: "invalid_terminal_treatment_candidate",
    reviewState: "pending_independent_review",
    sellable: false,
    paymentAllowed: false,
    checkoutSuppressed: true,
    renderJobAllowed: false,
    packetPromise: "none",
    packetCreditConsumption: "none",
    partnerCreditConsumption: "none",
    partnerCreditConsumed: false,
    destinationName: null,
    destinationKind: null,
    authorityCitations: [],
    evidenceRefs: [],
    raw: {},
    invalidReason: reason
  };
}

/**
 * Copy that promises a packet later is exactly what these treatments replace,
 * so it is refused at load rather than shown and apologised for. The Spanish
 * entries are here because a promise in Spanish is still a promise.
 */
const TERMINAL_PROHIBITED_COPY = /(coming soon|check back|research required|legal review pending|unsupported runtime|registry gap|source blocker|crosswalk|terminal disposition|implementation family|in the future|will be available|soon be available|próximamente|vuelva más tarde|estará disponible)/i;

/**
 * A destination is exact when it names the place this track actually goes to.
 * These are the phrasings that look like an answer and are not one; a treatment
 * whose destination is one of them leaves the participant exactly where they
 * started, so it fails closed instead of shipping.
 */
const GENERIC_REFERRAL = /^(?:\s*)(?:contact (?:a|an) (?:lawyer|attorney)|consult (?:a|an) (?:lawyer|attorney)|your local court|contact your local court|see your state'?s website|a lawyer|an attorney|legal aid)(?:\s*)$/i;

/** Every participant element that must exist and must carry both languages. */
const REQUIRED_TEXT_ELEMENTS = [
  "routeLabel", "mechanism", "participantFiles", "controllingActor",
  "stopReason", "nextStep", "afterNextStep", "escalation"
] as const;
const REQUIRED_LIST_ELEMENTS = ["gather", "doNot", "nextSteps"] as const;

function bothLanguages(node: unknown): { en: string; es: string } | null {
  if (!node || typeof node !== "object") return null;
  const en = (node as Record<string, unknown>).en;
  const es = (node as Record<string, unknown>).es;
  if (typeof en !== "string" || typeof es !== "string") return null;
  if (en.trim().length === 0 || es.trim().length === 0) return null;
  return { en, es };
}

function bothLanguageLists(node: unknown): { en: string[]; es: string[] } | null {
  if (!node || typeof node !== "object") return null;
  const en = (node as Record<string, unknown>).en;
  const es = (node as Record<string, unknown>).es;
  if (!Array.isArray(en) || !Array.isArray(es)) return null;
  if (en.length === 0 || es.length === 0) return null;
  if (!en.every((v) => typeof v === "string" && v.trim().length > 0)) return null;
  if (!es.every((v) => typeof v === "string" && v.trim().length > 0)) return null;
  return { en: en as string[], es: es as string[] };
}

function collectStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) for (const v of node) collectStrings(v, out);
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      // Structural fields are not participant copy; only the rendered text is.
      if (key === "evidenceRefs" || key === "authority" || key === "url" || key === "kind") continue;
      collectStrings(value, out);
    }
  }
  return out;
}

function validateTerminalTreatment(entry: Record<string, unknown>, jurisdiction: string): TerminalTreatment {
  const trackId = typeof entry.trackId === "string" ? entry.trackId : "";
  const treatment = entry.treatment as TerminalTreatmentKind;
  const bad = (reason: string) => invalidTerminalTreatment(trackId, jurisdiction, treatment, reason);

  if (!["complete_guidance", "exact_supported_deferral", "deliberate_scope_exclusion"].includes(String(treatment))) {
    return bad(`unknown treatment kind ${String(treatment)}`);
  }

  const contract = (entry.runtimeContract ?? {}) as Record<string, unknown>;
  const suppressionHolds = contract.sellable === false
    && contract.paymentAllowed === false
    && contract.checkoutSuppressed === true
    && contract.renderJobAllowed === false
    && contract.rendererKind === "none"
    && contract.packetPlan === null
    && contract.packetPromise === "none"
    && contract.packetCreditConsumption === "none"
    && contract.partnerCreditConsumption === "none"
    && contract.partnerCreditConsumed === false;
  if (!suppressionHolds) {
    return bad("the treatment does not declare complete sale, payment, checkout, credit, render and packet-promise suppression");
  }

  // A treatment that claims approval for itself is refused outright.
  if (entry.candidateOnly !== true || entry.promotionEffect !== "none" || entry.ledgerEffect !== "none") {
    return bad("the treatment does not declare itself candidate-only with no promotion or ledger effect");
  }
  if (entry.reviewState !== "pending_independent_review") {
    return bad("the treatment does not declare pending_independent_review");
  }

  for (const key of REQUIRED_TEXT_ELEMENTS) {
    const pair = bothLanguages(entry[key]);
    if (!pair) return bad(`${key} is missing substantive English and Spanish`);
    if (pair.en.trim() === pair.es.trim()) return bad(`${key} repeats the English text as Spanish`);
  }
  for (const key of REQUIRED_LIST_ELEMENTS) {
    const pair = bothLanguageLists(entry[key]);
    if (!pair) return bad(`${key} is missing substantive English and Spanish entries`);
    if (pair.en.join("|") === pair.es.join("|")) return bad(`${key} repeats the English list as Spanish`);
  }

  const briefcase = (entry.briefcase ?? {}) as Record<string, unknown>;
  if (!bothLanguageLists(briefcase.preserved)) return bad("the Briefcase handoff does not say what is preserved in both languages");
  if (!bothLanguageLists(briefcase.outstanding)) return bad("the Briefcase handoff does not say what is outstanding in both languages");
  const briefcaseReturn = bothLanguages(briefcase.return);
  if (!briefcaseReturn) return bad("the Briefcase handoff carries no return-and-resume instruction in both languages");
  if (briefcaseReturn.en.trim() === briefcaseReturn.es.trim()) return bad("the Briefcase return instruction repeats the English text as Spanish");

  // timing is optional — many mechanisms carry no deadline — but a treatment
  // that DOES state one must state it in both languages. A bare string here
  // reads as a deadline in the JSON and renders as an empty line to a Spanish
  // speaker, which is worse than saying nothing at all.
  if (entry.timing !== null && entry.timing !== undefined) {
    const timing = bothLanguages(entry.timing);
    if (!timing) return bad("timing is present but does not carry substantive English and Spanish");
    if (timing.en.trim() === timing.es.trim()) return bad("timing repeats the English text as Spanish");
  }

  const destination = (entry.destination ?? {}) as Record<string, unknown>;
  const destinationName = typeof destination.name === "string" ? destination.name.trim() : "";
  if (destinationName.length === 0) return bad("the treatment names no destination");
  if (GENERIC_REFERRAL.test(destinationName)) return bad(`the destination "${destinationName}" is a generic referral rather than an exact destination`);
  if (!bothLanguages(destination)) return bad("the destination carries no substantive English and Spanish explanation");

  const authority = Array.isArray(entry.authority) ? entry.authority as Array<Record<string, unknown>> : [];
  if (authority.length === 0) return bad("the treatment cites no operative authority");
  const evidenceRefs = Array.isArray(entry.evidenceRefs) ? entry.evidenceRefs as string[] : [];
  if (evidenceRefs.length === 0) return bad("the treatment cites no committed evidence");

  const promise = collectStrings(entry).find((text) => TERMINAL_PROHIBITED_COPY.test(text));
  if (promise) return bad(`the participant copy carries prohibited language: "${promise.slice(0, 90)}"`);

  return {
    trackId,
    jurisdiction,
    treatment,
    classification: "terminal_treatment_candidate",
    reviewState: "pending_independent_review",
    sellable: false,
    paymentAllowed: false,
    checkoutSuppressed: true,
    renderJobAllowed: false,
    packetPromise: "none",
    packetCreditConsumption: "none",
    partnerCreditConsumption: "none",
    partnerCreditConsumed: false,
    destinationName,
    destinationKind: typeof destination.kind === "string" ? destination.kind : null,
    authorityCitations: authority.map((a) => String(a.citation ?? "")).filter(Boolean),
    evidenceRefs,
    raw: entry
  };
}

function loadTerminalTreatments(): Map<string, TerminalTreatment> {
  if (terminalTreatmentCache) return terminalTreatmentCache;
  const byTrack = new Map<string, TerminalTreatment>();
  const dir = path.join(process.cwd(), TERMINAL_TREATMENT_DIR);
  if (!fs.existsSync(dir)) {
    terminalTreatmentCache = byTrack;
    return byTrack;
  }

  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".json") || file.startsWith("_")) continue;
    let parsed: { jurisdiction?: string; treatments?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch {
      continue;
    }
    const jurisdiction = String(parsed.jurisdiction ?? file.replace(/\.json$/, "")).toUpperCase();
    for (const entry of parsed.treatments ?? []) {
      const trackId = typeof entry.trackId === "string" ? entry.trackId : "";
      if (!trackId) continue;
      byTrack.set(trackId, validateTerminalTreatment(entry, jurisdiction));
    }
  }

  terminalTreatmentCache = byTrack;
  return byTrack;
}

/** The terminal treatment for an exact track id, or null. */
export function terminalTreatmentForTrack(trackId: string | null | undefined): TerminalTreatment | null {
  if (!trackId) return null;
  return loadTerminalTreatments().get(trackId) ?? null;
}

/** Every registered terminal treatment, for verifiers, reviewers and the ledger. */
export function allTerminalTreatments(): TerminalTreatment[] {
  return [...loadTerminalTreatments().values()].sort((a, b) => a.trackId.localeCompare(b.trackId));
}

export type TerminalTreatmentBundle = {
  trackId: string;
  jurisdiction: string;
  treatment: TerminalTreatmentKind;
  classification: TerminalTreatment["classification"];
  reviewState: "pending_independent_review";
  locale: DeferralLocale;
  paymentAllowed: false;
  checkoutSuppressed: true;
  packetCreditConsumption: "none";
  partnerCreditConsumption: "none";
  routeLabel: string;
  mechanism: string;
  participantFiles: string;
  controllingActor: string;
  stopReason: string;
  destinationName: string;
  destination: string;
  destinationUrl: string | null;
  nextStep: string;
  gather: string[];
  doNot: string[];
  timing: string | null;
  afterNextStep: string;
  escalation: string;
  briefcasePreserved: string[];
  briefcaseOutstanding: string[];
  briefcaseReturn: string;
  nextSteps: string[];
  authorityCitations: string[];
};

function localeText(node: unknown, lang: DeferralLocale): string {
  if (!node || typeof node !== "object") return "";
  const value = (node as Record<string, unknown>)[lang];
  return typeof value === "string" ? value : "";
}

function localeList(node: unknown, lang: DeferralLocale): string[] {
  if (!node || typeof node !== "object") return [];
  const value = (node as Record<string, unknown>)[lang];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * The participant-facing terminal treatment in one locale. This is what the
 * Briefcase saves and what a returning participant reopens, so it is assembled
 * once here rather than by each caller.
 */
export function terminalTreatmentBundle(
  trackId: string | null | undefined,
  locale: unknown
): TerminalTreatmentBundle | null {
  const record = terminalTreatmentForTrack(trackId);
  if (!record) return null;
  const lang = normalizeDeferralLocale(locale);
  const entry = record.raw;
  const destination = (entry.destination ?? {}) as Record<string, unknown>;
  const briefcase = (entry.briefcase ?? {}) as Record<string, unknown>;
  const timing = entry.timing ? localeText(entry.timing, lang) : "";

  return {
    trackId: record.trackId,
    jurisdiction: record.jurisdiction,
    treatment: record.treatment,
    classification: record.classification,
    reviewState: "pending_independent_review",
    locale: lang,
    paymentAllowed: false,
    checkoutSuppressed: true,
    packetCreditConsumption: "none",
    partnerCreditConsumption: "none",
    routeLabel: localeText(entry.routeLabel, lang),
    mechanism: localeText(entry.mechanism, lang),
    participantFiles: localeText(entry.participantFiles, lang),
    controllingActor: localeText(entry.controllingActor, lang),
    stopReason: localeText(entry.stopReason, lang),
    destinationName: typeof destination.name === "string" ? destination.name : "",
    destination: localeText(destination, lang),
    destinationUrl: typeof destination.url === "string" ? destination.url : null,
    nextStep: localeText(entry.nextStep, lang),
    gather: localeList(entry.gather, lang),
    doNot: localeList(entry.doNot, lang),
    timing: timing.length > 0 ? timing : null,
    afterNextStep: localeText(entry.afterNextStep, lang),
    escalation: localeText(entry.escalation, lang),
    briefcasePreserved: localeList(briefcase.preserved, lang),
    briefcaseOutstanding: localeList(briefcase.outstanding, lang),
    briefcaseReturn: localeText(briefcase.return, lang),
    nextSteps: localeList(entry.nextSteps, lang),
    authorityCitations: record.authorityCitations
  };
}
