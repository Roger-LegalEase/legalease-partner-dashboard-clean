import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {ONBOARDING_SCHEMA_REGISTRY:fields}=await import('../src/lib/partners/onboarding/schema.ts');
const {GUIDED_ONBOARDING_SECTIONS:sections}=await import('../src/lib/partners/onboarding/guided-substeps.ts');
const {RCAP_SPANISH_COPY:copy}=await import('../src/lib/partners/onboarding/rcap-spanish-copy.ts');
const {LEGALEASE_PUBLIC_PAGE_LANGUAGE:en,LEGALEASE_PUBLIC_PAGE_LANGUAGE_ES:es,LEGALEASE_PUBLIC_PAGE_PROJECTION_KEYS:keys}=await import('../src/lib/partners/onboarding/artifact-domain.ts');
let count=0;
for(const field of fields.filter(f=>f.ownership==='partner_editable'))for(const value of [field.label,field.helperCopy].filter(Boolean)){assert.ok(copy[value],`Spanish field copy missing: ${value}`);count++;}
for(const section of sections)for(const step of section.substeps)for(const value of [step.title,step.purpose,step.outcome].filter(Boolean)){assert.ok(copy[value],`Spanish guided copy missing: ${value}`);count++;}
for(const [category,block] of Object.entries(en)){assert.notEqual(es[category].heading,block.heading);assert.notEqual(es[category].body,block.body);assert.ok(keys.includes(`legalease_public_page_es.${category}`));count++;}
console.log(`${count} Spanish field, helper, guided-task and versioned legal-copy assertions PASS.`);
