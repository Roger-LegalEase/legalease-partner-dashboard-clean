import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { InternalOnboardingContext, PartnerOnboardingContext } from "./auth-context";
import { Phase1OnboardingError } from "./errors";
import { isRcap2Enabled } from "./feature";
import { PROGRAM_CONFIGURATION_FIELDS, type ProgramConfiguration, type ProgramPatch } from "./program-configuration";
import { validateOnboardingSection } from "./validation";
import { workspaceReadError } from "./workspace-loading";

type Context = InternalOnboardingContext | PartnerOnboardingContext;
function client(context: Context) {
  if (!isRcap2Enabled()) throw new Phase1OnboardingError("feature_disabled", "Program configuration is unavailable.");
  if (!["internal_admin", "partner_admin"].includes(context.role)) throw new Phase1OnboardingError("forbidden", "Administrator access is required.");
  const db = getSupabaseAdminClient();
  if (!db) throw new Phase1OnboardingError("persistence_failed", "Program configuration is unavailable.");
  return db;
}
function readback(value: unknown, context: Context): ProgramConfiguration {
  const row = value as ProgramConfiguration | null;
  if (row && row.partnerSlug !== context.partnerSlug) throw new Phase1OnboardingError("forbidden", "Program identity does not match this workspace.");
  if (!row || typeof row.workspaceId !== "string" || !row.workspaceId || !["legacy", "rcap2.2"].includes(row.policyVersion) || !Number.isSafeInteger(row.version) || row.version < 1 || typeof row.legalIdentityLocked !== "boolean" || typeof row.status !== "string" || !row.data || typeof row.data !== "object" || Array.isArray(row.data)) {
    throw new Phase1OnboardingError("persistence_failed", "The saved program could not be verified. Reload the workspace.");
  }
  return row;
}
export async function getProgramConfiguration(context: Context) {
  const result = await client(context).rpc("rcap_service_get_program_configuration", { p_slug: context.partnerSlug, p_actor: context.authUserId });
  if (result.error) throw workspaceReadError("rcap_service_get_program_configuration", result.error, "Program configuration could not be loaded.");
  const configuration=readback(result.data, context);
  const provenance=await client(context).from("partner_events").select("event_payload").eq("partner_slug",context.partnerSlug).eq("event_type","rcap_spanish_draft_prepared").order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle();
  if(provenance.error)throw workspaceReadError("program_configuration.spanish_source",provenance.error,"Spanish source versions could not be verified.");
  if(provenance.data?.event_payload?.spanishPreparation)configuration.data.brand_public_page={...configuration.data.brand_public_page,spanish_preparation:provenance.data.event_payload.spanishPreparation};
  return configuration;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export async function saveProgramConfiguration(context: Context, input: { patches: ProgramPatch[]; requestId: string; expectedVersion?: number; confirmPublicationHold?: boolean }) {
  const db = client(context);
  if (input.expectedVersion !== undefined && (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1)) throw new Phase1OnboardingError("invalid_input", "Reload the program before saving.");
  const current = await getProgramConfiguration(context);
  if (!Array.isArray(input.patches) || input.patches.length > 6 || new Set(input.patches.map(p => p?.section)).size !== input.patches.length) {
    throw new Phase1OnboardingError("invalid_input", "Choose the program information to save once.");
  }
  const allSections = structuredClone(current.data);
  for (const patch of input.patches) {
    if (!PROGRAM_CONFIGURATION_FIELDS[patch?.section] || !patch.values || typeof patch.values !== "object" || Array.isArray(patch.values) || !patch.base || typeof patch.base !== "object" || Array.isArray(patch.base)) throw new Phase1OnboardingError("invalid_input", "Check the program information.");
    Object.assign(allSections, { [patch.section]: { ...allSections[patch.section], ...patch.values } });
  }
  const changes: ProgramPatch[] = [];
  for (const patch of input.patches) {
    const fields = PROGRAM_CONFIGURATION_FIELDS[patch?.section];
    if (!fields || !patch.values || Array.isArray(patch.values) || !patch.base || Array.isArray(patch.base)) throw new Phase1OnboardingError("invalid_input", "Check the program information.");
    const stored = (current.data[patch.section] ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(patch.values)) {
      if (["operating_model", "operator_authority_reference", "external_agreement_applicability", "service_mode"].includes(key) && context.role !== "internal_admin") throw new Phase1OnboardingError("forbidden", "Only a Platform Admin can change operating responsibility.");
      if (!fields.includes(key)) throw new Phase1OnboardingError("forbidden", "This field requires a separate authorized operation.");
      if (key === "primary_cta_label" && !same(stored[key], patch.values[key]) && (typeof patch.values[key] !== "string" || patch.values[key].trim().length > 60)) throw new Phase1OnboardingError("invalid_input", "Keep the participant button label to 60 characters or fewer. Put additional detail in the page description, or choose Start free screening.");
      if (key === "primary_address" && !same(stored[key], patch.values[key]) && typeof patch.values[key] === "string" && patch.values[key].trim() && !patch.values[key].split("\n")[0].trim()) throw new Phase1OnboardingError("invalid_input", "Start the address with its street address or PO box, or leave the entire optional address blank.");
    }
    const editableStored={...stored};
    // Trusted readback metadata is not part of the editable field contract.
    delete editableStored.spanish_preparation;
    const validation = validateOnboardingSection(patch.section, { ...editableStored, ...patch.values }, "draft_save", { allSections, canonicalOperatingFields:true });
    if (!validation.success) throw new Phase1OnboardingError("invalid_input", validation.issues.map(i => i.message).join(" "), { issues: validation.issues });
    const normalized = validation.data as Record<string, unknown>;
    for (const key of Object.keys(patch.values)) {
      if (!same(stored[key], patch.base[key]) && !same(stored[key], normalized[key])) throw new Phase1OnboardingError("revision_conflict", "This program changed. Reload and review your changes before saving.");
    }
    changes.push({ section: patch.section, values: Object.fromEntries(Object.keys(patch.values).map(key => [key, normalized[key]])), base: Object.fromEntries(Object.keys(patch.values).map(key => [key, patch.base[key] ?? null])) });
  }
  const result = await db.rpc("rcap_service_save_program_configuration", {
    p_slug: context.partnerSlug, p_actor: context.authUserId, p_version: input.expectedVersion ?? current.version,
    p_changes: changes, p_request: input.requestId, p_confirm_publication_hold: input.confirmPublicationHold === true
  });
  if (result.error) {
    const code = result.error.code;
    if (code === "42501" && result.error.message === "rcap_jurisdiction_scope") throw new Phase1OnboardingError("forbidden", "Choose jurisdictions within this program’s configured scope. Contact LegalEase support to expand the permitted service area.");
    if (code === "42501" && result.error.message === "rcap_external_operating_rights") {
      const labels: Record<string, string> = {
        agreement_evidence: "finalized or executed agreement evidence",
        partner_operating_approval: "an affirmative partner operating approval",
        commercial_authority: "documented commercial authority"
      };
      let reasons: string[] = [];
      try {
        const evidence: unknown = JSON.parse(result.error.details ?? "[]");
        if (Array.isArray(evidence)) reasons = [...new Set(evidence.flatMap(item => labels[item?.kind] ? [labels[item.kind]] : []))];
      } catch { /* An unreadable detail must still refuse the transfer. */ }
      throw new Phase1OnboardingError("forbidden", `Operating responsibility was not changed: this program has ${reasons.join(", ") || "recorded external operating rights"}. Keep Partner-managed until the existing authority is reviewed and any transfer is legitimately resolved with its rights holder. Memberships, agreements and approvals have been preserved.`);
    }
    if (code === "PT409" || code === "40001" || code === "23505") throw new Phase1OnboardingError("revision_conflict", "This program changed. Reload before retrying this save.");
    if (code === "42501") throw new Phase1OnboardingError("forbidden", "Your account cannot change these program details or the protected legal identity.");
    if (code === "55000" && result.error.message === "rcap_publication_hold_confirmation") throw new Phase1OnboardingError("invalid_transition", "Saving changes to a live program requires your confirmation that new participant entry will be held until current materials and publication are reviewed.");
    if (code === "55000") throw new Phase1OnboardingError("invalid_transition", "This program's current state does not permit this configuration change.");
    if (code === "22023") throw new Phase1OnboardingError("invalid_input", "Check the participation mode, jurisdiction and program information.");
    throw workspaceReadError("rcap_service_save_program_configuration", result.error, "Program configuration was not saved. Please retry.");
  }
  return readback(result.data, context);
}
