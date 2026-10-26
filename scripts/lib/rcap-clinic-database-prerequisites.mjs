import {qualifyClinicCodeHistory} from '../rcap-clinic-fresh-attempt.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';

const contract = JSON.parse(readFileSync(new URL('./rcap-clinic-database-prerequisite-contract.json', import.meta.url), 'utf8'));
export const CLINIC_PREREQUISITE_SQL = readFileSync(new URL('../sql/rcap-clinic-database-prerequisites.sql', import.meta.url), 'utf8');

/** Management API rows or the already-normalized read-only catalog. */
export function normalizeClinicPrerequisiteCatalog(value) {
  if (typeof value === 'string') value = JSON.parse(value);
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new Error('Expected one Clinic prerequisite result');
    value = value[0];
  }
  value = value?.clinic_known_compatibility_prerequisites ?? value;
  if (!value || !Array.isArray(value.functions) || !Array.isArray(value.relations)) {
    throw new Error('Invalid Clinic prerequisite catalog');
  }
  return value;
}

/** Pure structural qualification. The caller separately verifies deployment/CAPTCHA and authorized next action. */
export function qualifyClinicDatabasePrerequisites({ catalog, projectRef, appSha }) {
  const checks = [];
  const add = (id, ok) => checks.push({ id, ok: ok === true });
  add('project', projectRef === contract.projectRef);
  add('application_source', appSha === contract.appSha);
  let value;
  try { value = normalizeClinicPrerequisiteCatalog(catalog); } catch {
    add('catalog_shape', false);
    return { status: 'BLOCKED', checks, blockers: checks.filter(c => !c.ok), operational: null };
  }
  const functions = new Map(value.functions.flatMap(f => (f.overloads ?? []).map(o => [o.signature.replace(/^public\./, ''), o])));
  for (const expected of contract.functions) {
    const actual = functions.get(expected.signature);
    let bodyHash = actual?.source_body_md5;
    if (!bodyHash && typeof actual?.definition === 'string') {
      const body = actual.definition.match(/\bAS\s+(\$[\w]*\$)([\s\S]*?)\1/i)?.[2];
      if (body !== undefined) bodyHash = createHash('md5').update(body).digest('hex');
    }
    add(`function:${expected.signature}`, !!actual && actual.service_execute === true &&
      expected.source_body_md5 === bodyHash && ['definition_md5', 'argument_names', 'result', 'security_definer', 'config', 'acl', 'owner', 'volatility'].every(k => equal(actual[k], expected[k])));
  }
  const relations = new Map(value.relations.map(t => [t.name, t]));
  for (const expected of contract.relations) {
    const actual = relations.get(expected.name);
    // The accepted helper explicitly supports standard Clinics without the optional Legal Aid module.
    if (expected.name === 'public.legal_aid_policy_profiles' && actual?.present === false) continue;
    add(`relation:${expected.name}`, !!actual && equal(actual, expected));
  }
  add('prior_migration_history', contract.priorHistory.every(expected => value.relevant_history?.some(actual => equal(actual, expected))));
  add('repair_migration_history', value.relevant_history?.filter(h => h.name === 'rcap_clinic_app4feb_compatibility').length === 1 &&
    value.relevant_history.some(h => h.name === 'rcap_clinic_app4feb_compatibility' && h.version === '20261024233056' && h.statements_md5 === 'f54b99a6eafd72c4031a46639781b690'));
  for (const key of ['administrator_active', 'administrator_confirmed', 'participant_confirmed', 'staff_active', 'event_available', 'program_activation_authorized', 'screening_scope_authorized', 'packet_scope_authorized', 'sponsor_capacity_available', 'screening_capacity_available', 'screening_entitlement_present']) {
    add(`operational:${key}`, value.operational?.[key] === true);
  }
  add('historical_code_preserved', qualifyClinicCodeHistory(value.operational?.existing_code_inventory));
  const blockers = checks.filter(c => !c.ok);
  return { status: blockers.length ? 'BLOCKED' : 'READY', checks, blockers,
    operational: value.operational ? { ...value.operational, codeIssuanceRequired: value.operational.existing_code_available !== true } : null };
}
