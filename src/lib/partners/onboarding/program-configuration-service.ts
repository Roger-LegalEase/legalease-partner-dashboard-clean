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
  return readback(result.data, context);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export async function saveProgramConfiguration(context: Context, input: { patches: ProgramPatch[]; requestId: string; expectedVersion?: number }) {
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
    }
    const validation = validateOnboardingSection(patch.section, { ...stored, ...patch.values }, "draft_save", { allSections, canonicalOperatingFields:true });
    if (!validation.success) throw new Phase1OnboardingError("invalid_input", validation.issues.map(i => i.message).join(" "), { issues: validation.issues });
    const normalized = validation.data as Record<string, unknown>;
    for (const key of Object.keys(patch.values)) {
      if (!same(stored[key], patch.base[key]) && !same(stored[key], normalized[key])) throw new Phase1OnboardingError("revision_conflict", "This program changed. Reload and review your changes before saving.");
    }
    changes.push({ section: patch.section, values: Object.fromEntries(Object.keys(patch.values).map(key => [key, normalized[key]])), base: Object.fromEntries(Object.keys(patch.values).map(key => [key, patch.base[key] ?? null])) });
  }
  const result = await db.rpc("rcap_service_save_program_configuration", {
    p_slug: context.partnerSlug, p_actor: context.authUserId, p_version: input.expectedVersion ?? current.version,
    p_changes: changes, p_request: input.requestId
  });
  if (result.error) {
    const code = result.error.code;
    if (code === "PT409" || code === "40001" || code === "23505") throw new Phase1OnboardingError("revision_conflict", "This program changed. Reload before retrying this save.");
    if (code === "42501") throw new Phase1OnboardingError("forbidden", "Your account cannot change these program details or the protected legal identity.");
    if (code === "55000") throw new Phase1OnboardingError("invalid_transition", "This program's current state does not permit this configuration change.");
    if (code === "22023") throw new Phase1OnboardingError("invalid_input", "Check the participation mode, jurisdiction and program information.");
    throw workspaceReadError("rcap_service_save_program_configuration", result.error, "Program configuration was not saved. Please retry.");
  }
  return readback(result.data, context);
}
